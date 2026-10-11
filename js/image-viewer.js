/** Native image dialog with deferred loading, zoom, and focus/scroll return. */
(function () {
  document.querySelectorAll("dialog[data-image-viewer-dialog]").forEach((dialog) => {
    const image = dialog.querySelector("[data-image-viewer-image]");
    const crop = dialog.querySelector("[data-image-viewer-crop]");
    const viewport = dialog.querySelector("[data-image-viewer-viewport]");
    const output = dialog.querySelector("[data-image-viewer-scale]");
    const naturalWidth = Number(crop.dataset.width);
    let scale = 1;
    let returnState;

    function restorePage() {
      if (!returnState) return;
      const state = returnState;
      returnState = undefined;
      document.documentElement.style.overflow = state.overflow;
      state.trigger.focus({ preventScroll: true });
      window.scrollTo({ left: state.x, top: state.y, behavior: "instant" });
    }

    function closeViewer() {
      dialog.close();
      restorePage();
    }

    function setScale(nextScale) {
      const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / crop.clientWidth;
      const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / crop.clientHeight;
      const minimumScale = Math.min(1, viewport.clientWidth / naturalWidth);
      scale = Math.min(3, Math.max(minimumScale, nextScale));
      crop.style.width = `${naturalWidth * scale}px`;
      viewport.scrollLeft = centerX * crop.clientWidth - viewport.clientWidth / 2;
      viewport.scrollTop = centerY * crop.clientHeight - viewport.clientHeight / 2;
      output.textContent = `${Math.round(scale * 100)}%`;
    }

    dialog.querySelector("[data-image-viewer-fit]").addEventListener("click", () => {
      crop.style.width = "100%";
      scale = crop.clientWidth / naturalWidth;
      viewport.scrollTo({ left: 0, top: 0, behavior: "instant" });
      output.textContent = "Fit";
    });
    dialog.querySelector("[data-image-viewer-zoom-in]").addEventListener("click", () => setScale(scale + 0.25));
    dialog.querySelector("[data-image-viewer-zoom-out]").addEventListener("click", () => setScale(scale - 0.25));

    document.querySelectorAll("a[data-image-viewer]").forEach((trigger) => {
      if (trigger.dataset.imageViewer !== dialog.id) return;
      trigger.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
            typeof dialog.showModal !== "function") return;
        event.preventDefault();
        if (dialog.open) return;
        restorePage();
        returnState = {
          trigger, x: window.scrollX, y: window.scrollY,
          overflow: document.documentElement.style.overflow
        };
        image.src = trigger.href;
        scale = 1;
        crop.style.width = `${naturalWidth}px`;
        output.textContent = "100%";
        document.documentElement.style.overflow = "hidden";
        dialog.showModal();
        viewport.scrollTo({ left: 0, top: 0, behavior: "instant" });
      });
    });

    dialog.querySelector('form[method="dialog"]').addEventListener("submit", (event) => {
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeViewer();
    });
    dialog.addEventListener("close", () => {
      if (!dialog.open) restorePage();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom) closeViewer();
    });
  });
})();
