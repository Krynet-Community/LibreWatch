// Player/playerCore.js - FIXED DeArrow JSON parsing
window.LibreUltra = (() => {
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
    } catch(e) { console.error('Failed to load config:', e); return null; }
  }

  async function getWorkingProxy() {
    const config = await loadConfig();
    const proxies = [
      config?.Proxy?.Local,
      ...(config?.Proxy?.Fallback || [])
    ].filter(Boolean);

    for (const proxy of proxies) {
      try {
        const testUrl = `${proxy}${encodeURIComponent('https://sponsor.ajay.app/api/skipSegments?videoID=dQw4w9WgXcQ')}`;
        const res = await fetch(testUrl, {signal: AbortSignal.timeout(4000)});
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            console.log('✅ Proxy works:', proxy);
            return proxy;
          }
        }
      } catch (e) {}
    }
    return null;
  }

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

  // FIXED: Handle BOTH SponsorBlock arrays AND DeArrow objects
  async function core(key, url) {
    const cached = memory.get(key);
    if (cached && now() - cached.t < TTL) return cached.v;
    if (lastHit.has(key) && now() - cached.t < PER_VIDEO_COOLDOWN) return null;
    if (!allow()) return null;
    if (inflight.has(key)) return inflight.get(key);

    lastHit.set(key, now());
    const req = fetchViaProxy(url)
      .then(async (r) => {
        if (!r || !r.ok) return null;
        try {
          const data = await r.json();
          // SponsorBlock: [] array    ✅
          // DeArrow: {videoID: {...}} object ✅
          if (data && (Array.isArray(data) || (data && typeof data === 'object' && data[0]))) {
            inflight.delete(key);
            memory.set(key, { v: data, t: now() });
            trim();
            return data;
          }
        } catch (e) {
          console.error('JSON parse failed:', e);
        }
        inflight.delete(key);
        return null;
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
