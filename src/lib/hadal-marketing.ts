// Public, explicitly curated content only. Never import workspace data here.
export const editorialCadence = [
  { id: "pov", count: 2, period: "week", title: "POV humoristiques", rhythm: "2 / semaine", role: "Faire rire avec une vraie situation entre collègues.", owner: "Équipe cuisine" },
  { id: "static", count: 1, period: "week", title: "Post statique", rhythm: "1 / semaine", role: "Montrer un Berliner avec une photo simple et nette.", owner: "Équipe cuisine" },
  { id: "signature", count: 1, period: "month", title: "Film signature", rhythm: "1 / mois", role: "Installer l’identité HADAL avec un film publicitaire soigné.", owner: "Production dédiée · date à fixer" },
  { id: "operation", count: 1, period: "month", title: "Opération HADAL", rhythm: "1 / mois", role: "Créer un temps fort autour de HADAL.", owner: "Organisation dédiée · date à fixer" },
] as const;

export const shootingRules = [
  { title: "Téléphone vertical", detail: "Format 9:16. Ne filme pas à l’horizontale." },
  { title: "Nettoie l’objectif", detail: "Un coup de chiffon propre avant de commencer." },
  { title: "Caméra 1x", detail: "Garde le réglage 1x. Rapproche-toi si nécessaire." },
  { title: "Lumière devant", detail: "La lumière éclaire les visages, pas leur dos." },
  { title: "Plans de 3 à 6 secondes", detail: "Laisse un peu de temps avant et après l’action." },
  { title: "Reste naturel", detail: "Parle et joue comme tu le ferais entre collègues." },
] as const;

export type InstagramInspiration = {
  url: string;
  title: string;
  tags: string[];
  takeaway: string;
  why: string;
};

// Add only real public Instagram posts selected for HADAL. Empty until supplied.
export const instagramInspirations: InstagramInspiration[] = [];

export function instagramEmbedUrl(input: string): string | null {
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) return null;
    const match = url.pathname.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)\/?$/);
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null;
  } catch {
    return null;
  }
}

export const missionCompletionKey = "biiz:hadal:mission:pas-faim:v1";