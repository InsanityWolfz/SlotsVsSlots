# EXPERT PLAYTEST 11: likes and dislikes (2026-10-03)

Build: `900e0cf` (iteration 67: the EXPERT_PLAYTEST_10 plan, built). I didn't edit `src/` or `tests/`.

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

(filled below)

## 2. DISLIKES (ranked)

(filled below)

## 3. Round 10 fixes: landed or not

(filled below)

## 4. PROPOSED PLAN

(filled below)
