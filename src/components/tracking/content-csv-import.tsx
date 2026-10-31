import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const db = supabase as any;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
}

function parseCsv(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === separator && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); }
  if (rows.length < 2) return [];

  const headers = rows[0]!.map(normalize);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])));
}

function pick(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const v = row[normalize(key)];
    if (v?.trim()) return v.trim();
  }
  return "";
}

function inferNature(raw: string) {
  const x = normalize(raw);
  if (x.includes("lifestyle") || x.includes("engage")) return "lifestyle";
  if (x.includes("commercial") || x.includes("vente")) return "commercial";
  if (x.includes("preuve") || x.includes("avis")) return "preuve";
  if (x.includes("produit")) return "produit";
  return "commercial";
}

function inferFormat(raw: string) {
  const x = normalize(raw);
  if (x.includes("carousel")) return "carousel";
  if (x.includes("story")) return "story";
  if (x.includes("reel")) return "reel";
  if (x.includes("video")) return "video";
  return "statique";
}

export function ContentCsvImport({ wsId }: { wsId: string }) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [campaignId, setCampaignId] = useState("none");
  const [busy, setBusy] = useState(false);

  const campaigns = useQuery({
    queryKey: ["campaigns", wsId],
    queryFn: async () => {
      const { data, error } = await db.from("campaigns").select("id,name").eq("workspace_id", wsId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  async function importFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length) { toast.error("CSV vide ou illisible"); return; }
      const { data: u } = await supabase.auth.getUser();

      const payload = rows.flatMap((row) => {
        const concept = pick(row, "concept", "titre", "title");
        if (!concept) return [];
        const rawFormat = pick(row, "format", "type");
        const week = pick(row, "semaine", "week");
        const intention = pick(row, "intention business", "intention_business", "objectif", "objective");
        const target = pick(row, "cible", "target");
        const caption = pick(row, "légende", "legende", "caption");
        const statusRaw = normalize(pick(row, "statut", "status"));
        const status = statusRaw.includes("publ") ? "publie" : statusRaw.includes("valid") ? "valide" : statusRaw.includes("crea") || statusRaw.includes("cours") ? "en_creation" : "brief";

        return [{
          workspace_id: wsId,
          campaign_id: campaignId === "none" ? null : campaignId,
          type: "crea",
          title: concept,
          body: week ? `Semaine : ${week}` : null,
          format: inferFormat(rawFormat),
          nature: inferNature(rawFormat),
          channel: "social",
          platform: "instagram",
          objective: intention || null,
          target_summary: target || null,
          caption: caption || null,
          status,
          created_by: u.user!.id,
          owner_id: u.user!.id,
        }];
      });

      if (!payload.length) { toast.error("Aucune ligne avec un concept/titre"); return; }
      const { error } = await db.from("contents").insert(payload);
      if (error) { toast.error(error.message); return; }

      toast.success(`${payload.length} contenus importés`);
      void qc.invalidateQueries({ queryKey: ["contents", wsId] });
      void qc.invalidateQueries({ queryKey: ["campaign-content-counts", wsId] });
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed bg-card/50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Label>Import calendrier CSV</Label>
          <p className="mt-1 text-xs text-muted-foreground">Colonnes reconnues : semaine, format, concept, intention business, cible, légende, statut.</p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={campaignId} onValueChange={setCampaignId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
            <SelectItem value="none">Sans campagne</SelectItem>
            {campaigns.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent></Select>
        </div>
        <input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(e) => void importFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}><FileUp />{busy ? "Import…" : "Importer CSV"}</Button>
      </div>
    </div>
  );
}
