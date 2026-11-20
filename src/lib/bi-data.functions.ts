import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DIMENSIONS, METRICS, type Dimension, type MetricId } from "@/lib/bi-data";

async function hashKey(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function randomPart(bytes: number) {
  const data = new Uint8Array(bytes); crypto.getRandomValues(data);
  return [...data].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Provisionne la source native ALPHA. La clé complète n’est retournée qu’à la création. */
export const ensureAlphaSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: workspace } = await context.supabase.from("workspaces").select("id,name,app").eq("id", data.workspaceId).maybeSingle();
    if (!workspace || workspace.name.toUpperCase() !== "ALPHA") throw new Error("La source native ALPHA ne peut être créée que dans l’espace ALPHA.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readError } = await supabaseAdmin.from("bi_data_sources").select("id,name,key_prefix,active,last_event_at").eq("workspace_id", data.workspaceId).eq("name", "ALPHA").maybeSingle();
    if (readError) throw new Error("Impossible de lire la source ALPHA.");
    if (existing) return { source: existing, key: null as string | null };
    const prefix = randomPart(6), secret = randomPart(32), key = `bia_${prefix}_${secret}`;
    const { data: source, error } = await supabaseAdmin.from("bi_data_sources").insert({ workspace_id: data.workspaceId, name: "ALPHA", kind: "native", key_prefix: prefix, key_hash: await hashKey(key), created_by: context.userId }).select("id,name,key_prefix,active,last_event_at").single();
    if (error) throw new Error("Impossible de préparer la source ALPHA.");
    return { source, key };
  });

const AskResult = z.object({
  metric: z.enum(METRICS.map((m) => m.id) as [MetricId, ...MetricId[]]),
  dimension: z.enum(DIMENSIONS.map((d) => d.id) as [Dimension, ...Dimension[]]),
  capability: z.enum(["barber", "wash"]).nullable().default(null),
});
export type AskBiizResult = z.infer<typeof AskResult>;

/** L’IA ne produit qu’une configuration validée ; les valeurs restent calculées par la semantic layer. */
export const askBiiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ question: z.string().trim().min(3).max(300) }).parse(input))
  .handler(async ({ data }): Promise<{ config?: AskBiizResult; error?: string }> => {
    try {
      const { generateTextViaGateway } = await import("@/lib/ai-gateway.server");
      const text = await generateTextViaGateway(
        `Tu transformes une question analytique en configuration JSON strictement limitée. Aucune métrique inventée, aucun SQL, aucune valeur chiffrée. Réponds uniquement {"metric":"...","dimension":"...","capability":null|"barber"|"wash"}. metric autorisée: ${METRICS.map((m) => m.id).join(",")}. dimension autorisée: ${DIMENSIONS.map((d) => d.id).join(",")}. Si la question concerne Wash ou Barber, renseigne capability.`,
        data.question,
      );
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { error: "Ask BIIZ n’a pas produit une analyse valide." };
      return { config: AskResult.parse(JSON.parse(match[0])) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Ask BIIZ est momentanément indisponible." };
    }
  });
