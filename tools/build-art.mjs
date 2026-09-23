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

// ---------------------------------------------------------------- emit + self-check
const DIMS = {
  sword: 16, shield: 16, bolt: 16, slime: 16, goo: 16,
  heart: 8, shieldIcon: 8, boltIcon: 8, pipFull: 8, pipEmpty: 8,
  swordProjectile: 12, slimeBlob: 8, spark: 5, playerPortrait: 24, enemyPortrait: 24,
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
  | 'playerPortrait' | 'enemyPortrait';            // 24x24

export const SPRITES: Record<SpriteId, string[]> = {
`;
for (const id of Object.keys(DIMS)) {
  out += `  ${id}: [\n${S[id].map((r) => `    ${q(r)},`).join('\n')}\n  ],\n`;
}
out += '};\n';
writeFileSync(join(ROOT, 'src/render/spriteData.ts'), out);
console.log('spriteData.ts written, self-check OK');
if (process.argv.includes('--print')) for (const id of Object.keys(DIMS)) console.log(`\n${id}\n${S[id].join('\n')}`);
