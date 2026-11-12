/* The same continuous 3D scene serves the Android presentation and character view. */
(() => {
  "use strict";
  let opening = false;
  document.addEventListener("click", async (event) => {
    if (!event.target.closest('[data-act="explore3d"]') || opening) return;
    opening = true;
    try {
      const world = await import("./financial-world.js?v=1.0.42");
      await world.openCharacter();
    } catch (_) {
      const status = document.querySelector(".cf-tm-voice-status");
      if (status) {
        status.textContent = "O 3D não está disponível neste dispositivo.";
        status.classList.add("on");
      }
    } finally {
      opening = false;
    }
  });
  const decorate = () => {
    for (const host of document.querySelectorAll(
      ".cf-welcome-choices",
    )) {
      if (host.querySelector('[data-act="explore3d"]')) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.act = "explore3d";
      button.className = "cf-explore-3d";
      button.textContent = "Ver personagem 3D";
      host.append(button);
    }
  };
  new MutationObserver(decorate).observe(document.body, {
    childList: true,
    subtree: true,
  });
  decorate();
})();
