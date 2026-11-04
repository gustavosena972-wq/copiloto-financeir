import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const gradle = read("../android-app/app/build.gradle.kts");
const activity = read("../android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt");
const purchase = read("../supabase/functions/google-play-purchase/index.ts");
const auth = read("../supabase/functions/autenticacao-usuario/index.ts");
const admin = read("../supabase/functions/google-play-admin/index.ts");
const html = read("../index.html");
const releaseWorkflow = read("../.github/workflows/android-release.yml");
const securityMigrationPath = new URL("../supabase/migrations/20261104190000_restrict_config_app_anon_read.sql", import.meta.url);
const securityMigration = existsSync(securityMigrationPath) ? readFileSync(securityMigrationPath, "utf8") : "";

const packageName = "br.com.copiloto.financeiro";
const appOrigin = "https://copiloto-financeir.gustavosena972.workers.dev";

assert.ok(gradle.includes('applicationId = "' + packageName + '"'), "Android applicationId must match the registered Play package");
assert.ok(gradle.includes(appOrigin + "/"), "Android must load the canonical Cloudflare origin");
assert.ok(activity.includes('allowedHost = "copiloto-financeir.gustavosena972.workers.dev"'));
assert.ok(activity.includes('allowedPathPrefix = "/"'), "WebView must trust the app root on the canonical host");
assert.ok(purchase.includes('Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")'), "purchase backend must use the configured Play package");
assert.ok(purchase.includes('if (!url || !anon || !service || !packageName)'), "purchase backend must fail closed without the package secret");
assert.ok(purchase.includes(appOrigin), "purchase function must allow the canonical app origin");
assert.ok(purchase.includes("async function consumePurchase"), "consumable Play purchases must be acknowledged within the store deadline");
assert.ok(purchase.includes("await consumePurchase(googleToken"), "server must consume verified purchases after persisting them");
assert.ok(admin.includes(appOrigin), "admin function must allow the canonical app origin");

assert.ok(purchase.includes('"https://gustavosena972-wq.github.io"'), "purchase function must retain the supported web origin");
assert.ok(purchase.includes("Number(data.purchaseState) !== 0"), "purchase function must reject purchases not confirmed by Google Play");
assert.ok(purchase.includes("Number(data.quantity || 1) !== 1"), "purchase function must reject unexpected purchase quantities");
assert.ok(purchase.includes("byteLength > 8192"), "purchase endpoint must cap request size in bytes");
assert.ok(!purchase.includes('"Access-Control-Allow-Origin": "*"'), "purchase endpoint must never reflect wildcard CORS");
assert.ok(purchase.includes('p_bucket_key: "purchase:user:"'), "purchase verification must apply per-user rate limiting");
assert.ok(purchase.includes('.eq("token_hash", tokenHash)'), "purchase verification must enforce token idempotency");
assert.ok(!purchase.includes('"Access-Control-Allow-Origin": "*"'), "purchase function must not use wildcard CORS");
assert.ok(admin.includes('"https://gustavosena972-wq.github.io"'), "admin function must retain the supported web origin");
assert.ok(admin.includes('userClient.rpc("eh_admin")'), "admin endpoint must verify the caller's administrator role");
assert.ok(admin.includes(":refund?revoke=true"), "rejecting a purchase must refund and revoke it through Google Play");
assert.ok(admin.includes('purchase.status !== "pendente"'), "admin endpoint must reject already-decided purchases");
assert.ok(!admin.includes('"Access-Control-Allow-Origin": "*"'), "admin function must not use wildcard CORS");
assert.ok(admin.includes("const rawBody = await req.text()"), "admin endpoint must cap request body size before JSON parsing");
assert.ok(admin.includes("byteLength > 8192"), "admin endpoint must reject oversized request bodies");
assert.ok(!admin.includes("error: error instanceof Error ? error.message"), "admin endpoint must not disclose raw internal errors to clients");
assert.ok(!admin.includes("error.message"), "admin endpoint must not return raw database error details");
assert.ok(existsSync(securityMigrationPath), "config_app anonymous-read hardening migration must exist");
assert.ok(securityMigration.includes("REVOKE SELECT ON TABLE public.config_app FROM anon, authenticated, PUBLIC"), "config_app table-level SELECT must be revoked from client roles");
assert.ok(securityMigration.includes("REVOKE SELECT (chave, valor) ON TABLE public.config_app FROM anon, authenticated, PUBLIC"), "existing column-level SELECT grants must also be revoked");
assert.ok(securityMigration.includes("USING (chave = ANY"), "config_app RLS must expose only an explicit public-key allowlist");
assert.ok(securityMigration.includes("'pix_chave'") && securityMigration.includes("'contato_email'"), "the app allowlist must preserve only required public configuration keys");
assert.ok(securityMigration.includes("TO authenticated USING (true)"), "authenticated users must retain config needed by the app");
assert.ok(securityMigration.includes("GRANT SELECT (chave, valor) ON TABLE public.config_app TO authenticated"), "authenticated role must retain only the required config columns");
assert.ok(auth.includes('"https://gustavosena972-wq.github.io"'), "authentication must retain the supported web origin");
assert.ok(auth.includes(appOrigin), "authentication must allow the canonical Cloudflare origin");
assert.ok(gradle.includes("compileSdk = 36") && gradle.includes("targetSdk = 36"), "Android must target the current required API level");
assert.ok(gradle.includes('com.android.billingclient:billing:9.1.0'), "Android must use the pinned Play Billing dependency");
assert.ok(activity.includes("Purchase.PurchaseState.PENDING"), "Android must handle pending Play purchases");
assert.ok(activity.includes("BillingClient.BillingResponseCode.USER_CANCELED"), "Android must handle user-cancelled purchases");

assert.ok(html.includes("CopilotoPlayBilling.purchase("), "paywall must invoke native Play Billing");
assert.ok(html.includes("copiloto:play-purchase"), "web app must receive completed purchase events");
assert.ok(html.includes("google-play-purchase"), "web app must submit purchase tokens for server verification");
assert.ok(html.includes("salvar_valores_lancamentos"), "monthly quick edit must use the atomic database RPC");
assert.ok(html.includes("A contratação pela Google Play"), "signup checkout copy must not promise Pix in the Android flow");
assert.ok(!html.includes("chave:'+5531999758385'"), "personal Pix fallback must not be hardcoded in public HTML");
assert.ok(html.includes('id="confirmar-idade"'), "signup must require an adult confirmation");
assert.ok(html.includes("payload.acceptedAdult=true"), "signup must submit adult confirmation to the server");
assert.ok(auth.includes("payload?.acceptedAdult !== true"), "server must enforce adult eligibility, not trust the browser alone");
assert.ok(auth.includes("byteLength > 8192"), "authentication endpoint must cap request size in bytes");
assert.ok(html.includes("const precoSelecionado = S.playProducts?.[produtoSelecionado]?.formattedPrice"), "selected plan summary must display the actual Google Play price");
assert.ok(!html.includes("${brl(plano.valor)}"), "paywall must not display stale web/Pix prices as the Google Play checkout price");

assert.ok(gradle.includes('System.getenv("ANDROID_KEYSTORE_PATH")'), "release signing must be configurable through protected CI environment variables");
assert.ok(gradle.includes('System.getenv("ANDROID_KEYSTORE_PASSWORD")'), "release signing must use a protected keystore password");
assert.ok(releaseWorkflow.includes("workflow_dispatch:"), "signed release workflow must be manually triggered");
for (const secret of ["ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]) {
  assert.ok(releaseWorkflow.includes(secret), `signed release workflow must require ${secret}`);
}
assert.ok(releaseWorkflow.includes("jarsigner -verify"), "release workflow must verify the AAB signature");
assert.ok(releaseWorkflow.includes("upload-artifact@v4"), "signed AAB must be uploaded as a CI artifact");

console.log("Android/Cloudflare/Google Play release contract: OK");
console.log("Signed AAB release gate: OK");
