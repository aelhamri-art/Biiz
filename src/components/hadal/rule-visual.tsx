import type { RuleId } from "@/lib/hadal-marketing";

// Original "bon / mauvais" pictograms for each shooting rule.
function Phone({ good, landscape, children }: { good: boolean; landscape?: boolean; children?: React.ReactNode }) {
  const w = landscape ? 70 : 44, h = landscape ? 44 : 70;
  const x = (80 - w) / 2, y = (80 - h) / 2;
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full" aria-hidden="true">
      <rect x={x} y={y} width={w} height={h} rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <g transform={`translate(${x} ${y})`}>{children}</g>
      <circle cx="68" cy="12" r="9" className={good ? "fill-chart-2" : "fill-destructive"} />
      <path d={good ? "M64 12l3 3 5-6" : "M65 9l6 6M71 9l-6 6"} stroke="var(--primary-foreground)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const person = (cx: number, cy: number, s = 1, dark = false) => (
  <g fill={dark ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6">
    <circle cx={cx} cy={cy} r={6 * s} />
    <path d={`M${cx - 10 * s} ${cy + 22 * s}c0-12 ${20 * s}-12 ${20 * s} 0`} />
  </g>
);

function Pair({ id, good }: { id: RuleId; good: boolean }) {
  switch (id) {
    case "vertical":
      return good ? <Phone good>{person(22, 26)}</Phone> : <Phone good={false} landscape>{person(35, 12, 0.8)}</Phone>;
    case "lens":
      return <Phone good={good}>{person(22, 26)}{!good && <g className="fill-muted-foreground/40"><circle cx="14" cy="18" r="9" /><circle cx="30" cy="44" r="11" /><circle cx="28" cy="20" r="6" /></g>}</Phone>;
    case "zoom":
      return good ? <Phone good>{person(22, 26)}<text x="22" y="64" textAnchor="middle" fontSize="8" fill="currentColor">1x</text></Phone>
        : <Phone good={false}>{person(22, 34, 2)}<text x="22" y="64" textAnchor="middle" fontSize="8" fill="currentColor">5x</text></Phone>;
    case "light":
      return good ? <Phone good>{person(22, 30)}<g className="text-primary" stroke="currentColor" strokeWidth="1.5"><path d="M22 4v5M12 7l3 4M32 7l-3 4" /></g></Phone>
        : <Phone good={false}><rect x="6" y="6" width="32" height="40" className="fill-primary/30" />{person(22, 30, 1, true)}</Phone>;
    case "timing":
      return <Phone good={good}>{person(22, 22)}<g transform="translate(4 54)"><rect width="36" height="5" rx="2" fill="none" stroke="currentColor" /><rect width={good ? 22 : 4} height="5" rx="2" className={good ? "fill-chart-2" : "fill-destructive"} /></g><text x="22" y="52" textAnchor="middle" fontSize="7" fill="currentColor">{good ? "4 s" : "0,5 s"}</text></Phone>;
    case "natural":
      return good ? <Phone good>{person(14, 28, 0.8)}{person(30, 28, 0.8)}<path d="M18 10h12v7h-8l-3 3v-3" fill="none" stroke="currentColor" /></Phone>
        : <Phone good={false}>{person(22, 26)}<path d="M8 48l-5-10M36 48l5-10" stroke="currentColor" strokeWidth="1.6" /><text x="22" y="12" textAnchor="middle" fontSize="7" fill="currentColor">VENEZ !</text></Phone>;
  }
}

export function RuleVisual({ id }: { id: RuleId }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="biiz-rule-good rounded-md border p-2 text-muted-foreground"><div className="aspect-square"><Pair id={id} good /></div><figcaption className="mt-1 text-center text-[11px] font-medium text-chart-2">Oui</figcaption></figure>
      <figure className="biiz-rule-bad rounded-md border p-2 text-muted-foreground"><div className="aspect-square"><Pair id={id} good={false} /></div><figcaption className="mt-1 text-center text-[11px] font-medium text-destructive">Non</figcaption></figure>
    </div>
  );
}
