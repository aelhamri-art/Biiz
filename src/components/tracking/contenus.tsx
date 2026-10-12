import { Plus, UserRound, CalendarDays, MapPin, FileText, Paperclip, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

export type TContent = {
  id: string; workspace_id: string; type: string; title: string; body: string | null;
  status: string; due_date: string | null; file_path: string | null; file_name: string | null;
  created_by: string; created_at: string;
};

const TYPES = [
  ["brief", "Brief"], ["script", "Script"], ["concept", "Concept"], ["plan_tournage", "Plan de tournage"],
  ["rush", "Rush"], ["crea", "Créa"], ["doc", "Document"],
] as const;

const STATUSES = [
  ["idee", "Idée"], ["en_cours", "En cours"], ["a_valider", "À valider"], ["valide", "Validé"], ["publie", "Publié"],
] as const;

const typeLabel = (t: string) => TYPES.find(([k]) => k === t)?.[1] ?? t;
const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;

export function ContenusPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("tous");
  const [open, setOpen] = useState<TContent | null>(null);

  const contents = useQuery({
    queryKey: ["contents", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as TContent[];
    },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: ["contents", wsId] });

  const visible = useMemo(
    () => (contents.data ?? []).filter((c) => filter === "tous" || c.type === filter),
    [contents.data, filter],
  );
  const byStatus = useMemo(() => {
    const m: Record<string, TContent[]> = {};
    STATUSES.forEach(([k]) => (m[k] = []));
    visible.forEach((c) => (m[c.status] ??= []).push(c));
    return m;
  }, [visible]);

  async function setStatus(c: TContent, status: string) {
    const { error } = await supabase.from("contents").update({ status }).eq("id", c.id);
    if (error) toast.error(error.message); else reload();
  }
  async function remove(c: TContent) {
    if (!confirm(`Supprimer « ${c.title} » ?`)) return;
    if (c.file_path) await supabase.storage.from("rushs").remove([c.file_path]);
    const { error } = await supabase.from("contents").delete().eq("id", c.id);
    if (error) toast.error(error.message); else reload();
  }

  return (
    <div className="space-y-4">
      <NewContentForm wsId={wsId} onCreated={reload} />
      <div className="biiz-filters flex flex-wrap items-center gap-2">
        <Button size="sm" variant={filter === "tous" ? "default" : "outline"} onClick={() => setFilter("tous")}>Tous</Button>
        {TYPES.map(([k, label]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{label}</Button>
        ))}
      </div>
      <div className="biiz-board grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {STATUSES.map(([sk, slabel]) => (
          <div key={sk} data-status={sk} className="biiz-board-column">
            <p className="text-muted-foreground">
              {slabel} · {byStatus[sk]?.length ?? 0}
            </p>
            <ul className="space-y-2 p-3">
              {(byStatus[sk] ?? []).map((c) => (
                <li key={c.id} className="rounded-md border bg-background p-3 text-sm">
                  <Button variant="ghost" className="h-auto w-full justify-start whitespace-normal p-0 text-left font-medium hover:bg-transparent hover:text-primary" onClick={() => setOpen(c)}>{c.title}</Button>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {typeLabel(c.type)}{c.due_date ? ` · ${format(new Date(c.due_date), "d MMM", { locale: fr })}` : ""}
                    {c.file_name ? ` · ${c.file_name}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {STATUSES.filter(([k]) => k !== c.status).map(([k, l]) => (
                      <Button key={k} variant="ghost" className="h-6 rounded px-1.5 text-[11px] text-muted-foreground" onClick={() => setStatus(c, k)}>{l}</Button>
                    ))}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(c)} aria-label="Supprimer le contenu" title="Supprimer"><Trash2 className="size-3" /></Button>
                  </div>
                </li>
              ))}
              {(byStatus[sk] ?? []).length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">—</li>}
            </ul>
          </div>
        ))}
      </div>
      <ContentDialog content={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function NewContentForm({ wsId, onCreated }: { wsId: string; onCreated: () => void }) {
  const [type, setType] = useState<string>("brief");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [due, setDue] = useState("");
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
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Contenu ajouté");
      setTitle(""); setBody(""); setDue(""); setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="biiz-editor">
      <p className="text-sm font-medium">Nouveau contenu</p>
      <div className="mt-4 grid gap-4 md:grid-cols-6">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-3"><Label>Titre</Label><Input required placeholder="Script Reel combo LTZ" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Échéance</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Fichier (rush, créa…)</Label><Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <div className="space-y-1.5 md:col-span-6"><Label>Contenu / notes</Label><Textarea rows={3} placeholder="Angle, script, plan de tournage, consignes…" value={body} onChange={(e) => setBody(e.target.value)} /></div>
      </div>
      <div className="mt-4 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "Envoi…" : <><Plus />Ajouter</>}</Button></div>
    </form>
  );
}

function ContentDialog({ content, onClose }: { content: TContent | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  async function openFile() {
    if (!content?.file_path) return;
    const { data, error } = await supabase.storage.from("rushs").createSignedUrl(content.file_path, 600);
    if (error) { toast.error(error.message); return; }
    setUrl(data.signedUrl);
    window.open(data.signedUrl, "_blank");
  }
  return (
    <Dialog open={!!content} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{content?.title}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          {content ? typeLabel(content.type) : ""} · {content ? statusLabel(content.status) : ""}
          {content?.due_date ? ` · échéance ${format(new Date(content.due_date), "d MMMM yyyy", { locale: fr })}` : ""}
        </p>
        {content?.body && <p className="whitespace-pre-wrap text-sm">{content.body}</p>}
        {content?.file_path && (
          <Button variant="outline" onClick={openFile}>Ouvrir le fichier{url ? "" : ` (${content.file_name})`}</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
