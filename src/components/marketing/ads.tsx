import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAMPAIGN_STATUSES, adMetrics, eur, labelOf, pct, ratio } from "@/lib/marketing";
import { num, type AdPerf, type MarketingData } from "./use-marketing";

const NONE = "__none";

export function AdsPanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const [edit, setEdit] = useState<AdPerf | null>(null);
  const ads = m.ads.data ?? [];
  const camp = (id: string | null) => m.campaigns.data?.find((c) => c.id === id)?.name ?? "—";
  const content = (id: string | null) => m.contents.data?.find((c) => c.id === id)?.title ?? "—";
  return (
    <div className="space-y-4">
      <AdForm wsId={wsId} m={m} onSaved={() => m.reload("ad_performance")} />
      <p className="text-xs text-muted-foreground">Saisie manuelle des chiffres Meta et Google. La synchronisation automatique n'est pas encore branchée.</p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>{["Annonce", "Campagne / créa", "Période", "Dépense", "Impr.", "Clics", "CTR", "CPC", "Conv.", "CA", "CPA", "ROAS", ""].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {ads.map((a) => {
              const x = adMetrics({ ...a, spend: Number(a.spend), revenue: Number(a.revenue) });
              return (
                <tr key={a.id} className="border-t">
                  <td className="px-3 py-2"><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.platform === "meta" ? "Meta" : "Google"} · {labelOf(CAMPAIGN_STATUSES, a.status)}</p></td>
                  <td className="px-3 py-2 text-xs"><p>{camp(a.campaign_id)}</p><p className="text-muted-foreground">{content(a.content_id)}</p></td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{a.period_start ?? "?"} → {a.period_end ?? "?"}</td>
                  <td className="px-3 py-2 tabular-nums">{eur(Number(a.spend))}</td>
                  <td className="px-3 py-2 tabular-nums">{a.impressions}</td>
                  <td className="px-3 py-2 tabular-nums">{a.clicks}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(x.ctr)}</td>
                  <td className="px-3 py-2 tabular-nums">{eur(x.cpc)}</td>
                  <td className="px-3 py-2 tabular-nums">{a.conversions}</td>
                  <td className="px-3 py-2 tabular-nums">{eur(Number(a.revenue))}</td>
                  <td className="px-3 py-2 tabular-nums">{eur(x.cpa)}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums">{ratio(x.roas)}</td>
                  <td className="px-3 py-2"><Button size="icon" variant="ghost" aria-label={`Modifier ${a.name}`} onClick={() => setEdit(a)}><Pencil /></Button></td>
                </tr>
              );
            })}
            {ads.length === 0 && <tr><td colSpan={13} className="px-4 py-10 text-center text-muted-foreground">Aucune annonce saisie.</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Modifier l'annonce</DialogTitle></DialogHeader>
          {edit && <AdForm key={edit.id} wsId={wsId} m={m} initial={edit} onSaved={() => { m.reload("ad_performance"); setEdit(null); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdForm({ wsId, m, initial, preset, onSaved }: { wsId: string; m: MarketingData; initial?: AdPerf; preset?: { content_id?: string; distribution_id?: string; campaign_id?: string | null; platform?: string }; onSaved: () => void }) {
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [f, setF] = useState({
    platform: initial?.platform ?? preset?.platform ?? "meta", name: initial?.name ?? "", status: initial?.status ?? "active",
    campaign_id: initial?.campaign_id ?? preset?.campaign_id ?? NONE, content_id: initial?.content_id ?? preset?.content_id ?? NONE,
    distribution_id: initial?.distribution_id ?? preset?.distribution_id ?? null,
    period_start: s(initial?.period_start), period_end: s(initial?.period_end), budget: s(initial?.budget),
    spend: s(initial?.spend), impressions: s(initial?.impressions), reach: s(initial?.reach), clicks: s(initial?.clicks),
    conversions: s(initial?.conversions), revenue: s(initial?.revenue), learning: s(initial?.learning),
  });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = (k: keyof typeof f) => num(String(f[k] ?? "")) ?? 0;
    const vals = { spend: n("spend"), impressions: Math.round(n("impressions")), reach: Math.round(n("reach")), clicks: Math.round(n("clicks")), conversions: Math.round(n("conversions")), revenue: n("revenue") };
    if (Object.values(vals).some((v) => !Number.isFinite(v) || v < 0)) { toast.error("Les chiffres doivent être positifs."); return; }
    setBusy(true);
    const row = {
      platform: f.platform, name: f.name.trim(), status: f.status,
      campaign_id: f.campaign_id === NONE ? null : f.campaign_id, content_id: f.content_id === NONE ? null : f.content_id,
      distribution_id: f.distribution_id, period_start: f.period_start || null, period_end: f.period_end || null,
      budget: num(f.budget), learning: f.learning.trim() || null, ...vals,
    };
    const { data: u } = await supabase.auth.getUser();
    const { error } = initial ? await supabase.from("ad_performance").update(row).eq("id", initial.id)
      : await supabase.from("ad_performance").insert({ ...row, workspace_id: wsId, created_by: u.user!.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Chiffres enregistrés");
    if (!initial) setF({ ...f, name: "", spend: "", impressions: "", reach: "", clicks: "", conversions: "", revenue: "", learning: "" });
    onSaved();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const numField = (k: keyof typeof f, label: string) => <div className="space-y-1.5"><Label>{label}</Label><Input inputMode="decimal" value={String(f[k] ?? "")} onChange={set(k)} /></div>;
  return (
    <form onSubmit={submit} className={initial || preset ? "space-y-3" : "biiz-editor"}>
      {!initial && !preset && <p className="text-sm font-medium">Saisir une annonce Meta / Google</p>}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
        <div className="space-y-1.5"><Label>Plateforme</Label>
          <Select value={f.platform} onValueChange={(v) => setF({ ...f, platform: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="meta">Meta</SelectItem><SelectItem value="google">Google</SelectItem></SelectContent></Select></div>
        <div className="col-span-2 space-y-1.5 md:col-span-3"><Label>Nom de l'annonce</Label><Input required maxLength={160} value={f.name} onChange={set("name")} /></div>
        <div className="col-span-2 space-y-1.5 md:col-span-2"><Label>Statut</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CAMPAIGN_STATUSES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        {!preset && <>
          <div className="col-span-2 space-y-1.5 md:col-span-3"><Label>Campagne</Label>
            <Select value={f.campaign_id ?? NONE} onValueChange={(v) => setF({ ...f, campaign_id: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{m.campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 space-y-1.5 md:col-span-3"><Label>Créa (contenu)</Label>
            <Select value={f.content_id ?? NONE} onValueChange={(v) => setF({ ...f, content_id: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{m.contents.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        </>}
        <div className="space-y-1.5"><Label>Début</Label><Input type="date" value={f.period_start} onChange={set("period_start")} /></div>
        <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={f.period_end} onChange={set("period_end")} /></div>
        {numField("budget", "Budget €")}{numField("spend", "Dépense €")}{numField("impressions", "Impressions")}{numField("reach", "Portée")}
        {numField("clicks", "Clics")}{numField("conversions", "Conversions")}{numField("revenue", "CA €")}
        <div className="col-span-2 space-y-1.5 md:col-span-3"><Label>Apprentissage</Label><Textarea rows={1} value={f.learning} onChange={set("learning")} /></div>
      </div>
      <div className="mt-3 flex justify-end"><Button type="submit" disabled={busy}><Plus />{initial ? "Enregistrer" : "Ajouter"}</Button></div>
    </form>
  );
}
