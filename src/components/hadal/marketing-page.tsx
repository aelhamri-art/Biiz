import { useEffect, useState } from "react";
import { Camera, Check, CheckCircle2, Clock3, ExternalLink, Instagram, Smartphone, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { editorialCadence, instagramEmbedUrl, instagramInspirations, missionCompletionKey, shootingRules } from "@/lib/hadal-marketing";

const shots = [
  { title: "Une personne mange son Berliner", instruction: "Tiens le téléphone droit, à hauteur de poitrine. Cadre ton collègue et son Berliner. Filme-le en train de manger, sans lui demander de poser.", line: "Pas de dialogue.", scene: "eat" },
  { title: "L’autre n’a « pas faim »", instruction: "Sans changer de place, cadre le deuxième collègue. Il regarde le Berliner et répond comme dans une vraie conversation.", line: "« Non tranquille, j’ai pas faim. »", scene: "talk" },
  { title: "Et pourtant…", instruction: "Arrête la vidéo. Recommence avec le deuxième collègue qui mange dans le Berliner du premier. Le changement doit être immédiat : pas de transition à ajouter.", line: "Pas de dialogue. C’est l’action qui fait rire.", scene: "steal" },
  { title: "Le regard qui dit tout", instruction: "Cadre le visage du premier collègue. Il regarde la caméra, sans rien dire, comme pour dire « vraiment ? ». Garde le regard une seconde. Fin.", line: "Un regard, pas de surjeu.", scene: "look" },
] as const;

// Small original storyboard diagrams, not pretend reference footage.
function ShotFrame({ scene }: { scene: typeof shots[number]["scene"] }) {
  return (
    <svg viewBox="0 0 80 112" role="img" aria-label={scene === "look" ? "Cadrage du regard caméra" : "Cadrage vertical de la scène"} className="h-28 w-20 shrink-0 rounded-md border bg-secondary/40 text-muted-foreground">
      <path d="M8 18v-8h8M64 10h8v8M8 94v8h8M64 102h8v-8" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="40" cy={scene === "look" ? 46 : 35} r={scene === "look" ? 19 : 12} fill="none" stroke="currentColor" strokeWidth="2" />
      <path d={scene === "look" ? "M15 98v-5c0-21 50-21 50 0v5" : "M20 93V68c0-22 40-22 40 0v25"} fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="35" cy={scene === "look" ? 43 : 33} r="1.5" fill="currentColor" /><circle cx="45" cy={scene === "look" ? 43 : 33} r="1.5" fill="currentColor" />
      <path d={scene === "look" ? "M35 53h10" : "M36 41q4 3 8 0"} fill="none" stroke="currentColor" strokeWidth="1.5" />
      {(scene === "eat" || scene === "steal") && <g className="text-primary" stroke="currentColor" fill="none" strokeWidth="2"><path d="M24 66q16-20 32 0zM24 70h32M26 74h28" /><path d="M20 78l10-8M60 78L50 70" /></g>}
      {scene === "talk" && <path d="M48 48h21V32H53M54 48l-6 7v-7" fill="none" stroke="currentColor" strokeWidth="1.5" />}
      <text x="40" y="106" textAnchor="middle" fill="currentColor" fontSize="6">9:16</text>
    </svg>
  );
}

function Today() {
  const [done, setDone] = useState(false);
  const [stored, setStored] = useState(true);
  useEffect(() => {
    try { setDone(localStorage.getItem(missionCompletionKey) === "done"); } catch { setStored(false); }
  }, []);
  function complete(value: boolean) {
    setDone(value);
    try {
      if (value) localStorage.setItem(missionCompletionKey, "done");
      else localStorage.removeItem(missionCompletionKey);
      setStored(true);
    } catch { setStored(false); }
  }
  return (
    <>
      <div className="border-b pb-6">
        <p className="text-xs font-medium uppercase text-primary">La mission · Exemple</p>
        <h1 className="mt-2 text-3xl font-semibold">« J’ai pas faim »</h1>
        <p className="mt-2 text-sm text-muted-foreground">Un collègue n’a pas faim. Jusqu’à ce qu’il voie ton Berliner.</p>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground" aria-label="Détails de la mission">
          <li className="flex items-center gap-1.5"><Camera className="size-4 text-primary" />POV humour</li>
          <li className="flex items-center gap-1.5"><Clock3 className="size-4" />5 min estimées</li>
          <li className="flex items-center gap-1.5"><Users className="size-4" />2 à l’image + 1 filme</li>
          <li className="flex items-center gap-1.5"><Smartphone className="size-4" />9:16</li>
        </ul>
      </div>
      {done ? (
        <section className="py-12 text-center" aria-live="polite">
          <CheckCircle2 className="mx-auto size-10 text-chart-2" />
          <h2 className="mt-4 text-xl font-semibold">C’est filmé. Bien joué.</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">Garde les 4 vidéos sur ton téléphone. Rien n’a été envoyé à BIIZ.</p>
          <p className="mt-2 text-xs text-muted-foreground">{stored ? "Mission cochée sur ce téléphone uniquement." : "Mission cochée pour cette visite uniquement."}</p>
          <Button variant="outline" className="mt-6" onClick={() => complete(false)}>Revoir la mission</Button>
        </section>
      ) : (
        <>
          <section className="py-6">
            <h2 className="text-base font-semibold">4 plans. Dans cet ordre.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Filme chaque plan séparément, 3 à 6 secondes. Laisse un peu avant et après l’action.</p>
            <ol className="mt-5 divide-y border-y">
              {shots.map((shot, i) => <li key={shot.title} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 py-5 sm:gap-6">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-primary">PLAN {i + 1}</p>
                  <h3 className="mt-1 text-base font-semibold">{shot.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{shot.instruction}</p>
                  <p className="mt-2 text-sm font-medium">{shot.line}</p>
                </div>
                <ShotFrame scene={shot.scene} />
              </li>)}
            </ol>
          </section>
          <section className="grid gap-5 border-b pb-6 sm:grid-cols-2" aria-label="Ce qu’on veut et ce qu’on évite">
            <div><h2 className="flex items-center gap-2 text-xs font-semibold text-chart-2"><Check className="size-4" />ON VEUT</h2><p className="mt-2 text-sm leading-relaxed">Une vraie situation entre collègues. Une phrase naturelle. Une chute simple, avec un regard caméra.</p></div>
            <div><h2 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />JAMAIS</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Une pub déguisée, du surjeu ou « POV ton nouveau sandwich est là ». Aucun slogan.</p></div>
          </section>
          <div className="pt-6"><Button size="lg" className="h-12 w-full" onClick={() => complete(true)}><CheckCircle2 />J’ai filmé la mission</Button><p className="mt-3 text-center text-xs text-muted-foreground">Pas d’envoi. Les vidéos restent sur ton téléphone.</p></div>
        </>
      )}
    </>
  );
}

function Week() {
  return <>
    <h1 className="text-2xl font-semibold">Le rythme HADAL</h1>
    <p className="mt-2 text-sm text-muted-foreground">Chaque semaine, du quotidien. Chaque mois, un temps fort.</p>
    <section className="mt-7"><h2 className="text-xs font-medium uppercase text-primary">Chaque semaine · En cuisine</h2><div className="mt-3 divide-y border-y">{editorialCadence.filter((item) => item.period === "week").map((item) => <FormatRow key={item.id} item={item} />)}</div></section>
    <section className="mt-8"><h2 className="text-xs font-medium uppercase text-primary">Chaque mois · À planifier à part</h2><div className="mt-3 divide-y border-y">{editorialCadence.filter((item) => item.period === "month").map((item) => <FormatRow key={item.id} item={item} />)}</div><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Le film signature et l’opération forte ont leur propre préparation. Ce ne sont pas des missions POV à tourner entre deux services.</p></section>
  </>;
}

function FormatRow({ item }: { item: typeof editorialCadence[number] }) {
  return <div className="py-5"><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><h3 className="min-w-0 text-base font-semibold">{item.title}</h3><span className="shrink-0 font-mono text-xs text-primary">{item.rhythm}</span></div><p className="mt-2 text-sm text-muted-foreground">{item.role}</p><p className="mt-2 text-xs text-muted-foreground">{item.owner}</p></div>;
}

function Inspirations() {
  return <><h1 className="text-2xl font-semibold">Les bonnes références</h1><p className="mt-2 text-sm text-muted-foreground">Des situations à reprendre, pas des pubs à imiter.</p>
    {instagramInspirations.length === 0 ? <div className="mt-7 border-y py-16 text-center"><Instagram className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">La sélection arrive bientôt.</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">Les vrais Reels et posts Instagram choisis pour HADAL apparaîtront ici.</p></div> : <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">{instagramInspirations.map((item) => {
      const embed = instagramEmbedUrl(item.url);
      if (!embed) return null;
      return <article key={item.url} className="min-w-0 overflow-hidden rounded-lg border bg-card"><iframe src={embed} title={item.title} loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" className="h-[480px] w-full border-0" /><div className="p-4"><h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-xs text-primary">{item.tags.join(" · ")}</p><p className="mt-3 text-sm"><span className="font-medium">Ce qu’on reprend : </span>{item.takeaway}</p><p className="mt-2 text-sm text-muted-foreground"><span className="font-medium">Pourquoi : </span>{item.why}</p><Button asChild variant="link" className="mt-3 h-auto p-0"><a href={item.url} target="_blank" rel="noopener noreferrer">Ouvrir sur Instagram<ExternalLink /></a></Button></div></article>;
    })}</div>}
  </>;
}

function Guide() {
  return <><h1 className="text-2xl font-semibold">Simple. Propre. Naturel.</h1><p className="mt-2 text-sm text-muted-foreground">Les 6 réflexes avant de filmer.</p><ol className="mt-6 divide-y border-y">{shootingRules.map((rule, i) => <li key={rule.title} className="flex gap-4 py-4"><span className="pt-0.5 font-mono text-xs text-primary">0{i + 1}</span><div className="min-w-0"><h2 className="text-sm font-semibold">{rule.title}</h2><p className="mt-1 text-sm text-muted-foreground">{rule.detail}</p></div></li>)}</ol><section className="mt-7 border-l-2 border-primary pl-4"><h2 className="text-xs font-medium uppercase text-primary">Le test anti-cringe</h2><p className="mt-2 text-lg font-semibold">« Est-ce qu’on ferait / dirait vraiment ça entre nous ? »</p><p className="mt-2 text-sm text-muted-foreground">Si non, on ne tourne pas.</p></section><section className="mt-7 border-t pt-5"><h2 className="flex items-center gap-2 text-xs font-semibold text-destructive"><X className="size-4" />À BANNIR</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Zooms gadgets, transitions cheap, danse forcée, 15 emojis, slogans type « venez découvrir… ».</p></section></>;
}

export function HadalMarketingPage() {
  return <div className="min-h-screen bg-background">
    <header className="biiz-topbar border-b bg-card/95"><div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="biiz-mark shrink-0">B</span><span className="text-lg font-semibold">BIIZ</span></div><span className="shrink-0 text-xs text-muted-foreground">HADAL / Cuisine</span></div></header>
    <Tabs defaultValue="today" className="mx-auto max-w-2xl px-5 pb-8">
      <div className="biiz-tabs-shell sticky top-[69px] z-30 bg-background pt-2"><TabsList aria-label="HADAL marketing" className="biiz-tabs !grid grid-cols-4 !gap-0 !p-0"><TabsTrigger value="today" className="!min-h-12 !px-1 !text-[11px] sm:!text-xs">AUJOURD’HUI</TabsTrigger><TabsTrigger value="week" className="!min-h-12 !px-1 !text-[11px] sm:!text-xs">SEMAINE</TabsTrigger><TabsTrigger value="inspi" className="!min-h-12 !px-1 !text-[11px] sm:!text-xs">INSPI</TabsTrigger><TabsTrigger value="guide" className="!min-h-12 !px-1 !text-[11px] sm:!text-xs">GUIDE</TabsTrigger></TabsList></div>
      <main className="pt-6"><TabsContent value="today" className="mt-0"><Today /></TabsContent><TabsContent value="week" className="mt-0"><Week /></TabsContent><TabsContent value="inspi" className="mt-0"><Inspirations /></TabsContent><TabsContent value="guide" className="mt-0"><Guide /></TabsContent></main>
      <footer className="mt-10 border-t pt-5 text-center text-[11px] text-muted-foreground">BIIZ · Pour l’équipe HADAL</footer>
    </Tabs>
  </div>;
}