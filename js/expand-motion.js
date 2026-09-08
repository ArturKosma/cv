/**
 * One clean expand motion per open — Web Animations API.
 * Hide immediately before the first paint so content does not flash opaque
 * then restart from opacity 0 (the old double-blip).
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function play(details) {
    if (!details.open) return;
    const body = details.querySelector(".timeline-body, .project-body");
    if (!body) return;
    if (reduce.matches || typeof body.animate !== "function") return;

    body.getAnimations().forEach((a) => a.cancel());

    body.style.opacity = "0";
    body.style.transform = "translateY(0.35rem)";

    requestAnimationFrame(() => {
      if (!details.open) {
        body.style.opacity = "";
        body.style.transform = "";
        return;
      }

      const anim = body.animate(
        [
          { opacity: 0, transform: "translateY(0.35rem)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 280, easing: "ease", fill: "forwards" }
      );

      const clearInline = () => {
        body.style.opacity = "";
        body.style.transform = "";
        anim.cancel();
      };

      anim.finished.then(clearInline).catch(clearInline);
    });
  }

  document.querySelectorAll(".timeline details, details[data-project]").forEach((details) => {
    details.addEventListener("toggle", () => play(details));
  });
})();
