import type { Activity } from "@/lib/sales";
import { dailyPerformanceSeries } from "@/lib/sales";

const WIDTH = 720;
const BASELINE = 190;
const HEIGHT = 150;

function linePath(values: number[], max: number) {
  return values.map((value, index) => {
    const x = 30 + index * 110;
    const y = BASELINE - (value / max) * HEIGHT;
    return `${index === 0 ? "M" : "L"}${x} ${y}`;
  }).join(" ");
}

/** Courbe futuriste, mais strictement dérivée des activités enregistrées. */
export function PerformancePulse({ activities, calm = false }: { activities: Pick<Activity, "created_at" | "outcome">[]; calm?: boolean }) {
  const days = dailyPerformanceSeries(activities);
  const max = Math.max(1, ...days.flatMap((day) => [day.calls, day.useful]));
  const calls = days.map((day) => day.calls);
  const useful = days.map((day) => day.useful);
  const callsPath = linePath(calls, max);
  const usefulPath = linePath(useful, max);
  const areaPath = `${callsPath} L690 ${BASELINE} L30 ${BASELINE} Z`;
  const totalCalls = calls.reduce((sum, value) => sum + value, 0);
  const totalUseful = useful.reduce((sum, value) => sum + value, 0);

  return (
    <div className="sales-performance-pulse" data-calm={calm ? "true" : undefined}>
      <div className="sales-performance-legend" aria-hidden="true">
        <span className="sales-performance-legend--calls">Appels</span>
        <span className="sales-performance-legend--useful">Conversations utiles</span>
        <span>{max} max.</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} 225`} role="img" aria-label={`Sept derniers jours : ${totalCalls} appels et ${totalUseful} conversations utiles`}>
        <title>Activité réelle sur sept jours</title>
        <defs>
          <linearGradient id="sales-performance-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="sales-performance-stop--top" />
            <stop offset="100%" className="sales-performance-stop--bottom" />
          </linearGradient>
        </defs>
        <g className="sales-performance-grid" aria-hidden="true">
          {[40, 115, 190].map((y) => <path key={y} d={`M30 ${y}H690`} />)}
          {days.map((day, index) => <path key={day.date} d={`M${30 + index * 110} 30V190`} />)}
        </g>
        <path className="sales-performance-area" d={areaPath} />
        <path className="sales-performance-line sales-performance-line--calls" d={callsPath} />
        <path className="sales-performance-line sales-performance-line--useful" d={usefulPath} />
        {days.map((day, index) => (
          <g key={day.date} className="sales-performance-points">
            <circle cx={30 + index * 110} cy={BASELINE - (day.calls / max) * HEIGHT} r="4"><title>{`${day.fullLabel} : ${day.calls} appels`}</title></circle>
            <circle className="sales-performance-point--useful" cx={30 + index * 110} cy={BASELINE - (day.useful / max) * HEIGHT} r="3"><title>{`${day.fullLabel} : ${day.useful} conversations utiles`}</title></circle>
          </g>
        ))}
      </svg>
      <div className="sales-performance-axis" aria-hidden="true">{days.map((day) => <span key={day.date}>{day.label}</span>)}</div>
      <table className="sr-only"><caption>Détail des courbes sur sept jours</caption><thead><tr><th>Jour</th><th>Appels</th><th>Conversations utiles</th></tr></thead><tbody>{days.map((day) => <tr key={day.date}><th>{day.fullLabel}</th><td>{day.calls}</td><td>{day.useful}</td></tr>)}</tbody></table>
    </div>
  );
}

/** Jauge de compétence : anneau vide et valeur absente si le dénominateur est nul. */
export function SkillGauge({ value, label, detail }: { value: number | null; label: string; detail: string }) {
  return (
    <div className="sales-skill-gauge">
      <div className="sales-skill-ring">
        <svg viewBox="0 0 84 84" aria-hidden="true">
          <circle className="sales-skill-track" cx="42" cy="42" r="34" pathLength="100" />
          <circle className="sales-skill-progress" cx="42" cy="42" r="34" pathLength="100" strokeDasharray={`${value ?? 0} 100`} />
        </svg>
        <strong>{value === null ? "—" : `${value}%`}</strong>
      </div>
      <div><h3>{label}</h3><p>{detail}</p></div>
    </div>
  );
}
