/**
 * Experience layout helpers:
 * - Identity column width locks to "Artur Kosma"
 * - Portrait is slightly narrower, left-aligned with the name
 * - Collapsed timeline sits in the vertical middle of name→portrait
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
    layout.classList.remove("timeline-spaced");
  }

  function syncBrandWidth() {
    identity.style.width = "";
    const width = Math.ceil(brand.getBoundingClientRect().width);
    if (width > 0) identity.style.width = `${width}px`;
  }

  function syncTimelineCenter() {
    if (!desktop.matches) {
      clearTimelineOffset();
      return;
    }

    clearTimelineOffset();

    // When a record is open, keep natural flow from the top.
    if (timeline.querySelector("details[open]")) return;

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

  timeline.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => requestAnimationFrame(syncTimelineCenter));
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
