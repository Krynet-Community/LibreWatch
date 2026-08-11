"use strict";

/**
 * Chat Manager for room communication
 * Handles sending and receiving chat messages
 */
export class ChatManager {
  constructor() {
    this.messages = [];
    this.username = this._generateUsername();
    this.eventListeners = {
      message: []
    };
    
    // Get or create user identity from localStorage
    this._loadIdentity();
  }

  /**
   * Generate random username
   * @private
   */
  _generateUsername() {
    const adjectives = ['Happy', 'Swift', 'Clever', 'Brave', 'Calm', 'Eager', 'Fresh', 'Kind'];
    const nouns = ['Panda', 'Eagle', 'Tiger', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk'];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    
    return `${adj}${noun}${num}`;
  }

  /**
   * Load or create user identity
   * @private
   */
  _loadIdentity() {
    const stored = localStorage.getItem('librewatch_username');
    if (stored) {
      this.username = stored;
    } else {
      localStorage.setItem('librewatch_username', this.username);
    }
  }

  /**
   * Set username
   * @param {string} name - New username
   */
  setUsername(name) {
    this.username = name;
    localStorage.setItem('librewatch_username', name);
  }

  /**
   * Send a chat message
   * @param {string} text - Message text
   */
  send(text) {
    const message = {
      id: this._generateMessageId(),
      text: text.trim(),
      username: this.username,
      timestamp: Date.now(),
      self: true
    };

    // Store locally
    this.messages.push(message);
    
    // Broadcast via BroadcastChannel (for same-browser tabs)
    const bc = new BroadcastChannel('librewatch_chat');
    bc.postMessage(message);
    bc.close();

    // Emit event
    this._emit('message', message);

    return message;
  }

  /**
   * Receive a message from sync
   * @param {Object} data - Message data from sync
   */
  receive(data) {
    const message = {
      ...data,
      self: false
    };

    this.messages.push(message);
    this._emit('message', message);
  }

  /**
   * Get all messages
   * @returns {Array} Array of message objects
   */
  getMessages() {
    return this.messages;
  }

  /**
   * Clear chat history
   */
  clear() {
    this.messages = [];
  }

  /**
   * Generate unique message ID
   * @private
   */
  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Register event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
    return this;
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit event to listeners
   * @private
   */
  _emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }
}
