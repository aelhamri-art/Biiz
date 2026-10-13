import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  BarChart3, CalendarDays, ChevronDown, ClipboardList, FileText, Link2,
  ChefHat, LogOut, Plus, Settings2, Sparkles, Users, Waypoints, MousePointer2, TrendingUp, Activity, QrCode, Pencil, Archive, ArchiveRestore, Trash2,
} from "lucide-react";
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
import { ScriptIAPanel } from "@/components/tracking/script-ia";
import { CuisinePanel } from "@/components/tracking/cuisine";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Tracking — BIIZ" },
      { name: "description", content: "Liens trackés, QR codes, parcours et attribution par projet." },
      { property: "og:title", content: "Tracking — BIIZ" },
      { property: "og:description", content: "Liens trackés, QR codes, parcours et attribution par projet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
  const [activeTab, setActiveTab] = useState("contenus");

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
  const currentWorkspace = ws.data?.find((workspace) => workspace.id === wsId);
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
    <div className="biiz-app min-h-screen bg-background">
      <header className="biiz-topbar border-b bg-card/95">
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-3 sm:flex lg:px-8">
          <div className="biiz-header-brand mr-2 flex min-w-0 items-center gap-3">
            <span className="biiz-mark">B</span>
            <div className="leading-none">
              <span className="block text-lg font-semibold tracking-tight">BIIZ</span>
              <span className="mt-1 block text-[10px] font-medium uppercase text-muted-foreground">Cockpit marketing</span>
            </div>
          </div>
          <span className="hidden h-7 w-px bg-border md:block xl:hidden" />
          {ws.data && ws.data.length > 0 && (
            <Select value={wsId ?? ""} onValueChange={setWsId}>
              <SelectTrigger className="h-9 w-full min-w-0 sm:w-48 border-transparent bg-secondary/70 font-medium" aria-label="Projet actif"><SelectValue /></SelectTrigger>
              <SelectContent>{ws.data.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <span className="hidden rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary md:inline-flex">Tracking</span>
          <form onSubmit={createWs} className="ml-auto hidden gap-2 lg:flex">
            <Input className="h-9 w-44 bg-secondary/50" placeholder="Nouveau projet" value={newWs} onChange={(e) => setNewWs(e.target.value)} />
            <Button size="sm" variant="outline" type="submit"><Plus />Ajouter</Button>
          </form>
          <Button size="icon" variant="ghost" className="col-start-2 row-start-1 shrink-0 sm:ml-auto lg:ml-0" onClick={signOut} aria-label="Déconnexion" title="Déconnexion"><LogOut /></Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-5 py-7 lg:px-8 lg:py-10">
        {!ws.isLoading && ws.data?.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Créez votre premier projet</h1>
            <p className="mt-2 text-muted-foreground">Ex. ALPHA, HADAL Berliner. Chaque projet garde ses données séparées.</p>
          </div>
        ) : wsId ? (
          <>
            <section className="mb-7 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase text-primary">Projet</p>
                <h1 className="text-3xl font-semibold">{currentWorkspace?.name ?? "Projet"}</h1>
                <p className="hidden"></p>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-chart-2" />
                Espace partagé
              </div>
            </section>

            <div className="biiz-stats grid grid-cols-3 gap-2 sm:gap-4">
              <Stat label="Liens actifs" value={active.length} icon={<Link2 className="size-4" />} />
              <Stat label="Visites totales" value={clicks.data?.length ?? 0} icon={<MousePointer2 className="size-4" />} />
              <Stat label="Visites · 7 jours" value={clicks.data?.filter((c) => Date.now() - new Date(c.created_at).getTime() < 7 * 864e5).length ?? 0} icon={<TrendingUp className="size-4" />} />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-7">
              <div className="biiz-tabs-shell biiz-navigation">
              <div className="biiz-sidebar-brand"><span className="biiz-mark">B</span><div><span className="text-lg font-semibold">BIIZ</span><span className="biiz-sidebar-label">Cockpit marketing</span></div></div>
              <TabsList className="biiz-tabs">
                <TabsTrigger value="contenus"><FileText />Contenus</TabsTrigger>
                <TabsTrigger value="cuisine"><ChefHat />Page cuisine</TabsTrigger>
                <TabsTrigger value="script-ia"><Sparkles />Script IA</TabsTrigger>
                <TabsTrigger value="taches"><ClipboardList />Tâches</TabsTrigger>
                <TabsTrigger value="calendrier"><CalendarDays />Calendrier</TabsTrigger>
                <TabsTrigger value="liens"><Link2 />Liens & QR</TabsTrigger>
                <TabsTrigger value="analyse"><BarChart3 />Analyse</TabsTrigger>
                <TabsTrigger value="parcours"><Waypoints />Parcours</TabsTrigger>
                <TabsTrigger value="equipe"><Users />Équipe</TabsTrigger>
                <TabsTrigger value="install"><Settings2 />Installation</TabsTrigger>
              </TabsList>
              <ChevronDown className="biiz-tabs-hint" />
              <div className="biiz-sidebar-footer"><span className="flex items-center gap-2"><Activity className="size-3.5" />Espace collaboratif</span><span className="mt-2 block">BIIZ · AXIUM</span></div>
              </div>
              <TabsContent value="contenus" className="mt-6"><ContenusPanel wsId={wsId} /></TabsContent>
              <TabsContent value="calendrier" className="mt-6"><CalendrierPanel wsId={wsId} /></TabsContent>
              <TabsContent value="taches" className="mt-6"><TachesPanel wsId={wsId} /></TabsContent>
              <TabsContent value="cuisine" className="mt-6">
                {(() => {
                  const kitchen = ws.data?.find((w) => /hadal/i.test(w.name));
                  return kitchen && kitchen.id !== wsId ? (
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                      <p>Tu es dans le projet <b>{currentWorkspace?.name}</b>. La page cuisine affiche le projet <b>{kitchen.name}</b> : ce que tu ajoutes ici n'y apparaîtra pas.</p>
                      <Button size="sm" onClick={() => setWsId(kitchen.id)}>Passer sur {kitchen.name}</Button>
                    </div>
                  ) : null;
                })()}
                <CuisinePanel wsId={wsId} />
              </TabsContent>
              <TabsContent value="script-ia" className="mt-6"><ScriptIAPanel wsId={wsId} /></TabsContent>

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
                              <Button variant="link" className="h-auto p-0 font-mono text-xs" onClick={() => { void navigator.clipboard.writeText(short); toast.success("Lien copié"); }}>/r/{l.code}</Button>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">{counts[l.id] ?? 0}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <Button size="icon" variant="ghost" onClick={() => setQrLink(l)} aria-label={`QR · ${l.name}`} title="QR code"><QrCode /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setEditLink(l)} aria-label={`Modifier · ${l.name}`} title="Modifier"><Pencil /></Button>
                              <Button size="icon" variant="ghost" onClick={() => toggleArchive(l)} aria-label={`${l.archived_at ? "Réactiver" : "Archiver"} · ${l.name}`} title={l.archived_at ? "Réactiver" : "Archiver"}>{l.archived_at ? <ArchiveRestore /> : <Archive />}</Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeLink(l)} aria-label={`Supprimer · ${l.name}`} title="Supprimer"><Trash2 /></Button>
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

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="biiz-stat border">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></div><span className="biiz-stat-icon">{icon}</span>
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
    <form onSubmit={submit} className="biiz-editor mt-6">
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
