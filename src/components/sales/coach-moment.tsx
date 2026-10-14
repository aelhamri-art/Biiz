import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, Ear, Compass, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CoachCard } from "@/lib/sales";

const steps = [
  { label: "Comprendre", icon: Compass },
  { label: "Dire", icon: MessageCircle },
  { label: "Écouter", icon: Ear },
] as const;

/** Presentation-only: always receives the merged team card, never writes CRM data. */
export function CoachMoment({ card, live = false }: { card: CoachCard; live?: boolean }) {
  const [step, setStep] = useState(live ? 1 : 0);
  const [context, setContext] = useState(false);
  const [rehearse, setRehearse] = useState(false);
  const [ownWords, setOwnWords] = useState("");
  const contents = [card.goal || card.advice, card.next_question || card.advice, card.listen || "Les faits exprimés, sans supposer un besoin."];
  const titles = ["Une seule intention", "Une formulation possible", "Laisse la réponse arriver"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Repères de conversation">
        {steps.map(({ label, icon: Icon }, index) => (
          <Button key={label} variant="ghost" className="sales-seg h-11 gap-1 px-1 text-xs sm:gap-2 sm:text-sm" aria-pressed={step === index} onClick={() => { setStep(index); setRehearse(false); }}>
            <Icon className="size-4" />{label}
          </Button>
        ))}
      </div>
      <div className="border-l-2 sales-lime-border pl-4" role="region" aria-label={titles[step]}>
        <p className="text-xs font-medium text-muted-foreground">{titles[step]}</p>
        <p className="mt-2 text-base font-medium leading-relaxed">{contents[step]}</p>
        {step === 1 && <p className="mt-3 text-xs text-muted-foreground">Tes mots suffisent. Pas besoin de réciter.</p>}
        {step === 2 && <p className="mt-3 text-xs text-muted-foreground">Une pause, puis un rebond sur ce qu’il vient de dire.</p>}
      </div>
      {!live && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="h-11" disabled={step === 0} onClick={() => { setStep((value) => Math.max(0, value - 1)); setRehearse(false); }}><ChevronLeft />Retour</Button>
          <span className="text-xs text-muted-foreground">{step + 1} / 3</span>
          <Button variant="outline" size="sm" className="h-11" onClick={() => { setStep((value) => (value + 1) % 3); setRehearse(false); }}>{step === 2 ? <><RotateCcw />Reprendre</> : <>Continuer<ChevronRight /></>}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2 border-t pt-3">
        <Button variant="ghost" size="sm" className="h-11" aria-expanded={context} onClick={() => setContext((value) => !value)}>{context ? "Masquer le conseil" : "Pourquoi cette approche ?"}</Button>
        {!live && <Button variant="outline" size="sm" className="h-11" aria-expanded={rehearse} onClick={() => { setStep(1); setRehearse((value) => !value); }}>Avec mes mots</Button>}
      </div>
      {context && <p className="text-sm leading-relaxed text-muted-foreground">{card.advice}</p>}
      {rehearse && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-sm font-medium">Même intention, ta voix.</p>
          <label className="block text-sm text-muted-foreground" htmlFor="sales-coach-own-words">Comment tu le dirais naturellement ?</label>
          <textarea id="sales-coach-own-words" className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" rows={2} maxLength={300} value={ownWords} onChange={(event) => setOwnWords(event.target.value)} />
          <p className="text-xs text-muted-foreground">Une question courte, puis de l’écoute. Aucun score à atteindre.</p>
          <Button variant="secondary" className="h-11" onClick={() => { setStep(2); setRehearse(false); }}><Ear />Puis, j’écoute</Button>
        </div>
      )}
    </div>
  );
}