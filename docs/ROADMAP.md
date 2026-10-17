# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-17):** step 1, TESLA's CHAIN: designing it (researcher, then playtester, then the user's
sign-off). Machines differ by their attack meter's rule (VISION.md).

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
