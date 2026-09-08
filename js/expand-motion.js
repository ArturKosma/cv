/**
 * Expand rise-in — rewritten from scratch.
 *
 * Prior blips came from racing finish handlers (old animation cleanup
 * stomping a newer open) and fill/cancel without commitStyles.
 *
 * Model: hide in beforetoggle → one WAAPI run → commitStyles → cancel.
 * A generation counter ignores stale finished callbacks.
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const FROM = { opacity: 0, transform: "translateY(0.4rem)" };
  const TO = { opacity: 1, transform: "translateY(0)" };
  const TIMING = {
    duration: 320,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "forwards",
  };

  function reset(body) {
    body.style.opacity = "";
    body.style.transform = "";
  }

  function hide(body) {
    body.style.opacity = "0";
    body.style.transform = "translateY(0.4rem)";
  }

  document.querySelectorAll(".timeline details, details[data-project]").forEach((details) => {
    const body = details.querySelector(".timeline-body, .project-body");
    if (!body) return;

    let generation = 0;

    details.addEventListener("beforetoggle", (event) => {
      if (event.newState !== "open") return;
      if (reduce.matches) return;
      hide(body);
    });

    details.addEventListener("toggle", () => {
      const mine = ++generation;
      body.getAnimations().forEach((animation) => animation.cancel());

      if (!details.open) {
        reset(body);
        return;
      }

      if (reduce.matches || typeof body.animate !== "function") {
        reset(body);
        return;
      }

      // Fallback when beforetoggle is unavailable or skipped.
      hide(body);

      const animation = body.animate([FROM, TO], TIMING);

      animation.finished
        .then(() => {
          if (mine !== generation) return;
          try {
            animation.commitStyles();
          } catch (_) {
            /* older engines */
          }
          animation.cancel();
          reset(body);
        })
        .catch(() => {
          /* superseded by a newer open/close */
        });
    });
  });
})();
