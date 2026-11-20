import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Pin, Save, Sparkles } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { askBiiz } from "@/lib/bi-data.functions";
import { DIMENSIONS, explore, formatMetric, METRICS, type BiEvent, type Dimension, type MetricId, type Period } from "@/lib/bi-data";
import type { BiData } from "@/components/data/use-bi-data";
import { EmptyData, MetricCard, Panel } from "@/components/data/data-shared";

export type LabConfig = { metric: MetricId; dimension: Dimension; source: string; campaign: string; capability: string };
export function DataLab({ events, period, data, wsId, config, setConfig, onDrill }: {
  events: BiEvent[]; period: Period; data: BiData; wsId: string; config: LabConfig; setConfig: (c: LabConfig) => void;
  onDrill: (title: string, records: BiEvent[]) => void;
}) {
  const qc = useQueryClient(), runAsk = useServerFn(askBiiz);
  const [question, setQuestion] = useState(""), [asking, setAsking] = useState(false), [askError, setAskError] = useState<string | null>(null);
  const [name, setName] = useState(""), [pinned, setPinned] = useState(false), [saving, setSaving] = useState(false);
  const filters = { source: config.source || undefined, campaign: config.campaign || undefined, capability: config.capability || undefined };
  const result = useMemo(() => explore(events, period, config.metric, config.dimension, filters), [events, period, config]);
  const meta = METRICS.find((m) => m.id === config.metric)!;
  const chart = result.rows.filter((r) => r.metric.value !== null).map((r) => ({ name: r.key, value: r.metric.value })).reverse();
  const variation = result.total.value !== null && result.previous.value !== null && result.previous.value !== 0 ? ((result.total.value - result.previous.value) / Math.abs(result.previous.value)) * 100 : null;
  const sources = [...new Set(events.map((e) => e.utm_source).filter((x): x is string => !!x))].sort();
  const campaigns = [...new Set(events.map((e) => e.utm_campaign).filter((x): x is string => !!x))].sort();
  const update = <K extends keyof LabConfig>(key: K, value: LabConfig[K]) => setConfig({ ...config, [key]: value });

  async function ask() {
    setAsking(true); setAskError(null);
    try {
      const response = await runAsk({ data: { question } });
      if (response.error || !response.config) { setAskError(response.error ?? "Ask BIIZ est indisponible."); return; }
      setConfig({ metric: response.config.metric, dimension: response.config.dimension, source: "", campaign: "", capability: response.config.capability ?? "" });
      toast.success("Analyse configurée — valeurs calculées par BIIZ, sans SQL généré.");
    } catch { setAskError("Ask BIIZ est momentanément indisponible. Les Smart Insights restent disponibles."); }
    finally { setAsking(false); }
  }
  async function save() {
    if (!name.trim()) return; setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("bi_saved_analyses").insert({ workspace_id: wsId, name: name.trim(), config: { ...config, period }, pinned, created_by: user.user!.id });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(pinned ? "Analyse épinglée au cockpit Data." : "Analyse sauvegardée."); setName(""); setPinned(false);
    await qc.invalidateQueries({ queryKey: ["bi-analyses", wsId] });
  }
  async function togglePin(id: string, value: boolean) {
    const { error } = await supabase.from("bi_saved_analyses").update({ pinned: value }).eq("id", id);
    if (error) toast.error(error.message); else await qc.invalidateQueries({ queryKey: ["bi-analyses", wsId] });
  }
  function load(raw: unknown) {
    const c = raw as Partial<LabConfig> & { period?: Period };
    if (!c.metric || !METRICS.some((m) => m.id === c.metric) || !c.dimension || !DIMENSIONS.some((d) => d.id === c.dimension)) { toast.error("Configuration d’analyse invalide."); return; }
    setConfig({ metric: c.metric, dimension: c.dimension, source: c.source ?? "", campaign: c.campaign ?? "", capability: c.capability ?? "" });
  }

  return <div className="space-y-5">
    <Panel title="Ask BIIZ" description="L’IA choisit uniquement une métrique et un groupement autorisés. Le calcul reste déterministe et aucun SQL n’est généré.">
      <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Question à Ask BIIZ" placeholder="Ex. Réservations par source Wash" value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={3} maxLength={300} /><Button type="submit" disabled={asking}><Sparkles />{asking ? "Configuration…" : "Configurer l’analyse"}</Button></form>
      {askError && <p role="alert" className="mt-3 text-sm text-destructive">{askError}</p>}
    </Panel>
    <Panel title="Data Lab" description="Une définition centrale par métrique. Chaque ligne ouvre les enregistrements sous-jacents.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium">Métrique<Select value={config.metric} onValueChange={(v) => update("metric", v as MetricId)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{METRICS.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}</SelectContent></Select></label>
        <label className="text-xs font-medium">Grouper par<Select value={config.dimension} onValueChange={(v) => update("dimension", v as Dimension)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{DIMENSIONS.map((d) => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}</SelectContent></Select></label>
        <label className="text-xs font-medium">Source<Select value={config.source || "all"} onValueChange={(v) => update("source", v === "all" ? "" : v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></label>
        <label className="text-xs font-medium">Campagne<Select value={config.campaign || "all"} onValueChange={(v) => update("campaign", v === "all" ? "" : v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{campaigns.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></label>
        <label className="text-xs font-medium">Univers<Select value={config.capability || "all"} onValueChange={(v) => update("capability", v === "all" ? "" : v)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="barber">Barber</SelectItem><SelectItem value="wash">Wash</SelectItem></SelectContent></Select></label>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><MetricCard label={meta.label} metric={result.total} unit={meta.unit} /><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Période précédente</p><p className="mt-3 text-2xl font-semibold">{formatMetric(result.previous, meta.unit)}</p><p className="mt-2 text-[11px] text-muted-foreground">{result.previousPeriod.from} → {result.previousPeriod.to}</p></div><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Variation</p><p className="mt-3 text-2xl font-semibold">{variation === null ? "—" : `${variation > 0 ? "+" : ""}${variation.toFixed(1)} %`}</p>{variation === null && <p className="mt-2 text-[11px] text-muted-foreground">Base précédente absente ou nulle.</p>}</div></div>
      <div className="mt-6 h-64" aria-label="Graphique de l’analyse">{chart.length ? <ResponsiveContainer width="100%" height="100%">{["day","week","month"].includes(config.dimension) ? <AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" /><YAxis fontSize={11} stroke="var(--muted-foreground)" width={50} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" }} /><Area type="monotone" dataKey="value" stroke="var(--primary)" fill="var(--accent)" /></AreaChart> : <BarChart data={chart} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" fontSize={11} stroke="var(--muted-foreground)" /><YAxis type="category" dataKey="name" width={120} fontSize={11} stroke="var(--muted-foreground)" /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" }} /><Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} /></BarChart>}</ResponsiveContainer> : <EmptyData>Aucun agrégat calculable pour cette configuration.</EmptyData>}</div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">{DIMENSIONS.find((d) => d.id === config.dimension)?.label}</th><th className="px-3 py-2 text-right font-medium">{meta.label}</th><th className="px-3 py-2 text-right font-medium">Records</th><th /></tr></thead><tbody>{result.rows.sort((a,b) => (b.metric.value ?? -1) - (a.metric.value ?? -1)).map((r) => <tr key={r.key} className="border-t"><td className="px-3 py-2.5 font-medium">{r.key}</td><td className="px-3 py-2.5 text-right tabular-nums">{formatMetric(r.metric, meta.unit)}</td><td className="px-3 py-2.5 text-right tabular-nums">{r.records.length}</td><td className="px-3 py-2.5 text-right"><Button variant="ghost" size="sm" onClick={() => onDrill(`${meta.label} · ${r.key}`, r.records)}>Drill-down</Button></td></tr>)}</tbody></table>{!result.rows.length && <div className="mt-4"><EmptyData /></div>}</div>
    </Panel>
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Sauvegarder cette analyse" description="Épingler la rend visible dans le cockpit Data de cet espace."><div className="flex flex-col gap-3 sm:flex-row"><Input placeholder="Nom de l’analyse" value={name} onChange={(e) => setName(e.target.value)} /><label className="flex items-center gap-2 text-sm"><Switch checked={pinned} onCheckedChange={setPinned} />Épingler</label><Button disabled={saving || !name.trim()} onClick={() => void save()}><Save />Sauvegarder</Button></div></Panel>
      <Panel title="Analyses sauvegardées" description="Configurations réutilisables, sans copie figée des résultats.">{data.analyses.data?.length ? <ul className="divide-y">{data.analyses.data.map((a) => <li key={a.id} className="flex items-center gap-2 py-2.5"><button type="button" className="min-w-0 flex-1 text-left text-sm hover:text-primary" onClick={() => load(a.config)}><span className="block truncate font-medium">{a.name}</span><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span></button><Button variant={a.pinned ? "default" : "ghost"} size="icon" aria-label={a.pinned ? `Désépingler ${a.name}` : `Épingler ${a.name}`} onClick={() => void togglePin(a.id, !a.pinned)}><Pin /></Button></li>)}</ul> : <EmptyData>Aucune analyse sauvegardée.</EmptyData>}</Panel>
    </div>
  </div>;
}
