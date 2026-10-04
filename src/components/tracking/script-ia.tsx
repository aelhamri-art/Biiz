import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { generateShootingScript, type ScriptResult } from "@/lib/script-ai.functions";

export function ScriptIAPanel({ wsId }: { wsId: string }) {
  const gen = useServerFn(generateShootingScript);
  const qc = useQueryClient();
  const [brief, setBrief] = useState("");
  const [format, setFormat] = useState("Reel vertical 9:16");
  const [duree, setDuree] = useState("30 secondes");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<ScriptResult | null>(null);
  const [saving, setSaving] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      setRes(await gen({ data: { wsId, brief, format, duree } }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "La génération a échoué.");
    } finally { setBusy(false); }
  }

  async function save() {
    if (!res) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const plans = res.plans.map((p) => `${p.n}. ${p.plan} — ${p.cadrage}, ${p.duree}${p.lieu ? `, ${p.lieu}` : ""}${p.notes ? ` (${p.notes})` : ""}`).join("\n");
    const body = `Brief :\n${brief}\n\nAccroche : ${res.accroche}\n\nSCRIPT\n${res.script}\n\nPLANS À PRODUIRE\n${plans}\n\nMatériel : ${res.materiel.join(", ")}`;
    const { data: c, error } = await supabase.from("contents").insert({
      workspace_id: wsId, type: "script", title: res.titre, body, created_by: u.user!.id,
    }).select("id").single();
    if (!error && res.plans.length) {
      await supabase.from("tasks").insert({
        workspace_id: wsId, title: `Tournage : ${res.titre}`, description: `Plans à filmer :\n${plans}`, content_id: c.id,
      });
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["contents", wsId] });
    qc.invalidateQueries({ queryKey: ["tasks", wsId] });
    toast.success("Script enregistré dans Contenus + tâche de tournage créée");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={run} className="h-fit space-y-4 rounded-lg border bg-card p-5">
        <p className="text-sm font-medium">Brief → script de tournage</p>
        <div className="space-y-1.5"><Label>Brief</Label>
          <Textarea required minLength={10} rows={9} value={brief} onChange={(e) => setBrief(e.target.value)}
            placeholder="Objectif, cible, produit/offre, message clé, ton, lieu de tournage, contraintes…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Format</Label><Input value={format} onChange={(e) => setFormat(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Durée</Label><Input value={duree} onChange={(e) => setDuree(e.target.value)} /></div>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Génération en cours… (≈30 s)" : "Générer avec l'IA"}</Button>
        {err && <p className="text-sm text-destructive">{err}</p>}
      </form>

      <div className="rounded-lg border bg-card p-5">
        {!res ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Le script et la liste des plans apparaîtront ici.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{res.titre}</h3>
                {res.accroche && <p className="text-sm text-muted-foreground">Accroche : {res.accroche}</p>}
              </div>
              <Button onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer dans Contenus"}</Button>
            </div>
            <section>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Script</p>
              <p className="whitespace-pre-wrap text-sm">{res.script}</p>
            </section>
            {res.plans.length > 0 && (
              <section>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Plans à produire · {res.plans.length}</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr><th className="py-1 pr-2">#</th><th className="pr-2">Plan</th><th className="pr-2">Cadrage</th><th className="pr-2">Durée</th><th className="pr-2">Lieu</th><th>Notes</th></tr>
                    </thead>
                    <tbody>
                      {res.plans.map((p, i) => (
                        <tr key={i} className="border-t align-top">
                          <td className="py-2 pr-2">{p.n ?? i + 1}</td><td className="pr-2">{p.plan}</td><td className="pr-2">{p.cadrage}</td>
                          <td className="pr-2">{p.duree}</td><td className="pr-2">{p.lieu}</td><td className="text-muted-foreground">{p.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {res.materiel.length > 0 && <p className="text-sm"><span className="text-muted-foreground">Matériel :</span> {res.materiel.join(", ")}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
