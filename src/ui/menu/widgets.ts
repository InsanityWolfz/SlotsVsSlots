import { artId, drawSprite, hasSprite } from '../../render/sprites';
import type { Button } from '../button';

/** A page arrow on an empty-labelled button (the font has no "<"): the art's arrow, flipped for back, dim when off. */
export function drawPageArrow(ctx: CanvasRenderingContext2D, b: Button, back: boolean): void {
  if (!b.visible || !hasSprite('arrowRight')) return;
  drawSprite(ctx, artId('arrowRight'), b.x, b.y, 3 * b.scale, { flipX: back, alpha: b.enabled ? 1 : 0.35 });
}
