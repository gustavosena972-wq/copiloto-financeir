import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { buildTamanduaInstructions, extractResponseText, normalizeBotInput } from "./bot-core.ts";

const ORIGINS = new Set(["https://gustavosena972-wq.github.io", "https://copiloto-financeir.gustavosena972.workers.dev", "https://appassets.androidplatform.net"]);
function headers(origin: string | null) {
  return { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin && ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
function json(origin: string | null, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}
Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !ORIGINS.has(origin)) return json(origin, {error:"Origem não autorizada."}, 403);
  if (request.method === "OPTIONS") return new Response(null,{status:204,headers:headers(origin)});
  if (request.method !== "POST") return json(origin,{error:"Método não permitido."},405);
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json(origin,{error:"Sessão obrigatória."},401);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !anon || !apiKey) return json(origin,{error:"Assistente temporariamente indisponível."},503);
  try {
    if (Number(request.headers.get("content-length") || 0) > 32000) return json(origin,{error:"Solicitação muito extensa."},413);
    const raw = await request.text();
    if (raw.length > 32000) return json(origin,{error:"Solicitação muito extensa."},413);
    let input;
    try { input = normalizeBotInput(JSON.parse(raw)); } catch {
      return json(origin,{error:"Mensagem ou contexto inválido."},400);
    }
    const db = createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:auth,error:authError} = await db.auth.getUser(token);
    if (authError || !auth.user) return json(origin,{error:"Sessão inválida."},401);
    const userId = auth.user.id;
    const {data:member,error:memberError} = await db.from("membros").select("familia_id").eq("usuario_id",userId).maybeSingle();
    if (memberError || !member) return json(origin,{error:"Família não autorizada."},403);
    const familyId = member.familia_id;
    const {data:prefs,error:prefsError} = await db.from("tamandua_preferencias").select("memoria_habilitada,idioma").eq("usuario_id",userId).eq("familia_id",familyId).maybeSingle();
    if (prefsError) return json(origin,{error:"Não foi possível verificar suas preferências. Tente novamente."},503);
    const remembers = prefs?.memoria_habilitada !== false;
    const now = new Date();
    const month = Number(input.context.mes || Number(new Intl.DateTimeFormat("en",{timeZone:"America/Sao_Paulo",month:"numeric"}).format(now)));
    const year = Number(input.context.ano || Number(new Intl.DateTimeFormat("en",{timeZone:"America/Sao_Paulo",year:"numeric"}).format(now)));
    const {data:financial,error:financialError} = await db.rpc("tamandua_contexto_financeiro",{p_mes:month,p_ano:year});
    if (financialError || !financial) return json(origin,{error:"Não consegui conferir seus dados financeiros com segurança. Tente novamente."},503);

    let conversationId: string | null = null;
    if (input.context.conversa_id) {
      const {data:c,error:e} = await db.from("conversas_ia").select("id")
        .eq("id",input.context.conversa_id).eq("usuario_id",userId).eq("familia_id",familyId).maybeSingle();
      if (e || !c) return json(origin,{error:"Conversa indisponível para esta conta."},404);
      conversationId = c.id;
    }
    const [knowledgeResult,memoryResult,historyResult] = await Promise.all([
      db.from("ia_conhecimento").select("titulo,conteudo,fonte,versao,revisado_em").eq("status","ativo").order("revisado_em",{ascending:false}).limit(8),
      remembers ? db.from("ia_aprendizados").select("chave,valor").eq("usuario_id",userId).eq("familia_id",familyId).neq("chave","estado_financeiro_atual").order("atualizado_em",{ascending:false}).limit(12) : Promise.resolve({data:[],error:null}),
      conversationId ? db.from("mensagens_ia").select("papel,conteudo").eq("conversa_id",conversationId).eq("familia_id",familyId).order("criado_em",{ascending:false}).limit(12) : Promise.resolve({data:[],error:null})
    ]);
    if (memoryResult.error || historyResult.error) return json(origin,{error:"Não consegui verificar seu histórico com segurança."},503);
    const instructions = buildTamanduaInstructions({
      knowledge:(knowledgeResult.data || []).map(x=>JSON.stringify({titulo:x.titulo,conteudo:x.conteudo,fonte:x.fonte,versao:x.versao})),
      learnings:(memoryResult.data || []).map(x=>({key:x.chave,value:x.valor})),
      history:(historyResult.data || []).slice().reverse().map(x=>({role:x.papel,content:x.conteudo}))
    });
    const response = await fetch("https://api.openai.com/v1/responses",{
      method:"POST",signal:AbortSignal.timeout(25000),
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:Deno.env.get("OPENAI_MODEL") || "gpt-6.1-terra",
        store:false,instructions,max_output_tokens:1000,
        input:[{role:"user",content:JSON.stringify({
          contexto_financeiro_autorizado:financial,
          idioma_manual:prefs?.idioma || "auto",
          mensagem:input.message
        })}]})
    });
    if (!response.ok) {
      console.error("tamandua_model_http",response.status);
      return json(origin,{error:"Não consegui responder agora. Tente novamente em instantes."},502);
    }
    let answer: string;
    try { answer=extractResponseText(await response.json()); } catch {
      return json(origin,{error:"Não recebi uma resposta completa. Tente novamente."},502);
    }
    const {data:saved,error:saveError} = await db.rpc("tamandua_salvar_conversa",{
      p_conversa:conversationId,p_mensagem:input.message,p_resposta:answer
    });
    if (!saveError && saved) conversationId = saved;
    // Only operational metadata. No message bodies, financial values or upstream errors in logs.
    if (saveError) console.error("tamandua_history_not_saved",saveError.code);
    await db.from("ia_eventos").insert({familia_id:familyId,usuario_id:userId,tipo:"tamandua_mensagem",
      intencao:"conversa_financeira",contexto:{history_saved:!saveError,knowledge_count:knowledgeResult.data?.length || 0},
      resultado:saveError?"resposta_sem_historico":"resposta_gerada"});
    return json(origin,{answer,conversationId,historySaved:!saveError,knowledgeUsed:knowledgeResult.data?.length || 0});
  } catch (error) {
    console.error("tamandua_request_failed",error instanceof Error ? error.name : "unknown");
    return json(origin,{error:"Não consegui concluir agora. Seus lançamentos não foram alterados."},503);
  }
});
