# NIGHTMARES

بوابة عربية ثابتة تجمع لعبتي **Nightmares Mafia** و**Detective Game** مع إبقاء منطق كل لعبة في مجلد مستقل.

## File Tree

```text
NIGHTMARES-HUB/
|-- index.html
|-- README.md
|-- assets/
|   `-- shared/
|       |-- nightmares-hero.png
|       |-- avatar-fallback.svg
|       |-- game-entry.css
|       |-- hub.css
|       `-- hub.js
`-- games/
    |-- nightmares/
    |   |-- index.html
    |   |-- lobby.html
    |   |-- game.html
    |   |-- css/style.css
    |   |-- js/
    |   `-- assets/
    `-- detective/
        |-- index.html
        |-- style.css
        |-- cinematic.css
        |-- app.js
        |-- firebase.js
        |-- lobby.js
        |-- profiles.js
        |-- ui.js
        `-- assets/
```

The remaining JavaScript and art files inside each game directory are the original isolated game assets and logic.

## Run Locally

Serve the `NIGHTMARES-HUB` folder with any simple static server, then open `index.html` through that server.

Examples:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080/`.

VS Code Live Server works as well. No npm, Node.js dependency, bundler, or build step is required by the website.

## Deploy

- **GitHub Pages:** publish the contents of `NIGHTMARES-HUB` from the repository root or a configured Pages folder.
- **Netlify:** drag and drop the `NIGHTMARES-HUB` folder, or set it as the publish directory with no build command.
- **Vercel:** deploy the folder as a static project; leave the build command empty and use the project root as the output.

All launcher links use relative static paths and work under a hosted subdirectory.

## Firebase And Rooms

Both games continue to use the existing **Firebase Realtime Database** configuration. No Firestore conversion was made.

- New mafia rooms include `gameType: "nightmares"` and issue five-character codes beginning with `N`.
- New detective rooms include `gameType: "detective"` and issue five-character codes beginning with `D`.
- Legacy mafia five-character codes and legacy detective four-character codes remain accepted for compatibility.
- The hub asks players which game a room belongs to, then sends them to that game's own joining flow.

## Changed Files

Created:

- `index.html`
- `README.md`
- `assets/shared/nightmares-hero.png`
- `assets/shared/avatar-fallback.svg`
- `assets/shared/game-entry.css`
- `assets/shared/hub.css`
- `assets/shared/hub.js`

Updated from **Nightmares Mafia**:

- `games/nightmares/index.html`
- `games/nightmares/lobby.html`
- `games/nightmares/game.html`
- `games/nightmares/js/app.js`

Updated from **Detective Game**:

- `games/detective/index.html`
- `games/detective/firebase.js`
- `games/detective/lobby.js`
- `games/detective/profiles.js`
- `games/detective/ui.js`

## Deliberately Avoided Risk

The gameplay engines, role distribution, voting/phase logic, tool logic, and existing Realtime Database operations were not merged across games. Each game remains independently launchable from its own folder. Only room metadata/code generation, portal routing, return navigation, and entry-screen visuals were connected.
