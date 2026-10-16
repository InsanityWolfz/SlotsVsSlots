# Vision: the new game (DRAFT, not signed off)

**Status:** draft. Nothing here is decided until the user signs it off; this file is written WITH the user, step 1 of
the rebuild (`docs/ROADMAP.md`). Until then, don't build from it. When a section is decided, mark it **DECIDED** with
the date.

## Why we're rebuilding (user, 2026-10-16)
The old game had four levers: player damage, player HP, enemy attacks and enemy HP. You can't scale all four
exponentially at once, and when one is linear you get one-hit fights or forever fights (shielding and healing).
The new game has **two levers: the player's score and the enemy's score.** Both must be able to grow exponentially:
the player's through upgrades, Charms and relics; the enemy's somehow (today enemies don't grow: they hit, or they
sabotage linearly, and that's it). An enemy rolling five great spins in a row is luck: it's a slot machine.

This is a new game, not a fix to the old one. It reuses the chassis (reels, strips, symbols, art, juice, the run
map, the Cashier, saves, the sim harness) and rebuilds the rules from a small core, one system at a time.

## Old vision -> new vision
| | Old | New |
|---|---|---|
| The pitch | Slot vs. slot roguelike where your reels battle theirs | Slot vs. slot roguelike where you battle another Slot Machine for the top score |
| A fight | Automatic: you just watch | One spin at a time, with options to improve your luck |
| Length | As many spins as it takes to reach 0 HP | A fixed number of spins, so the top-score race works |

## What we lose
- One-shotting an annoying enemy or boss.
- Getting two-shot by an enemy when you know you're weak.
- (A problem we lose, good riddance: bad pacing, long early fights and a trivial late game.)
- Some of the fight theme and story.

## What we gain
- Players have agency over their Slot Machines.
- Big scores still feel good.
- Easier balance and horizontal content (more symbols, enemies and bosses with their own scoring tricks).

## Open questions (to answer together, one at a time)
- How does the rival's score grow exponentially across a run? How much luck does it get inside a race?
- What can the player do during a race (HOLD / NUDGE / RESPIN were the race slice's answer)?
- What are a Slot Machine's symbols for, now that nothing is attacked or defended?
- How does a run end (one lost race, strikes, a target)?
- Which of the old binding rules carry over (see CLAUDE.md "Suspended")?

## Parked ideas (from the race slice discussion, 2026-10-15/16; NOT decided, don't build)
- **Whetstone:** KNIGHT's second symbol sharpens swords for the rest of the race (build, then strike). The
  playtester's notes: build should ADD to base, not multiply (no snowball); the signature symbol pays and the new
  symbol feeds the meter the machine already has.
- **Fold:** if the rival can't catch up, it folds and the race ends early (brings back the one-shot feeling).
- **Telegraphed cheats:** the rival's next cheat is shown a spin early, so the player's tools can answer it.
- **Rival score as a blind:** the rival's score target scales by stop like a Balatro blind, with bounded swings.
- What the race slice taught: the scoring felt good; shields as GUARDS felt retrofitted (a flat count that doesn't
  scale); one-loss runs at ~95% per race read as random.
