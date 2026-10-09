import { createFileRoute } from "@tanstack/react-router";
import { HadalMarketingPage } from "@/components/hadal/marketing-page";

export const Route = createFileRoute("/hadal-marketing")({
  head: () => ({
    meta: [
      { title: "HADAL · Mission cuisine — BIIZ" },
      { name: "description", content: "La mission de tournage HADAL : quatre plans simples, le rythme de la semaine et les bons réflexes pour filmer." },
      { property: "og:title", content: "HADAL · Mission cuisine — BIIZ" },
      { property: "og:description", content: "L’espace cuisine HADAL mis à disposition par BIIZ : une mission simple, plan par plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "https://biiz.lovable.app/hadal-marketing" },
    ],
    links: [{ rel: "canonical", href: "https://biiz.lovable.app/hadal-marketing" }],
  }),
  component: HadalMarketingPage,
});