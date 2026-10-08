# THE JUKEBOX (DJ DECIBEL): deep test (2026-10-08)

Build: `3d953f4` (LUCKY at the drop). `npm test`: 252/252 pass. `fuzz.ts 300`: no invariant breaks.
Harnesses (throwaway, untracked): `tools/sim/_juke_probe.ts`, `_juke_probe2.ts`, `_juke_probe3.ts`, `_juke_probe4.ts`.
Screenshots: `/tmp/claude-0/-home-user-SlotsVsSlots/878cf676-306f-5d16-9f27-4d5b2d19896b/scratchpad/shots/pt_*.png`.

Engine behavior that checks out: ENCORE gives exactly one extra drop and then resets (3, or 5 with TURNTABLE). HEADLINER
raises the max to 8. HYPE MAN can arm and drop on the same spin. A drop that kills ends cleanly, and `encorePending` is per
Fight, so nothing leaks into the next fight. Slimed and stolen cells are skipped at the drop. REPO MAN's confiscate marks
a cell stolen, which the drop also skips. BLOOD PACT doubles the gain but not the skip. MIXTAPE and FEEDBACK both stop the
skip. Vamp heals once for the payline group and once for the off-payline cells. Fang plus the machine heal at each drop is
30 + 20, and ENCORE heals twice. OVERCHARGE is excluded. A save restarts the fight from its seed, so the volume restarts at
0 (or at the BATTERY value); that is by design and matches the other meters.

---

## BUGS

**B1 (high): the ECHO Charm is never kept in the profile.** `ALL_CHARMS` in `src/core/profile.ts:14` has no `'echo'`.
- `sanitizeProfile` (profile.ts:149, 211) removes it from `found.charms` on every load.
- `charmsOf` (profile.ts:86) leaves ECHO out of hiscore and run entries.
- Repro: `_juke_probe3.ts`. `found: ['echo','gold']` reloads as `['gold']`, and a run with ECHO records `charms: []`.
- Effect: the COLLECTION never keeps ECHO across a reload, and with it the COLLECTOR achievement (see B2).

**B2 (high): retired BRIAR content is still live and still counted.**
- **BAD BLOOD challenge** (`src/core/meta.ts:37`, `cabinet: 'thorn'`). Once FAST COMPANY or SHORT STACK is cleared, it
  opens and starts a full BRIAR run. The card reads "THORN. HIGH ROLLERS + ...". Screenshots: `pt_challenges_open.png`,
  `pt_badblood.png` (BRIAR, the THORN reels and the CACTUS / BATTERY / VAMPIRE FANG thorn texts).
- **COLLECTION**: the THORNY Charm (menus.ts:42, 48: "BRIAR'S THORNS...") and CACTUS, BRAMBLE WALL and HEDGE
  (relics.ts:33, 57, 70, `machine: 'thorn'`, not `retired`) still count toward `collectionTotal()`. A new player can only
  find them through BAD BLOOD, so the COLLECTOR achievement becomes unreachable once B2 is fixed by removing the challenge.
  Screenshot: `pt_coll_thorny.png`.
- Fix: move BAD BLOOD to `jukebox` (new name/title, or retheme it), and mark the three relics `retired` and drop THORNY
  from `CHARM_ORDER` (as was done for SPIKED).

**B3 (medium): BATTERY starts THE JUKEBOX at volume 4, but the card says 3.** At fight.ts:349,
`unitsUp(meter.cost * BATTERY_SHARE)` is `unitsUp(36)` = 40. Text: relics.ts:129 "THE VOLUME STARTS EACH FIGHT AT 3".
Probe A: energy 40, volume 4. Seen in the browser too: `pt_hud_headliner_battery.png` reads 50/80 after HYPE's +1.
Fix: use `3 * UNIT` for the volume.

**B4 (medium): the drop ignores what the enemies write on the off-payline cells.** fight.ts:1458-1471 checks only
`slimed` and `stolen`:
- **Card Sharp `carded` cells** (a dead CARD) still hit as notes. Probe: every cell carded gives the drop 6 cells, 130 damage.
- **Hexed reels** ("pays half, charms are dark") hit in full with their Charm. Probe I: hexed 130 against a plain 130,
  while the payline group was halved.
- **Jammed (`locked`) reels** still give their off-payline notes.
- **Counterfeit (`faked`) Charms** still apply. Probe I: a faked ECHO still hit x2.
- Fix: use `effectiveSymbol(c)`, skip a cell when `c.locked[r]`, and pass the cell's Charm through the same live check
  as `paylineEnh` (no hex, no fake). Also halve a hexed reel's cells.

**B5 (medium): the GROUNDER is a half-dead counter to THE JUKEBOX.** `counterFor` (run.ts:513-518) sends the GROUNDER
(BLUE stake "YOUR COUNTER") to any meter machine with under 4 Charms. Its reel symbol plants rods in your signature symbol
(fight.ts:2222: `meter.symbol` = `note`), but a grounded note does nothing: `turnUp`, the scoring and the drop never call
`isGrounded`. Probe J: grounded notes still turn the volume up. Only its EARTH ability (−3 volume every 4 turns) works.
Its blurb still says "RODS IN YOUR BOLTS".
Fix: either a grounded note doesn't turn the volume up (and sits out the drop), or THE JUKEBOX gets the COUNTERFEITER.

**B6 (low): HYPE MAN shows "MAX VOLUME! THE BEAT DROPS NEXT SPIN!" on the very spin that drops.** HYPE's +1 runs before the
spin (fight.ts:629). When it fills the meter, the `meter{armed}` event plays first and the drop follows on that same
spin. Screenshots: `pt_hype_armed_a.png` (the text over the reels), then `pt_hype_armed_d.png` (it already dropped,
volume 30/80). Fix: give the HYPE arm its own callout ("THE BEAT DROPS!"), or skip the armed text when `dropNow`.

**B7 (low, internal): the group note says `VOL +${vol*10}%`, but it is +20% per level** (fight.ts:1013). At volume 3 it
reads "VOL +30%" while the mult is ×1.6. These notes aren't drawn anywhere in the UI today, but anything that shows them
later will be wrong. Stale comments say the same: fight.ts:60 ("+10%... leaves it at 2 (TURNTABLE: 4)") and fight.ts:1008.

---

## INCONSISTENCIES (text vs. behavior)

**I1. HEADLINER, "THE DROP HITS X2"** (run.ts:1937). `dropMul` only multiplies the off-payline drop (fight.ts:1476). The
payline notes on the drop spin, which are part of "every note hits", don't get ×2. Probe D: payline 234 with or without
HEADLINER; the off-payline drop goes 160 → 310.

**I2. Pay relics skip the off-payline drop.** UNDERDOG ("EVERYTHING PAYS X1.5"), METRONOME, BRACELET, HOT STREAK and
FIRST BLOOD all skip it, and so does EXECUTIONER ("KEEN NOTES PAY X3"): a keen note off the payline gets no ×3. Only
GLASS CANNON and DEVIL'S DUE apply (`payMul`). Either apply the spin's pay multipliers to the drop, or accept this as
"the drop is its own hit". UNDERDOG's "EVERYTHING" is the one that reads false.

**I3. TURNTABLE is dead with FEEDBACK.** At fight.ts:1487 `big.dropTo ?? turntable`, so FEEDBACK's 0 wins. TURNTABLE
says "FALLS TO 5" and does nothing (probe F). MIXTAPE is also redundant with FEEDBACK. Either stop offering them after
FEEDBACK, or let TURNTABLE win.

**I4. QUICKENING, "YOUR VOLUME STARTS EVERY ROUND FULL"** (run.ts:1875). The engine starts at `meterCost − 1` = 59, so
volume 5, not armed (probe B), and the HUD would read 59/60. On THE JUKEBOX "full" should mean the first spin drops. This
is the same "one short" rule as the other machines, but here the card is plainly wrong.

**I5. The HUD counts the volume in raw units** ("VOLUME 20/60", "50/80"; hud.ts:210, `energy * UNIT`). Every card says
levels: "STARTS AT 3", "FALLS TO 5", "MAX GOES UP TO 8". It should read 2/6, 5/8. Screenshots: `pt_meter_after.png`,
`pt_hud_headliner_battery.png`.

**I6. FEEDBACK, "THE VOLUME NEVER DROPS ON A SPIN WITH NO NOTE"**: "drops" collides with THE DROP. MIXTAPE says
"DOESN'T LOWER". Suggest "THE RECORD NEVER SKIPS", which also matches the in-fight SKIP!.

**I7. The tutorial coach** (coach.ts:32) still lists "(LIGHTNING, HIGH ROLLER, THORNS OR JACKPOTS)". It should say VOLUME.

**I8. Collection Charm texts**: KEEN and VAMP read "SWORDS AND CARDS..." (menus.ts:36, 39), but both fit NOTES now
(charms.ts:53, 55).

**I9. The machine card** ("NOTES TURN UP THE VOLUME. AT MAX THE BEAT DROPS: EVERY NOTE HITS. 320 HP.") never says a
noteless spin skips the volume down 2. That is the machine's main risk, and players only learn it from the SKIP! popup.
The drop's hidden +20 HP heal is also unstated (JAX has the same gap).

**I10. Name clash: ENCORE** is both the JAX relic (relics.ts:63) and the JUKEBOX bonus round card. A JUKEBOX player only
meets the card, but both sit in the collection and the logs.

**I11. Minor:**
- reelTable.ts:20, 23 has no `note` / `echo` in its sort order, so notes sort after rocks and slime, and ECHO rows sort
  as uncharmed.
- The log abbreviation `note: 'NOT'` (log.ts:166) reads as the word "NOT". Suggest `NTE`.
- Wording rules check out: no "cabinet", no "gild", no THORNS/VOLLEY slip, and no decision-hint numbers on the new cards.

---

## ANIMATION / VISUAL

**V1. "THE DROP!" sits right over the top row**, which is exactly the off-payline row that lights up (director.ts:1170,
`MACHINE_TOP + 30`). With a LUCKY WILD there, "LUCKY WILD!", the huge WILD burst and "THE DROP!" all stack on the top row.
Screenshots: `pt_drop2_a.png`, `pt_drop2_b.png`, `pt_drop1_a.png`. Move the callout above the machine (over the HUD gap)
or to the middle.

**V2. The order reads backwards.** The payline notes hit first (PAIR!/JACKPOT! banner, the big number). Then "THE DROP!",
then a smaller second number. In `pt_drop1_a.png` the payline jackpot hit for 396 before THE DROP showed up; the drop
itself added 20. The payline notes also don't flash with the drop cells (`cells` excludes row 1). The climax lands after
the biggest number. Suggest: callout first, light all visible notes including the payline, then a single total (or
payline and drop numbers in quick succession).

**V3. A drop with no off-payline notes** still plays THE DROP! (shake, bass) with nothing lit and no hit (probe O: 0
cells, 0 damage). Either light the payline notes or show "THE DROP!" small.

**V4. The drop's projectile is a giant SWORD** from the machine centre (director.ts:808: every attack uses
`swordProjectile`, at scale 6 when there are no reels). On the signature move it should be notes, from each lit cell
(`pt_drop1_c.png`). This is global (JAX's cards fly as swords too), but THE DROP is where it shows most.

**V5. ENCORE has no callout.** After the first drop the meter just stays "VOLUME READY!" (director.ts:1161 returns early
for `volume`). A small "ENCORE!" would sell the card.

**V6. "MAX VOLUME! THE BEAT DROPS NEXT SPIN!"** is wider than the machine and runs past its left edge (x ≈ 108; the
machine starts at 170). Screenshot: `pt_hype_armed_a.png`.

**V7. Looks right:**
- The meter pips fill with a note projectile per note (`pt_meter_tick.png`).
- The VOLUME READY! label.
- The ECHO overlay (cyan ×2 tag) on note cells and in the reel table (`pt_next_build.png`).
- The hero portrait, the machine select card (`pt_select.png`), the 5 bonus round cards with their icon tags
  (`pt_choice1.png`, `pt_choice2.png`) and the ECHO collection tile (`pt_coll_echo.png`).
- Off-payline drop cells are the right ones, slimed cells are skipped, and lucky WILDs on rows 0/2 show at the drop.

Not captured cleanly: SKIP! (the frost imp froze the forced line twice). From the code, it pops at the last lit pip in the
dim color (director.ts:1108).

---

## BALANCE (`tools/sim/table.ts 600 jukebox`)

| WHITE | act1 | House | Mirror | f4 deaths | GREEN | Dealer | a3 deaths |
|------:|-----:|------:|-------:|----------:|------:|-------:|----------:|
| 44.7  | 89.8 | 94.7  | 58.5   | **2.7%**  | **19.3** | 47.9 | 4.4% |

- **Gates:** WHITE 44.7 is inside but at the top of 41-45. GREEN 19.3 is just over 16-19. Fight-4 deaths 2.7% are under
  3-6%. N600 noise is about ±2, so this is borderline rather than broken. Act 1 (89.8) and the House (94.7) are very easy.
  The Mirror (58.5) is where runs die.
- **Bonus round cards** (taken / run won%, all rows; average about 32%):
  - **HYPE MAN 57%** (n=56) is the clear outlier. A guaranteed drop at least every 3 spins outweighs the half-pay notes.
  - **FEEDBACK 23%** (n=47) is the weakest of the five. Reset to 0 costs more than the no-skip is worth.
  - ENCORE 32% and HEADLINER 31% are the most taken (153 and 134) and sit at the average.
  - BACKUP DANCERS 36%.
  - General cards on this machine: QUICKENING 50%, WHETTED 54% (small n). FOUR LEAF 13% and DOUBLE OR NOTHING 16% are
    traps on THE JUKEBOX.
- **Endless** (`endless.ts 150`): THE JUKEBOX is the weakest rider. Loop 2 62% and loop 3 7%; the others are 81-97% and
  32-91%.
- **Watch: JACKPOT BELL.** On a drop spin, a note jackpot re-arms the volume (fight.ts:727 runs after the reset), so the
  next spin drops again: a free ENCORE on every jackpot drop (probe L).

---

## DESIGN OPINIONS (short)

- **The payline is the weak point of the fantasy.** "Every note hits" is two hits with two numbers, and the payline
  usually out-damages the drop. Present the drop as one beat that includes the payline (and let HEADLINER cover it).
- **HYPE MAN wants a nerf, FEEDBACK a buff.** HYPE MAN: +1 every other spin, or notes ×0.4. FEEDBACK: drop to 2, not 0,
  or add "+1 volume per note while under 3".
- **Cut the volume to integers in the UI** (I5). The machine is about counting to 6. Showing 6 pips and "4/6" would make
  BATTERY, TURNTABLE and HEADLINER read at a glance.
- **Give THE JUKEBOX a real counter.** The Counterfeiter on ECHO builds is fine. For the Grounder, "a rod on a note: that
  note skips the record" would be on theme.
- **Retire BRIAR fully** (B2): the challenge, the collection and the coach. One leftover path into a machine the user
  retired is worse than none.
