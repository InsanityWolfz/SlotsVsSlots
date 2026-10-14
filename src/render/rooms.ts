/**
 * THE ROOMS (user, 2026-10-13: "the background is kind of boring"; v2 and v3 the same day, after the playtesters
 * called v1 the best visual feature yet: "really get creative"). Each act is a place, and it stays behind every screen
 * of the act (the Cashier, the encounters, the drafts), not only the fights:
 *   act 1 THE ALLEY: night, rain. Pigeons on the laundry line (they scatter on your jackpot), a cat on the dumpster,
 *     a bookie's chalkboard, a rat, a gutter pouring, a doorman by the DEN door (it swings open on your jackpot, the
 *     peephole slides now and then), the DEN neon in the puddle, car headlights sweeping past.
 *   act 2 THE FLOOR: neon CASINO / LUCKY 7 down the walls, a neon cowboy waving over the floor, eye-in-the-sky cameras
 *     that watch whichever machine is spinning, gamblers with their own stories (one wins a bucket of coins, one
 *     bonks his machine), a waitress crossing, a balloon drop on your jackpot.
 *   act 3 THE VIP ROOM: a grand chandelier with candle flames (it sways on your jackpot), past bosses' portraits whose
 *     eyes follow the play, Slot Machines under glass, a pianist, a champagne tower that fills on your jackpot,
 *     velvet ropes, cigar haze, gold dust in the light.
 *   ENDLESS goes round the three, darker and more gold each loop, and the room escalates (user, 2026-10-14): a back
 *   row of fans fills in, loose bills drift down the strips, spotlights sweep from loop 3, and THE TURBO brings red
 *   beacons.
 * Bosses take the open column between the HUDs: the House's vault door (it loses rivets as the House loses HP and
 * stands ajar near the end), THE WHEEL's table seen at an angle with its croupier, the Dealer himself behind his felt.
 * The crowd at the corners dresses for the room; your jackpot makes them jump, theirs puts their hands on their heads,
 * and under 30% HP one of them can't look.
 *
 * Where it draws: the fight covers the middle (the two machines, their HUDs, the marquee, the buttons), so the detail
 * lives in the side strips (x < 40 and x > 280 here), the column between the HUDs (x 125-195, y 17-62) and the floor.
 * Behind the turn text in the middle, a quiet zone (a shadow pool) keeps the fight readable. Drawn in chunky pixels at
 * a quarter size (320x180), scaled up 4x without smoothing; the still parts once per room, the live parts every frame.
 * Nothing flashes: the strongest tint is under 0.1 (FLASH_CAP is 0.2).
 */
import { drawText } from './text';

export type RoomId = 'alley' | 'floor' | 'vip';
export type BossSet = 'house' | 'wheel' | 'dealer' | 'owner' | null;

export interface Scene {
  room: RoomId;
  boss: BossSet;
  /** ENDLESS loop (0 outside it): each loop darker and more gold. */
  loop: number;
  /** Your HP share in a fight (1 outside one): under 30% the room pulses red. */
  hp: number;
  /** The enemy's HP share (1 outside a fight): the House's vault gives way as it falls. */
  foeHp: number;
  /** Who's spinning (the cameras and the portraits watch them). */
  turn: 'player' | 'enemy' | null;
  /** In a fight (the crowd only shows there; between fights the room is a backdrop under the screens). */
  fight: boolean;
  /** ENDLESS loop 5: THE TURBO is in the room (red beacons, the crowd backs off). */
  turbo?: boolean;
}

export const LW = 320;
export const LH = 180;
/** Where the wall meets the floor (the machines along the wall stand on it). */
const FLOOR_Y = 118;
/** The open column between the two HUDs. */
const MID = 160;

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
const line = (g: CanvasRenderingContext2D, pts: [number, number][], c: string, w = 1) => {
  g.strokeStyle = c;
  g.lineWidth = w;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + 0.5, y + 0.5) : g.moveTo(x + 0.5, y + 0.5)));
  g.stroke();
};
function hexA(hex: string, a: number): string {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
}
function mix(a: string, b: string, k: number): string {
  const p = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  const c = [1, 3, 5].map((i) => Math.round(p(a, i) * (1 - k) + p(b, i) * k).toString(16).padStart(2, '0'));
  return `#${c.join('')}`;
}
/** Neon: a soft glow behind, then the tube; an unlit tube still shows, dark (playtest: unlit letters read as noise). */
function neon(g: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, lit: boolean, scale = 1): void {
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
function chipStack(g: CanvasRenderingContext2D, x: number, y: number, n: number, col: string): void {
  for (let k = 0; k < n; k++) {
    rect(g, x, y - k * 2, 5, 2, col);
    rect(g, x + 1 + (k % 2) * 2, y - k * 2, 1, 1, '#f0ece6');
  }
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
  /** Someone's playing it, on a stool in the side strips. 'lucky' wins a bucket now and then; 'sore' bonks it. */
  player: { phase: number; hue: string; hat: boolean; mood: 'lucky' | 'sore' | 'plain' } | null;
}

function machineRow(rnd: () => number, n: number, trims: string[], played: number): Machine[] {
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
function quietZone(g: CanvasRenderingContext2D): void {
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

// ---- the still layers --------------------------------------------------------------------------------------------

interface RoomArt {
  still: HTMLCanvasElement;
  machines: Machine[];
}

const PUDDLES: [number, number, number][] = [
  [22, 142, 14],
  [300, 150, 13],
  [150, 172, 18],
  [236, 132, 10],
];
/** The alley's windows: in the side strips (playtest: the HUDs hid the old ones). */
const WINDOWS: [number, number][] = [
  [6, 20],
  [22, 20],
  [286, 22],
  [302, 22],
];

function buildAlley(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(11);
  const sky = g.createLinearGradient(0, 0, 0, 40);
  sky.addColorStop(0, '#05040e');
  sky.addColorStop(1, '#141030');
  g.fillStyle = sky;
  g.fillRect(0, 0, LW, 40);
  rect(g, 0, 14, LW, FLOOR_Y - 14, '#1a0c16');
  for (let y = 14, row = 0; y < FLOOR_Y; y += 6, row++)
    for (let x = (row % 2) * -6; x < LW; x += 12) {
      const k = rnd();
      rect(g, x + 1, y + 1, 10, 4, k < 0.15 ? '#24121c' : k > 0.9 ? '#331922' : '#2a151d');
    }
  // The gap between the buildings: a strip of sky down the middle.
  rect(g, 118, 0, 84, 26, '#0b0a1c');
  for (let y = 26; y > 14; y -= 4) rect(g, 118, y, 84, 1, '#120e26');
  rect(g, 0, 13, 118, 2, '#0a0610');
  rect(g, 202, 13, 118, 2, '#0a0610');
  // A water tower on the right roof.
  rect(g, 288, 2, 16, 10, '#120a10');
  rect(g, 290, 0, 12, 2, '#160c14');
  for (const lx of [290, 301]) rect(g, lx, 12, 1, 2, '#120a10');
  for (const [wx, wy] of WINDOWS) {
    rect(g, wx, wy, 10, 12, '#0a0608');
    rect(g, wx + 1, wy + 1, 8, 10, '#1a1420');
  }
  // Fire escape down the left wall.
  for (let y = 52; y < 100; y += 22) {
    rect(g, 2, y, 34, 1, '#0c0608');
    for (let x = 2; x < 36; x += 4) rect(g, x, y - 5, 1, 5, '#0c0608');
    rect(g, 2, y - 6, 34, 1, '#0c0608');
  }
  // The den: a door in the right wall, a step, the knob.
  rect(g, 290, 66, 26, 52, '#0e060c');
  rect(g, 292, 68, 22, 50, '#1c0e14');
  rect(g, 310, 92, 2, 3, '#6a5a30');
  rect(g, 286, 116, 34, 2, '#24161a');
  // A dumpster on the left, the drainpipe beside it.
  rect(g, 2, 100, 32, 18, '#1a2a22');
  rect(g, 2, 100, 32, 2, '#22382c');
  rect(g, 1, 98, 34, 3, '#142019');
  for (let x = 6; x < 32; x += 8) rect(g, x, 104, 1, 12, '#142019');
  rect(g, 36, 14, 3, FLOOR_Y - 22, '#140a10');
  rect(g, 35, FLOOR_Y - 9, 6, 3, '#140a10');
  // Wet asphalt with puddles, a manhole grate in the middle.
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
  g.ellipse(MID, 156, 14, 4, 0, 0, Math.PI * 2);
  g.fill();
  for (let x = MID - 10; x <= MID + 10; x += 4) rect(g, x, 154, 1, 4, '#0a080e');
  quietZone(g);
  return { still: c, machines: [] };
}

function buildFloor(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(23);
  const wall = g.createLinearGradient(0, 0, 0, FLOOR_Y);
  wall.addColorStop(0, '#0e061c');
  wall.addColorStop(1, '#22103a');
  g.fillStyle = wall;
  g.fillRect(0, 0, LW, FLOOR_Y);
  rect(g, 0, 0, LW, 6, '#08040e');
  for (let x = 4; x < LW; x += 16) rect(g, x, 2, 10, 2, '#1e1430');
  for (let x = 0; x < LW; x += 40) {
    rect(g, x, 6, 1, FLOOR_Y, '#2c1648');
    rect(g, x + 1, 6, 1, FLOOR_Y, '#0e0618');
  }
  for (const x of [4, 298]) {
    rect(g, x - 1, 23, 20, 86, '#0a0414');
    rect(g, x, 24, 18, 84, '#160a28');
  }
  rect(g, 0, 78, LW, 1, '#5a4214');
  const machines = machineRow(rnd, 14, ['#c9a227', '#ff4fa3', '#4fe3ff'], 0.95);
  for (const m of machines) drawMachineBody(g, m, '#0c0616', '#241438');
  carpet(g, '#2a0c24', '#1f6a6a', '#c9a227');
  quietZone(g);
  return { still: c, machines };
}

const PORTRAITS = [126, 174];

function buildVip(): RoomArt {
  const [c, g] = canvas();
  const rnd = seeded(37);
  rect(g, 0, 0, LW, FLOOR_Y, '#1c0a0c');
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
  for (const px of [40, 270]) {
    rect(g, px, 10, 10, FLOOR_Y - 10, '#d8d0c8');
    rect(g, px + 1, 10, 2, FLOOR_Y - 10, '#f0ece6');
    rect(g, px + 7, 10, 3, FLOOR_Y - 10, '#a8a098');
    for (let k = 0; k < 6; k++) rect(g, px + 4 + (k % 2), 20 + k * 16, 1, 6, '#bdb4aa');
    rect(g, px - 2, 10, 14, 4, '#c9a227');
    rect(g, px - 2, FLOOR_Y - 4, 14, 4, '#8a6a18');
  }
  // Portrait frames either side of the chandelier (the faces are drawn live: their eyes follow the play).
  for (const fx of PORTRAITS) {
    rect(g, fx - 1, 33, 22, 26, '#8a6a18');
    rect(g, fx, 34, 20, 24, '#c9a227');
    rect(g, fx + 2, 36, 16, 20, '#1a0e0a');
  }
  // Slot Machines under glass: display cases, not a casino floor (playtest: act 3 read as the Floor in red).
  const machines = machineRow(rnd, 9, ['#c9a227', '#ffe9a0'], 0).filter((m) => m.x > 52 && m.x + m.w < LW - 52);
  for (const m of machines) {
    rect(g, m.x - 3, FLOOR_Y - 4, m.w + 6, 4, '#3a2410');
    rect(g, m.x - 3, FLOOR_Y - 4, m.w + 6, 1, '#c9a227');
    m.y -= 4;
    drawMachineBody(g, m, '#120608', '#3a2410');
    g.strokeStyle = 'rgba(200,220,255,0.25)';
    g.lineWidth = 1;
    g.strokeRect(m.x - 2.5, m.y - 3.5, m.w + 5, m.h + 3);
    rect(g, m.x - 1, m.y - 2, 1, 8, 'rgba(255,255,255,0.35)');
  }
  carpet(g, '#3a0812', '#8a6a18', '#c9a227');
  for (const side of [0, 1]) {
    const x0 = side ? LW - 36 : 0;
    for (let k = 0; k < 36; k += 4) {
      rect(g, x0 + k, 10, 4, FLOOR_Y + 40, k % 8 ? '#5a0c18' : '#3a0610');
      rect(g, x0 + k + 1, 10, 1, FLOOR_Y + 40, '#6e1420');
    }
    rect(g, x0, 10, 36, 4, '#c9a227');
  }
  quietZone(g);
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

type Look = 'hood' | 'beanie' | 'umbrella' | 'visor' | 'loud' | 'cup' | 'tux' | 'gown' | 'monocle';
interface Fan {
  x: number;
  h: number;
  phase: number;
  skin: string;
}
/** Three at each bottom corner, clear of the buttons (playtest). Their clothes come from the room. */
const FANS: Fan[] = (() => {
  const rnd = seeded(5);
  const skins = ['#e8b48a', '#a8704a', '#6a4028', '#f0c8a0', '#c8946a', '#8a5a3a'];
  return [5, 16, 27, 293, 304, 315].map((x, i) => ({ x, h: 20 + Math.floor(rnd() * 6), phase: rnd() * Math.PI * 2, skin: skins[i % skins.length] }));
})();
/** ENDLESS's back row: between and behind the front six, filled in two a loop. */
const BACK_ROW: Fan[] = (() => {
  const rnd = seeded(9);
  return [10, 310, 22, 298, 33, 287, 0, 320].map((x) => ({ x, h: 18 + Math.floor(rnd() * 6), phase: rnd() * Math.PI * 2, skin: '#3a2a2a' }));
})();
const DRESS: Record<RoomId, { look: Look; coat: string; hair: string }[]> = {
  alley: [
    { look: 'hood', coat: '#2a2a3a', hair: '#1a1008' },
    { look: 'umbrella', coat: '#3a2a1a', hair: '#1a1008' },
    { look: 'beanie', coat: '#3a1a1a', hair: '#8a2a2a' },
    { look: 'beanie', coat: '#1a2a2a', hair: '#2a5a5a' },
    { look: 'hood', coat: '#4a3a1a', hair: '#1a1008' },
    { look: 'umbrella', coat: '#2a1a3a', hair: '#5a3a1a' },
  ],
  floor: [
    { look: 'visor', coat: '#ff6a8a', hair: '#ffffff' },
    { look: 'loud', coat: '#2a8a8a', hair: '#5a3a1a' },
    { look: 'cup', coat: '#8a6a2a', hair: '#c9a227' },
    { look: 'loud', coat: '#8a2a8a', hair: '#1a1008' },
    { look: 'visor', coat: '#3a6aaa', hair: '#ffd23f' },
    { look: 'cup', coat: '#5a8a3a', hair: '#3a3a3a' },
  ],
  vip: [
    { look: 'tux', coat: '#0e0a10', hair: '#1a1008' },
    { look: 'gown', coat: '#8a0c2a', hair: '#c9a227' },
    { look: 'monocle', coat: '#141018', hair: '#c8c8c8' },
    { look: 'gown', coat: '#2a1a5a', hair: '#1a1008' },
    { look: 'tux', coat: '#0e0a10', hair: '#5a3a1a' },
    { look: 'tux', coat: '#1a0e0a', hair: '#3a3a3a' },
  ],
};

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  c: string;
  life: number;
  /** Balloons fall slowly and are bigger; coins bounce; birds flap. */
  kind?: 'balloon' | 'coin' | 'bird' | 'bill';
}

/** The live layer: lights, people, weather, the boss's set piece, the reactions. */
export class Rooms {
  private live: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  /** Your jackpot's reaction: 1 when it lands, fading to 0. */
  private cheerT = 0;
  /** Theirs: the crowd's hands go to their heads, the waitress drops her tray, a pigeon has its say. */
  private groanT = 0;
  private bits: Bit[] = [];
  private lastRoom: RoomId | null = null;
  /** The pigeons on the line flew off (they come back after a while). */
  private flown = 0;
  private time = 0;
  /** The loop being drawn (update spawns ENDLESS's falling bills from it). */
  private loopNow = 0;

  constructor() {
    [this.live, this.g] = canvas();
  }

  /** A jackpot landed: yours cheers the room, theirs makes it wince. */
  cheer(ours: boolean): void {
    if (!ours) {
      this.groanT = 1;
      return;
    }
    this.cheerT = 1;
    const cols = ['#ffd23f', '#ff4fa3', '#4fe3ff', '#5aff7a', '#ffffff'];
    const room = this.lastRoom;
    for (let i = 0; i < 60; i++) {
      const x = [MID + (Math.random() - 0.5) * 70, Math.random() * 40, LW - Math.random() * 40][i % 3];
      this.bits.push({ x, y: -Math.random() * 30, vx: (Math.random() - 0.5) * 14, vy: 18 + Math.random() * 22, c: cols[i % cols.length], life: 3 + Math.random() * 2 });
    }
    // The floor's balloon drop, down the side strips.
    if (room === 'floor')
      for (let i = 0; i < 14; i++)
        this.bits.push({ x: i % 2 ? Math.random() * 36 + 2 : LW - 38 + Math.random() * 36, y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 3, vy: 8 + Math.random() * 5, c: NEON[i % NEON.length], life: 14, kind: 'balloon' });
    // The alley's pigeons take off.
    if (room === 'alley' && this.time > this.flown) {
      this.flown = this.time + 14;
      for (let i = 0; i < 5; i++) this.bits.push({ x: 128 + i * 15, y: 22, vx: (i - 2) * 14, vy: -22 - Math.random() * 10, c: '#8a8a98', life: 3, kind: 'bird' });
    }
  }

  update(dt: number): void {
    this.time += dt;
    // ENDLESS: loose bills drift down the side strips, more each loop.
    if (this.loopNow >= 2 && Math.random() < dt * Math.min(3, 0.4 * this.loopNow)) {
      const left = Math.random() < 0.5;
      this.bits.push({ x: left ? 2 + Math.random() * 34 : LW - 36 + Math.random() * 34, y: -4, vx: (Math.random() - 0.5) * 4, vy: 7 + Math.random() * 5, c: '#4a8a3a', life: 30, kind: 'bill' });
    }
    this.cheerT = Math.max(0, this.cheerT - dt / 1.6);
    this.groanT = Math.max(0, this.groanT - dt / 2.2);
    for (const b of this.bits) {
      if (b.kind === 'balloon' || b.kind === 'bill') b.x += Math.sin(b.y * 0.1 + b.life) * 4 * dt;
      else if (!b.kind) b.x += Math.sin(b.y * 0.2) * 6 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.kind === 'coin') {
        b.vy += 120 * dt;
        if (b.y > FLOOR_Y + 2) {
          b.y = FLOOR_Y + 2;
          b.vy *= -0.4;
          b.vx *= 0.7;
        }
      }
      b.life -= dt;
    }
    this.bits = this.bits.filter((b) => b.life > 0 && b.y < LH + 4 && b.y > -80);
  }

  draw(ctx: CanvasRenderingContext2D, s: Scene, time: number): void {
    const art = room(s.room);
    this.loopNow = s.loop;
    if (this.lastRoom !== s.room) {
      this.lastRoom = s.room;
      this.bits = [];
    }
    const g = this.g;
    g.clearRect(0, 0, LW, LH);
    const cheer = this.cheerT;
    // (A boss's set piece takes the open column: the room's own centrepiece steps aside.)
    const mid = !s.boss;
    if (s.room === 'alley') this.alley(g, time, cheer, mid);
    else if (s.room === 'floor') this.floor(g, art, s, time, cheer, mid);
    else this.vip(g, art, s, time, cheer, mid);
    if (s.boss === 'house') this.vault(g, time, cheer, s.foeHp);
    else if (s.boss === 'wheel') this.wheel(g, time);
    else if (s.boss === 'dealer') this.dealer(g, time, s.room);
    else if (s.boss === 'owner') this.owner(g, time, cheer, s.foeHp);
    if (s.loop >= 3) this.spotlights(g, time, s.loop);
    if (s.turbo) this.beacons(g, time);
    if (s.fight && s.loop > 0) this.backRow(g, s, time, cheer);
    if (s.fight) this.crowd(g, s, time, cheer);
    for (const b of this.bits) {
      g.globalAlpha = Math.min(1, b.life);
      if (b.kind === 'balloon') {
        g.fillStyle = b.c;
        g.beginPath();
        g.ellipse(b.x, b.y, 2, 2.6, 0, 0, Math.PI * 2);
        g.fill();
        rect(g, b.x, b.y + 3, 1, 4, '#c8c0d0');
      } else if (b.kind === 'bird') {
        const up = Math.floor(time * 12 + b.x) % 2;
        rect(g, b.x - 1, b.y, 3, 1, b.c);
        rect(g, b.x - 2, b.y - (up ? 1 : -1), 1, 1, b.c);
        rect(g, b.x + 2, b.y - (up ? 1 : -1), 1, 1, b.c);
      } else if (b.kind === 'bill') {
        const flip = Math.sin(time * 5 + b.x) > 0;
        rect(g, b.x, b.y, flip ? 3 : 2, 2, '#4a8a3a');
        rect(g, b.x + 1, b.y, 1, flip ? 2 : 1, '#8ad06a');
      } else rect(g, b.x, b.y, b.kind === 'coin' || Math.sin(time * 9 + b.x) > 0 ? 2 : 1, 1, b.c);
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
    if (s.loop > 0) {
      full(`rgba(4,2,8,${Math.min(0.4, 0.08 * s.loop)})`);
      full(`rgba(201,162,39,${Math.min(0.08, 0.02 * s.loop)})`);
    }
    if (s.turbo) full(`rgba(255,30,30,${0.04 + 0.02 * Math.sin(time * 5)})`);
    if (cheer > 0) full(hexA('#ffd23f', 0.05 * cheer));
    if (this.groanT > 0) full(hexA('#ff4a3a', 0.07 * this.groanT));
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

  // ---- ENDLESS escalation (user, 2026-10-14) ----------------------------------------------------------------------

  /** Loop 3 on: two spotlights sweep down the side strips, like a headliner's walk-on. */
  private spotlights(g: CanvasRenderingContext2D, t: number, loop: number): void {
    const a = Math.min(0.1, 0.03 * (loop - 1));
    for (const [x0, ph] of [[20, 0], [LW - 20, 2.1]] as const) {
      const sway = Math.sin(t * 0.7 + ph) * 14;
      g.fillStyle = `rgba(255,240,200,${a})`;
      g.beginPath();
      g.moveTo(x0 - 2, 0);
      g.lineTo(x0 + 2, 0);
      g.lineTo(x0 + sway + 12, LH);
      g.lineTo(x0 + sway - 12, LH);
      g.closePath();
      g.fill();
      rect(g, x0 - 3, 0, 6, 3, '#2a2a34');
    }
  }

  /** THE TURBO: red beacons spin at the top of both strips. */
  private beacons(g: CanvasRenderingContext2D, t: number): void {
    for (const x of [8, LW - 8]) {
      const ang = t * 5 + (x > MID ? Math.PI : 0);
      const dx = Math.cos(ang);
      g.fillStyle = `rgba(255,40,30,${0.3 * Math.max(0, Math.sin(ang)) + 0.06})`;
      g.beginPath();
      g.moveTo(x, 8);
      g.lineTo(x + dx * 50 - 12, 90);
      g.lineTo(x + dx * 50 + 12, 90);
      g.closePath();
      g.fill();
      rect(g, x - 4, 2, 8, 7, Math.sin(ang) > 0.3 ? '#ff5a4a' : '#9a1a1a');
      rect(g, x - 2, 3, 2, 2, '#ffd0c8');
      rect(g, x - 5, 9, 10, 2, '#3a3a44');
    }
  }

  /** ENDLESS: a back row of fans fills in behind the front six, 2 more a loop (up to 8). */
  private backRow(g: CanvasRenderingContext2D, s: Scene, t: number, cheer: number): void {
    const n = Math.min(BACK_ROW.length, s.loop * 2);
    const shade = ['#2a2238', '#34284a', '#262034', '#30263e'];
    for (let i = 0; i < n; i++) {
      const f = BACK_ROW[i];
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 8 + f.phase)) * 4 * cheer : 0;
      const top = LH - f.h - 9 - Math.sin(t * 1.1 + f.phase) * 0.6 - jump + (s.turbo ? 2 : 0);
      const c = shade[i % shade.length];
      rect(g, f.x - 4, top + 7, 8, f.h, c);
      rect(g, f.x - 3, top, 6, 7, '#5a4038');
      if (jump > 1 || (s.turbo && Math.sin(t * 3 + f.phase) > 0.7)) {
        rect(g, f.x - 6, top - 3, 2, 9, c);
        rect(g, f.x + 4, top - 3, 2, 9, c);
      }
    }
  }

  // ---- act 1: the alley ------------------------------------------------------------------------------------------

  private alley(g: CanvasRenderingContext2D, t: number, cheer: number, mid: boolean): void {
    // Stars in the open corners and the gap; the moon top right.
    const rnd = seeded(99);
    for (let i = 0; i < 30; i++) {
      const r = rnd();
      const x = r < 0.35 ? rnd() * 40 : r < 0.7 ? 280 + rnd() * 40 : 120 + rnd() * 80;
      const y = rnd() * 12;
      if (Math.sin(t * (0.5 + rnd()) + i) > -0.3) rect(g, x, y, 1, 1, i % 5 ? '#8a86b0' : '#ffffff');
    }
    disc(g, 310, 30, 5, '#e8e4c8');
    disc(g, 312, 29, 4, '#141030');
    // Car headlights sweep past every ~25s: pale beams across the brick, a shine on the wet ground.
    const car = (t % 25) / 2.2;
    if (car < 1) {
      const x = -60 + car * (LW + 120);
      g.fillStyle = 'rgba(255,250,220,0.07)';
      g.beginPath();
      g.moveTo(x, 70);
      g.lineTo(x + 60, 60);
      g.lineTo(x + 60, 110);
      g.lineTo(x, 100);
      g.closePath();
      g.fill();
      rect(g, x + 10, FLOOR_Y + 6, 40, 1, 'rgba(255,250,220,0.2)');
    }
    // The windows' tenants: a TV glowing blue (it goes dark when they win), a lamp, Mrs. Curlers.
    const tv = this.groanT > 0 ? 0 : 0.35 + 0.3 * Math.max(0, Math.sin(t * 5.1) * Math.sin(t * 1.7));
    g.globalAlpha = tv;
    rect(g, 7, 21, 8, 10, '#6a6aff');
    g.globalAlpha = 1;
    rect(g, 23, 21, 8, 10, '#5a3a14');
    glow(g, 27, 26, 6, '255,190,90', 0.3);
    rect(g, 287, 23, 8, 10, '#3a2a14');
    rect(g, 303, 23, 8, 10, '#2a1a24');
    // Mrs. Curlers leans out on a loud win and shakes her fist; now and then just to look.
    const loud = cheer > 0.2;
    if (loud || Math.sin(t * 0.13) > 0.97) {
      rect(g, 288, 26, 6, 7, '#c8946a');
      for (let k = 0; k < 3; k++) rect(g, 288 + k * 2, 24, 2, 2, '#e88ab0');
      rect(g, 287, 33, 8, 3, '#5a8a6a');
      if (loud) rect(g, 284 + (Math.floor(t * 8) % 2), 27, 3, 3, '#c8946a');
    }
    // A man on the fire escape, bottle in hand, legs dangling.
    const legs = Math.sin(t * 1.8);
    rect(g, 12, 39, 6, 7, '#2a2a3a');
    rect(g, 13, 34, 4, 5, '#a8704a');
    rect(g, 12, 33, 6, 2, '#3a2a1a');
    rect(g, 13, 46, 2, 4 + Math.round(legs), '#1a1a2a');
    rect(g, 16, 46, 2, 4 - Math.round(legs), '#1a1a2a');
    rect(g, 19, 38 + (Math.sin(t * 0.4) > 0.8 ? -2 : 0), 1, 4, '#2a5a2a');
    if (mid) {
      this.laundry(g, t);
      this.bulb(g, t, cheer);
    }
    this.den(g, t, cheer);
    this.alleyFloor(g, t, cheer);
  }

  /** Laundry on a line across the gap, swaying, pigeons perched on it (they scatter on your jackpot). */
  private laundry(g: CanvasRenderingContext2D, t: number): void {
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
    if (this.time > this.flown)
      for (let i = 0; i < 5; i++) {
        const x = 124 + i * 15 + (i % 2) * 4;
        const y = sag(x) - 2;
        const bob = Math.sin(t * 3 + i * 2) > 0.7 ? 1 : 0;
        rect(g, x, y, 3, 2, '#7a7a88');
        rect(g, x + (i % 2 ? -1 : 3), y - 1 + bob, 1, 1, '#9a9aaa');
        // Theirs: one pigeon has its say.
        if (this.groanT > 0.6 && i === 2) rect(g, x + 1, y + 2 + (1 - this.groanT) * 30, 1, 1, '#f0f0f0');
      }
  }

  /** The bare bulb, hung low in the column so its warm pool lands on the brick (playtest), swaying. */
  private bulb(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const sway = Math.sin(t * 0.7) * 3;
    const bx = MID + sway;
    for (let y = 26; y < 44; y++) rect(g, MID + (sway * (y - 26)) / 18, y, 1, 1, '#0a0608');
    glow(g, bx, 46, 56, '255,210,122', 0.2 + cheer * 0.1);
    rect(g, bx - 2, 44, 4, 4, '#ffe9b0');
    rect(g, bx - 1, 43, 2, 1, '#3a3a3a');
  }

  /** The DEN's door: its neon (and that in the puddle), the peephole, the doorman; it swings open on your jackpot. */
  private den(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const buzz = Math.sin(t * 7.3) * Math.sin(t * 2.1) > 0.8;
    neon(g, 'DEN', 303, 58, '#ff8a5a', !buzz || cheer > 0);
    if (!buzz) for (let k = 0; k < 4; k++) rect(g, 296 + Math.sin(t * 3 + k) * 2, 148 + k, 12 - k * 2, 1, `rgba(255,138,90,${0.35 - k * 0.07})`);
    if (cheer > 0.15) {
      // Open: warm light spills onto the asphalt, and arms go up inside.
      rect(g, 292, 68, 18, 50, '#ffb070');
      g.fillStyle = 'rgba(255,176,112,0.18)';
      g.beginPath();
      g.moveTo(292, 118);
      g.lineTo(310, 118);
      g.lineTo(316, 140);
      g.lineTo(276, 140);
      g.closePath();
      g.fill();
      for (const [px, h] of [[296, 22], [303, 26]] as const) {
        const j = Math.abs(Math.sin(t * 9 + px)) * 2;
        rect(g, px, 118 - h - j, 4, h, '#3a1a10');
        rect(g, px - 1, 118 - h - 4 - j, 1, 5, '#3a1a10');
        rect(g, px + 4, 118 - h - 4 - j, 1, 5, '#3a1a10');
      }
    } else {
      // The peephole slides open every ~12s and two eyes look round.
      if (t % 12 < 1.4) {
        rect(g, 299, 75, 8, 3, '#ffb070');
        const look = Math.floor((t % 12) * 2) % 2;
        rect(g, 300 + look * 2, 76, 1, 1, '#140c1c');
        rect(g, 303 + look * 2, 76, 1, 1, '#140c1c');
      } else rect(g, 300, 76, 6, 2, '#05030a');
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4);
      rect(g, 292, 117, 22, 1, '#ffb070');
      g.globalAlpha = 1;
    }
    // The doorman beside the door: his cigarette brightens as he draws on it; smoke curls up.
    const dx = 286;
    rect(g, dx - 3, 88, 7, 30, '#0a0608');
    rect(g, dx - 2, 82, 5, 6, '#0c080a');
    rect(g, dx - 3, 81, 7, 2, '#060406');
    rect(g, dx - 5, 86, 2, 1, Math.sin(t * 0.9) > 0.8 ? '#ffb040' : '#a04020');
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.4 + k * 0.25) % 1;
      g.globalAlpha = 0.25 * (1 - p);
      rect(g, dx - 6 + Math.sin(p * 6 + k) * 2, 85 - p * 20, 2, 2, '#8a8a9a');
    }
    g.globalAlpha = 1;
  }

  /** The cat, the gutter, the rat, a newspaper, the bookie, the steam, the rain. */
  private alleyFloor(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    // The cat on the dumpster: eyes catch the light, it blinks, its tail flicks; your jackpot sends it up the fire escape.
    const up = cheer > 0.3;
    const cx = up ? 20 : 22;
    const cy = up ? 70 : 92;
    rect(g, cx, cy, 9, 6, '#060408');
    rect(g, cx + 6, cy - 4, 5, 5, '#060408');
    rect(g, cx + 6, cy - 5, 1, 1, '#060408');
    rect(g, cx + 10, cy - 5, 1, 1, '#060408');
    if (Math.sin(t * 0.6) < 0.95) {
      rect(g, cx + 7, cy - 2, 1, 1, '#c8ff4a');
      rect(g, cx + 9, cy - 2, 1, 1, '#c8ff4a');
    }
    const tail = Math.sin(t * 2.2);
    rect(g, cx - 2, cy + 1 + Math.round(tail), 3, 1, '#060408');
    rect(g, cx - 3, cy - 1 + Math.round(tail * 2), 1, 3, '#060408');
    // The gutter pours from the drainpipe.
    for (let k = 0; k < 6; k++) rect(g, 40, FLOOR_Y - 6 + ((t * 40 + k * 4) % 24), 1, 2, 'rgba(170,180,230,0.6)');
    // A rat runs out from the dumpster for a crumb, then back; any jackpot sends it home.
    const rp = t % 18;
    const scared = cheer > 0 || this.groanT > 0;
    const rx = scared ? 34 : rp < 3 ? 34 + rp * 18 : rp < 9 ? 88 : rp < 12 ? 88 - (rp - 9) * 18 : 34;
    if (rx > 36) {
      rect(g, rx, 150, 4, 2, '#3a3238');
      rect(g, rx + 4, 150, 1, 1, '#3a3238');
      rect(g, rx - 2, 151, 2, 1, '#5a4a50');
    }
    // A newspaper tumbles across now and then.
    const np = (t % 40) / 6;
    if (np < 1) rect(g, LW + 10 - np * (LW + 30), 160 - Math.abs(Math.sin(np * 12)) * 4, 4, 3, '#a8a49a');
    // The bookie's chalkboard by the dumpster: a tally for each side.
    rect(g, 4, 124, 13, 9, '#1a2a1a');
    rect(g, 4, 124, 13, 1, '#5a4a2a');
    for (let k = 0; k < 3; k++) rect(g, 6 + k * 2, 127, 1, 3, '#d8d8c8');
    rect(g, 12, 128, 3, 1, '#d8d8c8');
    // Steam from the grate, fading before it reaches the turn text.
    for (let k = 0; k < 6; k++) {
      const p = (t * 0.25 + k / 6) % 1;
      const y = 154 - p * 30;
      if (y <= 128) continue;
      g.globalAlpha = 0.16 * Math.sin(p * Math.PI) * Math.min(1, (y - 128) / 10);
      rect(g, MID - (4 + p * 14) / 2 + Math.sin(p * 5 + k) * 3, y, 4 + p * 14, 3, '#9a96aa');
    }
    g.globalAlpha = 1;
    // Rain: streaks at a slant, rings in the puddles, drips off the marquee onto the HUDs.
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
    for (let k = 0; k < 3; k++) {
      const p = (t * 1.3 + k * 0.37) % 1;
      const x = 100 + ((k * 97 + Math.floor(t * 1.3 + k * 0.37) * 53) % 120);
      rect(g, x, 18 + p * 6, 1, 1, 'rgba(170,180,230,0.7)');
    }
  }

  // ---- act 2: the casino floor -----------------------------------------------------------------------------------

  private floor(g: CanvasRenderingContext2D, art: RoomArt, s: Scene, t: number, cheer: number, mid: boolean): void {
    for (let x = 4, k = 0; x < LW; x += 16, k++) rect(g, x + 2, 2, 6, 2, Math.sin(t * 2 + k) > 0.2 || cheer > 0 ? '#5a4a8a' : '#2a2040');
    // Searchlights, kept inside the side strips.
    for (const [x0, ph] of [[24, 0], [296, 2]] as const) {
      const a = Math.sin(t * 0.4 + ph) * 0.25;
      g.fillStyle = `rgba(200,190,255,${0.1 + cheer * 0.06})`;
      g.beginPath();
      g.moveTo(x0, FLOOR_Y);
      g.lineTo(x0 + Math.sin(a - 0.08) * 120, FLOOR_Y - 110);
      g.lineTo(x0 + Math.sin(a + 0.08) * 120, FLOOR_Y - 110);
      g.closePath();
      g.fill();
    }
    // CASINO down the left wall, lit letter by letter; LUCKY 7 down the right, its 7 blinking. Unlit tubes still read.
    const word = 'CASINO';
    const lit = Math.floor(t * 3) % (word.length + 3);
    [...word].forEach((ch, i) => neon(g, ch, 13, 32 + i * 14, '#ff4fa3', cheer > 0 || i < lit, 2));
    [...'LUCKY'].forEach((ch, i) => neon(g, ch, 307, 32 + i * 14, '#4fe3ff', true, 2));
    neon(g, '7', 307, 102, '#ffd23f', Math.sin(t * 4) > 0 || cheer > 0, 2);
    // The eye in the sky: camera domes that turn to whoever's spinning (a watch-only fight, being watched).
    for (const cx of [26, 294]) {
      g.fillStyle = '#0a0614';
      g.beginPath();
      g.arc(cx, 8, 4, 0, Math.PI);
      g.fill();
      const aim = s.turn === 'player' ? -2 : s.turn === 'enemy' ? 2 : Math.round(Math.sin(t * 0.3) * 2);
      rect(g, cx + aim, 10, 1, 1, '#4a4a6a');
      if (Math.floor(t * 1.5) % 2) rect(g, cx - 3, 8, 1, 1, '#ff2a2a');
    }
    if (mid) this.cowboy(g, t, cheer);
    this.machineLights(g, art.machines, t, cheer, '#ffe9a0');
    this.gamblers(g, art.machines, t);
    this.waitress(g, t);
  }

  /** The gamblers at the side machines, each with a story: the lucky one's bucket overflows; the sore one bonks his. */
  private gamblers(g: CanvasRenderingContext2D, machines: Machine[], t: number): void {
    for (const m of machines) {
      if (!m.player) continue;
      const p = m.player;
      const cyc = (t * 0.5 + p.phase) % 4;
      const pull = cyc < 0.3 ? cyc / 0.3 : cyc < 0.6 ? 1 - (cyc - 0.3) / 0.3 : 0;
      const sx = m.x + m.w - 2;
      const slump = p.mood === 'sore' && (t + p.phase) % 8 < 1.5;
      rect(g, sx - 1, FLOOR_Y - 8, 6, 2, '#2a1a10');
      rect(g, sx + 1, FLOOR_Y - 6, 1, 6, '#2a1a10');
      rect(g, sx - 1, FLOOR_Y - 20, 7, 12, p.hue);
      const hx = sx - (slump ? 2 : 0);
      const hy = FLOOR_Y - 26 + (slump ? 3 : 0);
      rect(g, hx, hy, 5, 6, '#c8946a');
      if (p.hat) rect(g, hx - 1, hy - 2, 7, 2, '#1a1008');
      if (!slump) {
        rect(g, sx + 6, FLOOR_Y - 19 + pull * 6, 3, 1, p.hue);
        rect(g, sx + 8, FLOOR_Y - 22 + pull * 7, 1, 4, '#8a8a9a');
        disc(g, sx + 8, FLOOR_Y - 23 + pull * 7, 1.2, '#ff4a4a');
      }
      if (p.mood === 'lucky') {
        rect(g, sx - 5, FLOOR_Y - 4, 4, 4, '#8a8a9a');
        rect(g, sx - 5, FLOOR_Y - 5, 4, 1, '#ffd23f');
        // Every so often a win: coins spill from the bucket onto the carpet.
        if ((t + p.phase) % 9 < 0.04 && this.bits.length < 200)
          for (let k = 0; k < 6; k++) this.bits.push({ x: sx - 3, y: FLOOR_Y - 6, vx: (Math.random() - 0.3) * 30, vy: -20 - Math.random() * 20, c: '#ffd23f', life: 2.5, kind: 'coin' });
      }
    }
  }

  /** The cocktail waitress crosses the floor with her tray; on THEIR jackpot she drops it. */
  private waitress(g: CanvasRenderingContext2D, t: number): void {
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
    if (this.groanT > 0.5) {
      const f = 1 - this.groanT;
      rect(g, tray, y0 - 14 + f * 40, 5, 1, '#c0c0c8');
      rect(g, tray + 2 + f * 10, y0 - 12 + f * 34, 1, 1, '#5aff7a');
    } else {
      rect(g, tray, y0 - 14, 5, 1, '#c0c0c8');
      rect(g, tray + 1, y0 - 17, 1, 3, '#5aff7a');
      rect(g, tray + 3, y0 - 16, 1, 2, '#ff4fa3');
    }
  }

  /** The floor's big sign: a neon cowboy in outline tubes, waving his hat, winking. No words (playtest: a 777 JACKPOT
   * sign read as the game telling you something). Your jackpot runs his colors. */
  private cowboy(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const x = MID;
    const y = 18;
    const c = cheer > 0 ? NEON[Math.floor(t * 8) % NEON.length] : '#ffd23f';
    const c2 = cheer > 0 ? NEON[(Math.floor(t * 8) + 2) % NEON.length] : '#ff4fa3';
    glow(g, x, y + 20, 34, '255,210,63', 0.1 + cheer * 0.1);
    g.globalAlpha = 0.65;
    const wave = Math.floor(t * 1.5) % 2;
    const hatY = wave ? y - 2 : y + 2;
    const hatX = wave ? x + 14 : x;
    line(g, [[hatX - 8, hatY + 6], [hatX + 8, hatY + 6]], c);
    line(g, [[hatX - 4, hatY + 6], [hatX - 3, hatY], [hatX + 3, hatY], [hatX + 4, hatY + 6]], c);
    line(g, [[x - 4, y + 8], [x - 4, y + 15], [x + 4, y + 15], [x + 4, y + 8], [x - 4, y + 8]], c2);
    rect(g, x - 2, y + 11, 1, 1, c2);
    if (Math.sin(t * 0.9) > 0.9) rect(g, x + 1, y + 11, 2, 1, c2);
    else rect(g, x + 2, y + 11, 1, 1, c2);
    line(g, [[x - 1, y + 13], [x + 1, y + 14]], c2);
    line(g, [[x - 6, y + 17], [x + 6, y + 17], [x + 5, y + 30], [x - 5, y + 30], [x - 6, y + 17]], c);
    line(g, [[x - 5, y + 30], [x - 6, y + 42], [x - 9, y + 42]], c);
    line(g, [[x + 5, y + 30], [x + 6, y + 42], [x + 9, y + 42]], c);
    line(g, [[x - 6, y + 19], [x - 12, y + 26], [x - 12, y + 30]], c);
    line(g, wave ? [[x + 6, y + 19], [x + 12, y + 12], [x + 14, y + 6]] : [[x + 6, y + 19], [x + 12, y + 24], [x + 14, y + 22]], c);
    g.globalAlpha = 1;
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
      g.globalAlpha = 0.3;
      rect(g, m.x + 4, m.y + 10 + ((t * 12 + i * 3) % 7), m.w - 8, 1, '#ffffff');
      g.globalAlpha = 1;
    });
  }

  // ---- act 3: the VIP room ---------------------------------------------------------------------------------------

  private vip(g: CanvasRenderingContext2D, art: RoomArt, s: Scene, t: number, cheer: number, mid: boolean): void {
    // Cigar haze drifting across the wall: depth, and it pushes the wall back behind the reels.
    for (const [y, sp] of [[66, 3], [84, -2]] as const) {
      const x = (((t * sp) % LW) + LW) % LW;
      g.fillStyle = 'rgba(220,200,190,0.05)';
      g.fillRect(x - LW, y, LW, 6);
      g.fillRect(x, y, LW, 6);
    }
    this.machineLights(g, art.machines, t, cheer, '#fff0be');
    this.portraits(g, s, t);
    if (mid) this.chandelier(g, t, cheer);
    this.champagne(g, t, cheer);
    this.pianist(g, t, cheer);
    // Velvet ropes in the strips, leading off the screen (playtest: in the middle they hid behind the machines).
    for (const [a, b2, post] of [[0, 34, 34], [286, 320, 286]] as const) {
      rect(g, post, 128, 2, 14, '#c9a227');
      disc(g, post + 1, 128, 2, '#e8c84a');
      for (let x = a; x < b2; x += 1) {
        const d = Math.sin(((x - a) / (b2 - a)) * Math.PI) * (4 + Math.sin(t * 0.8) * 0.6);
        rect(g, x, 131 + d, 1, 2, '#8a0c1c');
      }
    }
  }

  /** Past bosses in oil, gold-framed: the House and THE WHEEL. Their eyes follow the spinning machine; in a boss fight
   * that boss's own frame is empty (they're out on the floor). */
  private portraits(g: CanvasRenderingContext2D, s: Scene, t: number): void {
    const look = s.turn === 'player' ? -1 : s.turn === 'enemy' ? 1 : Math.round(Math.sin(t * 0.4));
    PORTRAITS.forEach((fx, i) => {
      const who = i === 0 ? 'house' : 'wheel';
      if (s.boss === who) return;
      const x = fx + 2;
      const y = 36;
      if (who === 'house') {
        rect(g, x + 2, y + 9, 12, 11, '#3a2a14');
        rect(g, x + 4, y + 4, 8, 7, '#c8946a');
        rect(g, x + 3, y + 1, 10, 3, '#c9a227');
        rect(g, x + 5, y, 2, 1, '#ff4a4a');
        rect(g, x + 9, y, 2, 1, '#ff4a4a');
      } else {
        rect(g, x + 2, y + 9, 12, 11, '#1f4a2a');
        rect(g, x + 4, y + 4, 8, 7, '#e8b48a');
        rect(g, x + 3, y + 3, 10, 2, '#1f8a3a');
      }
      rect(g, x + 5 + (look > 0 ? 1 : 0), y + 6, 1, 1, '#140c1c');
      rect(g, x + 9 + (look > 0 ? 1 : 0), y + 6, 1, 1, '#140c1c');
      rect(g, x + 6, y + 9, 4, 1, '#5a2a1a');
    });
  }

  /** The grand chandelier: three tiers, candle flames flickering, prism strings; your jackpot sets it swinging. */
  private chandelier(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const swing = Math.sin(t * 0.6) * 0.6 + (cheer > 0 ? Math.sin(t * 5) * 2 * cheer : 0);
    const cx = MID + swing;
    const y0 = 18;
    rect(g, MID, 10, 1, 8, '#5a4214');
    glow(g, cx, y0 + 14, 50, '255,233,160', 0.14 + cheer * 0.1);
    // Its pool of light on the carpet below.
    g.fillStyle = 'rgba(255,233,160,0.05)';
    g.beginPath();
    g.ellipse(MID, 150, 40, 8, 0, 0, Math.PI * 2);
    g.fill();
    for (const [w, y, col] of [[48, y0 + 4, '#c9a227'], [36, y0 + 10, '#a8861e'], [22, y0 + 16, '#8a6a18']] as const) {
      rect(g, cx - w / 2, y, w, 2, col);
      for (let k = -w / 2 + 2; k <= w / 2 - 2; k += 6) {
        const flick = Math.sin(t * 13 + k * 3 + y) > 0 ? 1 : 0;
        rect(g, cx + k, y - 2, 1, 2, '#fff0be');
        rect(g, cx + k, y - 3 - flick, 1, 1, '#ffb040');
        rect(g, cx + k + 2, y + 2, 1, 4, Math.sin(t * 3 + k * 1.7 + y) > 0.55 - cheer ? '#fff6c8' : '#c9b06a');
        rect(g, cx + k + 2, y + 6, 1, 1, '#8ab0ff');
      }
    }
    rect(g, cx - 1, y0 + 18, 3, 4, '#c9a227');
    rect(g, cx, y0 + 22, 1, 3, '#fff6c8');
    // Gold dust, only in its light.
    const rnd = seeded(7);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 40;
      const speed = 3 + rnd() * 3;
      const x = MID + Math.cos(a) * r + Math.sin(t * 0.3 + i) * 3;
      const y = 30 + ((Math.abs(Math.sin(a) * r * 0.6) + t * speed) % 40);
      g.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i);
      rect(g, x, y, 1, 1, '#ffe9a0');
    }
    g.globalAlpha = 1;
  }

  /** The champagne tower: bubbles rising; on your jackpot a bottle pours and it fills row by row; theirs tips the top. */
  private champagne(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const tx = 300;
    const ty = 108;
    rect(g, tx - 13, ty + 10, 26, 2, '#3a2410');
    rect(g, tx - 1, ty + 12, 3, 6, '#3a2410');
    const fill = cheer > 0 ? Math.min(4, (1 - cheer) * 7) : 4;
    for (const [row, n] of [[0, 4], [1, 3], [2, 2], [3, 1]] as const) {
      for (let k = 0; k < n; k++) {
        const tip = row === 3 && this.groanT > 0.3 ? 1 : 0;
        const gx = tx - (n - 1) * 3 + k * 6 + tip;
        const gy = ty + 6 - row * 6;
        rect(g, gx - 2, gy, 5, 1, '#e8e0c8');
        rect(g, gx - 1, gy + 1, 3, 2, 3 - row < fill ? '#e8c84a' : '#5a4a30');
        rect(g, gx, gy + 3, 1, 2, '#e8e0c8');
      }
    }
    if (cheer > 0.2) {
      rect(g, tx + 3, ty - 20, 2, 7, '#1a3a1a');
      rect(g, tx + 3, ty - 21, 2, 1, '#c9a227');
      rect(g, tx + 2, ty - 13, 1, 3, '#e8c84a');
    }
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.6 + i / 6) % 1;
      rect(g, tx - 8 + ((i * 5) % 17), ty + 8 - p * 30, 1, 1, `rgba(255,246,200,${0.6 * (1 - p)})`);
    }
  }

  /** The pianist at the grand piano (lid up), swaying in time; a hands-up flourish on your jackpot. */
  private pianist(g: CanvasRenderingContext2D, t: number, cheer: number): void {
    const px = 22;
    const py = 112;
    rect(g, px - 14, py, 28, 5, '#0a0606');
    g.fillStyle = '#0a0606';
    g.beginPath();
    g.moveTo(px - 13, py - 12);
    g.lineTo(px + 12, py - 2);
    g.lineTo(px - 13, py);
    g.closePath();
    g.fill();
    rect(g, px - 12, py + 5, 2, 8, '#0a0606');
    rect(g, px + 11, py + 5, 2, 8, '#0a0606');
    for (let k = 0; k < 8; k++) rect(g, px - 10 + k * 3, py + 1, 2, 2, Math.sin(t * 8 + k * 2) > 0.7 ? '#c8c0b0' : '#f0ece6');
    const sw = Math.round(Math.sin(t * 2.4));
    const x = px + 14 + sw;
    rect(g, x, py - 8, 6, 12, '#0e0a10');
    rect(g, x + 2, py - 8, 2, 5, '#f0ece6');
    rect(g, x + 1, py - 14, 5, 6, '#e8b48a');
    rect(g, x + 1, py - 15, 5, 2, '#1a1008');
    rect(g, x - 3, cheer > 0.4 ? py - 16 : py - 1, 3, 1, '#e8b48a');
  }

  // ---- the bosses ------------------------------------------------------------------------------------------------

  /** THE HOUSE's vault door: light leaking round the seam, the handle turning, the dial ticking. It loses rivets as
   * the House loses HP and stands ajar near the end, gold light spilling out. Guards either side; gold on the floor. */
  private vault(g: CanvasRenderingContext2D, t: number, cheer: number, hp: number): void {
    const cx = MID;
    const cy = 40;
    const ajar = hp < 0.3 ? (0.3 - hp) / 0.3 : 0;
    const dx = cx + ajar * 5;
    glow(g, cx, cy, 40, '255,210,90', 0.12 + 0.05 * Math.sin(t * 1.5) + cheer * 0.15 + ajar * 0.15);
    disc(g, cx, cy, 27, '#14141c');
    if (ajar > 0) disc(g, cx, cy, 25, '#ffd27a');
    disc(g, dx, cy, 25, '#3a3a4a');
    disc(g, dx, cy, 21, '#2a2a36');
    disc(g, dx, cy, 19, '#34343f');
    g.strokeStyle = `rgba(255,220,120,${0.35 + 0.2 * Math.sin(t * 1.5) + ajar * 0.3})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(dx, cy, 25.5, 0, Math.PI * 2);
    g.stroke();
    const rivets = Math.max(3, Math.round(12 * Math.max(0, Math.min(1, hp))));
    for (let k = 0; k < rivets; k++) {
      const a = (k / 12) * Math.PI * 2;
      rect(g, dx + Math.cos(a) * 23 - 1, cy + Math.sin(a) * 23 - 1, 2, 2, '#6a6a7a');
    }
    disc(g, dx + 12, cy - 8, 3, '#5a5a6a');
    const tick = Math.floor(t * 0.7) * 0.5;
    rect(g, dx + 12 + Math.round(Math.cos(tick) * 2), cy - 8 + Math.round(Math.sin(tick) * 2), 1, 1, '#c9a227');
    g.strokeStyle = '#9a9aaa';
    g.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = t * 0.3 + (k / 3) * Math.PI * 2;
      g.beginPath();
      g.moveTo(dx, cy);
      g.lineTo(dx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
      g.stroke();
      disc(g, dx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 1.5, '#c9a227');
    }
    disc(g, dx, cy, 4, '#c9a227');
    for (const gx of [30, 290]) {
      rect(g, gx - 3, 88, 7, 30, '#1a2a4a');
      rect(g, gx - 2, 82, 5, 6, '#c8946a');
      rect(g, gx - 3, 80, 7, 2, '#0e1a2a');
      rect(g, gx - 1, 79, 3, 1, '#0e1a2a');
      rect(g, gx + 1, 92, 1, 1, '#c9a227');
    }
    for (const [x, y] of [[-14, 0], [-6, 0], [2, 0], [10, 0], [-10, -3], [-2, -3], [6, -3], [-6, -6], [2, -6]] as const) {
      rect(g, cx + x, 160 + y, 7, 3, '#c9a227');
      rect(g, cx + x, 160 + y, 7, 1, '#ffe08a');
    }
    const gl = Math.floor(t * 2) % 9;
    rect(g, cx - 14 + (gl % 4) * 8, 158 - Math.floor(gl / 4) * 3, 1, 1, '#ffffff');
  }

  /** THE WHEEL: its table seen at an angle (quieter than a flat spinning disc: playtest), the ball riding the rim, the
   * croupier behind it raising a hand for NO MORE BETS. */
  private wheel(g: CanvasRenderingContext2D, t: number): void {
    const cx = MID;
    const cy = 44;
    const r = 26;
    const n = 37;
    const a0 = t * 0.25;
    rect(g, cx - 6, 14, 12, 16, '#1f4a2a');
    rect(g, cx - 3, 8, 6, 6, '#e8b48a');
    rect(g, cx - 4, 7, 8, 2, '#1f8a3a');
    const hand = Math.floor(t / 4) % 3 === 0;
    rect(g, cx + (hand ? 7 : 6), hand ? 4 : 22, 2, hand ? 8 : 4, '#e8b48a');
    g.save();
    g.translate(cx, cy);
    g.scale(1, 0.45);
    disc(g, 0, 0, r + 5, '#2a1a0c');
    disc(g, 0, 0, r + 3, '#5a3a14');
    for (let k = 0; k < n; k++) {
      g.fillStyle = k === 0 ? '#1f6a3a' : k % 2 ? '#7a1a22' : '#1a1418';
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, r, a0 + (k / n) * Math.PI * 2, a0 + ((k + 1) / n) * Math.PI * 2);
      g.closePath();
      g.fill();
    }
    disc(g, 0, 0, r * 0.55, '#6a4418');
    disc(g, 0, 0, r * 0.45, '#8a5a20');
    const ba = -t * 0.9;
    disc(g, Math.cos(ba) * (r - 2), Math.sin(ba) * (r - 2), 2.2, '#f0ece6');
    g.restore();
    disc(g, cx, cy, 2.5, '#ffe08a');
    rect(g, cx - 1, cy - 6, 2, 6, '#c9a227');
    for (const [x, col] of [[-40, '#7a1a22'], [-34, '#2a4a8a'], [30, '#1f6a3a'], [36, '#a8861e']] as const) chipStack(g, cx + x, 58, 4, col);
  }

  /** THE DEALER in person behind his felt, under the lamp (green on the floor, brass in the VIP room): visor, arm
   * garters, a cigarette's smoke in the cone; a card slides off toward you every few seconds. */
  private dealer(g: CanvasRenderingContext2D, t: number, roomId: RoomId): void {
    const x = MID;
    const sway = Math.sin(t * 0.5);
    rect(g, x, 0, 1, 14, '#0a0608');
    g.fillStyle = 'rgba(255,240,190,0.14)';
    g.beginPath();
    g.moveTo(x - 10 + sway, 20);
    g.lineTo(x + 11 + sway, 20);
    g.lineTo(x + 34, 60);
    g.lineTo(x - 34, 60);
    g.closePath();
    g.fill();
    const shade = roomId === 'vip' ? '#a8861e' : '#1f6a3a';
    rect(g, x - 10 + sway, 14, 21, 6, shade);
    rect(g, x - 8 + sway, 13, 17, 1, mix(shade, '#ffffff', 0.25));
    rect(g, x - 3 + sway, 20, 7, 1, '#fff0be');
    rect(g, x - 7, 32, 14, 16, '#f0ece6');
    rect(g, x - 1, 32, 2, 10, '#1a1a1a');
    rect(g, x - 9, 34, 2, 10, '#f0ece6');
    rect(g, x + 7, 34, 2, 10, '#f0ece6');
    rect(g, x - 9, 37, 2, 1, '#c81a2a');
    rect(g, x + 7, 37, 2, 1, '#c81a2a');
    rect(g, x - 4, 24, 8, 8, '#e8b48a');
    rect(g, x - 5, 23, 10, 2, '#1f8a3a');
    rect(g, x - 2, 27, 1, 1, '#140c1c');
    rect(g, x + 2, 27, 1, 1, '#140c1c');
    rect(g, x + 4, 30, 3, 1, '#d8d8c8');
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.35 + k / 3) % 1;
      g.globalAlpha = 0.3 * (1 - p);
      rect(g, x + 7 + Math.sin(p * 6 + k) * 2, 29 - p * 10, 2, 2, '#c8c8d0');
    }
    g.globalAlpha = 1;
    rect(g, x - 32, 46, 64, 12, '#0f4a2a');
    rect(g, x - 32, 45, 64, 1, '#c9a227');
    rect(g, x - 32, 58, 64, 2, '#3a2410');
    const deal = (t % 3) / 0.6;
    if (deal < 1) {
      rect(g, x - 2 + deal * 30, 48 + deal * 6, 5, 7, '#f0ece6');
      rect(g, x - 1 + deal * 30, 49 + deal * 6, 3, 1, '#c8c0b0');
    }
    for (let k = 0; k < 4; k++) {
      const cxk = x - 22 + k * 4;
      rect(g, cxk, 47 - Math.abs(k - 1.5), 5, 7, '#f0ece6');
      rect(g, cxk + 1, 49 - Math.abs(k - 1.5), 2, 2, k % 2 ? '#141018' : '#c81a2a');
    }
    for (const [cx, col] of [[x + 14, '#7a1a22'], [x + 20, '#141018'], [x + 26, '#a8861e']] as const) chipStack(g, cx - 2, 54, 3, col);
  }

  /** THE OWNER: his office in the open column. A gold desk, a high-backed chair, the man himself with his cigar, a
   * wall safe behind him. As his HP falls he leans in, then stands. Your jackpot: the ember flares and the ash drops. */
  private owner(g: CanvasRenderingContext2D, t: number, cheer: number, hp: number): void {
    const x = MID;
    // The office wall: dark panelling and a gold-rimmed safe.
    rect(g, x - 34, 14, 68, 46, '#1a0e12');
    for (let k = 0; k < 5; k++) rect(g, x - 32 + k * 14, 16, 1, 42, '#24141a');
    rect(g, x + 14, 18, 16, 14, '#3a3a44');
    rect(g, x + 14, 18, 16, 1, '#c9a227');
    rect(g, x + 21, 23, 3, 3, '#c9a227');
    rect(g, x + 22, 24, 1, 1, '#1a1a1a');
    // The chair: oxblood leather, tall back.
    rect(g, x - 10, 18, 20, 26, '#5a1418');
    rect(g, x - 10, 18, 20, 1, '#8a2a2a');
    for (let k = 0; k < 3; k++) rect(g, x - 6 + k * 6, 22, 1, 1, '#c9a227');
    // The man: he sits back at full HP, leans in under 60%, stands under 25%.
    const lean = hp < 0.25 ? -6 : hp < 0.6 ? 2 : 0;
    const by = 30 + lean;
    rect(g, x - 9, by, 18, 14, '#141018');
    for (let k = 0; k < 4; k++) rect(g, x - 7 + k * 4, by + 1, 1, 13, '#2a2430');
    rect(g, x - 1, by, 2, 8, '#f0ece6');
    rect(g, x, by + 1, 1, 6, '#a8121a');
    rect(g, x, by + 3, 1, 1, '#ffd23f');
    rect(g, x - 5, by - 9, 10, 9, '#e0a880');
    rect(g, x - 5, by - 10, 10, 2, '#c8c8d0');
    rect(g, x - 4, by - 6, 3, 2, '#3a2a10');
    rect(g, x + 1, by - 6, 3, 2, '#3a2a10');
    rect(g, x - 4, by - 7, 8, 1, '#c9a227');
    rect(g, x - 2, by - 2, 4, 1, '#7a3a2a');
    // The cigar and its ember (it flares on your jackpot), the smoke curling up.
    rect(g, x + 3, by - 3, 5, 1, '#6a3a1a');
    const ember = cheer > 0.2 ? '#fff0a0' : Math.sin(t * 2) > 0 ? '#ff5a2a' : '#c83a1a';
    rect(g, x + 8, by - 3, 1, 1, ember);
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.3 + k / 4) % 1;
      g.globalAlpha = 0.28 * (1 - p);
      rect(g, x + 8 + Math.sin(p * 5 + k) * 3, by - 4 - p * 14, 2, 2, '#c8c8d0');
    }
    g.globalAlpha = 1;
    // The pinky ring on the desk hand.
    rect(g, x - 12, by + 10, 3, 2, '#e0a880');
    rect(g, x - 11, by + 10, 1, 1, '#bff6ff');
    // The desk: gold-trimmed mahogany, a stack of chips, a gold pen set.
    rect(g, x - 30, 44, 60, 14, '#4a1e10');
    rect(g, x - 30, 44, 60, 1, '#c9a227');
    rect(g, x - 30, 57, 60, 1, '#c9a227');
    for (let k = 0; k < 3; k++) rect(g, x - 24 + k * 18, 48, 12, 6, '#3a160c');
    chipStack(g, x + 18, 41, 4, '#c9a227');
    chipStack(g, x + 23, 41, 3, '#7a1a22');
    rect(g, x - 22, 41, 6, 3, '#c9a227');
    rect(g, x - 20, 38, 1, 3, '#141018');
  }

  // ---- the crowd -------------------------------------------------------------------------------------------------

  /** Three at each bottom corner, dressed for the room. Your jackpot: they jump, arms up. Theirs: hands on heads,
   * mouths open. Under 30% HP one of them covers their eyes. */
  private crowd(g: CanvasRenderingContext2D, s: Scene, t: number, cheer: number): void {
    const dress = DRESS[s.room];
    const groan = this.groanT;
    FANS.forEach((f, i) => {
      const d = dress[i];
      const jump = cheer > 0 ? Math.abs(Math.sin(t * 9 + f.phase)) * 5 * cheer : 0;
      const top = LH - f.h - Math.sin(t * 1.3 + f.phase) * 0.6 - jump + 2 * groan;
      const hw = 10;
      const look = f.x < MID ? 1 : -1;
      rect(g, f.x - hw / 2, top + 8, hw, f.h, d.coat);
      rect(g, f.x - hw / 2, top + 8, 1, f.h, 'rgba(0,0,0,0.33)');
      if (d.look === 'tux') {
        rect(g, f.x - 1, top + 8, 3, 7, '#f0ece6');
        rect(g, f.x - 1, top + 8, 3, 1, '#141018');
      } else if (d.look === 'gown') {
        rect(g, f.x - hw / 2 - 1, top + 14, hw + 2, f.h, d.coat);
        rect(g, f.x - 3, top + 7, 6, 1, '#f0ece6');
      } else if (d.look === 'loud') {
        for (let k = 0; k < 4; k++) rect(g, f.x - 3 + (k % 2) * 4, top + 10 + k * 3, 2, 2, '#ffd23f');
      } else if (d.look === 'cup') rect(g, f.x + hw / 2 - 1, top + 13, 3, 4, '#c0c0c8');
      rect(g, f.x - 3, top, 6, 7, f.skin);
      rect(g, f.x - 1 + look, top + 3, 1, 1, '#140c1c');
      rect(g, f.x + 1 + look, top + 3, 1, 1, '#140c1c');
      if (d.look === 'monocle') rect(g, f.x + 1 + look, top + 2, 2, 2, '#e8c84a');
      if (cheer > 0.2) rect(g, f.x, top + 5, 2, 1, '#5a1a1a');
      if (groan > 0.2) rect(g, f.x - 1 + look, top + 5, 2, 2, '#3a1010');
      if (d.look === 'hood') {
        rect(g, f.x - 4, top - 1, 8, 4, d.coat);
        rect(g, f.x - 4, top + 3, 1, 5, d.coat);
      } else if (d.look === 'beanie') rect(g, f.x - 3, top - 2, 6, 3, d.hair);
      else if (d.look === 'visor') rect(g, f.x - 3, top, 8, 1, d.hair);
      else if (d.look === 'gown') rect(g, f.x - 4, top - 2, 8, 4, d.hair);
      else rect(g, f.x - 3, top - 1, 6, 2, d.hair);
      if (d.look === 'umbrella') {
        g.fillStyle = '#1a1a2a';
        g.beginPath();
        g.arc(f.x, top - 2, 9, Math.PI, 0);
        g.fill();
        rect(g, f.x, top - 2, 1, 8, '#0a0a0a');
        if (Math.floor(t * 2 + f.phase) % 3 === 0) rect(g, f.x - 9, top - 1 + ((t * 20) % 6), 1, 1, 'rgba(170,180,230,0.8)');
      }
      const cantLook = s.hp < 0.3 && i === 1;
      if (jump > 1) {
        rect(g, f.x - hw / 2 - 2, top - 2, 2, 10, d.coat);
        rect(g, f.x + hw / 2, top - 2, 2, 10, d.coat);
        rect(g, f.x - hw / 2 - 2, top - 4, 2, 2, f.skin);
        rect(g, f.x + hw / 2, top - 4, 2, 2, f.skin);
      } else if (groan > 0.2) {
        rect(g, f.x - hw / 2 - 1, top + 1, 2, 8, d.coat);
        rect(g, f.x + hw / 2 - 1, top + 1, 2, 8, d.coat);
        rect(g, f.x - 3, top - 1, 2, 2, f.skin);
        rect(g, f.x + 1, top - 1, 2, 2, f.skin);
      } else if (cantLook) rect(g, f.x - 3, top + 2, 6, 2, f.skin);
    });
  }
}

/** The room for an act (ENDLESS goes round all three, starting from the floor). */
export const roomFor = (act: number, loop: number): RoomId => (loop > 0 ? (['floor', 'vip', 'alley'] as const)[(loop - 1) % 3] : act <= 1 ? 'alley' : act === 2 ? 'floor' : 'vip');
