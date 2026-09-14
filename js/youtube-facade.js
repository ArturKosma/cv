/**
 * Click-to-load YouTube facade — keeps first paint light (no iframe until play).
 * Uses the standard youtube.com embed (not nocookie) so Settings → Quality
 * stays available in the player chrome.
 */
(function () {
  var apiReady = null;

  function loadIframeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }
    if (apiReady) return apiReady;
    apiReady = new Promise(function (resolve) {
      var prior = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prior === "function") prior();
        resolve();
      };
      var script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    });
    return apiReady;
  }

  function activate(facade) {
    if (facade.dataset.loaded === "true") return;
    var id = facade.dataset.youtubeId;
    if (!id) return;

    var title = facade.dataset.title || "YouTube video";
    var host = document.createElement("div");
    host.className = "yt-facade__player";
    facade.replaceChildren(host);
    facade.dataset.loaded = "true";
    facade.classList.add("is-playing");

    loadIframeApi().then(function () {
      // Standard embed domain — privacy mode often omits Quality in Settings.
      new window.YT.Player(host, {
        videoId: id,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
          // Soft hint; YouTube may still adapt, but prefer HD when possible.
          vq: "hd1080",
        },
        events: {
          onReady: function (event) {
            try {
              var iframe = event.target.getIframe();
              if (iframe) iframe.title = title;
              var levels = event.target.getAvailableQualityLevels();
              if (levels && levels.indexOf("hd1080") !== -1) {
                event.target.setPlaybackQuality("hd1080");
              } else if (levels && levels.indexOf("hd720") !== -1) {
                event.target.setPlaybackQuality("hd720");
              }
            } catch (_) {
              /* setPlaybackQuality is best-effort / often ignored */
            }
          },
        },
      });
    });
  }

  document.querySelectorAll(".yt-facade").forEach(function (facade) {
    var button = facade.querySelector(".yt-facade__button");
    if (!button) return;
    button.addEventListener("click", function () {
      activate(facade);
    });
  });
})();
