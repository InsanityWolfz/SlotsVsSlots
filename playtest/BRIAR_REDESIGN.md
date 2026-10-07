# BRIAR redesign: she has to swing (2026-10-07, expert playtester)

User: "if they can always block their opponent they can never get an attack in." Measured, it's worse than act 1.

## What's actually wrong (trace: `tools/sim/_briar_trace.ts`, first 4 fights; `_briar_probe.ts` adds t2/t3)
| WHITE greedy, N400 | act-1 turns | act-2 turns | act-3 turns (GREEN) | rounds with 0 damage | longest dry spell | chips/fight |
|---|---|---|---|---|---|---|
| BRIAR today | 21.0 | **65.1** | **56.2** | **63%** | 20 rounds | 19.7 |
| KNIGHT / TESLA | 13.0 / 12.0 | 11.6 / 9.5 | 8.3 / 10.2 | - | - | 9.9 / 7.7 |

- She banks ~32 per spin but deals ~25: in two of every three rounds nothing she owns hits the enemy. Act 2 is the
  real horror (65 turns), not act 1.
- Her slow fights are also an **economy exploit**: 2x the chips per fight of anyone else (long fights = more pays,
  more chips). Shorten her fights and her shop shrinks; every option below needs a BOSS_MUL refit for that.
- Sizing: `machinePower` reads her as ~0 (mirror 0, act3 0, dealer 1,228 median) because her damage only fires when
  the dummy gets through 6 shields. BOSS_MUL.thorn (mirror **200**) is a hand-fit to that blindness.
- Root problem, confirmed: one bank, one trigger, and the trigger is "lose the defence". Her offence must have a
  trigger she owns.

## Option A: SHED (her thorns lash out on her own spin)  ← recommended
**Rule text:** `THORNS ADD UP. EACH SPIN, HALF OF THEM LASH OUT. A HIT THAT GETS THROUGH FIRES THE REST. 300 HP.`
- Hook: end of her spin, before `this.last[side]` (fight.ts:729): fire `unitsUp(bank * THORNS.shed)` through
  `thorns(me, foe, events, 1, fixed)` (fight.ts:1481, new `fixed` arg: exact amount, no once-per-turn guard).
  Through-hit full volley (fight.ts:1600) unchanged; ROSE HIP, OVERCHARGE, the Mirror's volleyCarry all still apply.
- Theme: still retaliation-first (the big moment is a hit getting through her wall), but the vine is never idle.
  A fat bank still exists: at shed 0.5 it carries half forward, so a hit through after a thorn jackpot is a big pop.
- Sizing: the dummy now sees her (power medians **825 / 7,063 / 9,797** vs 0 / 0 / 1,228). Sizing becomes honest,
  so BOSS_MUL.thorn moves toward the other machines: mirror 200 -> ~40-48, act2 3.5 -> 0.8, dealer 3.2 -> ~3.6-4.
  Re-measure `POWER_REF.thorn` (power_ref.ts) once it ships; the probe kept today's ref as the pivot.
- Fight length: every act lands at ~14-15 turns.

## Option B: PARRY (a blocked hit throws back what you blocked)
**Rule text:** `THORNS ADD UP. A BLOCKED HIT THROWS BACK WHAT YOU BLOCKED; A HIT THAT GETS THROUGH FIRES THEM ALL.`
- Hook: in `hit()` after the through-hit volley (fight.ts:1605): a fully blocked hit fires
  `min(bank, unitsUp(blocked * THORNS.parry))` from the bank. The purest "touch it, I dare you" rule.
- Sizing: still nearly blind (power medians 47 / 42 / 48): parries are capped by the dummy's small sword hits.
  BOSS_MUL stays in today's hand-fit regime (mirror ~150-200).
- Problems: volleys fire on the ENEMY's turn, so she still never "gets an attack in" on her own spin (the literal
  complaint); 22% dry rounds; act 2 / act 3 stay long (23 / 25 turns). It overlaps KNIGHT's RIPOSTE (blocked hit
  returns half). Better as a **BRAMBLE WALL rework** than as her core.

## Option C: BLOOM (a full bank fires on her spin) / thorn jackpot fires the bank
**Rule text:** `THORNS ADD UP. AT 40 THEY BLOOM AND HIT; A HIT THAT GETS THROUGH FIRES THEM TOO.`
- Hooks: same end-of-spin block (fight.ts:729): `THORNS.bloom` (threshold) or `THORNS.triple` (a thorn jackpot fires).
- Untuned: bloom 40 -> 44% dry rounds, t1 17.8; triple -> 57% dry, t1 19.2. Thresholds and jackpots are lumpy: the
  dry spells shrink but don't go away. Sizing reads bloom like shed (1,054 / 6,293 / 9,600). Not recommended.

## Probes (`tools/sim/probe.ts` / `_briar_probe.ts thorn N`, greedy; gates WHITE 41-45, GREEN 16-19)
| variant | N | WHITE | House | Mirror | f4die | GREEN | Dealer | t1 | t2 | t3 |
|---|---|---|---|---|---|---|---|---|---|---|
| today | 400 | 45.8 | 80.2 | 91.0 | 4.3 | 19.5 | 55.3 | 21.0 | 65.1 | 56.2 |
| shed 0.5, untuned | 400 | 35.5 | 76.7 | 74.7 | 6.8 | 28.5 | 92.7 | 18.0 | - | - |
| shed 0.34, untuned | 400 | 41.3 | 78.9 | 80.1 | 6.8 | 30.5 | 89.1 | 18.4 | - | - |
| parry 1, untuned | 400 | 44.5 | 77.3 | 94.2 | 6.0 | 21.3 | 55.2 | 20.2 | - | - |
| bloom 40, untuned | 400 | 32.5 | 77.1 | 68.4 | 6.3 | 24.8 | 91.7 | 17.8 | - | - |
| triple, untuned | 400 | 36.0 | 80.1 | 74.6 | 4.8 | 26.3 | 84.0 | 19.2 | - | - |
| **A: shed 0.5** act1 .7 act2 .8 house 2.6 mirror 40 dealer 3.6 | 1000 | **41.3** | 61.2 | 72.6 | 3.0 | **18.2** | 51.6 | **14.2** | **15.0** | **14.9** |
| A, spread: house 2.2 mirror 48 dealer 3.6 | 1000 | 41.2 | 67.5 | 65.6 | 3.0 | 20.4 | 56.4 | 14.2 | 15.6 | 14.5 |
| **B: parry 1** act1 .65 act2 .7 house 2.7 act3 1.8 dealer 2.8 | 800 | **44.5** | 59.5 | 78.9 | 2.5 | **18.1** | 53.1 | 15.5 | 23.4 | 24.6 |

Notes on the fits:
- act1 alone can't fix length: income caps her at ~31 a spin. Every option needs act1 0.9 -> 0.65-0.7.
- Cutting act 2 (3.5 -> 0.8) costs her ~40% of her chips, so the Mirror and Dealer get *harder* (Mirror 93 -> 69 in
  one step). The refit moves the multipliers down, not up.
- With shed, the Mirror is now sensitive to its multiplier (40 -> 70 moved it 73 -> 56): sizing finally works.
- Open: the A fits lean on the House (61-68% vs ~88% for KNIGHT/TESLA). The "spread" row is the better start;
  dealer ~4.0 should pull GREEN into the gate. f4die 3.0 (B: 2.5, just under the gate: shorter act 1 = fewer deaths).

## Relic fallout (for whichever option ships)
- **SHIELD BASH**: unchanged and still hers (leftover shield hits on her turn start, fight.ts:1133). It now stacks
  with the shed on her own turn: shield + thorns both swing. Watch its solo number after the refit.
- **BRAMBLE WALL**: rework into PARRY (option B's rule) so blocking has its own payoff without draining the bank.
- **HEDGE / CACTUS / ROSE HIP**: unchanged rules; ROSE HIP fires on every shed (cap 20 a volley): re-measure solo.
- **Charm text**: THORNY still "banks thorns"; nothing else changes. No hints added anywhere.

## Recommendation
Ship **A: SHED 0.5**. It's the only option that answers the actual complaint (she swings on her own spin, every
spin with a bank: 11% dry rounds vs 63%), it fixes act 2 and act 3 too (65 / 56 turns -> 15 / 15), it keeps the
retaliation fantasy (the full volley on a hit through is still her biggest moment), and it makes `machinePower`
honest, so BRIAR stops being the hand-tuned 200x outlier every balance pass trips on. Then rework BRAMBLE WALL into
PARRY. Before shipping: N1000 table.ts refit from the "spread" row, re-measure POWER_REF.thorn, solo-check SHIELD BASH
/ ROSE HIP / BRAMBLE / HEDGE, and an endless check (her loop-5 rate was already high).

## Code left in the tree (uncommitted, all OFF by default, tests 238 green, baseline probe identical)
- `src/core/fight.ts`: `THORNS.bloom / shed / parry / triple` (0 = today), `thorns(..., fixed)`, hooks at :729, :1605.
- `tools/sim/_briar_trace.ts` (act-1 anatomy), `_briar_probe.ts` (probe + t2/t3), `_briar_power.ts` (power medians).
