/**
 * Re-trigger a simple expand animation each time a <details> opens.
 * CSS animation alone only runs on first mount.
 */
(function () {
  function play(details) {
    if (!details.open) return;
    const body = details.querySelector(".timeline-body, .project-body");
    if (!body) return;
    body.classList.remove("is-entering");
    // Force reflow so the next animation can restart.
    void body.offsetWidth;
    body.classList.add("is-entering");
  }

  document.querySelectorAll(".timeline details, details[data-project]").forEach((details) => {
    details.addEventListener("toggle", () => play(details));
    if (details.open) play(details);
  });
})();
