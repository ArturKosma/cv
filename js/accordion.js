/**
 * Accordion: opening one <details> in a group closes the others.
 * Pins the opened item in the viewport when a higher record collapses.
 */
(function () {
  function bindGroup(nodes) {
    const items = Array.prototype.slice.call(nodes);
    if (items.length < 2) return;

    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;

        const toClose = items.filter((other) => other !== details && other.open);
        if (!toClose.length) return;

        const topBefore = details.getBoundingClientRect().top;
        toClose.forEach((other) => {
          other.open = false;
        });

        const pin = () => {
          const top = details.getBoundingClientRect().top;
          const delta = top - topBefore;
          if (Math.abs(delta) > 0.5) {
            window.scrollBy({ top: delta, left: 0, behavior: "instant" });
          }

          // If scroll hit the top clamp, park the opened item near where it was
          // (or just under the header) so it does not vanish upward.
          const drifted = details.getBoundingClientRect().top - topBefore;
          if (Math.abs(drifted) > 24) {
            const desired = Math.max(96, Math.min(topBefore, 160));
            const abs = details.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({ top: Math.max(0, abs - desired), behavior: "instant" });
          }
        };

        pin();
        requestAnimationFrame(pin);
      });
    });
  }

  bindGroup(document.querySelectorAll(".timeline details"));
  bindGroup(document.querySelectorAll("details[data-project]"));
})();
