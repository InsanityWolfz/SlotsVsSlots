# Store page text (draft, call 9, 2026-11-09): leads with the duel

Every number below is counted from the game's code (`main`, 2026-11-09), so the page never promises what isn't there.
The earlier short-description draft (roadmap: "waiting on the user") isn't in the repo; this is a candidate to set beside it.

## Short description (Steam: under 300 characters)

Your slot machine fights theirs. A roguelike where two slot machines brawl: rig your reels, collect relics and Charms,
and outspin a casino full of cheats who spill drinks on your reels, steal your symbols and stack the deck.

(225 characters.)

## About this game

**YOUR SLOT MACHINE VS. THEIRS.** Every spin is an attack. The pairs and jackpots you land hit the rival machine; the
ones they land hit you. They cheat: spilled drinks, stolen symbols, frozen reels, IOUs on your payline. Rig your
machine back, and break the house.

- **5 Slot Machines, 5 ways to win.** KNIGHT's swords, TESLA's lightning storm, JUKEBOX's DROP, JOKER's WILDs and
  BANKROLL's chips.
- **55 relics and 11 Charms** to bend the odds until your machine pays every spin.
- **Rebuild your reels after every win.** Add, swap and CUT symbols until the reels pay the way you want.
- **14 crooked rivals**, each cheating its own way, any of them back as an elite, across three acts: THE ALLEY,
  THE FLOOR and THE VIP ROOM.
- **4 bosses with their own rules:** THE HOUSE skims your chips into its pot (land a jackpot to steal it), THE WHEEL
  bets chips on your reels, THE DEALER deals three hands with their own HP, and THE OWNER waits deep in ENDLESS.
- **Push your luck:** HOLD a pair, ride OVERTIME, and gamble your chips at TWENTY-ONE, HIGHER OR LOWER and THE CLAW.
- **6 stakes from WHITE to GOLD**, then ENDLESS with a new house rule every night (6 of them).
- **28 achievements.** Full controller support, made for Steam Deck.

No real money, no purchases inside the game: chips exist only inside a run.

## Counts (from the code)

| What | Count | Where |
|---|---|---|
| Slot Machines | 5 (KNIGHT, TESLA, JUKEBOX, JOKER, BANKROLL) | `src/core/cabinets.ts` CABINET_ORDER |
| Relics | 55 | `src/core/relics.ts` RELICS |
| Charms | 11 | `src/core/charms.ts` CHARM_COLOR |
| Rival types | 14 (13 regulars + THE REPO MAN) | `src/core/enemies.ts` ARCHETYPES, REPO_MAN |
| Bosses | 4 (THE HOUSE, THE WHEEL, THE DEALER, THE OWNER) | `src/core/enemies.ts` |
| Casino games | 3 (TWENTY-ONE, HIGHER OR LOWER, THE CLAW) | `src/core/encounters.ts` ENCOUNTER_IDS |
| Stakes | 6 (WHITE, RED, GREEN, BLACK, BLUE, GOLD) | `src/core/stakes.ts` STAKES |
| ENDLESS nightly rules | 6 (HAPPY HOUR, HIGH LIMIT, LUCKY NIGHT, SHOWDOWN, IRON NIGHT, FAST NIGHT) | `src/core/endless.ts` NIGHTS |
| Achievements | 28 | `src/core/meta.ts` ACHIEVEMENTS |

Before it goes live, check "made for Steam Deck" against a real Deck (Valve's Verified review is separate), and
recount if content changes.
