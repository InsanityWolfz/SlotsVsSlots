import { PALETTE, SPRITES, type SpriteId } from './spriteData';

export type SpriteVariant = 'normal' | 'white' | 'black';
export type { SpriteId };

const cache = new Map<string, HTMLCanvasElement>();

/** Refer to art that may not be generated yet (it falls back to a placeholder until it is). */
export const artId = (id: string): SpriteId => id as SpriteId;
/** Whether a sprite has been generated (for optional art that has no sensible placeholder). */
export const hasSprite = (id: string): boolean => id in SPRITES;

function build(id: SpriteId, variant: SpriteVariant): HTMLCanvasElement {
  // Missing art (not generated yet) draws as a placeholder rather than crashing.
  const rows = SPRITES[id] ?? SPRITES.skull;
  const h = rows.length;
  const w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const hex = variant === 'white' ? '#ffffff' : variant === 'black' ? '#000000' : PALETTE[ch];
      if (!hex) continue;
      const i = (y * w + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16);
      img.data[i + 1] = parseInt(hex.slice(3, 5), 16);
      img.data[i + 2] = parseInt(hex.slice(5, 7), 16);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function sprite(id: SpriteId, variant: SpriteVariant = 'normal'): HTMLCanvasElement {
  const key = `${id}:${variant}`;
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build(id, variant)));
  return c;
}

export interface DrawOpts {
  alpha?: number;
  /** Extra non-uniform scale on top of the pixel scale (squash/stretch). */
  sx?: number;
  sy?: number;
  rot?: number;
  flipX?: boolean;
  variant?: SpriteVariant;
  /** 0..1 white flash overlay. */
  flash?: number;
  /** 0..1 darken overlay. */
  dim?: number;
}

/** Draw a sprite centered at (cx, cy) at `scale` screen px per art pixel. */
export function drawSprite(ctx: CanvasRenderingContext2D, id: SpriteId, cx: number, cy: number, scale: number, o: DrawOpts = {}): void {
  const img = sprite(id, o.variant);
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(scale * (o.sx ?? 1) * (o.flipX ? -1 : 1), scale * (o.sy ?? 1));
  ctx.globalAlpha *= alpha;
  const x = -img.width / 2;
  const y = -img.height / 2;
  ctx.drawImage(img, x, y);
  if (o.dim && o.dim > 0) {
    ctx.globalAlpha = alpha * o.dim;
    ctx.drawImage(sprite(id, 'black'), x, y);
  }
  if (o.flash && o.flash > 0) {
    ctx.globalAlpha = alpha * Math.min(1, o.flash);
    ctx.drawImage(sprite(id, 'white'), x, y);
  }
  ctx.restore();
}

export function spriteSize(id: SpriteId): { w: number; h: number } {
  const rows = SPRITES[id];
  return { w: rows[0].length, h: rows.length };
}
