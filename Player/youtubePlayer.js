window.LibreWatchPlayer = (() => {
  let currentPlayer = null;
  let sponsorSegments = [];
  let sponsorInterval = null;
  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json');
      const fullConfig = await res.json();
      CFG = fullConfig.Player || fullConfig;
      return CFG;
    } catch (e) { 
      CFG = {}; 
      return CFG; 
    }
  }

  // 🔥 LOAD YOUR LOCAL Adblock.js
  async function loadAdblock() {
    if (window.AdblockLoaded) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/LibreWatch/Player/Adblock.js';  // YOUR LOCAL FILE
      script.async = true;
      script.onload = () => {
        console.log('🛡️ Adblock.js LOADED (local)');
        window.AdblockLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.log('⚠️ Adblock.js not found, continuing...');
        resolve(); // Continue even if missing
      };
      document.head.appendChild(script);
    });
  }

  function clearPlayer() {
    if (sponsorInterval) {
      clearInterval(sponsorInterval);
      sponsorInterval = null;
    }
    
    if (currentPlayer && typeof currentPlayer === 'object') {
      try {
        if ('stopVideo' in currentPlayer) currentPlayer.stopVideo();
        if (typeof currentPlayer.destroy === 'function') currentPlayer.destroy();
      } catch (e) {
        console.warn('Player cleanup:', e);
      }
    }
    
    currentPlayer = null;
    sponsorSegments = [];
  }

  function startSponsorWatcher(player) {
    sponsorInterval = setInterval(() => {
      const t = player.getCurrentTime ? player.getCurrentTime() : player.currentTime();
      if (t === undefined || t === null || isNaN(t)) return;
      for (const seg of sponsorSegments) {
        const [start, end] = seg.segment;
        if (t >= start && t < end) {
          if (player.seekTo) player.seekTo(end, true);
          else player.currentTime(end);
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

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container missing');

    // LOAD ORDER: Adblock → Core → Player
    await loadAdblock();     // 🔥 YOUR Adblock.js FIRST
    await loadConfig();
    await loadCore();
    
    clearPlayer();

    console.log('🎥 Creating YouTube player...');
    
    await new Promise(resolve => {
      if (window.YT?.Player) return resolve();
      window.onYouTubeIframeAPIReady = resolve;
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });

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
        origin: window.location.origin
      },
      events: {
        onReady: async () => {
          console.log(`🎬 YouTube Ready + 🛡️ Adblock ACTIVE: ${videoId}`);
          
          if (window.LibreUltra) {
            sponsorSegments = await window.LibreUltra.sponsor(videoId) || [];
            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
            console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments`);
          }
          
          startSponsorWatcher(currentPlayer);
          if (options.autoplay) currentPlayer.playVideo();
        },
        onError: (e) => console.error('YouTube error:', e.data)
      }
    });

    return currentPlayer;
  }

  function destroy() { 
    clearPlayer(); 
  }

  return { create, destroy };
})();
