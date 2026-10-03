import type { CabinetId } from '../core/cabinets';
import type { RelicId } from '../core/config';
import { RELICS, relicText } from '../core/relics';
import { COLORS, H, W } from '../present/layout';
import { drawText } from '../render/text';
import { wrap } from './runScreens';

/**
 * Hover tooltips for relic icons, wherever they're drawn: each screen adds a spot as it draws an icon, then draws the
 * tip for the spot under the pointer last, on top of everything.
 */
export class RelicTips {
  private spots: { relic: RelicId; x: number; y: number; r: number; cabinet?: CabinetId }[] = [];

  /** Start a frame: forget last frame's spots. */
  begin(): void {
    this.spots.length = 0;
  }

  /** cabinet: whose rule text to show, when it isn't the current run's (a past run's row). */
  add(relic: RelicId, x: number, y: number, r = 18, cabinet?: CabinetId): void {
    this.spots.push({ relic, x, y, r, cabinet });
  }

  /** The tip for the relic under (mx, my), if any. */
  draw(ctx: CanvasRenderingContext2D, mx: number, my: number, cabinet?: CabinetId | null): void {
    const s = this.spots.find((s) => Math.abs(mx - s.x) < s.r && Math.abs(my - s.y) < s.r);
    if (s) drawRelicTip(ctx, s.relic, s.x, s.y - s.r, s.y + s.r, s.cabinet ?? cabinet);
  }
}

/** A name + rule box under the icon (above it near the bottom edge), kept on screen. */
export function drawRelicTip(ctx: CanvasRenderingContext2D, relic: RelicId, ax: number, top: number, bottom: number, cabinet?: CabinetId | null): void {
  const def = RELICS[relic];
  const lines = wrap(relicText(relic, cabinet), 26);
  const w = 336;
  const h = 34 + lines.length * 20;
  const x = Math.max(8, Math.min(W - w - 8, ax - w / 2));
  const y = bottom + 8 + h > H - 8 ? top - 8 - h : bottom + 8;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(x, y, w, h);
  drawText(ctx, def.name, x + 10, y + 14, 2, '#c9a0ff', { align: 'left' });
  lines.forEach((l, k) => drawText(ctx, l, x + 10, y + 38 + k * 20, 2, COLORS.text, { align: 'left' }));
  ctx.restore();
}
