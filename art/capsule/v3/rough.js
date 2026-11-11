// ROUGH direction sketches, round 2 (2026-11-11): the user on A/B/C, "I don't hate them but I don't love them... maybe it
// shooting the swords across is what's bothering me", "the floor seems too busy". Six different ideas for a
// conversation: pose, scale, contact and tension; no projectiles across a lane; calm backgrounds. Sketches: each is one
// pixel grid and the game's own sprites, but the new poses and props are blocky and nothing is polished.
//   node art/capsule/v3/make.mjs rough --out <dir>   ->  r1_main.png .. r6_main.png (1232x706), r1_half.png .. (231x87)
import * as K from './kit.js';
import { doormanSprite, doorScene } from './door.js';

const { C, px, mk } = K;

const disc = (g, cx, cy, r, c) => {
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const hw = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
    g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1);
  }
};
/** A plain stage: a plum wall, a carpet, one stepped pool of light. */
function stage(g, W, H, floorY, o = {}) {
  px(g, 0, 0, W, H, o.wall ?? '#2a1838');
  for (let x = 5; x < W; x += 14) px(g, x, 0, 1, floorY, '#251432');
  px(g, 0, floorY, W, H - floorY, '#4a1430');
  px(g, 0, floorY, W, 1, C.g);
  K.glow(g, W / 2, o.gy ?? floorY - 24, o.rx ?? W * 0.46, o.ry ?? H * 0.5, o.col ?? '#1e0c12', [1, 0.72, 0.44]);
}
/** The marquee with 12 columns of its dark panel cut from each end (136 wide): for the coarser grids. */
function tightMarquee(g, x, y) {
  const [t, tg] = mk(160, 46);
  K.marquee(tg, 0, 1, 1);
  let dx = x;
  for (const [a, b] of [[0, 10], [22, 138], [150, 160]]) {
    g.drawImage(t, a, 0, b - a, 46, dx, y - 1, b - a, 46);
    dx += b - a;
  }
}
/** A zigzag of light between points, dark-edged. */
function bolt(g, pts, w = 1) {
  const seg = (col, t) => {
    g.fillStyle = col;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) g.fillRect(Math.round(x0 + ((x1 - x0) * k) / n) - t, Math.round(y0 + ((y1 - y0) * k) / n) - t, w + 2 * t, w + 2 * t);
    }
  };
  seg(C.K, 2);
  seg(C.Y, 1);
  seg(C.W, 0);
}
const knightL = () => K.lit(K.flip(K.knightAttacking(false)), { side: 1, rimK: 0.7 });
const houseR = () => K.lit(K.houseCrowned(), { side: -1, rimK: 0.7 });

// 1. NOSE TO NOSE: the stare-down before the bell. Both machines big, leaning in until they almost touch.
async function r1() {
  const W = 154;
  const H = 89;
  const [art, g] = mk(W, H);
  stage(g, W, H, 84, { gy: 60, rx: 74, ry: 46, col: '#24100c' });
  tightMarquee(g, 9, 1);
  g.drawImage(K.lean(knightL(), 18), 2, 44);
  g.drawImage(K.lean(houseR(), -18), 68, 36);
  bolt(g, [[77, 47], [75, 53], [79, 58], [75, 64], [78, 71], [76, 77]]);
  for (const [x, y, r] of [[70, 50, 1], [84, 55, 1], [72, 66, 2], [83, 70, 1], [77, 82, 1]]) K.glint(g, x, y, r, C.Yl);
  return { canvas: art, px: 8, band: 0.4 };
}

// 2. THE LEVER PUNCH: melee. KNIGHT has swung its lever through; the gold machine is off the ground, coins out.
async function r2() {
  K.reseed(41);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2 });
  const g = s.g;
  const FOOT = 131;
  // KNIGHT without its upright lever (the arm is drawn swung), leaning into the punch
  const [kc, kg] = mk(48, 64);
  kg.drawImage(K.knightAttacking(false), 0, 0);
  kg.clearRect(42, 19, 6, 14);
  const KX = 62;
  K.shadow(g, KX + 32, FOOT, 26, 2, 0.9);
  g.drawImage(K.lean(K.lit(kc, { side: 1 }), 8), KX, FOOT - 63);
  // the gold one, reels a blur, knocked up and back
  const hc = K.houseCabinet();
  const hg = hc.getContext('2d');
  for (const x0 of [8, 18, 28]) {
    px(hg, x0, 22, 9, 17, C.T);
    for (const [dx, c] of [[1, C.R], [3, '#ff9ec8'], [4, C.R], [6, C.r], [7, C.R]]) px(hg, x0 + dx, 22, 1, 17, c);
  }
  const ho = K.lit(K.reoutlined(K.trim(K.tilt(K.lean(K.unoutlined(hc), 20), -10))), { side: -1 });
  const HX = 172;
  const HY = 40;
  K.shadow(g, HX + 36, FOOT, 20, 2, 0.7);
  g.drawImage(ho, HX, HY);
  g.drawImage(K.crown(), 218, 24);
  for (const dx of [3, 10, 17]) px(g, 218 + dx, 35, 1, 3, C.Yl);
  for (const [x, y] of [[164, 116], [158, 122], [168, 124]]) px(g, x, y, 4, 1, C.Yl);
  // the arm: from its housing through to the knob, and the arc it swung
  const ax = KX + 56;
  const ay = FOOT - 28;
  const bx = 162;
  px(g, ax, ay - 2, bx - ax, 5, C.K);
  px(g, ax, ay - 1, bx - ax, 1, '#d3dde8');
  px(g, ax, ay, bx - ax, 1, '#8b9bb4');
  px(g, ax, ay + 1, bx - ax, 1, '#4f5b74');
  for (let i = 0; i < 9; i++) {
    const a = -1.5 + i * 0.16;
    px(g, Math.round(ax + Math.cos(a) * 44), Math.round(ay + 8 + Math.sin(a) * 44), 3 - (i < 3 ? 1 : 0), 2, i % 2 ? C.Yl : C.W);
  }
  K.burst(g, bx + 9, ay, 15);
  disc(g, bx + 3, ay, 6, C.K);
  disc(g, bx + 3, ay, 5, C.R);
  disc(g, bx + 2, ay - 2, 2, '#ff9ec8');
  // coins out of its tray
  for (const [x, y, e] of [[186, 120, 0], [198, 126, 1], [210, 118, 0], [222, 128, 0], [234, 116, 1], [192, 134, 0], [216, 136, 1], [240, 130, 0], [180, 112, 1]]) K.miniCoin(g, x, y, !!e);
  g.drawImage(K.sprite('coinSpin0'), 200, 114);
  g.drawImage(K.sprite('coinSpin1'), 226, 104);
  return { canvas: s.art, px: 5, band: 0.25 };
}

// 3. THE BRAWL CLOUD: the cartoon fight cloud, the two machines half in it, symbols thrown out of it.
async function r3() {
  const W = 206;
  const H = 118;
  const [art, g] = mk(W, H);
  stage(g, W, H, 104, { gy: 78, rx: 96, ry: 56, col: '#1e0c12' });
  K.marquee(g, 23, 2, 1);
  g.drawImage(K.lean(knightL(), -9), 44, 36);
  g.drawImage(K.lean(houseR(), 9), 108, 26);
  const puffs = [[103, 82, 23], [82, 86, 17], [124, 86, 17], [90, 68, 14], [116, 68, 14], [103, 100, 14], [72, 99, 10], [134, 99, 10], [103, 60, 10], [66, 80, 8], [140, 78, 8]];
  for (const [x, y, r] of puffs) disc(g, x, y, r + 1, C.K);
  for (const [x, y, r] of puffs) disc(g, x, y, r, '#b9aed0');
  for (const [x, y, r] of puffs) disc(g, x - 1, y - 2, r - 2, C.T);
  // a fist and a kick out of the cloud, stars and hit marks on it
  disc(g, 62, 62, 5, C.K);
  disc(g, 62, 62, 4, C.R);
  disc(g, 146, 96, 5, C.K);
  disc(g, 146, 96, 4, C.R);
  K.burst(g, 96, 74, 9);
  K.burst(g, 116, 92, 7);
  for (const [x, y] of [[84, 92], [122, 66], [104, 104]]) bolt(g, [[x, y], [x + 4, y - 3], [x + 2, y + 2], [x + 7, y - 1]]);
  // what flies out: the reels' symbols, coins, a chip
  const out = [['sword', 26, 44], ['cherry', 20, 84], ['coinSpin0', 46, 100], ['seven', 164, 52], ['chip', 180, 86], ['shield', 152, 102], ['coinSpin1', 56, 28], ['coin', 172, 30]];
  for (const [id, x, y] of out) {
    const dx = Math.sign(x - 100);
    for (const k of [0, 1]) px(g, x + 8 - dx * (12 + k * 5), y + 8 + (y < 70 ? 4 : -4) * (k + 1) * 0.6, 3 - k, 1, C.Yl);
    g.drawImage(K.sprite(id), x, y);
  }
  for (const [x, y, e] of [[36, 66, 0], [170, 72, 1], [70, 110, 0], [138, 110, 1], [88, 50, 0], [128, 48, 1]]) K.miniCoin(g, x, y, !!e);
  return { canvas: art, px: 6, band: 0.35 };
}

// 4. HIGH NOON: depth. Behind your machine, big in the foreground; down the carpet the gold one waits at the doors.
async function r4() {
  K.reseed(43);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2 });
  const { g, CX, GROUND } = s;
  const FOOT = 130;
  const ho = houseR();
  K.shadow(g, CX, FOOT, 25, 2, 0.9);
  K.reflect(g, ho, CX - 24, FOOT + 1, { depth: 10, alpha: 0.4 });
  g.drawImage(ho, CX - 24, FOOT - ho.height + 1);
  const dm = K.lit(doormanSprite(0), { side: -1, rimK: 0.4 });
  g.drawImage(dm, CX + 34, GROUND - dm.height + 3);
  // your machine from behind, near us: a big dark-blue back, rim-lit by the marquee it faces
  const B = { d: '#101e4a', m: '#16296a', l: '#1d3a8c', rim: C.Yl };
  const X0 = -14;
  const X1 = 82;
  const T = 52;
  px(g, X0 - 3, T - 1, X1 - X0 + 6, 21, C.K);
  px(g, X0 - 2, T, X1 - X0 + 4, 19, B.m);
  px(g, X0 - 2, T, X1 - X0 + 4, 1, B.rim);
  px(g, X1 + 1, T, 1, 19, B.rim);
  px(g, X0 - 1, T + 19, X1 - X0 + 2, 142, C.K);
  px(g, X0, T + 19, X1 - X0, 142, B.l);
  px(g, X0, T + 19, X1 - X0, 3, B.d);
  px(g, X1 - 1, T + 19, 1, 142, B.rim);
  px(g, X0 + 10, T + 30, X1 - X0 - 20, 52, B.d);
  px(g, X0 + 11, T + 31, X1 - X0 - 22, 50, B.m);
  for (let y = T + 38; y < T + 62; y += 5) px(g, X0 + 20, y, X1 - X0 - 40, 2, B.d);
  for (const [x, y] of [[X0 + 13, T + 33], [X1 - 15, T + 33], [X0 + 13, T + 77], [X1 - 15, T + 77]]) px(g, x, y, 2, 2, '#8b9bb4');
  // its crest from behind, and its lever with the knob catching the light
  for (let i = 0; i < 16; i++) {
    const hw = i < 9 ? 13 : 13 - (i - 8) * 2;
    px(g, 34 - Math.max(1, hw) - 1, T - 17 + i, Math.max(1, hw) * 2 + 2, 1, C.K);
  }
  for (let i = 0; i < 15; i++) {
    const hw = i < 8 ? 12 : 12 - (i - 7) * 2;
    if (hw > 0) px(g, 34 - hw, T - 16 + i, hw * 2, 1, i === 0 ? B.rim : '#4f5b74');
  }
  px(g, X1 + 2, T + 44, 9, 16, C.K);
  px(g, X1 + 3, T + 45, 7, 14, '#4f5b74');
  px(g, X1 + 5, T + 10, 5, 36, C.K);
  px(g, X1 + 6, T + 11, 3, 34, '#8b9bb4');
  px(g, X1 + 8, T + 11, 1, 34, B.rim);
  disc(g, X1 + 7, T + 5, 8, C.K);
  disc(g, X1 + 7, T + 5, 7, C.r);
  disc(g, X1 + 8, T + 4, 5, C.R);
  disc(g, X1 + 10, T + 2, 2, '#ff9ec8');
  return { canvas: s.art, px: 5, band: 0.2 };
}

// 5. THE TALE OF THE TAPE: the people. SIR REGINALD and THE DOORMAN face to face, each with his machine behind him.
async function r5() {
  const W = 154;
  const H = 89;
  const [art, g] = mk(W, H);
  stage(g, W, H, 84, { gy: 62, rx: 74, ry: 46, col: '#1e0c12' });
  tightMarquee(g, 9, 1);
  const dim = (c) => {
    const [o, og] = mk(c.width, c.height);
    og.drawImage(c, 0, 0);
    og.globalCompositeOperation = 'source-atop';
    og.fillStyle = 'rgba(20,12,28,0.42)';
    og.fillRect(0, 0, c.width, c.height);
    return o;
  };
  g.drawImage(dim(knightL()), 2, 40);
  g.drawImage(dim(houseR()), 104, 32);
  const sir = K.lit(K.sprite('heroKnight'), { side: 1, rimK: 0.5, shade: 0.2 });
  const doorman = K.lit(K.flip(K.sprite('enemyBoss')), { side: -1, rimK: 0.5, shade: 0.2 });
  g.drawImage(sir, 40, 57);
  g.drawImage(doorman, 82, 57);
  bolt(g, [[77, 60], [75, 65], [79, 69], [76, 74]]);
  K.glint(g, 77, 55, 2, C.Yl);
  return { canvas: art, px: 8, band: 0.5 };
}

// 6. VS CARD: a fighting game's versus screen. A blue half, a gold half, a jagged seam, each machine tilted at it.
async function r6() {
  const W = 176;
  const H = 101;
  const [art, g] = mk(W, H);
  const seam = (y) => 100 - Math.round((y / H) * 24) + [0, 4, -3, 5, -4, 2][Math.floor(y / 9) % 6];
  for (let y = 0; y < H; y++) {
    const sx = 100 - Math.round((y / H) * 24);
    px(g, 0, y, sx, 1, '#14204e');
    px(g, sx, y, W - sx, 1, '#4a2a0c');
  }
  K.glow(g, 40, 70, 56, 50, '#0a1438', [1, 0.7, 0.42]);
  K.glow(g, 136, 66, 56, 50, '#2a1804', [1, 0.7, 0.42]);
  const rr = K.seeded(9);
  for (let y = 48; y < H; y += 4) {
    const w = 8 + Math.floor(rr() * 26);
    px(g, Math.floor(rr() * 20), y, w, 1, '#24388a');
    px(g, W - w - Math.floor(rr() * 20), y, w, 1, '#8f5a1f');
  }
  const pts = [];
  for (let y = 44; y <= H; y += 9) pts.push([seam(y), y]);
  bolt(g, pts, 2);
  g.drawImage(K.lean(knightL(), 8), 12, 42);
  g.drawImage(K.lean(houseR(), -8), 108, 34);
  K.marquee(g, 8, 1, 1);
  K.burst(g, seam(66), 66, 8);
  return { canvas: art, px: 7, band: 0.4 };
}

export const sketches = { r1, r2, r3, r4, r5, r6 };
