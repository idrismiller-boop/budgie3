# Monthly Budget (installable PWA)

A personal monthly budgeting dashboard: income, fixed and variable spending, savings goals, safe-to-spend,
payday plan, weekly review, savings scenarios, transaction log, CSV/JSON export and import.
Built with React + Vite. Works offline once installed.

**Privacy:** all data stays on your device (browser local storage). No accounts, analytics, tracking,
or bank connections. The hosting headers also block the page from talking to any other website.

## Project structure

```
monthly-budget/
├─ package.json            scripts + dependencies
├─ package-lock.json       exact versions (keep this file)
├─ vite.config.js          Vite + PWA plugin (manifest + service worker are generated at build)
├─ index.html              page shell, phone meta tags, icons
├─ eslint.config.js        catches broken imports / undefined names
├─ vercel.json             security headers for Vercel (incl. "no external connections")
├─ netlify.toml            build settings + same headers for Netlify
├─ .nvmrc  .gitignore
├─ public/                 favicon.svg, icon-192/512.png, icon-maskable-512.png, apple-touch-icon.png
├─ scripts/make-icons.mjs  optional: regenerate icons
├─ src/
│  ├─ main.jsx             entry point
│  ├─ App.jsx              app shell: tabs, autosave, install hook
│  ├─ styles.css           all styling (mobile-first, safe-area aware)
│  ├─ lib/
│  │  ├─ calc.js           ALL calculations + CSV/JSON logic (pure, tested)
│  │  ├─ format.js         £ and % formatting
│  │  ├─ storage.js        local-only persistence (localStorage)
│  │  └─ install.js        "Add to Home Screen" handling
│  ├─ components/ui.jsx    shared pieces (inputs, cards, cash strip…)
│  └─ views/               Dashboard, Plan, Log, Payday, Weekly, Scenarios, DataView
└─ tests/
   ├─ calc.test.mjs        105 checks on the maths
   └─ ui.smoke.mjs         49 checks driving the real app in a simulated browser
```

## Run and check it on a computer (needs Node 18+)

```
npm install
npm run dev        # develop at http://localhost:5173
npm run check      # lint + calculation tests + UI tests + production build
npm run preview    # serve the production build (the service worker only runs in this build)
```

## Deploy free (pick ONE route)

### Route A: no Node needed. GitHub, then Vercel or Netlify (recommended; also auto-updates)
1. Make a free account at github.com. Click **New repository**, name it `monthly-budget`, set it to **Private**, and create it.
2. Upload the project (see "Uploading to GitHub in the browser" below: the folders matter).
3. **Vercel:** sign up at vercel.com with GitHub, **Add New → Project**, import the repo, leave the settings
   (it detects Vite; Root Directory must be blank), press **Deploy**.
   **Netlify:** sign up at netlify.com with GitHub, **Add new site → Import an existing project**, pick the repo.
   The build command (`npm run build`) and folder (`dist`) are already set in `netlify.toml`. Press **Deploy**.
4. After a minute you get an address like `https://something.vercel.app` or `https://something.netlify.app`.

### Uploading to GitHub in the browser (the folders matter)
The repository's top level (root) must look exactly like this, with `index.html` and `package.json` at the root,
NOT inside an extra wrapping folder:

```
index.html   package.json   package-lock.json   vite.config.js   vercel.json   netlify.toml
eslint.config.js   README.md   .gitignore   .nvmrc
public/    src/    scripts/    tests/
```
and `src/` must contain `main.jsx`, `App.jsx`, `styles.css` and the folders `components/`, `lib/`, `views/`.

1. Unzip the download on a computer. Open the unzipped folder so you can see `index.html`, `src`, `public`...
2. In your GitHub repo click **Add file → Upload files**.
3. Select EVERYTHING inside the folder (Ctrl/Cmd + A) and **drag it into the browser page**.
   Dragging is important: the "choose your files" link can't pick folders, which is the usual way `src` gets left out.
   Use a desktop browser (Chrome, Edge, Firefox, Safari on a Mac). Phones and tablets can't upload folders.
4. Wait for every file to finish, then **Commit changes**. Same filename = it replaces the old one.
5. **Check the result before deploying:** on the repo's main page click `src`. You should see `main.jsx`,
   `App.jsx`, `styles.css`, `components`, `lib`, `views`. If `src` is missing or empty, repeat step 3.

**Cleaning up an existing repo first** (if it holds older/different files): open each unwanted file or folder,
click the `…` menu, choose **Delete file** / **Delete directory**, and commit. Remove stray copies such as a
`main.jsx` at the root, or a project nested inside another folder. When the root matches the list above,
upload the corrected files.

**If the project sits inside a sub-folder of your repo,** either move it to the root, or in Vercel go to
Project Settings → General → **Root Directory** and set it to that folder name.

Every `npm run build` now starts with a structure check. If any required file is missing, the build stops
with a plain list of the missing files instead of a Rollup error.

### Route B: Netlify drag-and-drop (needs Node on a computer)
1. In the project folder run `npm install` then `npm run build`. This creates a `dist` folder.
2. Go to app.netlify.com/drop (sign in) and drag the **dist** folder onto the page.
   Note: drag-and-drop does not apply `netlify.toml`, so the extra security headers are not set on this route
   (the app still works). Use Route A if you want them.
To update later, rebuild and drop the new `dist`.

> Do not change the web address after you start using the app. Your data belongs to that exact address.

## Install on your phone

Open your deployed address on the phone, then:

- **iPhone/iPad (Safari only):** Share button → **Add to Home Screen** → Add.
  Do this BEFORE entering data: the Home Screen app keeps its own storage, separate from Safari.
- **Android (Chrome):** menu (⋮) → **Install app** (or **Add to Home screen**), or use the Install button in the app's Data tab.

Launch it from the new icon. It opens full-screen and works offline.

## Where your data lives (limitations)

- Stored in your browser's local storage on **this device only**. It is **not backed up and not synced** anywhere.
- It can be lost by: clearing site data/history, removing the app plus its data, a phone reset or loss, or the
  browser freeing space on a nearly full device. The app asks the browser to protect it (not guaranteed).
- A second phone or a computer starts empty. Move data with **Data → Export → Full backup (JSON)** then **Import**.
- On iPhone the Safari tab and the Home Screen app have separate storage. On Android Chrome they share it.
- Updating the app never erases your data: data is stored separately from the app's cached files.
- Make a JSON backup monthly (the app reminds you after two weeks). Keep it somewhere you trust: a backup
  file contains your financial details, so don't share it casually.
- Data you export or leave on a hosting account is your responsibility: the app itself never uploads anything.

## Troubleshooting
- Install option missing: needs https (the hosting address provides it); on iPhone use Safari.
- Not seeing a new version: close and reopen the installed app once or twice; the update installs in the background.
- Private/incognito windows may block storage; the app will say "Not saving".
