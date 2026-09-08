/**
 * Accordion: opening one <details> closes the others.
 * The clicked item never changes viewport Y.
 * Prefer scroll; if scroll cannot compensate, pad the page top
 * (never invent a gap between list rows).
 */
(function () {
  const PAD_ATTR = "data-acc-page-pad";

  function clearPagePad() {
    const pad = document.querySelector(`[${PAD_ATTR}]`);
    if (pad) pad.remove();
  }

  function ensurePagePad() {
    let pad = document.querySelector(`[${PAD_ATTR}]`);
    if (pad) return pad;
    const main = document.querySelector("main");
    if (!main) return null;
    pad = document.createElement("div");
    pad.setAttribute(PAD_ATTR, "");
    pad.setAttribute("aria-hidden", "true");
    pad.style.height = "0px";
    pad.style.pointerEvents = "none";
    main.prepend(pad);
    return pad;
  }

  function pinTo(details, anchorTop) {
    const delta = details.getBoundingClientRect().top - anchorTop;
    if (Math.abs(delta) > 0.5) {
      window.scrollBy({ top: delta, left: 0, behavior: "instant" });
    }

    const drift = details.getBoundingClientRect().top - anchorTop;
    if (Math.abs(drift) <= 1) return;

    // Item drifted up and scrollY cannot go negative — shift the whole
    // page content down so rows stay contiguous.
    if (drift >= 0) return;
    const pad = ensurePagePad();
    if (!pad) return;
    const current = parseFloat(pad.style.height || "0") || 0;
    pad.style.height = `${current - drift}px`;
  }

  function bindGroup(nodes) {
    const items = Array.prototype.slice.call(nodes);
    if (items.length < 2) return;

    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;

        const anchorTop = details.getBoundingClientRect().top;

        clearPagePad();

        items.forEach((other) => {
          if (other !== details && other.open) other.open = false;
        });

        pinTo(details, anchorTop);
        requestAnimationFrame(() => pinTo(details, anchorTop));
      });
    });
  }

  bindGroup(document.querySelectorAll(".timeline details"));
  bindGroup(document.querySelectorAll("details[data-project]"));
})();
