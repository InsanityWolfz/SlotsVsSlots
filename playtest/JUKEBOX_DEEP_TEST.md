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

---

## RETEST (after ee29453)

Build `ee29453`. `npm test` 255/255. `tsc --noEmit` clean. `fuzz.ts 300`: 18000 runs, 0 crashes, NO INVARIANT BREAKS.
Harnesses (throwaway, scratchpad only): `rt/probe.ts` (fixed 3x3 windows), `rt/simhook.ts` (hooks `Fight.step` in 1200
real sim runs: 170,807 drops, 1,396 vs the Mirror), `rt/hype.ts`, `rt1-4.cjs` (Playwright).
Screenshots: `scratchpad/shots/rt_*.png` and the contact sheets `sheet_drop1/2.png`, `sheet_e2a/b.png`, `sheet_skip.png`.

### FIXED
- B1: ECHO survives a profile save and reload (localStorage holds it; the collection shows the ECHO tile after a reload: `rt_collection.png`).
- B2: BAD BLOOD is now TOUGH CROWD (THE JUKEBOX, title ONE-HIT WONDER: `rt_challenges.png`). The collection has no THORNY, CACTUS, BRAMBLE or HEDGE tiles.
- B3: BATTERY starts at volume 3.
- B4: the drop skips carded, stolen, slimed and grounded cells and jammed reels. A counterfeit gold does nothing (594 = plain).
- B5: a grounded payline note doesn't turn the volume up (3 grounded notes: volume stays 0). The GROUNDER blurb is updated.
- B6: HYPE MAN's arm carries `dropsNow` and drops on the same spin (s1, s3, s5...). The director skips the "next spin" text then (director.ts:1153).
- B7: the note reads "VOL +120%" at 6, and the comments are fixed.
- I1: HEADLINER doubles the whole drop, payline included (594 to 1188).
- I2: UNDERDOG, HOT STREAK, GLASS CANNON, BELL and the rest apply to the drop group, including the synthetic group.
- I3: TURNTABLE plus FEEDBACK leaves the volume at 5.
- I4: QUICKENING starts at 6/6 and the first spin drops.
- I5: the HUD reads levels: 6/6, 4/6 to 3/6 on SKIP!, and 8/8 with HEADLINER (`rt_hud_ready.png`, `sheet_enc1.png`).
- I6: FEEDBACK now reads "THE RECORD NEVER SKIPS". I7: the coach says VOLUME. I8: KEEN and VAMP mention notes.
- I9: the machine card mentions the skip. The +20 HP drop heal is still unstated (the same gap as JAX's, so not reopened).
- I11: `note` and `echo` are in the reel table sort order, and the log abbreviation is `NTE`. I10 (ENCORE name): skipped, as the user asked.
- V1: the callout sits above the machine, in the HUD gap.
- V2: the order is now callout, then every note lights up (payline too), then the PAIR!/JACKPOT! banner, then the hit.
  Verified frame by frame (`sheet_drop1.png`, `sheet_drop2.png`, `sheet_e2b.png`).
- V3: the code shows "THE DROP... NO NOTES" when no notes land. Not captured on screen.
- V4: the drop flies a note from each lit cell (`rt_drop_20.png`).
- V5: "ENCORE!" pops on the second drop (`rt_e2_11.png`).
- V6: "MAX VOLUME! DROP NEXT SPIN!" fits under the machine (`rt_armed_text.png`).
- JACKPOT BELL no longer re-arms on the drop spin (volume 3 after a jackpot drop).
- Mirror: the enemy side never touches the drop code (0 enemy drop events in 1,396 Mirror drops, guarded by `player`). src/sim is fine.

### STILL OPEN / NEW
**N1 (medium, new): one hexed payline reel halves the whole drop, and that reel's off-payline notes are halved twice.**
- `dropNotes` halves the off cells on a hexed reel (fight.ts:1514). Then the group HEX rule halves the whole group,
  because it touches a hexed payline reel (fight.ts:1206).
- Probe, 9 notes at volume 6:
  - plain: 594;
  - hex on reel 0: **264**, where about 495 was expected (the off notes on reels 1-2 lose half, and reel 0's lose 3/4);
  - shields on the payline, hex on reel 0: 110 (only the hexed cells lose).
- So the same hex costs 22 or 330 depending on the payline.
- Fix: on a drop group, halve per cell (`dropNotes` already does it for the off cells) and skip the group HALF. Or skip
  the per-cell halving and keep the group HALF, but not both.

**N2 (low-medium, new): "THE DROP is one hit" is false in 21% of drops** (36,222 of 170,807 in the sim).
- The rule is `inOrder`. A payline like `[shield, note, note]` or `[note, shield, note]` makes two unmatched note
  groups. Only the first becomes the drop group (fight.ts:990). The second note hits on its own.
- In the browser that second hit flies a SWORD after the note volley (`rt_drop_20.png`), and it isn't in the drop's number.
- Probe:
  - `[note, shield, note]` hits 154 and 22;
  - `[note, lock, note]` (a jammed middle reel) hits 110 and 22.
- Fix: on a drop spin, fold every payline note group into the drop group.

**N3 (low, new): VAMP heals twice on a drop that has vamp on the payline and off it** (10% of drops in the sim).
- `vampHeal` fires for the drop group's payline reels. Then `volumeAfterSpin` heals `dropOff.vamp` again (fight.ts:1533).
- Probe 9: two heals of 20. The "once per group" rule breaks now that the drop is one group.
- Fix: in `volumeAfterSpin`, heal only if the group had no payline vamp. Or fold `off.vamp` into the group's `vampHeal`.

**N4 (low, new): the collection headers count retired finds.**
- menus.ts:1010 and 1030 use the raw `found.charms.length` and `found.relics.length`.
- With an old save holding thorny, cactus, hedge and bramble: "CHARMS 4/9" with 3 tiles lit, and "RELICS 5/58" with
  2 tiles lit (`rt_collection.png`).
- The achievements use `foundCount` and are correct. Fix: use the same filter as `foundCount` (profile.ts:18).

**N5 (low, visual): SKIP! pops on the shield bar row and overlaps the "+90" shield-gain number** (`rt_skip_0.png`,
director.ts:1119). Put it on the volume bar line or to its right.

**N6 (low, consistency):**
- A grounded note ON the payline still lights and hits in the drop. Grounded notes OFF the payline sit out.
- The synthetic drop group is flagged `matched: true` (fight.ts:992), so HOT STREAK's "x2 on a match" doubles a drop with
  no note on the payline (132 to 264). An unmatched payline-note drop group doesn't get it.
- Neither is wrong by the rules text. Pick one rule for each.

**Balance watch (by design of the merge, not a bug):**
- The payline's tier now multiplies every off-payline note. Average drop hit by payline tier in the sim:
  no match 693, pair 2,431, jackpot 6,375, so a jackpot drop is about 9x a no-match drop.
- So the payline still decides most of the drop. The fantasy "every note hits" now plays out as "the payline note
  multiplies everything".
- Pair/jackpot relics (KEY, PRISM, BELL, the jackpot multiplier) now double all nine notes: a pair drop is 352, and 704
  with KEY.
- Gold charms off the payline ADD into the group: 6 gold notes in view turn a 594 drop into **7,128** (x12).
  - That follows the "gold adds" rule, but on THE JUKEBOX the window is 9 cells, not 3.
  - So gold on notes is about 3x as strong as on any other machine.
  - Watch GOLD and ECHO notes in the next table and the challenge ladders.

### NUMBERS (`table.ts 1000 jukebox`)
| WHITE | act1 | House | Mirror | f4 deaths | hpH% | hpM% | GREEN | Dealer | hpD% | a3 deaths | a3 lost | jack% | chips/f | power M/A3/D |
|------:|-----:|------:|-------:|----------:|-----:|-----:|------:|-------:|-----:|----------:|--------:|------:|--------:|-------------|
| 42.9 | 88.8 | 95.4 | 54.9 | 4.6% | 94.5 | 92.9 | 17.5 | 50.3 | 81.1 | 5.7% | 22.2 | 34.0 | 8.6 | 1063 / 2781 / 4544 |

- All three gates hold: WHITE 41-45, GREEN 16-19, fight-4 deaths 3-6%.
- JUKEBOX cards (taken / won%): ENCORE 259 / 35%, HEADLINER 218 / 24%, HYPE MAN 90 / 37%, BACKUP DANCERS 88 / 31%,
  FEEDBACK 65 / 28%.
  - HYPE MAN's outlier (it was 57%) is gone.
  - HEADLINER is now the weakest (24%). Max 8 costs two extra spins per drop, and x2 doesn't make up for it.
  - Other traps on this machine: GLASS CANNON 17%, FOUR LEAF 21%, CURSED IDOL 23%.
- `simhook` greedy N400 per stake: WHITE 43.8, GREEN 16.5, GOLD 14.3.
