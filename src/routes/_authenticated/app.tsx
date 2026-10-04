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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SOURCES, slugify, randomCode } from "@/lib/utm";
import { AnalysePanel, EquipePanel, InstallPanel, ParcoursPanel, type TLink } from "@/components/tracking/panels";
import { ContenusPanel } from "@/components/tracking/contenus";
import { CalendrierPanel } from "@/components/tracking/calendrier";
import { TachesPanel } from "@/components/tracking/taches";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Tracking — BIIZ" },
      { name: "description", content: "Liens trackés, QR codes, parcours et attribution par projet." },
      { property: "og:title", content: "Tracking — BIIZ" },
      { property: "og:description", content: "Liens trackés, QR codes, parcours et attribution par projet." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [wsId, setWsId] = useState<string | null>(null);
  const [newWs, setNewWs] = useState("");
  const [qrLink, setQrLink] = useState<TLink | null>(null);
  const [editLink, setEditLink] = useState<TLink | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const ws = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      await supabase.rpc("claim_invites");
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
      return data as TLink[];
    },
  });

  const clicks = useQuery({
    queryKey: ["clicks", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("clicks").select("link_id, created_at").eq("workspace_id", wsId!).limit(20000);
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    clicks.data?.forEach((c) => (m[c.link_id] = (m[c.link_id] ?? 0) + 1));
    return m;
  }, [clicks.data]);

  const active = links.data?.filter((l) => !l.archived_at) ?? [];
  const visible = showArchived ? links.data ?? [] : active;
  const reloadLinks = () => qc.invalidateQueries({ queryKey: ["links", wsId] });

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

  async function toggleArchive(l: TLink) {
    const { error } = await supabase.from("links").update({ archived_at: l.archived_at ? null : new Date().toISOString() }).eq("id", l.id);
    if (error) toast.error(error.message); else { toast.success(l.archived_at ? "Lien réactivé" : "Lien archivé — il redirige toujours"); void reloadLinks(); }
  }

  async function removeLink(l: TLink) {
    if ((counts[l.id] ?? 0) > 0) { toast.error("Ce lien a des visites : archivez-le plutôt que de le supprimer."); return; }
    if (!confirm(`Supprimer « ${l.name} » ?`)) return;
    const { error } = await supabase.from("links").delete().eq("id", l.id);
    if (error) toast.error(error.message); else void reloadLinks();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-6 py-3">
          <span className="font-semibold tracking-tight">BIIZ</span>
          <span className="text-muted-foreground">/</span>
          {ws.data && ws.data.length > 0 && (
            <Select value={wsId ?? ""} onValueChange={setWsId}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{ws.data.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <span className="text-sm text-muted-foreground">Tracking</span>
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
              <Stat label="Liens actifs" value={active.length} />
              <Stat label="Visites totales" value={clicks.data?.length ?? 0} />
              <Stat label="Visites 7 derniers jours" value={clicks.data?.filter((c) => Date.now() - new Date(c.created_at).getTime() < 7 * 864e5).length ?? 0} />
            </div>

            <Tabs defaultValue="contenus" className="mt-8">
              <TabsList>
                <TabsTrigger value="contenus">Contenus</TabsTrigger>
                <TabsTrigger value="taches">Tâches terrain</TabsTrigger>
                <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
                <TabsTrigger value="liens">Liens & QR</TabsTrigger>
                <TabsTrigger value="analyse">Analyse</TabsTrigger>
                <TabsTrigger value="parcours">Parcours</TabsTrigger>
                <TabsTrigger value="equipe">Équipe</TabsTrigger>
                <TabsTrigger value="install">Installation</TabsTrigger>
              </TabsList>
              <TabsContent value="contenus" className="mt-6"><ContenusPanel wsId={wsId} /></TabsContent>
              <TabsContent value="calendrier" className="mt-6"><CalendrierPanel wsId={wsId} /></TabsContent>
              <TabsContent value="taches" className="mt-6"><TachesPanel wsId={wsId} /></TabsContent>

              <TabsContent value="liens">
                <NewLinkForm wsId={wsId} onCreated={() => void reloadLinks()} />
                <div className="mt-6 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <Switch id="arch" checked={showArchived} onCheckedChange={setShowArchived} />
                  <label htmlFor="arch">Afficher les archivés</label>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-4 py-3">Nom</th><th className="px-4 py-3">Nomenclature</th><th className="px-4 py-3">Lien court</th><th className="px-4 py-3 text-right">Visites</th><th /></tr>
                    </thead>
                    <tbody>
                      {visible.map((l) => {
                        const short = `${window.location.origin}/r/${l.code}`;
                        return (
                          <tr key={l.id} className={`border-t ${l.archived_at ? "opacity-50" : ""}`}>
                            <td className="px-4 py-3 font-medium">{l.name}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {l.utm_source} · {l.utm_medium} · {l.utm_campaign}{l.utm_content ? ` · ${l.utm_content}` : ""}
                            </td>
                            <td className="px-4 py-3">
                              <button className="font-mono text-xs text-primary hover:underline" onClick={() => { void navigator.clipboard.writeText(short); toast.success("Lien copié"); }}>/r/{l.code}</button>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{counts[l.id] ?? 0}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <Button size="sm" variant="outline" onClick={() => setQrLink(l)}>QR</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditLink(l)}>Modifier</Button>
                              <Button size="sm" variant="ghost" onClick={() => toggleArchive(l)}>{l.archived_at ? "Réactiver" : "Archiver"}</Button>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeLink(l)}>Suppr.</Button>
                            </td>
                          </tr>
                        );
                      })}
                      {visible.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun lien. Créez-en un ci-dessus.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
              <TabsContent value="analyse" className="mt-6"><AnalysePanel links={links.data ?? []} clicks={clicks.data ?? []} counts={counts} /></TabsContent>
              <TabsContent value="parcours" className="mt-6"><ParcoursPanel wsId={wsId} links={links.data ?? []} /></TabsContent>
              <TabsContent value="equipe" className="mt-6"><EquipePanel wsId={wsId} /></TabsContent>
              <TabsContent value="install" className="mt-6"><InstallPanel /></TabsContent>
            </Tabs>
          </>
        ) : null}
      </main>
      <QrDialog link={qrLink} onClose={() => setQrLink(null)} />
      <EditDialog link={editLink} onClose={() => setEditLink(null)} onSaved={() => { setEditLink(null); void reloadLinks(); }} />
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
    <form onSubmit={submit} className="mt-6 rounded-lg border bg-card p-5">
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

function EditDialog({ link, onClose, onSaved }: { link: TLink | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [dest, setDest] = useState("");
  useEffect(() => { if (link) { setName(link.name); setDest(link.destination_url); } }, [link]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    try { new URL(dest); } catch { toast.error("URL invalide"); return; }
    const { error } = await supabase.from("links").update({ name: name.trim(), destination_url: dest.trim() }).eq("id", link!.id);
    if (error) toast.error(error.message); else { toast.success("Lien mis à jour — le QR reste valable"); onSaved(); }
  }
  return (
    <Dialog open={!!link} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Modifier le lien</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5"><Label>Nom</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Destination</Label><Input required value={dest} onChange={(e) => setDest(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">La nomenclature UTM reste figée pour ne pas casser l'historique. Les QR déjà imprimés suivent la nouvelle destination.</p>
          <Button type="submit" className="w-full">Enregistrer</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QrDialog({ link, onClose }: { link: TLink | null; onClose: () => void }) {
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
