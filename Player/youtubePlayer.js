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
      CFG = fullConfig.Player || fullConfig; // Handle both structures
      console.log('✅ Config loaded:', CFG);
      return CFG;
    } catch (e) { 
      console.error('Config failed:', e); 
      CFG = {}; // Initialize empty config
      return CFG; 
    }
  }

  function clearPlayer() {
    if (sponsorInterval) clearInterval(sponsorInterval);
    if (currentPlayer) currentPlayer.destroy?.();
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

  // Safe yt-dlp with fallback endpoint
  async function getYtDlpStream(videoId, quality = 'best[height<=1080]') {
    try {
      const config = await loadConfig();
      
      // Multiple fallback endpoints (no config required)
      const endpoints = [
        config?.APIs?.['yt-dlp'],
        'https://inv.tux.pizza/api/v1',
        'https://ytdl.srv.nagisa.xyz/api',
        config?.Proxy?.Local?.replace(/\/$/, '') + '/ytdl/' + videoId
      ].filter(Boolean);

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 yt-dlp: ${endpoint}`);
          const response = await fetch(`${endpoint}/formats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: `https://youtube.com/watch?v=${videoId}`,
              format: quality
            }),
            signal: AbortSignal.timeout(8000)
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.url) {
              console.log('✅ yt-dlp stream ready!');
              return data.url;
            }
          }
        } catch (e) {
          console.log(`❌ yt-dlp ${endpoint} failed`);
        }
      }
    } catch (e) {
      console.error('yt-dlp failed:', e);
    }
    
    return null; // Graceful fallback
  }

  async function create(containerId, videoId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return console.error('Container missing');

    await loadConfig();
    await loadCore();

    clearPlayer();
    
    // Priority 1: yt-dlp (works without config)
    const ytdlpUrl = await getYtDlpStream(videoId, options.quality || 'best[height<=1080]');
    
    if (ytdlpUrl) {
      return createVideoJsPlayer(containerId, videoId, ytdlpUrl, options, 'yt-dlp');
    }
    
    // Priority 2: Proxied Piped (your existing proxies)
    return createProxiedPipedPlayer(containerId, videoId, options);
  }

  async function createVideoJsPlayer(containerId, videoId, streamUrl, options, source = 'unknown') {
    const container = document.getElementById(containerId);
    
    if (typeof videojs === 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://vjs.zencdn.net/8.10.0/video-js.css';
      document.head.appendChild(link);

      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://vjs.zencdn.net/8.10.0/video.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    container.innerHTML = `
      <video
        id="librewatch-player-${videoId}"
        class="video-js vjs-default-skin vjs-big-play-centered"
        controls
        preload="auto"
        ${options.autoplay ? 'autoplay muted playsinline' : ''}
        crossorigin="anonymous">
        <source src="${streamUrl}" type="${streamUrl.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'}">
      </video>
    `;

    currentPlayer = videojs(`librewatch-player-${videoId}`, {
      fluid: true,
      responsive: true,
      playbackRates: [0.5, 1, 1.25, 1.5, 2],
      html5: {
        hls: { overrideNative: true, withCredentials: false },
        vhs: { overrideNative: true, withCredentials: false }
      }
    });

    await initPlayerReady(currentPlayer, videoId, options, source);
    return currentPlayer;
  }

  async function createProxiedPipedPlayer(containerId, videoId, options) {
    const config = await loadConfig();
    const pipedInstance = config?.UI?.Piped?.['kavin.rocks'] || 
                         config?.UI?.Piped?.Piped || 
                         'https://pipedapi.kavin.rocks/';
    
    const streamUrl = `${pipedInstance}streams/${videoId}/video.m3u8`;
    const proxyStreamUrl = await getProxiedStream(streamUrl);
    
    if (proxyStreamUrl) {
      return createVideoJsPlayer(containerId, videoId, proxyStreamUrl, options, 'piped');
    }
    
    // Direct Piped fallback
    return createVideoJsPlayer(containerId, videoId, streamUrl, options, 'piped-direct');
  }

  async function getProxiedStream(streamUrl) {
    const config = await loadConfig();
    const proxies = [
      config?.Proxy?.Local, 
      ...(config?.Proxy?.Fallback || [])
    ].filter(Boolean);

    for (const proxy of proxies) {
      try {
        const proxiedUrl = `${proxy}${encodeURIComponent(streamUrl)}`;
        const res = await fetch(proxiedUrl, { 
          method: 'HEAD',
          referrerPolicy: "no-referrer", 
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          console.log(`✅ Proxy stream: ${proxy}`);
          return proxiedUrl;
        }
      } catch (e) {
        console.log(`❌ Proxy failed: ${proxy}`);
      }
    }
    return null;
  }

  async function initPlayerReady(player, videoId, options, source) {
    player.ready(async () => {
      console.log(`🎬 ${source.toUpperCase()} Ready: ${videoId}`);

      sponsorSegments = await window.LibreUltra?.sponsor(videoId) || [];
      sponsorSegments.sort((a, b) => a.segment[0] - b.segment[0]);
      
      const dearrowData = await window.LibreUltra?.dearrow(videoId);
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
        }
        if (bestThumb) player.poster(bestThumb.thumbnail);
      }

      startSponsorWatcher(player);
      if (options.autoplay) player.play().catch(console.warn);
    });

    player.on('error', () => {
      console.log(`${source} failed, YouTube fallback`);
      createYouTubeFallback(containerId, videoId, options);
    });
  }

  async function createYouTubeFallback(containerId, videoId, options) {
    const container = document.getElementById(containerId);
    container.innerHTML = '<div id="yt-player"></div>';
    
    await new Promise(resolve => {
      if (window.YT?.Player) return resolve();
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onload = () => window.onYouTubeIframeAPIReady = resolve;
      document.head.appendChild(tag);
    });

    currentPlayer = new YT.Player('yt-player', {
      width: options.width || '640',
      height: options.height || '360',
      videoId,
      playerVars: { autoplay: options.autoplay ? 1 : 0, modestbranding: 1, rel: 0, enablejsapi: 1 },
      events: { 
        onReady: () => {
          console.log(`🎥 YouTube Ready: ${videoId}`);
          sponsorSegments = window.LibreUltra?.sponsor(videoId) || [];
          startSponsorWatcher(currentPlayer);
        }
      }
    });
  }

  function destroy() { clearPlayer(); }

  return { create, destroy };
})();
