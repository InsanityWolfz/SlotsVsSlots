# Archetypes + identity plan (drafted 2026-10-06; decisions after review 2026-10-07)

Status: **approved by the user after the playtester review (playtest/ARCHETYPES_REVIEW.md).** Numbers are
placeholders for the sim to set.

**Archetypes are a planning tool only.** They never appear in the game: no archetype names, tags or hints on
cards. They're our outline for making relics and charms that synergize and tempt the player.

## 0. The big picture
1. **Swords become KNIGHT-only.** Every other slot machine fights with its own signature symbol.
2. **Archetypes per machine** (planning only) drive a content wave of ~20 items first, then measure, then more.
3. **UI overhaul:** one fixed build panel; much less text everywhere (relic texts rewritten short; the user may
   hand-edit them).
4. **Side bets slimmed:** only the HOT HAND (long shot) line, with a chip stepper. Break-even betting is fine.
5. **No machine affects the enemy's reels** (EMP and TRICKSTER cut).

## 1. Swords only on KNIGHT
Reels: **6 shields + 6 attack symbols** to start (same 12 stops as today). The sim decides whether a machine
needs a different split; jackpot rate and chips per fight go in the official table so the change is visible.
Swords come out **one machine at a time**, measured and logged after each: JAX, TESLA, CASSIDY, BRIAR.

| Machine | Reels after (start) | Its damage |
|---|---|---|
| KNIGHT | sword 6, shield 6 (unchanged) | swords |
| CASH CASSIDY | shield 6, chip 6 | chips pay damage (flung coins) + MAKE IT RAIN |
| BRIAR | shield 6, thorn 6 | all retaliation: the thorn bank hits back (as today, no double count) |
| DOC VOLTZ (TESLA) | shield 6, bolt 6 | bolts fire the lightning (their damage is the lightning) |
| JESTER JAX | shield + **playing cards** + wild | cards (new symbol + art; new internal id, NOT `card`, which the Dealer uses) |

- Meter costs and HP get retuned per machine (the signature lands ~1.8x as often).
- **One attack charm per machine** (replaces "retarget KEEN everywhere"): KNIGHT KEEN, TESLA CHARGED, BRIAR THORNY,
  JAX KEEN on cards, CASSIDY GOLD on chips.
- **Shield damage is KNIGHT-only:** SHIELD BASH becomes KNIGHT-only; the SPIKED charm is removed (redundant).
- **Retire:** GRAFT, LOADED CHIPS. **Retarget:** BANK VAULT, EXECUTIONER, STACKED DECK, VAMPIRE'S KISS (details in
  the review, section 1.4). **Fix:** big choices CLEAN CUT and SOLID GOLD (dead on four machines otherwise).
  Delete the dead MIDAS TOUCH path. Retired ids stay in code so saves load.
- Enemy write-ins that place or mention swords get checked.

## 2. Archetypes (planning only)
Rule: an archetype spends a **different resource** or wins a **different way**. Fewer archetypes for now.
Boss sizing only counts damage, so anything that wins without damage needs a damage-side payoff or measuring.

- **Shared:** WILD / LUCKY (JAX's CHAOS folds in here).
- **KNIGHT:** BLADE (baseline sword scaling), BULWARK (shields hit back; KNIGHT-only), EXECUTIONER (scales off
  **your own max HP**, capped on bosses and in endless).
- **CASH CASSIDY:** HOARDER (banked chips earn interest), RAINMAKER (spend often, cheap rains).
  LOAN SHARK removed for now.
- **BRIAR:** RETALIATION (the bank), BLEED (damage that stacks over turns). OVERGROWTH: open (see below).
- **DOC VOLTZ:** LIGHTNING (burst), FARADAY (shields charge lightning), OVERLOAD (lightning hits harder at the cost
  of your HP; must cost something real in the sim too). EMP cut. GENERATOR cut.
- **JESTER JAX:** cards (baseline) + WILD. TRICKSTER cut. (Thin: needs one more idea later.)
- OPEN: OVERGROWTH as "brambles on the enemy's reels" conflicts with "no machine affects enemy reels".

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

## 6. Sim rewrite (two steps)
- tools/balance has grown by patching each round (~80 files). The bot policies assume swords.
- **Now:** one harness with a bot keyed on each machine's attack symbol. It must reproduce today's tuesday table
  within ~1 point per machine before it replaces anything. The official table adds jackpot rate, chips per fight
  and boss-sizing power. The endless report **forces riding** (no cash-out) so it measures the real wall.
  Old one-offs move to tools/balance/legacy/.
- **With the content wave:** archetype-aware bots, and a "best builds" bot for endless (greedy can't find the
  broken builds).

## 7. Order of work
1. ~~Playtester review~~ (done, playtest/ARCHETYPES_REVIEW.md).
2. Side bets (small, independent).
3. Sim rewrite step 1 (calibrated on today's game).
4. Sword removal, one machine at a time (JAX, TESLA, CASSIDY, BRIAR) + attack charms + relic fixes. Log each.
5. UI panel + text budget (late-endless screenshots first).
6. Content wave 1 (~20 items, by archetype), then sim step 2.
7. Endless scaling: fixed curve / lower powerElastic first, then make the growth grow; target set on riding runs.
