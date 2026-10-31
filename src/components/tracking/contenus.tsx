import { Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const db = supabase as any;

export type TContent = {
  id: string;
  workspace_id: string;
  type: string;
  title: string;
  body: string | null;
  status: string;
  due_date: string | null;
  file_path: string | null;
  file_name: string | null;
  created_by: string;
  created_at: string;
  campaign_id: string | null;
  format: string | null;
  nature: string | null;
  channel: string | null;
  platform: string | null;
  objective: string | null;
  target_summary: string | null;
  cta: string | null;
  caption: string | null;
  publish_at: string | null;
  link_id: string | null;
  owner_id: string | null;
};

type CampaignLite = { id: string; name: string };
type LinkLite = { id: string; name: string; code: string };

const TYPES = [
  ["brief", "Brief"], ["script", "Script"], ["concept", "Concept"], ["plan_tournage", "Plan de tournage"],
  ["rush", "Rush"], ["crea", "Créa"], ["doc", "Document"],
] as const;

const FORMATS = [
  ["carousel", "Carousel"], ["statique", "Statique"], ["reel", "Reel"], ["story", "Story"],
  ["video", "Vidéo"], ["document", "Document"], ["autre", "Autre"],
] as const;

const NATURES = [
  ["commercial", "Commercial"], ["lifestyle", "Lifestyle / engageant"], ["preuve", "Preuve"],
  ["produit", "Produit"], ["branding", "Branding"], ["activation", "Activation"], ["autre", "Autre"],
] as const;

const PLATFORMS = [
  ["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"],
  ["google_business", "Google Business"], ["meta_ads", "Meta Ads"], ["google_ads", "Google Ads"], ["offline", "Offline"], ["autre", "Autre"],
] as const;

const STATUSES = [
  ["idee", "Idée"], ["brief", "Brief"], ["en_creation", "En création"], ["a_valider", "À valider"],
  ["valide", "Validé"], ["programme", "Programmé"], ["publie", "Publié"], ["archive", "Archivé"],
] as const;

const typeLabel = (t: string) => TYPES.find(([k]) => k === t)?.[1] ?? t;
const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;
const formatLabel = (s: string | null) => FORMATS.find(([k]) => k === s)?.[1] ?? s ?? "—";
const natureLabel = (s: string | null) => NATURES.find(([k]) => k === s)?.[1] ?? s ?? "—";

export function ContenusPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("tous");
  const [open, setOpen] = useState<TContent | null>(null);

  const contents = useQuery({
    queryKey: ["contents", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("contents").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as TContent[];
    },
  });

  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("campaigns").select("id,name").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignLite[];
    },
  });

  const campaignName = (id: string | null) => campaigns.data?.find((c) => c.id === id)?.name ?? null;
  const reload = () => void qc.invalidateQueries({ queryKey: ["contents", wsId] });

  const visible = useMemo(
    () => (contents.data ?? []).filter((c) => filter === "tous" || c.nature === filter || c.type === filter),
    [contents.data, filter],
  );

  const byStatus = useMemo(() => {
    const m: Record<string, TContent[]> = {};
    STATUSES.forEach(([k]) => (m[k] = []));
    visible.forEach((c) => (m[c.status] ??= []).push(c));
    return m;
  }, [visible]);

  async function setStatus(c: TContent, status: string) {
    const { error } = await db.from("contents").update({ status }).eq("id", c.id);
    if (error) toast.error(error.message); else reload();
  }

  async function remove(c: TContent) {
    if (!confirm(`Supprimer « ${c.title} » ?`)) return;
    if (c.file_path) await supabase.storage.from("rushs").remove([c.file_path]);
    const { error } = await db.from("contents").delete().eq("id", c.id);
    if (error) toast.error(error.message); else reload();
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Production marketing</p>
        <h2 className="mt-2 text-2xl font-semibold">Contenus</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Chaque contenu porte maintenant son objectif, sa campagne, sa cible, son format et son canal. Une créa peut ensuite être distribuée en organique ou en paid sans être dupliquée.</p>
      </div>

      <NewContentForm wsId={wsId} onCreated={reload} />

      <div className="biiz-filters flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "tous" ? "default" : "outline"} onClick={() => setFilter("tous")}>Tous</Button>
        {NATURES.slice(0, 6).map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{label}</Button>
        ))}
      </div>

      <div className="biiz-board grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {STATUSES.map(([sk, slabel]) => (
          <div key={sk} data-status={sk} className="biiz-board-column min-w-0">
            <p className="text-muted-foreground">{slabel} · {byStatus[sk]?.length ?? 0}</p>
            <ul className="space-y-2 p-3">
              {(byStatus[sk] ?? []).map((c) => (
                <li key={c.id} className="rounded-md border bg-background p-3 text-sm">
                  <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left font-medium hover:bg-transparent hover:text-primary" onClick={() => setOpen(c)}>{c.title}</Button>
                  <p className="mt-1 text-[11px] text-primary">{natureLabel(c.nature)} · {formatLabel(c.format)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {campaignName(c.campaign_id) ?? "Sans campagne"}
                    {c.publish_at ? ` · ${format(new Date(c.publish_at), "d MMM", { locale: fr })}` : c.due_date ? ` · ${format(new Date(c.due_date), "d MMM", { locale: fr })}` : ""}
                  </p>
                  {c.objective && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.objective}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STATUSES.filter(([k]) => k !== c.status).slice(0, 3).map(([k, l]) => (
                      <Button key={k} variant="ghost" className="h-6 rounded px-1.5 text-[11px] text-muted-foreground" onClick={() => setStatus(c, k)}>{l}</Button>
                    ))}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(c)} aria-label="Supprimer le contenu" title="Supprimer"><Trash2 className="size-3" /></Button>
                  </div>
                </li>
              ))}
              {(byStatus[sk] ?? []).length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">—</li>}
            </ul>
          </div>
        ))}
      </div>

      <ContentDialog content={open} campaignName={campaignName(open?.campaign_id ?? null)} onClose={() => setOpen(null)} />
    </div>
  );
}

function NewContentForm({ wsId, onCreated }: { wsId: string; onCreated: () => void }) {
  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("campaigns").select("id,name").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CampaignLite[];
    },
  });

  const links = useQuery({
    queryKey: ["links-lite", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("links").select("id,name,code").eq("workspace_id", wsId).is("archived_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as LinkLite[];
    },
  });

  const [type, setType] = useState<string>("crea");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [campaignId, setCampaignId] = useState("none");
  const [contentFormat, setContentFormat] = useState("statique");
  const [nature, setNature] = useState("commercial");
  const [platform, setPlatform] = useState("instagram");
  const [objective, setObjective] = useState("");
  const [target, setTarget] = useState("");
  const [cta, setCta] = useState("");
  const [caption, setCaption] = useState("");
  const [publishAt, setPublishAt] = useState("");
  const [due, setDue] = useState("");
  const [linkId, setLinkId] = useState("none");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let file_path: string | null = null;
      let file_name: string | null = null;

      if (file) {
        file_path = `${wsId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        file_name = file.name;
        const { error: upErr } = await supabase.storage.from("rushs").upload(file_path, file);
        if (upErr) { toast.error(upErr.message); return; }
      }

      const { error } = await db.from("contents").insert({
        workspace_id: wsId,
        type,
        title: title.trim(),
        body: body.trim() || null,
        campaign_id: campaignId === "none" ? null : campaignId,
        format: contentFormat,
        nature,
        channel: platform === "offline" ? "offline" : "social",
        platform,
        objective: objective.trim() || null,
        target_summary: target.trim() || null,
        cta: cta.trim() || null,
        caption: caption.trim() || null,
        publish_at: publishAt ? new Date(publishAt).toISOString() : null,
        due_date: due || null,
        link_id: linkId === "none" ? null : linkId,
        file_path,
        file_name,
        created_by: u.user!.id,
        owner_id: u.user!.id,
        status: "brief",
      });

      if (error) { toast.error(error.message); return; }

      toast.success("Contenu ajouté au planning");
      setTitle(""); setBody(""); setObjective(""); setTarget(""); setCta(""); setCaption(""); setPublishAt(""); setDue(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="biiz-editor">
      <p className="text-sm font-medium">Nouveau contenu</p>
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5 md:col-span-2"><Label>Titre</Label><Input required placeholder="S1-C — Révolution à La Teste" value={title} onChange={(e) => setTitle(e.target.value)} /></div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Campagne</Label>
          <Select value={campaignId} onValueChange={setCampaignId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="none">Sans campagne</SelectItem>
            {campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent></Select>
        </div>

        <div className="space-y-1.5"><Label>Nature</Label><Select value={nature} onValueChange={setNature}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{NATURES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Format</Label><Select value={contentFormat} onValueChange={setContentFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{FORMATS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>

        <div className="space-y-1.5"><Label>Type interne</Label><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Plateforme</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLATFORMS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Objectif business</Label><Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Faire découvrir l’app et générer des commandes" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Cible</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="18–35 ans · La Teste / Bassin" /></div>

        <div className="space-y-1.5 md:col-span-2"><Label>CTA</Label><Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Commander maintenant" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Lien BIIZ</Label><Select value={linkId} onValueChange={setLinkId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="none">Aucun</SelectItem>{links.data?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} · /r/{l.code}</SelectItem>)}
        </SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Date publication</Label><Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Échéance créa</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>

        <div className="space-y-1.5 md:col-span-3"><Label>Brief / direction</Label><Textarea rows={4} placeholder="Ce que le contenu doit faire comprendre, ressentir ou provoquer…" value={body} onChange={(e) => setBody(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Légende / copy</Label><Textarea rows={4} placeholder="Texte final ou brouillon…" value={caption} onChange={(e) => setCaption(e.target.value)} /></div>

        <div className="space-y-1.5 md:col-span-2"><Label>Asset / créa</Label><Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
      </div>

      <div className="mt-4 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Envoi…" : <><Plus />Ajouter au planning</>}</Button></div>
    </form>
  );
}

function ContentDialog({ content, campaignName, onClose }: { content: TContent | null; campaignName: string | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  async function openFile() {
    if (!content?.file_path) return;
    const { data, error } = await supabase.storage.from("rushs").createSignedUrl(content.file_path, 600);
    if (error) { toast.error(error.message); return; }
    setUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Dialog open={!!content} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{content?.title}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          {content ? statusLabel(content.status) : ""}
          {campaignName ? ` · ${campaignName}` : ""}
          {content?.publish_at ? ` · publication ${format(new Date(content.publish_at), "d MMMM yyyy HH:mm", { locale: fr })}` : ""}
        </p>

        {content && (
          <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <p><span className="text-xs text-muted-foreground">Nature</span><br />{natureLabel(content.nature)}</p>
            <p><span className="text-xs text-muted-foreground">Format</span><br />{formatLabel(content.format)}</p>
            <p><span className="text-xs text-muted-foreground">Plateforme</span><br />{content.platform ?? "—"}</p>
            <p><span className="text-xs text-muted-foreground">Objectif</span><br />{content.objective ?? "—"}</p>
            <p><span className="text-xs text-muted-foreground">Cible</span><br />{content.target_summary ?? "—"}</p>
            <p><span className="text-xs text-muted-foreground">CTA</span><br />{content.cta ?? "—"}</p>
          </div>
        )}

        {content?.body && <div><p className="text-xs font-medium uppercase text-muted-foreground">Brief / direction</p><p className="mt-2 whitespace-pre-wrap text-sm">{content.body}</p></div>}
        {content?.caption && <div><p className="text-xs font-medium uppercase text-muted-foreground">Légende / copy</p><p className="mt-2 whitespace-pre-wrap text-sm">{content.caption}</p></div>}

        {content?.file_path && <Button variant="outline" onClick={openFile}>Ouvrir le fichier{url ? "" : ` (${content.file_name})`}</Button>}
      </DialogContent>
    </Dialog>
  );
}
