# Slots vs. Slots — guide for Claude sessions (local or cloud)

An 8-bit roguelike where two slot machines fight. TypeScript + Vite + Canvas, with no framework.
Live playtest: https://insanitywolfz.github.io/SlotsVsSlots/ (auto-deploys on every push to `main`).

## Read first, every session
0. `loop/TUESDAY_PLAN.md`: the step-by-step runbook for the next session (start here).
1. `loop/DIRECTION_NOTES.md`: the agreed next direction (charm rework, ×10 numbers, character meters,
   Act 3 length, post-boss choices, endless mode) and the **Tuesday plan** (expert review first).
2. `loop/BACKLOG.md`: the user's playtest notes and what's already done.
3. `loop/STATE.md`: binding design constraints and the full iteration log (balance numbers per change).

## Commands
- `npm install`, then `npm test` (vitest, ~150 tests; keep green)
- `npx tsc --noEmit -p .` (typecheck; `noUnusedLocals` is on)
- `npm run sim -- --runs 1500`: headless balance sim. Prints policies, the HIGH STAKES ladder, a Dealer row
  per slot machine, and the slot machine table.
- `tools/balance/*.ts` (run with `npx tsx`): focused harnesses.
  - `tuesday.ts [N]`: THE official per-slot-machine table (WHITE, GREEN, the Dealer, act 3, big choices). Log its numbers.
  - `diag.ts [N]`: bare machines vs act 1 (damage per turn by source). `calib.ts [N]`: measured late-run damage per machine.
  - `bonus_rates.ts`, `qa2_headless.ts`. `legacy/` holds the pre-rework (full set) harnesses; they no longer run.
- `npm run dev`: dev server (:5173) with `window.dbg` helpers and the TUNE panel. `npm run build`: public build to `dist/`
  (no dev tools; verify with a grep for `dbg`/`TuningPanel` in `dist/assets`).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` (hand-authored pixel grids; 8-bit stays).

## Architecture
- `src/core`: pure, deterministic rules engine (seeded RNG). `Fight.step()` emits ordered `CombatEvent`s.
  `run.ts` holds the run state, drafts, shop, vouchers and bosses' HP formulas. `enemies.ts` has the TUNE knobs and HP curves.
- `src/present`: the Director plays events back (skippable clock) with all the juice.
- `src/ui`: menus (loading, main, collection, hiscores), run screens (draft, shop, bonus wheel, relic rush), tutorial coach.
- Saves: localStorage `slotvslot.prefs.v2` (unlocks, stakes) and `slotvslot.profile.v1` (collection, hiscores).
  **Never rename these keys**; playtesters' progress lives there. Saves are sanitized on load.

## The user's rules (binding)
- **Fights are watch-only:** no in-fight input, holds or nudges. Agency lives between fights.
  Enemies write on the player's machine.
- **User-facing words:** "Slot Machines" (never cabinets), "Charms" (never gild). Code identifiers may stay.
- **No decision hints** on upgrade cards: no "FITS" tags, no expected-value or stat-delta numbers.
- **Charms live on CELLS** (the rework shipped 2026-09-27): no FULL SETS, no tier II. Levels live on the TYPE (cap 3).
  Pay = BASE × MULT; gold charms in a group ADD. Every slot machine but KNIGHT has one signature symbol + meter.
- **GREEN stake and up always include Act 3** (the Dealer).
- **Push to GitHub only when the user says so.** Commit freely. Players are on the live build: don't push
  gameplay changes mid-playtest without asking.
- **Balance rigor:** measure every gameplay change with the sim (before and after), and log the numbers in `loop/STATE.md`.
- **Photosensitivity:** no full-screen white flashes. `FLASH_CAP` is 0.2. A LIGHTNING: FULL/SOFT option exists.
- **Held ideas:** the SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
- The user is direct and has strong game sense. Push back with reasons when you disagree; keep the summaries short.

## Agents
The "expert playtester" isn't a built-in; it's a general-purpose subagent given the brief in
`loop/PLAYTESTER_BRIEF.md`. The art agent works the same way (it only edits `tools/build-art.mjs`, then regenerates).
