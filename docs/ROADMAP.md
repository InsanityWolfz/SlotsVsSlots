# Roadmap: the road to Steam

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-30):** the UI pass shipped to `main` (user: "ship all the UI stuff"; review:
https://claude.ai/artifact/Uo8W6uXQJ4Cmv21tccPF1t). The keyword icons shipped too (22 approved one at a time over 7
rounds, https://claude.ai/artifact/LriFtZabSxqs3cBJ8nsbsX; in the glossary and the cards' detail boxes; FROZEN, JINX and
STEAL are drawn but have no keyword entry yet), and the Cashier touch-up. The SPILL reel symbol and ability icon are the broken
pint glass now, matching the icon (user, 2026-10-30). Steam capsules done: concept B "the gang" (the colorful
cast; the Jukebox in for the cut Mimic), approved at all 7 sizes (https://claude.ai/artifact/7g3xpbXdDfypGju7BUTo2t;
upload-ready PNGs and sources on the `art-wip` branch, `art/capsule/steam/`). Screenshots: 8 chosen, all fights plus
the map (https://claude.ai/artifact/XG4G8AGpwb3AGEeMRav5o2; 2560x1440, in order, retaken without LOG,
`art/steam/screenshots/upload/`).
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
nothing, and sabotage causes about 2% of fights' dead streaks, so the dry stretches are plain luck. Proposed: a BUILD-UP
(each spin that pays nothing adds +25% to your next pay; DRY SPELL made base, the relic reworked): the user wants to talk
it through first ("I'm afraid it's too much", it would have to be very readable);
and the CLAW reworked as push-your-luck: shipped (user, 2026-11-01; rules in HP_GAME.md). Phase 4's TESLA (option 1: every boost
adds charge, half-size bolts, the storm heals once) and THE OWNER (option A: a 25M fortune on a x10 damage ladder, plus
OVERLOAD, TESLA's ENDLESS loop growth) shipped (user, 2026-11-01: "we can ship the tesla and the owner re work"; rules in HP_GAME.md). The machines'
heals are one rule now, shipped (user, 2026-11-01): every meter payoff heals 15; KNIGHT has no meter, no heal (HP_GAME.md).
Left in phase 4: JUKEBOX's second way to build (simmed 2026-11-01: shields last one turn, so no DROP payoff makes a shield JUKEBOX a real build; a Body Slam SUBWOOFER, "THE DROP also hits for all the shield you hold", on the branch `jukebox-wall`, waits on the user; a bigger rework waits on the outside playtest), BANKROLL (readable, or ship with 4), the act 1 demo, the bug / save /
crash pass; the BUILD-UP idea for dry streaks waits on a mockup (the user: it has to be very readable). Open calls for
the user: FULL next to an unlit bulb in settings (the combat LOG is now dev-only: user, 2026-10-31),
fantasy-named relics (VAMPIRE FANG, SKELETON KEY, PHOENIX FEATHER, HOLY WATER, DEVIL'S DUE, CRUSADE, QUICKENING, VAMP
CHARM), the ~45 rewritten card faces.
Done before: theme, roster, name (REEL BRAWL), 24 portraits, words, enemy symbols (art:
https://claude.ai/artifact/9fZP62QFQ7ffp9tMYkUztV, words: https://claude.ai/artifact/Bo2uKXGYnFXWRJxTy5Ddcu, screens:
https://claude.ai/artifact/M4aXG9XZV9NvJ1bQK8HeKr).

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

Follow-ups: keyboard and gamepad can't HOLD yet (Steam needs it; a key per reel, before phase 3's demo).

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
  a spin's scoring and the enemies' tricks are their own modules; the class with the turn loop is 1,234 lines.)

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
- **No launch-breaking bugs:** the fuzz on every change, a save and crash pass, a Steam Playtest before launch.
- An act 1 demo build; outside playtests every two weeks carry on.

**Gate:** strangers play the demo start to finish with no help.

## Phase 5: Steam Next Fest
The game's one festival: the demo up, keys to streamers, the page polished. It multiplies the wishlists you bring
(the median game gained about 800; those entering with 10k+ gained about 5,200).

**Gate:** a wishlist target the user sets beforehand (10k+ is a healthy small launch).

## Phase 6: balance and launch
- The rules frozen: one sim pass across machines and stakes (the targets in HP_GAME.md "Balance").
- A Steam Playtest; the real app id in `desktop/steam_appid.txt` (480, Valve's test app, today); Steam achievements
  (the game's own move there);
  Steam Cloud on the mirrored save folder.
- Price $7.99–$9.99, where the slot hits sit.
- Ratings: answer the content survey honestly (simulated gambling, no real money, no paid randomness).

## v1.0 scope (signed by the user, 2026-10-29)
- **Ships:** the 5 Slot Machines (BANKROLL at launch), the 3 acts with THE HOUSE, THE WHEEL and THE DEALER, THE OWNER,
  elites, the Cashier, drafts that only edit your reels, the stake ladder, ENDLESS with TONIGHT'S RULE, OVERTIME and
  HOLD, the rooms, the payout ladder and the climb, the 50 relics, today's Charms, 3 encounters (TWENTY-ONE,
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
