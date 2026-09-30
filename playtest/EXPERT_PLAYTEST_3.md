# Expert playtest 3 (2026-09-29): after the EXPERT_PLAYTEST_2 batch (iterations 31–35)

Build: the frozen build on :4173 (HEAD c5f2e4d), plus headless sims. No `src/` edits.

**How I played**
- **Browser** (driven with `game.update(1/60)`, since the pane doesn't paint on its own; all times are game time at 2X):
  - KNIGHT RED, seed 777: played for real, died at act 1 fight 5 (a Frost Imp).
  - KNIGHT GREEN, seed 31: played for real, died at the House.
  - KNIGHT GREEN, seed 99: forced through act 1 and act 2 regular fights. The Mirror (won with 41 HP left) and all of act 3 were played for real. Died to a FERAL CARD SHARP at fight 17 of 18.
  - JAX GREEN, seed 5: forced. A CURSED MIMIC one-shot me on act 2 fight 1.
  - TESLA GREEN, seed 7: forced to the Dealer, then watched the Dealer frame by frame (cards, marks, two ALL INs, HOUSE RULES). Lost.
  - Also: a bonus wheel, a relic rush, three big choices, about eight Cashiers with rerolls, and the run-over screen with 5 and with 17 rows.
- **Headless:**
  - `gate.sh 600 exp3`, and the `expert2_*` harnesses re-run.
  - New throwaway harnesses in `tools/balance/`:

    | harness | what it measures |
    |---|---|
    | `expert3_status.ts` | frozen or locked spins per enemy |
    | `expert3_spikes.ts` | single enemy turns of 40% or more of your max HP, per archetype |
    | `expert3_heals.ts` | act 3 healing by source |
    | `expert3_act3heal.ts` | a probe: act 3 WITHOUT the full heal at act start |

**Official table (gate 600, GREEN = stake 2):**

| | WHITE | GREEN | Dealer | HP into the Dealer |
|---|---|---|---|---|
| KNIGHT | 38.7 | 11.5 | 54.3 | 74.8 |
| TESLA | 36.8 | 9.7 | 50.9 | 93.9 |
| BRIAR | 34.8 | 11.5 | 49.6 | 91.3 |
| JAX | 36.5 | 11.8 | 53.8 | 92.7 |
| **AVG** | **36.7** | **11.1** | **52.2** | **88.2** |

---

## A. Verification of the batch

| Change | Verdict | Evidence |
|---|---|---|
| **Mirror turn cap + countdown + "UP TO"** | **Works.** | Live, the reflection landed for exactly 216 = 60% of 360. Sim: biggest turn p50 51% / p90 56%, and only 3% of losses include a turn of 60% or more (was 69%). It felt like a real climax: I won on 41 HP. Remaining issues: the preview text contradicts itself, and "UP TO" is ~5 px (B7). |
| **Act 1 pacing (0.7x HP, ability every 3, 1.5x quiet turns)** | **Better, not at target.** | Median turns: act 1 12–17 (was 15–22), the House 25 (was 67–68). Live act 1 fights took 36–90 s at 2X; a typical one is about 60 s. That's still 6–8 player spins against the 4–6 target. The House fix is the big win: 25 turns with a real pot. |
| **Pivot offers + reroll variety** | **Works.** | Drafts showing a new charm type: **16–26%** (was 6–9%). Cashier shelves with a new type: 41–64%. Rerolls: 0% identical items, 1% unchanged layout, 20–28% same category. Live, rerolls felt real. KNIGHT still sees 58% same-type charm cards, because the pool has only four types. |
| **Act 1 catch-up card** | **Half works.** | It fired after a 39% loss, but offered HEAL 110 when only 57 HP was missing (the 20% patch-up applies first). It **never fires on relic drafts** (after fights 2 and 4, where 56–66% losses to ELITE BRUTEs happened in both my KNIGHT runs). By design (`isRelicDraft`), but that is where it's needed (B5). |
| **Chips (start 8, overkill cap)** | **Works.** | Chips on hand stay scarce all run: p50 3–14 in act 1, 4–18 in act 2, 5–20 in act 3 (was 148 at the Dealer). Every Cashier was a real decision. New issue: late shelves go **thin** (2–3 items), so 16 chips can have nothing to buy before the Dealer (B6). |
| **Death recap** | **Wrong on the bosses.** | It's on screen and readable with 5 rows. But it **drops the House's POT skims and the Dealer's ALL IN** (B1). It also overflows with 17 rows (B3). |
| **Act 2 sized to power** | **Partly works.** | The JAX/BRIAR split is still 4x: JAX act 2 regular fights 5–9 turns, BRIAR 21–31 (BRIAR Mirror 66). |
| **The House (threat, not HP)** | **Works.** | 25 turns (p90 43). The pot is 39% of its damage. It still kills 19% of runs (the #2 death spot). |
| **Act 3 attrition + halved heals** | **Didn't move HP into the Dealer** (88%). | See C3: the metric is mostly survivor bias. |
| **The Dealer rework** | **Readable, not yet exciting.** | See below. |
| **WAR DRUM on the sword numbers** | **Works.** | Visible on the payline numbers. |
| **BULWARK** | **Works.** | It shows as "50%" on the reel table. It was offered and I bought it twice, and it felt like a KNIGHT-y build path. |

**The Dealer, watched frame by frame (TESLA, 187 HP vs 7,170):**
- **Good:**
  - The deal box ("NEXT DEAL IN 3 · A CARD / RAISE / ALL IN") is a clear, constant telegraph.
  - The JOKER card stays pinned over the spinning reel, with the caption "JOKER: THIS CELL IS WILD". That's the "writes on your machine" hook at boss scale.
  - "ALL IN NEXT TURN!" is a big banner, with "ALL IN!" over its machine.
  - "MARKS ON YOU: N" counts up.
  - The felt reads as a green frame.
- **Not good:**
  1. **ALL IN underwhelms.** The two ALL INs hit for 50 (30 through the shield) and 80 (60 through), i.e. 16% and 32% of max HP. The kill came from an **un-telegraphed 167 hit (89% of max HP)** on a RAISE plus HOUSE RULES turn.
     - Sim: the Dealer's biggest turn p90 is 80%, and **36% of Dealer losses include one turn of 60% or more**. The Mirror's one-turn rule doesn't apply here (ALL IN is capped at 45%, but RAISE doubles it to 90%).
  2. **Two card concepts share one look.** The Dealer's MARKS (a playing-card symbol written into your strips, which hurt you) and its LINE CARDS (ACE/JOKER/DEUCE, which mostly help) both look like a white playing card. By turn 12 my payline read card/card/card, and I couldn't tell good from bad at a glance.
  3. **60% of line cards are gifts** at normal rules (ACE 35% + JOKER 25%). The boss "doing something to you" mostly helps you until HOUSE RULES.
  4. **The line card is a ~12 px corner badge**, not a card "flipping onto your payline".
  5. **"MARKS ON YOU: 4" is tiny.** It sits under the deal box against the NEW RUN button, not on the Dealer's panel.
  6. **Choke.** Marks (up to 4 per reel by turn 12) plus rocks made my payline rock/rock/rock and card/card/card. Most of the Dealer fight my own machine was a dud, which is a stun-lock more than a duel.

---

## B. Bugs (with steps)

1. **The death recap omits boss signature damage.** `game.ts noteHurt()` ignores the `potWin` and `allInHit` events. Marked hits show as "MARKED CARDS", not the Dealer's mark.
   - **House steps:** KNIGHT GREEN, seed 31, lose to the House. The recap says "SPIN HITS 128", but I lost 251. The missing ~120 came from pot skims of 10/50/70/100/100.
   - **Dealer steps:** TESLA GREEN, seed 7, lose to the Dealer. The recap says "SPIN HITS 387, MARKED CARDS 121". Two ALL IN hits (30 + 60 HP) are missing.
   - **Also:** the values aren't clamped to HP lost. A Frost Imp showed "SPIN HITS 160" when I had 140 HP.
   - **Fix (S):**
     - add `potWin` → "THE POT" and `allInHit` → "ALL IN";
     - label `markedHit` "THE DEALER'S MARK" or "THE SHARP'S MARK";
     - clamp each value to the HP actually lost;
     - add a status line when you were frozen or locked, e.g. "FROZEN 11 OF 12 SPINS".
2. **YOUR REELS panel overflows.** Once a reel has 5 or more distinct rows (charms, rocks, cards), the rows and the "LV" line spill past the panel border.
   - **Where it collides:** the MENU button on the run-over screen, the draft and big-choice screens, and the in-fight left panel (8 rows on TESLA).
   - **Steps:** KNIGHT seed 99 after the House; TESLA seed 7 at the Dealer.
   - **Fix:** a scrolling or 2-column layout, or merge charms into one line per symbol.
3. **The run-over screen with 17 rows** (KNIGHT GREEN, seed 99, die in act 3):
   - rows squash, and the ACT 2 / ACT 3 divider lines cut through the text;
   - "KILLED BY: SPIN HITS 251, MARKED ..." is cut off at the panel edge (the most important line on the screen);
   - the "ACT 1" tag overlaps the column edge.
4. **Text overflows its box:**
   - "BLOCK 20/40" runs past the right edge of the player panel, and "BLOCK 10" past the Mirror's panel;
   - the elite line "ELITE: +15% HP, 1 OF 2 RELICS, +2 CHIPS" touches the path card's right border;
   - the 12th relic icon overlaps the HP heart and bar on the draft/choice bottom panel (KNIGHT seed 99, act 3);
   - floating captions collide: "MARKED X2: THEY BITE ON YOUR PAYLINE" is drawn under "ALL IN! -60", over the left panel.
5. **Catch-up card:**
   - skipped on relic drafts (fights 2 and 4, the costly elite fights);
   - its heal isn't sized to missing HP (HEAL 110 when 57 was missing, since the 20% patch-up runs first).
   - **Steps:** KNIGHT RED seed 777, win fight 1 at 183/300 (card shown); win the ELITE BRUTE at 75/300 (no card).
6. **Shop:**
   - **Slot 2 can be the same charm type as slot 1** when slot 1 is a LEVEL card (`shopOffers`: `firstEnh` only looks at `gild`). Seen: "VAMP LVL" plus "3 VAMP CHARMS".
   - **Late shelves go thin:** "SKELETON KEY / REMOVE" (2 items) at act 2 depth 5; "OVERCHARGE 20 / REMOVE / REMOVE / HEAL" before the Dealer with 16 chips. The top-up runs dry when `gildOptions` is empty; add levels, max HP or a second relic.
7. **Mirror preview:** "COPIES YOUR MACHINE (NO RELICS, …)" sits on the same card as "COPIES YOUR PHOENIX FEATHER" (GREEN). The rules text still touches the bottom border.
8. **Minor:**
   - the level cards on the Cashier (e.g. "KEEN LVL 2") use a smaller font than the charm cards;
   - `dbg.vs('dealer')`'s defeat screen says "SLIME KING" (dev only);
   - the House rules paragraph on its preview is still about 5 px (carried over from report 2).

---

## C. What feels off now (prioritized)

### C1. Lockouts replaced one-shots as the anti-fun (most important)
In a watch-only game, the worst feeling is watching your machine not play.

**The Frost Imp:** **71% of your spins in act 1 Frost Imp fights have a frozen reel. In 86% of those fights, half or more of your spins are frozen** (act 2: 74% / 86%). The Gremlin's locks: 44–54%.
- My KNIGHT RED run died to one: frozen **11 of 12 spins**, stuck on sword/shield/rock.
- Cause: the every-3 ability floor (iteration 33) stacks on top of ice pairs and triples. Freezes chain.

**The Card Sharp and the Dealer choke by marks:**
- My act 3 Card Sharp fight: my damage per spin went 1224, 660, 544, then ~20–30 for ten spins, while the marks bit me for 172. It was the longest fight of the run (29 turns).
- The Card Sharp loses you 13.6% of act 3 fights, the worst act 3 regular.
- The Dealer did the same (see A).

**The hook "enemies write on your machine" is great when the writing is a threat you answer between fights.** It's miserable when it's a stun-lock you watch.

**Rules to adopt:**
- **Thaw immunity:** a reel that just thawed can't be frozen or locked on the next enemy turn. Aim for ≤ 40% stuck spins against the Frost Imp.
- **Writes are capped and decay:**
  - max 2 marks per reel;
  - the oldest crumbles when a 3rd lands;
  - marked cells show a countdown, like FAKE.

### C2. Single-turn spikes from regular enemies and boss combos
Per regular archetype (`expert3_spikes.ts`):

| enemy | fights lost | fights with a turn ≥ 40% max HP | ≥ 60% | losses that include a ≥ 40% turn |
|---|---|---|---|---|
| act 2 **Mimic** | 19% | 45% | 13% | 76% |
| act 3 Pit Boss | 3% | 18% | | 67% |
| other regulars | 0–8.5% | | | |

- **The Mimic:** its COPYCAT is capped at an absolute 120 (`12*UNIT`), not a share of your HP. JAX (220 max HP) died on turn 2 to a single 210 hit.
- **The Dealer:** RAISE doubles ALL IN past its 45% cap. 36% of Dealer losses include one turn of 60% or more.

**One rule for the game:** no enemy turn deals more than 40% of your max HP from a regular enemy, or 60% from a boss (reflection, ALL IN, RAISE and the pot included). The Mirror proved the rule works: its losses with a 60%+ turn went from 69% to 3%, and it's still the hardest boss.

### C3. "HP into the Dealer 88%" is the wrong target, and here's the lever that matters
- **Probe (`expert3_act3heal.ts`, N 500):** removing act 3's full heal barely moves the metric.
  - Entering act 3 with only half the Mirror's damage healed: 88.5 → 88.1.
  - A quarter healed: 86.7.
  - GREEN win rates are unchanged.
- **Why:** act 3 regular fights are **bimodal**.
  - 53% of fights you take no net damage (p50 HP lost 0%). The p90 is 49%, and 5.7% of fights kill you.
  - About 30% of act 3 entrants die before the Dealer, so the survivors who reach it are, by selection, the ones act 3 couldn't touch.
  - In-fight healing is not the sink either: KNIGHT's vamp heals only 7% of max HP per fight.
- **So:** more attrition converts into act 3 deaths, not into a 70% arrival.
- **The better lever is to grade the damage.** Make act 3 hurt a little every fight instead of nothing or everything:
  1. **The C2 cap** (40% per regular turn) removes the kill-shots.
  2. **Act 3 regulars open with their ability on their first turn.** Today it never fires in 38% of act 3 fights (KNIGHT 59%).
  3. **A graded "cover charge":** each act 3 regular's first attack can't be fully blocked (at least 10% of your max HP goes through). It's small and legible ("THE HOUSE TAKES ITS CUT: -18").
- **New gate metrics:**
  - act 3 HP lost p50 ≥ 10% (0% today);
  - act 3 deaths ≤ 4% per fight (5.7% today);
  - HP into the Dealer p25 ≤ 70%, measured on ALL act 3 entrants with the dead counted as 0.
- **Keep the act 3 full heal:** it isn't the problem, and it makes the Mirror → act 3 transition feel good.

### C4. The Dealer is readable but not yet a finale (see A)
**Fixes:**
- **One-turn cap:** RAISE can't push ALL IN past 60%.
- **ALL IN shows a number:** "ALL IN · UP TO 84" (its cap) in the banner and over its machine.
- **Tilt the line cards against you:** ACE 25 / JOKER 20 / DEUCE 55. A DEUCE always lands on your best-paying reel; ACE and JOKER land at random. The card then reads "the Dealer is aiming at me".
- **Split the visuals:** marks become a **red card BACK** (the Dealer's), and line cards are **face-up, gold-rimmed and full-cell-size**, flipping onto the cell.
- **Move "MARKS ON YOU"** into the Dealer's panel, at readable size.

### C5. Readability at 800×450
- **Load-bearing text at ~5 px:**
  - the deal-box sublines ("ITS NEXT HIT X2 / YOUR NEXT WIN X2");
  - "UP TO" on the Mirror;
  - the House rules;
  - "MARKS ON YOU";
  - the level-card text.
- **Guideline:** anything that explains a boss rule must be at least 2x the smallest size.

### C6. Machine spread in pacing (still)
- BRIAR: act 2 regular fights 21–31 turns, the Mirror 66 turns (about 5 min at 2X). JAX: 5–9 turns.
- Act 2 power sizing uses `sizingPower('mirror')`, which clearly under-reads BRIAR's reactive thorns.

### C7. Bosses are still the run
- Deaths: 19% at the House, 22% at the Mirror, 10% at the Dealer, so **51% of all deaths are at 3 fights**.
- Healthy for a roguelike's shape. But C1–C2 make most of the other deaths feel unfair, not earned.

---

## D. Readiness calls

### Endless mode: **YES**, built after items E1–E6
**Why yes:**
- It's post-Dealer content, so it can't destabilize the core balance (only ~11% of GREEN runs see it).
- The sizing-to-power machinery (`sizingPower`, BOSS_MUL) and the log-length lightning storm already exist.
- It answers the long-tail pull (report 2, A5) better than a meta drip would.

**Why after E1–E6:** endless amplifies lockouts and spikes. Fix those first.

**Buildable design:**
- **Entry:** after beating the Dealer (GREEN+), the win screen offers **CASH OUT** (records the win, as today) or **LET IT RIDE**.
  - LET IT RIDE records the win first, then continues. There's no way to lose the win.
- **A loop = 3 regular fights + 1 boss:**
  - regulars are drawn from all acts' archetypes;
  - the boss cycles THE HOUSE → THE MIRROR → THE DEALER, each with +1 house edge;
  - a Cashier after fight 2, and a big choice after the boss.
  - Loops are numbered: "LOOP 1", "LOOP 2" and so on.
- **Scaling:**
  - enemy HP = the act 3 formula × **1.35^loop**;
  - enemy damage × **1.12^loop**;
  - the C2 caps (40% / 60%) stay, so death comes from attrition, not one-shots.
- **HOUSE EDGE (agency between fights):** after each loop's boss, pick 1 of 2 edges. Each edge also pays a reward (+6 chips or a legendary pick). Edges stack for the rest of the run:
  - abilities every 2 turns;
  - +1 writer symbol per enemy reel;
  - heals halved;
  - bosses start with a 20% shield;
  - no heal after fights;
  - enemies spin first.
- **Anti-stall:**
  - after enemy turn 40, **LAST CALL**: enemy damage +10% per turn, with a banner;
  - a fight hard-caps at 80 turns (the enemy wins).
- **Number safety:**
  - a saturating formatter (12.4K, 3.1M, 1.2B);
  - damage and HP clamped at 1e12;
  - multipliers computed in floats, then rounded to UNIT;
  - add a test for 10 loops at the p99 JAX build.
- **Records:**
  - a new ENDLESS hiscore table: loops cleared, then damage dealt;
  - stored as a new field inside `slotvslot.profile.v1` (sanitized; don't rename the key);
  - the collection counts "LOOP 3 reached" per machine.
- **Deliberately not in v1:** extra reels or paylines. The owner's "more paylines in endless" idea is a v2 "EXPANSION" big choice at loop 3, only once v1 is measured.
- **Sim gate:** among Dealer winners, the median loop reached is 2–3, and p90 ≤ 6 per machine.
- **Effort:** M–L.

### MIDAS rework (gold = economy): **NO**, not yet
- The chip economy was just rebuilt, and it works: chips are scarce and every Cashier is a choice. An economy machine rewrites that balance before it has been played.
- The shop has **no deep chip sinks yet**: thin late shelves (B6), no rising reroll price, no chip-priced services. A money machine with nothing worth buying is a dead machine.
- **Prerequisites:**
  - E7: shelves always 4 real items, reroll cost rising +1 per reroll;
  - two or more chip-sink services, e.g. "CHARM A CELL OF YOUR CHOICE" and "LEVEL UP (any)".
- **The design when ready (1 paragraph):**
  - GOLD BAR symbols on the payline pay chips mid-fight: +1 per bar, +3 on a jackpot.
  - His meter, **INTEREST**, fills per chip held (max 10).
  - When full, his next paying group is multiplied by (1 + chips/10), capped at x4, and he spends nothing.
  - The Cashier gives him a 20% discount.
  - So the build is "hoard for power vs. spend for power". That's a real Balatro-style tension, and it's different from the other four.

### New slot machines: **NO**, not this loop
- **The existing four still spread 4x in act 2 pacing:** BRIAR's 66-turn Mirror, JAX's 5-turn fights.
- **Each new machine multiplies the tuning matrix:** BOSS_MUL × 3 bosses, relic fits, and offer pools. KNIGHT's pool (4 charm types) still caps offer variety at 58% same-type.
- **Better return:** one new charm or relic per existing machine, plus the E-list fixes. Revisit machines once the gate shows BRIAR and JAX within 1.5x of each other on act 2 turns.

---

## E. Prioritized change list (smallest, highest impact first)

| # | Change | Effort | Expected impact |
|---|---|---|---|
| E1 | **Death recap correctness:** add `potWin` ("THE POT") and `allInHit` ("ALL IN"); "THE DEALER'S MARK"; clamp to HP lost; add a "FROZEN n OF m SPINS" line | S | Every boss loss explains itself (today the House and Dealer recaps omit their signature damage) |
| E2 | **One-turn caps:** regular enemies ≤ 40% of your max HP per turn (Mimic!), bosses ≤ 60% (RAISE × ALL IN, HOUSE RULES) | S | Mimic loss rate 19% → ~7%; Dealer losses with a 60%+ turn 36% → <5%; no more turn-2 one-shots |
| E3 | **Thaw immunity:** a reel that just thawed can't be frozen or locked on the next enemy turn | S | Frost Imp stuck spins 71% → ~40%; Gremlin 50% → ~30%; the most-met act 1 enemy stops being a stun-lock |
| E4 | **Marks cap and decay:** max 2 per reel; the oldest crumbles; a countdown on marked cells | S–M | Card Sharp and Dealer fights stay duels; Card Sharp act 3 loss 13.6% → ~6% |
| E5 | **UI overflow pass:** YOUR REELS panel (B2), run-over with 17 rows and KILLED BY (B3), BLOCK labels, relic row vs HP, caption collisions, elite text edge | S | Removes the most visible polish bugs on every late-run screen |
| E6 | **Catch-up on relic drafts too;** heal = max(35%, missing HP after the patch-up) | S | Hits the fights that cause the costly elite losses at fights 2 and 4 |
| E7 | **Shop:** slot-2 rule also when slot 1 is a level card; always 4 real items (top up with levels, max HP, a 2nd relic); reroll price +1 per reroll | S | Late chips mean something; groundwork for a MIDAS economy |
| E8 | **Dealer finale pass:** ALL IN shows "UP TO N"; line cards ACE 25 / JOKER 20 / DEUCE 55 with the DEUCE on your best reel; red-back marks vs face-up gold line cards at full cell size; MARKS ON YOU in its panel | M | The Dealer reads as aiming at you; the spike is telegraphed with a number |
| E9 | **Graded act 3:** ability on turn 1; first attack's 10% can't be blocked; new gate metrics (C3) | M | Act 3 HP lost p50 0% → 10%+, deaths ≤ 4% per fight; HP into the Dealer (all entrants) ~70% |
| E10 | **Readability floor:** boss-rule text ≥ 2x the minimum size (House rules → the pot box; the deal box; "UP TO") | S | Boss rules become learnable in one run |
| E11 | **BRIAR sizing:** its own act 2 power measure (thorns count), Mirror HP down for thorn | M | BRIAR act 2 21–31 → ~13–17 turns; the Mirror 66 → ~25 turns |
| E12 | **Endless mode** (design in D) | M–L | Long-tail pull for winners |

**Suggested batches:**
- **E1–E7:** all S. One pass, then gate with `tuesday.ts` plus `expert3_status.ts` and `expert3_spikes.ts`.
- **Then E8 + E9 + E10** together: the finale and act 3 interact.
- **Then E11, then E12** (endless).

**Tests:** not run (a playtest-only session). No `src/` changes.
