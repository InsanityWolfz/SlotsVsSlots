# Slots vs. Slots: guide for Claude sessions

An 8-bit roguelike where two slot machines face off. TypeScript + Vite + Canvas, with no framework.
Web build: https://insanitywolfz.github.io/SlotsVsSlots/ (deploys on every push to `main`).

## The project is being rebuilt (2026-10-16)
The old game (HP fights you watch, damage per spin) is being rebuilt as METER COMBAT (symbols fill meters; you choose
when to FIRE or BLOCK). It's the old chassis with new rules. The live build stays the old game until the new one is
better; the prototype is PLAY MODES > METERS (TEST). The score race tried on 2026-10-16 was dropped.

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
- **Every new feature or mechanic goes past the researcher, then the expert playtester (below), before the user signs
  it off** (user, 2026-10-16). Consult the researcher while designing, so the recommendation already carries what
  other games learned; the playtester then reviews the design before code.
- Keep docs current: when something is decided, mark it in VISION.md; when it ships, update ROADMAP.md, in the same
  commit. Don't add new plan, report or log files (`docs/RESEARCH.md`, the researcher's reference, is the one exception). Scratch work goes in a scratchpad or `tools/out/` (gitignored).

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

## The new game's rules (binding; user, 2026-10-17, see docs/VISION.md "The model: METER COMBAT")
- **Power builds up over a fight; no flat per-spin damage.** Symbols fill meters; you choose when to spend them.
- **Two meters a side, SWORD and SHIELD,** filled by every matching symbol in sight. One action a turn after your
  spin: FIRE or BLOCK (if full), or end the turn. Keep the screen this lean: a new meter or button is the user's call.
- **Paylines set the worth, not the fill count:** plain / gold (pair) / red-hot (jackpot) sword segments; shields
  fill faster on a line win. Hearts and coins pay instantly (no meter).
- **The enemy plays the same meters, visibly,** so its sword meter is the telegraph. Its sabotage is a symbol on its
  reels whose line win does something to your meters (the slime: gunks your sword meter to 5 bars until you fire).
- **Each Slot Machine except KNIGHT keeps its signature meter** (one more meter), which the player can trigger.
- The score race (`src/race/`, NEW GAME (TEST)) is dropped; don't build on it. HOLD, NUDGE, BET and CREDITS were its
  rules, not this game's.

## Agents
- **Expert playtester:** a general-purpose subagent briefed as an expert roguelike and slot-machine designer.
  Give it CLAUDE.md, docs/VISION.md, the binding rules above, and the question. It separates bugs, balance and
  design opinions, cites exact numbers, screens and text, and doesn't edit `src/`. It reports back in chat.
- **Researcher** (`.claude/agents/researcher.md`): researches slot machine, roguelike and battler mechanics online and
  keeps `docs/RESEARCH.md`, the team's knowledge base (it reads it first and adds to it every consult; it edits
  nothing else). It brings precedents, pitfalls and sources; it never decides. If the `researcher` agent type isn't
  listed, run a general-purpose agent told to follow that file.
- **Art agent:** edits only `tools/build-art.mjs`, then regenerates.
