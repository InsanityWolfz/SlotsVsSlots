import { drawSprite, type SpriteId } from '../render/sprites';
import { drawText, textWidth } from '../render/text';
import { COLORS, H, W } from './layout';

export interface FxItem {
  draw(ctx: CanvasRenderingContext2D, time: number): void;
  /** Higher draws later. */
  z?: number;
}

export class FxLayer {
  items: FxItem[] = [];
  add<T extends FxItem>(item: T): T {
    this.items.push(item);
    return item;
  }
  remove(item: FxItem): void {
    this.items = this.items.filter((i) => i !== item);
  }
  clear(): void {
    this.items = [];
  }
  draw(ctx: CanvasRenderingContext2D, time: number, zMin: number, zMax: number): void {
    const list = this.items.filter((i) => (i.z ?? 0) >= zMin && (i.z ?? 0) < zMax).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    for (const it of list) it.draw(ctx, time);
  }
}

export class FloatText implements FxItem {
  alpha = 1;
  punch = 1;
  z = 20;
  constructor(
    public text: string,
    public x: number,
    public y: number,
    public scale: number,
    public color: string,
  ) {}
  draw(ctx: CanvasRenderingContext2D): void {
    drawText(ctx, this.text, this.x, this.y, this.scale, this.color, { alpha: this.alpha, punch: this.punch });
  }
}

export class Projectile implements FxItem {
  rot = 0;
  alpha = 1;
  flash = 0;
  z = 15;
  trail: { x: number; y: number }[] = [];
  constructor(
    public sprite: SpriteId,
    public x: number,
    public y: number,
    public scale: number,
    public flipX = false,
    public trailColor = '#ffffff',
  ) {}
  /** Record position for the motion trail. */
  mark(): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
  }
  draw(ctx: CanvasRenderingContext2D): void {
    this.trail.forEach((p, i) => {
      const k = (i + 1) / this.trail.length;
      ctx.globalAlpha = 0.35 * k * this.alpha;
      ctx.fillStyle = this.trailColor;
      const s = 4 + k * 8;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    });
    ctx.globalAlpha = 1;
    drawSprite(ctx, this.sprite, this.x, this.y, this.scale, { rot: this.rot, flipX: this.flipX, alpha: this.alpha, flash: this.flash });
  }
}

export class Banner implements FxItem {
  scale = 0;
  alpha = 1;
  z = 30;
  sub = '';
  /** A coloured sub line built part by part (BASE X MULT = TOTAL): `reveal` parts are shown. */
  subParts: { text: string; color: string }[] = [];
  reveal = 99;
  constructor(
    public text: string,
    public color: string,
    public x = W / 2,
    public y = H / 2,
    public textScale = 7,
  ) {}
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.scale <= 0.01 || this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    const tw = textWidth(this.text, this.textScale);
    const partsText = this.subParts.map((p) => p.text).join('');
    const hasSub = !!this.sub || this.subParts.length > 0;
    const subText = this.sub || partsText;
    const subScale = subText && textWidth(subText, 4) <= 520 && this.subParts.length ? 4 : subText && textWidth(subText, 3) > 520 ? 2 : 3;
    const pw = Math.max(tw, hasSub ? textWidth(subText, subScale) : 0) + 60;
    const ph = this.textScale * 7 + (hasSub ? 50 + (subScale - 3) * 7 : 36);
    // Solid dark panel + border frame that scales with it (juice §3.6).
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12);
    ctx.fillStyle = this.color;
    ctx.fillRect(-pw / 2 - 3, -ph / 2 - 3, pw + 6, ph + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph / 2);
    drawText(ctx, this.text, 0, hasSub ? -12 - (subScale - 3) * 4 : 0, this.textScale, this.color);
    if (this.sub) drawText(ctx, this.sub, 0, ph / 2 - 20, subScale, COLORS.text);
    else if (this.subParts.length) {
      // Left-aligned from the full line's start, so parts pop in without the line sliding.
      let x = -textWidth(partsText, subScale) / 2;
      this.subParts.forEach((p, i) => {
        if (i < this.reveal) drawText(ctx, p.text, x, ph / 2 - 20 - (subScale - 3) * 3, subScale, p.color, { align: 'left' });
        x += textWidth(p.text, subScale);
      });
    }
    ctx.restore();
  }
}

/** Big sweeping "PLAYER TURN" strip. */
export class TurnCard implements FxItem {
  x = -W;
  alpha = 1;
  z = 25;
  constructor(
    public text: string,
    public color: string,
    public y = H / 2,
  ) {}
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha * 0.85;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(this.x - 400, this.y - 34, 800 + W, 68);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 400, this.y - 30, 800 + W, 4);
    ctx.fillRect(this.x - 400, this.y + 26, 800 + W, 4);
    ctx.globalAlpha = this.alpha;
    drawText(ctx, this.text, this.x + W / 2, this.y, 5, this.color);
    ctx.restore();
  }
}

/** Procedural jagged lightning (midpoint displacement), re-rolled per flicker. */
export class Lightning implements FxItem {
  alpha = 1;
  z = 22;
  points: { x: number; y: number }[] = [];
  branches: { x: number; y: number }[][] = [];
  constructor(
    public x0: number,
    public y0: number,
    public x1: number,
    public y1: number,
  ) {
    this.reroll();
  }
  private bolt(ax: number, ay: number, bx: number, by: number, disp: number, depth: number): { x: number; y: number }[] {
    if (depth === 0) return [{ x: ax, y: ay }, { x: bx, y: by }];
    const mx = (ax + bx) / 2 + (Math.random() * 2 - 1) * disp;
    const my = (ay + by) / 2 + (Math.random() * 2 - 1) * disp * 0.3;
    const left = this.bolt(ax, ay, mx, my, disp / 2, depth - 1);
    const right = this.bolt(mx, my, bx, by, disp / 2, depth - 1);
    return left.concat(right.slice(1));
  }
  reroll(): void {
    this.points = this.bolt(this.x0, this.y0, this.x1, this.y1, 90, 6);
    this.branches = [];
    for (let i = 0; i < 3; i++) {
      const p = this.points[8 + Math.floor(Math.random() * (this.points.length - 16))];
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.branches.push(this.bolt(p.x, p.y, p.x + dir * (60 + Math.random() * 80), p.y + 80 + Math.random() * 80, 30, 4));
    }
  }
  private stroke(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y))));
    ctx.stroke();
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.shadowColor = COLORS.energy;
    ctx.shadowBlur = 30;
    this.stroke(ctx, this.points, 14, 'rgba(255,210,63,0.5)');
    for (const b of this.branches) this.stroke(ctx, b, 4, COLORS.energy);
    ctx.shadowBlur = 0;
    this.stroke(ctx, this.points, 6, COLORS.energy);
    this.stroke(ctx, this.points, 2, '#ffffff');
    ctx.restore();
  }
}

/** Translucent pixel bubble ring around a machine (shield gain). */
export class Bubble implements FxItem {
  alpha = 0;
  r = 0;
  z = 12;
  constructor(
    public x: number,
    public y: number,
    public color: string,
  ) {}
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.r * 1.1, this.r, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = this.alpha * 0.12;
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }
}

/** The WILD symbol wheel: your symbols on a small wheel that spins and stops under the pointer. */
export class SymbolWheel implements FxItem {
  angle = 0;
  scale = 0;
  alpha = 1;
  /** Segment that just landed (flashes). */
  landed = -1;
  flash = 0;
  z = 32;
  constructor(
    /** One segment per symbol + charm you own (the charm drawn over the symbol). */
    public symbols: { sprite: SpriteId; charm?: SpriteId }[],
    public x: number,
    public y: number,
    public radius: number,
  ) {}
  /** The wheel angle that puts segment k's centre under the pointer (top), after `turns` spins. */
  stopAngle(k: number, turns: number): number {
    const seg = (Math.PI * 2) / this.symbols.length;
    return -Math.PI / 2 - (k + 0.5) * seg - Math.PI * 2 * turns;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    if (this.scale <= 0.01) return;
    const n = this.symbols.length;
    const seg = (Math.PI * 2) / n;
    const r = this.radius * this.scale;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    // Rim.
    ctx.fillStyle = COLORS.outline;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r + 6, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < n; i++) {
      const a0 = this.angle + i * seg;
      ctx.fillStyle = i === this.landed && this.flash > 0 ? '#ff6ad5' : i % 2 ? '#3a2350' : '#52306e';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.arc(this.x, this.y, r, a0, a0 + seg);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff6ad5';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    const k = Math.min(2.2, 2.2 * Math.sqrt(4 / Math.max(4, n))) * this.scale;
    for (let i = 0; i < n; i++) {
      const a = this.angle + (i + 0.5) * seg;
      const px = this.x + Math.cos(a) * r * 0.64;
      const py = this.y + Math.sin(a) * r * 0.64;
      const fl = i === this.landed ? this.flash : 0;
      drawSprite(ctx, this.symbols[i].sprite, px, py, k, { alpha: this.alpha, flash: fl });
      const charm = this.symbols[i].charm;
      if (charm) drawSprite(ctx, charm, px, py, k, { alpha: this.alpha, flash: fl });
    }
    // Hub and pointer.
    drawSprite(ctx, 'wild', this.x, this.y, 1.6 * this.scale, { alpha: this.alpha });
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x - 12 * this.scale, this.y - r - 16 * this.scale);
    ctx.lineTo(this.x + 12 * this.scale, this.y - r - 16 * this.scale);
    ctx.lineTo(this.x, this.y - r + 6 * this.scale);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}
