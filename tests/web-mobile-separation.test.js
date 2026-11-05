const fs = require("fs");

const landing = fs.readFileSync("index.html", "utf8");
const mobile = fs.readFileSync("android-app/app/src/main/assets/mobile.html", "utf8");
const androidMain = fs.readFileSync("android-app/app/src/main/java/br/com/copiloto/financeiro/MainActivity.kt", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Public Web is institutional/sales-only.
assert(landing.includes("Baixar na Google Play"), "Google Play CTA missing");
assert(!landing.includes("renderAuth"), "authentication UI must not remain in institutional landing");
assert(!landing.includes("renderPaywall"), "application paywall must not remain in institutional landing");

// Android bundles the complete application locally; the public Web is not its runtime.
assert(mobile.includes("function render()"), "complete Android app missing main renderer");
assert(mobile.includes("function renderAuth"), "complete Android app missing authentication");
assert(mobile.includes("copiloto_pro_30d"), "Android app missing Pro purchase path");
assert(mobile.includes("copiloto_max_30d"), "Android app missing Max purchase path");
assert(mobile.includes("copiloto_ultra_30d"), "Android app missing Ultra purchase path");
assert(mobile.includes("planoTemRecurso('relatorios')"), "Android app missing Ultra reports guard");
assert(androidMain.includes('webView.loadUrl("file:///android_asset/mobile.html")'), "Android must load the bundled complete application");
assert(!androidMain.includes("BuildConfig.WEB_APP_URL"), "Android must not depend on a public Web app URL");
assert(!fs.existsSync("app.html"), "public repository must not retain the former app.html entrypoint");

console.log("web-mobile-separation: PASS");
