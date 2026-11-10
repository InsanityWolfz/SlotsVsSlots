# Roadmap: the road to Steam

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-11-09): the launch QA campaign** (user: "really granular check everything"). Eight testers (rules vs
text, combinations, functionality, UI, an 8-run playtest, the demo as a stranger, Steam readiness, the market); about
140 findings, no crash, softlock or save loss in ~1M sim fights, 77k runs and 14 played. Fixed and on `main`
(user, 2026-11-09: "yes"): the Steam wrapper's blockers (no crash without steam_appid.txt, one
packaging command per Steam app in `desktop/package.cjs`), the demo's dead WISHLIST link (VITE_STORE_APP_ID), the tutorial
run's starting relic, NEW RUN teaching a first-timer, the hit strobe, M and W, 24 card texts that didn't match the game,
dead relic offers, HOLD on jammed or stolen pairs, saves (a run recorded at the killing blow, the Cashier and spoils
kept over a reload, saved runs cleaned on load). The report and the user's 10 calls (SPEED 2X default, act 1 pacing,
a draft SKIP, payoffs on the best hit, SECOND MORTGAGE x1.5, MAKE IT RAIN free at the floor, Windows-first, the Next
Fest date, the capsule/trailer hook against DEAD SPIN, card art and a boss entrance): https://claude.ai/artifact/JvWfuPk7WavCPFFd6av9gM.
The user's answer (2026-11-09): all but 4 (payoffs stay as they are). 7 and 8 are decided below (phases 5 and 6);
1, 2, 3, 5, 6 are live (2026-11-09; numbers in HP_GAME.md "Balance": combined sim 28 of 30 machine-stakes on target;
BANKROLL keeps 6 / 6 reels at 400 HP, since 7 chips a reel plus free floor rains won 74% at WHITE). The boss entrance is live
(user, 2026-11-09: "I love the boss entrances"; https://claude.ai/artifact/3UMPmTnDNMQJZtmvELqrvJ): about 2 s at 1X,
any input skips it, 1 s on a repeat, each boss's one beat, round marquee bulbs on every marquee. The playing cards are live (user,
2026-11-09: "Yes do the new card art"; https://claude.ai/artifact/YFAq8n2jpH9uYhUtu7WDWi; an 8-card hand fits the felt
now). **The backgrounds overhaul (user, 2026-11-09):** the rooms read as a third art style and too busy; the run should
tell a story: act 1 on the street outside (no crowd), THE HOUSE the first machine at the casino's doors (no vault in an
alley), act 2 on the casino floor with THE WHEEL its centrepiece, act 3 the VIP room and THE DEALER's table, ENDLESS
after hours, then THE OWNER himself. Regular rooms dark, calm and low-contrast under the reels; boss rooms come alive,
matching the bosses' UI; one style (the portraits' pixel scale and palette, the UI kit's plum and gold). In progress:
the style key (THE HOUSE's casino entrance at final quality plus thumbnails of all 8 stages), then the user decides.
**THE HOUSE becomes THE DOORMAN (user, 2026-11-09: "Yes"):** act 1's boss is the man at the casino's door, a person like
every other boss (THE HOUSE was the only machine), and the room's bouncer becomes him. A reskin, not a new boss: his
rules, numbers, the pot, SKIM and "your jackpots win his pot" stay; his Slot Machine stays THE HOUSE's gold one. THE
HOUSE stays as the casino itself, the thing the run beats ("break the house"). Not THE BOUNCER (a relic). Next: portrait
candidates (branch `doorman-v1`), then the text sweep (achievement ids stay) and his entrance beat, shipping with the
new rooms. **The run as a journey (user, 2026-11-09, a dictated rant; decisions only):** the room style is approved (the street
and the casino entrance); next, every act is a strip you move along, each fight a step closer to the act's boss, who
is in view from the first fight ("I wish I knew what was behind that door"). Act 1: the city street toward the
casino, past a bar (THE BARFLY), an alley (the thieves), the cold corner: shady characters, no crowd; the casino's
door at the end, where THE DOORMAN checks your ID; beat him and he lets you in. Act 2: inside, down an aisle between
rows of slot machines toward the table games, the casino's regulars (hexers, scammers); at the aisle's end the
roulette wheel and THE WHEEL, its attendant. Act 3: past the roulette into the high-roller table games, people
playing; at the end THE DEALER at a card table. ENDLESS: each loop replays an earlier strip later in the night,
thinner and darker as the casino closes (THE DOORMAN's loop: the lobby seen from inside, him at the doors to show
you out); at the end nobody's left and THE OWNER comes to put you down for winning too much. Tone: light and fun,
not the genre's dark horror look (DEAD SPIN, CloverPit); the felt progress through places is the difference. No
more content for the demo or launch (55 relics are enough; "if the core is good" more horizontal content won't move
wishlists): polish the art and the UI. Process: every step as an artifact with screenshots for the user to approve.
**Act 1 approved (user, 2026-11-09: "act 1 is good"; https://claude.ai/artifact/RHK4Zdw9duxaG2yD9y4XUm, branch
`journey-v1`):** four street stations by depth (a dive bar, an alley's mouth with a pawn shop, a cold corner, the
block before the casino), the street ending in a T-junction with the casino set back across it (forecourt, carpet,
rope posts, gilded double doors), THE DOORMAN standing beside the doors from the first fight, then his entrance room.
Act 3 approved (user, 2026-11-10: "Act 3 looks good"; https://claude.ai/artifact/UxGxsoovHS5z2K8QBZznXK, branch `journey-act3`: tables and players lining the aisle to THE DEALER's table, one patron kit shared with act 2); a last pass makes his table grow more per station and its signs match act 2's. Act 2 approved (user, 2026-11-10: "Act 2 looks good"; https://claude.ai/artifact/SLrhWxy2wEX9BfhXtP16LB, branch `journey-act2`: 2-3 slot banks a side facing you with stools and players, the table games pit across the full width growing station by station, a landmark a station, one sign system, the progressive board over the roulette). In progress: merging the three acts (branch `journey-all`), then ENDLESS (the night closing down) and THE OWNER's room. Was: act 2 in rework (act 2: slot banks facing the player with stools and players, a bigger wheel; act 3: patrons at
the portraits' standard, stepped light, walls dressed). They ship together with THE DOORMAN's rename (branch
`doorman-rename`; the two merge cleanly with `main`, 796 tests).
**The journey shipped (user, 2026-11-10: "Looks good for endless and the owner. Now we can push everything to main and
to the demo"):** the three acts' journeys, THE DOORMAN (rename, portrait, figure, entrance), ENDLESS after hours (each
loop later in the night; THE DOORMAN's lobby from inside) and THE OWNER under the last spotlight on the empty floor
(https://claude.ai/artifact/8AK5u3YLGWbD3vA6BJzAmN). 801 tests, fuzz clean. Fixed (2026-11-10): THE DOORMAN's lobby
raised clear of the LOOP chip, THE OWNER raised clear of the turn plates. Follow-ups: split `src/render/roomCasinoFloor.ts`
(1,078 lines) next time it's touched; the menus still show the old floor. Now unblocked: the capsule, trailer and
screenshots in the new world.
**Menus and the Cashier in the new world (user, 2026-11-10: "I love everything except the run over screen... everything
else is a go"):** outside a run you're on the street before the night starts (title and main menu: act 1's first stop,
your machine under a streetlamp; machine select: the pawn shop's window, locked machines behind its shutter; PROFILE,
settings, HISCORES: the street dimmed, HISCORES a wall of fame poster). Inside a run every screen shows where you are:
the draft over the current station dimmed; the route map as the act's own map (city blocks, the floor plan, the
high-roller rooms); the encounters by act (act 1: TWENTY-ONE on an alley crate, HIGHER OR LOWER at the dive bar's
back table, THE CLAW in an all-night laundromat; acts 2-3 casino felt). The Cashier: one character, a counter an act
(the pawn shop, the casino's cage, the high-limit cage, the cage at closing in ENDLESS). RUN OVER stays as it is. Shipped
(user, 2026-11-10: "All three approved"; menus https://claude.ai/artifact/23DYnMAEnSWZ12ckKcV56g, the Cashier
https://claude.ai/artifact/344CX2maFTUro3WV53wTTh, the in-run screens https://claude.ai/artifact/B66NMRP2WE1U3rfCczSuXQ),
with act 1 renamed THE STREET (was THE ALLEY), the pawn shop's tags without numbers and NO REFUNDS dimmed, and the
menus' BAR sign clear of the logo. The machine select's pawn shop "reads more like a bunch of storage units, but I
don't hate it" (user): kept for now.
**RUN OVER: you get thrown out (user, 2026-11-10: "I like the run over art plan, let's build it"):** no death, no
blackout. Your Slot Machine gets thrown out, landing dented and sparking. Act 1: KNOCKED OUT, in the gutter at the
station where you fell. Acts 2-3: THROWN OUT!, tumbling out of the casino's doors onto the carpet, THE DOORMAN dusting
off his gloves. ENDLESS: CLOSING TIME, the doors at dawn with the marquee switching off. Wins unchanged. The screen's
content (who got you, the score count-up, best hit, RUN LOG) stays; only the scene and a landing beat change. In
progress on branch runover-v1.
**Capsule and trailer on hold** until the new rooms are done (user: "so we can get some really good art"); the
directions so far: https://claude.ai/artifact/DWvxNB3zHD8zf96xZA3FJX (branch `call9-art`, from `art-wip`: duel
variants, trailer cut 3, store text) and https://claude.ai/artifact/PM1uuVfPi6LEJButEJTHv8 (branch `capsule-v2`: VS
screen, fight night, the payline). Reports in
`tools/out/qa/` (not committed).

**In progress (2026-10-30):** the UI pass shipped to `main` (user: "ship all the UI stuff"; review:
https://claude.ai/artifact/Uo8W6uXQJ4Cmv21tccPF1t). The keyword icons shipped too (22 approved one at a time over 7
rounds, https://claude.ai/artifact/LriFtZabSxqs3cBJ8nsbsX; in the glossary and the cards' detail boxes; FROZEN, JINX and
STEAL have their entries too; JAM borrows FROZEN's icon and RAKE SABOTAGE's), and the Cashier touch-up. The SPILL reel symbol and ability icon are the broken
pint glass now, matching the icon (user, 2026-10-30). Steam capsules done: concept B "the gang" (the colorful
cast; the Jukebox in for the cut Mimic), approved at all 7 sizes (https://claude.ai/artifact/7g3xpbXdDfypGju7BUTo2t;
upload-ready PNGs and sources on the `art-wip` branch, `art/capsule/steam/`). Screenshots: 7, retaken on the current build
(user, 2026-11-06: "keep the original capsule art but use the new screenshots"; https://claude.ai/artifact/1ixT2D72fGc493oFgiiFGF):
a MEGA WIN, THE HOUSE's lightning storm, THE WHEEL's chips, the draft, the next fight, the Cashier, the machine select
(2560x1440, in order, `art/steam/screenshots/upload/` on `art-wip`; `node tools/store/screenshots.cjs` retakes them).
Trailer cut 2 (44 s, 1080p60, real gameplay frame-stepped with the game's own sound over THE HOUSE's theme, the intro on
the beat, the music softened (mix 2)) approved (user, 2026-10-31: "looks good"):
https://claude.ai/artifact/8hbHvaF1gA6sTfFd5oN4Bo (`art/steam/trailer/`). Drafted, waiting on the user: the short
description and the AI disclosure. Steamworks: opened and the $100 paid (user, 2026-10-31; signed up as a sole
proprietor, no LLC yet); tax and identity verification pending (ID and selfie sent 2026-10-31; up to 30 business days, can't be hurried).
Phase 4 started with a triage (2026-10-31; the user is too close to the game to judge its feel): sim 500 runs x 5 machines
x 6 stakes, plus the expert playtester's 5 real runs. Findings: every machine wins 7-23 points over target; the
back half of a run is one-spin kills with no damage taken (all danger is in act 1); THE DEALER spread is 40 points
(TESLA 89-95% vs KNIGHT 47-66%); the payline is hard to read; act 1 sabotage leaves dead stretches; HOLD is one
obvious call a fight; a run-killing crash (JOKER, HOUSE OF CARDS + LOAN SHARK's IOUs). The user's calls (2026-10-31):
fix 1-4 (done: the crash, the balance batch in HP_GAME.md, the HUD overlaps, the small bugs); the payline made readable
(art first); a proposal for sabotage's dead stretches; a call on the CLAW; HOLD stays as it is (the user: it "scares me
a little"). Then: the payline look shipped (user, 2026-11-01: "I like the pay line change"; the rows that don't pay rest dimmed, the
payline framed in gold), with what counts off it kept lit "so the player knows they are in play": THE JUKEBOX's armed
DROP (every note and WILD), IOU countdowns, THE DEALER's ALL IN 3x3, SECOND PAYLINE's row. The screenshots and trailer get
redone once, when the changes are all in and the page is ready (user, 2026-11-01), not after each change. Sabotage wearing off was simmed and dropped: in act 1, 29% of fights have 3+ spins that pay
nothing, and sabotage causes about 2% of fights' dead streaks, so the dry stretches are plain luck. Then a BUILD-UP (dry spins add to your next pair; shipped 2026-11-01, below);
and the CLAW reworked as push-your-luck: shipped (user, 2026-11-01; rules in HP_GAME.md). Phase 4's TESLA (option 1: every boost
adds charge, half-size bolts, the storm heals once) and THE OWNER (option A: a 25M fortune on a x10 damage ladder, plus
OVERLOAD, TESLA's ENDLESS loop growth) shipped (user, 2026-11-01: "we can ship the tesla and the owner re work"; rules in HP_GAME.md). The machines'
heals are one rule now, shipped (user, 2026-11-01): every meter payoff heals 15; KNIGHT has no meter, no heal (HP_GAME.md).
The text audit (2026-11-01, the user: "a make or break for launch"): every relic and Charm checked against its text on
every machine, one test a claim (`tests/audit_*.test.ts`); 11 bugs fixed to match the text and 14 texts fixed to match
the game (HP_GAME.md). The user's two calls (2026-11-01): MAKE IT RAIN has a floor (never less than the
chip jackpot it replaces; it now costs 10 chips, not 5, to keep BANKROLL on target), and GOLD and GLASS are true
multipliers on TESLA's bolts. The menu and rare-text pass (2026-11-04, approved: "all good"): 45 lines across menus, stakes, card backs, encounters and the tutorial, 21 of them facts that were wrong; THE HOUSE's CASH OUT is now SKIM. Bug hunt round 3 (2026-11-04: screen sizes, the extremes, controller only): text that ran off the in-fight boss card and the CLAW's rules wraps; the "?" no longer covers card text; BLUE keeps its ACT 3 line; phones held upright get TURN YOUR PHONE SIDEWAYS; MAKE IT RAIN's cost popped "THE HOUSE SKIMS"; beating THE OWNER said BEAT THE DEALER; huge per-cell pay numbers are shortened (and 999,500 reads 1M, not 1000K); ALL IN's shown top no longer rounds past the one-turn cap; wrapped text never leaves one word alone on its last line. Controller pass (same day): a held d-pad no longer flips a HOLD on and off; a new screen's focus lands on its main button (it landed on WALK AWAY, QUIT TO MENU, the card's "?"); SPIN keeps the focus through the enemy's spin (A turned AUTO on); no invisible targets on the run-over screen; B on the RUN LOG closes it; the bumpers step from your saved speed; the GLOSSARY fits again. Steam Deck controls (2026-11-05, user: "yes do it"): the prompts follow the device in hand (TAP on a phone, CLICK with a mouse, keys on a keyboard, button badges on a pad: PRESS [A], HOLD 2: [DPAD], the tutorial's tips, pause, the glossary, the CONTROLS panel), with L1 / R1 / L2 names on a Deck; VIEW (or B) pulls the BUILD drawer, a trigger (or I) opens a boss's rules, START skips the tutorial, the bumpers switch PROFILE's tabs, and the d-pad starts the title. Polish pass (2026-11-05): big chip counts and max HP shorten (12.3K) instead of clipping; FAKED and CONFISCATED count past two Charms (4 CHARMS); heading-size banners (LAST CALL!, OVERTIME!, CLOSING TIME!) draw their title inside the band; THE WHEEL's STARTS FAST is a band on its portrait; a three-line machine pitch clears BEST STAKE; on touch, small buttons answer a little past their edges. Code health (2026-11-05): the four files past 1,000 lines are split by concern with no behaviour change (seeded runs hash to the same 1.13M events before and after): run.ts 750 (+ draft, shop, fightSetup, endless, runMigrate), fight.ts 717 (+ fightPayout, fightDamage), director.ts 659 (+ directorPay, directorMeter, directorTricks, directorBoss, directorHits), game.ts 614 (+ saves, gameFlow, gameInput, gameDraw). render/rooms.ts (1,415) is 386 too, with roomKit, roomAlley, roomFloor, roomVip and roomBosses (all 1,440 room pixel hashes match before and after). Colour-blind audit (2026-11-05, deuteranopia, protanopia, tritanopia, greyscale; 29 screens): nearly every colour has a word, icon or shape behind it. Fixed: relic rarity in the Cashier and relic tips was frame colour only (uncommon and legendary collapse for red-green colour blindness), so they show the draft's rarity gem; your HUD's low-HP pulse goes gold to dark red (#8e1f3a), a brightness blink everyone sees, not gold to bright red. The uncommon gem has a white twinkle now (2026-11-06, user: "go ahead"), so the three gems read plain / twinkle / gold rays without their colours. Encounters and run-over pass (2026-11-06; sizes, controller, colour blindness, text): the CLAW's build panel held the prize back until the claw lands (it showed mid-grab) and its last go reads GOES LEFT 0; HOUSE RULES closes with B or a tap and blocks play under it; TWENTY-ONE's result sits at the felt's foot in place of its rule line, both hands stay up, and an 8-card hand closes up; HIGHER OR LOWER says what you won net of the bet, as TWENTY-ONE does, and drops its pay-out count once a game ends; broke at a table, the screen says why play is off; focus never lands on the build panel's relics; the bumpers do nothing between fights; COPY LAST RUN moved off the tutorial hint; the RESULTS card's prompts follow the device; 1 ENDLESS FIGHT, not FIGHTS. Market and playtest review (2026-11-06; market in RESEARCH.md "Market"; an expert playtest of 3 runs): fixed, the tutorial's A PAIR! HOLD IT? on a pair with a frozen reel (it can't be held, so no prompt); BLAZE's tag in the build panel and on pays reads +11%, as its card does (it read +5); a relic won at the CLAW says what it does; the tutorial run earns its score in XP (still no achievements or run stats). FIGHT 8 OF 10 on the run-over screen was right (that route had 10 fights). HOLD reviewed (2026-11-06, the playtest: "I never had a reason not to"): sim, 400 runs x 5 machines x WHITE / GREEN: an attack pair comes up 0.7-1.2 times a fight, HOLD is used 0.4-0.6 times, and it's worth about 3 points of run win (none vs live: +0.5 to +5.5). A bank (2 to start, +1 a win, cap 4) and saving holds for elites and bosses changed nothing; JACKPOT OR NOTHING is solved once a build (the researcher: it pays when 44%+ of reel 3 is your attack symbol); a BET MAX stance (both machines' hits x2) lost to never using it by 8-50 points (HP carries between fights). Proposal to the user: HOLD stays; its cadence, not its cost, caps it at under one choice a fight. Then (user, 2026-11-06: "yes do it"): the tutorial has 3 callouts before the first SPIN (it had 11; THE REELS DECIDE MOST OF A FIGHT is gone), the rest come when they first happen (THAT'S A SPIN and YOUR HP after the first spin, BUILD-UP on the first dry spin, the enemy at its first ability, the run's map and OVERTIME after the first win); PAIRS START ON REEL 1 on the HOLD chip when reels 2 and 3 match but reel 1 doesn't (the first 3 times, ever: prefs `paylineHints`); the win banner has a LOST 120 HP chip (HEALED or NO HP LOST); a draft card or elite relic turned down isn't offered again that act (`run.passed`); act 3 comes with RED, not GREEN (sim in HP_GAME.md "Balance": RED run win drops 7-17 points; the user kept it harder, so RED's target went 50 -> 43). OVERTIME starts at round 6 (was 8; sim in HP_GAME.md "Balance": about 40% fewer fights past 12 spins, run win -0 to -7, BANKROLL RED and JOKER WHITE the outliers). KNIGHT's attrition is the player's to answer with sustain (user, 2026-11-06), not a rule. New content (cards that change a rule) waits (user, 2026-11-06: no draft of it yet). SPIN CHOICES, a test build (user, 2026-11-06, the user's idea: after your reels land, pick 1 of 3 plays, then the spin pays; the plays could later open relics, Charms and rule changes): on branch `claude/awesome-fermat-gmik8d`, played at https://insanitywolfz.github.io/SlotsVsSlots/spin-choices/ with its own saves; `main` untouched (its deploy builds the branch into that folder). Plays: RESPIN a reel, NUDGE a reel, TOP / BOTTOM ROW PAYS, DOUBLE DOWN, LET IT RIDE, SHIELD UP, CLEAN UP; SPIN or AUTO takes the line; HOLD is off there. Sim (300 runs a machine, WHITE / RED, no rebalance): run win taking every line 54-65 / 32-42, a thinking bot 70-93 / 50-78, random picks 13-43 / 8-21, so the picks matter (HOLD was worth ~3 points); the bot plays on ~half its spins; LET IT RIDE and SHIELD UP almost never (weak or the bot's blind spot). Not rebalanced: a good player finds it much easier. Verdict (user, 2026-11-07, after playing it): "a good idea but it's too much". Shelved: the branch keeps the code, the test build is off the site, HOLD stays as it is, and whether fights feel watch-only is left to the outside playtest. Demo playtest fixes (2026-11-07, a stranger's run of the demo): no HOLD before your first spin of a fight (holding a pair on the opening line made spin 1 a sure pair; sim unchanged), the tutorial run earns achievements like any run (in the demo it is the whole demo), a one-time callout explains each Slot Machine's meter the first fight on it (prefs `metersExplained`), the tutorial's last card in the demo says the full game has 3 more Slot Machines and higher stakes, COPY LAST RUN moved off the nameplate, frozen-turn badges sit inside the reel (the YOUR SPIN plate hid them), and TWENTY-ONE counts the next hand between hands and turns the dealer's face-down card after a bust.
Left in phase 4: JUKEBOX's second way to build (simmed 2026-11-01: shields last one turn, so no DROP payoff makes a shield JUKEBOX a real build; a Body Slam SUBWOOFER, "THE DROP also hits for all the shield you hold", shipped (user, 2026-11-01: "ship it for now"; the user is testing shield builds); a bigger rework waits on the outside playtest), BANKROLL ships as it is (user, 2026-11-02: "I think bankroll is fine"), the bug / save / crash pass done (2026-11-02: three QA agents on a frozen copy: an engine stress test of 4,846 runs and 86,000 fights, a save pass with 107 reloads, a UI crash hunt of ~110,000 inputs with no crash, error or softlock; fixed: a cancelled machine pick that still started the run, a boss card left open under QUIT TO MENU, winning at 0 HP, CHIPS EARNED double counts, desktop saves now trust the cloud file over the local cache and back up to disk, GLASS kept in the COLLECTION, the tutorial run saved, a lost fight can't be reloaded, one desktop window at a time; first outside playtest (user's players, 2026-11-03): the music was jarring (the user wants Suno for music and sound);
MIXTAPE confuses new players who haven't seen the VOLUME bar; nobody went for a shield build ("people just don't enjoy
the turtle play"); the 2-fight casino paths were almost never picked (fixed: every path has 3+ fights); the enemy card's
back repeated itself (fixed and approved, https://claude.ai/artifact/7Rmfja2UeKb74mZ6e638V3: "EVERY N TURNS: ...",
keywords explained, new STEAL, FREEZE, JAM, JINX, RAKE, VOLUME; boss backs just the rules and HOW TO WIN); the route map before the first fight confused people (fixed: hidden until the first win);
BUILD-UP felt bad against the PICKPOCKET (maxed, but his steals left nothing to pair). late-game danger (2026-11-02): the sim says an average build already faces danger in act 2 (fights 6-7 spins, ~18% HP each, act 2 deaths as many as act 1); the victory lap is strong builds at low stakes. Enemies or elites spinning first was rejected (user: "if you go in low hp you just get tapped and that's not good gameplay"); waiting on outside playtests (no itch.io page: user, 2026-11-04, "we're not doing itch"); the crash screen's report button will open the game's Steam Bug Reports board once the store page exists (until then it only copies the report), and if strangers coast through act 2, the next idea is Balatro-style elites and bosses with a rule aimed at your build (research in RESEARCH.md); one text per card (user, 2026-11-02: the hover box repeated the card face): the face carries the whole rule, the box only explains its keywords, 10 faces rewritten to carry what only the box had; left for later: a monster TESLA storm deep in ENDLESS can take 1-4 s to compute; a quit mid-fight restarts that fight, so a different HOLD can retry it, like Slay the Spire), the act 1 demo, the bug / save /
crash pass; BUILD-UP shipped (user, 2026-11-01: "ship it" after a test branch, three expert playtests and a review page, https://claude.ai/artifact/TvT7AdJqCBKp8ZqxpoYRca; rules in HP_GAME.md), and HOLY WATER blocks the first ability on your reels now. Its look: the plate with fill notches, not a meter left of the machine (user, 2026-11-02: "definitely plate"; https://claude.ai/artifact/4Yq8ehrHCEzNqkL3RqxzNb). Decided 2026-11-02 (https://claude.ai/artifact/Ss9BNMCxw51YzcHcsFfhyG): settings show both words (SOFT FULL, REDUCED
FULL) instead of FULL by an unlit bulb; the fantasy relic names went casino: VAMPIRE FANG is ROOM SERVICE, SKELETON KEY
LOADED DICE, PHOENIX FEATHER RABBIT'S FOOT, HOLY WATER BOUNCER, DEVIL'S DUE SECOND MORTGAGE, QUICKENING ESPRESSO SHOT;
CRUSADE and the VAMP Charm keep theirs. Their icons were redrawn to match and approved (user, 2026-11-02: "new icons look good"; https://claude.ai/artifact/QtY3u2gPYHhCdFu4accg6B). Open call for the user:
the ~45 rewritten card faces.
Done before: theme, roster, name (REEL BRAWL), 24 portraits, words, enemy symbols (art:
https://claude.ai/artifact/9fZP62QFQ7ffp9tMYkUztV, words: https://claude.ai/artifact/Bo2uKXGYnFXWRJxTy5Ddcu, screens:
https://claude.ai/artifact/M4aXG9XZV9NvJ1bQK8HeKr).

**The last Max week (2026-11-07), the user's calls:** the demo shows the three locked Slot Machines for real and DEMO CLEARED becomes a sales page (in progress); the Cashier's HEAL and +MAX HP cost more at base and per buy (done, HP_GAME.md "Balance"); AUTO stays the player's (no turning it off at elites); a content batch is previewed before anything is built (https://claude.ai/artifact/QzZ5EoCoNwXtjCLwB5Vnnd: CUT and MOVE draft cards, LEAN MACHINE, PAYBACK, STEADY HANDS, HOT STREAK, STICKY FINGERS, MARKER), then the balance pass. Content batch built (2026-11-07; rules and sim in HP_GAME.md "Charms and relics"): the CUT draft card and four relics, LEAN MACHINE, STEADY HANDS, PAIR STREAK and STICKY FINGERS (MOVE, PAYBACK and MARKER dropped by the user). HOLD relics and a LATCH Charm were proposed and dropped (user, 2026-11-07: "it's too much"); STEADY HANDS stays HOLD's one relic. The balance pass (2026-11-07; numbers only, HP_GAME.md "Balance"): THE HOUSE
2000 HP (was 1200; 84-93% when reached at WHITE, 7-8 spins to kill), every machine's HP up, KNIGHT's boss levels 3 -> 4;
run win on target at 25 of 30 machine-stakes (was 14). Open for the user: RED and GREEN play the same (GREEN's rule costs nothing).

**Resumed (2026-10-29), aimed at a paid Steam release.** v1.0 is the old game (`docs/legacy/HP_GAME.md`) with two
fight changes (OVERTIME and HOLD), frozen and trimmed content, and a Steam page early. The user approved this plan from an overnight
review (their doc "Slots vs. Slots: the road to Steam", https://claude.ai/artifact/A7ADak3Vec6oPZEzQbMVgi). The METER
COMBAT rebuild is parked (bottom of this file). Each phase ends in a gate; the next phase starts when it's met. No
dates: the user sets the pace.

## Why (the review's findings, 2026-10-29)
- **One-spin kills aren't the problem;** they're the genre's reward (Balatro, Luck be a Landlord), and the user said
  so on 2026-10-15. Being one-shot is already prevented: no enemy turn takes more than 40% of your max HP (60% for
  bosses; `TUNE.turnCap`, `fight.ts` ~1873).
- **The real faults:** fights have no clock (the only damage ramp, `TUNE.rampPerTurn`, runs in act 3 alone,
  `fight.ts` ~1742), so shield and heal builds slog; and one decision sits behind up to 30 watched spins.
- **The market:** slot roguelikes sell well for one- and two-person teams at $8–10 (CloverPit 1M+ copies, Slots &
  Daggers 300k+, developer-stated). No Steam game has two slot machines fight. The genre's most repeated complaint is
  "I'm just watching a slot machine"; reviewers of the closest rival (a blackjack duel) asked for opponents that
  seem to think.
- **The biggest risk is restarting,** not the combat: content waves before the core was settled, a 1,000-run sim
  after most tweaks, then a mass cut and two rebuilds in three days, all on `main`.

The review was done by reading only; phase 0 checked it against the real game.

## Phase 0: done (2026-10-29), waiting on the gate
Played: KNIGHT and TESLA at WHITE (Claude) and GREEN (the expert playtester); all four runs won. Sim: 300 runs a
machine at WHITE and GREEN, attack and shield builds (`npx tsx tools/sim/length.ts 300 0,2 turtle`). A "spin" below
is one of yours; the game's SPINS counter counts both machines, so it reads about double.
- **One-shots: agrees.** In ~25,000 sim fights no enemy turn passed 40% of max HP (bosses 60%); the playtester saw
  the cap cut a 319 hit to 190. But HP carries between fights, so a capped hit after a grind still reads as a
  one-shot (KNIGHT went into THE WHEEL at 264 and left at 24).
- **No clock: half right.** Most fights are short: median 4–7 spins, 0–7% of regular fights past 12 (attack build). The slog is in
  three places: BANKROLL (12–19% past 12), the shield build (long fights double; THE DEALER past 12 in 33–66%) and
  THE DEALER for everyone (5–42%). Heal builds don't cause it (heal a spin is the same in long and short fights).
  In play the long fights were dry stretches: an enemy at 10–20 HP for 2–3 spins, sabotage blanking reels, act 2
  elites with 2,000–3,000 HP.
- **Watching: agrees, and it's the bigger fault.** 3–5 spins a decision, but in lumps: a draft, then 1–2 minutes
  (up to 127 s) with nothing to press. AUTO was on by default, so a new player never pressed SPIN (now off by default, user 2026-10-29).
- **Certain intents: mostly already in.** Every enemy trick runs on a fixed countdown its HUD shows (FLOOD NEXT!,
  JAM IN 3, NO MORE BETS IN 2) and fires as shown (`fight.ts` `chargeAbility`). The hits come from the enemy's
  reels; making them certain would stop the enemy being a slot machine. A warning you can't act on changes nothing.
- **Proposed for phase 1 (the user's call):** HOLD first (the only change that adds a choice inside a fight, and it
  gives the countdowns a use; the reason it was cut, fights ending in a spin or two, holds for only 5–24% of
  fights). Then OVERTIME, counted in your spins and shown on the HUD, starting late (about your 8th spin) and raising
  both sides' pays, so it shortens fights without punishing the shield build, which already wins fewer runs (KNIGHT
  GREEN 26% -> 19%). Certain intents leave the list.
- **For later phases:** KNIGHT snowballs after THE HOUSE (three sword levels; act 2 fights end in 2–4 spins until
  THE WHEEL); TESLA's storm heals out-heal act 3; Cashier symbol levels count boss levels in their price, so KNIGHT
  stops buying them; SCRATCH-OFF's panels are a blind pick and LUCKY SEVENS plays itself, while TWENTY-ONE (on the
  cut list) has real choices.

**Gate:** met (user, 2026-10-29): OVERTIME yes; AUTO off by default (done); certain intents dropped; HOLD waits on
its rules (the user's worry: asking every round would annoy players who blast through).

## Phase 1: fix the fights (built and live, 2026-10-29)
The user approved both on paper (no test mode); the rules are in `docs/legacy/HP_GAME.md` "Phase 1".
1. **OVERTIME:** from round 8 (SPIN 15), every hit on both machines grows x1.25, +0.25 a round; shields and TESLA's
   charge don't grow; the caps stay; it replaces act 3's enemy-only ramp. It can't fix dry stretches (no pay to grow).
2. **HOLD:** 2 a fight; tap a reel before your spin or while the enemy spins; nothing waits for it, AUTO included.
3. **AUTO off by default.** (Certain intents were dropped: the countdowns already exist.)

Sim, 300 runs, both live: fights past 12 of your spins (regular / boss) WHITE 655 / 95 -> 276 / 33, GREEN 921 / 206 ->
422 / 146. The game got easier (GREEN: TESLA 54%, BANKROLL 47%, JUKEBOX 45% against a 36 target; WHITE KNIGHT 72%
against 60): phase 5's balance pass takes it in, unless outside players find it too easy first. Ask them: do they use
HOLD, do they notice OVERTIME, do heal stalls (TESLA's storms) still happen.

Follow-ups: keyboard and gamepad HOLD done (Q / W / E, or the d-pad left / up / right in a fight).

**Gate:** outside players stop calling the fights slow or watch-only.

## Phase 2: freeze and trim
Done (2026-10-29): the scope is signed (below); the encounters are LUCKY SEVENS, TWENTY-ONE and the CLAW (SCRATCH-OFF
and RAT RACE went to after launch: SCRATCH-OFF's panels were a blind pick, TWENTY-ONE has real choices); `src/race`,
`src/meter` and THE SCORE RACE's branches through the engine are on the `parked-rebuild` branch (about 3,100 lines;
the same sim gives identical results without them); HOLD works from the keyboard (Q W E) and a pad's d-pad; THE DAILY
RUN, the online leaderboards (Supabase) and the name screen went to after launch (also on `parked-rebuild`; Steam's
achievements and leaderboards come first), so PLAY MODES is gone and TUTORIAL sits on the main screen.
Left:
- Split the files over about 1,000 lines as they're touched: `runScreens.ts` (2,999), `game.ts` (2,169), `run.ts`
  (1,579). Check each split with the sim (identical results) and a browser run. (`fight.ts` is split: its rules,
  a spin's scoring and the enemies' tricks are their own modules; the class with the turn loop is 717 lines since 2026-11-05, with a spin's payouts (fightPayout.ts) and hits, heals and deaths (fightDamage.ts) split out too.)

**Gate:** the scope is signed, and everything on it is built.

## Phase 3: Coming Soon in two weeks (user, 2026-10-29)
The user's three fears, in order: it **looks AI** (art, animation, menus that don't feel like one asset pack), the
gameplay feels unfair (less important: players play on feel, not numbers), a launch-breaking bug. Friends enjoy it;
the page is the cheap test of whether strangers will. No budget for a hired artist, so the art needs a rigid process
the user can review to the pixel. Art and UI go to the user as artifacts (galleries, before/after), not text.

**Week 1: identity and art direction**
1. **Theme (the user decides).** Today it mixes fantasy (KNIGHT, goblins, imps, slimes, golems, hexers) with casino
   (BANKROLL, the Floor, the Dealer). Proposal: a crooked casino town. Real casinos run themed slot machines (knights,
   mad science, disco), so the player's machines keep their themes as cabinets; the enemies become the town's
   hustlers and their rigged machines, by place: THE ALLEY (act 1), THE FLOOR (act 2), THE VIP ROOM (act 3), THE
   OWNER's office. The fantasy creatures go; their mechanics stay under new names and art.
2. **Name: done** (user, 2026-10-30): **REEL BRAWL**, REEL in gold and BRAWL in red on the marquee logo. Live on the
   title, the fight banner, the tab and the desktop window. Before the store page: a Steam store and trademark search on
   the name (a web search found no game by it). The repo, package names and save keys keep the old name.
3. **Art rules: done** (user, 2026-10-29): 32×32 portraits, still 8-bit; the rules are in `docs/JUICE.md`. The roster
   is approved; all 24 portraits are approved and live (2026-10-30): `tools/portraits.mjs` holds them (baked from the
   `art-wip` sources), `drawPortrait` draws them at the old portraits' size. Still 24×24 and pre-theme: the Cashier
   and the room art; they go in the UI kit pass.
4. **UI kit: approved** (user, 2026-10-30; the screens artifact above). **Shipped 2026-10-30** (every screen; the keyword icons and the Cashier touch-up still in review). One panel (the fight HUD's dark plum box, 3px
   gold frame; felt only on the card tables and wood only on the Cashier's counter, as scenery); three buttons (primary
   red with a gold rim, one per screen; secondary dark with a gold rim; quiet small grey; SPIN keeps its round button);
   four text sizes (title, heading, body, small; nothing smaller); the bulb marquee only on the logo and boss/elite
   cards; one number count-up. The fight screen loses its title marquee (user left it to Claude: it crowded the HUDs).
   The retail list, all approved: feedback on every touch, screen transitions, pad and Steam Deck focus everywhere,
   readable at 7 inches, one 12px keyword icon set, a self-teaching first fight, a big beat for jackpot, boss down and
   run over. Per screen (all approved as suggested): title (the marquee bulbs are the loading bar); main menu (machine
   and hero staged big, one primary, settings a gear); PROFILE as one tabbed screen (Collection with silhouettes and an
   Enemies tab, Trophies as plaques with progress bars, Stats); settings (chip sliders, bulb toggles, grouped);
   hiscores (ghost table, hero portrait rows); machine select (the selected machine big, silhouettes for locked,
   stakes as chips); cards (two lines max, rarity frame, lift and shine); the enemy card simplified (one ability chip,
   pips); routes as a street map; the Cashier redrawn at 32×32 (user: "he looks like a mushroom") behind a counter of
   kit panels; fight (bigger reels, slimmer HUD, the next move as one big chip, a turn banner over the reels); the pot
   as a meter panel; card tables sharing one layout with chip bet buttons; the claw machine as scenery; RUN OVER as a
   moment (who got you, the score counting up, best hit; the log behind a button; user: one of the 3 make-or-break
   screens). Later (user): the vault and the room backgrounds need a pass.

**Week 2: apply it and build the page**
5. Every screen through the UI kit; the re-themed enemies in; the words pass (enemy names, keywords like SLIME).
6. Steam page: capsule art at Steam's sizes (made in-house), 5+ screenshots, a 30-60 s trailer captured from the
   game, the short description in the user's voice, the AI disclosure answered plainly.
7. **The user, now:** open Steamworks (the $100 fee, identity and tax checks take days) so the page can go up when the
   art is ready.

Done (user, 2026-10-29): LUCKY SEVENS went ("nobody ever wins it") and HIGHER OR LOWER came back ("it had some actual
tension"): the encounters are TWENTY-ONE, the CLAW and HIGHER OR LOWER (rules in HP_GAME.md). Ask outside players
whether it has the tension the user remembers.

**Gate:** the Coming Soon page is live.

## Phase 4: the machines, THE OWNER and a demo (after the page)
- **THE OWNER:** 11 HP, one a hit, feels bad when you hit for millions. Make him a wall: huge HP you chip at, your
  damage as the score, milestones that pay or change him (Vampire Survivors' reaper, a final boss you're not meant to
  beat). A rule change: bring a proposal.
- **TESLA rework:** its strike count and each strike's damage both scale (27% of its spins deal nothing, THE DEALER
  falls 91-96% when reached). Make it scale one way.
- **JUKEBOX identity:** its 5 relics all tune the DROP's timing; give it a second way to build.
- **BANKROLL:** the most confusing machine (the shield build is unexplored). Make it readable, or ship with 4.
- Builds stay attack or shield: more is a rewrite, and the no-restart rule holds.
- **No launch-breaking bugs:** the fuzz on every change, a save and crash pass, a Steam Playtest before launch. Functional QA
  fixes (2026-11-09, FUNC): a lost run is recorded at the killing blow (a quit during the last turn lost it from
  HISCORES, stats, XP and COPY LAST RUN); ABANDON RUN counts as a loss (HISCORES: ABANDONED); RESET SAVE clears the run
  and COPY LAST RUN; Cashier buys and elite spoils are saved at once; the saved run is cleaned on load (stake, HP, chips
  clamped; a made-up place on the map drops it; garbage table state starts the game over); the crash panel works by
  keyboard and pad; keys 1-4 / A / pad Y do nothing between fights; an unplugged pad pauses; the machine already on the
  stage needs two taps, like the rest.
- An act 1 demo build; outside playtests every two weeks carry on.
- **The demo (built 2026-11-07):** one codebase, a build flag (`src/demo.ts`). Act 1 only, ending at THE HOUSE (beating
  it ends the run as DEMO CLEARED!, with what the full game has and WISHLIST ON STEAM); KNIGHT and TESLA at WHITE, the
  other three Slot Machines and the stakes above WHITE shown locked, IN THE FULL GAME; the tutorial stays; no ENDLESS,
  no unlocks, no Steam achievements; its own saves (`demo.slotvslot.*` keys). `npm run build:demo` (web, `dist-demo/`)
  and `npm run build:demo:steam` (desktop, `dist/`). The deploy puts the web demo at
  https://insanitywolfz.github.io/SlotsVsSlots/demo/ for outside playtesters. Once the store page has its app id, build with
  `VITE_STORE_APP_ID=<id>` (`src/storeId.ts`); until then every WISHLIST button reads COMING SOON TO STEAM, greyed, and
  `build:demo:steam` refuses to build (QA DEMO-01). Demo QA fixes (2026-11-09): WISHLIST on the demo's main menu and on a
  full-game machine's button; in the desktop build it opens Steam's overlay store page; the tutorial run starts with its
  machine's first offered relic (it had none: 22% vs 40% demo clears for a newcomer-like bot); a fresh profile's NEW RUN
  starts the tutorial; RESULTS shows before DEMO CLEARED's IN THE FULL GAME panel, which adds 2 MORE ACTS AND 55 RELICS;
  trophies the demo can't give say FULL GAME. With the flag off the game is unchanged (seeded sim identical). Sales pass (2026-11-07):
  the machine select shows the other three Slot Machines for real, dimmed, under one IN THE FULL GAME tag (their pitch
  on the stage, IN THE FULL GAME in place of PLAY), and DEMO CLEARED is a sales page: the result, then IN THE FULL GAME
  with the three Slot Machines and three bosses the demo lacks (art and one line from their rules) and the stakes and
  ENDLESS (`src/ui/run/demoCleared.ts`).

**Gate:** strangers play the demo start to finish with no help.

## Phase 5: Steam Next Fest
**Decided (user, 2026-11-09):** the page and the demo go up the day Steamworks gives the app id; on 2027-01-10 (February
registration closes) enter February only with ~2,000+ wishlists, otherwise June 2027 (registration closes 2027-04-25).
Feb 2027 runs 2027-02-22 to 03-01. (Market: entering with under ~1,000 gained a median 322; a demo out months early
gains ~2.5x; RESEARCH.md "Market".)
The game's one festival: the demo up, keys to streamers, the page polished. It multiplies the wishlists you bring
(the median game gained about 800; those entering with 10k+ gained about 5,200).

**Gate:** a wishlist target the user sets beforehand (10k+ is a healthy small launch).

## Phase 6: balance and launch
- The rules frozen: one sim pass across machines and stakes (the targets in HP_GAME.md "Balance"). Done 2026-11-07;
  rerun it only if a rule changes before launch.
- A Steam Playtest; the real app id in `desktop/steam_appid.txt` (480, Valve's test app, today); Steam achievements
  (the game's own move there);
  Steam Cloud on the mirrored save folder.
- Price $7.99–$9.99, where the slot hits sit.
- **Windows first (user, 2026-11-09):** the Deck plays it through Proton; a native Linux build waits until it's tested
  in the Steam Linux Runtime (Electron's sandbox). Packaging: `desktop/package.cjs` (desktop/README.md).
- Ratings: answer the content survey honestly (simulated gambling, no real money, no paid randomness).

## v1.0 scope (signed by the user, 2026-10-29)
- **Ships:** the 5 Slot Machines (BANKROLL at launch), the 3 acts with THE HOUSE, THE WHEEL and THE DEALER, THE OWNER,
  elites, the Cashier, drafts that only edit your reels, the stake ladder, ENDLESS with TONIGHT'S RULE, OVERTIME and
  HOLD, the rooms, the payout ladder and the climb, the 55 relics (51 at sign-off; the user added LEAN MACHINE, STEADY
  HANDS, PAIR STREAK and STICKY FINGERS on 2026-11-07, with the CUT draft card), today's Charms, 3 encounters (TWENTY-ONE,
  the CLAW, HIGHER OR LOWER).
- **After launch:** THE DAILY RUN, online leaderboards, SCRATCH-OFF, RAT RACE, new relics and Charms, and METER
  COMBAT's best idea (BLOCK against a certain telegraph) as a change inside this game.

## Parked: the rebuild (2026-10-16/17)
METER COMBAT (VISION.md) has KNIGHT and TESLA built in `src/meter/`, against one enemy (the slime); JOKER's design
waits on sign-off and JUKEBOX needs a redesign. It's parked because, read from the code (estimates from the reel
strips, not sim runs): firing the moment a meter fills is almost always right (a full meter only swaps its weakest
bar); BLOCK is a coin flip (the slime's warning shows at 6 of 10, when it fills that spin only about 41% of the time);
a real choice comes up about 1–2 times a fight (TESLA's own sim: 1.6); a strong build still needs about 4 turns to
fill a meter; and it resets the content to near zero. It comes back only under CLAUDE.md's no-restart rule. Its code
(METER COMBAT, THE NEW GAME, THE SCORE RACE) is on the `parked-rebuild` branch since 2026-10-29.
