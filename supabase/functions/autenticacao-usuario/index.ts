import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://gustavosena972-wq.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const body = await req.json();
    const action = body?.action;
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = body?.password;
    if (!["login", "signup"].includes(action)) return json({ error: "Ação inválida." }, 400);
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return json({ error: "Use um usuário de 3 a 24 caracteres: letras, números, ponto, hífen ou underline." }, 400);
    if (typeof password !== "string" || password.length < 8 || password.length > 128) return json({ error: "A senha precisa ter entre 8 e 128 caracteres." }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Serviço temporariamente indisponível." }, 503);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const [ipHash, userHash] = await Promise.all([hash(forwarded), hash(username)]);
    const limits = await Promise.all([
      admin.rpc("consume_auth_rate_limit", { p_bucket_key: "ip:" + ipHash, p_max_attempts: 12, p_window_seconds: 600 }),
      admin.rpc("consume_auth_rate_limit", { p_bucket_key: "user:" + userHash, p_max_attempts: 6, p_window_seconds: 600 }),
    ]);
    if (limits.some((r) => r.error || r.data !== true)) return json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);

    if (action === "signup") {
      const cleanName = String(body?.name ?? "").trim();
      const email = String(body?.recoveryEmail ?? "").trim().toLowerCase();
      if (cleanName.length < 2 || cleanName.length > 80) return json({ error: "Informe seu nome (2 a 80 caracteres)." }, 400);
      if (body?.acceptedTerms !== true) return json({ error: "É necessário aceitar os Termos e a Política de Privacidade." }, 400);
      if (email && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return json({ error: "Informe um Gmail válido ou deixe o campo vazio." }, 400);
      const { data: exists, error: existsError } = await admin.from("login_usuarios").select("user_id").eq("username", username).maybeSingle();
      if (existsError) return json({ error: "Não foi possível validar o usuário. Tente novamente." }, 503);
      if (exists) return json({ error: "Esse nome de usuário já está em uso. Escolha outro." }, 409);
      const authEmail = email || `${username}.${crypto.randomUUID().slice(0, 8)}@login.invalid`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email: authEmail, email_confirm: true, password, user_metadata: { nome: cleanName, aceitou_termos: "v1" } });
      if (createError || !created.user) return json({ error: createError?.message ?? "Não foi possível criar a conta." }, 400);
      const { error: mapError } = await admin.from("login_usuarios").insert({ user_id: created.user.id, username });
      if (mapError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: mapError.code === "23505" ? "Esse nome de usuário já está em uso." : "Não foi possível concluir o cadastro." }, 409);
      }
      const { data: signed, error: signError } = await auth.auth.signInWithPassword({ email: authEmail, password });
      if (signError || !signed.session) return json({ error: "Conta criada, mas não foi possível iniciar a sessão. Tente entrar." }, 500);
      return json({ session: signed.session, user: signed.user });
    }

    const { data: mapping, error: lookupError } = await admin.from("login_usuarios").select("user_id").eq("username", username).maybeSingle();
    if (lookupError || !mapping) return json({ error: "Usuário ou senha incorretos." }, 401);
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(mapping.user_id);
    const email = account?.user?.email;
    if (accountError || !email) return json({ error: "Usuário ou senha incorretos." }, 401);
    const { data: signed, error: signError } = await auth.auth.signInWithPassword({ email, password });
    if (signError || !signed.session) return json({ error: "Usuário ou senha incorretos." }, 401);
    return json({ session: signed.session, user: signed.user });
  } catch {
    return json({ error: "Não foi possível concluir a solicitação. Tente novamente." }, 500);
  }
});