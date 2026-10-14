import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  workspaceId: z.string().uuid(),
  firstName: z.string().trim().min(1).max(40),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(72),
});

/** Crée un compte partenaire BIIZ Sales et l'ajoute à l'espace de vente de l'appelant. */
export const createSalesPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof input>) => input.parse(d))
  .handler(async ({ data, context }) => {
    // L'appelant doit être membre de cet espace Sales (RLS).
    const { data: ws } = await context.supabase
      .from("workspaces").select("id").eq("id", data.workspaceId).eq("app", "sales").maybeSingle();
    if (!ws) return { ok: false as const, message: "Espace Sales introuvable ou non autorisé." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.firstName, app: "sales" },
    });
    const exists = created.error && /already|registered|exists/i.test(created.error.message);
    if (created.error && !exists) return { ok: false as const, message: "Création du compte impossible." };

    const { data: res, error } = await context.supabase.rpc("invite_member", { _ws: data.workspaceId, _email: data.email });
    if (error) return { ok: false as const, message: "Ajout à l'espace impossible." };
    return { ok: true as const, existed: !!exists, status: res as string };
  });
