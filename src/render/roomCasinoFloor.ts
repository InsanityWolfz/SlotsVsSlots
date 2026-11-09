/**
 * ACT 2, THE CASINO FLOOR (rooms v2's journey; the user, 2026-11-09: once you're in, "you're walking down an aisle toward
 * the table games" between slot machines on both sides, among the casino's usual suspects; "when you reach the table
 * games through the slot machine rows, that's when you come up on the roulette wheel", THE WHEEL its attendant).
 * Four stations down one aisle, chosen by how far into the act this fight is (`floorStation`, as act 1's street), then
 * THE WHEEL's room (`drawWheelRoom`) at its end.
 *
 * The same technique and grid as the street (roomStreet.ts): one-point perspective with the street's eye level and
 * vanishing point (the open column between the HUDs), drawn per column and per row on the 640x360 grid, 2 screen pixels
 * an art pixel, the portraits' palette and 1px outline, light in hard steps. The side planes are the rows of slot
 * machines facing the aisle (their screens dim, their toppers' bulbs blinking slowly); a carpet down the aisle; a low
 * ceiling with two rows of downlights. At the aisle's end, the roulette pit: a back wall with TABLE GAMES over it, the
 * roulette table under its lamp, the wheel at its head and THE WHEEL behind it, nearer each station. The crowd belongs
 * here, small and dim: players at the far tables and a few at the machines.
 *
 * THE WHEEL's room is a straight-on view of her table, like the casino's door: the wheel at the table's head in the open
 * column above the gutter, her full figure behind it, the felt layout running toward us; the floor beyond in the top
 * band. Alive in her fight: the wheel turns with the gutter's wheel, PLACE YOUR BETS lands chips on the layout (they
 * glow), NO MORE BETS drops the ball into a pocket and rakes the layout, a hit swings the lamps, and at half HP the
 * limit sign reads NO LIMIT and the rim's bulbs chase. Nothing flashes: the strongest change is a small pool under 0.2.
 * ENDLESS hook: `late` (0 early, 1 closing) dims machines, empties seats and darkens; nothing draws it yet.
 */
import { bulb, mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';

// ---- the projection (the street's: same eye level, same vanishing point) -------------------------------------------

const CX = 320;
const HOR = 140;
const EYE = 250;
/** The machines' faces (either side of the aisle), and the low ceiling. */
const ROW = 340;
const CEIL = 560;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

/** The roulette pit's front (where the rows end) at each station: far down the aisle, then nearer each fight. */
const Z_FAR = [9.0, 6.2, 4.3, 3.0];
export const FLOOR_STATIONS = Z_FAR.length;
/** The pit's depth: past the last machines, the table games before the back wall. */
const PIT = 1.1;
/** One machine's width along the row (depth units). */
const MW = 0.16;

// The portraits' palette (as roomEntrance.ts) plus the casino's darks.
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
const F = '#f4c09a';
const f = '#c07a5c';
const FELT = '#1d5a3a';
const FELT_D = '#173f2b';
const WOOD = '#5a311c';
const WOOD_D = '#3a1e10';
const CARPET = '#2a0f22';
const CARPET_L = '#3a1630';
const CEIL_C = '#120b1c';
/** The machines' cabinets (dim: they sit beside and behind the reels). */
const BODIES = ['#3a1a34', '#1e2440', '#38220f', '#281a3e', '#1a3030'];
const TOPS = ['#5e1a30', '#22407a', '#6a4a16', '#45206a', '#185a50'];

/** A fixed per-position coin flip (lights the ENDLESS hook turns off, seats it empties). */
const hash = (a: number, b: number) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;

// ---- the stations -----------------------------------------------------------------------------------------------

/** What stands along one side of the aisle, by depth: slot machines (the default), the cashier's cage, a gap. */
interface Run {
  z0: number;
  z1: number;
  kind: 'cage' | 'gap';
}
interface Station {
  /** Where the machine rows start (the doors' foyer before it, on the first station). */
  rowsFrom: number;
  left: Run[];
  right: Run[];
  /** The overhead sign facing us, hanging over the aisle at this depth (null: none). */
  sign: { z: number; kind: 'slots' | 'jackpot' } | null;
}
const STATIONS: Station[] = [
  // (a) Just inside the doors: the floor opens up, the rows begin, SLOTS hangs over the aisle; the wheel's lamp far off.
  { rowsFrom: 1.3, left: [], right: [], sign: { z: 2.4, kind: 'slots' } },
  // (b) Deeper in the rows: the cashier's cage on the right, machines both sides.
  { rowsFrom: 0.5, left: [], right: [{ z0: 0.5, z1: 1.75, kind: 'cage' }], sign: null },
  // (c) Under the progressive jackpot's board, the rows to either side, a cross aisle.
  { rowsFrom: 0.5, left: [{ z0: 2.0, z1: 2.35, kind: 'gap' }], right: [{ z0: 2.0, z1: 2.35, kind: 'gap' }], sign: { z: 1.9, kind: 'jackpot' } },
  // (d) The end of the rows: the table games either side, the roulette table and THE WHEEL big ahead.
  { rowsFrom: 0.5, left: [], right: [], sign: null },
];

/** Which station an act 2 fight sits at: the act's regular fights spread over the four, the last one always the end of
 * the rows (`i` this fight's index among the act's regulars, `n` how many there are). */
export function floorStation(i: number, n: number): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(FLOOR_STATIONS - 1, Math.round((i * (FLOOR_STATIONS - 1)) / (n - 1))));
}

// ---- the still layer: ceiling, carpet, the rows, the pit --------------------------------------------------------

function drawCeiling(g: CanvasRenderingContext2D, zFar: number): void {
  const yEnd = Math.floor(yAt(CEIL, zFar));
  for (let y = 0; y <= yEnd; y++) {
    const z = (CEIL - EYE) / (HOR - y - 0.5);
    const zn = (CEIL - EYE) / (HOR - y + 0.5);
    const wl = xAt(-ROW, z);
    const wr = xAt(ROW, z);
    px(g, wl, y, wr - wl, 1, CEIL_C);
    // Coffers every 0.5 of depth (a dark trim), the soffits over the rows (a gold edge).
    if (Math.floor(z * 2) !== Math.floor(zn * 2)) px(g, wl, y, wr - wl, 1, '#1c1230');
    px(g, wl, y, Math.max(1, 12 / z), 1, g8);
    px(g, wr - Math.max(1, 12 / z), y, Math.max(1, 12 / z), 1, g8);
    // Two rows of downlights, every 0.5 of depth.
    if (Math.floor(z * 2 + 0.5) !== Math.floor(zn * 2 + 0.5)) for (const lat of [-170, 170]) px(g, xAt(lat, z) - Math.max(1, 8 / z) / 2, y, Math.max(1, 8 / z), Math.max(1, 3 / z), '#c9a46a');
  }
  // Above the soffits, out to the sides: the dark over the far rows.
  for (let y = 0; y <= yEnd; y++) {
    const z = (CEIL - EYE) / (HOR - y - 0.5);
    px(g, 0, y, xAt(-ROW, z), 1, '#0e0916');
    px(g, xAt(ROW, z), y, RW, 1, '#0e0916');
  }
}

function drawCarpet(g: CanvasRenderingContext2D, zFar: number): void {
  for (let y = Math.ceil(yAt(0, zFar)); y < RH; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    const wl = xAt(-ROW, z);
    const wr = xAt(ROW, z);
    px(g, wl, y, wr - wl, 1, CARPET);
    // The casino carpet: a diamond lattice (every 0.3 of depth, 60 across) with gold dots at its knots.
    const band = Math.floor(z / 0.3);
    if (band !== Math.floor(zn / 0.3)) px(g, wl, y, wr - wl, 1, CARPET_L);
    const u = (z / 0.3) % 1;
    for (let lat = -ROW + 30; lat < ROW; lat += 60) {
      const off = (band % 2 ? 30 : 0) + (u - 0.5) * 30;
      const x = xAt(lat + off, z);
      if (x > wl && x < wr) px(g, x, y, Math.max(1, 3 / z), 1, CARPET_L);
      if (Math.abs(u - 0.5) < 0.06) px(g, xAt(lat + (band % 2 ? 30 : 0), z), y, Math.max(1, 4 / z), 1, '#5a3a1a');
    }
    // The aisle's runner: two gold lines down the middle.
    for (const lat of [-90, 90]) px(g, xAt(lat, z), y, Math.max(1, 4 / z), 1, '#4a2a1a');
  }
}

/** One side's row, column by column (`side` -1 left, 1 right), out to the pit. */
function drawRow(g: CanvasRenderingContext2D, st: Station, side: -1 | 1, zFar: number, late: number): void {
  const runs = side < 0 ? st.left : st.right;
  const xEnd = Math.round(xAt(side * ROW, zFar));
  const cols = side < 0 ? [0, xEnd] : [xEnd, RW];
  const zRows = zFar - PIT;
  let prevZ = 0;
  for (let x = cols[0]; x < cols[1]; x++) {
    const z = ROW / Math.abs(x + 0.5 - CX);
    if (z > zFar) continue;
    const yG = yAt(0, z);
    const yC = yAt(CEIL, z);
    // The dark over everything (back of the rows), then what stands here.
    px(g, x, yC, 1, yG - yC, '#0e0916');
    const run = runs.find((ru) => z >= ru.z0 && z < ru.z1);
    if (z < st.rowsFrom) {
      // The doors' foyer: dark panelled walls, a brass rail.
      px(g, x, yC, 1, yG - yC, '#1e1428');
      for (let h = 80; h < CEIL; h += 120) px(g, x, yAt(h, z), 1, 1, '#2a1e38');
      px(g, x, yAt(110, z), 1, Math.max(1, 6 / z), g8);
    } else if (z >= zRows) {
      // The pit: past the rows, the table games' low wall with its gold rail (the tables are drawn over it).
      px(g, x, yAt(110, z), 1, yG - yAt(110, z), '#24142c');
      px(g, x, yAt(110, z), 1, Math.max(1, 6 / z), g8);
    } else if (run?.kind === 'gap') {
      // A cross aisle: the next rows far off, dim toppers in the dark.
      const zb = z + 2.4;
      px(g, x, yAt(300, zb), 1, yAt(0, zb) - yAt(300, zb), '#160f22');
      if (Math.floor(x / 3) % 3 === 0) px(g, x, yAt(290, zb), 1, 1, TOPS[Math.floor(x / 9) % TOPS.length]);
    } else if (run?.kind === 'cage') {
      // The cashier's cage: a gold-barred window, warm inside, a counter, CASHIER on the frieze (the sign's live).
      px(g, x, yAt(330, z), 1, yG - yAt(330, z), '#2a1a14');
      px(g, x, yAt(250, z), 1, yAt(110, z) - yAt(250, z), '#3a1e10');
      px(g, x, yAt(250, z), 1, Math.max(2, 20 / z), '#4a2a14');
      if (Math.floor(z / 0.05) !== Math.floor(prevZ / 0.05)) px(g, x, yAt(250, z), 1, yAt(110, z) - yAt(250, z), G);
      px(g, x, yAt(110, z), 1, Math.max(2, 10 / z), WOOD);
      px(g, x, yAt(330, z), 1, Math.max(2, 40 / z), d);
      px(g, x, yAt(330, z), 1, 1, G);
    } else {
      // A slot machine facing the aisle. Its index along the row picks its colours.
      const m = Math.floor((z - st.rowsFrom) / MW);
      const u = (z - st.rowsFrom) / MW - m;
      const body = BODIES[(m + (side < 0 ? 0 : 2)) % BODIES.length];
      const top = TOPS[(m * 3 + (side < 0 ? 1 : 0)) % TOPS.length];
      const off = hash(m, side) < late * 0.8;
      px(g, x, yAt(300, z), 1, yG - yAt(300, z), body);
      px(g, x, yAt(20, z), 1, yG - yAt(20, z), '#120c1a');
      // The belly glass, the button deck, the screen (three reel windows, dim), the topper's sign band.
      px(g, x, yAt(100, z), 1, yAt(40, z) - yAt(100, z), '#1a1426');
      px(g, x, yAt(128, z), 1, Math.max(1, 14 / z), '#4a3d62');
      px(g, x, yAt(235, z), 1, yAt(135, z) - yAt(235, z), '#0e0a18');
      if (!off && u > 0.12 && u < 0.88 && Math.floor(u * 3 * 10) % 10 > 1) {
        px(g, x, yAt(222, z), 1, yAt(148, z) - yAt(222, z), '#3a3450');
        // A symbol in each window: a red seven, a gold bar or a cherry, fixed per machine and window.
        const w = Math.floor(u * 3);
        const sym = ['#8e1f3a', '#8f5a1f', '#8e1f3a', '#3a6a3a'][(m * 5 + w * 3 + (side < 0 ? 0 : 1)) % 4];
        px(g, x, yAt(200, z), 1, yAt(170, z) - yAt(200, z), sym);
      }
      px(g, x, yAt(300, z), 1, yAt(258, z) - yAt(300, z), off ? '#24182c' : top);
      px(g, x, yAt(300, z), 1, 1, g8);
      px(g, x, yAt(258, z), 1, 1, K);
      // The seams between machines.
      if (Math.floor((z - st.rowsFrom) / MW) !== Math.floor((prevZ - st.rowsFrom) / MW)) px(g, x, yAt(300, z), 1, yG - yAt(300, z), K);
    }
    prevZ = z;
  }
}

/** A figure at depth (world units: its feet on the floor at `lat`, `z`): a dim player, a dealer. Rects, so its pixels
 * stay on the grid. `seated` sits it on a stool (shorter, the stool under it). */
function person(g: CanvasRenderingContext2D, lat: number, z: number, coat: string, hair: string, seated = false): void {
  const X = (dx: number) => Math.round(xAt(lat + dx, z));
  const Yh = (h: number) => Math.round(yAt(h, z));
  const rect = (dx0: number, dx1: number, h0: number, h1: number, c: string) => px(g, X(dx0), Yh(h1), Math.max(1, X(dx1) - X(dx0)), Math.max(1, Yh(h0) - Yh(h1)), c);
  // Seated (the pit's players: a table hides the stool and legs) or standing at a machine (legs, shoes).
  const hip = seated ? 110 : 130;
  const sh = hip + 100;
  // The outline: one grid pixel, in world units at this depth.
  const o = z;
  if (!seated) {
    rect(-15 - o, 15 + o, 0, hip + 4, K);
    rect(-13, -2, 8, hip, '#1a1426');
    rect(2, 13, 8, hip, '#1a1426');
    rect(-15, -1, 0, 8, '#0e0a14');
    rect(1, 15, 0, 8, '#0e0a14');
  }
  // The outline round the torso (shoulders wider than the waist), the arms and the head; then the figure.
  rect(-27 - o, 27 + o, sh - 30, sh + o, K);
  rect(-21 - o, 21 + o, hip - o, sh, K);
  rect(-14 - o, 14 + o, sh, sh + 44 + o, K);
  rect(-20, 20, hip, sh - 30, coat);
  rect(-26, 26, sh - 30, sh, coat);
  rect(-26, -18, hip + 30, sh - 8, shade(coat));
  rect(18, 26, hip + 30, sh - 8, shade(coat));
  rect(-26, -19, hip + 22, hip + 30, F);
  rect(19, 26, hip + 22, hip + 30, F);
  rect(-5, 5, sh - 4, sh + 4, F);
  rect(-11, 11, sh + 4, sh + 34, F);
  rect(-12, 12, sh + 30, sh + 44, hair);
  rect(-12, -8, sh + 18, sh + 32, hair);
  rect(8, 12, sh + 18, sh + 32, hair);
}
/** A coat's shadowed side (its sleeves). */
const shade = (c: string) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * 0.7).toString(16).padStart(2, '0')).join('');

/** The roulette pit at the aisle's end, facing us: the back wall and TABLE GAMES, the roulette table under its lamp, the
 * wheel at the table's head and THE WHEEL behind it (still: the wheel's pockets and her lamp are live). */
function drawPit(g: CanvasRenderingContext2D, zFar: number, late: number): void {
  const zw = zFar + 0.9;
  const s = 1 / zw;
  const X = (lat: number, z = zw) => Math.round(xAt(lat, z));
  const Yh = (h: number, z = zw) => Math.round(yAt(h, z));
  const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string, z = zw) => px(g, X(lat0, z), Yh(h1, z), X(lat1, z) - X(lat0, z), Yh(h0, z) - Yh(h1, z), c);
  // The back wall: panelled, a gold frieze, TABLE GAMES in gold (live), velvet drapes either side.
  wall(-ROW * 3, ROW * 3, 0, CEIL, '#1c1228');
  for (let lat = -ROW * 3; lat < ROW * 3; lat += 120) wall(lat, lat + 4, 0, CEIL, '#160e22');
  wall(-ROW * 3, ROW * 3, 470, 480, g8);
  wall(-200, 200, 380, 460, K);
  wall(-196, 196, 384, 456, d);
  for (const side of [-1, 1]) wall(side < 0 ? -320 : 250, side < 0 ? -250 : 320, 0, 470, r);
  // The floor of the pit: the carpet stops at a brass strip, the pit's floor a shade lighter.
  const zt = zFar + 0.25;
  for (let y = Yh(0, zw); y < Yh(0, zFar); y++) {
    const z = EYE / (y + 0.5 - HOR);
    px(g, xAt(-ROW, z), y, (2 * ROW) / z, 1, '#32162a');
  }
  px(g, xAt(-ROW, zFar), Yh(0, zFar), (2 * ROW) / zFar, 1, g8);
  // A blackjack table either side in the pit (low, felt, its players on stools; fewer late at night).
  for (const side of [-1, 1]) {
    const lat = side * 230;
    const z1 = zFar + 0.35;
    // The dealer behind the table (drawn first: the table hides the legs).
    person(g, lat, z1 + 0.2, '#1e1a26', '#2a1a14');
    wall(lat - 70, lat + 70, 0, 95, WOOD_D, z1);
    wall(lat - 70, lat + 70, 95, 110, WOOD, z1);
    wall(lat - 64, lat + 64, 102, 108, FELT, z1);
    if (hash(side, 7) >= late) person(g, lat - 40, z1 - 0.12, side < 0 ? '#3a4a7a' : '#6a3a5a', side < 0 ? '#2a1a14' : '#c8c0d0', true);
    if (hash(side, 9) >= late * 1.2) person(g, lat + 40, z1 - 0.12, side < 0 ? '#5a2a2a' : '#2a4a3a', '#3a2a1a', true);
  }
  // THE WHEEL behind it (her red hair, the green eyeshade, the green jacket with its white shirt front).
  const zh = zt + 0.45;
  const zp = zh + 0.3;
  person(g, 0, zp, '#2a7a3a', '#c0502a');
  const P = (dx0: number, dx1: number, h0: number, h1: number, c: string) => px(g, X(dx0, zp), Yh(h1, zp), Math.max(1, X(dx1, zp) - X(dx0, zp)), Math.max(1, Yh(h0, zp) - Yh(h1, zp)), c);
  P(-4, 4, 196, 232, T);
  P(-16, 16, 258, 266, '#5ad65a');
  P(-18, 18, 256, 259, '#2a8a3a');
  // The roulette table, end-on: the wheel's housing at its head, the felt layout toward us.
  wall(-110, 110, 0, 100, WOOD_D, zt);
  wall(-110, 110, 100, 116, WOOD, zt);
  for (let y = Yh(116, zh); y < Yh(116, zt); y++) {
    const z = (EYE - 116) / (y + 0.5 - HOR);
    px(g, xAt(-104, z), y, 208 / z, 1, (Math.floor(z * 12) % 2 ? FELT : FELT_D));
    px(g, xAt(-104, z), y, Math.max(1, 6 / z), 1, WOOD);
    px(g, xAt(98, z), y, Math.max(1, 6 / z), 1, WOOD);
  }
  // The wheel's housing (a wooden bowl on the table's head; its pockets are live).
  const wy = Yh(118, zh);
  const rx = Math.max(3, Math.round(70 / zh));
  const ry = Math.max(1, Math.round(rx * 0.3));
  ellipse(g, CX, wy, rx + 2, ry + 1, WOOD_D);
  ellipse(g, CX, wy, rx, ry, WOOD);
  // The pit's lamp over the roulette table (its light is live).
  wall(-2, 2, 360, CEIL, k, zh);
  wall(-40, 40, 330, 362, g8, zh);
  wall(-30, 30, 324, 332, Yl, zh);
  void s;
}

/** A filled ellipse in scanlines (pixel art: no anti-aliasing). */
function ellipse(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = -ry; y <= ry; y++) {
    const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))));
    px(g, cx - hw, cy + y, hw * 2, 1, c);
  }
}

/** The overhead sign hanging over the aisle, facing us (its letters are live). */
function drawSign(g: CanvasRenderingContext2D, sign: Station['sign']): void {
  if (!sign) return;
  const z = sign.z;
  const X = (lat: number) => Math.round(xAt(lat, z));
  const Yh = (h: number) => Math.round(yAt(h, z));
  const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string) => px(g, X(lat0), Yh(h1), X(lat1) - X(lat0), Yh(h0) - Yh(h1), c);
  for (const lat of [-90, 90]) wall(lat - 1, lat + 1, 500, CEIL, k);
  if (sign.kind === 'slots') {
    wall(-130, 130, 410, 500, K);
    wall(-126, 126, 414, 496, d);
    wall(-126, 126, 414, 418, G);
    wall(-126, 126, 492, 496, G);
  } else {
    wall(-170, 170, 380, 500, K);
    wall(-166, 166, 384, 496, '#1a0e24');
    wall(-166, 166, 384, 388, G);
    wall(-166, 166, 492, 496, G);
    wall(-120, 120, 396, 430, '#0a0612');
  }
}

const stills = new Map<string, HTMLCanvasElement>();
function still(i: number, late: number): HTMLCanvasElement {
  const key = `${i}:${late.toFixed(2)}`;
  const hit = stills.get(key);
  if (hit) return hit;
  const [cv, g] = mk(RW, RH);
  const zFar = Z_FAR[i];
  px(g, 0, 0, RW, RH, '#0e0916');
  drawPit(g, zFar, late);
  drawCeiling(g, zFar);
  drawCarpet(g, zFar);
  drawRow(g, STATIONS[i], -1, zFar, late);
  drawRow(g, STATIONS[i], 1, zFar, late);
  drawSign(g, STATIONS[i].sign);
  // The players at the machines (a few, dim; fewer late): seated on stools at the rows' near machines.
  for (const [lat, z, coat, hair] of PLAYERS[i]) if (hash(Math.round(z * 100), lat) >= late) person(g, lat, z, coat, hair);
  stills.set(key, cv);
  return cv;
}

/** Players at the machines, per station (lateral, depth, coat, hair): standing at the rows, small and dim. */
const PLAYERS: [number, number, string, string][][] = [
  [[-285, 3.2, '#3a2a4a', '#8a8090'], [285, 4.6, '#4a2a2a', '#2a1a14']],
  [[-285, 2.8, '#2a3a4a', '#c0502a'], [-285, 4.2, '#4a3a2a', '#2a1a14']],
  [[285, 2.6, '#3a2a3a', '#c8c0d0'], [-285, 3.3, '#2a3a2a', '#3a2a1a']],
  [[-285, 1.9, '#3a2a4a', '#2a1a14']],
];

// ---- the live layer: toppers' bulbs, the sign, the jackpot board, the wheel's pockets and lamp ----------------------

const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

export interface FloorScene {
  /** The station (0 just inside the doors .. 3 the end of the rows). */
  station: number;
  time: number;
  /** ENDLESS hook: 0 early in the night, 1 closing time (machines dark, seats empty, darker). */
  late?: number;
}

/** The roulette wheel's pockets turning (a ring of red and black on the bowl, a green zero), and the ball. */
function wheelPockets(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, angle: number, ballAt: number | null): void {
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = angle + (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx * 0.82;
    const y = cy + Math.sin(a) * ry * 0.82;
    // The near half of the ring (sin > 0) faces us; the far half is half hidden by the bowl's lip.
    const w = Math.max(1, Math.round(rx / 7));
    const h = Math.max(1, Math.round(ry / 4));
    px(g, x - w / 2, y - h / 2, w, Math.sin(a) > -0.2 ? h : Math.max(1, h - 1), i === 0 ? '#2a9a4a' : i % 2 ? R : '#1a1018');
  }
  // The cone: gold, a turret.
  px(g, cx - Math.max(1, rx * 0.35), cy - Math.max(1, ry * 0.4), Math.max(2, rx * 0.7), Math.max(1, ry * 0.8), g8);
  px(g, cx - 1, cy - Math.max(2, ry * 0.9), 2, Math.max(2, ry * 0.9), G);
  if (ballAt !== null) {
    const a = ballAt;
    px(g, cx + Math.cos(a) * rx * 0.66 - 1, cy + Math.sin(a) * ry * 0.66 - 1, Math.max(1, rx / 14), Math.max(1, rx / 14), T);
  }
}

/** Draw the casino floor at a station (the still layer cached; the toppers, signs, the wheel and its lamp live). */
export function drawFloorStation(ctx: CanvasRenderingContext2D, o: FloorScene): void {
  const i = Math.max(0, Math.min(FLOOR_STATIONS - 1, o.station));
  const late = o.late ?? 0;
  const t = o.time;
  const zFar = Z_FAR[i];
  const st = STATIONS[i];
  const g = lg;
  g.clearRect(0, 0, RW, RH);

  // The toppers' bulbs: two per machine, blinking slowly out of step (a handful lit at a time; none on dark machines).
  for (const side of [-1, 1] as const) {
    for (let m = 0; ; m++) {
      const z = st.rowsFrom + (m + 0.5) * MW;
      if (z > zFar - PIT) break;
      const runs = side < 0 ? st.left : st.right;
      if (runs.some((ru) => z >= ru.z0 && z < ru.z1)) continue;
      if (hash(m, side) < late * 0.8) continue;
      const on = Math.sin(t * 1.3 + m * 2.1 + side) > 0.55;
      const x = xAt(side * ROW, z);
      const y = yAt(275, z);
      if (x < -4 || x > RW + 4) continue;
      const sz = Math.max(1, Math.min(3, Math.round(6 / z)));
      px(g, x - sz / 2, y, sz, sz, on ? Y : g8);
      // A screen catches a win now and then: its windows light a step brighter for a moment.
      if (Math.sin(t * 0.7 + m * 3.7 + side * 5) > 0.97) {
        const yy = yAt(222, z);
        g.globalAlpha = 0.35;
        px(g, x - Math.max(1, 6 / z), yy, Math.max(2, 12 / z), Math.max(2, (yAt(148, z) - yy) * 0.9), Yl);
        g.globalAlpha = 1;
      }
    }
  }
  // The overhead sign's letters, the jackpot board's number climbing.
  if (st.sign) {
    const z = st.sign.z;
    if (st.sign.kind === 'slots') drawText(g, 'SLOTS', CX, yAt(455, z), 2, Math.floor(t * 1.5) % 6 === 0 ? Yl : G, { outline: K });
    else {
      drawText(g, 'PROGRESSIVE', CX, yAt(470, z), 1, G, { outline: K });
      const n = 1000000 + Math.floor((t * 37) % 900000);
      drawText(g, `$${n.toLocaleString('en-US')}`, CX, yAt(413, z), 1, Math.floor(t * 2) % 4 === 0 ? Yl : R, { outline: K });
      for (let j = 0; j < 12; j++) {
        const zz = z;
        bulb(g, xAt(-160 + (j * 320) / 11, zz) - 1, yAt(500, zz) - 1, (j + Math.floor(t * 4)) % 3 === 0 ? 1 : 0);
      }
    }
  }
  if (st.right.some((ru) => ru.kind === 'cage')) drawText(g, 'CASHIER', xAt(ROW, 1.27), yAt(310, 1.27), 1, Math.floor(t * 1.2) % 7 === 0 ? Yl : G, { outline: K });
  // TABLE GAMES over the pit, the roulette wheel turning slowly, the lamp's stepped light on its felt.
  const zw = zFar + 0.9;
  const ts = 80 / zw;
  drawText(g, 'TABLE GAMES', CX, yAt(420, zw), ts >= 26 ? 2 : 1, Math.floor(t * 1.5) % 5 === 0 ? Yl : G, { outline: K });
  const zh = zFar + 0.7;
  const rx = Math.max(3, Math.round(70 / zh));
  const ry = Math.max(1, Math.round(rx * 0.3));
  wheelPockets(g, CX, yAt(118, zh), rx, ry, t * 0.6, null);
  pool(g, CX, yAt(116, zFar + 0.45), 110 / zh, 30 / zh, Yl, 0.16);

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

// ---- THE WHEEL's room: her table, straight on ------------------------------------------------------------------

/** The table's head and the floor's line (the felt runs toward us from here): high, so THE WHEEL and her wheel sit in
 * the open column above the gutter's BOSS chip and THE TABLE panel. */
const TABLE = 98;
/** The felt's vanishing line (it widens toward us from the table's head, staying inside the reels' span). */
const HORIZON = 30;

/** THE WHEEL's full figure, 22x60 at the room's 2px scale (the portraits' palette, outlined like them): red hair under
 * a green eyeshade, a green jacket with a white collar and gold buttons (as her portrait). Row 25+ is under the table. */
const WHEEL_FIG = [
  '.......hhhhhhhh.......',
  '.....hhHHHHHHHHhh.....',
  '....hHHHHHHHHHHHHh....',
  '...hHHHHHHHHHHHHHHh...',
  '..vVVVVVVVVVVVVVVVVv..',
  '..vvvvvvvvvvvvvvvvvv..',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFWKFFFFFFKWFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFFffFFFFFHh...',
  '...hHFFFFFFFFFFFFHh...',
  '...hHFFFFLLLLFFFFHh...',
  '...hHHFFFFFFFFFFHHh...',
  '..hHHH.ffFFFFff.HHHh..',
  '..hHHH...ffff...HHHh..',
  '..hHH..CCCCCCCC..HHh..',
  '.JJJJJJCcCCCCcCJJJJJJ.',
  'JJJJJJJJCCCCCCJJJJJJJj',
  'JJJJJJJJJCCCCJJJJJJJjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'JJJ.JJJJJJCCJJJJJJ.jjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'JJJ.JJJJJJCCJJJJJJ.jjj',
  'JJJ.JJJJJGCCJJJJJJ.jjj',
  'FFF.JJJJJJCCJJJJJJ.FFf',
  'FFf.JJJJJJJJJJJJJj.Fff',
  '....JJJJJJJJJJJJJj....',
  '....kkkkkkkkkkkkkk....',
  '....kkkkkkkkkkkkkk....',
];
/** Her arm out over the wheel (PLACE YOUR BETS): rows 17-26's right side swapped. */
const WHEEL_DEAL: Record<number, string> = {
  17: '.JJJJJJCcCCCCcCJJJJJJJjj',
  18: 'JJJJJJJJCCCCCCJJJJJjjjjj',
  19: 'JJJJJJJJJCCCCJJJJJJ.FFFf',
  20: 'JJJ.JJJJJGCCJJJJJJ...Fff',
  21: 'JJJ.JJJJJJCCJJJJJJ......',
  22: 'JJJ.JJJJJGCCJJJJJJ......',
  23: 'JJJ.JJJJJJCCJJJJJJ......',
  24: 'JJJ.JJJJJGCCJJJJJJ......',
  25: 'FFF.JJJJJJCCJJJJJJ......',
  26: 'FFf.JJJJJJJJJJJJJj......',
};
const WHEEL_INK: Record<string, string> = {
  h: '#8a3418', H: '#c0502a', V: '#5ad65a', v: '#2a8a3a', F, f, W: '#ffffff', K, L: '#c03a4a',
  C: T, c: '#c8c0d0', J: '#2a7a3a', j: '#1a5a2a', G, k: '#1a1426',
};

let figs: { idle: HTMLCanvasElement; deal: HTMLCanvasElement; sign: HTMLCanvasElement } | null = null;
function makeFigs() {
  const W = 24;
  const fig = (deal: boolean) =>
    outlined(W, WHEEL_FIG.length, (c) =>
      WHEEL_FIG.forEach((row0, y) => {
        const row = (deal && WHEEL_DEAL[y] ? WHEEL_DEAL[y] : row0).padEnd(W, '.').slice(0, W);
        [...row].forEach((ch, x) => ch !== '.' && WHEEL_INK[ch] && px(c, x, y, 1, 1, WHEEL_INK[ch]));
      }),
    );
  // The table-limit placard on its brass stand (its words are live: the limits, then NO LIMIT at half HP).
  const sign = outlined(58, 120, (c) => {
    px(c, 27, 52, 4, 64, g8);
    px(c, 27, 52, 1, 64, G);
    px(c, 19, 114, 20, 6, g8);
    px(c, 0, 0, 58, 52, G);
    px(c, 2, 2, 54, 48, '#1a0e24');
  });
  figs = { idle: fig(false), deal: fig(true), sign };
}

interface WheelState {
  t: number;
  bets: number;
  left: number;
  fast: boolean;
  foeHp: number;
  dealT: number;
  hitT: number;
  dropT: number;
  /** Where the ball settled at the last NO MORE BETS (the pocket index), and the chips on the layout (each glows as it
   * lands). */
  pocket: number;
  /** Each chip's rake (0 on the layout; from 1 down to 0 while NO MORE BETS sweeps it to the wheel, then gone). */
  chips: { x: number; y: number; glow: number; c: string; out?: number }[];
}
const ws: WheelState = { t: 0, bets: 0, left: 3, fast: false, foeHp: 1, dealT: 0, hitT: 0, dropT: 0, pocket: 5, chips: [] };

/** The layout's felt: from the table's head (y TABLE) toward us, in the street's perspective (half width at y). */
const feltHalf = (y: number) => Math.round((54 * (y - HORIZON)) / (TABLE - HORIZON));

export function wheelRoomUpdate(dt: number): void {
  ws.t += dt;
  ws.dealT = Math.max(0, ws.dealT - dt / 0.7);
  ws.hitT = Math.max(0, ws.hitT - dt / 1.2);
  ws.dropT = Math.max(0, ws.dropT - dt / 2.2);
  for (const c of ws.chips) {
    c.glow = Math.max(0, c.glow - dt / 1.2);
    if (c.out !== undefined) c.out -= dt / 0.8;
  }
  ws.chips = ws.chips.filter((c) => c.out === undefined || c.out > 0);
}

export function wheelRoomReset(): void {
  Object.assign(ws, { bets: 0, left: 3, fast: false, foeHp: 1, dealT: 0, hitT: 0, dropT: 0, chips: [] });
}

/** Read her fight: chips placed (she deals, chips land on the layout), NO MORE BETS (the ball drops, the layout's raked),
 * a hit (the lamps swing), half HP (NO LIMIT). */
function read(o: WheelRoomScene): void {
  if (o.foeHp > ws.foeHp + 0.3) wheelRoomReset();
  if (o.foeHp < ws.foeHp - 0.002) ws.hitT = 1;
  ws.foeHp = o.foeHp;
  ws.fast = o.fast;
  if (o.bets > ws.bets) {
    ws.dealT = 1;
    // (Chips still being raked don't count toward the layout's 14.)
    const cols = [R, '#3474e0', G, '#f4eee0', '#2a9a4a'];
    for (let j = ws.bets; j < o.bets && ws.chips.filter((c) => c.out === undefined).length < 14; j++) {
      // A chip lands on a number square of the layout (fixed per chip, in the felt's perspective).
      const y = TABLE + 18 + ((j * 37) % 120);
      const hw = feltHalf(y) - 10;
      ws.chips.push({ x: CX - hw + ((j * 53) % Math.max(1, hw * 2)), y, glow: 1, c: cols[j % cols.length] });
    }
  }
  // NO MORE BETS: the turn counter wraps back up (and the chips come off the reels): the ball drops, the layout's raked.
  const rake = () => ws.chips.forEach((c) => (c.out ??= 1));
  if (o.left > ws.left && ws.left <= 1) {
    ws.dropT = 1;
    ws.pocket = Math.floor(ws.t * 7) % 18;
    rake();
  }
  // Your pairs took the bets back (or the table cleared): the layout's chips go too.
  if (o.bets < ws.bets && o.bets === 0) rake();
  ws.bets = o.bets;
  ws.left = o.left;
}

let wheelStill: HTMLCanvasElement | null = null;
function buildWheelStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // The floor beyond, in the top band: a dark back wall, a ceiling trim, a row of slot machines along the far aisle.
  px(g, 0, 0, RW, TABLE, '#140c20');
  px(g, 0, 0, RW, 10, CEIL_C);
  px(g, 0, 10, RW, 2, g8);
  px(g, 0, 12, RW, 1, K);
  for (let x = 0; x < RW; x += 64) px(g, x, 13, 2, TABLE - 13, '#100a1a');
  // The far machines (elevation, small): cabinets, dim screens, toppers (their bulbs are live).
  for (let i = 0, x = 6; x < RW; i++, x += 26) {
    if (x > 236 && x < 380) continue;
    const top = TABLE - 52;
    px(g, x, top, 22, TABLE - top, BODIES[i % BODIES.length]);
    px(g, x, top, 22, 8, TOPS[(i * 3) % TOPS.length]);
    px(g, x, top, 22, 1, g8);
    px(g, x + 3, top + 14, 16, 12, '#0e0a18');
    px(g, x + 4, top + 16, 14, 8, '#2a2438');
    px(g, x + 2, top + 30, 18, 2, '#4a3d62');
    px(g, x, top, 1, TABLE - top, K);
    px(g, x + 21, top, 1, TABLE - top, K);
  }
  // ROULETTE over her, a gold-framed sign (the letters are live).
  px(g, 252, 20, 136, 22, K);
  px(g, 254, 22, 132, 18, d);
  px(g, 254, 22, 132, 1, G);
  px(g, 254, 39, 132, 1, G);
  // The pit's floor (carpet, in perspective toward us), around the table.
  px(g, 0, TABLE, RW, RH - TABLE, CARPET);
  for (const y of [TABLE + 4, TABLE + 10, TABLE + 18, TABLE + 30, TABLE + 46, TABLE + 68, TABLE + 98, TABLE + 140, TABLE + 196]) if (y < RH) px(g, 0, y, RW, 1, CARPET_L);
  for (let x0 = CX - 30 * 14; x0 <= CX + 30 * 14; x0 += 30)
    for (let y = TABLE + 1; y < RH; y += 2) px(g, CX + ((x0 - CX) * (y - HORIZON)) / (TABLE - HORIZON), y, 1, 1, '#4a2a1a');
  px(g, 0, TABLE, RW, 1, K);
  // The roulette table: its padded rail, then the felt and the betting layout, toward us (dark: it lies behind the
  // reels; its number boxes a dim grid, a red or black mark in each).
  let rowPrev = -1;
  for (let y = TABLE; y < RH; y++) {
    const hw = feltHalf(y);
    const rail = Math.max(2, Math.round(hw / 9));
    px(g, CX - hw - rail, y, hw * 2 + rail * 2, 1, WOOD_D);
    px(g, CX - hw - rail, y, 1, 1, K);
    px(g, CX + hw + rail - 1, y, 1, 1, K);
    px(g, CX - hw - rail + 1, y, 1, 1, WOOD);
    px(g, CX - hw, y, hw * 2, 1, FELT_D);
    // Rows of boxes, evenly spaced on the table (so closer together far off): a line between rows.
    const row = Math.floor((1 - (TABLE - HORIZON) / (y - HORIZON)) * 14);
    if (row !== rowPrev && y > TABLE) px(g, CX - hw + 1, y, hw * 2 - 2, 1, '#2e5a40');
    for (let col = 1; col < 3; col++) px(g, CX - hw + Math.round((hw * 2 * col) / 3), y, 1, 1, '#2e5a40');
    rowPrev = row;
  }
  // A mark in each box (red and black alternating), sized by its distance.
  for (let row = 0; row < 14; row++) {
    const y = Math.round(HORIZON + (TABLE - HORIZON) / (1 - (row + 0.5) / 14));
    if (y >= 280) break;
    const hw = feltHalf(y);
    const s2 = Math.max(1, Math.round(hw / 26));
    for (let col = 0; col < 3; col++) {
      const x = CX - hw + Math.round((hw * 2 * (col + 0.5)) / 3);
      px(g, x - s2, y - Math.max(1, Math.round(s2 / 2)), s2 * 2, Math.max(1, s2), (row + col) % 2 ? '#5a1424' : '#0e0a12');
    }
  }
  return c;
}

export interface WheelRoomScene {
  time: number;
  /** Her HP share (1 outside her fight: the room before it). */
  foeHp: number;
  /** Chips on your reels (all three), turns to NO MORE BETS, SPINS FASTER (half HP), the gutter wheel's angle. */
  bets: number;
  left: number;
  fast: boolean;
  angle: number;
}

/** THE WHEEL's room: her table straight on, the wheel at its head, her behind it; alive in her fight. */
export function drawWheelRoom(ctx: CanvasRenderingContext2D, o: WheelRoomScene): void {
  if (!figs) makeFigs();
  if (!wheelStill) wheelStill = buildWheelStill();
  read(o);
  const t = o.time;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const F2 = figs!;
  // The far machines' toppers: a bulb each, blinking out of step.
  for (let i = 0, x = 6; x < RW; i++, x += 26) {
    if (x > 236 && x < 380) continue;
    const on = Math.sin(t * 1.2 + i * 1.9) > 0.5;
    px(g, x + 10, TABLE - 50, 2, 2, on ? Y : g8);
  }
  drawText(g, 'ROULETTE', CX, 31, 1, Math.floor(t * 1.5) % 6 === 0 ? Yl : G, { outline: K });
  // The two lamps over the table (they swing when she's hit), their stepped light on the felt.
  const swing = ws.hitT > 0 ? Math.sin(t * 9) * 4 * ws.hitT : Math.sin(t * 0.8) * 0.6;
  for (const lx of [214, 426]) {
    const x = Math.round(lx + swing);
    px(g, lx, 0, 1, 44, k);
    px(g, x - 14, 44, 28, 8, K);
    px(g, x - 13, 45, 26, 6, g8);
    px(g, x - 13, 45, 26, 1, G);
    px(g, x - 9, 51, 18, 2, Yl);
    pool(g, x + (CX - x) * 0.4, TABLE + 6, 40, 8, Yl, 0.12);
  }
  // THE WHEEL at her table, right of the wheel (her arm out over it while she places bets; a flinch when she's hit):
  // her waist at the table's top, the apron in front of her.
  const fig = ws.dealT > 0 ? F2.deal : F2.idle;
  g.drawImage(fig, CX + 4 + (ws.hitT > 0.6 ? 1 : 0), TABLE - 34);
  px(g, CX - 70, TABLE - 6, 140, 10, WOOD_D);
  px(g, CX - 70, TABLE - 6, 140, 1, G);
  px(g, CX - 70, TABLE + 3, 140, 1, K);
  // The wheel's bowl on the table's head, left of her: the wooden housing, the ring of pockets turning with the gutter's
  // wheel, the ball (counter to the wheel; dropped in its pocket after NO MORE BETS).
  const wx = CX - 26;
  const wy = TABLE - 9;
  ellipse(g, wx, wy, 31, 10, K);
  ellipse(g, wx, wy, 30, 9, WOOD_D);
  ellipse(g, wx, wy - 1, 27, 8, WOOD);
  ellipse(g, wx, wy - 1, 23, 6, '#2a1a10');
  const dropped = ws.dropT > 0;
  const ballA = dropped ? o.angle + (ws.pocket / 18) * Math.PI * 2 : -o.angle * 1.7;
  wheelPockets(g, wx, wy - 1, 23, 6, o.angle, null);
  const bx = wx + Math.cos(ballA) * 23 * (dropped ? 0.82 : 0.98);
  const by = wy - 1 + Math.sin(ballA) * 6 * (dropped ? 0.82 : 0.98);
  px(g, bx - 1, by - 1, 3, 3, K);
  px(g, bx, by, 1, 1, T);
  if (dropped) pool(g, bx, by, 6, 3, Yl, 0.18 * ws.dropT);
  // The rim's bulbs: they chase at half HP (SPINS FASTER), a slow twinkle before.
  for (let j = 0; j < 12; j++) {
    const a = (j / 12) * Math.PI * 2;
    const step = Math.floor(t * (ws.fast ? 8 : 1.5));
    bulb(g, wx + Math.cos(a) * 34 - 1, wy + Math.sin(a) * 11 - 1, (j + step) % (ws.fast ? 3 : 5) === 0 ? 1 : 0);
  }
  // The chips on the layout (each glows as it lands; raked off after NO MORE BETS).
  for (const c of ws.chips) {
    const k2 = c.out === undefined ? 0 : 1 - Math.max(0, c.out);
    const dy = (TABLE - 4 - c.y) * k2;
    const x = c.x + (CX - 26 - c.x) * k2;
    const s = Math.max(2, Math.round(feltHalf(c.y) / 12));
    if (c.glow > 0) pool(g, x, c.y + dy, s + 4, s / 2 + 2, Yl, 0.18 * c.glow);
    px(g, x - s / 2 - 1, c.y + dy - 1, s + 2, Math.max(2, s / 2) + 2, K);
    px(g, x - s / 2, c.y + dy, s, Math.max(1, s / 2), c.c);
    px(g, x - s / 2, c.y + dy, s, 1, T);
  }
  // The table-limit placard, left: MIN 5 / MAX 500, then NO LIMIT (red) at half HP.
  const sx = 12;
  const sy = TABLE - 52;
  g.drawImage(F2.sign, sx, sy);
  if (ws.fast) {
    drawText(g, 'NO', sx + 30, sy + 15, 1, R, { outline: K });
    drawText(g, 'LIMIT', sx + 30, sy + 33, 1, Math.floor(t * 3) % 2 ? R : '#ff8a7a', { outline: K });
  } else {
    drawText(g, 'MIN 5', sx + 30, sy + 15, 1, G, { outline: K });
    drawText(g, 'MAX 500', sx + 30, sy + 33, 1, T, { outline: K });
  }
  // A high stool and a player at the table's side, right (a regular watching her table).
  px(g, 586, TABLE + 60, 26, 6, d);
  px(g, 597, TABLE + 66, 4, 90, k);
  px(g, 588, TABLE + 154, 22, 4, k);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wheelStill!, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

/** Drop the cached art (after a style toggle). */
export function floorRebuild(): void {
  stills.clear();
  wheelStill = null;
  figs = null;
}
