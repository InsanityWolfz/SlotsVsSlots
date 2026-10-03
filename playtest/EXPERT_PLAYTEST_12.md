# EXPERT PLAYTEST 12: likes and dislikes (2026-10-03)

Build: `5224f4e` (iteration 68: the EXPERT_PLAYTEST_11 plan, built). I didn't edit `src/` or `tests/`.

## What I ran

**Throwaway harnesses** (all under `tools/balance/`, prefix `e12_`; `src/` and `tests/` untouched):
- `e12_patch.ts`: runtime prototypes from env vars.
  - SIGC: a new charm (id `sig`) for one machine, on its listed symbols; when the cell lands on the payline it adds its
    value to that machine's meter (BRIAR: banked thorns; JOKER: meter; MIDAS: vault pips). SIGV is the bot's card value,
    SIGFAV makes it the favoured charm.
  - FAV (favours override), BMUL (BOSS_MUL override), CHOICE (the bot always takes that big choice when offered),
    FORGEFIX (approximates #3: a dead ARMS RACE / MASTERWORK taken with every symbol maxed is refunded the next fight).
    SWEEP (SWEEP UP reworks) exists but wasn't needed (D3).
- `e12_rows.ts`: per machine, the rows (GREEN, seed 777, no start relic), official-style W/G (seed 4242, N×2), the
  no-charms drafter W/G, act-2 turns per fight, and how often a run ends holding the new charm.
- `e12_briar.ts`: end-of-run builds, greedy vs the no-charms drafter (what the bot buys instead of charms).
- `e12_tuesday.ts`: the official tuesday table under the patches.
- `e12_sweep.ts`: THE SURGERY forced, win% of the runs that took each pick. `e12_maxed.ts`: how often every symbol is
  maxed when a boss falls. `e12_weekly.ts`: each week vs its machine's plain run. `e12_weekly2.ts`: the weekly's setup mix
  over 520 weeks (now vs a uniform pick), and MARKED DECK setups.
- `e12_ui.cjs` (Playwright): sets up a BRIAR run with 5 relics and charm levels, then hovers every relic spot on NEXT,
  DRAFT, SHOP and the fight HUD; shoots level cards; rolls all four big-choice sets with every type maxed.

**Runs:**
- `npm test` 217/217; `npx tsc --noEmit -p .` clean (including the e12 files).
- `tuesday.ts 1000` (baseline): reproduces STATE 68 exactly (below).
- `e11_rows.ts 300` (baseline charm rows): baseline 10.2, none 10.9, VAMP 16.1, GOLD 12.9, LUCKY 12.4, KEEN 8.7.
- THORNY ×4 values + a favours control, TRICK ×3, INGOT ×4 (`e12_rows.ts 300`); `e12_briar.ts 400` ×2.
- `e12_tuesday.ts 1000`: BRIAR dealer 1.4 / 1.45; THORNY alone / + mirror 12 / + dealer 1.4 + mirror 12; JOKER TRICK
  alone / + mirror 3.5 / + mirror 3.5 + act3 0.5; FORGEFIX on KNIGHT and MIDAS; the full plan; the full plan + the bot
  always taking SWEEP UP.
- `e12_sweep.ts 300` and `600` (SURGERY forced), `e12_maxed.ts 300`, `e12_weekly.ts 200 26`, `e12_weekly2.ts 200`.

**Visual** (Playwright, 1280×720, vite on :5182): `e12_ui.cjs` (NEXT, DRAFT, SHOP, level cards, the fight HUD, 4 tooltip
hovers each, big-choice rolls with everything maxed). No page errors.

**Baseline, tuesday 1000:** WHITE 43.5 / GREEN 17.8: KNIGHT 41.3/17.6, TESLA 47.3/16.6, BRIAR 47.5/20.2, JOKER 42.2/17.3,
MIDAS 39.1/17.1; Dealer kill 48.7 (JOKER 44.7). Big choices taken: CLEAN CUT 2671, GLASS CANNON 2514, SOLID GOLD 1709,
ARMS RACE 1575, MASTERWORK 1056, MELT 902, **SWEEP UP 63**; POLISH, WHETSTONE, SECOND WIND, TWIN REEL, BLOOD PACT never.

## 1. LIKES (protect these)

- **L1. Round 11 landed exactly as measured.** `tuesday.ts 1000` reproduces STATE iteration 68 to the digit:
  WHITE 43.5 / GREEN 17.8; KNIGHT 41.3/17.6, TESLA 47.3/16.6, BRIAR 47.5/20.2, JOKER 42.2/17.3, MIDAS 39.1/17.1;
  Dealer kill 48.7. The GREEN spread is 16.6–20.2 (was 14.9–18.8).
- **L2. Relic tooltips work everywhere I hovered** (`e12_ui.cjs`: 5 relics on NEXT, DRAFT, SHOP and the fight HUD; every
  spot registered and drew).
  - They use the machine's own text: on BRIAR, JACKPOT BELL reads "JACKPOTS PAY X2 AND ADD THEIR PAY TO YOUR THORNS".
  - The box is solid (outline + panel), drawn last, and clamped on screen. ROSE HIP in the shop sits over YOUR REELS,
    CACTUS in the HUD sits over the player's HP bar. Both are hover-only, so that's fine.
  - The shop now shows the relics you hold, which is the most useful place for them (buying is where synergy matters).
- **L3. Charm levels are finally visible.** YOUR REELS (next, draft, shop, and the fight's side panel) ends with a badge
  line per type: thorn MAX, sword LV2, vamp MAX (in vamp red), gold LV2, keen LV1. MAX is orange and reads at a glance.
- **L4. Level cards say what they do.** A gold LV2 → LV3 card reads "GOLD LV3 MAX / ALL GOLD: X4 PAY, GOLD STACKS";
  swords LV2 → LV3 reads "SWORDS LV3 MAX / EVERY SWORD IS WORTH 18". The numbers match the rules (gold LV3 = ×4,
  sword LV3 = 18). No hints, just the rule.
- **L5. The short charm text is much better.** "3 VAMP CHARMS / REEL 2 SWORDS: HEAL 40 ON A HIT", "3 GOLD CHARMS /
  REEL 3 SHIELDS: X3 PAY, GOLD STACKS": one line of where, one of what, no shrink-to-fit on any card I saw.
- **L6. POLISH and WHETSTONE fall back correctly.** With every charm and symbol at LV3, THE FORGE rolls ARMS RACE /
  MASTERWORK / **SECOND WIND** and THE MELT rolls MELT IT DOWN / SOLID GOLD / **SECOND WIND**. (But see D5: the
  other two FORGE cards don't.)
- **L7. Stability:** `npm test` 217/217, tsc clean (including the e12 files), no page errors in the browser session.

## 2. DISLIKES (ranked)

### D1. BRIAR's charms are still a trap, and it's because no charm touches a thorn. **HIGH** (balance + design; the held content round)

- **The numbers** (`e12_rows.ts 300 thorn`, official-style; no-charms drafter in brackets):
  BRIAR greedy 49.3 / 21.2 vs **no charms 58.0 / 29.7**. Every other machine is better *with* charms
  (rows: KNIGHT 8.0 vs 6.3 none, JOKER 9.3 vs 8.3, MIDAS 13.0 vs 7.7).
- **What the no-charms drafter buys instead** (`e12_briar.ts 400`, GREEN, end-of-run builds):

  | | G | thorns | thorn LV | sword LV | max HP | relics | charm cells |
  |---|---|---|---|---|---|---|---|
  | greedy | 20.5 | 18.6 | 2.1 | 2.3 | 320 | **6.6** | 14.3 |
  | no charms | 32.8 | 18.4 | 2.5 | 2.6 | 341 | **9.7** | 3.6 |

  - Same thorn count. The difference is **3 more relics**, a level more here and there, and 21 max HP.
  - BRIAR's damage is thorns, and charms only fit swords, shields and bolts. So a charm card on BRIAR buys a bonus on its
    *secondary* symbols, at the price of a relic (BRIAR's relics are thorn relics: CACTUS, ROSE HIP, the Bell's thorns).
  - That's a real trap for a human too: a 10-chip charm and a 12-chip relic look equally good on the shelf.
- **Prototype: THORNY**, BRIAR's own charm (`SIGC`): on a thorn; *when it lands on your payline it banks +N into your
  thorns*. A fixed rate (round 11's rule: never a multiplier or a heal on a meter symbol).

  | THORNY (LV1/2/3) | BRIAR W / G | no-charms W / G | act-2 turns/fight | only-THORNY row (none 21–22) |
  |---|---|---|---|---|
  | none (now) | 49.3 / 21.2 | 58.0 / 29.7 | 17.4 | – |
  | 10 / 15 / 20 | 45.2 / 18.0 | 54.0 / 31.8 | 17.1 | 16.3 (a new trap: too weak) |
  | **20 / 30 / 40** | **51.0 / 21.2** | **53.7 / 31.5** | **16.3** | 18.3 |
  | 30 / 45 / 60 | 54.7 / 24.5 | 54.2 / 32.0 | 15.3 | 19.3 |
  | 40 / 60 / 80 | 58.7 / 25.0 | 54.3 / 32.2 | 14.3 | 24.3 |
  | (control) favours none instead of VAMP | 43.0 / 18.8 | 54.2 / 33.7 | 16.8 | – |

  - **20/30/40 closes most of the WHITE trap** (no-charms lead 8.7 → 2.7) and BRIAR, the slowest machine, gets a turn
    faster per act-2 fight. 86% of greedy runs end holding it, so it gets picked.
  - **The GREEN gap doesn't close at any value** (8.5 → 10–13): even at 30/45/60 the greedy run still ends with 6.6 relics
    vs 9.6. That part is the chip economy in act 3 (two charm slots per shop at 10 chips), not charm strength. I'd accept it:
    the no-charms drafter is a sim policy, and BRIAR is still the strongest GREEN machine.
  - Removing BRIAR's VAMP favour (round 11's cheap idea) makes it **worse** (43.0 / 18.8): rejected.
- **Official tuesday 1000, BRIAR:** THORNY 20/30/40 alone 49.4 / 19.6 (Dealer 46.6). With **BRIAR mirror 10.5 → 12**:
  **46.7 / 19.2**, act-2 turns 17.7 → **16.5**, act-3 regular turns 15.6 → **14.8**, Dealer kill 46.0.
- **JOKER (TRICK) and MIDAS (INGOT): measured, and I'd hold both.** Neither machine has the trap, and each charm moves
  its machine more than it fixes anything:

  | prototype | W / G before → after | note |
  |---|---|---|
  | JOKER TRICK: on a sword or shield, +10/15/20 meter when it lands | tuesday 42.2 / 17.3 → **45.5 / 18.5** | reach Dealer 38.7 → 43.9, Dealer kill 44.7 → 42.1 |
  | JOKER TRICK 20/30/40 | 44.2 / 17.7 → 50.5 / 19.3 (rows) | too strong |
  | MIDAS INGOT: on a gold bar, +1/1/2 vault pips | 37.2 / 19.0 → **33.0 / 17.7** | a trap: it displaces VAMP, MIDAS's only sustain |
  | MIDAS INGOT +1/2/2 pips | 37.2 / 19.0 → **43.2 / 22.5** | Dealer kill 58: too strong |
  | MIDAS INGOT +1/2/3 pips | → 42.5 / 24.7 | Dealer 61 |
  | MIDAS INGOT on swords/shields | → 34.8 / 15.5 | a trap |

  - MIDAS's vault is pip-quantised, so there's no setting between "trap" and "+6 WHITE". That's round 11's VAMP lesson
    again: on MIDAS, anything that competes with VAMP for a pick is either worse or much better.
  - KNIGHT (BULWARK) and TESLA (CHARGED, BLAZE) already have a charm of their own.
- **Push back on "one per machine":** only BRIAR needs one. Ship THORNY; keep TRICK as an optional content card if the
  user wants JOKER to have one too (measured: TRICK 10/15/20 + JOKER mirror 2.8 → 3.5 is **41.7 / 16.9**, Dealer kill 41.2,
  vs 42.2 / 17.3 now; adding act3 0.35 → 0.5 overshoots to 41.7 / 14.6).

### D2. The weekly now lands on the same two setups almost half the time. **MED** (design; a side effect of round 11 #9)

- **The cause:** a blocked setup falls through to *the next one along*, and with the "any of its edges" rule most setups
  are blocked for most machines (BRIAR's challenge uses HIGH ROLLERS + GLASS JAW + FAST HANDS; KNIGHT's use FAST HANDS
  and HOUSE CUT). So the setups after a blocked run soak up its weeks.
- **Measured over 520 weeks** (`e12_weekly2.ts`): only **12** of 30 machine × setup pairs ever appear, and two of them take
  **43%** of weeks: BRIAR + HOUSE CUT **23%**, KNIGHT + HIGH ROLLERS, 0 chips **20%**. FAST HANDS + HIGH ROLLERS never appears.
  In the next 26 weeks (W30–55), KNIGHT + HIGH ROLLERS 0 chips is the weekly **7 times**.
- **The 15% mean isn't the problem.** Each week vs its own machine's plain WHITE run (random drafting, `e12_weekly.ts
  200 26`): 15.0 vs 28.9 (×0.52). By setup: HIGH ROLLERS 0 chips ×0.54, GLASS JAW 0 chips ×0.54, HOUSE CUT ×0.47,
  FAST HANDS 0 chips ×0.71. That's a fair weekly. The 20 → 15 fall is mostly the mix (more HOUSE CUT and HIGH ROLLERS weeks).
- **Rejected: adding MARKED DECK setups.** 3 marks per reel every fight is brutal outside endless: ×0.08 KNIGHT, ×0.14 TESLA,
  ×0.11 BRIAR, ×0.10 JOKER, ×0.30 MIDAS (MARKED + FAST HANDS ×0.02–0.15).
- **Proposal:** keep the rule, change the pick: the week's machine, then a setup chosen *uniformly among the ones allowed
  for it* (`seed % allowed.length`), not "the next one along". Then the most common weekly is BRIAR + HOUSE CUT at 20%
  (BRIAR has only one allowed setup), every other pair 5–10%, and KNIGHT + HIGH ROLLERS 0 chips falls 20% → 10%.

### D3. SWEEP UP isn't dead: the bot is wrong about it. **MED** (sim + design; push back on reworking it)

- **Forced pick** (`e12_sweep.ts 600`, GREEN, all machines; the same 918 runs that were offered THE SURGERY, win% after taking):

  | SURGERY pick | won | KNIGHT | TESLA | BRIAR | JOKER | MIDAS |
  |---|---|---|---|---|---|---|
  | CLEAN CUT | 24.8 | 24.4 | 17.7 | 30.2 | 23.0 | 28.4 |
  | TWIN REEL | 26.1 | 34.3 | 15.1 | 28.6 | 23.0 | 29.9 |
  | **SWEEP UP** | **28.6** | 28.5 | 19.4 | 29.1 | 33.3 | 33.0 |

  - SWEEP UP is the *best* SURGERY pick on average (+3.8 over CLEAN CUT), and best on three machines.
  - The 0.6% pick rate is the bot: `choiceValue` gives it 3 + (1 − HP) × 4 + rocks (about 3–5) vs CLEAN CUT's 6.5, so the
    greedy bot almost never takes it. Its 100 heal (or +50 max HP at full) before act 2/3 is worth more than a reel surgery.
- **Proposal: don't rework SWEEP UP.** Fix the bot (`simulateRun.ts choiceValue`: `sweepUp` ≈ 6.5 + (1 − HP) × 4 + rocks)
  so the official table includes players who take it. The safe pick doing its job is the design working.
- **Text:** the card leads with the part that's usually empty ("SMASH EVERY ROCK ON YOUR REELS AND HEAL 100"). Lead with
  the guaranteed part: "HEAL 100 AND SMASH EVERY ROCK ON YOUR REELS" (and "+50 MAX HP AND SMASH EVERY ROCK" at full).

### D4. BRIAR GREEN 20.2 held. **MED** (balance; the round-11 watch item)

- tuesday 1000: BRIAR 20.2 (seed-shifted 21.2 in the rows harness), so it holds above the 19 top of the GREEN band.
- It isn't the Dealer (kill 50.2, normal). BRIAR reaches the Dealer more (40.2% vs 34–39), so the honest fix is earlier,
  but act 3 is already its slowest stretch (15.6 turns per regular).
- **Measured (tuesday 1000, BRIAR):** dealer 1.3 → 1.4: **19.4** (Dealer kill 48.3; WHITE unchanged 47.5);
  1.45: 18.1 (kill 45.0).
- **If D1 ships, this is folded in:** THORNY + mirror 12 is 46.7 / 19.2 with dealer unchanged. Without D1, dealer 1.4.

### D5. THE FORGE can still offer two dead cards. **LOW** (bug)

- With every symbol at LV3, `rollChoices` falls WHETSTONE back to SECOND WIND (L6), but **MASTERWORK still targets a maxed
  symbol** ("+2 LEVELS TO YOUR SWORDS", which does nothing, *and* locks your other symbols) and **ARMS RACE is pure cost**
  (−60 max HP, no level can rise). Browser: all-maxed BRIAR rolls "armsRace, masterwork:sword, secondWind".
- **How often** (`e12_maxed.ts 300`, GREEN, every symbol at the cap when the boss falls): **KNIGHT 18.7%**, **MIDAS 17.8%**,
  BRIAR 0.5, JOKER 1.3, TESLA 0. KNIGHT starts at LV2, so it maxes early. THE FORGE is 1 set in 4, so about 4–5% of
  KNIGHT and MIDAS boss choices are a FORGE with two dead cards.
- The greedy bot takes ARMS RACE there (value 8), so the official KNIGHT/MIDAS numbers carry the loss.
- **Proposal:** `offerChoices` skips THE FORGE when no symbol is below the cap (as THE MELT already needs a charm).

### D6. Small things. **LOW** (UX)

- **The badge line is the smallest text on the screen.** "MAX" / "LV2" under YOUR REELS is drawn at text scale 1 (the
  table above is 1.5). It reads, but only up close; on the fight's side panel it's 6 px tall. Try 1.25 if `maxH` allows.
- **The fight-HUD tooltip covers your HP bar** (it's drawn at x + 186, over the BRIAR panel). Hover-only, so fine, but
  anchoring it under the RELICS box would keep HP visible while you read.
- **KEEN is still the weakest charm** (rows avg 8.7 vs baseline 10.2; MIDAS 5.0). No change proposed this round; it's
  the next candidate for a value bump (KNIGHT's sword charm).
- **JOKER's Dealer kill 44.7** is the lowest, but JOKER reaches the Dealer the most (38.7%) and its GREEN is in band (17.3).
  That's a shape, not a problem: no change.

## 3. Round 11 fixes: landed or not

| # | Agreed fix | Status | Evidence |
|---|---|---|---|
| 1 | JACKPOT BELL doesn't refill JOKER's meter on a payoff | **Landed** | STATE 68: JOKER + BELL 63.3 → 31.7 (not re-run here) |
| 2 | VAMP ×1 on one-cell jackpots | **Landed** | rows: only VAMP 16.1 vs 10.2 baseline; JOKER 16.3 vs 9.3 (+7, the plan said +7). MIDAS +10.7 is what's left (accepted in round 11) |
| 3 | JOKER boss HP (dealer 0.75, act3 0.35, mirror 2.8) | **Landed; watch** | tuesday: JOKER 42.2 / 17.3. Dealer kill **44.7**, the lowest (D4) |
| 4 | MIDAS dealer 0.9 + act-3 floor 0.75 | **Landed** | MIDAS GREEN 14.9 → **17.1**, reach Dealer 35.0, act-3 regular deaths 5.9 |
| 5 | REPO MAN HP; fight-4 gate 3–6% | Landed | STATE: 3.8% (not re-run) |
| 6 | TOLL BOOTH +2 per lien | **Landed** | STATE: +TOLL 14.8 (relic band 12–15) |
| 7 | Signature-symbol charms held for a content round | **Done this round** | D1: THORNY / TRICK / INGOT prototypes |
| 9 | Weekly: never a challenge's machine plus any of its edges | **Landed, with a side effect** | The fall-through piles weeks onto two setups (D2) |
| 10 | WHETSTONE BELT text, REPO MAN subtitle | Landed | Per STATE (not re-shot) |
| 67b | Relic tooltips, LV/MAX badges, LV3 MAX cards, short charm text, no maxed big-choice targets | **Landed** (L2–L6) | Browser; one gap left in THE FORGE (D5) |

## 4. PROPOSED PLAN

Measured stacked on the real code via runtime patches (`e12_patch.ts`). Build in this order and re-measure.

| # | Change | Where | Before → after (measured) |
|---|---|---|---|
| **1** | **THORNY, BRIAR's own charm:** on a thorn; when it lands on your payline it banks +20 / 30 / 40 into your thorns (LV1/2/3; 50 with the Ticket). BRIAR only, offered like any act-1 charm (favours stay VAMP). Card: "REEL 2 THORNS: +20 TO YOUR THORNS WHEN IT LANDS" | `config.ts Enh`, `charms.ts`, `run.ts` (a BRIAR_ONLY set like KNIGHT_ONLY), `fight.ts` (fill on resolve), `simulateRun.ts` (bot value 8), art: a thorn charm tag | BRIAR W/G (rows) 49.3/21.2 → 51.0/21.2; **no-charms lead in WHITE 8.7 → 2.7**; act-2 turns 17.4 → 16.3 |
| **2** | **BRIAR mirror 10.5 → 12** (pays for #1) | `BOSS_MUL.thorn.mirror` | tuesday BRIAR 47.5 / 20.2 → **46.7 / 19.2**; act-2 turns 17.7 → **16.5**, act-3 regulars 15.6 → **14.8**; Dealer kill 46.0. Also closes the BRIAR GREEN watch item (D4) |
| 3 | **THE FORGE isn't offered when every symbol is at the cap** (MASTERWORK/ARMS RACE would be dead) | `run.ts offerChoices` (like THE MELT's charm check) | Affects 18.7% of KNIGHT and 17.8% of MIDAS boss choices (×¼ for THE FORGE). KNIGHT G 17.6 → 17.8 (refund approximation) |
| 4 | **Weekly: pick uniformly among the allowed setups for the week's machine** (not "the next one along") | `meta.ts weekly()` | Top two pairs 43% of weeks → 30% (BRIAR + HOUSE CUT 23 → 20%, KNIGHT + HIGH ROLLERS 0 chips 20 → 10%); the mean stays ≈ ×0.52 of plain |
| 5 | **SWEEP UP: no rework.** Text leads with the sure part: "HEAL 100 AND SMASH EVERY ROCK ON YOUR REELS" | `run.ts describeChoice` | Forced SURGERY: SWEEP UP 28.6 vs CLEAN CUT 24.8, TWIN REEL 26.1 (918 runs) |
| 6 | **The bot values SWEEP UP honestly** (`choiceValue.sweepUp` ≈ 6.5 + (1 − HP) × 4 + rocks). A sim change: do it as its own step, re-baseline after | `simulateRun.ts` | Upper bound (bot *always* takes it), on top of #1–#3: GREEN **17.6 → 19.0** (KNIGHT 19.0, TESLA 16.3, BRIAR 20.2, JOKER 20.0, MIDAS 19.3), WHITE 43.3 → 43.8. If BRIAR holds ≥ 20 after the real fix: BRIAR dealer 1.3 → 1.4 (measured −0.8) |
| 7 | Badge line under YOUR REELS at text 1.25; the HUD relic tip anchored under the RELICS box (keeps HP visible) | `reelTable.ts`, `game.ts drawRelicTooltip` | Screens (`screens.cjs` + `e12_ui.cjs`) |
| – | **Hold:** JOKER TRICK (+10/15/20 meter on a sword/shield landing) and MIDAS INGOT (vault pips on a gold bar). Neither machine is trapped by charms, and both move their machine more than they fix | – | TRICK 42.2/17.3 → 45.5/18.5 (with mirror 3.5: 41.7/16.9, Dealer 41.2). INGOT 1/1/2 pips 37.2/19.0 → 33.0/17.7; 1/2/2 → 43.2/22.5 |
| – | **Rejected:** BRIAR favours none (43.0/18.8, worse); MARKED DECK weekly setups (×0.02–0.30) | – | – |

**Official table, current → plan #1–#3, tuesday 1000** (`e12_tuesday.ts`):

| machine | WHITE | GREEN | Dealer kill |
|---|---|---|---|
| KNIGHT | 41.3 → 41.3 | 17.6 → 17.8 | 51.0 → 50.9 |
| TESLA | 47.3 → 47.3 | 16.6 → 16.6 | 48.5 → 48.5 |
| BRIAR | 47.5 → **46.7** | **20.2 → 19.2** | 50.2 → 46.0 |
| JOKER | 42.2 → 42.2 | 17.3 → 17.3 | 44.7 → 44.7 |
| MIDAS | 39.1 → 39.1 | 17.1 → 17.1 | 48.9 → 49.0 |
| **AVG** | **43.5 → 43.3** (gate 41–45) | **17.8 → 17.6** (gate 16–19) | 48.7 → 47.8 |

- The GREEN spread narrows from 16.6–20.2 to 16.6–19.2; every machine is inside the band.
- BRIAR's Dealer kill falls to 46.0 because THORNY makes it reach the Dealer more (41.7 vs 40.2) with a charm slot that
  doesn't help against it. Watch it; it's inside the 44–51 range the others span.
- Not measured: fight-4 deaths (THORNY changes BRIAR's REPO MAN fight a little; re-run `e11_a4.ts` after the build), and
  the REPO MAN taking a THORNY cell (liens are generic, so it should just work: add a test).

**Not now:** TRICK / INGOT, KEEN (8.7, the next charm to look at), pacing beyond BRIAR.

## AGREED PLAN (2026-10-03), as built
Built: #1 THORNY, #3 THE FORGE skip, #4 weekly, #5 SWEEP UP text, #7 badges + HUD tip. #6 (the bot's SWEEP UP value) is the next step.
**Changed in the build:** the prototype's charm read **LV4 (+50) from the start**. `Object.prototype.sig = 8` also answered
`levels.charm.sig`, so it was never offered a level card. At the real +20/30/40, BRIAR measured 42.1/14.6 with
mirror 12. Shipped at **+50/60/70** (80 with the Ticket), with **BRIAR mirror kept at 10.5** (#2 dropped).
Numbers are in STATE iteration 69.
