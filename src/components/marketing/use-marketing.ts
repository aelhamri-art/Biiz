import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Campaign = Tables<"campaigns">;
export type Content = Tables<"contents">;
export type Distribution = Tables<"distributions">;
export type AdPerf = Tables<"ad_performance">;
export type MLink = Tables<"links">;

/** Données Marketing V1.1 d'un espace, toutes filtrées par workspace_id (RLS is_member). */
export function useMarketing(wsId: string) {
  const qc = useQueryClient();
  const q = <T,>(key: string, fn: () => PromiseLike<{ data: T | null; error: unknown }>) =>
    useQuery({ queryKey: [key, wsId], enabled: !!wsId, queryFn: async () => { const { data, error } = await fn(); if (error) throw error; return (data ?? []) as T; } });
  const campaigns = q<Campaign[]>("campaigns", () => supabase.from("campaigns").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }));
  const contents = q<Content[]>("contents", () => supabase.from("contents").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }));
  const dists = q<Distribution[]>("distributions", () => supabase.from("distributions").select("*").eq("workspace_id", wsId).order("created_at"));
  const ads = q<AdPerf[]>("ad_performance", () => supabase.from("ad_performance").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }));
  const links = q<MLink[]>("links", () => supabase.from("links").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false }));
  const clicks = q<{ link_id: string; created_at: string }[]>("clicks", () => supabase.from("clicks").select("link_id, created_at").eq("workspace_id", wsId).limit(20000));
  const conversions = q<{ link_id: string | null; name: string; props: unknown; created_at: string }[]>("conversion-events", () =>
    supabase.from("events").select("link_id, name, props, created_at").eq("workspace_id", wsId).in("name", ["purchase", "booking_completed"]).limit(20000));
  const reload = (...keys: string[]) => keys.forEach((k) => void qc.invalidateQueries({ queryKey: [k, wsId] }));
  return { campaigns, contents, dists, ads, links, clicks, conversions, reload };
}
export type MarketingData = ReturnType<typeof useMarketing>;

export function aggregateInput(m: MarketingData) {
  return {
    links: m.links.data ?? [], contents: m.contents.data ?? [], dists: m.dists.data ?? [],
    clicks: m.clicks.data ?? [], events: m.conversions.data ?? [],
    ads: (m.ads.data ?? []).map((a) => ({ ...a, spend: Number(a.spend), revenue: Number(a.revenue) })),
  };
}

export const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
