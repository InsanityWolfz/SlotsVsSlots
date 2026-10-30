import { DESKTOP } from '../build';
import { Clock } from '../present/clock';
import { COLORS, H, W } from '../present/layout';
import { drawSprite } from '../render/sprites';
import { drawText, textWidth } from '../render/text';
import { Button } from './button';
import { KEYWORDS } from './keywords';
import { drawPanel, drawTitle, KIT, T } from './kit';

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
      const b = new Button(label, x, PAUSE_Y0 + i * PAUSE_STEP, 380, 52, fn, ui, click, { textScale: T.head, primary });
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
    if (this.glossary) return this.drawGlossary(ctx);
    // THE model screen of the kit: one panel, the title, one primary button, the rest secondary, the controls in small.
    const pw = 480;
    const top = PAUSE_Y0 - 104;
    const last = PAUSE_Y0 + (this.buttons.length - 1) * PAUSE_STEP;
    const bottom = last + 72;
    drawPanel(ctx, W / 2 - pw / 2, top, pw, bottom - top);
    drawTitle(ctx, 'PAUSED', W / 2, top + 48);
    for (const b of this.buttons) b.draw(ctx, t);
    drawText(ctx, 'ESC: RESUME    ARROWS + ENTER: CHOOSE', W / 2, last + 50, T.small, KIT.dim);
  }

  /** GLOSSARY (user, 2026-10-12): every keyword with its icon, in its colour, its meaning beside it, in two columns. */
  private drawGlossary(ctx: CanvasRenderingContext2D): void {
    const pw = 1200;
    const ph = 660;
    const px = W / 2 - pw / 2;
    const py = H / 2 - ph / 2;
    drawPanel(ctx, px, py, pw, ph);
    drawTitle(ctx, 'GLOSSARY', W / 2, py + 44);
    const colW = (pw - 88) / 2;
    const wordW = 146;
    const chars = Math.floor((colW - wordW + 14) / (textWidth('MM', T.small) - textWidth('M', T.small)));
    const per = Math.ceil(KEYWORDS.length / 2);
    const LINE = 18;
    const GAP = 16;
    const cols = [KEYWORDS.slice(0, per), KEYWORDS.slice(per)].map((ks) => ks.map((k) => ({ k, rows: wrap(k.text, chars) })));
    const tallest = Math.max(...cols.map((c) => c.reduce((a, e) => a + e.rows.length * LINE + GAP, -GAP)));
    const top = py + 96 + Math.max(0, (ph - 150 - tallest) / 2);
    cols.forEach((entries, col) => {
      const x = px + 28 + col * (colW + 32);
      let y = top;
      for (const { k, rows } of entries) {
        drawSprite(ctx, k.icon, x + 12, y, 2);
        drawText(ctx, k.word, x + 32, y, T.body, k.color, { align: 'left' });
        rows.forEach((r, i) => drawText(ctx, r, x + wordW, y + i * LINE, T.small, COLORS.text, { align: 'left' }));
        y += rows.length * LINE + GAP;
      }
    });
    // The column divider.
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(Math.round(W / 2 - 1), py + 84, 2, ph - 136);
    drawText(ctx, 'TAP OR ESC: BACK', W / 2, py + ph - 24, T.small, KIT.dim);
  }
}

/** Break a line into rows of at most `n` characters, at spaces. */
function wrap(text: string, n: number): string[] {
  const rows: string[] = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > n) {
      rows.push(line);
      line = w;
    } else line = line ? `${line} ${w}` : w;
  }
  if (line) rows.push(line);
  return rows;
}

const PAUSE_Y0 = 252;
const PAUSE_STEP = 64;
