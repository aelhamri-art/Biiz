import type { Activity } from "@/lib/sales";
import { dailyCallCounts } from "@/lib/sales";

/** Illustration vectorielle propre à Sales : trajectoire, précision et mouvement maîtrisé. */
export function SalesMomentumVisual({ actions }: { actions: number }) {
  return (
    <div className="sales-momentum" aria-hidden="true">
      <svg viewBox="0 0 360 250" fill="none">
        <g className="sales-momentum-grid">
          <path d="M20 40H340M20 90H340M20 140H340M20 190H340M60 15V225M120 15V225M180 15V225M240 15V225M300 15V225" />
        </g>
        <g className="sales-momentum-cells">
          <path d="M276 36L298 49V75L276 88L254 75V49L276 36Z" />
          <path d="M320 61L342 74V100L320 113L298 100V74L320 61Z" />
          <path d="M276 112L298 125V151L276 164L254 151V125L276 112Z" />
        </g>
        <path className="sales-momentum-track" d="M28 192C76 192 69 117 126 132C183 147 167 69 232 82C272 90 287 68 313 49" />
        <path className="sales-momentum-flight" d="M28 192C76 192 69 117 126 132C183 147 167 69 232 82C272 90 287 68 313 49" />
        <g className="sales-momentum-origin">
          <circle cx="28" cy="192" r="10" />
          <circle cx="28" cy="192" r="3" />
        </g>
        <g className="sales-momentum-target">
          <circle cx="313" cy="49" r="27" />
          <circle cx="313" cy="49" r="16" />
          <circle cx="313" cy="49" r="5" />
        </g>
        <g className="sales-momentum-bee" transform="translate(211 65) rotate(16)">
          <ellipse cx="0" cy="-9" rx="10" ry="6" transform="rotate(-28)" />
          <ellipse cx="19" cy="-9" rx="10" ry="6" transform="rotate(28 19 -9)" />
          <path d="M9.5-4L21 3V17L9.5 24L-2 17V3L9.5-4Z" />
          <path d="M-1 7H20M-1 14H20" />
        </g>
      </svg>
      <div className="sales-momentum-readout">
        <strong>{String(actions).padStart(2, "0")}</strong>
        <span>à traiter</span>
      </div>
      <p>PRÉCISION / MOUVEMENT</p>
    </div>
  );
}

/** Sept jours factuels, calculés exclusivement depuis les appels enregistrés. */
export function WeekRhythm({ activities }: { activities: Pick<Activity, "created_at">[] }) {
  const days = dailyCallCounts(activities);
  const max = Math.max(0, ...days.map((day) => day.count));
  const total = days.reduce((sum, day) => sum + day.count, 0);

  return (
    <section className="sales-rhythm" aria-labelledby="sales-rhythm-title">
      <header>
        <div>
          <p className="sales-section-kicker">CADENCE RÉELLE</p>
          <h2 id="sales-rhythm-title">Ton rythme · 7 jours</h2>
        </div>
        <span><strong>{total}</strong> appels</span>
      </header>
      <ol className="sales-rhythm-bars" aria-label="Appels enregistrés sur les sept derniers jours">
        {days.map((day, index) => (
          <li key={day.date} aria-label={`${day.fullLabel} : ${day.count} appel${day.count > 1 ? "s" : ""}`}>
            <span className="sales-rhythm-value">{day.count}</span>
            <div className="sales-rhythm-track">
              <span
                className={index === days.length - 1 ? "sales-rhythm-bar sales-rhythm-bar--today" : "sales-rhythm-bar"}
                style={{ height: max ? `${Math.max(day.count ? 8 : 0, (day.count / max) * 100)}%` : "0%" }}
              />
            </div>
            <span className="sales-rhythm-day">{day.label}</span>
          </li>
        ))}
      </ol>
      <p className="sales-rhythm-note">Tes appels enregistrés. Aucun objectif imposé.</p>
    </section>
  );
}
