import { DESKTOP } from '../build';
import { Clock } from '../present/clock';
import { COLORS, H, W } from '../present/layout';
import { drawText } from '../render/text';
import { Button } from './button';

export interface PauseCallbacks {
  onResume: () => void;
  onSettings: () => void;
  /** Leaves the run where it is (it stays saved: CONTINUE picks it up). */
  onQuitToMenu: () => void;
  /** Throws the run away (asks SURE? first). */
  onAbandon: () => void;
  onQuitToDesktop: () => void;
}

/**
 * PAUSE (STEAM_READINESS S2): Escape (or the window losing focus) anywhere in a run. The fight clock stops while it's
 * open; nothing here touches the fight itself (fights stay watch-only).
 */
export class Pause {
  open = false;
  private buttons: Button[] = [];
  private active: Button | null = null;
  private armed = 0;
  private abandon: Button;

  constructor(ui: Clock, click: () => void, cb: PauseCallbacks) {
    const x = W / 2;
    const y0 = 270;
    const mk = (label: string, i: number, fn: () => void, primary = false) => {
      const b = new Button(label, x, y0 + i * 66, 380, 52, fn, ui, click, { textScale: 3, primary });
      this.buttons.push(b);
      return b;
    };
    mk('RESUME', 0, () => cb.onResume(), true);
    mk('SETTINGS', 1, () => cb.onSettings());
    mk('QUIT TO MENU', 2, () => cb.onQuitToMenu());
    this.abandon = mk('ABANDON RUN', 3, () => {
      if (this.armed && performance.now() - this.armed > 400) {
        this.armed = 0;
        cb.onAbandon();
        return;
      }
      if (!this.armed) {
        this.armed = performance.now();
        this.abandon.label = 'SURE? PRESS AGAIN';
        setTimeout(() => {
          this.armed = 0;
          this.abandon.label = 'ABANDON RUN';
        }, 2500);
      }
    });
    if (DESKTOP) mk('QUIT TO DESKTOP', 4, () => cb.onQuitToDesktop());
  }

  navTargets(): Button[] {
    return this.open ? this.buttons : [];
  }

  show(): void {
    this.open = true;
    this.armed = 0;
    this.abandon.label = 'ABANDON RUN';
  }

  hide(): void {
    this.open = false;
    this.active = null;
  }

  update(dt: number): void {
    if (this.open) for (const b of this.buttons) b.update(dt);
  }

  pointerDown(x: number, y: number): void {
    const b = this.buttons.find((b) => b.contains(x, y));
    if (b) {
      this.active = b;
      b.down();
    }
  }

  pointerUp(x: number, y: number): void {
    const b = this.active;
    this.active = null;
    b?.up(b.contains(x, y));
  }

  pointerMove(x: number, y: number): boolean {
    let any = false;
    for (const b of this.buttons) {
      b.hover = b.contains(x, y);
      any ||= b.hover;
    }
    return any;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.open) return;
    ctx.fillStyle = 'rgba(6,2,12,0.78)';
    ctx.fillRect(0, 0, W, H);
    const pw = 480;
    const top = 170;
    const bottom = 270 + (this.buttons.length - 1) * 66 + 50;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(W / 2 - pw / 2 - 6, top - 6, pw + 12, bottom - top + 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(W / 2 - pw / 2 - 3, top - 3, pw + 6, bottom - top + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(W / 2 - pw / 2, top, pw, bottom - top);
    drawText(ctx, 'PAUSED', W / 2, top + 36, 4, COLORS.goldLight);
    for (const b of this.buttons) b.draw(ctx, t);
    drawText(ctx, 'ESC TO RESUME', W / 2, bottom + 30, 1.5, COLORS.textDim);
  }
}
