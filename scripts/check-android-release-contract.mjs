import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const gradle = read("../android-app/app/build.gradle.kts");
const activity = read("../android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt");
const purchase = read("../supabase/functions/google-play-purchase/index.ts");
const auth = read("../supabase/functions/autenticacao-usuario/index.ts");
const admin = read("../supabase/functions/google-play-admin/index.ts");
const html = read("../index.html");
const releaseWorkflow = read("../.github/workflows/android-release.yml");

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
assert.ok(html.includes("CopilotoPlayBilling.purchase("), "paywall must invoke native Play Billing");
assert.ok(html.includes("copiloto:play-purchase"), "web app must receive completed purchase events");
assert.ok(html.includes("google-play-purchase"), "web app must submit purchase tokens for server verification");
assert.ok(html.includes("salvar_valores_lancamentos"), "monthly quick edit must use the atomic database RPC");
assert.ok(html.includes("A contratação pela Google Play"), "signup checkout copy must not promise Pix in the Android flow");
assert.ok(!html.includes("chave:'+5531999758385'"), "personal Pix fallback must not be hardcoded in public HTML");
assert.ok(html.includes('id="confirmar-idade"'), "signup must require an adult confirmation");
assert.ok(html.includes("payload.acceptedAdult=true"), "signup must submit adult confirmation to the server");
assert.ok(auth.includes("body?.acceptedAdult !== true"), "server must enforce adult eligibility, not trust the browser alone");
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
