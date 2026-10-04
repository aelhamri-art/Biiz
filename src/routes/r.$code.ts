import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code.slice(0, 32);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: link } = await supabaseAdmin
          .from("links")
          .select("id, workspace_id, destination_url, utm_source, utm_medium, utm_campaign, utm_content")
          .eq("code", code)
          .maybeSingle();
        if (!link) return new Response("Lien introuvable", { status: 404 });
        await supabaseAdmin.from("clicks").insert({
          link_id: link.id,
          workspace_id: link.workspace_id,
          user_agent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
          referrer: request.headers.get("referer")?.slice(0, 300) ?? null,
        });
        const url = new URL(link.destination_url);
        url.searchParams.set("utm_source", link.utm_source);
        url.searchParams.set("utm_medium", link.utm_medium);
        url.searchParams.set("utm_campaign", link.utm_campaign);
        if (link.utm_content) url.searchParams.set("utm_content", link.utm_content);
        url.searchParams.set("bz", code);
        return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
      },
    },
  },
});
