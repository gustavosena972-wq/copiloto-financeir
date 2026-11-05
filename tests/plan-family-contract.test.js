const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const androidBuild = fs.readFileSync("android-app/app/build.gradle.kts", "utf8");
const purchaseFn = fs.readFileSync("supabase/functions/google-play-purchase/index.ts", "utf8");
const memberLimitMigration = fs.readFileSync(
  "supabase/migrations/20261104152943_align_ultra_member_limit.sql",
  "utf8"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// One account must resolve to one family; the client must not preserve/switch
// a selected family through localStorage or expose the dead multi-space action.
assert(!html.includes("localStorage.getItem('cf_familia_ativa')"), "family selection must not come from localStorage");
assert(!html.includes("localStorage.setItem('cf_familia_ativa'"), "family selection must not be written to localStorage");
assert(!html.includes("function viewEspacos()"), "dead multi-space view must not remain in the client");
assert(!html.includes("data-act=\"trocarespaco\""), "family switching action must not remain in the client");

// Canonical paid-plan catalog: IDs, prices, 30-day model and member limits.
assert(html.includes("pro:{nome:'Pro',valor:23.90,limite:2,produto:'copiloto_pro_30d'"), "Pro catalog contract missing");
assert(html.includes("max:{nome:'Max',valor:35.90,limite:6,produto:'copiloto_max_30d'"), "Max catalog contract missing");
assert(html.includes("ultra:{nome:'Ultra',valor:59.90,limite:null,produto:'copiloto_ultra_30d'"), "Ultra catalog contract missing");
assert(html.includes("Compra única · 30 dias"), "purchase UI must state the 30-day one-time model");

// Every paid feature advertised for Ultra must have a real UI path and an
// explicit plan guard. This prevents marketing-only entitlements.
for (const [label, guard, action] of [
  ["relatórios", "planoTemRecurso('relatorios')", "viewRelatorios"],
  ["histórico patrimonial", "planoTemRecurso('patrimonioHistorico')", "data-act=\"registrarpat\""],
  ["simulador de objetivos", "planoTemRecurso('simulador')", "data-act=\"simularproj\""],
]) {
  assert(html.includes(guard), "Ultra guard missing for " + label);
  assert(html.includes(action), "Ultra implementation path missing for " + label);
}

// Pro/Max membership limits are enforced in both client and database trigger.
assert(html.includes("const limiteMembros=()=>PLANOS[S.fam?.plano||'pro']?.limite??Infinity"), "client member-limit guard missing");
assert(memberLimitMigration.includes("WHEN 'pro' THEN 2"), "database Pro limit missing");
assert(memberLimitMigration.includes("WHEN 'max' THEN 6"), "database Max limit missing");
assert(memberLimitMigration.includes("WHEN 'ultra' THEN NULL"), "database Ultra limit missing");
assert(memberLimitMigration.includes("IF total >= limite"), "database member-limit enforcement missing");

// Google Play products must match the canonical catalog.
for (const productId of ["copiloto_pro_30d", "copiloto_max_30d", "copiloto_ultra_30d"]) {
  assert(html.includes(productId), productId + " missing from web plan flow");
  assert(purchaseFn.includes(productId), productId + " missing from purchase backend");
}

// Active Android release module must use the canonical package ID.
assert(
  /applicationId\s*=\s*"br\.com\.copiloto\.financeiro"/.test(androidBuild),
  "active Android module must use the canonical applicationId"
);

console.log("plan-family-contract: PASS");
