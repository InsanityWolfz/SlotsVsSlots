# Slots vs. Slots: guide for Claude sessions

An 8-bit roguelike where two slot machines fight. TypeScript + Vite + Canvas, with no framework.
Web build: https://insanitywolfz.github.io/SlotsVsSlots/ (deploys on every push to `main`).

## Read first, every session
1. `docs/ROADMAP.md`: what's next, in order.
2. `docs/GAME.md`: what the game is today (runs, machines, enemies, bosses, stakes, code map).
3. `docs/JUICE.md`: before any presentation work.

**If a session stopped mid-task** (a usage limit, a crash): pick up where it left off without being asked. The
"In progress" line at the top of `docs/ROADMAP.md` says what was being worked on; `git log` and `git status` show how
far it got. Finish it, then carry on with the roadmap. Keep that line current while you work.

Keep these current: when you ship or decide something, update GAME.md and ROADMAP.md in the same commit. Don't
add new plan, report or log files to the repo. History lives in git (everything before the 2026-10-11 cleanup is
at commit `c2f0ffb`). Scratch work goes in a scratchpad or `tools/out/` (gitignored).

## Commands
- `npm install`, then `npm test` (vitest; keep it green) and `npx tsc --noEmit -p .` (`noUnusedLocals` is on).
- `npm run dev`: dev server on :5173 with `window.dbg` helpers (`dbg.run(seed, id, stake)`, `dbg.vs('wheel')`,
  `dbg.bonus('wheel' | 'rush')`, `dbg.forceWin()`) and the TUNE panel (T or \`).
- `npm run build`: the public build in `dist/`, with no dev tools (check: grep `dist/assets` for `dbg`/`TuningPanel`).
- `npm run build:steam`: the desktop build (see `desktop/README.md`).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` (hand-authored pixel grids; 8-bit stays).
- Sims: `npm run sim` and `tools/sim/*.ts` (`npx tsx`). **Their numbers aren't trusted**; a new sim is planned (ROADMAP).

## The user's rules (binding)
- **Fights are watch-only:** no in-fight input, holds or nudges. Agency lives between fights. Enemies write on
  the player's machine.
- **User-facing words:** "Slot Machines" (never cabinets) and "Charms" (never gild). Code identifiers may stay.
- **No decision hints** on cards: no "FITS" tags, no expected-value or stat-delta numbers.
- **Charms live on CELLS.** Levels live on the Charm TYPE. Pay = BASE × MULT; gold Charms in a group ADD.
  Every Slot Machine except KNIGHT has one signature symbol and a meter.
- **GREEN stake and up always include Act 3** (the Dealer).
- **Saves:** never rename the localStorage keys `slotvslot.prefs.v2` / `slotvslot.profile.v1`. Saves are cleaned on load.
- **Photosensitivity:** no full-screen white flashes. `FLASH_CAP` is 0.2. Keep the LIGHTNING: FULL/SOFT option.
- **Pushing:** commit freely. `main` is the user's own test build (they play it on their phone via GitHub Pages);
  nobody else is playing. Pushing working builds to `main` is fine. Don't push broken or half-finished work there.
- **Balance:** no tuning until the new sim exists (ROADMAP). After that, measure every gameplay change before and after.
- **Held ideas:** the SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
- The user is direct and has strong game sense. Push back with reasons when you disagree. Keep summaries short.

## Agents
- **Expert playtester:** a general-purpose subagent briefed as an expert roguelike and slot-machine designer.
  Give it CLAUDE.md and docs/, the binding rules above, and the question. It separates bugs, balance and design
  opinions, cites exact numbers, screens and text, and doesn't edit `src/`. It reports back in chat, not in a repo file.
- **Art agent:** edits only `tools/build-art.mjs`, then regenerates.
