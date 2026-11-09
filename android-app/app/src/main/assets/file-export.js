(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CFFileExport = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MAX = 8 * 1024 * 1024,
    pending = new Map();
  let sequence = 0;
  function safeCell(value) {
    const text = String(value ?? "");
    return /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
  }
  function csv(rows) {
    return (
      "\ufeff" +
      rows
        .map((row) =>
          row
            .map((value) => '"' + safeCell(value).replace(/"/g, '""') + '"')
            .join(";"),
        )
        .join("\r\n")
    );
  }
  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192)
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }
  function save(data, mime, filename) {
    if (typeof data !== "string" || data.length > Math.ceil(MAX / 3) * 4)
      return Promise.reject(
        new Error(
          "O arquivo excede o limite de 8 MB. Exporte um período menor.",
        ),
      );
    if (globalThis.CopilotoFiles?.postMessage) {
      const id = "export_" + Date.now() + "_" + ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("A exportação demorou demais. Tente novamente."));
        }, 300000);
        pending.set(id, { resolve, reject, timer });
        try {
          globalThis.CopilotoFiles.postMessage(
            JSON.stringify({ id, action: "export", mime, filename, data }),
          );
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
        }
      });
    }
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
      url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return Promise.resolve("download_started");
  }
  if (typeof window !== "undefined")
    window.addEventListener("copiloto:file-export", (event) => {
      const detail = event.detail,
        request = pending.get(detail?.id);
      if (!request) return;
      pending.delete(detail.id);
      clearTimeout(request.timer);
      if (detail.status === "saved" || detail.status === "cancelled")
        request.resolve(detail.status);
      else
        request.reject(
          new Error(
            detail.status === "busy"
              ? "Conclua a outra exportação primeiro."
              : "Não foi possível salvar o arquivo. Tente novamente.",
          ),
        );
    });
  return { safeCell, csv, encode, save };
});
