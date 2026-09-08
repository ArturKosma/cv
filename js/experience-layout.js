/**
 * Experience layout:
 * - Lock identity width to the brand name so the portrait matches
 * - Pin the timeline so its left rail lines up with the left edge of
 *   the top nav (EXPERIENCE … CONTACT), right edge with the page shell
 * - Match timeline top to the portrait top (identity hello starts with face)
 */
(function () {
  const MQ = window.matchMedia("(min-width: 901px)");
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const experience = document.querySelector(".experience");
  const nav = document.querySelector(".nav-actions");
  const page = document.querySelector(".page");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!identity || !brand || !experience || !nav || !page) return;

  function syncBrandWidth() {
    identity.style.width = "";
    identity.style.maxWidth = "";
    const natural = Math.ceil(brand.getBoundingClientRect().width);
    identity.style.width = "100%";
    const cell = Math.floor(identity.getBoundingClientRect().width);
    identity.style.width = "";
    const width = Math.max(0, Math.min(natural, cell || natural));
    if (width > 0) {
      identity.style.width = `${width}px`;
      identity.style.maxWidth = "100%";
    }
  }

  function syncExperienceToNav() {
    experience.style.width = "";
    experience.style.maxWidth = "";
    experience.style.marginLeft = "";

    if (!MQ.matches) return;

    const pageBox = page.getBoundingClientRect();
    const navBox = nav.getBoundingClientRect();
    const identityBox = identity.getBoundingClientRect();
    const width = Math.max(0, Math.round(pageBox.right - navBox.left));
    if (width <= 0) return;

    experience.style.width = `${width}px`;
    experience.style.maxWidth = "100%";
    experience.style.marginLeft = "auto";

    // If identity would collide, fall back to fluid remaining space.
    const nextLeft = pageBox.right - width;
    if (nextLeft < identityBox.right + 48) {
      experience.style.width = "";
      experience.style.marginLeft = "";
    }
  }

  function syncExperienceTopToPortrait() {
    experience.style.marginTop = "";
    if (!MQ.matches || !portrait) return;

    const identityBox = identity.getBoundingClientRect();
    const portraitBox = portrait.getBoundingClientRect();
    const offset = Math.max(0, Math.round(portraitBox.top - identityBox.top));
    experience.style.marginTop = `${offset}px`;
  }

  function syncAll() {
    syncBrandWidth();
    syncExperienceToNav();
    syncExperienceTopToPortrait();
  }

  requestAnimationFrame(() => requestAnimationFrame(syncAll));
  window.addEventListener("resize", syncAll);
  MQ.addEventListener("change", syncAll);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncAll);
  }

  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", syncAll, { once: true });
  }
})();
