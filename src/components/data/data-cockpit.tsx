import { useMemo } from "react";
import { ArrowUpRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BOOKING_EVENTS, COMPLETED_EVENTS, computeFunnel, computeMetrics, dataHealth, explore, smartInsights, type BiEvent, type Period } from "@/lib/bi-data";
import { EmptyData, FunnelTable, MetricCard, Panel } from "@/components/data/data-shared";

export function DataCockpit({ events, period, rejected, onDrill, onExplore }: {
  events: BiEvent[]; period: Period; rejected: number;
  onDrill: (title: string, records: BiEvent[]) => void;
  onExplore: (dimension: "source" | "campaign") => void;
}) {
  const m = useMemo(() => computeMetrics(events, period), [events, period]);
  const acquisition = useMemo(() => explore(events, period, "bookings", "source"), [events, period]);
  const health = useMemo(() => dataHealth(events.filter((e) => {
    const t = new Date(e.occurred_at).getTime(); return t >= new Date(`${period.from}T00:00:00Z`).getTime() && t <= new Date(`${period.to}T23:59:59Z`).getTime();
  }), rejected), [events, period, rejected]);
  const insights = useMemo(() => smartInsights(events, period), [events, period]);
  const currentBookings = events.filter((e) => BOOKING_EVENTS.has(e.event_name) && e.occurred_at.slice(0, 10) >= period.from && e.occurred_at.slice(0, 10) <= period.to);
  const currentCompleted = events.filter((e) => COMPLETED_EVENTS.has(e.event_name) && e.occurred_at.slice(0, 10) >= period.from && e.occurred_at.slice(0, 10) <= period.to);

  return <div className="space-y-5">
    <section aria-label="Indicateurs business" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="CA réalisé" metric={m.realized_revenue} unit="eur" onClick={() => onDrill("Prestations terminées", currentCompleted)} />
      <MetricCard label="CA réservé" metric={m.booked_revenue} unit="eur" onClick={() => onDrill("Réservations", currentBookings)} />
      <MetricCard label="Réservations" metric={m.bookings} unit="count" onClick={() => onDrill("Réservations", currentBookings)} />
      <MetricCard label="Panier moyen réalisé" metric={m.avg_basket} unit="eur" />
      <MetricCard label="Prestations terminées" metric={m.completed_bookings} unit="count" />
      <MetricCard label="Nouveaux clients" metric={m.new_customers} unit="count" />
      <MetricCard label="Clients récurrents" metric={m.returning_customers} unit="count" />
      <MetricCard label="Taux de no-show" metric={m.no_show_rate} unit="percent" />
    </section>

    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Acquisition" description="Réservations attribuables par source. Le détail complet est disponible dans Data Lab." action={<Button size="sm" variant="ghost" onClick={() => onExplore("source")}>Explorer <ArrowUpRight /></Button>}>
        {acquisition.rows.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Source</th><th className="pb-2 text-right font-medium">Réservations</th></tr></thead><tbody>{acquisition.rows.sort((a, b) => (b.metric.value ?? -1) - (a.metric.value ?? -1)).map((r) => <tr key={r.key} className="border-t"><td className="py-2.5">{r.key}</td><td className="py-2.5 text-right tabular-nums">{r.metric.value ?? "—"}</td></tr>)}</tbody></table></div> : <EmptyData>Aucune réservation attribuable sur la période.</EmptyData>}
      </Panel>
      <Panel title="Conversion & annulations" description="Le taux de conversion utilise pages vues et réservations reçues.">
        <div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Conversion" metric={m.conversion_rate} unit="percent" /><MetricCard label="Annulations" metric={m.cancelled_bookings} unit="count" /><MetricCard label="No-shows" metric={m.no_show_count} unit="count" /></div>
      </Panel>
    </div>

    <div className="grid gap-5 2xl:grid-cols-2">
      <FunnelTable title="Funnel BARBER" steps={computeFunnel(events, "barber", period)} onDrill={(name) => onDrill(name, events.filter((e) => e.event_name === name))} />
      <FunnelTable title="Funnel WASH" steps={computeFunnel(events, "wash", period)} onDrill={(name) => onDrill(name, events.filter((e) => e.event_name === name))} />
    </div>

    <Panel title="Fidélisation" description="Repeat et LTV exigent une fenêtre d’observation complète ; la raison est affichée si le calcul est impossible.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><MetricCard label="Repeat 30 j" metric={m.repeat_rate_30} unit="percent" /><MetricCard label="Repeat 60 j" metric={m.repeat_rate_60} unit="percent" /><MetricCard label="Repeat 90 j" metric={m.repeat_rate_90} unit="percent" /><MetricCard label="Cross-sell" metric={m.cross_sell_rate} unit="percent" /><MetricCard label="LTV observée 30 j" metric={m.observed_ltv_30} unit="eur" /><MetricCard label="LTV observée 90 j" metric={m.observed_ltv_90} unit="eur" /><MetricCard label="LTV observée 180 j" metric={m.observed_ltv_180} unit="eur" /><MetricCard label="Clients uniques" metric={m.unique_customers} unit="count" /></div>
    </Panel>

    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Panel title="Data Health" description="Contrôles explicites sur les événements de la période et les rejets cumulés.">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Événements rejetés", health.rejected], ["Réservations sans client", health.noCustomer],
            ["Conversions sans source", health.noSource], ["Doublons potentiels", health.duplicates],
          ].map(([label, value]) => <div key={String(label)} className="rounded-md bg-muted p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
        <p className="mt-4 text-sm">Qualité d’attribution : <strong>{health.attributionRate === null ? "—" : `${health.attributionRate.toFixed(1)} %`}</strong></p>
        <p className="mt-2 text-xs text-muted-foreground">Les étapes de funnel non reçues sont listées ci-dessus comme non instrumentées.</p>
      </Panel>
      <Panel title="Smart Insights" description="Constats déterministes. Une association n’est jamais présentée comme une causalité.">
        {insights.length ? <ul className="space-y-3">{insights.map((insight, i) => <li key={`${insight.kind}-${i}`} className="flex gap-3 rounded-md border p-3"><span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded bg-accent text-primary"><Lightbulb className="size-3.5" /></span><div><p className="text-[10px] font-semibold tracking-wide text-primary">{insight.kind}</p><p className="mt-1 text-sm leading-relaxed">{insight.text}</p></div></li>)}</ul> : <EmptyData>Pas assez de données pour produire un insight fiable.</EmptyData>}
      </Panel>
    </div>
  </div>;
}
