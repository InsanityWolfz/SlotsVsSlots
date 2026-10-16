# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-16):** step 3, its second system: rival cheats (designing: researcher, then playtester, then
the user's sign-off). Done: KNIGHT's SWORD pays its EDGE (user: "feels good").
Step 2 is proven (user, 2026-10-16: "core loop is proven... I have agency on whether I win based on nudge and hold. it
didn't feel unfair or broken"). The race is PLAY MODES > NEW GAME (TEST): `src/race/race.ts` the rules,
`src/race/scene.ts` the screen.

## The rebuild, in order (user, 2026-10-16)
3. **One system at a time,** each played and judged on feel before the next starts: the symbols, then rival cheats,
   then the run and its scaling, then Charms, relics and the other Slot Machines.
4. **Balance last.** Sim targets only once the rules stop changing.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with the race slice behind PLAY MODES > SCORE RACE (TEST).
  It stays playable and untouched until the new game is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
