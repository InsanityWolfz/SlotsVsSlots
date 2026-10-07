# BIG CHOICES: a bigger, sharper list (proposal, 2026-10-07)

Reviewer: expert playtester. Design only: no code edited, no sims run. Numbers come from `tools/out/sim/wave1/T_*.txt`
(greedy bot, 1000 runs a row) and `loop/STATE.md` (Iteration 26 probe, it.58, it.69b).
Tiers: **SAFE** (no cost), **STRONG** (a small cost or none), **BROKEN** (it feels broken and carries a real cost).
**The tier column is internal** (for planning and balance only). It never reaches a card, a name, an effect line, a
color, an icon or the order of cards (the user's rule: "let the player decide"). No name in this list hints at a tier.
Feasibility: **T** trivial (a few lines at one hook), **M** moderate, **N** new system.
Sizer: **Y** = `machinePower` sees it; **N** = it can't (HP, healing, abilities, chips over 20, conditional states); **X** = it misreads.

## 1. Diagnosis of today's 15

**What's wrong overall:**
- **Too few cards.** There are 4 fixed sets of 3 (FORGE / MELT / SURGERY / BARGAIN). A WHITE run sees exactly 1 set
  (after the House); a GREEN run sees 2. By the third run the player has seen every card. On a maxed build FORGE is
  hidden and WHETSTONE/POLISH quietly turn into SECOND WIND, so it's really 3 sets.
- **Level cards are dead by design.** The cap is 3, KNIGHT starts at 2, and the draft and shop already sell levels. By
  the House, levels are maxed, so the card is either hidden or swapped.
- **Picks don't move runs.** In the forced-pick probe everything landed within noise (8.8-11.4%, it.26-27). Damage picks
  are taxed by boss sizing: the Mirror, act 3 and the Dealer use `sizingPower = REF x (power/REF)^0.5`. So a pay x1.5
  gives the bosses about x1.22 HP. **Lesson:** a damage pick must be about x2 to feel broken after the tax. A survival
  pick is invisible to the sizer, so it needs a real cost of its own.
- **The bot never takes 5 of them:** WHETSTONE, POLISH, TWIN REEL, BLOOD PACT and SECOND WIND show 0 picks in every
  `T_*` table, because the hand-set `choiceValue`s in `src/sim/bot.ts` are 4-6 against 7-8. The take/win% line measures
  the bot, not the cards. The forced probe had TWIN REEL (11.1) and BLOOD PACT (10.6) as the two best.

| Card | Greedy taken (won%) K / T / B / J / C | Verdict | Why |
|---|---|---|---|
| ARMS RACE | 480(36) / 70(16) / 361(48) / 82(35) / 531(35) | **REWORK** | Dead on TESLA and JAX: their bolt and card levels are maxed early. Make it go past the cap (rule L1). |
| MASTERWORK | 23(22) / 460(36) / 8(38) / 423(42) / 7(14) | **REWORK** | Its cost ("others never level") is free once they're maxed, and it's dead on two-symbol machines. New cost: shields drop to level 1. |
| WHETSTONE | 0 | **MERGE** into TEMPER | It's +1 level, usually hidden or swapped. |
| MELT IT DOWN | 216(53) / 346(41) / 143(60) / 214(40) / 345(31) | **KEEP** | The best win% on KNIGHT and BRIAR. Add +1 past the cap at your best level. |
| SOLID GOLD | 350(31) / 170(40) / 280(45) / 282(45) / 288(25) | **REWORK** the cost | It has two costs (−1 level on everything and −25% HP), and the level loss stacks with the sizer tax. Keep only −20% max HP. |
| POLISH | 0 | **MERGE** into TEMPER | Same as WHETSTONE. |
| CLEAN CUT | 253(38) / 201(49) / 196(64) / 214(38) / 308(26) | **KEEP** | It's a clear pivot. Its +1 attack level goes past the cap. |
| TWIN REEL | 0 (forced 11.1, the best) | **KEEP** | Good card, bad bot value. Fix the bot (5 → 7). |
| SWEEP UP | 235-351 | **KEEP** (SAFE) | |
| GLASS CANNON | 395-627, the top pick everywhere | **KEEP**, offer it only after the House | It's the model. After the Mirror its cost shrinks: 5 act 3 fights, heals already halved. |
| BLOOD PACT | 0 (forced 10.6) | **KEEP** | KNIGHT's version gets +1 past the cap. Fix the bot value. |
| SECOND WIND | 0 | **KEEP** (SAFE) | It's also the fallback when a target is missing. |
| sets / set names | | **CUT** | Replace them with pools and slots (section 4). The header says "A BIG CHOICE: STRONG MOVES HAVE A PRICE". |

### The dead-levels fix: three rules, not cuts
- **L1 LIMIT BREAK:** big choices are the only thing in acts 1-3 that can level past the cap, up to **LV5**.
  - Draft and shop level cards stay capped at 3 (endless at 4, as today).
  - Values: symbol LV4 = 25 already exists (`SYM_VALUE[4]`); add LV5 = **34**. Charm LV4 exists (Golden Ticket);
    add a LV5 column to `CHARM_VALUE`.
  - The card shows where you land ("SWORDS LV4"), never a delta.
  - Hook: a `BIG_CAP = 5` in `takeChoice`'s `up()`; `clampLvl(lvl, 5)` in `charms.ts`. **T.**
- **L2 OVERFLOW:** a level a choice can't apply (past LV5, or a locked type) becomes **2 gold charms on plain cells of
  that type**. For a charm type, it becomes 2 more of that charm. The card text switches before it's shown, so a level
  card is never dead. Hook: `rollChoices` resolves the target and `describeChoice` prints the result. **T.**
- **L3 TEMPER, the safe level pick:** "+1 LEVEL TO YOUR [lowest symbol or charm type], PAST THE CAP". It replaces
  WHETSTONE and POLISH. With L1, it always has a target.
- Golden Ticket stays +1 on charms, so a LV5 charm with the Ticket reads LV6. Clamp it at 6, or cap Ticket-plus-big-choice at LV5. Pick one; it's rare.

## 2. General choices (20)

Offered: **H** = after the House (every run), **M** = after the Mirror (GREEN+), **E** = endless loops. "not K" = not on KNIGHT (no meter).

| # | NAME | Effect | COST | Tier | When | Hook / feasibility | Sizer |
|---|---|---|---|---|---|---|---|
| G1 | ARMS RACE | +1 LEVEL TO ALL YOUR SYMBOLS, PAST THE CAP | −15% MAX HP | BROKEN | H M E | `takeChoice` `up()` with L1. T | Y (taxed) |
| G2 | MASTERWORK | +2 LEVELS TO YOUR [ATTACK SYMBOL], PAST THE CAP | SHIELDS DROP TO LEVEL 1 | BROKEN | H M E | `up(attack,2)`; `levels.sym.shield = 1`; drop `levelLock`. T | Y |
| G3 | GLASS CANNON | EVERYTHING PAYS X1.5 | NO HEALING BETWEEN FIGHTS | BROKEN | H only | as today (`run.glass`). — | Y |
| G4 | BLOOD PACT | YOUR METER FILLS TWICE AS FAST (KNIGHT: +1 SWORD AND SHIELD LEVEL, PAST THE CAP) | −25% MAX HP | BROKEN | H M E | as today plus L1. T | Y |
| G5 | DEVIL'S DUE | EVERYTHING PAYS X2 | −5% MAX HP AFTER EVERY WIN | BROKEN | H only | `payMul 2` (the GLASS path); the decay after a win in run.ts's win handler. T | Pay Y. Decay N (fine: it's a cost) |
| G6 | ALL IN | EVERY SHIELD ON YOUR REELS BECOMES A [ATTACK SYMBOL] | −20% MAX HP | BROKEN | H M E | strips: `shield → attack`; spiked charms → gold (`normalizeCharms`). T | Y (the lost defense is invisible to the sizer, as it should be) |
| G7 | DOUBLE OR NOTHING | +1 LEVEL TO EVERY SYMBOL AND CHARM, PAST THE CAP | THE NEXT BOSS HAS DOUBLE HP | BROKEN | H M E | `run.bossHpMul` read in the boss HP formulas (run.ts ~803-835), cleared on the kill. T | **X:** the x2 stacks on top of the sizer's own growth. Apply it after sizing, and state that on the card. |
| G8 | MELT IT DOWN | EVERY CHARM BECOMES GOLD, ONE LEVEL ABOVE YOUR BEST | YOUR OTHER CHARM LEVELS ARE GONE | BROKEN | H M E (needs charms) | as today, `best + 1` with L1. T | Y |
| G9 | SOLID GOLD | 3 GOLD CHARMS ON EVERY REEL | −20% MAX HP | BROKEN | H M E | as today without the level loss. T | Y |
| G10 | CURSED IDOL | PICK A LEGENDARY RELIC | EVERY FIGHT, A ROCK LANDS ON EACH REEL | BROKEN | H M | **M:** `pendingLegend` needs a queue (today a choice's legend would overwrite the act's legendary pick, set right after `offerChoices` in `startNextAct`); rock writes at fight start reuse `insertOffscreen` | Relic Y. Rocks N |
| G11 | HOT HAND | YOUR METER STARTS EVERY FIGHT FULL | ENEMY ABILITIES CHARGE 1 TURN FASTER | BROKEN | H M E, not K | start energy like BATTERY; the cost reuses the BLUE stake path in `effectiveAbility` (stakes.ts 55) through a run flag. T | Meter Y (small over 40 spins). Cost N (the dummy has no ability) |
| G12 | TWIN REEL | REEL 3 BECOMES A COPY OF REEL 1, CHARMS INCLUDED | REEL 3'S OLD CELLS ARE GONE | STRONG | H M E | as today. Bot value 5 → 7. — | Y |
| G13 | CLEAN CUT | REMOVE REEL [N]'S SHIELDS. +1 [ATTACK] LEVEL, PAST THE CAP | THOSE SHIELDS AND CHARMS ARE GONE | STRONG | H M E | as today plus L1. T | Y |
| G14 | WARDED | THE FIRST 3 CHEATS EACH FIGHT WASH OFF | −15% MAX HP | STRONG | H M | HOLY WATER's counter, 1 → 3 (run flag). T | N (no ability on the dummy). Fine: it's defensive |
| G15 | PAWN SHOP | TRADE [YOUR WEAKEST RELIC] FOR A LEGENDARY PICK | THAT RELIC IS GONE | STRONG | H M (needs a non-legendary relic) | the legend queue (as G10). M | Relic swap Y |
| G16 | TEMPER | +1 LEVEL TO YOUR [LOWEST TYPE], PAST THE CAP | — | SAFE | H M E | L1 and L3. T | Y |
| G17 | LUCKY BREAK | 2 [YOUR BEST CHARM] CHARMS ON EVERY REEL | — | SAFE | H M E (needs 6 plain cells that fit) | `addCharms` per reel (the SOLID GOLD loop). T | Y |
| G18 | SECOND WIND | HEAL TO FULL, +20% MAX HP, +1 SHIELD LEVEL | — | SAFE | H M E | as today (its shield level goes past the cap). — | N (fine) |
| G19 | SWEEP UP | SMASH EVERY ROCK. HEAL 100 (FULL: +50 MAX HP) | — | SAFE | H M E | as today. — | N |
| G20 | TREASURE / HOUSE MONEY | PICK 1 OF 3 RELICS / +40 CHIPS | — | SAFE | H M (HOUSE MONEY: not on CASSIDY) | the relic pool (the `edge` 'relic' path) plus the legend queue. M / T | **X on CASSIDY:** chips are his damage, and the sizer caps them at 20 |

**Costs used:** % max HP (G1, G4, G6, G9, G14), healing (G3), decay per win (G5), a harder boss (G7), charm levels (G8),
a curse on every fight (G10), faster enemy abilities (G11), cells (G12, G13), a relic (G15), shield levels (G2). No two
BROKEN cards share both an effect and a cost.

## 3. Slot Machine choices (5 each)

Machine cards only appear on that machine. Each machine gets 3-4 BROKEN or STRONG cards and 1 SAFE card.

### KNIGHT (sword / shield, no meter): simple and loud
| NAME | Effect | COST | Tier | Hook / feasibility | Sizer |
|---|---|---|---|---|---|
| EXCALIBUR | SWORD PAIRS PAY AS JACKPOTS | SHIELD PAIRS BLOCK NOTHING | BROKEN | `scoring.ts multFor` keyed on a config flag; the Director's banner says JACKPOT. M | Y |
| SHIELD WALL | YOUR SHIELD NEVER RESETS (MAX HALF YOUR MAX HP) | SWORDS DROP A LEVEL | BROKEN | `resetShield` (fight.ts ~1105) with TOWER SHIELD's code at share 1 and a cap. T | N alone. **Y with BASH/RIPOSTE: kept shield bashes every turn, so keep the cap.** Don't stack it with TOWER |
| SHIELD SLAM | EVERY SHIELD ALSO HITS FOR HALF ITS BLOCK | — | STRONG | the BULWARK (`spiked`) path in `score()` at 50% for every shield group. T | Y |
| CRUSADE | SWORDS +5 FOR EVERY FIGHT YOU WIN, REST OF THE RUN | −20% MAX HP | BROKEN | `run.crusade++` on a win; passed into the fight like WAR DRUM's `symBonus`. M | Y (the current count) |
| SQUIRE | A KEEN CHARM ON 2 SWORDS OF EVERY REEL | — | SAFE | `addCharms(…,'keen',2)`. T | Y |

### TESLA / DOC VOLTZ (bolt / shield, lightning)
| NAME | Effect | COST | Tier | Hook / feasibility | Sizer |
|---|---|---|---|---|---|
| CHAIN LIGHTNING | EVERY LIGHTNING STRIKE HITS TWICE | −30% MAX HP | BROKEN | strike loop in `gainEnergy` (~1527); the second hit is a fork in the storm (it keeps the 4 s cap). T | Y |
| MAD SCIENCE | LIGHTNING DEALS X2 | EVERY STORM SHOCKS YOU 5% MAX HP | BROKEN | LIVE WIRE's code with bigger numbers: once a storm, never lethal, not through `damage()`. Don't offer it with LIVE WIRE. T | Damage Y. Cost N (bosses come out a little big: log it) |
| SUPERCELL | EVERY BOLT ON YOUR REELS COUNTS AS BLAZE | YOUR CHARGED CHARMS ARE GONE | BROKEN | the blaze count in special damage reads bolts (18 or more × 10). T | Y |
| STORM FRONT | LIGHTNING STRIKES ONCE BEFORE EVERY FIGHT | — | STRONG | a turn-1 `relic` event like BATTERY/ROD. T | Y (1 of 40 turns, so small; its real value is in short fights) |
| GROUND WIRE | EVERY STRIKE HEALS 5 MORE | — | SAFE | `meter.heal` + 5 through a config field. Today's heal is 5; 20 made TESLA unkillable, so don't go past 10 in total. T | N |

### BRIAR (thorn / shield, thorn bank, volleys pierce). No bleed. Start every number at the low end.
| NAME | Effect | COST | Tier | Hook / feasibility | Sizer |
|---|---|---|---|---|---|
| BARBED WIRE | SHIELDS BANK THEIR FULL BLOCK AS THORNS | SHIELDS BLOCK HALF | BROKEN | shield group in `resolveGroup`: `fillMeter(amount)`, shield gain x0.5. The cost feeds the payoff: more hits get through, so more volleys. T | **X:** the dummy now gets through, so her volleys become visible and BRIAR's bosses jump. Refit `BOSS_MUL.thorn` |
| PERENNIAL | AFTER A VOLLEY, HALF YOUR THORNS GROW BACK | −20% MAX HP | BROKEN | `thorns()` (~1406): the bank goes to 0.5 x fired, not 0. The once-a-turn guard holds; it's bounded at about 2x inflow. T | N (BRIAR reads ~0) |
| IRON MAIDEN | BLOCKED HITS FIRE HALF YOUR THORNS | −25% MAX HP | BROKEN | BRAMBLE WALL's code at share 0.5, no cap. Not offered with BRAMBLE. it.79: a full bank on blocks made WHITE 100%, so probe 0.3-0.5. T | **X:** excluded from sizing like `bramble` (run.ts 857). Size it by the flag or log the gap |
| MARTYR | YOUR VOLLEYS FIRE X2 | YOU TAKE 25% MORE DAMAGE | BROKEN | `thorns()` multiplier; incoming x1.25 in `hit()`. T | Mostly N |
| DEEP ROOTS | +25% MAX HP. YOUR THORNS START EACH FIGHT AT 30 | — | SAFE | `maxHp`; the bank set at fight start. **No charm cards for BRIAR:** her charms were a trap (EXPERT_PLAYTEST_12 D1). T | N |

### JAX / JESTER (card / shield / wild, jackpot meter)
| NAME | Effect | COST | Tier | Hook / feasibility | Sizer |
|---|---|---|---|---|---|
| JOKER'S REEL | REEL 2 BECOMES ALL WILDS | HALF YOUR MAX HP | BROKEN | `strips[1] = { wild: 12 }`; drop reel 2's charms. Every spin fills the meter, and the 3-wild bonus fires more often. **Probe it first;** if it's over the gate, make the cost "AND YOUR SHIELDS". T | Y |
| DOUBLE FEATURE | YOUR JACKPOT METER PAYS TWO SPINS IN A ROW | −20% MAX HP | BROKEN | `payoff()` (~1364): an armed counter of 2, not a flag; a second banner. M | Y |
| HIGH CARD | JACKPOTS AND METER PAYOFFS PAY X2 | PAIRS PAY HALF | BROKEN | a tier multiplier in `score()`. JAX lives on pairs, so the cost is real. T | Y |
| CARD SHARK | +2 WILDS ON EVERY REEL | CARDS DROP A LEVEL | STRONG | strips + `levels.sym.ace − 1`. The name avoids STACKED DECK and the act 3 marked cards. T | Y |
| TRUMP CARD | YOUR CARDS PIERCE SHIELDS | — | SAFE | KEEN's pierce flag on `ace` groups in `hit()`. T | Y (the dummy has shields) |

### CASSIDY / THE BANKROLL (chip / shield, HIGH ROLLER, MAKE IT RAIN)
| NAME | Effect | COST | Tier | Hook / feasibility | Sizer |
|---|---|---|---|---|---|
| NO LIMIT | HIGH ROLLER HAS NO CAP | −25% MAX HP | BROKEN | `highRollerMul` cap per fight (COMPOUND's path, fight.ts 58). T | **X:** the sizer caps chips at 20 (run.ts 853), which reads x2. Size from real chips when this is owned |
| OPEN BAR | MAKE IT RAIN COSTS NOTHING | YOU EARN NO CHIPS FROM WINS | BROKEN | `rainCost` → 0; `chipsPerWin` → 0 (a run flag). It trades growth for spend: the decision is real. T | Y |
| THE HEIST | +100 CHIPS | −30% MAX HP | BROKEN | chips and maxHp. T | **X** (the 20-chip cap) |
| MONSOON | EVERY CHIP PAIR MAKES IT RAIN, IN FULL | RAIN COSTS 10 CHIPS | STRONG | LOOSE CHANGE's path at full base (`score()` ~871). Not offered with LOOSE CHANGE. T | Y |
| TRUST FUND | EVERY WIN: +3 CHIPS | — | SAFE | `chipsPerWin + 3`. T | N (it's indirect; fine) |

## 4. Offer structure

- **3 cards, one per slot:**
  - **BOLD:** a BROKEN card (general or machine). Guaranteed, so every screen has a "no way I'm not taking that".
  - **MACHINE:** a BROKEN or STRONG card from your Slot Machine's 4. If none is eligible, a general STRONG card.
  - **SAFE:** a general or machine SAFE card. SECOND WIND is the fallback when nothing else fits.
- **Mix:** about 40% general and 60% machine overall, since slot 2 is always machine. A machine's 5 cards are 1/3 of what
  that player sees: its identity, without drowning the general pool.
- **Rarity:** inside BOLD, weight the brand-new cards x1.5 for the first 20 runs (`profile` already counts runs), so
  players meet the new ones. Never weight by expected value.
- **Never show the same card twice in a run.** Skip a card whose target is missing (no charms, no plain cells, no
  relic, an owned twin relic). The cost line shows the real number ("−75 MAX HP"), not the percent; the effect line
  names the target. No hints, no SAFE tag (unchanged).
- **Tiers stay invisible.** Every card looks the same: same frame, same accent, same layout. The slot names (BOLD /
  MACHINE / SAFE) are code-only, and the slot order is shuffled on screen.
  - Checked in the reworked `drawChoice` (runScreens.ts ~863-874): cost-free cards print "NO COST" in dim text, with
    no green. That's fine: it states the rule, like the COST strip. Don't bring back a green or "safe" color.
  - Two STRONG cards have no cost either (SHIELD SLAM, STORM FRONT). So "NO COST" doesn't mean "the safe one", and the
    tiers can't be read from the cost line.
- **By act:**
  - **After the House** (every run; WHITE's only pick): the full pool. GLASS CANNON and DEVIL'S DUE only appear here,
    because their costs tick per fight and are cheap late.
  - **After the Mirror** (GREEN+, before the Dealer): one-shot costs only (max HP, cells, levels, a relic, a harder
    boss). DOUBLE OR NOTHING's boss is then the Dealer, which is the best moment for that card.
  - **Endless loops:** the full pool; L1 goes to LV6 (one past the endless cap of 4).
- **The sim is required before it ships:**
  - Every new id needs a `choiceValue` in `bot.ts`, plus a forced-pick row (the old `builds.ts choices` probe,
    ported to `tools/sim/`).
  - Log WHITE / GREEN / fight-4 deaths per card in STATE. A BROKEN card should win ≥ +2 GREEN when forced, or it isn't broken.
  - For each X/N sizer flag above, log `only X` against the baseline and refit `BOSS_MUL` past 2 points.

### Implementation order
**Wave A (15 items; the engine work is mostly one line each):**
1. Rules L1, L2 and L3: `BIG_CAP`, `SYM_VALUE[5]`, CHARM LV5, the overflow conversion, TEMPER. This fixes ARMS RACE,
   MASTERWORK, CLEAN CUT, BLOOD PACT (KNIGHT) and MELT at once.
2. The slot offer (BOLD / MACHINE / SAFE) replacing `BIG_SETS` and `offerChoices`, plus the per-act filter.
3. General: ALL IN, DEVIL'S DUE, DOUBLE OR NOTHING, HOT HAND, LUCKY BREAK, SOLID GOLD (cost fix).
4. Machine: SHIELD SLAM, SHIELD WALL (KNIGHT); CHAIN LIGHTNING, STORM FRONT (TESLA); MARTYR, DEEP ROOTS (BRIAR);
   JOKER'S REEL, TRUMP CARD (JAX); OPEN BAR, TRUST FUND (CASSIDY).
5. Bot values for everything, and the TWIN REEL / BLOOD PACT value fix.

**Wave B:**
- **The legend queue** (CURSED IDOL, PAWN SHOP, TREASURE), then WARDED.
- **Engine M items:** EXCALIBUR, CRUSADE, DOUBLE FEATURE.
- **The cards that need a sizer fix:** NO LIMIT, THE HEIST, BARBED WIRE, IRON MAIDEN.
- **The rest:** PERENNIAL, HIGH CARD, CARD SHARK, MAD SCIENCE, SUPERCELL, MONSOON, SQUIRE, GROUND WIRE.
- **BRIAR's BROKEN cards go last,** one at a time, with the Dealer row watched.

### Pushback / risks
- **JOKER'S REEL and BARBED WIRE** are the two most likely to break a gate. Probe each one alone before wave B ships the rest.
- **LV5 symbols (34)** on a two-symbol machine plus gold charms could spike the 90th-percentile turn cap in sizing.
  That's fine: the sizer is built for it. Watch fight-4 deaths, not just the bosses.
- **Two damage x2 cards** (DEVIL'S DUE, HIGH CARD) only feel broken until the Mirror's HP catches up (about x1.4).
  That's the intended tax, but players will feel it as "the boss got tanky". Consider showing boss HP growth in the
  fight intro, as plain information rather than a hint.
