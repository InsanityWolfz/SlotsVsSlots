# EXPERT PLAYTEST 9: likes and dislikes (2026-10-02)

Build: branch `claude/gifted-galileo-9g5b4w` at `179b3d6` (iterations 60–65: the daily, the finale, THE REPO MAN, META LAYERS).
I didn't edit `src/`. I added one throwaway harness, `tools/balance/e9_repo.ts`. Screenshots are in `/tmp/e9/`.

## What I ran

**Headless:**
- `npm test`: 207/207 green. `tsc` is clean.
- `fuzz.ts 20`: 1200 runs, 0 crashes, NO INVARIANT BREAKS.
- `tuesday.ts 400`, `challenges.ts 300 8`, `repo_tune.ts 400` and `npm run sim -- --runs 800`.
- New `e9_repo.ts 400 0` / `300 2`: what THE REPO MAN actually does per machine.

**Visual (Playwright, 1280×720):**
- loading, name entry, main menu, CHALLENGES, TROPHIES, HISCORES (all 4 tabs, BEST/RECENT), COLLECTION;
- a KNIGHT WHITE run, played by a random bot (died to THE REPO MAN);
- a TESLA GREEN run, played by a random bot (died to the House);
- THE WEEKLY CHALLENGE 2026-W40 (JOKER, FAST + GLASS), through the Dealer with forced wins;
- THE DAILY (TESLA), through the Dealer with forced wins;
- a MIDAS jump to THE REPO MAN at 2× speed, frame by frame;
- a fight-1 timing at 1× and 2×.

**Numbers I quote:**

| source | numbers |
|---|---|
| tuesday 400, WHITE | knight 41.8, tesla 46.0, thorn 50.0, joker 45.3, midas 40.0 (**avg 44.6**) |
| tuesday 400, GREEN | 17.8 / 18.3 / 21.5 / 19.5 / **13.8** (avg 18.1) |
| tuesday 400, vs the Dealer | avg 49.9 |
| sim 800 greedy | WHITE 43.8; deaths: MIRROR 27%, HOUSE 9%, each regular fight 0–4% |
| ladder | WHITE 43.8, RED 36.5, **GREEN 17.4**, BLACK 11.0, BLUE 9.6, GOLD 8.8 |

---

## 1. LIKES (protect these)

- **L1. "They write on your machine" reads clearly before and during the fight.**
  - The preview card names the cadence and the write: "BLIZZARD EVERY 3 TURNS: FREEZES 1 REEL FOR 2 TURNS".
  - The enemy HUD counts it down with pips ("REPO IN 2", then "BLIZZARD NEXT!" in red).
  - This is the game's identity, and it's legible.
- **L2. The run-over table is the best screen in the game.**
  - It shows FIGHT / ROUNDS / HP before-after / THEN PICKED, plus a cause-of-death line ("KILLED BY THE HOUSE: THE POT 156 - SPIN HITS 94").
  - A player learns why they lost without a wiki. Keep it.
- **L3. The ×10 numbers and cell charms read well on the cards.**
  - Example card: "2 KEEN CHARMS: REEL 3 - SWORDS. EACH: +20 TO ITS GROUP, WHICH PIERCES SHIELDS".
  - The payline shows 10 / 10 / 10 under the cells, and "JACKPOT! 39 x 3 = 117!".
  - The YOUR REELS panel shows charm counts and +bonuses per reel (e.g. "⚡3 +5").
- **L4. The Cashier is honest and specific.**
  - "KEEP CHIPS FOR THE HOUSE: RIGHT NOW +30 SHIELD EACH HOUSE TURN (10 PER 8)" turns hoarding into a visible plan.
  - The lien card says exactly what comes back: "THE REPO MAN GIVES BACK A CHARGED CHARM ON A REEL 1 BOLT", for 3 chips.
- **L5. The bosses have real slot mechanics, and the UI explains them in the fight.**
  - The House: "THE POT 190 / YOUR JACKPOT TAKES IT / NEXT SKIM 95".
  - The Dealer: the deal box "DEALS NEXT TURN! ALL IN" and "MARKS ON YOU: 6".
  - The finale still lands: Dealer win per attempt 49.9.
- **L6. BIG CHOICES with a priced strong option plus a SAFE one.**
  - THE FORGE: "ARMS RACE +1 LEVEL TO ALL YOUR SYMBOLS, COST -60 MAX HP" / "MASTERWORK +2 shields, other symbols can never level" / "WHETSTONE (SAFE)".
  - Real costs, no EV hints.
- **L7. The CHALLENGES screen layout.**
  - The weekly card has a live countdown ("NEW ONE IN 2D 3H") and your record ("YOUR BEST 3945 - CLEARED - 1 TRY").
  - Each challenge row shows its reward title on the right.
  - The DAILY row turns into "DAILY: 4125" once played.
  - These are the right affordances.
- **L8. HISCORES → MY RUNS rows are rich.** Each row has the hero portrait, relic and charm icons, the killer's portrait, a DAILY/WEEKLY tag, and the score formula printed on top.
- **L9. Stability.**
  - 1200 fuzz runs across 30 modes broke no invariant (REPO MAN beaten 990×, liens paid 520×).
  - The UI bot reached every screen with no console errors.
  - The meta layer's save round trip works.
- **L10. Name entry is low-friction.** It upper-cases and filters as you type ("c_#9 Pl" becomes "C9PL"); Enter works; the identity layer is Steam-ready. Offline boards fail soft.
- **L11. The juice is good and photosensitive-safe.** The lightning bolt over the enemy reels with a big "-60", confetti on wins and the payline laser all add punch without a full-screen white flash.

---

## 2. DISLIKES (ranked by how much they hurt the player)

### D1. The leaderboards, the headline of the meta ask, are not live, and wouldn't be safe if they were. **HIGH** (meta/infra)

**What I saw:**
- `src/net/config.ts` has an empty URL and key.
- `.github/workflows` sets no `VITE_SUPABASE_*`.
- Every board tab says "THE ONLINE BOARDS ARE NOT OPEN YET".
- Yet the first thing a new player sees after CLICK TO PLAY is a mandatory "PICK YOUR NAME: IT GOES ON THE LEADERBOARDS: THE DAILY, THE WEEKLY AND ALL TIME", with no skip.

**When it opens, `supabase/schema.sql` trusts the client completely:**
- any `score between 0 and 10000000` inserts with the public anon key (one curl), with no per-board plausibility cap and no rate limit;
- names have no word filter;
- one pid per browser means clearing storage gives fresh daily tries under a new name.

**ALL TIME mixes incomparable modes:**
- the daily and weekly (the Dealer at 0.45 HP: my forced weekly clear scored 3945 and the daily 4125, vs ~2200 for a real WHITE clear);
- challenges;
- endless pots (chips ×10);
- stake ×3.5.

It will become a board of "who rode endless longest".

**Why it hurts:** the user asked for "a public leaderboard … so it feels like a real game". Today it's a name screen that promises something the game doesn't deliver. On day one of a public board, a single forged 9,999,999 kills it.

### D2. The run-over screen buries every meta reward, and text collides on it. **HIGH** (bug + UX)

**Weekly clear:** the whole meta payoff is one line at y=700 that runs off both screen edges: "…5 XP - LEVEL 4! - NEW BEST! - ACHIEVEMENTS: HOUSE CALL, MIRROR, MIRROR, THE HOUSE ALWAYS LOSES, JESTER JAX CASHES IN, WEEK IN, WEEK OUT, COLLECTOR - NEW TITLE: REG…". That's 7 achievements, a level-up and a title in one clipped dim line under the buttons.

**First loss after reaching the House:** "NEW SLOT MACHINE UNLOCKED: TESLA!" is drawn at y=474. That is:
- 14 px under "KILLED BY THE HOUSE…" (y=460);
- under the YOUR REELS panel, which is drawn afterwards at y=480 (`runScreens.ts` ~1517–1579).

It's half-hidden. TESLA unlocks on reaching the boss, so this is the first unlock nearly every new player gets.

**Daily clear:** COPY RESULT (y=590) is drawn on top of the relics row of the YOUR REELS/RELICS panel. The share line itself isn't visible on the screen.

**No ceremony anywhere:** a level-up, an achievement or a new title gets no banner, no sting and no toast. The KNIGHT loss read "+800 XP - LEVEL 2! - ACHIEVEMENTS: FIRST BLOOD, REPOSSESSED" in 1.5-scale text at the bottom edge.

**Why it hurts:** the meta layer's whole purpose is the "ding". Right now the ding is a footnote, sometimes off-screen.

### D3. THE REPO MAN doesn't do his job: his write often doesn't happen, doesn't matter, and isn't shown. **HIGH** (design + balance)

**`e9_repo.ts 400` (WHITE, greedy):**

| machine | turns | takes per fight | **no take** | boss win carrying 0 / 1 / 2+ liens |
|---|---|---|---|---|
| KNIGHT | 13.3 | 1.27 | 17.9% | 72.9 / 77.0 / **81.7** |
| TESLA | 13.0 | 1.28 | 17.7% | 84.7 / 78.1 / 76.7 |
| BRIAR | 22.6 | 1.81 | 6.9% | 82.5 / 74.4 / 76.3 |
| JOKER | 10.4 | 0.98 | **31.3%** | 81.7 / 86.4 / 85.2 |
| MIDAS | 8.2 | 0.67 | **50.3%** | 69.5 / 72.3 / – (never 2) |

- GREEN is the same shape. MIDAS no take 50.8%. BRIAR is the only big cost: 86.4 with 0 liens → 68.9 with 2+.
- **The gate from the original sketch fails on 3 of 5 machines.** It wanted runs carrying ≥2 marks to lose the boss 3–6 points more often. KNIGHT and JOKER do *better* with liens; the confound is that strong builds kill him fast.
- **So PAY OFF A LIEN is a 3-chip tax for tidiness, not a decision.**
- **Gate deaths:** `repo_tune.ts 400` A4 deaths avg **2.7%** (KNIGHT 2.5, MIDAS 1.0). STATE logs 5.5% (gate.sh 800, gate 4–7). He isn't the "real spike before the boss".
- **The MIDAS sample:** his MIDAS fight at depth 3 had **HP 100**, less than the fight-1 Frost Imp's 150. He was at 5/100 on round 2, before his first REPO turn. The same depth on KNIGHT had HP 390.
- **Presentation:**
  - His take reuses the Pit Boss's "CONFISCATED: <CHARM>" popup and the rat's steal (`fight.ts repossess` → `confiscate`/`steal`). There's no REPOSSESSED moment or tow hook, and the word "LIEN" never appears in a fight.
  - Between fights, liens appear **only** on the Cashier's PAY OFF card, and only the first one (`runScreens.ts:1562`).
  - They don't appear in YOUR REELS, on the map, on the preview or on the run-over screen.
  - The persistent write is his entire point, and it's invisible.
- **Repetition:** he's fight 4 of acts 1, 2 **and 3**: three identical encounters in a GREEN run. In act 3 he died at full HP in 3 rounds (weekly table: "THE REPO MAN 3 390-390"). The act 3 Pit Boss already confiscates charms.

### D4. CHALLENGES are a single locked chain with a wall in the middle. **HIGH/MED** (meta design)

**`challenges.ts 300`:**

| # | challenge | setup | win | plain machine |
|---|---|---|---|---|
| 1 | FAST COMPANY | | 34.3 | |
| 2 | GLASS JAW | | **38.3** (easier than #1) | |
| 3 | HEAVY HITTERS | | 33.0 | |
| 4 | SHORT STACK | | 25.7 | |
| 5 | **BAD BLOOD** | BRIAR + HOUSE CUT | **13.7** | 50.7 (−37) |
| 6 | THE LONG NIGHT | KNIGHT GREEN + HOUSE CUT | 10.3 | |
| 7 | ALL OF IT | | 10.0 | |

- **BAD BLOOD attacks BRIAR's identity** (it lives on heals). It's the steepest step and walls off #6 and #7.
- **Cost to clear them all:** about 39 runs for the greedy bot, and well over that for a human. #5 alone is about 7 tries at bot skill.
- **The names are hidden as "???", but the next row spoils them:** row 3 reads "CLEAR GLASS JAW TO OPEN" under a "???" row 2.
- **Two of seven use HOUSE CUT.**
- **The rewards are titles only.** Titles are cosmetic, and nobody sees them while the boards are closed (D1).

### D5. Levels, titles and achievements are a parallel scoreboard that never touches the game. **MED** (meta design)

- **Nothing unlocks at any level.** An achievement is +250 XP.
- **TROPHIES gives no help:**
  - achievement text only appears one at a time on hover, at the bottom;
  - there are no progress counters ("REGULAR: PLAY 25 RUNS" never shows 4/25);
  - titles you don't own yet aren't listed with their level;
  - "REGULAR" is both the level-3 title and the 25-run achievement.
- **Curve:** I hit level 6 GRINDER after 4 runs (two of them forced). Then it showed "370/4800 XP" to level 7, and THE HOUSE (level 30) needs 348,000 XP: roughly 250 WHITE runs.
- **Achievements earned in side modes:** "THE HOUSE ALWAYS LOSES: BEAT THE DEALER" and "JESTER JAX CASHES IN" were earned on the weekly, where the Dealer has 0.45 HP and JOKER wasn't even unlocked.
- **Why it hurts:** a "real game" meta needs goals with visible progress and a payoff you can *see in a run*. This is a list.

### D6. Balance: the GREEN cliff, MIDAS, and the Mirror as the run-ender. **MED** (balance, known)

- **The ladder:** WHITE 43.8 → RED 36.5 → **GREEN 17.4** (halved) → BLACK 11.0 → BLUE 9.6 → GOLD 8.8. GREEN is the cliff (act 3 plus the copied relic). The rungs above it are small steps.
- **MIDAS is last everywhere:**
  - WHITE 40.0 (31.5 on the e9 seed), GREEN **13.8** vs 17.8–21.5 for the rest;
  - on the REPO MAN, 50% no take;
  - the machine spread is BRIAR 50.0 vs MIDAS 40.0 WHITE.
- **The WHITE killer is the Mirror:** 27% of all greedy runs die there vs 9% at the House. Its kill rate is 38% per encounter (58% for the random drafter). Regular fights are 0–4% each.

### D7. THE WEEKLY CHALLENGE is under-exposed and swingy. **MED**

- **It's buried inside CHALLENGES.** The DAILY has its own main-menu row.
- **A level-1 player is offered it on day one:** a GREEN-length run on a locked machine with two HOUSE EDGEs.
- **Only 3 edges (FAST/ROLLERS/GLASS), so only 3 possible pairs.**
- **`challenges.ts` weekly row (random drafting), mean 11.2%:**
  - KNIGHT+ROLLERS+FRAIL (W32) and MIDAS+ROLLERS+FRAIL (W34) were **5%**;
  - others reach 15–18%.
- **The ROLLERS + GLASS pair is the 5% one.**
- **It has no social surface while the boards are closed.**

### D8. Side bets on the very first fight of a new player's first run. **MED** (UX/onboarding)

- **Fight 1 of run 1 already has two SIDE BET panels** (2 / 5 / ALL IN each) around FIGHT!. The player has never seen a spin.
- **Line confusion at the Dealer:** "CLEAN HANDS: WIN, LOSING 800 HP OR LESS" with 410 max HP. It counts healed-back damage, so it's legal, but it reads as free money or as a bug.

### D9. Clipping and clutter at 1280×720. **MED** (UX)

- **TESLA fight HUD:**
  - YOUR REELS (5 symbol rows) is cut off at x=0 (the first column of icons is clipped);
  - the 4th relic icon tucks behind the hero panel.
- **Run-over with 18 rows:** the ACT 2 and ACT 3 divider lines are drawn through the text of "THE HOUSE" and "THE MIRROR".
- **The House and Dealer preview cards end in a 1×-scale paragraph** ("COINS + A CUT EACH TURN FILL THE POT. EVERY 3 TURNS…"). It's unreadable at a normal distance, and it's the most important rules text in the act.
- **HISCORES:** the DAILY 10-02 and WEEKLY 2026-W40 tags sit on the row borders.
- **Name entry:** the input box uses a system sans font, not the pixel font.
- **The fight HUD:** keeps a big NEW RUN button between the speed buttons and TUNE/LOG. It has a SURE? confirm, so this is LOW.

### D10. Early-fight pacing is still slow. **LOW/MED** (pacing)

- **Fight 1 vs FERAL SLIME:**
  - **105 s at the default speed (25 rounds)**;
  - 94 s at 1× (11 rounds).
- **Run length:** tuesday t/fight act 1 is 12–17, so a WHITE run is about 15–20 min and GREEN about 25–30 min.
- **The user's 09-28 note** ("early rounds feel slow and drawn out") still applies to fights 1–2.

### D11. Dead and misleading options. **LOW** (balance/design)

- **Big choice SWEEP UP** was taken 19 times out of about 4000 big choices, with a 16% win rate (tuesday 400). It's a dead card.
- **RELIC RUSH:** 9 of 15 chests lit pays the floor tier ("UP TO 9 COMMON"): 60% of the grid and you get a COMMON, so the big moment reads as a loss.

### D12. Small bugs. **LOW**

- `dbg.vs('repo')` throws "no archetype repo": REPO_MAN isn't in the debug helper's lookup.
- The run-over says "+1 ROCKS".
- The House preview's "FACE THE HOUSE" label uses a smaller font than "FIGHT!" on the same button.

---

## 3. PROPOSED FIXES

| # | Fix | Where | Effort | How to measure |
|---|---|---|---|---|
| D1 | **Open the boards safely**, see below | `supabase/schema.sql`, deploy workflow, `config.ts`, the name screen | M | Unit test: a 9,999,999 daily insert is rejected; posting from the browser works against the real project |
| D2 | **A RESULTS strip on the run-over**, plus the three overlap fixes | `runScreens.ts` | S–M | Screens only; screenshot the weekly clear, the first TESLA unlock and the daily clear |
| D3 | **Make THE REPO MAN visible, consistent and meaningful** | `fight.ts repossess`, `director.ts`, `enemies.ts` GATEKEEPER and `BOSS_MUL.gate`, `run.ts takeLiens`, `runScreens.ts` | M | `e9_repo.ts 400`: no take ≤15% on every machine; 2+ liens cost the boss ≥4 points; `repo_tune` A4 deaths 4–7; tuesday WHITE 41–45, GREEN 16–19 |
| D4 | **Challenge ladder by measured difficulty, two open at a time** | `meta.ts`, `menus.ts` | S | `challenges.ts 400`: win rates fall monotonically, no step >12 points, floor ≈10 |
| D5 | **Make progress visible, and give it a cosmetic payoff** | `menus.ts` TROPHIES, `meta.ts`, `profile.ts`, art agent for skins | M | Screens; no sim impact (cosmetic) |
| D6 | **MIDAS late power; the GREEN step** | `run.ts BOSS_MUL`, `cabinets.ts`, `stakes.ts` | M | `tuesday.ts 1000`: MIDAS GREEN ≥16, others ±1; ladder RED→GREEN drop ≤14 points |
| D7 | **Weekly on the main menu, safer edge pairs, and a gate** | `menus.ts`, `meta.ts WEEKLY_EDGES` | S | `challenges.ts 300 12` weekly row: no week under 8% random-draft |
| D8 | **Side bets open from fight 2** (or after the first House) **and only after the first run**; reword CLEAN HANDS | `runScreens.ts showNext`, `bets.ts` text | S | Screens; `bets.ts` returns unchanged |
| D9 | **Layout pass at 1280×720** | `hud.ts`/`layout.ts`, `runScreens.ts`, `menus.ts`, name input CSS | S | Screenshot TESLA and JOKER late-run HUDs and the 18-row run-over |
| D10 | **Early pacing** | `enemies.ts` HP curve at depth 0–1, or the presentation clock | M | tuesday act 1 t/fight; fight-1 real time ≤60 s at the default speed |
| D11 | **SWEEP UP and RELIC RUSH** | `run.ts` big choices, rush tiers | S | tuesday big-choice table (SWEEP UP taken ≥5%); `bonus_rates.ts` tier mix |
| D12 | **Small bugs** | `debug.ts`, `runScreens.ts` | S | — |

**D1 details:**
- Create the Supabase project and put `VITE_SUPABASE_URL`/`ANON_KEY` in the Pages workflow env.
- In the schema:
  - **per-board caps** in a check or trigger: daily ≤ about 6,000 and weekly ≤ about 6,000 (the max is 18 fights + 2000 + chips×5 + HP); all ≤ a stake-aware ceiling;
  - **one insert per pid per 30 s;**
  - **a name blocklist** inside `claim_name`.
- Split ALL TIME into **ALL TIME (clears, no endless pot)** and/or one board per stake. Keep the daily and weekly off ALL TIME, since their Dealer has 0.45 HP.
- **Until the boards are open,** the name screen gets a LATER button and different copy ("your name for the boards, when they open").
- **Later (L):** post the seed plus the pick log and replay it server-side (the engine is deterministic). That is real anti-cheat.
- **Measure:** see the table.

**D2 details:**
- **A RESULTS strip on the run-over:**
  - an XP bar that fills (from levelBefore to levelAfter);
  - a "LEVEL 4!" banner;
  - one achievement card at a time (trophy sprite, name, text), with a click-through or a 1.2 s auto-advance;
  - the new title as its own card.
- **Move the meta out of the bottom line.** Put it on its own page after the table, or replace the table panel for 3 s.
- **Fix the overlaps:**
  - draw the unlock line after the panel, or move it to y≈452, above the KILLED BY line;
  - put COPY RESULT next to the MENU/CASH OUT row and show the share text above it;
  - wrap or truncate the meta line.

**D3 details:**
- **(a) Show it:**
  - his own popup "REPOSSESSED: GOLD SWORD (R1)", with the tow hook from his portrait pulling the cell off the reel;
  - a "HELD BY THE REPO MAN" row in YOUR REELS on every between screen (a red lock tag per lien);
  - a lien count badge on the boss node of the map;
  - the run-over shows "+1 LIEN" like "+1 ROCK".
- **(b) Make it happen:**
  - first REPO on his turn 2 (then every 3);
  - MIDAS `gate` 0.5 → about 0.8, with the starting gold swords exempt from the first take (or he takes vault fill instead).
- **(c) Make it matter:**
  - a held cell stays on the strip as a dead LIEN cell (pays 0, breaks lines, like the sketch's COUNTERFEIT) instead of vanishing;
  - a missing cell on a 12-cell reel is noise; a dead cell is felt.
- **(d) Acts 1–2 only.** Act 3 already has the Pit Boss's confiscates, or use the sketch's AUDITOR there.

**D4 details:**
- Order: GLASS JAW → FAST COMPANY → HEAVY HITTERS → SHORT STACK → THE LONG NIGHT → ALL OF IT, with BAD BLOOD reworked.
- Rework BAD BLOOD to target something other than heals, e.g. BRIAR + HIGH ROLLERS (aim 20–25%).
- Show challenge names; hide only the setup.
- Open two at a time (clearing #n opens #n+2), so one wall never blocks everything.

**D5 details:**
- TROPHIES:
  - show each achievement's text inline;
  - add progress counters (n/25 runs, n/7 dailies, n/34 collection);
  - show locked titles with "LV 8" and "CLEAR BAD BLOOD".
- Rename the achievement REGULAR (e.g. "HOUSE REGULAR").
- **Payoff, cosmetic only:** every few levels unlock a slot machine trim or palette, or a chip colour. Palette swaps of existing sprites keep 8-bit art and are art-agent work.
- Count Dealer and machine-clear achievements only for runs at full numbers (not the daily or weekly), or give the side modes their own achievements.

**D6 details:**
- MIDAS: one act-3-scaling hook (EXPERT_8 E12 is still open), e.g. vault fill +1 per act.
- **Don't restructure GREEN now:** "GREEN includes act 3" is a binding user rule. Leave the stakes alone this round and fix MIDAS only.

**D7 details:**
- Add a main-menu row: "WEEKLY: JOKER + FAST + GLASS" with your best.
- Show it after the first run.
- Either drop the ROLLERS+GLASS pair or add a 4th edge so each week can avoid it.

**D10 details:**
- Depth 0–1 enemy HP −15%, or play the first fight at the speed the player set but with fewer rounds.
- **Not now:** pacing needs its own pass with the user, and it moves every balance number. Log it.

**D11 details:**
- Rework SWEEP UP, or swap in a pivot from DIRECTION_NOTES ("remove all shields from a reel").
- RELIC RUSH: lower the uncommon threshold to 9, or rename the tiers so 9 doesn't read as a fail.
- **Not now:** both are low impact; batch them with the next balance pass.

**D12 details:** add REPO_MAN to `dbg.vs`; "+1 ROCK" singular; one label size for the boss buttons.

**Don't fix now:**
- D6's stake restructure: GREEN-with-act-3 is a binding rule; tune MIDAS only.
- D10: needs the user, and it moves every table.
- D11: low value.
- The D1 replay verification: L effort; caps and a rate limit are enough for a playtest.

## Do the new meta layers make it feel like a real game?

**Partly.** The bones are right: daily, weekly, challenges, levels, titles, trophies and a name.

Three things keep it from landing:
1. **There is no audience yet** (D1).
2. **Rewards happen in a footnote** (D2).
3. **Progress isn't visible or spendable** (D4, D5).

Fix those three and the existing content will carry it. No new modes are needed.

THE REPO MAN is the right idea ("what he writes stays") with the wrong delivery (D3). On MIDAS, half the time he writes nothing; when he does, nothing shows between fights; and the liens he leaves don't change the boss fight.

---

## AGREED PLAN (dev + playtester, 2026-10-02)
Order:
1. **D2:** RESULTS panel on the run-over (wins and losses), with a click-to-skip XP fill. Fix the 3 overlaps.
2. **D9:** layout pass. The name box is drawn in the pixel font; check it again on a phone.
3. **D12:** small bugs.
4. **D3:** THE REPO MAN.
   - Popup and liens visible: YOUR REELS, the map, the run-over.
   - First take on his turn 2.
   - Acts 1–2 only.
   - Re-tune his HP after these.
   - **Gate:** measure lien persistence alone (keep the takes, return the liens after his fight). If persistence costs ≥2 points, no dead cells; if <1, revisit dead cells.
5. **D6:** MIDAS GREEN ≥16, tuned on top of the final REPO MAN numbers.
6. **D4:** challenges.
   - Order them by measured difficulty.
   - Rework BAD BLOOD to aim for 20–25%.
   - Show the names.
   - Clearing #n opens #n+1 and #n+2.
7. **D5:** TROPHIES.
   - Show achievement text inline, with counters.
   - List locked titles with their requirements.
   - Rename REGULAR.
   - Machine-clear and Dealer achievements count only on full-numbers runs.
   - Cosmetic unlocks are proposed to the user, not built.
8. **D7:** the weekly gets a main-menu row; drop the ROLLERS+GLASS pair.
9. **D8:** side bets open from act 1 fight 2. CLEAN HANDS isn't offered when its limit is ≥ max HP.
10. **D1:**
    - Score caps per board, a rate limit and a name blocklist in the schema.
    - ALL TIME takes standard runs only: no daily, weekly or challenge runs, and no endless re-post.

**Not now:** the stake restructure, pacing (D10), D11, run-replay anti-cheat.
