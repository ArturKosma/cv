/**
 * Experience layout:
 * - Lock identity width to the brand name so the portrait matches
 * - Pin the timeline so its left rail lines up with the left edge of
 *   the top-right nav chrome (ABOUT … RESUME rail span), right edge with the page shell
 * - Match timeline top to the portrait top
 * - When all rows are collapsed, add static inter-item padding so the
 *   last row meets the portrait bottom. Those gaps stay frozen while
 *   any row is open/closing — expand only grows the opened body.
 *
 * Cold-load FOUC: `.experience` stays visibility:hidden on desktop until
 * the first sync (and fonts, briefly) so the rail never flashes under the nav.
 */
(function () {
  const MQ = window.matchMedia("(min-width: 901px)");
  const CLOSE_MS = 450;
  const identity = document.querySelector(".identity");
  const brand = document.querySelector(".hero-brand");
  const experience = document.querySelector(".experience");
  const timeline = document.querySelector(".timeline");
  const nav = document.querySelector(".nav-actions");
  const page = document.querySelector(".page");
  const portrait = identity?.querySelector("img.portrait-frame");
  if (!identity || !brand || !experience || !nav || !page) return;

  document.documentElement.classList.add("has-layout-js");

  /** True while a close height transition is still settling. */
  let closeSettling = false;
  let stretchTimer = 0;
  let basePadPx = null;
  let ready = false;

  function timelineItems() {
    return timeline ? [...timeline.querySelectorAll(":scope > .timeline-item")] : [];
  }

  function anyDetailsOpen() {
    return Boolean(timeline && [...timeline.querySelectorAll("details")].some((d) => d.open));
  }

  function markReady() {
    if (ready) return;
    ready = true;
    page.classList.add("is-layout-ready");
  }

  function readBasePadPx() {
    if (basePadPx != null) return basePadPx;
    const items = timelineItems();
    if (!items.length) return 0;
    const probe = items[0];
    const prev = probe.style.paddingBottom;
    probe.style.paddingBottom = "";
    void probe.offsetHeight;
    basePadPx = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    probe.style.paddingBottom = prev;
    return basePadPx;
  }

  function clearTimelineStretch() {
    if (!timeline) return;
    timelineItems().forEach((item) => {
      item.style.paddingBottom = "";
    });
  }

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

    // Employer stamp sits above the rail — pull experience up so the
    // timeline (not the stamp) shares the portrait's top edge.
    const employer = experience.querySelector(".timeline-employer");
    let employerBlock = 0;
    if (employer) {
      const style = getComputedStyle(employer);
      employerBlock = Math.round(
        employer.getBoundingClientRect().height +
          (parseFloat(style.marginTop) || 0) +
          (parseFloat(style.marginBottom) || 0)
      );
    }

    experience.style.marginTop = `${Math.max(0, offset - employerBlock)}px`;
  }

  function syncTimelineStretchToPortrait() {
    if (!timeline || !portrait) return;

    if (!MQ.matches) {
      clearTimelineStretch();
      return;
    }

    // Keep collapsed fit gaps frozen during open/close — only the body height moves.
    if (anyDetailsOpen() || closeSettling) return;

    const items = timelineItems();
    if (items.length < 2) return;

    const base = readBasePadPx();
    let contentSum = 0;
    items.forEach((item) => {
      const padBottom = parseFloat(getComputedStyle(item).paddingBottom) || 0;
      contentSum += item.getBoundingClientRect().height - padBottom;
    });

    const natural = contentSum + (items.length - 1) * base;
    // Match timeline bottom to portrait bottom (top already pinned).
    const timelineTop = timeline.getBoundingClientRect().top;
    const target = Math.max(
      0,
      Math.round(portrait.getBoundingClientRect().bottom - timelineTop)
    );
    const extra = Math.round(target - natural);
    const gapCount = items.length - 1;

    if (extra <= 4) {
      items.forEach((item, index) => {
        item.style.paddingBottom = index === gapCount ? "0px" : `${base}px`;
      });
      return;
    }

    const bump = extra / gapCount;
    items.forEach((item, index) => {
      item.style.paddingBottom = index === gapCount ? "0px" : `${base + bump}px`;
    });
  }

  function syncAll() {
    syncBrandWidth();
    syncExperienceToNav();
    syncExperienceTopToPortrait();
    syncTimelineStretchToPortrait();
  }

  async function boot() {
    syncAll();

    // Fonts swap can change brand/lede height and shift the portrait.
    // Stay hidden until fonts settle (capped) so reveal is already correct.
    if (document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 250)),
      ]);
      syncAll();
    }

    if (portrait && !portrait.complete) {
      await Promise.race([
        new Promise((resolve) => portrait.addEventListener("load", resolve, { once: true })),
        new Promise((resolve) => window.setTimeout(resolve, 250)),
      ]);
      syncAll();
    }

    markReady();
  }

  boot();
  // Failsafe if boot hangs — never leave the timeline invisible.
  window.setTimeout(markReady, 500);

  window.addEventListener("resize", syncAll);
  MQ.addEventListener("change", syncAll);

  if (timeline) {
    timeline.querySelectorAll("details").forEach((details) => {
      details.addEventListener("toggle", () => {
        window.clearTimeout(stretchTimer);
        if (details.open) {
          closeSettling = false;
          return;
        }
        if (anyDetailsOpen()) return;

        // Defer remeasure until the close height transition finishes.
        closeSettling = true;
        stretchTimer = window.setTimeout(() => {
          closeSettling = false;
          if (!anyDetailsOpen()) syncTimelineStretchToPortrait();
        }, CLOSE_MS);
      });
    });
  }
})();
