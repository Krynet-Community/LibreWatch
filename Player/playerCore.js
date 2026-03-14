window.LibreUltra = (() => {
  'use strict';
  
  let CFG = null;
  const memory = new Map();
  const inflight = new Map();
  const lastHit = new Map();
  const RATE_LIMIT = 25;
  const INTERVAL = 60000;
  const TTL = 5 * 60 * 1000;
  const MAX_CACHE = 80;
  const PER_VIDEO_COOLDOWN = 4000;

  let tokens = RATE_LIMIT;
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("libre_ultra") : null;
  if (bc) {
    bc.onmessage = e => { 
      if (e.data === "t" && tokens > 0) tokens--; 
    };
  }
  
  setInterval(() => tokens = RATE_LIMIT, INTERVAL);

  function allow() { 
    if (tokens <= 0) return false; 
    tokens--; 
    bc?.postMessage("t"); 
    return true; 
  }
  
  function now() { 
    return performance.now(); 
  }
  
  function trim() { 
    while (memory.size > MAX_CACHE) {
      const firstKey = memory.keys().next().value;
      if (firstKey) memory.delete(firstKey);
    }
  }

  setInterval(() => {
    const t = now();
    for (const [k, v] of memory) {
      if (t - v.t > TTL) {
        memory.delete(k);
      }
    }
  }, 60000);

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { 
        cache: 'no-store' 
      });
      const json = await res.json();
      CFG = json.Player;
      return CFG;
    } catch(e) { 
      console.error('Config failed:', e); 
      return null; 
    }
  }

  async function fetchViaProxy(url) {
    const config = await loadConfig();
    const proxies = [
      config?.Proxy?.Local,
      ...(config?.Proxy?.Fallback || [])
    ].filter(Boolean);

    for (const proxy of proxies) {
      try {
        const proxiedUrl = `${proxy}${encodeURIComponent(url)}`;
        const res = await fetch(proxiedUrl, { 
          referrerPolicy: "no-referrer", 
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          console.log(`✅ Using proxy: ${proxy}`);
          return res;
        }
      } catch (e) {
        console.log(`❌ Proxy failed: ${proxy}`);
      }
    }
    return null;
  }

  async function core(key, url) {
    const cached = memory.get(key);
    if (cached && now() - cached.t < TTL) return cached.v;
    
    if (lastHit.has(key) && now() - lastHit.get(key) < PER_VIDEO_COOLDOWN) {
      return null;
    }
    
    if (!allow()) return null;
    
    if (inflight.has(key)) {
      return inflight.get(key);
    }

    lastHit.set(key, now());
    
    const req = fetchViaProxy(url)
      .then(async r => {
        if (!r?.ok) return null;
        try {
          return await r.json();
        } catch {
          return null;
        }
      })
      .then(v => { 
        inflight.delete(key); 
        if (v) {
          memory.set(key, { v, t: now() }); 
        }
        trim(); 
        return v; 
      })
      .catch(() => { 
        inflight.delete(key); 
        return null; 
      });
      
    inflight.set(key, req);
    return req;
  }

  async function sponsor(videoID) {
    const config = await loadConfig();
    if (!config?.Misc?.sponsorBlock?.API) return [];
    
    const base = config.Misc.sponsorBlock.API.replace(/\/+$/, '');
    const url = `${base}/api/skipSegments?videoID=${videoID}`;
    console.log('🎯 SponsorBlock:', videoID);
    return core(`sb_${videoID}`, url) || [];
  }

  async function dearrow(videoID) {
    const config = await loadConfig();
    if (!config?.Misc?.dearrow?.API || !config.Misc.dearrow?.KEY) return null;
    
    const base = config.Misc.dearrow.API.replace(/\/+$/, '');
    const url = `${base}/api/branding?videoID=${videoID}&license=${config.Misc.dearrow.KEY}`;
    console.log('🎯 DeArrow:', videoID);
    return core(`da_${videoID}`, url);
  }

  function prefetch(videoID) {
    if (requestIdleCallback) {
      requestIdleCallback?.(() => dearrow(videoID));
    }
  }

  return { sponsor, dearrow, prefetch };
})();
