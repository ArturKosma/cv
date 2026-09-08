/**
 * Experience layout:
 * - Lock identity width to the brand name so the portrait matches
 * - Pin the timeline so its left rail lines up with the left edge of
 *   the top nav (EXPERIENCE … CONTACT), right edge with the page shell
 * - Match timeline top to the portrait top
 * - When all rows are collapsed, stretch inter-item gaps so the timeline
 *   bottom meets the portrait bottom
 */
(function () {
  const MQ = window.matchMedia("(min-width: 901px)");
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const experience = document.querySelector(".experience");
  const timeline = document.querySelector(".timeline");
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

  function clearTimelineStretch() {
    if (!timeline) return;
    timeline.querySelectorAll(":scope > .timeline-item").forEach((item) => {
      item.style.paddingBottom = "";
    });
  }

  function syncTimelineStretchToPortrait() {
    clearTimelineStretch();
    if (!MQ.matches || !portrait || !timeline) return;

    const items = [...timeline.querySelectorAll(":scope > .timeline-item")];
    if (items.length < 2) return;

    const anyOpen = [...timeline.querySelectorAll("details")].some((d) => d.open);
    if (anyOpen) return;

    // Flush cleared paddings before measuring the natural collapsed height.
    void timeline.offsetHeight;

    const portraitBox = portrait.getBoundingClientRect();
    const timelineTop = timeline.getBoundingClientRect().top;
    const lastBottom = items[items.length - 1].getBoundingClientRect().bottom;
    const extra = Math.round(portraitBox.height - (lastBottom - timelineTop));
    if (extra <= 4) return;

    const gapCount = items.length - 1;
    const bump = extra / gapCount;
    items.forEach((item, index) => {
      if (index === gapCount) return;
      const base = parseFloat(getComputedStyle(item).paddingBottom) || 0;
      item.style.paddingBottom = `${base + bump}px`;
    });
  }

  function syncAll() {
    syncBrandWidth();
    syncExperienceToNav();
    syncExperienceTopToPortrait();
    syncTimelineStretchToPortrait();
  }

  requestAnimationFrame(() => requestAnimationFrame(syncAll));
  window.addEventListener("resize", syncAll);
  MQ.addEventListener("change", syncAll);

  if (timeline) {
    let stretchTimer = 0;
    timeline.querySelectorAll("details").forEach((details) => {
      details.addEventListener("toggle", () => {
        window.clearTimeout(stretchTimer);
        if (details.open) {
          // Drop the collapsed stretch as soon as something opens.
          syncTimelineStretchToPortrait();
          return;
        }
        // Wait for ::details-content height transition to finish, then stretch.
        stretchTimer = window.setTimeout(() => {
          syncTimelineStretchToPortrait();
        }, 420);
      });
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncAll);
  }

  if (portrait && !portrait.complete) {
    portrait.addEventListener("load", syncAll, { once: true });
  }
})();
