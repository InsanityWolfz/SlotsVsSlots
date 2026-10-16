# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-16): the direction is under review. Don't build on the race.** The user, after playing the
run: the score race feels better only because it's a familiar slot machine, not an emergent roguelike, and it feels
copied. They lean back to the combat game (it's new), rebuilt from the root problem: damage arrives as one spin's
flat number (a slime makes 30-turn fights, a build makes one-spin kills), so power must BUILD UP over a fight (a hot
streak, Slay the Spire style) with clear build archetypes, and charms/relics may be torn up to fit. Also raised:
readability for new players (auto-spins at high speed confused a first-timer), sims that don't match human play, and
a real workflow (branches, PRs, checks). The race (NEW GAME (TEST), `src/race/`) stays as an experiment. Done: KNIGHT's SWORD pays its EDGE (user: "feels good"); GUNK, the first rival cheat
(user: "it's fine").
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
