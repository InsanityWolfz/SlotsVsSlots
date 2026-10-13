# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-13):** nothing mid-task. Everything below is open.

## Now, in order
1. **Play the new build.** Playtest C's bugs are fixed (see GAME.md). The level card's "18 -> 25 DAMAGE" stays
   (user: fine) and PAUSE is fights-only (user: fine). Left open: HOUSE EDGE cost lines stay all red (no keyword colours); the
   Dealer's front card shows its total HP (13K) though the fight has three bars; X1.1 BLACK / X1.5 RAISE notes show
   only in the LOG; on the ALL IN turn the Dealer's payline numbers still show.
2. **GO FOR BROKE (every shield becomes your attack symbol) may be too strong** on one-symbol machines: a friend's
   JUKEBOX GREEN run went all notes and won most of acts 2-3 in 1 spin. Sim, GREEN, 1500 runs: TESLA takes it 10% of
   runs and wins 75% (40% without); JUKEBOX 56% vs 34%; BANKROLL 56% vs 46%. Waiting on the user.
3. **Balance left over** (sim, 1000 runs): WHITE KNIGHT 66, JUKEBOX 68 (target 60, a little easy); GREEN TESLA 42,
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
