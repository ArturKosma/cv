/**
 * Experience layout: lock identity column width to the brand name
 * so the portrait matches, without overflowing the grid cell.
 * Timeline stays top-locked via CSS.
 */
(function () {
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!identity || !brand) return;

  function syncBrandWidth() {
    identity.style.width = "100%";
    const cell = Math.floor(identity.getBoundingClientRect().width);
    identity.style.width = "";
    const natural = Math.ceil(brand.getBoundingClientRect().width);
    const width = Math.max(0, Math.min(natural, cell || natural));
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
