/**
 * Accordion: opening one <details> in a group closes the others.
 * Keeps the newly opened item pinned in the viewport when a higher
 * record collapses (avoids the annoying upward jump).
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
          const delta = details.getBoundingClientRect().top - topBefore;
          if (Math.abs(delta) > 0.5) window.scrollBy(0, delta);
        };

        pin();
        requestAnimationFrame(pin);
      });
    });
  }

  bindGroup(document.querySelectorAll(".timeline details"));
  bindGroup(document.querySelectorAll("details[data-project]"));
})();
