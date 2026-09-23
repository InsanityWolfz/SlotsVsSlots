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
- [ ] **I1: run structure.** Map of 5 fights + boss; HP carry-over rules; between-fight draft
  (pick 1 of 3: add symbol to a reel / remove symbol / upgrade symbol / relic). Passive enemy
  intent telegraph. Strip mini-map (whole-strip view of slime etc).
- [ ] **I2: enemy roster.** Procedural enemies from archetypes that write on your machine:
  slime (dead cells), freeze (reel locked N turns), thief (removes symbol), junk-adder (adds
  dead/rock symbols), disabler (a reel scores nothing for N turns). Scaling by run depth.
- [ ] **I3: relics.** Passive rule changes: near-miss → jackpot % chance, any-two pairs,
  cleanse-on-pair, extra payline, etc.
- [ ] **I4: boss.** A special slot mechanic (e.g. a 5-reel boss machine, a boss that spins its
  reels INTO yours, a phase change at 50% HP).
- [ ] **I5+:** balance passes from sim + playtests; recap-of-run screen; polish.

## Iteration log
(newest last: what was done, commit hash, playtest verdict, open issues)
