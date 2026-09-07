/**
 * On-demand media loader for portfolio/experience slots.
 * Heavy media.* files load only after <details> opens (or explicit play).
 */
(function () {
  function loadSlot(slot) {
    if (!slot || slot.dataset.loaded === "true") return;

    const frame = slot.querySelector("[data-media-frame]");
    if (!frame) return;

    const poster = slot.dataset.poster;
    const src = slot.dataset.src;
    const type = slot.dataset.type || "video";

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
      video.controls = true;
      video.playsInline = true;
      video.preload = "none";
      if (poster) video.poster = poster;
      video.src = src;
      frame.appendChild(video);
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
