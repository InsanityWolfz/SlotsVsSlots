# UI/UX audit, round 2: P1 follow-ups (2026-10-07)

Source: the `scratchpad/ui1/` and `scratchpad/ui2/` shots. Round 1 landed well. The headliner cards read at a glance,
NEW RUN leads the main menu, and only one button breathes per screen. What's left is mostly clipping, empty slots and
two callouts landing in the same spot. Panel coordinates are relative to the card's origin. `rs` = `src/ui/runScreens.ts`.

1. **Main menu: the quiet buttons sit on the chip-pile art** (`01_main`). `src/ui/menus.ts:228,237`:
   RESET SAVE (x 450-610, y 674-706) covers the left of the pile (x ~548-730, y 620-705).
   Move LIGHTNING to centre x 265 (w 200) and RESET SAVE to centre x 455 (w 160). Both fit between the PLAYTEST
   BUILD label (ends at x ~150) and the pile.

2. **Fight: two callouts collide over the player machine** (`21_late_fight`). The meter READY plate
   (`director.ts:1124`, at `MACHINE_TOP-18` = y 254) lands on top of CHIP CHARM +N (`director.ts:253`, at `c.x+80, MACHINE_TOP-22`),
   and the plate cuts its text ("HIGH ROLLER! NEXT ... PAYS!"). Move the meter callout under the machine to
   `(MACHINE_CX[side], MACHINE_TOP + MACHINE_H + 22)` = y 582. That slot is free (the buttons start at y 626), so the
   machine top stays for charm labels.

3. **Fight: the shield-gain number spills out of the HUD** (`21_late_fight`, "+475" at x 430-508, past the HUD's right
   border at x 500). `director.ts` `shieldGain`, the last popText `+${e.amount}` at `sb.x+sb.w-24`, scale 3:
   draw it at scale 2.5 and anchor its right edge at `sb.x+sb.w-6` (right-align, or offset x by -width/2).

4. **Fight: FREE RESPIN! has no plate** (`65_fight_early`: green 3x text over the top-row symbols, y ~298).
   `director.ts:1973`: pass `plate = true` and move it to `MACHINE_TOP + 48`, the same treatment as the READY callout.

5. **Enemy card front: the boss blurb slot can be empty or tiny** (`j_dealer`: blank row at y+62; `l_mirror`: blurb at 1.5x).
   `rs` `drawPanelFront` ~1517: when `blurbScale` is 0 or 1.5, wrap to 2 lines at 1.5x (y+56 and y+70) and never
   draw it at 0. Better still, add a short `BOSS_BLURB` per boss: dealer "THE HOUSE'S PARTNER",
   mirror "IT PLAYS YOUR HITS BACK", both at 2x.

6. **Mirror front: the ability slot is empty** (`l_mirror`: nothing between the HP bar and the footer, y+120-190).
   `rs` `drawPanelFront` ~1529: when `!e.ability && e.boss === 'mirror'`, fill the slot with the same pattern.
   - Icon: `ABILITY_UI.reflect.icon` 3x at (tx+12, 138).
   - Label: "REFLECTION" 2.5x `#ff9a3a`.
   - No pips. The effect line at y+166: "A THIRD OF YOUR LAST HIT, PER SHARD".

   The footer headline then repeats less, so change it to "CRACKED AT HALF HP: IT THROWS HALF".

7. **Elite ribbon covers the portrait's head** (`f_elite`, `c_fork`). `rs` `drawPanelFront` ~1505:
   - Move the ELITE strip to the **bottom** of the stage (`sy + st - 18`, the floor), where it reads as a nameplate.
   - The `voucherRelic` at (sx+14, sy+st-12) at 1.5x reads as noise on the shoulder. Move it to the header at 2x, just
     left of the skulls at `(w - 24 - 3*30 - 6, 20)`. The reward then sits next to the danger.

8. **Fork card front: the cadence has no words** (`c_fork`: three tiny squares with no "EVERY N").
   `rs` ~1547 `if (!fork)`: on forks, draw `EVERY ${every}` at 1.25x `COLORS.textDim` after the pips. At w 452 there's room:
   the pips end around x+312 and the card's text area ends at x+436.

9. **The card back is sparse and its footer is small** (`b_next_back`: one line, then 120px of nothing; `e_fork_back`).
   `rs` `drawPanelBack` ~1619-1628:
   - THEIR REELS label 1.25x → 1.5x at y+212.
   - Icons and counts 1.5x → 2x, spaced 56px apart at y+236.
   - DANGER label 1.25x → 1.5x.
   - The ability sentence starts at y+60: on single cards (`w >= 600`), start it at y+72 and draw it at 2.5x when it
     fits in 2 lines. The back should feel deliberate, not like a gap.

10. **Fork: the dimmed card goes muddy brown** (`d_fork_hover`, `e_fork_back`, right card). `rs` `drawEnemyPanel` ~1453:
    `globalAlpha 0.75` blends the panel and the tinted stage with the carpet. Keep alpha 1 and, after drawing the
    other card, fill its rect with `rgba(7,4,14,0.35)`. It reads as "in shadow", which matches the scrim language of
    the drawer.

**Checked and fine:** the drawer scrim and spring; the quiet LOG/SOUND/QUIT; the shop tip opening above the item
(clear of the header, `51_shop_a1_hover`); the secondary REROLL and MENU; the boss title in red; the OR coin.
Not judged: in `66_fight_drawer` AUTO and SPIN still draw over the open drawer. The script sets `g.buildOpen`
directly, so this is likely an artifact. Confirm it by opening the drawer through the handle.
