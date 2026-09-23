import { drawSprite, type SpriteId } from '../render/sprites';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  rot: number;
  vr: number;
  kind: 'square' | 'confetti' | 'spark' | 'sprite';
  sprite?: SpriteId;
  /** Shrink to 0 over life instead of fading. */
  shrink?: boolean;
}

export interface BurstOpts {
  x: number;
  y: number;
  count: number;
  colors: string[];
  speed?: [number, number];
  /** Radians; default full circle. */
  angle?: number;
  spread?: number;
  life?: [number, number];
  size?: [number, number];
  gravity?: number;
  drag?: number;
  kind?: Particle['kind'];
  sprite?: SpriteId;
  shrink?: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  list: Particle[] = [];
  enabled = true;

  burst(o: BurstOpts): void {
    if (!this.enabled) return;
    const [s0, s1] = o.speed ?? [100, 400];
    const [l0, l1] = o.life ?? [0.4, 0.9];
    const [z0, z1] = o.size ?? [3, 6];
    for (let i = 0; i < o.count; i++) {
      const a = (o.angle ?? 0) + (o.spread === undefined ? Math.random() * Math.PI * 2 : rand(-o.spread / 2, o.spread / 2));
      const sp = rand(s0, s1);
      const life = rand(l0, l1);
      this.list.push({
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        size: Math.round(rand(z0, z1)),
        color: o.colors[Math.floor(Math.random() * o.colors.length)],
        gravity: o.gravity ?? 600,
        drag: o.drag ?? 1.5,
        rot: Math.random() * Math.PI * 2,
        vr: rand(-10, 10),
        kind: o.kind ?? 'square',
        sprite: o.sprite,
        shrink: o.shrink,
      });
    }
  }

  update(dt: number): void {
    if (dt <= 0) return;
    for (const p of this.list) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = p.life / p.max;
      const alpha = p.shrink ? 1 : Math.min(1, k * 2);
      const size = p.shrink ? p.size * k : p.size;
      ctx.globalAlpha = alpha;
      if (p.kind === 'sprite' && p.sprite) {
        drawSprite(ctx, p.sprite, p.x, p.y, Math.max(1, size), { alpha, rot: p.rot });
        continue;
      }
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        const w = size * Math.abs(Math.cos(p.rot));
        ctx.fillRect(Math.round(p.x - w / 2), Math.round(p.y - size / 4), Math.max(1, Math.round(w)), Math.max(1, Math.round(size / 2)));
      } else if (p.kind === 'spark') {
        const len = Math.min(18, Math.hypot(p.vx, p.vy) * 0.03);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-len, -size / 2, len + size, size);
        ctx.restore();
      } else {
        ctx.fillRect(Math.round(p.x - size / 2), Math.round(p.y - size / 2), size, size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
