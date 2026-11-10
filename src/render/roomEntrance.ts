/**
 * THE CASINO ENTRANCE (rooms v2 style key, 2026-11-09; the user: the rooms read as "a third art style", and "the House
 * fight is when you enter the casino and it's the first machine you encounter"). THE HOUSE's room: the casino's front at
 * night, its canopy and doors in the open column between the HUDs, the red carpet down the middle, a street lamp and
 * THE HOUSE's bill poster on the street side (left), the blade sign and THE DOORMAN on the casino side (right).
 *
 * The style, one rule for every v2 room:
 * - Drawn on a 640x360 grid, 2 screen pixels an art pixel: the HUD portraits' scale (32x32 art in a 64px box).
 * - The portraits' palette (tools/build-art.mjs) and the UI kit's plum and gold; every figure and prop has the 1px
 *   #140c1c outline the portraits have (see `outlined`). No smooth gradients: light is stepped (`pool`), crisp-edged.
 * - Behind the reels the room stays dark and low in contrast; it moves in the side strips, the open column and the floor.
 * - Alive in the boss fight: the canopy and blade-sign bulbs chase; the doors' light and THE HOUSE's crown crest grow
 *   with THE POT; a hit on THE HOUSE shorts the bulbs in a ripple and drops sparks; a SKIM races the bulbs at you and
 *   spills coins down the steps; the doors open as THE HOUSE falls, onto the casino floor (the demo's finale).
 * Nothing flashes: the strongest light change is a small pool under 0.2 (FLASH_CAP).
 */
import { drawSprite, type SpriteId } from './sprites';
import { drawText } from './text';

export const RW = 640;
export const RH = 360;
/** The ground line: the casino's base and the sidewalk meet at the doors' bottom step (version 3, user: "bring the
 * floor up" so the door stays high in the open column, its opening seen above THE POT). */
const GROUND = 145;
/** The kerb: the sidewalk's front edge, then the street. */
const KERB = 300;
/** Eye level (a standing person's): the sidewalk's joints and the carpet's edges run to (CX, HORIZON). */
const HORIZON = 100;
/** The style key's options (the walls' texture is shown before and after, for the user to veto separately). */
export const ENTRANCE = { walls: true };
/** The open column between the HUDs (and the machines). */
const CX = 320;

// The portraits' palette (tools/build-art.mjs) plus the night's darks.
const K = '#140c1c';
const P = '#1a1426';
const p = '#3a2d52';
const G = '#d9a640';
const g8 = '#8f5a1f';
const Y = '#ffe45c';
const Yl = '#ffe08a';
const T = '#f4eee0';
const R = '#e8374b';
const r = '#8e1f3a';
const d = '#561530';
const F = '#f4c09a';
const f = '#c07a5c';
const k = '#3b3347';
const l = '#6d6482';
const O = '#f07c1c';
const SKY = ['#0d0519', '#140a24', '#1d0f30'];
const WALL = '#211932';
const WALL_D = '#1a1328';
const WALL_L = '#2b2140';
const PAVE = '#17122a';
const PAVE_L = '#221b38';

export const px = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
export function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}
/** Draw flat shapes, then add the portraits' 1px outline round everything drawn. */
export function outlined(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const [art, ag] = mk(w, h);
  draw(ag);
  const [out, og] = mk(w + 2, h + 2);
  const mask = ag.getImageData(0, 0, w, h).data;
  og.fillStyle = K;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (mask[(y * w + x) * 4 + 3] > 0) og.fillRect(x, y, 3, 3);
  og.drawImage(art, 1, 1);
  return out;
}
/** A stepped pool of light: three nested ellipses, crisp-edged, each a little stronger (pixel art, no gradient). */
export function pool(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, c: string, a: number): void {
  if (a <= 0) return;
  g.fillStyle = c;
  for (const [k2, a2] of [[1, 0.35], [0.72, 0.35], [0.45, 0.3]] as const) {
    g.globalAlpha = Math.min(1, a * a2);
    const ex = rx * k2;
    const ey = ry * k2;
    for (let y = -Math.floor(ey); y <= Math.floor(ey); y++) {
      const hw = Math.floor(ex * Math.sqrt(Math.max(0, 1 - (y * y) / (ey * ey))));
      g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
    }
  }
  g.globalAlpha = 1;
}
/** A marquee bulb: 3x3 with a socket; lit, a warm core and a 1px halo. */
export function bulb(g: CanvasRenderingContext2D, x: number, y: number, on: number): void {
  if (on > 0.5) {
    g.globalAlpha = 0.35 * on;
    px(g, x - 1, y - 1, 5, 5, G);
    g.globalAlpha = 1;
    px(g, x, y, 3, 3, Y);
    px(g, x + 1, y, 1, 1, '#fffbe6');
  } else {
    px(g, x, y, 3, 3, g8);
    px(g, x + 1, y + 1, 1, 1, '#5a3a1a');
  }
}

/** THE DOORMAN's full figure, 22x58 at the room's 2px scale (the portraits' palette; outlined like them). */
export const DOORMAN = [
  '......pppppppppp......',
  '.....plpppppppppp.....',
  '.....plppppppppPP.....',
  '.....GGGGGYYGGGGg.....',
  '.....gggggGgggggg.....',
  '.....PlPPPPPPPPPP.....',
  '......ffffffffff......',
  '......FbbFFFFbbf......',
  '.....FFWKFFFKWf.f.....',
  '.....fFFFFfFFFFff.....',
  '......FbBbbbbBbf......',
  '.....bFFbrrbFFfb......',
  '......FFFFFFFFff......',
  '.......ffffffff.......',
  '........ffffff........',
  '.......GGTTTTGG.......',
  '..YYYY.gGTTTTGg.YYYY..',
  '..GGGGrrrrGgrrrrrrGGGG',
  '..gYRrrrrrGgrrrrddYg..',
  '..RrRrrrrrGgrrrrYddd..',
  '..RrRrrYrrGgrrYYgddd..',
  '..RrRrrrrrGgrrYgdddd..',
  '..RrRrrrrrGgrYgrdddd..',
  '..RrRrrrrrGgrrrrdddd..',
  '..RrRrrYrrGgrrYrdddd..',
  '..RrRrrrrrGgrrrrdddd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..Rr.RrYrrGgrrYdd.dd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..Rr.RrYrrGgrrYdd.dd..',
  '..Rr.RrrrrGgrrrdd.dd..',
  '..TT.RrrrrGgrrrdd.TT..',
  '..Tt.RrrrrGgrrrdd.Tt..',
  '..tt.RrrrrGgrrrdd.tt..',
  '.....RrrrrGgrrrdd.....',
  '....RrrrrrGgrrrrdd....',
  '....RrrrrrGgrrrrdd....',
  '....RrrrrrGgrrrrdd....',
  '....RrrrrrGgrrrrdd....',
  '....RrrrrrGgrrrrdd....',
  '...RrrrrrrGgrrrrrdd...',
  '...RrrrrrrGgrrrrrdd...',
  '...RrrrrrrGgrrrrrdd...',
  '...gGGGGGGgGGGGGGGg...',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '......lkkk..lkkk......',
  '.....KlKKK..KlKKK.....',
  '.....KKKKK..KKKKK.....',
  '......................',
];
/** Row 8 (his eyes) for each frame: at you, at them (left), ahead (right). */
export const DOORMAN_EYES = ['.....FFWKFFFKWf.f.....', '.....FFKWFFFKWf.f.....', '.....FFWKFFFWKf.f.....'];
export const DOORMAN_INK: Record<string, string> = {
  p, l, P, K, W: '#ffffff', T, t: '#9a8fb0', k, G, Y, g: g8, F, f, b: '#5a311c', B: '#9a5a30', R, r, d,
};

// ---- THE HOUSE's crest, THE DOORMAN, the poster, the lamp: outlined props ---------------------------------------

let props: { crest: HTMLCanvasElement; doorman: HTMLCanvasElement[]; dust: HTMLCanvasElement[]; lamp: HTMLCanvasElement } | null = null;
function makeProps() {
  // THE HOUSE's crown crest over the canopy (its icon wears the same crown).
  const crest = outlined(40, 18, (c) => {
    px(c, 2, 8, 36, 9, g8);
    px(c, 2, 8, 36, 2, G);
    for (const x of [2, 12, 20, 28, 36]) {
      px(c, x, 2, 3, 7, G);
      px(c, x, 0, 3, 3, Y);
    }
    px(c, 6, 5, 3, 4, G);
    px(c, 31, 5, 3, 4, G);
    for (const [x, col] of [[8, R], [18, '#3474e0'], [29, R]] as const) {
      px(c, x, 11, 4, 4, col);
      px(c, x, 11, 2, 2, T);
    }
  });
  // THE DOORMAN at the door (the act 1 boss; portrait A, user 2026-11-09): braided peaked cap, a handlebar moustache, a
  // tailored burgundy frock coat (shoulders wider than the hips, flared to below the knee), epaulettes, two rows of gold
  // buttons, the gold braid and a short aiguillette, white gloves. Three frames: at you, at them, ahead (row 8, the eyes).
  const doorman = [DOORMAN_EYES[0], DOORMAN_EYES[1], DOORMAN_EYES[2]].map((eyes) =>
    outlined(DOORMAN[0].length, DOORMAN.length, (c) =>
      DOORMAN.forEach((row, y) => [...(y === 8 ? eyes : row)].forEach((ch, x) => ch !== '.' && px(c, x, y, 1, 1, DOORMAN_INK[ch]))),
    ),
  );
  // The street lamp: an iron post with a lantern head.
  const lamp = outlined(14, 176, (c) => {
    px(c, 5, 22, 4, 150, k);
    px(c, 5, 22, 1, 150, l);
    px(c, 3, 164, 8, 12, k);
    px(c, 1, 172, 12, 4, k);
    px(c, 3, 18, 8, 4, k);
    px(c, 1, 2, 12, 16, '#2a2238');
    px(c, 3, 4, 8, 12, Yl);
    px(c, 3, 4, 2, 12, '#fffbe6');
    px(c, 3, 0, 8, 2, k);
    px(c, 6, 0, 2, 1, G);
  });
  // RUN OVER (THROWN OUT!, CLOSING TIME): dusting off his gloves. His hands come off his sides (rows 34-36) to his
  // chest, one over the other, two frames.
  const dust = [0, 1].map((f) =>
    outlined(DOORMAN[0].length, DOORMAN.length, (c) => {
      DOORMAN.forEach((row, y) =>
        [...(y === 8 ? DOORMAN_EYES[0] : row)].forEach((ch, x) => {
          if (y >= 34 && y <= 36 && (x <= 3 || x >= 18)) return;
          if (ch !== '.') px(c, x, y, 1, 1, DOORMAN_INK[ch]);
        }),
      );
      // the forearms across, the gloves at the chest (white, a grey shade), the top hand brushing
      px(c, 4, 25 + f, 5, 2, DOORMAN_INK.R);
      px(c, 13, 26 - f, 5, 2, DOORMAN_INK.d);
      px(c, 8, 24 + f, 3, 3, DOORMAN_INK.T);
      px(c, 8, 26 + f, 3, 1, DOORMAN_INK.t);
      px(c, 11, 25 - f, 3, 3, DOORMAN_INK.T);
      px(c, 11, 27 - f, 3, 1, DOORMAN_INK.t);
    }),
  );
  props = { crest, doorman, dust, lamp };
}

// ---- the still layer --------------------------------------------------------------------------------------------

let still: HTMLCanvasElement | null = null;
function buildStill(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // The sky, in three steps with a dithered seam, a few stars.
  SKY.forEach((col, i) => px(g, 0, i * 6, RW, 6, col));
  for (let x = 0; x < RW; x += 2) px(g, x + ((x / 2) % 2), 6, 1, 1, SKY[1]);
  for (const [x, y] of [[14, 3], [52, 9], [301, 4], [344, 2], [610, 6], [588, 12], [120, 5], [470, 10]]) px(g, x, y, 1, 1, '#9a8fb0');
  // The casino's front: dressed stone (or plain, for the before/after), pilasters with gold capitals, a gold cornice,
  // a stone base course the whole front stands on.
  px(g, 0, 16, RW, GROUND - 16, WALL);
  if (ENTRANCE.walls) {
    // Ashlar: blocks 22x11, staggered, mortar a shade darker, every other block's top edge catching a little light.
    for (let y = 19, row = 0; y < GROUND - 12; y += 11, row++) {
      px(g, 0, y, RW, 1, WALL_D);
      for (let x = row % 2 ? -11 : 0, n = 0; x < RW; x += 22, n++) {
        px(g, x, y, 1, Math.min(11, GROUND - 12 - y), WALL_D);
        if ((n + row) % 2) px(g, x + 1, y + 1, 20, 1, '#262039');
        if ((n * 7 + row * 3) % 11 === 0) px(g, x + 1, y + 2, 20, Math.min(9, GROUND - 14 - y), '#1e172e');
      }
    }
  } else {
    for (let y = 40; y < GROUND; y += 22) px(g, 0, y, RW, 1, WALL_D);
    for (let y = 40; y < GROUND; y += 22) for (let x = (y / 22) % 2 ? 0 : 20; x < RW; x += 40) px(g, x, y - 21, 1, 21, WALL_D);
  }
  px(g, 0, 14, RW, 3, g8);
  px(g, 0, 14, RW, 1, G);
  px(g, 0, 17, RW, 2, K);
  // The base course: the doors' steps, the pilasters and THE DOORMAN all meet the sidewalk on this line.
  px(g, 0, GROUND - 12, RW, 12, '#2a2140');
  px(g, 0, GROUND - 12, RW, 1, '#3a2d52');
  px(g, 0, GROUND - 11, RW, 1, WALL_D);
  for (let x = 0; x < RW; x += 44) px(g, x, GROUND - 11, 1, 11, WALL_D);
  for (const x of [64, 252, 376, 562]) {
    px(g, x, 19, 14, GROUND - 31, WALL_L);
    px(g, x, 19, 2, GROUND - 31, '#33284a');
    px(g, x + 12, 19, 2, GROUND - 31, WALL_D);
    px(g, x - 2, 19, 18, 4, g8);
    px(g, x - 2, 19, 18, 1, G);
    px(g, x - 2, GROUND - 16, 18, 16, '#2e2444');
    px(g, x - 2, GROUND - 16, 18, 1, '#3a2d52');
  }
  // The entrance's stone surround, darker inside, down to the top step.
  px(g, 274, 52, 92, 74, WALL_D);
  px(g, 278, 54, 84, 72, '#120c1e');
  // Three marble steps from the threshold down to the sidewalk, the last one on the ground line.
  for (const [y, x0, x1] of [[GROUND - 19, 286, 354], [GROUND - 13, 280, 360], [GROUND - 7, 272, 368]] as const) {
    px(g, x0, y, x1 - x0, 2, '#5a4d72');
    px(g, x0, y + 2, x1 - x0, 4, '#2e2444');
    px(g, x0, y + 6, x1 - x0, 1, K);
  }
  // The sidewalk, seen from a standing eye (eye level y HORIZON): wet slabs, the rows opening up toward us, the joints
  // running to the vanishing point over the doors. Dark: it lies behind the reels and THE POT.
  px(g, 0, GROUND, RW, KERB - GROUND, PAVE);
  for (const y of [GROUND + 4, GROUND + 10, GROUND + 18, GROUND + 29, GROUND + 44, GROUND + 64, GROUND + 92, GROUND + 128]) if (y < KERB) px(g, 0, y, RW, 1, PAVE_L);
  for (let x0 = CX - 14 * 18; x0 <= CX + 14 * 18; x0 += 14)
    for (let y = GROUND + 1; y < KERB; y++) px(g, CX + ((x0 - CX) * (y - HORIZON)) / (GROUND - HORIZON), y, 1, 1, PAVE_L);
  px(g, 0, GROUND, RW, 1, K);
  // The kerb, then the street (wet asphalt under the buttons).
  px(g, 0, KERB, RW, 2, '#4a3d62');
  px(g, 0, KERB + 2, RW, 4, '#2e2444');
  px(g, 0, KERB + 6, RW, 1, K);
  px(g, 0, KERB + 7, RW, RH - KERB - 7, '#100c1a');
  for (let i = 0; i < 160; i++) px(g, (i * 97) % RW, KERB + 8 + ((i * 53) % (RH - KERB - 8)), 1, 1, '#1a1428');
  // The red carpet: from the bottom step toward us across the sidewalk to the kerb, in the same perspective; dark,
  // warmed only near the doors.
  for (let y = GROUND; y < KERB; y++) {
    const hw = Math.round((14 * (y - HORIZON)) / (GROUND - HORIZON));
    px(g, CX - hw, y, hw * 2, 1, (y >> 1) % 2 ? '#5e1626' : '#661a2b');
    px(g, CX - hw, y, 1, 1, g8);
    px(g, CX + hw - 1, y, 1, 1, g8);
    px(g, CX - hw + 1, y, 2, 1, '#3e0e1c');
  }
  for (const y of [GROUND + 4, GROUND + 14, GROUND + 30, GROUND + 56, GROUND + 98]) px(g, CX - 1, y, 2, 2 + (y - GROUND) / 10, '#7a2234');
  // Left: the casino's own bill on the wall (THE HOUSE is the casino's name; its gold Slot Machine), framed in gold.
  // (Its boss is THE DOORMAN since 2026-11-09; the bill drew the boss's face, which is his now.)
  const py = 50;
  px(g, 12, py, 46, 82, G);
  px(g, 13, py + 1, 44, 80, g8);
  px(g, 14, py + 2, 42, 78, '#2a1430');
  drawText(g, 'LIVE', 35, py + 10, 1, Y, { outline: K });
  drawSprite(g, 'houseMachine' as SpriteId, 35, py + 36, 1);
  drawText(g, 'THE', 35, py + 59, 1, T, { outline: K });
  drawText(g, 'HOUSE', 35, py + 69, 1, R, { outline: K });
  px(g, 11, py + 80, 48, 2, K);
  // Right: the blade sign's bracket (the letters and bulbs are live).
  px(g, 606, 20, 12, 6, k);
  px(g, 610, 19, 4, 2, k);
  return c;
}

// ---- the live layer ---------------------------------------------------------------------------------------------

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'coin' | 'spark' | 'confetti' | 'drip';
  c: string;
  /** A coin's resting row on the pavement (it rolls toward us, in perspective), and the step it's bouncing on. */
  gy?: number;
  lv?: number;
}
interface State {
  t: number;
  pot: number;
  potShown: number;
  foeHp: number;
  hitT: number;
  skimT: number;
  cheerT: number;
  open: number;
  bits: Bit[];
  rain: { x: number; y: number; v: number }[];
}
const st: State = { t: 0, pot: 0, potShown: 0, foeHp: 1, hitT: 0, skimT: 0, cheerT: 0, open: 0, bits: [], rain: [] };
for (let i = 0; i < 70; i++) st.rain.push({ x: Math.random() * RW, y: Math.random() * RH, v: 150 + Math.random() * 60 });

/** Your jackpot: gold confetti off the canopy. */
export function entranceCheer(ours: boolean): void {
  st.cheerT = 1;
  if (!ours) return;
  const cols = [Y, R, T, G, '#7cc4ff'];
  for (let i = 0; i < 40; i++) st.bits.push({ x: CX + (Math.random() - 0.5) * 120, y: 50, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 40, life: 2.5, kind: 'confetti', c: cols[i % cols.length] });
}

export function entranceUpdate(dt: number): void {
  st.t += dt;
  st.hitT = Math.max(0, st.hitT - dt / 0.9);
  st.skimT = Math.max(0, st.skimT - dt / 1.6);
  st.cheerT = Math.max(0, st.cheerT - dt / 1.6);
  st.potShown += (st.pot - st.potShown) * Math.min(1, dt * 3);
  for (const rd of st.rain) {
    rd.y += rd.v * dt;
    rd.x -= rd.v * dt * 0.12;
    if (rd.y > RH) {
      rd.y = -6;
      rd.x = Math.random() * (RW + 40);
    }
  }
  for (const b of st.bits) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += (b.kind === 'confetti' ? 60 : 260) * dt;
    if (b.kind === 'confetti') b.vx *= 0.98;
    // Coins bounce down the two steps, then out onto the pavement toward us (their resting row, gy).
    if (b.kind === 'coin') {
      const levels = [GROUND - 19, GROUND - 13, GROUND - 7, b.gy ?? GROUND + 6];
      const lv = b.lv ?? 0;
      if (b.vy > 0 && b.y >= levels[lv]) {
        b.y = levels[lv];
        b.vy = -Math.abs(b.vy) * 0.5;
        if (lv < 3) {
          b.lv = lv + 1;
          b.vy = Math.min(b.vy, -25);
        } else b.vx *= 0.7;
      }
    }
    b.life -= dt;
  }
  st.bits = st.bits.filter((b) => b.life > 0 && b.y < RH + 4);
}

/** Read the fight: THE POT and THE HOUSE's HP, and react to a change (a hit, a SKIM, the pot growing). */
function read(pot: number, foeHp: number): void {
  // A new fight (THE HOUSE back at full HP): the doors shut, the pot empty.
  if (foeHp > st.foeHp + 0.3) entranceReset();
  if (foeHp < st.foeHp - 0.002) {
    st.hitT = 1;
    for (let i = 0; i < 8; i++) st.bits.push({ x: 258 + Math.random() * 124, y: 52, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 20, life: 0.9, kind: 'spark', c: Math.random() < 0.5 ? Y : O });
  }
  if (pot < st.pot - 0.5 && st.pot - pot >= Math.max(10, st.pot * 0.2)) {
    st.skimT = 1;
    const n = Math.min(14, 4 + Math.round((st.pot - pot) / 20));
    for (let i = 0; i < n; i++) st.bits.push({ x: CX + (Math.random() - 0.5) * 40, y: GROUND - 24, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 40, life: 2.6, kind: 'coin', c: Y, gy: GROUND + 6 + Math.random() * 50 });
  }
  st.pot = pot;
  st.foeHp = foeHp;
  // The doors open as THE HOUSE falls: shut above half, wide open at 0 (the floor beyond).
  const want = Math.max(0, Math.min(1, (0.5 - foeHp) / 0.5));
  st.open += (want - st.open) * 0.08;
}

const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

/** The canopy's and the blade sign's bulbs, in chase order: a ripple of dark bulbs after a hit, a race at a SKIM. */
let dawnNow = 0;
function bulbsOn(i: number, n: number, t: number): number {
  // CLOSING TIME (RUN OVER in ENDLESS): dawn switches the bulbs off one by one.
  if (dawnNow > 0 && i < Math.floor(dawnNow * (n + 1))) return 0;
  const race = st.skimT > 0 ? 1 + 4 * st.skimT : 1;
  const step = Math.floor(t * 6 * race);
  let on = (i + step) % 3 === 0 ? 1 : 0;
  // THE POT fills: more bulbs lit (a full pot: every bulb).
  const potK = Math.min(1, st.potShown / 400);
  if (!on && (i * 7 + step) % 10 < potK * 6) on = 1;
  // A hit: a band of dead bulbs runs outward from the middle.
  if (st.hitT > 0) {
    const front = (1 - st.hitT) * (n / 2 + 4);
    if (Math.abs(Math.abs(i - n / 2) - front) < 3) on = 0;
  }
  return on;
}

/** `dawn` (0-1, RUN OVER's CLOSING TIME): the sky greys, the bulbs switch off one by one, the lamp goes out. `dust`:
 * THE DOORMAN dusts off his gloves (RUN OVER: you've just been thrown out). */
export function drawEntrance(ctx: CanvasRenderingContext2D, o: { pot: number; foeHp: number; turn: 'player' | 'enemy' | null; time: number; dim?: number; dawn?: number; dust?: boolean }): void {
  dawnNow = o.dawn ?? 0;
  if (!props) makeProps();
  if (!still) still = buildStill();
  read(o.pot, o.foeHp);
  const t = o.time;
  const gg = lg;
  gg.clearRect(0, 0, RW, RH);
  const P2 = props!;
  const potK = Math.min(1, st.potShown / 400);

  // THE HOUSE's crest: gold rays behind it grow with THE POT (pixel rays, not a glow: a soft yellow over the plum wall
  // reads olive); a hit jolts it.
  const jolt = st.hitT > 0.6 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
  const rays = Math.round(4 + 10 * potK);
  for (const [ax, ay] of [[-1, 0], [1, 0], [-1, -0.5], [1, -0.5], [-0.5, -1], [0.5, -1]] as const)
    for (let i = 0; i < rays; i++) if ((i + Math.floor(t * 8)) % 4 !== 0) px(gg, CX + ax * (22 + i), 13 + ay * (2 + i * 0.6), 1, 1, i < rays / 2 ? Y : G);
  gg.drawImage(P2.crest, CX - 21 + jolt, 3);

  // The doors (version 1's size and place, high in the open column so they open where the player sees them, above THE
  // POT): two gilded doors with amber glass on the top step.
  const dx = 286;
  const dy = 58;
  const dw = 68;
  const dh = 68;
  const open = st.open;
  // Beyond the doors: the casino floor. A warm back wall, a chandelier, two rows of machines with lit screens, a
  // patterned carpet running back.
  if (open > 0.02) {
    px(gg, dx, dy, dw, 30, '#3a1626');
    for (let x = dx; x < dx + dw; x += 8) px(gg, x, dy, 1, 30, '#4a1c30');
    px(gg, dx, dy + 30, dw, dh - 30, '#6a1a2a');
    for (let y = dy + 32; y < dy + dh; y += 4) for (let x = dx + ((y >> 2) % 2) * 3; x < dx + dw; x += 6) px(gg, x, y, 2, 1, '#8a2a3a');
    px(gg, CX - 1, dy, 2, 6, G);
    px(gg, CX - 10, dy + 6, 20, 2, G);
    for (let i = 0; i < 6; i++) px(gg, CX - 9 + i * 3 + 1, dy + 8 + (i % 2), 1, 2, (i + Math.floor(t * 3)) % 3 ? Yl : T);
    for (const [row, y0, w, h] of [[0, dy + 18, 6, 12], [1, dy + 30, 9, 18]] as const)
      for (let x = dx + 1 + row * 2; x < dx + dw - w; x += w + 3) {
        px(gg, x, y0, w, h, K);
        px(gg, x + 1, y0 + 1, w - 2, h - 2, row ? '#3a2d52' : '#2a2040');
        px(gg, x + 2, y0 + 3, w - 4, row ? 5 : 3, Math.floor(t * 2 + x * 0.3) % 4 === 0 ? Y : row ? '#7cc4ff' : '#4fe0bf');
        px(gg, x + 1, y0 + 1, w - 2, 1, G);
      }
  }
  const leaf = Math.round((dw / 2) * (1 - open * 0.86));
  const lit = potK > 0.5 || st.skimT > 0 ? 1 : 0;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? dx : dx + dw - leaf;
    px(gg, x0, dy, leaf, dh, g8);
    px(gg, x0 + 1, dy + 1, leaf - 2, dh - 2, '#4a2612');
    if (leaf > 10) {
      // amber glass, lit from inside, warmer low down (calm at rest, warm with THE POT), an etched crown in each pane
      px(gg, x0 + 4, dy + 5, leaf - 8, 38, '#3a1c0c');
      const bands = [lit ? '#94522a' : '#5e3218', lit ? '#a8642a' : '#6e3c1c', lit ? '#c97a38' : '#844824'];
      bands.forEach((c, i) => px(gg, x0 + 5, dy + 6 + i * 12, leaf - 10, 12, c));
      px(gg, x0 + 5, dy + 6, 1, 36, lit ? '#e8b070' : '#a8642a');
      const cx2 = x0 + Math.floor(leaf / 2);
      px(gg, cx2 - 4, dy + 22, 9, 3, G);
      for (const k2 of [-4, 0, 4]) px(gg, cx2 + k2, dy + 19, 1, 3, G);
      // the push bar
      px(gg, side < 0 ? x0 + leaf - 7 : x0 + 3, dy + 48, 4, 10, G);
      px(gg, side < 0 ? x0 + leaf - 7 : x0 + 3, dy + 48, 1, 10, Yl);
    }
  }
  // The light down the seam: it brightens with THE POT, and a SKIM widens it (the house opening its doors to take).
  if (open <= 0.02) {
    const seamW = st.skimT > 0.3 ? 4 : 2;
    px(gg, CX - seamW / 2, dy + 2, seamW, dh - 4, lit ? Yl : '#c97a38');
  }
  // The doors' light on the steps and the first rows of the carpet (stepped, no blur).
  const warm = Math.min(1, 0.25 + 0.5 * potK + 0.5 * st.skimT + open);
  for (const [y, x0, x1] of [[GROUND - 19, 286, 354], [GROUND - 13, 280, 360], [GROUND - 7, 272, 368]] as const) {
    const w = Math.round((x1 - x0) * (0.4 + 0.4 * warm));
    px(gg, CX - w / 2, y, w, 2, warm > 0.6 ? '#c99a6a' : '#8a6a72');
    px(gg, CX - w / 4, y, w / 2, 1, warm > 0.6 ? Yl : '#b08a7a');
  }
  gg.globalAlpha = 0.25 + 0.35 * warm;
  for (let y = GROUND + 1; y < GROUND + 12; y += 2) px(gg, CX - 14 + (y - GROUND) / 2, y, 28 - (y - GROUND), 1, '#a8343f');
  gg.globalAlpha = 1;
  // The frame round the doors.
  px(gg, dx - 4, dy - 4, dw + 8, 4, G);
  px(gg, dx - 4, dy - 4, dw + 8, 1, Yl);
  px(gg, dx - 4, dy, 4, dh, G);
  px(gg, dx + dw, dy, 4, dh, G);
  px(gg, dx - 4, dy, 1, dh, Yl);

  // The canopy: a deep red marquee, CASINO in gold, bulbs along both edges.
  const cy0 = 32 + (st.hitT > 0.7 ? 1 : 0);
  px(gg, 252, cy0, 136, 20, d);
  px(gg, 252, cy0 + 1, 136, 2, r);
  px(gg, 252, cy0 + 20, 136, 3, K);
  px(gg, 256, cy0 + 23, 128, 2, '#0a0610');
  // A hit shorts the sign: the letters drop out and stutter back.
  const shorted = st.hitT > 0.25 && Math.floor(t * 14) % 3 !== 0;
  drawText(gg, 'CASINO', CX, cy0 + 11, 2, shorted ? '#5a2a1a' : potK > 0.6 || st.cheerT > 0 ? Yl : G, { outline: K });
  const n = 22;
  for (let i = 0; i < n; i++) {
    bulb(gg, 254 + i * 6, cy0 - 2, bulbsOn(i, n, t));
    bulb(gg, 254 + i * 6, cy0 + 17, bulbsOn(n - 1 - i, n, t + 0.08));
  }
  // Drips off the canopy's edge.
  if (Math.random() < 0.08) st.bits.push({ x: 254 + Math.random() * 132, y: cy0 + 24, vx: 0, vy: 30, life: 0.6, kind: 'drip', c: '#9ab0e0' });

  // The blade sign: C A S I N O down a gold box, its bulbs chasing down, all lit at a full pot.
  const bx = 600;
  const by = 26;
  px(gg, bx - 2, by - 2, 28, 110, K);
  px(gg, bx, by, 24, 106, d);
  px(gg, bx, by, 24, 2, G);
  px(gg, bx, by + 104, 24, 2, G);
  'CASINO'.split('').forEach((ch, i) => drawText(gg, ch, bx + 12, by + 10 + i * 17, 2, (Math.floor(t * 2) + i) % 6 === 0 || st.cheerT > 0 ? Yl : G, { outline: K }));
  for (let i = 0; i < 18; i++) {
    bulb(gg, bx - 4, by + 1 + i * 6, bulbsOn(i, 18, t + 0.3));
    bulb(gg, bx + 25, by + 1 + i * 6, bulbsOn(17 - i, 18, t + 0.3));
  }

  // The street lamp (left) and its pool on the pavement; it flickers once in a while.
  const flick = (Math.sin(t * 13) > 0.97 ? 0.5 : 1) * (dawnNow > 0.6 ? 0 : 1);
  pool(gg, 65, KERB - 166, 14, 12, O, 0.22 * flick);
  gg.drawImage(P2.lamp, 59, KERB - 178);
  pool(gg, 65, KERB - 6, 26, 6, O, 0.18 * flick);

  // THE DOORMAN (right), at the base line: he watches whoever's spinning; your jackpot makes him nod.
  const fr = o.turn === 'player' ? 1 : o.turn === 'enemy' ? 2 : 0;
  const nod = st.cheerT > 0.4 && Math.floor(t * 8) % 2 ? 1 : 0;


  if (o.dust) gg.drawImage(P2.dust[Math.floor(t * 7) % 2], 572, GROUND - 60);
  else gg.drawImage(P2.doorman[fr], 572, GROUND - 60 + nod);
  // Reflections on the wet pavement: the doors' light, the blade sign, the lamp.
  for (const [x, y0, w, c, a] of [[CX - 14, GROUND, 28, Yl, 0.08 + 0.1 * potK], [bx + 4, GROUND, 16, R, 0.09], [61, KERB + 7, 8, Yl, 0.07]] as const) {
    gg.globalAlpha = a;
    for (let y = y0 + 3; y < Math.min(RH, y0 + 3 + (w > 10 ? 60 : 30)); y += 3) px(gg, x + Math.round(Math.sin(t * 2 + y * 0.3)), y, w - ((y - y0) >> 3), 1, c);
  }
  gg.globalAlpha = 1;

  // Rain (not under the canopy), and the bits: coins, sparks, confetti, drips.
  gg.fillStyle = '#7f8fc0';
  gg.globalAlpha = 0.35;
  for (const rd of st.rain) {
    if (rd.x > 250 && rd.x < 390 && rd.y > 54 && rd.y < GROUND - 19) continue;
    gg.fillRect(Math.round(rd.x), Math.round(rd.y), 1, 4);
  }
  gg.globalAlpha = 1;
  for (const b of st.bits) {
    gg.globalAlpha = Math.min(1, b.life * 2);
    if (b.kind === 'coin') {
      const edge = Math.floor(t * 10 + b.x) % 3 === 0;
      px(gg, b.x - (edge ? 0 : 1), b.y - 1, edge ? 1 : 3, 3, Y);
      px(gg, b.x, b.y - 1, 1, 1, '#fffbe6');
    } else if (b.kind === 'confetti') px(gg, b.x, b.y, Math.sin(t * 9 + b.x) > 0 ? 2 : 1, 1, b.c);
    else if (b.kind === 'drip') px(gg, b.x, b.y, 1, 2, b.c);
    else px(gg, b.x, b.y, 1, 1, b.c);
  }
  gg.globalAlpha = 1;
  // Dawn: the sky over the roofline greys in flat steps (no gradient), palest low down.
  if (dawnNow > 0) {
    for (const [y0, y1, c, a] of [[0, 5, '#4a4a6a', 0.55], [5, 10, '#6a6a88', 0.55], [10, 14, '#9a8aa6', 0.5]] as const) {
      gg.globalAlpha = a * dawnNow;
      px(gg, 0, y0, RW, y1 - y0, c);
    }
    gg.globalAlpha = 1;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still!, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

/** For the gallery and dbg: reset the fight state (a new fight starts with the doors shut and the pot empty). */
export function entranceReset(): void {
  Object.assign(st, { pot: 0, potShown: 0, foeHp: 1, hitT: 0, skimT: 0, cheerT: 0, open: 0, bits: [] });
}

/** For the gallery: redraw the still layer (after changing ENTRANCE.walls). */
export function entranceRebuild(): void {
  still = null;
}
