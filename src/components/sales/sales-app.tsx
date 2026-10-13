import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3, BookOpen, CalendarClock, ChevronLeft, ChevronRight, Columns3, Globe, Phone, PhoneCall, Plus, Search, Sun, Upload, Users, Pencil, Loader2, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BiizBee, BiizSalesLogo } from "./BiizBee";
import {
  type Account, type CoachCard, DEFAULT_PLAYBOOK, EVIDENCE, OUTCOMES, type OutcomeId, PRICING, PRIORITIES, STAGES, STAGE_GOAL,
  addDays, delta, findDuplicates, isoDate, mergePlaybook, outcomeLabel, parseCsv, periodStats, qualityBadges, stageLabel, startOfDay, startOfWeek,
} from "@/lib/sales";

export type Zone = "today" | "prospects" | "call" | "coach" | "pipeline" | "perf";
const ZONES: { id: Zone; label: string; icon: typeof Sun }[] = [
  { id: "today", label: "Aujourd'hui", icon: Sun },
  { id: "prospects", label: "Prospects", icon: Users },
  { id: "call", label: "Prospection", icon: PhoneCall },
  { id: "coach", label: "Coach", icon: BookOpen },
  { id: "pipeline", label: "Pipeline", icon: Columns3 },
  { id: "perf", label: "Performance", icon: BarChart3 },
];

function useSales(wsId: string | null) {
  const on = !!wsId;
  const since = isoDate(addDays(startOfWeek(), -28));
  const accounts = useQuery({ queryKey: ["sales", wsId, "accounts"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.from("sales_accounts").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false }).limit(2000);
    if (error) throw error; return data;
  } });
  const activities = useQuery({ queryKey: ["sales", wsId, "activities"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.from("sales_activities").select("*").eq("workspace_id", wsId!).gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
    if (error) throw error; return data;
  } });
  const actions = useQuery({ queryKey: ["sales", wsId, "actions"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.from("sales_next_actions").select("*").eq("workspace_id", wsId!).is("done_at", null).order("next_action_date");
    if (error) throw error; return data;
  } });
  const history = useQuery({ queryKey: ["sales", wsId, "history"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.from("sales_stage_history").select("*").eq("workspace_id", wsId!).gte("created_at", since).order("created_at", { ascending: false }).limit(5000);
    if (error) throw error; return data;
  } });
  const members = useQuery({ queryKey: ["sales", wsId, "members"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.rpc("list_members", { _ws: wsId! });
    if (error) throw error; return data;
  } });
  const cards = useQuery({ queryKey: ["sales", wsId, "coach"], enabled: on, queryFn: async () => {
    const { data, error } = await supabase.from("sales_coach_cards").select("*").eq("workspace_id", wsId!);
    if (error) throw error; return data;
  } });
  const me = useQuery({ queryKey: ["sales", "me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });
  const prefs = useQuery({ queryKey: ["sales", wsId, "prefs"], enabled: on && !!me.data, queryFn: async () => {
    const { data, error } = await supabase.from("sales_preferences").select("*").eq("workspace_id", wsId!).eq("user_id", me.data!).maybeSingle();
    if (error) throw error; return data;
  } });
  return { accounts, activities, actions, history, members, cards, me, prefs };
}
type S = ReturnType<typeof useSales>;

export function SalesApp() {
  const qc = useQueryClient();
  const ws = useQuery({ queryKey: ["sales-workspaces"], queryFn: async () => {
    await supabase.rpc("claim_invites");
    const { data, error } = await supabase.from("workspaces").select("id,name").eq("app", "sales").order("created_at");
    if (error) throw error; return data;
  } });
  const [wsId, setWsId] = useState<string | null>(null);
  const [zone, setZone] = useState<Zone>("today");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (wsId || !ws.data?.length) return;
    const saved = localStorage.getItem("biiz:sales:ws");
    setWsId(ws.data.find((w) => w.id === saved)?.id ?? ws.data[0]?.id ?? null);
  }, [ws.data, wsId]);
  useEffect(() => { if (wsId) localStorage.setItem("biiz:sales:ws", wsId); }, [wsId]);

  const [newSpace, setNewSpace] = useState("");
  async function createSpace(e: React.FormEvent) {
    e.preventDefault();
    const name = newSpace.trim().slice(0, 80);
    if (!name) return;
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("workspaces").insert({ name, app: "sales", created_by: u.user!.id }).select("id").single();
    if (error) { toast.error(error.message); return; }
    setNewSpace(""); toast.success(`Espace « ${name} » créé`);
    await qc.invalidateQueries({ queryKey: ["sales-workspaces"] });
    setWsId(data.id);
  }
  const s = useSales(wsId);
  const refresh = () => qc.invalidateQueries({ queryKey: ["sales", wsId] });
  const go = (z: Zone) => { setZone(z); window.scrollTo({ top: 0 }); };
  const startCall = (id: string) => { setFocusId(id); setDetailId(null); go("call"); };
  const loading = ws.isLoading || s.accounts.isLoading;
  const error = ws.error || s.accounts.error || s.activities.error || s.actions.error;

  return (
    <div className="biiz-sales min-h-screen bg-background pb-24 lg:pb-0 lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card lg:flex">
        <div className="px-5 py-5"><BiizSalesLogo /></div>
        <div className="sales-stripes mx-5 mb-4 h-1.5 rounded-full" aria-hidden />
        <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Sales">
          {ZONES.map((z) => (
            <button key={z.id} onClick={() => go(z.id)} aria-current={zone === z.id ? "page" : undefined} className="sales-nav-item">
              <z.icon className="size-4" />{z.label}
            </button>
          ))}
        </nav>
        <form onSubmit={createSpace} className="flex gap-1.5 border-t p-3"><Input className="h-9" placeholder="Nouvel espace" value={newSpace} onChange={(e) => setNewSpace(e.target.value)} aria-label="Nouvel espace de vente" /><Button size="icon" variant="outline" type="submit" aria-label="Créer"><Plus /></Button></form>
      </aside>

      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="sales-stripes h-1 lg:hidden" aria-hidden />
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 lg:px-8">
          <span className="lg:hidden"><BiizBee size={30} /></span>
          <h1 className="text-[15px] font-semibold tracking-tight">{ZONES.find((z) => z.id === zone)?.label}</h1>
          <div className="ml-auto flex items-center gap-2">
            {ws.data && ws.data.length > 0 && (
              <Select value={wsId ?? ""} onValueChange={(v) => { setWsId(v); setFocusId(null); }}>
                <SelectTrigger className="h-9 w-36 sm:w-44" aria-label="Projet"><SelectValue /></SelectTrigger>
                <SelectContent>{ws.data.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 lg:px-8 lg:py-8">
        {error ? <Empty title="Chargement impossible" text={(error as Error).message} action={<Button variant="outline" onClick={refresh}>Réessayer</Button>} />
        : !ws.isLoading && ws.data?.length === 0 ? (
          <div className="mx-auto max-w-sm py-14 text-center">
            <BiizBee size={72} className="mx-auto" />
            <h2 className="mt-5 text-xl font-semibold tracking-tight">Créez votre espace de vente</h2>
            <p className="mt-1 text-sm text-muted-foreground">BIIZ Sales a ses propres espaces, séparés de BIIZ Marketing. Ex. LIVROUM.</p>
            <form onSubmit={createSpace} className="mt-5 flex gap-2"><Input className="h-11" placeholder="Nom de l'espace" value={newSpace} onChange={(e) => setNewSpace(e.target.value)} autoFocus /><Button className="h-11" type="submit">Créer</Button></form>
          </div>
        )
        : loading || !wsId ? <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="animate-spin" /></div>
        : zone === "today" ? <Today s={s} onAdd={() => setNewOpen(true)} onCall={startCall} onOpen={setDetailId} />
        : zone === "prospects" ? <Prospects s={s} wsId={wsId} onAdd={() => setNewOpen(true)} onOpen={setDetailId} refresh={refresh} />
        : zone === "call" ? <Prospection s={s} focusId={focusId} setFocusId={setFocusId} refresh={refresh} />
        : zone === "coach" ? <Coach s={s} wsId={wsId} refresh={refresh} />
        : zone === "pipeline" ? <Pipeline s={s} onOpen={setDetailId} refresh={refresh} />
        : <Performance s={s} wsId={wsId} refresh={refresh} />}
      </main>

      <nav className="sales-bottom-nav lg:hidden" aria-label="Sales">
        {ZONES.map((z) => (
          <button key={z.id} onClick={() => go(z.id)} aria-current={zone === z.id ? "page" : undefined}>
            <z.icon className="size-5" /><span>{z.label === "Aujourd'hui" ? "Jour" : z.label === "Performance" ? "Perf" : z.label === "Prospection" ? "Appel" : z.label}</span>
          </button>
        ))}
      </nav>

      {wsId && <AccountSheet open={newOpen} onOpenChange={setNewOpen} wsId={wsId} s={s} refresh={refresh} />}
      {wsId && detailId && <DetailSheet id={detailId} onClose={() => setDetailId(null)} wsId={wsId} s={s} refresh={refresh} onCall={startCall} />}
    </div>
  );
}

/* ---------- petits éléments ---------- */
function Empty({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <BiizBee size={40} className="mx-auto text-muted-foreground" />
      <p className="mt-4 font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
function Metric({ label, value, sub }: { label: string; value: number | string; sub?: string | null }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function StageChip({ stage }: { stage: string }) {
  return <span className="sales-chip" data-stage={stage}>{stageLabel(stage)}</span>;
}
function memberName(s: S, id?: string | null) {
  if (!id) return "Non assigné";
  if (id === s.me.data) return "Moi";
  return s.members.data?.find((m) => m.user_id === id)?.email?.split("@")[0] ?? "Membre";
}
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const fmtTime = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* ---------- 1. Aujourd'hui ---------- */
function Today({ s, onAdd, onCall, onOpen }: { s: S; onAdd: () => void; onCall: (id: string) => void; onOpen: (id: string) => void }) {
  const accounts = s.accounts.data ?? [];
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const today = isoDate(new Date());
  const mine = (s.actions.data ?? []).filter((a) => !a.assignee_id || a.assignee_id === s.me.data);
  const due = mine.filter((a) => a.next_action_date <= today);
  const myActs = (s.activities.data ?? []).filter((a) => a.actor_id === s.me.data);
  const st = periodStats(myActs, (s.history.data ?? []).filter((h) => h.actor_id === s.me.data), startOfDay(), addDays(startOfDay(), 1));
  const week = periodStats(myActs, [], startOfWeek(), addDays(startOfWeek(), 7));
  const goal = s.prefs.data?.weekly_challenge;
  const showGoal = goal && !s.prefs.data?.hide_goals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Appels" value={st.calls} sub="aujourd'hui" />
        <Metric label="Conversations utiles" value={st.useful} sub="aujourd'hui" />
        <Metric label="R2 pris" value={st.r2Taken} sub="aujourd'hui" />
      </div>
      {showGoal && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex justify-between text-sm"><span>Mon défi de la semaine</span><span className="tabular-nums text-muted-foreground">{week.calls} / {goal} appels</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="sales-lime-bar h-full" style={{ width: `${Math.min(100, (week.calls / goal) * 100)}%` }} /></div>
        </div>
      )}
      <Button onClick={onAdd} size="lg" className="h-12 w-full sm:w-auto"><Plus />Ajouter un prospect</Button>

      <section>
        <h2 className="sales-h2">À faire maintenant <span className="text-muted-foreground">· {due.length}</span></h2>
        {due.length === 0 ? <Empty title="Rien en retard" text="Aucune action due aujourd'hui. Les prochaines actions datées apparaîtront ici." /> : (
          <ul className="divide-y rounded-xl border bg-card">
            {due.map((a) => { const acc = byId.get(a.account_id); if (!acc) return null; const late = a.next_action_date < today; return (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(acc.id)}>
                  <p className="truncate font-medium">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{a.label} · <span className={late ? "font-medium text-destructive" : ""}>{late ? `en retard (${fmtDate(a.next_action_date)})` : "aujourd'hui"}</span></p>
                </button>
                <Button size="sm" onClick={() => onCall(acc.id)}><PhoneCall />Traiter</Button>
              </li>
            ); })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="sales-h2">Derniers contacts</h2>
        {(s.activities.data ?? []).length === 0 ? <Empty title="Aucun appel enregistré" text="Après chaque appel, note le résultat dans Prospection : il apparaîtra ici." /> : (
          <ul className="divide-y rounded-xl border bg-card">
            {(s.activities.data ?? []).slice(0, 6).map((a) => (
              <li key={a.id}><button onClick={() => onOpen(a.account_id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{byId.get(a.account_id)?.name ?? "Prospect"}</span><span className="block truncate text-xs text-muted-foreground">{outcomeLabel(a.outcome)}{a.note ? ` · ${a.note}` : ""}</span></span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtTime(a.created_at)}</span>
              </button></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- 2. Prospects ---------- */
function Prospects({ s, wsId, onAdd, onOpen, refresh }: { s: S; wsId: string; onAdd: () => void; onOpen: (id: string) => void; refresh: () => void }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [prio, setPrio] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const accounts = s.accounts.data ?? [];
  const list = accounts.filter((a) => {
    const t = q.trim().toLowerCase();
    if (t && ![a.name, a.city, a.segment, a.phone].some((v) => v?.toLowerCase().includes(t))) return false;
    if (stage !== "all" && a.stage !== stage) return false;
    if (prio !== "all" && a.priority !== prio) return false;
    return true;
  });

  async function importCsv(f: File) {
    setImporting(true);
    try {
      const rows = parseCsv(await f.text());
      if (!rows.length) { toast.error("Fichier illisible : il faut une colonne « nom »."); return; }
      const seen: Pick<Account, "id" | "name" | "phone">[] = [...accounts];
      const fresh = rows.filter((r) => { if (findDuplicates(seen, r.name!, r.phone).length) return false; seen.push({ id: crypto.randomUUID(), name: r.name!, phone: r.phone ?? null }); return true; });
      if (!fresh.length) { toast.info(`${rows.length} lignes lues, toutes déjà présentes.`); return; }
      const uid = s.me.data!;
      const { error } = await supabase.from("sales_accounts").insert(fresh.map((r) => ({ ...r, name: r.name!, workspace_id: wsId, created_by: uid, source: r.source ?? "import CSV", evidence: "public" })));
      if (error) throw error;
      toast.success(`${fresh.length} prospects importés · ${rows.length - fresh.length} doublons ignorés`);
      refresh();
    } catch (e) { toast.error((e as Error).message); } finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 pl-9" placeholder="Nom, ville, segment, téléphone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" /></div>
        <Button className="h-11" onClick={onAdd}><Plus /><span className="hidden sm:inline">Nouveau</span></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={stage} onValueChange={setStage}><SelectTrigger className="h-9 w-36" aria-label="Étape"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes étapes</SelectItem>{STAGES.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select>
        <Select value={prio} onValueChange={setPrio}><SelectTrigger className="h-9 w-32" aria-label="Priorité"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Priorités</SelectItem>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
        <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
        <Button variant="outline" size="sm" className="ml-auto h-9" disabled={importing} onClick={() => fileRef.current?.click()} title="Colonnes : nom, téléphone, ville, site, segment, priorité, source">{importing ? <Loader2 className="animate-spin" /> : <Upload />}Import CSV</Button>
      </div>
      <p className="text-xs text-muted-foreground">{list.length} sur {accounts.length} prospects</p>
      {accounts.length === 0 ? <Empty title="Aucun prospect" text="Ajoute ton premier restaurant, ou importe un CSV (colonnes nom, téléphone, ville…)." action={<Button onClick={onAdd}><Plus />Ajouter</Button>} />
      : list.length === 0 ? <Empty title="Aucun résultat" text="Modifie la recherche ou les filtres." />
      : (
        <ul className="divide-y rounded-xl border bg-card">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => onOpen(a.id)}>
                <p className="flex items-center gap-2 truncate font-medium">{a.priority && <span className="sales-prio">{a.priority}</span>}{a.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{[a.city, a.segment, memberName(s, a.owner_id), a.last_activity_at ? `vu ${fmtDate(a.last_activity_at)}` : "jamais contacté"].filter(Boolean).join(" · ")}</p>
              </button>
              <StageChip stage={a.stage} />
              {a.phone && <a href={`tel:${a.phone}`} aria-label={`Appeler ${a.name}`}><Button size="icon" variant="ghost"><Phone /></Button></a>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Form = { name: string; phone: string; website: string; city: string; segment: string; priority: string; owner_id: string; source: string; evidence: string; amount: string; notes: string };
const toForm = (a?: Account | null): Form => ({ name: a?.name ?? "", phone: a?.phone ?? "", website: a?.website ?? "", city: a?.city ?? "", segment: a?.segment ?? "", priority: a?.priority ?? "none", owner_id: a?.owner_id ?? "me", source: a?.source ?? "", evidence: a?.evidence ?? "public", amount: a?.amount != null ? String(a.amount) : "", notes: a?.notes ?? "" });

function AccountForm({ initial, s, wsId, onDone }: { initial?: Account | null; s: S; wsId: string; onDone: () => void }) {
  const [f, setF] = useState<Form>(toForm(initial));
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const dups = f.name.trim().length > 1 ? findDuplicates(s.accounts.data ?? [], f.name, f.phone, initial?.id) : [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) { toast.error("Le nom est obligatoire."); return; }
    if (f.website && !/^https?:\/\//i.test(f.website.trim())) { toast.error("Le site doit commencer par http:// ou https://"); return; }
    const amount = f.amount.trim() ? Number(f.amount.replace(",", ".")) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) { toast.error("Montant invalide."); return; }
    if (dups.length && !confirm(`« ${dups[0]?.name} » existe déjà (même nom ou téléphone). Enregistrer quand même ?`)) return;
    setBusy(true);
    const row = {
      name: name.slice(0, 160), phone: f.phone.trim() || null, website: f.website.trim() || null, city: f.city.trim() || null, segment: f.segment.trim() || null,
      priority: f.priority === "none" ? null : f.priority, owner_id: f.owner_id === "none" ? null : f.owner_id === "me" ? s.me.data! : f.owner_id,
      source: f.source.trim() || null, evidence: f.evidence, amount, notes: f.notes.trim() || null,
    };
    const { error } = initial
      ? await supabase.from("sales_accounts").update(row).eq("id", initial.id)
      : await supabase.from("sales_accounts").insert({ ...row, workspace_id: wsId, created_by: s.me.data! });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(initial ? "Prospect mis à jour" : "Prospect ajouté");
    onDone();
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="Nom *"><Input value={f.name} onChange={set("name")} maxLength={160} autoFocus={!initial} required /></Field>
      {dups.length > 0 && <p className="rounded-md bg-secondary px-3 py-2 text-xs">Doublon possible : <b>{dups.map((d) => d.name).join(", ")}</b></p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Téléphone"><Input type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} maxLength={30} /></Field>
        <Field label="Ville"><Input value={f.city} onChange={set("city")} maxLength={80} /></Field>
      </div>
      <Field label="Site web"><Input type="url" placeholder="https://" value={f.website} onChange={set("website")} maxLength={300} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Segment"><Input placeholder="Burger, pizzeria…" value={f.segment} onChange={set("segment")} maxLength={60} /></Field>
        <Field label="Priorité"><Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Non renseignée</SelectItem>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Responsable"><Select value={f.owner_id} onValueChange={(v) => setF({ ...f, owner_id: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="me">Moi</SelectItem><SelectItem value="none">Personne</SelectItem>{(s.members.data ?? []).filter((m) => m.user_id !== s.me.data).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Source"><Input placeholder="Terrain, Google Maps…" value={f.source} onChange={set("source")} maxLength={80} /></Field>
      </div>
      <Field label="Niveau de preuve"><div className="grid grid-cols-3 gap-1.5">{EVIDENCE.map((e) => <button type="button" key={e.id} title={e.hint} onClick={() => setF({ ...f, evidence: e.id })} className="sales-seg" aria-pressed={f.evidence === e.id}>{e.label}</button>)}</div></Field>
      {initial && <Field label="Montant prospectif (€, facultatif)"><Input inputMode="decimal" value={f.amount} onChange={set("amount")} /></Field>}
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={set("notes")} maxLength={1000} /></Field>
      <Button type="submit" className="h-12 w-full" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Enregistrer</Button>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

function AccountSheet({ open, onOpenChange, wsId, s, refresh }: { open: boolean; onOpenChange: (o: boolean) => void; wsId: string; s: S; refresh: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="biiz-sales w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Nouveau prospect</SheetTitle></SheetHeader>
        <div className="px-4 pb-6">{open && <AccountForm s={s} wsId={wsId} onDone={() => { onOpenChange(false); refresh(); }} />}</div>
      </SheetContent>
    </Sheet>
  );
}

function DetailSheet({ id, onClose, wsId, s, refresh, onCall }: { id: string; onClose: () => void; wsId: string; s: S; refresh: () => void; onCall: (id: string) => void }) {
  const a = s.accounts.data?.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);
  const contacts = useQuery({ queryKey: ["sales", wsId, "contacts", id], queryFn: async () => {
    const { data, error } = await supabase.from("sales_contacts").select("*").eq("account_id", id).order("created_at");
    if (error) throw error; return data;
  } });
  const timeline = useQuery({ queryKey: ["sales", wsId, "timeline", id], queryFn: async () => {
    const [acts, hist] = await Promise.all([
      supabase.from("sales_activities").select("*").eq("account_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("sales_stage_history").select("*").eq("account_id", id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (acts.error) throw acts.error; if (hist.error) throw hist.error;
    return [...acts.data.map((x) => ({ at: x.created_at, text: `${outcomeLabel(x.outcome)}${x.note ? ` — ${x.note}` : ""}`, who: x.actor_id })),
      ...hist.data.map((x) => ({ at: x.created_at, text: x.from_stage ? `${stageLabel(x.from_stage)} → ${stageLabel(x.to_stage)}` : "Créé", who: x.actor_id }))].sort((p, q) => q.at.localeCompare(p.at));
  } });
  const [cName, setCName] = useState(""); const [cRole, setCRole] = useState(""); const [cDec, setCDec] = useState(false);
  async function addContact(e: React.FormEvent) {
    e.preventDefault(); if (!cName.trim()) return;
    const { error } = await supabase.from("sales_contacts").insert({ workspace_id: wsId, account_id: id, name: cName.trim().slice(0, 120), role: cRole.trim() || null, is_decision_maker: cDec, created_by: s.me.data! });
    if (error) { toast.error(error.message); return; }
    setCName(""); setCRole(""); setCDec(false); void contacts.refetch();
  }
  async function remove() {
    if (!a || !confirm(`Supprimer « ${a.name} » et tout son historique ?`)) return;
    const { error } = await supabase.from("sales_accounts").delete().eq("id", a.id);
    if (error) toast.error(error.message); else { toast.success("Prospect supprimé"); onClose(); refresh(); }
  }
  const next = s.actions.data?.find((x) => x.account_id === id);
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="biiz-sales w-full overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle className="pr-6">{a?.name ?? "Prospect"}</SheetTitle></SheetHeader>
        {!a ? <p className="px-4 text-sm text-muted-foreground">Prospect introuvable.</p> : edit ? (
          <div className="px-4 pb-6"><AccountForm initial={a} s={s} wsId={wsId} onDone={() => { setEdit(false); refresh(); }} /><Button variant="ghost" className="mt-2 w-full" onClick={() => setEdit(false)}>Annuler</Button></div>
        ) : (
          <div className="space-y-5 px-4 pb-8">
            <div className="flex flex-wrap items-center gap-2"><StageChip stage={a.stage} />{a.priority && <span className="sales-prio">{a.priority}</span>}<span className="text-xs text-muted-foreground">Preuve : {EVIDENCE.find((e) => e.id === a.evidence)?.label}</span></div>
            <div className="grid grid-cols-2 gap-2">
              {a.phone ? <a href={`tel:${a.phone}`}><Button variant="outline" className="h-11 w-full"><Phone />Appeler</Button></a> : <Button variant="outline" className="h-11" disabled><Phone />Pas de n°</Button>}
              <Button className="h-11" onClick={() => onCall(a.id)}><PhoneCall />Noter un appel</Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[["Téléphone", a.phone], ["Ville", a.city], ["Segment", a.segment], ["Responsable", memberName(s, a.owner_id)], ["Source", a.source], ["Montant prospectif", a.amount != null ? `${a.amount} €` : null], ["Prochaine action", next ? `${next.label} · ${fmtDate(next.next_action_date)}` : null], ["Dernier contact", a.last_activity_at ? fmtTime(a.last_activity_at) : "Jamais"]].map(([k, v]) => v ? <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="truncate">{v}</dd></div> : null)}
            </dl>
            {a.website && <a className="flex items-center gap-2 text-sm underline underline-offset-4" href={a.website} target="_blank" rel="noopener noreferrer"><Globe className="size-4" />{a.website.replace(/^https?:\/\//, "")}</a>}
            {a.notes && <p className="whitespace-pre-wrap rounded-lg bg-secondary/60 p-3 text-sm">{a.notes}</p>}
            <section>
              <h3 className="sales-h2">Contacts</h3>
              <ul className="space-y-1 text-sm">{(contacts.data ?? []).map((c) => <li key={c.id}>{c.name}{c.role && <span className="text-muted-foreground"> · {c.role}</span>}{c.is_decision_maker && <span className="sales-chip ml-2" data-stage="qualifie">Décideur</span>}</li>)}</ul>
              <form onSubmit={addContact} className="mt-2 flex flex-wrap gap-2"><Input className="h-9 min-w-0 flex-1" placeholder="Nom" value={cName} onChange={(e) => setCName(e.target.value)} /><Input className="h-9 w-28" placeholder="Rôle" value={cRole} onChange={(e) => setCRole(e.target.value)} /><label className="flex items-center gap-1.5 text-xs"><Switch checked={cDec} onCheckedChange={setCDec} />Décideur</label><Button size="sm" variant="outline" type="submit"><Plus />Ajouter</Button></form>
            </section>
            <section>
              <h3 className="sales-h2">Historique</h3>
              {timeline.isLoading ? <Loader2 className="animate-spin text-muted-foreground" /> : (
                <ol className="space-y-2 border-l pl-4 text-sm">{(timeline.data ?? []).map((t, i) => <li key={i}><p>{t.text}</p><p className="text-xs text-muted-foreground">{fmtTime(t.at)} · {memberName(s, t.who)}</p></li>)}</ol>
              )}
            </section>
            <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => setEdit(true)}><Pencil />Modifier</Button><Button variant="ghost" className="text-destructive" onClick={remove}>Supprimer</Button></div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- 3. Prospection ---------- */
function Prospection({ s, focusId, setFocusId, refresh }: { s: S; focusId: string | null; setFocusId: (id: string | null) => void; refresh: () => void }) {
  const accounts = s.accounts.data ?? [];
  const today = isoDate(new Date());
  const queue = useMemo(() => {
    const dueIds = new Set((s.actions.data ?? []).filter((a) => a.next_action_date <= today).map((a) => a.account_id));
    const openIds = new Set((s.actions.data ?? []).map((a) => a.account_id));
    const rank = (a: Account) => (dueIds.has(a.id) ? 0 : !openIds.has(a.id) && !a.last_activity_at ? 1 : 2) * 10 + (a.priority ? Number(a.priority[1]) : 4);
    return accounts.filter((a) => a.stage !== "gagne" && a.stage !== "perdu" && (dueIds.has(a.id) || !openIds.has(a.id))).sort((x, y) => rank(x) - rank(y));
  }, [accounts, s.actions.data, today]);
  const acc = accounts.find((a) => a.id === focusId) ?? queue[0];
  const guided = (s.prefs.data?.mode ?? "accompagne") === "accompagne";
  const [outcome, setOutcome] = useState<OutcomeId | null>(null);
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState<string>("");
  const [nextLabel, setNextLabel] = useState("Rappeler");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOutcome(null); setNote(""); setNextDate(""); setNextLabel("Rappeler"); }, [acc?.id]);
  useEffect(() => {
    if (outcome === "pas_repondu" || outcome === "decideur_absent") { setNextDate(isoDate(addDays(new Date(), 1))); setNextLabel("Rappeler"); }
    else if (outcome === "r2") { setNextLabel("R2"); }
    else if (outcome === "refus") setNextDate("");
  }, [outcome]);

  if (!acc) return <Empty title="File vide" text="Aucun prospect à appeler maintenant : pas d'action due ni de lead jamais contacté." />;
  const idx = queue.findIndex((a) => a.id === acc.id);

  async function save() {
    if (!outcome || !acc) return;
    setBusy(true);
    const { error } = await supabase.rpc("sales_log_call", { _account: acc.id, _outcome: outcome, _note: note.slice(0, 1000), _next_date: (nextDate || null) as string, _next_label: nextLabel.slice(0, 120) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(nextDate ? `Enregistré · prochaine action le ${fmtDate(nextDate)}` : "Appel enregistré");
    const nextAcc = queue.find((a, i) => i > idx) ?? null;
    setFocusId(nextAcc?.id ?? null);
    refresh();
  }
  const quick = [["Demain", 1], ["Dans 3 j", 3], ["Dans 1 sem.", 7]] as const;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{idx >= 0 ? `${idx + 1} / ${queue.length} dans la file` : "Hors file"}</span>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" aria-label="Précédent" disabled={idx <= 0} onClick={() => setFocusId(queue[idx - 1]?.id ?? null)}><ChevronLeft /></Button>
          <Button size="icon" variant="ghost" aria-label="Suivant" disabled={idx < 0 || idx >= queue.length - 1} onClick={() => setFocusId(queue[idx + 1]?.id ?? null)}><ChevronRight /></Button>
        </div>
      </div>
      <article className="sales-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-xl font-semibold tracking-tight">{acc.name}</h2><p className="mt-0.5 text-sm text-muted-foreground">{[acc.city, acc.segment, acc.priority].filter(Boolean).join(" · ") || "—"}</p></div>
          <StageChip stage={acc.stage} />
        </div>
        <div className="mt-4 rounded-lg bg-secondary/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Objectif de l'appel</p>
          <p className="mt-1 text-sm">{STAGE_GOAL[acc.stage]}</p>
          {guided && <p className="mt-2 text-xs text-muted-foreground">Question d'ouverture : « {DEFAULT_PLAYBOOK[0]?.next_question} »</p>}
        </div>
        {acc.phone ? <a href={`tel:${acc.phone}`} className="mt-4 block"><Button size="lg" className="h-14 w-full text-base"><Phone />Appeler {acc.phone}</Button></a>
          : <p className="mt-4 rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">Pas de téléphone renseigné.</p>}
        {guided && <p className="mt-2 text-center text-[11px] text-muted-foreground">L'appel n'est enregistré qu'une fois le résultat choisi ci-dessous.</p>}
      </article>

      <section className="sales-card space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">Résultat</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{OUTCOMES.map((o) => <button key={o.id} className="sales-seg h-12" aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}>{o.label}</button>)}</div>
        </div>
        <Textarea rows={2} placeholder="Note courte (ce que tu as appris)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} aria-label="Note" />
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="size-4" />Prochaine action</p>
          <div className="flex flex-wrap gap-2">
            {quick.map(([l, d]) => { const v = isoDate(addDays(new Date(), d)); return <button key={l} className="sales-seg h-10 px-3" aria-pressed={nextDate === v} onClick={() => setNextDate(v)}>{l}</button>; })}
            <button className="sales-seg h-10 px-3" aria-pressed={!nextDate} onClick={() => setNextDate("")}>Aucune</button>
            <Input type="date" className="h-10 w-40" value={nextDate} min={today} onChange={(e) => setNextDate(e.target.value)} aria-label="Date précise" />
          </div>
          {nextDate && <Input className="mt-2 h-10" value={nextLabel} onChange={(e) => setNextLabel(e.target.value)} maxLength={120} aria-label="Intitulé de l'action" />}
        </div>
        <Button size="lg" className="h-12 w-full" disabled={!outcome || busy} onClick={save}>{busy ? <Loader2 className="animate-spin" /> : <Check />}Enregistrer et suivant</Button>
      </section>
    </div>
  );
}

/* ---------- 4. Coach ---------- */
function Coach({ s, wsId, refresh }: { s: S; wsId: string; refresh: () => void }) {
  const cards = mergePlaybook((s.cards.data ?? []) as CoachCard[]);
  const [i, setI] = useState<number | null>(null);
  const [edit, setEdit] = useState<CoachCard | null>(null);
  const [busy, setBusy] = useState(false);
  const card = i !== null ? cards[i] : null;

  async function saveCard(e: React.FormEvent) {
    e.preventDefault(); if (!edit) return;
    if (!edit.title.trim() || !edit.advice.trim()) { toast.error("Titre et conseil obligatoires."); return; }
    setBusy(true);
    const row = { title: edit.title.trim(), advice: edit.advice.trim(), next_question: edit.next_question?.trim() || null, goal: edit.goal?.trim() || null, listen: edit.listen?.trim() || null, position: edit.position, updated_by: s.me.data! };
    const { error } = edit.id ? await supabase.from("sales_coach_cards").update(row).eq("id", edit.id)
      : await supabase.from("sales_coach_cards").insert({ ...row, slug: edit.slug, workspace_id: wsId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Carte enregistrée pour l'équipe"); setEdit(null); refresh();
  }

  if (edit) return (
    <form onSubmit={saveCard} className="mx-auto max-w-xl space-y-3">
      <Field label="Situation"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={120} /></Field>
      <Field label="Conseil"><Textarea rows={4} value={edit.advice} onChange={(e) => setEdit({ ...edit, advice: e.target.value })} maxLength={800} /></Field>
      <Field label="Question suivante"><Input value={edit.next_question ?? ""} onChange={(e) => setEdit({ ...edit, next_question: e.target.value })} maxLength={240} /></Field>
      <Field label="Objectif"><Input value={edit.goal ?? ""} onChange={(e) => setEdit({ ...edit, goal: e.target.value })} maxLength={240} /></Field>
      <Field label="Ce qu'on écoute"><Input value={edit.listen ?? ""} onChange={(e) => setEdit({ ...edit, listen: e.target.value })} maxLength={240} /></Field>
      <div className="flex gap-2"><Button type="submit" className="flex-1" disabled={busy}>Enregistrer{edit.version ? ` (v${edit.version + 1})` : ""}</Button><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Annuler</Button></div>
    </form>
  );

  if (card) return (
    <div className="mx-auto max-w-xl space-y-4">
      <Button variant="ghost" size="sm" onClick={() => setI(null)}><ChevronLeft />Toutes les situations</Button>
      <article className="sales-card space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{card.title}</h2>
        <p className="text-[15px] leading-relaxed">{card.advice}</p>
        {[["Question suivante", card.next_question], ["Objectif", card.goal], ["Écoute", card.listen]].map(([k, v]) => v && (
          <div key={k} className="border-l-2 sales-lime-border pl-3"><p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k}</p><p className="mt-0.5 text-sm">{v}</p></div>
        ))}
        <p className="text-[11px] text-muted-foreground">{card.id ? `Version d'équipe v${card.version}` : "Version de base Livroum"}</p>
      </article>
      <div className="flex gap-2">
        <Button variant="outline" className="h-11 flex-1" disabled={i === 0} onClick={() => setI(i! - 1)}><ChevronLeft />Précédent</Button>
        <Button variant="outline" className="h-11 flex-1" disabled={i === cards.length - 1} onClick={() => setI(i! + 1)}>Suivant<ChevronRight /></Button>
      </div>
      <Button variant="ghost" className="w-full" onClick={() => setEdit({ ...card })}><Pencil />Modifier pour l'équipe</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Une situation, un conseil court, une question à poser. Choisis ce que tu entends.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {cards.map((c, k) => <button key={c.slug} onClick={() => setI(k)} className="sales-card flex items-center justify-between p-4 text-left transition hover:border-foreground/30"><span className="font-medium">{c.title}</span><ChevronRight className="size-4 text-muted-foreground" /></button>)}
      </div>
      <section className="sales-card">
        <p className="text-sm font-medium">{PRICING.tagline}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[PRICING.widget, PRICING.app].map((p) => (
            <div key={p.label} className="rounded-lg border p-3 text-sm">
              <p className="font-semibold">{p.label}</p>
              <p className="mt-1 tabular-nums">{p.setup} € setup · {p.monthly} €/mois · +{p.perDelivery.toFixed(2).replace(".", ",")} €/livraison</p>
              <p className="text-xs text-muted-foreground">{p.note}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{PRICING.transport} Ne jamais garantir une couverture, des délais ou des marges.</p>
      </section>
    </div>
  );
}

/* ---------- 5. Pipeline ---------- */
function Pipeline({ s, onOpen, refresh }: { s: S; onOpen: (id: string) => void; refresh: () => void }) {
  const [owner, setOwner] = useState("all");
  const list = (s.accounts.data ?? []).filter((a) => owner === "all" || (owner === "me" ? a.owner_id === s.me.data : owner === "none" ? !a.owner_id : a.owner_id === owner));
  async function move(a: Account, stage: string) {
    const { error } = await supabase.from("sales_accounts").update({ stage }).eq("id", a.id);
    if (error) toast.error(error.message); else { toast.success(`${a.name} → ${stageLabel(stage)}`); refresh(); }
  }
  if (!(s.accounts.data ?? []).length) return <Empty title="Pipeline vide" text="Les prospects ajoutés apparaissent ici, à l'étape Lead." />;
  return (
    <div className="space-y-4">
      <Select value={owner} onValueChange={setOwner}><SelectTrigger className="h-9 w-48" aria-label="Responsable"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous les responsables</SelectItem><SelectItem value="me">Mes prospects</SelectItem><SelectItem value="none">Non assignés</SelectItem>{(s.members.data ?? []).filter((m) => m.user_id !== s.me.data).map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.email}</SelectItem>)}</SelectContent></Select>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 lg:mx-0 lg:px-0">
        {STAGES.map((st) => { const col = list.filter((a) => a.stage === st.id); const sum = col.reduce((t, a) => t + (a.amount ? Number(a.amount) : 0), 0); return (
          <section key={st.id} className="w-[78vw] max-w-[260px] shrink-0 snap-start rounded-xl border bg-secondary/40 p-2">
            <header className="flex items-baseline justify-between px-2 py-1.5"><span className="text-sm font-medium">{st.label}</span><span className="text-xs tabular-nums text-muted-foreground">{col.length}{sum > 0 ? ` · ${sum.toLocaleString("fr-FR")} € prosp.` : ""}</span></header>
            <ul className="space-y-2">{col.map((a) => (
              <li key={a.id} className="rounded-lg border bg-card p-3">
                <button className="w-full text-left" onClick={() => onOpen(a.id)}><p className="truncate text-sm font-medium">{a.name}</p><p className="truncate text-xs text-muted-foreground">{[a.city, memberName(s, a.owner_id), a.amount != null ? `${a.amount} €` : null].filter(Boolean).join(" · ")}</p></button>
                <Select value={a.stage} onValueChange={(v) => move(a, v)}><SelectTrigger className="mt-2 h-8 text-xs" aria-label={`Étape de ${a.name}`}><SelectValue /></SelectTrigger><SelectContent>{STAGES.map((x) => <SelectItem key={x.id} value={x.id}>{x.label}</SelectItem>)}</SelectContent></Select>
              </li>
            ))}</ul>
          </section>
        ); })}
      </div>
    </div>
  );
}

/* ---------- 6. Performance ---------- */
function Performance({ s, wsId, refresh }: { s: S; wsId: string; refresh: () => void }) {
  const mine = (s.activities.data ?? []).filter((a) => a.actor_id === s.me.data);
  const hist = (s.history.data ?? []).filter((h) => h.actor_id === s.me.data);
  const w0 = startOfWeek();
  const today = periodStats(mine, hist, startOfDay(), addDays(startOfDay(), 1));
  const week = periodStats(mine, hist, w0, addDays(w0, 7));
  const prev = periodStats(mine, hist, addDays(w0, -7), w0);
  const p = s.prefs.data;
  const [challenge, setChallenge] = useState(p?.weekly_challenge ? String(p.weekly_challenge) : "");
  async function savePrefs(patch: Partial<{ mode: string; hide_goals: boolean; low_stimulation: boolean; weekly_challenge: number | null }>) {
    const { error } = await supabase.from("sales_preferences").upsert({ workspace_id: wsId, user_id: s.me.data!, mode: p?.mode ?? "accompagne", hide_goals: p?.hide_goals ?? false, low_stimulation: p?.low_stimulation ?? false, weekly_challenge: p?.weekly_challenge ?? null, ...patch, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else refresh();
  }
  const d = (k: keyof typeof week) => { const v = delta(week[k], prev[k]); return v === null ? "semaine précédente : données insuffisantes" : `${v >= 0 ? "+" : ""}${v} % vs sem. précédente`; };
  const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");
  const badges = qualityBadges(week);
  const low = p?.low_stimulation;
  return (
    <div className="space-y-6">
      <section>
        <h2 className="sales-h2">Cette semaine</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Metric label="Appels" value={week.calls} sub={low ? null : d("calls")} />
          <Metric label="Conversations utiles" value={week.useful} sub={low ? null : d("useful")} />
          <Metric label="Prospects contactés" value={week.contacted} sub={low ? null : d("contacted")} />
          <Metric label="R2 pris / tenus" value={`${week.r2Taken} / ${week.r2Held}`} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Aujourd'hui : {today.calls} appels · {today.useful} conversations utiles. Seules tes propres actions enregistrées sont comptées.</p>
      </section>
      <section>
        <h2 className="sales-h2">Microcompétences <span className="font-normal text-muted-foreground">· 7 derniers jours</span></h2>
        <ul className="divide-y rounded-xl border bg-card text-sm">
          {[["Transformer un appel en conversation", rate(week.useful, week.calls)], ["Documenter chaque appel (note)", rate(week.withNote, week.calls)], ["Transformer un R2 pris en R2 tenu", rate(week.r2Held, week.r2Taken)]].map(([k, v]) => <li key={k} className="flex justify-between p-3"><span>{k}</span><span className="tabular-nums font-medium">{v}</span></li>)}
        </ul>
      </section>
      {!low && (
        <section>
          <h2 className="sales-h2">Qualité constatée</h2>
          {badges.length === 0 ? <p className="text-sm text-muted-foreground">Les repères qualité apparaissent quand les données le montrent (par ex. 10 appels avec notes).</p> : (
            <ul className="grid gap-2 sm:grid-cols-2">{badges.map((b) => <li key={b.id} className="flex items-center gap-3 rounded-xl border bg-card p-3"><BiizBee size={24} className="text-foreground" /><div><p className="text-sm font-medium">{b.label}</p><p className="text-xs text-muted-foreground">{b.fact}</p></div></li>)}</ul>
          )}
        </section>
      )}
      <section className="sales-card space-y-4">
        <h2 className="text-sm font-medium">Mes réglages</h2>
        <div><p className="mb-2 text-xs text-muted-foreground">Mode</p><div className="grid grid-cols-2 gap-2">{([["accompagne", "Accompagné"], ["rapide", "Rapide"]] as const).map(([v, l]) => <button key={v} className="sales-seg h-11" aria-pressed={(p?.mode ?? "accompagne") === v} onClick={() => savePrefs({ mode: v })}>{l}</button>)}</div></div>
        <label className="flex items-center justify-between text-sm">Masquer mon défi personnel<Switch checked={!!p?.hide_goals} onCheckedChange={(v) => savePrefs({ hide_goals: v })} /></label>
        <label className="flex items-center justify-between text-sm">Réduire la stimulation (sans badges ni comparaisons)<Switch checked={!!low} onCheckedChange={(v) => savePrefs({ low_stimulation: v })} /></label>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); const n = challenge.trim() ? Math.round(Number(challenge)) : null; if (n !== null && !(n >= 1 && n <= 500)) { toast.error("Entre 1 et 500."); return; } void savePrefs({ weekly_challenge: n }).then(() => toast.success(n ? "Défi enregistré" : "Défi retiré")); }}>
          <Field label="Mini défi personnel (appels / semaine, facultatif)"><Input inputMode="numeric" className="h-10 w-32" value={challenge} onChange={(e) => setChallenge(e.target.value)} /></Field>
          <Button type="submit" variant="outline" className="h-10">OK</Button>
        </form>
      </section>
    </div>
  );
}
