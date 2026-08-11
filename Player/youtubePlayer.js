"use strict";

import { LibreUltraCore } from './playerCore.js';

const PLYR_VERSION = '3.7.8';
const PLYR_PRIMARY_CDN = `https://cdn.plyr.io/${PLYR_VERSION}/plyr.js`;
const PLYR_FALLBACK_CDN = `https://cdnjs.cloudflare.com/ajax/libs/plyr/${PLYR_VERSION}/plyr.min.js`;
const PLYR_CSS_URL = `https://cdn.plyr.io/${PLYR_VERSION}/plyr.css`;

/**
 * Loads the Plyr script with CDN fallback support
 * @returns {Promise<void>} Resolves when script is loaded, rejects on failure
 */
function loadPlyrScript() {
  return new Promise((resolve, reject) => {
    if (window.Plyr) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PLYR_PRIMARY_CDN;
    script.async = true;

    script.onload = () => resolve();
    
    script.onerror = () => {
      console.warn("Primary Plyr CDN failed. Attempting cdnjs mirror...");
      
      const fallbackScript = document.createElement('script');
      fallbackScript.src = PLYR_FALLBACK_CDN;
      fallbackScript.async = true;
      fallbackScript.onload = () => resolve();
      fallbackScript.onerror = () => reject(new Error("All Plyr CDNs failed to load"));
      
      document.head.appendChild(fallbackScript);
    };

    document.head.appendChild(script);
  });
}

class PlayerManager {
  constructor() {
    this.player = null;
    this.core = new LibreUltraCore();
    this.segments = [];
    this.isSeeking = false;
  }

  async init(selector) {
    try {
      await loadPlyrScript();
    } catch (err) {
      console.error(err.message);
      alert("Failed to load video engine dependencies. Please refresh or check your connection.");
      return null;
    }

    this._initializePlayer(selector);
    this._attachEventListeners();
    
    return this.player;
  }

  _initializePlayer(selector) {
    this.player = new window.Plyr(selector, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      youtube: { modestbranding: 1, rel: 0, iv_load_policy: 3 }
    });
  }

  _attachEventListeners() {
    this.player.on('timeupdate', () => this.handleTimelineCheck());
    
    this.player.on('ready', () => {
      const currentId = this.player.embed?.getVideoData()?.video_id;
      if (currentId) {
        this.loadSegments(currentId);
      }
    });
  }

  async load(videoId) {
    if (!this.player) return;
    
    this.segments = [];
    this.player.source = {
      type: 'video',
      sources: [{ src: videoId, provider: 'youtube' }]
    };
    
    await this.loadSegments(videoId);
  }

  async loadSegments(videoId) {
    try {
      const data = await this.core.getSponsorSegments(videoId);
      this.segments = data.sort((a, b) => a.segment[0] - b.segment[0]);
    } catch (err) {
      console.error('Failed to load sponsor segments:', err);
      this.segments = [];
    }
  }

  handleTimelineCheck() {
    if (!this.player || this.segments.length === 0 || this.isSeeking) {
      return;
    }
    
    const currentTime = this.player.currentTime;

    for (const seg of this.segments) {
      const [start, end] = seg.segment;
      if (currentTime >= start && currentTime < end) {
        this._skipSegment(end);
        break;
      }
    }
  }

  _skipSegment(endTime) {
    this.isSeeking = true;
    this.player.currentTime = endTime;
    
    // Brief delay to prevent re-triggering
    setTimeout(() => { 
      this.isSeeking = false; 
    }, 50);
  }
}

export const LibreWatchPlayer = new PlayerManager();
