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
 * and its top edge (its title tab sits above it). */
export const GUTTER_PANEL_W = 188;
export const GUTTER_PANEL_Y = MACHINE_TOP + 124;

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
