# Steam readiness review (2026-10-08)

Reviewer: expert playtester agent. No source code was edited.

**What I ran:**
- `npm test`: 27 files, 239 tests, all green. `npx tsc --noEmit -p .`: clean.
- A public `vite build`: 496 kB JS (155 kB gzip). No `dbg` or `TuningPanel` in `dist/assets`.
- `tools/sim/table.ts 300`: WHITE average 42.5 and GREEN 16.9, inside the gates. Fight-4 deaths are 0.0-4.7%: MIDAS is at 0.0%, below the 3-6% gate.
- Headless Chromium against `npm run dev`, at 1280x720, 1280x800 (Steam Deck), 960x540 and 1920x1080. I clicked through:
  loading, name entry, main menu, SETTINGS, PLAY MODES, CHALLENGES, PROGRESS (COLLECTION, TROPHIES, HISCORES),
  the slot machine select, the starting relic, the preview, a fight, the draft, the shop, the BONUS WHEEL, side bets and RUN OVER.
  I also reloaded the page in the middle of a run.

**Overall:** the content and the meta are further along than most early-access roguelikes:
- 5 slot machines, 15 regular enemies, REPO MAN, and 3 bosses (House, Mirror, Dealer);
- 58 relics and 9 charms;
- 5 stakes, endless mode, daily and weekly runs, 7 challenges, 33 achievements, titles and trims.

The gaps are all at the "PC product" layer:
- input (mouse only);
- no settings depth;
- no pause menu;
- no run save;
- no desktop wrapper;
- browser-playtest wording.

None of these need design approval, and most are mechanical.

Priority: **P0** = blocker for a Steam release (or for Deck Verified), **P1** = should have at launch, **P2** = nice.
Tags: **[SAFE]** = engineering, bug, settings, packaging or wording work; **[NEEDS OWNER]** = design, balance or content.

---

## P0: blockers

### S1. P0 [SAFE] No mid-run save: closing the window loses the run
- **Evidence:**
  - Only prefs, profile and config are ever written: `src/game.ts:69-71`, `save()` at `:149`.
  - `RunState` is never persisted.
  - Verified in Chromium: start a run, pick the relic, reload. Result: `phase: 'title', run: false`.
  - THE DAILY RUN marks the try as spent at the start (`src/game.ts:613`, "quitting doesn't give it back"), so a crash or an Alt-F4 burns the day.
- **Why it blocks:** a desktop roguelike that loses the run when you close it gets refund-tier reviews. Steam players expect "CONTINUE".
- **Fix:**
  - Add a new key, `slotvslot.run.v1`. Don't touch the existing keys.
  - Checkpoint `RunState` to it on entering every between-fight screen (start, draft, spoils, shop, next, bonus, choice), and when a fight starts.
  - Clear it on run over or abandon.
  - On the main menu, show **CONTINUE** above NEW RUN when the key holds a valid run (sanitize it like the profile).
  - **Anti-scum:** a non-daily fight's seed is random today (`src/core/run.ts:602`: `cfg.seed = run.daily ? ... : null`), so quitting mid-fight would re-roll a losing fight. Derive every fight's seed from `run.seed`, as the daily already does. A resumed fight then replays the same fight, which also matches the watch-only rule.
  - The `Rng` is pure seeded state (`src/core/rng.ts`), and the run rngs are re-derived from `run.seed`, so `RunState` should be plain JSON. Write a round-trip test (`JSON.parse(JSON.stringify(run))` plays on identically under the sim).
- **Also:** the sim must be unchanged after the seed derivation: the same distribution, with only the seed source different. Log the table before and after anyway.

### S2. P0 [SAFE] No pause / options menu, and no way out between fights
- **Evidence:**
  - `Escape` mid-run does nothing:
    - `src/main.ts:88-93` forwards it to `game.key`;
    - `game.key` (`src/game.ts:1111-1148`) handles it only when a menu is open;
    - run screens have no key handler at all.
  - The in-fight QUIT (`src/game.ts:325`) is hidden on every between-fight screen (`overlay` at `:333-334`).
  - On draft, shop, preview and choice there is **no** way back to the menu and no way to reach SETTINGS.
  - Verified: Escape during a fight leaves `menu: 'none'`, and nothing appears.
- **Fix:** an Escape / Start-button **PAUSE** overlay, usable anywhere in a run:
  - RESUME, SETTINGS (the same panel as the main menu), ABANDON RUN (the existing two-step SURE?), QUIT TO MENU (keeps the S1 save), QUIT TO DESKTOP (desktop build only).
  - It freezes the fight clock while open (the coach already does this: `gdt = coach.active ? 0 : ...`, `src/game.ts:1164`).
  - Fights stay watch-only: pausing isn't input into the fight.

### S3. P0 [SAFE] Mouse only: no keyboard or gamepad navigation of menus and run screens
- **Evidence:**
  - No `gamepad` anywhere in `src/`.
  - Menus accept only Escape, Enter (name and loading screens only) and M: `src/ui/menus.ts:725-743`.
  - `RunScreens` has pointer handlers only (`src/ui/runScreens.ts:1351-1401`). You can't pick a draft card, buy in the shop, choose a fork or set a side bet without a pointer.
  - Verified: Arrow, Tab and Enter on the main menu do nothing.
- **Why it blocks:** Steam Deck Verified needs full gamepad navigation with on-screen glyphs. A desktop player expects arrows, Enter and Escape.
- **Fix:**
  - Add one focus layer shared by `Menus`, `RunScreens` and `Game`.
  - Both `Button` and `Hit` already carry x, y, w and h. Build a list of focusables per screen and move focus with arrows, D-pad or stick (nearest neighbour in that direction).
  - A / Enter / Space activates. B / Escape backs out.
  - The focused element gets the existing hover look (`hover = true`, plus the card `lift`). Hover tooltips (relics, collection, trophies) show for the focused element.
  - Gamepad: poll `navigator.getGamepads()` in `frame()`, map LB/RB to speed down/up, Y to AUTO, Start to PAUSE (S2), with edge detection and key repeat.
  - Show A/B glyph hints only when the last input was a pad.

### S4. P0 [SAFE] No desktop build (Electron, Tauri or similar), and no Steamworks bridge
- **Evidence:**
  - `package.json` has only Vite scripts. No wrapper exists in the repo.
  - `src/net/identity.ts:7-11` already expects `globalThis.steam` (`personaName`, `steamId`). Nothing provides it.
- **Fix:**
  - Add a `desktop/` folder with Electron plus `steamworks.js` (or Tauri with a Steamworks plugin) loading `dist/` with `loadFile`. `base: './'` in `vite.config.ts` already works from `file://`.
  - Expose a small preload bridge: `steam.personaName/steamId`, `steam.unlock(achId)`, `steam.setStat`, `steam.cloudWrite/Read`, `app.quit()`, `app.setFullscreen()`.
  - Add `npm run build:steam`, which sets `VITE_STEAM=1` (S8 depends on it).
  - Add a `steam_appid.txt` for dev, and an app icon (S20).
  - Test Windows and Linux first: Proton or a native Linux build covers the Deck.

### S5. P0 [SAFE] No QUIT on the main menu (desktop)
- **Evidence:** the main menu shows only NEW RUN, TUTORIAL, PLAY MODES, PROGRESS and SETTINGS (`src/ui/menus.ts:197-218`). Escape on the main menu does nothing (verified).
- **Fix:**
  - When the desktop bridge exists, add a quiet **QUIT** button bottom-left, where "PLAYTEST BUILD" sits now.
  - Escape on the main menu asks "QUIT TO DESKTOP?".
  - Leave the button out of the web build.

### S6. P0 [SAFE] Text too small for Steam Deck (1280x800)
- **Evidence:**
  - The font is 5x7 (`src/render/fontData.ts:3-4`). At 1280x800 the game renders at scale 1, so text scale 1 gives 7 px glyphs and scale 1.25 gives 8.75 px.
  - Valve's Deck guideline is at least 9 px at 1280x800.
  - Literal call sites: 15 at scale 1 and 34 at scale 1.25 (more pass a variable).
  - Examples: the TROPHIES achievement lines (`src/ui/menus.ts:684`), "VOUCHERS: WIN TO CASH" (`src/game.ts:1250`), the 3-12 letters hint, the cabinet "PLAY AS ..." lines, the trim level labels.
  - In the screenshots the trophy and achievement descriptions are hard to read even at 720p.
- **Fix:**
  - Set a global floor: no `drawText` below 1.5. Clamp it in `drawText`, or add a `TEXT_MIN` setting that defaults to 1.5 on Deck (detect `steam.isDeck` or a 1280x800 viewport).
  - Re-layout the TROPHIES list into 2 pages or a scroll list (its 33 rows don't fit at 1.5).

---

## P1: should have at launch

### S7. P1 [SAFE] SETTINGS is too thin: add volume sliders and the juice toggles that already exist
- **Evidence:**
  - SETTINGS has only SOUND ON/OFF, LIGHTNING FULL/SOFT and RESET SAVE (`src/ui/menus.ts:298-339`).
  - The synth already has separate `master`, `sfx`, `music` and `loops` buses (`src/audio/synth.ts:37-56`).
  - `JuiceToggles` already has `shake`, `zoom`, `chroma`, `flash` and `particles` (`src/present/stage.ts:12-39`), applied by `applyJuice()` (`src/game.ts:344`). The public build can only reach them through the dev TUNE panel.
- **Fix:**
  - Add sliders (or 0-10 steppers) for MASTER, MUSIC and SFX, saved in prefs as new optional fields (sanitized).
  - Add toggles: SCREEN SHAKE, ZOOM PUNCH, COLOR SPLIT, FLASHES.
  - Add a single **REDUCE MOTION** master that turns all four off and turns SOFT LIGHTNING on.
  - Add the default fight speed (1X-8X) and AUTO default (both are already prefs).
  - Add a DISPLAY section (S9). Use pages or tabs: AUDIO, VIDEO, ACCESSIBILITY, GAME.

### S8. P1 [SAFE] Browser-playtest wording is shipped on screen
- **Evidence:**
  - "PLAYTEST BUILD. PROGRESS SAVES IN THIS BROWSER." on loading (`src/ui/menus.ts:812`).
  - "PLAYTEST BUILD" on main (`:838`).
  - "CLICK TO PLAY" on the loading screen.
  - "(ONLINE BOARDS OPENING SOON)" on name entry (`:477`).
  - "THE ONLINE BOARDS ARE NOT OPEN YET" (`:1041`).
- **Fix:** gate these on a build flag (`VITE_STEAM`). The desktop build shows the version (S19) instead, "PRESS ANY KEY" instead of CLICK TO PLAY, and no "opening soon".

### S9. P1 [SAFE] No fullscreen or window option on desktop, and non-integer pixel scaling
- **Evidence:**
  - Fullscreen is requested only on touch devices (`src/main.ts:40-56`). There's no F11 or Alt+Enter, and no settings toggle.
  - Scaling is `fit = min(vw/W, vh/H)` (`src/main.ts:21-33`). At 1920x1080 that's 1.5x, so the 8-bit pixels come out uneven, 1 or 2 px wide.
- **Fix:**
  - Add a FULLSCREEN / WINDOWED setting through the bridge (`BrowserWindow.setFullScreen`), plus Alt+Enter and F11.
  - Add a **PIXEL PERFECT** option: floor the fit to an integer when at least 1x is possible, and letterbox the rest.
  - Electron: set the window's minimum size to 960x540 and remember its size and position.

### S10. P1 [SAFE] Stale tutorial text: four callouts contradict the current game
All in `src/ui/coach.ts`:
- `:34`: "1X 2X 4X SETS THE SPEED". Speeds are 1/2/4/8X (`src/game.ts:76`), set with one cycling button.
- `:34`: "CLICK ANYWHERE TO SKIP AN ANIMATION". Clicking no longer skips (`src/game.ts:1076-1077`: "A click no longer skips the fight's playback").
- `:42`: "SAVED CHIPS EARN INTEREST AND SHIELD YOU AGAINST THE BOSSES". The chip shield was removed on 2026-10-07 (`src/core/run.ts:565`).
- `:45`: "STAKE CHIPS ON ... A FAST WIN, A CLEAN WIN, JACKPOTS OR ONE BIG HIT". The table is now one HOT HAND long shot (STATE.md, line 1671).
- `:32`: the meters are listed as "(BOLTS, CHIPS, THORNS OR WILDS)". The HUD labels are LIGHTNING, GOLD / HIGH ROLLER, THORNS and JACKPOTS (`src/game.ts:104-112`).

**Fix:** rewrite these 5 strings to match the HUD words. While there, remove the dead chip-shield comment at `src/core/run.ts:558`. Also check whether the chip-shield playback at `src/present/director.ts:863-872` is still reachable, and delete it if not.

### S11. P1 [SAFE] Saves aren't crash-safe: one corrupt write wipes all progress
- **Evidence:**
  - `load()` returns `null` on a JSON parse error (`src/game.ts:140-147`), and `sanitizeProfile(null)` gives an empty profile.
  - The next `saveProfile()` overwrites the corrupt-but-recoverable save.
  - `save()` swallows quota errors silently (`:149-155`).
- **Fix:**
  - Before each profile or prefs write, copy the previous good value to a **new** backup key (`slotvslot.profile.v1.bak`, `.prefs.v2.bak`). The live keys keep their names.
  - On a parse failure, load the backup.
  - Never overwrite a save that failed to parse, until the player confirms.
  - Desktop: mirror both JSON blobs to files in `app.getPath('userData')` (write to a temp file, then rename) for Steam Auto-Cloud (S12).

### S12. P1 [SAFE] Steam Cloud and achievements need wiring
- **Achievements:**
  - 33 already exist with stable ids (`src/core/meta.ts:249`). They're granted through `recordMeta`, and progress counters already exist (the 0/25 and 0/100 runs).
  - On grant, call `steam.unlock(id)`. Push stats for the counted ones (runs, dailies, collection).
  - On boot, re-sync everything already in `profile.achievements`, so existing players get credit.
  - Write the Steamworks achievement table from `ACHIEVEMENTS`: id, name, text and "hidden" for the `???` one.
- **Cloud:** with S11's file mirror, use Steam Auto-Cloud on the userData folder (no SDK calls needed).

### S13. P1 [SAFE] No global error handler or crash screen
- **Evidence:** there's no `window.onerror` or `unhandledrejection` handler. An exception in `frame()` stops the rAF loop, and the screen freezes with no message.
- **Fix:**
  - Wrap `game.update` and `game.draw` in try/catch inside `frame()`. Keep the loop alive.
  - On a repeated error, draw "SOMETHING BROKE. YOUR PROGRESS IS SAVED." with buttons: COPY REPORT (seed, machine, act, depth, stack, version), MENU, and QUIT on desktop.
  - Desktop: write the report to a `logs/` file.

### S14. P1 [SAFE] Pause on focus loss and the Steam overlay
- **Evidence:**
  - Only `visibilitychange` pauses (`src/main.ts:99`, `src/game.ts:1029`).
  - An unfocused desktop window, or the Steam overlay (Shift+Tab), is still "visible", so a fight on AUTO plays on unseen and audio keeps going.
- **Fix:** on `blur`, or the overlay-activated callback from the bridge, open the S2 pause overlay. Add an "AUDIO WHEN UNFOCUSED: ON/OFF" option.

### S15. P1 [NEEDS OWNER] There's no music, only an ambient drone
- **Evidence:** the `music` bus carries only `startAmbient()`: 5 detuned sines and filtered noise (`src/audio/synth.ts:187-216`). SFX are rich (about 40 cues in `src/audio/sounds.ts`).
- **Why it matters:** players notice the lack of music in store videos and in the first 10 minutes. CloverPit's reviews praise its sound design.
- **Options:**
  - (a) Commission 4-6 chiptune loops: menu, act 1/2/3, boss, shop.
  - (b) A procedural chiptune sequencer on the existing synth.
- The decision on style and budget is the owner's. Volume plumbing is S7.

### S16. P1 [SAFE] Mandatory name entry before the first run
- **Evidence:** first launch forces "PICK YOUR NAME" before the menu (`src/ui/menus.ts:194`, `needsName`). With the boards offline, a player must type a name to play at all.
- **Fix:** the Steam build already skips it (`needsName` is false when `globalThis.steam` exists). For the web and DRM-free builds, add a SKIP that uses `PLAYER-1234`, and ask again only when they open HISCORES online.
- **Polish:** the drawn caret sits on top of the placeholder ("TYPE A| NAME") until you type.

### S17. P1 [SAFE] Overlaps found in the menus
- **PLAY MODES:** the chip icon overlaps the "D" of "DAILY: THE BANKROLL" (`src/ui/menus.ts:258-260`; a long label at scale 3 plus an icon). Shrink to scale 2 above 18 characters, or give icon buttons a left text inset.
- **COLLECTION:** the "HOVER OR TAP A TILE TO READ IT" info panel (`src/ui/menus.ts:962`) covers the lower half of the 4th relic row (relics 49-58). Move the panel down or shrink the grid pitch. 58 relics needs 4 rows of 16.
- **Fight:** the big "PAIR! 26 X 6 = 156!" banner covers both HP panels, including the player's shield bar and the enemy portrait, for its duration (seen at 1280x800). Anchor it between the panels, or lower it under the title.

### S18. P1 [SAFE] Hover-only information has no keyboard or pad equivalent
- **Evidence:** relic tips, collection tiles, trophy and title tips are all mouse-hover driven ("HOVER OR TAP"). On a pad (S3) none of this is readable.
- **Fix:** with S3, the focused element shows its tip. Add an "INFO" button (pad X) on fight screens that opens the relic and build drawer (the existing BUILD drawer, `src/game.ts:1061-1067`).

### S19. P1 [SAFE] No version number on screen
- **Evidence:** `package.json` says `0.1.0`. Nothing displays it, so bug reports from Steam players can't name a build.
- **Fix:** add `define: { __APP_VERSION__: JSON.stringify(pkg.version + '+' + gitShort) }` in `vite.config.ts`. Draw it bottom-left on the main menu (replacing "PLAYTEST BUILD") and in the crash report (S13).

### S20. P1 [SAFE] No favicon or app icon
- **Evidence:** every load logs a 404 (`index.html` has no `<link rel="icon">`, and there's no `public/` folder).
- **Fix:**
  - Export the existing chip sprite (or the slot machine sprite) at 16, 32, 256 and 512 px with `tools/build-art.mjs`.
  - Add it as the favicon and the Electron or Tauri icon.
  - Steam also needs a 32x32 .ico for the client.

### S21. P1 [SAFE] No CREDITS screen
- **Fix:**
  - Add PROGRESS > CREDITS, or a SETTINGS footer: design, code, art, playtesters, "Made with TypeScript + Vite".
  - Add any open-source licenses that ship (Electron's, `steamworks.js`'s).
  - Everything else is hand-authored (pixel font, sprite grids, procedural audio), which is a clean licensing story worth keeping.

### S22. P1 [NEEDS OWNER] Steam leaderboards vs Supabase
- **Evidence:** the online boards are Supabase with an empty URL and key (`src/net/config.ts:6-9`).
- **Decision for the owner:**
  - (a) Use Steam leaderboards for daily, weekly and all-time: free, tied to Steam ids, no server.
  - (b) Keep Supabase for cross-platform web and Steam.
- The identity layer already supports Steam ids. If the answer is (a), wiring it is SAFE work.

### S23. P1 [SAFE] Audio unlock gate and "CLICK TO PLAY"
- **Evidence:** the loading screen waits for a click or Enter (`src/ui/menus.ts:690-698`) to satisfy the browser autoplay policy.
- **Fix:** on desktop, set `autoplayPolicy: 'no-user-gesture-required'` and advance the loading screen automatically. On the web, show "PRESS ANY KEY" and accept any key or pad button (today only Space and Enter count).

---

## P2: nice to have

### S24. P2 [SAFE] Colorblind support
Some signals are color-only:
- "DEFEATED" in red vs a win in the run table;
- the green and red reel markers on draft cards (the `▮▮▮` reel indicator on "REEL 1 / REEL 3" uses green fill only);
- enemy name green vs player gold;
- rarity text colors in the COLLECTION legend.

**Fix:** add a shape or outline to the reel indicator (it already has a REEL N label), add icons next to rarity words, and add an optional high-contrast palette. Symbols themselves are distinct sprites, which is good.

### S25. P2 [SAFE] Hold-to-fast-forward and a "skip to result" for repeat players
- **Evidence:** a click no longer skips. 8X is the only accelerator.
- **Fix:** holding Space or the right trigger plays at 16X while held. This is presentation only and doesn't change the watch-only rule. Optional.

### S26. P2 [SAFE] Remember window state, and the Deck 16:10 letterbox
- **Evidence:** at 1280x800 there are 40 px black bars top and bottom (verified).
- **Fix:** fill the bars with the existing background (`Background.draw`, drawn full-bleed) instead of `#07030d`, so the Deck doesn't look letterboxed.

### S27. P2 [SAFE] BONUS WHEEL has no caption
- **Evidence:** the wheel screen shows only icons and "VOUCHER 1 OF 1". A first-time player can't tell what the slices are until it lands.
- **Fix:** a one-line caption, "SPINNING FOR A FREE REWARD", plus the landed slice's name under the wheel (the payout text likely exists already).

### S28. P2 [SAFE] Cabinet-select card fonts are inconsistent
- **Evidence:** the 5th locked card draws "???" at a smaller scale than the other four (in the CHOOSE YOUR MACHINE screenshot). Starting-relic titles auto-shrink ("WHETSTONE BELT" is smaller than "WAR DRUM").
- **Fix:** shrink titles to a fixed second size only, and use the same scale for every "???" placeholder.

### S29. P2 [SAFE] The R key is a hidden NEW RUN everywhere
- **Evidence:** `src/game.ts:1138-1142`. On the title and over screens, R starts a new run with no on-screen hint. With keyboard navigation (S3) this becomes a stray hotkey.
- **Fix:** keep R, but show "R: NEW RUN" on the RUN OVER buttons. Also add a keybind reference to SETTINGS: SPACE spin, A auto, 1-4 speed, M mute, L log, ESC pause.

### S30. P2 [SAFE] COPY LOG and the clipboard on desktop
- **Evidence:** `navigator.clipboard.writeText` (`src/game.ts:1015-1018`) works in Electron. It's a sandbox (recap) feature, so it's harmless.
- **Fix:** route it through the bridge, or hide it in the Steam build.

### S31. P2 [SAFE] Hidden-tab audio resume
- **Evidence:** `setHidden` pauses audio (`src/game.ts:1029`).
- **Fix:** check that resume restarts the ambient bed after a long suspend (AudioContext `interrupted` state on macOS and the Deck sleep/resume). Add a `ctx.resume()` on focus.

### S32. P2 [SAFE] Localization readiness
- **Evidence:** every string is an inline uppercase literal, and the 5x7 font has only ASCII glyphs (`src/render/fontData.ts`).
- **Fix (prep only):** move user-facing strings into one `strings.ts` table, starting with menus, settings and the tutorial. This also makes wording-consistency passes like S10 trivial. Actual languages are an owner decision (see N6).

### S33. P2 [SAFE] Performance guard for low-end or Deck battery
- **Evidence:** rendering is capped at 2x (`src/main.ts:16`), which is good. There's no frame cap.
- **Fix:** on 120/144 Hz screens the game redraws every frame, even on static menus. Add a 60 FPS cap option, or skip redraws on menus when nothing animates.

### S34. P2 [SAFE] Small robustness items
- Escape on the challenges and hiscores pages works. Escape on CHOOSE YOUR MACHINE should go back to the menu (the MENU button exists; check that `screens` gets the key once S3 lands).
- Name input: `maxLength` is 12, but nothing trims to the font's width.
- Prefs sanitize: confirm that unknown fields added for S7 default safely on old saves (`sanitizePrefs`, `src/game.ts:114-137`).

---

## NEEDS OWNER (design, content, balance)

### N1. P1 [NEEDS OWNER] Music direction and budget (see S15)

### N2. P1 [NEEDS OWNER] Leaderboard platform: Steam vs Supabase (see S22)

### N3. P1 [NEEDS OWNER] Run length and session-friendly saves
- With S1 in place, decide whether a resumed run may resume **mid-fight** (replay the same seeded fight from the start) or only between fights.
- Decide whether quitting a daily mid-run keeps today's score at the depth reached, or counts as a forfeit.

### N4. P2 [NEEDS OWNER] Achievement list review for Steam
- 33 is a healthy number.
- Decide which ones stay hidden on Steam (only `???` today).
- Several are grindy (LIFER: 100 runs; COMPLETIONIST: 67/67). Steam players accept these, but confirm the owner wants them.
- Steam also wants achievement icons (64x64, unlocked and locked): an art task.

### N5. P2 [NEEDS OWNER] Content depth vs. comparable games
- The store pitch rests on 5 slot machines, 58 relics, 9 charms, 15 regular enemies and 3 bosses.
- Competitors (CloverPit) ship far more charms, and their reviews complain about charm bloat, so 9 charms is a defensible choice. But the shop will feel repetitive past about 10 hours.
- The owner's call: a 10th-12th charm, a 4th boss for endless, or a "Daily modifiers" pool. Not urgent for EA.

### N6. P2 [NEEDS OWNER] Localization scope
- Which languages, if any, at launch? Simplified Chinese is a large share of Steam roguelike buyers.
- Any non-Latin language needs a new pixel font: an art decision.

### N7. P2 [NEEDS OWNER] Balance note from the table run
- MIDAS fight-4 deaths are 0.0% (N=300; the gate is 3-6%). JOKER's jackpot rate is 54.5%, vs about 30% for the others.
- These aren't Steam blockers, but worth a look in the next balance pass. Re-measure at N=1500 first.

---

## Suggested overnight order (SAFE only)
1. S10 (stale tutorial text). S8, S19 and S20 (build flag, version, icon). S17 (three overlaps). These are small, low-risk and visible.
2. S11 (save backups). S13 (crash guard).
3. S7 (settings: volume and juice toggles exposed). S9 (fullscreen and pixel-perfect).
4. S2 (pause overlay) and S5 (QUIT). Then S1 (run save). S1 needs the fight-seed derivation measured with the sim, before and after.
5. S3 (keyboard and gamepad focus layer). This is the largest item. S18 rides on it.
6. S4 (Electron and steamworks.js scaffold), then S12 (achievements and cloud) and S14 (overlay pause).
7. S6 (Deck text floor). This touches layouts, so do it after S17, and check every screen at 1280x800.
