# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

## Now, in order
1. **Audit and rework the enemy roadmap** (the run map: forks, elites, rewards, how enemy HP scales).
   Design talk with the user first, no code until a plan is agreed.
   - The user's suspicion: playtesters always take elites, so they get far more relics than the old sim's bot.
     That snowballs, and they reach endless loop 5 even though loops are meant to ramp exponentially.
   - What to check: elite rewards (act 1: a relic pick; act 2: +6 chips) against their risk (×1.25 HP and up);
     whether the power-sized bosses (HP grows with the square root of your power) let snowballing builds outrun
     them; endless scaling against real builds.
2. **Finish THE WHEEL and THE DEALER reworks.** The user likes the ideas. Their rules are in, but neither is tuned.
   Do this after (1), because the map rework may change what arrives at those bosses.
3. **A new balance sim, then balance from scratch.** Don't trust any earlier sim numbers: the old gates (WHITE about
   41-45%, GREEN 16-19%) never matched real play. The new bot must play like people do (take elites, chase relics,
   snowball, ride endless), report per relic, per Charm and per card, and be checked against real playtest runs.

## Open from earlier playtests (re-check after the reworks)
- **Pacing:** early fights feel slow, late ones far too fast.
- **Bimodal runs:** weak runs stay weak and die; strong ones snowball and one-shot everything.
- **Offers feel too fitted:** one Charm locks your offers in, and late rerolls barely change the pool.
- **Boss clarity:** the mechanics are hard to follow.
- **SLIME:** a jackpot should cleanse only your visible 3×3, not every slime on the strip.
- **LOOSE CHANGE is a trap:** pair rains cost full chips at half damage.
- **Keyword glossary:** the same words for the same things on every card, each in its own color. A draft is in git
  history: `loop/KEYWORDS_DRAFT.md` at `c2f0ffb`.

## Before a Steam launch
- The user audits the achievements. Steam leaderboards replace Supabase.
- Pick a music approach: the code-composed chiptune now, or licensed music.
- English only.

## Code cleanup
- Remove BRIAR's thorns mechanic and the THORNY charm from the engine. Keep the `thorn` id so old saves load.
- Rename the tests by feature, not by iteration (`iteration6.test.ts`, `expert10.test.ts` and so on).
- Merge `npm run sim` (`src/sim/runSim.ts`) and `tools/sim/*` into the new sim (part of Now, step 3).
- Later: split the 2-3k-line files (`fight.ts`, `run.ts`, `runScreens.ts`, `director.ts`, `game.ts`).

## Held ideas
The SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
