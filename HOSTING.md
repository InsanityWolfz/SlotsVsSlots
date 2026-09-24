# Hosting the public playtest

## GitHub Pages (set up)

`.github/workflows/deploy.yml` tests, builds and publishes the game every time you push to `main` or
`master`.

1. Create the GitHub repo and push this project to it.
2. Open the repo's **Settings → Pages → Build and deployment**, and set **Source** to **GitHub Actions**.
3. Push again, or run the workflow from the **Actions** tab. The game goes live at
   `https://<your-user>.github.io/<repo-name>/`.

All paths are relative (`base: './'`), so any repo name works.

## Anywhere else

```
npm install
npm run build
```

This writes a static site to `dist/`. Upload the **contents** of `dist/` to anything that serves
static files:

- **itch.io:** zip `dist/`, create an HTML project and tick "played in the browser". A 1280×720
  viewport is ideal.
- **Netlify / Vercel:** use build command `npm run build` and publish directory `dist`.

## What the public build does differently

- No TUNE panel, no `window.dbg` helpers and no debug module. The build contains no cheat code.
- Saved tuning overrides and the dev "unlock all" flag are ignored.
- The combat LOG is still available.

## Saving

Everything is saved in the player's own browser (`localStorage`) and survives closing the tab or
the browser:

- unlocked slot machines, stake levels per slot machine, the ACT 3 unlock and TRUE ENDING frames;
- the collection log and hiscores (`slotvslot.profile.v1`);
- settings (speed, sound, auto).

There is no mid-run save. The main menu has a RESET SAVE button. Clearing site data, a private
window, or a different browser or device starts fresh.

## Builds

| Command | What it builds |
|---|---|
| `npm run dev` | local dev server (debug helpers + TUNE panel) |
| `npm run build` | **public build** → `dist/` |
| `npm run build:playtest` | internal playtest build with debug helpers → `playtest-build/` |
