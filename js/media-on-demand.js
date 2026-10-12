/**
 * Miniature videos start immediately, ahead of their first-frame posters.
 * Full-size posters warm in the background; full videos stream on expansion.
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
        if (viewerOpener && viewerOpener.isConnected) viewerOpener.focus({ preventScroll: true });
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
      preview.loading = "eager";
      frame.replaceChildren(preview);
    }
    preview.fetchPriority = priority;
    if (!preview.hasAttribute("src")) preview.src = src;
    return preview;
  }

  function loadThumbnailPoster(video, priority = "low") {
    let preview = video.parentElement.querySelector(".media-slot__poster");
    if (video.dataset.loaded === "true") return preview;
    if (!preview) {
      preview = document.createElement("img");
      preview.className = "media-slot__poster";
      preview.alt = "";
      preview.decoding = "async";
      preview.addEventListener("load", () => { video.poster = video.dataset.poster; }, { once: true });
      video.parentElement.appendChild(preview);
    }
    preview.fetchPriority = priority;
    if (!preview.hasAttribute("src")) preview.src = video.dataset.poster;
    return preview;
  }

  function revealVideo(video, preview) {
    if (!preview) return;
    // Keep the first frame visible until the video can display its own frame.
    const reveal = () => preview.remove();
    if (typeof video.requestVideoFrameCallback === "function") {
      video.requestVideoFrameCallback(reveal);
    } else if (video.readyState >= 2) {
      reveal();
    } else {
      video.addEventListener("loadeddata", reveal, { once: true });
    }
  }

  function startVideo(video, src, preview) {
    video.preload = "auto";
    // Thumbnails already have an HTML src so the browser can fetch them early.
    if (src) video.src = src;
    revealVideo(video, preview);
    // Request playback now; do not wait for the whole file or canplaythrough.
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }

  function loadSlot(slot) {
    if (!slot || slot.dataset.loaded === "true") return;
    const frame = slot.querySelector("[data-media-frame]");
    if (!frame) return;
    const src = slot.dataset.src;
    const type = slot.dataset.type || "video";
    const preview = src && type === "video" ? loadPoster(slot, "high") : null;
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
    } else {
      const video = document.createElement("video");
      video.controls = false;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = "auto";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.disablePictureInPicture = true;
      video.disableRemotePlayback = true;
      if (slot.dataset.poster) video.poster = slot.dataset.poster;
      if (preview) frame.appendChild(preview);
      video.addEventListener("contextmenu", (event) => event.preventDefault());
      frame.appendChild(video);
      startVideo(video, src, preview);
    }
    slot.dataset.loaded = "true";
  }

  const thumbnails = [...document.querySelectorAll(".thumb-video")];
  // Start every miniature before requesting any poster images.
  thumbnails.forEach((video) => startVideo(video));
  thumbnails.forEach((video) => {
    const preview = loadThumbnailPoster(video, "low");
    revealVideo(video, preview);
    video.dataset.loaded = "true";
  });
  const thumbnailsReady = Promise.all(thumbnails.map((video) => new Promise((resolve) => {
    if (video.readyState >= 2 || video.error) { resolve(); return; }
    const ready = () => {
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", ready);
      resolve();
    };
    video.addEventListener("loadeddata", ready, { once: true });
    video.addEventListener("error", ready, { once: true });
  })));

  function loadSample(details) {
    details.querySelectorAll("[data-media-slot]").forEach(loadSlot);
  }
  document.querySelectorAll("details[data-project]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) loadSample(details);
    });
    if (details.open) loadSample(details);
  });

  function warmPosters() {
    document.querySelectorAll("[data-media-slot][data-poster]").forEach((slot) => loadPoster(slot));
  }
  function schedulePosters() {
    // Let the page paint and the miniatures get their first frames before
    // spending bandwidth on the larger background posters.
    requestAnimationFrame(() => requestAnimationFrame(() => thumbnailsReady.then(warmPosters)));
  }
  if (document.readyState === "complete") schedulePosters();
  else window.addEventListener("load", schedulePosters, { once: true });
})();
