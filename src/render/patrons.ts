/**
 * THE CASINO'S PATRONS (rooms v2; the user, 2026-11-09: the floor needs "seats or people"). Players at the machines and
 * tables, seen from behind or three-quarter as they play (a hand on the button, leaning in, a cup of coins; at a card
 * table, cards held up or a hand on their chips), and people walking the side aisles. Shared by the casino's rooms
 * (act 2's floor, act 3's high-roller room: one kit, act 3 adds the card-table poses and `dim`).
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
  /** The trousers or skirt (a walker's legs). */
  legs?: string;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'cap';
}
/** At a machine: from behind with a hand on the button, from behind leaning in, three-quarter holding a cup of coins.
 * Walking the aisles: a profile, two steps. */
export type PatronPose = 'button' | 'lean' | 'cup' | 'walk0' | 'walk1' | 'cards' | 'chips';

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

type Part = 'hair' | 'skin' | 'coat' | 'sleeve' | 'legs' | 'shoe' | 'cup' | 'coin' | 'shirt' | 'card' | 'chip' | 'eye';
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

/** The head and its hair for a style, seen from behind (`face` 0) or three-quarter from the left (`face` 1: an ear, a
 * cheek and a nose show on the left). */
function head(look: PatronLook, cx: number, cy: number, r: number, face: number): Shape[] {
  const rw = r / A;
  const out: Shape[] = [ell('skin', cx, cy, r * 0.9, r)];
  const st = look.hairStyle;
  const ears = face
    ? [ell('skin', cx - rw * 0.92, cy + r * 0.12, r * 0.16, r * 0.15), ell('skin', cx + rw * 0.84, cy + r * 0.14, r * 0.16, r * 0.24)]
    : [ell('skin', cx - rw * 0.9, cy + r * 0.14, r * 0.16, r * 0.24), ell('skin', cx + rw * 0.9, cy + r * 0.14, r * 0.16, r * 0.24)];
  if (st === 'bald') return [...ears, ...out];
  // From behind the hair covers the back of the head; three-quarter leaves the left (the face) clear.
  const hairBack = (x: number, y: number) => {
    const inHead = (((x - cx) * A) / (r * 0.95)) ** 2 + ((y - cy) / (r * 1.05)) ** 2 <= 1;
    if (!inHead) return false;
    if (face && x < cx - rw * 0.15 && y > cy - r * 0.3) return false;
    return y < cy + r * (st === 'cap' ? 0.05 : 0.6);
  };
  const hair: Shape[] = [{ part: 'hair', cx, cy, rx: r, ry: r, hu: true, hit: hairBack }];
  if (st === 'long') hair.unshift(box('hair', cx - rw * 0.86, cy, cx + rw * 0.86, cy + r * 2.1));
  if (st === 'bun') hair.push(ell('hair', cx + rw * 0.1, cy - r * 0.95, r * 0.42, r * 0.36));
  if (st === 'cap') {
    hair.push(box('sleeve', cx - rw * 0.98, cy - r * 1.0, cx + rw * 0.98, cy - r * 0.3));
    hair.push(box('sleeve', face ? cx - rw * 1.5 : cx - rw * 0.3, cy - r * 0.42, face ? cx - rw * 0.5 : cx + rw * 0.3, cy - r * 0.28));
  }
  // The ears sit behind the hair's edge; three-quarter, the cheek and nose on the left.
  const nose = face ? [ell('skin', cx - rw * 1.0, cy + r * 0.28, r * 0.12, r * 0.1)] : [];
  return [...ears, ...out, ...hair, ...nose];
}

function shapes(look: PatronLook, pose: PatronPose): Shape[] {
  if (pose === 'walk0' || pose === 'walk1') {
    // A profile walking to the right: the legs in a stride (walk0 open, walk1 passing), the near arm swinging against
    // the near leg, a collar at the neck, the face (cheek, nose) on the right.
    const open = pose === 'walk0';
    const st = open ? 0.24 : 0.06;
    const r = 0.11;
    return [
      limb('legs', -0.02, 0.6, -st, 0.94, 0.06),
      box('shoe', -st - 0.12, 0.93, -st + 0.1, 1.0),
      torso('coat', 0.2, 0.63, 0.16, 0.14),
      box('shirt', -0.06, 0.18, 0.08, 0.23),
      limb('legs', 0.02, 0.6, st, 0.94, 0.06),
      box('shoe', st - 0.08, 0.93, st + 0.16, 1.0),
      limb('sleeve', 0.0, 0.27, open ? -0.16 : 0.06, 0.5, 0.055),
      ell('skin', open ? -0.16 : 0.06, 0.53, 0.05, 0.04),
      box('skin', -0.03, 0.15, 0.05, 0.2),
      ...head(look, 0.02, 0.1, r, 0),
      ell('skin', 0.15, 0.11, 0.03, 0.03),
    ];
  }
  if (pose === 'cards' || pose === 'chips') {
    // Across a card table, three-quarter toward us (the felt hides them from the table down): shoulders, a shirt front,
    // both forearms on the felt; cards held up in a fan, or one hand on a stack of chips.
    const r = 0.155;
    const out: Shape[] = [
      torso('coat', 0.27, 0.98, 0.38, 0.32),
      box('shirt', -0.09, 0.26, 0.07, 0.5),
      box('skin', -0.05, 0.13 + r * 0.8, 0.05, 0.3),
      limb('sleeve', -0.32, 0.36, -0.2, 0.66, 0.075),
      limb('sleeve', 0.32, 0.36, 0.2, 0.66, 0.075),
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
    out.push(...head(look, 0, 0.13, r, 1));
    // Their eyes, down on the play (a dark dash each; they show from about 40px tall).
    out.push(ell('eye', -0.13, 0.15, 0.022, 0.012), ell('eye', 0.04, 0.15, 0.022, 0.012));
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
    // Three-quarter: a cup of coins held out on the left, the other hand on the button.
    out.push(limb('sleeve', -0.31, 0.34, -0.42, 0.6, 0.075));
    out.push(box('cup', -0.53, 0.56, -0.33, 0.74));
    out.push(box('coin', -0.53, 0.52, -0.33, 0.57));
    out.push(ell('skin', -0.4, 0.66, 0.06, 0.05));
    out.push(limb('sleeve', 0.31, 0.34, 0.4, 0.62, 0.075));
    out.push(ell('skin', 0.38, 0.66, 0.06, 0.05));
  }
  out.push(...head(look, lean * 0.8, hy, r, pose === 'cup' ? 1 : 0));
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

/** A patron's sprite, `h` grid pixels tall (seated: from the stool's seat to the top of the head; walking: the whole
 * figure), its 1px outline included. Draw it with its bottom centre on the seat (or the floor). */
/** `dim` darkens every shade (a near figure behind the reels stays calm, still readable). */
export function patronSprite(h: number, look: PatronLook, pose: PatronPose, dim = 1): HTMLCanvasElement {
  h = Math.max(12, Math.round(h));
  const walk = pose === 'walk0' || pose === 'walk1';
  const w = Math.max(8, Math.round(h * (walk ? 0.48 : 0.62)));
  const key = `${h}:${pose}:${dim}:${look.skin}${look.hair}${look.coat}${look.hairStyle}`;
  const hit = cache.get(key);
  if (hit) return hit;
  A = w / h;
  const parts = shapes(look, pose);
  const ink: Record<Part, string[]> = {
    hair: steps(look.hair),
    skin: steps(look.skin),
    coat: steps(look.coat),
    sleeve: steps(toHex(hex(look.coat).map((n) => n * 0.88))),
    legs: steps(look.legs ?? '#24202e'),
    shoe: steps('#1a1418'),
    cup: steps('#9a9aa8'),
    coin: steps('#ffd23f'),
    shirt: steps('#d8d0c0'),
    card: steps('#f0ece6'),
    chip: steps('#c83a3a'),
    eye: ['#140c1c', '#140c1c', '#140c1c', '#140c1c'],
  };
  if (dim < 1) for (const k of Object.keys(ink) as Part[]) ink[k] = ink[k].map((c) => toHex(hex(c).map((n) => n * dim)));
  // The cap is the coat's colour turned darker (its "sleeve" ink): fine for a look; a crown of hair under it.
  const [art, ag] = mk(w, h);
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
  // The portraits' outline round everything (`outlined`'s rule: every drawn pixel's 3x3 neighbourhood), but kept to
  // the sprite's own box plus one pixel each side.
  const [out, og] = mk(w + 2, h + 2);
  const mask = ag.getImageData(0, 0, w, h).data;
  og.fillStyle = K;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[(y * w + x) * 4 + 3] > 0) og.fillRect(x, y, 3, 3);
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
