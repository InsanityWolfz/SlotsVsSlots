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
S.pipFull = [
  '...KK...',
  '..KWYK..',
  '.KWYYYK.',
  'KYYYYYOK',
  'KYYYYOOK',
  '.KYYOoK.',
  '..KOoK..',
  '...KK...',
];
S.pipEmpty = [
  '...KK...',
  '..KKPK..',
  '.KKPPpK.',
  'KKPPPppK',
  'KPPPpppK',
  '.KPpppK.',
  '..KppK..',
  '...KK...',
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
S.relicWhetstone = lit(16, 16, [
  '................',
  '...........Y....',
  '...........W....',
  '.........YWWWY..',
  '...........W....',
  '........Y..Y....',
  '.......W........',
  '....WLLLLLLLLLS.',
  '...LLLLLLLLLLSSD',
  '..SSSSSSSSSSSDD.',
  '..SSDSSSSDSSSD..',
  '..SSSSSDSSSSDD..',
  '..DDDDDDDDDDD...',
]);
S.relicSoap = lit(16, 16, [
  '................',
  '...........AA...',
  '..AA......AWAA..',
  '.AWA......AAAA..',
  '..A........AA...',
  '.......AW.......',
  '.......AA.......',
  '....WMMMMMMMMM..',
  '...MMWMMMMMMMMm.',
  '..MMMMMMMMMMMmm.',
  '.mmmmmmmmmmmmmm.',
  '.mmmmmmmmmmmmmr.',
  '.mmmmmmmmmmmmr..',
  '.rrrrrrrrrrrr...',
]);
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
S.relicHourglass = lit(16, 16, [
  '................',
  '.YYGGGGGGGGGGGg.',
  '.gggggggggggggg.',
  '..G.WAAAAAAA.g..',
  '..G.A......A.g..',
  '..G..AYYYYA..g..',
  '..G...AYOA...g..',
  '..G....YO....g..',
  '..G....Y.....g..',
  '..G...AO.A...g..',
  '..G..A.Y..A..g..',
  '..G.A.YYOO.A.g..',
  '..G.AYYYOOOA.g..',
  '.YYGGGGGGGGGGGg.',
  '.gggggggggggggg.',
]);
S.relicMagnet = lit(16, 16, [
  '................',
  '..WLLS....LLLS..',
  '..LLSD....LLSD..',
  '..RRRr....RRRr..',
  '..RWRr....RRRr..',
  '..RRRr....RRRr..',
  '..RRRr....RRrr..',
  '..RRRr....RRrr..',
  '..RRRRr..rRRrr..',
  '..RRRRRrrrRRrr..',
  '...RRRRRRRRrr...',
  '....rrrrrrrr....',
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
S.relicMittens = lit(16, 16, [
  '................',
  '...RRR....RRR...',
  '..RWRRr..RRRRr..',
  '..RRRRr..RRRRr..',
  '..RRRRr..RRRRr..',
  '..TRTRT..TRTRt..',
  '.RKTRTr..RTRTKr.',
  '.RKRRRr..RRRRKr.',
  '.RRRRRr..RRRRrr.',
  '..RRRRr..RRRRr..',
  '..rrrrr..rrrrr..',
  '..WTTTt..WTTTt..',
  '..TtTtt..TtTtt..',
  '..TtTtt..TtTtt..',
  '..ttttt..ttttt..',
]);
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
S.relicMousetrap = lit(16, 16, [
  '................',
  '................',
  '................',
  '..WLLLLS........',
  '..L....D........',
  '..L....D...YY...',
  '..L....D.YWYYG..',
  '..L....DYYYYGGg.',
  '..L....DYgYYGgg.',
  '..S....DGGGgGgg.',
  '.wwLSLSDwwwwwwww',
  '.wwwwwwwwwwwwwwB',
  '.BBBBBBBBBBBBBBb',
  '.bbbbbbbbbbbbbbb',
]);
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
S.relicCrown = lit(16, 16, [
  '................',
  '................',
  '..W....WY....Y..',
  '..Y....YG....G..',
  '..YG..YGGg..Gg..',
  '..YGG.YGGg.GGg..',
  '..YGGGGGGGGGGg..',
  '..YGGGGRRGGGGg..',
  '..YGGGRWRrGGGg..',
  '..YGGGRRrrGGGg..',
  '..YGGGGrrGGGGg..',
  '..gggggggggggg..',
  '..YWYYYYYYYYYG..',
  '..GRGGGAAGGGRg..',
  '..gggggggggggg..',
]);

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
S.cardGild = lit(16, 16, [
  '................',
  '...........ww...',
  '.....WLLSwwBB...',
  '..Y..LLSDBB.....',
  '.YWY.LSSD.......',
  '..Y..SDDD..G....',
  '...........Y....',
  '..WWLLLLLLLLLS..',
  '....LSSSSSSSSD..',
  '......SSSSSD....',
  '.......SSSD.....',
  '.......SDDD.....',
  '.....LSSSSSDD...',
  '....SSSSSSSSDD..',
]);

// ================================================================ BUILD RELICS / GILD READABILITY / CASHIER (batch 5)
// ---------------------------------------------------------------- build relics (16x16)
// midas: golden open hand in a royal red cuff, sparkle at the index fingertip
S.relicMidas = lit(16, 16, [
  '................',
  '..Y.............',
  '.YWY...YG.......',
  '..Y....YG.......',
  '....WG.YG.YG....',
  '....YG.YG.YG....',
  '....YG.YG.YG.Gg.',
  '....YG.YG.YG.Gg.',
  '.YG.YG.YG.YG.Gg.',
  '.YGGYWGYWGYGGGg.',
  '..YGGGGGGGGGGGg.',
  '..YYGGGGgGGGGGg.',
  '...YGGGGGgGGGg..',
  '....YGGGGGGGgg..',
  '.....RMRRRRRr...',
  '.....rrrrrrrr...',
]);
// lightning rod: copper spike on a steel base, a small bolt striking the tip
S.relicRod = lit(16, 16, [
  '................',
  '...........WY...',
  '..........WY....',
  '.........WYYY...',
  '..........YO....',
  '.......Y.Y...Y..',
  '.........W......',
  '........aOo.....',
  '........aOo.....',
  '........aOo.....',
  '........aOo.....',
  '........aOo.....',
  '.......LLSSD....',
  '.....WLLSSSSD...',
  '....SSSSSSSSSDD.',
]);
// cactus: spiky green cactus in a terracotta pot, tiny pink flower on top
S.relicCactus = lit(16, 16, [
  '................',
  '.......MM.......',
  '......MWMm......',
  '.......Mm.......',
  '......EeeQ......',
  '......TeeQ......',
  '..EQ..EeeT...EQ.',
  '..TQ..EeeQ...eT.',
  '..EeeeEeTQ...eQ.',
  '...QQQEeeQeeeeQ.',
  '......TeeQQQQQ..',
  '......EeeQ......',
  '....aOOOOOOo....',
  '....oooooooo....',
  '.....aOOOOo.....',
  '.....OOOOoo.....',
]);
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
// X2 stamp (12x8): chunky gold glyphs, auto-outlined
S.stampX2 = lit(12, 8, [
  '............',
  '.WY.YG.WYYG.',
  '..YYG....YG.',
  '..YGG...YGg.',
  '..YGg..YGg..',
  '.YG.Gg.YG...',
  '.Gg.gg.GGgg.',
  '............',
]);
// strip-map ticks (5x5): distinct silhouettes
S.tickGold = [
  'KKKKK',
  'KWYGK',
  'KYGgK',
  'KGggK',
  'KKKKK',
];
S.tickKeen = [
  '...KW',
  '..KCK',
  '.KCK.',
  'KcK..',
  'cK...',
];
S.tickCharged = [
  '..KWK',
  '.KYK.',
  'KYYYK',
  '.KYK.',
  'KOK..',
];
S.tickSpiked = [
  '.KLK.',
  'KKLKK',
  'LLWSD',
  'KKSKK',
  '.KDK.',
];

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
// shop slot (24x24): tufted velvet cushion with gold piping + tassels on a small gold pedestal
S.shopSlot = lit(24, 24, [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '.....MMRRRRRRRRRRRRr....',
  '...MMRRRRRRRRRRRRRRRRr..',
  '..MRRRGRRRRRRRRRRGRRRr..',
  '..MRRRRrrrrrrrrrrRRRRr..',
  '..RRRRRrrrrrrrrrrRRRrr..',
  '..YYGGGGGGGGGGGGGGGGGg..',
  '.GRRRrrrrGrrrrrGrrrrrdG.',
  '.YRrrrrrrrrrrrrrrrrrddg.',
  'YGgrrrdddddddddddddddgYg',
  'Gg.GGGGGGGGGGGGGGGGgg.Gg',
  'g......YGGGGGGGGGg....g.',
  '........YGGGGGGgg.......',
  '.....YYYGGGGGGGGGGgg....',
  '.....gggggggggggggggg...',
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
  reels: [['bolt', 'sword', 'shield'], ['sword', 'shield', 'bolt'], ['shield', 'bolt', 'sword']],
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

// midas: all gold, red velvet trim, a crown on the marquee, gold-framed bolts, coins spilling in the tray
S.cabinetMidas = cabinet({
  body: ['Y', 'G', 'g', 'b'], trim: ['R', 'r', 'd'], rim: ['Y', 'G', 'g'], panel: ['R', 'r', 'd'], bulbs: ['W', 'Y'], knob: ['M', 'R', 'r'],
  reels: [['bolt', 'bolt', 'bolt'], ['bolt', 'bolt', 'bolt'], ['bolt', 'bolt', 'bolt']],
  cellFx(g, x0, y0) {
    for (let y = y0 - 1; y <= y0 + 9; y++) for (let x = x0; x <= x0 + 8; x++) {
      if (x !== x0 && x !== x0 + 8 && y !== y0 - 1 && y !== y0 + 9) continue;
      put(g, x, y, (x === x0 || y === y0 - 1) ? 'Y' : 'g');
    }
    put(g, x0, y0 - 1, 'W'); put(g, x0 + 8, y0 + 9, 'G');
  },
  belly(g) { for (let x = 9; x <= 35; x += 4) { put(g, x, 48, 'Y'); put(g, x + 1, 49, 'G'); } },
  tray(g) { stamp(g, 12, 53, [' YG  WYG', 'GYYg YYGg']); stamp(g, 25, 53, ['  YG', 'YGYYg']); stamp(g, 31, 54, ['YG']); },
  deco(g) {
    stampRimmed(g, 15, 1, [
      'W     W     W',
      'YG   YWG   YG',
      'YGG YGGGg YGg',
      'YGGYGRRGgYGGg',
      'YGGGGRrGGGGGg',
      'YMRYGGGGGAUGg',
      'ggggggggggggg',
    ]);
    stampRimmed(g, 19, 10, [' YYYG ', 'YWYYGg', 'YYgYGg', 'YYgYGg', 'GYYGgg', ' Gggg ']);
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
    reels: [['spiky', 'spiky', 'spiky'], ['spiky', 'spiky', 'spiky'], ['spiky', 'spiky', 'spiky']],
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
// mirror: FINAL BOSS — ornate gold/silver oval, cracked glass holding the hero's ghostly, flipped, cyan reflection
{
  const g = grid(24, 24);
  const cx = 11.5, cy = 11.5;
  const ell = (x, y, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    if (!ell(x, y, 9.4, 11)) continue;
    const s = (x - cx) / 9.4 + (y - cy) / 11;
    if (ell(x, y, 6.9, 8.6)) put(g, x, y, s > 0.8 ? 'N' : 'n');
    else if (ell(x, y, 7.9, 9.6)) put(g, x, y, s < -0.5 ? 'L' : s > 0.5 ? 'D' : 'S');
    else put(g, x, y, s < -0.55 ? 'Y' : s > 0.55 ? 'g' : 'G');
  }
  // the hero, drawn in hero colours then recoloured to a ghost and flipped left-right
  const hero = [
    '     RR     ',
    '    RWRr    ',
    '     Rr     ',
    '   WLLLSS   ',
    '  WLLLLLSSD ',
    '  LLLLLLSSD ',
    ' YGGGGGGGGg ',
    '  LSFFFFSSD ',
    '  LSKFFKfSD ',
    '  LSFFFFfSD ',
    '  SSFbbFfSD ',
    '  SSSFFfSSD ',
    '   SSSSSSD  ',
    ' LLSAUGUNSD ',
    'LLSSAGGGUNSD',
  ];
  // ghost palette: steel -> cyan (lit side now on the RIGHT), face -> hollow navy, eyes -> burning red
  const GHOST = { R: 'A', r: 'c', W: 'W', L: 'C', S: 'A', D: 'c', Y: 'W', G: 'C', g: 'c', F: 'N', f: 'n', K: 'R', b: 'c', A: 'C', U: 'c', N: 'N' };
  stamp(g, 6, 4, hero.map((r) => [...r].reverse().map((c) => (c === ' ' ? ' ' : GHOST[c])).join('')));
  // cracks: impact star high on the right of the glass, fractures running down its edge and across the lower-left
  const upper = [[16, 6], [15, 7], [14, 8], [13, 8], [12, 9], [16, 7], [17, 8], [17, 9], [16, 10], [16, 11]];
  const lower = [[6, 14], [7, 15], [7, 16], [8, 17], [9, 17], [9, 18], [10, 19]];
  [...upper, ...lower].forEach(([x, y]) => put(g, x, y, 'W'));
  lower.forEach(([x, y]) => { if (ell(x, y + 1, 6.9, 8.6) && get(g, x, y + 1) !== 'W') put(g, x, y + 1, 'K'); });
  plot(g, [[17, 5, 'C'], [15, 5, 'C'], [17, 6, 'W'], [15, 6, 'K'], [13, 9, 'K'], [5, 13, 'C'], [8, 16, 'C']]);
  // crest: gold fleur with a blood-red gem breaking the top of the frame
  stamp(g, 8, 0, [
    '  YGGg  ',
    ' YGRRgg ',
    'YGRWRrGg',
    ' gGRrGg ',
  ]);
  // side flourishes
  stamp(g, 0, 9, [' Y', 'YGG', 'Gg', ' g']);
  stamp(g, 21, 9, [' Gg', 'GGg', ' gg', ' g']);
  stamp(g, 10, 21, ['GRRg', ' rr ']); // drop gem at the foot of the frame
  outline(g);
  // eerie cyan glow hugging the frame
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++)
    if (g[y][x] === '.' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => get(g, x + dx, y + dy) === 'K')) g[y][x] = (x + y) % 3 ? 'c' : 'N';
  S.enemyMirror = toRows(g);
}

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
S.icoReflect = lit(8, 8, ['', '.Y...Cc', '..Y..Cc', '...YYCc', '..YY.Cc', '.Y...Cc']);

// ---------------------------------------------------------------- act 2 map badges (8x8)
S.mapBadgeBomb = lit(8, 8, ['', '....YW', '...B', '..lkkk', '.lWkkkP', '.lkkkPP', '..kPPP']);
S.mapBadgeHex = lit(8, 8, ['', '..Mxxs', '.Mx..xs', '.x.i..s', '.x..ixs', '..xsss']);
S.mapBadgeFang = lit(8, 8, ['', '.MRRRRr', '.WTrrWT', '.WT..WT', '..T...T', '..t...t']);
S.mapBadgeMimic = lit(8, 8, ['', '.wwwwwB', '.GGGGGg', '.WdWdWd', '.GGYGGg', '.BBKBBb', '.bbbbbb']);
S.mapBadgeMirror = lit(8, 8, ['', '..YGGg', '.YCnWg', '.GnWng', '.GWnNg', '.gNNcg', '..ggg']);

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
// grounder: stocky dwarf lineworker — copper hard hat, ruddy nose, big brown beard, green work jacket with
// copper suspenders, raising a copper-banded mallet
S.enemyGrounder = lit(24, 24, [
  '........................',
  '.......aaOOOo.....awwwwO',
  '.....aWaaOOOOOo...aWwwBo',
  '....aaaaaYGOOOoo..OwBBBo',
  '....aaaaaGgOOooo..OBBBbo',
  '..aaaOOOOOOOOOooo.obbbbo',
  '....bffffffffffb....wB..',
  '....bFbbbFFbbbfb....wB..',
  '....bFWKFFFFWKfb....wB..',
  '....BFFFFMRFFffB....wB..',
  '....BwBBMRRrBBbb...FFFf.',
  '....wwBBBbBBBBbb...fFff.',
  '....BBBBKrrKBBBb..aOOo..',
  '..eQwBBBbKKbBBbbQQeQQq..',
  '.eeQQBBwBBBBBbbQQQeQQq..',
  'EeeQQBBBwBBBbbbQQqeQQq..',
  'EeeQOQBBBBBbbbQOQqeQQq..',
  'EeeQOQQBBBbbbQQOQqQQQq..',
  'EeeQOQQQBaObQQQOQQQQQq..',
  'EeeQOQQQQQQQQQQOQQQQqq..',
  'EeeQOQQQQqqQQQQOQQQQqq..',
  'wwwBaBBBBYGBBBBaBBBBbb..',
  'QQQqqqqqqqqqqqqqqqqqqq..',
  'QQqqqqqqqqqqqqqqqqqqqq..',
]);
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
// ground: the earth sign itself — a copper grounding rod with a steel clamp, driven into three copper bars
S.ground = lit(16, 16, [
  '................',
  '......aWOo......',
  '.......ao.......',
  '......LLSD......',
  '......SSDD......',
  '.......ao.......',
  '.......ao.......',
  '.aaaaaaaaOOOOOO.',
  '.OOOOOOOOOOOOoo.',
  '................',
  '....aaaaOOOO....',
  '....OOOOOOoo....',
  '................',
  '......aOOo......',
  '......OOoo......',
]);
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
S.icoEarth = lit(8, 8, ['', '...aO', '.aaaOOo', '', '..aOOo', '', '...Oo']);
S.icoLaunder = lit(8, 8, ['', '..YGGg', '.YCCCCg', '.GGGGcg', '.GCcGcg', '.gccccg', '..gggg']);

// ---------------------------------------------------------------- map badges (8x8)
S.mapBadgeGround = lit(8, 8, ['', '..aWOo', '...ao', '...ao', '...ao', '.EeaoeQ', '.bbbbbb']);
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

// ---------------------------------------------------------------- emit + self-check
const DIMS = {
  sword: 16, shield: 16, bolt: 16, slime: 16, goo: 16,
  heart: 8, shieldIcon: 8, boltIcon: 8, pipFull: 8, pipEmpty: 8,
  swordProjectile: 12, slimeBlob: 8, spark: 5, playerPortrait: 24, enemyPortrait: 24,
  enemyBrute: 24, enemyFrost: 24, enemyThief: 24, enemyGolem: 24, enemyGremlin: 24, enemyBoss: 24,
  ice: 16, claw: 16, rock: 16, lock: 16, coin: 16, seven: 16,
  frozenOverlay: 16, lockOverlay: 16,
  relicClover: 16, relicWhetstone: 16, relicSoap: 16, relicBattery: 16, relicMirror: 16,
  relicFang: 16, relicBandage: 16, relicHourglass: 16, relicMagnet: 16,
  icoFlood: 8, icoSmash: 8, icoFreeze: 8, icoSteal: 8, icoLock: 8, icoRock: 8, icoCoin: 8,
  plusBadge: 8, minusBadge: 8, skull: 8,
  nodeFight: 12, nodeBoss: 12, nodeDone: 12, nodeHere: 12,
  relicMittens: 16, relicLockpick: 16, relicMousetrap: 16, relicPickaxe: 16, relicDice: 16, relicCrown: 16,
  cardSwap: 16, cardClear: 16, arrowRight: 8, potTier1: 16, potTier2: 24, potTier3: 24, mapFork: 12,
  mapBadgeSlime: 8, mapBadgeIce: 8, mapBadgeClaw: 8, mapBadgeRock: 8, mapBadgeLock: 8, mapBadgeFist: 8, mapBadgeCoin: 8,
  potTier4: 24, mapBadgeElite: 8, dangerPip: 8, cardPrep: 16,
  wild: 16, enhGold: 16, enhKeen: 16, enhCharged: 16, enhSpiked: 16, cardGild: 16,
  relicMidas: 16, relicRod: 16, relicCactus: 16, relicPrism: 16, relicHone: 16,
  stampX2: { w: 12, h: 8 }, tickGold: 5, tickKeen: 5, tickCharged: 5, tickSpiked: 5,
  potSkim: 12, chip: 12, cashierPortrait: 24, shopSlot: 24,
  chipShield: 12, tagBuild: { w: 20, h: 7 }, shopHeal: 16, setStar: 16,
  cabinetKnight: { w: 48, h: 64 }, cabinetMidas: { w: 48, h: 64 }, cabinetThorn: { w: 48, h: 64 },
  cabinetTesla: { w: 48, h: 64 }, cabinetJoker: { w: 48, h: 64 }, cabinetLocked: { w: 48, h: 64 },
  enemyBomber: 24, enemyHexer: 24, enemyVampire: 24, enemyMimic: 24, enemyMirror: 24,
  bomb: 16, hex: 16, fangs: 16, mimicSym: 16, bombOverlay: 16, hexOverlay: 16, tier2Frame: 16,
  enhVamp: 16, enhLucky: 16, enhBlaze: 16,
  relicTicket: 16, relicBell: 16, relicPhoenix: 16, relicOvercharge: 16, relicKey: 16, relicSandglass: 16,
  icoBomb: 8, icoHex: 8, icoDrain: 8, icoGulp: 8, icoReflect: 8,
  mapBadgeBomb: 8, mapBadgeHex: 8, mapBadgeFang: 8, mapBadgeMimic: 8, mapBadgeMirror: 8,
  actBadge2: { w: 24, h: 12 },
  enemyGrounder: 24, enemyCounterfeiter: 24, ground: 16, fake: 16, groundOverlay: 16, fakeOverlay: 16,
  icoEarth: 8, icoLaunder: 8, mapBadgeGround: 8, mapBadgeFake: 8, setRibbon: { w: 44, h: 9 },
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
  | 'pipFull' | 'pipEmpty'                         // special-energy pips, 8x8
  | 'swordProjectile'                              // 12x12, points RIGHT
  | 'slimeBlob'                                    // 8x8 flying goo glob
  | 'spark'                                        // 5x5 hit spark
  | 'playerPortrait' | 'enemyPortrait'             // 24x24
  | 'enemyBrute' | 'enemyFrost' | 'enemyThief'     // enemy portraits, 24x24
  | 'enemyGolem' | 'enemyGremlin' | 'enemyBoss'
  | 'ice' | 'claw' | 'rock' | 'lock'               // enemy reel symbols, 16x16
  | 'coin' | 'seven'                              // boss reel symbols, 16x16
  | 'frozenOverlay' | 'lockOverlay'               // cell overlays, 16x16 (mostly transparent)
  | 'relicClover' | 'relicWhetstone' | 'relicSoap'  // relic icons, 16x16
  | 'relicBattery' | 'relicMirror' | 'relicFang'
  | 'relicBandage' | 'relicHourglass' | 'relicMagnet'
  | 'icoFlood' | 'icoSmash' | 'icoFreeze'        // intent / UI icons, 8x8
  | 'icoSteal' | 'icoLock' | 'icoRock' | 'icoCoin'
  | 'plusBadge' | 'minusBadge' | 'skull'
  | 'nodeFight' | 'nodeBoss' | 'nodeDone' | 'nodeHere' // map nodes, 12x12
  | 'relicMittens' | 'relicLockpick' | 'relicMousetrap' // counter relics, 16x16
  | 'relicPickaxe' | 'relicDice' | 'relicCrown'
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
  | 'cardGild'                                     // card icon, 16x16
  | 'relicMidas' | 'relicRod' | 'relicCactus'      // build relics, 16x16
  | 'relicPrism' | 'relicHone'
  | 'stampX2'                                      // gilded-score pop stamp, 12x8 (non-square)
  | 'tickGold' | 'tickKeen' | 'tickCharged' | 'tickSpiked' // strip-map enhancement ticks, 5x5
  | 'potSkim' | 'chip'                             // pot skim hand / chip currency, 12x12
  | 'cashierPortrait' | 'shopSlot'                 // cashier NPC / shop display cushion, 24x24
  | 'chipShield'                                   // saved chips -> shield vs the House, 12x12
  | 'tagBuild'                                     // green "FITS" build tag, 20x7 (non-square)
  | 'shopHeal' | 'setStar'                         // cashier first-aid tin / full-set bonus star, 16x16
  | 'cabinetKnight' | 'cabinetMidas' | 'cabinetThorn' // run-select slot cabinets, 48x64 (non-square)
  | 'cabinetTesla' | 'cabinetJoker' | 'cabinetLocked'
  | 'enemyBomber' | 'enemyHexer' | 'enemyVampire'  // act 2 enemy portraits, 24x24
  | 'enemyMimic' | 'enemyMirror'                   // (enemyMirror = act 2 final boss)
  | 'bomb' | 'hex' | 'fangs' | 'mimicSym'          // act 2 enemy reel symbols, 16x16
  | 'bombOverlay' | 'hexOverlay' | 'tier2Frame'    // act 2 cell overlays / tier II gild marker, 16x16 (mostly transparent)
  | 'enhVamp' | 'enhLucky' | 'enhBlaze'            // act 2 upgrade overlays, 16x16 (mostly transparent)
  | 'relicTicket' | 'relicBell' | 'relicPhoenix'   // legendary relics, 16x16
  | 'relicOvercharge' | 'relicKey' | 'relicSandglass'
  | 'icoBomb' | 'icoHex' | 'icoDrain' | 'icoGulp' | 'icoReflect' // act 2 intent icons, 8x8
  | 'mapBadgeBomb' | 'mapBadgeHex' | 'mapBadgeFang' // act 2 map badges, 8x8
  | 'mapBadgeMimic' | 'mapBadgeMirror'
  | 'actBadge2'                                    // act 2 map header plaque, 24x12 (non-square)
  | 'enemyGrounder' | 'enemyCounterfeiter'         // act 2 enemy portraits (batch 8), 24x24
  | 'ground' | 'fake'                              // their reel symbols, 16x16
  | 'groundOverlay' | 'fakeOverlay'                // their cell overlays, 16x16 (mostly transparent)
  | 'icoEarth' | 'icoLaunder'                      // their ability icons, 8x8
  | 'mapBadgeGround' | 'mapBadgeFake'              // their map badges, 8x8
  | 'setRibbon';                                   // 'SET!' completes-set ribbon, 44x9 (non-square)

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
