<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:111827,35:1E3A8A,70:2563EB,100:38BDF8&height=200&section=header&text=LibreWatch&fontSize=42&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Community-maintained%20continuation&descAlignY=58" />
</p>

<h1 align="center">LibreWatch</h1>

<p align="center">
Community continuation of the original <strong>LibreWatch</strong> project started by <strong>Krynet, LLC</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue">
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E">
  <img src="https://img.shields.io/badge/Status-Community%20Maintained-success">
  <img src="https://img.shields.io/badge/Origin-Krynet%2C%20LLC-2563EB">
</p>

> [!NOTE]
> **LibreWatch was originally created by Krynet, LLC as an open-source YouTube "Watch Together" framework for the Krynet ecosystem.**
>
> The Krynet Team publicly released the project under **AGPL-3.0** and stated that future development would be community-driven. This repository continues that effort independently.

---

## 📖 About

LibreWatch is an open-source framework for building privacy-friendly YouTube watch experiences.

Originally designed as a foundation for synchronized media playback within the Krynet ecosystem, LibreWatch provides a lightweight vanilla JavaScript architecture for YouTube playback, room synchronization, playlist management, chat, and playback enhancements.

The project is designed to remain **self-hostable, dependency-light, and community-maintained**.

---

## ✨ Features

### 🎥 YouTube Playback

* YouTube playback through **Plyr 3.7.8**
* Dynamically loads Plyr from a primary CDN with an automatic fallback CDN
* Standard playback controls:

  * ▶️ Play
  * ⏸️ Pause
  * ⏩ Progress / seeking
  * 🔊 Volume / mute
  * 🖥️ Fullscreen
  * ⏱️ Current playback time
* Load videos from:

  * YouTube URLs
  * YouTube Shorts URLs
  * YouTube embed URLs
  * `youtu.be` URLs
  * Piped URLs
  * Invidious URLs
  * Raw 11-character YouTube video IDs

### 🧹 URL Privacy

LibreWatch includes dynamic **ClearURLs** integration.

* Fetches the global ClearURLs ruleset at runtime
* Compiles provider-specific URL rules
* Removes known tracking query parameters
* Applies provider raw URL-cleaning rules
* Honors provider exceptions
* Removes tracking hashes containing patterns such as:

  * `utm_*`
  * `fbclid`
  * `gclid`
* Keeps the original URL when it cannot safely be parsed

This allows YouTube URLs to be cleaned before their video IDs are extracted.

### 🛡️ SponsorBlock

LibreWatch integrates SponsorBlock for automatic sponsor-segment skipping.

* Retrieves SponsorBlock segments for the current video
* Uses configurable SponsorBlock API endpoints
* Falls back to `https://sponsor.ajay.app` when no custom endpoint is configured
* Sorts segments chronologically
* Automatically seeks past detected sponsor segments during playback
* Handles videos with no available segments gracefully
* Uses browser caching for previously retrieved segment data
* Uses a 5-second network timeout
* Uses `no-referrer` when requesting SponsorBlock data

SponsorBlock requests are protected by built-in request controls:

* 25-token request bucket
* 60-second token reset
* 4-second per-video cooldown
* Cross-tab request coordination through `BroadcastChannel`

### 👥 Watch Rooms

LibreWatch includes a room-based synchronization interface.

* Create watch rooms
* Join rooms using a room code
* Display the current room code
* Copy room codes to the clipboard
* Display connection status
* Display the number of users currently online
* Handle room disconnection events

Playback actions can be synchronized between connected room participants:

* 🎬 Video loading
* ▶️ Play
* ⏸️ Pause
* ⏩ Seeking
* 🕐 Playback position

### 📋 Playlist

LibreWatch includes a full client-side playlist manager.

* Add YouTube videos to a queue
* Prevent duplicate videos
* Automatically retrieve video titles through YouTube's oEmbed endpoint
* Add synchronized playlist entries without repeating title lookups
* Display video thumbnails
* Display video titles
* Highlight the currently playing video
* Remove individual videos
* Move to the next video
* Move to the previous video
* Automatically advance when a video ends
* Shuffle using Fisher-Yates
* Restore the original playlist order after shuffling
* Clear the entire queue
* Track the current playlist position

Playlist additions can also be synchronized with connected rooms.

### 💬 Chat

LibreWatch includes a lightweight chat manager and UI.

* Random anonymous usernames
* Persistent username identity through `localStorage`
* Custom username support
* Message timestamps
* Local/self message styling
* Message history stored in memory
* 500-character UI input limit
* Same-browser tab communication through `BroadcastChannel`
* Event-based message handling

### 🔔 UI Notifications

The application includes a lightweight toast system for status feedback.

Notifications are used for events such as:

* Video loaded successfully
* Invalid URLs
* Failed video loads
* Room creation
* Room joining
* Room disconnection
* Playlist additions
* Playlist clearing
* Playlist shuffling
* Room-code copying
* Player initialization failures

### 📱 Responsive Interface

The included interface adapts to different screen sizes.

* Desktop two-column layout
* Mobile single-column layout
* Responsive player
* Responsive controls
* Mobile-friendly buttons and inputs
* Adjustable playlist and chat heights
* Dark UI with CSS custom properties

---

## 🏗️ Architecture

LibreWatch is intentionally split into small, focused JavaScript modules.

```text
LibreWatch
├── Player/
│   ├── playerCore.js
│   ├── youtubePlayer.js
│   ├── extract.js
│   ├── playlist.js
│   ├── chat.js
│   └── roomSync.js
│
├── Player/config.json
│
└── Web UI
    ├── index.html
    └── app.js
```

### Core responsibilities

| Module             | Responsibility                                                      |
| ------------------ | ------------------------------------------------------------------- |
| `extract.js`       | URL cleaning and YouTube video ID extraction                        |
| `playerCore.js`    | Configuration, SponsorBlock, caching, and request limiting          |
| `youtubePlayer.js` | Plyr initialization, YouTube playback, events, and sponsor skipping |
| `playlist.js`      | Queue management, navigation, shuffle, and auto-advance             |
| `chat.js`          | User identity and chat message management                           |
| `roomSync.js`      | Room creation, joining, and synchronization                         |
| `app.js`           | Connects the UI and application modules                             |
| `config.json`      | Player-related configuration                                        |

The architecture uses browser-native APIs where practical, including:

* `fetch`
* `URL`
* `localStorage`
* `BroadcastChannel`
* `Cache API`
* `AbortController`
* `navigator.clipboard`

---

## 🛣️ Roadmap

LibreWatch already contains the foundation for synchronized watch sessions, playlist management, and enhanced YouTube playback.

Future community work may include:

* 🔄 More robust Watch Together synchronization
* 💬 Full room-based chat synchronization
* 📜 Persistent / shared playlists
* 👥 Improved participant management
* 🔐 Additional privacy protections
* 🎨 UI and accessibility improvements
* ⚡ Performance optimizations
* 📡 Improved synchronization reliability
* 🧪 Automated testing
* 🐞 Bug fixes and compatibility improvements
* ⚙️ Additional player configuration options

---

## 🤝 Contributing

LibreWatch was intentionally released as a community project.

Contributions are welcome across the entire stack, including:

* Player functionality
* Watch-room synchronization
* Playlist features
* Chat
* Privacy improvements
* UI/UX
* Accessibility
* Performance
* Documentation
* Bug fixes
* Testing

Keep changes focused and understandable. LibreWatch is intended to remain approachable for contributors rather than becoming an unnecessarily complicated framework.

---

## 🔗 Official Krynet

Official Krynet resources:

* 🌐 https://krynet.ai
* 📦 https://codeberg.org/Krynet-LLC
* 💻 https://gitlab.com/Krynet-Team

LibreWatch is a **community-maintained continuation** and is not presented as an official Krynet project.

---

## 📄 License

Licensed under **AGPL-3.0**.

Original project by **Krynet, LLC**. Community continuation maintained independently.

---

<p align="center">

❤️ Continuing an open-source project that was built to be community-driven.

</p>
