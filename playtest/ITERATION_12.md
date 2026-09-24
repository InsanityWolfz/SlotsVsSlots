# Iteration 12 Playtest: Package R + ACT 3 (THE DEALER)

**Method.**
- **Headless.** `scratch/it12p_lib.ts` extends `it10_lib`. It adds act 3 instrumentation (marks, confiscations, rakes, each deal, the gate, HOUSE RULES, RAISE hits), act3-enabled paired full runs (`fullRuns3`), Dealer-entry snapshots (`snapsAt`), forced deals (`forceDeal`) and GREEN-aware legendary policies. Scripts and outputs are in `playtest/scratch/`:
  - `it12p_ladder.txt`: `it10_ladder`, commit, **1500 paired runs per cell**, run unchanged on the Package R code (12-fight runs).
  - `it12p_act3_s2.txt` / `_s2g.txt` / `_s3..s5.txt`: full act 3 runs, commit and greedy. 1500 per cabinet at GREEN, 1000 per cabinet at BLACK/BLUE/GOLD.
  - `it12p_deals.txt`: 1859 Dealer-entry snapshots × 4 seeds, replayed with each card forced (normal / none / SHUFFLE / CUT / RAISE).
  - `it12p_green.txt`: does heeding GREEN's legendary warning pay? (paired, 1500 per cabinet)
  - `it12p_dealerfix*.txt` (snapshots) and `it12p_act3fix.txt` (full runs): Dealer tuning candidates.
  - `it12p_rules.txt`: SCARS cadence and BLACK bomb-count candidates.
  - `it12p_officialsim.txt`: `npm run sim -- --runs 1500`.
  - Tests: 128/128 green.
- **Live, on :4173 only.**
  - The unlock flow: `stakes={knight:2}`, `act3=false`, then a forced GREEN win, the over screen, and the cabinet screen before and after.
  - **A KNIGHT BLACK run with act 3.** Acts 1–2 were forced. **Act 3 was played for real:** Pit Boss, then a Hexer at the fork, then a Mimic, then **the Dealer. I died at 35/359, with the Phoenix already burned.**
  - Sandboxes: `vs('sharp')`, `vs('pitboss')` with a forced gavel jackpot, and `vs('dealer')`, to check the gate.
  - A forced TESLA GREEN true ending.
  - Snaps are `snaps/i12p-*.png`. Prefs were restored to the originals afterwards: `unlockAll:true`, `stakes:{}`, `act3:false`.

## Verdict

**Act 3 is the right shape and the Dealer looks great. On screen, the sevens-heavy reels, the face-up telegraph and HOUSE RULES make it read as the House's partner. But mechanically it isn't a climax yet. It's a sevens slugfest with a deck of cards stapled on.**
- **Deals are worth 3.6 points of Dealer win.** Forcing every deal to do nothing moves the Dealer from 48.7% to 52.3%.
- **SHUFFLE costs 1.5 points.** The intended lesson is real in direction: non-set builds lose 8.9 points, set builds 1.4. But **99.2% of commit builds arrive at the Dealer with a FULL SET**, so the lesson reaches about 1 player in 100.
- **96% of the Dealer's damage is its own sevens and swords.** A 777 hits for 12–18, and that burst decides the fight.
- **The Dealer misses its target.** Under commit at GREEN it wins 49.2% (target 55–65), and the cabinet spread is **23.7** (THORN 36.6 to MIDAS 60.3; target ≤14).
- **Act 3 regular fights don't matter.** You enter the Dealer at 89–97% HP.

**A tested fix gets the Dealer to 62.5% with a spread of 15.1:** a less bursty strip (6 sevens, 4 cards) and HP of 7 × power + 60.

**Package R is half there.**
- Stakes now tell the truth: cadences, the copied relic and the full rule list are all visible.
- **But only BLUE is a clean rung.** **RED (SCARS) overshoots** at −4.7 to −8.5. **BLACK is still 0 for MIDAS/JOKER**, and **GOLD barely moves 3 of 5 cabinets**.
- GOLD/WHITE is 0.34–0.50, so only 2 of 5 cabinets are in band.
- **GREEN's warning doesn't change the right choice.** Heeding it is worth −1.1 to +0.5. And ~40% of copied legendaries come from the Cashier shelf, where the warning isn't shown.

## 1. Act 3 vs targets

**Full runs, GREEN, commit** (`it12p_act3_s2.txt`, 1500 runs per cabinet):

| | KNIGHT | MIDAS | THORN | TESLA | JOKER | all | target |
|---|---|---|---|---|---|---|---|
| reach act 3 | 15.2 | 14.1 | 20.8 | 18.7 | 12.8 | 16.3 | – |
| C1 / C2 / C3 deaths per attempt | 2.2 / 1.3 / 4.1 | 0.9 / 1.9 / 1.0 | 3.2 / 8.6 / **12.0** | 2.1 / 3.3 / 4.5 | 2.1 / 1.1 / 6.5 | 3.9 avg | "matter" |
| C fights HP lost | 14–19% | 11–19% | 23–33% | 12–18% | 13–21% | – | – |
| HP into the Dealer | 94% | 97% | 89% | 97% | 94% | 94% | < ~85% |
| **Dealer win** | 53.6 | 60.3 | **36.6** | 51.6 | 44.8 | **49.2** | **55–65** ✗ |
| Dealer HP / turns | 454 / 18 | 632 / 17 | 366 / 17 | 439 / 18 | 533 / 15 | – | – |
| full-run win | 7.5 | 8.2 | 5.9 | 8.7 | 5.2 | 7.1 | – |

- **Dealer spread: 23.7** (target ≤14) ✗.
- **Greedy:** 51.5% overall (45.3–60.6, spread 15.3). The implementer's "53–70% greedy" sweep was at N 500 with a different seed. At N 1500 greedy is 45–61.
- **Across stakes (commit):** the Dealer wins 49.2 (GREEN) / 50.3 (BLACK) / 52.6 (BLUE) / 58.7 (GOLD). It gets *easier* at GOLD, because only strong runs survive that far and the deals barely matter.

**How the Dealer fight plays** (all cabinets, commit, GREEN):
- **Deals per fight: 1.2–2.3** (SHUFFLE 0.53, CUT 0.55, RAISE 0.51).
- HOUSE RULES fires in 73–88% of fights.
- The gate clamps a killing blow in 30–67% of fights. The first deal lands at 57–62% of the Dealer's HP.
- **Damage to you:** swords and sevens 95.7%, marked cards 4.3%. RAISE-doubled hits are 8.3% of the total. **Your side of RAISE pays out on only 25% of raises**, because it needs a jackpot before the Dealer's next deal.
- **Every Dealer kill is a sevens or swords hit** (552 of 552).

**The forced-deal experiment** (`it12p_deals.txt`, 1859 snapshots × 4 seeds). Win % when every deal is that card:

| | normal | none | SHUFFLE | CUT | RAISE |
|---|---|---|---|---|---|
| all | 48.7 | 52.3 | 50.8 | 48.4 | 46.9 |
| SET builds (99.2%) | 48.9 | 52.5 | 51.0 (**−1.4**) | 48.5 (−4.0) | 47.0 (−5.5) |
| NO-SET builds (0.8%, n≈60 fights) | 26.8 | 33.9 | 25.0 (**−8.9**) | 30.4 (−3.6) | 33.9 (0.0) |

- **SHUFFLE punishes non-set builds about 6× more than set builds. ✓ The lesson is correct, but almost nobody meets it.** Set builds are already the default by act 3: commit completes a set 99% of the time, and greedy nearly as often.
- **RAISE is the harshest card, not a coin flip.** The Dealer's doubled hit always lands, but your doubled jackpot usually doesn't arrive.
- **The Golden Hourglass** makes the Dealer deal every **5** turns. In my live run it dealt once before HOUSE RULES. A legendary switches off the boss's signature mechanic.

**The act 3 regulars** (all cabinets, commit):

| | fights | deaths | HP lost | what its hook actually did |
|---|---|---|---|---|
| CARD SHARP | 739 | 4.7% | 23% | 4.6 marks, **1.7 HP** from marked cards per fight |
| PIT BOSS | 671 | 3.6% | 23% | **0.1 confiscations per fight** (needs a gavel double). The card promises "CONFISCATES YOUR GILDS" |
| CROUPIER | 827 | 1.7% | 16% | 3.2 rakes per fight (−1 per group) |
| veterans (bomber, mimic, hexer, vampire) | 1340 | 2.2–11.5% | 14–25% | as in act 2 |

- **Your sweep holds up:** they cost about 10 HP and rarely kill (3.9% per attempt). The exception is THORN at C3, with 12% deaths.
- **None of it reaches the Dealer.** The 20% post-fight heal plus the last Cashier's heal bring you in at 94%.
- The new faces' hooks are weak: they're sword fights with a sticker on.
- The confiscation visual is excellent when it fires (`i12p-pitboss-confiscate.png`: a dashed outline, a red tag and "CONFISCATED: GOLD"), but in a real run it almost never fires.

**Tuning candidates** (`it12p_dealerfix*.txt` on snapshots, then confirmed in full runs in `it12p_act3fix.txt`, 1500 per cabinet):

| variant (full runs, GREEN, commit) | Dealer avg | spread | C-fight deaths | per cabinet (K/M/Th/Te/J) |
|---|---|---|---|---|
| current (5x+170, 9 sevens) | 49.4 | 23.7 | 3.9% | 54 / 60 / 37 / 52 / 45 |
| **7x+60, strip 6 sevens / 3 swords / 2 shields / 4 cards** | **62.5** | **15.1** | 3.9% | 65 / 69 / 67 / 57 / 54 |
| … + no post-fight heal in act 3 | **60.1** | 15.3 | **5.7%** | 58 / 69 / 62 / 58 / 54 (HP in 82–94%) |
| … + no heal, 6x+60 | 67.2 | 15.4 | 5.7% | 66 / 75 / 69 / 67 / 60 |

- **A burst-heavy boss punishes low-HP, slow machines.** THORN goes from 37 to 67 once sevens drop from 9 to 6.
- **Scaling HP more with power and less flat** closes the MIDAS gap. More cards also means more marks, which feeds the Dealer's own theme.
- Snapshot-only notes:
  - Dealing every 2 turns *raised* win rates, because CUT often thins junk and the gate opens sooner.
  - 8x+20 with 7 sevens and every 2 gives a spread of 11.4, but a 72% win rate.

**Is it a satisfying true ending?** Visually and structurally, yes:
- "ACT 3 – FIGHT 1 OF 3" works.
- The Dealer card and reels are strong.
- The telegraph panel ("NEXT DEAL IN 4 · SHUFFLE · SWAPS 3 CELLS" → "DEALS NEXT TURN!") is the most readable boss telegraph in the game.
- The final screen reads "THE DEALER FOLDS! … BEAT ALL 16 FIGHTS – TRUE ENDING".
- My live Dealer was tense: a 777 took me from 39 to 27 in round 2, the Phoenix (the Mirror's copy, as it happens) saved me at round 13, and a 44-damage jackpot of mine at 1 HP nearly stole it.

What's missing is the *ceremony* and the *mechanic*:
- **Arrival.** There's no arrival beat: after the Mirror you get a plain "THE MIRROR DEFEATED!" draft, and the act 3 Cashier still talks about the Mirror.
- **Ending.** The ending leaves no mark on the cabinet screen.
- **Outcome.** The fight is decided by sevens, not by cards.

**Does the unlock flow read?** Partly. "ACT 3 UNLOCKED: FROM NOW ON, GREEN+ RUNS FACE THE DEALER" is appended to the stake-unlock sentence. That's 1x text wrapping to two lines (`i12p-over-act3-unlock.png`), and it's the biggest meta moment in the game. Nothing hints at it beforehand, and afterwards the stake picker at GREEN never says the run is now 16 fights (`i12p-cabinets-green-act3.png`).

## 2. Package R vs targets

**The ladder** (`it12p_ladder.txt`, commit, 1500 paired, 12-fight runs). Each cell is the win % with the paired step; step SE is ±0.3 for GREEN, ±0.7–1.3 for the others.

| | WHITE | RED | GREEN | BLACK | BLUE | GOLD | GOLD/WHITE |
|---|---|---|---|---|---|---|---|
| KNIGHT | 23.0 | 16.6 (**−6.4**) | 15.2 (−1.4) | 13.0 (−2.2) | 9.5 (−3.5) | 8.0 (−1.5) | **0.35** |
| MIDAS | 24.3 | 15.7 (**−8.5**) | 14.1 (−1.6) | 14.2 (**+0.1**) | 10.8 (−3.4) | 10.0 (**−0.8**) | **0.41** |
| THORN | 27.2 | 22.5 (**−4.7**) | 20.8 (−1.7) | 16.0 (**−4.8**) | 12.1 (−3.9) | 9.3 (−2.8) | **0.34** |
| TESLA | 26.7 | 20.0 (**−6.7**) | 18.7 (−1.3) | 17.5 (−1.3) | 14.0 (−3.5) | 13.3 (**−0.7**) | 0.50 |
| JOKER | 18.9 | 14.1 (**−4.8**) | 12.8 (−1.3) | 12.8 (**0.0**) | 8.5 (−4.3) | 8.5 (**−0.1**) | 0.45 |

**Targets:**
- **Every rung −1.5 to −4.5 for every cabinet: 9 of 25 cells ✗.**
  - RED 0/5 (too steep).
  - GREEN 2/5 (−1.3 to −1.7, on the edge).
  - BLACK 1/5.
  - **BLUE 5/5 ✓**.
  - GOLD 1/5.
- **GOLD/WHITE 0.45–0.6: 2/5 ✗.**
- **GOLD spread: 5.3** (target ≤4) ✗.

**Each rule alone** (paired vs base):
- SCARS: −4.7 to −8.5.
- GREEN copy: −1.5 to −2.7.
- BLACK: −1.6 (MIDAS) to −5.0 (THORN).
- BLUE's counter fork: 0 (−1.5 to +0.1). That's fine, since it's flavour.
- act 2 faster: −3.5 to −6.9.
- all faster: −4.7 to −9.8.

**GOLD adds little on top of BLUE** because the House's skim is exempt and act 2 is already faster.

**RED (SCARS) overshoots.** Act 1 clear drops 46→42 (MIDAS) and 50→44 (KNIGHT): the first scar lands after A3, on a 12-cell reel. From `it12p_rules.txt`:

| SCARS cadence | range |
|---|---|
| every 3 (now) | −4.7 to −8.5 |
| **every 4** | **−2.4 to −5.0** |
| every 5 | −1.5 to −4.2 |

MIDAS is the most scar-sensitive (22 HP, and gold rides every reel). My I10 candidate numbers (−1.4 to −2.9 for every 2) were too low: in that monkeypatch the scar rock was added *before* the per-fight crumble rule, so most of it crumbled.

**GREEN, now "copies your legendary".**
- **Who it copies.** The copy is **Phoenix 63–74%**, Key 22–30% and Bell 3–6%. GREEN has gone from "the Mirror has a Key" to "the Mirror has a Phoenix".
- **Does the warning change legendary choices? No, and it shouldn't under the current numbers** (`it12p_green.txt`):
  - 94–96% of offers include a safe pick (Overcharge/Hourglass/Ticket), and the value policy takes a copyable one 44–48% of the time.
  - Heeding the warning is worth **−1.1 to +0.5** (MIDAS −0.8, THORN −1.1, JOKER −0.9). Actively picking copyable ones is −0.3 to +0.9.
  - **A copied legendary costs less than the legendary is worth to you**, so "THE MIRROR WILL COPY THIS" is information, not a trade-off.
- **About 40% of copies come from the act 2 Cashier's legendary shelf**, which carries no warning (L3). Value picks Phoenix 21–24%, yet the Mirror holds a Phoenix in 63–74% of runs.

**BLACK now cheats** (3 bombs per reel, and they can land on the payline).
- **It now bites KNIGHT (−2.2) and THORN (−4.8).**
- **It still doesn't bite burst builds:** MIDAS +0.1, JOKER 0.0, TESLA −1.3. They kill the House before bombs and a 3-turn skim add up. The House wins 5–10 points more often, but the runs it knocks out are the ones that would have died in act 2.
- **5 bombs per reel doesn't fix it** (MIDAS −1.7, THORN −6.4). The lever has to be something burst builds can't outrun.

**Is the stake UI truthful?** Mostly yes ✓:
- The picker lists every rule (`i12p-cabinets-green-prelock.png`).
- The Mirror card says "COPIES YOUR LUCKY CLOVER".
- The Dealer card shows the Hourglass-adjusted "EVERY 5 TURNS".
- The HUD shows "STAKE 3 BLACK" at 2x.

The exceptions are act 3 (L1, L2, L5) and the shelf warning (L3).

**Other numbers:**
- **Official sim** (1500, greedy): 17.7% → **19.1%** (KNIGHT). Relic 14.3, random 10.3. House 74, Mirror 55.
- **KNIGHT greedy ladder:** 19.1 / 14.1 / 13.7 / 11.9 / 8.3 / 7.9. It has no act 3 row.
- **The Mirror at WHITE (commit):** 57.9–73.8. TESLA is still top by 6 points.

## 3. Whole-run feel (browser, KNIGHT BLACK + act 3)

- **Cabinet screen at GREEN, before the unlock:** clean two-rule list. There's no tease that winning here opens act 3; it should promise "WIN TO MEET THE DEALER".
- **Winning at GREEN:** "THE MIRROR SHATTERS!", then the stake line with "ACT 3 UNLOCKED…" tacked on in small text. The header still says "BEAT ALL 12 FIGHTS", which is now technically not the end of the game.
- **After the Mirror, in an act 3 run:** a normal draft titled "THE MIRROR DEFEATED!". The map quietly becomes Pit Boss / fork / Mimic / Dealer. **There's no ACT 3 plaque and no "THE HOUSE HAS A PARTNER" moment**, even though the plaque art exists. The act 1→2 transition had the legendary screen and a signature line; this one has nothing.
- **The act 3 Cashier** says "ACT 2: A LEGENDARY ON THE SHELF…" and "KEEP CHIPS FOR THE MIRROR: … EACH MIRROR TURN". That line runs off the right edge (`i12p-act3-cashier.png`), and Overcharge's text is cut off.
- **The act 3 fights:**
  - C1 was a Pit Boss (132 HP): 9 turns, 42→31, and no confiscation.
  - C2 was a choice between ELITE BOMBER and HEXER. Two veterans, no new face.
  - C3 was a Mimic: 11 turns, down to 17 HP.
  - Heals brought me to 39/42 for the Dealer. **These fights felt like act 2 with bigger numbers.** They were pleasant but didn't matter.
- **The Dealer (359 HP, every 5 because of the Hourglass):**
  - The "FINAL FIGHT" header and the card are great.
  - The card footnote spills past the frame (`i12p-dealer-card.png`), and "HOUSE RULES AT HALF HP" doesn't say what HOUSE RULES does.
  - **No "+4 SH/TURN" in the HUD**, although the chip shield is working (`shieldGain +4` each Dealer turn).
  - The deal panel is excellent. SHUFFLE landed at round 14, swapped cells on reels I couldn't tell apart, and changed nothing I could feel.
  - HOUSE RULES appears as a red label squeezed under the deal panel, against the NEW RUN button (`i12p-dealer-shuffle.png`).
  - I died to a 777 for 18. **The story of the fight was "sevens came up", not "the Dealer's cards beat me".**
- **The TRUE ENDING screen** ("THE DEALER FOLDS!", `i12p-true-ending.png`) works, but:
  - the recap has ACT 1/ACT 2 dividers and **no ACT 3 divider**;
  - the 16 rows touch the panel's bottom edge;
  - **the cabinet screen afterwards shows no mark** that you beat the Dealer (`i12p-cabinets-after-true-ending.png`). Nothing about it is persisted.
- **Pacing:** act 3 adds about 4 fights and ~50 rounds. That's fine for a true ending.

## 4. Bugs (with repro)

| # | Sev | Bug | Repro |
|---|---|---|---|
| L1 | **high** | **The act 3 Cashier shows act 2 text.** It says "ACT 2: A LEGENDARY ON THE SHELF" and "KEEP CHIPS FOR THE MIRROR … EACH MIRROR TURN", and the chip line overflows the right edge (runScreens.ts:866–871 treats every act ≥ 2 as act 2) | `dbg.run(5151,'knight',3,true)`, force to the Mirror, win, pick a draft card (`i12p-act3-cashier.png`) |
| L2 | **high** | **No chip-shield readout in the Dealer fight.** The shield applies (+4 each Dealer turn), but the HUD "+N SH/TURN" checks only `isBoss \|\| isMirror` (game.ts:719). The Dealer card doesn't mention chips either | Any Dealer fight with ≥8 chips (`i12p-dealer-start.png`) |
| L3 | med | **GREEN's "THE MIRROR WILL COPY THIS" appears only on the legendary pick**, not on the act 2 Cashier's legendary shelf (runScreens.ts:587, `draftKind === 'legend'`). About 40% of copied legendaries (mostly Phoenix) are bought there blind | GREEN run, the act 2 Cashier with a Phoenix/Key/Bell on the shelf |
| L4 | med | **No act 3 arrival beat.** There's no ACT 3 plaque, splash or line after the Mirror (just "THE MIRROR DEFEATED!" and a draft), and **no ACT 3 divider in the recap** (runScreens.ts:1012 only checks act 1→2) | Beat the Mirror in an act3 run; the over screen of any act 3 run (`i12p-true-ending.png`) |
| L5 | med | **Act 3 unlock and state are barely visible.** The unlock is appended to the stake sentence in small wrapping text. The GREEN+ picker never says "+ ACT 3: THE DEALER (16 FIGHTS)", and nothing teases it before the unlock | `stakes={knight:2}`, win at GREEN (`i12p-over-act3-unlock.png`, `i12p-cabinets-green-act3.png`) |
| L6 | med | **The Golden Hourglass slows the Dealer's deals to every 5.** In a ~17-turn fight that's about 1 deal before HOUSE RULES, so a legendary disables the boss mechanic | Any act 3 run holding `sandglass` (the Dealer card says "EVERY 5 TURNS") |
| L7 | med | **The Pit Boss card over-promises.** "CONFISCATES YOUR GILDS" needs a gavel double on its payline: 0.1 confiscations per fight over 671 fights. Its ability (PENALTY) is a plain 7-damage hit | `it12p_act3_s2.txt`; `dbg.vs('pitboss')` without forcing gavels |
| L8 | low | **The Dealer card footnote overflows the card frame**, and "HOUSE RULES AT HALF HP" is unexplained (it means the Dealer deals faster) | Dealer card (`i12p-dealer-card.png`) |
| L9 | low | Deal panel layout: the **HOUSE RULES label sits under the panel against the NEW RUN button**, the **CUT subtitle overlaps the card icon**, and the **RAISE subtitle "HIT. X2 JACKPOT" is cryptic** ("ITS NEXT HIT X2 · YOUR NEXT JACKPOT X2") | `i12p-dealer-shuffle.png`, `i12p-dealer-gate.png`, `i12p-dealer-raise.png` |
| L10 | low | The Cashier's OVERCHARGE card text is truncated ("…FOR A THIRD OF ITS") | `i12p-act3-cashier.png` |
| L11 | low | **The last fight's HUD/gutter bleeds behind run screens:** "COPIED PHOENIX FEATHER" under the Cashier's reel panel, "COPIED LUCKY CLOVER" beside the cabinet screen's stake chip, and the old Mirror HP box behind the draft | After a GREEN Mirror fight, open the Cashier or cabinet screen |
| L12 | low | **The true ending is not persisted.** There's no per-cabinet "Dealer beaten" flag, frame or badge; prefs only store `act3` | Win an act 3 run, then open the cabinet screen |
| L13 | low | The Card Sharp's "MARKED X3: THEY BITE ON YOUR PAYLINE" callout overlaps the hero panel's bottom border | `i12p-sharp-marks.png` |
| L14 | nit | `dbg.forceWin()` can't kill the Dealer before its first deal: the gate holds it at 1 HP. forceWin should also set `fight.dealt = true` | `dbg.vs('dealer'); dbg.forceWin()` (`i12p-dealer-gate.png`) |
| L15 | nit | `TUNE.act3Swords` (3) is dead code, because makeEnemy uses `act2Swords` (+2) for act 3. The comment at run.ts:416 still says "every 2nd win… best reel" for SCARS | read enemies.ts:337, run.ts:416 |
| L16 | nit | `npm run sim` reports nothing for act 3 (no Dealer row), so act 3 balance is invisible in the official output | `npm run sim -- --runs 1500` |

**Earlier fixes checked:**
- **K1 ✓:** cards use `effectiveAbility`. The Dealer shows the Hourglass +2, and the House at BLACK says 3.
- **K2 ✓:** the copied relic is on the Mirror card and gutter.
- **K3 ✓:** all rules are listed.
- **K4 ✓:** "ELITE: +30% HP. PAYS 8 CHIPS".
- **K8 ✓:** the 2x HUD stake label.
- **K11 ✓:** the official ladder is paired (act 1 is identical across WHITE/RED/GREEN).

## 5. Prioritised changes (★ = top 5)

1. ★ **Re-tune the Dealer to its target.**
   - Change the strip to **6 sevens / 3 swords / 2 shields / 4 cards** and set HP to **7 × typical-spin power + 60** (+4 per relic).
   - Tested in full runs: Dealer **62.5%, spread 15.1** (was 49.4 / 23.7). THORN goes from 37 to 67.
   - Sevens are the right flavour but the wrong *amount* of burst. Four cards give the Dealer more marks, which is on theme.
   - If JOKER (54) stays low after item 2, give JOKER's wilds immunity to marks.
2. ★ **Make the deals decide fights** (today they're worth 3.6 points).
   - Each card should hit a different axis, so no build is immune to all three:
     - **SHUFFLE** keeps its set immunity (it's the lesson), but swaps **5 cells** and names the two reels in the telegraph.
     - **CUT** takes your **best gild's cell** off each reel for the fight, so it hits the set builds SHUFFLE can't.
     - **RAISE** becomes a fair coin: "ITS NEXT HIT X2 · YOUR NEXT PAYING GROUP X2". Today your half pays on only 25% of raises.
   - **Deals ignore the Hourglass** (or take +1 at most) (L6).
   - **Target:** normal − none ≥ 8 points, and every card costs 2–6 points.
   - A later option: HOUSE RULES "adds a 4th card, ALL IN: the next deal happens twice".
3. ★ **Give act 3 regular fights teeth that reach the Dealer.**
   - **No post-fight heal in act 3** ("THE HOUSE DOESN'T COMP"). Tested with item 1: HP into the Dealer 82–94%, C-fight deaths 3.9 → 5.7%, Dealer 60.1, spread 15.3.
   - **The Pit Boss confiscates on its ability** (every 4), not on gavel doubles (L7).
   - **A Card Sharp's marks carry into the Dealer fight** ("THE DECK REMEMBERS"). That ties C-fight choices to the boss: the Sharp becomes the fork you dodge if you can.
   - The act 3 fork should always show at least one new face, like act 2's.
4. ★ **Act 3 truth and ceremony** (L1, L2, L4, L5, L12, L8, L9).
   - Arrival: an **ACT 3 plaque on the post-Mirror screen** ("THE HOUSE HAS A PARTNER…").
   - Text: act 3 Cashier text for the Dealer ("KEEP CHIPS FOR THE DEALER").
   - HUD: "+N SH/TURN" in the Dealer HUD.
   - Unlock: the act 3 unlock gets **its own over-screen row with the Dealer's portrait**.
   - Picker: the GREEN+ picker line reads "+ ACT 3: THE DEALER · 16 FIGHTS", and there's a pre-unlock tease.
   - Recap: an ACT 3 divider.
   - Persistence: a **per-cabinet "DEALER BEATEN" gold frame**, stored in prefs. That's the ending's reward.
5. ★ **Re-seat the stake ladder.**
   - **RED: SCARS every 4th win** (−2.4 to −5.0). Consider "scars skip reels carrying your FULL SET gild" to spare MIDAS (−5.0).
   - **BLACK needs a lever burst builds can't outrun.** Candidates, untested:
     - "the House ignores your chip shield";
     - "ALL IN at 65% HP";
     - "the House's pot starts at 10".
     - More bombs don't work (5 per reel: MIDAS −1.7).
   - **GOLD** must add something new beyond BLUE, e.g. "bosses +15% HP" or "the Dealer deals every 2 from the start". Today it's −0.1 to −2.8.
   - **Targets:** every cell −1.5 to −4.5, GOLD/WHITE 0.45–0.6, GOLD spread ≤4.
6. **GREEN as a real decision.**
   - Show the warning on the Cashier's legendary shelf (L3).
   - Make the copy cost more than the legendary is worth to you. E.g. **the Mirror plays your legendary at double strength** (Phoenix revives at 25% HP, Key doubles ×3), so avoiding it is right about half the time.
   - **Target:** heeding the warning is worth +1 to +3.
7. The stake UI lines for act 3 (item 4), plus the official `npm run sim` getting an act 3 / Dealer row per cabinet (L16).
8. **THORN in act 3:** C3 deaths are 12% and HP lost 23–33% per fight. After item 1 THORN is fine at the Dealer, but watch its C fights if item 3 lands. A SPIKED FULL SET hitting back marked-card bites is a cheap fix.
9. **TESLA's Mirror** is still top at WHITE (73.8), carried over from I10.
10. Clean-ups: L10, L11, L13, L14, L15.

## 6. Art needed

- **ACT 3 arrival splash:** reuse the ACT 3 plaque over a darkened Mirror-shatter frame, plus the Dealer's portrait sliding in with "THE HOUSE HAS A PARTNER". One 2x banner.
- **"DEALER BEATEN" cabinet frame:** a gold card-edge frame with a small ace pip, plus a TRUE ENDING ribbon for the over screen.
- **Revised deal cards:**
  - **CUT (gilded):** scissors over a gold cell.
  - **RAISE (two-sided):** two stacked chips with ×2 on both the Dealer's and your side.
  - A **reel-pair indicator** for SHUFFLE (two small reel arrows).
- **HOUSE RULES stamp:** a red rubber-stamp overlay for the Dealer's HP bar, replacing the loose text label.
- **"THE DECK REMEMBERS" overlay:** a faded marked-card variant for marks carried into the Dealer fight.
- **"NO COMPS" icon** (a crossed-out heart-plus) for the act 3 map/Cashier, if item 3 lands.
- **A GREEN "COPY" tag** for the Cashier's legendary shelf slot (the red text strip reused as a small tag).

## 7. Next package and the next BIG step

**Package S: "the Dealer earns its seat".** Items 1–6.

| Target | Value |
|---|---|
| Dealer win (commit, GREEN) | 55–65, cabinet spread ≤14 |
| normal − none (forced-deal harness) | ≥ 8 points |
| each card | costs 2–6 points |
| HP into the Dealer | ≤ 88% |
| C-fight deaths | 5–8% per attempt |
| every stake rung | −1.5 to −4.5 per cabinet |
| GOLD/WHITE | 0.45–0.6 |
| GREEN warning, heeded | +1 to +3 |

Re-run `it12p_act3`, `it12p_deals`, `it10_ladder` and `it12p_green` to verify.

**Next BIG step (after S): THE VAULT, a relic and upgrade expansion with boss relics.** Balance in acts 1–2 is solid (the Q table held at N≈800 last iteration, and BLUE is a model rung). Act 3 is one tuning pass from its target. So the next big step should feed what the user asked for: **more powerful upgrades and relics.**
- **Boss relics.** The House and the Mirror each offer **1 of 3 boss relics with a downside**, Slay the Spire-style. Examples:
  - "LOADED DICE: jackpots ×3, pairs pay 0";
  - "HOUSE EDGE: +1 chip per spin, the enemy's sevens hit you +1";
  - "CRACKED MIRROR: REFLECT 25% of damage taken, −6 max HP".
  - This turns the act transitions into the strongest decision in the run. The legendary pick moves to the Cashier.
- **Retire and replace the dead relics** from the official sim: Pickaxe (0% win), Hone 20%, Cactus 15%, Mittens 21%. Give each gild a **tier III** reachable only in act 3, so act 3's Cashier has something to sell besides heals.
- **A 6th cabinet built around the new relics**, e.g. **THE GAMBLER**: starts with LOADED DICE and 18 HP. It would be the first cabinet defined by a relic rather than a gild.
- **A daily seeded run**, as a cheap companion. The engine is already seed-deterministic (`createRun(seed)`): show one seed per day at a fixed stake with act 3 on, plus a local best. That gives the new relics a shared test bed without new balance risk.
- **Not yet: endless mode.** Every scaling term (Mirror/Dealer HP from `machinePower`) would need re-deriving for loops, and act 3 isn't settled.

Report files: this report, `playtest/scratch/it12p_*.ts` / `.txt`, and `playtest/scratch/snaps/i12p-*.png`.
