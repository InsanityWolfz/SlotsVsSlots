# Iteration 8 Playtest: Package O (Build for the Mirror, Not Against It)

**Method.**
- **Headless.** New `scratch/it8_lib.ts` extends `it7_lib`. It adds an `hpfirst` draft policy, a shared B1-snapshot helper and Mirror stats (REFLECTION at-cap is measured against the real per-run cap). There are no preFight emulation hooks for Package O any more: the Mirror formula and the REFLECTION cap come from `src/core/run.ts`. As in I7, most comparisons replay act 2 from **identical B1 snapshots** (commit play through act 1, the legendary and the intro Cashier; about 400–880 snapshots per cabinet). Scripts and outputs (`.txt`) are in `playtest/scratch/`:
  - `it8_skill`: 10 act 2 policies × 5 cabinets.
  - `it8_arc`: full runs, 5 policies × 5 cabinets × 1000.
  - `it8_gild`: B1 gifts. `it8_keen`, `it8_copy`: what the Mirror copies.
  - `it8_legend`: forced legendaries. `it8_chips`: chips at the Mirror.
  - `it8_tesla`, `it8_tesla2`, `it8_cabs`, `it8_thorn`, `it8_midas`: cabinet levers.
  - `it8_pkgP`, `it8_glass`, `it8_crack`, `it8_pkgP2`: Package P candidates.
  - `it8_leak`: the bug G1 emulated. `it8_opener`: opener deaths. `it8_tierleak.ts`: a 10-line repro of G1.
  - `it8_officialsim.txt`: `npm run sim -- --runs 2000`.
- **Live (:4173, fresh build).**
  - One full 12-fight **TESLA** run (seed 9005), every fight played for real at 3x on auto, with my own picks. It came after two TESLA runs that died in fight 1.
  - A **KNIGHT** run (seed 4242): act 1 walked with forced wins, act 2 and the Mirror played for real.
  - Sandboxes: bombs, a GOLD II set.
  - Snaps are `snaps/i8p-*.png` (`i8p-b2-fork.png` actually shows the B1 Cashier).

## Verdict

**Package O hit its main targets: act 2 now has a skill gap and tier II isn't a trap any more. But the browser build has a critical bug that hands out every TIER II for free, TESLA is still +20, and the Mirror gets skipped by burst builds.**

1. **Act 2 skill is back** (B1 snapshots, act 2 clear):
   - commit **44.9**, notier 44.9, tierfirst 44.4, **HP-first 40.9**, random draft **38.9**, random everything 34.0, greedy (sim) 38.1.
   - Commit − random draft = **+6.0** (was 3.2). HP-first no longer wins (+5.5 was HP-first's edge in I7; commit now leads it by 4.0).
   - A single tier II went from +1.8 to **+4.1**. "Never upgrade" is no longer better than upgrading.
2. **Act 2 elites are now a real risk/reward choice** (elite2 − safe2 = **+3.4**, was +10.5):
   - Taking every elite dies on 17% of fork fights vs 8% safe, and reaches the Mirror 55% vs 66% of the time.
   - Elite runs carry 9 relics into the Mirror and win it 87% of the time.
   - It's just outside ±3, and it's the right shape.
3. **Critical bug G1: in the browser, just *seeing* a TIER II card upgrades your gilds for free.**
   - The stat-line preview (`optionDeltas → stripsAfter`) shallow-copies `gilded`, then `applyOption` mutates the shared objects.
   - Every draft or shelf with a GOLD II / CHARGED II item gives the whole gild tier II the frame it's drawn. The paid item then does nothing, and any gild of that kind you add while the shelf is up is upgraded too.
   - The sims never call `optionDeltas`, so **the numbers in this report are for the game as designed, not the game the user is playing.**
   - Emulated, the leak is worth +3.4 act 2 clear on average (+5.8 TESLA). Both of my browser act 2s were stomps partly because of it.
4. **TESLA is still the outlier (+20.8 on act 2 clear vs KNIGHT), and it isn't the Mirror's fault.**
   - TESLA reaches the Mirror **80%** of the time vs KNIGHT 59% (specials ignore shields, Fang heals per special, Rod is +71% special damage on TESLA).
   - Live, my TESLA run lost **3 HP across all five B-fights**. It killed a 110 HP elite Bomber in 3 spins and put 80 damage into the Mirror on spin 1.
   - MIDAS is +11.7 (reach 76%). THORN and JOKER are at or below KNIGHT.
5. **The Mirror is a climax for grinders and a speed bump for burst builds.**
   - Commit Mirror win is **68.6%** (target 60–65).
   - REFLECTION fires at least once in **81%** of fights (target met). But **21% of Mirror wins never see a single reflection**: MIDAS 43%, JOKER 31%.
   - The typical-spin HP formula sizes the Mirror on capped spins, and GOLD/Key jackpots one-shot it. Live, my KNIGHT (GOLD II set + Key) killed a 108 HP Mirror in 2 spins with no reflection.
   - The Mirror copying your *sword* gilds is now the real Mirror tax. It explains KEEN (below).
6. **Act 1 is intact except MIDAS.**
   - Commit 47.8 / greedy 43.8 / random 31.7 (16-pt skill gap ✓).
   - But additive GOLD cost **MIDAS 7 pts of act 1 clear** (commit 49.9 → 42.8, below the 45–53 band). 23 HP should restore it (24 HP measured +11).

**Next package (§5, "Package P"):**
- Fix G1/G2.
- Give every cabinet an act 2 signature at the transition, as THORN already has. Tested: cabinet spread 24 → 15.
- Stop the Mirror copying KEEN, and gate the crack so the Mirror always lasts past the cracking spin.
- A readability batch.
- For content: two **act 2 counter-enemies** (GROUNDER vs specials, COUNTERFEITER vs gold) so the dominant builds meet their answer on the map instead of getting nerfed.

## 1. Numbers vs the I8 targets

| Target (from ITERATION_7 §7) | Result (B1 snapshots, `it8_skill`) | |
|---|---|---|
| Commit ≥ notier | 44.9 vs 44.9 (full runs: commit 47.4 vs notier 45.6) | ✓ (tie) |
| Commit ≥ HP-first | 44.9 vs 40.9 (but THORN: HP-first **44.9** vs commit 39.2) | ✓ (THORN ✗) |
| Commit − random draft ≥ 6 | **6.0** (full runs: act 1 +16.1) | ✓ (just) |
| Act 2 elite − safe within ±3 | **+3.4** | ~ |
| Every cabinet within ±7 of KNIGHT (act 2 clear, commit) | KNIGHT 40.9: MIDAS **+7.2**, THORN −1.7, TESLA **+17.8**, JOKER −3.6 (full runs: MIDAS +9.2, TESLA +18.6) | ✗ |
| Mirror win 60–65% (commit) | **68.0** (full runs 70.2); greedy 55.5 | ✗ (high) |
| REFLECTION ≥1× in ≥75% | **80.7%** (MIDAS 60.6, JOKER 76.9) | ✓ (MIDAS ✗) |
| REFLECTION at the cap in ≤40% | **80.8%** | ✗ (see note) |
| No B1 gift negative for any cabinet | **KEEN SET −6.6** (every cabinet), LUCKY SET −5.2 for THORN, GOLD SET −0.3 for MIDAS | ✗ |
| GOLD / CHARGED / BLAZE SETs within ±5 | Average 7.6 / 15.9 / 16.9 ✗. For the neutral cabinets: KNIGHT 11.8 / 13.0 / 15.0 ✓, JOKER 10.8 / 12.3 / 14.9 ✓ | ~ |
| Act 1: 45–53% clear, 16-pt gap | Commit 47.8, gap 16.1 ✓. **MIDAS 42.8** ✗ | ~ |

**Notes on the targets:**
- **At-cap ≤40% was the wrong target.** A cap of 60% of max HP is 13–25 points, and anyone's best hit over 3 turns clears it. Raising the cap to 80% only lowers at-cap to 71% while making the Mirror 10 pts deadlier (`it8_pkgP`).
  - The number *does* now vary by run: 13 for MIDAS, 17 THORN, 19 KNIGHT, 25 on my 41 HP TESLA.
  - The readable rule, "two reflections from full kill you", holds. I'd drop this target.
- **Gift averages hide who already owns the set.** TESLA's CHARGED SET gift is +0.3 because TESLA already has the set; the same goes for MIDAS and GOLD. Judge set parity on KNIGHT/JOKER: there it's met.

### Official sim (`npm run sim -- --runs 2000`)

- **Policies:** greedy 17.8% / relic 15.8% / random 11.2%. Act 1 clear: 45.4 / 41.7 / 31.5.
- **Mirror win:** greedy 58%, random 65%.
- **Deaths (greedy):** A1 2, A2 10, A3 12, A4 6, A5 10, HOUSE 16, B1 2, B2 3, B3 4, B4 2, B5 4, MIRROR 13.
- **Cabinets:** 15.8–18.6 run win under greedy. Note that the sim's greedy policy still doesn't value act 2 choices: its act 2 clear is about random's.

### Act 2 skill on identical B1 snapshots (`it8_skill`, 726–882 snapshots per cabinet)

| Act 2 policy | Act 2 clear | Reach Mirror | Mirror win | I7 act 2 clear |
|---|---|---|---|---|
| **commit** | **44.9** | 66.1 | 68.0 | 43.5 |
| greedy (sim) | 38.1 | 68.5 | 55.5 | 41.2 |
| notier | 44.9 | 64.3 | 69.8 | **50.2** |
| tierfirst | 44.4 | 65.8 | 67.5 | 42.1 |
| hpfirst | 40.9 | 67.8 | 60.8 | (+3.5 vs commit) |
| random draft | 38.9 | 65.7 | 59.1 | 40.3 |
| random everything | 34.0 | 56.6 | 59.7 | 41.3 |
| never shop | 41.4 | 56.2 | **73.3** | 33.5 |
| elite2 | 47.9 | 55.4 | **86.7** | 54.0 |
| safe2 | 44.5 | 66.2 | 67.2 | 43.5 |

- **Every "counter-intuitive" lever from I7 is gone.**
  - Skipping tier IIs: +6.7 → 0.
  - Taking elites: +10.5 → +3.4, now with a real death risk.
  - HP-first: +3.5 → −4.0.
- **Never shopping** is the interesting one. You arrive with more chips and a smaller machine: a better Mirror (73%, from the chip shield and a smaller Mirror), but you reach it less (56%). That's a real hoard-or-spend decision.

### Full runs by cabinet (`it8_arc`, 1000 runs each)

| Policy | | KNIGHT | MIDAS | THORN | TESLA | JOKER | ALL |
|---|---|---|---|---|---|---|---|
| commit | run win | 20.9 | 21.9 | 22.8 | **29.1** | 18.6 | 22.7 |
| | act 1 clear | 49.8 | **42.8** | 52.2 | 48.0 | 46.4 | 47.8 |
| | act 2 clear | 42.0 | 51.2 | 43.7 | **60.6** | 40.1 | 47.4 |
| | Mirror win | 63.9 | 69.1 | 79.7 | 74.0 | 63.9 | 70.2 |
| | Mirror HP | 172 | 193 | 121 | 190 | 200 | 176 |
| greedy | act 1 / act 2 | 45.3 / 36.6 | 42.9 / 46.6 | 43.2 / 31.5 | 43.4 / 42.2 | 44.4 / 35.1 | 43.8 / 38.4 |
| random | act 1 / act 2 | 32.0 / 37.5 | 27.9 / 48.0 | 39.4 / 33.5 | 29.4 / 45.9 | 30.0 / 30.3 | 31.7 / 38.6 |

- **MIDAS's HP band is gone:** Mirror HP ranges 121–200 (was 97–330). The typical-spin formula did its job.
- **THORN is fixed on full runs** (act 2 43.7, was 31.1), thanks to the tier II at the transition; its run win is second only to TESLA's under commit. From snapshots it's 39.2 with **HP-first at 44.9**, so THORN still wants max HP more than its build.
- **MIDAS act 1:** 22 HP → 23 HP should put it back in the band (`it8_midas`: 22 HP 42.8, 24 HP 54.2 under commit).

### The act 2 arc (commit, all cabinets, full runs)

| Node | Death | HP lost | Stomp (<10%) | Scary (>50%) | Turns | Enemy HP |
|---|---|---|---|---|---|---|
| HOUSE | 23.6% | 45% | 18% | 45% | 13.6 | 82 |
| B1 | 4.0% | 34% | 25% | 25% | 10.2 | 53 |
| B2 | 5.9% | 29% | 31% | 22% | 10.9 | 62 |
| B3 | 10.0% | 24% | 37% | 17% | 12.3 | 86 |
| B4 | 6.1% | 25% | 39% | 19% | 12.1 | 96 |
| B5 | 11.6% | 25% | 38% | 18% | 10.0 | 98 |
| MIRROR | 29.8% | 55% | 19% | 60% | 10.6 | 176 |

- **Same shape as I7.** Lethality climbs with a B4 dip, and 64% of act 2 runs still meet a scary regular fight.
- **By cabinet** (B1–B5 death %, snapshots):
  - KNIGHT 4.5 / 7.8 / 14.8 / 7.2 / 11.6
  - THORN 2.5 / 7.1 / 14.8 / 11.9 / **23.0**
  - JOKER 4.4 / 8.4 / 14.2 / 5.7 / 13.6
  - **TESLA 3.6 / 4.5 / 4.7 / 3.1 / 5.6**
  - **MIDAS 5.9 / 4.9 / 7.1 / 4.7 / 5.5**
- The two strong cabinets don't feel the curve at all.

## 2. Whole-run feel (browser)

**TESLA, seed 9005 (won):**
- **Act 1, fights 1–4:**
  - My two previous TESLA runs died in **fight 1** (Frost at turn 28, Slime at turn 38). The sim says the TESLA opener kills 3–4% of the time and MIDAS 4–5%, vs about 1% for KNIGHT (`it8_opener`).
  - Two in a row is bad luck, but a 25 HP cabinet losing a 38-turn fight to a Slime *feels* broken. It's the worst first impression the game can give.
  - Then the CHARGED set came together by fight 3, and an elite Brute went down 25 → 21.
- **Act 1, fight 5 and the House:** Battery + Rod + CHARGED SET killed a 37 HP Slime in 2 rounds and **the House (83 HP) in 2 rounds without taking a hit**. The House's pot never mattered.
- **Act 2:**
  - Overcharge, then the shelf's CHARGED II was applied for free (G1).
  - B1 Hexer 55 HP in 4 rounds, elite Brute 102 in 4, elite Bomber 110 in 3 spins, elite Brute 141 in 3.
  - Act 2 cost 3 HP in total.
  - Decisions still *felt* meaningful: Phoenix vs Ticket, +4 HP vs bolts, Sandglass. But they didn't matter to the outcome.
- **The Mirror** (218 HP, cap 25, Hourglass, +5 chip shield per turn):
  - Spin 1: five specials plus echoes, 80 damage. It cracked on turn 3.
  - The one REFLECTION landed at 16 Mirror HP for 20 (41 → 20). Then I finished it.
  - That REFLECTION was a genuine "oh no" moment. But the fight was decided on turn 3.
- **Chips:** 43–48 unspent all act 2. The shelves had nothing I wanted, so the chip shield was the sink.

**KNIGHT, seed 4242:**
- **Act 2 was a real fight:**
  - A B1 Bomber took me 36 → 14. A Mousetrap PREP card for the Thief fork was a cute, readable decision.
  - At B3, a draft offered **two set completions at once** (GOLD SWORDS vs CHARGED BOLTS). That was the best decision of the session.
- **Then G1** made my GOLD gilds tier II just by opening the shop, *twice* (the gold I bought on reel 1 was upgraded too).
- **The Mirror (108 HP):** a GOLD II SET + Key jackpot did **90 damage on spin 1**. It hit back once for 15 and died on spin 2. **No reflection, no climax.**

**Pacing.**
- A full run is about 12 × (8–20 rounds) plus 11 screens. At 3x auto that's comfortable.
- Act 2 fights are shorter than act 1 (10–12 vs 16 turns), which feels right for "you're strong now".
- The between-fight rhythm is draft → (Cashier) → map preview, with an extra spoils screen after elites. It never dragged.

**Is the Mirror still a climax?**
- **For grinders, yes.** THORN, TESLA, KNIGHT without gold: 90% see a reflection, and wins take about 11 turns.
- **For burst builds, no.** MIDAS wins without a single reflection 43% of the time, JOKER 31%, and 17% of MIDAS wins take 2 spins or fewer (`it8_leak`).
- The typical-spin formula was right to stop taxing *average* power. But it now means a lucky jackpot skips the boss.

## 3. Weak spots

### KEEN's act 2 form: the Mirror is the problem, not KEEN (`it8_keen`)

| B1 gift | Act 2 clear | Reach Mirror | Mirror win |
|---|---|---|---|
| none | 47.2 | 67.7 | 69.6 |
| KEEN SET (real) | **39.1** | **77.8** | **50.2** |
| KEEN SET, Mirror doesn't copy keen | **55.4** | 77.8 | 71.0 |
| GOLD SET (real) | 53.8 | 85.0 | 63.3 |
| GOLD SET, Mirror doesn't copy gold | 74.2 | 85.0 | 87.3 |

- **KEEN is a strong act 2 gild in the B-fights:** +10 reach, because pierce answers act 2's shields.
- **The Mirror copies your keen swords and pierces *you* with them.** Its Mirror win drops 20 pts. The same copy is what holds MIDAS at the Mirror: without copying gold, MIDAS Mirror win is 93%, so **don't remove the gold copy**.
- **The asymmetry:** the Mirror copies sword gilds but has no specials. So sword builds arm the boss, and CHARGED/BLAZE builds don't. That's half of TESLA's Mirror edge.
- **Fix:** the Mirror doesn't copy KEEN. Tested: KEEN SET goes from −8 to +8. Better still, make KEEN *the* anti-Mirror gild (§5).

### TESLA (`it8_tesla`, `it8_tesla2`, `it8_cabs`)

| Lever (act 2, snapshots) | TESLA | KNIGHT | TESLA − KNIGHT |
|---|---|---|---|
| base | 60.3 | 39.5 | +20.8 |
| max 2 specials per spin (everyone) | 46.6 | 30.7 | +15.9 (hurts everyone) |
| Fang heals once per spin | 56.4 | 38.7 | +17.7 |
| TESLA special 6 | 58.7 | 40.0 | +18.7 |
| TESLA −3 max HP | 54.8 | 39.5 | +15.3 |
| **TESLA's Rod special 10 (not 12)** | **53.5** | 39.5 | **+14.0** |
| CHARGED level capped at 2 (everyone) | 42.0 | 33.6 | +8.4 (KNIGHT/JOKER −6) |

- **Global nerfs to charged/specials hurt the cabinets that are already behind.** The only TESLA-only lever with bite is the Rod (−7).
- The rest of the gap closes better by lifting the others. In the table below, KNIGHT is +6 max HP and the combo line is all four levers together:

| Act 2 lever | K | M | Th | Te | J | Spread |
|---|---|---|---|---|---|---|
| base | 39.5 | 51.2 | 38.7 | 60.3 | 36.1 | 24.2 |
| KNIGHT +6 max HP at act 2 | **46.7** | | | | | |
| JOKER +2 WILDs on reel 3 at act 2 | | | | | **40.8** | |
| THORN +4 max HP (on top of tier II) | | | **45.5** | | | |
| MIDAS: no +1 chip per win in act 2 | | 48.8 | | | | |
| combo (Rod 10 + KNIGHT + JOKER + MIDAS chips) | 46.7 | 48.8 | 38.7 | 53.5 | 40.8 | 14.8 |
| combo + THORN +4 (estimated) | 46.7 | 48.8 | ~45.5 | 53.5 | 40.8 | **~12.7** |

- These are **act 2 signatures**, like THORN's tier II. The user asked for more powerful upgrades, and a free signature at the act transition *is* one.

### The legendary pick (`it8_legend`, commit, 1500 runs per cell)

- Every legendary is worth **+10.8 to +14.1** over none. Best of a random 3-offer:

  | Ticket | Sandglass | Key | Phoenix | Overcharge | Bell |
  |---|---|---|---|---|---|
  | 32.7% | 23.5% | 18.1% | 15.0% | 9.6% | **1.1%** |

- **Texture is flat:** mean best–worst spread 3.8 pts, and ≥5 pts in 26% of offers.
- **Bell is never right.** A jackpot ×2 is dominated by the Key (doubles are far more common).
- On screen, **FITS appears on the Ticket but not on Overcharge for a charged-bolt TESLA** (`i8p-legend.png`), and no legendary card says what it does *to your machine*. Compare "TICKET: YOUR CHARGED SET +2 → +3 ENERGY".

### Chips at the Mirror (`it8_chips`)

- The Package O chip shield works as a sink. The effect in the sim is small because commit spends: 5.7–9.4 chips at the Mirror = 0.3–0.8 shield per turn, worth +1.3 to +3.5 Mirror win.
- Runs that arrive with 16–24 chips win **81%** vs 66%.
- Human play banks far more: I had **43** chips, which is +5 shield on *every* Mirror turn. For a hoarder that probably turns off the Mirror's sword damage entirely, and that's worth watching.
- The shop text ("+N SHIELD EACH MIRROR TURN") is clear.

### Elites

- The act 2 elite ×1.5 is right. Greedy's DANGER-based fork now takes an act 2 elite only 1.5% of the time, while commit + elite2 is +3.4 with 2× the death risk.

## 4. Bugs (with repro)

| # | Bug | Repro |
|---|---|---|
| **G1** | **Previewing a TIER II card gives it to you for free (critical).** `stripsAfter()` builds `copy.player.gilded = [...run.player.gilded]` (shallow), and `applyOption` for a tier does `for (g of p.gilded) if (g.enh === o.enh) g.tier = 2`, mutating the real run's gild objects. `runScreens` calls `optionDeltas` for every draft card (`showDraft`) and **every frame for shop items** (`drawShopItem`). Effects: the item is useless once bought; gilds added while the shelf is up are upgraded too; the tier item's stat line reads 0 change. I7's per-cell `own.tier = 2` had the same leak. The sims don't call `optionDeltas`, so all balance numbers are for the intended game. | `npx tsx playtest/scratch/it8_tierleak.ts` (tier: undefined → 2 after one `optionDeltas`). Live: KNIGHT seed 4242, act 2 Cashier after B1 (`i8p-k-shop-b1.png`): `gold@3` became `goldII@3` before buying, and a GOLD SWORDS r1 bought from the same shelf also came out II. Fix: deep-copy the gilds in `stripsAfter` (`gilded.map(g => ({...g}))`). |
| **G2** | **"TIER II upgrades a whole gild" breaks when you extend it.** A gild bought after the upgrade is plain (`applyOption` pushes without `tier`), so you get a mixed-level set and the TIER II offer comes back for the new cell. | Take GOLD II, then buy GOLD SWORDS on another reel → `tierUps()` offers GOLD II again. New cells of an upgraded gild should inherit tier 2. |
| **G3** | **TUNE / LOG / SOUND steal clicks from the Cashier's LEAVE button.** `pointerDown` checks `this.buttons` (the tool buttons stay `visible` under screens) before `screens.pointerDown`. LEAVE (685–935, 626–682) overlaps TUNE (795–885) and LOG. | At any Cashier, click the right half of LEAVE → the tuning drawer opens and you stay in the shop. "…OG" and "SOUND" are visible through the shop (`i8p-shop-a3.png`). Hide the tool buttons while a screen is active, or give screens priority. |
| **G4** | **The COMPLETES SET ribbon is illegible** (F13, confirmed): dark 1.5x text with a dark outline on gold turns into blobs, on draft cards and shop cards alike. | `i8p-k-draft-b3.png` (both set cards), `i8p-shop1.png`. Use light text or a sprite banner. |
| **G5** | **GOLD card text doesn't match additive GOLD.** Cards say "PAY X3 (SET)" per cell, but a group now pays ×(1 + the sum of gold levels): three level-3 cells pay ×10, not ×3. | `i8p-k-draft-b3.png`. Word it as "+2 TO THE GOLD MULTIPLIER (SET)", or show the triple ("A JACKPOT PAYS X10"). |
| **G6** | **The REFLECTION panel vanishes a turn early.** It now hides on the engine's `fight.over` (F10 fix), which becomes true as soon as the killing turn is *computed*. The panel disappears while the previous turn, here the last REFLECTION itself, is still animating. | TESLA Mirror, final turns: `i8p-mirror-end.png` ("YOUR OWN HIT! −20" with no panel; the Mirror is still at 16 HP). Use presented HP or the director's state. |
| G7 | **Near-duplicate draft cards.** "CHARGED BOLTS reel 3" vs "CHARGED BOLTS reel 2" (identical stats), and "3 SHIELDS TO BOLTS" r1 vs r3 in the same draft. It wastes a third of the choice. | TESLA seed 9005 draft after fight 1; KNIGHT B5 draft. Dedupe by (kind, enh/symbol) when reels are equivalent. |
| G8 | **TIER II items have no stat line.** With G1 fixed they'd show nothing either. Every other gild card has one. | `i8p-shop-b0.png` (CHARGED II), `i8p-k-shop-b1.png` (GOLD II). |
| G9 | **The Mirror panel footer is inaccurate.** "YOUR BEST HIT SO FAR" resets after each REFLECTION: it's the best hit *since the last one*. | Any Mirror after the first REFLECTION. Suggest "YOUR BEST HIT SINCE ITS LAST". |
| G10 | **Legendary FITS is inconsistent.** Ticket gets FITS; Overcharge doesn't for a CHARGED-set TESLA, whose whole game is specials. | `i8p-legend.png` |
| G11 | **12-fight recap:** row font size changes per row (long rows drop to scale 1), long rows truncate ("SKEL…"), and YOUR REELS still shows no tier II. | `i8p-over-win.png` |
| G12 | The 3X SPEED label touches the bottom of the REFLECTION panel. The chip counter and first relic column clip at the canvas's left edge in fights. | `i8p-mirror-a.png`, `i8p-bomber-mid.png` |
| G13 | *(Dev only)* `dbg.vs('mirror')` builds the Mirror without the REFLECTION cap and still copies spikes. | `src/debug.ts` `vs()` |

**Verified fixed from I7:**
- **F1:** the HUD reads "REFLECTION IN 3/4" after CRACKED with the Hourglass, matching the panel.
- **F2:** the preview says "EVERY 5 TURNS … (3 TO 25) … CAPPED AT 60% … CRACKED 1 TURN FASTER".
- **F3:** the Hexer preview says "HEXES 1 REEL FOR 3 TURNS".
- **F4:** the text is level-aware; see G5 for the GOLD semantics.
- **F7:** the recap lists spoils and buys.
- **F9:** TWIN REELS. **F11, F12.**
- **F14:** the chip shield on Mirror turns.
- **Not re-verified:** F5 (banner maths; the banner is gone by frame capture) and F6 (bomb callout). The bomb art is still the corner sprite (art in progress).

## 5. Prioritised changes (★ = top 5)

1. ★ **Fix G1 and G2 now.** Deep-copy `gilded` in `stripsAfter`. New cells of a tier II gild inherit tier 2. Add a test that `optionDeltas` leaves the run unchanged.
   - Until then, the user's act 2 is about +3.5 pts easier than the sims say (+6 for TESLA), and TIER II purchases are wasted chips.
2. ★ **Cabinet act 2 signatures** (extending THORN's rule). At the act transition:
   - **KNIGHT** +6 max HP ("THE DEPENDABLE ONE").
   - **THORN** keeps spikes tier II and gets +4 max HP.
   - **JOKER** 2 shields → WILDs on reel 3.
   - **TESLA's Rod** special 10 instead of 12.
   - **MIDAS** 23 HP (act 1: 42.8 → about 48).
   - Tested act 2 spread **24.2 → about 13**, with TESLA still top (+7) but within target. Show each signature on the cabinet card and on the act transition screen.
3. ★ **The Mirror: don't copy KEEN, and gate the crack.**
   - **No keen copy:** the Mirror doesn't copy KEEN (keen SET gift −8 → +8). Say so in the preview: "COPIES YOUR GILDS. IT CAN'T COPY AN EDGE."
   - **Crack gate:** the turn that cracks the Mirror stops at half its HP. With Mirror flat −15 (tested, `it8_crack` b): Mirror win 68.6 → **62.6** ✓, wins without a reflection 21% → **10%**, fights 11.3 turns, commit − random 5.9, commit − HP-first 4.8.
   - **Combined with item 2** (`it8_pkgP2`): commit 43.3, Mirror 62.0, REFLECTION ≥1× 89%, spread 15.4 (JOKER lowest at −9, so JOKER may want a second wild).
   - **Caution:** the gate makes elites worth a bit more (elite − safe 3.3 → 5.4) and tier IIs a bit less (notier +1.5). Re-measure both after landing it.
   - **Don't** cap per-spin damage to the Mirror instead (`it8_glass`: −12 pts, and it punishes burst builds disproportionately).
4. ★ **Readability batch:**
   - G3 click-through (hide tool buttons under screens).
   - G4 ribbon.
   - G5 GOLD wording.
   - G6 panel timing.
   - G7 duplicate cards.
   - G8 tier stat lines.
   - G9 footer.
   - G10 legendary FITS and a "does to your machine" line on legendary cards.
5. ★ **New content: act 2 counter-enemies** (details in §7). TESLA and MIDAS are strong because nothing on the map answers them. Two new act 2 archetypes that write on your machine in new ways would make those builds meet their answer on the fork, instead of taking a global nerf.
6. **Bell rework.** Best pick in 1.1% of offers. Suggested: "JACKPOTS PAY X2 AND REFILL YOUR SPECIAL" or ×3. Then make the legendary offer build-aware: one generic, one that FITS, one Mirror counter.
7. **Opener safety for the thin cabinets.** TESLA and MIDAS die in fight 1 3–5% of the time, vs about 1% for KNIGHT. The first fight of a run shouldn't be where a new cabinet dies. Suggest opener HP ×0.8 for cabinets under 26 HP, or the opener never Frost for them.
8. **Drop the "at cap ≤40%" target.** The per-run cap *is* the variation; keep "REFLECTION ≥1× in ≥75% and no cabinet under 65%".
9. **Watch the hoarder.** At 40+ chips the Mirror chip shield is 5+ per turn. If live players bank like I did, cap it at +4 per turn or make it 1 per 10 in act 2.

## 6. Art needed

| Sprite | Description |
|---|---|
| `setRibbon` | Sprite version of COMPLETES SET: light text on a gold ribbon, legible at 1x (G4) |
| `bombOverlay` v2 | In progress (art agent): the bomb fills about 60% of the cell, fuse number on its body |
| `tier2Frame` | In progress; the hook exists. Also needed in YOUR REELS / the recap (G11) |
| `mirrorCrackGate` | A "glass holds" burst for the crack gate: a shard ring, a "CRACKED!" flash, HP bar notch at 50% |
| `enemyGrounder`, `symGround`, `groundOverlay` | New enemy (§7): earthed/grounded cell overlay (a copper spike driven into a bolt) |
| `enemyCounterfeiter`, `symFake`, `fakeOverlay` | New enemy (§7): "lead" overlay on a gilded cell (grey tarnish over the gild frame) |
| `sigKnight`, `sigJoker`, `sigThorn`, `sigTesla`, `sigMidas` | Act 2 signature icons for the cabinet card and act transition screen |
| `legendFrame` | Still pending: distinct legendary card frame |

## 7. Proposal: Package P ("every build meets its match")

**Balance / fixes:**
1. **G1/G2 fixed**, with a test that previews are pure.
2. **Act 2 signatures:** KNIGHT +6 max HP, THORN tier II spikes and +4 max HP, JOKER +2 WILDs on reel 3, TESLA Rod special 10. MIDAS 23 HP.
3. **The Mirror:** doesn't copy KEEN. The cracking turn stops at half HP. Flat 52 → 37 (re-tune to 60–65% Mirror win after 2 lands).
4. **Readability batch** G3–G10.

**New content feature: act 2 COUNTER-ENEMIES.** Two archetypes, each a new way to write on your machine, each the answer to a dominant build. They join the act 2 pool with `minDepth` 1, so they show up on forks and you can often *choose* to face or dodge them.
- **THE GROUNDER** (anti-specials). It writes **GROUND** rods onto your bolt cells, one per hit (a double 2, a jackpot 3).
  - A grounded bolt still pays energy, but **your special can't ignore shields while any grounded cell is on your payline**.
  - Ability, **EARTH** (every 4): drains 3 energy from you.
  - Rods crumble after the fight, like rocks without the permanence.
  - Readable counter-play between fights: the Grounder's preview shows "SPECIALS HIT SHIELDS", so you can take the other fork, or draft KEEN/swords.
- **THE COUNTERFEITER** (anti-gold/multipliers). It writes **FAKE** coins over your **gilded** cells (gilded cells first, like the Thief).
  - A faked cell's gild counts as **plain** (level 1, no set) for 2 turns.
  - Ability, **LAUNDER** (every 4): takes 2 chips from your purse and adds them to its HP ×3.
  - It's the MIDAS/GOLD-set check, and it answers the hoarder too.
- **The target:** with the counters in the pool, TESLA's and MIDAS's B-fight lethality should rise from about 4–5% to about 8–10% per fight (KNIGHT is 7–15), without touching their Mirror.

**I9 sim targets** (identical B1 snapshots, the `it8_skill` / `it8_pkgP2` harness):
- Commit ≥ notier, commit − HP-first ≥ 3 for every cabinet (THORN included), commit − random draft ≥ 6.
- Act 2 elite − safe within ±3.
- **Act 2 clear spread (max − min cabinet) ≤ 14 under commit.**
- Mirror win 60–65% (commit), REFLECTION ≥1× in ≥75% for **every** cabinet, Mirror wins without a reflection ≤10%.
- No B1 gift negative (KEEN SET especially). GOLD / CHARGED / BLAZE SETs within ±5 on KNIGHT and JOKER.
- Act 1: every cabinet 45–53% clear under commit, 16-pt gap. Opener deaths ≤2.5% for every cabinet.
- **Browser:** buying a TIER II changes your gilds, and looking at one doesn't.
