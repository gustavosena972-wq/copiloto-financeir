import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://gustavosena972-wq.github.io",
  "https://copiloto-financeir.gustavosena972.workers.dev",
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

const products = new Set(["copiloto_pro_30d", "copiloto_max_30d", "copiloto_ultra_30d"]);

function b64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function pemBytes(pem: string): ArrayBuffer {
  const binary = atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
async function accessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Credencial Google Play não configurada.");
  const account = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))
    + "." + b64url(new TextEncoder().encode(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: now, exp: now + 3300,
    })));
  const key = await crypto.subtle.importKey("pkcs8", pemBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: unsigned + "." + b64url(sig) }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Falha ao autenticar na Google Play.");
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: corsHeadersFor(origin) });

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response(JSON.stringify({ error: "Origem não autorizada." }), {
      status: 403,
      headers: corsHeadersFor(null),
    });
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    const jwt = authorization.replace(/^Bearer\s+/i, "");
    if (!jwt || jwt === authorization) return json({ error: "Sessão não encontrada." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
    if (!url || !anon || !service || !packageName) return json({ error: "Integração não configurada." }, 503);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: "Bearer " + jwt } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData.user) return json({ error: "Sessão inválida." }, 401);
    const { data: isAdmin, error: adminCheckError } = await userClient.rpc("eh_admin");
    if (adminCheckError || isAdmin !== true) return json({ error: "Acesso administrativo necessário." }, 403);

    const body = await req.json();
    const id = String(body?.id || "");
    const action = String(body?.action || "");
    if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(action)) {
      return json({ error: "Ação ou compra inválida." }, 400);
    }

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: purchase, error: purchaseError } = await admin.from("google_play_compras")
      .select("id,produto_id,pacote,pedido_google,token_compra,status")
      .eq("id", id).maybeSingle();
    if (purchaseError || !purchase || purchase.status !== "pendente") {
      return json({ error: "Compra não encontrada ou já decidida." }, 404);
    }
    if (purchase.pacote !== packageName || !products.has(purchase.produto_id)) {
      return json({ error: "Os dados desta compra não correspondem ao aplicativo configurado." }, 409);
    }

    const googleToken = await accessToken();
    const base = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" + encodeURIComponent(packageName);
    const verifyUrl = base + "/purchases/products/" + encodeURIComponent(purchase.produto_id)
      + "/tokens/" + encodeURIComponent(purchase.token_compra);
    const verifyResponse = await fetch(verifyUrl, { headers: { Authorization: "Bearer " + googleToken } });
    const verified = await verifyResponse.json();
    if (!verifyResponse.ok || verified.productId !== purchase.produto_id || Number(verified.purchaseState) !== 0) {
      return json({ error: "A Google Play não confirma mais esta compra como válida." }, 409);
    }

    if (action === "approve") {
      // Consumir no servidor somente no momento da aprovação manual.
      // Se a etapa SQL falhar, uma nova tentativa detecta consumptionState=1 e continua com a aprovação.
      if (Number(verified.consumptionState) !== 1) {
        const consumeResponse = await fetch(verifyUrl + ":consume", {
          method: "POST", headers: { Authorization: "Bearer " + googleToken, "Content-Type": "application/json" }, body: "{}",
        });
        if (!consumeResponse.ok) return json({ error: "A Google Play não confirmou o processamento da compra. Tente novamente." }, 502);
      }
      const { data, error } = await userClient.rpc("aprovar_compra_google_play", { p_id: id, p_dias: 30 });
      if (error) return json({ error: "Compra processada na loja, mas a aprovação no sistema falhou. Repita a aprovação para concluir: " + error.message }, 500);
      return json({ ok: true, status: "aprovado", acesso_ate: data });
    }

    // Rejeição deve reembolsar e revogar no Google Play antes de marcar a solicitação como recusada.
    if (!purchase.pedido_google) {
      return json({ error: "Esta compra não tem número de pedido para reembolso automático. Não foi recusada; encaminhe para revisão manual no Play Console." }, 409);
    }
    const orderUrl = base + "/orders/" + encodeURIComponent(purchase.pedido_google);
    const orderResponse = await fetch(orderUrl, { headers: { Authorization: "Bearer " + googleToken } });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      return json({ error: "Não foi possível consultar o pedido na Google Play. A solicitação continua pendente." }, 502);
    }
    // Permite repetir a ação com segurança se o reembolso já ocorreu, mas a
    // atualização do banco falhou na tentativa anterior.
    if (order.state !== "REFUNDED" && order.state !== "PENDING_REFUND") {
      if (order.state !== "PROCESSED") {
        return json({ error: "O pedido não está em um estado que permita reembolso. A solicitação continua pendente." }, 409);
      }
      const refundUrl = orderUrl + ":refund?revoke=true";
      const refundResponse = await fetch(refundUrl, {
        method: "POST", headers: { Authorization: "Bearer " + googleToken, "Content-Type": "application/json" }, body: "{}",
      });
      if (!refundResponse.ok) return json({ error: "A Google Play não confirmou o reembolso e a revogação. A solicitação continua pendente." }, 502);
    }
    const { error } = await userClient.rpc("recusar_compra_google_play", {
      p_id: id, p_nota: "Compra reembolsada e acesso revogado pela Google Play.",
    });
    if (error) return json({ error: "Reembolso efetuado, mas não foi possível atualizar o status interno. Atualize o painel e confira o pedido." }, 500);
    return json({ ok: true, status: "recusado" });
  } catch (error) {
    console.error("google-play-admin", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível concluir a ação." }, 400);
  }
});
