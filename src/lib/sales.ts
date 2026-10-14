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
  tagline: "Votre marque. Vos clients. Votre livraison.",
} as const;

export const STAGE_GOAL: Record<string, string> = {
  lead: "Joindre le décideur et vérifier s'il livre aujourd'hui.",
  contacte: "Qualifier : volume de livraisons, plateformes utilisées, qui décide.",
  qualifie: "Obtenir un R2 daté (10 min, sur place ou en visio).",
  r2_pris: "Confirmer le R2 la veille.",
  r2_tenu: "Envoyer une proposition claire Widget ou App.",
  proposition: "Lever la dernière objection, fixer une date de décision.",
  gagne: "Préparer le démarrage.",
  perdu: "Comprendre pourquoi, sans insister.",
};

/** Playbook Livroum validé (14 octobre 2026). L'édition d'équipe en base reste prioritaire. */
export const DEFAULT_PLAYBOOK: CoachCard[] = [
  { slug: "ouverture", title: "Premières secondes", position: 0, advice: "« Bonjour, c'est Kevin, responsable commercial chez Livroum. Vous allez bien ? Nous lançons un service de livraison sur La Teste et le Bassin Sud. » Posé, naturel. Mentionne les « 25 restaurants choisis » UNIQUEMENT si cette sélection est effectivement vérifiée pour celui-ci.", next_question: "Aujourd'hui, vos clients commandent comment quand ils veulent se faire livrer ?", goal: "Se situer, comprendre le fonctionnement et, si intérêt, proposer 10 minutes de découverte.", listen: "Disponibilité, canaux réels, premières réponses." },
  { slug: "uber-eats", title: "« On a déjà Uber Eats »", position: 1, advice: "Ne critique pas Uber Eats. Un canal de commande directe peut venir en complément, pas forcément en remplacement. Ne promets jamais de supprimer une dépendance.", next_question: "Très bien. Et vous avez aussi des clients qui commandent directement chez vous, sans passer par la plateforme ?", goal: "Explorer un éventuel canal direct complémentaire.", listen: "Existence de commandes directes, besoins réellement exprimés." },
  { slug: "livreurs-propres", title: "« On a nos propres livreurs »", position: 2, advice: "« C'est une vraie force. » Respecte le fonctionnement actuel. Un complément n'est pertinent que si un besoin existe.", next_question: "Est-ce que vous arrivez à couvrir toutes les périodes chargées ?", goal: "Vérifier si un renfort apporterait quelque chose.", listen: "Pics de demande, créneaux sans livreur." },
  { slug: "pas-de-livraison", title: "« On ne livre pas »", position: 3, advice: "Ne présume pas que tout restaurant devrait livrer. Respecte les choix de gestion.", next_question: "Je comprends. C'est un choix ou ça n'a simplement jamais été intéressant à organiser ?", goal: "Distinguer un choix volontaire d'une contrainte.", listen: "Choix ferme, organisation ou intérêt exprimé." },
  { slug: "deja-un-site", title: "« On a déjà un site »", position: 4, advice: "Ne propose pas une App quand un Widget peut suffire. Distingue site vitrine et véritable canal de commande.", next_question: "Parfait. Est-ce qu'il permet aussi de recevoir des commandes directement ?", goal: "Comprendre ce que le site permet réellement.", listen: "Commande, paiement et livraison possibles ou non." },
  { slug: "pas-le-patron", title: "« Le patron n'est pas là »", position: 5, advice: "Ne présente pas toute l'offre à un employé. Si le nom est vérifié : « Bonjour, je voudrais parler à M. [nom], il est là ? ». Sinon, demande qui s'occupe des commandes et livraisons.", next_question: "Pour ne pas le déranger pendant le service, je peux le rappeler à quelle heure plutôt ?", goal: "Identifier le décideur et un créneau crédible.", listen: "Prénom, fonction, créneau transmis par l'employé." },
  { slug: "cest-cher", title: "« C'est cher »", position: 6, advice: "Comprends la comparaison avant d'argumenter. Les commissions Livroum sont distinctes du prix physique du transport. Ne garantis aucune économie.", next_question: "Vous comparez ça à votre fonctionnement actuel, à une plateforme ou à une autre solution ?", goal: "Comprendre la vraie référence de prix.", listen: "Référence de comparaison, budget, coûts de livraison." },
  { slug: "rappelle-plus-tard", title: "« Rappelez plus tard »", position: 7, advice: "Respecte le service. Un rappel accepté n'est pas un R2 et ne démontre pas un intérêt commercial.", next_question: "Plutôt demain avant le service, ou à un autre moment qui vous arrange ?", goal: "Obtenir un créneau de rappel précis accepté.", listen: "Jour, heure, personne à rappeler." },
  { slug: "posture", title: "Posture · Le calme fait vendre", position: 8, advice: "Sérieux, curieux, calme. Une idée par phrase. Ni suppliant ni dominant. Laisse finir l'autre et prends le temps de comprendre sa réponse (repère : deux secondes). Un refus commercial ne te définit pas.", next_question: "Quel fait utile dois-je comprendre durant cet appel ?", goal: "Être authentique, naturel, sûr de sa raison d'appeler.", listen: "Voix posée, vraie écoute, absence de précipitation." },
  { slug: "ouverture-site", title: "Ouverture · Son site existant", position: 9, advice: "Utilise uniquement un fait que tu as vérifié. « Bonjour, c'est Kevin, responsable commercial chez Livroum. Vous allez bien ? J'ai vu votre site... » Puis pose une question courte avant de parler de l'offre.", next_question: "Vos clients peuvent aussi commander en livraison directement depuis ce site ?", goal: "Créer de la pertinence sans faire un long pitch.", listen: "Site vitrine, capacité à commander." },
  { slug: "ouverture-plateforme", title: "Ouverture · Plateforme connue", position: 10, advice: "Ne prétends pas connaître son entreprise si tu n'as rien vérifié. Lancement local, puis question concrète. La livraison directe peut compléter Uber Eats.", next_question: "À côté de la plateforme, vous recevez des commandes directement chez vous ?", goal: "Comprendre ses canaux avant de proposer Livroum.", listen: "Réponse sur les canaux existants." },
  { slug: "decouverte", title: "Découverte · 4 questions au maximum", position: 11, advice: "Une question, une réponse, un rebond. Repères : commandes en livraison, commandes directes, difficulté actuelle, décideur. Ne déroule pas un questionnaire automatique.", next_question: "Qu'est-ce qui est le plus compliqué dans ce fonctionnement aujourd'hui ?", goal: "Identifier un besoin précis et la personne qui décide.", listen: "Faits et mots exacts du restaurateur." },
  { slug: "valeur", title: "La valeur · Pas un logiciel, un canal direct", position: 12, advice: "« Votre marque. Vos clients. Notre livraison. » Widget pour compléter un site exploitable ; App pour créer son canal de commande. Ne garantis ni zone, ni délai, ni économie.", next_question: "Qu'est-ce qui compte le plus : développer les commandes directes ou compléter la livraison ?", goal: "Relier une offre à un besoin réellement exprimé.", listen: "Commandes à la marque, contraintes de livraison." },
  { slug: "tarifs", title: "Tarifs · Deux offres, transport distinct", position: 13, advice: "Widget + Livroum : 199 € de mise en place, 149 €/mois, 0,48 €/livraison et premier mois d'abonnement offert. App + Livroum : 850 € de mise en place avec configuration, 108 €/mois et 0,29 €/livraison. Prix du transport physique DISTINCT. Ne jamais présenter ces commissions comme tout compris.", next_question: "Vous avez déjà un site de commande exploitable ou vous souhaitez en créer un ?", goal: "Expliquer clairement l'offre adaptée, sans inventer de frais.", listen: "Structure existante, questions sur transport et abonnement." },
  { slug: "envoyez-mail", title: "« Envoyez-moi un mail »", position: 14, advice: "Accepte la demande. Personnalise le sujet au lieu d'envoyer un document générique ; n'invente pas de rendez-vous ni d'accord de relance.", next_question: "Quel point vous intéresse surtout : le canal de commande ou la livraison ?", goal: "Identifier le sujet utile du mail.", listen: "Sujet précis, adresse professionnelle, suite acceptée." },
  { slug: "pas-interesse", title: "« Ça ne m'intéresse pas »", position: 15, advice: "Si le refus est ferme, explicite et définitif, respecte-le, sans chercher à relancer. « Pas maintenant » n'est pas forcément un refus définitif.", next_question: "Compris, merci de me l'avoir dit. Bonne journée et bon service.", goal: "Respecter l'opposition et sortir professionnellement.", listen: "Refus explicite ou simple manque de disponibilité." },
  { slug: "r2", title: "R2 · Le bon rendez-vous", position: 16, advice: "Restaurant pertinent, décideur identifié, fonctionnement compris, problème ou intérêt précis, objet accepté, date et contact enregistrés. R2 pris ≠ R2 tenu. Après confirmation : envoi d'un e-mail dans les cinq minutes, À FAIRE MANUELLEMENT tant qu'il n'est pas automatisé.", next_question: "Au vu de ce que vous me dites sur [le besoin], 10 minutes, ça vous paraît raisonnable ?", goal: "Obtenir une discussion qualifiée qui peut mener à une décision.", listen: "Décideur, motif, jour, heure, coordonnées." },
  { slug: "relances", title: "Relances · Une raison, un rappel", position: 17, advice: "Repars du dernier échange : un fait et un engagement réels. Ne suppose pas un intérêt. Confirme un R2 obtenu et reprends la question précise après l'envoi d'un document.", next_question: "On s'était dit que je vous rappellerais aujourd'hui au sujet de [point précis]. Vous avez deux minutes ?", goal: "Faire avancer une conversation déjà engagée.", listen: "Réponse réelle et suite convenue." },
  { slug: "hygiene-biiz", title: "BIIZ · Quatre gestes", position: 18, advice: "Résultat réel → fait utile → prochaine action datée et acceptée → suivant. Employé, patron absent = décideur absent ; rappel ≠ R2. Notes factuelles, aucune opportunité inventée. Évite les suppressions irréversibles.", next_question: "Quel fait nouveau ai-je appris et quelle prochaine action a été acceptée ?", goal: "Conserver une mémoire commerciale fiable en moins de 30 secondes si possible.", listen: "Faits vérifiés, prochaine échéance." },
  { slug: "entrainement", title: "Entraînement · Observer, jouer, corriger", position: 19, advice: "Deux appels à écouter ; trois situations à jouer sans script ; une seule correction par essai ; rejouer ; puis appels supervisés. Débrief en 90 secondes. Comparer le commercial à lui-même, sans compétition culpabilisante.", next_question: "Qu'as-tu compris ? Quel moment était naturel ? Quel geste corriger au prochain appel ?", goal: "Développer progressivement assurance, voix, écoute et qualification.", listen: "Un progrès observable et une correction concrète." },
  { slug: "verite", title: "Vérité commerciale · Garde-fous", position: 20, advice: "Aucun partenaire, couverture, délai, économie ou choix de 25 restaurants inventé. Sépare toujours les frais du transport physique. Respecte les oppositions. La crédibilité vaut plus qu'un R2.", next_question: "Ce que je vais annoncer est-il un fait vérifié ?", goal: "Préserver la confiance du marché local.", listen: "Faits, hypothèses, informations à confirmer." }
];

/** Une seule source pour Coach et les raccourcis Prospection. */
export const COACH_GROUPS = [
  { id: "posture", label: "Posture & premiers mots", slugs: ["posture","ouverture","ouverture-site","ouverture-plateforme","pas-le-patron"] },
  { id: "decouverte", label: "Découverte & valeur", slugs: ["decouverte","valeur"] },
  { id: "objections", label: "Objections", slugs: ["uber-eats","livreurs-propres","pas-de-livraison","deja-un-site","cest-cher","envoyez-mail","rappelle-plus-tard","pas-interesse"] },
  { id: "r2", label: "R2 & suivi", slugs: ["r2","relances","hygiene-biiz"] },
  { id: "methode", label: "Méthode & prix", slugs: ["tarifs","entrainement","verite"] },
  { id: "autres", label: "Autres fiches", slugs: [] }
] as const;
export const QUICK_COACH = [
  { slug: "uber-eats", label: "Uber Eats" },
  { slug: "livreurs-propres", label: "Nos livreurs" },
  { slug: "pas-de-livraison", label: "Pas de livraison" },
  { slug: "deja-un-site", label: "Site existant" },
  { slug: "cest-cher", label: "C'est cher" },
  { slug: "pas-le-patron", label: "Patron absent" }
] as const;
export function coachGroupForSlug(slug: string): (typeof COACH_GROUPS)[number]["id"] {
  return COACH_GROUPS.find((g) => g.slugs.some((s) => s === slug))?.id ?? "autres";
}

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
  const first = lines[0] ?? "";
  const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
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
  const head = split(first).map((h) => alias[normalizeName(h)] ?? "");
  if (!head.includes("name")) return [];
  return lines.slice(1).map((l) => {
    const cells = split(l);
    const r: Record<string, string> = {};
    head.forEach((h, i) => { const c = cells[i]; if (h && c) r[h] = c.slice(0, 300); });
    const pr = r["priority"]?.toUpperCase();
    if (pr && PRIORITIES.includes(pr as never)) r["priority"] = pr; else delete r["priority"];
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
