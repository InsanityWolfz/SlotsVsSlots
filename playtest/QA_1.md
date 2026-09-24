# QA_1: public playtest readiness check (build after Iteration 14)

Tester: QA agent, 2026-09-24. Scope: bugs, balance and feel of what exists. No new features are proposed here.
Build: http://localhost:4173 (playtest build, commit 8552943) plus a fresh `npm run build` served with `vite preview` on :4180.
Evidence: `playtest/scratch/snaps/qa-*.png`. Harnesses: `playtest/scratch/qa_bonus_freq.ts`, `qa_bonus_value.ts`, `qa_edges.ts` and `qa_wheel_heal.ts`.

## Verdict

**Not ready as-is. It will be ready once the three fixes below are in (each is a few lines).**

1. **B1:** A double-click on FIGHT! (or on FACE THE HOUSE / MIRROR / DEALER) throws the run away.
2. **B2:** A BONUS WHEEL HEAL does nothing.
3. **B3:** Slime can cover the BONUS/RELIC symbols, so the trigger spin shows slime.

Everything else is either polish (text overlaps) or tuning.

What already holds up:

- **Tests:** 133/133 pass.
- **No crashes or soft-locks:** 300 GOLD-stake act-3 runs ran under a stress bonus rate with no crash, soft-lock or bad chase-cell count. That includes 337 Dealer bonuses, 99 of them right after a SHUFFLE or CUT.
- **Screen flow:** Full runs for acts 1, 2 and 3 clicked through cleanly. That covers the slot machine pick, stake picker, forks, vouchers (up to 3 in one fight), wheel and rush payouts, elite spoils, the Cashier, the legendary pick, the ACT 3 arrival, the over screen and the TRUE ENDING.
- **Saves:** Unlocks, stakes, the act-3 unlock and dealerBeaten all survive a reload.
- **Public build:** It has no TUNE panel, no `dbg` and no dev unlocks, and it plays.

## Bugs

| # | Sev | Bug | Repro | Suspected cause / file |
|---|-----|-----|-------|------------------------|
| B1 | **HIGH** | Double-clicking the preview's single fight button (FIGHT! / FACE THE HOUSE / MIRROR / DEALER) opens CHOOSE YOUR MACHINE, so the run is lost. There is no confirmation. The `R` key does the same at any time. | Open any fight preview and double-click FIGHT!. The second click lands on NEW RUN. | `game.ts` `startBtn` (NEW RUN, at W/2+10,648, 196x56) sits under `showNext`'s button (W/2,640, 290x64) and stays visible during run fights. The 250 ms guard only covers screens *opening*, not the screen closing into a fight. |
| B2 | **MED** | A wheel **HEAL** has no effect, and a wheel **+4 MAX HP** loses its +4 current HP. In act 3 (no post-fight heal) the heal is the prize that matters most. | `qa_wheel_heal.ts`: HEAL landed 40 times and had no effect 39 times. +MAX HP lost its current-HP part 42/42 times. | `run.ts finishFight`: `payVoucher` (l.542) heals the stale pre-fight `run.player.hp`. Then l.576-580 set `run.player.hp` from the fight's `p.hp` + heal. `wheelOptions` (l.246) also decides whether to offer HEAL from the stale HP. |
| B3 | **MED** | Slime and bombs land on the chase cells. The trigger spin then shows SLIME on the payline instead of three BONUS/RELIC symbols (the banner and voucher still fire). Bombs on chase cells can never be defused, because those cells never land, so they always blast. | `qa_edges.ts` stress run: 262 of 3,625 bonus spins (7%) had slime on the line, and chase cells carried bombs. | `fight.ts` `applySlime` (l.1000) and `plantBombs` (l.770) don't exclude `BONUS_SYMBOLS`. Marks and steals are safe because they need value > 0. |
| B4 | MED | Stake picker overlap once act 3 is unlocked. "+ ACT 3: THE DEALER (16 FIGHTS)" prints on top of the title ("STAKE 2: GREE…"). At stake 3 and up, the BLACK rule line runs under the HIGHER button. | Set stakes ≥2 with act3 on, then open the picker (qa-24-picker-stake2/4). | `runScreens.ts` drawCabinets, in the picker block. |
| B5 | MED | The unlock line on the over screen is clipped and overlaps. On a GREEN win, the "…ACT 3 UNLOCKED: FROM NOW ON, GREEN+ RUNS FACE THE" line is cut before "DEALER". Any stake unlock pushes the 2nd line onto the FIGHT/ROUNDS/HP headers. | Win any run that unlocks a stake (qa-19, qa-25). | `runScreens.ts` drawOver: the table header doesn't move down with the unlock line. |
| B6 | LOW-MED | Save data isn't validated. With `unlocked:"knight"` (a string), **every** slot machine shows LOCKED, including KNIGHT, so no run can start. `speed:"fast"` gives a NaN clock and fights resolve invisibly. `stakes.knight:9` shows a "9" chip. (Unparseable JSON just resets to defaults, which is fine.) | Garble `slotvslot.prefs.v2` and reload (qa-22, qa-23). | `game.ts` constructor l.146-158 uses `??` only. |
| B7 | LOW | Wrong unlock text. TESLA says "WIN A RUN" and JOKER says "WIN A RUN WITH WILDS", but both unlock on **beating the House**. I got both after losing to the Mirror. | Lose at the Mirror on a fresh save. | `cabinets.ts` l.91/110 vs `game.ts checkUnlocks` (`beatHouse`). |
| B8 | LOW | The title says "5 FIGHTS + A BOSS", but runs are 12 fights (16 with act 3). | Title screen. | Title gutter text. |
| B9 | LOW | Text overflow in several places: <br>• elite fork line "+2 CHIPS" runs past the card border (qa-11-fork-full) <br>• in the 5-item Cashier, "SPIKED CHARM"/"KEEN CHARM" touch the card edges (qa-10) <br>• Dealer preview footnote "FASTER." spills below its panel (qa-28) <br>• JOKER's act-2 line touches "NEEDS STAKE n" <br>• the wheel pointer covers "VOUCHER 1 OF n" <br>• the RELIC RUSH! trigger banner covers both HP bars for ~1.5 s | See the snaps. | `runScreens.ts` / `director.ts` banner. |
| B10 | LOW | A chip count of 100 or more overlaps the chip-shield icon and "+N SH/TURN" in boss fights. | Carry 100+ chips into a boss fight (qa-32). | `game.ts drawRelics`: the shield icon is at fixed x=120. |
| B11 | LOW | Vouchers banked in the **last** fight of a run (the Mirror in 12-fight runs, the Dealer) are paid silently. No payout screen appears and the prize is meaningless, though the tile said "WIN TO CASH". Similarly, a wheel HEAL at the House or Mirror is wasted because the act transition fully heals. | Force a bonus in the final boss fight, then win. | `game.ts afterRunFight`: `run.over` → `showOver` skips `bonusLog`. |
| B12 | LOW | The over/recap screen never shows wheel or rush prizes (`record.bonuses` is written but never drawn), so players can't tell where a relic came from. | Any run with a voucher (qa-18). | `runScreens.ts` drawOver. |
| B13 | LOW | The slime HUD counts the chase cells ("OOZE 20/42" instead of /36). | Fight a slime. | HUD ooze total. |
| B14 | LOW | GRAND (15/15) doesn't show its +15 chips. "YOU OWN EVERY RELIC" also shows when the pool is only empty because of build filters. | Code read (`drawRush`). | `runScreens.ts` l.438-440. |
| B15 | dev-only | `dbg.bonus()` during a frozen reel drags the frozen reel onto the chase cell, and the real respin keeps BONUS on the payline (60/60). Players can't hit this, because natural rolls are blocked on frozen or jammed spins (0 of 3,625 in the stress run). | `qa_edges.ts` §2. | `fight.ts bonusTrigger`: `forceBonus` is checked before the frozen check. |
| B16 | info | `dist/` was stale: built 00:01, before the 00:05 balance commit e58f79b, so it had the pre-balance game. I rebuilt it. | – | Always run `npm run build` right before uploading. |

Things that work as intended:

- **Vouchers:** they pay only on a win (lost at the Mirror → vouchers gone).
- **Free respin:** a second spin in the same turn, no extra click, even with AUTO off.
- **Wheel prizes:** charm, strip swap and tier II all apply.
- **Rush prizes:** the relic comes from the right tier, with fallback up and then down. Owning every relic pays +10 chips.
- **Several vouchers in one fight:** they queue ("VOUCHER n OF 3").
- **Bonus → next screens:** after the payout, elite spoils, the legendary pick, the draft and the Cashier follow in the right order.
- **Chase cells:** SHUFFLE, CUT and the freeze clunk never move them.
- **Other double-clicks:** they are safe on the draft cards, the Cashier, NEXT VOUCHER/COLLECT and the over screen.

## Balance numbers

**Official sim** (`npm run sim -- --runs 1000`, greedy/random):

- Slot machine win %:

  | Machine | Greedy | Random |
  |---|---|---|
  | knight | 25.2 | 16.0 |
  | midas | 26.5 | 14.7 |
  | thorn | 22.4 | 15.4 |
  | tesla | 24.4 | 12.4 |
  | joker | 21.4 | 13.2 |

- House win 72-82%, Mirror win 59-72%.
- Knight greedy stake ladder: 25.2 / 18.2 / 17.0 / 12.9 / 10.9 / 7.2.
- ACT 3 at GREEN (greedy): Dealer win 63-72%.

**Commit ladder** (`it10_ladder.ts 300`), run win % by stake 0..5:

| Machine | 0 | 1 | 2 | 3 | 4 | 5 | GOLD/WHITE |
|---|---|---|---|---|---|---|---|
| knight | 29.7 | 23.3 | 20.7 | 19.0 | 18.0 | 12.3 | 0.42 |
| midas | 29.0 | 25.7 | 22.3 | 22.7 | 20.7 | 14.3 | 0.49 |
| thorn | 28.7 | 30.7 | 29.0 | 20.0 | 11.0 | 10.0 | 0.35 |
| tesla | 25.3 | 23.7 | 22.0 | 20.7 | 19.7 | 11.0 | 0.43 |
| joker | 23.3 | 19.3 | 18.7 | 18.7 | 13.3 | 9.0 | 0.39 |

- THORN falls hardest at BLACK and BLUE (−9 each step). Its House win goes 75.4 → 52.1 at BLACK; other machines drop 4–8 pts at BLACK.
- JOKER is lowest at 4 of 6 stakes.

**Act 3** (`it12p_act3.ts 400 2 commit`):

- Dealer win 60.2% overall:

  | Machine | Dealer win % |
  |---|---|
  | knight | 57.0 |
  | midas | 67.9 |
  | thorn | 57.8 |
  | tesla | 63.6 |
  | joker | 52.5 |

- The spread is 15 pts.
- Full-run win 12.1%. HP into the Dealer 89%. C-fight deaths 0–8%.
- 3.4 deals per fight; RAISE pays the player's side 99%.

**Bonus frequency** (`qa_bonus_freq.ts`, commit):

- The effective roll is **~2.4%/spin**, not 3%, because frozen and jammed spins can't roll.

| | Wheels | Rushes |
|---|---|---|
| Won 12-fight run (70–92 spins) | 1.19–1.65 | 0.74–0.99 |
| Won 16-fight run (89–114 spins) | 1.40–2.26 | 0.88–1.38 |
| Average run incl. deaths (paid) | 0.64–0.94 | 0.33–0.54 |

- 0.10–0.20 fights per run bank 2+ vouchers.
- **12-fight runs are ~25% under the "2 wheels + 1 rush" target.**

**Rush odds** (stick 0.07): common 60.3%, uncommon 30.2%, legendary 9.5%, GRAND 0.84%.

What a fresh KNIGHT gets from a rush (n=2,000):

- **TWIN REELS 30%.** It is the only uncommon without a build requirement, so every uncommon rush gives it.
- **Counter relics (mittens/lockpick/mousetrap/pickaxe) 27%.**
- HIGH ROLLER 6%. It only matters against the House.
- Legendaries 10%.

Every relic also adds +3 House / +4 Mirror / +4 Dealer HP, so a counter-relic rush can be a net loss.

**Bonus value** (`qa_bonus_value.ts`, paired seeds): bonuses off vs current rates vs 2.8%/1.2%.

| Base stake (N 400) | Off | Current | 2.8%/1.2% |
|---|---|---|---|
| knight | 18.5 | 28.3 | 31.0 |
| midas | 25.3 | 30.0 | 33.0 |
| thorn | 24.0 | 28.0 | 27.5 |
| tesla | 23.8 | 28.0 | 29.8 |
| joker | 19.3 | 24.0 | 25.3 |

| GREEN + act 3 (N 300), run win % (Dealer win %) | Off | Current | 2.8%/1.2% |
|---|---|---|---|
| knight | 4.3 (48) | 10.3 (54) | 12.3 (53) |
| midas | 11.0 (62) | 15.0 (69) | 17.7 (77) |
| thorn | 6.0 (50) | 14.3 (57) | 14.7 (60) |
| tesla | 8.7 (50) | 13.0 (60) | 13.7 (59) |
| joker | 5.0 (41) | 8.0 (46) | 11.0 (55) |

- The bonuses are worth +4 to +10 pts. They help KNIGHT most and MIDAS least.

Nothing is broken or dominant. The relic win rates from the greedy sim are unchanged from Iteration 14: Golden Hourglass 67% and Phoenix 64% at the top; High Roller 31%, Cactus 27% and Hone 27% at the bottom.

## Prioritised fix list

1. **B1:**
   - Hide `startBtn` (NEW RUN) while `phase === 'fighting'` in a run, or make it and `R` need a second press within 2 s ("PRESS AGAIN TO ABANDON").
   - Ignore game-level button clicks for 300 ms after `screens.hide()`.
2. **B2:** In `finishFight`, set `run.player.hp = p.hp` *before* `payVoucher`. Then compute the post-fight heal from `run.player.hp` instead of `p.hp`.
3. **B3:** Add `&& !BONUS_SYMBOLS.has(c.symbol)` to the filters in `applySlime` and `plantBombs`.
4. **B4 + B5:**
   - Stake picker: put the "+ ACT 3" line on its own row below the title, and cap the rule list's width to end before the HIGHER button.
   - Over screen: move the table down one line per unlock-text line (or shrink the unlock text to 1.25 scale and wrap it at 90 chars).
5. **B6:** Validate prefs on load:
   - arrays must be arrays, with unknown ids filtered out and `knight` always included;
   - speed must be one of {1,2,4};
   - stakes and stakeSel are clamped to 0..5;
   - booleans are coerced.
6. **Bonus rate:** raise `BONUS` from `{wheel 0.02, rush 0.01}` to `{wheel 0.028, rush 0.012}` to reach ~2 + 1 on a full 12-fight run. That costs about +1 to +3 pts of run win (base). To hold act-1 clear at today's ~51%, add ~+3% to act-1 enemy HP ([22,28,33,36,39] → [23,29,34,37,40]).
7. **Rush pool:** remove mittens, lockpick, mousetrap and pickaxe from `RELIC_TIER.common`. They are counter relics that drafts only offer as PREP cards. Also skip `crown` after act 1. Then 60% of rushes stop paying out a likely-dead relic that still adds boss HP.
8. **Small text and logic fixes:**
   - **B7:** set the TESLA unlock text to "BEAT THE HOUSE" and the JOKER unlock text to "BEAT THE HOUSE WITH WILDS" (or change the condition).
   - **B8:** replace the title's "5 FIGHTS + A BOSS" with "12 FIGHTS, 2 BOSSES".
   - **B9:** the elite line becomes "+25% HP, 1 OF 2 RELICS, +2 CHIPS"; charm titles at 2.5 scale in the 5-slot Cashier; the Dealer footnote gets one line fewer.
9. **B10–B14:**
   - **B10:** position the chip-shield icon after the measured chip-count width.
   - **B11:** no bonus roll in the run's final fight.
   - **B12:** draw `record.bonuses` in the THEN PICKED column.
   - **B13:** exclude chase cells from the ooze total.
   - **B14:** GRAND shows "+15 CHIPS".
10. **Watch, re-measure after 1–9:**
    - JOKER is lowest almost everywhere (GREEN act-3 win 8.0%, Dealer 46–52%). Try 27 → 28 HP.
    - THORN's BLACK step is −9 (House 52%).
    - The Dealer spread is 15 pts (MIDAS 68 vs JOKER 52.5).
