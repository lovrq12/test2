# 🎭 Mafia — Real-time Social Deduction Game

Fully static multiplayer game using Firebase Realtime Database + Vercel hosting.

## Stack
- **Frontend:** HTML + CSS + Vanilla JS (no npm, no build step)
- **Backend:** Firebase Realtime Database (CDN SDK)
- **Hosting:** Vercel (imported from GitHub)

## Project Structure
```
/
├── index.html        ← Home: create or join a room
├── lobby.html        ← Waiting room + ready up
├── game.html         ← Game screen (night, voting, chat, win)
├── vercel.json       ← Vercel routing config
├── css/
│   └── theme.css     ← All styles
└── js/
    ├── constants.js  ← Shared constants & utilities
    ├── firebase-init.js  ← Firebase init (DB only, no auth)
    └── rooms.js      ← All game logic & DB operations
```

## Deploy to Vercel (from GitHub)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Framework Preset: **Other**
5. Click **Deploy** — no build settings needed

## Firebase Setup

The Firebase config is already set in `js/firebase-init.js`.

Make sure your Realtime Database rules allow read/write (for development):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

## No Auth
Player identity is stored in `localStorage` — no Firebase Auth needed.
Each browser gets a persistent unique UID automatically.

## Notes
- Do NOT open files with `file:///` — use a hosted URL (Vercel, local server)
- No npm, no CLI, no build tools required
