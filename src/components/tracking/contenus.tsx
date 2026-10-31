import { Plus, Trash2, LayoutGrid, List, Upload, Link2, Megaphone } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CHANNELS, FORMATS, NATURES, aggregate, channelLabel, channelMode, eur, labelOf, parseCalendarCsv } from "@/lib/marketing";
import { randomCode, slugify } from "@/lib/utm";
import { aggregateInput, num, type Content, type MarketingData } from "@/components/marketing/use-marketing";
import { AdForm } from "@/components/marketing/ads";

export type TContent = Content;

const TYPES = [
  ["brief", "Brief"], ["script", "Script"], ["concept", "Concept"], ["plan_tournage", "Plan de tournage"],
  ["rush", "Rush"], ["crea", "Créa"], ["doc", "Document"],
] as const;
const STATUSES = [
  ["idee", "Idée"], ["en_cours", "En cours"], ["a_valider", "À valider"], ["valide", "Validé"], ["publie", "Publié"],
] as const;
const NONE = "__none";
const typeLabel = (t: string) => TYPES.find(([k]) => k === t)?.[1] ?? t;
const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;
const fmtDate = (d: string | null) => (d ? format(new Date(d), "d MMM", { locale: fr }) : "");

export function ContenusPanel({ wsId, m }: { wsId: string; m: MarketingData }) {
  const [filter, setFilter] = useState<string>("tous");
  const [campaign, setCampaign] = useState<string>("toutes");
  const [view, setView] = useState<"kanban" | "liste">("kanban");
  const [openId, setOpenId] = useState<string | null>(null);
  const reload = () => m.reload("contents");
  const campName = (id: string | null) => m.campaigns.data?.find((c) => c.id === id)?.name;

  const visible = useMemo(
    () => (m.contents.data ?? []).filter((c) => (filter === "tous" || c.type === filter) && (campaign === "toutes" || (campaign === NONE ? !c.campaign_id : c.campaign_id === campaign))),
    [m.contents.data, filter, campaign],
  );
  const byStatus = useMemo(() => {
    const r: Record<string, Content[]> = {};
    STATUSES.forEach(([k]) => (r[k] = []));
    visible.forEach((c) => (r[c.status] ??= []).push(c));
    return r;
  }, [visible]);

  async function setStatus(c: Content, status: string) {
    const { error } = await supabase.from("contents").update({ status }).eq("id", c.id);
    if (error) toast.error(error.message); else reload();
  }
  async function remove(c: Content) {
    if (!confirm(`Supprimer « ${c.title} » ?`)) return;
    const { error } = await supabase.from("contents").delete().eq("id", c.id);
    if (error) { toast.error(error.message.includes("row-level") ? "Votre rôle ne permet pas de supprimer." : error.message); return; }
    if (c.file_path) await supabase.storage.from("rushs").remove([c.file_path]);
    reload();
  }

  const meta = (c: Content) => [labelOf(FORMATS, c.format) || typeLabel(c.type), labelOf(NATURES, c.nature), c.publish_date ? fmtDate(c.publish_date) : c.due_date ? `éch. ${fmtDate(c.due_date)}` : ""].filter(Boolean).join(" · ");

  return (
    <div className="space-y-4">
      <NewContentForm wsId={wsId} m={m} onCreated={reload} />
      <div className="biiz-filters flex flex-wrap items-center gap-2">
        <Select value={campaign} onValueChange={setCampaign}>
          <SelectTrigger className="h-9 w-full sm:w-64" aria-label="Filtrer par campagne"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="toutes">Toutes les campagnes</SelectItem><SelectItem value={NONE}>Sans campagne</SelectItem>{m.campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant={filter === "tous" ? "default" : "outline"} onClick={() => setFilter("tous")}>Tous</Button>
        {TYPES.map(([k, label]) => <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{label}</Button>)}
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant={view === "kanban" ? "default" : "outline"} aria-label="Vue Kanban" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><LayoutGrid /></Button>
          <Button size="icon" variant={view === "liste" ? "default" : "outline"} aria-label="Vue liste" aria-pressed={view === "liste"} onClick={() => setView("liste")}><List /></Button>
          <CsvImport wsId={wsId} m={m} campaignId={campaign !== "toutes" && campaign !== NONE ? campaign : null} />
        </div>
      </div>

      {view === "kanban" ? (
        <div className="biiz-board grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {STATUSES.map(([sk, slabel]) => (
            <div key={sk} data-status={sk} className="biiz-board-column">
              <p className="text-muted-foreground">{slabel} · {byStatus[sk]?.length ?? 0}</p>
              <ul className="space-y-2 p-3">
                {(byStatus[sk] ?? []).map((c) => (
                  <li key={c.id} className="rounded-md border bg-background p-3 text-sm">
                    <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left font-medium hover:bg-transparent hover:text-primary" onClick={() => setOpenId(c.id)}>{c.title}</Button>
                    {campName(c.campaign_id) && <p className="mt-1 truncate text-[11px] font-medium text-primary">{campName(c.campaign_id)}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{meta(c)}{c.link_id ? " · lien tracké" : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {STATUSES.filter(([k]) => k !== c.status).map(([k, l]) => <Button key={k} variant="ghost" className="h-6 rounded px-1.5 text-[11px] text-muted-foreground" onClick={() => setStatus(c, k)}>{l}</Button>)}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(c)} aria-label="Supprimer le contenu" title="Supprimer"><Trash2 className="size-3" /></Button>
                    </div>
                  </li>
                ))}
                {(byStatus[sk] ?? []).length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>{["Contenu", "Campagne", "Format · nature", "Objectif", "Cible", "CTA", "Date", "Statut", "Lien"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => setOpenId(c.id)}>
                  <td className="px-3 py-2 font-medium">{c.title}{c.week_label ? <span className="ml-1 text-xs text-muted-foreground">({c.week_label})</span> : null}</td>
                  <td className="px-3 py-2 text-xs">{campName(c.campaign_id) ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{[labelOf(FORMATS, c.format), labelOf(NATURES, c.nature)].filter(Boolean).join(" · ") || typeLabel(c.type)}</td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs">{c.business_objective ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-3 py-2 text-xs">{c.target_summary ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{c.cta ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(c.publish_date ?? c.due_date) || "—"}</td>
                  <td className="px-3 py-2 text-xs">{statusLabel(c.status)}</td>
                  <td className="px-3 py-2 text-xs">{c.link_id ? "/r/" + (m.links.data?.find((l) => l.id === c.link_id)?.code ?? "") : "—"}</td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Aucun contenu.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <ContentDialog wsId={wsId} m={m} id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function CsvImport({ wsId, m, campaignId }: { wsId: string; m: MarketingData; campaignId: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  async function onFile(f: File) {
    if (/\.xlsx?$/i.test(f.name)) { toast.error("Exportez le tableur en CSV (Fichier → Télécharger → CSV) puis importez-le."); return; }
    const rows = parseCalendarCsv(await f.text());
    if (!rows.length) { toast.error("Aucune ligne lisible : la colonne « concept » est obligatoire."); return; }
    const existing = new Set((m.contents.data ?? []).filter((c) => c.campaign_id === campaignId).map((c) => `${c.week_label ?? ""}|${c.title.toLowerCase()}`));
    const fresh = rows.filter((r) => !existing.has(`${r.week ?? ""}|${r.title.toLowerCase()}`));
    if (!fresh.length) { toast.info("Tout est déjà importé."); return; }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("contents").insert(fresh.map((r) => ({
      workspace_id: wsId, created_by: u.user!.id, type: "crea", title: r.title, status: r.status, campaign_id: campaignId,
      week_label: r.week, format: r.format, business_objective: r.objective, target_summary: r.target, caption: r.caption,
      asset_url: r.asset, publish_date: r.date,
    })));
    if (error) { toast.error(error.message); return; }
    toast.success(`${fresh.length} contenu${fresh.length > 1 ? "s" : ""} importé${fresh.length > 1 ? "s" : ""}${rows.length - fresh.length ? ` · ${rows.length - fresh.length} doublon(s) ignoré(s)` : ""}`);
    m.reload("contents");
  }
  return (
    <>
      <input ref={ref} type="file" accept=".csv,text/csv,.xlsx" className="sr-only" aria-label="Fichier CSV du calendrier" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
      <Button size="sm" variant="outline" className="h-10" onClick={() => ref.current?.click()} title="Colonnes : semaine, format, concept, intention business, cible, légende, asset/visuel, statut"><Upload />Import CSV</Button>
    </>
  );
}

function NewContentForm({ wsId, m, onCreated }: { wsId: string; m: MarketingData; onCreated: () => void }) {
  const [type, setType] = useState<string>("crea");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
  const [campaignId, setCampaignId] = useState<string>(NONE);
  const [fmt, setFmt] = useState<string>(NONE);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        file_path = `${wsId}/${crypto.randomUUID()}-${file.name}`;
        file_name = file.name;
        const { error: upErr } = await supabase.storage.from("rushs").upload(file_path, file);
        if (upErr) { toast.error(upErr.message); return; }
      }
      const { error } = await supabase.from("contents").insert({
        workspace_id: wsId, type, title: title.trim(), body: body.trim() || null,
        due_date: due || null, file_path, file_name, created_by: u.user!.id,
        campaign_id: campaignId === NONE ? null : campaignId, format: fmt === NONE ? null : fmt,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Contenu ajouté");
      setTitle(""); setBody(""); setDue(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onCreated();
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="biiz-editor">
      <p className="text-sm font-medium">Nouveau contenu</p>
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5"><Label>Type</Label>
          <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Titre</Label><Input required placeholder="Révolution à La Teste" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Échéance</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Format</Label>
          <Select value={fmt} onValueChange={setFmt}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>—</SelectItem>{FORMATS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Campagne</Label>
          <Select value={campaignId} onValueChange={setCampaignId}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{m.campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Fichier (rush, créa…)</Label><Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <div className="space-y-1.5 md:col-span-6"><Label>Brief / notes</Label><Textarea rows={2} placeholder="Angle, script, consignes…" value={body} onChange={(e) => setBody(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Envoi…" : <><Plus />Ajouter</>}</Button></div>
    </form>
  );
}

function ContentDialog({ wsId, m, id, onClose }: { wsId: string; m: MarketingData; id: string | null; onClose: () => void }) {
  const content = m.contents.data?.find((c) => c.id === id) ?? null;
  return (
    <Dialog open={!!content} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {content && <ContentDetail key={content.id} wsId={wsId} m={m} c={content} />}
      </DialogContent>
    </Dialog>
  );
}

function ContentDetail({ wsId, m, c }: { wsId: string; m: MarketingData; c: Content }) {
  const s = (v: string | null) => v ?? "";
  const [f, setF] = useState({
    title: c.title, body: s(c.body), status: c.status, campaign_id: c.campaign_id ?? NONE, format: c.format ?? NONE, nature: c.nature ?? NONE,
    platform: s(c.platform), business_objective: s(c.business_objective), target_summary: s(c.target_summary), cta: s(c.cta),
    caption: s(c.caption), asset_url: s(c.asset_url), publish_date: s(c.publish_date), week_label: s(c.week_label), link_id: c.link_id ?? NONE,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const sel = (k: keyof typeof f, items: readonly (readonly [string, string])[], label: string) => (
    <div className="space-y-1.5"><Label>{label}</Label>
      <Select value={f[k]} onValueChange={(v) => setF({ ...f, [k]: v })}><SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value={NONE}>—</SelectItem>{items.map(([a, b]) => <SelectItem key={a} value={a}>{b}</SelectItem>)}</SelectContent></Select></div>
  );
  const agg = useMemo(() => aggregate(aggregateInput(m)), [m.links.data, m.contents.data, m.dists.data, m.clicks.data, m.conversions.data, m.ads.data]);
  const r = agg.byContent.get(c.id);

  async function save() {
    const n = (v: string) => (v === NONE || v.trim() === "" ? null : v.trim());
    const { error } = await supabase.from("contents").update({
      title: f.title.trim() || c.title, body: n(f.body), status: f.status, campaign_id: n(f.campaign_id), format: n(f.format), nature: n(f.nature),
      platform: n(f.platform), business_objective: n(f.business_objective), target_summary: n(f.target_summary), cta: n(f.cta),
      caption: n(f.caption), asset_url: n(f.asset_url), publish_date: n(f.publish_date), week_label: n(f.week_label), link_id: n(f.link_id),
    }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Contenu enregistré"); m.reload("contents"); }
  }
  async function openFile() {
    if (!c.file_path) return;
    const { data, error } = await supabase.storage.from("rushs").createSignedUrl(c.file_path, 600);
    if (error) toast.error(error.message); else window.open(data.signedUrl, "_blank");
  }

  return (
    <>
      <DialogHeader><DialogTitle>{c.title}</DialogTitle></DialogHeader>
      <p className="text-xs text-muted-foreground">{typeLabel(c.type)} · {statusLabel(c.status)} · CA attribué {eur(r?.revenue ?? 0)} · {r?.conversions ?? 0} conversion(s) · {r?.clicks ?? 0} clic(s)</p>
      <div className="grid gap-3 md:grid-cols-6">
        <div className="space-y-1.5 md:col-span-4"><Label>Titre / concept</Label><Input value={f.title} onChange={set("title")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Statut</Label>
          <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
        <div className="md:col-span-3">{sel("campaign_id", (m.campaigns.data ?? []).map((x) => [x.id, x.name] as const), "Campagne")}</div>
        <div className="md:col-span-1">{sel("format", FORMATS, "Format")}</div>
        <div className="md:col-span-2">{sel("nature", NATURES, "Nature")}</div>
        <div className="space-y-1.5 md:col-span-2"><Label>Date de publication</Label><Input type="date" value={f.publish_date} onChange={set("publish_date")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Semaine</Label><Input placeholder="S1" value={f.week_label} onChange={set("week_label")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>Plateforme principale</Label><Input placeholder="Instagram" value={f.platform} onChange={set("platform")} /></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Intention business</Label><Input value={f.business_objective} onChange={set("business_objective")} /></div>
        <div className="space-y-1.5 md:col-span-3"><Label>Cible</Label><Input value={f.target_summary} onChange={set("target_summary")} /></div>
        <div className="space-y-1.5 md:col-span-2"><Label>CTA</Label><Input placeholder="Télécharge l'app" value={f.cta} onChange={set("cta")} /></div>
        <div className="space-y-1.5 md:col-span-4"><Label>Asset / visuel (URL ou nom)</Label><Input value={f.asset_url} onChange={set("asset_url")} /></div>
        <div className="space-y-1.5 md:col-span-6"><Label>Légende / copy</Label><Textarea rows={3} value={f.caption} onChange={set("caption")} /></div>
        <div className="space-y-1.5 md:col-span-6"><Label>Brief</Label><Textarea rows={3} value={f.body} onChange={set("body")} /></div>
        <div className="md:col-span-6">{sel("link_id", (m.links.data ?? []).filter((l) => !l.archived_at).map((l) => [l.id, `${l.name} · /r/${l.code}`] as const), "Lien BIIZ principal")}</div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {c.file_path && <Button variant="outline" onClick={openFile}>Ouvrir le fichier ({c.file_name})</Button>}
        <Button onClick={save}>Enregistrer</Button>
      </div>
      <Distributions wsId={wsId} m={m} c={c} />
    </>
  );
}

function Distributions({ wsId, m, c }: { wsId: string; m: MarketingData; c: Content }) {
  const dists = (m.dists.data ?? []).filter((d) => d.content_id === c.id);
  const [channel, setChannel] = useState<string>("instagram");
  const [dest, setDest] = useState("");
  const [adFor, setAdFor] = useState<string | null>(null);
  const camp = m.campaigns.data?.find((x) => x.id === c.campaign_id);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { data: u } = await supabase.auth.getUser();
    let link_id: string | null = null;
    if (dest.trim()) {
      try { new URL(dest.trim()); } catch { toast.error("URL de destination invalide"); return; }
      const mode = channelMode(channel);
      const { data, error } = await supabase.from("links").insert({
        workspace_id: wsId, code: randomCode(), name: `${c.title} · ${channelLabel(channel)}`.slice(0, 160), destination_url: dest.trim(),
        utm_source: channel === "meta_ads" ? "meta" : channel === "google_ads" ? "google" : channel, utm_medium: mode === "paid" ? "paid_social" : mode === "offline" ? "offline" : "social",
        utm_campaign: slugify(camp?.name ?? "sans_campagne") || "sans_campagne", utm_content: slugify(c.title).slice(0, 60) || null,
        campaign_id: c.campaign_id, created_by: u.user!.id,
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      link_id = data.id;
    }
    const { error } = await supabase.from("distributions").insert({
      workspace_id: wsId, content_id: c.id, campaign_id: c.campaign_id, channel, mode: channelMode(channel), link_id, created_by: u.user!.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(link_id ? "Diffusion ajoutée avec son lien BIIZ" : "Diffusion ajoutée");
    setDest(""); m.reload("distributions", "links");
  }
  async function patch(id: string, row: Record<string, unknown>) {
    const { error } = await supabase.from("distributions").update(row).eq("id", id);
    if (error) toast.error(error.message); else m.reload("distributions");
  }
  async function remove(id: string) {
    if (!confirm("Retirer cette diffusion ? La créa reste intacte.")) return;
    const { error } = await supabase.from("distributions").delete().eq("id", id);
    if (error) toast.error(error.message.includes("row-level") ? "Votre rôle ne permet pas de supprimer." : error.message); else m.reload("distributions");
  }

  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="text-sm font-semibold">Diffusions de cette créa ({dists.length})</h3>
      <p className="text-xs text-muted-foreground">Une même créa peut être publiée sur plusieurs canaux sans être dupliquée.</p>
      <ul className="space-y-3">
        {dists.map((d) => {
          const link = m.links.data?.find((l) => l.id === d.link_id);
          const paid = d.mode === "paid";
          return (
            <li key={d.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{channelLabel(d.channel)} <span className="text-xs font-normal text-muted-foreground">· {d.mode === "paid" ? "payant" : d.mode === "offline" ? "offline" : "organique"}{link ? ` · /r/${link.code}` : ""}</span></p>
                <div className="flex items-center gap-1">
                  <Select value={d.status} onValueChange={(v) => void patch(d.id, { status: v, published_on: v === "publie" && !d.published_on ? new Date().toISOString().slice(0, 10) : d.published_on })}>
                    <SelectTrigger className="h-8 w-28" aria-label="Statut de la diffusion"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="prevu">Prévu</SelectItem><SelectItem value="publie">Publié</SelectItem><SelectItem value="termine">Terminé</SelectItem></SelectContent>
                  </Select>
                  {paid && <Button size="sm" variant="outline" onClick={() => setAdFor(adFor === d.id ? null : d.id)}><Megaphone />Chiffres Ads</Button>}
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label="Retirer la diffusion" onClick={() => remove(d.id)}><Trash2 /></Button>
                </div>
              </div>
              {!paid && (
                <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {(["reach", "impressions", "likes", "comments", "shares", "saves", "profile_visits", "clicks"] as const).map((k) => (
                    <label key={k} className="text-[11px] text-muted-foreground">
                      {({ reach: "Portée", impressions: "Impr.", likes: "J'aime", comments: "Comm.", shares: "Partages", saves: "Enreg.", profile_visits: "Profil", clicks: "Clics" })[k]}
                      <Input className="mt-0.5 h-8 px-2 text-sm" inputMode="numeric" defaultValue={d[k] ?? ""} onBlur={(e) => { const v = num(e.target.value); if (v !== (d[k] ?? null)) void patch(d.id, { [k]: v === null ? null : Math.max(0, Math.round(v)) }); }} />
                    </label>
                  ))}
                </div>
              )}
              {paid && adFor === d.id && (
                <div className="mt-2 rounded-md bg-muted/50 p-3">
                  <AdForm wsId={wsId} m={m} preset={{ content_id: c.id, distribution_id: d.id, campaign_id: c.campaign_id, platform: d.channel === "google_ads" ? "google" : "meta" }} onSaved={() => { m.reload("ad_performance"); setAdFor(null); }} />
                </div>
              )}
              {paid && (m.ads.data ?? []).filter((a) => a.distribution_id === d.id).map((a) => <p key={a.id} className="mt-1 text-xs text-muted-foreground">{a.name} · {eur(Number(a.spend))} dépensés · {a.conversions} conv. · CA {eur(Number(a.revenue))}</p>)}
            </li>
          );
        })}
      </ul>
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
        <Select value={channel} onValueChange={setChannel}><SelectTrigger aria-label="Canal"><SelectValue /></SelectTrigger>
          <SelectContent>{CHANNELS.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select>
        <Input placeholder="URL de destination pour générer un lien BIIZ (facultatif)" value={dest} onChange={(e) => setDest(e.target.value)} />
        <Button type="submit"><Link2 />Diffuser</Button>
      </form>
    </section>
  );
}
