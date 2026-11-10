/**
 * THE CASINO'S PATRONS (rooms v2; the user, 2026-11-09: the floor needs "seats or people"). Players at the machines and
 * tables, seen from behind or three-quarter as they play (a hand on the button, leaning in, a cup of coins; at a card
 * table, cards held up or a hand on their chips), and the staff standing in the aisles, facing us. Shared by the casino's rooms
 * (act 2's floor, act 3's high-roller room: one kit; act 3 adds the card-table poses and `dim`; one serving pose,
 * `tray`, for both acts' waitresses).
 *
 * The portraits' standard at any size: each figure is rasterized on the room's 2px grid (one art pixel a grid pixel,
 * never scaled after), from a few shapes (head, hair, torso, arms, hands, legs), shaded in steps from the upper left
 * (a highlight, the base, a shadow, a deep shadow: 3-4 shades a colour), then given the portraits' 1px #140c1c outline.
 * Faces and hands are skin with their own shading; a three-quarter head shows an ear, a cheek and a nose. Cached by
 * size, look and pose. Below about 18px tall a figure loses its details, so the rooms place them mid-distance.
 */
import { mk } from './roomEntrance';

const K = '#140c1c';

export interface PatronLook {
  skin: string;
  hair: string;
  coat: string;
  /** The trousers (a standing figure's legs). */
  legs?: string;
  /** A skirt to the knee and bare legs (a cocktail waitress). */
  skirt?: boolean;
  /** A red bow tie or a long tie on the shirt front (the staff). */
  tie?: 'bow' | 'long';
  /** Lipstick (the mouth's colour; otherwise the skin's deep shadow). */
  lips?: string;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'cap' | 'visor';
  /** Sleeves of their own colour (a dealer's white shirtsleeves); otherwise the coat's, a shade darker. */
  sleeve?: string;
}
/** At a machine: from behind with a hand on the button, from behind leaning in, three-quarter holding a cup of coins.
 * Standing (the staff, facing us): hands down ('stand'; 'standL' / 'standR' a glance to one side), a tray held up,
 * both hands on a mop. */
export type PatronPose = 'button' | 'lean' | 'cup' | 'cards' | 'chips' | 'deal' | 'tray' | 'stand' | 'standL' | 'standR' | 'mop';

/** A few looks for the casino's crowd (the portraits' skin tones and hair, muted coats: they sit behind the HUD). */
export const LOOKS: PatronLook[] = [
  { skin: '#f4c09a', hair: '#3a2416', coat: '#3a4a7a', legs: '#24202e', hairStyle: 'short' },
  { skin: '#c07a5c', hair: '#1a1014', coat: '#6a2a3a', legs: '#2a1a24', hairStyle: 'long' },
  { skin: '#8a5434', hair: '#1a1014', coat: '#2a5a4a', legs: '#1e2024', hairStyle: 'short' },
  { skin: '#f4c09a', hair: '#c8c0d0', coat: '#5a3a5a', legs: '#2a2030', hairStyle: 'bun' },
  { skin: '#e0a07a', hair: '#8a3418', coat: '#4a4a3a', legs: '#26221c', hairStyle: 'cap' },
  { skin: '#c07a5c', hair: '#3a2416', coat: '#2a3a5a', legs: '#1a1a24', hairStyle: 'bald' },
  { skin: '#f4c09a', hair: '#d9a640', coat: '#7a3a2a', legs: '#241a1a', hairStyle: 'long' },
  { skin: '#8a5434', hair: '#3a2416', coat: '#3a3a4a', legs: '#20202a', hairStyle: 'bun' },
];

// ---- shading ----------------------------------------------------------------------------------------------------

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (v: number[]) => '#' + v.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
/** A colour's steps: 0 highlight, 1 base, 2 shadow, 3 deep shadow. */
function steps(c: string): string[] {
  const v = hex(c);
  return [toHex(v.map((n) => n * 1.22 + 12)), c, toHex(v.map((n) => n * 0.72)), toHex(v.map((n) => n * 0.5))];
}

// ---- the shapes (normalized: x -0.5..0.5 across the sprite, y 0 top .. 1 bottom) -----------------------------------
// Boxes and torsos are laid out in those units; round things (heads, hands, limbs) take their radii in the height's
// units (`hu`), so a head stays round whatever the sprite's width: A is the sprite's width over its height.
let A = 0.62;

type Part = 'hair' | 'skin' | 'neck' | 'coat' | 'sleeve' | 'legs' | 'shoe' | 'cup' | 'coin' | 'shirt' | 'card' | 'chip' | 'eye' | 'visor' | 'glass';
interface Shape {
  part: Part;
  hit: (x: number, y: number) => boolean;
  /** Its own centre and size (for its shading: lit on the upper left of the shape). */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Radii in the height's units (round shapes). */
  hu?: boolean;
}
const ell = (part: Part, cx: number, cy: number, rx: number, ry: number): Shape => ({ part, cx, cy, rx, ry, hu: true, hit: (x, y) => (((x - cx) * A) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 });
const box = (part: Part, x0: number, y0: number, x1: number, y1: number): Shape => ({ part, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, hit: (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1 });
/** A tapered torso: half width w0 at y0 (shoulders, rounded) down to w1 at y1. */
const torso = (part: Part, y0: number, y1: number, w0: number, w1: number, lean = 0): Shape => ({
  part,
  cx: 0,
  cy: (y0 + y1) / 2,
  rx: Math.max(w0, w1),
  ry: (y1 - y0) / 2,
  hit: (x, y) => {
    if (y < y0 || y > y1) return false;
    const t = (y - y0) / (y1 - y0);
    const off = lean * (1 - t);
    const w = w0 + (w1 - w0) * t;
    // round the shoulders: the top tenth narrows
    const round = t < 0.12 ? (0.12 - t) * 1.6 * w0 : 0;
    return Math.abs(x - off) <= w - round;
  },
});
/** A limb: a capsule from (ax, ay) to (bx, by), radius r. */
const limb = (part: Part, ax: number, ay: number, bx: number, by: number, r: number): Shape => ({
  part,
  cx: (ax + bx) / 2,
  cy: (ay + by) / 2,
  rx: (Math.abs(bx - ax) * A) / 2 + r,
  ry: Math.abs(by - ay) / 2 + r,
  hu: true,
  hit: (x, y) => {
    const dx = (bx - ax) * A;
    const dy = by - ay;
    const X = (x - ax) * A;
    const Y = y - ay;
    const t = Math.max(0, Math.min(1, (X * dx + Y * dy) / (dx * dx + dy * dy || 1)));
    return (X - t * dx) ** 2 + (Y - t * dy) ** 2 <= r * r;
  },
});

/** A head seen from behind (the players at the machines, and on our side of a table): the skull, the ears, and the hair
 * for its style over the back of it. */
function backHead(look: PatronLook, cx: number, cy: number, r: number): Shape[] {
  const rw = r / A;
  const out: Shape[] = [ell('skin', cx, cy, r * 0.9, r)];
  const st = look.hairStyle;
  const ears = [ell('skin', cx - rw * 0.9, cy + r * 0.14, r * 0.16, r * 0.24), ell('skin', cx + rw * 0.9, cy + r * 0.14, r * 0.16, r * 0.24)];
  if (st === 'bald') return [...ears, ...out];
  const hairBack = (x: number, y: number) => {
    const inHead = (((x - cx) * A) / (r * 0.95)) ** 2 + ((y - cy) / (r * 1.05)) ** 2 <= 1;
    return inHead && y < cy + r * (st === 'cap' ? 0.05 : 0.6);
  };
  const hair: Shape[] = [{ part: 'hair', cx, cy, rx: r, ry: r, hu: true, hit: hairBack }];
  if (st === 'long') hair.unshift(box('hair', cx - rw * 0.86, cy, cx + rw * 0.86, cy + r * 2.1));
  if (st === 'bun') hair.push(ell('hair', cx + rw * 0.1, cy - r * 0.95, r * 0.42, r * 0.36));
  if (st === 'visor') hair.push(box('visor', cx - rw * 0.98, cy - r * 0.62, cx + rw * 0.98, cy - r * 0.3));
  if (st === 'cap') hair.push(box('sleeve', cx - rw * 0.98, cy - r * 1.0, cx + rw * 0.98, cy - r * 0.3));
  return [...ears, ...out, ...hair];
}

/** A head that faces us (everyone whose face shows: the players across a table, the dealers, the staff). It's painted
 * straight onto the pixel grid after the body (`paintFace`), as the portraits' faces are built: a skull of skin with a
 * jaw, hair framing it for its style, two eyes, a nose's shadow and a mouth, each a whole pixel (or a block of them on a
 * big head), never a blob. `turn` slides the features a little to one side (-1 left, 1 right: a three-quarter look);
 * `gaze` 'down' is eyes on the cards (dark lids), 'out' eyes open (a white and a pupil once the head is big enough). */
interface Face {
  cx: number;
  cy: number;
  r: number;
  turn: -1 | 0 | 1;
  gaze: 'down' | 'out';
}
let faces: Face[] = [];
const face = (cx: number, cy: number, r: number, turn: -1 | 0 | 1, gaze: 'down' | 'out'): Shape[] => {
  faces.push({ cx, cy, r, turn, gaze });
  return [];
};

function paintFace(g: CanvasRenderingContext2D, w: number, h: number, look: PatronLook, f: Face, ink: Record<Part, string[]>): void {
  const Hh = Math.max(5, Math.round(2 * f.r * h));
  const Wd = Math.max(4, Math.round(Hh * 0.86));
  const x0 = Math.round((f.cx + 0.5) * w - Wd / 2);
  const y0 = Math.round((f.cy - f.r) * h);
  const S = ink.skin;
  const Hc = ink.hair;
  const st = look.hairStyle;
  const p = (x: number, y: number, ww: number, hh: number, c: string) => {
    if (ww <= 0 || hh <= 0) return;
    g.fillStyle = c;
    g.fillRect(x, y, ww, hh);
  };
  /** A feature's pixel: one grid pixel on a small head, a block on a big (near) one. */
  const u = Math.max(1, Math.floor(Wd / 11));
  // How far each row is cut in at the corners: a rounded crown, a narrower jaw.
  const inset = (row: number) => {
    const top = row;
    const bot = Hh - 1 - row;
    if (top < Math.round(Hh * 0.12)) return Math.ceil(Wd * 0.22);
    if (top < Math.round(Hh * 0.24)) return Math.ceil(Wd * 0.08);
    if (bot < Math.round(Hh * 0.1)) return Math.ceil(Wd * 0.26);
    if (bot < Math.round(Hh * 0.22)) return Math.ceil(Wd * 0.12);
    return 0;
  };
  const hairRows = Math.max(1, Math.round(Hh * (st === 'bald' ? 0 : 0.3)));
  const side = Math.max(1, Math.round(Wd * 0.1));
  // Long hair falls past the face to the shoulders in a lock either side (the neck and collar show between them).
  if (st === 'long') {
    const top = y0 + Math.round(Hh * 0.2);
    const len = Math.round(Hh * 1.25);
    const lw = Math.max(1, Math.round(Wd * 0.24));
    p(x0 - 1, top, lw + 1, len, Hc[1]);
    p(x0 - 1, top, 1, len, Hc[0]);
    p(x0 + Wd - lw, top, lw + 1, len, Hc[2]);
  }
  // The skull: skin, its shadowed side on the right (the light's from the upper left), a shadow under the chin's edge.
  const shadeW = Math.max(1, Math.round(Wd * 0.14));
  for (let row = 0; row < Hh; row++) {
    const i = inset(row);
    p(x0 + i, y0 + row, Wd - 2 * i, 1, S[1]);
    p(x0 + Wd - i - shadeW, y0 + row, shadeW, 1, S[2]);
  }
  if (st === 'bald') p(x0 + Math.ceil(Wd * 0.26), y0 + Math.max(1, Math.round(Hh * 0.1)), Math.max(1, Math.round(Wd * 0.2)), u, S[0]);
  // The ears, at the eyes' height (the one on the side they're turned to is hidden).
  const ey = y0 + Math.round(Hh * 0.54);
  if (Wd >= 7) {
    const eh = Math.max(1, Math.round(Hh * 0.16));
    if (f.turn >= 0) p(x0 - 1, ey, 1, eh, S[2]);
    if (f.turn <= 0) p(x0 + Wd, ey, 1, eh, S[2]);
  }
  // The hair over the crown, lit on its upper left, and down the sides to the ears.
  if (st !== 'bald') {
    for (let row = 0; row < hairRows; row++) {
      const i = inset(row);
      p(x0 + i, y0 + row, Wd - 2 * i, 1, Hc[1]);
      p(x0 + Wd - i - shadeW, y0 + row, shadeW, 1, Hc[2]);
      if (row < Math.max(1, Math.round(hairRows * 0.4)) && row > 0) p(x0 + i + 1, y0 + row, Math.max(1, Math.round(Wd * 0.3)), 1, Hc[0]);
    }
  }
  const sideTo = y0 + Math.round(Hh * (st === 'long' ? 0.9 : st === 'bun' ? 0.42 : 0.52));
  p(x0, y0 + hairRows, side, sideTo - y0 - hairRows, Hc[st === 'bald' ? 2 : 1]);
  p(x0 + Wd - side, y0 + hairRows, side, sideTo - y0 - hairRows, Hc[2]);
  if (st === 'bald') {
    // (A bald head keeps a fringe over the ears only.)
    p(x0, y0, side, Math.round(Hh * 0.34), S[1]);
    p(x0 + Wd - side, y0, side, Math.round(Hh * 0.34), S[2]);
    for (let row = 0; row < Math.round(Hh * 0.24); row++) g.clearRect(x0, y0 + row, inset(row), 1), g.clearRect(x0 + Wd - inset(row), y0 + row, inset(row), 1);
  }
  if (st === 'bun') {
    const bw = Math.max(2, Math.round(Wd * 0.5));
    const bh = Math.max(1, Math.round(Hh * 0.15));
    const bx = x0 + Math.round((Wd - bw) / 2);
    p(bx + Math.max(1, Math.round(bw * 0.2)), y0 - bh, bw - 2 * Math.max(1, Math.round(bw * 0.2)), 1, Hc[1]);
    p(bx, y0 - bh + 1, bw, bh, Hc[1]);
    p(bx + bw - Math.max(1, Math.round(bw * 0.3)), y0 - bh + 1, Math.max(1, Math.round(bw * 0.3)), bh, Hc[2]);
    p(bx + Math.max(1, Math.round(bw * 0.2)), y0 - bh, Math.max(1, Math.round(bw * 0.3)), 1, Hc[0]);
  }
  if (st === 'visor') {
    // A dealer's green eyeshade (as THE DEALER's and THE WHEEL's): a band across the brow, wider than the head.
    const bh = Math.max(1, Math.round(Hh * 0.12));
    const by = y0 + hairRows - bh;
    p(x0 - u, by, Wd + 2 * u, bh, ink.visor[1]);
    p(x0 - u, by, Wd + 2 * u, Math.max(1, Math.floor(bh / 2)), ink.visor[0]);
    if (Hh >= 10) p(x0 - 2 * u, by + bh, Wd + 4 * u, Math.max(1, Math.round(bh / 2)), ink.visor[2]);
  }
  if (st === 'cap') {
    // A flat cap: its crown over the hair, the peak out over the brow.
    const ch = Math.max(1, hairRows - Math.max(1, Math.round(Hh * 0.08)));
    for (let row = 0; row < ch; row++) p(x0 + inset(row) - (row ? 1 : 0), y0 + row - 1, Wd - 2 * inset(row) + (row ? 2 : 0), 1, ink.sleeve[row < ch / 2 ? 1 : 2]);
    p(x0 - 1, y0 + ch - 1, Wd + 2, Math.max(1, Math.round(Hh * 0.08)), ink.sleeve[3]);
  }
  // The face (from about 6px wide): eyes, then a nose's shadow and a mouth as the head gets bigger.
  if (Wd < 6) return;
  const sh = Wd >= 9 ? f.turn * Math.max(1, Math.round(Wd * 0.09)) : 0;
  const ex = Math.round(Wd * 0.24);
  const ew = Wd >= 14 ? 2 * u : u;
  const lx = x0 + ex + sh;
  const rx = x0 + Wd - ex - ew + sh;
  if (f.gaze === 'out' && Wd >= 14) {
    p(lx, ey, ew, u, ink.card[1]);
    p(rx, ey, ew, u, ink.card[1]);
    p(lx + u + (f.turn < 0 ? -u : 0), ey, u, u, ink.eye[0]);
    p(rx + (f.turn > 0 ? u : 0), ey, u, u, ink.eye[0]);
  } else {
    p(lx, ey, ew, u, ink.eye[0]);
    p(rx, ey, ew, u, ink.eye[0]);
  }
  if (Wd >= 16) {
    const brow = st === 'bald' || Hc[1] === S[1] ? S[3] : Hc[3];
    p(lx - (ew > u ? 0 : 1), ey - 2 * u, ew + 1, u, brow);
    p(rx, ey - 2 * u, ew + 1, u, brow);
  }
  const mid = x0 + Math.floor(Wd / 2) + sh;
  if (Wd >= 9) p(mid - (Wd >= 14 ? u : 0), y0 + Math.round(Hh * 0.7), Wd >= 14 ? 2 * u : 1, u, S[2]);
  if (Wd >= 10) {
    const mw = Math.max(2, Math.round(Wd * 0.3));
    p(mid - Math.floor(mw / 2), y0 + Math.min(Hh - 2, Math.round(Hh * 0.84)), mw, u, look.lips ?? S[3]);
  }
}

/** A standing figure's width over its height (the stand poses are laid out in these units, whatever the sprite's). */
const STAND_W = 0.5;
/** Where a 'mop' figure's hands hold the pole, from its bottom centre, in the figure's height (x to its right). */
export const MOP_HANDS = { x: 0.085, y: 0.58 };

/** The staff, standing and facing us (the pit boss, the waitresses, the closing shift, the alley's lookout): the legs
 * apart (or a skirt and bare legs), a jacket over a white shirt front with a bow tie or a tie, the head on a neck. The
 * arms by the pose: both down; the near one up under a tray of drinks; both forward on a mop's pole. */
function standing(look: PatronLook, pose: 'stand' | 'tray' | 'mop', turn: -1 | 0 | 1): Shape[] {
  const k = STAND_W / A;
  const X = (v: number) => v * k;
  const r = 0.1;
  const legPart: Part = look.skirt ? 'skin' : 'legs';
  const lr = look.skirt ? 0.04 : 0.052;
  const out: Shape[] = [
    limb(legPart, X(-0.13), 0.58, X(-0.14), 0.94, lr),
    limb(legPart, X(0.13), 0.58, X(0.14), 0.94, lr),
    box('shoe', X(-0.27), 0.95, X(-0.04), 1.0),
    box('shoe', X(0.04), 0.95, X(0.27), 1.0),
  ];
  if (look.skirt) out.push(torso('sleeve', 0.58, 0.74, X(0.25), X(0.29)));
  out.push(torso('coat', 0.245, 0.62, X(0.31), X(0.24)));
  // The shirt front narrows to the waist button; the jacket's shadowed lapel beside it.
  out.push({ part: 'shirt', cx: 0, cy: 0.33, rx: X(0.07), ry: 0.09, hit: (x, y) => y >= 0.245 && y <= 0.44 && Math.abs(x) <= X(0.075) * (1 - (y - 0.245) / 0.2) });
  if (look.tie === 'bow') out.push(box('chip', X(-0.06), 0.25, X(0.06), 0.272));
  else if (look.tie === 'long') out.push(box('chip', X(-0.022), 0.255, X(0.022), 0.4));
  out.push(box('neck', X(-0.055), 0.19, X(0.055), 0.25));
  // The far arm, down at the side.
  out.push(limb('sleeve', X(-0.31), 0.3, X(-0.34), 0.5, 0.047), ell('skin', X(-0.34), 0.545, 0.042, 0.038));
  if (pose === 'stand') {
    out.push(limb('sleeve', X(0.31), 0.3, X(0.34), 0.5, 0.047), ell('skin', X(0.34), 0.545, 0.042, 0.038));
  } else if (pose === 'tray') {
    // The near arm up: the elbow out at shoulder height, the forearm straight up, the hand flat under the tray.
    out.push(limb('sleeve', X(0.31), 0.3, X(0.5), 0.27, 0.047), limb('sleeve', X(0.5), 0.27, X(0.5), 0.15, 0.042));
    out.push(ell('skin', X(0.5), 0.115, 0.04, 0.03));
    out.push(box('cup', X(0.3), 0.07, X(0.7), 0.09));
    out.push(box('glass', X(0.36), 0.015, X(0.43), 0.07), box('glass', X(0.48), 0.025, X(0.55), 0.07), box('coin', X(0.6), 0.0, X(0.64), 0.07));
  } else {
    // Both hands on the mop's pole, in front of the right hip (the room draws the pole and the mop).
    out.pop();
    out.pop();
    out.push(limb('sleeve', X(-0.31), 0.3, X(-0.26), 0.42, 0.047), limb('sleeve', X(-0.26), 0.42, X(0.1), 0.47, 0.043));
    out.push(limb('sleeve', X(0.31), 0.3, X(0.33), 0.38, 0.047), limb('sleeve', X(0.33), 0.38, X(0.2), 0.4, 0.043));
    out.push(ell('skin', X(0.17), 0.46, 0.04, 0.035), ell('skin', X(0.17), 0.395, 0.04, 0.035));
  }
  out.push(...face(0, 0.105, r, turn, 'out'));
  return out;
}

function shapes(look: PatronLook, pose: PatronPose): Shape[] {
  if (pose === 'stand' || pose === 'standL' || pose === 'standR') return standing(look, 'stand', pose === 'standL' ? -1 : pose === 'standR' ? 1 : 0);
  if (pose === 'tray' || pose === 'mop') return standing(look, pose, -1);
  if (pose === 'deal') {
    // A dealer behind his table facing us (the felt hides him from the waist): a dark vest over a white shirt, a red
    // bow tie, sleeve garters, one hand dealing a card across the felt, the other on the shoe.
    const r = 0.14;
    return [
      torso('coat', 0.27, 0.98, 0.3, 0.26),
      { part: 'shirt', cx: 0, cy: 0.4, rx: 0.08, ry: 0.14, hit: (x, y) => y >= 0.27 && y <= 0.56 && Math.abs(x) <= 0.1 * (1 - (y - 0.27) / 0.3) },
      box('chip', -0.07, 0.275, 0.07, 0.315),
      box('neck', -0.05, 0.12 + r * 0.8, 0.05, 0.28),
      limb('shirt', -0.36, 0.33, -0.4, 0.56, 0.055),
      limb('shirt', -0.4, 0.56, -0.26, 0.74, 0.05),
      limb('shirt', 0.36, 0.33, 0.4, 0.56, 0.055),
      limb('shirt', 0.4, 0.56, 0.22, 0.72, 0.05),
      box('chip', -0.46, 0.43, -0.32, 0.46),
      box('chip', 0.32, 0.43, 0.46, 0.46),
      box('card', 0.06, 0.7, 0.22, 0.78),
      ell('skin', 0.2, 0.74, 0.055, 0.042),
      ell('skin', -0.25, 0.77, 0.055, 0.042),
      ...face(0, 0.125, r, 0, 'out'),
    ];
  }
  if (pose === 'cards' || pose === 'chips') {
    // Across a card table, turned a little toward the aisle (the felt hides them from the table down): shoulders, a
    // shirt front, both forearms on the felt; cards held up in a fan, or one hand on a stack of chips.
    const r = 0.14;
    const out: Shape[] = [
      torso('coat', 0.3, 0.98, 0.36, 0.3),
      { part: 'shirt', cx: 0, cy: 0.4, rx: 0.07, ry: 0.1, hit: (x, y) => y >= 0.32 && y <= 0.44 && Math.abs(x) <= 0.11 * (1 - (y - 0.32) / 0.12) },
      box('neck', -0.055, 0.25, 0.055, 0.335),
      limb('sleeve', -0.33, 0.36, -0.2, 0.66, 0.07),
      limb('sleeve', 0.33, 0.36, 0.2, 0.66, 0.07),
    ];
    if (pose === 'cards') {
      out.push(box('card', -0.16, 0.54, 0.02, 0.68));
      out.push(box('card', -0.02, 0.53, 0.16, 0.67));
      out.push(ell('skin', -0.14, 0.68, 0.06, 0.045));
      out.push(ell('skin', 0.14, 0.68, 0.06, 0.045));
    } else {
      out.push(box('chip', 0.16, 0.6, 0.34, 0.72));
      out.push(ell('skin', 0.24, 0.6, 0.065, 0.05));
      out.push(ell('skin', -0.2, 0.69, 0.06, 0.045));
    }
    // Their eyes down on the play.
    out.push(...face(0, 0.14, r, -1, 'down'));
    return out;
  }
  const lean = pose === 'lean' ? 0.08 : 0;
  const hy = pose === 'lean' ? 0.17 : 0.13;
  const r = 0.155;
  const out: Shape[] = [
    // The torso from the shoulders down to the seat (a belt line darker), seen from behind.
    torso('coat', 0.27, 0.98, 0.38, 0.3, lean),
    box('legs', -0.29, 0.9, 0.29, 0.98),
    box('skin', -0.05, hy + r * 0.8, 0.05, 0.3),
    box('shirt', -0.1, 0.26, 0.1, 0.31),
  ];
  if (pose === 'button') {
    // The near arm reaching the button (the elbow out to the right, the hand on the deck), the far arm resting.
    out.push(limb('sleeve', 0.3, 0.34, 0.43, 0.52, 0.075));
    out.push(limb('sleeve', 0.43, 0.52, 0.33, 0.64, 0.065));
    out.push(ell('skin', 0.33, 0.69, 0.06, 0.05));
    out.push(limb('sleeve', -0.31, 0.34, -0.36, 0.7, 0.075));
    out.push(ell('skin', -0.35, 0.75, 0.06, 0.05));
  } else if (pose === 'lean') {
    // Both elbows out, leaning in to the screen.
    out.push(limb('sleeve', 0.34, 0.36, 0.43, 0.58, 0.075));
    out.push(limb('sleeve', -0.34, 0.36, -0.43, 0.58, 0.075));
    out.push(ell('skin', 0.4, 0.63, 0.055, 0.045));
    out.push(ell('skin', -0.4, 0.63, 0.055, 0.045));
  } else {
    // A cup of coins held out on the left, the other hand on the button.
    out.push(limb('sleeve', -0.31, 0.34, -0.42, 0.6, 0.075));
    out.push(box('cup', -0.53, 0.56, -0.33, 0.74));
    out.push(box('coin', -0.53, 0.52, -0.33, 0.57));
    out.push(ell('skin', -0.4, 0.66, 0.06, 0.05));
    out.push(limb('sleeve', 0.31, 0.34, 0.4, 0.62, 0.075));
    out.push(ell('skin', 0.38, 0.66, 0.06, 0.05));
  }
  out.push(...backHead(look, lean * 0.8, hy, r));
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

/** A patron's sprite, `h` grid pixels tall (seated: from the stool's seat to the top of the head; walking: the whole
 * figure), its 1px outline included. Draw it with its bottom centre on the seat (or the floor). */
/** `dim` darkens every shade (a near figure behind the reels stays calm, still readable). */
export function patronSprite(h: number, look: PatronLook, pose: PatronPose, dim = 1): HTMLCanvasElement {
  h = Math.max(12, Math.round(h));
  const standing = pose === 'stand' || pose === 'standL' || pose === 'standR' || pose === 'mop';
  const w = Math.max(8, Math.round(h * (standing ? STAND_W : pose === 'tray' ? 0.74 : 0.62)));
  const key = `${h}:${pose}:${dim}:${look.skin}${look.hair}${look.coat}${look.hairStyle}${look.sleeve ?? ''}${look.legs ?? ''}${look.skirt ? 's' : ''}${look.tie ?? ''}${look.lips ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  A = w / h;
  faces = [];
  const parts = shapes(look, pose);
  const heads = faces;
  const ink: Record<Part, string[]> = {
    hair: steps(look.hair),
    skin: steps(look.skin),
    // (A neck is in the head's shadow: one flat shade, so it never reads as a beard.)
    neck: Array(4).fill(steps(look.skin)[2]),
    coat: steps(look.coat),
    sleeve: steps(look.sleeve ?? toHex(hex(look.coat).map((n) => n * 0.88))),
    legs: steps(look.legs ?? '#24202e'),
    shoe: steps('#1a1418'),
    cup: steps('#9a9aa8'),
    coin: steps('#ffd23f'),
    shirt: steps('#d8d0c0'),
    card: steps('#f0ece6'),
    chip: steps('#c83a3a'),
    eye: ['#140c1c', '#140c1c', '#140c1c', '#140c1c'],
    visor: steps('#4cc234'),
    glass: steps('#a8d8f0'),
  };
  if (dim < 1) for (const k of Object.keys(ink) as Part[]) ink[k] = ink[k].map((c) => toHex(hex(c).map((n) => n * dim)));
  // The cap is the coat's colour turned darker (its "sleeve" ink): fine for a look; a crown of hair under it.
  // (A few rows of headroom over the figure: a bun or a cap's crown stands above the head's top.)
  const pad = Math.ceil(h * 0.06);
  const [art, ag] = mk(w, h + pad);
  ag.translate(0, pad);
  for (let py = 0; py < h; py++)
    for (let pxl = 0; pxl < w; pxl++) {
      const x = (pxl + 0.5) / w - 0.5;
      const y = (py + 0.5) / h;
      let top: Shape | null = null;
      for (const s of parts) if (s.hit(x, y)) top = s;
      if (!top) continue;
      // Stepped light from the upper left of the shape: highlight on its lit rim, shadow toward the lower right.
      const u = ((x - top.cx) * (top.hu ? A : 1)) / (top.rx || 1);
      const v = (y - top.cy) / (top.ry || 1);
      const lit = -u * 0.7 - v * 0.5;
      const step = lit > 0.55 ? 0 : lit > -0.25 ? 1 : lit > -0.75 ? 2 : 3;
      ag.fillStyle = ink[top.part][step];
      ag.fillRect(pxl, py, 1, 1);
    }
  for (const f of heads) paintFace(ag, w, h, look, f, ink);
  // The portraits' outline round everything (`outlined`'s rule: every drawn pixel's 3x3 neighbourhood), but kept to
  // the sprite's own box plus one pixel each side.
  const H = h + pad;
  const [out, og] = mk(w + 2, H + 2);
  const mask = ag.getImageData(0, 0, w, H).data;
  og.fillStyle = K;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) if (mask[(y * w + x) * 4 + 3] > 0) og.fillRect(x, y, 3, 3);
  og.drawImage(art, 1, 1);
  cache.set(key, out);
  return out;
}

/** Draw a patron with its bottom centre at (x, y) on the grid (the seat, or the floor). */
export function drawPatron(g: CanvasRenderingContext2D, x: number, y: number, h: number, look: PatronLook, pose: PatronPose, mirror = false, dim = 1): void {
  const s = patronSprite(h, look, pose, dim);
  const dx = Math.round(x - s.width / 2);
  const dy = Math.round(y - s.height + 1);
  if (!mirror) {
    g.drawImage(s, dx, dy);
    return;
  }
  g.save();
  g.translate(dx + s.width, dy);
  g.scale(-1, 1);
  g.drawImage(s, 0, 0);
  g.restore();
}
