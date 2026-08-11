"use strict";

/**
 * Playlist Manager for queue management
 * Handles video queue, shuffle, and auto-advance functionality
 */
export class PlaylistManager {
  constructor() {
    this.queue = [];
    this.currentIndex = -1;
    this.isShuffled = false;
    this.originalOrder = null;
  }

  /**
   * Add a video to the playlist
   * @param {string} videoId - YouTube video ID
   * @param {string} title - Optional video title
   * @returns {Promise<Object|null>} Video info or null on failure
   */
  async add(videoId, title = null) {
    // Check if video already in queue
    const exists = this.queue.find(item => item.id === videoId);
    if (exists) {
      return null;
    }

    const videoInfo = {
      id: videoId,
      title: title || await this._fetchTitle(videoId),
      addedAt: Date.now()
    };

    this.queue.push(videoInfo);
    return videoInfo;
  }

  /**
   * Add video from sync (without fetching title)
   * @param {string} videoId - YouTube video ID
   * @param {string} title - Video title from sync
   */
  addFromSync(videoId, title) {
    const exists = this.queue.find(item => item.id === videoId);
    if (exists) return;

    this.queue.push({
      id: videoId,
      title: title || `Video ${this.queue.length + 1}`,
      addedAt: Date.now()
    });
  }

  /**
   * Fetch video title from YouTube
   * @private
   */
  async _fetchTitle(videoId) {
    try {
      // Try to get from oEmbed API
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      
      if (response.ok) {
        const data = await response.json();
        return data.title;
      }
    } catch (err) {
      console.warn('Failed to fetch video title:', err);
    }
    
    return `Video ${this.queue.length + 1}`;
  }

  /**
   * Get all playlist items
   * @returns {Array} Array of video objects
   */
  getAll() {
    return this.queue;
  }

  /**
   * Get video at specific index
   * @param {number} index - Index in queue
   * @returns {Object|null} Video object or null
   */
  get(index) {
    return this.queue[index] || null;
  }

  /**
   * Remove video from playlist
   * @param {number} index - Index to remove
   */
  remove(index) {
    if (index < 0 || index >= this.queue.length) return;
    
    this.queue.splice(index, 1);
    
    // Adjust current index if needed
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      this.currentIndex = Math.min(this.currentIndex, this.queue.length - 1);
    }
  }

  /**
   * Get next video in queue
   * @returns {Object|null} Next video or null
   */
  getNext() {
    if (this.queue.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    return this.queue[this.currentIndex];
  }

  /**
   * Get previous video in queue
   * @returns {Object|null} Previous video or null
   */
  getPrevious() {
    if (this.queue.length === 0) return null;
    
    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    return this.queue[this.currentIndex];
  }

  /**
   * Set current playing video
   * @param {string} videoId - Video ID that's now playing
   */
  setCurrent(videoId) {
    this.currentIndex = this.queue.findIndex(item => item.id === videoId);
  }

  /**
   * Shuffle the playlist
   */
  shuffle() {
    if (this.queue.length <= 1) return;
    
    // Store original order if not already shuffled
    if (!this.isShuffled) {
      this.originalOrder = [...this.queue];
    }
    
    // Fisher-Yates shuffle
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    
    this.isShuffled = true;
  }

  /**
   * Restore original order
   */
  restoreOrder() {
    if (this.originalOrder && this.isShuffled) {
      this.queue = [...this.originalOrder];
      this.isShuffled = false;
      this.originalOrder = null;
    }
  }

  /**
   * Clear the entire playlist
   */
  clear() {
    this.queue = [];
    this.currentIndex = -1;
    this.isShuffled = false;
    this.originalOrder = null;
  }

  /**
   * Get playlist length
   * @returns {number} Number of videos
   */
  length() {
    return this.queue.length;
  }

  /**
   * Check if playlist is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.queue.length === 0;
  }
}
