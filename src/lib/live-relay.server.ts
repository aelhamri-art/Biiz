import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, tool, type ModelMessage } from "ai";
import process from "node:process";
import { z } from "zod";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type LiveConfig = {
  baseURL: string;
  key: string;
  liveModel: string;
  backendModel: string;
  openingInstructions?: string;
  sales?: SalesContext;
};

type SalesContext = { db: SupabaseClient; workspaceId: string; userId: string; firstName: string; brief: string };

// Fill from co-loaded knowledge: the gateway URL, the Live model and the resolved chat model.
const liveSettings = { baseURL: "https://ai.gateway.lovable.dev", liveModel: "openai/gpt-live-1", backendModel: "openai/gpt-6-astra" };

export type LiveSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  onError(handler: () => void): void;
};

export type LiveExecutionContext = { waitUntil(task: Promise<unknown>): void };
export type LiveConnector = (url: string, headers: Record<string, string>, signal: AbortSignal) => Promise<LiveSocket>;

type WorkerSocket = WebSocket & { accept(): void };
declare const WebSocketPair: { new (): { 0: WorkerSocket; 1: WorkerSocket } };
type Transcript = {
  role: "user" | "assistant";
  text: string;
  start_ms: number;
  end_ms: number;
  listeningSound: boolean;
};
type ProviderEvent = {
  type: string;
  client_event_id?: string;
  error?: { client_event_id?: string; message?: string };
  session?: { id: string };
  delta?: string;
  start_ms?: number;
  end_ms?: number;
  offset_ms?: number;
  delegation?: { id: string; target: string };
};

export function getLiveConfig(): LiveConfig {
  const config: LiveConfig = {
    ...liveSettings,
    key: process.env["LOVABLE_API_KEY"] ?? "",
  };
  if ([config.baseURL, config.key, config.liveModel, config.backendModel].some((value) => !value)) {
    throw new Error("Missing Live relay configuration");
  }
  return config;
}

function gatewayAPIBase(baseURL: string) {
  return `${baseURL.replace(/\/+$/, "").replace(/\/v1$/, "")}/v1`;
}

async function gatewayRejection(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "";
  return new Error(message || `Voice gateway rejected the connection (${response.status})`);
}

export function validateLiveUpgrade(request: Request, options: { allowMissingOrigin?: boolean } = {}): Response | null {
  const origin = request.headers.get("origin");
  if (origin === null ? !options.allowMissingOrigin : origin !== new URL(request.url).origin) {
    return new Response("Voice connection origin rejected", { status: 403 });
  }
  if (request.method !== "GET" || request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return new Response("WebSocket required", { status: 426 });
  }
  return null;
}

function workerSocket(socket: WorkerSocket): LiveSocket {
  return {
    get readyState() {
      return socket.readyState;
    },
    send: (data) => socket.send(data),
    close: (code, reason) => socket.close(code, reason),
    onMessage: (handler) => socket.addEventListener("message", (event) => handler(event.data)),
    onClose: (handler) => socket.addEventListener("close", handler),
    onError: (handler) => socket.addEventListener("error", handler),
  };
}

export function handleLiveRequest(request: Request): Response {
  const waitUntil = (request as Request & Partial<LiveExecutionContext>).waitUntil;
  if (!waitUntil) return new Response("Live runtime unavailable", { status: 503 });
  const config = getLiveConfig();
  const rejected = validateLiveUpgrade(request);
  if (rejected) return rejected;
  const pair = new WebSocketPair();
  pair[1].accept();
  bindLiveConnection(workerSocket(pair[1]), config, { waitUntil }, async (url, headers, signal) => {
    const response = await fetch(url, { headers: { ...headers, Upgrade: "websocket" }, signal });
    const socket = (response as Response & { webSocket?: WorkerSocket | null }).webSocket;
    if (!socket) throw await gatewayRejection(response);
    socket.accept();
    return workerSocket(socket);
  });
  const response: ResponseInit & { webSocket: WebSocket } = { status: 101, webSocket: pair[0] };
  return new Response(null, response);
}

function conversationInstructions(ctx: SalesContext) {
  return `Tu es Aximus, coach commerciale de Livroum dans BIIZ Sales : à la fois directrice commerciale et manager bienveillante. Tu parles uniquement en français, voix posée, chaleureuse, phrases courtes, une idée à la fois.
La personne s'appelle ${ctx.firstName}. Appelle-la par son prénom de temps en temps, sans excès.
Rôle : rassurer, expliquer simplement, faire répéter à voix haute, jouer un restaurateur quand on te le demande, débriefer un appel, prioriser la journée. Pédagogie : comprendre, dire, écouter. Félicite seulement sur des faits réels.
Livroum : « Votre marque. Vos clients. Notre livraison. » Tarifs exacts : Widget 199 € de mise en place, 149 € par mois, plus 0,48 € par livraison, premier mois offert. App 850 € de mise en place configuration incluse, 108 € par mois, plus 0,29 € par livraison. Le transport physique est facturé à part. Ne promets jamais couverture, horaires, délais ni économies garanties. Ne critique jamais Uber Eats.
N'invente jamais un prospect, un chiffre ou un souvenir. Si tu ne sais pas, dis-le.
Contexte vérifié au démarrage :
${ctx.brief}
Backchannel policy: Petits sons d'écoute modérés (« mm », « d'accord ») sans prendre la parole.
Interruption policy: Arrête-toi dès que la personne parle et écoute.
Delegation policy:
Backend tools: Chercher un prospect du CRM et son historique, lister les actions dues, retrouver ou enregistrer une note de progression personnelle.
Delegate to the backend when: La personne parle d'un prospect précis, demande quoi faire aujourd'hui, veut un débrief précis, ou demande de retenir un progrès.
Do not delegate to the backend when: Salutation, encouragement, jeu de rôle, explication du pitch ou d'une objection. Attends le résultat du backend avant d'annoncer un fait du CRM.`;
}

async function loadSalesContext(token: string, workspaceId: string): Promise<SalesContext> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key || !token || !/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new Error("Connexion requise");
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data: u, error } = await db.auth.getUser(token);
  if (error || !u.user) throw new Error("Session expirée, reconnecte-toi");
  const { data: ws } = await db.from("workspaces").select("id,name").eq("id", workspaceId).eq("app", "sales").maybeSingle();
  if (!ws) throw new Error("Espace Sales introuvable");
  const meta = u.user.user_metadata ?? {};
  const raw = String(meta.first_name || meta.full_name || meta.name || u.user.email?.split("@")[0] || "").trim();
  const firstName = (raw.split(/[\s._-]/)[0] || "toi").replace(/^./, (c) => c.toUpperCase()).slice(0, 40);
  const today = new Date().toISOString().slice(0, 10);
  const [accounts, due, notes] = await Promise.all([
    db.from("sales_accounts").select("stage").eq("workspace_id", workspaceId).limit(2000),
    db.from("sales_next_actions").select("label,next_action_date,sales_accounts(name)").eq("workspace_id", workspaceId).is("done_at", null).lte("next_action_date", today).order("next_action_date").limit(6),
    db.from("sales_coach_notes").select("note,created_at").eq("workspace_id", workspaceId).eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(5),
  ]);
  const stages: Record<string, number> = {};
  for (const a of accounts.data ?? []) stages[a.stage] = (stages[a.stage] ?? 0) + 1;
  const brief = [
    `Espace : ${ws.name}. Prospects : ${accounts.data?.length ?? 0}${Object.keys(stages).length ? ` (${Object.entries(stages).map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}.`,
    `Actions dues ou en retard : ${(due.data ?? []).map((d) => `${(d.sales_accounts as { name?: string } | null)?.name ?? "?"} — ${d.label ?? "action"} (${d.next_action_date})`).join("; ") || "aucune"}.`,
    `Notes de progression précédentes : ${(notes.data ?? []).map((n) => `${n.created_at.slice(0, 10)} : ${n.note}`).join(" | ") || "aucune, c'est la première séance"}.`,
  ].join("\n").slice(0, 3000);
  return { db, workspaceId, userId: u.user.id, firstName, brief };
}

function salesTools(ctx: SalesContext, signal: AbortSignal) {
  return {
    search_prospects: tool({
      description: "Cherche des prospects du CRM par nom ou ville et renvoie étape, priorité, prochaine action et derniers échanges.",
      inputSchema: z.object({ query: z.string().min(1).max(80) }).strict(),
      execute: async ({ query }) => {
        signal.throwIfAborted();
        const q = query.replace(/[%,()]/g, " ").trim();
        const { data, error } = await ctx.db.from("sales_accounts").select("id,name,city,segment,stage,priority,last_activity_at,notes")
          .eq("workspace_id", ctx.workspaceId).or(`name.ilike.%${q}%,city.ilike.%${q}%`).limit(5);
        if (error) return { error: "Lecture du CRM impossible" };
        const ids = (data ?? []).map((a) => a.id);
        const [acts, next] = await Promise.all([
          ctx.db.from("sales_activities").select("account_id,outcome,note,created_at").in("account_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("created_at", { ascending: false }).limit(15),
          ctx.db.from("sales_next_actions").select("account_id,label,next_action_date").in("account_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).is("done_at", null),
        ]);
        return { prospects: (data ?? []).map((a) => ({ ...a, notes: a.notes?.slice(0, 300), next_actions: (next.data ?? []).filter((n) => n.account_id === a.id), recent: (acts.data ?? []).filter((x) => x.account_id === a.id).slice(0, 3) })) };
      },
    }),
    list_due_actions: tool({
      description: "Liste les prochaines actions non faites de l'espace, triées par date (retards en premier).",
      inputSchema: z.object({ limit: z.number().int().min(1).max(15) }).strict(),
      execute: async ({ limit }) => {
        signal.throwIfAborted();
        const { data, error } = await ctx.db.from("sales_next_actions").select("label,next_action_date,sales_accounts(name,city,stage)").eq("workspace_id", ctx.workspaceId).is("done_at", null).order("next_action_date").limit(limit);
        return error ? { error: "Lecture impossible" } : { today: new Date().toISOString().slice(0, 10), actions: data };
      },
    }),
    save_progress_note: tool({
      description: "Enregistre une courte note de progression personnelle (compétence travaillée, point fort, point à travailler). N'enregistre jamais d'appel CRM.",
      inputSchema: z.object({ note: z.string().min(3).max(500) }).strict(),
      execute: async ({ note }) => {
        signal.throwIfAborted();
        const { error } = await ctx.db.from("sales_coach_notes").insert({ workspace_id: ctx.workspaceId, user_id: ctx.userId, note });
        return error ? { saved: false } : { saved: true };
      },
    }),
  };
}

function isListeningSound(text: string) {
  const normalized = text.toLowerCase().replace(/[\s\p{Pd}]/gu, "");
  return /^(?:m+hm+|uhhuh)[.,!]*$/.test(normalized);
}

async function answerQuestion(
  messages: ModelMessage[],
  config: LiveConfig,
  correlation: { runID: string; sessionID: string | undefined; delegationID: string },
  signal: AbortSignal,
  consumeInput: () => void,
) {
  if (!config.sales) throw new Error("No sales context");
  signal.throwIfAborted();
  const provider = createOpenAI({
    baseURL: gatewayAPIBase(config.baseURL),
    apiKey: config.key,
    headers: {
      "Lovable-API-Key": config.key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
  let responseCursor = 0;
  consumeInput();
  const result = streamText({
    model: provider.responses(config.backendModel),
    abortSignal: signal,
    maxRetries: 0,
    stopWhen: stepCountIs(50),
    includeRawChunks: true,
    prepareStep() {
      consumeInput();
      return { messages: [...messages] };
    },
    onStepFinish(step) {
      messages.push(...step.response.messages.slice(responseCursor));
      responseCursor = step.response.messages.length;
    },
    headers: {
      "X-Lovable-AIG-Run-ID": correlation.runID,
      "X-Lovable-AIG-Metadata": JSON.stringify({
        live_session_id: correlation.sessionID,
        delegation_id: correlation.delegationID,
      }),
    },
    providerOptions: {
      openai: {
        store: false,
        ...(config.backendModel !== "openai/chat-latest"
          ? {
              forceReasoning: true,
              reasoningEffort: "medium",
              reasoningSummary: "auto",
              include: ["reasoning.encrypted_content"],
            }
          : {}),
      },
    },
    system:
      "Tu prépares la réponse orale d'Aximus, coach commerciale Livroum. Réponds en français, phrases courtes à dire à voix haute, 120 mots maximum. " +
      "Les transcriptions peuvent être incomplètes ; utilise la dernière correction. N'invente aucun prospect ni chiffre : utilise uniquement les résultats des outils. " +
      "Quand la personne mentionne un progrès, une difficulté travaillée ou demande de retenir quelque chose, appelle save_progress_note avec une note factuelle courte. " +
      "Les outils CRM sont en lecture seule ; tu n'enregistres jamais un appel ou une étape. Ne répète pas une action déjà faite.\n" + config.sales.brief,
    messages,
    tools: salesTools(config.sales, signal),
  });
  let completed = false;
  let stepCompleted = false;
  let failed = false;
  // Drain through HTTP EOF so successful work is not recorded as cancelled by the Gateway.
  for await (const part of result.fullStream) {
    if (part.type === "start-step") stepCompleted = false;
    if (part.type === "raw" && part.rawValue && typeof part.rawValue === "object" && "type" in part.rawValue) {
      if (part.rawValue.type === "response.completed") stepCompleted = true;
      if (part.rawValue.type === "response.failed" || part.rawValue.type === "response.incomplete") failed = true;
    }
    if (part.type === "finish-step" && !stepCompleted) failed = true;
    if (part.type === "error" || part.type === "abort") failed = true;
    if (part.type === "finish") completed = part.finishReason === "stop";
  }
  signal.throwIfAborted();
  if (failed || !completed) throw new Error("The backend response did not complete");
  const answer = await result.text;
  if (!answer.trim()) throw new Error("The backend response had no answer");
  return answer;
}

function* commentaryChunks(content: string) {
  const encoder = new TextEncoder();
  let chunk = "";
  let bytes = 0;
  for (const [word] of content.matchAll(/\S+\s*|\s+/gu)) {
    // Chunks stay well inside the provider's per-append size limit.
    if (chunk && bytes + encoder.encode(word).length > 480) {
      yield chunk;
      chunk = "";
      bytes = 0;
    }
    for (const character of word) {
      const size = encoder.encode(character).length;
      if (bytes + size > 480) {
        yield chunk;
        chunk = "";
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
  }
  if (chunk) yield chunk;
}

export function bindLiveConnection(
  browser: LiveSocket,
  configuration: LiveConfig,
  execution: LiveExecutionContext,
  connect: LiveConnector,
): void {
  const config = { ...configuration };
  const runID = crypto.randomUUID();
  const setupAbort = new AbortController();
  let gateway: LiveSocket | undefined;
  let sessionID: string | undefined;
  let starting = false;
  let closing = false;
  let finished = false;
  let revision = 0;
  let task: AbortController | undefined;
  const pendingDelegations: Array<{
    event: ProviderEvent;
  }> = [];
  let completedDelegation: (typeof pendingDelegations)[number] | undefined;
  const backendMessages: ModelMessage[] = [];
  let transcriptCursor = 0;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let finishDrain: (() => void) | undefined;
  let browserReady = false;
  let greetingRequested = false;
  let greetingCommand: { id: string; type: "instructions" | "commentary" } | undefined;
  let greetingTimer: ReturnType<typeof setTimeout> | undefined;
  const startTimer = setTimeout(() => {
    emit({ type: "app.error", error: { message: "Voice startup message timed out" } });
    stop();
  }, 5000);
  const transcripts: Transcript[] = [];
  const delegations = new Set<string>();

  function emit(event: object) {
    if (browser.readyState !== 1) return;
    try {
      browser.send(JSON.stringify(event));
    } catch {
      stop();
    }
  }

  function close(socket?: LiveSocket) {
    if (!socket || socket.readyState === 3) return;
    try {
      socket.close(1000, "Call ended");
    } catch {
      return;
    }
  }

  function clearGreeting() {
    clearTimeout(greetingTimer);
    greetingCommand = undefined;
  }

  function requestGreeting() {
    const content = (
      config.openingInstructions ??
      "Start the conversation now in your configured language and role. Give a brief greeting suited to this app's purpose, ask one relevant opening question, then listen."
    ).trim();
    if (!content || !browserReady || !sessionID || greetingRequested || closing) return;
    greetingRequested = true;
    if (new TextEncoder().encode(content).length > 480) {
      emit({ type: "app.greeting.error", error: { message: "The opening instructions are too long" } });
      return;
    }
    greetingCommand = { id: crypto.randomUUID(), type: "instructions" };
    greetingTimer = setTimeout(() => {
      clearGreeting();
      emit({ type: "app.greeting.error", error: { message: "The opening could not be confirmed" } });
    }, 10_000);
    gateway?.send(
      JSON.stringify({
        type: "session.instructions.append",
        event_id: greetingCommand.id,
        delegation_id: null,
        content,
      }),
    );
  }

  function discardPendingWork() {
    pendingDelegations.length = 0;
    completedDelegation = undefined;
    clearTimeout(restartTimer);
    task?.abort();
  }

  function finish() {
    if (finished) return;
    finished = closing = true;
    clearTimeout(startTimer);
    clearTimeout(startupTimer);
    clearTimeout(closeTimer);
    clearTimeout(restartTimer);
    clearGreeting();
    discardPendingWork();
    setupAbort.abort();
    close(gateway);
    close(browser);
    finishDrain?.();
  }

  function stop() {
    if (closing) return;
    closing = true;
    discardPendingWork();
    clearTimeout(startupTimer);
    clearTimeout(startTimer);
    clearGreeting();
    if (gateway?.readyState === 1) {
      execution.waitUntil(
        new Promise<void>((resolve) => {
          finishDrain = resolve;
        }),
      );
      closeTimer = setTimeout(finish, 15_000);
      try {
        gateway.send(JSON.stringify({ type: "session.close" }));
      } catch {
        finish();
      }
    } else {
      finish();
    }
  }

  function scheduleDelegation() {
    clearTimeout(restartTimer);
    if (closing || task || pendingDelegations.length === 0) return;
    restartTimer = setTimeout(() => void runDelegation(), 300);
  }

  function deliverResult(delegationID: string, answer: string) {
    if (closing) return;
    if (gateway?.readyState !== 1) return stop();
    try {
      for (const content of commentaryChunks(answer)) {
        gateway.send(
          JSON.stringify({
            type: "session.commentary.append",
            event_id: crypto.randomUUID(),
            delegation_id: delegationID,
            content,
          }),
        );
      }
      completedDelegation = pendingDelegations.shift();
    } catch {
      stop();
    }
  }

  async function runDelegation() {
    const pending = pendingDelegations[0];
    const event = pending?.event;
    const id = event?.delegation?.id;
    if (!pending || !event || !id || closing || task) return;
    if (!transcripts.some(({ role, text }) => role === "user" && text.trim())) return;
    const controller = new AbortController();
    task = controller;
    let taskRevision = revision;
    try {
      const answer = await answerQuestion(
        backendMessages,
        config,
        { runID, sessionID, delegationID: id },
        controller.signal,
        () => {
          const updates = transcripts.slice(transcriptCursor);
          backendMessages.push(...updates.map(({ role, text }) => ({ role, content: text })));
          transcriptCursor = transcripts.length;
          taskRevision = revision;
        }
      );
      if (closing || controller.signal.aborted) return;
      if (taskRevision !== revision) return;
      deliverResult(id, answer.trim());
    } catch {
      if (closing || controller.signal.aborted) return;
      backendMessages.push({
        role: "assistant",
        content:
          "The backend attempt failed. Completed tool results remain valid; verify uncertain external actions before any retry.",
      });
      if (taskRevision !== revision) return;
      deliverResult(id, "Je n'ai pas pu lire le CRM cette fois. Propose de réessayer.");
    } finally {
      if (task === controller) task = undefined;
      scheduleDelegation();
    }
  }

  function queueDelegation(event: ProviderEvent) {
    pendingDelegations.push({ event });
    emit({ type: "app.delegation.pending", delegation_id: event.delegation?.id });
    scheduleDelegation();
  }

  function receiveGateway(data: unknown) {
    try {
      if (typeof data !== "string" || data.length > 1024 * 1024) throw new Error("Invalid voice event");
      const event: ProviderEvent = JSON.parse(data);
      if (browser.readyState === 1) browser.send(data);
      if (event.type === "session.closed") return finish();
      if (event.type === "gateway.session.closing" || event.type === "gateway.error" || event.type === "app.error") {
        return stop();
      }
      if (closing) return;
      if (event.type === "gateway.session.created") {
        sessionID = event.session?.id;
        clearTimeout(startupTimer);
        requestGreeting();
      }
      if (
        greetingCommand &&
        event.type === `session.${greetingCommand.type}.appended` &&
        event.client_event_id === greetingCommand.id
      ) {
        if (greetingCommand.type === "instructions") {
          greetingCommand = { id: crypto.randomUUID(), type: "commentary" };
          gateway?.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: greetingCommand.id,
              delegation_id: null,
              content: "Begin the conversation now, following the instructions provided.",
            }),
          );
        } else {
          clearGreeting();
          emit({ type: "app.greeting.accepted" });
        }
      } else if (greetingCommand && event.type === "error" && event.error?.client_event_id === greetingCommand.id) {
        clearGreeting();
        emit({ type: "app.greeting.error", error: { message: event.error.message ?? "The opening was rejected" } });
      }
      if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
        const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
        if (!event.delta?.trim()) return;
        const listeningSound = role === "user" && Boolean(task) && isListeningSound(event.delta);
        transcripts.push({
          role,
          text: event.delta,
          start_ms: event.start_ms ?? 0,
          end_ms: event.end_ms ?? 0,
          listeningSound,
        });
        if (listeningSound) return;
        if (role === "user") {
          revision++;
          const offset = completedDelegation?.event.offset_ms;
          // Live has no transcript watermark; completed handoffs can receive late context.
          if (
            pendingDelegations.length === 0 &&
            completedDelegation &&
            typeof offset === "number" &&
            Number.isFinite(offset) &&
            offset >= 0 &&
            typeof event.start_ms === "number" &&
            Number.isFinite(event.start_ms) &&
            event.start_ms >= 0 &&
            event.start_ms <= offset
          ) {
            pendingDelegations.push(completedDelegation);
            completedDelegation = undefined;
          }
          if (pendingDelegations.length) {
            emit({ type: "app.delegation.pending", delegation_id: pendingDelegations[0]?.event.delegation?.id });
          }
        }
        scheduleDelegation();
      } else if (event.type === "session.delegation.created") {
        const id = event.delegation?.id;
        if (id && event.delegation?.target === "client" && !delegations.has(id)) {
          delegations.add(id);
          queueDelegation(event);
        }
      }
    } catch {
      emit({ type: "app.error", error: { message: "Invalid voice event or lost connection" } });
      stop();
    }
  }

  async function startSession(sdp: string, token: string, workspaceId: string) {
    if (closing || browser.readyState !== 1) return;
    config.sales = await loadSalesContext(token, workspaceId);
    config.openingInstructions = `Commence maintenant en français. Salue ${config.sales.firstName} par son prénom, en une phrase chaleureuse, puis pose une seule question : sur quoi veut-elle ou veut-il travailler maintenant ? Puis écoute.`;
    if (closing || browser.readyState !== 1) return;
    clearTimeout(startTimer);
    startupTimer = setTimeout(() => {
      emit({ type: "app.error", error: { message: "Voice startup timed out" } });
      stop();
    }, 40_000);
    const accepted = await connect(
      new URL(`${gatewayAPIBase(config.baseURL)}/live/sessions`).href,
      {
        "Lovable-API-Key": config.key,
        "X-Lovable-AIG-SDK": "fetch",
        "X-Lovable-AIG-Run-ID": runID,
      },
      setupAbort.signal,
    );
    if (closing || browser.readyState !== 1) {
      close(accepted);
      return;
    }
    gateway = accepted;
    gateway.onMessage(receiveGateway);
    gateway.onClose(finish);
    gateway.onError(() => {
      emit({ type: "app.error", error: { message: "Voice gateway connection failed" } });
      stop();
    });
    gateway.send(
      JSON.stringify({
        type: "session.start",
        session: {
          model: config.liveModel,
          instructions: config.sales ? conversationInstructions(config.sales) : "",
          audio: { output: { voice: "marin" } },
          delegation: { type: "client" },
        },
        transport: { type: "webrtc", sdp },
      }),
    );
  }

  browser.onMessage((data) => {
    try {
      if (typeof data !== "string" || data.length > 64 * 1024) throw new Error("Invalid client message");
      const event = JSON.parse(data);
      if (event.type === "session.close") return stop();
      if (closing) return;
      if (!gateway) {
        if (starting || event.type !== "app.start" || typeof event.sdp !== "string" || !event.sdp.trim()) {
          throw new Error("Voice startup message required");
        }
        starting = true;
        execution.waitUntil(
          startSession(event.sdp, String(event.token ?? ""), String(event.workspaceId ?? "")).catch((error) => {
            if (!closing)
              emit({
                type: "app.error",
                error: { message: error instanceof Error ? error.message : "Voice startup failed" },
              });
            stop();
          }),
        );
        return;
      }
      if (event.type === "app.ready") {
        browserReady = true;
        requestGreeting();
        return;
      }
      if (event.type !== "gateway.heartbeat") {
        throw new Error("Unsupported client event");
      }
      if (gateway.readyState !== 1) return stop();
      gateway.send(data);
    } catch {
      emit({ type: "app.error", error: { message: "Voice connection could not be started or continued" } });
      stop();
    }
  });
  browser.onClose(stop);
  browser.onError(stop);
}
