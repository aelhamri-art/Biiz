import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STORY_RULES } from "@/lib/hadal-m01";

const FAMILY_TONE: Record<string, string> = {
  PRODUIT: "bg-chart-4/15 text-foreground",
  MOMENT: "bg-primary/10 text-primary",
  PREUVE: "bg-chart-2/15 text-foreground",
  CONVERSION: "bg-foreground text-background",
};
const Fam = ({ f }: { f: string }) => <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${FAMILY_TONE[f] ?? "bg-muted"}`}>{f}</span>;

export function StoriesPanel({ wsId }: { wsId: string }) {
  const tpl = useQuery({ queryKey: ["story_templates", wsId], queryFn: async () => {
    const { data, error } = await supabase.from("story_templates").select("*").eq("workspace_id", wsId).order("position");
    if (error) throw error; return data;
  } });
  const cyc = useQuery({ queryKey: ["story_cycle", wsId], queryFn: async () => {
    const { data, error } = await supabase.from("story_cycle").select("*").eq("workspace_id", wsId).order("position");
    if (error) throw error; return data;
  } });
  if (tpl.isLoading || cyc.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (tpl.error || cyc.error) return <p className="text-sm text-destructive">Impossible de charger les stories.</p>;
  const total = (cyc.data ?? []).reduce((a, d) => a + (d.story_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold">4 familles de stories</h3>
          <p className="text-xs text-muted-foreground">Une structure réutilisable, pas des contenus figés.</p>
        </div>
        {(tpl.data ?? []).length === 0 ? <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucune famille de stories dans ce projet.</p> : (
          <div className="grid gap-3 md:grid-cols-2">
            {tpl.data!.map((t) => (
              <article key={t.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between gap-2"><Fam f={t.family} /><p className="text-xs font-medium text-muted-foreground">{t.objective}</p></div>
                <p className="mt-3 text-lg font-semibold leading-snug">« {t.example_text} »</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Matière réelle</dt><dd>{t.real_material}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Règle de réutilisation</dt><dd>{t.reuse_rule}</dd></div>
                  <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Mesure</dt><dd>{t.measurement}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="text-base font-semibold">Cycle de 7 jours</h3>
          {total > 0 && <p className="text-xs text-muted-foreground">{total} stories / semaine</p>}
        </div>
        <ol className="divide-y rounded-lg border bg-card">
          {(cyc.data ?? []).map((d) => {
            const seq = Array.isArray(d.sequence) ? (d.sequence as unknown[]).map(String) : [];
            return (
              <li key={d.id} className="grid gap-2 p-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4">
                <div className="flex items-center gap-2 sm:block">
                  <p className="font-semibold">{d.weekday}</p>
                  {d.story_count !== null && <p className="text-xs text-muted-foreground">{d.story_count} stories</p>}
                </div>
                <div>
                  <div className="flex flex-wrap gap-1">{seq.map((f, i) => <Fam key={i} f={f} />)}</div>
                  {d.copy_material && <p className="mt-2 whitespace-pre-line text-sm">{d.copy_material}</p>}
                  {d.notes && <p className="mt-1 text-xs text-muted-foreground">{d.notes}</p>}
                </div>
              </li>
            );
          })}
          {(cyc.data ?? []).length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Aucun cycle défini.</li>}
        </ol>
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Règles</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{STORY_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
      </section>
    </div>
  );
}
