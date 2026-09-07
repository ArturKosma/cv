/**
 * Accordion: opening one <details> in a group closes the others.
 */
(function () {
  function bindGroup(nodes) {
    const items = Array.prototype.slice.call(nodes);
    if (items.length < 2) return;

    items.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (!details.open) return;
        items.forEach((other) => {
          if (other !== details && other.open) other.open = false;
        });
      });
    });
  }

  bindGroup(document.querySelectorAll(".timeline details"));
  bindGroup(document.querySelectorAll("details[data-project]"));
})();
