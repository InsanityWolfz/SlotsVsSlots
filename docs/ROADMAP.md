# Roadmap

The one list of what's next. Keep it short: when an item ships, delete it (git history is the record).

**In progress (2026-10-12):** nothing mid-task. Everything below is open.

## Now, in order
1. **Play the new build.** Since the last playtests: the three-hand Dealer, pacing (Act 3 x1.4 HP, a steadier
   ENDLESS), healing (a heal card under 25% HP, rising Cashier heal prices), ENDLESS variety (passed big choices come
   back, edges stack to III, legendary picks top up), BANK VAULT gone, JOKER at 380 HP with no payoff heal. Then one
   expert playtester pass on it.
2. **Balance left over** (sim, 1000 runs): WHITE KNIGHT 66, JUKEBOX 68 (target 60, a little easy); GREEN TESLA 42,
   JOKER 44 (target 36: weak early, strong late, accepted for now). WHITE 57-59 and GREEN 34-41 for the rest.

## Open design questions
- ALL IN is shown in three places (banner, table panel, the line under its machine).
- LUCKY BREAK is a free pick next to cards with costs.
- **Boss clarity**, and a **keyword glossary** (the same words for the same things on every card, each in its own
  color; a draft is in git history: `loop/KEYWORDS_DRAFT.md` at `c2f0ffb`).

## Before a Steam launch
- The user audits the achievements. Steam leaderboards replace Supabase.
- Pick a music approach: the code-composed chiptune now, or licensed music.
- English only.

## Code cleanup
- Unused sprites of removed content (BRIAR, THORNY, the GROUNDER's rods and EARTH, the removed relics incl. LIGHTNING ROD and BANK VAULT) in `tools/build-art.mjs`.
- Later: split the 2-3k-line files (`fight.ts`, `run.ts`, `runScreens.ts`, `director.ts`, `game.ts`).

## Held ideas
The SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
