/**
 * Experience layout: lock identity block width to the brand name
 * so the portrait matches. Column stays right-aligned in the grid.
 */
(function () {
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!identity || !brand) return;

  function syncBrandWidth() {
    identity.style.width = "";
    identity.style.maxWidth = "";
    const natural = Math.ceil(brand.getBoundingClientRect().width);
    // Cap to the grid cell so we never overflow the page shell.
    identity.style.width = "100%";
    const cell = Math.floor(identity.getBoundingClientRect().width);
    identity.style.width = "";
    const width = Math.max(0, Math.min(natural, cell || natural));
    if (width > 0) {
      identity.style.width = `${width}px`;
      identity.style.maxWidth = "100%";
    }
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
