// The capsule kit (v3): what the three directions share. Everything draws on an ART canvas, one art pixel a grid pixel,
// with the game's own sprites, palette and room helpers; make.mjs multiplies the art up by a whole number. No smooth
// scaling anywhere: a sprite is drawn 1:1, flipped, or moved by whole pixels (a lean is a row shear, a tilt a column
// shear), so nothing ever leaves the grid.
import { sprite } from '/src/render/sprites.ts';
import { PALETTE, SPRITES } from '/src/render/spriteData.ts';
import { drawLogo } from '/src/ui/menu/title.ts';
import { mk, outlined, px } from '/src/render/roomEntrance.ts';

export { mk, outlined, px, sprite, PALETTE, SPRITES };

// The portraits' palette (tools/build-art.mjs) by name.
export const C = {
  K: '#140c1c', P: '#1a1426', p: '#3a2d52', G: '#d9a640', g: '#8f5a1f', Y: '#ffe45c', Yl: '#ffe08a', W: '#ffffff',
  T: '#f4eee0', R: '#e8374b', r: '#8e1f3a', d: '#561530', O: '#f07c1c', o: '#a8401a', U: '#3474e0', A: '#7cc4ff',
  N: '#1d3a8c', b: '#5a311c',
};

/** A deterministic random (the capsules render the same every time). */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The rooms' live layers use Math.random (rain, sparks, confetti): make.mjs swaps in a seeded one before any module
 * loads, and each capsule restarts it here, so a capsule renders the same whichever others were rendered before it. */
export const reseed = (n) => globalThis.__capsuleSeed?.(n);

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const mix = (a, b, k) => '#' + rgb(a).map((v, i) => Math.round(v * (1 - k) + rgb(b)[i] * k).toString(16).padStart(2, '0')).join('');

// ---- sprites as canvases --------------------------------------------------------------------------------------------

/** Rows of palette letters ('.' or ' ' clear) as a canvas. */
export function fromRows(rows, ink = PALETTE) {
  const [c, g] = mk(rows[0].length, rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && ch !== ' ' && ink[ch] && px(g, x, y, 1, 1, ink[ch])));
  return c;
}
export function copy(src) {
  const [c, g] = mk(src.width, src.height);
  g.drawImage(src, 0, 0);
  return c;
}
export function flip(src) {
  const [c, g] = mk(src.width, src.height);
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}
/** A lean: each row moves sideways by whole pixels, the foot stays put (`top`: how far the top row moves, + right). */
export function lean(src, top) {
  const pad = Math.abs(top);
  const [c, g] = mk(src.width + pad * 2, src.height);
  for (let y = 0; y < src.height; y++) {
    const dx = Math.round((top * (src.height - 1 - y)) / (src.height - 1));
    g.drawImage(src, 0, y, src.width, 1, pad + dx, y, src.width, 1);
  }
  return c;
}
/** A tilt: each column moves up by whole pixels (`rise`: how far the right edge lifts over the left, + up). */
export function tilt(src, rise) {
  const pad = Math.abs(rise);
  const [c, g] = mk(src.width, src.height + pad * 2);
  for (let x = 0; x < src.width; x++) {
    const dy = Math.round((rise * x) / (src.width - 1));
    g.drawImage(src, x, 0, 1, src.height, x, pad - dy, 1, src.height);
  }
  return c;
}

/**
 * Light a sprite from the scene: a warm rim on the edge that faces the light (`side`: +1 the light is to its right,
 * -1 to its left; `top`: also along its top edges), the outline on that edge warmed, and the far side a step or two
 * darker toward the scene's ambient colour. Per pixel, on the sprite's own grid.
 */
export function lit(src, o = {}) {
  const side = o.side ?? 1;
  const rim = rgb(o.rim ?? C.Yl);
  const rimK = o.rimK ?? 0.62;
  const amb = rgb(o.ambient ?? '#1c1238');
  const shade = o.shade ?? 0.34;
  const w = src.width;
  const h = src.height;
  const out = copy(src);
  const g = out.getContext('2d');
  const im = g.getImageData(0, 0, w, h);
  const d = im.data;
  const s = new Uint8ClampedArray(d);
  const al = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : s[(y * w + x) * 4 + 3]);
  const isK = (x, y) => {
    const i = (y * w + x) * 4;
    return al(x, y) > 0 && s[i] === 0x14 && s[i + 1] === 0x0c && s[i + 2] === 0x1c;
  };
  // the sprite's own left and right extent per row (the shade steps run across the body, not the canvas)
  let x0 = w;
  let x1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (al(x, y)) (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x));
  const set = (i, c, k) => {
    for (let q = 0; q < 3; q++) d[i + q] = Math.round(s[i + q] * (1 - k) + c[q] * k);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!al(x, y)) continue;
      const i = (y * w + x) * 4;
      const edgeSide = al(x + side, y) === 0;
      const edgeTop = o.top !== false && al(x, y - 1) === 0;
      if (isK(x, y)) {
        // the outline on the lit edge: a warm dark, not black (a selective outline)
        if (edgeSide || edgeTop) set(i, rim, 0.3);
        continue;
      }
      const rimSide = isK(x + side, y) && al(x + 2 * side, y) === 0;
      const rimTop = o.top !== false && isK(x, y - 1) && al(x, y - 2) === 0;
      if (rimSide || rimTop) {
        set(i, rim, rimK);
        continue;
      }
      // the far side, in two steps
      const t = side > 0 ? (x1 - x) / Math.max(1, x1 - x0) : (x - x0) / Math.max(1, x1 - x0);
      if (t > 0.72) set(i, amb, shade);
      else if (t > 0.5) set(i, amb, shade * 0.45);
    }
  g.putImageData(im, 0, 0);
  return out;
}

/** A sprite's silhouette in one colour (a shadow, a backlit figure). */
export function silhouette(src, color) {
  const out = copy(src);
  const g = out.getContext('2d');
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, src.width, src.height);
  return out;
}

// ---- light on the scene (stepped, crisp-edged: the rooms' rule, no gradients) -----------------------------------------

/** A pool of light, added to what's there: nested crisp ellipses, each adding `color` once more. */
export function glow(g, cx, cy, rx, ry, color, steps = [1, 0.7, 0.42]) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = color;
  for (const k of steps) {
    const ex = rx * k;
    const ey = ry * k;
    for (let y = -Math.floor(ey); y <= Math.floor(ey); y++) {
      const hw = Math.floor(ex * Math.sqrt(Math.max(0, 1 - (y * y) / (ey * ey))));
      g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
    }
  }
  g.restore();
}
/** A pool of shadow: nested crisp ellipses of the scene's dark. */
export function shadow(g, cx, cy, rx, ry, a = 0.5, color = '#0a0612') {
  g.save();
  g.fillStyle = color;
  for (const [k, a2] of [[1, 0.5], [0.72, 0.6], [0.45, 0.6]]) {
    g.globalAlpha = a * a2;
    const ex = rx * k;
    const ey = Math.max(1, ry * k);
    for (let y = -Math.floor(ey); y <= Math.floor(ey); y++) {
      const hw = Math.floor(ex * Math.sqrt(Math.max(0, 1 - (y * y) / (ey * ey))));
      g.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
    }
  }
  g.restore();
}
/** A shape of light added to what's there (a door's light across the floor, a spotlight's cone): rows of [x0, x1]. */
export function addRows(g, y0, rows, color) {
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = color;
  rows.forEach((r, i) => r && g.fillRect(Math.round(r[0]), y0 + i, Math.max(0, Math.round(r[1]) - Math.round(r[0])), 1));
  g.restore();
}

/**
 * A reflection on a wet floor: the sprite mirrored under its foot line, squashed (every other source row), broken
 * into scanlines with a ripple, fading with depth (the rooms' wet-pavement idiom: 1px rows, never a blur).
 */
export function reflect(g, src, x, footY, o = {}) {
  const depth = o.depth ?? 22;
  const a0 = o.alpha ?? 0.38;
  const squash = o.squash ?? 2;
  g.save();
  for (let r = 0; r < depth; r++) {
    const sy = src.height - 1 - (o.skip ?? 0) - r * squash;
    if (sy < 0) break;
    if (r % 3 === 2) continue;
    g.globalAlpha = a0 * (1 - r / depth);
    g.drawImage(src, 0, sy, src.width, 1, x + Math.round(Math.sin(r * 0.9 + (o.phase ?? 0)) * (r > 4 ? 1 : 0)), footY + r, src.width, 1);
  }
  g.restore();
}

// ---- the marquee (the game's logo, as a sign in the scene) ---------------------------------------------------------

export const LOGO_W = 160;
export const LOGO_H = 44;
/** The logo's 2x2 bulbs, clockwise from the top left (title.ts's own walk). */
const BULBS = (() => {
  const b = [];
  for (let x = 3; x <= 155; x += 4) b.push([x, 3]);
  for (let y = 7; y <= 35; y += 4) b.push([155, y]);
  for (let x = 155; x >= 3; x -= 4) b.push([x, 39]);
  for (let y = 35; y >= 7; y -= 4) b.push([3, y]);
  return b;
})();
/** The REEL BRAWL marquee, its top left at (x, y): the game's logo at one art pixel a pixel, its bulbs mid-chase, each
 * lit bulb with a 1px halo (the rooms' bulb). */
export function marquee(g, x, y, chase = 1) {
  drawLogo(g, x + LOGO_W / 2, y + LOGO_H / 2, 1, { chase });
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#4a2c08';
  BULBS.forEach(([bx, by], i) => {
    if ((i + chase) % 3 === 2) return;
    g.fillRect(x + bx - 1, y + by, 4, 2);
    g.fillRect(x + bx, y + by - 1, 2, 4);
  });
  g.restore();
}

// ---- THE DOORMAN's gold Slot Machine at the cabinets' size --------------------------------------------------------
// The game has it at 32x32 (houseMachine) and the playable Slot Machines at 48x64 (cabinetKnight...). One grid needs
// both at one size, so this builds the gold one the way tools/build-art.mjs builds a cabinet (its `cabinet(t)`, the
// same layout and shading rule), dressed as houseMachine: gold body, red trim, cream reels with red sevens, coins.

const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, c) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
};
const get = (g, x, y) => (y >= 0 && y < g.length && x >= 0 && x < g[0].length ? g[y][x] : '.');
const stamp = (g, x0, y0, rows) => rows.forEach((r, dy) => [...r].forEach((c, dx) => c !== ' ' && put(g, x0 + dx, y0 + dy, c)));
function outline(g) {
  const add = [];
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++)
      if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(g, x + dx, y + dy) !== '.')) add.push([x, y]);
  add.forEach(([x, y]) => (g[y][x] = 'K'));
  return g;
}
const SEVEN = ['RRRRRRR', 'RMMRRRr', '    RRr', '   RRr ', '  RRr  ', '  RRr  ', '  RRr  '];
const DARKER = { R: 'r', r: 'd', M: 'R', K: 'K' };
/** The crown, from houseMachine's own top rows. */
export const CROWN = [
  '..........K..........',
  '.K....K..KWK..K....K.',
  'KWK..KWKKYGgKKWK..KWK',
  'KYK.KYGgKYGgKYGgK.KgK',
  'KYGKKYGgKYGgKYGgKKGgK',
  'KYGGYGGGgYGgYGGGgGGgK',
  'KYYYYYYYYWRrYYYYYYYgK',
  'KYGGGRrGGRrrGGRrGGGgK',
  'KKKKKKKKKKKKKKKKKKKKK',
];
export function houseCabinetRows() {
  const g = grid(48, 64);
  const [bh, bm, bl, bd] = ['Y', 'G', 'g', 'b'];
  const [th, tm, tl] = ['M', 'R', 'r'];
  const [ph, pm, pl] = ['R', 'r', 'd'];
  for (let y = 19; y <= 58; y++)
    for (let x = 4; x <= 40; x++) {
      let c = x === 4 ? bh : x >= 39 ? (x === 40 ? bd : bl) : bm;
      // a second highlight column: polished gold
      if (x === 6 && y > 41) c = bh;
      if (y === 19 && x > 4) c = bd;
      put(g, x, y, c);
    }
  // marquee: a gold ring with chase bulbs, a red panel
  for (let y = 8; y <= 18; y++)
    for (let x = 2; x <= 42; x++) {
      if ((x === 2 || x === 42) && (y === 8 || y === 18)) continue;
      const ring = x === 2 || x === 42 || y === 8 || y === 18;
      const inset = !ring && (x === 3 || x === 41 || y === 9 || y === 17);
      let c;
      if (ring) c = y === 8 || x === 2 ? 'Y' : y === 18 || x === 42 ? 'g' : 'G';
      else if (inset) c = y === 9 || x === 3 ? 'K' : pl;
      else c = y === 10 ? ph : y === 16 ? pl : pm;
      put(g, x, y, c);
    }
  for (let x = 4, i = 0; x <= 40; x += 3, i++) {
    put(g, x, 8, i % 2 ? 'O' : 'W');
    put(g, x, 18, i % 2 ? 'W' : 'O');
  }
  for (const y of [11, 14]) {
    put(g, 2, y, 'W');
    put(g, 42, y, 'O');
  }
  // the marquee's plate: three gold stars on the red
  for (const x of [13, 22, 31]) stamp(g, x - 2, 11, [' YWY ', 'YYYYG', ' YGG ', ' G g ']);
  // reel window: bevelled red frame, cream reels
  for (let y = 20; y <= 40; y++)
    for (let x = 6; x <= 38; x++) {
      const outer = x === 6 || x === 38 || y === 20 || y === 40;
      const inner = !outer && (x === 7 || x === 37 || y === 21 || y === 39);
      if (outer) put(g, x, y, y === 20 || x === 6 ? th : tl);
      else if (inner) put(g, x, y, y === 21 || x === 7 ? 'K' : tm);
      else if (x === 17 || x === 27) put(g, x, y, 'K');
      else put(g, x, y, y <= 23 || y >= 37 ? 't' : 'T');
    }
  for (const x0 of [8, 18, 28]) {
    // a seven on the payline, the next ones half seen above and below (a step darker: the reel's curve)
    SEVEN.forEach((r, dy) => [...r].forEach((c, dx) => c !== ' ' && put(g, x0 + 1 + dx, 27 + dy, c)));
    SEVEN.slice(5).forEach((r, dy) => [...r].forEach((c, dx) => c !== ' ' && put(g, x0 + 1 + dx, 22 + dy, DARKER[c])));
    SEVEN.slice(0, 2).forEach((r, dy) => [...r].forEach((c, dx) => c !== ' ' && put(g, x0 + 1 + dx, 37 + dy, DARKER[c])));
  }
  put(g, 6, 29, 'Y'); put(g, 6, 30, 'Y'); put(g, 6, 31, 'Y'); put(g, 7, 30, 'W');
  put(g, 38, 29, 'Y'); put(g, 38, 30, 'Y'); put(g, 38, 31, 'Y'); put(g, 37, 30, 'G');
  // button deck
  for (let x = 3; x <= 41; x++) {
    put(g, x, 41, th);
    for (let y = 42; y <= 44; y++) put(g, x, y, x === 3 ? th : x >= 40 ? tl : tm);
    put(g, x, 45, tl);
  }
  stamp(g, 9, 42, ['AU', 'UN']);
  stamp(g, 18, 42, ['WYYYYYYG', 'YGGGGGGg']);
  stamp(g, 34, 42, ['AU', 'UN']);
  // belly panel: stacks of coins behind glass
  for (let y = 46; y <= 51; y++)
    for (let x = 7; x <= 37; x++) {
      const edge = x === 7 || x === 37 || y === 46 || y === 51;
      put(g, x, y, edge ? (y === 46 || x === 7 ? 'K' : bh) : y === 47 ? 'r' : 'd');
    }
  [2, 3, 4, 3, 2, 4, 3].forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      const x = 9 + i * 4;
      const y = 50 - k;
      put(g, x, y, 'Y'); put(g, x + 1, y, k === n - 1 ? 'W' : 'G'); put(g, x + 2, y, 'g');
    }
  });
  // coin tray, coins in it
  for (let x = 10; x <= 34; x++) { put(g, x, 52, 'K'); put(g, x, 53, 'K'); put(g, x, 54, 'P'); put(g, x, 55, tl); }
  for (let x = 8; x <= 36; x++) { put(g, x, 56, th); put(g, x, 57, x === 8 ? th : tm); put(g, x, 58, tl); }
  put(g, 8, 56, 'W'); put(g, 9, 56, 'W');
  stamp(g, 12, 53, [' YW ', 'YGGg']);
  stamp(g, 18, 54, ['WYYG']);
  stamp(g, 24, 53, [' YW  YG', 'YGGg YGg']);
  // plinth
  for (let x = 3; x <= 41; x++) for (let y = 59; y <= 62; y++) put(g, x, y, y === 59 || x === 3 ? bl : bd);
  // lever: steel housing and shaft, a red ball knob (houseMachine's)
  for (let y = 33; y <= 38; y++) for (let x = 41; x <= 44; x++) put(g, x, y, y === 33 ? 'L' : y === 38 || x === 44 ? 'D' : 'S');
  for (let y = 25; y <= 32; y++) { put(g, 43, y, 'L'); put(g, 44, y, 'S'); }
  for (let y = 20; y <= 25; y++) for (let x = 41; x <= 46; x++) if ((x - 43.5) ** 2 + (y - 22.5) ** 2 <= 7.3) put(g, x, y, x + y <= 64 ? 'M' : x + y >= 68 ? 'r' : 'R');
  put(g, 43, 21, 'W');
  outline(g);
  return g.map((r) => r.join(''));
}
/** The gold cabinet (48x64, no crown) and its crown (21x9), as canvases. */
export const houseCabinet = () => fromRows(houseCabinetRows());
export const crown = () => fromRows(CROWN);
/** The gold cabinet wearing its crown (48x72: the crown's band on the marquee's top edge). */
export function houseCrowned() {
  const [c, g] = mk(48, 72);
  g.drawImage(houseCabinet(), 0, 8);
  g.drawImage(crown(), 12, 7);
  return c;
}
/**
 * A turn by three shears (rows, columns, rows): every pixel moves whole, none is resampled or blended, so the sprite
 * keeps its pixels and its palette (the pixel artist's rotation for a small angle). `deg` + clockwise.
 */
export function turn(src, deg) {
  const t = (deg * Math.PI) / 180;
  const a = -Math.tan(t / 2);
  const b = Math.sin(t);
  const w = src.width;
  const h = src.height;
  const pad = Math.ceil(Math.max(w, h) * 0.75);
  const W2 = w + pad * 2;
  const H2 = h + pad * 2;
  const im = src.getContext('2d').getImageData(0, 0, w, h).data;
  const [c, g] = mk(W2, H2);
  const out = g.createImageData(W2, H2);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!im[i + 3]) continue;
      let dx = x - cx;
      let dy = y - cy;
      dx = Math.round(dx + a * dy);
      dy = Math.round(dy + b * dx);
      dx = Math.round(dx + a * dy);
      const X = Math.round(dx + cx) + pad;
      const Y = Math.round(dy + cy) + pad;
      const j = (Y * W2 + X) * 4;
      out.data[j] = im[i];
      out.data[j + 1] = im[i + 1];
      out.data[j + 2] = im[i + 2];
      out.data[j + 3] = 255;
    }
  g.putImageData(out, 0, 0);
  return trim(c);
}
/** A sprite without its outer outline (the dark pixels on its silhouette's edge), and one given a fresh 1px outline. */
export function unoutlined(src) {
  const w = src.width;
  const h = src.height;
  const out = copy(src);
  const g = out.getContext('2d');
  const im = g.getImageData(0, 0, w, h);
  const s = new Uint8ClampedArray(im.data);
  const al = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : s[(y * w + x) * 4 + 3]);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dark = s[i] === 0x14 && s[i + 1] === 0x0c && s[i + 2] === 0x1c;
      if (al(x, y) && dark && (!al(x + 1, y) || !al(x - 1, y) || !al(x, y + 1) || !al(x, y - 1))) im.data[i + 3] = 0;
    }
  g.putImageData(im, 0, 0);
  return out;
}
export function reoutlined(src) {
  const w = src.width;
  const h = src.height;
  const [c, g] = mk(w + 2, h + 2);
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const al = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  g.fillStyle = C.K;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) if (!al(x, y) && (al(x + 1, y) || al(x - 1, y) || al(x, y + 1) || al(x, y - 1))) g.fillRect(x + 1, y + 1, 1, 1);
  g.drawImage(src, 1, 1);
  return c;
}
/** Crop a canvas to what's drawn on it. */
export function trim(src) {
  const w = src.width;
  const h = src.height;
  const d = src.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const [c, g] = mk(Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1));
  g.drawImage(src, -x0, -y0);
  return c;
}
/** A quarter turn (whole pixels: nothing leaves the grid). `cw`: its top ends up on the right. */
export function quarter(src, cw = true) {
  const [c, g] = mk(src.height, src.width);
  if (cw) {
    g.translate(src.height, 0);
    g.rotate(Math.PI / 2);
  } else {
    g.translate(0, src.width);
    g.rotate(-Math.PI / 2);
  }
  g.drawImage(src, 0, 0);
  return c;
}

/** KNIGHT's cabinet (the game's sprite) with three swords on its payline: the spin that's hitting. `lineOn`: the
 * payline lit across the window. */
export function knightAttacking(lineOn = true) {
  const src = sprite('cabinetKnight');
  const out = copy(src);
  const g = out.getContext('2d');
  // the middle reel (x18..26) shows shield / sword / shield top to bottom; the outer ones sword / shield / sword.
  // Give all three the middle reel's column, so the payline reads SWORD SWORD SWORD.
  for (const x0 of [8, 28]) g.drawImage(src, 18, 22, 9, 17, x0, 22, 9, 17);
  if (lineOn) {
    // the payline: a gold line behind the symbols' row, its arrows lit
    for (let x = 8; x <= 36; x++) {
      if (x === 17 || x === 27) continue;
      const i = g.getImageData(x, 30, 1, 1).data;
      if (i[0] === 0x3a && i[1] === 0x2d) px(g, x, 30, 1, 1, C.Y);
    }
    for (const x of [6, 38]) px(g, x, 29, 1, 3, C.Y);
  }
  return out;
}

// ---- the fight's effects --------------------------------------------------------------------------------------------

/** A sword in flight, point to the right (the game's swordProjectile, drawn longer so it reads at capsule size). */
export const SWORD = [
  '.....K....................',
  '....KYK...................',
  '.KKKKYKKKKKKKKKKKKKKKK....',
  'KGBBBGWWWWLLLLLLLLLLLLKK..',
  'KYbBBGLSSSSSSSSSSSSSSSSLK.',
  'KgBbbgDDDDDDDDDDDDDDDDKK..',
  '.KKKKgKKKKKKKKKKKKKKKK....',
  '....KgK...................',
  '.....K....................',
];
export const swordSprite = () => fromRows(SWORD);

/** Speed lines behind something flying right (pass dir -1 for left): stepped dashes, shorter and dimmer further back. */
export function streak(g, x, y, len, dir = 1, col = C.Yl, rows = [0]) {
  g.save();
  g.fillStyle = col;
  rows.forEach((dy, n) => {
    let at = 0;
    for (let i = 0; at < len; i++) {
      const w = Math.max(1, Math.round(7 - i * 1.5 - n));
      g.globalAlpha = Math.max(0.12, 0.85 - i * 0.2 - n * 0.15);
      const x0 = dir > 0 ? x - at - w : x + at;
      g.fillRect(Math.round(x0), Math.round(y + dy), w, 1);
      at += w + 2 + i;
    }
  });
  g.restore();
}

/** An impact: a stepped star (four long rays, four short), white at its heart, gold, then orange at the tips. */
export function burst(g, cx, cy, r, o = {}) {
  const cols = o.cols ?? [C.W, C.Y, C.O];
  const ray = (dx, dy, len, th) => {
    for (let k = 0; k < len; k++) {
      const u = k / len;
      const w = Math.max(1, Math.round(th * (1 - u)));
      g.fillStyle = u < 0.34 ? cols[0] : u < 0.72 ? cols[1] : cols[2];
      g.fillRect(Math.round(cx + dx * k - w / 2), Math.round(cy + dy * k - w / 2), w, w);
    }
  };
  // an outline first (the portraits' dark), so the star holds on any ground
  if (o.outline !== false) {
    g.save();
    g.fillStyle = C.K;
    for (const [dx, dy, k, th] of RAYS) for (let q = 0; q < r * k + 1; q++) {
      const w = Math.max(1, Math.round(th * r * 0.1 * (1 - q / (r * k)))) + 2;
      g.fillRect(Math.round(cx + dx * q - w / 2), Math.round(cy + dy * q - w / 2), w, w);
    }
    g.restore();
  }
  for (const [dx, dy, k, th] of RAYS) ray(dx, dy, r * k, Math.max(1, th * r * 0.1));
  const core = Math.max(1, Math.round(r * 0.28));
  for (let y = -core; y <= core; y++) {
    const hw = core - Math.abs(y);
    px(g, cx - hw, cy + y, hw * 2 + 1, 1, cols[0]);
  }
}
const D7 = Math.SQRT1_2;
const RAYS = [[1, 0, 1, 3], [-1, 0, 1, 3], [0, 1, 0.8, 3], [0, -1, 0.9, 3], [D7, D7, 0.62, 2], [-D7, D7, 0.62, 2], [D7, -D7, 0.7, 2], [-D7, -D7, 0.7, 2]];

/** A small coin in the air (the rooms' own: 3x3, a white glint; edge-on now and then). */
export function miniCoin(g, x, y, edge = false) {
  px(g, x - 1, y - 2, edge ? 3 : 5, 5, C.K);
  if (!edge) px(g, x - 2, y - 1, 5, 3, C.K);
  px(g, x - (edge ? 0 : 1), y - 1, edge ? 1 : 3, 3, C.Y);
  if (!edge) { px(g, x + 1, y - 1, 1, 3, C.G); px(g, x, y - 1, 1, 1, '#fffbe6'); }
}
/** A four-point glint. */
export function glint(g, x, y, r = 2, col = C.W) {
  px(g, x - r, y, r * 2 + 1, 1, col);
  px(g, x, y - r, 1, r * 2 + 1, col);
}
