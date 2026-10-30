import { stamp, rows } from './helpers.mjs';
// THE PIT BOSS, 32x32 bust (round 4). Literal pixels; outline() adds the outer K.
// Grey crew cut, hard stare under knitted brows, flat stern mouth, square jaw; charcoal suit, white shirt, red tie.
// Right forearm rises from the bottom edge in front of the chest: cuff, fist at chin height, gavel head at cheek height.
export function pitboss32() {
  const g = Array.from({ length: 32 }, () => Array(32).fill('.'));
  // charcoal suit silhouette (symmetric shoulders: x0 and x31 both reached on row 23)
  const sil = { 19: [7, 18], 20: [4, 27], 21: [2, 29], 22: [1, 30] };
  for (let y = 19; y < 32; y++) { const [a, b] = sil[y] ?? [0, 31]; for (let x = a; x <= b; x++) g[y][x] = 'k'; }
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
    ' FbbbbFFFFbbbbf ',
    'FFFFFbbfFbbFFfff',
    'FFWKWFFFFFFWKWff',
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
  for (let y = 22; y < 32; y++) { g[y][21] = 'K'; g[y][22] = 'l'; for (let x = 23; x <= 26; x++) g[y][x] = 'k'; g[y][27] = 'P'; g[y][28] = 'K'; }
  // gavel head, handle, fist, cuff
  stamp(g, 21, 9, [
    'wYwwwwYw',
    'BGBBBBGb',
    'BGBBBBGb',
    'bgbbbbgb',
    '   wB   ',
    '   wB   ',
    '   wB   ',
    ' FFwBFf ',
    ' FFFFFf ',
    ' ffffFf ',
    ' FFfFFf ',
    ' ffffff ',
    ' TTTTTt ',
  ]);
  return rows(g);
}
