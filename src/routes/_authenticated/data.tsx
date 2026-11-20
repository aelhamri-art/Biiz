import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DataApp } from "@/components/data/data-app";
import { BiizFooter } from "@/components/biiz-footer";

export const Route = createFileRoute("/_authenticated/data")({
  head: () => ({ meta: [
    { title: "BIIZ Data — Business Intelligence" },
    { name: "description", content: "Cockpit Business Intelligence, Customer 360 et Data Lab par espace de travail." },
    { property: "og:title", content: "BIIZ Data — Business Intelligence" },
    { property: "og:description", content: "Données business fiables, funnels Barber et Wash, clients et analyses drillables." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: DataRoute,
});
function DataRoute() {
  const [wsId, setWsId] = useState<string | null>(null);
  const workspaces = useQuery({ queryKey: ["workspaces"], queryFn: async () => {
    await supabase.rpc("claim_invites");
    const { data, error } = await supabase.from("workspaces").select("id,name").eq("app", "marketing").order("created_at");
    if (error) throw error; return data;
  } });
  useEffect(() => {
    if (!wsId && workspaces.data?.length) setWsId((workspaces.data.find((w) => w.name.toUpperCase() === "ALPHA") ?? workspaces.data[0]!).id);
  }, [workspaces.data, wsId]);
  const current = workspaces.data?.find((w) => w.id === wsId);
  return <div className="biiz-app min-h-screen bg-background"><header className="biiz-topbar border-b"><div className="mx-auto flex max-w-[1600px] items-center gap-3 px-5 py-3 lg:px-8"><span className="biiz-mark">B</span><div className="mr-auto"><span className="block text-lg font-semibold">BIIZ Data</span><span className="text-[10px] uppercase text-muted-foreground">Axium Business Intelligence</span></div>{workspaces.data && <Select value={wsId ?? ""} onValueChange={setWsId}><SelectTrigger className="w-40" aria-label="Espace Data"><SelectValue /></SelectTrigger><SelectContent>{workspaces.data.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>}<Button asChild variant="ghost" size="sm"><Link to="/app"><ArrowLeft />Cockpit</Link></Button></div></header><main className="mx-auto max-w-[1600px] px-5 py-7 lg:px-8">{workspaces.isLoading ? <div className="h-28 animate-pulse rounded-lg bg-muted" /> : wsId ? <DataApp wsId={wsId} workspaceName={current?.name} /> : <p className="py-20 text-center text-muted-foreground">Aucun espace Marketing accessible.</p>}</main><BiizFooter /></div>;
}
