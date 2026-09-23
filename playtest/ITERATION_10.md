# Iteration 10 Playtest: Package Q + HIGH STAKES

**Method.**
- **Headless.** `scratch/it10_lib.ts` extends `it9_lib` with stake-aware B1 snapshots (`snapshotsAt`), paired full runs at a stake (`fullRuns`: the same run seeds at every stake), and rule toggles (`onlyRules`). Scripts and outputs (`.txt`) are in `playtest/scratch/`:
  - `it10_skill.txt`: `it9_skill` re-run unchanged on this build. 2000 attempts per cabinet, so 696–839 B1 snapshots each (the implementer's check used N 150).
  - `it10_counter.txt`: `it9_counter`, one controlled B3 fight against every act 2 archetype, 800 attempts per cabinet.
  - `it10_arc.txt`: `it8_arc`, 1500 full runs per cabinet per policy. Act 1 and the act 2 arc.
  - `it10_ladder.ts`: the stake ladder per cabinet (commit, 1500 paired runs per cell), plus each rule on its own, GREEN copy stats and BLACK House stats.
  - `it10_red.ts`: RED diagnostics from paired stake 0 and stake 1 snapshots.
  - `it10_alt.ts`: candidate replacement rules (monkeypatched).
  - `it10_officialsim.txt`: `npm run sim -- --runs 1500`.
  - Tests: 119/119 green.
- **Live, on :4173 only.**
  - The cabinet screen for a new player and at `stakes={knight:3,midas:1,tesla:5}`, including clicks on stake-locked cards.
  - KNIGHT at stake 3 (BLACK). Act 1 was forced; **the dirty House was played for real** (won 31→26 HP in 31 turns). Act 2 was played for real, and I **died to an elite bomber at B2**.
  - A second KNIGHT stake 3 run with forced wins, to see the unlock flow ("STAKE 4 BLUE UNLOCKED").
  - A stake 5 fight-HUD check, and a TESLA stake 1 (RED) act 2 fork.
  - Snaps are `snaps/i10p-*.png`.

## Verdict

**Package Q landed. At N≈800 per cabinet, every Q target is met except THORN (HP-first beats commit, as before) and the Mirror at 66.0%, one point over. The COUNTERFEITER is no longer soft, but it isn't the hardest fight for gild builds either. The GROUNDER now answers TESLA, and hard.**

**HIGH STAKES is the right structure, and the ladder is fair *across cabinets*: every cabinet ends at about half its WHITE win rate, and GOLD is 12.9–15.8% for all five. But two of the five rungs don't work as rules:**
- **RED does nothing** (−1.0 to +1.7 on every cabinet). It also makes act 2 monotonous: I fought three COUNTERFEITERs in one act.
- **GREEN is really "the Mirror has a Skeleton Key"**, copied 64–77% of the time, and it is **completely invisible**: no card, no HUD, no text anywhere.
- **BLACK only bites slow machines** (THORN −5.0, MIDAS −0.7).
- **BLUE and GOLD bite well, but they are pure numbers.**

Three stake bugs make stakes feel like a hidden difficulty slider rather than rules:
- Enemy cards show the *old* ability cadence at BLUE/GOLD (and at BLACK for the House).
- The Mirror's copied relic is never shown.
- The picker only lists the newest rule.

Fix those, replace RED, and make GREEN a decision (below), then build act 3 on top.

## 1. Package Q vs the I10 targets

B1 snapshots, commit, `it10_skill.txt` (N 696–839 per cabinet; paired SE shown).

| Target | Result | |
|---|---|---|
| act 2 cabinet spread ≤ 14 | **13.2** (KNIGHT 49.9 / MIDAS 50.4 / THORN 49.5 / **TESLA 58.3** / JOKER 45.2) | ✓ (TESLA still top) |
| commit ≥ notier | **+4.1 ± 0.6** (MIDAS +5.3, TESLA +8.2, THORN 0.0) | ✓ |
| commit − random ≥ 6 | **+9.4** (THORN +2.9) | ✓ |
| commit − HP-first ≥ 3 per cabinet | avg +7.1; **THORN −11.3** | ✗ THORN (known) |
| elite − safe within ±3 | **+0.1 ± 0.7** (every cabinet within ±1.5) | ✓ |
| Mirror 60–65% (commit) | **66.0** (KNIGHT 63.3, MIDAS 62.7, THORN 66.7, **TESLA 73.7**, JOKER 63.6) | ~ (1 over; TESLA +10) |
| REFLECTION ≥1 in ≥75% per cabinet | 98.4 (lowest MIDAS 94.5) | ✓ |
| Mirror wins without a reflection ≤ 10% | **0.0** on every cabinet | ✓ |
| act 1 MIDAS ≤ 53 | commit **45.8**, greedy 45.4 (all cabinets 45.8–51.7) | ✓ |
| GROUNDER hardest for TESLA | TESLA vs GROUNDER **50% HP / 24.6% deaths**. The next worst is vampire at 16.7%, and the other regulars average ~9% | ✓ (overshoots) |
| COUNTERFEITER hardest for gild builds | counterfeiter-class builds lose 41.7% to it, **mid-pack**. Vampire 48.5, mimic 47.4, bomber 44.9 and brute 44.8 are all harder. MIDAS vs COUNTERFEITER: 38% / 7.6% deaths, vs its average of ~40% | ✗ (no longer soft, not a counter) |
| dodge − face (a real fork choice) | **−0.1 ± 0.5** (TESLA +1.6, THORN −2.6) | ✗ |

**The implementer's quick check reproduces.** At N 150, they had Mirror 68.9, 0% no-reflection wins, elite − safe +0.4 and spread 20.9. At N≈800 the spread is **13.2**, not 20.9: the N 150 number was noise, as suspected. TESLA is still the top cabinet by 8 points, driven by its Mirror (73.7%).

**The GROUNDER now overshoots on TESLA.** In a controlled B3 fight, a quarter of TESLA runs die to it. It's also the deadliest fight for KNIGHT (13.1%), because 45% of KNIGHT builds have bolts or specials. In full runs it's gentler: 4.3% deaths per act 2 attempt, 19% HP lost. Most players meet it at full HP, and greedy forks avoid it. I'd leave it until RED/stake play is re-tuned. If it stays at the top, drop its sword back to 4.

**Act 2 arc** (`it10_arc`, commit, full runs):
- Act 2 regular fights still take **24% HP** (act 1: 32%), and 38% are stomps. 55% of runs have at least one scary regular fight.
- Deadliest per attempt: B1 2.8 / B2 4.3 / B3 7.5 / B4 3.0 / B5 6.3 %, then the Mirror at 35.8%.
- Full-run commit win: 24.7% (23.9–26.7 across cabinets). Greedy: 19.5%.
- Official sim (1500): greedy 17.7 / relic 13.5 / random 12.5; House 74; Mirror 45 (greedy).

## 2. HIGH STAKES

### The ladder per cabinet (`it10_ladder.txt`, commit, 1500 paired runs per cell)

Full-run win %. Each cell shows the paired step vs the previous stake.

| | WHITE | RED | GREEN | BLACK | BLUE | GOLD | GOLD/WHITE |
|---|---|---|---|---|---|---|---|
| KNIGHT | 23.4 | 24.1 (+0.7) | 22.1 (−2.0) | 19.7 (−2.5) | 16.7 (−3.0) | 12.9 (−3.8) | 0.55 |
| MIDAS | 25.3 | 24.9 (−0.4) | 21.9 (−3.1) | 21.4 (**−0.5**) | 18.4 (−3.0) | 13.5 (−4.9) | 0.53 |
| THORN | 29.3 | 28.3 (−1.0) | 25.0 (−3.3) | 21.1 (−3.9) | 16.6 (−4.5) | 14.6 (−2.0) | 0.50 |
| TESLA | 28.1 | 27.3 (−0.8) | 24.9 (−2.4) | 24.3 (**−0.6**) | 21.1 (−3.2) | 15.8 (−5.3) | 0.56 |
| JOKER | 20.3 | 22.0 (**+1.7**) | 18.5 (−3.5) | 17.3 (−1.2) | 15.0 (−2.3) | 13.4 (−1.6) | 0.66 |

Step SEs are about ±0.5 for GREEN, ±0.8 for RED/BLACK/BLUE and ±1.1 for GOLD.

**Each rule alone vs base** (paired):

| | RED counter forks | GREEN Mirror relic | BLACK dirty House | BLUE act 2 faster | GOLD all faster |
|---|---|---|---|---|---|
| KNIGHT | +0.7 | −1.8 | −2.7 | −5.1 | −6.3 |
| MIDAS | −0.4 | −3.9 | −0.7 | −4.8 | −7.1 |
| THORN | −1.0 | −3.1 | **−5.0** | −7.2 | **−10.5** |
| TESLA | −0.8 | −2.3 | −0.9 | −4.5 | −6.9 |
| JOKER | **+1.7** | −2.1 | −1.8 | −3.2 | −5.1 |

**Is each stake a fair, felt step for every cabinet?**
- **Fair: yes, overall.** Every cabinet ends at about half its WHITE rate, and the GOLD spread is only 2.9 points.
- **Felt: no, for two rungs.**
  - **RED is noise everywhere.**
  - **BLACK is a non-event for burst machines** (MIDAS −0.5, TESLA −0.6). They kill the House before a 3-turn skim cadence matters. THORN, the slow machine, pays −3.9 to −5.0.
  - **GOLD barely moves JOKER** (−1.6) or THORN once BLUE is in (−2.0).
- By design the ladder front-loads nothing: stakes 1–3 are soft and 4–5 do the work. For a Balatro-style ladder, rungs 1–2 should be the *most interesting* and clearly felt.

**Per-attempt lethality by stake** (all cabinets; A1..A5 / HOUSE / B1..B5 / MIRROR):
- s0: 1.8/10.0/15.4/6.2/9.7 / 22.1 / 3.0/3.7/6.3/4.3/6.6 / 34.5
- s3: HOUSE **29.4**; MIRROR 41.3
- s5: 2.0/12.7/18.9/8.1/12.7 / 31.3 / 4.4/6.4/8.5/5.2/6.3 / **49.6**

The stakes mostly harden the two bosses. Act 2 regulars still sit at 4–8% even at GOLD, so the "soft act 2" problem isn't what stakes fix.

### Rule by rule

**RED: "act 2 forks always offer the counter to your build". It doesn't bite (`it10_red.txt`).**
- It works mechanically. Every cabinet has a counter class at the transition (KNIGHT 55/45 counterfeiter/grounder, MIDAS 85/15, TESLA 100% grounder). Forks offering it go from 0.67 to **3.00**, and the greedy fork policy fights it **2.3×** per act 2 (was 0.57).
- Act 2 clear barely changes (greedy fork, W → R):

| | W → R |
|---|---|
| KNIGHT | 50.1 → 50.0 |
| MIDAS | 50.4 → 51.4 |
| THORN | 49.5 → 49.0 |
| TESLA | 58.5 → 55.6 |
| JOKER | 45.1 → 45.4 |

- Fork fights go from 22% HP / 4.6% deaths to 23% / 5.0%.
- Why:
  1. The COUNTERFEITER (the counter for 3 of 5 cabinets) is an average fight, not a counter.
  2. The "other" option is always the elite, and elite − safe is now ~0, so dodging is free.
  3. It *replaces* a regular fight rather than adding one.
- **Feel is worse than neutral.** My stake 3 KNIGHT act 2 map was **COUNTERFEITER on all three forks** (recap: RABID / HUNGRY / WANGY COUNTERFEITER). It removes variety, the thing act 2 needs most.
- Nothing on the fork card says "THIS IS YOUR COUNTER (RED STAKE)", so the rule is invisible too (`i10p-red-fork-tesla.png`).

**GREEN: "the Mirror copies one of your relics". It bites evenly (−1.8 to −3.9), but it's a fixed rule in disguise, and invisible.**
- The copy is Skeleton Key **64–77%** of the time, Bell 10–16%, and nothing 4–12%. In practice, GREEN means "the Mirror's doubles pay x2".
- **Nothing shows it.** The Mirror card, the fight HUD and the legendary screen never mention the copy (no UI code reads `cfg.enemy.relics`). You can lose to a Key you never knew the Mirror had.

**BLACK: "the House plants bombs and skims every 3".**
- Bombs are a sideshow: 2.2–3.0 planted per House fight, 1–1.5 blasts, **2–3 HP**. The real bite is the skim cadence. Pot kills go up (KNIGHT 81 → 144), and slow machines lose 62–67% of House fights (THORN 75.4 → 62.2).
- Live, it felt good. The House's reels carry visible bombs (`i10p-black-house-bombs.png`), and the fight was a 31-turn grind. **But the House card still says "CASH OUT EVERY 4 TURNS"** and doesn't list bombs in THEIR REELS (`i10p-black-house-card.png`).

**BLUE / GOLD: "abilities charge a turn faster".**
- These are the strongest and most even rungs. But they're numbers, and **the cards lie**: at GOLD the ELDER SLIME card says "FLOOD EVERY 4 TURNS", while the fight uses every 3. The HUD pips are right.

### Candidate rules (`it10_alt.txt`, each alone vs base, commit, 1500 paired)

| candidate | KNIGHT | MIDAS | THORN | TESLA | JOKER | notes |
|---|---|---|---|---|---|---|
| **SCARS/2**: every 2nd fight you win leaves a permanent ROCK on your sword-heaviest reel | −1.9 | −2.9 | −2.8 | −1.4 | −1.4 | even, felt, and on-theme (enemies write on your machine *permanently*). Revives CLEAR ROCKS / Pickaxe (Pickaxe is 0% win in the official sim) |
| SCARS/3 | −0.8 | −0.7 | −1.3 | −0.4 | −0.7 | too weak |
| **LEGEND MIRROR**: the Mirror copies your *legendary* | −0.5 | −1.3 | −0.9 | −0.5 | −0.3 | weak alone, but it **turns the legendary pick into a decision**. Key on MIDAS: 51.4 → 41.6 win. Phoenix is mild (−2), and Overcharge/Hourglass are safe (the Mirror can't use them) |
| RED + counter at elite HP (x1.3, no pay) | −2.7 | −2.6 | −4.7 | −5.5 | −0.4 | uneven (JOKER unaffected), still monotonous |

## 3. Whole-run feel (browser)

- **The cabinet screen, new player** (`stakes={}`): the picker is hidden until a first stake unlocks. Nothing hints that a ladder exists. "WIN AND UNLOCK MORE" reads as cabinets only. That's fine for a first run, but Balatro shows the locked chips from the start, and that promise matters.
- **The cabinet screen with stakes** (`i10p-cabinets-stake3.png`):
  - LOWER/HIGHER and "STAKE 3: BLACK" with the rule are clear.
  - Cards that haven't reached the stake say "NEEDS STAKE 3" and ignore clicks. That's good, but there's no shake or sound, so it feels dead.
  - "(+ 2 EARLIER)" hides what RED and GREEN do: at stake 5 you can't read the rules you're playing under.
  - The per-card chips are ~12 px circles whose numerals are unreadable, and the BLACK chip is grey on grey. They show the best *unlocked* stake, not the best *won*.
- **HUD:** "KNIGHT / STAKE 5 GOLD" is 1x text under the chip counter (~5 px). It's legible only zoomed. The map and fork screens show no stake at all.
- **The dirty House** was the best stake moment. It was tense, you could see the bombs on its reels, and the pot pips were right. It would be better if the card told the truth (cadence 3, bombs).
- **The act transition** shows the H3 fix: "KNIGHT ACT 2 SIGNATURE: +6 MAX HP" ✓. At GREEN, this is where the player should learn that the Mirror will copy one of their relics, and it doesn't say so.
- **Act 2 at RED:** three COUNTERFEITERs, or three GROUNDERs for TESLA, one per fork. It reads as the game running out of enemies, not as the House targeting you.
- **The unlock message** (`i10p-over-win-unlock.png`): "STAKE 4 BLUE UNLOCKED FOR KNIGHT: ACT 2 ENEMY ABILITIES CHARGE 1 TURN FASTER" is shown in the stake colour, but:
  - it's a single 2x line jammed against the recap panel's top border;
  - there's no chip, no sting, no fanfare;
  - it's the biggest meta moment in the game and it reads like a footnote.
- The header "BEAT ALL 12 FIGHTS – STAKE 3 BLACK" ✓.
- **The real act 2 at BLACK** (seed 20202): a B1 hexer took 10 HP, then my auto-pick walked me into an ELITE BOMBER and it killed me from 28/38. Bombs + BLUE-free act 2 still kill when you misjudge the elite. Good.

## 4. Bugs (with repro)

| # | Sev | Bug | Repro |
|---|---|---|---|
| K1 | **high** | **Enemy cards show the base ability cadence at BLUE/GOLD, and the House card says "EVERY 4 TURNS" at BLACK.** The Fight constructor changes `ability.every` (fight.ts:185–187), but cards read `EnemyDef.ability.every`, and the House blurb hardcodes 4 (runScreens.ts:672). The House card also omits its bombs from THEIR REELS | `dbg.run(10101,'knight',5)`: the card says FLOOD EVERY 4, `dbg.game.fight.sides.enemy.ability.every` === 3. BLACK: `dbg.run(20202,'knight',3)` and walk to the House card |
| K2 | **high** | **GREEN's copied relic is invisible.** It's not on the Mirror card, the fight HUD, the legendary screen or the recap (no UI reads `cfg.enemy.relics`) | Any stake ≥ 2 run that reaches the Mirror while holding Key/Bell/Prism/Hone/Twin Reels/Clover |
| K3 | med | **The stake picker shows only the newest rule** ("… (+ 2 EARLIER)"). The comment at runScreens.ts:750 says "every rule it stacks". You can't read your full ruleset anywhere | Cabinet screen, stake ≥ 2 |
| K4 | med | **Stale elite text:** "ELITE: +50% HP. PAYS 8 CHIPS" on act 2 elites, which are x1.3 now. Act 1 thief elites are x1.15 but say +25%. The line is also 1x text | TESLA seed 40404, act 2 fork 2 (`i10p-red-fork-tesla.png`) |
| K5 | med | **RED's replacement makes every act 2 fork the same archetype**, so act 2 has 3 identical counters. Nothing marks it as the stake's doing | `dbg.run(20202,'knight',3)`, beat the House, read `run.paths` |
| K6 | low | **The unlock line overlaps the recap panel top** and has no presentation | Win a run at your best stake (`i10p-over-win-unlock.png`) |
| K7 | low | **Stake chips on cabinet cards**: numerals unreadable, BLACK chip grey-on-grey. They show the best *unlocked* stake, and there's no "won at" marker | Cabinet screen with `stakes={knight:3,...}` |
| K8 | low | **The HUD stake label is 1x text; the map/fork/shop screens show no stake** | Any stake run |
| K9 | low | Clicking a "NEEDS STAKE n" card gives no feedback (no shake or sound) | Cabinet screen, stakeSel above a cabinet's best |
| K10 | nit | **Comments name the wrong stakes.** run.ts:319 says "GOLD stake: the House plants bombs" (it's BLACK). run.ts:321, config.ts:120 and stakes.ts `MIRROR_COPYABLE` say "BLACK" for the Mirror relic (it's GREEN) | read the source |
| K11 | nit | **The official sim's stake ladder isn't paired.** `simulateRuns` draws fight seeds from the same stream as run seeds, so any act 2 change desyncs later runs. Act 1 shows 46.3 vs 45.6 between WHITE and RED, which should be identical. RED's "+0.3" in the official output is noise | `npm run sim`, compare act1 across stakes 0–2 |
| K12 | nit | No stake hint for new players (the picker is hidden until the first unlock) | Fresh prefs |

Earlier fixes checked live: **H3 ✓** (signature line on the legendary screen), **H1 ✓** (the GROUNDER blurb fits in 2 lines), **H2 ✓** (HUD "+4 SH/TURN"), and the H8 guard is in code (`INPUT_GUARD_MS`).

## 5. Prioritised changes (★ = top 5)

1. ★ **Make stakes tell the truth (K1, K2, K3).**
   - Cards compute cadence from the stake: use one `effectiveAbility(e, run)` helper shared by the Fight and the cards.
   - The House card at BLACK says "CASHES OUT EVERY 3 · PLANTS BOMBS" and lists the bombs.
   - The Mirror card and HUD show the copied relic ("MIRROR COPIES: SKELETON KEY") as a relic icon on its side.
   - The picker lists **every** active rule (a stacked list of chips + one line each).
   - Rules you can't see aren't rules.
2. ★ **Replace RED with SCARS**: "Every 2nd fight you win leaves a ROCK on your best reel (permanent)". It tested at −1.4 to −2.9 on every cabinet, it's the game's hook (enemies write on your machine, now permanently), and it revives CLEAR ROCKS / Pickaxe as picks.
   - Retire counter forks, or fold them into BLUE as "your counter appears on one act 2 fork, marked YOUR COUNTER". One marked counter is a story; three is repetition (K5).
3. ★ **GREEN = "the Mirror copies your LEGENDARY (or, if it can't use it, your best copyable relic)".** The act transition says so on each legendary card ("THE MIRROR WILL COPY THIS"; "MIRROR CAN'T USE" on Overcharge/Hourglass).
   - This turns the act 2 pick into the stake's decision (Key on MIDAS: 51 → 42 if copied) while keeping about today's bite. The fallback keeps it from being 0.
   - Untested as a combination; sweep it next iteration.
4. ★ **BLACK should bite burst machines too.** Keep skim-every-3. Make the bombs matter: 3 per reel, and **bombs land on your payline too** (the House cheats; landing one still defuses it). Or add: "ALL IN at 60% HP instead of 50%".
   - Target: every cabinet −2 to −4 at this rung. Today it's −0.5 for MIDAS/TESLA and −3.9 for THORN.
5. ★ **Unlock presentation (K6, K7, K8, K12).**
   - On the over screen, a chip slides into the cabinet card with the rule text, on its own row.
   - On cards, readable numerals plus a "WON" pip.
   - In the HUD, a stake chip beside the chip counter at 2x text.
   - For new players, the ladder is visible from run 1 as locked chips ("WIN TO RAISE THE STAKES").
6. Fix the K4 elite text: "+30% HP · +6 CHIPS". Also the act 1 thief line.
7. GOLD: keep "all abilities faster" as the numbers rung, but make GOLD the **gate to act 3** (below). JOKER's GOLD step is −1.6; give GOLD a JOKER-relevant twist, e.g. "WILDs can be stolen/slimed like any symbol", if act 3 isn't gated here.
8. THORN act 2: HP-first is still +11 over commit. Sweep "a SPIKED FULL SET hits back REFLECTIONS" (carried over from ITERATION_9 item 7).
9. TESLA's Mirror at 73.7%: cap the energy term of `machinePower` per spin (carried over). The GROUNDER's 24.6% B3 death rate vs TESLA overshoots; if TESLA drops after the cap, set the GROUNDER's sword back to 4.
10. The COUNTERFEITER should be a real counter: a faked gild pays **half** (not plain) for **3** turns, and fakes prefer your *set* gild. Re-run `it9_counter` and aim for counterfeiter-class HP lost ≥ 46%.
11. K11: give `simulateRuns` a separate fight-seed stream so the official ladder is paired.

## 6. Art needed

- **Stake chips v2:** six 16×16 casino chips with a big readable numeral, and a "won" pip variant. BLACK needs a light rim to separate from the background.
- **An unlock sting on the over screen:** the chip flying onto the cabinet card, and a "NEW STAKE" ribbon.
- **The Mirror's copied-relic slot:** a cracked-glass frame around the relic icon beside the Mirror's HP bar ("COPIED").
- **A SCARS rock variant:** a cracked, darker "scar" rock so a permanent stake rock reads differently from a golem rock. Plus a "SCARRED" callout.
- **A "YOUR COUNTER" tag** for a fork card (target reticle), if the counter fork moves into BLUE.
- **Act 3 (below):** the DEALER portrait (croupier in a green visor, the House's partner), a card-back reel overlay, SHUFFLE/CUT/RAISE ability icons, 3 act 3 enemy portraits, and an ACT 3 plaque.

## 7. Next package and the next BIG step

**Package R ("stakes you can read").**
- Items 1–6 and 11, plus a sweep of the new GREEN and BLACK.
- Targets on the commit ladder (`it10_ladder`):
  - every rung −1.5 to −4.5 for **every** cabinet;
  - GOLD/WHITE 0.45–0.6 per cabinet;
  - GOLD spread ≤ 4.
- Re-run `it10_skill`/`it10_counter` to keep the Q table green.

**Next BIG step: ACT 3, "THE DEALER" (a short true ending).** Balance is in good enough shape: all Q targets hold at N≈800, the cabinet spread is 13, and the stakes are fair across cabinets. Sketch:
- **Unlock:** runs at stake ≥ GREEN continue after the Mirror, once you've beaten GREEN on any cabinet ("THE HOUSE HAS A PARTNER…"). WHITE/RED runs stay at 12 fights, so the base game doesn't get longer.
- **Structure:** full heal, then a **Cashier-only** transition (no legendary, so the Mirror-copy decision stays GREEN's). Then **3 fights (C1 single; C2 fork; C3 single) + THE DEALER**. That's about 8 extra minutes.
- **Act 3 enemies:** each writes on your machine in a new way.
  - **CARD SHARP** turns one of your cells into a CARD (a dead symbol that scores as whatever the Sharp's last line was, *for the Sharp*).
  - **PIT BOSS** confiscates a gild for the fight (it moves to its machine).
  - **CROUPIER** slides your payline stops down 1 on a reel for 2 turns (like freeze, but it *moves*).
  - HP curve roughly [110, 125, 140], with act 2 swords +3.
- **THE DEALER (the special machine):**
  - **Watch-only.** Every 3 turns it deals **one of three face-up cards**, shown on a passive telegraph panel the turn before (like REFLECTION):
    - **SHUFFLE** trades 3 random cells between two of your reels, for the fight. This breaks per-reel stacking. **FULL SETS are immune**, because the gild travels with its reel, not the cell. So commit builds shrug it off and half-builds suffer.
    - **CUT** removes your most common symbol's top cell from each reel, for the fight.
    - **RAISE** makes its next hit x2, and your next jackpot x2 too. It's a coin flip, but a fair one.
  - **Phase 2 at half HP, "HOUSE RULES":** the Dealer takes one of your cabinet's act 2 signatures for itself (KNIGHT's +HP, TESLA's cheap specials, JOKER's wilds). It's a callback to the cabinet identity, and it's shown on its card.
  - **HP:** 2 × typical-spin power + 90 + 4 per relic. Aim for about 60% commit win, with REFLECTION-style guaranteed interaction: a SHUFFLE must land before any kill is possible (a gate like the crack).
- **Reward:** a "TRUE ENDING" recap and a gold frame on the cabinet card. Beating the Dealer at GOLD is the 100% badge.
- **Sim plan:** snapshot at C1 after the Mirror (like B1). Measure C-fight lethality ≥ 5% each, Dealer 55–65%, cabinet spread ≤ 14, and SHUFFLE hurting non-set builds more than set builds (the intended lesson).

Report files: this report plus `playtest/scratch/it10_*.ts`/`.txt` and `snaps/i10p-*.png`.
