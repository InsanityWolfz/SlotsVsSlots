# Roadmap: the rebuild

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record). The old
game's roadmap is in git on branch `hp-game-final`.

**In progress (2026-10-16):** step 1, writing `docs/VISION.md` with the user, one question at a time (decided: the
race and your options, what symbols are for; next: the rival's score growth, how a run ends, CLAUDE.md's
rules). Nothing gets built until it's signed off; the expert playtester reviews the whole vision before sign-off.

## The rebuild, in order (user, 2026-10-16)
1. **The vision, together.** Turn `docs/VISION.md` from a draft into decisions, and rewrite CLAUDE.md's binding
   rules for the new game. The user signs it off.
2. **The smallest playable core.** One Slot Machine (KNIGHT), one plain rival, a fixed number of spins, the player's
   in-race options. No Charms, relics, cheats or Cashier. The only question: is one race fun, spin by spin?
3. **One system at a time,** each played and judged on feel before the next starts: the symbols, then rival cheats,
   then the run and its scaling, then Charms, relics and the other Slot Machines.
4. **Balance last.** Sim targets only once the rules stop changing.

## Where things are
- The live build (`main`, GitHub Pages) is the old game, with the race slice behind PLAY MODES > SCORE RACE (TEST).
  It stays playable and untouched until the new game is better.
- Branch `hp-game-final`: the last build of the old game plus the race slice.
