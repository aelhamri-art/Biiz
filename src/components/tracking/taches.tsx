import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

type TTask = {
  id: string; title: string; description: string | null; status: string; due_date: string | null;
  location: string | null; assignee_id: string | null; content_id: string | null;
};
type Member = { user_id: string; email: string };
type ContentLite = { id: string; title: string };

const STATUSES = [
  ["a_faire", "À faire"], ["en_cours", "En cours"], ["bloque", "Bloqué"], ["termine", "Terminé"],
] as const;
const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;

export function TachesPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [who, setWho] = useState("tous");
  const [editing, setEditing] = useState<Partial<TTask> | null>(null);

  const me = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const tasks = useQuery({
    queryKey: ["tasks", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("workspace_id", wsId).order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as TTask[];
    },
  });
  const members = useQuery({
    queryKey: ["members", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members", { _ws: wsId });
      if (error) throw error;
      return data as Member[];
    },
  });
  const contents = useQuery({
    queryKey: ["contents", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContentLite[];
    },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: ["tasks", wsId] });

  const email = (id: string | null) => members.data?.find((m) => m.user_id === id)?.email.split("@")[0] ?? "Non assignée";
  const contentTitle = (id: string | null) => contents.data?.find((c) => c.id === id)?.title;

  const visible = useMemo(() => (tasks.data ?? []).filter((t) =>
    who === "tous" ? true : who === "moi" ? t.assignee_id === me.data : who === "none" ? !t.assignee_id : t.assignee_id === who,
  ), [tasks.data, who, me.data]);

  async function setStatus(t: TTask, status: string) {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", t.id);
    if (error) toast.error(error.message); else reload();
  }

  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={who} onValueChange={setWho}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Toutes les tâches</SelectItem>
            <SelectItem value="moi">Mes tâches</SelectItem>
            <SelectItem value="none">Non assignées</SelectItem>
            {(members.data ?? []).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => setEditing({ status: "a_faire" })}>Nouvelle tâche</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {STATUSES.map(([sk, sl]) => {
          const list = visible.filter((t) => t.status === sk);
          return (
            <div key={sk} className="rounded-lg border bg-card">
              <p className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{sl} · {list.length}</p>
              <ul className="space-y-2 p-3">
                {list.map((t) => {
                  const late = t.due_date && t.due_date < today && t.status !== "termine";
                  const ct = contentTitle(t.content_id);
                  return (
                    <li key={t.id} className="rounded-md border bg-background p-3 text-sm">
                      <button className="w-full text-left font-medium hover:underline" onClick={() => setEditing(t)}>{t.title}</button>
                      <p className="mt-1 text-xs text-muted-foreground">👤 {email(t.assignee_id)}</p>
                      {t.due_date && (
                        <p className={cn("text-xs", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                          📅 {format(new Date(t.due_date + "T00:00"), "d MMM", { locale: fr })}{late ? " · en retard" : ""}
                        </p>
                      )}
                      {t.location && <p className="text-xs text-muted-foreground">📍 {t.location}</p>}
                      {ct && <p className="truncate text-xs text-muted-foreground">📝 {ct}</p>}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {STATUSES.filter(([k]) => k !== t.status).map(([k, l]) => (
                          <button key={k} className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent" onClick={() => setStatus(t, k)}>{l}</button>
                        ))}
                      </div>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="py-4 text-center text-xs text-muted-foreground">—</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <TaskForm key={editing.id ?? "new"} wsId={wsId} value={editing} members={members.data ?? []} contents={contents.data ?? []}
              onDone={() => { setEditing(null); reload(); }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskForm({ wsId, value, members, contents, onDone }: {
  wsId: string; value: Partial<TTask>; members: Member[]; contents: ContentLite[]; onDone: () => void;
}) {
  const [f, setF] = useState({
    title: value.title ?? "", description: value.description ?? "", status: value.status ?? "a_faire",
    due_date: value.due_date ?? "", location: value.location ?? "",
    assignee_id: value.assignee_id ?? "none", content_id: value.content_id ?? "none",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      title: f.title.trim(), description: f.description.trim() || null, status: f.status,
      due_date: f.due_date || null, location: f.location.trim() || null,
      assignee_id: f.assignee_id === "none" ? null : f.assignee_id,
      content_id: f.content_id === "none" ? null : f.content_id,
    };
    const { error } = value.id
      ? await supabase.from("tasks").update(payload).eq("id", value.id)
      : await supabase.from("tasks").insert({ ...payload, workspace_id: wsId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(value.id ? "Tâche mise à jour" : "Tâche créée");
    onDone();
  }
  async function remove() {
    if (!value.id || !confirm("Supprimer cette tâche ?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", value.id);
    if (error) { toast.error(error.message); return; }
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <DialogHeader><DialogTitle>{value.id ? "Modifier la tâche" : "Nouvelle tâche terrain"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>Titre</Label><Input required value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Filmer 5 plans vitrine" /></div>
        <div className="space-y-1.5">
          <Label>Assignée à</Label>
          <Select value={f.assignee_id} onValueChange={(v) => set("assignee_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Personne</SelectItem>
              {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Statut</Label>
          <Select value={f.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Échéance</Label><Input type="date" value={f.due_date} onChange={(e) => set("due_date", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Lieu</Label><Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Boutique Berlin" /></div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Contenu à produire</Label>
          <Select value={f.content_id} onValueChange={(v) => set("content_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {contents.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Consignes</Label><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Plans à filmer, format, matériel…" /></div>
      </div>
      <p className="text-xs text-muted-foreground">Statut actuel : {statusLabel(f.status)}</p>
      <div className="flex justify-between">
        {value.id ? <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>Supprimer</Button> : <span />}
        <Button type="submit" disabled={busy}>{busy ? "…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}
