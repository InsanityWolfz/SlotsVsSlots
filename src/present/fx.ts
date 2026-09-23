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
    const pw = tw + 60;
    const ph = this.textScale * 7 + (this.sub ? 50 : 36);
    // Solid dark panel + border frame that scales with it (juice §3.6).
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12);
    ctx.fillStyle = this.color;
    ctx.fillRect(-pw / 2 - 3, -ph / 2 - 3, pw + 6, ph + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(-pw / 2, -ph / 2, pw, ph / 2);
    drawText(ctx, this.text, 0, this.sub ? -12 : 0, this.textScale, this.color);
    if (this.sub) drawText(ctx, this.sub, 0, ph / 2 - 20, 3, COLORS.text);
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
