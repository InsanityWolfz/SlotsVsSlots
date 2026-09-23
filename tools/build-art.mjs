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
  shape(g, 1, discSpans(6.5, 5.5, 5.2, 1, 10), (x, y, has) => {
    const d = Math.hypot((x - 6.5) , (y - 5.5));
    if (d > 3.6) return x + y <= 10 ? 'L' : x + y >= 14 ? 'D' : 'S';
    return x + y >= 14 ? 'U' : 'A';
  });
  [[5, 3], [4, 4], [3, 5], [7, 3], [6, 4]].forEach(([x, y]) => put(g, x, y, 'W'));
  [[9, 11, 'S'], [10, 11, 'D'], [10, 12, 'S'], [11, 12, 'D'], [11, 13, 'S'], [12, 13, 'D'], [12, 14, 'G'], [13, 14, 'g'], [13, 13, 'G']].forEach(([x, y, c]) => put(g, x, y, c));
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
};
const errors = [];
for (const [id, n] of Object.entries(DIMS)) {
  const rows = S[id];
  if (!rows) { errors.push(`${id}: missing`); continue; }
  if (rows.length !== n) errors.push(`${id}: ${rows.length} rows, want ${n}`);
  rows.forEach((r, i) => {
    if (r.length !== n) errors.push(`${id} row ${i}: len ${r.length}, want ${n}`);
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
  | 'mapBadgeRock' | 'mapBadgeLock' | 'mapBadgeFist' | 'mapBadgeCoin';

export const SPRITES: Record<SpriteId, string[]> = {
`;
for (const id of Object.keys(DIMS)) {
  out += `  ${id}: [\n${S[id].map((r) => `    ${q(r)},`).join('\n')}\n  ],\n`;
}
out += '};\n';
writeFileSync(join(ROOT, 'src/render/spriteData.ts'), out);
console.log('spriteData.ts written, self-check OK');
if (process.argv.includes('--print')) for (const id of Object.keys(DIMS)) console.log(`\n${id}\n${S[id].join('\n')}`);
