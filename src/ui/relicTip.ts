import type { CabinetId } from '../core/cabinets';
import type { RelicId } from '../core/config';
import { RELICS, RELIC_TIER, relicText } from '../core/relics';
import { drawPanel, KIT, T } from './kit';
import { COLORS, H, W } from '../present/layout';
import { drawText } from '../render/text';
import { drawRich } from './keywords';
import { wrap } from './run/shared';

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
  const lines = wrap(relicText(relic, cabinet), 24);
  const w = 336;
  const h = 46 + lines.length * 22;
  const x = Math.round(Math.max(8, Math.min(W - w - 8, ax - w / 2)));
  const y = Math.round(bottom + 10 + h > H - 8 ? top - 10 - h : bottom + 10);
  const tier = RELIC_TIER.legendary.includes(relic) ? 'legendary' : RELIC_TIER.uncommon.includes(relic) ? 'uncommon' : 'common';
  ctx.save();
  ctx.globalAlpha = 1;
  // The kit panel, framed in the relic's rarity.
  drawPanel(ctx, x, y, w, h, { frame: KIT.rarity[tier] });
  drawText(ctx, def.name, x + 14, y + 20, T.body, tier === 'legendary' ? '#ff9ad8' : '#d8b8ff', { align: 'left' });
  lines.forEach((l, k) => drawRich(ctx, l, x + 14, y + 46 + k * 22, T.body, COLORS.text, { align: 'left' }));
  ctx.restore();
}
