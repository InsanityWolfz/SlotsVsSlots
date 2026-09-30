import type { Levels } from '../core/config';
import { BONUS_SYMBOLS } from '../core/strip';
import { drawReelTable, liveTable } from '../ui/reelTable';
import { drawText } from '../render/text';
import { COLORS, MACHINE_TOP } from './layout';
import type { MachineView } from './machine';

const X0 = 18;
const COL_W = 42;
const TOP = MACHINE_TOP - 6;
const HEIGHT = 300;

/**
 * YOUR REELS during a fight: the same table as the draft and the Cashier (columns 1 2 3, a row per
 * symbol + charm with a count), live, so enemy damage (slime, stolen cells, marks, bombs) shows as rows.
 */
export function drawStripMap(ctx: CanvasRenderingContext2D, m: MachineView, _time: number, levels?: Levels): void {
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(X0 - 8, TOP - 30, COL_W * 3 + 12, HEIGHT + 40);
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(X0 - 5, TOP - 27, COL_W * 3 + 6, HEIGHT + 34);
  drawText(ctx, 'YOUR REELS', X0 + (COL_W * 3) / 2 - 4, TOP - 16, 1.5, COLORS.textDim);
  drawReelTable(ctx, X0 - 2, TOP - 4, liveTable(m.reels, BONUS_SYMBOLS), { colW: COL_W, rowH: 22, scale: 1, text: 1.5, maxRows: 12, levels, maxH: HEIGHT + 6 });
}

/** Where rocks should fly to for a given reel (centre of that column). */
export function stripMapColumn(r: number): { x: number; y: number } {
  return { x: X0 + r * COL_W + COL_W / 2 - 4, y: TOP + HEIGHT / 2 };
}
