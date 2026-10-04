import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const RUN_ID = "X-Lovable-AIG-Run-ID";

function runIdFetch() {
  let runId: string | undefined;
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID)) headers.set(RUN_ID, runId);
    const res = await fetch(input, { ...init, headers });
    runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
    return res;
  };
}

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Streams a Responses call server-side and returns the final text. */
export async function generateTextViaGateway(system: string, prompt: string): Promise<string> {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new GatewayError(401, "Clé IA manquante côté serveur.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch(),
  });
  let failure: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system,
    prompt,
    onError: ({ error }) => { failure = error; },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let text = "";
  try { text = await result.text; } catch (e) { failure ??= e; }
  if (failure || !text) {
    const status = (failure as { statusCode?: number })?.statusCode ?? 500;
    const msg =
      status === 402 ? "Crédits IA épuisés — ajoute des crédits dans Paramètres → Plans & crédits."
      : status === 429 ? "Trop de demandes, réessaie dans un instant."
      : status === 403 ? "Accès au modèle IA refusé pour cet espace."
      : !text && !failure ? "Le modèle n'a rien renvoyé pour ce brief."
      : "La génération IA a échoué.";
    throw new GatewayError(status, msg);
  }
  return text;
}
