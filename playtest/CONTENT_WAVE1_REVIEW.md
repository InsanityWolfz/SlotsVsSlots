# CONTENT_WAVE1 review (2026-10-07)

Reviewer: expert playtester, by reading the code (`fight.ts`, `relics.ts`, `run.ts`, `cabinets.ts`, `charms.ts`,
`scoring.ts`). No sims run, no code edited. Line numbers are from today's `src/core/fight.ts` unless marked.

**Verdict:** 12 KEEP (several with a number or wording fix), 5 CHANGE, 3 CUT.
- Three drafts are **already in the game under another name**: BRAMBLE WALL, FULL HOUSE and NEST EGG.
- One draft breaks boss sizing outright: HEADSMAN.
- Replacements keep the wave at 20.
- The 10 items marked **[FIRST]** are trivial-risk, the sizer can see them, and they cover all five machines.

## 0. Things that already exist (checked in code)
| Question | Answer in the engine | Consequence |
|---|---|---|
| Does leftover shield persist? | **No.** `resetShield` (1085-1108) zeroes it at your own turn start (509), after SHIELD BASH (full) and CHAINMAIL (10%) read it. | TOWER SHIELD is new. Each kept point gets bashed again next turn (see #1). |
| HIGH ROLLER's cap? | x3, reached at **40 chips**: `highRollerMul` = 1 + chips/20, quarter steps (fight.ts 39, 58). | COMPOUND (x4) only matters at 60+ chips. |
| Does the HIGH ROLLER bar start part-full from chips? | **Yes.** `vaultBase` (432) gives 1 pip per 2 chips held, up to 9 of 10 pips; the constructor applies it (~350). | NEST EGG as drafted is a duplicate. |
| Do volleys pierce? | **Yes.** `thorns()` calls `damage(attacker, bank, true)` (1406). | BRAMBLE WALL as drafted is a no-op. |
| A x2 for wild matches? | **PRISM**: "A MATCH THAT USES A WILD PAYS X2", any symbol (score() ~929). | FULL HOUSE is a narrower PRISM, and they stack to x4. |
| Lightning +30%? | **OVERCHARGE** on TESLA: `OVERCHARGE.lightning` 0.3, applied in `gainEnergy` (1527). | LIVE WIRE needs a different number. Its HP cost must be what sets it apart. |
| An ability delayed by 1 turn? | **GOLDEN HOURGLASS** (legendary): `effectiveAbility` adds `every + 1`. | Storms land nearly every turn, so PULSE as drafted is a second, common HOURGLASS. |
| Under-half-HP payoffs? | **UNDERDOG** (x1.5 under 50%). **EXECUTIONER** `hone` (x3 keen swords, enemy under 50%, 943). | MELTDOWN overlaps UNDERDOG. COUP DE GRACE is a weak copy of `hone`. |
| Shield → lightning? | **FARADAY CAGE**: 1/4 of shield *gained* (1188-1195). | CAPACITOR charges again from the same shield. Fine, but it stacks. |
| Bonus meter fill per wild? | **STACKED DECK**: charmed wilds fill x2 on JAX (~688). | Leave WILD CARD off JAX's pool, or give JAX a different number. |
| Enemy shields during its own turn? | They reset at the enemy's turn start (509, `ownTurnStart`). | Bleed that ticks right after that reset already ignores shields, so "ignores shield" costs nothing. |
| Sizing dummy (run.ts 847-871) | Player HP **999,990**. `chipsHeld` capped at **20**. Enemy has no ability, swords 8 / shields 4. It counts player `attack` and `specialFire` hpDamage only. | %-of-your-HP, missing-HP, HP-cost, chip-cap and ability effects are all misread. BRIAR reads ~0 (STATE it.80). |

## 1. Item by item
Columns:
- **Size?** Does `machinePower` see the item? Y = yes, N = no, X = it sees a wrong value.
- **Risk:** T = trivial, M = moderate, N = new system.

| # | Item | Verdict | Exact rule and hook | Size? | Risk | Start |
|---|---|---|---|---|---|---|
| 1 | TOWER SHIELD (KNIGHT) | **KEEP**, with a cap: the real "turtle" enabler | `resetShield` 1105: after BASH and CHAINMAIL, `keep = min(round(held*share), cap)`, then reset to `keep`, not 0. With SHIELD BASH the kept part bashes again next turn (a geometric x2), so cap it. | N alone. Y through BASH/RIPOSTE. OK: BULWARK's damage side is #2 and BASH. | T | share 0.5, cap 20% max HP (60) |
| 2 | RIPOSTE (KNIGHT) **[FIRST]** | **KEEP**: shield → damage, and it completes BASH. A blocked hit pays now; leftover shield pays at turn start. | `hit()` after 1491: `if foe is player && riposte && h.blocked > 0`, then `hit(foe, me, unitsUp(blocked*share))`. It can't loop (enemies never riposte). WHETSTONE BELT also reads `blocked` (1494): fine. The Mirror won't reflect it (enemy-turn damage), like volleys before it.80. Recheck `BOSS_MUL.knight.mirror`. | Y (the dummy hits into your shields) | T | 0.5 |
| 3 | HEADSMAN (KNIGHT) **[FIRST]** | **KEEP**, raise the number, and **fix sizing first** | score(), next to WAR DRUM (919): `if has('headsman') && g.symbol==='sword'`, then `g.base += unitsRound(me.maxHp*pct) * g.reels.length`. Key on `sword` only: `BLADES` includes JAX's `ace`. **BUG-risk:** the dummy's maxHp is 999,990, so 1% = +10,000 a sword and every boss gets huge. Pass the real HP to the sizer (e.g. `cfg.player.sizeHp = run.player.maxHp`, used here). | X → Y after the fix | T (+ sizing fix) | 2%: +6 a sword at 300 HP (sword L2 = 13). 1% is +3, which nobody feels. |
| 4 | COUP DE GRACE (KNIGHT) | **CHANGE**: x2 on the last 15% is ~7% of an enemy's HP, it duplicates `hone`, and it isn't tied to the archetype's resource | **New:** "SWORDS FINISH ENEMIES UNDER 20% OF YOUR MAX HP" (bosses: x1.5 instead). In `resolveGroup` sword (1166), after `hit`: if the foe isn't a boss and `foe.hp <= maxHp*0.2`, set `foe.hp = 0`. It scales off your own HP, as the archetype rule asks. Self-limiting in endless (huge enemy HP makes the window tiny). | N (the dummy never gets low). Small, bounded; measure. | T | 20% (60 HP at 300) |
| 5 | NEST EGG (CASSIDY) **[FIRST]** | **CHANGE**: the drafted rule exists (`vaultBase`) | **New:** "HIGH ROLLER COUNTS 10 MORE CHIPS". `vaultMul()` (437) and `vaultBase()` (432) use `chipsNow() + bonus`. MAKE IT RAIN keeps real chips (that stays RAINMAKER's lane). At 20 chips: x2 → x2.5, and the cap arrives at 30 chips instead of 40. | Y (partly, under the 20-chip cap) | T | +10 |
| 6 | COMPOUND (CASSIDY) | **KEEP**: the HOARDER payoff | `MIDAS.maxMul` per fight: 4 with the relic (`highRollerMul(chips, cap)`, fight.ts 58). | **N**: the sizer caps chips at 20 (run.ts 852), which is x2. Change it to `min(chips, 20 * (cap - 1))` when COMPOUND is owned, or log the gap. | T | x4 |
| 7 | CLOUD SEEDING (CASSIDY) | **CUT**: it saves 5 chips once a fight (rain cost 5, `makeItRain` 1272). That's pure economy, weaker than RAINMAKER (cost 2), in a lane that already has 4 enablers. | — | — | — | replaced by #18b |
| 8 | DOWNPOUR (CASSIDY) **[FIRST]** | **KEEP**: a clean RAINMAKER payoff (wants rains often; LOOSE CHANGE pairs feed it) | score() rain block (863): `g.base *= 1 + step*this.rains`; `this.rains++` in `makeItRain`. There's only ~1-2 rains a fight, so +10% is invisible. | Y | T | +25% per rain, uncapped within a fight |
| 9 | HEDGE (BRIAR) | **CHANGE** the wording: "+25% thorns" reads as a volley multiplier, which is just OVERCHARGE's echo again | **New:** "HP YOU LOSE ADDS 25% TO YOUR THORNS". `hit()` 1499: after `thorns()` fires and clears, `foe.energy += unitsUp(h.hpDamage*0.25)`, so the next volley starts seeded. Pain feeds the bank: a real enabler. | N (~0: the dummy rarely gets through) | T | 25% |
| 10 | BRAMBLE WALL (BRIAR) **[FIRST]** | **CHANGE**: the draft is a no-op (volleys pierce, 1406) | **New:** "BLOCKED HITS FIRE 30% OF YOUR THORNS". 1499: if `h.hpDamage === 0 && h.blocked > 0 && relic`, call `thorns()` with share 0.3; the rest stays banked. The once-a-turn guard (1401) stays. **The highest-value item in the wave:** it fixes BRIAR's Dealer problem (it.81: her wall blocks the Dealer, so volleys never fire, and she leans on SHIELD BASH) and her sizing reading ~0. It.79 showed the full bank on blocks = 100% WHITE, so start low and measure the Dealer first. | Y (that makes the dummy's blocked hits visible) | T engine, M balance | 0.3 (probe 0.2-0.5) |
| 11 | BARB (BRIAR) | **CHANGE** the trigger: "thorn hits" are volleys, so BLEED would just be RETALIATION again (fails the different-win rule) | **New:** "THORN PAIRS AND JACKPOTS ADD 1 BLEED". In `resolveGroup` thorn (1223), a matched group gives `foe.bleed++` (cap 3). It ticks at the **enemy's turn start right after its shield reset (509)**: an `attack` event from the player, `note:'bleed'`, 10 a stack. Stacks never decay but are capped, so it can't run away. This is the proactive BRIAR that OVERGROWTH was meant to be, and it answers "thorns feel passive". | Y (an attack event from the player on the enemy's turn adds to the sizer's turn) | **N** (status, event, Director art, log, Mirror rule) | 10 a stack, cap 3 |
| 12 | OPEN WOUND (BRIAR) | **CHANGE**: "ignores shield" is free with the tick timing above | **New:** "YOUR BLEED STACKS TO 6, NOT 3". Bleed cap 3 → 6. | Y | T (after #11) | cap 6 |
| 13 | LIVE WIRE (TESLA) **[FIRST]** | **KEEP**, change the number: +30% *is* OVERCHARGE | `gainEnergy` 1527: `dmg *= 1.4` (stacks with OVERCHARGE). After the storm (1539): `me.hp = max(1, me.hp - unitsUp(maxHp*0.04))` **once per storm, never per strike** (the 73c/d spam class), never lethal, and not through `damage()` (that would eat the turn cap). | Damage Y. **Cost N** (999,990 HP), so its bosses are oversized. Accept, or discount it in POWER_REF. | T | +40%, 4% max HP a storm (10 at 250). Test at act 3 (heals halved). |
| 14 | MELTDOWN (TESLA) | **KEEP**: the OVERLOAD payoff. It overlaps UNDERDOG (x1.5 under 50%), but it's smooth and lightning-only. | `gainEnergy` 1526: `dmg *= 1 + min(cap, (1 - hp/maxHp) * k)`. | **N** (the dummy is at full HP), so bosses come out undersized. Size it at an assumed 30% missing, or log the gap. | T | k 1, cap +50% |
| 15 | CAPACITOR (TESLA) **[FIRST]** | **KEEP**: a FARADAY payoff. The leftover-shield lane BASH fills on KNIGHT, but it goes through lightning. | `resetShield` 1088: player, `this.special`, relic: `gainEnergy(c, unitsRound(held*0.25))` before the reset (the same ordering as BASH). Note: shield gained (FARADAY) and shield left over both charge. | Y (the dummy hits; the leftover feeds lightning) | T | 1/4 |
| 16 | PULSE (TESLA) | **CHANGE**: storms fire nearly every turn, so it's HOURGLASS (legendary) for free, plus dead-air turns | **New:** "A STORM AT THEIR BRINK RESETS IT, ONCE A FIGHT". In `gainEnergy` after strikes: if `foe.ability` and `foe.charge === every-1` and not yet used, set `foe.charge = 0` and emit a `relic` event. It skips `jackpot`/`deal`/the Mirror (like HOURGLASS skips `deal`). Denial is bounded to one cycle, and the "just in time" beat is the drama. | N (the dummy has no ability). Bounded: about one ability a fight. Log it. | M (telegraph and Director beat) | once a fight |
| 17 | FULL HOUSE (JAX) | **CUT**: a subset of PRISM (x2 any wild match). On JAX nearly every match uses a wild. | — | — | — | replaced by #18a |
| 18 | WILD WHEEL (JAX) **[FIRST]** | **CHANGE**: a 3-wild line is ~0.5% of spins, so "picks twice" almost never fires | **New:** "THE WILD WHEEL SPINS TWICE, KEEPS THE BEST". `wildPick` 795-799: draw two from `pool` and keep the higher `value(symbol) * gold`. That's every wheel spin, including each wild cell on JAX's payoff spin (score() ~826), so it fires on every payoff. | Y | T | best of 2 |
| 19 | WILD CARD (shared) | **KEEP**, per-machine text, **off KNIGHT and CASSIDY** (they get no wilds: `LUCKY_MACHINES`, run.ts 82) | Next to CAP AND BELLS (~717): wilds on the line → TESLA `gainEnergy(10 each)`, BRIAR `fillMeter(10 each)`, JAX +10 (half a wild: it doesn't double STACKED DECK). Text: "EACH WILD ON YOUR PAYLINE CHARGES 10". | Y | T | 10 a wild |
| 20 | LOADED REEL (shared) | **KEEP**: a real new line shape | scoring.ts `matchedRun` (76-91): with the relic and `line[1]==='wild'`, when reels 0 and 2 differ, also emit a second matched pair for reel 2's symbol (reels 1-2). Only one matched group exists today, so the Director, `tier` and the bets tracker need a check. Rate ~6% of JAX spins; on TESLA/BRIAR a lucky middle cell gives shield pair + attack pair. | Y | M | — |

**Replacements (each slot keeps an "only X" sim row):**

| # | Item | Rule and hook | Size? | Risk | Start |
|---|---|---|---|---|---|
| 18a | ENCORE (JAX enabler) **[FIRST]** | "AFTER YOUR JACKPOT METER PAYS, IT KEEPS 30%". `payoff()` 1325: `me.energy = unitsUp(cost*0.3)`, not 0. The JAX enabler the draft lacked (more payoffs, not bigger ones). | Y | T | 30% |
| 18b | DECK DRUM (JAX, retarget) | WAR DRUM already works on cards (919 keys on `BLADES`; the spin event sends `symBonus.ace`). Offer it on JAX too (`machine` → a list, or a JAX twin id). `relicText` already says CARD. A CARDS payoff with zero new engine. | Y | T | as WAR DRUM |

## 2. Answers to the open questions
- **Different resource or win?** Yes for all of them after the changes. As drafted, BARB failed: volley-triggered bleed is just RETALIATION. FULL HOUSE and CLOUD SEEDING added nothing new.
- **Damage-side payoffs for sizing:**
  - TOWER SHIELD is covered by RIPOSTE and BASH.
  - PULSE is bounded to once a fight.
  - NEST EGG is now damage.
  - Still blind: MELTDOWN, COUP, HEDGE and COMPOUND (chip cap), and LIVE WIRE's cost. For each, log `only X` WHITE/GREEN against baseline and refit `BOSS_MUL` if it's over 2 points.
  - HEADSMAN is the one sizing **bug** (fix before it ships).
- **New systems:** only BLEED (#11). LOADED REEL and PULSE are moderate. Everything else is a few lines at one hook.
- **A second JAX enabler?** Yes: ENCORE. JAX now has a meter enabler, a meter payoff (WILD WHEEL) and a cards payoff (DECK DRUM).
- **OVERGROWTH:** stays cut (the user's rule). BARB as an active thorn-pair bleed fills the role it was meant to fill.

## 3. Build first (10), in this order
1. BRAMBLE WALL (BRIAR)
2. RIPOSTE (KNIGHT)
3. CAPACITOR (TESLA)
4. ENCORE (JAX)
5. DOWNPOUR (CASSIDY)
6. NEST EGG v2 (CASSIDY)
7. WILD WHEEL v2 (JAX)
8. LIVE WIRE (TESLA)
9. HEADSMAN (KNIGHT, with the sizing HP fix)
10. TOWER SHIELD (KNIGHT, capped)

Every one is a single hook, and the sizer sees nine of the ten (TOWER SHIELD through BASH/RIPOSTE).

Hold BARB and OPEN WOUND until a BLEED design pass: art, event, log, and a Mirror rule (exclude `note:'bleed'` from `last.player.damage` like thorns, or count it).

## 4. Cross-cutting guards
- **The GREEN Mirror copies a relic** (`mirrorCopy`). Every new hook must check `side === 'player'`. RIPOSTE and CAPACITOR on the Mirror side would be nonsense.
- **HP costs** never go through `damage()`: it charges the one-turn cap (`playerTurnHp`). They floor at 1 HP, and PHOENIX isn't involved.
- **Text budget:** all the new texts above are 6-9 words with no hints. KNIGHT-only items (TOWER SHIELD, RIPOSTE, HEADSMAN, COUP) need `machine: 'knight'`. SHIELD BASH stays KNIGHT and BRIAR (it.81); if BRAMBLE WALL measures well, re-open "BRIAR drops BASH" with the user.
- **POWER_REF is stale** (it.75: measured 620 vs ref 405 on KNIGHT). Re-run `power_ref.ts` once before the wave's `only X` rows, or every row inherits the drift.
