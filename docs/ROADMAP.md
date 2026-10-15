# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-15):** the draft/Cashier split is in (GAME.md "After every win" and "The Cashier"); next, bosses
with teeth, then one balance pass for both.

## Now, in order
1. **Bosses with teeth** (user, 2026-10-15): THE HOUSE is beaten in 86-95% of meetings at WHITE, THE WHEEL 88-97%.
   Each boss should be a run-ending threat you can see coming. Then rebalance the machines.
2. **Left from the second feel playtest:** act 2 fights run 74-95 s. Small UI: GOLD / GLASS icons blank in the side panel's
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
