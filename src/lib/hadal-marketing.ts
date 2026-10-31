import { format, startOfMonth, startOfWeek } from "date-fns";

export type EditorialCadenceItem = {
  id: string;
  count: number;
  maxCount?: number;
  period: "week" | "day";
  title: string;
  rhythm: string;
  role: string;
  owner: string;
};

export const editorialCadence: EditorialCadenceItem[] = [
  {
    id: "static_commercial",
    count: 1,
    period: "week",
    title: "Post commercial",
    rhythm: "1 / semaine",
    role: "Donner une raison de commander maintenant.",
    owner: "Direction créative",
  },
  {
    id: "static_lifestyle",
    count: 1,
    period: "week",
    title: "Post lifestyle / engageant",
    rhythm: "1 / semaine",
    role: "Créer de la préférence et parler à la vraie vie de la cible.",
    owner: "Direction créative",
  },
  {
    id: "video_simple",
    count: 1,
    period: "week",
    title: "Vidéo simple",
    rhythm: "1 / semaine",
    role: "Apporter du réel : produit, préparation, app, cuisine, commande.",
    owner: "Équipe HADAL + montage",
  },
  {
    id: "stories",
    count: 2,
    maxCount: 3,
    period: "day",
    title: "Stories",
    rhythm: "2–3 / jour",
    role: "Rester présent et pousser régulièrement vers la commande.",
    owner: "Équipe HADAL / marketing",
  },
];

type CadenceSettings = {
  static_commercial_per_week?: number;
  static_lifestyle_per_week?: number;
  simple_video_per_week?: number;
  stories_per_day_min?: number;
  stories_per_day_max?: number;
};

export function cadenceFromSettings(value: unknown): EditorialCadenceItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return editorialCadence;
  const v = value as CadenceSettings;
  const positive = (n: unknown, fallback: number) => typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : fallback;

  const commercial = positive(v.static_commercial_per_week, 1);
  const lifestyle = positive(v.static_lifestyle_per_week, 1);
  const video = positive(v.simple_video_per_week, 1);
  const storiesMin = positive(v.stories_per_day_min, 2);
  const storiesMax = Math.max(storiesMin, positive(v.stories_per_day_max, 3));

  return [
    { ...editorialCadence[0]!, count: commercial, rhythm: `${commercial} / semaine` },
    { ...editorialCadence[1]!, count: lifestyle, rhythm: `${lifestyle} / semaine` },
    { ...editorialCadence[2]!, count: video, rhythm: `${video} / semaine` },
    { ...editorialCadence[3]!, count: storiesMin, maxCount: storiesMax, rhythm: `${storiesMin}–${storiesMax} / jour` },
  ];
}

export const shootingRules = [
  { id: "vertical", title: "Téléphone vertical", detail: "Format 9:16. Jamais à l’horizontale." },
  { id: "lens", title: "Nettoie l’objectif", detail: "Un coup de chiffon propre avant de filmer." },
  { id: "zoom", title: "Caméra 1x", detail: "Pas de zoom. Rapproche-toi avec tes pieds." },
  { id: "light", title: "Lumière devant", detail: "La lumière éclaire le produit ou l’action, pas l’arrière-plan." },
  { id: "timing", title: "Plans de 3 à 6 s", detail: "Lance 1 s avant l’action, coupe 1 s après." },
  { id: "natural", title: "Reste naturel", detail: "Filme ce qui se passe vraiment. Pas besoin de jouer une scène." },
] as const;
export type RuleId = typeof shootingRules[number]["id"];

export const MISSION_KINDS = [
  ["video_simple", "Vidéo simple"],
  ["story_capture", "Matière story"],
  ["statique", "Photo / statique"],
  ["pov", "POV humour · historique"],
  ["film", "Film signature · historique"],
  ["operation", "Opération HADAL"],
] as const;
export const kindLabel = (k: string) => MISSION_KINDS.find(([v]) => v === k)?.[1] ?? k;

export type MissionPlan = { title: string; instruction: string; line?: string | undefined };
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
