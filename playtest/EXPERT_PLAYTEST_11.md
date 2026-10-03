# EXPERT PLAYTEST 11: likes and dislikes (2026-10-03)

Build: `900e0cf` (iteration 67: the EXPERT_PLAYTEST_10 plan, built). I didn't edit `src/` or `tests/`.

**Note:** `356b090` ("no big choice targets a maxed type", `run.ts`) landed while I was measuring. Every before/after pair here ran on the pre-`356b090` rules: the baseline in the repo at the start, and all plan tables in the scratch copy taken then. So the pairs are consistent, but **re-baseline tuesday 1000 before building the plan**.

**Throwaway harnesses** (all under `tools/balance/`, prefix `e11_`):
- `e11_patch.ts` applies each proposal at runtime from env vars:
  - BELLFIX, BELLX (the Bell), VAMPV, VAMPSIG (VAMP);
  - SIG, CHARM (signature symbols, charm values), FAVORS (a machine's favoured charm);
  - JOKER, GATE, BMUL, RUNK (HP and run knobs).
- `e11_rows.ts` (all machines) and `e11_cab.ts` (one machine): builds.ts-style "only X" rows, then official-style W/G.
- `e11_sigm.ts`: signature-symbol charms per machine, with a no-charms drafter as control.
- `e11_a4.ts`: fight-4 (THE REPO MAN) deaths. `e11_chal.ts`: selected challenges. `e11_tuesday.ts`: the official tuesday table under the patches.
- `e11_feel.cjs` (Playwright): watches one fight at play speed and logs HP and the meter every half second.

TOLL BOOTH's payout and HOUSE CUT's 0.5 are hard-coded inside `run.ts`, so a harness can't patch them. I measured those two in a **scratch copy** of the repo with two env lines added (TOLLK / TOLLP, HEALMUL). The real `src/` is untouched.

## What I ran

**Headless:**
- `npm test`: 216/216 green. `tsc` is clean, including the e11 files.
- `tuesday.ts 1000` (baseline): it reproduces STATE exactly.
  - WHITE 44.1 / GREEN 17.0: KNIGHT 42.9/17.0, TESLA 46.9/17.0, BRIAR 48.8/18.8, JOKER 42.5/17.2, MIDAS 39.2/14.9.
  - vs the Dealer 49.4.
- `e11_rows.ts 300`: the charm and relic rows (builds.ts method: GREEN, seed 777, no start relic).
- JOKER sweeps (9 variants), signature-charm sweeps (8 variants over BRIAR / JOKER / MIDAS), MIDAS (3), TOLL BOOTH (5), REPO MAN HP (2), THE LONG NIGHT (5).
- The official tuesday 1000 under the full proposed plan.

**Visual (Playwright, 1280×720, vite on :5182):**
- `tools/shots/screens.cjs`: all 10 layout screens.
- THE LONG NIGHT: its start draft and fight HUD.
- A JOKER fight holding the JACKPOT BELL, watched at 2× with the meter logged (`e11_feel.cjs joker bell 2`).

**Baseline charm and relic rows** (`e11_rows.ts 300`; GREEN win%):

| row | avg | KNIGHT | TESLA | BRIAR | JOKER | MIDAS |
|---|---|---|---|---|---|---|
| greedy baseline | 9.9 | 10.0 | 9.0 | 12.0 | 9.7 | 9.0 |
| no charms | 11.5 | 6.7 | 7.7 | **22.0** | **17.3** | 3.7 |
| only VAMP | **18.9** | 10.3 | 8.3 | 19.7 | **36.7** | **19.3** |
| only GOLD | 13.5 | 11.3 | 9.0 | 16.3 | 25.0 | 5.7 |
| only LUCKY | 13.0 | 6.7 | 11.3 | 25.3 | 18.0 | 3.7 |
| only KEEN | 9.4 | 7.3 | 8.0 | 14.7 | 13.7 | 3.3 |
| + JACKPOT BELL | 28.9 | 22.7 | 15.7 | 30.7 | **63.3** | 12.0 |
| + TOLL BOOTH | 11.5 | 8.7 | 11.7 | 14.3 | 10.7 | 12.3 |

**No-charms drafter vs greedy, official-style W/G** (`e11_sigm.ts`, seed 4242, N 600):

| machine | greedy | no charms |
|---|---|---|
| BRIAR | 49.5 / 19.2 | **58.8 / 30.5** |
| JOKER | 45.8 / 17.2 | 43.5 / **24.8** |
| MIDAS | 37.2 / 16.2 | 27.2 / 9.8 |

---

## 1. LIKES (protect these)

- **L1. Machine balance holds, and every round-10 change stayed inside the gates.**
  - tuesday 1000: WHITE 44.1 (gate 41–45) and GREEN 17.0 (gate 16–19).
  - The spread is 39.2–48.8 WHITE and 14.9–18.8 GREEN, and the Dealer kill rate sits at 47–51% on every machine.
- **L2. The round-10 charm pass fixed the traps it aimed at.**
  - KEEN went from a trap (7.4, below no-charms everywhere) to about baseline (9.4).
  - BULWARK has a real sim value now, so the official tables include players who take it.
  - VAMP stacking is closed: one heal per group, and the card says "(ONCE PER GROUP)".
  - What's left is two specific loops (D1, D2), not a broken charm system.
- **L3. The layout pass landed.** All 10 `screens.cjs` shots are clean:
  - The run-over KILLED BY and NEW SLOT MACHINE lines sit between the two panels with room to spare.
  - The CHALLENGES rows show their edges ("JOKER. GLASS JAW + FAST HANDS") clear of the titles.
  - The MIDAS card shows its whole rule, through "360 HP."
  - THE REPO MAN preview reads "REPO FROM TURN 1, THEN EVERY 3: TAKES YOUR BEST CELL UNTIL THE BOSS FALLS" (true timing, 2 lines).
  - The boss preview names what comes back: "BEAT IT AND YOU GET BACK: GOLD SWORD R1, SHIELD R2".
  - The boss node says "GIVES BACK 2 HELD".
- **L4. Challenges remember what they are.**
  - The start draft is titled "CHALLENGE: THE LONG NIGHT".
  - The fight HUD shows the edge ("HOUSE CUT") over "CHALLENGE - ACT 1 FIGHT 1/5" for the whole run.
- **L5. `tools/shots/screens.cjs` is the right tool.** It took 40 s, caught nothing broken, and exits non-zero on a page error. Keep running it before every layout change.
- **L6. The new relics read well, and two of them work.**
  - HOT STREAK, and WHETSTONE BELT (a KNIGHT start pick: "EACH HIT YOUR SHIELD BLOCKS: EVERY SWORD +10 ON YOUR NEXT SWORD GROUP (MAX +40)") give KNIGHT a turtle-then-counter plan.
  - TOLL BOOTH's idea is good; its number isn't (D5).
- **L7. Big choices stay healthy:** 6 of 7 options win 32–40% when taken. Only SWEEP UP is dead (D9).
- **L8. Stability:** 216 tests, a clean tsc, and no page errors across the screenshot and feel sessions.

## 2. DISLIKES (ranked)

### D1. The JACKPOT BELL turns JOKER's meter into a loop that never empties. **HIGH** (balance + feel)

- **Numbers:**
  - JOKER + BELL is 63.3 vs a 9.7 baseline (+54). The next-best legendary on any machine is about +16 (round 10).
  - The round-10 ×1.25 trim didn't touch the cause.
- **The cause** (`fight.ts:598-603`):
  - A JOKER payoff spin is scored as `tier: 'triple'` (every cell "pays as a jackpot of itself").
  - The Bell's "a jackpot fills your meter" therefore fires on *every payoff*, so the meter refills on the spin that emptied it.
  - The previous attempt at this round measured 94% of payoffs as back-to-back.
- **What it looks like** (`e11_feel.cjs joker bell 2`, JOKER at act 1 fight 3, logged every 0.5 s):
  - Turn 3: the meter is full, "JACKPOTS READY! 100/100".
  - Turn 5: the payoff, enemy 320 → 99.
  - The same frame: the meter still reads **100/100 ARMED**, and stays there.
  - Fights are watch-only, so the meter's fill-and-release *is* the drama. With the Bell, it's a static bar.
- **JOKER's GREEN balance is built on that loop:**
  - closing it alone drops JOKER GREEN 17.2 → **6.3** (the Dealer kill rate falls from 51% to about 21%);
  - the Bell's tuning knobs alone (×2 instead of ×1.25, +25% wild fill) only get back to 7–10.
  - So JOKER's late boss HP was tuned *against* the loop, and both have to move together.
- **Proposal (measured; `e11_cab.ts 300 joker`, official-style N 600):**
  - The Bell doesn't refill JOKER's meter on a payoff spin; natural jackpots still fill it.
  - VAMP fix (D2).
  - JOKER `BOSS_MUL`: dealer 1.39 → 0.75, act3 0.55 → 0.35, mirror 3.7 → 2.8.

  | | JOKER + BELL row | JOKER W / G |
  |---|---|---|
  | now | 63.3 vs 9.7 | 45.8 / 17.2 |
  | loop closed only | 10.3 vs 4.7 | 43.7 / 6.3 |
  | **loop closed + D2 + HP (final plan)** | **32.7 vs 9.7** | **official tuesday 42.2 / 17.2** |

  - The Bell stays JOKER's best legendary (+23, vs PHOENIX's +16 in round 10) without being the run. The meter empties after each payoff again.

### D2. VAMP is still the auto-pick, and on JOKER it's the same bug shape: payoff cells heal ×3. **HIGH** (balance)

- **"Only VAMP" is 18.9 vs a 9.9 baseline.** Almost all of the +9 is two machines: JOKER 36.7 vs 9.7 and MIDAS 19.3 vs 9.0.
  - KNIGHT (+0.3) and TESLA (−0.7) are flat.
  - BRIAR's +7.7 is below its own no-charms row (D3).
- **JOKER, the cause** (`fight.ts:1123`): `copies = g.jackpot && g.reels.length === 1 ? 3 : 1`.
  - Every JOKER payoff cell is a one-cell jackpot group, so a single vamp cell on the payline heals 60 / 90 / 120 per payoff.
  - With the Bell loop, that happens every other spin.
  - The ×3 was meant for "3 WILDS pays one jackpot". The payoff is three separate one-cell groups, and each gets ×3.
- **Proposal:** a one-cell jackpot group heals ×1 (VAMPV=1).
  - Alone: JOKER vamp row 36.7 → 25.7, but JOKER G 17.2 → 12.5. So it ships with D1's HP change.
  - With D1, in the final plan: JOKER vamp 16.7 vs 9.7 (**+7**, was +27).
- **MIDAS: leave VAMP alone. It's MIDAS's only sustain, and every lever I tried costs MIDAS more than it costs VAMP:**

  | lever | MIDAS vamp row vs baseline | MIDAS W / G |
  |---|---|---|
  | now | 19.3 vs 9.0 | 37.2 / 16.2 |
  | VAMP once per spin (VAMPV=3) | 15.3 vs 6.3 | 33.8 / 15.7 |
  | MIDAS favours VAMP (FAVORS) | 21.7 vs 12.3 | 44.7 / 19.3 |
  | VAMP fits gold bars, half value | 19.7 vs 7.3 | 39.3 / 14.0 |

  - On a 360 HP machine with slow fights, heal-per-hit is the strongest thing, and GOLD (MIDAS's favoured charm, 50% of its charm offers) is weak there (5.7).
  - I'd accept "VAMP is MIDAS's charm", and lift MIDAS through its HP knobs (D4), not by taxing VAMP.
- **After D1 + D2** (final-plan rows): "only VAMP" averages 15.5 vs 9.9 (**+5.6**, was +9.0). MIDAS's +9 is most of what's left. GOLD +2.0, LUCKY +2.1 and KEEN −1.4 are all near baseline.

### D3. Signature-symbol charms: no blanket default. Every version I measured breaks a machine or BRIAR's pacing. **HIGH** (design; the agreed round-11 step)

- **The question:** should charms fit each machine's signature symbol (thorns, wilds, gold bars) by default?
- **The problem it was meant to fix is real, but it's mostly BRIAR's:** a no-charms drafter beats greedy on BRIAR by **+9 WHITE / +11 GREEN** (58.8/30.5 vs 49.5/19.2).
  - On JOKER, the gap is the Bell/VAMP loops (D1/D2). Once they're closed, charms beat no charms on JOKER (18.5 vs 13.7 GREEN).
  - On MIDAS, charms already win (16.2 vs 9.8).
- **Measured** (`e11_sigm.ts 300`; official-style W/G, then the no-charms drafter W/G):

  | rule | machine | W / G | no-charms W / G | verdict |
  |---|---|---|---|---|
  | (now) | BRIAR | 49.5 / 19.2 | 58.8 / 30.5 | charms are a trap |
  | GOLD fits thorns | BRIAR | **63.2 / 36.2** | 58.7 / 32.5 | ×2 the thorn bank is too much |
  | VAMP fits thorns | BRIAR | 56.3 / 25.2 | 56.2 / 30.2 | too strong, still a trap |
  | VAMP fits thorns, half value | BRIAR | 48.5 / 18.7 | 55.5 / 30.2 | neutral, still a trap |
  | GOLD fits thorns + BRIAR boss HP ×~2 | BRIAR | 46.7 / 22.7 | 42.5 / 17.8 | **fixes the trap**, but see pacing |
  | GOLD fits gold bars | MIDAS | **28.7 / 8.3** | 31.5 / 9.8 | a new trap: the drafter puts GOLD on chips |
  | VAMP fits gold bars | MIDAS | **61.8 / 27.7** | 35.3 / 9.3 | VAMP squared |
  | GOLD fits wilds | JOKER | 43.8 / 16.7 | 43.5 / 24.8 | does nothing |
  | VAMP fits wilds (with D1/D2) | JOKER | 40.7 / 19.3 | 28.0 / 13.5 | ≈ the D1/D2 control (43.5/18.5); not needed |

- **The one version that fixes BRIAR's trap costs pacing.** Under the full official tuesday 1000 (GOLD fits thorns, BRIAR house 1.6, mirror 22, dealer 2.6, act3 2.4, act2 1.1):
  - BRIAR is 45.8 / 22.1 (fine).
  - But act-2 fights go **17.7 → 24.6 turns** and act-3 regulars 15.7 → 19.3, on the slowest machine in the game.
- **Recommendation:** don't make signature symbols charmable by default. The two charms that fit are multipliers or heals, and on a meter symbol both compound with the meter.
  - If the user still wants it, the right shape is **one new charm per machine that feeds the meter at a fixed rate** (e.g. BRIAR "THORNY: this thorn banks +10"). That's content, for a later round, with this table as its gate.
  - Keep GRAFT and STACKED DECK as the relic way in.
- **BRIAR's trap, cheaply:**
  - leave it this round (BRIAR is the strongest machine either way);
  - next round, measure fewer charm cards in BRIAR's drafts (favours: vamp → none) before any rules change.

### D4. MIDAS is the lowest GREEN machine (14.9), and it dies before the Dealer. **MED** (balance)

- tuesday: MIDAS reaches the Dealer 29.3% (the others 33–39) and dies in 9.0% of act-3 regulars (the highest). Its Dealer kill rate (50.9) is normal.
- So the gap is act 3's regulars plus the Dealer's HP, not the vault.
- **Round 10's MIDAS act3 knob is floored.**
  - Act-3 regular HP is `max(e.hp, act3Power × BOSS_MUL.act3 × power)` (`run.ts:808`), and at MIDAS's 0.12 the floor already binds.
  - act3 0.10 and 0.08 measured **identical** to the digit (tuesday 39.1 / 15.6).
- **Proposal (tuesday 1000, under the full plan):**
  - MIDAS dealer 1.05 → 0.9;
  - MIDAS act-3 regulars may go to **0.75× their curve** (a per-machine floor; in my scratch copy, `e.hp * 0.75` for MIDAS only).

  | variant | MIDAS W / G | reach Dealer | act-3 regular deaths |
  |---|---|---|---|
  | now | 39.2 / 14.9 | 29.3 | 9.0 |
  | dealer 0.9 | 39.1 / 15.6 | 29.6 | 9.0 |
  | + floor 0.85 | 39.1 / 16.7 | 32.9 | 7.2 |
  | **+ floor 0.75** | **39.1 / 17.2** | **35.0** | **5.9** |

  - WHITE doesn't move (the floor is act 3 only). Check endless: its loops size regulars the same way.
  - Not FAVORS=vamp: it lifts MIDAS WHITE by 7.5 too.

### D5. TOLL BOOTH is dead by construction. **MED** (balance)

- **Why:** liens exist only between THE REPO MAN (fight 4) and the boss (fight 6). So TOLL BOOTH pays on about 2 wins per act, at about 1.5 chips a win: about 6 chips a run.
- **Measured** (`+toll` row, start holding it; scratch copy):

  | variant | +toll vs baseline |
  |---|---|
  | now (+1 per lien per win) | 11.5 vs 9.9 |
  | +2 per lien per win | **14.0** |
  | +1 per lien per win, and +3 per cell when he takes it | 14.3 |
  | +3 per lien per win | 15.8 |
  | +1 per lien per win, and +5 per cell when he takes it | 15.1 |

- **Proposal: +2 per lien per win** ("AFTER EACH WIN: +2 CHIPS FOR EVERY LIEN THE REPO MAN HOLDS").
  - 14.2 vs 9.9 under the full plan, inside the 12–15 relic band. It's one number, and it keeps the "keep the lien or pay it off" decision.

### D6. THE REPO MAN gate: fight-4 deaths 2.8–3.3% sit under the 4–7% gate. **MED** (balance; push back on the gate)

- `e11_a4.ts 400`: deaths at fight 4 are KNIGHT 3.0, TESLA 2.8, BRIAR 3.5, JOKER 3.5, MIDAS 1.3 (avg 2.8).
- The drop is the agreed post-fight heal (20% → 25%): everyone arrives fuller.
- **Proposal:** REPO MAN HP (`BOSS_MUL.gate`) KNIGHT 1.15 → 1.3, TESLA 0.85 → 1.0, BRIAR 1.4 → 1.55, with JOKER and MIDAS unchanged.
  - Deaths 2.8 → **3.6** (KNIGHT 4.3, TESLA 3.5, BRIAR 5.5, JOKER 3.5, MIDAS 1.3), and both tuesday gates hold.
- **Push back:** don't chase 4.0 by raising MIDAS's gate.
  - +0.15 for everyone gave 4.0, but cost MIDAS 0.7 GREEN, and MIDAS is the lowest machine.
  - THE REPO MAN's job is the *take* (round-9 D3), not deaths. Re-state the gate as **3–6%** to match the bigger heal.

### D7. THE LONG NIGHT is the steepest step on the ladder, and it falls on KNIGHT, the machine with nothing to halve but VAMP. **MED** (balance)

- **The ladder** (challenges 400): 36.3 / 32.3 / 33.5 / 31.5 / 28.0 / **10.3 / 6.5**.
  - THE LONG NIGHT takes plain KNIGHT GREEN from 15.8 to 6.5 (**−59%**).
  - ALL OF IT costs MIDAS −31% (15.0 → 10.3).
- **Is 6.5 too hard?** For a final rung, a bit. A player who cleared six challenges beats the greedy bot, but at 6.5 the last title is mostly a reroll grind.
  - The machine matters more than the edge: the same challenge on TESLA is 2.3, and on JOKER 6.3.
- **Under the full plan it's already softer.** The REPO MAN and Bell changes shift the seeds, so I re-measured `e11_chal.ts 400` at each HOUSE CUT value:

  | HOUSE CUT | THE LONG NIGHT | ALL OF IT |
  |---|---|---|
  | 0.5 (now) | **8.8** | 11.3 |
  | 0.6 | 10.3 | 11.3 |
  | 0.65 | 11.3 | 11.3 |

  - Before the plan, 0.65 measured 8.3 and 0.75 measured 10.5.
- **Proposal: no change now.** 8.8 / 11.3 is a fair last step (0.78×).
  - The 6.5 → 8.8 shift is about 2 SE at N 400. Re-measure at N 800 after the build.
  - If it's ≤ 7 again, HOUSE CUT → 0.6 (10.3) is the measured fallback: one number in `run.ts:601`, plus the card text.
- **Also:** FAST COMPANY (33.5) is above HEAVY HITTERS (32.3), so steps 2–3 are swapped. Within noise; swap the order if the next measure agrees.

### D8. This week's weekly is challenge #1 again, minus one edge. **LOW** (design)

- CHALLENGES (screenshot 02): "THE WEEKLY CHALLENGE 2026-W40: JESTER JAX - JOKER ... GLASS JAW: -10% MAX HP. START WITH 0 CHIPS", directly above "1 GLASS JAW: JOKER. GLASS JAW + FAST HANDS".
- The round-10 rule ("never a challenge's exact setup") holds to the letter, but the player reads it as the same thing.
- **Proposal:** the rule should be "never a challenge's machine plus any of its edges". Grep-level change in `weekly()`.

### D9. Small things. **LOW** (UX)

- WHETSTONE BELT's card text is drawn at a smaller size than its neighbours' (THE LONG NIGHT's start draft, next to CHAINMAIL and BANDAGE): the shrink-to-fit kicks in. Cut the text to "BLOCKED HITS SHARPEN YOUR NEXT SWORD GROUP: +10 PER SWORD (MAX +40)".
- THE REPO MAN preview says "UNTIL THE BOSS FALLS" twice (subtitle and rule). Drop it from the subtitle: "REPOSSESSES YOUR BEST CELL."
- SWEEP UP: taken 63 times in about 10,500 big choices (0.6%), its third round dead. Batch it with D3's content round.

## 3. Round 10 fixes: landed or not

| # | Agreed fix | Status | Evidence |
|---|---|---|---|
| 1 | D2 layout: four collisions, REPO preview, 18-row dividers, `screens.cjs` | **Landed** | All 10 shots are clean (L3) |
| 2a | `spiked` greedy value 6.5 | **Landed** | The official tables now include BULWARK |
| 2b | VAMP: one heal per group | **Landed, not enough** | "Only VAMP" 21.3 → 18.9 vs 9.9 (+9). The remaining cause is the ×3 on one-cell jackpots (D2) |
| 2c | KEEN +N per sword | **Landed** | 7.4 → 9.4 (≈ baseline 9.9) |
| 2d | BULWARK 100/125/150% | **Landed** | Per STATE; not re-measured |
| 2e | CHARGED +10/15/20 | **Landed** | TESLA only-charged ≈ baseline |
| 3 | BELL on JOKER ×1.25 | **Didn't fix it** | 77.5 → 63.3. The meter refill on payoff spins is the loop (D1) |
| 3 | FANG 10 on TESLA, ROD +10, BASH full | Landed | Per STATE (TESLA FANG 36.7 → 24.2); not re-measured |
| 4 | HOT STREAK, WHETSTONE BELT, TOLL BOOTH | **Landed; TOLL weak** | TOLL 11.5 vs 9.9 (D5). WHETSTONE's card text shrinks (D9) |
| 6 | D3: offline copy on the name screen | Not re-checked | – |
| 7 | D7: dedupe heal cards; D8: twist on the HUD, NEW BEST only after a best | **Landed** | The HUD shows "HOUSE CUT" all run. The dedupe has a unit test (expert10.test.ts) |
| 8 | D6: more weekly pairs, never a challenge's exact setup | **Landed to the letter** | W40 is challenge #1 minus FAST HANDS (D8) |
| 9 | D4: preview timing; the boss names what it gives back | **Landed** | "REPO FROM TURN 1, THEN EVERY 3"; "BEAT IT AND YOU GET BACK: GOLD SWORD R1, SHIELD R2" |
| 10 | D9: the daily row uses the machine name | **Landed** | "DAILY: THORN + HIGH ROLLERS" |
| – | MIDAS: mirror 1.9, dealer 1.05, act3 0.12, act2 0.55 | **Partly a no-op** | Act-3 regular HP is `max(e.hp, power × act3)` (`run.ts:808`). At MIDAS's act3 0.12 the floor binds: 0.10 and 0.08 measured identical (39.1 / 15.6) |
| – | Post-fight heal 25%, and a third of it in act 3 | Landed | It's why fight-4 deaths fell to 2.8–3.3% (D6) |

## 4. PROPOSED PLAN

Every item below was measured stacked with the ones above it. The final row is the official `tuesday.ts 1000` under all of them (`e11_tuesday.ts`; TOLL and the MIDAS floor in the scratch copy). Build in this order, and re-measure with the real code.

| # | Change | Where | Before → after (measured) |
|---|---|---|---|
| **1** | **The JACKPOT BELL doesn't refill JOKER's meter on a payoff spin** (natural jackpots still fill it; ×1.25 stays). Card text unchanged: a payoff isn't a jackpot you landed | `fight.ts:598` (skip when `score.jackpots`) | JOKER + BELL 63.3 → **32.7** vs 9.7. Alone, JOKER G 17.2 → 6.3, so ship with #2 and #3 |
| **2** | **VAMP: a one-cell jackpot group heals ×1, not ×3** (JOKER's payoff cells) | `fight.ts:1123` | JOKER only-VAMP 36.7 → **16.7**. "Only VAMP" avg 18.9 → **15.5** (+9.0 → +5.6 over baseline) |
| **3** | **JOKER boss HP:** dealer 1.39 → 0.75, act3 0.55 → 0.35, mirror 3.7 → 2.8 | `run.ts BOSS_MUL.joker` | JOKER W/G 42.5/17.2 → **42.2/17.2**; JOKER Dealer kill 51.5 → 44.8 (watch it) |
| **4** | **MIDAS:** dealer 1.05 → 0.9, and its act-3 regulars may go to 0.75× their curve (the act3 knob is floored today) | `run.ts BOSS_MUL.midas`, `baseEnemyHp` (a per-machine floor) | MIDAS G 14.9 → **17.2**; reach Dealer 29.3 → 35.0; act-3 regular deaths 9.0 → 5.9; W 39.2 → 39.1 |
| **5** | **REPO MAN HP:** KNIGHT 1.15 → 1.3, TESLA 0.85 → 1.0, BRIAR 1.4 → 1.55 (not JOKER or MIDAS). Re-state the fight-4 gate as **3–6%** | `run.ts BOSS_MUL.*.gate`, STATE | Fight-4 deaths 2.8 → **3.6** (KNIGHT 4.3, TESLA 3.5, BRIAR 5.5, JOKER 3.5, MIDAS 1.3) |
| **6** | **TOLL BOOTH +2 chips per lien** per win (card: "AFTER EACH WIN: +2 CHIPS FOR EVERY LIEN THE REPO MAN HOLDS") | `run.ts:1009`, `relics.ts:63` | +toll 11.5 → **14.2** vs 9.9 (relic band 12–15) |
| 7 | **Signature-symbol charms: don't ship a default.** Hold for a content round: one new meter-feeding charm per machine, gated by D3's table (no-charms drafter ≤ greedy, and act-2 t/fight within +10%) | – | Measured and rejected: GOLD on thorns BRIAR 63.2/36.2; GOLD on gold bars MIDAS 28.7/8.3; the BRIAR fix costs act-2 17.7 → 24.6 turns |
| 8 | **THE LONG NIGHT: no change.** Re-measure at N 800 after #1–#5. If ≤ 7%, HOUSE CUT 0.5 → 0.6 | `run.ts:601` (only if needed) | Under the plan: 6.5 → **8.8** (ALL OF IT 11.3). Fallback 0.6 → 10.3 |
| 9 | Weekly: never a challenge's machine plus any of its edges | `meta.ts weekly()` | W40 (JOKER + GLASS JAW) would re-roll |
| 10 | WHETSTONE BELT shorter text; REPO MAN subtitle drops "UNTIL THE BOSS FALLS" | `relics.ts`, `enemies.ts` | Screens (`screens.cjs` plus a start-draft shot) |

**Official table, current → full plan (#1–#6), tuesday 1000:**

| machine | WHITE | GREEN | Dealer kill |
|---|---|---|---|
| KNIGHT | 42.9 → 41.3 | 17.0 → 17.4 | 47.0 → 50.4 |
| TESLA | 46.9 → 47.2 | 17.0 → 16.7 | 49.4 → 49.0 |
| BRIAR | 48.8 → 47.5 | 18.8 → 20.4 | 48.2 → 50.7 |
| JOKER | 42.5 → 42.2 | 17.2 → 17.2 | 51.5 → 44.8 |
| MIDAS | 39.2 → 39.1 | **14.9 → 17.2** | 50.9 → 49.1 |
| **AVG** | **44.1 → 43.5** (gate 41–45) | **17.0 → 17.8** (gate 16–19) | 49.4 → 48.8 |

- The GREEN spread narrows from 14.9–18.8 to 16.7–20.4.
- BRIAR's +1.6 GREEN comes only from the gate change's seed shift (about 1.3 SE). Re-check it after the build, and trim BRIAR's dealer (1.3) if it holds above 20.
- Big choices are unchanged (SWEEP UP still 0.6%).

**Charm and relic rows, current → full plan** (`e11_rows.ts 300`, GREEN, avg | KNIGHT TESLA BRIAR JOKER MIDAS):

| row | current | plan |
|---|---|---|
| baseline | 9.9 \| 10.0 9.0 12.0 9.7 9.0 | 9.9 \| 8.0 10.0 10.7 9.7 11.0 |
| no charms | 11.5 \| 6.7 7.7 22.0 17.3 3.7 | 10.1 \| 6.3 9.3 22.7 **7.7** 4.3 |
| only VAMP | **18.9** \| 10.3 8.3 19.7 **36.7** 19.3 | **15.5** \| 10.3 9.0 21.3 **16.7** 20.0 |
| only GOLD | 13.5 | 11.9 |
| only LUCKY | 13.0 | 12.0 |
| only KEEN | 9.4 | 8.5 |
| + BELL | 28.9 \| JOKER **63.3** | 22.8 \| JOKER **32.7** |
| + TOLL | 11.5 | **14.2** |

- JOKER's no-charms row falls from 17.3 to 7.7: with the loops closed, charms are worth taking on JOKER again.
- BRIAR's no-charms row (22.7) is the one structural gap left (item 7).

**Not now:** D3's content round (signature charms, SWEEP UP), BRIAR's charm offers (favours: vamp → none, to be measured next round), pacing.

## AGREED PLAN (2026-10-03)
Built as proposed: #1–#6, #9, #10. #7 held for a content round. #8 not needed (THE LONG NIGHT 8.8 under the plan).
The fight-4 gate is restated as **3–6%**. Measured on the real code: see STATE iteration 68.
