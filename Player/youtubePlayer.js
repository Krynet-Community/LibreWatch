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
     SCRIPT LOADERS (single-flight)
  ========================= */

  function loadScript(src, globalCheck) {
    return new Promise((resolve, reject) => {
      if (globalCheck?.()) return resolve();

      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        const check = setInterval(() => {
          if (globalCheck?.()) {
            clearInterval(check);
            resolve();
          }
        }, 50);
        return;
      }

      const s = document.createElement('script');
      s.src = src;
      s.async = true;

      s.onload = () => resolve();
      s.onerror = reject;

      document.head.appendChild(s);
    });
  }

  function loadAdblock() {
    if (!adblockPromise) {
      adblockPromise = loadScript(
        '/LibreWatch/Player/Adblock.js',
        () => window.AdblockLoaded
      ).then(() => {
        window.AdblockLoaded = true;
        console.log('🛡️ Adblock loaded');
      }).catch(() => {
        console.warn('⚠️ Adblock failed (ignored)');
      });
    }
    return adblockPromise;
  }

  function loadCore() {
    if (!corePromise) {
      corePromise = loadScript(
        '/LibreWatch/Player/playerCore.js',
        () => window.LibreUltra
      ).catch(() => console.warn('⚠️ Core failed'));
    }
    return corePromise;
  }

  function loadYouTube() {
    if (!ytPromise) {
      ytPromise = new Promise(resolve => {
        if (window.YT?.Player) return resolve();

        window.onYouTubeIframeAPIReady = () => resolve();

        const existing = document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        );

        if (!existing) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(tag);
        }
      });
    }
    return ytPromise;
  }

  /* =========================
     PLAYER CLEANUP
  ========================= */

  function clearPlayer() {
    sponsorSegments = [];
    sponsorIndex = 0;

    if (currentPlayer) {
      try {
        currentPlayer.stopVideo?.();
        currentPlayer.destroy?.();
      } catch {}
    }

    currentPlayer = null;
  }

  /* =========================
     SPONSOR ENGINE (O(1) pointer scan)
  ========================= */

  function attachSponsorEngine(player) {
    if (!sponsorSegments.length) return;

    sponsorIndex = 0;

    const tick = () => {
      if (!player?.getCurrentTime) return;

      const t = player.getCurrentTime();
      const seg = sponsorSegments[sponsorIndex];

      if (!seg) return;

      const [start, end] = seg.segment;

      // fast-forward pointer if needed
      if (t > end && sponsorIndex < sponsorSegments.length - 1) {
        sponsorIndex++;
        return;
      }

      if (t >= start && t < end) {
        player.seekTo(end, true);
        sponsorIndex++;
      }
    };

    player.__sponsorRAF = setInterval(tick, 200);
  }

  /* =========================
     CORE CREATE
  ========================= */

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container missing');
      return null;
    }

    await loadAdblock();
    await loadConfig();
    await loadCore();
    await loadYouTube();

    clearPlayer();

    container.innerHTML = '<div id="yt-player"></div>';

    currentPlayer = new YT.Player('yt-player', {
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
          console.log(`🎬 Player ready: ${videoId}`);

          if (window.LibreUltra) {
            sponsorSegments =
              (await window.LibreUltra.sponsor(videoId)) || [];

            sponsorSegments.sort(
              (a, b) => a.segment[0] - b.segment[0]
            );

            console.log(
              `⏭️ Sponsor segments: ${sponsorSegments.length}`
            );
          }

          attachSponsorEngine(currentPlayer);

          if (options.autoplay) {
            currentPlayer.playVideo();
          }
        },

        onStateChange: (e) => {
          // pause engine when paused
          if (e.data === YT.PlayerState.PAUSED) return;
        },

        onError: (e) => console.error('YT error:', e.data)
      }
    });

    return currentPlayer;
  }

  /* =========================
     DESTROY
  ========================= */

  function destroy() {
    if (currentPlayer?.__sponsorRAF) {
      clearInterval(currentPlayer.__sponsorRAF);
    }

    clearPlayer();
  }

  return { create, destroy };
})();
