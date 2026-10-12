# Slots vs. Slots: the game as it is today

Read from the code on 2026-10-11. When the code and this file disagree, the code wins, so fix this file.
Every number here is a starting point: balance is being redone (see `ROADMAP.md`).

## The pitch
An 8-bit roguelike where two slot machines fight. Fights are watch-only: the reels decide them. Enemies cheat by
writing on your machine (slime, rocks, stolen cells, frozen reels, bombs...). Your agency is between fights: which
path to take through an act, which card to draft, what to buy at the Cashier, what to gamble at an encounter, and
which Charms and relics to build.

## A run
- **An act is a map** (`generateActMap` in `src/core/enemies.ts`): a shared opener fight, then you **pick 1 of 3
  paths** of 5 stops each, then the paths rejoin at the Cashier and the boss. Every stop and enemy is shown up
  front; you never choose fights along the way. The three paths have different shapes (`ROUTE_SHAPES`) and never all
  the same number of elites. Endless loops have a single path (fight, Cashier, fight).
- **Stops:** FIGHT, ELITE (more HP and hits 25% harder, shown as X1.25 ELITE on its hits; pays a pick of 2 relics, in every act), CASHIER, ENCOUNTER.
- **Encounters** (`src/core/encounters.ts`) are gambles between fights. On the map they're gold "?" boxes: which one
  it is stays secret until you arrive. Seeded by the stop, so a quit can't re-roll one. Two kinds:
  - **Games:** buy-in cards (chips, HP, or a relic the house picks); a bigger buy-in buys more plays.
    Mostly chip prizes (~80%), sometimes HP, upgrades or a relic. Each game can pay its own kind of prize.
  - **Offers:** take it at a cost, or walk.
  - **In the game now:** LUCKY SEVENS, a 5x3 machine on the fight machines' own reels and bezel. Pay 7 chips / 20% HP /
    a relic for 3 / 6 / 10 pulls. One payline; it pays 3, 4 or 5 in a row from the left (WILD stands in): sevens and
    chips pay chips, the first-aid tin HP, the star an upgrade, the relic tile a relic. About 1 pull in 3 pays, about
    73% of the value is chips, the chip buy-in returns about its cost. Its own art: a heart, an upgrade gem, a 777
    marquee.
  - RED OR BLACK: roulette. Set a chip bet (1 to 20, stepper), call RED or BLACK, watch the ball (the wheel is drawn in
    code so the ball lands in the engine's pocket). Pays 1 to 1; the green zero is the house edge. Up to 3 spins a
    visit, saved after each (a quit resumes at the table and can't replay a spin). Chips only.
  - HIGHER OR LOWER: bet chips (1 to 15), a card is dealt, call the next one. Each right call grows the pot x1.4 (a
    ladder shows it); a wrong call or a tie loses it; cash out any time after a right call, 5 right calls cash out
    for you. Played sensibly it's about even. Chips only.
  - TWENTY-ONE: blackjack, hit or stand only (no double, split or push: a tie goes to the dealer; the dealer stands
    on 17). Pay 6 chips / 15% HP / a relic for 1 / 3 / 5 hands. Each hand won pays an UPGRADE; a two-card 21 pays
    two. Cards drawn in code; the hand in play is saved with the run.
  - UNDER OR OVER: dice. Bet chips, call UNDER 7 / SEVEN / OVER 7. Under/over pay 1 to 1 (a seven gives the bet
    back: about even); SEVEN pays 4 to 1 (the long shot, with the house edge). Up to 3 rolls a visit. Chips only.
  - Offers (each with its own portrait): THE BLOOD BANK (sell 20% of your HP for 8 chips, or 10% of your max HP for
    good for 25); THE PAWN SHOP (the broker names one of your relics: pawn it for 16 chips, or trade it for a relic
    unseen); THE LOAN SHARK (borrow 20, owe 30; or 40, owe 65: he takes it from your winnings after each fight, and
    what's left when the act's boss falls comes out of your chips, then 2 max HP per chip). Debt shows under chips.
  - Paths: 12 shapes now, two of them with three encounters (fewer fights, more gambles).
  - **Cards and words:** buy-in cards all look alike (no LOW / HIGH labels: the player judges the bet). A buy-in you
    can't win back says PAY, not STAKE. No flavour-text subtitles.
- **THE REPO MAN** is a regular in acts 1-2 (he takes a Charm for his fight; it comes back after).
- **After every win:** no heal (user, 2026-10-12: HP carries from fight to fight, so survivability and VAMP matter;
  the act's boss heals you fully). Then a **draft** (pick 1 of 3 cards:
  add, swap or remove symbols, Charms, Charm levels, heals). The drafts after an act's 2nd and 4th won fights offer
  relics.
- **The Cashier** is a stop: on some paths, and always right before the boss (plus a visit when a new act opens).
  Chips buy Charms, relics, wilds, removals, a heal (12 chips, once a visit) and levels; rerolls cost 1, then 2, 3 and so on. Chips come from
  wins, elites, jackpots and interest (+1 per 5 banked, capped at 3).
- **After a boss:** a legendary relic pick (1 of 3), then **big choices** (3 cards from pools: one with a real
  cost, one for your Slot Machine, one free).
- **BONUS WHEEL and RELIC RUSH:** rare bonus symbols drop a voucher mid-fight. It pays out only if you win that fight.

## Acts and bosses
| Act | Boss | Mechanic | State |
|---|---|---|---|
| 1 | THE HOUSE | A growing pot. Every 3 turns it skims half the pot as a hit. Doubles down at half HP; LAST CALL skims every turn | Done |
| 2 | THE WHEEL | Places bet chips on your reels. Your pairs sweep them. At NO MORE BETS, every chip left hits for a share of your max HP. Spins faster at half HP | Rework in progress, untuned |
| 3 | THE DEALER | Three hands, each with its own HP bar (27/31/42% of its HP). 1 THE DEAL: every 3 turns a BUST (your best reel's payline pays nothing next spin). 2 RAISE: its hits x1.5, still BUSTs. 3 ALL IN: every 2 turns, 25-40% of your max HP through shields | Reworked 2026-10-12; spread by machine is still wide (see ROADMAP) |

Act 3 is played at stake GREEN and up, and always in daily and weekly runs. **ENDLESS** comes after the Dealer:
you either LET IT RIDE (play another loop for a growing pot) or cash out. Each loop multiplies enemy HP and damage,
and the multiplier grows every loop, so it gets harder exponentially in theory. Playtesters still reached loop 5,
so that isn't happening in practice (see ROADMAP).

## Enemies
- **Act 1:** SLIME, BRUTE, FROST IMP, RAT THIEF, ROCK GOLEM, GREMLIN, THE REPO MAN. Any enemy's rocks crumble after
  the fight; only an elite's (up to 2) stay.
- **Act 2 adds:** BOMBER, HEXER, VAMPIRE, MIMIC, COUNTERFEITER. (The GROUNDER is retired and removed from the code.) BLUE stake puts your counter (the COUNTERFEITER) on every act 2 path.
- **Act 3 adds:** CARD SHARP, PIT BOSS, CROUPIER. BOMBER, VAMPIRE, HEXER and MIMIC come back.
- **Enemy HP is honest:** the same enemy has the same HP at the same stop on every machine and every build
  (fixed curves by act and fight; elites x1.25 / x1.3; the House, THE WHEEL and the Dealer have fixed HP). Machines are
  balanced by tuning the machines. Code: `makeEnemy`, `DEPTH_HP*`, `TUNE` and `ENDLESS` in `src/core/enemies.ts`,
  `enemyHp` in `src/core/run.ts`.

## Slot Machines (`src/core/cabinets.ts`)
Each machine except KNIGHT has one signature symbol and a meter.
| Machine | Hero | Attack symbol | Meter | Unlock |
|---|---|---|---|---|
| KNIGHT | SIR REGINALD | sword | none: half swords, half shields; swords start at level 3; its levels go to 4, not 3 | start |
| TESLA | DOC VOLTZ | bolt | bolts charge lightning that ignores shields | reach the House |
| JUKEBOX | DJ DECIBEL | note | notes raise the volume; at max THE DROP makes every visible note hit | beat the House |
| JOKER | JESTER JAX | ace | wilds fill a meter; then all 3 payline cells pay as jackpots | beat the House with wilds |
| BANKROLL | CASH CASSIDY | chip (`goldbar`) | chips hit, pay chips and fill the vault; a chip jackpot makes it rain | clear a run |

BRIAR / THORN is retired and removed from the code (the JUKEBOX replaced her). Old saves map her unlock and stakes to
the JUKEBOX; a saved BRIAR run or hiscore entry is dropped on load.
Code ids differ from display names: `midas` is BANKROLL and `joker` is JOKER.

## Charms and relics
- **Charms live on cells.** Levels live on the Charm TYPE (cap 3; endless +1; the LIMIT BREAK big choice goes to 5).
  Pay = BASE × MULT, and gold Charms in a group ADD. Charms: GOLD, KEEN, VAMP, LUCKY, CHIP (`lucre`), plus
  machine-locked CHARGED and BLAZE (TESLA), TRICK (JOKER), ECHO (JUKEBOX) and BULWARK (`spiked`, KNIGHT).
  `src/core/charms.ts`.
- **Relics:** 58, in common, uncommon and legendary tiers; some are machine identity relics. `src/core/relics.ts`.
  To list exactly what players read: `npx tsx tools/content/audit.ts`. Every machine should have a shield build:
  BANKROLL's is ARMORED CAR (shield counts as chips for HIGH ROLLER), SAFE DEPOSIT (chips also hit for the shield
  gained that spin) and SHIELD BASH (KNIGHT's, open to BANKROLL too).

## HIGH STAKES (`src/core/stakes.ts`)
Each machine has its own ladder. Winning a run at your best stake unlocks the next one.
WHITE (base) → RED (scar rocks) → GREEN (the Wheel starts fast, **Act 3 on**) → BLACK (the House cheats) →
BLUE (act 2 abilities faster) → GOLD (every ability faster, bosses +8% HP). From BLACK, enemies also hit 10% harder a
stake (BLACK +10%, BLUE +20%, GOLD +30%; shown as X1.1 BLACK on their hits).

## Balance (`tools/sim/balance.ts`)
- **Targets for the sim bot** (run win %, every machine within 5 points): WHITE 60, RED 50, GREEN 36, BLACK 28,
  BLUE 20, GOLD 14. Each boss's win rate (of runs that reach it) within 10 points across machines. Rough per-boss
  aims: House about 85, THE WHEEL about 85, the Dealer about 65.
- The bot plays like a decent player (`src/sim/bot.ts`): elites when healthy, the best-valued card, sensible encounter
  play (`--style rush`, the attack build, is the default). Real players (playtesters reached endless loop 5) are stronger than it; the targets account for that.
- **Two builds per machine, no new rules (user, 2026-10-12):** an attack build and a shield build should both be
  viable on every machine (`--style turtle` forces the shield build). Keep the rules simple: a mechanic players can't read
  loses more players than it wins. (A prototype of mixed-line COMBOS, HEART and per-machine shield payoffs was measured
  and dropped: shield builds already work.)
- Relic / Charm / card values: `--ban <relic>` reruns the same seeds without it (the honest measure); `--detail`
  lists win-rate lifts (inflated by survivorship).
- **TESLA's lightning grows additively (2026-10-12, the user's idea):** its boosts (OVERCHARGE, LIVE WIRE, MELTDOWN,
  MAD SCIENCE, CHAIN LIGHTNING +100%) add up instead of multiplying; base bolt 60, BLAZE +5 a level. WHITE 56, GREEN 36.
- **Pacing (2026-10-12):** Act 3 regulars and elites have x1.4 HP (TUNE.act3Hp), and ENDLESS grows x2 a loop with a
  small ramp (was x1.45 with a big one). Act 3 fights ending in 2 spins or fewer: 20-55% -> 13-23% for every machine
  but BANKROLL (49%: MAKE IT RAIN hits for the chips held). GREEN: KNIGHT 36, JUKEBOX 35, TESLA 42, JOKER 52,
  BANKROLL 49.
- **Healing (2026-10-12):** under a quarter of max HP, every draft holds a heal of a quarter of max HP (a run at
  17% HP once had none on offer); each Cashier heal in a run costs 6 chips more than the last (12, 18, 24...), so
  chip-rich machines can't buy off attrition. WHITE +0-2, GREEN within 1.
- **ENDLESS variety (user, 2026-10-12):** only a big choice you TAKE leaves the run; one you pass on rests 2 offers and
  can come back, and in ENDLESS every card is open (the early-act ones too). HOUSE EDGES stack up to III (each level
  harder, paying a tier more). Legendary picks top up with normal relics when fewer than 3 legendaries are left.
- **MAKE IT RAIN counts at most 100 chips (user, 2026-10-12).** The sim's BANKROLL rarely holds that many (median 34
  in Act 3); its big hits were the multiplier (~25 GOLD Charms from BANK VAULT x HIGH ROLLER).
- **JOKER (user, 2026-10-12):** 380 HP (was 320) and its jackpot payoff no longer heals. Its healing grew with its WILDS
  (5 HP a spin in Act 1, 16 in Act 3), so Act 3 never killed it: GREEN 53 -> 44, WHITE 56 -> 57.
- **Boss clarity (user, 2026-10-12):** every boss's rules are short rows, each with the icon the fight uses, then a
  green HOW TO WIN line (`src/ui/bossRules.ts`). The boss card's back shows them; in a boss fight, tap its HUD (the "?")
  and the same card opens over the paused fight. ALL IN shows in two places (its banner, the table panel).
- **Stake ladder (user, 2026-10-12):** the stakes after GREEN barely bit (2-7 points a step). Enemy damage +10% a stake
  from BLACK. Sim (1000 runs) BLACK 25-35, BLUE 14-22, GOLD 8-13 (targets 28 / 20 / 14).
- **User calls, 2026-10-12 (late):** the Dealer's ALL IN grows 25% a loop in ENDLESS (up to 90% of your max HP; the
  60% boss turn cap still holds); a Cashier sits at a path's stop 3 or earlier; THE BLOOD BANK pays 10 chips for 20%
  of your HP and 12 for 10% of max HP (was 8 / 25: selling max HP and buying it back was a profit); LOOSE CHANGE is
  gone (a trap: BANKROLL WHITE 58 -> 62, GREEN 41 -> 45 without it); a slime jackpot keeps cleansing every slime;
  Charm offers stay random.
- **BANK VAULT is gone (user, 2026-10-12):** a GOLD Charm after every win. BANKROLL GREEN 50 -> 41, WHITE 59 -> 58;
  its Act 3 fights in 2 spins or fewer 49% -> 38%.
- **No healing penalty in Act 3 (user, 2026-10-12):** healing used to be halved there; it hit the slow machines'
  Dealer fights hardest (KNIGHT GREEN 29 -> 38, JUKEBOX 25 -> 39).

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
- `src/sim` + `tools/sim`: the sim bot (`bot.ts`), the run player (`play.ts`) and the sim (`tools/sim/balance.ts`, see Balance).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` from hand-authored pixel grids.
