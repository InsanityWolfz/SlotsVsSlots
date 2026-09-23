import { wrap } from '../core/strip';
import { drawSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';
import { COLORS, MACHINE_TOP } from './layout';
import type { MachineView } from './machine';

const X0 = 18;
const COL_W = 40;
const TOP = MACHINE_TOP - 6;
const HEIGHT = 300;

/**
 * Whole-strip view of the player's reels, centred on the payline, so persistent damage
 * (slime, stolen holes, golem rocks) is visible beyond the 9 cells in the window.
 */
export function drawStripMap(ctx: CanvasRenderingContext2D, m: MachineView, time: number): void {
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(X0 - 8, TOP - 30, COL_W * 3 + 12, HEIGHT + 40);
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(X0 - 5, TOP - 27, COL_W * 3 + 6, HEIGHT + 34);
  drawText(ctx, 'STRIPS', X0 + (COL_W * 3) / 2 - 4, TOP - 16, 2, COLORS.textDim);

  m.reels.forEach((reel, r) => {
    const n = reel.cells.length;
    const cellH = Math.max(10, Math.min(22, Math.floor(HEIGHT / n)));
    const shown = Math.min(n, Math.floor(HEIGHT / cellH));
    const half = Math.floor(shown / 2);
    const cx = X0 + r * COL_W + COL_W / 2 - 4;
    const midY = TOP + HEIGHT / 2;
    for (let k = -half; k < shown - half; k++) {
      const idx = wrap(reel.stop + k, n);
      const cell = reel.cells[idx];
      const y = midY + k * cellH;
      const visible = Math.abs(k) <= 1;
      ctx.fillStyle = visible ? (k === 0 ? 'rgba(255,224,138,0.28)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.03)';
      ctx.fillRect(cx - 17, y - cellH / 2 + 1, 34, cellH - 2);
      const stolen = cell.stolen ?? 0;
      if (stolen >= 1) {
        ctx.strokeStyle = 'rgba(180,160,220,0.4)';
        ctx.strokeRect(cx - 8, y - cellH / 2 + 2, 16, cellH - 4);
      } else {
        const scale = cellH >= 18 ? 1 : cellH / 18;
        drawSprite(ctx, cell.symbol as SpriteId, cx, y, scale * (cell.pop ?? 1), { dim: cell.goo > 0.5 ? 0.5 : 0 });
        if (cell.goo > 0) {
          ctx.globalAlpha = 0.55 * cell.goo;
          ctx.fillStyle = COLORS.slime;
          ctx.fillRect(cx - 12, y - cellH / 2 + 2, 24, (cellH - 4) * cell.goo);
          ctx.globalAlpha = 1;
        }
      }
      if (cell.enh && stolen < 1) {
        // Gilded: a gold tick on the cell.
        ctx.fillStyle = cell.enh === 'gold' ? '#ffd23f' : cell.enh === 'keen' ? '#bff4ff' : cell.enh === 'charged' ? '#fff27a' : '#c9d0dc';
        ctx.fillRect(cx + 11, y - cellH / 2 + 2, 4, 4);
      }
      if (m.frozen[r] > 0 && visible) {
        ctx.globalAlpha = 0.35 + 0.1 * Math.sin(time * 3);
        ctx.fillStyle = '#9fe8ff';
        ctx.fillRect(cx - 17, y - cellH / 2 + 1, 34, cellH - 2);
        ctx.globalAlpha = 1;
      }
    }
    // Payline marker.
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillRect(cx - 19, midY - 1, 3, 2);
    ctx.fillRect(cx + 16, midY - 1, 3, 2);
    drawText(ctx, `${n}`, cx, TOP + HEIGHT + 2, 1, n > 14 ? '#c9a27a' : COLORS.textDim);
  });
}

/** Where rocks should fly to for a given reel (centre of that column). */
export function stripMapColumn(r: number): { x: number; y: number } {
  return { x: X0 + r * COL_W + COL_W / 2 - 4, y: TOP + HEIGHT / 2 };
}
