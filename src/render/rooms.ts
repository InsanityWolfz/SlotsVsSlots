/**
 * THE ROOMS (user, 2026-10-13: "the background is kind of boring"; v2 the same day, after the playtesters called v1
 * the best visual feature yet: "really get creative"). Each act is a place, and it stays behind every screen of the
 * act (the Cashier, the encounters), not only the fights:
 *   act 1 THE ALLEY: a back-alley den at night. Rain, puddles that ripple, laundry on a line, a stray cat on the
 *     dumpster, a doorman with a cigarette by the DEN door, steam from a grate, a bare bulb swaying.
 *   act 2 THE FLOOR: the casino floor. Vertical neon (CASINO lit letter by letter, LUCKY 7), a big 777 sign with chase
 *     bulbs, gamblers pulling levers at the machines along the wall, a cocktail waitress crossing the carpet,
 *     searchlights sweeping.
 *   act 3 THE VIP ROOM: velvet curtains, marble pillars, a grand chandelier, a champagne tower with bubbles rising,
 *     velvet ropes, gold dust in the air.
 *   ENDLESS goes round the three, darker and more gold each loop.
 * Bosses bring a set piece into the open column between the HUDs: the House's vault door (light leaking round it,
 * coins at its foot), THE WHEEL's own roulette wheel (spinning, its ball riding), the Dealer's lamp over a felt table
 * with a fanned hand. The room reacts: your jackpot sets every light chasing, the crowd at the corners jumps with
 * their arms up and confetti falls; theirs makes it wince (a red cast); under 30% HP the edges pulse slowly red.
 *
 * Where it draws: the fight covers the middle (the two machines, their HUDs, the marquee), so the detail lives where
 * the screen stays open: the side strips, the column between the HUDs, and the floor. Drawn in chunky pixels at a
 * quarter size (320x180) and scaled up 4x without smoothing, so it's the same 8-bit art as the sprites. The still
 * parts are drawn once per room; the live parts every frame on a small canvas. Nothing flashes: the strongest tint
 * is under 0.1 (FLASH_CAP is 0.2).
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
  /** In a fight (the crowd only shows there; between fights the room is a backdrop under the screens). */
  fight: boolean;
}

export const LW = 320;
export const LH = 180;
/** Where the wall meets the floor (the machines along the wall stand on it). */
const FLOOR_Y = 118;
/** The open column between the two HUDs (the boss set pieces and the room's big sign live here). */
const MID = 160;

/** A small seeded random (a room is laid out the same every time you see it). */
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
const disc = (g: CanvasRenderingContext2D, x: number, y: number, r: number, c: string) => {
  g.fillStyle = c;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
};
const glow = (g: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number) => {
  const rg = g.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(${rgb},${a})`);
  rg.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = rg;
  g.fillRect(x - r, y - r, r * 2, r * 2);
};
/** A #rrggbb color at an alpha. */
function hexA(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}
/** Neon: a soft glow behind, then the tube (an unlit tube still shows, dark). */
function neon(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, a: number, scale = 1): void {
  const w = text.length * 6 * scale;
  if (a > 0.3) {
    const rg = g.createRadialGradient(x, y, 0, x, y, Math.max(w, 8 * scale));
    rg.addColorStop(0, hexA(color, 0.28 * a));
    rg.addColorStop(1, hexA(color, 0));
    g.fillStyle = rg;
    g.fillRect(x - w, y - 8 * scale, w * 2, 16 * scale);
  }
  g.globalAlpha = Math.max(0.22, a);
  drawText(g, text, x, y, scale, a > 0.3 ? color : '#3a2a4a', { outline: null });
  g.globalAlpha = 1;
}

const NEON = ['#ff4fa3', '#4fe3ff', '#ffd23f', '#5aff7a', '#c38bff'];

interface Machine {
  x: number;
  y: number;
  w: number;
  h: number;
  bulbs: number[];
  screen: string;
  trim: string;
  /** Someone's playing it: a gambler on a stool, pulling the lever now and then. */
  player: { phase: number; hue: string; hat: boolean } | null;
}

function machineRow(rnd: () => number, n: number, trims: string[], played: number): Machine[] {
  const out: Machine[] = [];
  const pitch = LW / n;
  for (let i = 0; i < n; i++) {
    const w = 16 + Math.floor(rnd() * 5);
    const h = 30 + Math.floor(rnd() * 8);
    const x = Math.round(i * pitch + (pitch - w) / 2 + (rnd() - 0.5) * 4);
    // The gamblers sit where the fight leaves them in view: the side strips.
    const side = x < 40 || x > 262;
    out.push({
      x,
      y: FLOOR_Y - h,
      w,
      h,
      bulbs: [0, 1, 2, 3].map(() => rnd() * Math.PI * 2),
      screen: NEON[Math.floor(rnd() * NEON.length)],
      trim: trims[Math.floor(rnd() * trims.length)],
      player: side && rnd() < played ? { phase: rnd() * 10, hue: ['#3a2a52', '#52302a', '#2a4252', '#4a4a2a'][Math.floor(rnd() * 4)], hat: rnd() < 0.4 } : null,
    });
  }
  return out;
}

function drawMachineBody(g: CanvasRenderingContext2D, m: Machine, body: string, edge: string): void {
  rect(g, m.x + 1, m.y, m.w - 2, 5, body);
  rect(g, m.x, m.y + 5, m.w, m.h - 5, body);
  rect(g, m.x, m.y + 5, 1, m.h - 5, edge);
  rect(g, m.x + 1, m.y + 4, m.w - 2, 1, m.trim);
  rect(g, m.x + 3, m.y + 9, m.w - 6, 9, '#07040c');
  for (let r = 0; r < 3; r++) rect(g, m.x + 4 + r * ((m.w - 8) / 3), m.y + 10, (m.w - 8) / 3 - 1, 7, '#100a1a');
  rect(g, m.x + 2, m.y + 21, m.w - 4, 2, edge);
}

function carpet(g: CanvasRenderingContext2D, base: string, a: string, b: string): void {
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, base);
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
  rect(g, 0, FLOOR_Y, LW, 2, '#05030a');
}

// ---- the still layers --------------------------------------------------------------------------------------------

interface RoomArt {
  still: HTMLCanvasElement;
  machines: Machine[];
}

function buildAlley(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(11);
  // The night sky over the alley, between the rooftops (stars drawn live: they twinkle).
  const sky = g.createLinearGradient(0, 0, 0, 40);
  sky.addColorStop(0, '#05040e');
  sky.addColorStop(1, '#141030');
  g.fillStyle = sky;
  g.fillRect(0, 0, LW, 40);
  // Two buildings, brick, the left one with a fire escape, the right one with the den's door.
  rect(g, 0, 14, LW, FLOOR_Y - 14, '#1a0c16');
  for (let y = 14, row = 0; y < FLOOR_Y; y += 6, row++)
    for (let x = (row % 2) * -6; x < LW; x += 12) {
      const k = rnd();
      rect(g, x + 1, y + 1, 10, 4, k < 0.15 ? '#24121c' : k > 0.9 ? '#3a1e26' : '#2e1720');
    }
  // The gap between the buildings: a strip of sky down the middle.
  rect(g, 118, 0, 84, 26, '#0b0a1c');
  for (let y = 26; y > 14; y -= 4) rect(g, 118, y, 84, 1, '#120e26');
  // Rooftop edges and a water tower on the left roof.
  rect(g, 0, 13, 118, 2, '#0a0610');
  rect(g, 202, 13, 118, 2, '#0a0610');
  rect(g, 14, 2, 16, 10, '#120a10');
  rect(g, 16, 0, 12, 2, '#160c14');
  for (const lx of [16, 27]) rect(g, lx, 12, 1, 2, '#120a10');
  // Lit windows in the upper floors (some warm, some blue TV glow).
  for (const [wx, wy, col] of [[48, 22, '#3a2a14'], [70, 22, '#2a2a44'], [232, 22, '#3a2a14'], [290, 22, '#1a1a2a'], [258, 40, '#3a2a14']] as const) {
    rect(g, wx, wy, 8, 10, '#0a0608');
    rect(g, wx + 1, wy + 1, 6, 8, col);
    rect(g, wx + 4, wy + 1, 1, 8, '#0a0608');
  }
  // Fire escape down the left wall.
  for (let y = 30; y < 96; y += 22) {
    rect(g, 4, y, 34, 1, '#0c0608');
    for (let x = 4; x < 38; x += 4) rect(g, x, y - 5, 1, 5, '#0c0608');
    rect(g, 4, y - 6, 34, 1, '#0c0608');
  }
  for (let y = 30; y < 96; y += 3) rect(g, 34, y, 4, 1, '#0c0608');
  // The den: a door in the right wall with a step, a peephole, light under it.
  rect(g, 284, 66, 26, 52, '#0e060c');
  rect(g, 286, 68, 22, 50, '#1c0e14');
  rect(g, 294, 76, 6, 2, '#05030a');
  rect(g, 304, 92, 2, 3, '#6a5a30');
  rect(g, 280, 116, 34, 2, '#24161a');
  // A dumpster on the left with its lid.
  rect(g, 2, 98, 36, 20, '#1a2a22');
  rect(g, 2, 98, 36, 2, '#22382c');
  rect(g, 1, 96, 38, 3, '#142019');
  for (let x = 6; x < 36; x += 8) rect(g, x, 102, 1, 14, '#142019');
  // A drainpipe and a NO LOITERING plate.
  rect(g, 270, 14, 3, FLOOR_Y - 14, '#140a10');
  rect(g, 246, 58, 22, 8, '#3a3a3a');
  drawText(g, 'NO', 257, 62, 1, '#1a1a1a', { outline: null });
  // Wet asphalt with puddles (their ripples are drawn live), a manhole grate in the middle.
  rect(g, 0, FLOOR_Y, LW, LH - FLOOR_Y, '#0e0a12');
  for (let i = 0; i < 40; i++) rect(g, rnd() * LW, FLOOR_Y + 4 + rnd() * 58, 2 + rnd() * 10, 1, '#16121c');
  for (const [px, py, pw] of PUDDLES) {
    g.fillStyle = '#141428';
    g.beginPath();
    g.ellipse(px, py, pw, 3, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#1a1620';
  g.beginPath();
  g.ellipse(MID, 152, 14, 4, 0, 0, Math.PI * 2);
  g.fill();
  for (let x = MID - 10; x <= MID + 10; x += 4) rect(g, x, 150, 1, 4, '#0a080e');
  return { still: c, machines: [] };
}
const PUDDLES: [number, number, number][] = [
  [20, 140, 14],
  [300, 150, 12],
  [140, 170, 18],
  [230, 132, 10],
];

function buildFloor(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(23);
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, '#0e061c');
  wall.addColorStop(1, '#22103a');
  g.fillStyle = wall;
  g.fillRect(0, 0, LW, FLOOR_Y);
  // The ceiling: a coffered strip of light panels.
  rect(g, 0, 0, LW, 6, '#08040e');
  for (let x = 4; x < LW; x += 16) rect(g, x, 2, 10, 2, '#1e1430');
  for (let x = 0; x < LW; x += 40) {
    rect(g, x, 6, 1, FLOOR_Y, '#2c1648');
    rect(g, x + 1, 6, 1, FLOOR_Y, '#0e0618');
  }
  // Vertical neon frames down the side walls (their letters light live).
  for (const x of [4, 298]) {
    rect(g, x - 1, 23, 20, 86, '#0a0414');
    rect(g, x, 24, 18, 84, '#160a28');
  }
  // The big sign's backing in the open column.
  rect(g, MID - 32, 16, 64, 30, '#0a0414');
  rect(g, MID - 31, 17, 62, 28, '#1a0c2e');
  rect(g, MID - 2, 46, 1, 6, '#0a0414');
  rect(g, MID + 1, 46, 1, 6, '#0a0414');
  rect(g, 0, 78, LW, 1, '#5a4214');
  const machines = machineRow(rnd, 14, ['#c9a227', '#ff4fa3', '#4fe3ff'], 0.9);
  for (const m of machines) drawMachineBody(g, m, '#0c0616', '#241438');
  carpet(g, '#2a0c24', '#1f6a6a', '#c9a227');
  return { still: c, machines };
}

function buildVip(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(37);
  rect(g, 0, 0, LW, FLOOR_Y, '#1c0a0c');
  // A coffered gold ceiling.
  rect(g, 0, 0, LW, 8, '#120606');
  for (let x = 2; x < LW; x += 20) {
    rect(g, x, 1, 16, 5, '#2a1208');
    rect(g, x, 1, 16, 1, '#5a3a14');
  }
  rect(g, 0, 8, LW, 2, '#c9a227');
  for (let x = 0; x < LW; x += 32) {
    rect(g, x + 3, 30, 26, 80, '#26100e');
    rect(g, x + 3, 30, 26, 1, '#5a3a14');
    rect(g, x + 3, 109, 26, 1, '#3a2410');
  }
  rect(g, 0, 26, LW, 2, '#c9a227');
  rect(g, 0, 112, LW, 2, '#8a6a18');
  // Marble pillars just inside the curtains.
  for (const px of [40, 270]) {
    rect(g, px, 10, 10, FLOOR_Y - 10, '#d8d0c8');
    rect(g, px + 1, 10, 2, FLOOR_Y - 10, '#f0ece6');
    rect(g, px + 7, 10, 3, FLOOR_Y - 10, '#a8a098');
    for (let k = 0; k < 6; k++) rect(g, px + 4 + (k % 2), 20 + k * 16, 1, 6, '#bdb4aa');
    rect(g, px - 2, 10, 14, 4, '#c9a227');
    rect(g, px - 2, FLOOR_Y - 4, 14, 4, '#8a6a18');
  }
  // Curtains, tied back with gold rope, at both ends.
  for (const side of [0, 1]) {
    const x0 = side ? LW - 36 : 0;
    for (let k = 0; k < 36; k += 4) {
      const pinch = Math.abs(k - (side ? 26 : 10)) < 6 ? 0 : 0;
      rect(g, x0 + k, 10, 4, FLOOR_Y + 40, k % 8 ? '#5a0c18' : '#3a0610');
      rect(g, x0 + k + 1, 10, 1, FLOOR_Y + 40, '#6e1420');
      void pinch;
    }
    rect(g, x0, 10, 36, 4, '#c9a227');
    rect(g, x0 + 4, 72, 28, 3, '#c9a227');
    disc(g, x0 + (side ? 6 : 30), 74, 3, '#e8c84a');
  }
  const machines = machineRow(rnd, 9, ['#c9a227', '#ffe9a0'], 0).filter((m) => m.x > 52 && m.x + m.w < LW - 52);
  for (const m of machines) drawMachineBody(g, m, '#120608', '#3a2410');
  carpet(g, '#3a0812', '#8a6a18', '#c9a227');
  for (const side of [0, 1]) {
    const x0 = side ? LW - 36 : 0;
    for (let k = 0; k < 36; k += 4) rect(g, x0 + k, FLOOR_Y, 4, 40, k % 8 ? '#4a0a14' : '#30050c');
  }
  return { still: c, machines };
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

// ---- the crowd ---------------------------------------------------------------------------------------------------

interface Fan {
  x: number;
  h: number;
  w: number;
  phase: number;
  coat: string;
  skin: string;
  hair: 'cap' | 'hat' | 'bob' | 'bald' | 'tall';
  hairColor: string;
}
/** Four at each bottom corner (the middle of the floor is the fight's). */
const FANS: Fan[] = (() => {
  const rnd = seeded(5);
  const xs = [6, 17, 28, 39, 281, 292, 303, 314];
  const coats = ['#3a2a6a', '#6a2a3a', '#2a5a5a', '#5a4a1a', '#2a2a2a', '#4a1a5a'];
  const skins = ['#e8b48a', '#a8704a', '#6a4028', '#f0c8a0'];
  const hairs: Fan['hair'][] = ['cap', 'hat', 'bob', 'bald', 'tall'];
  return xs.map((x) => ({
    x,
    h: 20 + Math.floor(rnd() * 6),
    w: 9 + Math.floor(rnd() * 3),
    phase: rnd() * Math.PI * 2,
    coat: coats[Math.floor(rnd() * coats.length)],
    skin: skins[Math.floor(rnd() * skins.length)],
    hair: hairs[Math.floor(rnd() * hairs.length)],
    hairColor: ['#1a1008', '#5a3a1a', '#c9a227', '#3a3a3a'][Math.floor(rnd() * 4)],
  }));
})();

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  life: number;
}

/** The live layer: lights, people, weather, the boss's set piece, the reactions. */
export class Rooms {
  private live: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  /** A jackpot's reaction: 1 when it lands, fading to 0. */
  private cheerT = 0;
  private cheerOurs = true;
  /** Confetti (yours), champagne foam, rain splashes: short-lived pixels. */
  private bits: Bit[] = [];
  private lastRoom: RoomId | null = null;

  constructor() {
    [this.live, this.g] = canvas();
  }

  /** A jackpot landed: yours cheers the room (lights chase, the crowd jumps, confetti), theirs makes it wince. */
  cheer(ours: boolean): void {
    this.cheerT = 1;
    this.cheerOurs = ours;
    if (!ours) return;
    const cols = ['#ffd23f', '#ff4fa3', '#4fe3ff', '#5aff7a', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      // From the top of the open column and the side strips, where it shows.
      const x = [MID + (Math.random() - 0.5) * 70, Math.random() * 40, LW - Math.random() * 40][i % 3];
      this.bits.push({ x, y: -Math.random() * 30, vx: (Math.random() - 0.5) * 14, vy: 18 + Math.random() * 22, c: cols[i % cols.length], life: 3 + Math.random() * 2 });
    }
  }

  update(dt: number): void {
    this.cheerT = Math.max(0, this.cheerT - dt / 1.6);
    for (const b of this.bits) {
      b.x += (b.vx + Math.sin(b.y * 0.2) * 6) * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0 && b.y < LH + 4);
  }

  draw(ctx: CanvasRenderingContext2D, s: Scene, time: number): void {
    const art = room(s.room);
    if (this.lastRoom !== s.room) {
      this.lastRoom = s.room;
      this.bits = [];
    }
    const g = this.g;
    g.clearRect(0, 0, LW, LH);
    const cheer = this.cheerT;
    const ours = this.cheerOurs ? cheer : 0;
    // (A boss's set piece takes the open column: the room's own centrepiece steps aside.)
    const mid = !s.boss;
    if (s.room === 'alley') this.alley(g, time, ours, mid);
    else if (s.room === 'floor') this.floor(g, art, time, ours, mid);
    else this.vip(g, art, time, ours, mid);
    if (s.boss === 'house') this.vault(g, time, ours);
    else if (s.boss === 'wheel') this.wheel(g, time);
    else if (s.boss === 'dealer') this.dealer(g, time);
    if (s.fight) this.crowd(g, time, ours);
    for (const b of this.bits) {
      g.globalAlpha = Math.min(1, b.life);
      rect(g, b.x, b.y, Math.sin(time * 9 + b.x) > 0 ? 2 : 1, 1, b.c);
    }
    g.globalAlpha = 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art.still, 0, 0, LW * 4, LH * 4);
    ctx.drawImage(this.live, 0, 0, LW * 4, LH * 4);
    ctx.restore();
    const full = (c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    };
    // ENDLESS: each loop darker, with a gold cast (the same rooms, richer and meaner).
    if (s.loop > 0) {
      full(`rgba(4,2,8,${Math.min(0.4, 0.08 * s.loop)})`);
      full(`rgba(201,162,39,${Math.min(0.08, 0.02 * s.loop)})`);
    }
    // A jackpot tints the room a little: gold for yours, red for theirs (never a flash: under 0.1).
    if (cheer > 0) full(this.cheerOurs ? hexA('#ffd23f', 0.06 * cheer) : hexA('#ff4a3a', 0.08 * cheer));
    // Low HP: a slow red pulse at the edges.
    if (s.fight && s.hp < 0.3) {
      const k = (0.3 - s.hp) / 0.3;
      const a = (0.1 + 0.06 * Math.sin(time * 2.5)) * (0.5 + 0.5 * k);
      const rg = ctx.createRadialGradient(LW * 2, LH * 2, LH * 1.3, LW * 2, LH * 2, LW * 2.4);
      rg.addColorStop(0, 'rgba(255,40,40,0)');
      rg.addColorStop(1, `rgba(255,40,40,${a})`);
      ctx.fillStyle = rg;
      ctx.fillRect(-40, -40, LW * 4 + 80, LH * 4 + 80);
    }
  }

  // ---- act 1: the alley ------------------------------------------------------------------------------------------

  private alley(g: CanvasRenderingContext2D, t: number, cheer: number, mid: boolean): void {
    // Stars between the rooftops, twinkling; a slice of moon.
    const rnd = seeded(99);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * LW;
      const y = rnd() * 12 + (x > 118 && x < 202 ? rnd() * 12 : 0);
      if (Math.sin(t * (0.5 + rnd()) + i) > -0.3) rect(g, x, y, 1, 1, i % 5 ? '#8a86b0' : '#ffffff');
    }
    disc(g, 186, 8, 5, '#e8e4c8');
    disc(g, 188, 7, 4, '#0b0a1c');
    // Laundry on a line across the gap, swaying.
    const sag = (x: number) => 20 + Math.sin(((x - 118) / 84) * Math.PI) * 5;
    for (let x = 118; x < 202; x += 2) rect(g, x, sag(x), 2, 1, '#2a2430');
    for (const [lx, col, kind] of [[132, '#8a2a3a', 0], [150, '#2a5a8a', 1], [170, '#c9c0a0', 0], [188, '#5a8a3a', 1]] as const) {
      const sw = Math.sin(t * 1.6 + lx) * 1.2;
      const y = sag(lx) + 1;
      if (kind === 0) {
        rect(g, lx - 4 + sw, y, 9, 3, col);
        rect(g, lx - 3 + sw, y + 3, 7, 6, col);
      } else {
        rect(g, lx - 3 + sw, y, 7, 4, col);
        rect(g, lx - 3 + sw, y + 4, 3, 6, col);
        rect(g, lx + 1 + sw, y + 4, 3, 6, col);
      }
    }
    // Lit windows flicker with the TV.
    g.globalAlpha = 0.25 + 0.25 * Math.max(0, Math.sin(t * 5.1) * Math.sin(t * 1.7));
    rect(g, 71, 23, 6, 8, '#6a6aff');
    g.globalAlpha = 1;
    // The bulb on its wire, swaying, its warm cone on the wall.
    if (mid) this.bulb(g, t, cheer);
    this.alleyLife(g, t, cheer);
  }

  private bulb(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const sway = Math.sin(t * 0.7) * 3;
    const bx = MID + sway;
    for (let y = 0; y < 30; y++) rect(g, MID + (sway * y) / 30, y, 1, 1, '#0a0608');
    glow(g, bx, 34, 60, '255,210,122', 0.2 + cheer * 0.1);
    rect(g, bx - 2, 30, 4, 4, '#ffe9b0');
    rect(g, bx - 1, 29, 2, 1, '#3a3a3a');
  }

  /** The den's door and its doorman, the cat, the steam, the rain. */
  private alleyLife(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    // DEN: a neon arrow over the door, buzzing.
    const buzz = Math.sin(t * 7.3) * Math.sin(t * 2.1) > 0.8 ? 0.4 : 1;
    neon(g, 'DEN', 297, 56, '#ff8a5a', Math.min(1, buzz + cheer));
    if (buzz > 0.5) {
      rect(g, 296, 60, 3, 1, '#ff8a5a');
      rect(g, 297, 61, 1, 1, '#ff8a5a');
    }
    // Light under the den's door, and a bit of music: it pulses.
    g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
    rect(g, 286, 117, 22, 1, '#ffb070');
    g.globalAlpha = 1;
    // The doorman: leaning by the door, his cigarette brightening as he draws on it, smoke curling up.
    const dx = 276;
    rect(g, dx - 3, 88, 7, 30, '#0a0608');
    rect(g, dx - 2, 82, 5, 6, '#0c080a');
    rect(g, dx - 3, 81, 7, 2, '#060406');
    const drag = Math.max(0, Math.sin(t * 0.9));
    rect(g, dx + 3, 86, 2, 1, drag > 0.8 ? '#ffb040' : '#a04020');
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.4 + k * 0.25) % 1;
      g.globalAlpha = 0.25 * (1 - p);
      rect(g, dx + 4 + Math.sin(p * 6 + k) * 2, 85 - p * 20, 2, 2, '#8a8a9a');
    }
    g.globalAlpha = 1;
    // The cat on the dumpster: its eyes catch the light, it blinks; its tail flicks; on your jackpot it bolts upright.
    const cy = cheer > 0.3 ? 88 : 90;
    rect(g, 22, cy, 9, 6, '#060408');
    rect(g, 28, cy - 4, 5, 5, '#060408');
    rect(g, 28, cy - 5, 1, 1, '#060408');
    rect(g, 32, cy - 5, 1, 1, '#060408');
    if (Math.sin(t * 0.6) < 0.95) {
      rect(g, 29, cy - 2, 1, 1, '#c8ff4a');
      rect(g, 31, cy - 2, 1, 1, '#c8ff4a');
    }
    const tail = Math.sin(t * 2.2);
    rect(g, 20, cy + 1 + Math.round(tail), 3, 1, '#060408');
    rect(g, 19, cy - 1 + Math.round(tail * 2), 1, 3, '#060408');
    // Steam from the grate.
    for (let k = 0; k < 6; k++) {
      const p = (t * 0.25 + k / 6) % 1;
      g.globalAlpha = 0.18 * Math.sin(p * Math.PI);
      const w = 4 + p * 14;
      rect(g, MID - w / 2 + Math.sin(p * 5 + k) * 3, 150 - p * 40, w, 3, '#9a96aa');
    }
    g.globalAlpha = 1;
    // Rain: thin streaks falling at a slant, splashes on the ground, rings in the puddles.
    g.fillStyle = 'rgba(170,180,230,0.45)';
    for (let i = 0; i < 90; i++) {
      const x = ((i * 37.3 + t * 40) % (LW + 40)) - 20;
      const y = (i * 53.7 + t * 170) % (LH + 10);
      g.fillRect(Math.round(x - y * 0.18), Math.round(y), 1, 4);
    }
    for (const [px, py, pw] of PUDDLES) {
      for (let k = 0; k < 2; k++) {
        const p = (t * 0.7 + k * 0.5 + px * 0.01) % 1;
        g.strokeStyle = `rgba(150,160,210,${0.35 * (1 - p)})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(px + ((px * 7 + k * 13) % pw) - pw / 2, py, 1 + p * 6, 0.5 + p * 1.5, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
  }

  // ---- act 2: the casino floor -----------------------------------------------------------------------------------

  private floor(g: CanvasRenderingContext2D, art: RoomArt, t: number, cheer: number, mid: boolean): void {
    // Ceiling lights twinkling along the top.
    for (let x = 4, k = 0; x < LW; x += 16, k++) rect(g, x + 2, 2, 6, 2, Math.sin(t * 2 + k) > 0.2 || cheer > 0 ? '#5a4a8a' : '#2a2040');
    // Searchlights sweeping up the side walls.
    for (const [x0, ph] of [[24, 0], [296, 2]] as const) {
      const a = Math.sin(t * 0.4 + ph) * 0.35;
      g.fillStyle = `rgba(200,190,255,${0.06 + cheer * 0.06})`;
      g.beginPath();
      g.moveTo(x0, FLOOR_Y);
      g.lineTo(x0 + Math.sin(a - 0.12) * 120, FLOOR_Y - 120);
      g.lineTo(x0 + Math.sin(a + 0.12) * 120, FLOOR_Y - 120);
      g.closePath();
      g.fill();
    }
    // CASINO down the left wall, lit letter by letter; LUCKY 7 down the right, its 7 blinking.
    const word = 'CASINO';
    const lit = Math.floor(t * 3) % (word.length + 3);
    [...word].forEach((ch, i) => neon(g, ch, 13, 32 + i * 14, '#ff4fa3', cheer > 0 || i < lit ? 1 : 0.25, 2));
    [...'LUCKY'].forEach((ch, i) => neon(g, ch, 307, 32 + i * 14, '#4fe3ff', 0.85 + 0.15 * Math.sin(t * 2 + i), 2));
    neon(g, '7', 307, 102, '#ffd23f', Math.sin(t * 4) > 0 || cheer > 0 ? 1 : 0.25, 2);
    // The big sign in the open column: 777 framed by chase bulbs, JACKPOT under it.
    if (mid) this.bigSign(g, t, cheer);
    this.floorLife(g, art, t, cheer);
  }

  private bigSign(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    neon(g, '777', MID, 26, '#ffd23f', 1);
    neon(g, 'JACKPOT', MID, 38, '#ff4fa3', 0.8 + 0.2 * Math.sin(t * 3));
    const bulbs: [number, number][] = [];
    for (let x = MID - 31; x <= MID + 30; x += 4) bulbs.push([x, 16]);
    for (let y = 20; y <= 42; y += 4) bulbs.push([MID + 30, y]);
    for (let x = MID + 30; x >= MID - 31; x -= 4) bulbs.push([x, 44]);
    for (let y = 40; y >= 20; y -= 4) bulbs.push([MID - 31, y]);
    const head = (t * (cheer > 0 ? 40 : 14)) % bulbs.length;
    bulbs.forEach(([bx, by], i) => {
      const d = (head - i + bulbs.length) % bulbs.length;
      rect(g, bx, by, 1, 1, d < 5 ? '#fff6c8' : i % 2 ? '#8a6a18' : '#c9a227');
    });
  }

  /** The machines' lights, the gamblers, the waitress. */
  private floorLife(g: CanvasRenderingContext2D, art: RoomArt, t: number, cheer: number): void {
    // The machines along the wall: bulbs blink, screens glow; a jackpot runs a chase down the whole row.
    this.machineLights(g, art.machines, t, cheer, '#ffe9a0');
    // Gamblers at the side machines: on a stool, an arm on the lever, pulling now and then; a win sparkles.
    for (const m of art.machines) {
      if (!m.player) continue;
      const p = m.player;
      const cyc = (t * 0.5 + p.phase) % 4;
      const pull = cyc < 0.3 ? cyc / 0.3 : cyc < 0.6 ? 1 - (cyc - 0.3) / 0.3 : 0;
      const sx = m.x + m.w - 2;
      rect(g, sx - 1, FLOOR_Y - 8, 6, 2, '#2a1a10');
      rect(g, sx + 1, FLOOR_Y - 6, 1, 6, '#2a1a10');
      rect(g, sx - 1, FLOOR_Y - 20, 7, 12, p.hue);
      rect(g, sx, FLOOR_Y - 26, 5, 6, '#c8946a');
      if (p.hat) rect(g, sx - 1, FLOOR_Y - 28, 7, 2, '#1a1008');
      rect(g, sx + 6, FLOOR_Y - 19 + pull * 6, 3, 1, p.hue);
      rect(g, sx + 8, FLOOR_Y - 22 + pull * 7, 1, 4, '#8a8a9a');
      disc(g, sx + 8, FLOOR_Y - 23 + pull * 7, 1.2, '#ff4a4a');
      if (cyc > 1.2 && cyc < 1.6 && Math.floor(p.phase * 3) % 3 === 0) rect(g, m.x + m.w / 2 + Math.sin(t * 20) * 3, m.y + 6 - (cyc - 1.2) * 20, 1, 1, '#ffd23f');
    }
    // The cocktail waitress, crossing the floor in front of the machines with her tray; she turns at the walls.
    const span = LW + 60;
    const pos = (t * 9) % (span * 2);
    const right = pos < span;
    const wx = (right ? pos : span * 2 - pos) - 30;
    const step = Math.floor(t * 6) % 2;
    const y0 = FLOOR_Y + 6;
    rect(g, wx - 2, y0 - 6, 5, 7, '#1a1a1a');
    rect(g, wx - 2, y0 + 1, 2, 5 + step, '#e8b48a');
    rect(g, wx + 1, y0 + 1, 2, 6 - step, '#e8b48a');
    rect(g, wx - 2, y0 - 13, 5, 7, '#8a1a2a');
    rect(g, wx - 1, y0 - 18, 4, 5, '#e8b48a');
    rect(g, wx - 2, y0 - 19, 6, 2, '#5a3a1a');
    const tray = right ? wx + 5 : wx - 6;
    rect(g, tray, y0 - 14, 5, 1, '#c0c0c8');
    rect(g, tray + 1, y0 - 17, 1, 3, '#5aff7a');
    rect(g, tray + 3, y0 - 16, 1, 2, '#ff4fa3');
  }

  private machineLights(g: CanvasRenderingContext2D, machines: Machine[], t: number, cheer: number, bulbOn: string): void {
    machines.forEach((m, i) => {
      m.bulbs.forEach((ph, k) => {
        const chase = cheer > 0 && Math.floor(t * 14 - i) % 4 === k;
        const on = chase || Math.sin(t * 1.7 + ph) > 0.35;
        rect(g, m.x + 2 + k * ((m.w - 5) / 3), m.y + 1, 2, 2, on ? (chase ? '#ffd23f' : bulbOn) : '#3a2a1a');
      });
      g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 0.8 + i * 1.3) + cheer * 0.3;
      rect(g, m.x + 4, m.y + 10, m.w - 8, 7, m.screen);
      // Their reels turning: a bright line rolls down the screen.
      g.globalAlpha = 0.3;
      rect(g, m.x + 4, m.y + 10 + ((t * 12 + i * 3) % 7), m.w - 8, 1, '#ffffff');
      g.globalAlpha = 1;
    });
  }

  // ---- act 3: the VIP room ---------------------------------------------------------------------------------------

  private vip(g: CanvasRenderingContext2D, art: RoomArt, t: number, cheer: number, mid: boolean): void {
    this.machineLights(g, art.machines, t, cheer, '#fff0be');
    if (mid) this.chandelier(g, t, cheer);
    this.vipLife(g, t, cheer);
  }

  /** The grand chandelier in the open column, swaying a hair, its crystals twinkling (all at once on a jackpot). */
  private chandelier(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const sw = Math.sin(t * 0.6) * 0.8;
    const cx = MID + sw;
    const dy = 12;
    g.save();
    g.translate(0, dy);
    rect(g, MID, -2, 1, 8, '#5a4214');
    glow(g, cx, 28, 44, '255,233,160', 0.16 + cheer * 0.12);
    rect(g, cx - 16, 18, 33, 2, '#c9a227');
    rect(g, cx - 12, 22, 25, 2, '#a8861e');
    rect(g, cx - 7, 26, 15, 2, '#8a6a18');
    for (const [k, y] of [[-16, 20], [-8, 20], [0, 20], [8, 20], [16, 20], [-12, 24], [-4, 24], [4, 24], [12, 24], [-6, 28], [0, 28], [6, 28]] as const) {
      const tw = Math.sin(t * 3 + k * 1.7 + y) > 0.55 - cheer ? '#fff6c8' : '#c9b06a';
      rect(g, cx + k, y, 1, 3, tw);
      rect(g, cx + k, y + 3, 1, 1, '#8ab0ff');
    }
    for (const k of [-16, 16]) {
      rect(g, cx + k - 1, 15, 3, 3, '#fff0be');
    }
    g.restore();
  }

  /** Gold dust, the champagne tower, the piano, the velvet ropes. */
  private vipLife(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    // Gold dust drifting down through the light.
    const rnd = seeded(7);
    for (let i = 0; i < 30; i++) {
      const x = (rnd() * LW + Math.sin(t * 0.3 + i) * 6) % LW;
      const y = (rnd() * LH + t * (4 + rnd() * 4)) % LH;
      g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i);
      rect(g, x, y, 1, 1, '#ffe9a0');
    }
    g.globalAlpha = 1;
    // The champagne tower on the right: a pyramid of glasses, bubbles rising, the top glass topped up.
    const tx = 297;
    const ty = 108;
    rect(g, tx - 12, ty + 10, 26, 2, '#3a2410');
    rect(g, tx - 1, ty + 12, 3, 6, '#3a2410');
    for (const [row, n] of [[0, 4], [1, 3], [2, 2], [3, 1]] as const) {
      for (let k = 0; k < n; k++) {
        const gx = tx - (n - 1) * 3 + k * 6;
        const gy = ty + 6 - row * 6;
        rect(g, gx - 2, gy, 5, 1, '#e8e0c8');
        rect(g, gx - 1, gy + 1, 3, 2, '#e8c84a');
        rect(g, gx, gy + 3, 1, 2, '#e8e0c8');
      }
    }
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.6 + i / 6) % 1;
      rect(g, tx - 8 + ((i * 5) % 17), ty + 8 - p * 30, 1, 1, `rgba(255,246,200,${0.6 * (1 - p)})`);
    }
    // On your jackpot the cork pops: foam spills from the top glass.
    if (cheer > 0.6 && Math.random() < 0.5) this.bits.push({ x: tx, y: ty - 14, vx: (Math.random() - 0.5) * 20, vy: -10 + Math.random() * 20, c: '#fff6c8', life: 1 });
    // A grand piano on the left (lid up), its player's hands moving.
    const px = 18;
    const py = 104;
    rect(g, px - 14, py, 30, 6, '#0a0606');
    rect(g, px - 14, py - 12, 2, 12, '#0a0606');
    g.fillStyle = '#0a0606';
    g.beginPath();
    g.moveTo(px - 13, py - 12);
    g.lineTo(px + 14, py - 2);
    g.lineTo(px - 13, py);
    g.closePath();
    g.fill();
    rect(g, px - 12, py + 6, 2, 8, '#0a0606');
    rect(g, px + 12, py + 6, 2, 8, '#0a0606');
    for (let k = 0; k < 9; k++) rect(g, px - 10 + k * 3, py + 1, 2, 2, Math.sin(t * 8 + k * 2) > 0.7 ? '#c8c0b0' : '#f0ece6');
    // Velvet ropes in front, swinging a little between gold posts.
    for (const [a, b2] of [[52, 100], [220, 268]] as const) {
      for (const x of [a, b2]) {
        rect(g, x, 128, 2, 14, '#c9a227');
        disc(g, x + 1, 128, 2, '#e8c84a');
      }
      for (let x = a + 2; x < b2; x += 1) {
        const d = Math.sin(((x - a) / (b2 - a)) * Math.PI) * (5 + Math.sin(t * 0.8) * 0.6);
        rect(g, x, 131 + d, 1, 2, '#8a0c1c');
      }
    }
  }

  // ---- the bosses ------------------------------------------------------------------------------------------------

  /** THE HOUSE: its vault door in the wall, light leaking round the seam, the wheel-handle turning, gold at its foot. */
  private vault(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const cx = MID;
    const cy = 42;
    glow(g, cx, cy, 40, '255,210,90', 0.12 + 0.05 * Math.sin(t * 1.5) + cheer * 0.15);
    disc(g, cx, cy, 27, '#14141c');
    disc(g, cx, cy, 25, '#3a3a4a');
    disc(g, cx, cy, 21, '#2a2a36');
    disc(g, cx, cy, 19, '#34343f');
    g.strokeStyle = `rgba(255,220,120,${0.35 + 0.2 * Math.sin(t * 1.5)})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, 25.5, 0, Math.PI * 2);
    g.stroke();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      rect(g, cx + Math.cos(a) * 23 - 1, cy + Math.sin(a) * 23 - 1, 2, 2, '#6a6a7a');
    }
    // A combination dial on the side; the handle turning.
    disc(g, cx + 12, cy - 8, 3, '#5a5a6a');
    rect(g, cx + 12, cy - 11, 1, 2, '#c9a227');
    g.strokeStyle = '#9a9aaa';
    g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = t * 0.3 + (k / 3) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
      g.stroke();
      disc(g, cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 1.5, '#c9a227');
    }
    disc(g, cx, cy, 4, '#c9a227');
    // Gold bars and coins stacked at the door's foot, glinting.
    for (const [x, y] of [[-14, 0], [-6, 0], [2, 0], [10, 0], [-10, -3], [-2, -3], [6, -3], [-6, -6], [2, -6]] as const) {
      rect(g, cx + x, 74 + y, 7, 3, '#c9a227');
      rect(g, cx + x, 74 + y, 7, 1, '#ffe08a');
    }
    const gl = Math.floor(t * 2) % 9;
    rect(g, cx - 14 + (gl % 4) * 8, 72 - Math.floor(gl / 4) * 3, 1, 1, '#ffffff');
  }

  /** THE WHEEL: its own roulette wheel in the open column, spinning, the ball riding the rim. */
  private wheel(g: CanvasRenderingContext2D, t: number): void {
    const cx = MID;
    const cy = 42;
    const r = 26;
    const n = 37;
    const a0 = t * 0.5;
    disc(g, cx, cy, r + 4, '#2a1a0c');
    disc(g, cx, cy, r + 3, '#5a3a14');
    for (let k = 0; k < n; k++) {
      g.fillStyle = k === 0 ? '#1f7a3a' : k % 2 ? '#a01a22' : '#141018';
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, r, a0 + (k / n) * Math.PI * 2, a0 + ((k + 1) / n) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    disc(g, cx, cy, r * 0.55, '#6a4418');
    disc(g, cx, cy, r * 0.45, '#8a5a20');
    // The turret.
    g.strokeStyle = '#e8c84a';
    g.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      const a = -a0 * 0.6 + (k / 4) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
      g.stroke();
    }
    disc(g, cx, cy, 2.5, '#ffe08a');
    // The ball runs the other way round the rim.
    const ba = -t * 1.9;
    disc(g, cx + Math.cos(ba) * (r - 2), cy + Math.sin(ba) * (r - 2), 1.6, '#ffffff');
    // Chip stacks either side.
    for (const [x, col] of [[-36, '#a01a22'], [-31, '#2a5aa0'], [31, '#1f7a3a'], [36, '#c9a227']] as const)
      for (let k = 0; k < 4; k++) {
        rect(g, cx + x - 2, 64 - k * 2, 5, 2, col);
        rect(g, cx + x - 2, 64 - k * 2, 5, 1, '#ffffff');
      }
  }

  /** THE DEALER: a green-shaded lamp over the felt, a fanned hand and chip stacks under it. */
  private dealer(g: CanvasRenderingContext2D, t: number): void {
    const x = MID;
    const sway = Math.sin(t * 0.5) * 1;
    rect(g, x, 0, 1, 18, '#0a0608');
    g.fillStyle = 'rgba(255,240,190,0.14)';
    g.beginPath();
    g.moveTo(x - 10 + sway, 24);
    g.lineTo(x + 11 + sway, 24);
    g.lineTo(x + 40, 76);
    g.lineTo(x - 40, 76);
    g.closePath();
    g.fill();
    rect(g, x - 10 + sway, 18, 21, 6, '#1f6a3a');
    rect(g, x - 8 + sway, 17, 17, 1, '#2f8a4a');
    rect(g, x - 3 + sway, 24, 7, 1, '#fff0be');
    // The felt, edge on, with a gold rail.
    rect(g, x - 40, 62, 80, 14, '#0f4a2a');
    rect(g, x - 40, 61, 80, 1, '#c9a227');
    rect(g, x - 40, 76, 80, 2, '#3a2410');
    // A fanned hand: the top card turns over now and then.
    const flip = Math.floor(t / 3) % 2;
    for (let k = 0; k < 5; k++) {
      const cxk = x - 12 + k * 5;
      rect(g, cxk, 64 - Math.abs(k - 2), 6, 8, '#f0ece6');
      rect(g, cxk, 64 - Math.abs(k - 2), 6, 1, '#c8c0b0');
      if (k === 4 && flip) rect(g, cxk + 1, 66, 4, 4, '#8a1a2a');
      else rect(g, cxk + 2, 66 - Math.abs(k - 2), 2, 2, k % 2 ? '#141018' : '#c81a2a');
    }
    for (const [cx, col] of [[x - 30, '#a01a22'], [x - 24, '#141018'], [x + 22, '#2a5aa0'], [x + 28, '#c9a227']] as const)
      for (let k = 0; k < 3; k++) {
        rect(g, cx - 2, 70 - k * 2, 5, 2, col);
        rect(g, cx - 2, 70 - k * 2, 5, 1, '#ffffff');
      }
  }

  // ---- the crowd -------------------------------------------------------------------------------------------------

  /** Four at each bottom corner: they shuffle and chat; on your jackpot they jump with their arms up. */
  private crowd(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    for (const f of FANS) {
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 9 + f.phase)) * 5 * cheer : 0;
      const bob = Math.sin(t * 1.3 + f.phase) * 0.6;
      const top = LH - f.h - bob - jump;
      const hw = f.w;
      // Coat (rim-lit from the room), head, hair.
      rect(g, f.x - hw / 2, top + 8, hw, f.h, f.coat);
      rect(g, f.x - hw / 2, top + 8, hw, 1, '#ffffff22');
      rect(g, f.x - hw / 2, top + 8, 1, f.h, '#00000055');
      rect(g, f.x - 3, top, 6, 7, f.skin);
      rect(g, f.x - 3, top + 6, 6, 1, '#00000033');
      if (f.hair === 'cap') {
        rect(g, f.x - 3, top - 1, 6, 2, f.hairColor);
        rect(g, f.x + 2, top, 3, 1, f.hairColor);
      } else if (f.hair === 'hat') {
        rect(g, f.x - 5, top - 1, 10, 1, '#1a1008');
        rect(g, f.x - 3, top - 4, 6, 3, '#1a1008');
      } else if (f.hair === 'bob') {
        rect(g, f.x - 4, top - 1, 8, 4, f.hairColor);
        rect(g, f.x - 4, top + 3, 2, 3, f.hairColor);
      } else if (f.hair === 'tall') rect(g, f.x - 3, top - 4, 6, 4, f.hairColor);
      // Eyes (they look toward the fight); a chat now and then.
      const look = f.x < MID ? 1 : -1;
      rect(g, f.x - 1 + look, top + 3, 1, 1, '#140c1c');
      rect(g, f.x + 1 + look, top + 3, 1, 1, '#140c1c');
      if (cheer > 0.2) rect(g, f.x, top + 5, 2, 1, '#5a1a1a');
      if (jump > 1) {
        rect(g, f.x - hw / 2 - 2, top - 2, 2, 10, f.coat);
        rect(g, f.x + hw / 2, top - 2, 2, 10, f.coat);
        rect(g, f.x - hw / 2 - 2, top - 4, 2, 2, f.skin);
        rect(g, f.x + hw / 2, top - 4, 2, 2, f.skin);
      }
    }
  }
}

/** The room for an act (ENDLESS goes round all three, starting from the floor). */
export const roomFor = (act: number, loop: number): RoomId => (loop > 0 ? (['floor', 'vip', 'alley'] as const)[(loop - 1) % 3] : act <= 1 ? 'alley' : act === 2 ? 'floor' : 'vip');
