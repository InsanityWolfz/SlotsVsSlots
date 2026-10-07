# UI/UX audit: Slots vs. Slots (2026-10-07)

Auditor: UI/UX pass (Balatro / StS / Luck be a Landlord polish bar). Build: dev server, commit `64463b1`.
Screenshots: `scratchpad/uiux/*.png` (scripts `ux.cjs`, `over.cjs`, `fire.cjs` next to them).
I didn't edit anything under `src/`. Out of scope because they're already in flight: the shop backdrop and price tags,
the ON THE COUNTER label, the REPO MAN liens (HELD / PAY OFF / TOLL BOOTH), and the boss chip-shield line.

The guiding rule for every item below is **one loud thing per screen**. Every other element should either be quiet or
sit behind a hover. The game already has good bones: the pixel art, the map and the shop shelves are strong. Most of the
problems come from **flat hierarchy**. Every button pulses, every panel has the same gold frame, and long rule sentences
sit at full brightness next to the numbers that matter.

---

## 1. Verdict per screen

| Screen | Verdict | The main issue |
|---|---|---|
| **Main menu** (`01_main`) | Good. The marquee logo is the star. | NEW RUN is styled the same as CHALLENGES and TUTORIAL (a dark panel with a gold frame), so the eye doesn't land on it. LIGHTNING: FULL and **RESET SAVE** sit in the top corners at full button weight, and RESET SAVE is destructive. |
| **Machine select** (`06_machines`) | OK. The art carries it. | Each card has 4 text tiers. The blurb is at scale 1 ("THE DEPENDABLE ONE") and can't be read. HP is buried at the end of the rule sentence. "PLAY AS" is redundant next to the hero sprite. |
| **Next fight + enemy panel** (`08_next`, `60_fork`, `62_boss`, `20_late_next`) | **The weakest screen.** | The panel is a text sheet. Name, blurb, HP, ability, reels and boss rules all have about the same weight. The danger skulls render at 16px and read as dots. HP is a small red word. On a fork the ELITE line runs into "OR". The boss paragraph at 1.5x crowds the bottom border. See §2. |
| **Fight + HUD** (`65_fight_early`, `91_fight_mid`, `21_late_fight`) | Strong. The machines, glow and turn arrow read well. | The meter READY popText is drawn across the player HUD and can't be read (`21_late_fight`). The bottom bar has 7 identical gold buttons (AUTO, SPIN, SPEED, TUNE, LOG, SOUND, QUIT) for a watch-only game. The centre gutter stacks 5 labels. Firing relics hop onto the reel frame's top edge (`90_fire`). |
| **Fight, BUILD drawer open** (`66_fight_drawer`) | Works. | "STAKE 2 GREEN" (the chips' sub-line) prints over the drawer's hero row. The fight behind isn't dimmed, so the drawer doesn't read as a layer. |
| **Draft** (`68_draft_fresh`, `22_late_draft`) | Good. Cards deal in and the icons are big. | The REEL N marker label is at scale 1. There are about 200px of dead space under the cards. That's fine; leave it. |
| **Big choice** (`70_choice`) | Good and clean. | The COST block is at 1.5x salmon and looks like fine print. That suits a "price" card, so keep it. |
| **Shop** (`50_*`, `51_*`, `23_late_shop`) | Much improved (shelves, glass case). | The hover tip opens beside the item and covers the neighbouring items and their prices (`51_shop_a1_hover`). REROLL and LEAVE are both red, pulsing primaries. |
| **Bonus wheel / Relic Rush** (`30_*`) | Wheel: good. Rush: good. | Rush: the "UNCOMMON!" banner sits on the grid's top border (`30_rush_b`). Wheel: PASS and COLLECT have equal weight. |
| **Run over** (`80_over`, `24_late_over`) | Functional. | The death recap is the most useful line on a loss, but it's plain red text. The row detail ("+6 CHIPS") is at scale 1. The bottom 160px are empty. |

**Global finding:** `RunScreens.drawButton` (`runScreens.ts` ~1654) applies the idle pulse to **every** button.
FIGHT!, LEAVE, REROLL, MENU, NEW RUN, PASS and COLLECT all breathe at once, so none of them reads as "the next step".

---

## 2. Enemy panel redesign (`RunScreens.drawEnemyPanel`, `runScreens.ts` ~1272)

### What a player needs at a glance vs. on hover

| At a glance (front of the card) | On hover (back of the card) |
|---|---|
| Portrait, name, **danger 1-3 skulls** | The full ability sentence with exact numbers (`abilityText`) |
| **HP as a bar** (same look as the fight HUD) | ELITE details: +25% HP, relic pick, +N chips |
| **Ability: icon + NAME + cadence pips** (same pips as the fight HUD) + a short effect ("SLIMES 3 OF YOUR SYMBOLS") | THEIR REELS **with counts**, per reel |
| Which symbols it runs (icons only, no counts) | The full boss rules paragraph |
| Boss: **one headline rule** | Danger as words ("DANGER 2 OF 3") |
| ELITE ribbon on the portrait; the Mirror's copied relic (keep it, it's key) | |

The front teaches the fight HUD. The cadence pips, the heart bar and the ability icon look exactly like
`HudView.drawAbility` and `HudView.bar`, so a player who read the panel already knows how to read the fight.

### The look: a "headliner card"

Each enemy gets a little casino marquee. A lit bulb strip across the top carries the name, and the portrait stands on a
spotlit stage. The tier shows in the frame colour and bulb speed:

| Tier | Frame (`panel` border) | Bulbs | Name colour |
|---|---|---|---|
| Regular | `COLORS.gold` `#d9a640` | static, every other bulb lit | `COLORS.slime` `#5ed15a` (matches the fight HUD) |
| Elite | `#ff9a3a` | chase slowly (`floor(time*4)`) | `#ff9a3a` |
| Boss | `#ff6a5a` | chase fast (`floor(time*8)`) | `#ff6a5a` |

Stage tint per archetype (the radial gradient centre, alpha 0.35), all from colours already in the code:
slime `#5ed15a`, frost `#5ad8e8`, thief/hexer `#c9a0ff`, golem/grounder `#c9bba8`, brute/gremlin/bomber `#ff9a3a`,
vampire/house/pitboss/dealer `#ff6a5a`, mirror `#c8f0ff`, croupier/sharp/counterfeiter/mimic `#ffd23f`. The default is `COLORS.gold`.

### Layout: single panel, w = 660, h = 260 (was 300)

The origin is `x = CX - 330 = 466`, `y = 206`, so the panel ends at y = 466. FIGHT! stays at 560 and the bet card at 540.
All offsets below are from the panel's top-left corner.

```
 0                                                              660
 +--------------------------------------------------------------+  y+0
 | o . o . o . o . o . o . o . o . o . o . o . o . o . o . o .  |  bulbs 4x4 @ y+3, every 20px
 |          MANGY SLIME  (3x, x+148,y+22)          [skull][s][s] |  skulls 3x right-aligned, unlit ones at alpha .25
 | o . o . o . o . o . o . o . o . o . o . o . o . o . o . o .  |  bulbs @ y+35   (header band 0..40, panelLight)
 +------------+-------------------------------------------------+  y+40
 | +--------+ |  SLIMES YOUR SYMBOLS        (2x textDim, y+62)  |
 | |  ~~~~  | |  <3 [==========  160  ==========]   (y+96)      |  heart 2x @ tx+8; bar tx+24, w 280, h 20, COLORS.hp
 | | (o_o)  | |                                                 |
 | |  ____  | |  [ico] FLOOD  [ ][ ][#]  EVERY 3 TURNS (y+138)  |  icon 3x; label 2.5x #ff9a3a; pips 12x12, gap 2
 | +--------+ |  SLIMES 3 OF YOUR SYMBOLS   (2x text, y+166)    |
 | stage x+16,y+52, 116x116                                     |
 +--------------------------------------------------------------+  y+198 rule #2a2140 (2px)
 |  [sword] [shield] [slime]                                ( ? )|  y+228: 2x icons 40px apart from x+36; "?" tab x+w-34
 +--------------------------------------------------------------+  y+260
```

- **Header band:** fill `COLORS.panelLight` `#2c2140` at (x, y, w, 40). Draw 4x4 bulbs every 20px at y+3 and y+33. A lit
  bulb is the frame colour and the lit/unlit pattern alternates with `(i + phase) % 2`; an unlit bulb is `#3a2e52`.
  The name sits at (x+148, y+22), scale 3, or 2.5 when longer than 16 characters. The danger skulls are
  `dangerPip` at **scale 3** (24px; at 2x they read as dots), placed at `x+w-24-k*30, y+20`. Always draw 3 skulls, with
  the unearned ones at alpha 0.25, so a 1-skull fight reads as "1 of 3".
- **Stage:** a 3px `COLORS.outline` rim, then a radial gradient from the archetype tint at alpha 0.35 to `COLORS.panel`.
  The floor shadow is `rgba(0,0,0,0.35)` at (x+40, y+150, 68, 8). The portrait is scale 4 at (x+74, y+104 + bob).
  The writer badge is 3x at (x+124, y+160).
  - **ELITE ribbon:** (x+16, y+52, 116, 18), fill `#8a3a10` with a 2px outline, "ELITE" at 1.5x `COLORS.goldLight`.
    Put a 2x `voucherRelic` sprite at (x+30, y+80) so the relic reward reads as a picture. The numbers go on the back.
- **Right column** (`tx = x+148`):
  - Blurb: **1 line** at 2x `COLORS.textDim`, y+62. If it wraps, the full blurb moves to the back.
  - HP: draw it like `HudView.bar` (top highlight `rgba(255,255,255,0.3)` 3px, bottom shade `rgba(0,0,0,0.25)` 3px).
    Show `fmtNum(hp)` at 2x `COLORS.text`, centred in the bar. Drop the "HP" word, because the heart says it.
  - Ability: `ABILITY_UI[kind].icon` at 3x at (tx+12, y+138), and `ui.label` at 2.5x `#ff9a3a` at tx+34.
    Then draw `every` pips in the HUD's style (12x12 `COLORS.outline`, 8x8 inner `#2a2038`), with the **last pip filled
    `#ff5a4a`** to mean "it fires here". Follow with "EVERY N TURNS" at 1.5x `COLORS.textDim`. The effect line below it
    is the short `what[kind]` at 2x `COLORS.text`. REPO keeps its special case only while it still exists.
- **Footer:** regular enemies show their symbol icons at 2x, with no "THEIR REELS" label and no counts.
  **Bosses** show one headline at 2x `COLORS.goldLight` (or `#c8f0ff` for the Mirror):
  House "JACKPOTS STEAL ITS POT", Mirror "ITS SHARDS THROW YOUR HITS BACK", Dealer "IT DEALS CARDS ONTO YOUR PAYLINE".
  These are rules, not hints. Drop the boss icons from the footer and put them on the back.
- **"?" tab:** (x+w-34, y+h-30, 26, 22), fill `COLORS.panelLight`, with "?" at 2x `COLORS.textDim`. It brightens to
  `COLORS.goldLight` on hover. It only signals that a back side exists; hovering anywhere on the card flips it.
- **Mirror copy (GREEN):** keep it on the front at (x+w-40, y+150), under the skulls' column and clear of the HP bar,
  with its relic tip.

### The back of the card (hover ≥ 0.3s anywhere on the panel; tap toggles on touch)

Keep the same frame and header (name + skulls). The body starts at y+52:

1. `abilityText(...)` in full, at 1.5x `COLORS.text`, wrapped to `(w-32)/9` characters, from x+16.
2. If elite: the current ELITE line (`+25% HP, RELIC PICK, +N CHIPS`) at 1.5x `#ff9a3a`.
3. "THEIR REELS": the current per-symbol icon + count row, which is today's code moved down.
4. If boss: the current `bossText` paragraph at 1.5x (it finally has the room).
5. A footer line `DANGER n OF 3` at 1.25x `COLORS.textDim`, bottom-right.

**Flip juice:** keep `flip` (0..1) per panel and ease it toward the target at `dt*12`.
Draw with `ctx.translate(cx, cy); ctx.scale(Math.abs(1 - 2*flip), 1)` and draw the back when `flip > 0.5`.
That's about 20 lines, and it removes about 60% of the front's text.

### Fork variant (w = 452, `drawNext` fork branch)

The positions are the same with these scales: stage 92x92 with the portrait at 3x, the name at 2.5x, the HP bar w 200,
skulls at 2.5x, and the effect line at 1.5x when it's longer than 26 characters.
**OR:** replace the 4x text at (CX, 372) with a coin badge. Draw a circle of radius 22 in `COLORS.outline` with a 3px
`COLORS.gold` ring, and "OR" at 2.5x `COLORS.goldLight` inside. It sits in the 24px gap between the panels and never
covers text. Today the elite line runs under it.

### Panel juice (all local, no full-screen flashes, so FLASH_CAP is unaffected)

- **Entrance** (`showNext`): the panel rises 24px and fades in over 0.3s (`backOut(2)`, the same as the draft cards).
  The portrait lands with a scale tween 1.25 → 1 over 0.18s, plus 4-6 dust particles at the stage floor.
  The skulls pop in one by one (0 → 1 `backOut(3)`, starting 0.2s, 0.08s apart, `sounds.click()` each); a boss's third
  skull uses `stingerMedium`. The cadence pips then fill left to right (0.05s each), and the last one turns red with a
  1.3x punch.
- **Hover:** the card lifts 4px, the frame goes to `COLORS.goldLight`, and the portrait bob goes from `sin(t*2)*2` to `sin(t*5)*4`
  (it "taunts").
- **Boss idle:** the frame colour breathes between `#ff6a5a` and `#ff9a8a` (`0.5+0.5*sin(t*3)`). It's a colour shift,
  never a white overlay.
- **Fork:** the hovered panel scales to 1.02 and the other goes to alpha 0.75. Only the matching FIGHT THIS ONE button pulses.

---

## 3. Prioritized changes

The line counts are estimates. "→ hover" means the text moves into a tooltip or onto the back of the card.

### P1: do first

| # | Screen | Element | Change | Why |
|---|---|---|---|---|
| 1 | Next fight | `drawEnemyPanel` front | The §2 front layout: header band with bulbs, skulls at 3x with unlit ones at 0.25, HP bar, ability icon + label + pips, a 1-line blurb, footer icons without counts. h 300 → 260. (About 60 lines, so split it: header and stage, then the right column, then the footer.) | The panel is the one place players plan, and today it's a wall of same-weight text. |
| 2 | Next fight | `drawEnemyPanel` back | The flip-on-hover back with the full ability text, ELITE numbers, reels with counts and boss rules (§2). About 30 lines. | Deep info stays available but optional, which is exactly the brief. |
| 3 | Fork | `drawNext` "OR" and the ELITE line | OR becomes a coin badge (§2). The ELITE text leaves the front (it's on the ribbon, and the numbers go on the back). About 10 lines. If you do nothing else, at least move the ELITE line to `y+124` at 1.25x. | Bug: "ELITE: +25% HP, RELIC PICK." runs into "OR" (`60_fork`). |
| 4 | Boss | `drawEnemyPanel` bossText | Front: one headline. Back: the paragraph. About 8 lines. | The House paragraph at 1.5x ends 4px from the border (`62_boss`). Dealer and Mirror are longer. |
| 5 | Every run screen | `RunScreens.drawButton` + `Btn` | Add `kind?: 'primary' \| 'secondary'`. Only primary buttons pulse. Secondary: fill `COLORS.panelLight` (hover `#3a2e52`), gold frame, text `COLORS.goldLight`, no pulse. Secondary: REROLL, MENU (run over), PASS (wheel), the side bet steppers (already custom). Primary: FIGHT!/FACE THE..., LEAVE, NEW RUN, COLLECT. About 12 lines. | One button breathing means "this is the next step". Today 2-3 breathe at once. |
| 6 | Fight | `director.ts` ~1123 (meter READY popText) | Move it from `(p0.x+80, p0.y-26)` to `(MACHINE_CX.player, MACHINE_TOP-18)`, scale 2, rise 12. If FloatText can take a backing plate, give it `rgba(20,12,28,0.85)`. 1-3 lines. | It's unreadable today: "HIGH ROLLER! YOUR NEXT PAY MULTIPLIES!" lands on top of the HP and meter bars (`21_late_fight`), and this is the meter's payoff moment. |
| 7 | Fight, drawer | `Game.drawChips` (`game.ts` ~1279) | Skip the `STAKE n NAME` line when `this.drawerT > 0.05` (the drawer already says "ACT 1 - GREEN"). While open, draw a scrim `rgba(6,2,12,0.45)` over `x > BUILD.x+BUILD.w+8` before the drawer. About 5 lines. | The overlap is visible in `66_fight_drawer`. The scrim makes the drawer read as a layer and the fight as paused for your eyes. |
| 8 | Relic Rush | `drawRush`, rushBanner y | Draw the tier banner ("UNCOMMON!") at y 100 with a `COLORS.outline` plate (w = text + 24, h 40), or put it in the empty zone under the grid at y 470. 2 lines. | The banner sits on the grid frame's top border (`30_rush_b`). |

### P2: next

| # | Screen | Element | Change | Why |
|---|---|---|---|---|
| 9 | Main menu | `Menus.showMain` (`menus.ts` ~186-250) | NEW RUN uses the red primary button style (same as FIGHT!). Move LIGHTNING and RESET SAVE to small 1.5x text buttons in the bottom-left row next to "PLAYTEST BUILD" (x 20-360, y 700), dim (`COLORS.textDim`, frame `#4a4058`). RESET SAVE keeps its confirm step. | The title should go marquee → NEW RUN. Two gold-framed buttons at the top corners pull the eye to settings and a destructive action. |
| 10 | Machine select | `drawCabinets` card body | Cut the 1x `cab.blurb` (it can't be read). "PLAY AS SIR REGINALD" becomes "SIR REGINALD" at 1.5x. Strip "300 HP." from the rule and show it as heart 2x + "300" at 2x `COLORS.hp` at (0, h/2-44). The rule stays at 2x, max 4 lines. | It's 4 tiers today; 3 is enough. HP is the one number new players compare. |
| 11 | Machine select | `drawCabinets` hover | On hover the card lifts 8px (`h.lift = -8`, eased) and the machine sprite does one spin: its reel window cycles the signature symbol 3 times over 0.4s. | It's the moment you choose a character, and it should feel like pulling a lever. |
| 12 | YOUR BUILD | `drawBuild` LEVELS + header | LV 1 entries go to `COLORS.textDim` and so does their sprite (`dim: 0.4`). Only LV2+ get gold or charm colour, and MAX stays orange. Delete the "CHIPS" word (the chip sprite says it). 2 lines. | When every row is gold, nothing reads as upgraded. Dimming LV1 makes progress visible at a glance without hiding any rows. |
| 13 | Shop | `drawShopTip` placement | Top shelf: open the tip **above** the item, centred: `x = clamp(h.x - w/2)`, `y = h.y - h.h/2 - tall - 14`. Relic shelf: keep it to the side. 4 lines. | Today the side tip covers the neighbouring items and their prices (`51_shop_a1_hover`). |
| 14 | Fight | `Game.buildButtons` tool row | LOG, SOUND and QUIT become 70x36, with frame `#4a4058` and text `COLORS.textDim` (gold on hover), grouped at x 1010/1090/1170. When AUTO is on, draw SPIN at alpha 0.45 (it's disabled anyway). About 8 lines. | It's a watch-only game, so chrome shouldn't compete with the reels. 7 equal buttons are a toolbar, not a game. |
| 15 | Fight | `RELIC_FIRE_X/Y` (`layout.ts`) + `Game.drawRelics` closed state | `RELIC_FIRE_Y` 244 → 236. Draw a `rgba(20,12,28,0.85)` plate behind the hop row. The first time each relic fires in a fight, show its name at 1.25x `COLORS.goldLight` under the row for 0.8s. About 10 lines. | The hops overlap the reel frame (`90_fire`), and an icon with no name teaches nothing the first time. |
| 16 | Run over | `drawOver` | Detail line scale 1 → 1.5 (`y+12` → `y+13`). The death recap becomes a strip: a `COLORS.danger` 3px frame at (316, 452, 940, 40), the killer portrait at 1.5x on the left, the text at 2x. About 10 lines. | On a loss the recap is the lesson; "+6 CHIPS" at 1x can't be read. |
| 17 | Bonus wheel | `drawWheel` result row | PASS becomes secondary (#5). Before the spin settles, show "SPINNING..." at 2x `COLORS.textDim` at y 560 so the empty zone isn't dead. | Gives the eye one target. |

### P3: polish

| # | Screen | Element | Change | Why |
|---|---|---|---|---|
| 18 | Map | `drawMap` | Hovering a node shows a mini tip: name at 2x + ability icon + label (reuse the `drawRelicTip` box). Track the node centres while drawing. About 20 lines. | Deep players can plan the whole act; casual players never need it. |
| 19 | Fight gutter | `Game.drawGutter` | Drop `g.fightLabel` for regular fights and keep it only for BOSS. The map already says "FIGHT 1 OF 5". 1 line. | 5 stacked labels become 4. ROUND + whose turn is the story. |
| 20 | Enemy HUD | `HudView.drawAbility` | Icon 2x → 2.5x. Draw the last pip in `#ff5a4a` outline (it fires there), matching the new panel. 2 lines. | Same visual language before and during the fight. |
| 21 | Main menu | roster column | Hovering a hero name swaps the right-hand machine sprite for theirs (with the §11 spin). | Free discovery of the 5 Slot Machines from the title. |
| 22 | Draft | `drawCard` reel marker | "REEL N" label 1x → 1.5x, placed at `iy+32`. 1 line. | It's unreadable today. |
| 23 | Next fight | `drawNext` title | The title stays `COLORS.textDim` for regular fights, but on boss fights use `#ff6a5a` at 3x and bob it in once. | The "this one matters" moment. |

---

## 4. Juice for the new UI pieces (all FLASH_CAP-safe: no full-screen fills; white overlays ≤ 0.2 alpha on small rects only)

**BUILD drawer handle** (`Game.drawHandle`)
- Idle nudge: every 8s while shut, the handle slides out 4px and back (0.25s `sineOut`). Stop the nudge once the player has opened the drawer once in the run.
- Hover: w 26 → 30 (eased), and the arrow bobs ±2px in its direction at `sin(t*8)`.
- Open: ease with a small overshoot (`backOut(1.3)`) instead of the linear `dt*14` chase. Fade the drawer contents in
  staggered by section (chips row, hero, reels, levels, relics, 30ms apart). The relic grid icons pop in at
  scale 0 → 1, 15ms apart.
- Close: a 0.15s ease-in with no overshoot. Sound: `click` on open, a softer `click` pitched down on close.

**Shop shelves** (`drawShelves` / `drawShopItem`)
- Stocking: items drop 20px onto the shelf with `backOut(3)` and a 6px dust puff (2-3 `#c49464` particles), 70ms apart, counter first and then the relic case.
- Buying: the item hops in an arc to the BUILD panel's matching section (reels for charms, the levels pane for levels,
  the relic grid for relics) over 0.35s. The chip count does a punch tick-down. The price tag flips (scaleY 1 → 0 → 1) to SOLD.
- Can't afford: the price tag shakes ±3px for 0.2s and `fizzle` plays. Don't use a red flash.
- Reroll: the counter items slide off 40px left and fade, the new ones drop in. The REROLL cost text punches.
- Legendary: one diagonal sheen sweep (a 12px band of `rgba(255,236,150,0.2)`) every 2.5s across the velvet. Replace the current alpha pulse, which reads as flicker.

**Firing relics** (`Game.drawRelics`, closed state)
- Keep the hop + wiggle. Add the first-fire name label (#15). Draw a 2px `COLORS.goldLight` trail from the relic to the
  effect's target (the HP bar, the shield bar or a cell) for 0.15s, so cause → effect reads.
- When 3+ relics fire in one beat, stagger them by 60ms instead of popping them all together.
- The glow stays local (`pop*0.8` on a 40px box), which is fine. Cap the white `flash` on the sprite at 0.5.

**Side bet stepper** (`drawBets`)
- Draw the stake as a **chip stack**: `min(10, ceil(stake/4))` chip sprites at 1.5x stacked 4px apart at (BET_X+90, BET_Y+100).
  +1 or +5 drops a chip onto the stack with a bounce (`coin` sound already plays). -1 or -5 lifts one off.
- The stake number punches 1.3x on each change (only on change, not as an idle sine).
- At MAX the + buttons grey (exists), the stack does one ±2px wobble, and "MAX" pops in at 1.5x `COLORS.goldLight`.
- HOT HAND: replace the sine scale pulse with a 2-frame flicker of a small flame sprite or orange pixels beside the text.

**Levels pane** (`drawBuild` LEVELS)
- When a level changes (draft, shop, wheel), punch that row's LV text to 1.6x → 1 (0.25s `backOut`) and spawn 3
  `#5ad8e8` sparkle pixels. Reaching MAX does one orange sheen sweep over the word.
- A newly owned symbol or charm type slides in from the left (12px, 0.2s) instead of just appearing.
- With #12 in place (LV1 dimmed), the first upgrade animates the colour from dim to gold over 0.3s. That's the payoff beat.

---

### Evidence index
`01_main`, `06_machines`, `07_startpick`, `08_next`, `60_fork` (OR/elite overlap), `62_boss` (paragraph crowding),
`20_late_next`, `65_fight_early`, `66_fight_drawer` (stake line overlap), `90_fire` (hop on the reel frame),
`21_late_fight` (meter popText on the HUD), `68_draft_fresh`, `70_choice`, `51_shop_a1_hover` (tip covers items),
`30_wheel_b`, `30_rush_b` (banner on the frame), `80_over`.
Note: the dev server does full reloads when other agents edit files, so some older scratchpad shots show the loading screen.
