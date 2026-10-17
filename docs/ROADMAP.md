# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-17): the METERS prototype** (the combat game with build-up meters; user's spec). PLAY MODES >
METERS (TEST): KNIGHT vs SLIME on THREE PAYLINES (top, middle, bottom rows). Only two meters a side, SWORD (FIRE) and
SHIELD (BLOCK), 10 to fill, fed by every sword/shield anywhere on the 3x3 (four bars a side and a HEAL button were too
much on screen: user). Line wins set the worth: swords fill plain/gold/red-hot (1/2/3; a full meter upgrades its
weakest); shields fill faster (a pair 5, a jackpot all). HEART and COIN have no meter: they heal / pay coins the moment
they land (x2 in a line pair, x3 in a jackpot). The slime's SLIME symbol: a slime line win gunks your SWORD meter to 5
bars until you fire. One action a turn after your spin; the slime fires, else blocks. KNIGHT 200 HP; SLIME 300 HP,
hits x8; strips tuned so a fight runs about 9 turns. `src/meter/duel.ts` the rules, `src/meter/scene.ts` the screen.
Waiting on the user's play. The score race (NEW GAME (TEST), `src/race/`) stays as an experiment; don't build on it.

## The rebuild, in order (user, 2026-10-16)
3. **One system at a time,** each played and judged on feel before the next starts: the symbols, then rival cheats,
   then the run and its scaling, then Charms, relics and the other Slot Machines.
4. **Balance last.** Sim targets only once the rules stop changing.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with the race slice behind PLAY MODES > SCORE RACE (TEST).
  It stays playable and untouched until the new game is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
