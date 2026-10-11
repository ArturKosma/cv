/**
 * On-demand media loader for portfolio/experience slots.
 * Heavy media.* files load only after <details> opens.
 * Expand videos autoplay muted in a loop — no player chrome or interaction.
 */
(function () {
  function loadSlot(slot) {
    if (!slot || slot.dataset.loaded === "true") return;

    const frame = slot.querySelector("[data-media-frame]");
    if (!frame) return;

    const poster = slot.dataset.poster;
    const src = slot.dataset.src;
    const type = slot.dataset.type || "video";

    const preview = frame.querySelector(".media-slot__poster");
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
      video.preload = "metadata";
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("aria-hidden", "true");
      video.tabIndex = -1;
      video.disablePictureInPicture = true;
      video.disableRemotePlayback = true;
      if (poster) video.poster = poster;
      if (preview) {
        frame.appendChild(preview);
        if (poster) {
          // Upgrade the tiny inline frame without blanking it during the fetch.
          const fullPreview = new Image();
          fullPreview.src = poster;
          fullPreview.decode().then(() => {
            if (preview.isConnected) preview.src = poster;
          }).catch(() => {});
        }
        // Autoplay can hide the native poster before the first frame is ready.
        const revealVideo = () => preview.remove();
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(revealVideo);
        } else {
          video.addEventListener("loadeddata", revealVideo, { once: true });
        }
      }
      video.src = src;
      video.addEventListener("contextmenu", (e) => e.preventDefault());
      frame.appendChild(video);
      const play = video.play();
      if (play && typeof play.catch === "function") play.catch(() => {});
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
