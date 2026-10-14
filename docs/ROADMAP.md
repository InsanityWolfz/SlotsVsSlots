# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-14), the user's picks from the content list.** Done: the offers removed, ENDLESS reworked (no
cash out, 2 paths, encounters, TONIGHT'S RULE, THE OWNER at loop 5, the rooms escalate), the 9 new relics. Next: the GLASS
Charm (x5, 1 in 4 to break when it pays); encounters RAT RACE, SCRATCH-OFF, CLAW MACHINE; big choices SECOND PAYLINE
and THE LONG GAME. Talk later: STEEL / MAGNET scaling, HOT / GROWTH (activate-style Charms), more than one Charm on a
cell.

## Now, in order
1. **Play the new build.** Playtest C's bugs are fixed (see GAME.md). The level card's "18 -> 25 DAMAGE" stays
   (user: fine) and PAUSE is fights-only (user: fine). Left open: HOUSE EDGE cost lines stay all red (no keyword colours); the
   Dealer's front card shows its total HP (13K) though the fight has three bars; X1.1 BLACK / X1.5 RAISE notes show
   only in the LOG; on the ALL IN turn the Dealer's payline numbers still show.
2. **Balance left over** (sim, 1000 runs): WHITE KNIGHT 66, JUKEBOX 68 (target 60, a little easy); GREEN TESLA 42,
   JOKER 44 (target 36: weak early, strong late, accepted for now). WHITE 57-59 and GREEN 34-41 for the rest.

## Open design questions
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
