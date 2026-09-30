# Expert playtest 5 (2026-09-30): after EXPERT_PLAYTEST_4 E1–E13 (iterations 39–42)

Build: the frozen build on :4173 (HEAD b7af47e), plus headless sims. No `src/` edits.

**How I played**
- **Browser** (driven through `window.dbg` plus the real screen buttons; a synchronous `game.update` loop because the hidden pane throttles `dbg.tick`):
  - MIDAS GREEN, seed 5151: played for real. **Lost fight 1 to a MANGY SLIME (140 HP) at 300 HP**, in 12 rounds.
  - MIDAS GREEN, seed 777: pure hoard, played for real. The House was a walkover (300 → 270). Died at the Mirror holding **173 chips**.
  - MIDAS GREEN, seed 2024: a real fight 1 (300 → 120 vs a 140 HP slime, 21 turns).
  - MIDAS GREEN, seed 8080: forced to the House, then played the House for real: **59 turns, 17 vault payoffs, 393 HP healed, finished at 300/300.**
  - JAX GREEN, seed 31337: forced to the Dealer, then played the Dealer for real. **Lost in 71 turns. All 4 ALL INs were fully blocked (0 HP damage).**
  - JAX GREEN, seed 4242: forced to a Dealer win, LET IT RIDE, took MARKED DECK, then busted on loop 1 fight 1 (a CURSED MIMIC).
  - MIDAS GREEN, seed 99: forced through loop 1 to the RIDE AGAIN / CASH OUT screen, then CASHED OUT (4,940 points).
- **Headless:**
  - `gate.sh 600 exp5`, `endless.ts 300`, `expert4_endless.ts 150 natural`, and `expert4_endless.ts 60 <edge>` for each edge;
  - `expert4_dealer.ts 200`.
  - New throwaway harnesses (outputs in `tools/out/exp5_*.txt`):

    | harness | what it measures |
    |---|---|
    | `tools/balance/expert5_midas.ts [N]` | MIDAS Cashier policies **greedy / spend / hoard / bank30**; knobs MIDAS_PIP, MIDAS_MUL, MIDAS_MAX, HOUSE_MUL, POLS |
    | `tools/balance/expert5_dealer.ts [N]` | the Dealer's killing turn by type (ALL IN / RAISE / quiet / your own turn), damage share by type, ALL INs per fight |
    | `tools/balance/expert5_opener.ts [N]` | GREEN deaths per machine at fights 1–6 |

**Official table (gate 600):**

| | WHITE | act1 | House | Mirror | GREEN | Dealer | a1 turns/fight |
|---|---|---|---|---|---|---|---|
| KNIGHT | 44.5 | 83.0 | 86.5 | 61.2 | 14.8 | 53.3 | 13.2 |
| TESLA | 44.5 | 79.8 | 84.8 | 74.6 | 15.8 | 58.6 | 11.9 |
| BRIAR | 48.2 | 83.3 | 85.2 | 59.5 | 15.0 | 49.5 | 15.9 |
| JAX | 41.2 | 78.3 | 95.1 | 62.8 | 15.7 | 51.9 | 14.3 |
| **MIDAS** | 43.8 | **74.3** | **99.6** | 73.5 | **20.2** | 60.5 | **22.1** |

- **Zero-damage-taken fights:** act 1 30%, act 2 49%, act 3 52%.
- **HP lost p50:** 10% / 1.4% / 0%.

---

## A. Verification

### A1. MIDAS: the hoard-or-spend tension is not real yet. It's a solved threshold.
`expert5_midas.ts 400` (same seeds, greedy drafts; only the Cashier policy changes):

| policy | WHITE win | GREEN win | House | Mirror | Dealer | chips at the House / Mirror / Dealer (p50) |
|---|---|---|---|---|---|---|
| greedy (the official sim) | 48.8 | 22.0 | 99.6 | 84.8 | 60.3 | 21 / 24 / 73 |
| **pure spend** | 21.8 | 9.3 | 76.1 | 55.1 | 52.9 | 5 / 10 / 49 |
| **pure hoard** | 43.8 | **1.0** | 99.7 | 60.3 | **5.7** | 85 / 196 / 307 |
| bank30 (keep 30, spend the rest) | **69.5** | **26.8** | 99.7 | 85.0 | 53.5 | 37 / 49 / 98 |

- **Pure hoard vs pure spend:** 22 points apart on WHITE (hoard wins), 8 on GREEN (spend wins). **The gate is ≤ 3; it fails badly both ways.**
- **The real answer is "keep about 40 and spend the rest"**, and it beats everything by 20+ points. There's no tension, only a number to learn:
  - the ×3 cap saturates at 40 chips;
  - the pre-fill caps at 9 pips at 18 chips.
- **MIDAS is chip-flooded.** The bars pay up to 8 chips a fight, plus interest.
  - Even bank30 still holds ~100 chips at the Dealer.
  - So "spend" is never a sacrifice after the House: you can afford everything *and* a full vault.
- **Hoarding is punished invisibly.** `machinePower` sees chips held, so a 300-chip hoard sizes the Mirror and Dealer for a permanent ×3 vault. Result: Dealer 5.7%, GREEN 1.0%.
  - The player can't see why hoarding made the bosses fat. That's a trap, not a tradeoff.

### A2. Why the House is a 99.6% MIDAS win
It isn't damage. **It's regen.**
- **The House is the only boss with fixed HP** (`e.hp × BOSS_MUL.house + per relic`), so it never sees the vault.
- **The vault's resting level is "chips held / 2", up to 9 of 10 pips.** Holding ~20 chips at the House means **any single gold bar re-opens the vault**.
  - p50 **12 payoffs per House fight** (17 in my live fight).
- **Every payoff heals 3 UNIT** (30 HP). My live House: **393 HP healed**, plus the +40 SH/TURN chip shield. It ended 300/300 after 59 turns.
- **HP doesn't matter:** `HOUSE_MUL=6` (double the House HP) → House still **99.5–100%**. The fight just gets longer (vault payoffs p50 20).
- **The pre-fill is the lever:** `MIDAS_PIP=4` (half pre-fill) → House 99.6 → **91–92%**, but WHITE 48.8 → **23.3%**. It over-corrects, because the same pre-fill is MIDAS's whole early game.

**The shape is inverted.** `expert5_opener.ts 400`, GREEN deaths by fight:

| machine | f1 | f2 | f3 | f4 | f5 | House |
|---|---|---|---|---|---|---|
| KNIGHT | 0.0 | 1.8 | 0.5 | 1.0 | 0.3 | 14.5 |
| TESLA | 0.3 | 1.5 | 1.0 | 1.0 | 2.0 | 17.3 |
| BRIAR | 0.0 | 0.5 | 0.8 | 0.3 | 0.5 | 18.5 |
| JAX | 2.8 | 4.5 | 5.5 | 1.3 | 2.3 | 4.5 |
| **MIDAS** | **5.3** | **14.5** | 1.0 | 2.8 | 0.0 | **0.3** |

MIDAS is the most fragile machine in the first two fights (8 chips means a 4-pip vault) and immortal at the first boss.

**Also:** the vault multiplies your **first** paying group, which is often a single **shield**. Live, I saw "VAULT X1.25!" land on a 10-point shield. The payoff is wasted and reads as nothing.

**Fix, in one sentence:** move MIDAS's power from the House to the opener, and make the vault a *spend* of chips, not a *reading* of them. See E3–E6.

### A3. Endless
**Numbers:**
- **Loops cleared, `endless.ts 300`, p50/p90:** KNIGHT 1/2, TESLA 2/5, BRIAR 2/5, JAX 3/4, **MIDAS 1/2**.
  - MIDAS has no `ENDLESS.hpBy` entry, so it falls back to the untuned 1.45.
- **LAST CALL now fires:** L1 House 5.6%, L3 Dealer 31%, L5 bosses 65–100%.
- **80-turn cap deaths:** 2 of 49 L3 Dealers, 3 of 8 L5 Dealers. **E1 works.**
- **Per loop, `expert4_endless.ts 150 natural`:**

  | loop fight | lost | turns p50 | note |
  |---|---|---|---|
  | L1 House | 2.4% | 19 | **still free**, and now a slow free win |
  | L2 Mirror | **42.6%** | 21 | **the new wall** |
  | L3 Dealer | 30.6% | 37 | fine |
  | L4 House | **0%** | 37 | free and long |
  | regular loop fights | 2.6–8.9% | | HP lost p50 **0%**: still filler |

**HOUSE EDGEs are half real.** Mean loops cleared, the same edge forced every loop, 61 riders each (noisy, ±0.4):

| edge | reward tier | mean loops | cost vs none (3.28) | verdict |
|---|---|---|---|---|
| MARKED DECK | relic | 1.97 | **−1.31** | the harshest, underpaid |
| HOUSE CUT | chips | 2.41 | −0.87 | real, badly underpaid |
| HIGH ROLLERS | legend | 2.54 | −0.74 | about right |
| FAST HANDS | relic | 3.10 | −0.18 | almost free |
| NO COMPS | **legend** | 3.56 | **+0.28** | **free, pays a legendary: the dominant pick** |
| GLASS JAW | chips | (not modelled by the forcing harness) | small | fine as the chips tier |

- **Why NO COMPS is free:** regular loop fights cost 0% HP at p50, so starting a loop at 50% heals back before the boss.
- **Natural picks:** HIGH ROLLERS 111, MARKED DECK 92, NO COMPS 92, FAST HANDS 46, HOUSE CUT 15, GLASS JAW 16. The sim picks legend over chips; so will humans.

**RIDE AGAIN / CASH OUT is a real decision, but the math is lopsided.**
- CASH OUT banks `pot + chips × 10`; a bust banks only half the pot and **loses the chips × 10**.
- **Live, MIDAS after loop 1:** CASH OUT = 1,500 + 3,460 (346 chips) = **4,960**. RIDE risks 4,210 for +3,000. Loop 2 (the Mirror, 43% lost) clears ~50% of the time, so **cashing out is right almost every time for a chip-rich build**.
  - The endless mode we built shuts itself for exactly the machine that's meant to like it.
- **Without chips:** ride is +EV while p(clear next loop) > L/(L+4). That's 20% at loop 1 and 50% at loop 4. That part is good push-your-luck.
- The sim always rides, so this decision is **unmeasured**.
- **Text:** the RIDE card says "BUST AND YOU BANK ONLY HALF THE POT" but doesn't say the chips × 10 are lost too.

**Softlocks:** none found. I tried:
- edges exhausted (the queue skips the pick);
- CASH OUT → over;
- bust → over;
- repeated card clicks during the choice transition.

One silent-reward bug: see B7.

### A4. Is the Dealer a finale? Not yet.
**`expert5_dealer.ts 200`: what actually kills you**

| machine | lost | killing turn ALL IN | RAISE | quiet | your own spin (marks) | quiet share of all Dealer damage |
|---|---|---|---|---|---|---|
| KNIGHT | 47% | 15% | 22% | 37% | 26% | 49% |
| TESLA | 37% | 16% | 32% | 42% | 11% | 50% |
| BRIAR | 58% | 19% | 9% | 44% | 28% | 49% |
| JAX | 48% | 13% | 16% | **52%** | 19% | 54% |
| MIDAS | 43% | 12% | 24% | 36% | 27% | 51% |

- **Telegraphed killing blows** (ALL IN + RAISE): 25–48%. The gate only counts ALL IN (12–19%), so it undercounts. But even counted properly, **half of all Dealer damage comes from un-announced turns.**
- **ALL IN is soaked.** `expert4_dealer`: ALL IN HP damage p50 15–24%, with 2–3 ALL INs per fight (MIDAS p90 **9**).
  - Live JAX: **4 of 4 ALL INs did 0 HP damage** ("ALL IN! BLOCKED"), against shields of 234–1,404.
  - The 30% floor applies to the *attack*, not to the HP. Shields eat the floor.
- The props are right: the red card backs read at a glance (E8 works), and the deal box and "UP TO N" work. **But the climax is a notice that usually bounces.**
- **Length:** MIDAS Dealer p50 48 turns, p90 **111**; BRIAR 44/68. KNIGHT is 17/30.

### A5. Other E-items
| Change | Verdict |
|---|---|
| E2 endless text | **Mostly works.** LOOP N headings and the boss names are right. The LET IT RIDE font is still smaller (B3). |
| E3 endless bust screen | **Readable now.** But **KILLED BY is gone** (B1), and "LOOP 1: 1 FIGHTS" (B4). |
| E4 thaw immunity | Not re-measured in depth. Frost Imp fights in my runs were normal length (9–17 turns). |
| E5 marks cap / edges / rules text | No duplicate edges; carried marks looked capped. |
| E7 Dealer quiet cap | The cap is in, but quiet turns still carry half the damage (A4). |
| E8 red card backs | **Works.** Clearly distinct from the Dealer's white card symbols. |

---

## B. Bugs (with steps)

1. **The endless bust screen lost KILLED BY** (S).
   - **Steps:** JAX GREEN seed 4242. Force to a Dealer win, LET IT RIDE, pick MARKED DECK, and lose loop 1 fight 1.
   - **What you see:** there's no KILLED BY line, although `record.hurt` holds `COPYCAT 150, SPIN HITS 50, THE SHARP'S MARK 20`.
2. **MARKED DECK marks are credited to "THE SHARP'S MARK"** in the death recap, even in a Mimic fight (S). Credit them as "MARKED DECK" (the House edge).
3. **The LET IT RIDE button font is still smaller than CASH OUT and MENU**, and **the "YOUR WIN IS BANKED…" subline is hidden behind the buttons**: only fragments show at y≈462 above the button row (S).
   - **Steps:** win the Dealer and look at "THE DEALER FOLDS!".
4. **Endless summary rows** (S):
   - "LOOP 1: 1 FIGHTS" should be "1 FIGHT";
   - the summary rows count only fights *not* in the last-3 list ("ACT 3: 4 FIGHTS"), which reads as wrong. Say "ACT 3 (6 FIGHTS)" and let the last 3 overlap, or label them "…AND".
   - The "+1 ROCKS" note under ELITE BOMBER overlaps the HP column.
5. **The House pot always glows at max tier** (S). `game.ts drawPot`: `tier = pot >= 12 ? 3 : pot >= 6 ? 2`. These are pre-×10 numbers, and POT.seed is 80. So the "pot grows and glows" escalation is dead from turn 1.
   - **Fix:** `12 * UNIT` / `6 * UNIT`.
6. **The House rules line under the pot box is clipped by the bottom button row** (S). "NEXT SKIM 50" shows, but the line below it sits behind NEW RUN.
7. **An edge card promising "PICK A LEGENDARY RELIC" pays +8 chips silently** once no legendaries fit (`takeChoice` falls back). The same goes for "PICK A RELIC" (S).
   - **Fix:** build the card text from what's actually available, or swap in another edge.
8. **ALL IN! BLOCKED floating text** spills out of the machine frame over the YOUR REELS panel. "VAULT X1.25!" overlaps the hero panel's bottom border (S).
9. **Minor:**
   - "+1 CHIPS" should be "+1 CHIP";
   - the ALL IN caption "ITS NEXT ATTACK IS ITS WHOLE HAND" needs the apostrophe (or a rewording: "ITS NEXT HIT IS ALL IT HAS");
   - the Dealer panel says "THE DEAL NEXT!" while the deal box says "DEALS NEXT TURN!" (say it once);
   - the edge screen uses the LUCKY CLOVER sprite for "PICK A RELIC", which reads as the clover relic;
   - the relic **KING'S VAULT** and the meter **THE VAULT** share a name on the same machine. Rename the relic (e.g. KING'S TOUCH).
10. **Balance bug:** MIDAS has no `ENDLESS.hpBy` / `dmgBy` entry, so endless uses the untuned default (S).

---

## C. What feels off now (prioritized)

### C1. "Something is missing": the regular fights have no stakes, so there's nothing to watch
The owner's worry is right, and the numbers name it:
- **zero-damage-taken fights:** 30% in act 1, **49%** in act 2, **52%** in act 3;
- **HP lost p50:** act 2 1.4%, act 3 **0%**;
- **regular loop fights:** HP lost p50 **0%**;
- chips pile up with nothing to buy (greedy holds 73 at the Dealer, MIDAS 300).

**So 2 of every 3 fights are a foregone win**, and the between-fight choices stop mattering after the House. In a watch-only game, **the watch has to have a question in it**: "will this land in time?" Balatro gets that from the blind's score target, and slot machines get it from anticipation (2 of 3 reels lit, the third still spinning).

Today every question lives in 3 boss fights, and the rest is waiting. (MIDAS's slow act 1, 22 turns per fight, makes it more obvious.)

**The missing piece: SIDE BETS.** It's a between-fight decision that puts a question into every fight. It's also a chip sink, and it fits the casino theme.
- **Before each regular fight, the Cashier's table offers 2 side bets.** You may place 1 by staking chips (5 / 10 / 20).
  - Examples: **"QUICK HANDS: win in ≤ N turns"**, **"CLEAN: win without losing 25% HP"**, **"JACKPOT: land 2 jackpots"**, **"HIGH CARD: one spin of 100+"**.
  - N is sized from the fight's measured length (the p40 turn), so it's a real coin flip.
  - **Pay:** ×2 to ×3 by difficulty.
- **During the fight, a small bet tracker** sits under the VS: "BET: WIN BY TURN 8 · 5 LEFT". It lights up and ticks down, then "BET WON +20" or "BUSTED".
  - Nothing to click. Fights stay watch-only; the tracker is information, like the ALL IN telegraph.
- **Why it's the missing thing:**
  - every foregone fight gets a live question, and the question is one *you* chose;
  - it's a real chip sink, which fixes the chip balloon in the main run and in endless;
  - it gives MIDAS its tension for free: **chips on the table can't fill the vault.**
- **No decision hints:** the bet shows its condition and payout (that's the bet itself), with no odds.

### C2. The economy is solved, and MIDAS makes it visible (A1, A2)
- **Chips flow in faster than the shop can take them.** Shelves are 4 items, one visit per gap.
- **MIDAS's vault reads chips without spending them.** Hold 40 and you have both.
- **Direction:** keep "hoard vs spend" but make the vault *consume*:
  - the vault pre-fill is free, as today;
  - **each payoff costs 2 chips** ("CASH IN"), paid from chips held;
  - the multiplier is ×(1 + chips/25), capped ×3 at 50;
  - the payoff heal drops to 1 UNIT on MIDAS.

  Hoarding now fuels a meter that burns the hoard, while spending buys permanent power. With side bets (C1) there's a third mouth. The gate stays pure hoard vs pure spend ≤ 3 points, **and bank-N within 5 of both**.
- **Stop sizing bosses off chips held** (drop `chipsHeld` from `machinePower`, or cap it at 20). The punishment has to be one the player can see.

### C3. The Dealer climax bounces off shields (A4)
- **ALL IN should pierce shields.** "ALL IN: SHIELDS DON'T COUNT" is the most casino-readable rule you can print on the deal box, and it makes the telegraph something you *fear*, not note.
  - Keep the 30% floor and 55% cap on HP.
- **Pair it with fewer ALL INs:** at most 1 every 4 enemy turns, and never 2 in a row. That keeps it an event (MIDAS sees up to 9 today).
- **Lower the quiet cap from 35% to 25%.** The Dealer's announced turns should carry most of the damage.
- **"THE FINAL HAND":** when the Dealer drops under 33% HP, its next deals are fixed and shown as a 3-card row (RAISE → RAISE → ALL IN). That's a visible countdown to the climax, one per fight.
- **Re-tune BOSS_MUL.dealer** to 45–55%.
- **Gate:** telegraphed killing blows (ALL IN + RAISE) ≥ 60%; quiet share of damage ≤ 30%; Dealer p90 ≤ 60 turns for every machine.

### C4. MIDAS's shape is backwards: fragile opener, immortal House (A2)
- The first two fights kill 20% of MIDAS runs (5.3% + 14.5%); the House kills 0.3%.
- **Fixes:**
  - start MIDAS at **16 chips** (vault half-full: an economy machine should open with money);
  - make the resting level after a payoff **half the pre-fill**, not all of it;
  - the vault multiplies your **best** paying group (swords before shields);
  - **the House is a casino: vs MIDAS each cash-out also skims 2 chips held** (a "+2" floats from your chip counter into the pot). That's a readable counter that shrinks the vault mid-fight.
  - Then re-tune BOSS_MUL.midas.

### C5. Endless: the Mirror is the new wall, and the Houses are free and long
- **L2 Mirror** lost 43%. The **L1/L4 House** lost 0–2.4%, at 19–37 turns.
- **Fixes:**
  - **House loop boss:** HP share 4 → **2.5**, and the pot seed and skim × dmgMul × 1.5. A short, dangerous race instead of a slow free win.
  - **Mirror loop boss:** HP share 5 → **4**.
  - **Gate:** every loop boss lost 15–40%, and p90 ≤ 40 turns.
- **Re-tier the edges by measured cost:**

  | edge | new reward tier |
  |---|---|
  | MARKED DECK | legend |
  | HOUSE CUT | relic |
  | FAST HANDS | chips |
  | NO COMPS | chips, **or** make it "a new loop doesn't heal" |
  | HIGH ROLLERS | legend (unchanged) |
  | GLASS JAW | chips (unchanged) |

  Re-gate with `expert4_endless.ts 150 <edge>`: each paid edge costs 0.25–0.6 loops per tier step.
- **RIDE math:** a bust keeps the chips × 10, and only the pot is at risk. Otherwise chip-rich builds should always cash out after loop 1.
  - Add a sim policy that cashes out when p(clear) < L/(L+4), so the decision gets measured.

---

## D. Readiness call: new slot machines (beyond the 5)

**NO.**

**Why:**
1. **MIDAS, the test for "does the tuning matrix survive a 5th column", fails it today:**
   - House 99.6% with HP irrelevant;
   - opener deaths 5.3% / 14.5%;
   - hoard vs spend 22 points apart;
   - no endless growth entry;
   - Dealer p90 111 turns.

   A 6th machine now doubles that debt.
2. **The Dealer finale is still open** (C3), and every new machine needs its own Dealer tuning against a target that's about to move.
3. **The biggest gap isn't breadth, it's stakes** (C1). A new machine adds a new way to win fights that are already foregone. Side bets make every existing machine's fights worth watching.

**Revisit when:**
- MIDAS passes: hoard vs spend ≤ 3, House 80–92%, fight 1–2 deaths ≤ 3%, endless p50 ≥ 2;
- the Dealer gate in C3 passes;
- side bets (or an equivalent) take act 2–3 zero-damage fights below 35%.

---

## E. Prioritized change list (small, high-impact first)

| # | Change | Effort | Expected impact |
|---|---|---|---|
| E1 | **Text and visual fixes:** KILLED BY on the endless bust (B1); MARKED DECK recap credit (B2); LET IT RIDE font and the hidden subline (B3); "1 FIGHT", summary-row wording, the "+1 ROCKS" overlap (B4); **pot glow thresholds × UNIT** (B5); the House rules line clipped (B6); float text inside the frame (B8); B9 nits | S | Every screen players screenshot reads right; the House pot escalates visibly again |
| E2 | **Edge cards tell the truth** (B7): build the reward text from what's available | S | No silent reward swaps |
| E3 | **Vault hits your best paying group** (swords first, never a lone shield) | S | Vault payoffs always land where you can see them |
| E4 | **MIDAS opener:** start with 16 chips; the resting level after a payoff = half the pre-fill; payoff heal 3 → 1 UNIT | S | Fight 1–2 deaths 20% → ≤ 5%; the House stops being a regen engine (my live House healed 393) |
| E5 | **The House skims chips from MIDAS** (2 per cash-out, shown flying into the pot); re-tune BOSS_MUL.midas (target House 80–92%) | S | The House becomes MIDAS's natural rival, not a 99.6% bye |
| E6 | **ALL IN pierces shields**; at most 1 ALL IN per 4 enemy turns; quiet cap 35% → 25%; re-tune BOSS_MUL.dealer; the gate counts RAISE as telegraphed | S | ALL IN HP damage p50 15–24% → ~35%; telegraphed killing blows 25–48% → 60%+; the Dealer's big moments are the announced ones |
| E7 | **Endless re-tier and bosses:** edge tiers by measured cost (C5); loop House HP share 4 → 2.5 with pot × 1.5; Mirror 5 → 4; add `hpBy`/`dmgBy` for MIDAS; a bust keeps chips × 10 | S | Every edge becomes a price, not a freebie; the House becomes a race; the Mirror stops being the wall; RIDE stays a decision for chip-rich builds |
| E8 | **Stop sizing bosses from chips held** (drop or cap `chipsHeld` in `machinePower`) | S | Removes the invisible hoarding punishment (pure-hoard Dealer 5.7%) |
| E9 | **MIDAS vault as a chip SPEND:** each payoff costs 2 chips; mul 1 + chips/25, cap ×3; gate hoard vs spend ≤ 3 and bank-N within 5 (`expert5_midas.ts`) | M | Turns "keep 40" into a real running tradeoff |
| E10 | **THE FINAL HAND:** under 33% HP the Dealer shows a fixed RAISE → RAISE → ALL IN row | M | A readable countdown finale, once per fight |
| E11 | **SIDE BETS** (C1): 2 offered before each regular fight, stake 5/10/20 chips, a watch-only in-fight tracker, pay ×2–3. Start with 4 bets. Gate: acts 2–3 zero-damage fights still fine, but ≥ 60% of fights carry a live bet in the sim policy; bet win rate 40–60% | M–L | **The "something missing":** a question in every fight you chose, a chip sink, and a third mouth for MIDAS |
| E12 | **Sim policy for CASH OUT** (cash when p(clear) < L/(L+4)) so the endless decision is measured | S | We stop tuning endless blind on an always-ride policy |

**Suggested batches:**
1. **E1–E3** (all S, no balance).
2. **E4 + E5 + E8** (MIDAS shape). Gate with `tuesday.ts`, `expert5_opener.ts` and `expert5_midas.ts`.
3. **E6** (the Dealer). Gate with `expert5_dealer.ts`, `expert4_dealer.ts` and `tuesday.ts`.
4. **E7 + E12** (endless). Gate with `endless.ts` and `expert4_endless.ts <edge>`.
5. **E9, then E10.**
6. **E11 side bets:** it's the big one. Prototype with 2 bets first, and playtest the feel of the tracker before adding more.

**Tests:** not run (a playtest-only session). No `src/` changes. New throwaway harnesses: `tools/balance/expert5_midas.ts`, `expert5_dealer.ts`, `expert5_opener.ts`. Their outputs are in `tools/out/exp5_*.txt`.
