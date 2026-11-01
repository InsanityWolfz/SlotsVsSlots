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

### Streaks, chains and tempo (reward acting every turn, punish the pause)
- **Slay the Spire Wrath (Watcher):** "deal double damage and take double damage"; you enter with cards (Eruption deals
  its damage first, then enters Wrath) and must leave by card too. The skill players name is knowing which turns are
  unsafe to end in Wrath (exit, or kill first). Watcher is widely called the strongest character (Calm-to-Wrath loop),
  so a two-way multiplier with a known exit is strong, not a trap. [W] [StS wiki: Stance](https://slaythespire.wiki.gg/wiki/Stance),
  [F] [Steam](https://steamcommunity.com/app/646570/discussions/0/3886100869055194457), [Choost tier list](https://choostgames.com/blog/slay-the-spire-tier-list/)
- **StS scaling attacks:** Rampage (Ironclad) deals 8, +5 each time it's played this combat (upgrade +8; patched from
  +4). Claw (Defect, 0 cost) deals 3, and every Claw in the deck gains +2 per Claw played this combat. Both grow
  additively and never reset inside a fight: the cost is deck slots and early weakness, not a streak to protect.
  [W] [fandom: Rampage](https://slay-the-spire.fandom.com/wiki/Rampage), [fandom: Claw](https://slay-the-spire.fandom.com/wiki/Claw)
- **StS low-HP payoffs:** Red Skull (Ironclad, common): +3 Strength while HP is at or below 50%. Meat on the Bone: heal
  12 after combat if at or below 50%. The low-HP reward is a relic you choose, not the base character.
  [W] [fandom: Relics](https://slay-the-spire.fandom.com/wiki/Relics). Hades: Positive Outlook (Hermes) cuts damage
  taken at 40% HP or below. [W] [Fextralife](https://hades.wiki.fextralife.com/Positive+Outlook)
- **Balatro streak Jokers:** Green Joker (common) +1 Mult per hand played, -1 per discard (decays, doesn't reset);
  Ride the Bus +1 Mult per consecutive hand with no scoring face card, resets to 0 on one; Obelisk grows xMult per
  consecutive hand that isn't your most-played hand and resets when you play it (players dislike that a tie for
  most-played also resets it; reported nerf of its step, numbers conflict). The current value shows on the card. Full
  resets are tolerated when the player controls the trigger (what you play); disliked when an edge case triggers it.
  [F] [Steam: Obelisk](https://steamcommunity.com/app/2379780/discussions/0/4346607305577986686),
  [Pro Game Guides](https://progameguides.com/balatro/balatro-joker-tier-list/), [kosgames](https://kosgames.com/balatro-every-joker-with-full-description-53298/)
- **Crypt of the NecroDancer coin multiplier ("groove chain"):** each kill without a missed beat raises the gold
  multiplier; a missed beat resets it, but doesn't hurt you directly. Cadence of Hyrule's version also resets on taking
  damage. The streak is a bonus layer on top of survival, so breaking it never kills you. [W] [Wikipedia](https://en.wikipedia.org/wiki/Crypt_of_the_NecroDancer),
  [F] [cadence.link](https://cadence.link/general/coin-multiplier)
- **Gonzo's Quest (NetEnt) avalanche multiplier:** consecutive cascades in one spin step x1, x2, x3, x5 (free falls
  x3, x6, x9, x15), capped, and reset each spin. A short, capped, visible ladder is the slot-industry form of a chain.
  [F, affiliate] [gambling.com](https://www.gambling.com/uk/online-casinos/slots/games/gonzo-s-quest)
- **Fighting-game damage scaling (proration):** each later hit in a combo deals less, so an 11-hit and a 69-hit combo
  land about the same; designers use it because unforeseen long combos can't be balanced otherwise. Combo length is
  capped by math, not a hard stop. [W] [Dustloop: GGXrd Damage](https://dustloop.com/w/GGXRD/Damage),
  [F] [Super Jump](https://www.superjumpmagazine.com/how-damage-scaling-holds-fighting-games-together/)
- **Hearthstone Combo:** a card's bonus applies if it isn't the first card played this turn; cards in hand glow
  orange once it's on. A tempo bonus read from a highlight, no counter. [W] [Hearthstone wiki: Keywords](https://hearthstone.wiki.gg/wiki/Keywords)
- **Dicey Dungeons Robot:** a CPU counter you push toward a limit; going over destroys your equipment, hitting it
  exactly pays a bonus (push-your-luck, not a streak). [F] [steamah guide](https://steamah.com/dicey-dungeons-all-characters-guide/)
- **The pattern** (opinion, from the above): chains that feel good show the number where you look, escalate in sight
  and sound each step, are capped or flattened (Gonzo, proration), and break on something the player chose (Ride the
  Bus, Obelisk, Wrath's exit). Pure-luck breaks are tolerated only when the streak is a bonus on top (NecroDancer
  gold), and hated when an edge case triggers them (Obelisk ties). Two-way multipliers (Wrath) make the low-HP edge a
  decision, and low-HP payoffs live in optional relics.

### Damage over time, ramps and cash-outs (poison, frostbite, hangover)
- **Slay the Spire poison:** stacks deal their number in damage at the start of the enemy's turn, ignoring block, then
  drop by 1 (well-known rule; wiki not reachable to quote). Bouncing Flask (2 energy) applies 3 poison three times to
  random enemies (upgrade: four times). Catalyst doubles an enemy's poison (upgrade: triples); Noxious Fumes adds
  poison to all enemies every turn (2, upgraded 3, per forum). [W] [StS wiki: Bouncing Flask](https://slaythespire.wiki.gg/wiki/Bouncing_Flask),
  [F] [Catalyst guide](https://www.magicgameworld.com/slay-the-spire-catalyst-achievement-guide),
  [Steam: Fumes stacking](https://steamcommunity.com/app/646570/discussions/0/1694917906665098406)
- **How poison plays (players):** "slow without Catalyst", losing races where you must kill before you're killed; its
  upside is that it "mostly stacks itself" while you spend your turns on block, so it's the defensive, reliable route
  ("win more often with Poison, more consistently with Shivs"). The burst cash-out (Catalyst, Burst) is what makes it
  a win condition. [F, 2017-19 threads] [Steam](https://steamcommunity.com/app/646570/discussions/0/1620599015906317709),
  [Steam](https://steamcommunity.com/app/646570/discussions/0/1699416432424672548)
- **Monster Train Frostbite:** stacks deal damage at the end of the turn and decay; it can't finish a unit before it
  acts. Players: good on bosses, weak on tanky normal units, lacks multiplicative stacking. [F] [Steam](https://steamcommunity.com/app/1102190/discussions/0/2299597907738161639),
  [ProGameGuides](https://progameguides.com/monster-train/combos-in-monster-train-and-how-they-work/)
- **Hades Hangover (Dionysus):** ticks every 0.5 s, stacks to 5 (8 with Low Tolerance), stacks fall off over time
  (sources say ~4 s); it's Dionysus's main damage. [F] [Steam math thread](https://steamcommunity.com/app/1145360/discussions/0/2932364348258805660),
  [Rogueranker](https://rogueranker.com/hades-2-status-effects/)
- **Metal: Hellsinger Fury:** a music meter x1-x16 (steps x2, x4, x8, x16) scaling damage and score; on-beat actions
  raise it, off-beat hits and taking damage drop it; the music gains layers as it rises (full arrangement at x16).
  [W/F] [wiki: Tutorials](https://metalhellsinger.wiki.gg/wiki/Tutorials), [GameSkinny](https://www.gameskinny.com/tips/metal-hellsinger-how-to-increase-fury-to-get-high-scores/)
- **The pattern** (opinion, from the above): a DoT ramp is the slow, safe archetype because it keeps working while you
  defend; it needs a burst cash-out to close fights (Catalyst); and it reads well when the tick is a visible number
  every turn. If the tick also runs on defend turns, defending costs the ramp nothing.

### Money as power, and swing meters
- **Balatro Bull:** +2 Chips per $1 held (nothing at $0); Bootstraps: +2 Mult per $5 held. Guides: skip Bull if you
  spend a lot; the Green Deck (spend as you earn) works poorly with both; The Ox boss can set money to $0. Interest is
  $1 per $5 held at round end, capped at $5 ($10/$20 with vouchers; To the Moon adds $1 per $5). Players argue
  saving to $25 vs buying now is situational. [F] [PocketGamer](https://www.pocketgamer.com/balatro/joker-tier-list/),
  [games.gg money build](https://games.gg/balatro/guides/balatro-money-build/),
  [Steam: interest](https://steamcommunity.com/app/2379780/discussions/0/4357869401129596810)
- **The Bazaar Cash Cannon (Pygmalien):** a weapon whose damage scales with gold *gained* over the run (1:1 at Silver,
  x2/x3 at higher tiers), not gold held, so spending isn't punished. [F] [Mobalytics](https://mobalytics.gg/the-bazaar/builds/cash-cannon-pygmalien)
- **Gil Toss / Zeninage (Final Fantasy):** FFVII's Coin lets you choose the amount and deals about a tenth of it;
  Crisis Core's Gil Toss deals a fixed share (20% mastered) of ~1% of your gil; FFVI's cost is Level x30. Money as a
  weapon is usually a costly late-game sink, not a main attack. [W] [FF wiki: Gil (mirror)](https://breezewiki.discard.no/finalfantasy/wiki/Gil)
- **Slay the Spire Hand of Greed:** 20 damage, +20 gold if fatal (StS2 figures; upgrade 25/25): damage that pays,
  the reverse direction. [F] [dood.jp](https://dood.jp/en/sts2/colorless/cards/強欲の手)
- **Inscryption bones:** a second currency gained when your own cards die (1 each), spent to play bone-cost cards; a
  loss becomes fuel. [W] [Inscryption wiki: Bones](https://inscryption.fandom.com/wiki/Bones)
- **"Must hit by" mystery progressives:** the meter climbs between a set start and a guaranteed ceiling; play rises
  sharply as it nears the ceiling. A visible ceiling turns a swing into anticipation. [F, industry column]
  [CDC Gaming](https://cdcgaming.com/commentary/frank-floor-talk-the-progress-of-progressives/)
- **Pattern** (opinion): currency-as-weapon designs avoid a death spiral by scaling with money earned (Cash Cannon)
  or by being a sink on top of a main attack (Gil Toss); "spend your savings" designs punish the run's economy when
  fights go badly. Swing meters feel fair when the near-miss is visible and close (a ceiling, a "one short").

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
- **Slay the Spire map:** 3 acts of 17 floors; floor 1 is an easy fight, floor 9 always treasure (a mid-act relic),
  floor 15 always a rest site, floor 16 the boss, 17 the boss chest (pick 1 of 3 relics or skip). The boss is the
  act's last fight and the player gets a guaranteed breather right before it. [W] [StS wiki: Map Generation](https://slaythespire.wiki.gg/wiki/Map_Generation),
  [Map Locations](https://slaythespire.wiki.gg/wiki/Map_Locations)
- **Dicey Dungeons episode:** 6 floors, boss on floor 6, harder enemy pools per floor; players report ~20-40 minutes an
  episode (early episodes ~20). [F] [Tildes thread](https://tildes.net/~games/glf/dicey_dungeons_launch_trailer),
  [Giant Bomb blog](https://Www.Giantbomb.com/profile/laughingman/blog/ranking-of-roguelikes-3-dicey-dungeons/260870/)
- **Run lengths (anecdote, no measured source found):** Super Auto Pets 10-20 min a run [F] [games-genie](https://www.games-genie.com/games/super-auto-pets);
  Dicey Dungeons 20-40 min (above). Balatro: no per-run figure found; HowLongToBeat "main" 7.5 h is to a first win
  across many runs [F] [Dekudeals/HLTB](https://www.dekudeals.com/items/balatro?format=all). Short battlers sit at
  10-20 minutes; deckbuilders at 30-60+.
- **Power curve vs difficulty curve:** within a run the difficulty curve is typically exponential: early fights
  build, late fights test the build [F] [Abratabia](https://www.abratabia.com/game-design/difficulty-curves.php).
  Enemies that only grow numbers are "bloated bags-of-hitpoints"; a less predictable, staggered power curve (plateau,
  then jump) is more interesting than smooth matched scaling [F] [How to Make an RPG](https://howtomakeanrpg.com/r/a/power-progression.html),
  [Kill Ten Rats](https://www.killtenrats.com/2008/01/04/powerdifficulty-curves/).
- **Climb vs treadmill, the pattern** (opinion, from Balatro's x2.7-early/x1.4-late curve and the above): a run reads
  as a climb when the player's growth per step beats the ordinary fight's growth (you feel stronger between bosses,
  often overkill) and the boss is the spike that checks the build. If target and power grow at the same rate every
  fight, nothing changes in feel: a treadmill.
- **Inscryption Act 1 candles:** 2 lit candles are your lives (a third can be earned); losing a fight snuffs one;
  entering a boss with spare candles drops you to one and hands you "smoke" cards. Lives can be traded for power.
  [W] [TechRaptor boss guide](https://Techraptor.net/gaming/guides/inscryption-boss-battle-guide)

### Telegraphed interference (intents, boss rules, status effects)
- **Slay the Spire intents:** every enemy shows its next action (attack with exact damage, block, buff, debuff,
  unknown) the turn before it happens. Reviewers call it the game's central innovation, the thing that makes
  combat planning instead of luck. Mega Crit's own rationale wasn't found online. [F] [LessWrong review](https://www.lesswrong.com/posts/MEimkSwwuRgiPaZaY/review-slay-the-spire),
  [Nintendo Life](https://www.nintendolife.com/reviews/switch-eshop/slay_the_spire)
- **StS rule-changers that punish a habit:** Gremlin Nob gains Strength whenever you play a Skill (Enrage), so it
  changes what's correct rather than just hitting harder. Players split: "bad for the fun" vs "teaches you".
  [W] [StS wiki: Gremlin Nob](https://slaythespire.wiki.gg/wiki/Gremlin_Nob), [F] [Steam](https://steamcommunity.com/app/646570/discussions/0/3953658299620443875)
- **Into the Breach:** every enemy attack is shown (target tiles) at the start of the turn and resolved after yours,
  with no random attack choice; Subset says this is what makes it feel like a puzzle. [P] [Game Developer: Road to
  the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-),
  [GDC 2019 postmortem listing](https://www.gdconf.com/news/get-inside-look-making-breach-gdc-2019)
- **Balatro boss blinds:** one rule per ante (e.g. The Needle: 1 hand; The Plant: face cards debuffed; The Arm:
  lowers the played hand's level). The next boss is shown as soon as the current one is beaten, giving ~3 shop
  visits to prepare; Director's Cut ($10) rerolls it once an ante, Retcon unlimited, Boss Tag rerolls; Luchador
  disables one. [F] [Insider Gaming](https://insider-gaming.com/?p=83317), [Dot Esports: vouchers](https://dotesports.com/indies/news/all-balatro-vouchers-effects-how-to-unlock-and-more)
- **Which Balatro bosses players hate, and why:** The Hook (discards 2 random held cards after each hand) in Ante 1,
  "discards run out before I can get 2 hands"; The Arm (permanent level loss, hard to recover); Violet Vessel
  (final, huge score) called "the only boss blind that is non-interactive, just kills a run". The Pillar (only
  cards already played this ante) is called the easiest. Pattern: hated bosses are random, permanent, or pure
  number checks; tolerated ones change which play is best and can be planned for. [F] [Steam: Worst Boss Blind?](https://steamcommunity.com/app/2379780/discussions/0/4201364759908462013/),
  [Steam: boss complaints](https://steamcommunity.com/app/2379780/discussions/0/4694531145715173333)
- **Dicey Dungeons status effects** hit your resources, each with a price to clear: Shock disables a random
  equipment card until you spend a die on it (3 HP instead in the Parallel Universe episode); Freeze turns your
  highest die into a 1; Burn sets your next die on fire and putting it out costs 2 HP; Lock: you can't use dice;
  Curse: each equipment use has a 50% chance to fail. A die can't be both locked and burning (v1.11). Most last the
  turn. The cheat becomes a choice of what to pay. [W] [Dicey wiki: Status Effects](https://diceydungeons.fandom.com/wiki/Status_Effects),
  [F] [Steam strategy](https://steamcommunity.com/app/861540/discussions/0/3185654583878473735), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/DiceyDungeons),
  [P] [Cavanagh devlog](https://terrycavanagh.itch.io/dicey-dungeons/devlog/50288/dicey-dungeons-v013)
- **LBAL pressure** is a visible clock (rent due in N spins) plus clutter; answers (removal tokens, rerolls,
  essences) come in bundles each payment, halved on floor 4+. [F] [Twinfinite](https://twinfinite.net/guides/how-remove-symbols-luck-be-a-landlord/)
- **The Bazaar freeze/slow:** opponent items that freeze or slow yours are visible on its board before combat;
  complaints are about stacks reapplied every attack (no window to act), not about the effect existing.
  [F, one anecdote] [RPGHQ](https://rpghq.org/forums/viewtopic.php?p=169981)
- **Fair vs cheap, the shared pattern** (opinion, from the above): shown before the decision it affects; at least
  one answer with the player's normal tools, at a price; changes which play is best rather than only subtracting;
  temporary rather than permanent; on a rhythm the player can learn.

### Answering sabotage that switches your stuff off
Five families of answer; most games mix two.
- **(a) It wears off.** StS Dazed is Ethereal (gone at end of turn if unplayed); most Dicey Dungeons statuses last
  the turn; Hades Chaos curses last a set 2-5 encounters, then the blessing stays for the run (players time gates so
  the curse misses the boss). [W] [StS wiki: Dazed](https://slaythespire.wiki.gg/wiki/Dazed), [F] [Prima: Chaos](https://primagames.com/gaming/hades-chaos-realm-chaos-blessings),
  [Switchblade: Chaos gates](https://www.switchbladegaming.com/hades-2/chaos-gates-guide/)
- **(b) Pay to clean.** StS Slimed is the one playable status: 1 energy, exhausts (gone for the combat); Wound, Dazed,
  Burn are unplayable (Burn: 2 damage at end of turn, 4 upgraded). Dicey Shock costs a die, Burn 2 HP. Balatro's
  Verdant Leaf debuffs every card until you sell a Joker: called one of the harshest bosses; defenders say keeping a
  spare Joker to sell is "a strategic choice". Backpack Battles' Lantern Berry spends mana to cleanse debuffs (and gives
  Luck and Regeneration if there are none, so it's never dead). [W] [StS wiki: Slimed](https://slaythespire.wiki.gg/wiki/Slimed),
  [F] [Steam: Verdant Leaf](https://steamcommunity.com/app/2379780/discussions/0/7410182519534621383), [comicbook.com](https://comicbook.com/gaming/news/balatro-boss-blinds-toughest/?nb=1),
  [W] [BB wiki: Lantern Berry](https://backpackbattles.wiki.gg/wiki/Lantern_Berry)
- **(c) Cleaned by normal good play.** Candy Crush chocolate breaks when the candy next to it is matched or a special
  candy reaches it; in Candy Crush Soda brown chocolate multiplies on any move that doesn't break one, so ignoring it
  costs you. Backpack Battles' Strong Health Potion cleanses 4 poison as part of its heal (cleanse 2 -> 3 -> 4 across
  patches). [W] [Candy Crush wiki: Chocolate](https://candycrush.fandom.com/wiki/Chocolate), [BB wiki: Health Potion](https://backpackbattles.wiki.gg/wiki/Health_Potion)
- **(d) Caps and immunity windows.** WoW diminishing returns: a repeat of the same control type within 18 s lasts half
  as long, the third a quarter, then the target is immune for 18 s (Midnight: 100% -> 50% -> immune, reset times
  differ by patch). Overwatch 2 cut most stuns from damage and support heroes at launch; its director said chained
  control "felt like you were in a pinball machine" (some came back in season 5). Dicey: a die can't be locked and
  burning at once. [W] [Warcraft wiki: Diminishing returns](https://warcraft.wiki.gg/wiki/Diminishing_returns),
  [P] [Blizzard forum: Midnight DR](https://us.forums.blizzard.com/en/wow/t/crowd-control-diminishing-returns/728550),
  [P] [Overwatch 2 dev blog](https://overwatch.blizzard.com/en-us/news/23824005/), [F] [PCGamesN: OW2 CC](https://www.pcgamesn.com/overwatch-2/crowd-control)
- **(e) The sabotage becomes fuel.** StS Evolve (draw when you draw a status) and Fire Breathing (damage when you draw
  one) turn the enemy's junk into pay; Ironclad's Power Through and Immolate add statuses to your own deck for that
  reason. Medical Kit (relic) makes statuses playable for 0 and exhausts them, feeding exhaust payoffs; Blue Candle does
  the same for curses at 1 HP. These are optional cards and relics, not the base rule. Inscryption bones: your own
  losses become a currency. [W] [StS wiki: Burn](https://slaythespire.wiki.gg/wiki/Burn), [Medical Kit](https://slaythespire.wiki.gg/wiki/Medical_Kit),
  [F] [Steam: statuses and curses](https://steamcommunity.com/app/646570/discussions/0/3016815718812384358)
- **Pitfalls players name:** a non-interactive lockout ("bricks any build no matter what", Verdant Leaf in a challenge
  run); control chained so you can't act ("pinball machine"); a flat tax answer (Slimed's 1 energy) is a cost, not a
  choice, once the right play is always "pay it"; fuel answers (Evolve) make some enemies easier for builds that
  want them. Sources above.
- **The pattern** (opinion, from the above): the base rule makes the lockout end on its own (a timer, a cap, an
  immunity window), and the interesting answers (pay, fuel) live in optional cards and relics. Paying to clean needs
  an input and a resource; cleaning by normal play needs the player to still be able to play, so on its own it fails
  in the worst case (too disabled to win, so never cleaned).

### Shops, drafts and economy
- **Balatro win payout:** Small blind $3, Big $4, Boss $5, Ante 8 boss $8; +$1 per unused hand; interest $1 per $5
  held, capped at $5 (vouchers raise it to $10/$20). [F, community guides and a student paper] [PC Gamer tips](https://www.pcgamer.com/balatro-tips/),
  [ITB paper](https://informatika.stei.itb.ac.id/~rinaldi.munir/Matdis/2024-2025-2/Makalah2025/Makalah-Matdis-2025-IF-ITB%20(10).pdf)
- **Balatro planets level one hand type** (e.g. Pair), so growth is per-hand, and focusing one hand is the standard
  build. See Scoring engines for base values.
- **Slay the Spire win reward:** every normal fight gives gold and a card reward: pick 1 of 3 or skip (normal fights
  ~3% rare / 37% uncommon / 60% common; elites ~10/40/50 and a guaranteed relic); boss: pick 1 of 3 relics or skip.
  [W] [StS fandom: Card Rewards](https://slay-the-spire.fandom.com/wiki/Card_Rewards)
- **LBAL:** pick 1 of 3 symbols (or skip) after every spin (see Scoring engines).
- **Super Auto Pets shop tiers** unlock every odd turn (tier 2 on turn 3, tier 3 on turn 5 ... tier 6 on turn 11),
  so the pool itself climbs on a clock. [W] [SAP wiki: The Basics](https://superautopets.wiki.gg/wiki/The_Basics),
  [TwoAverageGamers](https://www.twoaveragegamers.com/ultimate-guide-to-super-auto-pets-game-mechanics/)
- **The shared minimum** (opinion, from the above): a win pays one pick of three (skippable) from a small pool; the
  boss pays a better pick. Currency and shops come on top of that, not instead of it.

### Gamble stops and prize machines (events, claw machines)
- **Real claw machines are set by the operator:** modern cranes compute a payout percentage from the operator's
  settings; grip strength is adjustable, and some grip at full strength and then weaken after a short delay (the
  prize lifts, then drops). Vendors describe one strong grab per N plays. A controller manual describes a payout
  target. [P] [patent 10957164: setting device](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10957164),
  [Betson E-Claw manual](https://www.betson.com/wp-content/uploads/2020/01/E-Claw-Service-Manual-10.3-Copy.pdf),
  [F, vendor] [clawmachines.com](https://clawmachines.com/claw-strength-guide), [Futureino](https://futureino.ai/blog/are-claw-machines-rigged)
- **"Skill" prize games that are chance get sued:** Sega's Key Master (a timing-stop key game) faced a 2021 class
  action alleging a default of 700 losses before a win can happen, while it was sold as a game of skill; Sega replaced
  it with Prize Locker, sold as "100% skill-based". Stacker (LAI) is a stop-the-row timing game with an estimated
  1-in-1500 win ratio on Mega Stacker. [F/P] [Courthouse News](https://courthousenews.com/class-calls-segas-key-master-game-rigged/),
  [casino.org](https://www.casino.org/news/sega-sued-for-5-million-over-key-master-arcade-games/), [W] [Wikipedia: Stacker](https://en.wikipedia.org/wiki/Stacker_(arcade_game))
- **Japanese UFO catchers' skill is progress over goes:** the common "bridge" setup (hashiwatashi) rests a box across
  two bars, and you nudge it a little each go until it falls; staff advise where to aim. Prize values sit around
  1,000 yen (travel guides, not a legal source). [F] [Japan Handbook](https://japanhandbook.com/?p=8287), [Tokyo Cheapo](https://tokyocheapo.com/entertainment/anime-and-gaming/crane-game-tips/),
  [Japan Nook](https://japannook.com/articles/japan-arcade-prize-games-guide)
- **Binding of Isaac crane game (Repentance):** 5 coins a go, about 25% to win the item shown in it, up to 3 prizes
  before it breaks; bombing it gives pickups, not the prize. Players report it feeling worse than 25% (4 goes = 68%).
  [F] [Bamboo Gaming](https://www.bamboogaming.net/the-binding-of-isaac/machines/crane-game), [Steam](https://steamcommunity.com/app/250900/discussions/0/597394966009879102)
- **Balatro Wheel of Fortune:** 1 in 4 to add an edition to a random Joker, else "Nope!". Steam threads ask if it's
  rigged ("30-40 times, it worked 4-5"); LocalThunk reportedly confirmed it works as stated. A flat 25% reads as lower
  than it is. [F] [Steam: is it really 1 in 4?](https://steamcommunity.com/app/2379780/discussions/0/4293691221506323823)
- **StS Scrap Ooze (act 1, push-your-luck):** Reach Inside costs HP (3; more at high Ascension) for a 25% chance at a
  relic; each miss adds 10% and costs 1 more HP; you can leave any time. Cumulative ~73% by the third reach.
  [W] [StS archive wiki: Scrap Ooze](https://slaythespire-archive.fandom.com/wiki/Scrap_Ooze)
- **StS Match and Keep:** 12 face-down cards, 5 attempts to find pairs; every pair you match joins your deck, curses
  too, so the skill is memory and the decision is which pairs to want. Seeded. [W] [StS wiki: Events List](https://slaythespire.wiki.gg/wiki/Events_List)
- **StS Dead Adventurer:** search for a relic or gold, with a chance the elite that killed him returns (a rising risk
  per search, exact steps not verified). [W] [StS wiki: Elite](https://slaythespire.wiki.gg/wiki/Elite)
- **Slay the Spire 2's events** were redesigned to push "tough choices"; not every option is good, and fighting can be
  the better pick. [F] [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/events-redesign)
- **The pattern** (opinion, from the above): luck stops that last are cheap and quick (Wheel of Fortune, Isaac's
  crane) or put a decision between goes: when to stop while the odds or the cost climb (Scrap Ooze), or progress you
  can see across goes (bridge UFO catchers). A "skill" look over pure chance reads as rigged (Key Master), and so does
  a flat low chance repeated (Wheel of Fortune, Isaac).

### Hits x damage: keeping two scaling axes from multiplying
- **Hearthstone Spell Damage on multi-hit spells:** on spells that fire random missiles (Arcane Missiles, Avenging
  Wrath, Cinderstorm), +Spell Damage adds missiles; each still deals 1. On Greater Arcane Missiles it raises each
  missile's damage and the count stays. Each card scales on one axis only, so +1 Spell Damage is always worth +1 hit,
  never +N. [W, via search snippets; wiki not fetchable] [Hearthstone wiki: Spell Damage](https://hearthstone.wiki.gg/wiki/Spell_Damage)
- **Slay the Spire Lightning orbs:** passive 3 damage at end of turn, Evoke 8; Focus adds to both, per orb, so output is
  orbs x (base + Focus). The count axis has a hard cap (orb slots, max 10: well-known rule, not quoted). Electrodynamics
  makes Lightning hit all enemies. The Focus axis is paid for: Biased Cognition gives Focus and drains it every turn
  ("useless in boss battles" per players); in Slay the Spire 2 most Focus gains last only the turn, per guides.
  [W] [StS wiki: Focus](https://slaythespire.wiki.gg/wiki/Focus), [Electrodynamics](https://slay-the-spire.fandom.com/wiki/Electrodynamics),
  [F] [Steam: Biased Cognition](https://steamcommunity.com/app/646570/discussions/0/1697174779855597685), [allthings.how: StS2 Defect](https://allthings.how/mastering-the-defect-in-slay-the-spire-2-best-decks-key-cards-and-what-changed/)
- **Peglin:** a shot's damage is the sum of per-peg values (crit pegs swap in the crit value), released as one hit.
  Patch 0.7.34 (June 2022) changed Crit Fleece from compounding to additive stacking "to prevent damage from
  overflowing". [W] [Peglin wiki: 0.7.34](https://peglin.wiki.gg/wiki/0.7.34), [Critsomallos Fleece](https://peglin.wiki.gg/wiki/Critsomallos_Fleece)
- **Risk of Rain 2 proc coefficient:** every hit carries a coefficient that scales its chance to trigger on-hit items;
  Ukulele's chain lightning (25% x coefficient, up to 3 targets, 80% of the hit's damage each) has coefficient 0.2, so
  a chain can trigger further chains only rarely (AtG Missile from Ukulele: 2%). Stacking Ukulele adds targets (+2) and
  range, not chance or damage. Damping each generation below 1 is what stops proc loops from running away (opinion;
  no Hopoo statement found). [W] [RoR2 wiki: Proc Coefficient](https://riskofrain2.wiki.gg/wiki/Proc_Coefficient),
  [Ukulele](https://riskofrain.wiki.gg/wiki/Ukulele_(Risk_of_Rain_2))
- **Hades chain lightning:** Zeus's chain effects bounce between foes (Hades II Static Shock: up to 4 bounces, 10
  damage each); Storm Lightning adds bounces (+2 common, Hades I); Hades II's Conductor duo adds +15% per bounce. Guides
  agree bounce boons are weak against lone bosses: the count axis needs extra targets to pay. [F] [PC Invasion: Zeus](https://www.pcinvasion.com/hades-guide-olympian-god-boons-skills/10),
  [Gfinity: Hades II Zeus](https://www.gfinityesports.com/article/hades-2-zeus-breakdown-all-boons-best-weapons-more)
- **Monster Train multistrike x Rage:** Rage adds attack and multistrike repeats the attack, so the two multiply; players
  report Branded Warrior "1k per swing, x3". Multistrike counts stay small (1-3) and come from few sources. No
  official balance statement found. [F] [ProGameGuides](https://progameguides.com/monster-train/combos-in-monster-train-and-how-they-work/),
  [Steam](https://steamcommunity.com/app/1102190/discussions/0/2284960483090032982)
- **Balatro keeps two axes on purpose** (Chips x Mult, see Scoring engines) and pays for it with targets that grow
  ~x2 an ante and run away in endless (see Endgame bosses). The Plasma Deck averages Chips and Mult before multiplying
  (30 + 2 -> 16 x 16 = 256) and doubles blind size; players say it rewards stacking whichever axis is easier.
  [F] [SI: Plasma Deck](https://videogames.si.com/guides/balatro-plasma-deck), [Insider Gaming](https://insider-gaming.com/how-to-unlock-plasma-deck-balatro/)
- **The pattern** (opinion, from the above): designers who want "count x damage" to stay linear do one of four things:
  (1) give each boost one axis only (Hearthstone); (2) hard-cap the count (orb slots, Ukulele targets, multistrike
  1-3); (3) damp each extra generation below 1 (proc coefficient, fighting-game proration); (4) make the damage axis
  temporary or paid for (Biased Cognition, StS2 Focus). Compounding that overflows gets patched to additive (Peglin).
  Only Balatro keeps the product, and it answers with exponential targets.

### Endgame and endless final bosses (when the player's numbers are absurd)
- **Vampire Survivors, the Reaper (Death):** at 30:00 on the main stages the Reaper spawns, then one more each minute;
  each hit deals 65,535 (a one-shot). Its HP is 655,350 x your level when it spawns (Steam math; ~146 million at level
  223), so it scales to your power. It's the game's "run over" signal, not a boss you're asked to fight; killing it
  takes a dedicated build (Crimson Shroud caps damage taken, 10 per hit per the wiki, 100 per another guide, and its
  retaliation adds 1% of the Reaper's max HP), and players treat it as a celebrated feat. [F] [Gfinity](https://www.gfinityesports.com/guides/vampire-survivors-death-how-to-beat-final-boss),
  [Steam: Reaper HP](https://steamcommunity.com/app/1794680/discussions/0/5675129542144162400), [W] [VS wiki: The Reaper](https://vampire-survivors.fandom.com/wiki/The_Reaper)
- **Slay the Spire's Corrupt Heart:** 750 HP (800 at Ascension 9+), Invincible 300 (it loses at most 300 HP a turn, so
  at least 3 turns; guides say 4 at high Ascension), Beat of Death (1 damage to you per card played). The cap is a shown
  number that counts down inside your turn, so players plan bursts around it ("don't waste resources once the cap is
  reached"). Invincible blocks HP loss, not damage, per a Steam thread. [F] [HighGround](https://www.highgroundgaming.com/slay-the-spire-corrupt-heart-guide/),
  [Steam: Invincible](https://steamcommunity.com/app/646570/discussions/0/4111168970109533969)
- **Binding of Isaac damage scaling:** some bosses (Hush among them) have a soft DPS cap: base HP / an armor value;
  damage above it is reduced, and a single hit over 4x the cap is reduced up front. Hidden (no number on screen).
  [W, via search snippets] [Isaac wiki: Damage Scaling](https://bindingofisaacrebirth.wiki.gg/wiki/Damage_Scaling)
- **Balatro endless and "naneinf":** after ante 8 targets grow much faster (x20 or more an ante, per Balatro
  University); at ante 39 the required score overflows the double float and becomes NaN, which no score can beat.
  The community treats the overflow as the absurdist ceiling and "highest ante" as the score. [W] [Wikipedia: Balatro](https://en.wikipedia.org/wiki/Balatro),
  [F] [Setsideb: Balatro University on naneinf](https://setsideb.com/tag/balatrouniversity/), [Steam](https://steamcommunity.com/app/2379780/discussions/0/4346606879522813524)
- **Diablo III Greater Rifts:** a 15-minute timer to fill a bar and kill the Rift Guardian; monster HP x1.17 a tier
  (compounding), tiers to 150; leaderboards rank the tier reached, then time. Exponential HP against exponential power
  makes the tier roughly the log of your power: a 10x stronger build gains ~15 tiers. [F] [Maxroll: GR mechanics](https://maxroll.gg/d3/resources/greater-rift-explained),
  [Icy Veins](https://www.icy-veins.com/d3/how-to-run-greater-rifts-efficiently-guide)
- **Raid: Shadow Legends Clan Boss (damage as reward):** a boss you can't kill; each attempt (a key) is scored by
  damage dealt, and damage thresholds pay chest tiers (Easy Demon Lord ~286K for the lowest to ~1.1M for Warrior;
  Ultra-Nightmare tiers in the tens of millions). Players optimise for the next threshold. [F] [ayumilove: Demon Lord](https://ayumilove.net/raid-shadow-legends-champion-ranking-in-clan-boss/),
  [HellHades](https://hellhades.com/ultimate-clan-boss-guide-everything-you-need-to-know/)
- **Damage caps as something to break:** Final Fantasy X caps a hit at 9,999; Break Damage Limit (celestial weapons,
  or 60 Dark Matter) raises it to 99,999, and breaking it is a late-game goal. MapleStory raised its cap in steps
  (players recall 200K, then 1M, 50M, 10 billion) and Nexon's 2016 5th Job update announced the cap "removed".
  [W] [FF wiki: Break Damage Limit](https://finalfantasy.fandom.com/wiki/Break_Damage_Limit), [F] [Nexon forum](https://forums.maplestory.nexon.net/discussion/comment/83354),
  [press release](https://www.media-outreach.vn/news/singapore/2016/11/15/2812/maplestory-launches-5th-job-advancement-after-an-almost-ten-year-long-wait/)
- **Hades Extreme Measures:** a Pact of Punishment condition (Heat) that gives every boss new attacks rather than more
  HP; the Pact caps at ~63 Heat and the reported unseeded record clear is 60. [F] [RPG Site](https://rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards),
  [Prima](https://primagames.com/gaming/hades-guide-pact-of-punishment-modifiers-heat)
- **Risk of Rain 2:** Mithrix's last phase takes your items (they return as you damage him); the run's difficulty
  rises with time and each loop, monster level to 99. **Brotato endless:** after wave 20, every wave is 60 s, 0-3
  elite waves per 10, boss HP 15,000 + 750 a wave (a beta patch; may be outdated). **LBAL endless:** rent starts at
  1,000 and grows 500 a payment until you miss one. [F] [PC Gamer: Mithrix](https://www.pcgamer.com/uk/risk-of-rain-2-mithrix-boss-guide),
  [W] [Brotato wiki: Waves](https://brotato.wiki.spellsandguns.com/Waves), [LBAL wiki: Rent](https://luck-be-a-landlord.fandom.com/wiki/Rent)
- **The pattern** (opinion, from the above): with absurd numbers, the endgames that land either (a) show a cap as a
  number the player plays around (the Heart), (b) score how far you got on a log-like ladder (Greater Rift tiers,
  Clan Boss chests, Balatro's highest ante), or (c) end the run on a clock with a "not meant to win" boss that a few
  builds can still kill (the Reaper). A cap that ignores the build entirely (hidden, like Isaac's) or a hit that's
  thrown away reads as the game cheating; caps that you can break are rewards (FFX).

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

### Fight clocks (overtime, fatigue, sandstorm, enrage)
- **Backpack Battles fatigue (both sides, flat damage):** at 17 s the screen shows "Fatigue sets in..." (night falls)
  and both players take 1 damage, then 2 at 18 s, 3, 4 ... (+1 a tick; sources disagree on a growth change after 60 s).
  Typical fights last 10-20 s, so the clock starts at the long end of a normal fight. Items (Mr. Struggles, Corrupted
  Crystal) deal fatigue early and raise its value. Players built "fatigue builds": no weapons, heals and regen, win by
  outlasting fatigue ("beat the game without doing any damage, other than fatigue"); one poster reports healing is capped
  at the damage being taken. [W/F] [Wikipedia](https://en.wikipedia.org/wiki/Backpack_Battles),
  [BB wiki: Fatigue (via search)](https://backpackbattles.wiki.gg/wiki/Fatigue), [itch.io comment](https://itch.io/post/8211269),
  [Steam: fatigue builds](https://steamcommunity.com/app/2427700/discussions/0/4290313152640235930),
  [GamesFuze](https://gamesfuze.com/guides/backpack-battles-ultimate-beginners-guide-tips-and-tricks/)
- **The Bazaar sandstorm (both sides, flat damage that shields absorb):** arrives 30 s into every fight and deals
  escalating damage to both players. Exact per-tick numbers not found. Shields block it, so shield builds use the storm
  as their win condition; shield mirrors past 100,000 shield drag "for a long, long time" and can end in draws after
  minutes; a Steam thread asks for fast-forward. Items exist to start the storm early (Bottled Tornado, Windmill). A
  search snippet of the wiki's Version 0.1.3 page says storm ticks were made much more frequent to end fights faster
  (not read directly). [F] [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/TheBazaar),
  [TheGamer](https://www.thegamer.com/the-bazaar-beginner-tips-tricks-mechanics-explained-guide/),
  [Steam: speed up the game](https://steamcommunity.com/app/1617400/discussions/0/591780152569132935/),
  [W] [Version 0.1.3](https://thebazaar.wiki.gg/wiki/Version_0.1.3)
- **Teamfight Tactics overtime (both sides, offence up and defence down):** patch 9.16 (2019) added "URF Overtime" at
  30 s into combat: a sudden, huge buff (300% attack speed, 200% or 400% ability damage by source, 66% less CC, 66%
  healing reduction) for 15 s, because Riot "didn't like draws"; draws became rarer, not impossible. Patch 13.22 (2023)
  replaced the step with a stack every second: +10% damage and attack speed, -10% healing and shielding received and
  -10% CC duration (reductions capped at 70%). The lesson Riot acted on: a gradual ramp over a sudden step, and the
  ramp cuts defence rather than multiplying it. [P/W] [LoL wiki: V9.16](https://wiki.leagueoflegends.com/en-us/V9.16_(Teamfight_Tactics)),
  [Riot: 13.22 notes](https://teamfighttactics.leagueoflegends.com/en-gb/news/game-updates/teamfight-tactics-patch-13-22-notes/),
  [Sportskeeda summary](https://sportskeeda.com/esports/teamfight-tactics-tft-patch-13-22-official-notes-ryze-buffs-loot-drops-reworks-new-player-onboard-system)
- **Clash Royale (both sides, resource ramp, then a hard stop):** 3 minutes; elixir x2 in the last minute; tied games
  go to overtime (sudden death: first tower wins) with x2 then x3 elixir; if still tied, a tiebreaker drains all towers
  and the lowest-HP tower loses (added 2019 after esports showed it made tense finishes; the old flat 4-minute x2
  overtime and the timer were among Reddit's most complained-about items). The ramp speeds play; the hard stop
  guarantees an end. [P] [Supercell: November update](https://supercell.com/en/games/clashroyale/blog/release-notes/november-update),
  [Supercell: Elixir](https://support.clashroyale.com/hc/en-us/articles/49484936933403-Elixir),
  [W] [Wikipedia](https://en.wikipedia.org/wiki/Clash_Royale)
- **Hearthstone fatigue (the side that runs out, linear):** each draw from an empty deck deals 1, then 2, 3 ... and
  never resets. Most games end before it; control and mill decks use it as a win condition, and heavy-draw decks risk
  reaching it early. It was added (per a secondhand account of a Ben Brode interview) after a playtester's reaction to
  losing a very long game; before it, running out of cards was an instant loss. [W] [Hearthstone wiki: Fatigue](https://hearthstone.wiki.gg/wiki/Fatigue),
  [F] [Icy Veins: Brode answers](https://www.icy-veins.com/forums/topic/37018-ben-brode-answers-unsolved-hearthstone-mysteries/)
- **Inscryption Starvation (the stalled side's opponent gains attackers):** once you start a turn with nothing to draw,
  a Starvation card (1/1, each later one +1/+1, Airborne from the 5th) is played against you every turn. An anti-stall
  backstop, not a pacing clock. [W] [Inscryption wiki: Starvation](https://inscryption.fandom.com/wiki/Starvation)
- **Slay the Spire has no global clock;** pressure lives in individual enemies, shown by intents and buff icons:
  the Corrupt Heart (750 HP, Invincible 300, Beat of Death: 1 damage per card you play) buffs itself on a cycle that
  ends at +50 Strength; Time Eater ends your turn every 12 cards you play and heals/cleanses once (Haste) below half HP;
  the Transient (999 HP) hits 30, 40, 50 ... and fades after 5 turns (a reverse clock: survive it). [F/W]
  [HighGround: Heart](https://www.highgroundgaming.com/slay-the-spire-corrupt-heart-guide/),
  [ProGameGuides: Time Eater](https://progameguides.com/slay-the-spire/how-to-beat-the-time-eater-boss-in-slay-the-spire-strategies-deck-synergies-and-more/),
  [slaythespire.gg: Transient](https://slaythespire.gg/monsters/Transient)
- **Balatro and LBAL use a count, not a ramp:** a fixed number of hands a blind, a fixed number of spins a rent; the
  target is visible from the start and nothing escalates inside the round. (See Run structure.)
- **The pattern** (opinion, from the above): (1) a clock that hurts both sides equally becomes a win condition for
  whatever survives it best (BB fatigue builds, Bazaar shield builds, Hearthstone control), so the build that defends
  best is rewarded, not punished; (2) a clock that multiplies defence as well as offence can't break a stall where
  defence keeps up (Bazaar shield mirrors); TFT's fix was to cut healing and shielding as the ramp grows; (3) gradual
  beats sudden (TFT 9.16 -> 13.22); (4) clocks start near the long end of a normal fight (BB 17 s vs 10-20 s fights;
  Hearthstone after 30 cards), so most fights never see one; (5) they're announced as a named event with a visual
  change (night falls, "x2 Elixir"), and the long tail gets a hard stop or tiebreaker (Clash), since a ramp alone
  makes draws rarer, not impossible (TFT).

## Our mechanics, cross-checked
Our numbers below are computed from `src/race/race.ts` (YOUR_STRIP, RIVAL_STRIP, PAYTABLE), no tools used.

### The race: fixed spins, rival first, visible target
- **Precedent:** Balatro's blind and LBAL's rent are fixed visible targets with a fixed number of tries; ours is the
  same but the target is built live by a real opponent. Pachinko "reach" shows a visible last-reel decision is the
  peak moment. Bazaar/SAP show async opponents work when their strength is predictable.
- **Pitfall:** a target known early can make the last tries dead (already won / can't win); Balatro softens this
  because each hand left over pays $1 (see Shops, drafts and economy).
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

### The run's smallest shape (open)
- **Precedent:** boss last in each act/ante (StS floor 16, Balatro blind 3, Dicey floor 6); a won fight pays one pick
  of 3 (StS, LBAL); per-type growth (Balatro planets) makes focus the build; SAP refunds an early lost life.
- **Opinion (researcher's recommendation):** 3 stops x 3 races (race, race, boss) = 9 races, ~2 min each, ~20 min
  a run. BET x2, 2.5, 4 | 4, 5, 8 | 8, 10, 16 (x1.25 a race, boss x1.6, next stop starts at the boss's BET; x8 over
  the run). Prize: pick 1 of 3 "SYMBOL x2" (CHERRY, BAR, COIN, SEVEN, SWORD EDGE): per-symbol MULT, so focus
  compounds. Boss = BET jump only for now. A credit lost in stop 1 comes back when the stop-1 boss falls.
- **Main risk:** 5-spin variance swamps the build (a strong build still loses ~1 race in 3), so credits drain to luck.

### Rival cheats (open; the parked "telegraphed cheats" idea)
- **Precedent:** StS intents and Into the Breach show the threat before your turn; Balatro shows the boss an ante
  ahead and offers rerolls; Dicey Dungeons lets you pay a die to clear Shock. Our order (rival spins first each
  round) already puts any cheat it makes on its turn in front of your HOLD choice: a full telegraph with no extra
  "next spin" UI.
- **Pitfall:** the old game's cheats were watch-only taxes and were answered by GUARDS (a flat shield) that the user
  found retrofitted; Balatro's most-hated bosses are random (The Hook), permanent (The Arm) or non-interactive
  (Violet Vessel).
- **Opinion:** a cheat should target your standing payline (what HOLD would keep), be visible before HOLD, be
  answerable by not holding or by NUDGE, and last at most the race.

### TESLA's CHARGE / CHAIN (open; METER COMBAT)
- **Precedent:** see Streaks, chains and tempo. Closest fits: Wrath (two-way risk, chosen exit), Gonzo's capped
  x1-x2-x3-x5 ladder, Ride the Bus (full reset on a trigger you control), proration (cap the payoff of long chains).
- **Numbers (computed by hand, binomial approximation, not simulated):** with KNIGHT's prototype strip shape (5 of 15
  cells the attack symbol) about 3 bolts are in sight a spin. A 4-cell meter fills from empty on ~35% of spins from
  bolts alone (P(X>=4), X~Bin(9,1/3)); if a bolt on a winning line counts double, ~60%. At ~60% a turn, a chain
  reaches x3 about 36% of the time from a first FIRE and x4 about 22%.
- **Pitfall:** if continuation is near 100%, blocking is never worth it and the chain is inevitable; near 35%, the
  chain is a lottery the player can't steer, and the break reads as random (Obelisk-tie complaint).
- **Opinion:** break on a turn without a FIRE (user's rule) and NOT on being hit, so the block-or-keep-chain call is
  the Wrath decision; cap the ladder; meter size is the tuning knob (3/4/5).

### JUKEBOX's VOLUME, JOKER's JACKPOT, BANKROLL's CHIPS (open; METER COMBAT sketches)
- **Numbers (computed by hand from the 15-cell strip shape, 5 attack symbols, binomial, not simulated):** ~3 attack
  symbols in sight a spin. A row shows an exact pair of one 5-cell symbol 6/27 (22%) of the time and a jackpot 1/27
  (3.7%); across 3 rows, ~0.67 pairs and ~0.11 jackpots a spin, and ~59% of spins have at least one line win of
  that symbol (41% none).
- **JUKEBOX precedent:** StS poison + Catalyst (ramp, then burst), Hellsinger Fury (music meter). Pitfall: if the
  tick runs on BLOCK turns, blocking costs the ramp nothing (poison's "stacks itself while you defend"); a capped
  ramp where the burst always beats holding collapses into "fill and fire".
- **JOKER precedent:** line-only fill = slot volatility; must-hit-by meters. Pitfall (ours, from SHARP): a symbol
  that lands and does nothing reads as a blank; with line-only fill, ~2 in 3 landed CARDS do nothing.
- **BANKROLL precedent:** Balatro Bull/interest, Cash Cannon, Gil Toss. Pitfall: spending the run's savings as
  damage makes a bad fight a weaker shop (a death spiral); the Bull is skipped by players who spend.

### OVERTIME (open; phase 1 of the roadmap: a pay multiplier on both sides from about your 8th spin)
- **Precedent:** TFT 13.22 (both sides, stacks gradually, cuts healing/shielding), Backpack Battles fatigue and The
  Bazaar sandstorm (both sides, flat damage), Clash Royale (both-sides ramp, then a tiebreaker). Enemy-only pressure in
  single-player games is usually a per-enemy rule shown on that enemy (StS Heart, Time Eater), not a global clock.
  See Battlers > Fight clocks.
- **Pitfalls (opinion, applying the above to our rules):** a multiplier scales pays, so it can't shorten a fight's dry
  stretches (sabotage blanking reels, an enemy at 10-20 HP that any hit kills: phase 0's documented slog); it shortens
  fights that are already trading (big-HP elites, THE DEALER's hands). If shields and heals are multiplied too, a fight
  where defence keeps up with offence stays a stall (the Bazaar's shield mirrors). With the one-turn caps kept (40%,
  bosses 60%), late overtime turns the enemy's hits into cap-sized hits while yours stay uncapped, so in practice the
  clock tilts toward the player, and HP carries into the next fight. The HUD's SPINS counter counts both machines, so
  "your 8th spin" reads as SPINS 16.

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

### Act 1 sabotage's dead stretches (open; 2026-10-31 triage)
- **How each trick ends today** (read from `src/core/fightTricks.ts`, `fight.ts`): JAM and FREEZE already wear off
  (a turn count), FREEZE is capped at 2 reels, and a reel that thaws can't be frozen or jammed on the next enemy turn
  (a one-turn immunity window, the WoW move). SPILL stays on its strip cells until a spill pair (its reels) or jackpot
  (all) cleanses, and goes for Charmed cells first; stolen cells stay empty until a stolen-cell jackpot or the fight
  ends; ROCKS are added to the strips (up to 6 a trick, a strip at most 24 cells) until the fight ends.
- **Precedent:** see Roguelikes > Answering sabotage. Families: (a) wears off, (b) pay to clean, (c) cleaned by normal
  play, (d) caps and immunity, (e) sabotage as fuel.
- **Pitfall (ours):** SPILL and STEAL rely on (c) alone, and (c) fails in the worst case: the more of your strip is
  dead, the less likely the pair or jackpot that cleans it. OVERTIME then multiplies both sides while you can't pay.
- **Opinion:** (a) plus (d) fits a SPIN-only fight best (no new input, no change to HOLD): the same rule JAM and FREEZE
  already follow, so "everything done to your machine wears off" is one sentence; (b) needs a button and a resource;
  (e) belongs on optional relics or Charms (Evolve, Medical Kit), not the base rule.

### The CLAW (open; 2026-10-31 triage)
- **Today** (`CLAW`, `CLAW_PRIZES` in `src/core/encounters.ts`): 5 chips a go, 3 goes; aim at 10 CHIPS (holds 65%),
  2 CHARMS (40%) or A RELIC (20%); every miss reads SO CLOSE / IT SLIPPED. Computed: three goes at the relic win it
  49% of the time; at the Charms, 78%; the chips go is +1.5 chips a go on average. The only decision is the target,
  made once with odds hidden behind EASY / TRICKY / HARD.
- **Precedent:** Scrap Ooze (odds rise each miss, cost rises, leave any time), bridge UFO catchers (visible progress
  across goes), Isaac's crane (flat 25%, felt as rigged), Key Master (chance dressed as skill, sued).
- **Pitfall:** a miss that always says SO CLOSE is a dressed-up loss, the thing Nevada banned in slots (see Odds,
  near-misses and feel); a flat chance repeated reads as rigged (Wheel of Fortune, Isaac).
- **Opinion:** rework before cutting: keep the pick, make each miss move the prize visibly toward the chute (the
  odds climb, as Scrap Ooze's +10%), and say SO CLOSE only when it was. Then every go is a stop-or-push call, the
  HIGHER OR LOWER tension in a different shape.

### TESLA scaling one way (open; phase 4)
- **Today** (HP_GAME.md): bolt pays become CHARGE; every 40 fires a 60-damage strike (ignores shields, heals 5).
  Symbol levels raise the charge (strike count); BLAZE, OVERCHARGE, LIVE WIRE, MELTDOWN, CHAIN LIGHTNING raise each
  strike (added together since 2026-10-12, but still multiplied by the count). Leftover charge carries over, so 27% of
  its spins deal nothing; THE DEALER falls 89-96% when reached.
- **Precedent:** see Roguelikes > Hits x damage. Closest fit: Hearthstone's Arcane Missiles (boosts add bolts, each
  bolt fixed) and Slay the Spire's orb-slot cap; Peglin's patch shows the fix designers reach for when a product
  overflows.
- **Pitfalls (opinion, applying the above):** if strikes become the only axis, the heal (5 a strike) grows with it, and
  phase 0 already found TESLA's storms out-heal act 3; long storms cost animation time (StS caps orbs at 10). If damage
  per strike becomes the only axis, symbol levels lose their visible pay (fewer things change on screen). The 40-charge
  threshold, not the axis, is what makes dead spins: a lower threshold with a smaller strike keeps the damage rate and
  cuts them.
- **Opinion:** "every boost adds bolts, every bolt hits for the same" (the Hearthstone rule) reads best with SPIN as
  the input: a storm is counted in bolts, so power shows as a longer storm, not a bigger number on each bolt. The heal
  would need to be per storm, not per strike.

### THE OWNER as a wall (open; phase 4)
- **Today** (HP_GAME.md): 11 HP, a turn that hits takes exactly 1; beaten ~1.3% of meetings (the user's bar: under 2%).
  Shields, multipliers and VETERAN don't matter against him, so the last fight ignores the build's main number.
- **Precedent:** see Roguelikes > Endgame bosses: the Heart's shown per-turn cap, Greater Rift tiers and Clan Boss
  chests (damage scored on a ladder), the Reaper (a scaled wall that ends the run; killing it is a feat).
- **Pitfalls:** today's rule is a hidden-style cap (Isaac) dressed as HP: the shown hit is thrown away. Honest HP with a
  linear bar can't hold numbers that differ by orders of magnitude between builds; a wall with no win makes BROKE
  THE BANK meaningless; scaling his HP to your power (the Reaper) is fine as an announced ending, rubber-banding if
  it's hidden.
- **Opinion:** damage as the score on a x10 ladder (each milestone a banner that changes him, as 75/50/25% do now), the
  run still ending when he kills you, and the top milestone as BROKE THE BANK tuned to under 2%. A log ladder makes
  a 10x stronger build worth one more milestone, not an instant win.
