# Roadmap: the road to Steam

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress:** nothing yet. The next session starts with phase 0.

**Resumed (2026-10-29), aimed at a paid Steam release.** v1.0 is the old game (`docs/legacy/HP_GAME.md`) with three
fight changes, frozen and trimmed content, and a Steam page early. The user approved this plan from an overnight
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

The review was done by reading only: that session couldn't run this repo (installing its packages was blocked, and
its network policy refused `github.io`). Phase 0 checks it against the real game.

## Phase 0: play it and check the review (the next session)
1. `npm install`, `npm test`, `npm run dev`. Play full runs yourself through `window.dbg`, and have the expert
   playtester play too: at least KNIGHT and TESLA, at WHITE and GREEN. Never report a run nobody played.
2. Measure with the sim, without tuning anything: fight length by act (turns; the share ending in 2 spins or fewer;
   the share past 12 turns), which builds make the long fights, and how many spins pass between decisions.
3. Tell the user, briefly, where the real game agrees with the review and where it doesn't. Push back where it
   doesn't.

**Gate:** the user confirms phase 1's three changes, or changes them.

## Phase 1: fix the fights
Each is a rule change: built behind PLAY MODES (TEST), played by the user and outside players, then made live. One
at a time, in this order.
1. **OVERTIME, a visible fight clock in every act.** Extend the act 3 ramp to every act and show it on screen
   (for example "OVERTIME x1.2" from turn 6, growing each turn). Aim: no fight past about 12 turns; one-spin kills
   stay. Open for the user: does it raise both sides' pays, or only the enemy's?
2. **Certain enemy intents.** Every enemy shows its next hit or trick, and it always happens as shown (today only
   some do: THE HAMMER IN 2, THE HOUSE's countdown). A guess is not an intent.
3. **HOLD back.** The old game's HOLD (commit `f7708bb`, reverted 2026-10-15: tap a reel to keep it for your next
   spin after a pair, 2 a fight). It "played fine" and fades as a build gets strong, which is right: the choice shows
   up in hard fights, and easy ones stay fast.

**Gate:** outside players stop calling the fights slow or watch-only.

## Phase 2: freeze and trim
- The user signs the v1.0 scope (below).
- Encounters down to 3: LUCKY SEVENS, SCRATCH-OFF, the CLAW (TWENTY-ONE and RAT RACE to after launch).
- THE DAILY RUN and the Supabase leaderboards (`src/net`) to after launch; Steam's achievements and leaderboards
  take their place.
- `src/race`, `src/meter` and the race branches in `fight.ts` (`cfg.race`) move to a branch, `parked-rebuild`.
- Split `fight.ts` (2,621 lines), `runScreens.ts` (3,304) and `game.ts` (2,374) as they're touched.

**Gate:** the scope is signed, and everything on it is built.

## Phase 3: Steam page and demo
- A Coming Soon page as early as possible (Steam Direct, $100): a one-screenshot hook ("two slot machines fight"),
  capsule art, a trailer from the rooms and the payout ladder. Wishlists take months.
- An act 1 demo build.
- Playtests with outside players every two weeks carry on.

**Gate:** strangers play the demo start to finish with no help.

## Phase 4: Steam Next Fest
The game's one festival: the demo up, keys to streamers, the page polished. It multiplies the wishlists you bring
(the median game gained about 800; those entering with 10k+ gained about 5,200).

**Gate:** a wishlist target the user sets beforehand (10k+ is a healthy small launch).

## Phase 5: balance and launch
- The rules frozen: one sim pass across machines and stakes (the targets in HP_GAME.md "Balance").
- A Steam Playtest; the real app id in `desktop/steam_appid.txt` (480, Valve's test app, today); achievements;
  Steam Cloud on the mirrored save folder.
- Price $7.99–$9.99, where the slot hits sit.
- Ratings: answer the content survey honestly (simulated gambling, no real money, no paid randomness).

## v1.0 scope (proposed; the user signs it in phase 2)
- **Ships:** the 5 Slot Machines (or 4, with BANKROLL as a free update: the user's call), the 3 acts with THE HOUSE,
  THE WHEEL and THE DEALER, THE OWNER, elites, the Cashier, drafts that only edit your reels, the stake ladder,
  ENDLESS with TONIGHT'S RULE, the rooms, the payout ladder and the climb, the 50 relics, today's Charms, 3 encounters.
- **After launch:** THE DAILY RUN, online leaderboards, TWENTY-ONE, RAT RACE, new relics and Charms, and METER COMBAT's
  best idea (BLOCK against a certain telegraph) as a change inside this game.

## Parked: the rebuild (2026-10-16/17)
METER COMBAT (VISION.md) has KNIGHT and TESLA built in `src/meter/`, against one enemy (the slime); JOKER's design
waits on sign-off and JUKEBOX needs a redesign. It's parked because, read from the code (estimates from the reel
strips, not sim runs): firing the moment a meter fills is almost always right (a full meter only swaps its weakest
bar); BLOCK is a coin flip (the slime's warning shows at 6 of 10, when it fills that spin only about 41% of the time);
a real choice comes up about 1–2 times a fight (TESLA's own sim: 1.6); a strong build still needs about 4 turns to
fill a meter; and it resets the content to near zero. It comes back only under CLAUDE.md's no-restart rule. The test
modes stay off PLAY MODES; their code stays until phase 2 moves it out.
