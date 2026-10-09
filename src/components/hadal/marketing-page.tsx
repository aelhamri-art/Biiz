import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, CheckCircle2, ChevronDown, Clock3, ExternalLink, Instagram, Loader2, Smartphone, Upload, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { editorialCadence, instagramEmbedUrl, kindLabel, monthKey, parsePlans, shootingRules, weekKey, type KitchenMission } from "@/lib/hadal-marketing";
import { RuleVisual } from "./rule-visual";

function useKitchen(wsId: string | null) {
  const missions = useQuery({
    queryKey: ["kitchen-missions", wsId, weekKey(), monthKey()],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("kitchen_missions").select("*").eq("workspace_id", wsId!)
        .or(`and(scope.eq.semaine,period_start.eq.${weekKey()}),and(scope.eq.mois,period_start.eq.${monthKey()})`)
        .order("position").order("created_at");
      if (error) throw error;
      return data.map((m) => ({ ...m, plans: parsePlans(m.plans) })) as KitchenMission[];
    },
  });
  const sent = useQuery({
    queryKey: ["kitchen-sent", wsId],
    enabled: !!wsId && !!missions.data?.length,
    queryFn: async () => {
      const ids = missions.data!.map((m) => m.id);
      const { data, error } = await supabase.from("contents").select("mission_id").in("mission_id", ids);
      if (error) throw error;
      const c: Record<string, number> = {};
      data.forEach((r) => { if (r.mission_id) c[r.mission_id] = (c[r.mission_id] ?? 0) + 1; });
      return c;
    },
  });
  return { missions, sent: sent.data ?? {} };
}

function MissionCard({ m, sentCount, wsId }: { m: KitchenMission; sentCount: number; wsId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const kitchenMade = m.kind === "pov" || m.kind === "statique";

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Reconnecte-toi"); return; }
    let ok = 0;
    for (const [i, file] of Array.from(files).entries()) {
      setBusy(`Envoi ${i + 1}/${files.length}…`);
      const safe = file.name.replace(/[^\w.-]+/g, "_");
      const file_path = `${wsId}/${crypto.randomUUID()}-${safe}`;
      const { error: upErr } = await supabase.storage.from("rushs").upload(file_path, file, file.type ? { contentType: file.type } : {});
      if (upErr) { toast.error(`${file.name} : ${upErr.message}`); continue; }
      const { error } = await supabase.from("contents").insert({ workspace_id: wsId, type: "rush", title: `Rush · ${m.title}`, file_path, file_name: file.name, mission_id: m.id, created_by: u.user.id, status: "a_valider" });
      if (error) toast.error(error.message); else ok++;
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    if (ok) { toast.success(`${ok} vidéo${ok > 1 ? "s" : ""} envoyée${ok > 1 ? "s" : ""}. Merci !`); void qc.invalidateQueries({ queryKey: ["kitchen-sent", wsId] }); }
  }

  return (
    <article className="rounded-lg border bg-card">
      <button className="flex w-full items-start gap-3 p-4 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase text-primary">{kindLabel(m.kind)}</p>
          <h3 className="mt-1 text-lg font-semibold">{m.title}</h3>
          {m.pitch && <p className="mt-1 text-sm text-muted-foreground">{m.pitch}</p>}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {m.duration_min ? <li className="flex items-center gap-1"><Clock3 className="size-3.5" />{m.duration_min} min</li> : null}
            {m.people && <li className="flex items-center gap-1"><Users className="size-3.5" />{m.people}</li>}
            {kitchenMade && <li className="flex items-center gap-1"><Smartphone className="size-3.5" />9:16</li>}
            {sentCount > 0 && <li className="flex items-center gap-1 font-medium text-chart-2"><CheckCircle2 className="size-3.5" />Filmé · {sentCount} fichier{sentCount > 1 ? "s" : ""}</li>}
          </ul>
        </div>
        <ChevronDown className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t px-4 pb-5">
        {m.plans.length > 0 && <ol className="divide-y">{m.plans.map((p, i) => <li key={i} className="py-4"><p className="text-xs font-medium text-primary">PLAN {i + 1}</p><h4 className="mt-1 font-semibold">{p.title}</h4>{p.instruction && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.instruction}</p>}{p.line && <p className="mt-2 text-sm font-medium">{p.line}</p>}</li>)}</ol>}
        {(m.want || m.never) && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
          {m.want && <div><h4 className="flex items-center gap-2 text-xs font-semibold text-chart-2"><Check className="size-4" />ON VEUT</h4><p className="mt-1 text-sm">{m.want}</p></div>}
          {m.never && <div><h4 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />JAMAIS</h4><p className="mt-1 text-sm text-muted-foreground">{m.never}</p></div>}
        </div>}
        {kitchenMade ? <div className="pt-5">
          <input ref={fileRef} type="file" accept="video/*,image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
          <Button size="lg" className="h-12 w-full" disabled={!!busy} onClick={() => fileRef.current?.click()}>{busy ? <><Loader2 className="animate-spin" />{busy}</> : <><Upload />J’ai filmé · envoyer mes vidéos</>}</Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Choisis les vidéos dans ta galerie. Elles arrivent chez BIIZ.</p>
        </div> : <p className="pt-4 text-xs text-muted-foreground">Production dédiée : pas à tourner en cuisine.</p>}
      </div>}
    </article>
  );
}

function Week({ wsId }: { wsId: string }) {
  const { missions, sent } = useKitchen(wsId);
  const list = missions.data ?? [];
  const week = list.filter((m) => m.scope === "semaine");
  const month = list.filter((m) => m.scope === "mois");
  const done = (k: string) => week.filter((m) => m.kind === k && sent[m.id]).length;
  return <>
    <h1 className="text-2xl font-semibold">Cette semaine</h1>
    <p className="mt-2 text-sm text-muted-foreground">Organisez-vous comme vous voulez. Tout doit être filmé d’ici dimanche.</p>
    <div className="mt-5 grid grid-cols-2 gap-3">
      {editorialCadence.filter((c) => c.period === "week").map((c) => { const k = c.id === "pov" ? "pov" : "statique"; return <div key={c.id} className="rounded-lg border bg-card p-3"><p className="text-xs text-muted-foreground">{c.title}</p><p className="mt-1 font-mono text-lg font-semibold">{done(k)}<span className="text-muted-foreground"> / {c.count}</span></p></div>; })}
    </div>
    {missions.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Chargement…</p> : week.length === 0
      ? <div className="mt-6 border-y py-12 text-center"><Camera className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">Les missions arrivent.</h2><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">La direction créative prépare la semaine.</p></div>
      : <div className="mt-6 space-y-3">{week.map((m) => <MissionCard key={m.id} m={m} wsId={wsId} sentCount={sent[m.id] ?? 0} />)}</div>}
    <section className="mt-9"><h2 className="text-xs font-medium uppercase text-primary">Ce mois · Préparé à part</h2>
      {month.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Film signature et opération HADAL : dates communiquées bientôt.</p>
        : <div className="mt-3 space-y-3">{month.map((m) => <MissionCard key={m.id} m={m} wsId={wsId} sentCount={sent[m.id] ?? 0} />)}</div>}
    </section>
  </>;
}

function Inspirations({ wsId }: { wsId: string }) {
  const q = useQuery({
    queryKey: ["kitchen-inspi", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("kitchen_inspirations").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const items = q.data ?? [];
  return <><h1 className="text-2xl font-semibold">Les bonnes références</h1><p className="mt-2 text-sm text-muted-foreground">Des situations à reprendre, pas des pubs à imiter.</p>
    {items.length === 0 ? <div className="mt-7 border-y py-16 text-center"><Instagram className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">La sélection arrive bientôt.</h2><p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Les Reels choisis par la direction créative apparaîtront ici.</p></div> : <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">{items.map((item) => {
      const embed = instagramEmbedUrl(item.url);
      if (!embed) return null;
      return <article key={item.id} className="min-w-0 overflow-hidden rounded-lg border bg-card"><iframe src={embed} title={item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" className="h-[480px] w-full border-0" /><div className="p-4"><h2 className="font-semibold">{item.title}</h2>{item.tags.length > 0 && <p className="mt-2 text-xs text-primary">{item.tags.join(" · ")}</p>}{item.takeaway && <p className="mt-3 text-sm"><span className="font-medium">Ce qu’on reprend : </span>{item.takeaway}</p>}{item.why && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium">Pourquoi : </span>{item.why}</p>}<Button asChild variant="link" className="mt-3 h-auto p-0"><a href={item.url} target="_blank" rel="noopener noreferrer">Ouvrir sur Instagram<ExternalLink /></a></Button></div></article>;
    })}</div>}
  </>;
}

function Guide() {
  return <><h1 className="text-2xl font-semibold">Simple. Propre. Naturel.</h1><p className="mt-2 text-sm text-muted-foreground">6 réflexes. Regarde, c’est tout.</p>
    <ol className="mt-6 grid gap-4 sm:grid-cols-2">{shootingRules.map((rule, i) => <li key={rule.id} className="rounded-lg border bg-card p-4"><RuleVisual id={rule.id} /><div className="mt-3 flex gap-3"><span className="pt-0.5 font-mono text-xs text-primary">0{i + 1}</span><div><h2 className="text-sm font-semibold">{rule.title}</h2><p className="mt-0.5 text-sm text-muted-foreground">{rule.detail}</p></div></div></li>)}</ol>
    <section className="mt-7 border-l-2 border-primary pl-4"><h2 className="text-xs font-medium uppercase text-primary">Le test anti-cringe</h2><p className="mt-2 text-lg font-semibold">« Est-ce qu’on ferait / dirait vraiment ça entre nous ? »</p><p className="mt-2 text-sm text-muted-foreground">Si non, on ne tourne pas.</p></section>
    <section className="mt-7 border-t pt-5"><h2 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />À BANNIR</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Zooms gadgets, transitions cheap, danse forcée, 15 emojis, slogans type « venez découvrir… ».</p></section></>;
}

function SignIn() {
  return <div className="py-16 text-center"><h1 className="text-2xl font-semibold">Espace cuisine HADAL</h1><p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Connecte-toi avec ton compte BIIZ pour voir les missions de la semaine et envoyer tes vidéos.</p>
    <Button asChild size="lg" className="mt-6 h-12"><Link to="/auth" onClick={() => { try { sessionStorage.setItem("biiz:next", "/hadal-marketing"); } catch { /* ignore */ } }}>Se connecter</Link></Button></div>;
}

export function HadalMarketingPage() {
  const [auth, setAuth] = useState<"loading" | "in" | "out">("loading");
  const [wsId, setWsId] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuth(data.session ? "in" : "out"));
  }, []);
  const ws = useQuery({
    queryKey: ["workspaces"],
    enabled: auth === "in",
    queryFn: async () => {
      await supabase.rpc("claim_invites");
      const { data, error } = await supabase.from("workspaces").select("id,name").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const list = useMemo(() => ws.data ?? [], [ws.data]);
  useEffect(() => {
    if (!wsId && list.length) setWsId((list.find((w) => /hadal/i.test(w.name)) ?? list[0]!).id);
  }, [list, wsId]);

  return <div className="min-h-screen bg-background">
    <header className="biiz-topbar border-b bg-card/95"><div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="biiz-mark shrink-0">B</span><span className="text-lg font-semibold">BIIZ</span></div>
      {list.length > 1 && wsId ? <Select value={wsId} onValueChange={setWsId}><SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent>{list.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} / Cuisine</SelectItem>)}</SelectContent></Select>
        : <span className="shrink-0 text-xs text-muted-foreground">{list[0]?.name ?? "HADAL"} / Cuisine</span>}</div></header>
    {auth === "out" ? <main className="mx-auto max-w-2xl px-5"><SignIn /></main> : !wsId ? <main className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">{auth === "loading" || ws.isLoading ? "Chargement…" : "Tu n’as pas encore accès à un projet. Demande une invitation."}</main> :
    <Tabs defaultValue="week" className="mx-auto max-w-2xl px-5 pb-8">
      <div className="biiz-tabs-shell sticky top-[69px] z-30 bg-background pt-2"><TabsList aria-label="HADAL marketing" className="biiz-tabs !grid grid-cols-3 !gap-0 !p-0"><TabsTrigger value="week" className="!min-h-12 !text-xs">SEMAINE</TabsTrigger><TabsTrigger value="inspi" className="!min-h-12 !text-xs">INSPI</TabsTrigger><TabsTrigger value="guide" className="!min-h-12 !text-xs">GUIDE</TabsTrigger></TabsList></div>
      <main className="pt-6"><TabsContent value="week" className="mt-0"><Week wsId={wsId} /></TabsContent><TabsContent value="inspi" className="mt-0"><Inspirations wsId={wsId} /></TabsContent><TabsContent value="guide" className="mt-0"><Guide /></TabsContent></main>
      <footer className="mt-10 border-t pt-5 text-center text-[11px] text-muted-foreground">BIIZ · Pour l’équipe cuisine</footer>
    </Tabs>}
  </div>;
}
