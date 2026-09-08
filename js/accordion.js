/**
 * Accordion: opening one <details> closes the others.
 * The clicked item never changes viewport Y.
 */
(function () {
  function hostOf(details) {
    return details.closest("li") || details;
  }

  function clearFreeze(host) {
    if (!host.hasAttribute("data-acc-freeze")) return;
    host.style.marginTop = "";
    host.removeAttribute("data-acc-freeze");
  }

  function clearFreezes(items) {
    items.forEach((details) => clearFreeze(hostOf(details)));
  }

  function pinTo(details, anchorTop) {
    const delta = details.getBoundingClientRect().top - anchorTop;
    if (Math.abs(delta) > 0.5) {
      window.scrollBy({ top: delta, left: 0, behavior: "instant" });
    }

    const drift = details.getBoundingClientRect().top - anchorTop;
    if (Math.abs(drift) <= 1) return;

    // Scroll cannot fully compensate (common at scrollY ≈ 0 when content
    // above collapses). Freeze the row with margin so it stays put.
    const host = hostOf(details);
    const current = parseFloat(host.style.marginTop || "0") || 0;
    host.style.marginTop = `${current - drift}px`;
    host.setAttribute("data-acc-freeze", "1");
  }

  function bindGroup(nodes) {
    const items = Array.prototype.slice.call(nodes);
    if (items.length < 2) return;

    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) {
          clearFreeze(hostOf(details));
          return;
        }

        // Lock the pre-toggle viewport Y before any layout mutations.
        const anchorTop = details.getBoundingClientRect().top;

        clearFreezes(items);

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
