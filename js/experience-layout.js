/**
 * Experience layout helpers:
 * - Identity column width locks to "Artur Kosma"
 * - Portrait fills that width and stays right-aligned
 * - Collapsed timeline is vertically centered on name→portrait
 * - Expanding a record does not reflow that offset (only content below moves)
 */
(function () {
  const layout = document.querySelector(".home-layout");
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const timeline = document.querySelector(".timeline");
  const experience = document.querySelector(".experience");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!layout || !identity || !brand || !timeline || !experience) return;

  const desktop = window.matchMedia("(min-width: 901px)");

  function clearTimelineOffset() {
    timeline.style.marginTop = "";
    timeline.style.minHeight = "";
  }

  function syncBrandWidth() {
    identity.style.width = "";
    brand.style.width = "";
    const width = Math.ceil(brand.getBoundingClientRect().width);
    if (width > 0) identity.style.width = `${width}px`;
  }

  function syncTimelineCenter() {
    if (!desktop.matches) {
      clearTimelineOffset();
      return;
    }

    // Keep the current offset while expanded so only rows below shift.
    if (timeline.querySelector("details[open]")) return;

    clearTimelineOffset();

    const brandBox = brand.getBoundingClientRect();
    const portraitBox = portrait
      ? portrait.getBoundingClientRect()
      : identity.getBoundingClientRect();
    const mid = (brandBox.top + portraitBox.bottom) / 2;

    const experienceTop = experience.getBoundingClientRect().top;
    const timelineHeight = timeline.getBoundingClientRect().height;
    const desiredTop = mid - timelineHeight / 2;
    timeline.style.marginTop = `${Math.max(0, desiredTop - experienceTop)}px`;
  }

  function sync() {
    syncBrandWidth();
    requestAnimationFrame(syncTimelineCenter);
  }

  // Recenter only after everything is collapsed again.
  timeline.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (timeline.querySelector("details[open]")) return;
      requestAnimationFrame(syncTimelineCenter);
    });
  });

  requestAnimationFrame(() => requestAnimationFrame(sync));
  desktop.addEventListener("change", sync);
  window.addEventListener("resize", sync);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sync);
  }

  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", sync, { once: true });
  }
})();
