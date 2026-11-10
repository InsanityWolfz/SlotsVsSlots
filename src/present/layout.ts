import type { SideId } from '../core/config';

/** Logical canvas size; the canvas is scaled to fit the window. */
export const W = 1280;
export const H = 720;

/**
 * Reel cell pitch and symbol art scale INSIDE a machine (16px art × 5 = 80px, leaving a gap in the 96px cell). The
 * machine is drawn scaled by MACHINE_SCALE (the fight screen lost its title marquee, UI kit 2026-10-30: the reels took
 * the room), so on screen a cell is CELL px and a symbol's art pixel is exactly 6px.
 */
export const PITCH = 96;
export const ART_SCALE = 5;
export const MACHINE_SCALE = 1.2;
/** A reel cell's size on screen. */
export const CELL = PITCH * MACHINE_SCALE;
export const REELS = 3;
export const ROWS = 3;

/** The reel window's size on screen (inside the machine's own drawing it is PITCH × 3 before the scale). */
export const MACHINE_W = CELL * REELS;
export const MACHINE_H = CELL * ROWS;
export const MACHINE_TOP = 198;
/** The machine's frame (bezel) around the reel window, on screen. */
export const BEZEL = 18 * MACHINE_SCALE;

export const MACHINE_CX: Record<SideId, number> = { player: 342, enemy: 938 };

/** The boss's panel in the gutter between the machines (THE POT, the Dealer's hand, THE WHEEL's table): its width,
 * its top edge (its title tab sits 18 px above it), its height, and how far under it its one rule line sits. From the
 * tab's top to that line's foot it fits between the turn banners' band and the pay banner (tests/fightLayout). */
export const GUTTER_PANEL_W = 188;
export const GUTTER_PANEL_Y = MACHINE_TOP + 87;
export const GUTTER_PANEL_H = 120;
export const GUTTER_PANEL_LINE = 16;

/**
 * THE FIGHT SCREEN'S HOMES (user, 2026-11-10: labels piled on each other "when certain things trigger at the same
 * time"). Everything that can show in a fight has one of these, and no two homes share pixels:
 * - the HUD row (top): your chips and stake, the two HUD panels, each with its chips hanging from its bottom edge;
 * - TURN_BANNER_Y: the band between the HUDs and the reels, for turn banners (an ability, OVERTIME!, LIGHTNING STORM);
 * - CALLOUT_Y: a machine's top edge, for the small callouts about that machine (BLOCKED!, +2 CHIPS, THE DROP!); the
 *   YOUR SPIN / THEIR SPIN ribbon hangs there too and steps aside for them; a second callout goes inside the top
 *   reel row (TOP_ROW_Y), a third waits its turn;
 * - HIT_Y: the big numbers of a hit, over the struck machine's top row (under the banner band); TOP_ROW_Y: a
 *   machine's own big callout (MAKE IT RAIN!), in the same row under the reels' status badges;
 * - the gutter between the machines: the boss's panel (GUTTER_PANEL_Y) or VS, then BUILD-UP at its foot. Its top
 *   stays empty: the rooms hang their signs there;
 * - PAY_BANNER_Y: the pay banner, over the machines' bottom row (the row that never pays), and THE PAY STACK hanging
 *   under it (PAY_STACK); BUILD-UP's plate steps aside while they're up (it is what's being paid out);
 * - a machine's bottom edge: your HOLD chip;
 * - the bottom bar: AUTO, SPIN, SPEED; then the fight's own line (STATUS: SPIN n, OVERTIME, the boss or loop label);
 *   then SOUND and PAUSE;
 * - the left edge: the BUILD handle and the RELIC FEED.
 */
export const TURN_BANNER_Y = 205;
export const CALLOUT_Y = MACHINE_TOP - 18;
/** The least a float moves to get clear of another (a hit's second number goes this far down, or its own height). */
export const CALLOUT_ROW = 32;
export const HIT_Y = MACHINE_TOP + 84;
/** A machine's own big callout (MAKE IT RAIN!, HIGH ROLLER X2!, MARKED): inside its top row, under the reels' status
 * badges (FROZEN, JAM, JINX counts sit in the row's top 42 px) and over the payline. */
export const TOP_ROW_Y = MACHINE_TOP + 64;
/** Where words over a machine's top may sit: its edge, or inside the top reel row. (Two rows: the top reel row has
 * room for one line of words under the badges. A third callout waits its turn: Director.popText.) */
export const CALLOUT_ROWS = [CALLOUT_Y, TOP_ROW_Y];
export const PAY_BANNER_Y = MACHINE_TOP + 283;
/** THE PAY STACK: never wider than this (it hangs between your HOLD chip and the enemy's reels), and never lower than
 * `bottom` (the SPEED button starts under it). */
export const PAY_STACK = { maxW: 300, bottom: 622 };
/** The fight's own line in the bottom bar: its left edge (right of SPEED) and the bar's centre line; the boss or loop
 * label sits on a second row under it. */
export const STATUS = { x: 552, y: 648, row2: 684 };

/** Screen rect of a machine's reel window. */
export function reelWindow(side: SideId) {
  const x = MACHINE_CX[side] - MACHINE_W / 2;
  return { x, y: MACHINE_TOP, w: MACHINE_W, h: MACHINE_H };
}

/** Center of a visible cell (row 0 = top). */
export function cellCenter(side: SideId, reel: number, row: number) {
  const r = reelWindow(side);
  return { x: r.x + CELL * (reel + 0.5), y: r.y + CELL * (row + 0.5) };
}

/** The HUD panels' top edge (the fight screen's first row: no title over them). */
export const HUD_TOP = 16;

/** The player's relic column (top left): 4 wide so 10-12 relics never slide under the strip map. */
// Your relics in a fight: the grid inside the BUILD pane (same cells as on the run screens: 8 across from y 606), when
// it's popped out; closed, a relic that fires shows under your chips (RELIC_FIRE_Y).
export const RELIC_X = 40;
export const RELIC_Y = 606;
export const RELIC_COLS = 8;
export const RELIC_PITCH = 34;
export const RELIC_SHOWN = 32;
// ...closed, a relic that fires shows in the RELIC FEED: a column in the gutter left of your machine (clear of the BUILD
// handle, x 0-30), newest on top. Each row is the icon and the name (two short lines); it shows `life` seconds.
export const RELIC_FEED = { x: 48, y: 160, row: 50, max: 6, life: 1.8, fade: 0.35 };
export const relicSlot = (i: number) => ({ x: RELIC_X + (i % RELIC_COLS) * RELIC_PITCH, y: RELIC_Y + Math.floor(i / RELIC_COLS) * 30 });

export const COLORS = {
  bgTop: '#29123d',
  bgBottom: '#0d0519',
  gold: '#d9a640',
  goldLight: '#ffe08a',
  panel: '#1a1426',
  panelLight: '#2c2140',
  outline: '#140c1c',
  text: '#f4ead2',
  textDim: '#9a8fae',
  hp: '#e0373f',
  hpGhost: '#ffffff',
  shield: '#3b8ef0',
  energy: '#ffd23f',
  slime: '#5ed15a',
  danger: '#ff3b30',
  pair: '#ffc93c',
  triple: '#ff3a2e',
  /** THE PAYOUT LADDER above JACKPOT: BIG WIN (electric cyan) and MEGA WIN (hot pink), each its own colour. */
  bigWin: '#52f0ff',
  mega: '#ff6ad5',
};
