(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CFTamanduaSession = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function createSessionGate(onReset = () => {}) {
    let identity = null,
      epoch = 0;
    function update(state) {
      const user = state?.user?.id,
        family = state?.fam?.id;
      const next = user && family ? JSON.stringify([user, family]) : null;
      if (next !== identity) {
        identity = next;
        epoch++;
        onReset();
      }
      return identity !== null;
    }
    function ticket(state) {
      return update(state) ? Object.freeze({ identity, epoch }) : null;
    }
    function accepts(candidate, state) {
      update(state);
      return (
        !!candidate &&
        identity !== null &&
        candidate.identity === identity &&
        candidate.epoch === epoch
      );
    }
    return { update, ticket, accepts };
  }
  function onboardingKey(state) {
    const user = state?.user?.id, family = state?.fam?.id;
    return user && family ? 'cf_android_welcome_v2_' + JSON.stringify([user, family]) : null;
  }
  function shouldIntroduce(state, hasWorkspace, wasSeen) {
    return !!onboardingKey(state) && hasWorkspace && !wasSeen;
  }
  return { createSessionGate, onboardingKey, shouldIntroduce };
});
