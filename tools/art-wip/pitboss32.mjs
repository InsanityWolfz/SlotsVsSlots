import { stamp, rows } from './helpers.mjs';
// THE PIT BOSS, 32x32 bust (round 4). Literal pixels; outline() adds the outer K.
// Grey crew cut, hard stare under knitted brows, flat stern mouth, square jaw; charcoal suit, white shirt, red tie.
// Right forearm rises from the bottom edge in front of the chest: cuff, fist at chin height, gavel head at cheek height.
export function pitboss32() {
  const g = Array.from({ length: 32 }, () => Array(32).fill('.'));
  // charcoal suit silhouette: the left shoulder runs off the left edge; on the right the raised forearm (x25-30,
  // outline at x31) is the outer edge, so the shoulder stops behind it at x24 (as on the Card Sharp)
  const sil = { 19: [7, 18], 20: [4, 21], 21: [2, 23], 22: [1, 24] };
  for (let y = 19; y < 32; y++) { const [a, b] = sil[y] ?? [0, 24]; for (let x = a; x <= b; x++) g[y][x] = 'k'; }
  for (let y = 19; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'k') {
    if (g[y - 1][x] === '.' || x === 0) g[y][x] = 'l';
  }
  // left sleeve seam: the arm hangs at his side under the shoulder
  for (let y = 24; y < 32; y++) g[y][5] = 'P';
  g[23][4] = 'P';
  // shirt, collar, red tie, lapels, centre seam
  stamp(g, 7, 19, [
    'lkTTTRrTTtkP',
    ' PlTTRrTtPk ',
    '  PlTRrtPk  ',
    '  PlTRrtPk  ',
    '   PlRrPk   ',
    '   PlRrPk   ',
    '    PRrP    ',
    '    PlkP    ',
    '     PP     ',
    '     kP     ',
    '     kP     ',
    '     kP     ',
    '     kP     ',
  ]);
  // head: hard stare under knitted brows, plain skin between nose and mouth, short flat mouth over a lower-lip shadow
  const face = [
    ' FFbbbFFFFbbbff ',
    'FFFFFbbfFbbFFfff',
    'FFFWKWFFFFWKWFff',
    'fFFfffFFfFfffFff',
    ' FFFFFFFfFFFFff ',
    ' FFFFFFFfFFFFff ',
    ' FFFFFffffFFFff ',
    ' FFFFFFFFFFFFff ',
    ' FFFFfKKKKfFFff ',
    ' FFFFFFffFFFFff ',
  ];
  stamp(g, 5, 1, [
    '   IIIIIIIIII   ',
    '  IIHHHHHHHHHh  ',
    ' IHHHHHHHHHHHHh ',
    ' HFFFFFFFFFFFFh ',
    ...face,
    '  fFFFFFFFFfff  ',
    '   fFFFFFFfff   ',
    '    ffffffff    ',
    '     fFFfff     ',
  ]);
  // gold name badge on the left breast
  stamp(g, 6, 23, ['GGGG', 'GTTg', 'Gggg']);
  // forearm (sleeve) rising from the bottom edge, dark seams either side
  for (let y = 22; y < 32; y++) { g[y][24] = 'K'; g[y][25] = 'l'; for (let x = 26; x <= 29; x++) g[y][x] = 'k'; g[y][30] = 'P'; }
  // gavel head, handle, fist, cuff
  stamp(g, 24, 10, [
    'wYwwwYw',
    'BGBBBGb',
    'bgbbbgb',
  ]);
  stamp(g, 25, 13, [
    '  wB  ',
    '  wB  ',
    '  wB  ',
    'FFwBFf',
    'FFFFFf',
    'ffffFf',
    'FFfFFf',
    'ffffff',
    'TTTTTt',
  ]);
  return rows(g);
}
