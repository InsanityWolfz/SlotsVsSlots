# Sign-off: 20 new/reworked relics (commit cf35a88), 2026-09-27

**Verdict: FIX FIRST. There is one blocker, and it's a one-line fix.** Everything else can ship as is.

Evidence (all reproducible):
- `npm test`: 164/164 pass. `npx tsc --noEmit -p .`: clean.
- `tuesday.ts 2000` reproduces the logged table exactly (WHITE 25.4, GREEN 9.2, Dealer 57.3).
- Probes: `tools/balance/signoff_probe.ts` (engine edge cases) and `tools/balance/signoff_bash.ts` (how often the blocker happens).
- Browser pass: Playwright + Chromium against `npm run dev`. Screenshots are in the session scratchpad (`shots/01_*` to `07_*`).

---

## BLOCKER

### B1. SHIELD BASH can kill the enemy at turn start, and the player's turn still plays out afterwards
- **Where:** `src/core/fight.ts:285`, in `step()`: `if (this.cfg.shieldReset === 'ownTurnStart') this.resetShield(me, events);`
- **What goes wrong:** `resetShield` now fires BASH's hit, and that hit can end the fight. `step()` has no `this.over` check after it, so it goes on as if nothing happened:
  - it rolls, scores and emits a `spin`;
  - it resolves the first group (a second `attack` on a dead enemy);
  - it runs JAX/MIDAS `payoff` (the meter empties and heals);
  - it rolls the hidden bonus, so a **free BONUS WHEEL / RELIC RUSH voucher can be banked and paid after the win**;
  - it counts `playerJackpots`.
- **Event order seen:** `turnStart relic attack death fightEnd spin voucher spin attack` (JAX: `... fightEnd spin payoff attack`).
- **In the browser:** the VICTORY banner shows, then the reels spin again next to the knocked-over enemy machine, with "ROUND 2, HERO'S TURN". The run then opened a bonus screen: `WHEEL: SHIELDS LVL 2` (screenshots `07_bashkill_6/7.png`).
- **How often:** in greedy GREEN runs that hold BASH, **4 to 13% of fights** end this way (KNIGHT 10.7%, MIDAS 13.4%, BRIAR 5.4%, TESLA 3.7%, JAX 12.5%). About 1 in 25 of those also get a free voucher. The denominators include the power probes, so the real rates are a bit higher.
- **Fix** (the same pattern the House's cash-pot branch already uses a few lines below):
  ```ts
  if (this.cfg.shieldReset === 'ownTurnStart') this.resetShield(me, events);
  if (this.over) {
    this.next = other(side);
    return { turn: this.turn, side, events };
  }
  ```
- **Test to add:** a KNIGHT with `bash`, enemy HP 20, player shield 100. Step the player's turn and expect no `spin` event after `fightEnd`.

---

## Engine check, relic by relic (against my spec)

✔ means it matches the spec. "Note" means it works but has a small deviation that isn't a blocker.

| Relic | Status | Notes |
|---|---|---|
| WAR DRUM | ✔ | +5/stack on sword BASE before MULT, cap 5, reset per fight. The stack is added after the spin, so the first spin gets +0 (as specified). |
| CHAINMAIL | ✔ | Heals 10% of leftover shield before the reset. Note: with Chalice at full HP, the overheal becomes shield and is lost in the same reset (it shows "OVERHEAL +SHIELD" and then loses it). Harmless noise. |
| KING'S VAULT | ✔ | Bars bank ×N; the raise pays ×(4+vault) and empties it. Counterfeit, jammed and hexed bars bank nothing (`paylineEnh`). The Mirror's copied bar-gold fizzles. Note: the gold charm card on GOLD BARS still reads "X2 TO ITS GROUP", which is wrong with the vault (it banks instead). |
| ROYAL DECREE | ✔ | ×4 on every other paying group plus bar fills. The re-arm streak works as designed. |
| ROSE HIP | ✔ | 10% of the volley in 5s, after the payoff heal, player only. |
| GRAFT | ✔ | Gold, keen and vamp on thorns (vamp heals on bank). The Mirror's copies fizzle (its thorns don't bank). |
| FARADAY | ✔ | 25% of shield as energy in 10s; grounded cells don't block it. TESLA only (`this.special`). |
| STATIC | ✔ | Once per turn (`staticTurn`), blocked hits included. It can fire during the player's own turn if something hits them then (reflect or Mimic). That's fine. |
| CAP AND BELLS | ✔ | 10 per payline WILD, lucky and grounded wilds included. |
| STACKED DECK | ✔ | Charms on plain wilds; a charmed wild fills 40. A wild joins only one group (`scoreLine`), so its gold can't double-count. |
| GOLD LEAF (`midas`) | ✔ | Stray gold is added into the best group's gold sum (the divide-out math is correct, since multipliers commute). Note: the group's `X{n} GOLD` note stays stale beside `+X{stray} LEAF`. Cosmetic. |
| EXECUTIONER (`hone`) | ✔ | ×3 on keen swords under 50%. Off the Mirror copy list. The old `HONE_BONUS` is gone from `stripStats` too. |
| VAMPIRE'S KISS | ✔ | `vampHeal` now runs for shields, bolts, bars and thorns. Note: the Mirror copies your vamp-on-shield charms and *heals from them* (`vampHeal` isn't player-gated on shields). It's symmetric with sword vamp, so I'd keep it. |
| HORSESHOE | ✔ | Only lucky-born wilds (`cellSym !== 'wild'`). Stacks with Prism and First Blood. |
| UNDERDOG | ✔ | Your HP < 50%. `machinePower` never sees it (99999 HP dummy), so it isn't taxed. That's intended. |
| FIRST BLOOD | ✔ | Once per fight. Singles pay, so in practice it fires on your first spin. |
| PIGGY BANK | ✔ | Added after the interest. |
| TROPHY BELT | ✔ | Note: it also heals 10 under Glass Cannon (Bandage is blocked there) and in act 3 ("no comps"). Tiny. Leave it or gate it the way Bandage is gated. |
| HOLY WATER | ✔ | Singles that fizzle anyway don't use it up. Notes: it doesn't cover the AUDIT `penalty` (confiscate) or `earth`. A 1-cell single slime *does* use it up. Fine for v1. |
| SHIELD BASH | **B1** | Otherwise correct: it goes through `hit()`, so enemy shields block it. |

**Mirror and enemy exploits:**
- None of the new relics are copyable, and every `has()` in `score()` is player-gated.
- The Mirror does copy the new charm placements (bar gold, thorn charms, wild charms, vamp on shields). All of these fizzle or are symmetric; I found no blow-up.
- Pit Boss confiscation and counterfeits correctly switch off vault, gold leaf, stacked and horseshoe cells.

**Offer paths:** all five paths filter through `relicFits`: drafts, elite spoils (`pickRelics`), RELIC RUSH, Cashier, and legendary. So machine relics never leak onto the wrong machine, and lucky never reaches KNIGHT or MIDAS (the wheel uses `gildsFor` too).

---

## Visual pass (Chromium)

What works:
- **Starting pick:** it shows on all 5 machines (e.g. KNIGHT chainmail/drum/piggy, JAX stacked/capbells/fang). Picking a relic goes straight to the next-fight screen. The tutorial skips it (`game.ts:356`).
- **Card text:** all 20 new cards and the fixed Rod fit (`02_cards_*`).
  - STACKED DECK drops to the small 1.5 font. It's readable.
  - VAMPIRE'S KISS uses the small title size (over 13 chars), which is OK.
- **Sprites:** all 20 read well at ×4 on cards and at ×1.75 in the relic list. The list stays tidy at 23 relics (3 rows, `03_relic_list_draft.png`).
- **Collection:** 36/36, 3 rows, the tier borders are right, and the long description (STACKED DECK) wraps to 2 lines inside the panel.
- **In fights:** the relic popups (tray highlight plus name) and the green `+N` heal numbers work for CHAINMAIL, BASH, CAP AND BELLS, STATIC, FARADAY and HOLY WATER.

Cosmetic issues (non-blocking):
- **N1.** The start screen title `MIDAS MACHINE - A NEW RUN` (and any long machine name) is wider than the header frame (`runScreens.ts:863`). Suggest the title `A NEW RUN`: the machine name is already on screen.
- **N2.** The relic popup label on the first tray slot is centred on a sprite at x≈45, so long names clip at the left screen edge ("CAP AND BELLS", and "CHAINMAIL" is close). Clamp the label x to at least its half-width.
- **N3.** The KING'S VAULT bank isn't shown on the meter. My spec asked for this; you only see it at the raise as `X6 MIDAS`. WAR DRUM stacks aren't shown either, beyond the higher BASE. Both relics lose some of their feel without a visible counter. Worth a follow-up, but not a blocker.
- **N4.** The collection doesn't say which relics are machine-only ("KNIGHT ONLY"). Players will wonder why WAR DRUM never shows up on TESLA.

---

## Balance sanity

`tuesday.ts 2000` compared with the previous commit (`tuesday.ts 1000` on cf35a88~1):

| | WHITE | GREEN | Dealer | turns per fight, act 1 / act 2 |
|---|---|---|---|---|
| KNIGHT | 27.5 → 26.3 | 11.0 → 8.8 | 61.5 → 54.2 | 18.1/10.0 → 15.6/10.2 |
| MIDAS | 27.1 → 22.7 | 10.3 → 8.1 | 55.7 → 56.6 | 19.4/10.9 → 18.3/11.7 |
| BRIAR | 30.3 → 27.8 | 11.5 → 10.3 | 54.5 → 54.0 | 18.6/18.1 → **21.7/23.4** |
| TESLA | 27.9 → 24.4 | 11.3 → 9.9 | 55.9 → 60.9 | 16.4/14.0 → 16.3/16.2 |
| JAX | 25.8 → 26.0 | 8.9 → 8.9 | 61.0 → 60.8 | 15.4/6.3 → 18.2/7.7 |
| **AVG** | **27.7 → 25.4** | **10.6 → 9.2** | 57.7 → 57.3 | |

Must change before live? **No balance blocker.** The spread is tight (WHITE 22.7 to 27.8; the Dealer 54 to 61). Things to watch in the playtest:

1. **The retune overshot slightly.** Players get 20 new toys and a starting relic, yet win 2.3 points less on WHITE and 1.4 less on GREEN than before. If the intent was "same difficulty, more build identity", nudge `regularHp` 0.95 → 0.9 afterwards. I'd rather ship this and read the playtest than retune blind.
2. **BRIAR fights got long.** Act 2 went from 18 to 23 turns per fight (+29%), the slowest in the game. The cause is `regularHp` and `act2Hp` rising while thorn damage is taxed hardest. This is a pacing risk, not a win-rate one. Watch the "fights drag" feedback.
3. **MIDAS WHITE 22.7** is now the lowest row. Its Mirror fell from 87% to 68% (BOSS_MUL mirror 4 → 5). Fine for now.
4. **Fang** is still the strongest common (+10 to +13 on meter machines). It can now appear as the general card in the starting pick (1 in 8 on meter machines), and the sim picks it over machine relics (RELIC_VALUE 9). It's OK to ship. The obvious later fix is to remove `fang` from the start-pick general pool, so the start pick is about identity.
5. **JAX's two machine relics** measure only about +1. It isn't harmful, just flat. A related feel-bad: **HORSESHOE is offered to JAX in act 1** (lucky is JAX's favoured charm), but lucky charms don't exist until act 2. So about 1 in 3 of JAX's act 1 identity-slot cards can be a relic that does nothing yet. Suggested fix: in `relicFits`, the favoured-charm exception should need `gildsFor(run).includes(def.charm)`. This also makes CAP AND BELLS and STACKED DECK show up more often in act 1, which is the other JAX complaint.

---

## Save compatibility

✔ Saves are compatible.
- `sanitizeProfile` keeps any id `in RELICS`, so the 18 new ids are accepted, and `midas` and `hone` keep their ids.
- Old profiles that found MIDAS or HONE now show GOLD LEAF and EXECUTIONER as found. That's acceptable.
- The storage keys are unchanged (`slotvslot.prefs.v2`, `slotvslot.profile.v1`, `slotvslot.config.v3`).
- There is no mid-run save, so `pendingStart` never persists.
- Pre-existing nit, not from this commit: `r in RELICS` also accepts prototype keys like `"constructor"` from a hand-edited save. `Object.hasOwn(RELICS, r)` would be stricter.

---

## Summary for the user

- **Blocker:** B1 (SHIELD BASH kill makes a ghost spin after VICTORY, plus a free bonus). The fix is 4 lines at `fight.ts:285`, plus a test.
- **After that: SHIP.** The engine matches the spec, the cards fit, the sprites read well, saves are safe, and balance is within tolerance.
- **Next pass:** N1 to N4, the HORSESHOE act 1 gate for JAX, Fang out of the start pick, and BRIAR fight length.

---

## Re-check after fixes (commit 29eeade): **SHIP**
- **B1 fixed:** `fight.ts:286-290` returns right after `resetShield` if the fight is over. The probe shows `... death fightEnd` and nothing after it, for KNIGHT and for JAX with a full meter. In the browser, a BASH kill goes straight to the draft screen with no ghost spin and no voucher.
- **HORSESHOE gating** (`run.ts:1129`) is correct. Start title "A NEW RUN" now fits its frame.
- `npm test`: 166/166. `tsc`: clean.
