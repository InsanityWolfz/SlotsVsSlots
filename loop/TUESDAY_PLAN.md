# Tuesday plan (2026-09-29): runbook for the next session

To start, say: **"Read CLAUDE.md, then run loop/TUESDAY_PLAN.md."** Work top to bottom. There are two
**STOP** points where the user decides. Don't push to GitHub unless the user says to.

---

## Phase 0: Setup (5 min)
1. Read `CLAUDE.md`, `loop/DIRECTION_NOTES.md`, `loop/BACKLOG.md`, and the last three iterations of `loop/STATE.md`.
2. `npm install && npm test && npx tsc --noEmit -p .`: everything should pass (~142 tests).
3. Record a balance **baseline**:
   - `npm run sim -- --runs 1500 > tools/out/baseline.txt` (`tools/out/` is gitignored);
   - `npx tsx tools/balance/it12p_act3.ts 400 2 commit > tools/out/baseline_act3.txt`.

## Phase 1: Expert review (one playtester agent)
Spawn ONE general-purpose subagent with `loop/PLAYTESTER_BRIEF.md` (the "Tuesday tasks" section). It writes
`playtest/EXPERT_REVIEW.md` containing:
1. A review of `DIRECTION_NOTES.md`: agree or push back, with reasons, on each decision:
   - the charm rework (charms on cells, named-symbol cards, symbol and charm levels, sets removed);
   - ×10 numbers and the pay display;
   - the character meters: MIDAS ×4, BRIAR thorns, JAX all-jackpots, KNIGHT no special;
   - the 3-wild bonus reel, the lightning storm, Act 3 at 5 fights + Dealer;
   - post-boss choices, endless mode.
2. **Post-boss big choices:** about 12 options as sets of 3. Strong options have a real cost, plus one safe pick per set.
3. **KNIGHT:** 3–5 ideas for "simple but exciting with no special mechanic" (the user isn't sold on a sword+shield combo symbol).
4. **Competitor comparison:**
   - Slot or Not, CloverPit, Slotbound, Slot or Die, Slots & Daggers, plus others found.
   - For each: core loop, what reviews praise and complain about.
   - This game's unique hooks, gaps to exploit, risks (e.g. watch-only fights), and 2–3 store pitch lines.
5. A **recommended build order** with rough effort (S/M/L) for each item.

### STOP 1
Give the user a short summary of the review: agreements, pushbacks, the top 3 choices and KNIGHT ideas, the
competitor takeaways. Ask them to confirm or adjust the build order. **Don't write game code before they answer.**

---

## Phase 2: Build (in the order the user confirms; the default order is below)
**Every gameplay step:** tests green; typecheck clean; sim before and after, compared with the baseline; log an
iteration in `loop/STATE.md` with the numbers; commit. Check visuals in a browser if one is available,
otherwise list what the user should eyeball.

### Step A: Quick fixes (S)
- **Rat thief:** a jackpot of the empty (stolen) cells returns ALL stolen symbols, the same as slime's cleanse. Leave slime unchanged.
- **Vampire Fang** also heals on the Overcharge echo.
- **Lightning storm:** 1 special = 1 normal strike. More than one = a storm whose length grows with the log of the
  count (≈1.2 s for 2, ≈2.5 s for 10, ≤4 s for 300+), with a racing damage counter. Presentation only; damage identical.
- **Speeds:** 1x / 2x / 4x / 8x, where the new 1x = half of today's 1x. Keys 1–4. Prefs migrate: old 1 → 2, 2 → 4, 4 → 8.
- **Symbol-swap cards in every direction** (sword↔shield, etc.), in small counts.
- Clearer wording where enemies cut "pay" (RAKE, Counterfeit, Hex); shop text layout pass (SPIKED CHARM title).
- **Remove preps** (counter relics) unless the expert argues for a clear rework. If removed: drop them from all
  pools, the collection, sims and tests.

### Step B: Charm rework + ×10 numbers (L; the core)
- **×10 numbers:**
  - symbol base 10, pair/jackpot multipliers as now;
  - scale all HP, damage, shields, heals, ability powers and specials ×10;
  - UI labels.
- **Charms live on CELLS:**
  - Cards: "N <CHARM> CHARMS · REEL r · <SYMBOL>". They target only uncharmed cells of that symbol, and are
    offered only if enough exist. Charm fit rules stay (keen = swords, charged = bolts, …).
  - New symbols arrive plain.
  - The run state stores counts per (symbol, charm) per reel. Each fight reshuffles the order, as today.
- **Remove FULL SETS entirely**, along with the ribbons, pips, Golden Ticket's set text (rework the Ticket), banners and sim terms.
- **Levels (on the TYPE, so future cells get them too):**
  - **Symbol levels** (Swords Lvl 2: base 10 → 11 per level; confirm the step with the sim);
  - **Charm levels** (Gold Lvl 2 = x3 label, …).
  - Both come from shop and draft cards.
- **Pay math:** group BASE (sum of symbol values) × MULT, where MULT = pair/jackpot multiplier × gold (gold charms
  in one group ADD: x2 + x2 + x2 = x6). Keen adds to base, vamp heals, and so on.
- **Numbers on symbols, payline only:**
  - base value bottom-left (white);
  - charm tag top-right, coloured (gold `x2`, keen `+5` light blue, vamp `+3` red, charged `+1` yellow…);
  - they pop in as each symbol lands;
  - keep the tint/blood art cues.
- **Pay display:** `BASE × MULT = TOTAL` builds up over the payline as it pays (e.g. `30 × 18 = 540!`), no words.
- **One reel table everywhere** (left panel, draft, shop, run over): columns 1 | 2 | 3, one row per symbol+charm pair with counts.
- Relics that interact with each charm type (the expert can propose these).
- **Full rebalance:** rewrite the sim's greedy policy for the new cards; re-tune HP curves, boss formulas and the stake ladder to the baseline targets.

### Step C: Character signature symbols + meters (M each)
- **Framework:** each slot machine has one signature symbol that fills one meter, which triggers one payoff.
  Character-specific upgrades appear only on that character's runs.
- **TESLA:** the lightning bolt special (as today); lightning-only upgrades appear only on TESLA runs.
- **MIDAS:** keeps its starting gold swords. A GOLD BAR symbol fills a meter (~5), then the next payline pays ×4,
  whatever lands (like the Dealer's RAISE). Tune the numbers.
- **BRIAR:** replace spiked shields with a THORN symbol that banks thorns damage (based on its pay). When BRIAR is
  hit, the bank fires at the enemy ONCE per enemy turn, then clears. Relic hooks: shield = 10% of thorns; HP
  sacrifice ×2; "keep 10% after firing" (capped).
- **JESTER JAX:** a signature symbol (design TBD with the user) fills a 10-point meter. Payoff: on the next spin,
  each of the 3 payline cells pays as a jackpot of itself. His symbol during the payoff refills part of the meter.
- **KNIGHT:** no special. Half swords, half shields. Use the expert's "simple but exciting" pick, once the user approves it.
- **3 wilds (everyone):** a small bonus reel pops up and picks one of your jackpot-able symbols (never rock, bomb or
  slimed/disabled cells), and that jackpot pays. During JAX's payoff, a wild cell rolls a random symbol jackpot this way.

### Step D: Act 3 (M)
- 5 fights + the Dealer (like acts 1–2).
- Regular act 3 enemies scale with the player's power (like the bosses' `machinePower`) so they threaten and their
  abilities get seen. Target: meaningful HP loss and a few % deaths per fight.

### Step E: Post-boss big choices (M)
- After each act boss, alongside or instead of the legendary pick: pick 1 of 3 from the expert's list. Strong
  options have a cost; there's always one safe pick.

### Step F: Endless mode (L; after act 3, later)
- More reels and paylines as rewards, exponential scaling, random enemies, new bosses.
- Guard against infinite damage/HP, and format big numbers.

### STOP 2
Summarize what shipped, with before and after balance tables. Ask whether to push. **Push only on the user's word.**

---

## Held (don't do)
- The SLOTS VS. BOTS rename (maybe too robot-themed).
- 16-bit art (stays 8-bit).
- The Gambler character and the chip charm.
- Random-charm cards (later, once players know the charms).
