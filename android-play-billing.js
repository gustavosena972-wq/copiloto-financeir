(() => {
  "use strict";
  const bridge = window.CopilotoPlayBilling;
  if (!bridge) return; // Navegadores comuns continuam usando o checkout Pix da web.

  const ids = {
    pro: "copiloto_pro_30d",
    max: "copiloto_max_30d",
    ultra: "copiloto_ultra_30d",
  };
  let products = {};
  let submitting = false;

  const status = (message, isError = false) => {
    const node = document.getElementById("cf-play-status");
    if (!node) return;
    node.textContent = message;
    node.dataset.error = isError ? "true" : "false";
  };

  function applyAndroidCheckout() {
    const page = document.querySelector(".pix-page");
    const pix = page?.querySelector(".pix-payment");
    const grid = page?.querySelector(".pix-plan-grid");
    const total = page?.querySelector(".pix-total");
    if (!page || !pix || !grid || !total) return;

    pix.hidden = true;
    const asideTitle = page.querySelector(".pix-aside-card b");
    const asideText = page.querySelector(".pix-aside-card p");
    if (asideTitle) asideTitle.textContent = "Compra pela Google Play";
    if (asideText) asideText.textContent = "Pagamento processado com segurança pela loja Google Play.";

    grid.querySelectorAll(".pix-plan").forEach((button) => {
      const plan = button.dataset.plano;
      const item = products[ids[plan]];
      const price = button.querySelector("strong");
      if (item && price) {
        price.replaceChildren(document.createTextNode(item.formattedPrice || ""));
        const small = document.createElement("small");
        small.textContent = " · compra única";
        price.appendChild(small);
      }
    });

    const totalPrice = total.querySelector(".pix-total-value strong");
    const selected = grid.querySelector(".pix-plan.selected") || grid.querySelector(".pix-plan");
    const selectedPlan = selected?.dataset.plano || "pro";
    const selectedProduct = products[ids[selectedPlan]];
    if (totalPrice && selectedProduct) totalPrice.textContent = selectedProduct.formattedPrice || "";

    let checkout = document.getElementById("cf-play-checkout");
    if (!checkout) {
      checkout = document.createElement("section");
      checkout.id = "cf-play-checkout";
      checkout.className = "pix-payment";
      const heading = document.createElement("div");
      heading.className = "pix-payment-title";
      const title = document.createElement("b");
      title.textContent = "Finalizar pela Google Play";
      heading.appendChild(title);

      const button = document.createElement("button");
      button.type = "button";
      button.id = "cf-play-buy";
      button.className = "pix-submit";
      button.textContent = "Continuar para pagamento";
      button.addEventListener("click", () => {
        if (submitting) return;
        const plan = page.querySelector(".pix-plan.selected")?.dataset.plano || "pro";
        const productId = ids[plan];
        if (!products[productId]) {
          status("Os planos ainda estão carregando. Tente novamente em instantes.", true);
          bridge.queryProducts();
          return;
        }
        bridge.purchase(productId);
      });

      const note = document.createElement("p");
      note.className = "pix-security-note";
      note.textContent = "Compra única com 30 dias de acesso. Não há renovação automática. A liberação continua dependendo da aprovação manual do administrador.";
      const feedback = document.createElement("p");
      feedback.id = "cf-play-status";
      feedback.className = "pix-security-note";
      checkout.append(heading, button, note, feedback);
      total.appendChild(checkout);
    }

    const disclaimer = page.querySelector(".pix-checkout-disclaimer");
    if (disclaimer) disclaimer.textContent =
      "Compra única de 30 dias pela Google Play. Não há renovação automática. O acesso só é liberado depois da verificação da compra e da aprovação manual do responsável.";
  }

  window.addEventListener("copiloto:play-products", (event) => {
    const list = event.detail?.products;
    if (!Array.isArray(list)) return;
    products = Object.fromEntries(list.map((item) => [item.productId, item]));
    applyAndroidCheckout();
  });

  async function sendPurchase(event) {
    const detail = event.detail || {};
    const productId = Array.isArray(detail.products) ? detail.products[0] : null;
    const purchaseToken = detail.purchaseToken;
    if (!productId || !purchaseToken) return;
    const feedback = document.getElementById("cf-play-status");
    if (feedback) feedback.textContent = "Verificando sua compra e enviando para aprovação…";
    submitting = true;
    const button = document.getElementById("cf-play-buy");
    if (button) button.disabled = true;
    try {
      const client = window.__copilotoSupabase;
      if (!client) throw new Error("Não foi possível acessar a sessão da conta. Entre novamente.");
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData?.session) throw new Error("Sua sessão expirou. Entre novamente e restaure a compra.");
      const { data, error } = await client.functions.invoke("google-play-purchase", {
        body: { productId, purchaseToken },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      status("Compra verificada e enviada. Seu acesso será liberado após a aprovação do administrador.", false);
    } catch (error) {
      status(error?.message || "Não foi possível enviar a compra. Não tente pagar novamente antes de atualizar o status.", true);
    } finally {
      submitting = false;
      if (button) button.disabled = false;
    }
  }

  window.addEventListener("copiloto:play-purchase", sendPurchase);
  window.addEventListener("copiloto:play-existing-purchase", sendPurchase);
  window.addEventListener("copiloto:play-pending", (event) => status(event.detail?.message || "Compra pendente na Google Play."));
  window.addEventListener("copiloto:play-error", (event) => status(event.detail?.message || "Erro na Google Play.", true));
  window.addEventListener("copiloto:play-cancelled", (event) => status(event.detail?.message || "Compra cancelada."));

  const observer = new MutationObserver(applyAndroidCheckout);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  bridge.queryProducts();
  applyAndroidCheckout();
})();
