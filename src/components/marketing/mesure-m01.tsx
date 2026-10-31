import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ARBITRAGE_RULES, customerKind, M01_IDS, MEASURE_RULES, m01Measure, orderId, UTM_RULE } from "@/lib/hadal-m01";
import { eur } from "@/lib/marketing";
import type { MarketingData } from "./use-marketing";

const n = (v: number | null) => (v === null ? "—" : v.toLocaleString("fr-FR"));

export function MesureM01({ wsId, m }: { wsId: string; m: MarketingData }) {
  const m01 = useMemo(() => (m.contents.data ?? []).filter((c) => c.source_id && (M01_IDS as readonly string[]).includes(c.source_id)), [m.contents.data]);
  const linkIds = useMemo(() => {
    const ids = new Set<string>(); const cids = new Set(m01.map((c) => c.id));
    for (const c of m01) if (c.link_id) ids.add(c.link_id);
    for (const d of m.dists.data ?? []) if (cids.has(d.content_id) && d.link_id) ids.add(d.link_id);
    return [...ids].sort();
  }, [m01, m.dists.data]);

  const events = useQuery({
    queryKey: ["m01-events", wsId, linkIds.join(",")], enabled: linkIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("link_id, session_id, name, props, created_at").eq("workspace_id", wsId).in("link_id", linkIds).limit(20000);
      if (error) throw error; return data;
    },
  });
  const live = useQuery({
    queryKey: ["m01-session-live", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("id").eq("workspace_id", wsId).not("session_id", "is", null).limit(1);
      if (error) throw error; return (data ?? []).length > 0;
    },
  });

  const conv = m.conversions.data ?? [];
  const flags = {
    sessionsTracked: !!live.data,
    ordersTracked: conv.some((e) => orderId(e.props) !== null),
    customersTracked: conv.some((e) => customerKind(e.props) !== null),
  };
  const rows = useMemo(() => m01Measure({
    contents: m01, links: m.links.data ?? [], dists: m.dists.data ?? [], clicks: m.clicks.data ?? [], events: events.data ?? [], flags,
  }), [m01, m.links.data, m.dists.data, m.clicks.data, events.data, flags.sessionsTracked, flags.ordersTracked, flags.customersTracked]);

  const ordered = [...m01].sort((a, b) => M01_IDS.indexOf(a.source_id as never) - M01_IDS.indexOf(b.source_id as never));
  if (ordered.length === 0) return <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">Aucun contenu M01 (S1-C … S4-L) dans ce projet.</p>;

  const heads = ["ID", "Portée du contenu", "Partages", "Clics du lien", "Sessions balisées", "Commandes attribuées", "CA attribué TTC", "Commandes / sessions", "Nouveaux clients", "Clients revenants"];
  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Mesure M01 · {ordered.length} contenus</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">« — » = donnée absente. « 0 » = résultat nul effectivement observé.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr>{heads.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {ordered.map((c) => { const r = rows.get(c.id)!; return (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2"><span className="font-mono font-semibold">{c.source_id}</span><span className="block max-w-[200px] truncate text-xs text-muted-foreground">{c.title.replace(/^S\d-[CVL] — /, "")}</span></td>
                  <td className="px-3 py-2 tabular-nums">{n(r.reach)}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.shares)}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.clicks)}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.sessions)}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.orders)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.revenue === null ? "—" : eur(r.revenue)}</td>
                  <td className="px-3 py-2 tabular-nums">{r.ordersPerSession === null ? "—" : `${(r.ordersPerSession * 100).toFixed(1).replace(".", ",")} %`}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.newCustomers)}</td>
                  <td className="px-3 py-2 tabular-nums">{n(r.returningCustomers)}</td>
                </tr>); })}
            </tbody>
          </table>
        </div>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {flags.sessionsTracked ? "Sessions : mesurées par le script BIIZ du site." : "Sessions : le site n’envoie pas encore de session balisée."}{" "}
          {flags.ordersTracked ? "Commandes : événements avec order_id reçus." : "Commandes : aucun événement de commande avec order_id reçu."}{" "}
          {flags.customersTracked ? "" : "Nouveaux / revenants : identification client non transmise."}
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Protocole de mesure</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{MEASURE_RULES.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 rounded-md bg-muted p-2 font-mono text-[11px] text-muted-foreground">{UTM_RULE}</p>
        </section>
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Arbitrage J+21</h3>
          <dl className="mt-2 space-y-2 text-sm">{ARBITRAGE_RULES.map(([k, v]) => <div key={k}><dt className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      </div>
    </div>
  );
}
