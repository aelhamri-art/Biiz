import { useQuery } from "@tanstack/react-query";
import { Clapperboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseShots, SHOOT_NOTES } from "@/lib/hadal-m01";
import type { MarketingData } from "./use-marketing";

export function TournagesPanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const briefs = useQuery({ queryKey: ["shooting_briefs", wsId], queryFn: async () => {
    const { data, error } = await supabase.from("shooting_briefs").select("*").eq("workspace_id", wsId).order("source_id");
    if (error) throw error; return data;
  } });
  if (briefs.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (briefs.error) return <p className="text-sm text-destructive">Impossible de charger les tournages.</p>;
  const title = (id: string | null) => m.contents.data?.find((c) => c.id === id)?.title;

  return (
    <div className="space-y-4">
      {(briefs.data ?? []).length === 0 && <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucun brief de tournage dans ce projet.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {(briefs.data ?? []).map((b) => (
          <article key={b.id} className="rounded-lg border bg-card p-4">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clapperboard className="size-3.5" />{b.source_id}{b.duration_label ? ` · ${b.duration_label}` : ""}</p>
                <h3 className="mt-1 text-lg font-semibold leading-snug">{b.concept}</h3>
                {title(b.content_id) && <p className="mt-0.5 truncate text-xs text-primary">Contenu lié : {title(b.content_id)}</p>}
              </div>
            </header>
            <ol className="mt-3 space-y-1.5">
              {parseShots(b.shots).map((s, i) => (
                <li key={i} className="grid grid-cols-[92px_minmax(0,1fr)] gap-2 text-sm">
                  <span className="font-mono text-xs leading-5 text-muted-foreground">{s.time}</span><span>{s.shot}</span>
                </li>
              ))}
            </ol>
            {b.overlay_text && <div className="mt-3 rounded-md bg-muted p-3"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Texte à l’écran</p><p className="mt-1 whitespace-pre-line text-sm font-medium">{b.overlay_text}</p></div>}
            <dl className="mt-3 space-y-2 text-sm">
              {b.material_editing && <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Matière / montage</dt><dd>{b.material_editing}</dd></div>}
              {b.reuse_note && <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Réutilisation</dt><dd>{b.reuse_note}</dd></div>}
            </dl>
          </article>
        ))}
      </div>
      <section className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">Notes</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{SHOOT_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
      </section>
    </div>
  );
}
