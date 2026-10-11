/**
 * First-frame posters warm in the background after the page loads and paints.
 * Full videos stream only when their sample expands, and play as soon as possible.
 */
(function () {
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

  function startVideo(video, src, preview) {
    video.preload = "auto";
    video.src = src;
    if (preview) {
      // Keep the cached first frame visible until a video frame is displayed.
      const revealVideo = () => preview.remove();
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(revealVideo);
      } else {
        video.addEventListener("loadeddata", revealVideo, { once: true });
      }
    }
    // Request playback now; do not wait for the whole file or canplaythrough.
    const play = video.play();
    if (play && typeof play.catch === "function") play.catch(() => {});
  }

  function loadThumbnail(video) {
    if (video.dataset.loaded === "true") return;
    const preview = loadThumbnailPoster(video, "high");
    startVideo(video, video.dataset.src, preview);
    video.dataset.loaded = "true";
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
      frame.appendChild(image);
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

  function loadSample(details) {
    details.querySelectorAll(".thumb-video[data-src]").forEach(loadThumbnail);
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
    document.querySelectorAll(".thumb-video[data-poster]").forEach((video) => loadThumbnailPoster(video));
  }
  function schedulePosters() {
    // Finish navigation and give the page a paint before starting image requests.
    requestAnimationFrame(() => requestAnimationFrame(warmPosters));
  }
  if (document.readyState === "complete") schedulePosters();
  else window.addEventListener("load", schedulePosters, { once: true });
})();
