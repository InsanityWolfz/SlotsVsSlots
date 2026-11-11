// ROUND 4 (2026-11-11): the user, "would it be crazy to just do the reel brawl sign only for the capsule art?" The
// marquee as the hero, on the casino's stone at night, four ways:
//   s1 SIGN ONLY   s2 SIGN + THE TWO MACHINES under it   s3 SIGN + TWO FACES   s4 THE MACHINES STAND ON THE SIGN
//   node art/capsule/v3/make.mjs sign --out <dir>  ->  s1_main / s1_small / s1_small_half (and s2_, s3_, s4_)
// The wall is the entrance room's ashlar (roomEntrance.ts: 22x11 blocks, staggered, the same colours), drawn here so it
// can fill any frame, and lit block by block from the sign as in door.js.
import * as K from './kit.js';
import { posed } from './cast.js';

const { C, px, mk } = K;

/** The casino's stone, lit by a sign at (sx, sy, sw, 44): each block whole, in steps by its distance. */
function wall(W, H, sx, sy, sw, reach = 1) {
  const [art, g] = mk(W, H);
  px(g, 0, 0, W, H, '#211932');
  const near = (x, y) => Math.hypot(Math.max(sx - x, 0, x - (sx + sw)), Math.max(sy - y, 0, y - (sy + 44)) * 1.25) / reach;
  const level = (d) => (d < 12 ? 4 : d < 28 ? 3 : d < 50 ? 2 : d < 78 ? 1 : 0);
  for (let y = -3, row = 0; y < H; y += 11, row++) {
    px(g, 0, y, W, 1, '#1a1328');
    for (let x = row % 2 ? -11 : 0, n = 0; x < W; x += 22, n++) {
      px(g, x, y, 1, 11, '#1a1328');
      if ((n + row) % 2) px(g, x + 1, y + 1, 20, 1, '#262039');
      if ((n * 7 + row * 3) % 11 === 0) px(g, x + 1, y + 2, 20, 9, '#1e172e');
      const lv = level(near(x + 11, y + 5));
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#1a0b0e';
      for (let i = 0; i < lv; i++) g.fillRect(x + 1, y + 1, 21, 10);
      g.restore();
    }
  }
  return [art, g];
}
/** The marquee, `cut` columns of its dark panel taken from each end (0 or 12), its shadow on the stone under it. */
function sign(g, x, y, cut = 0) {
  const [t, tg] = mk(160, 46);
  K.marquee(tg, 0, 1, 1);
  g.globalAlpha = 0.55;
  px(g, x + 2, y + 44, 156 - cut * 2, 3, C.K);
  g.globalAlpha = 1;
  let dx = x;
  for (const [a, b] of cut ? [[0, 10], [10 + cut, 150 - cut], [150, 160]] : [[0, 160]]) {
    g.drawImage(t, a, 0, b - a, 46, dx, y - 1, b - a, 46);
    dx += b - a;
  }
}
/** What a sign alone can carry: the house's crown on its top edge, two brackets to the wall, a neon line under it. */
function dressed(g, x, y, w) {
  for (const bx of [x + 14, x + w - 18]) {
    px(g, bx - 1, y - 9, 6, 10, C.K);
    px(g, bx, y - 9, 4, 9, '#3b3347');
    px(g, bx, y - 9, 1, 9, '#6d6482');
  }
  g.drawImage(K.crown(), x + Math.round(w / 2) - 10, y - 8);
  const nx = x + 18;
  const nw = w - 36;
  K.glow(g, x + w / 2, y + 52, nw / 2 + 6, 6, '#2a0a1c', [1, 0.6]);
  px(g, nx - 1, y + 50, nw + 2, 4, C.K);
  px(g, nx, y + 51, nw, 2, '#ff9ec8');
  px(g, nx + 2, y + 51, nw - 4, 1, '#fff0f6');
  for (const ex of [nx - 4, nx + nw + 1]) {
    px(g, ex - 1, y + 49, 5, 6, C.K);
    px(g, ex, y + 50, 3, 4, C.G);
  }
}
const knightM = (lean) => K.lean(K.lit(K.flip(K.knightAttacking(false)), { side: 1, rimK: 0.7 }), lean);
const houseM = (lean) => K.lean(K.lit(K.houseCrowned(), { side: -1, rimK: 0.7 }), lean);
const faces = (g, ax, bx, y, ext) => {
  g.drawImage(K.lean(K.lit(posed.sir(ext), { side: 1, rimK: 0.5, shade: 0.22 }), 3), ax, y);
  g.drawImage(K.lean(K.lit(posed.doorman(ext), { side: -1, rimK: 0.5, shade: 0.22 }), -3), bx, y);
};

/**
 * S5, the old title screen's backdrop made the picture (title.ts before 3b898bb: reel columns of the game's symbols
 * drifting behind the logo): a wall of reels edge to edge, each column in its window (a dark band, edged, shaded at
 * its top and bottom like a reel curving away), stopped at its own height as if mid-spin, two of them smeared. The
 * sign lights them: a symbol near it is brighter and warm, the far ones sink to plum; all stay dimmer than the logo.
 */
const REEL_SYMS = ['sword', 'seven', 'shield', 'goldbar', 'bolt', 'ace', 'note', 'cherry', 'sword', 'coin', 'shield', 'wild', 'bolt', 'seven'];
function reels(W, H, sx, sy, sw) {
  const [art, g] = mk(W, H);
  px(g, 0, 0, W, H, '#150e20');
  const near = (x, y) => Math.hypot(Math.max(sx - x, 0, x - (sx + sw)), Math.max(sy - y, 0, y - (sy + 44)) * 1.2);
  const PITCH = 22;
  const x00 = Math.round((W - Math.ceil(W / PITCH) * PITCH) / 2);
  const rnd = K.seeded(77);
  for (let c = 0, x0 = x00; x0 < W; c++, x0 += PITCH) {
    px(g, x0 + 1, 0, 20, H, '#1f1630');
    px(g, x0 + 1, 0, 1, H, '#2b2140');
    const off = Math.floor(rnd() * 20);
    const smear = c % 4 === 1;
    for (let y = -20 + off, n = 0; y < H; y += 20, n++) {
      const id = REEL_SYMS[(c * 5 + n * 3) % REEL_SYMS.length];
      const d = near(x0 + 11, y + 8);
      // lit by the sign in steps: the cell's ground warms, the symbol keeps more of its colour
      const lv = d < 10 ? 3 : d < 30 ? 2 : d < 56 ? 1 : 0;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#160a0c';
      for (let i = 0; i < lv; i++) g.fillRect(x0 + 2, y - 2, 19, 20);
      g.restore();
      const spr = K.sprite(id);
      const [t, tg] = mk(16, 16);
      tg.drawImage(spr, 0, 0);
      tg.globalCompositeOperation = 'source-atop';
      tg.fillStyle = `rgba(32,18,44,${[0.72, 0.6, 0.48, 0.38][lv]})`;
      tg.fillRect(0, 0, 16, 16);
      if (smear) for (const [k, a] of [[6, 0.2], [4, 0.3], [2, 0.45]]) {
        g.globalAlpha = a;
        g.drawImage(t, x0 + 3, y - k);
      }
      g.globalAlpha = 1;
      g.drawImage(t, x0 + 3, y);
    }
    // the reel curving away at the window's top and bottom, then the divider
    for (const [k, a] of [[0, 0.55], [4, 0.4], [9, 0.22]]) {
      g.fillStyle = `rgba(12,7,20,${a})`;
      g.fillRect(x0 + 1, k, 20, k === 0 ? 4 : 5);
      g.fillRect(x0 + 1, H - k - (k === 0 ? 4 : 5), 20, k === 0 ? 4 : 5);
    }
    px(g, x0 - 1, 0, 2, H, C.K);
    px(g, x0 + 21, 0, 1, H, '#3a2d52');
  }
  return [art, g];
}

// The frames: the main capsule on an 8px grid (154x89 art, the sign 136 long), the small one on 2px (231x87, all 160).
const MAIN = { W: 154, H: 89, px: 8, cut: 12, sw: 136 };
const SMALL = { W: 231, H: 87, px: 2, cut: 0, sw: 160 };
const frame = (f, sy, reach, bg = wall) => {
  const sx = Math.round((f.W - f.sw) / 2);
  const [art, g] = bg(f.W, f.H, sx, sy, f.sw, reach);
  return { art, g, sx, sy, f };
};
const done = (s) => ({ canvas: s.art, px: s.f.px });

const s1 = (f) => async () => {
  const s = frame(f, 22, 1.5);
  dressed(s.g, s.sx, s.sy, f.sw);
  sign(s.g, s.sx, s.sy, f.cut);
  return done(s);
};
const s2 = (f) => async () => {
  const s = frame(f, 2, 1.3);
  sign(s.g, s.sx, s.sy, f.cut);
  // nose to nose under the sign, cut by the bottom edge: their toppers and reels
  const cx = Math.round(f.W / 2);
  s.g.drawImage(knightM(14), cx - 75, 50);
  s.g.drawImage(houseM(-14), cx - 3, 42);
  return done(s);
};
const s3 = (f) => async () => {
  const s = frame(f, f === MAIN ? 6 : 2, 1.4);
  sign(s.g, s.sx, s.sy, f.cut);
  faces(s.g, f === MAIN ? -1 : 3, f.W - (f === MAIN ? 37 : 41), f.H - 33, 2);
  return done(s);
};
// The machines stand on the sign's top edge, leaning in over the logo: one object. The main is on a 6px grid here
// (206x118: the sign at its full 160 and both machines whole); in the small one the frame cuts their toppers.
const s4 = (f) => async () => {
  const F = f === MAIN ? { W: 206, H: 118, px: 6, cut: 0, sw: 160 } : f;
  const sy = F.H - 47;
  const s = frame(F, sy, 1.4);
  const cx = Math.round(F.W / 2);
  const kn = knightM(12);
  const ho = houseM(-12);
  sign(s.g, s.sx, s.sy, 0);
  for (const [sp, x] of [[kn, cx - 71], [ho, cx]]) {
    s.g.globalAlpha = 0.5;
    px(s.g, x + 14, sy - 1, 44, 2, C.K);
    s.g.globalAlpha = 1;
    s.g.drawImage(sp, x, sy - sp.height + 1);
  }
  return done(s);
};

const s5 = (f) => async () => {
  const s = frame(f, f === MAIN ? 22 : 21, 1, reels);
  sign(s.g, s.sx, s.sy, f.cut);
  return done(s);
};
const s5b = (f) => async () => {
  const s = frame(f, 2, 1, reels);
  sign(s.g, s.sx, s.sy, f.cut);
  const cx = Math.round(f.W / 2);
  s.g.drawImage(knightM(14), cx - 75, 50);
  s.g.drawImage(houseM(-14), cx - 3, 42);
  return done(s);
};

export const variants = Object.fromEntries(Object.entries({ s1, s2, s3, s4, s5, s5b }).map(([k, fn]) => [k, { main: fn(MAIN), small: fn(SMALL) }]));
