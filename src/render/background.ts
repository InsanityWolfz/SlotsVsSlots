import { COLORS, H, W } from '../present/layout';
import { Rooms, type Scene } from './rooms';
import { drawText } from './text';

interface Mote {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  a: number;
}

/** Idle-state ambient juice (juice §9): the room (rooms.ts), drifting motes, vignette, marquee chase lights. */
export class Background {
  private motes: Mote[] = [];
  readonly rooms = new Rooms();
  /** Where we are: set by the game every frame (the act's room, the boss, the loop, your HP). */
  scene: Scene = { room: 'floor', boss: null, loop: 0, hp: 1, foeHp: 1, turn: null, fight: false, turbo: false };
  private vignette: HTMLCanvasElement;

  constructor() {
    for (let i = 0; i < 60; i++) this.motes.push(this.mote(Math.random() * H));
    this.vignette = document.createElement('canvas');
    this.vignette.width = W;
    this.vignette.height = H;
    const v = this.vignette.getContext('2d')!;
    const g = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.4)');
    v.fillStyle = g;
    v.fillRect(0, 0, W, H);
  }

  private mote(y: number): Mote {
    return { x: Math.random() * W, y, vy: -(6 + Math.random() * 16), vx: (Math.random() - 0.5) * 6, size: Math.random() < 0.8 ? 2 : 3, a: 0.1 + Math.random() * 0.3 };
  }

  update(dt: number): void {
    this.rooms.update(dt);
    for (const m of this.motes) {
      m.y += m.vy * dt;
      m.x += m.vx * dt;
      if (m.y < -10) Object.assign(m, this.mote(H + 10));
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const pad = 40;
    ctx.fillStyle = COLORS.bgBottom;
    ctx.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    this.rooms.draw(ctx, this.scene, time);

    for (const m of this.motes) {
      ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(time * 2 + m.x));
      ctx.fillStyle = '#e8d8ff';
      ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(this.vignette, 0, 0);
  }

  /** Title band with a sequential chase-light bulb sweep. */
  drawMarquee(ctx: CanvasRenderingContext2D, time: number): void {
    const y = 10;
    const h = 60;
    const x0 = W / 2 - 250;
    const w = 500;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x0 - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y, w, h);
    ctx.fillStyle = '#3a0f1a';
    ctx.fillRect(x0 + 6, y + 6, w - 12, h - 12);
    // Bulbs around the frame.
    const bulbs: [number, number][] = [];
    for (let i = 0; i <= 24; i++) bulbs.push([x0 + (w * i) / 24, y]);
    for (let i = 1; i <= 2; i++) bulbs.push([x0 + w, y + (h * i) / 3]);
    for (let i = 24; i >= 0; i--) bulbs.push([x0 + (w * i) / 24, y + h]);
    for (let i = 2; i >= 1; i--) bulbs.push([x0, y + (h * i) / 3]);
    const head = (time * 18) % bulbs.length;
    bulbs.forEach(([bx, by], i) => {
      const d = (head - i + bulbs.length) % bulbs.length;
      const lit = d < 6 ? 1 - d / 6 : i % 4 === Math.floor(time * 3) % 4 ? 0.35 : 0.1;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(bx - 4, by - 4, 8, 8);
      ctx.fillStyle = lit > 0.5 ? '#fff6c8' : lit > 0.2 ? '#ffc94a' : '#6a4a1a';
      ctx.fillRect(bx - 3, by - 3, 6, 6);
    });
    const wob = Math.sin(time * 3) * 1.5;
    drawText(ctx, 'SLOTS', W / 2 - 142, y + h / 2 + wob, 4.5, COLORS.goldLight);
    drawText(ctx, 'VS.', W / 2, y + h / 2 - wob, 4, '#ff6a5a');
    drawText(ctx, 'SLOTS', W / 2 + 142, y + h / 2 + wob, 4.5, COLORS.slime);
  }
}
