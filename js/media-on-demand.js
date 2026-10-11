/**
 * On-demand media loader for portfolio/experience slots.
 * Expanded videos stream immediately; only actual buffering shows LOADING.
 */
(function () {
  function createLoading() {
    const loading = document.createElement("div");
    loading.className = "media-slot__loading";
    loading.setAttribute("role", "status");
    const label = document.createElement("span");
    label.className = "media-slot__loading-label";
    label.textContent = "LOADING";
    loading.appendChild(label);
    return loading;
  }

  function loadSlot(slot) {
    if (!slot || slot.dataset.loaded === "true") return;

    const frame = slot.querySelector("[data-media-frame]");
    if (!frame) return;

    const src = slot.dataset.src;
    const type = slot.dataset.type || "video";
    const loading = frame.querySelector(".media-slot__loading");
    frame.replaceChildren();

    if (!src) {
      const empty = document.createElement("div");
      empty.className = "media-slot__placeholder";
      empty.setAttribute("aria-hidden", "true");
      frame.appendChild(empty);
      slot.dataset.loaded = "true";
      return;
    }

    if (type === "image") {
      const img = document.createElement("img");
      img.src = src;
      img.alt = slot.dataset.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      frame.appendChild(img);
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

      const indicator = loading || createLoading();
      const showLoading = () => { indicator.hidden = false; };
      video.addEventListener("playing", () => { indicator.hidden = true; });
      video.addEventListener("waiting", showLoading);
      video.addEventListener("emptied", showLoading);
      video.addEventListener("error", showLoading);
      video.addEventListener("contextmenu", (event) => event.preventDefault());
      video.src = src;
      frame.append(video, indicator);
      // Request playback now; do not wait for the whole file or canplaythrough.
      const play = video.play();
      if (play && typeof play.catch === "function") play.catch(showLoading);
    }

    slot.dataset.loaded = "true";
  }

  function onToggle(event) {
    const details = event.currentTarget;
    if (!details.open) return;
    details.querySelectorAll("[data-media-slot]").forEach(loadSlot);
  }

  document.querySelectorAll("details[data-project]").forEach((details) => {
    details.addEventListener("toggle", onToggle);
    if (details.open) {
      details.querySelectorAll("[data-media-slot]").forEach(loadSlot);
    }
  });
})();
