import type { SideId } from '../core/config';

/** Logical canvas size; the canvas is scaled to fit the window. */
export const W = 1280;
export const H = 720;

/** Reel cell pitch and symbol art scale (16px art × 5 = 80px, leaving a gap in the 96px cell). */
export const PITCH = 96;
export const ART_SCALE = 5;
export const REELS = 3;
export const ROWS = 3;

export const MACHINE_W = PITCH * REELS;
export const MACHINE_H = PITCH * ROWS;
export const MACHINE_TOP = 272;

export const MACHINE_CX: Record<SideId, number> = { player: 330, enemy: 950 };

/** Screen rect of a machine's reel window. */
export function reelWindow(side: SideId) {
  const x = MACHINE_CX[side] - MACHINE_W / 2;
  return { x, y: MACHINE_TOP, w: MACHINE_W, h: MACHINE_H };
}

/** Center of a visible cell (row 0 = top). */
export function cellCenter(side: SideId, reel: number, row: number) {
  const r = reelWindow(side);
  return { x: r.x + PITCH * (reel + 0.5), y: r.y + PITCH * (row + 0.5) };
}

export const HUD_TOP = 96;

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
};
