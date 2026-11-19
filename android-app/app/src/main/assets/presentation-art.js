/* Original finance geometry and wordmark motion; never reads household data. */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const scene =
    '<div class="cf-finance-orbit" role="img" aria-label="Ilustração de planejamento financeiro, sem valores reais"><div class="cf-orbit-shadow"></div><div class="cf-finance-disc"><i></i></div><div class="cf-orbit-card cf-orbit-in"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6"/></svg><span>Entradas</span></div><div class="cf-orbit-card cf-orbit-out"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5m-6 6 6-6 6 6"/></svg><span>Saídas</span></div><div class="cf-orbit-graph"><span>Um plano. Mais clareza.</span><svg viewBox="0 0 280 100" aria-hidden="true"><defs><linearGradient id="cf-line-color" x1="0" x2="1"><stop stop-color="#60c9f4"/><stop offset=".55" stop-color="#b8a4ff"/><stop offset="1" stop-color="#ffbf72"/></linearGradient></defs><path d="M8 82 58 64 104 71 153 39 201 45 270 12" fill="none" stroke="url(#cf-line-color)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 97H272" stroke="#ffffff35" fill="none"/></svg><small>Organize · acompanhe · decida</small></div></div>';
  let current = null,
    route = "";
  function enhance() {
    const page = document.querySelector(".landing-page");
    if (!page) {
      current = null;
      route = "";
      return;
    }
    const hero = page.querySelector(".landing-intro");
    if (hero && !page.querySelector(".cf-finance-orbit")) {
      const heading = hero.querySelector("h1");
      if (heading && !heading.dataset.brandReveal) {
        const benefit = heading.textContent;
        heading.dataset.brandReveal = "1";
        heading.replaceChildren();
        const brand = document.createElement("span");
        brand.className = "cf-brand-reveal";
        brand.innerHTML = "<span>Copiloto</span><span>Financeiro</span>";
        const line = document.createElement("span");
        line.className = "cf-brand-benefit";
        line.textContent = benefit;
        heading.append(brand, line);
      }
      hero.insertAdjacentHTML("afterend", scene);
    }
    if (current !== page || route !== page.dataset.screen) {
      current = page;
      route = page.dataset.screen;
      if (!reduced.matches) {
        const target =
          route === "inicio"
            ? hero
            : page.querySelector(
                route === "planos"
                  ? ".landing-plans-section"
                  : route === "acesso"
                    ? ".landing-login-section"
                    : ".landing-benefits",
              );
        target?.animate(
          [
            { opacity: 0.5, transform: "translateY(18px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 480, easing: "cubic-bezier(.16,1,.3,1)" },
        );
        if (route === "inicio")
          page
            .querySelectorAll(".cf-brand-reveal>span")
            .forEach((word, index) =>
              word.animate(
                [
                  {
                    opacity: 0.05,
                    transform: "translateY(28px) rotateX(-28deg)",
                  },
                  { opacity: 1, transform: "translateY(0) rotateX(0)" },
                ],
                {
                  duration: 850,
                  delay: index * 130,
                  easing: "cubic-bezier(.16,1,.3,1)",
                  fill: "backwards",
                },
              ),
            );
      }
    }
  }
  new MutationObserver(enhance).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-screen"],
  });
  enhance();
})();
