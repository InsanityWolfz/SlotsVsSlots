# Research: what other games learned

The researcher's knowledge base (`.claude/agents/researcher.md`): slot machine, roguelike and battler mechanics,
with sources. Reference only: nothing here is a decision (that's `docs/VISION.md`). The researcher reads this first
and adds to it on every consult.

Source quality: **[P]** primary (developer, regulator, patent, peer-reviewed paper), **[W]** wiki or reference
guide, **[F]** forum, hobbyist or promotional page (treat as anecdote). "Opinion" marks the researcher's own view.
Many fruit-machine pages online are SEO filler that contradict each other; only claims two or more sources agree on
are listed as fact.

## Slot machines
### Fruit machines: holds, nudges, features
- **Why UK machines have buttons at all:** the nudge is credited to Trevor Carter (Carfield Engineers); the skill
  buttons let pub machines read as "games of skill" under UK law. Dates differ by source (1960s vs late 1970s).
  [F] [pubfruitmachines nudge guide](https://www.pubfruitmachines.me.uk/guides/nudge/),
  [stopandstep history](https://stopandstep.com/blog/from-pub-reels-to-digital-terminals-the-history-of-the-british-fruit-machine/)
- **HOLD:** keep one or more reels still while the rest spin. Typical limit: "hold one or two reels while the others
  are spinning". [F] [casinosonline rules](https://www.casinosonline.co.uk/game-guides/fruit-machines/fruit-machines-game-rules.htm),
  [thegamerwire](https://www.thegamerwire.co.uk/finding-fruit-slots-with-nudge-and-hold-features/)
- **HOLD is offered, not owned:** on real AWPs the machine decides when HOLD lights up (not every spin). A
  "compensator" (a virtual float of money the game may pay back) drives chance tables for "the likelihood of nudges
  (losing or otherwise), the likelihood of holds, features". Holds and nudges therefore don't change the long-run
  return; the machine offers them when it can afford to. [F, an AWP coder] [Fruit-Emu: Compensation](https://www.fruit-emu.com/forums/topic/53948-fruit-machines-inside-out-compensation/),
  [Wizard of Vegas: UK compensated slots](https://wizardofvegas.com/forum/gambling/slots/17266-uk-compensated-slots-does-anyone-really-get-what-is-going-on/)
- **"Hold after a win":** we found no source stating a standard rule; player lore ("hold two on the line three
  times and the third drops") is anecdote, and machines differ. Treat "no holds after a win" as a per-machine
  compensator behaviour, not a law. [F] [UK Fruit Machine Index tips](http://www.fruitmachineindex.co.uk/fruit_site/basic.shtml),
  [Fruit-Emu tricks thread](https://www.fruit-emu.com/forums/topic/3139-share-tricks-of-real-fruit-machines/)
- **NUDGE:** move a reel one position (up or down, by machine) to turn a loss into a win. Awarded at random after a
  losing spin, by numbers printed on the reels, or by a trail; a counter shows how many are left. "Often limited to
  one nudge per spin, though some games offer multiple nudges on separate reels."
  [P] [patent EP0449433](https://data.epo.org/publication-server/rest/v1.2/patents/EP0449433NWA2/document.html),
  [F] [onlinecasinosvegas nudge feature](https://www.onlinecasinosvegas.com/features/fruit-machine-nudges.php),
  [GameFAQs Fruit Machine FAQ](https://gamefaqs.gamespot.com/cpc/940422-fruit-machine/faqs/56727)
- **Nudge counts varied** from 1-4 per award up to "unlimited" in some home sims; Winner Spinners capped at 5.
  [F] [GameFAQs Fruit Machine FAQ](https://gamefaqs.gamespot.com/cpc/940422-fruit-machine/faqs/56727),
  [Big Brother fruit machine](https://bigbrotheruk.fandom.com/wiki/Big_Brother_Fruit_Machine)
- **"Nudge unders" / symbols under the line:** no source found under that name. The readable cue on real machines
  is that you can see the symbol above and below the payline, so a nudge is a visible choice. (Open: verify.)
- **Trails:** a ladder of lit steps (on the glass) advanced by symbols on the win line; the top awards a jackpot or a
  feature. Cash trails let you gamble up the ladder (e.g. a 14-position cash trail on Cliffhanger); trail positions
  can award nudges, nudge gambles, or reel shuffles that cost a nudge.
  [P] [EP0449433](https://data.epo.org/publication-server/rest/v1.2/patents/EP0449433NWA2/document.html),
  [F] [arcade-history](https://www.arcade-history.com/game/15667/), [Gladiators (Maygay)](https://www.spin-raiders.com/post/gladiators-maygay-fruit-machine)
- **Gamble after a win:** hi-lo or red/black ladders to double a win are a standard post-win feature. [F]
  [westyorkshire SEO page, consistent with others](https://westyorkshireknowledgeexchange.co.uk/free-fruit-machine-games-with-nudges-and-holds-uk-2026-play-today/)
- **Return:** UK AWPs typically set 78-84% by venue and DIP switch. [F] [spin-raiders](https://www.spin-raiders.com/post/verify-classic-fruit-machine-sighting-before-travel)
- **How real machines kept HOLD/NUDGE from being too strong:** (1) the machine, not the player, chose when they
  were available (compensator); (2) counts were small and often expired; (3) reel strips were laid out so the
  symbol next to a near-miss was often not the one you need. Our game can't use (1) (honest rules), so it must use
  counts and strip layout. Opinion, from the above.

### Video slots and pachislot
- **Pachislot skill stop:** the player presses a stop button per reel. Rules (Japanese standard, via manuals and
  patents): reels max 80 rpm; a reel must stop within 0.19 s of its button; it may "slip" at most 4 symbols from
  where you pressed. Inside that window the machine steers to (or away from) the outcome already drawn, so skill
  ("observation push", 目押し) can only collect a win that was drawn, never create one.
  [P] [JP2006326188A](https://patents.google.com/patent/JP2006326188A/en),
  [Pachislo manual (archive.org)](https://archive.org/download/pachislot-manual/Pachislot-manual_text.pdf),
  [F] [Fruit-Emu pachislo FAQ](https://www.fruit-emu.com/forums/topic/8662-pachislo-japanese-slots-faq-v1/)
- **Skill stop elsewhere:** a stop button labelled "skill" does not by itself make a machine a game of skill (Florida
  AG opinion 95-27). [P] [myfloridalegal](https://www.myfloridalegal.com/node/8701). Stop buttons raise players'
  sense of control without raising returns. [P] [J Gambling Stud 2017](https://link.springer.com/article/10.1007%2Fs10899-017-9699-x)
- **Hold & Spin (Lightning Link, Aristocrat) / "Hold and Win":** coin symbols lock in place, you get 3 respins, any
  new coin locks and resets the count to 3; ends on 3 blank respins or a full grid (Grand jackpot). The tension is
  the counter, not the hold. [W/F] [casinos.com](https://www.casinos.com/slots/lightning-link),
  [1spin4win](https://www.1spin4win.com/blog/what-are-hold-and-win-slots)
- **Collect / persistent meters (Buffalo Gold):** gold buffalo heads collected in free spins (up to 15) upgrade other
  animal symbols into buffaloes: a build that changes what the reels pay, inside one feature. [F]
  [WSN](https://www.wsn.com/online-casinos/slots/buffalo-gold/), [urcomped](https://urcomped.com/blog/details/1055013/urcompeds-top-5-slot-video-jackpots-of-the-week-june-09-2019)
- **Collect symbols (Big Bass Bonanza, Pragmatic/Reel Kingdom):** in free spins, fish symbols show a cash value
  on the symbol; a fisherman wild landing collects every visible fish value. Every 4th fisherman retriggers and
  raises the collect multiplier (sources agree on x2, x3, x10). The value is printed on the symbol, so the pay is
  read before it's paid. [F, affiliate reviews only; verify on the game's help screen]
  [gambling.com: Bigger Bass Bonanza](https://www.gambling.com/us/online-casinos/slots/bigger-bass-bonanza)
- **Persistent symbols (Money Train 2/3, Relax):** in the respin bonus, Persistent Payer adds a value to every
  bonus symbol now and on every later respin; Persistent Collector gathers all visible values into its own total
  each respin; Persistent Sniper doubles 3-8 symbols each respin. Each pays something the moment it lands AND keeps
  working. [F] [gambling.com: Money Cart 2](https://www.gambling.com/us/online-casinos/slots/money-cart-2)
- **Multiplier symbols:** Double Diamond (IGT): one on the line doubles the win, two quadruple it (it's also wild).
  Sweet Bonanza: free-spin bombs show 2x-100x on the symbol, summed and applied at the end of the tumble, reset each
  spin. The number is on the symbol. [F] [FanDuel: Double Diamond](https://www.fanduel.com/research/theduel/double-diamond-fanduel-casino-review-01f1a6cqr1rh),
  [sigma.world: Sweet Bonanza](https://sigma.world/play/games/pragmatic-play/sweet-bonanza/)
- **The common thread** (opinion, from the above): modern feature symbols that build almost always pay or show a
  value the moment they land (Collector, Payer, bombs, fish), and the build lives inside a short window. A symbol
  that pays nothing now and only adds later is rare outside scatters, and scatters pay a small amount on their own.
- **Reach (pachinko/pachislot):** two reels stopped on a match and the last still spinning is "reach"; the machine
  spins that reel longer to build expectation, escalating to "super reach". Patents note long reach sequences
  (over a minute stacked) frustrate players. [P] [JP2011036701A](https://patents.google.com/patent/JP2011036701A/en)

### Odds, near-misses and feel
- **Near-miss regulation (Nevada):** in 1988-89 the Nevada Gaming Commission ruled Universal's "secondary decision"
  (after a loss, pick a losing display that puts jackpot symbols on the payline) unacceptable and made it retrofit
  its machines. Near misses above/below the payline from virtual reel mapping were ruled acceptable.
  [P] [Harrigan 2008, Int J Ment Health Addict](https://link.springer.com/article/10.1007/s11469-007-9139-8),
  [Harrigan 2007](https://link.springer.com/article/10.1007/s11469-007-9066-8)
- **Near-miss effect is contested:** a 2019 review plus experiments failed to replicate near misses raising play
  rate; a 2024 series found near misses raised motivation, speed and bet size vs full misses.
  [P] [Pisklak & Spetch 2019](https://link.springer.com/article/10.1007/s10899-019-09891-8),
  [Palmer et al. 2024](https://www.researchgate.net/publication/380373533_The_near-miss_effect_in_online_slot_machine_gambling_A_series_of_conceptual_replications)
- **Honest near misses are fine:** what regulators banned was faking them (a fixed outcome dressed up). Showing the
  real cell above the line, as a NUDGE target, is what fruit machines always did. Opinion, from the above.

## Roguelikes
### Scoring engines (Balatro, Luck be a Landlord)
- **Balatro hand = Chips x Mult.** Base hands: High Card 5x1, Pair 10x2, Two Pair 20x2, Three of a Kind 30x3,
  Straight 30x4. Planet cards level a hand (adds chips and mult to its base). [W] [Prima: all hands](https://primagames.com/gaming/all-poker-hands-and-their-chips-and-mults-in-balatro)
- **Joker types:** +Chips, +Mult, xMult. Jokers trigger left to right, so +Mult should sit left of xMult (Zany +10
  then Ramen x2 scored 980; reversed, 630). Chips are order-free. [W/F] [Destructoid via search](https://destructoid.com/?p=478541),
  [Steam thread](https://steamcommunity.com/app/2379780/discussions/0/4334231842063363125)
- **Why it reads:** each Joker pulses left to right with a running total, which teaches the formula without a
  tutorial; the score flames when it gets big. LocalThunk: CHIP X MULT "seemed very natural for a scoring system".
  [P] [LocalThunk: Balatro timeline](https://localthunk.com/blog/balatro-timeline-3aarh), [W] [Crosley analysis](https://blakecrosley.com/guides/design/balatro)
- **Luck be a Landlord:** a 5x4 slot grid (some sources say 5x3); each symbol pays coins every spin; many pay more
  next to others (Farmer doubles adjacent farmables); after each spin you add one of three symbols; some symbols
  destroy others (deck thinning). [W] [LBAL wiki: Farmer](https://luck-be-a-landlord.fandom.com/wiki/Farmer),
  [Wikipedia](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord), [F] [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2404409704).
  LBAL was designed as a slot game without predatory monetisation. [W] [Wikipedia](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord)
- **LBAL delayed-payoff symbols:** Thief (Uncommon) gives -1 coin a spin and, when destroyed, 4 coins for each spin
  it survived (a changelog mentions a change, verify). Coal becomes Diamond after 20 spins, while rent comes every
  6-8 spins, so it's a long-game pick. Both are niche picks, not the core: LBAL's delayed builders are optional
  symbols you choose to add, and they pay out in one visible burst (the destroy). [W] [LBAL wiki: Thief](https://luck-be-a-landlord.fandom.com/wiki/Thief),
  [F] [GamesAsylum review](https://www.gamesasylum.com/?p=60243)
- **Balatro scaling Jokers:** Ride the Bus gains +1 Mult for each consecutive hand with no scoring face card and
  resets on one; its current value shows on the card. Players call it reliable once built but too slow for high
  stakes; the scaler debate is about how fast they arrive, not whether they're fun. Scalers cost no card in the
  hand: the build is free on the turn. [F] [Steam thread](https://steamcommunity.com/app/2379780/discussions/0/4346606879507418212),
  [PocketGamer tier list](https://www.pocketgamer.com/balatro/joker-tier-list/)

### Run structure, scaling and difficulty
- **Balatro blind curve (White stake), base chips per ante 1-8:** 300, 800, 2,000, 5,000, 11,000, 20,000, 35,000,
  50,000. Small blind = base, Big = 1.5x, Boss = 2x (Ante 8 boss: 100,000). Green stake Ante 8 base 100,000, Purple
  200,000. Average growth ~2.1x per ante (x2.7 early, x1.4 late); x167 over the run. [W] [balatrowiki: Blinds and Antes](https://balatrowiki.org/w/Blinds_and_Antes),
  [dood.gg ante guide](https://dood.gg/en/balatro/guides/ante-guide/), [Fextralife](https://balatro.wiki.fextralife.com/Beginner's_Guide)
- **Balatro run:** 8 antes x 3 blinds = 24 rounds; ~4 hands and 3 discards a round stay fixed while targets climb;
  failing any blind ends the run (no lives). Boss blinds are the common "run ender" complaint.
  [W] [Pocket Tactics](https://www.pockettactics.com/balatro/review), [F] [Steam](https://steamcommunity.com/app/2379780/discussions/0/4694531145715173333)
- **LBAL rent:** 12 payments to win: 25, 50, 100, 150, 225, 300, 375, 450, 575, 650, 675, 777 (higher floors raise
  some), spins allowed per payment grow to a max of 10; Endless starts at 1000 and adds 500 a payment. Curve is
  ~x2 early, then near-linear: x31 over the run. Missing rent ends the run. [W] [LBAL wiki: Rent](https://luck-be-a-landlord.fandom.com/wiki/Rent)
- **Slay the Spire Ascension:** 20 stacked modifiers, each "adjusting a number or two"; about half raise enemy
  damage/HP. Players call A0-A14 easy and A20 brutal. [F/W] [DRMacIver](https://notebook.drmaciver.com/posts/2021-04-19-10:16.html),
  [Steam](https://steamcommunity.com/app/646570/discussions/0/1649917420738438378)
- **Inscryption Act 1 candles:** 2 lit candles are your lives (a third can be earned); losing a fight snuffs one;
  entering a boss with spare candles drops you to one and hands you "smoke" cards. Lives can be traded for power.
  [W] [TechRaptor boss guide](https://Techraptor.net/gaming/guides/inscryption-boss-battle-guide)

### Shops, drafts and economy
- (Empty: consult when the Cashier/shop step starts.)

## Battlers
### Head-to-head and async races (Super Auto Pets, Backpack Battles, The Bazaar)
- **Super Auto Pets (Arena):** 10 wins (trophies) to win, 5 lives (Easy has more); a loss costs a life, a draw
  costs nothing. At turn 3 you regain a life if you lost one in turns 1-2, **because the first turns are mostly
  random**. Earlier versions had 10 lives with losses costing 1 (turns 1-2), 2 (turns 3-4) and 3 (later).
  [W] [SAP wiki: The Basics](https://superautopets.wiki.gg/wiki/The_Basics), [Wikipedia](https://en.wikipedia.org/wiki/Super_Auto_Pets),
  [F] [TwoAverageGamers](https://www.twoaveragegamers.com/super-auto-pets-win-more-consistently-with-this-ultimate-guide/)
- **Backpack Battles:** 10 wins, 5 hearts, up to 18 rounds of shop + auto-combat; opponents are other players'
  saved builds from the same round (async). Common complaint: too much luck in shops and matchmaking.
  [W] [Wikipedia](https://en.wikipedia.org/wiki/Backpack_Battles), [Family Gaming DB](https://www.familygamingdatabase.com/game/Backpack+Battles),
  [F] [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3187896204), [VaporLens](https://vaporlens.app/app/2427700/backpack_battles.md)
- **The Bazaar:** 20 Prestige; a PvP loss costs Prestige equal to the day number (late losses hurt more); PvE losses
  cost nothing; at 0 you get one Resurrection boon. Goal 10 PvP wins; graded results (bronze 4, silver 7, gold 10,
  diamond = 10 with no losses). Opponents are ghosts of players from the same day.
  [W] [Mobalytics](https://mobalytics.gg/the-bazaar/guides/beginner-guide), [dotgg](https://dotgg.gg/the-bazaar/beginners-guide/),
  [F] [Medium review](https://medium.com/@819apollo/a-very-lively-marketplace-the-bazaar-a-game-review-d25f99716d88)

### Opponent design and counterplay
- **How battlers keep losses from feeling random:** a loss pool (lives/Prestige) rather than one-loss runs; refunds
  or low costs for early, luck-heavy rounds (SAP turn-3 life, Bazaar cost = day); graded wins so a partial run still
  counts (Bazaar medals). Sources above.
- **Rubber-banding reads as cheating once noticed;** the unfairness complaint is strongest when good play stops
  mattering. [P] [arXiv 2012.03309 citing Gerling et al.](https://arxiv.org/pdf/2012.03309),
  [W] [Giant Bomb: Rubber Band AI](https://giantbomb.com/wiki/Concepts/Rubber_Band_AI)

## Our mechanics, cross-checked
Our numbers below are computed from `src/race/race.ts` (YOUR_STRIP, RIVAL_STRIP, PAYTABLE), no tools used.

### The race: fixed spins, rival first, visible target
- **Precedent:** Balatro's blind and LBAL's rent are fixed visible targets with a fixed number of tries; ours is the
  same but the target is built live by a real opponent. Pachinko "reach" shows a visible last-reel decision is the
  peak moment. Bazaar/SAP show async opponents work when their strength is predictable.
- **Pitfall:** a target known early can make the last tries dead (already won / can't win); Balatro softens this
  because extra hands left become money. (Balatro's leftover-hands payout is from memory; verify.)
- **Opinion:** sound. VISION's own fix (prize grows with margin) is the Balatro answer and I'd back it.

### HOLD (one a reel, at most 2 a spin)
- **Precedent:** "hold one or two reels" matches real fruit machines. Real machines limited HOLD by offering it
  only sometimes (compensator), which we can't do honestly; our limits are the count and the 2-reel cap.
- **Pitfall:** holds that persist from a paying line make a held rare pair a 1-in-N lottery ticket (SEVEN 2/22 =
  ~9% a spin to complete); fine, but a held CHERRY pair re-pays 10 for sure, so HOLD can turn into "repeat my pair".
- **Opinion:** keep it. Watch whether players spend both HOLDs on spin 1 by habit; if so, HOLD isn't a choice yet.

### NUDGE (down one, one a spin)
- **Precedent:** one cell, often one a spin, is the classic rule; real nudges were awarded, ours are owned.
- **Pitfall:** strips are shuffled at random per race (`buildMachine`), so what sits above each symbol is noise.
  Real fruit machines designed reel order on purpose (it's how they tuned nudge strength).
- **Opinion:** a hand-ordered strip is the cheapest lever we have for NUDGE strength and readability (e.g. SEVEN
  next to a SWORD makes a real choice). Recommend it before touching counts.

### The 4-symbol paytable (CHERRY 10/50, BAR 20/100, COIN 40/200, SEVEN 80/777)
- **Precedent:** Balatro's Pair 10x2 = 20 vs Three of a Kind 30x3 = 90 (x4.5); ours is x5 to x9.7. Classic ladder.
- **Numbers (computed):** your untooled spin pays 17 on average, nothing 41% of the time (SWORDs included), SD 33.
- **Opinion:** fine for now; the shape is standard.

### The steady rival with a geometric BET
- **Precedent:** Balatro averages ~x2.1 an ante (x167 a run); LBAL ~x31 a run and near-linear late. Honest
  opponents read as fair; rubber-banding reads as cheating.
- **Red flag (computed):** the rival is less "steady" than it sounds. At BET x1 its spin averages 20 with SD 25
  (nothing 22%) vs your 17 / SD 33 (nothing 41%). Its per-spin variance is ~0.75 of yours; it's steadier mainly in
  hitting *something*. And because BET multiplies everything, its swings scale with the BET too.
- **Opinion:** if "steady" is meant to make its pace predictable, the strip needs to be flatter still (more BARs,
  fewer CHERRY-or-nothing outcomes), or the rival's line should pay a floor. Test in play, not in sims yet.

### CREDITS (3, lost boss replayed)
- **Precedent:** SAP 5 lives / 10 wins, Backpack Battles 5 hearts, Bazaar 20 Prestige with cost = day, Inscryption
  2-3 candles, Balatro and LBAL none. Arcade INSERT COIN is the direct source.
- **Pitfall:** every battler with lives made early losses cheaper (SAP refund, Bazaar day-cost) because early rounds
  are luck. Flat-cost credits make race 1 (no build yet) as costly as the final boss. Boss replay at a "fresh roll"
  risks reroll-for-luck grinding; Bazaar avoids that by escalating cost.
- **Opinion:** 3 credits is in line. Biggest risk is losing a credit to an act-1 race decided by one spin; consider
  (later, Cashier step) the SAP move: one early lost credit refunded, rather than adding credits.

### KNIGHT's SWORD / SHARP (non-paying, +20 to every later paying spin)
- **Precedent:** Balatro's scaling Jokers that grow per hand played; Buffalo Gold's collect-to-upgrade; Hold & Spin's
  "build inside a feature". All build inside a short window and cash in later, as SHARP does.
- **Pitfall (computed):** +20 flat flattens the ladder. At SHARP 2 a CHERRY pair pays 50, a SEVEN pair 120: x2.4
  apart instead of x8. Flat adds swamp small bases (Balatro's +Chips are weakest late for this reason). It also
  doesn't scale with the rival's BET, so its relative worth shrinks each stop unless the run's MULT multiplies it.
- **Played (user):** "plays like crap". Diagnosis (computed from YOUR_STRIP, 22 cells, 2 swords a reel): a sword is
  on your line in ~25% of spins; with one sword the line pays only if the other two reels pair (~25%), so a sword
  spin pays nothing ~3 times in 4: it lands as a blank. A spin-1 sword is worth roughly +48 spread as +20 slivers
  over the next ~2.4 paying spins; a spin-4 sword ~+12; a last-spin sword 0. About 1.4 swords land a race.
- **Pitfall vs precedent:** the slot features that build (Money Train persistents, Big Bass collect, Sweet Bonanza
  bombs) all pay or show a value the instant they land; Balatro's scalers cost nothing on the turn; LBAL's Thief
  (cost now, pay later) is a niche pick, not a machine's identity. SHARP costs the spin AND pays late, in small
  slices, as an add-on to other symbols' pays.
- **Opinion:** the build-then-cash-in arc is worth keeping; the delivery isn't. A replacement should pay the moment it
  lands, show its value on the symbol, grow inside the race, and not add to every other pay (keeps the ladder).
