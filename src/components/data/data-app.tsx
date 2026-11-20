import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Beaker, Database, KeyRound, Pin, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ensureAlphaSource } from "@/lib/bi-data.functions";
import type { BiEvent, Dimension, MetricId, Period } from "@/lib/bi-data";
import { useBiData } from "@/components/data/use-bi-data";
import { DataCockpit } from "@/components/data/data-cockpit";
import { DataCustomers } from "@/components/data/data-customers";
import { DataLab, type LabConfig } from "@/components/data/data-lab";
import { DrillDialog, EmptyData, Panel } from "@/components/data/data-shared";

const iso = (d: Date) => d.toISOString().slice(0, 10);
export function DataApp({ wsId, workspaceName }: { wsId: string; workspaceName?: string | undefined }) {
  const data = useBiData(wsId), provision = useServerFn(ensureAlphaSource);
  const [view, setView] = useState("cockpit");
  const [period, setPeriod] = useState<Period>(() => { const end = new Date(), start = new Date(); start.setUTCDate(end.getUTCDate() - 89); return { from: iso(start), to: iso(end) }; });
  const [drill, setDrill] = useState<{ title: string; records: BiEvent[] } | null>(null);
  const [lab, setLab] = useState<LabConfig>({ metric: "bookings", dimension: "day", source: "", campaign: "", capability: "" });
  const [provisioning, setProvisioning] = useState(false), [newKey, setNewKey] = useState<{ id: string; key: string } | null>(null);
  const events = useMemo(() => data.events.data ?? [], [data.events.data]);
  const onDrill = (title: string, records: BiEvent[]) => setDrill({ title, records });
  const openExplore = (dimension: Dimension) => { setLab({ ...lab, dimension }); setView("lab"); };
  const pinned = data.analyses.data?.filter((a) => a.pinned) ?? [];

  async function prepareAlpha() {
    setProvisioning(true);
    try {
      const result = await provision({ data: { workspaceId: wsId } });
      if (result.key) setNewKey({ id: result.source.id, key: result.key });
      toast.success(result.key ? "Source ALPHA créée. Copiez la clé maintenant." : "Source ALPHA déjà prête.");
      await data.reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Impossible de préparer ALPHA."); }
    finally { setProvisioning(false); }
  }
  function loadPinned(raw: unknown) {
    const c = raw as Partial<LabConfig>;
    if (!c.metric || !c.dimension) return;
    setLab({ metric: c.metric as MetricId, dimension: c.dimension as Dimension, source: c.source ?? "", campaign: c.campaign ?? "", capability: c.capability ?? "" });
    setView("lab");
  }

  return <div className="bi-data space-y-6">
    <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-medium uppercase text-primary">Business Intelligence</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">BIIZ Data{workspaceName ? ` · ${workspaceName}` : ""}</h2><p className="mt-1 text-sm text-muted-foreground">Données réelles, définitions explicites, drill-down jusqu’aux événements.</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="text-[11px] text-muted-foreground">Du<Input type="date" className="mt-1 h-9 w-36" value={period.from} max={period.to} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /></label><label className="text-[11px] text-muted-foreground">Au<Input type="date" className="mt-1 h-9 w-36" value={period.to} min={period.from} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /></label><Button size="sm" variant="outline" onClick={() => void data.reload()} disabled={data.events.isFetching}><RefreshCw className={data.events.isFetching ? "animate-spin" : ""} />Actualiser</Button></div>
    </div>
    <div role="tablist" aria-label="BIIZ Data" className="flex gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {[["cockpit","Cockpit",<Activity key="i" />],["customers","Clients",<Users key="i" />],["lab","Data Lab",<Beaker key="i" />],["sources","Sources & santé",<Database key="i" />]].map(([id,label,icon]) => <Button key={id as string} role="tab" aria-selected={view === id} variant={view === id ? "default" : "ghost"} size="sm" className="shrink-0" onClick={() => setView(id as string)}>{icon}{label}</Button>)}
    </div>
    {data.events.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chargement des données">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />)}</div> : data.events.error ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm"><p className="font-medium">Impossible de charger BIIZ Data.</p><p className="mt-1 text-muted-foreground">Vos droits ou la connexion sont peut-être indisponibles. Aucun chiffre de remplacement n’est affiché.</p><Button className="mt-4" variant="outline" onClick={() => void data.reload()}>Réessayer</Button></div> : <>
      {view === "cockpit" && pinned.length > 0 && <Panel title="Analyses épinglées" description="Raccourcis vers vos configurations Data Lab."><div className="flex flex-wrap gap-2">{pinned.map((a) => <Button key={a.id} variant="outline" size="sm" onClick={() => loadPinned(a.config)}><Pin />{a.name}</Button>)}</div></Panel>}
      {view === "cockpit" && <DataCockpit events={events} period={period} rejected={data.errors.data?.length ?? 0} onDrill={onDrill} onExplore={openExplore} />}
      {view === "customers" && <DataCustomers events={events} period={period} onDrill={onDrill} />}
      {view === "lab" && <DataLab events={events} period={period} data={data} wsId={wsId} config={lab} setConfig={setLab} onDrill={onDrill} />}
      {view === "sources" && <div className="space-y-5">
        <Panel title="Sources de données" description="L’ingestion est serveur à serveur, signée par clé source et dédoublonnée par identifiant externe." action={workspaceName?.toUpperCase() === "ALPHA" ? <Button size="sm" onClick={() => void prepareAlpha()} disabled={provisioning}><KeyRound />{provisioning ? "Préparation…" : "Préparer ALPHA"}</Button> : undefined}>
          {data.sources.data?.length ? <div className="grid gap-3 lg:grid-cols-2">{data.sources.data.map((s) => { const sync = data.sync.data?.find((x) => x.source_id === s.id); return <article key={s.id} className="rounded-md border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{s.name}</h3><span className="text-xs text-muted-foreground">{s.active ? "Active" : "Inactive"}</span></div><code className="mt-3 block break-all rounded bg-muted p-2 text-xs">POST /api/public/ingest/{s.id}</code><dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><dt className="text-muted-foreground">Acceptés</dt><dd className="mt-1 text-lg font-semibold">{sync?.accepted_count ?? 0}</dd></div><div><dt className="text-muted-foreground">Doublons</dt><dd className="mt-1 text-lg font-semibold">{sync?.duplicate_count ?? 0}</dd></div><div><dt className="text-muted-foreground">Rejetés</dt><dd className="mt-1 text-lg font-semibold">{sync?.rejected_count ?? 0}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Dernier événement : {s.last_event_at ? new Date(s.last_event_at).toLocaleString("fr-FR") : "—"}</p>{sync?.last_error && <p className="mt-2 text-xs text-destructive">{sync.last_error}</p>}</article>; })}</div> : <EmptyData>{workspaceName?.toUpperCase() === "ALPHA" ? "Aucune source. Préparez la source native ALPHA pour recevoir les premiers événements." : "Aucune source configurée dans cet espace. La source native actuellement disponible est ALPHA."}</EmptyData>}
        </Panel>
        <Panel title="Erreurs d’ingestion" description="Les 100 derniers rejets, sans copie des données personnelles ou du contenu complet des événements.">{data.errors.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">Événement externe</th><th className="pb-2 font-medium">Raison</th></tr></thead><tbody>{data.errors.data.map((e) => <tr key={e.id} className="border-t"><td className="py-2.5 whitespace-nowrap">{new Date(e.created_at).toLocaleString("fr-FR")}</td><td className="py-2.5 font-mono text-xs">{e.external_event_id ?? "—"}</td><td className="py-2.5 text-muted-foreground">{e.reason}</td></tr>)}</tbody></table></div> : <EmptyData>Aucune erreur d’ingestion enregistrée.</EmptyData>}</Panel>
      </div>}
    </>}
    <DrillDialog title={drill?.title ?? ""} records={drill?.records ?? null} onClose={() => setDrill(null)} />
    <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}><DialogContent><DialogHeader><DialogTitle>Clé source ALPHA</DialogTitle><DialogDescription>Elle ne sera plus affichée. Stockez-la dans le secret du système ALPHA qui enverra les événements.</DialogDescription></DialogHeader>{newKey && <><code className="break-all rounded bg-muted p-3 text-xs">{newKey.key}</code><Button onClick={() => { void navigator.clipboard.writeText(newKey.key); toast.success("Clé copiée."); }}>Copier la clé</Button><p className="text-xs text-muted-foreground">Endpoint : POST {window.location.origin}/api/public/ingest/{newKey.id} · Authorization: Bearer &lt;clé&gt; · JSON {"{"}"events":[…]{"}"}</p></>}</DialogContent></Dialog>
  </div>;
}
