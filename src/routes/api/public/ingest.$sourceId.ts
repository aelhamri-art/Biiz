import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

const id = (max: number) => z.string().trim().min(1).max(max);
const EventPayload = z.object({
  source: z.string().trim().max(80).optional(),
  event_name: z.string().trim().regex(/^[a-z][a-z0-9_]{1,79}$/),
  occurred_at: z.string().datetime({ offset: true }),
  external_event_id: id(160),
  customer_external_id: id(160).nullish(),
  booking_external_id: id(160).nullish(),
  location_external_id: id(160).nullish(),
  employee_external_id: id(160).nullish(),
  service_external_id: id(160).nullish(),
  session_id: id(160).nullish(),
  utm_source: z.string().trim().max(120).nullish(),
  utm_medium: z.string().trim().max(120).nullish(),
  utm_campaign: z.string().trim().max(160).nullish(),
  utm_content: z.string().trim().max(160).nullish(),
  capability: z.enum(["barber", "wash"]).nullish(),
  revenue_cents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
  currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
  metadata: z.record(z.unknown()).optional(),
});
const Body = z.object({ events: z.array(z.unknown()).min(1).max(100) });
const FORBIDDEN_METADATA = /^(email|e_mail|phone|telephone|first_name|last_name|address|customer_name)$/i;

async function hashKey(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/public/ingest/$sourceId")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const sourceId = params.sourceId;
        if (!z.string().uuid().safeParse(sourceId).success) return json({ error: "Source invalide." }, 404);
        const raw = await request.text();
        if (raw.length > 300_000) return json({ error: "Batch trop volumineux." }, 413);
        const key = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
        if (!key) return json({ error: "Clé source requise." }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: source } = await supabaseAdmin.from("bi_data_sources").select("id,workspace_id,key_prefix,key_hash,active").eq("id", sourceId).maybeSingle();
        if (!source || !source.active) return json({ error: "Source indisponible." }, 404);
        if (!key.startsWith(`bia_${source.key_prefix}_`) || !safeEqual(await hashKey(key), source.key_hash)) return json({ error: "Clé source refusée." }, 401);
        let body: z.infer<typeof Body>;
        try { body = Body.parse(JSON.parse(raw)); } catch { return json({ error: "JSON ou batch invalide (1 à 100 événements)." }, 400); }

        const valid: z.infer<typeof EventPayload>[] = [];
        const rejected: { external_event_id: string | null; reason: string }[] = [];
        for (const item of body.events) {
          const parsed = EventPayload.safeParse(item);
          if (!parsed.success) {
            const external = typeof item === "object" && item && "external_event_id" in item && typeof item.external_event_id === "string" ? item.external_event_id.slice(0, 160) : null;
            rejected.push({ external_event_id: external, reason: parsed.error.issues[0]?.message.slice(0, 300) ?? "Événement invalide." });
            continue;
          }
          if (Object.keys(parsed.data.metadata ?? {}).some((k) => FORBIDDEN_METADATA.test(k))) {
            rejected.push({ external_event_id: parsed.data.external_event_id, reason: "PII directe interdite dans metadata." });
            continue;
          }
          valid.push(parsed.data);
        }
        if (rejected.length) await supabaseAdmin.from("bi_ingestion_errors").insert(rejected.map((r) => ({ ...r, workspace_id: source.workspace_id, source_id: source.id })));
        let accepted = 0;
        try {
          const rows = valid.map((e) => ({
            workspace_id: source.workspace_id, source_id: source.id, event_name: e.event_name, occurred_at: e.occurred_at,
            external_event_id: e.external_event_id, customer_external_id: e.customer_external_id ?? null,
            booking_external_id: e.booking_external_id ?? null, location_external_id: e.location_external_id ?? null,
            employee_external_id: e.employee_external_id ?? null, service_external_id: e.service_external_id ?? null,
            session_id: e.session_id ?? null, utm_source: e.utm_source ?? e.source ?? null, utm_medium: e.utm_medium ?? null,
            utm_campaign: e.utm_campaign ?? null, utm_content: e.utm_content ?? null, capability: e.capability ?? null,
            revenue_cents: e.revenue_cents ?? null, currency: e.currency ?? (e.revenue_cents !== null && e.revenue_cents !== undefined ? "EUR" : null),
            metadata: (e.metadata ?? {}) as Json,
          }));
          if (rows.length) {
            const { data: inserted, error } = await supabaseAdmin.from("bi_events").upsert(rows, { onConflict: "source_id,external_event_id", ignoreDuplicates: true }).select("id");
            if (error) throw error;
            accepted = inserted?.length ?? 0;
          }
          const duplicates = valid.length - accepted;
          await supabaseAdmin.rpc("bi_record_ingest", { _source: source.id, _accepted: accepted, _duplicates: duplicates, _rejected: rejected.length });
          return json({ accepted, duplicates, rejected: rejected.length, errors: rejected });
        } catch {
          await supabaseAdmin.rpc("bi_record_ingest", { _source: source.id, _accepted: 0, _duplicates: 0, _rejected: rejected.length, _error: "Échec base pendant l’ingestion du batch." });
          return json({ error: "Ingestion momentanément indisponible.", rejected: rejected.length, errors: rejected }, 502);
        }
      },
    },
  },
});
