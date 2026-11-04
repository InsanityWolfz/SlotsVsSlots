import { drawFocus } from './kit';

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
  /** The screen the focus is on (game.ts names it). A new screen puts the focus on its main button, not the spot the
   * last screen's focus happened to be (QA 2026-11-04: it landed on WALK AWAY, QUIT TO MENU, the card's "?"). */
  private screen = '';
  private land = false;

  /** A new screen: while the pad is in use, the focus lands on that screen's main button as soon as it has targets. */
  sync(screen: string): void {
    if (screen === this.screen) return;
    this.screen = screen;
    this.at = null;
    this.land = this.visible;
  }

  /** The thing you pressed is gone (a DEAL, a bought item): no guess at its neighbour; the next press shows the focus. */
  lost(): void {
    this.at = null;
    this.land = false;
    this.visible = false;
  }

  /** The focused rect in the current list (or the nearest one, after a screen change). */
  current(targets: NavRect[]): NavRect | null {
    if (!targets.length) return null;
    if (!this.at && this.land) {
      this.land = false;
      return this.set(this.first(targets));
    }
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

  /** First press on a screen: its main button (the kit's red one), else the topmost, then leftmost target. */
  private first(targets: NavRect[]): NavRect {
    const main = (t: NavRect) => {
      const b = t as NavRect & { label?: string; minor?: boolean; tint?: string; quietStyle?: boolean; ghost?: boolean; chip?: string; quiet?: boolean; opts?: { primary?: boolean; idlePulse?: boolean } };
      // (The fight's and menus' buttons: SPIN and the red ones, not AUTO.)
      if (b.opts) return !!(b.opts.primary || b.opts.idlePulse);
      return typeof b.label === 'string' && !!b.label && !b.minor && !b.tint && !b.quietStyle && !b.ghost && !b.chip && !b.quiet;
    };
    const order = (a: NavRect, b: NavRect) => a.y - b.y || a.x - b.x;
    return [...targets.filter(main)].sort(order)[0] ?? [...targets].sort(order)[0];
  }

  move(dir: NavDir, targets: NavRect[]): NavRect | null {
    if (!targets.length) return null;
    // (A new screen's first press only shows where the focus is: on its main button.)
    if (this.visible && !this.at) return this.set(this.first(targets));
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
    // A whole-screen target ("press to continue") needs no ring.
    if (!r || r.w > 900) return;
    // The kit's focus (gold corner brackets) on every screen; it pops out a little when it lands.
    const pop = Math.round(Math.max(0, 1 - (performance.now() - this.shown) / 160) * 6);
    drawFocus(ctx, r.x - r.w / 2 - pop, r.y - r.h / 2 - pop, r.w + pop * 2, r.h + pop * 2, t);
  }
}
