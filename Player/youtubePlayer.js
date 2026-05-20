window.LibreWatchPlayer = (() => {
  'use strict';

  /* =========================
     STATE
  ========================= */

  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorIndex = 0;

  let CFG = null;

  let adblockPromise = null;
  let corePromise = null;
  let ytPromise = null;

  let sponsorRAF = null;

  /* =========================
     CONFIG
  ========================= */

  async function loadConfig() {
    if (CFG) return CFG;

    try {
      const res = await fetch('/LibreWatch/Player/config.json');
      const json = await res.json();

      CFG = json?.Player || json || {};
      return CFG;

    } catch {
      CFG = {};
      return CFG;
    }
  }

  /* =========================
     SCRIPT LOADER
  ========================= */

  function loadScript(src, isReady) {
    return new Promise((resolve, reject) => {
      if (isReady?.()) return resolve();

      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        const check = setInterval(() => {
          if (isReady?.()) {
            clearInterval(check);
            resolve();
          }
        }, 50);
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.async = true;

      s.onload = resolve;
      s.onerror = reject;

      document.head.appendChild(s);
    });
  }

  /* =========================
     LOADERS
  ========================= */

  const loadAdblock = () => {
    if (!adblockPromise) {
      adblockPromise = loadScript(
        '/LibreWatch/Player/Adblock.js',
        () => window.AdblockLoaded
      ).catch(() => {});
    }
    return adblockPromise;
  };

  const loadCore = () => {
    if (!corePromise) {
      corePromise = loadScript(
        '/LibreWatch/Player/playerCore.js',
        () => window.LibreUltra
      ).catch(() => {});
    }
    return corePromise;
  };

  const loadYouTube = () => {
    if (ytPromise) return ytPromise;

    ytPromise = new Promise((resolve) => {
      if (window.YT?.Player) return resolve();

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);

      const prev = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev();
        resolve();
      };
    });

    return ytPromise;
  };

  /* =========================
     CLEANUP
  ========================= */

  function clearPlayer() {
    sponsorSegments = [];
    sponsorIndex = 0;

    if (sponsorRAF) {
      cancelAnimationFrame(sponsorRAF);
      sponsorRAF = null;
    }

    if (currentPlayer) {
      try {
        currentPlayer.stopVideo?.();
        currentPlayer.destroy?.();
      } catch {}
    }

    currentPlayer = null;
  }

  /* =========================
     SPONSOR ENGINE (rAF - smoother)
  ========================= */

  function attachSponsorEngine(player) {
    if (!sponsorSegments.length) return;

    sponsorIndex = 0;

    const loop = () => {
      if (!player?.getCurrentTime) {
        sponsorRAF = requestAnimationFrame(loop);
        return;
      }

      const t = player.getCurrentTime();
      const seg = sponsorSegments[sponsorIndex];

      if (seg) {
        const [start, end] = seg.segment;

        if (t > end && sponsorIndex < sponsorSegments.length - 1) {
          sponsorIndex++;
        } else if (t >= start && t < end) {
          player.seekTo(end, true);
          sponsorIndex++;
        }
      }

      sponsorRAF = requestAnimationFrame(loop);
    };

    sponsorRAF = requestAnimationFrame(loop);
  }

  /* =========================
     CREATE PLAYER
  ========================= */

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    await loadAdblock();
    await loadConfig();
    await loadCore();
    await loadYouTube();

    clearPlayer();

    const id = `yt-player-${Date.now()}`;

    container.innerHTML = `<div id="${id}"></div>`;

    currentPlayer = new YT.Player(id, {
      width: options.width || '100%',
      height: options.height || '360',
      videoId,

      playerVars: {
        autoplay: options.autoplay ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        controls: 1,
        enablejsapi: 1,
        origin: location.origin
      },

      events: {
        onReady: async () => {
          if (window.LibreUltra) {
            sponsorSegments =
              (await window.LibreUltra.sponsor(videoId)) || [];

            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
          }

          attachSponsorEngine(currentPlayer);

          if (options.autoplay) {
            currentPlayer.playVideo?.();
          }
        },

        onError: (e) => console.error('[YT]', e.data)
      }
    });

    return currentPlayer;
  }

  /* =========================
     DESTROY
  ========================= */

  function destroy() {
    clearPlayer();
  }

  return { create, destroy };
})();
