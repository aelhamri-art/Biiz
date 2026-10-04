import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ALLOWED = ["page_view", "cta_click", "booking_start", "offer_selected", "slot_viewed", "booking_completed", "purchase", "lead_created", "form_completed"];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" };

const Body = z.object({
  last: z.string().max(32),
  first: z.string().max(32).optional(),
  vid: z.string().max(64).optional(),
  sid: z.string().max(64).optional(),
  name: z.string().max(40),
  page: z.string().max(500).optional(),
  props: z.record(z.union([z.string().max(200), z.number(), z.boolean()])).optional(),
});

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        let body: z.infer<typeof Body>;
        try { body = Body.parse(JSON.parse(await request.text())); } catch { return new Response("bad", { status: 400, headers: cors }); }
        if (!ALLOWED.includes(body.name)) return new Response("bad event", { status: 400, headers: cors });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const codes = [body.last, body.first].filter(Boolean) as string[];
        const { data: links } = await supabaseAdmin.from("links").select("id, code, workspace_id").in("code", codes);
        const last = links?.find((l) => l.code === body.last);
        if (!last) return new Response("unknown", { status: 404, headers: cors });
        const first = links?.find((l) => l.code === body.first && l.workspace_id === last.workspace_id) ?? last;
        await supabaseAdmin.from("events").insert({
          workspace_id: last.workspace_id, link_id: last.id, first_link_id: first.id,
          visitor_id: body.vid ?? null, session_id: body.sid ?? null, name: body.name,
          page: body.page ?? null, props: body.props ?? null,
        });
        return new Response("ok", { headers: cors });
      },
    },
  },
});
