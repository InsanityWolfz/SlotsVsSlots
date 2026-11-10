/**
 * RUN OVER: you get thrown out (user, 2026-11-10: "I like the run over art plan, let's build it"). No death: what gets
 * thrown out is your Slot Machine (the run's cabinet sprite, no new character art), and it lands dented and sparking.
 * - KNOCKED OUT (act 1): the street station where you fell, your machine knocked over in the gutter in the rain. (Fallen
 *   at the casino's door, to THE DOORMAN himself: his entrance, him dusting off his gloves.)
 * - THROWN OUT! (acts 2-3): THE DOORMAN's entrance: your machine tumbles out of the doors and lands on the pavement with
 *   a thud, him dusting off his gloves.
 * - CLOSING TIME (ENDLESS): the same doors at dawn, the sky greying, the marquee's bulbs switching off one by one.
 * The beat: the machine lands at `RUNOVER_LAND` seconds with a thud (a short stepped shake, a dust puff, the caller plays
 * the sound), then sparks now and then. The machine falls in 90-degree steps (8-bit, no smooth rotation), drawn on the
 * rooms' 2px grid with stepped damage: a cracked reel glass, the third reel dark, the lever snapped (its knob on the
 * ground), dents on the cabinet.
 */
import { drawEntrance } from './roomEntrance';
import { drawStreet } from './roomStreet';
import { drawSprite, type SpriteId } from './sprites';

export type RunOverKind = 'ko' | 'thrown' | 'closing';
/** Off: RUN OVER as it was (the dark veil, RUN OVER / BUSTED ON LOOP n), for before/after shots (dbg.runOver). */
export const RUNOVER = { on: true };
/** When the machine lands (seconds into the reveal): the banner punches in then. */
export const RUNOVER_LAND = 0.62;

const K = '#140c1c';
const Y = '#ffe45c';
const O = '#f07c1c';
const T = '#f4eee0';

/** Your machine, damaged, at its 48x64 art size (a 2px border for the outline's room). */
const wrecks = new Map<string, HTMLCanvasElement>();
function wreck(sprite: string): HTMLCanvasElement {
  const hit = wrecks.get(sprite);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 52;
  c.height = 68;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  drawSprite(g, sprite as SpriteId, 26, 34, 1);
  const P = (x: number, y: number, w: number, h: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x + 2, y + 2, w, h);
  };
  // (Sprite pixels: the reels' window spans x 7-37, y 21-39; the third reel x 28-36; the lever x 41-47, y 19-38.)
  // The third reel dark (its glass smashed): near black, a grey shard or two.
  P(28, 22, 9, 17, K);
  P(29, 24, 2, 1, '#6d6482');
  P(33, 30, 1, 3, '#6d6482');
  // A crack across the reel glass: a stepped diagonal.
  for (let i = 0; i < 9; i++) P(10 + i, 23 + Math.floor(i * 1.6), 1, 2, K);
  for (let i = 0; i < 4; i++) P(19 + i, 37 - i, 1, 1, '#9a8fb0');
  // The lever snapped: its top rows gone dark (the knob lies on the ground, drawn by the scene).
  P(41, 18, 7, 9, K);
  P(42, 27, 2, 3, '#6d6482');
  // Dents on the cabinet's base and side: dark notches.
  for (const [x, y, w, h] of [[6, 47, 3, 2], [30, 52, 4, 2], [4, 58, 2, 3], [38, 44, 2, 3]] as const) P(x, y, w, h, K);
  wrecks.set(sprite, c);
  return c;
}

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
  dust: boolean;
}
const st: { bits: Bit[]; landed: boolean; lastT: number; sparkAt: number } = { bits: [], landed: false, lastT: 0, sparkAt: 0 };

export interface RunOverScene {
  kind: RunOverKind;
  /** The run's Slot Machine sprite (CABINETS[cabinet].sprite). */
  sprite: string;
  /** KNOCKED OUT: the street station where you fell, or 'door' (you fell to THE DOORMAN). */
  station: number | 'door';
  /** Seconds into the reveal (99 once it's over or skipped). */
  t: number;
  /** The clock (the rooms' rain, the bulbs). */
  time: number;
  reduceMotion: boolean;
}

/** Where the machine lands (screen pixels, its centre) and where it comes from. */
function path(kind: RunOverKind, station: number | 'door'): { x0: number; y0: number; x1: number; y1: number; arc: number } {
  if (kind === 'ko' && station !== 'door') return { x0: 1112, y0: 360, x1: 1112, y1: 408, arc: 30 };
  // Out of the doors (the open column, high), over the carpet, onto the pavement under THE DOORMAN.
  return { x0: 640, y0: 210, x1: 1056, y1: 396, arc: 150 };
}

/** RUN OVER's scene, full screen, behind the screen's panels (over.ts draws it first, then its own veil). */
export function drawRunOver(ctx: CanvasRenderingContext2D, o: RunOverScene): void {
  const door = o.kind !== 'ko' || o.station === 'door';
  const land = RUNOVER_LAND;
  const t = o.t;
  const dt = Math.max(0, Math.min(0.1, o.time - st.lastT));
  st.lastT = o.time;
  // A new reveal (time went back): start over.
  if (t < 0.05) {
    st.bits = [];
    st.landed = false;
  }
  // The thud: a short shake (stepped, 2-4px), none with reduced motion.
  const since = t - land;
  const shake = !o.reduceMotion && since >= 0 && since < 0.26 ? (Math.floor(since * 40) % 2 ? 1 : -1) * (since < 0.12 ? 4 : 2) : 0;
  ctx.save();
  ctx.translate(0, shake);
  if (door) drawEntrance(ctx, { pot: 0, foeHp: 1, turn: null, time: o.time, dust: t >= land, dawn: o.kind === 'closing' ? Math.min(1, Math.max(0, (t - 0.2) / 3.2)) : 0 });
  else drawStreet(ctx, { station: o.station as number, time: o.time });
  const p = path(o.kind, o.station);
  const img = wreck(o.sprite);
  // The flight: a hop (KNOCKED OUT: tipping over where it stood), or a throw out of the doors; it turns in quarter
  // turns and lands on its side (its top to the right).
  const k = Math.max(0, Math.min(1, t / land));
  const x = p.x0 + (p.x1 - p.x0) * k;
  const y = p.y0 + (p.y1 - p.y0) * k - Math.sin(Math.PI * k) * p.arc;
  const quarters = o.kind === 'ko' && !door ? (k < 0.5 ? 0 : 1) : Math.min(5, Math.floor(k * 5));
  const rot = (quarters % 4) * (Math.PI / 2);
  // The thrown machine comes out of the doorway small (it's further away), full size by the time it lands.
  const s = o.kind === 'ko' && !door ? 2 : k < 0.35 ? 1 : 2;
  if (t < land) {
    drawWreck(ctx, img, x, y, rot, s);
  } else {
    if (!st.landed) {
      st.landed = true;
      // The dust puff: grey pixels out along the ground from under it.
      for (let i = 0; i < 26; i++) st.bits.push({ x: p.x1 + (Math.random() - 0.5) * 120, y: p.y1 + 46, vx: (Math.random() - 0.5) * 140, vy: -10 - Math.random() * 40, life: 0.7 + Math.random() * 0.4, c: Math.random() < 0.5 ? '#6d6482' : '#9a8fb0', dust: true });
      st.sparkAt = t + 0.3;
    }
    drawWreck(ctx, img, p.x1, p.y1, Math.PI / 2, 2);
    // The lever's knob, rolled off beside it.
    sq(ctx, p.x1 - 86, p.y1 + 40, 8, 8, K);
    sq(ctx, p.x1 - 84, p.y1 + 42, 6, 6, '#e8374b');
    sq(ctx, p.x1 - 84, p.y1 + 42, 2, 2, T);
    // Sparks from the smashed reel now and then (a short burst, never a flash).
    if (t >= st.sparkAt) {
      st.sparkAt = t + 0.7 + Math.random() * 1.4;
      for (let i = 0; i < 7; i++) st.bits.push({ x: p.x1 + 10, y: p.y1 - 6, vx: (Math.random() - 0.3) * 90, vy: -60 - Math.random() * 60, life: 0.35 + Math.random() * 0.2, c: Math.random() < 0.5 ? Y : O, dust: false });
    }
  }
  for (const b of st.bits) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += (b.dust ? 60 : 420) * dt;
    if (b.dust) b.vx *= 0.92;
    b.life -= dt;
    ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2)) * (b.dust ? 0.7 : 1);
    sq(ctx, b.x, b.y, b.dust ? 4 : 2, b.dust ? 4 : 2, b.c);
  }
  ctx.globalAlpha = 1;
  st.bits = st.bits.filter((b) => b.life > 0);
  ctx.restore();
}

/** A filled square snapped to the rooms' 2px grid. */
function sq(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, w, h);
}

/** The wreck at (x, y), turned by quarter turns, `s` screen pixels an art pixel (snapped to the grid). */
function drawWreck(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, rot: number, s: number): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x / 2) * 2, Math.round(y / 2) * 2);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();
}
