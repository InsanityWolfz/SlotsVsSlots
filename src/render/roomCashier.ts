/**
 * THE CASHIER'S COUNTERS (the user, 2026-11-10: "everything else is a go"). One Cashier, a different counter in each
 * act, the screen's layout unchanged (his well top left, the two shelves, the glass case, REROLL and LEAVE):
 * - act 1, 'pawn': the pawn shop on the street: a barred window on the rain, a neon OPEN, pawned goods on the
 *   pegboard (a guitar, a trumpet, a pocket watch) with their tags, jewellery in the case, a wood counter and its bell;
 * - act 2, 'cage': the casino's cashier cage: brass bars, a CASHIER sign in the casino's sign style (roomCasinoFloor's
 *   area signs: a dark red panel, a gold rim, gold letters), chip racks and cash drawers, a marble counter;
 * - act 3, 'highlimit': the high-limit cage: walnut and velvet, brass, the private window's arch, plaques of chips;
 * - ENDLESS, 'closing': act 2's cage at closing time (lateness by loop, as roomEndless): the lights going off a bank at
 *   a time, the racks emptying, a CLOSING sign on the bars, the till open on the counter while he counts it.
 * Drawn like the rooms: a 640x360 grid at 2 screen pixels an art pixel, the portraits' palette and 1px outline, stepped
 * light, no gradients. The shelves' items sit in the middle; the scenery lives in the outer strips and the top band,
 * and everything behind the cards stays dark and calm. A static layer is cached per counter (and lateness step); the
 * few moving things (the rain, the neon's flicker, the glass's sheen, the swinging sign, the counted bills) are drawn
 * each frame on a second small layer.
 */
import { endlessLate } from './roomEndless';
import { bulb, mk, outlined, px, RH, RW } from './roomEntrance';
import { drawText, textWidth } from './text';

/** Grid text at one font pixel an art pixel: 14 screen pixels tall, above the Deck's floor (text.ts lifts an exact 1 to
 * 1.3 for screen text, which would blur on the 2x grid). */
const ONE = 1 + 1e-6;

export type CashierVenue = 'pawn' | 'cage' | 'highlimit' | 'closing';

/** The counter for a run: its act, or ENDLESS's closing cage (and how late it is, 0-1). */
export function cashierVenue(run: { act: number; endless?: { loop: number } }): { venue: CashierVenue; late: number } {
  if (run.endless && run.endless.loop > 0) return { venue: 'closing', late: endlessLate(run.endless.loop) };
  return { venue: run.act >= 3 ? 'highlimit' : run.act === 2 ? 'cage' : 'pawn', late: 0 };
}

// The portraits' palette (as the rooms) plus the counters' woods, brass and stone.
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
const GR = '#3f8f4f';
const GRd = '#24572f';
const PU = '#7a4bb0';

/** The layout this draws round, in grid pixels (the screen's / 2): the shelves' back wall, the planks, the glass case,
 * the items' span (centred on the shelves; up to four on the counter row), and the outer strips that stay free. */
const WALL = { x0: 165, x1: 631, y0: 75, y1: 284 };
const PLANK = [133, 240];
const GLASS = { x0: 171, x1: 625, y0: 175, y1: 259 };
const STRIP_L = [168, 233];
const STRIP_R = [563, 628];
/** The Cashier's well (drawn by the screen on top), the title's line. */
const WELL = { x0: 167, x1: 225, y0: 9, y1: 67 };

interface Style {
  band: string;
  bandLine: string;
  wall: string;
  wallLine: string;
  plank: [string, string, string];
  glassFrame: string;
  glassTop: string;
  glass: string;
  sheen: string;
}
const STYLES: Record<CashierVenue, Style> = {
  pawn: { band: '#1c1520', bandLine: '#241a28', wall: '#2a1c16', wallLine: '#1c120d', plank: ['#5a3418', '#8a5a2e', '#b07a42'], glassFrame: '#3a2010', glassTop: G, glass: '#160f22', sheen: '#221a34' },
  cage: { band: '#170c20', bandLine: '#1f1129', wall: '#1d1420', wallLine: '#140c18', plank: [g8, G, Yl], glassFrame: g8, glassTop: G, glass: '#140d22', sheen: '#201834' },
  highlimit: { band: '#1a0a14', bandLine: '#230d1a', wall: '#21140f', wallLine: '#160d09', plank: ['#3a2416', '#5e3a22', G], glassFrame: G, glassTop: Yl, glass: '#160c1c', sheen: '#24162c' },
  closing: { band: '#140a1c', bandLine: '#1a0f24', wall: '#191119', wallLine: '#110a13', plank: [g8, G, Yl], glassFrame: g8, glassTop: G, glass: '#120b1e', sheen: '#1c1430' },
};

// ---- small sprites (outlined) ---------------------------------------------------------------------------------------

const spr = new Map<string, HTMLCanvasElement>();
const once = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  let c = spr.get(key);
  if (!c) spr.set(key, (c = outlined(w, h, draw)));
  return c;
};

/** An electric guitar hanging by its head (neck up), its red body, pickguard, pickups and strings. */
const guitar = () =>
  once('guitar', 30, 54, (g) => {
    px(g, 12, 0, 6, 8, '#5e3a22');
    for (const yy of [1, 4]) {
      px(g, 10, yy, 2, 2, l);
      px(g, 18, yy + 1, 2, 2, l);
    }
    px(g, 13, 8, 4, 22, '#8a5a2e');
    px(g, 13, 8, 1, 22, '#b07a42');
    for (let y = 11; y < 30; y += 4) px(g, 13, y, 4, 1, g8);
    // The body: an upper bout, a waist, a lower bout.
    px(g, 6, 28, 18, 10, R);
    px(g, 3, 36, 24, 15, R);
    px(g, 5, 34, 20, 4, R);
    px(g, 5, 51, 20, 2, R);
    px(g, 6, 28, 3, 25, r);
    px(g, 3, 38, 3, 12, r);
    px(g, 18, 33, 5, 9, '#f4b8b8');
    px(g, 11, 39, 8, 2, K);
    px(g, 11, 44, 8, 2, K);
    px(g, 12, 49, 6, 1, l);
    for (const sx of [14, 16]) px(g, sx, 8, 1, 42, '#c9c3d6');
    px(g, 22, 47, 3, 3, l);
  });
/** A trumpet, side on, its bell to the right. */
const trumpet = () =>
  once('trumpet', 46, 16, (g) => {
    px(g, 0, 6, 4, 3, G);
    px(g, 4, 7, 26, 2, G);
    px(g, 10, 2, 16, 2, G);
    px(g, 10, 2, 2, 7, G);
    px(g, 24, 2, 2, 7, G);
    for (const x of [15, 18, 21]) px(g, x, 0, 2, 7, Yl);
    px(g, 30, 5, 4, 6, G);
    px(g, 34, 3, 6, 10, G);
    px(g, 40, 1, 6, 14, G);
    px(g, 42, 3, 2, 10, g8);
    px(g, 4, 8, 26, 1, g8);
  });
/** A pocket watch on its chain. */
const watch = () =>
  once('watch', 14, 20, (g) => {
    px(g, 6, 0, 2, 5, G);
    px(g, 5, 5, 4, 2, G);
    px(g, 2, 7, 10, 12, G);
    px(g, 1, 9, 12, 8, G);
    px(g, 3, 8, 8, 10, T);
    px(g, 2, 10, 10, 6, T);
    px(g, 7, 10, 1, 4, K);
    px(g, 7, 13, 3, 1, K);
    px(g, 2, 17, 10, 1, g8);
  });
/** A radio on the little shelf: a box, its speaker grille and dial. */
const radio = () =>
  once('radio', 32, 20, (g) => {
    px(g, 6, 0, 1, 4, l);
    px(g, 0, 4, 32, 16, '#5e3a22');
    px(g, 0, 4, 32, 2, '#8a5a2e');
    px(g, 2, 8, 16, 10, '#3a2010');
    for (let y = 9; y < 18; y += 2) px(g, 3, y, 14, 1, '#24140a');
    px(g, 21, 8, 9, 4, Yl);
    px(g, 24, 8, 1, 4, R);
    px(g, 22, 14, 3, 3, l);
    px(g, 27, 14, 3, 3, l);
  });
/** A paper tag on its string (the string runs up to its peg), a pencil scribble on it, no number (the user: numbers on
 * the scenery read like the shelf's real prices). */
function tag(g: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  px(g, x + 2, y - 4, 1, 4, R);
  px(g, x, y, w + 2, 9, K);
  px(g, x + 1, y + 1, w, 7, '#b8ad9a');
  for (let i = 0; i < w - 6; i += 2) px(g, x + 4 + i, y + 4 + (i % 4 === 0 ? 0 : 1), 2, 1, '#6d6482');
}
/** The case's pawned jewellery: a velvet bust wearing a gold chain, an open ring box, a wristwatch on its cushion. */
const bust = () =>
  once('bust', 24, 40, (g) => {
    px(g, 8, 0, 8, 10, '#3a2a48');
    px(g, 6, 8, 12, 6, '#3a2a48');
    px(g, 2, 14, 20, 26, '#3a2a48');
    px(g, 0, 20, 24, 20, '#3a2a48');
    px(g, 3, 15, 4, 20, '#4e3c60');
    px(g, 9, 1, 2, 8, '#4e3c60');
    for (let i = 0; i <= 12; i++) px(g, 6 + i, 16 + Math.round(5 * Math.sin((i / 12) * Math.PI)), 1, 1, G);
    px(g, 11, 22, 2, 3, G);
    px(g, 11, 25, 2, 2, R);
  });
const ringBox = () =>
  once('ringbox', 22, 18, (g) => {
    px(g, 0, 0, 22, 7, d);
    px(g, 1, 1, 20, 5, '#2a0a18');
    px(g, 0, 7, 22, 11, d);
    px(g, 2, 8, 18, 4, '#2a0a18');
    px(g, 7, 6, 8, 7, G);
    px(g, 9, 8, 4, 3, '#2a0a18');
    px(g, 9, 3, 4, 3, B);
    px(g, 10, 3, 1, 1, '#ffffff');
  });
const wristwatch = () =>
  once('wristwatch', 26, 18, (g) => {
    px(g, 0, 10, 26, 8, d);
    px(g, 0, 10, 26, 1, r);
    px(g, 2, 7, 22, 4, '#3a2010');
    px(g, 8, 2, 10, 11, G);
    px(g, 9, 3, 8, 9, T);
    px(g, 13, 4, 1, 4, K);
    px(g, 13, 7, 3, 1, K);
  });
/** A yellow mop bucket on castors, its wringer, the mop standing in it. */
const mopBucket = () =>
  once('mop', 40, 52, (g) => {
    for (let i = 0; i < 30; i++) px(g, 24 - Math.round(i * 0.4), i, 2, 1, '#8a5a2e');
    px(g, 6, 24, 28, 20, '#d9b52a');
    px(g, 7, 44, 26, 2, '#d9b52a');
    px(g, 6, 24, 28, 2, '#ffe08a');
    px(g, 6, 34, 28, 2, '#a8861a');
    px(g, 2, 28, 4, 4, '#d9b52a');
    px(g, 20, 18, 14, 8, l);
    px(g, 20, 18, 14, 1, '#c9c3d6');
    px(g, 22, 22, 10, 2, k);
    for (let x = 8; x < 20; x += 2) px(g, x, 20, 1, 6, T);
    for (const x of [8, 30]) {
      px(g, x, 46, 4, 4, k);
      px(g, x + 1, 47, 2, 2, l);
    }
  });
/** A chip rack: columns of chips seen from the side, each chip two rows of its colour and a darker edge, the white
 * edge spots of a casino chip on its top row. */
function chipColumn(g: CanvasRenderingContext2D, x: number, y: number, h: number, c: string, c2: string): void {
  if (h <= 0) return;
  px(g, x, y - h * 3 - 1, 12, h * 3 + 1, K);
  for (let i = 0; i < h; i++) {
    const cy = y - (i + 1) * 3;
    px(g, x + 1, cy, 10, 2, c);
    px(g, x + 1, cy + 2, 10, 1, c2);
    px(g, x + 2, cy, 2, 1, T);
    px(g, x + 8, cy, 2, 1, T);
  }
}
/** A banded bundle of bills, end on. */
function bundle(g: CanvasRenderingContext2D, x: number, y: number): void {
  px(g, x, y, 16, 8, K);
  px(g, x + 1, y + 1, 14, 6, '#5a8a4a');
  px(g, x + 1, y + 1, 14, 1, '#8ac06a');
  px(g, x + 6, y + 1, 3, 6, T);
}
/** A chip plaque (the high limit's rectangular chips), its value. */
function plaque(g: CanvasRenderingContext2D, x: number, y: number, c: string, v: string): void {
  px(g, x, y, 22, 12, K);
  px(g, x + 1, y + 1, 20, 10, c);
  px(g, x + 2, y + 2, 18, 8, T);
  drawText(g, v, x + 11, y + 6, ONE, K, { outline: null });
}
/** A big chip in a shadow box (a gold frame, velvet). */
function chipBox(g: CanvasRenderingContext2D, x: number, y: number, c: string, v: string): void {
  px(g, x, y, 34, 34, K);
  px(g, x + 1, y + 1, 32, 32, G);
  px(g, x + 3, y + 3, 28, 28, g8);
  px(g, x + 4, y + 4, 26, 26, d);
  const cx = x + 17;
  const cy = y + 17;
  for (let yy = -10; yy <= 10; yy++) {
    const hw = Math.floor(Math.sqrt(110 - yy * yy));
    px(g, cx - hw, cy + yy, hw * 2, 1, K);
    if (Math.abs(yy) < 10) {
      const iw = Math.max(0, hw - 1);
      px(g, cx - iw, cy + yy, iw * 2, 1, c);
    }
  }
  for (const [ex, ey] of [[0, -9], [0, 8], [-9, 0], [8, 0]]) px(g, cx + ex, cy + ey, 2, 2, T);
  for (let yy = -5; yy <= 5; yy++) {
    const hw = Math.floor(Math.sqrt(30 - yy * yy));
    px(g, cx - hw, cy + yy, hw * 2, 1, T);
  }
  drawText(g, v, cx, cy, ONE, K, { outline: null });
}

// ---- the static layer ----------------------------------------------------------------------------------------------

/** The casino's area sign (roomCasinoFloor's system: a dark red panel in the 1px outline, a gold rim, gold letters). */
function areaSign(g: CanvasRenderingContext2D, cx: number, y: number, text: string, lit: boolean): void {
  const w = textWidth(text, 2) + 20;
  const x = Math.round(cx - w / 2);
  px(g, x - 1, y - 1, w + 2, 28, K);
  px(g, x, y, w, 26, d);
  px(g, x, y, w, 1, G);
  px(g, x, y + 25, w, 1, G);
  px(g, x, y, 1, 26, G);
  px(g, x + w - 1, y, 1, 26, G);
  drawText(g, text, cx, y + 13, 2, lit ? G : g8, { outline: K });
}
/** Act 3's hanging sign (the high-roller room's HIGH LIMIT): a dark panel, gold strips top and bottom, on two rods. */
function hangSign(g: CanvasRenderingContext2D, cx: number, y: number, text: string): void {
  const w = textWidth(text, 2) + 24;
  const x = Math.round(cx - w / 2);
  px(g, x + 8, 0, 1, y, g8);
  px(g, x + w - 9, 0, 1, y, g8);
  px(g, x - 1, y - 1, w + 2, 28, K);
  px(g, x, y, w, 26, '#1a0e24');
  px(g, x, y + 2, w, 1, G);
  px(g, x, y + 23, w, 1, G);
  drawText(g, text, cx, y + 13, 2, G, { outline: K });
}

/** The band above the shelves (behind his well and the title), per counter. */
function drawBand(g: CanvasRenderingContext2D, v: CashierVenue, s: Style, late: number): void {
  px(g, 0, 0, RW, WALL.y0, s.band);
  if (v === 'pawn') {
    // Old striped wallpaper, a picture rail, the barred window on the rain and the neon OPEN (dynamic).
    for (let x = 0; x < RW; x += 10) px(g, x, 0, 4, WALL.y0, s.bandLine);
    px(g, 0, 4, RW, 2, '#3a2010');
    const wx0 = 420;
    const wx1 = 520;
    px(g, wx0 - 4, 10, wx1 - wx0 + 8, 58, K);
    px(g, wx0 - 3, 11, wx1 - wx0 + 6, 56, '#5e3a22');
    px(g, wx0, 14, wx1 - wx0, 50, '#0e1124');
    // The street beyond: the far buildings, their lit windows, the casino's glow low on the right.
    px(g, wx0, 46, wx1 - wx0, 18, '#151633');
    for (const [bx, bw, bh] of [[0, 22, 28], [24, 18, 22], [44, 30, 32], [76, 24, 24]] as const) {
      px(g, wx0 + bx, 64 - bh, bw, bh, '#1b1a3a');
      for (let yy = 64 - bh + 4; yy < 60; yy += 6) for (let xx = bx + 3; xx < bx + bw - 3; xx += 6) if ((xx * 7 + yy * 3) % 5 < 2) px(g, wx0 + xx, yy, 2, 2, '#c28a3a');
    }
    px(g, wx0 + 70, 56, 30, 8, '#3a1a2a');
    px(g, wx0 + 76, 58, 18, 2, R);
    px(g, wx0, 63, wx1 - wx0, 1, '#2a2648');
    // The bars: iron, a highlight each, top and bottom rails.
    for (let x = wx0 + 6; x < wx1; x += 10) {
      px(g, x, 14, 2, 50, k);
      px(g, x, 14, 1, 50, l);
    }
    px(g, wx0, 26, wx1 - wx0, 2, k);
    px(g, wx0, 52, wx1 - wx0, 2, k);
    px(g, wx0 - 3, 64, wx1 - wx0 + 6, 3, '#8a5a2e');
    // Three gold balls, the pawnbroker's sign, on a bracket.
    px(g, 530, 12, 16, 2, k);
    px(g, 537, 14, 1, 6, k);
    for (const [bx, by] of [[531, 20], [541, 20], [536, 28]] as const) {
      px(g, bx - 1, by - 1, 8, 8, K);
      px(g, bx, by, 6, 6, G);
      px(g, bx + 1, by + 1, 2, 2, Yl);
    }
    // The OPEN sign's backing (its tube is dynamic).
    px(g, 556, 18, 66, 30, K);
    px(g, 557, 19, 64, 28, '#1a1020');
    px(g, 588, 8, 1, 10, k);
    px(g, 590, 8, 1, 10, k);
  } else if (v === 'cage' || v === 'closing') {
    // The casino's panelled wall, a gold frieze, the CASHIER sign, the downlights (going off late), the brass bars.
    for (let x = 0; x < RW; x += 40) px(g, x, 0, 1, WALL.y0, s.bandLine);
    px(g, 0, 6, RW, 1, g8);
    const lights = v === 'closing' ? Math.round(3 * (1 - late)) : 3;
    [272, 400, 600].forEach((x, i) => {
      const on = i < lights;
      px(g, x - 6, 0, 12, 3, K);
      px(g, x - 5, 1, 10, 2, on ? Yl : k);
    });
    areaSign(g, 512, 14, 'CASHIER', v === 'cage' || late < 0.55);
    px(g, 0, 50, RW, 2, K);
    px(g, 0, 51, RW, 1, G);
    for (let x = 4; x < RW; x += 12) {
      px(g, x, 52, 2, WALL.y0 - 52, g8);
      px(g, x, 52, 1, WALL.y0 - 52, G);
    }
    px(g, 0, WALL.y0 - 3, RW, 3, K);
    px(g, 0, WALL.y0 - 2, RW, 1, G);
    if (v === 'closing') {
      // The till pulled out beside him, open: a brass-rimmed drawer, its slots, the night's bills and coins (the bill
      // he's counting crosses from slot to slot: dynamic).
      px(g, 236, 50, 70, 22, K);
      px(g, 237, 51, 68, 20, k);
      px(g, 237, 51, 68, 1, G);
      px(g, 239, 54, 64, 15, '#1a1420');
      for (const x of [240, 253, 266, 279, 292]) {
        px(g, x, 55, 11, 13, '#241c2c');
        px(g, x, 55, 11, 1, K);
      }
      for (const x of [240, 253]) {
        px(g, x + 1, 58, 9, 10, '#5a8a4a');
        px(g, x + 1, 58, 9, 1, '#8ac06a');
        px(g, x + 4, 58, 3, 10, '#4a7a3a');
      }
      for (let i = 0; i < 4; i++) px(g, 294 + (i % 2) * 4, 62 + Math.floor(i / 2) * 3, 3, 2, i % 2 ? l : G);
    }
  } else {
    // The high limit: velvet folds, a brass rail, the hanging sign, a small PRIVATE plaque.
    for (let x = 0; x < RW; x += 12) {
      px(g, x, 0, 6, WALL.y0, d);
      px(g, x + 6, 0, 4, WALL.y0, r);
      px(g, x + 10, 0, 2, WALL.y0, '#3a0f22');
    }
    px(g, 0, 0, RW, 4, K);
    px(g, 0, 3, RW, 1, G);
    hangSign(g, 512, 16, 'CASHIER');
    px(g, 474, 50, 76, 14, K);
    px(g, 475, 51, 74, 12, '#1a0e24');
    px(g, 475, 51, 74, 1, g8);
    px(g, 475, 62, 74, 1, g8);
    drawText(g, 'PRIVATE', 512, 57, ONE, T, { outline: null });
  }
}

/** The back wall behind the shelves and its outer strips' things, per counter. */
function drawWall(g: CanvasRenderingContext2D, v: CashierVenue, s: Style, late: number): void {
  const { x0, x1, y0, y1 } = WALL;
  px(g, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, K);
  px(g, x0, y0, x1 - x0, y1 - y0, s.wall);
  if (v === 'pawn') {
    // Pegboard: a hole every 6 pixels.
    for (let y = y0 + 3; y < y1; y += 6) for (let x = x0 + 3; x < x1; x += 6) px(g, x, y, 1, 1, s.wallLine);
    // Left: the guitar on its peg, its tag. Right: the trumpet and the pocket watch, their tags; the radio, the sign.
    px(g, 199, 76, 2, 3, l);
    g.drawImage(guitar(), 184, 78);
    tag(g, 218, 98, 14);
    px(g, 574, 84, 2, 3, l);
    px(g, 612, 84, 2, 3, l);
    g.drawImage(trumpet(), 570, 87);
    tag(g, 592, 106, 14);
    px(g, 578, 106, 2, 3, l);
    g.drawImage(watch(), 572, 108);
    tag(g, 592, 121, 10);
    // Under the counter shelf, beside the names: NO REFUNDS on the left, the radio on its bracket on the right.
    px(g, 169, 150, 62, 16, K);
    px(g, 170, 151, 60, 14, '#5a4c44');
    drawText(g, 'NO REFUNDS', 200, 158, ONE, '#2a1418', { outline: null });
    px(g, 575, 168, 40, 2, '#5e3a22');
    g.drawImage(radio(), 579, 146);
  } else if (v === 'cage' || v === 'closing') {
    // Wood panels; chip racks on the left, a cabinet of cash drawers on the right; the cage's bars over both.
    for (let x = x0 + 30; x < x1; x += 60) px(g, x, y0, 1, y1 - y0, s.wallLine);
    const left = v === 'closing' ? 1 - 0.7 * late : 1;
    // The chip rack: a tray, five columns of chips (their colour, a darker edge).
    const cols: [string, string][] = [[R, r], [B, '#3a6ab0'], [GR, GRd], [l, k], [PU, '#4a2a78']];
    px(g, 168, 125, 67, 6, K);
    px(g, 169, 126, 65, 4, '#5e3a22');
    px(g, 169, 126, 65, 1, '#8a5a2e');
    cols.forEach(([c, c2], i) => chipColumn(g, 170 + i * 13, 125, Math.max(0, Math.round((8 + ((i * 3) % 5)) * left)), c, c2));
    px(g, 566, 80, 60, 50, K);
    px(g, 567, 81, 58, 48, '#3a2416');
    for (let r2 = 0; r2 < 3; r2++)
      for (let c2 = 0; c2 < 3; c2++) {
        const x = 569 + c2 * 19;
        const y = 83 + r2 * 15;
        px(g, x, y, 17, 13, '#5e3a22');
        px(g, x, y, 17, 1, '#8a5a2e');
        px(g, x + 6, y + 6, 5, 2, G);
      }
    if (v === 'closing' && late > 0.4) {
      // A drawer left open, empty.
      px(g, 607, 113, 17, 4, K);
      px(g, 606, 117, 19, 6, '#24140a');
    }
    // Under the counter shelf: a coin scale on the left, a small brass bell on the right.
    px(g, 176, 160, 36, 8, K);
    px(g, 177, 161, 34, 6, l);
    px(g, 192, 148, 4, 12, k);
    px(g, 180, 146, 28, 3, G);
    px(g, 588, 160, 20, 8, K);
    px(g, 589, 161, 18, 6, G);
    px(g, 596, 156, 4, 4, G);
    for (const [a, b] of [STRIP_L, STRIP_R])
      for (let x = a; x <= b; x += 13) {
        px(g, x, y0, 2, PLANK[0] - y0, g8);
        px(g, x, y0, 1, PLANK[0] - y0, G);
      }
  } else {
    // Walnut panels with brass inlay; the private window's arch; framed chips either side, a desk lamp's base.
    for (let x = x0 + 40; x < x1; x += 80) {
      px(g, x - 30, y0 + 6, 60, 46, s.wallLine);
      px(g, x - 29, y0 + 7, 58, 44, s.wall);
      px(g, x - 29, y0 + 7, 58, 1, g8);
    }
    for (let x = x0; x < x1; x += 2) {
      const dx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
      const h = Math.round(8 * Math.sqrt(Math.max(0, 1 - dx * dx)));
      px(g, x, y0, 2, 9 - h, K);
      px(g, x, y0 + 8 - h, 2, 1, G);
    }
    g.drawImage(outlined(34, 34, (c) => chipBox(c, 0, 0, Y, '1K')), 183, 88);
    g.drawImage(outlined(34, 34, (c) => chipBox(c, 0, 0, PU, '25K')), 578, 88);
    // Under the counter shelf: a desk lamp and a ledger on the left, a brass card tray on the right.
    px(g, 176, 162, 30, 6, K);
    px(g, 177, 163, 28, 4, '#3a1a2a');
    px(g, 179, 163, 24, 1, T);
    px(g, 216, 150, 2, 18, G);
    px(g, 208, 146, 18, 6, K);
    px(g, 209, 147, 16, 4, GRd);
    px(g, 209, 147, 16, 1, GR);
    px(g, 584, 160, 34, 8, K);
    px(g, 585, 161, 32, 6, G);
    px(g, 588, 158, 26, 3, T);
  }
}

/** The two planks and the glass case on the relic shelf, per counter (the screen draws the items on them). */
function drawShelves(g: CanvasRenderingContext2D, v: CashierVenue, s: Style, late: number): void {
  const { x0, y0, x1, y1 } = GLASS;
  px(g, x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4, K);
  px(g, x0, y0, x1 - x0, y1 - y0, s.glassFrame);
  px(g, x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, s.glass);
  px(g, x0, y0, x1 - x0, 1, s.glassTop);
  // The case's corners of things in the outer strips, inside the glass.
  if (v === 'pawn') {
    g.drawImage(bust(), 178, 197);
    g.drawImage(ringBox(), 207, 220);
    g.drawImage(wristwatch(), 572, 220);
    g.drawImage(ringBox(), 601, 220);
  } else if (v === 'cage' || v === 'closing') {
    const n = v === 'closing' ? Math.round(4 * (1 - 0.75 * late)) : 4;
    for (let i = 0; i < n; i++) bundle(g, 178 + (i % 2) * 20, 222 - Math.floor(i / 2) * 9);
    for (let i = 0; i < n; i++) bundle(g, 584 + (i % 2) * 20, 222 - Math.floor(i / 2) * 9);
  } else {
    plaque(g, 178, 214, PU, '5K');
    plaque(g, 202, 222, R, '10K');
    plaque(g, 584, 222, B, '50K');
    plaque(g, 600, 212, Y, '100K');
  }
  for (const py of PLANK) {
    px(g, WALL.x0 + 2, py - 1, WALL.x1 - WALL.x0 - 4, 8, K);
    px(g, WALL.x0 + 3, py, WALL.x1 - WALL.x0 - 6, 6, s.plank[1]);
    px(g, WALL.x0 + 3, py, WALL.x1 - WALL.x0 - 6, 1, s.plank[2]);
    px(g, WALL.x0 + 3, py + 5, WALL.x1 - WALL.x0 - 6, 1, s.plank[0]);
    px(g, WALL.x0 + 3, py + 7, WALL.x1 - WALL.x0 - 6, 3, '#0b0710');
  }
  void late;
}

/** The counter's front, our side of it (REROLL and LEAVE sit on it), per counter. */
function drawFront(g: CanvasRenderingContext2D, v: CashierVenue, late: number): void {
  const y = WALL.y1 + 2;
  if (v === 'pawn') {
    px(g, 0, y, RW, RH - y, '#2a1810');
    px(g, 0, y, RW, 8, K);
    px(g, 0, y + 1, RW, 6, '#8a5a2e');
    px(g, 0, y + 1, RW, 1, '#b07a42');
    for (let x = 8; x < RW; x += 64) {
      px(g, x, y + 16, 54, RH - y - 26, '#24140c');
      px(g, x, y + 16, 54, 1, '#3a2010');
    }
    // The bell, right of LEAVE.
    px(g, 588, y - 8, 18, 10, K);
    px(g, 589, y - 7, 16, 8, G);
    px(g, 590, y - 7, 6, 2, Yl);
    px(g, 596, y - 10, 2, 3, G);
    px(g, 586, y, 22, 2, k);
  } else if (v === 'cage' || v === 'closing') {
    // Marble: a cool stone with diagonal veins, a brass top edge and foot rail.
    px(g, 0, y, RW, RH - y, '#3e3850');
    for (let i = 0; i < 26; i++) {
      let vx = (i * 53) % RW;
      let vy = y + 10 + ((i * 17) % 50);
      for (let j = 0; j < 18; j++) {
        px(g, vx, vy, 2, 1, i % 3 ? '#4a4460' : '#57506c');
        vx += 2;
        vy += (i + j) % 3 === 0 ? 1 : 0;
      }
    }
    px(g, 0, y, RW, 6, K);
    px(g, 0, y + 1, RW, 4, G);
    px(g, 0, y + 1, RW, 1, Yl);
    px(g, 0, RH - 14, RW, 4, K);
    px(g, 0, RH - 13, RW, 2, G);
    if (v === 'closing' && late > 0.5) {
      // The cleaner's mop and bucket, left by the cage at the end of the night.
      g.drawImage(mopBucket(), 588, RH - 62);
    }
  } else {
    // Velvet panels with brass studs, a brass top edge.
    px(g, 0, y, RW, RH - y, d);
    for (let x = 0; x < RW; x += 16) px(g, x + 12, y, 4, RH - y, '#3a0f22');
    for (let yy = y + 14; yy < RH - 4; yy += 14) for (let x = 6; x < RW; x += 16) px(g, x, yy, 2, 2, g8);
    px(g, 0, y, RW, 6, K);
    px(g, 0, y + 1, RW, 4, G);
    px(g, 0, y + 1, RW, 1, Yl);
  }
}

const statics = new Map<string, HTMLCanvasElement>();
function staticLayer(v: CashierVenue, late: number): HTMLCanvasElement {
  // Lateness in steps (the night doesn't redraw every frame).
  const step = Math.round(late * 8) / 8;
  const key = `${v}:${step}`;
  let c = statics.get(key);
  if (c) return c;
  const [cv, g] = mk(RW, RH);
  const s = STYLES[v];
  drawBand(g, v, s, step);
  drawWall(g, v, s, step);
  drawShelves(g, v, s, step);
  drawFront(g, v, step);
  if (v === 'closing') {
    // The lights going off, a bank at a time: the whole room a flat step darker as it gets later.
    g.globalAlpha = 0.12 + 0.3 * step;
    px(g, 0, 0, RW, RH, K);
    g.globalAlpha = 1;
  }
  statics.set(key, (c = cv));
  return c;
}

// ---- the moving layer ------------------------------------------------------------------------------------------------

let dyn: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;

function drawMoving(g: CanvasRenderingContext2D, v: CashierVenue, late: number, t: number): void {
  const s = STYLES[v];
  // The glass case's sheen: a slow diagonal band of lighter pixels (stepped, no alpha).
  const { x0, y0, x1, y1 } = GLASS;
  const sweep = (t * 26) % 560;
  for (let r2 = y0 + 2; r2 < y1 - 2; r2 += 2) {
    const sx = Math.round(x0 - 120 + sweep + (r2 - y0) * 0.4);
    const a = Math.max(x0 + 2, sx);
    const b = Math.min(x1 - 2, sx + 8);
    if (b > a) px(g, a, r2, b - a, 1, s.sheen);
  }
  if (v === 'pawn') {
    // Rain down the window, behind its bars.
    for (let i = 0; i < 18; i++) {
      const rx = 422 + ((i * 37) % 96);
      const ry = 14 + ((Math.floor(t * 60) + i * 23) % 48);
      px(g, rx, ry, 1, 3, '#3a4a78');
    }
    for (let x = 426; x < 520; x += 10) px(g, x, 14, 2, 50, k);
    // OPEN in neon: pink tube, a dark-red halo, a letter dropping out now and then.
    const flick = Math.floor(t * 8) % 37 === 0 ? 1 : -1;
    const letters = ['O', 'P', 'E', 'N'];
    letters.forEach((c, i) => {
      const x = 566 + i * 13 + 6;
      drawText(g, c, x, 33, 2, i === flick ? r : '#ff6fa8', { outline: i === flick ? K : d });
    });
  } else if (v === 'closing') {
    // CLOSING on the bars, swinging a pixel; he counts the till: a bill crossing from one stack to the next.
    const sw = Math.round(Math.sin(t * 1.4));
    const sx = 560 + sw;
    px(g, sx + 6, 52, 1, 6, k);
    px(g, sx + 40, 52, 1, 6, k);
    px(g, sx - 1, 57, 50, 14, K);
    px(g, sx, 58, 48, 12, T);
    drawText(g, 'CLOSING', sx + 24, 64, ONE, R, { outline: null });
    const f = (t * 1.2) % 1;
    const bx = Math.round(253 + f * 13);
    const by = Math.round(56 - Math.sin(f * Math.PI) * 8);
    for (let i = 0; i < Math.floor(t * 1.2) % 8; i++) px(g, 267, 67 - i, 9, 1, i % 2 ? '#5a8a4a' : '#8ac06a');
    px(g, bx, by, 11, 5, K);
    px(g, bx + 1, by + 1, 9, 3, '#8ac06a');
    px(g, bx + 4, by + 1, 3, 3, '#4a7a3a');
  } else if (v === 'cage') {
    // The CASHIER sign's rim glints now and then (a bulb at each end).
    const on = Math.floor(t * 2) % 6 === 0 ? 1 : 0;
    bulb(g, 512 - (textWidth('CASHIER', 2) + 20) / 2 - 2, 25, on);
    bulb(g, 512 + (textWidth('CASHIER', 2) + 20) / 2 - 1, 25, on);
  } else {
    // The desk lamp's light on the ledger: a stepped pool, steady.
    px(g, 200, 152, 34, 1, '#4a3a20');
    px(g, 204, 153, 26, 1, '#3a2c18');
  }
  void late;
}

/** Draw the Cashier's counter for this run over the whole screen (the screen draws him, the shelves' items and the
 * buttons on top). `still` freezes the motion (REDUCE MOTION). */
export function drawCashierRoom(ctx: CanvasRenderingContext2D, run: { act: number; endless?: { loop: number } }, time: number, still = false): void {
  const { venue, late } = cashierVenue(run);
  const t = still ? 0 : time;
  if (!dyn) dyn = mk(RW, RH);
  const [dc, dg] = dyn;
  dg.clearRect(0, 0, RW, RH);
  drawMoving(dg, venue, late, t);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(staticLayer(venue, late), 0, 0, RW * 2, RH * 2);
  ctx.drawImage(dc, 0, 0, RW * 2, RH * 2);
  ctx.restore();
  void WELL;
}
