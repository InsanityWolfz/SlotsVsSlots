import { COLORS, H, W } from '../present/layout';
import { Rooms, type Scene } from './rooms';

interface Mote {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  a: number;
}

/** Idle-state ambient juice (juice §9): the room (rooms.ts), drifting motes, vignette. */
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
}
