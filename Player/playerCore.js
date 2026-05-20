window.LibreUltra = (() => {
  'use strict';

  /* =========================
     CONFIG
  ========================= */

  let CFG = null;

  async function loadConfig() {
    if (CFG) return CFG;

    try {
      const res = await fetch('/LibreWatch/Player/config.json', {
        cache: 'no-store'
      });

      const json = await res.json();
      CFG = json?.Player || {};
      return CFG;

    } catch {
      CFG = {};
      return CFG;
    }
  }

  /* =========================
     SIMPLE CACHE
  ========================= */

  const cache = new Map();
  const TTL = 5 * 60_000;

  function cacheGet(key) {
    const hit = cache.get(key);
    if (!hit) return null;

    if (Date.now() - hit.t > TTL) {
      cache.delete(key);
      return null;
    }

    return hit.v;
  }

  function cacheSet(key, value) {
    cache.set(key, { v: value, t: Date.now() });
  }

  /* =========================
     RATE LIMIT (simple window)
  ========================= */

  const LIMIT = 25;
  const WINDOW = 60_000;
  const hits = [];

  function allowed() {
    const now = Date.now();

    while (hits.length && now - hits[0] > WINDOW) {
      hits.shift();
    }

    if (hits.length >= LIMIT) return false;

    hits.push(now);
    return true;
  }

  /* =========================
     PROXY LIST (STATIC FALLBACKS)
  ========================= */

  function getProxyList(cfg) {
    return [
      cfg?.Proxy?.Local,
      cfg?.Proxy?.Cloud,
      ...(cfg?.Proxy?.Fallback || [])
    ].filter(Boolean);
  }

  /* =========================
     FETCH WITH FALLBACK
  ========================= */

  async function fetchWithFallback(url) {
    const cfg = await loadConfig();
    const proxies = getProxyList(cfg);

    for (const endpoint of proxies) {
      try {
        const res = await fetch(endpoint + encodeURIComponent(url), {
          referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(5000)
        });

        if (res?.ok) {
          const type = res.headers.get('content-type') || '';
          if (type.includes('json') || type.includes('text')) {
            return res;
          }
        }

      } catch {
        // silent fallback
      }
    }

    return null;
  }

  /* =========================
     CORE REQUEST
  ========================= */

  async function core(key, url) {
    if (!key || typeof key !== 'string') return null;

    const cached = cacheGet(key);
    if (cached) return cached;

    if (!allowed()) return null;

    const res = await fetchWithFallback(url);
    if (!res?.ok) return null;

    try {
      const data = await res.json();
      if (data) cacheSet(key, data);
      return data;
    } catch {
      return null;
    }
  }

  /* =========================
     SERVICES
  ========================= */

  async function sponsor(videoID) {
    if (!videoID || typeof videoID !== 'string') return [];

    const cfg = await loadConfig();
    const base = cfg?.Misc?.sponsorBlock?.API;
    if (!base) return [];

    const url =
      `${base.replace(/\/+$/, '')}/api/skipSegments?videoID=${videoID}`;

    return core(`sb_${videoID}`, url) || [];
  }

  async function dearrow(videoID) {
    if (!videoID || typeof videoID !== 'string') return null;

    const cfg = await loadConfig();
    const api = cfg?.Misc?.dearrow?.API;
    const key = cfg?.Misc?.dearrow?.KEY;

    if (!api || !key) return null;

    const url =
      `${api.replace(/\/+$/, '')}/api/branding?videoID=${videoID}&license=${key}`;

    return core(`da_${videoID}`, url);
  }

  function prefetch(videoID) {
    if (!videoID) return;

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => dearrow(videoID));
    }
  }

  return {
    sponsor,
    dearrow,
    prefetch
  };

})();
