# Slots vs. Slots: guide for Claude sessions

An 8-bit roguelike where two slot machines face off. TypeScript + Vite + Canvas, with no framework.
Web build: https://insanitywolfz.github.io/SlotsVsSlots/ (deploys on every push to `main`).

## The project is being rebuilt (2026-10-16)
The old game (HP fights you watch) is being replaced by a new one (a race for the top score, played one spin at a
time). It's a new game on the old chassis, not a fix. The live build stays the old game until the new one is better.

## Read first, every session
1. `docs/ROADMAP.md`: the rebuild's steps and what's in progress.
2. `docs/VISION.md`: the new game. Only sections marked **DECIDED** are the design; the rest is open.
3. `docs/JUICE.md`: before any presentation work.

`docs/legacy/HP_GAME.md` describes the old game and the SCORE RACE experiment. Use it to find how existing code
works. **Its rules, numbers, sim targets and per-machine designs are not requirements for the new game.** Don't
carry old-game designs into the new one unless the user decides to.

**If a session stopped mid-task** (a usage limit, a crash): pick up where it left off without being asked. The
"In progress" line at the top of `docs/ROADMAP.md` says what was being worked on; `git log` and `git status` show how
far it got. Keep that line current while you work.

## How to work in the rebuild (user, 2026-10-16)
- **One system at a time.** Design it, get the user's sign-off, build it, play it, judge it on feel. Then the next.
- **Don't spread a new mechanic.** A change to one Slot Machine or system stays there until the user asks to apply
  it elsewhere. Don't retune every machine, relic and Charm around it.
- **No sim balancing until the rules stop changing.** Tuning numbers for a design that's still moving is wasted work.
- **Think it through before proposing.** Judge an idea on the macro (run), meso (race) and micro (spin) levels, on
  incentive, feel, greed, payoff and excitement, and on readability for a new player. Bring one recommendation with
  its reasons, not a menu of half-thought options, and not "want me to build it?".
- Design changes go past the expert playtester (below) before code.
- Keep docs current: when something is decided, mark it in VISION.md; when it ships, update ROADMAP.md, in the same
  commit. Don't add new plan, report or log files. Scratch work goes in a scratchpad or `tools/out/` (gitignored).

## Commands
- `npm install`, then `npm test` (vitest; keep it green) and `npx tsc --noEmit -p .` (`noUnusedLocals` is on).
- `npm run dev`: dev server on :5173 with `window.dbg` helpers and the TUNE panel (T or \`).
- `npm run build`: the public build in `dist/`, with no dev tools (check: grep `dist/assets` for `dbg`/`TuningPanel`).
- `npm run build:steam`: the desktop build (see `desktop/README.md`).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` (hand-authored pixel grids; 8-bit stays).
- Sim (old game): `npm run sim -- --runs 500 --stakes 0,2` (`tools/sim/balance.ts`); `tools/sim/fuzz.ts` checks invariants.

## The user's rules (binding)
- **User-facing words:** "Slot Machines" (never cabinets) and "Charms" (never gild). Code identifiers may stay.
- **No decision hints** on cards: no "FITS" tags, no expected-value or stat-delta numbers.
- **Saves:** never rename the localStorage keys `slotvslot.prefs.v2` / `slotvslot.profile.v1`. Saves are cleaned on load.
- **Photosensitivity:** no full-screen white flashes. `FLASH_CAP` is 0.2. Keep the LIGHTNING: FULL/SOFT option.
- **Pushing:** commit freely. `main` is the user's own test build (they play it on their phone via GitHub Pages);
  nobody else is playing. Pushing working builds to `main` is fine. Don't push broken or half-finished work there.
- **Held ideas:** the SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
- The user is direct and has strong game sense. Push back with reasons when you disagree. Keep summaries short.

## Suspended: old-game rules, until the vision decides
These bound the old game. They don't bind the new one unless VISION.md brings them back.
- Fights are watch-only (no in-fight input, holds or nudges); enemies write on the player's machine.
- Charms live on CELLS, levels on the symbol type; Pay = BASE x MULT; gold Charms in a group ADD.
- Every Slot Machine except KNIGHT has one signature symbol and a meter.
- GREEN stake and up always include Act 3 (the Dealer).
- Honest HP: an enemy has the same HP at the same stop on every machine; measure every gameplay change with the sim.

## Agents
- **Expert playtester:** a general-purpose subagent briefed as an expert roguelike and slot-machine designer.
  Give it CLAUDE.md, docs/VISION.md, the binding rules above, and the question. It separates bugs, balance and
  design opinions, cites exact numbers, screens and text, and doesn't edit `src/`. It reports back in chat.
- **Art agent:** edits only `tools/build-art.mjs`, then regenerates.
