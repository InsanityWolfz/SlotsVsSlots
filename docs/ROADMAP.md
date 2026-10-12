# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-12):** the 2026-10-12 balance work is on main (new sim, honest HP, no heal after a fight, the
three-hand Dealer, additive lightning, no Act 3 heal penalty). GREEN tuning is paused (user): KNIGHT 38, JUKEBOX 39,
TESLA 43, JOKER 52, BANKROLL 52 (target 36); JOKER / BANKROLL / TESLA are weak early and strong late, accepted for now.
Now: the playtest bug list below, then two expert playtester runs into ENDLESS to hunt bugs there. Keep going through
usage resets.

## Now, in order
1. **The run map rework (agreed 2026-10-12).** Why: every human playtester takes the elite at every fork (a free
   relic for little risk), which snowballs. The old sim hid this by bending boss HP per machine.
   - **Built (2026-10-12):** paths of stops, elites that hit harder and pay relics in every act, Cashier and
     encounter stops, the CHOOSE YOUR PATH screen, the encounter screen. SIDE BETS, the GROUNDER and normal
     enemies' permanent rocks are gone. See GAME.md.
   - **Encounters, agreed 2026-10-12:** gold "?" on the map; buy-in tiers where a bigger buy-in buys more plays;
     mostly chips (70-80%), sometimes upgrades or relics; each game may pay its own prize type; staked relics are
     picked by the house (tooltip shown); encounters about as good as elites, elites slightly ahead (more risk);
     every game has SKIP. Done: LUCKY SEVENS (with its art), RED OR BLACK (roulette), HIGHER OR LOWER, TWENTY-ONE
     (blackjack), UNDER OR OVER (dice); offers THE BLOOD BANK, THE PAWN SHOP, THE LOAN SHARK; path shapes with three
     encounters. Possible later: more paylines if the slot needs it.
   - **Next:** the encounters above; the roster audit below; play it.
     Open questions to settle while playing: should elites keep the +2 chips; should a path have a crossing point
     mid-act. (The post-fight heal is gone: user, 2026-10-12.)
   - **Stops:** FIGHT (a draft and chips), ELITE (a relic pick), CASHIER (spend chips), ENCOUNTER (a non-fight
     gamble: stake chips, HP, relics or upgrades; the user is designing these). Encounters replace SIDE BETS.
   - **No right answer (the user's concern with "greedy / safe / mixed").** A path is judged against YOUR run, not
     ranked. The levers:
     - **Reward kinds differ, not just amounts.** Elites pay relics; encounters can pay relics, chips or upgrades
       on a gamble; Cashiers turn chips into whatever you're missing. Elites are no longer the only relic source.
     - **Matchups are visible.** The map names each enemy, so the same elite is a gift to one build and a run-ender
       for another (a HEXER elite against a Charm build).
     - **Elites really hurt:** more damage, not just more HP. Taking two on low HP can end the run.
     - **Timing matters:** where the Cashier sits on a path decides whether your chips arrive in time to be useful.
     - So a weak build wants the gentle path, a strong one the elites, and most runs land somewhere in between.
   - **Roster:** done: the GROUNDER is gone; normal enemies' rocks crumble after the fight; THE REPO MAN's liens
     (off since 2026-10-07) are out of the code. Audit 2026-10-12: every enemy still works with today's machines.
     Four of them answer Charms (HEXER, COUNTERFEITER, THE REPO MAN, PIT BOSS) and none answers a no-Charm build;
     the new sim decides whether that's a problem (it's also the visible-matchup lever for picking paths).
   - **Honest HP:** the same enemy HP at the same stop for every machine. Machines get balanced by tuning the
     machines. Bosses stop being sized to your build (or keep only a mild part of it; decide with the new sim).
2. **Finish THE WHEEL and THE DEALER reworks.** The user likes the ideas. Their rules are in, but neither is tuned.
   Do this after (1), because the map rework may change what arrives at those bosses.
3. **A new balance sim, then balance from scratch.** Don't trust any earlier sim numbers: the old gates (WHITE about
   41-45%, GREEN 16-19%) never matched real play. The new bot must play like people do (take elites, chase relics,
   snowball, ride endless), report per relic, per Charm and per card, and be checked against real playtest runs.

## From the expert playtest (2026-10-12)
- Fixed 2026-10-12: pay banners over the HP bars, enemy payline numbers, UNDERDOG overflow, "?" checkmarks, legendary
  twice an act, LUCKY SEVENS total, draft clicks during the deal, flying shields over the number, PRESS TO CONTINUE,
  HIGH ROLLER on BANKROLL's card, ROUND (fight length is SPINS now), aces high, the LOAN SHARK's terms, Cashier item
  clicks. (SWORD LV5 at GREEN is LIMIT BREAK, by design.)
- Clarity: ALL IN is shown in three places (banner, table panel, warning over its machine).
- Design: strong runs snowball into one-spin fights (BANKROLL's shield build reached 7000 shield); KNIGHT fights drag
  (29-33 spins); Cashier heals and THE BLOOD BANK are too cheap now that there's no heal after fights (chip-rich
  machines shrug off attrition); LUCKY BREAK is a free pick next to cards with costs.

## From the ENDLESS playtests (2026-10-12)
- Fixed 2026-10-12: BLOOD MOON / OVERCLOCK conversions (no fitting Charm, free shield cost), the endless run-over table
  and its subtitle, CONTINUE: LOOP n, the stale Cashier ACT 3 line, the Dealer's HUD line (BUST, then ALL IN) and table
  card on a hand change, legendaries shown twice (endless picks, PAWN SHOP before the act's pick), the endless relic pick
  header, HOUSE CUT's text (fights only), LUCKY BREAK at the cap, FAST HANDS on the preview, card suits on a tie, the
  10, achievement text, MAD SCIENCE's +100% tag, dbg.forceWin() on the Dealer.
- Open bugs: JOKER's all-jackpots wheel covers the Dealer's table panel; regular endless fights don't show the loop;
  the loop's first legendary pick keeps "THE DEALER DEFEATED!" as its title; no LOOP dividers in the run-over table;
  the bust screen doesn't show the banked pot; small overflows (PAY OVERCHARGE buy-in, PAWN SHOP captions, 33+ relics,
  "+4" in YOUR REELS hides wilds and rocks); a pay banner once read 39 x 11.3 = 439 (rounding shown).
- Design: endless loops 1-3 are 1-3-spin fights, then a wall (loop 4-5); the endless Dealer's ALL IN doesn't scale
  (70-110 vs 83K HP); SECOND WIND repeats every loop and late choice screens show one card; a path ending at the
  Cashier runs into the pre-boss Cashier; BANKROLL's act 1 fights take 47-49 spins; low HP with no heal on offer.

## Open from earlier playtests (re-check after the reworks)
- **Pacing:** early fights feel slow, late ones far too fast.
- **Bimodal runs:** weak runs stay weak and die; strong ones snowball and one-shot everything.
- **Offers feel too fitted:** one Charm locks your offers in, and late rerolls barely change the pool.
- **Boss clarity:** the mechanics are hard to follow.
- **SLIME:** a jackpot should cleanse only your visible 3×3, not every slime on the strip. Measured 2026-10-12 (2000
  runs, WHITE): JOKER 57 -> 51, BANKROLL 60 -> 54. Held for the user (it needs a JOKER / BANKROLL early buff with it).
- **LOOSE CHANGE is a trap:** pair rains cost full chips at half damage.
- **Keyword glossary:** the same words for the same things on every card, each in its own color. A draft is in git
  history: `loop/KEYWORDS_DRAFT.md` at `c2f0ffb`.

## Before a Steam launch
- The user audits the achievements. Steam leaderboards replace Supabase.
- Pick a music approach: the code-composed chiptune now, or licensed music.
- English only.

## Code cleanup
- Unused sprites of removed content (BRIAR, THORNY, the GROUNDER's rods and EARTH, the 19 removed relics incl. LIGHTNING ROD) in `tools/build-art.mjs`.
- Later: split the 2-3k-line files (`fight.ts`, `run.ts`, `runScreens.ts`, `director.ts`, `game.ts`).

## Held ideas
The SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
