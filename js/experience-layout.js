/**
 * Experience layout helpers:
 * - Identity column width locks to "Artur Kosma"
 * - Portrait fills that width and stays right-aligned
 * - Timeline stays top-locked (no vertical centering)
 */
(function () {
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const timeline = document.querySelector(".timeline");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!identity || !brand) return;

  if (timeline) {
    timeline.style.marginTop = "";
    timeline.style.minHeight = "";
  }

  function syncBrandWidth() {
    identity.style.width = "";
    brand.style.width = "";
    const width = Math.ceil(brand.getBoundingClientRect().width);
    if (width > 0) identity.style.width = `${width}px`;
  }

  requestAnimationFrame(() => requestAnimationFrame(syncBrandWidth));
  window.addEventListener("resize", syncBrandWidth);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncBrandWidth);
  }

  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", syncBrandWidth, { once: true });
  }
})();
