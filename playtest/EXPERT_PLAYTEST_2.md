# Expert playtest 2 (2026-09-29): what's missing after the rework

Build: the frozen playtest build on :4173 (commit 6c8301e), plus headless sims. No `src/` edits.

**How I played**
- **Browser:**
  - A full KNIGHT WHITE run (seed 123) to the Mirror, which I lost.
  - A TESLA GREEN run (seed 99) to the Dealer, which I also lost.
  - I watched the House, the Mirror, the Dealer, a bonus wheel, the Cashier and rerolls, the big choice, and several act 2 and act 3 fights with no forcing.
  - Presentation time was measured in game time at the default 2X speed, driving `game.update(1/60)` because the pane doesn't paint on its own.
- **Headless (new throwaway harnesses in `tools/balance/`):**
  - `expert2.ts`: pacing per act and depth, bimodality, and boss win by power quartile.
  - `expert2_offers.ts`: charm fit in drafts and at the Cashier, plus reroll overlap.
  - `expert2_bosses.ts`: where boss damage comes from, and the biggest single turn.
  - `expert2_ability.ts`: whether regular enemies get to use their ability.
  - `expert2_chips.ts`: chips on hand by depth.
  - `expert2_duds.ts`: the share of small player spins.
  - All use the greedy policy, N 200–300 per machine, at GREEN unless noted.
- **Official table** (`tuesday.ts 500`), which matches Iteration 30:

  | | WHITE | GREEN | Dealer | HP into the Dealer | Act 1 cleared | House win (if reached) |
  |---|---|---|---|---|---|---|
  | Result | 29.2 | 12.4 | 55.1 | 89–99% | 45–56% | 57% (KNIGHT) to 96% (JAX) |

- `npm test`: 170/170 green.

A note on the "turns" figures: a turn in these tables is one side's spin, so player spins ≈ turns / 2. One turn takes about **4.7 s at 2X in acts 1–2 and about 6.8 s in act 3**, where storms and big pay math make each turn longer. At 1X, double all of these.

---

## A. What's missing (most important first)

### A1. The tension curve is upside down: slow and deadly early, safe and quick late, with every drama packed into three boss fights
- **Act 1 regular fights:**
  - They last a median of 15–22 turns (p90 33–39), which is 70–105 s each at 2X and 2.5–3.5 min at 1X.
  - You lose a median of 20% of your HP per fight (p90 67%).
  - **Half of all runs die in act 1** (act 1 cleared: 45–56%), mostly at fights 2–3 (about 10% of runs each), after only one or two picks.
- **The House is a war of attrition:**
  - It lasts a median of 67 turns (p90 134): about 5.5 min at 2X, or 11 min at 1X.
  - By machine: KNIGHT 75 turns, BRIAR 107, TESLA 25, JAX 69.
  - The biggest single hit it lands is a median of 31% of your HP. My TESLA House took 163 s of game time, and my HP never dropped below 64%.
- **Acts 2 and 3 regular fights:**
  - Most end with **no net HP lost**: 57% of act 2 fights and 75% of act 3 fights. You do take damage (only 10% and 18% take none at all), but payoff heals, vamp and relics erase it.
  - You arrive at the Dealer with 89–99% of your HP.
  - **The enemy's ability never fires in 31% of act 2 fights (JAX: 66%) and 40% of act 3 fights (KNIGHT: 72%).** The game's unique hook, enemies writing on your machine, is skipped in exactly the fights that should show it off.
- **Deaths:** of all runs, 22% die at the House, 16% at the Mirror and 10% at the Dealer. Only about 7% die in act 2–3 regular fights combined.
- **Push-back on "late game is too fast":** in seconds it isn't. My act 3 TESLA fights took 35–260 s, and a turn there is about 45% longer than in act 1. What feels "too fast" is that **nothing is at stake**. JAX (5 turns in act 2) and KNIGHT (7 in act 3) are the machines that really are quick. The fix is pressure, not length (see B and D).

### A2. Your picks don't feel like they add up to a build
The owner says "fitted"; I'd go further. The build space collapses after the first charm, and each individual pick is small:
- **Drafts:**
  - After you own a charm, 86% of charm or charm-level cards in drafts are the type you already have. **Only 7% of drafts show a charm type you don't own** (8% for TESLA and JAX; see C).
  - A draft card changes 2 cells out of 36. About 40% of draft cards are strip tweaks, such as "2 SWORDS TO SHIELDS", which KNIGHT would never want.
- **Choices that don't move the needle:** the builds.ts probe (STATE, Iteration 27) already showed that every big choice lands within noise. Late HP scales with your measured power^0.5, so power picks get partly absorbed.
- **But being strong does pay off at the bosses:**
  - Mirror win by power quartile: 48 / 48 / 69 / 83%.
  - Dealer win by power quartile: 43 / 48 / 63 / 70%.
- **So the problem is legibility and texture, not the maths.** You rarely face a real fork like "gold or keen?", and the payoff for going deep shows up as regular fights getting shorter, not as a fantasy you can see.
- **Genre comparison:** Balatro keeps you choosing between archetypes all run (joker shop variety, packs and tags). Slay the Spire's card rewards always include off-archetype cards, so a pivot is always on the table.

### A3. Bosses aren't readable rule-sets you can plan around
The House, the Mirror and the Dealer should be the run's set pieces. Today:
- **The Mirror:**
  - Decided by one or two spike turns. Its biggest single turn is a median of **64% of your max HP (p90 90%)**, and **69% of Mirror losses include one enemy turn of 60% or more**.
  - The on-screen telegraph misreports both the size and the timing (see E and F1).
- **The Dealer:**
  - **59% of the damage it does to you is your own marked cards** biting on your spin (the Card Sharp's "the deck remembers" plus marks placed during the fight). Only 41% comes from the Dealer attacking.
  - Its signature DEALS are invisible in effect. SHUFFLE re-randomises a device that's already random, CUT removes one cell, and RAISE is symmetric.
  - The Dealer should be the final boss, but the thing that kills you looks like self-harm, and its own cards look like decoration.

### A4. The chip economy is broken at both ends, so the Cashier stops being a decision
- **First Cashier:** you have a median of 4–9 chips, but charms cost 10 and levels and relics 12. You usually can't buy the one thing you want. My KNIGHT had 9 chips facing a 10-chip gold charm, and after rerolling, 8 chips facing four 10–12 items.
- **Act 3:** chips explode through overkill (+1 chip per 50 overkill; my Gremlin fight was a 3,924 hit into 689 HP). Median chips on hand by fight:

  | act 3 fight | 1 | 3 | 5 (the Dealer) |
  |---|---|---|---|
  | chips on hand (median) | 15 | 46 | 148 |

  At the Dealer the p90 is 760. My KNIGHT reached the Mirror with 97 chips.
- **Result:** late shelves are "buy everything", rerolls are effectively free, and the hoard only counts as a capped +40 shield at the Mirror and the Dealer. Balatro's economy works because money stays scarce relative to what's offered (interest capped at $5, rerolls rising).

### A5. There's no reason to play the next run differently: thin meta progression
- **Today's unlocks:** four machines and the stake ladder. There's no content drip (new charms, relics, events or enemies unlocking as you play) and no run modifiers.
- **Genre comparison:** Balatro and Slay the Spire both grow the pool with play, which creates "I want to try the new thing" pull. Luck be a Landlord does it with symbol unlocks.
- **Priority:** lower than A1–A4, but it's the long-tail fun problem.

**What's not missing:** moment-to-moment slot juice. The slow reel 3 near-miss, the pay math (`94 × 18 = 1692`), the meters, the wheel and the rush all land. The spin is fun; the run shape around it is the problem.

---

## B. Pacing

**Numbers** (GREEN, all four machines; turns p10 / p50 / p90):

| act.fight | turns | 1st hit, % of enemy HP | damage per spin, % of enemy HP | fights lasting ≥ 20 turns |
|---|---|---|---|---|
| 1.1 | 7 / 15 / 26 | 12 | 14 | 31% |
| 1.3 | 11 / 22 / 39 | 8 | 9.5 | 60% |
| 1.5 the House | 21 / 68 / 130 | 2.4 | 3.5 | 91% |
| 2.1–2.5 | 3 / 11–15 / 26–36 | 17–22 | 21–27 | 20–35% |
| 2.6 the Mirror | 7 / 16 / 93 | 10 | 11 | 39% |
| 3.1–3.5 | 2–5 / 10–11 / 19–26 | 14–19 | 22–28 | 9–19% |
| 3.6 the Dealer | 15 / 41 / 92 | 7 | 5.5 | 82% |

Median turns by machine:

| machine | act 1 | the House | act 2 | the Mirror | act 3 | the Dealer |
|---|---|---|---|---|---|---|
| KNIGHT | 15–17 | 77 | 9–13 | 10 | 7 | 25 |
| TESLA | 14–20 | 25 | 13–21 | 16 | 9–11 | 25 |
| BRIAR | 19–29 | 107 | 18–26 | 80 | 9–12 | 57 |
| JAX | 17–23 | 75 | 3–5 | 13 | 13–15 | 59 |

**Why:**
- Act 1 and act 2 regular HP is a **fixed curve**: `DEPTH_HP` 220–390 and `DEPTH_HP_2` 520–970 (both ×1.05). Your damage, however, grows multiplicatively: gold adds (x2+x2+x2), then multiplies by the jackpot x3, then by levels.
  - Act 1 is a bare machine against a flat curve, so it's long.
  - Act 2 is x18 builds against a curve that's only about 2.5x higher, so it's short, and bimodal by machine.
- The House's length is a tuning artefact: BOSS_MUL house (6 for KNIGHT, 4.2 for BRIAR, 5 for JAX) buys the target win rate with HP instead of threat.
- **Real time:** act 1 plus the House is about 12–14 min at 2X. Acts 2 and 3 together are about the same. The first 40% of the run holds 60% of the grind.

**Proposal (targets per regular fight, in player spins):** act 1 4–6, act 2 5–7, act 3 5–7; the House 10–14, the Mirror 8–10, the Dealer 12–16.

**Levers:**
1. **Act 1 shorter (S):**
   - `DEPTH_HP` about 0.7x, and the opener ×0.85 stays.
   - Raise enemy damage to keep act 1 deaths about equal. Make them snappier, not safer: the ability every 3 turns, not 4.
2. **The House gets threat, not HP (M):**
   - Cut BOSS_MUL house to about 2 for everyone.
   - Get difficulty from the pot instead: the skim every 3 turns, and a jackpot doubles the pot.
   - Per-machine balance goes in the pot rate, not HP.
3. **Act 2 regulars sized like act 3 (S–M):**
   - Use `sizingPower`-based HP for act 2 regulars too, with a floor at the curve and elasticity about 0.6.
   - This removes the JAX 3–5 turn versus BRIAR 18–26 turn split.
4. **An ability-cadence floor (S):** every regular enemy uses its ability on its first turn in acts 2–3, or turn 2 at the latest. Fights end quickly there, so let the hook fire early.
5. **A small-spin fast path (S):**
   - Measured with `expert2_duds.ts`: **48% of act 1 player spins deal 10 HP or less** (29% in act 2, 22% in act 3), though almost no spin is fully empty, because shields, meters and so on still happen.
   - For a spin whose result is small (≤ 1 enemy-HP pip, no ability, no meter payoff), present the pay as a quick inline tick: no BASE × MULT banner and a shorter stagger. Aim for about 2 s instead of about 4.7 s at 2X.
   - Keep the full banner for pairs above a threshold and for every jackpot, so the big moments stand out more.
   - This cuts act 1 wall time about 25% without touching balance.
6. **A pacing target in the sim (S):** add `turns p50/p90` per act to `tuesday.ts` as a gate next to win%.

---

## C. Offer variety

**Where the weighting lives** (`src/core/run.ts`):
- **Drafts:**
  - `draftOffers.gildCard` offers "more of a charm you own" **50%** of the time.
  - Otherwise it picks the machine's favoured charm 50% of the time, then random.
  - The first card is a `levelCard` 35% of the time, and `levelOptions` only offers charm levels for charms you own.
  - The second card is a strip card (wild or swap) about 65% of the time before a charm can appear.
- **The Cashier:**
  - `shopOffers` slot 1 is 50% level or else `extend`, which means owned or favoured charms only.
  - Slot 2 picks from **every charm option**, and gold has about 2x the options (it fits swords, shields and bolts on three reels).
  - The top-up also comes from `gildOptions`.
  - The slot layout is fixed: level/charm, charm, relic, utility.
  - From act 2 on, the relic slot is always a legendary from a small pool.

**Numbers** (expert2_offers.ts, N 300 per machine, GREEN):

| machine | charm cards in drafts matching an owned type | drafts showing any new charm type | Cashier charm cards matching an owned type | shelves with any new type |
|---|---|---|---|---|
| KNIGHT | 86% | **7%** | 80% | 31% |
| TESLA | 83% | 9% | 59% | 60% |
| BRIAR | 88% | 6% | 78% | 29% |
| JAX | 86% | 8% | 79% | 32% |

Rerolls:
- **Items identical to the pre-reroll shelf:** 23–29%.
- **Same category** (e.g. charm:gold, same relic): 35–45% (40–53% in acts 2–3).
- **Slot layout unchanged:** 24–34%.
- **The relic slot shows the same relic:** 20–26%.

**Examples from play:**
- After one gold draft pick, the next Cashier offered "3 GOLD CHARMS reel 2" and, after a reroll, "GOLD LVL 2". The "3 VAMP CHARMS reel 3" item survived the reroll unchanged.
- The next shelf was gold, gold, relic and a wild swap.
- KNIGHT only ever sees three charm types (gold, keen, vamp): lucky is barred and charged/blaze are TESLA-only. A "new type" can only ever be one of two.

**Pushing back on "a looser spread" alone:**
- KNIGHT's pool is the real limit. With three charms, even uniform offers repeat.
- The fix is **more distinct things to be offered, and offers shaped like choices**, not just flatter weights.

**Proposal:**
1. **The draft charm card always offers a pivot (S).** When the draft has a charm card for a charm you own, the other non-relic card is a charm you don't own. In the extend branch, cut 50% to 30%.
2. **Cashier slot rules (S):** slot 1 extends what you have; slot 2 must be a **different charm type** from slot 1; the top-up excludes both types.
3. **Rerolls re-roll the layout (S):** each reroll draws its slot kinds from a weighted table, so a shelf can come up relic-heavy, all-charms, or all-utility. Never keep an unsold item's exact card across a reroll.
4. **The relic slot pool (S):** in act 2+, only 50% of relic slots are legendaries, and there's no identical relic twice in a row.
5. **KNIGHT gets one more charm (M):** lucky is barred today because wilds barely help two-symbol lines. Options:
   - a KNIGHT-safe charm such as **STEADY**: its group can't pay less than a pair;
   - or **BULWARK**: shields in its group also deal half their value.

   Three types is too few for variety to exist.
6. **Charm-type relics as offer hooks (S):** when you see a new charm type, sometimes pair it with its relic at a discount. The pivot needs a reason.

---

## D. Run bimodality

**What the data says (and where the owner is right and wrong):**
- **"Weak, stay weak and die early": right about dying early, wrong about "stay weak".**
  - I split runs into quartiles by damage per spin in act 1 fights 3–5.

    | quartile | died in act 1 | win (GREEN) | win (WHITE) |
    |---|---|---|---|
    | Q1 (weakest) | 48% | 18% | 33.8% |
    | Q4 (strongest) | 27% | 22% | 39.8% |

  - Once a weak run survives act 1, it wins at **the same rate or better** (Q1 34% versus Q4 30% at GREEN), because late sizing is elastic.
  - Early weakness costs you act 1, not the run.
- **"Snowball and one-shot everything": right about the feel, but it isn't the whole run.**
  - One-shots (2 turns or fewer) are only 5–10% of act 2–3 regular fights.
  - The real snowball signal is **no net HP loss in 57% / 75% of act 2 / act 3 fights**, and arriving at bosses at 100% HP (median).
  - I did see the extremes in play: FIRST BLOOD plus gold one-shot an act 2 elite with 1,370 HP and a 1,810-HP Mimic in 0.7 s. The next fight took 21 turns.
- **Power spread at the Mirror (p10 / p90):**

  | machine | p10 | p90 | spread |
  |---|---|---|---|
  | KNIGHT | 264 | 2,039 | 8x |
  | JAX | 606 | 11,276 | 19x |
  | BRIAR | 108 | 652 | 6x |

  Regular enemies in act 2 don't see this spread (fixed HP), so they are either walls or paper.
- **Outcomes are decided at three coinflips:** the House (about 22% of runs die there), the Mirror (about 16%) and the Dealer (about 10%). Regular fights in acts 2–3 can't kill a run, so they can't build dread.

**Proposal:**
1. **Act 1 catch-up (S):** after a win where you lost more than 40% of your HP, the draft adds a 4th card (a heal/level "patch"), or the post-fight heal becomes 35% instead of 20%. This targets the fight 2–3 deaths without helping strong runs.
2. **Act 2 regulars sized to power (see B3) (M):** this is the main de-snowball. Strong builds stay strong, but a fight lasts 5–7 spins, not 1–2.
3. **Pressure that keeps up: make healing stop erasing regular fights (M).**
   - Cap between-fight and in-fight healing late (e.g. payoff heals halved in act 3).
   - Or add an **attrition clock:** from act 2, each regular enemy's attack grows +10% per enemy turn.
   - Target 10–25% net HP lost per act 2–3 fight, so HP into the Dealer lands at 60–75% (the STATE target, never met).
4. **Soften the snowball at the source (S):**
   - FIRST BLOOD x3 → x2.
   - Overkill chips capped at +3 per fight (see A4).
   - Consider gold ADD capped at x6 per group before Golden Ticket.
5. **Split boss difficulty across the fight (M):** see E. A boss that needs two or three good turns from you is less swingy than one that rolls one spike turn.

---

## E. Boss clarity and the Dealer

### The House: the most readable boss, but too long
**Readable:**
- THE POT 60, NEXT SKIM 30, and CASH OUT IN 3 read clearly. The pot is the best telegraph in the game.

**Unclear:**
1. The rules paragraph on the preview card is tiny (about 5 px at 800×450). It contains the key rule, "any jackpot you hit scoops the pot", and nobody will read it. Move that rule to the pot box during the fight ("YOUR JACKPOT TAKES IT").
2. 25–107 turns mostly of 5–10 damage spins. The House's threat never rises above the regular enemies'.

**Fix:** B2. A shorter House with a hotter pot (skim every 3 turns, a jackpot doubles the pot), plus a visible "ALL IN" phase at half HP.

### The Mirror: two spikes, and the telegraph lies
What I saw (KNIGHT, 300 max HP, 3,310-HP Mirror):
- **Turn 1:** I hit a 1,692 jackpot, clamped to 1,655 by the crack gate. The Mirror cracked.
- **Turn 2:** the panel still read **"REFLECTION IN 2 · AT LEAST 180"**, but the Mirror threw its reflection immediately (the crack snap-back) **and** its own triple line in the same turn: 300 attack (100% of my max HP), 40 blocked by chips, and I went from 300 to 40 HP.
- **Turn 6:** the same again (300 attack), and I died.

**What's unclear on screen:**
- **The preview promises caps that don't add up.** "ITS HITS ARE CAPPED AT 40% OF YOUR MAX HP. REFLECTS UP TO 60%." Both happen on one turn, so 100% is possible (`fight.ts:1023` exempts the reflect from the 40% cap, and the regular attack still follows). Sim: 657 double-source Mirror turns in 423 fights.
- **The countdown ignores the crack snap-back.** It showed "IN 2" on the turn it fired.
- **"AT LEAST 180" is the cap, not a floor.** The value is `max(MIN, min(cap, bank))`.
- **The preview text runs past its panel border** ("PER 8, MAX 40)." sits on the frame).

**Fixes (S):**
- One cap for the whole Mirror turn: reflect plus attack ≤ 60%.
- The panel shows **"REFLECTS NEXT! 180"** the moment it cracks.
- Relabel the number "UP TO 180".
- A one-line preview: "COPIES YOUR MACHINE. EVERY 3 TURNS IT THROWS YOUR BEST HIT BACK (MAX 60% OF YOUR HP). AT HALF HP IT THROWS AT ONCE."

### The Dealer: why it's underwhelming
**Presence:**
- A small portrait in a HUD box. Its reels (7s, cards) look like any enemy's.
- "THE HOUSE HAS A PARTNER" lore is on the card and nowhere in the fight.

**Threat:**
- It hits for 20–90. Its real damage is your own marked cards: 59% of the damage it deals, landing on *your* spin as "MARKED! BLOCKED" or "-20".
- My TESLA went from 370 to 0 over about 20 turns of 20–50 chip damage while its own damage fell from 2,916 to 18. Rocks and cards piled onto my reels, and nothing told me the Dealer was doing it.

**Its signature:**
- **SHUFFLE:** "swaps 5 cells between 2 reels". Randomising a random machine has no visible consequence; the little flying cards are the only feedback.
- **CUT:** one charmed cell.
- **RAISE:** doubles both sides.
- None of these reads as "the boss did something to me".

**The run-over screen** says "THE DEALER · 17 rounds · 325→0 · DEFEATED" with no cause. Nobody learns why they lost.

**What would give it presence (M, one package):**
1. **The Dealer deals onto your payline.**
   - Every deal lays a **face-up card over one of your three payline positions** for the next spin: ACE (that cell pays x2), JOKER (that cell is wild), or DEUCE (that cell pays 0).
   - The Dealer picks the worst one for you more often at HOUSE RULES.
   - You watch the card flip onto *your* machine before the spin. That's the "enemies write on your machine" hook, at boss scale, and it's legible.
2. **Its own hand.** Replace SHUFFLE with **ALL IN**: the Dealer's next attack is its whole hand (sum of its visible 3×3 values). It's telegraphed a turn ahead with a big red number over its machine, like the House's pot. That gives it one scary, readable spike instead of a slow bleed.
3. **Marked cards credited to the Dealer:** "THE DEALER'S MARK: −20" in its colour, and a count on its HUD ("MARKS ON YOU: 6").
4. **Staging:** a bigger portrait, a dealer's-table felt behind its machine, and a card-flip SFX sting on every deal. At HOUSE RULES, the House appears beside it (the partner) and adds the pot.
5. **Death recap (S):** list the top three damage sources on the run-over screen (e.g. "MARKED CARDS 212 · DEALER HITS 140 · RAISE 30").

---

## F. Bugs

1. **The Mirror hits for up to 100% of max HP in one turn, despite "capped at 40%".** `MIRROR_HIT_CAP` exempts reflect (`fight.ts:1023`), and the regular triple follows in the same turn.
   - **Steps:** KNIGHT run with a gold build (seed 123, force through act 1, play act 2). At the Mirror: turn 1 jackpot to crack, turn 2 log: `reflect atk 300 hpDmg 260 blk 40` (max HP 300).
   - The sim finds this in 69% of Mirror losses (a turn of 60% or more).
2. **The Mirror's reflection countdown doesn't update on crack.** It shows "REFLECTION IN 2" during the snap-back turn. Same steps as bug 1; see the turn 2 screenshot.
3. **"AT LEAST" label on the reflection value**, which is actually the maximum (`game.ts:1183`).
4. **The Mirror preview text overflows its panel.** The last line sits on the border at 1280×720 logical (KNIGHT WHITE, reach the Mirror, preview card).
5. **Small: the title overlaps the logo.** On `dbg.run` into the start-relic screen, "A NEW RUN" draws over the "SLOTS VS. SLOTS" logo for the first moments of the transition.
6. **Not a bug, but it reads as one:** on the TESLA run the big choice CLEAN CUT offered "+1 LEVEL TO SWORDS" and SWEEP UP offered "HEAL 100" at full HP (320/320). Safe picks should adapt: offer max HP when full.

The shop, draft, bonus wheel and relic pick all worked. Tests are 170/170 green.

---

## G. Prioritized change list

| # | Change | Effort | Expected impact |
|---|---|---|---|
| 1 | **Mirror fixes:** one cap for the whole turn (≤60%), a countdown that shows the crack snap-back, "UP TO" label, one-line preview (F1–F4) | S | Fewer one-turn Mirror deaths (69% of losses today); the boss becomes learnable |
| 2 | **Act 1 shorter and snappier:** `DEPTH_HP` about 0.7x, abilities every 3, enemy damage kept; small-spin fast path | S | Act 1 from about 13 min to about 7 min at 2X; first-run retention |
| 3 | **Act 1 catch-up:** 4th draft card or heal 35% after a costly win | S | Deaths at fights 2–3 (about 20% of runs) cut roughly in half |
| 4 | **Offer rules:** pivot card in drafts (extend 50% → 30%), slot 2 a different type, rerolls redraw the layout, no carried-over items | S | New charm type in drafts from 7% to about 35%; rerolls feel real |
| 5 | **Economy:** overkill chips capped at +3 per fight; start chips 4 → 8 (or first-visit prices −2) | S | Shop 1 becomes a real buy; late shelves become choices again |
| 6 | **Act 2 regulars sized to power;** ability cadence floor in acts 2–3 | M | Kills the 1–2 spin one-shots and the JAX/BRIAR 4x split; the abilities get seen (31–40% never fire today) |
| 7 | **The House: threat instead of HP** (BOSS_MUL house about 2, hotter pot, visible ALL IN) | M | The House from 67 to about 25 turns; boss tension instead of a grind |
| 8 | **Late attrition:** payoff heals halved in act 3, or +10% enemy attack per enemy turn from act 2 | M | HP into the Dealer from 95% to the 60–75% target; regular fights matter again |
| 9 | **The Dealer rework:** payline cards, ALL IN, marks credited to the Dealer, staging | M | The final boss has presence; losses make sense |
| 10 | **Death recap** on the run-over screen (top three damage sources) | S | Clarity on every loss, bosses especially |
| 11 | **A 4th KNIGHT charm** (STEADY or BULWARK) | M | Variety can exist for the starter machine |
| 12 | **Pacing gate in `tuesday.ts`:** turns p50/p90 per act, and act 2–3 net HP lost | S | Keeps 2, 6, 7 and 8 honest |
| 13 | **Meta drip:** unlock 2–3 charms, relics or enemies per machine milestone; run modifiers (per-stake twists) | L | Long-tail replay pull (A5) |

**Suggested order:**
- **1, 2, 3, 4, 5, 10, 12:** all S, one balance pass, then re-measure with tuesday.ts and expert2.ts.
- **Then 6, 7, 8** together, since they interact.
- **Then 9, then 11, then 13.**
