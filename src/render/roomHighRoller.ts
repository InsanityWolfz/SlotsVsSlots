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
import { mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';

// ---- the projection (act 1's: roomStreet.ts) ----------------------------------------------------------------------

const CX = 320;
const HOR = 140;
const EYE = 250;
/** The room is wider than the street: the walls stand further out, the ceiling high. */
const WALL = 600;
const CEIL = 820;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

/** The room's back wall (where THE DEALER's table stands) at each station: far down the aisle, then nearer. */
const Z_FAR = [9, 6, 4.3, 3.1];
export const HR_STATIONS = Z_FAR.length;

/** Which station an act 3 fight sits at (as `streetStation`: the regulars spread over the four, the last one always
 * the last tables before his). */
export function hrStation(i: number, n: number): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(HR_STATIONS - 1, Math.round((i * (HR_STATIONS - 1)) / (n - 1))));
}

// The portraits' palette (tools/build-art.mjs) plus the room's darks.
const K = '#140c1c';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const Yl = '#ffe08a';
const T = '#f4eee0';
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

// ---- the stations -------------------------------------------------------------------------------------------------

type TableKind = 'blackjack' | 'baccarat' | 'craps' | 'poker';
interface Table {
  lat: number;
  /** The near edge's depth, and how deep the table is. */
  z: number;
  dz: number;
  w: number;
  kind: TableKind;
  /** Seats taken: near side (backs to us) and far side (facing us), by slot. */
  near: number[];
  far: number[];
}
interface Station {
  tables: Table[];
  /** Chandeliers (lateral, depth). */
  chandeliers: [number, number][];
  /** The velvet rope along the aisle (station 0: the way in). */
  rope?: boolean;
  /** HIGH LIMIT, hanging over the aisle. */
  sign?: boolean;
}

const STATIONS: Station[] = [
  // (a) The way in: velvet ropes along the aisle, HIGH LIMIT over it, the first tables; his lamp far down the room.
  {
    rope: true,
    sign: true,
    chandeliers: [[0, 4.6], [0, 7.2]],
    tables: [
      { lat: -430, z: 2.6, dz: 0.5, w: 260, kind: 'baccarat', near: [], far: [0, 2] },
      { lat: 430, z: 2.9, dz: 0.5, w: 260, kind: 'blackjack', near: [1], far: [1] },
      { lat: -420, z: 4.6, dz: 0.5, w: 240, kind: 'poker', near: [], far: [0, 1, 2] },
      { lat: 420, z: 5.0, dz: 0.5, w: 240, kind: 'craps', near: [0], far: [1, 2] },
    ],
  },
  // (b) Between the card and craps tables, people playing on both sides.
  {
    chandeliers: [[0, 2.8], [0, 4.8]],
    tables: [
      { lat: -440, z: 1.25, dz: 0.45, w: 300, kind: 'baccarat', near: [0, 2], far: [1] },
      { lat: 450, z: 1.3, dz: 0.45, w: 300, kind: 'craps', near: [1], far: [0, 1, 2] },
      { lat: -420, z: 2.6, dz: 0.45, w: 260, kind: 'blackjack', near: [1], far: [0, 2] },
      { lat: 420, z: 2.9, dz: 0.45, w: 260, kind: 'poker', near: [0, 2], far: [1] },
    ],
  },
  // (c) Deeper in: blackjack and poker, the room quieter, a chandelier right overhead.
  {
    chandeliers: [[0, 2.2], [0, 3.6]],
    tables: [
      { lat: -450, z: 1.2, dz: 0.45, w: 300, kind: 'poker', near: [1], far: [0, 1, 2] },
      { lat: 440, z: 1.3, dz: 0.45, w: 300, kind: 'blackjack', near: [0, 2], far: [1] },
      { lat: -420, z: 2.4, dz: 0.4, w: 260, kind: 'craps', near: [], far: [0, 2] },
      { lat: 430, z: 2.7, dz: 0.4, w: 260, kind: 'baccarat', near: [1], far: [2] },
    ],
  },
  // (d) The last tables before his, empty seats now; his table big at the aisle's end.
  {
    chandeliers: [[0, 2.0]],
    tables: [
      { lat: -460, z: 1.2, dz: 0.45, w: 300, kind: 'blackjack', near: [], far: [1] },
      { lat: 460, z: 1.25, dz: 0.45, w: 300, kind: 'baccarat', near: [2], far: [] },
    ],
  },
];

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
const hash = (a: number, b: number) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
const SUITS = ['#2a2238', '#332c40', '#1f2a44', '#3a1428', '#22302a', '#33261a'];
const SKINS = [F, f, '#a8704c', '#7a4a30'];
const HAIR = [K, '#5a311c', l, '#c8bddb', '#2a1a10'];
const FELT: Record<TableKind, [string, string]> = {
  blackjack: ['#174a2c', '#1f5a36'],
  baccarat: ['#1d2f5a', '#253a6a'],
  craps: ['#1a4a30', '#225a3a'],
  poker: ['#3a1424', '#4a1a2e'],
};

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
    // The cove's warm strip along each wall's top (dimmer when it's late).
    if (late < 0.5) {
      px(g, wl, y, Math.max(1, 18 / z), 1, '#3a2214');
      px(g, wr - Math.max(1, 18 / z), y, Math.max(1, 18 / z), 1, '#3a2214');
    }
  }
}

/** One side wall, column by column: wood wainscot, velvet panels framed in brass, a sconce in each, the cornice. */
function drawWall(g: CanvasRenderingContext2D, side: -1 | 1, zFar: number, late: number): void {
  const xEnd = Math.round(xAt(side * WALL, zFar));
  const cols = side < 0 ? [0, xEnd] : [xEnd, RW];
  let prevZ = 0;
  for (let x = cols[0]; x < cols[1]; x++) {
    const z = WALL / Math.abs(x + 0.5 - CX);
    if (z > zFar) continue;
    const top = Math.max(0, yAt(CEIL, z));
    const ground = yAt(0, z);
    px(g, x, top, 1, ground - top, '#1c1020');
    // Velvet between 140 and 600; the wainscot below, the cornice above.
    px(g, x, yAt(600, z), 1, (460) / z, VELVET);
    for (let h = 160; h < 600; h += 60) px(g, x, yAt(h, z), 1, 1, VELVET_D);
    px(g, x, yAt(140, z), 1, 140 / z, WOOD);
    px(g, x, yAt(140, z), 1, Math.max(1, 6 / z), G);
    px(g, x, yAt(70, z), 1, 1, WOOD_L);
    px(g, x, yAt(640, z), 1, Math.max(1, 40 / z), g8);
    px(g, x, yAt(640, z), 1, 1, G);
    // Brass frames: a pilaster every 0.6 of depth.
    if (Math.floor(z / 0.6) !== Math.floor(prevZ / 0.6)) {
      px(g, x, yAt(600, z), 1, 460 / z, '#5a3a1a');
    }
    prevZ = z;
  }
  // The sconces, one per panel, and their light on the velvet (off when it's late).
  for (let z = 0.6 * Math.ceil(WALL / 320 / 0.6) + 0.3; z < zFar; z += 0.6) {
    const x = xAt(side * WALL, z);
    const y = yAt(420, z);
    const s = 1 / z;
    const on = hash(Math.round(z * 10), side) >= late * 0.85;
    if (on) pool(g, x, y + 10 * s, 30 * s, 50 * s, '#f0a040', 0.16);
    box(g, x - 4 * s, y, 8 * s, 18 * s, g8);
    px(g, x - 3 * s, y - 10 * s, 6 * s, 10 * s, on ? Yl : '#5a3a1a');
  }
}

/** The carpet, row by row: deep red with a gold lattice, a darker runner down the aisle. */
function drawFloor(g: CanvasRenderingContext2D, zFar: number): void {
  for (let y = Math.ceil(yAt(0, zFar)); y < RH; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    const wl = xAt(-WALL, z);
    const wr = xAt(WALL, z);
    px(g, wl, y, wr - wl, 1, CARPET);
    // The aisle's runner, gold-edged.
    const al = xAt(-150, z);
    const ar = xAt(150, z);
    px(g, al, y, ar - al, 1, CARPET_D);
    px(g, al, y, Math.max(1, 6 / z), 1, g8);
    px(g, ar - Math.max(1, 6 / z), y, Math.max(1, 6 / z), 1, g8);
    // The lattice: a dot every 80 across, every 0.3 of depth.
    if (Math.floor(z / 0.3) !== Math.floor(zn / 0.3))
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
    const fold = Math.floor((lat + 2000) / 40) % 3;
    px(g, x, yAt(700, zFar), 1, yBot - yAt(700, zFar), fold === 0 ? '#36122a' : fold === 1 ? VELVET : VELVET_D);
  }
  px(g, x0, yAt(760, zFar), x1 - x0, 60 / zFar, g8);
  px(g, x0, yAt(760, zFar), x1 - x0, 1, G);
  px(g, x0, yAt(140, zFar), x1 - x0, 140 / zFar, WOOD);
  px(g, x0, yAt(140, zFar), x1 - x0, Math.max(1, 6 / zFar), G);
}

/** A table: its seated players behind it, the felt top in perspective, the rail, the apron and pedestal, the players in
 * front. `late`: nobody there, chairs up on the felt. */
function drawTable(g: CanvasRenderingContext2D, tb: Table, late: number, seedBase: number): void {
  const H = tb.kind === 'craps' ? 120 : 110;
  const zN = tb.z;
  const zF = tb.z + tb.dz;
  const [felt, feltL] = FELT[tb.kind];
  const empty = late > 0.5;
  // The far side's players, facing us (their laps hidden by the felt).
  if (!empty) for (const slot of tb.far) person(g, tb.lat + (slot - 1) * (tb.w / 3.2), zF + 0.12, H, true, seedBase + slot);
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
      px(g, cx - 9 * s, ym - 32 * s, 2, 28 * s, WOOD);
      px(g, cx + 7 * s, ym - 32 * s, 2, 28 * s, WOOD);
    }
  } else if (tb.kind === 'craps') {
    px(g, xc - tb.w * s * 0.35, ym, tb.w * s * 0.7, 1, T);
    px(g, xc + tb.w * s * 0.2, ym - 2 * s, Math.max(1, 6 * s), Math.max(1, 6 * s), T);
  } else {
    for (let i = 0; i < 3; i++) {
      const cx = xc + (i - 1) * tb.w * s * 0.28;
      px(g, cx - 5 * s, ym, Math.max(1, 9 * s), Math.max(1, 4 * s), T);
      if (s > 0.5) px(g, cx - 1 * s, ym, 1, 1, i % 2 ? R : K);
      px(g, cx + 6 * s, ym - 2 * s, Math.max(1, 6 * s), Math.max(1, 4 * s), i === 1 ? R : i ? '#3474e0' : G);
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
  // The near side's players, backs to us.
  if (!empty) for (const slot of tb.near) person(g, tb.lat + (slot - 1) * (tb.w / 3.2), zN - 0.08, H, false, seedBase + 10 + slot);
}

/** A seated player at the portraits' scale: a stool, shoulders, a head; facing us (a face) or not (hair). */
function person(g: CanvasRenderingContext2D, lat: number, z: number, tableH: number, facing: boolean, seed: number): void {
  const s = 1 / z;
  const yS = yAt(tableH + 96, z);
  const yB = yAt(facing ? tableH - 10 : 72, z);
  if (!facing) {
    // The stool under them: a brass post, a red seat.
    px(g, xAt(lat, z) - 2 * s, yB, Math.max(1, 5 * s), yAt(0, z) - yB, g8);
    box(g, xAt(lat, z) - 16 * s, yB - 2, 32 * s, Math.max(2, 6 * s), r);
  }
  figure(g, xAt(lat, z), yS, yB, s, facing, seed);
}

/** A seated figure (shoulders at `yS`, cut at `yB`, scale `s`): sloped shoulders tapering to the waist, a neck, a
 * rounded head, all inside the portraits' 1px outline. Facing: a face, a shirt front and tie; else hair and a collar. */
function figure(g: CanvasRenderingContext2D, x: number, yS: number, yB: number, s: number, facing: boolean, seed: number): void {
  const suit = SUITS[Math.floor(hash(seed, 3) * SUITS.length)];
  const skin = SKINS[Math.floor(hash(seed, 5) * SKINS.length)];
  const hair = HAIR[Math.floor(hash(seed, 7) * HAIR.length)];
  const rows: [number, number, number, string][] = [];
  const Y0 = Math.round(yS);
  const Y1 = Math.round(yB);
  const slope = Math.max(1, Math.round(5 * s));
  for (let y = Y0; y < Y1; y++) {
    const u = (y - Y0) / Math.max(1, Y1 - Y0);
    const w = y - Y0 < slope ? 30 * s + (18 * s * (y - Y0)) / slope : 48 * s - 6 * s * u;
    rows.push([y, x - w / 2, w, suit]);
  }
  const hw = Math.max(2, 22 * s);
  const hh = Math.max(3, 28 * s);
  const hy = Math.round(yS - 4 * s - hh);
  const neck = Math.max(1, Math.round(4 * s));
  for (let y = Y0 - neck; y < Y0; y++) rows.push([y, x - 5 * s, Math.max(1, 10 * s), facing ? skin : hair]);
  for (let y = hy; y < hy + hh; y++) {
    const cut = y === hy || y === Math.round(hy + hh - 1) ? Math.max(1, 2 * s) : 0;
    rows.push([y, x - hw / 2 + cut, hw - cut * 2, facing ? skin : hair]);
  }
  // The outline first (each row widened by a pixel, and the rows above and below it), then the fill.
  for (const [y, x0, w] of rows) px(g, x0 - 1, y - 1, w + 2, 3, K);
  for (const [y, x0, w, c] of rows) px(g, x0, y, w, 1, c);
  if (facing) {
    // Hair over the brow, the eyes once they'd show, a shirt front and a tie, hands on the felt's edge.
    px(g, x - hw / 2, hy, hw, Math.max(1, hh * 0.3), hair);
    if (s > 0.45) {
      px(g, x - 5 * s, hy + hh * 0.5, Math.max(1, 2 * s), Math.max(1, 2 * s), K);
      px(g, x + 3 * s, hy + hh * 0.5, Math.max(1, 2 * s), Math.max(1, 2 * s), K);
    }
    if (s > 0.3) {
      px(g, x - 5 * s, Y0, Math.max(1, 10 * s), Math.max(1, 26 * s), T);
      px(g, x - 1 * s, Y0 + 2 * s, Math.max(1, 3 * s), Math.max(1, 18 * s), hash(seed, 9) > 0.5 ? R : K);
      px(g, x - 22 * s, Y1 - Math.max(2, 5 * s), Math.max(2, 8 * s), Math.max(2, 5 * s), skin);
      px(g, x + 14 * s, Y1 - Math.max(2, 5 * s), Math.max(2, 8 * s), Math.max(2, 5 * s), skin);
    }
  } else if (s > 0.3) {
    // The back of a jacket: a white collar, a seam.
    px(g, x - 6 * s, Y0, Math.max(2, 12 * s), Math.max(1, 3 * s), T);
    px(g, x, Y0 + 4 * s, 1, Math.max(1, (Y1 - Y0) * 0.6), '#1a1426');
  }
}

/** A chandelier hung over the aisle: a chain, gold tiers, candle bulbs (their glints are live). */
function chandelier(g: CanvasRenderingContext2D, lat: number, z: number, late: number): void {
  const s = 1 / z;
  const x = xAt(lat, z);
  const yc = Math.max(0, yAt(CEIL, z));
  const yb = yAt(640, z);
  px(g, x, yc, 1, yb - yc, g8);
  if (late < 0.5) pool(g, x, yb + 30 * s, 120 * s, 60 * s, '#f0b050', 0.22);
  box(g, x - 60 * s, yb, 120 * s, 10 * s, G);
  box(g, x - 40 * s, yb + 14 * s, 80 * s, 8 * s, G);
  px(g, x - 2 * s, yb + 24 * s, Math.max(1, 4 * s), 16 * s, g8);
  for (let i = -3; i <= 3; i++) px(g, x + i * 18 * s, yb - 8 * s, Math.max(1, 3 * s), Math.max(1, 8 * s), late < 0.5 ? Yl : '#5a3a1a');
  for (let i = -2; i <= 2; i++) px(g, x + i * 16 * s, yb + 22 * s, Math.max(1, 2 * s), Math.max(1, 6 * s), late < 0.5 ? T : l);
}

/** THE DEALER's table at the aisle's end, under his hanging lamp, the man himself behind it (small, far off). */
function distantDealer(g: CanvasRenderingContext2D, zFar: number, late: number): void {
  const z = zFar - 0.5;
  const s = 1 / z;
  const x = xAt(0, z);
  // The lamp: a cord, a green shade with a gold rim, and its stepped light on the table.
  const yc = Math.max(0, yAt(CEIL, z));
  const yl = yAt(470, z);
  px(g, x, yc, 1, yl - yc, K);
  pool(g, x, yAt(112, z), 160 * s, 50 * s, '#ffe08a', late < 0.9 ? 0.35 : 0.12);
  box(g, x - 40 * s, yl, 80 * s, 22 * s, Q);
  px(g, x - 40 * s, yl + 20 * s, 80 * s, Math.max(1, 3 * s), G);
  px(g, x - 30 * s, yl + 22 * s, 60 * s, Math.max(1, 3 * s), Yl);
  // Him: the eyeshade, a face, a white shirt, a dark vest, a red bow tie.
  if (late < 0.9) {
    // Standing behind his table: the seated players' figure, a little taller, his green eyeshade over the brow.
    const yS = yAt(212, z);
    figure(g, x, yS, yAt(112, z), s, true, 4);
    const hy = Math.round(yS - 4 * s - Math.max(3, 28 * s));
    px(g, x - 15 * s, hy, 30 * s, Math.max(1, 4 * s), e);
    px(g, x - 15 * s, hy + Math.max(1, 4 * s), 30 * s, Math.max(1, 2 * s), q);
  }
  // The semicircle table (felt toward us), his rail of chips.
  const tb: Table = { lat: 0, z: z - 0.35, dz: 0.3, w: 300, kind: 'blackjack', near: [], far: [] };
  drawTable(g, tb, Math.min(late, 0.4), 99);
}

const stills = new Map<string, HTMLCanvasElement>();
function still(i: number, late: number): HTMLCanvasElement {
  const key = `${i}:${late.toFixed(2)}`;
  const c = stills.get(key);
  if (c) return c;
  const [cv, g] = mk(RW, RH);
  const st = STATIONS[i];
  const zFar = Z_FAR[i];
  px(g, 0, 0, RW, RH, '#0e0812');
  drawCeiling(g, zFar, late);
  drawBackWall(g, zFar);
  drawFloor(g, zFar);
  drawWall(g, -1, zFar, late);
  drawWall(g, 1, zFar, late);
  distantDealer(g, zFar, late);
  // Far to near: chandeliers and tables by depth.
  const things: { z: number; draw: () => void }[] = [];
  st.chandeliers.forEach(([lat, z]) => z < zFar && things.push({ z, draw: () => chandelier(g, lat, z, late) }));
  st.tables.forEach((tb, j) => tb.z < zFar - 0.6 && things.push({ z: tb.z, draw: () => drawTable(g, tb, late, i * 40 + j * 7) }));
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
            // The rope sags to the next post.
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
    // HIGH LIMIT, hanging over the aisle on two chains.
    const z = 3;
    const s = 1 / z;
    const x = xAt(0, z);
    const y = yAt(560, z);
    px(g, x - 40 * s, Math.max(0, yAt(CEIL, z)), 1, y - Math.max(0, yAt(CEIL, z)), g8);
    px(g, x + 40 * s, Math.max(0, yAt(CEIL, z)), 1, y - Math.max(0, yAt(CEIL, z)), g8);
    box(g, x - 130 * s, y, 260 * s, 60 * s, d);
    px(g, x - 130 * s, y, 260 * s, 1, G);
    px(g, x - 130 * s, y + 60 * s - 1, 260 * s, 1, G);
  }
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
  const st = STATIONS[i];
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
  const tb = st.tables.find((x) => x.z > 2 && x.z < zFar - 0.6);
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
  if (st.sign) {
    const z = 3;
    const y = yAt(560, z) + 60 / z / 2;
    drawText(g, 'HIGH LIMIT', CX, y, 1, Math.floor(t * 1.5) % 6 === 0 ? Yl : G, { outline: K });
  }
  // His lamp breathes a little.
  const zd = zFar - 0.5;
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

let roomStill: HTMLCanvasElement | null = null;
function buildDealerStill(): HTMLCanvasElement {
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
    pool(g, x, 66, 34, 52, '#f0a040', 0.22);
    box(g, x - 4, 62, 8, 20, g8);
    px(g, x - 3, 50, 6, 12, Yl);
    px(g, x - 2, 51, 2, 6, '#fffbe6');
  }
  for (const [x, flip] of [[40, false], [600, true]] as const) {
    // A neighbouring table's end, players at it (dim, backs to us).
    box(g, x - 52, 236, 104, 10, WOOD_L);
    px(g, x - 50, 236, 100, 4, flip ? FELT.baccarat[0] : FELT.poker[0]);
    box(g, x - 50, 246, 100, 18, WOOD);
    px(g, x - 50, 246, 100, 1, G);
    for (const dx of [-30, 18]) {
      const sx = x + (flip ? -dx : dx);
      figure(g, sx, 214, 238, 0.55, false, sx);
    }
  }
  // The lamp's cord from the ceiling.
  px(g, CX, 0, 1, 12, K);
  // Under his table: its pedestal, in shadow down to the floor (THE DEALER's BOSS tag sits on it).
  px(g, CX - 40, T_NEAR + 3, 80, FLOOR - T_NEAR - 3, '#160a12');
  box(g, CX - 18, T_NEAR + 10, 36, FLOOR - T_NEAR - 10, '#1a0e12');
  pool(g, CX, FLOOR + 4, 70, 6, K, 0.6);
  roomStill = cv;
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
  pool(g, lx, T_FAR + 8, 84, 14, '#ffe08a', late < 0.9 ? 0.3 : 0.1);
  pool(g, lx, T_FAR - 24, 34, 34, '#ffe08a', late < 0.9 ? 0.12 : 0.05);
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
  ctx.drawImage(roomStill ?? buildDealerStill(), 0, 0, RW * 2, RH * 2);
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
