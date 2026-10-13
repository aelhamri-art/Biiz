import type { Tables } from "@/integrations/supabase/types";

export type Account = Tables<"sales_accounts">;
export type Activity = Tables<"sales_activities">;
export type NextAction = Tables<"sales_next_actions">;
export type StageEvent = Tables<"sales_stage_history">;
export type CoachCard = Pick<Tables<"sales_coach_cards">, "slug" | "title" | "advice" | "next_question" | "goal" | "listen" | "position"> & { id?: string; version?: number };

export const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "contacte", label: "Contacté" },
  { id: "qualifie", label: "Qualifié" },
  { id: "r2_pris", label: "R2 pris" },
  { id: "r2_tenu", label: "R2 tenu" },
  { id: "proposition", label: "Proposition" },
  { id: "gagne", label: "Gagné" },
  { id: "perdu", label: "Perdu" },
] as const;
export type StageId = (typeof STAGES)[number]["id"];
export const stageLabel = (s: string) => STAGES.find((x) => x.id === s)?.label ?? s;

export const OUTCOMES = [
  { id: "repondu", label: "Répondu" },
  { id: "pas_repondu", label: "Pas répondu" },
  { id: "decideur_absent", label: "Décideur absent" },
  { id: "refus", label: "Refus" },
  { id: "r2", label: "R2 obtenu" },
] as const;
export type OutcomeId = (typeof OUTCOMES)[number]["id"];
export const outcomeLabel = (o: string) => OUTCOMES.find((x) => x.id === o)?.label ?? o;
/** Une conversation utile = on a parlé à quelqu'un et obtenu une issue claire. */
export const isUsefulConversation = (o: string) => o === "repondu" || o === "r2" || o === "refus";

export const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export const EVIDENCE = [
  { id: "public", label: "Public", hint: "Trouvé en ligne, non vérifié" },
  { id: "humain", label: "Humain", hint: "Vu ou entendu par quelqu'un de l'équipe" },
  { id: "confirme", label: "Confirmé", hint: "Confirmé par le prospect" },
] as const;

/** Tarifs véridiques Livroum — ne jamais promettre couverture, délais ou marges. */
export const PRICING = {
  widget: { label: "Widget", setup: 199, monthly: 149, perDelivery: 0.48, note: "Premier mois offert" },
  app: { label: "App", setup: 850, monthly: 108, perDelivery: 0.29, note: "Configuration incluse dans le setup" },
  transport: "Le coût physique du transport (livreur) est distinct et s'ajoute.",
  tagline: "Votre marque. Vos clients. Notre livraison.",
} as const;

export const STAGE_GOAL: Record<string, string> = {
  lead: "Joindre le décideur et vérifier s'il livre aujourd'hui.",
  contacte: "Qualifier : volume de livraisons, plateformes utilisées, qui décide.",
  qualifie: "Obtenir un R2 daté (15 min, sur place ou en visio).",
  r2_pris: "Confirmer le R2 la veille.",
  r2_tenu: "Envoyer une proposition claire Widget ou App.",
  proposition: "Lever la dernière objection, fixer une date de décision.",
  gagne: "Préparer le démarrage.",
  perdu: "Comprendre pourquoi, sans insister.",
};

export const DEFAULT_PLAYBOOK: CoachCard[] = [
  { slug: "ouverture", title: "Ouverture", position: 0, advice: "Présente-toi en une phrase, puis demande la permission : « Vous avez 30 secondes ? ». Phrase repère : « Votre marque. Vos clients. Notre livraison. »", next_question: "Aujourd'hui, comment vos clients commandent-ils en livraison ?", goal: "Savoir s'il livre et par quel canal.", listen: "Le nom des plateformes, le ton (pressé, curieux)." },
  { slug: "uber-eats", title: "« On est déjà sur Uber Eats »", position: 1, advice: "Ne critique pas la plateforme. Propose un canal en plus, à votre marque, où les clients restent les vôtres.", next_question: "Quelle part de vos commandes passe par la plateforme ?", goal: "Faire apparaître la dépendance et les commissions, sans chiffrer à sa place.", listen: "Une gêne sur les commissions ou l'absence de données clients." },
  { slug: "livreurs-propres", title: "« On a nos propres livreurs »", position: 2, advice: "Bonne nouvelle : tu peux garder tes livreurs. Le Widget sert surtout à prendre la commande à ta marque.", next_question: "Vos livreurs suffisent-ils aux heures de pointe ?", goal: "Repérer les pics ou les jours sans livreur.", listen: "Les soirs ou week-ends difficiles." },
  { slug: "pas-de-livraison", title: "« On ne fait pas de livraison »", position: 3, advice: "Respecte le choix. Demande si c'est un choix ou une contrainte — sans pousser.", next_question: "C'est un choix, ou ça n'a jamais été simple à mettre en place ?", goal: "Savoir s'il y a un intérêt latent.", listen: "« On y a pensé » = porte ouverte." },
  { slug: "deja-un-site", title: "« On a déjà un site »", position: 4, advice: "Parfait : le Widget s'ajoute au site existant, il ne le remplace pas.", next_question: "Vos clients peuvent-ils commander en livraison depuis ce site ?", goal: "Vérifier si la commande en ligne existe vraiment.", listen: "Site vitrine seulement, ou commande sans livraison." },
  { slug: "pas-le-patron", title: "« Je ne suis pas le patron »", position: 5, advice: "Remercie, puis demande simplement le meilleur moment pour joindre la bonne personne.", next_question: "Quel est le meilleur moment pour parler au gérant, et quel est son prénom ?", goal: "Un nom + un créneau de rappel.", listen: "Prénom, horaires, jour calme." },
  { slug: "cest-cher", title: "« C'est cher »", position: 6, advice: "Donne les vrais chiffres, sans promesse. Widget : 199 € de setup, 149 €/mois, +0,48 €/livraison, premier mois offert. App : 850 € de setup (config incluse), 108 €/mois, +0,29 €/livraison. Le transport physique est un coût distinct.", next_question: "Par rapport à quoi ça vous paraît cher ?", goal: "Comprendre la comparaison qu'il fait.", listen: "Il compare souvent aux commissions plateforme : laisse-le faire le calcul." },
  { slug: "rappelle-plus-tard", title: "« Rappelle plus tard »", position: 7, advice: "Accepte, et fixe un moment précis tout de suite. Note-le en prochaine action.", next_question: "Plutôt mardi ou jeudi, en fin de matinée ?", goal: "Une date de rappel acceptée.", listen: "Les jours de fermeture et les coups de feu." },
];

/** Cartes affichées : la version d'équipe (DB) remplace la carte de base au même slug. */
export function mergePlaybook(db: CoachCard[]): CoachCard[] {
  const bySlug = new Map(DEFAULT_PLAYBOOK.map((c) => [c.slug, c]));
  for (const c of db) bySlug.set(c.slug, c);
  return [...bySlug.values()].sort((a, b) => a.position - b.position);
}

export const normalizePhone = (p?: string | null) => {
  const d = (p ?? "").replace(/\D/g, "");
  return d.startsWith("33") && d.length === 11 ? "0" + d.slice(2) : d;
};
export const normalizeName = (n?: string | null) =>
  (n ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function findDuplicates(accounts: Pick<Account, "id" | "name" | "phone">[], name: string, phone?: string | null, ignoreId?: string) {
  const n = normalizeName(name);
  const p = normalizePhone(phone);
  return accounts.filter((a) => a.id !== ignoreId && ((n && normalizeName(a.name) === n) || (p.length >= 9 && normalizePhone(a.phone) === p)));
}

/** CSV simple : séparateur , ou ; ; première ligne = en-têtes (nom/name obligatoire). */
export function parseCsv(text: string) {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const split = (l: string) => {
    const out: string[] = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const alias: Record<string, string> = { nom: "name", name: "name", restaurant: "name", telephone: "phone", tel: "phone", phone: "phone", ville: "city", city: "city", site: "website", website: "website", segment: "segment", priorite: "priority", priority: "priority", source: "source" };
  const head = split(lines[0]).map((h) => alias[normalizeName(h)] ?? "");
  if (!head.includes("name")) return [];
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const r: Record<string, string> = {};
    head.forEach((h, i) => { if (h && cells[i]) r[h] = cells[i].slice(0, 300); });
    if (r.priority && !PRIORITIES.includes(r.priority.toUpperCase() as never)) delete r.priority;
    else if (r.priority) r.priority = r.priority.toUpperCase();
    return r as { name?: string; phone?: string; city?: string; website?: string; segment?: string; priority?: string; source?: string };
  }).filter((r) => r.name);
}

const DAY = 864e5;
export const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const startOfWeek = (d = new Date()) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);

export function periodStats(acts: Pick<Activity, "outcome" | "account_id" | "created_at" | "note">[], history: Pick<StageEvent, "to_stage" | "created_at">[], from: Date, to: Date) {
  const inP = (iso: string) => { const t = new Date(iso).getTime(); return t >= from.getTime() && t < to.getTime(); };
  const a = acts.filter((x) => inP(x.created_at));
  const h = history.filter((x) => inP(x.created_at));
  return {
    calls: a.length,
    useful: a.filter((x) => isUsefulConversation(x.outcome)).length,
    contacted: new Set(a.map((x) => x.account_id)).size,
    withNote: a.filter((x) => x.note && x.note.trim()).length,
    r2Taken: h.filter((x) => x.to_stage === "r2_pris").length,
    r2Held: h.filter((x) => x.to_stage === "r2_tenu").length,
    activeDays: new Set(a.map((x) => isoDate(new Date(x.created_at)))).size,
  };
}

/** Variation affichée seulement si la période précédente a assez de données (≥ 5). */
export function delta(cur: number, prev: number): number | null {
  if (prev < 5) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

/** Badges uniquement mesurés par les données réelles. */
export function qualityBadges(s: ReturnType<typeof periodStats>) {
  const b: { id: string; label: string; fact: string }[] = [];
  if (s.calls >= 10 && s.withNote / s.calls >= 0.8) b.push({ id: "notes", label: "Notes précises", fact: `${s.withNote} appels sur ${s.calls} avec une note` });
  if (s.activeDays >= 3) b.push({ id: "regulier", label: "Régulier", fact: `Actif ${s.activeDays} jours cette semaine` });
  if (s.r2Taken >= 1) b.push({ id: "r2", label: "R2 décroché", fact: `${s.r2Taken} R2 pris cette semaine` });
  if (s.calls >= 10 && s.useful / s.calls >= 0.4) b.push({ id: "ecoute", label: "Conversations utiles", fact: `${s.useful} conversations utiles sur ${s.calls} appels` });
  return b;
}
