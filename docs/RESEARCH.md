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
- **Gamble is always "collect or gamble":** the win is shown and banked first, and COLLECT takes it at any step of
  the ladder (Rocky Horror, Crystal Maze and Peachy Bums fruit machine recreations). In a hi-lo gamble the odds are
  read off the number shown, with no percentage: on 9 only LO can win, on 1 only HI, a middle number is a coin flip.
  [F] [Peachy Bums guide](https://gamepretty.com/landlords-super-how-to-get-rich-with-peachy-bums-quickly/),
  [Rocky Horror](https://microsoft.com/en-us/p/rocky-horror-the-fruit-machine/9njqtw82xqpm),
  [Crystal Maze](https://www.microsoft.com/en-us/p/crystal-maze-the-fruit-machine/9nblggh4vq51)
- **Gamble pays no premium:** online slot gambles are double or nothing at 50% (colour) or x4 at 25% (suit), so at
  best EV-neutral; one source says they lower a slot's total return (96% to about 93-94% in its example). No source
  found that lists a 100%-return gamble. [F, affiliate pages] [casinos.com: gamble feature](https://www.casinos.com/slot-features/gamble-feature)
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

### Push your luck: bank or bet
- **Video poker breaks a sure pair for a premium:** 9/6 Jacks or Better pays a royal flush 250 a coin at 1-4 coins and
  4,000 at 5 coins (800 a coin, vs 1,250 if proportional), and the strategy charts rank "4 to a royal" above a paying
  high pair, which you throw away (a guide puts 4 to a royal at 19+ coins on average, 4 to a straight flush at about
  3.5; a kept high pair pays 1 a coin at least). The premium on the top hand is what makes giving up a sure pay
  right. Return 99.5% with perfect play.
  [F, strategy guides agree] [hardrock.bet strategy](https://www.hardrock.bet/casino/how-to-play-video-poker/jacks-or-better-strategies/),
  [esports.gg](https://esports.gg/guides/betting/jacks-or-better-strategy), [Las Vegas Advisor: 9/6](https://www.lasvegasadvisor.com/blog/9-5-better-9-6/)
- **Let It Ride:** three equal bets; after seeing cards you may pull back the first, then the second; the third always
  rides. Pays 1:1 on tens or better up to 1000:1 on a royal; house edge 3.51% with best play. The decision is "take
  money off the table", a bank, on cards you can see. [P] [NJ Admin. Code 13:47-20.27](https://www.law.cornell.edu/regulations/new-jersey/N-J-A-C-13-47-20-27),
  [W] [Wikipedia](https://en.wikipedia.com/wiki/Let_It_Ride_(card_game))
- **Can't Stop (Sackson):** roll as long as you like; STOP turns this turn's progress into permanent markers; a roll
  that can't move loses all of this turn's progress. [W/P] [Yucata rules](https://www.yucata.de/en/Rules/CantStop),
  [Parker rules transcription](https://goblins.net/files/downloads/Can%20stop%20Eng.pdf)
- **Quacks of Quedlinburg softens the bust:** a pot explodes when white chips pass 7; an exploded player still scores,
  but picks points or shop money, not both. The loss is half, not all, so pushing stays attractive. [W]
  [Wikipedia](https://en.wikipedia.org/wiki/The_Quacks_of_Quedlinburg), [Meeple Mountain](https://www.meeplemountain.com/reviews/the-quacks-of-quedlinburg/)
- **Loss aversion:** losses weigh about 2.25x equal gains (Tversky & Kahneman 1992, small sample); a 2024
  meta-analysis puts the mean near 1.96. It depends on the reference point: the same outcome framed as a missed bonus
  or a lost sure thing is felt differently. [P via summary] [Healthcare Economist: estimates](https://healthcare-economist.com/2024/06/26/empirical-estimates-of-loss-aversion)
- **Odds without a percentage:** hi-lo shows the number (above); Balatro prints "1 in 4" / "1 in 6" on cards and adds a
  deck view (a talk transcript says playtest builds lacked it), so players count outs themselves. LocalThunk confirmed
  Wheel of Fortune really is 1 in 4 after "rigged" threads. [F] [GamesRadar](https://gamesradar.com/games/roguelike/balatro-maker-promises-that-the-dodgiest-odds-in-the-hit-roguelike-arent-deceiving-you),
  [Balatro design video transcript](https://amara.org/videos/qZaMrU6iDy4J/en/4529388)
- **Design lore** (secondary, weak): the tension needs a bank worth taking and a risk that can win; if the safe play is
  always right, or the risk never is, players learn it and the choice dies. [F] [I Slay the Dragon: pressing your luck](https://islaythedragon.com/guides/a-guide-to-pressing-your-luck)
- **No slot roguelike found with a risky hold:** Slots & Daggers' stops lock reels and nudges cost chips; CloverPit
  changes values and odds; LBAL has no hold. (Searched, not exhaustive.) [F] [Slots & Daggers review](https://www.useapotion.com/2025/11/slots-daggers-review-a-clever-spin-on-roguelites/),
  [GamesAsylum: CloverPit](https://www.gamesasylum.com/?p=63153)
- **The pattern** (opinion, from the above): every lasting push-your-luck puts a sure, visible amount (a banked win,
  a pat pair, progress this turn) against a gamble at the moment you choose, and either pays a premium for the
  gamble (video poker's royal) or softens the bust (Quacks). Pure double or nothing pays no premium and is the
  feature players skip.

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

### One meter, two builds (stay high vs cash in, attack vs defend)
- **Slay the Spire Watcher, three builds on one stance system:** Mantra is a counter; at 10 you lose 10 and enter
  Divinity (+3 energy on entry, attacks deal triple damage; sources disagree on whether it ends at the end of the turn
  or the start of the next). Calm gives 2 energy when you leave it. The defensive payoffs are cards that read the
  same system: Mental Fortress (power, 1 energy) gives 4 Block every stance change (6 upgraded), so the cycle itself
  defends; Like Water gives Block at the end of your turn if you're in Calm (the one card that rewards *staying*; its
  number wasn't confirmed). Guides: "the main benefit of Calm is leaving it ... except for Like Water"; one tier list
  rates Like Water and Mental Fortress S. A Steam post: with Mental Fortress "you almost eliminate the need to use
  block cards". The stance-dance build is called luck-dependent (needs many Wrath cards). [W/F]
  [StS wiki: Stance](https://slaythespire.wiki.gg/wiki/Stance), [HighGround: Watcher builds](https://www.highgroundgaming.com/slay-the-spire-watcher-guide-tips-builds/),
  [TwoAverageGamers](https://www.twoaveragegamers.com/ultimate-slay-the-spire-watcher-guide/),
  [Steam](https://steamcommunity.com/app/646570/discussions/0/1752399434794999710), [gamertweak tier list](https://gamertweak.com/slay-the-spire-tier-list),
  [slaythespire.info: archetypes](https://slaythespire.info/en/the-watcher-beginners-guide-strategies-deck-archetypes/)
- **Guitar Hero Star Power / Rock Band Overdrive (one meter, score and survival in the same activation):** glowing
  phrases fill it; activating raises the score multiplier and (Guitar Hero 2005) makes each note count much more on
  the Rock Meter, so players fire it to survive hard sections they'd otherwise fail. Warriors of Rock needs it at
  least half full. Rock Band: any player's Overdrive revives a failed bandmate, at most twice a song; the multiplier
  math differs by source (x2 is common). The same button is offence or rescue depending on what the screen shows.
  [W] [Wikipedia: Guitar Hero](https://en.wikipedia.org/wiki/Guitar_Hero_(video_game)), [Warriors of Rock](https://en.wikipedia.org/wiki/Guitar_Hero:_Warriors_of_Rock),
  [Rock Band 2](https://en.wikipedia.org/wiki/Rock_Band_2), [Rock Band](https://en.wikipedia.org/wiki/Rock_Band_(video_game))
- **Monster Train 2 Valor (Banished):** a stacking status that raises attack and also gives armor to a unit in the
  front (timing differs by source: end of turn vs at resolve, up to its Valor stacks); units gain Valor by moving
  (Shift). One status feeds both the attack and the shield side. [F] [Deltia's: Banished](https://deltiasgaming.com/?p=237729),
  [Steam](https://steamcommunity.com/app/2742830/discussions/0/591763667545003730)
- **NecroDancer, items that profit from keeping the streak:** obsidian weapons' damage rises with the coin
  multiplier (Cadence of Hyrule guide: 1, then 2 after a kill, 3 at the max multiplier; the original's numbers not
  confirmed); SYNCHRONY's onyx weapons gain damage on consecutive hits and lose it when you move. The streak meter
  gets a second payoff (damage now) without a second meter. [F/P] [zeldauniverse](https://zeldauniverse.net/guides/cadence-of-hyrule/strategy/what-is-crypt-of-the-necrodancer/),
  [Steam](https://steamcommunity.com/app/247080/discussions/0/570371033831310910), [Brace Yourself: SYNCHRONY](https://braceyourselfgames.com/2022/08/04/necrodancer-synchrony-dlc-available-now-v3-1-0/)
- **Balatro Supernova:** +Mult equal to the times the played hand type has been played this run; no reset, so it's
  worth the same whenever you buy it. The no-reset counterpart to Ride the Bus (resets) and Green Joker (decays).
  [F] [Steam](https://steamcommunity.com/app/2379780/discussions/0/4346606879520278803), [PocketGamer](https://www.pocketgamer.com/balatro/joker-tier-list/)
- **Balatro Splash:** every played card scores, not only the hand's. Rated S by some lists and C by others: strong
  in High Card, Pair and enhanced-card builds, otherwise little. It widens what counts rather than adding a payoff.
  [F] [PocketGamer](https://www.pocketgamer.com/balatro/joker-tier-list/), [Steam](https://steamcommunity.com/app/2379780/discussions/0/7410182519536290893)
- **Peglin bomb vs crit:** a bomb peg is lit by one hit and explodes on the second for 50 to every enemy (before the
  orb's own damage); crit pegs swap in an orb's crit value. Players advise committing hard to one ("every shot HAS to
  be a crit") and say bomb items are hard to find twice in a run; guides say bombs fall off late against big HP.
  [W/F] [speedrun.com guide](https://www.speedrun.com/Peglin/guides/6xu76), [gamepretty](https://gamepretty.com/peglin-guide-basic-gameplay-orbs-relics-and-tricks/),
  [Peglin wiki: Critical Peg](https://peglin.wiki.gg/wiki/Critical_Peg)
- **Hi-Fi Rush:** two meters with different jobs: a rhythm meter (on-beat play raises it, getting hit lowers it; it
  sets the score multiplier) and a Reverb bar spent on specials or Jam Combos. [F] [TheGamer](https://www.thegamer.com/hi-fi-rush-best-attacks-combos-guide/),
  [Prima review](https://primagames.com/featured/hi-fi-rush-review)
- **Pick-your-volatility free spins (video slots):** some bonuses let you choose many spins at a low multiplier or
  few at a high one (e.g. 20 spins at x2-4 vs 5 at x8-15); the return is the same, only the swing differs. Sources are
  SEO pages; no named game verified. [F] [slotstemple](https://www.slotstemple.com/slots-by-feature/multiplier/)
- **The pattern** (opinion, from the above): the second build that works reads the *same* meter and the *same*
  moment and pays in the other currency (Mental Fortress: the cycle gives Block; Valor: one stack gives attack and
  armor; Star Power: one activation scores or rescues). "Stay high" payoffs need the meter to be able to sit high:
  Like Water works because Calm doesn't force an exit, and Watcher guides still call leaving Calm the default. Widening
  what counts (Splash) speeds the same engine; it doesn't make a second one. Two-meter designs (Hi-Fi Rush) give each
  meter a different job and a different place on screen.

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

### Late-game threat when the build snowballs (keeping the back half dangerous)
- **Front-loaded difficulty is common, even in Slay the Spire:** a Steam player reports losing 50% of runs in act 1
  and 17% in acts 2-3 ("act 1 is the most dependant on luck"); a beginners' guide notes the first three hallway fights
  of act 1 (two in acts 2-3) draw from an easier pool. For Slay the Spire 2, coverage of the v0.103 beta says it
  smoothed act 1's spikes and nerfed Living Fog (called one of act 1's most run-threatening normal enemies), and
  reports a stated long-term plan to shift difficulty from act 1 to act 3; a PC Gamer editor asked for the same. The
  Mega Crit wording wasn't read directly. [F] [Steam: act 1 hardest](https://steamcommunity.com/app/646570/discussions/0/1779387743942133058/?ctp=2),
  [untapped: v0.103.0](https://sts2.untapped.gg/en/articles/patch-v01030), [sts2.gg: April 2026 patches](https://sts2.gg/guides/april-2026-patch-guide),
  [PC Gamer: 12 opinions](https://www.pcgamer.com/games/card-games/slay-the-spire-2-opinions/)
- **Slay the Spire Ascension's late-game levers:** A1 about 60% more elites on the map; A2 normal enemies deadlier;
  A5 the boss heals 75% of missing HP instead of 100%; A20 two act 3 bosses (sourced). From the well-known list, not
  re-verified: A3/A4 elites/bosses deadlier, A7-A9 tougher (HP), A14 lower max HP, A17-A19 smarter move sets. Slay the Spire 2 folds 20 into 10 (its A2: the Ancients heal 80%). Most of the climb is more
  elites, harder elites and less healing, not bigger normal fights. [W] [StS wiki: Bosses](https://slay-the-spire.fandom.com/wiki/Bosses),
  [F] [HighGround: Ascension](https://www.highgroundgaming.com/slay-the-spire-ascension-guide/), [PCGamesN: StS2 Ascension](https://www.pcgamesn.com/slay-the-spire-2/ascension-levels)
- **Slay the Spire anti-burst enemies (the build-specific check):** Spheric Guardian starts every fight with Barricade
  (its Block doesn't expire) and Artifact 3; Shelled Parasite starts with Plated Armor 14 and is stunned when it's
  broken (guides: open with one big hit). Nemesis (act 3 elite) turns Intangible (all damage to it is 1) before
  attacking and loses it after; players: "you hit him for 1, he gets to hit you for 40 ... multiple times", "not being
  able to attack for two whole rounds is ... unfun"; called most frustrating for burst decks. Giant Head starts with
  Slow and a countdown to a growing hit ("basically death" for slow decks, a free setup turn for others). Reptomancer
  summons daggers (a player reports 93 damage on turn 2), which needs area damage. [W/F] [slaythespire.gg: Spheric Guardian](https://slaythespire.gg/monsters/Spheric_Guardian),
  [fandom: Plated Armor](https://slay-the-spire.fandom.com/wiki/Plated_Armor?oldid=3719), [fandom: Nemesis](https://slay-the-spire.fandom.com/wiki/Nemesis?oldid=8414),
  [Steam: Nemesis](https://steamcommunity.com/app/646570/discussions/0/1692659769963403954), [slaythespire.gg: Nemesis](https://slaythespire.gg/elites/Nemesis),
  [fandom: Giant Head](https://slay-the-spire.fandom.com/wiki/Giant_Head), [Steam: act 3 elites](https://steamcommunity.com/app/646570/discussions/0/3667553846824629673)
- **Slay the Spire Surrounded (act 4 elites, Spire Shield and Spear):** the one behind you deals 50% more; no rest
  between them and the Heart. [F] [HighGround: Heart](https://www.highgroundgaming.com/slay-the-spire-corrupt-heart-guide/), [slaythespire.gg: Spire Shield](https://slaythespire.gg/elites/Spire_Shield)
- **Hades Heat conditions that target the late build:** Damage Control: each rank (max 2) gives foes a shield that
  absorbs one hit. Guides: one rank "can cancel out huge amounts of damage" for big-hit weapons (Arthur, Beowulf);
  fast weapons barely notice; players add it as cheap Heat. Benefits Package: armored foes (elites) get 1 random perk
  a rank (max 2; examples range from slowing you to regenerating). Lasting Consequences: -25% healing a rank (sources
  disagree on the max rank). Extreme Measures gives bosses new attacks (see Endgame bosses). [F] [Prima: Pact](https://primagames.com/gaming/hades-guide-pact-of-punishment-modifiers-heat),
  [RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards),
  [Steam: Damage Control by weapon](https://steamcommunity.com/app/1145360/discussions/0/6960928795829130328), [Looper: 32 Heat](https://www.looper.com/331042/how-to-beat-hades-with-32-heat)
- **Balatro's late threat is rules aimed at the engine, not a cap:** ante 1 draws from only the 8 mildest boss blinds;
  the ante 8 finishers are Crimson Heart (a random Joker disabled each hand), Verdant Leaf (all cards debuffed until
  you sell a Joker), Amber Acorn (Jokers flipped and shuffled), Cerulean Bell (one random card forced into every
  hand) and Violet Vessel (a huge blind). Your score is never capped; the finisher asks whether the engine survives
  losing a piece. One base-stake player: "Antes 1-6 were super easy", then lost to the ante 8 boss. [F]
  [Steam: finishers](https://steamcommunity.com/app/2379780/discussions/0/4346607305581387321), [Dot Esports: antes and blinds](https://dotesports.com/indies/news/balatro-antes-blinds-explained),
  [Steam: easy then ante 8](https://steamcommunity.com/app/2379780/discussions/0/4293690852344929651)
- **Darkest Dungeon surprise (ambush):** a random roll (darker light raises the odds) gives the enemies the first
  turn and shuffles your party's ranks; players report wipes of fully upgraded parties, and the fixed-map final
  dungeon has no ambushes. Random first-turn ambush is a known frustration. [F] [Steam](https://steamcommunity.com/app/262060/discussions/0/1733216261950541723),
  [LP Archive](https://lparchive.org/Darkest-Dungeon/Update%2021)
- **Super Auto Pets start of battle (acting first, but planned):** Dolphin deals 4 to the lowest-HP enemy, Mosquito 1
  to a random one, before anyone attacks; a 2022 tier list: "it doesn't matter if you have 50 attack if you can be
  one-shotted by a mosquito". The first strike belongs to a build you can see, not to chance. [W/F]
  [SAP wiki: Dolphin](https://superautopets.wiki.gg/wiki/Dolphin), [SAP wiki: Mosquito](https://superautopets.wiki.gg/wiki/Mosquito),
  [TwoAverageGamers tier 3](https://www.twoaveragegamers.com/ultimate-super-auto-pets-tier-list-all-tier-3-pets)
- **Battlers keep late danger by matching builds:** Backpack Battles and The Bazaar pit you against ghosts of other
  players' builds from the same round or day (Backpack Battles also by rank), so the opponent has snowballed too; a
  Bazaar PvP loss costs Prestige equal to the day. [W/F] [Wikipedia: Backpack Battles](https://en.wikipedia.org/wiki/Backpack_Battles),
  [Mobalytics: Prestige](https://mobalytics.gg/the-bazaar/guides/prestige)
- **Inscryption's queue:** the opponent places cards in a back row that move to the front at the start of its turn,
  so its next move is shown a turn early; players call it an advantage. [F] [Steam](https://steamcommunity.com/app/1092790/discussions/0/3882725766418978069),
  [Gigazine](https://gigazine.net/gsc_news/en/20220213-inscryption)
- **Monster Train relentless bosses:** the boss fights on until it or your units on that floor die, climbing toward
  the Pyre (your run's HP); the threat is on its own track, not your turn. [F] [Rogueliker](https://rogueliker.com/monster-train-review/),
  [Steam: MT2 boss](https://steamcommunity.com/app/2742830/discussions/0/591764116171932268)
- **Peglin, the failure case:** a review says that by the late areas "you're either too under-powered to defeat the
  beefy enemies or too over-powered to feel like your input on the ball even matters"; players call the base game
  "ludicrously easy" and Cruciball (20 stacked levels) a jump to an "RNG fest". [F] [gamepressure](https://www.gamepressure.com/games/peglin/z362e6),
  [Steam](https://steamcommunity.com/app/1296610/discussions/0/7336985071474236410)
- **Slot roguelikes:** Slots & Daggers players say the bomb and magic builds make it "too easy and monotonous once
  discovered" (a review summary); a CloverPit review says late runs feel like "fighting RNG" (the opposite complaint).
  [F] [VaporLens: Slots & Daggers](https://vaporlens.app/app/3631290/slots_daggers), [TrendingNow: CloverPit](https://trendingnow.games/reviews/cloverpit-review)
- **Inverse difficulty curves** (Josh Bycer): games that start hard and get easier as the player grows; he argues they
  work best in skill-based games. [F] [Game Developer](https://www.gamedeveloper.com/design/reversing-the-difficulty-curve-in-game-design-),
  [Game Wisdom](https://game-wisdom.com/critical/inverse-difficulty-curves-game-design)
- **The pattern** (opinion, from the above): in deckbuilders the late hallway fights are allowed to be a payoff; the
  late danger lives in elites and bosses, and those threaten through rules aimed at the build (a disabled piece,
  Surrounded, a forced card, an armored-elite perk) or through more and harder elites (Ascension 1-4), not through
  caps on your hit. Caps that blank a big hit (Nemesis, Damage Control on heavy weapons) are what burst players hate
  most. Growth inside a fight (Giant Head, Ritual) only threatens builds that are slow, so a one-turn kill skips it;
  less healing only bites if damage is being taken. Acting first is accepted when it's planned and visible (SAP,
  Inscryption's queue, a boss shown ahead) and hated when it's a random ambush (Darkest Dungeon). Battlers get late
  danger for free because the opponent snowballed too.

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

## Market (Steam, the slot and gambling roguelike niche)
Sales are developer or publisher statements unless marked "est." (Boxleiter estimate: Steam reviews x 30-60;
GameDiscoverCo's "NB number" from 237 games' real data is a median 58, mean 63 sales a review, falling for newer
releases; SEO calculator sites claim ~30). Third-party trackers (Raijin, SteamPulse, VaporLens, steamdata.ai) often
disagree by 3x; treat them as a range, not a number. [P] [GameDiscoverCo: NB number](https://newsletter.gamediscover.co/p/how-that-game-sold-on-steam-using),
[F] [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-review-to-sales-multiplier)

### Who sold, who didn't
- **CloverPit** (Panik Arcade, publisher Future Friends; $9.99; Sept 2025): 100k copies day one, 500k in 8 days,
  750k in 2 weeks, 1M+ by Nov 2025 (developer). ~21-25k Steam reviews, ~90% Very Positive (snapshots vary), so ~40
  sales a review. Before launch: demo out with the reveal (April 2025), 100k wishlists in the first week after it,
  ~150k wishlists and 200k+ demo activations; 680k demo downloads by Next Fest. Publisher: all marketing organic, no
  paid ads or influencers; "works really well for streamers"; luck "played a big role". Hook: a first-person horror
  cell where you feed a slot machine to pay a debt. [P] [Game Developer: 500k](https://gamedeveloper.com/business/cloverpit-has-sold-500-000-units-in-eight-days),
  [PC Gamer: 1M](https://www.pcgamer.com/games/roguelike/slot-machine-roguelike-cloverpit-sells-1-million-copies-and-its-developer-celebrates-the-payout-by-adding-its-most-requested-feature-yet),
  [GameDiscoverCo: 100k wishlists](https://newsletter.gamediscover.co/p/how-cloverpit-added-100k-steam-wishlists),
  [W] [Wikipedia](https://en.wikipedia.org/wiki/CloverPit)
- **Slots & Daggers** (solo dev Friedemann Allmenröder, publisher Future Friends; $7.99 list, 30% launch discount;
  Oct 2025): 100k in 10 days ("a surreal number for a solo dev"); 300k per its mobile-launch press release (Raijin
  est. ~176k on Steam, 7,323 reviews, 94%, July 2026). Release date announced at Next Fest with a demo the press
  singled out. Hook: a dungeon crawl inside a slot machine on a pub table. Xbox / Switch May 2026. [P] [GamesRadar](https://www.gamesradar.com/games/roguelike/another-roguelike-success-story-has-hit-steam-d-and-d-flavored-slot-machine-slots-and-daggers-sells-100-000-copies-in-10-days-a-surreal-number-for-a-solo-dev-like-me),
  [GamesPress](https://www.gamespress.com/de/Slots-Daggers-out-now-on-mobile-Slot-machine-roguelite-hit),
  [F] [Dekudeals](https://www.dekudeals.com/items/slots-and-daggers)
- **Luck be a Landlord** (solo, self-published, $9.99, 1.0 in 2023): no official total found; steamdata.ai est.
  ~920k copies, $5.6M gross. [F] [steamdata.ai](https://steamdata.ai/game/1404850)
- **Dungeons & Degenerate Gamblers** (blackjack duels, publisher Yogscast, Aug 2024): publisher says $1M+ gross in
  the first month; ~3,400 reviews, 82%; critics "mixed or average", Siliconera: in "Balatro's shadow". Est. 100-200k.
  [W] [Wikipedia](https://en.wikipedia.org/wiki/Dungeons_%26_Degenerate_Gamblers), [F] [Siliconera](https://www.siliconera.com/?p=1046146)
- **Ballionaire** (pachinko, publisher Raw Fury, Dec 2024): ~2,550 reviews, 86%; critics favourable (PC Gamer 80).
  Est. 75-150k (trackers range 63k-343k). Complaints: balance, RNG. [W] [Wikipedia](https://en.wikipedia.org/wiki/Ballionaire),
  [F] [VaporLens](https://vaporlens.app/app/2667120/ballionaire/stats/details)
- **The middle and the bottom:** Spin Hero (slot deckbuilder, publisher Goblinz, Oct 2024, ~7.99 EUR): ~1,050
  reviews, 72% Mostly Positive, est. 30-65k; complaints "repetitive quickly", RNG. Slot & Dungeons (MUC Games, 1.0
  July 2026): ~300 reviews, ~82-86%, est. 9-18k (trackers 8.6k-24k), recent reviews Mixed. Runeborn (rune reels,
  March 2026): ~290 reviews, 80%. Rogue Slots (free, Dec 2025): 56 reviews, 64%, "basic and low effort". Slot or Die
  (June 2026): a handful of reviews. Slotbound (3x3 slot auto-battler) launches 2026-11-09. [F] [VaporLens: Spin Hero](https://vaporlens.app/app/2917350/spin_hero/stats/details),
  [Raijin: Slot & Dungeons](https://raijin.gg/app/3160090/Slot_Dungeons), [datahumble: Rogue Slots](https://datahumble.com/rogue-slots-2462430),
  [Steam: Rogue Slots reviews](https://steamcommunity.com/app/2462430/reviews?l=english&browsefilter=toprated)
- **Crowding:** PC Gamer (Feb 2026) called Next Fest "full of Balatro-likes" (chess, coin pusher, minesweeper,
  word games); RPS: indie genres "converged into grimdark Balatro". No count of slot roguelikes on Steam found. No
  released Steam game found where your slot machine fights enemy slot machines with HP, but slot duels are coming:
  DEAD SPIN (late 2026) and Slotomancer (Early Access) fight opponents (see Launch appeal review below). [F] [PC Gamer: Next Fest](https://www.pcgamer.com/games/roguelike/steam-next-fest-is-full-of-balatro-likes-heres-7-demos-i-think-you-should-try/),
  [W] [Wikipedia: Slots & Daggers](https://en.wikipedia.org/wiki/Slots_%26_Daggers)
- **The whole store:** ~20,000 releases in 2025; nearly half never reached 10 reviews; ~66% earned under $1,000 (est.
  from Gamalytic). [F] [GamesRadar](https://gamesradar.com/games/over-5-000-games-released-on-steam-this-year-didnt-make-enough-money-to-recover-the-usd100-fee-to-put-a-game-on-valves-store-research-estimates),
  [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/median-steam-game-2026)
- **Pattern** (opinion, from the above): every hit had a free demo out months before launch and a hook that puts the
  slot machine inside another fantasy (a debt cell, a dungeon, a landlord); the two 2025 hits share a publisher
  (Future Friends). Games that sold tens of thousands rather than hundreds of thousands sat at 72-86% with
  "repetitive" and "RNG" complaints; the bottom tier had no visible pre-launch presence. Price ($8-10) didn't separate
  them.

### Common negative-review complaints in the genre
- Repetitive after a few runs; "too much RNG, not enough skill" (CloverPit; the developer answered that items steer
  the RNG); late runs "fighting RNG" (CloverPit); "too easy and monotonous once discovered" builds (Slots & Daggers);
  balance and RNG (Ballionaire, Spin Hero); "in Balatro's shadow" (D&DG). See also Late-game threat > Slot roguelikes.
  [F] [Steam: CloverPit RNG](https://steamcommunity.com/app/3314790/discussions/0/506200271931572835),
  [TrendingNow](https://trendingnow.games/reviews/cloverpit-review), [VaporLens: Slots & Daggers](https://vaporlens.app/app/3631290/slots_daggers)

### Wishlists to money
- **First week:** median 0.15x launch wishlists for games with 25k+ wishlists (Sept 2024-Sept 2025 launches); 0.10x
  for games over $10; 0.17x in the 2024 survey (10k+ wishlists). Older study of ~420 games: median 10.5%, 25th
  percentile 4.8%. GameDiscoverCo sees no decline in conversion, only harder-to-get wishlists. [P] [GameDiscoverCo via gamedevreports](https://gamedevreports.substack.com/p/gamediscoverco-the-state-of-steam),
  [GameDiscoverCo: new expectations](https://newsletter.gamediscover.co/p/steam-the-new-wishlists-to-first)
- **First month:** median ~27% (first week ~22%) in a ~700-game set (5k+ wishlists, 500+ sales); 10th-90th
  percentile 0.06x-1.34x; 95%+ rated games median 0.51x; full releases ~30% vs Early Access ~20%. [P]
  [GameDiscoverCo: conversion benchmarks](https://gamedevreports.substack.com/p/gamediscoverco-conversion-benchmarks)
- **Launch-day wishlists still predict month-one sales** (R^2 0.77 for 2020-22, 0.72 for 2023-25), though one
  wishlist is worth less than it was (hover-wishlisting, more Next Fests). [F] [Inven Global on Zukowski](https://www.invenglobal.com/articles/27273/steam-wishlist-inflation-value-of-1-wishlist-cut-in-half-but-predictive-power-remains-unchanged)
- **Wishlist floors:** a secondary source quotes Zukowski's tiers as 5k bronze, 8k silver, 50k gold, 90k diamond, and
  7k as the usual floor to launch; not checked against his own page. [F] [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/how-many-wishlists-before-launch)
- **First year vs first week (revenue):** median 2.64x for 2023 releases (3.6x for 10k-50k week-one copies);
  GameDiscoverCo's earlier range 2-5x; Jake Birkett's survey 2-12x, plan on 3x. [P] [GameDiscoverCo: long tail](https://gamedevreports.substack.com/p/gamediscoverco-games-long-tail-revenue),
  [Grey Alien Games](https://greyaliengames.com/blog/steam-week-1-vs-year-1-revenue/)
- **Net per copy:** Valve takes 30% (25% past $10M, 20% past $50M) after VAT/sales tax and refunds; calculators put
  the developer's take at ~40-55% of the US list price once regional pricing (~15% less), refunds (~5%) and discounts
  are in; before income tax. [F] [impress.games](https://impress.games/blog/calculate-estimate-steam-game-sales-revenue-profit),
  [Unity forum](https://discussions.unity.com/t/estimating-net-revenue-from-steam-game-sales-minus-returns-regional-pricings-discounts-vat-etc/917825)
- **Worked example** (opinion, arithmetic from the medians above, not a forecast): at $8.99, ~$4.25 net a copy before
  income tax; first year ~ 0.15 x 2.7 = ~0.4 full-price copies per launch wishlist. Net $5k needs ~1,200 copies,
  ~3,000 launch wishlists; $20k ~4,700 copies, ~12,000 wishlists; $50k ~11,800 copies, ~30,000 wishlists. The
  spread (10th-90th percentile) is 20x either way, so these are midpoints only.
- **Next Fest:** Feb 2027 runs Feb 22-Mar 1, registration closes 2027-01-10; June 2027 registration closes
  2027-04-25. Survey medians for wishlists gained during a fest: ~806 (HTMAG, 182 devs) or ~460 (presskit.gg, Feb
  2026); fest wishlists track pre-fest wishlists (r = 0.825), with a takeoff above ~2,000 pre-fest; demos released
  months before the fest gained ~2.5x the median of demos launched at the fest; 68-88% of fest wishlists came from
  people who never played the demo. [P] [Steamworks: Feb 2027](https://partner.steamgames.com/doc/marketing/upcoming_events/nextfest/feb_2027),
  [F] [cinevva summary](https://app.cinevva.com/guides/steam-next-fest-strategy.html), [presskit.gg](https://presskit.gg/field-guides/steam-next-fest-guide)

### Gambling themes: ratings, stores, platforms
- **PEGI:** Balatro went PEGI 3 -> 18 ("prominent gambling imagery") -> 12 on appeal (Feb 2025, "mitigating
  fantastical elements"); Luck be a Landlord 18 -> 12 ("no specific transferable gambling skills"). PEGI said its rule
  had been "any promotion or education of simulated gambling results in an 18+ rating", promised more granular
  criteria, and kept 18 for casino and betting-hall simulations. From June 2026 PEGI rates paid random items (loot
  boxes, packs, prize wheels for real money) 16 and social casino 18; reports conflict on whether older games are
  re-rated. [P/W] [PC Gamer](https://www.pcgamer.com/games/card-games/balatro-finally-escapes-its-silly-18-age-rating-pegi-promises-a-more-granular-set-of-classification-criteria-for-gambling-themed-games-in-the-future),
  [Game Developer](https://gamedeveloper.com/business/balatro-s-contentious-pegi-18-rating-has-been-amended-thanks-to-mitigating-fantastical-elements-),
  [KitGuru: June 2026](https://www.kitguru.net/gaming/matthew-wilson/pegi-ratings-board-to-finally-crack-down-on-loot-boxes-in-games/)
- **ESRB:** Balatro is E10+. ESRB's "Simulated Gambling" descriptor means gambling without real money. [F] [PCGamesN](https://www.pcgamesn.com/balatro/age-rating-change)
- **Australia:** since September 2024, games with interactive simulated gambling are R18+ (paid loot boxes M);
  Balatro got M ("simulated gambling") in Dec 2024 per Stevivor, which conflicts with the rule (grandfathering is
  claimed, unverified). [F] [Checkpoint Gaming](https://checkpointgaming.net/news/2024/09/australia-implements-new-regulations-classifying-new-games-with-gambling-like-content-as-adults-only),
  [Stevivor](https://stevivor.com/news/balatros-localthunk-lashes-out-at-pegi-over-18-rating/)
- **South Korea:** gambling elements mean 15+ at least; a refused rating means it can't be sold. GRAC rated Luck be a
  Landlord 12+, then 19+ in May 2024 (appeals rejected); Apple then forced a 17+ rating worldwide. [W] [Wikipedia: GRAC](https://en.wikipedia.org/wiki/Game_Rating_and_Administration_Committee),
  [P] [TrampolineTales blog](https://blog.trampolinetales.com/luck-be-a-landlord-is-banned-in-south-korea-again/)
- **Google Play** blocked Luck be a Landlord in 13 countries (UAE, Algeria, Iran, Jordan, South Korea, Libya, Oman,
  Palestine, Qatar, Saudi Arabia, Syria, Tunisia, Yemen) in Aug 2023 under its simulated-gambling policy; appeals got
  a screenshot and "this is gambling". Mobile stores, not Steam. [P] [Game Developer](https://gamedeveloper.com/business/-i-luck-be-a-landlord-i-gets-evicted-from-13-countries-on-google-play-store),
  [W] [Wikipedia](https://en.wikipedia.org/wiki/Luck_Be_a_Landlord)
- **YouTube:** March 2025 rules age-restrict depictions of online casino sites; in April 2025 Balatro videos were
  age-restricted by mistake (Balatro University: 119 of 606 videos), and YouTube said Balatro gameplay "should not be"
  restricted. From 2025-11-17 content depicting social casino games (virtual slots, roulette, poker with nothing of
  real value) is age-restricted. [P/F] [PC Gamer: review](https://www.pcgamer.com/games/youtube-is-conducting-a-platform-wide-review-after-mistakenly-hitting-balatro-videos-with-an-age-restriction-for-gambling-content),
  [Mondaq](https://www.mondaq.com/unitedstates/gaming/1700392/youtube-tightens-age-restrictions-on-violent-and-gambling-related-gaming-content)
- **Twitch** (Oct 2022, widened Aug 2023) bans streaming unlicensed real-money slots, roulette and dice sites and their
  links; it targets sites, not games. [F] [Mishcon de Reya](https://www.mishcon.com/news/twitch-announces-revised-gambling-policy)
- **Pattern** (opinion, from the above): the risk scales with how much the game looks like a casino (real card games,
  casino tables, chips) and how little fantasy covers it; the winners all had a fantastical frame. Mobile stores and
  automated video moderation are where it bites, not Steam.
- **Steam's own survey:** the built-in content survey sets Steam's ratings (Germany since 2024-11-15, Indonesia's IGRS
  too); Valve added questions for games that simulate gambling, and a bug gave Umamusume a wrong 18+ in Indonesia
  (shown April 2-5; the report gives no year). [P/F] [Steamworks: Germany](https://partner.steamgames.com/doc/gettingstarted/contentsurvey/germany),
  [Automaton](https://automaton-media.com/en/news/steam-apologizes-for-technical-bug-that-gave-umamusume-pretty-derby-an-18-age-rating-in-indonesia-while-adult-japanese-games-like-saya-no-uta-got-rated-3/)
- **CloverPit** is ESRB T ("simulated gambling" among its descriptors), per a retailer listing. [F] [Gamers Unchained](https://www.gamersunchained.com/game/nintendo/cloverpit)

### Launch appeal review 2026-11-09
Full answer: `tools/out/qa/MARKET.md` (gitignored). Store pages could not be fetched; figures are from search results
and trackers.
- **2026 slot roguelikes (none found with a 100k milestone):**
  - Runeborn (~290 reviews, 80%); Slot or Die; Slot & Dungeons 1.0 (~300).
  - Spinny Dungeon (Apr 2026, 74-93 reviews; complaints "low replayability, few builds").
  - Slotomancer (EA Jan 2026, $9.99, slot-battler vs 15 rival wizards, 115-325 cards, single-digit reviews; a reviewer
    asked it to "remove all AI assets").
  - Slots & Skulls (2026-11-04, slot machine as weapon, 112 symbol options).
  - Slotbound (2026-11-09, 3x3 slot auto-battler; demo Very Positive, 342 reviews; #97 on one Oct 2026 Next Fest chart,
    314 peak).
  - Amazing Slot Survivor (LINE Games, 2026-11-13); Spin to Breathe (Q4 2026).
  - **DEAD SPIN** (Strong Monkey Games, late 2026): "slot-machine duels against lunatic gamblers", 8+ opponents with
    their own decks, 250+ items, endless, VHS horror; demo 93% of 33; Automaton: you beat the opponent's score.
  [F] [Worthplaying](https://worthplaying.com/article/2026/7/8/news/150397-dead-spin-is-a-horror-slot-machine-roguelike-deckbuilder-coming-to-pc-in-late-2026-playtest-soon-screens-trailer/),
  [Automaton JP](https://automaton-media.com/articles/newsjp/20260709-454127/), [Adventure Gamers](https://adventuregamers.com/article/slotomancer-explained),
  [GamingOnLinux](https://www.gamingonlinux.com/2026/11/a-slot-machine-is-your-weapon-in-the-new-release-of-slots-skulls/),
  [VaporLens: Spinny Dungeon](https://vaporlens.app/app/2837790/spinny_dungeon), [Outputlag](https://outputlag.com/next-fest/)
- **Content at launch:**
  - Balatro: 150 Jokers, 15 decks, 8 stakes, $14.99.
  - LBaL: 152 symbols, 227 items.
  - CloverPit: 150+ charms (~40 "worth getting" per a tier list).
  - Dungeon Clawler: 165k Steam + 80k mobile; 185-200k pre-launch wishlists; long tail from Japanese streamers.
  - CloverPit's $2.99 DLC: est. 129k.
  [P/W] [Playstack](https://www.playstack.com/games/balatro), [TrampolineTales press kit](https://www.trampolinetales.com/lbal/presskit),
  [GameDiscoverCo: Dungeon Clawler](https://newsletter.gamediscover.co/p/how-dungeon-clawler-grabbed-200k),
  [Alinea](https://alineaanalytics.substack.com/p/steam-dlc-data-high-attach-rates)
- **Agency complaints:**
  - Siliconera on CloverPit: "more like a horror slot machine simulation than an actual experience where your choices
    change things".
  - The Outer Haven on Slots & Daggers: "over reliance on pure slot randomness strips away the satisfying tactical
    agency".
  - Rogueliker on Slots & Daggers: enjoyment "drops dramatically" after ~10 runs.
  [F] [OpenCritic: CloverPit](https://opencritic.com/game/19389/cloverpit/reviews),
  [The Outer Haven](https://www.theouterhaven.net/game-review-slots-and-daggers-pc/), [Rogueliker](https://rogueliker.com/slots-and-daggers-review)
- **Streamers in the niche:**
  - Northernlion (LBaL, which inspired Balatro; CloverPit); RTGame and Blitz (CloverPit); Aliensrock (LBaL his
    favorite roguelike).
  - VTubers: WolesVT ranked #2 on CloverPit's Twitch per a tracker; GameDiscoverCo's CloverPit piece says VTubers were
    involved.
  - Zukowski picks Splattercat and Wanderbots as the Steam-indie bellwethers; a good stream brings "hundreds even
    thousands" of wishlists.
  - A better capsule got Clanfolk a Splattercat video with +230% views.
  [F/P] [GamingOnLinux](https://www.gamingonlinux.com/2025/10/cloverpit-is-another-big-hit-on-steam-hitting-500000-sales/),
  [OpenCritic](https://opencritic.com/news/13608/balatros-creator-was-inspired-by-northernlions-stream-of-luck-be-a-landlord),
  [Twitchmetrics](https://www.twitchmetrics.net/c/51936193-wolesvt),
  [Zukowski](https://howtomarketagame.com/2023/01/04/what-splattercat-and-wanderbot-think-about-the-games-of-2022/),
  [Zukowski: capsules](https://howtomarketagame.com/2022/07/18/how-do-you-get-streamers-to-cover-your-game-get-a-better-capsule/)
- **Hook and trailer:**
  - Zukowski: the anchor (familiar genre) sells, the hook gets the look.
  - Derek Lieu's trailer order: genre, hook, content (scope).
  - Steam autoplays the trailer muted and cuts short clips from its opening.
  [F] [Game Developer](https://www.gamedeveloper.com/business/indie-insights-hooks-and-anchors),
  [GameDiscoverCo](https://newsletter.gamediscover.co/p/how-to-get-to-your-games-hook-quick),
  [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-trailer-best-practices)
- **Next Fest 2026:**
  - October 2026: 7,240 games (Zukowski; +65% on June's 4,382). No October survey yet.
  - February 2026 survey: median ~806 gained (GameDiscoverCo's all-demo estimate ~200), 70th percentile 1,839, 95th
    13,461; 0-999 pre-fest -> median 322 gained.
  - June beat February in every bucket above 1,000.
  [P] [Zukowski: Oct 2026](https://howtomarketagame.com/2026/10/21/how-sloppy-is-the-october-2026-steam-next-fest/),
  [Zukowski: Feb 2026](https://howtomarketagame.com/2026/04/13/making-sense-of-the-february-2026-steam-next-fest/)
- **Popular Upcoming:** after the 2026-06-04 home page redesign, one analysis found ~80k wishlists on the list's lowest
  game (was ~7k). Single source, unverified. [F] [tech-insider](https://tech-insider.org/steam-store-redesign-2026/)
- **Review labels** (third-party reading; Valve doesn't publish them):
  - A score shows at 10 reviews.
  - Positive: 80%+ at 10-49 reviews. Very Positive: 80%+ at 50-499. Overwhelmingly Positive: 95%+ at 500+. Mostly
    Positive: 70-79%.
  [F] [Steam Page Analyzer](https://www.steampageanalyzer.com/blog/steam-review-score-thresholds)
- **AI disclosure:**
  - Game Oracle (Ross Burton): 9,879 games from Jan-Oct 2025, controlled for publisher, experience and genre.
    Disclosing games got ~53% fewer first-month reviews (4 vs 7) and a median rating of 84.6% vs 88.3% at 100+
    reviews. Correlational; established studios were hit harder.
  - Sulka Haro: disclosures were 10.9% of releases in 2024, 19.9% in 2025 and ~31% in 2026, but only 10-27% of
    estimated sales.
  - October 2026 Next Fest: ~35% of entries disclosed AI, but only 2 of the 25 most-played demos.
  - Valve's January 2026 rewrite covers content players consume, not "efficiency" tools such as code assistants.
  [F/P] [PC Gamer](https://www.pcgamer.com/software/ai/data-analyst-finds-ai-stigma-on-steam-can-reduce-the-number-of-reviews-a-game-gets-by-around-53-percent-and-the-reviews-it-does-get-are-more-negative/),
  [cinevva: Haro](https://app.cinevva.com/news/2026-07-20-steam-ai-disclosure-study),
  [Capital & Compute](https://capitalandcompute.net/blog/do-ai-games-sell-on-steam/),
  [PC Gamer: Valve's rewrite](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/)
- **The name:** no game, app or US trademark by the exact name REEL BRAWL found (Justia search, not a legal clearance);
  "reel" and "brawl" are crowded search words (fishing games, Brawl Stars). [F] [Justia](https://trademarks.justia.com/989/00/reel-98900989.html)
- **Pattern** (opinion, from the above):
  - Supply of slot roguelikes is rising fast, and 2026's entries land in the hundreds of reviews. The demand went to
    the 2025 hits.
  - What's left is for a hook that reads at a glance as different. "Two machines fight" is that, until DEAD SPIN's
    "slot duels" ships.
  - Lo-fi art is the niche's norm; reading as AI is the art risk, not reading as 8-bit.

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

### THE JUKEBOX's second way to build (open; phase 4)
- **Today** (`VOLUME` in `src/core/fightRules.ts`, `volumeAfterSpin` / `dropNotes` in `fight.ts`): +1 volume a payline
  note, +32% note pay a level, max 6 arms THE DROP for the next spin (the payline plus every note in the 6 cells off
  it), then 3; a spin with no payline note skips -2. Strip: 6 notes and 6 shields on each reel. Its 5 relics and ECHO
  all tune the DROP. The shield build is the weakest in the sim (WHITE 46 vs a 60 target). The stale comment at the top
  of `cabinets.ts` still says +10% a level and "falls back to 2".
- **Numbers (computed by hand from the base strip, binomial, not simulated):** a payline shows 1.5 notes on average and
  no note 1 spin in 8, so from 3 the bar arms in about 2-3 spins: a DROP every 3-4 spins, 1-2 a median fight. About
  4.5 of 9 cells are notes at the DROP. The shield build doesn't starve the meter (the strip lands notes either way);
  what it lacks is a payoff: the DROP pays in notes, which the shield build doesn't level, and heals the flat 15.
- **Precedent:** see Roguelikes > One meter, two builds. Closest fits: Mental Fortress (the cycle itself defends),
  Valor (one stack pays attack and armor), Star Power (one activation scores or rescues); Like Water and NecroDancer's
  obsidian for "stay high"; Splash for counting off the line.
- **Judging the four patterns (opinion, from the above):**
  - (a) STAY LOUD: the base rule already pays for staying high (+32% a level), and the forced DROP at 6 means "stay
    loud" can only mean sitting at 5; TURNTABLE and HYPE MAN already approximate it. A real version has to switch the
    DROP off (Like Water works because Calm has no forced exit), which changes what the meter means: a reading cost.
  - (b) A DEFENSIVE DROP (every visible shield shields, as every visible note hits): the Mental Fortress / Valor shape,
    the same moment and the same 9 lit cells, paying in the shield build's own levelled symbol. Pitfalls: heal 15 plus a
    big shield burst on a 3-4 spin cycle is the stall TESLA's storms caused in act 3 and the Bazaar's shield mirrors; and
    HP_GAME.md records that per-machine shield payoffs were measured and dropped once before (2026-10-12).
  - (c) Notes off the payline count for volume: Splash's shape, it speeds the same engine (both builds DROP sooner), so
    it's not a second build; it also works against the payline look just shipped (dimmed rows that don't pay).
  - (d) A remix / second symbol: a new symbol is a new rule; the JUKEBOX already has a second symbol (the shield), so
    "shields turn the volume up too" is (d) without a new symbol, and it's MIXTAPE's job made stronger (no skip, faster
    arming), so on its own it's the attack build's relic as much as the shield build's.

### HOLD as a bet: JACKPOT OR NOTHING (open; expert playtest 2026-11-06)
- **Today** (HP_GAME.md phase 1): 2 HOLDs a fight; hold a paying pair (reels 1-2) and the next spin rolls reel 3.
  Base pays (`config.ts`, `scoring.ts`, before relics and multipliers): a single 10, a pair 2 x 10 x2 = 40, a jackpot
  3 x 10 x3 = 90. A held pair's floor is 40 (plus reel 3), its ceiling 90: no downside, so it's always right.
- **Proposal:** a miss pays only reel 3's own symbol. Against keeping the pair, the jackpot is a 2.25x premium; it
  beats the pair's 40 only when more than about 44% of reel 3 is your attack symbol (40 / 90; multipliers scale
  both). Against a fresh spin (the real alternative under the proposal), the answer depends on the build's whole
  spin, which the player can't read. Computed here, not simmed.
- **Precedent:** see Odds > Push your luck. Video poker breaks a sure pair only for a large premium (royal 800 a
  coin); fruit-machine gambles and Let It Ride bank the win first and let you take it; Quacks halves the bust.
- **Pitfalls:** (1) loss aversion (~2x) if the UI frames a miss as losing the pair; (2) the odds come mostly from a
  static count (reel 3's attack symbols), so experts solve it once per build: always hold above ~44%, never below,
  a dead or automatic button again; (3) the proposal has no sure option on screen, two gambles compared, which a new
  player can't read, and "does a sure pair kill?" has no answer when no pair is sure; (4) holding fixes reels 1-2 on
  attack, so that spin can't make a shield pair (a real cost when low, under either rule).
- **Opinion:** the precedents that last put a sure, visible amount against the bet when you choose. The cue that
  makes it situational is the HP race (a variance play is right when behind, wrong when ahead), which only reads if
  the sure option is on screen. A sim pass should report how often holding is right by build; near 0% or 100% means
  the choice is dead.

### The back half without danger (open; phase 4)
- **Today** (HP_GAME.md, the phase 4 triage and playtests): in acts 2-3 regulars and elites mostly die in 1-2 of your
  spins, so the enemy rarely spins and its ability countdown rarely fires; HP carries, but little is lost, so the
  Cashier's HEAL and less healing have nothing to bite on. Danger sits in act 1 and the bosses. Act 2-3 HP was raised
  already (x2.2 / x2.0); the user rules out shrinking big hits ("one-spin kills aren't the problem", 2026-10-15).
- **Precedent:** see Roguelikes > Late-game threat. Levers by family: (1) caps on the hit (Nemesis, Damage Control,
  the Heart); (2) more HP (Balatro's blind curve); (3) growth inside the fight (Giant Head, OVERTIME); (4) less healing
  (StS A5, Lasting Consequences); (5) rules aimed at the build at elites and bosses (Balatro finishers, Benefits
  Package, Surrounded) and more elites (StS A1); (6) the enemy acts first (SAP start of battle, Inscryption's queue;
  random: Darkest Dungeon).
- **Judged against our rules (opinion):** (1) works against the stated payoff and is what burst players hate; (2)
  trims one-spin kills, the payoff again; (3) and (4) never trigger when the enemy dies before its first spin; (5)
  adds threat but only where it's placed, and the act 2-3 elites already die in 1-2 spins; (6) is the only family
  that gives the enemy a turn whatever your build does, and leaves your hit untouched. Its pitfalls: random (DD's
  ambush) reads as unfair; a flat damage tax with no answer is a watch-only tax the Cashier's HEAL erases; it must
  be shown before you commit (our map already shows every enemy up front, as Balatro shows the next boss).
