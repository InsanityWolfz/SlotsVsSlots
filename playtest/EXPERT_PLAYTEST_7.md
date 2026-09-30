# Expert playtest 7 (2026-09-30): after EXPERT_PLAYTEST_6 E1–E11 (iterations 47–53)

Build: the frozen build on :4173 (HEAD 28d80cc), plus headless sims. No `src/` edits. (Written incrementally.)

## Official table (`tuesday.ts 600`, `tools/out/exp7_tuesday.txt`; the sim doesn't bet)

| | WHITE | act1 | House | Mirror | GREEN | reachD | Dealer | a3 regular die / lost / turns |
|---|---|---|---|---|---|---|---|---|
| KNIGHT | 44.5 | 83.0 | 86.5 | 61.2 | 17.3 | 37.5 | 46.2 | 4.3 / 16.9 / 8.3 |
| TESLA | 44.5 | 79.8 | 84.8 | 74.6 | 16.7 | 32.0 | 52.1 | 6.8 / 10.4 / 11.8 |
| BRIAR | 48.2 | 83.3 | 85.2 | 59.5 | 18.7 | 40.2 | 46.5 | 6.8 / 15.2 / 15.1 |
| JAX | 41.2 | 78.3 | 95.1 | 62.8 | 16.2 | 31.7 | 51.1 | 6.9 / 12.5 / 10.3 |
| MIDAS | 37.5 | 74.7 | 83.4 | 62.5 | 13.0 | 26.8 | 48.4 | 7.9 / 15.5 / 11.4 |
| **avg** | **43.2** | | | | **16.4** | | **48.9** | |

Matches iteration 51/53 (WHITE 42.6–43.2, GREEN 16.1–16.4, Dealer 48.7–48.9). Big choices: CLEAN CUT is still the
weakest taken choice (31% win vs 36–41% for the others), SWEEP UP is almost never taken (43 of 6000).

## How I tested
- **Headless** (outputs `tools/out/exp7_*.txt`): `tuesday.ts 600`, `expert6_bets.ts 150 2`, `dealer_bets.ts 300`,
  `expert6_final.ts 250`, `expert5_dealer.ts 200`, `expert4_endless.ts 150 none`, `endless.ts 300`.
- **New throwaway harnesses:**
  - `tools/balance/expert7_relics.ts N policy` (env RELICS, STAKE): betting policies with bet relics injected at
    the first fight, paired against the same relics with no bets. GREEN, seed 777, N 300 per machine. It also counts
    the bet that's still on the table when a lost fight ends the run (the records drop it).
  - `tools/balance/expert7_deaths.ts N`: where runs die, by fight and enemy.
- **Browser** (:4173, JS-driven through the screens' own callbacks and `dbg.tick`, since the pane doesn't paint on
  its own):
  - KNIGHT GREEN seed 7070, act 1 for real with bets: 4 bets, 4 won, with 114 chips by act 1 fight 4 (I never
    shopped). Then forced wins to the Dealer: 272 chips, no Dealer table. I lost at the Dealer (70% HP left), and
    FINAL HAND never fired.
  - A `dbg.vs('dealer')` sandbox to see the deal box, RAISE and ALL IN.

## 1. The bet economy now

**The choice between the two offered bets is still flat** (`expert6_bets.ts 150`, stake 2, return per chip on
2-bet tables):

| policy | return |
|---|---|
| always the first bet | 106.2% |
| ×3 whenever offered | 106.1% |
| prefer QUICK / CLEAN / HIGH ROLLER / BIG HIT | 106.4 / 107.1 / 105.4 / 106.4% |
| oracle (whichever came in) | 148.8% |

- E2 worked: ×3 lines win 36.2% and return 108.5%; ×2 lines win 53.2% and return 106.3%. "Take the ×3" is no
  longer a rule.
- But every policy lands within 2 points, so **which bet you take is still flavor**. The line is fitted to your
  exact build, and nothing you know beats the rehearsal.
- Tension is still excellent: 73% of bets are live into the fight's last 2 spins (BIG HIT 81%, CLEAN 65%). A
  table appears at 99.4% of regular fights.

**What the stake choice is now (E4 + E5):** it's real.
- "CHIPS 8 - INTEREST +1" updating to "CHIPS 0 - INTEREST +0" as you press ALL IN reads well. It's the Balatro
  tension, visible.
- Chips at the table p50 are 7–9, so the interest cost bites in most tables.
- **The hole:** interest caps at +3 at 15 chips. Past ~20 chips, a stake has zero interest cost, and ALL IN (20)
  is free of interest from 35 chips.

**HOT HAND** (E7): the streak changes the variance, not the value. Every hot line still returns ~110%, and the
bolder lines are **forced**: after 2 wins, both offered bets are ×4 long shots (seen: "CLEAN HANDS: WIN, LOSING
130 HP OR LESS, PAYS X4" and "QUICK HANDS: WIN BY ROUND 6, PAYS X4").
- The player gets no choice to press or to cool off. The streak *is* the choice-maker.
- The "HOT HAND: 2 WON IN A ROW" line is 1.5-scale pink text at y 712, squeezed under the CHIPS line at the
  screen's bottom edge. I missed it in the screenshot until I zoomed in. There's no flame and no card change.
- It's a nice idea with no payoff you can feel. It works well once, though: in my run, ALL IN 20 at ×4 took me
  from 46 to 114 chips in act 1.

**The Dealer's table (E8):** `dealer_bets.ts 300`, GREEN, stake 5.

| machine | FOLD HIM EARLY offered / return | TAKE THE HIT offered / return |
|---|---|---|
| KNIGHT | 25% / 105% | 76% / 85% |
| TESLA | **0%** | 86% / 103% |
| BRIAR | 11% / 39% (small n) | 79% / 119% |
| JAX | **0%** | **33%** / 116% |
| MIDAS | 63% / 85% | 86% / 101% |

- **The Dealer's table is often empty** (JAX 67% of Dealer fights, and 0% FOLD for TESLA and JAX). My weak KNIGHT
  got no table at all.
- **A missing table at the finale is a tell:** "the rehearsals say you almost surely lose (or win)". At the one
  fight where the question matters most, the absence is itself an answer.
- **Chips after the Dealer are worth nothing unless you LET IT RIDE.** `runScore` counts chips only via the endless
  pot. So in a normal won run, the Dealer bet is decoration: a free ALL IN that can't hurt or help. I finished a run
  with 272 unspendable chips, and the RUN OVER screen doesn't show them at all.

**Bet relics (E11): yes, there's a betting build now. And one exploit.**

`expert7_relics.ts 300`, GREEN. "Win" is that machine's GREEN win rate, with the same relics and no bets →
with the policy. Seed 777, so the baselines differ from tuesday.ts; compare within a row only (±2.5 pts noise).

| relics / policy | KNIGHT | TESLA | BRIAR | JAX | MIDAS | return |
|---|---|---|---|---|---|---|
| none / ALL IN always | 11.7→12.3 | 10.3→10.7 | 17.3→14.7 | 18.0→15.0 | 11.7→**5.3** | 102–112% |
| none / 5 if 10 kept | 11.7→12.7 | 10.3→10.3 | 17.3→17.0 | 18.0→14.0 | 11.7→12.7 | 114–146% (rare bets) |
| HIGH LIMIT / ALL IN | 11.7→8.3 | 12.0→11.3 | 19.3→12.7 | 18.0→16.0 | 12.0→5.3 | 106–114% |
| LOADED DICE / ALL IN | 11.7→**19.0** | 12.0→16.7 | 19.3→23.0 | 18.0→19.3 | 12.0→8.0 | 121–138% |
| MARKER / flat 5 | 11.7→12.3 | 12.0→11.3 | 19.3→16.7 | 18.0→19.3 | 12.0→11.3 | 126–137% |
| **MARKER / ALL IN until this act's first bust, then 2** | 11.7→**21.7** | 12.0→16.7 | 19.3→**27.7** | 18.0→23.0 | 12.0→10.7 | **147–155%** |
| all three / ALL IN | 12.0→21.0 | 11.3→21.3 | 16.7→**34.3** | 17.7→31.7 | 10.7→9.3 | 152–170% (first harness version; that return is inflated by bets on lost fights not being counted, the win rates are valid) |

- **The MARKER exploit.** MARKER refunds the first busted stake each act, whatever its size, so ALL IN is a
  free roll until your first bust in each act. The solved line is: "ALL IN until you bust once this act, then bet
  small". It returns ~150%, with net chips per run p10 of **−2 to −5**, which means almost no downside. It adds
  **+5 to +10 GREEN points** on 4 of 5 machines. MARKER is a *common*. The same relic with a flat 5 stake is ±2:
  the exploit is the uncapped refund. It's also solved play, which is what a bet relic must not create.
- **LOADED DICE** is a genuine build-around (+1 to +7 with ALL IN).
  - It makes low pays better: ×2 → ×2.5 is +25%, but ×4 → ×4.5 is only +12%, and the Dealer's ×1.5 → ×2 is +33%.
  - With LOADED, the ×2 line beats the HOT HAND ×4 line (137% vs 124%). That's the only real "which bet" pressure in
    the game today, and it's invisible.
- **HIGH LIMIT alone is a trap:** −1 to −7. Doubled stakes only double the variance, and the 40 ALL IN cap needs
  40+ chips. It's fine as an amplifier in a LOADED or MARKER build, a dead pick otherwise. That's acceptable for an
  uncommon, but its card should say what it's for.
- **The stack is too strong:** all three push BRIAR from 16.7 to 34.3 and JAX to 31.7. Bet relics only appear after
  your first bet, and the betting player is exactly the one who stacks them.
- **No other exploit found.**
  - The rehearsal seed is fixed per fight, and the real fight is freshly seeded.
  - Re-picking a bet refunds cleanly (`clearBet`), and the offer key includes the streak, so there's no reroll.
  - The stake counts toward the boss chip shield only at the Dealer, which is intended.

## 2. FINAL HAND v2: does it land?

`expert6_final.ts 250` (GREEN greedy, Dealer fights only; `exp7_final.txt`):

| machine | Dealer lost | FH fired | HP when fired p10/p50/p90 | row reached ALL IN | final ALL IN landed | wins before the final ALL IN | losses before FH | turns after FH p50 |
|---|---|---|---|---|---|---|---|---|
| KNIGHT | 59% | 72% | 11/31/39% | 66% | 58% | 49% | 38% | 5 |
| TESLA | 56% | 73% | 19/35/40% | **95%** | 86% | 18% | 48% | **12** |
| BRIAR | 64% | 70% | 21/37/40% | 91% | 84% | 16% | 41% | 11 |
| JAX | 50% | 71% | 27/36/39% | 93% | 81% | 15% | **59%** | 10 |
| MIDAS | 44% | **55%** | **0**/31/39% | 71% | 56% | 46% | **63%** | 10 |

(The "Dealer lost" column is this harness's own sample: n 62–99 per machine.)

**Killing blow by type** (FH = during or after FINAL HAND):

| machine | telegraphed (RAISE + ALL IN) | of which FH ALL IN | quiet turns | your own spin |
|---|---|---|---|---|
| KNIGHT | 40% | 19% | 29% | 31% |
| TESLA | 32% | 7% | **55%** | 14% |
| BRIAR | **56%** | 24% | 26% | 19% |
| JAX | 32% | 15% | 42% | 26% |
| MIDAS | 37% | 4% | 37% | 26% |

**Verdict: the row now arrives, but the finale doesn't end on it.**
- E3 hit its main gate: the row reaches its ALL IN in 66–95% of fired hands (was 4–51%). FH fires in 70–73% of
  Dealer fights, except MIDAS at 55%: a vault payout jumps from 45% to dead (p10 at 0%).
- **The fight goes on after the climax.** The row takes 2 enemy turns, then the Dealer returns to his old pace for
  a median of **10–12 more turns** (TESLA, BRIAR, JAX, MIDAS). The announced ALL IN fires, you survive it, and the
  fight settles back into the mid-fight rhythm. That tail is where TESLA's 55% quiet-turn deaths come from (23 of the
  55 points are "FH-quiet"). The finale peaks, then idles.
- **Half the Dealer losses never see FINAL HAND:** 38–63% (JAX 59%, MIDAS 63%). The Dealer's HP at your death is
  p50 29–56%. For those players, the finale is "a long boss fight that wore me down", not the card show.
- The telegraphed share is 32–56%, still under EP5's ≥60% gate on 4 of 5 machines.
- **Fix: make FINAL HAND a phase, not a row.**
  - Once it fires, the Dealer deals every enemy turn until the fight ends, cycling RAISE → ALL IN → RAISE → ALL IN.
  - Each ALL IN in the phase is one step weaker (×0.8, ×0.64 …) so it can't just be a death timer.
  - The fight then ends on the Dealer's terms or yours within a few turns.
  - Gate: turns after FH p50 ≤ 5; the telegraphed killing-blow share ≥ 55% on every machine; the Dealer's win
    rate stays 45–52.
  - To fight the "never saw it" losses, trigger at 50% on MIDAS/JAX only if the phase change isn't enough.

**Screens (sandbox):**
- The RAISE banner ("RAISE! / ITS NEXT HIT AND YOUR NEXT JACKPOT PAY X2") covers **both** HP panels for its whole
  duration. At the climax, the two numbers you care about are hidden.
- The deal box says "ITS NEXT HIT X2 / YOUR NEXT WIN X2" for the same card: JACKPOT vs WIN. Pick one word.
- The deal box keeps a "RAISED!" tag above "DEALS NEXT TURN! ALL IN" after the RAISE resolves. Meanwhile the Dealer
  panel reads "THE DEAL IN 2" while the box reads "DEALS NEXT TURN!", which I also saw on round 4. That may be the
  playback running behind the engine, but it's what the player sees: two countdowns that disagree.

## 3. Balance and feel after the benchmark move

**Where runs die** (`expert7_deaths.ts 300`, 1,500 runs per stake, % of all runs):

| | act-1 fights 1–5 | House | act-2 fights | Mirror | act-3 fights | Dealer |
|---|---|---|---|---|---|---|
| WHITE | 6.9 | **13.1** | 13.2 | **24.1** | – | – |
| GREEN | 6.7 | 15.6 | 13.2 | 17.1 | 11.4 | **18.3** |

- E10's goal is met, barely: the GREEN Dealer (18.3) > Mirror (17.1) > House (15.6).
  - But three near-equal walls aren't a peak. Per attempt, the Dealer beats you ~51% of the time (18.3 of 36.0 reaching him), the Mirror ~27% and the House ~17%.
  - The Dealer *is* the hardest fight per attempt, which is right.
- **Regular fights are filler.** No regular fight kills more than 4.8% of runs, and most kill 0.5–3%.
  - The biggest regular killers are the Mimic (4.1% WHITE), the Card Sharp (3.9% GREEN) and the Hexer (3.7%).
  - Each act's first fight is a small spike (a2.0 3.7–4.8%).
  - Side bets are what's carrying mid-act tension now, and they carry it well. But the fights themselves are
    "watch a win" 15 times a run.
- **Early game:** act 1 clears 75–83%. The House kills 13–16% of all runs, the first boss wall.
  - It's slightly harsh for a first-run player. For a Balatro-literate player, a ~1-in-7 act-1 boss loss is right.
  - Leave it.
- **Per machine:**
  - **MIDAS is the laggard again** (WHITE 37.5, GREEN 13.0, reachD 26.8).
    - It's also the machine most punished by betting (ALL IN −6.4, HIGH LIMIT −6.7), because staked chips don't
      fill the vault.
    - The ECONOMY machine is the worst bettor. That's backwards thematically.
    - Fix: side-bet payouts count as vault income ("the house pays in gold"). It's a +2–3 pt nudge and the right
      flavor.
  - **TESLA's WHITE Mirror is 74.6%** vs 60–63% for everyone else. It's still an outlier, but tolerable.
  - **JAX's House is 95.1%:** JAX's jackpots steal the pot, so it's a bye. Its reachD 31.7 is carried by the act 2–3
    walls.
  - **BRIAR** is the best at every column (WHITE 48.2, GREEN 18.7). It's the easiest machine, so it should be the
    one you unlock first. It is.
  - **KNIGHT** has the lowest hpInD (64%): KNIGHT arrives at the Dealer beaten up, and dies to its own marks (31%
    own-spin killing blows).
- **Big choices:**
  - CLEAN CUT is still a trap: 31% win when taken vs 36–41% for the rest, 1,373 takes.
  - SWEEP UP is almost never offered or taken (43 of ~6,000).

## 4. Endless after E9

`expert4_endless.ts 150 none` (`exp7_endless_none.txt`); `endless.ts 300`:

| loop fight | lost | turns p50/p90 | HP lost p50/p90 |
|---|---|---|---|
| L1 House | **0.8%** | 11/27 | 0/45% |
| L1 regular | 1.4% | 7/19 | 0/34% |
| L2 Mirror | 24.8% | 19/40 | 23/98% |
| L3 Dealer | 19.5% (LAST CALL 19.5%) | 30/59 | 15/98% |
| L4 House | 5.4% | 12/31 | 0/20% |

- Loops cleared p50/p90: KNIGHT 1/2, TESLA 2/4, BRIAR 2/4, JAX 2/4, MIDAS 1/2. Max 4.
- **The House race:** it now costs HP (p90 45%, was 0%), but it still kills 0.8%. It's a toll, not a threat, and
  I agree with iteration 50 that the 10–20% gate isn't worth breaking the one-turn cap. Accept it: the loop House is
  the breather before the loop-2 Mirror.
- **RIDE vs CASH OUT is still "always ride", by the numbers.** The pot goes 1500 → 3750 → 7125 → 12187, a bust
  banks a third, and chips are safe either way. Break-even clear odds:

  | decision | break-even | real loop clear |
  |---|---|---|
  | L0 → L1 | 31% | ~93% |
  | L1 → L2 | 43% | ~71% (the Mirror plus 5 fights) |
  | L2 → L3 | 48% | ~76% |

  The card tells you both numbers ("THE POT GROWS TO 7125" / "BUST AND YOU BANK A THIRD: 1250"), which is good. But
  the loop's boss isn't named on the card, and neither is your HP going in, and those two are the only inputs that
  flip the answer. The decision is right to be mostly "ride". It only needs to bite at low HP.
  - Fix: name the loop boss and your HP on the RIDE card ("LOOP 2: THE MIRROR. YOU: 212/640 HP"). That's a rule
    readout, not an EV hint.
- **Endless bets are the best version of bets.** Chips are ×10 points at cash-out, and stakes cap at 50. That's
  where a betting build has a real score payoff.

## 5. Bugs and UX

1. **The harness undercounts lost bets (tooling, not the game).** `finishFight` returns early on a lost fight, so
   the bet that was on the table stays in `run.bet` and never reaches `run.records`.
   - `bets.ts` only reads records, so its returns are inflated. My same-policy runs: ALL IN 115.0 → 111.7%
     (KNIGHT), 108.9 → 103.6% (TESLA), 110.8 → 102.2% (MIDAS) once the run-ending bet is counted.
   - The iteration 49/53 return figures are 3–9 points high. `expert7_relics.ts` shows the fix.
2. **RAISE / ALL IN banners cover both HP panels** at the Dealer, the whole time they show.
3. **One card, two wordings:** the RAISE banner says "YOUR NEXT JACKPOT PAY X2", the deal box says "YOUR NEXT WIN X2".
4. **Deal box state:** "RAISED!" stays above "DEALS NEXT TURN! ALL IN". The Dealer panel's "THE DEAL IN 2" disagrees
   with the box's "DEALS NEXT TURN!" (possibly playback lag; either way, the player sees it).
5. **HOT HAND is nearly invisible:** 1.5-scale text at the bottom edge, no flame, and the ×3/×4 pay line is the same
   pink as a normal ×3.
6. **The Dealer's table is missing** in 14–67% of Dealer fights by machine, which leaks "you're doomed" or
   "you've got this" at the finale.
7. **RUN OVER doesn't show chips or bets:** my 272 chips and 4-for-4 bets appear nowhere. The recap row per fight
   could show "BET +8" or "BUST -5".
8. **The in-fight tracker's header** ("BET 8: HIGH ROLLER") is small, dim text over the VS column. The result line
   under it ("WON +8") is fine.
9. Not bugs, confirmed OK: net payouts ("SIDE BET WON: +8 CHIPS"), "WIN BY ROUND N", the red picked stake with "ALL
   8", and "YOUR BET: 8" on the card are all readable. No softlocks in bets, the fork, the Dealer or the run over.

## 6. What's the next most valuable thing (not the held ideas)

Ranked by value for effort, for a public playtest:

1. **Finish the finale (S, this week):** FINAL HAND as a phase, the Dealer table always present, and the chips you
   end with count in the score. The Dealer is the game's signature moment, and right now it idles after the climax
   for half its players.
2. **A daily seed + a run-history screen (M):**
   - The biggest replay hook per line of code. Balatro, Slay the Spire and Luck be a Landlord all lean on it for
     community ("today's seed was brutal").
   - Everything is seeded already. The daily makes real fights deterministic from the day's seed, so allow one
     attempt per day, or bets become learnable.
   - A run-history screen (the RUN OVER table, kept) gives players a place to see their bets, killers and builds.
     `profile.runs` already stores most of it.
3. **Mid-act enemies that write on your machine with teeth (M–L):** regular fights kill 0.5–4.8% each.
   - One gatekeeper elite per act at fight 3 that writes something persistent is where the game's unique hook
     (enemies write on your reels) should live between bosses. Ideas: the Mimic eats a charm cell for the act; a
     Forger swaps your signature symbol.
   - Gate: that fight kills 5–8%.
4. **Boss variety (L):** a second act-2 boss in rotation with the Mirror. The Mirror is the run-killer on WHITE
   (24.1% of runs), and seeing it every run makes act 2 predictable.
5. **New charms (M):** lowest priority. The charm set is healthy, but CLEAN CUT (a big choice) is a trap and SWEEP
   UP never shows. Fix those before adding.
6. **Meta-progression beyond unlocks (L):** skip for now. Stakes plus machine unlocks are enough for a playtest.

## 7. Prioritized change list (small, high-impact first)

| # | Change | Why | Gate |
|---|---|---|---|
| E1 | **MARKER refunds at most your top fixed stake** (5, or 10 with HIGH LIMIT), not the whole ALL IN. Card: "YOUR FIRST BUST EACH ACT: UP TO 5 CHIPS BACK" | "ALL IN until your first bust" is a solved freeroll: 147–155% return, +5 to +10 GREEN on a common | `expert7_relics.ts 300 marker` with RELICS=marker: return ≤ 125%, GREEN shift ≤ +3 on every machine |
| E2 | **Harness fix:** count `run.bet` on a lost run in `bets.ts` (and any record-only harness); re-log the E4/E7/E11 returns | Returns are 3–9 points high | `bets.ts` returns match `expert7_relics.ts` |
| E3 | **FINAL HAND as a phase:** once it fires, the Dealer deals every turn until the end, RAISE ↔ ALL IN, each later ALL IN ×0.8 | 10–12 quiet turns follow the climax (TESLA 55% quiet killing blows) | `expert6_final.ts 250`: turns after FH p50 ≤ 5; telegraphed killing blows ≥ 55% every machine; Dealer 45–52 in `tuesday.ts 600` |
| E4 | **The Dealer's table is always set:** fill a missing Dealer bet with a regular kind (BIG HIT / QUICK) sized on the 24 rehearsals | Empty in 14–67% of Dealer fights; the absence is a tell | `dealer_bets.ts 300`: a table ≥ 95% of Dealer fights, return 95–115%, GREEN ±2 |
| E5 | **Finale screens:** banners clear the HP panels; one word (JACKPOT or WIN) for RAISE; the deal box drops "RAISED!" when the next card shows, and matches the panel's countdown | The climax hides the HP numbers | Screens only |
| E6 | **HOT HAND you can see and steer:** a flame sprite and "HOT HAND ×4" on the cards at 2-scale; the streak makes only ONE of the two lines bold (the other stays a normal ×2), so you choose to press or to cool off | Today it forces both lines long and is nearly invisible; the choice gives the streak a decision | `expert6_bets.ts 150`: both lines 100–112%; `bets.ts` win rates ±2 |
| E7 | **Safe vs long table:** of the two regular bets, one aims ~0.68 at ×1.5, the other ~0.33 at ×3 (both ~105%) | Makes the bet choice about risk appetite, which relics (LOADED favors safe, MARKER favors long) and chips-vs-interest can tilt: the non-flat choice E6 (Cashier) was meant to create, without moving screens | `expert6_bets.ts`: "safe" and "long" policies both 100–110%; a relic-aware policy beats the blind policy by ≥ 8 points |
| E8 | **Chips count at the end:** a won run's score adds chips ×5; show chips and each fight's bet result on RUN OVER | 272 dead chips; the Dealer bet means nothing unless you ride | Chip term < 25% of a won run's score in the sim; screens |
| E9 | **MIDAS: won side bets pay into the vault** | The ECONOMY machine is the worst bettor (ALL IN −6.4, HIGH LIMIT −6.7) and the laggard (WHITE 37.5, GREEN 13.0) | `expert7_relics.ts 300 allin` CAB=midas: shift within ±3; `tuesday.ts` MIDAS GREEN +1–3 |
| E10 | **RIDE card names the next loop's boss and your HP** ("LOOP 2: THE MIRROR. YOU 212/640") | The only inputs that flip ride vs cash; a readout, not EV | Screens only |
| E11 | **CLEAN CUT buff/rework**, and check why SWEEP UP is almost never offered | 31% win when taken vs 36–41%; SWEEP UP taken 43 times in 6,000 runs | `tuesday.ts 600` big-choice line: every choice 34–42% |
| E12 | **HIGH LIMIT card text** says what it's for ("DOUBLES YOUR STAKES AND WINNINGS") | It's a trap alone (−1 to −7); fine inside a LOADED/MARKER build | Screens only |

**Suggested batches:** E1 + E2 (the exploit and the measuring stick) → E3 + E4 + E5 (the finale) → E6 + E7 (the
table's decision) → E8 + E9 + E10 → E11 + E12. Then the daily seed and run history (section 6, #2).

**Tests:** not run (a playtest-only session). No `src/` edits. New throwaway harnesses:
`tools/balance/expert7_relics.ts`, `tools/balance/expert7_deaths.ts`. Outputs: `tools/out/exp7_*.txt`.
