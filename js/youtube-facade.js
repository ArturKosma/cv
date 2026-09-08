/**
 * Click-to-load YouTube facade — keeps first paint light (no iframe until play).
 */
(function () {
  function activate(facade) {
    if (facade.dataset.loaded === "true") return;
    const id = facade.dataset.youtubeId;
    if (!id) return;

    const title = facade.dataset.title || "YouTube video";
    const frame = document.createElement("iframe");
    frame.src =
      "https://www.youtube-nocookie.com/embed/" +
      encodeURIComponent(id) +
      "?autoplay=1&rel=0";
    frame.title = title;
    frame.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";

    facade.replaceChildren(frame);
    facade.dataset.loaded = "true";
    facade.classList.add("is-playing");
  }

  document.querySelectorAll(".yt-facade").forEach((facade) => {
    const button = facade.querySelector(".yt-facade__button");
    if (!button) return;
    button.addEventListener("click", () => activate(facade));
  });
})();
