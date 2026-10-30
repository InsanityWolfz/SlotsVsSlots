import { cubicIn } from '../present/ease';
import { COLORS, H, W } from '../present/layout';

/**
 * SCREEN TRANSITIONS (the retail list, UI kit 2026-10-30): when the game moves between the menus, a run screen and a
 * fight, the screen it left drops away as a row of reel strips, left to right like reels stopping, uncovering the new
 * one (0.3 s). With MOTION reduced it is a plain 0.2 s fade instead. One place for every switch: Game.draw asks
 * `check` each frame with a key naming the screen; a new key starts the wipe from the last frame drawn.
 */
export class Transition {
  private snap: HTMLCanvasElement | null = null;
  private t = -1;
  private key: string | null = null;
  private calm = false;

  /** Call at the top of a frame, before anything is drawn: the canvas still holds the last frame. */
  check(ctx: CanvasRenderingContext2D, key: string, calm: boolean): void {
    if (key === this.key) return;
    const first = this.key === null;
    this.key = key;
    if (first) return;
    const src = ctx.canvas as HTMLCanvasElement;
    if (!src.width || !src.height) return;
    this.snap ??= document.createElement('canvas');
    this.snap.width = src.width;
    this.snap.height = src.height;
    this.snap.getContext('2d')!.drawImage(src, 0, 0);
    this.t = 0;
    this.calm = calm;
  }

  /** Mid-wipe (for screenshots and tests). */
  get active(): boolean {
    return this.t >= 0;
  }

  /** Call at the end of the frame, over everything. */
  draw(ctx: CanvasRenderingContext2D, dt: number): void {
    if (this.t < 0 || !this.snap) return;
    this.t += Math.min(dt, 1 / 30);
    const snap = this.snap;
    const k = snap.width / W;
    if (this.calm) {
      const p = this.t / FADE;
      if (p >= 1) return this.end();
      ctx.save();
      ctx.globalAlpha = 1 - p;
      ctx.drawImage(snap, 0, 0, snap.width, snap.height, 0, 0, W, H);
      ctx.restore();
      return;
    }
    if (this.t >= TOTAL) return this.end();
    const cw = W / STRIPS;
    ctx.save();
    for (let i = 0; i < STRIPS; i++) {
      const p = Math.max(0, Math.min(1, (this.t - i * STAGGER) / STRIP_DUR));
      if (p >= 1) continue;
      const dy = Math.round(H * cubicIn(p));
      const x = Math.round(i * cw);
      const w = Math.round((i + 1) * cw) - x;
      ctx.drawImage(snap, x * k, 0, w * k, (H - dy) * k, x, dy, w, H - dy);
      // The strip reads as a reel: a dark rim between strips, a gold lip on its top edge, darker as it falls.
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x, dy, 2, H - dy);
      if (dy > 0) {
        ctx.fillRect(x, dy - 4, w, 4);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x, dy - 2, w, 2);
      }
      ctx.fillStyle = `rgba(6,2,12,${(0.45 * p).toFixed(3)})`;
      ctx.fillRect(x, dy, w, H - dy);
    }
    ctx.restore();
  }

  private end(): void {
    this.t = -1;
  }
}

const STRIPS = 10;
const STRIP_DUR = 0.21;
const STAGGER = 0.009;
const TOTAL = STRIP_DUR + STAGGER * (STRIPS - 1);
const FADE = 0.2;
