import { COLORS } from '../present/layout';

export interface NavRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type NavDir = 'up' | 'down' | 'left' | 'right';

/**
 * Keyboard and gamepad navigation (STEAM_READINESS S3) without touching any screen's logic: every screen already
 * exposes its clickable rects (center + size). The focus is a point; arrows / the d-pad jump to the best rect in that
 * direction, and confirm presses the focused rect like a click. Moving the mouse hides the ring again.
 */
export class Focus {
  /** The focused rect's center (screens rebuild their lists, so focus is a place, not an index). */
  at: { x: number; y: number } | null = null;
  visible = false;
  private shown = 0;

  /** The focused rect in the current list (or the nearest one, after a screen change). */
  current(targets: NavRect[]): NavRect | null {
    if (!targets.length) return null;
    if (!this.at) return null;
    const at = this.at;
    let best: NavRect | null = null;
    let bd = Infinity;
    for (const t of targets) {
      const d = Math.hypot(t.x - at.x, t.y - at.y);
      if (d < bd) (bd = d), (best = t);
    }
    return best;
  }

  /** First press on a screen: the topmost, then leftmost target (most screens lead with their main choice). */
  private first(targets: NavRect[]): NavRect {
    return [...targets].sort((a, b) => a.y - b.y || a.x - b.x)[0];
  }

  move(dir: NavDir, targets: NavRect[]): NavRect | null {
    if (!targets.length) return null;
    const cur = this.visible ? this.current(targets) : null;
    if (!cur) return this.set(this.first(targets));
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    let best: NavRect | null = null;
    let bs = Infinity;
    for (const t of targets) {
      if (t === cur) continue;
      const vx = t.x - cur.x;
      const vy = t.y - cur.y;
      const along = vx * dx + vy * dy;
      if (along <= 4) continue;
      const across = Math.abs(vx * dy) + Math.abs(vy * dx);
      const score = along + across * 2.5;
      if (score < bs) (bs = score), (best = t);
    }
    return this.set(best ?? cur);
  }

  private set(t: NavRect): NavRect {
    this.at = { x: t.x, y: t.y };
    this.visible = true;
    this.shown = performance.now();
    return t;
  }

  hide(): void {
    this.visible = false;
  }

  draw(ctx: CanvasRenderingContext2D, targets: NavRect[], t: number): void {
    if (!this.visible) return;
    const r = this.current(targets);
    if (!r) return;
    const pad = 6 + Math.sin(t * 6) * 1.5;
    const pop = Math.max(0, 1 - (performance.now() - this.shown) / 160);
    const g = pad + pop * 6;
    ctx.save();
    ctx.strokeStyle = COLORS.goldLight;
    ctx.lineWidth = 3;
    ctx.strokeRect(Math.round(r.x - r.w / 2 - g), Math.round(r.y - r.h / 2 - g), Math.round(r.w + g * 2), Math.round(r.h + g * 2));
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(r.x - r.w / 2 - g - 2), Math.round(r.y - r.h / 2 - g - 2), Math.round(r.w + g * 2 + 4), Math.round(r.h + g * 2 + 4));
    ctx.restore();
  }
}
