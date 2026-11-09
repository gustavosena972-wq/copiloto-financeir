/* Whole-screen depth follows navigation; financial inputs stay still while editing. */
(() => {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const key = "cf_android_screen_motion";
  let enabled = true,
    pending = false,
    active = false;
  try {
    enabled = localStorage.getItem(key) !== "off";
  } catch (_) {}
  function sync() {
    document.documentElement.dataset.screenMotion =
      enabled && !reduced.matches ? "on" : "off";
  }
  sync();
  reduced.addEventListener("change", sync);
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      if (button.dataset.act === "view") pending = true;
      if (button.dataset.act === "screenmotion") {
        enabled = !enabled;
        try {
          localStorage.setItem(key, enabled ? "on" : "off");
        } catch (_) {}
        sync();
        button.textContent = enabled
          ? "Movimento das telas: ativado"
          : "Movimento das telas: desativado";
        button.setAttribute("aria-pressed", String(enabled));
      }
    },
    true,
  );
  const render = window.render;
  if (typeof render === "function")
    window.render = function (...args) {
      const animate =
        pending &&
        !active &&
        enabled &&
        !reduced.matches &&
        document.visibilityState === "visible" &&
        typeof document.startViewTransition === "function";
      pending = false;
      if (!animate) return render.apply(this, args);
      active = true;
      const transition = document.startViewTransition(() =>
        render.apply(this, args),
      );
      transition.finished
        .catch(() => {})
        .finally(() => {
          active = false;
        });
    };
  const observer = new MutationObserver(() => {
    const panel = document.querySelector(".mobile-more-panel");
    if (!panel || panel.querySelector('[data-act="screenmotion"]')) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.act = "screenmotion";
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled
      ? "Movimento das telas: ativado"
      : "Movimento das telas: desativado";
    panel.append(button);
  });
  observer.observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
  });
})();
