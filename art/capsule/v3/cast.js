// ROUND 3 (2026-11-11): the characters. The user scored the six roughs and liked THE TALE OF THE TAPE best ("it shows
// some of the characters"), then NOSE TO NOSE; no squiggle, bolt or projectile between the machines from now on.
// Three variants that put the people with their Slot Machines, at the casino's door (door.js):
//   v1 THE TWO CORNERS        SIR REGINALD and THE DOORMAN large in front, their machines big behind them, nose to nose
//   v2 THE GANG VS THE HOUSE  the five players' characters behind the blue machine, the house's people behind the gold
//   v3 AT THE LEVERS          each stands at his machine, a hand on its lever, mid-pull
//   node art/capsule/v3/make.mjs cast --out <dir>  ->  v1_main / v1_small / v1_small_half / v1_detail (and v2_, v3_)
// New character art here (the game's portraits are the base; only what the pose needs is redrawn, on the same grid):
// SIR REGINALD's helm turned with lit eyes in the visor, THE DOORMAN's glare, a raised fist each, their coats carried
// down below the bust, and SIR REGINALD's whole figure at the room's scale (THE DOORMAN's is the room's own).
import * as K from './kit.js';
import { doorScene } from './door.js';
import { DOORMAN, DOORMAN_EYES, DOORMAN_INK } from '/src/render/roomEntrance.ts';

const { C, px, mk } = K;
const P = K.PALETTE;

// ---- the portraits, posed ---------------------------------------------------------------------------------------------

const rowsOf = (id) => K.SPRITES[id].map((r) => [...r]);
/** A bust carried `n` rows further down (its last rows repeated: armour, a coat with its buttons). */
function carried(rows, n, cycle) {
  const out = rows.map((r) => r.join(''));
  for (let i = 0; i < n; i++) out.push(rows[cycle[i % cycle.length]].join(''));
  return K.fromRows(out);
}
/** SIR REGINALD (heroKnight), his helm turned to his left (our right): the face plate's ridge and the visor's slit moved
 * across, two lit eyes in the slit looking that way. */
function sir(ext = 0) {
  const g = rowsOf('heroKnight');
  for (const y of [8, 9, 10, 14, 15, 16, 17, 18]) {
    g[y][13] = 'L';
    g[y][17] = 'S';
  }
  for (const y of [12, 13]) {
    g[y][10] = 'L';
    g[y][11] = 'L';
    g[y][12] = 'S';
  }
  for (const [x, c] of [[17, 'A'], [18, 'W'], [21, 'A'], [22, 'W']]) g[12][x] = c;
  return carried(g, ext, [31]);
}
/** THE DOORMAN (enemyBoss), glaring to his right (our left): both pupils that way, his brows slanted down to the nose. */
function doorman(ext = 0) {
  const g = rowsOf('enemyBoss');
  g[12][11] = 'K';
  g[12][12] = 'W';
  for (const x of [9, 10, 21, 22]) g[10][x] = 'b';
  g[11][10] = 'F';
  g[11][21] = 'F';
  g[11][14] = 'b';
  g[11][17] = 'b';
  return carried(g, ext, [29, 30, 31]);
}
/** A raised fist on its forearm (`h` rows in all): a steel gauntlet, or a white glove on a red cuff. */
function fist(kind, h) {
  const rows = ['.KKKKKKK.', 'KLLLLLLLK', 'KLSLSLSDK', 'KLLLLLSDK', 'KSLLLSSDK', '.KSSSSDK.'];
  const arm = kind === 'steel' ? '.KLSSDDK.' : '.KRRrrdK.';
  if (kind !== 'steel') rows.push('.KGGGGgK.');
  while (rows.length < h) rows.push(arm);
  return K.fromRows(rows, kind === 'steel' ? P : { ...P, L: '#f4eee0', S: '#c8bddb', D: '#9a8fb0' });
}
const dimmed = (c, a = 0.45) => {
  const [o, og] = mk(c.width, c.height);
  og.drawImage(c, 0, 0);
  og.globalCompositeOperation = 'source-atop';
  og.fillStyle = `rgba(26,14,36,${a})`;
  og.fillRect(0, 0, c.width, c.height);
  return o;
};
const knightM = (lean) => K.lean(K.lit(K.flip(K.knightAttacking(false)), { side: 1, rimK: 0.7 }), lean);
const houseM = (lean) => K.lean(K.lit(K.houseCrowned(), { side: -1, rimK: 0.7 }), lean);

/** The marquee with 12 columns of its dark panel cut from each end (136 wide): for a grid too coarse for all 160. */
function tightMarquee(g, x, y) {
  const [t, tg] = mk(160, 46);
  K.marquee(tg, 0, 1, 1);
  g.globalAlpha = 0.6;
  px(g, x + 2, y + 44, 132, 3, C.K);
  g.globalAlpha = 1;
  let dx = x;
  for (const [a, b] of [[0, 10], [22, 138], [150, 160]]) {
    g.drawImage(t, a, 0, b - a, 46, dx, y - 1, b - a, 46);
    dx += b - a;
  }
}

// ---- v1 THE TWO CORNERS -----------------------------------------------------------------------------------------------

async function v1main() {
  K.reseed(51);
  const W = 154;
  const H = 89;
  const s = doorScene({ W, H, X0: 243, Y0: 61, logoY: 1, sign: false });
  const g = s.g;
  tightMarquee(g, 9, 1);
  // the machines, big, nose to nose behind their people
  g.drawImage(knightM(16), 6, 44);
  g.drawImage(houseM(-16), 68, 36);
  // the people in front, each leaning at the other, a fist up
  const a = K.lean(K.lit(sir(10), { side: 1, rimK: 0.5, shade: 0.22 }), 3);
  const b = K.lean(K.lit(doorman(10), { side: -1, rimK: 0.5, shade: 0.22 }), -3);
  g.drawImage(a, -1, 48);
  g.drawImage(b, 117, 48);
  // (the fists sit in front of their own chests, so they read as theirs)
  g.drawImage(K.lit(fist('steel', 20), { side: 1 }), 27, 70);
  g.drawImage(K.lit(K.flip(fist('glove', 20)), { side: -1 }), 118, 70);
  return { canvas: s.art, px: 8, detail: [2, 46, 12] };
}

/** The small capsule all three share (a whole figure doesn't fit under the sign at that size): the sign, the two
 * machines at the frame's sides, the two leads in front. */
async function leadsSmall() {
  K.reseed(52);
  const s = doorScene({ W: 231, H: 87, X0: 204, Y0: 66, logoY: 1, reach: 0.8 });
  const g = s.g;
  for (const [i, y] of [s.STEP, s.STEP + 6, s.STEP + 12].entries()) K.addRows(g, y, Array(6).fill([s.CX - 38 - i * 6, s.CX + 38 + i * 6]), '#2a180c');
  const FOOT = 82;
  const kn = knightM(8);
  const ho = houseM(-8);
  for (const [sp, x] of [[kn, -4], [ho, 179]]) {
    K.shadow(g, x + sp.width / 2, FOOT, 25, 2, 0.9);
    K.reflect(g, sp, x, FOOT + 1, { depth: 5, alpha: 0.5, skip: 1 });
    g.drawImage(sp, x, FOOT - sp.height + 1);
  }
  g.drawImage(K.lean(K.lit(sir(4), { side: 1, rimK: 0.5, shade: 0.22 }), 2), 44, 52);
  g.drawImage(K.lean(K.lit(doorman(4), { side: -1, rimK: 0.5, shade: 0.22 }), -2), 151, 52);
  return { canvas: s.art, px: 2 };
}

// ---- v2 THE GANG VS THE HOUSE -----------------------------------------------------------------------------------------

async function v2main() {
  K.reseed(53);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2 });
  const { g, H } = s;
  const FOOT = 130;
  const bust = (id, ext) => carried(rowsOf(id), ext, [31]);
  // the back rows, dimmer: the rest of the players' characters, the rest of the house
  for (const [id, x, y, fl] of [['heroMidas', -9, 84], ['heroTesla', 21, 79], ['heroJukebox', 52, 83], ['enemyOwner', 222, 82, 1], ['enemyDealer', 190, 78, 1]]) {
    const b = dimmed(bust(id, 34), 0.4);
    g.drawImage(fl ? K.flip(b) : b, x, y);
  }
  // the two machines front and centre, nose to nose
  const kn = knightM(14);
  const ho = houseM(-14);
  for (const [sp, x] of [[kn, 62], [ho, 136]]) {
    K.shadow(g, x + sp.width / 2, FOOT, 26, 2, 0.9);
    K.reflect(g, sp, x, FOOT + 1, { depth: H - FOOT - 1, alpha: 0.45, skip: 1 });
    g.drawImage(sp, x, FOOT - sp.height + 1);
  }
  // the front row, lit: the two leads next to their machines, one more each side
  g.drawImage(K.lit(bust('heroJoker', 2), { side: 1, rimK: 0.4, shade: 0.2 }), 4, 110);
  g.drawImage(K.lit(K.flip(bust('enemyWheel', 2)), { side: -1, rimK: 0.4, shade: 0.2 }), 211, 110);
  g.drawImage(K.lean(K.lit(sir(4), { side: 1, rimK: 0.5, shade: 0.2 }), 2), 36, 106);
  g.drawImage(K.lean(K.lit(doorman(4), { side: -1, rimK: 0.5, shade: 0.2 }), -2), 175, 106);
  return { canvas: s.art, px: 5, detail: [0, 76, 6] };
}

// ---- v3 AT THE LEVERS -------------------------------------------------------------------------------------------------

/** SIR REGINALD's whole figure at the room's scale (22 wide, as THE DOORMAN's): plumed helm, pauldrons, a blue tabard
 * with a gold cross over plate, greaves. New art. */
const SIR = [
  '.........AA',
  '........AUUA',
  '.......AUUUN',
  '.......LLLLLLLL',
  '......LLLLLLLLSS',
  '......LWLLLLLLSD',
  '......LLLLLLLLSD',
  '......KKKKKKAWAW',
  '......LLLLSLLLSD',
  '......LLLLSLLLSD',
  '......SLLLSLLSSD',
  '.......SSSSSSSD',
  '........SSDDDD',
  '....LLLLGGGGGGLLLL',
  '..LLWLLLAUUUUNSSSSDD',
  '..LWLLSSAUUUUNSSSDDD',
  '..LLLSSSAUYYUNSSSDDD',
  '..LLSS.SAYYYYNS.SSDD',
  '..LLSS.SAUYYUNS.SSDD',
  '..LSSD.SAUYYUNS.SSDD',
  '..LSSD.SAUUUUNS.SSDD',
  '..LSSD.SAUUUUNS.SSDD',
  '..LLSD.GGGGGGGg.LSDD',
  '..LSSD.SAUUUUNS.SSDD',
  '..LSSD.SAUUUUNS.SSDD',
  '..LSSD.SAUUUUND.SSDD',
  '..LLSD.SAUUUUND.LSDD',
  '..LLLD.SAUUUUND.LLSD',
  '..SSDD.SAUUUUND.SSDD',
  '.......SAUUUUND',
  '.......SAUUUUND',
  '.......AUUUUUNN',
  '......AAUUUUUNNN',
  '......AUUUUUUUNN',
  ...Array(13).fill('......LLSS..LSSD'),
  '......LWSS..LLSD',
  '......LLSD..LSDD',
  ...Array(5).fill('......LLSS..LSSD'),
  '.....LLLSS..LLSSD',
  '.....SSSDD..SSSDD',
].map((r) => r.padEnd(22, '.'));
/** A figure from rows, outlined; `noArm`: 'L' or 'R', that arm left off (the capsule draws it on the lever). */
function figure(rows, ink, noArm, armRows, armCols) {
  const [c, g] = mk(22, rows.length);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.' || !ink[ch]) return;
      if (noArm && y >= armRows[0] && y <= armRows[1] && x >= armCols[0] && x <= armCols[1]) return;
      px(g, x, y, 1, 1, ink[ch]);
    }),
  );
  return K.reoutlined(c);
}
const sirFigure = () => figure(SIR, P, true, [17, 28], [16, 19]);
const doormanFigure = () => figure(DOORMAN.map((r, y) => (y === 8 ? DOORMAN_EYES[1] : r)), DOORMAN_INK, true, [19, 36], [0, 4]);

/** A lever mid-pull: from its housing at (hx, hy) out and down toward `dir` (-1 left, +1 right), the knob, and the
 * puller's hand on it with the arm back to the shoulder at (sx, sy). */
function pull(g, hx, hy, dir, sx, sy, who) {
  const kx = hx + dir * 8;
  const ky = hy - 7;
  const [c, cg] = mk(g.canvas.width, g.canvas.height);
  for (let k = 0; k <= 7; k++) px(cg, Math.round(hx + dir * k * 1.1), hy - k, 2, 1, k % 2 ? '#8b9bb4' : '#d3dde8');
  for (let y = -3; y <= 3; y++) {
    const hw = Math.round(Math.sqrt(9.5 - y * y));
    px(cg, kx - hw, ky + y, hw * 2 + 1, 1, y < -1 ? '#ff9ec8' : y > 1 ? C.r : C.R);
  }
  // the arm (plate, or the coat's sleeve) and the hand closed on the knob
  const [a, b, d] = who === 'sir' ? ['#d3dde8', '#8b9bb4', '#4f5b74'] : [C.R, C.r, C.d];
  const x0 = Math.min(sx, kx + dir * 3);
  const x1 = Math.max(sx, kx + dir * 3);
  for (let x = x0; x <= x1; x++) {
    const y = Math.round(sy + ((ky - sy) * (dir > 0 ? x1 - x : x - x0)) / Math.max(1, x1 - x0));
    px(cg, x, y - 1, 1, 1, a);
    px(cg, x, y, 1, 1, b);
    px(cg, x, y + 1, 1, 1, d);
  }
  const hand = who === 'sir' ? ['#d3dde8', '#8b9bb4'] : ['#f4eee0', '#9a8fb0'];
  px(cg, kx + dir * 1 - 2, ky - 2, 5, 4, hand[0]);
  px(cg, kx + dir * 1 - 2, ky + 1, 5, 1, hand[1]);
  g.drawImage(K.reoutlined(c), -1, -1);
}

function levers(s, o) {
  const { g, H } = s;
  const FOOT = o.foot;
  // the machines, close, angled at each other; their upright levers taken off (they're drawn mid-pull)
  const bare = (src) => {
    const c = K.copy(src);
    c.getContext('2d').clearRect(42, 19, 6, 14);
    return c;
  };
  const L = o.lean ?? 5;
  const kn = K.lean(K.lit(K.flip(bare(K.knightAttacking(false))), { side: 1, rimK: 0.7 }), L);
  const [hc, hg] = mk(48, 72);
  hg.drawImage(bare(K.houseCabinet()), 0, 8);
  hg.drawImage(K.crown(), 12, 7);
  const ho = K.lean(K.lit(hc, { side: -1, rimK: 0.7 }), -L);
  for (const [sp, x] of [[kn, o.kx], [ho, o.hx]]) {
    K.shadow(g, x + sp.width / 2, FOOT, 25, 2, 0.9);
    K.reflect(g, sp, x, FOOT + 1, { depth: Math.min(12, H - FOOT - 1), alpha: 0.45, skip: 1 });
    g.drawImage(sp, x, FOOT - sp.height + 1);
  }
  // the two of them at their levers
  const sf = K.lit(sirFigure(), { side: 1, rimK: 0.45, shade: 0.25 });
  const df = K.lit(doormanFigure(), { side: -1, rimK: 0.45, shade: 0.25 });
  const drop = o.drop ?? 0;
  K.shadow(g, o.sx + 12, FOOT + drop, 11, 2, 0.8);
  K.shadow(g, o.dx + 12, FOOT + drop, 11, 2, 0.8);
  g.drawImage(sf, o.sx, FOOT + drop - sf.height + 2);
  g.drawImage(df, o.dx, FOOT + drop - df.height + 2);
  // housings: the knight's (mirrored) at its left edge, the gold one's at its right
  const hy = FOOT - 63 + 33;
  pull(g, o.kx + L + 4 + 2, hy, -1, o.sx + 18, FOOT + drop - sf.height + 2 + 16, 'sir');
  pull(g, o.hx + L + 43 - 2, hy, 1, o.dx + 5, FOOT + drop - df.height + 2 + 20, 'doorman');
}

async function v3main() {
  K.reseed(55);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2 });
  levers(s, { foot: 130, kx: 66, hx: 128, sx: 40, dx: 186 });
  return { canvas: s.art, px: 5, detail: [26, 62, 7] };
}
export const variants = { v1: { main: v1main, small: leadsSmall }, v2: { main: v2main, small: leadsSmall }, v3: { main: v3main, small: leadsSmall } };
