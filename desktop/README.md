# Desktop (Steam) build

Electron around the web build, plus an optional Steamworks bridge (STEAM_READINESS S4). Kept in its own folder so the
web build and its CI never install Electron.

```
cd desktop
npm install            # electron (+ steamworks.js, optional)
npm run dev            # builds the game with VITE_STEAM (../dist) and opens it
```

- `steam_appid.txt` holds 480 (Valve's Spacewar test app). Put the real app id there before shipping.
- The game sees `globalThis.desktop` (quit, fullscreen, save files) and, with Steam running, `globalThis.steam`
  (persona name, id, achievements). Without Steam it runs as a plain desktop game.
- Saves: the game keeps using localStorage and mirrors every save key to `<userData>/saves/<key>.json`. Point Steam
  Auto-Cloud at that folder. If localStorage is ever empty (a reinstall, a new PC), the files restore it on boot.
- Achievements: the ids are the ones in `src/core/meta.ts` (`ACHIEVEMENTS`). `npx tsx tools/steam/achievements.ts`
  prints the table to paste into Steamworks.
- Packaging: use electron-builder or electron-forge with the web build copied to `resources/web/` (main.cjs loads it
  from there when packaged). Windows and Linux first; the Deck runs the Linux build (or Windows via Proton).
- `icon.png`: export a 512x512 PNG of `public/favicon.svg` (nearest-neighbour scaling).
