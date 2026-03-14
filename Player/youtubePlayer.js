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

  async function loadVideoJs() {
    if (typeof videojs !== 'undefined') return Promise.resolve();
    
    return Promise.all([
      new Promise((resolve, reject) => {
        if (document.querySelector('link[href*="video-js.css"]')) return resolve();
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://vjs.zencdn.net/8.10.0/video-js.css';
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      }),
      new Promise((resolve, reject) => {
        if (typeof videojs !== 'undefined') return resolve();
        const script = document.createElement('script');
        script.src = 'https://vjs.zencdn.net/8.10.0/video.min.js';
        script.onload = () => {
          if (typeof videojs !== 'undefined') resolve();
          else reject('Video.js failed to load');
        };
        script.onerror = reject;
        document.head.appendChild(script);
      })
    ]);
  }

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container missing');

    await loadConfig();
    await loadCore();
    await loadVideoJs(); // Add Video.js support

    clearPlayer();
    
    // Check if stream URL provided or get from config/Piped/Invidious
    let streamUrl = options.streamUrl;
    if (!streamUrl) {
      const config = await loadConfig();
      const pipedInstance = config?.UI?.Piped?.['kavin.rocks'] || 'https://pipedapi.kavin.rocks/';
      streamUrl = `${pipedInstance}streams/${videoId}/video.m3u8`;
    }

    // Create Video.js HTML5 player
    container.innerHTML = `
      <video
        id="librewatch-player-${videoId}"
        class="video-js vjs-default-skin vjs-big-play-centered"
        controls
        preload="auto"
        ${options.autoplay ? 'autoplay' : ''}
        data-setup='{}'>
        <source src="${streamUrl}" type="application/x-mpegURL">
        <p class="vjs-no-js">Please enable JavaScript to use this player</p>
      </video>
    `;

    // Initialize Video.js player
    currentPlayer = videojs(`librewatch-player-${videoId}`, {
      fluid: true,
      responsive: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      html5: {
        hls: { overrideNative: true },
        vhs: { overrideNative: !window.MediaSource }
      },
      ...options
    });

    currentPlayer.ready(async () => {
      console.log(`🎬 Video.js Ready: ${videoId}`);

      // SponsorBlock integration
      sponsorSegments = await window.LibreUltra.sponsor(videoId) || [];
      sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
      console.log(`✅ SponsorBlock: ${sponsorSegments.length} segments`);

      // DeArrow integration (same as before)
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
          console.log('📝 DeArrow Title:', bestTitle.title);
        }
        
        if (bestThumb) {
          currentPlayer.poster(bestThumb.thumbnail);
        }
      }

      // SponsorBlock for Video.js (modified watcher)
      startSponsorWatcherVideoJs(currentPlayer);
      
      if (options.autoplay) {
        currentPlayer.play().catch(e => console.warn('Autoplay failed:', e));
      }
    });

    currentPlayer.on('error', () => {
      console.error('Video.js player error, falling back to YouTube iframe');
      createYouTubeFallback(containerId, videoId, options);
    });

    return currentPlayer;
  }

  // Video.js SponsorBlock watcher (adapts existing logic)
  function startSponsorWatcherVideoJs(player) {
    sponsorInterval = setInterval(() => {
      const t = player.currentTime();
      if (isNaN(t)) return;
      
      for (const seg of sponsorSegments) {
        const [start, end] = seg.segment;
        if (t >= start && t < end) {
          player.currentTime(end);
          console.log(`⏭️ Skipped ${seg.category}: ${start.toFixed(1)}s`);
          break;
        }
      }
    }, 250);
  }

  // Fallback to original YouTube player if Video.js fails
  async function createYouTubeFallback(containerId, videoId, options) {
    await loadYouTubeAPI();
    
    currentPlayer = new YT.Player(containerId, {
      height: options.height || '360',
      width: options.width || '640',
      videoId,
      playerVars: { 
        autoplay: options.autoplay ? 1 : 0, 
        modestbranding: 1, 
        rel: 0, 
        enablejsapi: 1 
      },
      events: {
        onReady: () => {
          console.log(`🎥 YouTube Fallback Ready: ${videoId}`);
          sponsorSegments = window.LibreUltra.sponsor(videoId) || [];
          sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
          startSponsorWatcher(currentPlayer);
        }
      }
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

  function destroy() { 
    clearPlayer(); 
  }

  return { create, destroy };
})();
