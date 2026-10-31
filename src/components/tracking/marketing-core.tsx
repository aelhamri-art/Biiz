import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Megaphone, Plus, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MarketingSettingsPanel } from "@/components/tracking/marketing-settings";

const db = supabase as any;

type Campaign = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  objective: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget_planned: number | null;
  target_summary: string | null;
  offer_summary: string | null;
  notes: string | null;
};

type ContentLite = { id: string; title: string; campaign_id?: string | null };

type Ad = {
  id: string;
  campaign_id: string | null;
  content_id: string | null;
  platform: "meta" | "google" | "other";
  campaign_name: string;
  ad_group_name: string | null;
  ad_name: string | null;
  audience_summary: string | null;
  budget_planned: number | null;
  spend: number;
  impressions: number;
  reach: number | null;
  clicks: number;
  conversions: number;
  revenue: number;
  status: string;
  learning: string | null;
};

type Metric = {
  campaign_id: string | null;
  impressions: number;
  reach: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  profile_visits: number;
};

function slugifyLocal(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function money(v: number | null | undefined) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(v ?? 0));
}

function ratio(n: number, d: number, digits = 1) {
  return d > 0 ? Number((n / d).toFixed(digits)) : 0;
}

function pct(n: number, d: number) {
  return d > 0 ? `${((n / d) * 100).toFixed(1)} %` : "—";
}

function SectionTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mb-5 border-b pb-4">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-semibold uppercase tracking-wider">{title}</span></div>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function CampaignForm({ wsId, onCreated }: { wsId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [target, setTarget] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("campaigns").insert({
      workspace_id: wsId,
      name: name.trim(),
      slug: slugifyLocal(name),
      objective: objective.trim() || null,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
      budget_planned: budget ? Number(budget) : null,
      target_summary: target.trim() || null,
      offer_summary: offer.trim() || null,
      created_by: u.user!.id,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Campagne créée");
    setName(""); setObjective(""); setStartDate(""); setEndDate(""); setBudget(""); setTarget(""); setOffer("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5 md:col-span-2"><Label>Campagne</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="HADAL — Lancement App — M01" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Objectif business</Label><Input value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Commandes directes" /></div>
        <div className="space-y-1.5"><Label>Statut</Label><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="draft">Brouillon</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Pause</SelectItem><SelectItem value="completed">Terminée</SelectItem>
        </SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Budget prévu €</Label><Input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Début</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Cible</Label><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="18–35 ans · La Teste / Bassin" /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Offre / promesse</Label><Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Commander HADAL directement" /></div>
      </div>
      <div className="mt-4 flex justify-end"><Button type="submit" disabled={busy}><Plus />{busy ? "Création…" : "Créer la campagne"}</Button></div>
    </form>
  );
}

export function CampaignsPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("campaigns").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Campaign[];
    },
  });
  const contents = useQuery({
    queryKey: ["campaign-content-counts", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("contents").select("id,campaign_id").eq("workspace_id", wsId);
      if (error) throw error;
      return data as Array<{ id: string; campaign_id: string | null }>;
    },
  });
  const ads = useQuery({
    queryKey: ["campaign-ad-counts", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("marketing_ads").select("id,campaign_id,spend,revenue,conversions").eq("workspace_id", wsId);
      if (error) throw error;
      return data as Array<{ id: string; campaign_id: string | null; spend: number; revenue: number; conversions: number }>;
    },
  });
  const counts = useMemo(() => {
    const out: Record<string, { contents: number; ads: number; spend: number; revenue: number; conversions: number }> = {};
    contents.data?.forEach((c) => { if (c.campaign_id) (out[c.campaign_id] ??= { contents: 0, ads: 0, spend: 0, revenue: 0, conversions: 0 }).contents++; });
    ads.data?.forEach((a) => { if (a.campaign_id) { const x = out[a.campaign_id] ??= { contents: 0, ads: 0, spend: 0, revenue: 0, conversions: 0 }; x.ads++; x.spend += Number(a.spend ?? 0); x.revenue += Number(a.revenue ?? 0); x.conversions += Number(a.conversions ?? 0); } });
    return out;
  }, [contents.data, ads.data]);
  const reload = () => { void qc.invalidateQueries({ queryKey: ["campaigns", wsId] }); void qc.invalidateQueries({ queryKey: ["campaign-content-counts", wsId] }); void qc.invalidateQueries({ queryKey: ["campaign-ad-counts", wsId] }); };

  return (
    <div className="space-y-6">
      <SectionTitle icon={<Target className="size-4" />} title="Campagnes" text="Le niveau qui relie stratégie, contenus, paid, tracking et résultat business." />
      <CampaignForm wsId={wsId} onCreated={reload} />
      <MarketingSettingsPanel wsId={wsId} />
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr>
            <th className="px-4 py-3">Campagne</th><th className="px-4 py-3">Objectif</th><th className="px-4 py-3">Période</th><th className="px-4 py-3 text-right">Contenus</th><th className="px-4 py-3 text-right">Ads</th><th className="px-4 py-3 text-right">Dépense</th><th className="px-4 py-3 text-right">CA</th>
          </tr></thead>
          <tbody>{campaigns.data?.map((c) => {
            const x = counts[c.id] ?? { contents: 0, ads: 0, spend: 0, revenue: 0, conversions: 0 };
            return <tr key={c.id} className="border-t"><td className="px-4 py-3"><div className="font-medium">{c.name}</div><div className="mt-1 text-xs text-muted-foreground">{c.status}</div></td><td className="px-4 py-3">{c.objective ?? "—"}</td><td className="px-4 py-3 text-xs text-muted-foreground">{c.start_date ?? "—"} → {c.end_date ?? "—"}</td><td className="px-4 py-3 text-right tabular-nums">{x.contents}</td><td className="px-4 py-3 text-right tabular-nums">{x.ads}</td><td className="px-4 py-3 text-right tabular-nums">{money(x.spend)}</td><td className="px-4 py-3 text-right font-medium tabular-nums">{money(x.revenue)}</td></tr>;
          })}{campaigns.data?.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune campagne. Commence par le résultat business à obtenir.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdsForm({ wsId, onCreated }: { wsId: string; onCreated: () => void }) {
  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("campaigns").select("id,name").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error; return data as Array<{ id: string; name: string }>;
    },
  });
  const contents = useQuery({
    queryKey: ["contents-lite", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("contents").select("id,title,campaign_id").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error; return data as ContentLite[];
    },
  });
  const [platform, setPlatform] = useState("meta");
  const [campaignId, setCampaignId] = useState("none");
  const [contentId, setContentId] = useState("none");
  const [campaignName, setCampaignName] = useState("");
  const [adGroup, setAdGroup] = useState("");
  const [adName, setAdName] = useState("");
  const [audience, setAudience] = useState("");
  const [budget, setBudget] = useState("");
  const [spend, setSpend] = useState("");
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");
  const [revenue, setRevenue] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("marketing_ads").insert({
      workspace_id: wsId,
      platform,
      campaign_id: campaignId === "none" ? null : campaignId,
      content_id: contentId === "none" ? null : contentId,
      campaign_name: campaignName.trim(),
      ad_group_name: adGroup.trim() || null,
      ad_name: adName.trim() || null,
      audience_summary: audience.trim() || null,
      budget_planned: budget ? Number(budget) : null,
      spend: Number(spend || 0),
      impressions: Number(impressions || 0),
      clicks: Number(clicks || 0),
      conversions: Number(conversions || 0),
      revenue: Number(revenue || 0),
      status: "active",
      created_by: u.user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Ads ajoutée");
    setCampaignName(""); setAdGroup(""); setAdName(""); setAudience(""); setBudget(""); setSpend(""); setImpressions(""); setClicks(""); setConversions(""); setRevenue("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5"><Label>Plateforme</Label><Select value={platform} onValueChange={setPlatform}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="meta">Meta</SelectItem><SelectItem value="google">Google</SelectItem><SelectItem value="other">Autre</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Campagne BIIZ</Label><Select value={campaignId} onValueChange={setCampaignId}><SelectTrigger><SelectValue placeholder="Campagne" /></SelectTrigger><SelectContent><SelectItem value="none">Aucune</SelectItem>{campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Créa / contenu</Label><Select value={contentId} onValueChange={setContentId}><SelectTrigger><SelectValue placeholder="Contenu" /></SelectTrigger><SelectContent><SelectItem value="none">Aucun</SelectItem>{contents.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Budget €</Label><Input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Nom campagne régie</Label><Input required value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="HADAL App M01" /></div>
        <div className="space-y-1.5"><Label>Ad set / groupe</Label><Input value={adGroup} onChange={(e) => setAdGroup(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Annonce</Label><Input value={adName} onChange={(e) => setAdName(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Audience / ciblage</Label><Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Local · 18–35 · La Teste" /></div>
        <div className="space-y-1.5"><Label>Dépense €</Label><Input type="number" min="0" step="0.01" value={spend} onChange={(e) => setSpend(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Impressions</Label><Input type="number" min="0" value={impressions} onChange={(e) => setImpressions(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Clics</Label><Input type="number" min="0" value={clicks} onChange={(e) => setClicks(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Conversions</Label><Input type="number" min="0" step="0.01" value={conversions} onChange={(e) => setConversions(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>CA €</Label><Input type="number" min="0" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end"><Button type="submit"><Plus />Ajouter</Button></div>
    </form>
  );
}

export function AdsPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const ads = useQuery({
    queryKey: ["marketing-ads", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("marketing_ads").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error; return data as Ad[];
    },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: ["marketing-ads", wsId] });

  return (
    <div className="space-y-6">
      <SectionTitle icon={<Megaphone className="size-4" />} title="Paid media" text="BIIZ pilote la décision. Meta Ads Manager et Google Ads restent les outils d’exécution." />
      <AdsForm wsId={wsId} onCreated={reload} />
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Ads</th><th className="px-4 py-3">Plateforme</th><th className="px-4 py-3 text-right">Dépense</th><th className="px-4 py-3 text-right">Impr.</th><th className="px-4 py-3 text-right">CTR</th><th className="px-4 py-3 text-right">CPC</th><th className="px-4 py-3 text-right">Conv.</th><th className="px-4 py-3 text-right">CPA</th><th className="px-4 py-3 text-right">CA</th><th className="px-4 py-3 text-right">ROAS</th></tr></thead>
        <tbody>{ads.data?.map((a) => <tr key={a.id} className="border-t"><td className="px-4 py-3"><div className="font-medium">{a.campaign_name}</div><div className="text-xs text-muted-foreground">{a.ad_group_name ?? "—"}{a.ad_name ? ` · ${a.ad_name}` : ""}</div></td><td className="px-4 py-3 uppercase">{a.platform}</td><td className="px-4 py-3 text-right">{money(a.spend)}</td><td className="px-4 py-3 text-right">{a.impressions}</td><td className="px-4 py-3 text-right">{pct(a.clicks, a.impressions)}</td><td className="px-4 py-3 text-right">{a.clicks ? money(a.spend / a.clicks) : "—"}</td><td className="px-4 py-3 text-right">{a.conversions}</td><td className="px-4 py-3 text-right">{a.conversions ? money(a.spend / a.conversions) : "—"}</td><td className="px-4 py-3 text-right font-medium">{money(a.revenue)}</td><td className="px-4 py-3 text-right">{a.spend ? ratio(a.revenue, a.spend, 2).toFixed(2) : "—"}</td></tr>)}{ads.data?.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">Aucune campagne paid enregistrée.</td></tr>}</tbody>
      </table></div>
    </div>
  );
}

export function PerformancePanel({ wsId }: { wsId: string }) {
  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => { const { data, error } = await db.from("campaigns").select("id,name").eq("workspace_id", wsId); if (error) throw error; return data as Array<{ id: string; name: string }>; },
  });
  const ads = useQuery({
    queryKey: ["performance-ads", wsId],
    queryFn: async () => { const { data, error } = await db.from("marketing_ads").select("campaign_id,spend,impressions,clicks,conversions,revenue").eq("workspace_id", wsId); if (error) throw error; return data as Ad[]; },
  });
  const metrics = useQuery({
    queryKey: ["marketing-metrics", wsId],
    queryFn: async () => { const { data, error } = await db.from("marketing_metrics").select("*").eq("workspace_id", wsId); if (error) throw error; return data as Metric[]; },
  });
  const events = useQuery({
    queryKey: ["performance-events", wsId],
    queryFn: async () => { const { data, error } = await db.from("events").select("name,props,link_id,first_link_id").eq("workspace_id", wsId).limit(20000); if (error) throw error; return data as Array<{ name: string; props: Record<string, unknown> | null; link_id: string | null; first_link_id: string | null }>; },
  });

  const totals = useMemo(() => {
    const out = { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, purchases: 0, trackedRevenue: 0 };
    ads.data?.forEach((a) => { out.spend += Number(a.spend ?? 0); out.impressions += Number(a.impressions ?? 0); out.clicks += Number(a.clicks ?? 0); out.conversions += Number(a.conversions ?? 0); out.revenue += Number(a.revenue ?? 0); });
    metrics.data?.forEach((m) => { out.spend += Number(m.spend ?? 0); out.impressions += Number(m.impressions ?? 0); out.clicks += Number(m.clicks ?? 0); out.conversions += Number(m.conversions ?? 0); out.revenue += Number(m.revenue ?? 0); });
    events.data?.filter((e) => e.name === "purchase").forEach((e) => { out.purchases++; const r = Number((e.props as any)?.revenue ?? 0); if (Number.isFinite(r)) out.trackedRevenue += r; });
    return out;
  }, [ads.data, metrics.data, events.data]);

  const byCampaign = useMemo(() => {
    const out: Record<string, { spend: number; clicks: number; conversions: number; revenue: number }> = {};
    const add = (id: string | null, spend: number, clicks: number, conversions: number, revenue: number) => {
      if (!id) return; const x = out[id] ??= { spend: 0, clicks: 0, conversions: 0, revenue: 0 }; x.spend += spend; x.clicks += clicks; x.conversions += conversions; x.revenue += revenue;
    };
    ads.data?.forEach((a) => add(a.campaign_id, Number(a.spend ?? 0), Number(a.clicks ?? 0), Number(a.conversions ?? 0), Number(a.revenue ?? 0)));
    metrics.data?.forEach((m) => add(m.campaign_id, Number(m.spend ?? 0), Number(m.clicks ?? 0), Number(m.conversions ?? 0), Number(m.revenue ?? 0)));
    return out;
  }, [ads.data, metrics.data]);

  const stats = [
    ["Dépense paid", money(totals.spend)],
    ["Conversions déclarées", String(totals.conversions)],
    ["CA déclaré", money(totals.revenue)],
    ["ROAS", totals.spend ? ratio(totals.revenue, totals.spend, 2).toFixed(2) : "—"],
    ["Purchases BIIZ", String(totals.purchases)],
    ["CA tracké BIIZ", money(totals.trackedRevenue)],
  ];

  return (
    <div className="space-y-6">
      <SectionTitle icon={<BarChart3 className="size-4" />} title="Performance" text="Le cockpit business : ce qu’on a dépensé, ce qui a converti et le CA réellement attribuable." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{stats.map(([label, value]) => <div key={label} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}</div>
      {totals.purchases === 0 && <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><div className="flex items-center gap-2 font-medium"><TrendingUp className="size-4 text-primary" />Tracking business à brancher</div><p className="mt-2 text-muted-foreground">Le moteur BIIZ accepte déjà l’événement <code>purchase</code>. Aucun achat n’est encore reçu sur ce workspace : tant que HADAL n’envoie pas purchase + revenue, le CA tracké restera à zéro.</p></div>}
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Campagne</th><th className="px-4 py-3 text-right">Dépense</th><th className="px-4 py-3 text-right">Clics</th><th className="px-4 py-3 text-right">Conversions</th><th className="px-4 py-3 text-right">CPA</th><th className="px-4 py-3 text-right">CA</th><th className="px-4 py-3 text-right">ROAS</th></tr></thead><tbody>{campaigns.data?.map((c) => { const x = byCampaign[c.id] ?? { spend: 0, clicks: 0, conversions: 0, revenue: 0 }; return <tr key={c.id} className="border-t"><td className="px-4 py-3 font-medium">{c.name}</td><td className="px-4 py-3 text-right">{money(x.spend)}</td><td className="px-4 py-3 text-right">{x.clicks}</td><td className="px-4 py-3 text-right">{x.conversions}</td><td className="px-4 py-3 text-right">{x.conversions ? money(x.spend / x.conversions) : "—"}</td><td className="px-4 py-3 text-right">{money(x.revenue)}</td><td className="px-4 py-3 text-right">{x.spend ? ratio(x.revenue, x.spend, 2).toFixed(2) : "—"}</td></tr>; })}</tbody></table></div>
    </div>
  );
}
