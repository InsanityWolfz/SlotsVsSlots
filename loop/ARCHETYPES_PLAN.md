# Archetypes + identity plan (planning only; drafted 2026-10-06)

Status: **agreed with the user in direction; needs the expert playtester's review before any code.**
Nothing here is built yet. Numbers are placeholders for the sim to set.

## 0. The big picture
1. **Swords become KNIGHT-only.** Every other slot machine fights with its own signature symbol.
2. **Archetypes per machine** drive a content wave (charms + relics), roughly +50% first, then reassess.
3. **UI overhaul:** one fixed build panel; much less text everywhere.
4. **Side bets slimmed:** only the HOT HAND (long shot) line, with a chip stepper.

## 1. Swords only on KNIGHT
Each machine's signature symbol becomes its **attack symbol** (it pays damage itself, and still fills the meter).

| Machine | Reels today | Reels after (draft) | Attack symbol |
|---|---|---|---|
| KNIGHT (SIR REGINALD) | sword 6, shield 6 | unchanged | sword |
| THE BANKROLL (CASH CASSIDY) | sword 4, shield 4, chip 4 | shield + chip | chip (flung coins) |
| THORN (BRIAR) | sword 4, shield 4, thorn 4 | shield + thorn | thorn |
| TESLA (DOC VOLTZ) | sword 4, shield 4, bolt 4 | shield + bolt | bolt |
| JOKER (JESTER JAX) | sword 5, shield 5, wild 2 | shield + CARD + wild | **playing card** (new symbol + art) |

- **Charm retarget:** KEEN, VAMP, TRICK (and any charm that names swords) apply to "your attack symbol".
- **Built-in, not relics:** relics that only exist to let charms land on signature symbols become part of the
  machine; take them out of the draft pool (code ids stay, flagged `retired`, so saves load).
- **Shields stay on every machine** as defense. Shield *damage* (SPIKED, retaliating shields) is **KNIGHT-only**.
- Enemies still write on your reels; check enemy write-ins that place or mention swords.
- Cost: every machine retuned (BOSS_MUL, HP, meter costs) and the sim bot policies updated (they assume swords).

## 2. Archetypes
Rule: an archetype must spend a **different resource** or win a **different way**, not "more of the same damage".
Each archetype gets enablers (make it happen) and payoffs (reward it). Offers lean toward the archetype you've
started (light weighting, no hints on cards).

### Shared (any machine)
- **WILD / LUCKY:** wilds, lucky charms, jackpot chasing.

### KNIGHT
- **BLADE:** sword scaling (KEEN, gold swords, sword count).
- **BULWARK (KNIGHT-only):** shields that retaliate / turn block into damage.
- **EXECUTIONER:** hits that scale with HP (a % of the enemy's max HP, or off your own max HP). Needs a cap so
  bosses don't melt.

### CASH CASSIDY
- **HOARDER:** banked chips earn interest; rewards *not* spending.
- **RAINMAKER:** spend often; cheap, frequent MAKE IT RAIN.
- **LOAN SHARK:** borrow chips now; the debt grows each fight; paying it off (or defaulting) triggers effects.

### BRIAR
- **RETALIATION:** punish enemy hits (the thorn bank today).
- **BLEED:** damage that stacks over turns.
- **OVERGROWTH:** thorns spread to neighbouring cells.

### DOC VOLTZ (TESLA)
- **LIGHTNING:** burst; charge the meter and fire through shields (rod, OVERCHARGE exist).
- **FARADAY:** shields charge lightning; the tank build (FARADAY CAGE, STATIC exist).
- **OVERLOAD:** lightning hits harder **at the cost of your HP** (each strike costs HP for extra damage;
  payoffs scale with missing HP). No overflow meter; keep it simple.
- **EMP:** bolts and strikes jam the enemy's machine: a reel spins blank for a turn, their meter/boss ability
  drains, a jackpot shorts out. Win by the enemy doing nothing. (Automatic, so fights stay watch-only.)
- Cut: GENERATOR (selling charge).

### JESTER JAX
- **CARD SHARK:** card scaling (his new attack symbol).
- **CHAOS:** wilds copy and multiply.
- **TRICKSTER:** steal/swap on the enemy's reels: flip their symbols to yours, put gag symbols on their payline,
  copy their jackpot. (Distinct from EMP: TESLA disables, JAX steals.)

## 3. UI overhaul
- **One fixed build panel**, same spot on every screen (draft, shop, fight, bonus): HP, meter/bar with numbers,
  chips, charm level table (LV/MAX), relic grid that **pages** instead of growing. Large enough to decide from.
- First step: screenshot late endless (loops 4-6) to list exactly what clips.
- **Text budget:** card description ~8 words; one line per menu option; trim every menu.

## 4. Side bets
- Cut the SAFE (x1.5) line. Keep only the HOT HAND long-shot line.
- Stake with **-5 / -1 / +1 / +5** chip steppers (amount shown between them), replacing the 2 / 5 buttons.
- **Stake cap 20** in a run, **40 in endless** (today: 20 / 50). Only relics or upgrades raise it: HIGH LIMIT
  (exists; today it doubles stakes) doubles the cap (40 / 80); room for more bet relics.
  ALL IN is just the stepper's max (no separate button needed).
- Move it to a better spot on the pre-fight screen, near the fight button.

## 5. Endless scales harder
- Today, per loop: enemy HP x1.45 (per machine 1.05-1.5), damage x1.35 (KNIGHT 1.18, CASSIDY 1.25).
- Goal: **only truly broken builds reach loop 5.** Proposed targets (set by sim, per machine):
  most endless runs end by loop 2-3; loop 5 reached by under ~5% of endless runs, and only by top builds.
- Shape: the growth itself should grow (e.g. x1.45, x1.6, x1.8... per loop), so a strong build gets a loop or
  two more but a merely good one hits a wall. Even the per-machine spread out once machines are retuned.
- Needs an endless sim harness that reports the loop reached per machine (check tools/balance for one first).
- Do this after the sword removal retune (machine power changes).

## 6. Sim rewrite
- tools/balance has grown by patching each round (~60 one-off harnesses: e9_..., e11_..., c13_...). The bot
  policies assume swords, so they break with step 2 anyway.
- Rewrite fresh: one shared bot (draft/shop/chip spending that plays each archetype on purpose, not one generic
  policy), one official table (WHITE / GREEN / Dealer / act 3 per machine + per archetype win rates), one endless
  report (loop reached per machine), plus fuzz. Move the old one-offs to tools/balance/legacy/.
- Calibrate the new sim against the current game *before* removing swords, so the before/after numbers mean
  something.

## 7. Order of work
1. Playtester review of this doc (approval gate).
2. Sim rewrite (calibrated on today's game).
3. Sword removal + attack symbols + charm retarget (everything else builds on it). Full sim pass, log in STATE.
4. UI panel + text budget (can run alongside 2, after the late-endless screenshots).
5. Side bets (small; can ship early).
6. Content wave by archetype (+~50%), measured per machine.
7. Endless scaling pass (after 3 and 6, since both change build power).
