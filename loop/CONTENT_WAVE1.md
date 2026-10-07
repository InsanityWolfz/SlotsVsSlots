# Content wave 1: draft (2026-10-07)

Plan: `loop/ARCHETYPES_PLAN.md` §2 and step 6, plus the playtester's list in `playtest/ARCHETYPES_REVIEW.md` §2.

Rules:
- One enabler and one payoff for two archetypes per machine. That's about 20 items, and retargets count.
- Archetypes are planning only. No archetype name ever appears in the game.
- No machine writes on enemy reels. User-facing words are "Slot Machines" and "Charms".
- Card text stays around 8 words and gives no decision hints.
- Every item is measured with an "only X" sim row before it ships. Boss sizing (`machinePower`) only sees damage, so
  a denial or defence item must also carry a damage-side payoff, or be counted in sizing.

| # | Machine | Archetype | Role | Name | Text (draft) |
|---|---|---|---|---|---|
| 1 | KNIGHT | BULWARK | enabler | TOWER SHIELD | HALF YOUR LEFTOVER SHIELD STAYS NEXT TURN |
| 2 | KNIGHT | BULWARK | payoff | RIPOSTE | A BLOCKED HIT RETURNS HALF OF WHAT YOU BLOCKED |
| 3 | KNIGHT | EXECUTIONER | enabler | HEADSMAN | SWORDS +1% OF YOUR MAX HP EACH |
| 4 | KNIGHT | EXECUTIONER | payoff | COUP DE GRACE | UNDER 15% HP, ENEMIES TAKE X2 (BOSSES X1.5) |
| 5 | CASSIDY | HOARDER | enabler | NEST EGG | START EACH FIGHT WITH HIGH ROLLER +1 PER 10 CHIPS |
| 6 | CASSIDY | HOARDER | payoff | COMPOUND | HIGH ROLLER CAPS AT X4 (NOT X3) |
| 7 | CASSIDY | RAINMAKER | enabler | CLOUD SEEDING | YOUR FIRST RAIN EACH FIGHT IS FREE |
| 8 | CASSIDY | RAINMAKER | payoff | DOWNPOUR | EACH RAIN THIS FIGHT: NEXT RAIN +10% |
| 9 | BRIAR | RETALIATION | enabler | HEDGE | HITS THAT GET THROUGH BANK +25% THORNS |
| 10 | BRIAR | RETALIATION | payoff | BRAMBLE WALL | YOUR VOLLEYS IGNORE SHIELD |
| 11 | BRIAR | BLEED | enabler | BARB | THORN HITS LEAVE 1 BLEED (10 A TURN) |
| 12 | BRIAR | BLEED | payoff | OPEN WOUND | BLEED IGNORES SHIELD AND STACKS +5 |
| 13 | TESLA | OVERLOAD | enabler | LIVE WIRE | LIGHTNING +30%; EACH STORM COSTS 5% HP |
| 14 | TESLA | OVERLOAD | payoff | MELTDOWN | LIGHTNING +1% PER 1% HP MISSING (MAX +50%) |
| 15 | TESLA | FARADAY | payoff | CAPACITOR | LEFTOVER SHIELD CHARGES LIGHTNING (1/4) EACH TURN |
| 16 | TESLA | EMP | payoff | PULSE | A STORM DELAYS THEIR ABILITY 1 TURN (BOSS: ONCE) |
| 17 | JAX | CARDS | payoff | FULL HOUSE | CARD JACKPOTS WITH A WILD PAY X2 |
| 18 | JAX | CHAOS | payoff | WILD WHEEL | THE 3-WILD WHEEL PICKS TWICE |
| 19 | shared | WILD/LUCKY | payoff | WILD CARD | EACH WILD ON YOUR PAYLINE: +1 METER |
| 20 | shared | WILD/LUCKY | enabler | LOADED REEL | A WILD ON REEL 2 COUNTS FOR BOTH GROUPS |

Open questions for the playtester:
- Does each item pass the "different resource or different win" rule?
- Which items need a damage-side payoff for sizing (PULSE, TOWER SHIELD, NEST EGG)?
- Which items are engine-trivial and which need new systems (BLEED is a new status)?
- Should JAX get a second enabler?
- Does OVERGROWTH stay cut? (The user said no machine affects enemy reels.)
