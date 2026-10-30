> **The v1.0 base (2026-10-29).** This is the live game (HP fights) that v1.0 is built on; `docs/ROADMAP.md` says
> what changes. Keep it current as rules change. Its SCORE RACE sections describe a parked experiment, not the game.
> (From 2026-10-16 to 10-28 this file was marked legacy while a rebuild was tried; the rebuild is parked.)

# Slots vs. Slots: the game as it is today

Read from the code on 2026-10-11. When the code and this file disagree, the code wins, so fix this file.
Every number here is a starting point: balance is being redone (see `ROADMAP.md`).

## The pitch
An 8-bit roguelike where two slot machines fight. The reels decide most of a fight; in it you can HOLD a reel (below).
Enemies cheat by writing on your machine (slime, rocks, stolen cells, frozen reels, bombs...). Most of your agency is
between fights: which path to take through an act, which card to draft, what to buy at the Cashier, what to gamble at
an encounter, and which Charms and relics to build.

## Phase 1: OVERTIME, HOLD and AUTO (user, 2026-10-29)
- **AUTO is off by default:** a new player presses SPIN (saved prefs keep their choice).
- **OVERTIME, a fight clock in every act** (`OVERTIME` in `src/core/enemies.ts`): from round 8 (a round is your spin
  and the enemy's: SPIN 15 on the counter), every hit on both machines pays x1.25, +0.25 a round. Hits are the groups
  that hit (swords, sevens, aces, notes, chips) and TESLA's strikes; shields don't grow (a clock that grows defence
  can't break a shield stall), nor does TESLA's charge (growing it grew every storm and its heals). The one-turn caps
  stay. It replaces act 3's enemy-only ramp (`TUNE.rampPerTurn` now only reaches THE OWNER, who has no OVERTIME: he
  escalates already). The HUD counts OVERTIME IN 3 / 2 / 1, then OVERTIME XN; a banner when it starts; each pay's climb
  names it. The researcher's precedents (TFT, The Bazaar, Backpack Battles) are in `docs/RESEARCH.md`.
- **HOLD** (`HOLD` in `src/core/run.ts`): 2 a fight. Tap one of your reels before your spin, or while the enemy's turn
  plays (the engine is on your turn by then), to keep its symbol for your next spin; tap again to let go. Keys Q W E;
  on a pad the d-pad (left, up, right) while a HOLD can be made. Nothing ever
  waits for it: AUTO never stops. Sabotage that lands on a held reel stays on it (the gamble you took); a frozen reel
  can't be held. Shown: HOLD 2: TAP A REEL under your machine while a tap would hold, a gold HELD frame, and PAIR! HOLD
  IT FOR A JACKPOT? after a pair. The tutorial explains both (and its first pair stops on a HOLD callout); the glossary
  has HOLD and OVERTIME. The sim bot holds a paying pair of its attack symbol (a shield pair when low).
- **ONE STORM A TURN (user, 2026-10-29):** TESLA's lightning gathers every charge of a turn (CAPACITOR, each bolt
  group, SECOND PAYLINE, JACKPOT BELL) and fires once, after them all. Two bolt groups (bolts on reels 1 and 3 are no
  pair) fired two storms, each with its own LIVE WIRE cost and heals: 11-16% of TESLA's storm turns. Sim: TESLA WHITE
  66 -> 67, GREEN 53; the other machines unchanged. TESLA's swing (27% of its spins deal nothing; THE DEALER beaten 91-96%
  when reached) is a rework still to design: its strike count and each strike's damage both scale.
- **Sim, 300 runs, both live** (before -> after): fights past 12 of your spins (regular / boss), attack build, WHITE
  655 / 95 -> 276 / 33, GREEN 921 / 206 -> 422 / 146. Run win WHITE / GREEN: KNIGHT 72 / 39, TESLA 66 / 54, JUKEBOX 65 /
  45, JOKER 56 / 41, BANKROLL 60 / 47 (targets 60 / 36): easier, TESLA at GREEN most (THE DEALER 94% when reached).
  Not tuned: balance is phase 5's pass (ROADMAP).

## The cut and the act 1 feel pass (user, 2026-10-15)
The game had too many systems to feel like one game, so it was cut down (the user's picks from a cut list), then act 1
was tuned for feel from two fresh-eyes playtests.
- **Cut:** BONUS WHEEL and RELIC RUSH; the BIG CHOICES bonus round after bosses (10 became legendary relics, below);
  24 relics (74 -> 50: 8 common, 26 uncommon, 17 legendary); RED OR BLACK, HIGHER OR LOWER, UNDER OR OVER; HOUSE EDGES
  (ENDLESS keeps TONIGHT'S RULE; the daily gets a rule of the day); THE WEEKLY and CHALLENGES (and their titles and
  achievements). Saves: anything cut is dropped or converted on load (a taken big choice becomes its relic).
- **Big choices kept as legendary relics** (each keeps its trade-off; `LEGEND_RELIC` in `src/core/relics.ts`): SECOND
  PAYLINE, DEVIL'S DUE, THE LONG GAME, QUICKENING (not KNIGHT), GLASS CANNON, CRUSADE (KNIGHT), CHAIN LIGHTNING (TESLA),
  HIGH CARD (JOKER), HYPE MAN (JUKEBOX), OPEN BAR (BANKROLL).
- **Levels:** no Charm levels; uncapped symbol levels, +6 a level; each boss pays your attack symbol one; STAR CHART.
- **Balance after the cut and the draft/Cashier split** (2026-10-15): the boss level (KNIGHT: 3), KNIGHT 390 HP,
  TESLA 315, JOKER 390 (meter 50 a WILD), JUKEBOX 395, BANKROLL 290; 6 chips a win. Sim 1000 runs, WHITE / RED / GREEN /
  BLACK / BLUE / GOLD (targets 60 / 50 / 36 / 28 / 20 / 14): KNIGHT 70 / 63 / 32 / 25 / 13 / 9, TESLA 59 / 52 / 42 / 32 /
  20 / 17, JUKEBOX 62 / 57 / 35 / 24 / 12 / 6, JOKER 58 / 51 / 35 / 30 / 16 / 12, BANKROLL 67 / 66 / 41 / 32 / 22 / 17.
- **Never a portrait / "turn your phone" screen (user, 2026-09-24, bd4d7b4):** it got stuck and locked players out.
  It came back by mistake on 2026-10-15 (64618c0) and was removed again. The game always starts, in any orientation.
- **HOLD was tried and cut (2026-10-15):** tap a reel to keep it for your next spin after a PAIR, 2 a fight (commit
  f7708bb, reverted). It played fine, but a good build ends fights in a spin or two, so it fades as the run goes on,
  and capping damage to keep it alive would kill the payoff. Fights stay watch-only, and one-spin kills are the
  payoff of a good build, not a problem (user).
- **Feel (act 1):**
  - THE PAYOUT LADDER: a pay is sized by the HP bar it lands on. Under 30% it's a quick PAIR! / JACKPOT!; 30% is
    BIG WIN! (cyan), 65% MEGA WIN! (pink), each with more confetti, hitstop and zoom. The enemy's read BIG HIT! /
    HUGE HIT! (`LADDER` in `src/present/director.ts`).
  - THE CLIMB: your pay builds on screen from the base, through the line (x3 JACKPOT) and each multiplier the engine
    noted (x1.5 DRY, VOL +32%...), with a rising ding a step, then slams on the engine's exact total (`climbSteps`).
  - Pace: an enemy turn that hits for under 8% of your max HP plays at double speed. Act 1-2 regulars and elites
    start their ability two charges in, so it fires in 93-99% of act 1 fights (was 69-92%).
  - Danger: under 30% HP the screen's edges breathe red (under FLASH_CAP), your HUD frame pulses red and a heartbeat
    opens each enemy turn.
  - JOKER: a WILD fills 50 of its 100 meter (was 20: in act 1 the payoff never showed; 40 -> 50 after the WILDS fix
    below took HOUSE OF CARDS' leftover WILDS away: sim 45 / 25 -> 57 / 35 WHITE / GREEN).
  - Feel playtest #2 fixes: WILDS a fight adds (HOUSE OF CARDS, LUCKY NIGHT) end with the fight (they were kept for
    good); COUP DE GRACE shows on the pay (X2 COUP) and every relic boost names itself (X2 PRISM, X1.5 UNDERDOG...);
    shields stay off the BIG WIN ladder; BLOCKED! / SHATTERED! no longer cover the reels; the CLAW counts the goes left;
    "1 TURN" plurals; the slime meter reads SLIME n/m; the Charm codex and glossary come from the live rules.
  - Fixes: no relic draft right after an elite's spoils; WALK AWAY leaves an encounter at once; TWENTY-ONE's hand
    counter; FIGHT 1 (not FIGHT 1 OF ?) before the path pick; danger skulls from each enemy's sim kill rate;
    the first tap on a phone counts (fullscreen resized the canvas mid-tap); the boss heading says what the heal gave; the act 2 cowboy (read as a placeholder stick figure) is now neon cherries on a
    bulb-lit board.

## A run
- **An act is a map** (`generateActMap` in `src/core/enemies.ts`): a shared opener fight, then you **pick 1 of 3
  paths** of 5 stops each, then the paths rejoin at the Cashier and the boss. Every stop and enemy is shown up
  front; you never choose fights along the way. The three paths have different shapes (`ROUTE_SHAPES`) and never all
  the same number of elites. ENDLESS loops are maps like the acts' with 2 paths (user, 2026-10-14), so they have encounters too; table limits
  grow by half each loop.
- **Stops:** FIGHT, ELITE (more HP and hits 25% harder, shown as X1.25 ELITE on its hits; pays a pick of 2 relics, in every act), CASHIER, ENCOUNTER.
- **Encounters** (`src/core/encounters.ts`) are gambles between fights. On the map they're gold "?" boxes: which one
  it is stays secret until you arrive. Seeded by the stop, so a quit can't re-roll one. All are games now:
  - **Games:** chip tables: a chip bet (TWENTY-ONE, HIGHER OR LOWER) or a price a go (the CLAW). Mostly chip prizes;
    the CLAW also holds 2 Charms and a relic. REGULAR adds plays (hands, goes, games).
  - **v1.0 has three (user, 2026-10-29): TWENTY-ONE, the CLAW and HIGHER OR LOWER.** LUCKY SEVENS is gone ("nobody
    ever wins it"); SCRATCH-OFF (a blind pick) and RAT RACE go to after launch (their code is on the `parked-rebuild`
    branch). A saved stop of any game that's gone becomes HIGHER OR LOWER, and a game in play there starts over.
  - HIGHER OR LOWER (back, user 2026-10-29: "it had some actual tension"; cut 2026-10-15 with RED OR BLACK and UNDER
    OR OVER as near-identical coin flips): TWENTY-ONE's chip table. Bet up to 20 and a card is turned (2 to ace, drawn
    fresh); call the next HIGHER or LOWER. Right: the pot grows x1.35 (rounded down, at least a chip). Wrong: the pot
    is gone. The same rank is a push (call again). CASH OUT any time after a right call; the 6th right call pays the
    pot out. One game a visit; HIGHER is off on an ace, LOWER on a 2. The game in play is saved with the run. Sim bot
    (call the likelier side, cash out at 3 right, or 2 on a 6-10): about +10% on the bet; cashing out blind at a fixed
    count returns 99-102%. Sim, 300 runs WHITE / GREEN, in for LUCKY SEVENS: no change past noise (KNIGHT 69 / 39 ->
    69 / 40, TESLA 67 / 53 -> 68 / 54, JUKEBOX 65 / 44 -> 66 / 44, JOKER 59 / 38 -> 58 / 38, MIDAS 61 / 45 -> 61 / 47).
  - TWENTY-ONE: blackjack, hit or stand only (no double or split; the dealer stands on 17). A tie is a push
    (user, 2026-10-14): the bet comes back and the hand is dealt again, without using up one of the 3 (sim, 1000 runs: no change). A chip table (user, 2026-10-13: upgrades from cards felt wrong): bet up to 20, 3 hands a visit; a win
    pays 1 to 1, a two-card 21 pays 2 to 1. Cards drawn in code; the hand in play is saved with the run (sim: run win
    -1 to 0).
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
    stop becomes HIGHER OR LOWER, a debt is forgiven). Sim, 1000 runs WHITE / GREEN: KNIGHT 66->69 / 34, TESLA 59->58 / 40,
    JUKEBOX 67->68 / 36->35, JOKER 58 / 45->44, BANKROLL 62->60 / 44.
  - Paths: 12 shapes now, two of them with three encounters (fewer fights, more gambles).
  - **Cards and words:** buy-in cards all look alike (no LOW / HIGH labels: the player judges the bet). A buy-in you
    can't win back says PAY, not STAKE. No flavour-text subtitles.
- **THE REPO MAN** is a regular in acts 1-2 (he takes a Charm for his fight; it comes back after).
- **After every win:** no heal (user, 2026-10-12: HP carries from fight to fight, so survivability and VAMP matter;
  the act's boss heals you fully). Then a **draft** (pick 1 of 3 cards). **The draft only edits your reels** (user,
  2026-10-15, cut list #8: the draft and the Cashier did the same job): add, swap or clear symbols, WILDS, Charms. No
  relics, levels or heals in a draft.
- **The Cashier** is a stop: on some paths, and always right before the boss (plus a visit when a new act opens). It
  is what you save chips for. The counter: two symbol LEVELS (10 chips + 4 a level gained this run; your attack symbol
  is one of the two most visits), MAX HP +40 (5) and the HEAL (up to 120 HP, 6 chips + 3 a heal bought this run, once a
  visit). Behind the glass: two relics (10; the first one of your machine's or your Charms') and **THE BIG ONE**, a
  legendary relic under a spotlight (24 in act 1, 20 after). Rerolls cost 1, then 2, 3... Chips: 6 a win (was 3 before
  the split), elites +2, jackpots +1, interest +1 per 5 banked (max 3). `shopOffers` in `src/core/run.ts`.
- **After a boss:** your attack symbol goes up a level (two with STAR CHART: "SWORDS LEVEL UP: LV3" on the next
  screen), then a legendary relic pick (1 of 3). (The BIG CHOICES bonus round and BONUS WHEEL / RELIC RUSH are cut:
  see THE CUT below.)

## Acts and bosses
| Act | Boss | Mechanic | State |
|---|---|---|---|
| 1 | THE HOUSE | A growing pot. Every 3 turns it skims half the pot as a hit. Doubles down at half HP; LAST CALL skims every turn | Done |
| 2 | THE WHEEL | Places bet chips on your reels. Your pairs sweep them. At NO MORE BETS, every chip left hits for a share of your max HP. Spins faster at half HP | Rework in progress, untuned |
| 3 | THE DEALER | Three hands, each with its own HP bar (27/31/42% of its HP). 1 THE DEAL: every 3 turns a BUST (your best reel's payline pays nothing next spin). 2 RAISE: its hits x1.5, still BUSTs. 3 ALL IN: every 2 turns, 25-40% of your max HP through shields | Reworked 2026-10-12; spread by machine is still wide (see ROADMAP) |

Act 3 is played at stake GREEN and up. **ENDLESS** comes after the Dealer:
KEEP PLAYING goes on into loops until you bust (user, 2026-10-14: no RIDE AGAIN / CASH OUT); your score is the pot
(x1.5 + 1500 a loop cleared) plus your chips x10. Sim (GREEN, the bot never stopping, before THE OWNER): loops cleared median 4.
**TONIGHT'S RULE** (user, 2026-10-14): each loop deals two different rules, one per path (user: the rule is part of the
route choice; the loop's opener plays without one), for both machines, never last loop's (`NIGHTS` in `src/core/run.ts`): HAPPY HOUR (jackpots pay x2), HIGH LIMIT (wins pay x2 chips, enemies +15% HP),
LUCKY NIGHT (2 more wilds a reel), SHOWDOWN (every hit x1.5), IRON NIGHT (shields block x2), FAST NIGHT (abilities 1
turn faster, meters fill x1.5). Shown on the path pick, the side panel and the fight label. TONIGHT'S RULE is ENDLESS's
only twist now (HOUSE EDGES are cut, 2026-10-15).
Sim GREEN: loops cleared median 4 -> 5.
**THE OWNER, the TURBO boss** (user, 2026-10-14: a new boss, insanely hard; then: make him a fight, not a wall): loop
5's boss, the man who owns the casino (`OWNER`, `OWNER_RULES`, `TURBO` in `src/core/enemies.ts`; his office in the room's
column). Every 2 turns he cheats: every other time a new trick (a spill, a theft, a freeze, rocks, a jinx, IOUs), the rest
THE HAMMER, 40% of your max HP through shields, named on his HUD before it lands (THE HAMMER IN 2). No turn of his takes
more than 45% of your max HP, but every turn he takes raises that cap and his hits by 7%, and at 75 / 50 / 25% of his
HP he hits 15% harder each time (a banner: HE LOOSENS HIS TIE, HE STANDS UP, HE GOES ALL IN).
**11 HP, a hit each (user, 2026-10-15):** he has 11 HP and a turn that hits him takes exactly 1, however big or many the
hits (a LIGHTNING STORM is one hit; it stops after it lands and keeps its charge). Shields, multipliers and VETERAN don't
matter against him and he never heals: the fight is surviving long enough to land 11 hits. Beating him ends the run,
won (YOU BROKE THE BANK, achievement BROKE THE BANK); every HP you take scores 1,000. (Taken literally, "every hit"
let TESLA's storm kill him on turn 1: 72% of meetings lost. At 1 HP a turn: 10 HP lost 9.6% (JOKER 18%), 11 HP 7%
(JOKER 13%), so his rise went 6% -> 7%; the user's bar: no machine over 2%.) Sim (1000 runs, GREEN riders): met 1026,
beaten 1.3% (BANKROLL 1.5%, TESLA 1.3%, KNIGHT 1.2%, JOKER 0.9%, JUKEBOX 0%), fights 10 turns median, 45% of his HP
left median. Reach him: KNIGHT 51%, JUKEBOX 40%, JOKER 60%, TESLA 80%, BANKROLL 84%.
**VETERAN and WARM-UP (user, 2026-10-15):** KNIGHT and JUKEBOX had no late growth in ENDLESS (making the loop 3 Dealer
easier only moved KNIGHT's death to loop 4: his HP 6 -> 3 took loop 3 from 30% to 52% and loop 4 from 56% to 43%).
VETERAN: in ENDLESS, KNIGHT's swords and shields pay +100% for every loop cleared (X2 in loop 2, X5 at THE OWNER).
WARM-UP: in ENDLESS, every JUKEBOX fight starts at volume 3 x the loop, never past 5 (one note short of THE DROP).
Both are named on the LOOP CLEARED screen, and VETERAN on every payout it boosts. Enemies don't change (honest HP).
Sim (400 runs, GREEN riders, reach THE OWNER): KNIGHT 10% -> 56% (loops 1-4 79/98/84/85), JUKEBOX 33% -> 44%
(82/87/85/72). WARM-UP is weaker than it sounds: JUKEBOX's ENDLESS deaths are attrition (it walks into fights at
14-40% HP, often with max HP sold) and the loop 1 HOUSE, not a slow start; even volume 5 every fight only made 48%.
The main game is untouched (1000 runs WHITE / GREEN identical).
**Loops get harder (user, 2026-10-14):** ENDLESS growth ramps faster (ramp 0.05 -> 0.1) and the loop HOUSE and WHEEL are
as big as the loop Dealer (5 / 5 / 6 loop bosses' base). Loops cleared (GREEN riders, L1-4): KNIGHT 80/79/31/60, TESLA
91/95/99/98, JUKEBOX 81/79/77/64, JOKER 94/91/93/82, BANKROLL 97/98/96/94 (was ~90/90/82/91 overall). Each loop multiplies enemy HP and damage,
and the multiplier grows every loop, so it gets harder exponentially in theory. Playtesters still reached loop 5,
so that isn't happening in practice (see ROADMAP).

## Enemies
The casino-town cast (user, 2026-10-30; code ids keep the old names: slime, brute, frost, thief, golem, gremlin, bomber,
hexer, vampire). Words: SPILL (was SLIME), IOU (was BOMB), JINX (was HEX), ROCK stays.
- **Act 1 (the Alley):** THE BARFLY (SPILL), THE LEG BREAKER (THE SWING), THE COOLER (COLD STREAK), THE PICKPOCKET (STEAL),
  THE FENCE (ROCKS), THE MECHANIC (JAM), THE REPO MAN. Every enemy's rocks crumble after the fight, an elite's
  too (user, 2026-10-30: an elite's stayed for the run, which confused).
- **Act 2 adds (the Floor):** THE LOAN SHARK (IOUS), THE JINX (a jinxed reel pays half; user, 2026-10-30: its Charms stay
  lit), THE LEECH, THE COUNTERFEITER (LAUNDER). THE COPYCAT (was MIMIC) is cut (user, 2026-10-30: hard to balance, confusing
  when it hit). (The GROUNDER is retired.) BLUE stake puts your counter (the COUNTERFEITER) on every act 2 path.
- **Act 3 adds (the VIP Room):** THE CARD SHARP, THE PIT BOSS (AUDIT), THE CROUPIER. The Loan Shark, the Leech and the
  Jinx come back.
- **Names:** a regular enemy is an adjective plus its name (SHADY BARFLY): GRUMPY, SNEAKY, SHADY, SLICK, CROOKED,
  TWO-BIT, BROKE, SPITEFUL, DESPERATE, GREEDY.
- **Enemy HP is honest:** the same enemy has the same HP at the same stop on every machine and every build
  (fixed curves by act and fight; elites x1.25 / x1.3; the House, THE WHEEL and the Dealer have fixed HP). Machines are
  balanced by tuning the machines. Code: `makeEnemy`, `DEPTH_HP*`, `TUNE` and `ENDLESS` in `src/core/enemies.ts`,
  `enemyHp` in `src/core/run.ts`.

## Slot Machines (`src/core/cabinets.ts`)
Each machine except KNIGHT has one signature symbol and a meter.
| Machine | Hero | Attack symbol | Meter | Unlock |
|---|---|---|---|---|
| KNIGHT | SIR REGINALD | sword | none: half swords, half shields, both from level 2 (470 HP) | start |
| TESLA | DOC VOLTZ | bolt | bolts charge lightning that ignores shields | reach the House |
| JUKEBOX | DJ DECIBEL | note | notes raise the volume; at max THE DROP makes every visible note hit | beat the House |
| JOKER | JESTER JAX | ace | wilds fill a meter; then all 3 payline cells pay as jackpots | beat the House with wilds |
| BANKROLL | CASH CASSIDY | chip (`goldbar`) | chips hit, pay chips and fill HIGH ROLLER; a chip jackpot makes it rain | clear a run |

BRIAR / THORN is retired and removed from the code (the JUKEBOX replaced her). Old saves map her unlock and stakes to
the JUKEBOX; a saved BRIAR run or hiscore entry is dropped on load.
Code ids differ from display names: `midas` is BANKROLL and `joker` is JOKER.

## Charms and relics
- **Charms live on cells** and have **no levels** (user, 2026-10-15): each has one value (GOLDEN TICKET: one step
  stronger). Pay = BASE × MULT, and gold Charms in a group ADD.
- **Symbol levels live on the symbol TYPE, with no cap** (user, 2026-10-15: like Balatro's planets): a symbol is worth
  10 + 6 a level above 1 (`SYM` in `src/core/charms.ts`). Hard to stack: levels are only sold at the Cashier (10 + 4 a level
  gained this run), and each act boss pays your attack symbol one (KNIGHT: three). STAR CHART (uncommon relic) doubles every level you gain. Charms: GOLD, KEEN, VAMP, LUCKY, CHIP (`lucre`), plus
  machine-locked CHARGED and BLAZE (TESLA), TRICK (JOKER), ECHO (JUKEBOX) and BULWARK (`spiked`, KNIGHT).
  `src/core/charms.ts`.
- **ENDLESS playtest fixes (2026-10-14):** a side at 0 HP can't be healed (a storm's heals on the enemy's turn revived
  TESLA from 0 HP, 23% of its runs: TESLA GREEN 39 -> 37); a LIGHTNING STORM stops once THE OWNER's turn cap is reached
  (it fired thousands of 0-damage strikes, each healing); PUNCH CARD tops up with normal relics once the legendaries
  are gone.
- **Encounter stakes grow with the loop (user, 2026-10-14):** in ENDLESS every price, chip prize and table limit is x(1 +
  loop) (x2 at loop 1, x5 at loop 4: fixed prices stopped mattering against 100-300 chips). HIGHER OR LOWER grows the pot
  x1.35 a call (x1.4 gave an expert +12%); the CLAW's chip prize is 10 (15 was +95% on a 5-chip go).
- **Relic buffs (user, 2026-10-14: the playtest found them worth ~0):** DRY SPELL +50% a dry spin (to x4), PUNCH CARD
  every 6th win, HOUSE TAX 5 chips, REGULAR two more plays, CERTIFIED HITMAKER +60% a drop, HOUSE OF CARDS a WILD on
  every reel, GOLDEN PARACHUTE 10 chips and you land at 25% HP. THE LONG GAME nerfed: -20% now, +3% a win. Sim 1000 runs
  WHITE / GREEN (the seven banned -> in): KNIGHT 70 -> 68 / 33 -> 32, TESLA 60 -> 58 / 40 -> 37, JUKEBOX 66 -> 64 / 33,
  JOKER 62 -> 64 / 42 -> 47, BANKROLL 67 / 44 -> 47.
- **ENDLESS playtest, the real game (2026-10-14):** cards show the HP the fight has (HIGH ROLLERS and HIGH LIMIT are in
  enemyHp); an enemy's flat heal / shield ability grows with the loop's HP (a loop 4 HEALS 80 did nothing), and its
  hits show their loop size on the card; the reward after a loop's boss reads LOOP N CLEARED! POT X (it said THE
  DEALER DEFEATED! on the next loop's pick); the path screen shows POT + CHIPS X10 = SCORE, and the bust screen the
  breakdown; the fight label is short (LOOP 1: FAST NIGHT; it ran across both reels); the side panel shows 3 Charm
  types and +N MORE past 4, in a fixed order (GLASS went missing); a won CLAW prize stays gone (it came back after
  the last go, and vanished before the claw landed); LUCKY SEVENS' walk-away no longer says PULL 1 OF 0; RAT RACE
  has a names column and lights your rat's lane; the death recap no longer scales damage down to your starting HP
  (THE OWNER's one-spin kill from full read 199); the menu says CONTINUE: ENDLESS. Sim: no change; ENDLESS (GREEN,
  518 riders): 1 beat THE OWNER (0.2%).
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
- **Healing (2026-10-15, the draft/Cashier split):** the act boss heals you fully; between bosses the Cashier's HEAL is
  the only heal (up to 120 HP, once a visit, 6 chips + 3 a heal bought this run), plus VAMP, relics and meters. Drafts
  no longer heal (the low-HP heal card and the act 1 catch-up heal are gone).
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

**Re-tune after the ENDLESS calls (2026-10-14):** HOUSE OF CARDS adds its WILD to 2 reels (every reel was +5 GREEN for
JOKER); JOKER 380 -> 360 HP, BANKROLL 330 -> 290 HP (both rose 6-12 on GREEN once THE LONG GAME stopped costing the bot).
1000 runs, WHITE / RED / GREEN / BLACK / BLUE / GOLD: KNIGHT 68 / 61 / 31 / 27 / 15 / 12, TESLA 58 / 51 / 37 / 29 / 21 /
13, JUKEBOX 64 / 56 / 32 / 24 / 14 / 11, JOKER 59 / 57 / 41 / 30 / 22 / 16, BANKROLL 64 / 61 / 42 / 33 / 24 / 19.

## The run score (user, 2026-10-14)
Every run, ENDLESS or not, scores the same way (`SCORE`, `scoreParts`, `runScoreOf` in `src/core/run.ts`):
100 a fight won, 300 an elite, 1,000 a boss (act and loop bosses), 2 a chip EARNED (fights and encounters; spending never
costs score), 100 a level gained (your symbols above their start), 100 a relic (250 a legendary), 25 a
Charm on your reels, 1,000 for each of THE OWNER's 11 HP you take and 10,000 for beating him, 2,000 for clearing the run
all x(1 + 0.5 a stake). The path screen shows the score so far, a cleared loop says
LOOP N CLEARED! SCORE X, and the run-over screen shows it with its biggest parts. Entries saved before it keep the old
formula. Sim (GREEN, 200 runs a machine, bot riding): medians KNIGHT 13.9K, TESLA 11.7K, JUKEBOX 12.2K, JOKER 14.7K,
BANKROLL 17.6K; ENDLESS riders 33-54K. Share of all points: bosses 28%, relics 19%, elites 11%, fights 11%, cleared 7%,
levels 7%, chips earned 7%, Charms 5%, THE OWNER 4%. (The pot and chips x10 are gone.)

## THE SCORE RACE (the race act 1 slice, user 2026-10-15)
> Parked: out of `main` since 2026-10-29 (phase 2); its code is on the `parked-rebuild` branch. Kept here for the record.

The user's idea: HP and uncapped damage compete (your power has no cap, the enemy hits back, and HP never keeps up), so
fights become **competing scores**, like Balatro's blinds. PLAY MODES > SCORE RACE (TEST) plays **act 1 only** (it ends
at ACT 1 CLEARED! after THE HOUSE), at WHITE, filed like the tutorial (no stats, XP, achievements, unlocks or boards).
Code: `RACE` in `src/core/run.ts` (`fightConfig` sets `cfg.race` and the tools; `runActs` is 1), the fight engine's
`raceScore`, `raceLeft`, `raceTurnEnd`, `land`, `nudge`, `respin`, `previewPay`; game.ts `racePhase`, `drawHolds` (the
tray), `drawScoreboard`, `useTool`.
- **A race (user):** both machines spin 5 times (elites 6, THE HOUSE 7), you first and the enemy last, then the scores
  compare (a tie is yours). A hit is score for whoever landed it; nobody loses HP. **One lost race ends the run.**
- **Spin tools (user: 3 HOLDs, 2 NUDGEs, 1 RESPIN a race, used as you see fit).** Before a spin, tap a reel to HOLD it
  (gold HELD frame). SPIN lands the reels; then, while you have NUDGEs or RESPINs, the button reads PAY: tap NUDGE or
  RESPIN in the tray under your machine, then a reel (NUDGE steps it down one cell, the symbol above drops onto the
  payline; RESPIN spins it again). PAY scores it. The race always waits for you (AUTO doesn't play races).
- **The re-theme (user, 2026-10-15: "swords don't make sense without attacks, shield numbers neither"):** in a race
  the enemies are **rival Slot Machines that CHEAT** (their abilities are cheats: GUNK, ICE UP, ROCK DROP, JAM,
  PICKPOCKET, BIG BET, REPO, CASH OUT; `RACE_CHEAT` / `abilityName` in hud.ts), the words are PAY and SCORE, and each
  machine's card on the select screen says how it scores (`raceRule` in cabinets.ts; KNIGHT stays medieval: swords pay,
  shields guard).
- **GUARDS, not shield points:** each shield on your payline gives a GUARD (a count, up to 3; TOWER SHIELD 4), kept
  from spin to spin. A GUARD stops one cheat (GUARDED! A GUARD STOPPED THE CHEAT) and is spent. The HUD shows a pip per
  GUARD. Shield Charms and the spiked Charm aren't offered in a race; ARMORED CAR, SAFE DEPOSIT and SUBWOOFER aren't
  either (`RACE_NO_RELIC`).
- **HOLD frees a reel:** a HOLD on an iced (FROST) or jammed (GREMLIN) reel thaws it and holds it (it can't be let go).
- **New symbols in a race's draft** (45% a draft, `RACE.newSymbolChance`): **CHERRY** (2 a card) is a scatter: every
  cherry in sight pays 30, 3 or more pay double. **X2** (1 a card) on your payline doubles the spin (two: x4).
- **The enemy's score:** its hits (swords, sevens) pay x 2.2 x (its HP / 200)^0.65 (THE HOUSE x1.8, the run's first race
  x0.7): honest HP. Its PAIR! math, payline numbers and SMASH show that real score. No head start on its ability in a
  race (BRUTE's SMASH fired on its first spin, before you could hold a shield).
- **Machines are balanced on their own** (no HP in a race): their payline pays x `RACE.machineMul` (KNIGHT 1.05, TESLA
  1.1, JUKEBOX 1, JOKER 1.45, BANKROLL 1.8). THE HOUSE no longer skims BANKROLL's chips in a race.
- **Playtest fixes (expert playtest, 2026-10-15):** the turn arrow points at you while the race waits on you; the
  button goes back to SPIN after PAY; a NUDGE on a frozen reel says A FROZEN REEL CAN'T MOVE; HOLD in the tray is a
  counter, not a button; CASH OUT says SCORE, not DAMAGE; the RUN OVER table shows each race's score; the draft says
  312 TO 140: RACE WON!; KEEN reads +40 SCORE.
- **The HUD:** a scoreboard between the machines (both scores, YOU LEAD BY / BEHIND BY, a pip per spin each), score
  bars on the HUDs, the rules under the VS, a RACE WON / RACE LOST banner with the final score.
- **Sim** (`tools/out/race.ts`, 500 runs, after the re-theme; GUARDS, CHERRY and HOLD-frees made races easier, so the
  enemy's x1.75 went to x2.2): act 1 cleared KNIGHT 53%, TESLA 53, JUKEBOX 49, JOKER 52, BANKROLL 57; races won 92-97%,
  elites 80-89%, THE HOUSE 74-87%, the first race 94-98%. The normal game's sim is unchanged. (One loss ends the
  run, so ~88% a race compounded to ~40%: the expert playtest called that too harsh; normal act 1 is cleared 70-85%.)
- **Act 1 enemies race their own way** (`RACE_RULES` in fight.ts; their cards say so, `RACE_BLURB` in runScreens):
  SLIME (slimed cells score nothing), FROST (a frozen reel of yours scores half), GOLEM (each of its spins scores 10 x
  its multiplier per rock on your reels; its HUD counts them: 4 ROCKS: +N A SPIN), GREMLIN (a jammed reel scores nothing), THIEF (its ability steals 25% of your
  score: STOLEN!), BRUTE (its SMASH scores x3), REPO MAN (takes a Charm). A GUARD stops any of their cheats, never
  THE HOUSE's cash-out. Their cards name the cheat and its real number (BETS BIG: SCORES n. A GUARD STOPS IT). **THE HOUSE:** its pot (its coins and its cut each spin) cashes 1/2 into its score every 3
  spins, and its last spin cashes the whole pot; your jackpot steals half the pot into your score. In a race the pot holds
  score (it grows x THE HOUSE's multiplier), so what it shows is what it cashes or you steal; it reads TAKES THE LEAD!
  when its next cash-out would put THE HOUSE ahead, and LAST SPIN: ALL n before its last spin. Sim (500 runs, step
  4): races won by enemy BRUTE 68-93%, GOLEM 80-86, FROST 81-91, THIEF 79-87, REPO MAN 80-87, GREMLIN 90-98, SLIME
  91-97; THE HOUSE 55-79.
- **Relics, Charms and the Cashier in a race** (`RACE_RELIC_TEXT` in relics.ts; tooltips and cards use it): UNDERDOG x1.5
  while behind; COUP DE GRACE swords x2 while ahead; PHOENIX once a run saves you from a lost race (no win chips or
  spoils; the side panel says PHOENIX: ONE SAVE); BANDAGE starts each race holding a GUARD; VAMPIRE FANG's meter
  payoffs give a HOLD; INSURANCE gives a NUDGE the first time you fall 30% behind; TOWER SHIELD holds one more GUARD; SHIELD BASH scores 30 a GUARD
  each spin; CAPACITOR charges lightning 20 a GUARD; GOLDEN PARACHUTE is one more RESPIN a race; MELTDOWN +10% lightning per spin played. Nobody heals; a
  VAMP cell takes its heal out of the enemy's score. KEEN's +damage is score (its pierce does nothing). The Cashier
  sells +1 HOLD / NUDGE / RESPIN for the run (8 / 10 / 12 chips; `run.raceTools`) instead of HEAL and MAX HP.

## Modes and meta
- **Modes:** the normal run and ENDLESS. THE DAILY RUN went to after launch (user, 2026-10-29; its code is on the
  `parked-rebuild` branch; a saved daily run is dropped on load, and its three achievements left the list: earned ones
  stay in the save). THE WEEKLY and CHALLENGES were cut 2026-10-15. Old hiscore entries keep their tags.
- **Meta:** CONTINUE (saves between fights), unlocks, achievements, collection, local hiscores. The online leaderboards
  (Supabase) and the name screen went to after launch with the daily; Steam's leaderboards come first.
- **Saves:** localStorage keys `slotvslot.prefs.v2` and `slotvslot.profile.v1`. **Never rename them.** Saves are cleaned on load.
- **Platforms:** the web build deploys to GitHub Pages from `main`. `desktop/` is the Electron + Steamworks wrapper (`npm run build:steam`).

## Code map
- `src/core`: the pure, deterministic rules engine (seeded RNG). `fight.ts` (`Fight.step()` emits ordered
  `CombatEvent`s), `run.ts` (run state, drafts, shop, levels, boss sizing), `enemies.ts` (roster, map, HP curves, TUNE knobs).
- `src/present`: the Director plays the events back with the juice (see `JUICE.md`).
- `src/ui`: menus and run screens. `src/render`: sprite data and the pixel font. `src/audio`: the synth, SFX and code-composed music.
- `src/sim` + `tools/sim`: the sim bot (`bot.ts`), the run player (`play.ts`) and the sim (`tools/sim/balance.ts`, see Balance).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` from hand-authored pixel grids.
