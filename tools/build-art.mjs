// Source of truth for src/render/spriteData.ts.
// Sprites are authored here as fill grids (helpers + literal rows), then a uniform
// 1px dark outline is added automatically so outline weight is identical across the set.
// Run: node tools/build-art.mjs   (writes src/render/spriteData.ts and self-checks it)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- palette
// Tight Endesga/PICO-8-flavoured set. Light comes from the top-left everywhere.
const PALETTE = {
  K: '#140c1c', // outline / near-black
  W: '#ffffff', // gloss highlight
  L: '#d3dde8', // steel light
  S: '#8b9bb4', // steel mid
  D: '#4f5b74', // steel dark
  Y: '#ffe45c', // bright yellow / energy
  G: '#d9a640', // gold (UI border too)
  g: '#8f5a1f', // gold dark
  O: '#f07c1c', // orange
  o: '#a8401a', // dark orange
  B: '#9a5a30', // brown (grip)
  b: '#5a311c', // dark brown
  A: '#7cc4ff', // light blue
  U: '#3474e0', // blue (shield)
  N: '#1d3a8c', // navy
  E: '#b8f25a', // lime highlight
  e: '#4cc234', // slime green
  Q: '#1f7d3c', // dark green
  q: '#0f4128', // deepest green
  R: '#e8374b', // HP red
  r: '#8e1f3a', // dark red
  F: '#f4c09a', // skin
  f: '#c07a5c', // skin shadow
  P: '#1a1426', // panel dark
  p: '#3a2d52', // panel light
  T: '#f4eee0', // UI text
  t: '#9a8fb0', // UI text dim
  // --- roguelike-run additions
  C: '#b4f4ff', // ice pale cyan
  c: '#2ea8cc', // ice deep cyan
  J: '#c795f0', // purple light
  V: '#8a4fc4', // purple
  v: '#4c2372', // purple dark
  M: '#ff9ec8', // pink
  m: '#c7508e', // pink dark
  I: '#bdb1a4', // stone light (warm grey)
  H: '#8a7e76', // stone mid
  h: '#554a4c', // stone dark
  X: '#b3c98f', // orc skin light (green-grey)
  Z: '#7f9a68', // orc skin
  z: '#4a6046', // orc skin dark
  // --- map / relic / card additions
  a: '#ffb070', // apricot (gremlin skin light)
  w: '#c98f58', // light wood (trap / handles top face)
  // --- shop additions
  d: '#561530', // deep velvet red (shop cushion shadow)
  // --- act 2 additions
  k: '#3b3347', // soot / bomb charcoal
  l: '#6d6482', // charcoal light (bomb sheen, slick hair shine)
  i: '#4fe0bf', // teal light (hex glow)
  j: '#1b8a7d', // teal (hexer hood)
  n: '#0c4047', // deep teal
  x: '#ff4fe0', // hex magenta
  s: '#9e1f93', // hex magenta dark
  u: '#c8bddb', // pale skin shadow (vampire)
};

const UI_COLORS = {
  hp: PALETTE.R,
  hpGhost: PALETTE.T,
  shield: PALETTE.U,
  energy: PALETTE.Y,
  gold: PALETTE.G,
  panel: PALETTE.P,
  panelLight: PALETTE.p,
  text: PALETTE.T,
  textDim: PALETTE.t,
  slime: PALETTE.e,
  danger: PALETTE.r,
};

// ---------------------------------------------------------------- helpers
const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, c) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
};
const get = (g, x, y) => (y >= 0 && y < g.length && x >= 0 && x < g[0].length ? g[y][x] : '.');
const hline = (g, x0, x1, y, c) => { for (let x = x0; x <= x1; x++) put(g, x, y, c); };
/** Stamp literal rows at (x0,y0); spaces are "leave as is". */
const stamp = (g, x0, y0, rows) => rows.forEach((r, dy) => [...r].forEach((c, dx) => { if (c !== ' ') put(g, x0 + dx, y0 + dy, c); }));
/** Add a 1px outline (4-neighbour) of `c` around all filled pixels. */
function outline(g, c = 'K') {
  const add = [];
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++)
      if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(g, x + dx, y + dy) !== '.'))
        add.push([x, y]);
  add.forEach(([x, y]) => (g[y][x] = c));
  return g;
}
/** Fill a shape given per-row [x0,x1] extents starting at row y0, colouring each cell via fn. */
function shape(g, y0, spans, fn) {
  const cells = new Set();
  spans.forEach((s, i) => { if (s) for (let x = s[0]; x <= s[1]; x++) cells.add(`${x},${y0 + i}`); });
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    put(g, x, y, fn(x, y, has));
  }
}
const toRows = (g) => g.map((r) => r.join(''));

const S = {};

// ---------------------------------------------------------------- sword (16x16)
{
  const g = grid(16, 16);
  // blade: diagonal band, light edge upper-left, dark edge lower-right
  put(g, 14, 1, 'L'); put(g, 14, 2, 'S');
  for (let y = 2; y <= 8; y++) { put(g, 13 - y, y, 'L'); put(g, 14 - y, y, 'L'); put(g, 15 - y, y, 'S'); if (y > 2) put(g, 16 - y, y, 'D'); }
  put(g, 7, 9, 'D'); put(g, 6, 8, 'S');
  put(g, 11, 2, 'W'); put(g, 10, 3, 'W'); // gloss
  // crossguard (perpendicular diagonal), 2 thick
  [[2, 6, 'g'], [3, 7, 'G'], [4, 8, 'G'], [5, 9, 'G'], [6, 10, 'G'], [7, 11, 'G'], [8, 12, 'g']].forEach(([x, y, c]) => put(g, x, y, c));
  [[3, 6, 'Y'], [4, 7, 'Y'], [5, 8, 'Y'], [6, 9, 'Y'], [7, 10, 'Y'], [8, 11, 'G'], [9, 12, 'g']].forEach(([x, y, c]) => put(g, x, y, c));
  // grip, wrapped
  put(g, 4, 10, 'B'); put(g, 5, 10, 'b');
  put(g, 3, 11, 'B'); put(g, 4, 11, 'b');
  put(g, 2, 12, 'B'); put(g, 3, 12, 'b');
  // pommel
  put(g, 1, 13, 'Y'); put(g, 2, 13, 'G'); put(g, 1, 14, 'G'); put(g, 2, 14, 'g');
  S.sword = toRows(outline(g));
}

// ---------------------------------------------------------------- shield (16x16)
S.shield = [
  '................',
  '.KKKKKKKKKKKKKK.',
  '.KWWLLLLLLLLLSK.',
  '.KWAAAAYGUUUUSK.',
  '.KLAAAAYGUUUUSK.',
  '.KLAAAAYGUUUUSK.',
  '.KLYYYYYGGGGGSK.',
  '.KLGGGGGGGGGgSK.',
  '.KLUUUUYGUUUNSK.',
  '.KLUUUUYGUUNNSK.',
  '..KSUUUYGUNNSK..',
  '...KSUUYGNNSK...',
  '....KSUYGNSK....',
  '.....KSggSK.....',
  '......KSSK......',
  '.......KK.......',
];

// ---------------------------------------------------------------- bolt (16x16)
{
  const g = grid(16, 16);
  const spans = [
    [9, 13], [8, 12], [7, 11], [6, 10], [5, 9], // upper blade
    [3, 12], [4, 11],                           // jog bar
    [7, 10], [6, 9], [6, 8], [5, 7], [5, 6], [4, 5], [4, 4],
  ];
  shape(g, 1, spans, (x, y, has) => {
    const right = !has(x + 1, y), bottom = !has(x, y + 1);
    if (y >= 11 && (right || bottom)) return 'o';
    if (right || bottom) return 'O';
    return 'Y';
  });
  // white-hot core running down the middle of the bolt
  [[11, 2], [10, 3], [9, 4], [8, 5], [7, 6], [8, 6], [9, 6], [8, 8], [7, 9], [7, 10]].forEach(([x, y]) => put(g, x, y, 'W'));
  put(g, 9, 1, 'W'); put(g, 10, 1, 'W'); // gloss
  S.bolt = toRows(outline(g));
}

// ---------------------------------------------------------------- slime (16x16)
{
  const g = grid(16, 16);
  const spans = [[6, 9], [4, 11], [3, 12], [2, 13], [2, 13], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14]];
  shape(g, 3, spans, (x, y, has) => {
    if (y === 14) return 'q';
    if (!has(x + 1, y) || y === 13 || (x + y >= 23)) return 'Q';
    if ((!has(x, y - 1) && x <= 8) || (!has(x - 1, y) && y < 11)) return 'E';
    return 'e';
  });
  put(g, 5, 4, 'W'); put(g, 4, 5, 'W'); // gloss
  // angry-cute eyes (inner top corner cut by a brow)
  stamp(g, 3, 7, [
    ' KK    KK ',
    ' WKK  KWK ',
    ' KK    KK ',
    ' KK    KK ',
  ]);
  // grin with a fang
  stamp(g, 6, 12, ['KKKK', ' W  ']);
  S.slime = toRows(outline(g));
}

// ---------------------------------------------------------------- goo overlay (16x16)
{
  const g = grid(16, 16);
  const spans = [
    [3, 12], [1, 14], [0, 15], [0, 15], [0, 15], [0, 15], [0, 15], [0, 15], [0, 15], [0, 15],
  ];
  shape(g, 0, spans, (x, y, has) => (!has(x, y - 1) || (y < 3 && !has(x - 1, y)) ? 'E' : 'e'));
  // drips hanging from the bottom of the cap
  const drips = [[1, 10, 13], [2, 10, 13], [5, 10, 11], [6, 10, 11], [10, 10, 14], [11, 10, 14], [14, 10, 11]];
  drips.forEach(([x, y0, y1]) => { for (let y = y0; y <= y1; y++) put(g, x, y, 'e'); });
  // shading: dark underside along the drip edge, highlights up top
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (g[y][x] !== '.' && get(g, x, y + 1) === '.' ) g[y][x] = 'Q';
  for (let y = 1; y < 16; y++)
    for (let x = 0; x < 16; x++)
      if (g[y][x] === 'e' && get(g, x, y + 2) === '.' && y + 2 < 16) g[y][x] = 'Q';
  // bubbles + gloss
  stamp(g, 2, 2, [' WW', 'W  ']);
  stamp(g, 9, 3, ['EE', 'Eq']);
  stamp(g, 5, 6, ['E']);
  S.goo = toRows(outline(g));
}

// ---------------------------------------------------------------- HUD icons (8x8)
S.heart = [
  '.KK..KK.',
  'KWRKKRRK',
  'KRRRRRrK',
  'KRRRRRrK',
  '.KRRRrK.',
  '..KRrK..',
  '...KK...',
  '........',
];
S.shieldIcon = [
  'KKKKKKKK',
  'KWLLLLSK',
  'KLAAUUSK',
  'KLAUUNSK',
  'KSUUUNSK',
  '.KSUNSK.',
  '..KSSK..',
  '...KK...',
];
S.boltIcon = [
  '....KKK.',
  '...KWYOK',
  '..KWYOK.',
  '.KYYYYOK',
  '..KKYOK.',
  '..KYoK..',
  '.KYoK...',
  '..KK....',
];

// ---------------------------------------------------------------- projectiles / fx
{
  const g = grid(12, 12);
  stamp(g, 1, 2, [
    '   Y      ',
    '   Y      ',
    'GBBGWWLLL ',
    'YbBGSSSSSL',
    'gBbgDDDDD ',
    '   g      ',
    '   g      ',
  ]);
  S.swordProjectile = toRows(outline(g));
}
S.slimeBlob = [
  '..KKKK..',
  '.KWEeeK.',
  'KWEeeeQK',
  'KEeeeeQK',
  'KeeeeQQK',
  '.KeQQqK.',
  '..KKKK..',
  '........',
];
S.spark = [
  '..W..',
  '.YWY.',
  'WWWWW',
  '.YWY.',
  '..W..',
];

// ---------------------------------------------------------------- portraits (24x24)
{
  const g = grid(24, 24);
  stamp(g, 0, 0, [
    '                        ',
    '          RRRR          ',
    '         RWRRrr         ',
    '         RRRRrr         ',
    '          RRrr          ',
    '        WWLLLLSS        ',
    '       WLLLLLLSSD       ',
    '      LLLLLLLLLSSD      ',
    '     LLLLLLLLLLSSSD     ',
    '     LLLLLLLLLLSSSD     ',
    '    YGGGGGGGGGGGGGGg    ',
    '     LSSfffLSfffSSD     ',
    '     LSSFKFLSFKfSSD     ',
    '     LSSFKFLSFKfSSD     ',
    '     LSSFFFLSFFfSSD     ',
    '     SSSFFFFFFFfSSD     ',
    '     SSSFFbbbbFfSSD     ',
    '     SSSSFFFFFFSSSD     ',
    '      SSSSffffSSSD      ',
    '       DSSSSSSSSD       ',
    '   WLLLSAUUGGUUNSSSSD   ',
    '  LLLLSSAUGGGGUNSSSSDD  ',
    '  LLLSSSAUUGGUUNSSSDDD  ',
    '  LLSSSSAUUUUUUNSSSDDD  ',
  ]);
  S.playerPortrait = toRows(outline(g));
}
{
  const g = grid(24, 24);
  // body
  const spans = [[5, 18], [3, 20], [2, 21]];
  for (let i = 0; i < 16; i++) spans.push([1, 22]);
  shape(g, 5, spans, (x, y, has) => {
    if (!has(x + 1, y) || x >= 20) return 'Q';
    if (y >= 21) return x < 4 ? 'e' : 'Q';
    if (x + y * 0.6 >= 29) return 'Q';
    if (!has(x, y - 1) || !has(x - 1, y)) return 'E';
    return 'e';
  });
  stamp(g, 3, 7, ['WW', 'W']); // gloss
  // crown
  stamp(g, 0, 0, [
    '                        ',
    '      Y    YY    Y      ',
    '      YG  YGGg  Gg      ',
    '      YGGYGRRGgGGg      ',
    '      YGGGGRrGGGGg      ',
    '      GGGGGGGGGGgg      ',
    '      gggggggggggg      ',
  ]);
  // eyes + brows
  stamp(g, 0, 10, [
    '    qq            qq    ',
    '      qq        qq      ',
    '     WWqq      qqWW     ',
    '     WKKK      KKKW     ',
    '     WKRK      KRKW     ',
    '      KK        KK      ',
  ]);
  // toothy grin
  stamp(g, 0, 17, [
    '      KWWKKKKKKWWK      ',
    '       KWKKrrKKWK       ',
    '        KKKKKKKK        ',
  ]);
  S.enemyPortrait = toRows(outline(g));
}

// ================================================================ ROGUELIKE RUN ADDITIONS
/** Literal sprite: rows stamped at (0,0) into a w×h grid ('.' / ' ' = transparent), then auto-outlined. */
function lit(w, h, rows, ol = true) {
  if (rows.length > h) throw new Error(`lit: ${rows.length} rows > ${h}`);
  const g = grid(w, h);
  rows.forEach((r, y) => {
    if (r.length > w) throw new Error(`lit: row ${y} "${r}" longer than ${w}`);
    [...r].forEach((c, x) => { if (c !== '.' && c !== ' ') put(g, x, y, c); });
  });
  return toRows(ol ? outline(g) : g);
}
/** Shade a mask: top/left exposed edge -> hi, bottom/right exposed edge -> lo, else mid. */
const edgeShade = (hi, mid, lo) => (x, y, has) =>
  (!has(x + 1, y) || !has(x, y + 1)) ? lo : (!has(x - 1, y) || !has(x, y - 1)) ? hi : mid;
/** Circle spans (inclusive) for a disc centred at (cx,cy) with radius r. */
function discSpans(cx, cy, r, y0, y1) {
  const out = [];
  for (let y = y0; y <= y1; y++) {
    let a = null, b = null;
    for (let x = 0; x < 32; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) { if (a === null) a = x; b = x; }
    out.push(a === null ? null : [a, b]);
  }
  return out;
}

// ---------------------------------------------------------------- enemy reel symbols (16x16)
// ice: chunky 8-arm snowflake, cyan-white, lit top-left
{
  const g = grid(16, 16);
  const px = [];
  for (let i = 1; i <= 14; i++) { px.push([7, i], [8, i], [i, 7], [i, 8]); }            // main arms, 2px
  for (let i = 0; i < 4; i++) px.push([3 + i, 3 + i], [12 - i, 3 + i], [3 + i, 12 - i], [12 - i, 12 - i]); // diagonals
  px.push([5, 2], [6, 3], [10, 2], [9, 3], [5, 13], [6, 12], [10, 13], [9, 12]);     // V branches
  px.push([2, 5], [3, 6], [2, 10], [3, 9], [13, 5], [12, 6], [13, 10], [12, 9]);
  px.forEach(([x, y]) => put(g, x, y, x + y <= 15 ? 'C' : 'c'));
  stamp(g, 6, 6, ['WCCC', 'CWWc', 'CWWc', 'Cccc']);          // bright hub
  put(g, 7, 1, 'W'); put(g, 7, 2, 'W'); put(g, 1, 7, 'W'); put(g, 2, 7, 'W'); // gloss
  S.ice = toRows(outline(g));
}
// claw: dark purple monster hand (sleeve cuff, thumb out, fingers fanning into hooked talons)
S.claw = lit(16, 16, [
  '......bBBb......',
  '......bBBb......',
  '......JVVv......',
  '.T...JVVVVv.....',
  '.JV..JVVVVVv....',
  '.JVV.JVVVVVVv...',
  '..JVVVVVVVVVv...',
  '...JVVVVVVVVVv..',
  '....JVVvVVvVVv..',
  '...JVv.JVv.JVVv.',
  '..JVv..JVv..JVv.',
  '..JV...JVv...JV.',
  '.WTt...WTt...Tt.',
  '.Tt.....Tt....tT',
  '..t......t.....t',
]);
// rock: dull warm-grey cracked boulder + a stray pebble (junk clutter)
S.rock = lit(16, 16, [
  '................',
  '................',
  '................',
  '......IIIH......',
  '....IIIHHHHh....',
  '...IIHHHHKHHh...',
  '..IIHHHHKHHHHh..',
  '..IHHHHHHKHHHhh.',
  '.IHHHHHHHKKHhhh.',
  '.IHHhHHHHHKhhhh.',
  '.HHHHhHHHHhhhhh.',
  '.HHHHHhhhhhhhhh.',
  '..hhhhhhhhhhhh..',
  '.............IH.',
  '............IHh.',
]);
// lock: iron padlock with chain links either side, rust patches
S.lock = lit(16, 16, [
  '................',
  '................',
  '......LLLS......',
  '.....LS..SD.....',
  '.....LS..SD.....',
  '.....LS..SD.....',
  '...WLLLLLLLLS...',
  '...LSSSSSSSSD...',
  '.SSLSOSKKSSSDSD.',
  'S.DLSooKKSSSDS.D',
  '.DDLSSSSKSSODDD.',
  '...LSSSSKSSoD...',
  '...SSSSSSSSSD...',
  '...DDDDoDDDDD...',
]);
// coin: big gold coin with a star stamp
{
  const g = grid(16, 16);
  const spans = [[5, 10], [3, 12], [2, 13], [2, 13], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 13], [2, 13], [3, 12], [5, 10]];
  shape(g, 1, spans, (x, y, has) => {
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (rim) return x + y >= 16 ? 'g' : 'G';
    return x + y >= 18 ? 'G' : 'Y';
  });
  stamp(g, 4, 4, [
    '   gg   ',
    '   gg   ',
    'ggggggg ',
    ' gggggg ',
    '  gggg  ',
    ' gg  gg ',
    ' g    g ',
  ]);
  put(g, 4, 3, 'W'); put(g, 3, 4, 'W'); put(g, 5, 3, 'W'); // gloss
  S.coin = toRows(outline(g));
}
// seven: classic red 7 with a gold rim
{
  const g = grid(16, 16);
  const spans = [[3, 12], [3, 12], [3, 12], [8, 12], [8, 11], [7, 11], [7, 10], [6, 10], [6, 9], [5, 9], [5, 8]];
  shape(g, 2, spans, (x, y, has) => (!has(x + 1, y) || !has(x, y + 1)) ? 'r' : 'R');
  put(g, 4, 2, 'W'); put(g, 5, 2, 'W'); put(g, 4, 3, 'W');
  // gold rim (a coloured outline), lit top-left
  const rim = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
    if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => 'RrW'.includes(get(g, x + dx, y + dy)))) rim.push([x, y]);
  rim.forEach(([x, y]) => put(g, x, y, (y <= 2 || x <= 3 || (x + y <= 13)) ? 'Y' : (x + y >= 17 ? 'g' : 'G')));
  S.seven = toRows(outline(g));
}
// ball: THE WHEEL's reel symbol (BALL): the big ivory roulette ball, resting on a strip of the wheel's pocket ring
// (black | red | black, gold frets between).
{
  const g = grid(16, 16);
  const rows = [[1, 14], [0, 15], [1, 14]];
  rows.forEach(([a, b], i) => {
    for (let x = a; x <= b; x++) {
      const fret = x === 4 || x === 11;
      const red = x > 4 && x < 11;
      put(g, x, 12 + i, fret ? (i === 0 ? 'Y' : 'G') : red ? (i === 2 ? 'r' : 'R') : i === 2 ? 'K' : 'k');
    }
  });
  // the ball (lit from the top-left): a round ivory sphere with a hot highlight
  const cx = 7.5, cy = 6.2, r = 5.3;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy > r * r) continue;
    const light = dx * 0.8 + dy;
    put(g, x, y, (dx + 2) ** 2 + (dy + 2) ** 2 < 2.6 ? 'W' : light > 3.6 ? 'H' : light > 1.2 ? 't' : 'T');
  }
  // its shadow on the red pocket
  [[5, 12, 'r'], [6, 12, 'r'], [7, 12, 'r'], [8, 12, 'r'], [9, 12, 'r'], [10, 12, 'd']].forEach(([x, y, c]) => put(g, x, y, c));
  S.ball = toRows(outline(g));
}

// ---------------------------------------------------------------- cell overlays (16x16)
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.min(x, y, 15 - x, 15 - y);
    const corner = Math.min(x, 15 - x) + Math.min(y, 15 - y);
    if (d === 0) put(g, x, y, 'c');
    else if (d === 1) put(g, x, y, (x === 1 || y === 1) && x + y < 28 ? 'C' : 'A');
    else if (d === 2 && ((x + y * 3) % 5 !== 0)) put(g, x, y, x + y < 15 ? 'A' : 'c');
    else if (corner <= 4 && d >= 2) put(g, x, y, 'C');
  }
  // icicles off the top rim
  [[5, 3, 'C'], [5, 4, 'A'], [6, 3, 'A'], [10, 3, 'C'], [10, 4, 'C'], [10, 5, 'A'], [11, 3, 'A']].forEach(([x, y, c]) => put(g, x, y, c));
  // glint streaks
  [[2, 5], [3, 4], [4, 3], [5, 2]].forEach(([x, y]) => put(g, x, y, 'W'));
  [[11, 13], [12, 12], [13, 11]].forEach(([x, y]) => put(g, x, y, 'W'));
  put(g, 1, 1, 'W'); put(g, 2, 1, 'W'); put(g, 1, 2, 'W');
  S.frozenOverlay = toRows(g);
}
{
  const g = grid(16, 16);
  // two chains crossing corner to corner: 2px band, every third step a dark link joint
  for (let i = 0; i <= 14; i++) {
    const joint = i % 3 === 2;
    put(g, i, i, joint ? 'D' : 'L'); put(g, i + 1, i, joint ? 'D' : 'S');
    put(g, 15 - i, i, joint ? 'D' : 'L'); put(g, 14 - i, i, joint ? 'D' : 'S');
  }
  stamp(g, 5, 8, [
    ' SDDS ',
    ' S  D ',
    'LLLLSD',
    'LSKSDD',
    'SSKoDD',
    'DDDDDD',
  ]);
  S.lockOverlay = toRows(outline(g));
}

// ---------------------------------------------------------------- relics (16x16)
{
  // four heart-shaped leaves pointing at the hub, mirrored from one template
  const g = grid(16, 16);
  const inLeaf = (x, y) => Math.hypot(x - 4, y - 2.6) <= 1.9 || Math.hypot(x - 2.6, y - 4) <= 1.9 ||
    (x + y <= 13 && x >= 2 && y >= 2 && x <= 6 && y <= 6);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const lx = x <= 7 ? x : 15 - x, ly = y <= 7 ? y : 15 - y;
    if (lx <= 6 && ly <= 6 && inLeaf(lx, ly)) put(g, x, y, 'e');
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (g[y][x] !== 'e') continue;
    if (get(g, x + 1, y) === '.' || get(g, x, y + 1) === '.') g[y][x] = 'Q';
    else if (get(g, x - 1, y) === '.' || get(g, x, y - 1) === '.') g[y][x] = 'E';
  }
  stamp(g, 6, 6, [' QQ ', 'QqqQ', 'QqqQ', ' QQ ']);
  put(g, 3, 2, 'W'); put(g, 2, 3, 'W'); put(g, 4, 2, 'W');
  put(g, 8, 10, 'Q'); put(g, 8, 11, 'Q'); put(g, 8, 12, 'Q'); put(g, 9, 13, 'Q'); put(g, 10, 14, 'q');
  S.relicClover = toRows(outline(g));
}
S.relicBattery = lit(16, 16, [
  '................',
  '......WLS.......',
  '....LLLLLLSD....',
  '....LSDDDDDN....',
  '....LSDDDYDN....',
  '....LSDDYYDN....',
  '....LSDYYDDN....',
  '....LSYWYYDN....',
  '....LSDDYYDN....',
  '....LSDDYDDN....',
  '....LSDYDDDN....',
  '....YYYYYYOO....',
  '....YWYYYYOo....',
  '....YYYYYYOo....',
  '....OOOOOOoo....',
]);
{
  const g = grid(16, 16);
  // TWIN REELS: two steel-framed reel windows showing the same red 7, joined by a gold chain link
  const reel = (x0) => stamp(g, x0, 3, [
    'LLLLLS',
    'LttttD',
    'LTTTtD',
    'LRRRrD',
    'LTTRrD',
    'LTRrTD',
    'LTRrTD',
    'LTrrTD',
    'LTTTtD',
    'LttttD',
    'SDDDDD',
  ]);
  reel(1); reel(9);
  put(g, 2, 4, 'W'); put(g, 10, 4, 'W');
  // gold link bridging the frames
  stamp(g, 6, 7, [
    'YGGg',
    'W  g',
    'G  g',
    'Gggg',
  ]);
  S.relicMirror = toRows(outline(g));
}
S.relicFang = lit(16, 16, [
  '................',
  '......WTTTt.....',
  '.....WTTTTTt....',
  '.....WTTTTTt....',
  '......WTTTTt....',
  '.......TTTTt....',
  '.......TTTTt....',
  '.......TTTt.....',
  '.......TTTt.....',
  '......TTTt......',
  '......RRr.......',
  '.....RRr........',
  '.....Rr.........',
  '....R.......R...',
  '...........RRr..',
  '...........Rr...',
]);
S.relicBandage = lit(16, 16, [
  '................',
  '................',
  '...WTTTt........',
  '..WTTTTTTt......',
  '.WTTtttTTTt.....',
  '.TTtTTTtTTt.....',
  '.TTtTKtTTTt.....',
  '.TTtTttTTTtTTT..',
  '.TTTtTTTTttTTTTT',
  '..TTTTTTttTTRTT.',
  '...ttttttTTRRRT.',
  '.........TTTRTT.',
  '........tTTTTt..',
  '.........tttt...',
]);

// ---------------------------------------------------------------- small icons (8x8)
S.icoFlood = lit(8, 8, ['', '...e', '..EeQ', '.EWeeQ', '.EeeeQ', '.eeeQQ', '..QQQ']);
S.icoSmash = [
  '..KKKK..',
  '.KFWFFK.',
  'KFFFFFfK',
  'KFfKKKKK',
  'KFFFFFfK',
  'KFfKKKKK',
  '.KFFFffK',
  '..KKKKK.',
];
S.icoFreeze = lit(8, 8, ['', '.W.C.c', '..CCc', '.CCWCc', '..Ccc', '.c.c.c']);
S.icoSteal = lit(8, 8, ['', '..T.T.T', '..J.V.V', '.JJVVVV', '.JVVVVv', '..VVVv', '..vvv']);
S.icoLock = lit(8, 8, ['', '..SSS', '..S.D', '.LLSSD', '.LSKSD', '.SSKDD', '.DDDDo']);
S.icoRock = lit(8, 8, ['', '', '...IH', '..IHHh', '.IHHKhh', '.HHhhhh', '..hhhh']);
S.icoCoin = lit(8, 8, ['', '..GGG', '.GWYYg', '.GYgYg', '.GYgYg', '.GYYYg', '..ggg']);
S.plusBadge = lit(8, 8, ['', '...EE', '...Ee', '.EEWeee', '.eeeeQQ', '...eQ', '...QQ']);
S.minusBadge = lit(8, 8, ['', '', '', '.RWRRRr', '.rrrrrr']);
S.skull = lit(8, 8, ['', '..WTTt', '.WTTTTt', '.TKTTKt', '.TKTTKt', '..TTTt', '..TtTt']);

// ---------------------------------------------------------------- map nodes (12x12)
{
  const g = grid(12, 12);
  [[1, 1, 'W'], [2, 2, 'L'], [3, 3, 'L'], [4, 4, 'L'], [5, 5, 'L'], [6, 6, 'S'],
   [8, 6, 'G'], [7, 7, 'Y'], [6, 8, 'g'], [8, 8, 'B'], [9, 9, 'b'], [10, 10, 'Y'],
   [10, 1, 'W'], [9, 2, 'L'], [8, 3, 'L'], [7, 4, 'L'], [6, 5, 'L'], [5, 6, 'S'],
   [3, 6, 'G'], [4, 7, 'Y'], [5, 8, 'g'], [3, 8, 'B'], [2, 9, 'b'], [1, 10, 'Y']].forEach(([x, y, c]) => put(g, x, y, c));
  S.nodeFight = toRows(outline(g));
}
S.nodeBoss = lit(12, 12, [
  '', '',
  '.W...YY...Y',
  '.YG.YGGg.Gg',
  '.YGGGGGGGGg',
  '.YGRGGRrGRg',
  '.YGGGGGGGGg',
  '.gggggggggg',
]);
{
  const g = grid(12, 12);
  shape(g, 1, discSpans(5.5, 5.5, 4.9, 1, 10), edgeShade('E', 'e', 'Q'));
  [[3, 5], [4, 6], [5, 7], [6, 6], [7, 5], [8, 4], [3, 6], [4, 7], [5, 8], [6, 7], [7, 6], [8, 5]].forEach(([x, y]) => put(g, x, y, 'W'));
  S.nodeDone = toRows(outline(g));
}
S.nodeHere = lit(12, 12, [
  '',
  '....YYYg',
  '....YWYg',
  '....YYYg',
  '....YYYg',
  '.YYYYYYYGgg',
  '..YYYYYYGg',
  '...YYYYGg',
  '....YYGg',
  '.....Gg',
]);

// ---------------------------------------------------------------- enemy portraits (24x24)
/** Paint an elliptical boulder with top-left lighting; where it overlaps earlier fill, a K seam is cut first. */
function boulder(g, cx, cy, rx, ry, [hi, mid, lo] = ['I', 'H', 'h']) {
  const inside = (x, y, grow = 0) => ((x - cx) / (rx + grow)) ** 2 + ((y - cy) / (ry + grow)) ** 2 <= 1;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (!inside(x, y) && inside(x, y, 1) && g[y][x] !== '.') g[y][x] = 'K';
  }
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
    if (!inside(x, y)) continue;
    const nx = (x - cx) / rx, ny = (y - cy) / ry;
    g[y][x] = nx + ny < -0.75 ? hi : (nx + ny > 0.55 || ny > 0.7) ? lo : mid;
  }
}
S.enemyBrute = lit(24, 24, [
  '........................',
  '......L.....L.....L.....',
  '......LS....LS....LS....',
  '.....LLSD..LLSD..LSSD...',
  '....LLLSSSSSSSSSSSSSSD..',
  '...LLLSSSSSSSSSSSSSSSDD.',
  '...LSSSSSSSSSSSSSSSSSDD.',
  '..DDDGDDDDDGDDDDDGDDDDD.',
  '..XXXXXXZZZZZZZZZZZZZzz.',
  'XXXXKKKKZZZZZZZZKKKKZzzz',
  '.XXXXZKKKZZZZZZKKKZZZzz.',
  '..XXXZYRKZZZZZZKRYZZZz..',
  '..XXZZZZZZZzzZZZZZZZZz..',
  '..XZZZZZZZKzzKZZZZZZzz..',
  '..XZZZWZZZZZZZZZZWZZzz..',
  '..XZZZTKKKKKKKKKKTZZzz..',
  '..XZZZTWKrrrrrrKWTZzzz..',
  '...XZZZKKKKKKKKKKZZzz...',
  '..L.zZZZZZZZZZZZZzzz.D..',
  '.LLSbBbBbBbBbBbBbBbSSD..',
  'LLSSSbBBTBBTBBTBBBbSSDDD',
  'LSSSDbBBBBBBBBBBBBBbSDDD',
  'LSSDDBbBBBBBBBBBBBbBDDDD',
  'SSDDDbBBBBBBBBBBBBBbDDDD',
]);
{
  const g = grid(24, 24);
  // crystalline horns + crest (lit from the left: W edge, C body, c shadow)
  stamp(g, 0, 0, [
    '..W..................W..',
    '..WC................WCc.',
    '..WCc.....W........WCc..',
    '...WCc...WCc......WCc...',
    '....WCCc.WCCc...WCCc....',
    '.....WCCcWCCCc.WCCc.....',
  ]);
  // head
  const spans = [[7, 16], [5, 18], [4, 19], [4, 19], [4, 19], [4, 19], [4, 19], [4, 19], [5, 18], [5, 18], [6, 17], [7, 16], [8, 15], [10, 13]];
  shape(g, 5, spans, (x, y, has) => {
    if (!has(x + 1, y) || !has(x + 2, y) || !has(x, y + 1)) return 'U';
    if (!has(x - 1, y) || !has(x, y - 1)) return 'C';
    return 'A';
  });
  // pointed ears
  stamp(g, 0, 8, [
    'C                      c',
    'CCA                  UUc',
    ' CA                  U  ',
  ]);
  // glowing eye sockets, sly grin with fangs, frost freckles
  stamp(g, 5, 8, [
    'NN          NN',
    ' NNN      NNN ',
    ' CWWN    NWWC ',
    '  CC      CC  ',
    '      UU      ',
    '  N        N  ',
    '   NWNNNNWN   ',
    '    NNNNNN    ',
  ]);
  put(g, 5, 12, 'C'); put(g, 18, 12, 'U');
  // navy frost cloak with ice collar
  shape(g, 19, [[6, 17], [3, 20], [1, 22], [0, 23], [0, 23]], (x, y, has) => (!has(x - 1, y) || !has(x, y - 1)) && x < 12 ? 'U' : 'N');
  stamp(g, 7, 18, [
    '  C     c  ',
    ' WCC   Ccc ',
    'C  WA AU  c',
  ]);
  put(g, 10, 19, 'A'); put(g, 11, 19, 'A'); put(g, 12, 19, 'U'); put(g, 13, 19, 'U');
  S.enemyFrost = toRows(outline(g));
}
S.enemyThief = lit(24, 24, [
  '........................',
  '..IIH..............IHh..',
  '.IMMMH............IMMMh.',
  '.IMmmHh..RRRRRR..IHMmmh.',
  '.IMmmHRRWRRRRRRRRHMmmh..',
  '..HMHRRRRRRRRRRRRrrhHh..',
  '...HhRRRRRRRRRRRRrrrRr..',
  '....IrrrrrrrrrrrrrrRrRr.',
  '....IHHHHHHHHHHHHHHh.rR.',
  '...IHvvvvvvvvvvvvvvvh..r',
  '...IvWYKvvvvvvvvWYKvh...',
  '...IHvvvvvvvvvvvvvvhh...',
  '....IHHHHHHHHHHHHHhh....',
  '.....IHHHHHIHHHHHhh.....',
  '.t....IHHHHHHHHHhh....t.',
  '..tttIIHHHHHHHHhhhttt...',
  '.t....IIHHHHHHHhh.....t.',
  '.......IHHHMMHhh........',
  '........IHMMMMK.........',
  '........hhKWWKh.........',
  '....bBBBBbhWWhbBBBBBb...',
  '..bBBBBBBBbhhbBBBBBBBb..',
  '.bBBBBBBBBBbbBBBBGBBBBb.',
  'bBBBBBBBBBBBBBBBGgBBBBBb',
]);
{
  const g = grid(24, 24);
  boulder(g, 3.5, 17.5, 5, 5);    // left shoulder
  boulder(g, 20, 17.5, 5, 5);     // right shoulder
  boulder(g, 11.5, 21, 7.5, 5);   // chest
  boulder(g, 11.5, 7.5, 7, 6.5);  // head
  // glowing eye slit (spills a little light)
  stamp(g, 6, 7, [
    ' KKKKKKKKKK ',
    'oOYYWWYYYOOo',
    ' KKKKKKKKKK ',
  ]);
  // cracks
  stamp(g, 13, 10, ['K', ' K', ' K']);
  stamp(g, 6, 3, ['K', 'K ', ' K']);
  // molten core crack in the chest
  stamp(g, 9, 17, [' K  ', ' OK ', 'KYO ', ' OYK', 'K O ', '   K']);
  // moss caps
  stamp(g, 7, 1, ['   QeEE', ' eEEeeeQ', 'EeQ   eQ']);
  stamp(g, 0, 13, [' EE', 'EeeQ']);
  stamp(g, 19, 13, ['  EeQ', ' EeeQQ']);
  S.enemyGolem = toRows(outline(g));
}
{
  const g = grid(24, 24);
  // head
  const spans = [[8, 15], [6, 17], [5, 18], [5, 18], [5, 18], [5, 18], [5, 18], [5, 18], [5, 18], [5, 18], [6, 17], [6, 17], [7, 16], [8, 15], [9, 14]];
  shape(g, 2, spans, (x, y, has) => {
    if (!has(x + 1, y) || !has(x + 2, y) || !has(x, y + 1)) return 'o';
    if (!has(x - 1, y) || !has(x, y - 1)) return 'a';
    return 'O';
  });
  // huge bat ears
  stamp(g, 0, 2, [
    'a                      o',
    'aa                    oo',
    'aMa                  omo',
    'aMMa                ommo',
    'aMmMa              ommoo',
    ' aMmMa            ommMo ',
    '  aMma            ommo  ',
    '   aMa            omo   ',
    '    aa            oo    ',
  ]);
  // goggles on a strap
  stamp(g, 4, 6, [
    ' bbGGGGbbbbGGGGbb ',
    ' bGWAAAgbbGWAAAgb ',
    '  GAAAAgooGAAAAg  ',
    '  GAAAUgooGAAAUg  ',
    '   ggggoooogggg   ',
  ]);
  // jagged grin
  stamp(g, 6, 12, [
    'K          K',
    ' KWWKWWKWWK ',
    ' KrWKrWKrWK ',
    '  KKKKKKKK  ',
  ]);
  // apron body
  shape(g, 18, [[5, 18], [3, 20], [2, 21], [1, 22], [1, 22], [1, 22]], (x, y, has) => (!has(x - 1, y) || !has(x, y - 1)) ? 'B' : (!has(x + 1, y) ? 'b' : 'B'));
  stamp(g, 5, 18, ['b            b', ' b          b', ' b   bbbb   b', ' b   bBBb   b', '     bbbb    ']);
  // big wrench over the right shoulder
  stamp(g, 11, 11, [
    '        L  S ',
    '        LS SD',
    '        LSSD ',
    '       LSDD  ',
    '      LSD    ',
    '     LSD     ',
    '    LSD      ',
    '   LSD       ',
    '  LSD        ',
    ' LSD         ',
    'SSD          ',
    'DD           ',
  ]);
  S.enemyGremlin = toRows(outline(g));
}
S.enemyBoss = lit(24, 24, [
  '...W......W......W......',
  '...YG....YGG....Gg......',
  '...YGG..YGRGg..GGg...RR.',
  '...YGGGGGGrGGGGGGg..RWRr',
  '...GGGGGGGGGGGGGGg..RRrr',
  '.GYYYYYYYYYYYYYYYYgg..rr',
  '.GYrRrWrRrWrRrWrRrgg.SD.',
  '.GYGKKGGGGGGGGGKKGgg.SD.',
  '.GYGGKKKGGGGGKKKGGgg.SD.',
  '.GYGGKKKKKKKKKKKGGgg.SD.',
  '.GYGGKKKRRRRrKKKKGgg.SD.',
  '.GYGGKKTTTTRrTKKGGgg.SD.',
  '.GYGGKWTTTRrTTTKGGgg.SD.',
  '.GYGGKTTTRrTTTTKGGgg.SD.',
  '.GYGGKSSSRrSSSSKGGggSSD.',
  '.GYGGKKKKKKKKKKKGGggDD..',
  '.GYGGGGGGGGGGGGGGGgg....',
  '.GYGKKKKKKKKKKKKKGgg....',
  '.GYGKWYYKWYYKWYYKGgg....',
  '.GYGKKYKGKYKGKYKKGgg....',
  '.GYGKKKYYGKYYGKKKGgg....',
  '.GYGKKKKKKKKKKKKKGgg....',
  'gYYYYYYYYYYYYYYYYYYGg...',
  'ggggggggggggggggggggg...',
]);

// ================================================================ RELICS / CARDS / MAP BADGES (batch 2)
// ---------------------------------------------------------------- counter relics (16x16)
{
  const g = grid(16, 16);
  // tension wrench: slim L lying behind, bottom-right
  for (let y = 5; y <= 12; y++) { put(g, 13, y, 'L'); }
  put(g, 12, 5, 'L'); put(g, 11, 5, 'S');
  hline(g, 7, 13, 13, 'S'); put(g, 7, 13, 'L');
  // pick shaft: diagonal 2px band, lit on the upper-left edge
  for (let i = 0; i <= 6; i++) { put(g, 5 + i, 10 - i, 'L'); put(g, 6 + i, 10 - i, 'S'); }
  // hooked tip
  put(g, 11, 3, 'L'); put(g, 12, 3, 'S'); put(g, 12, 2, 'W'); put(g, 13, 2, 'S'); put(g, 12, 1, 'L');
  // gold handle with a grip notch
  stamp(g, 1, 9, [
    '   YG ',
    '  YGGg',
    ' YGgGg',
    'YGgGg ',
    'GGGg  ',
    ' gg   ',
  ]);
  put(g, 3, 10, 'W');
  S.relicLockpick = toRows(outline(g));
}
{
  const g = grid(16, 16);
  // steel head: thick arc bowed away from the handle, lit on its outer edge
  const hx = 3.5, hy = 12.5;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - hx, y - hy), a = Math.atan2(y - hy, x - hx) * 180 / Math.PI;
    if (d >= 9.2 && d <= 11.3 && a >= -100 && a <= 10) {
      const end = a < -88 || a > -2;
      put(g, x, y, end ? 'D' : d > 10.4 ? (a < -45 ? 'L' : 'S') : (a < -45 ? 'S' : 'D'));
    }
  }
  // wooden handle along the radius
  for (let i = 0; i <= 8; i++) { put(g, 2 + i, 13 - i, 'w'); put(g, 3 + i, 13 - i, 'B'); put(g, 3 + i, 14 - i, 'b'); }
  put(g, 1, 14, 'b'); put(g, 2, 14, 'b');
  put(g, 6, 2, 'W'); put(g, 7, 2, 'W'); put(g, 8, 2, 'W');
  // rock chip flying off the tip + a speck
  stamp(g, 12, 13, ['IH', 'Hh']);
  put(g, 14, 11, 'I');
  S.relicPickaxe = toRows(outline(g));
}
{
  const g = grid(16, 16);
  /** 7x7 red die with rounded corners showing six, lit top-left. */
  const die = (x0, y0) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      if ((x === 0 || x === 6) && (y === 0 || y === 6)) continue;
      const c = (x === 6 || y === 6) ? 'r' : (x === 0 || y === 0) ? 'M' : 'R';
      put(g, x0 + x, y0 + y, c);
    }
    [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]].forEach(([x, y]) => put(g, x0 + x + (x > 3 ? 0 : 1), y0 + y, 'W'));
    put(g, x0 + 1, y0 + 1, 'M');
  };
  die(8, 1); die(1, 8);
  // tiny luck sparkles in the free corners
  stamp(g, 2, 2, [' Y ', 'YWY', ' Y ']);
  put(g, 13, 12, 'Y');
  S.relicDice = toRows(outline(g));
}

// ---------------------------------------------------------------- card icons (16x16)
{
  const g = grid(16, 16);
  const c = 7.5, top = new Set(), bot = new Set();
  const k = (x, y) => `${x},${y}`;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - c, y - c), a = Math.atan2(y - c, x - c) * 180 / Math.PI;
    if (d < 3.4 || d > 5.6) continue;
    if (a >= -165 && a <= -22) top.add(k(x, y));
  }
  // arrowhead at the clockwise end (right side), pointing down
  [[10, 14, 6], [11, 13, 7], [12, 12, 8]].forEach(([a, b, y]) => { for (let x = a; x <= b; x++) top.add(k(x, y)); });
  for (const p of top) { const [x, y] = p.split(',').map(Number); bot.add(k(15 - x, 15 - y)); }
  const paint = (set, hi, mid, lo) => {
    const has = (x, y) => set.has(k(x, y));
    for (const p of set) { const [x, y] = p.split(',').map(Number); put(g, x, y, edgeShade(hi, mid, lo)(x, y, has)); }
  };
  paint(top, 'E', 'e', 'Q');
  paint(bot, 'C', 'A', 'c');
  put(g, 5, 2, 'W'); put(g, 4, 3, 'W');
  put(g, 3, 9, 'W');
  S.cardSwap = toRows(outline(g));
}
S.cardClear = lit(16, 16, [
  '................',
  '.............wB.',
  '............wB..',
  '...........wB...',
  '..........wB....',
  '.........wB.....',
  '........wB......',
  '......RRr.......',
  '.....RWRrr......',
  '....YYGrrG......',
  '...YYGGGgg......',
  '..YYGGGgg.....I.',
  '.YWGGGgGg...I...',
  '.YGgGgGg...IH.Hh',
  '..g.g.g...IHh...',
]);
S.arrowRight = lit(8, 8, [
  '........',
  '....Y...',
  '....YY..',
  '.WYYYYY.',
  '.GGGGGg.',
  '....Gg..',
  '....g...',
]);

// ---------------------------------------------------------------- gold pots
/** Heap of coins: upper half-ellipse filled with a staggered 4x2 coin-scale pattern, lit top-left. */
function coinHeap(g, cx, baseY, rx, ry) {
  const top = baseY - ry;
  for (let y = Math.ceil(top); y <= baseY; y++) for (let x = 0; x < g[0].length; x++) {
    if (((x - cx) / rx) ** 2 + ((y - baseY) / ry) ** 2 > 1) continue;
    const r = y - Math.ceil(top), band = Math.floor(r / 2), v = r % 2;
    const u = (x + (band % 2) * 2) % 4;
    const light = (x - cx) / rx * 0.6 + (y - top) / (ry + 1) * 0.8;
    const lo = light > 0.55, hi = light < 0.1;
    let col;
    if (v === 0) col = (u === 1 || u === 2) ? (lo ? 'G' : 'Y') : 'g';
    else col = u === 3 ? (lo ? 'g' : 'G') : (lo ? 'G' : 'Y');
    if (hi && v === 0 && u === 1) col = 'W';
    put(g, x, y, col);
  }
}
/** Small flat coin lying down (4x2). */
const flatCoin = (g, x, y) => stamp(g, x, y, [' YY ', 'GYYg']);
S.potTier1 = lit(16, 16, [
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....WYYYY......',
  '...YYYGGGGYG....',
  '...YYYYYYYYg....',
  '...YGGGGGGGg....',
  '...gggggggggg...',
  '....YGGGGGGGg...',
  '....gggggggggg..',
  '...YGGGGGGGGg...',
  '...gggggggggg...',
]);
{
  const g = grid(24, 24);
  coinHeap(g, 11.5, 20, 10.5, 12);
  hline(g, 2, 21, 21, 'g');
  flatCoin(g, 0, 20); flatCoin(g, 19, 20);
  S.potTier2 = toRows(outline(g));
}
{
  const g = grid(24, 24);
  coinHeap(g, 11.5, 10, 9.5, 8);
  // iron pot: rim + belly + feet
  shape(g, 12, [[3, 20], [2, 21], [2, 21], [2, 21], [2, 21], [3, 20], [3, 20], [4, 19], [6, 17]], (x, y, has) =>
    (!has(x + 1, y) || !has(x, y + 1) || x >= 17) ? 'N' : (!has(x - 1, y) || x <= 4) ? 'S' : 'D');
  hline(g, 1, 22, 10, 'L'); hline(g, 1, 22, 11, 'S'); put(g, 1, 10, 'W'); put(g, 2, 10, 'W'); put(g, 22, 11, 'D'); put(g, 22, 10, 'S');
  put(g, 5, 13, 'L'); put(g, 4, 14, 'L'); put(g, 4, 15, 'L');
  stamp(g, 5, 21, ['DN', ' N']); stamp(g, 17, 21, ['DN', 'N ']);
  // coins spilling over the rim and down the side
  stamp(g, 19, 9, ['YYG', 'GYYg']);
  stamp(g, 21, 12, ['YG', 'Gg']);
  stamp(g, 21, 15, ['Y', 'g']);
  flatCoin(g, 0, 21);
  // gloss on the heap + sparkles
  stamp(g, 0, 0, [
    '  W       ',
    '  Y       ',
    'WYWYW     ',
    '  Y       ',
    '  W       ',
  ]);
  stamp(g, 19, 1, [' W ', 'WYW', ' W ']);
  S.potTier3 = toRows(outline(g));
}

// ---------------------------------------------------------------- map fork (12x12)
S.mapFork = lit(12, 12, [
  '............',
  '.WY......YG.',
  '.YGG....YGg.',
  '..YGG..YGg..',
  '...YGGYGg...',
  '....YGGg....',
  '.....YG.....',
  '.....YG.....',
  '.....YG.....',
  '.....YG.....',
  '.....Gg.....',
]);

// ---------------------------------------------------------------- map writer badges (8x8)
S.mapBadgeSlime = lit(8, 8, ['', '...Ee', '...Ee', '..EWeQ', '.EeeeeQ', '.eeeeQQ', '..QQQq']);
S.mapBadgeIce = lit(8, 8, ['', '.C.CC.c', '..CCCc', '.CCWCcc', '.CCccc', '..Cccc', '.c.cc.c']);
S.mapBadgeClaw = lit(8, 8, ['', '.T.T.T', '.J.J.Jv', '.JVJVJv', '.JVVVVv', '.JVVVvv', '..vvvv']);
S.mapBadgeRock = lit(8, 8, ['', '', '..IIIH', '.IIHHHh', '.IHHHhh', '.HHhhhh', '..hhhh']);
S.mapBadgeLock = lit(8, 8, ['', '..LLLS', '..L..D', '.YOOOOo', '.OOKKOo', '.OOOKOo', '.oooooo']);
S.mapBadgeFist = lit(8, 8, ['', '..WFFF', '.FFFFFf', '.FfFfFf', '.FFFFFf', '.fFFFff', '..ffff']);
S.mapBadgeCoin = lit(8, 8, ['', '..YYGg', '.YWYYGg', '.YYgYGg', '.YYgYGg', '.GYYGgg', '..Gggg']);

// ================================================================ RUN / BOSS UI (batch 3)
// ---------------------------------------------------------------- lethal pot (24x24)
{
  const g = grid(24, 24);
  coinHeap(g, 11.5, 12, 10.5, 8);
  // hellfire reflection: only the deep shadow side of the heap glows orange
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++)
    if (g[y][x] === 'g' && x + y * 0.6 >= 20) g[y][x] = 'o';
  // cursed iron pot, red-hot: rim + belly + clawed feet
  shape(g, 14, [[3, 20], [2, 21], [2, 21], [2, 21], [3, 20], [3, 20], [4, 19], [6, 17]], (x, y, has) =>
    (!has(x + 1, y) || !has(x, y + 1) || x >= 19 || y >= 20) ? 'v' : (!has(x - 1, y) || x <= 4) ? 'R' : 'r');
  hline(g, 1, 22, 12, 'O'); hline(g, 1, 22, 13, 'R');
  put(g, 1, 12, 'Y'); put(g, 2, 12, 'Y'); put(g, 22, 13, 'r'); put(g, 21, 13, 'r');
  put(g, 5, 15, 'O'); put(g, 4, 16, 'O');
  stamp(g, 8, 16, ['  r', ' rRr', 'rRKRr', ' rRr', '  r']); // glowing rune on the belly
  put(g, 10, 18, 'Y');
  // red-hot cracks glowing through the iron
  [[15, 15], [15, 16], [16, 17], [16, 18], [5, 18], [6, 19]].forEach(([x, y]) => put(g, x, y, 'O'));
  stamp(g, 5, 22, ['vr', ' r']); stamp(g, 17, 22, ['rv', 'r ']);
  // coins overflowing both sides and dripping down the belly
  stamp(g, 0, 11, ['YG', 'GgO']);
  stamp(g, 20, 10, ['YYG', 'GYYO']);
  stamp(g, 21, 14, ['YO', 'Go']);
  stamp(g, 22, 17, ['Y', 'o']);
  stamp(g, 0, 15, ['Y', 'O']);
  flatCoin(g, 19, 22);
  // skull-stamped coin crowning the heap (gold rim, blood-red face, bone skull)
  shape(g, 1, discSpans(11.5, 5.5, 5.2, 1, 10), (x, y, has) => {
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (rim) return x + y >= 18 ? 'g' : (x + y <= 13 ? 'Y' : 'G');
    return x + y >= 20 ? 'r' : 'R';
  });
  stamp(g, 9, 2, [
    ' TTTt',
    'TTTTTt',
    'TKKTKK',
    'TKKTKK',
    ' TTTt',
    ' TtTt',
  ]);
  put(g, 10, 2, 'W'); put(g, 9, 3, 'W');
  put(g, 8, 2, 'M'); // gloss on the red face
  // red sparks
  stamp(g, 1, 3, [' R ', 'RYR', ' R ']);
  stamp(g, 19, 1, [' O ', 'RWR', ' r ']);
  put(g, 4, 1, 'O'); put(g, 22, 6, 'R');
  outline(g);
  // menacing red glow: a dark-red halo hugging the outline above the rim
  for (let y = 0; y < 13; y++) for (let x = 0; x < 24; x++)
    if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(g, x + dx, y + dy) === 'K') &&
        !(x <= 5 && y <= 6) && !(x >= 18 && y <= 8)) g[y][x] = 'r';
  S.potTier4 = toRows(g);
}

// ---------------------------------------------------------------- elite badge / danger pip (8x8)
S.mapBadgeElite = lit(8, 8, ['', '.Y.YY.Y', '.YGRGGg', '.WTTTTt', '.TRTTRt', '..TTTt', '..TtTt']);
S.dangerPip = lit(8, 8, ['', '..WWWL', '.WWWWWL', '.WKWWKL', '.WWWWWL', '..WLWL']);

// ---------------------------------------------------------------- card: prepare (16x16)
{
  const g = grid(16, 16);
  // heater shield, symmetric about x=7
  const spans = [[1, 13], [1, 13], [1, 13], [1, 13], [1, 13], [1, 13], [1, 13], [1, 13], [2, 12], [3, 11], [4, 10], [5, 9], [6, 8], [7, 7]];
  shape(g, 1, spans, (x, y, has) => {
    const ring = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (ring) return (y === 1 || x === 1 || x + y <= 9) ? 'L' : (x >= 13 || x + y >= 19 ? 'D' : 'S');
    return x + y <= 7 ? 'A' : x + y >= 17 ? 'N' : 'U';
  });
  put(g, 2, 2, 'W'); put(g, 3, 2, 'W'); put(g, 2, 3, 'W');
  // red crosshair: ring + 4 ticks with a gap, centre dot
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
    if (Math.round(Math.hypot(x - 7, y - 7)) === 4) put(g, x, y, x + y >= 15 ? 'r' : 'R');
  [[7, 1], [7, 2], [7, 12], [7, 13], [1, 7], [2, 7], [12, 7], [13, 7]].forEach(([x, y]) => put(g, x, y, x + y >= 15 ? 'r' : 'R'));
  put(g, 7, 7, 'W');
  put(g, 5, 4, 'M'); // glint on the ring
  S.cardPrep = toRows(outline(g));
}

// ================================================================ WILDS + GILDED CELLS (batch 4)
// ---------------------------------------------------------------- wild: prismatic 5-point star (16x16)
{
  const g = grid(16, 16);
  const cx = 7.5, cy = 8.4, R = 7.9, r = 3.9;
  const verts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    verts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const [xi, yi] = verts[i], [xj, yj] = verts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  // arms clockwise from the top: yellow, green, cyan, purple, red (hi facet, lo facet)
  const hues = [['Y', 'G'], ['E', 'e'], ['C', 'c'], ['J', 'V'], ['R', 'r']];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - cx, dy = y - cy;
    if (!inside(x, y)) continue;
    const d = Math.hypot(dx, dy);
    let ang = Math.atan2(dy, dx) + Math.PI / 2; if (ang < 0) ang += 2 * Math.PI;
    const arm = Math.round(ang / (2 * Math.PI / 5)) % 5;
    const aa = -Math.PI / 2 + arm * 2 * Math.PI / 5, ax = Math.cos(aa), ay = Math.sin(aa);
    const side = dx * -ay + dy * ax;               // which half of the arm (facet)
    const litSide = (-ay * -1 + ax * -1) > 0 ? 1 : -1; // normal facing the top-left light
    const [hi, lo] = hues[arm];
    put(g, x, y, d < 1.3 ? 'W' : (side * litSide > 0 || Math.abs(side) < 0.3 ? hi : lo));
  }
  // bright core + gloss along the upper-left arm
  stamp(g, 6, 7, [' WW', 'WWWW', ' WW']);
  put(g, 7, 2, 'W'); put(g, 7, 3, 'W'); put(g, 2, 6, 'W'); put(g, 3, 6, 'W');
  // prismatic twinkles in the empty top corners (makes WILD pop on a busy reel)
  stamp(g, 1, 1, [' C', 'CWC', ' C']);
  stamp(g, 12, 1, [' M', 'MWM', ' M']);
  S.wild = toRows(outline(g));
}

// ---------------------------------------------------------------- enhancement overlays (16x16, no outline on the centre)
// gilded: gold frame + corner sparkles, centre fully transparent
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.min(x, y, 15 - x, 15 - y);
    const corner = Math.min(x, 15 - x) + Math.min(y, 15 - y);
    if (d === 0) put(g, x, y, 'g');
    else if (d === 1) put(g, x, y, (x === 1 || y === 1) && !(x === 14 || y === 14) ? 'Y' : 'G');
    else if (d === 2 && corner <= 5) put(g, x, y, 'g');
  }
  const sparkle = (x, y, big) => {
    put(g, x, y, 'W');
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(g, x + dx, y + dy, big ? 'W' : 'Y'));
    if (big) [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([dx, dy]) => put(g, x + dx, y + dy, 'Y'));
  };
  sparkle(2, 2, true); sparkle(13, 13, true); sparkle(13, 2, false); sparkle(2, 13, false);
  // tiny diamond studs mid-edge
  put(g, 7, 1, 'W'); put(g, 8, 1, 'W'); put(g, 1, 7, 'W'); put(g, 1, 8, 'W');
  S.enhGold = toRows(g);
}
// keen: bright cyan glint running up the blade diagonal (bottom-left -> top-right) ending in an arrowhead tip
{
  const g = grid(16, 16);
  // glint core on x+y=15, tapering A -> C -> W toward the middle; deep-cyan flank below-right for contrast
  for (let x = 2; x <= 12; x++) {
    const y = 15 - x, t = Math.min(x - 2, 12 - x);
    put(g, x, y, t === 0 ? 'A' : t <= 2 ? 'C' : 'W');
    if (t >= 1) put(g, x + 1, y, 'c');
  }
  // solid arrowhead in the top-right corner (hypotenuse from (10,1) to (14,5))
  stamp(g, 10, 1, [
    'ACCWW',
    ' CWWW',
    '  WWc',
    '   cc',
    '    A',
  ]);
  // tiny twinkle at the tail end
  put(g, 1, 14, 'A');
  S.enhKeen = toRows(g);
}
// charged: short crackling arcs tucked into the four corners only (centre untouched so the symbol reads)
{
  const g = grid(16, 16);
  const arcs = [
    // top-left: legs along both edges
    [[0, 0, 'W'], [1, 1, 'Y'], [2, 1, 'Y'], [3, 0, 'Y'], [4, 1, 'Y'], [5, 1, 'W'], [1, 2, 'Y'], [0, 3, 'Y'], [1, 4, 'Y'], [1, 5, 'W']],
    // top-right: runs down the right edge (the bolt / sword tip own the top edge here)
    [[15, 0, 'W'], [15, 1, 'Y'], [14, 2, 'Y'], [15, 3, 'Y'], [14, 4, 'Y'], [14, 5, 'W']],
    // bottom-left: runs up the left edge (the bolt's tail owns the bottom edge here)
    [[0, 15, 'W'], [1, 14, 'Y'], [0, 13, 'Y'], [1, 12, 'Y'], [0, 11, 'Y'], [1, 10, 'W']],
    // bottom-right: both legs, in the shadowed orange
    [[15, 15, 'W'], [14, 14, 'O'], [13, 14, 'O'], [12, 15, 'O'], [11, 14, 'O'], [10, 14, 'W'], [14, 13, 'O'], [15, 12, 'O'], [14, 11, 'O'], [14, 10, 'W']],
  ];
  arcs.flat().forEach(([x, y, c]) => put(g, x, y, c));
  // dark-orange drop shadow (down-right), only in the outer 3px ring so nothing reaches the middle
  const sh = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const ring = Math.min(x, y, 15 - x, 15 - y) <= 2;
    if (ring && g[y][x] === '.' && 'YWO'.includes(get(g, x - 1, y - 1))) sh.push([x, y]);
  }
  sh.forEach(([x, y]) => put(g, x, y, 'o'));
  S.enhCharged = toRows(g);
}
// spiked: steel spikes poking out of each edge and corner
{
  const g = grid(16, 16);
  const mask = new Set();
  const k = (x, y) => `${x},${y}`;
  const edge = [[7, 0], [8, 0], [7, 1], [8, 1], [6, 2], [7, 2], [8, 2], [9, 2]];
  const corner = [[0, 0], [1, 1], [2, 1], [1, 2], [2, 2], [3, 2], [2, 3], [3, 3]];
  const rot = ([x, y]) => [15 - y, x];
  for (const base of [edge, corner]) {
    let pts = base;
    for (let r = 0; r < 4; r++) { pts.forEach(([x, y]) => mask.add(k(x, y))); pts = pts.map(rot); }
  }
  const has = (x, y) => mask.has(k(x, y));
  for (const p of mask) { const [x, y] = p.split(',').map(Number); put(g, x, y, edgeShade('L', 'S', 'D')(x, y, has)); }
  // glints on the lit tips
  put(g, 7, 0, 'W'); put(g, 0, 7, 'W'); put(g, 0, 0, 'W'); put(g, 1, 1, 'L');
  S.enhSpiked = toRows(outline(g));
}

// ---------------------------------------------------------------- card: gild (16x16) — anvil, hammer, gold spark

// ================================================================ BUILD RELICS / GILD READABILITY / CASHIER (batch 5)
// ---------------------------------------------------------------- build relics (16x16)
// prism: glass triangle splitting a white ray (left) into a rainbow fan (right)
{
  const g = grid(16, 16);
  // rainbow fan first (the prism is painted over it)
  const bands = ['R', 'O', 'Y', 'E', 'A', 'V'];
  for (let x = 9; x <= 15; x++) {
    const t = x - 9, s = 0.75 + t * 0.2, cy = 8 + t * 0.35;
    for (let y = 0; y < 16; y++) {
      const i = Math.floor((y - cy) / s + 3);
      if (i >= 0 && i < 6) put(g, x, y, bands[i]);
    }
  }
  // incoming white ray
  hline(g, 0, 4, 8, 'W');
  const spans = [[7, 7], [6, 8], [6, 8], [5, 9], [5, 9], [4, 10], [4, 10], [3, 11], [3, 11], [2, 12], [2, 12]];
  shape(g, 2, spans, (x, y, has) => {
    if (y === 12) return 'c';
    if (!has(x - 1, y)) return 'W';
    if (!has(x + 1, y)) return 'c';
    return x + y <= 12 ? 'C' : 'A';
  });
  // the ray's path through the glass, bending up toward the exit face
  [[5, 8], [6, 8], [7, 8], [8, 7], [9, 7]].forEach(([x, y]) => put(g, x, y, 'W'));
  S.relicPrism = toRows(outline(g));
}
// hone: chunky blue whetstone slab on the diagonal (lit top face, dark side face), sharp white glint off its top end
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const sum = x + y, d = x - y;
    if (sum < 12 || sum > 17 || Math.abs(d) > 6) continue;
    const side = sum >= 16;
    let c = side ? 'N' : sum === 12 ? 'A' : 'U';
    if (!side && d === 6) c = 'A';        // lit end face
    if (side && d === -6) c = 'N';
    put(g, x, y, c);
  }
  [[4, 8], [5, 7], [6, 6]].forEach(([x, y]) => put(g, x, y, 'C'));        // gloss along the lit top edge
  [[5, 9], [8, 6], [7, 8], [10, 5]].forEach(([x, y]) => put(g, x, y, 'N')); // grain specks on the top face
  [[6, 10], [9, 7]].forEach(([x, y]) => put(g, x, y, 'A'));
  [[5, 11], [9, 8]].forEach(([x, y]) => put(g, x, y, 'U'));                 // speckle on the side face
  // sharp 4-point glint
  stamp(g, 11, 0, [
    '  W  ',
    '  W  ',
    'CWWWC',
    '  W  ',
    '  C  ',
  ]);
  S.relicHone = toRows(outline(g));
}

// ---------------------------------------------------------------- gild readability

// ---------------------------------------------------------------- cashier / shop
// skim (12x12): purple-gloved fist closing around a gold coin
S.potSkim = lit(12, 12, [
  '............',
  '...YYG......',
  '..YWYGg.....',
  '.YYGgGg.....',
  '.JVVVVVv....',
  '..vvJVVVVbbB',
  '.JVVVVVVVbBB',
  '..vvJVVVVbbB',
  '.JVVVVVv....',
  '.GYGgGgg....',
  '..Gggg......',
  '............',
]);
// chip (12x12): red casino chip, white edge inserts at N/E/S/W, inner groove ring, gold star centre
S.chip = lit(12, 12, [
  '............',
  '....RWWR....',
  '..RRRWWRRr..',
  '.RRrrrrrrrr.',
  '.RRrRYGRrrr.',
  '.WWrYWYGrtt.',
  '.WWrRYGRrtt.',
  '.RRrYRRgrrr.',
  '.RRrrrrrrrr.',
  '..Rrrttrrr..',
  '....rttr....',
]);
// cashier portrait (24x24): slick croupier — green eyeshade, pencil moustache, gold-tooth smirk, bow tie
// --- NPC portraits (24x24): Blood Bank, Pawn Shop, Loan Shark
S.npcBloodBank = lit(24, 24, [
  '........................',
  '........kkkkkkkk........',
  '.......kllkkkkkkk.......',
  '......kkllkkkkkkkk......',
  '......kkuuuuuuuukk......',
  '......uuuuuuuuuuuu......',
  '......uSSSSuuSSSSu......',
  '......uSWKSuuSWKSu......',
  '......uSSSSuuSSSSu......',
  '......uuuuuffuuuuu......',
  '.......LuuuffuuuL.......',
  '.......LKKTTTTKKL.......',
  '........LuuuuuuL........',
  '.........uuuuuu.........',
  '......TTTuuuuuuTTT......',
  '....TTTTTTTRRTTTTTTT....',
  '..LTTTTTTTTRRTTTTTTTTL..',
  '.LTTTTTTTTTRRTBBSSSBBTL.',
  '.LTTTTTTTTTRRTBWWWWWBTL.',
  'LTTTTTTTTTTTTTBWWRWWBTTL',
  'LTTTTTTTTTTTuuBWRRRWBTTL',
  'LTTTTTTTTTTTuuBWWRWWBTTL',
  'LTTTTTTTTTTTTTBWWWWWBTTL',
]);
S.npcPawnBroker = lit(24, 24, [
  '........................',
  '........................',
  '........FFFFFFFF........',
  '.......FTFFFFFFFf.......',
  '......FFFFFFFFFFFF......',
  '.....LLFFFFFFFFFFLL.....',
  '....LLSSSSFFFFSSSSLL....',
  '....LLSFFFFFGGGGFSLL....',
  '....LLSFWKFFGAKGFSLL....',
  '.....LSFFFFFGGGGFSL.....',
  '......FFFFFffFFFFF......',
  '......fFLLLLLLLLFf......',
  '.......fFFFFFFFFf.......',
  '........fFFFFFFf........',
  '.......TTfFFFFfTT.......',
  '....BBBBTTTTTTTTBBBB....',
  '...BBBBBBTTTTTTBBBBBB...',
  '..BBBBBBBBTTTTBBBBBBBB..',
  '.BBBBBBBBBBTTBBBBBBBBBB.',
  'bBBBBBBBBBBTTBBBBBBBBBBb',
  'bBBBBBBBBGgTTgGBBBBBBBBb',
  'bBBBBBBBBBGGGGBBBBBBBBBb',
  'bBBBBBBBBBGYYGBBBBBBBBBb',
  'bBBBBBBBBBBGGBBBBBBBBBBb',
]);
S.npcLoanShark = lit(24, 24, [
  '........................',
  '........kkkkkkkk........',
  '.......kllkkkkkkk.......',
  '.......rRRrrrrrrr.......',
  '....klllkkkkkkkkkkkk....',
  '......LLLSSSSSSSDD......',
  '.....LLSKWSSSSSKWSD.....',
  '.....LSDSSSSSSSSDSD.....',
  '.....LSSSSSDSSDSSSD.....',
  '.....KKKKKKKKKKKKKK.....',
  '.....KTTKTYTKTTKTTK.....',
  '.....KTrTrrTrTrrTrK.....',
  '......LSSSSSSSSSSD......',
  '.......LLLLLLLLLD.......',
  '.......DTTTRRTTTD.......',
  '....kklkklTRRTklkklk....',
  '...lkklkkPTRRTPlkklkk...',
  '..klkklkkPTRRTPlkklkkl..',
  '.kklkklkkPTRRTPlkklkklk.',
  'lkklkTTkkPTRRTPlkklkklkk',
  'lkklkTTkklPRRPklkklkklkk',
  'lkklkklkklPRRPklkklkklkk',
  'lkklkklkklPRRPklkklkklkk',
]);
S.cashierPortrait = lit(24, 24, [
  '........................',
  '........................',
  '.........UAAUUN.........',
  '.......UAUNNNNNNN.......',
  '......UUNNNNNNNNNN......',
  '.....UNNNNNNNNNNNNN.....',
  '....WWEEEEEEEEEEEEee....',
  '...EEeeeeeeeeeeeeeeeQ...',
  '..EeeeeeeeeeeeeeeeeeQQ..',
  '...qQQQQQQQQQQQQQQQQq...',
  '.....NNzzzzzzzzzzNN.....',
  '.....FNKKKKFFKKKKNf.....',
  '.....FFTTKfFFTTKfFf.....',
  '.....fFFFFFFfFFFFFf.....',
  '......FNFFFffFFFFN......',
  '......FFNNNFFNNKFf......',
  '......FFFKKKKYKFFf......',
  '.......FFFFFFFFff.......',
  '........TffffffT........',
  '...JVVVTMRTTTTRrTvvvv...',
  '..JVVVVTRRRrrRRrTvvvvv..',
  '.JVVVVVTRrTTTTRrTvvvvvv.',
  '.JVTMVVVVTTTTTTvvvvvvvv.',
  '.VVVVVVVVGTTTTGvvvvvvvv.',
]);

// ================================================================ ECONOMY UI / CABINETS / FULL SET (batch 6)
// ---------------------------------------------------------------- chip shield (12x12): chip stack + blue shield front-right
{
  const g = grid(12, 12);
  // stacked red chips: elliptical top face (white inserts at the rim), then striped edges split by dark seams
  stamp(g, 0, 1, [
    '..MRWRr..',
    '.MRrrrRr.',
    '.WRrrrRW.',
    '.MRRWRRr.',
    '.ddddddd.',
    '.WWRrWWr.',
    '.ddddddd.',
    '.WWRrWWr.',
    '.ddddddd.',
  ]);
  // shield overlapping the front-right, with its own dark rim so it separates from the stack
  stamp(g, 5, 5, [
    'KKKKKKK',
    'KWLLLSK',
    'KAAYUNK',
    'KUYYYNK',
    '.KUYNK.',
    '..KNK..',
    '...K...',
  ]);
  S.chipShield = toRows(outline(g));
}
// ---------------------------------------------------------------- build tag (20x7): green ribbon "FITS", notched right end
{
  const g = grid(20, 7);
  shape(g, 1, [[1, 18], [1, 17], [1, 16], [1, 17], [1, 18]], (x, y) => (y === 1 ? 'E' : y === 5 ? 'Q' : 'e'));
  put(g, 18, 1, 'e'); put(g, 18, 5, 'q');
  // 3x5 letters, bright top row
  const ink = [
    'WWW.W.WWW..WW',
    'W...W..W..W..',
    'WW..W..W...W.',
    'W...W..W....W',
    'W...W..W..WW.',
  ];
  ink.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === 'W') put(g, 3 + dx, 1 + dy, dy === 0 ? 'W' : 'T'); }));
  S.tagBuild = toRows(outline(g));
}
// ---------------------------------------------------------------- shop heal (16x16): white first-aid tin, red lid, red cross
S.shopHeal = lit(16, 16, [
  '................',
  '................',
  '......LLSD......',
  '.....L....D.....',
  '..MMMRRRRRRRRr..',
  '..MRRRRRRRRRrr..',
  '..rrrrrYGrrrrr..',
  '..WWTTTggTTTTI..',
  '..WTTTTRRTTTTI..',
  '..TTTTTRRTTTTI..',
  '..TTTRRRRRRtTI..',
  '..TTTRRrrrrtTI..',
  '..TTTTTRrtTTTI..',
  '..TTTTTRrtTTTI..',
  '..IIIIIIIIIIIH..',
]);
// ---------------------------------------------------------------- full set (16x16): bold gold star with an outlined white "3"
{
  const g = grid(16, 16);
  const cx = 7.5, cy = 8.6, R = 8.2, r = 4.3;
  const verts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R;
    verts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
      const [xi, yi] = verts[i], [xj, yj] = verts[j];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const mask = new Set();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (inside(x, y)) mask.add(`${x},${y}`);
  const has = (x, y) => mask.has(`${x},${y}`);
  for (const k of mask) {
    const [x, y] = k.split(',').map(Number);
    const lo = !has(x + 1, y) || !has(x, y + 1), hi = !has(x - 1, y) || !has(x, y - 1);
    put(g, x, y, lo ? (x + y >= 15 ? 'g' : 'G') : hi ? 'Y' : (x + y >= 17 ? 'G' : 'Y'));
  }
  put(g, 7, 1, 'W'); put(g, 7, 2, 'W'); put(g, 2, 6, 'W'); put(g, 3, 6, 'W');
  // "3" badge: white glyph with a dark rim
  stamp(g, 5, 5, [
    'KKKKK ',
    'KWWWKK',
    'KKKWWK',
    ' KWWWK',
    'KKKWWK',
    'KWWWKK',
    'KKKKK ',
  ]);
  S.setStar = toRows(outline(g));
}

// ---------------------------------------------------------------- cabinets (48x64): run-select slot machine portraits
/** Mini reel symbols (7x7, space = transparent); outlined into 9x9 reel cells. */
const MINI = {
  sword: [
    '      W',
    '     LS',
    '    LS ',
    ' Y LS  ',
    '  GS   ',
    ' B g   ',
    'G      ',
  ],
  shield: [
    'WLLLLLS',
    'LAAYUUS',
    'LYYYGGS',
    'LUUYNNS',
    ' SUYNS ',
    '  SGS  ',
    '   S   ',
  ],
  bolt: [
    '    WYO',
    '   WYO ',
    '  WYO  ',
    ' YYYYYO',
    '   YYo ',
    '  YOo  ',
    ' Yo    ',
  ],
  // Tuesday rework: THE BANKROLL's casino chip (id kept: goldbar) and BRIAR's thorn as mini reel symbols
  goldbar: [
    ' RMWRr ',
    'RMrrrRr',
    'WrRYRrW',
    'WrYWYrL',
    'RrRGRrr',
    'rRRLRRd',
    ' rTTrd ',
  ],
  thorn: [
    '     EE',
    '  W EeQ',
    '  EEeQ ',
    ' W EQ E',
    ' QEeQEQ',
    ' EeQ   ',
    'EQ     ',
  ],
  // THE JUKEBOX's beamed eighth notes (apricot / orange)
  note: [
    '  WaaaO',
    '  a   O',
    '  a   O',
    '  a WaO',
    'WaO aOo',
    'aOo  o ',
    ' o     ',
  ],
  spiky: [
    ' W L S ',
    ' LLLLS ',
    'LLAUNSD',
    ' LAUNS ',
    'SSUUNSD',
    '  SNS  ',
    '   D   ',
  ],
  wild: [
    '   Y   ',
    '  YWG  ',
    'RRRWEEe',
    ' RWWWe ',
    ' JJWCc ',
    ' JV Cc ',
    ' V   c ',
  ],
  what: [
    ' tttt ',
    'tt  tt',
    '    tt',
    '   tt ',
    '  tt  ',
    '      ',
    '  tt  ',
  ],
};
/** One step darker per colour (reel cylinder falloff for the half-visible symbols above/below the payline). */
const DARKER = { W: 'L', L: 'S', S: 'D', D: 'N', Y: 'G', G: 'g', g: 'b', O: 'o', o: 'r', a: 'O', A: 'U', U: 'N', N: 'v', B: 'b', b: 'K',
  E: 'e', e: 'Q', Q: 'q', q: 'K', C: 'c', c: 'N', R: 'r', r: 'd', d: 'K', J: 'V', V: 'v', v: 'K', M: 'm', m: 'r', T: 't', t: 'p', K: 'K' };
function miniCell(id) { const g = grid(9, 9); stamp(g, 1, 1, MINI[id]); return outline(g); }
/** Copy rows [r0..r1] of a 9x9 cell to (x0,y0) (transparent skipped), optionally darkened. */
function blitCell(g, cell, x0, y0, r0, r1, dark) {
  for (let r = r0; r <= r1; r++) cell[r].forEach((c, i) => { if (c !== '.') put(g, x0 + i, y0 + r - r0, dark ? (DARKER[c] || c) : c); });
}
/** Stamp with its own 1px K rim (so an emblem separates from what it overlaps). */
function stampRimmed(g, x0, y0, rows) {
  rows.forEach((r, dy) => [...r].forEach((c, dx) => {
    if (c === ' ') return;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ox, oy]) => {
      const rr = rows[dy + oy], cc = rr ? rr[dx + ox] : undefined;
      if (cc === undefined || cc === ' ') put(g, x0 + dx + ox, y0 + dy + oy, 'K');
    });
  }));
  stamp(g, x0, y0, rows);
}
const REEL_X = [8, 18, 28];
/**
 * Build a cabinet: marquee (y8..18) over a body (x4..40, y19..58) holding a 3-reel window (y20..40),
 * a button deck (y41..45), a belly panel (y46..51), a coin tray (y52..58) and a plinth (y59..62); lever on the right.
 * t.body = [hi, mid, lo, dk]; t.trim/rim/panel/knob = [hi, mid, lo]; t.reels = [above, middle, below] symbol ids per reel.
 */
function cabinet(t) {
  const g = grid(48, 64);
  const [bh, bm, bl, bd] = t.body, [th, tm, tl] = t.trim, [rh, rm, rl] = t.rim || t.trim, [ph, pm, pl] = t.panel;
  // body, lit from the left; the marquee overhang casts a shadow on the top row
  for (let y = 19; y <= 58; y++) for (let x = 4; x <= 40; x++) {
    let c = x === 4 ? bh : x >= 39 ? (x === 40 ? bd : bl) : bm;
    if (t.bodyFx) c = t.bodyFx(x, y, c);
    if (y === 19 && x > 4) c = bd;
    put(g, x, y, c);
  }
  // marquee: rounded frame with chase bulbs, recessed glowing panel
  for (let y = 8; y <= 18; y++) for (let x = 2; x <= 42; x++) {
    if ((x === 2 || x === 42) && (y === 8 || y === 18)) continue;
    const ring = x === 2 || x === 42 || y === 8 || y === 18;
    const inset = !ring && (x === 3 || x === 41 || y === 9 || y === 17);
    let c;
    if (ring) c = (y === 8 || x === 2) ? rh : (y === 18 || x === 42) ? rl : rm;
    else if (inset) c = (y === 9 || x === 3) ? 'K' : pl;
    else c = t.panelFx ? t.panelFx(x, y) : y === 10 ? ph : y === 16 ? pl : pm;
    put(g, x, y, c);
  }
  const [bOn, bOff] = t.bulbs;
  for (let x = 4, i = 0; x <= 40; x += 3, i++) { put(g, x, 8, i % 2 ? bOff : bOn); put(g, x, 18, i % 2 ? bOn : bOff); }
  for (const y of [11, 14]) { put(g, 2, y, bOn); put(g, 42, y, bOff); }
  // reel window: 2px bevelled frame, recessed dark reels, payline arrows
  for (let y = 20; y <= 40; y++) for (let x = 6; x <= 38; x++) {
    const outer = x === 6 || x === 38 || y === 20 || y === 40;
    const inner = !outer && (x === 7 || x === 37 || y === 21 || y === 39);
    if (outer) put(g, x, y, (y === 20 || x === 6) ? th : tl);
    else if (inner) put(g, x, y, (y === 21 || x === 7) ? 'K' : tm);
    else if (x === 17 || x === 27) put(g, x, y, 'K');
    else put(g, x, y, (y <= 23 || y >= 37) ? 'P' : 'p');
  }
  REEL_X.forEach((x0, i) => {
    const [a, m, b] = t.reels[i];
    if (a) blitCell(g, miniCell(a), x0, 22, 6, 8, true);
    if (m) blitCell(g, miniCell(m), x0, 26, 0, 8, false);
    if (b) blitCell(g, miniCell(b), x0, 36, 0, 2, true);
    if (t.cellFx) t.cellFx(g, x0, 26, i);
  });
  const [ah, am] = t.dead ? ['p', 'p'] : ['M', 'R'];
  put(g, 6, 29, am); put(g, 6, 30, am); put(g, 6, 31, am); put(g, 7, 30, ah);
  put(g, 38, 29, am); put(g, 38, 30, am); put(g, 38, 31, am); put(g, 37, 30, t.dead ? 'P' : 'r');
  // button deck: lit top lip, three buttons (big SPIN in the middle)
  for (let x = 3; x <= 41; x++) {
    put(g, x, 41, th);
    for (let y = 42; y <= 44; y++) put(g, x, y, x === 3 ? th : x >= 40 ? tl : tm);
    put(g, x, 45, tl);
  }
  if (!t.dead) {
    stamp(g, 9, 42, ['MR', 'Rr']);
    stamp(g, 18, 42, ['WYYYYYYG', 'YGGGGGGg']);
    stamp(g, 34, 42, ['AU', 'UN']);
  } else stamp(g, 18, 42, ['pppppppp', 'PPPPPPPP']);
  // belly panel
  for (let y = 46; y <= 51; y++) for (let x = 7; x <= 37; x++) {
    const edge = x === 7 || x === 37 || y === 46 || y === 51;
    put(g, x, y, edge ? ((y === 46 || x === 7) ? 'K' : bh) : (y === 47 ? ph : y === 50 ? pl : pm));
  }
  if (t.belly) t.belly(g);
  // coin tray: dark mouth, tray floor, rounded lip
  for (let x = 10; x <= 34; x++) { put(g, x, 52, 'K'); put(g, x, 53, 'K'); put(g, x, 54, 'P'); put(g, x, 55, tl); }
  for (let x = 8; x <= 36; x++) { put(g, x, 56, th); put(g, x, 57, x === 8 ? th : tm); put(g, x, 58, tl); }
  if (!t.dead) { put(g, 8, 56, 'W'); put(g, 9, 56, 'W'); }
  if (t.tray) t.tray(g);
  // plinth
  for (let x = 3; x <= 41; x++) for (let y = 59; y <= 62; y++) put(g, x, y, y === 59 || x === 3 ? bl : bd);
  // lever: pivot housing on the body side, steel shaft, glossy ball knob
  for (let y = 33; y <= 38; y++) for (let x = 41; x <= 44; x++) put(g, x, y, y === 33 ? th : y === 38 || x === 44 ? tl : tm);
  const [sh, sm] = t.shaft || ['L', 'S'];
  for (let y = 25; y <= 32; y++) { put(g, 43, y, sh); put(g, 44, y, sm); }
  const [kh, km, kl] = t.knob;
  for (let y = 20; y <= 25; y++) for (let x = 41; x <= 46; x++)
    if ((x - 43.5) ** 2 + (y - 22.5) ** 2 <= 7.3) put(g, x, y, x + y <= 64 ? kh : x + y >= 68 ? kl : km);
  if (!t.dead) put(g, 43, 21, 'W');
  if (t.deco) t.deco(g);
  outline(g);
  if (t.post) t.post(g);
  return toRows(g);
}
/** Hand-plotted pixels (no outline): list of [x, y, colour]. */
/** Draw into a fresh 48x64 layer, outline it, then lay it over g (keeps a K rim against what it covers). */
function layer(g, fn) {
  const h = grid(48, 64); fn(h); outline(h);
  h.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') put(g, x, y, c); }));
}
const plot = (g, pts) => pts.forEach(([x, y, c]) => put(g, x, y, c));

// knight: royal-blue body, steel trim, heraldic crest breaking the marquee top
S.cabinetKnight = cabinet({
  body: ['A', 'U', 'N', 'N'], trim: ['L', 'S', 'D'], panel: ['U', 'N', 'N'], bulbs: ['Y', 'g'], knob: ['M', 'R', 'r'],
  reels: [['sword', 'shield', 'sword'], ['shield', 'sword', 'shield'], ['sword', 'shield', 'sword']],
  belly(g) {
    stamp(g, 11, 47, [
      '   Y                  ',
      'GBBGWLLLLLLLLLLLLLLLLW',
      'gbbGSSSSSSSSSSSSSSSSD ',
      '   g                  ',
    ]);
  },
  deco(g) {
    stampRimmed(g, 17, 3, [
      'WLLLLLLLLLS',
      'LAAAAYUUUUS',
      'LAAAAYUUUUS',
      'LAAAAYUUUUS',
      'LYYYYYGGGGS',
      'LUUUUYNNNNS',
      'SUUUUYNNNND',
      ' SUUUYNNND ',
      '  SUUYNND  ',
      '   SUYND   ',
      '    SGD    ',
      '     D     ',
    ]);
  },
});

// bankroll: money-green pinstripe body, gold trim, a fan of banknotes behind a big red chip on the topper,
// a gold $ on the marquee, gold-framed chips on the reels, chips and coins spilling in the tray
S.cabinetMidas = cabinet({
  body: ['e', 'Q', 'q', 'q'], trim: ['Y', 'G', 'g'], rim: ['Y', 'G', 'g'], panel: ['Q', 'q', 'q'], bulbs: ['W', 'Y'], knob: ['M', 'R', 'r'],
  bodyFx: (x, y, c) => (c === 'Q' && x % 6 === 1 && y > 19 ? 'e' : c),
  panelFx: (x, y) => ((x + y) % 4 === 0 ? 'Q' : y <= 12 ? 'Q' : 'q'),
  reels: [['goldbar', 'goldbar', 'goldbar'], ['goldbar', 'goldbar', 'goldbar'], ['goldbar', 'goldbar', 'goldbar']],
  cellFx(g, x0, y0) {
    for (let y = y0 - 1; y <= y0 + 9; y++) for (let x = x0; x <= x0 + 8; x++) {
      if (x !== x0 && x !== x0 + 8 && y !== y0 - 1 && y !== y0 + 9) continue;
      put(g, x, y, (x === x0 || y === y0 - 1) ? 'Y' : 'g');
    }
    put(g, x0, y0 - 1, 'W'); put(g, x0 + 8, y0 + 9, 'G');
  },
  belly(g) {
    // a banded wad of cash across the belly
    for (let x = 9; x <= 35; x++) { put(g, x, 48, x % 3 ? 'X' : 'Z'); put(g, x, 49, x % 3 ? 'Z' : 'z'); }
    for (const x of [15, 22, 29]) { put(g, x, 48, 'Y'); put(g, x, 49, 'G'); put(g, x + 1, 48, 'G'); put(g, x + 1, 49, 'g'); }
  },
  tray(g) {
    stamp(g, 11, 53, [' MW ', 'MRRr', 'TrTr']);
    stamp(g, 17, 54, ['WYYG', 'GYGg']);
    stamp(g, 23, 53, [' MW  YG', 'MRRr YYg', 'TrTr Gg']);
    stamp(g, 32, 54, ['MW', 'Tr']);
  },
  deco(g) {
    // short chip stacks flanking the big chip: red / blue / red and blue / red
    const stack = (x0, y0, cols) => {
      const rows = [' RMWRr ', 'RRRWRRr'];
      cols.forEach((c) => rows.push(c === 'R' ? 'TrrTrrd' : 'AUUAUUN'));
      stampRimmed(g, x0, y0, rows);
    };
    stack(7, 2, ['R', 'U', 'R', 'U']);
    stack(31, 3, ['U', 'R', 'U']);
    stampRimmed(g, 16, 0, [
      '   RMWWRR   ',
      ' RMRRWWRRRr ',
      'RMrrrrrrrrRr',
      'WWrRRYYRRrWW',
      'WWrRYWYGRrLL',
      'MRrRRGgRRrrr',
      'rRRrrrrrrRRd',
      ' rTRRLLRRtd ',
      '   rTTrrt   ',
    ]);
    // gold $ on the marquee
    stampRimmed(g, 20, 10, [
      '  YG ',
      ' YWYGg',
      'YG    ',
      ' YYYG ',
      '    Gg',
      'gGGGg ',
      '  Gg  ',
    ].map((r) => r.padEnd(6)));
  },
});

// thorn: dark green wood, brambles wrapping the body, a rose on the marquee, spiked shields
{
  const vine = [];
  // left + right brambles snaking up the sides, one strand across the marquee
  for (let y = 57; y >= 20; y--) vine.push([5 + Math.round(1.2 * Math.sin(y / 2.6)), y], [39 - Math.round(1.2 * Math.sin(y / 2.6 + 1.5)), y]);
  for (let x = 3; x <= 41; x++) vine.push([x, 8 + Math.round(1.1 * Math.sin(x / 2.2))]);
  S.cabinetThorn = cabinet({
    body: ['Q', 'q', 'q', 'K'], trim: ['w', 'B', 'b'], panel: ['Q', 'q', 'q'], bulbs: ['E', 'Q'], knob: ['M', 'R', 'r'],
    bodyFx: (x, y, c) => (c === 'q' && (x * 7 + Math.floor(y / 5) * 3) % 11 === 0 ? 'Q' : c),
    reels: [['thorn', 'thorn', 'thorn'], ['thorn', 'thorn', 'thorn'], ['thorn', 'thorn', 'thorn']],
    deco(g) {
      vine.forEach(([x, y], i) => put(g, x, y, i % 5 === 0 ? 'E' : 'e'));
      vine.forEach(([x, y], i) => { if (i % 7 === 3) put(g, x + (x < 22 ? -1 : 1), y, 'T'); if (i % 9 === 6) put(g, x + (x < 22 ? 1 : -1), y - 1, 'E'); });
      stampRimmed(g, 17, 7, [
        '   rRRr   ',
        '  rRMMRr  ',
        ' rRMWMRRr ',
        ' RMRRrRRr ',
        ' rRRMRrRr ',
        '  rRRrrr  ',
        'EQ rrrr eE',
        'eEeQ  QeEQ',
        ' QQ Q  QQ ',
      ]);
      // bramble strand across the belly panel
      for (let x = 8; x <= 36; x++) {
        const y = 48 + Math.round(Math.sin(x / 1.9));
        put(g, x, y, x % 4 === 0 ? 'E' : 'e');
        if (x % 5 === 2) put(g, x, y - 1 - (y > 48 ? 0 : 0), 'T');
      }
    },
  });
}

// tesla: copper body, cyan trim, twin tesla coils sparking yellow, charged bolts
S.cabinetTesla = cabinet({
  body: ['a', 'O', 'o', 'r'], trim: ['C', 'c', 'N'], panel: ['c', 'N', 'N'], bulbs: ['Y', 'c'], knob: ['W', 'C', 'c'],
  reels: [['bolt', 'bolt', 'bolt'], ['bolt', 'bolt', 'bolt'], ['bolt', 'bolt', 'bolt']],
  cellFx(g, x0, y0) {
    plot(g, [[x0, y0, 'W'], [x0 + 1, y0, 'C'], [x0, y0 + 1, 'C'], [x0 + 8, y0 + 8, 'W'], [x0 + 7, y0 + 8, 'C'], [x0 + 8, y0 + 7, 'C']]);
  },
  belly(g) { for (let x = 9; x <= 35; x += 2) put(g, x, 48, x % 4 === 1 ? 'C' : 'c'); },
  deco(g) {
    for (const x0 of [3, 35]) stampRimmed(g, x0, 0, [
      '  CCc  ',
      ' CWCCc ',
      'CCCCccN',
      ' ccNNN ',
      ' aOOOo ',
      ' ooooo ',
      ' aOOOo ',
      'LLSSSSD',
    ]);
    blitCell(g, miniCell('bolt'), 18, 9, 0, 8, false);
  },
  post(g) {
    // arc jumping between the coil spheres
    plot(g, [[11, 2, 'Y'], [12, 1, 'W'], [13, 2, 'Y'], [14, 3, 'Y'], [15, 2, 'W'], [16, 1, 'Y'], [17, 1, 'Y'], [18, 2, 'W'],
      [19, 3, 'Y'], [20, 2, 'Y'], [21, 1, 'W'], [22, 1, 'Y'], [23, 2, 'Y'], [24, 3, 'W'], [25, 2, 'Y'], [26, 1, 'Y'], [27, 2, 'W'],
      [28, 3, 'Y'], [29, 2, 'Y'], [30, 1, 'W'], [31, 2, 'Y'], [32, 2, 'Y'], [33, 1, 'W'],
      [1, 5, 'Y'], [0, 6, 'W'], [44, 5, 'Y'], [45, 4, 'W'], [46, 6, 'Y']]);
  },
});

// joker: purple harlequin body, gold trim, jester hat with bells, rainbow wild stars
S.cabinetJoker = cabinet({
  body: ['J', 'V', 'v', 'K'], trim: ['Y', 'G', 'g'], panel: ['M', 'm', 'v'], bulbs: ['Y', 'M'], knob: ['Y', 'G', 'g'],
  bodyFx: (x, y, c) => {
    if (c !== 'V') return c;
    const u = Math.floor((x + y) / 4), v = Math.floor((x - y + 64) / 4);
    return (u + v) % 2 ? 'v' : 'V';
  },
  reels: [['wild', 'wild', 'wild'], ['wild', 'wild', 'wild'], ['wild', 'wild', 'wild']],
  belly(g) { for (let x = 9; x <= 35; x += 3) { put(g, x, 48, 'Y'); put(g, x + 1, 49, 'M'); } },
  panelFx: (x, y) => {
    const k = (((x - 1) % 6) + 6) % 6, inD = Math.abs(k - 2.5) / 3 + Math.abs(y - 13) / 3.6 <= 1;
    return inD ? (y <= 12 ? 'M' : 'm') : (y <= 12 ? 'V' : 'v');
  },
  belly(g) {
    for (let y = 47; y <= 50; y++) for (let x = 8; x <= 36; x++) {
      const k = (((x - 8) % 4) + 4) % 4, inD = Math.abs(k - 1.5) / 2 + Math.abs(y - 48.5) / 2 <= 1;
      put(g, x, y, inD ? (y <= 48 ? 'M' : 'm') : (y <= 48 ? 'V' : 'v'));
    }
  },
  deco(g) {
    // jester hat: three floppy horns (purple / pink / purple) on a gold band, a bell on each tip
    layer(g, (h) => {
      const horn = (p0, p1, p2, w0, cols) => {
        for (let i = 0; i <= 40; i++) {
          const t = i / 40, u = 1 - t;
          const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
          const r = w0 * (1 - t) + 0.6 * t;
          for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++)
            if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) put(h, xx, yy, cols[0]);
        }
      };
      horn([17, 7], [7, -4], [3, 5], 3.3, 'V');
      horn([27, 7], [37, -4], [41, 5], 3.3, 'V');
      horn([22, 7], [20, -3], [27, 1], 3.3, 'M');
      // shade each horn: lit top-left edge, dark bottom-right edge
      const src = h.map((r) => r.slice());
      for (let y = 0; y < 10; y++) for (let x = 0; x < 48; x++) {
        const c = src[y][x]; if (c === '.') continue;
        const e = (dx, dy) => (src[y + dy] || [])[x + dx] !== c;
        const [hi, lo] = c === 'V' ? ['J', 'v'] : ['W', 'm'];
        if (e(1, 0) || e(0, 1)) h[y][x] = lo; else if (e(-1, 0) || e(0, -1)) h[y][x] = c === 'M' ? 'M' : hi;
      }
      stamp(h, 12, 7, ['GYYYWYYYYYYYYWYYYYGg', 'gGGGGGGGGGGGGGGGGGgg']);
      stamp(h, 16, 7, ['M']); stamp(h, 22, 7, ['R']); stamp(h, 28, 7, ['M']);
      for (const [x, y] of [[3, 6], [41, 6], [28, 1]]) stamp(h, x - 1, y - 1, [' Y ', 'YWG', 'GGg']);
    });
  },
});

// locked: dark silhouette, dead bulbs, padlock on the marquee, question marks on the reels
S.cabinetLocked = cabinet({
  body: ['p', 'P', 'P', 'K'], trim: ['p', 'P', 'K'], panel: ['P', 'P', 'K'], bulbs: ['p', 'P'], knob: ['p', 'P', 'K'], shaft: ['p', 'P'],
  dead: true,
  reels: [[null, 'what', null], [null, 'what', null], [null, 'what', null]],
  deco(g) {
    stampRimmed(g, 17, 4, [
      '   SSSD   ',
      '  S   D   ',
      '  S   D   ',
      ' YYYYYYYo ',
      ' YOOOOOOo ',
      ' OOOKKOOo ',
      ' OOOKKOoo ',
      ' OOOOKOoo ',
      ' ooooooo  ',
    ]);
  },
});

// ================================================================ ACT 2 (batch 7)
/** Legendary sparkle: white core with white inner / gold outer arms (small: gold arms only). */
function legend(g, x, y, big = true) {
  put(g, x, y, 'W');
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(g, x + dx, y + dy, big ? 'W' : 'Y'));
  if (big) [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(([dx, dy]) => put(g, x + dx, y + dy, 'Y'));
}
/** Lit fuse spark centred at (x,y): white core, yellow cross, orange tail below. */
function fuseSpark(g, x, y) {
  put(g, x, y, 'W');
  [[1, 0], [-1, 0], [0, -1]].forEach(([dx, dy]) => put(g, x + dx, y + dy, 'Y'));
  put(g, x, y + 1, 'O');
}

// ---------------------------------------------------------------- act 2 enemy portraits (24x24)
// bomber: goblin sapper — leather cap, welding goggles pushed up, soot smudges, lit bomb held up by the face
{
  const g = grid(24, 24);
  shape(g, 0, [[7, 11], [5, 13], [3, 14], [2, 15], [2, 15]], edgeShade('a', 'O', 'o'));
  shape(g, 5, [[2, 14], [2, 14], [2, 14], [2, 14], [2, 14], [2, 14], [2, 14], [3, 13], [3, 13], [4, 12], [4, 12], [5, 11], [6, 10]], edgeShade('X', 'Z', 'z'));
  stamp(g, 0, 6, ['X', 'XX', 'XzZ', ' Xz', '  z']);   // long left ear
  stamp(g, 14, 5, ['  Z', ' Zz', 'Zzz']);                // right ear tip peeking over the bomb
  // goggles pushed up on the cap, strap round the sides
  stamp(g, 3, 2, ['YGGg  YGGg', 'GWAgbbGWAg', 'GAUgbbGAUg', 'gggg  gggg']);
  put(g, 2, 3, 'b'); put(g, 13, 3, 'b'); put(g, 14, 3, 'b'); put(g, 15, 3, 'b');
  // angry brows + big yellow eyes
  stamp(g, 3, 6, [
    'zz       zz',
    ' zzz   zzz ',
    ' WYK   KYY ',
    ' YOK   KOY ',
  ]);
  plot(g, [[8, 9, 'X'], [7, 10, 'X'], [8, 10, 'Z'], [9, 10, 'z'], [8, 11, 'z'], [9, 11, 'z']]); // hooked nose
  plot(g, [[3, 11, 'k'], [4, 11, 'l'], [4, 12, 'k'], [12, 10, 'k'], [12, 11, 'l'], [6, 5, 'l'], [7, 5, 'k']]); // soot
  stamp(g, 4, 12, ['K       K', ' KWKWWKK ', '  KrrrK  ']);  // snaggle grin
  // orange sapper vest over a sooty shirt, bandolier
  shape(g, 18, [[4, 12], [2, 15], [1, 17], [0, 18], [0, 18], [0, 18]], edgeShade('a', 'O', 'o'));
  stamp(g, 6, 18, ['kkkkk', ' kkk ', '  k  ']);
  for (let i = 0; i < 5; i++) { put(g, 2 + i, 19 + i, 'B'); put(g, 3 + i, 19 + i, 'b'); }
  // the bomb
  boulder(g, 18.5, 12.5, 5.3, 5.3, ['l', 'k', 'P']);
  plot(g, [[16, 9, 'W'], [15, 10, 'W'], [17, 9, 'L'], [15, 11, 'L'], [21, 10, 'o']]);
  stamp(g, 18, 6, ['LSD', 'SDD']);
  plot(g, [[19, 5, 'w'], [20, 4, 'B'], [20, 3, 'w'], [21, 2, 'B']]);
  // green hand cupping the bomb from below (thumb up its left side, fingertips curling over the right)
  stamp(g, 13, 15, [
    '        Xz',
    ' X      Zz',
    ' XZ   KXZz',
    '  XZZZZZZz',
    '   zZZZzz ',
    '    aOo   ',
    '   aOOo   ',
  ]);
  outline(g);
  fuseSpark(g, 22, 1); put(g, 20, 0, 'O'); put(g, 23, 3, 'Y');
  S.enemyBomber = toRows(g);
}
// hexer: hex witch — deep teal hood, green face in shadow, glowing magenta eyes, floating sigil
{
  const g = grid(24, 24);
  const hood = [[9, 10], [8, 11], [7, 12], [6, 13], [5, 14], [4, 15], [4, 15], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16], [3, 16],
    [2, 17], [2, 17], [1, 18], [0, 19], [0, 19], [0, 19], [0, 19], [0, 19], [0, 19]];
  shape(g, 0, hood, (x, y, has) => (!has(x + 1, y) || x - y * 0.25 >= 12) ? 'n' : (!has(x - 1, y) || !has(x, y - 1)) ? 'i' : 'j');
  shape(g, 5, [[8, 11], [7, 12], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [6, 13], [7, 12], [8, 11]], (x, y) => (y <= 6 ? 'K' : 'n'));
  shape(g, 9, [[7, 12], [7, 12], [7, 12], [8, 11], [8, 11], [9, 10]], edgeShade('X', 'Z', 'z'));
  plot(g, [[7, 7, 'x'], [8, 7, 'W'], [11, 7, 'W'], [12, 7, 'x'], [7, 8, 's'], [8, 8, 'x'], [11, 8, 'x'], [12, 8, 's']]); // glowing eyes
  plot(g, [[10, 10, 'Z'], [11, 11, 'z'], [8, 11, 'E'], [9, 12, 'K'], [10, 12, 'K'], [8, 12, 'z'], [11, 12, 'z']]); // hooked nose, wart, thin mouth
  plot(g, [[6, 9, 'I'], [6, 10, 'H'], [6, 11, 'I'], [6, 12, 'H'], [13, 10, 'H'], [13, 11, 'h'], [13, 12, 'H']]); // grey hair wisps
  plot(g, [[9, 16, 'x'], [10, 16, 's'], [9, 17, 's'], [10, 17, 'x'], [9, 15, 'W']]); // clasp
  for (let y = 19; y <= 23; y++) { put(g, 5, y, 'n'); put(g, 14, y, 'n'); }
  // floating sigil: magenta ring, teal diamond core
  for (let y = 0; y < 24; y++) for (let x = 17; x < 24; x++) {
    const d = Math.hypot(x - 20.5, y - 8.5);
    if (d >= 2.4 && d <= 3.4) put(g, x, y, x + y <= 27 ? 'M' : x + y >= 31 ? 's' : 'x');
  }
  plot(g, [[20, 7, 'i'], [21, 8, 'i'], [20, 9, 'j'], [19, 8, 'i'], [20, 8, 'W'], [21, 9, 'j']]);
  // bony green hand raised from the robe, conjuring the sigil
  stamp(g, 17, 13, ['X X', 'XZX', ' Zz', ' zz']);
  put(g, 19, 12, 'X');
  outline(g);
  plot(g, [[20, 12, 's'], [19, 11, 'x']]); // spell thread
  plot(g, [[17, 3, 'x'], [22, 14, 'M'], [18, 13, 's'], [23, 4, 'M']]);
  S.enemyHexer = toRows(g);
}
// vampire: pale noble — slicked black hair + widow's peak, red eyes, fangs, high red-lined cape collar
S.enemyVampire = lit(24, 24, [
  '........................',
  '.........kllkkk.........',
  '.......kllkkkkkk........',
  '......klkkkkkkkkkP......',
  '.k....lkkkkkkkkkkP....k.',
  '.kM...lkTTkkkkTukP...rk.',
  '.kMR..lTTTTkkTTTuP..rrk.',
  '.kMRR.kTkkTTTTkkuP.rrrk.',
  '.kMRRdkTTTkTTkTTuPdrrrk.',
  '.kMRRdkTkRRTTRRkuPdrrrk.',
  '.kMRRRdTTttTTttTudrrrrk.',
  '.kMRRRdTTTTTuTTTudrrrrk.',
  '.kMRRRRdTTTuuTKudrrrrrk.',
  '.kMRRRRdTuKKKKuudrrrrrk.',
  '.kMRRRRduuWuuWuudrrrrrk.',
  '.kMRRRRRdtWuuWtdrrrrrrk.',
  '.kMRRRRRRdtuutdrrrrrrrk.',
  '.kMRRRRRRRdttdrrrrrrrrk.',
  '.kMRRRRRRkWTTTtkrrrrrrk.',
  'kkMRRRRRkkTTRrtkkrrrrrkk',
  'kMRRRRRkkkTTTttkkkrrrrrk',
  'kMRRRRkkkkkTTtkkkkkrrrrk',
  'kMRRRkkkkkkkTtkkkkkkrrrk',
  'kMRRkkkkkkkkktkkkkkkkrrk',
]);
// mimic: treasure chest monster — lid open as a toothy mouth, long tongue, one eye in the keyhole
{
  const g = grid(24, 24);
  stamp(g, 0, 1, [
    '   YGwwwwwwwwwwwwwwGg   ',
    '  YGBBBBBBBBBBBBBBBBGg  ',
    '  YGbBBBBBbBBBBBbBBBGg  ',
    ' YYGGGGGGGGGGGGGGGGGGgg ',
  ]);
  for (let y = 5; y <= 10; y++) for (let x = 2; x <= 21; x++) put(g, x, y, y <= 6 ? 'K' : y <= 8 ? 'd' : 'r');
  for (let t = 0; t < 5; t++) { const x = 2 + t * 4; stamp(g, x, 5, ['WTt', ' Tt', ' T']); }
  for (let t = 0; t < 4; t++) { const x = 4 + t * 4; stamp(g, x, 8, [' T', 'WTt', 'WTt']); }
  hline(g, 1, 22, 11, 'G'); put(g, 1, 11, 'Y'); put(g, 2, 11, 'Y'); put(g, 22, 11, 'g');
  for (let y = 12; y <= 21; y++) for (let x = 1; x <= 22; x++) {
    let c = y === 12 ? 'w' : (y === 16 || y === 21) ? 'b' : 'B';
    if (x === 1 && y !== 21) c = 'w';
    if (x >= 21) c = 'b';
    put(g, x, y, c);
  }
  hline(g, 1, 22, 22, 'b');
  for (let y = 11; y <= 22; y++) { put(g, 3, y, 'Y'); put(g, 4, y, 'G'); put(g, 19, y, 'G'); put(g, 20, y, 'g'); }
  plot(g, [[3, 13, 'W'], [3, 19, 'W'], [19, 13, 'Y'], [19, 19, 'Y']]);
  stamp(g, 9, 13, [
    ' YGGg ',
    'YGGGGg',
    'GWTTtg',
    'GTRKtg',
    'GtTTtg',
    'GGKKGg',
    'gGKKgg',
    ' gggg ',
  ]);
  // long tongue lolling out over the rim and down the front
  const tongue = [[9, 8, 'MRRRr'], [8, 9, 'MRRr'], [7, 10, 'MRRr'], [6, 11, 'MRRr'], [5, 12, 'MRRr'], [5, 13, 'MRr'], [5, 14, 'MRr'], [5, 15, 'MRr'], [5, 16, 'RRr'], [5, 17, 'rRr'], [6, 18, 'r']];
  tongue.forEach(([x, y, s]) => [...s].forEach((c, i) => put(g, x + i, y, c)));
  S.enemyMimic = toRows(outline(g));
}
// wheel: ACT 2 BOSS, THE WHEEL — a croupier in green velvet under a green visor, auburn bob, red lips, a little
// roulette-wheel brooch, holding the ivory ball up between finger and thumb
S.enemyWheel = lit(24, 24, [
  '........................',
  '......booooob...........',
  '....booOOOOooob.....TTT.',
  '...boOOOooooooob...TWWTt',
  '...njiiiiiiiiijn...TWTTt',
  '..iiiiiiiiiiiiijjn.TTTtt',
  '...nnnnnnnnnnnnn..FtttF.',
  '...ooffffffffoob..FFFFf.',
  '...ooFWKFFWKFfob..FFFff.',
  '...ooFFFFfFFFfob...fFf..',
  '...ooFFFFfFFFfob...TTt..',
  '...ooFFRRRRrFfob..qeQQq.',
  '...bofFFFFFFffbb..qeQq..',
  '....bbfFFFFffbb..qeQQq..',
  '.......fFFFf.....qeQq...',
  '.....qeTTTTtqq..qeQQq...',
  '..qeeeqTTTTtqQQqeQQq....',
  '.qeeQQQqTTtqQQQQQQq.....',
  'qeGYGQQQqTtqQQQQQQq.....',
  'qeYkYQQQQqTqQQQQQQqq....',
  'qeGYgQQQQqqqQQQQQQqq....',
  'qeQQQQQQQQqQQQQQQQqq....',
  'qeQQQQQQQQqQQQQQQqqq....',
  'qeQQQQQQQQqQQQQQQqqq....',
]);

// ---------------------------------------------------------------- act 2 enemy reel symbols (16x16)
// bomb: round charcoal bomb, steel collar, lit sparking fuse
{
  const g = grid(16, 16);
  boulder(g, 7, 9, 5.5, 5.5, ['l', 'k', 'P']);
  plot(g, [[4, 6, 'W'], [5, 5, 'W'], [4, 7, 'L'], [6, 5, 'L'], [11, 7, 'o']]);
  stamp(g, 10, 3, ['LS', 'SD']);
  plot(g, [[12, 2, 'w'], [12, 1, 'B']]);
  outline(g);
  fuseSpark(g, 14, 1); put(g, 15, 3, 'O'); put(g, 12, 0, 'Y');
  S.bomb = toRows(g);
}
// hex: magenta sigil ring, teal glowing eye inside, runes on the ring
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.hypot(x - 7.5, y - 7.5);
    if (d >= 5.9 && d <= 7.4) put(g, x, y, x + y <= 11 ? 'M' : x + y >= 19 ? 's' : 'x');
  }
  plot(g, [[7, 1, 'i'], [8, 1, 'W'], [1, 7, 'W'], [1, 8, 'i'], [14, 7, 'i'], [14, 8, 'j'], [7, 14, 'j'], [8, 14, 'i']]);
  stamp(g, 3, 5, [
    '   jjjj   ',
    ' jjiiiijj ',
    'jiiixxiiij',
    'jiixWKxiij',
    ' jjixxijj ',
    '   jjjj   ',
  ]);
  S.hex = toRows(outline(g));
}
// fangs: red gum, two long fangs, a drop of blood falling from the right one
S.fangs = lit(16, 16, [
  '................',
  '...MRRRRRRRRr...',
  '..MRRRRRRRRRRr..',
  '.MRRrrrrrrrrRRr.',
  '.rWTTtTtTtWTTtr.',
  '..WTTt....WTTt..',
  '...WTt....WTt...',
  '...WTt....WTr...',
  '....Tt.....Tr...',
  '....T......T....',
  '....t......R....',
  '................',
  '...........R....',
  '..........MRr...',
  '..........Rrr...',
]);
// mimicSym: tiny chest, lid cracked open on a row of teeth, eye in the keyhole
S.mimicSym = lit(16, 16, [
  '................',
  '....wwwwwwww....',
  '..YGwwwwwwwwGg..',
  '..YGBBBBBBBBGg..',
  '.YYGGGGGGGGGGgg.',
  '..WTdWTdWTdWTd..',
  '..WRRWddWddWdd..',
  '..dWTdWTdWTdWT..',
  '.YYGGGGGGGGGGgg.',
  '.YGwwwYGGgwwwGg.',
  '.YGBBBGTRgBBBGg.',
  '.YGBBBGKKgBBBGg.',
  '.YGbbbggggbbbGg.',
  '.GgBBBBBBBBBBgg.',
  '.gggbbbbbbbbggg.',
]);

// ---------------------------------------------------------------- act 2 cell overlays (16x16, centre untouched)
// bombOverlay: big round black bomb (~60% of the cell), centred right/down, lit fuse top-right.
// The top-left 6x6 stays fully transparent: the fuse-number badge is drawn there in code.
{
  const g = grid(16, 16);
  const cx = 9.5, cy = 9.5, r = 4.75;
  shape(g, 5, discSpans(cx, cy, r, 5, 14), (x, y) => {
    const nx = (x - cx) / r, ny = (y - cy) / r;
    return nx + ny < -0.7 ? 'l' : nx + ny > 0.6 || ny > 0.75 ? 'P' : 'k';
  });
  plot(g, [[7, 7, 'W'], [6, 8, 'W'], [8, 7, 'L'], [6, 9, 'L']]);                  // gloss
  plot(g, [[12, 5, 'L'], [13, 5, 'S'], [13, 6, 'D'], [12, 6, 'S']]);              // steel collar
  plot(g, [[13, 4, 'w'], [14, 3, 'B']]);                                          // fuse
  plot(g, [[14, 2, 'O'], [14, 1, 'W'], [13, 1, 'Y'], [15, 1, 'Y'], [14, 0, 'Y']]); // spark
  outline(g);
  plot(g, [[12, 0, 'Y'], [15, 3, 'O']]);                                          // flying embers
  S.bombOverlay = toRows(g);
}
// tier2Frame: tier II gild marker — gold/violet corner brackets + a 2-pip "II" mark bottom-centre, centre clear
{
  const g = grid(16, 16);
  const arm = 4;
  const rot = ([x, y]) => [15 - y, x];
  // top-left bracket authored once (outer stroke gold, inner stroke violet), then rotated to all corners
  let pts = [];
  for (let i = 1; i <= arm; i++) {
    pts.push([i, 1, i === 1 ? 'W' : 'Y'], [1, i, i === 1 ? 'W' : 'Y']);
    if (i >= 2) pts.push([i, 2, 'V'], [2, i, 'V']);
  }
  pts.push([2, 2, 'J']);
  const shades = [['Y', 'V', 'J', 'W'], ['G', 'V', 'J', 'Y'], ['G', 'v', 'V', 'G'], ['Y', 'V', 'J', 'Y']];
  for (let r = 0; r < 4; r++) {
    const [gold, vio, vioHi, tip] = shades[r];
    pts.forEach(([x, y, c]) => put(g, x, y, c === 'W' ? tip : c === 'Y' ? gold : c === 'V' ? vio : vioHi));
    pts = pts.map(([x, y, c]) => [...rot([x, y]), c]);
  }
  // "II" pips, bottom centre
  plot(g, [[6, 13, 'Y'], [6, 14, 'G'], [9, 13, 'Y'], [9, 14, 'G']]);
  S.tier2Frame = toRows(outline(g));
}
// hexOverlay: thin magenta rune ring round the cell edge, a glyph plate in each corner
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const d = Math.min(x, y, 15 - x, 15 - y);
    if (d === 0) put(g, x, y, 's');
    else if (d === 1) put(g, x, y, (x === 1 || y === 1) && x + y < 28 ? 'x' : 's');
  }
  const glyphs = [['xWx', 'W.W', 'xWx'], ['WWW', '.x.', '.W.'], ['.W.', 'WxW', '.W.'], ['W..', 'xWx', '..W']];
  [[0, 0], [11, 0], [0, 11], [11, 11]].forEach(([x0, y0], i) => {
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) put(g, x0 + x, y0 + y, (x === 0 || y === 0 || x === 4 || y === 4) ? 'K' : 's');
    stamp(g, x0 + 1, y0 + 1, glyphs[i].map((r) => r.replace(/\./g, ' ')));
  });
  // rune ticks mid-edge
  plot(g, [[7, 1, 'W'], [8, 1, 'M'], [1, 7, 'W'], [1, 8, 'M'], [7, 14, 'M'], [8, 14, 'x'], [14, 7, 'M'], [14, 8, 'x']]);
  S.hexOverlay = toRows(g);
}

// ---------------------------------------------------------------- act 2 upgrade overlays (16x16)
// vamp: blood dripping from the top edge, tiny heart in the bottom-right corner
{
  const g = grid(16, 16);
  hline(g, 0, 15, 0, 'R');
  const drips = [[1, 2], [2, 3], [5, 1], [8, 4], [9, 2], [12, 1], [14, 3]];
  drips.forEach(([x, len]) => { for (let y = 1; y <= len; y++) put(g, x, y, 'R'); put(g, x, len + 1, 'r'); });
  plot(g, [[2, 0, 'M'], [3, 0, 'M'], [8, 1, 'M']]);
  stamp(g, 10, 11, ['MR Rr', 'RRRrr', ' Rrr ', '  r  ']);
  put(g, 10, 11, 'W');
  S.enhVamp = toRows(outline(g));
}
// lucky: four-leaf clover in the top-left, green + gold sparkles
{
  const g = grid(16, 16);
  stamp(g, 0, 0, [
    ' EE Ee ',
    'EWEeeeQ',
    'EEeQeQQ',
    ' eQqQQ ',
    'EeeQeeQ',
    'EeQQQQQ',
    ' QQ QQ ',
  ]);
  plot(g, [[6, 6, 'Q'], [7, 7, 'Q'], [7, 8, 'q']]);
  outline(g);
  legend(g, 13, 2, false); plot(g, [[12, 2, 'E'], [14, 2, 'E'], [13, 1, 'E'], [13, 3, 'E']]);
  legend(g, 2, 13, false);
  plot(g, [[13, 13, 'W'], [12, 13, 'E'], [14, 13, 'E'], [13, 12, 'E'], [13, 14, 'E']]);
  S.enhLucky = toRows(g);
}
// blaze: flames licking up the bottom edge
{
  const g = grid(16, 16);
  const heights = [3, 5, 4, 2, 3, 6, 4, 3, 2, 4, 5, 3, 2, 4, 6, 3];
  heights.forEach((h, x) => {
    for (let i = 0; i < h; i++) {
      const y = 15 - i;
      put(g, x, y, i >= h - 1 ? 'o' : i >= h - 2 ? 'O' : i <= 1 && h >= 4 ? 'Y' : 'O');
    }
  });
  plot(g, [[5, 14, 'W'], [14, 14, 'W'], [10, 15, 'W'], [1, 15, 'Y'], [2, 14, 'Y']]);
  S.enhBlaze = toRows(outline(g));
}

// thorny (BRIAR's own charm): a rose bramble curling up the left side and along the bottom, pink thorns pointing out
// (rose, not green: it sits on BRIAR's green thorn)
{
  const g = grid(16, 16);
  // The vine: up the left edge, then along the bottom, a little wobble.
  const vine = [[1, 3], [1, 4], [2, 5], [1, 6], [1, 7], [2, 8], [1, 9], [1, 10], [2, 11], [2, 12], [3, 13], [4, 14], [5, 14], [6, 13], [7, 14], [8, 14], [9, 13], [10, 14], [11, 14], [12, 13], [13, 14], [14, 14]];
  vine.forEach(([x, y], i) => put(g, x, y, i % 3 === 0 ? 'm' : 'd'));
  // Thorns: a pale tip on a darker base, pointing away from the vine.
  const thorns = [[0, 4, 'M'], [3, 6, 'M'], [0, 8, 'M'], [3, 10, 'M'], [1, 13, 'M'], [5, 15, 'M'], [6, 12, 'M'], [9, 15, 'M'], [10, 12, 'M'], [13, 15, 'M'], [15, 13, 'M']];
  plot(g, thorns);
  // A curled tip at the top of the vine and a leaf at its end.
  // A rosebud at the top of the vine.
  plot(g, [[1, 1, 'R'], [2, 1, 'M'], [1, 2, 'r'], [2, 2, 'R'], [3, 2, 'm'], [14, 13, 'm'], [15, 14, 'd']]);
  S.enhThorny = toRows(outline(g));
}

// lucre (chip charm): real casino chips (user: "it's not even chips"). Black high-roller chips with gold edge spots,
// so they read on CASSIDY's red chips and on blue shields alike: one tumbling top-right, a short stack bottom-left.
{
  const g = grid(16, 16);
  // The loose chip, face on: black rim with gold edge spots, a gold center.
  stamp(g, 10, 0, [
    ' pYYp ',
    'pkppkp',
    'YpGGpY',
    'YpGYpY',
    'pkppkp',
    ' pYYp ',
  ]);
  // The stack, side on: chip edges striped black and gold, a lit top face.
  stamp(g, 0, 8, [
    ' pGGp ',
    'pYppYp',
    'kkkkkk',
    'ppYYpp',
    'kkkkkk',
    'pYppYp',
    'kkkkkk',
  ]);
  outline(g);
  S.enhLucre = toRows(g);
}
// trick (JOKER's charm): a jester's bell-cap tip curling in from the top-left, a card corner with a pink pip bottom-right
{
  const g = grid(16, 16);
  stamp(g, 0, 0, [
    'MMVV   ',
    'mMVVJ  ',
    ' mmVVM ',
    '   vVMm',
    '    vmY',
    '     YWY',
    '     GYG',
    '      g',
  ]);
  stamp(g, 11, 11, [
    'WTTTT',
    'TVMTT',
    'TMMMT',
    'TTMTt',
    'Tttt ',
  ]);
  S.enhTrick = toRows(outline(g));
}
// ingot (MIDAS's charm, sits on a GOLD bar): silver mint sparkle top-left, a stamped silver seal bottom-right,
// a tiny silver bar bottom-left. Cool greys so it reads against the gold underneath.
{
  const g = grid(16, 16);
  plot(g, [[2, 2, 'W'], [1, 2, 'C'], [3, 2, 'C'], [2, 1, 'C'], [2, 3, 'C'], [0, 2, 'L'], [4, 2, 'L'], [2, 0, 'L'], [2, 4, 'L']]);
  stamp(g, 10, 10, [
    ' LLLS ',
    'LWLDLS',
    'LLDDDS',
    'LLLDSS',
    'LLLSSD',
    ' SSDD ',
  ]);
  stamp(g, 0, 13, [
    ' LWL ',
    'LLLLS',
    'SSSSD',
  ]);
  S.enhIngot = toRows(outline(g));
}

// ---------------------------------------------------------------- legendary relics (16x16)
S.relicTicket = lit(16, 16, [
  '................',
  '................',
  '................',
  '..WYYYYYYYYYYg..',
  '.YYGGGGGGGGgYGg.',
  '.YGgggggggggYGg.',
  '..YGGRRGGGGgGg..',
  '..YGRWRrGGGgGg..',
  '..YGGRrGGGGgGg..',
  '.YGgggggggggYGg.',
  '.YGGGGGGGGGGgGg.',
  '..ggggggggggggg.',
]);
S.relicBell = lit(16, 16, [
  '................',
  '.......RR.......',
  '......RMRr......',
  '.......YG.......',
  '......YGGg......',
  '.....YWGGGg.....',
  '....YWYGGGgg....',
  '....YYGGGGgg....',
  '....YGGGGGgg....',
  '...YYGGGGGGgg...',
  '..YYGGGGGGGGgg..',
  '.YWYYYYYYYYYYGg.',
  '.gggggggggggggg.',
  '.......SD.......',
  '.......DD.......',
]);
S.relicPhoenix = lit(16, 16, [
  '..............Y.',
  '...........YOYW.',
  '..........YOOYY.',
  '.........ROYYO..',
  '........RROYO...',
  '.......RRROYO...',
  '......rRRROO....',
  '.....rrRRROo....',
  '....rrRRRRo.....',
  '...rrRRRRo......',
  '...rRRROo.......',
  '....RRoo........',
  '...Tt...........',
  '..Tt............',
  '.Tt.............',
]);
S.relicOvercharge = lit(16, 16, [
  '..Y.....W....Y..',
  '...YW..YY...W...',
  '....Y.YWY..Y....',
  '......LLSD......',
  '....WLLLLLLS....',
  '....LSDDDDDN....',
  '..YYLSYYYYDNYY..',
  '...WLSYWYYDNY...',
  '....LSYYYYDN....',
  '....LSYYYYDN....',
  '..YYLSYYYYDN....',
  '....LSYYYYDNYY..',
  '....YYYYYYOO....',
  '....YWYYYYOo....',
  '....OOOOOOoo....',
]);
S.relicKey = lit(16, 16, [
  '................',
  '..YYYGg.........',
  '.YWGGGGg........',
  '.YGgRgGg........',
  '.YGRWRGg........',
  '.YGgRgGg........',
  '..GGGGg.........',
  '....YGg.........',
  '.....YGg........',
  '......YGg.......',
  '.......YGg......',
  '........YGgGg...',
  '.........YGgg...',
  '..........YGGg..',
  '...........Ggg..',
]);
S.relicSandglass = lit(16, 16, [
  '................',
  '..YWYYYYYYYYYg..',
  '..ggggRRgggggg..',
  '...Y.CCCCCC.g...',
  '...G.CYWYYC.g...',
  '...Y..CYYC..g...',
  '...G...CO...g...',
  '...Y...W....g...',
  '...G...CY...g...',
  '...Y..C.YC..g...',
  '...G.C.WYYC.g...',
  '...Y.CYYYOC.g...',
  '..YWYYYYYYYYYg..',
  '..ggggggggggggg.',
]);

// ---------------------------------------------------------------- act 2 intent icons (8x8)
S.icoBomb = lit(8, 8, ['', '.....YW', '....B', '..llkk', '.lWkkkP', '.lkkkPP', '..kPPP']);
S.icoHex = lit(8, 8, ['', '..xxxx', '.xjiijs', '.xiWKis', '.xjiijs', '..ssss']);
S.icoDrain = lit(8, 8, ['', '...R', '..MRr', '.MRRRr', '.RWRRr', '.RRRrr', '..rrr']);
S.icoGulp = lit(8, 8, ['', '..MWR..R', '.MRrR', '.WrYr', '.RrYrRr', '.RRrrrr', '..rWWr']);
// icoBets: THE WHEEL's NO MORE BETS (a little stack of red chips)
S.icoBets = lit(8, 8, ['', '.MRRRRr', '.WRWRWr', '.dddddd', '.MRRRRr', '.WRWRWr', '.dddddd']);

// ---------------------------------------------------------------- act 2 map badges (8x8)
S.mapBadgeBomb = lit(8, 8, ['', '....YW', '...B', '..lkkk', '.lWkkkP', '.lkkkPP', '..kPPP']);
S.mapBadgeHex = lit(8, 8, ['', '..Mxxs', '.Mx..xs', '.x.i..s', '.x..ixs', '..xsss']);
S.mapBadgeFang = lit(8, 8, ['', '.MRRRRr', '.WTrrWT', '.WT..WT', '..T...T', '..t...t']);
S.mapBadgeMimic = lit(8, 8, ['', '.wwwwwB', '.GGGGGg', '.WdWdWd', '.GGYGGg', '.BBKBBb', '.bbbbbb']);
// mapBadgeWheel: a tiny roulette wheel (red and black pockets round a gold hub)
S.mapBadgeWheel = lit(8, 8, ['', '..wRkb', '.wkRkRb', '.RkYGkR', '.kRGgRk', '.bRkRkb', '..bkRb']);

// ---------------------------------------------------------------- act 2 header badge (24x12)
{
  const g = grid(24, 12);
  // swallow-tail ribbon ends behind the plaque
  stamp(g, 0, 4, ['rrrr', ' rrr', 'rrrr', 'dddd']);
  stamp(g, 20, 4, ['rrrr', 'rrr ', 'rrrr', 'dddd']);
  // plaque: gold rim, velvet red face
  for (let y = 1; y <= 10; y++) for (let x = 3; x <= 20; x++) {
    const rim = y === 1 || y === 10 || x === 3 || x === 20;
    put(g, x, y, rim ? ((y === 1 || x === 3) ? 'Y' : 'g') : y === 2 ? 'M' : y === 9 ? 'r' : 'R');
  }
  put(g, 20, 1, 'G'); put(g, 3, 10, 'G');
  // "II": roman numerals with serif bars
  stamp(g, 8, 3, [
    'WYYYYYYG',
    ' YG  YG ',
    ' YG  YG ',
    ' YG  YG ',
    ' YG  YG ',
    'YGGggGGg',
  ]);
  S.actBadge2 = toRows(outline(g));
}

// ================================================================ ACT 2 (batch 8): grounder + counterfeiter
// ---------------------------------------------------------------- enemy portraits (24x24)
// counterfeiter: shifty forger — green eyeshade, black loupe magnifying one eye, pencil moustache,
// olive coat over a grey vest, holding a dull brass coin up for inspection
S.enemyCounterfeiter = lit(24, 24, [
  '........................',
  '......IIHHHHh...........',
  '.....IHHHHHHhh..........',
  '....qqqqqqqqqqq.........',
  '...EEEEEEeeeeeeQ..YGGg..',
  '...QQQQQQQQQQQQq.YWGGGg.',
  '....hZZZZZZlkk...GGggGg.',
  '....hFWKFFlCWWk..GGgGGg.',
  '....hFFFFflWKKk..gGGGgg.',
  '....hFFFffkAKKP..FggggF.',
  '.....FbbbbFkPP...FFfFFf.',
  '......FFKKKff....FFFFf..',
  '.......fffff.....XZZZz..',
  '..XXZZWTTtTTWZzz.XZZZz..',
  '.XZZZZzHIkHhzZZZzXZZZz..',
  '.XZZZzHIIkHhhzZZzXZZZz..',
  'XXZZZzHIGkHhhzZZzXZZZz..',
  'XZZZZzHIIkHhhzZZZZZZZz..',
  'XZZZZzHIGkHhhzZZZZZZzz..',
  'XZZZzzHIIkHGhzzZZZZZzz..',
  'XZZZzHIIIkHhGhzZZZZzzz..',
  'XZZZzHIGIkHhhhzZZZZzzz..',
  'XZZzzHIIIkHhhhzzZZzzzz..',
  'ZZzzzHIIIkHhhhzzzzzzzz..',
]);

// ---------------------------------------------------------------- reel symbols (16x16)
// fake: dull grey lead coin, crude "$" stamp, chipped at the top-right with a crack
{
  const g = grid(16, 16);
  const spans = [[5, 10], [3, 12], [2, 13], [2, 13], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 13], [2, 13], [3, 12], [5, 10]];
  shape(g, 1, spans, (x, y, has) => {
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (rim) return x + y >= 16 ? 'h' : 'I';
    return x + y >= 19 ? 'h' : 'H';
  });
  // chip bitten out of the top-right rim
  [[9, 1], [10, 1], [10, 2], [11, 2], [12, 2], [11, 3], [12, 3], [13, 3], [12, 4], [13, 4]].forEach(([x, y]) => put(g, x, y, '.'));
  plot(g, [[9, 2, 'h'], [10, 3, 'h'], [11, 4, 'h'], [12, 5, 'h'], [13, 5, 'h']]);
  // crude, lopsided "$"
  stamp(g, 5, 4, [
    '  k  ',
    ' kkkk',
    'kk   ',
    ' kkk ',
    '   kk',
    'kkkk ',
    '  k  ',
  ]);
  plot(g, [[3, 11, 'k'], [4, 12, 'k'], [4, 13, 'h']]); // hairline crack
  plot(g, [[3, 3, 'L'], [4, 3, 'L'], [3, 4, 'L']]);  // dull sheen
  S.fake = toRows(outline(g));
}

// ---------------------------------------------------------------- cell overlays (16x16, centre clear)
// groundOverlay: copper rod driven in diagonally from the top-right (steel clamp), small earth sign bottom-right
{
  const g = grid(16, 16);
  for (let t = 0; t <= 5; t++) { put(g, 15 - t, t, 'a'); put(g, 16 - t, t, 'o'); }
  put(g, 10, 6, 'o'); // point
  plot(g, [[12, 1, 'L'], [13, 2, 'S'], [14, 3, 'D'], [13, 1, 'S'], [14, 2, 'D'], [15, 3, 'D']]); // clamp
  // earth sign: stem, then three shrinking bars
  plot(g, [[11, 8, 'a'], [12, 8, 'o'], [11, 9, 'a'], [12, 9, 'o']]);
  hline(g, 9, 14, 10, 'O'); hline(g, 9, 11, 10, 'a');
  hline(g, 10, 13, 12, 'O'); put(g, 10, 12, 'a');
  hline(g, 11, 12, 14, 'o'); put(g, 11, 14, 'O');
  outline(g);
  S.groundOverlay = toRows(g);
}
// fakeOverlay: lead tarnish smudged diagonally over each corner of the gild frame, small grey coin bottom-left
{
  const g = grid(16, 16);
  // small grey coin first, so it alone gets the K outline
  stamp(g, 1, 10, [
    ' IHH ',
    'IHkkh',
    'IHkHh',
    'HkkHh',
    ' hhh ',
  ]);
  outline(g);
  // tarnish: solid wash in the corner, fading diagonal streaks
  const corners = [[0, 0, 1, 1], [15, 0, -1, 1], [15, 15, -1, -1]];
  corners.forEach(([cx, cy, sx, sy]) => {
    for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) {
      const s = u + v, x = cx + sx * u, y = cy + sy * v;
      if (s <= 2) put(g, x, y, s === 0 ? 'h' : 'H');
      else if (s === 3) put(g, x, y, (u + v * 2) % 3 ? 'H' : 'h');
      else if (s === 5 && u >= 1 && v >= 1) put(g, x, y, u % 2 ? 'h' : 'I');
      else if (s === 7 && u >= 2 && v >= 2 && u % 2) put(g, x, y, 'h');
    }
  });
  // a couple of stray drips along the edges
  plot(g, [[7, 0, 'H'], [8, 0, 'h'], [15, 7, 'H'], [15, 8, 'h'], [8, 15, 'h']]);
  S.fakeOverlay = toRows(g);
}

// ---------------------------------------------------------------- ability icons (8x8)
S.icoLaunder = lit(8, 8, ['', '..YGGg', '.YCCCCg', '.GGGGcg', '.GCcGcg', '.gccccg', '..gggg']);

// ---------------------------------------------------------------- map badges (8x8)
S.mapBadgeFake = lit(8, 8, ['', '..IIHh', '.IHHkkh', '.IHHkhh', '.HHkkhh', '..hhhh']);

// ---------------------------------------------------------------- set ribbon (44x9): big "SET!" on a gold ribbon
// ("COMPLETES SET" needs ~55px of 3x5 text + ends, so the fallback is used for legibility)
{
  const g = grid(44, 9);
  // swallow-tail ends, tucked behind the band
  const tail = [1, 2, 3, 3, 2, 1];
  tail.forEach((x0, i) => {
    const y = 2 + i;
    hline(g, x0, 6, y, y === 2 ? 'G' : y === 7 ? 'o' : 'g');
    hline(g, 37, 43 - x0, y, y === 2 ? 'G' : y === 7 ? 'o' : 'g');
  });
  // main band, lit from the top-left
  for (let y = 1; y <= 7; y++) for (let x = 6; x <= 37; x++)
    put(g, x, y, y === 1 ? (x < 20 ? 'W' : 'Y') : y === 7 ? 'g' : x === 6 ? 'Y' : x === 37 ? 'g' : 'G');
  // fold seams between band and tails
  for (let y = 2; y <= 7; y++) { put(g, 5, y, 'K'); put(g, 38, y, 'K'); }
  // "SET!" in chunky 2px strokes, cream with a dark drop shadow
  const ink = [
    '.SSSS.EEEE.TTTTTT.!!',
    'SS....EE.....TT...!!',
    '.SSS..EEE....TT...!!',
    '...SS.EE.....TT.....',
    'SSSS..EEEE...TT...!!',
  ];
  const x0 = 12, y0 = 2;
  ink.forEach((r, dy) => [...r].forEach((c, dx) => { if (c !== '.') put(g, x0 + dx + 1, y0 + dy + 1, 'b'); }));
  ink.forEach((r, dy) => [...r].forEach((c, dx) => { if (c !== '.') put(g, x0 + dx, y0 + dy, dy === 0 ? 'W' : 'T'); }));
  S.setRibbon = toRows(outline(g));
}

// ================================================================ ACT 3: THE DEALER (true ending)
// ---------------------------------------------------------------- portraits (24x24)
// dealer: FINAL BOSS — croupier in a green eyeshade (eyes glinting red in its shade), pencil moustache,
// gold-toothed smirk, black vest over a white shirt, gold bow tie + watch chain, fanning three cards
{
  const g = grid(24, 24);
  for (let y = 14; y <= 23; y++) {
    const [x0, x1] = y === 14 ? [4, 11] : y === 15 ? [1, 14] : [0, 15];
    const half = y <= 16 ? 3 : 3 - (y - 16) * 0.5;
    for (let x = x0; x <= x1; x++) {
      const d = Math.abs(x - 7.5);
      let c;
      if (y === 14 || d <= half + 0.01) c = x === x1 ? 't' : (y === 14 && x === x0) ? 'W' : 'T';
      else if (x <= 1 && y >= 16) c = y === 18 ? (x === 0 ? 'R' : 'r') : x === 0 ? 'T' : 't'; // shirt sleeve + garter
      else if (d <= half + 1.01) c = x < 7 ? 'l' : 'P';                                         // lapel edge
      else c = x === 2 ? 'l' : x >= 13 ? 'P' : 'k';
      put(g, x, y, c);
    }
  }
  plot(g, [[7, 22, 'G'], [8, 22, 'g'], [2, 19, 'G'], [3, 20, 'Y'], [4, 20, 'G'], [5, 19, 'g']]); // button, watch chain
  stamp(g, 5, 14, ['Y    G', 'YGggGg', 'G    g']);                                                  // gold bow tie
  stamp(g, 0, 1, [
    '     kllkkk',
    '   klkkkkkkkk',
    '  lkkkkkkkkkkk',
    '  QEEEEEEEEEeQ',
    'EEEEEEEEEEEeeeQ',
    ' QQQQQQQQQQQQq',
    '   zzzzzzzzzz',
    '  FzWRzzzzWRzf',
    '  FFFFFFfFFFff',
    '   FFFFffFFFf',
    '   FFkkkkkkFf',
    '   FFFKKKKYff',
    '    fFFFFFff',
  ]);
  // fan of three cards: back two show only a sliver (lit edge + cast shadow), front card shows a red pip
  const card = (x0, y0) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 4; x++) put(g, x0 + x, y0 + y, x === 0 ? 'W' : x === 3 || y === 6 ? 't' : 'T'); };
  card(16, 4); card(18, 3); card(20, 2);
  plot(g, [[17, 4, 't'], [17, 5, 'R'], [17, 6, 't'], [17, 7, 't'], [17, 8, 't'], [17, 9, 't']]);
  plot(g, [[19, 3, 't'], [19, 4, 'k'], [19, 5, 't'], [19, 6, 't'], [19, 7, 't'], [19, 8, 't']]);
  plot(g, [[21, 4, 'R'], [22, 4, 'R'], [21, 5, 'R'], [22, 5, 'r'], [21, 6, 'r']]);
  stamp(g, 16, 9, [' FFf', 'FFFFf', ' fFf']);                       // hand gripping the fan
  plot(g, [[17, 12, 'T'], [18, 12, 't'], [16, 13, 'R'], [17, 13, 'r'], [15, 14, 'T'], [16, 14, 't'], [15, 15, 'T'], [16, 15, 't']]);
  S.enemyDealer = toRows(outline(g));
}
// card sharp: slicked pompadour, one brow cocked, side-eye, lopsided grin; purple jacket, black shirt + gold
// chain, raised fist with an ace sliding out of the cuff
{
  const g = grid(24, 24);
  for (let y = 15; y <= 23; y++) {
    const [x0, x1] = y === 15 ? [3, 14] : y === 16 ? [1, 16] : [0, 17];
    const half = Math.max(0.6, 2.5 - (y - 15) * 0.35);
    for (let x = x0; x <= x1; x++) {
      const d = Math.abs(x - 8.5);
      put(g, x, y, d <= half ? (x < 8 ? 'l' : 'k') : d <= half + 1.01 ? 'J' : x <= 1 ? 'J' : x >= 15 ? 'v' : 'V');
    }
  }
  plot(g, [[7, 16, 'Y'], [7, 17, 'G'], [8, 18, 'Y'], [9, 18, 'G'], [10, 17, 'G'], [10, 16, 'g']]); // gold chain
  stamp(g, 0, 1, [
    '      kllllk',
    '    kllWWlllkk',
    '   klllllllkkkk',
    '   kFFFFFFkkkkk',
    '   kFFFFFFFFFFk',
    '   kFkkkFFFFFFk',
    '   kFffFFFkkkFk',
    '   kFWKFFFWKFFk',
    '   kFFFFffFFFfk',
    '    FFkkkkkkFf',
    '    FFFFFFFFKf',
    '    fFKWWWWKFf',
    '     fFKKKKff',
    '       fFFf',
  ]);
  stamp(g, 21, 5, ['WTt', 'TRt', 'RRr', 'TrT', 'TTt', 'TTt', 'tTt']); // the ace
  stamp(g, 17, 8, ['FFFf', 'FFFf', 'fFFf', 'ffff', 'WTTTt']);         // fist + cuff
  for (let y = 13; y <= 16; y++) stamp(g, 18, y, ['JVVv']);           // raised forearm
  S.enemySharp = toRows(outline(g));
}
// pit boss: huge, crew cut, knitted brows, black shades, frown; dark suit, red tie, gavel raised in one fist
{
  const g = grid(24, 24);
  for (let y = 14; y <= 23; y++) {
    const [x0, x1] = y === 14 ? [2, 17] : [0, 21];
    const half = 3 - (y - 14) * 0.5;
    for (let x = x0; x <= x1; x++) {
      const d = Math.abs(x - 9.5);
      let c;
      if (x === 9 || x === 10) c = y === 14 ? (x === 9 ? 'R' : 'r') : d <= half + 0.01 || y <= 21 ? (x === 9 ? 'R' : 'r') : 'k';
      else if (d <= half + 0.01) c = x < 9 ? 'T' : 't';
      else if (d <= half + 1.01) c = 'P';
      else c = x <= 1 ? 'l' : x >= 18 ? 'P' : 'k';
      put(g, x, y, c);
    }
  }
  plot(g, [[4, 18, 'l'], [5, 19, 'l'], [4, 17, 'l']]);
  stamp(g, 0, 1, [
    '      IIHHHHhh',
    '    hIHHHHHHHHhh',
    '    FFFFFFFFFFff',
    '    FFbbbFFbbbff',
    '    kkkkkkkkkkkk',
    '   FkWlPPkkWlPPkf',
    '   FkPPPPFFPPPPkf',
    '    FFFFFffFFFff',
    '    FFFFFFFFFFff',
    '    FFFFKKKKFFff',
    '    FFFKFFFFKFff',
    '    fFFFFFFFFFff',
    '     ffFFFFFFff',
  ]);
  stamp(g, 17, 1, ['wYwwwYB', 'BGBBBGb', 'BGBBBGb', 'bgbbbgb']);   // gavel head
  for (let y = 5; y <= 9; y++) stamp(g, 19, y, ['wB']);             // handle
  stamp(g, 18, 10, ['FFFf', 'FFFf', 'fFff', 'TTTt', 'lkkP']);       // fist, cuff, sleeve
  S.enemyPitBoss = toRows(outline(g));
}
// croupier: gaunt, centre-parted hair, thin brows + moustache, bored slit eyes, long neck, black bow tie,
// red waistcoat with gold buttons, holding a long wooden rake upright
{
  const g = grid(24, 24);
  for (let y = 14; y <= 23; y++) {
    const [x0, x1] = y === 14 ? [6, 12] : [4, 14];
    const half = y <= 15 ? 1 : y <= 17 ? 0 : -1;
    for (let x = x0; x <= x1; x++) {
      let c;
      if (Math.abs(x - 9) <= half) c = x < 9 ? 'T' : x === 9 ? 'T' : 't';
      else if (y >= 15 && (x === 4 || x === 14)) c = x === 4 ? 'T' : 't';
      else c = x === x0 + (y >= 15 ? 1 : 0) ? 'M' : x >= 12 ? 'r' : 'R';
      put(g, x, y, c);
    }
  }
  plot(g, [[9, 19, 'G'], [9, 21, 'G'], [9, 23, 'g']]);
  stamp(g, 0, 1, [
    '       lkPkl',
    '      lkkPkkl',
    '      kkFFFkk',
    '      kFFFFFk',
    '      FbbFbbf',
    '      FKKFKKf',
    '      FFFfFFf',
    '      FFFfFFf',
    '      FkkkkkF',
    '      FFKKKFf',
    '       fFFFf',
    '        fFf',
    '       WkKkt',
  ]);
  for (let y = 3; y <= 23; y++) { const x = 20 - Math.floor((y - 3) / 7); put(g, x, y, 'w'); put(g, x + 1, y, 'B'); }
  stamp(g, 17, 1, ['wwwwwwB', 'BBBBBBb']);                           // rake blade
  plot(g, [[20, 3, 'G'], [21, 3, 'g']]);                             // brass ferrule
  stamp(g, 17, 12, ['FFFf', 'fFff']);                                // hand on the stick
  plot(g, [[16, 14, 'T'], [17, 14, 't'], [15, 15, 'T'], [16, 15, 't']]);
  S.enemyCroupier = toRows(outline(g));
}
// repo man: navy trucker cap, hard brows, stubble, flat mouth; hi-vis orange vest with a reflective stripe over a
// grey work shirt, one fist raised with a tow hook swinging on a chain
{
  const g = grid(24, 24);
  for (let y = 14; y <= 23; y++) {
    const [x0, x1] = y === 14 ? [3, 16] : [0, 19];
    for (let x = x0; x <= x1; x++) {
      let c;
      if (x >= 8 && x <= 11) c = y === 14 ? (x <= 9 ? 'L' : 'S') : x <= 9 ? 'S' : 'D';
      else if (y === 19) c = 'Y';
      else if (x === 7 || x === 12) c = 'o';
      else c = x < 8 ? 'O' : x >= 17 ? 'o' : 'O';
      put(g, x, y, c);
    }
  }
  plot(g, [[14, 16, 'T'], [15, 16, 'T'], [14, 17, 't'], [15, 17, 't']]); // name patch
  stamp(g, 0, 1, [
    '     NNNNNNNNN',
    '    NUUUUUUUUUN',
    '    NUUUTTUUUUN',
    '  NNNNNNNNNNNKN',
    '    FFFFFFFFFFf',
    '    FKKKFFKKKFf',
    '    FFWKFFFWKFf',
    '    FFFFFffFFFf',
    '    FFhFFFFFhFf',
    '    FhFKKKKKFhf',
    '    fFhFhFhFhFf',
    '     ffFhFhFff',
    '       fFFFf',
  ]);
  stamp(g, 17, 2, ['FFf', 'fFf']);                                   // raised fist
  for (let y = 4; y <= 13; y++) stamp(g, 17, y, ['SD']);              // sleeve down to the shoulder
  plot(g, [[20, 3, 'S'], [20, 4, 'D'], [21, 5, 'S'], [21, 6, 'D'], [22, 7, 'S']]); // chain
  stamp(g, 20, 8, ['  LS', '  LS', '  LS', 'L LS', 'L LS', ' SSD']);  // tow hook
  S.enemyRepoMan = toRows(outline(g));
}

// ---------------------------------------------------------------- reel symbols (16x16)
// card: marked playing card — red index + heart pip, black "X" scratched in the top-right corner
S.card = lit(16, 16, [
  '................',
  '...WTTTTTTTTt...',
  '...WRTTTKTKTt...',
  '...WRTTTTKTTt...',
  '...WTTTTKTKTt...',
  '...WTTTTTTTTt...',
  '...TTRRTRRTTt...',
  '...TRMRRRRrTt...',
  '...TRRRRRRrTt...',
  '...TTRRRRrTTt...',
  '...TTTRRrTTTt...',
  '...TTTTrTTTTt...',
  '...TTTTTTTTRt...',
  '...TTTTTTTTRt...',
  '...tttttttttt...',
]);
// gavel: banded wooden head, turned handle with a knob
S.gavel = lit(16, 16, [
  '................',
  '................',
  '..wwYwwwwwwYwB..',
  '.wBBGBBBBBBGBBb.',
  '.wBBGBBBBBBGBbb.',
  '.BBBgBBBBBBgBbb.',
  '..bbgbbbbbbgbb..',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '......wBBb......',
  '......bbbb......',
]);
// rake: long stick with a wide, thin flat blade crosswise at the top, brass ferrule, pushing a chip
S.rake = lit(16, 16, [
  '................',
  '.Wwwwwwwwwwwwww.',
  '.bBBBBBBBBBBBbb.',
  '.......Gg.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......wB.......',
  '.......bb.......',
]);

// ---------------------------------------------------------------- ability icons (8x8)
S.icoShuffle = lit(8, 8, ['', '.A...YY', '..A..YY', '...AY', '...YA', '..Y..AA', '.Y...AA']);
S.icoMark = lit(8, 8, ['', '.WTTTt', '.TKTKt', '.TTKTt', '.TKTKt', '.TTTTt', '.ttttt']);
S.icoGavel = lit(8, 8, ['', '.YwwwwG', '.GBBBBg', '.gbbbbg', '...wB', '...wB', '...wB']);
S.icoRake = lit(8, 8, ['', '.Wwwwwb', '.bbbbbb', '...Gg', '...wB', '.RR.wB', '.rr.wB']);

// ---------------------------------------------------------------- map badges (8x8)
S.mapBadgeCard = lit(8, 8, ['', '.WTTTt', '.TTRTt', '.TRRRt', '.TTRTt', '.TTTKt', '.ttttt']);
S.mapBadgeGavel = lit(8, 8, ['', '.YwwwwG', '.gbbbbg', '...wB', '...wB', '.IIIIIH', '.hhhhhh']);
S.mapBadgeRake = lit(8, 8, ['', '.Wwwwwb', '.bbbbbb', '...Gg', '...wB', '...wB', '...bb']);
S.mapBadgeDealer = lit(8, 8, ['', '...WTTt', '.MRTRRt', '.RGTRrt', '.GRTTTt', '.rRtttt', '.dd']);

// ---------------------------------------------------------------- the Dealer's face-up deal cards (16x22)
function dealCard(back, icon, ix, iy, pip) {
  const g = grid(16, 22);
  for (let y = 1; y <= 20; y++) for (let x = 1; x <= 14; x++) {
    if ((x === 1 || x === 14) && (y === 1 || y === 20)) continue; // rounded corners
    let c;
    if (back) {
      const edge = x === 1 || x === 14 || y === 1 || y === 20;
      const frame = x === 2 || x === 13 || y === 2 || y === 19;
      if (edge) c = (x === 1 || y === 1) ? 'R' : 'd';
      else if (frame) c = (x === 2 || y === 2) ? 'Y' : 'G';
      else if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) c = ((x + y) % 4 === 0 && (x - y + 40) % 4 === 0) ? 'Y' : 'G';
      else c = 'r';
    } else c = (y === 1 || x === 1) ? 'W' : (y === 20 || x === 14) ? 't' : 'T';
    put(g, x, y, c);
  }
  if (icon) stamp(g, ix, iy, icon);
  if (pip) plot(g, [[3, 3, pip], [12, 18, pip]]); // corner indices
  return toRows(outline(g));
}
// dealShuffle: two thick arrows crossing (charcoal one passes under the red one)
{
  const g = grid(10, 10);
  for (let t = 0; t <= 6; t++) if (t < 4 || t > 5) { put(g, t, t, 'l'); put(g, t + 1, t, 'k'); }
  for (let t = 0; t <= 6; t++) { put(g, t, 9 - t, 'R'); put(g, t + 1, 9 - t, 'r'); }
  for (let i = 0; i < 4; i++) for (let x = 6 + i; x <= 9; x++) { put(g, x, i, i === 0 ? 'M' : 'R'); put(g, x, 9 - i, i === 0 ? 'k' : 'l'); }
  put(g, 9, 0, 'r'); put(g, 9, 9, 'k');
  S.dealShuffle = dealCard(false, g.map((r) => r.join('').replace(/\./g, ' ')), 3, 6, 'R');
}
S.dealCut = dealCard(false, [
  'W        S',
  'LW      SD',
  ' LW    SD ',
  '  LW  SD  ',
  '   LWSD   ',
  '    YG    ',
  '   SDLW   ',
  '  SD  LW  ',
  ' RR    RR ',
  'R  r  R  r',
  'R  r  R  r',
  ' rr    rr ',
], 3, 5, 'k');
S.dealRaise = dealCard(false, [
  '    WG    ',
  '   WYGg   ',
  '  WYYGGg  ',
  ' WYYYGGGg ',
  'WYYYYGGGGg',
  'gggYYGGggg',
  '   YYGg   ',
  '   YYGg   ',
  '   YYGg   ',
  '   YYGg   ',
  '   YYGg   ',
  '   gggg   ',
], 3, 5, 'G');
// cardBack (16x16): a face-down playing card, tilted clockwise (rows step left going down), used as the
// "MARKED by the enemy" cell overlay. Gold rim (lit top-left), deep red back, dark-red diamond lattice with
// gold studs where the lines cross, a bright gold centre diamond.
{
  const g = grid(16, 16);
  const W = 10, top = 1, bot = 14;
  const off = (y) => (y <= 3 ? 4 : y <= 7 ? 3 : y <= 11 ? 2 : 1); // skew = tilt
  const inCard = (lx, y) => y >= top && y <= bot && lx >= 0 && lx < W &&
    !((lx === 0 || lx === W - 1) && (y === top || y === bot)); // rounded corners
  for (let y = top; y <= bot; y++) for (let lx = 0; lx < W; lx++) {
    if (!inCard(lx, y)) continue;
    const x = off(y) + lx;
    const rim = !inCard(lx - 1, y) || !inCard(lx + 1, y) || !inCard(lx, y - 1) || !inCard(lx, y + 1);
    let c;
    if (rim) c = (lx === 0 || y === top) ? 'Y' : (lx === W - 1 || y === bot) ? 'g' : 'G';
    else {
      const a = (x + y) % 4 === 2, b = (x - y + 40) % 4 === 0; // lattice in screen space: clean diamonds
      c = a && b ? 'G' : a || b ? 'r' : 'R';
    }
    put(g, x, y, c);
  }
  // centre diamond (screen space, sits in one lattice cell)
  const cx = 7, cy = 7;
  for (let y = cy - 2; y <= cy + 2; y++) for (let x = cx - 2; x <= cx + 2; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (d <= 2) put(g, x, y, d === 0 ? 'W' : d === 1 ? ((x < cx || y < cy) ? 'Y' : 'G') : ((x <= cx && y <= cy) ? 'G' : 'g'));
  }
  S.cardBack = toRows(outline(g));
}

// ---------------------------------------------------------------- overlays
// confiscatedOverlay: grey dashed frame round the cell, red wax seal with a tiny gavel top-right, centre clear
{
  const g = grid(16, 16);
  const cx = 12, cy = 3.5;
  for (let y = 0; y <= 7; y++) for (let x = 8; x <= 15; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 3.5) put(g, x, y, d > 2.6 ? ((x - cx) + (y - cy) < 0 ? 'R' : 'r') : 'R');
  }
  plot(g, [[10, 1, 'M'], [11, 2, 'W'], [12, 2, 'T'], [13, 2, 'T'], [11, 3, 'T'], [12, 3, 'T'], [13, 3, 't'], [12, 4, 'T'], [12, 5, 't']]);
  outline(g);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const onEdge = x === 0 || y === 0 || x === 15 || y === 15;
    if (!onEdge || g[y][x] !== '.') continue;
    const p = y === 0 ? x : x === 15 ? 15 + y : y === 15 ? 45 - x : 60 - y; // perimeter index
    if (p % 4 < 2) put(g, x, y, (y === 0 || x === 0) ? 'S' : 'D');
  }
  S.confiscatedOverlay = toRows(g);
}
// actPlaque3: gold-rimmed dark plaque reading "ACT 3" in gold with a dark-gold drop shadow
{
  const g = grid(24, 12);
  for (let y = 1; y <= 10; y++) for (let x = 1; x <= 22; x++) {
    const rim = y === 1 || y === 10 || x === 1 || x === 22;
    put(g, x, y, rim ? ((y === 1 || x === 1) ? 'Y' : 'g') : y === 2 ? 'p' : 'P');
  }
  put(g, 22, 1, 'G'); put(g, 1, 10, 'G');
  plot(g, [[2, 2, 'G'], [21, 9, 'g']]);
  const ink = [
    '###..##.###..###',
    '#.#.#....#.....#',
    '###.#....#....##',
    '#.#.#....#.....#',
    '#.#..##..#...###',
  ];
  const x0 = 4, y0 = 3;
  ink.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === '#') put(g, x0 + dx + 1, y0 + dy + 1, 'g'); }));
  ink.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === '#') put(g, x0 + dx, y0 + dy, dy === 0 ? 'W' : dy <= 2 ? 'Y' : 'G'); }));
  S.actPlaque3 = toRows(outline(g));
}

// ---------------------------------------------------------------- chase symbols / vouchers / RELIC RUSH / tier badges
// bonusSym (16x16): gold coin with a chasing-lights orange glow rim and a bold red "B"; warm corner twinkles
{
  const g = grid(16, 16);
  const spans = [[5, 10], [3, 12], [2, 13], [2, 13], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 13], [2, 13], [3, 12], [5, 10]];
  shape(g, 1, spans, (x, y, has) => {
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (rim) return (x + y) % 2 ? (x + y >= 16 ? 'o' : 'O') : 'Y'; // chasing bulbs
    return x + y >= 19 ? 'G' : 'Y';
  });
  const B = [
    'RRRRR ',
    'RR  RR',
    'RR  RR',
    'RRRRR ',
    'RR  RR',
    'RR  RR',
    'RRRRR ',
  ];
  B.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === 'R') put(g, 5 + dx, 4 + dy, (dx <= 1 || dy === 0 || dy === 3) && dx < 4 ? 'R' : 'r'); }));
  put(g, 5, 4, 'M');
  put(g, 4, 3, 'W'); put(g, 3, 4, 'W'); put(g, 5, 2, 'W'); // gloss
  outline(g);
  plot(g, [[0, 0, 'Y'], [1, 1, 'W'], [15, 0, 'Y'], [14, 1, 'W'], [0, 15, 'O'], [15, 15, 'O']]); // warm twinkles
  S.bonusSym = toRows(g);
}
// relicSym (16x16): violet treasure chest, gold straps and trim, violet gem lock
S.relicSym = lit(16, 16, [
  '................',
  '....YYYYYYYY....',
  '...YJJJYGVVVg...',
  '..YJJJJYGVVVVg..',
  '..YJVVVYGVVVvg..',
  '..YVVVGKKGVvvg..',
  '..YYYGKJWKGGGg..',
  '..GvvvKJVKvvvg..',
  '..YVVVGKKGVVvg..',
  '..YJVVVYGVVVvg..',
  '..YVVVVYGVVvvg..',
  '..YVVVVYGVvvvg..',
  '..GGGGGGGGGGgg..',
  '..gg........gg..',
]);
// ---------------------------------------------------------------- Tuesday rework: signature symbols + charm relic
// goldbar (16x16): THE BANKROLL's signature symbol (id kept), a red casino chip matching the `chip` currency:
// tilted face with white edge inserts, a dark inner groove and a gold star, over a red/white striped rim
S.goldbar = lit(16, 16, [
  '................',
  '.....RMWWRR.....',
  '...RMRRWWRRRr...',
  '..RMrrrrrrrrRr..',
  '.RRrRMRRRRRRrRr.',
  '.WWrMRRRYRRRrWW.',
  '.WWrRRYYWYYRrWL.',
  '.WWrRRRYYGRRrLL.',
  '.WWrRRRGRgRRrLL.',
  '.RRrRRRRRRRRrRR.',
  '.rRRrrrrrrrrRRt.',
  '.rTRRRRLLRRRRdt.',
  '..TTrRRLLRRtdd..',
  '...TrrTTrrttd...',
  '.....rTTrrt.....',
  '................',
]);
// ace (16x16): JESTER JAX's attack symbol (shown as CARD), a thrown playing card: a black spade, purple corner pips and
// speed lines (the Dealer's 'card' mark is a red heart, so they never read alike)
S.ace = lit(16, 16, [
  '................',
  '....WWWWWWWWT...',
  '....WVWWWWWWT...',
  '....WVWWWWWWT...',
  '....WWWWkWWWT...',
  '.JJ.WWWkkkWWT...',
  '....WWkkkkkWT...',
  '....WkkkkkkkT...',
  '..J.WkklkkkkT...',
  '....WWkWkWkWT...',
  '.JJ.WWWWkWWWT...',
  '....WWWkkkWWT...',
  '....WWWWWWWVT...',
  '....WWWWWWWVT...',
  '....TTTTTTTTt...',
  '................',
]);
// thorn (16x16): BRIAR's signature symbol, a bramble with pale-tipped spikes
S.thorn = lit(16, 16, [
  '................',
  '............EE..',
  '...........EeQ..',
  '.....W....EeQ...',
  '.....EW..EeQ....',
  '......EeEeQ..W..',
  '.......EeQ..EQ..',
  '......EeQeEeQ...',
  '.....EeQ..QQ....',
  '..W.EeQ.........',
  '..QEeQ..........',
  '...EQ...........',
  '..EeQ...........',
  '.EeQ............',
  '.QQ.............',
  '................',
]);
// relicChalice (16x16): BLOOD CHALICE, a gold goblet brimming red (overheal becomes shield)
S.relicChalice = lit(16, 16, [
  '................',
  '...WYYYYYYYYG...',
  '...YRRRRRRRRG...',
  '...GrRRMRRRrg...',
  '....GrRRRRrg....',
  '.....GrrrrG.....',
  '......GYGg......',
  '.......Yg.......',
  '.......Gg.......',
  '.......Gg.......',
  '......YGGg......',
  '.....YGGGGg.....',
  '....GGGGGGgg....',
  '................',
]);
// ---------------------------------------------------------------- charm-rework relics (16x16)
// relicDrum (16x16): WAR DRUM, crossed sticks over a cream head, red rims, gold lacing
S.relicDrum = lit(16, 16, [
  '................',
  '....W......W....',
  '.....w....w.....',
  '......w..w......',
  '.......ww.......',
  '.......ww.......',
  '......w..w......',
  '...TWTTTTTTTI...',
  '..MRRRRRRRRRRr..',
  '..wYBBBYBBBYbb..',
  '..wwYBYBYBYBYb..',
  '..wwBYBBBYBBbb..',
  '..RRRRRRRRRRrr..',
  '...rrrrrrrrrr...',
]);
// relicChainmail (16x16): CHAINMAIL, a grey mail shirt with one red heart link
{
  const g = grid(16, 16);
  const mask = [
    '................',
    '...xxx....xxx...',
    '..xxxxx..xxxxx..',
    '.xxxxxxxxxxxxxx.',
    '.xxxxxxxxxxxxxx.',
    '.xxxxxxxxxxxxxx.',
    '.xx.xxxxxxxx.xx.',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
    '...xxxxxxxxxx...',
  ];
  const has = (x, y) => (mask[y] || '')[x] === 'x';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!has(x, y)) continue;
    const ring = (x + y) % 2 === 0;
    let c = x >= 10 ? (ring ? 'S' : 'D') : (ring ? 'L' : 'S');
    if (!has(x - 1, y) || !has(x, y - 1)) c = 'L';
    if (!has(x + 1, y)) c = 'D';
    if (y === 13) c = x >= 10 ? 'h' : 'D'; // hem
    put(g, x, y, c);
  }
  stamp(g, 5, 7, ['MR RR', 'RRRRr', ' RRr ', '  r  ']);
  S.relicChainmail = toRows(outline(g));
}
// relicArmoredCar (16x16): ARMORED CAR, a side-on steel-blue money truck: barred window, gold chip emblem, two black wheels
S.relicArmoredCar = lit(16, 16, [
  '................',
  '................',
  '.LLLLLLLLLL.....',
  '.LSSSSSSSSSLLL..',
  '.LSkAkSSSSSLAAS.',
  '.LSkAkgGGgSSAAS.',
  '.LSSSSGYYGSSSSD.',
  '.LSSSSGYYgSSSSD.',
  '.LSSSSggggSSSSY.',
  '.SSSSSSSSSSSSDD.',
  '.DDDDDDDDDDDDDD.',
  '..kkkk....kkkk..',
  '..kSSk....kSSk..',
  '..kSSk....kSSk..',
  '..kkkk....kkkk..',
]);
// relicGreatsword (16x16): GREATSWORD, an upright two-handed blade: long bright steel, dark edge, wide gold crossguard, leather grip, gold pommel
S.relicGreatsword = lit(16, 16, [
  '................',
  '.......LS.......',
  '......WLSD......',
  '......WLSD......',
  '......WLSD......',
  '......WLSD......',
  '......WLSD......',
  '......WLSD......',
  '......WLSD......',
  '..g...WLSD...g..',
  '.gYGGGGGGGGGGgg.',
  '.gYYYYYYYYYYGgg.',
  '..g...BbBb...g..',
  '.......BbB......',
  '.......BbB......',
  '......gYYGg.....',
]);
// relicSafeDeposit (16x16): SAFE DEPOSIT, a steel strongbox with gold trim, a blue shield emblem and a keyhole
S.relicSafeDeposit = lit(16, 16, [
  '................',
  '................',
  '.LLLLLLLLLLLLLL.',
  '.LGGGGGGGGGGGGD.',
  '.LGSSSSSSSSSSgD.',
  '.LGSSAUUUUNSSgD.',
  '.LGSSAUUUUNSSgD.',
  '.LGSSAUkkUNSSgD.',
  '.LGSSAUkkUNSSgD.',
  '.LGSSSNUUNSSSgD.',
  '.LGSSSSNNSSSSgD.',
  '.LGSSSSSSSSSSgD.',
  '.SGGGGGGGGGGGgD.',
  '.DDDDDDDDDDDDDD.',
  '..DD........DD..',
]);
// relicGraft (16x16): GRAFT, a thorny vine spear, a small sword blade lashed to its tip with twine
{
  const g = grid(16, 16);
  for (let i = 0; i <= 6; i++) { put(g, 2 + i, 13 - i, 'e'); put(g, 3 + i, 13 - i, 'Q'); }
  put(g, 2, 13, 'E'); put(g, 3, 12, 'E');
  plot(g, [[2, 11, 'W'], [7, 9, 'W'], [7, 6, 'W'], [8, 7, 'T'], [9, 7, 'w'], [7, 8, 'T'], [8, 8, 'w'], [10, 8, 'T'], [10, 9, 'w']]);
  // crossguard across the join, then the blade up-right
  plot(g, [[8, 5, 'Y'], [9, 6, 'G'], [10, 7, 'g']]);
  for (let j = 0; j <= 3; j++) { put(g, 9 + j, 5 - j, 'L'); put(g, 10 + j, 5 - j, 'S'); }
  put(g, 13, 1, 'L'); put(g, 10, 4, 'W'); put(g, 11, 3, 'W');
  S.relicGraft = toRows(outline(g));
}
// relicFaraday (16x16): FARADAY CAGE, a copper birdcage holding a yellow spark
S.relicFaraday = lit(16, 16, [
  '................',
  '.......aO.......',
  '.....aOOOOo.....',
  '...aOOOOOOOOo...',
  '...a.O..Y.O.o...',
  '...a.O.YW.O.o...',
  '...a.OYWYY..o...',
  '...a.O..WY..o...',
  '...a.O.YW.O.o...',
  '...a.O.W..O.o...',
  '...a.OY...O.o...',
  '..aOOOOOOOOOOo..',
  '..oooooooooooo..',
]);
// relicStatic (16x16): STATIC, a yellow zigzag bolt striking a small blue shield and bouncing off
S.relicStatic = lit(16, 16, [
  '................',
  '............YY..',
  '...........YW...',
  '..........YYYY..',
  '...........YW...',
  '.LLLLLS...YY....',
  '.LAAUNS..YW.....',
  '.LAUUNS.WY......',
  '.LAUUNSWW.......',
  '.LUUNNS.WY......',
  '..SUNS....YW....',
  '...SS......YYY..',
  '............YW..',
  '.............Y..',
]);
// relicCapbells (16x16): CAP AND BELLS, a purple-and-green jester cap, gold bells on both tips
S.relicCapbells = lit(16, 16, [
  '................',
  '................',
  '.JVV........EeQ.',
  '.V.VVv....EeQ.Q.',
  'YY..VVv..EeQ..YY',
  'Gg...VVvEeQ...Gg',
  '.....JVVeeQ.....',
  '....JVVVeeeQ....',
  '....VVvVeeQQ....',
  '...YGYGYGYGYg...',
  '...gggggggggg...',
]);
// relicStacked (16x16): STACKED DECK, three fanned cards, the top one a joker with gold corners
{
  const g = grid(16, 16);
  const card = (x0, y0, w, h, fn) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const edge = (x === x0 || y === y0) && get(g, x, y) !== '.';
      put(g, x, y, edge ? 'K' : fn(x - x0, y - y0, w, h));
    }
  };
  card(1, 5, 7, 10, (x, y, w, h) => (x === 0 || y === 0 ? 'M' : x === w - 1 || y === h - 1 ? 'r' : (x + y) % 2 ? 'R' : 'r'));
  card(4, 2, 7, 10, (x, y, w, h) => (x === 0 || y === 0 ? 'A' : x === w - 1 || y === h - 1 ? 'N' : (x + y) % 2 ? 'U' : 'N'));
  card(8, 4, 7, 11, (x, y, w, h) => (x === w - 1 || y === h - 1 ? 't' : 'T'));
  stamp(g, 9, 5, [
    'YY    ',
    'Y V e ',
    ' VJeE ',
    ' FFFf ',
    ' KFKf ',
    ' FRFf ',
    ' fFf  ',
    '     Y',
    '    YG',
  ]);
  S.relicStacked = toRows(outline(g));
}
// relicGoldleaf (16x16): GOLD LEAF, a thin crinkled flake of gold, its top corner curling over
{
  const g = grid(16, 16);
  const inSheet = (x, y) => { const u = x + y, v = x - y; return u >= 8 && u <= 22 && v >= -5 && v <= 5 && !((u === 8 || u === 22 || v === -5 || v === 5) && (u + v) % 3 === 0); };
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!inSheet(x, y)) continue;
    const u = x + y, v = x - y;
    let c = 'Y';
    if (v >= 3) c = v === 3 ? 'W' : (u + v) % 2 ? 'G' : 'g';            // curled-over underside
    else if (!inSheet(x + 1, y) || !inSheet(x, y + 1)) c = 'G';
    else if (!inSheet(x - 1, y) || !inSheet(x, y - 1)) c = 'W';
    else if ((u === 12 && v <= -1) || (u === 17 && v >= -4 && v <= 1)) c = 'G'; // two soft crinkles
    put(g, x, y, c);
  }
  put(g, 4, 6, 'W'); put(g, 6, 5, 'W');
  S.relicGoldleaf = toRows(outline(g));
}
// relicExecutioner (16x16): EXECUTIONER, a heavy steel axe head with a keen cyan edge on a dark haft
S.relicExecutioner = lit(16, 16, [
  '................',
  '.....LS...C.....',
  '.....Bb.LLSC....',
  '.....BbLLSSSC...',
  '...LSBbSSSSDcC..',
  '..LSDBbSSSDDcC..',
  '...SDBbSSDDDcC..',
  '.....BbDDDDcC...',
  '.....BbDDDcC....',
  '.....Bb...C.....',
  '.....Bb.........',
  '.....Bb.........',
  '.....Bb.........',
  '.....Bb.........',
  '.....kk.........',
]);
// relicHorseshoe (16x16): HORSESHOE, a green lucky horseshoe with nail holes and a sparkle
{
  const g = grid(16, 16);
  const cells = new Set();
  for (let y = 2; y <= 14; y++) for (let x = 1; x <= 14; x++) {
    const dx = x - 7.5;
    const inShoe = y <= 8 ? Math.abs(dx) >= 2.5 && Math.abs(dx) <= 6.5 : Math.hypot(dx, y - 8) >= 2.6 && Math.hypot(dx, y - 8) <= 6.6;
    if (inShoe) cells.add(`${x},${y}`);
  }
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); put(g, x, y, edgeShade('E', 'e', 'Q')(x, y, has)); }
  plot(g, [[2, 5, 'q'], [2, 8, 'q'], [13, 5, 'q'], [13, 8, 'q'], [4, 12, 'q'], [11, 12, 'q']]);
  plot(g, [[2, 2, 'W'], [7, 2, 'Y'], [6, 3, 'Y'], [7, 3, 'W'], [8, 3, 'Y'], [7, 4, 'Y']]);
  S.relicHorseshoe = toRows(outline(g));
}
// relicUnderdog (16x16): UNDERDOG, a scrappy floppy-eared pup with a sticking plaster and a notched ear
S.relicUnderdog = lit(16, 16, [
  '................',
  '................',
  '....wwwwBTBB....',
  '..bbwwwwTTTbbb..',
  '.bbbwKwwBTKBbb..',
  '.bbbwwwwBBBBbbb.',
  '.bbwwwTTTTBBBbb.',
  '.bb.wTTKKTTB.bb.',
  '.b..wTTTTTTB..b.',
  '....BTtKKtTB....',
  '.....BTRRTB.....',
  '......bRrb......',
]);
// relicFirstblood (16x16): FIRST BLOOD, a sword tip with a single red drop falling from it
{
  const g = grid(16, 16);
  for (let i = 0; i <= 9; i++) { const x = 1 + i, y = 13 - i; put(g, x, y, 'L'); put(g, x + 1, y, 'S'); put(g, x + 2, y, 'D'); }
  plot(g, [[11, 3, 'L'], [12, 3, 'S'], [12, 2, 'W'], [5, 9, 'W'], [7, 7, 'W'], [9, 5, 'W']]);
  plot(g, [[12, 3, 'R'], [11, 3, 'R']]); // blooded tip
  plot(g, [[13, 6, 'R'], [12, 7, 'M'], [13, 7, 'R'], [12, 8, 'R'], [13, 8, 'r'], [13, 9, 'r']]);
  S.relicFirstblood = toRows(outline(g));
}
// relicPiggy (16x16): PIGGY BANK, a pink pig with a slot on its back and a gold coin dropping in
S.relicPiggy = lit(16, 16, [
  '................',
  '.......YY.......',
  '......YWYG......',
  '......YYGg......',
  '.......Gg.Mm....',
  '....MMMKKMMm....',
  '...MWMMMMMMMm...',
  '.MMMMMMMMMKMMM..',
  '..MMMMMMMMMMmMm.',
  '..MMMMMMMMMMMm..',
  '...mMMMMMMMMm...',
  '...mm..mm.mm....',
]);
// relicTrophy (16x16): TROPHY BELT, a brown strap with gold studs through a big gold buckle
S.relicTrophy = lit(16, 16, [
  '................',
  '................',
  '................',
  '....YYYYYYYG....',
  '....YWYYYYGg....',
  '....YG...Gg.....',
  '.wwwYGwwwGgwwww.',
  '.BYBYGYYYYgBYBY.',
  '.BBBYGBBBGgBBBB.',
  '.bbbYGbbbGgbbbb.',
  '....YG...Gg.....',
  '....GGGGGGgg....',
  '....gggggggg....',
]);
// relicHolywater (16x16): HOLY WATER, a corked blue flask marked with a white cross
S.relicHolywater = lit(16, 16, [
  '................',
  '......wBBb......',
  '......wBBb......',
  '.....AAAAAN.....',
  '......AUUN......',
  '.....AUUUUN.....',
  '....ACUUUUUN....',
  '...ACUUWWUUUN...',
  '...AUWWWWWWUN...',
  '...AUUUWWUUUN...',
  '...UUUUWWUUNN...',
  '...UUUUWWUNNN...',
  '....NUUUUNNN....',
  '.....NNNNNN.....',
]);
// relicBash (16x16): SHIELD BASH, a round shield with a centre spike, speed lines trailing
{
  const g = grid(16, 16);
  shape(g, 3, discSpans(9, 8, 5.2, 3, 13), (x, y, has) => {
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !has(x + dx, y + dy));
    if (rim) return x + y >= 19 ? 'D' : x + y <= 14 ? 'L' : 'S';
    return x + y >= 20 ? 'N' : 'U';
  });
  stamp(g, 7, 5, [
    'W   ',
    'LS  ',
    'LSSD',
    ' SDk',
    '  kk',
  ]);
  plot(g, [[5, 6, 'L'], [13, 6, 'D'], [5, 11, 'S'], [13, 11, 'D']]); // rim rivets
  for (const y of [5, 8, 11]) { put(g, 1, y, 'S'); put(g, 2, y, 'L'); }
  S.relicBash = toRows(outline(g));
}
// relicHotStreak (16x16): HOT STREAK, a red 7 on fire (flames licking up off its top bar)
S.relicHotStreak = lit(16, 16, [
  '................',
  '..........Y.....',
  '....Y....YO.....',
  '...YO...YOO..Y..',
  '...OOY.YOYO.YO..',
  '..YOYOYOYYOYOO..',
  '..OYYOOYYOOYOo..',
  '..MRRRRRRRRRRr..',
  '..RRRRRRRRRRRr..',
  '..rrrrrrrRRRr...',
  '........RRRr....',
  '.......RRRr.....',
  '......MRRr......',
  '......RRr.......',
  '.....MRRr.......',
  '.....rrr........',
]);
// relicBelt (16x16): WHETSTONE BELT, a brown belt with a gold buckle and a pouch holding a grey whetstone
S.relicBelt = lit(16, 16, [
  '................',
  '.........LS.....',
  '........LLLS....',
  '........LWSD....',
  '........LSSD....',
  '........LSDD....',
  '.......wwwwwB...',
  '.......wBBBBb...',
  '.YYYYG.wBGBBb...',
  'wYwwwGwwBBBBbwww',
  'BYBYBGBwBBBBbBBB',
  'bYbbbgbwBBBBbbbb',
  '.GGGgg.wBBBBb...',
  '.......wBBBBb...',
  '.......bbbbbb...',
]);
// relicRainmaker (16x16): RAINMAKER, a little storm cloud raining green banknotes and gold coins
S.relicRainmaker = lit(16, 16, [
  '................',
  '.....WWL........',
  '...WWWWLLWL.....',
  '..WWLLLLLLLLS...',
  '.WLLLLLLLLLLSS..',
  '.LLLLLLLLLLSSSD.',
  '..SSSSSSSSSSDD..',
  '................',
  '.XXXXZ..WYG.....',
  '.XZzZz..YGg.....',
  '.ZZZzz..Ggg.....',
  '..........XXXXZ.',
  '...WYG....XZzZz.',
  '...YGg....ZZZzz.',
  '...Ggg..........',
  '................',
]);
// relicSlushFund (16x16): SLUSH FUND, a tied burlap money bag with a gold cord and a gold $
S.relicSlushFund = lit(16, 16, [
  '................',
  '.....wB..wB.....',
  '......wBwB......',
  '.....GYYYGg.....',
  '......wBBb......',
  '.....wwBBBb.....',
  '....wwBBYBBb....',
  '...wwBBYYYBBb...',
  '..wwBBBYBBBBBb..',
  '..wwBBBYYYBBBb..',
  '..wBBBBBBYBBBb..',
  '..wBBBBYYYBBbb..',
  '..BBBBBBYBBBbb..',
  '...BBBBBBBBbb...',
  '....bbbbbbbb....',
  '................',
]);
// relicTipJar (16x16): TIP JAR, a glass jar with a label strip, gold coins in the bottom and a folded bill sticking out
S.relicTipJar = lit(16, 16, [
  '................',
  '........XXXXZ...',
  '.......XZzZz....',
  '......XZZZz.....',
  '...LLLXZzzLLS...',
  '....CWCZzCCA....',
  '...CWCCCCCCCA...',
  '...TTTTTTTTTt...',
  '...ttttttttts...',
  '...CWCCCCCCCA...',
  '...CWCCYGCCCA...',
  '...CWYGYWGYGA...',
  '...AYGGYGGYgN...',
  '....AAAAAAAN....',
  '................',
  '................',
]);
// ---------------------------------------------------------------- per-character relics (16x16)
// relicTower (16x16): TOWER SHIELD, a tall blue tower shield with a gold rim and a gold cross
S.relicTower = lit(16, 16, [
  '................',
  '...YGGGGGGGGg...',
  '...YAAUUUUUNg...',
  '...YAUUYGUUNg...',
  '...YAUUYGUUNg...',
  '...YAYYYGGgNg...',
  '...YAUUYGUUNg...',
  '...YAUUYGUUNg...',
  '...YAUUYgUUNg...',
  '...YAUUUUUUNg...',
  '...YAUUUUUNNg...',
  '...YUUUUUNNNg...',
  '...GUUUUNNNNg...',
  '....GGGGGggg....',
  '................',
  '................',
]);
// relicHeadsman (16x16): HEADSMAN, a big executioner's axe, a grey crescent head on a long brown handle
S.relicHeadsman = lit(16, 16, [
  '................',
  '....WL.....SD...',
  '...WLS.....Bb...',
  '...WLSSSSSSBbS..',
  '...WLSSSSSDBbD..',
  '...WLSSSSDDBbD..',
  '...WLSSDDDDBb...',
  '...WLSD....Bb...',
  '....WD.....Bb...',
  '...........Bb...',
  '...........Bb...',
  '...........Bb...',
  '...........bb...',
  '...........Bb...',
  '...........DD...',
  '................',
]);
// relicCapacitor (16x16): CAPACITOR, a blue cylindrical capacitor with a steel cap, two leads and a yellow bolt
S.relicCapacitor = lit(16, 16, [
  '................',
  '.....LLLLLS.....',
  '....LWLLLLSD....',
  '....DSSSSSDD....',
  '....AUUUYYNN....',
  '....AUUYYUNN....',
  '....AUYYYYNN....',
  '....AUUYYUNN....',
  '....AUYYUUNN....',
  '....AUYUUUNN....',
  '....AUUUUUNN....',
  '....SSSSSSDD....',
  '.....SDDDDD.....',
  '......L..L......',
  '......S..S......',
  '................',
]);
// relicLivewire (16x16): LIVE WIRE, a red cable snaking up to a frayed cut end of copper strands throwing yellow sparks
S.relicLivewire = lit(16, 16, [
  '................',
  '..........Y.....',
  '.....Y...YWY..Y.',
  '..........Y.....',
  '.......O.a..o...',
  '........OaOo....',
  '.........Mr.....',
  '.........Rr.....',
  '.........Rr.....',
  '.........Rr.....',
  '........MRr.....',
  '.......MRrr.....',
  '.....MRRrr......',
  '.MRRRRRrr.......',
  '.rrrrrrr........',
  '................',
]);
// relicEncore (16x16): ENCORE, red theatre curtains drawn back on a gold rod, a gold star on the stage between them
S.relicEncore = lit(16, 16, [
  '................',
  '.YGGGGGGGGGGGGg.',
  '.MRRRRRRRRRRRRr.',
  '.RRrRRrRRrRRrRr.',
  '.MRrRrvvvvRrRrr.',
  '.MRrRrvYGvRrRrr.',
  '.MRrRYYWYGgrRrr.',
  '.MRrRvYYGgvrRrr.',
  '.MRrvYGvvGgvRrr.',
  '.YGgvvvvvvvvYGg.',
  '.MRrvvvvvvvvRrr.',
  '.MRrRvvvvvvrRrr.',
  '.MRrRrvvvvRrRrr.',
  '.MRrRrRvvrRrRrr.',
  '.wwwwwwwwwwwwwB.',
  '................',
]);
// relicWildwheel (16x16): WILD WHEEL, a rainbow prize wheel with a gold rim and hub, a steel pointer on top
{
  const g = grid(16, 16);
  const cx = 7.5, cy = 8.5, segs = ['R', 'O', 'Y', 'e', 'U', 'V'];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > 6.2) continue;
    if (d > 5.2) { put(g, x, y, dx + dy > 2 ? 'g' : 'G'); continue; }
    if (d < 1.3) { put(g, x, y, dx + dy < 0 ? 'Y' : 'G'); continue; }
    const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
    put(g, x, y, segs[Math.floor(a * 6 + 0.25) % 6]);
  }
  put(g, 4, 6, 'W');
  stamp(g, 6, 0, ['LLLS', ' WS ', ' LS ']);
  S.relicWildwheel = toRows(outline(g));
}
// relicDownpour (16x16): DOWNPOUR, a dark storm cloud raining red-and-white casino chips
S.relicDownpour = lit(16, 16, [
  '................',
  '......SSSS......',
  '..SSSSSDDDSS....',
  '.SSDDDDDDDDDDS..',
  '.SDDDDDDDDDDDDD.',
  '..kkkkkkkkkkkk..',
  '................',
  '........RWR.....',
  '..RWR...WrW.....',
  '..WrW...........',
  '...........RWR..',
  '.....RWR...WrW..',
  '.....WrW........',
  '..RWR...........',
  '..WrW...........',
  '................',
]);
// relicCoup (16x16): COUP DE GRACE, a sword plunging point-down, a red-gold spark flaring at its tip
S.relicCoup = lit(16, 16, [
  '................',
  '......YGg.......',
  '......wBb.......',
  '......wBb.......',
  '..YGGGGGGGGGg...',
  '...g..WLS..g....',
  '......WLS.......',
  '......WLS.......',
  '......WLS.......',
  '......WLS.......',
  '.......LS.......',
  '.......W........',
  '......RYR.......',
  '.....RYWYR......',
  '......RYR.......',
  '................',
]);
// relicCompound (16x16): COMPOUND, a jaunty stack of gold coins beside a green up-arrow
S.relicCompound = lit(16, 16, [
  '................',
  '................',
  '...YYYYG....e...',
  '..YWYYYYG..EeQ..',
  '..GYYYYGg.EeeeQ.',
  '..gGgGgGg..EeQ..',
  '.YYYYYYYG..EeQ..',
  '.gGgGgGgg..EeQ..',
  '..YYYYYYYG.EeQ..',
  '..gGgGgGgg.EeQ..',
  '.YYYYYYYG..EeQ..',
  '.gGgGgGgg..EeQ..',
  '..YYYYYYYG.EQQ..',
  '..gGgGgGgg......',
  '................',
  '................',
]);
// relicMeltdown (16x16): MELTDOWN, a cracked, overheating orange-red core bulb on a steel base, a yellow bolt inside
S.relicMeltdown = lit(16, 16, [
  '................',
  '.....aOOOOo.....',
  '.Y..aOROYYOo....',
  '...aORKOYYOOo.Y.',
  '...ORORYYOOKo...',
  '...OOROYYYYOo...',
  '...oOOOOYYKOo...',
  '....oOOYYOKo....',
  '....oKOYOOOo....',
  '.....oOOOOo.....',
  '.....LSSSSD.....',
  '.....SDDDDD.....',
  '......LSSD......',
  '.......DD.......',
  '................',
  '................',
]);
// relicPulse (16x16): PULSE, a blue shockwave ring with a yellow bolt crackling in its centre
{
  const g = grid(16, 16);
  const cx = 7.5, cy = 7.5;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d < 4.9 || d > 6.6) continue;
    put(g, x, y, dx + dy < -3 ? 'A' : dx + dy > 3 ? 'N' : 'U');
  }
  put(g, 3, 3, 'C');
  stamp(g, 6, 4, ['  WY ', ' YY  ', 'YYYYY', '  YG ', ' YG  ', ' G   ']);
  S.relicPulse = toRows(outline(g));
}
// relicDeckdrum (16x16): DECK DRUM, a small red drum with gold hoops, a spade playing card leaning against it
S.relicDeckdrum = lit(16, 16, [
  '................',
  '................',
  '.......WTTTt....',
  '.......WKTTt....',
  '.......WTTTt....',
  '........WTKTt...',
  '..FFFf..WKKKt...',
  '.FWFFFf.WKKKt...',
  '.GGGGGg.WTKTt...',
  '.RWRRWr..WTTTt..',
  '.RRWWRr..WTTTt..',
  '.MRRRRr..WTTKt..',
  '.GGGGGg..WTTTt..',
  '.........ttttt..',
  '................',
  '................',
]);
// relicWildcard (16x16): WILD CARD, a playing card with a rainbow border and a gold star in the middle
{
  const g = grid(16, 16);
  const x0 = 3, x1 = 12, y0 = 1, y1 = 14, segs = ['R', 'O', 'Y', 'e', 'U', 'V'];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const corner = (x === x0 || x === x1) && (y === y0 || y === y1);
    if (corner) continue;
    const edge = x === x0 || x === x1 || y === y0 || y === y1;
    if (edge) {
      // walk the rim clockwise from the top-left so the six colours run round it in order
      const w = x1 - x0, h = y1 - y0;
      const i = y === y0 ? x - x0 : x === x1 ? w + (y - y0) : y === y1 ? w + h + (x1 - x) : 2 * w + h + (y1 - y);
      put(g, x, y, segs[Math.floor(i * 6 / (2 * (w + h))) % 6]);
    } else put(g, x, y, x === x0 + 1 || y === y0 + 1 ? 'W' : 'T');
  }
  stamp(g, 5, 5, ['   Y   ', '  YYG  ', 'YYYWYGG', ' YYYYG ', '  YYGg ', ' YG Gg ', ' g   g ']);
  S.relicWildcard = toRows(outline(g));
}
// relicLoadedreel (16x16): LOADED REEL, a gold-framed reel window showing a rainbow wild star, arrows pushing outward
S.relicLoadedreel = lit(16, 16, [
  '................',
  '....YGGGGGGg....',
  '....GSSSSSSg....',
  '....GLLLLLLg....',
  '....GTTTTTTg....',
  '....GTTRRTTg....',
  '..Y.GTTOOTTg.G..',
  '.YG.GYYYYYYg.Gg.',
  '.YG.GTeeeeTg.Gg.',
  '..G.GTUUUUTg.g..',
  '....GVVTTVVg....',
  '....GTTTTTTg....',
  '....GLLLLLLg....',
  '....GSSSSSSg....',
  '....Gggggggg....',
  '................',
]);
// relicBracelet (16x16): CHARM BRACELET, a gold chain loop with three charms hanging (red heart, blue gem, green clover)
S.relicBracelet = lit(16, 16, [
  '................',
  '................',
  '....YGYGYGY.....',
  '..YG.......GY...',
  '.G...........G..',
  '.Y...........g..',
  '.G...........g..',
  '..gG.......Gg...',
  '...gGgGgGgGg....',
  '...Y...Y...Y....',
  '..MYR.CAA.EYe...',
  '..RRr.AUN.eeQ...',
  '...r...N...Q....',
]);
// relicMetronome (16x16): METRONOME, a wooden truncated pyramid on a plinth, a silver pendulum arm with a sliding weight
{
  const g = grid(16, 16);
  hline(g, 6, 9, 2, 'w');
  const spans = [[5, 10], [5, 10], [5, 10], [4, 11], [4, 11], [4, 11], [3, 12], [3, 12], [3, 12], [2, 13], [2, 13]];
  spans.forEach(([a, b], i) => { for (let x = a; x <= b; x++) put(g, x, 3 + i, x <= a ? 'w' : x >= b ? 'b' : 'B'); });
  hline(g, 1, 14, 14, 'b'); put(g, 1, 14, 'B');
  // front face: a dark slot the arm swings in, with tick marks either side
  for (let y = 4; y <= 12; y++) for (let x = 7; x <= 9; x++) put(g, x, y, 'b');
  plot(g, [[6, 6, 'w'], [6, 8, 'w'], [6, 10, 'w'], [10, 6, 'g'], [10, 8, 'g'], [10, 10, 'g']]);
  // pendulum arm: pivot low, leaning right, poking out above the top
  for (let y = 8; y <= 12; y++) put(g, 8, y, 'L');
  for (let y = 0; y <= 7; y++) put(g, 9, y, 'L');
  put(g, 9, 0, 'W');
  // sliding weight
  plot(g, [[8, 5, 'L'], [9, 5, 'W'], [10, 5, 'S'], [8, 6, 'S'], [9, 6, 'S'], [10, 6, 'D']]);
  put(g, 8, 13, 'G'); // brass pivot
  S.relicMetronome = toRows(outline(g));
}
// relicSnakeEyes (16x16): SNAKE EYES, two white dice side by side, each showing a single red pip
{
  const g = grid(16, 16);
  const die = (x0, y0) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++)
      put(g, x0 + x, y0 + y, x === 6 || y === 6 ? 't' : x === 5 || y === 5 ? 'u' : x === 0 || y === 0 ? 'W' : 'T');
    stamp(g, x0 + 2, y0 + 2, ['rMr', 'RRr', 'rrd']); // round pip: a 3x3 blob, darker corners, pink glint
  };
  die(1, 7);
  // the right die sits higher and in front: give it its own dark border so the overlap reads
  for (let y = 7; y <= 10; y++) put(g, 6, y, 'K');
  hline(g, 6, 13, 10, 'K');
  die(7, 3);
  S.relicSnakeEyes = toRows(outline(g));
}
// relicPitBoss (16x16): PIT BOSS, slicked-back hair, shades, a moustache, black suit and a red bow tie
S.relicPitBoss = lit(16, 16, [
  '................',
  '.....kkkkkk.....',
  '....kllllkkk....',
  '....kkkkkkkkk...',
  '....kFFFFFFkk...',
  '....FFFFFFFFk...',
  '....FKKkkKKf....',
  '....FFFFFFFf....',
  '....FFkkkkFf....',
  '.....fFFFFf.....',
  '......fFFf......',
  '...kWMRrrRRWk...',
  '..kkkRRrrRrkkk..',
  '.kklkkWTTWkklkk.',
  '.kklkkkWTkkklkk.',
  '.kkkkkkkkkkkkkk.',
]);
// relicCoil (16x16): TESLA COIL, a copper coil tower on a steel base with a crackling blue spark ball on top
S.relicCoil = lit(16, 16, [
  '..C..........C..',
  '...C..CAAU..C...',
  '....ACWCAUNA....',
  '......AAUN......',
  '.......DD.......',
  '.....aOWOOo.....',
  '......bbbb......',
  '.....aOOOOo.....',
  '......bbbb......',
  '....aOOOOOOo....',
  '.....bbbbbb.....',
  '....aOOOOOOo....',
  '.....bbbbbb.....',
  '...aOOOOOOOOo...',
  '..LSSSSSSSSSSD..',
]);
// relicTaxMan (16x16): TAX MAN, a green eyeshade over an open ledger, a gold coin stamped with a tick
{
  const g = grid(16, 16);
  stamp(g, 0, 1, [
    '....QQQQQQQQ....',
    '...eEEEEEEEEe...',
    '..eEEWEEEEEEEe..',
    '..qeeeeeeeeeeq..',
  ]);
  stamp(g, 1, 6, [
    'WTTTTTtTTTTTt',
    'TtttTTtTtttTt',
    'TTTTTTtTTTTTt',
    'TtttTTtTtttTt',
    'TTTTTTtTTTTTt',
    'TtttTTtTtttTt',
    'ttttttbtttttt',
  ]);
  stamp(g, 9, 9, [
    '.KKKKK.',
    'KYYYGgK',
    'KYWYGgK',
    'KYGGGgK',
    'KYGGGgK',
    'KgGGggK',
    '.KKKKK.',
  ].map((r) => r.replace(/\./g, ' ')));
  plot(g, [[10, 12, 'Q'], [11, 13, 'Q'], [12, 12, 'Q'], [13, 11, 'Q']]);
  S.relicTaxMan = toRows(outline(g));
}
// ---------------------------------------------------------------- slot machine TRIM crests (16x16)
// One medallion family: a 2px rim in the trim's colours (lit top-left), a 1px inset groove, a deep field,
// and a centred motif. Drawn on the top edge of the player's frame and in the TROPHIES trim picker.
/** pal: { hi, mid, lo, groove, field, stud? }; motif rows stamped at (mx,my), ' ' = leave. */
function crest(pal, motif, mx, my, opts = {}) {
  const g = grid(16, 16);
  const cx = 7.5, cy = opts.cy ?? 7.5, R = opts.r ?? 6.9;
  const inDisc = (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= R * R;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!inDisc(x, y)) continue;
    const d = Math.hypot(x - cx, y - cy);
    if (d > R - (opts.rim ?? 1.75)) {
      // rim: lit along the upper-left arc, shadowed along the lower-right arc
      const s = (x - cx) + (y - cy);
      put(g, x, y, s < -3 ? pal.hi : s > 3 ? pal.lo : pal.mid);
    } else if (d > R - (opts.rim ?? 1.75) - 0.85) {
      put(g, x, y, pal.groove);
    } else put(g, x, y, pal.field);
  }
  if (pal.gloss !== false && opts.gloss !== false) { put(g, 4, Math.floor(cy - 5.5), 'W'); put(g, 3, Math.floor(cy - 4.5), 'W'); }
  if (pal.stud) [[7, Math.round(cy + R - 0.6)], [Math.round(cx + R - 0.6), Math.round(cy)], [Math.round(cx - R + 0.6), Math.round(cy)]]
    .forEach(([x, y]) => put(g, x, y, pal.stud));
  stamp(g, mx, my, motif);
  if (opts.extra) opts.extra(g);
  return toRows(outline(g));
}
// trimClassic: CLASSIC, a gold coin struck with a red 7
S.trimClassic = crest({ hi: 'Y', mid: 'G', lo: 'g', groove: 'g', field: 'G' }, [
  'WRRRRR',
  'rrrrRr',
  '   RRr',
  '  RRr ',
  '  RRr ',
  '  RRr ',
], 5, 5);
// trimBronze: BRONZE, a bronze bell with an orange clapper
S.trimBronze = crest({ hi: 'a', mid: 'w', lo: 'B', groove: 'b', field: 'b' }, [
  '  aw  ',
  ' aWwB ',
  ' awwB ',
  ' awwB ',
  'awwwBB',
  'BBBBBB',
  '  OO  ',
], 5, 4);
// trimSilver: SILVER, a polished steel horseshoe (open end up, lucky side)
S.trimSilver = crest({ hi: 'W', mid: 'L', lo: 'S', groove: 'D', field: 'k' }, [
  'WL    SD',
  'LS    SD',
  'LS    SD',
  'LSS  SSD',
  ' LSSSSD ',
  '  DDDD  ',
], 4, 5);
// trimNeon: NEON, a hot-pink star with a magenta glow on a cyan rim
S.trimNeon = crest({ hi: 'C', mid: 'i', lo: 'c', groove: 'n', field: 'P' }, [
  '   x   ',
  '  xWx  ',
  'xxxMxxx',
  ' xMMMs ',
  '  xMs  ',
  ' xs xs ',
  ' s   s ',
], 4, 4, {
  extra: (g) => {
    // soft glow: field cells touching the star turn dark magenta
    const glow = [];
    for (let y = 3; y <= 12; y++) for (let x = 3; x <= 12; x++)
      if (g[y][x] === 'P' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => ['x', 'M', 'W'].includes(get(g, x + dx, y + dy)))) glow.push([x, y]);
    glow.forEach(([x, y]) => put(g, x, y, 's'));
  },
});
// trimVelvet: VELVET, a glossy red heart on deep velvet
S.trimVelvet = crest({ hi: 'M', mid: 'R', lo: 'r', groove: 'd', field: 'd' }, [
  'RR  RR',
  'WMRRRr',
  'MRRRRr',
  ' RRRr ',
  '  Rr  ',
], 5, 5);
// trimEmerald: EMERALD, a step-cut green gem (bright frame, flat table, dark lower facets)
S.trimEmerald = crest({ hi: 'E', mid: 'e', lo: 'Q', groove: 'q', field: 'q' }, [
  ' EEEEe ',
  'EEWEEeQ',
  'EEeeeQQ',
  'EEeEeQQ',
  'EeQQQQQ',
  ' QQQQq ',
], 4, 5);
// trimDiamond: DIAMOND, a faceted brilliant on deep navy
S.trimDiamond = crest({ hi: 'W', mid: 'C', lo: 'c', groove: 'N', field: 'N' }, [
  ' CWCA ',
  'CWCCAc',
  'cCCAAc',
  ' cCAc ',
  '  cA  ',
  '   c  ',
], 5, 5);
// trimObsidian: OBSIDIAN, a jagged black shard with violet glints on a soot field
S.trimObsidian = crest({ hi: 'V', mid: 'v', lo: 'k', groove: 'k', field: 'v', gloss: false }, [
  '    J ',
  '   JW ',
  '  JVK ',
  '  JKKk',
  ' JVKKk',
  ' JKKKk',
  '  VKk ',
  '   k  ',
], 4, 4);
// trimHouse: THE HOUSE, a jewelled crown over a ruby-studded gold medallion struck with 777 (the most ornate)
S.trimHouse = crest({ hi: 'Y', mid: 'G', lo: 'g', groove: 'g', field: 'r', stud: 'R' }, [
  'YY YY YY',
  ' G  G  G',
  'G  G  G ',
  'G  G  G ',
], 4, 8, {
  cy: 8.5, r: 6.45, rim: 1.2, gloss: false,
  extra: (g) => stamp(g, 3, 0, [
    ' W  YG  G ',
    'YR YRRG Rg',
    'YYYYGGGGGg',
    'GYWYGGGGgg',
  ]),
});
/** Ticket stub (24x16): notched ends, 1px rim lit top-left, perforation, icon on the left, mark on the stub. */
function voucher(pal, icon, mark) {
  const g = grid(24, 16);
  const cut = (x, y) => (Math.hypot(x - 0.5, y - 7.5) < 2.2) || (Math.hypot(x - 22.5, y - 7.5) < 2.2);
  const has = (x, y) => x >= 1 && x <= 22 && y >= 2 && y <= 13 && !cut(x, y);
  for (let y = 2; y <= 13; y++) for (let x = 1; x <= 22; x++) {
    if (!has(x, y)) continue;
    const up = !has(x, y - 1) || !has(x - 1, y), dn = !has(x, y + 1) || !has(x + 1, y);
    put(g, x, y, up ? pal.hi : dn ? pal.lo : y === 12 ? pal.shade : pal.fill);
  }
  put(g, 2, 3, 'W'); put(g, 3, 3, 'W');
  for (let y = 3; y <= 12; y++) if (y % 2) put(g, 16, y, pal.perf);
  stamp(g, 5, 5, icon);
  stamp(g, 18, 5, mark);
  return toRows(outline(g));
}
{
  // tiny prize wheel (7x7): six coloured wedges, dark rim, white hub
  const wheel = [];
  const cols = ['R', 'Y', 'U', 'e', 'O', 'V'];
  for (let y = 0; y < 7; y++) {
    let r = '';
    for (let x = 0; x < 7; x++) {
      const dx = x - 3, dy = y - 3, d = Math.hypot(dx, dy);
      if (d > 3.4) r += ' ';
      else if (d > 2.5) r += 'K';
      else if (d < 0.5) r += 'W';
      else r += cols[Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 6) % 6];
    }
    wheel.push(r);
  }
  S.voucherBonus = voucher({ hi: 'Y', lo: 'g', fill: 'T', shade: 'I', perf: 'g' }, wheel,
    [' Y ', 'YWY', ' Y ', '   ', 'ggg', '   ', 'gg ']);
  const chest = [
    ' KKKKK ',
    'KYYYYGK',
    'KGGJGgK',
    'KBBVBbK',
    'KBBBBbK',
    'KKKKKKK',
  ];
  S.voucherRelic = voucher({ hi: 'M', lo: 'v', fill: 'J', shade: 'V', perf: 'v' }, chest,
    [' W ', 'WJV', ' V ', '   ', 'vvv', '   ', 'vv ']);
}
// rushEmpty (16x16): empty dark slot cell, soot frame, inset (shadow top-left, faint lit edge bottom-right)
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue; // rounded corners
    const ring = x === 0 || y === 0 || x === 15 || y === 15;
    put(g, x, y, ring ? 'k' : (x === 1 || y === 1) ? 'K' : (x === 14 || y === 14) ? 'p' : 'P');
  }
  S.rushEmpty = toRows(g);
}
// rushJunk (16x16): dull grey faded casino chip with a dark X scratched across it ("miss")
{
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy);
    if (d > 6.6) continue;
    let c;
    if (d > 4.9) c = (Math.abs(dx) < 1.2 || Math.abs(dy) < 1.2) ? 'I' : (x + y < 15 ? 'H' : 'h');
    else c = x + y >= 19 ? 'h' : 'H';
    if (d < 4.2 && (x === y || x === y + 1 || x + y === 15 || x + y === 16)) c = 'k';
    put(g, x, y, c);
  }
  put(g, 4, 4, 'I'); put(g, 5, 3, 'I'); // faint gloss
  S.rushJunk = toRows(outline(g));
}
/** Cut gem badge (12x12); pal maps facet tones a (brightest) .. d (darkest); optional girdle row override. */
function tierGem(pal, girdle) {
  const rows = [
    '............',
    '............',
    '...abbbbc...',
    '..abbccbcd..',
    '.aabbccccdd.',
    '.bbbccccddd.',
    '..bccccddd..',
    '...cccddd...',
    '....ccdd....',
    '.....cd.....',
  ].map((r) => [...r].map((c) => pal[c] || c).join(''));
  if (girdle) rows[4] = '.' + girdle + '.';
  return lit(12, 12, rows);
}
S.tierCommon = tierGem({ a: 'W', b: 'L', c: 'S', d: 'D' });
S.tierUncommon = tierGem({ a: 'W', b: 'i', c: 'c', d: 'N' });
{
  const g = tierGem({ a: 'W', b: 'J', c: 'V', d: 'v' }, 'YYYGGGGGGg').map((r) => [...r]);
  // radiant gold rays in the free corners / above the crown
  plot(g, [[5, 0, 'Y'], [6, 0, 'Y'], [0, 0, 'Y'], [1, 1, 'G'], [11, 0, 'Y'], [10, 1, 'G'], [0, 11, 'G'], [11, 11, 'G'], [1, 8, 'Y'], [10, 8, 'Y']]);
  S.tierLegendary = toRows(g);
}
// wheelPointer (12x12): downward gold flapper with a steel pivot rivet
S.wheelPointer = lit(12, 12, [
  '............',
  '...YYYYGg...',
  '..YWWYYGGg..',
  '..YYYLSGGg..',
  '..YYYSDGGg..',
  '...YYYGGg...',
  '...YYGGGg...',
  '....YGGg....',
  '....YGgg....',
  '.....Gg.....',
]);

// ================================================================ FRONT END: title / menu / hiscores / loading / tutorial
/** Build one w-wide row from [x, 'chars', x, 'chars', ...] segments (' ' in a segment = leave transparent). */
function segRow(w, ...segs) {
  const a = Array(w).fill('.');
  for (let i = 0; i < segs.length; i += 2) [...segs[i + 1]].forEach((c, k) => { if (c !== ' ') a[segs[i] + k] = c; });
  return a.join('');
}
/** Fill-only glyph rows ('X' = ink) -> set of "x,y". */
const glyphCells = (rows, x0, y0) => {
  const s = new Set();
  rows.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === 'X') s.add(`${x0 + dx},${y0 + dy}`); }));
  return s;
};
/** Bevelled block lettering: face lit top-left (hi/top, mid by row band, lo on bottom/right edges),
 *  an extrusion offset (1,2) in `ext`, then its own K outline -- composited over whatever is below. */
function blockText(g, cells, { top, hi, upper, lower, lo, ext, split }) {
  const has = (x, y) => cells.has(`${x},${y}`);
  const L = grid(g[0].length, g.length);
  for (const k of cells) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 1], [1, 2], [0, 2]]) put(L, x + dx, y + dy, ext); }
  for (const k of cells) {
    const [x, y] = k.split(',').map(Number);
    const c = !has(x, y - 1) ? top : (!has(x + 1, y) || !has(x, y + 1)) ? lo : !has(x - 1, y) ? hi : y < split ? upper : lower;
    put(L, x, y, c);
  }
  outline(L);
  L.forEach((r, y) => r.forEach((c, x) => { if (c !== '.') put(g, x, y, c); }));
}

// logo (160x44): "SLOTS VS. SLOTS" marquee sign -- red lacquered casing ringed with chase bulbs (2 lit / 1 dark),
// gold inner trim, dark panel; big gold block letters with a brown extrusion, a red "VS." between the words
{
  const W = 160, H = 44, g = grid(W, H);
  // casing: rounded slab 1..158 x 1..42, 6px band, lit top-left
  for (let y = 1; y <= 42; y++) for (let x = 1; x <= 158; x++) {
    const cx = Math.min(x - 1, 158 - x), cy = Math.min(y - 1, 42 - y);
    if (cx + cy < 2) continue; // rounded corners
    const d = Math.min(cx, cy);
    let c;
    if (d === 0) c = (x - 1 === cx && cx <= cy) || (y - 1 === cy && cy <= cx) ? 'R' : 'd';
    else if (d <= 4) c = 'r';
    else if (d === 5) c = (x - 1 === cx && cx <= cy) || (y - 1 === cy && cy <= cx) ? 'g' : 'Y'; // inner gold trim, bevel reversed
    else if (d === 6) c = 'K'; // lip
    else c = 'P';
    if (d === 5 && (x === 6 || x === 153) && (y === 6 || y === 37)) c = 'G';
    put(g, x, y, c);
  }
  // top-left sheen along the casing
  for (let x = 4; x <= 60; x++) if (x % 7) put(g, x, 2, 'R');
  for (let y = 4; y <= 14; y++) put(g, 2, y, 'R');
  // chase bulbs (2x2) around the band, walked clockwise so the on/off rhythm is continuous
  const bulbs = [];
  for (let x = 3; x <= 155; x += 4) bulbs.push([x, 3]);
  for (let y = 7; y <= 35; y += 4) bulbs.push([155, y]);
  for (let x = 155; x >= 3; x -= 4) bulbs.push([x, 39]);
  for (let y = 35; y >= 7; y -= 4) bulbs.push([3, y]);
  bulbs.forEach(([x, y], i) => {
    const on = i % 3 !== 2;
    stamp(g, x, y, on ? ['WY', 'YG'] : ['Oo', 'oo']);
    put(g, x + 2, y + 1, 'd'); put(g, x + 1, y + 2, 'd'); // socket shadow
  });
  // faint panel twinkles
  plot(g, [[12, 10, 'p'], [30, 33, 'p'], [68, 11, 'p'], [92, 33, 'p'], [150, 10, 'p'], [124, 33, 'p'], [80, 10, 'p'], [81, 9, 'p'], [79, 10, 'p'], [80, 11, 'p'], [81, 10, 'p']]);
  plot(g, [[80, 10, 'T']]);
  // big letters, 9x18, 3px strokes
  const F = {
    S: ['.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', 'XXX...XXX', 'XXX......', 'XXX......', 'XXX......', 'XXXXXXXX.', 'XXXXXXXXX',
      '.XXXXXXXX', '......XXX', '......XXX', '......XXX', '......XXX', 'XXX...XXX', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.'],
    L: [...Array(15).fill('XXX......'), 'XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX'],
    O: ['.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', ...Array(12).fill('XXX...XXX'), 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.'],
    T: ['XXXXXXXXX', 'XXXXXXXXX', 'XXXXXXXXX', ...Array(15).fill('...XXX...')],
  };
  const big = new Set();
  const word = (x0) => [...'SLOTS'].forEach((ch, i) => glyphCells(F[ch], x0 + i * 11, 12).forEach((k) => big.add(k)));
  word(11); word(97);
  blockText(g, big, { top: 'W', hi: 'Y', upper: 'Y', lower: 'G', lo: 'g', ext: 'b', split: 21 });
  // "VS." 7x12 in red
  const V = ['XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XX...XX', 'XXX.XXX', '.XX.XX.', '.XXXXX.', '.XXXXX.', '..XXX..', '..XXX..', '...X...'];
  const s7 = ['.XXXXX.', 'XXXXXXX', 'XX...XX', 'XX.....', 'XX.....', 'XXXXXX.', '.XXXXXX', '.....XX', '.....XX', 'XX...XX', 'XXXXXXX', '.XXXXX.'];
  const vs = new Set([...glyphCells(V, 71, 15), ...glyphCells(s7, 80, 15), ...glyphCells(['XXX', 'XXX', 'XXX'], 89, 24)]);
  blockText(g, vs, { top: 'M', hi: 'R', upper: 'R', lower: 'R', lo: 'r', ext: 'd', split: 99 });
  plot(g, [[71, 15, 'W'], [81, 15, 'W'], [89, 24, 'W']]);
  S.logo = toRows(outline(g));
}

// menuBackdrop (64x40): heap of gold coins flanked by chip stacks, two dice tumbling in front
{
  const g = grid(64, 40);
  /** Side-on chip stack: elliptical top face, 3px chips (2 striped rows + dark seam), lit from the left. */
  const chipStack = (x0, yTop, n, [hi, mid, lo], stripe = 'W') => {
    const w = 12, yBody = yTop + 2, yEnd = yBody + n * 3 - 1;
    for (let y = yBody; y <= yEnd; y++) for (let x = x0; x < x0 + w; x++) {
      const v = (y - yBody) % 3, u = x - x0;
      let c = v === 2 ? lo : u === 0 ? hi : u === w - 1 ? lo : (u % 4 === 1) ? stripe : mid;
      if (v === 2 && u === 0) c = mid;
      put(g, x, y, c);
    }
    // top face
    stamp(g, x0, yTop, [' ' + hi.repeat(10) + ' ', hi + hi + stripe + mid.repeat(3) + stripe + mid.repeat(3) + lo]);
    stamp(g, x0 + 4, yTop + 1, [hi === 'W' ? 'SS' : 'WW']); // centre inlay gloss
    for (let x = x0; x < x0 + w; x++) put(g, x, yTop + 2, x === x0 ? hi : lo); // rim of the top chip
  };
  chipStack(2, 17, 6, ['M', 'R', 'r']);          // red, back left
  chipStack(11, 23, 4, ['A', 'U', 'N']);         // blue, front left
  chipStack(50, 11, 8, ['l', 'k', 'K'], 'T');   // black high-roller stack, back right
  chipStack(41, 22, 5, ['E', 'e', 'Q']);         // green, front right
  // coin heap in the middle, spilling
  layer(g, (h) => { coinHeap(h, 31, 37, 17, 15); });
  flatCoin(g, 6, 36); flatCoin(g, 52, 37); flatCoin(g, 23, 37);
  // dice: red die (showing 3) front-left, white die (showing 5) front-right
  layer(g, (h) => stamp(h, 14, 30, [
    'MMMMMMMR',
    'MWRRRRRr',
    'MRRRRRRr',
    'MRRWRRRr',
    'MRRRRRRr',
    'MRRRRRWr',
    'rrrrrrrd',
  ]));
  layer(g, (h) => stamp(h, 40, 30, [
    'WWWWWWWL',
    'WLLLLLLS',
    'WLKLLKLS',
    'WLLKLLLS',
    'WLKLLKLS',
    'LSSSSSSD',
    ' DDDDDD ',
  ]));
  S.menuBackdrop = toRows(outline(g));
}

// ---------------------------------------------------------------- menu icons (16x16)
// iconNewRun: slot lever mid-pull -- red gloss ball, steel shaft, gold pivot hub, motion ticks
S.iconNewRun = lit(16, 16, [
  '................',
  '...MMR..........',
  '..MWRRr...Y.....',
  '..MRRRr....Y....',
  '..RRRrr.....Y...',
  '...rrLS.........',
  '......LS........',
  '.......LS.......',
  '........LS......',
  '.........LS.....',
  '.........YGGg...',
  '........YWYGGg..',
  '........YYGGGg..',
  '......SSSGGggDD.',
  '......LLLLLLLSD.',
  '......DDDDDDDDD.',
]);
// iconTutorial: open book, lined left page, big red "?" on the right page, blue cover
S.iconTutorial = lit(16, 16, [
  '................',
  '................',
  '................',
  '..WTTT....TTTI..',
  '.WTTTTTg.TRRRTI.',
  '.TtttTTgTRRTRRI.',
  '.TTTTTTgTTTTRRI.',
  '.TtttTTgTTTRRTI.',
  '.TTTTTTgTTTRRTI.',
  '.TttTTTgTTTTTTI.',
  '.TTTTTTgTTTRRTI.',
  '.TtttTTgTTTRRTI.',
  'AUUUUUUgUUUUUUUN',
  '.NNNNNNgNNNNNNN.',
  '................',
]);
// iconCollection: violet card binder, gold rings on the spine, a card slotted in the window and one peeking out
S.iconCollection = lit(16, 16, [
  '................',
  '.......TTTT.....',
  '.......TRRt.....',
  '...JJJJTTTtVV...',
  '..YvJJJJJJJVVv..',
  '..GvJJVVVVVVVv..',
  '...vJTTTTTTVVv..',
  '...vJTWTTTtVVv..',
  '..YvJTTYYTtVVv..',
  '..GvVTYWYGtVVv..',
  '...vVTTGgTtVVv..',
  '...vVTttttt Vv..',
  '..YvVVVVVVVVVv..',
  '..GvVVVVVVVVvv..',
  '...vvvvvvvvvvv..',
  '................',
]);
// iconHiscores: gold trophy cup, loop handles, wooden plinth with a gold plate
S.iconHiscores = lit(16, 16, [
  '................',
  '...WYYYYYYYYg...',
  '.GGYWWYYYYGGgGg.',
  'G..YWYYYYYGGg..g',
  'G..YWYYYYYGGg..g',
  '.G.YYYYYYGGGg.g.',
  '..GGYYYYYGGggg..',
  '....YYYYGGgg....',
  '.....YYGGgg.....',
  '......YGg.......',
  '......YGg.......',
  '.....YYGGg......',
  '...wwwwwwwwB....',
  '...BBYYYGgBb....',
  '...bbbbbbbbb....',
  '................',
]);

// mysterySlot (16x16): dim grey card silhouette with a big "?" -- locked collection entry, deliberately low contrast
{
  const g = grid(16, 16);
  for (let y = 1; y <= 14; y++) for (let x = 2; x <= 13; x++) {
    if ((x === 2 || x === 13) && (y === 1 || y === 14)) continue;
    put(g, x, y, (x === 2 || y === 1) ? 'H' : (x === 13 || y === 14) ? 'h' : 'D');
  }
  const q = ['.XXXX.', 'XXXXXX', 'XX..XX', '....XX', '...XXX', '..XXX.', '..XX..', '......', '..XX..', '..XX..'];
  q.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === 'X') { put(g, 5 + dx + 1, 3 + dy + 1, 'h'); } }));
  q.forEach((r, dy) => [...r].forEach((c, dx) => { if (c === 'X') put(g, 5 + dx, 3 + dy, dy === 0 || dx === 0 ? 'H' : 'S'); }));
  S.mysterySlot = toRows(outline(g));
}

// ---------------------------------------------------------------- hiscore markers (12x12)
S.hsSkull = lit(12, 12, [
  '............',
  '...WWTTTt...',
  '..WTTTTTTt..',
  '.WTTTTTTTTt.',
  '.TKKKTTKKKt.',
  '.TKrKTTKrKt.',
  '.TTTTKKTTtt.',
  '..tTTTTTtt..',
  '...TKTKTt...',
  '...tTtTtt...',
]);
S.trophySmall = lit(12, 12, [
  '............',
  '...WYYYYg...',
  '.GGYWYYGGgg.',
  '.G.YWYYGGg.g',
  '..GYYYYGgg..',
  '...YYYGgg...',
  '....YGg.....',
  '....YGg.....',
  '...YYGGg....',
  '..wwwwwwB...',
  '..bbbbbbb...',
]);

// ---------------------------------------------------------------- loading-screen coin spin (16x16 x4)
// ellipse with horizontal radius rx; raised rim lit top-left, diamond pip stamped in the face (squashes with rx);
// the narrow frames show a sliver of the reeded edge on the trailing side (side = +1 right / -1 left)
function coinSpin(rx, side) {
  const g = grid(16, 16);
  const cy = 7.5, ry = 6.6, cx = 7.5 - side * (rx < 6 ? 1 : 0);
  const star = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..']; // diamond pip
  // edge sliver first (behind the face)
  if (side) for (let y = 1; y <= 14; y++) {
    const e = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    if (e < 0.3) continue;
    const xs = Math.round(cx + side * rx * e);
    for (let k = 1; k <= 2; k++) put(g, xs + side * k, y, y % 2 ? 'g' : 'G');
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const u = (x - cx) / Math.max(rx, 0.5), v = (y - cy) / ry, nd = Math.hypot(u, v);
    if (nd > 1.05) continue;
    let c;
    if (nd > 0.78) c = (u + v < -0.45) ? 'Y' : (u + v > 0.45) ? 'g' : 'G';
    else if (nd > 0.64 && rx >= 3) c = (u + v < -0.3) ? 'g' : 'G';
    else {
      c = 'Y';
      const si = Math.floor((u + 0.4) / 0.8 * 5), sj = Math.floor((v + 0.4) / 0.8 * 5);
      if (si >= 0 && si < 5 && sj >= 0 && sj < 5 && star[sj][si] === 'X') c = rx >= 3 ? 'G' : 'Y';
      else if (u < -0.25 && v < -0.25 && u + v > -1.0 && rx >= 3) c = 'W';
    }
    put(g, x, y, c);
  }
  return toRows(outline(g));
}
S.coinSpin0 = coinSpin(6.6, 0);
S.coinSpin1 = coinSpin(4, 1);
S.coinSpin2 = lit(16, 16, [
  '................',
  '.......Yg.......',
  '......YWGg......',
  '......YGYg......',
  '......YYGg......',
  '......YGYg......',
  '......WYGg......',
  '......YGYg......',
  '......YYGg......',
  '......YGYg......',
  '......YYGg......',
  '......YGYg......',
  '......YYGg......',
  '......YGgg......',
  '.......gg.......',
  '................',
]);
S.coinSpin3 = coinSpin(4, -1);

// tutorialPointer (12x12): chunky white arrow pointing DOWN, warm yellow bevel
S.tutorialPointer = lit(12, 12, [
  '............',
  '....WWTY....',
  '....WTTY....',
  '....WTTY....',
  '....WTTG....',
  '.WWWWTTYYYG.',
  '..WTTTTTYG..',
  '...WTTTYG...',
  '....WTYG....',
  '.....YG.....',
]);

// ================================================================ HERO PORTRAITS (24x24), facing RIGHT
// heroKnight: great helm with a slit visor and brass breaths, blue plume streaming back, steel pauldrons, blue tabard
S.heroKnight = lit(24, 24, [
  segRow(24),
  segRow(24, 13, 'AA'),
  segRow(24, 10, 'AAAUUA'),
  segRow(24, 7, 'AAAUUUUN'),
  segRow(24, 5, 'AAUUUN', 11, 'LWWLLS'),
  segRow(24, 3, 'AUUUNN', 9, 'LLWLLLLLSS'),
  segRow(24, 2, 'AUUNN', 8, 'LLLLLLLLLSSD'),
  segRow(24, 2, 'UUNN', 8, 'LLLLLLLLWSSDD'),
  segRow(24, 2, 'NN', 8, 'LLLLLLLLWSSDD'),
  segRow(24, 8, 'LLLSWWWWWWWLS'),
  segRow(24, 8, 'LLSSKKKKKKAKK'),
  segRow(24, 8, 'LLSSSLLLLWSSD'),
  segRow(24, 8, 'LLSSSLLLLWSGD'),
  segRow(24, 8, 'LSSSSLLLLWSSD'),
  segRow(24, 8, 'LSSSSLLLLWSGD'),
  segRow(24, 8, 'SSSSSSSSSSSDD'),
  segRow(24, 8, 'SSSDDSSSSSSDD'),
  segRow(24, 9, 'DDDDDDDDDDD'),
  segRow(24, 10, 'SLLSSSSSD'),
  segRow(24, 1, 'WLLLLLLS', 9, 'DSSSSSSSD', 18, 'WLLLS'),
  segRow(24, 0, 'LLLLLLLSD', 9, 'GYYYYYYYg', 18, 'LLLSSD'),
  segRow(24, 0, 'LLLLLSSSD', 9, 'UUUUYUUUN', 18, 'LLSSDD'),
  segRow(24, 0, 'LSSSSSSDD', 9, 'UUUYGgUUN', 18, 'SSSDDD'),
  segRow(24, 0, 'SSSSSDDDD', 9, 'AUUUgUUNN', 18, 'SSDDDD'),
]);
// heroMidas (id kept): CASH CASSIDY -- black gambler hat with a gold band and an ace tucked in it, gold-rimmed shades,
// sly gold-tooth grin with a toothpick, charcoal jacket over a money-green vest, red bow tie, a chip in the breast pocket
S.heroMidas = lit(24, 24, [
  segRow(24),
  segRow(24, 9, 'lkk', 13, 'lkkk'),
  segRow(24, 8, 'lkkTTkkkkkkk'),
  segRow(24, 8, 'lkkTRkkkkkkk'),
  segRow(24, 8, 'lkkTTkkkkkkk'),
  segRow(24, 1, 'l', 8, 'GYYGGGGGGGGg', 22, 'k'),
  segRow(24, 1, 'lllllllllllllllllllllk'),
  segRow(24, 2, 'kkkkkkkkkkkkkkkkkkkk'),
  segRow(24, 8, 'bbffffffffff'),
  segRow(24, 8, 'bbFFFFFFFFFF'),
  segRow(24, 7, 'fbbFF', 12, 'YGGGGGG'),
  segRow(24, 7, 'Ffb', 10, 'FF', 12, 'kWlkkkkk'),
  segRow(24, 8, 'bbFF', 12, 'FkkkkkkF'),
  segRow(24, 8, 'bFFFFFFFFFFFf'),
  segRow(24, 8, 'bFFFFFFFFFFK'),
  segRow(24, 8, 'bbFFKTTGTTK', 19, 'wwww'),
  segRow(24, 9, 'bbFFFKKKKf'),
  segRow(24, 10, 'bbfFFFFf'),
  segRow(24, 11, 'fffff'),
  segRow(24, 3, 'lkkkkkkT', 11, 'MRrR', 15, 'Tkkkkk'),
  segRow(24, 1, 'lllkkkkkT', 10, 'TTRrTT', 16, 'kkkkkk'),
  segRow(24, 0, 'llkkkkkkklQ', 11, 'TTTT', 15, 'eQkkkkkkk'),
  segRow(24, 0, 'lkRWRkkkklQQ', 12, 'TT', 14, 'QQQkkkkkkk'),
  segRow(24, 0, 'kkkkkkkkklQQG', 13, 'T', 14, 'GQQkkkkkkk'),
]);
// heroTesla: mad scientist -- wild white hair bursting back, brass goggles with a big cyan lens facing right,
// manic toothy grin, sparks crackling in the hair, lab coat with an orange collar
S.heroTesla = lit(24, 24, [
  segRow(24, 5, 'Y', 12, 'W'),
  segRow(24, 1, 'W', 6, 'Y', 9, 'W', 12, 'LW', 17, 'Y'),
  segRow(24, 2, 'WL', 7, 'WWLWLLW', 16, 'W'),
  segRow(24, 0, 'Y', 2, 'LWWLWLLLWLLLLWL'),
  segRow(24, 1, 'WLLLSLLLLLLSLLSL'),
  segRow(24, 0, 'WLLSLLSSLLFFFFSL'),
  segRow(24, 2, 'LSLLSSFFFFFFFf'),
  segRow(24, 1, 'WLSSLSFFFFFFFFFf'),
  segRow(24, 2, 'LSLLS', 7, 'gGGGGGGGgGGg'),
  segRow(24, 3, 'SLLS', 7, 'GFFFgGCCWCg'),
  segRow(24, 2, 'YLSS', 7, 'FFFFGCWCCcG'),
  segRow(24, 3, 'LSS', 7, 'FFFFGCCCccG'),
  segRow(24, 3, 'SS', 6, 'FFFFFFgGccGg', 18, 'Ff'),
  segRow(24, 5, 'fFFFFFFFgggFFf'),
  segRow(24, 6, 'fFFFFFFFFFFFf'),
  segRow(24, 6, 'fFFFFKKKKKKKf'),
  segRow(24, 7, 'fFFFKTWTWTKf'),
  segRow(24, 7, 'fFFFFKKKKKf'),
  segRow(24, 8, 'ffFFFFFFf'),
  segRow(24, 3, 'WLLL', 9, 'ffffff', 15, 'LLLS'),
  segRow(24, 1, 'WLLLLLO', 9, 'OOOOOO', 15, 'OLLLSSD'),
  segRow(24, 0, 'WLLLLLLLOo', 10, 'TT', 12, 'Oo', 14, 'oOLLSSSD'),
  segRow(24, 0, 'LLLLLLLLLS', 10, 'TTCC', 14, 'SLLLLSSDD'),
  segRow(24, 0, 'LLLLLLLLLSS', 11, 'TCc', 14, 'SLLLSSSDD'),
]);
// heroJoker: jester -- two-tone cap (violet / pink) flopping back with gold bells, pale face, pink diamond
// on the cheek, narrowed eye and a sly lopsided grin, pointed ruff collar
S.heroJoker = lit(24, 24, [
  segRow(24, 1, 'YY'),
  segRow(24, 0, 'YWYG', 13, 'YY'),
  segRow(24, 0, 'GYGg', 5, 'VV', 12, 'YWYG'),
  segRow(24, 1, 'gg', 3, 'JVVVV', 10, 'MMGYGg'),
  segRow(24, 3, 'JJVVVVV', 10, 'MMMgg'),
  segRow(24, 4, 'JVVVVVVMMMMMm'),
  segRow(24, 4, 'VVVVVVvMMMMMMm'),
  segRow(24, 3, 'JVVVVVvMMMMMMMmm'),
  segRow(24, 3, 'YYYGGGGYYYYGGGGgg'),
  segRow(24, 4, 'VVVV', 8, 'TTTTTTTTTu'),
  segRow(24, 4, 'VVVv', 8, 'TTTTTTKKKT'),
  segRow(24, 4, 'VVv', 7, 'TTTTTTTTuKT'),
  segRow(24, 5, 'Vv', 7, 'TuTTTTMTTTTT'),
  segRow(24, 5, 'Vv', 7, 'TTTTTMMMTTuu'),
  segRow(24, 6, 'v', 7, 'TTTTTTMTTTu'),
  segRow(24, 7, 'uTTTTTTTKK'),
  segRow(24, 7, 'uTTTKKKKRK'),
  segRow(24, 8, 'uTTTTTTTu'),
  segRow(24, 9, 'uuuuuu'),
  segRow(24, 2, 'M', 5, 'VVVMMM', 11, 'VVVMMM', 18, 'V'),
  segRow(24, 1, 'MMmVVVVvMMMmVVVvMMMmVV'),
  segRow(24, 0, 'JVVVVvMMMmmVVVvvMMMmmVVv'),
  segRow(24, 0, 'VVVVvvMMMMmVVVVvMMMmmVvv'),
  segRow(24, 0, 'VVVvvvMMMmmVVVvvMMmmmvvv'),
]);

// ================================================================ THE JUKEBOX (DJ DECIBEL)
// Teal lacquer + chrome, warm orange / pink / cyan bubble tubes; the attack symbol is an apricot NOTE.
// note (16x16): THE JUKEBOX's attack symbol, two beamed eighth notes with a teal sound-wave arc either side
S.note = lit(16, 16, [
  '................',
  '................',
  '....aWaaaaaa....',
  '....aOOOOOOo....',
  '..i.aO....aO.i..',
  '.i..aO....aO..i.',
  '.i..aO....aO..i.',
  '.j..aO....aO..j.',
  '..j.aO....aO.j..',
  '....aO..WaaO....',
  '..WaaO.aaOOO....',
  '.aOOOo.aOOOo....',
  '.aOOOo..ooo.....',
  '..ooo...........',
  '................',
  '................',
]);

// jukebox cabinet: teal lacquer body with fluting, chrome trim, an arched crown ringed by a glowing bubble tube
// (orange -> pink -> cyan), an EQ bar display in the marquee, bubble tubes up both sides, a chrome speaker grille
{
  const EQ = [3, 5, 7, 6, 4, 6, 7, 5, 3, 4, 6, 5, 2]; // bar heights, 2px bars on a 3px pitch from x=5
  S.cabinetJukebox = cabinet({
    body: ['i', 'j', 'n', 'K'], trim: ['L', 'S', 'D'], rim: ['W', 'L', 'S'], panel: ['n', 'K', 'K'], bulbs: ['a', 'o'],
    knob: ['a', 'O', 'o'],
    bodyFx: (x, y, c) => (c === 'j' && x % 5 === 0 && y > 19 ? 'n' : c),
    panelFx: (x, y) => {
      const i = Math.floor((x - 5) / 3), k = (x - 5) % 3;
      if (x < 5 || i >= EQ.length || k === 2) return 'P';
      const lvl = 16 - y, h = EQ[i];
      if (lvl === h && h < 7) return 'T'; // peak-hold dot
      if (lvl > h) return 'P';
      const [hi, lo] = lvl <= 1 ? ['C', 'c'] : lvl <= 4 ? ['a', 'O'] : ['M', 'm'];
      return k === 0 ? hi : lo;
    },
    reels: [['note', 'note', 'note'], ['note', 'note', 'note'], ['note', 'note', 'note']],
    belly(g) {
      // chrome speaker grille slats
      for (let y = 47; y <= 50; y++) for (let x = 9; x <= 35; x++) put(g, x, y, y % 2 ? (x === 9 ? 'W' : 'L') : 'n');
      // a row of glowing selector buttons
      for (let x = 11, i = 0; x <= 33; x += 4, i++) { put(g, x, 48, 'aMC'[i % 3]); put(g, x + 1, 48, 'Omc'[i % 3]); }
    },
    tray(g) {
      // a spilled 45 record in the coin tray
      stamp(g, 13, 53, [' kkk ', 'klaOk', 'kkOkk']);
      stamp(g, 27, 54, ['WaO', 'aOo']);
    },
    deco(g) {
      // bubble tubes up the body sides (warm left, cool right), bubbles every few px
      for (let y = 20; y <= 58; y++) {
        const bub = (y + 1) % 5 === 0;
        put(g, 4, y, bub ? 'W' : 'a'); put(g, 5, y, bub ? 'a' : 'O');
        put(g, 39, y, bub ? 'W' : 'C'); put(g, 40, y, bub ? 'C' : 'c');
      }
      // the arched crown: chrome rim, glowing bubble tube, dark teal grille with chrome slats
      layer(g, (h) => {
        for (let y = 0; y <= 8; y++) for (let x = 3; x <= 41; x++) {
          const d = Math.sqrt(((x - 22) / 18) ** 2 + ((y - 9.5) / 9.5) ** 2);
          if (d > 1) continue;
          let c;
          if (d > 0.88) c = x <= 20 ? (x + y <= 22 ? 'W' : 'L') : (x >= 30 ? 'S' : 'L');
          else if (d > 0.66) {
            const [hi, lo] = x < 15 ? ['a', 'O'] : x < 29 ? ['M', 'm'] : ['C', 'c'];
            c = (x * 3 + y * 5) % 11 === 0 ? 'W' : d > 0.78 ? hi : lo;
          } else c = x % 3 === 1 ? 'S' : 'n';
          put(h, x, y, c);
        }
      });
      // tiny gold note badge at the crown's keystone
      stampRimmed(g, 21, 3, [' Y', ' Y', 'GG']);
    },
  });
}

// heroJukebox: DJ DECIBEL -- black flat-top, chrome-banded teal headphones with an orange glow ring,
// wraparound shades with a cyan glint, a cool lopsided grin, teal satin bomber with an orange collar over a white tee
{
  const g = grid(24, 24);
  // flat-top hair
  shape(g, 2, [[9, 17], [8, 18], [8, 18], [8, 18], [8, 18], [8, 18]], (x, y) => (y === 2 || (x <= 9 && y < 5) ? 'l' : 'k'));
  for (let y = 8; y <= 10; y++) put(g, 10, y, 'k');
  // face
  shape(g, 7, [[10, 18], [11, 19], [11, 20], [11, 20], [11, 21], [11, 21], [11, 20], [11, 20], [11, 19], [12, 19], [13, 18]],
    (x, y, has) => (!has(x + 1, y) || !has(x, y + 1) ? 'b' : (y === 7 || x === 11) ? 'w' : 'B'));
  for (let x = 13; x <= 16; x++) put(g, x, 18, 'b');
  // shades: a heavy bar with two dark lenses, a cyan glint on each
  stamp(g, 11, 9, [
    'kkkkkkkkkk',
    ' kCnnkCnk ',
    ' knnnkknk',
  ]);
  // nose + grin (corner kicked up on the right)
  plot(g, [[21, 12, 'b']]);
  stamp(g, 14, 14, [
    '     K',
    'KKKKK ',
    ' TWWK',
  ]);
  // headphones: band arching over the crown, big cup on the ear
  plot(g, [[7, 7, 'L'], [7, 6, 'L'], [7, 5, 'L'], [8, 4, 'L'], [8, 3, 'L'], [9, 2, 'W'], [10, 1, 'W'], [11, 1, 'L'], [12, 1, 'L'],
    [13, 1, 'L'], [14, 1, 'L'], [15, 1, 'L'], [16, 1, 'S'], [17, 1, 'S'], [18, 2, 'S'], [18, 3, 'D'],
    [8, 7, 'S'], [8, 6, 'S'], [8, 5, 'S'], [9, 4, 'S'], [9, 3, 'S'], [10, 2, 'S'], [11, 2, 'S'], [12, 2, 'S'], [13, 2, 'S'],
    [14, 2, 'S'], [15, 2, 'S'], [16, 2, 'D'], [17, 2, 'D']]);
  stamp(g, 5, 8, [
    ' iiij',
    'iijjjn',
    'ijaOjn',
    'ijOojn',
    'ijjjjn',
    'jjjjnn',
    ' nnnn',
  ]);
  // shoulders: teal bomber, orange collar, white tee
  stamp(g, 0, 18, [
    '        aO       oO',
    '   iijjaOOO   OOojjjj',
    ' iijjjjjOOTTTTTtOojjjjn',
    'ijjjjjjjjOTTTTTtOjjjjjnn',
    'ijjjjjjjjjTTTTTtjjjjjnnn',
    'jjjjjjjjjjTTTTttjjjjnnnn',
  ]);
  S.heroJukebox = toRows(outline(g));
}

// relicTurntable (16x16): TURNTABLE, a chrome deck with a black vinyl (orange label, grooves) and a tonearm
{
  const g = grid(16, 16);
  for (let y = 2; y <= 13; y++) for (let x = 1; x <= 14; x++)
    put(g, x, y, (y === 2 || x === 1) ? 'L' : (y === 13 || x === 14) ? 'D' : 'S');
  put(g, 1, 2, 'W');
  for (let y = 3; y <= 13; y++) for (let x = 1; x <= 12; x++) {
    const r = Math.hypot(x - 6.5, y - 8);
    if (r > 4.9) continue;
    put(g, x, y, r < 1.6 ? (x + y <= 13 ? 'a' : 'O') : r > 2.6 && r < 3.6 && x + y < 15 ? 'l' : 'k');
  }
  put(g, 6, 8, 'W');
  // tonearm: pivot top-right, arm swinging onto the record
  plot(g, [[12, 3, 'W'], [13, 3, 'L'], [12, 4, 'L'], [13, 4, 'S'], [13, 5, 'L'], [13, 6, 'L'], [13, 7, 'L'], [12, 8, 'L'], [11, 9, 'L'],
    [10, 10, 'a'], [10, 9, 'O'], [2, 12, 'R'], [4, 12, 'E']]);
  S.relicTurntable = toRows(outline(g));
}
// relicMixtape (16x16): MIXTAPE, a black cassette with a cream label (pink + orange stripes) and two tape hubs
S.relicMixtape = lit(16, 16, [
  '................',
  '................',
  '.lllllllllllllk.',
  '.lTTTTTTTTTTTtk.',
  '.lTMMMMMMMMMMtk.',
  '.lTOOOOOOOOOOtk.',
  '.lTkkkkkkkkkktk.',
  '.lTkWLkbbkWLktk.',
  '.lTkLSkbbkLSktk.',
  '.lTkkkkkkkkkktk.',
  '.lTTTTTTTTTTTtk.',
  '.llllkkkkkkllkk.',
  '.lllklkllklkkkk.',
  '................',
  '................',
  '................',
]);
// relicSubwoofer (16x16): SUBWOOFER, a charcoal box with one big cone in an orange glow ring, a chrome dust cap
{
  const g = grid(16, 16);
  for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++)
    put(g, x, y, (y === 1 || x === 1) ? 'l' : (y === 14 || x === 14) ? 'P' : 'k');
  for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) {
    const r = Math.hypot(x - 7.5, y - 7.5);
    if (r > 5.6) continue;
    let c;
    if (r > 4.7) c = x + y < 15 ? 'a' : 'O';
    else if (r > 3.9) c = 'K';
    else if (r > 1.9) c = x + y < 14 ? 'S' : x + y > 17 ? 'h' : 'D';
    else c = x + y < 15 ? 'L' : 'S';
    put(g, x, y, c);
  }
  plot(g, [[6, 6, 'W'], [5, 4, 'L'], [2, 2, 'W']]);
  S.relicSubwoofer = toRows(outline(g));
}

// echo (THE JUKEBOX's charm): cyan sound-wave rings radiating in from the bottom-right corner (two rings) and
// the top-left (one), edged in deep teal rather than K so they stay light over the symbol underneath
// (cool cyan so it reads on the apricot NOTE and on blue shields alike)
{
  const g = grid(16, 16);
  // clean pixel quarter-arcs as (dx, dy) offsets from the corner
  const R3 = [[0, 3], [1, 3], [2, 2], [3, 1], [3, 0]];
  const R6 = [[0, 6], [1, 6], [2, 6], [3, 5], [4, 4], [5, 3], [6, 2], [6, 1], [6, 0]];
  const dot = [[0, 0, 'W'], [1, 0, 'C'], [0, 1, 'C']];
  plot(g, dot.map(([dx, dy, c]) => [15 - dx, 15 - dy, c]));
  plot(g, R3.map(([dx, dy], i) => [15 - dx, 15 - dy, i === 2 ? 'W' : 'C']));
  plot(g, R6.map(([dx, dy], i) => [15 - dx, 15 - dy, i === 4 ? 'W' : 'C']));
  plot(g, dot.map(([dx, dy, c]) => [dx, dy, c]));
  plot(g, R3.map(([dx, dy], i) => [dx, dy, i === 2 ? 'W' : 'C']));
  outline(g, 'n');
  S.enhEcho = toRows(g);
}
// volumeIcon (8x8): HUD speaker, an orange cone with one cyan sound wave
S.volumeIcon = [
  '...KK.K.',
  '..KWOKCK',
  'KKWaOKKC',
  'KWaOOKKC',
  'KaOOOKKC',
  'KKKOoKKC',
  '..KKoKCK',
  '...KK.K.',
];

// ================================================================ THE WHEEL (act 2 boss, 2026-10-09)
// wheelTopper (24x24): a roulette wheel from above — wooden rim, a ring of red and black pockets with gold frets,
// the dark bowl, and the gold turret in the middle. It turns in the fight (drawn rotated).
{
  const g = grid(24, 24);
  const cx = 11.5, cy = 11.5;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > 11.3) continue;
    const a = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2);
    const sector = Math.floor(a * 16);
    const lit = dx + dy < 0;
    let c;
    if (d > 10.2) c = lit ? 'B' : 'b';                                        // the mahogany rim
    else if (d > 9.3) c = lit ? 'Y' : 'G';                                    // its gold inner ring
    else if (d > 6.2) c = Math.abs(a * 16 - Math.round(a * 16)) < 0.1 ? 'G' : sector % 2 ? 'K' : 'R'; // pockets + frets
    else if (d > 4.4) c = lit ? 'g' : 'b';                                    // the bowl
    else c = d < 1.2 ? 'W' : lit ? 'Y' : 'G';                                 // the gold cone
    put(g, x, y, c);
  }
  // the turret's cross arms
  for (const [x, y] of [[11, 8], [12, 8], [11, 15], [12, 15], [8, 11], [8, 12], [15, 11], [15, 12]]) put(g, x, y, 'g');
  // the ivory ball sitting in a pocket (the fight also draws a rolling ball over it)
  put(g, 18, 6, 'T'); put(g, 19, 7, 't'); put(g, 18, 7, 'T'); put(g, 19, 6, 'W');
  S.wheelTopper = toRows(outline(g));
}
// ================================================================ LUCKY SEVENS prize slot + RED OR BLACK (2026-10-12)
// slotHeart (16x16): LUCKY SEVENS' prize symbol (pays HP), a big glossy red heart
{
  const g = grid(16, 16);
  const mask = [
    '................',
    '................',
    '...XXXX..XXXX...',
    '..XXXXXXXXXXXX..',
    '.XXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXX.',
    '.XXXXXXXXXXXXXX.',
    '..XXXXXXXXXXXX..',
    '...XXXXXXXXXX...',
    '....XXXXXXXX....',
    '.....XXXXXX.....',
    '......XXXX......',
    '.......XX.......',
    '................',
  ];
  const on = (x, y) => get(mask.map((r) => [...r]), x, y) === 'X';
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (!on(x, y)) continue;
    const lo = !on(x + 1, y) || !on(x, y + 1) || !on(x + 1, y + 1);
    const hi = !on(x - 1, y) || !on(x, y - 1);
    put(g, x, y, lo ? 'r' : hi ? 'M' : x + y >= 21 ? 'r' : 'R');
  }
  plot(g, [[3, 4, 'W'], [4, 3, 'W'], [3, 5, 'W'], [4, 4, 'M'], [5, 3, 'M'], [10, 3, 'M'], [11, 3, 'M']]);
  S.slotHeart = toRows(outline(g));
}
// slotUp (16x16): LUCKY SEVENS' upgrade symbol, a bold green up-arrow on a round blue gem badge
{
  const g = grid(16, 16);
  const spans = [[5, 10], [3, 12], [2, 13], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [1, 14], [2, 13], [3, 12], [5, 10]];
  shape(g, 1, spans, (x, y, has) =>
    (!has(x + 1, y) || !has(x, y + 1)) ? 'N' : (!has(x - 1, y) || !has(x, y - 1)) ? 'A' : (x + y >= 18 ? 'U' : 'c'));
  stamp(g, 4, 3, [
    '   EE   ',
    '  EEee  ',
    ' EEEeee ',
    'EEEEeeee',
    '  EEee  ',
    '  EEee  ',
    '  EEee  ',
    '  EEee  ',
    '  EQQe  ',
  ]);
  plot(g, [[7, 3, 'W'], [7, 4, 'W'], [5, 6, 'W'], [3, 3, 'C'], [4, 2, 'C']]);
  S.slotUp = toRows(outline(g));
}
// slotTopper (64x16): the marquee sign on top of the LUCKY SEVENS machine, three red 7s on a gold plate between
// two rows of bulbs (lit gold / dim, alternating)
{
  const g = grid(64, 16);
  for (let y = 1; y <= 14; y++) for (let x = 1; x <= 62; x++) {
    let c;
    if (y === 1 || y === 14) c = 'b';
    else if (y === 2) c = 'Y';
    else if (y === 13) c = 'g';
    else c = x <= 2 ? 'Y' : x >= 61 ? 'g' : 'G';
    put(g, x, y, c);
  }
  for (let k = 0; k < 15; k++) for (const y of [1, 14]) {
    const c = k % 2 ? 'g' : 'Y';
    put(g, 3 + 4 * k, y, c); put(g, 4 + 4 * k, y, c);
    if (c === 'Y') put(g, 3 + 4 * k, y, 'W');
  }
  const seven = [
    'RRRRRRRR',
    'RWRRRRRr',
    '.....RRr',
    '....RRr.',
    '...RRr..',
    '...RRr..',
    '..RRr...',
    '..RRr...',
  ];
  for (const x0 of [12, 28, 44]) {
    stamp(g, x0 + 1, 5, seven.map((r) => r.replace(/[RWr]/g, 'g')));
    stamp(g, x0, 4, seven);
  }
  S.slotTopper = toRows(outline(g));
}
// betChip (12x12): THE WHEEL's bet chip from above — red with white inserts, a black centre and a white dot
S.betChip = lit(12, 12, [
  '............',
  '....RWWR....',
  '..MRRWWRRr..',
  '.MRRkkkkRrr.',
  '.RRkkkkkkrr.',
  '.WWkkWkkkWW.',
  '.WWkkkkkkWW.',
  '.RRkkkkkkrr.',
  '.RRrkkkkrrr.',
  '..Rrrrrrrr..',
  '....rWWr....',
]);
// betStack1-3 (16x16): 1, 2 or 3 red bet chips stacked on your reel (side view, sitting on the sprite's floor)
{
  const stack = (n) => {
    const g = grid(16, 16);
    const x0 = 3, w = 10, yEnd = 14, yTop = yEnd - n * 3 - 1;
    // each chip's edge: 3 rows (a lit row, a row with white inserts, a dark seam)
    for (let y = yTop + 2; y <= yEnd; y++) for (let x = x0; x < x0 + w; x++) {
      const v = (yEnd - y) % 3, u = x - x0;
      const end = u === 0 ? 'M' : u === w - 1 ? 'r' : null;
      put(g, x, y, v === 0 ? 'd' : v === 1 ? (end ?? (u % 3 === 1 ? 'W' : 'R')) : (end ?? 'R'));
    }
    // the top chip's face (an oval, lit), with its white inserts
    stamp(g, x0, yTop, [' MMMMMMMM ', 'MWMMRRMMWr']);
    return toRows(outline(g));
  };
  S.betStack1 = stack(1);
  S.betStack2 = stack(2);
  S.betStack3 = stack(3);
}

// ================================================================ ENDLESS: THE OWNER + relics (batch 12)
/** Paint a set of cells with a 1px K ring first (only around the set), so overlapping parts stay separated. */
function ringPaint(g, cells, ringC = 'K') {
  const key = new Set(cells.map(([x, y]) => `${x},${y}`));
  for (const [x, y] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
    if (!key.has(`${x + dx},${y + dy}`)) put(g, x + dx, y + dy, ringC);
  for (const [x, y, c] of cells) put(g, x, y, c);
}
/** Literal rows -> [x, y, c] cells at (x0, y0); '.' and ' ' skipped. */
const cellsOf = (x0, y0, rows) => rows.flatMap((r, dy) => [...r].map((c, dx) => [x0 + dx, y0 + dy, c]).filter(([, , c]) => c !== '.' && c !== ' '));

// owner: ENDLESS final boss, the man who owns the casino. Heavy-set old tycoon: slicked-back silver hair,
// heavy silver brows, gold-rimmed purple-tinted glasses, jowls, a smug one-sided smirk round a fat cigar with a
// red ember and a curl of smoke; black pinstripe suit, white shirt, red tie with a gold pin, diamond pinky ring
{
  const g = grid(24, 24);
  // broad shoulders, pinstripe suit
  for (let y = 14; y <= 23; y++) {
    const [x0, x1] = y === 14 ? [3, 18] : y === 15 ? [1, 20] : [0, 21];
    const half = 2.5 - (y - 14) * 0.45;
    for (let x = x0; x <= x1; x++) {
      const d = Math.abs(x - 10.5);
      let c;
      if (d <= 0.6 && y >= 15) c = x === 10 ? 'R' : 'r';                          // tie
      else if (d <= half + 0.01) c = x < 10 ? 'T' : 't';                           // shirt V
      else if (d <= half + 1.6) c = x < 10 ? 'l' : 'P';                           // lapels
      else c = x === x0 ? 'l' : (x % 3 === 0 && y > 15) ? (x < 10 ? 'l' : 'h') : (x >= 18 ? 'P' : 'k'); // pinstripes
      put(g, x, y, c);
    }
  }
  plot(g, [[10, 14, 'R'], [11, 14, 'r'], [9, 19, 'Y'], [10, 19, 'G'], [11, 19, 'G'], [12, 19, 'g']]); // knot, gold tie pin
  plot(g, [[4, 18, 'T'], [5, 18, 'R'], [4, 17, 'M']]);                                          // pocket square
  stamp(g, 4, 1, [
    '    LLLLLS',
    '  LLWWLLLSSS',
    ' LLLSSSSSSSSD',
    ' SFFFFFFFFFFD',
    ' SLLLFFFLLLfD',
    ' GGGGGFFGGGGG',
    ' GJvvGGGGJvvG',
    ' GvvvGffGvvvG',
    'fFGGGFFfFGGGFf',
    'fFFfFFFFFFkK',
    'fFFFfFkkkFF',
    ' fFFFFFFFFFff',
    '  ffFFFFFfff',
  ]);
  plot(g, [[7, 14, 'T'], [8, 15, 'T'], [13, 14, 't'], [12, 15, 't']]);                              // collar points
  // the cigar from the right corner of the smirk, gold band, ash + ember, a curl of smoke
  stamp(g, 15, 10, ['BGBBBHO', 'bgbbbhR']);
  stamp(g, 20, 5, [' L', 'L', ' S']);
  // a heavy fist on the right with the diamond pinky ring
  ringPaint(g, cellsOf(17, 17, ['FFFf', 'fFFf', 'FFFf', 'CWff', 'TTt']));
  S.enemyOwner = toRows(outline(g));
}

// relicDrySpell (16x16): DRY SPELL, a slab of cracked desert earth under one blue water drop
{
  const g = grid(16, 16);
  stamp(g, 5, 0, [
    '  A  ',
    '  AU ',
    ' AAAU',
    'AWAAUN',
    'AWAUUN',
    'AAUUNN',
    ' UNNN',
  ]);
  stamp(g, 1, 8, [
    'aaaaaaabaaaaaa',
    'aOOOOOObOOOOOo',
    'aOObbbOObOOOOo',
    'abbOOObbObbOOo',
    'aOOOOObOOOObbo',
    'ooooobooooobob',
    'bbbbbbbbbbbbbb',
  ]);
  S.relicDrySpell = toRows(outline(g));
}
// relicPunchCard (16x16): PUNCH CARD, a cream loyalty card, red stripe, three holes punched and one to go
S.relicPunchCard = lit(16, 16, [
  '................',
  '................',
  '................',
  '.WTTTTTTTTTTTTt.',
  '.TRRRRRRRRRRRRt.',
  '.Trrrrrrrrrrrrt.',
  '.TTTTTTTTTTTTTt.',
  '.TPPTPPTPPTttTt.',
  '.TPPTPPTPPTttTt.',
  '.TTTTTTTTTTTTTt.',
  '.TttttttTTTTGTt.',
  '.TTTTTTTTTTTTTt.',
  '.tttttttttttttt.',
]);
// relicGoldenSpin (16x16): GOLDEN SPIN, a gold coin caught mid-spin (its reeded edge showing), a 7 struck on
// the face, speed lines trailing left and sparkles
{
  const g = grid(16, 16);
  const inE = (x, y, cx, rx) => ((x - cx) / rx) ** 2 + ((y - 7.5) / 6.4) ** 2 <= 1;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    if (inE(x, y, 7.2, 3.9)) {
      const inner = inE(x, y, 7.2, 2.9) && ((y - 7.5) / 5.4) ** 2 + ((x - 7.2) / 2.9) ** 2 <= 1;
      put(g, x, y, inner ? 'Y' : (x - 7.2) + (y - 7.5) < 0 ? 'Y' : 'G');
      if (!inner) put(g, x, y, (x - 7.2) + (y - 7.5) * 0.6 < 0 ? 'W' : 'G');
    } else if (inE(x, y, 9.0, 3.9)) put(g, x, y, y % 2 ? 'g' : 'G');                 // reeded edge
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (get(g, x, y) === 'W' && (x + y) % 3) put(g, x, y, 'Y');
  stamp(g, 5, 4, ['GGGG', '   G', '  G', '  G', ' G', ' G']);                      // the 7
  plot(g, [[5, 3, 'W'], [4, 4, 'W']]);
  plot(g, [[0, 5, 'G'], [1, 5, 'Y'], [0, 9, 'G'], [1, 9, 'Y'], [1, 12, 'G']]);        // speed lines
  plot(g, [[14, 0, 'W'], [13, 1, 'W'], [14, 1, 'W'], [15, 1, 'W'], [14, 2, 'W'], [13, 14, 'Y']]); // sparkles
  S.relicGoldenSpin = toRows(outline(g));
}
// relicInsurance (16x16): INSURANCE POLICY, a dog-eared policy with a blue shield and a red wax seal
{
  const g = grid(16, 16);
  stamp(g, 2, 1, [
    'WTTTTTTTu',
    'TTTTTTTTuu',
    'TTTTTTTTtuu',
    'TTTTTTTTTTTt',
    'TTTAAUUUNTTt',
    'TTTAWUUUNTTt',
    'TTTAUUUUNTTt',
    'TTTAUUUNNTTt',
    'TTTTUUNNTTTt',
    'TTTTTNNTTTTt',
    'TttttttTTTTt',
    'TTTTTTTTTTTt',
    'TttttTTTTTTt',
    'tttttttttttt',
  ]);
  ringPaint(g, cellsOf(10, 10, [' RRR ', 'RMRRr', 'RRrRr', 'RRRrr', ' rrr ']));
  S.relicInsurance = toRows(outline(g));
}
// relicHouseTax (16x16): HOUSE TAX, a perforated red-and-gold tax stamp, a red percent sign on cream
{
  const g = grid(16, 16);
  for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) {
    const edge = x === 1 || x === 14 || y === 1 || y === 14;
    const corner = (x === 1 || x === 14) && (y === 1 || y === 14);
    if (edge && !corner && (x + y) % 2 === 1) continue;                         // perforations
    let c;
    if (x <= 2 || y <= 2) c = 'M';
    else if (x >= 13 || y >= 13) c = 'r';
    else if (x === 3 || y === 3) c = 'Y';
    else if (x === 12 || y === 12) c = 'g';
    else c = x === 4 || y === 4 ? 'W' : 'T';
    put(g, x, y, c);
  }
  for (let y = 1; y <= 13; y++) for (let x = 1; x <= 13; x++) if ((x <= 2 || y <= 2) && get(g, x, y) !== '.' && x + y > 5) put(g, x, y, 'R');
  stamp(g, 5, 5, [
    'RR  R ',
    'Rr R  ',
    '  R   ',
    ' R  RR',
    'R   Rr',
  ]);
  S.relicHouseTax = toRows(outline(g));
}
// relicRegular (16x16): REGULAR, a gold VIP membership card, black stripe, white star
{
  const g = grid(16, 16);
  for (let y = 2; y <= 13; y++) for (let x = 1; x <= 14; x++)
    put(g, x, y, y === 4 ? 'k' : y === 2 ? (x === 1 ? 'W' : x === 14 ? 'G' : 'Y') : y === 13 ? 'g' : x === 1 ? 'Y' : x === 14 ? 'g' : 'G');
  ringPaint(g, cellsOf(3, 6, [
    '   W   ',
    '  WTT  ',
    'WTTTTTt',
    ' TTTTt ',
    '  TTt  ',
    ' TT Tt ',
    ' T   t ',
  ]), 'g');
  for (const y of [7, 9, 11]) hline(g, 11, 12, y, 'g');
  S.relicRegular = toRows(outline(g));
}
// relicHitmaker (16x16): CERTIFIED HITMAKER, a framed gold record (red label) with a gold name plate
{
  const g = grid(16, 16);
  for (let y = 1; y <= 14; y++) for (let x = 1; x <= 14; x++) {
    const rim = x === 1 || y === 1 || x === 14 || y === 14;
    put(g, x, y, rim ? (x === 1 || y === 1 ? 'w' : 'b') : 'P');
  }
  const cx = 7.5, cy = 6.5;
  for (let y = 2; y < 12; y++) for (let x = 2; x < 14; x++) {
    const r = Math.hypot(x - cx, y - cy);
    if (r > 5.0) continue;
    let c;
    if (r <= 0.75) c = 'K';
    else if (r <= 1.9) c = x + y < cx + cy ? 'R' : 'r';
    else if (r > 4.4 || Math.abs(r - 3.2) < 0.4) c = 'g';
    else c = (x - cx) + (y - cy) < -1 ? 'Y' : 'G';
    put(g, x, y, c);
  }
  plot(g, [[4, 4, 'W'], [5, 3, 'W'], [4, 5, 'W'], [10, 9, 'Y'], [11, 8, 'Y']]);              // glare
  stamp(g, 5, 13, ['YGGGGg']);
  S.relicHitmaker = toRows(outline(g));
}
// relicHouseOfCards (16x16): HOUSE OF CARDS, two cards leaning into a peak on top of a flat third one;
// the left shows its face (a red heart), the right its red back
{
  const g = grid(16, 16);
  const card = (cx, cy, ang, face) => {
    const cs = Math.cos(ang), sn = Math.sin(ang), cells = [];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - cx, dy = y - cy;
      const u = dx * cs + dy * sn, v = -dx * sn + dy * cs;
      if (Math.abs(u) > 2.6 || Math.abs(v) > 5.2) continue;
      const edge = Math.abs(u) > 1.7 || Math.abs(v) > 4.4;
      let c;
      if (face) c = edge ? (u < 0 ? 'W' : 't') : 'T';
      else c = edge ? (u < 0 ? 'M' : 'r') : ((x + y) % 2 ? 'R' : 'r');
      cells.push([x, y, c]);
    }
    return cells;
  };
  ringPaint(g, card(10.2, 6.3, -0.42, false));
  ringPaint(g, card(4.8, 6.3, 0.42, true));
  plot(g, [[3, 5, 'R'], [5, 5, 'R'], [3, 6, 'R'], [4, 6, 'R'], [5, 6, 'r'], [4, 7, 'r']]);       // heart pip
  ringPaint(g, cellsOf(1, 12, ['WTTTTTTTTTTTTt', 'TRTTTTTTTTTTRt', 'tttttttttttttt']));
  S.relicHouseOfCards = toRows(outline(g));
}
// relicParachute (16x16): GOLDEN PARACHUTE, a gold canopy, shroud lines down to a little money bag
{
  const g = grid(16, 16);
  for (let y = 0; y <= 6; y++) for (let x = 0; x <= 15; x++) {
    const r = Math.hypot((x - 7.5) / 7.0, (y - 6.6) / 6.2);
    if (r > 1) continue;
    const panel = Math.floor(x / 4) % 2;
    put(g, x, y, y === 6 ? (panel ? 'g' : 'G') : (x + y < 7 ? 'W' : panel ? 'G' : 'Y'));
  }
  plot(g, [[3, 6, '.'], [4, 6, '.'], [11, 6, '.'], [12, 6, '.']]);       // scalloped hem
  stamp(g, 5, 9, ['  wb', ' bbbb', 'wBBBBb', 'wBYGBb', 'wBGBBb', ' BBbb']);
  S.relicParachute = toRows(outline(g));
  // shroud lines (unoutlined, pale) from the hem down to the bag's neck
  for (const [x, y] of [[2, 8], [3, 9], [13, 8], [12, 9], [6, 8], [9, 8]]) {
    const row = [...S.relicParachute[y]]; if (row[x] === '.') row[x] = 'u'; S.relicParachute[y] = row.join('');
  }
}

// enhGlass (GLASS charm overlay, 16x16, centre clear): a pale cyan cut gem tucked in the top-right corner, a big
// white glint off its crown and a dark hairline crack through it (precious but fragile), two glass chips bottom-left
{
  const g = grid(16, 16);
  stamp(g, 8, 1, [
    ' WWCCA ',
    'WWCWCAc',
    'CCCCCcc',
    ' CWCAc ',
    '  CAc  ',
    '   c   ',
  ]);
  plot(g, [[10, 1, 'n'], [11, 2, 'n'], [11, 3, 'n'], [12, 4, 'n'], [11, 5, 'n']]);        // the crack
  outline(g);
  plot(g, [[5, 0, 'C'], [5, 1, 'W'], [4, 2, 'C'], [5, 2, 'W'], [6, 2, 'C'], [5, 3, 'C']]);  // glint
  plot(g, [[1, 13, 'C'], [2, 14, 'W'], [1, 14, 'A'], [3, 12, 'C']]);                      // glass chips
  S.enhGlass = toRows(g);
}

// ================================================================ encounter games: RAT RACE, SCRATCH-OFF, CLAW
// ratRacer / ratRacer2 (16x16): a grey racing rat in side view running RIGHT, two gallop frames
// (legs stretched / legs gathered), with a plain red saddle cloth (its number is drawn by code)
{
  const body = [
    '                ',
    '                ',
    '                ',
    '                ',
    '          Mh    ',
    '     RRRRIMIH   ',
    '    IRRRRrIIIH  ',
    '   IHRRRRrHKHHM ',
    '  IHHHHHHHHHHh  ',
    '  hHHHHHHHHHhh  ',
    '   hhhhhhhhh    ',
  ];
  const frame = (legs, tail) => {
    const g = grid(16, 16);
    stamp(g, 0, 0, body);
    put(g, 11, 6, 'W');
    plot(g, legs); plot(g, tail);
    return toRows(outline(g));
  };
  S.ratRacer = frame(
    [[3, 11, 'h'], [2, 12, 'h'], [1, 12, 'M'], [11, 11, 'h'], [12, 12, 'h'], [13, 12, 'M']],
    [[1, 8, 'M'], [1, 7, 'm'], [2, 6, 'm']]);
  S.ratRacer2 = frame(
    [[6, 11, 'h'], [6, 12, 'M'], [5, 12, 'M'], [8, 11, 'h'], [9, 12, 'M'], [10, 12, 'M']],
    [[1, 9, 'M'], [1, 10, 'm'], [2, 11, 'm']]);
}
// scratchTicket (24x24): a scratch-off ticket, gold border, red LUCKY header, a 3x3 grid of silver panels
{
  const g = grid(24, 24);
  for (let y = 1; y <= 22; y++) for (let x = 1; x <= 22; x++) {
    const rim = x === 1 || y === 1 || x === 22 || y === 22;
    put(g, x, y, rim ? (x === 1 || y === 1 ? 'Y' : 'g') : y <= 8 ? (y === 8 ? 'r' : 'R') : 'T');
  }
  hline(g, 2, 21, 2, 'M');
  const font = {
    L: ['Y  ', 'Y  ', 'Y  ', 'Y  ', 'YYY'], U: ['Y Y', 'Y Y', 'Y Y', 'Y Y', 'YYY'], C: ['YYY', 'Y  ', 'Y  ', 'Y  ', 'YYY'],
    K: ['Y Y', 'Y Y', 'YY ', 'Y Y', 'Y Y'], Y: ['Y Y', 'Y Y', ' Y ', ' Y ', ' Y '],
  };
  [...'LUCKY'].forEach((ch, i) => stamp(g, 2 + i * 4, 3, font[ch]));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const x0 = 4 + c * 6, y0 = 10 + r * 4;
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++)
      put(g, x0 + dx, y0 + dy, dx === 0 && dy === 0 ? 'W' : dy === 0 || dx === 0 ? 'L' : dx === 3 || dy === 2 ? 'D' : 'S');
  }
  hline(g, 3, 20, 21, 't');
  plot(g, [[21, 9, 'W'], [2, 21, 'W']]);
  S.scratchTicket = toRows(outline(g));
}
// scratchCoin (12x12): the coin you scratch with, worn gold with a struck star
{
  const g = grid(12, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const r = Math.hypot(x - 5.5, y - 5.5);
    if (r > 4.9) continue;
    put(g, x, y, r > 3.9 ? ((x + y) < 11 ? 'Y' : 'g') : (x + y) < 10 ? 'Y' : 'G');
  }
  plot(g, [[5, 3, 'g'], [6, 3, 'g'], [4, 5, 'g'], [5, 5, 'g'], [6, 5, 'g'], [7, 5, 'g'], [5, 6, 'g'], [6, 6, 'g'], [4, 7, 'g'], [7, 7, 'g'], [5, 4, 'g'], [6, 4, 'g']]);
  plot(g, [[3, 2, 'W'], [2, 3, 'W']]);
  S.scratchCoin = toRows(outline(g));
}
// clawGrabber / clawGrabberShut (24x24): an arcade claw on a cable stub, three steel prongs, open / closed
{
  const prong = (pts) => {
    const cells = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let k = 0; k <= n; k++) {
        const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
        cells.push([x, y, 'L'], [x + 1, y, 'S']);
      }
    }
    const seen = new Map();
    for (const c of cells) { const k = `${c[0]},${c[1]}`; if (!seen.has(k) || c[2] === 'L') seen.set(k, c); }
    return [...seen.values()];
  };
  const claw = (side, mid) => {
    const g = grid(24, 24);
    for (let y = 0; y <= 4; y++) put(g, 11, y, 'L'), put(g, 12, y, 'D');               // cable stub
    const L = prong(side), R = prong(side.map(([x, y]) => [22 - x, y]));
    ringPaint(g, L); ringPaint(g, R);
    ringPaint(g, prong(mid));
    ringPaint(g, cellsOf(7, 4, [
      ' LLLLLLLS ',
      'LWLLLLLLSD',
      'LSSSRSSSSD',
      'SDDDDDDDDD',
    ]));
    return toRows(outline(g));
  };
  S.clawGrabber = claw([[8, 8], [5, 11], [3, 15], [3, 19], [5, 21]], [[11, 8], [11, 16], [10, 18]]);
  S.clawGrabberShut = claw([[7, 8], [5, 12], [6, 16], [9, 19]], [[11, 8], [11, 19]]);
}
// prizeBall (12x12): a claw-machine prize capsule, red top half, clear bottom half with a glint
{
  const g = grid(12, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
    const r = Math.hypot(x - 5.5, y - 5.5);
    if (r > 4.9) continue;
    let c;
    if (y <= 5) c = r > 3.9 && x + y >= 11 ? 'r' : x + y < 7 ? 'M' : 'R';
    else if (y === 6) c = 'S';
    else c = r > 3.9 ? (x < 6 ? 'C' : 'A') : 'u';
    put(g, x, y, c);
  }
  plot(g, [[3, 2, 'W'], [2, 3, 'W'], [3, 8, 'W'], [8, 9, 'c']]);
  S.prizeBall = toRows(outline(g));
}

// relicStarchart (16x16): STAR CHART, a navy star map on a parchment scroll (rolled top and bottom, wooden knobs):
// three bright stars joined by constellation lines, and a little ringed planet
S.relicStarchart = lit(16, 16, [
  '................',
  '.wTTTTTTTTTTTTB.',
  '.BIIIIIIIIIIIIb.',
  '..NYNNNNNNNNYN..',
  '..YWYANNNNNYWY..',
  '..NYNNAANAANYN..',
  '..NNNNNNWNNNNN..',
  '..NNNNNANNNNNN..',
  '..NNNNANNNaONN..',
  '..NNNWNNNaOOoN..',
  '..NNNNNGYYYGGg..',
  '..NCNNNNNOOooN..',
  '..NNNNNNNNooNN..',
  '.wTTTTTTTTTTTTB.',
  '.BIIIIIIIIIIIIb.',
  '................',
]);

// ---------------------------------------------------------------- emit + self-check
const DIMS = {
  sword: 16, shield: 16, bolt: 16, slime: 16, goo: 16,
  heart: 8, shieldIcon: 8, boltIcon: 8, 
  swordProjectile: 12, slimeBlob: 8, spark: 5, playerPortrait: 24, enemyPortrait: 24,
  enemyBrute: 24, enemyFrost: 24, enemyThief: 24, enemyGolem: 24, enemyGremlin: 24, enemyBoss: 24,
  ice: 16, claw: 16, rock: 16, lock: 16, coin: 16, seven: 16, ball: 16,
  frozenOverlay: 16, lockOverlay: 16,
  relicClover: 16, relicBattery: 16, relicMirror: 16,
  relicFang: 16, relicBandage: 16, 
  icoFlood: 8, icoSmash: 8, icoFreeze: 8, icoSteal: 8, icoLock: 8, icoRock: 8, icoCoin: 8,
  plusBadge: 8, minusBadge: 8, skull: 8,
  nodeFight: 12, nodeBoss: 12, nodeDone: 12, nodeHere: 12,
  relicLockpick: 16, relicPickaxe: 16, relicDice: 16, 
  cardSwap: 16, cardClear: 16, arrowRight: 8, potTier1: 16, potTier2: 24, potTier3: 24, mapFork: 12,
  mapBadgeSlime: 8, mapBadgeIce: 8, mapBadgeClaw: 8, mapBadgeRock: 8, mapBadgeLock: 8, mapBadgeFist: 8, mapBadgeCoin: 8,
  potTier4: 24, mapBadgeElite: 8, dangerPip: 8, cardPrep: 16,
  wild: 16, enhGold: 16, enhKeen: 16, enhCharged: 16, enhSpiked: 16, 
  relicPrism: 16, relicHone: 16,
  potSkim: 12, chip: 12, cashierPortrait: 24, 
  chipShield: 12, tagBuild: { w: 20, h: 7 }, shopHeal: 16, setStar: 16,
  cabinetKnight: { w: 48, h: 64 }, cabinetMidas: { w: 48, h: 64 }, cabinetThorn: { w: 48, h: 64 },
  cabinetTesla: { w: 48, h: 64 }, cabinetJoker: { w: 48, h: 64 }, cabinetLocked: { w: 48, h: 64 },
  enemyBomber: 24, enemyHexer: 24, enemyVampire: 24, enemyMimic: 24, enemyWheel: 24,
  bomb: 16, hex: 16, fangs: 16, mimicSym: 16, bombOverlay: 16, hexOverlay: 16, tier2Frame: 16,
  enhVamp: 16, enhLucky: 16, enhBlaze: 16, enhThorny: 16,
  enhLucre: 16, enhTrick: 16, enhIngot: 16,
  relicTicket: 16, relicBell: 16, relicPhoenix: 16, relicOvercharge: 16, relicKey: 16, relicSandglass: 16,
  icoBomb: 8, icoHex: 8, icoDrain: 8, icoGulp: 8, icoBets: 8,
  mapBadgeBomb: 8, mapBadgeHex: 8, mapBadgeFang: 8, mapBadgeMimic: 8, mapBadgeWheel: 8,
  actBadge2: { w: 24, h: 12 },
  slotHeart: 16, slotUp: 16, slotTopper: { w: 64, h: 16 },
  enemyCounterfeiter: 24, npcBloodBank: 24, npcPawnBroker: 24, npcLoanShark: 24, fake: 16, groundOverlay: 16, fakeOverlay: 16,
  icoLaunder: 8, mapBadgeFake: 8, setRibbon: { w: 44, h: 9 },
  enemyDealer: 24, enemySharp: 24, enemyPitBoss: 24, enemyCroupier: 24, enemyRepoMan: 24, card: 16, gavel: 16, rake: 16,
  icoShuffle: 8, icoMark: 8, icoGavel: 8, icoRake: 8,
  mapBadgeCard: 8, mapBadgeGavel: 8, mapBadgeRake: 8, mapBadgeDealer: 8,
  dealShuffle: { w: 16, h: 22 }, dealCut: { w: 16, h: 22 }, dealRaise: { w: 16, h: 22 }, cardBack: 16,
  confiscatedOverlay: 16, actPlaque3: { w: 24, h: 12 },
  bonusSym: 16, relicSym: 16, voucherBonus: { w: 24, h: 16 }, voucherRelic: { w: 24, h: 16 },
  rushEmpty: 16, rushJunk: 16, tierCommon: 12, tierUncommon: 12, tierLegendary: 12, wheelPointer: 12,
  logo: { w: 160, h: 44 }, menuBackdrop: { w: 64, h: 40 },
  iconNewRun: 16, iconTutorial: 16, iconCollection: 16, iconHiscores: 16, mysterySlot: 16,
  hsSkull: 12, trophySmall: 12, coinSpin0: 16, coinSpin1: 16, coinSpin2: 16, coinSpin3: 16, tutorialPointer: 12,
  heroKnight: 24, heroMidas: 24, heroTesla: 24, heroJoker: 24,
  goldbar: 16, thorn: 16, ace: 16, relicChalice: 16,
  relicDrum: 16, relicChainmail: 16, relicArmoredCar: 16, relicGreatsword: 16, relicSafeDeposit: 16, 
  relicGraft: 16, relicFaraday: 16, relicStatic: 16, relicCapbells: 16, relicStacked: 16,
  relicGoldleaf: 16, relicExecutioner: 16, relicHorseshoe: 16, relicUnderdog: 16,
  relicFirstblood: 16, relicPiggy: 16, relicTrophy: 16, relicHolywater: 16, relicBash: 16,
  relicHotStreak: 16, relicBelt: 16, 
  relicRainmaker: 16, relicSlushFund: 16, relicTipJar: 16, 
  relicTower: 16, relicHeadsman: 16, relicCapacitor: 16,
  relicLivewire: 16, relicEncore: 16, relicWildwheel: 16, relicDownpour: 16, 
  relicCoup: 16, relicCompound: 16, relicMeltdown: 16, relicPulse: 16,
  relicDeckdrum: 16, relicWildcard: 16, relicLoadedreel: 16,
  relicBracelet: 16, relicMetronome: 16, relicSnakeEyes: 16, relicPitBoss: 16, relicCoil: 16, relicTaxMan: 16,
  trimClassic: 16, trimBronze: 16, trimSilver: 16, trimNeon: 16, trimVelvet: 16,
  trimEmerald: 16, trimDiamond: 16, trimObsidian: 16, trimHouse: 16,
  note: 16, cabinetJukebox: { w: 48, h: 64 }, heroJukebox: 24,
  relicTurntable: 16, relicMixtape: 16, relicSubwoofer: 16, enhEcho: 16, volumeIcon: 8,
  wheelTopper: 24, betChip: 12, betStack1: 16, betStack2: 16, betStack3: 16,
  enemyOwner: 24, relicDrySpell: 16, relicPunchCard: 16, relicGoldenSpin: 16, relicInsurance: 16,
  relicHouseTax: 16, relicRegular: 16, relicHitmaker: 16, relicHouseOfCards: 16, relicParachute: 16, relicStarchart: 16,
  enhGlass: 16, ratRacer: 16, ratRacer2: 16, scratchTicket: 24, scratchCoin: 12, clawGrabber: 24, clawGrabberShut: 24,
  prizeBall: 12,
};
const errors = [];
// DIMS entries: a number for square sprites, or { w, h } for non-square ones
for (const [id, dim] of Object.entries(DIMS)) {
  const { w, h } = typeof dim === 'number' ? { w: dim, h: dim } : dim;
  const rows = S[id];
  if (!rows) { errors.push(`${id}: missing`); continue; }
  if (rows.length !== h) errors.push(`${id}: ${rows.length} rows, want ${h}`);
  rows.forEach((r, i) => {
    if (r.length !== w) errors.push(`${id} row ${i}: len ${r.length}, want ${w}`);
    for (const c of r) if (c !== '.' && !(c in PALETTE)) errors.push(`${id} row ${i}: bad char '${c}'`);
  });
}
if (Object.keys(S).length !== Object.keys(DIMS).length) errors.push('extra sprites');
if ('.' in PALETTE) errors.push("'.' in palette");
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const q = (s) => `'${s}'`;
let out = `// GENERATED by tools/build-art.mjs — edit that file and re-run \`node tools/build-art.mjs\`.
// Pixel art data for Slot vs Slot. Light source: top-left. 1px outline (K) on everything.

// Palette: single-character keys -> CSS hex colors. '.' is reserved for transparent (do not put it in PALETTE).
export const PALETTE: Record<string, string> = {
${Object.entries(PALETTE).map(([k, v]) => `  ${k}: ${q(v)},`).join('\n')}
};

export const UI_COLORS = {
${Object.entries(UI_COLORS).map(([k, v]) => `  ${k}: ${q(v)},`).join('\n')}
};

export type SpriteId =
  | 'sword' | 'shield' | 'bolt' | 'slime'          // reel symbols, 16x16
  | 'goo'                                          // slime-over overlay, 16x16
  | 'heart' | 'shieldIcon' | 'boltIcon'            // HUD bar icons, 8x8
  | 'swordProjectile'                              // 12x12, points RIGHT
  | 'slimeBlob'                                    // 8x8 flying goo glob
  | 'spark'                                        // 5x5 hit spark
  | 'playerPortrait' | 'enemyPortrait'             // 24x24
  | 'enemyBrute' | 'enemyFrost' | 'enemyThief'     // enemy portraits, 24x24
  | 'enemyGolem' | 'enemyGremlin' | 'enemyBoss'
  | 'ice' | 'claw' | 'rock' | 'lock'               // enemy reel symbols, 16x16
  | 'coin' | 'seven' | 'ball'                     // boss reel symbols, 16x16 (ball: THE WHEEL's BALL)
  | 'frozenOverlay' | 'lockOverlay'               // cell overlays, 16x16 (mostly transparent)
  | 'relicClover'  // relic icons, 16x16
  | 'relicBattery' | 'relicMirror' | 'relicFang'
  | 'relicBandage' 
  | 'icoFlood' | 'icoSmash' | 'icoFreeze'        // intent / UI icons, 8x8
  | 'icoSteal' | 'icoLock' | 'icoRock' | 'icoCoin'
  | 'plusBadge' | 'minusBadge' | 'skull'
  | 'nodeFight' | 'nodeBoss' | 'nodeDone' | 'nodeHere' // map nodes, 12x12
  | 'relicLockpick' // counter relics, 16x16
  | 'relicPickaxe' | 'relicDice' 
  | 'cardSwap' | 'cardClear' | 'potTier1'          // card / pot icons, 16x16
  | 'arrowRight'                                   // 8x8
  | 'potTier2' | 'potTier3'                        // 24x24
  | 'mapFork'                                      // 12x12
  | 'mapBadgeSlime' | 'mapBadgeIce' | 'mapBadgeClaw' // map writer badges, 8x8
  | 'mapBadgeRock' | 'mapBadgeLock' | 'mapBadgeFist' | 'mapBadgeCoin'
  | 'potTier4'                                     // lethal pot, 24x24
  | 'mapBadgeElite' | 'dangerPip'                  // elite fork badge / danger rating pip, 8x8
  | 'cardPrep'                                     // card icon, 16x16
  | 'wild'                                         // WILD reel symbol, 16x16
  | 'enhGold' | 'enhKeen' | 'enhCharged' | 'enhSpiked' // enhanced-cell overlays, 16x16 (mostly transparent)
  | 'relicPrism' | 'relicHone'
  | 'potSkim' | 'chip'                             // pot skim hand / chip currency, 12x12
  | 'cashierPortrait'                 // cashier NPC / shop display cushion, 24x24
  | 'chipShield'                                   // saved chips -> shield vs the House, 12x12
  | 'tagBuild'                                     // green "FITS" build tag, 20x7 (non-square)
  | 'shopHeal' | 'setStar'                         // cashier first-aid tin / full-set bonus star, 16x16
  | 'cabinetKnight' | 'cabinetMidas' | 'cabinetThorn' // run-select slot cabinets, 48x64 (non-square)
  | 'cabinetTesla' | 'cabinetJoker' | 'cabinetLocked'
  | 'enemyBomber' | 'enemyHexer' | 'enemyVampire'  // act 2 enemy portraits, 24x24
  | 'enemyMimic' | 'enemyWheel'                    // (enemyWheel = act 2 boss, THE WHEEL)
  | 'bomb' | 'hex' | 'fangs' | 'mimicSym'          // act 2 enemy reel symbols, 16x16
  | 'bombOverlay' | 'hexOverlay' | 'tier2Frame'    // act 2 cell overlays / tier II gild marker, 16x16 (mostly transparent)
  | 'enhVamp' | 'enhLucky' | 'enhBlaze' | 'enhThorny'         // act 2 upgrade overlays, 16x16 (mostly transparent)
  | 'enhLucre' | 'enhTrick' | 'enhIngot'           // charm overlays (LUCRE, TRICK, INGOT), 16x16 (mostly transparent)
  | 'relicTicket' | 'relicBell' | 'relicPhoenix'   // legendary relics, 16x16
  | 'relicOvercharge' | 'relicKey' | 'relicSandglass'
  | 'icoBomb' | 'icoHex' | 'icoDrain' | 'icoGulp' | 'icoBets' // act 2 intent icons, 8x8
  | 'mapBadgeBomb' | 'mapBadgeHex' | 'mapBadgeFang' // act 2 map badges, 8x8
  | 'mapBadgeMimic' | 'mapBadgeWheel'
  | 'actBadge2'                                    // act 2 map header plaque, 24x12 (non-square)
  | 'slotHeart' | 'slotUp' | 'slotTopper' // LUCKY SEVENS prize symbols 16x16, topper 64x16
  | 'npcBloodBank' | 'npcPawnBroker' | 'npcLoanShark'      // NPC portraits, 24x24
  | 'enemyCounterfeiter'         // act 2 enemy portraits (batch 8), 24x24
  | 'fake'                              // their reel symbols, 16x16
  | 'groundOverlay' | 'fakeOverlay'                // their cell overlays, 16x16 (mostly transparent)
  | 'icoLaunder'                      // their ability icons, 8x8
  | 'mapBadgeFake'              // their map badges, 8x8
  | 'setRibbon'                                    // 'SET!' completes-set ribbon, 44x9 (non-square)
  | 'enemySharp' | 'enemyPitBoss' | 'enemyCroupier' | 'enemyRepoMan' // act 3 enemy portraits + the gatekeeper, 24x24
  | 'enemyDealer'                                  // (enemyDealer = act 3 final boss)
  | 'card' | 'gavel' | 'rake'                      // act 3 enemy reel symbols, 16x16
  | 'icoShuffle'           // act 3 ability icons, 8x8
  | 'icoMark' | 'icoGavel' | 'icoRake'
  | 'mapBadgeCard' | 'mapBadgeGavel' | 'mapBadgeRake' | 'mapBadgeDealer' // act 3 map badges, 8x8
  | 'dealShuffle' | 'dealCut' | 'dealRaise' // Dealer's face-up deal cards, 16x22 (non-square)
  | 'cardBack'                                     // face-down card: MARKED cell overlay, 16x16
  | 'confiscatedOverlay'                           // confiscated-gild cell overlay, 16x16 (mostly transparent)
  | 'actPlaque3'                                   // act 3 map header plaque, 24x12 (non-square)
  | 'bonusSym' | 'relicSym'                       // rare chase reel symbols (BONUS / RELIC RUSH), 16x16
  | 'voucherBonus' | 'voucherRelic'               // prize voucher ticket stubs, 24x16 (non-square)
  | 'rushEmpty' | 'rushJunk'                      // RELIC RUSH grid cells, 16x16
  | 'tierCommon' | 'tierUncommon' | 'tierLegendary' // relic tier gem badges, 12x12
  | 'wheelPointer'                                // prize wheel pointer, 12x12
  | 'logo'                                        // title marquee 'SLOTS VS. SLOTS', 160x44 (non-square)
  | 'menuBackdrop'                                // chips / coins / dice pile under the menu, 64x40 (non-square)
  | 'iconNewRun' | 'iconTutorial' | 'iconCollection' | 'iconHiscores' // main-menu button icons, 16x16
  | 'mysterySlot'                                 // locked collection entry, 16x16
  | 'hsSkull' | 'trophySmall'                     // hiscore killed-by / victory markers, 12x12
  | 'coinSpin0' | 'coinSpin1' | 'coinSpin2' | 'coinSpin3' // loading-screen coin spin frames, 16x16
  | 'tutorialPointer'                             // tutorial callout arrow, points DOWN, 12x12
  | 'heroKnight' | 'heroMidas'      // player hero portraits (face RIGHT), 24x24
  | 'heroTesla' | 'heroJoker'
  | 'goldbar' | 'thorn' | 'ace'                          // signature symbols: MIDAS gold bar, BRIAR thorn, 16x16
  | 'relicChalice'                               // BLOOD CHALICE relic, 16x16
  | 'relicDrum' | 'relicChainmail' | 'relicArmoredCar' | 'relicGreatsword' | 'relicSafeDeposit' // charm-rework relics, 16x16
  | 'relicGraft' | 'relicFaraday' | 'relicStatic'
  | 'relicCapbells' | 'relicStacked' | 'relicGoldleaf' | 'relicExecutioner'
  | 'relicHorseshoe' | 'relicUnderdog' | 'relicFirstblood'
  | 'relicPiggy' | 'relicTrophy' | 'relicHolywater' | 'relicBash'
  | 'trimClassic' | 'trimBronze' | 'trimSilver'  // slot machine trim crests, 16x16
  | 'trimNeon' | 'trimVelvet' | 'trimEmerald'
  | 'trimDiamond' | 'trimObsidian' | 'trimHouse'
  | 'relicHotStreak' | 'relicBelt' // relics, 16x16
  | 'relicBracelet' | 'relicMetronome' | 'relicSnakeEyes'
  | 'relicPitBoss' | 'relicCoil' | 'relicTaxMan'
  | 'relicRainmaker' | 'relicSlushFund' // THE BANKROLL relics, 16x16
  | 'relicTipJar' 
  | 'relicTower' | 'relicHeadsman' // per-character relics, 16x16
  | 'relicCapacitor' | 'relicLivewire' | 'relicEncore' | 'relicWildwheel'
  | 'relicDownpour' 
  | 'relicCoup' | 'relicCompound' | 'relicMeltdown' | 'relicPulse'
  | 'relicDeckdrum' | 'relicWildcard' | 'relicLoadedreel'
  | 'note'                                       // THE JUKEBOX attack symbol (NOTE), 16x16
  | 'cabinetJukebox'                             // THE JUKEBOX slot machine, 48x64 (non-square)
  | 'heroJukebox'                                // DJ DECIBEL hero portrait (faces RIGHT), 24x24
  | 'relicTurntable' | 'relicMixtape' | 'relicSubwoofer' // THE JUKEBOX relics, 16x16
  | 'enhEcho'                                    // ECHO charm overlay, 16x16 (mostly transparent)
  | 'volumeIcon'                                 // HUD volume meter icon, 8x8
  | 'wheelTopper'                                // THE WHEEL's roulette-wheel topper (top view), 24x24
  | 'betChip'                                    // THE WHEEL's bet chip (top view), 12x12
  | 'betStack1' | 'betStack2' | 'betStack3'      // bet chip stacks on your reels (side view), 16x16
  | 'enemyOwner'                                 // THE OWNER, ENDLESS final boss portrait, 24x24
  | 'relicDrySpell' | 'relicPunchCard' | 'relicGoldenSpin' | 'relicInsurance' // relics, 16x16
  | 'relicHouseTax' | 'relicRegular'
  | 'relicHitmaker' | 'relicHouseOfCards' | 'relicParachute' | 'relicStarchart' // per-character relics (JUKEBOX, JOKER, BANKROLL), 16x16
  | 'enhGlass'                                   // GLASS charm overlay, 16x16 (mostly transparent)
  | 'ratRacer' | 'ratRacer2'                     // RAT RACE runner, two gallop frames (faces RIGHT), 16x16
  | 'scratchTicket' | 'scratchCoin'              // SCRATCH-OFF ticket 24x24, scratching coin 12x12
  | 'clawGrabber' | 'clawGrabberShut'            // CLAW game claw, open / closed, 24x24
  | 'prizeBall';                                 // CLAW game prize capsule, 12x12

export const SPRITES: Record<SpriteId, string[]> = {
`;
for (const id of Object.keys(DIMS)) {
  out += `  ${id}: [\n${S[id].map((r) => `    ${q(r)},`).join('\n')}\n  ],\n`;
}
out += '};\n';
// every sprite must also be listed in the SpriteId union (else SPRITES fails to typecheck)
const unionSrc = out.slice(out.indexOf('export type SpriteId'), out.indexOf('export const SPRITES'));
const missingU = Object.keys(DIMS).filter((id) => !unionSrc.includes(`'${id}'`));
if (missingU.length) { console.error(`not in SpriteId union: ${missingU.join(', ')}`); process.exit(1); }
writeFileSync(join(ROOT, 'src/render/spriteData.ts'), out);
console.log('spriteData.ts written, self-check OK');
if (process.argv.includes('--print')) for (const id of Object.keys(DIMS)) console.log(`\n${id}\n${S[id].join('\n')}`);
