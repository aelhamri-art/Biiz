export type BiEvent = {
  id: string;
  workspace_id: string;
  source_id: string;
  event_name: string;
  occurred_at: string;
  received_at: string;
  external_event_id: string;
  customer_external_id: string | null;
  booking_external_id: string | null;
  location_external_id: string | null;
  employee_external_id: string | null;
  service_external_id: string | null;
  session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  capability: "barber" | "wash" | null;
  revenue_cents: number | null;
  currency: string | null;
  metadata: Record<string, unknown>;
};

export type MetricValue = { value: number | null; reason: string | null };
export type Period = { from: string; to: string };
export type MetricId =
  | "realized_revenue" | "booked_revenue" | "bookings" | "completed_bookings"
  | "cancelled_bookings" | "no_show_count" | "no_show_rate" | "unique_customers"
  | "new_customers" | "returning_customers" | "avg_basket" | "repeat_rate_30"
  | "repeat_rate_60" | "repeat_rate_90" | "observed_ltv_30" | "observed_ltv_90"
  | "observed_ltv_180" | "cross_sell_rate" | "conversion_rate" | "cac" | "roas";

export const METRICS: { id: MetricId; label: string; unit: "count" | "eur" | "percent" | "ratio" }[] = [
  { id: "realized_revenue", label: "CA réalisé", unit: "eur" },
  { id: "booked_revenue", label: "CA réservé", unit: "eur" },
  { id: "bookings", label: "Réservations", unit: "count" },
  { id: "completed_bookings", label: "Prestations terminées", unit: "count" },
  { id: "cancelled_bookings", label: "Annulations", unit: "count" },
  { id: "no_show_count", label: "No-shows", unit: "count" },
  { id: "no_show_rate", label: "Taux de no-show", unit: "percent" },
  { id: "unique_customers", label: "Clients uniques", unit: "count" },
  { id: "new_customers", label: "Nouveaux clients", unit: "count" },
  { id: "returning_customers", label: "Clients récurrents", unit: "count" },
  { id: "avg_basket", label: "Panier moyen réalisé", unit: "eur" },
  { id: "repeat_rate_30", label: "Repeat à 30 jours", unit: "percent" },
  { id: "repeat_rate_60", label: "Repeat à 60 jours", unit: "percent" },
  { id: "repeat_rate_90", label: "Repeat à 90 jours", unit: "percent" },
  { id: "observed_ltv_30", label: "LTV observée à 30 jours", unit: "eur" },
  { id: "observed_ltv_90", label: "LTV observée à 90 jours", unit: "eur" },
  { id: "observed_ltv_180", label: "LTV observée à 180 jours", unit: "eur" },
  { id: "cross_sell_rate", label: "Cross-sell Barber ↔ Wash", unit: "percent" },
  { id: "conversion_rate", label: "Conversion visite → réservation", unit: "percent" },
  { id: "cac", label: "CAC", unit: "eur" },
  { id: "roas", label: "ROAS", unit: "ratio" },
];

export const BOOKING_EVENTS = new Set(["booking_completed", "wash_booking_completed"]);
export const COMPLETED_EVENTS = new Set(["booking_service_completed", "wash_completed"]);
export const CANCEL_EVENTS = new Set(["booking_cancelled", "wash_booking_cancelled"]);
export const NO_SHOW_EVENTS = new Set(["booking_no_show", "wash_no_show"]);
export const NO_SHOW_REVERT_EVENTS = new Set(["booking_no_show_reverted", "wash_no_show_reverted"]);
export const PAGE_EVENTS = new Set(["page_view", "barber_page_viewed", "wash_page_viewed"]);

const nil = (reason: string): MetricValue => ({ value: null, reason });
const val = (value: number, reason: string | null = null): MetricValue => ({ value, reason });
const time = (e: BiEvent) => new Date(e.occurred_at).getTime();
const dayMs = 86400000;
const endOf = (to: string) => new Date(`${to}T23:59:59.999Z`).getTime();
const startOf = (from: string) => new Date(`${from}T00:00:00.000Z`).getTime();
export const inPeriod = (e: BiEvent, p: Period) => time(e) >= startOf(p.from) && time(e) <= endOf(p.to);
export const eventCapability = (e: BiEvent): "barber" | "wash" | null => {
  if (e.capability) return e.capability;
  if (e.event_name.startsWith("wash_")) return "wash";
  if (e.event_name.startsWith("barber_")) return "barber";
  if (BOOKING_EVENTS.has(e.event_name) || PAGE_EVENTS.has(e.event_name) || e.event_name.startsWith("booking_")) return "barber";
  return null;
};
const bookingKey = (e: BiEvent) => e.booking_external_id ?? `event:${e.source_id}:${e.external_event_id}`;
function uniqueBookings(events: BiEvent[]) {
  const map = new Map<string, BiEvent>();
  for (const e of events) if (!map.has(bookingKey(e)) || time(e) < time(map.get(bookingKey(e))!)) map.set(bookingKey(e), e);
  return [...map.values()];
}

function activeNoShows(all: BiEvent[]): BiEvent[] {
  const state = new Map<string, { active: boolean; event: BiEvent }>();
  const lifecycle = all
    .filter((e) => NO_SHOW_EVENTS.has(e.event_name) || NO_SHOW_REVERT_EVENTS.has(e.event_name) || CANCEL_EVENTS.has(e.event_name))
    .sort((a, b) => time(a) - time(b));

  for (const e of lifecycle) {
    const key = bookingKey(e);
    if (NO_SHOW_EVENTS.has(e.event_name)) state.set(key, { active: true, event: e });
    else state.set(key, { active: false, event: e });
  }
  return [...state.values()].filter((row) => row.active).map((row) => row.event);
}
function revenue(events: BiEvent[], label: string): MetricValue {
  const rows = uniqueBookings(events);
  if (!rows.length) return nil(`Aucun événement ${label} reçu.`);
  const missing = rows.filter((e) => e.revenue_cents === null).length;
  if (missing) return nil(`${missing} ${missing > 1 ? "réservations n’ont" : "réservation n’a"} pas de montant : total non fiable.`);
  const currencies = new Set(rows.map((e) => e.currency ?? "EUR"));
  if (currencies.size > 1) return nil("Plusieurs devises : conversion non configurée.");
  return val(rows.reduce((sum, e) => sum + (e.revenue_cents ?? 0), 0) / 100);
}
function customerFirstBookings(all: BiEvent[]) {
  const first = new Map<string, BiEvent>();
  for (const e of uniqueBookings(all.filter((x) => BOOKING_EVENTS.has(x.event_name) && x.customer_external_id))) {
    const id = e.customer_external_id!;
    if (!first.has(id) || time(e) < time(first.get(id)!)) first.set(id, e);
  }
  return first;
}
function repeat(all: BiEvent[], p: Period, days: number): MetricValue {
  const bookings = uniqueBookings(all.filter((e) => BOOKING_EVENTS.has(e.event_name) && e.customer_external_id)).sort((a, b) => time(a) - time(b));
  const first = customerFirstBookings(all);
  const eligible = [...first.values()].filter((e) => time(e) + days * dayMs <= endOf(p.to));
  if (!eligible.length) return nil(`Aucune cohorte avec ${days} jours complets d’observation.`);
  const ids = new Set(eligible.map((e) => e.customer_external_id));
  const repeated = new Set<string>();
  for (const e of bookings) {
    const id = e.customer_external_id!;
    const f = first.get(id);
    if (ids.has(id) && f && time(e) > time(f) && time(e) <= time(f) + days * dayMs) repeated.add(id);
  }
  return val((repeated.size / eligible.length) * 100, `${eligible.length} clients avec fenêtre complète.`);
}
function ltv(all: BiEvent[], p: Period, days: number): MetricValue {
  const first = customerFirstBookings(all);
  const eligible = [...first.values()].filter((e) => time(e) + days * dayMs <= endOf(p.to));
  if (!eligible.length) return nil(`Aucune cohorte avec ${days} jours complets d’observation.`);
  const ids = new Set(eligible.map((e) => e.customer_external_id));
  const rows = uniqueBookings(all.filter((e) => {
    if (!BOOKING_EVENTS.has(e.event_name) || !e.customer_external_id || !ids.has(e.customer_external_id)) return false;
    const f = first.get(e.customer_external_id)!;
    return time(e) >= time(f) && time(e) <= time(f) + days * dayMs;
  }));
  if (rows.some((e) => e.revenue_cents === null)) return nil("Montant manquant sur au moins une réservation de la cohorte.");
  return val(rows.reduce((s, e) => s + (e.revenue_cents ?? 0), 0) / 100 / eligible.length, `${eligible.length} clients, CA réservé observé.`);
}

export function computeMetric(all: BiEvent[], p: Period, id: MetricId, spend?: number | null): MetricValue {
  const current = all.filter((e) => inPeriod(e, p));
  const bookings = uniqueBookings(current.filter((e) => BOOKING_EVENTS.has(e.event_name)));
  const completed = uniqueBookings(current.filter((e) => COMPLETED_EVENTS.has(e.event_name)));
  const noShows = activeNoShows(all).filter((e) => inPeriod(e, p));
  const cancels = uniqueBookings(current.filter((e) => CANCEL_EVENTS.has(e.event_name)));
  const identified = bookings.filter((e) => e.customer_external_id);
  const first = customerFirstBookings(all);
  switch (id) {
    case "booked_revenue": return revenue(current.filter((e) => BOOKING_EVENTS.has(e.event_name)), "de réservation");
    case "realized_revenue": return revenue(current.filter((e) => COMPLETED_EVENTS.has(e.event_name)), "de prestation terminée");
    case "bookings": return bookings.length ? val(bookings.length) : nil("Aucune réservation reçue sur la période.");
    case "completed_bookings": return completed.length ? val(completed.length) : nil("Aucun événement de prestation terminée reçu.");
    case "cancelled_bookings": return bookings.length ? val(cancels.length) : nil("Annulation non calculable sans réservations instrumentées.");
    case "no_show_count": return bookings.length ? val(noShows.length) : nil("No-show non calculable sans réservations instrumentées.");
    case "no_show_rate": return bookings.length ? val((noShows.length / bookings.length) * 100) : nil("Taux non calculable sans réservations.");
    case "unique_customers": return identified.length ? val(new Set(identified.map((e) => e.customer_external_id)).size, bookings.length > identified.length ? `${bookings.length - identified.length} réservations sans client exclues.` : null) : nil("Aucun customer_external_id sur les réservations.");
    case "new_customers": {
      if (!identified.length) return nil("Aucun client identifié.");
      const ids = identified.filter((e) => first.get(e.customer_external_id!) && bookingKey(first.get(e.customer_external_id!)!) === bookingKey(e));
      return val(new Set(ids.map((e) => e.customer_external_id)).size, bookings.length > identified.length ? "Basé sur les clients identifiés uniquement." : null);
    }
    case "returning_customers": {
      if (!identified.length) return nil("Aucun client identifié.");
      const ids = identified.filter((e) => first.get(e.customer_external_id!) && bookingKey(first.get(e.customer_external_id!)!) !== bookingKey(e));
      return val(new Set(ids.map((e) => e.customer_external_id)).size, bookings.length > identified.length ? "Basé sur les clients identifiés uniquement." : null);
    }
    case "avg_basket": {
      const r = revenue(current.filter((e) => COMPLETED_EVENTS.has(e.event_name)), "de prestation terminée");
      return r.value === null || !completed.length ? nil(r.reason ?? "Panier non calculable.") : val(r.value / completed.length);
    }
    case "repeat_rate_30": return repeat(all, p, 30);
    case "repeat_rate_60": return repeat(all, p, 60);
    case "repeat_rate_90": return repeat(all, p, 90);
    case "observed_ltv_30": return ltv(all, p, 30);
    case "observed_ltv_90": return ltv(all, p, 90);
    case "observed_ltv_180": return ltv(all, p, 180);
    case "cross_sell_rate": {
      const caps = new Map<string, Set<string>>();
      for (const e of bookings) {
        if (!e.customer_external_id || !eventCapability(e)) continue;
        const set = caps.get(e.customer_external_id) ?? new Set<string>(); set.add(eventCapability(e)!); caps.set(e.customer_external_id, set);
      }
      if (!caps.size) return nil("Aucun client identifié avec univers Barber/Wash.");
      const both = [...caps.values()].filter((s) => s.has("barber") && s.has("wash")).length;
      return val((both / caps.size) * 100, `${both} clients sur ${caps.size} ont les deux univers.`);
    }
    case "conversion_rate": {
      const views = current.filter((e) => PAGE_EVENTS.has(e.event_name));
      if (!views.length) return nil("Pages vues non instrumentées.");
      return bookings.length ? val((bookings.length / views.length) * 100, "Réservations / pages vues, non dédupliqué par session.") : val(0);
    }
    case "cac": {
      if (spend === null || spend === undefined || spend <= 0) return nil("Dépense publicitaire fiable absente.");
      const n = computeMetric(all, p, "new_customers");
      return n.value === null || n.value === 0 ? nil("CAC non calculable sans nouveaux clients identifiés.") : val(spend / n.value);
    }
    case "roas": {
      if (spend === null || spend === undefined || spend <= 0) return nil("Dépense publicitaire fiable absente.");
      const r = revenue(current.filter((e) => BOOKING_EVENTS.has(e.event_name)), "de réservation");
      return r.value === null ? nil(r.reason ?? "CA réservé absent.") : val(r.value / spend);
    }
  }
}

export function computeMetrics(all: BiEvent[], p: Period, spend?: number | null) {
  return Object.fromEntries(METRICS.map((m) => [m.id, computeMetric(all, p, m.id, spend)])) as Record<MetricId, MetricValue>;
}

export const WASH_FUNNEL = [
  "wash_page_viewed", "wash_booking_started", "wash_service_selected", "wash_vehicle_selected",
  "wash_options_selected", "wash_slot_selected", "wash_booking_completed", "wash_arrived",
  "wash_started", "wash_completed", "wash_review_requested", "wash_rebooking_completed",
] as const;
export const BARBER_FUNNEL = [
  "barber_page_viewed", "barber_booking_started", "barber_service_selected", "barber_employee_selected",
  "barber_slot_selected", "booking_completed", "booking_arrived", "booking_started",
  "booking_service_completed", "booking_review_requested", "booking_rebooking_completed",
] as const;

const OPTIONAL_FUNNEL_STEPS = new Set(["wash_vehicle_selected", "wash_options_selected"]);

export type FunnelStep = {
  event: string;
  count: number | null;
  loss: number | null;
  reason: string | null;
  optional?: boolean;
};

function funnelIdentity(e: BiEvent): string {
  if (e.session_id) return `session:${e.session_id}`;
  if (e.booking_external_id) return `booking:${e.booking_external_id}`;
  if (e.customer_external_id) return `customer:${e.customer_external_id}`;
  return `event:${e.id}`;
}

export function computeFunnel(events: BiEvent[], capability: "barber" | "wash", p?: Period): FunnelStep[] {
  const steps = capability === "wash" ? WASH_FUNNEL : BARBER_FUNNEL;
  const current = p ? events.filter((e) => inPeriod(e, p)) : events;
  let previousRequiredCount: number | null = null;

  return steps.map((event) => {
    const instrumented = events.some((e) => e.event_name === event);
    const optional = OPTIONAL_FUNNEL_STEPS.has(event);
    if (!instrumented) {
      return {
        event,
        count: null,
        loss: null,
        reason: optional ? "Étape optionnelle non instrumentée." : "Étape non instrumentée.",
        optional,
      };
    }

    const count = new Set(current.filter((e) => e.event_name === event).map(funnelIdentity)).size;
    let loss: number | null = null;
    let reason: string | null = null;

    if (!optional && previousRequiredCount !== null) {
      if (count <= previousRequiredCount) loss = previousRequiredCount - count;
      else reason = "Étape aval supérieure à l’amont : vérifier la fenêtre ou l’instrumentation.";
    }
    if (!optional) previousRequiredCount = count;

    return { event, count, loss, reason, optional };
  });
}

export type CustomerRow = {
  id: string; firstAt: string; lastAt: string; bookings: number; bookedRevenue: number | null;
  realizedRevenue: number | null; capabilities: ("barber" | "wash")[]; noShows: number; cancellations: number;
  source: string | null; status: "new" | "returning" | "active" | "dormant";
};
export function buildCustomers(all: BiEvent[], p: Period): CustomerRow[] {
  const bookings = uniqueBookings(all.filter((e) => BOOKING_EVENTS.has(e.event_name) && e.customer_external_id));
  const byId = new Map<string, BiEvent[]>();
  for (const e of bookings) { const id = e.customer_external_id!; byId.set(id, [...(byId.get(id) ?? []), e]); }
  const now = endOf(p.to);
  return [...byId.entries()].map(([id, rows]) => {
    rows.sort((a, b) => time(a) - time(b));
    const own = all.filter((e) => e.customer_external_id === id);
    const completeRevenue = revenue(own.filter((e) => COMPLETED_EVENTS.has(e.event_name)), "terminée");
    const bookedRevenue = revenue(rows, "réservée");
    const capabilities = [...new Set(rows.map(eventCapability).filter((x): x is "barber" | "wash" => !!x))];
    const firstAt = rows[0]!.occurred_at, lastAt = rows.at(-1)!.occurred_at;
    const status: CustomerRow["status"] = now - time(rows.at(-1)!) > 90 * dayMs ? "dormant" : rows.length === 1 ? "new" : "returning";
    return {
      id, firstAt, lastAt, bookings: rows.length, bookedRevenue: bookedRevenue.value, realizedRevenue: completeRevenue.value,
      capabilities, noShows: activeNoShows(own).length,
      cancellations: own.filter((e) => CANCEL_EVENTS.has(e.event_name)).length,
      source: rows.find((e) => e.utm_source)?.utm_source ?? null,
      status,
    };
  }).sort((a, b) => time({ occurred_at: b.lastAt } as BiEvent) - time({ occurred_at: a.lastAt } as BiEvent));
}

export type Dimension = "day" | "week" | "month" | "location" | "employee" | "service" | "source" | "campaign" | "content" | "customer" | "new_returning" | "capability";
export const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: "day", label: "Jour" }, { id: "week", label: "Semaine" }, { id: "month", label: "Mois" },
  { id: "location", label: "Lieu" }, { id: "employee", label: "Employé" }, { id: "service", label: "Prestation" },
  { id: "source", label: "Source" }, { id: "campaign", label: "Campagne" }, { id: "content", label: "Contenu" },
  { id: "customer", label: "Client" }, { id: "new_returning", label: "Nouveau / récurrent" }, { id: "capability", label: "Univers" },
];
export function dimensionKey(e: BiEvent, d: Dimension, all: BiEvent[]): string {
  const date = new Date(e.occurred_at);
  switch (d) {
    case "day": return e.occurred_at.slice(0, 10);
    case "week": { const monday = new Date(date); const shift = (date.getUTCDay() + 6) % 7; monday.setUTCDate(date.getUTCDate() - shift); return monday.toISOString().slice(0, 10); }
    case "month": return e.occurred_at.slice(0, 7);
    case "location": return e.location_external_id ?? "Non renseigné";
    case "employee": return e.employee_external_id ?? "Non renseigné";
    case "service": return e.service_external_id ?? "Non renseigné";
    case "source": return e.utm_source ?? "Sans source";
    case "campaign": return e.utm_campaign ?? "Sans campagne";
    case "content": return e.utm_content ?? "Sans contenu";
    case "customer": return e.customer_external_id ?? "Client non identifié";
    case "capability": return eventCapability(e) ?? "Non attribué";
    case "new_returning": { const f = e.customer_external_id ? customerFirstBookings(all).get(e.customer_external_id) : undefined; return !f ? "Non identifié" : bookingKey(f) === bookingKey(e) ? "Nouveau" : "Récurrent"; }
  }
}
export function explore(all: BiEvent[], p: Period, metric: MetricId, dimension: Dimension, filters: { source?: string | undefined; campaign?: string | undefined; capability?: string | undefined } = {}, spend?: number | null) {
  const filtered = all.filter((e) => (!filters.source || e.utm_source === filters.source) && (!filters.campaign || e.utm_campaign === filters.campaign) && (!filters.capability || eventCapability(e) === filters.capability));
  const current = filtered.filter((e) => inPeriod(e, p));
  const groups = new Map<string, BiEvent[]>();
  for (const e of current) { const key = dimensionKey(e, dimension, filtered); groups.set(key, [...(groups.get(key) ?? []), e]); }
  const rows = [...groups.entries()].map(([key, records]) => ({ key, records, metric: computeMetric(filtered.filter((e) => records.some((r) => r.id === e.id)), p, metric, spend) }));
  const length = endOf(p.to) - startOf(p.from) + 1;
  const previous = { from: new Date(startOf(p.from) - length).toISOString().slice(0, 10), to: new Date(startOf(p.from) - 1).toISOString().slice(0, 10) };
  return { filtered, current, rows, total: computeMetric(filtered, p, metric, spend), previous: computeMetric(filtered, previous, metric, spend), previousPeriod: previous };
}

export function dataHealth(events: BiEvent[], rejected: number) {
  const bookings = uniqueBookings(events.filter((e) => BOOKING_EVENTS.has(e.event_name)));
  const noCustomer = bookings.filter((e) => !e.customer_external_id).length;
  const noSource = bookings.filter((e) => !e.utm_source).length;
  const seen = new Map<string, number>();
  for (const e of events.filter((x) => BOOKING_EVENTS.has(x.event_name) && x.booking_external_id)) seen.set(e.booking_external_id!, (seen.get(e.booking_external_id!) ?? 0) + 1);
  const duplicates = [...seen.values()].filter((n) => n > 1).reduce((s, n) => s + n - 1, 0);
  return { rejected, noCustomer, noSource, duplicates, attributionRate: bookings.length ? ((bookings.length - noSource) / bookings.length) * 100 : null };
}

export type Insight = { kind: "FAIT" | "ASSOCIATION" | "HYPOTHÈSE" | "ACTION"; text: string };
export function smartInsights(events: BiEvent[], p: Period): Insight[] {
  const m = computeMetrics(events, p);
  const out: Insight[] = [];
  if (m.bookings.value !== null) out.push({ kind: "FAIT", text: `${m.bookings.value} réservations uniques ont été reçues sur la période.` });
  if (m.no_show_rate.value !== null && (m.bookings.value ?? 0) >= 10) {
    out.push({ kind: "FAIT", text: `Le taux de no-show observé est de ${m.no_show_rate.value.toFixed(1)} %.` });
    if (m.no_show_rate.value > 10) out.push({ kind: "HYPOTHÈSE", text: "Un rappel avant rendez-vous pourrait réduire les absences ; causalité à tester." }, { kind: "ACTION", text: "Comparer les no-shows avec et sans rappel sur une prochaine période." });
  }
  const health = dataHealth(events, 0);
  if (health.noSource > 0) out.push({ kind: "ACTION", text: `Renseigner la source sur ${health.noSource} réservations pour fiabiliser l’acquisition.` });
  const bySource = new Map<string, number>();
  for (const e of uniqueBookings(events.filter((x) => inPeriod(x, p) && BOOKING_EVENTS.has(x.event_name)))) if (e.utm_source) bySource.set(e.utm_source, (bySource.get(e.utm_source) ?? 0) + 1);
  const eligible = [...bySource.entries()].filter(([, n]) => n >= 5).sort((a, b) => b[1] - a[1]);
  if (eligible.length >= 2) out.push({ kind: "ASSOCIATION", text: `${eligible[0]![0]} compte le plus de réservations parmi les sources avec au moins 5 réservations. Cela ne démontre pas un effet causal.` });
  return out;
}

export function formatMetric(v: MetricValue, unit: "count" | "eur" | "percent" | "ratio") {
  if (v.value === null) return "—";
  if (unit === "eur") return v.value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
  if (unit === "percent") return `${v.value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
  if (unit === "ratio") return `${v.value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}×`;
  return v.value.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}
