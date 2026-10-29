import { stamp, rows } from './helpers.mjs';
// THE LOAN SHARK, 32x32 bust. Literal pixels; outline() adds the outer K.
// Right arm raised: shoulder cap -> upper arm hangs behind -> forearm rises in front -> cuff, gold watch, fist -> IOU marker.
export function shark32() {
  const base = [
    '................................',
    '..........kkkkkk................',
    '........kkllllkkkk..............',
    '.......kllkkkkllkkk.............',
    '......kkkkkkkkkkkkkk............',
    '......kkkFFFkkFFFkkk............',
    '......kFkFFFFFFFFkFk............',
    '......kFFkkFFFFkkFfk............',
    '.....FkFKWWkFFkKWWfkf...........',
    '.....fkFFFFFFfFFFFfff...........',
    '......FFFFFFFfFFFFff............',
    '......FKFFFfffFFFFKf............',
    '......FfKWWWWWYWWKff............',
    '......FFfKWIIIgWKFff............',
    '......FFFfKWWWWKFFff............',
    '.......FFFfKKKKFFff.............',
    '........FFFFFFFfff..............',
    '.........FFFFffff...............',
    '..........Ffffff................',
    '........JJGFFFfGVVNUUUUU....UU..',
    '....UUNJJvgYFfGgvVVNNNNN....NUU.',
    '..UUNNJVUVVgYGgvUNVvNNNNNNNNNNU.',
    '.UNNNNvPNUVVggVvUNPvNNNNNNNNNNNU',
    'UNNNNNNNPNUVVVvUNPNNNNNNNNNNNNNN',
    'UNNNNNNNNPNUVvUNPNNNNNNNNNNNNNNN',
    'UNNNNNNNNNPNUvUPNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNPNUPNNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNNPUKNNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNNNUKNNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNNNUKkNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNNNUKNNNNNNNNNNNNNNNNN',
    'UNNNNNNNNNNNNUKNNNNNNNNNNNNNNNNN',
  ];
  const g = base.map((r) => r.split(''));
  // pinstripes on the jacket body (not the raised sleeve, stamped after)
  for (let y = 23; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'N' && x % 4 === 1 && !'PU'.includes(g[y][x - 1] ?? '') && !'PU'.includes(g[y][x + 1] ?? '')) g[y][x] = 'p';
  // IOU marker (front) and a second slip fanned behind; fist, gold watch, purple cuff
  stamp(g, 20, 3, [
    '  TTTTTKII  ',
    '  TGGGGKIII ',
    '  TTTTTKggII',
    '  TttttKIIgg',
    '  TTTTTKIIII',
    '  TtttTKtttI',
    '  TTTTTKIII ',
    '  TFFTTKtII ',
    '  FFfYGKII  ',
    ' FFFFFFFK   ',
    ' FfFfFfYf   ',
    '  ffffff    ',
    '   GYGg     ',
    '   JJJVv    ',
  ]);
  // forearm sleeve: lit edge, cloth, shadow seam; drifts right toward the elbow below the frame
  const arm = [[17, 23], [18, 23], [19, 23], [20, 23], [21, 24], [22, 24], [23, 24], [24, 25], [25, 25], [26, 25], [27, 26], [28, 26], [29, 26], [30, 27], [31, 27]];
  for (const [y, x] of arm) stamp(g, x, y, ['UNNNK']);
  return rows(g);
}
