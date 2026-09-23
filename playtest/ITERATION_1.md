# Iteration 1 Playtest: the Roguelike Run

**Method.** One full run in the playtest build (:4173): fights 1–3 at 1× real time; the pane then throttled rAF to ~1 fps, so fights 4–6 were timed in game-clock seconds by driving `stage.clock`. Plus `dbg.vs` sandboxes, ~250k headless runs and 180k rollouts (`playtest/scratch/it1_*.ts`):

| Script | What it answers |
|---|---|
| `policies` | Policy win rates and feel stats |
| `decisions` | Rollout value of every draft card |
| `cards` | Value of each card per enemy |
| `golem` | Rock aftermath |
| `checks` | Frost behaviour, deaths by depth |
| `sweep` | Structural proposals |
| `pot` | Boss pot variants |

## Verdict

**The run skeleton works and looks good, but the drafts are nearly solved and the deadliest mechanic looks harmless.**

- **Every draft offers a relic, and every relic beats every strip edit.** "Always take the relic" is 23 points above the sim's greedy policy and within 1.8 points per decision of a rollout oracle.
- **Strip edits are mostly traps.** +sword and +shield do nothing or hurt; often 2 of 3 cards on screen were traps.
- **HP carry-over is irrelevant.** You reach the boss at 92% HP on average.
- **Rocks are the real boss.** The golem kills 1.2% of the time but leaves 15 permanent rocks, halving your run win rate.
- **Freeze helps the player.** Frozen reels keep their stop, so a frozen jackpot repeats.

The fixes are cheap. Package G (§3) moves the skill gap onto real choices.

## 1. Numbers

### Run win rate by draft policy (3000 runs each)

| Policy | Win % | Deaths F1/F2/F3/F4/F5/Boss (% of runs) | HP into boss |
|---|---|---|---|
| **Always take the relic** | **55.0** | 4/5/3/7/8/17 | 94% |
| Take max HP first | 34.5 | 4/4/3/10/15/29 | 91% |
| Heal when low | 32.1 | 4/5/4/11/15/30 | 92% |
| Greedy (sim default) | 31.0 | 4/5/4/11/14/31 | 92% |
| Add bolt first | 24.5 | | |
| Add sword first | 22.0 | | |
| Random | 21.7 | 4/5/5/13/20/31 | 88% |
| Remove first | 11.4 | | |
| Never take a relic | 11.2 | | |
| Always take card 1 (the add card) | 6.7 | | |

The "8-point gap" in STATE.md is an artifact: the sim's greedy policy values `+sword` at 6 and relics at 3–8, which is wrong.

### Rollout value of each card type

600 real decision points, 300 rollouts each (standard error ~3 points). "Δ vs best" is the run-win points lost by taking this card instead of the best one on screen.

| Card | Best pick % | Δ vs best | | Card | Best pick % | Δ vs best |
|---|---|---|---|---|---|---|
| Mirror | 96 | −0.3 | | +max HP | 59 | −7.4 |
| Battery | 88 | −0.4 | | +bolt | 18 | −12.5 |
| Fang | 83 | −1.1 | | −shield | 13 | −15.0 |
| Magnet | 79 | −1.1 | | −rock | 8 | −16.7 |
| Whetstone | 69 | −1.6 | | −bolt | 4 | **−16.7 (trap)** |
| Clover | 60 | −2.6 | | +sword | 6 | **−18.0 (trap)** |
| Soap | 37 | −3.9 | | +shield | 5 | **−19.2 (trap)** |

- Best-minus-worst spread averages 18.4 points (18% of decisions under 5). Decisions matter; the answer is just always the relic.
- **Reel choice barely matters.** Fight-4 loss with +bolt on reel 1/2/3: 12.5/12.6/13.5%; +sword: 15.0/15.0/14.4%; baseline 14.6%. A bolt is worth ~2 shield-piercing damage, a sword 1 blockable damage.
- **Relic spread** (single-fight loss %, base 14.6): mirror 5.0, battery 8.3, fang 8.6, whetstone 11.5, clover 11.9, hourglass 12.2, soap 14.3, magnet 14.5 (no rocks).
- **Seeing the map is worth ~6 points**, almost all "take Magnet if the golem is ahead"; after the rock fix, ~0.7. The map is decoration.

### Enemies (greedy policy)

| Enemy | Kill % | Turns | HP lost (wins) | What it does to you per fight | Deaths from ability |
|---|---|---|---|---|---|
| Slime | 3.2 | 17.0 | 29% | — | 0 |
| Brute | **15.0** (8.2 at F1) | 14.5 | 48% | — | 74% (smash) |
| Frost | 5.1 (0.3 in isolation) | 21.0 | 21% | Frozen reel on **81%** of your turns; all 3 frozen on 18% | 0 |
| Thief | 11.3 | 18.3 | 24% | 10.6 symbols stolen | 0 |
| Gremlin | **15.1** | 25.1 | 44% | Jammed reel on 9.9 of ~12.5 turns | 0 |
| Golem | 1.2 | 22.4 | 24% | **15.0 permanent rocks** | 0 |
| **House** | **49.6** | 22.4 | 55% | Pot peaks at 5.9 on average | pot 29% |

- Burst deaths (≥50% HP within 2 enemy turns) are 0–7% of deaths; dead-turn streaks are rare. Fine.
- **Rocks:** golem at F3 → 18% run win vs 42% with no golem (greedy). Boss win by rocks carried in: 0 → 77%, 6–10 → 47%, 16+ → 19%. Nine rocks raise average fight loss 14.6% → 38.8% (boss 47% → 86%). Magnet flips it: magnet + 9 rocks beats a clean kit (10.2%).
- **The pot is too small:** 1.7 cash-outs per fight averaging 4.0 (p90 8); the player steals it in 50% of fights, for 2.7. It never feels progressive.

### Pacing (game-clock seconds at 1×)

| Turn type | Seconds |
|---|---|
| No match | 2.6–3.0 (was 3.9–4.2, a good fix) |
| Pair | 3.9–5.0 |
| Special | 5.3–6.5 |
| Ability or cash-out | 5.2 |

Measured: brute 15 turns/61 s, gremlin 19/74 s, boss 21/~80 s. **A full run is ~8 min at 1×, ~2.5 min at 4×.** Good.

## 2. Bugs and readability issues I saw

1. **A freeze repeats jackpots.** Live, fight 2: I spun BOLT-BOLT-BOLT, the Frost ice jackpot froze all 3 reels on that line, and I won in 2 rounds. Sim: 1.63 jackpots per frost fight land with 2+ reels frozen. Repro: `dbg.vs('frost',['bolt','bolt','bolt'],['ice','ice','ice'])`.
2. **The "gentle opener" isn't implemented.** `generateRunEnemies` promises it in a comment, but the brute (minDepth 0) can open; mine did. It kills 8% at F1.
3. **Boss preview text overlaps "YOUR HP"** ("…JACKPOT YOU H**YOUR HP**LS THE POT"), and it doesn't list your relics.
4. **"HOUSE CASHES OUT! 4 DAMAGE" fires while the pot widget still reads 3.** The banner covers both HP bars, and the full-screen white flash is far too big for 4 damage.
5. **Text collisions:** "FIGHT 1 OF 5"/"FINAL FIGHT" draw over the visible logo; "CHOOSE ONE" collides with the map line.
6. **Hourglass:** the boss card says "every 5 turns", the HUD says "CASH OUT IN 6".
7. **Map nodes have no labels or tooltips**; gremlin and thief are both purple portraits.
8. **Thief and gremlin target swords first** (`symbolValue` sword 3 > bolt 2), but bolts are what matter.
9. Debug only: `dbg.vs` after run-over leaves the over screen on top.

Reads well: steal holes + flying symbols, jam overlay, ❄3 counters, rocks in the strip mini-map, "NO PAIR", "SO CLOSE!", run-over summary.

## 3. Prioritised changes (★ = top 5)

### Proposal sweep (full runs, 3000 each, run win %)

| Variant | Random | Greedy | Always relic | Smart |
|---|---|---|---|---|
| A: current | 22 | 32 | 53 | 54 |
| B: heal 20% | 10 | 18 | 30 | 37 |
| C: keep ≤2 rocks per fight | 39 | 57 | 69 | 69 |
| D: relics only after F2 and F4, 2 relics shown | 28 | 27 | 29 | 56 |
| E: swap cards + clear-reel rock removal | 24 | 49 | 54 | 58 |
| **G: B+C+D+E, no brute at F1, boss 44 HP** | **25** | **47** | **47** | **55** |

G keeps a ~30-point skill gap without "always relic" being best; deaths spread 1/4/6/7/7/19% (F1→boss).

### (a) Balance and tuning
1. ★ **Rocks:** singles fizzle; only doubles/jackpots (1/2) and Quake write rocks; **≤2 permanent rocks per fight**; "−ROCK" clears a whole reel.
2. **Post-fight heal 0.4 → 0.2** (heal/max-HP become real choices), with **boss HP 50 → 44**.
3. Brute `minDepth` → 1 (opener: slime, or frost at 0.8× HP).
4. After the freeze fix, re-tune Frost (0.3% loss now): `hpMul` 0.9 → 1.1.
5. `symbolValue`: bolt 3, sword 2, shield 1. Re-sim; thief gets harder.

### (b) Draft and incentive design
1. ★ **Relics only after F2 and F4, as 2 relics + 1 other** (relic vs relic is a real choice). Other drafts are strip/HP.
2. ★ **Replace ±1 cards with SWAP cards** ("2 SHIELDS on reel 1 → BOLTS"): ~5-point swing vs ~2. No more "−1 BOLT" or "+1 SHIELD".
3. **Sword build path:** UPGRADE cards, e.g. "GOLD SWORD: reel-1 swords pierce shields" (+sword is best in only 6% of offers).
4. **Show the stat change on each card** ("SPECIAL EVERY ~3.6 → 3.1 SPINS", "PAIR CHANCE 22% → 26%"), so reel targeting is visible.
5. **Branching map:** at F2–F4 pick 1 of 2 enemies, plus counter relics (Mittens/frost, Lockpick/gremlin, Mousetrap/thief, Pickaxe/golem).
6. Fix `greedyValue` in `simulateRun.ts` so the sim baseline isn't misleading.

### (c) Enemy and boss design
1. ★ **Fix freeze:** the reel clunks one stop to its worst visible cell, then holds; **max 2 reels**; never hold a reels 1–2 match.
2. ★ **Real progressive pot:** seed 5, +1 per House turn ("the house's cut"), cash out every 6. Sim (2 relics, 44 HP):

| Pot rule | Boss loss | Average cash-out | Fights with a steal of 8+ |
|---|---|---|---|
| Current | 28% | 3.9 | 4% |
| Seed 5, +1/turn, every 6 | 37% | 12 | 37% |

   A ticking bomb you hope to jackpot away: big swings both ways.
3. **Gremlin:** only lock doubles+ jam (a jammed reel on 80% of turns just nags). **Boss phase 2 at 50%:** "ALL IN", pot doubles. Both need sims.

### (d) Feel, juice and readability
1. **Pot widget:** 2× size in the gutter, odometer roll-up, glow tiers at 5/10/15, synced with the banner; flash scaled to amount; banners off the HP bars.
2. Writer badges and tooltips on map nodes.
3. Fix the §2 overlaps.
4. A stolen pot bursts as a coin shower into the House: the loudest moment of the run.

## 4. Art needed (sprite ids)

| Sprite id | Description |
|---|---|
| `cardSwap` | Two curved arrows, card icon for swap cards (16×16) |
| `symSwordGold` | Gold, piercing sword symbol variant, same size as `sword` |
| `potTier1`, `potTier2`, `potTier3` | Coin pile growing small → heap → overflowing, with a sparkle on tier 3 |
| `relicMittens` | Anti-freeze relic |
| `relicLockpick` | Anti-jam relic |
| `relicMousetrap` | Anti-thief relic |
| `relicPickaxe` | Rock remover relic |
| `mapBadgeSlime`, `mapBadgeIce`, `mapBadgeClaw`, `mapBadgeRock`, `mapBadgeLock`, `mapBadgeFist` | 8×8 writer badges shown under map nodes |
| `mapFork` | Branch connector for a split path |
