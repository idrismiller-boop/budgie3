# Monthly Budget (installable PWA), flat layout

Personal monthly budget dashboard (React + Vite). Works offline once installed.
All data stays on your device (browser local storage). No accounts, analytics, tracking or bank connections.

## This project has NO folders on purpose
Every file sits at the top level so the GitHub browser uploader can't drop any of them.

```
index.html  main.jsx  App.jsx  styles.css           the app entry + shell + styling
calc.js  format.js  storage.js  install.js          logic (calculations, formatting, local storage, install)
ui.jsx  Dashboard.jsx  Plan.jsx  Log.jsx  Payday.jsx  Weekly.jsx  Scenarios.jsx  DataView.jsx
favicon.svg  icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png
package.json  package-lock.json  vite.config.js  vercel.json  netlify.toml  eslint.config.js
test-calc.mjs  test-ui.mjs  README.md
```

## Upload to GitHub in the browser
1. Unzip the download. You get one list of files and no folders.
2. In your repo: **Add file → Upload files**.
3. Select ALL the files (Ctrl/Cmd+A in the folder, or multi-select on a phone/tablet) and drop them in, or use
   "choose your files". Wait until every file shows as uploaded (there are about 29).
4. **Commit changes**. Files with the same name (index.html, package.json, vite.config.js...) are replaced.
5. Check the repo's main page lists `main.jsx`, `App.jsx`, `calc.js`, `icon-192.png`... at the top level.
6. Vercel redeploys on its own. If not: Project → Deployments → Redeploy.

`npm run build` begins with a check and, if a file is missing, prints exactly which ones.

## Install on your phone
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**. Do this BEFORE entering data (the Home Screen app has its own storage).
- **Android (Chrome):** menu (⋮) → **Install app**, or use the Install button in the app's Data tab.

## Where your data lives (limitations)
- Stored in this browser's local storage on **this device only**. **Not backed up, not synced.**
- Can be lost by: clearing site data/history, removing the app and its data, resetting or losing the phone,
  or the browser freeing space on a nearly full device.
- Another device starts empty. Move data with **Data → Export → Full backup (JSON)** then **Import**.
- Don't change the web address once you're using it: data belongs to that exact address.
- Updating the app never erases your data. Make a JSON backup monthly; keep it private.

## On a computer (optional, Node 22)
```
npm install
npm run dev      # develop
npm run check    # lint + calculation tests + UI tests + production build
```
