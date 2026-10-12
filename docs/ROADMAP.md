# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

## Now, in order
1. **The run map rework (agreed 2026-10-12).** Why: every human playtester takes the elite at every fork (a free
   relic for little risk), which snowballs. The old sim hid this by bending boss HP per machine.
   - **Pick a path, not an enemy.** Each act: a shared opener fight → pick 1 of 3 paths of 5 stops each → the paths
     rejoin at the Cashier → the boss. Every stop and enemy is shown up front; you don't choose fights along the way.
   - **Stops:** FIGHT (a draft and chips), ELITE (a relic pick), CASHIER (spend chips), ENCOUNTER (a non-fight
     gamble: stake chips, HP, relics or upgrades; the user is designing these). Encounters replace SIDE BETS.
   - **No right answer (the user's concern with "greedy / safe / mixed").** A path is judged against YOUR run, not
     ranked. The levers:
     - **Reward kinds differ, not just amounts.** Elites pay relics; encounters can pay relics, chips or upgrades
       on a gamble; Cashiers turn chips into whatever you're missing. Elites are no longer the only relic source.
     - **Matchups are visible.** The map names each enemy, so the same elite is a gift to one build and a run-ender
       for another (a HEXER elite against a Charm build).
     - **Elites really hurt:** more damage, not just more HP. Taking two on low HP can end the run.
     - **Timing matters:** where the Cashier sits on a path decides whether your chips arrive in time to be useful.
     - So a weak build wants the gentle path, a strong one the elites, and most runs land somewhere in between.
   - **Roster:** the GROUNDER goes (it countered lightning on every machine, which is gone). The ROCK GOLEM's rocks
     crumble after the fight (permanent rocks cost far too much for a normal enemy). Check the COUNTERFEITER and
     the rest against today's systems.
   - **Honest HP:** the same enemy HP at the same stop for every machine. Machines get balanced by tuning the
     machines. Bosses stop being sized to your build (or keep only a mild part of it; decide with the new sim).
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
