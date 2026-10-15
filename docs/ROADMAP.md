# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-15):** the cut, the act 1 feel pass, and the second feel playtest's fixes are in; HOLD was
tried and cut (GAME.md "The cut and the act 1 feel pass"). Waiting on the user to play it.

## Now, in order
1. **Draft vs Cashier (cut list #8, the user's call; proposed 2026-10-15):** the draft after a win only edits the reels (symbols,
   Charms); the Cashier is where you save up for levels, relics, heals, rerolls and one rare big buy a visit.
2. **Left from the second feel playtest (design, needs the sim):** the catch-up heal (the larger of 35% or all missing
   HP) undoes low-HP danger, try a flat 35%; THE HOUSE (act 1 boss) is too easy (beaten in 91% of meetings); act 2 fights run 74-95 s. Small UI: GOLD / GLASS icons blank in the side panel's
   Charm grid, REPO MAN's subtitle repeats his ability text, PLAY MODES has half a panel of space, the WHEEL card has no
   tagline, the REGULAR title shares a relic's name.
3. **Balance left over** (sim, 800 runs): KNIGHT and JUKEBOX 6-8 under target from GREEN up (KNIGHT's Dealer spread);
   RED JUKEBOX 60 / JOKER 58 / BANKROLL 61 (target 50).
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
