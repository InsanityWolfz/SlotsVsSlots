# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-15):** the cut and the act 1 feel pass are in (GAME.md "The cut and the act 1 feel pass"); a
second feel playtest is checking them. Next: its findings, then the HOLD experiment (below).

## Now, in order
1. **The user plays the cut build** and decides cut list #8: the draft after every win vs the Cashier as the one
   build moment (held until the playtests were in).
2. **A play intervention, to try (user, 2026-10-15: "more symbols, a mechanics change, or some kind of play
   intervention: experiment"):** HOLD, the fruit-machine classic. Between your spins, tap a reel to hold it for the next
   spin (2 HOLDs a fight). Agency between spins, never during one; a near-miss becomes a decision. It breaks the
   watch-only rule, so it's the user's call: prototype behind a setting, measure with a bot hold policy.
3. **Balance left over** (sim, 800 runs): KNIGHT and JUKEBOX 6-8 under target from GREEN up (KNIGHT's Dealer spread);
   KNIGHT WHITE 66 (target 60), JOKER WHITE 53, RED JUKEBOX 60 / BANKROLL 61 (target 50).
4. **Encounters that touch your machine** (first feel playtest): prizes and costs as reel edits, Charms or curses, not
   only chips.

## Open design questions
- **ENDLESS, left from the playtests:** JUKEBOX's ENDLESS sustain (reach THE OWNER 40% with WARM-UP vs KNIGHT 51%,
  JOKER 61%, TESLA and BANKROLL 84%: it dies to attrition and the loop 1 HOUSE, see GAME.md VETERAN and WARM-UP). Small UI: callouts over the HP rows, phone-size RAT
  RACE / SCRATCH-OFF, LUCKY SEVENS' off-line rows.
- ALL IN is shown in three places (banner, table panel, the line under its machine).
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
