import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://gustavosena972-wq.github.io",
  "https://copiloto-financeir.gustavosena972.workers.dev",
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

const jsonResponse = (body: unknown, status = 200, origin: string | null = null) =>
  new Response(JSON.stringify(body), { status, headers: corsHeadersFor(origin) });

async function hash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-F0-9]/g, "");
}

function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  return hex.match(/.{1,4}/g)!.join("-");
}

async function ensureRecoveryCode(admin: SupabaseClient<any>, userId: string): Promise<string | null> {
  const { data: existing, error: lookupError } = await admin
    .from("login_recuperacao")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (existing) return null;

  const code = generateRecoveryCode();
  const { error: insertError } = await admin.from("login_recuperacao").insert({
    user_id: userId,
    codigo_hash: await hash(normalizeRecoveryCode(code)),
  });

  if (insertError?.code === "23505") return null;
  if (insertError) throw insertError;
  return code;
}

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    jsonResponse(body, status, req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req.headers.get("Origin")) });
  }
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const rawBody = await req.text();
    if (rawBody.length > 8192) return json({ error: "Solicitação muito grande." }, 413);
    const body = JSON.parse(rawBody);
    const action = body?.action;
    const username = String(body?.username ?? "").trim().toLowerCase();

    if (!["login", "signup", "recover"].includes(action)) {
      return json({ error: "Ação inválida." }, 400);
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
      return json({ error: "Use um usuário de 3 a 24 caracteres: letras, números, ponto, hífen ou underline." }, 400);
    }

    const password = action === "recover" ? body?.newPassword : body?.password;
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      return json({ error: action === "recover"
        ? "A nova senha precisa ter entre 8 e 128 caracteres."
        : "A senha precisa ter entre 8 e 128 caracteres." }, 400);
    }

    if (action === "signup") {
      const cleanName = String(body?.name ?? "").trim();
      if (cleanName.length < 2 || cleanName.length > 80) {
        return json({ error: "Informe seu nome (2 a 80 caracteres)." }, 400);
      }
      if (body?.acceptedTerms !== true) {
        return json({ error: "É necessário aceitar os Termos e a Política de Privacidade." }, 400);
      }
    }

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) {
      return json({ error: "Serviço temporariamente indisponível." }, 503);
    }

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // Limite por IP alto o suficiente para redes compartilhadas; limite por conta impede tentativa direcionada.
    const ip = req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || "";
    const userHash = await hash(username);
    const rateChecks = [
      admin.rpc("consume_auth_rate_limit", {
        p_bucket_key: "user:" + userHash,
        p_max_attempts: 12,
        p_window_seconds: 600,
      }),
    ];
    if (ip) {
      rateChecks.push(admin.rpc("consume_auth_rate_limit", {
        p_bucket_key: "ip:" + await hash(ip),
        p_max_attempts: 600,
        p_window_seconds: 600,
      }));
    }

    const limits = await Promise.all(rateChecks);
    if (limits.some((r) => r.error)) {
      return json({ error: "O serviço de autenticação está temporariamente indisponível. Tente novamente." }, 503);
    }
    if (limits.some((r) => r.data !== true)) {
      return json({ error: "Muitas tentativas para esta conta ou rede. Aguarde alguns minutos e tente novamente." }, 429);
    }

    if (action === "signup") {
      const { data: exists, error: existsError } = await admin
        .from("login_usuarios")
        .select("user_id")
        .eq("username", username)
        .maybeSingle();

      if (existsError) return json({ error: "Não foi possível validar o usuário. Tente novamente." }, 503);
      if (exists) return json({ error: "Esse nome de usuário já está em uso. Escolha outro." }, 409);

      const authEmail = `${username}.${crypto.randomUUID().slice(0, 8)}@login.invalid`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: authEmail,
        email_confirm: true,
        password,
        user_metadata: { nome: String(body.name).trim(), aceitou_termos: "v2" },
      });

      if (createError || !created.user) {
        return json({ error: createError?.message ?? "Não foi possível criar a conta." }, 400);
      }

      const { error: mapError } = await admin.from("login_usuarios").insert({
        user_id: created.user.id,
        username,
      });
      if (mapError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: mapError.code === "23505"
          ? "Esse nome de usuário já está em uso."
          : "Não foi possível concluir o cadastro." }, 409);
      }

      let recoveryCode: string;
      try {
        const code = await ensureRecoveryCode(admin, created.user.id);
        if (!code) throw new Error("Não foi possível criar o código de recuperação.");
        recoveryCode = code;
      } catch {
        await admin.from("login_usuarios").delete().eq("user_id", created.user.id);
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: "Não foi possível preparar a recuperação segura da conta. Tente novamente." }, 503);
      }

      const { data: signed, error: signError } = await auth.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (signError || !signed.session) {
        return json({ error: "Conta criada, mas não foi possível iniciar a sessão. Tente entrar." }, 500);
      }
      return json({ session: signed.session, user: signed.user, recoveryCode });
    }

    const { data: mapping, error: lookupError } = await admin
      .from("login_usuarios")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    if (lookupError || !mapping) {
      return json({ error: action === "recover" ? "Usuário ou código de recuperação inválido." : "Usuário ou senha incorretos." }, 401);
    }

    if (action === "recover") {
      const supplied = normalizeRecoveryCode(String(body?.recoveryCode ?? ""));
      if (!/^[A-F0-9]{24}$/.test(supplied)) {
        return json({ error: "Usuário ou código de recuperação inválido." }, 401);
      }

      const oldHash = await hash(supplied);
      const { data: recovery, error: recoveryError } = await admin
        .from("login_recuperacao")
        .select("user_id")
        .eq("user_id", mapping.user_id)
        .eq("codigo_hash", oldHash)
        .maybeSingle();

      if (recoveryError || !recovery) {
        return json({ error: "Usuário ou código de recuperação inválido." }, 401);
      }

      const { error: updateError } = await admin.auth.admin.updateUserById(mapping.user_id, { password });
      if (updateError) {
        return json({ error: "Não foi possível redefinir a senha. Tente novamente." }, 503);
      }

      const nextCode = generateRecoveryCode();
      const nextHash = await hash(normalizeRecoveryCode(nextCode));
      const { data: rotated, error: rotateError } = await admin
        .from("login_recuperacao")
        .update({ codigo_hash: nextHash, atualizado_em: new Date().toISOString() })
        .eq("user_id", mapping.user_id)
        .eq("codigo_hash", oldHash)
        .select("user_id")
        .maybeSingle();

      if (rotateError || !rotated) {
        // Invalida o código antigo se a rotação falhar; a senha já foi alterada.
        await admin.from("login_recuperacao").delete().eq("user_id", mapping.user_id);
        return json({ error: "A senha foi alterada, mas não foi possível gerar um novo código. Entre com a nova senha e solicite suporte para recuperar o código." }, 503);
      }

      return json({
        message: "Senha redefinida. Entre com a nova senha e guarde o novo código de recuperação.",
        recoveryCode: nextCode,
      });
    }

    const { data: account, error: accountError } = await admin.auth.admin.getUserById(mapping.user_id);
    const email = account?.user?.email;
    if (accountError || !email) return json({ error: "Usuário ou senha incorretos." }, 401);

    const { data: signed, error: signError } = await auth.auth.signInWithPassword({ email, password });
    if (signError || !signed.session) return json({ error: "Usuário ou senha incorretos." }, 401);

    let recoveryCode: string | null = null;
    let recoveryUnavailable = false;
    try {
      recoveryCode = await ensureRecoveryCode(admin, mapping.user_id);
    } catch {
      recoveryUnavailable = true;
    }

    return json({
      session: signed.session,
      user: signed.user,
      ...(recoveryCode ? { recoveryCode } : {}),
      ...(recoveryUnavailable ? { recoveryUnavailable: true } : {}),
    });
  } catch {
    return json({ error: "Não foi possível concluir a solicitação. Tente novamente." }, 500);
  }
});