const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Regression contract: one account must resolve to one family; the client must
// not preserve/switch a selected family through localStorage or expose a dead
// multi-space screen.
assert(!html.includes("localStorage.getItem('cf_familia_ativa')"), "family selection must not come from localStorage");
assert(!html.includes("function viewEspacos()"), "dead multi-space view must not remain in the client");
assert(!html.includes("data-act=\"trocarespaco\""), "family switching action must not remain in the client");

// Paid-plan contract: public purchase UI must keep the canonical 30-day products.
for (const productId of ["copiloto_pro_30d", "copiloto_max_30d", "copiloto_ultra_30d"]) {
  assert(html.includes(productId), productId + " missing from web plan flow");
}
assert(html.includes("Compra única · 30 dias"), "purchase UI must state the 30-day one-time model");

console.log("plan-family-contract: PASS");
