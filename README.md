<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:111827,35:1E3A8A,70:2563EB,100:38BDF8&height=220&section=header&text=LibreWatch&fontSize=46&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Independent%20Community%20Continuation&descAlignY=58" />
</p>

<p align="center">
  <strong>📺 Watch Together • 🛡️ Privacy • 🔓 Open Source • 🤝 Community</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg">
  <img src="https://img.shields.io/badge/Language-JavaScript-F7DF1E.svg">
  <img src="https://img.shields.io/badge/Status-Community%20Maintained-success.svg">
  <img src="https://img.shields.io/badge/Origin-Krynet%2C%20LLC-2563EB.svg">
</p>

> [!NOTE]
> **LibreWatch was originally created by Krynet, LLC as an open-source YouTube "Watch Together" framework for the Krynet ecosystem.**
>
> The original project was released under **AGPL-3.0** with the intention of allowing community development.
>
> This repository is an **independent community-maintained continuation** of that work.

---

## ⚠️ Important

LibreWatch is **not an official Krynet, LLC repository**.

This project is maintained independently by **Krynet Community** and may differ from the original project in implementation, security practices, quality standards, dependencies, features, and development direction.

Nothing in this repository should be interpreted as:

* ❌ Official Krynet software
* ❌ An official Krynet release
* ❌ Official Krynet documentation
* ❌ Official Krynet security guidance
* ❌ A Krynet partnership
* ❌ Krynet, LLC endorsement
* ❌ Official Krynet UGC Program participation
* ❌ An official Krynet Store submission

> [!CAUTION]
>
> ### 🔐 Different Security & Quality Practices
>
> **Krynet Community does not follow the same security practices or quality practices as the official Krynet Team.**
>
> Community-maintained changes may not receive the same code review, security review, testing, auditing, release validation, or quality assurance used by Krynet, LLC.
>
> Review the source code and dependencies before deploying LibreWatch or integrating it into another application.

> [!WARNING]
>
> ### 🌐 External Services
>
> LibreWatch can communicate with external services depending on configuration and enabled functionality, including YouTube, SponsorBlock, ClearURLs resources, CDN providers, and room/synchronization infrastructure.
>
> The privacy practices, availability, logging, and security of those services are **outside the control of LibreWatch**.
>
> Review the configured endpoints before deploying a production instance.

---

## 📖 About

**LibreWatch** is an open-source framework for building privacy-conscious YouTube watch experiences.

Originally designed as a foundation for synchronized media playback within the Krynet ecosystem, LibreWatch provides a lightweight JavaScript architecture for:

* 🎥 YouTube playback
* 👥 Watch Together rooms
* 📋 Playlist management
* 💬 Chat
* 🛡️ URL privacy
* ⏭️ SponsorBlock integration
* 📱 Responsive interfaces

The community continuation aims to keep the project:

* 🔓 Free and open source
* 🌍 Self-hostable
* 🧱 Lightweight
* ⚡ Dependency-conscious
* 🛡️ Privacy-oriented
* 🤝 Community maintained

---

## ✨ Features

### 🎥 YouTube Playback

LibreWatch provides YouTube playback through **Plyr 3.7.8**.

Supported input formats include:

* 🔗 YouTube URLs
* 📱 YouTube Shorts URLs
* ▶️ YouTube embed URLs
* 🔗 `youtu.be` URLs
* 🌐 Piped URLs
* 🕵️ Invidious URLs
* 🔢 Raw 11-character YouTube video IDs

Standard controls include:

* ▶️ Play
* ⏸️ Pause
* ⏩ Seeking
* 🔊 Volume
* 🔇 Mute
* 🖥️ Fullscreen
* ⏱️ Playback position

---

### 🧹 URL Privacy

LibreWatch includes dynamic **ClearURLs** integration.

The system can:

* 📥 Fetch the global ClearURLs ruleset
* ⚙️ Compile provider-specific rules
* 🧹 Remove known tracking parameters
* 🔗 Apply provider URL-cleaning rules
* 🚫 Remove common identifiers
* 🛡️ Honor provider exceptions
* 🔗 Clean URLs before extracting YouTube video IDs

Known tracking patterns may include:

```text
utm_*
fbclid
gclid
```

If a URL cannot be safely parsed, LibreWatch preserves the original URL rather than attempting unsafe transformations.

---

### 🛡️ SponsorBlock

LibreWatch integrates SponsorBlock for automatic sponsor-segment skipping.

Features include:

* ⏭️ Sponsor-segment detection
* 📡 Configurable SponsorBlock endpoints
* 🔄 Fallback to `https://sponsor.ajay.app`
* 📊 Chronological segment sorting
* ⏩ Automatic sponsor skipping
* 💾 Browser caching
* ⏱️ Five-second network timeout
* 🚫 `no-referrer` requests

Built-in request controls include:

* 🪣 25-token request bucket
* 🔄 60-second token reset
* ⏱️ Four-second per-video cooldown
* 📡 Cross-tab coordination through `BroadcastChannel`

---

### 👥 Watch Rooms

LibreWatch includes room-based synchronization.

Users can:

* ➕ Create rooms
* 🔗 Join rooms using room codes
* 📋 Copy room codes
* 📡 View connection status
* 👥 View online participants
* 🔌 Handle room disconnections

Playback synchronization can include:

* 🎬 Video loading
* ▶️ Play
* ⏸️ Pause
* ⏩ Seeking
* 🕐 Playback position

---

### 📋 Playlist

LibreWatch includes a client-side playlist manager.

Features include:

* ➕ Add YouTube videos
* 🚫 Prevent duplicate entries
* 🏷️ Retrieve video titles through YouTube oEmbed
* 🖼️ Display thumbnails
* 🎬 Highlight the current video
* 🗑️ Remove videos
* ⏭️ Next video
* ⏮️ Previous video
* 🔄 Automatic advancement
* 🔀 Fisher-Yates shuffle
* ↩️ Restore original order
* 🧹 Clear the queue
* 📍 Track the current position

Playlist changes can also be synchronized with connected rooms.

---

### 💬 Chat

LibreWatch includes a lightweight chat system.

Features include:

* 👤 Random anonymous usernames
* 💾 Persistent username identity through `localStorage`
* ✏️ Custom usernames
* 🕐 Message timestamps
* 💬 Local/self message styling
* 🧠 In-memory message history
* 📏 500-character input limit
* 📡 Same-browser tab communication
* 🔄 Event-based message handling

---

### 🔔 UI Notifications

A lightweight toast system provides status feedback for events such as:

* ✅ Successful video loads
* ❌ Invalid URLs
* ⚠️ Failed video loads
* 🏠 Room creation
* 🔗 Room joining
* 🔌 Room disconnection
* ➕ Playlist additions
* 🧹 Playlist clearing
* 🔀 Playlist shuffling
* 📋 Room-code copying
* ⚠️ Player initialization failures

---

### 📱 Responsive Interface

The included interface supports:

* 🖥️ Desktop two-column layouts
* 📱 Mobile single-column layouts
* 🎥 Responsive playback
* 🎛️ Responsive controls
* 📱 Mobile-friendly controls
* 📋 Adjustable playlist and chat areas
* 🌙 Dark UI
* 🎨 CSS custom properties

---

## 🏗️ Architecture

LibreWatch uses small, focused JavaScript modules.

```text
📺 LibreWatch
│
├── 🎥 Player/
│   ├── playerCore.js
│   ├── youtubePlayer.js
│   ├── extract.js
│   ├── playlist.js
│   ├── chat.js
│   └── roomSync.js
│
├── ⚙️ Player/
│   └── config.json
│
└── 🌐 Web UI
    ├── index.html
    └── app.js
```

### 🧩 Core Components

| Module             | Responsibility                                                 |
| ------------------ | -------------------------------------------------------------- |
| `extract.js`       | 🧹 URL cleaning and YouTube ID extraction                      |
| `playerCore.js`    | ⚙️ Configuration, SponsorBlock, caching, and request limiting  |
| `youtubePlayer.js` | 🎥 Plyr initialization, playback, events, and sponsor skipping |
| `playlist.js`      | 📋 Queue management, navigation, shuffle, and auto-advance     |
| `chat.js`          | 💬 User identity and chat management                           |
| `roomSync.js`      | 👥 Room creation, joining, and synchronization                 |
| `app.js`           | 🔌 Connects the UI and application modules                     |
| `config.json`      | ⚙️ Player configuration                                        |

LibreWatch favors browser-native APIs where practical:

```text
fetch
URL
localStorage
BroadcastChannel
Cache API
AbortController
navigator.clipboard
```

---

## 🔐 Privacy & Data Handling

LibreWatch is designed to minimize unnecessary tracking and telemetry where the implementation can control it.

However, LibreWatch **cannot control external services**.

Depending on configuration and functionality, requests may be made to:

* ▶️ YouTube
* 🛡️ SponsorBlock
* 🧹 ClearURLs resources
* 📦 CDN providers
* 👥 Room/synchronization services
* 🌐 Configured external endpoints

> [!IMPORTANT]
> **Using LibreWatch does not make YouTube or other external services private.**
>
> External providers may collect IP addresses, request information, cookies, device information, or other telemetry according to their own policies.

LibreWatch should therefore be considered a **privacy-conscious interface**, not an anonymity system.

---

## 🔒 Security

Community maintainers recommend reviewing:

* 🌐 Network endpoints
* 📦 JavaScript dependencies
* 🔑 Authentication mechanisms
* 💾 Local storage
* 🍪 Cookies
* 📡 Room synchronization
* 🔗 External URLs
* 🧩 Third-party integrations

Do not assume that a community release has undergone the same security review as official Krynet software.

> [!CAUTION]
> **Krynet Community does not follow the same security or quality practices as Krynet, LLC.**
>
> LibreWatch is independently maintained.

---

## 📁 Project Structure

```text
LibreWatch/
│
├── 📄 LICENSE
├── 📄 README.md
│
├── 🎥 Player/
│   ├── playerCore.js
│   ├── youtubePlayer.js
│   ├── extract.js
│   ├── playlist.js
│   ├── chat.js
│   ├── roomSync.js
│   └── config.json
│
└── 🌐 Web UI/
    ├── index.html
    └── app.js
```

Additional project files may be added as the community architecture evolves.

---

## 🛣️ Roadmap

Future community development may include:

* 🔄 More robust Watch Together synchronization
* 💬 Full room-based chat synchronization
* 📋 Persistent shared playlists
* 👥 Improved participant management
* 🔐 Additional privacy protections
* 🎨 UI and accessibility improvements
* ⚡ Performance improvements
* 📡 More reliable synchronization
* 🧪 Automated testing
* 🐛 Compatibility fixes
* ⚙️ Additional player configuration
* 🌍 Better self-hosting support

> [!NOTE]
> Roadmap items are community goals and are **not commitments from Krynet, LLC**.

---

## 🤝 Contributing

LibreWatch was released as an open-source project intended to support community development.

Contributions are welcome across:

* 🎥 Player functionality
* 👥 Watch-room synchronization
* 📋 Playlist functionality
* 💬 Chat
* 🛡️ Privacy
* 🎨 UI/UX
* ♿ Accessibility
* ⚡ Performance
* 📚 Documentation
* 🐛 Bug fixes
* 🧪 Testing

### 🧑‍💻 Contribution Principles

Please keep changes:

* 📖 Readable
* 🧩 Focused
* 📝 Documented
* 🔍 Reviewable
* ⚡ Lightweight
* 🛠️ Practical

LibreWatch should remain approachable for contributors rather than becoming an unnecessarily complicated framework.

---

## 🏛️ Original Project

LibreWatch was originally created by **Krynet, LLC**.

### 🔗 Official Krynet Resources

* 🌐 [https://krynet.ai](https://krynet.ai)
* 📦 [https://codeberg.org/Krynet-LLC](https://codeberg.org/Krynet-LLC)
* 💻 [https://gitlab.com/Krynet-Team](https://gitlab.com/Krynet-Team)

The original project, branding, trademarks, and other applicable rights remain subject to their respective owners and applicable licenses.

This repository is an **independent community continuation**.

---

## 🧩 Krynet Community

LibreWatch is part of a broader community effort around software originating from or related to the Krynet ecosystem.

The community focuses on:

* 🔓 Preserving available source code
* 🛠️ Continuing inactive or abandoned components
* 🧑‍💻 Supporting independent contributors
* 🌍 Supporting self-hosted deployments
* 🛡️ Maintaining privacy-oriented functionality
* 📚 Preserving technical documentation
* 🔬 Experimenting with alternative implementations

The purpose is **not to impersonate Krynet, LLC**, but to provide an independent place for community members to continue working on related open-source software.

---

## 🚫 UGC Program & Partnership Status

> [!IMPORTANT]
> **LibreWatch is not an official Krynet UGC Program project.**
>
> Krynet Community is **not a Krynet, LLC partner**.
>
> This repository should not be interpreted as participation in, approval under, or acceptance into any official Krynet creator, UGC, plugin, theme, extension, or Store program.

Official Krynet UGC opportunities and Store policies should be obtained directly from **Krynet, LLC**.

---

## 📜 License

LibreWatch is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

See [`LICENSE`](LICENSE) for the complete license terms.

The original project was created by **Krynet, LLC**. This continuation is maintained independently by the community.

---

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:111827,35:1E3A8A,70:2563EB,100:38BDF8&height=120&section=footer" />
</p>

<p align="center">
  📺 <strong>LibreWatch</strong> · 🛡️ Privacy · 🔓 Open Source · 🤝 Community Maintained
</p>

<p align="center">
  <strong>Not Official Krynet Software · Not a Krynet Partner · Not Part of the Krynet UGC Program</strong>
</p>
