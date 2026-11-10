/**
 * THE PAY STACK (user, 2026-11-10: "the text changes really fast and it's hard to see it all... it fades out and goes
 * down a line, so you can see it all in a line for a second"). The pay banner still shows the step that's counting,
 * large; each step it finishes drops a line into this list under the banner: newest on top, older ones a step dimmer,
 * at most `rows` of them (a longer chain's oldest lines fade out at the bottom). When the banner closes, its total
 * drops in as the top line, and the list stays readable for STACK.linger real seconds while the hit flies, then fades.
 * Its home is the band under the pay banner (layout.ts PAY_STACK), which nothing else uses while it's up.
 */
import { drawText, textWidth } from '../render/text';
import { drawPanel, KIT, T } from '../ui/kit';
import { cubicOut } from './ease';
import type { FxItem, Rect } from './fx';
import { COLORS, PAY_STACK } from './layout';

export const STACK = {
  /** Lines shown at most. */
  rows: 4,
  /** Row heights: a step's line, and the total's (a size up). */
  pitch: 19,
  headPitch: 23,
  pad: 5,
  /** A new line's fade-in (game seconds). */
  drop: 0.12,
  /** How long the list stays after the banner closes (REAL seconds, whatever the SPEED), and its fade (game seconds). */
  linger: 1.1,
  fade: 0.25,
  /** Each older line a step dimmer. */
  dim: [1, 0.9, 0.78, 0.66],
  minW: 176,
} as const;

/**
 * How long each step of THE CLIMB counts (game seconds). A short chain takes its time (0.16 s a step, up from 0.11:
 * its lines stay on screen now, so the count can breathe); a long one shares one budget, so 12 multipliers take about
 * as long as 4. BIG WIN and MEGA WIN climb slower, on a bigger budget.
 */
export function climbPace(steps: number, size: 'small' | 'big' | 'mega' = 'small'): number {
  const p = size === 'mega' ? { per: 0.24, all: 1.3 } : size === 'big' ? { per: 0.18, all: 1 } : { per: 0.16, all: 0.66 };
  return Math.max(0.05, Math.min(p.per, p.all / Math.max(1, steps)));
}

export interface StackText {
  label: string;
  value: string;
}

interface StackLine extends StackText {
  color: string;
  /** The total: a size up, in the banner's colour. */
  head: boolean;
  born: number;
  /** Drawn alpha (it eases toward its row's). */
  alpha: number;
}

export class PayStack implements FxItem {
  /** Over the banner it hangs from (30): the banner's slam grows over the list's top edge, never over its words. */
  z = 31;
  alpha = 1;
  lines: StackLine[] = [];
  private h = 0;
  private last = -1;
  private now = 0;
  /** The whole list's slide (px, up): a new line pushes it up a row, and it eases back down to rest. The lines move
   * as one, so two never cross (a long chain drops a line every 0.06 s). */
  private scroll = 0;
  /** Where its top edge is heading (it slides up when a zoomed banner over it closes). */
  private goal: number;
  constructor(
    /** Centre x, the list's top edge and its width. */
    public x: number,
    public top: number,
    public w: number,
  ) {
    this.goal = top;
  }
  /** Lines it can show: fewer under a zoomed banner (BIG WIN, MEGA WIN), whose bottom edge is lower. */
  get rows(): number {
    const room = PAY_STACK.bottom - this.goal - STACK.pad * 2 - (STACK.headPitch - STACK.pitch);
    return Math.max(2, Math.min(STACK.rows, Math.floor(room / STACK.pitch)));
  }
  /** Slide the list's top edge to `top` (the banner it hung from has closed). */
  moveTo(top: number): void {
    this.goal = top;
  }

  /** The width a chain needs: its widest line, within the home's limits. */
  static width(lines: StackText[], head: StackText): number {
    const row = (l: StackText, s: number) => textWidth(l.label, s) + (l.label && l.value ? 18 : 0) + textWidth(l.value, s);
    const w = Math.max(row(head, T.body), ...lines.map((l) => row(l, T.small))) + 30;
    return Math.round(Math.max(STACK.minW, Math.min(PAY_STACK.maxW, w)));
  }

  /** A new line on top (the others move down a row). */
  push(line: StackText, color: string, head = false): void {
    this.lines.unshift({ ...line, color, head, born: this.now, alpha: 0 });
    this.scroll += head ? STACK.headPitch : STACK.pitch;
  }

  /** The list's box on screen now. */
  rect(): Rect {
    return { x: Math.round(this.x - this.w / 2), y: Math.round(this.top), w: this.w, h: Math.round(this.h) };
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const dt = this.last < 0 ? 0 : Math.max(0, Math.min(0.1, time - this.last));
    this.last = time;
    this.now = time;
    const ease = Math.min(1, dt * 22);
    this.scroll += (0 - this.scroll) * ease;
    if (this.scroll < 0.5) this.scroll = 0;
    this.top += (this.goal - this.top) * Math.min(1, dt * 14);
    if (Math.abs(this.goal - this.top) < 0.5) this.top = this.goal;
    // Each line's slot, from the top; the panel is as tall as the lines it shows.
    let y = this.top + STACK.pad;
    let want = STACK.pad * 2;
    const at: number[] = [];
    this.lines.forEach((l, i) => {
      const hgt = l.head ? STACK.headPitch : STACK.pitch;
      const shown = i < this.rows;
      // (Pushed between frames: born on the frame that first draws it.)
      if (l.born > time) l.born = time;
      const k = cubicOut(Math.min(1, (time - l.born) / STACK.drop));
      at.push(y + hgt / 2 - this.scroll);
      const a = shown ? (STACK.dim[i] ?? 0.6) : 0;
      l.alpha = k < 1 ? Math.max(l.alpha, a * k) : l.alpha + (a - l.alpha) * Math.min(1, dt * 12);
      y += hgt;
      if (shown) want += hgt;
    });
    this.lines = this.lines.filter((l, i) => i < this.rows || l.alpha > 0.04);
    this.h = this.h <= 0 ? want : this.h + (want - this.h) * ease;
    if (this.alpha <= 0.01 || !this.lines.length) return;
    const r = this.rect();
    ctx.save();
    ctx.globalAlpha *= this.alpha;
    drawPanel(ctx, r.x, r.y, r.w, r.h, { frame: KIT.frameDim });
    // (Lines stay inside the panel while they move.)
    ctx.beginPath();
    ctx.rect(r.x + 3, r.y + 3, r.w - 6, Math.max(0, r.h - 6));
    ctx.clip();
    this.lines.forEach((l, i) => {
      if (l.alpha <= 0.04) return;
      const s = l.head ? T.body : T.small;
      // A line lands white, then takes its colour.
      const fresh = time - l.born < STACK.drop + 0.1 && !l.head;
      const ly = Math.round(at[i]) + 1;
      // (A line shows once it's wholly inside the panel: sliding in or out, half of one is no line at all.)
      const half = (7 * s) / 2 + 2;
      if (ly - half < r.y + 2 || ly + half > r.y + r.h - 2) return;
      drawText(ctx, l.label, r.x + 13, ly, s, fresh ? '#ffffff' : l.color, { align: 'left', alpha: l.alpha });
      drawText(ctx, l.value, r.x + r.w - 13, ly, s, l.head ? l.color : fresh ? '#ffffff' : COLORS.text, { align: 'right', alpha: l.alpha });
    });
    ctx.restore();
  }
}
