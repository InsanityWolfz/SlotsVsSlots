# Slots vs. Slots: guide for Claude sessions

An 8-bit roguelike where two slot machines face off. TypeScript + Vite + Canvas, with no framework.
Web build: https://insanitywolfz.github.io/SlotsVsSlots/ (deploys on every push to `main`).

## Where the project stands (2026-10-29)
The project is back on, aimed at a paid Steam release. **v1.0 is the old game** (HP fights, `docs/legacy/HP_GAME.md`),
not a rebuild: its fights get three small changes, its content is frozen and trimmed, and it goes to Steam. The METER
COMBAT rebuild (2026-10-16/17) and the score race before it are **parked**: their code (`src/meter/`, `src/race/`)
stays out of PLAY MODES and moves out of the engine in phase 2. The plan and why: `docs/ROADMAP.md`, from an overnight
review (the user's doc "Slots vs. Slots: the road to Steam", https://claude.ai/artifact/A7ADak3Vec6oPZEzQbMVgi).

## Read first, every session
1. `docs/ROADMAP.md`: the road to Steam, its phases and gates, and what's in progress.
2. `docs/legacy/HP_GAME.md`: the game v1.0 is built on (its rules and numbers are the live game's again).
3. `docs/VISION.md`: the parked rebuild, kept for the record. Only its 2026-10-29 status note applies.
4. `docs/JUICE.md`: before any presentation work.

**If a session stopped mid-task** (a usage limit, a crash): pick up where it left off without being asked. The
"In progress" line at the top of `docs/ROADMAP.md` says what was being worked on; `git log` and `git status` show how
far it got. Keep that line current while you work.

## How to work (user, 2026-10-29: a middle ground, "it got out of hand, but it needs a little structure")
- **v1.0 scope is frozen.** `docs/ROADMAP.md` lists what ships. Adding to it means taking something out, and that's
  the user's call. New ideas go on its "After launch" list.
- **Two kinds of change.**
  - A fix or tweak (a bug, a number, a word): straight to `main`; `npm test` must pass (CI blocks a broken deploy).
  - A rule change (a new mechanic or system): built behind a PLAY MODES (TEST) entry, played by the user and by
    outside players, and only then made the live rule. A branch only if it takes more than one session.
- **People decide, sims measure.** Outside players (people who haven't played it) judge the feel: every two weeks,
  one run each, three questions (the best moment, when you got bored, what confused you), plus their COPY RUN log.
  The sim measures; it doesn't decide.
- **Balance in batches.** One sim pass per roadmap phase, once that phase's rules are frozen. No 1,000-run sim per
  tweak, and no new HP numbers after every change.
- **No restart without evidence.** Rebuilding the core needs complaints from outside players, a one-page comparison
  of old against new, and a test mode. The live game is never paused for a rebuild.
- **One system at a time; don't spread a mechanic** to other machines, relics and Charms until the user asks.
- **Think it through before proposing:** judge an idea on the run, fight and spin levels, on incentive, feel, greed,
  payoff and readability for a new player. Bring one recommendation with its reasons, not a menu.
- **The researcher and the expert playtester are for rule changes,** not every tweak.
- **Keep the code shippable:** experiments live outside the engine; a file over about 1,000 lines gets split the next
  time it's touched.
- Keep docs current: when something is decided or ships, update ROADMAP.md (and HP_GAME.md for live rules) in the
  same commit. Don't add new plan, report or log files (`docs/RESEARCH.md`, the researcher's reference, is the one
  exception). Scratch work goes in a scratchpad or `tools/out/` (gitignored).

## Commands
- `npm install`, then `npm test` (vitest; keep it green) and `npx tsc --noEmit -p .` (`noUnusedLocals` is on).
- `npm run dev`: dev server on :5173 with `window.dbg` helpers and the TUNE panel (T or \`).
- `npm run build`: the public build in `dist/`, with no dev tools (check: grep `dist/assets` for `dbg`/`TuningPanel`).
- `npm run build:steam`: the desktop build (see `desktop/README.md`).
- Art: `node tools/build-art.mjs` regenerates `src/render/spriteData.ts` (hand-authored pixel grids; 8-bit stays).
- Sim: `npm run sim -- --runs 500 --stakes 0,2` (`tools/sim/balance.ts`); `tools/sim/fuzz.ts` checks invariants.

## The user's rules (binding)
- **User-facing words:** "Slot Machines" (never cabinets) and "Charms" (never gild). Code identifiers may stay.
- **No decision hints** on cards: no "FITS" tags, no expected-value or stat-delta numbers.
- **Saves:** never rename the localStorage keys `slotvslot.prefs.v2` / `slotvslot.profile.v1`. Saves are cleaned on load.
- **Photosensitivity:** no full-screen white flashes. `FLASH_CAP` is 0.2. Keep the LIGHTNING: FULL/SOFT option.
- **Pushing:** commit freely. `main` is the user's own test build (they play it on their phone via GitHub Pages);
  nobody else is playing. Pushing working builds to `main` is fine. Don't push broken or half-finished work there.
- **Held ideas:** the SLOTS VS. BOTS rename, 16-bit art, the Gambler character.
- The user is direct and has strong game sense. Push back with reasons when you disagree. Keep summaries short.
- **The parked rebuild's rules** (METER COMBAT, 2026-10-17; the score race, 2026-10-16) are not binding on v1.0. They
  stay in `docs/VISION.md` for the record. HOLD in the roadmap means the old game's HOLD (commit `f7708bb`), not the
  score race's.

## Agents
- **Expert playtester:** a general-purpose subagent briefed as an expert roguelike and slot-machine designer.
  Give it CLAUDE.md, docs/ROADMAP.md, docs/legacy/HP_GAME.md and the question. It separates bugs, balance and
  design opinions, cites exact numbers, screens and text, and doesn't edit `src/`. It reports back in chat. To play,
  it drives the dev build (`npm run dev`) through `window.dbg` and screenshots; it never reports a run it didn't play.
- **Researcher** (`.claude/agents/researcher.md`): researches slot machine, roguelike and battler mechanics online and
  keeps `docs/RESEARCH.md`, the team's knowledge base (it reads it first and adds to it every consult; it edits
  nothing else). It brings precedents, pitfalls and sources; it never decides. If the `researcher` agent type isn't
  listed, run a general-purpose agent told to follow that file.
- **Art agent:** edits only `tools/build-art.mjs`, then regenerates.
