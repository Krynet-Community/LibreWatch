window.LibreUltra = (() => {
  'use strict';

  /* =========================
     CONFIG CACHE
  ========================= */

  let CFG = null;
  let PROXIES = null;

  async function loadConfig() {
    if (CFG) return CFG;

    try {
      const res = await fetch('/LibreWatch/Player/config.json', {
        cache: 'no-store'
      });

      const json = await res.json();
      CFG = json?.Player || null;
      return CFG;

    } catch (e) {
      console.error('[LibreUltra] Config load failed:', e);
      return null;
    }
  }

  async function getProxies() {
    if (PROXIES) return PROXIES;

    const cfg = await loadConfig();

    PROXIES = [
      cfg?.Proxy?.Local,
      cfg?.Proxy?.Cloud,
      ...(cfg?.Proxy?.Fallback || [])
    ].filter(Boolean);

    return PROXIES;
  }

  /* =========================
     RATE LIMIT (time-window based)
  ========================= */

  const RATE_LIMIT = 25;
  const WINDOW = 60_000;

  const timestamps = [];

  function allow() {
    const now = performance.now();

    // prune old
    while (timestamps.length && now - timestamps[0] > WINDOW) {
      timestamps.shift();
    }

    if (timestamps.length >= RATE_LIMIT) return false;

    timestamps.push(now);
    return true;
  }

  /* =========================
     CACHE (LRU-ish)
  ========================= */

  const CACHE_TTL = 5 * 60_000;
  const MAX_CACHE = 80;

  const cache = new Map();

  function cacheGet(key) {
    const hit = cache.get(key);
    if (!hit) return null;

    if (performance.now() - hit.t > CACHE_TTL) {
      cache.delete(key);
      return null;
    }

    // refresh LRU order
    cache.delete(key);
    cache.set(key, hit);

    return hit.v;
  }

  function cacheSet(key, value) {
    cache.set(key, { v: value, t: performance.now() });

    if (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value;
      cache.delete(oldest);
    }
  }

  /* =========================
     INFLIGHT DEDUPE
  ========================= */

  const inflight = new Map();

  /* =========================
     NORMALIZATION
  ========================= */

  function normalizeKey(key) {
    if (!key) return null;
    if (typeof key !== 'string') return null;

    const k = key.trim();

    if (!k || k === 'undefined') return null;
    if (k === 'sb_' || k === 'da_') return null;

    return k;
  }

  /* =========================
     FETCH ENGINE
  ========================= */

  async function fetchViaProxy(url) {
    const proxies = await getProxies();

    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy + encodeURIComponent(url), {
          referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(5000)
        });

        if (!res || res.status >= 400) continue;

        const type = res.headers.get('content-type') || '';
        if (!type.includes('json') && !type.includes('text')) continue;

        return res;

      } catch {
        continue;
      }
    }

    return null;
  }

  /* =========================
     CORE FETCH WRAPPER
  ========================= */

  async function core(key, url) {
    const k = normalizeKey(key);
    if (!k) return null;

    const cached = cacheGet(k);
    if (cached) return cached;

    if (!allow()) return null;

    if (inflight.has(k)) {
      return inflight.get(k);
    }

    const task = (async () => {
      try {
        const res = await fetchViaProxy(url);
        if (!res?.ok) return null;

        const data = await res.json();

        if (data) cacheSet(k, data);

        return data;

      } catch {
        return null;
      } finally {
        inflight.delete(k);
      }
    })();

    inflight.set(k, task);
    return task;
  }

  /* =========================
     SERVICES
  ========================= */

  async function sponsor(videoID) {
    const id = normalizeKey(videoID);
    if (!id || id.length < 5) return [];

    const cfg = await loadConfig();
    const base = cfg?.Misc?.sponsorBlock?.API;
    if (!base) return [];

    const url = `${base.replace(/\/+$/, '')}/api/skipSegments?videoID=${id}`;

    return core(`sb_${id}`, url) || [];
  }

  async function dearrow(videoID) {
    const id = normalizeKey(videoID);
    if (!id || id.length < 5) return null;

    const cfg = await loadConfig();
    const api = cfg?.Misc?.dearrow?.API;
    const key = cfg?.Misc?.dearrow?.KEY;

    if (!api || !key) return null;

    const url =
      `${api.replace(/\/+$/, '')}/api/branding?videoID=${id}&license=${key}`;

    return core(`da_${id}`, url);
  }

  function prefetch(videoID) {
    const id = normalizeKey(videoID);
    if (!id) return;

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => dearrow(id));
    }
  }

  /* =========================
     PUBLIC API
  ========================= */

  return {
    sponsor,
    dearrow,
    prefetch
  };

})();
