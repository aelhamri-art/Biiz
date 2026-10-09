import { createFileRoute } from "@tanstack/react-router";
import { HadalMarketingPage } from "@/components/hadal/marketing-page";

export const Route = createFileRoute("/hadal-marketing")({
  head: () => ({
    meta: [
      { title: "HADAL · Mission cuisine — BIIZ" },
      { name: "description", content: "Les missions de la semaine HADAL, les références et le guide visuel pour filmer." },
      { property: "og:title", content: "HADAL · Mission cuisine — BIIZ" },
      { property: "og:description", content: "L’espace cuisine HADAL mis à disposition par BIIZ : les missions de la semaine, plan par plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "https://biiz.lovable.app/hadal-marketing" },
    ],
    links: [{ rel: "canonical", href: "https://biiz.lovable.app/hadal-marketing" }],
  }),
  component: HadalMarketingPage,
});