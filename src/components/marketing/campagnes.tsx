import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CAMPAIGN_STATUSES, adMetrics, aggregate, channelLabel, eur, labelOf, ratio, type Row } from "@/lib/marketing";
import { aggregateInput, num, type Campaign, type MarketingData } from "./use-marketing";

export function KpiStrip({ r }: { r?: Row }) {
  const x = r ?? { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, engagement: 0 };
  const m = adMetrics(x);
  const items: [string, string][] = [["Dépense", eur(x.spend)], ["CA attribué", eur(x.revenue)], ["Conversions", String(x.conversions)], ["Clics", String(x.clicks)], ["CPA", eur(m.cpa)], ["ROAS", ratio(m.roas)]];
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map(([k, v]) => <div key={k} className="rounded-md border bg-card px-3 py-2"><dt className="text-[11px] text-muted-foreground">{k}</dt><dd className="mt-0.5 font-semibold tabular-nums">{v}</dd></div>)}
    </dl>
  );
}

export function CampagnesPanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const [open, setOpen] = useState<Campaign | null>(null);
  const agg = useMemo(() => aggregate(aggregateInput(m)), [m.links.data, m.contents.data, m.dists.data, m.clicks.data, m.conversions.data, m.ads.data]);
  const list = m.campaigns.data ?? [];
  return (
    <div className="space-y-4">
      <CampaignForm wsId={wsId} onSaved={() => m.reload("campaigns")} />
      {list.length === 0 && <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune campagne. Créez-en une ci-dessus, ex. « HADAL — Lancement App — M01 ».</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.map((c) => {
          const r = agg.byCampaign.get(c.id);
          const nContents = (m.contents.data ?? []).filter((x) => x.campaign_id === c.id).length;
          return (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(c)} className="w-full rounded-lg border bg-card p-4 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{c.name}</p>
                  <span className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{labelOf(CAMPAIGN_STATUSES, c.status)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.objective || "Objectif à préciser"}</p>
                <p className="mt-3 text-xs text-muted-foreground">{nContents} contenu{nContents > 1 ? "s" : ""} · {c.start_date ?? "?"} → {c.end_date ?? "?"} · budget {eur(c.budget === null ? null : Number(c.budget))}</p>
                <p className="mt-1 text-xs tabular-nums">CA {eur(r?.revenue ?? 0)} · dépense {eur(r?.spend ?? 0)} · ROAS {ratio(adMetrics(r ?? { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }).roas)}</p>
              </button>
            </li>
          );
        })}
      </ul>
      <CampaignSheet wsId={wsId} c={open} m={m} agg={agg} onClose={() => setOpen(null)} />
    </div>
  );
}

function CampaignForm({ wsId, initial, onSaved }: { wsId: string; initial?: Campaign; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "", objective: initial?.objective ?? "", target: initial?.target ?? "", offer: initial?.offer ?? "",
    start_date: initial?.start_date ?? "", end_date: initial?.end_date ?? "", budget: initial?.budget?.toString() ?? "", status: initial?.status ?? "active",
  });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const budget = num(f.budget);
    if (budget !== null && (!Number.isFinite(budget) || budget < 0)) { toast.error("Budget invalide"); return; }
    setBusy(true);
    const row = { name: f.name.trim(), objective: f.objective.trim() || null, target: f.target.trim() || null, offer: f.offer.trim() || null, start_date: f.start_date || null, end_date: f.end_date || null, budget, status: f.status };
    const { data: u } = await supabase.auth.getUser();
    const { error } = initial
      ? await supabase.from("campaigns").update(row).eq("id", initial.id)
      : await supabase.from("campaigns").insert({ ...row, workspace_id: wsId, created_by: u.user!.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial ? "Campagne mise à jour" : "Campagne créée");
    if (!initial) setF({ ...f, name: "", objective: "", target: "", offer: "", budget: "" });
    onSaved();
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={submit} className={initial ? "space-y-3" : "biiz-editor"}>
      {!initial && <p className="flex items-center gap-2 text-sm font-medium"><Target className="size-4" />Nouvelle campagne</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-6">
        <div className="space-y-1.5 md:col-span-3"><Label>Nom</Label><Input required maxLength={160} placeholder="HADAL — Lancement App — M01" value={f.name} onChange={set("name")} /></div>
        <div className="space-y-1.5"><Label>Début</Label><Input type="date" value={f.start_date} onChange={set("start_date")} /></div>
        <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={f.end_date} onChange={set("end_date")} /></div>
        <div className="space-y-1.5"><Label>Budget (€)</Label><Input inputMode="decimal" value={f.budget} onChange={set("budget")} /></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Objectif</Label><Input placeholder="Téléchargements et premières commandes" value={f.objective} onChange={set("objective")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Cible</Label><Input placeholder="Habitants La Teste 18-40" value={f.target} onChange={set("target")} /></div>
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CAMPAIGN_STATUSES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1.5 md:col-span-6"><Label>Offre</Label><Textarea rows={2} placeholder="Livraison offerte sur la première commande" value={f.offer} onChange={set("offer")} /></div>
      </div>
      <div className="mt-3 flex justify-end"><Button type="submit" disabled={busy}>{initial ? "Enregistrer" : <><Plus />Créer la campagne</>}</Button></div>
    </form>
  );
}

function CampaignSheet({ wsId, c, m, agg, onClose }: { wsId: string; c: Campaign | null; m: MarketingData; agg: ReturnType<typeof aggregate>; onClose: () => void }) {
  if (!c) return null;
  const contents = (m.contents.data ?? []).filter((x) => x.campaign_id === c.id);
  const ids = new Set(contents.map((x) => x.id));
  const dists = (m.dists.data ?? []).filter((d) => d.campaign_id === c.id || ids.has(d.content_id));
  const ads = (m.ads.data ?? []).filter((a) => a.campaign_id === c.id || (a.content_id && ids.has(a.content_id)));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{c.name}</DialogTitle></DialogHeader>
        <KpiStrip r={agg.byCampaign.get(c.id)} />
        <CampaignForm key={c.id} wsId={wsId} initial={c} onSaved={() => m.reload("campaigns")} />
        <section><h3 className="text-sm font-semibold">Contenus ({contents.length})</h3>
          <ul className="mt-2 divide-y rounded-md border text-sm">
            {contents.map((x) => { const r = agg.byContent.get(x.id); return <li key={x.id} className="flex flex-wrap justify-between gap-2 px-3 py-2"><span>{x.title}</span><span className="text-xs tabular-nums text-muted-foreground">CA {eur(r?.revenue ?? 0)} · {r?.conversions ?? 0} conv.</span></li>; })}
            {contents.length === 0 && <li className="px-3 py-4 text-muted-foreground">Rattachez des contenus depuis l'onglet Contenus.</li>}
          </ul>
        </section>
        <section><h3 className="text-sm font-semibold">Diffusions ({dists.length})</h3>
          <p className="mt-1 text-sm text-muted-foreground">{dists.map((d) => channelLabel(d.channel)).join(" · ") || "Aucune diffusion."}</p>
        </section>
        <section><h3 className="text-sm font-semibold">Ads ({ads.length})</h3>
          <ul className="mt-2 space-y-1 text-sm">{ads.map((a) => { const x = adMetrics({ ...a, spend: Number(a.spend), revenue: Number(a.revenue) }); return <li key={a.id} className="flex flex-wrap justify-between gap-2"><span>{a.platform === "meta" ? "Meta" : "Google"} · {a.name}</span><span className="tabular-nums text-muted-foreground">{eur(Number(a.spend))} · CPA {eur(x.cpa)} · ROAS {ratio(x.roas)}</span></li>; })}</ul>
        </section>
      </DialogContent>
    </Dialog>
  );
}
