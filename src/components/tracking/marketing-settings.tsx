import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const db = supabase as any;

type SettingsRow = {
  cadence: Record<string, unknown>;
  strategy_notes: string | null;
};

export function MarketingSettingsPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["marketing-settings", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("marketing_settings").select("cadence,strategy_notes").eq("workspace_id", wsId).maybeSingle();
      if (error) throw error;
      return data as SettingsRow | null;
    },
  });

  const [commercial, setCommercial] = useState("1");
  const [lifestyle, setLifestyle] = useState("1");
  const [video, setVideo] = useState("1");
  const [storiesMin, setStoriesMin] = useState("2");
  const [storiesMax, setStoriesMax] = useState("3");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = settings.data?.cadence ?? {};
    setCommercial(String(c.static_commercial_per_week ?? 1));
    setLifestyle(String(c.static_lifestyle_per_week ?? 1));
    setVideo(String(c.simple_video_per_week ?? 1));
    setStoriesMin(String(c.stories_per_day_min ?? 2));
    setStoriesMax(String(c.stories_per_day_max ?? 3));
    setNotes(settings.data?.strategy_notes ?? "");
  }, [settings.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const cadence = {
      static_commercial_per_week: Math.max(0, Number(commercial) || 0),
      static_lifestyle_per_week: Math.max(0, Number(lifestyle) || 0),
      simple_video_per_week: Math.max(0, Number(video) || 0),
      stories_per_day_min: Math.max(0, Number(storiesMin) || 0),
      stories_per_day_max: Math.max(Number(storiesMin) || 0, Number(storiesMax) || 0),
      video_mode: "simple_real_product",
    };
    const { error } = await db.from("marketing_settings").upsert({
      workspace_id: wsId,
      cadence,
      strategy_notes: notes.trim() || null,
      updated_by: u.user!.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "workspace_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cadence marketing mise à jour");
    void qc.invalidateQueries({ queryKey: ["marketing-settings", wsId] });
  }

  return (
    <form onSubmit={save} className="rounded-lg border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Settings2 className="size-4" /></span>
        <div><h3 className="font-semibold">Cadence organique du projet</h3><p className="mt-1 text-sm text-muted-foreground">La stratégie n’est plus codée en dur. La direction peut adapter le rythme sans intervention dev.</p></div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5"><Label>Commercial / semaine</Label><Input type="number" min="0" value={commercial} onChange={(e) => setCommercial(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Lifestyle / semaine</Label><Input type="number" min="0" value={lifestyle} onChange={(e) => setLifestyle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Vidéo simple / semaine</Label><Input type="number" min="0" value={video} onChange={(e) => setVideo(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Stories min / jour</Label><Input type="number" min="0" value={storiesMin} onChange={(e) => setStoriesMin(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Stories max / jour</Label><Input type="number" min="0" value={storiesMax} onChange={(e) => setStoriesMax(e.target.value)} /></div>
      </div>

      <div className="mt-4 space-y-1.5"><Label>Note de direction</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. IA au maximum pour les statiques. Vidéo simple à partir de vraie matière produit." /></div>
      <div className="mt-4 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer la cadence"}</Button></div>
    </form>
  );
}
