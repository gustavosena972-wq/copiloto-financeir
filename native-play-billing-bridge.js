(() => {
  "use strict";
  if (!window.NativePlayBilling || window.CopilotoPlayBilling) return;
  window.CopilotoPlayBilling = {
    queryProducts() { window.NativePlayBilling.queryProducts(); },
    purchase(productId) { window.NativePlayBilling.purchase(String(productId || "")); }
  };
})();