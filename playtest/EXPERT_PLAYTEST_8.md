# Expert playtest 8 (2026-09-30): after EXPERT_PLAYTEST_7 E1–E12 and THE DAILY RUN (iterations 54–59)

Build: the frozen build on :4173 (HEAD 68450c0), plus headless sims. No `src/` edits, nothing committed.

## How I tested
- **Headless** (outputs `tools/out/exp8_*.txt`): `tuesday.ts 600`, `expert6_final.ts 250`, `expert7_deaths.ts 300`,
  `dealer_bets.ts 300`, `bets.ts 200 5 0` at GREEN with PICK 0 (safe) / 1 (long), with and without LOADED DICE.
- **New throwaway harness:** `tools/balance/expert8_daily.ts [days] [variants] [stake]`. It plays each day's real
  daily (the day's seed and machine, fights fixed via `run.daily`). Variant 0 is greedy; the other variants are
  greedy with 25% random picks (a different player on the same day). It compares fixed fights with fresh fight seeds
  and checks determinism. 120 days × 8 players at WHITE, 60 days × 6 at GREEN.
- **Browser** (:4173): today's daily (BRIAR, seed 2027195987) through the start relic, the first table (a 5-chip long
  shot) and fight 1. Then a `dbg.vs('dealer')` sandbox, stepped with `dbg.tick`, to watch FINAL HAND, RAISE and
  ALL IN. Note: `dbg.until` left the game paused after it timed out. `dbg.resume()` fixed that (a dev tool quirk, not
  a game bug).

## Official table (`tuesday.ts 600`; the sim doesn't bet)

| | WHITE | act1 | House | Mirror | GREEN | reachD | hpInD | vs the Dealer |
|---|---|---|---|---|---|---|---|---|
| KNIGHT | 44.5 | 83.0 | 86.5 | 61.2 | 17.7 | 37.5 | 64 | 47.1 |
| TESLA | 44.5 | 79.8 | 84.8 | 74.6 | 14.8 | 32.0 | 91 | 46.4 |
| BRIAR | 48.2 | 83.3 | 85.2 | 59.5 | 20.5 | 40.2 | 80 | 51.0 |
| JAX | 41.2 | 78.3 | 95.1 | 62.8 | 16.2 | 31.7 | 90 | 51.1 |
| MIDAS | 37.5 | 74.7 | 83.4 | 62.5 | 13.3 | 26.8 | 85 | 49.7 |
| **avg** | **43.2** | | | | **16.5** | | | **49.0** |

- WHITE is byte-identical to EXPERT_PLAYTEST_7: iterations 54–59 only touched act 3 and bets.
- GREEN moved 16.4 → 16.5; you beat the Dealer 48.9 → 49.0.
- Big choices: CLEAN CUT is still the lowest when taken (31%), a selection effect per iteration 58. SWEEP UP was
  still taken only 43 times.

## 1. The finale now: is the Dealer the peak?

`expert6_final.ts 250` (GREEN, Dealer fights only; n 62–99 per machine):

| machine | lost | FH fired | turns after FH p50 | losses before FH | telegraphed kills* | FH-ALL IN kills | quiet kills | own-turn kills |
|---|---|---|---|---|---|---|---|---|
| KNIGHT | 54% | 72% | **5** | 38% | 54% | 23% | 19% | 28% |
| TESLA | 49% | 86% | 9 | 29% | 60% | 26% | 19% | 21% |
| BRIAR | 50% | 77% | 9 | 33% | 63% | 43% | 12% | 24% |
| JAX | 46% | 79% | 7 | 45% | **51%** | 29% | 29% | 21% |
| MIDAS | 48% | **53%** | 7 | 47% | 64% | 27% | 26% | 10% |

\*Telegraphed = RAISE + ALL IN, in or out of FINAL HAND. "Turns" are engine half-turns, so 7–9 is about 4 enemy
turns: roughly RAISE → ALL IN → RAISE → ALL IN ×0.8.

**Verdict: E3 worked. The finale ends on the Dealer's cards now.**
- Quiet-turn kills fell hard: TESLA from 55% to 19%, KNIGHT from 29% to 19%.
- The telegraphed share went from 32–56% to 51–64%. Gate (≥55%): KNIGHT and JAX just miss, the other three pass.
- The gate of "turns after FH p50 ≤ 5" holds only on KNIGHT (5). The others sit at 7–9 half-turns. That's two RAISE
  → ALL IN cycles, which reads as a climax, not a tail. I'd accept it and retire that gate.
- **Per attempt, the Dealer is the peak.** GREEN deaths (`expert7_deaths.ts 300`, % of all runs): Dealer 17.7,
  Mirror 17.1, House 15.6.
  - In absolute terms those are still three near-equal walls.
  - But per attempt, the Dealer takes ~49% of the runs that reach him, the Mirror ~27% and the House ~16%.
- **What's still off:**
  1. **A third to half of Dealer losses never see FINAL HAND** (29–47%; JAX 45%, MIDAS 47%). MIDAS fires FH in only
     53% of Dealer fights, because a vault payout jumps him from above 40% straight to dead (in wins) or kills you
     first (in losses).
  2. **"Own turn" kills are 10–28%.** KNIGHT's marks (and TESLA's overcharge) kill you on your own spin inside the
     phase. That isn't the Dealer's card, so it reads as "I died to my own machine at the climax".
  3. **In the phase, "DEALS NEXT TURN!" is always on.** Once every enemy turn is a deal, the warning stops being a
     warning. What would still build tension is the row: which card comes after this one, and how much weaker each
     ALL IN is getting.

**How it looks (sandbox):**
- The FINAL HAND box reads "FINAL HAND / DEALS NEXT TURN! / ALL IN / ITS NEXT ATTACK IS ITS WHOLE HAND". The panel
  reads "THE DEAL NEXT!". The two now agree (E5 fixed).
- The "ALL IN! UP TO 1100" banner sits across the Dealer panel's bottom border, over the countdown line "THE DEAL
  NEXT!". The HP bars stay clear, so E5's main fix holds.
- **Nothing on screen says the second ALL IN is ×0.8.** The cap number shrinks, but nobody compares caps across
  turns. The fade is an invisible rule that decides fights.
- After the killing blow, the deal box still advertises "RAISED! / DEALS NEXT TURN! ALL IN" over a dead hero.

## 2. The table's decision: is SAFE vs LONG a real choice?

`bets.ts 200 5 0` at GREEN (always stake 5; paired seeds; ±3 noise). "Win" is the no-bet baseline → the bettor.

| policy | return | bets won | GREEN win shift (knight/tesla/thorn/joker/midas) |
|---|---|---|---|
| always SAFE (×1.5) | 104–110% | 69–73% | −8.5 / +2.0 / −4.5 / −1.5 / −5.5 (avg −3.6) |
| always LONG (×3, hot ×4/×5) | 92–105% | 28–32% | −6.0 / +2.5 / −6.0 / −2.5 / −6.0 (avg −3.6) |
| LOADED DICE + always SAFE | **133–143%** | 66–71% | +2.0 / +3.0 / +2.0 / +1.0 / +3.5 (avg **+2.3**) |
| LOADED DICE + always LONG | 108–117% | 29–31% | −6.5 / −0.5 / +0.5 / 0 / 0 (avg −1.3) |

- **Without relics, SAFE vs LONG is a real but flat choice.** Both return ~100–110% and cost the same (−3.6: chips
  on the table are chips not spent at the Cashier or earning interest). It's pure risk appetite, which is the design
  intent. It's good that neither is solved, and the ×1.5 / ×3 labels make the difference readable at a glance.
- **HOT HAND** is priced right: long ×4 returns 87–123%, ×5 70–139% (small n). Being able to cool off (take the
  safe bet) gives the streak a decision now. The pay line pulses orange, which is visible.
- **LOADED DICE solves the choice.** A flat +0.5 is +33% on a ×1.5 but +17% on a ×3. So LOADED + SAFE is a 140%
  return at 70% odds: low-variance free chips, and the only betting line that raises the win rate on every machine.
  That's too much for a common, and once you own it the table's decision is gone for the rest of the run.
  - Fix: make LOADED multiplicative, "SIDE BETS PAY 20% MORE" (×1.5 → ×1.8, ×3 → ×3.6). Both lines land at ~120–125%,
    and the choice stays alive.
- **MARKER** (after E1): no longer a freeroll (iteration 54: 107–126%). It still tilts you toward the long shot,
  which is the intended flavor.
- **The Dealer's table is solved in a different way: ALL IN, always.**
  - The table is set in 100% of Dealer fights now (E4).
  - But a lost Dealer fight ends the run, and chips only score on a won run (or feed the endless pot). So the stake
    is worthless in the branch where you lose. The odds are sized on the rehearsals you won, so a win pays ~105%+
    of fair. The stake also still counts toward the chip shield.
  - Conditional returns from `dealer_bets.ts 300` (return ÷ Dealer win rate; n is small): FOLD HIM EARLY 71–144%,
    TAKE THE HIT 72–177%, noisy around ~115%.
  - The unconditional returns the harness prints (0–88%) look like a bug but aren't: they include the lost runs,
    where chips have no value.
  - The result: there's no reason to stake less than ALL IN at the Dealer, and no reason to prefer one bet except
    the fun of it. It's harmless (a free lottery ticket at the climax), but it isn't a decision.
- **The interest hole is still there:** interest caps at +3 at 15 chips, so past ~20 chips a stake has no interest
  cost. That's fine, and a Balatro-like soft cap. Leave it.
- No new exploit found. The daily's fight seeds are separate from the rehearsal seeds, so the rehearsals don't leak
  the real fight.

## 3. THE DAILY RUN

`expert8_daily.ts` (120 days at WHITE; 60 days at GREEN):

| | WHITE daily (as shipped) | GREEN (proposal check) |
|---|---|---|
| determinism: same choices → same run | **120/120** | 60/60 |
| mean per-day win (8 sim players) | 32.5% (fresh seeds 31.4%) | 12.8% |
| per-day spread (sd) | **26.3** (fresh 21.3) | 15.6 |
| days nobody in the sim wins | **25 of 120 (21%)** (fresh 13) | 30 of 60 |
| days at ≥75% | 15 of 120 | 0 |
| one try → best of 3 | 30.8% → **60.8%** | 13.3% → 36.7% |
| machine share | BRIAR 29, TESLA 26, KNIGHT 26, MIDAS 20, JAX 19 | |
| win by machine | BRIAR 40, MIDAS 38, KNIGHT 34, JAX 27, **TESLA 22** | |

**Is it a good hook? Yes, structurally.**
- The implementation is clean. It's deterministic, the try is spent on start, the entry is tagged "DAILY MM-DD" in
  hiscores, and the menu row flips to "DAILY: SPENT" or the score.
- Fixed fights make days genuinely different (sd 26 vs 21). "Today's was brutal" is a real sentence players will
  say, and that's the social currency of a daily.
- It also gives a taste of a locked machine. Good.

**What undercuts it:**
1. **The daily never reaches the Dealer.** `startDaily` uses stake 0 (WHITE), and `runActs` adds act 3 only at
   GREEN+. So the daily ends at the Mirror. Iterations 45–58 built the game's peak (FINAL HAND, the Dealer's table,
   chips counting on a won run), and the one mode everyone plays daily skips it. Its last boss is the Mirror, the
   fight that kills the most WHITE runs (24.1%).
2. **The score barely separates players.** Every won WHITE daily scores 12 × 100 + 1000 + 5 × chips = **2200 + 5 per
   chip**. Every Mirror loss scores 1100. Among winners, the ranking is purely the chips you hoarded, so the daily
   rewards never shopping, which is the opposite of good play. Among losers, it's ties.
3. **Nothing to share.** Hiscores are local-only. A "same for everyone" run with no way to compare is a solo
   challenge. The run-over screen doesn't show the day's seed or a result line to paste.
4. **The screens don't know it's the daily.** The start screen says "A NEW RUN", and the fight header says "ACT 1 -
   FIGHT 1 OF 5". Nothing says "THE DAILY RUN · 09-30" during the run.
5. **Local date, not UTC.** `dailyKey` uses the player's local date, so "the same for everyone" is only true within
   a time zone. Two friends in different zones can be on different dailies at the same moment.

**Abuse:**
- **Clock toggle = unlimited retries.** `lastDaily` stores a single key. Set the clock to yesterday and play
  yesterday's daily (that overwrites `lastDaily`). Set it back to today, and today's is open again. RESET SAVE also
  frees it, at the cost of everything, and an incognito window is a fresh profile. A retry is worth a lot: best of 3
  doubles the win rate (31 → 61%), and with identical choices the fights replay exactly, so a second attempt is a
  perfect-information replay.
- **Does it matter?** Barely, today: hiscores are local, so a cheater only fools themselves. It matters the day a
  shared result line or leaderboard exists. Cheap fix: store the set of played keys (the last ~14), and reject
  `dailyKey()` earlier than the newest key played ("THE CLOCK WENT BACKWARDS"). Don't build anti-cheat beyond that.
- "Learn the fights" in one try isn't possible: the rehearsals use other seeds, and the fork enemies share a seed
  (fine).

**What would make it sing (in value order):**
1. **Include act 3 in the daily** at WHITE numbers (a `daily` flag in `runActs`, not a stake change). GREEN is too
   harsh for a daily: 12.8% mean, and half of all days had no winner in the sim.
2. **A share line on the run-over screen,** with a COPY button (the fight log already has COPY LOG). Something like
   `SLOTS VS. SLOTS DAILY 09-30 | BRIAR | 2450 | WWWWWB WWWWLx | 42 CHIPS` (W = won, B = boss, L = the fight that
   killed you). No emoji needed: 8-bit glyphs in plain ASCII.
3. **A daily modifier:** one HOUSE EDGE from endless (fast / marked / heal / rollers / writer) or one "house rule"
   per day, named on the menu row ("DAILY: TESLA · MARKED"). It turns the same five machines into a reason to come
   back, it already exists as code, and it gives the share line a headline.
4. **A score with more resolution:** add the finale (so the Dealer's +1000 exists), and add HP left ×1 on a won run,
   so winners are ranked by how well they played, not only by hoarded chips.

## 4. Balance and feel

**Where runs die** (`expert7_deaths.ts 300`, % of all runs):

| | act-1 fights | House | act-2 fights | Mirror | act-3 fights | Dealer |
|---|---|---|---|---|---|---|
| WHITE | 6.9 | 13.1 | 13.2 | **24.1** | – | – |
| GREEN | 6.7 | 15.6 | 13.2 | 17.1 | 11.4 | 17.7 |

- **Early (act 1):** 75–83% clear. The House is the first wall (13–16%), and JAX's House is a bye (95.1%: its
  jackpots steal the pot). Right for the genre. Leave it.
- **Mid (act 2):** the WHITE Mirror kills 24.1% of all WHITE runs. It's the biggest killer in the base game and now
  the daily's final boss. The TESLA Mirror at 74.6% (everyone else 60–63%) is still the outlier.
- **Late (act 3):** act-3 regulars kill 1.4–3.3% each (die 4.3–7.9% of fights, 8–15 turns). The Dealer is the peak
  per attempt (section 1).
- **Regular fights are still filler.** 15 regular fights per GREEN run each kill 0.5–4.8%. The biggest are the
  Mimic (3.8–4.1%), the Card Sharp (3.9%) and the Hexer (3.7%). Side bets now carry the mid-act tension, and they
  carry it well: a table appears at 99% of regular fights. But what an enemy writes on your machine stops mattering
  when the fight ends (rocks aside), and that's the game's unique hook.
- **Per machine:**
  - **MIDAS** is still last at WHITE (37.5) and near last at GREEN (13.3; reachD 26.8). E9 (bets into the vault) is
    right in flavor, but the always-bettor MIDAS still loses 5.5–6 GREEN points, like everyone else.
  - **TESLA** is last at GREEN (14.8) and on the daily (22%). It arrives at the Dealer healthiest (hpInD 91%), but
    it's short on damage: its act 3 is a race it loses slowly.
  - **BRIAR** is best everywhere (48.2 / 20.5). That's fine for the first-unlocked machine.
  - **KNIGHT** arrives at the Dealer beaten up (hpInD 64%), and 28% of its Dealer losses come on its own turn.
- **The 20-point gap between WHITE and GREEN is mostly act 3, not the stake.** reachD is 27–40%, and the Dealer
  takes half of those.

## 5. Bugs and UX

1. **"FREEZES 1 REELS FOR 2 TURNS"** (Ancient Frost Imp preview, daily fight 1). `src/ui/runScreens.ts:119` needs
   singular/plural.
2. **The daily isn't labeled during the run:** the start screen says "A NEW RUN", and the header says "ACT 1 - FIGHT
   1 OF 5". It should say "THE DAILY RUN · 09-30" (or "DAILY" on the header).
3. **The daily menu row names the machine ("DAILY: THORN")** while the list beside it leads with the character
   ("BRIAR", with THORN small under it). Use the character name, or both ("DAILY: BRIAR").
4. **The FINAL HAND fade is invisible:** later ALL INs are ×0.8, but nothing says so. Add "×0.8" to the ALL IN card
   in the deal box, or "ALL IN 2 · WEAKER".
5. **The deal box outlives the hero:** "RAISED! / DEALS NEXT TURN! ALL IN" stays up after the killing blow. Hide it
   when the fight is over.
6. **The "ALL IN! UP TO N" banner** overlaps the Dealer panel's countdown line. Nudge it down 12px, or into the
   machine frame like RAISE.
7. **Dev only (not in the public build):** the `dbg.vs('dealer')` sandbox DEFEAT screen names the opponent "SLIME
   KING" and shows all-zero stats. Also, `dbg.until` leaves the game paused when it times out.
8. **The daily can be retried** by moving the clock back (section 3). Low priority until results are shared.
9. Confirmed OK:
   - the table cards ("SIDE BET: BIG HIT / DEAL 50+ IN ONE TURN / SAFE BET: PAYS X1.5"; "LONG SHOT: X3 - YOUR BET 5");
   - "CHIPS 3 - INTEREST +0" updating live;
   - the in-fight tracker "BET 5: QUICK HANDS / 6 ROUNDS LEFT";
   - the FINAL HAND deal box and panel agree;
   - no softlocks in the daily, the table or the sandbox.

## 6. The next most valuable thing (not the held ideas)

Ranked by value for effort:

1. **Finish the daily (S):** act 3 in the daily, a share line, a daily modifier, a finer score, and a UTC key. This
   is the cheapest retention in the game, and it's 80% built. (E1–E4 below.)
2. **Gatekeepers: one mandatory elite per act at fight 3 that writes on your machine persistently (M).** Sketch below.
3. **A second act-2 boss in rotation with the Mirror (L).** The Mirror kills 24% of WHITE runs and is the daily's
   final boss every day. A rotation makes act 2 less predictable and the daily more varied. Only after gatekeepers,
   because a boss costs art, a mechanic and a full balance pass per machine.
4. **Machine-specific late power for TESLA and MIDAS (M):** one charm or relic each that scales in act 3. They're the
   two machines at the bottom of GREEN.
5. **New charms in general (M):** low. The set is healthy.

### Sketch: GATEKEEPERS ("the enemy's write stays on your machine")

**Rules:**
- **Placement:** fight 3 of acts 1 and 2 (and act 3 at GREEN+) is a gatekeeper. It's shown on the run map with a
  lock icon and no fork.
- **One gatekeeper per act, drawn from a pool of three:**
  - **THE REPO MAN** (act 1): every 3 turns, he puts a LIEN on one of your charm cells (the cell pays as a plain
    symbol).
  - **THE FORGER** (act 2): every 3 turns, he swaps one of your signature symbols for a COUNTERFEIT, which pays 0 and
    breaks lines.
  - **THE AUDITOR** (act 3): every 4 turns, he STAMPS a reel. A stamped reel's best symbol pays half.
- **The persistence rule (the point):** whatever he has written when the fight ends **stays on your machine until
  the act's boss is beaten**.
  - Between fights you can buy it off at the Cashier: 4 chips per lien, counterfeit or stamp ("PAY OFF THE LIEN").
  - The between-fight decision is then chips vs a weaker machine vs a side bet, which ties the gatekeeper to the bet
    economy.
  - Beating him fast leaves fewer marks, so the fight's pace matters after it ends.
  - Watch-only is kept: the write happens during the fight, and the agency happens between fights.
- **Numbers to start:**
  - HP at 1.3× a regular fight at that depth; the ability every 3 turns;
  - a cap of 3 writes per fight;
  - the reward: +4 chips and an uncommon relic draft (like an elite).
- **Telegraph:** the enemy's HUD shows "LIEN IN 2" like every other ability, and the preview card says "WHAT HE
  WRITES STAYS UNTIL THE HOUSE FALLS".

**Gates:**
- the gatekeeper fight kills 4–7% of runs (today's regulars: 0.5–4.8%);
- runs that carry ≥2 marks into the boss lose it 3–6 points more often than runs that paid them off (so paying off
  is worth it, but not mandatory);
- WHITE avg 41–45 and GREEN avg 15–18 after retuning;
- ≥40% of players who can afford it pay off at least one mark (a real decision, not always or never);
- the regular-fight share of deaths rises from ~33% to ~40% of all deaths.

## 7. Prioritized change list (small and high-impact first)

| # | Change | Why | Gate |
|---|---|---|---|
| E1 | **The daily includes act 3** at WHITE numbers (a `daily` flag in `runActs`; the stake stays 0) | The daily skips the Dealer, the game's peak and the work of iterations 45–58; its final boss is the Mirror every day | `expert8_daily.ts 120 8`: daily win 20–30%, reach the Dealer ≥30%, days with no winner ≤25% |
| E2 | **A daily share line + a COPY button** on the run-over screen ("SLOTS VS. SLOTS DAILY 09-30 \| BRIAR \| 2450 \| WWWWWB WWWWL"), and "THE DAILY RUN · 09-30" on the start screen and the fight header | Hiscores are local; the daily has no social surface; the run never says it's the daily | Screens only |
| E3 | **The daily key uses UTC,** and the profile keeps the last ~14 played keys: reject a key earlier than the newest one played | Local dates split friends; the clock toggle gives unlimited retries (best of 3 = 31 → 61% wins) | Unit test: the clock back → "SPENT"; save keys unchanged |
| E4 | **A daily modifier:** one endless HOUSE EDGE per day, named on the menu row ("DAILY: TESLA · MARKED") | Five machines × one ruleset gets stale fast; the code exists | `expert8_daily.ts`: every edge's daily win stays within 15–35% |
| E5 | **LOADED DICE multiplies side-bet pay by ×1.2** instead of +0.5 | +0.5 makes SAFE a 133–143% money printer at 70% odds (+2.3 GREEN) and ends the SAFE/LONG choice | `bets.ts 200 5 0` with RELIC=loaded: PICK 0 and PICK 1 both return 115–128%, and neither leads the other by >8 points |
| E6 | **The FINAL HAND fade is shown:** the ALL IN card in the deal box reads "ALL IN ×0.8" (then ×0.64); the deal box hides when the fight is over; the "ALL IN! UP TO N" banner moves off the panel's countdown line | The fade decides fights but is invisible; screen tidy-up | Screens only |
| E7 | **"FREEZES 1 REEL"** singular/plural; the daily row says the character name | Text bugs | Screens only |
| E8 | **The daily score gets resolution:** + HP left on a won run (×1 per 10 HP), so winners aren't ranked only by hoarded chips | Every won WHITE daily is 2200 + 5/chip; that rewards never shopping | Sim: the score spread among winners is driven <50% by chips |
| E9 | **The Dealer's stake comes off the chip shield** (the stake is no longer free in the loss branch) | ALL IN at the Dealer is strictly dominant: chips are worthless if you lose, and the shield ignores the stake | `dealer_bets.ts 300`: non-bettors' Dealer win ±1; ALL IN bettors lose 2–4 Dealer points; the conditional return stays 100–120% |
| E10 | **MIDAS FINAL HAND trigger:** fire FH when the Dealer is ≤40% **or** when a single hit takes him from >40% to ≤15% (he plays it at once, the phase starting at the ALL IN) | MIDAS fires FH in only 53% of Dealer fights; vault spikes skip the finale | `expert6_final.ts 250`: MIDAS FH fired ≥70%; Dealer win 45–52 |
| E11 | **GATEKEEPERS** (section 6 sketch): a mandatory fight-3 elite per act whose writes persist until the act boss, payable at the Cashier | Regular fights are filler (0.5–4.8% each); the unique hook "they write on your machine" stops at the fight's end | The section 6 gates: the gatekeeper kills 4–7%; paying off is a real decision (≥40%); WHITE 41–45, GREEN 15–18 |
| E12 | **TESLA / MIDAS late power:** one act-3-scaling charm level or relic per machine | GREEN 14.8 / 13.3 vs 16–20.5 for the rest; TESLA 22% on the daily | `tuesday.ts 600`: TESLA and MIDAS GREEN ≥15.5, the others unchanged ±1 |

**Suggested batches:** E1 + E2 + E3 + E7 (the daily, finished) → E4 + E8 (daily depth) → E5 + E6 + E9 + E10 (table and
finale tidy-up) → E11 (gatekeepers, measured with its own harness) → E12.

**Retired gate:** "turns after FH p50 ≤ 5". At 7–9 half-turns (two RAISE → ALL IN cycles), the phase reads as a
climax.

**Tests:** not run (a playtest-only session). No `src/` edits. New throwaway harness:
`tools/balance/expert8_daily.ts`. Outputs: `tools/out/exp8_*.txt`.
