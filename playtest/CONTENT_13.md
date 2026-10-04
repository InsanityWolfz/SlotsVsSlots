# CONTENT_13: charm and relic content round (expert playtester)

Date: 2026-10-04. Source: `loop/IDEAS_CHARMS_RELICS.md`. Harnesses: `tools/balance/c13_*.ts` (src/ untouched).

## 1. Method and baseline
- **Harnesses** (all throwaway, `src/` untouched):
  - `tools/balance/c13_sim.ts`: a copy of `src/sim/simulateRun.ts` whose bot tables are exported (`GILD_VALUE`,
    `RELIC_VALUE`) plus an `onFinish` hook. Same numbers as the real sim: with no new content the official table is
    **44.9 / 18.7** exactly (KNIGHT 43.1/18.6, TESLA 47.9/16.4, BRIAR 50.3/19.2, JOKER 43.2/19.7, MIDAS 39.9/19.6).
  - `tools/balance/c13_patch.ts`: every idea as a runtime patch on `Fight.prototype` (`rollStops`, `score`,
    `resolveGroup`, `write`, `turnBody`) and explicit table edits (`CHARM_VALUE`, `CHARM_SYMBOLS`, `ACT1_GILDS`, `RELICS`,
    `RELIC_TIER`, `LEGENDARY`, the bot values). **No Object.prototype hacks.** `levelCheck()` prints on every run:
    every new charm reads LV1 from a fresh level table (the round-12 THORNY bug can't repeat).
  - `tools/balance/c13_rows.ts` (rows, GREEN, seed 777, no start relic; `base0` = today's game, `baseline` = the new
    content in the pools, `only X`, `+relic`) and `tools/balance/c13_tuesday.ts` (the official table, seed 4242).
- **The bot's value for a new card matters more than the card.** A charm that does *nothing* (WEIGHTED with weight 1),
  valued 7 by the bot like VAMP, took MIDAS from 39.9/19.6 to **18.2/7.1** and KNIGHT to 32.4/12.5 (official, N 1000).
  The same charm valued 0 (never taken: pool dilution only) left them at 43.2/19.5 and 40.8/15.7 (noise). So every
  official number below uses an honest bot value (what a player would pay for it, set next to its peers: VAMP 7,
  KEEN 6.5, GOLD 9), and a charm that loses runs when taken at its peers' value is a **trap**, whatever its "only" row says.
- Noise: rows at N 500 have ~1.3 pts SE per machine (~0.6 on the average); the official table at N 1000 ~1.5 per machine.

## 2. Charms (pitch list)
Reference rows (GREEN, seed 777, N 1000, today's game): **baseline 12.3**, no charms 10.1, only VAMP **16.1**,
only GOLD 14.4, only KEEN 9.9. The gate is an "only X" row between 12.3 and 16.1.

**Why the gate is hard (a finding, not a bug):** the Mirror, act 3 and the Dealer are sized from your *measured damage*
(`machinePower`, elasticity 0.5), and that measure counts only damage. A damage charm pays back about half its gain in
boss HP; heals, chips and cleanses are never measured, so they keep all of it. That is the real reason VAMP is the
auto-pick and KEEN a trap. ECHO shows it cleanly: raising it from 30/40/50% to 50/75/100% (and making it pierce) did
not move its row at all (8.3, 8.3, 8.5), although in bare fights it doubled its damage.

| Charm | Numbers tried | only-X row (avg; KNIGHT TESLA BRIAR JOKER MIDAS) | Official with it in (WHITE / GREEN) | Verdict |
|---|---|---|---|---|
| **LUCRE** | +1 chip/group, cap 3/4/5 | 9.2 (2.8 10.8 19.0 7.2 6.4) | 40.9 / 15.6 | too small |
| | +2, cap 4/6/8 | 10.4 | | |
| | +2, cap 6/8/10 | 11.2 | | |
| | **+3, cap 6/9/12** | **12.4** (7.6 13.8 26.4 8.2 6.2) | **43.8 / 19.3** (KNIGHT 39.8/17.5, TESLA 45.5/18.4, BRIAR 52.5/20.6, JOKER 40.6/21.7, MIDAS 40.6/18.5) | **SHIP** |
| **SAGE** | 1/1/2 washes | 8.5 (3.0 8.6 18.6 7.0 5.2) | 41.6 / 17.0 (MIDAS 33.8/13.7) | **CUT** |
| | 2/3/4 | 8.2 | | |
| **ECHO** | 30/40/50% | 8.3 (3.2 6.8 17.0 7.6 7.0) | 40.1 / 14.4 | **CUT** |
| | 50/75/100% | 8.3; pierce 8.5 | | |
| **WEIGHTED** | x2 odds, +0/10/20, any symbol | 5.1 | 33.0 / 11.3 (MIDAS 13.4/3.5) | **CUT** |
| | no shields | 5.1; +10/20/30 7.3 | | |
| **TRICK** (JOKER) | 10/15/20 | 7.1 (JOKER baseline 14.5, only VAMP 14.6) | JOKER 38.4 / 15.6 | too small |
| | 20/30/40 | 10.2 | JOKER 43.6 / 18.3 | |
| | **25/35/50** | **11.6** | **JOKER 43.5 / 19.8** (today 43.2/19.7) | **SHIP** |
| | 30/45/60 | 11.7 | JOKER 46.5 / 20.3 (+3.3 WHITE) | too much |
| **KEEN rework** | today 20/30/40 | 9.9 | 44.9 / 18.7 | |
| | 30/40/50 | 10.6 | 45.4 / 18.3 | |
| | **40/50/60** | **11.8** (14.0 10.5 18.2 9.8 6.3) | **45.8 / 18.6** (KNIGHT 46.3/20.8) | **SHIP** (no longer a trap) |
| | 50/60/70 | 11.4 | 46.4 / 19.3 (KNIGHT 47.4/**22.6**) | too much for KNIGHT |

### Per charm
- **LUCRE: SHIP at +3 chips when its group pays, max 6 / 9 / 12 a fight.**
  - The pitch's +1 chip (max 3) is invisible: 9.2, below "no charms". Chips are worth ~1/10 of a card, so it needs
    about a card's worth per 3 fights to matter.
  - Readable: a coin popup on the group, like MIDAS's chips. A real new axis: it feeds the shop, the chip shield at
    the bosses, and MIDAS's vault (MIDAS official 40.6/18.5 with it).
  - BRIAR loves it (26.4 only-row: BRIAR's charms are a trap, so chips beat them). Watch BRIAR WHITE.
  - Paid after a won fight (like MIDAS's chips); a lost fight pays nothing.
- **SAGE: CUT.** Washing a cheat is readable, but cheats rarely decide fights once you're on a shield: 2 / 3 / 4 washes
  measured the same as 1 / 1 / 2 (8.2 vs 8.5). It also sits on shields, the weakest symbol. HOLY WATER already owns
  "cheats wash off". If the user wants it, fold it into HOLY WATER's text later, not a charm.
- **ECHO: CUT.** It's a delayed, weaker KEEN (same sword slot, same job), and as pure damage it's taxed by boss
  sizing (see above): no value we tried moved the row. The delayed hit is nice to watch; keep the idea for a relic.
- **WEIGHTED: CUT.** In a watch-only fight nobody can see odds change, so it reads as "nothing happened". It also
  makes a shield land more often when it lands on shields (a trap card), and is weak even sword-only.
- **TRICK: SHIP at +25 / 35 / 50 to the jackpot meter when it lands** (JOKER only, swords and shields). JOKER's
  rows are flat (baseline 14.5 = only VAMP 14.6), so the gate is "official doesn't move": 43.5/19.8 vs 43.2/19.7.
  It finally gives JOKER a charm of its own that feeds its meter (bot value 8, like THORNY).
- **KEEN: SHIP the number rework, +40 / 50 / 60 per sword.** 11.8 ≈ baseline: no longer a trap, still not an
  auto-pick. +50/60/70 pushes KNIGHT GREEN to 22.6. The "ignore half the shield" option adds a rule for no gain.

## 3. Relics (pitch list)
"+relic" rows: GREEN, seed 777, start holding it, no start pick, N 600 (TESLA/MIDAS-only relics N 1000). Today's
baseline is **12.3** (TESLA 10.2, MIDAS 13.8), so the pitch's "12–15 with baseline ~10" band becomes **+2 to +5,
i.e. 14.3–17.3**.

| Relic | Numbers tried | +relic row (avg; KNIGHT TESLA BRIAR JOKER MIDAS) | Verdict |
|---|---|---|---|
| **CHARM BRACELET** | +10% per charm type | 20.8 (24.2 28.5 16.2 17.8 17.3) | too strong |
| | **+5% per type** | **16.2** (17.2 18.8 14.0 15.7 15.5) | **SHIP** |
| **METRONOME** | every 3rd spin x2 | 19.0 | too strong |
| | every 4th x2 | 17.5 | edge |
| | **every 3rd x1.5** | **15.9** (16.7 15.7 14.7 15.2 17.2) | **SHIP** |
| **COUNTERWEIGHT** | x1.5 after a no-match spin | 19.6 | too strong |
| | x1.25 | 14.4 (14.8 15.8 12.0 13.8 15.7) | HOLD (overlap) |
| **RUST** | enemy shield -25% a turn | 11.2 | **CUT** |
| | -50% | 11.6 | |
| **SNAKE EYES** | heal 20 per enemy jackpot | 17.2 | edge |
| | **heal 15** | **15.9** (14.3 14.8 13.8 20.3 16.3) | **SHIP** |
| **PIT BOSS** (legendary) | first enemy jackpot pays as a pair | **16.3** (16.7 14.2 12.7 19.2 18.8) | **SHIP** |
| **TESLA COIL** (TESLA) | 5 per bolt above/below the payline | TESLA 21.4 (base 10.2) | too strong |
| | 3 per bolt | 17.3 | too strong |
| | 5, max 2 bolts | 19.0 | too strong |
| | 2 per bolt | 13.5 | |
| | **5, once a spin** | **13.3** (+3.1) | **SHIP** |
| **TAX MAN** (MIDAS) | +1 chip per paying gold bar group, max 3 | **MIDAS 17.9** (base 13.8) | **SHIP** (but see MIDAS below) |

### Per relic
- **CHARM BRACELET: SHIP at +5% per charm type** ("EVERYTHING PAYS +5% FOR EACH CHARM TYPE YOU OWN"). The only relic
  that rewards a *wide* build: it's the counter-pull to stacking VAMP. TESLA likes it most (CHARGED, BLAZE, LUCKY:
  many types). The note on the paying group shows `X1.15`; no new widget.
- **METRONOME: SHIP at every 3rd spin x1.5.** The most watchable idea on the list: the relic icon can tick 1-2-3 in
  the relic bar (it already pops when it fires) and the crowd learns the beat. x2 was +6.7.
- **COUNTERWEIGHT: HOLD.** It works (x1.25: +2.1) and feels kind, but the relic bar already has HOT STREAK, UNDERDOG,
  FIRST BLOOD and SKELETON KEY as conditional "pays xN". Two more of the same shape (with METRONOME) is one too many.
- **RUST: CUT.** Turtles are not the problem: enemy shields are already worth half (`TUNE.enemyShield` 0.5) and reset
  every enemy turn, so 25% or 50% of the leftover did nothing (11.2 / 11.6 vs 12.3). KEEN at 40/50/60 is the
  anti-shield tool.
- **SNAKE EYES: SHIP at 15.** Readable (their jackpot flash, then your green heal) and it turns the scariest moment
  into a little relief. JOKER likes it most (20.3), because JOKER's fights run long.
- **PIT BOSS: SHIP** as written (legendary, +4.0). In the official MIDAS run it fired in about a quarter of all fights
  (9,892 of 34,872). It's a safety pick for players who fear the Dealer's ALL IN... but note it does not touch ALL IN
  (that's a deal, not a jackpot), which keeps the Dealer's climax intact.
- **TESLA COIL: SHIP at "a bolt above or below your payline charges 5 (once a spin)".** Per-bolt versions were
  +7 to +11: TESLA's strips are mostly bolts, so the off-line cells are almost always bolts. Once a spin also reads
  better: one +5 spark, not a fan of small ones.
- **TAX MAN: SHIP** as pitched (+1 chip per paying gold bar group, max 3). +4.1 for MIDAS. Its chips also fill the vault.

## 4. My own ideas
Gaps I saw: MIDAS has no charm (INGOT was held in round 12 with the LV4 bug); nothing but VAMP heals off a charm;
nothing punishes the enemies that write on you; nothing answers long fights.

| Idea | Rule | Numbers tried | Row | Official | Verdict |
|---|---|---|---|---|---|
| **INGOT** (MIDAS charm, gold bars) | when it lands: +N vault pips | 1/1/2 pips | only 12.8 (MIDAS base0 13.8, only VAMP 24.0) | MIDAS 32.0 / 15.6 (sold at the Cashier) | |
| | | **2/3/4 pips** | **only 22.4** | 39.5 / 20.2 sold; **40.4 / 17.5 draft-only** with the whole list | **SHIP, draft-only** |
| **MEND** (shield charm) | its shield group heals N (once per group) | 15/20/30 | 9.4 | 44.3 / 16.8 | |
| | | 25/35/45 | 11.0 | | |
| | | 30/40/50 | 11.4 | 46.7 / 18.1 (KNIGHT 48.2, +5) | **CUT** |
| **GRUDGE** (common relic) | every cheat written on your reels hits the enemy for N | 10 | 12.2 | | |
| | | 30 | 10.8 | | **CUT** |
| **OVERTIME** (uncommon relic) | from your Nth spin each fight, everything pays xM | 6th, x1.5 | 18.3 | | |
| | | 8th, x1.5 | 14.4 | | |
| | | 6th, x1.25 | 16.4 | | **HOLD** |

- **INGOT: SHIP, MIDAS only, +2 / 3 / 4 vault pips when it lands, and never sold at the Cashier** (drafts only).
  - It fills the MIDAS gap the pitch named and plays like THORNY: you see the pips jump when a gold bar lands.
  - Sold at the Cashier, the bot bought it and broke MIDAS's chip hoard (vault multiplier and chip shield):
    MIDAS WHITE 32.0 with INGOT 1/1/2 in the shop.
  - Diagnosis: a charm that does *nothing*, valued 7, never bought at the Cashier: MIDAS 44.5/18.9. The same charm
    bought: 18.2/7.1. The whole list with the Cashier not selling LUCRE/INGOT to MIDAS: 39.8/17.9.
  - So MIDAS's real enemy is the greedy shop, not the content. See the sim note in section 6.
- **MEND: CUT.** It's VAMP on shields: the same untaxed sustain, so it buys wins without a decision. KNIGHT +5 WHITE.
  It would become the second auto-pick, not a rival to the first.
- **GRUDGE: CUT.** A cheat comes in about 0.8 times a fight; even 30 a cheat moved nothing (10.8). HOLY WATER stays the
  only anti-cheat relic; that's fine.
- **OVERTIME: HOLD.** It answers long fights (BRIAR, JOKER act 3), and 6th spin x1.25 sits in the band (16.4). But
  it's one more "pays xN" relic (see COUNTERWEIGHT). If a "pays xN" slot opens up, pick OVERTIME over COUNTERWEIGHT:
  it has a visible start (the HUD turn count).

## 5. Proposed build list (4 charms, 6 relics)
Common code for every new **charm**: `src/core/config.ts` (`Enh` union, line 44); `src/core/charms.ts`
(`CHARM_VALUE`, `CHARM_SYMBOLS`, `charmRuleText`, `charmShortText`, `charmTag`, `CHARM_COLOR`); `src/core/run.ts`
(`ACT1_GILDS` line 73, and a lock set next to `TESLA_ONLY`/`KNIGHT_ONLY`/`BRIAR_ONLY` read by `gildsFor`);
`src/sim/simulateRun.ts` (`greedyValue` gild table); `src/core/profile.ts` (`ALL_CHARMS` for the collection
sanitizer); the cell overlay in `tools/build-art.mjs` (art agent); tests in a new `tests/content13.test.ts`
(the charm starts at LV1, it fires, the lock holds).
Common code for every new **relic**: `src/core/config.ts` (`RelicId` union, line 100); `src/core/relics.ts`
(`RELICS`, `RELIC_TIER`, numbers in `NEW_RELIC`); `src/sim/simulateRun.ts` (`RELIC_VALUE`); the icon in
`tools/build-art.mjs`. None go in `MIRROR_COPYABLE` (the Mirror never copies them).

### Charms
| # | Charm | Fits / lock | LV1 / LV2 / LV3 (LV4 Ticket) | Card text (short) | Code | Bot | Measured |
|---|---|---|---|---|---|---|---|
| 1 | **LUCRE** | swords, shields, bolts; act 1; every machine | +3 chips when its group pays; max **6 / 9 / 12** a fight (15) | `REEL 1 SWORDS: +3 CHIPS ON A HIT (MAX 6)` (short rule `+3 CHIPS ON A HIT, MAX 6`) | `fight.ts` `resolveGroup` (a paying group with a live LUCRE cell adds 3 to a new `lucreChips`, capped); `run.ts` `finishFight` (~line 970, next to `midasChips`: paid on a win, into `record.chips`); a coin popup on the group (reuse the `midasChips` event look) | 6.5 | only **12.4** (7.6 13.8 26.4 8.2 6.2); alone official 43.8 / 19.3 |
| 2 | **TRICK** | swords, shields; **JOKER only**; act 1 | **+25 / 35 / 50** (60) to the jackpot meter when it lands | `REEL 2 SWORDS: +25 METER WHEN IT LANDS` | generalise `thornyFill` (`fight.ts` 1124) to the `jackpots` meter; `JOKER_ONLY` lock in `run.ts` | 8 | only **11.6** (JOKER baseline 14.5, only VAMP 14.6); alone JOKER **43.5 / 19.8** (today 43.2 / 19.7) |
| 3 | **INGOT** | gold bars; **MIDAS only**; act 1; **draft cards only, never at the Cashier** | **+2 / 3 / 4** (5) gold meter pips when it lands | `REEL 3 GOLD BARS: +2 GOLD METER WHEN IT LANDS` | the same `thornyFill` generalisation for the `vault` meter (`fillMeter` adds a pip per reel entry); `MIDAS_ONLY` lock; filter it out of `shopOffers` `gildOptions` (`run.ts` ~1431) | 7 | only 22.4 when sold (MIDAS base 13.8, only VAMP 24.0); whole list, draft-only: MIDAS **40.4 / 17.5** |
| 4 | **KEEN** (numbers only) | swords | **+40 / 50 / 60** (70) per sword, pierces | `+40 PER SWORD, PIERCES` (text is generated) | `charms.ts` `CHARM_VALUE.keen` | 6.5 | only **11.8** (was 9.9); alone official **45.8 / 18.6** |

### Relics
| # | Relic | Tier / lock | Rule and numbers | Card text | Code | Bot | +relic row |
|---|---|---|---|---|---|---|---|
| 1 | **CHARM BRACELET** | uncommon; offered once you own a charm (`BUILD_ENABLER` `'charm'`) | every paying group x(1 + **0.05** per charm type you own) | `EVERYTHING PAYS +5% FOR EACH CHARM TYPE YOU OWN` | `fight.ts` `score()` multiplier block (next to UNDERDOG, ~line 880): note `X1.15` | 6 | **16.2** (17.2 18.8 14.0 15.7 15.5) |
| 2 | **METRONOME** | common | every **3rd** spin of yours each fight pays **x1.5** | `EVERY 3RD SPIN PAYS X1.5` | a player-spin counter on `Fight`; `score()` block; the relic pops when it fires | 6 | **15.9** (16.7 15.7 14.7 15.2 17.2) |
| 3 | **SNAKE EYES** | common | each enemy jackpot heals you **15** (halved in act 3 like every heal) | `EACH ENEMY JACKPOT HEALS YOU 15` | `fight.ts` `turnBody` after the groups resolve (next to HOT STREAK, ~line 604): enemy side, `score.tier === 'triple'` | 6 | **15.9** (14.3 14.8 13.8 20.3 16.3) |
| 4 | **PIT BOSS** | legendary (`LEGENDARY` + `RELIC_TIER.legendary`) | the enemy's first jackpot each fight pays as a pair (2 symbols x the pair mult). Never ALL IN (a deal, not a jackpot) | `THE ENEMY'S FIRST JACKPOT EACH FIGHT PAYS AS A PAIR` | `score()`, enemy side, when the player holds it; a `PIT BOSS` note on the group | 7.5 | **16.3** (16.7 14.2 12.7 19.2 18.8) |
| 5 | **TESLA COIL** | uncommon; **TESLA** (`machine: 'tesla'`) | if a bolt sits above or below your payline, your lightning charges **5** (once a spin) | `A BOLT ABOVE OR BELOW YOUR PAYLINE CHARGES 5` | `turnBody` after your groups: `gainEnergy(p, 5)`; `NEW_RELIC.coilCharge` | 6.5 | TESLA **13.3** (base 10.2) |
| 6 | **TAX MAN** | uncommon; **MIDAS** (`machine: 'midas'`) | each gold bar group that pays: **+1 chip**, max **3** a fight (into the vault's chips, like the gold bars') | `EACH GOLD BAR GROUP THAT PAYS: +1 CHIP (MAX 3)` | `resolveGroup` goldbar branch (~line 1085), its own cap next to `MIDAS.chipCap` | 6 | MIDAS **17.9** (base 13.8) |

**Cut:** SAGE, ECHO, WEIGHTED, RUST, GRUDGE, MEND. **Held:** COUNTERWEIGHT (x1.25, 14.4) and OVERTIME (6th spin x1.25,
16.4): both work but the relic bar has enough conditional "pays xN" relics.

## 6. Official projection (tuesday 1000, seed 4242)
All ten items in the pools at the numbers and bot values above (`c13_tuesday.ts`, INGOT not sold at the Cashier):

| machine | today WHITE / GREEN | with the list | change | + follow-up knob |
|---|---|---|---|---|
| KNIGHT | 43.1 / 18.6 | 43.2 / 17.9 | +0.1 / -0.7 | |
| TESLA | 47.9 / 16.4 | 47.8 / 16.1 | -0.1 / -0.3 | |
| BRIAR | 50.3 / 19.2 | **52.6** / 19.2 | **+2.3** / 0.0 | mirror 10.5 → **11.5**: 50.3 / 19.4 |
| JOKER | 43.2 / 19.7 | 42.7 / 18.6 | -0.5 / -1.1 | |
| MIDAS | 39.9 / 19.6 | 40.4 / **17.5** | +0.5 / **-2.1** | dealer 0.9 → **0.85**: 40.4 / 18.7 |
| **AVG** | **44.9 / 18.7** | **45.3 / 17.9** | +0.4 / -0.8 | **44.9 / 18.1** |

- With the list alone, WHITE is 0.3 over the gate top (45) and BRIAR moves +2.3 (LUCRE: chips are BRIAR's best
  "charm"). The two knobs bring every machine within ~1.5 of today and both gates in (44.9 / 18.1).
- Rows with the whole list in (GREEN 777, N 600): baseline **13.6** (was 12.3), only VAMP **12.6** (was 16.1).
  **VAMP stops being the auto-pick** once the pool has more charms and relics to compete for its draft slots.
  The "only X" gate stops meaning much at that point (LUCRE 10.0, KEEN 9.2 under the full list): judge by the official table.

### Bugs, risks and sim notes (for the build round)
1. **MIDAS is the fragile machine, and most of it is the bot.**
   - The greedy Cashier spends MIDAS's hoard (it buys anything valued 5+). A 16-chip reserve for MIDAS alone takes
     today's MIDAS from 39.9 / 19.6 to **47.8 / 21.1**.
   - So every new thing MIDAS can buy, or a relic that pulls picks, swings MIDAS WHITE 32–41 depending on the mix
     (whole list with INGOT sold: 32.1). This is why INGOT is draft-only.
   - **Recommend:** a sim-only round like 69b. Give the bot a MIDAS chip reserve, re-baseline, then retune MIDAS's
     BOSS_MUL. Until then, MIDAS numbers for new content are ±4.
2. **Damage charms are taxed and sustain isn't** (`machinePower` counts only damage; `powerElastic` 0.5). It's the
   structural reason behind VAMP's auto-pick and KEEN's trap. The content above works around it. A real fix is its
   own round: count heals in the power measure, or size off damage and sustain.
3. **New identity relics dilute old ones.** One draft card is always "yours". TAX MAN now takes half of those slots
   from KING'S VAULT (MIDAS took TAX MAN in ~60% of runs), and TESLA COIL takes a quarter of TESLA's. That's fine,
   but watch KING'S VAULT's pick rate.
4. The prototype paid LUCRE chips after a *won* fight only (like MIDAS's gold bar chips). Build it the same way: the
   chips show in RESULTS' "+N CHIPS" line, and a lost fight pays nothing.
5. Photosensitivity: nothing here flashes. METRONOME's pop, SNAKE EYES's green heal and TESLA COIL's spark all reuse
   existing relic and energy popups. No new HUD widgets.
