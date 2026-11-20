import { X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatMetric, type BiEvent, type FunnelStep, type MetricValue } from "@/lib/bi-data";

export function Panel({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section className="min-w-0 rounded-lg border bg-card p-5 shadow-surface">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{title}</h2>{description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>
    {children}
  </section>;
}

export function MetricCard({ label, metric, unit, onClick }: { label: string; metric: MetricValue; unit: "count" | "eur" | "percent" | "ratio"; onClick?: () => void }) {
  const content = <><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight">{formatMetric(metric, unit)}</p>{metric.reason && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{metric.reason}</p>}</>;
  return onClick ? <button type="button" onClick={onClick} className="min-h-28 rounded-lg border bg-card p-4 text-left shadow-surface transition-colors hover:border-primary/40">{content}</button> : <div className="min-h-28 rounded-lg border bg-card p-4 shadow-surface">{content}</div>;
}

export function EmptyData({ children = "Aucune donnée reçue sur cette période." }: { children?: React.ReactNode }) {
  return <div className="rounded-md border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function FunnelTable({ title, steps, onDrill }: { title: string; steps: FunnelStep[]; onDrill: (event: string) => void }) {
  return <Panel title={title} description="Sessions ou réservations uniques. Une étape absente reste non instrumentée, jamais zéro.">
    <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead className="text-left text-[11px] uppercase text-muted-foreground"><tr><th className="pb-2 font-medium">Étape</th><th className="pb-2 text-right font-medium">Reçus</th><th className="pb-2 text-right font-medium">Perte</th></tr></thead><tbody>
      {steps.map((s) => <tr key={s.event} className="border-t"><td className="py-2.5"><button type="button" disabled={s.count === null || s.count === 0} onClick={() => onDrill(s.event)} className="font-mono text-xs enabled:hover:text-primary disabled:cursor-default">{s.event}</button>{s.count === null && <span className="ml-2 text-[10px] text-muted-foreground">non instrumentée</span>}{s.optional && <span className="ml-2 text-[10px] text-muted-foreground">optionnelle</span>}</td><td className="py-2.5 text-right tabular-nums">{s.count ?? "—"}</td><td className="py-2.5 text-right tabular-nums text-muted-foreground">{s.loss ?? "—"}</td></tr>)}
    </tbody></table></div>
  </Panel>;
}

export function DrillDialog({ title, records, onClose }: { title: string; records: BiEvent[] | null; onClose: () => void }) {
  return <Dialog open={!!records} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{records?.length ?? 0} événements sous-jacents, identifiants externes uniquement.</DialogDescription></DialogHeader>
    <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-xs"><thead className="bg-muted text-left text-muted-foreground"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Événement</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">Réservation</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Montant</th></tr></thead><tbody>
      {records?.map((e) => <tr key={e.id} className="border-t"><td className="px-3 py-2 whitespace-nowrap">{new Date(e.occurred_at).toLocaleString("fr-FR")}</td><td className="px-3 py-2 font-mono">{e.event_name}</td><td className="px-3 py-2 font-mono">{e.customer_external_id ?? "—"}</td><td className="px-3 py-2 font-mono">{e.booking_external_id ?? "—"}</td><td className="px-3 py-2">{e.utm_source ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums">{e.revenue_cents === null ? "—" : `${(e.revenue_cents / 100).toLocaleString("fr-FR")} ${e.currency ?? "EUR"}`}</td></tr>)}
    </tbody></table></div>
    <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" aria-label="Fermer"><X className="size-4" /></button>
  </DialogContent></Dialog>;
}
