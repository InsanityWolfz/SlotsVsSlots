// THE CAPSULE (user, 2026-11-11: "its sign over the reels all day"): the REEL BRAWL marquee in front of a wall of reels,
// every Steam size composed for its own frame on a whole-pixel grid.
//   node art/capsule/v3/make.mjs steam        ->  art/capsule/steam/*.png (upload-ready) and art/capsule/steam/alt/*.png
// The wall: reel columns edge to edge, each in its window (edged, a highlight down the glass, the strip shaded at the
// frame's top and bottom as it curves away), the game's own symbols at their real sprites, each column stopped at its
// own height, two of them smeared. The sign is the only light: a cell near it is warm and brighter, the far ones sink
// to plum; every symbol stays dimmer than the logo. No symbol is left as a sliver at the sign's edge: a column's stop
// is chosen so what the sign covers is covered whole, or shows most of itself.
// The sign: the game's logo sprite. Its frame is rebuilt at any length or height from the sprite's own corners and
// edges (the bulbs repainted in the title screen's 2-lit-1-dark chase), and its letters are the sprite's own, so the
// shorter sign and the stacked REEL / BRAWL one are still the game's logo.
import * as K from './kit.js';

const { C, px, mk } = K;

// ---- the marquee at any size --------------------------------------------------------------------------------------------

const BULB_ON = ['#ffffff', '#ffe45c', '#ffe45c', '#d9a640'];
const BULB_OFF = ['#f07c1c', '#a8401a', '#a8401a', '#a8401a'];
let wordSpans = null;
/** Where REEL and BRAWL sit in the logo sprite: [x0, x1] each (the widest gap between lettered columns parts them). */
function words() {
  if (wordSpans) return wordSpans;
  const d = K.sprite('logo').getContext('2d').getImageData(0, 0, 160, 44).data;
  const panel = (x, y) => {
    const i = (y * 160 + x) * 4;
    return (d[i] === 0x1a && d[i + 1] === 0x14) || (d[i] === 0x3a && d[i + 1] === 0x2d);
  };
  const used = [];
  for (let x = 8; x < 152; x++) {
    let u = false;
    for (let y = 11; y < 34; y++) if (!panel(x, y)) u = true;
    if (u) used.push(x);
  }
  let cut = 0;
  for (let i = 1; i < used.length; i++) if (used[i] - used[i - 1] > used[cut + 1] - used[cut]) cut = i - 1;
  return (wordSpans = [[used[0], used[cut]], [used[cut + 1], used[used.length - 1]]]);
}
/**
 * The marquee `w` long (w - 8 a multiple of 4: the bulbs' pitch), one line or `stacked` (REEL over BRAWL, 72 high).
 * `glow`: each lit bulb's 1px halo on the casing.
 */
function marquee(w, stacked = false, glow = true) {
  const h = stacked ? 72 : 44;
  const src = K.sprite('logo');
  const [c, g] = mk(w, h);
  px(g, 8, 8, w - 16, h - 16, '#1a1426');
  g.drawImage(src, 8, 0, w - 16, 8, 8, 0, w - 16, 8);
  g.drawImage(src, 8, 36, w - 16, 8, 8, h - 8, w - 16, 8);
  for (let y = 8; y < h - 8; y += 28) {
    const n = Math.min(28, h - 8 - y);
    g.drawImage(src, 0, 8, 8, n, 0, y, 8, n);
    g.drawImage(src, 152, 8, 8, n, w - 8, y, 8, n);
  }
  for (const [sx, sy, dx, dy] of [[0, 0, 0, 0], [152, 0, w - 8, 0], [0, 36, 0, h - 8], [152, 36, w - 8, h - 8]]) g.drawImage(src, sx, sy, 8, 8, dx, dy, 8, 8);
  // the letters: the sprite's own
  const [reel, brawl] = words();
  if (stacked) {
    for (const [[a, b], y] of [[reel, 11], [brawl, 37]]) g.drawImage(src, a, 10, b - a + 1, 24, Math.round((w - (b - a + 1)) / 2), y, b - a + 1, 24);
  } else {
    const a = reel[0] - 2;
    const b = brawl[1] + 2;
    g.drawImage(src, a, 9, b - a + 1, 26, Math.round((w - (b - a + 1)) / 2), 9, b - a + 1, 26);
  }
  // the bulbs, clockwise from the top left (title.ts's walk), two lit and one dark
  const bulbs = [];
  for (let x = 3; x <= w - 5; x += 4) bulbs.push([x, 3]);
  for (let y = 7; y <= h - 9; y += 4) bulbs.push([w - 5, y]);
  for (let x = w - 5; x >= 3; x -= 4) bulbs.push([x, h - 5]);
  for (let y = h - 9; y >= 7; y -= 4) bulbs.push([3, y]);
  bulbs.forEach(([bx, by], i) => {
    const on = (i + 1) % 3 !== 2;
    const glass = on ? BULB_ON : BULB_OFF;
    for (let k = 0; k < 4; k++) px(g, bx + (k % 2), by + (k >> 1), 1, 1, glass[k]);
  });
  if (glow) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = '#4a2c08';
    bulbs.forEach(([bx, by], i) => {
      if ((i + 1) % 3 === 2) return;
      g.fillRect(bx - 1, by, 4, 2);
      g.fillRect(bx, by - 1, 2, 4);
    });
    g.restore();
    bulbs.forEach(([bx, by], i) => (i + 1) % 3 !== 2 && px(g, bx, by, 1, 1, '#ffffff'));
  }
  return c;
}

// ---- the wall of reels --------------------------------------------------------------------------------------------------

/** The game's own symbols first (no BAR, no X2: they carry words). */
const POOL = ['sword', 'shield', 'bolt', 'note', 'ace', 'goldbar', 'coin', 'seven', 'cherry', 'wild', 'sword', 'shield', 'seven', 'bolt'];
const PITCH = 22;
const dimCache = new Map();
/** A symbol stepped down toward the wall's plum: `lv` 0 (far) .. 4 (beside the sign), warmer as it nears. */
function dimmed(id, lv) {
  const key = `${id}:${lv}`;
  if (dimCache.has(key)) return dimCache.get(key);
  const [t, tg] = mk(16, 16);
  tg.drawImage(K.sprite(id), 0, 0);
  tg.globalCompositeOperation = 'source-atop';
  tg.fillStyle = ['rgba(24,14,40,0.84)', 'rgba(28,15,40,0.76)', 'rgba(36,17,40,0.68)', 'rgba(44,20,38,0.6)', 'rgba(52,24,36,0.52)'][lv];
  tg.fillRect(0, 0, 16, 16);
  dimCache.set(key, t);
  return t;
}
/**
 * The wall, W x H. `x00`: where the first column starts (set so the sign's ends fall on the columns' edges);
 * `sign` {x, y, w, h}: what covers it (null: nothing); `light` {x, y, w, h}: where the light comes from (the sign,
 * or for the library hero the middle, where Steam lays the logo); `reach`: how far the light carries; `symbols`:
 * false leaves the strips bare (the small capsule); `smear`: the columns still moving.
 */
function reelWall(W, H, o) {
  const [art, g] = mk(W, H);
  px(g, 0, 0, W, H, '#120b1c');
  const L = o.light;
  const reach = o.reach ?? 1;
  const dist = (x, y) => Math.hypot(Math.max(L.x - x, 0, x - (L.x + L.w)), Math.max(L.y - y, 0, y - (L.y + L.h)) * 1.15) / reach;
  const level = (d) => (d < 7 ? 4 : d < 24 ? 3 : d < 46 ? 2 : d < 72 ? 1 : 0);
  const S = o.sign && { x: o.sign.x, y: o.sign.y - 1, w: o.sign.w, h: o.sign.h + 5 };
  const rnd = K.seeded(o.seed ?? 77);
  let prevOff = -99;
  let prev = [];
  let prev2 = [];
  const cols = [];
  for (let c = 0, x0 = o.x00; x0 < W; c++, x0 += PITCH) {
    // the window: a dark edge, the strip, a highlight down the glass, the far edge in shadow
    px(g, x0, 0, 1, H, C.K);
    px(g, x0 + 1, 0, 1, H, '#32264a');
    px(g, x0 + 2, 0, 19, H, '#1c1430');
    px(g, x0 + 20, 0, 1, H, '#150e24');
    px(g, x0 + 21, 0, 1, H, C.K);
    // where this reel has stopped: nothing left as a sliver at the sign's edge
    // (how much of this column's symbols the sign's width covers: all of them, or only a part at the sign's end)
    const side = S ? Math.min(x0 + 19, S.x + S.w) - Math.max(x0 + 3, S.x) : 0;
    const hidden = (y) => (S ? Math.max(0, Math.min(y + 16, S.y + S.h) - Math.max(y, S.y)) : 0);
    const ok = (off) => {
      if (side < 13) return true;
      for (let y = off - PITCH; y < H; y += PITCH) if (hidden(y) > 0 && hidden(y) < 16 && 16 - hidden(y) < 11) return false;
      return true;
    };
    let offs = [];
    for (let k = 0; k < PITCH; k++) if (ok(k)) offs.push(k);
    const apart = offs.filter((k) => Math.min((k - prevOff + 2 * PITCH) % PITCH, (prevOff - k + 2 * PITCH) % PITCH) >= 4);
    if (apart.length) offs = apart;
    const off = offs.length ? offs[Math.floor(rnd() * offs.length)] : 0;
    prevOff = off;
    const mine = [];
    let last = null;
    for (let y = off - PITCH; y < H; y += PITCH) {
      // never the same symbol twice running in a reel, or level with itself in the next two reels
      const beside = [...prev, ...prev2].filter(([py]) => Math.abs(py - y) < 20).map(([, id2]) => id2);
      let id = null;
      for (let tries = 0; tries < 40 && (id === null || id === last || beside.includes(id)); tries++) id = POOL[Math.floor(rnd() * POOL.length)];
      last = id;
      // an empty spot where the sign's end would cut a symbol in half, and in a column the frame's edge cuts
      const cut = (side > 0 && side < 13 && hidden(y) > 3) || x0 + 3 < 0 || x0 + 19 > W;
      mine.push([y, cut ? null : id]);
    }
    cols.push({ x0, mine, smear: (o.smear ?? []).includes(c), hidden });
    prev2 = prev;
    prev = mine;
  }
  for (const { x0, mine, smear, hidden } of cols) {
    for (const [y, id] of mine) {
      const lv = level(dist(x0 + 11, y + 8));
      // the sign's light on the strip, a step a cell
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = '#100708';
      for (let i = 0; i < lv; i++) g.fillRect(x0 + 2, y - 3, 18, PITCH);
      g.restore();
      if (o.symbols === false || !id) continue;
      const t = dimmed(id, lv);
      // (a smear only where the whole symbol shows: its ghosts alone, over the sign's edge, would be a blob)
      if (smear && hidden(y) === 0 && y + 13 < H)
        for (const [k, a] of [[7, 0.16], [5, 0.26], [3, 0.4]]) {
          g.globalAlpha = a;
          g.drawImage(t, x0 + 3, y - k);
        }
      g.globalAlpha = 1;
      g.drawImage(t, x0 + 3, y);
    }
    // the glass's highlight, over the strip
    g.globalAlpha = 0.5;
    px(g, x0 + 3, 0, 1, H, '#2c2244');
    g.globalAlpha = 1;
  }
  // the strips curving away at the top and the bottom of their windows
  const band = Math.max(3, Math.round(H * 0.045));
  for (const [k, a] of [[0, 0.62], [1, 0.42], [2, 0.22]]) {
    g.fillStyle = `rgba(10,6,18,${a})`;
    g.fillRect(0, k * band, W, band);
    g.fillRect(0, H - (k + 1) * band, W, band);
  }
  return [art, g];
}

/** Hang a sign on the wall at (x, y): rods from the top, its glow and its shadow on the reels, then the sign. */
function hang(g, sign, x, y, o = {}) {
  const w = sign.width;
  const h = sign.height;
  // the bulbs' light on the wall right round the sign, in two crisp steps
  for (const [grow, col] of [[6, '#0c0506'], [3, '#150a08']]) K.addRows(g, y - grow, Array.from({ length: h + grow * 2 }, (_, i) => {
    const cutc = Math.max(0, 2 - Math.min(i, h + grow * 2 - 1 - i));
    return [x - grow + cutc, x + w + grow - cutc];
  }), col);
  if (o.rods && y > 3)
    for (const rx of o.rods) {
      px(g, rx - 1, 0, 6, y + 2, C.K);
      px(g, rx, 0, 4, y + 1, '#3b3347');
      px(g, rx, 0, 1, y + 1, '#6d6482');
      px(g, rx + 3, 0, 1, y + 1, '#2a2238');
      px(g, rx - 3, y - 3, 10, 4, C.K);
      px(g, rx - 2, y - 2, 8, 2, C.g);
      px(g, rx - 2, y - 2, 8, 1, C.G);
    }
  // its shadow: down and a little to the right, so it stands off the wall
  g.fillStyle = 'rgba(8,4,14,0.6)';
  g.fillRect(x + 3, y + h, w - 2, 3);
  g.fillRect(x + w, y + 4, 2, h - 2);
  g.drawImage(sign, x, y);
}
// ---- the sizes ----------------------------------------------------------------------------------------------------------

/** One capsule: the art W x H at `k` screen pixels an art pixel, the sign `sw` long (or stacked) with its top at `sy`. */
function capsule({ W, H, sw, sy, stacked, reach, smear, symbols, seed, rods }) {
  const sign = marquee(sw, stacked);
  const sx = Math.round((W - sw) / 2);
  const rect = { x: sx, y: sy, w: sw, h: sign.height };
  // whole columns centred on the frame (what's left over is a bare part-column at each edge)
  const x00 = Math.round((W - Math.floor(W / PITCH) * PITCH) / 2) - PITCH;
  const [art, g] = reelWall(W, H, { x00, sign: rect, light: rect, reach, smear, symbols, seed });
  // the rods run up the columns' edges nearest the sign's ends, so they never cross a symbol
  const edge = (at) => x00 + Math.round((at - x00) / PITCH) * PITCH - 2;
  hang(g, sign, sx, sy, { rods: rods === false ? null : [edge(sx + 22), edge(sx + sw - 22)] });
  return art;
}

/** Everything Steam asks for, and the alternatives to compare. w, h: the file's exact size. */
export async function outputs() {
  const out = [];
  const add = (name, w, h, k, canvas, alt = false) => out.push({ name, w, h, px: k, canvas, alt });
  // main capsule, 8px: the sign 136 long (88% of the width)
  add('main', 1232, 706, 8, capsule({ W: 154, H: 89, sw: 136, sy: 22, smear: [2, 6], seed: 77 }));
  // header, 6px
  add('header', 920, 430, 6, capsule({ W: 154, H: 72, sw: 136, sy: 14, smear: [2, 6], seed: 12 }));
  // small, 3px: the sign as big as the frame takes, the strips bare behind it (no room for a whole symbol)
  add('small', 462, 174, 3, capsule({ W: 154, H: 58, sw: 136, sy: 7, symbols: false, reach: 0.8 }));
  add('small_2px', 462, 174, 2, capsule({ W: 231, H: 87, sw: 160, sy: 21, smear: [3, 8], seed: 5 }), true);
  // the portraits: one line as long as the width takes, in the upper third; and REEL over BRAWL, far bigger
  add('vertical', 748, 896, 5, capsule({ W: 150, H: 180, sw: 136, sy: 34, smear: [2, 5], reach: 1.5, seed: 21 }));
  add('library', 600, 900, 4, capsule({ W: 150, H: 225, sw: 136, sy: 44, smear: [2, 5], reach: 1.8, seed: 33 }));
  add('vertical_stacked', 748, 896, 8, capsule({ W: 94, H: 112, sw: 80, sy: 12, stacked: true, smear: [1], seed: 41 }), true);
  add('library_stacked', 600, 900, 6, capsule({ W: 100, H: 150, sw: 80, sy: 16, stacked: true, smear: [1], reach: 1.3, seed: 44 }), true);
  // library hero, 20px: the wall alone, lit from the middle where Steam lays the logo; the edges fall to plum
  {
    const W = 192;
    const H = 62;
    const light = { x: W / 2 - 22, y: H / 2 - 8, w: 44, h: 16 };
    const [art] = reelWall(W, H, { x00: Math.round(W / 2 - 4.5 * PITCH) - 4 * PITCH, sign: null, light, reach: 1.25, smear: [3, 6], seed: 9 });
    add('hero', 3840, 1240, 20, art);
  }
  // library logo, 7px, on nothing: the sign alone
  {
    const [art, g] = mk(183, 103);
    g.drawImage(marquee(160), 11, 29);
    add('logo', 1280, 720, 7, art);
  }
  return out;
}
/** Crops and shrinks made from the files above: [name, from, ...]. */
export const details = [['main_detail', 'main', 116, 52, 16]];
export const shrinks = [['small_231', 'small', 231, 87], ['small_184', 'small', 184, 69], ['small_2px_231', 'small_2px', 231, 87], ['small_2px_184', 'small_2px', 184, 69]];
