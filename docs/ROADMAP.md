# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-15):** THE SCORE RACE sandbox is in (GAME.md "THE SCORE RACE"): the user plays it and decides
whether fights become score races. Bosses with teeth is parked on branch `boss-teeth-wip` (HP-game numbers; THE OWNER
was beaten 4.6%, over the user's 2% bar), and moot if the race stays.

## Now, in order
1. **THE SCORE RACE: keep or drop (the user's call).** If kept: the watch-only rule in CLAUDE.md changes; combat
   relics (VAMP, heals, shields) get spin jobs; NUDGE / RESPIN join HOLD; bosses become race twists; BANKROLL reworked.
   If dropped: back to bosses with teeth (`boss-teeth-wip`).
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
