# Expert playtest 4 (2026-09-30): after EXPERT_PLAYTEST_3 E1–E11 and ENDLESS (iterations 36–38)

Build: the frozen build on :4173 (HEAD 654718f), plus headless sims. No `src/` edits.

**How I played**
- **Browser** (driven with `dbg.tick`; the pane only advances when ticked):
  - KNIGHT GREEN, seed 4242: played for real through act 1 and act 3. Act 2 was forced. Died to an ELITE CARD SHARP at fight 16.
  - TESLA GREEN, seed 777, twice: forced to the Dealer, then watched the Dealer live. Lost both times, once in 12 turns and once in 8.
  - JAX GREEN, seed 99: forced to the Dealer and beat it, then pressed LET IT RIDE.
    - Loops 1–3 were played for real: House, Mirror, and a 57-turn loop 3 Dealer that I won.
    - Loops 4–5 were forced.
    - The loop 6 Dealer was played for real. BUSTED ON LOOP 6.
  - Also seen: the Cashier with rising rerolls, a Relic Rush, the catch-up card, the edge screens, the win and bust screens, and hiscores.
- **Headless:**
  - `gate.sh 600 exp4`, `endless.ts 300`, `expert3_status.ts 300`, `expert3_spikes.ts 300`.
  - New throwaway harnesses in `tools/balance/`:

    | harness | what it measures |
    |---|---|
    | `expert4_endless.ts [N] [edge\|none\|natural]` | per-loop fights, LAST CALL, 80-turn cap deaths, and what each HOUSE EDGE costs (the same edge forced every loop) |
    | `expert4_dealer.ts [N]` | Dealer spikes, the killing blow, ALL IN size, line cards, act 3 grading, and HP into the Dealer over ALL act 3 entrants |

**Official table (gate 600, GREEN = stake 2):**

| | WHITE | GREEN | Dealer | HP into the Dealer (arrivals) |
|---|---|---|---|---|
| KNIGHT | 40.2 | 11.0 | 46.8 | 69.4 |
| TESLA | 39.8 | 14.2 | 54.1 | 93.8 |
| BRIAR | 44.3 | 13.7 | 46.1 | 86.0 |
| JAX | 38.8 | 14.3 | 50.9 | 90.9 |
| **AVG** | **40.8** | **13.3** | **49.5** | **85.0** |

- **Deaths by fight** (share of all runs): House 18.3%, Mirror **22.5%**, Dealer 11.3%.
  - So 52% of runs end at the 3 bosses, and bosses cause 60% of all deaths.
- **Regular fights:** act 1 deaths 1.6% per fight, act 2 4.6%, act 3 5.6%.

---

## A. Verification

| Change | Verdict | Evidence |
|---|---|---|
| **E1 death recap** | **Works.** | "KILLED BY ELITE CARD SHARP: THE SHARP'S MARK 45 - SPIN HITS 39" added up exactly to the 84 HP I had. The TESLA Dealer recap listed SPIN HITS 218, THE DEALER'S MARK 31 and ALL IN 1. Nit: "ALL IN 1" is the clamp leftover and reads like a joke. Drop entries under 1 UNIT. |
| **E2 one-turn caps** | **Works.** | No regular enemy turn reached 60% of max HP in any archetype. **Mimic losses 19% → 8.9%**, and the Card Sharp 13.6% → 9.3%. The Mimic still has a turn of 40% or more in 41% of fights. That's at the cap, which is fine. |
| **E3 thaw immunity** | **Didn't move the metric.** | FROST IMP (act 1, 1,671 fights): **70% of spins stuck** and **87% of fights with half or more spins stuck**, against 71% / 86% before. Gremlins are still at 44–51%. Immunity only protects the reel that thawed, so the imp freezes the other reel instead. See C2. |
| **E4 marks cap** | **Works during the fight, but broken at fight start.** | Carried marks (THE DECK REMEMBERS) ignore the 2-per-reel cap: I saw 2/2/**4** marked cells and "MARKS ON YOU: 8" (B6). |
| **E5 UI pass** | **Good up to 18 rows.** | The TESLA and KNIGHT run-over screens are readable, and KILLED BY is on its own line. It **collapses in endless** (B1). |
| **E6 catch-up** | **Works.** | Offered after a 36% loss. It says HEAL 110 when 47 HP is missing, which is by design (max(35%, missing)). |
| **E7 shop** | **Works in the main run.** | REROLL 1 → 2. Slot 2 is a different charm from a LEVEL card. In endless, shelves go thin again: 3 items at loop 3 with **115 chips** in hand (C1). |
| **E8 Dealer finale** | **Better, not yet a finale.** | Line cards measured at ACE 21–24% / JOKER 13–19% / DEUCE 57–65%, as designed. "UP TO N" and the X2/WILD/ZERO caption read well. But **marks still use the same white `card` sprite** as the Dealer's own card symbol (`reel.ts:297` draws `artId('card')`), so a marked payline still reads card/card/card. The telegraphed move isn't what kills you: see C3. |
| **E9 graded act 3** | **Mechanically works; the goal isn't met.** | The cover charge lands in 87–99% of act 3 regular fights, and regular enemies now nearly always get a turn (KNIGHT 12.7% never act, was 38–59%). But **net HP lost p50 is still 0%** for TESLA, BRIAR and JAX (8% for KNIGHT): in-fight sustain heals it back before the fight ends. Act 3 deaths are 5.6% per fight (target ≤ 4%). |
| **E10 readability** | **Mostly works.** | The deal box, "UP TO" and the pot box are readable. The House rules paragraph is still ~5 px, **and it contradicts the ability line**: "CASH OUT EVERY 4 TURNS" vs "EVERY 3 TURNS THE HOUSE SKIMS" (B8). |
| **E11 act 2 pacing** | **Better for regular fights, not bosses.** | Act 2 regulars p50: KNIGHT 11–13, TESLA 17–19, BRIAR 11–18, JAX 9–14 turns. But the **BRIAR Mirror is still 48 turns** p50 (KNIGHT 9, JAX 17), and the BRIAR Dealer 33 (KNIGHT 17). |

### Endless: is it fun?
**The first loop is a thrill.** Pressing LET IT RIDE with the win safe is exactly the right slot-machine feeling. After that, the structure collapses into a known script:

| Loop boss | Lost | Turns p50 | Note |
|---|---|---|---|
| L1 House | **0%** | **3** | HP 3.8K, against **96K** for that loop's regulars. It dies before it cashes out once. |
| L2 Mirror | 8% | 13 | A fine fight. |
| L3 Dealer | **55%** | **47** (p90 80) | 18% of these fights hit the 80-turn cap. HP ~343K; mine took 57 turns at 8X. |
| L4 House | 0% | 3 | |
| L5/L6 Dealer | **90–100%** | **80** | A sponge wall: my loop 6 Dealer had 949K HP and I dealt ~2K per turn. |

- **Regular loop fights:** lost 1–3%, HP lost p50 **0%**. They're filler.
- **Loops cleared:** p50 2 for every machine. That is exactly "you die to the loop 3 Dealer". The gate passes, but the distribution is one wall, not a curve.
- **LAST CALL never fires: 0.0% of 1,500+ endless fights.** It triggers when `floor(turn/2) - 40 > 0`, i.e. turn 82, but the 80-turn cap ends the fight at turn 80 (`fight.ts:1101` vs `:561`; `turn` counts both sides). So you die **at full HP, with no warning, on a timer** (B2).
- **HOUSE EDGE picks aren't real decisions** (same seeds, one edge forced every loop, 78 riders):

  | Edge | Loops cleared (mean) |
  |---|---|
  | no edge | 2.76 |
  | GLASS JAW | 2.77 |
  | IRON BOSSES | 2.71 |
  | EARLY BIRD | 2.78 |
  | FAST HANDS | **2.96** |
  | LOADED REELS | **3.06** (it *helps*: writer symbols replace the enemy's damage symbols; Dealer losses 58% → 34%) |
  | HOUSE CUT | 2.18 (the only real cost) |
  | natural play | 2.69 |

  So the pick is always "take the card with the legendary on it". Reward slot 1 is always the legendary, and slot 0 always chips.
- **Chips balloon:** +15 to +27 per loop fight. I had 72 by loop 2, 144 by loop 3 and 262 by loop 6, with 3-item shelves. Chips mean nothing in endless.
- **No beat for clearing a loop:** a loop boss win goes straight to the next edge screen. There's no "LOOP 1 CLEARED", no relic, and no big choice (the design called for one).
- **Numbers:** fmtNum reads well: 28.4K/38.7K, 246K/343K. No overflow seen.

### Is the Dealer now a finale? **Half.**
It has the right props: the deal box, the aimed DEUCE, "UP TO N", RAISED!, and marks. But it's decided by spikes that aren't the telegraphed ones (`expert4_dealer.ts 300`):

| | KNIGHT | TESLA | BRIAR | JAX |
|---|---|---|---|---|
| biggest Dealer turn, p50 of fights | 25% | **60%** | 43% | 55% |
| losses that include a turn of 40%+ | 27% | **88%** | 64% | 78% |
| killing blow was ALL IN | 15% | 12% | 28% | 13% |
| ALL IN HP damage, p50 | 6% | 24% | 9% | 19% |
| winners' HP left, p50 | 41% | **100%** | 72% | 90% |

- For TESLA and JAX the Dealer is **two capped 60% turns**: you either lose in ~4 enemy turns or win untouched.
  - Live: TESLA 250 HP was dead on turn 8. The recap reads SPIN HITS 218.
- The telegraphed ALL IN is rarely what kills you. It's a notice, not the climax.

---

## B. Bugs (with steps)

1. **The endless bust/win screen is unreadable** (**S–M**).
   - **Steps:** JAX GREEN, seed 99. Force to the Dealer, win, LET IT RIDE, and die on loop 6 (42 rows).
   - **What you see:**
     - all rows are drawn over each other, and the KILLED BY line is lost;
     - the stale "STAKE 3 BLACK UNLOCKED FOR JOKER…" line is repeated on the bust screen.
   - **Fix:** in endless, show the acts as 3 summary rows, then one row per loop (boss, turns, HP), then the last 3 fights in full, then KILLED BY.
2. **LAST CALL is dead code, and the 80-turn cap is a silent timer death** (**S**).
   - **Where:** `fight.ts:1101` vs `:561`. The cap checks `this.turn >= 80`, which is 40 enemy turns. LAST CALL checks `floor(turn/2) > 40`, which is turn 82.
   - **Steps:** loop 5 or later Dealer. You die at turn 80 at full HP with no banner.
   - **Fix:** count both in enemy turns. Start LAST CALL at enemy turn 25 (in endless), and put a visible "THE HOUSE CLOSES IN N" countdown for the last 5 turns before the cap. Credit the cap in the recap as "CLOSING TIME".
3. **Loop-boss screens use main-run text** (**S**). After LET IT RIDE:
   - "ACT 4 - FIGHT 1 OF 3" should read "LOOP 1 - FIGHT 1 OF 3";
   - the loop House shows **"FINAL FIGHT"** and a **"FACE THE DEALER"** button (the Mirror's button says the same);
   - the legend pick after the edge says **"ACT 2 BEGINS - FULLY HEALED"** plus "JOKER ACT 2 SIGNATURE: 2 SHIELDS ON REEL 3 BECOME WILDS". The signature text is shown but not applied, so it's misleading.
     - Its subtitle is the stale Dealer record: "THE DEALER DEFEATED … PATCHED UP TO 140". The 140 is really GLASS JAW's max HP cut.
4. **Duplicate HOUSE EDGEs** (**S**). From loop 6, when fewer than 2 edges are left, `startEndlessLoop` rolls from all EDGES. I took HOUSE CUT twice. The second copy is a no-op that still pays the reward.
   - **Fix:** once the edges are exhausted, offer stacking versions ("HOUSE CUT II"), or a single forced edge.
5. **The loop House is a free win** (**S**). In the balance sense this is a bug: HP 3,640 against 7,480 for that loop's regular Elder Mimic. 0% losses, 3 turns. Its pot never cashes out once.
6. **Carried marks ignore the 2-per-reel cap** (**S**). `fight.ts:311` (startMarks) marks random cells without checking `TUNE.marksPerReel`.
   - **Steps:** JAX endless loop 3 Dealer. The reels showed 2/2/4 marked cells and "MARKS ON YOU: 8".
   - Also, `run.deckMarks` adds the Dealer's own `marksPlaced` and never resets, so every endless Dealer starts at DECK_MARKS_CAP.
7. **Endless drafts go thin** (**S**). Loop 2 offered only 2 cards (+2 SWORDS / +40 MAX HP). Loop 3's Cashier had 3 items (2 relics and max HP) with 115 chips in hand.
8. **The House rules text contradicts the ability** (**S**). `runScreens.ts houseEvery()` hardcodes `every: 4`, while `POT.cashEvery` is 3.
   - **Seen:** "CASH OUT EVERY 4 TURNS" (3 + hourglass) next to "EVERY 3 TURNS THE HOUSE SKIMS…".
   - **Fix:** derive the rules text from the enemy's actual ability.
9. **Minor:**
   - the "LET IT RIDE" button uses a smaller font than "CASH OUT";
   - there's no line explaining that the win is already banked;
   - hiscores store `fights 41 / total 18` (the display is fine, but the data is odd), and the score legend doesn't mention +1500 per loop;
   - the ACT 2/ACT 3 tags on the run-over table overlap the panel border;
   - in dev only, `dbg.forceWin()` can still lose to the Mirror (the reflection lands first). It skews forced tests.

---

## C. What feels off now (prioritized)

### C1. Endless has a wall, not a curve, and its choices are fake (the biggest issue now)
**Today's script:**
1. a free House;
2. a fair Mirror;
3. a 47-turn sponge Dealer that ends half the runs;
4. then a timer death at full HP.

The HOUSE EDGE has no measurable cost for 5 of the 6 options, and one of them helps. Chips pile up with nothing to buy, and clearing a loop pays nothing.

**What makes endless mode good (Balatro, Hades heat, LBaL floors):** every loop is harder in a *new way*, every pick trades pain for power, and the death comes from attrition you saw coming.

**Fixes:**
- **Scale the boss by what it is, not by one HP curve.**
  - The House: HP ×3 in endless, and the pot seed × the damage multiplier.
  - The Dealer: HP growth 1.25/loop instead of 1.35–1.75, and damage growth 1.20 instead of 1.13.
  - That turns the sponge into a threat, so fights end by attrition around 25–35 turns, not by the cap.
- **LAST CALL** at enemy turn 25 (+15%/turn), and a visible closing countdown before the cap (B2).
- **Real edges.** Replace the no-cost ones. Gate: each edge costs 0.25–0.6 loops mean in `expert4_endless.ts`.
  - IRON BOSSES → **HIGH ROLLERS**: enemies +30% HP.
  - LOADED REELS → **MARKED DECK**: every enemy opens with 1 mark per reel on you.
  - FAST HANDS stays, but make it −2 turns.
  - EARLY BIRD → **NO COMPS**: the loop-start heal is 50%, not full.
- **Offer 3 edges, pick 1**, each with its own reward sized to its measured cost:
  - mild edge → +8 chips;
  - medium → a relic;
  - harsh → a legendary.
- **A beat per loop:** "LOOP N CLEARED" (score + loop), then one big-choice set (the 4 existing sets, re-rolled) after each loop boss.
- **Make LET IT RIDE a repeated gamble, not a one-time button.** Each loop win adds a **POT** of score (e.g. 1500 × loop). After every loop boss you may **CASH OUT** (bank the pot) or **RIDE** again. Busting banks only half the pot.
  - That's the push-your-luck the name promises, and it makes the endless death a choice you made.
  - It's score only; the Dealer win is never at risk.
- **A chip sink:** in endless, the Cashier sells **LEVEL 4** (past the cap, per symbol or charm, 30 chips, +10 each time) and "+1 PAYLINE CELL CHARM OF YOUR CHOICE". Unspent chips add to the CASH OUT pot.

### C2. The Frost Imp is still a stun-lock (E3 missed)
- **The numbers:** 70% of your spins are stuck against the most-met act 1 enemy, and 87% of those fights are half or more frozen.
- **Why E3 missed:** per-reel immunity just moves the freeze to another reel.
- **Rules:**
  - (a) After any thaw, **your whole machine** is immune to freeze and lock on the next enemy turn.
  - (b) Ability freezes are capped at 1 reel at a time; ice pairs and triples still freeze 2.
- **Gate:** Frost Imp stuck spins ≤ 40%, and fights with half or more stuck ≤ 30%.
- Same rule for Gremlin locks (44–51% today).

### C3. The Dealer is decided by the hits you weren't warned about
- **The numbers:** 88% of TESLA's Dealer losses (78% for JAX) include a 40%+ turn, but ALL IN is the killing blow only 12–28% of the time.
- **Fix:** a **two-tier boss cap for the Dealer**.
  - Untelegraphed turns cap at **35%** of max HP.
  - Turns under a telegraph (ALL IN, or RAISED) may reach **60%**.
  - Then every big moment is one you saw announced, and the fight gets 2–3 readable peaks instead of a coin flip.
  - Re-tune BOSS_MUL.dealer to keep 45–55%.
- **Marks:** make them the **red card-back** sprite EP3 asked for (a new `cardBack` in build-art). Today they're the same white card as the Dealer's own symbol.

### C4. "HP into the Dealer 60–75%" is the wrong target: retire it
Over ALL act 3 entrants (the dead counted as 0):

| | p25 | p50 | p75 |
|---|---|---|---|
| KNIGHT | 28% | 63% | 80% |
| BRIAR | 30% | 83% | 100% |
| JAX | 68% | 93% | 100% |
| TESLA | **4%** | **100%** | 100% |

- The cover charge lands 87–99% of the time, but sustain heals it back (p50 net loss 0%).
- **This is survivor bias plus sustain, not a missing damage source.** Chasing it will just add act 3 deaths, the way the three tries in iterations 34 and 37 did.
- **Replace it with finale-quality gates:**
  - Dealer win given arrival 45–55% (✓ today);
  - ≥ 50% of Dealer killing blows telegraphed (ALL IN / RAISED); today 12–28%;
  - Dealer losses that include a 40%+ untelegraphed turn ≤ 30%; today 27–88%;
  - act 3 regular deaths ≤ 5%.
- **If the owner still wants arrival tension, use an ANTE instead of more damage.** Every act 3 fight starts with "THE ANTE: −5% max HP", unblockable, never below 1 HP. It's visible, graded and survivable.

### C5. Boss length spread
- **BRIAR:** the Mirror takes 48 turns p50 and the Dealer 33, against KNIGHT's 9 and 17.
- **Why:** BRIAR's reactive thorn damage isn't in the boss sizing.
- **Fix:** add BRIAR's thorn damage to `sizingPower` for bosses, or cut thorn BOSS_MUL.mirror 10.5 → 6.
- **Gate:** every machine's boss p50 within 2x of the fastest.

### C6. Bosses are 60% of deaths; regular fights are safe
- Act 1 regular deaths are 1.6% per fight, with 29% zero-damage fights.
- That's OK for the shape of a slot roguelike: fights are short and the drafts matter for the boss checks. But the Mirror at 22.5% of all runs is the #1 wall.
- Leave it alone this iteration. Watch it after C5.

---

## D. Readiness calls

### MIDAS rework (gold = economy): **YES**, as the next content item, after E1–E9 below
**Why now:**
- The core is stable and tight: GREEN 11.0–14.3 across machines, Dealer 46–54%, act 2 regulars within ~1.5x.
- Chips are scarce and meaningful in the main run, so an economy machine has something to bend.
- MIDAS's code (meter kind `touch`, gold swords) already exists.
- Endless now gives chips a long tail to matter in, once the sink (C1) exists.

**Why after E1–E9:** MIDAS without chip sinks is the endless chip-balloon problem on purpose.

**Design (keeps his gold swords; one signature symbol plus meter):**
- **GOLD BAR** (signature symbol, ~3 per reel). A paying group with bars pays **+1 chip per bar (jackpot +3)**, capped at +8 chips per fight. The chip pops fly to the chip counter.
- **Meter: THE VAULT.** It starts each fight **pre-filled by chips held**: 1 per 2 chips, max 10. It fills +1 per gold bar landed. When full, his next paying group pays **×(1 + chips held / 20), capped at ×3**, and the vault resets to the chips-held level.
  - This is the core tension: **hoard (a bigger vault) or spend (power at the Cashier).** Every shop becomes a real Balatro-style interest decision, made between fights. Watch-only is kept.
- **The Cashier gives him a 20% discount** and a MIDAS-only service, "INVEST: 10 chips → +1 VAULT per fight this act", as a sink that feeds the meter.
- **Natural counters that already exist:** the Mimic eats chips (bump its gulp vs MIDAS), and the House's chip shield. Add one: the Pit Boss confiscates 1 chip per charm it takes.
- **Gold charms on MIDAS also pay 1 chip per jackpot.** That keeps "pay = BASE × MULT" intact.
- **Gates** (`tuesday.ts` and a new `midas_econ.ts`):
  - WHITE 38–44, GREEN 11–15, Dealer 45–55;
  - chips held at the House p50 20–35 (vs 8–18 for the others);
  - the two strategies must be within 3 points of each other: a pure hoard policy and a pure spend policy (win rate).
  - If hoarding dominates, lower the ×3 cap. If spending dominates, raise the vault pre-fill.
- **Effort:** M–L. BOSS_MUL for 3 bosses, relic fits (piggy and chalice become MIDAS-favoured), tests.

### More new slot machines (beyond MIDAS): **NO**
- **Boss pacing still spreads 5x:** the BRIAR Mirror takes 48 turns p50, KNIGHT's 9. The Frost Imp lockout and the Dealer spike rules are still open.
- **MIDAS is the test** of whether the tuning matrix (BOSS_MUL × 3 bosses × endless hpBy, plus relic fits and offer pools) survives a 5th column.
- **Revisit when:**
  - MIDAS passes its gates;
  - every machine's boss p50 is within 2x of the fastest;
  - endless loops cleared is a curve (p25/p50/p90 of about 1/3/6), not a wall.

---

## E. Prioritized change list (smallest, highest impact first)

| # | Change | Effort | Expected impact |
|---|---|---|---|
| E1 | **LAST CALL / cap fix:** both in enemy turns; LAST CALL at enemy turn 25 in endless; a "CLOSING IN N" countdown; the recap credits "CLOSING TIME" (B2) | S | No more silent full-HP timer deaths; LAST CALL goes from 0% to seen |
| E2 | **Endless text pass:** LOOP N headings, the boss button names its boss, no "FINAL FIGHT", no ACT 2 heading or signature on the loop legend pick, no stale subtitle, a LET IT RIDE subline ("YOUR WIN IS BANKED"), equal button fonts (B3, B9) | S | Endless reads as its own mode |
| E3 | **Endless bust/win screen:** acts and loops summarized, last 3 fights, KILLED BY kept; drop the stale unlock line (B1) | S–M | The only screen after an endless run becomes readable |
| E4 | **Frost/Gremlin: whole-machine thaw immunity;** ability freezes 1 reel at a time (C2) | S | Frost Imp stuck spins 70% → ~40%; the most-met act 1 enemy stops being a stun-lock |
| E5 | **Small correctness:** carried marks respect 2 per reel and deckMarks resets after the Dealer (B6); no duplicate edges (B4); House rules text from the real cadence (B8); drop recap entries under 1 UNIT | S | Removes rule contradictions players will screenshot |
| E6 | **Loop boss sizing:** endless House HP ×3 and pot × dmgMul; endless HP growth ~1.25/loop, damage ~1.20/loop (C1) | S | The House becomes a fight; the Dealer becomes a threat, not a 50–80-turn sponge. Target: loop fights p90 ≤ 35 turns, 80-turn cap deaths < 2% |
| E7 | **Dealer two-tier cap:** 35% untelegraphed, 60% under ALL IN or RAISED; re-tune BOSS_MUL.dealer (C3) | S | Telegraphed killing blows 12–28% → 50%+; TESLA/JAX Dealer losses with an untelegraphed 40%+ turn 78–88% → <30%; Dealer win stays 45–55% |
| E8 | **Mark sprite:** a red card BACK for marks (art agent: `cardBack` in build-art.mjs), distinct from the Dealer's white card symbol and the gold line cards (C3) | S | The Dealer's writing on your machine becomes readable at a glance |
| E9 | **Real HOUSE EDGEs:** 3 offered, pick 1; costs replaced (HIGH ROLLERS, MARKED DECK, NO COMPS, FAST HANDS −2); rewards sized to measured cost (chips / relic / legendary); a loop-cleared beat plus a big-choice set; gate each edge at 0.25–0.6 loops of cost (C1) | M | Each loop start becomes a real decision, and the loop clears feel earned |
| E10 | **RIDE AGAIN pot:** CASH OUT or RIDE after each loop boss; busting keeps half the pot; unspent chips add to the pot; endless Cashier sells LEVEL 4 (C1) | M | Push-your-luck on every loop; chips matter in endless; the ending becomes the player's choice |
| E11 | **BRIAR boss sizing:** thorn damage in the boss sizingPower (or thorn mirror 10.5 → ~6); gate every machine's boss p50 within 2x (C5) | S–M | BRIAR Mirror 48 → ~20 turns |
| E12 | **Retire the "HP into the Dealer" gate;** add the finale gates from C4 to `gate.sh` (via `expert4_dealer.ts`) | S | Stops tuning toward a survivor-bias number |
| E13 | **MIDAS rework** (the design in D), after E1–E10 | M–L | A 5th machine with a new decision axis (hoard or spend) |

**Suggested batches:**
1. **E1–E5, all S:** gate with `gate.sh`, `expert3_status.ts` and `expert4_endless.ts`.
2. **Then E6 + E7 + E8:** the bosses. Gate with `expert4_dealer.ts` and `expert4_endless.ts none`.
3. **Then E9 + E10:** endless decisions.
4. **Then E11 + E12.**
5. **Then E13:** MIDAS.

**Tests:** not run (a playtest-only session). No `src/` changes. New throwaway harnesses: `tools/balance/expert4_endless.ts`, `tools/balance/expert4_dealer.ts`. Their outputs are in `tools/out/exp4_*.txt`.
