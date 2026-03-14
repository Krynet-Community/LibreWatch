// Player/youtubePlayer.js - FULL DeArrow + SponsorBlock
window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;
  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      CFG = json.Player;
      return CFG;
    } catch (e) { console.error('Failed to load config:', e); return null; }
  }

  function clearPlayer() {
    if (sponsorInterval) clearInterval(sponsorInterval);
    if (currentPlayer) {
      currentPlayer.destroy?.();
      currentPlayer = null;
    }
    sponsorSegments = [];
  }

  function startSponsorWatcher(player) {
    if (!player || !player.getCurrentTime) return;

    sponsorInterval = setInterval(() => {
      const t = player.getCurrentTime();
      if (t === undefined || t === null) return;

      for (const seg of sponsorSegments) {
        const [start, end] = seg.segment;
        if (t >= start && t < end) {
          player.seekTo(end, true);
          console.log(`⏭️ Skipped: ${start.toFixed(1)}s → ${end.toFixed(1)}s (${seg.category})`);
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
      s.onload = () => window.LibreUltra ? resolve() : reject('LibreUltra failed');
      s.onerror = () => reject('Failed to load playerCore.js');
      document.head.appendChild(s);
    });
  }

  function loadYouTubeAPI() {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onload = () => {
        if (window.YT && window.YT.Player) resolve();
        else window.onYouTubeIframeAPIReady = () => resolve();
      };
      document.head.appendChild(tag);
    });
  }

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container not found');

    const config = await loadConfig();
    if (!config) return console.error('Config failed');

    try { 
      await loadCore(); 
      await loadYouTubeAPI();
    } catch (e) { 
      console.error('Core/API load failed:', e); 
    }

    clearPlayer();

    const autoplay = options.autoplay ? 1 : 0;

    currentPlayer = new YT.Player(containerId, {
      height: options.height || '360',
      width: options.width || '640',
      videoId,
      playerVars: {
        autoplay,
        modestbranding: 1,
        rel: 0,
        enablejsapi: 1,
        controls: 1,
      },
      events: {
        onReady: async (evt) => {
          console.log(`🎥 Player ready: ${videoId}`);

          // SponsorBlock
          try {
            sponsorSegments = (await window.LibreUltra.sponsor(videoId)) || [];
            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
            console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments`);
          } catch (e) {
            console.error('SponsorBlock failed:', e);
            sponsorSegments = [];
          }

          // DeArrow - FULL IMPLEMENTATION
          try {
            const dearrowData = await window.LibreUltra.dearrow(videoId);
            if (dearrowData && dearrowData[videoId]) {
              const branding = dearrowData[videoId];
              
              // Best title (highest votes or locked)
              const bestTitle = branding.titles?.find(t => t.locked === true || t.votes > 0) || 
                               branding.titles?.[0];
              
              // Best thumbnail timestamp  
              const bestThumb = branding.thumbnails?.find(t => t.locked === true || t.votes > 0) ||
                               branding.thumbnails?.[0];

              // Update page title
              if (bestTitle) {
                document.title = `${bestTitle.title} - LibreWatch`;
                console.log('📝 DeArrow title:', bestTitle.title);
              }

              // Show title on page
              const titleEl = document.getElementById('videoTitle');
              if (titleEl && bestTitle) {
                titleEl.textContent = bestTitle.title;
                titleEl.style.color = '#4ade80';
                titleEl.style.display = 'block';
              }

              // Log thumbnail timestamp
              if (bestThumb?.timestamp) {
                console.log('🖼️ Best thumbnail at:', bestThumb.timestamp, 's');
              }
            } else {
              console.log('ℹ️ No DeArrow data available');
            }
          } catch (e) {
            console.log('DeArrow fetch failed:', e);
          }

          startSponsorWatcher(evt.target);
        },
        onError: (e) => console.error('Player error:', e.data)
      }
    });

    return currentPlayer;
  }

  function destroy() {
    clearPlayer();
  }

  return { create, destroy };
})();
