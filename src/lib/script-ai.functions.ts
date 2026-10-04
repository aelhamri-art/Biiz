import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Shot = { n: number; plan: string; cadrage: string; duree: string; lieu: string; notes: string };
export type ScriptResult = { titre: string; accroche: string; script: string; plans: Shot[]; materiel: string[] };

const SYSTEM = `Tu es un directeur créatif spécialisé en contenus courts pour les réseaux sociaux (Reels, TikTok, Stories).
À partir d'un brief marketing, tu produis un script de tournage prêt à filmer au smartphone par une équipe terrain, et la liste précise des plans à produire.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format :
{"titre": string, "accroche": string, "script": string (script complet avec séquences, voix off / textes à l'écran, timing), "plans": [{"n": number, "plan": string (description du plan), "cadrage": string (gros plan, plan large, POV…), "duree": string (ex "3s"), "lieu": string, "notes": string}], "materiel": [string]}
Entre 6 et 15 plans. Tout en français.`;

export const generateShootingScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    wsId: z.string().uuid(),
    brief: z.string().trim().min(10).max(6000),
    format: z.string().max(100).optional(),
    duree: z.string().max(50).optional(),
  }).parse(d))
  .handler(async ({ data, context }): Promise<ScriptResult> => {
    const { data: ok } = await context.supabase.rpc("is_member", { _ws: data.wsId, _user: context.userId });
    if (!ok) throw new Error("Accès refusé à ce projet.");
    const { generateTextViaGateway, GatewayError } = await import("./ai-gateway.server");
    const prompt = `Brief :\n${data.brief}\n\nFormat : ${data.format || "Reel vertical 9:16"}\nDurée cible : ${data.duree || "30 secondes"}`;
    let text: string;
    try {
      text = await generateTextViaGateway(SYSTEM, prompt);
    } catch (e) {
      throw new Error(e instanceof GatewayError ? e.message : "La génération IA a échoué.");
    }
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    try {
      const r = JSON.parse(json) as ScriptResult;
      return { titre: r.titre ?? "Script", accroche: r.accroche ?? "", script: r.script ?? "", plans: Array.isArray(r.plans) ? r.plans : [], materiel: Array.isArray(r.materiel) ? r.materiel : [] };
    } catch {
      return { titre: "Script généré", accroche: "", script: text, plans: [], materiel: [] };
    }
  });
