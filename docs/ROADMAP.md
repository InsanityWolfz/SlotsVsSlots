# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-15):** the race act 1 vertical slice (below): steps 1-3 (rules, tools, HUD; act 1 enemies, THE HOUSE; relics, Charms, the Cashier) are in; next, step 4.

## Now, in order
1. **Race act 1, a vertical slice** (user, 2026-10-15; behind PLAY MODES, the normal game untouched; it ends at
   "ACT 1 CLEARED" after THE HOUSE). Then the user plays race act 1 and normal act 1 back to back and decides.
   - **Rules (user):** races alternate spins, you first, the enemy last, then the scores compare. One lost race ends the
     run (no lives). Each race: 3 HOLDs, 2 NUDGEs, 1 RESPIN, used as you see fit. HOLD keeps a reel before a spin; NUDGE
     and RESPIN act after your spin lands and before it scores (NUDGE moves a reel one cell, RESPIN spins one reel
     again). A shield you hold blocks the next sabotage.
   - **Step 4:** sim targets (act 1 races ~85%, elites 75%, THE HOUSE 70%, first race 90%), an expert playtester pass.
2. **Left from the second feel playtest:** act 2 fights run 74-95 s. Small UI: GOLD / GLASS icons blank in the side panel's
   Charm grid, REPO MAN's subtitle repeats his ability text, the WHEEL card has no
   tagline, the REGULAR title shares a relic's name.
3. **Balance left over** (HP game, after the draft/Cashier split; sim 1000 runs): RED runs high (KNIGHT 63, BANKROLL
   66, JUKEBOX 57; target 50), KNIGHT WHITE 70 (60), JUKEBOX BLUE / GOLD 12 / 6 (20 / 14), TESLA GREEN 42 (36).
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
