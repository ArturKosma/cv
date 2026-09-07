/**
 * Pin the identity column to the vertical center of collapsed timeline records.
 * Measured once (and on resize) with all rows closed so expand does not shift it.
 */
(function () {
  const layout = document.querySelector(".home-layout");
  const identity = document.querySelector(".identity");
  const timeline = document.querySelector(".timeline");
  if (!layout || !identity || !timeline) return;

  const desktop = window.matchMedia("(min-width: 901px)");

  function clearLock() {
    identity.style.marginTop = "";
    identity.style.alignSelf = "";
  }

  function lockToCollapsedRecords() {
    if (!desktop.matches) {
      clearLock();
      return;
    }

    const details = Array.prototype.slice.call(timeline.querySelectorAll("details"));
    const wasOpen = details.map((d) => d.open);
    details.forEach((d) => {
      d.open = false;
    });

    const summaries = Array.prototype.slice.call(timeline.querySelectorAll(".timeline-summary"));
    if (!summaries.length) {
      wasOpen.forEach((open, i) => {
        details[i].open = open;
      });
      return;
    }

    identity.style.alignSelf = "start";
    identity.style.marginTop = "0px";

    const top = summaries[0].getBoundingClientRect().top;
    const bottom = summaries[summaries.length - 1].getBoundingClientRect().bottom;
    const mid = (top + bottom) / 2;
    const natural = identity.getBoundingClientRect();
    const desiredTop = mid - natural.height / 2;
    identity.style.marginTop = `${Math.max(0, desiredTop - natural.top)}px`;

    wasOpen.forEach((open, i) => {
      details[i].open = open;
    });
  }

  requestAnimationFrame(() => requestAnimationFrame(lockToCollapsedRecords));
  desktop.addEventListener("change", lockToCollapsedRecords);
  window.addEventListener("resize", lockToCollapsedRecords);
})();
