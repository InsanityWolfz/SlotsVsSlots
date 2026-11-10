/**
 * ACT 3, THE HIGH-ROLLER ROOM (rooms v2's journey; the user, 2026-11-09: past the roulette wheel "that takes you to the
 * high rolling table games... people sitting playing table games. And then at the end of that strip is the dealer
 * waiting for you at a blackjack table"). You're a high roller now: quieter and richer than the floor, with velvet,
 * brass, chandeliers and card felt. Four stations down the room's aisle, chosen by how far into the act this fight is
 * (`hrStation`, as act 1's street), then THE DEALER's table itself for his fight (`drawDealerRoom`).
 *
 * The stations share act 1's projection (roomStreet.ts): one-point perspective, the same eye level and vanishing point
 * (the open column between the HUDs), drawn per row and column on the 640x360 grid in the portraits' style (2px, their
 * palette, a 1px outline on props, stepped light, no gradients). THE DEALER's lamp-lit table stands at the aisle's end
 * from the first station, nearer each fight. Behind the reels the room stays dark and calm; motion is soft (a card
 * turned at a far table, a chandelier's glint).
 *
 * THE DEALER's room is the table seen from your seat: his blackjack table under a hanging lamp in the open column, the
 * man himself behind it at the room's 2px scale (his portrait's green eyeshade, gold-tooth grin, red bow tie, sleeve
 * garters), the velvet room behind. Alive in his fight: he deals himself a card each of his turns, flicks a BUST at
 * you when his trick fires, pushes his chips in when ALL IN is armed, sweeps his cards and straightens his eyeshade when
 * a hand falls, flinches when hit. Three brass markers on the rail count his hands (HAND 1/3). Nothing flashes.
 * ENDLESS hook: `late` (0 early, 1 closing) empties the tables, puts the chairs up and turns lamps off; not wired yet.
 */
import { mk, outlined, px, RH, RW } from './roomEntrance';
import { drawPatron, LOOKS, type PatronLook } from './patrons';
import { drawText } from './text';

// ---- the projection (act 1's: roomStreet.ts) ----------------------------------------------------------------------

const CX = 320;
const HOR = 140;
const EYE = 250;
/** The room is wider than the street: the walls stand further out, the ceiling high. */
const WALL = 760;
const CEIL = 820;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

// The portraits' palette (tools/build-art.mjs) plus the room's darks.
const K = '#140c1c';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const Yl = '#ffe08a';
const T = '#f4eee0';
const O = '#f07c1c';
const t9 = '#9a8fb0';
const R = '#e8374b';
const r = '#8e1f3a';
const d = '#561530';
const F = '#f4c09a';
const f = '#c07a5c';
const k = '#3b3347';
const l = '#6d6482';
const e = '#4cc234';
const E = '#b8f25a';
const Q = '#1f7d3c';
const q = '#0f4128';
const CARPET = '#2a0e1c';
const CARPET_D = '#220a16';
const CARPET_P = '#3e1426';
const VELVET = '#2c0e1e';
const VELVET_D = '#210a17';
const WOOD = '#2a160f';
const WOOD_L = '#3c2216';
const CEIL_C = '#120a14';
const CEIL_L = '#1c1220';

// ---- the room and its stations -------------------------------------------------------------------------------------

type TableKind = 'blackjack' | 'baccarat' | 'craps' | 'poker';
/** A seat taken: 'lean' and 'button' on our side of the table (seen from behind, on a high-backed chair), 'cards' and
 * 'chips' across it (three-quarter toward the aisle); `at` from -1 (the table's left end) to 1; `look` a LOOKS index. */
interface Seat {
  pose: 'lean' | 'button' | 'cards' | 'chips';
  at: number;
  look: number;
}
interface Table {
  lat: number;
  /** The near edge's depth (from the camera), and how deep the table is. */
  z: number;
  dz: number;
  w: number;
  kind: TableKind;
  seats: Seat[];
}
interface Station {
  tables: Table[];
  /** Chandeliers over the aisle (lateral, depth). */
  chandeliers: [number, number][];
  /** The velvet rope along the aisle (station 0: the way in). */
  rope?: boolean;
  /** HIGH LIMIT, hanging over the aisle. */
  sign?: boolean;
  /** The one thing you pass at this station: the pit boss at his podium, a cocktail waitress, the cigar lounge's
   * leather chair, a chip cart. */
  landmark: 'pit' | 'waitress' | 'lounge' | 'cart';
}

/** The room is one aisle lined with tables on both sides, all the way from the door to THE DEALER's table; each station
 * is the camera a step further down it (the user, 2026-11-10: "it should feel like they are passing the people at the
 * tables"). Room depths: tables every 0.9 on each side (staggered), his table's near edge at D_END. */
const DC = [0, 2.4, 4.6, 6.2];
const D_END = 9;
const KINDS: TableKind[] = ['baccarat', 'craps', 'blackjack', 'poker'];
const ROW_STEP = 0.9;

function buildStation(i: number): Station {
  const tables: Table[] = [];
  for (const side of [-1, 1] as const) {
    let k = 0;
    for (let D = side < 0 ? 0.95 : 1.4; D < D_END - 0.7; D += ROW_STEP, k++) {
      const z = D - DC[i];
      if (z < 0.85) continue;
      // Each table its own game and players (fixed by its place in the room, so you walk past the same ones).
      const n = k * 2 + (side > 0 ? 1 : 0);
      const near: Seat[] = [{ pose: hash(n, 1) > 0.5 ? 'lean' : 'button', at: -0.35, look: (n * 3) % LOOKS.length }];
      if (hash(n, 2) > 0.45) near.push({ pose: 'lean', at: 0.35, look: (near[0].look + 5) % LOOKS.length });
      const far: Seat[] = [{ pose: hash(n, 3) > 0.4 ? 'cards' : 'chips', at: 0.1 * side, look: (n * 3 + 2) % LOOKS.length }];
      if (hash(n, 4) > 0.55) far.push({ pose: 'cards', at: -0.45 * side, look: (far[0].look + 3) % LOOKS.length });
      tables.push({ lat: side * 440, z, dz: 0.5, w: 300, kind: KINDS[(k + (side > 0 ? 2 : 0)) % KINDS.length], seats: [...far, ...near] });
    }
  }
  const chandeliers = [2, 4.3, 6.6, 8.4].map((D) => [0, D - DC[i]] as [number, number]).filter(([, z]) => z > 1.2);
  return { tables, chandeliers, rope: i === 0, sign: i === 0, landmark: (['pit', 'waitress', 'lounge', 'cart'] as const)[i] };
}

/** The room's back wall (where THE DEALER's table stands) at each station, from the camera. */
const Z_FAR = DC.map((c) => D_END + 0.8 - c);
export const HR_STATIONS = Z_FAR.length;
let stationsBuilt: Station[] | null = null;
/** The stations (built on first use: they read the helpers below). */
const stationAt = (i: number): Station => (stationsBuilt ??= DC.map((_, j) => buildStation(j)))[i];

/** Which station an act 3 fight sits at (as `streetStation`: the regulars spread over the four, the last one always
 * the last tables before his). */
export function hrStation(i: number, n: number): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(HR_STATIONS - 1, Math.round((i * (HR_STATIONS - 1)) / (n - 1))));
}

/** THE DEALER from the patron kit (his portrait's eyeshade, dark vest, white shirtsleeves), a cocktail waitress, the
 * pit boss. */
const DEALER_LOOK: PatronLook = { skin: '#f4c09a', hair: '#3b3347', coat: '#2a2238', sleeve: '#e8e0d0', hairStyle: 'visor' };
const WAITRESS_LOOK: PatronLook = { skin: '#c07a5c', hair: '#1a1014', coat: '#2a1c2e', hairStyle: 'bun', skirt: true, tie: 'bow', lips: '#a8304a' };
const PIT_BOSS_LOOK: PatronLook = { skin: '#e0a07a', hair: '#c8c0d0', coat: '#2c2638', legs: '#1a1620', hairStyle: 'short', tie: 'long' };

/** The station's one landmark, beside the aisle where the open column shows it. */
function drawLandmark(g: CanvasRenderingContext2D, kind: Station['landmark'], late: number): void {
  const nobody = late > 0.5;
  if (kind === 'pit') {
    // The pit boss at his podium, watching the tables (the podium's lamp lit).
    const z = 3;
    const s = 1 / z;
    const x = xAt(-110, z);
    if (!nobody) drawPatron(g, x - 6 * s, yAt(0, z), 290 / z, PIT_BOSS_LOOK, 'stand');
    box(g, x - 34 * s, yAt(118, z), 68 * s, yAt(0, z) - yAt(118, z), WOOD);
    px(g, x - 34 * s, yAt(118, z), 68 * s, Math.max(1, 6 * s), G);
    px(g, x - 26 * s, yAt(96, z), 52 * s, Math.max(1, 40 * s), WOOD_L);
    box(g, x + 14 * s, yAt(150, z), 10 * s, 30 * s, g8);
    px(g, x + 12 * s, yAt(158, z), 14 * s, Math.max(1, 6 * s), nobody ? '#5a3a1a' : Yl);
  } else if (kind === 'waitress') {
    // A cocktail waitress by the tables, a tray of drinks held high on her outer hand (clear of THE DEALER's table).
    if (!nobody) drawPatron(g, xAt(112, 2.8), yAt(0, 2.8), 290 / 2.8, WAITRESS_LOOK, 'tray');
  } else if (kind === 'lounge') {
    // The cigar lounge's wingback: oxblood leather, buttoned, a smoker's head over its back; a side table, an ashtray.
    const z = 2.6;
    const s = 1 / z;
    const x = xAt(-120, z);
    if (!nobody) drawPatron(g, x, yAt(66, z), 170 / z, LOOKS[5], 'lean', false);
    const top = yAt(200, z);
    const seat = yAt(60, z);
    box(g, x - 46 * s, top + 10 * s, 92 * s, seat - top, '#4a1a12');
    box(g, x - 40 * s, top, 80 * s, seat - top, '#6a2a1a');
    px(g, x - 40 * s, top, 80 * s, Math.max(1, (seat - top) * 0.2), '#8a3a24');
    px(g, x + 24 * s, top, 16 * s, seat - top, '#4a1a12');
    for (const [u, v] of [[-0.25, 0.35], [0.05, 0.35], [-0.1, 0.6], [0.2, 0.6]] as const) px(g, x + u * 80 * s, top + v * (seat - top), Math.max(1, 3 * s), Math.max(1, 3 * s), '#2a0e0a');
    for (const lx of [x - 38 * s, x + 30 * s]) box(g, lx, seat, Math.max(1, 6 * s), yAt(0, z) - seat, '#2a160f');
    box(g, x + 60 * s, yAt(70, z), 40 * s, yAt(0, z) - yAt(70, z), WOOD);
    box(g, x + 70 * s, yAt(80, z), 18 * s, 6 * s, '#8a7e76');
    px(g, x + 76 * s, yAt(80, z), Math.max(1, 4 * s), Math.max(1, 3 * s), nobody ? '#5a3a1a' : O);
  } else {
    // A chip cart rolled out for the high-limit tables: racks of chips on a brass-trimmed cart.
    const z = 2.1;
    const s = 1 / z;
    const x = xAt(120, z);
    const top = yAt(120, z);
    box(g, x - 50 * s, top, 100 * s, yAt(30, z) - top, WOOD);
    px(g, x - 50 * s, top, 100 * s, Math.max(1, 6 * s), G);
    px(g, x - 50 * s, yAt(70, z), 100 * s, Math.max(1, 4 * s), g8);
    const cols = [R, '#3474e0', K, G, '#4cc234'];
    cols.forEach((c, j) => {
      const cx = x - 44 * s + j * 18 * s;
      box(g, cx, top - 26 * s, 14 * s, 26 * s, c);
      for (let h = 4; h < 26; h += 6) px(g, cx, top - h * s, 14 * s, 1, j === 2 ? '#3b3347' : T);
    });
    for (const wx of [x - 40 * s, x + 30 * s]) box(g, wx, yAt(30, z), 10 * s, 10 * s, '#1a1426');
  }
}

// ---- drawing helpers ----------------------------------------------------------------------------------------------

/** A filled box with the portraits' 1px outline once it's big enough to carry one. */
function box(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  const X = Math.round(x);
  const Yy = Math.round(y);
  const W = Math.max(1, Math.round(w));
  const H = Math.max(1, Math.round(h));
  if (W >= 3 && H >= 3) {
    px(g, X - 1, Yy - 1, W + 2, H + 2, K);
    px(g, X, Yy, W, H, c);
  } else px(g, X, Yy, W, H, c);
}
/** Stepped light, the entrance's way: `steps` nested ellipses, each lifting what's already drawn under it by the same
 * warm amount (so a curtain's folds and a wall's panels still show through), crisp-edged, no gradient. A negative
 * `warm` is a stepped shadow. */
function light(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, steps: number, warm: [number, number, number] = [22, 10, 6]): void {
  const x0 = Math.max(0, Math.floor(cx - rx));
  const y0 = Math.max(0, Math.floor(cy - ry));
  const x1 = Math.min(g.canvas.width, Math.ceil(cx + rx));
  const y1 = Math.min(g.canvas.height, Math.ceil(cy + ry));
  if (x1 <= x0 || y1 <= y0 || rx < 1 || ry < 1) return;
  const img = g.getImageData(x0, y0, x1 - x0, y1 - y0);
  const d = img.data;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const u = Math.sqrt(((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2);
      if (u >= 1) continue;
      const level = Math.min(steps, Math.floor((1 - u) * steps) + 1);
      const i = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
      if (d[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, d[i + c] + warm[c] * level));
    }
  g.putImageData(img, x0, y0);
}
const hash = (a: number, b: number) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
const FELT: Record<TableKind, [string, string]> = {
  blackjack: ['#174a2c', '#1f5a36'],
  baccarat: ['#1d2f5a', '#253a6a'],
  craps: ['#1a4a30', '#225a3a'],
  poker: ['#3a1424', '#4a1a2e'],
};
/** The near players behind the reels are dimmer (calm under the HUD), still readable as people. */
const dimAt = (z: number) => (z < 2.2 ? 0.62 : z < 3.4 ? 0.8 : 1);

// ---- the still layer: ceiling, walls, floor, the back wall, his table, the tables -----------------------------------

function drawCeiling(g: CanvasRenderingContext2D, zFar: number, late: number): void {
  const yEnd = Math.floor(yAt(CEIL, zFar));
  for (let y = 0; y <= yEnd; y++) {
    const z = (CEIL - EYE) / (HOR - y - 0.5);
    const zn = (CEIL - EYE) / (HOR - y + 0.5);
    if (z <= 0) continue;
    const wl = xAt(-WALL, z);
    const wr = xAt(WALL, z);
    px(g, wl, y, wr - wl, 1, CEIL_C);
    // Coffers: a beam across every 0.5 of depth, and two along the room.
    if (Math.floor(z * 2) !== Math.floor(zn * 2)) px(g, wl, y, wr - wl, 1, CEIL_L);
    px(g, xAt(-240, z), y, 1, 1, CEIL_L);
    px(g, xAt(240, z), y, 1, 1, CEIL_L);
    if (late < 0.5) {
      px(g, wl, y, Math.max(1, 18 / z), 1, '#3a2214');
      px(g, wr - Math.max(1, 18 / z), y, Math.max(1, 18 / z), 1, '#3a2214');
    }
  }
}

/** The paintings on each wall (room depths): gilt frames round dark old canvases. */
const PAINTINGS: Record<number, [number, number][]> = { [-1]: [[3, 3.6], [5.4, 6]], [1]: [[4.2, 4.8], [6.4, 7]] };

/** One side wall, column by column: the wainscot's panels under a brass rail, velvet panels framed in dark brass, a
 * painting or two, a sconce on each panel, the cornice. Low contrast: it sits behind the reels. `dc`: the camera's
 * room depth (the paintings and sconces stay where they hang as you walk). */
function drawWall(g: CanvasRenderingContext2D, side: -1 | 1, zFar: number, late: number, dc: number): void {
  const xEnd = Math.round(xAt(side * WALL, zFar));
  const cols = side < 0 ? [0, xEnd] : [xEnd, RW];
  let prevZ = 0;
  for (let x = cols[0]; x < cols[1]; x++) {
    const z = WALL / Math.abs(x + 0.5 - CX);
    if (z > zFar) continue;
    const D = z + dc;
    const top = Math.max(0, yAt(CEIL, z));
    const ground = yAt(0, z);
    px(g, x, top, 1, ground - top, '#1c1020');
    px(g, x, yAt(600, z), 1, 460 / z, VELVET);
    for (let h = 160; h < 600; h += 60) px(g, x, yAt(h, z), 1, 1, VELVET_D);
    px(g, x, yAt(640, z), 1, Math.max(1, 40 / z), g8);
    px(g, x, yAt(640, z), 1, 1, G);
    px(g, x, yAt(140, z), 1, 140 / z, WOOD);
    px(g, x, yAt(116, z), 1, 1, WOOD_L);
    px(g, x, yAt(20, z), 1, 1, WOOD_L);
    const panel = (D % 0.6) / 0.6;
    if (panel < 0.06 || panel > 0.94) px(g, x, yAt(116, z), 1, 96 / z, WOOD_L);
    px(g, x, yAt(140, z), 1, Math.max(1, 5 / z), g8);
    px(g, x, yAt(140, z), 1, 1, G);
    if (Math.floor(D / 0.6) !== Math.floor((prevZ + dc) / 0.6)) px(g, x, yAt(600, z), 1, 460 / z, '#4a2e18');
    for (const [d0, d1] of PAINTINGS[side]) {
      if (D < d0 || D >= d1) continue;
      if (D - d0 < 0.04 || d1 - D < 0.04) px(g, x, yAt(480, z), 1, 220 / z, g8);
      else {
        px(g, x, yAt(480, z), 1, Math.max(1, 6 / z), g8);
        px(g, x, yAt(266, z), 1, Math.max(1, 6 / z), g8);
        px(g, x, yAt(474, z), 1, 110 / z, '#241a30');
        px(g, x, yAt(364, z), 1, 98 / z, '#2a2018');
        px(g, x, yAt(364, z), 1, 1, '#3a2c22');
      }
    }
    prevZ = z;
  }
  for (let D = 0.3; D - dc < zFar; D += 0.6) {
    const z = D - dc;
    if (z < WALL / 320) continue;
    if (PAINTINGS[side].some(([d0, d1]) => D > d0 - 0.2 && D < d1 + 0.2)) continue;
    const x = xAt(side * WALL, z);
    const y = yAt(420, z);
    const s = 1 / z;
    const on = hash(Math.round(D * 10), side) >= late * 0.85;
    if (on) light(g, x, y + 4 * s, 26 * s, 44 * s, 2);
    box(g, x - 4 * s, y, 8 * s, 18 * s, g8);
    px(g, x - 3 * s, y - 10 * s, 6 * s, 10 * s, on ? Yl : '#5a3a1a');
  }
}

/** The carpet, row by row: deep red with a gold lattice, a darker runner down the aisle. */
function drawFloor(g: CanvasRenderingContext2D, zFar: number, dc: number): void {
  for (let y = Math.ceil(yAt(0, zFar)); y < RH; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    const wl = xAt(-WALL, z);
    const wr = xAt(WALL, z);
    px(g, wl, y, wr - wl, 1, CARPET);
    const al = xAt(-150, z);
    const ar = xAt(150, z);
    px(g, al, y, ar - al, 1, CARPET_D);
    px(g, al, y, Math.max(1, 6 / z), 1, g8);
    px(g, ar - Math.max(1, 6 / z), y, Math.max(1, 6 / z), 1, g8);
    if (Math.floor((z + dc) / 0.3) !== Math.floor((zn + dc) / 0.3))
      for (let lat = -WALL + 40; lat < WALL; lat += 80) if (Math.abs(lat) > 160) px(g, xAt(lat, z), y, Math.max(1, 4 / z), 1, CARPET_P);
  }
}

/** The back wall at the aisle's end: velvet curtains in stepped folds, a gold valance. */
function drawBackWall(g: CanvasRenderingContext2D, zFar: number): void {
  const x0 = Math.round(xAt(-WALL, zFar));
  const x1 = Math.round(xAt(WALL, zFar));
  const yTop = Math.round(yAt(CEIL, zFar));
  const yBot = Math.round(yAt(0, zFar));
  px(g, x0, yTop, x1 - x0, yBot - yTop, VELVET_D);
  for (let x = x0; x < x1; x++) {
    const lat = (x + 0.5 - CX) * zFar;
    const fold = Math.floor((lat + 4000) / 40) % 3;
    px(g, x, yAt(700, zFar), 1, yBot - yAt(700, zFar), fold === 0 ? '#36122a' : fold === 1 ? VELVET : VELVET_D);
  }
  px(g, x0, yAt(760, zFar), x1 - x0, 60 / zFar, g8);
  px(g, x0, yAt(760, zFar), x1 - x0, 1, G);
  px(g, x0, yAt(140, zFar), x1 - x0, 140 / zFar, WOOD);
  px(g, x0, yAt(140, zFar), x1 - x0, Math.max(1, 6 / zFar), G);
}

/** A high-backed chair seen from behind at depth z: a gilt frame, a velvet back in stepped shades with its buttons,
 * legs to the floor (each leg a real width, outlined). */
function chair(g: CanvasRenderingContext2D, x: number, z: number, dim: number): void {
  const s = 1 / z;
  const w = 64 * s;
  const yTop = yAt(170, z);
  const ySeat = yAt(66, z);
  const yFloor = yAt(0, z);
  const shade = (c: string) => (dim < 1 ? '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * dim).toString(16).padStart(2, '0')).join('') : c);
  const leg = Math.max(1, Math.round(5 * s));
  for (const lx of [x - w / 2 + leg, x + w / 2 - leg * 2]) box(g, lx, ySeat, leg, yFloor - ySeat, shade(WOOD));
  box(g, x - w / 2, yTop, w, ySeat - yTop, shade(g8));
  px(g, x - w / 2 + 3 * s, yTop + 3 * s, w - 6 * s, ySeat - yTop - 6 * s, shade(r));
  px(g, x - w / 2 + 3 * s, yTop + 3 * s, w - 6 * s, Math.max(1, (ySeat - yTop) * 0.22), shade('#a8304a'));
  px(g, x + w / 2 - 3 * s - Math.max(1, 10 * s), yTop + 3 * s, Math.max(1, 10 * s), ySeat - yTop - 6 * s, shade(d));
  if (s > 0.35)
    for (const [u, v] of [[-0.25, 0.4], [0.2, 0.4], [-0.02, 0.65]] as const) px(g, x + u * w, yTop + v * (ySeat - yTop), Math.max(1, 3 * s), Math.max(1, 3 * s), shade(d));
  px(g, x - w / 2, yTop, w, 1, shade(G));
}

/** A table: the players across it (drawn first: its felt hides them from the table down), the felt in perspective,
 * the rail, the apron and pedestal, then the players on our side and their chairs. `late`: nobody, chairs up. */
function drawTable(g: CanvasRenderingContext2D, tb: Table, late: number): void {
  const H = tb.kind === 'craps' ? 120 : 110;
  const zN = tb.z;
  const zF = tb.z + tb.dz;
  const [felt, feltL] = FELT[tb.kind];
  const empty = late > 0.5;
  const seatX = (st: Seat, z: number) => xAt(tb.lat + st.at * tb.w * 0.36, z);
  // The players face the aisle: on the left side of the room that's their left (three-quarter, as drawn); mirrored right.
  const mirror = tb.lat > 0;
  if (!empty)
    for (const st of tb.seats)
      if (st.pose === 'cards' || st.pose === 'chips') {
        const z = zF + 0.16;
        drawPatron(g, seatX(st, z), yAt(70, z), 170 / z, LOOKS[st.look], st.pose, !mirror, dimAt(z));
      }
  // The felt, row by row from its far edge to its near edge.
  const yF = Math.round(yAt(H, zF));
  const yN = Math.round(yAt(H, zN));
  for (let y = yF; y <= yN; y++) {
    const z = (EYE - H) / (y + 0.5 - HOR);
    const xl = xAt(tb.lat - tb.w / 2, z);
    const xr = xAt(tb.lat + tb.w / 2, z);
    const rail = Math.max(1, 12 / z);
    px(g, xl - 1, y, xr - xl + 2, 1, K);
    px(g, xl, y, xr - xl, 1, WOOD_L);
    px(g, xl + rail, y, xr - xl - rail * 2, 1, (y - yF) % 4 === 0 ? feltL : felt);
    if (y === yF || y === yN) px(g, xl, y, xr - xl, 1, g8);
  }
  // What's on the felt (cards, chips; the craps table's line), or chairs up at closing time.
  const s = 1 / ((zN + zF) / 2);
  const ym = (yF + yN) / 2;
  const xc = xAt(tb.lat, (zN + zF) / 2);
  if (empty) {
    for (const o of [-0.3, 0, 0.3]) {
      const cx = xc + o * tb.w * s;
      box(g, cx - 10 * s, ym - 36 * s, 20 * s, 4 * s, WOOD_L);
      px(g, cx - 9 * s, ym - 32 * s, Math.max(1, 2 * s), 28 * s, WOOD);
      px(g, cx + 7 * s, ym - 32 * s, Math.max(1, 2 * s), 28 * s, WOOD);
    }
  } else if (tb.kind === 'craps') {
    px(g, xc - tb.w * s * 0.35, ym, tb.w * s * 0.7, 1, T);
    px(g, xc + tb.w * s * 0.2, ym - 2 * s, Math.max(1, 6 * s), Math.max(1, 6 * s), T);
  } else {
    for (let i = 0; i < 3; i++) {
      const cx = xc + (i - 1) * tb.w * s * 0.28;
      box(g, cx - 5 * s, ym, Math.max(1, 9 * s), Math.max(1, 4 * s), T);
      box(g, cx + 6 * s, ym - 2 * s, Math.max(1, 6 * s), Math.max(1, 4 * s), i === 1 ? R : i ? '#3474e0' : G);
    }
  }
  // The apron and the pedestal.
  const xl = xAt(tb.lat - tb.w / 2, zN);
  const xr = xAt(tb.lat + tb.w / 2, zN);
  const ya = yAt(H, zN);
  const yb = yAt(H - 26, zN);
  box(g, xl, ya, xr - xl, yb - ya, WOOD);
  px(g, xl, ya, xr - xl, 1, G);
  const pw = (tb.w * 0.4) / zN;
  box(g, xAt(tb.lat, zN) - pw / 2, yb, pw, yAt(0, zN) - yb, '#1a0e12');
  // Our side: seen from behind, elbows on the felt, on high-backed chairs (empty chairs at closing time).
  for (const st of tb.seats) {
    if (st.pose !== 'lean' && st.pose !== 'button') continue;
    const z = zN - 0.16;
    const x = seatX(st, z);
    if (!empty) drawPatron(g, x, yAt(66, z), 170 / z, LOOKS[st.look], st.pose, mirror, dimAt(z));
    chair(g, x, z - 0.04, empty ? 0.7 : dimAt(z));
  }
}

/** A chandelier hung over the aisle: a chain, gold tiers, candle bulbs (their glints are live), its light in two flat
 * steps on the ceiling. */
function chandelier(g: CanvasRenderingContext2D, lat: number, z: number, late: number): void {
  const s = 1 / z;
  const x = xAt(lat, z);
  const yc = Math.max(0, yAt(CEIL, z));
  const yb = yAt(640, z);
  if (late < 0.5) light(g, x, yc + 2, 110 * s, 22 * s, 2, [12, 8, 4]);
  px(g, x, yc, 1, yb - yc, g8);
  box(g, x - 60 * s, yb, 120 * s, 10 * s, G);
  box(g, x - 40 * s, yb + 14 * s, 80 * s, 8 * s, G);
  px(g, x - 2 * s, yb + 24 * s, Math.max(1, 4 * s), 16 * s, g8);
  for (let i = -3; i <= 3; i++) px(g, x + i * 18 * s, yb - 8 * s, Math.max(1, 3 * s), Math.max(1, 8 * s), late < 0.5 ? Yl : '#5a3a1a');
  for (let i = -2; i <= 2; i++) px(g, x + i * 16 * s, yb + 22 * s, Math.max(1, 2 * s), Math.max(1, 6 * s), late < 0.5 ? T : l);
}

/** THE DEALER's table at the aisle's end, under his hanging lamp, the man himself behind it (his own sprite: the
 * full one once he's near enough, the small one far off). */
function distantDealer(g: CanvasRenderingContext2D, zFar: number, late: number): void {
  const z = zFar - 0.8;
  const s = 1 / z;
  const x = xAt(0, z);
  const yc = Math.max(0, yAt(CEIL, z));
  const yl = yAt(470, z);
  if (late < 0.9) light(g, x, yAt(230, z), 90 * s, 120 * s, 2, [16, 12, 6]);
  px(g, x, yc, 1, yl - yc, K);
  box(g, x - 40 * s, yl, 80 * s, 22 * s, Q);
  px(g, x - 40 * s, yl + 20 * s, 80 * s, Math.max(1, 3 * s), G);
  px(g, x - 30 * s, yl + 22 * s, 60 * s, Math.max(1, 3 * s), Yl);
  // Him behind it, at his real size for the distance (so he grows, station by station, as you close in).
  if (late < 0.9) drawPatron(g, x, yAt(40, z), 230 / z, DEALER_LOOK, 'deal');
  const tb: Table = { lat: 0, z: z - 0.4, dz: 0.3, w: 300, kind: 'blackjack', seats: [] };
  drawTable(g, tb, Math.min(late, 0.4));
  if (late < 0.9) light(g, x, yAt(110, z - 0.25), 70 * s, Math.max(1, 8 * s), 2, [12, 16, 6]);
}

const stills = new Map<string, HTMLCanvasElement>();
function still(i: number, late: number): HTMLCanvasElement {
  const key = `${i}:${late.toFixed(2)}`;
  const c = stills.get(key);
  if (c) return c;
  const [cv, g] = mk(RW, RH);
  const st = stationAt(i);
  const zFar = Z_FAR[i];
  px(g, 0, 0, RW, RH, '#0e0812');
  drawCeiling(g, zFar, late);
  drawBackWall(g, zFar);
  drawFloor(g, zFar, DC[i]);
  drawWall(g, -1, zFar, late, DC[i]);
  drawWall(g, 1, zFar, late, DC[i]);
  distantDealer(g, zFar, late);
  // Far to near: chandeliers, tables, the rope's posts, by depth.
  const things: { z: number; draw: () => void }[] = [];
  st.chandeliers.forEach(([lat, z]) => z < zFar && things.push({ z, draw: () => chandelier(g, lat, z, late) }));
  st.tables.forEach((tb) => tb.z < zFar - 1 && things.push({ z: tb.z, draw: () => drawTable(g, tb, late) }));
  if (st.rope) {
    for (const side of [-1, 1] as const) {
      const posts = [1.15, 1.6, 2.2];
      posts.forEach((z, j) => {
        things.push({
          z,
          draw: () => {
            const s = 1 / z;
            const x = xAt(side * 200, z);
            box(g, x - 4 * s, yAt(100, z), 8 * s, 100 * s, G);
            box(g, x - 8 * s, yAt(108, z), 16 * s, 12 * s, G);
            box(g, x - 12 * s, yAt(6, z), 24 * s, 6 * s, g8);
            const zb = posts[j + 1];
            if (zb) {
              const xb = xAt(side * 200, zb);
              const n = Math.max(2, Math.round(Math.abs(x - xb)));
              for (let u = 0; u <= n; u++) {
                const v = u / n;
                const zz = z + (zb - z) * v;
                const sag = Math.sin(v * Math.PI) * 26;
                px(g, x + (xb - x) * v, yAt(92 - sag, zz), 1, Math.max(1, 6 / zz), u % 3 ? r : d);
              }
            }
          },
        });
      });
    }
  }
  things.sort((a, b) => b.z - a.z).forEach((o) => o.draw());
  if (st.sign) {
    // HIGH LIMIT, hung over the aisle the way the casino floor's signs hang (act 2: one sign system).
    const z = 2.4;
    const X = (lat: number) => Math.round(xAt(lat, z));
    const Yh = (h: number) => Math.round(yAt(h, z));
    const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string) => px(g, X(lat0), Yh(h1), X(lat1) - X(lat0), Yh(h0) - Yh(h1), c);
    for (const lat of [-90, 90]) wall(lat - 1, lat + 1, 500, CEIL, k);
    wall(-130, 130, 410, 500, K);
    wall(-126, 126, 414, 496, d);
    wall(-126, 126, 414, 418, G);
    wall(-126, 126, 492, 496, G);
  }
  drawLandmark(g, st.landmark, late);
  stills.set(key, cv);
  return cv;
}

// ---- the live layer -----------------------------------------------------------------------------------------------

const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

export interface HighRollerScene {
  /** A station (0 the way in .. 3 the last tables), or 'table': THE DEALER's own. */
  place: number | 'table';
  time: number;
  late?: number;
  /** In his fight: his HP share, whose turn, his hand (1-3), ALL IN armed, his trick's charge. */
  foeHp?: number;
  turn?: 'player' | 'enemy' | null;
  dealer?: DealerState;
  fight?: boolean;
}
export interface DealerState {
  hand: number;
  allIn: boolean;
  charge: number;
}

/** Draw the high-roller room at a station, or THE DEALER's table (the stills cached; the glints and the man live). */
export function drawHighRoller(ctx: CanvasRenderingContext2D, o: HighRollerScene): void {
  if (o.place === 'table') return drawDealerRoom(ctx, o);
  const i = Math.max(0, Math.min(HR_STATIONS - 1, o.place));
  const late = o.late ?? 0;
  const t = o.time;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const st = stationAt(i);
  const zFar = Z_FAR[i];
  // The chandeliers' candles glint, one at a time, slowly.
  if (late < 0.5)
    for (const [lat, z] of st.chandeliers) {
      if (z >= zFar) continue;
      const s = 1 / z;
      const j = Math.floor(t * 1.3 + z * 5) % 7;
      px(g, xAt(lat, z) + (j - 3) * 18 * s, yAt(640, z) - 9 * s, Math.max(1, 3 * s), Math.max(1, 3 * s), '#fffbe6');
    }
  // A card turned at a far table now and then.
  const tb = st.tables.find((x) => x.seats.length && x.z < zFar - 1);
  if (tb && late < 0.5) {
    const phase = (t * 0.25 + i * 0.3) % 1;
    if (phase < 0.12) {
      const z = tb.z + tb.dz / 2;
      const s = 1 / z;
      const flip = phase < 0.06;
      px(g, xAt(tb.lat, z) - 5 * s, yAt(tb.kind === 'craps' ? 120 : 110, z) - 2, Math.max(1, (flip ? 3 : 9) * s), Math.max(2, 4 * s), flip ? t9 : T);
    }
  }
  // HIGH LIMIT's letters, a slow shimmer.
  if (st.sign) drawText(g, 'HIGH LIMIT', CX, yAt(455, 2.4), 1, Math.floor(t * 1.5) % 6 === 0 ? Yl : G, { outline: K });
  // His game named on the curtain over his lamp (the casino floor's table signs: gold letters on the wall).
  drawText(g, 'BLACKJACK', CX, Math.max(10, yAt(640, zFar - 0.75)), 1, G, { outline: K });
  // The cigar lounge: smoke curling up off the chair, in a few stepped puffs.
  if (st.landmark === 'lounge' && late < 0.5) {
    const z = 2.6;
    for (let j = 0; j < 4; j++) {
      const p = (t * 0.2 + j / 4) % 1;
      // (A puff thins out as it rises and is gone before it loops: none pops out at the top.)
      g.globalAlpha = Math.min(1, p * 8, (1 - p) * 2.5);
      px(g, xAt(-120, z) + Math.sin(p * 6 + j) * 3, yAt(250, z) - p * 30, 2 + Math.floor(p * 3), 2, p < 0.6 ? '#8a7e88' : '#5a5060');
      g.globalAlpha = 1;
    }
  }
  // His lamp breathes a little.
  const zd = zFar - 0.8;
  const sway = Math.round(Math.sin(t * 0.7) * 1);
  if (late < 0.9) px(g, xAt(0, zd) - 30 / zd + sway, yAt(470, zd) + 22 / zd, 60 / zd, 1, Math.sin(t * 2) > 0.6 ? '#fffbe6' : Yl);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still(i, late), 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  if (late > 0) {
    ctx.fillStyle = `rgba(4,2,8,${0.35 * late})`;
    ctx.fillRect(0, 0, RW * 2, RH * 2);
  }
  ctx.restore();
}

// ---- THE DEALER's table (his boss room) ------------------------------------------------------------------------------

/** THE DEALER at his table, 32x28 at the room's 2px scale (his portrait: the green eyeshade, slicked hair, a gold-tooth
 * grin, a white shirt and a red bow tie, a charcoal vest with a gold chain, red sleeve garters). Cut at the felt. */
const DEALER = [
  '...........kkkkkkkkkk...........',
  '.........kkkllllkkkkkk..........',
  '........ekkkkkkkkkkkkkke........',
  '......eeeeeeeeeeeeeeeeeeee......',
  '....EEEEeeeeeeeeeeeeeeeeEEEE....',
  '.....qqqqqqqqqqqqqqqqqqqqqq.....',
  '........HFFFFFFFFFFFFFFH........',
  '........HFWKFFFFFFFFWKFH........',
  '........fFFFFFFFfFFFFFFf........',
  '.........FFFFFFffFFFFFf.........',
  '.........FKWWWWYWWWWKFf.........',
  '..........fFFFFFFFFFFf..........',
  '............ffffffff............',
  '............TTTTTTTT............',
  '...........TTRRrrRRTT...........',
  '.......kkkkkTTTTTTTTkkkkk.......',
  '.....kkkkkkkkTTTTTTkkkkkkkk.....',
  '....kklkkkkkkkTTTTkkkkkkkklk....',
  '...kklkkkkkkkkTTkkkkkkkkklkk....',
  '..TTklkkkkkkkGkkkkkkkkkkklkTT...',
  '..RRkkkkkkkkkkkGgkkkkkkkkkkkRR..',
  '..TTkkkkkkkkkkkgGkkkkkkkkkkkTT..',
  '..TTkkkkkkkkkkkkkkkkkkkkkkkkTT..',
  '..TTkkkkkkkkkkkGkkkkkkkkkkkkTT..',
  '..TTkkkkkkkkkkkkkkkkkkkkkkkkTT..',
  '..TTkkkkkkkkkkkGkkkkkkkkkkkkTT..',
  '.FFFkkkkkkkkkkkkkkkkkkkkkkkkFFF.',
  '.FFFkkkkkkkkkkkkkkkkkkkkkkkkFFF.',
];
/** Row 7 (his eyes): at you, sly (at your machine), squinting (hit). */
const DEALER_EYES = ['........HFWKFFFFFFFFWKFH........', '........HFKWFFFFFFFFKWFH........', '........HFKKFFFFFFFFKKFH........'];
const DEALER_INK: Record<string, string> = { k, l, e, E, q, H: '#8a7e76', F, f, W: '#ffffff', K, Y, T, R, r, G, g: g8 };

let dealerSprites: HTMLCanvasElement[] | null = null;
function dealerFrames(): HTMLCanvasElement[] {
  if (dealerSprites) return dealerSprites;
  dealerSprites = DEALER_EYES.map((eyes) =>
    outlined(DEALER[0].length, DEALER.length, (c) =>
      DEALER.forEach((row, y) => [...(y === 7 ? eyes : row)].forEach((ch, x) => ch !== '.' && px(c, x, y, 1, 1, DEALER_INK[ch]))),
    ),
  );
  return dealerSprites;
}

/** The seated view at his table: eye level just above the felt, so its far (straight) edge is high and its curved
 * near edge low; everything he does happens in the open column above THE DEALER's table panel. */
const T_FAR = 70;
const T_NEAR = 90;
/** The floor line (behind his table panel); the wall above it. */
const FLOOR = 150;
const T_RX = 92;
/** The felt's near (curved) edge at x. */
const nearEdge = (x: number) => T_FAR + (T_NEAR - T_FAR) * Math.sqrt(Math.max(0, 1 - ((x - CX) / T_RX) ** 2));

const roomStills = new Map<boolean, HTMLCanvasElement>();
/** His room's still; `late` (ENDLESS's closing time): the sconces off, nobody at the other tables. */
function buildDealerStill(late: boolean): HTMLCanvasElement {
  const [cv, g] = mk(RW, RH);
  // The back wall: velvet curtains in stepped folds behind him, a gold valance, the wainscot.
  px(g, 0, 0, RW, FLOOR, VELVET_D);
  for (let x = 0; x < RW; x++) {
    const fold = Math.floor(x / 10) % 3;
    px(g, x, 14, 1, FLOOR - 28, fold === 0 ? '#36122a' : fold === 1 ? VELVET : VELVET_D);
  }
  px(g, 0, 0, RW, 14, '#1c1020');
  px(g, 0, 12, RW, 6, g8);
  px(g, 0, 12, RW, 1, G);
  for (let x = 0; x < RW; x += 10) px(g, x + 4, 18, 2, 3, g8);
  px(g, 0, FLOOR - 14, RW, 14, WOOD);
  px(g, 0, FLOOR - 14, RW, 1, G);
  // The carpet, in perspective from a seated eye (the lattice runs to the column).
  const hor = 96;
  for (let y = FLOOR; y < RH; y++) {
    const z = 200 / (y + 0.5 - hor);
    const zn = 200 / (y + 1.5 - hor);
    px(g, 0, y, RW, 1, CARPET);
    if (Math.floor(z / 0.25) !== Math.floor(zn / 0.25)) for (let lat = -1600; lat <= 1600; lat += 80) px(g, CX + lat / z, y, Math.max(1, 4 / z), 1, CARPET_P);
  }
  // Brass sconces either side, their stepped light on the velvet; a far table with its players in each corner.
  for (const x of [44, 596]) {
    if (!late) light(g, x, 62, 30, 46, 2);
    box(g, x - 4, 62, 8, 20, g8);
    px(g, x - 3, 50, 6, 12, late ? '#5a3a1a' : Yl);
    if (!late) px(g, x - 2, 51, 2, 6, '#fffbe6');
  }
  for (const [x, flip] of late ? [] : ([[40, false], [600, true]] as const)) {
    // A neighbouring table's end, its players across it and one on our side, on a high-backed chair.
    drawPatron(g, x + (flip ? 14 : -14), 226, 46, LOOKS[flip ? 3 : 1], 'cards', !flip, 0.8);
    box(g, x - 52, 210, 104, 8, WOOD_L);
    px(g, x - 50, 210, 100, 5, flip ? FELT.baccarat[0] : FELT.poker[0]);
    box(g, x - 50, 218, 100, 16, WOOD);
    px(g, x - 50, 218, 100, 1, G);
    const cx = x + (flip ? -12 : 12);
    drawPatron(g, cx, 252, 46, LOOKS[flip ? 6 : 2], 'lean', flip, 0.8);
    // Their high-backed chair (gilt frame, velvet back) and its legs.
    for (const lx of [cx - 13, cx + 10]) box(g, lx, 254, 3, 18, WOOD);
    box(g, cx - 16, 230, 32, 26, g8);
    px(g, cx - 14, 232, 28, 22, r);
    px(g, cx - 14, 232, 28, 5, '#a8304a');
    px(g, cx + 8, 232, 6, 22, d);
  }
  // The lamp's cord from the ceiling.
  px(g, CX, 0, 1, 12, K);
  // Under his table: its pedestal, in shadow down to the floor (THE DEALER's BOSS tag sits on it).
  px(g, CX - 40, T_NEAR + 3, 80, FLOOR - T_NEAR - 3, '#160a12');
  box(g, CX - 18, T_NEAR + 10, 36, FLOOR - T_NEAR - 10, '#1a0e12');
  light(g, CX, FLOOR + 4, 70, 6, 2, [-8, -4, -6]);
  // His lamp's light in flat steps on the curtain behind him (drawn before him).
  if (!late) light(g, CX, T_FAR - 26, 48, 42, 3, [16, 12, 6]);
  roomStills.set(late, cv);
  return cv;
}

/** His felt, the rail and apron, the hand markers, the chip rack (drawn over him: he's cut at the felt). */
function drawFelt(g: CanvasRenderingContext2D, handsLeft: number): void {
  for (let y = T_FAR; y <= T_NEAR + 1; y++) {
    // The table's width at this row: the straight far edge, then the curve.
    let xl = CX - T_RX;
    let xr = CX + T_RX;
    if (y > T_FAR) {
      const v = (y - T_FAR) / (T_NEAR - T_FAR);
      const hw = T_RX * Math.sqrt(Math.max(0, 1 - v * v));
      xl = CX - hw;
      xr = CX + hw;
    }
    px(g, xl - 1, y, xr - xl + 2, 1, K);
    px(g, xl, y, xr - xl, 1, y % 3 === 0 ? '#1f5a36' : '#174a2c');
  }
  // The far rail (his side) and the curved padded rail on ours.
  px(g, CX - T_RX - 1, T_FAR - 2, T_RX * 2 + 2, 3, K);
  px(g, CX - T_RX, T_FAR - 1, T_RX * 2, 1, g8);
  for (let x = CX - T_RX; x <= CX + T_RX; x++) {
    const y = Math.round(nearEdge(x));
    px(g, x, y - 1, 1, 3, WOOD_L);
    px(g, x, y + 2, 1, 1, K);
    px(g, x, y - 1, 1, 1, G);
    px(g, x, y + 3, 1, 5, WOOD);
    px(g, x, y + 8, 1, 1, K);
  }
  // The lamp's light on the felt, a flat lighter step.
  light(g, CX, T_FAR + 8, 70, 7, 2, [10, 16, 6]);
  // The printed arc on the felt (BLACKJACK PAYS 3 TO 2's line), in gold.
  for (let x = CX - 60; x <= CX + 60; x++) {
    const v = (x - CX) / 60;
    px(g, x, Math.round(T_FAR + 6 + 8 * Math.sqrt(Math.max(0, 1 - v * v))), 1, 1, '#3a6a3a');
  }
  // His chip rack at the far edge, left of him (the ALL IN stacks come from here).
  box(g, CX - 46, T_FAR - 1, 28, 4, '#1a0e12');
  // HAND 1/3 as three brass markers on the near rail: lit for each hand he has left.
  for (let j = 0; j < 3; j++) {
    const x = CX - 14 + j * 14;
    const y = Math.round(nearEdge(x)) - 2;
    box(g, x - 2, y, 5, 3, j < handsLeft ? G : '#4a3a20');
    if (j < handsLeft) px(g, x - 1, y, 1, 1, Yl);
  }
}

/** A card lying on the felt (foreshortened), or flying (full face). */
function card(g: CanvasRenderingContext2D, x: number, y: number, lying: boolean, pip: string): void {
  if (lying) {
    box(g, x - 3, y - 1, 7, 3, T);
    px(g, x, y, 1, 1, pip);
  } else {
    box(g, x - 3, y - 4, 7, 9, T);
    px(g, x - 2, y - 3, 2, 1, pip);
    px(g, x, y, 2, 2, pip);
  }
}

/** His chips: a stack of `n`, a red, black or gold chip each. */
function stack(g: CanvasRenderingContext2D, x: number, y: number, n: number, c: string): void {
  for (let j = 0; j < n; j++) {
    px(g, x - 3, y - j * 2 - 1, 7, 1, K);
    px(g, x - 3, y - j * 2, 7, 2, c);
    px(g, x - 2, y - j * 2, 1, 1, T);
  }
}

// His reactions, read from the fight's state (no hook into the fight: the room watches what the HUD shows).
const dr = {
  hand: 1,
  charge: 0,
  turn: null as 'player' | 'enemy' | null,
  foe: 1,
  allIn: false,
  /** His cards on the felt this hand (each with its pip), and when each was dealt. */
  cards: [] as { pip: string; at: number }[],
  /** The BUST card flying at you, the sweep, the flinch, the eyeshade, the chips pushed in: start times (-1 off). */
  bust: -1,
  sweep: -1,
  sweptCards: [] as { pip: string; at: number }[],
  flinch: -1,
  visor: -1,
  pushed: -1,
  spent: -1,
  last: 0,
};
const PIPS = [R, K, R, K, R];

export function dealerRoomReset(): void {
  dr.hand = 1;
  dr.charge = 0;
  dr.turn = null;
  dr.foe = 1;
  dr.allIn = false;
  dr.cards = [];
  dr.bust = dr.sweep = dr.flinch = dr.visor = dr.pushed = dr.spent = -1;
}

function read(o: HighRollerScene, t: number): void {
  const st = o.dealer;
  // A new fight (time ran backwards, or a long gap): start clean.
  if (t < dr.last || t - dr.last > 5) dealerRoomReset();
  dr.last = t;
  if (!o.fight || !st) return;
  // His turn begins: he deals himself a card.
  if (o.turn === 'enemy' && dr.turn !== 'enemy' && dr.cards.length < 5) dr.cards.push({ pip: PIPS[dr.cards.length], at: t });
  dr.turn = o.turn ?? null;
  // His trick fired (its charge reset): a BUST flicked at you, or (armed) ALL IN spent: the chips slide at you.
  if (st.charge < dr.charge) {
    if (dr.allIn && !st.allIn) dr.spent = t;
    else dr.bust = t;
  }
  dr.charge = st.charge;
  if (st.allIn && !dr.allIn) dr.pushed = t;
  if (!st.allIn && dr.allIn && dr.spent < 0) dr.spent = t;
  dr.allIn = st.allIn;
  // A hand falls: his cards swept off, the eyeshade straightened.
  if (st.hand > dr.hand) {
    dr.sweptCards = dr.cards;
    dr.cards = [];
    dr.sweep = t;
    dr.visor = t + 0.4;
  }
  dr.hand = st.hand;
  // Hit: a flinch.
  const foe = o.foeHp ?? 1;
  if (foe < dr.foe - 0.001) dr.flinch = t;
  dr.foe = foe;
}

const ease = (v: number) => 1 - (1 - Math.min(1, Math.max(0, v))) ** 3;

/** THE DEALER's room: his table under the lamp, the man, his cards and chips. */
export function drawDealerRoom(ctx: CanvasRenderingContext2D, o: HighRollerScene): void {
  const t = o.time;
  read(o, t);
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const late = o.late ?? 0;
  // The lamp, swaying a pixel, its stepped light down over him and the felt.
  const sway = Math.round(Math.sin(t * 0.6));
  const lx = CX + sway;
  // Him (cut at the felt), with his frame: at you; sly on your spin; squinting a moment when hit.
  const hit = dr.flinch >= 0 && t - dr.flinch < 0.45;
  const frame = hit ? 2 : o.turn === 'player' ? 1 : 0;
  const jx = hit ? (Math.floor((t - dr.flinch) * 30) % 2 ? 1 : -1) : 0;
  const bob = Math.round(Math.sin(t * 1.4) * 0.6);
  const dx = CX - 17 + jx;
  const dy = T_FAR - 29 + bob;
  if (o.fight || late < 0.9) g.drawImage(dealerFrames()[frame], dx, dy);
  // Straightening his eyeshade after a hand falls (his right hand at the brim).
  if (dr.visor >= 0 && t > dr.visor && t - dr.visor < 0.9) {
    box(g, dx + 27, dy + 4, 4, 4, F);
    px(g, dx + 29, dy + 8, 3, 10, T);
  }
  drawFelt(g, Math.max(0, 4 - (o.dealer?.hand ?? 1)));
  // His chips: three stacks on the rack, or pushed into the middle when ALL IN is armed.
  const colors = [R, K, G];
  const push = dr.pushed >= 0 ? ease((t - dr.pushed) / 0.6) : 0;
  const spend = dr.spent >= 0 ? (t - dr.spent) / 0.7 : 2;
  colors.forEach((c, j) => {
    const hx = CX - 42 + j * 9;
    const hy = T_FAR + 1;
    if (dr.allIn) {
      const mx = CX - 8 + j * 8;
      const my = T_FAR + 13;
      stack(g, hx + (mx - hx) * push, hy + (my - hy) * push, 4 + j, c);
    } else if (spend < 1) {
      // ALL IN spent: the pile slides at you and off the felt's edge.
      stack(g, CX - 8 + j * 8, T_FAR + 13 + spend * 16, 4 + j, c);
    } else stack(g, hx, hy, 3 + (j % 2), c);
  });
  // His cards this hand, laid in a row on the felt in front of him (each slides in from his hand).
  dr.cards.forEach((c, j) => {
    const v = ease((t - c.at) / 0.35);
    const x = CX + 6 + (j - 2) * 9;
    card(g, CX + 12 + (x - CX - 12) * v, T_FAR + 2 + (8 - 2) * v, true, c.pip);
  });
  // A hand falls: the cards swept left off the felt.
  if (dr.sweep >= 0 && t - dr.sweep < 0.5)
    dr.sweptCards.forEach((c, j) => {
      const v = ease((t - dr.sweep) / 0.5);
      card(g, CX + 6 + (j - 2) * 9 - v * 120, T_FAR + 8 - v * 3, true, c.pip);
    });
  // BUST: a card flicked at you, spinning down out of the column (toward your machine).
  if (dr.bust >= 0 && t - dr.bust < 0.6) {
    const v = (t - dr.bust) / 0.6;
    card(g, CX + 14 - v * 70, T_FAR + 4 + v * 50 - Math.sin(v * Math.PI) * 18, Math.floor(v * 10) % 2 === 0, R);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(roomStills.get(late > 0.5) ?? buildDealerStill(late > 0.5), 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  // The lamp itself over everything (its shade in the open column, its bulb's lip lit).
  const lamp = lampShade();
  ctx.drawImage(lamp, (lx - 21) * 2, 12 * 2, lamp.width * 2, lamp.height * 2);
  if (late > 0) {
    ctx.fillStyle = `rgba(4,2,8,${0.35 * late})`;
    ctx.fillRect(0, 0, RW * 2, RH * 2);
  }
  ctx.restore();
}

let shade: HTMLCanvasElement | null = null;
/** His card-room lamp: a green glass shade with a gold rim, its bulb's light along the lip. */
function lampShade(): HTMLCanvasElement {
  if (shade) return shade;
  shade = outlined(40, 13, (c) => {
    px(c, 14, 0, 12, 3, Q);
    px(c, 6, 3, 28, 5, Q);
    px(c, 1, 8, 38, 2, Q);
    px(c, 14, 0, 12, 1, e);
    px(c, 6, 3, 28, 1, e);
    px(c, 9, 4, 3, 2, E);
    px(c, 1, 9, 38, 2, G);
    px(c, 7, 11, 26, 2, Yl);
    px(c, 17, 11, 6, 2, '#fffbe6');
  });
  return shade;
}
