# Iteration 2 Playtest: Package G, Forks, Counters and the Boss Pot

**Method.** I played the playtest build (:4173) through `dbg.tick`/`dbg.snap` and captured the preview, draft, fork, freeze, MITTENS!, LOCKPICKED!, SNAP!, the pot tiers and ALL IN (`playtest/scratch/snaps/it2-*.png`). Headless work covered about 400k runs and 1,000 rollout decision points (300–400 rollouts each, SE about 2.5 pts). Scripts are in `playtest/scratch/it2_*.ts`: `lib` (fork-aware), `policies`, `decisions`, `checks`, `sweep`, `boss`, `package`, `freeze`, `brute`, `wild` and `allin`. Proposals were tested by monkeypatching exported tunables and `Fight.prototype`; `src/` was not touched.

## Verdict

**Package G worked on its target: "always take the relic" is dead (31% vs greedy 36%).** Two new problems replaced it:

1. **"Always take HP" is the new solved answer.** hpFirst wins 44.1% vs greedy 35.6%, and loses only 2.2 pts per draft against the rollout oracle.
2. **The boss is a one-shot lottery.** 77% of boss deaths come from a single House cash-out averaging 20 damage (p90 32, max 54). HP is the only real defence, which is why HP cards dominate.

Other findings:
- **Forks are real decisions but have one-sided answers.** Avoid the brute and the thief. There is never a reason to take the hard path.
- **Counter relics are dead picks,** because three of the four countered enemies are already harmless.

The core pieces are right. The fixes are tuning plus one new rule (the House skims).

## 1. Numbers

### Policies (3000 runs each; deaths are % of runs)

| Draft / fork policy | Win % | Deaths F1/F2/F3/F4/F5/Boss | Boss win % |
|---|---|---|---|
| **HP first / smart fork** | **44.1** | 0/8/4/8/9/27 | 62 |
| Crown first / smart | 38.5 | 0/5/6/8/12/31 | 56 |
| Greedy (sim) / smart | 35.6 | 0/5/5/7/10/37 | 49 |
| Never take a relic / smart | 33.5 | 0/5/5/8/12/37 | 48 |
| Greedy / random fork | 31.6 | 0/9/9/10/9/32 | 50 |
| Random relic of the two / smart | 29.4 | 0/5/7/7/16/34 | 46 |
| Greedy / hardest fork | 28.2 | 0/13/10/13/9/28 | 50 |
| Swap first / smart | 26.6 | 0/5/6/13/13/37 | 42 |
| Random / random | 23.6 | 0/11/10/15/13/28 | 46 |

### Rollout value of draft cards

600 decision points, continuing with hpFirst. Spread (best minus worst card) averages 11.7 pts (median 10.7; 15% of decisions under 5). "Δ vs best" is the run-win points lost by taking this card instead of the best one on offer.

| Card | Best % | Δ vs best | | Card | Best % | Δ vs best |
|---|---|---|---|---|---|---|
| High Roller (crown) | 88 | −0.6 | | Swap shield→bolt | 34 | −5.4 |
| Clover | 73 | −1.1 | | Whetstone / Dice | 14–17 | −6.6 |
| Heal | 81 | −1.3 | | Mittens | 9 | −7.5 |
| Fang | 68 | −1.4 | | Clear rocks | 3 | −9.5 |
| Mirror | 77 | −2.0 | | Hourglass, Lockpick | 9–19 | −9.6 |
| **+Max HP** | 71 | −2.0 | | **Swap shield→sword** | 6 | **−10.4 (trap)** |
| Battery | 45 | −3.5 | | Soap, Pickaxe, Mousetrap | 5–26 | −10.7 |
| Bandage | 36 | −4.5 | | **+1 Bolt** | 2 | **−11.0 (trap)** |

- **Relic vs relic is a real choice.** The gap between the two relics averages 8.8 pts, and 40% of relic drafts are within 5 pts. The third card beats both relics 35% of the time.
- **Strip cards are fine in fights but lose the run to HP.** Swapping 2 shields for bolts cuts single-fight loss vs the brute from 26.6% to 16.3% and vs the thief from 39.8% to 18.1%, but it can't protect against a 20-damage cash-out.
- **The stat line hides the cost.** "ENERGY 1.37 TO 1.72" never mentions the shields you lose.

### Forks (371 forks, rollout values)

- Spread between the two options averages 10.4 pts. A random pick loses 5.2 pts per fork; the sim's picker loses 1.8.

| Fork | Better option | Δ (pts) |
|---|---|---|
| Brute vs gremlin | gremlin, 100% of the time | 22 |
| Slime vs thief | slime, 100% | 15 |
| Frost vs thief | frost, 97% | 14 |
| Brute vs frost | frost, 100% | 13 |
| Gremlin vs slime, frost vs slime | coin flip | ~0 |

- **Counter relics do make forks interesting.** When you hold one, the countered enemy was always the better pick (+16.7 pts, n=9). The sample is tiny because counter relics are almost never worth taking.

### Enemies (greedy/smart; single-fight = F4 enemy, starting kit, 32 HP)

| Enemy | Run kill % | Single-fight loss % | Notes |
|---|---|---|---|
| Brute | **29.2** | 30.1 | 92 spin kills, 62 smash kills |
| Thief | **15.1** | 43.8 (Mousetrap: **0.1**) | 34-turn fights, 11 cells stolen per fight |
| Gremlin | 4.1 | 1.2 | Jam nerf overshot |
| Slime | 3.3 | 5.2 | |
| Frost | 3.3 | 2.4 | 38 turns; a reel frozen on **87%** of your turns |
| Golem | 1.8 | 0.4 | 4.4 rocks per fight, 0.7 left at run end |
| House | **51.2** | 41.5 (Crown: **10.3**) | |

**Freeze after the fix.** Frozen reels clunk to their worst cell, which is a shield. Two frozen shields plus one spinning reel gives a free shield jackpot a third of the time: **2.3–2.9 jackpots per fight on frozen reels** (the 1+2 rule only blocks pairs). The effect is harmless but weird, and the fight feels frozen all the time.

### Boss (2186 fights)

- **Length:** 12.2 turns (p10 7, p90 18), the shortest fight of the run. The finale is shorter than the fights before it.
- **Pot:** peaks at 19.7 on average (p90 31). The House cashes out 0.64 times per fight for an average of **20**; the player steals it 0.69 times per fight for 12.4 (58% of fights include a steal).
- **ALL IN:** reached in 87% of fights, around turn 8. You win 56% once it triggers. 15% of ALL INs are triggered by your own pot steal, so the pot "doubles" from 0 to 5.
- **Deaths:** 77% are pot cash-outs and 53% are bursts (≥50% HP two turns before death). Entering at ≥75% HP you still lose 48%. The pot exceeds your HP+shield at some point in 52% of fights, with no warning.

**Run length:** about 18 turns per fight plus 12 for the boss, roughly 100 turns (about 7 min at 1×). That's fine.

## 2. Bugs and readability

1. **The ALL IN label spoils the jackpot.** `drawPot` reads the model's `fight.allIn`, so "ALL IN POT" appears while your reels are still spinning toward the steal (snap `it2-boss-9`: boss at 27/44 HP, label already ALL IN). Fix: use presented state (`stage.gutter`) for the label.
2. **"2X SPEED" overlaps the pot widget's bottom edge.** Both are drawn at `cy+172`; visible at speed 2× and above.
3. **The ALL IN banner covers both HP bars** exactly when HP matters (`it2-allin-1`).
4. **A pot steal can trigger ALL IN on an empty pot,** so "THE POT DOUBLES" plays over a 0→5 pot.
5. **SNAP! plays after "STOLEN ×2".** It reads as "stolen, then saved"; show the snap on the cell that was saved.
6. **Stat line shows only the stat that moved most,** so swap cards look strictly good.
7. **Sim:** `greedyValue` rates High Roller at 4 even though it is the best boss relic, so the sim's win rates understate relic value.
8. **Minor:** the first `dbg.vs` after a run shows "FIGHT 2/5" instead of SANDBOX. The HUD shows 37/20 if HP is poked (debug only).

**Reads well:** fork screen (big, clear scouting reports), map badges, draft layout, the MITTENS!/LOCKPICKED! popups, pot odometer and tiers, and the −3 snap hit.

## 3. Prioritised changes (★ = top 5)

### Package H (3000 runs, win %)

| | Greedy / smart | Greedy / hardest | Greedy / random fork | HP first | Never relic | Swap first | Random | Boss lethal |
|---|---|---|---|---|---|---|---|---|
| Current | 35.6 | 28.2 | 31.6 | **44.1** | 33.5 | 26.6 | 23.6 | 51% |
| H (★1–3) | 39.6 | 35.0 | 38.8 | 36.9 | 36.2 | 32.0 | 21.5 | 41% |
| **H + elite forks at 1.25× HP (★4)** | **39.5** | **35.9** | 38.7 | 35.8 | 35.6 | 32.1 | 23.1 | 41% |

With the full package no simple policy dominates, the skill gap is 16 pts, and deaths spread 0.3/4.7/7.4/9.1/12.0/27.0%.

### (a) Balance
1. ★ **HP cards:** +max HP 6 → 4 and heal 12 → 8. Swap cards move 3 symbols instead of 2. This brings HP first from 44.1 down to 36.9, below greedy.
2. ★ **Enemy spread** (single-fight loss at F4):

   | Enemy | Change | Loss now → after |
   |---|---|---|
   | Brute | swords 6→5, shields 6→7 | 30 → 16% |
   | Thief | claws 4→3, shields 3→4 | 44 → 33% |
   | Frost | freeze fix below, plus ice 5→4 and swords 5→6 | 2.4 → 7.8% |
   | Gremlin, golem | HP ×1.25 | |

3. **Nerf High Roller:** doubles steal *half* the pot (it drops boss loss from 41.5% to 10.3%). **Mousetrap:** 35% chance and 2 snap damage (it currently takes the thief to 0.1% loss).
4. Fix `greedyValue`: crown 9, heal/maxHp lower, counter relics 2 unless their enemy is ahead.

### (b) Draft and incentives
1. ★ **Elite forks.** The harder option at a fork gets a skull badge, ×1.25 HP, and a free random relic when beaten. Without the HP bump, "always hard" jumps to 52.8% and becomes dominant. At 1.25× every fork policy lands within 4 pts, so the right pick depends on your kit and HP.
2. **Two-line stat delta** on strip cards (gain in green, loss in red): "ENERGY 1.37→1.72 / SHIELD 1.37→1.00".
3. **Counter relics become "PREP" cards,** offered as the third card only when their enemy is on the next fork. Remove them from the relic pool.
4. Replace +1 BOLT (best 2% of the time) with +2 BOLTS, or drop it.

### (c) Enemies and boss
1. ★ **The House skims.** Each cash-out takes half the pot (rounded up) and leaves the rest growing. Cash out every 4 turns; keep 44 HP (46–48 for a longer finale). Effect: boss lethal 51 → 40%, burst deaths 53 → 12%, cash-out average 20 → 7 (p90 32 → 12), 1.2 cash-outs per fight, 13.4 turns. That is more swings and fewer one-shots, and the pot stays progressive.
2. **Frozen reels never share a payline symbol.** Frozen-reel jackpots drop from 2.3 to 0.1 per fight.
3. **ALL IN always adds at least +8,** even from an empty pot.

### (d) Feel and readability
1. ★ Fix bugs 1–3 in §2. Add a **"LETHAL!" pot state:** when pot ≥ your HP + shield, the widget pulses red and the countdown shakes. A passive telegraph that makes the cash-out countdown dramatic.
2. A danger pip (1–3 skulls) on each fork card, and an elite badge.
3. SNAP! on the saved cell, before "STOLEN".

## 4. Art needed

| Sprite id | Description |
|---|---|
| `potTier4` | Overflowing pot with a red glow and a skull coin on top (LETHAL state) |
| `mapBadgeElite` | 8×8 skull-in-crown badge for elite fork nodes |
| `dangerPip` | 6×6 skull pip for fork cards |
| `cardPrep` | Card icon: a shield with a crosshair (PREP cards) |
| `symWild` | Rainbow star, same size as `sword` (next feature) |
| `cellGilded` | Gold corner sparkle overlay for enhanced cells (next feature) |

## 5. Next big feature: WILDS and enhanced cells ("Gilding")

Watch-only fights need builds that come from your strip; right now the strip barely changes over a run. Make individual cells upgradeable, in the way Balatro enhances cards:

- **WILD** matches anything and scores as the best symbol it completes. Sim: one shield turned into a WILD on reel 2 cuts losses to the brute from 27% to 20%, the thief from 40% to 22%, and the House from 48% to 40%. That is roughly the value of a 2-cell swap, and much juicier to watch.
- **Enhancements:**
  - GOLD pays ×2 even as a single.
  - CHARGED bolt gives +1 energy.
  - KEEN sword pierces shields.
  - SPIKED shield reflects 2 when you're hit while it sits on your payline.
- **Draft:** non-relic drafts become enhance / swap-or-add / HP. Relics that key off enhancements (e.g. Whetstone: KEEN swords +2) create builds.
- **Enemies interact with it:** the thief steals enhanced cells first, slime prefers them, and freeze clunks away from them. That gives counter relics a job (Mousetrap protects your build) and makes the writers personal.
- **Constraints:** fully passive, no in-fight input. The strip mini-map shows gilded cells, so you can watch your build land.
