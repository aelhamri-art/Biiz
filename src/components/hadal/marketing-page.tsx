import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, CalendarDays, Camera, Check, CheckCircle2, ChevronDown, Clapperboard, Clock3, ExternalLink, Instagram, Loader2, Smartphone, Upload, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { editorialCadence, instagramEmbedUrl, kindLabel, monthKey, parsePlans, shootingRules, weekKey, type KitchenMission } from "@/lib/hadal-marketing";
import { RuleVisual } from "./rule-visual";
import kitchenEditorial from "@/assets/hadal-kitchen-editorial.jpg";

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
    <article data-open={open} className="hadal-mission rounded-lg border bg-card">
      <Button variant="ghost" className="hadal-mission-trigger h-auto w-full items-start justify-start whitespace-normal rounded-none gap-4 p-5 text-left hover:bg-muted/50" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="hadal-mission-icon"><Clapperboard className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase text-primary">{kindLabel(m.kind)}<span className="text-border">/</span><span className="font-normal normal-case text-muted-foreground">{m.plans.length} plans</span></p>
          <h3 className="mt-2 text-xl font-semibold leading-snug">{m.title}</h3>
          {m.pitch && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.pitch}</p>}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {m.duration_min ? <li className="flex items-center gap-1"><Clock3 className="size-3.5" />{m.duration_min} min</li> : null}
            {m.people && <li className="flex items-center gap-1"><Users className="size-3.5" />{m.people}</li>}
            {kitchenMade && <li className="flex items-center gap-1"><Smartphone className="size-3.5" />9:16</li>}
            {sentCount > 0 && <li className="flex items-center gap-1 font-medium text-chart-2"><CheckCircle2 className="size-3.5" />Filmé · {sentCount} fichier{sentCount > 1 ? "s" : ""}</li>}
          </ul>
        </div>
        <ChevronDown className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && <div className="hadal-mission-body border-t px-5 pb-5">
        {m.plans.length > 0 && <ol className="hadal-shot-list">{m.plans.map((p, i) => <li key={i} className="flex gap-4 py-4"><span className="hadal-shot-number">{String(i + 1).padStart(2, "0")}</span><div className="min-w-0"><p className="text-[10px] font-medium uppercase text-muted-foreground">PLAN {i + 1}</p><h4 className="mt-1 font-semibold">{p.title}</h4>{p.instruction && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.instruction}</p>}{p.line && <blockquote className="hadal-dialogue mt-3 text-sm font-medium">{p.line}</blockquote>}</div></li>)}</ol>}
        {(m.want || m.never) && <div className="hadal-directions grid gap-5 border-t py-5 sm:grid-cols-2">
          {m.want && <div><h4 className="flex items-center gap-2 text-xs font-semibold text-chart-2"><Check className="size-4" />ON VEUT</h4><p className="mt-2 text-sm leading-relaxed">{m.want}</p></div>}
          {m.never && <div><h4 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />JAMAIS</h4><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.never}</p></div>}
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
  return <div className="hadal-week-layout"><div className="hadal-week-intro">
    <p className="hadal-eyebrow"><CalendarDays className="size-3.5" />LE PROGRAMME</p>
    <h2 className="mt-3 text-3xl font-semibold leading-tight">Cette semaine</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Organisez-vous comme vous voulez. Tout doit être filmé d’ici dimanche.</p>
    <div className="hadal-cadence mt-7 grid grid-cols-2 gap-5 lg:grid-cols-1">
      {editorialCadence.filter((c) => c.period === "week").map((c) => { const k = c.id === "pov" ? "pov" : "statique"; return <div key={c.id} className="flex items-center justify-between gap-3 border-t pt-4"><p className="text-xs text-muted-foreground">{c.title}</p><p className="font-mono text-2xl font-medium">{done(k)}<span className="text-sm text-muted-foreground"> / {c.count}</span></p></div>; })}
    </div>
    </div><div className="min-w-0">
    {missions.isLoading ? <div className="hadal-loading py-12"><Loader2 className="size-5 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Chargement…</p></div> : week.length === 0
      ? <div className="hadal-empty border-y py-12 text-center"><span className="biiz-empty-icon"><Camera className="size-6" /></span><h2 className="mt-3 font-semibold">Les missions arrivent.</h2><p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">La direction créative prépare la semaine.</p></div>
      : <div className="space-y-4">{week.map((m) => <MissionCard key={m.id} m={m} wsId={wsId} sentCount={sent[m.id] ?? 0} />)}</div>}
    <section className="hadal-month mt-8 border-t pt-6"><h2 className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground"><Clapperboard className="size-4" />Ce mois · Préparé à part</h2>
      {month.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Film signature et opération HADAL : dates communiquées bientôt.</p>
        : <div className="mt-3 space-y-3">{month.map((m) => <MissionCard key={m.id} m={m} wsId={wsId} sentCount={sent[m.id] ?? 0} />)}</div>}
    </section>
  </div></div>;
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
  return <><p className="hadal-eyebrow"><Instagram className="size-3.5" />LA SÉLECTION CRÉATIVE</p><h2 className="mt-3 text-3xl font-semibold">Les bonnes références</h2><p className="mt-3 text-sm text-muted-foreground">Des situations à reprendre, pas des pubs à imiter.</p>
    {items.length === 0 ? <div className="hadal-empty mt-8 border-y py-16 text-center"><span className="biiz-empty-icon"><Instagram className="size-6" /></span><h2 className="mt-4 text-xl font-semibold">La sélection arrive bientôt.</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Les Reels choisis par la direction créative apparaîtront ici.</p></div> : <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">{items.map((item) => {
      const embed = instagramEmbedUrl(item.url);
      if (!embed) return null;
      return <article key={item.id} className="min-w-0 overflow-hidden rounded-lg border bg-card"><iframe src={embed} title={item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" className="h-[480px] w-full border-0" /><div className="p-4"><h2 className="font-semibold">{item.title}</h2>{item.tags.length > 0 && <p className="mt-2 text-xs text-primary">{item.tags.join(" · ")}</p>}{item.takeaway && <p className="mt-3 text-sm"><span className="font-medium">Ce qu’on reprend : </span>{item.takeaway}</p>}{item.why && <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium">Pourquoi : </span>{item.why}</p>}<Button asChild variant="link" className="mt-3 h-auto p-0"><a href={item.url} target="_blank" rel="noopener noreferrer">Ouvrir sur Instagram<ExternalLink /></a></Button></div></article>;
    })}</div>}
  </>;
}

function Guide() {
  return <><p className="hadal-eyebrow"><Smartphone className="size-3.5" />LES BONS RÉFLEXES</p><h2 className="mt-3 text-3xl font-semibold">Simple. Propre. Naturel.</h2><p className="mt-3 text-sm text-muted-foreground">6 réflexes. Regarde, c’est tout.</p>
    <ol className="hadal-guide-grid mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shootingRules.map((rule, i) => <li key={rule.id} className="hadal-guide-item rounded-lg border bg-card"><RuleVisual id={rule.id} /><div className="flex gap-3 p-5"><span className="pt-0.5 font-mono text-xs text-primary">0{i + 1}</span><div><h3 className="text-sm font-semibold">{rule.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rule.detail}</p></div></div></li>)}</ol>
    <section className="hadal-natural mt-9 border-y py-8"><h2 className="text-xs font-medium uppercase text-primary">Le test anti-cringe</h2><p className="mt-3 max-w-2xl text-2xl font-semibold leading-snug">« Est-ce qu’on ferait / dirait vraiment ça entre nous ? »</p><p className="mt-3 text-sm text-muted-foreground">Si non, on ne tourne pas.</p></section>
    <section className="mt-7 border-t pt-5"><h2 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />À BANNIR</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Zooms gadgets, transitions cheap, danse forcée, 15 emojis, slogans type « venez découvrir… ».</p></section></>;
}

function SignIn() {
  return <div className="py-14 text-center"><h2 className="text-2xl font-semibold">Espace cuisine HADAL</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Connecte-toi avec ton compte BIIZ pour voir les missions de la semaine et envoyer tes vidéos.</p>
    <Button asChild size="lg" className="mt-6 h-12"><Link to="/auth" onClick={() => { try { sessionStorage.setItem("biiz:next", "/hadal-marketing"); } catch { /* ignore */ } }}>Se connecter<ArrowUpRight className="size-4" /></Link></Button></div>;
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
      const { data, error } = await supabase.from("workspaces").select("id,name").eq("app", "marketing").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const list = useMemo(() => ws.data ?? [], [ws.data]);
  useEffect(() => {
    if (!wsId && list.length) setWsId((list.find((w) => /hadal/i.test(w.name)) ?? list[0]!).id);
  }, [list, wsId]);

  return <div className="biiz-kitchen min-h-screen bg-background">
    <header className="biiz-topbar hadal-topbar border-b bg-card/95"><div className="hadal-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4"><div className="flex min-w-0 items-center gap-3"><span className="biiz-mark shrink-0">B</span><span className="text-lg font-semibold">BIIZ</span><span className="hadal-brand-divider" /><span className="hidden text-xs text-muted-foreground sm:inline">L’équipe cuisine</span></div>
      {list.length > 1 && wsId ? <Select value={wsId} onValueChange={setWsId}><SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger><SelectContent>{list.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} / Cuisine</SelectItem>)}</SelectContent></Select>
        : <span className="shrink-0 text-xs text-muted-foreground">{list[0]?.name ?? "HADAL"} / Cuisine</span>}</div></header>
    <section className="hadal-cover" aria-label="HADAL, espace cuisine"><img src={kitchenEditorial} alt="Illustration de tournage en cuisine : un téléphone vertical filme un Berliner." width={1536} height={768} fetchPriority="high" /><div className="hadal-cover-scrim" /><div className="hadal-container hadal-cover-content"><p className="hadal-eyebrow"><span className="hadal-live-dot" />L’ÉQUIPE CUISINE</p><h1>HADAL<span className="text-primary">.</span></h1><p className="mt-2 text-sm text-secondary-foreground sm:text-base">Les missions. Les idées. À vous de jouer.</p><div className="mt-5 flex items-center gap-2 text-[11px] font-medium text-secondary-foreground"><Smartphone className="size-3.5" />9:16<span className="mx-2 text-muted-foreground">/</span><Camera className="size-3.5" />Rushs bruts</div></div></section>
    {auth === "out" ? <main className="hadal-container"><SignIn /></main> : !wsId ? <main className="hadal-container py-16 text-center text-sm text-muted-foreground">{auth === "loading" || ws.isLoading ? "Chargement…" : "Tu n’as pas encore accès à un projet. Demande une invitation."}</main> :
    <Tabs defaultValue="week" className="hadal-container pb-8">
      <div className="hadal-tab-bar sticky z-30"><TabsList aria-label="HADAL marketing" className="hadal-tabs grid grid-cols-3"><TabsTrigger value="week"><CalendarDays />SEMAINE</TabsTrigger><TabsTrigger value="inspi"><Instagram />INSPI</TabsTrigger><TabsTrigger value="guide"><Smartphone />GUIDE</TabsTrigger></TabsList></div>
      <main className="hadal-main"><TabsContent value="week" className="mt-0"><Week wsId={wsId} /></TabsContent><TabsContent value="inspi" className="mt-0"><Inspirations wsId={wsId} /></TabsContent><TabsContent value="guide" className="mt-0"><Guide /></TabsContent></main>
      <footer className="hadal-footer mt-12 flex items-center justify-between gap-4 border-t pt-5 text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">BIIZ<span className="text-primary">.</span></span><span>Pour l’équipe cuisine</span></footer>
    </Tabs>}
  </div>;
}
