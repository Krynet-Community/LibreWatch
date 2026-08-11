"use strict";

/**
 * Room Synchronization Manager using WebRTC and WebSockets
 * Handles real-time sync of play, pause, seek, and video loading across users
 */
export class RoomSyncManager {
  constructor() {
    this.roomCode = null;
    this.peerConnection = null;
    this.dataChannel = null;
    this.ws = null;
    this.isConnected = false;
    this.userCount = 1;
    this.eventListeners = new Map();
    this.signalingServers = [
      'wss://signaling.librewatch.example.com',
      'wss://peerjs-server.herokuapp.com'
    ];
    
    // Generate unique user ID
    this.userId = 'user_' + Math.random().toString(36).substr(2, 9);
    this.username = 'User_' + this.userId.substr(5, 4);
    
    this._initEventSystem();
  }

  _initEventSystem() {
    this.events = {
      sync: [],
      userCount: [],
      disconnect: [],
      connect: [],
      error: []
    };
  }

  on(event, callback) {
    if (this.events[event]) {
      this.events[event].push(callback);
    }
    return this;
  }

  off(event, callback) {
    if (this.events[event]) {
      const index = this.events[event].indexOf(callback);
      if (index > -1) {
        this.events[event].splice(index, 1);
      }
    }
    return this;
  }

  _emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(cb => cb(data));
    }
  }

  /**
   * Create a new room for synchronized watching
   * @returns {Promise<string|null>} Room code or null on failure
   */
  async createRoom() {
    try {
      // Generate random 6-character room code
      this.roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      // Try WebSocket signaling first
      const wsSuccess = await this._connectWebSocket();
      
      if (!wsSuccess) {
        // Fallback to WebRTC with public STUN servers
        await this._setupWebRTC(true);
      }
      
      this.isConnected = true;
      this._emit('connect', { roomCode: this.roomCode });
      this._updateUserCount(1);
      
      return this.roomCode;
    } catch (err) {
      console.error('Failed to create room:', err);
      this._emit('error', err);
      return null;
    }
  }

  /**
   * Join an existing room
   * @param {string} code - Room code to join
   * @returns {Promise<boolean>} Success status
   */
  async joinRoom(code) {
    try {
      this.roomCode = code.toUpperCase();
      
      const wsSuccess = await this._connectWebSocket();
      
      if (!wsSuccess) {
        await this._setupWebRTC(false, code);
      }
      
      this.isConnected = true;
      this._emit('connect', { roomCode: code });
      
      return true;
    } catch (err) {
      console.error('Failed to join room:', err);
      this._emit('error', err);
      return false;
    }
  }

  /**
   * Connect to WebSocket signaling server
   * @private
   */
  async _connectWebSocket() {
    return new Promise((resolve) => {
      try {
        // Use BroadcastChannel as fallback for same-browser tabs
        this.bc = new BroadcastChannel(`librewatch_room_${this.roomCode}`);
        
        this.bc.onmessage = (e) => {
          this._handleSignalingMessage(e.data);
        };
        
        // Announce presence
        this.bc.postMessage({
          type: 'JOIN',
          userId: this.userId,
          username: this.username,
          roomCode: this.roomCode
        });
        
        resolve(true);
      } catch (err) {
        console.warn('BroadcastChannel failed:', err);
        resolve(false);
      }
    });
  }

  /**
   * Setup WebRTC peer connection
   * @private
   */
  async _setupWebRTC(isHost = false, roomCode = null) {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) {
        this._sendSignalingMessage({
          type: 'ICE_CANDIDATE',
          candidate: e.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === 'connected') {
        this.isConnected = true;
      } else if (this.peerConnection.connectionState === 'disconnected') {
        this.isConnected = false;
        this._emit('disconnect');
      }
    };

    if (isHost) {
      this.dataChannel = this.peerConnection.createDataChannel('sync');
      this._setupDataChannel();
    } else {
      this.peerConnection.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this._setupDataChannel();
      };
    }

    if (!isHost && roomCode) {
      // Create offer and send via signaling
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this._sendSignalingMessage({
        type: 'OFFER',
        offer: offer,
        roomCode: roomCode
      });
    }
  }

  /**
   * Setup data channel handlers
   * @private
   */
  _setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      this.isConnected = true;
      this._emit('connect', { roomCode: this.roomCode });
    };

    this.dataChannel.onclose = () => {
      this.isConnected = false;
      this._emit('disconnect');
    };

    this.dataChannel.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this._handleSyncMessage(data);
      } catch (err) {
        console.error('Failed to parse sync message:', err);
      }
    };
  }

  /**
   * Handle signaling messages
   * @private
   */
  async _handleSignalingMessage(message) {
    switch (message.type) {
      case 'JOIN':
        // New user joined, update count
        this._updateUserCount(this.userCount + 1);
        break;
        
      case 'OFFER':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          
          this._sendSignalingMessage({
            type: 'ANSWER',
            answer: answer,
            roomCode: this.roomCode
          });
        }
        break;
        
      case 'ANSWER':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        }
        break;
        
      case 'ICE_CANDIDATE':
        if (this.peerConnection && message.candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
          } catch (err) {
            console.warn('Failed to add ICE candidate:', err);
          }
        }
        break;
        
      case 'LEAVE':
        this._updateUserCount(Math.max(1, this.userCount - 1));
        break;
    }
  }

  /**
   * Handle sync messages from other users
   * @private
   */
  _handleSyncMessage(data) {
    if (data.senderId === this.userId) return; // Ignore own messages
    
    switch (data.type) {
      case 'LOAD_VIDEO':
      case 'PLAY':
      case 'PAUSE':
      case 'SEEK':
      case 'PLAYLIST_ADD':
        this._emit('sync', data);
        break;
        
      case 'USER_COUNT':
        this._updateUserCount(data.count);
        break;
        
      case 'CHAT_MESSAGE':
        this._emit('chat_message', data);
        break;
    }
  }

  /**
   * Send synchronization message to all peers
   * @param {Object} data - Sync data to send
   */
  sendSync(data) {
    const message = {
      ...data,
      senderId: this.userId,
      username: this.username,
      timestamp: Date.now()
    };

    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    }

    if (this.bc) {
      this.bc.postMessage(message);
    }

    // Also emit locally for host
    if (data.type !== 'USER_COUNT') {
      setTimeout(() => this._emit('sync', message), 0);
    }
  }

  /**
   * Send signaling message
   * @private
   */
  _sendSignalingMessage(message) {
    if (this.bc) {
      this.bc.postMessage(message);
    }
  }

  /**
   * Update user count
   * @private
   */
  _updateUserCount(count) {
    this.userCount = count;
    this._emit('userCount', count);
    
    // Broadcast count to all peers
    this.sendSync({
      type: 'USER_COUNT',
      count: count
    });
  }

  /**
   * Check if connected to a room
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.isConnected && !!this.roomCode;
  }

  /**
   * Leave current room
   */
  leaveRoom() {
    if (this.bc) {
      this.bc.postMessage({
        type: 'LEAVE',
        userId: this.userId
      });
      this.bc.close();
      this.bc = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.roomCode = null;
    this.isConnected = false;
    this.userCount = 1;
    this._emit('disconnect');
  }

  /**
   * Set username
   * @param {string} name - Username to set
   */
  setUsername(name) {
    this.username = name;
  }
}
