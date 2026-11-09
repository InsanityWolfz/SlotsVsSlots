# Desktop (Steam) build

Electron around the web build, plus an optional Steamworks bridge (STEAM_READINESS S4). Kept in its own folder so the
web build and its CI never install Electron.

```
cd desktop
npm install            # electron (+ steamworks.js, optional)
npm run dev            # builds the game with VITE_STEAM (../dist) and opens it
```

- App ids: launched by Steam, the game uses the id Steam gives it (`SteamAppId`). A packaged build also carries its own
  (`resources/appid.json`, written by `package.cjs`). `steam_appid.txt` (480, Valve's Spacewar) is only for dev runs
  (`npm start`); it never goes in a depot, and the game starts fine without it.
- The demo is its own Steam app with its own id, and its own save folder (`Reel Brawl Demo`).
- The game sees `globalThis.desktop` (quit, fullscreen, save files) and, with Steam running, `globalThis.steam`
  (persona name, id, achievements). Without Steam it runs as a plain desktop game.
- Saves: the game keeps using localStorage and mirrors every save key to `<userData>/saves/<key>.json`. Point Steam
  Auto-Cloud at that folder. If localStorage is ever empty (a reinstall, a new PC), the files restore it on boot.
- Achievements: the ids are the ones in `src/core/meta.ts` (`ACHIEVEMENTS`). `npx tsx tools/steam/achievements.ts`
  prints the table to paste into Steamworks.
- Packaging (one command per Steam app; output `../release/<target>-<platform>/`, the folder to upload to the depot):
  `STEAM_APP_ID=<full id> npm run package:full -- win` and
  `STEAM_APP_ID=<demo id> VITE_STORE_APP_ID=<full id> npm run package:demo -- win`. Each builds its own web build,
  bakes in its id, unpacks steamworks.js from the asar (or Steam silently fails), and keeps en-US only. 480 is refused
  unless `ALLOW_TEST_APPID=1` (a local test package). Windows packages built on Linux keep Electron's exe icon and
  version info: package on Windows (or set `WIN_EDIT_EXE=1` with wine) for the release build. Plan: Windows first, and
  the Deck runs it through Proton; a native Linux build needs testing in the Steam Linux Runtime (Electron's sandbox).
- Save folder: `<appData>/Reel Brawl/saves` (the demo: `Reel Brawl Demo`). Never rename the product names after
  release: the folder would change and orphan everyone's saves. Steam Auto-Cloud: point each app at its own folder.
  If Steam was launched but Steamworks failed, `<appData>/<product>/steam.log` says why.
- `icon.png`: export a 512x512 PNG of `public/favicon.svg` (nearest-neighbour scaling).
