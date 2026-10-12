import { Download, Copy, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export type TLink = {
  id: string; code: string; name: string; destination_url: string;
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string | null;
  created_at: string; archived_at: string | null;
};
export type Click = { link_id: string; created_at: string };

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="min-w-0 border-t pt-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Ranking({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Aucune donnée</p>;
  return (
    <ul className="space-y-2 text-sm">
      {rows.map(([k, n]) => (
        <li key={k}>
          <div className="flex justify-between"><span className="font-mono text-xs">{k}</span><span className="tabular-nums">{n}</span></div>
          <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

function group(links: TLink[], counts: Record<string, number>, key: (l: TLink) => string) {
  const m: Record<string, number> = {};
  links.forEach((l) => (m[key(l)] = (m[key(l)] ?? 0) + (counts[l.id] ?? 0)));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function AnalysePanel({ links, clicks, counts }: { links: TLink[]; clicks: Click[]; counts: Record<string, number> }) {
  const [days, setDays] = useState(30);
  const series = useMemo(() => {
    const start = startOfDay(subDays(new Date(), days - 1));
    const m: Record<string, number> = {};
    for (let i = 0; i < days; i++) m[format(subDays(new Date(), days - 1 - i), "yyyy-MM-dd")] = 0;
    clicks.forEach((c) => { const d = new Date(c.created_at); if (d >= start) { const k = format(d, "yyyy-MM-dd"); m[k] = (m[k] ?? 0) + 1; } });
    return Object.entries(m).map(([d, v]) => ({ d: format(new Date(d), "d MMM", { locale: fr }), v }));
  }, [clicks, days]);

  function exportCsv() {
    const head = ["nom", "code", "source", "medium", "campagne", "variante", "destination", "visites", "cree_le"];
    const rows = links.map((l) => [l.name, l.code, l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content ?? "", l.destination_url, String(counts[l.id] ?? 0), l.created_at.slice(0, 10)]);
    const csv = [head, ...rows].map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "biiz-tracking.csv"; a.click();
  }

  return (
    <div className="space-y-4">
      <Card title="Visites par jour" action={
        <div className="flex gap-1">
          {[7, 30, 90].map((n) => <Button key={n} size="sm" variant={days === n ? "default" : "ghost"} onClick={() => setDays(n)}>{n} j</Button>)}
          <Button size="sm" variant="outline" onClick={exportCsv}><Download />Export CSV</Button>
        </div>
      }>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="d" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={11} stroke="var(--muted-foreground)" width={30} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", boxShadow: "var(--shadow-popover)", color: "var(--foreground)" }} />
              <Area type="monotone" dataKey="v" name="Visites" stroke="var(--primary)" fill="var(--accent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Par support"><Ranking rows={group(links, counts, (l) => l.utm_source)} /></Card>
        <Card title="Par canal"><Ranking rows={group(links, counts, (l) => l.utm_medium)} /></Card>
        <Card title="Par campagne"><Ranking rows={group(links, counts, (l) => l.utm_campaign)} /></Card>
      </div>
      <Card title="Top liens"><Ranking rows={links.map((l) => [l.name, counts[l.id] ?? 0] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 10)} /></Card>
    </div>
  );
}

const FUNNEL = [
  ["page_view", "Vue de page"], ["cta_click", "Clic CTA"], ["booking_start", "Début réservation"],
  ["offer_selected", "Offre choisie"], ["slot_viewed", "Créneau vu"], ["booking_completed", "Réservation"],
] as const;

export function ParcoursPanel({ wsId, links }: { wsId: string; links: TLink[] }) {
  const ev = useQuery({
    queryKey: ["events", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("name, session_id, link_id, first_link_id").eq("workspace_id", wsId).limit(20000);
      if (error) throw error;
      return data;
    },
  });
  const byName = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    ev.data?.forEach((e) => { (m[e.name] ??= new Set()).add(e.session_id ?? Math.random().toString()); });
    return m;
  }, [ev.data]);
  const top = byName["page_view"]?.size ?? 0;
  const linkName = (id: string | null) => links.find((l) => l.id === id)?.name ?? "—";
  const touch = (field: "link_id" | "first_link_id") => {
    const m: Record<string, number> = {};
    ev.data?.filter((e) => e.name === "booking_completed").forEach((e) => { const k = linkName(e[field]); m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };

  return (
    <div className="space-y-4">
      <Card title="Entonnoir (sessions uniques)">
        {ev.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun événement reçu. Installez le script sur le site de destination (onglet Installation).</p>
        ) : (
          <ul className="space-y-3">
            {FUNNEL.map(([k, label]) => {
              const n = byName[k]?.size ?? 0;
              const pct = top ? Math.round((n / top) * 100) : 0;
              return (
                <li key={k}>
                  <div className="flex justify-between text-sm"><span>{label} <span className="font-mono text-xs text-muted-foreground">{k}</span></span><span className="tabular-nums">{n} · {pct}%</span></div>
                  <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="First touch — découverte"><Ranking rows={touch("first_link_id")} /></Card>
        <Card title="Last touch — conversion"><Ranking rows={touch("link_id")} /></Card>
      </div>
    </div>
  );
}

export function EquipePanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const members = useQuery({
    queryKey: ["members", wsId],
    queryFn: async () => { const { data, error } = await supabase.rpc("list_members", { _ws: wsId }); if (error) throw error; return data; },
  });
  const invites = useQuery({
    queryKey: ["invites", wsId],
    queryFn: async () => { const { data, error } = await supabase.from("workspace_invites").select("id,email,created_at").eq("workspace_id", wsId); if (error) throw error; return data; },
  });
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["members", wsId] }); void qc.invalidateQueries({ queryKey: ["invites", wsId] }); };

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("invite_member", { _ws: wsId, _email: email });
    if (error) { toast.error(error.message); return; }
    toast.success(data === "added" ? "Membre ajouté" : "Invitation enregistrée — accès dès sa création de compte");
    setEmail(""); refresh();
  }
  async function remove(uid: string) {
    if (!confirm("Retirer ce membre du projet ?")) return;
    const { error } = await supabase.rpc("remove_member", { _ws: wsId, _user: uid });
    if (error) toast.error(error.message); else refresh();
  }
  async function cancel(id: string) {
    await supabase.from("workspace_invites").delete().eq("id", id); refresh();
  }

  return (
    <div className="space-y-4">
      <Card title="Inviter dans ce projet">
        <form onSubmit={invite} className="flex gap-2">
          <Input type="email" required placeholder="prenom@entreprise.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit"><UserPlus />Inviter</Button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">Tout membre peut inviter. La personne crée son compte avec cet email et retrouve le projet automatiquement.</p>
      </Card>
      <Card title={`Membres (${members.data?.length ?? 0})`}>
        <ul className="divide-y text-sm">
          {members.data?.map((m) => (
            <li key={m.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <span className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-medium">{m.email.slice(0,2).toUpperCase()}</span><span className="truncate">{m.email}</span></span>
              <Button size="sm" variant="ghost" onClick={() => remove(m.user_id)}>Retirer</Button>
            </li>
          ))}
        </ul>
      </Card>
      {invites.data && invites.data.length > 0 && (
        <Card title="Invitations en attente">
          <ul className="divide-y text-sm">
            {invites.data.map((i) => (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <span className="truncate text-muted-foreground">{i.email}</span>
                <Button size="sm" variant="ghost" onClick={() => cancel(i.id)}>Annuler</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

export function InstallPanel() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = `<script src="${origin}/api/public/biiz.js" defer></script>`;
  const copy = (s: string) => { void navigator.clipboard.writeText(s); toast.success("Copié"); };
  return (
    <div className="space-y-4">
      <Card title="1. Coller sur le site de destination (ex. alpha33.app)">
        <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{snippet}</pre>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => copy(snippet)}><Copy />Copier</Button>
        <p className="mt-3 text-sm text-muted-foreground">Le script retient le premier lien (first touch) et le dernier (last touch) du visiteur, même s'il change de page, et envoie automatiquement <code>page_view</code>.</p>
      </Card>
      <Card title="2. Marquer les boutons importants">
        <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{`<button data-biiz="cta_click">Réserver</button>
<button data-biiz="booking_start">Commencer</button>`}</pre>
      </Card>
      <Card title="3. Étapes du parcours depuis le code">
        <pre className="overflow-x-auto rounded bg-muted p-3 font-mono text-xs">{`biiz.track("offer_selected", { offre: "combo" })
biiz.track("slot_viewed")
biiz.track("booking_completed")`}</pre>
        <p className="mt-3 text-sm text-muted-foreground">Événements acceptés : page_view, cta_click, booking_start, offer_selected, slot_viewed, booking_completed, purchase, lead_created, form_completed.</p>
      </Card>
    </div>
  );
}
