# Steam QA 1 (2026-10-08): saves, pause, keyboard and gamepad, text floor, desktop

Tester: the expert playtester / QA agent. No source code was edited.

Branch HEAD: `0024ce7`. This pass covers the Steam prep work (S1-S34) that landed after `playtest/STEAM_READINESS.md`.

**How I tested:**
- `npm test`: 28 files, 241 tests, all green. `npx tsc --noEmit -p .`: clean.
- `npm run build:steam`: 509 kB JS. No `dbg` or `TuningPanel` in `dist/assets`, and no PLAYTEST wording on the main menu.
- Headless Chromium (Playwright) against the dev server, at 1280x720 and at 1280x800 (letterboxed to the same layout).
  The public Steam build was also tested through `vite preview`. The test runs were driven by the keyboard wherever possible.
- I used `window.dbg` only to set up states quickly (seeded runs, forced wins and losses, the bonus wheel). Every bug below was then reproduced through normal input.
- The Electron smoke test passed (Q16).

Scripts and screenshots are in the session scratchpad
(`/tmp/claude-0/-home-user-SlotsVsSlots/878cf676-306f-5d16-9f27-4d5b2d19896b/scratchpad/qa2/`), referred to below as `qa2/`.

**Severity:**
- **blocker**: fix before any Steam build or public push.
- **major**: fix before launch or Deck review.
- **minor**: polish.

---

## Top of the list

| # | Sev | One line |
|---|-----|----------|
| Q1 | blocker | After a death, a win or ABANDON, CONTINUE brings the run back from the `.bak` backup. This breaks permadeath and the daily's one try, and lets players farm hiscores and XP. |
| Q2 | blocker | Shop price tags stay live after you leave the shop. You can buy shop items from the preview, the draft or RUN OVER. The keyboard focus also gets stuck on these invisible targets. |
| Q3 | major | Side-bet save-scum. Watch the fight (it is deterministic), quit mid-fight, CONTINUE: the bet is refunded and you can bet knowing the result. |
| Q4 | major | The name screen is a dead end on a gamepad: SKIP and OK can't be focused, and B does nothing. |
| Q5 | major | A save from an older build, holding a retired relic or Charm, crashes on CONTINUE. |
| Q6 | major | DAILY, WEEKLY, CHALLENGE and TUTORIAL silently overwrite or delete a saved run. TUTORIAL can delete a daily that is in progress. |
| Q7 | major | Tooltips are mouse-only. Keyboard and pad players can't read their relics, the collection or the in-fight BUILD drawer. |
| Q8 | major | No controller prompts: "CLICK TO SKIP", "SURE? CLICK AGAIN", "HOVER OR TAP" and the key reference are keyboard and mouse only. |

---

## Q1. BLOCKER: ended runs come back through CONTINUE (the `.bak` fallback)

**Repro:**
1. Start a run and reach the preview of fight 3.
2. Press FIGHT and lose the fight. RUN OVER shows, and the run goes into HISCORES.
3. Reload the page and press any key. The main menu shows **CONTINUE: ACT 1 SIR REGINALD**.
4. Press CONTINUE. The dead run is back on its preview with 300/300 HP, its chips and its relics.

The same happens:
- after **PAUSE → ABANDON RUN**: the menu still shows CONTINUE, and it works;
- after a won run, which can then replay its last boss and get its unlocks and XP a second time;
- after confirming **NEW RUN? THE SAVED ONE ENDS**: the new run's first checkpoint copies the old save into `.bak`, so the discarded run comes back after the next clear.

**Evidence:**
- Screenshots: `qa2/k_menu_after_death.png`, `qa2/k_resurrected.png` and `qa2/p_after_abandon.png` (CONTINUE right after ABANDON).
- The `t16.cjs` log:
  - after the loss: `run key: null`, `bak: next depth 2`;
  - after CONTINUE: `phase between, screen next, hp 300`;
  - `profile.runs` went from 0 to 1, so the death was recorded and the run can be played again.

**Cause:**
- `clearRunSave()` (`src/game.ts:168-176`) removes `slotvslot.run.v1`, but not `slotvslot.run.v1.bak`.
- `load()` (`src/game.ts:186-200`) returns `v ?? parse(<key>.bak)` when the main key is **missing**, not only when it is corrupt.
- `loadRunSave()` then accepts the backup.

**Impact:**
- Permadeath is gone.
- The daily's one try is gone.
- Achievement progress ("PLAY 25 RUNS", "LIFER"), XP and hiscores can be farmed by dying, continuing and dying again.

**Fix:**
- `clearRunSave()` should also remove `RUN_KEY + '.bak'` and `RUN_KEY + '.corrupt'`.
- In `load()`, fall back to `.bak` only when the main value **exists but fails to parse**. Never fall back when the key is absent.
- Belt and braces: give each run an id, and record ended run ids in the profile. Refuse a save whose id has ended.
- Add a unit test: clear, then load, must return null.

## Q2. BLOCKER: shop price tags stay clickable after you leave the shop

**Repro (mouse):**
1. Enter the Cashier and buy nothing.
2. Press LEAVE.
3. On the next preview, click the empty spots where the price tags were, at (632,332), (796,332), (796,510) and (960,332).
4. Chips drop from 13 to 3, and a Charm appears on your reels. You bought from a shop that is no longer on screen.

**Repro (keyboard):**
- On the fork preview, the draft and RUN OVER, the arrow keys land on those invisible rects. The focus ring sits on empty space (`qa2/w_over_enter2.png`).
- An Enter-only keyboard run got **stuck** on the second draft: focus was on a ghost tag at (796,510), and Enter bought nothing new and never moved on (`qa2/r_draft_1_2.png`, `qa2/t5.log`).

**Evidence:**
- Screenshots: `qa2/g_next_before.png` and `qa2/g_next_after.png`.
- The `t6.cjs` log: `chips 13 → 3, gilded 1 → 2` on screen `next`.

**Cause:**
- `RunScreens.open()` (`src/ui/runScreens.ts:723-731`) resets `shopHits` but not `shopTags`.
- `all()` (`:1358`) still returns the old tags (filtered only by `sold`). `pointerDown`, `pointerUp` and `navTargets` all use `all()`.
- `onBuy(i)` reaches `Game.buyItem()` (`src/game.ts:~935`), which buys from the stale `this.shelf`. Nothing checks that the shop is open.
- This dates from `6d40ba5` (price tags), so **it is probably live on the web build too**.

**Impact:**
- You can buy old stock later, after earning more chips.
- Purchases happen by accident.
- Keyboard-only play gets stuck.

**Fix:**
- Add `this.shopTags = [];` in `open()`.
- Guard `buyItem` and `rerollShop` with `this.screens.mode === 'shop'`.
- Add a test: after `showDraft` or `showNext`, `navTargets()` contains no shop rects.

## Q3. MAJOR: side-bet save-scum (quit mid-fight → refund → bet with hindsight)

**Repro:**
1. On a preview with a side bet, stake +5 +5. Chips drop from 13 to 3, and `run.bet` holds the stake of 10.
2. Press FIGHT and watch a few spins.
3. Quit: PAUSE → QUIT TO MENU, Alt-F4 or a reload.
4. Press CONTINUE. You are back on the preview with 13 chips and no bet.
5. Fights are seeded from the run, so the same fight plays again. Measured: 37 turns and 147 HP left on both tries.
6. Watch it once, quit, then bet the maximum on the bets you know will win.

**Evidence:**
- The `t7.cjs` log: `chips in save 13, bet in save null`; attempt 1 `{won, turns 37, hpAfter 147}` and attempt 2 identical.
- Screenshots: `qa2/b_bets.png` and `qa2/b_continued.png`.

**Cause:**
- The only snapshot before a fight is `checkpoint('next')`, taken when the preview opens (`showNextFight`, `src/game.ts:966-972`).
- `placeBet` and `stepStake` (`src/core/run.ts:699-727`) change the run after that, and `beginRunFight` (`src/game.ts:795`) doesn't checkpoint.

**Fix:**
- Checkpoint in `beginRunFight` before `newFight(true…)`, with `at: 'fight'` and the bet on the table.
- CONTINUE from `'fight'` restarts that same fight directly, with the bet locked. That is still watch-only.
- The fork choice is already safe: picking a side always goes through `showNextFight`, which saves the choice (verified: `qa2/p_continued_fork.png`).

## Q4. MAJOR: the name screen can't be passed with a gamepad

**Repro:**
1. Launch with no Steam bridge: the web build, or Electron with Steam closed or failing to init.
2. On PICK YOUR NAME, use the d-pad: no focus appears. A submits an empty name ("AT LEAST 3 LETTERS"). B and Start do nothing.

**Evidence:**
- `Menus.navTargets()` returns `[]` in `'name'` mode (`src/ui/menus.ts:163-165`), so OK and SKIP are unreachable.
- `Menus.key()` handles only Enter there (`:795-798`).
- The pad can't type into the DOM input.
- Screenshot: `qa2/04.png`.

**Notes:**
- With Steam running, `needsName()` is false, so a normal Steam launch skips this screen.
- But the Electron smoke test shows `steam: undefined` whenever `steamworks.js` fails (`qa2/electron_smoke.png` log), and then the player is stuck.

**Fix:**
- In name mode, list OK and SKIP as nav targets: down from the input moves to them.
- Map B / Escape to SKIP.
- On desktop without Steam, skip the screen and use `PLAYERnnnn`, as SKIP does.

## Q5. MAJOR: a save from an older build crashes on CONTINUE

**Repro:**
1. Take a saved run and add a retired relic (`riposte`) and a retired Charm (`stacked`). This is what a mid-run Steam update would leave behind: `4581e91` retired exactly these.
2. Reload and press CONTINUE.
3. The SOMETHING BROKE panel appears, from `hexToRgb` (undefined colour) in `drawReelTable` (`src/ui/reelTable.ts:140`), on every frame.

**Evidence:** `qa2/c_tampered_preview.png`.

**Cause:** `loadRunSave()` (`src/game.ts:721-727`) checks only the save's shape. Unlike prefs and profile, the content isn't sanitized.

**Fix:**
- Sanitize the run on load: drop unknown relic ids, unknown Charm `enh` values and unknown symbols; clamp HP and chips.
- If that fails, show "THIS RUN IS FROM AN OLDER VERSION" and clear the save.
- Add a test with a retired id.

## Q6. MAJOR: play modes silently replace the saved run

**Repro:**
1. Have a saved KNIGHT run (CONTINUE is showing).
2. Go to PLAY MODES → DAILY. The daily starts at once with no warning, and the KNIGHT save is overwritten.
3. Quit the daily to the menu (it continues fine, and the button reads DAILY: SPENT).
4. Go to PLAY MODES → TUTORIAL. `startTutorial` calls `clearRunSave()`, so **the in-progress daily, the day's only try, is deleted** (only Q1's `.bak` bug would bring it back).

**Evidence:** the `t17.cjs` log: `save now {cab: midas, daily: 2026-10-08}`, then after TUTORIAL `save now null`.

**Code:** `src/game.ts:578-581` (tutorial), `:755-766` (daily), `:768-791` (challenge and weekly).

**Fix:**
- When a save exists, give these buttons the same two-step arm as NEW RUN ("THE SAVED RUN ENDS").
- Or grey them out with "FINISH OR ABANDON YOUR RUN FIRST".
- The tutorial shouldn't clear someone else's save.

## Q7. MAJOR: information that only the mouse can reach

Tooltips follow `this.mouse` only:
- the relic icons in the YOUR BUILD panel: `src/ui/runScreens.ts:1442` (`tips.draw(..., this.mouse.x, this.mouse.y)`);
- collection tiles: `src/ui/menus.ts:968`;
- trophy titles: `:725`;
- hiscore relics: `:844`;
- the in-fight BUILD drawer handle: `src/game.ts:1404/1517`;
- the copied relic tip: `:1607-1617`.

None of these are nav targets. COLLECTION has exactly one target, BACK (`t13` log), so a keyboard or pad player can never read a relic after picking it, nor anything in the collection. Shop items and enemy "?" tabs *are* reachable, which is good.

**Fix:**
- Add the build-panel relic icons, collection tiles and trophy titles to `navTargets()`.
- When the focus is visible, draw tips at the focus point instead of `this.mouse`.
- Give the BUILD drawer a key: Tab / pad Back or View.

## Q8. MAJOR (Deck Verified): no controller prompts

**Evidence:**
- There is no input-device tracking or glyph code (`grep glyph|lastInput` finds nothing).
- Prompts written for mouse or keyboard:
  - "CLICK TO SKIP" / "CLICK TO CONTINUE" (`src/ui/runScreens.ts:2573`);
  - "SURE? CLICK AGAIN" (pause);
  - "HOVER OR TAP A TILE TO READ IT";
  - "CLICK MASTER (OR PRESS M) TO MUTE";
  - "CLASSIC TRIM: CLICK TO PUT IT ON...";
  - the key reference under SETTINGS, which lists keyboard keys only (`qa2/p_settings_from_pause.png`).
- Valve's Deck review wants controller glyphs whenever a controller is in use.

**Fix:**
- Track the last input device (mouse, keyboard or pad).
- Swap prompts to "PRESS A" / "ENTER" / "CLICK" to match.
- Add a pad line to the key reference.

---

## Minor

### Q9. Focus follows you into the fight; mashing Enter changes the speed
**Repro:**
1. Press FIGHT! with Enter.
2. The focus ring lands on the nearest HUD button: SPEED in the public build (LOG or TUNE in dev).
3. Each further Enter toggles that button: SPEED 2X → 4X → 8X, or it opens the LOG.

**Evidence:** `qa2/pub_fight_focus.png` and `qa2/pub_fight_enter1.png`.

**Fix:** `focus.hide()` in `newFight(true, …)` and in `RunScreens.open()`. The focus should reappear only on an arrow press.

### Q10. RUN OVER: a whole-screen focus ring, Escape does nothing, and the RESULTS panel sits under the sidebar
- **Whole-screen ring:** the first Enter focuses `resultsHit`, which is 1280x720 (`src/ui/runScreens.ts:1285`), so the ring is drawn around the whole screen.
- **Escape:** it does nothing on RUN OVER, because `pausable()` is false and there is no other handler.
- **Panel:** the RESULTS panel's left edge is under the YOUR BUILD sidebar (`qa2/w_over_0.png`: the XP bar starts cut off at x≈305).
- **Fix:**
  - Enter, Space or Escape skip the results without a ring.
  - Escape on RUN OVER goes to MENU.
  - Move the panel right of the sidebar (centre it at x≈790), or hide the sidebar while it shows.

### Q11. A reload during the BONUS WHEEL / RELIC RUSH rewinds to before the fight
- **Repro:** reload while the wheel is spinning. CONTINUE returns to the previous preview: depth 4 → 3, chips 40 → 30 (`qa2/s_bonus_before.png` and `qa2/s_bonus_after.png`).
- **Effect:** the fight replays identically, so nothing is lost or duplicated. But you must watch the whole fight again, and it opens Q3's bet scum without needing a pause.
- **Fix:** checkpoint right after `finishFight` with the `bonusLog` still pending, as `at: 'bonus'`.

### Q12. A reload in the shop rewinds to the draft
- **What happens:** purchases are undone and chips restored. That is consistent: no duplicates and no lost items (`t8` log: buy, reload → back to the draft with 14 chips).
- **The leak:** the player has now seen the shelf (seeded by act, depth and rerolls, not by the draft pick), so they can re-pick the draft knowing what the shop holds.
- **Fix:** checkpoint `at: 'shop'` when the Cashier opens, and after each purchase or reroll (shelf plus sold flags).

### Q13. Keyboard and pad polish
- **Space:** it only spins. It doesn't press the focused button; players expect Space or Enter.
- **Key repeat:** held arrow keys don't repeat (`src/main.ts:93`: `if (e.repeat) return`). The pad has repeat; the keyboard doesn't.
- **SETTINGS volume rows:** Left and Right should step the value. Today they travel to `-` and `+` by nearest-neighbour: from FULLSCREEN, Right jumps up three rows to SOUND FX `+`.
- **LB/RB:** they keep their own `speedIdx`, starting at -1 (`src/main.ts:146-150`), which ignores the real speed. The first RB from 8X goes to 4X.
- **Escape on the main menu:** it doesn't offer QUIT TO DESKTOP in the desktop build (S5 asked for that). The QUIT button is there.
- **In-fight QUIT (and R):** after SURE? they go to CHOOSE YOUR MACHINE, while the run stays saved. Now that PAUSE exists there are two different "quits". Suggest the in-fight QUIT opens PAUSE.

### Q14. Text floor (1.3): no real clipping found; two small overlaps
- **Checked at 1280x720 and 1280x800:**
  - menus: main menu, PLAY MODES, CHALLENGES, PROGRESS, COLLECTION, TROPHIES, HISCORES, SETTINGS and PAUSE;
  - run screens: machine select with stakes, the starting relic, single and fork previews with the bet card, the fight HUD (KNIGHT and BRIAR), the draft, the shop with item tips, the BONUS WHEEL, BIG CHOICE, RUN OVER and RESULTS.
  - Screenshots: `qa2/m800_*`, `qa2/q720_thorn_*`, `qa2/v800_*`, `qa2/r_*`, `qa2/s_*`.
  - No text leaves its panel.
- **Overlap 1, TROPHIES:**
  - the "TRIMS" label is cut by the top edge of the trim tiles (`src/ui/menus.ts:722`, `TRIM_Y - 38`);
  - the "CLASSIC" caption is hidden by the selected trim's highlight box (`qa2/z_troph_top.png`).
  - Move the label up about 8 px and the captions down about 6 px.
- **Overlap 2, HISCORES:**
  - "KILLED BY SPITEFUL FROST IMP, FIGHT 1/12" ends touching the enemy portrait (`qa2/h_hiscores.png`).
  - A longer name ("SPITEFUL ROCK GOLEM", FIGHT 11/12) will run under it.
  - Place the portrait after the measured text width, or truncate.
- **Tight, but legal:** TROPHIES "THE HOUSE ALWAYS LOSES BEAT THE DEALER ..." has about one space between the name and the description (`qa2/z_troph_left.png`).

### Q15. The crash panel isn't usable with a pad
- **The pad:** the crash panel is DOM (`src/ui/crash.ts`), and `pollPads` sends only to `game.key`, so A and B can't press COPY REPORT, KEEP PLAYING or RELOAD.
- **The keyboard:** a keydown on a focused DOM button also reaches the game (`src/main.ts:91` filters only input, select and textarea).
- **Fix:** while the panel is open, A = KEEP PLAYING, Start = RELOAD, and the game ignores keys.

### Q16. Desktop wrapper notes (the smoke test passed)
- **Smoke run:** `npm run build:steam`, then the Electron smoke test under xvfb. It loads, and the window shows PRESS ANY KEY with `v0.1.0+0024ce7` (`qa2/electron_smoke.png`).
- **Bridge:** `{"desktop":"object","steam":"undefined","fs":false}`. Steam's own client library isn't present here, so steamworks init fails as expected and the game runs on without it.
- **Steam Cloud precedence:** `load()` reads the save file only when localStorage lacks the key (`src/game.ts:188-192`). Once a PC has local data, a newer Auto-Cloud file from another PC never wins.
  - Fix: on desktop, make the file the source of truth (read the file first), or compare a `savedAt` stamp.
- **Icon:** `desktop/main.cjs:37` points to `desktop/icon.png`, which doesn't exist.
- **CSP:** Electron logs an "Insecure Content-Security-Policy" warning. Add a CSP meta tag to the steam build's `index.html`.

### Q17. MOTION: REDUCED leaves particles and flashes on
- It turns off zoom, chroma and hitstop only (`src/game.ts:1170`); confetti and the capped flash stay.
- That is acceptable (FLASH_CAP holds), but a player choosing "reduced" may expect fewer particles. Consider adding `particles: 'reduced'`.

---

## Verified working

- **PAUSE mid-fight:** Escape opens it. The fight froze: turn, player HP and enemy HP were unchanged after 3 s, and also while SETTINGS was open from PAUSE. Escape from SETTINGS returns to PAUSE, and Escape again resumes. Space and A don't leak into the fight while paused (`qa2/p_pause_fight.png`, `qa2/p_settings_from_pause.png`).
- **PAUSE on between screens:** works; RESUME is focused on the first Enter.
- **Window blur mid-fight:** pauses; blur between fights doesn't (fine).
- **ABANDON RUN:** the two-step arm works, and a second Enter within 400 ms is ignored. The run ends and the main key clears; Q1 is the `.bak` problem.
- **SETTINGS persistence:**
  - MASTER 7 / MUSIC 0 / SFX 10, SCREEN SHAKE OFF and MOTION REDUCED survive a reload.
  - The synth gains match: master 0.49 (0.7 × 0.7), music 0 and sfx 1.
  - Music ducking respects the music volume.
  - Clicking MASTER mutes and unmutes.
- **Continue round trips:** on the starting relic, the preview, BIG CHOICE and the draft, CONTINUE restores the identical run JSON and the same screen. A fork choice survives a quit. A fight replays identically after a mid-fight quit.
- **Daily:** the try is spent at the start (DAILY: SPENT), and quitting and continuing the daily works.
- **Keyboard reach:**
  - every main menu and sub-menu button;
  - machine cards, LOWER and HIGHER stakes;
  - draft cards, the starting relic, BIG CHOICE cards;
  - fork FIGHT THIS ONE ×2 and both "?" flip tabs;
  - the bet steppers −5/−1/+1/+5;
  - shop items (pin the tip), price tags (buy), REROLL and LEAVE;
  - the BONUS WHEEL's PASS and COLLECT;
  - RUN OVER's MENU and NEW RUN;
  - every PAUSE button.
- **Build checks:** `npm test` is green (241 tests), `tsc` is clean, and `build:steam` contains no dev tools.
