// Player/playerCore.js
// Minimal, plain JS, JSON-config-friendly, window-based
// NOW with proxy fallback: localhost → your proxies → public proxies

window.LibreUltra = (() => {
  let CFG = null;
  const memory = new Map();
  const inflight = new Map();
  const lastHit = new Map();
  const RATE_LIMIT = 25;
  const INTERVAL = 60000;
  const TTL = 5 * 60 * 1000; // 5 min cache
  const MAX_CACHE = 80;
  const PER_VIDEO_COOLDOWN = 4000;

  let tokens = RATE_LIMIT;
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("libre_ultra") : null;
  if (bc) bc.onmessage = e => { if (e.data === "t" && tokens > 0) tokens--; };
  setInterval(() => tokens = RATE_LIMIT, INTERVAL);

  function allow() { if (tokens <= 0) return false; tokens--; bc?.postMessage("t"); return true; }
  function now() { return performance.now(); }
  function trim() { while (memory.size > MAX_CACHE) memory.delete(memory.keys().next().value); }

  setInterval(() => {
    const t = now();
    for (const [k,v] of memory) if (t - v.t > TTL) memory.delete(k);
  }, 60000);

  async function loadConfig() {
    if (CFG) return CFG;
    try {
      const res = await fetch('/LibreWatch/Player/config.json', { cache: 'no-store' });
      const json = await res.json();
      CFG = json.Player;
      return CFG;
    } catch(e) { 
      console.error('Failed to load config:', e); 
      return null; 
    }
  }

  // Test single proxy - returns working proxy URL or null
  async function testProxy(proxyUrl) {
    try {
      const testTarget = 'https://httpbin.org/status/200';
      const testUrl = proxyUrl + encodeURIComponent(testTarget);
      const res = await fetch(testUrl, { 
        mode: 'no-cors', 
        cache: 'no-store',
        keepalive: true,
        signal: AbortSignal.timeout(3000)
      });
      return res.type === 'basic' || res.status === 200;
    } catch {
      return false;
    }
  }

  // Get first working proxy from chain
  async function getWorkingProxy() {
    const config = await loadConfig();
    if (!config?.Proxy) return null;

    // 1. Try localhost first
    if (config.Proxy.Local) {
      console.log('🧪 Testing local proxy:', config.Proxy.Local);
      if (await testProxy(config.Proxy.Local)) {
        console.log('✅ Using LOCAL proxy:', config.Proxy.Local);
        return config.Proxy.Local;
      }
      console.log('❌ Local proxy failed');
    }

    // 2. Try fallback proxies
    if (config.Proxy.Fallback?.length) {
      for (const proxy of config.Proxy.Fallback) {
        console.log('🧪 Testing fallback:', proxy);
        if (await testProxy(proxy)) {
          console.log('✅ Using fallback proxy:', proxy);
          return proxy;
        }
      }
    }

    console.error('❌ NO working proxies found');
    return null;
  }

  // Fetch URL through working proxy with timeout
  async function fetchViaProxy(url) {
    const proxyUrl = await getWorkingProxy();
    if (!proxyUrl) return null;

    const proxiedUrl = proxyUrl + encodeURIComponent(url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(proxiedUrl, { 
        referrerPolicy: "no-referrer", 
        keepalive: true,
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return res.ok ? res : null;
    } catch (e) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  async function core(key, url) {
    const cached = memory.get(key);
    if (cached && now() - cached.t < TTL) return cached.v;
    if (lastHit.has(key) && now() - lastHit.get(key) < PER_VIDEO_COOLDOWN) return null;
    if (!allow()) return null;
    if (inflight.has(key)) return inflight.get(key);

    lastHit.set(key, now());
    const req = fetchViaProxy(url)
      .then(r => r ? r.json() : null)
      .then(v => { 
        inflight.delete(key); 
        if (v) { memory.set(key, { v, t: now() }); trim(); } 
        return v; 
      })
      .catch(() => { inflight.delete(key); return null; });
      
    inflight.set(key, req);
    return req;
  }

  async function sponsor(videoID) {
    const config = await loadConfig();
    if (!config?.Misc?.sponsorBlock?.API) return [];
    const base = config.Misc.sponsorBlock.API.replace(/\/+$/, '');
    const url = `${base}/api/skipSegments?videoID=${videoID}`;
    console.log('🎯 Fetching SponsorBlock:', url);
    return core(`sb_${videoID}`, url) || [];
  }

  async function dearrow(videoID) {
    const config = await loadConfig();
    if (!config?.Misc?.dearrow?.API || !config.Misc.dearrow?.KEY) return null;
    const base = config.Misc.dearrow.API.replace(/\/+$/, '');
    const url = `${base}/api/branding?videoID=${videoID}&license=${config.Misc.dearrow.KEY}`;
    console.log('🎯 Fetching DeArrow:', url);
    return core(`da_${videoID}`, url);
  }

  function prefetch(videoID) {
    requestIdleCallback?.(() => dearrow(videoID));
  }

  return { sponsor, dearrow, prefetch };
})();
