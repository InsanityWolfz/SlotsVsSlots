# Autonomous Dev Loop — State

Started 2026-09-22 (overnight, user asleep). The user will ask for a **full report** when they're
back. Don't ask them questions; make reasonable calls and write them down here.

## North-star goal (from the user)
A run of **5 procedural enemies in a row**, with **meaningful decisions between fights**, building
up to a **boss fight with a special slot-machine mechanic** (I pick the mechanic).

## Design constraints (from the user, binding)
- **No in-fight input.** Nothing to click during a fight, and nothing that pauses spins or lets
  the player respond to enemy intent. Fights stay watch-only. (A *passive* intent telegraph is
  fine: it's information, not a prompt.)
- **Agency = choices between fights** (for now).
- **No holds or nudges.** The furthest allowed is a passive power-up/relic along the lines of
  "X% chance a close miss (near-miss) becomes a jackpot".
- **Enemy variety:** enemies that remove symbols, add symbols, freeze reels for a couple of
  turns, disable a reel, and so on. What an enemy writes onto your machine is the hook.
- Juice everything per JUICE_REFERENCE.md. Pixel art comes from the art agent (consistency;
  tools/build-art.mjs is the source of art truth).

## The cycle (repeat)
1. **Playtest agent** plays the latest build (browser + headless sim) and writes
   `playtest/ITERATION_<n>.md` with findings/suggestions. Focus: player incentive structures,
   fairness, overall feel, gameplay.
2. **Art agent** makes any new art the suggestions or features need (edit tools/build-art.mjs,
   regenerate).
3. **Me:** implement suggestions + next roadmap features. Keep tests green, add tests for new
   rules, and verify in the browser.
4. Commit with a clear message and update this file (iteration log below).
5. Next iteration.

## Roadmap (ordered; revise as playtests teach us)
- [x] **I1: run structure.** Map of 5 fights + boss; HP carry-over rules; between-fight draft
  (pick 1 of 3: add symbol to a reel / remove symbol / upgrade symbol / relic). Passive enemy
  intent telegraph. Strip mini-map (whole-strip view of slime etc).
- [x] **I2: enemy roster.** (engine + visuals landed in I1; balance continues) Procedural enemies from archetypes that write on your machine:
  slime (dead cells), freeze (reel locked N turns), thief (removes symbol), junk-adder (adds
  dead/rock symbols), disabler (a reel scores nothing for N turns). Scaling by run depth.
- [~] **I3: relics.** (9 relics in; more + rarity later) Passive rule changes: near-miss → jackpot % chance, any-two pairs,
  cleanse-on-pair, extra payline, etc.
- [~] **I4: boss.** (THE HOUSE + progressive pot in; phase 2 / special machine TBD) A special slot mechanic (e.g. a 5-reel boss machine, a boss that spins its
  reels INTO yours, a phase change at 50% HP).
- [ ] **I5+:** balance passes from sim + playtests; recap-of-run screen; polish.

## Iteration log
(newest last: what was done, commit hash, playtest verdict, open issues)

### Iteration 1 — 2026-09-22 (commit d60711e)
- Built the run: 5 procedural fights (6 archetypes, no back-to-back repeats, gentle opener) + boss THE HOUSE.
- Enemy writers: slime, freeze (ice), steal (claw), rocks (permanent, 1/2/3 per hit), jam (lock, 1 turn).
- Passive telegraph: every enemy has a charging ability shown on its HUD (e.g. SMASH NEXT!).
- 9 passive relics incl. Lucky Clover (30% near-miss→jackpot, the user-approved nudge substitute).
- Between fights: draft 1 of 3 (add/remove symbol on a specific reel, relic, heal, +max HP), preview of next enemy with the whole run map (plan ahead), run-over summary.
- Boss: coins fill a progressive POT; House cashes it out every 5 turns; any player jackpot steals the pot.
- Balance via run sim (3000 runs): greedy drafting 32% run wins, random 24%; deaths ~4-5% F1-F3, ~11-15% F4-F5, boss ~50%.
- Playtest build isolated at :4173 so dev edits don't disturb playtests.
- Open questions for playtest: is drafting meaningful (greedy vs random gap only 8pts)? rocks bloat? thief/gremlin fairness? boss pacing?

### Iteration 2 — 2026-09-23 (playtest/ITERATION_1.md → Package G)
Playtest verdict on I1: run skeleton good, but drafts were 'solved' (always-relic 55% vs greedy 31%), +sword/+shield/-bolt were traps, HP carry-over irrelevant (92% HP into boss), golem rocks halved run win rate, freeze *helped* the player (frozen jackpots repeat), pot too small.
Implemented:
- Rocks: single rocks fizzle; doubles add 1, jackpots 2; max 2 rocks per fight stay permanently (rest crumble, shown on draft); CLEAR ROCKS card smashes a whole reel.
- Drafts: relics only after fights 2 and 4, as 2 relics + 1 other (relic vs relic). ±1 trap cards replaced by SWAP cards (2 shields/rocks → bolts/swords on a reel) and +1 BOLT; every strip card shows a before→after stat line (ENERGY 1.37 TO 1.62 per spin).
- Branching map: fights 2–4 are forks (choose 1 of 2 enemies, full scouting reports); map shows writer badges.
- 6 new relics: Mittens (anti-freeze), Lockpick (anti-jam), Mousetrap (anti-thief, SNAP 3 dmg), Pickaxe (rocks hit like swords), Loaded Dice (jackpots x4), High Roller (doubles steal the pot).
- Freeze fixed: target reels clunk one stop to their worst visible cell, max 2 reels, never hold a reels-1+2 match.
- Jams: single locks fizzle. Enemy targeting values bolts > swords > shields.
- Boss: pot seeded 5, +1 house cut every House turn, cash out every 6, boss HP 44, phase 2 'ALL IN' at half HP doubles the pot; bigger tiered pot widget; cash-out juice scales with the amount.
- Opener is always Slime or Frost (0.85x HP); brute from fight 2; frost 1.1x HP; post-fight heal 0.2.
- Fixes: sandbox fights hide run overlay; hourglass shown in preview; layout collisions.
- Tooling: dbg.tick/dbg.snap + playtest/scratch/snap-server.mjs so frames can be captured even when the app window isn't painting.
- Art: 22 new sprites (6 relics, swap/clear cards, pot tiers, map fork + 7 writer badges), gremlin recolored orange (art agent hit a usage limit mid-pass; I finished registering the sprites + recolor).
Sim (3000 runs): greedy 36%, always-relic 31% (no longer dominant), random 25%. Deaths: F1 0 / F2 5 / F3 5 / F4 7 / F5 10 / boss 36% (greedy). Boss ~50% lethal is now the main wall.
