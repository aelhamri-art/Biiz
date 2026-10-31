/** HADAL M01 — fidèle au classeur HADAL_Calendrier_Contenu_Mois_01.xlsx (onglets Stories, Tournages, BIIZ). */
import { buildAttribution, CONVERSION_EVENTS, eventRevenue } from "./marketing";

export const M01_IDS = ["S1-C", "S1-V", "S1-L", "S2-C", "S2-V", "S2-L", "S3-C", "S3-V", "S3-L", "S4-C", "S4-V", "S4-L"] as const;

export const STORY_RULES = [
  "Ajuster le cycle aux services réellement ouverts. Un jour fermé, informer plutôt que pousser une disponibilité inexistante.",
  "À chaque service : filmer quelques plans courts du produit, de la préparation et du comptoir ; ils alimentent plusieurs stories.",
  "Un lien balisé par écran de conversion. Une seule action demandée sur cet écran.",
  "Ne pas générer de faux avis, de fausses commandes, de fausses réactions client ni de faux témoignages.",
];

export const SHOOT_NOTES = [
  "Regrouper les plans pendant un service normal, puis tourner le Smash lors de sa vraie préparation.",
  "L’IA peut aider au sous-titrage et au montage. Les gestes, le produit et les preuves restent réels.",
];

export const MEASURE_RULES = [
  "Vide = donnée absente. Zéro = résultat nul effectivement observé.",
  "Attribution V1 : dernier lien Instagram organique identifié, dans la même session que la commande.",
  "Une commande ne compte qu’une fois. Exclure tests et annulations ; déduire les remboursements du CA TTC.",
  "Un retour sans source conservée reste non attribué. Ne pas créditer le dernier post de tous les achats via la bio.",
  "Vérifier la liaison content_id, session, order_id et paiement avant de déclarer un CA attribué.",
  "Nouveaux / revenants : seulement si l’identification client le permet.",
  "Commandes HADAL et commandes attribuées au contenu sont deux mesures distinctes.",
];

export const ARBITRAGE_RULES = [
  ["Commercial", "Comparer les mêmes 72 premières heures. Examiner commandes et CA attribués, puis conversion et disponibilité."],
  ["Lifestyle", "Comparer les premières 24 heures. Regarder partages et commentaires rapportés à la portée."],
  ["Peu de ventes attribuées", "Conserver un test ouvert. Les clics sont un signal provisoire, pas une preuve de ventes."],
  ["Choix", "Choisir produit, promesse, moment et segment à reprendre. Ne pas proclamer best-seller sans preuve."],
  ["Fin de mois", "Distinguer ce qui vend, ce qui engage, et ce qui fait les deux ; ajuster M02."],
] as const;

export const UTM_RULE = "utm_source=instagram · utm_medium=organic_social · utm_content=<id>__story_relais (ex. s1_c__story_relais). Chaque story quotidienne aura ensuite son identifiant distinct (ex. m01_s1_j1_conversion_01).";

export type ShotLine = { time: string; shot: string };
export function parseShots(v: unknown): ShotLine[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => (s && typeof s === "object" && typeof (s as ShotLine).shot === "string" ? [{ time: String((s as ShotLine).time ?? ""), shot: (s as ShotLine).shot }] : []));
}

export type M01Row = {
  reach: number | null; shares: number | null; clicks: number | null; sessions: number | null;
  orders: number | null; revenue: number | null; ordersPerSession: number | null; newCustomers: number | null; returningCustomers: number | null;
};

type Ev = { link_id: string | null; session_id: string | null; name: string; props: unknown; created_at?: string };
const P = (props: unknown) => (props && typeof props === "object" ? (props as Record<string, unknown>) : {});
const truthy = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";
const CANCELLED = ["cancelled", "canceled", "annulee", "annulée", "refused", "failed"];
export const orderId = (props: unknown) => { const v = P(props)["order_id"]; return typeof v === "string" || typeof v === "number" ? String(v) : null; };
export function customerKind(props: unknown): "new" | "returning" | null {
  const p = P(props);
  const t = typeof p["customer_type"] === "string" ? (p["customer_type"] as string).toLowerCase() : null;
  if (t === "new" || t === "nouveau") return "new";
  if (t === "returning" || t === "revenant") return "returning";
  if (typeof p["new_customer"] === "boolean") return p["new_customer"] ? "new" : "returning";
  return null;
}
const refund = (props: unknown) => { const v = Number(P(props)["refund"] ?? P(props)["refunded_amount"] ?? 0); return Number.isFinite(v) && v > 0 ? v : 0; };

/**
 * Mesure M01 par contenu parent. null = donnée absente (affiché « — »), 0 = résultat nul observé.
 * flags : la donnée n'est comptable que si le site HADAL l'envoie réellement (sessions, order_id, type de client).
 */
export function m01Measure(input: {
  contents: { id: string; campaign_id?: string | null; link_id?: string | null }[];
  links: { id: string; campaign_id?: string | null }[];
  dists: { id: string; content_id: string; campaign_id?: string | null; link_id?: string | null; channel: string; reach?: number | null; shares?: number | null }[];
  clicks: { link_id: string }[];
  events: Ev[];
  flags: { sessionsTracked: boolean; ordersTracked: boolean; customersTracked: boolean };
}): Map<string, M01Row> {
  const attr = buildAttribution(input.links, input.contents, input.dists);
  const linkContent = new Map<string, string>();
  for (const [lid, a] of attr) if (a.content_id) linkContent.set(lid, a.content_id);

  // Sessions vues par lien (hors conversions) pour vérifier la « même session ».
  const sessionLinks = new Set<string>();
  for (const e of input.events) if (e.session_id && e.link_id && !(CONVERSION_EVENTS as readonly string[]).includes(e.name)) sessionLinks.add(`${e.session_id}|${e.link_id}`);

  // Commandes valides, une seule fois par order_id.
  const seen = new Set<string>();
  const orders: { content: string; revenue: number; kind: "new" | "returning" | null }[] = [];
  const sorted = [...input.events].sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  for (const e of sorted) {
    if (!(CONVERSION_EVENTS as readonly string[]).includes(e.name) || !e.link_id || !e.session_id) continue;
    const oid = orderId(e.props); const p = P(e.props);
    if (!oid || seen.has(oid)) continue;
    if (truthy(p["test"]) || CANCELLED.includes(String(p["status"] ?? "").toLowerCase())) { seen.add(oid); continue; }
    const content = linkContent.get(e.link_id);
    if (!content || !sessionLinks.has(`${e.session_id}|${e.link_id}`)) continue;
    seen.add(oid);
    orders.push({ content, revenue: Math.max(0, eventRevenue(e.props) - refund(e.props)), kind: customerKind(e.props) });
  }

  const out = new Map<string, M01Row>();
  for (const c of input.contents) {
    const lids = new Set([...linkContent].filter(([, cid]) => cid === c.id).map(([l]) => l));
    const ds = input.dists.filter((d) => d.content_id === c.id);
    const sum = (k: "reach" | "shares") => { const v = ds.map((d) => d[k]).filter((x): x is number => typeof x === "number"); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
    const clicks = lids.size ? input.clicks.filter((k) => lids.has(k.link_id)).length : null;
    const sessions = input.flags.sessionsTracked && lids.size
      ? new Set(input.events.filter((e) => e.session_id && e.link_id && lids.has(e.link_id)).map((e) => e.session_id)).size : null;
    const mine = orders.filter((o) => o.content === c.id);
    const nOrders = input.flags.ordersTracked && lids.size ? mine.length : null;
    const revenue = nOrders === null ? null : mine.reduce((a, o) => a + o.revenue, 0);
    const cust = input.flags.customersTracked && nOrders !== null;
    out.set(c.id, {
      reach: sum("reach"), shares: sum("shares"), clicks, sessions, orders: nOrders, revenue,
      ordersPerSession: nOrders !== null && sessions ? nOrders / sessions : null,
      newCustomers: cust ? mine.filter((o) => o.kind === "new").length : null,
      returningCustomers: cust ? mine.filter((o) => o.kind === "returning").length : null,
    });
  }
  return out;
}
