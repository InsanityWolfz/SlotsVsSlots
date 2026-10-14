# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-14):** nothing mid-task. The content wave and both ENDLESS playtests are in; waiting on the
user's calls below.

## Now, in order
1. **Play the new build.** Playtest C's bugs are fixed (see GAME.md). The level card's "18 -> 25 DAMAGE" stays
   (user: fine) and PAUSE is fights-only (user: fine). Left open: HOUSE EDGE cost lines stay all red (no keyword colours); the
   Dealer's front card shows its total HP (13K) though the fight has three bars; X1.1 BLACK / X1.5 RAISE notes show
   only in the LOG; on the ALL IN turn the Dealer's payline numbers still show.
2. **Balance left over** (sim, 1000 runs): WHITE KNIGHT 66, JUKEBOX 68 (target 60, a little easy); GREEN TESLA 42,
   JOKER 44 (target 36: weak early, strong late, accepted for now). WHITE 57-59 and GREEN 34-41 for the rest.

## Open design questions
- **ENDLESS, from the two playtests (2026-10-14), for the user to pick:** THE OWNER is a wall, not a fight (he kills in
  2-4 hits: score each 10% of his HP taken, soften his hits so a fight runs 12-20 turns and raise his HP, phases at
  75/50/25%); chips x10 makes the score a chip count (try x2-3); loops don't escalate (loop 3 Dealer is the wall, loop
  4 is easier; reach THE OWNER KNIGHT 11-20% vs BANKROLL 86-88%); dead new relics (CERTIFIED HITMAKER, HOUSE OF CARDS,
  GOLDEN PARACHUTE, PUNCH CARD, HOUSE TAX, REGULAR worth ~0; DRY SPELL a trap on BANKROLL); THE LONG GAME always right
  in ENDLESS; encounters stop mattering late (fixed prices vs 100-300 chips; HIGHER OR LOWER +12% for an expert; CLAW
  chips +95%); a night per path; telegraph THE OWNER's big hits. Small UI left: callouts over the HP rows, GOLDEN
  TICKET level cards, the HOUSE EDGE screen doesn't list held edges, phone-size RAT RACE / SCRATCH-OFF, LUCKY SEVENS'
  off-line rows.
- ALL IN is shown in three places (banner, table panel, the line under its machine).
- LUCKY BREAK is a free pick next to cards with costs.
- **Keywords, next:** use the same words across all texts (the 2026-10-07 audit at `c2f0ffb`
  `loop/KEYWORDS_DRAFT.md` lists the mismatches: DAMAGE vs HIT, SPIN vs TURN...); tap-a-word on phone.

## Before a Steam launch
- The user audits the achievements. Steam leaderboards replace Supabase.
- Pick a music approach: the code-composed chiptune now, or licensed music.
- English only.

## Code cleanup
- Later: split the 2-3k-line files (`fight.ts`, `run.ts`, `runScreens.ts`, `director.ts`, `game.ts`).

## Held ideas
The SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
