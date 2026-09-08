/**
 * Experience layout:
 * - Lock identity width to the brand name so the portrait matches
 * - Pin the timeline so its left rail lines up with the left edge of
 *   the top nav (EXPERIENCE … CONTACT), right edge with the page shell
 * - Match timeline top to the portrait top
 * - When all rows are collapsed, add static inter-item padding so the
 *   timeline bottom meets the portrait bottom (not live flex spacing —
 *   that fights the expand height animation)
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

  /** True while a close height transition is still settling. */
  let closeSettling = false;
  let stretchTimer = 0;
  let basePadPx = null;

  function timelineItems() {
    return timeline ? [...timeline.querySelectorAll(":scope > .timeline-item")] : [];
  }

  function anyDetailsOpen() {
    return Boolean(timeline && [...timeline.querySelectorAll("details")].some((d) => d.open));
  }

  function readBasePadPx() {
    if (basePadPx != null) return basePadPx;
    const items = timelineItems();
    if (!items.length) return 0;
    const probe = items[0];
    const prev = probe.style.paddingBottom;
    const prevTransition = probe.style.transition;
    probe.style.transition = "none";
    probe.style.paddingBottom = "";
    void probe.offsetHeight;
    basePadPx = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    probe.style.paddingBottom = prev;
    probe.style.transition = prevTransition;
    return basePadPx;
  }

  function setItemPads(values, { instant = false } = {}) {
    const items = timelineItems();
    items.forEach((item, index) => {
      if (instant) {
        const prev = item.style.transition;
        item.style.transition = "none";
        item.style.paddingBottom = values[index];
        void item.offsetHeight;
        item.style.transition = prev;
      } else {
        item.style.paddingBottom = values[index];
      }
    });
  }

  function naturalPadValues() {
    const items = timelineItems();
    const base = readBasePadPx();
    return items.map((_, index) => (index === items.length - 1 ? "0px" : `${base}px`));
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
    experience.style.marginTop = `${offset}px`;
  }

  /** Release portrait-fit padding back to the stylesheet baseline. */
  function releaseTimelineStretch({ instant = false } = {}) {
    if (!timeline) return;
    setItemPads(naturalPadValues(), { instant });
  }

  function syncTimelineStretchToPortrait({ instant = true } = {}) {
    if (!timeline || !portrait) return;

    if (!MQ.matches || anyDetailsOpen() || closeSettling) {
      releaseTimelineStretch({ instant });
      return;
    }

    const items = timelineItems();
    if (items.length < 2) return;

    const base = readBasePadPx();
    // Measure natural collapsed height (baseline pads, no stretch).
    setItemPads(
      items.map((_, index) => (index === items.length - 1 ? "0px" : `${base}px`)),
      { instant: true }
    );

    const portraitBox = portrait.getBoundingClientRect();
    const timelineTop = timeline.getBoundingClientRect().top;
    const lastBottom = items[items.length - 1].getBoundingClientRect().bottom;
    const extra = Math.round(portraitBox.height - (lastBottom - timelineTop));
    if (extra <= 4) return;

    const gapCount = items.length - 1;
    const bump = extra / gapCount;
    setItemPads(
      items.map((_, index) =>
        index === gapCount ? "0px" : `${base + bump}px`
      ),
      { instant }
    );
  }

  function syncAll() {
    syncBrandWidth();
    syncExperienceToNav();
    syncExperienceTopToPortrait();
    syncTimelineStretchToPortrait({ instant: true });
  }

  /** Drop fit padding before open so expand doesn't fight redistributed gaps. */
  function prepareOpen() {
    window.clearTimeout(stretchTimer);
    closeSettling = false;
    releaseTimelineStretch({ instant: false });
  }

  requestAnimationFrame(() => requestAnimationFrame(syncAll));
  window.addEventListener("resize", syncAll);
  MQ.addEventListener("change", syncAll);

  if (timeline) {
    timeline.querySelectorAll("details").forEach((details) => {
      const summary = details.querySelector("summary");
      // Release stretch before the open toggle so the first expand frame is clean.
      if (summary) {
        summary.addEventListener("pointerdown", () => {
          if (!details.open) prepareOpen();
        });
        summary.addEventListener("keydown", (event) => {
          if (details.open) return;
          if (event.key === "Enter" || event.key === " ") prepareOpen();
        });
      }

      details.addEventListener("toggle", () => {
        window.clearTimeout(stretchTimer);
        if (details.open) {
          closeSettling = false;
          releaseTimelineStretch({ instant: false });
          return;
        }
        // Keep stretch off until ::details-content finish closing.
        closeSettling = true;
        releaseTimelineStretch({ instant: false });
        stretchTimer = window.setTimeout(() => {
          closeSettling = false;
          if (!anyDetailsOpen()) {
            syncTimelineStretchToPortrait({ instant: false });
          }
        }, CLOSE_MS);
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
