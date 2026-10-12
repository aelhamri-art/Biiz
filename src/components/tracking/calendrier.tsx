import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TEvent = {
  id: string; workspace_id: string; kind: string; title: string; event_date: string;
  start_time: string | null; location: string | null; notes: string | null; content_id: string | null;
};
type TContentLite = { id: string; title: string; due_date: string | null; status: string };

const KINDS = [
  ["tournage", "Tournage", "bg-primary text-primary-foreground"],
  ["publication", "Publication", "bg-chart-2/10 text-chart-2 border border-chart-2/15"],
  ["echeance", "Échéance", "bg-destructive/15 text-destructive"],
  ["reunion", "Réunion", "bg-chart-5/10 text-chart-5"],
  ["autre", "Autre", "bg-muted text-muted-foreground"],
] as const;
const kindOf = (k: string) => KINDS.find(([v]) => v === k) ?? KINDS[4];

type Item = { key: string; date: string; label: string; kind: string; ev?: TEvent; content?: TContentLite };

export function CalendrierPanel({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [editing, setEditing] = useState<Partial<TEvent> | null>(null);
  const [kindFilter, setKindFilter] = useState("tous");

  const events = useQuery({
    queryKey: ["calendar", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select("*").eq("workspace_id", wsId).order("event_date");
      if (error) throw error;
      return data as TEvent[];
    },
  });
  const contents = useQuery({
    queryKey: ["contents", wsId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as TContentLite[];
    },
  });
  const reload = () => void qc.invalidateQueries({ queryKey: ["calendar", wsId] });

  const items = useMemo(() => {
    const list: Item[] = [];
    (events.data ?? []).forEach((e) =>
      list.push({ key: e.id, date: e.event_date, kind: e.kind, ev: e, label: `${e.start_time ? e.start_time.slice(0, 5) + " " : ""}${e.title}` }),
    );
    (contents.data ?? []).forEach((c) => {
      if (c.due_date && c.status !== "publie") list.push({ key: "c" + c.id, date: c.due_date, kind: "echeance", content: c, label: c.title });
    });
    const byDay: Record<string, Item[]> = {};
    list.filter((i) => kindFilter === "tous" || i.kind === kindFilter).forEach((i) => (byDay[i.date] ??= []).push(i));
    return byDay;
  }, [events.data, contents.data, kindFilter]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  const upcoming = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return Object.entries(items).filter(([d]) => d >= today).sort(([a], [b]) => a.localeCompare(b)).slice(0, 8);
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="biiz-calendar-toolbar flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => setMonth(subMonths(month, 1))} aria-label="Mois précédent"><ChevronLeft /></Button>
          <p className="min-w-40 text-center font-medium capitalize">{format(month, "MMMM yyyy", { locale: fr })}</p>
          <Button size="icon" variant="outline" onClick={() => setMonth(addMonths(month, 1))} aria-label="Mois suivant"><ChevronRight /></Button>
          <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>Aujourd'hui</Button>
        </div>
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tous">Tout afficher</SelectItem>
              {KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing({ kind: "tournage", event_date: format(new Date(), "yyyy-MM-dd") })}><Plus />Planifier</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {KINDS.map(([k, l, cls]) => <span key={k} className={cn("rounded px-2 py-0.5", cls)}>{l}</span>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-7 border-b text-center text-xs uppercase tracking-wider text-muted-foreground">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = format(d, "yyyy-MM-dd");
              const list = items[key] ?? [];
              return (
                <div
                  key={key}
                  onClick={() => setEditing({ kind: "tournage", event_date: key })}
                  className={cn("biiz-calendar-cell cursor-pointer border-b border-r p-1.5 hover:bg-accent/40", !isSameMonth(d, month) && "bg-muted/40 text-muted-foreground")}
                >
                  <p className={cn("mb-1 text-xs", isToday(d) && "inline-block rounded-full bg-primary px-1.5 text-primary-foreground")}>{format(d, "d")}</p>
                  <div className="space-y-1">
                    {list.slice(0, 3).map((i) => (
                      <Button variant="ghost"
                        key={i.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (i.ev) setEditing(i.ev);
                          else toast.info(`Échéance contenu : ${i.label}`, { description: "Modifiable depuis l'onglet Contenus." });
                        }}
                        className={cn("block h-auto w-full truncate rounded px-1.5 py-0.5 text-left text-[11px]", kindOf(i.kind)[2])}
                      >
                        {i.content ? "📝 " : ""}{i.label}
                      </Button>
                    ))}
                    {list.length > 3 && <p className="text-[11px] text-muted-foreground">+{list.length - 3} autres</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 border-t pt-4 lg:border-t-0 lg:border-l lg:pl-5">
          <p className="text-sm font-medium">À venir</p>
          <ul className="mt-3 space-y-3 text-sm">
            {upcoming.length === 0 && <li className="text-xs text-muted-foreground">Rien de planifié.</li>}
            {upcoming.map(([d, list]) => (
              <li key={d}>
                <p className="text-xs capitalize text-muted-foreground">{format(new Date(d + "T00:00"), "EEEE d MMM", { locale: fr })}</p>
                {list.map((i) => (
                  <p key={i.key} className="mt-1 flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", kindOf(i.kind)[2])} />
                    <span className="truncate">{i.label}</span>
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <EventDialog wsId={wsId} value={editing} contents={contents.data ?? []} onClose={() => setEditing(null)} onSaved={reload} />
    </div>
  );
}

function EventDialog({ wsId, value, contents, onClose, onSaved }: {
  wsId: string; value: Partial<TEvent> | null; contents: TContentLite[]; onClose: () => void; onSaved: () => void;
}) {
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {value && <EventForm key={value.id ?? value.event_date} wsId={wsId} value={value} contents={contents} onClose={onClose} onSaved={onSaved} />}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({ wsId, value, contents, onClose, onSaved }: {
  wsId: string; value: Partial<TEvent>; contents: TContentLite[]; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState({
    kind: value.kind ?? "tournage", title: value.title ?? "", event_date: value.event_date ?? "",
    start_time: value.start_time?.slice(0, 5) ?? "", location: value.location ?? "", notes: value.notes ?? "",
    content_id: value.content_id ?? "none",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload = {
      kind: f.kind, title: f.title.trim(), event_date: f.event_date, start_time: f.start_time || null,
      location: f.location.trim() || null, notes: f.notes.trim() || null,
      content_id: f.content_id === "none" ? null : f.content_id,
    };
    const { error } = value.id
      ? await supabase.from("calendar_events").update(payload).eq("id", value.id)
      : await supabase.from("calendar_events").insert({ ...payload, workspace_id: wsId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(value.id ? "Mis à jour" : "Ajouté au calendrier");
    onSaved(); onClose();
  }
  async function remove() {
    if (!value.id || !confirm("Supprimer cet élément du calendrier ?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", value.id);
    if (error) { toast.error(error.message); return; }
    onSaved(); onClose();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <DialogHeader><DialogTitle>{value.id ? "Modifier" : "Planifier"}</DialogTitle></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={f.kind} onValueChange={(v) => set("kind", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Titre</Label><Input required value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Tournage Reel boutique" /></div>
        <div className="space-y-1.5"><Label>Date</Label><Input required type="date" value={f.event_date} onChange={(e) => set("event_date", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Heure</Label><Input type="time" value={f.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Lieu</Label><Input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Boutique, studio…" /></div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Contenu lié</Label>
          <Select value={f.content_id} onValueChange={(v) => set("content_id", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {contents.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Notes</Label><Textarea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Équipe, matériel, consignes…" /></div>
      </div>
      <div className="flex justify-between">
        {value.id ? <Button type="button" variant="ghost" className="text-destructive" onClick={remove}>Supprimer</Button> : <span />}
        <Button type="submit" disabled={busy}>{busy ? "…" : "Enregistrer"}</Button>
      </div>
    </form>
  );
}
