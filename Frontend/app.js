"use strict";

import { extractVideoID } from '../Player/extract.js';
import { LibreWatchPlayer } from '../Player/youtubePlayer.js';
import { RoomSyncManager } from '../Player/roomSync.js';
import { PlaylistManager } from '../Player/playlist.js';
import { ChatManager } from '../Player/chat.js';

const roomSync = new RoomSyncManager();
const playlist = new PlaylistManager();
const chat = new ChatManager();
const playerElement = '#player';

// DOM Elements - will be initialized after DOM is ready
let videoInput, loadBtn, roomCodeInput, joinRoomBtn, createRoomBtn, copyRoomBtn;
let roomCodeDisplay, roomStatusIndicator, roomStatusText, userCountEl;
let playlistInput, addToPlaylistBtn, playlistContainer, shuffleBtn, clearPlaylistBtn;
let chatInput, chatMessages, sendChatBtn, toastContainer;

function initDOMElements() {
  videoInput = document.getElementById('videoInput');
  loadBtn = document.getElementById('loadBtn');
  roomCodeInput = document.getElementById('roomCodeInput');
  joinRoomBtn = document.getElementById('joinRoomBtn');
  createRoomBtn = document.getElementById('createRoomBtn');
  copyRoomBtn = document.getElementById('copyRoomBtn');
  roomCodeDisplay = document.getElementById('roomCodeDisplay');
  roomStatusIndicator = document.getElementById('roomStatusIndicator');
  roomStatusText = document.getElementById('roomStatusText');
  userCountEl = document.getElementById('userCount');
  playlistInput = document.getElementById('playlistInput');
  addToPlaylistBtn = document.getElementById('addToPlaylistBtn');
  playlistContainer = document.getElementById('playlistContainer');
  shuffleBtn = document.getElementById('shuffleBtn');
  clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
  chatInput = document.getElementById('chatInput');
  chatMessages = document.getElementById('chatMessages');
  sendChatBtn = document.getElementById('sendChatBtn');
  toastContainer = document.getElementById('toastContainer');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function handleLoadVideo(videoId) {
  const id = typeof videoId === 'string' ? videoId : extractVideoID(videoInput.value.trim());
  
  if (!id) {
    showToast('Invalid video ID or URL', 'error');
    return false;
  }
  
  try {
    console.log('Loading video:', id);
    await LibreWatchPlayer.load(id);
    
    // Only send sync if actually connected to a room
    if (roomSync && typeof roomSync.isConnected === 'function' && roomSync.isConnected()) {
      roomSync.sendSync({ type: 'LOAD_VIDEO', videoId: id, timestamp: Date.now() });
    }
    
    showToast('Video loaded successfully');
    return true;
  } catch (err) {
    console.error('Failed to load video:', err);
    showToast('Failed to load video', 'error');
    return false;
  }
}

createRoomBtn.addEventListener('click', async () => {
  const roomCode = await roomSync.createRoom();
  if (roomCode) {
    roomCodeDisplay.textContent = roomCode;
    roomCodeDisplay.style.display = 'block';
    roomCodeInput.value = roomCode;
    updateRoomStatus(true);
    showToast(`Room created: ${roomCode}`);
  } else {
    showToast('Failed to create room', 'error');
  }
});

joinRoomBtn.addEventListener('click', async () => {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    showToast('Please enter a room code', 'error');
    return;
  }
  
  const success = await roomSync.joinRoom(code);
  if (success) {
    roomCodeDisplay.textContent = code;
    roomCodeDisplay.style.display = 'block';
    updateRoomStatus(true);
    showToast(`Joined room: ${code}`);
  } else {
    showToast('Failed to join room', 'error');
  }
});

copyRoomBtn.addEventListener('click', () => {
  const code = roomCodeDisplay.textContent;
  if (code) {
    navigator.clipboard.writeText(code)
      .then(() => showToast('Room code copied!'))
      .catch(() => showToast('Failed to copy', 'error'));
  }
});

function updateRoomStatus(connected, users = 0) {
  if (connected) {
    roomStatusIndicator.classList.add('connected');
    roomStatusText.textContent = 'Connected';
    userCountEl.textContent = `${users} user${users !== 1 ? 's' : ''} online`;
  } else {
    roomStatusIndicator.classList.remove('connected');
    roomStatusText.textContent = 'Not connected';
    userCountEl.textContent = '';
  }
}

roomSync.on('sync', async (data) => {
  switch (data.type) {
    case 'LOAD_VIDEO':
      if (data.videoId) {
        await LibreWatchPlayer.load(data.videoId);
        if (data.currentTime) LibreWatchPlayer.seekTo(data.currentTime);
      }
      break;
    case 'PLAY':
      LibreWatchPlayer.play();
      break;
    case 'PAUSE':
      LibreWatchPlayer.pause();
      break;
    case 'SEEK':
      LibreWatchPlayer.seekTo(data.currentTime);
      break;
  }
});

roomSync.on('userCount', (count) => updateRoomStatus(true, count));
roomSync.on('disconnect', () => {
  updateRoomStatus(false);
  showToast('Disconnected from room', 'error');
});

LibreWatchPlayer.on('play', () => {
  if (roomSync && typeof roomSync.isConnected === 'function' && roomSync.isConnected()) {
    roomSync.sendSync({ type: 'PLAY', timestamp: Date.now() });
  }
});

LibreWatchPlayer.on('pause', () => {
  if (roomSync && typeof roomSync.isConnected === 'function' && roomSync.isConnected()) {
    roomSync.sendSync({ type: 'PAUSE', timestamp: Date.now() });
  }
});

LibreWatchPlayer.on('seek', (time) => {
  if (roomSync && typeof roomSync.isConnected === 'function' && roomSync.isConnected()) {
    roomSync.sendSync({ type: 'SEEK', currentTime: time, timestamp: Date.now() });
  }
});

LibreWatchPlayer.on('videoEnded', async () => {
  const nextVideo = playlist.getNext();
  if (nextVideo) {
    await handleLoadVideo(nextVideo.id);
    showToast(`Now playing: ${nextVideo.title}`);
  }
});

addToPlaylistBtn.addEventListener('click', async () => {
  const url = playlistInput.value.trim();
  const videoId = extractVideoID(url);
  
  if (!videoId) {
    showToast('Invalid YouTube URL', 'error');
    return;
  }
  
  const videoInfo = await playlist.add(videoId);
  if (videoInfo) {
    renderPlaylist();
    playlistInput.value = '';
    showToast('Added to playlist');
    
    if (roomSync && typeof roomSync.isConnected === 'function' && roomSync.isConnected()) {
      roomSync.sendSync({ type: 'PLAYLIST_ADD', videoId, title: videoInfo.title });
    }
  } else {
    showToast('Failed to add video', 'error');
  }
});

playlistInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addToPlaylistBtn.click();
});

function renderPlaylist() {
  const items = playlist.getAll();
  
  if (items.length === 0) {
    playlistContainer.innerHTML = '<div class="playlist-empty">No videos in queue</div>';
    return;
  }
  
  const currentVideoId = LibreWatchPlayer.getCurrentVideoId();
  playlistContainer.innerHTML = items.map((item, index) => `
    <div class="playlist-item ${item.id === currentVideoId ? 'active' : ''}" data-index="${index}">
      <img class="playlist-item-thumbnail" src="https://img.youtube.com/vi/${item.id}/default.jpg" alt="" />
      <div class="playlist-item-info">
        <div class="playlist-item-title">${escapeHtml(item.title || 'Video ' + (index + 1))}</div>
      </div>
      <button class="playlist-item-remove" data-index="${index}">×</button>
    </div>
  `).join('');
  
  playlistContainer.querySelectorAll('.playlist-item').forEach(el => {
    el.addEventListener('click', async (e) => {
      if (e.target.classList.contains('playlist-item-remove')) {
        const index = parseInt(e.target.dataset.index);
        playlist.remove(index);
        renderPlaylist();
        e.stopPropagation();
      } else {
        const index = parseInt(el.dataset.index);
        const video = playlist.get(index);
        if (video) {
          await handleLoadVideo(video.id);
        }
      }
    });
  });
}

shuffleBtn.addEventListener('click', () => {
  playlist.shuffle();
  renderPlaylist();
  showToast('Playlist shuffled');
});

clearPlaylistBtn.addEventListener('click', () => {
  playlist.clear();
  renderPlaylist();
  showToast('Playlist cleared');
});

roomSync.on('playlist_add', (data) => {
  playlist.addFromSync(data.videoId, data.title);
  renderPlaylist();
});

sendChatBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  
  chat.send(text);
  chatInput.value = '';
}

chat.on('message', (msg) => appendChatMessage(msg));

function appendChatMessage(msg) {
  const div = document.createElement('div');
  div.className = `chat-message ${msg.self ? 'self' : ''}`;
  div.innerHTML = `
    <span class="timestamp">${formatTime(msg.timestamp)}</span>
    <div class="username">${escapeHtml(msg.username)}</div>
    <div class="text">${escapeHtml(msg.text)}</div>
  `;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function initApp() {
  try {
    console.log('Initializing LibreWatch...');
    
    // Initialize DOM elements first
    initDOMElements();
    
    await LibreWatchPlayer.init(playerElement);
    
    const initialVideoId = extractVideoID(videoInput.value.trim());
    if (initialVideoId) {
      console.log('Loading initial video:', initialVideoId);
      await LibreWatchPlayer.load(initialVideoId);
    }
    
    loadBtn.addEventListener('click', () => handleLoadVideo());
    videoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLoadVideo();
    });
    
    renderPlaylist();
    showToast('LibreWatch ready!');
  } catch (err) {
    console.error("Initialization failed:", err);
    showToast('Failed to initialize player', 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
