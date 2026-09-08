/**
 * One clean expand motion per open — Web Animations API.
 * Uses `beforetoggle` so opacity is 0 before the open paint (no double-blip).
 */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function clearInline(body) {
    body.style.opacity = "";
    body.style.transform = "";
  }

  function prepareOpen(body) {
    body.getAnimations().forEach((a) => a.cancel());
    body.style.opacity = "0";
    body.style.transform = "translateY(0.35rem)";
  }

  function playOpen(details, body) {
    if (reduce.matches || typeof body.animate !== "function") {
      clearInline(body);
      return;
    }

    const anim = body.animate(
      [
        { opacity: 0, transform: "translateY(0.35rem)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 280, easing: "ease", fill: "forwards" }
    );

    const done = () => {
      clearInline(body);
      anim.cancel();
    };
    anim.finished.then(done).catch(done);
  }

  document.querySelectorAll(".timeline details, details[data-project]").forEach((details) => {
    const body = details.querySelector(".timeline-body, .project-body");
    if (!body) return;

    // Preferred: hide before the open frame paints.
    details.addEventListener("beforetoggle", (event) => {
      if (event.newState !== "open") return;
      if (reduce.matches) return;
      prepareOpen(body);
    });

    details.addEventListener("toggle", () => {
      if (!details.open) {
        clearInline(body);
        return;
      }
      playOpen(details, body);
    });
  });
})();
