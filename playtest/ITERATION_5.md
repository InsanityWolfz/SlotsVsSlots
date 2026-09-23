# Iteration 5 Playtest: Cabinets, FULL SET, Package K

**Method.**
- **Headless** (`scratch/it5_*.ts`, new `it5_lib.ts` with cabinet-aware run loop + tuning hooks): 5 cabinets × ~15 draft/fork/shop policies × 2–4k runs; 1,200 Cashier visits valued by rollout (250 each); a controlled FULL SET on/off fight panel; boss-scaling sweeps; cabinet-HP sweeps.
- **Live (:4173)**: a shortened walk, not a natural run. The browser was paused mid-session while the user played. I did one THORN run using forced wins and state edits: cabinet select, draft, shop 1/2, charged FULL SET, boss preview, boss fight (`snaps/i5p-*.png`).

## Verdict

**Package K worked. Cabinets give runs identity. But THORN is too strong, JOKER is dull, and the boss has stopped being a climax.**
- **Hoarding is dead.** Never shopping costs **−14 to −21 pts** on every cabinet.
- **Cashier decisions are real**: 14–16 pt spread, only 4–11% trivial. Heal is HP-dependent: +11 to +25 below 75% HP, ~0 above.
- **Commit beats spread** by **+7.6 to +18 pts** (target ≥+3). JOKER is the exception at +2.8.
- **FULL SET works.** It is reached in 55–76% of committed runs, and turning the set bonus on roughly **halves fight losses**.
- **THORN** plays at 58% (+8 over KNIGHT) and is the most forgiving (random 37%).
- **JOKER** drafts like KNIGHT: no build and no set.
- **The boss is a victory lap.** It is less lethal per attempt than F3 for MIDAS/TESLA. Elite-path runs beat it **98–99%**, 71% of those wins with >75% HP left. **No number fixes this**: the House at +150 HP still wins only 9%. The boss needs a new axis (see §5).

## 1. Numbers

### Cabinets (4000 runs each)

| Cabinet | Best policy | Follow FITS tags | Official greedy | Random | Commit − spread | Runs with a FULL SET (committed) | F1 death | Boss lethality per attempt |
|---|---|---|---|---|---|---|---|---|
| KNIGHT 32 | 50.6 | 49.1 | 45.9 | 30.7 | +7.6 | 55% | 1.2% | 18% |
| MIDAS 22 | 51.6 | 51.0 | 48.0 | 27.5 | **+18.2** | 61% | **5.3%** | 12% |
| THORN 28 | **58.4** | **58.0** | 46.6 | **36.9** | +9.3 | **76%** | 1.2% | 20% |
| TESLA 26 | 55.3 | 54.1 | 48.4 | 30.8 | +13.1 | 64% | 2.7% | 14% |
| JOKER 26 | 48.4 | 48.4 | 42.8 | 29.8 | **+2.8** | 51% | 2.6% | 15% |

- **The official sim hides the imbalance.** Its greedy policy ignores builds, so every cabinet looks within ±4. Under competent play THORN is +8 and TESLA +5.
- **Skill gap**: 18–24 pts (competent vs random).

### Package M (tested): THORN 27, TESLA 25, JOKER 27 HP

Best-policy win rates move to **KNIGHT 51.8, MIDAS 49.7, THORN 49.2, TESLA 52.3, JOKER 50.1**, all within ±3.
- Win rate is steep in cabinet HP: **~4–6 pts per HP**.
- THORN at 26 HP drops to 44.

### Shop policies (win %)

| Policy | KNIGHT | THORN | MIDAS |
|---|---|---|---|
| never buy | 35.3 | 40.2 | 30.4 |
| heal only (when HP < 70%) | 46.3 | 52.9 | 43.2 |
| smart (heal + value) | 49.3 | 52.4 | 50.5 |
| spend everything | 49.5 | 52.7 | 48.8 |
| **commit (build + set-completer + heal)** | **50.6** | **58.4** | **51.6** |

No shop policy dominates; building on purpose wins.

### Cashier rollouts (Δ win pts vs leaving; ranges across cabinets)

| Visit | Chips on arrival | Can afford a gild | Leaving is best |
|---|---|---|---|
| Shop 1 | 7–8 | 0–7% | 29–52% |
| Shop 2 | 12–16 | 64–95% | 7–26% |
| Shop 3 | 10–22 | 50–86% | 22–44% |

| Item | Δ |
|---|---|
| **Gild that COMPLETES a FULL SET** | **+6 to +27** (best 44–86% of the time) |
| Heal (5 chips) | +7 to +13 on average; +11 to +25 below 75% HP |
| Fang | +5 to +22 |
| FITS gild that doesn't complete a set | −3 to +4 overall; **−1 to −14 at shop 3** |
| Off-build gild | −3 to −7 |
| Clover / Crown / Battery (12) | −1 to −9 |
| Cactus in THORN | −7 |

**The FITS tag treats the best item in the game and a trap the same way.**

### FULL SET, controlled (24/32 HP; average loss % over brute/thief/gremlin/frost at F4 plus the House)

| Build | 2 reels | 3 reels, set bonus OFF | **FULL SET** |
|---|---|---|---|
| GOLD sword | 23.1 | 18.0 | **10.3** |
| KEEN | 27.4 | 19.5 | **13.0** |
| CHARGED | 29.9 | 21.5 | **9.4** |
| SPIKED | 25.4 | 20.5 | **11.0** |
| GOLD bolt | – | 16.1 | **6.1** |

- **Fights get shorter**: 27.7 turns at baseline, 11–16 with a set.
- **The build relic on top of a set roughly halves losses again** (e.g. CHARGED set + Fang: 2.4% average loss, House 6.3%).
- **GOLD compounds per cell**: a GOLD triple pays ×27 with the set, so a jackpot deals 243 damage.

### Arc (follow-FITS policy; lethality per fight, F1/F2/F3/F4/F5/boss %)

KNIGHT 1/9/16/8/10/19 · MIDAS 5/12/**22**/7/8/11 · THORN 1/5/15/5/9/21 · TESLA 2/12/20/5/6/12 · JOKER 3/10/19/10/14/14

- **F3 is the wall and F4 is a lull.** The shop 2 power spike lands between them.
- **Taking every elite front-loads the risk:**
  - F2 death rate is 24–28%.
  - After that, F4 ≈ 1%, F5 ≈ 1%, and the boss is won 98–99% of the time.
- **Boss win by relics held**: 1 relic → 70%, 3 → 90%, 5 → 99%.
- **HP into the boss**: 76% of arrivals are at ≥80% HP (post-fight heal plus the shop 3 heal).
- **Numbers can't fix the elite-path boss.** Boss win for always-elite runs:

| Change tested | Elite-path boss win |
|---|---|
| Current | 98.6% |
| +3 HP per relic | 97.9% |
| +12 HP per relic | 97.3% |
| Pot +4 per relic | 90% |
| House cut +1 per relic | 90% |
| House confiscates a gilded cell every turn | 95% |
| House +150 HP | 91% |

**Unlocks (odds per KNIGHT run):**
- Reach the House: 60% → MIDAS.
- Beat an elite: 21% (careful forks) / 55% (random forks) → THORN.
- Win a run: 48% → TESLA.
- Win with WILDs: 18–25% → JOKER.

Everything unlocks within about 2–5 runs. The strongest cabinet comes early and the weakest comes last, so the final unlock is a letdown.

## 2. Bugs

| # | Bug | Repro |
|---|---|---|
| **D1** | **The SPIKED FULL SET never fires.** In `Fight.score`, `g.fullSet` is only set for keen/charged/gold; the spiked +2 is applied silently in `hit()`. THORN has a set in 67–75% of runs and sees 0 banners. | `it5_ident`: THORN fires/fight 0.0 |
| **D2** | **Card and shop stat lines ignore FULL SET** (`stripStats`). | 3rd GOLD sword card shows DAMAGE 3.70→5.33; real is **13.89**. 3rd CHARGED card shows ENERGY 2.04→2.37; real is 3.37 (`it5_statline.ts`). |
| D2b | `stripStats` also ignores JOKER's any-two rule and TESLA/Rod special cost. SPIKED cards show no stat line at all. | |
| D3 | During a FULL SET, cell stamps show "+1" but the set pays +2. | `i5p-set-2` vs `i5p-set-4` ("4 +2 +2") |
| D4 | The FULL SET subtitle and the banner maths overprint the HUD ("SPECIAL", "BLIZZARD IN 4"). | `i5p-set-2`, `i5p-set-4` |
| D5 | The boss preview footer still says "EVERY 5 CHIPS … +1 SHIELD" (it is 8). The chip line is 1× font. | `i5p-boss-preview` |
| D6 | In drafts, the YOUR REELS panel covers the bottom of the cards. | `i5p-draft1`, `i5p-spiked-set` |
| D7 | The heal slot offers "HEAL 8" for 5 chips at 27/28 HP. | `i5p-shop1` |
| D8 | Completing a set (draft or shop) is silent: no tag, no star, no sting. | `i5p-shop1-bought` |
| D9 | The "CHIPS +3 SHIELD" callout draws over the HP bar. | `i5p-boss-7` |
| D10 | Cabinet cards: blurbs are unreadable 1× text. The MIDAS art shows gold *bolts* (the rule is swords). The preview never names your cabinet. | `i5p-cabinets-all` |
| D11 | Shop 1 can show just 2 items plus heal (a duplicate gild is dropped and the utility roll is empty). | `i5p-shop1` |
| D12 | `Cabinet.enemyAbilityMinus` is dead code since the THORN retune. | |

## 3. Prioritised changes (★ = top 5)

### (a) Balance
1. ★ **Package M: THORN 27, TESLA 25, JOKER 27 HP.** Every cabinet lands within ±3 of KNIGHT under competent play.
   - Rebalance the official sim to use a build-aware policy. Greedy hides a 13-pt spread.
2. MIDAS F1 death is 5.3%, a feel-bad. Make MIDAS's opener always Slime (Frost clunks the gold).
3. Optional HP ramp `[21,26,29,35,38]`: F3 deaths go from 16% to 14% and F4 is no longer a lull. It's close to neutral.

### (b) Draft, shop, economy and builds
1. ★ **Make set completion legible.**
   - Add a distinct **"COMPLETES FULL SET"** tag plus set pips (●●○) on gild cards.
   - Guarantee one set-completer on the shelf at shop 2 when you own 2 of 3.
   - Hide or dim FITS on non-completers at the last shop.
   - Fix D2.
2. Relics at 12 are mostly traps outside Fang. A relic price of 10 was tested: +0.5 pts, harmless. Also add rarity so Clover/Crown/Battery stop being dead shelf space.
3. JOKER needs a build:
   - `favors: 'wild'`: half the gild offers become WILD cards, and Prism is guaranteed in the first relic draft.
   - **WILD FULL SET**: a WILD on all 3 reels makes lone WILDs pay as a double.

### (c) Enemies, boss and cabinets
1. ★ **Give the boss a new axis: HIGH STAKES (§5).** HP and pot tuning is exhausted.
2. Unlock conditions should teach the cabinet they unlock:
   - MIDAS: finish a GOLD FULL SET.
   - THORN: kill an enemy with SPIKED damage.
   - TESLA: fire 3 specials in one fight.
   - JOKER: land a WILD jackpot.
   - Show a win badge per cabinet on its card.
3. Always-elite ties safe on win rate (49.6 vs 49.0) but inverts the arc; HIGH STAKES fixes it.

### (d) Feel and readability
1. ★ **Fix D1.** Also give each set its own banner line ("SPIKED +2: HIT BACK 4"), and play the star and sting at the moment of purchase (D8).
2. ★ **Fix D3–D7** (stamps, overprints, stale "5 chips", card overlap, HEAL amount).
3. Cabinet select: 2× blurb text, plus a difficulty or playstyle line ("FRAGILE, RICH" / "TANKY, SLOW").

## 4. Art needed

| Sprite | Description |
|---|---|
| `tagSet` | 28×7 gold "COMPLETES SET" ribbon, distinct from the green FITS tag |
| `setPip` on/off | 5×5 progress pips for gild cards |
| `cabinetMidas` | Fix: gold swords on the reels |
| `cabinetBadge` ×5 | Per-cabinet win or stake badge |
| `markerChip` | Red IOU marker token (HIGH STAKES) |
| `houseRule` ×6 | 16×16 rule icons: loaded reel, tax, crooked line, house edge, no comps, security |
| `wildSet` | Overlay for the JOKER WILD set |

## 5. Next big feature: HIGH STAKES (the House plays back)

**Problem.** Strong runs out-scale any House number, so the finale is a formality exactly when the player is most invested.

**Design** (all choices happen between fights; fights stay watch-only):
- **Markers.** Every Cashier visit adds a 6th slot: **TAKE A MARKER**, for +8 chips now (or a relic, at shop 3).
  - Each marker adds one face-up **HOUSE RULE**, drawn from a deck, to the boss preview and the map. Maximum 3 markers.
  - This is a spend/save/risk decision that strong runs *want* to take.
- **HOUSE RULES** write on *your* machine in the boss fight:
  - **LOADED**: the House gains 2 sevens per reel.
  - **TAX**: each cash-out confiscates 1 gilded cell for the fight.
  - **CROOKED LINE**: your reel 2 is jammed on cash-out turns.
  - **HOUSE EDGE**: pot seed +8 and House cut +1.
  - **NO COMPS**: heals are halved.
  - **SECURITY**: your first jackpot doesn't steal the pot.
- **Rewards and meta.** Payout is chips/relics during the run. Winning with N markers unlocks **Stake N+1** for that cabinet, where N markers are forced at the start. This gives a per-cabinet stake ladder (Balatro stakes / Slay the Spire ascension).
- **Sim targets:**
  - 3-marker runs die at the boss 20–30% of the time.
  - Stomps (winning with >75% HP left) under 40%.
  - Each stake costs 5–7 win pts.
  - Markers are taken in ≥50% of runs above 4 relics.
- **Why rules and not numbers.** The proxies above show raw pot/HP scaling barely moves elite runs (98% → 90–95%). Rules need to combine damage (HOUSE EDGE, LOADED) with build-hitting (TAX, CROOKED LINE).
