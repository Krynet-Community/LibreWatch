window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;
  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json');
      CFG = await res.json().Player;
      return CFG;
    } catch (e) { console.error('Config failed:', e); return null; }
  }

  function clearPlayer() {
    if (sponsorInterval) clearInterval(sponsorInterval);
    if (currentPlayer) currentPlayer.destroy?.();
    currentPlayer = null;
    sponsorSegments = [];
  }

  function startSponsorWatcher(player) {
    sponsorInterval = setInterval(() => {
      const t = player.getCurrentTime();
      if (t === undefined || t === null) return;
      for (const seg of sponsorSegments) {
        const [start, end] = seg.segment;
        if (t >= start && t < end) {
          player.seekTo(end, true);
          console.log(`⏭️ Skipped ${seg.category}: ${start.toFixed(1)}s`);
          break;
        }
      }
    }, 250);
  }

  async function loadCore() {
    if (window.LibreUltra) return;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/LibreWatch/Player/playerCore.js';
      s.async = true;
      s.onload = () => window.LibreUltra ? resolve() : reject('Core failed');
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadYouTubeAPI() {
    return new Promise(resolve => {
      if (window.YT?.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onload = () => {
        if (window.YT?.Player) resolve();
        else window.onYouTubeIframeAPIReady = () => resolve();
      };
      document.head.appendChild(tag);
    });
  }

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container missing');

    await loadConfig();
    await loadCore();
    await loadYouTubeAPI();

    clearPlayer();
    const autoplay = options.autoplay ? 1 : 0;

    currentPlayer = new YT.Player(containerId, {
      height: options.height || '360',
      width: options.width || '640',
      videoId,
      playerVars: { autoplay, modestbranding: 1, rel: 0, enablejsapi: 1 },
      events: {
        onReady: async (evt) => {
          console.log(`🎥 Ready: ${videoId}`);

          // SponsorBlock
          sponsorSegments = await window.LibreUltra.sponsor(videoId) || [];
          sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
          console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments`);

          // DeArrow
          const dearrowData = await window.LibreUltra.dearrow(videoId);
          if (dearrowData?.[videoId]) {
            const { titles = [], thumbnails = [] } = dearrowData[videoId];
            const bestTitle = titles.find(t => t.locked) || titles[0];
            const bestThumb = thumbnails.find(t => t.locked) || thumbnails[0];
            
            if (bestTitle) {
              document.title = bestTitle.title;
              const titleEl = document.getElementById('videoTitle');
              if (titleEl) {
                titleEl.textContent = bestTitle.title;
                titleEl.style.color = '#4ade80';
                titleEl.style.display = 'block';
              }
              console.log('📝 Title:', bestTitle.title);
            }
          }

          startSponsorWatcher(evt.target);
        },
        onError: e => console.error('Player error:', e.data)
      }
    });

    return currentPlayer;
  }

  function destroy() { clearPlayer(); }

  return { create, destroy };
})();
