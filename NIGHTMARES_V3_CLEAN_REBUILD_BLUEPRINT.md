# NIGHTMARES V3 Clean Rebuild Blueprint

لا تبدأ بناء V3 الآن.
سو ملف الخطة فقط.
نبيك تفهم القديم وتحدد وش ناخذ منه ووش نرميه.

This is a preparation/audit document only. Do not create V3 implementation files yet.

## 1. V3 Goal

V3 should be a clean UI shell built inside the existing NIGHTMARES project while preserving the old game engine.

- We are not rebuilding game logic from scratch.
- We are rebuilding the UI/body from scratch, one screen at a time.
- The old project remains the source of truth for logic, role IDs, role metadata, Firebase Realtime Database paths, action validation, phase flow, win checks, and points.
- V3 should connect new UI controls to existing old functions and existing Firebase write paths through an action bridge.

## 2. What To Preserve From The Old Project

Preserve these systems exactly unless a later task explicitly changes them.

| Item | Current Source | Notes |
|---|---|---|
| Firebase config and RTDB compat connection | `js/firebase.js` | Uses Firebase compat scripts in HTML and `firebase.database()`. Do not migrate to Firestore. |
| DB helper wrapper | `js/firebase.js` -> `DB` | Existing helpers: `set`, `update`, `push`, `get`, `on`, `once`, `remove`, `onDisconnect`, `timestamp`, `generateId`. |
| Presence | `js/firebase.js` -> `setupPresence(roomId, playerId)` | Uses `.info/connected` and updates `players/{playerId}` fields. |
| Session/local player storage | `js/app.js` -> `Session` | Uses `localStorage` keys: `nm_playerId`, `nm_playerName`, `nm_playerIcon`, `nm_roomId`, `nm_roomCode`. |
| Entry create/join room logic | `index.html` inline script | Uses `btn-create`, `btn-join`, `player-name`, `room-code-input`, `icon-grid`, `generateRoomCode()`, `Session.savePlayer()`. |
| Room creation path | `index.html` | `DB.set('rooms/{roomId}', roomData)`. |
| Player join path | `index.html` | `DB.set('rooms/{roomId}/players/{playerId}', playerData)` and existing-player reconnect via `DB.update`. |
| Core room state | `rooms/{roomId}` | Preserve `code`, `hostId`, `status`, `settings`, `players`, `game`. |
| Lobby realtime subscription | `js/lobby.js` -> `initLobby()` | `DB.on('rooms/{roomId}', onRoomUpdate)`. |
| Lobby ready state | `js/lobby.js` -> `toggleReady()` | Writes `rooms/{roomId}/players/{playerId}/ready`. |
| Host start game | `js/lobby.js` -> `startGame()` | Assigns roles, resets runtime game fields, and sets `status = 'playing'`. |
| Host settings | `js/lobby.js` -> `pushSettings()` | Writes `rooms/{roomId}/settings`. |
| Role toggles | `js/lobby.js`, `lobby.html` | Old special roles use `settings/enabledSpecialRoles`; new extra roles use `settings/enabledExtraRoles`. |
| Role definitions | `js/roles.js`, `js/app.js` | `js/roles.js` owns base/special roles; `js/app.js` injects `NEW_EXTRA_ROLE_META` so `js/roles.js` can remain untouched. |
| Role assignment | `js/roles.js` -> `RoleEngine.buildDistribution()`, `js/lobby.js` -> `buildDistributionWithExtraRoles()` | Preserve assignment rules and warnings. |
| Role helpers | `js/roles.js` -> `RoleEngine` | Preserve `getRole`, `getTeam`, `getPlayerTeam`, `isMafia`, `isPlayerMafia`, `getRoleImage`, `getRoleArabicName`, `getRoleColor`, `checkWin`. |
| Game realtime subscription | `js/game.js` -> `initGame()` | `DB.on('rooms/{roomId}', onRoomUpdate)` plus chat listeners. |
| Game phase engine | `js/game.js` -> `advancePhase()` | Preserve night -> morning/day -> discussion -> voting -> defense -> night flow. |
| Night resolution | `js/game.js` -> `resolveNightActions()` | Preserve mafia kill, doctor/mad protection, immune save, poison, infection, mad citizen kill resolution. |
| Vote resolution | `js/game.js` -> `resolveVotes()` and `castVote()` | Preserve skip, tie, founder override, active-player filtering. |
| Win logic | `js/roles.js` -> `RoleEngine.checkWin()`, `js/game.js` -> `showWinScreen()` | Preserve current winner calculation and win screen trigger. |
| Points logic | `js/game.js` -> `awardWinPoints()` | Uses `game.pointsAwarded` guard and `players/{playerId}/points`. |
| Public chat path | `rooms/{roomId}/game/chat` | Used by lobby chat and game public chat. |
| Mafia chat path | `rooms/{roomId}/game/mafiaChat` | Used by in-game mafia channel only. |
| Player presence/status fields | `players/{playerId}` | Preserve `status`, `online`, `connected`, `lastSeen`, `kicked`, `alive`. |
| Avatar helpers | `js/app.js` -> `getPlayerPortrait()`, `getPlayerPortraitHtml()` | Uses local `assets/avatars/*`. |
| Role thumbnail helper | `js/app.js` -> `getRoleThumbImage()` | Preserve for future lightweight role toggles. |

## 3. What NOT To Carry Into V3

Do not delete these now. Mark them as "do not carry directly into V3".

- Old accumulated CSS UI layers in `css/style.css`.
- Mixed lobby V2 layer in `css/lobby-v2.css` if it conflicts with V3.
- Old side `action-panel` as permanent game layout.
- Old `role-tab` and V2 role panels if V3 owns a clean card tab.
- Old duplicate win screen elements overlapping cinematic win content.
- Old duplicate chat shells or chat tabs if V3 creates one clean chat surface.
- Old table visual shell if it depends on repeated heavy full-size card images.
- Heavy particles, meteors, lightning, rain, ash, crystal dust by default.
- Full-size role cards inside repeated table seats.
- Repeated `innerHTML = ''` full rerenders for the whole table on every Firebase update where avoidable.
- Duplicated selectors for panels, nav, role card, chat, and table seats.
- Fallback UI that remains visible behind the new UI.

## 4. Proposed V3 File Structure

This is only a proposed structure. Do not create these files now unless explicitly asked later.

```text
index.html
lobby.html
game.html

css/
  v3-base.css
  v3-entry.css
  v3-lobby.css
  v3-game.css
  v3-mobile-lite.css

js/
  v3-entry-ui.js
  v3-lobby-ui.js
  v3-game-ui.js
  v3-chat-ui.js
  v3-win-ui.js
  v3-action-bridge.js
```

Preserve current engine files:

```text
js/firebase.js
js/roles.js
js/app.js
js/lobby.js
js/game.js
js/sound.js
```

## 5. V3 Build Phases

Phase 1 — Entry / Login-like start screen

- Create room.
- Join room.
- Room code.
- Avatar selection.
- Updates tab.
- Use existing create/join room logic from `index.html`.

Phase 2 — Lobby V3

- Players list.
- Ready.
- Host start.
- Settings.
- Role toggles.
- Lobby chat.
- Room points.
- Use existing lobby state paths from `js/lobby.js`.

Phase 3 — Game V3

- Table tab.
- Players tab.
- Role card tab.
- Chat tab.
- Top phase/timer/round bar.
- New UI only, old engine preserved.

Phase 4 — Action Bridge

- New buttons/UI call old action logic.
- Do not rewrite game rules.
- Connect UI clicks to existing action write paths.

Phase 5 — Win Screen V3

- One win screen only.
- No old/new overlap.
- Use existing winner result from `game.winner`.

Phase 6 — Mobile Lite Mode

- `localStorage` setting.
- Disable heavy effects.
- Use thumbnails.
- Reduce blur/glow.
- No particles by default on mobile.

Phase 7 — Cleanup

- Only after V3 works.
- Remove unused active UI references.
- Do not delete role cards or referenced assets.
- Clean CSS duplication safely.

## 6. Action Bridge Map

Use this map when V3 buttons are connected to the old engine.

| V3 UI Button | Old Function / Firebase Path To Use | Notes |
|---|---|---|
| Create room | `index.html` create handler -> `DB.set('rooms/{roomId}', roomData)` | Preserve generated `code`, `hostId`, player data, initial `settings`, initial `game`. |
| Join room | `index.html` -> `joinRoom()` / `DB.set('rooms/{roomId}/players/{playerId}', data)` | Preserve existing player reconnect flow and max-player check. |
| Ready | `js/lobby.js` -> `toggleReady()` | Writes `rooms/{roomId}/players/{playerId}/ready`. |
| Host start | `js/lobby.js` -> `startGame()` | Preserve validation, assignment, reset of runtime fields only. |
| Save settings | `js/lobby.js` -> `pushSettings()` | Writes `rooms/{roomId}/settings`. |
| Toggle old special role | `rooms/{roomId}/settings/enabledSpecialRoles` through `pushSettings()` | Preserve `RoleEngine.sanitizeSpecialRoles()`. |
| Toggle extra role | `rooms/{roomId}/settings/enabledExtraRoles` through `pushSettings()` | Preserve `getEnabledExtraRoleMap()`. |
| Kill / Mafia kill | `js/game.js` -> `chooseMafiaKill(targetPlayerId)` / `game/nightActions/mafiaKills/{playerId}` | Preserve validation and mafia consensus/selection logic. |
| Protect | `js/game.js` -> `chooseDoctorProtect(targetPlayerId)` / `game/nightActions/doctor_protect` | Preserve phase and self-protect rules. |
| Investigate | `js/game.js` -> `investigatePlayer(targetPlayerId)` / `players/{playerId}/usedAbilities/investigatedRounds/{round}` | Preserve liar result as citizen and one investigation per night. |
| Vote | `js/game.js` -> `castVote(targetId)` / `game/votes/{playerId}` | Preserve voting/defense phase checks. |
| Skip vote | `js/game.js` -> `castVote('skip')` / `game/votes/{playerId} = 'skip'` | Preserve skip/tie/no-vote behavior. |
| Governor reveal | `js/game.js` -> `useGovernorReveal(targetPlayerId)` / `game/publicRevealedRoles/{targetId}` + `players/{governorId}/usedAbilities/governor_used` | Once per match; cursed shows fake doctor/detective. |
| Mad citizen protect | `js/game.js` -> `chooseMadCitizenAction(targetId, 'protect')` / `game/nightActions/madCitizen` | Protection refreshes nightly through `nightActions`. |
| Mad citizen kill | `js/game.js` -> `chooseMadCitizenAction(targetId, 'kill')` / `game/nightActions/madCitizen` + `players/{id}/usedAbilities/madCitizenKill_used` | Kill is once per match. |
| Poison | `js/game.js` -> `choosePoisonerTarget(targetId)` / `game/poisoned/{targetId}` + `usedAbilities/poisoner_used` | Existing delay logic lives in `resolveNightActions()`. |
| Oathbreaker bypass | `js/game.js` -> `chooseOathbreakerBypass(targetId)` / `game/nightActions/oathbreakerBypass` | Once per match. |
| Victim revive | `js/game.js` -> `useVictimSacrifice(targetId)` / `players/{targetId}/alive`, `players/{self}/alive`, `game/victimRevives/{targetId}` | Preserve sacrifice behavior. |
| Phoenix revive other | `js/game.js` -> `usePhoenixOnTarget(targetId)` / target `alive = true`, `players/{phoenixId}/usedAbilities/phoenix_used` | Preserve old revive-other ability. |
| Phoenix self revive | `js/game.js` -> `usePhoenixSelfRevive(team)` / `players/{id}/usedAbilities/phoenix_self_used`, `players/{id}/phoenixChosenTeam`, `game/phoenixRevives/{id}` | Preserve choice: mafia or citizens. |
| Whisper reveal | `js/game.js` -> `useWhisperOnTarget(targetId)` / `players/{whisperId}/privateReveals/{targetId}` + `game/mafiaSharedReveals/{targetId}` | UI reveal visible to whisperer and mafia-side teammates only. |
| Hopebreaker ability | `js/game.js` -> `useHopebreakerOnTarget(targetId)` | Writes target death/reveal or kills hopebreaker on wrong guess. |
| Cursed guess | `js/game.js` -> `executeCursedGuess(targetId, guessRole)` | Menu is separate from success roles; preserve current validation. |
| Send public chat | `js/game.js` -> `sendGameChat()` / `rooms/{roomId}/game/chat`; lobby `sendChat()` uses same path | Public chat is room scoped. |
| Send mafia chat | `js/game.js` -> `sendGameChat()` / `rooms/{roomId}/game/mafiaChat` | Mafia only; public chat locked at night in current UI. |
| Award points | `js/game.js` -> `awardWinPoints(game, players)` / `players/{id}/points`, `game/pointsAwarded` | Host-only guard; preserve same-room accumulated points. |

## 7. Assets Strategy

Use assets intentionally in V3.

| Asset Purpose | Current Assets | V3 Rule |
|---|---|---|
| Entry background | `assets/backgrounds/entry_bg.png`, `assets/backgrounds/main_lobby_background.png` | Use one optimized responsive background. |
| Lobby background | `assets/backgrounds/main_lobby_background.png`, `assets/optimized/backgrounds/lobby_bg_mobile.png` | Prefer mobile optimized background on small screens. |
| Game table background | `assets/backgrounds/table_day_v2.png`, `assets/backgrounds/table_night_v2.png`, legacy `day_table_bg.png`, `night_table_bg.png` | Use one day and one night background; avoid loading legacy duplicates. |
| Table public card | `assets/role_cards/nightmares_public_table_card.png` | Use only as a small thumbnail/optimized seat asset later; do not load large card repeatedly on mobile. |
| Avatar images | `assets/avatars/*.png`, `assets/avatars/avatar-manifest.json` | Use local avatars, small display sizes, lazy loading. |
| Role card images | `assets/cards/basic/*`, `assets/cards/special/*`, `assets/cards/new_roles/*` | Full-size cards only in role tab or zoom modal. |
| Role thumbnails | `assets/optimized/cards/thumbs/*` | Use in lobby toggles, small lists, and mobile summaries. |
| Win backgrounds | `assets/ui/mafia_win_bg.png`, `assets/ui/citizens_win_bg.png` | Use one V3 win screen that swaps theme by winner. |
| Reference images | `assets/ui/game_day_reference.png`, `assets/ui/game_night_reference.png`, `assets/ui/entry_screen_reference.png`, `assets/ui/update_new_roles_poster.png` | Do not use as runtime UI unless explicitly requested; reference only. |
| Audio | `assets/audio/night_ambience.mp3` | Keep optional; do not autoplay heavy ambience without user interaction. |

Asset performance notes:

- Table seats must use small thumbnails.
- Full-size role cards only load in the role tab or zoom modal.
- Avoid loading all heavy images on mobile.
- Compress or create thumbnails later.
- Never use large 2-4 MB cards directly in repeated table seats.
- Current heavy assets include several 2.5-4 MB role cards/backgrounds and a 5.8 MB night ambience audio file.

## 8. Mobile Performance Rules

V3 mobile rules:

- No particles by default.
- No continuous lightning/meteors by default.
- No rain by default.
- No heavy `backdrop-filter` on many elements.
- Use CSS transforms carefully and avoid animating layout properties.
- Avoid rebuilding the whole table on every Firebase update.
- Avoid repeated `innerHTML = ''` full rerenders where possible.
- Use thumbnails for avatars/table cards.
- Lazy-load heavy assets.
- Keep one active win screen.
- Keep one active chat system.
- Keep one active role-card system.
- Keep one active panel/tab system.
- Use `localStorage` for mobile lite mode, for example `nightmares_v3_mobile_lite = 'true'`.
- Default mobile should be lite unless the user opts into cinematic effects.

## 9. Risks / Unknowns

Do not guess. These are areas to verify before implementing each phase.

- `PROJECT_MAP.md` was not found in this project; this blueprint is the current planning source of truth.
- Several UI systems currently coexist: legacy side action panel, V2 mobile panels, role tab/modal, bottom action bar, event overlay, cinematic overlay, win cinematic.
- `js/lobby-v2.js` exists alongside `js/lobby.js`; verify whether it is purely decorative or owns any behavior before removing or replacing it.
- `css/style.css`, `css/lobby-v2.css`, and `assets/shared/game-entry.css` overlap visually; selector conflicts are likely.
- Chat exists in both lobby and game, using `game/chat`; ensure V3 does not accidentally create duplicate chat renderers.
- Game public chat and mafia chat rules must be confirmed per phase before V3 chat UI.
- Some Arabic text appears mojibake in terminal output because of shell encoding; inspect in editor/browser before changing copy.
- `poisoner` description currently says two nights in metadata while recent rules may require one-night behavior; verify before V3 text work.
- The table currently renders large public card art in seats; V3 should replace with optimized thumbnails later.
- Win screen has both old IDs and new cinematic content; V3 must keep only one active win screen.
- Firebase Security Rules are unknown; "private" reveal behavior is UI privacy unless rules enforce it.
- Browser performance should be verified on 390px mobile width after each phase.

## 10. Recommended First Implementation Step

Start with Phase 1 — Entry screen V3 only.

Implementation should happen one phase at a time, not all at once. Build the new entry screen first, connect it to the existing create/join logic, test it, then move to Lobby V3.

Do not start Phase 2 until Phase 1 is verified.

## Inspection Summary

Files inspected:

- `index.html`
- `lobby.html`
- `game.html`
- `css/style.css`
- `css/lobby-v2.css`
- `assets/shared/game-entry.css`
- `js/firebase.js`
- `js/app.js`
- `js/roles.js`
- `js/lobby.js`
- `js/lobby-v2.js`
- `js/game.js`
- `js/sound.js`
- `assets/`

Key old logic files found:

- `js/firebase.js`: Firebase config, DB helpers, presence.
- `js/app.js`: session, shared helpers, avatars, effects, role thumbnails, injected extra role metadata.
- `js/roles.js`: base/special role definitions, distribution, RoleEngine helpers, win condition.
- `js/lobby.js`: lobby state, ready/start/settings/chat/role assignment.
- `js/game.js`: game phase engine, actions, table UI, chat, win screen, points.

Key Firebase paths found:

- `rooms/{roomId}`
- `rooms/{roomId}/players/{playerId}`
- `rooms/{roomId}/settings`
- `rooms/{roomId}/settings/enabledSpecialRoles`
- `rooms/{roomId}/settings/enabledExtraRoles`
- `rooms/{roomId}/settings/visualMode`
- `rooms/{roomId}/status`
- `rooms/{roomId}/game`
- `rooms/{roomId}/game/phase`
- `rooms/{roomId}/game/round`
- `rooms/{roomId}/game/timerEndsAt`
- `rooms/{roomId}/game/nightActions`
- `rooms/{roomId}/game/nightActions/mafiaKills/{playerId}`
- `rooms/{roomId}/game/nightActions/doctor_protect`
- `rooms/{roomId}/game/nightActions/madCitizen`
- `rooms/{roomId}/game/nightActions/oathbreakerBypass`
- `rooms/{roomId}/game/votes/{playerId}`
- `rooms/{roomId}/game/chat`
- `rooms/{roomId}/game/mafiaChat`
- `rooms/{roomId}/game/deathLog`
- `rooms/{roomId}/game/revealedRoles`
- `rooms/{roomId}/game/publicRevealedRoles`
- `rooms/{roomId}/game/poisoned`
- `rooms/{roomId}/game/infections`
- `rooms/{roomId}/game/victimRevives`
- `rooms/{roomId}/game/phoenixRevives`
- `rooms/{roomId}/game/mafiaSharedReveals`
- `rooms/{roomId}/game/winner`
- `rooms/{roomId}/game/pointsAwarded`
- `rooms/{roomId}/players/{playerId}/points`
- `rooms/{roomId}/players/{playerId}/usedAbilities`
- `rooms/{roomId}/players/{playerId}/privateReveals`

Key role IDs found:

- `mafia`
- `doctor`
- `detective`
- `citizen`
- `cursed`
- `immune_citizen`
- `liar`
- `whisper`
- `founder`
- `eclipse`
- `hopebreaker`
- `phoenix`
- `victim`
- `poisoner`
- `infected`
- `oathbreaker`
- `mad_citizen`
- `governor`

No V3 implementation code was created in this step.
