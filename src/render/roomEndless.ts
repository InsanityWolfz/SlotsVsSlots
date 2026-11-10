/**
 * ENDLESS, LATE AT NIGHT (rooms v2's journey; the user, 2026-11-09): each loop replays an earlier strip later in the
 * night, "thinned out, darker... like you're closing down the casino", and at the end "there's nobody left, and that's
 * when THE OWNER shows up to confront you because you've been winning so much money".
 *
 * - `endlessLate(loop)`: how late the night is (0.3 at loop 1 to 1 by loop 5): the acts' own `late` hooks (fewer
 *   players, dark machines, chairs up, lamps off) read it.
 * - `drawNightCrew`: the closing shift over a station: a cleaner with a mop down the aisle, a porter stacking chairs.
 * - `drawLobby`: THE DOORMAN's ENDLESS room. The lobby from inside, the gilded doors and the night street through their
 *   glass, EXIT over them, him in front of them to show you out. Alive like his outside room: THE POT warms the
 *   chandelier and EXIT's bulbs, a SKIM spills coins across the marble, a hit shorts EXIT and drops sparks.
 * - `drawOwnerRoom`: THE OWNER's. The casino floor emptied (act 2's last station, every light out), one spotlight down
 *   the aisle and him in it, his fortune's ladder on the progressive board over him (25K / 250K / 2.5M / 25M, a lamp a
 *   rung; each rung you climb goes dark with a shower of chips). His tricks crackle lightning from his raised hand up
 *   into the spotlight's rig: on him only (a small area, never the screen), capped at FLASH_CAP, half that and a single
 *   fade with LIGHTNING SOFT.
 *
 * Same grid and rules as the other rooms: 640x360, 2 screen pixels an art pixel, the portraits' palette and 1px
 * outline, stepped light (no gradients), dark and calm behind the reels.
 */
import { bulb, DOORMAN, DOORMAN_EYES, DOORMAN_INK, mk, outlined, pool, px, RH, RW } from './roomEntrance';
import { drawText } from './text';
import { drawPatron, MOP_HANDS } from './patrons';

/** FLASH_CAP (present/fx.ts): no flash over 0.2 of white, ever (photosensitivity, binding). */
const CAP = 0.2;

const CX = 320;
// The journey's projection (the street's and the floor's): one eye level, one vanishing point.
const HOR = 140;
const EYE = 250;
const xAt = (lat: number, z: number) => CX + lat / z;
const yAt = (h: number, z: number) => HOR + (EYE - h) / z;

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
const O = '#f07c1c';

/** How late the night is in this ENDLESS loop (0 early .. 1 closing time): 0.3 at loop 1, 1 by loop 5 (THE OWNER). */
export const endlessLate = (loop: number) => (loop <= 0 ? 0 : Math.min(1, 0.3 + 0.175 * (loop - 1)));

// ---- the closing shift ------------------------------------------------------------------------------------------

const [crewC, cg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);
const CLEANER = { skin: '#c07a5c', hair: '#3a2416', coat: '#3a5a6a', legs: '#24202e', hairStyle: 'cap' as const };
const PORTER = { skin: '#f4c09a', hair: '#1a1014', coat: '#5a1a2a', legs: '#1a1420', hairStyle: 'short' as const, tie: 'bow' as const };

/** The closing shift over a station (from late 0.6): a cleaner mopping by the aisle; later (0.8) a porter beside
 * his stack of chairs. `where`: the floor's aisle or the high-roller room's. Drawn over the station, under the HUD. */
export function drawNightCrew(ctx: CanvasRenderingContext2D, where: 'floor' | 'hr', late: number, t: number, station = 0): void {
  if (late < 0.6) return;
  const g = cg;
  g.clearRect(0, 0, RW, RH);
  // The cleaner, standing by the aisle's edge and mopping one patch (the user, 2026-11-10: nobody walks across the
  // aisle): both hands on the pole, the mop's head drawn slowly back and forth over the carpet in front of them.
  const z = where === 'floor' ? 2.9 : 2.7;
  const h = Math.round(270 / z);
  // (At the floor's station 1 they stand clear of the CHANGE machine at the aisle's left edge.)
  const fx = Math.round(xAt(where === 'floor' && station === 1 ? -40 : -84, z));
  const fy = Math.round(yAt(0, z));
  drawPatron(g, fx, fy, h, CLEANER, 'mop', false, 0.8);
  const sweep = Math.round(Math.sin(t * 1.5) * h * 0.07);
  const hx = fx + Math.round(MOP_HANDS.x * h);
  const mx = hx + Math.round(h * 0.13) + sweep;
  const top = fy - Math.round(h * 0.68);
  const my = fy + 3;
  // The wet patch it has covered (a band a shade lighter, steady), the pole through the hands, the mop's grey head.
  g.globalAlpha = 0.25;
  px(g, hx + Math.round(h * 0.03), my - 1, Math.round(h * 0.22), 2, '#4a4060');
  g.globalAlpha = 1;
  for (let y = top; y < my - 2; y++) px(g, Math.round(hx - 1 + ((mx - hx + 1) * (y - top)) / (my - 2 - top)), y, 1, 1, y < top + 2 ? '#c89a4a' : '#8f5a1f');
  px(g, mx - 5, my - 3, 11, 4, K);
  px(g, mx - 4, my - 2, 9, 2, '#9a8fb0');
  px(g, mx - 4, my, 9, 1, '#6d6482');
  // A yellow WET FLOOR sign by the aisle.
  const sz = z + 0.4;
  const sx = xAt(-140, sz);
  const sy = yAt(0, sz);
  const sh = Math.max(8, Math.round(60 / sz));
  px(g, sx - sh / 3, sy - sh, (sh * 2) / 3, sh, K);
  px(g, sx - sh / 3 + 1, sy - sh + 1, (sh * 2) / 3 - 2, sh - 2, Y);
  px(g, sx - 1, sy - sh + 3, 2, Math.max(2, sh / 3), K);
  if (late >= 0.8) {
    // The porter: by the far side, a stack of chairs beside him (it grows as the night goes on).
    const pz = where === 'floor' ? 3.4 : 3.2;
    const plat = 170;
    const ph = 270 / pz;
    const px0 = xAt(plat, pz);
    const py0 = yAt(0, pz);
    const n = Math.min(5, 2 + Math.floor((late - 0.8) * 15));
    for (let i = 0; i < n; i++) {
      const cy = py0 - i * Math.max(2, ph * 0.09);
      px(g, px0 + ph * 0.25, cy - ph * 0.22, ph * 0.28, Math.max(1, ph * 0.03), '#5a311c');
      px(g, px0 + ph * 0.25, cy - ph * 0.22, Math.max(1, ph * 0.03), ph * 0.22, '#3a1e10');
      px(g, px0 + ph * 0.5, cy - ph * 0.22, Math.max(1, ph * 0.03), ph * 0.22, '#3a1e10');
      px(g, px0 + ph * 0.25, cy - ph * 0.42, ph * 0.28, ph * 0.2, i % 2 ? '#6a1a2a' : '#5a1626');
    }
    drawPatron(g, px0, py0, ph, PORTER, 'standL', false, 0.8);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(crewC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

// ---- THE DOORMAN's lobby (his ENDLESS room) -----------------------------------------------------------------------

/** The lobby's floor line: the foot of the doors' steps. High in the open column, so the doors and THE DOORMAN read
 * clear of the gutter's chips (SPIN n at art y 82-92, the LOOP n BOSS label and TONIGHT'S RULE from 100 to ~135). */
const GROUND = 84;
const HORIZON = 40;
const DX = 286;
const DW = 68;
const DH = 46;
const DY = GROUND - 13 - DH;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'coin' | 'spark' | 'chip';
  c: string;
  gy: number;
}
interface LobbyState {
  t: number;
  pot: number;
  potShown: number;
  foeHp: number;
  hitT: number;
  skimT: number;
  bits: Bit[];
  rain: { x: number; y: number; v: number }[];
}
const ls: LobbyState = { t: 0, pot: 0, potShown: 0, foeHp: 1, hitT: 0, skimT: 0, bits: [], rain: [] };
for (let i = 0; i < 24; i++) ls.rain.push({ x: DX + Math.random() * DW, y: DY + Math.random() * DH, v: 70 + Math.random() * 30 });

let lobbyStill: HTMLCanvasElement | null = null;
let doormanFrames: HTMLCanvasElement[] | null = null;
function buildLobby(): HTMLCanvasElement {
  const [c, g] = mk(RW, RH);
  // The walls: dark walnut panels with brass rails, marble pilasters either side of the doors.
  px(g, 0, 0, RW, GROUND, '#1c1220');
  for (let x = 0; x < RW; x += 64) {
    px(g, x + 6, 22, 52, GROUND - 36, '#22161f');
    px(g, x + 6, 22, 52, 1, '#3a2620');
    px(g, x + 6, GROUND - 21, 52, 1, '#120a12');
  }
  px(g, 0, 18, RW, 3, g8);
  px(g, 0, 18, RW, 1, G);
  px(g, 0, GROUND - 14, RW, 2, g8);
  for (const x of [246, 368]) {
    px(g, x, 4, 26, GROUND - 4, '#2c2434');
    px(g, x + 2, 4, 2, GROUND - 4, '#3a3046');
    for (let y = 14; y < GROUND; y += 23) px(g, x + 6, y, 14, 1, '#241c2c');
    px(g, x - 2, 2, 30, 4, g8);
    px(g, x - 2, GROUND - 6, 30, 6, '#1c1626');
  }
  // The doors' surround: a gold frame and a dark recess (the doors and the street through them are live).
  px(g, DX - 8, DY - 8, DW + 16, DH + 8, '#120a12');
  px(g, DX - 4, DY - 4, DW + 8, 4, G);
  px(g, DX - 4, DY - 4, DW + 8, 1, Yl);
  px(g, DX - 4, DY, 4, DH, G);
  px(g, DX + DW, DY, 4, DH, G);
  // The marble floor, toward us in one-point perspective: dark and light tiles, the red runner to the doors.
  for (let y = GROUND; y < RH; y++) {
    const z = (EYE - 0) / (y + 0.5 - HORIZON) / 2;
    const row = Math.floor(z * 6);
    for (let x = 0; x < RW; x += 2) {
      const lat = (x - CX) * z * 2;
      const col = Math.floor(lat / 60);
      px(g, x, y, 2, 1, (row + col) % 2 ? '#1e1a28' : '#262236');
    }
    const half = Math.round(30 + (y - GROUND) * 0.55);
    px(g, CX - half, y, half * 2, 1, (y - GROUND) % 6 < 1 ? '#5a1626' : '#6a1a2a');
    px(g, CX - half, y, 2, 1, g8);
    px(g, CX + half - 2, y, 2, 1, g8);
  }
  // Two steps up to the doors.
  px(g, DX - 10, GROUND - 6, DW + 20, 6, '#2c2434');
  px(g, DX - 10, GROUND - 6, DW + 20, 1, '#4a4060');
  px(g, DX - 4, GROUND - 12, DW + 8, 6, '#34293e');
  px(g, DX - 4, GROUND - 12, DW + 8, 1, '#4a4060');
  // A velvet bench (left) and the coat check's dark counter (right), calm behind the reels.
  px(g, 40, GROUND - 14, 120, 8, '#4a1626');
  px(g, 40, GROUND - 14, 120, 2, '#6a1a2a');
  px(g, 44, GROUND - 6, 4, 6, g8);
  px(g, 152, GROUND - 6, 4, 6, g8);
  px(g, 470, GROUND - 34, 140, 34, '#2a1a14');
  px(g, 470, GROUND - 34, 140, 3, '#5a311c');
  px(g, 470, GROUND - 31, 140, 1, G);
  drawText(g, 'COAT CHECK', 540, GROUND - 44, 1, '#8f5a1f', { outline: K });
  // EXIT over the doors: the casino's sign system (a dark red panel, a gold rim); its bulbs (on the doors' frame) are
  // live.
  px(g, CX - 27, 2, 54, 18, K);
  px(g, CX - 26, 3, 52, 16, d);
  px(g, CX - 26, 3, 52, 1, G);
  px(g, CX - 26, 17, 52, 2, G);
  // Two brass sconces either side of the doors (their light is live).
  for (const x of [262, 374]) {
    px(g, x, 30, 4, 8, g8);
    px(g, x - 2, 28, 8, 2, G);
  }
  return c;
}

function makeDoorman(): HTMLCanvasElement[] {
  return DOORMAN_EYES.map((eyes) =>
    outlined(DOORMAN[0].length, DOORMAN.length, (c) =>
      DOORMAN.forEach((row, y) => [...(y === 8 ? eyes : row)].forEach((ch, x) => ch !== '.' && px(c, x, y, 1, 1, DOORMAN_INK[ch]))),
    ),
  );
}

export function lobbyUpdate(dt: number): void {
  ls.t += dt;
  ls.hitT = Math.max(0, ls.hitT - dt / 0.9);
  ls.skimT = Math.max(0, ls.skimT - dt / 1.6);
  ls.potShown += (ls.pot - ls.potShown) * Math.min(1, dt * 3);
  for (const rd of ls.rain) {
    rd.y += rd.v * dt;
    rd.x -= rd.v * dt * 0.1;
    if (rd.y > DY + DH) {
      rd.y = DY;
      rd.x = DX + Math.random() * DW;
    }
  }
  for (const b of ls.bits) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 260 * dt;
    if (b.kind !== 'spark' && b.vy > 0 && b.y >= b.gy) {
      b.y = b.gy;
      b.vy = -Math.abs(b.vy) * 0.4;
      b.vx *= 0.7;
    }
    b.life -= dt;
  }
  ls.bits = ls.bits.filter((b) => b.life > 0);
}
export function lobbyReset(): void {
  Object.assign(ls, { pot: 0, potShown: 0, foeHp: 1, hitT: 0, skimT: 0, bits: [] });
}
function lobbyRead(pot: number, foeHp: number): void {
  if (foeHp > ls.foeHp + 0.3) lobbyReset();
  if (foeHp < ls.foeHp - 0.002) {
    ls.hitT = 1;
    for (let i = 0; i < 8; i++) ls.bits.push({ x: CX - 26 + Math.random() * 52, y: 10, vx: (Math.random() - 0.5) * 30, vy: Math.random() * 20, life: 0.9, kind: 'spark', c: Math.random() < 0.5 ? Y : O, gy: RH });
  }
  if (pot < ls.pot - 0.5 && ls.pot - pot >= Math.max(10, ls.pot * 0.2)) {
    ls.skimT = 1;
    const n = Math.min(14, 4 + Math.round((ls.pot - pot) / 20));
    for (let i = 0; i < n; i++) ls.bits.push({ x: CX + (Math.random() - 0.5) * 30, y: GROUND - 14, vx: (Math.random() - 0.5) * 90, vy: -40 - Math.random() * 40, life: 2.6, kind: 'coin', c: Y, gy: GROUND + 6 + Math.random() * 60 });
  }
  ls.pot = pot;
  ls.foeHp = foeHp;
}

/** THE DOORMAN's ENDLESS room: the lobby from inside, him at the doors to show you out. */
export function drawLobby(ctx: CanvasRenderingContext2D, o: { pot: number; foeHp: number; turn: 'player' | 'enemy' | null; time: number }): void {
  if (!lobbyStill) lobbyStill = buildLobby();
  if (!doormanFrames) doormanFrames = makeDoorman();
  lobbyRead(o.pot, o.foeHp);
  const t = o.time;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  const potK = Math.min(1, ls.potShown / 400);
  // Through the doors' glass: the night street (the kerb, a lamp's orange, the rain), the casino's own light on it.
  px(g, DX, DY, DW, DH, '#0d0519');
  px(g, DX, DY + 32, DW, DH - 32, '#17122a');
  px(g, DX, DY + 32, DW, 1, '#2b2140');
  pool(g, DX + 14, DY + 18, 4, 4, O, 0.6);
  px(g, DX + 13, DY + 18, 2, 14, '#2a2238');
  g.fillStyle = '#7f8fc0';
  g.globalAlpha = 0.4;
  for (const rd of ls.rain) g.fillRect(Math.round(rd.x), Math.round(rd.y), 1, 3);
  g.globalAlpha = 1;
  // The doors, from inside: two gilded leaves around clear glass, push bars at the seam.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? DX : DX + DW / 2;
    px(g, x0, DY, DW / 2, 4, g8);
    px(g, x0, DY + DH - 12, DW / 2, 12, g8);
    px(g, x0, DY, 3, DH, g8);
    px(g, x0 + DW / 2 - 3, DY, 3, DH, g8);
    px(g, x0 + 1, DY + 1, DW / 2 - 2, 1, G);
    px(g, side < 0 ? x0 + DW / 2 - 9 : x0 + 5, DY + 22, 4, 10, G);
    px(g, side < 0 ? x0 + DW / 2 - 9 : x0 + 5, DY + 22, 1, 10, Yl);
  }
  // EXIT: its letters (shorted by a hit), its bulbs (more lit as THE POT grows, racing at a SKIM).
  const shorted = ls.hitT > 0.25 && Math.floor(t * 14) % 3 !== 0;
  drawText(g, 'EXIT', CX, 11, 2, shorted ? '#5a2a1a' : potK > 0.6 ? Yl : G, { outline: K });
  const race = ls.skimT > 0 ? 1 + 4 * ls.skimT : 1;
  for (let i = 0; i < 11; i++) {
    const step = Math.floor(t * 5 * race);
    let on = (i + step) % 3 === 0 ? 1 : 0;
    if (!on && (i * 7 + step) % 10 < potK * 6) on = 1;
    if (ls.hitT > 0.4) on = 0;
    bulb(g, CX - 32 + i * 6, DY - 4, on);
  }
  // The sconces (late at night: one bulb each), brighter with THE POT, flickering at a hit.
  const lampOn = ls.hitT > 0.3 && Math.floor(t * 18) % 2 ? 0 : 1;
  for (const x of [262, 374]) {
    px(g, x, 24, 4, 4, lampOn ? (potK > 0.5 ? Yl : '#c97a38') : '#5a3a1a');
    if (lampOn) pool(g, x + 2, 26, 8 + 6 * potK, 6 + 4 * potK, Yl, 0.18 + 0.2 * potK);
  }
  pool(g, CX, GROUND + 20, 80, 12, Yl, 0.06 + 0.1 * potK + 0.1 * ls.skimT);
  // The light under the doors, from the street: a thin line, wider at a SKIM (the house taking at the door).
  px(g, DX + 2, GROUND - 13, DW - 4, ls.skimT > 0.3 ? 2 : 1, potK > 0.5 ? Yl : '#c97a38');
  // THE DOORMAN, in front of the doors (to show you out): he watches whoever's spinning.
  const fr = o.turn === 'player' ? 0 : o.turn === 'enemy' ? 1 : 2;
  const jolt = ls.hitT > 0.6 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
  g.drawImage(doormanFrames[fr], 342 + jolt, GROUND - 59);
  // Coins on the marble, sparks off the chandelier.
  for (const b of ls.bits) {
    g.globalAlpha = Math.min(1, b.life * 2);
    if (b.kind === 'coin') {
      const edge = Math.floor(t * 10 + b.x) % 3 === 0;
      px(g, b.x - (edge ? 0 : 1), b.y - 1, edge ? 1 : 3, 3, Y);
      px(g, b.x, b.y - 1, 1, 1, '#fffbe6');
    } else px(g, b.x, b.y, 1, 1, b.c);
  }
  g.globalAlpha = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(lobbyStill, 0, 0, RW * 2, RH * 2);
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}

const [liveC, lg] = typeof document !== 'undefined' ? mk(RW, RH) : ([null, null] as unknown as [HTMLCanvasElement, CanvasRenderingContext2D]);

// ---- THE OWNER's room ---------------------------------------------------------------------------------------------

/** THE OWNER's full figure, 24x62 at the room's 2px scale (his portrait: white hair swept back, gold-rimmed glasses, a
 * dark pinstripe suit, a red tie, a white pocket square, a cigar). Two frames: hands at his sides, and his right hand
 * raised (his trick: the lightning goes up from it). */
function makeOwner(raised: boolean): HTMLCanvasElement {
  return outlined(26, 62, (c) => {
    const P = (x: number, y: number, w: number, h: number, col: string) => px(c, x, y, w, h, col);
    const SUIT = '#2a2238';
    const STRIPE = '#4a4060';
    const SKIN = '#f4c09a';
    const SKIN_D = '#c07a5c';
    // hair, swept back (white, silver shade)
    P(8, 0, 10, 2, '#c8c0d0');
    P(7, 1, 12, 4, T);
    P(7, 3, 2, 3, '#c8c0d0');
    P(17, 3, 2, 3, '#c8c0d0');
    P(10, 1, 6, 1, '#ffffff');
    // face
    P(8, 4, 10, 10, SKIN);
    P(17, 5, 1, 9, SKIN_D);
    P(9, 13, 8, 1, SKIN_D);
    // glasses: gold rims, blue lenses with a glint
    P(8, 7, 4, 3, G);
    P(14, 7, 4, 3, G);
    P(12, 8, 2, 1, G);
    P(9, 8, 2, 1, '#4a6a9a');
    P(15, 8, 2, 1, '#4a6a9a');
    P(9, 8, 1, 1, T);
    P(15, 8, 1, 1, T);
    // the grin and the cigar
    P(10, 11, 5, 1, K);
    P(11, 12, 3, 1, '#ffffff');
    P(15, 11, 6, 2, '#5a311c');
    P(15, 11, 6, 1, '#9a5a30');
    P(21, 11, 1, 2, O);
    // neck, collar, tie
    P(10, 14, 6, 2, SKIN_D);
    P(9, 16, 8, 3, T);
    P(12, 16, 2, 2, R);
    // the jacket: shoulders wider than the hips, pinstripes
    P(3, 18, 20, 24, SUIT);
    for (let x = 4; x < 23; x += 3) P(x, 18, 1, 24, STRIPE);
    P(9, 18, 8, 10, T);
    P(12, 18, 2, 14, R);
    P(13, 18, 1, 14, r);
    // lapels
    for (let i = 0; i < 6; i++) {
      P(8 + Math.floor(i / 2), 18 + i, 1, 1, K);
      P(17 - Math.floor(i / 2), 18 + i, 1, 1, K);
    }
    // the pocket square, a button, the gold watch chain
    P(5, 22, 3, 2, T);
    P(12, 33, 2, 2, G);
    P(14, 36, 6, 1, G);
    // the arms: the left at his side; the right at his side, or raised (the lightning goes up from it)
    P(1, 19, 3, 20, SUIT);
    P(1, 19, 1, 20, STRIPE);
    P(1, 39, 3, 3, SKIN);
    if (raised) {
      P(22, 6, 3, 14, SUIT);
      P(24, 6, 1, 14, STRIPE);
      P(22, 2, 3, 4, SKIN);
      P(21, 1, 1, 3, SKIN);
      P(24, 0, 1, 3, SKIN);
    } else {
      P(22, 19, 3, 20, SUIT);
      P(24, 19, 1, 20, STRIPE);
      P(22, 39, 3, 3, SKIN);
    }
    // the hips and trousers (pinstripes), the shoes
    P(5, 42, 16, 2, SUIT);
    P(6, 44, 6, 14, SUIT);
    P(14, 44, 6, 14, SUIT);
    for (const x of [7, 10, 15, 18]) P(x, 44, 1, 14, STRIPE);
    P(5, 58, 8, 3, K);
    P(13, 58, 8, 3, K);
    P(6, 58, 3, 1, '#4a4060');
    P(14, 58, 3, 1, '#4a4060');
  });
}
let ownerFrames: HTMLCanvasElement[] | null = null;

interface OwnerState {
  t: number;
  rungs: number;
  foeHp: number;
  boltT: number;
  rungT: number;
  turn: 'player' | 'enemy' | null;
  bits: Bit[];
}
const os: OwnerState = { t: 0, rungs: 0, foeHp: 1, boltT: 0, rungT: 0, turn: null, bits: [] };
export function ownerUpdate(dt: number): void {
  os.t += dt;
  os.boltT = Math.max(0, os.boltT - dt / 1.1);
  os.rungT = Math.max(0, os.rungT - dt / 1.8);
  for (const b of os.bits) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 240 * dt;
    if (b.vy > 0 && b.y >= b.gy) {
      b.y = b.gy;
      b.vy = -Math.abs(b.vy) * 0.35;
      b.vx *= 0.6;
    }
    b.life -= dt;
  }
  os.bits = os.bits.filter((b) => b.life > 0);
}
export function ownerReset(): void {
  Object.assign(os, { rungs: 0, foeHp: 1, boltT: 0, rungT: 0, turn: null, bits: [] });
}

/** The fortune's ladder (OWNER_LADDER: 25K x10 a rung, 4 rungs). */
const RUNGS = ['25K', '250K', '2.5M', '25M'];
/** Where he stands: in the aisle, under the spotlight, the open column between the HUDs. */
const OWN_FEET = 80;

export interface OwnerScene {
  time: number;
  /** His HP share (1 outside his fight: the room before it). */
  foeHp: number;
  /** Rungs of his ladder climbed (0-4). */
  rungs: number;
  turn: 'player' | 'enemy' | null;
  fight: boolean;
  /** LIGHTNING SOFT; flashes off (the juice toggle): no flash at all. */
  soft: boolean;
  flash: boolean;
}

/** THE OWNER's room: drawn over act 2's last station emptied (rooms.ts draws that first, `late` 1). */
export function drawOwnerRoom(ctx: CanvasRenderingContext2D, o: OwnerScene): void {
  if (!ownerFrames) ownerFrames = [makeOwner(false), makeOwner(true)];
  const t = o.time;
  // A new fight (his fortune back in full): the ladder relit.
  if (o.foeHp > os.foeHp + 0.3) ownerReset();
  os.foeHp = o.foeHp;
  // His turn starts: a trick, and its lightning.
  if (o.fight && o.turn === 'enemy' && os.turn !== 'enemy') os.boltT = 1;
  os.turn = o.turn;
  // A rung climbed: its lamp goes dark with a shower of chips off the board.
  if (o.rungs > os.rungs) {
    os.rungT = 1;
    for (let i = 0; i < 16; i++)
      os.bits.push({ x: CX - 24 + ((o.rungs - 1) % 2) * 48 + (Math.random() - 0.5) * 12, y: 156, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, life: 2.4, kind: 'chip', c: i % 3 ? R : T, gy: 178 + Math.random() * 6 });
  }
  os.rungs = o.rungs;
  const g = lg;
  g.clearRect(0, 0, RW, RH);
  // His fortune: the progressive board, repurposed (the casino's sign system), under the gutter's LOOP label and over
  // VS: a lamp a rung, two by two (25K 250K / 2.5M 25M), each going dark as you climb it.
  const bx = CX - 50;
  const by = 138;
  px(g, bx - 2, by - 2, 104, 40, K);
  px(g, bx, by, 100, 36, '#1a0e24');
  px(g, bx, by, 100, 2, G);
  px(g, bx, by + 34, 100, 2, G);
  drawText(g, 'HIS FORTUNE', CX, by + 8, 1, Yl, { outline: K });
  RUNGS.forEach((txt, i) => {
    const x = bx + 26 + (i % 2) * 48;
    const y = by + 19 + Math.floor(i / 2) * 9;
    const gone = i < o.rungs;
    const blink = os.rungT > 0 && i === o.rungs - 1 && Math.floor(t * 10) % 2;
    drawText(g, txt, x, y, 1, gone ? (blink ? Y : '#4a2a2a') : R, { outline: K });
  });
  // The spotlight: a stepped cone from under the board (three nested bands, crisp), a pool round his feet. It dims a
  // step each rung you climb (the house's lights going out), and stutters at a rung.
  const k2 = Math.max(0.45, 1 - 0.12 * o.rungs) * (os.rungT > 0.5 && Math.floor(t * 16) % 2 ? 0.6 : 1);
  const top = 6;
  g.fillStyle = '#fff1c8';
  for (const [w0, w1, a] of [[10, 40, 0.06], [7, 28, 0.06], [4, 18, 0.07]] as const) {
    g.globalAlpha = a * k2;
    for (let y = top; y < OWN_FEET; y++) {
      const w = w0 + ((w1 - w0) * (y - top)) / (OWN_FEET - top);
      g.fillRect(Math.round(CX - w), y, Math.round(w * 2), 1);
    }
  }
  g.globalAlpha = 1;
  pool(g, CX, OWN_FEET + 1, 36, 6, '#fff1c8', 0.5 * k2);
  // The rig: a black can at the top of the column.
  px(g, CX - 6, 0, 12, 4, K);
  px(g, CX - 4, 4, 8, 2, k);
  px(g, CX - 3, 5, 6, 1, Yl);
  // THE OWNER: arm raised while his trick fires.
  const raised = os.boltT > 0.2 ? 1 : 0;
  const fig = ownerFrames[raised];
  const fx = CX - 13;
  const fy = OWN_FEET - 61;
  g.drawImage(fig, fx, fy);
  // The lightning: jagged, from his raised hand up into the rig. Not a flash: a 1px bolt, and a light on him only
  // (FLASH_CAP; LIGHTNING SOFT: half, one fade, no crackle; flashes off: the bolt alone).
  if (os.boltT > 0.2) {
    const crack = !o.soft && Math.floor(t * 20) % 3 === 0;
    let x = fx + 24;
    let y = fy + 1;
    const ceil = top;
    const seed = Math.floor(t * (o.soft ? 4 : 12));
    while (y > ceil) {
      const nx = x + ((((seed * 31 + y * 7) % 7) - 3) | 0);
      const ny = y - 4;
      for (let i = 0; i <= 4; i++) px(g, x + ((nx - x) * i) / 4, y - i, 1, 1, crack ? T : '#7cc4ff');
      x = nx;
      y = ny;
    }
    if (o.flash) {
      const a = Math.min(CAP, (o.soft ? CAP / 2 : CAP) * os.boltT);
      g.globalAlpha = a;
      px(g, fx - 2, fy - 2, 30, 66, '#e0f0ff');
      g.globalAlpha = 1;
    }
  }
  // The chips off his board, rolling round his feet.
  for (const b of os.bits) {
    g.globalAlpha = Math.min(1, b.life * 2);
    px(g, b.x - 1, b.y - 1, 3, 2, b.c);
    px(g, b.x, b.y - 1, 1, 1, '#fffbe6');
  }
  g.globalAlpha = 1;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(liveC, 0, 0, RW * 2, RH * 2);
  ctx.restore();
}
