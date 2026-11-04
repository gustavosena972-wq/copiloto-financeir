import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const gradle = read("../android-app/app/build.gradle.kts");
const activity = read("../android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt");
const purchase = read("../supabase/functions/google-play-purchase/index.ts");
const admin = read("../supabase/functions/google-play-admin/index.ts");
const html = read("../index.html");

const packageName = "br.com.copiloto.financeiro";
const appOrigin = "https://copiloto-financeir.gustavosena972.workers.dev";

assert.match(gradle, new RegExp('applicationId\\s*=\\s*"' + packageName.replaceAll(".", "\\.") + '"'));
assert.ok(gradle.includes(appOrigin + "/"), "Android must load the canonical Cloudflare origin");
assert.ok(activity.includes('allowedHost = "copiloto-financeir.gustavosena972.workers.dev"'));
assert.ok(activity.includes('allowedPathPrefix = "/"'), "WebView must trust the app root on the canonical host");
assert.ok(purchase.includes('Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")'), "purchase backend must use the configured Play package");
assert.ok(purchase.includes('if (!url || !anon || !service || !packageName)'), "purchase backend must fail closed without the package secret");
assert.ok(purchase.includes(appOrigin), "purchase function must allow the canonical app origin");
assert.ok(admin.includes(appOrigin), "admin function must allow the canonical app origin");
assert.ok(html.includes("CopilotoPlayBilling.purchase("), "paywall must invoke native Play Billing");
assert.ok(html.includes("copiloto:play-purchase"), "web app must receive completed purchase events");
assert.ok(html.includes("google-play-purchase"), "web app must submit purchase tokens for server verification");
assert.ok(!html.includes("chave:'+5531999758385'"), "personal Pix fallback must not be hardcoded in public HTML");

console.log("Android/Cloudflare/Google Play release contract: OK");
