/**
 * ACT 1, THE STREET (rooms v2; the user, 2026-11-09: "you're cruising down the street toward the casino", past a bar,
 * an alley, the shady characters, no crowd; every fight a step closer to the act's boss, who is in view from the
 * first fight). Four stations down one street, chosen by how far into the act this fight is (`streetStation`), then
 * THE DOORMAN's casino entrance (roomEntrance.ts) at its end.
 *
 * The technique: each station is its own composed scene in one-point perspective, all at the same eye level and
 * vanishing point (the open column between the HUDs), drawn per column on the entrance's 640x360 grid (2 screen pixels
 * an art pixel, the portraits' palette and 1px outline, no gradients). The walls, sidewalks and road are computed from
 * one projection, so the street's lines meet in one point; the casino stands across the street's end, and each station
 * moves that end nearer (smaller depth), so its lit front grows from a glow far away to its marquee filling the column.
 * Flat things facing us (blade signs, the steam) are outlined sprites at their depth. Behind the reels it stays dark.
 * ENDLESS hook: `late` (0 early, 1 closing) switches lights off and darkens; nothing draws it yet.
 */
import { bulb, DOORMAN, DOORMAN_EYES, DOORMAN_INK, mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';

// ---- the projection ---------------------------------------------------------------------------------------------

/** The vanishing point (the open column) and eye level, in grid pixels. */
const CX = 320;
const HOR = 140;
/** Eye height, the walls' and the curbs' distance from the street's middle (world units: eye height 250 = 1.6 m). */
const EYE = 250;
const WALL = 340;
const CURB = 268;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

/** Our street ends in a T (the user: the casino can't stand in the middle of the road). At each station, the depth
 * where our street's buildings end (the corner); the cross street runs left to right beyond it, and the casino faces
 * it from the far side, set back behind its forecourt. Nearer each fight; the last station is at the corner. */
const Z_END = [7.0, 4.6, 3.1, 1.9];
export const STREET_STATIONS = Z_END.length;
/** The T beyond the corner, in depth: the near sidewalk round the corners, the cross street's road, its far sidewalk,
 * then the casino's forecourt (the carpet, rope posts and steps) up to its front. */
const T_NEAR = 0.35;
const T_ROAD = 1.3;
const T_FAR = 0.35;
const T_FORE = 0.6;
const zRoad0 = (zEnd: number) => zEnd + T_NEAR;
const zRoad1 = (zEnd: number) => zEnd + T_NEAR + T_ROAD;
const zFront = (zEnd: number) => zEnd + T_NEAR + T_ROAD + T_FAR;
const zCasino = (zEnd: number) => zFront(zEnd) + T_FORE;
/** The carpet's and the forecourt's half widths (the carpet runs from the steps to the cross street's far kerb, as in
 * the entrance room). */
const CARPET = 50;
const FORE_W = 230;

// The portraits' palette (as roomEntrance.ts) plus the street's darks.
const K = '#140c1c';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const Yl = '#ffe08a';
const T = '#f4eee0';
const R = '#e8374b';
const r = '#8e1f3a';
const d = '#561530';
const k = '#3b3347';
const l = '#6d6482';
const B = '#7cc4ff';
const SKY = ['#0d0519', '#140a24', '#1d0f30', '#241338'];
const PAVE = '#17122a';
const PAVE_L = '#221b38';
const ROAD = '#100c1a';

// ---- the stations -----------------------------------------------------------------------------------------------

type FeatKind = 'window' | 'door' | 'shop' | 'shutter' | 'gap' | 'garage' | 'billboard';
interface Feat {
  z0: number;
  z1: number;
  h0: number;
  h1: number;
  kind: FeatKind;
  /** The glass's light (a window lit from inside), or null for a dark one. */
  lit?: string | null;
}
interface Bldg {
  z0: number;
  z1: number;
  roof: number;
  wall: string;
  joint: string;
  /** Brick courses (true) or rendered stucco (false). */
  brick: boolean;
  feats: Feat[];
}
interface Station {
  left: Bldg[];
  right: Bldg[];
}

/** Upper-floor windows down a building, every `step` of depth (dark or lit, fixed by position). */
function uppers(z0: number, z1: number, step: number, h0: number, h1: number, seed: number): Feat[] {
  const out: Feat[] = [];
  for (let z = z0 + step * 0.3, i = 0; z + step * 0.55 < z1; z += step, i++) {
    const on = ((i + seed) * 7) % 5 < 2;
    out.push({ z0: z, z1: z + step * 0.5, h0, h1, kind: 'window', lit: on ? (i % 2 ? '#a8642a' : '#8a5428') : null });
  }
  return out;
}

const STATIONS: Station[] = [
  // (a) A side street by a dive bar (THE BARFLY's turf); the casino a glow far down the street.
  {
    left: [
      { z0: 0.5, z1: 1.75, roof: 560, wall: '#2a1a2a', joint: '#221420', brick: true, feats: [
        { z0: 1.04, z1: 1.27, h0: 80, h1: 300, kind: 'shop', lit: '#e8a860' },
        { z0: 1.33, z1: 1.47, h0: 0, h1: 330, kind: 'door', lit: '#c97a38' },
        ...uppers(1.5, 1.75, 0.2, 420, 520, 1),
      ] },
      { z0: 1.75, z1: 4.5, roof: 760, wall: '#1e1830', joint: '#18132a', brick: true, feats: uppers(1.8, 4.5, 0.32, 380, 520, 2) },
      { z0: 4.5, z1: 20, roof: 640, wall: '#211a34', joint: '#1a1428', brick: false, feats: uppers(4.6, 20, 0.6, 360, 480, 3) },
    ],
    right: [
      { z0: 0.5, z1: 2.3, roof: 820, wall: '#241c36', joint: '#1c162c', brick: true, feats: [
        { z0: 1.06, z1: 1.2, h0: 150, h1: 330, kind: 'window', lit: null },
        { z0: 1.3, z1: 1.42, h0: 0, h1: 320, kind: 'door', lit: null },
        ...uppers(1.5, 2.3, 0.22, 400, 520, 4),
      ] },
      { z0: 2.3, z1: 20, roof: 700, wall: '#1d1730', joint: '#171227', brick: false, feats: uppers(2.4, 20, 0.45, 360, 480, 5) },
    ],
  },
  // (b) An alley's mouth (the thieves' corner), fire escapes overhead; a pawn shop across the way.
  {
    left: [
      { z0: 0.5, z1: 1.22, roof: 900, wall: '#2b2238', joint: '#221a2e', brick: true, feats: [
        { z0: 1.03, z1: 1.16, h0: 140, h1: 320, kind: 'window', lit: null },
      ] },
      { z0: 1.22, z1: 1.62, roof: 0, wall: '#0a0710', joint: '#0a0710', brick: false, feats: [{ z0: 1.22, z1: 1.62, h0: 0, h1: 2000, kind: 'gap' }] },
      { z0: 1.62, z1: 20, roof: 720, wall: '#1f1830', joint: '#191328', brick: true, feats: uppers(1.7, 20, 0.4, 360, 500, 6) },
    ],
    right: [
      { z0: 0.5, z1: 1.9, roof: 600, wall: '#2a1e22', joint: '#22181c', brick: true, feats: [
        { z0: 1.04, z1: 1.36, h0: 70, h1: 290, kind: 'shop', lit: '#d9b060' },
        { z0: 1.4, z1: 1.62, h0: 0, h1: 320, kind: 'shutter' },
        ...uppers(1.66, 1.9, 0.2, 420, 520, 7),
      ] },
      { z0: 1.9, z1: 20, roof: 760, wall: '#1e1830', joint: '#18132a', brick: false, feats: uppers(2.0, 20, 0.42, 380, 500, 8) },
    ],
  },
  // (c) A cold corner: a bus stop, steam off a grate in the road, the shops shut for the night.
  {
    left: [
      { z0: 0.5, z1: 2.0, roof: 640, wall: '#1f2232', joint: '#191b2a', brick: false, feats: [
        { z0: 1.05, z1: 1.45, h0: 60, h1: 300, kind: 'shop', lit: '#5a8ab0' },
        { z0: 1.5, z1: 1.64, h0: 0, h1: 320, kind: 'door', lit: null },
        ...uppers(1.68, 2.0, 0.2, 400, 520, 9),
      ] },
      { z0: 2.0, z1: 20, roof: 800, wall: '#1c1830', joint: '#161227', brick: true, feats: uppers(2.1, 20, 0.38, 380, 520, 10) },
    ],
    right: [
      { z0: 0.5, z1: 1.6, roof: 700, wall: '#262036', joint: '#1e192c', brick: true, feats: [
        { z0: 1.05, z1: 1.38, h0: 70, h1: 290, kind: 'shutter' },
        ...uppers(1.42, 1.6, 0.18, 400, 520, 11),
      ] },
      { z0: 1.6, z1: 20, roof: 640, wall: '#1e1830', joint: '#18132a', brick: false, feats: uppers(1.7, 20, 0.4, 360, 480, 12) },
    ],
  },
  // (d) The block before the casino: a valet garage, the casino's billboard; its marquee big down the street now.
  {
    left: [
      { z0: 0.5, z1: 1.9, roof: 700, wall: '#2a2034', joint: '#22192c', brick: false, feats: [
        { z0: 1.05, z1: 1.5, h0: 0, h1: 300, kind: 'garage' },
        ...uppers(1.55, 1.9, 0.18, 420, 540, 13),
      ] },
      { z0: 1.9, z1: 20, roof: 820, wall: '#241a30', joint: '#1d1528', brick: true, feats: uppers(2.0, 20, 0.34, 380, 520, 14) },
    ],
    right: [
      { z0: 0.5, z1: 2.1, roof: 760, wall: '#2a1e30', joint: '#22172a', brick: true, feats: [
        { z0: 1.05, z1: 1.55, h0: 110, h1: 330, kind: 'billboard' },
        ...uppers(1.6, 2.1, 0.2, 420, 540, 15),
      ] },
      { z0: 2.1, z1: 20, roof: 700, wall: '#221a32', joint: '#1b1429', brick: false, feats: uppers(2.2, 20, 0.4, 380, 500, 16) },
    ],
  },
];

/** Which station an act 1 fight sits at: the act's regular fights spread over the four, the last one always the
 * block before the casino (`i` this fight's index among the act's regulars, `n` how many there are). */
export function streetStation(i: number, n: number): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(STREET_STATIONS - 1, Math.round((i * (STREET_STATIONS - 1)) / (n - 1))));
}

// ---- the still layer: sky, walls, sidewalks, road, the casino down the street --------------------------------------

/** A fixed per-position coin flip (for lights the ENDLESS hook turns off). */
const hash = (a: number, b: number) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;

function drawSky(g: CanvasRenderingContext2D, late: number): void {
  SKY.forEach((c, i) => px(g, 0, i * 22, RW, 22, c));
  px(g, 0, SKY.length * 22, RW, RH, SKY[SKY.length - 1]);
  for (let i = 0; i < 40; i++) px(g, (i * 157) % RW, (i * 61) % 80, 1, 1, late > 0.5 ? '#6d6482' : '#9a8fb0');
  // The casino's glow over the rooftops, in hard steps (a warm band low in the sky).
  for (const [y, c] of [[HOR - 70, '#2a1430'], [HOR - 46, '#341838'], [HOR - 26, '#3e1c3a']] as const) px(g, 0, y, RW, HOR + 40 - y, c);
}

/** One side's walls, column by column (`side` -1 left, 1 right), out to the street's end. */
function drawWalls(g: CanvasRenderingContext2D, st: Station, side: -1 | 1, zEnd: number, late: number): void {
  const bldgs = side < 0 ? st.left : st.right;
  const xEnd = Math.round(xAt(side * WALL, zEnd));
  const cols = side < 0 ? [0, xEnd] : [xEnd, RW];
  let prevB: Bldg | null = null;
  let prevZ = 0;
  for (let x = cols[0]; x < cols[1]; x++) {
    const z = WALL / Math.abs(x + 0.5 - CX);
    if (z > zEnd) continue;
    const b = bldgs.find((bb) => z >= bb.z0 && z < bb.z1);
    if (!b) continue;
    const gap = b.feats.find((f) => f.kind === 'gap');
    const yGround = yAt(0, z);
    if (gap) {
      // An alley: dark between the walls, its far wall a shade lighter, wet ground.
      const zBack = z + 1.6;
      px(g, x, 0, 1, yAt(0, zBack), '#120e1c');
      px(g, x, yAt(0, zBack), 1, yGround - yAt(0, zBack), '#0c0914');
      prevB = b;
      prevZ = z;
      continue;
    }
    const top = Math.max(0, yAt(b.roof, z));
    px(g, x, top, 1, yGround - top, b.wall);
    // Brick courses (every 36 world units), or stucco bands; a joint where a column crosses a 0.06 depth step.
    for (let h = 36; h < b.roof; h += b.brick ? 36 : 120) px(g, x, yAt(h, z), 1, 1, b.joint);
    if (b.brick && Math.floor(z / 0.06) !== Math.floor(prevZ / 0.06)) for (let h = 0; h < b.roof; h += 72) px(g, x, yAt(h + 36, z), 1, Math.max(1, 36 / z), b.joint);
    // The cornice and a base course.
    px(g, x, top, 1, Math.max(2, 10 / z), '#3a2d52');
    px(g, x, top, 1, 1, '#4a3d62');
    px(g, x, yAt(40, z), 1, Math.max(1, 40 / z), '#1a1426');
    // A building's corner: a dark seam where one building meets the next.
    if (prevB && prevB !== b) px(g, x, top, 1, yGround - top, K);
    for (const f of b.feats) {
      if (z < f.z0 || z >= f.z1) continue;
      const y0 = yAt(f.h1, z);
      const y1 = yAt(f.h0, z);
      const edge = Math.floor((z - f.z0) * 200) === 0 || Math.floor((f.z1 - z) * 200) === 0 || (prevZ && (prevZ < f.z0) !== (z < f.z0));
      const on = f.lit && hash(Math.round(f.z0 * 100), side) >= late * 0.9 ? f.lit : null;
      if (f.kind === 'window') {
        px(g, x, y0 - 1, 1, y1 - y0 + 2, K);
        px(g, x, y0, 1, y1 - y0, on ?? '#14101e');
        // blinds: a lit window's slats
        if (on) for (let h = f.h0 + 30; h < f.h1; h += 30) px(g, x, yAt(h, z), 1, 1, '#9a5a30');
        px(g, x, y1, 1, Math.max(1, 8 / z), '#4a3d62');
      } else if (f.kind === 'shop') {
        // A shop's front: a sign band, then dark glass with the room inside: a lamp line along the top, mullions, the
        // shelves' silhouettes low down. Lit means a warm (or cold) band, never a bright slab: it sits behind the HUD.
        const band = Math.max(3, 40 / z);
        px(g, x, y0 - band, 1, band, d);
        px(g, x, y0 - band, 1, 1, r);
        px(g, x, y0 - 1, 1, y1 - y0 + 2, K);
        const glass = on === '#5a8ab0' ? '#16202e' : on ? '#2e1a16' : '#18121e';
        px(g, x, y0, 1, y1 - y0, glass);
        if (on) {
          const lamp = on === '#5a8ab0' ? '#3a5a78' : '#7a4a24';
          px(g, x, y0 + 1, 1, Math.max(2, (y1 - y0) / 7), lamp);
          // a shelf's lit edge; the bar's (amber) has a bottle every third column standing on it
          const shelf = y1 - Math.max(4, (y1 - y0) * 0.22);
          px(g, x, shelf, 1, 1, lamp);
          if (on === '#e8a860' && Math.floor(z * 90) % 3 === 0) px(g, x, shelf - Math.max(2, (y1 - y0) * 0.09), 1, Math.max(2, (y1 - y0) * 0.09), Math.floor(z * 30) % 2 ? lamp : '#3a5a3a');
        }
        if (Math.floor(z / 0.09) !== Math.floor(prevZ / 0.09)) px(g, x, y0, 1, y1 - y0, K);
        px(g, x, y1, 1, Math.max(2, 14 / z), '#3a2d52');
      } else if (f.kind === 'door') {
        px(g, x, y0 - 1, 1, y1 - y0 + 1, K);
        px(g, x, y0, 1, y1 - y0, on ? '#3a2014' : '#2a1a14');
        if (on) px(g, x, y0 + Math.max(2, 10 / z), 1, Math.max(2, (y1 - y0) / 4), '#7a4a24');
        px(g, x, yAt(150, z), 1, 1, G);
      } else if (f.kind === 'shutter') {
        px(g, x, y0 - 1, 1, y1 - y0 + 1, K);
        px(g, x, y0, 1, y1 - y0, '#3b3347');
        for (let h = f.h0; h < f.h1; h += 16) px(g, x, yAt(h, z), 1, 1, '#2a2436');
      } else if (f.kind === 'garage') {
        // The valet garage's mouth: a dim concrete inside, its strip lights, a striped barrier arm.
        px(g, x, y0 - 1, 1, y1 - y0 + 1, K);
        px(g, x, y0, 1, y1 - y0, '#1a1526');
        px(g, x, y0, 1, Math.max(2, 20 / z), '#141020');
        if (Math.floor(z * 12) % 3 === 0) px(g, x, y0 + Math.max(3, 24 / z), 1, 1, '#6d6482');
        const yb = yAt(100, z);
        px(g, x, yb, 1, Math.max(2, 6 / z), Math.floor(z * 14) % 2 ? r : '#9a8fb0');
      } else if (f.kind === 'billboard') {
        // The casino's billboard: a gold frame round deep red, its crown and 777 in the middle (bulbs are live).
        px(g, x, y0 - 2, 1, y1 - y0 + 4, g8);
        px(g, x, y0, 1, y1 - y0, '#3a0e20');
        const u = (z - f.z0) / (f.z1 - f.z0);
        if (u > 0.28 && u < 0.72) {
          for (const [h0, h1, c] of [[270, 300, g8], [200, 250, '#8e1f3a'], [170, 186, g8]] as const) px(g, x, yAt(h1, z), 1, Math.max(1, (h1 - h0) / z), c);
          if (Math.floor(u * 9) % 3 === 1) px(g, x, yAt(245, z), 1, Math.max(1, 40 / z), '#c9a03a');
        }
      }
      if (edge && f.kind !== 'billboard') px(g, x, y0, 1, y1 - y0, K);
    }
    prevB = b;
    prevZ = z;
  }
}

/** One row of pavement between two screen x's, with slab joints every 0.25 of depth. */
function paveRow(g: CanvasRenderingContext2D, x0: number, x1: number, y: number, z: number, zn: number): void {
  if (x1 <= x0) return;
  px(g, x0, y, x1 - x0, 1, PAVE);
  if (Math.floor(z * 4) !== Math.floor(zn * 4)) px(g, x0, y, x1 - x0, 1, PAVE_L);
}

/** The ground, row by row: our street's sidewalks, curbs and road up to the corner; then the T: the corners' sidewalks
 * round our street's mouth, the cross street's road (its middle line, a crosswalk straight ahead), its far kerb and
 * sidewalk, and the casino's forecourt with the carpet running from its steps to the kerb. */
function drawGround(g: CanvasRenderingContext2D, zEnd: number): void {
  const zc = zCasino(zEnd);
  for (let y = Math.ceil(yAt(0, zc)); y < RH; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    const zp = EYE / (y - 0.5 - HOR);
    const cl = xAt(-CURB, z);
    const cr = xAt(CURB, z);
    if (z <= zEnd) {
      const wl = xAt(-WALL, z);
      const wr = xAt(WALL, z);
      paveRow(g, wl, cl, y, z, zn);
      paveRow(g, cr, wr, y, z, zn);
      px(g, cl, y, cr - cl, 1, ROAD);
      px(g, xAt(-WALL + 36, z), y, 1, 1, PAVE_L);
      px(g, xAt(WALL - 36, z), y, 1, 1, PAVE_L);
      // The curbs: a lit edge and a face.
      const cw = Math.max(1, Math.round(10 / z));
      px(g, cl - cw, y, cw, 1, '#3a2d52');
      px(g, cr, y, cw, 1, '#3a2d52');
      px(g, cl, y, 1, 1, '#4a3d62');
      px(g, cr + cw - 1, y, 1, 1, '#4a3d62');
      // The road's middle line (dashes every 0.6 of depth), stopping short of the corner, and a stop line there.
      if (Math.floor(z / 0.6) % 2 === 0 && z < zEnd - 0.35) px(g, CX - Math.max(1, 3 / z) / 2, y, Math.max(1, 3 / z), 1, '#3a3346');
      if (z >= zEnd - 0.16 && z <= zEnd - 0.09) px(g, CX + 2, y, cr - CX - 4, 1, '#4a4458');
      if ((y * 7) % 5 === 0) px(g, cl + (((y * 37) % 1000) / 1000) * (cr - cl), y, 1, 1, '#1a1428');
    } else if (z <= zRoad0(zEnd)) {
      // Round the corners: sidewalk either side of our street's mouth, which runs on into the cross street.
      paveRow(g, 0, cl, y, z, zn);
      paveRow(g, cr, RW, y, z, zn);
      px(g, cl, y, cr - cl, 1, ROAD);
      if (zn > zRoad0(zEnd)) {
        // the cross street's near kerb, either side of the mouth
        px(g, 0, y, cl, 1, '#3a2d52');
        px(g, cr, y, RW - cr, 1, '#3a2d52');
      }
    } else if (z <= zRoad1(zEnd)) {
      // The cross street: asphalt across the whole view, its dashed middle line running left to right, a crosswalk
      // straight ahead from our corner to the casino's side (bars across the road, one after another).
      px(g, 0, y, RW, 1, ROAD);
      const mid = (zRoad0(zEnd) + zRoad1(zEnd)) / 2;
      if (zp >= mid && z < mid) for (let lat = -4000; lat < 4000; lat += 200) if (Math.abs(lat) > 200) px(g, xAt(lat, z), y, Math.max(1, 100 / z), 1, '#3a3346');
      const band = Math.floor(((z - zRoad0(zEnd)) / T_ROAD) * 9);
      if (band % 2 === 1) px(g, xAt(-150, z), y, 300 / z, 1, '#3e3850');
      if ((y * 11) % 7 === 0) px(g, (((y * 53) % 997) / 997) * RW, y, 1, 1, '#1a1428');
    } else if (z <= zFront(zEnd)) {
      // The far kerb, then the far sidewalk (the casino's side of the cross street), the carpet already on it.
      paveRow(g, 0, RW, y, z, zn);
      if (zp > zRoad1(zEnd) - 0.001 && z <= zRoad1(zEnd) + 0.1) px(g, 0, y, RW, 1, '#3a2d52');
      px(g, xAt(-CARPET, z), y, (2 * CARPET) / z, 1, (y >> 1) % 2 ? '#5e1626' : '#661a2b');
    } else {
      // The forecourt: dark stone in front of the casino, the carpet up its middle to the steps.
      px(g, 0, y, RW, 1, '#1d1630');
      px(g, xAt(-FORE_W, z), y, (2 * FORE_W) / z, 1, '#221a38');
      px(g, xAt(-CARPET, z), y, (2 * CARPET) / z, 1, (y >> 1) % 2 ? '#5e1626' : '#661a2b');
      px(g, xAt(-CARPET, z), y, 1, 1, g8);
      px(g, xAt(CARPET, z) - 1, y, 1, 1, g8);
    }
  }
}

/** The forecourt's things standing up: brass rope posts either side of the carpet with a red rope between, and a
 * streetlight on the far kerb each side (only once they're big enough to read). */
function drawForecourt(g: CanvasRenderingContext2D, zEnd: number): void {
  const zc = zCasino(zEnd);
  if (1 / zc >= 0.14) {
    for (const zp of [zc - 0.12, zc - 0.48])
      for (const side of [-1, 1]) {
        const x = Math.round(xAt(side * 92, zp));
        const top = Math.round(yAt(100, zp));
        const bot = Math.round(yAt(0, zp));
        px(g, x - 1, top - 1, Math.max(3, 12 / zp), bot - top + 1, K);
        px(g, x, top, Math.max(1, 6 / zp), bot - top, G);
      }
    // the ropes, sagging between each pair of posts
    for (const side of [-1, 1]) {
      const a = zc - 0.12;
      const b = zc - 0.48;
      for (let i = 0; i <= 16; i++) {
        const zz = a + ((b - a) * i) / 16;
        const sag = Math.sin((i / 16) * Math.PI) * 22;
        px(g, xAt(side * 94, zz), yAt(86 - sag, zz), 1, Math.max(1, 5 / zz), r);
      }
    }
  }
  // streetlights on the far kerb, either side of the forecourt
  if (1 / zc >= 0.1)
    for (const lat of [-460, 460]) {
      const zl = zRoad1(zEnd) + 0.08;
      const x = Math.round(xAt(lat, zl));
      const top = Math.round(yAt(560, zl));
      const bot = Math.round(yAt(0, zl));
      const w = Math.max(1, Math.round(8 / zl));
      const lw = Math.max(3, Math.round(30 / zl));
      const lh = Math.max(3, Math.round(26 / zl));
      px(g, x, top, w, bot - top, k);
      px(g, x + w / 2 - lw / 2 - 1, top - lh - 1, lw + 2, lh + 2, K);
      px(g, x + w / 2 - lw / 2, top - lh, lw, lh, Yl);
    }
}

/** The casino's doors, as in the entrance room (two gilded leaves in a gold frame, amber glass, an etched crown in each
 * pane, brass push bars by the centre seam; about as wide as they're tall), scaled for distance. However far, they read
 * as two leaves: the centre seam and a handle each side are always at least a pixel. */
function drawDoubleDoors(g: CanvasRenderingContext2D, zc: number): void {
  const X = (lat: number) => Math.round(CX + lat / zc);
  const Yh = (h: number) => Math.round(yAt(h, zc));
  const x0 = X(-124);
  const x1 = X(124);
  const top = Yh(280);
  const bot = Yh(30);
  // The gold frame round both leaves.
  px(g, x0, top, x1 - x0, bot - top, G);
  px(g, x0, top, x1 - x0, 1, Yl);
  const ix0 = X(-118);
  const ix1 = X(118);
  const it = Yh(274);
  // Each leaf: a dark gilt edge, amber glass in three steps (warmer low down), an etched crown in the glass.
  const seam = Math.round((ix0 + ix1) / 2);
  for (const [a, b] of [[ix0, seam], [seam, ix1]] as const) {
    if (b - a < 1) continue;
    // a gilt edge round a dark leaf (as at the door), the glass pane inset in its upper part
    px(g, a, it, b - a, bot - it, g8);
    if (b - a >= 3) px(g, a + 1, it + 1, b - a - 2, bot - it - 2, '#4a2612');
    const ga = a + Math.max(1, Math.round(18 / zc));
    const gb = b - Math.max(1, Math.round(18 / zc));
    const gt = Math.max(it + 1, Yh(258));
    const gbot = Yh(124);
    if (gb > ga && gbot > gt) {
      const bands = ['#5e3218', '#6e3c1c', '#844824'];
      const hb = (gbot - gt) / 3;
      bands.forEach((c, i) => px(g, ga, gt + Math.round(i * hb), gb - ga, Math.ceil(hb), c));
      // the etched crown, once the pane is big enough to hold one
      const cx = Math.round((ga + gb) / 2);
      const cy = gt + Math.round((gbot - gt) * 0.45);
      if (gb - ga >= 7) {
        px(g, cx - 3, cy, 7, 2, G);
        for (const k2 of [-3, 0, 3]) px(g, cx + k2, cy - 2, 1, 2, G);
      } else if (gb - ga >= 3) px(g, cx, cy, 1, 1, G);
    }
  }
  // The centre seam (a lit line where the leaves meet) and a brass push bar either side of it: always visible.
  px(g, seam, it, 1, bot - it, '#c97a38');
  const hy = Yh(105);
  const hh = Math.max(1, Yh(65) - Yh(105));
  const hw = Math.max(1, Math.round(16 / zc));
  const off = Math.max(1, Math.round(12 / zc));
  px(g, seam - off - hw, hy, hw, hh, G);
  px(g, seam + off + 1, hy, hw, hh, G);
  if (hw >= 2) {
    px(g, seam - off - hw, hy, 1, hh, Yl);
    px(g, seam + off + 1, hy, 1, hh, Yl);
  }
}

/** The casino on the far side of the cross street, facing it (and us), much wider than our street's opening: our
 * street's corner buildings frame it. The bulbs and its sign's letters are live. */
function drawCasino(g: CanvasRenderingContext2D, zEnd: number): void {
  const zc = zCasino(zEnd);
  const s = 1 / zc;
  const X = (lat: number) => Math.round(CX + lat * s);
  const Yh = (h: number) => Math.round(yAt(h, zc));
  const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string) => px(g, X(lat0), Yh(h1), X(lat1) - X(lat0), Yh(h0) - Yh(h1), c);
  // The front: the casino's whole width along the cross street, stone-dark with gold pilasters and a gold cornice.
  wall(-1600, 1600, 0, 1040, '#2b2140');
  wall(-1600, 1600, 1000, 1040, g8);
  for (let lat = -1560; lat <= 1560; lat += 260) if (Math.abs(lat + 12) > 170) wall(lat, lat + 24, 0, 1000, '#33284a');
  wall(-1600, 1600, 0, 40, '#241c36');
  // Upper windows, warm, along the front.
  for (let lat = -1500; lat <= 1450; lat += 170) if (Math.abs(lat + 25) > 150) for (const h of [700, 840]) wall(lat, lat + 50, h, h + 80, (lat + h) % 3 ? '#8a5428' : '#5e3218');
  // Three steps up from the forecourt, as wide as the doors' frame and a little more.
  wall(-150, 150, 0, 10, '#2e2444');
  wall(-140, 140, 10, 20, '#3a2d52');
  wall(-130, 130, 20, 30, '#5a4d72');
  drawDoubleDoors(g, zc);
  // The canopy over the doors (its bulbs are live), and the sign above it (its letters are live).
  wall(-190, 190, 284, 364, d);
  wall(-190, 190, 284, 296, K);
  wall(-140, 140, 500, 640, K);
  wall(-136, 136, 504, 636, r);
  // The crown on top.
  for (const lat of [-60, -30, 0, 30, 60]) wall(lat - 6, lat + 6, 1040, 1110, G);
  wall(-66, 66, 1040, 1070, G);
}

const stills = new Map<string, HTMLCanvasElement>();
function still(i: number, late: number): HTMLCanvasElement {
  const key = `${i}:${late.toFixed(2)}`;
  let c = stills.get(key);
  if (c) return c;
  const [cv, g] = mk(RW, RH);
  const zEnd = Z_END[i];
  drawSky(g, late);
  drawCasino(g, zEnd);
  drawGround(g, zEnd);
  drawForecourt(g, zEnd);
  drawWalls(g, STATIONS[i], -1, zEnd, late);
  drawWalls(g, STATIONS[i], 1, zEnd, late);
  stills.set(key, cv);
  c = cv;
  return c;
}

// ---- the props facing us (outlined, at their depth) ---------------------------------------------------------------

let sprites: Record<string, HTMLCanvasElement> | null = null;
function makeSprites(): Record<string, HTMLCanvasElement> {
  // The dive bar's blade sign: BAR down a dark box with a neon mug (its letters are live).
  const barSign = outlined(40, 104, (c) => {
    px(c, 0, 0, 40, 104, '#1a1022');
    px(c, 2, 2, 36, 100, '#24142c');
    px(c, 10, 74, 20, 22, '#3a2030');
  });
  // The pawn shop's sign: three gold balls on a bar, PAWN on a board.
  const pawn = outlined(46, 70, (c) => {
    px(c, 4, 0, 38, 4, k);
    for (const [x, y] of [[8, 6], [26, 6], [17, 20]] as const) {
      px(c, x, y, 12, 12, G);
      px(c, x + 2, y + 2, 4, 4, Yl);
      px(c, x + 8, y + 8, 3, 3, g8);
    }
    px(c, 0, 38, 46, 30, '#24142c');
    px(c, 2, 40, 42, 26, '#2e1a36');
  });
  // A fire escape: a landing's rail and a ladder, black iron.
  const escape = outlined(36, 120, (c) => {
    for (const y of [0, 58]) {
      px(c, 0, y, 36, 2, k);
      px(c, 0, y + 10, 36, 2, k);
      for (let x = 0; x < 36; x += 6) px(c, x, y, 1, 12, k);
    }
    for (let y = 12; y < 120; y += 7) px(c, 26, y, 8, 1, l);
    px(c, 26, 12, 1, 108, k);
    px(c, 33, 12, 1, 108, k);
  });
  // A dumpster at the alley's mouth.
  const bin = outlined(44, 30, (c) => {
    px(c, 0, 4, 44, 26, '#2a4a3a');
    px(c, 0, 4, 44, 3, '#3a6a50');
    px(c, 2, 0, 40, 4, '#22382c');
    px(c, 4, 12, 36, 1, '#1e3428');
    px(c, 4, 22, 36, 1, '#1e3428');
  });
  // The bus stop: a pole with its sign, a lit timetable.
  const busStop = outlined(30, 150, (c) => {
    px(c, 13, 20, 3, 130, l);
    px(c, 3, 0, 24, 22, '#3474e0');
    px(c, 5, 2, 20, 18, '#2a5ab8');
    px(c, 7, 6, 16, 3, T);
    px(c, 7, 12, 10, 3, T);
    px(c, 8, 70, 14, 26, '#1a2230');
    px(c, 9, 71, 12, 24, '#7ca8c8');
  });
  // The valet's sign.
  const valet = outlined(44, 58, (c) => {
    px(c, 20, 26, 4, 32, k);
    px(c, 0, 0, 44, 26, d);
    px(c, 2, 2, 40, 22, r);
  });
  // A newspaper box and trash bags on the bar's corner.
  const bags = outlined(40, 22, (c) => {
    px(c, 0, 6, 18, 16, '#1e1e26');
    px(c, 3, 2, 10, 6, '#1e1e26');
    px(c, 16, 8, 22, 14, '#26242e');
    px(c, 22, 4, 8, 6, '#26242e');
    px(c, 4, 10, 6, 1, '#3a3846');
    px(c, 22, 12, 8, 1, '#3a3846');
  });
  return { barSign, pawn, escape, bin, busStop, valet, bags };
}

// ---- the live layer ---------------------------------------------------------------------------------------------

const rain: { x: number; y: number; v: number }[] = [];
for (let i = 0; i < 80; i++) rain.push({ x: Math.random() * RW, y: Math.random() * RH, v: 150 + Math.random() * 60 });
const steam: { x: number; y: number; life: number; w: number }[] = [];
let tLast = 0;
const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

export interface StreetScene {
  /** The station (0 far from the casino .. 3 the block before it). */
  station: number;
  time: number;
  /** ENDLESS hook: 0 early in the night, 1 closing time (lights off, darker). */
  late?: number;
  /** This fight's enemy (a cheap per-enemy touch: THE BARFLY's (archetype 'slime') bar sign buzzes when he's the one). */
  enemy?: string | null;
  /** The menus (roomMenu.ts): the bar's blade sign hangs this many art pixels lower, so the main menu's logo doesn't
   * cover its B. 0 in the run. */
  barDrop?: number;
}

/** The casino's canopy bulbs and sign letters down the street (sized by its depth). */
function casinoLive(g: CanvasRenderingContext2D, zEnd: number, t: number): void {
  const zFar = zCasino(zEnd);
  const s = 1 / zFar;
  const X = (lat: number) => CX + lat * s;
  const Yh = (h: number) => yAt(h, zFar);
  const n = Math.max(4, Math.round((380 * s) / 6));
  for (let i = 0; i < n; i++) {
    const on = (i + Math.floor(t * 6)) % 3 === 0 ? 1 : 0;
    const x = X(-190) + (i * (380 * s)) / n;
    if (s > 0.2) {
      bulb(g, x, Yh(364) - 1, on);
      bulb(g, x, Yh(296) - 2, (n - i + Math.floor(t * 6)) % 3 === 0 ? 1 : 0);
    } else {
      px(g, x, Yh(364), 1, 1, on ? Y : g8);
      px(g, x, Yh(296) - 1, 1, 1, on ? g8 : Y);
    }
  }
  // CASINO on the sign: real letters once it's near enough, a lit band of gold before that.
  const h = (640 - 500) * s;
  const ys = (Yh(640) + Yh(500)) / 2;
  if (h >= 30) drawText(g, 'CASINO', CX, ys, 2, Math.floor(t * 2) % 5 === 0 ? Yl : G, { outline: K });
  else if (h >= 14) drawText(g, 'CASINO', CX, ys, 1, Math.floor(t * 2) % 5 === 0 ? Yl : G, { outline: K });
  else for (let i = 0; i < 6; i++) px(g, X(-110) + (i * 220 * s) / 5, ys - Math.max(1, h / 4), Math.max(1, 20 * s), Math.max(1, h / 2), (i + Math.floor(t * 3)) % 6 ? G : Yl);
  // Its blade sign, CASINO down the right of the front (as at the door), once it's near enough to read.
  if (s >= 0.2) {
    const bx = Math.round(X(212));
    const top = Math.max(4, Math.round(Yh(650)));
    const bot = Math.round(Yh(380));
    px(g, bx - 1, top - 1, Math.round(26 * s) + 2, bot - top + 2, K);
    px(g, bx, top, Math.round(26 * s), bot - top, d);
    const step = (bot - top) / 6;
    if (step >= 9) 'CASINO'.split('').forEach((ch, j) => drawText(g, ch, bx + Math.round(13 * s), top + step * (j + 0.5), 1, (Math.floor(t * 2) + j) % 6 === 0 ? Yl : G, { outline: K }));
  }
  // Its glow on the wet road toward us, in broken lines.
  g.globalAlpha = 0.12;
  for (let y = Math.ceil(yAt(0, zFar)) + 2; y < RH; y += 3) {
    const z = EYE / (y - HOR);
    const w = 70 / z;
    px(g, CX - w / 2 + Math.round(Math.sin(t * 2 + y * 0.4) * 2), y, w, 1, Yl);
  }
  g.globalAlpha = 1;
}

// ---- THE DOORMAN at the casino's door, down the street ------------------------------------------------------------

/** He stands on the forecourt just right of the doors, a little in front of the casino's front (lat, depth before it). */
const DOORMAN_LAT = 172;
const DOORMAN_Z = 0.22;
/** His height in world units (the doors are 250; at the entrance he's about 0.85 of them). */
const DOORMAN_H = 212;
/** Downsampling favours his reads: gold (cap band, epaulettes, buttons) and his dark cap win a pixel over the coat. */
const PICK: Record<string, number> = { '.': 0.8, Y: 2.6, G: 2.2, g: 1.4, p: 1.6, P: 1.4, l: 1.3, K: 1.2 };

const doormen = new Map<string, HTMLCanvasElement>();
/** THE DOORMAN `ht` art pixels tall: the approved figure (roomEntrance.ts), resampled block by block with each block's
 * most telling colour, outlined as the portraits are, with the canopy's warm light along his door side (no gradient: one
 * colour on his outline). */
function doormanAt(ht: number, eyes: number): HTMLCanvasElement {
  const key = `${ht}:${eyes}`;
  const hit = doormen.get(key);
  if (hit) return hit;
  const src = DOORMAN.map((row, y) => (y === 8 ? DOORMAN_EYES[eyes] : row));
  const h0 = src.length - 1;
  const w0 = src[0].length;
  const wt = Math.max(5, Math.round((w0 * ht) / h0));
  const rows: string[] = [];
  for (let ty = 0; ty < ht; ty++) {
    let row = '';
    for (let tx = 0; tx < wt; tx++) {
      const y0 = Math.floor((ty * h0) / ht);
      const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * h0) / ht));
      const x0 = Math.floor((tx * w0) / wt);
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * w0) / wt));
      const score: Record<string, number> = {};
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const ch = src[y][x];
        score[ch] = (score[ch] ?? 0) + (PICK[ch] ?? 1);
      }
      row += Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
    }
    rows.push(row);
  }
  const fig = outlined(wt, ht, (c) => rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && px(c, x, y, 1, 1, DOORMAN_INK[ch]))));
  // The canopy's light on his door side (left): his outline there turns warm, from the cap down to the coat's hem.
  const g = fig.getContext('2d')!;
  const data = g.getImageData(0, 0, fig.width, fig.height).data;
  for (let y = 1; y < Math.round(fig.height * 0.8); y++)
    for (let x = 0; x < fig.width; x++)
      if (data[(y * fig.width + x) * 4 + 3] > 0) {
        px(g, x, y, 1, 1, '#a8642a');
        break;
      }
  doormen.set(key, fig);
  return fig;
}

/** THE DOORMAN by the doors at a station: small far off, clearer each step; from station 3 he glances and shifts his
 * weight now and then. */
function drawDoorman(g: CanvasRenderingContext2D, zEnd: number, station: number, t: number): void {
  const zd = zCasino(zEnd) - DOORMAN_Z;
  const ht = Math.max(12, Math.round(DOORMAN_H / zd));
  const near = station >= 2;
  const glance = near ? (Math.floor(t / 3.1) % 4 === 1 ? 1 : Math.floor(t / 3.1) % 4 === 3 ? 2 : 0) : 0;
  const shift = near && (t % 5.3) < 0.4 ? 1 : 0;
  const fig = doormanAt(ht, glance);
  const fx = Math.round(xAt(DOORMAN_LAT, zd) - fig.width / 2) + shift;
  const fy = Math.round(yAt(0, zd)) - fig.height + 1;
  // his shadow on the forecourt stone, then him
  px(g, fx + 1, fy + fig.height - 1, fig.width - 2, 1, '#120c1e');
  g.drawImage(fig, fx, fy);
}

/** Draw the street at a station (the still layer cached; the lights, signs, steam and rain live). */
export function drawStreet(ctx: CanvasRenderingContext2D, o: StreetScene): void {
  if (!sprites) sprites = makeSprites();
  const i = Math.max(0, Math.min(STREET_STATIONS - 1, o.station));
  const late = o.late ?? 0;
  const t = o.time;
  const dt = Math.min(0.1, Math.max(0, t - tLast));
  tLast = t;
  const zEnd = Z_END[i];
  const S = sprites;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  casinoLive(g, zEnd, t);
  drawDoorman(g, zEnd, i, t);

  if (i === 0) {
    // THE BARFLY's bar: BAR in pink neon down the blade sign, its O buzzing (more when he's the one you're fighting),
    // the bar's window glow on the sidewalk, trash bags by the door.
    const sx = 18;
    const sy = 58 + (o.barDrop ?? 0);
    g.drawImage(S.barSign, sx, sy);
    const buzz = o.enemy === 'slime' ? 0.82 : 0.95;
    const letters = ['B', 'A', 'R'];
    letters.forEach((ch, j) => {
      const dead = j === 1 && Math.sin(t * 17 + Math.sin(t * 3) * 4) > buzz;
      drawText(g, ch, sx + 21, sy + 14 + j * 20, 2, dead ? '#4a1a34' : '#ff4fa3', { outline: K });
    });
    // the neon mug
    px(g, sx + 14, sy + 78, 10, 14, Yl);
    px(g, sx + 14, sy + 78, 10, 3, T);
    px(g, sx + 24, sy + 81, 3, 7, Yl);
    pool(g, 46, 318, 40, 10, '#e8a860', 0.18);
    pool(g, 30, 200 + (o.barDrop ?? 0), 26, 40, '#ff4fa3', 0.08);
    g.drawImage(S.bags, 586, 312);
  } else if (i === 1) {
    // The alley's mouth: a fire escape on the wall beside it, a dumpster just inside; the pawn shop's sign across.
    g.drawImage(S.escape, 6, 20);
    g.drawImage(S.bin, 30, 300);
    const px0 = 584;
    g.drawImage(S.pawn, px0, 40);
    drawText(g, 'PAWN', px0 + 24, 93, 1, Math.floor(t * 1.5) % 7 === 0 ? Yl : G, { outline: K });
    pool(g, 612, 318, 34, 9, '#d9b060', 0.16);
  } else if (i === 2) {
    // The cold corner: the bus stop, steam off a grate in the road (in the open column), the closed shop's blue.
    g.drawImage(S.busStop, 40, 190);
    pool(g, 54, 300, 22, 6, B, 0.12);
    // the grate, and its steam rising up the column
    const gy = Math.round(yAt(0, 2.2));
    px(g, CX - 14, gy, 28, 3, '#2a2436');
    for (let x = CX - 12; x < CX + 12; x += 3) px(g, x, gy + 1, 1, 1, '#0a0710');
    if (Math.random() < dt * 5) steam.push({ x: CX + (Math.random() - 0.5) * 16, y: gy, life: 3 + Math.random() * 1.5, w: 4 + Math.random() * 4 });
    for (const p of steam) {
      p.y -= 16 * dt;
      p.x += Math.sin(t * 1.3 + p.y * 0.05) * 6 * dt;
      p.w += 3 * dt;
      p.life -= dt;
      g.globalAlpha = Math.min(0.22, p.life * 0.08);
      px(g, p.x - p.w / 2, p.y, p.w, Math.max(2, p.w / 2), '#b8b0d0');
    }
    g.globalAlpha = 1;
    for (let j = steam.length - 1; j >= 0; j--) if (steam[j].life <= 0) steam.splice(j, 1);
    pool(g, 34, 250, 30, 30, B, 0.06);
  } else {
    // The block before the casino: the valet's sign, the billboard's bulbs chasing.
    g.drawImage(S.valet, 26, 40);
    drawText(g, 'VALET', 48, 52, 1, T, { outline: K });
    for (let j = 0; j < 10; j++) {
      const z = 1.05 + (j * 0.5) / 10;
      const on = (j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0;
      bulb(g, xAt(WALL, z) - 1, yAt(334, z) - 3, on);
      bulb(g, xAt(WALL, z) - 1, yAt(106, z), (10 - j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0);
    }
    pool(g, 600, 300, 34, 10, R, 0.1);
  }

  // Rain over everything, and drips off the signs.
  g.fillStyle = '#7f8fc0';
  g.globalAlpha = 0.33;
  for (const rd of rain) {
    rd.y += rd.v * dt;
    rd.x -= rd.v * dt * 0.12;
    if (rd.y > RH) {
      rd.y = -6;
      rd.x = Math.random() * (RW + 40);
    }
    g.fillRect(Math.round(rd.x), Math.round(rd.y), 1, 4);
  }
  g.globalAlpha = 1;

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
