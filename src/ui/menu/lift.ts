import type { Button } from '../button';

/**
 * Hover feedback for hit areas a screen draws itself (tiles, plaques, swatches): each eases a lift 0..1 toward its
 * hover, and remembers when the hover began so the kit card's shine sweeps once per hover.
 */
export class Lifts {
  private s = new Map<Button, { lift: number; at: number; was: boolean }>();

  update(dt: number, list: Button[]): void {
    const k = Math.min(1, dt * 16);
    for (const b of list) {
      let e = this.s.get(b);
      if (!e) this.s.set(b, (e = { lift: 0, at: -1, was: false }));
      if (b.hover && !e.was) e.at = performance.now();
      e.was = b.hover;
      e.lift += ((b.hover ? 1 : 0) - e.lift) * k;
      if (e.lift < 0.01) e.lift = 0;
    }
  }

  lift(b: Button): number {
    return this.s.get(b)?.lift ?? 0;
  }

  /** Seconds since this hover began (the shine), or undefined. */
  shine(b: Button): number | undefined {
    const e = this.s.get(b);
    return e && e.at >= 0 && b.hover ? (performance.now() - e.at) / 1000 : undefined;
  }

  clear(): void {
    this.s.clear();
  }
}

/** A hit area's press feedback (the Button's squash and pop), applied to whatever the screen draws for it. */
export function pressed(ctx: CanvasRenderingContext2D, b: Button, draw: () => void): void {
  if (Math.abs(b.scale - 1) < 0.005) return draw();
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.scale, b.scale);
  ctx.translate(-b.x, -b.y);
  draw();
  ctx.restore();
}
