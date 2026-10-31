/** BIIZ Marketing V1.1 — règles pures : métriques Ads, attribution du CA, import CSV, cadence. */

export const CHANNELS = [
  { id: "instagram", label: "Instagram", mode: "organic" },
  { id: "story", label: "Story", mode: "organic" },
  { id: "facebook", label: "Facebook", mode: "organic" },
  { id: "tiktok", label: "TikTok", mode: "organic" },
  { id: "meta_ads", label: "Meta Ads", mode: "paid" },
  { id: "google_ads", label: "Google Ads", mode: "paid" },
  { id: "offline", label: "Offline", mode: "offline" },
  { id: "email", label: "Email", mode: "organic" },
  { id: "autre", label: "Autre", mode: "organic" },
] as const;
export type ChannelId = (typeof CHANNELS)[number]["id"];
export const channelLabel = (c: string) => CHANNELS.find((x) => x.id === c)?.label ?? c;
export const channelMode = (c: string) => CHANNELS.find((x) => x.id === c)?.mode ?? "organic";

export const FORMATS = [["statique", "Statique"], ["carrousel", "Carrousel"], ["video", "Vidéo"], ["reel", "Reel"], ["story", "Story"], ["affiche", "Affiche / flyer"]] as const;
export const NATURES = [["commercial", "Commercial"], ["lifestyle", "Lifestyle / engageant"], ["marque", "Marque"], ["evenement", "Événement"]] as const;
export const CAMPAIGN_STATUSES = [["brouillon", "Brouillon"], ["active", "Active"], ["pause", "En pause"], ["terminee", "Terminée"]] as const;
export const labelOf = (list: readonly (readonly [string, string])[], k?: string | null) => (k ? list.find(([x]) => x === k)?.[1] ?? k : "");

export const CONVERSION_EVENTS = ["purchase", "booking_completed"] as const;

/** Montant d'un événement de conversion : props.revenue, sinon value, sinon amount. */
export function eventRevenue(props: unknown): number {
  if (!props || typeof props !== "object") return 0;
  const p = props as Record<string, unknown>;
  for (const k of ["revenue", "value", "amount"]) {
    const n = typeof p[k] === "number" ? (p[k] as number) : typeof p[k] === "string" ? Number(String(p[k]).replace(",", ".")) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

const div = (a: number, b: number) => (b > 0 ? a / b : null);
/** CTR en %, CPC/CPA en €, ROAS en multiple. null si le dénominateur est nul. */
export function adMetrics(a: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number }) {
  const ctr = div(a.clicks, a.impressions);
  return { ctr: ctr === null ? null : ctr * 100, cpc: div(a.spend, a.clicks), cpa: div(a.spend, a.conversions), roas: div(a.revenue, a.spend) };
}

type LinkRef = { id: string; campaign_id?: string | null };
type ContentRef = { id: string; campaign_id?: string | null; link_id?: string | null };
type DistRef = { id: string; content_id: string; campaign_id?: string | null; link_id?: string | null; channel: string };
export type Attribution = { campaign_id: string | null; content_id: string | null; channel: string | null };

/** Lien → diffusion (prioritaire) → contenu → campagne ; à défaut contenu.link_id puis link.campaign_id. */
export function buildAttribution(links: LinkRef[], contents: ContentRef[], dists: DistRef[]) {
  const byContent = new Map(contents.map((c) => [c.id, c]));
  const map = new Map<string, Attribution>();
  for (const l of links) map.set(l.id, { campaign_id: l.campaign_id ?? null, content_id: null, channel: null });
  for (const c of contents) if (c.link_id) map.set(c.link_id, { campaign_id: c.campaign_id ?? map.get(c.link_id)?.campaign_id ?? null, content_id: c.id, channel: null });
  for (const d of dists) if (d.link_id) {
    const c = byContent.get(d.content_id);
    map.set(d.link_id, { campaign_id: d.campaign_id ?? c?.campaign_id ?? map.get(d.link_id)?.campaign_id ?? null, content_id: d.content_id, channel: d.channel });
  }
  return map;
}

export type Row = { spend: number; revenue: number; conversions: number; clicks: number; impressions: number; reach: number; engagement: number };
const empty = (): Row => ({ spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, engagement: 0 });

/** Agrège CA, conversions, clics et dépenses par campagne, contenu et canal. */
export function aggregate(input: {
  links: LinkRef[]; contents: ContentRef[]; dists: (DistRef & { reach?: number | null; impressions?: number | null; likes?: number | null; comments?: number | null; shares?: number | null; saves?: number | null; clicks?: number | null })[];
  clicks: { link_id: string }[];
  events: { link_id: string | null; name: string; props: unknown }[];
  ads: { campaign_id: string | null; content_id: string | null; distribution_id?: string | null; platform: string; spend: number; impressions: number; reach: number; clicks: number; conversions: number; revenue: number }[];
}) {
  const attr = buildAttribution(input.links, input.contents, input.dists);
  const byCampaign = new Map<string, Row>(), byContent = new Map<string, Row>(), byChannel = new Map<string, Row>();
  const bump = (m: Map<string, Row>, k: string | null | undefined, f: (r: Row) => void) => { if (!k) return; const r = m.get(k) ?? empty(); f(r); m.set(k, r); };
  const contentCampaign = new Map(input.contents.map((c) => [c.id, c.campaign_id ?? null]));
  const all = (a: Attribution | undefined, f: (r: Row) => void) => {
    if (!a) return;
    bump(byCampaign, a.campaign_id, f); bump(byContent, a.content_id, f); bump(byChannel, a.channel ?? (a.campaign_id || a.content_id ? "lien_biiz" : null), f);
  };
  for (const c of input.clicks) all(attr.get(c.link_id), (r) => { r.clicks += 1; });
  for (const e of input.events) {
    if (!e.link_id || !(CONVERSION_EVENTS as readonly string[]).includes(e.name)) continue;
    const v = eventRevenue(e.props);
    all(attr.get(e.link_id), (r) => { r.conversions += 1; r.revenue += v; });
  }
  for (const d of input.dists) {
    if (d.channel === "meta_ads" || d.channel === "google_ads") continue;
    const a: Attribution = { campaign_id: d.campaign_id ?? contentCampaign.get(d.content_id) ?? null, content_id: d.content_id, channel: d.channel };
    all(a, (r) => { r.reach += d.reach ?? 0; r.impressions += d.impressions ?? 0; r.engagement += (d.likes ?? 0) + (d.comments ?? 0) + (d.shares ?? 0) + (d.saves ?? 0); });
  }
  const distById = new Map(input.dists.map((d) => [d.id, d]));
  for (const ad of input.ads) {
    const d = ad.distribution_id ? distById.get(ad.distribution_id) : undefined;
    const content = ad.content_id ?? d?.content_id ?? null;
    const a: Attribution = { campaign_id: ad.campaign_id ?? (content ? contentCampaign.get(content) ?? null : null), content_id: content, channel: ad.platform === "google" ? "google_ads" : "meta_ads" };
    all(a, (r) => { r.spend += ad.spend; r.impressions += ad.impressions; r.reach += ad.reach; r.clicks += ad.clicks; r.conversions += ad.conversions; r.revenue += ad.revenue; });
  }
  return { byCampaign, byContent, byChannel };
}

/** Cadence proposée pour HADAL M01 — modèle modifiable, enregistré par espace. */
export type CadenceItem = { label: string; count: number; period: "jour" | "semaine" | "mois" };
export const HADAL_M01_CADENCE: CadenceItem[] = [
  { label: "Statique commercial", count: 1, period: "semaine" },
  { label: "Statique lifestyle / engageant", count: 1, period: "semaine" },
  { label: "Vidéo simple", count: 1, period: "semaine" },
  { label: "Stories", count: 3, period: "jour" },
];
export function parseCadence(v: unknown): CadenceItem[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is CadenceItem => !!x && typeof x.label === "string" && Number.isFinite(x.count) && ["jour", "semaine", "mois"].includes(x.period)).slice(0, 12);
}

/** CSV calendrier : semaine, format, concept, intention business, cible, légende, asset/visuel, statut. */
export function splitCsvLine(l: string, sep: string) {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i]!;
    if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === sep && !q) { out.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  out.push(cur.trim());
  return out;
}
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
const HEAD: Record<string, string> = {
  semaine: "week", week: "week", format: "format", concept: "title", titre: "title",
  intentionbusiness: "objective", intention: "objective", objectif: "objective", cible: "target",
  legende: "caption", caption: "caption", copy: "caption", asset: "asset", visuel: "asset", assetvisuel: "asset",
  statut: "status", status: "status", date: "date",
};
const STATUS_MAP: Record<string, string> = { idee: "idee", aproduire: "idee", encours: "en_cours", production: "en_cours", avalider: "a_valider", valide: "valide", pret: "valide", publie: "publie", enligne: "publie" };
const FORMAT_MAP: Record<string, string> = { statique: "statique", post: "statique", carrousel: "carrousel", video: "video", reel: "reel", story: "story", stories: "story", affiche: "affiche", flyer: "affiche" };

export type CalendarRow = { week: string | null; format: string | null; title: string; objective: string | null; target: string | null; caption: string | null; asset: string | null; status: string; date: string | null };
export function parseCalendarCsv(text: string): CalendarRow[] {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
  const first = lines[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : (first.includes("\t") ? "\t" : ",");
  const head = splitCsvLine(first, sep).map((h) => HEAD[norm(h)] ?? "");
  if (!head.includes("title")) return [];
  return lines.slice(1).map((l) => {
    const c = splitCsvLine(l, sep); const r: Record<string, string> = {};
    head.forEach((h, i) => { const v = c[i]; if (h && v) r[h] = v.slice(0, 2000); });
    const date = r["date"] && /^\d{4}-\d{2}-\d{2}$/.test(r["date"]) ? r["date"] : null;
    return {
      week: r["week"] ?? null, format: r["format"] ? FORMAT_MAP[norm(r["format"])] ?? r["format"].toLowerCase() : null,
      title: (r["title"] ?? "").slice(0, 200), objective: r["objective"] ?? null, target: r["target"] ?? null,
      caption: r["caption"] ?? null, asset: r["asset"] ?? null,
      status: (r["status"] && STATUS_MAP[norm(r["status"])]) || "idee", date,
    };
  }).filter((r) => r.title);
}

export const eur = (n: number | null | undefined) => n === null || n === undefined ? "—" : n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
export const ratio = (n: number | null) => (n === null ? "—" : `${n.toFixed(2).replace(".", ",")}×`);
export const pct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2).replace(".", ",")} %`);
