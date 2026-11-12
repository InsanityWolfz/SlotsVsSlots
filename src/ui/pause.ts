import { DESKTOP } from '../build';
import { Clock } from '../present/clock';
import { COLORS, H, W } from '../present/layout';
import { drawSprite, spriteSize } from '../render/sprites';
import { drawText, textWidth } from '../render/text';
import { Button } from './button';
import { GLOSSARY_TABS, glossaryPage, type GlossaryTab } from './keywords';
import { drawPanel, drawTitle, KIT, T } from './kit';
import { by, drawPrompt } from './input';
// (The shared wrap: no lone last word, "HITS YOU FOR / 20": QA RULES-24.)
import { wrap } from './run/shared';

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
  /** The GLOSSARY is up (a tap on a tab changes the page; a tap anywhere else goes back to the menu). */
  glossary = false;
  /** The GLOSSARY's page, and its tabs (one a page: with the machines' payoffs and the Charms the list outgrew one screen). */
  private page: GlossaryTab = GLOSSARY_TABS[0];
  private tabs: Button[] = [];

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
    GLOSSARY_TABS.forEach((tab, i) => {
      const b = new Button(tab, W / 2 + (i - (GLOSSARY_TABS.length - 1) / 2) * (GLOSS.tabW + GLOSS.tabGap), GLOSS.y + GLOSS.tabY, GLOSS.tabW, 40, () => (this.page = tab), ui, click, { textScale: T.body, quiet: true });
      this.tabs.push(b);
    });
  }

  navTargets(): Button[] {
    return !this.open ? [] : this.glossary ? this.tabs : this.buttons;
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
    if (this.open) for (const b of [...this.buttons, ...this.tabs]) b.update(dt);
  }

  pointerDown(x: number, y: number): void {
    const b = (this.glossary ? this.tabs : this.buttons).find((b) => b.contains(x, y));
    // The GLOSSARY: a tap off its tabs goes back to the menu.
    if (this.glossary && !b) {
      this.glossary = false;
      return;
    }
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
      b.hover = !this.glossary && b.contains(x, y);
      any ||= b.hover;
    }
    for (const b of this.tabs) {
      b.hover = this.glossary && b.contains(x, y);
      any ||= b.hover;
    }
    return any;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.open) return;
    ctx.fillStyle = 'rgba(6,2,12,0.78)';
    ctx.fillRect(0, 0, W, H);
    if (this.glossary) return this.drawGlossary(ctx, t);
    // THE model screen of the kit: one panel, the title, one primary button, the rest secondary, the controls in small.
    const pw = 480;
    const top = PAUSE_Y0 - 104;
    const last = PAUSE_Y0 + (this.buttons.length - 1) * PAUSE_STEP;
    const bottom = last + 72;
    drawPanel(ctx, W / 2 - pw / 2, top, pw, bottom - top);
    drawTitle(ctx, 'PAUSED', W / 2, top + 48);
    for (const b of this.buttons) b.draw(ctx, t);
    drawPrompt(ctx, by({ touch: 'TAP RESUME TO PLAY ON', mouse: 'ESC: RESUME', keys: 'ESC: RESUME    ARROWS + ENTER: CHOOSE', pad: '[B] RESUME    [A] CHOOSE' }), W / 2, last + 50, T.small, KIT.dim);
  }

  /**
   * GLOSSARY (user, 2026-10-12): every keyword with its icon, in its colour, its meaning beside it, in two columns. One
   * page a subject (the text pass, 2026-11-12: the machines' payoffs, MAKE IT RAIN, ABILITY and the Charms joined the
   * list, and one screen no longer holds it); the tabs along the top turn the page.
   */
  private drawGlossary(ctx: CanvasRenderingContext2D, t: number): void {
    const { w: pw, h: ph, y: py } = GLOSS;
    const px = W / 2 - pw / 2;
    drawPanel(ctx, px, py, pw, ph);
    drawTitle(ctx, 'GLOSSARY', W / 2, py + 44);
    for (const b of this.tabs) {
      b.toggled = b.label === this.page;
      b.draw(ctx, t);
    }
    const entries = glossaryPage(this.page);
    const colW = (pw - 88) / 2;
    const cell = textWidth('MM', T.small) - textWidth('M', T.small);
    // The word column fits the page's longest word (LIGHTNING STORM is twice PAYLINE).
    const wordW = Math.max(146, ...entries.map((e) => 32 + textWidth(e.word, T.body) + 16));
    const chars = Math.floor((colW - wordW + 14) / cell);
    const LINE = 18;
    // The columns split by height, not count, and the gaps close up to fit (QA 2026-11-04: 7 new keywords ran SPILL,
    // ROCK and IOU off the bottom). An entry is never shorter than its icon (two lines).
    const all = entries.map((k) => ({ k, h: Math.max(2, wrap(k.text, chars).length) * LINE, rows: wrap(k.text, chars) }));
    const listTop = py + GLOSS.tabY + 40;
    const room = py + ph - 48 - listTop;
    const height = (es: typeof all, gap: number) => es.reduce((a, e) => a + e.h + gap, -gap);
    let per = 1;
    for (let i = 1; i < all.length; i++) if (Math.max(height(all.slice(0, i), 0), height(all.slice(i), 0)) < Math.max(height(all.slice(0, per), 0), height(all.slice(per), 0))) per = i;
    const cols = [all.slice(0, per), all.slice(per)];
    const most = Math.max(...cols.map((c) => c.length));
    const GAP = Math.max(4, Math.min(16, Math.floor((room - 24 - Math.max(...cols.map((c) => height(c, 0)))) / Math.max(1, most - 1))));
    const tallest = Math.max(...cols.map((c) => height(c, GAP)));
    const top = listTop + 16 + Math.max(0, (room - 24 - tallest) / 2);
    cols.forEach((list, col) => {
      const x = px + 28 + col * (colW + 32);
      let y = top;
      for (const { k, rows, h } of list) {
        // Every icon in the same 24px box (the keyword set is 12px art, a Charm's 16px, a map badge 8px).
        const sz = spriteSize(k.icon);
        drawSprite(ctx, k.icon, x + 12, y, 24 / Math.max(sz.w, sz.h));
        drawText(ctx, k.word, x + 32, y, T.body, k.color, { align: 'left' });
        rows.forEach((r, i) => drawText(ctx, r, x + wordW, y + i * LINE, T.small, COLORS.text, { align: 'left' }));
        y += h + GAP;
      }
    });
    // The column divider.
    ctx.fillStyle = KIT.frameDim;
    ctx.fillRect(Math.round(W / 2 - 1), listTop, 2, room);
    drawPrompt(ctx, by({ touch: 'TAP A TAB TO CHANGE THE PAGE. TAP ANYWHERE ELSE TO GO BACK', mouse: 'CLICK A TAB TO CHANGE THE PAGE. CLICK ANYWHERE ELSE TO GO BACK', keys: 'ARROWS AND ENTER CHANGE THE PAGE. ESC GOES BACK', pad: '[DPAD] AND [A] CHANGE THE PAGE. [B] GOES BACK' }), W / 2, py + ph - 24, T.small, KIT.dim);
  }
}

/** The GLOSSARY's panel, and its row of tabs under the title. */
const GLOSS = { w: 1200, h: 660, y: (H - 660) / 2, tabY: 96, tabW: 250, tabGap: 16 };
const PAUSE_Y0 = 252;
const PAUSE_STEP = 64;
