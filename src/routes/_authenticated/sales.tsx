import { createFileRoute } from "@tanstack/react-router";
import { SalesApp } from "@/components/sales/sales-app";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "BIIZ Sales Forces — Prospection" },
      { name: "description", content: "Prospects, appels, pipeline et coach de vente, par projet." },
      { property: "og:title", content: "BIIZ Sales Forces — Prospection" },
      { property: "og:description", content: "Prospects, appels, pipeline et coach de vente, par projet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SalesApp,
});
