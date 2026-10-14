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
  the same number of elites. ENDLESS loops are maps like the acts' with 2 paths (user, 2026-10-14), so they have encounters too; table limits
  grow by half each loop.
- **Stops:** FIGHT, ELITE (more HP and hits 25% harder, shown as X1.25 ELITE on its hits; pays a pick of 2 relics, in every act), CASHIER, ENCOUNTER.
- **Encounters** (`src/core/encounters.ts`) are gambles between fights. On the map they're gold "?" boxes: which one
  it is stays secret until you arrive. Seeded by the stop, so a quit can't re-roll one. All are games now:
  - **Games:** buy-in cards (chips, HP, or a relic the house picks); a bigger buy-in buys more plays.
    Mostly chip prizes (~80%), sometimes HP, upgrades or a relic. Each game can pay its own kind of prize.
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
  - TWENTY-ONE: blackjack, hit or stand only (no double or split; the dealer stands on 17). A tie is a push
    (user, 2026-10-14): the bet comes back and the hand is dealt again, without using up one of the 3 (sim, 1000 runs: no change). A chip table (user, 2026-10-13: upgrades from cards felt wrong): bet up to 20, 3 hands a visit; a win
    pays 1 to 1, a two-card 21 pays 2 to 1. Cards drawn in code; the hand in play is saved with the run (sim: run win
    -1 to 0).
  - UNDER OR OVER: dice. Bet chips, call UNDER 7 / SEVEN / OVER 7. Under/over pay 1 to 1 (a seven gives the bet
    back: about even); SEVEN pays 4 to 1 (the long shot, with the house edge). Up to 3 rolls a visit. Chips only.
  - RAT RACE (user's pick, 2026-10-14): bet chips (1 to 15) on one of four rats, odds on each (WHISKERS X2, CHEDDAR X3,
    SEWER KING X5, LONGSHOT LOU X10; about a 10% edge in the odds), and watch them run. Two races a visit.
  - SCRATCH-OFF: a ticket costs 6 chips; scratch 3 of its 9 panels (you pick which). Three of a kind wins: 12 or 25
    chips, a heal of a quarter of your max HP (chips at full HP), an upgrade or a relic; about 1 ticket in 2 wins. The
    ticket is printed when bought (a quit can't re-roll it). Two tickets a visit.
  - CLAW MACHINE: 5 chips a go, three goes. The pit shows its three prizes up front: 15 CHIPS (EASY GRAB), 2 CHARMS
    (TRICKY), A RELIC (HARD); pick one to go for. A won prize leaves the pit.
  - Sim (1000 runs WHITE / GREEN, with the three in the encounter pool): KNIGHT 70 / 31 -> 32, TESLA 60 -> 61 / 39 -> 40,
    JUKEBOX 66 -> 67 / 30 -> 34, JOKER 57 -> 60 / 34, BANKROLL 63 -> 64 / 40 -> 41.
  - The offers (THE BLOOD BANK, THE PAWN SHOP, THE LOAN SHARK) are gone (user, 2026-10-14: nobody liked them; a saved
    stop becomes LUCKY SEVENS, a debt is forgiven). Sim, 1000 runs WHITE / GREEN: KNIGHT 66->69 / 34, TESLA 59->58 / 40,
    JUKEBOX 67->68 / 36->35, JOKER 58 / 45->44, BANKROLL 62->60 / 44.
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
KEEP PLAYING goes on into loops until you bust (user, 2026-10-14: no RIDE AGAIN / CASH OUT); your score is the pot
(x1.5 + 1500 a loop cleared) plus your chips x10. Sim (GREEN, the bot never stopping): loops cleared median 4, 5+ 44%.
**TONIGHT'S RULE** (user, 2026-10-14): each loop plays under one rule for both machines, never the same two loops
running (`NIGHTS` in `src/core/run.ts`): HAPPY HOUR (jackpots pay x2), HIGH LIMIT (wins pay x2 chips, enemies +15% HP),
LUCKY NIGHT (2 more wilds a reel), SHOWDOWN (every hit x1.5), IRON NIGHT (shields block x2), FAST NIGHT (abilities 1
turn faster, meters fill x1.5). Shown on the HOUSE EDGE screen, the path pick, the side panel and the fight label.
Sim GREEN: loops cleared median 4 -> 5.
**THE OWNER, the TURBO boss** (user, 2026-10-14: a new boss, insanely hard): loop 5's boss is THE OWNER, the man who
owns the casino (`OWNER` in `src/core/enemies.ts`, his office in the room's column). EVERY TRICK IN THE BOOK: every 2
turns he cheats a new way (slime, a theft, a freeze, rocks, a hex, bombs, in turn). His HP is 8 loop bosses' worth
(TURBO.hp, x the loop's growth), his hits x1.2 and they skip the one-turn cap on you, and no turn takes more than 6% of
his HP (so no build one-shots him). Beating him ends the run, won (YOU BROKE THE BANK, the pot pays x3, achievement
BROKE THE BANK): a broken build or a bug can't go on forever. Aim ~0.1% of the runs that reach him: the bot (GREEN,
399 reached) beat him 0 times (a souped-up loop boss first: x3 HP / x2 hits, no cap: 50%; HP alone up to x100: 3.6%,
BANKROLL; the turn cap is what holds). Each loop multiplies enemy HP and damage,
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
| KNIGHT | SIR REGINALD | sword | none: half swords, half shields; swords start at level 3; its levels go to 4, not 3 (430 HP) | start |
| TESLA | DOC VOLTZ | bolt | bolts charge lightning that ignores shields | reach the House |
| JUKEBOX | DJ DECIBEL | note | notes raise the volume; at max THE DROP makes every visible note hit | beat the House |
| JOKER | JESTER JAX | ace | wilds fill a meter; then all 3 payline cells pay as jackpots | beat the House with wilds |
| BANKROLL | CASH CASSIDY | chip (`goldbar`) | chips hit, pay chips and fill HIGH ROLLER; a chip jackpot makes it rain | clear a run |

BRIAR / THORN is retired and removed from the code (the JUKEBOX replaced her). Old saves map her unlock and stakes to
the JUKEBOX; a saved BRIAR run or hiscore entry is dropped on load.
Code ids differ from display names: `midas` is BANKROLL and `joker` is JOKER.

## Charms and relics
- **Charms live on cells.** Levels live on the Charm TYPE (cap 3; endless +1; the LIMIT BREAK big choice goes to 5).
  Pay = BASE × MULT, and gold Charms in a group ADD. Charms: GOLD, KEEN, VAMP, LUCKY, CHIP (`lucre`), plus
  machine-locked CHARGED and BLAZE (TESLA), TRICK (JOKER), ECHO (JUKEBOX) and BULWARK (`spiked`, KNIGHT).
  `src/core/charms.ts`.
- **WILDs and SLIME (user, 2026-10-14):** a WILD joins slime (a slime pair or jackpot cleanses, so [slime, WILD, x] and
  [WILD, slime, x] now cleanse); it still never joins a rock or other dead symbol, and WILDs ahead of one still pair with
  each other (WILD, WILD, ROCK paid nothing). WILD WHEEL (JOKER relic) is gone: "keeps the better result" was a
  judgement call, not a rule. Sim 1000 runs WHITE / GREEN: no change (JOKER GREEN 34 -> 35).
- **Balance pass after the content wave (2026-10-14):** enemy damage from BLACK is +7% a stake (was +10%: BLUE and GOLD
  had fallen to 6-19 / 6-13 for most machines); KNIGHT 440 -> 430 HP (WHITE / RED were +10 / +12); JUKEBOX 420 -> 380
  HP but +32% note damage a volume level (was +25%: it was easy early, hopeless late). 1000 runs, WHITE / RED / GREEN /
  BLACK / BLUE / GOLD: KNIGHT 68 / 62 / 32 / 26 / 15 / 11, TESLA 59 / 52 / 39 / 30 / 23 / 14, JUKEBOX 64 / 55 / 31 / 23 /
  12 / 10, JOKER 58 / 52 / 34 / 25 / 17 / 11, BANKROLL 61 / 58 / 41 / 34 / 22 / 18. Left: KNIGHT's early ease, JUKEBOX's
  late, and the Dealer's spread by machine (TESLA 83-91% when reached, KNIGHT / JUKEBOX 34-64%: BUST blanks a payline
  reel, and TESLA's lightning charges off the payline).
- **Big choices SECOND PAYLINE and THE LONG GAME (user's picks, 2026-10-14; the first step to more paylines):**
  SECOND PAYLINE: the row above your payline pays its own pairs and jackpots at half (they hit, block and fill your
  meter, but pay no chips and heal nothing; Charms and relics stay the main line's), and enemies hit 15% harder (X1.15
  2ND LINE on their hits). THE LONG GAME: everything pays 15% less now, +4% for every fight you win after. Forced from
  act 2 (300 runs, GREEN): SECOND PAYLINE KNIGHT +2, TESLA +9, JUKEBOX -2, JOKER -3, BANKROLL +8 (it was +17 when its
  chip groups paid chips); THE LONG GAME WHITE -1 to -5 (short runs), GREEN 0 to +13 (long ones).
- **GLASS (user, 2026-10-14):** a Charm for attack symbols and shields: X5 / X6 / X7 (up to X10), added into its
  group like GOLD, but each time its group pays it has a 1 in 4 chance to shatter for good (SHATTERED!, and the run's
  build loses that Charm). Sim 1000 runs WHITE / GREEN: KNIGHT 64 -> 70 / 32 -> 31, TESLA 54 -> 60 / 36 -> 39, JUKEBOX
  62 -> 66 / 30, JOKER 56 -> 57 / 37 -> 34, BANKROLL 58 -> 63 / 41 -> 40 (a big early burst that runs out).
- **New relics (user's picks, 2026-10-14):** DRY SPELL (each spin with no pair: the next pair or jackpot pays +25%,
  stacking to x3), PUNCH CARD (every 10th fight won: a legendary pick), GOLDEN SPIN (1 spin in 10 pays x3, with its own
  banner), INSURANCE POLICY (first drop under 25% HP a fight: 100 shield), HOUSE TAX (each enemy jackpot pays you 2
  chips), REGULAR (one more play at every encounter game), and machine relics CERTIFIED HITMAKER (JUKEBOX: each DROP in
  a fight +25% on the last), HOUSE OF CARDS (JOKER: each jackpot meter payoff adds a WILD to reel 2 for the fight),
  GOLDEN PARACHUTE (BANKROLL: a lethal hit costs 20 chips instead, once a fight; with PHOENIX FEATHER, two saves).
  REGULAR, HOUSE TAX and PUNCH CARD never sit in the starting pick. Sim (1000 runs WHITE / GREEN, before -> after):
  KNIGHT 69 -> 64 / 34 -> 32, TESLA 58 -> 54 / 40 -> 36, JUKEBOX 68 -> 62 / 35 -> 30, JOKER 58 -> 56 / 44 -> 37,
  BANKROLL 60 -> 58 / 44 -> 41. Alone each costs 0-3 (noise); together they thin the stronger relics out of the offers.
  It moved WHITE onto its 60 target; GREEN JUKEBOX (30) is now the low one.
- **Relics:** 65, in common, uncommon and legendary tiers; some are machine identity relics. `src/core/relics.ts`.
  To list exactly what players read: `npx tsx tools/content/audit.ts`. Every machine should have a shield build:
  BANKROLL's is ARMORED CAR (shield counts as chips for HIGH ROLLER), SAFE DEPOSIT (chips also hit for the shield
  gained that spin) and SHIELD BASH (KNIGHT's, open to BANKROLL too).

## HIGH STAKES (`src/core/stakes.ts`)
Each machine has its own ladder. Winning a run at your best stake unlocks the next one.
WHITE (base) → RED (scar rocks) → GREEN (the Wheel starts fast, **Act 3 on**) → BLACK (the House cheats) →
BLUE (act 2 abilities faster) → GOLD (every ability faster, bosses +8% HP). From BLACK, enemies also hit 7% harder a
stake (BLACK +7%, BLUE +14%, GOLD +21%; shown as X1.07 BLACK on their hits).

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
  harder, paying a tier more), except MARKED DECK: one mark on your reels a fight, and it never stacks (user,
  2026-10-14; it was 1 mark per reel a level, so 9 at III; it pays a relic now, not a legendary). Legendary picks top up with normal relics when fewer than 3 legendaries are left.
- **MAKE IT RAIN counts at most 100 chips (user, 2026-10-12).** The sim's BANKROLL rarely holds that many (median 34
  in Act 3); its big hits were the multiplier (~25 GOLD Charms from BANK VAULT x HIGH ROLLER).
- **JOKER (user, 2026-10-12):** 380 HP (was 320) and its jackpot payoff no longer heals. Its healing grew with its WILDS
  (5 HP a spin in Act 1, 16 in Act 3), so Act 3 never killed it: GREEN 53 -> 44, WHITE 56 -> 57.
- **Boss clarity (user, 2026-10-12):** every boss's rules are short rows, each with the icon the fight uses, then a
  green HOW TO WIN line (`src/ui/bossRules.ts`). The boss card's back shows them; in a boss fight, tap its HUD (the "?")
  and the same card opens over the paused fight. ALL IN shows in two places (its banner, the table panel).
- **COPY RUN (user, 2026-10-12):** the run-over screen's COPY RUN copies the whole run as text (machine, stake, seed,
  every fight with spins and HP, picks, buys, big choices, the end build, encounters, what killed you; `src/core/runLog.ts`)
  to paste into a chat for balance checks.
  The main menu's COPY LAST RUN copies the last finished run's text (it survives a refresh; key `slotvslot.lastrun.v1`).
  Beating the Dealer saves the KEEP PLAYING screen: a refresh there CONTINUEs back to it.
- **FEEDBACK is gone (user, 2026-10-13):** MIXTAPE already keeps the record from skipping. JUKEBOX WHITE 68 -> 67, GREEN 36.
- **The rooms (user, 2026-10-13; v2 and v3 after the playtesters loved v1):** `src/render/rooms.ts`, chunky pixels
  (320x180 x4), drawn where the fight leaves the screen open (the side strips, the column between the HUDs, the
  floor), with a quiet zone (a shadow pool) behind the turn text. Act 1 THE ALLEY: rain and puddle rings, pigeons on
  the laundry line (they scatter on your jackpot), a cat (it leaps up the fire escape), a doorman and the DEN door (the
  peephole slides; it swings open on your jackpot), the DEN neon in a puddle, window tenants, a rat, a gutter, a
  bookie's board, car headlights. Act 2 THE FLOOR: vertical neon CASINO / LUCKY 7, a neon cowboy waving (no words:
  a 777 JACKPOT sign read as UI), camera domes that turn to whoever spins, gamblers with stories (coins spill; a sore
  loser bonks his machine), a waitress (drops her tray on their jackpot), balloons on yours. Act 3 THE VIP ROOM: a
  three-tier chandelier (it swings on your jackpot), portraits of the House and THE WHEEL whose eyes follow the play
  (a boss's own frame is empty in its fight), Slot Machines under glass, a pianist, a champagne tower that fills on
  your jackpot, velvet ropes, cigar haze. ENDLESS goes round them, darker and more gold each loop, and escalates (user, 2026-10-14): a
  back row of fans fills in (2 a loop), loose bills drift down the strips from loop 2, spotlights sweep from loop 3, and
  THE OWNER brings spinning red beacons and a faint red pulse (under 0.06), and his office takes the column. Bosses take the
  column: the House's vault (loses rivets with its HP, ajar under 30%; guards; gold on the floor), THE WHEEL's table
  at an angle with its croupier, the Dealer in person behind his felt. The corner crowd dresses for the room: your
  jackpot they jump, theirs hands on heads; under 30% HP one can't look. The room stays behind the Cashier, the
  encounters and the drafts (dimmed). Tints stay under 0.1 (no flashes).
- **GO FOR BROKE converts half the shields (user, 2026-10-13),** rounded down on each reel, not all: all of them made
  one-symbol reels, every spin a jackpot (a friend's JUKEBOX won acts 2-3 in 1 spin). GREEN, 1500 runs, taking it vs
  not: TESLA 75% -> 55% (40% without), JUKEBOX 56% -> 40% (34%); run win TESLA GREEN 42 -> 40, the rest +-1.
- **Slime pair cleanses (user, 2026-10-13):** a slime pair cleanses the slime on its two reels; a slime jackpot still
  cleanses everything (1500 runs: WHITE / GREEN KNIGHT 66->67 / 34, TESLA 59 / 42, JUKEBOX 68 / 36, JOKER 58->59 /
  42->44, BANKROLL 63->64 / 43->45). THE HOUSE's countdown counts the turn it waits after its bar fills (it read IN 3,
  IN 2, NEXT, NEXT; now IN 4, IN 3, IN 2, NEXT). RED OR BLACK and the dice pay at the call (a quit can't re-roll), but
  the chip count changes when the ball / dice land (it went up mid-spin, so a win looked unpaid).
  PAUSE, the boss card and the tutorial callouts mute the reel-spin loop until the fight goes on (it droned on).
  TWENTY-ONE's WALK AWAY shows CONTINUE (it was drawn as the first buy-in card, PAY 6 CHIPS, and led on to the shop).
  A 4-card draft uses the full width (cards 222 wide, taller); card titles take the biggest size that fits. CHIP
  Charm text says PER FIGHT (it still said PER ROUND).
- **Heals explained (user, 2026-10-13):** machine cards name the base payoff heal (TESLA 5 a lightning strike,
  BANKROLL 20 a full HIGH ROLLER bar, JUKEBOX 20 a DROP; JOKER none). A payoff heal is one number; made of several
  (the meter's, VAMPIRE FANG, GROUND WIRE) it names each under the HP bar ("+15 LIGHTNING +15 FANG"). A storm's heal
  is per strike, so a 3-strike storm heals 15 with no relic. COPY RUN lists BONUS WHEEL / RELIC RUSH prizes. No sim change.
- **Playtest C fixes (2026-10-13):** a refresh between the Dealer win and an ENDLESS bust no longer records the run
  twice (the hiscore entry is found by `run.rideAt`, not held in memory); in a run the small QUIT button is now PAUSE
  (phone had no Escape: GLOSSARY, SETTINGS, QUIT, ABANDON live there); PAUSE takes taps before the boss card, and
  Escape / Space / Enter close the card; the Dealer's card back fits (no blurb, smaller rows when needed); deal banners
  read BUST and ALL IN; ALL IN's ENDLESS growth stops at 60% (the boss one-turn cap: the shown range promised more);
  the Dealer keeps a faster clock (FAST HANDS, QUICKENING, BLUE/GOLD) in hands 2 and 3, and its rules say the real
  cadence (BLUE run win -1/-1/0/-1/0, Dealer -3 to -7); COPY RUN uses card titles (big choices, every one a stop
  took, edges once at their level, encounters by name and result, CHIP not goldbar, the start relic); PAIR's glossary
  line says reels 1 and 2; BUSTS and LV count as keywords; bets show MAX min(limit, chips); keyword boxes sit under
  the hovered card; CONTINUE after a Dealer win reads KEEP PLAYING: ENDLESS; "ALL IN IN 2" reads "ALL IN: 2 TURNS".
- **Wording (user, 2026-10-13):** FIGHT, never ROUND, for a fight (every "each fight" effect triggers on fights only,
  never after encounters); relics name your meter (LIGHTNING, VOLUME, JACKPOT METER, HIGH ROLLER), not YOUR METER;
  PAYS XN for multipliers, HITS FOR N for flat damage; SABOTAGE is a keyword. COUP DE GRACE: swords pay x2 while your
  current HP is higher than the enemy's (KNIGHT WHITE 67 -> 66, GREEN 35 -> 34: noise).
  Machine cards are a short gist, not exact numbers (user): BANKROLL's says chips hit, win chips, hit harder the more you hold, and jackpots make it rain.
- **Keywords (user, 2026-10-12):** 17 keywords (PAYLINE, PAIR, JACKPOT, WILD, SHIELD, PIERCE, HEAL, CHARM,
  LEVEL, METER, BUST, ALL IN, SABOTAGE, MARK, SLIME, ROCK, BOMB) each have one colour, drawn wherever they appear on draft cards,
  big choices, Cashier and relic tips and boss rules (`src/ui/keywords.ts`, drawRich). Hovering a draft card lists its
  keywords beside it; PAUSE -> GLOSSARY lists them all. Add a keyword there, not in the texts.
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
