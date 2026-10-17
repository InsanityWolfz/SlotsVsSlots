# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-17): the METERS prototype** (the combat game with build-up meters; user's spec). PLAY MODES >
METERS (TEST): KNIGHT vs SLIME on THREE PAYLINES (top, middle, bottom rows). Every symbol anywhere on the 3x3 fills its
meter (10 to fill). Yours: SWORD (FIRE) and COIN left of the machine, SHIELD (BLOCK) and HEART (HEAL) right; one
button a turn after your spin; COIN cashes out on its own (a COINS counter, nothing to buy yet). Line wins set the
fill's worth: SWORD, HEART and COIN fill plain/gold/red-hot segments (1/2/3; a full meter upgrades its weakest);
SHIELD fills faster (a pair 5, a jackpot all). FIRE = total x10, HEAL = total x5. The SLIME: sword, shield, heart and
SLIME meters; it fires, else blocks, else heals (when hurt); a full SLIME meter gunks your SWORD meter down to 5 bars
until you fire (user). KNIGHT 200 HP; SLIME 300 HP, hits x8, heals x4. `src/meter/duel.ts` the rules,
`src/meter/scene.ts` the screen. Waiting on the user's play. The score race (NEW GAME (TEST), `src/race/`) stays as an
experiment; don't build on it.

## The rebuild, in order (user, 2026-10-16)
3. **One system at a time,** each played and judged on feel before the next starts: the symbols, then rival cheats,
   then the run and its scaling, then Charms, relics and the other Slot Machines.
4. **Balance last.** Sim targets only once the rules stop changing.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with the race slice behind PLAY MODES > SCORE RACE (TEST).
  It stays playable and untouched until the new game is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
