const fs = require("fs");

const landing = fs.readFileSync("index.html", "utf8");
const mobile = fs.readFileSync("app.html", "utf8");
const androidBuild = fs.readFileSync("android-app/app/build.gradle.kts", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// The public Web root is institutional/sales-only. The complete application
// remains isolated in app.html for the Android WebView.
assert(landing.includes("Conheça o Copiloto Financeiro"), "institutional landing title missing");
assert(landing.includes("Baixar na Google Play"), "Google Play CTA missing");
assert(!landing.includes("renderAuth"), "authentication UI must not remain in the institutional landing");
assert(!landing.includes("renderPaywall"), "application paywall must not remain in the institutional landing");

// The mobile artifact must retain the complete application surface.
assert(mobile.includes("function render()"), "complete mobile app missing main application renderer");
assert(mobile.includes("function renderAuth"), "complete mobile app missing authentication");
assert(mobile.includes("copiloto_pro_30d"), "complete mobile app missing Pro purchase path");
assert(mobile.includes("copiloto_max_30d"), "complete mobile app missing Max purchase path");
assert(mobile.includes("copiloto_ultra_30d"), "complete mobile app missing Ultra purchase path");
assert(mobile.includes("planoTemRecurso('relatorios')"), "complete mobile app missing Ultra reports guard");

// Android must load the complete application, not the institutional landing.
assert(
  androidBuild.includes('WEB_APP_URL", "\"https://copiloto-financeir.gustavosena972.workers.dev/app.html/\"'),
  "Android must point to the complete app route"
);

console.log("web-mobile-separation: PASS");
