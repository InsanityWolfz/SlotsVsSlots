# Hosting the public playtest

```
npm install
npm run build
```

This writes a static site to `dist/` (an `index.html` plus an `assets/` folder, all relative paths).
Upload the **contents** of `dist/` anywhere that serves static files:

- **itch.io**: zip the contents of `dist/`, create an HTML project, upload the zip, and tick
  "This file will be played in the browser". A viewport of 1280×720 is ideal (the game scales to fit).
- **Netlify / Vercel**: drag and drop the `dist/` folder (or point them at this repo with build command
  `npm run build` and publish directory `dist`).
- **GitHub Pages**: push the contents of `dist/` to a `gh-pages` branch (or a `/docs` folder).

## What the public build does differently

- There's no TUNE panel and no `window.dbg` helpers, so there are no cheats or balance sliders. Saved
  tuning overrides and the dev "unlock all" flag are ignored.
- The LOG (combat log) is still available.

## Saving

Meta progression is saved in the player's own browser (`localStorage`) and survives closing the tab
or the browser: unlocked slot machines, stake levels per slot machine, the ACT 3 unlock, TRUE ENDING
frames and settings (speed, sound, auto). There is no mid-run save. Clearing site data, private
windows, or a different browser/device start fresh.

## Builds

| Command | What it builds |
|---|---|
| `npm run dev` | local dev server (debug helpers + TUNE panel) |
| `npm run build` | **public build** → `dist/` |
| `npm run build:playtest` | internal playtest build with debug helpers → `playtest-build/` |
