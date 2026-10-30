import { COLORS } from '../present/layout';
import { drawText, type TextOpts } from '../render/text';

/**
 * THE UI KIT (user, 2026-10-30): every screen draws its boxes, cards, chips and banners from here, so the game reads
 * as one set (Balatro's cohesion is the bar). One panel (the fight HUD's dark plum box with a 3px gold frame), the
 * bulb marquee only for big moments (the logo, boss and elite cards), three button styles (`Button`: primary red,
 * secondary dark, quiet grey), four text sizes, one count-up. Felt and wood stay only as scenery (the card tables, the
 * Cashier's counter), never as a panel.
 */

/** The four text sizes. Nothing is drawn smaller than SMALL (it reads on a Steam Deck and a phone). */
export const T = { title: 4.5, head: 3, body: 2, small: 1.6 } as const;

/** Kit colours on top of COLORS: the frame, the text roles and the rarity tiers. */
export const KIT = {
  frame: COLORS.gold,
  frameDim: '#4a4058',
  fill: COLORS.panel,
  fillLight: COLORS.panelLight,
  sheen: 'rgba(255,255,255,0.06)',
  title: COLORS.goldLight,
  text: COLORS.text,
  dim: COLORS.textDim,
  primary: '#c8321f',
  /** Rarity: the frame colour of a card. */
  rarity: { common: COLORS.gold, uncommon: '#52c8ff', legendary: '#ff6ad5' } as Record<string, string>,
  bulbOn: '#fff6c8',
  bulbMid: '#ffc94a',
  bulbOff: '#6a4a1a',
};

export interface PanelOpts {
  /** Frame colour (default gold); `dim` for a panel that isn't the focus. */
  frame?: string;
  fill?: string;
  /** A title on the panel's top edge (heading size, centred). */
  title?: string;
  /** Hover / focus: the frame brightens. */
  lit?: boolean;
}

/** THE panel: near-black outline, 3px frame, dark plum fill with a faint top sheen. x/y is the top-left corner. */
export function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: PanelOpts = {}): void {
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = o.lit ? COLORS.goldLight : (o.frame ?? KIT.frame);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = o.fill ?? KIT.fill;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = KIT.sheen;
  ctx.fillRect(x + 3, y + 3, w - 6, Math.min(18, (h - 6) / 3));
  if (o.title) {
    const tw = Math.max(80, o.title.length * 6 * T.head + 28);
    drawPanel(ctx, x + w / 2 - tw / 2, y - 18, tw, 34, { frame: o.frame });
    drawText(ctx, o.title, x + w / 2, y - 1, T.head, KIT.title);
  }
}

/** A recessed slot inside a panel (a stat box, a tile well, an empty Charm slot). */
export function drawWell(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill = COLORS.panelLight): void {
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + 2, w - 4, 3);
}

/**
 * The bulb marquee: the logo's chase-light frame, for big moments only (boss and elite cards, the run-over title).
 * The lit bulbs chase around the frame; `pitch` is the bulb spacing.
 */
export function drawMarquee(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number, o: PanelOpts & { pitch?: number } = {}): void {
  drawPanel(ctx, x, y, w, h, { ...o, frame: o.frame ?? '#a8202a' });
  const pitch = o.pitch ?? 16;
  const pts: [number, number][] = [];
  for (let bx = x + 8; bx <= x + w - 8; bx += pitch) pts.push([bx, y + 1]);
  for (let by = y + 8 + pitch / 2; by <= y + h - 8; by += pitch) pts.push([x + w - 1, by]);
  for (let bx = x + w - 8; bx >= x + 8; bx -= pitch) pts.push([bx, y + h - 1]);
  for (let by = y + h - 8 - pitch / 2; by >= y + 8; by -= pitch) pts.push([x + 1, by]);
  const head = (time * 14) % pts.length;
  pts.forEach(([bx, by], i) => {
    const d = (head - i + pts.length) % pts.length;
    const lit = d < 5 ? 1 : i % 3 === 2 ? 0 : 0.5;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 4, by - 4, 8, 8);
    ctx.fillStyle = lit === 1 ? KIT.bulbOn : lit > 0 ? KIT.bulbMid : KIT.bulbOff;
    ctx.fillRect(bx - 3, by - 3, 6, 6);
  });
}

export interface ChipOpts {
  /** Fill colour of the pill (default the panel's light fill). */
  fill?: string;
  /** Text colour. */
  color?: string;
  scale?: number;
  /** Draws an icon sprite at the chip's left (the caller passes a function that draws it centred at x, y). */
  icon?: (x: number, y: number) => void;
  /** Width reserved for the icon. */
  iconW?: number;
}

/** A chip: a small framed pill with an optional icon and a label (an ability, a keyword, a price, a stake). Centred
 * on x, y; returns its width. */
export function drawChip(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, o: ChipOpts = {}): number {
  const s = o.scale ?? T.body;
  const iw = o.icon ? (o.iconW ?? 20) : 0;
  const w = Math.round(label.length * 6 * s + iw + 18);
  const h = Math.round(7 * s + 14);
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - h / 2);
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  ctx.fillStyle = KIT.frame;
  ctx.fillRect(x0, y0, w, h);
  ctx.fillStyle = o.fill ?? KIT.fillLight;
  ctx.fillRect(x0 + 2, y0 + 2, w - 4, h - 4);
  if (o.icon) o.icon(x0 + 9 + iw / 2 - 2, y);
  drawText(ctx, label, x0 + 9 + iw + (w - 18 - iw) / 2, y + 1, s, o.color ?? KIT.title);
  return w;
}

/**
 * A ribbon banner: the turn call over the reels (YOUR SPIN / THEIR SPIN), a result title. A panel band with
 * notched ends. Centred on x, y.
 */
export function drawBanner(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, o: { scale?: number; color?: string; frame?: string; alpha?: number } = {}): void {
  const s = o.scale ?? T.head;
  const w = Math.round(label.length * 6 * s + 48);
  const h = Math.round(7 * s + 18);
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  const x0 = Math.round(x - w / 2);
  const y0 = Math.round(y - h / 2);
  // Tails behind the band.
  ctx.fillStyle = COLORS.outline;
  ctx.fillRect(x0 - 18, y0 + 6, 24, h);
  ctx.fillRect(x0 + w - 6, y0 + 6, 24, h);
  ctx.fillStyle = '#7a1420';
  ctx.fillRect(x0 - 15, y0 + 9, 18, h - 6);
  ctx.fillRect(x0 + w - 3, y0 + 9, 18, h - 6);
  drawPanel(ctx, x0, y0, w, h, { frame: o.frame, fill: '#3a1428' });
  drawText(ctx, label, x, y + 1, s, o.color ?? KIT.title);
  ctx.restore();
}

export interface CardOpts {
  rarity?: 'common' | 'uncommon' | 'legendary';
  /** 0..1: hover lift (the card rises 6px and its frame lights). */
  lift?: number;
  /** Seconds since the card was shown or hovered: drives the diagonal shine sweep (once, ~0.6 s). */
  shineT?: number;
  dim?: boolean;
}

/** A card (draft, relic, Charm, shop item): the panel with a rarity frame, a hover lift and a one-time shine sweep.
 * x/y is the top-left before the lift. Returns the lifted y, for the caller to lay out the content. */
export function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: CardOpts = {}): number {
  const lift = o.lift ?? 0;
  const yy = Math.round(y - 6 * lift);
  if (lift > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 4, y + 8, w, h);
  }
  drawPanel(ctx, x, yy, w, h, { frame: KIT.rarity[o.rarity ?? 'common'], lit: lift > 0.5 && (o.rarity ?? 'common') === 'common' });
  const st = o.shineT;
  if (st !== undefined && st >= 0 && st < 0.6) {
    // A soft diagonal band sweeping left to right across the card.
    const p = st / 0.6;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 3, yy + 3, w - 6, h - 6);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,246,200,0.16)';
    const bx = x - h + (w + h * 2) * p;
    ctx.beginPath();
    ctx.moveTo(bx, yy + h);
    ctx.lineTo(bx + 28, yy + h);
    ctx.lineTo(bx + 28 + h * 0.6, yy);
    ctx.lineTo(bx + h * 0.6, yy);
    ctx.fill();
    ctx.restore();
  }
  if (o.dim) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 3, yy - 3, w + 6, h + 6);
  }
  return yy;
}

/** The pad / keyboard focus: gold corner brackets that breathe around a rect (top-left x/y). */
export function drawFocus(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
  const p = 4 + Math.round(2 + 2 * Math.sin(time * 6));
  const L = 14;
  ctx.fillStyle = COLORS.goldLight;
  const corner = (cx: number, cy: number, dx: number, dy: number) => {
    ctx.fillRect(cx, cy, dx * L, 3 * Math.sign(dy) || 3);
    ctx.fillRect(cx, cy, 3 * Math.sign(dx) || 3, dy * L);
  };
  corner(x - p, y - p, 1, 1);
  corner(x + w + p, y - p, -1, 1);
  corner(x - p, y + h + p, 1, -1);
  corner(x + w + p, y + h + p, -1, -1);
}

/** A title in the kit's title size with its drop shadow (screen titles, result banners). Centred. */
export function drawTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color = KIT.title, o: TextOpts = {}): void {
  drawText(ctx, text, x + 3, y + 4, T.title, '#000000', { ...o, alpha: 0.45 * (o.alpha ?? 1), outline: null });
  drawText(ctx, text, x, y, T.title, color, o);
}

/**
 * THE count-up: every number that changes (chips, damage, score, the pot) eases to its target the same way. Keep one
 * per number; call `update(dt)` each frame and draw `shown`.
 */
export class CountUp {
  shown: number;
  private target: number;
  private from: number;
  private t = 1;
  constructor(value = 0, private dur = 0.6) {
    this.shown = value;
    this.target = value;
    this.from = value;
  }
  set(v: number, instant = false): void {
    if (instant) {
      this.shown = this.target = this.from = v;
      this.t = 1;
      return;
    }
    if (v === this.target) return;
    this.from = this.shown;
    this.target = v;
    this.t = 0;
  }
  update(dt: number): void {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / this.dur);
    const e = 1 - Math.pow(1 - this.t, 3);
    this.shown = Math.round(this.from + (this.target - this.from) * e);
  }
  get done(): boolean {
    return this.t >= 1;
  }
}
