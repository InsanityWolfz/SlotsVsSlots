# BRIAR: the "she never attacks" problem (2026-10-07)

User playtest: "enemy hitting their shield resets their thorns so they can never get an attack in if they can always
block their opponent."

## What the code actually does
- The bank is NOT reset by a blocked hit. A trace of 60 GREEN fights found 357 blocked hits while she held a bank and
  0 unexplained drops (scratchpad briar_trace.ts).
- But thorn symbols only BANK. Her only damage is the volley, and the volley fires only on a hit that gets through
  (THORNS.onBlocked 0, iteration 80). If her shields block everything, she never deals damage (except SHIELD BASH).
- BRIAR act-1 fights average 21 turns (TESLA ~11). That's the "never attacks" feel, measured.

## Probes (thorn N500, probe.ts; knobs THORNS.direct / blockShare / blockCap, all 0 = today)
| variant | WHITE | GREEN | Dealer | act-1 turns |
|---|---|---|---|---|
| today | 46.0 | 18.6 | 53.8 | 21.0 |
| thorn groups hit 30% now, bank the rest | 37.0 | 20.0 | 69.4 | 21.2 |
| thorn groups hit 50% now | 24.8 | 13.4 | 77.0 | - |
| blocked hits fire 20% of the bank (cap 10% HP) | 44.4 | 11.6 | 30.4 | - |
| blocked hits fire 35% | 45.2 | 13.8 | 37.1 | 19.8 |
| direct 30% + blocked 20% | 37.0 | 14.4 | 48.3 | - |

Read: direct hits make her bosses bigger (sizing finally sees her damage: BOSS_MUL.thorn was fitted to ~0 power) and
shrink her volleys; blocked-hit volleys drain the bank so the one big volley that beats the Dealer never comes.
One bank feeding both an offence and a defence trigger is the root problem. Needs a redesign, not a knob.
