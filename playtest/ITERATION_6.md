# Iteration 6 Playtest: Act 2, The Mirror, Legendaries, New Gilds

**Method.**
- **Headless.** I wrote a new `scratch/it6_lib.ts`: a full 12-fight run loop with pluggable draft, fork, shop and legendary policies, plus per-fight instrumentation (bombs, hexes, drain, mimic, reflections, killing blow, phoenix, lucky wilds). Scripts:
  - `it6_arc`: 3 policies × 5 cabinets × 1000 runs.
  - `it6_mirror`: Mirror deep dive, including telegraph accuracy.
  - `it6_legend`: each legendary forced at the transition, same seeds, 1500 runs per cell, commit and greedy policies.
  - `it6_gild`: 1,764 runs snapshotted at the start of act 2, then replayed with a free gild or FULL SET of each type.
  - `it6_mech`: act 2 writers in real runs.
  - `it6_mirrorfix` and `it6_mirrorfix2`: 9+7 Mirror variants on 2,000 Mirror snapshots.
  - `it6_pkg`: act 2 HP curves × Mirror fix, plus act 2 fork policy.
  - Smaller checks: `it6_hexvar`, `it6_goldonce`, `it6_chips`, `it6_statcheck`, `it6_hexcheck`.
  - Outputs are in the matching `.txt` files.
- **Live (:4173).** One MIDAS run walked with forced wins through act 1, then real fights in act 2 (Bomber B1 and the Mirror). Sandbox fights against the Hexer and the Vampire with gilds and Phoenix. Snaps are `snaps/i6p-*.png`.

## Verdict

**Act 2 doubles the run and the new writers are good ideas, but the second half has no climax.**

1. **The Mirror is not the Mirror yet. It is a special race of 2–3 spins.**
   - Average fight length is 4–8 turns, and 17% of Mirror fights end within 2 turns.
   - REFLECTION, its signature, **never fires in 77% of Mirror fights**. It accounts for 8% of the damage the Mirror deals.
   - The Mirror's *specials* deal **66%** of its damage and **58% of killing blows**. It copies your bolts and charged gilds, and in TESLA and Rod runs it also gets your special rules.
   - **The telegraph is right 1 time in 5.** It also spoils your spin before the reels land.
2. **Regular act 2 fights are a build check, not a ramp.**
   - Strong builds stomp them: 43% of fights cost under 10% HP, against 21% in act 1. Fights also get *shorter and easier* through the act (B1 11 turns / 33% HP lost → B5 7 turns / 17%).
   - Weak builds die in them: THORN loses 10–18% per act 2 fight.
   - They aren't filler (65% of act 2 runs meet at least one scary regular fight), but the arc inverts.
3. **The legendary pick is a real choice, but it has a default.** The best-to-worst spread in a 3-offer is 7 pts, and at least 5 pts in 72–77% of offers.
   - **OVERCHARGE** is the best pick 42–51% of the time (+13–14 pts act 2 clear).
   - **GOLDEN TICKET** is a trap (+3.5–4.3, weakest).
4. **The cabinet spread explodes in act 2.** Act 2 clear under commit play is **MIDAS 61–64% vs THORN 20–25%**.
   - GOLD is the best gild in the game: +11 pts for a single gild, twice any other.
   - SPIKED barely scales: a SPIKED FULL SET is worth +3.9.
5. **The new gilds:**
   - **BLAZE** is good (+6 single / +17 set).
   - **VAMP** is fine as a set.
   - **LUCKY** is a trap as a single gild (+1.7; a lucky WILD lands 4.5% of spins).
6. **Package M (the ITERATION_5 fixes) held.** Act 1 is unchanged at 44.7% clear; the COMPLETES SET ribbon, set pips and full-HP heal hiding work.

**The fix is mostly one package (§5).**
- **The Mirror's HP is sized to your machine's damage output, not your max HP.**
- **Its bolts charge REFLECTION instead of firing specials.**
- **REFLECTION throws your best hit since the last reflection, every 3 turns (every 2 once cracked).**

Tested:

| | Current | Package |
|---|---|---|
| Mirror win | 61% | 61% |
| Cabinet spread | 41–76 | 54–71 |
| REFLECTION fires in | 23% of fights | 79% of fights |
| Damage from REFLECTION | 9% | 67% |
| Telegraph exact | 23% | 75% |
| Close wins | 21% | 35% |

## 1. Numbers

### Official sim (`npm run sim -- --runs 2000`, matches the I6 log)

greedy 20.4% / relic 15.2% / random 10.7%. House 73%, Mirror 60%. Deaths by fight: A1 1, A2 10, A3 12, A4 6, A5 9, HOUSE 16, **B1 2, B2 3, B3 4, B4 1, B5 1**, MIRROR 13.

### Run win % by cabinet (1000 runs each, `it6_arc`)

| Policy | KNIGHT | MIDAS | THORN | TESLA | JOKER |
|---|---|---|---|---|---|
| greedy (sim replica) | 22.3 | **31.3** | 15.9 | 22.0 | 19.3 |
| commit (build-aware + set completers) | 18.6 | **30.6** | **13.1** | 28.1 | 20.2 |
| random | 10.2 | 17.8 | 10.4 | 12.9 | 12.3 |
| Mirror win, commit | 54.5 | **77.5** | **47.6** | 63.6 | 65.0 |
| act 2 lethality per fight (B1–B5), commit | 5/8/9/4/8 | 7/3/4/1/3 | **11/13/18/8/15** | 4/4/5/3/3 | 5/6/14/4/10 |

- **Act 1 is balanced and act 2 breaks it.** Act 1 clear sits at 44–55% for every cabinet.
- **The skill gap is about 10–12 pts on a 20% base** (greedy/commit roughly 2× random).
  - Act 1 clear: 45% greedy vs 31% random.
  - Act 2 clear, given you reached act 2: 46% vs 35%.
- **Taking elites in act 2 beats the sim's fork policy:** 50.6% act 2 clear vs 41.9% for safe forks and 42.5% for the sim's greedy forks (§ Incentives).

### The act 2 arc: per-fight feel (greedy, all cabinets, about 2,000 fights per node)

| Node | Death | HP lost (% of max) | Stomp (<10% lost) | Scary (>50% lost or death) | Turns |
|---|---|---|---|---|---|
| act 1 regular (avg) | 9.8% | 33% | 21% | 24% | 16.6 |
| HOUSE | 23.7% | 33% | 28% | 31% | 14.0 |
| B1 | 5.5% | 33% | 32% | 26% | 11.2 |
| B2 | 4.8% | 25% | 38% | 19% | 9.7 |
| B3 | 7.1% | 19% | 47% | 11% | 10.7 |
| B4 | 2.9% | 17% | **53%** | 10% | 8.9 |
| B5 | 4.6% | 17% | **51%** | 11% | **7.4** |
| **MIRROR** | 35.9% | 49% | 32% | 54% | **4.2** |

- **The arc runs backwards.** B1 is the hardest regular fight and B5 the softest. The act 2 HP curve (+37% from B1 to B5) grows slower than the player: 4 Cashier visits, relic drafts and elite legendaries.
- **Commit players see a similar shape:** B1 6.3% → B4 4.0%, 35% stomps.
- **Swingy by build.** 65% of act 2 runs meet at least one scary regular fight. THORN dies in 10–18% of act 2 fights, while MIDAS loses 1–7% (1–3% after B1).

### Act 2 enemies (greedy, all cabinets)

| Enemy | Share of act 2 fights | Death | HP lost | Stomp | Turns | Notes |
|---|---|---|---|---|---|---|
| HEXER | **26%** | 5.8% | **30%** | 33% | 11.7 | 66% of your spins are hexed |
| BOMBER | **22%** | 4.9% | 21% | 50% | 8.3 | bombs = 38% of its damage |
| frost | 12% | 5.1% | 22% | 42% | 9.8 | |
| thief | 10% | 3.0% | 15% | 54% | 8.4 | |
| MIMIC | 10% | 6.3% | 27% | 35% | 7.6 | COPYCAT = 54% of its damage |
| golem | 7% | 3.8% | 13% | 57% | 12.2 | 114 HP non-elite |
| VAMPIRE | 7% | 5.0% | 21% | 41% | 7.4 | drain 6.5/fight, heals 14% of its HP |
| gremlin | 6% | 4.4% | 16% | 52% | 10.4 | |

- **The mix is skewed:**
  - The B1 opener pool is only Bomber or Hexer.
  - "At least one new face per fork" pushes those two again.
  - Vampire and Mimic (minDepth 1) are rarer than Frost.

### THE MIRROR deep dive (commit, 1,407 Mirror fights, `it6_mirror`)

| Cabinet | Win | Turns | Your spins | REFLECTION fired 0× | Mirror HP | Your max HP | Your biggest spin |
|---|---|---|---|---|---|---|---|
| KNIGHT | 58% | 6.2 | 3.4 | 71% | 82 | 32 | 53 |
| MIDAS | **79%** | 4.3 | 2.5 | **92%** | 72 | 22 | **92** |
| THORN | **44%** | 7.7 | 4.1 | 50% | 75 | 28 | 38 |
| TESLA | 66% | 4.4 | 2.5 | **91%** | 70 | 25 | 43 |
| JOKER | 62% | 5.2 | 2.9 | 82% | 72 | 27 | 56 |

- **Damage to you by source:** Mirror special **66%**, sword 22%, REFLECTION 7.6%, spikes 4.4%.
- **Killing blows:** special 58%, sword 19%, REFLECTION 17%.
- **65% of Mirror deaths happen before any REFLECTION has fired.**
- **Fight length (total turns):** 1–2: 17.5%, 3–4: 26%, 5–6: 24%, 7–8: 16%, 9+: 17%.
- **Telegraph.** When the panel says **REFLECTS NEXT TURN! N**, the hit equals N only **21%** of the time. The mean miss is 8.2. N is the *previous* spin's damage; the hit uses the spin you're about to take.
  - Reflections sit at the cap (20) 22% of the time and at the minimum (3) 33%.
- **The Mirror's HP scales with your max HP, not your damage.**
  - Glass cannons face small Mirrors: MIDAS 72 HP vs its 92-damage spins, a one-spin kill.
  - Tanky low-damage builds face a long special race: THORN.
- **Win by legendary:** Sandglass 77% (it delays REFLECTION to every 6 turns), phoenix 66%, overcharge 64%, key 57%.

### Legendary pick (act 2 clear % among runs that beat the House; `it6_legend`, 1500 runs per cell)

| Legendary | Commit: Δ vs none | Greedy: Δ vs none | Best of the 3-offer (commit / greedy) |
|---|---|---|---|
| **OVERCHARGE** | **+14.0** | **+12.7** | **42% / 51%** |
| JACKPOT BELL | +11.5 | +7.4 | 35% / 16% |
| PHOENIX FEATHER | +8.9 | +6.1 | 16% / 15% |
| SKELETON KEY | +7.2 | +4.5 | 5% / 5% |
| GOLDEN HOURGLASS | +7.1 | +4.9 | 2% / 7% |
| **GOLDEN TICKET** | **+3.5** | **+4.3** | 0% / 6% |

- **It is a meaningful choice.** The mean best-to-worst spread is 7.0 pts, and the spread is at least 5 pts in 72–77% of offers.
- **The best pick depends on the cabinet:**
  - Bell is best for MIDAS/THORN under commit.
  - Phoenix is best for TESLA under greedy.
  - Overcharge is never bad.
- **Why Ticket is a trap.** Committed builds already own their FULL SET by act 2, so Ticket adds nothing, and it costs +3 Mirror HP like any relic.

### Gild values in act 2 (free gift at the start of act 2, Δ act 2 clear, average of 5 cabinets, `it6_gild`)

| Gild | 1 reel | FULL SET (3 reels) |
|---|---|---|
| **GOLD** | **+11.2** | **+22.9** |
| BLAZE (new) | +6.2 | +17.3 |
| CHARGED | +5.0 | +13.6 |
| VAMP (new) | +4.8 | +14.6 |
| SPIKED | +2.2 | **+3.9** |
| KEEN | +2.0 | +8.5 |
| **LUCKY (new)** | **+1.7** | +8.8 |
| *(reference)* +8 max HP | +5.0 to +7.9 | |
| *(reference)* +20 chips | +2.9 to +15.0 | |

- **GOLD dominates.**
- **LUCKY is a trap on 1 reel.** It is worth less than a max HP card; lucky WILDs land on 4.5% of spins.
- **SPIKED is dead weight in act 2.** This is THORN's collapse.
- **New gilds compete with old ones for the same cells** (one gild per symbol per reel):
  - BLAZE vs CHARGED on bolts.
  - VAMP vs KEEN vs GOLD on swords.
  - LUCKY vs SPIKED/GOLD on shields.
  - TESLA's charged bolts on every reel mean it can **never** take BLAZE: the gift gave 0.
- **Tested and rejected: GOLD pays once per group** (not once per gold cell). MIDAS act 2 clear drops 64 → 55, but it also cuts every cabinet 2–6 pts and MIDAS act 1 drops 46 → 40. The Mirror fix below handles MIDAS better.

### Act 2 mechanics (`it6_mech`, 4,000 runs)

- **Bombs.**
  - 5.8 planted per Bomber fight: **defused 13.5%**, exploded 31%, the rest outlived the fight.
  - Blast damage is 3.9 HP per fight (1.5 blocked).
  - Bombs are 38% of the Bomber's damage and the killing blow in 41% of Bomber deaths.
  - Defusing is pure luck: only 44% of Bomber fights see even one defuse.
- **Hex.**
  - 5.5 hexes per fight, and **66% of your spins are hexed** (half pay, gilds dark). The fight takes 12.7 turns vs 11.2 for other act 2 fights.
  - Deaths are only slightly above other act 2 fights (KNIGHT 9.0% vs 6.7%), but for two-thirds of the fight your build (your only agency) is switched off.
  - **Tested: single hexes fizzle** (like single locks). Hexed spins drop to 29% and Hexer deaths to 2.8% (from 6.9%): too soft alone, so pair it with more HP.
- **Vampire.** Drains 6.5 HP per fight and heals itself 9.8 (14% of its HP). Readable and fair.
- **Mimic.**
  - GULP actually eats only **1.4 chips per fight** (it gulps on ability turns, and fights are short). Mimic wins net +5.7 chips vs +7.2 for other fights; net ≤0 in 10% of wins.
  - **Economically GULP doesn't feel bad; it barely registers.** The real sting is COPYCAT: 2.9 hits for 6.6 HP.
  - The feel-bad is visual: "ATE 2 CHIPS!" plays but the counter doesn't move (bug E4).
- **Phoenix.**
  - Fires in 12% of act 2 fights; in the Mirror, 47%.
  - Only 25–29% of saves go on to win. At 1 HP you're usually dead next hit.
  - It's still +6 to +9 pts.
- **Economy.**
  - Players arrive at the act 2 intro Cashier with 12–22 chips.
  - Legendaries on the top shelf (20 chips) are bought only 0.13–0.31 times per act 2 run.
  - 7–10 chips are left unspent at the Mirror. They do nothing there: the chip shield is House-only.

### Incentives and fairness

| Question | Finding |
|---|---|
| Act 2 elites | **Dominant.** Always taking the act 2 elite = 50.6% act 2 clear vs 41.9% safe (elites die 11.6%, lose 28% HP). Act 2 spoils can include legendaries, and the +2 chips + relic far outweigh ×1.25 HP. It is hidden in the official sim because its fork rule uses act 1 DANGER values. |
| Elite labels | DANGER picks the elite. "ELITE HEXER 78 HP" can sit next to a plain "ROCK GOLEM **114** HP". |
| MIDAS in act 2 | 30% run win vs KNIGHT 19–22%. It comes from GOLD's per-cell compounding and a Mirror sized to 22 max HP. |
| THORN in act 2 | Worst: act 2 clear 14–26% for every legendary. Its Mirror copies its SPIKED shields and hits it back. |
| Mimic chip gulp | Harmless in numbers, confusing on screen. |
| Hex | Fair in lethality, bad in feel (66% of spins). |
| Bombs | Readable once you know the rules. In practice the art is hidden (E3), and "LAND THEM TO DEFUSE" promises agency the player doesn't have. |

## 2. Bugs

| # | Bug | Repro |
|---|---|---|
| **E1** | **The REFLECTION panel spoils the spin and mispredicts.** `drawReflection` reads engine state (`fight.last.player.damage`). `step()` resolves the whole turn before the reels animate, so the number jumps to the new value while the reels are still landing. It also shows the *last* spin, not the one the reflection will use: exact only 21–23% of the time. | Mirror fight, press SPIN, `dbg.tick(0.4)`: panel shows 20 while the enemy HUD still reads 72/72 (`i6p-mirror-spoiler.png`). `it6_mirror` telegraph line. |
| **E2** | **Hex vs gold is wrong in two places.** (a) `stampGilds` skips locked reels but not hexed ones, so hexed gold cells still flash X2. (b) `fullSet` is fixed at fight start, so with 2 of 3 gold reels hexed the surviving cell still pays the SET ×3. (c) Gold stamps are always `stampX2`; a GOLD FULL SET pays ×3 (D3 remains for gold). | `it6_hexcheck.ts`: hex [2,2,0] with gold on all reels gives notes `["X3","HALF"]` = 13. `i6p-hex-2.png`: three X2 stamps on 2 hexed reels. |
| **E3** | **Bombs are hard to read.** (a) The fuse badge is drawn over the corner bomb sprite, so only a "3" in a box shows. (b) Bombs off screen are invisible: no strip-map tick, no counter. "BOOM" comes out of nowhere. (c) Bombs are planted on the *payline* cell (the code comment says never, but the filter doesn't exclude it). They look "landed" but only defuse if your next spin lands the same cell. | `i6p-bomber-2.png`: 2 bombs on the payline, fuse 3, not defused; 3 more off screen with no trace. `fight.ts plantBombs`. |
| **E4** | **Mimic GULP doesn't touch the chip counter.** Chips fly into the Mimic ("ATE 2 CHIPS!") but the top-left counter only drops after the fight. Eaten chips come out after that fight's earnings, so the post-fight "+N chips" is overstated too. | `game.ts drawRelics` reads `run.player.chips`; `finishFight` subtracts `chipsEaten` after adding earnings. |
| **E5** | **The Mirror inherits your special rules.** TESLA's cost 4 / damage 7 and LIGHTNING ROD's cost 4 / damage 12 overwrite the shared `cfg.specialCost` and `cfg.specialDamage`. The Mirror fires your Rod special, despite "none of your relics". It matters because specials are 66% of the Mirror's damage. | `Fight` constructor lines 144–150; any Rod run at the Mirror. |
| E6 | **The new gild cards have no stat line.** VAMP, LUCKY and BLAZE cards show no before→after. The stat line also ignores BELL and KEY. | `it6_statcheck.ts`: lucky/vamp/blaze `{gain:"",loss:""}`; bell+key identical to none. |
| E7 | **The act 2 Cashier's 5-slot shelf overflows.** Titles cross card borders ("LUCKY CLOVER"/"SKELETON KEY" collide) and body text is cut ("…BECOMES A"). | `i6p-shop-intro.png` |
| E8 | **Relics overflow at 10.** In fights the 10th relic hides under the STRIPS panel. On the preview the relic row wraps onto the FACE THE MIRROR button. Act 2 runs reach 8–10 relics routinely. | `i6p-mirror-preview.png`, `i6p-mirror-spoiler.png` |
| E9 | **The legendary and act 2 intro Cashier screens still show the House fight.** "+8 SH/TURN" top-left, and "THE HOUSE 0/85 / CASH OUT IN 4" behind. The chip shield doesn't exist in act 2, and the readout tempts hoarding. | `i6p-legend.png`, `i6p-shop-intro.png` (`this.fight` is still the House until `showNextFight`) |
| E10 | **Text overflow.** "REFLECTS NEXT TURN!" is wider than its panel. The PHOENIX subtitle overflows the banner and covers both HUDs. "NEW CABINET UNLOCKED" overlaps the over-screen table. The LEGENDARY label sits on the card border. | `i6p-mirror-ability-0.png`, `i6p-vamp-drain2.png`, `i6p-over-win.png`, `i6p-legend.png` |
| E11 | **Wording.** The Mirror blurb says "REFLECTS YOUR BEST HITS"; the rule is "your last spin". The Bomber's "LAND THEM TO DEFUSE" reads as an instruction in a watch-only game. The Mirror preview's rules footnote is 1× text. | `i6p-mirror-preview.png`, `i6p-b1-preview.png` |
| E12 | **Tooling.** `TUNE.mirrorHp` is dead (real HP = `mirrorPerMaxHp` formula), so `act2probe --sweep`'s "mirror 70/90/110" axis is a no-op. `dbg.vs('mirror')` uses 85 HP, not the real formula. | `enemies.ts makeEnemy` vs `run.ts enemyHp` |
| E13 | **The Mirror casts your junk.** Your strips' permanent rocks count as its writer symbols, so it throws rocks at you. Harmless in the final fight, but odd. | `makeCombatant` only clears `casts` for the player |
| E14 | The over screen's act divider has no ACT 1 / ACT 2 labels. The "1 ROUNDS" singular is wrong. | `i6p-over-win.png`, `i6p-legend.png` |
| E15 | `Cabinet.enemyAbilityMinus` is still dead code (D12). | |

## 3. Prioritised changes (★ = top 5)

### (a) The Mirror and the act 2 arc
1. ★ **Package N: rebuild the Mirror around REFLECTION** (tested in `it6_mirrorfix2`/`it6_pkg`, fix6):
   - **HP sized to your machine:** 6 × your expected damage per spin (the `stripStats` damage + energy→special value the stat lines already compute) + 20. It replaces 1.9 × max HP + 3/relic.
   - **The Mirror's bolts charge nothing.** It has no specials of its own; it only reflects. This also fixes E5.
   - **REFLECTION = your best hit since the last reflection** (cap 20, min 3). It matches the blurb, and the panel number only goes up, so it is a true "at least" telegraph.
   - **Every 3 turns, every 2 once cracked.**
   - Results:

     | | Now | Package N |
     |---|---|---|
     | Mirror win | 61% | 61% |
     | Cabinets | MIDAS 76 / THORN 42 | 54–71 |
     | REFLECTION fires ≥1× | 23% | 79% |
     | REFLECTION fires ≥2× | 0.6% | 29% |
     | REFLECTION share of damage | 9% | 67% |
     | Telegraph exact | 23% | 75% |
     | Stomps | 46% | 36% |
     | Close wins (<25% HP left) | 21% | 35% |

   - Fights run 7.6 turns (from 5.6). For a longer fight, use HP 7× (56% win, 8.1 turns, 34% two-plus reflections).
   - In full runs, run win 21.1 → 22.2, and MIDAS 28 → 22 while KNIGHT 19 → 24.
2. ★ **Fix E1:** the REFLECTION panel reads presented state and updates only when the hit lands.
   - Show "AT LEAST N" with the best-since mechanic.
   - Add a persistent crack overlay on the Mirror's machine after CRACKED.
3. **A steeper act 2 HP curve `[52,62,73,85,97]`** (was `[57,62,68,73,78]`).
   - Lethality climbs B1 4.4% → B5 11.1% (was 6.6 → 6.0). Act 2 clear is neutral (40.8 vs 41.9).
   - The stomp rate barely moves (35%): stomps come from builds, not HP. Pair this with (b)2.
4. **Act 2 elites:** fix the always-elite edge (+8.7 pts).
   - Either act 2 elite HP ×1.4, or spoils = 1 of 2 *non-legendary* relics + chips.
   - Re-derive DANGER for act 2 from `it6_arc` (the golem is the easiest act 2 fight at 114 HP).
   - Show both HPs on the fork so ELITE never looks weaker.
5. **Opener mix:** add VAMPIRE and MIMIC to the B1 pool (minDepth 0 in act 2) so Hexer and Bomber aren't 48% of act 2.

### (b) Upgrades, relics, cabinets
1. ★ **THORN's act 2 scaling.** SPIKED needs a late-game form. Target: THORN act 2 clear within ±5 of KNIGHT.
   - Options:
     - A SPIKED FULL SET hits back for *your current shield* (min 4).
     - Spikes pierce.
     - Act 2 offers a "BARBED" tier.
   - A SPIKED SET is currently worth +3.9 vs 9–23 for the others.
   - Also stop the Mirror copying spiked shields (the Mirror should copy what you *hit* with).
2. **Gild tiers** (the user wants "more powerful upgrades"). In act 2, a gild card on a cell you already gilded with the same gild upgrades it to tier II instead of being unofferable:
   - GOLD II ×3 per cell.
   - KEEN II +3 pierce.
   - SPIKED II hit back 4.
   - LUCKY II 50%.
   - This gives non-GOLD builds a way up and makes act 2 drafts about *your* build, not new ones.
3. **Legendary balance:**
   - GOLDEN TICKET: "FULL SET on 2 reels, and your FULL SET bonuses are +1 step" (×4 gold, +3 keen…).
   - SKELETON KEY ×2 (it's ×1.5 of a double: small).
   - OVERCHARGE echo at 1/3 (from 1/2).
   - Target: every legendary +7 to +11.
4. **LUCKY:** 35% per cell (from 25%), or LUCKY WILDs pay ×2 when they complete a match. Make it the JOKER cabinet's act 2 favoured gild (JOKER has no build: I5 finding).
5. **Stat lines for VAMP/LUCKY/BLAZE/BELL/KEY** (E6): HEAL/SPIN for vamp, WILD% for lucky, SPECIAL DMG for blaze.
6. **Chips at the Mirror:** a final sink so the last act 2 Cashier matters.
   - For example, "unspent chips = +1 max HP per 5 for the final fight", or reuse the chip shield vs REFLECTION.
   - The TODO from I5 (HIGH STAKES markers) fits here too.

### (c) Enemies
1. **HEXER:** single hexes fizzle (like locks), CURSE hexes 1 reel for 3 turns, and hexer HP ×1.1.
   - Tested: fizzling singles cut hexed spins 66% → 29%, deaths 6.9 → 2.8. Add HP to land back near 5–6%.
   - Also break the FULL SET while a set reel is hexed (E2b).
2. **BOMBER:**
   - Never plant on the current payline cell.
   - Show live bombs as strip-map ticks and a "BOMBS 3 · NEXT BOOM 1" line under the enemy HUD.
   - Reword the blurb to "BOMBS ON YOUR PAYLINE GET DEFUSED".
   - Optional: raise defusal to "a bomb anywhere in your *visible* window at spin end is defused on a matching symbol line", so pairs defuse. Today it's 13.5% pure luck.
3. **MIMIC:** tick the chip counter down on GULP (E4). Gulp 2 per charge is fine; don't nerf.
4. **More enemies (user direction):** act 2 veterans could get act 2 twists instead of +2 swords:
   - FROST that freezes bombs in place.
   - GOLEM whose rocks are hexed.
   - That's cheap variety using existing writers.

### (d) Feel and readability
1. ★ **The readability pass for act 2 writers:**
   - E3 bombs: a larger overlay or the fuse number on the bomb body, a red cell tint at fuse 1, and strip-map ticks.
   - E2 stamps.
   - E4 chip counter.
   - E9 stale House HUD on act 2 intro screens.
2. **Layout:** E7 (5-slot shelf: 1.5× title max width, or shrink to 4 + legendary pedestal), E8 (relic grid 4 wide or scroll), E10/E11 overflow and wording.
3. **Over screen:** "ACT 1 / ACT 2" plaques on the divider.
4. **What already works:**
   - The act transition (the act 2 map preview on the legendary screen).
   - The PHOENIX moment.
   - The hex overlay (purple tint + turn badge).
   - The COPYCAT / DRAIN / YOUR OWN HIT callouts.
   - The Cashier's legendary shelf.

## 4. Art needed

| Sprite | Description |
|---|---|
| `bombOverlay` v2 | 16×16 bomb filling ~60% of the cell, fuse spark top-right, with room for a 1-digit fuse number on the body; plus a red `bombTint` at fuse 1 |
| `tickBomb` | Strip-map tick for a live bomb (like the gild ticks) |
| `stampX3` | Gold FULL SET stamp (today every gold stamp says X2) |
| `mirrorCrack` | Persistent crack overlay for the Mirror's machine after CRACKED (2 stages) |
| `reflectMeter` | Small "best hit so far" meter frame for the REFLECTION panel |
| `legendFrame` | Distinct gold/violet card frame for legendary cards (draft, spoils, shelf) instead of a text label |
| `actPlaque` ×2 | "ACT 1" / "ACT 2" plaques for the over-screen divider and map |
| `enhTier2` ×4 | Tier II variants of gold/keen/spiked/lucky overlays (if gild tiers ship) |
| `markerChip`, `houseRule` ×6 | Still pending from ITERATION_5 (HIGH STAKES) |

## 5. Package N summary (what I'd ship next)

1. Mirror: HP = 6 × expected damage per spin + 20; no Mirror specials; REFLECTION = best hit since last (3–20), every 3 / cracked every 2; panel from presented state, "AT LEAST N".
2. Act 2 HP `[52,62,73,85,97]`; act 2 elite HP ×1.4 or non-legendary spoils; Vampire/Mimic in the B1 pool.
3. THORN/SPIKED act 2 scaling (shield-sized spikes on a set) and gild tier II.
4. Legendaries: Ticket and Key up, Overcharge echo 1/3. LUCKY 35%.
5. Hexer singles fizzle + HP ×1.1; bombs off the payline + visible ticks; chip counter on gulp.
6. Readability/bug batch E1–E15.

- **Sim targets for I7:**
  - Every cabinet within ±5 of KNIGHT on act 2 clear under commit play (now 20–64).
  - Mirror win 55–65%, with REFLECTION firing in ≥75% of fights.
  - Act 2 per-fight lethality rising from B1 to B5.
  - No legendary best in more than 35% of offers.
  - Every legendary +6 to +11.
  - Act 2 elite − safe within ±3 pts.
