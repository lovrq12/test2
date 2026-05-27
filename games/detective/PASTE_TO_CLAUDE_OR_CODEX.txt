# Visual / UI Polish Prompt — المحقق المخادع

Read this file and inspect all reference images in `/assets/reference/` before editing.

## Goal
Upgrade the current detective game UI to match the provided cinematic references while preserving the existing working gameplay logic.

## Very important rules
- Do NOT rewrite gameplay logic.
- Do NOT change Firebase data structure unless absolutely necessary for UI-only data like avatar/color.
- Do NOT break the existing phase flow.
- Do NOT remove existing realtime sync.
- Do NOT rebuild the project from scratch.
- Improve UI/UX, layout, visual style, role cards, lobby, game screens, and player identity selection only.

## Reference assets
Place/use these as visual references:

```txt
/assets/reference/role-cards/investigator_card_reference.png
/assets/reference/role-cards/killer_card_reference.png
/assets/reference/role-cards/accomplice_card_reference.png
/assets/reference/role-cards/detective_card_reference.png
/assets/reference/splash/home_splash_reference.png
/assets/reference/backgrounds/investigation_room_reference.png
/assets/reference/backgrounds/game_table_reference.png
```

These images are references for direction. You may use them as backgrounds/placeholders if helpful, but the final UI should be built cleanly with HTML/CSS/JS.

---

# 1. Entry / Login Screen Update

Current entry should be upgraded.

Player enters:
- player name
- small profile avatar
- player nameplate color

## Avatar requirements
Do NOT use generic emoji avatars.
Use a small library of investigation-themed avatars.

Examples:
- detective silhouette
- forensic mask
- suspect shadow
- evidence folder
- fingerprint badge
- magnifying glass portrait
- witness icon
- dark hooded profile
- noir investigator
- camera/evidence icon

Create/use an avatar library like:

```js
const AVATAR_OPTIONS = [
  { id: 'detective-01', nameAr: 'محقق', image: 'assets/avatars/detective-01.png' },
  { id: 'forensic-01', nameAr: 'طبيب شرعي', image: 'assets/avatars/forensic-01.png' },
  { id: 'suspect-01', nameAr: 'مشتبه', image: 'assets/avatars/suspect-01.png' }
];
```

If real avatar image assets are not available yet:
- create clean temporary CSS/icon avatar cards
- keep the system ready for image files later
- no emojis

## Nameplate color
Player chooses a color for the small nameplate/card attached to their name.
Suggested colors:
- dark gold
- blood red
- midnight blue
- forensic green
- violet
- steel gray
- amber

Store this as public cosmetic data only:

```txt
public/playerProfiles/{playerId}/avatarId
public/playerProfiles/{playerId}/nameColor
```

This is cosmetic and safe to be public.

---

# 2. Lobby Visual Direction

Use `/assets/reference/splash/home_splash_reference.png` as the visual direction for the lobby/home screen.

Lobby should feel like:
- cinematic detective anime poster
- dark noir mystery
- purple/blue shadows
- gold accent buttons
- big Arabic title: المحقق المخادع
- subtitle: لا تثق... فالحقيقة قد تكون أول كذبة

Lobby layout:
- right/center: game title and create/join room buttons
- left/bottom: player identity setup card
- room code card should look like an evidence tag
- player list should look like case participants

Do not make it bright or playful.
Keep it premium, mysterious, and Arabic-first.

---

# 3. Game Room / Investigation Table Background

Use these references for game screens:

```txt
/assets/reference/backgrounds/investigation_room_reference.png
/assets/reference/backgrounds/game_table_reference.png
```

The game should feel like players are inside a high-floor investigation office:
- rainy night
- New York-style towers outside
- detective table
- 12 chairs around the table
- coffee cups per player
- case files
- investigation book
- evidence board in the back

Use this aesthetic across:
- investigation screen
- voting screen
- reveal screen
- player list panels

Do not force a heavy 3D implementation right now. Use background images, overlays, glass panels, and CSS depth first.

---

# 4. Role Card Redesign

Use the role card references as the style direction.

Role cards should be shown during Role Reveal and Final Reveal.

Required roles:
- القاتل
- الشريك
- الشاهد
- الطبيب الشرعي
- المحقق

Card style:
- dark ornate frame
- role color accent
- large character/art area
- role title Arabic
- short role quote
- ability text
- role instructions
- no clutter
- readable on mobile

Suggested colors:
- Killer: black + deep blue/red
- Accomplice: black + gray/red
- Witness: violet/pink
- Forensic Doctor: gold/green/white medical accent
- Investigator: blue/steel

Important:
The role card is visual only. Do not change role logic.

---

# 5. Player Cards / Tool Inspection

During investigation, every player card should show:
- avatar
- player name
- selected nameplate color
- connection/ready status
- 8 public tools as small cards

On click/tap:
open player detail modal/bottom sheet with:
- avatar
- name
- 8 tool images
- Arabic tool names
- short tool descriptions
- local private notes area for the current viewer
- local suspect marker: مشتبه / أقل شكاً / محايد

Do NOT reveal player role in public card.

---

# 6. Screen Layouts To Polish

Polish these screens, but do not change their logic:

## Lobby
- identity setup
- avatar/color selection
- create room / join room
- realtime player list
- host settings

## Role Reveal
- cinematic role card
- private instructions
- tools display

## Killer Setup
- killer chooses 2 tools only
- make the UI feel like selecting evidence secretly

## Forensic Doctor Panel
- premium control panel
- categories for hints
- custom hint input
- send hint button
- public feed preview

## Investigation
- investigation room/table aesthetic
- public hint feed
- player cards
- chat/discussion area if present
- tool inspection modal

## Voting
- suspect selection cards
- lock vote confirmation
- waiting state

## Final Reveal
- cinematic reveal
- killer/accomplice/witness/doctor cards
- real tools
- hints released
- winner team

---

# 7. File Placement Recommendation

If adding assets, use this structure:

```txt
/assets/
  /reference/        ← provided references, do not delete
  /avatars/          ← player profile avatars
  /roles/            ← role card art/backgrounds
  /backgrounds/      ← lobby and investigation backgrounds
  /tools/            ← existing tool images
```

If adding new CSS, keep it in `style.css` unless the project already has a cleaner CSS split.

If adding avatar metadata, put it in a dedicated file if project structure allows:

```txt
avatars.js
```

Or add it near tool metadata if the project is still simple.

---

# 8. Testing Required

After visual update, test:
- create room
- join room
- avatar displays realtime
- name color displays realtime
- 5 tabs in same browser
- role reveal still works
- killer setup still works
- forensic hint sending still works
- investigation screen still shows public tools
- voting/reveal if already implemented
- mobile responsive layout

No console errors.
No Firebase sync break.
No private data leaks.

---

# 9. Final Reminder

This is a UI/UX polish pass.
The game logic is already being built separately.
Do not turn this into a rewrite.
Make the existing game look premium, cinematic, Arabic, and investigation-themed.
