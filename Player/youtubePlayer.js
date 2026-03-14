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
      console.error('Config failed:', e); 
      CFG = {}; 
      return CFG; 
    }
  }

  function clearPlayer() {
    if (sponsorInterval) {
      clearInterval(sponsorInterval);
      sponsorInterval = null;
    }
    
    if (currentPlayer && typeof currentPlayer === 'object') {
      try {
        // Stop YouTube player safely
        if ('stopVideo' in currentPlayer) {
          currentPlayer.stopVideo();
        }
        // Try destroy only if it exists and is a function
        if (typeof currentPlayer.destroy === 'function') {
          currentPlayer.destroy();
        }
        // Pause Video.js safely  
        if ('pause' in currentPlayer) {
          currentPlayer.pause();
        }
      } catch (e) {
        console.warn('Player cleanup error (safe to ignore):', e);
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

    await loadConfig();
    await loadCore();
    
    // Safe cleanup before creating new player
    clearPlayer();

    console.log('🎥 Creating YouTube player...');
    
    // Load YouTube API safely
    await new Promise(resolve => {
      if (window.YT?.Player) return resolve();
      
      window.onYouTubeIframeAPIReady = () => {
        resolve();
      };
      
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });

    // Clear container completely
    container.innerHTML = '';
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
          console.log(`🎬 YouTube Ready: ${videoId}`);
          
          if (window.LibreUltra) {
            sponsorSegments = await window.LibreUltra.sponsor(videoId) || [];
            sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
            console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments`);

            const dearrowData = await window.LibreUltra.dearrow(videoId);
            if (dearrowData?.[videoId]) {
              const { titles = [] } = dearrowData[videoId];
              const bestTitle = titles.find(t => t.locked) || titles[0];
              if (bestTitle) {
                document.title = bestTitle.title;
                const titleEl = document.getElementById('videoTitle');
                if (titleEl) {
                  titleEl.textContent = bestTitle.title;
                  titleEl.style.color = '#4ade80';
                  titleEl.style.display = 'block';
                }
              }
            }
          }
          
          startSponsorWatcher(currentPlayer);
          if (options.autoplay) {
            currentPlayer.playVideo();
          }
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
