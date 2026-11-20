import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buildCustomers, type BiEvent, type CustomerRow, type Period } from "@/lib/bi-data";
import { EmptyData, MetricCard, Panel } from "@/components/data/data-shared";

const money = (n: number | null) => n === null ? "—" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
export function DataCustomers({ events, period, onDrill }: { events: BiEvent[]; period: Period; onDrill: (title: string, records: BiEvent[]) => void }) {
  const [query, setQuery] = useState(""), [segment, setSegment] = useState("all");
  const customers = useMemo(() => buildCustomers(events, period), [events, period]);
  const filtered = customers.filter((c) => {
    if (query && !c.id.toLowerCase().includes(query.toLowerCase())) return false;
    if (segment === "barber_only") return c.capabilities.length === 1 && c.capabilities[0] === "barber";
    if (segment === "wash_only") return c.capabilities.length === 1 && c.capabilities[0] === "wash";
    if (segment === "multi") return c.capabilities.length > 1;
    if (segment === "active") return c.status !== "dormant";
    return segment === "all" || c.status === segment;
  });
  const both = customers.filter((c) => c.capabilities.length > 1).length;
  const barberWash = customers.filter((c) => c.capabilities.length > 1 && c.capabilities[0] === "barber").length;
  const washBarber = customers.filter((c) => c.capabilities.length > 1 && c.capabilities[0] === "wash").length;
  const cohorts = Object.values(customers.reduce<Record<string, { month: string; customers: number; repeat: number }>>((acc, c) => {
    const month = c.firstAt.slice(0, 7); const row = acc[month] ?? { month, customers: 0, repeat: 0 };
    row.customers++; if (c.bookings > 1) row.repeat++; acc[month] = row; return acc;
  }, {})).sort((a, b) => b.month.localeCompare(a.month));

  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Clients identifiés" metric={{ value: customers.length || null, reason: customers.length ? null : "Aucun customer_external_id reçu." }} unit="count" />
      <MetricCard label="Barber only" metric={{ value: customers.length ? customers.filter((c) => c.capabilities.length === 1 && c.capabilities[0] === "barber").length : null, reason: null }} unit="count" />
      <MetricCard label="Wash only" metric={{ value: customers.length ? customers.filter((c) => c.capabilities.length === 1 && c.capabilities[0] === "wash").length : null, reason: null }} unit="count" />
      <MetricCard label="Multi-univers" metric={{ value: customers.length ? both : null, reason: customers.length ? `${barberWash} Barber → Wash · ${washBarber} Wash → Barber` : null }} unit="count" />
    </div>
    <Panel title="Customer Intelligence" description="Identifiants externes uniquement. Dormant = aucune réservation depuis plus de 90 jours à la fin de la période.">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher un identifiant client" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Select value={segment} onValueChange={setSegment}><SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger><SelectContent>{[["all","Tous"],["new","Nouveaux"],["returning","Récurrents"],["active","Actifs"],["dormant","Dormants"],["barber_only","Barber only"],["wash_only","Wash only"],["multi","Multi-univers"]].map(([v,l]) => <SelectItem key={v} value={v!}>{l}</SelectItem>)}</SelectContent></Select></div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Client</th><th className="px-3 py-2 font-medium">Univers</th><th className="px-3 py-2 font-medium">Statut</th><th className="px-3 py-2 text-right font-medium">Résa.</th><th className="px-3 py-2 text-right font-medium">CA réservé</th><th className="px-3 py-2 text-right font-medium">No-show</th><th className="px-3 py-2 font-medium">Dernière résa.</th><th /></tr></thead><tbody>{filtered.map((c) => <CustomerLine key={c.id} c={c} events={events} onDrill={onDrill} />)}</tbody></table></div> : <EmptyData>Aucun client dans ce segment.</EmptyData>}
    </Panel>
    <Panel title="Cohortes d’acquisition" description="Cohorte = mois de première réservation. Repeat observé sans extrapolation.">
      {cohorts.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2 font-medium">Cohorte</th><th className="pb-2 text-right font-medium">Clients</th><th className="pb-2 text-right font-medium">Avec repeat observé</th></tr></thead><tbody>{cohorts.map((c) => <tr key={c.month} className="border-t"><td className="py-2.5 font-mono">{c.month}</td><td className="py-2.5 text-right">{c.customers}</td><td className="py-2.5 text-right">{c.repeat}</td></tr>)}</tbody></table></div> : <EmptyData>Cohortes indisponibles sans clients identifiés.</EmptyData>}
    </Panel>
  </div>;
}
function CustomerLine({ c, events, onDrill }: { c: CustomerRow; events: BiEvent[]; onDrill: (title: string, records: BiEvent[]) => void }) {
  return <tr className="border-t"><td className="px-3 py-3 font-mono text-xs">{c.id}</td><td className="px-3 py-3">{c.capabilities.join(" + ") || "—"}</td><td className="px-3 py-3 capitalize">{c.status}</td><td className="px-3 py-3 text-right tabular-nums">{c.bookings}</td><td className="px-3 py-3 text-right tabular-nums">{money(c.bookedRevenue)}</td><td className="px-3 py-3 text-right tabular-nums">{c.noShows}</td><td className="px-3 py-3 whitespace-nowrap">{new Date(c.lastAt).toLocaleDateString("fr-FR")}</td><td className="px-3 py-3 text-right"><Button size="sm" variant="ghost" onClick={() => onDrill(`Customer 360 · ${c.id}`, events.filter((e) => e.customer_external_id === c.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)))}>Customer 360</Button></td></tr>;
}
