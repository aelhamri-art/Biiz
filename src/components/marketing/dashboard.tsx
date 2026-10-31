import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HADAL_M01_CADENCE, aggregate, parseCadence, type CadenceItem, type Row } from "@/lib/marketing";
import { aggregateInput, type MarketingData } from "./use-marketing";
import { KpiStrip } from "./campagnes";

export function DashboardPanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const agg = useMemo(() => aggregate(aggregateInput(m)), [m.links.data, m.contents.data, m.dists.data, m.clicks.data, m.conversions.data, m.ads.data]);
  const total = [...agg.byChannel.values()].reduce<Row>((t, r) => ({ spend: t.spend + r.spend, revenue: t.revenue + r.revenue, conversions: t.conversions + r.conversions, clicks: t.clicks + r.clicks, impressions: t.impressions + r.impressions, reach: t.reach + r.reach, engagement: t.engagement + r.engagement }), { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, reach: 0, engagement: 0 });
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (m.contents.data ?? []).filter((c) => c.publish_date && c.publish_date >= today && c.status !== "publie").sort((a, b) => (a.publish_date! < b.publish_date! ? -1 : 1)).slice(0, 6);
  const toValidate = (m.contents.data ?? []).filter((c) => c.status === "a_valider").length;
  const active = (m.campaigns.data ?? []).filter((c) => c.status === "active").length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-md border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Campagnes actives</p><p className="text-xl font-semibold">{active}</p></div>
        <div className="rounded-md border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">À valider</p><p className="text-xl font-semibold">{toValidate}</p></div>
        <div className="rounded-md border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Diffusions</p><p className="text-xl font-semibold">{m.dists.data?.length ?? 0}</p></div>
      </div>
      <KpiStrip r={total} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">À publier prochainement</h3>
          <ul className="mt-2 divide-y text-sm">
            {upcoming.map((c) => <li key={c.id} className="flex justify-between gap-2 py-2"><span>{c.title}</span><span className="text-xs text-muted-foreground">{c.publish_date}</span></li>)}
            {upcoming.length === 0 && <li className="py-3 text-muted-foreground">Rien de daté à venir.</li>}
          </ul>
        </section>
        <CadenceEditor wsId={wsId} />
      </div>
    </div>
  );
}

function CadenceEditor({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cadence", wsId], queryFn: async () => { const { data, error } = await supabase.from("workspaces").select("cadence").eq("id", wsId).single(); if (error) throw error; return parseCadence(data.cadence); } });
  const [items, setItems] = useState<CadenceItem[]>([]);
  useEffect(() => { if (q.data) setItems(q.data); }, [q.data]);
  async function save(next: CadenceItem[]) {
    const { error } = await supabase.from("workspaces").update({ cadence: next }).eq("id", wsId);
    if (error) { toast.error(error.message); return; }
    toast.success("Cadence enregistrée"); void qc.invalidateQueries({ queryKey: ["cadence", wsId] });
  }
  const upd = (i: number, p: Partial<CadenceItem>) => setItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Cadence de ce projet</h3>
        {items.length === 0 && <Button size="sm" variant="outline" onClick={() => setItems(HADAL_M01_CADENCE)}>Modèle HADAL M01</Button>}</div>
      <ul className="mt-3 space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input className="h-9 w-16" inputMode="numeric" aria-label="Nombre" value={it.count} onChange={(e) => upd(i, { count: Math.max(0, Number(e.target.value) || 0) })} />
            <Input className="h-9 flex-1" aria-label="Type de contenu" value={it.label} onChange={(e) => upd(i, { label: e.target.value.slice(0, 60) })} />
            <Select value={it.period} onValueChange={(v) => upd(i, { period: v as CadenceItem["period"] })}><SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="jour">/ jour</SelectItem><SelectItem value="semaine">/ semaine</SelectItem><SelectItem value="mois">/ mois</SelectItem></SelectContent></Select>
            <Button size="icon" variant="ghost" aria-label="Retirer" onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between gap-2">
        <Button size="sm" variant="ghost" onClick={() => setItems([...items, { label: "", count: 1, period: "semaine" }])}><Plus />Ligne</Button>
        <Button size="sm" onClick={() => save(items.filter((x) => x.label.trim()))}>Enregistrer</Button>
      </div>
    </section>
  );
}
