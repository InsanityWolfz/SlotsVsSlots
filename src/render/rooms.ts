/**
 * THE ROOMS (user, 2026-10-13: "the background is kind of boring"): each act is a place. Act 1 a back-alley den, act 2
 * the casino floor, act 3 the high-roller VIP room; ENDLESS goes round them, darker and more gold each loop. Every
 * boss has its own set piece behind the fight (the House's vault door, THE WHEEL's giant wheel, the Dealer's lamp and
 * table), and the room reacts: the lights chase and the crowd jumps on your jackpots, a slow red pulse when you're low.
 *
 * Drawn in chunky pixels at a quarter size (320x180) and scaled up 4x without smoothing, so it reads as the same 8-bit
 * art as the sprites. The still parts (walls, signs, machines, carpet) are drawn once per room; the lights, the boss
 * pieces and the crowd are redrawn every frame on a small canvas. Everything stays dim behind the reels, and nothing
 * flashes: the brightest a reaction gets is a gentle tint (FLASH_CAP is 0.2; these stay under 0.1).
 */
import { drawText } from './text';

export type RoomId = 'alley' | 'floor' | 'vip';
export type BossSet = 'house' | 'wheel' | 'dealer' | null;

export interface Scene {
  room: RoomId;
  boss: BossSet;
  /** ENDLESS loop (0 outside it): each loop darker and more gold. */
  loop: number;
  /** Your HP share in a fight (1 outside one): under 30% the room pulses red. */
  hp: number;
  /** In a fight (the crowd only shows there). */
  fight: boolean;
}

export const LW = 320;
export const LH = 180;
/** Where the wall meets the floor (the machines stand on it). */
const FLOOR_Y = 118;

/** A small seeded random (the room's layout is the same every time you see it). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Machine {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Marquee bulb phases (they blink at their own pace). */
  bulbs: number[];
  screen: string;
  trim: string;
}
interface Sign {
  text: string;
  x: number;
  y: number;
  color: string;
  /** This one buzzes (dims now and then: an old tube). */
  buzz: boolean;
}

interface RoomArt {
  still: HTMLCanvasElement;
  machines: Machine[];
  signs: Sign[];
}

const NEON = ['#ff4fa3', '#4fe3ff', '#ffd23f', '#5aff7a', '#c38bff'];

function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = LW;
  c.height = LH;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

const rect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

/** A row of slot machines along the wall, dark against it: their lights are drawn live. */
function machineRow(rnd: () => number, n: number, y: number, trims: string[]): Machine[] {
  const out: Machine[] = [];
  const pitch = LW / n;
  for (let i = 0; i < n; i++) {
    const w = 16 + Math.floor(rnd() * 5);
    const h = 30 + Math.floor(rnd() * 8);
    out.push({
      x: Math.round(i * pitch + (pitch - w) / 2 + (rnd() - 0.5) * 4),
      y: y - h,
      w,
      h,
      bulbs: [0, 1, 2, 3].map(() => rnd() * Math.PI * 2),
      screen: NEON[Math.floor(rnd() * NEON.length)],
      trim: trims[Math.floor(rnd() * trims.length)],
    });
  }
  return out;
}

function drawMachineBody(g: CanvasRenderingContext2D, m: Machine, body: string, edge: string): void {
  // Marquee cap, cabinet, the dark screen with its three reel slots, a lever.
  rect(g, m.x + 1, m.y, m.w - 2, 5, body);
  rect(g, m.x, m.y + 5, m.w, m.h - 5, body);
  rect(g, m.x, m.y + 5, 1, m.h - 5, edge);
  rect(g, m.x + 1, m.y + 4, m.w - 2, 1, m.trim);
  rect(g, m.x + 3, m.y + 9, m.w - 6, 9, '#07040c');
  for (let r = 0; r < 3; r++) rect(g, m.x + 4 + r * ((m.w - 8) / 3), m.y + 10, (m.w - 8) / 3 - 1, 7, '#100a1a');
  rect(g, m.x + 2, m.y + 21, m.w - 4, 2, edge);
  rect(g, m.x + m.w, m.y + 10, 1, 7, edge);
}

function carpet(g: CanvasRenderingContext2D, base: string, a: string, b: string): void {
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, base);
  // The loud casino carpet: diamonds and dots, rows shifting half a step (with a little depth: rows grow down).
  let y = FLOOR_Y + 2;
  for (let row = 0; y < LH; row++) {
    const step = 10 + row * 2;
    for (let x = (row % 2) * (step / 2) - step; x < LW + step; x += step) {
      const cx = Math.round(x);
      rect(g, cx, y + 1, 1, 1, a);
      rect(g, cx - 1, y + 2, 3, 1, a);
      rect(g, cx, y + 3, 1, 1, a);
      rect(g, cx + Math.round(step / 2), y + 2, 1, 1, b);
    }
    y += 5 + row;
  }
  // The wall's foot: a dark kick strip so the floor reads as a floor.
  rect(g, 0, FLOOR_Y, LW, 2, '#05030a');
}

function buildAlley(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(11);
  rect(g, 0, 0, LW, FLOOR_Y, '#1a0c16');
  // Bricks, a few chipped darker or lighter.
  for (let y = 0, row = 0; y < FLOOR_Y; y += 6, row++)
    for (let x = (row % 2) * -6; x < LW; x += 12) {
      const k = rnd();
      rect(g, x + 1, y + 1, 10, 4, k < 0.15 ? '#24121c' : k > 0.9 ? '#3a1e26' : '#2e1720');
    }
  // A back door with its grimy sign, pipes, a fire escape.
  rect(g, 236, 58, 30, 60, '#120810');
  rect(g, 238, 60, 26, 58, '#1e1016');
  rect(g, 258, 88, 3, 3, '#6a5a30');
  rect(g, 20, 0, 3, FLOOR_Y, '#140a10');
  rect(g, 20, 30, 18, 3, '#140a10');
  for (let x = 120; x < 200; x += 8) rect(g, x, 34, 1, 14, '#140a10');
  rect(g, 116, 33, 88, 2, '#140a10');
  rect(g, 116, 47, 88, 2, '#140a10');
  // Wet asphalt.
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, '#0e0a12');
  for (let i = 0; i < 40; i++) rect(g, rnd() * LW, FLOOR_Y + 4 + rnd() * 58, 2 + rnd() * 10, 1, '#16121c');
  // Crates and a trash can.
  rect(g, 4, 96, 22, 22, '#2a1a10');
  rect(g, 6, 98, 18, 18, '#1e120a');
  rect(g, 290, 100, 16, 18, '#1c1c24');
  rect(g, 288, 98, 20, 3, '#26262e');
  // Two worn machines leaning on the wall.
  const machines = [
    { x: 56, y: FLOOR_Y - 34, w: 17, h: 34, bulbs: [0, 2, 4, 1], screen: '#ffd27a', trim: '#6a4a1a' },
    { x: 92, y: FLOOR_Y - 31, w: 16, h: 31, bulbs: [3, 1, 5, 2], screen: '#ff8a5a', trim: '#5a3a1a' },
  ];
  for (const m of machines) drawMachineBody(g, m, '#100810', '#24161e');
  return { still: c, machines, signs: [{ text: 'DEN', x: 251, y: 52, color: '#ff8a5a', buzz: true }] };
}

function buildFloor(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(23);
  // A deep purple wall with tall panels.
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, '#120822');
  wall.addColorStop(1, '#22103a');
  g.fillStyle = wall;
  g.fillRect(0, 0, LW, FLOOR_Y);
  for (let x = 0; x < LW; x += 40) {
    rect(g, x, 0, 1, FLOOR_Y, '#2c1648');
    rect(g, x + 1, 0, 1, FLOOR_Y, '#0e0618');
  }
  // A long gold rail under the signs.
  rect(g, 0, 62, LW, 1, '#5a4214');
  const machines = machineRow(rnd, 14, FLOOR_Y, ['#c9a227', '#ff4fa3', '#4fe3ff']);
  for (const m of machines) drawMachineBody(g, m, '#0c0616', '#241438');
  carpet(g, '#2a0c24', '#1f6a6a', '#c9a227');
  const signs: Sign[] = [
    { text: '777', x: 26, y: 20, color: '#ff4fa3', buzz: false },
    { text: 'CASH', x: 92, y: 12, color: '#5aff7a', buzz: false },
    { text: 'JACKPOT', x: 228, y: 12, color: '#ffd23f', buzz: true },
    { text: 'OPEN 24 HRS', x: 160, y: 44, color: '#4fe3ff', buzz: false },
    { text: 'BAR', x: 296, y: 30, color: '#c38bff', buzz: false },
  ];
  return { still: c, machines, signs };
}

function buildVip(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(37);
  // Dark wood paneling, gold trim, red velvet curtains at both ends.
  rect(g, 0, 0, LW, FLOOR_Y, '#1c0a0c');
  for (let x = 0; x < LW; x += 32) {
    rect(g, x + 3, 30, 26, 80, '#26100e');
    rect(g, x + 3, 30, 26, 1, '#5a3a14');
    rect(g, x + 3, 109, 26, 1, '#3a2410');
  }
  rect(g, 0, 26, LW, 2, '#c9a227');
  rect(g, 0, 112, LW, 2, '#8a6a18');
  for (const side of [0, 1]) {
    const x0 = side ? LW - 34 : 0;
    for (let k = 0; k < 34; k += 4) {
      rect(g, x0 + k, 0, 4, FLOOR_Y + 30, k % 8 ? '#5a0c18' : '#3a0610');
      rect(g, x0 + k + 1, 0, 1, FLOOR_Y + 30, '#6e1420');
    }
    rect(g, x0, 0, 34, 4, '#c9a227');
  }
  const machines = machineRow(rnd, 9, FLOOR_Y, ['#c9a227', '#ffe9a0']).filter((m) => m.x > 34 && m.x + m.w < LW - 34);
  for (const m of machines) drawMachineBody(g, m, '#120608', '#3a2410');
  carpet(g, '#3a0812', '#8a6a18', '#c9a227');
  // The curtains fall in front of the carpet's edge.
  for (const side of [0, 1]) {
    const x0 = side ? LW - 34 : 0;
    for (let k = 0; k < 34; k += 4) rect(g, x0 + k, FLOOR_Y, 4, 30, k % 8 ? '#4a0a14' : '#30050c');
  }
  return { still: c, machines, signs: [{ text: 'HIGH ROLLERS', x: 160, y: 12, color: '#ffd23f', buzz: false }] };
}

const built = new Map<RoomId, RoomArt>();
function room(id: RoomId): RoomArt {
  let r = built.get(id);
  if (!r) {
    r = id === 'alley' ? buildAlley() : id === 'floor' ? buildFloor() : buildVip();
    built.set(id, r);
  }
  return r;
}

interface Fan {
  x: number;
  h: number;
  phase: number;
  hue: string;
}
/** The crowd at the floor's corners (the middle is the fight's). */
const FANS: Fan[] = (() => {
  const rnd = seeded(5);
  const xs = [4, 13, 22, 31, 40, 280, 289, 298, 307, 316];
  return xs.map((x) => ({ x, h: 14 + Math.floor(rnd() * 5), phase: rnd() * Math.PI * 2, hue: ['#3a2a52', '#4a2a3a', '#2a3a4a'][Math.floor(rnd() * 3)] }));
})();

/** The live layer: the room's lights, the boss's set piece, the crowd, the reactions. */
export class Rooms {
  private live: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  /** A jackpot's reaction: 1 when it lands, fading to 0. */
  private cheerT = 0;
  private cheerColor = '#ffd23f';
  private cheerOurs = true;

  constructor() {
    [this.live, this.g] = canvas();
  }

  /** A jackpot landed: yours cheers the room (gold), theirs makes it wince (red, no jumping). */
  cheer(ours: boolean): void {
    this.cheerT = 1;
    this.cheerOurs = ours;
    this.cheerColor = ours ? '#ffd23f' : '#ff6a5a';
  }

  update(dt: number): void {
    this.cheerT = Math.max(0, this.cheerT - dt / 1.4);
  }

  draw(ctx: CanvasRenderingContext2D, s: Scene, time: number): void {
    const art = room(s.room);
    const g = this.g;
    g.clearRect(0, 0, LW, LH);
    const cheer = this.cheerT;
    this.lights(g, art, s, time, cheer);
    if (s.boss === 'house') this.vault(g, time);
    else if (s.boss === 'wheel') this.bigWheel(g, time);
    else if (s.boss === 'dealer') this.lamp(g, time);
    if (s.room === 'alley') this.bulb(g, time);
    if (s.room === 'vip') this.chandeliers(g, time, cheer);
    if (s.fight) this.crowd(g, time, cheer && this.cheerOurs ? cheer : 0);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.still, 0, 0, LW * 4, LH * 4);
    ctx.drawImage(this.live, 0, 0, LW * 4, LH * 4);
    ctx.restore();
    // ENDLESS: each loop darker, with a gold cast (the room the run keeps coming back to, richer and meaner).
    if (s.loop > 0) {
      ctx.fillStyle = `rgba(4,2,8,${Math.min(0.4, 0.08 * s.loop)})`;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
      ctx.fillStyle = `rgba(201,162,39,${Math.min(0.08, 0.02 * s.loop)})`;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    }
    // A jackpot tints the room a little (never a flash: under 0.1).
    if (cheer > 0) {
      ctx.fillStyle = hexA(this.cheerColor, 0.08 * cheer);
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    }
    // Low HP: a slow red pulse at the edges.
    if (s.fight && s.hp < 0.3) {
      const k = (0.3 - s.hp) / 0.3;
      const a = (0.05 + 0.04 * Math.sin(time * 2.5)) * (0.5 + 0.5 * k);
      const rg = ctx.createRadialGradient(LW * 2, LH * 2, LH * 1.4, LW * 2, LH * 2, LW * 2.6);
      rg.addColorStop(0, 'rgba(255,40,40,0)');
      rg.addColorStop(1, `rgba(255,40,40,${a * 2})`);
      ctx.fillStyle = rg;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    }
  }

  private lights(g: CanvasRenderingContext2D, art: RoomArt, s: Scene, t: number, cheer: number): void {
    // Machine marquees: bulbs blink at their own pace; a jackpot runs a chase down the whole row.
    art.machines.forEach((m, i) => {
      m.bulbs.forEach((ph, k) => {
        const chase = cheer > 0 && Math.floor(t * 14 - i) % 4 === k;
        const on = chase || Math.sin(t * 1.7 + ph) > 0.35;
        const bx = m.x + 2 + k * ((m.w - 5) / 3);
        rect(g, bx, m.y + 1, 2, 2, on ? (chase ? this.cheerColor : '#ffe9a0') : '#3a2a1a');
      });
      // The screen's faint glow (their reels spinning), pulsing slowly.
      g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.8 + i * 1.3) + cheer * 0.3;
      rect(g, m.x + 4, m.y + 10, m.w - 8, 7, m.screen);
      g.globalAlpha = 1;
    });
    // The neon signs: a soft halo, then the tube. A buzzing one dims now and then (a dip, never a flash).
    for (const sg of art.signs) {
      const buzz = sg.buzz && Math.sin(t * 7.3) * Math.sin(t * 2.1) > 0.85 ? 0.45 : 1;
      const breathe = 0.85 + 0.15 * Math.sin(t * 1.3 + sg.x);
      const a = Math.min(1, buzz * breathe + cheer * 0.2);
      g.globalAlpha = 0.18 * a;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawText(g, sg.text, sg.x + dx, sg.y + dy, 1, sg.color, { outline: null });
      g.globalAlpha = a;
      drawText(g, sg.text, sg.x, sg.y, 1, sg.color, { outline: null });
      g.globalAlpha = 1;
    }
    void s;
  }

  /** Act 1: one bare bulb on a wire, swaying, its warm cone on the bricks. */
  private bulb(g: CanvasRenderingContext2D, t: number): void {
    const sway = Math.sin(t * 0.7) * 3;
    const x = 160 + sway;
    g.fillStyle = '#0a0608';
    g.fillRect(160, 0, 1, 20);
    const cone = g.createRadialGradient(x, 24, 2, x, 60, 90);
    cone.addColorStop(0, 'rgba(255,210,122,0.22)');
    cone.addColorStop(1, 'rgba(255,210,122,0)');
    g.fillStyle = cone;
    g.fillRect(0, 0, LW, LH);
    rect(g, x - 2, 20, 4, 4, '#ffe9b0');
    rect(g, x - 1, 19, 2, 1, '#3a3a3a');
  }

  /** Act 3: two chandeliers, their crystals twinkling (more on a jackpot). */
  private chandeliers(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    for (const cx of [96, 224]) {
      rect(g, cx, 0, 1, 8, '#5a4214');
      rect(g, cx - 12, 8, 25, 2, '#c9a227');
      rect(g, cx - 8, 10, 17, 2, '#a8861e');
      for (let k = -12; k <= 12; k += 4) {
        const tw = Math.sin(t * 3 + k + cx) > 0.6 - cheer ? '#fff6c8' : '#c9b06a';
        rect(g, cx + k, 12, 1, 3 + (Math.abs(k) % 8 ? 1 : 0), tw);
      }
      const glow = g.createRadialGradient(cx, 12, 1, cx, 12, 34);
      glow.addColorStop(0, `rgba(255,233,160,${0.16 + cheer * 0.08})`);
      glow.addColorStop(1, 'rgba(255,233,160,0)');
      g.fillStyle = glow;
      g.fillRect(cx - 40, 0, 80, 50);
    }
  }

  /** THE HOUSE: its vault door in the wall, the wheel-handle turning slowly. */
  private vault(g: CanvasRenderingContext2D, t: number): void {
    const cx = 160;
    const cy = 50;
    const ring = (r: number, c: string) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    };
    ring(28, '#1a1a24');
    ring(26, '#3a3a4a');
    ring(22, '#2a2a36');
    ring(20, '#34343f');
    // Bolts around the rim.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      rect(g, cx + Math.cos(a) * 24 - 1, cy + Math.sin(a) * 24 - 1, 2, 2, '#5a5a6a');
    }
    // The handle: three spokes, turning.
    g.strokeStyle = '#8a8a9a';
    g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = t * 0.3 + (k / 3) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14);
      g.stroke();
    }
    ring(4, '#c9a227');
  }

  /** THE WHEEL: a giant roulette wheel behind the fight, turning slowly. */
  private bigWheel(g: CanvasRenderingContext2D, t: number): void {
    const cx = 160;
    const cy = 70;
    const r = 66;
    const n = 37;
    const a0 = t * 0.12;
    g.globalAlpha = 0.6;
    g.fillStyle = '#3a2410';
    g.beginPath();
    g.arc(cx, cy, r + 4, 0, Math.PI * 2);
    g.fill();
    for (let k = 0; k < n; k++) {
      g.fillStyle = k === 0 ? '#1f7a3a' : k % 2 ? '#8a1a22' : '#141018';
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, a0 + (k / n) * Math.PI * 2, a0 + ((k + 1) / n) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#5a3a14';
    g.beginPath();
    g.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c9a227';
    g.beginPath();
    g.arc(cx, cy, 5, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  /** THE DEALER: a green-shaded lamp over a felt table edge. */
  private lamp(g: CanvasRenderingContext2D, t: number): void {
    const x = 160;
    const sway = Math.sin(t * 0.5) * 1;
    g.fillStyle = '#0a0608';
    g.fillRect(x, 0, 1, 26);
    const cone = g.createLinearGradient(0, 30, 0, LH);
    cone.addColorStop(0, 'rgba(255,240,190,0.16)');
    cone.addColorStop(1, 'rgba(255,240,190,0.02)');
    g.fillStyle = cone;
    g.beginPath();
    g.moveTo(x - 10 + sway, 32);
    g.lineTo(x + 11 + sway, 32);
    g.lineTo(x + 70, LH);
    g.lineTo(x - 70, LH);
    g.closePath();
    g.fill();
    rect(g, x - 10 + sway, 26, 21, 6, '#1f6a3a');
    rect(g, x - 8 + sway, 25, 17, 1, '#2f8a4a');
    rect(g, x - 3 + sway, 32, 7, 1, '#fff0be');
    // The table's edge across the floor: green felt, a gold rail.
    g.fillStyle = '#0f4a2a';
    g.beginPath();
    g.ellipse(x, LH + 18, 110, 40, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#c9a227';
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, LH + 18, 110, 40, 0, Math.PI, Math.PI * 2);
    g.stroke();
  }

  /** The crowd, heads and shoulders at the floor's corners: they bob, and jump with their arms up on your jackpot. */
  private crowd(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    for (const f of FANS) {
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 9 + f.phase)) * 4 * cheer : 0;
      const y = LH - f.h - Math.sin(t * 1.2 + f.phase) * 0.6 - jump;
      rect(g, f.x - 4, y + 6, 9, f.h, '#07040c');
      rect(g, f.x - 4, y + 6, 9, 1, f.hue);
      rect(g, f.x - 2, y, 5, 6, '#0a0612');
      rect(g, f.x - 2, y, 5, 1, f.hue);
      if (jump > 1) {
        rect(g, f.x - 5, y - 3, 1, 8, '#07040c');
        rect(g, f.x + 5, y - 3, 1, 8, '#07040c');
      }
    }
  }
}

/** A #rrggbb color at an alpha. */
function hexA(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}

/** The room for an act (ENDLESS goes round all three, starting from the floor). */
export const roomFor = (act: number, loop: number): RoomId => (loop > 0 ? (['floor', 'vip', 'alley'] as const)[(loop - 1) % 3] : act <= 1 ? 'alley' : act === 2 ? 'floor' : 'vip');
