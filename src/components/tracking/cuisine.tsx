import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, addWeeks, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MISSION_KINDS, instagramCanonical, kindLabel, monthKey, parsePlans, weekKey, type KitchenMission, type MissionPlan } from "@/lib/hadal-marketing";

type Draft = Omit<KitchenMission, "id" | "workspace_id" | "position"> & { id?: string };

export function CuisinePanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [ref, setRef] = useState(new Date());
  const [edit, setEdit] = useState<Draft | null>(null);
  const wk = weekKey(ref), mk = monthKey(ref);

  const missions = useQuery({
    queryKey: ["kitchen-admin", wsId, wk, mk],
    queryFn: async () => {
      const { data, error } = await supabase.from("kitchen_missions").select("*").eq("workspace_id", wsId)
        .or(`and(scope.eq.semaine,period_start.eq.${wk}),and(scope.eq.mois,period_start.eq.${mk})`).order("position").order("created_at");
      if (error) throw error;
      return data.map((m) => ({ ...m, plans: parsePlans(m.plans) })) as KitchenMission[];
    },
  });
  const rushes = useQuery({
    queryKey: ["kitchen-rushes", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("id,title,file_path,file_name,created_at,mission_id").eq("workspace_id", wsId).not("mission_id", "is", null).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return data;
    },
  });
  const reload = () => { void qc.invalidateQueries({ queryKey: ["kitchen-admin", wsId] }); void qc.invalidateQueries({ queryKey: ["kitchen-missions", wsId] }); };

  async function remove(m: KitchenMission) {
    if (!confirm(`Supprimer « ${m.title} » ?`)) return;
    const { error } = await supabase.from("kitchen_missions").delete().eq("id", m.id);
    if (error) toast.error(error.message); else reload();
  }
  async function download(path: string) {
    const { data, error } = await supabase.storage.from("rushs").createSignedUrl(path, 600);
    if (error) toast.error(error.message); else window.open(data.signedUrl, "_blank");
  }
  const blank = (scope: "semaine" | "mois"): Draft => ({ scope, kind: scope === "mois" ? "film" : "pov", period_start: scope === "mois" ? mk : wk, title: "", pitch: "", duration_min: 5, people: "2 à l’image + 1 filme", plans: [{ title: "", instruction: "" }], want: "", never: "" });
  const list = missions.data ?? [];

  return (
    <div className="space-y-8">
      <div className="biiz-panel-heading">
        <div><h2 className="text-lg font-semibold">Page cuisine</h2><p className="text-sm text-muted-foreground">Ce que la direction créative publie ici apparaît sur la page de l’équipe.</p></div>
        <Button asChild variant="outline" size="sm"><a href="/hadal-marketing" target="_blank" rel="noreferrer">Voir la page<ExternalLink /></a></Button>
      </div>

      <section className="biiz-section">
        <div className="flex items-center justify-between gap-2">
          <Button size="icon" variant="ghost" onClick={() => setRef(addWeeks(ref, -1))} aria-label="Semaine précédente"><ChevronLeft /></Button>
          <p className="text-sm font-medium">Semaine du {format(parseISO(wk), "d MMMM", { locale: fr })}</p>
          <Button size="icon" variant="ghost" onClick={() => setRef(addWeeks(ref, 1))} aria-label="Semaine suivante"><ChevronRight /></Button>
        </div>
        <Group title="Missions de la semaine" hint="Objectif : 2 POV humour + 1 post statique" items={list.filter((m) => m.scope === "semaine")} onAdd={() => setEdit(blank("semaine"))} onEdit={(m) => setEdit(m)} onDelete={remove} />
        <div className="mt-2 flex items-center justify-end gap-1 text-xs text-muted-foreground"><Button size="icon" variant="ghost" onClick={() => setRef(addMonths(ref, -1))} aria-label="Mois précédent"><ChevronLeft /></Button>{format(parseISO(mk), "MMMM yyyy", { locale: fr })}<Button size="icon" variant="ghost" onClick={() => setRef(addMonths(ref, 1))} aria-label="Mois suivant"><ChevronRight /></Button></div>
        <Group title="Temps forts du mois" hint="1 film signature + 1 opération HADAL" items={list.filter((m) => m.scope === "mois")} onAdd={() => setEdit(blank("mois"))} onEdit={(m) => setEdit(m)} onDelete={remove} />
      </section>

      <InspiManager wsId={wsId} />

      <section className="biiz-section">
        <h3 className="font-semibold">Rushs reçus de la cuisine</h3>
        <p className="text-sm text-muted-foreground">Aussi rangés dans Contenus (type Rush, « À valider »).</p>
        <ul className="mt-4 divide-y">{(rushes.data ?? []).map((r) => <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><p className="truncate font-medium">{r.file_name}</p><p className="truncate text-xs text-muted-foreground">{r.title} · {format(parseISO(r.created_at), "d MMM HH:mm", { locale: fr })}</p></div>{r.file_path && <Button size="sm" variant="outline" onClick={() => void download(r.file_path!)}><Download />Télécharger</Button>}</li>)}
          {rushes.data?.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Aucun rush reçu pour l’instant.</li>}</ul>
      </section>

      <MissionDialog wsId={wsId} draft={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />
    </div>
  );
}

function Group({ title, hint, items, onAdd, onEdit, onDelete }: { title: string; hint: string; items: KitchenMission[]; onAdd: () => void; onEdit: (m: KitchenMission) => void; onDelete: (m: KitchenMission) => void }) {
  return <div className="mt-4">
    <div className="biiz-panel-heading"><div><h3 className="font-semibold">{title}</h3><p className="text-xs text-muted-foreground">{hint}</p></div><Button size="sm" onClick={onAdd}><Plus />Ajouter</Button></div>
    <ul className="mt-3 divide-y rounded-md border">{items.map((m) => <li key={m.id} className="biiz-kitchen-row flex min-w-0 items-center gap-3 px-3 py-3"><span className="w-28 shrink-0 text-xs text-primary">{kindLabel(m.kind)}</span><Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start truncate p-0 text-left text-sm font-medium hover:bg-transparent hover:text-primary" onClick={() => onEdit(m)}>{m.title}</Button><span className="text-xs text-muted-foreground">{m.plans.length} plans</span><Button size="icon" variant="ghost" className="text-destructive" onClick={() => onDelete(m)} aria-label="Supprimer"><Trash2 /></Button></li>)}
      {items.length === 0 && <li className="px-3 py-5 text-center text-sm text-muted-foreground">Rien de prévu.</li>}</ul>
  </div>;
}

function MissionDialog({ wsId, draft, onClose, onSaved }: { wsId: string; draft: Draft | null; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft | null>(null);
  const [seen, setSeen] = useState<Draft | null>(null);
  if (draft !== seen) { setSeen(draft); setD(draft ? { ...draft, plans: draft.plans.length ? draft.plans.map((p) => ({ ...p })) : [{ title: "", instruction: "" }] } : null); }
  if (!d) return <Dialog open={false} />;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD({ ...d, [k]: v });
  const setPlan = (i: number, p: Partial<MissionPlan>) => set("plans", d.plans.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const plans = d!.plans.filter((p) => p.title.trim()).map((p) => ({ title: p.title.trim(), instruction: p.instruction.trim(), ...(p.line?.trim() ? { line: p.line.trim() } : {}) }));
    const row = { workspace_id: wsId, scope: d!.scope, kind: d!.kind, period_start: d!.period_start, title: d!.title.trim(), pitch: d!.pitch?.trim() || null, duration_min: d!.duration_min || null, people: d!.people?.trim() || null, plans, want: d!.want?.trim() || null, never: d!.never?.trim() || null };
    const { error } = d!.id ? await supabase.from("kitchen_missions").update(row).eq("id", d!.id) : await supabase.from("kitchen_missions").insert({ ...row, created_by: u.user!.id });
    if (error) toast.error(error.message); else { toast.success("Mission publiée sur la page cuisine"); onSaved(); }
  }

  return <Dialog open onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>{d.id ? "Modifier la mission" : "Nouvelle mission"}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Format</Label><Select value={d.kind} onValueChange={(v) => set("kind", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MISSION_KINDS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Titre</Label><Input required value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="« J’ai pas faim »" /></div>
        </div>
        <div className="space-y-1.5"><Label>En une phrase</Label><Input value={d.pitch ?? ""} onChange={(e) => set("pitch", e.target.value)} placeholder="Un collègue n’a pas faim. Jusqu’à ce qu’il voie ton Berliner." /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Durée (min)</Label><Input type="number" min={1} value={d.duration_min ?? ""} onChange={(e) => set("duration_min", e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="space-y-1.5"><Label>Personnes</Label><Input value={d.people ?? ""} onChange={(e) => set("people", e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Plans</Label>
          {d.plans.map((p, i) => <div key={i} className="space-y-2 rounded-md border p-3"><div className="flex items-center gap-2"><span className="text-xs font-medium text-primary">PLAN {i + 1}</span><Input value={p.title} onChange={(e) => setPlan(i, { title: e.target.value })} placeholder="Ce qu’on voit" /><Button type="button" size="icon" variant="ghost" onClick={() => set("plans", d.plans.filter((_, j) => j !== i))} aria-label="Retirer le plan"><Trash2 /></Button></div><Textarea rows={2} value={p.instruction} onChange={(e) => setPlan(i, { instruction: e.target.value })} placeholder="Comment le filmer, pour quelqu’un qui n’a jamais filmé" /><Input value={p.line ?? ""} onChange={(e) => setPlan(i, { line: e.target.value })} placeholder="Réplique (optionnel)" /></div>)}
          <Button type="button" variant="outline" size="sm" onClick={() => set("plans", [...d.plans, { title: "", instruction: "" }])}><Plus />Ajouter un plan</Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>On veut</Label><Textarea rows={2} value={d.want ?? ""} onChange={(e) => set("want", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Jamais</Label><Textarea rows={2} value={d.never ?? ""} onChange={(e) => set("never", e.target.value)} /></div>
        </div>
        <Button type="submit" className="w-full">Publier</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

function InspiManager({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState(""); const [title, setTitle] = useState(""); const [tags, setTags] = useState(""); const [takeaway, setTakeaway] = useState(""); const [why, setWhy] = useState("");
  const q = useQuery({
    queryKey: ["kitchen-inspi", wsId],
    queryFn: async () => { const { data, error } = await supabase.from("kitchen_inspirations").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }); if (error) throw error; return data; },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: ["kitchen-inspi", wsId] });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const canonical = instagramCanonical(url);
    if (!canonical) { toast.error("Colle un lien de post ou de Reel Instagram (https://www.instagram.com/reel/…)"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("kitchen_inspirations").insert({ workspace_id: wsId, url: canonical, title: title.trim(), tags: tags.split(",").map((t) => t.trim()).filter(Boolean), takeaway: takeaway.trim() || null, why: why.trim() || null, created_by: u.user!.id });
    if (error) toast.error(error.message); else { toast.success("Inspiration ajoutée"); setUrl(""); setTitle(""); setTags(""); setTakeaway(""); setWhy(""); reload(); }
  }
  async function remove(id: string) { const { error } = await supabase.from("kitchen_inspirations").delete().eq("id", id); if (error) toast.error(error.message); else reload(); }
  return <section className="biiz-section">
    <h3 className="font-semibold">Inspirations Instagram</h3><p className="text-sm text-muted-foreground">Uniquement de vrais liens publics. Ils sont lisibles directement sur la page cuisine.</p>
    <form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
      <Input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" />
      <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre" />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags, séparés par des virgules" />
      <Input value={takeaway} onChange={(e) => setTakeaway(e.target.value)} placeholder="Ce qu’on reprend" />
      <Input className="sm:col-span-2" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Pourquoi" />
      <Button type="submit" className="sm:col-span-2"><Plus />Ajouter</Button>
    </form>
    <ul className="mt-4 divide-y">{(q.data ?? []).map((i) => <li key={i.id} className="flex items-center gap-3 py-2 text-sm"><a href={i.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-medium hover:underline">{i.title}</a><span className="truncate text-xs text-muted-foreground">{i.tags.join(" · ")}</span><Button size="icon" variant="ghost" className="text-destructive" onClick={() => void remove(i.id)} aria-label="Supprimer"><Trash2 /></Button></li>)}</ul>
  </section>;
}
