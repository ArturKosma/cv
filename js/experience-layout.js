/**
 * Experience layout helpers:
 * - Portrait + lede width lock to the "Artur Kosma" brand width
 * - Collapsed timeline stretches to match identity (name + lede + portrait) height
 */
(function () {
  const layout = document.querySelector(".home-layout");
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const timeline = document.querySelector(".timeline");
  const experience = document.querySelector(".experience");
  if (!layout || !identity || !brand || !timeline || !experience) return;

  const desktop = window.matchMedia("(min-width: 901px)");

  function syncBrandWidth() {
    identity.style.width = "";
    const width = Math.ceil(brand.getBoundingClientRect().width);
    if (width > 0) identity.style.width = `${width}px`;
  }

  function syncTimelineHeight() {
    if (!desktop.matches) {
      timeline.style.minHeight = "";
      layout.classList.remove("timeline-spaced");
      return;
    }

    const open = timeline.querySelector("details[open]");
    if (open) {
      // Keep the collapsed match as a floor so the spine does not shrink on expand.
      layout.classList.remove("timeline-spaced");
      return;
    }

    timeline.style.minHeight = "";
    layout.classList.add("timeline-spaced");
    const identityHeight = identity.getBoundingClientRect().height;
    if (identityHeight > 0) timeline.style.minHeight = `${Math.round(identityHeight)}px`;
  }

  function sync() {
    syncBrandWidth();
    requestAnimationFrame(syncTimelineHeight);
  }

  function onToggle() {
    requestAnimationFrame(syncTimelineHeight);
  }

  timeline.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", onToggle);
  });

  requestAnimationFrame(() => requestAnimationFrame(sync));
  desktop.addEventListener("change", sync);
  window.addEventListener("resize", sync);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sync);
  }

  const portrait = identity.querySelector("img.portrait-frame");
  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", sync, { once: true });
  }
})();
