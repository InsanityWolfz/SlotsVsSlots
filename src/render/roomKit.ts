/** The rooms' shared kit: the sizes, the seeded random, the pixel helpers (rects, discs, glows, neon, chip stacks), the machines along the wall and their lights, the carpet, the quiet zone (split from rooms.ts, 2026-11-05). */
import { drawText } from './text';

export const LW = 320;
export const LH = 180;
/** Where the wall meets the floor (the machines along the wall stand on it). */
export const FLOOR_Y = 118;
/** The open column between the two HUDs. */
export const MID = 160;

export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = LW;
  c.height = LH;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

export const rect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
export const disc = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) => {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};
export const glow = (g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) => {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(${rgb},${a})`);
  rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
};
export const line = (g: CanvasRenderingContext2D, pts: [number, number][], c: string, w = 1) => {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + 0.5, y + 0.5) : g.moveTo(x + 0.5, y + 0.5)));
  g.stroke();
};
export function hexA(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}
export function mix(a: string, b: string, k: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const c = [1, 3, 5].map((i) => Math.round(p(a, i) * (1 - k) + p(b, i) * k).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}
/** Neon: a soft glow behind, then the tube; an unlit tube still shows, dark (playtest: unlit letters read as noise). */
export function neon(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, lit: boolean, scale = 1): void {
  const w = text.length * 6 * scale;
  if (lit) {
    const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(w, 8 * scale));
    rg.addColorStop(0, hexA(color, 0.24));
    rg.addColorStop(1, hexA(color, 0));
    g.fillStyle = rg;
    g.fillRect(x - w, y - 8 * scale, w * 2, 16 * scale);
  }
  g.globalAlpha = lit ? 0.9 : 0.55;
  drawText(g, text, x, y, scale, lit ? color : mix(color, '#1a1028', 0.6), { outline: null });
  g.globalAlpha = 1;
}
/** Chips seen side on: a stack with 1px edge dashes (full white stripes read as little flags: playtest). */
export function chipStack(g: CanvasRenderingContext2D, x: number, y: number, n: number, col: string): void {
  for (let k = 0; k < n; k++) {
    rect(g, x, y - k * 2, 5, 2, col);
    rect(g, x + 1 + (k % 2) * 2, y - k * 2, 1, 1, '#f0ece6');
  }
}

export const NEON = ['#ff4fa3', '#4fe3ff', '#ffd23f', '#5aff7a', '#c38bff'];

export interface Machine {
  x: number;
  y: number;
  w: number;
  h: number;
  bulbs: number[];
  screen: string;
  trim: string;
  /** Someone's playing it, on a stool in the side strips. 'lucky' wins a bucket now and then; 'sore' bonks it. */
  player: { phase: number; hue: string; hat: boolean; mood: 'lucky' | 'sore' | 'plain' } | null;
}

export function machineRow(rnd: () => number, n: number, trims: string[], played: number): Machine[] {
  const out: Machine[] = [];
  const pitch = LW / n;
  let left = 0;
  for (let i = 0; i < n; i++) {
    const w = 16 + Math.floor(rnd() * 5);
    const h = 30 + Math.floor(rnd() * 8);
    const x = Math.round(i * pitch + (pitch - w) / 2 + (rnd() - 0.5) * 4);
    const phase = rnd() * 10;
    const hue = ['#3a2a52', '#52302a', '#2a4252', '#4a4a2a'][Math.floor(rnd() * 4)];
    const hat = rnd() < 0.4;
    const bulbs = [0, 1, 2, 3].map(() => rnd() * Math.PI * 2);
    const screen = NEON[Math.floor(rnd() * NEON.length)];
    const trim = trims[Math.floor(rnd() * trims.length)];
    const roll = rnd();
    // The middle stays clear (the turn text sits there: playtest).
    if (x + w > 136 && x < 184) continue;
    const side = x < 40 || x > 262;
    const plays = side && roll < played;
    out.push({ x, y: FLOOR_Y - h, w, h, bulbs, screen, trim, player: plays ? { phase, hue, hat, mood: x < 40 ? (left++ === 0 ? 'lucky' : 'plain') : 'sore' } : null });
  }
  return out;
}

export function drawMachineBody(g: CanvasRenderingContext2D, m: Machine, body: string, edge: string): void {
  rect(g, m.x + 1, m.y, m.w - 2, 5, body);
  rect(g, m.x, m.y + 5, m.w, m.h - 5, body);
  rect(g, m.x, m.y + 5, 1, m.h - 5, edge);
  rect(g, m.x + 1, m.y + 4, m.w - 2, 1, m.trim);
  rect(g, m.x + 3, m.y + 9, m.w - 6, 9, '#07040c');
  for (let r = 0; r < 3; r++) rect(g, m.x + 4 + r * ((m.w - 8) / 3), m.y + 10, (m.w - 8) / 3 - 1, 7, '#100a1a');
  rect(g, m.x + 2, m.y + 21, m.w - 4, 2, edge);
}

export function carpet(g: CanvasRenderingContext2D, base: string, a: string, b: string): void {
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, base);
  let y = FLOOR_Y + 2;
  for (let row = 0; y < LH; row++) {
    const step = 10 + row * 2;
    // Quieter near the buttons (playtest: the pattern crowded them).
    const ka = y > 150 ? mix(a, base, 0.45) : a;
    const kb = y > 150 ? mix(b, base, 0.45) : b;
    for (let x = (row % 2) * (step / 2) - step; x < LW + step; x += step) {
      const cx = Math.round(x);
      rect(g, cx, y + 1, 1, 1, ka);
      rect(g, cx - 1, y + 2, 3, 1, ka);
      rect(g, cx, y + 3, 1, 1, ka);
      rect(g, cx + Math.round(step / 2), y + 2, 1, 1, kb);
    }
    y += 5 + row;
  }
  rect(g, 0, FLOOR_Y, LW, 2, '#05030a');
}

/** The quiet zone behind the turn text: the wall a shade darker in the middle, the machines' shared shadow pool. */
export function quietZone(g: CanvasRenderingContext2D): void {
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(122, 64, 76, FLOOR_Y - 64);
  g.save();
  g.translate(MID, FLOOR_Y - 4);
  g.scale(1, 0.35);
  const rg = g.createRadialGradient(0, 0, 2, 0, 0, 40);
  rg.addColorStop(0, 'rgba(0,0,0,0.45)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(-40, -40, 80, 80);
  g.restore();
}

export interface RoomArt {
  still: HTMLCanvasElement;
  machines: Machine[];
}

export function machineLights(g: CanvasRenderingContext2D, machines: Machine[], t: number, cheer: number, bulbOn: string): void {
  machines.forEach((m, i) => {
    m.bulbs.forEach((ph, k) => {
      const chase = cheer > 0 && Math.floor(t * 14 - i) % 4 === k;
      const on = chase || Math.sin(t * 1.7 + ph) > 0.35;
      rect(g, m.x + 2 + k * ((m.w - 5) / 3), m.y + 1, 2, 2, on ? (chase ? '#ffd23f' : bulbOn) : '#3a2a1a');
    });
    g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.8 + i * 1.3) + cheer * 0.3;
    rect(g, m.x + 4, m.y + 10, m.w - 8, 7, m.screen);
    g.globalAlpha = 0.3;
    rect(g, m.x + 4, m.y + 10 + ((t * 12 + i * 3) % 7), m.w - 8, 1, '#ffffff');
    g.globalAlpha = 1;
  });
}
