import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BIIZ — Liens trackés, QR et attribution" },
      { name: "description", content: "Créez des liens UTM et QR codes par projet, et suivez d'où viennent vos clients." },
      { property: "og:title", content: "BIIZ — Liens trackés, QR et attribution" },
      { property: "og:description", content: "Créez des liens UTM et QR codes par projet, et suivez d'où viennent vos clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const flow = ["Support", "Lien / QR", "Visite", "Conversion", "CA", "Décision"];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">BIIZ</span>
        <Button asChild variant="ghost" size="sm"><Link to="/auth">Se connecter</Link></Button>
      </header>
      <main className="mx-auto max-w-5xl px-6 pt-20 pb-32">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">AXIUM · Module Tracking</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          Savoir d'où vient chaque client.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Un lien tracké et un QR par support — flyer, Reel, partenaire, affiche. Nomenclature UTM standardisée, projets séparés, chiffres réels.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg"><Link to="/auth">Commencer</Link></Button>
        </div>
        <div className="mt-24 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          {flow.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-md border bg-card px-3 py-1.5 text-foreground">{s}</span>
              {i < flow.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
