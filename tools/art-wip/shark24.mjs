import { stamp, rows } from './helpers.mjs';
// THE LOAN SHARK, 24x24 bust. Literal pixels; outline() adds the outer K.
// Right arm raised: shoulder -> forearm in front -> cuff, gold watch, fist -> IOU marker.
export function shark24() {
  const base = [
    '........................',
    '.....kkkkkkk............',
    '....kllllkkkk...........',
    '...kllkkkkllkk..........',
    '...kkkkkkkkkkk..........',
    '...kkFFFkFFFkk..........',
    '...kFFFFFFFFfk..........',
    '...FkkkFFFkkkf..........',
    '..FFKWWkFkKWWff.........',
    '..fFFFFFFfFFfff.........',
    '...FKFFfffFFKf..........',
    '...FfKWWWYWKff..........',
    '...FFfKIIgKfff..........',
    '....FFfKKKfff...........',
    '.....FFFFfff............',
    '......FffffNUUUUU....UU.',
    '..UUJJYFFfGVvNNNNN....UU',
    '.UNNJvUYGgUvNNNNNNNNNNNU',
    'UNNNNNPUVVUPNNNNNNNNNNNN',
    'UNNNNNNPUvPNNNNNNNNNNNNN',
    'UNNNNNNNPUKNNNNNNNNNNNNN',
    'UNNNNNNNNUKNNNNNNNNNNNNN',
    'UNNNNNNNNUKNNNNNNNNNNNNN',
    'UNNNNNNNNUKNNNNNNNNNNNNN',
  ];
  const g = base.map((r) => r.split(''));
  for (let y = 18; y < 24; y++) for (let x = 0; x < 24; x++) if (g[y][x] === 'N' && x % 3 === 1 && !'PU'.includes(g[y][x - 1] ?? '') && !'PU'.includes(g[y][x + 1] ?? '')) g[y][x] = 'p';
  // IOU marker and a second slip behind; fist with a pinky ring, gold watch, purple cuff
  stamp(g, 16, 1, [
    ' TTTTKI',
    ' TGGGKI',
    ' TTTTKg',
    ' TtttKI',
    ' TTTTKt',
    ' TttTKI',
    ' FFTTK ',
    'FFFFFFK',
    'FfFfFYf',
    ' fffff ',
    ' GYGg  ',
    ' JJVv  ',
  ]);
  const arm = [[13, 17], [14, 17], [15, 17], [16, 18], [17, 18], [18, 18], [19, 19], [20, 19], [21, 19], [22, 20], [23, 20]];
  for (const [y, x] of arm) stamp(g, x, y, ['UNNK']);
  return rows(g);
}
