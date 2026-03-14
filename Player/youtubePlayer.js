// Player/youtubePlayer.js
// FIXED: Proxy warmup + better error handling
window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;
  let CFG = null;
  let proxyReady = false;  // NEW: Track proxy status

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      CFG = json.Player;
      return CFG;
    } catch (e) { console.error('Failed to load config:', e); return null; }
  }

  // NEW: Warm up proxy BEFORE player loads
  async function warmupProxy() {
    if (proxyReady || !window.LibreUltra) return true;
    
    console.log('🔍 Warming up proxy system...');
    try {
      // Quick test with known-good video (Rickroll has sponsors)
      const testSegments = await window.LibreUltra.sponsor('dQw4w9WgXcQ');
      proxyReady = true;
      
      if (testSegments && testSegments.length > 0) {
        console.log(`✅ Proxy ready! (${testSegments.length} test segments)`);
        return true;
      }
      
      console.log('✅ Proxy ready but no test segments');
      return true;
    } catch (e) {
      console.log('⚠️ Proxy warmup failed, will retry per-video');
      proxyReady = false;
      return false;
    }
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
          console.log(`⏭️ Skipped sponsor: ${start.toFixed(1)}s → ${end.toFixed(1)}s`);
          break;
        }
      }
    }, 250); // Slightly faster polling
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
      
      // CRITICAL: Warmup proxy BEFORE creating player
      await warmupProxy();
      
    } catch (e) { 
      console.error('Pre-flight failed:', e); 
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
        controls: 1,  // Show controls for manual skipping
      },
      events: {
        onReady: async (evt) => {
          console.log(`🎥 Player ready: ${videoId}`);
          
          try {
            sponsorSegments = (await window.LibreUltra.sponsor(videoId)) || [];
            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
            
            if (sponsorSegments.length > 0) {
              console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments ready`);
              console.log('Segments:', sponsorSegments.map(s => `${s.segment[0]}s-${s.segment[1]}s (${s.category})`));
            } else {
              console.log('ℹ️ No SponsorBlock segments for this video');
            }
          } catch (e) {
            console.error('SponsorBlock fetch failed:', e);
            sponsorSegments = [];
          }

          if (config.Misc?.dearrow?.KEY) {
            window.LibreUltra.prefetch(videoId);
          }

          startSponsorWatcher(evt.target);
        },
        onError: (e) => {
          console.error('Player error:', e.data, e);
          container.innerHTML = '<div style="padding:1rem;color:#f66;">Video failed to load</div>';
        }
      }
    });

    return currentPlayer;
  }

  function destroy() {
    clearPlayer();
  }

  return { create, destroy };
})();
