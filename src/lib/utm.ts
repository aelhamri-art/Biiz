export const SOURCES: { source: string; medium: string; label: string }[] = [
  { label: "Flyer", source: "flyer", medium: "offline" },
  { label: "Affiche", source: "affiche", medium: "offline" },
  { label: "QR physique", source: "qr", medium: "offline" },
  { label: "Événement", source: "evenement", medium: "offline" },
  { label: "Instagram bio", source: "instagram", medium: "social" },
  { label: "Reel", source: "instagram_reel", medium: "social" },
  { label: "Story", source: "instagram_story", medium: "social" },
  { label: "TikTok", source: "tiktok", medium: "social" },
  { label: "Google Business", source: "google_business", medium: "local" },
  { label: "Meta Ads", source: "meta", medium: "paid_social" },
  { label: "Partenaire", source: "partenaire", medium: "referral" },
  { label: "Influenceur", source: "influenceur", medium: "referral" },
  { label: "Campagne CRM", source: "crm", medium: "email" },
];

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function randomCode() {
  const c = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 7 }, () => c[Math.floor(Math.random() * c.length)]).join("");
}
