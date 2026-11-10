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
import { drawText, textWidth } from './text';
import { drawPatron, LOOKS, type PatronLook } from './patrons';

// ---- the projection (the street's: same eye level, same vanishing point) -------------------------------------------

const CX = 320;
const HOR = 140;
const EYE = 250;
/** The low ceiling. */
const CEIL = 560;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

/** The roulette pit's front at each station: the roulette table about a third of the open column wide at the first, the
 * whole column at the last (nearer each fight). */
const Z_FAR = [5.6, 4.2, 3.0, 1.9];
export const FLOOR_STATIONS = Z_FAR.length;

// The portraits' palette (as roomEntrance.ts) plus the casino's darks.
const K = '#140c1c';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const Yl = '#ffe08a';
const O = '#f07c1c';
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

/** The banks (the user, 2026-11-09: "the slots should be in horizontal rows facing the player"): rows of machines
 * running across the view, their fronts toward you, either side of the aisle to the pit, one behind another with a side
 * aisle between. Machines stand lower than your eye, so the banks behind show over the ones in front. */
const INNER = 150;
const MACH = 74;
const PER_BANK = 8;
/** A machine's depth (its side shows at the bank's aisle end). */
const MDEPTH = 0.3;
/** The stools stand this far in front of their machines. */
const STOOL = 0.2;

interface Station {
  /** The banks' depths, nearest first: two or three a side, out to the pit. */
  banks: number[];
  /** The area sign hanging over the aisle (null: none). */
  sign: { z: number; text: string } | null;
  /** A side aisle someone crosses (its depth; 0: nobody). */
  walkZ: number;
  /** The one thing you pass at this station: the velvet rope, the change machine, the drinks waitress, the pillars at
   * the pit's mouth. */
  mark: 'rope' | 'change' | 'waitress' | 'pillars';
}
const STATIONS: Station[] = [
  // (a) Just inside the doors: a velvet rope lines the aisle, SLOTS overhead, the table games small at its end.
  { banks: [1.4, 2.5, 3.6], sign: { z: 2.2, text: 'SLOTS' }, walkZ: 1.95, mark: 'rope' },
  // (b) Among the banks: a change machine at the aisle's edge.
  { banks: [1.3, 2.3, 3.2], sign: null, walkZ: 1.8, mark: 'change' },
  // (c) A drinks waitress in the aisle, the pit near.
  { banks: [1.25, 2.1], sign: null, walkZ: 1.68, mark: 'waitress' },
  // (d) The last banks, the pillars at the pit's mouth, the table games and THE WHEEL filling the view.
  { banks: [1.2, 1.6], sign: null, walkZ: 0, mark: 'pillars' },
];

/** Which station an act 2 fight sits at: the act's regular fights spread over the four, the last one always the end of
 * the rows (`i` this fight's index among the act's regulars, `n` how many there are). */
export function floorStation(i: number, n: number): number {
  if (n <= 1) return 0;
  return Math.max(0, Math.min(FLOOR_STATIONS - 1, Math.round((i * (FLOOR_STATIONS - 1)) / (n - 1))));
}

/** The banks' depths at a station, out to the pit. */
const bankDepths = (st: Station, _zFar: number) => st.banks;

// ---- the sign system ----------------------------------------------------------------------------------------------
/** One sign system for the casino, taken from act 1's casino marquee (roomEntrance.ts):
 * - Area signs (SLOTS, TABLE GAMES, BLACKJACK, ROULETTE): the marquee's dark red panel in the 1px outline, a one-pixel
 *   gold rim, gold letters outlined; all mounted with their panels between AREA_H0 and AREA_H1 and sized in world
 *   units, so they scale with the perspective (the letters step 1 -> 2 when the panel is tall enough). Bulbs chase round
 *   the important ones only (TABLE GAMES, ROULETTE: where you're going).
 * - Secondary labels (CHANGE, the pillar's plaque, the table limits): a dark plum panel, a dull brass rim, cream letters.
 * - The progressive jackpot: one board (a gold frame, black inside, PROGRESSIVE in gold, red LED digits) hanging over the
 *   roulette, so it grows with depth like everything else; its number ticks up a little each station. */
const AREA_H0 = 390;
const AREA_H1 = 470;
const areaW = (text: string) => text.length * 46 + 60;
const LABEL_BG = '#1a0e24';

/** An area sign's panel on a plane facing us at depth z, centred at lat (its letters and bulbs are live: areaLive). */
function areaPanel(g: CanvasRenderingContext2D, z: number, lat: number, text: string): void {
  const w = areaW(text);
  face(g, z, lat - w / 2, lat + w / 2, AREA_H0, AREA_H1, K, 1);
  face(g, z, lat - w / 2, lat + w / 2, AREA_H0, AREA_H1, d);
  rim(g, z, lat - w / 2, lat + w / 2, AREA_H0, AREA_H1, G);
}
/** A one-pixel rim round a panel facing us. */
function rim(g: CanvasRenderingContext2D, z: number, l0: number, l1: number, h0: number, h1: number, c: string): void {
  const x0 = Math.round(xAt(l0, z));
  const x1 = Math.round(xAt(l1, z));
  const y0 = Math.round(yAt(h1, z));
  const y1 = Math.round(yAt(h0, z));
  px(g, x0, y0, x1 - x0, 1, c);
  px(g, x0, y1 - 1, x1 - x0, 1, c);
  px(g, x0, y0, 1, y1 - y0, c);
  px(g, x1 - 1, y0, 1, y1 - y0, c);
}
/** An area sign's letters (gold; size 2 once the panel is tall enough) and, on the important ones, bulbs chasing round
 * its rim. Letters that wouldn't fit the panel read as a lit band of gold (too far to read, as a real sign). */
function areaLive(g: CanvasRenderingContext2D, z: number, lat: number, text: string, t: number, bulbs: boolean): void {
  const w = areaW(text) / z;
  const hPx = (AREA_H1 - AREA_H0) / z;
  const size = hPx >= 24 && textWidth(text, 2) <= w - 12 ? 2 : 1;
  const y = yAt((AREA_H0 + AREA_H1) / 2, z);
  const col = bulbs && Math.floor(t * 1.5) % 5 === 0 ? Yl : G;
  if (textWidth(text, size) <= w - 6) drawText(g, text, xAt(lat, z), y, size, col, { outline: K });
  else px(g, xAt(lat, z) - w * 0.36, y - Math.max(1, hPx * 0.18), w * 0.72, Math.max(1, hPx * 0.36), col);
  if (!bulbs) return;
  const x0 = xAt(lat - areaW(text) / 2, z);
  const n = Math.max(4, Math.floor(w / 7));
  for (let j = 0; j <= n; j++) {
    const x = x0 + (j * w) / n;
    const on = (j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0;
    const on2 = (n - j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0;
    if (hPx >= 14) {
      bulb(g, x - 1, yAt(AREA_H1, z) - 1, on);
      bulb(g, x - 1, yAt(AREA_H0, z) - 2, on2);
    } else {
      px(g, x, yAt(AREA_H1, z), 1, 1, on ? Y : g8);
      px(g, x, yAt(AREA_H0, z) - 1, 1, 1, on2 ? Y : g8);
    }
  }
}
/** A secondary label facing us: a dark panel, a brass rim, cream letters (if they fit). */
function label(g: CanvasRenderingContext2D, z: number, l0: number, l1: number, h0: number, h1: number, text: string): void {
  face(g, z, l0, l1, h0, h1, K, 1);
  face(g, z, l0, l1, h0, h1, LABEL_BG);
  rim(g, z, l0, l1, h0, h1, g8);
  if (textWidth(text, 1) <= (l1 - l0) / z - 4 && (h1 - h0) / z >= 10) drawText(g, text, xAt((l0 + l1) / 2, z), yAt((h0 + h1) / 2, z), 1, T, { outline: K });
}

/** The progressive board: hung over the roulette (zp), a gold frame, black inside; its letters and digits are live. */
const BOARD = { l: 250, h0: 448, h1: 556 };
/** The board's frame: the gold rim, a brass band, then the black face (world units in from the edge). */
const BOARD_RIM = 2;
const BOARD_IN = 4;
function boardPanel(g: CanvasRenderingContext2D, zp: number): void {
  for (const lat of [-170, 170]) face(g, zp, lat - 2, lat + 2, BOARD.h1, CEIL, k);
  face(g, zp, -BOARD.l, BOARD.l, BOARD.h0, BOARD.h1, K, 1);
  face(g, zp, -BOARD.l, BOARD.l, BOARD.h0, BOARD.h1, G);
  face(g, zp, -BOARD.l + BOARD_RIM, BOARD.l - BOARD_RIM, BOARD.h0 + BOARD_RIM, BOARD.h1 - BOARD_RIM, g8);
  face(g, zp, -BOARD.l + BOARD_IN, BOARD.l - BOARD_IN, BOARD.h0 + BOARD_IN, BOARD.h1 - BOARD_IN, '#0a0612');
}
/** The font's letter heights on the room's grid (7px glyphs: x1.3 at size 1, x2 at size 2), and their outline's. */
const TXT_H = { 1: 9.1, 2: 14 } as const;
const TXT_O = { 1: 1.3, 2: 2 } as const;
/** The board's rows: PROGRESSIVE on its own row and the number on its own, an equal gap above, between and below,
 * whenever the black face is tall enough for both; otherwise the number alone, centred. */
function boardLive(g: CanvasRenderingContext2D, zp: number, value: number, t: number): void {
  const hPx = (BOARD.h1 - BOARD.h0) / zp;
  const w = (2 * BOARD.l) / zp;
  const digits = `$${value.toLocaleString('en-US')}`;
  const yT = yAt(BOARD.h1 - BOARD_IN, zp);
  const yB = yAt(BOARD.h0 + BOARD_IN, zp);
  const face2 = yB - yT;
  // The same gap (at least 2px) above the label, between the rows (plus the two rows' outlines) and below the number.
  const PAD = 2;
  const need = (dSize: 1 | 2) => TXT_H[1] + TXT_H[dSize] + TXT_O[1] + TXT_O[dSize] + 3 * PAD;
  // (Big digits only when they and the label fit with the padding, and fit the open column between the HUDs too.)
  const big = face2 >= need(2) && textWidth(digits, 2) <= Math.min(w - 16, 100);
  const dSize = big ? 2 : 1;
  const dh = TXT_H[dSize];
  const head = face2 >= need(dSize);
  const col = Math.floor(t * 2) % 6 === 0 ? '#ff8a7a' : R;
  if (head) {
    const pad = (face2 - TXT_H[1] - dh - TXT_O[1] - TXT_O[dSize]) / 3;
    drawText(g, 'PROGRESSIVE', CX, yT + pad + TXT_H[1] / 2, 1, G, { outline: K });
    if (textWidth(digits, dSize) <= w - 8) drawText(g, digits, CX, yB - pad - dh / 2, dSize, col, { outline: K });
  } else if (textWidth(digits, 1) <= w - 8) drawText(g, digits, CX, (yT + yB) / 2, 1, col, { outline: K });
  // Its rim's bulbs (it's the casino's big prize), chasing.
  const n = Math.max(6, Math.floor(w / 8));
  for (let j = 0; j <= n; j++) {
    const x = xAt(-BOARD.l, zp) + (j * w) / n;
    const on = (j + Math.floor(t * 4)) % 3 === 0;
    if (hPx >= 20) bulb(g, x - 1, yAt(BOARD.h1, zp) - 1, on ? 1 : 0);
    else px(g, x, yAt(BOARD.h1, zp), 1, 1, on ? Y : g8);
  }
}

// ---- the landmarks you pass (one a station) -----------------------------------------------------------------------

const WAITRESS: PatronLook = { skin: '#c07a5c', hair: '#1a1014', coat: '#1e1a26', legs: '#1e1a26', hairStyle: 'bun' };
function drawMark(g: CanvasRenderingContext2D, st: Station, zFar: number): void {
  if (st.mark === 'rope') {
    // A velvet rope lines the aisle's first stretch: brass posts with ball tops, the red rope sagging between them.
    const posts = [1.15, 1.5, 1.85, 2.2];
    for (const side of [-1, 1]) {
      const lat = side * 112;
      for (let q = posts.length - 1; q >= 0; q--) {
        const z = posts[q];
        if (q < posts.length - 1) {
          const z2 = posts[q + 1];
          for (let n = 0; n <= 24; n++) {
            const u = n / 24;
            const zz = z + (z2 - z) * u;
            const hh = 82 - 16 * Math.sin(Math.PI * u);
            const w = Math.max(1, Math.round(5 / zz));
            px(g, xAt(lat, zz) - w / 2, yAt(hh, zz), w, Math.max(1, Math.round(7 / zz)), r);
            px(g, xAt(lat, zz) - w / 2, yAt(hh, zz) + Math.max(1, Math.round(7 / zz)), w, 1, '#3a0e20');
          }
        }
        face(g, z, lat - 4, lat + 4, 0, 90, K, 1);
        face(g, z, lat - 4, lat + 4, 0, 90, g8);
        face(g, z, lat - 4, lat - 1, 0, 90, G);
        face(g, z, lat - 12, lat + 12, 0, 6, g8);
        face(g, z, lat - 7, lat + 7, 88, 102, K, 1);
        face(g, z, lat - 7, lat + 7, 88, 102, G);
        face(g, z, lat - 6, lat - 1, 96, 101, Yl);
      }
    }
  } else if (st.mark === 'change') {
    // A change machine at the aisle's edge: a steel cabinet, a bill slot lit green, a brass coin tray, CHANGE over it.
    const z = 2.0;
    const l0 = -186;
    const l1 = -100;
    face(g, z, l0, l1, 0, 210, K, 1);
    face(g, z, l0, l1, 0, 210, '#2a2a3a');
    face(g, z, l0, l0 + 6, 0, 210, '#3e3e52');
    face(g, z, l1 - 8, l1, 0, 210, '#1e1e2a');
    face(g, z, l0 + 10, l1 - 10, 110, 150, '#0e0a18');
    face(g, z, l0 + 16, l1 - 16, 126, 132, '#3aa04a');
    face(g, z, l0 + 10, l1 - 10, 36, 56, g8);
    face(g, z, l0 + 10, l1 - 10, 54, 56, G);
    label(g, z, l0 - 8, l1 + 8, 166, 202, 'CHANGE');
  } else if (st.mark === 'waitress') {
    // A drinks waitress in the aisle with her tray (the patrons' standard).
    const z = 2.6;
    drawPatron(g, xAt(-62, z), yAt(0, z), 270 / z, WAITRESS, 'tray');
  } else {
    // Two marble pillars at the pit's mouth, brass bands, a plaque on the left one.
    const z = zFar - 0.04;
    for (const side of [-1, 1]) {
      const lat = side * 218;
      face(g, z, lat - 20, lat + 20, 0, CEIL, K, 1);
      face(g, z, lat - 20, lat + 20, 0, CEIL, '#3a3448');
      face(g, z, lat - 20, lat - 14, 0, CEIL, '#5a5468');
      face(g, z, lat + 12, lat + 20, 0, CEIL, '#2a2436');
      for (const h of [140, 260, 380]) face(g, z, lat - 14, lat + 8, h, h + 4, '#4a4458');
      for (const [h0, h1] of [[0, 16], [520, 540]]) {
        face(g, z, lat - 22, lat + 22, h0, h1, g8);
        face(g, z, lat - 22, lat + 22, h1 - 3, h1, G);
      }
    }
    label(g, z, -218 - 30, -218 + 30, 170, 214, 'PIT');
  }
}

// ---- the still layer: ceiling, carpet, the banks, the pit -------------------------------------------------------

function drawCeiling(g: CanvasRenderingContext2D, zEnd: number): void {
  const yEnd = Math.floor(yAt(CEIL, zEnd));
  for (let y = 0; y <= yEnd; y++) {
    const z = (CEIL - EYE) / (HOR - y - 0.5);
    const zn = (CEIL - EYE) / (HOR - y + 0.5);
    px(g, 0, y, RW, 1, CEIL_C);
    // Coffers every 0.5 of depth (a dark trim); a gold soffit line over the aisle's edges.
    if (Math.floor(z * 2) !== Math.floor(zn * 2)) px(g, 0, y, RW, 1, '#1c1230');
    for (const lat of [-INNER, INNER]) px(g, xAt(lat, z), y, Math.max(1, 10 / z), 1, g8);
    // Downlights in four rows, every 0.5 of depth: small stepped lamps (no glow).
    if (Math.floor(z * 2 + 0.5) !== Math.floor(zn * 2 + 0.5))
      for (const lat of [-560, -300, 300, 560]) {
        const w = Math.max(1, 10 / z);
        px(g, xAt(lat, z) - w / 2, y, w, Math.max(1, 3 / z), '#c9a46a');
      }
  }
}

function drawCarpet(g: CanvasRenderingContext2D, zFrom: number): void {
  for (let y = Math.ceil(yAt(0, zFrom)); y < RH; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    px(g, 0, y, RW, 1, CARPET);
    // The casino carpet: a lattice every 0.3 of depth and 60 across, gold dots at its knots.
    const band = Math.floor(z / 0.3);
    if (band !== Math.floor(zn / 0.3)) px(g, 0, y, RW, 1, CARPET_L);
    const u = (z / 0.3) % 1;
    const latL = (0 - CX) * z;
    const latR = (RW - CX) * z;
    for (let lat = Math.floor(latL / 60) * 60 + 30; lat < latR; lat += 60) {
      const off = (band % 2 ? 30 : 0) + (u - 0.5) * 30;
      px(g, xAt(lat + off, z), y, Math.max(1, 3 / z), 1, CARPET_L);
      if (Math.abs(u - 0.5) < 0.06) px(g, xAt(lat + (band % 2 ? 30 : 0), z), y, Math.max(1, 4 / z), 1, '#5a3a1a');
    }
    // The aisle's runner to the pit: a darker band between two gold lines.
    px(g, xAt(-110, z), y, 220 / z, 1, (Math.floor(z * 6) % 2 ? '#30102a' : '#2c0e26'));
    for (const lat of [-110, 110]) px(g, xAt(lat, z), y, Math.max(1, 4 / z), 1, '#5a3a1a');
  }
}

/** A pixel rect from world units on a plane facing us at depth z. */
function face(g: CanvasRenderingContext2D, z: number, l0: number, l1: number, h0: number, h1: number, c: string, grow = 0): void {
  const x0 = Math.round(xAt(l0, z)) - grow;
  const x1 = Math.round(xAt(l1, z)) + grow;
  const y0 = Math.round(yAt(h1, z)) - grow;
  const y1 = Math.round(yAt(h0, z)) + grow;
  px(g, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), c);
}
const shadeOf = (c: string, k2: number) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * k2))).toString(16).padStart(2, '0')).join('');

/** One slot machine's front at depth z (lat0 its left edge): cabinet, belly glass, button deck, the reel window with
 * its three reels, the cap, the topper's sign. Details drop out when it's too small to hold them. */
function machine(g: CanvasRenderingContext2D, lat0: number, z: number, m: number, side: number, late: number): void {
  const wPx = MACH / z;
  // The nearest banks are dimmer: they stand beside and behind the reels.
  const dim = z < 2.2 ? 0.66 : 1;
  const body = shadeOf(BODIES[(m + (side < 0 ? 0 : 2)) % BODIES.length], dim);
  const top = shadeOf(TOPS[(m * 3 + (side < 0 ? 1 : 0)) % TOPS.length], dim);
  const off = hash(m * 13 + Math.round(z * 10), side) < late * 0.8;
  const F2 = (a: number, b: number, h0: number, h1: number, c: string, grow = 0) => face(g, z, lat0 + a, lat0 + b, h0, h1, c, grow);
  // Outline, then the cabinet (lit on its left edge, shadowed on its right).
  F2(0, MACH, 0, 158, K, 1);
  F2(0, MACH, 0, 150, body);
  F2(MACH * 0.82, MACH, 10, 150, shadeOf(body, 0.75));
  F2(0, MACH * 0.08, 10, 150, shadeOf(body, 1.25));
  F2(0, MACH, 0, 10, '#0e0a14');
  F2(0, MACH, 148, 156, g8);
  F2(0, MACH, 155, 156, G);
  // The topper: a lit sign box on the cap (dark when the machine's off).
  F2(10, MACH - 10, 156, 198, K, 1);
  F2(10, MACH - 10, 158, 196, off ? '#24182c' : top);
  F2(10, MACH - 10, 186, 196, off ? '#24182c' : shadeOf(top, 1.3));
  if (wPx < 9) {
    F2(8, MACH - 8, 94, 140, off ? '#0e0a18' : '#2a2438');
    return;
  }
  // The reel window: a bezel, three reels with a symbol each (a seven, a bar, a cherry: fixed per machine and reel).
  F2(8, MACH - 8, 92, 142, K);
  F2(10, MACH - 10, 94, 140, off ? '#0e0a18' : '#3a3450');
  for (let w = 0; w < 3; w++) {
    const a = 10 + (w * (MACH - 20)) / 3;
    const b = 10 + ((w + 1) * (MACH - 20)) / 3;
    if (w) F2(a - 1, a + 1, 94, 140, K);
    if (!off) {
      const sym = ['#8e1f3a', '#8f5a1f', '#8e1f3a', '#3a6a3a'][(m * 5 + w * 3 + (side < 0 ? 0 : 1)) % 4];
      F2(a + (b - a) * 0.3, b - (b - a) * 0.3, 106, 128, sym);
    }
  }
  // The belly glass and the button deck (two buttons, lit unless the machine's off).
  F2(8, MACH - 8, 24, 68, '#1a1426');
  F2(8, MACH - 8, 64, 68, off ? '#1a1426' : shadeOf(top, 0.8));
  F2(4, MACH - 4, 74, 88, '#3a2d52');
  F2(4, MACH - 4, 87, 88, '#5a4d72');
  if (!off) {
    F2(14, 24, 88, 92, R);
    F2(MACH - 24, MACH - 14, 88, 92, '#3aa04a');
  }
}

/** A stool in front of a machine (lat its centre, z its depth): a padded seat, a shaded chrome pedestal, a flared foot. */
function stool(g: CanvasRenderingContext2D, lat: number, z: number): void {
  const dim = z < 2 ? 0.7 : 1;
  const S = (a: number, b: number, h0: number, h1: number, c: string, grow = 0) => face(g, z, lat + a, lat + b, h0, h1, c === K ? K : shadeOf(c, dim), grow);
  S(-16, 16, 0, 6, K, 1);
  S(-7, 7, 4, 66, K, 1);
  S(-22, 22, 64, 78, K, 1);
  S(-16, 16, 0, 6, '#2a2436');
  S(-7, 7, 4, 66, '#5a5268');
  S(-7, -4, 4, 66, '#8a82a0');
  S(3, 7, 4, 66, '#3a3448');
  S(-22, 22, 64, 78, d);
  S(-22, 22, 74, 78, r);
  S(-22, 22, 64, 67, '#3a0e20');
}

/** One bank (both sides at depth z): its machines, the side of its aisle end, the stools, the players on some of them. */
function drawBank(g: CanvasRenderingContext2D, si: number, z: number, b: number, late: number): void {
  for (const side of [-1, 1] as const) {
    // The bank's aisle end: the end machine's side, in perspective from its front back to MDEPTH.
    const xa = xAt(side * INNER, z);
    const xb = xAt(side * INNER, z + MDEPTH);
    for (let x = Math.round(Math.min(xa, xb)); x < Math.round(Math.max(xa, xb)); x++) {
      const zc = INNER / Math.abs(x + 0.5 - CX);
      px(g, x, yAt(158, zc), 1, yAt(0, zc) - yAt(158, zc), '#140e1e');
      px(g, x, yAt(158, zc), 1, Math.max(1, 8 / zc), g8);
      px(g, x, yAt(196, zc), 1, yAt(158, zc) - yAt(196, zc), '#1e1428');
    }
    for (let j = 0; j < PER_BANK; j++) {
      const lat0 = side < 0 ? -INNER - (j + 1) * MACH : INNER + j * MACH;
      if (xAt(lat0 + MACH, z) < -4 || xAt(lat0, z) > RW + 4) continue;
      machine(g, lat0, z, j + b * PER_BANK + si * 5, side, late);
    }
    // The stools, and a player on some (backs to us: they face their machines), mid-distance only.
    const zs = z - STOOL;
    for (let j = 0; j < PER_BANK; j++) {
      const c = side < 0 ? -INNER - (j + 0.5) * MACH : INNER + (j + 0.5) * MACH;
      if (xAt(c, zs) < -20 || xAt(c, zs) > RW + 20) continue;
      stool(g, c, zs);
      const h = 150 / zs;
      const n = j + b * 11 + (side < 0 ? 0 : 5) + si * 31;
      if (h < 20 || h > 80 || hash(n, 3) >= 0.5 * (1 - late)) continue;
      const pose = (['button', 'lean', 'cup'] as const)[Math.floor(hash(n, 5) * 3)];
      drawPatron(g, xAt(c, zs), yAt(76, zs), h, LOOKS[Math.floor(hash(n, 7) * LOOKS.length)], pose, hash(n, 9) < 0.5);
    }
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
function drawPit(g: CanvasRenderingContext2D, zFar: number, late: number, bare = false): void {
  const zw = zFar + 0.9;
  const s = 1 / zw;
  const X = (lat: number, z = zw) => Math.round(xAt(lat, z));
  const Yh = (h: number, z = zw) => Math.round(yAt(h, z));
  const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string, z = zw) => px(g, X(lat0, z), Yh(h1, z), X(lat1, z) - X(lat0, z), Yh(h0, z) - Yh(h1, z), c);
  // The back wall: panelled, a gold frieze, TABLE GAMES in gold (live), velvet drapes either side.
  wall(-4000, 4000, 0, CEIL, '#1c1228');
  for (let lat = -3960; lat < 4000; lat += 120) wall(lat, lat + 4, 0, CEIL, '#160e22');
  wall(-4000, 4000, 470, 480, g8);
  for (let lat = -3900; lat < 4000; lat += 580) if (Math.abs(lat) > 400) wall(lat, lat + 60, 0, 470, '#3e1226');
  if (!bare) {
    areaPanel(g, zw, 0, 'TABLE GAMES');
    for (const lat of [-760, 760, -1960, 1960]) areaPanel(g, zw, lat, 'BLACKJACK');
  }
  for (const side of [-1, 1]) wall(side < 0 ? -320 : 250, side < 0 ? -250 : 320, 0, 470, r);
  // The floor of the pit: the carpet stops at a brass strip, the pit's floor a shade lighter.
  const zt = zFar + 0.25;
  for (let y = Yh(0, zw); y < Yh(0, zFar); y++) px(g, 0, y, RW, 1, '#32162a');
  px(g, 0, Yh(0, zFar), RW, 1, g8);
  // A row of blackjack tables either side of the roulette, across the pit's whole width: each under its lamp, a dealer
  // behind, players on stools (fewer late at night); BLACKJACK on the wall over each side.
  for (const side of [-1, 1]) {
    for (let n = 0; n < 7; n++) {
      const lat = side * (240 + n * 300);
      const z1 = zFar + 0.35;
      if (xAt(lat + 80, z1) < -10 || xAt(lat - 80, z1) > RW + 10) continue;
      person(g, lat, z1 + 0.2, '#1e1a26', '#2a1a14');
      wall(lat - 2, lat + 2, 330, CEIL, k, z1);
      wall(lat - 36, lat + 36, 300, 318, K, z1);
      wall(lat - 34, lat + 34, 302, 316, g8, z1);
      wall(lat - 34, lat + 34, 302, 304, G, z1);
      wall(lat - 24, lat + 24, 296, 300, '#ffe08a', z1);
      wall(lat - 70, lat + 70, 0, 95, WOOD_D, z1);
      wall(lat - 70, lat + 70, 95, 110, WOOD, z1);
      wall(lat - 64, lat + 64, 102, 108, FELT, z1);
      const n2 = n * 2 + (side < 0 ? 0 : 20);
      const looks = [['#3a4a7a', '#2a1a14'], ['#6a3a5a', '#c8c0d0'], ['#5a2a2a', '#3a2a1a'], ['#2a4a3a', '#8a3418']];
      if (hash(n2, 7) >= late) person(g, lat - 40, z1 - 0.12, looks[n2 % 4][0], looks[n2 % 4][1], true);
      if (hash(n2 + 1, 9) >= late * 1.2) person(g, lat + 40, z1 - 0.12, looks[(n2 + 1) % 4][0], looks[(n2 + 1) % 4][1], true);
    }
  }
  // THE WHEEL behind it (her red hair, the green eyeshade, the green jacket with its white shirt front).
  const zh = zt + 0.45;
  const zp = zh + 0.3;
  const here = late < 0.9;
  if (here) person(g, 0, zp, '#2a7a3a', '#c0502a');
  const P = (dx0: number, dx1: number, h0: number, h1: number, c: string) => px(g, X(dx0, zp), Yh(h1, zp), Math.max(1, X(dx1, zp) - X(dx0, zp)), Math.max(1, Yh(h0, zp) - Yh(h1, zp)), c);
  if (here) {
    P(-4, 4, 196, 232, T);
    P(-16, 16, 258, 266, '#5ad65a');
    P(-18, 18, 256, 259, '#2a8a3a');
  }
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
  // The pit's lamp over the roulette table (its light is live), and the progressive board hanging in front of it.
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

/** ENDLESS, THE DOORMAN's loop: the aisle's end is the casino's way out, not the pit. The lobby's back wall across the
 * view, the gilded double doors in it (the night street through their glass), EXIT over them (its letters are live),
 * a brass rail either side. */
function drawExit(g: CanvasRenderingContext2D, zFar: number): void {
  const zw = zFar + 0.9;
  const X = (lat: number, z = zw) => Math.round(xAt(lat, z));
  const Yh = (h: number, z = zw) => Math.round(yAt(h, z));
  const wall = (lat0: number, lat1: number, h0: number, h1: number, c: string, z = zw) => px(g, X(lat0, z), Yh(h1, z), X(lat1, z) - X(lat0, z), Yh(h0, z) - Yh(h1, z), c);
  wall(-4000, 4000, 0, CEIL, '#1c1220');
  for (let lat = -3960; lat < 4000; lat += 160) wall(lat, lat + 6, 0, CEIL, '#160e1a');
  wall(-4000, 4000, 470, 480, g8);
  wall(-4000, 4000, 90, 96, g8);
  for (let y = Yh(0, zw); y < Yh(0, zFar); y++) px(g, 0, y, RW, 1, '#262236');
  px(g, 0, Yh(0, zFar), RW, 1, g8);
  // The doors: a gold frame, two leaves of clear glass on the night (a lamp's orange through them), the push bars.
  wall(-140, 140, 0, 330, G);
  wall(-132, 132, 0, 322, '#0d0519');
  wall(-132, 132, 0, 110, '#17122a');
  wall(-96, -84, 110, 250, '#2a2238');
  wall(-100, -80, 250, 270, O);
  for (const side of [-1, 1]) {
    const a = side < 0 ? -132 : 2;
    wall(a, a + 130, 300, 322, g8);
    wall(a, a + 130, 0, 30, g8);
    wall(a, a + 8, 0, 322, g8);
    wall(a + 122, a + 130, 0, 322, g8);
    wall(side < 0 ? a + 104 : a + 14, side < 0 ? a + 114 : a + 24, 130, 190, G);
  }
  wall(-2, 2, 0, 330, G);
  // EXIT over them (the sign system's panel; the letters are live).
  areaPanel(g, zw, 0, 'EXIT');
  // Brass rails and velvet ropes leading to the doors.
  for (const side of [-1, 1]) for (let lat = 180; lat < 900; lat += 180) wall(side * lat - 6, side * lat + 6, 0, 100, G, zFar + 0.5);
}

const stills = new Map<string, HTMLCanvasElement>();
function still(i: number, late: number, exit = false, bare = false): HTMLCanvasElement {
  const key = `${i}:${late.toFixed(2)}:${exit ? 'x' : 'p'}:${bare ? 'b' : ''}`;
  const hit = stills.get(key);
  if (hit) return hit;
  const [cv, g] = mk(RW, RH);
  const zFar = Z_FAR[i];
  const st = STATIONS[i];
  px(g, 0, 0, RW, RH, '#0e0916');
  if (exit) drawExit(g, zFar);
  else drawPit(g, zFar, late, bare);
  drawCeiling(g, zFar + 0.9);
  // (The board hangs from the ceiling, in front of it: drawn after it, or the ceiling hid its top rows.)
  if (!exit && !bare) boardPanel(g, zFar + 0.45);
  drawCarpet(g, zFar);
  // The banks, far to near (each hides what's below its top behind it), the cage among them, the sign overhead.
  const banks = bankDepths(st, zFar);
  for (let b = banks.length - 1; b >= 0; b--) drawBank(g, i, banks[b], b, late);
  drawMark(g, st, zFar);
  if (st.sign) areaPanel(g, st.sign.z, 0, st.sign.text);
  stills.set(key, cv);
  return cv;
}

// ---- the live layer: toppers' bulbs, the sign, the jackpot board, the wheel's pockets and lamp ----------------------

const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

export interface FloorScene {
  /** The station (0 just inside the doors .. 3 the end of the rows). */
  station: number;
  time: number;
  /** ENDLESS hook: 0 early in the night, 1 closing time (machines dark, seats empty, darker). */
  late?: number;
  /** ENDLESS, THE DOORMAN's loop: the aisle leads to the casino's doors (EXIT), not the pit. */
  exit?: boolean;
  /** ENDLESS, THE OWNER's room: the floor with its signs and board dark (his own board hangs over him). */
  bare?: boolean;
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

/** Draw the casino floor at a station (the still layer cached; the toppers, the signs, a walker, the wheel live). */
export function drawFloorStation(ctx: CanvasRenderingContext2D, o: FloorScene): void {
  const i = Math.max(0, Math.min(FLOOR_STATIONS - 1, o.station));
  const late = o.late ?? 0;
  const t = o.time;
  const zFar = Z_FAR[i];
  const st = STATIONS[i];
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const banks = bankDepths(st, zFar);

  // TABLE GAMES over the pit, the roulette wheel turning slowly, the lamp's stepped light on its felt (ENDLESS,
  // THE DOORMAN's loop: EXIT over the casino's doors instead).
  const zw = zFar + 0.9;
  if (o.bare) {
    // (THE OWNER's room: the floor's signs and board are dark tonight.)
  } else if (o.exit) {
    areaLive(g, zw, 0, 'EXIT', t, true);
    if (st.sign) areaLive(g, st.sign.z, 0, st.sign.text, t, false);
  } else {
    areaLive(g, zw, 0, 'TABLE GAMES', t, true);
    for (const lat of [-760, 760, -1960, 1960]) if (xAt(lat, zw) > -60 && xAt(lat, zw) < RW + 60) areaLive(g, zw, lat, 'BLACKJACK', t, false);
    boardLive(g, zFar + 0.45, 1048200 + i * 1375 + Math.floor(t * 3), t);
    if (st.sign) areaLive(g, st.sign.z, 0, st.sign.text, t, false);
    const zh = zFar + 0.7;
    const rx = Math.max(3, Math.round(70 / zh));
    const ry = Math.max(1, Math.round(rx * 0.3));
    wheelPockets(g, CX, yAt(118, zh), rx, ry, t * 0.6, null);
    if (late < 0.9) pool(g, CX, yAt(116, zFar + 0.45), 110 / zh, 30 / zh, Yl, 0.16);
  }

  // Someone crossing a side aisle (behind the bank in front of it: only what shows over its toppers).
  if (st.walkZ > 0 && late < 0.9) {
    const zw2 = st.walkZ;
    const front = banks.filter((z) => z < zw2).pop();
    const lat = -760 + ((t * 38) % 1520);
    const h = 270 / zw2;
    g.save();
    if (front !== undefined) {
      g.beginPath();
      g.rect(0, 0, RW, Math.round(yAt(198, front)));
      g.clip();
    }
    drawPatron(g, xAt(lat, zw2), yAt(0, zw2), h, LOOKS[(i * 3 + 1) % LOOKS.length], Math.floor(t * 3) % 2 ? 'walk0' : 'walk1');
    g.restore();
  }

  // The toppers' bulbs: three on each lit topper, blinking slowly out of step (none on dark machines).
  banks.forEach((z, b) => {
    for (const side of [-1, 1] as const) {
      for (let j = 0; j < PER_BANK; j++) {
        const lat0 = side < 0 ? -INNER - (j + 1) * MACH : INNER + j * MACH;
        const m = j + b * PER_BANK + i * 5;
        if (hash(m * 13 + Math.round(z * 10), side) < late * 0.8) continue;
        for (let q = 0; q < 3; q++) {
          const x = Math.round(xAt(lat0 + 18 + q * ((MACH - 36) / 2), z));
          if (x < 0 || x > RW) continue;
          const on = Math.sin(t * 1.4 + m * 2.1 + q * 2.1 + side) > 0.45;
          px(g, x - (MACH / z >= 18 ? 1 : 0), Math.round(yAt(198, z)) - 1, MACH / z >= 18 ? 2 : 1, MACH / z >= 18 ? 2 : 1, on ? Y : g8);
        }
        // Now and then a machine pays: its reel window a step brighter for a moment (no glow, no flash).
        if (b === 0 && Math.sin(t * 0.6 + m * 3.7 + side * 5 + z) > 0.985) {
          g.globalAlpha = 0.3;
          face(g, z, lat0 + 10, lat0 + MACH - 10, 94, 140, Yl);
          g.globalAlpha = 1;
        }
      }
    }
  });

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still(i, late, !!o.exit, !!o.bare), 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  if (late > 0) {
    ctx.fillStyle = `rgba(4,2,8,${0.35 * late})`;
    ctx.fillRect(0, 0, RW * 2, RH * 2);
  }
  ctx.restore();
}

// ---- THE WHEEL's room: her table, straight on ------------------------------------------------------------------

/** The table's head and the floor's line (the felt runs toward us from here): the wheel, the room's star, sits big and
 * central on it in the open column between the gutter's BOSS chip and THE TABLE panel, THE WHEEL behind it. */
const TABLE = 70;
/** The felt's vanishing line (it widens toward us from the table's head, staying inside the reels' span). */
const HORIZON = 14;

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
  const sign = outlined(64, 120, (c) => {
    px(c, 30, 52, 4, 64, g8);
    px(c, 30, 52, 1, 64, G);
    px(c, 22, 114, 20, 6, g8);
    px(c, 0, 0, 64, 52, g8);
    px(c, 1, 1, 62, 50, '#1a0e24');
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
const feltHalf = (y: number) => Math.round((44 * (y - HORIZON)) / (TABLE - HORIZON));

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
      const y = TABLE + 44 + ((j * 37) % 96);
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
  px(g, 251, 1, 138, 26, K);
  px(g, 252, 2, 136, 24, d);
  px(g, 252, 2, 136, 1, G);
  px(g, 252, 25, 136, 1, G);
  px(g, 252, 2, 1, 24, G);
  px(g, 387, 2, 1, 24, G);
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
  /** ENDLESS: how late the night is (her room darker, the floor behind her emptier). */
  late?: number;
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
  drawText(g, 'ROULETTE', CX, 14, 1, Math.floor(t * 1.5) % 5 === 0 ? Yl : G, { outline: K });
  for (let j = 0; j <= 16; j++) {
    bulb(g, 252 + j * 8.3 - 1, 1, (j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0);
    bulb(g, 252 + j * 8.3 - 1, 24, (16 - j + Math.floor(t * 5)) % 3 === 0 ? 1 : 0);
  }
  // The two lamps over the table (they swing when she's hit), their stepped light on the felt.
  const swing = ws.hitT > 0 ? Math.sin(t * 9) * 4 * ws.hitT : Math.sin(t * 0.8) * 0.6;
  for (const lx of [214, 426]) {
    const x = Math.round(lx + swing);
    px(g, lx, 0, 1, 30, k);
    px(g, x - 14, 30, 28, 8, K);
    px(g, x - 13, 31, 26, 6, g8);
    px(g, x - 13, 31, 26, 1, G);
    px(g, x - 9, 37, 18, 2, Yl);
    pool(g, x + (CX - x) * 0.4, TABLE + 6, 40, 8, Yl, 0.12);
  }
  // THE WHEEL behind her wheel (her arm out over it while she places bets; a flinch when she's hit): her waist at the
  // table's top, the apron in front of her, the wheel in front of that.
  const fig = ws.dealT > 0 ? F2.deal : F2.idle;
  g.drawImage(fig, CX - 13 + (ws.hitT > 0.6 ? 1 : 0), TABLE - 28);
  px(g, CX - 64, TABLE - 4, 128, 10, WOOD_D);
  px(g, CX - 64, TABLE - 4, 128, 1, G);
  px(g, CX - 64, TABLE + 5, 128, 1, K);
  // The wheel's bowl on the table's head, big and central: the wooden housing, the ring of pockets turning with the
  // gutter's wheel, the cone, the ball (counter to the wheel; dropped in its pocket after NO MORE BETS).
  const wx = CX;
  const wy = TABLE + 6;
  ellipse(g, wx, wy, 48, 15, K);
  ellipse(g, wx, wy, 47, 14, WOOD_D);
  ellipse(g, wx, wy - 1, 43, 12, WOOD);
  ellipse(g, wx, wy - 1, 38, 10, '#2a1a10');
  const dropped = ws.dropT > 0;
  const ballA = dropped ? o.angle + (ws.pocket / 18) * Math.PI * 2 : -o.angle * 1.7;
  wheelPockets(g, wx, wy - 1, 38, 10, o.angle, null);
  const bx = wx + Math.cos(ballA) * 38 * (dropped ? 0.82 : 0.98);
  const by = wy - 1 + Math.sin(ballA) * 10 * (dropped ? 0.82 : 0.98);
  px(g, bx - 1, by - 1, 4, 4, K);
  px(g, bx, by, 2, 2, T);
  if (dropped) pool(g, bx, by, 8, 4, Yl, 0.18 * ws.dropT);
  // The rim's bulbs: they chase at half HP (SPINS FASTER), a slow twinkle before.
  for (let j = 0; j < 16; j++) {
    const a = (j / 16) * Math.PI * 2;
    const step = Math.floor(t * (ws.fast ? 8 : 1.5));
    bulb(g, wx + Math.cos(a) * 52 - 1, wy + Math.sin(a) * 17 - 1, (j + step) % (ws.fast ? 3 : 5) === 0 ? 1 : 0);
  }
  // The chips on the layout (each glows as it lands; raked off after NO MORE BETS).
  for (const c of ws.chips) {
    const k2 = c.out === undefined ? 0 : 1 - Math.max(0, c.out);
    const dy = (TABLE + 6 - c.y) * k2;
    const x = c.x + (CX - c.x) * k2;
    const s = Math.max(2, Math.round(feltHalf(c.y) / 12));
    if (c.glow > 0) pool(g, x, c.y + dy, s + 4, s / 2 + 2, Yl, 0.18 * c.glow);
    px(g, x - s / 2 - 1, c.y + dy - 1, s + 2, Math.max(2, s / 2) + 2, K);
    px(g, x - s / 2, c.y + dy, s, Math.max(1, s / 2), c.c);
    px(g, x - s / 2, c.y + dy, s, 1, T);
  }
  // The table-limit placard, left: MIN 5 / MAX 500, then NO LIMIT (red) at half HP.
  const sx = 12;
  const sy = 128;
  g.drawImage(F2.sign, sx, sy);
  if (ws.fast) {
    drawText(g, 'NO', sx + 33, sy + 15, 1, R, { outline: K });
    drawText(g, 'LIMIT', sx + 33, sy + 33, 1, Math.floor(t * 3) % 2 ? R : '#ff8a7a', { outline: K });
  } else {
    drawText(g, 'MIN 5', sx + 33, sy + 15, 1, T, { outline: K });
    drawText(g, 'MAX 500', sx + 33, sy + 33, 1, T, { outline: K });
  }
  // A high stool and a player at the table's side, right (a regular watching her table).
  px(g, 586, TABLE + 60, 26, 6, d);
  px(g, 597, TABLE + 66, 4, 90, k);
  px(g, 588, TABLE + 154, 22, 4, k);

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wheelStill!, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  // ENDLESS: later in the night, a flat darker step over the room (not over her: she's still at work).
  if ((o.late ?? 0) > 0) {
    ctx.fillStyle = `rgba(4,2,8,${0.3 * (o.late ?? 0)})`;
    ctx.fillRect(0, 0, RW * 2, Math.round((TABLE - 50) * 2));
    ctx.fillRect(0, Math.round((TABLE - 50) * 2), Math.round(236 * 2), RH * 2);
    ctx.fillRect(Math.round(404 * 2), Math.round((TABLE - 50) * 2), RW * 2, RH * 2);
  }
  ctx.restore();
}

/** Drop the cached art (after a style toggle). */
export function floorRebuild(): void {
  stills.clear();
  wheelStill = null;
  figs = null;
}
