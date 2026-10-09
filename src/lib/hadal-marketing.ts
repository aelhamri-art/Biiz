import { format, startOfMonth, startOfWeek } from "date-fns";

// Editorial rules for HADAL. Missions themselves are written by the creative direction in the cockpit.
export const editorialCadence = [
  { id: "pov", count: 2, period: "week", title: "POV humoristiques", rhythm: "2 / semaine", role: "Faire rire avec une vraie situation entre collègues.", owner: "Équipe cuisine" },
  { id: "static", count: 1, period: "week", title: "Post statique", rhythm: "1 / semaine", role: "Montrer un Berliner avec une photo simple et nette.", owner: "Équipe cuisine" },
  { id: "signature", count: 1, period: "month", title: "Film signature", rhythm: "1 / mois", role: "Installer l’identité HADAL avec un film publicitaire soigné.", owner: "Production dédiée" },
  { id: "operation", count: 1, period: "month", title: "Opération HADAL", rhythm: "1 / mois", role: "Créer un temps fort autour de HADAL.", owner: "Organisation dédiée" },
] as const;

export const shootingRules = [
  { id: "vertical", title: "Téléphone vertical", detail: "Format 9:16. Jamais à l’horizontale." },
  { id: "lens", title: "Nettoie l’objectif", detail: "Un coup de chiffon propre avant de filmer." },
  { id: "zoom", title: "Caméra 1x", detail: "Pas de zoom. Rapproche-toi avec tes pieds." },
  { id: "light", title: "Lumière devant", detail: "La lumière éclaire les visages, pas leur dos." },
  { id: "timing", title: "Plans de 3 à 6 s", detail: "Lance 1 s avant l’action, coupe 1 s après." },
  { id: "natural", title: "Reste naturel", detail: "Parle et joue comme entre collègues." },
] as const;
export type RuleId = typeof shootingRules[number]["id"];

export const MISSION_KINDS = [
  ["pov", "POV humour"], ["statique", "Post statique"], ["film", "Film signature"], ["operation", "Opération HADAL"],
] as const;
export const kindLabel = (k: string) => MISSION_KINDS.find(([v]) => v === k)?.[1] ?? k;

export type MissionPlan = { title: string; instruction: string; line?: string };
export type KitchenMission = {
  id: string; workspace_id: string; period_start: string; scope: "semaine" | "mois" | string; kind: string;
  title: string; pitch: string | null; duration_min: number | null; people: string | null;
  plans: MissionPlan[]; want: string | null; never: string | null; position: number;
};

export const weekKey = (d = new Date()) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
export const monthKey = (d = new Date()) => format(startOfMonth(d), "yyyy-MM-dd");

export function parsePlans(value: unknown): MissionPlan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) => p && typeof p === "object" && typeof (p as MissionPlan).title === "string"
    ? [{ title: (p as MissionPlan).title, instruction: String((p as MissionPlan).instruction ?? ""), line: (p as MissionPlan).line ? String((p as MissionPlan).line) : undefined }]
    : []);
}

export function instagramEmbedUrl(input: string): string | null {
  const c = instagramCanonical(input);
  return c ? `${c}embed/` : null;
}

export function instagramCanonical(input: string): string | null {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
  } catch {
    return null;
  }
}
