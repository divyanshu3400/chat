# ⚡ Cipher — Next.js App

End-to-end encrypted, realtime chat. Built with **Next.js 14 App Router**, **Firebase**, **Zustand**, and **Tailwind CSS**.

---

## 📁 Project Structure

```
cipher-next/
├── app/
│   ├── layout.tsx          # Root layout (fonts, ambient blobs, metadata)
│   ├── page.tsx            # Root page → loads CipherApp (client-only, SSR disabled)
│   └── globals.css         # All design tokens + shared component styles
│
├── components/
│   ├── CipherApp.tsx       # 🏠 Main shell — auth routing, Firebase boot, all panels
│   ├── SetupScreen.tsx     # First-time Firebase config screen
│   ├── AuthScreen.tsx      # Google Sign-In screen
│   │
│   ├── sidebar/
│   │   └── Sidebar.tsx     # Left sidebar: conversations, stories, search, tabs
│   │
│   ├── chat/
│   │   ├── ChatArea.tsx    # Full chat view: messages, encryption, send, reactions
│   │   ├── ChatHeader.tsx  # Chat top bar: avatar, online status, call buttons
│   │   ├── MessageBubble.tsx  # All message types: text, image, video, audio, file, gif, poll
│   │   └── InputBar.tsx    # Message input: text, attach, GIF, poll, voice, AI chips
│   │
│   └── overlays/
│       ├── CallOverlay.tsx    # Audio/video call UI (WebRTC)
│       ├── SettingsPanel.tsx  # Settings: accent color, toggles, sign out
│       ├── ProfilePanel.tsx   # Profile: avatar, name, status presets
│       ├── Panels.tsx         # NewChat, NewGroup, Bookmarks panels
│       └── Overlays.tsx       # Lightbox, StoryViewer, Toast
│
├── lib/
│   ├── firebase.ts         # Firebase init, config resolver (env → localStorage fallback)
│   ├── crypto.ts           # E2E encryption: ECDH key gen, AES-GCM enc/dec
│   ├── store.ts            # Zustand global state
│   └── utils.ts            # mdRender, fmtTime, fmtBytes, esc
│
├── types/
│   └── index.ts            # TypeScript types: User, Message, Conversation, Story, Prefs…
│
├── .env.example            # Copy → .env.local and fill in Firebase keys
├── tailwind.config.ts
├── next.config.mjs
└── package.json
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
**Option A — .env.local (recommended for production)**
```bash
cp .env.example .env.local
# Fill in your Firebase keys
```

**Option B — Setup screen (no-code)**
Leave `.env.local` empty — on first visit you'll see the guided setup screen that saves keys to localStorage.

### 3. Firebase project setup
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create project → Enable:
   - **Authentication** → Google provider
   - **Realtime Database** → Set rules:
     ```json
     { "rules": { ".read": "auth!=null", ".write": "auth!=null" } }
     ```
   - **Storage** → Set rules:
     ```
     allow read, write: if request.auth != null;
     ```
3. Add your domain to **Authorized domains** (Auth → Settings)

### 4. Run dev server
```bash
npm run dev
```

---

## 🗺️ Phase Scalability Map

The project is structured to absorb all 5 phases from the roadmap:

| Phase | Feature | Where to add |
|-------|---------|--------------|
| **1** | Friend requests | `lib/store.ts` + new `FriendRequests` panel |
| **1** | Privacy settings | `SettingsPanel.tsx` → new Privacy section |
| **1** | Disappearing messages | `ChatArea.tsx` → `sendMsg()` add TTL field |
| **1** | QR invite links | New `components/overlays/QRPanel.tsx` |
| **1** | Block & report | `ChatHeader.tsx` menu + Firebase `blocked/` node |
| **1** | Username system | `ProfilePanel.tsx` + `users/{uid}/username` |
| **2** | Media gallery | New `components/chat/MediaGallery.tsx` |
| **2** | Broadcast lists | New conversation type in `types/index.ts` |
| **2** | Message threads | `MessageBubble.tsx` → thread reply UI |
| **2** | Message translation | `ChatArea.tsx` → context menu translate action |
| **2** | Scheduled messages | `InputBar.tsx` → schedule button + Cloud Function |
| **3** | 2FA / TOTP | `AuthScreen.tsx` → MFA step |
| **3** | Group E2E encryption | `lib/crypto.ts` → symmetric group key |
| **3** | Device management | New `components/overlays/DevicesPanel.tsx` |
| **3** | Key backup | `lib/crypto.ts` → AES export with passphrase |
| **3** | Rate limiting | Firebase Security Rules + Cloud Functions |
| **4** | Group voice/video | `CallOverlay.tsx` → LiveKit/Daily.co SDK |
| **4** | Screen sharing | `CallOverlay.tsx` → `getDisplayMedia()` |
| **4** | AI summarizer | New `lib/ai.ts` → Claude API |
| **4** | Smart replies | `InputBar.tsx` → AI chips from context |
| **5** | Analytics | New `lib/analytics.ts` |
| **5** | GDPR export | New API route `app/api/export/route.ts` |
| **5** | Webhook integrations | New API routes `app/api/webhooks/` |
| **5** | Public API | New `app/api/` directory |

---

## 🎨 Theme System

All colors are CSS variables in `globals.css`. Accent color is set via `data-accent` on `<html>`:

```css
/* Available accents */
[data-accent="indigo"]  → #6366f1  (default)
[data-accent="violet"]  → #8b5cf6
[data-accent="rose"]    → #f43f5e
[data-accent="cyan"]    → #06b6d4
[data-accent="amber"]   → #f59e0b
[data-accent="emerald"] → #10b981
```

Change accent at runtime: `document.documentElement.setAttribute('data-accent', 'cyan')`

---

## 🔐 Encryption

- **DMs**: ECDH P-256 key exchange → AES-256-GCM per message
- **Groups**: Symmetric key stored server-side (Phase 3: migrate to per-group ECDH)
- Keys stored in `localStorage` — never sent to any server
- `lib/crypto.ts` is fully self-contained with Web Crypto API

---

## 📱 Mobile

- Sidebar slides in from left on mobile (< 720px)
- Swipe right from edge to open sidebar
- `100dvh` for proper mobile viewport handling
- Touch long-press for context menu on messages
- PWA-ready (add `manifest.json` + service worker for Phase 5)
