import { px, paint, fill } from './cassidy_r4.mjs';
// CASH CASSIDY (hero of the BANKROLL Slot Machine), 32x32 bust facing right. outline() adds the outer K.
// Drawn on a 34-row board, then shown DROP rows lower so the figure sits low in the frame.
const DROP = 2;
export function cassidy32() {
  const g = Array.from({ length: 34 }, () => Array(32).fill('.'));
  // --- charcoal jacket, symmetric shoulders running off both sides and the bottom
  fill(g, 18, [[14, 17], [9, 22], [6, 25], [4, 27], [3, 28], [2, 29], [1, 30], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (y === 18 ? 'f' : !has(x - 1, y) || (!has(x, y - 1) && x < 16) ? 'l' : !has(x + 1, y) ? 'P' : 'k'));
  // open front: lapels, a money-green vest with gold buttons, white shirt and a red bow tie
  for (let y = 19; y < 34; y++) {
    const xl = y >= 27 ? 15 : 12 + Math.floor(((y - 19) * 3) / 8);
    const xr = y >= 27 ? 19 : 21 - Math.floor(((y - 19) * 2) / 8);
    for (let x = xl; x <= xr; x++) px(g, x, y, x === xl ? 'e' : x === xr ? 'q' : 'Q');
    if (y >= 20) { px(g, xl - 1, y, 'l'); px(g, xl - 3, y, y < 27 ? 'P' : 'k'); px(g, xr + 1, y, 'l'); px(g, xr + 3, y, y < 27 ? 'P' : 'k'); }
  }
  paint(g, 13, 19, ['TTFFFTT', ' TRrRT', '  TTT', '   T']);
  [22, 25, 28, 31].forEach((y) => px(g, 17, y, 'G'));
  // sleeve seams: both arms hang at her sides, out of frame
  paint(g, 4, 22, ['P', 'P', 'P', ' P', ' P', ' P', ' P', ' P', ' P', ' P', ' P', ' P']);
  paint(g, 27, 22, [' P', ' P', ' P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']);
  // --- dark brown bob behind her ear, falling to her shoulder
  paint(g, 3, 8, [
    '    bBB',
    '   bBBb',
    '   bBbb',
    '  bBBbb',
    '  bBbbb',
    ' bBBbb',
    ' bBbbb',
    'bBBbb',
    'bBbbb',
    'bBBbbb',
    ' bBBbb',
    ' bbBBb',
    '  bbbb',
  ]);
  // --- face, three-quarter turned right; soft jaw, small rounded chin
  paint(g, 9, 8, [
    'bffffffffffff',
    'FFbbbFFFFbbFf',
    'FFFFFFFFFFFFf',
    'FFFFFFFFFFFFf',
    'FFFFFFFFFFFFFf',
    'FFFFFFFFFFFFFFf',
    'FFFFFFFFFFFfff',
    'FFFFFFFFFFFFf',
    ' fFFFFFFFFFf',
    '  ffFFFFFff',
    '    fffff',
  ]);
  // gold-rimmed sunglasses over the eyes: two tinted lenses with a glint, bridge on the nose
  paint(g, 9, 11, [
    'gYYGGgGYGGg',
    ' kWlkk kWkk',
    '  kkk   kk',
  ]);
  paint(g, 9, 8, ['bBBBb', 'bb']);
  // cat-eye tips: the rims sweep up at the outer corners
  px(g, 9, 10, 'Y'); px(g, 20, 10, 'G');
  // nose pointing right
  paint(g, 20, 14, ['ff']);
  // gold drop earring
  paint(g, 9, 14, ['G', 'Y']);
  // red lips: a sly, lopsided grin with a gold tooth, a slim cigar in the corner
  paint(g, 15, 15, [' rRRRr', 'rTTTYr', ' RRRr']);
  paint(g, 21, 16, ['bBBBO']);
  // --- black gambler hat: crown, gold band, an ace tucked in the band, wide flat brim curled at the tips
  paint(g, 2, 1, [
    '          llllllkk        ',
    '        lkkkkkkTTTkP      ',
    '        lkkkkkkTRTkP      ',
    '        lkkkkkkTTtkP      ',
    ' l      GYYGGGGGGGGg     k',
    ' lllllllllllllllllllllllkk',
    '  PkkkkkkkkkkkkkkkkkkkkkP ',
  ]);
  const rows = g.map((r) => r.join(''));
  return [...Array(DROP).fill('.'.repeat(32)), ...rows.slice(0, 32 - DROP)];
}
