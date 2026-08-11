"use strict";

const CONFIG_PATH = '../Player/config.json';
const CACHE_NAME = 'librewatch-cache-v1';
const RATE_LIMIT_TOKENS = 25;
const RATE_LIMIT_WINDOW_MS = 60000;
const COOLDOWN_MS = 4000;
const BROADCAST_CHANNEL_NAME = 'libre_ultra_sync';

export class LibreUltraCore {
  constructor() {
    this.config = null;
    this.tokens = RATE_LIMIT_TOKENS;
    this.cooldowns = new Map();
    this.bc = typeof window !== 'undefined' 
      ? new BroadcastChannel(BROADCAST_CHANNEL_NAME) 
      : null;

    this._initRateLimitReset();
    this._initBroadcastListener();
  }

  _initRateLimitReset() {
    setInterval(() => { 
      this.tokens = RATE_LIMIT_TOKENS; 
    }, RATE_LIMIT_WINDOW_MS);
  }

  _initBroadcastListener() {
    if (!this.bc) return;
    
    this.bc.onmessage = (e) => {
      if (e.data === 'DECREMENT' && this.tokens > 0) {
        this.tokens--;
      }
    };
  }

  async getConfig() {
    if (this.config) return this.config;
    
    try {
      const res = await fetch(CONFIG_PATH, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json = await res.json();
      this.config = json.Player;
      return this.config;
    } catch (e) {
      console.error('Failed to load config.json', e);
      return null;
    }
  }

  checkRateLimit(key) {
    const now = performance.now();
    const lastCall = this.cooldowns.get(key);
    
    // Check cooldown period
    if (lastCall && (now - lastCall) < COOLDOWN_MS) {
      return false;
    }
    
    // Check token bucket
    if (this.tokens <= 0) {
      return false;
    }

    this.tokens--;
    this.cooldowns.set(key, now);
    this.bc?.postMessage('DECREMENT');
    return true;
  }

  async getSponsorSegments(videoId) {
    if (!this.checkRateLimit(`sb_${videoId}`)) {
      return [];
    }
    
    try {
      const cfg = await this.getConfig();
      
      // Use default API if config doesn't have it
      let baseApi = 'https://sponsor.ajay.app';
      if (cfg?.Misc?.sponsorBlock?.API) {
        baseApi = cfg.Misc.sponsorBlock.API.replace(/\/+$/, '');
      }
      
      const url = `${baseApi}/api/skipSegments?videoID=${videoId}`;

      return await this._fetchWithCache(url);
    } catch (err) {
      console.error('Failed to fetch sponsor segments:', err);
      return [];
    }
  }

  async _fetchWithCache(url) {
    const cacheStore = await window.caches?.open(CACHE_NAME);
    
    // Try cache first
    if (cacheStore) {
      const cachedResponse = await cacheStore.match(url);
      if (cachedResponse) {
        try {
          return await cachedResponse.json();
        } catch (e) {
          console.warn('Failed to parse cached response:', e);
        }
      }
    }

    // Fetch from network with timeout
    let freshResponse;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      freshResponse = await fetch(url, { 
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
    } catch (err) {
      console.warn('SponsorBlock fetch failed:', err.message);
      return [];
    }
    
    // Handle 404 gracefully (no sponsor segments found)
    if (freshResponse.status === 404) {
      console.log('No sponsor segments found for this video');
      return [];
    }
    
    if (!freshResponse.ok) {
      console.warn(`SponsorBlock API returned status ${freshResponse.status}`);
      return [];
    }

    // Parse JSON
    let data;
    try {
      data = await freshResponse.json();
    } catch (e) {
      console.error('Failed to parse SponsorBlock response:', e);
      return [];
    }

    // Cache the response
    if (cacheStore) {
      try {
        await cacheStore.put(url, freshResponse.clone());
      } catch (e) {
        console.warn('Failed to cache response:', e);
      }
    }

    return data;
  }
}
