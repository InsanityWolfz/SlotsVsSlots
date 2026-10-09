# Playtest round 13 (2026-10-09, build 3d815d5)

How I tested:
- **Browser runs (Playwright):**
  - KNIGHT at WHITE, played straight through. Died in Act 2, fight 11 of 12.
  - TESLA at WHITE. Won: the Mirror took 17 turns, 250 HP down to 27.
  - THE JUKEBOX at GREEN. TRUE ENDING, Dealer at 290 down to 137 HP.
  - I watched the first fight of each run and every boss in full, at 4X. Most other fights in the TESLA and JUKEBOX runs
    used `forceWin`. The draft picks came from a simple scripted rule.
  - Menus checked: name entry, main menu, PLAY MODES, PROFILE (collection, trophies), HISCORES (all 4 tabs), SETTINGS,
    machine select (fresh profile and a profile at stake 3), the enemy card flip, shop hovers, the bonus wheel, RELIC RUSH,
    the BONUS ROUND, RESULTS and the run summary.
- **Checks:** `npm test` 260/260. `tsc` clean.
- **Sims:** `table.ts 600`, `endless.ts 150` and `relics.ts 20`, plus a throwaway `tools/sim/_r13_turns.ts` (turns per
  fight type, GREEN, N200).
- **Audio:** I can't hear it. Audio notes below come from `music.ts`, `sounds.ts` and MUSIC_NOTES only.
- **Leaderboards:** Supabase is unreachable from here, so I reviewed the UI and `supabase/schema.sql` only.
- **Screenshots:** `scratchpad/shots/pr_*.png` (path below).

---

## LIKES

1. **The core read works.** Two machines face each other, and enemies visibly write on yours:
   - frozen tiles carry turn counters (`pr_kn_f1_004`);
   - slime, dead cards and bombs show on your reels;
   - every enemy's HUD has a countdown ("BLIZZARD IN 2", "CASH OUT NEXT!", "THE DEAL IN 3").

   The House's centre panel is the best boss UI in the game: "THE POT 120 / YOUR JACKPOT TAKES IT / NEXT SKIM 60"
   (`pr_jk_f8_018`). I always knew what the House wanted.
2. **The hit math is on screen.** Each payline cell shows its value, and every PAIR or JACKPOT banner reads
   BASE × MULT = TOTAL, with a red −N for what an enemy cut. That is the Balatro lesson applied, and it is rare in this
   genre.
3. **THE JUKEBOX is the right kind of machine for a watch-only game.**
   - It builds anticipation: the 6 pips, "VOLUME READY!", "MAX VOLUME! DROP NEXT SPIN!" under the machine, then the
     DROP callout and every note lighting up (`pr_jk_f1_012`, `pr_jk_f25_004`).
   - Because you can see the next spin coming, you lean in without touching anything. More machines need a "next spin
     is the big one" telegraph like this.
4. **The BONUS ROUND cards are clean** (`pr_kn_020_choice`, `pr_jk_020_choice`).
   - Each card has a title, an icon, one rule line and a red COST box. A free card always sits beside the costed one.
   - The machine cards are on theme: HYPE MAN's "+1 volume before every other spin" against "notes pay half when it
     isn't the drop" is a good trade to sit and think about.
5. **The route and enemy card copy Slay the Spire's best idea.** You get forks with a preview, "DANGER 1 OF 3", and a
   "?" flip that shows their full rules and reels (`pr_41_next_flipped`). It's an informed choice without decision hints.
6. **The run summary table is excellent** (`pr_jk_over_summary`): every fight with its rounds, HP before and after, and
   what you picked. Players will screenshot it, and it's the best post-mortem tool in the game.
7. **The machine select chip track reads at a glance** (`pr_30_select_stakes`):
   - earned chips are lit, the selected chip is raised, locked ones are padlocked;
   - each card has its own mini ladder;
   - unplayable cards get a padlock over the art;
   - hovering a locked chip previews its rule (`pr_32_stake4_locked`).
8. **Meta progression has texture:** XP and levels, titles, trims, achievements with counters ("0/25", "0/67"), "+5 MORE
   ON THE TROPHIES SCREEN", and new-machine unlock lines on RESULTS.
9. **Leaderboards UI is honest:**
   - the tabs are MY RUNS, DAILY, WEEKLY and ALL TIME, and each has a subtitle saying what fills it;
   - the offline state is one calm red line, "COULDN'T REACH THE BOARDS. TRY AGAIN LATER" (`pr_03_HISC_ALL_TIME`);
   - the schema is sensible: name claims, per-board caps, one daily score per player, a 20 s rate limit, and the pid is
     never readable.
10. **Engineering health is strong:** 260 tests, tsc clean, saved runs with CONTINUE, a crash panel, the LIGHTNING SOFT
    option, and no console errors in any run apart from the expected Supabase tunnel failures.

## DISLIKES

1. **Act 3 numbers outrun the explanation.**
   - The Dealer at GREEN has **15.9K HP**. One DROP took it from 14.9K to 7,940, while every lit cell read **13**
     (`pr_jk_f25_004`).
   - The base × mult banner shows for about 0.3-0.6 s. At 4X I couldn't read it, and nothing persists.
   - From the build panel, the player can't say *why* they hit for 7,000. When the user wrote "something is missing",
     part of it is this: the snowball is invisible, so it feels like luck rather than your build.
2. **The boss pacing is upside down.** Average turns per fight (GREEN, N200; turns include both sides' spins):

   | Machine | Regular | House | Mirror | Dealer |
   |---|---:|---:|---:|---:|
   | KNIGHT | 13.3 | 16.7 | 11.0 | 16.6 |
   | TESLA | 10.7 | 10.8 | 7.4 | 17.9 |
   | JUKEBOX | 12.1 | 14.1 | 8.4 | 14.0 |
   | JOKER | 15.5 | 28.0 | 15.1 | 24.0 |
   | CASSIDY | 13.7 | 32.4 | 11.9 | 21.7 |

   - The House is the **safest** boss (88-95% win) and on JOKER and CASSIDY the **longest**. My JUKEBOX House ran 16
     rounds, about 2+ minutes at the default speed.
   - The Mirror is the **deadliest** (39-50% of the runs that reach it die there) and the **shortest** fight in the run.
     A lethal boss that ends in 7-8 turns feels like a coin flip, not a duel.
   - The finale undercuts itself. My Dealer died in 6 rounds, and one drop took half its HP. The user's note "early slow,
     then way too fast" is exactly this curve.
3. **The run is one wall, not a climb.** Act 1 is 77-90% and the House 88-95%, then the Mirror is 50-61%. Most runs end
   at one fight. Slay the Spire spreads its deaths across elites and act bosses, and players read that as "I got
   better". A single gate reads as "the Mirror is unfair".
4. **The game asks for a leaderboard name before you've spun once** (`pr_01_after_enter`). That's friction at the most
   fragile moment of a first session.
5. **The shop shelf has no words** (`pr_kn_003_shop`, `pr_44_shop_hover0`).
   - The items are icons only, so you have to hover or tap each one.
   - A charm level card is a dark empty cell with "LV2". On a fresh run I couldn't tell what it levels without hovering.
   - "REROLL - 1" reads as "minus one".
6. **Names collide or drift:**
   - **ALL IN** means five different things: the BONUS ROUND card, the Dealer's deal card, the House's "ALL IN POT", the
     death recap source and the side bet "SURVIVE AN ALL IN".
   - **ENCORE** is both a relic and a JUKEBOX card.
   - The machine names mix forms: KNIGHT, TESLA and JOKER beside THE JUKEBOX and THE BANKROLL.
   - On machine select, the JUKEBOX card's title and blurb are drawn a size smaller than the other four
     (`pr_21_select_unlocked`).
7. **The small text is too small for a TV or a Steam Deck:**
   - the "+ ACT 3" bracket under the chip track;
   - "MARKS ON YOU: 2";
   - the Dealer's deal box sub-lines;
   - "VOUCHERS: WIN TO CASH";
   - the HUD meter label inside its bar.
8. **The stakes stack, but the rule line shows only the newest rule.** A row of coloured dots stands in for the rest
   ("●+ GREEN THE MIRROR COPIES..."). At BLACK and up nobody will remember what RED and GREEN added.
9. **TUTORIAL appears twice** (on the main menu and inside PLAY MODES). The daily appears as "DAILY: THE BANKROLL" on a
   fresh profile where THE BANKROLL is a padlocked "???", so a new player can't place that name.
10. **Score rewards hoarding.** Leftover chips add 5 each, times the stake multiplier, and fight against spending at the
    Cashier. It's small, but it teaches the wrong habit to leaderboard players.

## BUGS

| # | Severity | Bug | Repro / evidence |
|---|---|---|---|
| B1 | low (visual) | The Dealer's deal box: the rule lines ("ITS NEXT HIT X2 / YOUR NEXT WIN X2", and the ALL IN version) run over the card icon. | Any Dealer fight; `pr_crop_raise.png`, `pr_jk_f25_002.png` |
| B2 | low (visual) | RESULTS achievement tiles: wrapped titles and descriptions collide ("DOC VOLTZ CASHES / IN", "CLEAR A RUN: BEAT THE / MIRROR.", "THE HOUSE ALWAYS / LOSES"). | Win a run that earns those achievements; `pr_crop_ach.png`, `pr_jk_061_over.png` |
| B3 | low (visual) | "THE DROP!" draws over the bottom border of the HUD panel and over a relic pop label behind it. | JUKEBOX drop with a relic popping on the same spin; `pr_crop_drop.png`, `pr_jk_f8_018.png` |
| B4 | low (input) | RESULTS says "PRESS TO CONTINUE", but the first Enter only shows the focus ring and a second Enter is needed. | Finish a run, press Enter once: the card stays up (`pr_jb_over_summary.png`). Twice works. |
| B5 | low (text) | Name collisions: ALL IN (×5) and ENCORE (×2). | `run.ts:1870`, `director.ts:215/1654`, `bets.ts:131`, `game.ts:855` |
| B6 | tooling | `relics.ts` flags 12 relic×machine rows as "fired 0", and they're all false positives: (a) it doesn't apply `relicFits`, so BATTERY@KNIGHT, EXECUTIONER@TESLA and the side-bet relics are tested where the game never offers them; (b) it doesn't count PHOENIX (`phoenix` event), FANG (`heal`) or CLOVER (`lucky`) pops. The noise will hide a real regression. | `npx tsx tools/sim/relics.ts 20` |
| B7 | dev only | The version label is fixed when the dev server starts, so a long-running server shows an old hash (61D90BB on HEAD 3d815d5). The public build is fine. | `vite.config.ts:8` |

No crashes, no soft-locks, and no page errors in three full runs.

## IMPROVEMENTS (ranked by impact vs. effort)

1. **(quick) Let the big hits breathe.**
   - On a hit in the top few of this fight, or over 25% of the enemy's max HP, hold the BASE × MULT = TOTAL banner about
     1.2 s, ignoring the speed setting.
   - Add the meter's multiplier as its own term (e.g. "VOL ×2.2").
   - Write the breakdown into the LOG.
   - This is the cheapest fix for "the snowball is invisible".
2. **(medium) Re-pace the three bosses.**
   - **The House:** cut HP about 25%, make skims more frequent, keep the pot. It should be a 10-turn mugging, not a
     30-turn chore.
   - **The Mirror:** about 30% more HP and turns, at a lower damage per hit, with the same expected HP loss. That turns
     the run-killer into a readable duel.
   - **The Dealer:** give it a second act. FINAL HAND already exists, so trigger it at 50% HP with a banner, and size the
     HP so the fight lasts at least 10 rounds.
   - Measure each with `_r13_turns.ts` alongside `table.ts`.
3. **(quick) Rename the collisions.**
   - The BONUS ROUND "ALL IN" becomes "BET THE FARM" (or "FULL SEND").
   - The JUKEBOX "ENCORE" becomes "ONE MORE TUNE" or "REPRISE".
   - Pick one form for the machine names: either "THE" on all five, or on none.
4. **(quick) Ask for the name at the first leaderboard post** (the first DAILY or the first run over), not at boot. Keep
   SKIP.
5. **(quick) Fix B1-B4:** text bounds in the deal box and the achievement tiles, the DROP callout's y position and its
   z-order over pops, and a single Enter on RESULTS.
6. **(medium) Build a "committed" sim bot, and log real runs.**
   - The user reaches endless loop 5 routinely. The bot almost never does (KNIGHT 0%, JUKEBOX max loop 2), and
     `enemies.ts` says "Only broken builds should see loop 5".
   - So either a skilled human finds "broken" builds routinely, or the ramp is tuned to the wrong player. Either way, the
     41-45% WHITE gate describes a greedy novice: a good player probably wins WHITE 80%+ and lives on the stakes ladder.
   - Add a bot that picks one plan at fight 1 (e.g. gold on the attack symbol, then charm levels, then KEY/BELL/LIMIT
     BREAK) and rerolls toward it. Use it to tune stakes 3-5 and the endless ramp.
   - Have the leaderboard post also send loops reached, the relics and the bonus round picks: real data beats any bot.
   - Add an **ENDLESS** board. ALL TIME excludes endless today, which is where skill shows.
7. **(quick) Shop legibility:**
   - one line of name under each item ("CHIP CHARM LV2", "3 VAMP CHARMS");
   - draw the level card with its Charm's art;
   - "REROLL 1" with a chip icon instead of the dash.
8. **(medium) The stake rule line should list every active rule on hover** (a small stacked list: RED..., GREEN...), not
   dots.
9. **(medium) A minimum text size pass for 1280×800 Deck and TV:** nothing under the 2× font scale during fights. Start
   with the Dealer box, MARKS, VOUCHERS and the stake bracket.
10. **(medium) Add a "next spin is big" telegraph to the other machines**, the way the Jukebox has it. JOKER already has
    a meter. KNIGHT's War Drum could pulse the sword tags. CASSIDY could show "HIGH ROLLER: X2 NEXT". This is the
    watch-only game's equivalent of Balatro's "one more hand" tension.
11. **(big) Score:** drop the chip term, or cap it; rank by fights, stake and HP left. Do it before Steam leaderboards
    lock the formula.

## BALANCE

`table.ts 600` (greedy bot; gates: WHITE 41-45, GREEN 16-19, fight-4 deaths 3-6%):

| machine | WHITE | act1 | House | Mirror | f4 die | GREEN | Dealer | power M/A3/D |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| KNIGHT | 43.2 | 81.8 | 88.2 | 61.1 | 4.3% | 18.2 | 41.9 | 527 / 1105 / 2062 |
| TESLA | **45.0** | 84.8 | 91.9 | 56.4 | **2.5%** | **15.8** | 41.5 | 820 / 2347 / 4664 |
| JUKEBOX | 43.0 | 89.2 | 95.2 | 56.5 | 4.0% | 18.5 | 48.7 | 921 / 2032 / 3200 |
| JOKER | **40.3** | 76.5 | 92.7 | 58.7 | 3.2% | **15.8** | 36.7 | 597 / 1360 / 2193 |
| CASSIDY | 44.2 | 90.3 | 91.1 | 50.0 | **0.0%** | **19.5** | 37.7 | 1698 / 4959 / 16162 |

Read:
- **Gate misses:** JOKER WHITE 40.3 is 0.7 under. TESLA and JOKER GREEN are 0.2 under, CASSIDY GREEN 0.5 over. At N600
  the noise is about ±2, so these are borderline, not broken.
- **The real misses:**
  - CASSIDY's fight-4 deaths at **0.0%** (they were 0.1% in It. 89, so this is structural: the Gatekeeper doesn't
    threaten her);
  - TESLA's at 2.5%.
- **The Mirror is the run's only real filter.** Mirror win is 50-61%, against 88-95% for the House.
- **CASSIDY's sizing power is 4-8x the others' at the Dealer** (16,162). Her Dealer is sized by BOSS_MUL, so the number
  inflation lands on her hardest. It's also why the act 3 HP readouts reach 15.9K-plus.

Bonus round cards (taken / runs won; about 35% is average):
- **Strong:** MELT IT DOWN 48%, BLOOD MOON 47%, HYPE MAN 47% (n49), ALL IN 45%, DEVIL'S DUE 44%, JOKER'S REEL 44%,
  SHIELD WALL 44%.
- **Traps:** CASH IN 14%, FEEDBACK 19%, STORM FRONT 20%, SUPERCELL 20%, MAD SCIENCE 21%, BACKUP DANCERS 22%,
  TEMPER 22%, TWIN REEL and CURSED IDOL 23%.
- **JUKEBOX's five:** HYPE MAN 47, ENCORE 39, HEADLINER 28, BACKUP DANCERS 22, FEEDBACK 19.
  - HYPE MAN is creeping back up: it was 57%, then 37% after the nerf, and is 47% now (small n).
  - FEEDBACK is still last.

Endless (`endless.ts 150`, GREEN; riders = Dealer winners who always ride). Riders who reach loop 5:
- KNIGHT 0% (max loop 3);
- TESLA 29%;
- JUKEBOX 0% (max loop 2; the weakest rider again);
- JOKER 3%;
- CASSIDY 32%.

See improvement 6 on what the user's routine loop 5 implies. Short version: the bot is the floor of player skill, not
the middle, and the endless ramp and the top stakes have no ceiling measurement.

## STEAM READINESS

What still stands between this build and a store page:
1. **Brand decisions come first.** SLOTS VS. SLOTS vs. SLOTS VS. BOTS, and 8-bit vs. 16-bit. Both decide the capsule
   art, the trailer, the store URL and the logo. They're "held" today, but they block every store asset.
2. **Store assets:**
   - capsules (header, small, main, vertical, library);
   - 5+ screenshots;
   - a 30-60 s trailer. Build it around THE DROP and the Dealer's FINAL HAND: they're the two moments that sell
     watch-only.
3. **Audio needs a human ears pass.** I can only judge the code:
   - The structure is solid: 8 hand-written songs, intro then loop, seam-checked, peaks 0.07-0.12, 7 kHz low-pass.
   - The tuned SFX play the song's *relative major* scale. That's correct on pitch, but the stingers resolve to the major
     tonic over minor songs (act 2, act 3, all three bosses), which can sound "happy" at the wrong moment.
   - The Dealer is in A *harmonic* minor (G#), while the SFX scale uses G natural, a likely clash on its E7 chords.
   - Listen on headphones and on a TV. Also check the untuned near-miss glides against the music.
4. **Online:**
   - Supabase scores are client-posted with no seed or replay check. Anyone with a pid can post up to the cap (60,000
     ALL TIME, 8,000 daily and weekly). That's fine for a browser playtest, but Steam needs Steam leaderboards plus
     daily-seed validation.
   - A cleared browser loses your name forever (the pid lives in localStorage, and renames go through the dashboard).
5. **Deck and controller:**
   - the 1280×720 canvas letterboxes on the Deck's 1280×800;
   - the minimum text size pass (improvement 9);
   - the open QA items from Steam QA 1: collection and trophy tiles aren't focusable, the crash panel can't be used with
     a pad, and the Steam Cloud conflict policy is undecided.
6. **Rating:** this is simulated gambling (slot reels, chips, a wheel). Get the IARC questionnaire answered early; PEGI
   has rated simulated gambling up to 18. It affects the store page and regions.
7. **Balance:** close the three borderline gates, fix CASSIDY's fight-4 deaths and her Dealer sizing, and run the
   committed bot before any "final" numbers.
8. **Achievements:** the user audits them (pending). The RESULTS tiles need B2 fixed first, since they're the first place
   players see achievements.

Screenshots: `/tmp/claude-0/-home-user-SlotsVsSlots/878cf676-306f-5d16-9f27-4d5b2d19896b/scratchpad/shots/pr_*.png`
(contact sheets: `sheet_r13_house.png`, `sheet_r13_mirror.png`, `sheet_r13_dealer.png`, `sheet_r13_jkf1.png`).
