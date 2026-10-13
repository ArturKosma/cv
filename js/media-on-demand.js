/**
 * Play only visible media. Release hidden videos' streams and decoder buffers
 * so browsing more samples does not accumulate background playback.
 */
(function () {
  let imageViewer;
  let viewerOpener;

  function openImageViewer(image, opener, title) {
    if (!imageViewer) {
      imageViewer = document.createElement("dialog");
      imageViewer.className = "image-viewer";
      imageViewer.setAttribute("aria-labelledby", "image-viewer-title");
      imageViewer.innerHTML = `
        <div class="image-viewer__toolbar">
          <h2 id="image-viewer-title"></h2>
          <button type="button" data-viewer-zoom>Actual size</button>
          <button type="button" data-viewer-close autofocus>Back to sample</button>
        </div>
        <div class="image-viewer__stage" tabindex="0" aria-label="Enlarged image; scroll to explore at actual size">
          <img alt="" />
        </div>`;
      document.body.appendChild(imageViewer);
      imageViewer.querySelector("[data-viewer-close]").addEventListener("click", () => imageViewer.close());
      imageViewer.querySelector("[data-viewer-zoom]").addEventListener("click", (event) => {
        const actualSize = imageViewer.classList.toggle("image-viewer--actual-size");
        event.currentTarget.textContent = actualSize ? "Fit to screen" : "Actual size";
        const stage = imageViewer.querySelector(".image-viewer__stage");
        stage.scrollTo(0, 0);
      });
      imageViewer.addEventListener("click", (event) => {
        if (event.target !== imageViewer) return;
        const bounds = imageViewer.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom) imageViewer.close();
      });
      imageViewer.addEventListener("close", () => {
        document.body.classList.remove("has-image-viewer");
        imageViewer.querySelector("img").removeAttribute("src");
        if (viewerOpener && viewerOpener.isConnected) viewerOpener.focus({ preventScroll: true });
        viewerOpener = null;
        syncMedia();
      });
    }
    viewerOpener = opener;
    imageViewer.querySelector("h2").textContent = title;
    const enlargedImage = imageViewer.querySelector("img");
    enlargedImage.src = image.src;
    enlargedImage.alt = image.alt;
    imageViewer.classList.remove("image-viewer--actual-size");
    imageViewer.querySelector("[data-viewer-zoom]").textContent = "Actual size";
    imageViewer.querySelector(".image-viewer__stage").scrollTo(0, 0);
    document.body.classList.add("has-image-viewer");
    imageViewer.showModal();
    syncMedia();
  }

  function loadPoster(slot, priority = "low") {
    const frame = slot.querySelector("[data-media-frame]");
    const src = slot.dataset.poster;
    if (!frame || !src) return null;
    let preview = frame.querySelector(".media-slot__poster");
    // An early expansion may already have played and removed its preview.
    if (slot.dataset.loaded === "true") return preview;
    if (!preview) {
      preview = document.createElement("img");
      preview.className = "media-slot__poster";
      preview.alt = "";
      preview.decoding = "async";
      frame.replaceChildren(preview);
    }
    preview.loading = priority === "high" ? "eager" : "lazy";
    preview.fetchPriority = priority;
    if (!preview.hasAttribute("src")) preview.src = src;
    return preview;
  }

  function revealVideo(video, preview) {
    if (!preview) return () => {};
    // Keep the first frame visible until the video can display its own frame.
    const reveal = () => preview.remove();
    if (typeof video.requestVideoFrameCallback === "function") {
      const callback = video.requestVideoFrameCallback(reveal);
      return () => video.cancelVideoFrameCallback(callback);
    } else if (video.readyState >= 2) {
      reveal();
    } else {
      video.addEventListener("loadeddata", reveal, { once: true });
      return () => video.removeEventListener("loadeddata", reveal);
    }
    return () => {};
  }

  function startVideo(record) {
    if (record.video && record.video.hasAttribute("src")) return;
    let video = record.video;
    let preview;
    if (!record.thumbnail) {
      const slot = record.target;
      const frame = slot.querySelector("[data-media-frame]");
      if (!frame || !slot.dataset.src) return;
      preview = loadPoster(slot, "high");
      video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.disablePictureInPicture = true;
      video.disableRemotePlayback = true;
      if (slot.dataset.poster) video.poster = slot.dataset.poster;
      video.addEventListener("contextmenu", (event) => event.preventDefault());
      frame.replaceChildren(...(preview ? [preview, video] : [video]));
      record.video = video;
    }
    video.preload = "auto";
    video.src = record.target.dataset.src;
    record.cancelReveal = revealVideo(video, preview);
    record.target.dataset.loaded = "true";
    // Request playback now; do not wait for the whole file or canplaythrough.
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }

  function releaseVideo(record) {
    const video = record.video;
    if (!video || !video.hasAttribute("src")) return;
    record.cancelReveal();
    record.cancelReveal = null;
    video.pause();
    video.removeAttribute("src");
    video.preload = "none";
    // pause() alone keeps the media resource alive. Reset source selection to
    // abort downloads and let the browser release buffers, including on iOS.
    video.load();
    delete record.target.dataset.loaded;
    if (!record.thumbnail) {
      video.remove();
      record.video = null;
      loadPoster(record.target);
    }
  }

  function loadSlot(slot) {
    if (!slot || slot.dataset.loaded === "true") return;
    const frame = slot.querySelector("[data-media-frame]");
    if (!frame) return;
    const src = slot.dataset.src;
    const type = slot.dataset.type || "video";
    // The viewport observer owns videos; expansion only initializes images.
    if (type === "video" && src) return;
    frame.replaceChildren();

    if (!src) {
      const empty = document.createElement("div");
      empty.className = "media-slot__placeholder";
      empty.setAttribute("aria-hidden", "true");
      frame.appendChild(empty);
    } else if (type === "image") {
      const image = document.createElement("img");
      image.src = src;
      image.alt = slot.dataset.alt || "";
      image.loading = "lazy";
      image.decoding = "async";
      if (slot.hasAttribute("data-enlarge")) {
        const opener = document.createElement("button");
        opener.type = "button";
        opener.className = "media-slot__enlarge";
        opener.setAttribute("aria-label", `Enlarge ${slot.dataset.enlarge}`);
        opener.setAttribute("aria-haspopup", "dialog");
        const hint = document.createElement("span");
        hint.className = "media-slot__enlarge-hint";
        hint.textContent = "Expand image";
        hint.setAttribute("aria-hidden", "true");
        opener.append(image, hint);
        opener.addEventListener("click", () => openImageViewer(image, opener, slot.dataset.enlarge));
        frame.appendChild(opener);
      } else {
        frame.appendChild(image);
      }
    }
    slot.dataset.loaded = "true";
  }

  const records = new Map();
  document.querySelectorAll(".thumb-video, [data-media-slot]").forEach((target) => {
    const thumbnail = target.matches(".thumb-video");
    if (!thumbnail && (target.dataset.type || "video") !== "video") return;
    if (!target.dataset.src) return;
    records.set(target, {
      target,
      thumbnail,
      details: target.closest("details[data-project]"),
      video: thumbnail ? target : null,
      visible: false,
    });
  });
  let pageSuspended = false;

  function syncMedia() {
    const active = !pageSuspended && !document.hidden && !(imageViewer && imageViewer.open);
    const visible = (record) => active && record.visible &&
      (record.thumbnail || !record.details || record.details.open);
    // Stop old streams before starting new ones during scroll/expand changes.
    records.forEach((record) => { if (!visible(record)) releaseVideo(record); });
    records.forEach((record) => { if (visible(record)) startVideo(record); });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        records.get(entry.target).visible = entry.isIntersecting && entry.intersectionRatio > 0;
      });
      syncMedia();
    });
    records.forEach((record) => observer.observe(record.target));
  } else {
    // Older browsers keep the same lifecycle with a frame-throttled fallback.
    let scheduled = false;
    const updateVisibility = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        records.forEach((record) => {
          const rect = record.target.getBoundingClientRect();
          record.visible = rect.width > 0 && rect.height > 0 && rect.bottom > 0 &&
            rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        });
        syncMedia();
      });
    };
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    document.addEventListener("toggle", updateVisibility, true);
    window.addEventListener("pageshow", updateVisibility);
    updateVisibility();
  }

  function loadSample(details) {
    details.querySelectorAll("[data-media-slot]").forEach(loadSlot);
  }
  document.querySelectorAll("details[data-project]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) loadSample(details);
      syncMedia();
    });
    if (details.open) loadSample(details);
  });

  document.addEventListener("visibilitychange", syncMedia);
  window.addEventListener("pagehide", () => { pageSuspended = true; syncMedia(); });
  window.addEventListener("pageshow", () => { pageSuspended = false; syncMedia(); });
})();
