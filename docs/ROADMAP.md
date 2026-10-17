# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**Paused (2026-10-17): the user has set Slots vs. Slots aside for another project.** The test modes (SCORE RACE,
NEW GAME, METERS) are off PLAY MODES, so the live build is the original game; their code stays (`src/race/`,
`src/meter/`, the menu callbacks). Where the rebuild stood: METER COMBAT is the model (VISION.md); KNIGHT and TESLA are
built in `src/meter/`. Next, if it resumes: build JOKER (playtested: only card line wins fill a 10-cell JACKPOT meter,
a line pair +5, a jackpot fills it; FIRE at any amount for meter x7, doubled when full; a gunk-capped meter doesn't
count as full; waiting on the user's sign-off), redesign JUKEBOX (a fast-refilling meter can't be a ramp: DROP every
turn dominated), and build BANKROLL after the Cashier (banking is no choice until coins buy something). The sims are in
`tools/out/` (gitignored, so local only).

## Next, one at a time (each played and judged before the next; proposed 2026-10-17)
1. **TESLA and its CHAIN** (a tempo attack meter, the opposite of KNIGHT's patience): proves machines can play
   differently on the same two meters.
2. **A second enemy with its own sabotage symbol** (e.g. FROST: an ice line win freezes your SHIELD meter). Proves
   enemies are the content engine.
3. **Meter fights in a run:** the act 1 map, HP carried between fights, coins spent at the Cashier.
4. **Charms and relics rebuilt on meters** (build archetypes that hook a meter, the Slay the Spire "poison" lock-in).
5. **Bosses,** then the other Slot Machines' attack meters (JUKEBOX, JOKER, BANKROLL).
- **Balance last.** Sim numbers only once the rules stop changing; the user's play decides feel.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with PLAY MODES > METERS (TEST) (the model: `src/meter/`),
  NEW GAME (TEST) (the dropped score race: `src/race/`) and SCORE RACE (TEST) (the older race slice). The old game
  stays playable until the new one is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
