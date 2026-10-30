import { px, paint, fill } from './cassidy_r4.mjs';
// CASH CASSIDY (hero of the BANKROLL Slot Machine), 32x32 bust, three-quarter view facing right.
// outline() adds the outer K. Drawn on a 34-row board, then shown DROP rows lower so he sits low in the frame.
const DROP = 2;
export function cassidy32() {
  const g = Array.from({ length: 34 }, () => Array(32).fill('.'));
  // --- charcoal jacket, body turned right: the near (left) shoulder is broader and meets the frame sooner
  fill(g, 19, [[8, 22], [5, 24], [3, 26], [2, 27], [1, 28], [0, 29], [0, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x - 1, y) || (!has(x, y - 1) && x < 18) ? 'l' : !has(x + 1, y) ? 'P' : 'k'));
  // open front turned right: a wide near lapel, a narrow far lapel, money-green vest, gold buttons
  for (let y = 20; y < 34; y++) {
    const xl = y >= 27 ? 17 : 13 + Math.floor(((y - 20) * 4) / 7);
    const xr = y >= 27 ? 21 : 22 - Math.floor(((y - 20) * 1) / 7);
    for (let x = xl; x <= xr; x++) px(g, x, y, x === xl ? 'e' : x === xr ? 'q' : 'Q');
    if (y >= 21) { px(g, xl - 1, y, 'l'); px(g, xl - 4, y, y < 27 ? 'P' : 'k'); px(g, xr + 1, y, 'l'); px(g, xr + 2, y, y < 27 ? 'P' : 'k'); }
  }
  // neck, shirt collar and a red bow tie, centred on the turned chest
  paint(g, 13, 18, ['ffffff', ' fFFFf']);
  paint(g, 14, 20, ['TTFFTTT', ' TRrRRT', '  TTTT', '   TT']);
  [23, 26, 29, 32].forEach((y) => px(g, 19, y, 'G'));
  // sleeve seams: arms hang at his sides, out of frame (the far one foreshortened)
  paint(g, 4, 23, ['P', 'P', ' P', ' P', ' P', ' P', ' P', ' P', ' P', ' P', ' P']);
  paint(g, 28, 24, ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']);
  // --- head, turned right. Short dark brown hair under the hat, ear on the near side,
  // the near eye and cheek wide, the far ones narrow, the nose breaking the right profile, square jaw
  paint(g, 7, 8, [
    'bBBbffffffffffff',
    'bBbbbFFFFFFFFFFf',
    'bBbbbFbbbbFFbbFf',
    'bbFfbYYGGGGGGGgf',
    'bbFfFkWlkkFkWkFFF',
    'bbFfFfkkkfFFkkFFFf',
    ' bbfFFFFFFFFFFfff',
    ' bfFFFFFFFFFFFFf',
    '  ffFFFFFFKTTYTK',
    '   ffFFFFFfKKKf',
    '     ffFFFFFff',
  ]);
  // cigar clenched in the far corner of the grin
  paint(g, 23, 16, ['bBBBO']);
  // --- black gambler hat turned with the head: crown crease, gold band, the ace at the front (right),
  // brim reaching further forward on the right than behind on the left
  paint(g, 3, 1, [
    '        llllllkkkkP        ',
    '      lllkkkkPkkkkkkP      ',
    '      llkkkkkPkkTTTkP      ',
    '      llkkkkkPkkTRTkP      ',
    'l     GYYGGGGGGGTTtGg     k',
    'lllllllllllllllllllllllllkk',
    ' PkkkkkkkkkkkkkkkkkkkkkkkP ',
  ]);
  const rows = g.map((r) => r.join(''));
  return [...Array(DROP).fill('.'.repeat(32)), ...rows.slice(0, 32 - DROP)];
}
