# Iteration 9 Playtest: Package P (Every Build Meets Its Match)

**Method.**
- **Headless.** `scratch/it9_lib.ts` extends `it8_lib`. It adds counter-enemy instrumentation (rods, grounded specials, fakes, faked payline spins, launder) and two build-aware fork policies: `dodge` never walks into the counter to your build, and `face` always takes it. As before, most comparisons replay act 2 from **identical B1 snapshots**: commit play through act 1, the legendary and the intro Cashier, with 480–839 snapshots per cabinet. Paired standard errors are printed now. Scripts and outputs (`.txt`) are in `playtest/scratch/`:
  - `it9_skill`: 12 act 2 policies × 5 cabinets on B1 snapshots, with paired differences.
  - `it9_counter`: a controlled single B3 fight against **every** act 2 archetype, from the same snapshots.
  - `it9_counterfix` (+`it9_counterfix2.txt`): GROUNDER and COUNTERFEITER candidates, monkeypatched into the same controlled fight.
  - `it9_pkgQ` (+`it9_pkgQ2.txt`): Package Q candidates on B1 snapshots.
  - `it9_arc` (a re-run of `it8_arc`, full runs), `it9_gild` (B1 gifts), `it9_opener` (opener deaths), `it9_officialsim.txt`.
- **Live (:4173, fresh playtest build; built after the last src change).**
  - One full 12-fight **TESLA** run (seed 9101). Act 1 was walked with forced wins and my own picks. **Act 2 and the Mirror were played for real** on auto at 3x.
  - Sandboxes: a COUNTERFEITER against a GOLD machine, and the Mirror crack gate.
  - Snaps are `snaps/i9p-*.png`.
- **The I9 numbers in STATE.md don't reproduce on the final build.** STATE reports spread 10.8 and elite2 − safe2 = −1.5. `it8_skill` re-run unchanged on this build (`it9_skill_rerun.txt`, seed 31337) gives spread **17.7** and elite2 − safe2 **−4.2**. `it9_skill` (seed 777, twice the snapshots) gives 17.2 and −5.8. My guess is that the harness ran before the last two changes landed: +4 Mirror HP per relic, and act 2 elites paying chips instead of a relic.

## Verdict

**Package P fixed what it set out to fix: G1 is gone, KEEN isn't a trap, the crack gate works, and act 2 still has a real skill gap. But the two new counter-enemies don't counter anything. They are the two softest fights in act 2. TESLA is still +17 over JOKER, and act 2 elites swung from a free lunch to a trap. All of it is fixable with tested numbers (Package Q below).**

1. **Skill still pays in act 2.** On B1 snapshots, commit **54.0**, random draft **45.3**, random everything 35.0. Commit − random = **+8.7 ± 1.0** ✓ and commit − HP-first = +5.4 ✓. Tier II is neutral on average (commit − notier −0.2 ± 0.8). But it's still a trap on **MIDAS (−6.7)**, because the Mirror copies your TIER II GOLD at full strength.
2. **GROUNDER and COUNTERFEITER are pushovers, and neither answers its build.** In a controlled B3 fight from identical snapshots, the other nine act 2 regulars take **40.8%** of your HP and kill you 7.9% of the time. The GROUNDER takes **20%** (0.4% deaths); the COUNTERFEITER 26% (1.6%).
   - Against **TESLA**, the build it's meant to answer, the GROUNDER is the *easiest fight in the game*: 18.5% HP, 0.8% deaths.
   - Why the GROUNDER doesn't bite: a rod only matters when a grounded bolt is on your payline *and* a special fires, *and* then it only lets the GROUNDER's small shield soak the special. That's **1.1 damage blocked per fight** on TESLA. Tripling the rods changes nothing (18.4%).
   - Why the COUNTERFEITER doesn't bite: fakes land on off-payline visible cells and last 2 turns. Only **0.4–0.6 of your spins per fight** land a faked cell on the payline.
   - Result: facing the counter to your build is **better** than dodging it (dodge − face = **−2.7 ± 0.5**). The fork is build-aware in the wrong direction.
3. **TESLA is still the outlier.** Act 2 clear: TESLA **64.6** vs JOKER 47.4 / MIDAS 48.0 (spread **17.2**; target ≤ 14).
   - Live, my TESLA lost **1 HP across B2–B5**. It killed a 128 HP ELITE BOMBER in 2 spins and a 73 HP GROUNDER in 5 spins without being touched. The GROUNDER blocked 2 damage all fight.
4. **The Mirror is close.** Commit win **66.2%**, REFLECTION ≥1 in 86%. The crack gate works: live, my first spin took the 353 HP Mirror to exactly 176, then it reflected 20 at me (33 → 15 HP), then I finished it. That's a good, tense 3-beat fight.
   - But MIDAS/JOKER still win without a reflection **26% / 20%** of the time. The gate stops the kill on the crack turn, but it doesn't make the Mirror answer before your next spin.
5. **Act 2 elites went from +11 (I7) to a trap: elite2 − safe2 = −5.8 ± 0.8**, negative on every cabinet. At x1.5 HP they cost 13% deaths per fork fight (vs 3.6%) for +6 chips.
6. **Act 1 is intact except MIDAS:** 55.5% commit (target 45–53). Opener deaths 0.8–2.4% ✓. No B1 gift is meaningfully negative ✓, and **KEEN SET went −6.6 → +9.7**: the KEEN fix worked.

**Package Q (tested together on B1 snapshots, `it9_pkgQ2.txt` Q2_45):** the Mirror copies your gilds at **plain tier**; act 2 elites at **x1.3 HP** (chips unchanged); **the crack snaps back** (REFLECTION fires on the Mirror's next turn after it cracks); a **GROUNDER that earths your bolts**; a **COUNTERFEITER that fakes a whole gild type**. Results:
- commit 51.4, spread **10.3** ✓, commit − notier **+3.3** ✓, commit − random **+8.3** ✓, elite − safe **+1.9** ✓.
- Mirror **65.1%** ✓, REFLECTION ≥1 in **98%** ✓, wins without a reflection **0%** ✓.
- The one miss is THORN, where HP-first beats commit (§3).

## 1. Numbers vs the I9 targets

| Target | Result (B1 snapshots, `it9_skill`, 737–839 per cabinet) | |
|---|---|---|
| commit ≥ notier | 54.0 vs 54.0 (paired −0.2 ± 0.8). KNIGHT +2.9, TESLA +7.5, but **MIDAS −6.7, THORN −3.0** | ~ (tie; still a trap on MIDAS) |
| commit − HP-first ≥ 3 **per cabinet** | avg +5.4; KNIGHT +8.3, MIDAS +7.9, TESLA +15.9, JOKER +7.2, **THORN −12.1** | ✗ THORN |
| commit − random ≥ 6 | **+8.7 ± 1.0** (THORN +2.4) | ✓ |
| elite − safe within ±3 | **−5.8 ± 0.8** (KNIGHT −6.7, MIDAS −3.1, THORN −9.8, TESLA −1.6, JOKER −8.0) | ✗ |
| act 2 cabinet spread ≤ 14 | **17.2** (KNIGHT 55.5 / MIDAS 48.0 / THORN 54.5 / TESLA 64.6 / JOKER 47.4) | ✗ |
| Mirror 60–65% under commit | **66.2%** (KNIGHT 67.6, MIDAS 55.0, THORN 69.0, TESLA 76.8, JOKER 64.3) | ~ (1 over; 22-pt cabinet spread) |
| REFLECTION ≥1× in ≥75% per cabinet | 86.2% overall; KNIGHT 89.4, **MIDAS 73.3**, THORN 94.6, TESLA 93.7, JOKER 81.6 | ✗ MIDAS |
| Mirror wins without a reflection ≤ 10% | **13.8%**: KNIGHT 12.7, **MIDAS 26.3**, THORN 5.8, TESLA 6.7, **JOKER 20.3** | ✗ |
| no B1 gift negative (`it9_gild`) | worst is GOLD SET on TESLA −2.4 (n≈300, inside noise). KEEN SET **+9.7** (was −6.6). CHARGED/BLAZE on TESLA +0.3 / +0.7 (no value, not negative) | ✓ |
| act 1 cabinets 45–53% (`it9_arc`, commit) | KNIGHT 49.8, **MIDAS 55.5**, THORN 52.5, TESLA 47.4, JOKER 47.8 (greedy MIDAS 54.1) | ✗ MIDAS |
| opener deaths ≤ 2.5% (`it9_opener`) | 0.8–2.4% (TESLA vs frost 2.4, JOKER vs frost 2.3) | ✓ (just) |
| counter-enemies answer their build | GROUNDER vs TESLA: 18.5% HP / 0.8% deaths (other regulars: 39.2% / 9.9%) | ✗ |

### Official sim (`npm run sim -- --runs 2000`)
- greedy 18.9% / relic 14.8% / random 13.3%. Act 1 clear 45.0 (MIDAS 53.2). House 73%. Mirror 48% (greedy doesn't commit).
- Kill rates: **grounder 0% of 460 fights, counterfeiter 1% of 525** (hexer 2%, vampire 5%, bomber 3%).
- Tests: 115/115 green.

### Policies on B1 snapshots (act 2 clear; Mirror win in parentheses)

| policy | act 2 clear | reach Mirror | Mirror win |
|---|---|---|---|
| commit | **54.0** | 81.2 | 66.5 |
| notier | 54.0 | 77.7 | 69.6 |
| tierfirst | 53.5 | 81.1 | 66.1 |
| hpfirst | 48.6 | 82.4 | 59.0 |
| randomDraft | 45.3 | 78.9 | 57.6 |
| greedy (sim) | 44.2 | 82.5 | 53.5 |
| randomAll | 35.0 | 66.7 | 52.6 |
| noShop | 51.7 | 73.0 | 71.1 |
| elite2 | 47.9 | **62.5** | 77.0 |
| safe2 | 53.7 | 82.5 | 65.3 |
| dodge (avoid your counter) | 51.8 | 76.8 | 67.6 |
| face (take your counter) | **54.5** | 82.2 | 66.4 |

### The act 2 arc (`it9_arc`, commit, full runs, 1000 per cabinet)
- Lethality per attempt B1..B5: 2.6 / 3.4 / 5.8 / 2.6 / 4.4 %, then the Mirror at 34.7%.
- **Act 2 regular fights are soft.** They take **22%** of your HP (act 1: 32%) and 41.5% are stomps (act 1: 22%). Only 50% of act 2 runs have a single scary regular fight.
- The softest, by HP lost, are **grounder 12%**, golem 16%, **counterfeiter 16%** and thief 19%. The hardest are mimic 32% and vampire 30%.
- Commit full-run win rate: 27.3% (KNIGHT 27.3, MIDAS 26.4, THORN 30.5, TESLA 29.5, JOKER 22.6).

## 2. Whole-run feel (browser)

- **Cabinet cards.** The act 2 lines are legible (`i9p-cabinets.png`): KNIGHT "+6 MAX HP", THORN "SPIKES GO TIER II, +4 MAX HP", JOKER "2 SHIELDS ON REEL 3 BECOME WILDS". **MIDAS and TESLA have no act 2 line**, so they read as "no act 2 perk". That's honest, since they're the strongest, but it looks unfinished. The flavour subtitles under the names are ~5 px and unreadable.
- **The act transition** (`i9p-act2-legend-tesla.png`) is clean: "ACT 2 BEGINS – FULLY HEALED – CHOOSE A LEGENDARY", with the act 2 map already visible. **The cabinet signature is never announced here** (see H3). A KNIGHT just silently has 6 more max HP.
- **New enemies on the map.** The Grounder (orange-bearded miner with a rod) and the Counterfeiter (green-coated forger) read instantly as new faces, and the art fits the set. **The GROUNDER's blurb is 3 lines and overprints its HP line** (H1).
- **GROUNDER live.** The rods on your bolt cells are an orange stake over the bolt art (`i9p-grounder-rods.png`). They're visible but blend with GOLD/CHARGED frames, and nothing tells you when a grounded special actually lost damage.
  - The whole fight felt like a normal enemy with a funny hat: I took 0 damage, and grounding cost 2 damage total. The Overcharge echo shows no grounded state.
- **COUNTERFEITER sandbox** (`i9p-counterfeiter-fakes.png`). Faked cells grey out with a coin badge, and the "FAKED: GILDS PAY PLAIN 2 TURNS" callout over your reels is good.
  - But all 3 fakes landed off the payline, and by the next spin they had scrolled away. The callout promises something that almost never happens.
- **The Mirror with the crack gate.** The card said HP **353** (8 relics, TESLA's energy engine counted in). My first spin stopped dead at 176, then "REFLECTS NEXT! AT LEAST 20", a 20-point reflection took me to 15/33, then my second spin killed it.
  - That is the right shape: it's the first time the Mirror has felt like a *duel* for a burst build.
  - But it was **pure luck of timing** that the reflection landed between my spins. Across the sim, 26% of MIDAS wins never see one.
- **Pacing.** TESLA act 2 was a victory lap: B1 bomber in 3 spins (−11 HP), then B2–B5 cost me 1 HP in total. Every draft was "+energy". The Cashier's "KEEP CHIPS FOR THE MIRROR: +6 SHIELD" is wrong at the Mirror (capped at 4, H2).
- **G1 is gone.** At a Cashier showing GOLD II, the gild stayed `gold` tier 1 after display and hover. Buying it made it tier 2 (10 chips). A GOLD SHIELDS card offered afterwards already said "PAY X4" (G2 ✓).

## 3. Weak spots

### The counter-enemies (`it9_counter`, `it9_counterfix`)
One B3 regular fight (73 HP) from identical B1 snapshots: HP lost / death %.

| | knight | midas | thorn | tesla | joker |
|---|---|---|---|---|---|
| other act 2 regulars (avg) | 40.6 / 5.7 | 38.4 / 9.3 | 42.1 / 3.8 | 39.2 / 9.9 | 43.9 / 10.9 |
| GROUNDER (now) | 19.5 / 0.0 | 18.8 / 1.1 | 23.5 / 0.0 | **18.5 / 0.8** | 21.3 / 0.0 |
| COUNTERFEITER (now) | 23.8 / 0.4 | **25.8 / 3.3** | 31.5 / 1.2 | 21.8 / 0.8 | 27.4 / 2.0 |
| GROUNDER: earth + 1 rod + sword 5 | 41.3 / 13.7 | 31.8 / 6.7 | 34.5 / 0.8 | **47.8 / 22.4** | 36.7 / 8.2 |
| COUNTERFEITER: type-wide fake + sword 6 + HP x1.1 | 36.6 / 3.1 | **38.0 / 7.0** | 40.2 / 5.1 | 36.0 / 3.3 | 40.3 / 6.6 |

- **GROUNDER fix: "the rod earths the charge."** A grounded bolt on your payline gives **no energy** (on top of "your special hits shields"). Also one more rod per plant (2/3/4) and sword 4 → 5.
  - It now hits TESLA hardest (48% HP) and MIDAS/THORN least: a true counter.
  - Earthing with ×3 rods is far too strong (TESLA 69% / 49% deaths); earthing with the current counts is too weak (TESLA 30%). +1 rod is the sweet spot.
- **COUNTERFEITER fix: "counterfeits a gild type."** When it fakes a cell, **every cell of that gild** pays plain for 2 turns. Also sword 5 → 6 and HP x0.95 → x1.1.
  - It becomes an average fight (38%) that's worst for gild builds. It's a mild counter; MIDAS's real problem is the Mirror.
  - The "×3 fakes, 3 turns" variant barely moved anything (27.8%). The problem is the payline odds, not the count.
- With both fixes, dodge − face goes **−1.7 → +1.1**. Dodging your counter becomes a real, readable fork decision.

### The Mirror copies your TIER II
- MIDAS commit − notier = **−6.7**. Every GOLD II you buy is handed to the Mirror, which hits back with x4 gold swords. Sword kills at the Mirror: MIDAS 172 vs reflection 158.
- **Tested: the Mirror copies your gilds at plain tier ("a copy is never as good as the original").**
  - MIDAS act 2 +13 (46.7 → 59.9), commit − notier −0.2 → **+3.6**, spread 16.6 → **12.3**.
  - Mirror win rises to 71.7%, which the crack-reflect change pays back (below).

### The crack should snap back
- **Tested: when the Mirror cracks, its REFLECTION fires on its next turn** (charge set to every−1). With the crack gate, every win now sees at least one reflection.
  - Wins without a reflection 13.8 → **0%**; REFLECTION ≥1 in **98%** (MIDAS 94%).
  - Mirror win 71.7 → **65.1%** with the plain-tier copy, at mirrorFlat 45 (flat 35 → 67.7, 55 → 62.1).
- It also makes the live beat I saw (crack → reflection → kill) the guaranteed shape of every Mirror fight instead of a coin flip.

### Act 2 elites (`it9_pkgQ`)
- x1.5 HP for +6 chips is a trap: elite − safe **−5.7**.
- **x1.3 HP gives −0.6** (every cabinet within ±3) and **+1.9** inside the full package.
- x1.3 plus 12 chips overshoots (+6.3). Keep the chips at 6.

### THORN wants HP, not spikes
- HP-first beats commit on THORN by **12.1** (−15.7 in Package Q), and random draft ≈ commit.
- THORN's act 2 build path (more SPIKED) is weaker than just taking max HP. Spikes need to be hit to work, the Mirror doesn't copy them, and REFLECTION goes straight through.
- **Two options:**
  - (a) Accept it: THORN's build *is* HP. Put a FITS badge on +MAX HP cards for THORN and redefine that target.
  - (b) Give spikes an act 2 form that answers the Mirror: **"a SPIKED FULL SET hits back REFLECTIONS too"**. This is untested; sweep it next iteration.
- I'd do (a) now and test (b).

### TESLA
- Package Q brings TESLA from +17 to +10 over the weakest cabinet (57.7 vs 47.4). That's mostly the GROUNDER finally biting (it is ~11% of act 2 regular fights).
- TESLA's Mirror is still 73%, because the special-energy term of `machinePower` isn't per-spin capped (my Mirror was 353 HP, and it still died in 2 spins).
- If TESLA is still top after Q, cap the *energy* part of machinePower per spin as I8 did for swords. Don't nerf the Rod again.

## 4. Bugs (with repro)

| # | Sev | Bug | Repro |
|---|---|---|---|
| H1 | med | **3-line enemy blurbs overprint the HP line** on fork cards: GROUNDER ("…YOUR SPECIAL HITS SHIELDS" over "HP 73") and ELITE BOMBER (over "HP 128" and the elite line). `i9p-fork-grounder-overflow.png` | TESLA seed 9101, reach act 2 fork 3 (thief vs grounder) and fork 4 (hexer vs elite bomber) |
| H2 | med | **Cashier and HUD promise more Mirror shield than you get.** "KEEP CHIPS FOR THE MIRROR: RIGHT NOW +6 SHIELD EACH MIRROR TURN" and the HUD "+6 SH/TURN" at 49 chips, but the Mirror caps it at +4 (`MIRROR_CHIP_SHIELD_CAP`; `cfg.player.stackShield` was 4 in the fight). The Mirror card footnote doesn't mention the cap either. `i9p-cashier-shield-cap-text.png` | Reach the B5 Cashier with ≥40 chips |
| H3 | med | **The cabinet's act 2 signature is applied silently.** The act transition screen never says "KNIGHT: +6 MAX HP" / "THORN: SPIKES GO TIER II" / "JOKER: 2 SHIELDS → WILDS". The text only exists on the cabinet-select card (`runScreens.ts:687`) | Beat the House on KNIGHT/THORN/JOKER and read the legendary screen |
| H4 | low | **JACKPOT BELL shelf text truncated**: "YOUR JACKPOTS PAY X2 AND REFILL YOUR" (the word SPECIAL is cut). Same card at the Cashier. | B5 Cashier with Bell on the shelf (seed 9101) |
| H5 | low | **The Mirror card footnote overflows its panel** ("…YOUR CHIPS SHIELD YOU (1 PER 8)." runs past the bottom border). `i9p-mirror-card-353.png` | Open the Mirror node card on any act 2 run |
| H6 | low | **The Overcharge echo of a grounded special doesn't carry `grounded`**. The echo hits shields too (correct), but the director can't show it as grounded. (`fight.ts` gainEnergy: the echo event omits `grounded`) | TESLA + Overcharge vs GROUNDER, rod on the payline |
| H7 | low | **Counterfeit coins land off the payline and scroll away**, so the "FAKED: GILDS PAY PLAIN 2 TURNS" callout fires but ~0.5 spins per fight are affected. A readability issue as much as balance; fixed by the type-wide rule. | `dbg.vs('counterfeiter', ['shield','shield','bolt'], ['fake','fake','fake'])` with gold swords |
| H8 | low | **Screen changes take clicks at once, so a double-click buys.** After picking the legendary (the card animates ~1 s), a second click at the same spot lands on the first Cashier card and buys it (I lost 10 chips to LUCKY SHIELDS). Suggest a ~250 ms input guard on screen entry. | Pick a legendary, click the same spot again as the Cashier appears |
| H9 | nit | The recap doesn't list act 2 elite spoils ("+6 chips") on the elite row; the chips just appear in the header total. | Recap after beating an act 2 elite |
| H10 | nit | MIDAS/TESLA cabinet cards have no ACT 2 line. Say "ACT 2: —" or give them a flavour perk, so the card grid doesn't look unfinished. | Cabinet select |

G1 re-checked in the browser: **fixed** (viewing and hovering a GOLD II leave gilds unchanged; buying upgrades them; later gold cards come in at tier II).

## 5. Prioritised changes (★ = top 5)

1. ★ **GROUNDER earths your charge.** A grounded bolt on the payline gives no energy; rods 1/2/3 → 2/3/4; strip sword 4 → 5. Text: "RODS IN YOUR BOLTS: A GROUNDED BOLT GIVES NO ENERGY". Target (controlled B3): TESLA 45–50% HP, everyone else ≤ 40%.
2. ★ **COUNTERFEITER fakes a gild type.** Every cell of the faked gild pays plain for 2 turns; sword 5 → 6; HP x1.1. Text: "COUNTERFEITS A GILD: ALL YOUR GOLD PAYS PLAIN FOR 2 TURNS". Callout names the gild.
3. ★ **The Mirror copies your gilds at plain tier** (no TIER II, still no KEEN/spikes). Fixes MIDAS's tier trap (+13) and brings the spread to ~10. Card: "A COPY OF YOUR MACHINE (PLAIN GILDS…)".
4. ★ **The crack snaps back.** The Mirror's REFLECTION fires on its turn right after it cracks. Every Mirror win has a duel beat; wins without a reflection → 0. Keep mirrorFlat 45 (Mirror 65%). Telegraph: at crack, "REFLECTS NEXT!" appears immediately.
5. ★ **Act 2 elites x1.3 HP** (keep +6 chips). elite − safe → +1.9.
6. Fix **H1** (3-line blurbs) and **H2** (Mirror shield cap in Cashier/HUD/card text). Announce the signature at the transition (**H3**): one line under "ACT 2 BEGINS", e.g. "KNIGHT: +6 MAX HP".
7. THORN: show FITS on +MAX HP cards for THORN in act 2 and treat HP as on-build. Then sweep "a SPIKED FULL SET hits back REFLECTIONS" as THORN's real act 2 form.
8. MIDAS act 1 at 55.5: −1 HP (23 → 22) or GOLD offers slightly rarer in act 1. Re-measure act 1 after, keeping the opener ≤ 2.5%.
9. Act 2 regular fights are soft (22% HP lost vs 32% in act 1; 41% stomps). After Q, re-measure. If still soft, `act2Swords` 2 → 3 for B3–B5 only.
10. If TESLA is still > +12 after Q, cap machinePower's energy term per spin (TESLA's Mirror at 353 HP still died in 2 spins).
11. Small text fixes: H4, H5, H8 (input guard), H9, H10.

**Package Q result (tested, B1 snapshots, items 1–5 together; `it9_pkgQ2.txt` Q2_45):**

| metric | now | Q | target |
|---|---|---|---|
| commit act 2 clear | 53.5 | 51.4 | — |
| cabinet spread | 16.6 | **10.3** | ≤ 14 ✓ |
| commit − notier | −0.2 | **+3.3** (MIDAS +4.4) | ≥ 0 ✓ |
| commit − random | +8.3 | +8.3 | ≥ 6 ✓ |
| commit − hpfirst | +5.3 (THORN −11.9) | +5.8 (THORN −15.7) | ✗ THORN (item 7) |
| elite − safe | −5.7 | **+1.9** | ±3 ✓ |
| dodge − face | −1.7 | −0.4 | ≥ 0 (a real choice) |
| Mirror win | 65.5 | **65.1** | 60–65 ✓ |
| REFLECTION ≥1× | 86.0 (MIDAS 72.8) | **98.1** (MIDAS 94.3) | ≥ 75 per cabinet ✓ |
| Mirror wins without a reflection | 14.2 | **0.0** | ≤ 10 ✓ |

## 6. Art needed

- **GROUNDER "EARTHED" read:** when a grounded bolt pays no energy, the bolt cell needs a clear state, e.g. a grey-out plus a small earth/ground glyph (⏚), and a "EARTHED −N" callout. The current orange rod blends with GOLD/CHARGED frames; a darker iron rod with a brighter tip would separate it.
- **COUNTERFEITER type-wide stamp:** a "FAKE" stamp or crossed coin across every cell of the faked gild, plus the gild's icon in the callout ("FAKED: GOLD PAYS PLAIN 2 TURNS").
- **Act transition signature banner:** a small cabinet icon + "ACT 2 SIGNATURE" plaque under the legendary header (KNIGHT heart, THORN spike II, JOKER wild).
- **Mirror crack snap-back:** a one-frame "the crack flashes back at you" effect when the post-crack REFLECTION fires, so it reads as a consequence of the crack.
- Optional: MIDAS/TESLA act 2 line icons if they get perks (H10).

## 7. Next package and the next BIG step

**Package Q ("counters that counter"):** items 1–6 above, plus the text fixes. All tuning numbers are in `it9_pkgQ.ts`/`it9_counterfix.ts` as monkeypatches, so they port straight to `fight.ts` (`gainEnergy`, `fakeGilds`), `run.ts` (`fightConfig` Mirror gilds → drop `tier`), `enemies.ts` (`ELITE_HP_MUL_2` 1.3, GROUNDER/COUNTERFEITER strips) and the crack in `checkDeath` (`c.charge = c.ability.every - 1`). Re-run `it9_skill` + `it9_counter` + `it9_arc` after landing it. I10 targets: those in the Q table, plus act 1 MIDAS ≤ 53, and GROUNDER hardest for TESLA / COUNTERFEITER hardest for gild builds in `it9_counter`.

**Next BIG content step: HIGH STAKES (a stake ladder, like Balatro's stakes / StS ascension).** Once Q lands, the balance is good enough to build on, and I recommend this over act 3, more cabinets or new systems:
- **It multiplies all the content that exists.** Five cabinets × a ladder is dozens of distinct runs. It's the thing that makes a 27% commit win rate *feel* good: winning unlocks a harder version of *your* cabinet.
- **It delivers "more enemies" and "more powerful stuff" at the right moment.** Each stake can add a rule instead of a number:
  - RED: act 2 forks always offer the counter to your build.
  - GREEN: elites everywhere; spoils are legendaries.
  - BLACK: the Mirror copies one relic.
  - GOLD: act 1 bosses get an act 2 writer.
  - Those rules are the "more powerful" asks, pointed at players who've beaten the base game.
- **It fixes the soft act 2 without flattening new players.** Act 2 regulars are a victory lap for committed builds (41% stomps). Stakes let skilled players opt into scary act 2 fights while the base game stays welcoming.
- **It's cheap on art** (stake chips + a ladder screen) and sim-testable with the existing harness: one knob set per stake, measured with `it9_skill`.
- **Act 3 / a third boss is the better *second* big step.** Runs are already 12 fights (~25–35 min), and act 2's regulars aren't pulling their weight yet. A third act now would add length before act 2 is "great". After stakes, a short act 3 of 3 fights + boss (e.g. THE DEALER, who shuffles your strips between spins) makes a great "true ending" unlocked at stake 2.
