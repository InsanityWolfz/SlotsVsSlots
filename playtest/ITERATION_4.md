# Iteration 4 Playtest: The Cashier, build relics, elite spoils

**Method.** One real run on :4173 (seed 4444, spiked/Cactus build, lost to the House) plus a forced-win run into the boss with 31 chips (`snaps/it4-*.png`). Headless (`scratch/it4_*.ts`): 40+ policies × 3000 runs; 600 Cashier visits, 501 forks and 55 spoils valued by rollout; a 39-kit build table; six economy variants.

## Verdict

**Package J landed, but the Cashier is mostly a piggy bank.**
- **Forks are fixed.** Elite − safe = **0.0 pts** on average; the elite is better 48% of the time and the choice depends on HP (−3 below 70% HP, +2.3 above 90%).
- **LETHAL now warns before 100% of pot deaths.**

Three problems remain:
1. **Hoarding chips is the best Cashier strategy.**
   - "Never buy anything except a heal when hurt" wins **45.1%**, against 44.3% for the shipped heuristic and **37.1%** for spending on anything good.
   - The chip shield is huge: a 10-chip stack cuts boss losses by **32 pts** and a 20-chip stack by **58 pts**. A gild does about 25 and Fang 13.
   - So at the final shop, leaving is best (59%), and every gild or relic there *loses* 9–26 pts.
2. **Shop 1 is a dead screen.** You arrive with 3.1 chips (p90 4). A gild costs 10, so you can afford a gild or relic **0%** of the time.
3. **Committing still doesn't beat spreading** (−0.4 to +1.7 pts against the ≥+3 target). Never taking a gild at all (43.7%) plays the same as greedy (43.8%).

**The fix is cheap and tested:** Package K (**stackPer 8, start with 4 chips, boss 70 HP**). With K:
- savvy shopping beats not shopping by **+7.4 pts**;
- hoarding and heal-only fall behind;
- committing beats spreading by **+3.8 pts**;
- all fork policies land within 2.1 pts;
- the boss becomes a real climax again (15% of runs die there).

## 1. Numbers

### Shop policies (current build; greedy draft, sim fork, 3000 runs)

| Shop policy | Win % | Boss win % | Chips into boss | Buys/run |
|---|---|---|---|---|
| **heal-only when HP < 70%** | **45.1** | 88.3 | 20.8 | 0.28 |
| simGreedy (shipped) | 44.3 | 81.2 | 11.6 | 0.93 |
| smart (heal when hurt; best value at shop 2; nothing at shop 3) | 43.8 | 79.2 | 10.1 | 0.88 |
| never buy | 41.9 | **88.5** | 22.9 | 0 |
| buy best value by chip | 39.0 | 71.9 | 3.8 | 1.69 |
| spend on anything with value ≥ 5 | 37.1 | 66.5 | 2.9 | 1.28 |
| commit (build gilds/relic + reroll) | 36.9 | 70.2 | 6.7 | 0.80 |
| gilds only / relics only | 35.3 / 34.6 | 67 / 71 | | |
| random | 35.3 | 67.4 | 4.7 | 1.21 |

- Rerolling: −0.9 pts on average.

### Cashier visits (rollout; Δ = win-rate pts vs leaving without buying)

| Visit | Chips on arrival | Can afford a gild / relic | Leaving is best | +5 chips worth |
|---|---|---|---|---|
| Shop 1 (after F1) | 3.1 | **0% / 0%** | 92% | 5.5 pts |
| Shop 2 (after F3) | 11.1 | 74% / 42% | 22% | 0.7 pts |
| Shop 3 (before boss) | 14.0 | 80% / 69% | **59%** | 6.1 pts |

| Item (price) | Δ shop 2 | Δ shop 3 | | Item (price) | Δ shop 2 | Δ shop 3 |
|---|---|---|---|---|---|---|
| **HEAL 8 (4)** | **+13.0** | +3.8 | | GOLD sword (10) | +2.5 | −12.3 |
| Fang (12) | +19.8 | −4.8 | | CHARGED bolt (10) | +2.8 | −17.4 |
| GOLD bolt (10) | +9.3 | −8.9 | | KEEN / SPIKED (10) | −1.0 / −5.4 | −19 / −15 |
| 2 WILDs (6) | +2.1 (+8.0 at shop 1) | −3.2 | | Midas / Rod / Cactus / Hone / Prism (12) | −11 to −17 | −19 to −26 |

- **Decisions are real at shop 2:** spread 16.5 pts, only 10% trivial.
- **Build relics are negative** because the shop offers them with no enabler: Prism with 0 WILDs, Midas with no gold.

### Builds (single fight, 24/32 HP; % of fights lost, averaged over brute, thief, gremlin and frost at F4 plus the House)

| Kit | Avg loss % | House loss % | | Kit | Avg loss % | House loss % |
|---|---|---|---|---|---|---|
| Baseline | 51.0 | 80.6 | | 2× GOLD bolt + Midas / + Fang | 14.0 / 13.6 | 40.7 / 29.1 |
| Chip stack 2 / 4 | – | **48.3 / 23.1** | | 2× CHARGED + Rod / + Fang | **20.0 / 17.8** | 59 / 46 |
| Fang alone | 38.0 | 68.1 | | 2× SPIKED + Cactus / + Fang | 16.4 / 17.2 | 57 / 55 |
| Midas alone | 51.5 | 83.1 | | 2× KEEN + Hone / + Fang | 16.3 / 18.6 | 61 / 59 |
| 2× GOLD sword + Midas / + Fang | 14.4 / 15.3 | 50 / 44 | | 2 WILDs + Prism / + Fang | 15.5 / 15.5 | 36 / 33 |
| Spread (GOLD sword + GOLD bolt) + Fang | 14.9 | 39.4 | | 3× GOLD bolt + Midas | **8.5** | 32.5 |

- **Inside their build, build relics roughly equal Fang (the best generic relic):** Rod is worse, Cactus/Hone 1–2 pts better. Only 3× GOLD bolt + Midas shows a real premium.

### Economy variants (win %, 2000 runs; the last column is the best shop policy minus never shopping)

| Variant | Never | simGreedy | Spend all | Smart | Heal-only | Random | Best − never |
|---|---|---|---|---|---|---|---|
| Current | 41.5 | 44.8 | 37.0 | 43.5 | **45.4** | 35.4 | 3.8 |
| stackPer 10 | 34.8 | 38.5 | 35.5 | 37.5 | 37.0 | 32.3 | 3.7 |
| stackPer 10, start with 4 chips | 37.8 | 44.3 | 42.1 | **47.5** | 40.6 | 37.9 | 9.7 |
| **stackPer 8, start with 4 chips** | 39.9 | 46.9 | 42.5 | **48.6** | 42.6 | 39.1 | 8.8 |

### Package K (stackPer 8, start with 4 chips, boss 70 HP), 3000 runs

Deaths are % of runs at F1/F2/F3/F4/F5/boss.

| Policy | Current | **K** | K deaths | K boss win % |
|---|---|---|---|---|
| greedy / sim / smart | 43.8 | **47.4** | 0.8/7.5/11.7/8.8/8.3/15.4 | 75.5 |
| never shop / heal-only | 41.9 / 45.1 | 40.0 / 42.0 | | 84 / 82 |
| commit / spread (both with smart-style shopping) | 42.9 / 43.3 | **45.9 / 42.1** | | |
| forks: safe / elite / elite if healthy | 43.1 / 40.2 / 42.8 | 45.3 / 45.7 / 47.4 | | |
| random / random / random | 25.1 | 29.5 | | |

### Enemies and boss (greedy / sim / shipped shop heuristic, 3000 runs)

**Run kill rate by enemy:**
- brute **22.9**, gremlin 17.7, thief 15.4, frost 9.6, slime 8.3, golem 7.7, House 18.8.

**Hot spots:** **elite thief at F3 34.5%**, gremlin F3 26.9%, elite brute F3 24.2%, **frost F3–F5 19–23%** (scales badly late); golem F3–F5 6–9% is the free pick.

**Boss (1636 fights, 81% won):**
- **Length:** 16.5 turns (p10 9, p90 25).
- **Skims:** 1.39 per fight, averaging 6.5. **Steals:** 1.37 per fight, averaging 8.9. ALL IN in 96% of fights.
- **Deaths:** 44% by the skim, 30% by a spin right after a cash-out, 26% by other spins. Burst deaths are only 5.9%.
- **Boss win by chip stack:** 75.5% with a 1-shield stack, 83% with 2–3.
- **Boss win by relics held:** 73% with 0–1 relics, 91% with 3+. Always taking the elite gives a 98% boss win.

**LETHAL:** warns before 100% of pot deaths, but the HUD ignores the chip stack, so **false alarms are 31% / 55% / 76% at a 2 / 4 / 6 shield stack.**

**Spoils:** choices spread 9.7 pts (24% trivial). Fang (best 88% of the time), Mirror, and Crown win. Prism, Hone and Cactus are best only 9–11% of the time, because they're offered without their build.

**Run:** about 89 turns (~7 min at 1×), ~16 between-fight screens.

## 2. Bugs

| # | Bug | Repro |
|---|---|---|
| **C1** | In fights, the chip counter and "+N SH/TURN" are drawn behind the STRIPS panel (`game.ts:589`, RELIC_X+36, y 252). Only "RN" peeks out. | `it4-boss-end.png` (31 chips, invisible) |
| **C2** | LETHAL ignores the chip stack (`game.ts:674`: `cashOut >= hud.hp + hud.shield`). False alarms reach 76% at a 6-shield stack. | `it4_telemetry.ts` |
| **C3** | The boss preview says HP 66, but the real HP is 66 + 3 per relic (78 in my run). The ability line still says "CASHES OUT THE POT AT YOU". The preview never shows *your* stack ("31 CHIPS = +6 SHIELD"). | `it4-boss-preview*.png` |
| C4 | The Cashier offers HEAL 8 at full HP: `shopOffers`' fallback has no HP check. | `it4-shop1` (32/32) |
| C5 | The shop's relic slot ignores fit: Prism with no WILDs, Midas with no gold, and Bandage at the final shop, when no fight is left to heal after. | `it4-shop1/2/3` |
| C6 | The shop never shows HP, so heal decisions are blind. Clicking an unaffordable item gives no feedback; the only cue is the red vs yellow price. | `it4-shop1-poor` |
| C7 | Recap: "+1 BOUGHT" overprints "+2 ROCKS", and doesn't name the item. Chips are missing from the recap. | `it4-recap` |
| C8 | The SPIKED card says "HIT BACK FOR 2" while you hold Cactus (4). | `it4-draft3` |
| C9 | The elite fork card still says "DROPS A RELIC". It should say "CHOOSE 1 OF 2 RELICS, +2 CHIPS". Chip payouts aren't shown on forks. | `it4-fork2` |
| C10 | Enemy adjectives GILDED and WILD collide with mechanic names ("GILDED BRUTE", "WILD SLIME"). | `it4-draft5` |
| C11 | In the relic draft, the hovered card overlaps the "RELIC DRAFT – CHOOSE ONE" header. | `it4-draft2` |
| C12 | The 2-WILDs offer can target a reel whose shields are SPIKED, with no warning. | `it4-shop2` |

## 3. Prioritised changes (★ = top 5)

### (a) Balance
1. ★ **Package K: `CHIPS.stackPer` 8, start runs with 4 chips, `TUNE.bossHp` 70.**
   - Savvy shopping beats never shopping by +7.4 pts, and hoarding stops being the answer.
   - Shop 1 gets a real purchase (2 WILDs is +8 there).
   - Commit beats spread by +3.8. Boss win settles at 75%.
2. Frost at depth: reduce its HP multiplier to 1.0 from F3 on. Its late kill rate is 20%, double its F2 rate.
3. The elite thief at F3 (34.5%) is the single deadliest node. Cap the elite thief at x1.15 HP.

### (b) Draft, shop, economy and builds
1. ★ **Make offers build-aware.**
   - The shop relic slot and elite spoils offer a build relic only when you own its enabler (≥1 matching gild or WILD); otherwise they offer a generic relic.
   - Tag fitting cards with **"FITS YOUR BUILD"**.
   - Never offer Bandage at the last shop.
2. ★ **Make HEAL a permanent 5th "service" slot (5 chips, hidden at full HP).** It is the best item (+13 at shop 2), and HP vs power vs hoarding is the tension the Cashier should sell.
3. Put stat lines (ENERGY x TO y) on shop gild cards, as on draft cards.
4. Buff Rod: special costs 4 **and** deals 12 damage. As is, it loses to Fang even inside its own build.
5. Reroll is unused (−0.9 pts). Make the first reroll per visit cost 1.

### (c) Enemies and boss
1. With K, the House kills 15% of runs, about 28% of all deaths: a proper climax. Keep ALL IN as is.
2. Fix C3 (show the real HP and the stack on the preview).

### (d) Feel and readability
1. ★ **Make chips legible.**
   - Fix C1, C2 and C6.
   - Pop a "CHIPS +N SHIELD" callout with the chip sprite when the stack lands each House turn.
   - At the Cashier, show "NOW: +2 SHIELD / HOUSE TURN" next to the chip count, updating live as you buy. That turns hoarding into a visible trade-off.
2. ★ **Fix the text bugs C7–C11**, especially the fork card, which currently hides the chip and spoils payout.
3. Flow length is fine (at most 4 screens, ~5 clicks between fights); with K, shop 1 stops being a click-through.

## 4. Art needed

| Sprite id | Description |
|---|---|
| `chipShield` | 12×12 stack of chips with a small shield overlay, for the stack pop and the preview line |
| `tagBuild` | 20×7 green "FITS" ribbon for build-matching cards |
| `priceDim` | Greyed price-tag variant plus a 2-frame "no" shake, for unaffordable items |
| `shopHeal` | Cashier's first-aid tin, for the permanent heal service slot |
| `setBanner` | "FULL SET!" banner (for the next feature) |
| `cabinetKnight/Midas/Thorn/Tesla/Joker` | 48×64 cabinet portraits (next feature) |

## 5. Next big feature: CABINETS (starting machines) + FULL SET

The biggest thing missing is **run identity.** Every run starts on the same 4/4/4 machine and ends at the same boss, and builds only emerge if offers cooperate, so run 5 feels like run 1 (Balatro decks and Slay the Spire characters solve this).

**Design** (all choices are pre-run or between fights; no in-fight input):

| Cabinet | Start | Rule | Unlock |
|---|---|---|---|
| KNIGHT (default) | 4/4/4, 32 HP | None | – |
| MIDAS MACHINE | GOLD bolts on reel 1, 28 HP | +1 chip per win | Reach the boss |
| THORN | SPIKED shields on reels 1–2, 5 shields/3 swords per reel, 36 HP | Enemy specials deal −1 | Beat F4 with 3 SPIKED |
| TESLA | CHARGED bolts on reel 1, special costs 4, 30 HP | Special deals 8 | Win a run |
| JOKER | 2 WILDs on reel 2, 30 HP | Pairs of WILD+X pay as doubles | Win with Prism |

- **FULL SET:** when all three reels carry the same gild, that gild's effect doubles: GOLD x3, KEEN +2, CHARGED +2, SPIKED 4. A banner fires the first time it pays each fight.
- **Offer weighting:** 50% of gild offers (draft and shop) use your cabinet's enhancement.
- **UI:** a title-screen card pick using the existing card and button UI. Locked cabinets show their unlock condition.

**Implementation:**
- Add a `core/cabinets.ts` table.
- Change the signature to `createRun(base, seed, cabinet)` and add `RunState.cabinet`.
- Implement FULL SET in `Fight.score`.
- Persist unlocks in prefs.

**Sim targets:**
- Every cabinet within ±4 pts of KNIGHT under greedy.
- FULL SET reached in ≥35% of committed runs.
- Commit ≥ +3 over spread per cabinet.
- No cabinet above 55%.
