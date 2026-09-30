# Expert playtest 6 (2026-09-30): after EXPERT_PLAYTEST_5 E6/E7/E10/E11/E12 (iterations 44–46)

Build: the frozen build on :4173 (HEAD f8f6cba), plus headless sims. No `src/` edits.



## Code read: how SIDE BETS work (src/core/bets.ts, run.ts offerBets)
- The table appears on the next-fight screen, **after** the shop and draft: the build is locked when you bet.
- Real fights use a fresh random seed (`game.ts newFight`, `cfg.seed = null`); rehearsals use a seed from
  `run.seed ^ fightNumber`. So the rehearsal can't leak the exact outcome. Runs aren't saved, so no reload-reroll.
- Lines are sized on the **winning** rehearsals of this exact build vs this exact enemy. ×3 is paid only when no
  candidate line sits in [42%, 75%], i.e. the pay tag itself says "this one is harder".

## Official table (`gate.sh 600 exp6`, the sim doesn't bet)

| | WHITE | act1 | House | Mirror | GREEN | Dealer | a3 regular die / lost / turns |
|---|---|---|---|---|---|---|---|
| KNIGHT | 44.5 | 83.0 | 86.5 | 61.2 | 14.0 | 50.3 | 4.0 / 16.1 / 7.9 |
| TESLA | 44.5 | 79.8 | 84.8 | 74.6 | 17.7 | 65.4 | 5.5 / 8.9 / 11.8 |
| BRIAR | 48.2 | 83.3 | 85.2 | 59.5 | 13.2 | 43.4 | 3.8 / 10.6 / 14.5 |
| JAX | 41.2 | 78.3 | 95.1 | 62.8 | 15.3 | 50.8 | 4.1 / 9.7 / 10.0 |
| MIDAS | 37.5 | 74.7 | 83.4 | 62.5 | 13.2 | 54.9 | 7.4 / 15.0 / 11.6 |
| **avg** | **43.2** | | | | **14.7** | **53.0** | |

- Zero-damage-taken fights (sim, no bets): act 1 31.2%, act 2 47.6%, act 3 50.8%. Same as before E11, as expected: bets don't change fights.
- Dealer (expert4_dealer 150): ALL IN HP damage p50 **31–36%** (was 15–24%): E6 works. Turns p50/p90: KNIGHT 18/29, TESLA 35/57, BRIAR 46/66, JAX 32/45, **MIDAS 43/89** (the p90 is still long).
- Outputs: `tools/out/exp6_gate.txt`, `exp6_tuesday.txt`, `exp6_e2.txt`.

## 1. SIDE BETS: the numbers

**`tools/balance/bets.ts 300 <stake>` (GREEN; an always-bettor placing bet #1):**

| stake | bet on % of regular fights | bets won | return |
|---|---|---|---|
| 6 | 54–64% | 53–57% | 110–118% |
| 12 | **8–18%** (can't afford it) | 54–58% | 114–120% |

**`tools/balance/expert6_bets.ts` (new):** for every table, BOTH offered bets are scored on 2 fresh sample fights of
the same config, so I can compare choice policies on identical fights. N=150 runs per machine, GREEN (WHITE within 1-2 points of every number; outputs `exp6_betsplit_*.txt`):

- **Chips at the table p25/p50/p75:** act 1 4/8/9, act 2 4/7/11, act 3 5/9/15. **The 12 stake is out of reach
  in 3 of 4 tables**; 3 is the only stake most players can place freely.
- **The bet choice is flat.** Return per chip staked, 2-bet tables:

  | policy | return |
  |---|---|
  | always the left bet | 109.8% |
  | the ×3 whenever offered | **112.5%** |
  | prefer QUICK / CLEAN / HIGH ROLLER / BIG HIT | 109.0 / 108.7 / 112.0 / 109.4% |
  | oracle (whichever came in) | 154.9% |

  Every policy lands within 4 points. **Which bet you take doesn't matter**; the lines are calibrated to *your*
  exact build by rehearsal, so nothing you know about your machine gives you an edge. The one leak: **×3 lines
  win 43% and return 128%** vs ×2 lines at 54% / 107%. A 5-of-12 rehearsal (41.7%) sits just under `hardBelow` 0.42 and gets ×3. So "take the ×3" is a small solved rule; otherwise pay is flavor.
- **Betting is +EV (~110%) for everyone, every time.** "Always bet what you can spare" is the solved answer.
  The only counter-pressure is invisible: **interest is computed on chips held while the stake is on the table**
  (`finishFight`: interest before the bet is paid back). Holding 10, a 6-chip bet drops interest +2 → +0, a
  larger loss than the bet's +0.6 chip edge. Players can't see that.
- **Tension is real.** Bets are still live into the fight's last 2 spins **73–83%** of the time (QUICK 75%,
  BIG HIT 82%, CLEAN 65%); only 1–10% are decided in the first third. That's exactly what a watch-only fight needs.
- **Zero-damage act 2–3 fights: 99% now have a table**, and the bet is live to the last 2 spins in 97–98% of those.
  C1's goal is met, *if the player has chips to put down*.

## How I played (browser, :4173, driven by `window.dbg` + the screens' own callbacks, synchronous `dbg.tick`)
- **KNIGHT GREEN seed 6161**, played for real with bets (bet the left bet at 6 when affordable, else 3; shop keeps 6).
  10 bets: 7 won, **+27 chips net** over 10 fights. Died at the Mirror.
- **TESLA GREEN seed 9090**, forced to the Dealer, then the Dealer for real: won in 10 rounds.
- **KNIGHT GREEN seed 4711**, forced to the Dealer, then played it for real: **FINAL HAND fired with the Dealer at
  1,198 / 20.7K (6%)**. The row played out RAISE, RAISE, ALL IN and killed me (346 → 0). Recap:
  "KILLED BY THE DEALER: ALL IN 137 · SPIN HITS 135 · THE DEALER'S MARK 74". A genuine, readable climax.
- **JAX GREEN seed 2468**, forced to a Dealer win, LET IT RIDE, HIGH ROLLERS, then endless loops 1–2 for real
  with bets at 12 whenever affordable: cleared the loop-1 House and the loop-2 Mirror; 6 endless bets, 2 won.
- **MIDAS GREEN seed 1357**, act 1 for real with bets: 5 bets, 2 won.

## 1. SIDE BETS: verdict

**What works**
- **The tracker is the best thing added since the charm rework.** In my brute fight (act 2, QUICK HANDS "WIN BY
  YOUR SPIN 8"), "4 SPINS LEFT" with the brute at 685/1570 made me watch every spin; it busted on spin 9, the
  fight still won. The sim agrees: 73–83% of bets are live into the last 2 spins. This is the "question in the
  watch" C1 asked for.
- **No outcome leak.** Rehearsals use other seeds and the real fight is freshly seeded; runs aren't saved, so no
  reload reroll. The only info leaks are soft: no table means "you usually lose this", and "WIN WITHOUT A SCRATCH"
  means "this one is easy". Both are fine (the build is locked when you see them).
- **Offer cost:** `offerBets` takes 4–13 ms in the browser at endless loop 3. No perf issue.

**What doesn't (yet)**
1. **The choice is solved/flat.** Every choice policy returns 109–113%; betting is always +EV. The decision
   is only "how much can I spare", and 3 is usually the answer (chips at the table p50 = 8). The two bets differ
   in flavor only, because the line is fitted to your exact build: **your knowledge can't beat the rehearsal.**
   In Balatro/poker a bet is interesting when you know something the line doesn't.
2. **The table comes too late.** It opens after the shop, so chips at the table are leftovers. The real chip
   decision (bet vs buy) never happens on one screen.
3. **Stakes vs economy:** 12 is affordable at only 25% of tables (bets.ts: an always-12 bettor lands 8–18% of
   fights). The swing at 6 (±6) is about half a shop item, which is right; 12 is decoration in the main run.
4. **Hidden interest tax** (above). Also on MIDAS, staked chips leave the vault pre-fill; the table says nothing.
5. **Readability:**
   - The payout is shown gross on a win ("WON +12", "SIDE BET WON: +12 CHIPS" for a 6-chip ×2 bet: net +6) but
     net on a loss ("BUSTED: -6 CHIPS"). Players will think they made 12.
   - "WIN BY YOUR SPIN 8" while the HUD says "ROUND 5". Use one word (ROUND).
   - **BIG HIT lines above the enemy's HP:** "DEAL 1460+ IN ONE TURN" against a 560 HP GRUMPY BOMBER (MIDAS act 2).
     `trackEvent` sums raw `attack.amount`, so vault multipliers and overkill count. It reads as impossible.
     Endless lines like "DEAL 30600+" and "13000+" are unreadable walls of digits (use 30.6K).
   - The picked stake button's "BET 3" text is cramped in the 72 px gold button.
   - First time the table appears, nothing explains it (no coach tip). "SIDE BET: HIGH ROLLER / LAND 2 JACKPOTS /
     PAYS X3" is clear enough to a slots player, but not what the chips do.
   - The two panels sit at the screen's far corners, away from FIGHT! and CHIPS; the eye skips them.

**What would make bets sing (ordered by value/effort)**
- **Move the table onto the Cashier (shop) screen, sized on the build you walk in with.** Now "buy the charm or
  bet 6" is one decision, and what you buy after betting can tilt your own line (bet BIG HIT, then buy the sword
  level). That's the skill edge the flat choice lacks, and it's thematically "the Cashier's table". Keep it
  honest by aiming lines at 50% (the buyer's edge supplies the rest). Gate: a bet-aware shop policy beats the
  blind bettor by 10–25 points of return; the blind bettor sits at 95–105%.
- **HOT HAND streak:** each consecutive won bet adds +1 to the next pay (×2 → ×3 → ×4, cap), a bust resets.
  It's a cross-fight push-your-luck arc for stakes, visible as a flame on the table. Cheap to build.
- **Stakes 2 / 5 / ALL IN** (ALL IN = every chip you hold, cap 20): the big button is always pressable and it's
  a real dare, not a dead button.
- **Show interest on the table:** "CHIPS 10 · INTEREST +2" updating as you stake. It turns the hidden tax into
  Balatro's readable tension (it's a rule readout, not an EV hint).
- **3–4 bet relics** once the table is on the shop: LOADED DICE (bets pay +1×), MARKER (first bust each act
  refunded), BOOKIE (see 3 bets, not 2), HIGH LIMIT (stakes ×2). Relics that change *which* bet you want are
  what make the choice non-flat.
- **One boss bet**, at the Dealer only: "BEAT HIM BEFORE THE FINAL HAND" (×3) or "SURVIVE THE ALL IN" (×2).
  Bosses already have a question, so keep it to the finale, where it doubles the climax.
- **Fork tables:** show each fork enemy's table under its panel, so the fork choice includes the bets.

## 2. FINAL HAND: does it land?

**When it lands, yes.** My KNIGHT Dealer: FINAL HAND fired with the Dealer at 6%, the row played out, and the
ALL IN killed me one spin from the win. That's the best-feeling loss in the game: announced, feared, arrived.

**But mostly it doesn't arrive.** `tools/balance/expert6_final.ts 250` (new; GREEN greedy, Dealer fights only):

| machine | Dealer lost | FH fired | Dealer HP when it fired p10/p50/p90 | row reached its ALL IN | final ALL IN landed | wins that ended before the final ALL IN |
|---|---|---|---|---|---|---|
| KNIGHT | 44% | 63% | 10/24/31% | **7%** | 4% | **97%** |
| TESLA | 41% | 79% | 9/25/33% | 44% | 36% | 68% |
| BRIAR | 58% | 64% | 18/30/33% | 65% | 51% | 52% |
| JAX | 47% | 66% | 14/29/33% | 36% | 31% | 66% |
| MIDAS | 39% | 51% | **0**/21/33% | 47% | 43% | 63% |

- **FH fires late:** big hits skip past the 1/3 line (p50 21–30%; MIDAS p10 under 0.5%, one vault away from dead).
- **The row is too long for the time left:** 3 deals at every 3 (2 after HOUSE RULES) enemy turns means 6–9
  enemy turns. KNIGHT kills the Dealer ~2 enemy turns after FH. **The promised ALL IN comes in 4–51% of fired
  hands.** A climax that is announced and then skipped reads as an anticlimax.
- **Losses:** 26–53% of Dealer losses happen *before* FH (the player never sees it); the Dealer's HP at your
  death p50 is 32–57%.
- **Killing blows by type** (`expert5_dealer.ts 200`, `exp6_dealer.txt`):

  | machine | quiet | RAISE | ALL IN | your own spin (marks) | telegraphed (RAISE + ALL IN) |
  |---|---|---|---|---|---|
  | KNIGHT | 39% | 32% | 7% | 21% | 39% |
  | TESLA | 33% | 28% | 17% | 22% | 45% |
  | BRIAR | 44% | 19% | 16% | 22% | 35% |
  | JAX | 48% | 16% | 10% | 26% | 26% |
  | MIDAS | 60% | 24% | 0% | 16% | 24% |

  E6 made ALL IN hurt (HP damage p50 31–36%, was 15–24%), but only 1 per fight (p50) now, so **quiet turns still
  kill most often (33–60%)**. The ≥60% telegraphed gate from EP5 still fails.
- **Screen clutter at FH** (KNIGHT seed 4711, round 15): the "FINAL HAND! / RAISE, RAISE, THEN ALL IN" banner
  sits over the player's HP panel (hides "238/4xx"). At the same moment "ALL IN! UP TO 240" pulses over the Dealer
  (an ALL IN already armed from the previous deal), and the deal box says "NEXT DEAL IN 2: A CARD ON YOUR PAYLINE".
  That's three different promises. The row should absorb an armed ALL IN, and the deal box should show the row.

**Fix (E3):** trigger at **40%**; while FINAL HAND is on, **the Dealer deals every enemy turn**, and the row is
**RAISE → ALL IN** (2 cards). If an ALL IN is already armed, it *is* the row's last card. Gate: row reaches its ALL
IN in ≥ 60% of fired hands for every machine; FH fires in ≥ 70% of Dealer fights; Dealer win rate stays 45–55%.

## 3. Endless after E7

`expert4_endless.ts 150 none` (`exp6_endless_none.txt`), cash-out policy on: loops cleared p50 3, mean 2.7, p90 4.

| loop fight | lost | turns p50/p90 | HP lost p50 | verdict |
|---|---|---|---|---|
| L1 House | **0.0%** | 11/23 | **0%** | the race is short now, but still free |
| L2 Mirror | 27.1% | 18/41 | 27% | good (was 42.6%) |
| L3 Dealer | 17.9% | 27/61 | 11% | good; LAST CALL 20.5% |
| L4 House | 1.8% | 13/27 | 0% | free |
| regular loop fights | 0.3–2.9% | 6–7 | **0%** | filler, but now every one has a table |

`endless.ts 300`, loops cleared p50/p90: KNIGHT 1/2, TESLA 2/4, BRIAR 2/4, JAX 2/4, MIDAS 1/2.

- **The House loop boss is still a bye.** ×2.5 HP / ×1.5 pot made it *shorter* (19 → 11 turns) but not
  dangerous. It needs teeth, not length: the pot skims every 2 (not 3) in loops, or its pot seed ×2.5.
  Gate: L1 House lost 10–20%.
- **RIDE vs CASH OUT is solved: always ride** until ~loop 4. Live, JAX after loop 1: CASH OUT 1,830 (1,500 pot +
  33 chips ×10); a bust at loop 2 banks 750 + 330. Break-even p(clear) is 20% at L1 and 33% at L2 (4,880 vs a bust
  of 2,630 or a clear worth 9,380+), while real clear rates are 73–100%. The decision only bites at L4+, which
  the median player never reaches. Fix: a bust banks **a third** of the pot (not half), and the pot grows ×1.5
  per loop instead of +1,500·L. Gate: sim cash-out policy stops at a p50 of loop 2–3, and ride/cash EV within 15%
  at L2.
- **Edge tiers:** the card set I saw (HOUSE CUT: pick a relic, cost "YOUR HEALING IS HALVED"; FAST HANDS: +8 chips;
  HIGH ROLLERS: legendary) reads well. The HOUSE CUT card still uses the LUCKY CLOVER sprite (EP5 B9).
- **Bets in endless are great in principle:** a chip is 10 points, so a 12-chip bet is a 120-point wager.
  But the pot is thousands, so 12 is nothing; in endless, stakes should scale (2/5/ALL IN fixes this too).

## 4. Bugs and ugly screens

1. **The Dealer win screen overlaps two lines** (first Dealer win on a machine, with an unlock). TESLA GREEN
   seed 9090: "YOUR WIN IS BANKED. LET IT RIDE…" is drawn over "NEW SLOT MACHINE UNLOCKED: JOKER…" at the same y
   (above the reels box). Without an unlock (JAX 2468) the line is clean. (S)
2. **Side bet payout text:** wins are shown gross ("WON +12", "SIDE BET WON: +12 CHIPS" for 6 × 2), losses net
   ("SIDE BET BUSTED: -6 CHIPS"). Show net ("+6") or "PAID 12". (S)
3. **"WIN BY YOUR SPIN 8"** vs the HUD's "ROUND 5 / HERO'S TURN": the same count under two names. (S)
4. **BIG HIT lines above the enemy's max HP** ("DEAL 1460+" vs a 560 HP bomber, MIDAS act 2): raw attack
   amounts include multipliers and overkill. Either cap at the enemy's max HP or phrase it as "A HIT OF 1460+".
   Endless lines need K formatting ("30.6K+"). (S)
5. **FINAL HAND banner covers the player HP panel**, and fires on top of an already-armed ALL IN, with the deal
   box still showing a line card (see 2). (S)
6. **Interest reads chips while the stake is off your stack** (`finishFight`), an invisible cost of betting. (S:
   either count table chips or show interest on the table.)
7. **Picked stake button** "BET 3" is cramped and hard to read (dark text on gold in a 72 px button). (S)
8. EP5 B9 still open: HOUSE CUT ("PICK A RELIC") uses the LUCKY CLOVER sprite.
9. Not a bug, noted: the table is skipped at a fork until you pick (by design). No softlocks found in bets,
   the Dealer, or endless (ride → edge → loops → ride again).

## 5. Ready for new content?

**Almost. Not a new slot machine this week; one more small batch first.**
- **The base is solid:** WHITE avg 43.2, GREEN 14.7, Dealer 53.0; ALL IN hurts now; the Mirror loop is fixed; bets
  put a question in 99% of regular fights. The 5-column tuning matrix survived MIDAS (though MIDAS WHITE 37.5 is
  the low outlier).
- **But the two newest systems each have one clear hole,** and both are S-sized: bets are a flat choice placed
  on the wrong screen, and FINAL HAND usually doesn't arrive. Fixing those makes every existing machine better.
  A 6th machine now would be tuned against a Dealer and a bet economy that are about to move.
- **Then yes: build the 6th slot machine, and make it the bets machine.** The natural candidate is the held
  "Gambler" character (a machine whose meter fills on *won side bets*, and whose signature symbol pays more while a
  bet is live). That's the first machine that makes the between-fight bet a build axis, not a side dish. If the
  Gambler stays held, the next most valuable thing is the bet relics (E6 below).

**Benchmarks, per the new direction:** I'd move one.
- WHITE ~42: keep.
- GREEN ~15: keep.
- **Dealer ~52 → ~47, and the Mirror (act 2 boss) easier.** The GREEN death histogram has the Mirror killing
  22.2% of runs vs the Dealer 11.0% and the House 17.5%. The finale should be the peak: lower the Mirror's
  BOSS_MUL until its fight-12 deaths are ≤ 15%, and let the Dealer carry the difference. With FINAL HAND fixed
  (E3), a Dealer that you beat 47% of the time will *feel* like the hardest fight, which right now it isn't.
  Gate: GREEN stays 14–17; Mirror deaths < Dealer-fight deaths in the histogram.

## 6. Prioritized change list (small, high-impact first)

| # | Change | Why | Gate |
|---|---|---|---|
| E1 | **Bet text fixes:** net payouts ("+6", "BUSTED -6"); "WIN BY ROUND N"; BIG HIT capped at the enemy's max HP or reworded; K formatting; readable picked-stake button; a one-time coach tip on the first table ("STAKE CHIPS ON HOW THE FIGHT GOES. FIGHTS STAY HANDS-OFF.") | Players misread their own winnings and the lines | Screens only |
| E2 | **×3 threshold 0.42 → 0.38** (5-of-12 rehearsals pay ×2) | ×3 lines return 128% vs 107%: "take the ×3" is solved | `expert6_bets.ts 150`: ×2 and ×3 return within 5 points |
| E3 | **FINAL HAND:** trigger at 40%; deal every enemy turn while it's on; row RAISE → ALL IN; an armed ALL IN counts as the row's last card; move the banner off the HP panel | The promised ALL IN arrives in only 4–51% of fired hands (KNIGHT 4%) | `expert6_final.ts 250`: row reaches ALL IN ≥ 60% every machine; FH fires ≥ 70%; Dealer 45–55% |
| E4 | **Stakes 2 / 5 / ALL IN** (all chips held, cap 20; in endless cap 50) | 12 is affordable at 25% of tables; the top button is dead | `bets.ts`: the top stake is placeable ≥ 70% of tables; win rates within ±2 |
| E5 | **Show interest on the table** ("CHIPS 10 · INTEREST +2", live as you stake) | The interest cost of betting is real but invisible; shown, it's the Balatro tension | A rule readout, no EV: no gate beyond `tuesday.ts` unchanged |
| E6 | **Move the table to the Cashier screen**, sized on the build you walk in with, aim 0.50 | Makes bet vs buy one decision, and buying toward your bet a skill edge; the choice stops being flat | New harness: a bet-aware shop policy returns 110–125%, the blind bettor 95–105% |
| E7 | **HOT HAND streak:** each won bet in a row adds +1 to the next pay (cap ×4); a bust resets | A cross-fight push-your-luck arc for 20 lines of code | `bets.ts`: return ≤ 115%, win rates within ±2 |
| E8 | **Dealer-only boss bet:** "BEAT HIM BEFORE THE FINAL HAND" ×3 / "SURVIVE THE ALL IN" ×2 | Doubles the finale's question, only at the finale | Dealer win rate unchanged ±2 |
| E9 | **Endless:** the House loop boss skims every 2 turns (pot seed ×2.5); a bust banks 1/3 of the pot; the pot grows ×1.5 per loop | L1 House lost 0%; RIDE is "always" until L4 | `expert4_endless 150`: L1 House lost 10–20%; the cash-out policy's p50 stop at loop 2–3 |
| E10 | **Benchmark move:** Mirror easier (fight-12 GREEN deaths ≤ 15%), Dealer target 52 → ~47 | The finale should be the hardest fight; today the Mirror kills twice as many runs | `gate.sh 600`: GREEN 14–17, Dealer 45–50, Mirror deaths < Dealer deaths |
| E11 | **Bet relics** (after E6): LOADED DICE (+1× pay), MARKER (first bust per act refunded), BOOKIE (3 bets offered), HIGH LIMIT (stakes ×2) | Relics that change *which* bet you want make the choice non-flat | `builds.ts`-style per-relic win-rate probe within the relic band |
| E12 | **Fix the Dealer win screen overlap** (unlock line vs ride subline) + the HOUSE CUT sprite | Screenshot-worthy screen | Screens only |

**Suggested batches:** E1 + E2 + E12 (text, no balance) → E3 (gate `expert6_final`, `tuesday`) → E4 + E5 + E7
(bet economy, gate `bets.ts`, `expert6_bets.ts`) → E6 + E11 (the Cashier table and relics) → E9 → E10 → then the 6th machine.

**Tests:** not run (a playtest-only session). No `src/` edits. New throwaway harnesses:
`tools/balance/expert6_bets.ts` (both bets scored on paired sample fights; choice policies; settle timing),
`tools/balance/expert6_final.ts` (FINAL HAND timing and killing blows). Outputs: `tools/out/exp6_*.txt`.
