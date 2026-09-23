# Iteration 7 Playtest: The Mirror Rebuilt, Gild Tiers, the Act 2 Arc

**Method.**
- **Headless.** New `scratch/it7_lib.ts` extends `it6_lib`. It adds a tier-aware `commit` policy (a tier II of your build gild ranks about level with growing the set), plus `tierfirst`, `notier`, and act-2-only fork policies (`elite2`/`safe2`). Most comparisons use **identical B1 snapshots**: each run is played with commit through act 1, the legendary and the intro Cashier, then act 2 is replayed from the same state under each variant (common random numbers). Scripts and outputs (`.txt`) are in `playtest/scratch/`:
  - `it7_arc`: 4 policies × 5 cabinets × 1000 full runs.
  - `it7_skill`: act 2 policies from snapshots.
  - `it7_mirrordeep`, `it7_mirrorsrc`: the Mirror, telegraph honesty, damage sources.
  - `it7_legend`: forced legendaries, 1500 runs per cell.
  - `it7_gild`, `it7_gildcap`: free gifts at B1, taxed and untaxed.
  - `it7_chase`: chasing each act 2 gild.
  - `it7_cabarch`, `it7_cabfix`: cabinet × enemy, cabinet levers.
  - `it7_elite`, `it7_elite2`, `it7_elitefix`: act 2 elites.
  - `it7_mirrorhp`, `it7_mirrorhp2`, `it7_pkgO`, `it7_pkgO2`: Package O candidates.
  - `it7_mech`: writers.
  - `it7_power.ts`: a "typical spin" machine power (per-spin damage capped, Rod-aware) used by the candidates.
- **Live (:4173, fresh `build:playtest`).**
  - One THORN run (seed 777): act 1 walked with forced wins, B1 Hexer played for real, act 2 walked taking every TIER II, then the Mirror played for real (won on turn 8 at 13/36).
  - Sandboxes: a GOLD FULL SET vs a Hexer (hex breaking the set), and bombs.
  - Snaps are `snaps/i7p-*.png`.

## Verdict

**The Mirror is now a real climax, but act 2 decisions barely matter, and the few that do push you away from the new upgrades.**

1. **Package N landed where it aimed hardest: REFLECTION *is* the Mirror now.**
   - REFLECTION deals **60% of the Mirror's damage** (was 8%) and lands **48% of killing blows** (was 17%).
   - The Mirror cracks in 84% of fights, and 29% of wins are close (under 25% HP left).
   - Fights last 8.6 turns (was 4.2), and only 5% end within 2 turns (was 17.5%).
   - **"AT LEAST N" never lied:** 0 of 896 reflections hit for less than the panel showed, and 79% hit exactly.
   - Live it felt like a boss. My THORN run's SPIKED FULL SET killed the cracked Mirror *on its own REFLECTION turn*. That is the best moment the game has produced.
2. **But it is a tax on building.** The Mirror's HP is 3 × your machine's *expected* damage + 55, and that means:
   - Every point of damage you add in act 2 is partly handed to the Mirror. GOLD's rare ×27–×64 jackpots dominate the expectation: MIDAS faces a **330 HP** Mirror, THORN a 95 HP one.
   - A free GOLD FULL SET at B1 is worth **+5.7 pts** with the tax and **+18.7** without it.
   - A GOLD SET + tier II **cost TESLA 22 pts**. That upgrade makes you worse.
   - Result: **random drafting wins the Mirror as often as commit play (70% vs 71%)**, and **random-draft act 2 clear is within 2–3 pts of commit** (skill gap in act 2 is about 0; act 1 is healthy at 16 pts).
3. **Gild tier II is a trap.**
   - The **commit-but-never-take-tier-II** policy beats tier-aware commit by **+6.7 pts** of act 2 clear. "Tier-first" is worst.
   - A free tier II on one build gild is worth +1.8; **+8 max HP is worth +15.8**.
   - In act 2 the right play is "skip the upgrade, take HP, fight elites". That is the opposite of the fantasy the user asked for ("more powerful upgrades").
4. **The act 2 elite is more dominant, not less.** Always taking the act 2 elite is **+10.5 to +11.3 pts** (target ±3; I6 was +8.7). Non-legendary spoils still mean 3+ extra relics per run. **Tested fix: act 2 elite HP ×1.5 → +2.1.**
5. **Cabinet spread moved, it didn't shrink.** Act 2 clear under commit is **TESLA 66.5 / KNIGHT 48.7 / MIDAS 45.7 / JOKER 38.7 / THORN 31.1**.
   - MIDAS is fixed (by the tax).
   - TESLA is the new outlier. `machinePower` ignores Rod, Battery and Overcharge, so its Mirror is undersized: 108 HP vs 33 realized damage per spin.
   - THORN now wins the Mirror (74–77%) but still dies in B-fights (B3–B5 lethality 19/17/26%).
6. **What's healthy:**
   - The act 2 arc now climbs (B1 4.4% → B5 11.8% under commit).
   - The legendaries are balanced (+6.4 to +11.4 under commit). The flip side is that the pick got less interesting (spread 7.0 → 4.2 pts).
   - The Hexer rework reads well (hexed spins 66% → 38%).
   - The opener mix is fixed.

**Next package (§5, "Package O"):**
- Cap REFLECTION at 60% of your max HP.
- Size the Mirror on a *typical* spin, not the expectation.
- Act 2 elites ×1.5 HP.
- Tier II upgrades the whole gild.
- THORN/TESLA levers.
- A readability batch led by the stale countdown after CRACKED (F1).

## 1. Numbers vs the I7 targets

| Target (from ITERATION_6 §5) | Result | |
|---|---|---|
| Every cabinet within ±5 of KNIGHT on act 2 clear (commit) | KNIGHT 48.7: MIDAS −3.0, **THORN −17.6, TESLA +17.8, JOKER −10.0** | ✗ (spread 31–67; I6 was 20–64) |
| Mirror win 55–65% | commit **70.8**, greedy 59.4, random 70.2 | ~ (commit high) |
| REFLECTION fires in ≥75% of Mirror fights | **64–68%** (MIDAS 51%, TESLA 62%, THORN 88%) | ✗ |
| Act 2 lethality rises B1→B5 | commit 4.4 / 6.2 / 11.1 / 7.3 / 11.8; greedy 3.2 / 6.2 / 8.5 / 4.8 / 8.9 | ✓ (B4 dip) |
| No legendary best in >35% of offers | commit: Hourglass **38.1%**; greedy: Hourglass 31.5% | ~ |
| Every legendary +6 to +11 | commit **+6.4 to +11.4** ✓; greedy +8.0 to **+16.0** | ~ |
| Act 2 elite − safe within ±3 | **+10.5** (`it7_skill`), +11.3 (`it7_elitefix`) | ✗ |

### Official sim (`npm run sim -- --runs 2000`, matches the I7 log)

- **Policies:** greedy 19.5% / relic 17.3% / random 12.8%. Act 1 clear: 46.5 / 41.8 / 30.3.
- **Mirror win:** greedy 63%, **random 71%**.
- **Deaths by fight (greedy):** A1 2, A2 9, A3 12, A4 6, A5 10, HOUSE 15, B1 2, B2 3, B3 4, B4 2, B5 4, MIRROR 12.
- **Act 2 clear given act 2 reached:** greedy **41.9%**, random **42.2%**. The official sim already shows zero act 2 skill gap.

### Full runs by cabinet (`it7_arc`, 1000 runs each)

| Policy | | KNIGHT | MIDAS | THORN | TESLA | JOKER | ALL |
|---|---|---|---|---|---|---|---|
| greedy | run win | 20.1 | 21.9 | 15.9 | 20.9 | 18.9 | 19.5 |
| | act 2 clear | 45.1 | 46.1 | 34.4 | 46.7 | 41.9 | 42.8 |
| commit (tier-aware) | run win | 23.8 | 22.8 | 16.5 | **34.1** | 18.5 | 23.1 |
| | act 2 clear | 48.7 | 45.7 | **31.1** | **66.5** | 38.7 | 46.1 |
| | Mirror win | 74.8 | 56.6 | 73.7 | **84.4** | 64.7 | 70.8 |
| | Mirror HP | 189 | **326** | 97 | 106 | 211 | 193 |
| notier (commit, never tier II) | act 2 clear | 49.4 | 51.8 | 36.3 | 63.7 | 43.3 | **49.0** |
| random | act 2 clear | 46.2 | 49.8 | 36.2 | 59.4 | 42.6 | **46.6** |
| | act 1 clear | 35.5 | 28.9 | 34.8 | 32.3 | 33.3 | 33.0 |

- **Act 1 is still balanced and skill-rich:** 45–53% clear under greedy/commit vs 29–36% random.
- **Act 2 flattens it.** Random act 2 clear equals commit. Part of that is survivorship (random runs that reach act 2 had good draws), which is why the next table uses snapshots.

### Act 2 skill on identical B1 snapshots (`it7_skill`, about 400 snapshots per cabinet)

| Act 2 policy | Act 2 clear | Reach Mirror | Mirror win |
|---|---|---|---|
| commit (tier-aware) | 43.5 | 64.7 | 67.7 |
| greedy (sim) | 41.2 | 67.7 | 61.2 |
| tierfirst | 42.1 | 63.6 | 66.9 |
| **notier** | **50.2** | 67.4 | 74.8 |
| random drafts (commit shop) | 40.3 | 63.9 | 63.3 |
| random everything | 41.3 | 60.3 | 68.1 |
| never shop | 33.5 | 54.9 | 60.9 |
| **elite2** (take every act 2 elite) | **54.0** | 64.6 | **84.1** |
| safe2 | 43.5 | 64.9 | 67.4 |
| *(it7_chase)* HP-first drafts | +3.5 vs commit | | |

- **Where act 2 skill lives:**
  - Draft choices: about 3 pts (commit vs random).
  - Shopping: 10 pts.
  - **Skipping tier IIs: +6.7.**
  - **Taking elites: +10.5.**
- Two of the three biggest levers are counter-intuitive ("don't upgrade", "always fight the elite"). A healthy act 2 needs commit to be the best simple policy, not the worst of the build-aware ones.

### The act 2 arc (per node, commit, all cabinets)

| Node | Death | HP lost | Stomp (<10%) | Scary (>50%) | Turns | Enemy HP |
|---|---|---|---|---|---|---|
| act 1 regular | 8.6% | 32% | 22% | 23% | 16.4 | 32 |
| HOUSE | 20.6% | 43% | 20% | 43% | 13.4 | 82 |
| B1 | 4.4% | 34% | 26% | 25% | 10.1 | 51 |
| B2 | 6.2% | 29% | 34% | 23% | 10.9 | 60 |
| B3 | 11.1% | 25% | 36% | 19% | 12.7 | 84 |
| B4 | 7.3% | 26% | 40% | 20% | 12.3 | 93 |
| B5 | 11.8% | 24% | 41% | 18% | 9.6 | 96 |
| **MIRROR** | 29.2% | 52% | 27% | 60% | 8.6 | 193 |

- **Lethality now climbs.** It was 6.3 → 4.0 in I6.
- **Stomps still rise through the act** (26% → 41%). Builds outgrow the curve for most runs, and the curve bites the weak ones (THORN, below).
- 66% of act 2 runs still meet at least one scary regular fight.

**Act 2 by cabinet × enemy (commit, death % / turns, `it7_cabarch`):**

| | bomber | hexer | vampire | mimic | frost | thief | golem | gremlin | dmg/spin |
|---|---|---|---|---|---|---|---|---|---|
| KNIGHT | 8 / 11 | 5 / 13 | 12 / 12 | 7 / 10 | 9 / 14 | 3 / 11 | 8 / 16 | 15 / 16 | 16.5 |
| MIDAS | 3 / 7 | 3 / 9 | 5 / 8 | 6 / 7 | 6 / 10 | 4 / 9 | 1 / 11 | 7 / 10 | 26.0 |
| **THORN** | **20** / 12 | 11 / 15 | **23** / 11 | 8 / 11 | **20** / 14 | 6 / 14 | 9 / 23 | 16 / 18 | **11.5** |
| TESLA | 2 / 9 | 3 / 10 | 9 / 9 | 7 / 9 | 7 / 12 | 3 / 11 | 2 / 14 | 3 / 12 | 18.0 |
| JOKER | 8 / 9 | 6 / 10 | 15 / 10 | 9 / 9 | 12 / 12 | 7 / 10 | 8 / 14 | 12 / 13 | 19.4 |

**THORN's act 2 killers are the enemies whose damage doesn't come through a sword hit:** bombs, drain, and frost's long fights. Spikes only answer hits.

**Enemy notes (`it7_mech`):**
- **Hexer** is now the easiest act 2 enemy: 1.2 hexes per fight, 38% of spins hexed, death 5.2% vs 9.3% for other act 2 fights (KNIGHT). It's fair and readable; it could take +10% HP.
- **Bomber** is unchanged in numbers: defused 13%, bombs are the killing blow in 53% of Bomber deaths.
- **Vampire:** drains 7 HP per fight.
- **Mimic:** net +8 chips per win.
- **The opener mix is fixed:** Hexer + Bomber are 37% of act 2 fights (was 48%).

## 2. The Mirror: is it a satisfying climax?

`it7_mirrordeep` (commit, 1,292 Mirror fights) and `it7_mirrorsrc`:

| | KNIGHT | MIDAS | THORN | TESLA | JOKER |
|---|---|---|---|---|---|
| Win | 68% | **53%** | 77% | **83%** | 68% |
| Mirror HP | 187 | **330** | 95 | 108 | 215 |
| Your machinePower → realized dmg/spin | 44 → 38 | 92 → 82 | 13 → 19 | **18 → 33** | 54 → 58 |
| REFLECTION fired 0× / 1× / 2+ | 23 / 44 / 33 | **53** / 41 / 5 | 12 / 55 / 34 | 40 / 50 / 10 | 35 / 51 / 14 |
| Mirror sword dmg / reflect dmg per fight | 8.6 / 16.0 | 12.5 / 6.0 | 5.6 / 16.8 | 4.8 / 11.5 | 7.6 / 11.8 |
| Win with 0 / 3 tier IIs owned | 77 / 62 | 77 / **46** | 64 / 83 | 73 / 82 | 84 / 65 |

**What works:**
- **The fight has a shape.**
  - Your first hits charge the panel, the Mirror cracks (84%), and the second REFLECTION comes faster.
  - Deaths before any reflection fell from 65% to 19%.
  - Fight length is 1–2 turns 5%, 3–4 10%, 5–6 16%, 7–8 21%, 9–12 30%, 13+ 19%.
- **The telegraph is honest.** "AT LEAST N" is computed from presented damage (E1 fixed) and never overstated. The persistent crack overlay reads instantly (`i7p-mirror-t6.png`).
- **THORN's SPIKED FULL SET vs REFLECTION** is a great interaction. Your own hit comes back and your spikes throw it back again.

**What doesn't:**
1. **The number is almost always 20.**
   - 66% of reflections hit the cap. Mean 17.8, minimum 3 only 2.8% of the time.
   - Once any build does a 20+ spin, the panel reads "AT LEAST 20" for the rest of the fight. "Your best hit" stops being about *your* hit.
   - Against 22–36 max HP, two reflections kill almost anyone. That's why **max HP is the dominant resource in act 2**: +8 max HP = +15.8 pts, twice any gild SET except VAMP/CHARGED.
2. **The HP formula taxes the build you were told to make.**
   - Mirror HP grows 3× with expected damage, and expected damage is dominated by rare multiplicative jackpots (MIDAS: 92 expected vs about 30 median). Glass-cannon builds face 300+ HP mirrors they can't burst.
   - Specials builds are *under*-taxed: Rod, Battery and Overcharge aren't in `machinePower`, so TESLA's Mirror is 108 HP against 33 real damage per spin.
   - Upgrades feel pointless at the fight they're supposed to prepare you for: more tier IIs means a lower MIDAS/JOKER/KNIGHT Mirror win.
3. **The player can't see the tax.** The preview says "AS TOUGH AS YOUR BUILD HITS", but no draft card says "the Mirror gets +9 HP".
4. **F1 (below): after CRACKED the enemy HUD countdown is wrong.** "REFLECTION IN 2" sits next to the panel's "REFLECTS NEXT!" in the same frame. That's the one lie in the boss's telegraph, at the climax.

**Tested fixes** (`it7_pkgO`, act 2 from identical snapshots; act 2 clear / Mirror win):

| Variant | commit | notier | HP-first | random draft | elite2 | commit by cabinet (K/M/Th/Te/J) |
|---|---|---|---|---|---|---|
| now: 3P+55, cap 20 | 42.9/67 | 49.4/74 | **46.4**/71 | 40.2/64 | 54.4/83 | 40/46/30/62/37 |
| typical 4c+55, cap 20 | 43.6/67 | 48.0/72 | 45.4/68 | 38.8/61 | 55.0/84 | 40/**60**/27/52/39 |
| **now, cap 60% max HP** | 45.3/71 | 52.2/78 | 45.7/70 | 42.1/66 | 57.3/87 | 40/52/30/65/40 |
| typical 4c+45, cap 60% | 48.7/75 | 53.9/80 | 46.7/71 | 43.0/68 | 58.6/89 | 44/**65**/30/59/45 |

- **REFLECTION capped at 60% of your max HP** (13 for MIDAS's 22 HP, 19 for KNIGHT, 22 at 36 HP):
  - Ends HP-first's edge (commit ≥ HP-first).
  - Doubles the commit-vs-random gap (2.7 → 3.2 with the old formula; 5.7 with the typical formula).
  - Makes the number vary by run.
  - Keeps "two reflections from full HP kill you" as the readable rule.
- **The "typical spin" formula** (per-spin damage capped at 20, Rod-aware) removes the GOLD tax (GOLD SET gift +5.7 → +18.7). **But it brings MIDAS back to 60–65.** The tax is currently the only thing holding MIDAS. Don't ship it alone; see §5.

## 3. Gild tiers, legendaries, THORN

### Gift values at B1 (`it7_gild`, `it7_gildcap`; Δ act 2 clear, average of 5 cabinets)

| Gift | Real Mirror (taxed) | Mirror untaxed (typical formula) |
|---|---|---|
| **+8 max HP** | **+15.8** | +16.9 |
| TIER II on 1 build gild | **+1.8** | +2.7 |
| TIER II on all gilds | +9.2 | +10.2 |
| GOLD SET | **+5.7** | **+18.7** |
| KEEN SET | **+0.7** | −1.6 |
| CHARGED SET | +17.4 | +15.4 |
| SPIKED SET | +4.9 | +6.7 |
| SPIKED SET + II | +10.6 | |
| **VAMP SET** | **+24.7** | +25.1 |
| LUCKY SET | +5.3 | +6.0 |
| BLAZE SET | +13.0 | +13.6 |
| GOLD SET + II | +2.6 (**TESLA −21.6**) | |

- **Tier II decisions:**
  - A **single tier II** (the unit you actually get: 40% of act 2 gild cards, and a 12-chip shelf item) is worth a sixth of a +4 HP card. It's a trap at any price.
  - Cards are *meaningful* only in the bad sense. The right play is to skip them.
- **Tested rework: "TIER II applies to that gild on every reel"** (`it7_pkgO2`). Commit gains +2.0 to +3.2 and notier's lead shrinks from +5.2 to +2.8. That helps but isn't enough on its own. Tier II needs to beat a max-HP card, which the reflection cap (above) also addresses.
- **Dominants and traps among act 2 gilds:**
  - **VAMP SET is the strongest thing in the game (+25).** Healing isn't taxed by the Mirror and it answers REFLECTION directly. It's latent: act 2 gilds are offered so rarely that chasing VAMP completes the set in only **5%** of runs (`it7_chase`), so no policy exploits it today. If act 2 gild offers become more common, VAMP becomes the new GOLD.
  - **KEEN is dead in act 2** (set +0.7).
  - **Chasing any act 2 gild changes act 2 clear by −3 to +1.** The new gilds don't show up enough to be a decision.
- **THORN's scaling.**
  - A SPIKED SET went from +3.9 (I6) to +4.9, and a SET + II is +10.6. The "hits back for your shield" rule works *at the Mirror* (THORN wins 74–77% there, the best of any cabinet).
  - **It isn't enough for B-fights.** THORN's 11.5 damage per spin vs 73–97 HP enemies means 14–23 turn fights against bombs, drain and frost, which spikes don't answer.
  - A free tier II on all THORN gilds at the transition is +9.5 for THORN (`it7_gild`, "tierII all gilds": 30.3 → 39.8).

### Legendaries (`it7_legend`, act 2 clear Δ vs none)

| | Ticket | Bell | Phoenix | Overcharge | Key | Hourglass |
|---|---|---|---|---|---|---|
| commit Δ | +9.6 | +6.4 | +8.8 | +10.4 | +7.8 | **+11.4** |
| greedy Δ | +15.0 | +8.0 | +14.8 | +14.2 | +11.4 | **+16.0** |
| best of 3-offer (commit / greedy) | 24 / 31% | 3 / 0% | 14 / 22% | 19 / 14% | 2 / 2% | **38 / 32%** |

- **The retune worked on the numbers.** Ticket went from worst to second, and Overcharge is no longer the default.
- **The pattern is the tax again.** The Mirror counters (Hourglass: REFLECTION every 5, cracked 4; Phoenix) and untaxed Overcharge are best. Bell and Key raise `machinePower` and are worst.
- **The choice got flatter under commit:** mean best-to-worst spread 4.2 pts, and ≥5 pts in only 25% of offers (I6: 7.0 / 72%). Greedy is still 6.8 / 74%.

## 4. Bugs (with repro)

| # | Bug | Repro |
|---|---|---|
| **F1** | **The enemy HUD countdown is stale after CRACKED.** `fight.ts` replaces `c.ability` with a new object (`every − 1`), but the HUD keeps the old one (`hud.ability` set once at fight creation; `director.shatter` doesn't update it). The HUD says "REFLECTION IN 2" (5 pips) while the panel says "REFLECTS NEXT!" (it reads the engine's new `every`, a slight spoiler before the CRACKED banner). | THORN run seed 777 (with Hourglass) at the Mirror, turn 6: `i7p-mirror-t6.png`. Any Mirror fight after the crack. |
| **F2** | **The Mirror preview's ability line contradicts the rule.** It says "HITS YOU WITH YOUR LAST SPIN'S DAMAGE" (`runScreens.ts:102`). It says "EVERY 3 TURNS" and the footnote says "CRACKED: EVERY 2" even with the Golden Hourglass (the real cadence was 5, then 4). The footnote's last line sits on the box border. | `i7p-mirror-preview.png` |
| **F3** | **The Hexer preview is wrong:** "HEXES 1 REELS FOR 2 TURNS". CURSE now hexes for 3 (`fight.ts` curse → `hex(..., 3)`), and "1 REELS" should be singular. | `i7p-b1-preview.png` |
| **F4** | **Gild card text ignores levels.** `TIER_TEXT` and `ENH_TEXT` are static: SPIKED II says "HIT BACK FOR 4" when a Ticket set + tier makes it 8 (or your shield); GOLD II says "PAY X3" when a set makes it X4; CHARGED BOLTS says "+1 ENERGY" on a card that completes a Ticket set (+3). SPIKED cards have no stat line at all. | `i7p-tier-draft.png`, `i7p-shop-b5.png` (CHARGED BOLTS: "+1 ENERGY" but "ENERGY 2.48 TO 4.52") |
| **F5** | **Banner maths overflows on multi-stamp hits.** "4 X3 X3 36 DAMAGE" is wider than the DOUBLE! banner and prints over both HUDs. | Set 3 gold swords in `game.cfg.player.gilded`, `dbg.vs('hexer',['sword','sword','shield'])`, spin, `dbg.until('attack')`: `i7p-goldset-pair.png` |
| **F6** | **The in-fight bomb callout still says "BOMB! LAND TO DEFUSE"** (E11 only reworded the preview blurb), and it overlaps "BLOCKED!". The bomb art is still a corner sprite. | `dbg.vs('bomber', …, ['bomb','bomb','bomb'])`: `i7p-bombs.png` |
| **F7** | **The 12-fight recap drops shop buys.** Compact mode prints only `pick`, or only the spoils on elite rows (hiding that fight's draft pick). The act 2 Cashier's legendaries and tier IIs never appear. YOUR REELS shows no tier II. | `i7p-over-win.png` (Hourglass/Key/Overcharge bought, not listed). `runScreens.ts:843`. |
| F8 | **`machinePower` ignores Rod (cost 4 / dmg 12), Battery and Overcharge**, and prices GOLD at its mean (rare jackpots). This undersizes TESLA's Mirror and oversizes MIDAS's. | `it7_mirrorsrc`: TESLA power 17.8 vs realized 32.6 per spin; MIDAS Mirror 330 HP. |
| F9 | **Name collision:** the elite-only relic "MIRROR" (any-two pairs) vs the boss THE MIRROR. The elite path picks it up 0.56 times per act 2. | Relic tooltip, spoils screen |
| F10 | After the Mirror dies, the REFLECTION panel and HUD still pulse "REFLECTS NEXT! AT LEAST 3" under VICTORY. | `i7p-mirror-t8.png` |
| F11 | The panel's footer "YOUR BEST HIT SINCE" is a dangling sentence. | `i7p-mirror-t6.png` |
| F12 | The act 2 Cashier header doesn't mention TIER II upgrades; the II badge is the only hint. | `i7p-shop-b1.png` |
| F13 | *(Unconfirmed)* The COMPLETES SET ribbon on a shop card rendered as illegible glyphs in a 1:1 snap, while LEGENDARY at the same scale is fine. Check with a Ticket set completion in the shop. | `i7p-shop-b5.png`, leftmost card |
| F14 | **Chips have no sink at the Mirror:** 26–28 unspent on average (`it7_elite2`). Carried over from I6. | |

**Verified fixed:**
- E1: the panel reads presented damage and never overstates.
- E2: stamps skip hexed reels, and a hex breaks the set: 3 gold + 2 hexed reels = 9 damage, one X2 stamp (`i7p-goldset-hexed.png`).
- E3: bombs are off the payline, with fuse ticks on the strip map.
- E4, E5, E8 (4-wide relic grid), E9, E13.
- E14: ACT 1 / ACT 2 plaques.

## 5. Prioritised changes (★ = top 5)

1. ★ **Cap REFLECTION at 60% of your max HP** (from a flat 20).
   - Tested: HP-first loses its edge, and commit − random act 2 grows from 2.7 to 5.7 (with 2 below).
   - The number varies per run and the rule stays "two reflections from full kill you".
   - Then re-tune the Mirror's flat HP so commit Mirror win lands at 60–65% (it's 71–75% in these variants).
2. ★ **Stop taxing *building* at the Mirror.**
   - Size HP on a **typical spin**: per-spin damage capped at 20, and count Rod, Battery and Overcharge (fixes F8). `it7_power.ts:cappedPower` is a reference implementation.
   - **Pair it with a MIDAS lever**, because the tax is what holds MIDAS today (typical formula: MIDAS 60–65). The ITERATION_6-tested "GOLD pays once per group" would do it, or GOLD's tier/set step ×1 instead of compounding per cell.
   - Target: no gift in the table above negative for any cabinet, and GOLD SET within ±5 of CHARGED SET.
3. ★ **Act 2 elites ×1.5 HP** (from ×1.25). Tested: elite − safe **+11.3 → +2.1**. Show both HPs on the fork.
4. ★ **TIER II upgrades the gild on every reel that carries it**, price 10 in the shop.
   - Tested: +2 to +3 for commit. It needs 1 to finish closing the notier gap.
   - Fix F4 so the card shows the real result ("SPIKED II: HIT BACK 6 → 8").
   - Target: notier ≤ commit, and tierfirst within 2 of commit.
5. ★ **Readability batch:**
   - F1: sync `hud.ability` on `shatter`.
   - F2, F3: generate ability text from the live `every` and power; mention the Hourglass.
   - F5: wrap or shrink the banner maths.
   - F6: fix the callout wording.
   - F7: add buys to the compact recap.
   - F9: rename the relic to TWIN or ECHO.
6. **Cabinet levers** (after 1–4, re-measure first):
   - THORN needs an answer to non-hit damage. Options:
     - SPIKED FULL SET also hits back when a bomb or drain lands.
     - At the act transition, THORN's spiked gilds become tier II (tested +9.5).
   - TESLA is fixed by counting Rod in the Mirror's HP (−5.3; `it7_cabfix`).
   - JOKER (−10): make LUCKY its act 2 favoured gild (untested).
7. **VAMP guard.** A VAMP FULL SET is +25 today but only 5% reachable. Before act 2 gilds become more common, cap VAMP set healing at 2 per spin, or make the Mirror copy VAMP heals.
8. **KEEN act 2 form:** pierce + tier II (+3 per level) is worth nothing in act 2. A KEEN FULL SET could ignore shields entirely, or crit ×2 on jackpots.
9. **Legendary texture:** with the numbers balanced, restore the *decision*. Offer 3 legendaries that each fit a different build (one generic, one for your gild, one Mirror counter) instead of 3 random ones.
10. **Chip sink at the Mirror** (F14): "unspent chips: +1 shield per 8 at the start of each REFLECTION turn" mirrors the House chip shield and reuses its readout.
11. Hexer +10% HP (now the softest act 2 enemy).

## 6. Art needed

| Sprite | Description |
|---|---|
| `bombOverlay` v2 | Still pending: a bomb filling about 60% of the cell, fuse number on the body, red tint at fuse 1 (`i7p-bombs.png` shows the corner sprite) |
| `reflectMeter` | "Best hit" gauge for the REFLECTION panel, filling to the cap (useful once the cap is HP-relative) |
| `mirrorCrack` stage 2 | Second crack stage for the second reflection after CRACKED |
| `enhTier2` ×7 | Tier II cell frames per gild (today a text "II" badge on the cell) |
| `relicEcho` | Re-icon for the renamed "MIRROR" relic (F9) |
| `legendFrame` | Distinct card frame for legendaries (still text-ribbon only) |
| `markerChip`, `houseRule` ×6 | Still pending (HIGH STAKES) |

## 7. Proposal: Package O ("build for the Mirror, not against it")

1. **REFLECTION** = your best hit since its last one, capped at **60% of your max HP** (min 3). Every 3 turns, every 2 cracked. HUD and panel both read the live cadence (F1/F2).
2. **Mirror HP** = k × *typical* spin power (per-spin damage capped at 20, Rod/Battery/Overcharge counted) + flat, tuned to 60–65% commit Mirror win. Pair it with a GOLD-per-group or non-compounding GOLD change to hold MIDAS.
3. **Act 2 elites ×1.5 HP.**
4. **TIER II** upgrades the whole gild (price 10), with card text that shows the real level.
5. **THORN** (spikes answer bombs and drain, or a tier II at the act transition) and **TESLA** (fixed by 2).
6. Readability batch F1–F7, F9–F12.

**I8 sim targets** (all on identical B1 snapshots, `it7_skill` / `it7_pkgO` harness):
- Commit ≥ notier, commit ≥ HP-first, and commit − random draft ≥ 6 pts on act 2 clear.
- Act 2 elite − safe within ±3.
- Every cabinet within ±7 of KNIGHT on act 2 clear under commit.
- Mirror win 60–65% (commit), REFLECTION ≥1× in ≥75%, at the cap in ≤40% of reflections.
- No single B1 gift negative for any cabinet; the GOLD/CHARGED/BLAZE SETs within ±5 of each other.
- Keep act 1 as is (45–53% clear, 16-pt skill gap).
