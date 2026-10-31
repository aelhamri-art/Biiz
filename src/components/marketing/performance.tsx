import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { adMetrics, aggregate, channelLabel, eur, ratio, type Row } from "@/lib/marketing";
import { aggregateInput, type MarketingData } from "./use-marketing";
import { KpiStrip } from "./campagnes";
import { MesureM01 } from "./mesure-m01";

function Table({ title, rows }: { title: string; rows: [string, Row][] }) {
  const sorted = [...rows].sort((a, b) => b[1].revenue - a[1].revenue || b[1].clicks - a[1].clicks);
  return (
    <section className="rounded-lg border bg-card">
      <h3 className="border-b px-4 py-3 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["", "Portée", "Engag.", "Clics", "Conv.", "CA", "Dépense", "CPA", "ROAS"].map((h) => <th key={h} className="px-4 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {sorted.map(([k, r]) => { const x = adMetrics(r); return (
              <tr key={k} className="border-t">
                <td className="px-4 py-2 font-medium">{k}</td><td className="px-4 py-2 tabular-nums">{r.reach}</td><td className="px-4 py-2 tabular-nums">{r.engagement}</td>
                <td className="px-4 py-2 tabular-nums">{r.clicks}</td><td className="px-4 py-2 tabular-nums">{r.conversions}</td><td className="px-4 py-2 tabular-nums">{eur(r.revenue)}</td>
                <td className="px-4 py-2 tabular-nums">{eur(r.spend)}</td><td className="px-4 py-2 tabular-nums">{eur(x.cpa)}</td><td className="px-4 py-2 font-semibold tabular-nums">{ratio(x.roas)}</td>
              </tr>); })}
            {sorted.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Pas encore de données mesurées.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PerformancePanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const [mode, setMode] = useState<"global" | "m01">("global");
  const hasM01 = (m.contents.data ?? []).some((c) => c.source_id && /^S[1-4]-[CVL]$/.test(c.source_id));
  const switcher = hasM01 ? (
    <div role="tablist" className="inline-flex gap-1 rounded-lg border bg-card p-1">
      <Button role="tab" size="sm" aria-selected={mode === "global"} variant={mode === "global" ? "default" : "ghost"} onClick={() => setMode("global")}>Vue d’ensemble</Button>
      <Button role="tab" size="sm" aria-selected={mode === "m01"} variant={mode === "m01" ? "default" : "ghost"} onClick={() => setMode("m01")}>Mesure M01</Button>
    </div>
  ) : null;
  if (hasM01 && mode === "m01") return <div className="space-y-4">{switcher}<MesureM01 wsId={wsId} m={m} /></div>;
  return <div className="space-y-4">{switcher}<GlobalPerformance m={m} /></div>;
}

function GlobalPerformance({ m }: { m: MarketingData }) {
  const agg = useMemo(() => aggregate(aggregateInput(m)), [m.links.data, m.contents.data, m.dists.data, m.clicks.data, m.conversions.data, m.ads.data]);
  const total = [...agg.byChannel.values()].reduce<Row>((t, r) => ({ spend: t.spend + r.spend, revenue: t.revenue + r.revenue, conversions: t.conversions + r.conversions, clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions, reach: t.reach + r.reach, engagement: t.engagement + r.engagement }), { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, engagement: 0 });
  const cname = (id: string) => m.campaigns.data?.find((c) => c.id === id)?.name ?? "Campagne";
  const tname = (id: string) => m.contents.data?.find((c) => c.id === id)?.title ?? "Contenu";
  return (
    <div className="space-y-4">
      <KpiStrip r={total} />
      <p className="text-xs text-muted-foreground">CA et conversions = événements purchase et booking_completed reçus sur les liens BIIZ, plus les chiffres Ads saisis. Organique = chiffres saisis sur chaque diffusion.</p>
      <Table title="Par canal" rows={[...agg.byChannel].map(([k, r]) => [k === "lien_biiz" ? "Lien BIIZ (sans diffusion)" : channelLabel(k), r])} />
      <Table title="Par campagne" rows={[...agg.byCampaign].map(([k, r]) => [cname(k), r])} />
      <Table title="Par contenu" rows={[...agg.byContent].map(([k, r]) => [tname(k), r])} />
    </div>
  );
}
