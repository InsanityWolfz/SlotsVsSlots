# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-17): the METERS prototype** (the combat game with build-up meters; user's spec). PLAY MODES >
METERS (TEST): KNIGHT vs SLIME. Symbols: SWORD, SHIELD and COIN (COIN fills nothing yet; two symbols would always
pair). Every sword/shield anywhere on the 3x3 fills its meter (10 to fill). The payline sets the fill's worth: a sword
off the line fills orange (1), a payline sword pair gold (2), a sword jackpot red-hot (3); a full sword meter upgrades
(a better segment replaces the weakest); FIRE hits for the total x10 (100-300). Shields fill faster instead: a payline
pair fills 5, a jackpot fills it all; a raised shield negates the slime's next attack. One action a turn, after your
spin. KNIGHT 200 HP; SLIME 300 HP, hits x8 (80-240), plays the same meters (fires when full). `src/meter/duel.ts` the
rules, `src/meter/scene.ts` the screen. Waiting on the user's play. The score race (NEW GAME (TEST), `src/race/`)
stays as an experiment; don't build on it.

## The rebuild, in order (user, 2026-10-16)
3. **One system at a time,** each played and judged on feel before the next starts: the symbols, then rival cheats,
   then the run and its scaling, then Charms, relics and the other Slot Machines.
4. **Balance last.** Sim targets only once the rules stop changing.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with the race slice behind PLAY MODES > SCORE RACE (TEST).
  It stays playable and untouched until the new game is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
