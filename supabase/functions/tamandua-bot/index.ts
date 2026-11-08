import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildTamanduaInstructions, buildTamanduaMemoryUpdates, normalizeBotInput, trimModelOutput } from "./bot-core.ts";

const ALLOWED_ORIGINS = new Set([
  "https://gustavosena972-wq.github.io",
  "https://copiloto-financeir.gustavosena972.workers.dev",
  "https://appassets.androidplatform.net",
]);

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function corsHeaders(origin: string | null) {
  return {
    ...JSON_HEADERS,
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

function getBearer(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return /^Bearer\s+\S+$/i.test(value) ? value.replace(/^Bearer\s+/i, "") : null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);

  const token = getBearer(request);
  if (!token) return json({ error: "Sessão obrigatória." }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-6.1-terra";

  if (!supabaseUrl || !supabaseAnonKey) {
    return json({ error: "Serviço de dados não configurado." }, 500, origin);
  }
  if (!openAiKey) {
    return json({ error: "Inteligência do Tamanduá ainda não foi configurada no servidor." }, 503, origin);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) return json({ error: "Sessão inválida." }, 401, origin);

  let input: ReturnType<typeof normalizeBotInput>;
  try {
    const body = await request.json();
    input = normalizeBotInput(body);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Solicitação inválida." }, 400, origin);
  }

  const { data: member, error: memberError } = await userClient
    .from("membros")
    .select("id,familia_id,nome,papel")
    .eq("usuario_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberError || !member?.familia_id) {
    return json({ error: "Não foi possível identificar a família da conta." }, 403, origin);
  }

  const { data: latestConversation } = await userClient
    .from("conversas_ia")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("familia_id", member.familia_id)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: knowledge }, { data: learnings }, { data: historyRows }] = await Promise.all([
    userClient
      .from("ia_conhecimento")
      .select("titulo,categoria,conteudo,fonte,confianca")
      .eq("status", "ativo")
      .order("atualizado_em", { ascending: false })
      .limit(8),
    userClient
      .from("ia_aprendizados")
      .select("chave,valor,confianca,evidencia")
      .eq("usuario_id", user.id)
      .eq("familia_id", member.familia_id)
      .order("atualizado_em", { ascending: false })
      .limit(12),
    latestConversation?.id
      ? userClient
          .from("mensagens_ia")
          .select("papel,conteudo,criado_em")
          .eq("conversa_id", latestConversation.id)
          .eq("familia_id", member.familia_id)
          .order("criado_em", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
  ]);

  const knowledgeText = (knowledge ?? []).map((item) =>
    [item.titulo, item.categoria, item.conteudo, item.fonte ? `Fonte: ${item.fonte}` : ""]
      .filter(Boolean)
      .join(" — ")
  );

  const instructions = buildTamanduaInstructions({
    knowledge: knowledgeText,
    learnings: (learnings ?? []).map((item) => ({ key: item.chave, value: item.valor })),
    history: (historyRows ?? [])
      .slice()
      .reverse()
      .map((item) => ({ role: item.papel, content: item.conteudo })),
  });

  const context = JSON.stringify(input.context).slice(0, 6000);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions,
      input: [
        {
          role: "user",
          content: `Contexto atual do aplicativo (dados fornecidos pelo próprio app): ${context}\n\nMensagem do usuário: ${input.message}`,
        },
      ],
      max_output_tokens: 700,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("OpenAI response error", response.status, detail.slice(0, 500));
    return json({ error: "Não consegui processar sua mensagem agora." }, 502, origin);
  }

  const payload = await response.json();
  let answer: string;
  try {
    answer = trimModelOutput(payload.output_text);
  } catch {
    return json({ error: "A inteligência retornou uma resposta vazia." }, 502, origin);
  }

  const memoryUpdates = buildTamanduaMemoryUpdates(input.context);
  if (memoryUpdates.length) {
    const { error: memoryError } = await userClient
      .from("ia_aprendizados")
      .upsert(
        memoryUpdates.map((item) => ({
          familia_id: member.familia_id,
          usuario_id: user.id,
          chave: item.key,
          valor: item.value,
          confianca: item.confidence,
          evidencia: item.evidence,
          ultima_evidencia_em: new Date().toISOString(),
        })),
        { onConflict: "familia_id,usuario_id,chave" },
      );

    if (memoryError) {
      console.error("Tamanduá memory persistence error", memoryError.message);
    }
  }

  await userClient.from("ia_eventos").insert({
    familia_id: member.familia_id,
    usuario_id: user.id,
    tipo: "tamandua_mensagem",
    intencao: input.context.intencao ?? null,
    contexto: {
      view: input.context.view ?? null,
      message_length: input.message.length,
      knowledge_count: knowledge?.length ?? 0,
      memory_updates: memoryUpdates.map((item) => item.key),
    },
    resultado: "resposta_gerada",
  });

  return json({
    answer,
    model,
    knowledgeUsed: knowledge?.length ?? 0,
  }, 200, origin);
});
