import { DESKTOP } from '../build';
import { Clock } from '../present/clock';
import { COLORS, H, W } from '../present/layout';
import { drawText } from '../render/text';
import { Button } from './button';
import { KEYWORDS } from './keywords';

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
  /** The GLOSSARY page is up (any tap goes back to the menu). */
  glossary = false;

  constructor(ui: Clock, click: () => void, cb: PauseCallbacks) {
    const x = W / 2;
    const mk = (label: string, i: number, fn: () => void, primary = false) => {
      const b = new Button(label, x, PAUSE_Y0 + i * PAUSE_STEP, 380, 52, fn, ui, click, { textScale: 3, primary });
      this.buttons.push(b);
      return b;
    };
    mk('RESUME', 0, () => cb.onResume(), true);
    mk('GLOSSARY', 1, () => (this.glossary = true));
    mk('SETTINGS', 2, () => cb.onSettings());
    mk('QUIT TO MENU', 3, () => cb.onQuitToMenu());
    this.abandon = mk('ABANDON RUN', 4, () => {
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
    if (DESKTOP) mk('QUIT TO DESKTOP', 5, () => cb.onQuitToDesktop());
  }

  navTargets(): Button[] {
    return this.open && !this.glossary ? this.buttons : [];
  }

  show(): void {
    this.open = true;
    this.armed = 0;
    this.abandon.label = 'ABANDON RUN';
  }

  hide(): void {
    this.open = false;
    this.glossary = false;
    this.active = null;
  }

  update(dt: number): void {
    if (this.open) for (const b of this.buttons) b.update(dt);
  }

  pointerDown(x: number, y: number): void {
    if (this.glossary) {
      this.glossary = false;
      return;
    }
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
    if (this.glossary) return this.drawGlossary(ctx);
    const top = PAUSE_Y0 - 100;
    const bottom = PAUSE_Y0 + (this.buttons.length - 1) * PAUSE_STEP + 50;
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

  /** GLOSSARY (user, 2026-10-12): every keyword in its colour, one line each, two columns. */
  private drawGlossary(ctx: CanvasRenderingContext2D): void {
    const pw = 1180;
    const ph = 640;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(px, py, pw, ph);
    drawText(ctx, 'GLOSSARY', W / 2, py + 30, 3.5, COLORS.goldLight);
    const per = Math.ceil(KEYWORDS.length / 2);
    KEYWORDS.forEach((k, i) => {
      const col = Math.floor(i / per);
      const x = px + 24 + col * (pw / 2);
      const y = py + 74 + (i % per) * Math.min(68, (ph - 120) / per);
      drawText(ctx, k.word, x, y, 2, k.color, { align: 'left' });
      const words = k.text.split(' ');
      let line = '';
      let ly = y + 22;
      for (const w of words) {
        if (line && (line + ' ' + w).length > 58) {
          drawText(ctx, line, x, ly, 1.5, COLORS.text, { align: 'left' });
          ly += 15;
          line = w;
        } else line = line ? `${line} ${w}` : w;
      }
      if (line) drawText(ctx, line, x, ly, 1.5, COLORS.text, { align: 'left' });
    });
    drawText(ctx, 'TAP TO GO BACK', W / 2, py + ph - 16, 1.5, COLORS.textDim);
  }
}

const PAUSE_Y0 = 250;
const PAUSE_STEP = 62;
