import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://gustavosena972-wq.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

const products: Record<string, { plan: string; amount: number }> = {
  copiloto_pro_30d: { plan: "pro", amount: 23.90 },
  copiloto_max_30d: { plan: "max", amount: 35.90 },
  copiloto_ultra_30d: { plan: "ultra", amount: 59.90 },
};

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToBytes(pem: string): Uint8Array {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(body);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON não configurado");
  const account = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = base64url(new TextEncoder().encode(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: account.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3300,
  })));
  const unsigned = header + "." + claim;
  const key = await crypto.subtle.importKey(
    "pkcs8", pemToBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned),
  ));
  const assertion = unsigned + "." + base64url(signature);
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error("Não foi possível autenticar na API Google Play");
  return token.access_token;
}

async function verifyPurchase(accessToken: string, packageName: string, productId: string, purchaseToken: string) {
  const url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
    + encodeURIComponent(packageName) + "/purchases/products/"
    + encodeURIComponent(productId) + "/tokens/" + encodeURIComponent(purchaseToken);
  const response = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  const data = await response.json();
  if (!response.ok) throw new Error("A Google Play não confirmou esta compra");
  if (data.productId !== productId || Number(data.purchaseState) !== 0 || Number(data.quantity || 1) !== 1) {
    throw new Error("Compra não está em estado válido");
  }
  return data;
}

async function acknowledgePurchase(accessToken: string, packageName: string, productId: string, purchaseToken: string) {
  const url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/"
    + encodeURIComponent(packageName) + "/purchases/products/"
    + encodeURIComponent(productId) + "/tokens/" + encodeURIComponent(purchaseToken)
    + ":acknowledge";
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ developerPayload: "copiloto-compra-pendente-aprovacao-manual" }),
  });
  // Google returns success for an already acknowledged purchase too.
  if (!response.ok) throw new Error("A Google Play não confirmou a compra. Atualize o status antes de tentar novamente.");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization") || "";
    const jwt = authorization.replace(/^Bearer\s+/i, "");
    if (!jwt || jwt === authorization) return json({ error: "Sessão não encontrada." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
    if (!url || !anon || !service || !packageName) {
      return json({ error: "Integração Google Play ainda não configurada no servidor." }, 503);
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: "Bearer " + jwt } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData.user) return json({ error: "Sessão inválida." }, 401);

    const body = await req.json();
    const productId = String(body?.productId || "");
    const purchaseToken = String(body?.purchaseToken || "");
    if (!products[productId] || purchaseToken.length < 20 || purchaseToken.length > 4096) {
      return json({ error: "Dados da compra inválidos." }, 400);
    }

    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: membership, error: memberError } = await admin
      .from("membros").select("familia_id").eq("usuario_id", userData.user.id).maybeSingle();
    if (memberError || !membership?.familia_id) {
      return json({ error: "Não encontramos a família vinculada a esta conta." }, 403);
    }

    const googleToken = await googleAccessToken();
    const purchase = await verifyPurchase(googleToken, packageName, productId, purchaseToken);
    const tokenHash = await sha256(purchaseToken);

    const { data: existing } = await admin.from("google_play_compras")
      .select("id,status,usuario_id,familia_id")
      .eq("token_hash", tokenHash).maybeSingle();
    if (existing) {
      if (existing.usuario_id !== userData.user.id || existing.familia_id !== membership.familia_id) {
        return json({ error: "Esta compra já está vinculada a outra conta." }, 409);
      }
      // Repetições também garantem a confirmação caso a primeira chamada tenha falhado
      // depois de gravar a solicitação no banco.
      if (existing.status === "pendente" && Number(purchase.acknowledgementState) !== 1) {
        await acknowledgePurchase(googleToken, packageName, productId, purchaseToken);
      }
      return json({ ok: true, status: existing.status, duplicate: true });
    }

    const product = products[productId];
    const { error: insertError } = await admin.from("google_play_compras").insert({
      familia_id: membership.familia_id,
      usuario_id: userData.user.id,
      produto_id: productId,
      plano: product.plan,
      valor: product.amount,
      pacote: packageName,
      pedido_google: purchase.orderId || null,
      token_compra: purchaseToken,
      token_hash: tokenHash,
      comprado_em: purchase.purchaseTimeMillis
        ? new Date(Number(purchase.purchaseTimeMillis)).toISOString()
        : null,
      status: "pendente",
    });
    if (insertError) {
      if (insertError.code === "23505") return json({ ok: true, status: "pendente", duplicate: true });
      throw insertError;
    }

    // Confirmar a compra dentro do prazo exigido pela Google Play, sem consumi-la.
    // O produto permanece não consumido e a solicitação continua pendente até a decisão
    // manual. A aprovação consome o produto; a recusa solicita reembolso/revogação.
    await acknowledgePurchase(googleToken, packageName, productId, purchaseToken);
    return json({ ok: true, status: "pendente", message: "Compra verificada e enviada para aprovação manual." });
  } catch (error) {
    console.error("google-play-purchase", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível validar a compra." }, 400);
  }
});
