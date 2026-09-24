# QA_2: re-check after the QA_1 fixes (build after Iteration 15, commit 7bc4851)

Tester: QA agent, 2026-09-24. Scope: check the QA_1 fixes, look for regressions and remaining bugs. No new features are proposed here.

Builds tested:
- **Playtest build:** http://localhost:4173.
- **Public build:** a fresh `npm run build`, served with `vite preview` on :4180. The server is stopped again.

Evidence:
- Screenshots: `playtest/scratch/snaps/qa2-*.png`.
- New harness: `playtest/scratch/qa2_headless.ts`, which checks B2, B11 and the rush pool.
- Reruns: `qa_edges.ts`, `qa_bonus_freq.ts 300`, `it12p_act3.ts 400 2 commit`, `it10_ladder.ts 300`, plus the official sim.

The :4173 prefs and the :4180 save are restored to what they were before testing.

## Verdict

**Yes, it is ready for a public playtest.**

- All three QA_1 blockers are fixed and verified: B1 (double-click abandons the run), B2 (wheel HEAL does nothing) and B3 (slime or bombs on the chase cells).
- **Tests:** 133/133 pass.
- **Stress run:** 300 GOLD act-3 runs with forced bonuses produced 3,343 bonus spins and **0 invariant violations**: no crash, no soft-lock, nothing on a chase cell.
- **Full run by hand:** a KNIGHT run at GREEN with act 3 was clicked through all 16 fights to THE DEALER FOLDS with no problem. It included wheel and rush vouchers, the House, the Mirror, the Dealer, elite spoils, the Cashier and the legendary picks.
- **Saves:** they survive a reload, and damaged saves are repaired on load.
- **Public build:** it has no TUNE panel, no `dbg`, ignores `unlockAll` and saved tuning overrides, and keeps unlocks across a reload.

What is left is one MED edge case (B17: a *third* quick click still abandons the run) and some LOW items. B17 is worth a one-line fix before hosting, but it doesn't block.

## Fix verification

| # | Fix | Result | How it was checked |
|---|-----|--------|-----|
| B1 | NEW RUN or R mid-run needs a second press within 2 s | **PASS** | I used real double-clicks on FIGHT!, FACE THE HOUSE and FACE THE DEALER, on both :4173 and :4180. Each time the run went on and the button showed "SURE? AGAIN". One R press on its own also only arms the button. (See B17 and B19 for the gaps.) |
| B2 | Vouchers pay after the fight's HP settles | **PASS** | `qa2_headless.ts`, 713 won fights: HEAL landed 64 times and was a no-op 0 times; +MAX HP landed 60 times. The 4+1 cases that didn't match the simple formula were all fights with several vouchers, where the extra difference came from the other prizes. HP never went above max. |
| B3 | No slime or bombs on chase cells | **PASS** | `qa_edges.ts` stress: 3,343 bonus spins, invariant violations `{}`. Every bonus spin showed 3 chase symbols on the payline. |
| B4 | Stake picker: "+ ACT 3" on its own row | **PARTIAL** | The "+ ACT 3" line now sits on its own row at every stake, 2 to 5 (qa2-02..05). **Not fixed:** from BLACK up, the BLACK rule line ("…IGNORES YOUR CHIP SHIELD") still runs under the HIGHER button (qa2-03, qa2-05). |
| B5 | The over-screen unlock text wraps and the table moves down | **PASS** | A STAKE 3 unlock after a Dealer win: 2 lines, and the table sits below them (qa2-25). |
| B6 | Prefs are validated on load | **PASS** | Loaded `unlocked:"knight"`, `speed:"fast"`, `stakes.knight:9`, `stakeSel:99`, `act3:"true"`, a bare array, and `unlocked` without knight. Every case gave a playable KNIGHT, speed 1, and stakes clamped to 5 (qa2-26). The only gap is that `juice` values are not type-checked, which is harmless. |
| B7 | TESLA and JOKER unlock text | **PASS** | They read "BEAT THE HOUSE" and "BEAT THE HOUSE WITH WILDS" (qa2-26). |
| B8 | Title text | **PASS** | It reads "12 FIGHTS, 2 BOSSES". |
| B9 | Text overflow | **PARTIAL** | Fixed: the elite line now fits, with about 2 px to spare (qa2-15). Still open: the Dealer preview footnote "FASTER." spills below its panel (qa2-23); the wheel pointer covers "VOUCHER 1 OF n" (qa2-11-crop); and SPIKED CHARM touches the card edges even in the 4-item Cashier (qa2-r2d-03). The RELIC RUSH trigger banner code is unchanged. |
| B10 | SH/TURN sits after the chip count | **PASS** | With 129 and 169 chips, the icon and "+4 SH/TURN" sit clear of the number (qa2-22-crop). |
| B11 | No bonus in the run's final fight | **PASS** | Checked with chase symbols on each boss. In 12-fight runs the House has them and the Mirror doesn't. In act-3 runs the House and Mirror have them and the Dealer doesn't. Live check: the Dealer had 0 chase cells and `dbg.bonus` did nothing. |
| B12 | The recap lists bonus prizes | **PASS** | WHEEL and RUSH prizes show in THEN PICKED (qa2-25). This fix causes the new overlap B20. |
| B13 | The OOZE total ignores chase cells | **PASS** | It reads "OOZE 3/36" (qa2-10). |
| B14 | GRAND shows its chips | **PASS** (1st half) | It reads "…GOLDEN HOURGLASS + GRAND! +15 CHIPS" and fits on screen (qa2-28). **Not fixed:** "YOU OWN EVERY RELIC" still shows when the pool is empty only because of filters (see B18). |
| B15 | (dev-only) `dbg.bonus` drags a frozen reel | not fixed | Still 60/60. Players can't reach it: natural bonuses on frozen or jammed spins are 0. |
| Tune | BONUS rates 2.8% (wheel) / 1.2% (rush) | **PASS** | The effective rate is 2.87–3.03% per spin. Won 12-fight runs get **1.50–2.03 wheels and 0.85–1.17 rushes**, against the 2+1 target. MIDAS and JOKER are lowest at 1.5 wheels because their runs are shorter. |
| Tune | Rush common pool without counter relics | **PASS** | A fresh KNIGHT gets battery, clover, fang, bandage and crown about 12% each, and TWIN REELS 30%. |
| Tune | No HIGH ROLLER after act 1 | **FAIL (edge)** | This is B16 below: a rush won at the House still pays HIGH ROLLER. |
| Tune | Act 1 HP, JOKER 28, TESLA 26 | **PASS** | Numbers are below. |

## New or remaining bugs

| # | Sev | Bug | Repro | Suspected file / fix |
|---|-----|-----|-------|----------------------|
| B16 | LOW-MED | **A RELIC RUSH won at the House can pay HIGH ROLLER**, and that relic is dead from then on because the House is behind you. The crown filter checks `run.act > 1`, but the voucher is paid while `run.act` is still 1 (the act changes after the payout). This happens in 234 of 2,000 rushes at the House (11.7%). I saw it live: the House rush gave "COMMON: HIGH ROLLER" (qa2-r2b-07). | Force a rush in the House fight and win. | `run.ts payVoucher`: also skip `crown` when the fight just won was the House, e.g. `run.act > 1 \|\| run.depth >= actLength(1)`. |
| B17 | MED | **A triple-click (or 3 fast clicks) on FIGHT!, FACE THE HOUSE, MIRROR or DEALER still abandons the run.** Click 1 starts the fight, click 2 arms NEW RUN, click 3 confirms it. CHOOSE YOUR MACHINE then opens with no way back to the run. A player who spam-clicks the bottom centre to hurry the fight can do this. | Real `triple_click` on FACE THE HOUSE → the machine picker opens (qa2-20). | `game.ts newRunPressed`: ignore the confirming press for about 400 ms after arming, or ignore NEW RUN for about 500 ms after a screen closes into a fight. |
| B18 | LOW | "YOU OWN EVERY RELIC: +10 CHIPS" shows when the pool is empty only because of the build and crown filters. For example, in act 2 when every relic except HIGH ROLLER is owned. It is very rare. | `qa2_headless.ts`, last line. | `runScreens.ts drawRush`: use "NO RELIC LEFT FOR YOU". |
| B19 | LOW | Pressing R on a between-fight screen (draft, Cashier, preview) arms the abandon **with no visible feedback**. NEW RUN is hidden there, so "SURE? AGAIN" never shows; there is only the fizzle sound. A second R within 2 s abandons the run. | Press R on the draft screen, then R again (qa2-30). | `game.ts`: show a short "PRESS R AGAIN TO ABANDON" banner, or ignore R while screens are open. |
| B20 | LOW (regression from B12) | On the over screen, the longer THEN PICKED text (now with the "WHEEL:" and "RUSH:" labels) runs under the ACT 1 / ACT 2 / ACT 3 tags, and the 40-character cut "…OVE..." touches the panel's right border. | Win a 16-fight run with vouchers (qa2-25). | `runScreens.ts drawOver`: cut at about 34 characters, or move the act tags left of the column. |
| B21 | LOW | The "SURE? AGAIN" label fills the 196 px NEW RUN button edge to edge, so the S and N touch the border (qa2-08-crop). | Press NEW RUN mid-fight. | Use "SURE?" or a textScale of 2.5 while armed. |
| B22 | cosmetic | In the fight HUD, "STAKE n NAME" and the "RELICS" header nearly touch (qa2-22-crop). | Any stake ≥1 run. | `game.ts drawRelics` y offsets. |

Checked and working:

- Unlocks, stakes, act3 and dealerBeaten persist across a reload on both builds.
- There is no mid-run save, as intended.
- COLLECT and the draft cards are safe to double-click.
- Several vouchers in one fight still queue.
- Mirror vouchers pay in 16-fight runs.
- After a voucher, the screen order is still correct: legendary pick, then draft, then Cashier.

## Balance numbers (after Iteration 15)

**Official sim** (`npm run sim -- --runs 1000`):

| Machine | Greedy run win % | Random run win % | Act 1 clear % (greedy) |
|---|---|---|---|
| knight | 26.2 | 15.5 | 46.6 |
| midas | 27.9 | 17.4 | 50.1 |
| thorn | 23.5 | 17.9 | 44.7 |
| tesla | 22.1 | 15.7 | 43.0 |
| joker | 24.0 | 18.4 | 50.6 |

- House win 72–86%, Mirror win 57–62%.
- Knight stake ladder: 26.2 / 23.1 / 21.3 / 16.8 / 12.3 / 9.7.
- Act 3 at GREEN: Dealer win 68–75%.

**Commit ladder** (`it10_ladder.ts 300`), run win % by stake 0..5:

| Machine | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| knight | 35.3 | 27.7 | 25.3 | 22.0 | 20.0 | 14.0 |
| midas | 35.0 | 28.0 | 25.0 | 22.3 | 21.7 | 15.7 |
| thorn | 32.0 | 29.3 | 26.3 | 19.0 | 14.3 | 9.3 |
| tesla | 31.3 | 23.7 | 23.0 | 22.7 | 21.3 | 16.0 |
| joker | 32.7 | 28.0 | 24.3 | 22.0 | 16.7 | – |

- JOKER is no longer the lowest machine.

**Act 3** (`it12p_act3.ts 400 2 commit`):

| Machine | Dealer win % |
|---|---|
| knight | 54.1 |
| midas | 70.6 |
| thorn | 64.2 |
| tesla | 62.1 |
| joker | 61.8 |

- Dealer win 62.7% overall; full-run win 15.4%.
- HP into the Dealer 92%; 91.5% of act-3 deaths happen at the Dealer.

## Remaining tuning notes (numbers only)

1. **Dealer spread is 16.5 pts** (MIDAS 70.6 vs KNIGHT 54.1). It was 15 in QA_1 and has moved the wrong way. MIDAS arrives with the most HP (96%) and the Dealer takes longer to kill it. Try MIDAS act-3 chip income −1, or KNIGHT +2 act-3 max HP. Aim for a spread under 12.
2. **THORN's BLACK step is still the steepest:** −7.3 (House 77.8 → 58.1). THORN at GOLD, 9.3%, is the lowest cell on the ladder. The BLACK House bombs hurt spike builds most (1.6 blasts per House fight). A House HP −2 at BLACK for THORN only would be a data-driven, per-machine fix; otherwise leave it.
3. **The RED step for KNIGHT and TESLA is −7.7**, which is bigger than GREEN, BLACK or BLUE. That is mainly the Mirror losing about 10 points from scars. It is fine if RED is meant as the "real game starts" step.
4. **Bonus frequency** is on target for KNIGHT and THORN (about 2 wheels + 1 rush in won runs). MIDAS and JOKER are at about 1.5 + 0.87 because their runs are shorter. Accept it; no change.
5. **TWIN REELS is 30% of fresh-KNIGHT rushes**, because it is the only uncommon without a build requirement. That is unchanged from QA_1. It is fine as long as it isn't a trap pick.
