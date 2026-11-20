import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BiEvent } from "@/lib/bi-data";

export function useBiData(wsId: string) {
  const qc = useQueryClient();
  const events = useQuery({
    queryKey: ["bi-events", wsId], enabled: !!wsId,
    queryFn: async () => {
      const all: BiEvent[] = [];
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase.from("bi_events").select("*").eq("workspace_id", wsId).order("occurred_at", { ascending: false }).range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        all.push(...(data as BiEvent[]));
        if (data.length < 1000) break;
      }
      return all;
    },
  });
  const sources = useQuery({
    queryKey: ["bi-sources", wsId], enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bi_data_sources").select("id,name,kind,key_prefix,active,last_event_at,created_at").eq("workspace_id", wsId).order("created_at");
      if (error) throw error; return data;
    },
  });
  const sync = useQuery({
    queryKey: ["bi-sync", wsId], enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bi_source_sync_state").select("*").eq("workspace_id", wsId);
      if (error) throw error; return data;
    },
  });
  const errors = useQuery({
    queryKey: ["bi-errors", wsId], enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bi_ingestion_errors").select("id,source_id,external_event_id,reason,created_at").eq("workspace_id", wsId).order("created_at", { ascending: false }).limit(100);
      if (error) throw error; return data;
    },
  });
  const analyses = useQuery({
    queryKey: ["bi-analyses", wsId], enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bi_saved_analyses").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error; return data;
    },
  });
  const ads = useQuery({
    queryKey: ["bi-ads", wsId], enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_performance").select("id,spend,period_start,period_end").eq("workspace_id", wsId);
      if (error) throw error; return data.map((a) => ({ ...a, spend: Number(a.spend) }));
    },
  });
  const reload = () => Promise.all(["bi-events", "bi-sources", "bi-sync", "bi-errors", "bi-analyses", "bi-ads"].map((key) => qc.invalidateQueries({ queryKey: [key, wsId] })));
  return { events, sources, sync, errors, analyses, ads, reload };
}
export type BiData = ReturnType<typeof useBiData>;
