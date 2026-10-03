import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SOURCES, slugify, randomCode } from "@/lib/utm";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Tracking — BIIZ" },
      { name: "description", content: "Liens trackés et QR codes par projet." },
      { property: "og:title", content: "Tracking — BIIZ" },
      { property: "og:description", content: "Liens trackés et QR codes par projet." },
    ],
  }),
  component: AppPage,
});

type Link = {
  id: string; code: string; name: string; destination_url: string;
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string | null; created_at: string;
};

function AppPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [wsId, setWsId] = useState<string | null>(null);
  const [newWs, setNewWs] = useState("");
  const [qrLink, setQrLink] = useState<Link | null>(null);

  const ws = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workspaces").select("id,name").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!wsId && ws.data?.[0]) setWsId(ws.data[0].id);
  }, [ws.data, wsId]);

  const links = useQuery({
    queryKey: ["links", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("links").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Link[];
    },
  });

  const clicks = useQuery({
    queryKey: ["clicks", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("clicks").select("link_id, created_at").eq("workspace_id", wsId!).limit(10000);
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    clicks.data?.forEach((c) => (m[c.link_id] = (m[c.link_id] ?? 0) + 1));
    return m;
  }, [clicks.data]);

  const bySource = useMemo(() => {
    const m: Record<string, number> = {};
    links.data?.forEach((l) => (m[l.utm_source] = (m[l.utm_source] ?? 0) + (counts[l.id] ?? 0)));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [links.data, counts]);

  async function createWs(e: React.FormEvent) {
    e.preventDefault();
    if (!newWs.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("workspaces").insert({ name: newWs.trim(), created_by: u.user!.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setNewWs("");
    await qc.invalidateQueries({ queryKey: ["workspaces"] });
    setWsId(data.id);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const total = clicks.data?.length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <span className="font-semibold tracking-tight">BIIZ</span>
          <span className="text-muted-foreground">/</span>
          {ws.data && ws.data.length > 0 && (
            <Select value={wsId ?? ""} onValueChange={setWsId}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{ws.data.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <form onSubmit={createWs} className="flex gap-2">
            <Input className="h-8 w-40" placeholder="Nouveau projet" value={newWs} onChange={(e) => setNewWs(e.target.value)} />
            <Button size="sm" variant="outline" type="submit">Ajouter</Button>
          </form>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={signOut}>Déconnexion</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {!ws.isLoading && ws.data?.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Créez votre premier projet</h1>
            <p className="mt-2 text-muted-foreground">Ex. ALPHA, HADAL Berliner. Chaque projet garde ses données séparées.</p>
          </div>
        ) : wsId ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Liens actifs" value={links.data?.length ?? 0} />
              <Stat label="Visites totales" value={total} />
              <div className="rounded-lg border bg-card p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Top sources</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {bySource.slice(0, 4).map(([s, n]) => (
                    <li key={s} className="flex justify-between"><span className="font-mono">{s}</span><span className="tabular-nums">{n}</span></li>
                  ))}
                  {bySource.length === 0 && <li className="text-muted-foreground">Aucune donnée</li>}
                </ul>
              </div>
            </div>

            <NewLinkForm wsId={wsId} onCreated={() => qc.invalidateQueries({ queryKey: ["links", wsId] })} />

            <div className="mt-10 overflow-hidden rounded-lg border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Nomenclature</th><th className="px-4 py-3">Lien court</th><th className="px-4 py-3 text-right">Visites</th><th /></tr>
                </thead>
                <tbody>
                  {links.data?.map((l) => {
                    const short = `${window.location.origin}/r/${l.code}`;
                    return (
                      <tr key={l.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{l.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {l.utm_source} · {l.utm_medium} · {l.utm_campaign}{l.utm_content ? ` · ${l.utm_content}` : ""}
                        </td>
                        <td className="px-4 py-3">
                          <button className="font-mono text-xs text-primary hover:underline" onClick={() => { navigator.clipboard.writeText(short); toast.success("Lien copié"); }}>/r/{l.code}</button>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{counts[l.id] ?? 0}</td>
                        <td className="px-4 py-3 text-right"><Button size="sm" variant="outline" onClick={() => setQrLink(l)}>QR</Button></td>
                      </tr>
                    );
                  })}
                  {links.data?.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun lien. Créez-en un ci-dessus.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </main>
      <QrDialog link={qrLink} onClose={() => setQrLink(null)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}

function NewLinkForm({ wsId, onCreated }: { wsId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [dest, setDest] = useState("");
  const [src, setSrc] = useState(SOURCES[0]!.label);
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const preset = SOURCES.find((s) => s.label === src)!;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try { new URL(dest); } catch { toast.error("URL de destination invalide"); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("links").insert({
      workspace_id: wsId, code: randomCode(), name: name.trim(), destination_url: dest.trim(),
      utm_source: preset.source, utm_medium: preset.medium,
      utm_campaign: slugify(campaign), utm_content: content ? slugify(content) : null,
      created_by: u.user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Lien créé");
    setName(""); setCampaign(""); setContent("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-10 rounded-lg border bg-card p-5">
      <p className="text-sm font-medium">Nouveau lien tracké</p>
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5 md:col-span-2"><Label>Nom</Label><Input required placeholder="Flyer A6 LTZ" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-4"><Label>Destination</Label><Input required placeholder="https://alpha33.app/combo" value={dest} onChange={(e) => setDest(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Support</Label>
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SOURCES.map((s) => <SelectItem key={s.label} value={s.label}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2"><Label>Campagne</Label><Input required placeholder="ltz_launch" value={campaign} onChange={(e) => setCampaign(e.target.value)} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Variante (optionnel)</Label><Input placeholder="a6_v1" value={content} onChange={(e) => setContent(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <code className="truncate text-xs text-muted-foreground">
          utm_source={preset.source} · utm_medium={preset.medium} · utm_campaign={slugify(campaign) || "…"}{content ? ` · utm_content=${slugify(content)}` : ""}
        </code>
        <Button type="submit">Créer</Button>
      </div>
    </form>
  );
}

function QrDialog({ link, onClose }: { link: Link | null; onClose: () => void }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    if (!link) return undefined;
    void QRCode.toDataURL(`${window.location.origin}/r/${link.code}`, { width: 640, margin: 2 }).then(setSrc);
    return undefined;
  }, [link]);
  return (
    <Dialog open={!!link} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{link?.name}</DialogTitle></DialogHeader>
        {src && <img src={src} alt="QR code" className="mx-auto w-64" />}
        <p className="text-center font-mono text-xs text-muted-foreground">/r/{link?.code}</p>
        <Button asChild><a href={src} download={`qr-${link?.code}.png`}>Télécharger le PNG</a></Button>
      </DialogContent>
    </Dialog>
  );
}
