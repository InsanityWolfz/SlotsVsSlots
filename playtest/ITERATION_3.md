# Iteration 3 Playtest: Skimming House, Elites, Gilds and WILDs

**Method.** One full run on :4173 (seed 777) plus sandbox fights for WILD, PIERCE!, SPIKED!, CHARGED and LETHAL (`playtest/scratch/snaps/it3-*.png`). Headless (`playtest/scratch/it3_*.ts`): 18 policies × 3000 runs; 1,500 draft and 971 fork decisions valued by rollout (400 each, SE ±2.5 pts); single-fight tests of every card type; a danger table; package variants via hooks (src untouched).

## Verdict

**Package H mostly worked.**
- HP-first no longer dominates (43.3% vs greedy 46.0%).
- The boss is no longer a one-shot lottery: burst deaths fell from 53% to 11%, and the average skim is 7.4 (p90 12).
- Drafts are rich (best–worst spread 13.3 pts; 19% trivial), and gilds are the strongest cards and look great.

Three new problems:
1. **"Always take the elite" is dominant: 49.9% vs 37.4% always-safe.** Elites snowball relics into a boss you win 87.5% of the time. The `DANGER` table is also stale, so the thief gets the elite badge over the brute. Yet the elite thief is the *better* pick 83% of the time (+14 pts).
2. **LETHAL warns before only 52% of pot deaths.** The House spins coins into the pot before skimming on its cash turn. The pot widget also drops to 0 after every skim or half-steal (bug B1).
3. **Gilds are strong but they don't form builds.** A gild that matches one you already hold is worth the same as a different one (−5.4 vs −4.9). WILD and KEEN are trap cards, and a first-time viewer can't see *why* a jackpot paid 18.

## 1. Numbers

### Policies (3000 runs)

Deaths are % of runs at F1/F2/F3/F4/F5/boss.

| Policy (draft / fork) | Win % | Deaths | Boss win % |
|---|---|---|---|
| **greedy / always elite** | **49.9** | 0.3/15.6/13.2/11.2/2.7/7.1 | **87.5** |
| greedy / elite if HP ≥ 70% | 47.5 | 0.3/13.6/9.5/9.4/6.7/13.0 | 78.5 |
| greedy / sim picker | 46.0 | 0.3/7.1/7.4/11.1/9.2/18.9 | 70.9 |
| never PREP / sim | 45.1 | | 70.5 |
| HP first | 43.3 | | 67.2 |
| greedy / random fork | 42.7 | | 73.5 |
| gild first | 41.7 | | 65.7 |
| never gild | 41.2 | | 66.2 |
| relic first | 41.2 | | 66.2 |
| wild first | 39.5 | | 65.3 |
| greedy / always safe | **37.4** | 0.2/5.8/6.4/11.1/11.3/27.8 | 57.3 |
| swap first | 34.8 | | 59.8 |
| random / random | 29.4 | | 61.6 |

- **No draft policy dominates.** Per-draft loss against the rollout oracle: greedy 2.8, HP-first 3.6, gild-first 3.9, never-gild 4.6, random 7.1 pts. (The STATE note that "gild-first beats greedy" does not reproduce: 41.7 vs 46.0.)
- **Fork policy is the lever.** Rollouts show an elite fork is +3.3 pts on average, and better 56% of the time. The edge grows with HP: +5.1 at ≥90% HP, about 0 below 70%. Fork choices are real (spread 11.6 pts, only 20% trivial); the bias is simply too big.

### Draft card prices (rollout; Δ = pts lost vs best card offered)

| Card | Best % | Δ | | Card | Best % | Δ |
|---|---|---|---|---|---|---|
| Mirror | 92 | −0.6 | | Swap shield→bolt | 42 | −5.7 |
| Fang | 82 | −0.8 | | Clover / Whetstone | 27 | −7.4 |
| **Gild GOLD bolt** | **78** | **−1.4** | | **1 SHIELD TO WILD** | **11** | **−8.9** |
| Heal 8 | 69 | −2.4 | | **Gild KEEN sword** | **14** | **−9.0** |
| Gild GOLD sword | 57 | −3.1 | | PREP Mittens / Lockpick / Pickaxe | 8–18 | −8.5 to −9.8 |
| Crown, gild CHARGED, PREP Mousetrap | 51–56 | −3.8 | | +2 BOLTS | 8 | −10.2 |
| Gild SPIKED shield | 43 | −4.2 | | Hourglass, Magnet, Dice | 6–8 | −11.6 to −13.5 |
| +4 max HP | 36 | −5.2 | | Soap | 4 | −16.2 |
| Gild GOLD shield | 32 | −5.4 | | **Swap shield→sword** | **3** | **−16.5** |

- **Relic drafts are healthy:** relic gap 11.3 pts; the third card beats both 27% of the time.

### Do gilds make builds? (single fight, starting kit at 24/32 HP; average loss % over brute/thief/frost/slime/House)

| Kit | Avg loss | vs House | | Kit | Avg loss | vs House |
|---|---|---|---|---|---|---|
| Baseline | 36.6 | 68.8 | | 2× GOLD sword r1+r2 (commit) | 16.2 | 46.7 |
| +4 max HP | 28.3 | 60.1 | | GOLD sword r1 + GOLD bolt r2 (spread) | 15.6 | 45.1 |
| SPIKED shield (any reel) | 22.9 | 59 | | 2× GOLD bolt r1+r2 | 14.8 | **35.2** |
| GOLD bolt / sword r1 | 23.3 / 23.5 | 53 / 57 | | 3× GOLD sword (72-damage jackpot) | 13.2 | 44.3 |
| CHARGED bolt | 26.9 | 61 | | 3× CHARGED / 3× SPIKED | 14.1 / 14.3 | 48 / 50 |
| KEEN sword | 29.3 | 66 | | 3-way spread | 13.0 | 44.3 |
| 1 WILD | 30.5 | 62 | | | | |

- **Gild value is additive, not synergistic.** Committing to one symbol never beats spreading. The one real build signal is **bolts for the House** (GOLD bolt ×2 → 35% loss vs 47% for GOLD swords).
- **Thief and slime targeting is interesting, not punishing.** 28% of stolen cells and 16% of slimed cells are gilded, yet a single gild still cuts thief losses by 20–26 pts.

### Enemies (greedy/sim, run kill %)

Brute **20.0**, gremlin 12.4, thief 12.0, frost 7.1, slime 5.1, golem 5.0, House 29.1.

The thief is deadliest vs the starting kit (F3 elite 44.8%) but collapses after one draft; the brute taxes 18–22 HP per win.

### Boss (1,947 fights)

- **Length:** 12.4 turns (p10 7, p90 18), still the shortest fight.
- **Skims:** 1.04 per fight, average 7.4, max 27. Player steals: 1.25 per fight, average 7.2.
- **ALL IN:** 95% of fights, around turn 7.7.
- **Deaths:** 58% pot, 42% spin. Burst deaths are 11%, down from 53%.
- **LETHAL** is shown in 34% of fights (you win 40% of those). It came before only 52% of pot deaths.
- **The build-up is earned:** boss win rises from 54% with 1 relic to 85% with 4+, and from 59% with no gilded cells to 77% with 9+. HP in: below 50% → 37%, 75%+ → 83%.

**Run length:** about 16 turns per fight, about 95 turns per run (about 7 min at 1×).

## 2. Bugs

| # | Bug | Repro / evidence |
|---|---|---|
| **B1** | Pot widget goes to 0 after any skim or half-steal. `director.potWin` tweens `g.pot` to 0, and the event carries no remaining pot. LETHAL and the pot tier read this wrong value until the next House cut, then the pot jumps 0→7. | Boss with Crown: `it3-boss-16/17/18` ("ALL IN POT 0" while the model pot is 7) |
| **B2** | The YOUR REELS panel (draft and recap) doesn't show gilds or WILDs (`runScreens` `SYMBOLS` = sword/shield/bolt/rock). | `it3-elite-drop`, `it3-boss-26` |
| **B3** | LETHAL misses 48% of pot deaths, because the coin spin and house cut land before the skim on the cash turn. | Sim, 326 pot deaths |
| **B4** | `DANGER` is stale (thief 33, brute 16), so the "harder" elite is usually the easier fight. | Fork rollouts: thief* vs brute, elite better 83% |
| **B5** | PIERCE! pops when the target has 0 shield. PIERCE!/SPIKED! labels overlap the damage number. | `it3-wild-13`, `it3-spiked-1` |
| B6 | Boss preview still says "CASHES OUT THE POT AT YOU" and never mentions the half skim. | `it3-boss-preview` |
| B7 | "ELITE BONUS: X" collides with the map's here-arrow. | `it3-draft-d3` |
| B8 | The recap omits elite relic drops. | `it3-boss-26` |
| B9 | Clover ignores WILD near-misses (strict `sym[0]===sym[1]` check). | `fight.ts` `rollStops` |
| B10 | The "PER SPIN" label overlaps wrapped "REEL 1" text on the +2 BOLTS card. | `it3-draft1` |

## 3. Prioritised changes (★ = top 5)

### Tested package J (3000 runs, win %)

| | greedy/sim | safe | elite | elite if healthy | HP first | gild first | random | Boss turns | LETHAL warns |
|---|---|---|---|---|---|---|---|---|---|
| Current | 46.0 | 37.4 | **49.9** | 47.5 | 43.3 | 41.7 | 29.4 | 12.5 | 52% |
| **J** | 41.8 | 40.0 | 42.8 | **44.3** | 40.0 | 38.6 | 25.6 | **14.0** | **100%** |

Package J is ★1 plus ★2 (DANGER recalibrated, House cashes first, boss +3 HP per relic held). Fork policies land within 4.3 pts, and the best one depends on your HP. Overshoots: no post-fight heal after elites (always-elite 22%), elite ×1.4 HP (36%).

### (a) Balance
1. ★ **Recalibrate elites and scale the boss.** Set `DANGER` = brute 20, thief 13, gremlin 12, frost 8, slime 5, golem 4. Boss HP becomes 48 + 3 per relic held.
2. **Remove the trap cards.**
   - Drop "3 SHIELDS TO SWORDS" (best 3%).
   - Replace the +2 BOLTS fallback with a second gild card; +3 bolts still loses to a gild.
   - Rework the dead relics (Soap, Magnet, Dice, Hourglass) as build relics (see b2).
   - Consider keeping Mirror (best 92% of the time it's offered) out of relic drafts; elite drops only.

### (b) Draft, incentives and builds
1. ★ **Buff the WILD and KEEN cards.**
   - WILD: "1 SHIELD TO WILD" becomes **"2 SHIELDS TO WILDS"** (average loss 35.2 → 29.3).
   - KEEN: **+1 damage and pierce** (33.8 → 28.6; both land at CHARGED/SPIKED value).
2. ★ **Build relics**, so committing has a premium. Each amplifies one gild type:
   - MIDAS: gold cells also give +1 energy.
   - LIGHTNING ROD: CHARGED bolts make your special cost 4.
   - CACTUS: SPIKED hits back 4.
   - PRISM: WILDs pay ×2 in a match (tested: 35.2 → 31.1).
   - HONE: KEEN swords +2 (turns Whetstone into a KEEN relic).
3. **"Extend" gild cards.** When you own a gild, half of gild offers put the same enhancement on another reel.
4. **Elite drops: choose 1 of 2 relics** (a random drop is often a dead relic).

### (c) Enemies and boss
1. ★ **The House cashes out at the start of its turn,** before its spin. LETHAL then precedes 100% of pot deaths, and boss death rate goes from 18.9% to 17.1%. Show the skim on the widget ("LETHAL! SKIM 22"). Fix B6.

### (d) Feel and readability
1. ★ **Make gilds legible.**
   - Fix B1, B2 and B5.
   - Stamp scoring gilded cells ("X2", "+1", "PIERCE") and spell out the maths in the banner: "JACKPOT! 9 X2 = 18 ENERGY". A first-time viewer currently sees 3 bolts pay 18 with no explanation.
2. The CHARGED overlay muddies the bolt (it reads as cracked). KEEN is too subtle, and strip-map ticks are indistinguishable dots.
3. Add stat lines for KEEN/SPIKED cards; enlarge the reel indicator on gild cards.
4. Fix B7, B8 and B10.

## 4. Art needed

| Sprite id | Description |
|---|---|
| `stampX2` | 12×8 gold "X2" stamp that pops off a scoring GOLD cell |
| `enhCharged` (redraw) | Thin electric corner arcs only; keep the bolt readable |
| `enhKeen` (redraw) | Bright blue edge glint along the blade plus an arrowhead tip |
| `tickGold/Keen/Charged/Spiked` | 3×3 strip-map ticks with distinct shapes (square, slash, zigzag, star) |
| `potSkim` | 10×10 hand taking coins, for the "SKIM 22" line |
| `relicMidas`, `relicRod`, `relicCactus`, `relicPrism`, `relicHone` | Build relics: gold hand, copper lightning rod, spiky cactus, rainbow prism, blue whetstone |
| `chip`, `cashierPortrait`, `shopSlot` | For the next feature (below) |

## 5. Next big feature: THE CASHIER (chips and a between-fight shop)

Gilds made the strip matter, but offers are random, so you can't *commit* to a build. That's why builds don't pay. Add an economy (Balatro-style), all between fights:

- **Earning chips** (shown as a counter on the HUD; earning is passive):
  - +3 per fight won, +5 per elite;
  - +1 per jackpot you land, +1 per 5 overkill;
  - interest of +1 per 5 banked (max +3).
- **The shop** opens after fights 1, 3 and 5, in addition to the draft. It shows 4 priced slots:
  - targeted GILD (you pick the reel): 8;
  - random gild: 5;
  - remove 1 symbol: 4;
  - relic: 10;
  - heal 8: 4;
  - reroll: 2, rising by 1 each time.
- **Boss hook:** unspent chips join your side as your stack. Every 5 chips gives +1 shield at the start of each House turn, so saving vs spending is a real choice.
- **Constraints:** purely between fights, existing card/button UI; no in-fight input.
- **Sim targets** (add a `shop` phase to `run.ts`, rollout-valued): fork policies within 4 pts; savvy shopping ≥+5 over random; committed builds ≥3 pts over spread.
