# Slots vs. Slots: the game as it is today

Read from the code on 2026-10-11. When the code and this file disagree, the code wins, so fix this file.
Every number here is a starting point: balance is being redone (see `ROADMAP.md`).

## The pitch
An 8-bit roguelike where two slot machines fight. Fights are watch-only: the reels decide them. Enemies cheat by
writing on your machine (slime, rocks, stolen cells, frozen reels, bombs...). Your agency is between fights: which
enemy to take at a fork, which card to draft, what to buy at the Cashier, and which Charms and relics to build.

## A run
- **Acts** are 5 fights plus a boss. Fights 2-4 offer a **fork** of two enemies, and the more dangerous one is an
  **ELITE** with more HP. Beating an act 1 elite lets you pick 1 of 2 relics; an act 2 elite pays 6 chips instead.
- In acts 1-2, fight 4 is always **THE REPO MAN** (the "Gatekeeper"): he repossesses cells until you beat the act's boss.
- **After every win:** 25% of max HP comes back (a third of that in act 3), then a **draft** (pick 1 of 3 cards:
  add, swap or remove symbols, Charms, Charm levels, heals). Drafts after fights 2 and 4 offer relics.
- **The Cashier** (the shop) opens after fights 1, 3 and 5. Chips buy Charms, relics, wilds, removals, heals and
  levels; rerolls cost 1, then 2, 3 and so on. Chips come from wins, elites, jackpots and interest (+1 per 5 banked, capped at 3).
- **SIDE BETS:** before a regular fight you may stake chips on one long-shot bet about how the fight goes.
- **After a boss:** a legendary relic pick (1 of 3), then **big choices** (3 cards from pools: one with a real
  cost, one for your Slot Machine, one free).
- **BONUS WHEEL and RELIC RUSH:** rare bonus symbols drop a voucher mid-fight. It pays out only if you win that fight.

## Acts and bosses
| Act | Boss | Mechanic | State |
|---|---|---|---|
| 1 | THE HOUSE | A growing pot. Every 3 turns it skims half the pot as a hit. Doubles down at half HP; LAST CALL skims every turn | Done |
| 2 | THE WHEEL | Places bet chips on your reels. Your pairs sweep them. At NO MORE BETS, every chip left hits for a share of your max HP. Spins faster at half HP | Rework in progress, untuned |
| 3 | THE DEALER | Deals RAISE / DEUCE. At half HP plays its FINAL HAND: ALL IN hits through shields | Rework in progress (two hands, three cards, half-HP gate), untuned |

Act 3 is played at stake GREEN and up, and always in daily and weekly runs. **ENDLESS** comes after the Dealer:
you either LET IT RIDE (play another loop for a growing pot) or cash out. Each loop multiplies enemy HP and damage,
and the multiplier grows every loop, so it gets harder exponentially in theory. Playtesters still reached loop 5,
so that isn't happening in practice (see ROADMAP).

## Enemies
- **Act 1:** SLIME, BRUTE, FROST IMP, RAT THIEF, ROCK GOLEM, GREMLIN.
- **Act 2 adds:** BOMBER, HEXER, VAMPIRE, MIMIC, GROUNDER (TESLA only), COUNTERFEITER (other machines with a meter).
- **Act 3 adds:** CARD SHARP, PIT BOSS, CROUPIER. BOMBER, VAMPIRE, HEXER and MIMIC come back.
- **Enemy HP:** acts 1-2 regulars use fixed curves by fight number. **Bosses and act 3 regulars are sized to YOUR
  machine:** HP = reference × (your measured power ÷ reference)^0.5, plus a little per relic, so a build twice as
  strong faces about 1.4× the HP. Code: `machinePower`, `sizingPower`, `POWER_REF` and `BOSS_MUL` in `src/core/run.ts`;
  `TUNE`, `DEPTH_HP*`, `ENDLESS` and the fork/elite map in `src/core/enemies.ts`.

## Slot Machines (`src/core/cabinets.ts`)
Each machine except KNIGHT has one signature symbol and a meter.
| Machine | Hero | Attack symbol | Meter | Unlock |
|---|---|---|---|---|
| KNIGHT | SIR REGINALD | sword | none: half swords, half shields, both at level 2 | start |
| TESLA | DOC VOLTZ | bolt | bolts charge lightning that ignores shields | reach the House |
| JUKEBOX | DJ DECIBEL | note | notes raise the volume; at max THE DROP makes every visible note hit | beat the House |
| JOKER | JESTER JAX | ace | wilds fill a meter; then all 3 payline cells pay as jackpots | beat the House with wilds |
| BANKROLL | CASH CASSIDY | chip (`goldbar`) | chips hit, pay chips and fill the vault; a chip jackpot makes it rain | clear a run |

BRIAR / THORN is retired (the JUKEBOX replaced her). Her id `thorn` stays only so old saves load (`ALL_CABINETS`).
Code ids differ from display names: `midas` is BANKROLL and `joker` is JOKER.

## Charms and relics
- **Charms live on cells.** Levels live on the Charm TYPE (cap 3; endless +1; the LIMIT BREAK big choice goes to 5).
  Pay = BASE × MULT, and gold Charms in a group ADD. Charms: GOLD, KEEN, VAMP, LUCKY, CHIP (`lucre`), plus
  machine-locked CHARGED and BLAZE (TESLA), TRICK (JOKER), ECHO (JUKEBOX) and BULWARK (`spiked`, KNIGHT).
  THORNY is BRIAR's and retired with her. `src/core/charms.ts`.
- **Relics:** about 58, in common, uncommon and legendary tiers; some are machine identity relics. `src/core/relics.ts`.
  To list exactly what players read: `npx tsx tools/content/audit.ts`.

## HIGH STAKES (`src/core/stakes.ts`)
Each machine has its own ladder. Winning a run at your best stake unlocks the next one.
WHITE (base) → RED (scar rocks) → GREEN (the Wheel starts fast, **Act 3 on**) → BLACK (the House cheats) →
BLUE (act 2 abilities faster) → GOLD (every ability faster, bosses +8% HP).

## Modes and meta
- **Modes:** the normal run, DAILY, WEEKLY and ENDLESS.
- **Meta:** CONTINUE (saves between fights), unlocks, achievements, collection, hiscores, and online leaderboards
  (Supabase: `src/net`, `supabase/schema.sql`; Steam leaderboards replace them at the Steam launch).
- **Saves:** localStorage keys `slotvslot.prefs.v2` and `slotvslot.profile.v1`. **Never rename them.** Saves are cleaned on load.
- **Platforms:** the web build deploys to GitHub Pages from `main`. `desktop/` is the Electron + Steamworks wrapper (`npm run build:steam`).

## Code map
- `src/core`: the pure, deterministic rules engine (seeded RNG). `fight.ts` (`Fight.step()` emits ordered
  `CombatEvent`s), `run.ts` (run state, drafts, shop, big choices, boss sizing), `enemies.ts` (roster, map, HP curves, TUNE knobs).
- `src/present`: the Director plays the events back with the juice (see `JUICE.md`).
- `src/ui`: menus and run screens. `src/render`: sprite data and the pixel font. `src/audio`: the synth, SFX and code-composed music.
- `src/sim` + `tools/sim`: the current bot and balance harnesses. They are being replaced (see ROADMAP).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` from hand-authored pixel grids.
