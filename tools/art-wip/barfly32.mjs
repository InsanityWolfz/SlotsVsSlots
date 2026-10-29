import { grid, stamp, rows } from './helpers.mjs';
import { cellsFromSpans, capsule, draw } from './bf/h2.mjs';
export function barfly32() {
  const g = grid(32, 32);
  // torso: rumpled brown jacket
  const torso = cellsFromSpans(21, [[13, 25], [11, 27], [10, 28], [9, 29], [8, 30], [7, 30], [6, 31], [6, 31], [5, 31], [5, 31], [4, 31]]);
  draw(g, torso, (x, y, has) => (!has(x, y - 1) ? (x < 20 ? 'w' : 'B') : !has(x + 1, y) && y < 31 ? 'b' : x > 27 ? 'b' : 'B'));
  // upper arm: out from the shoulder, down to the elbow
  const upper = capsule(12, 23.5, 3, 27.5, 2.4);
  draw(g, upper, (x, y, has) => (!has(x, y - 1) ? 'w' : !has(x, y + 1) ? 'b' : 'B'));
  // chest: open collar, loosened tie, lapels
  stamp(g, 13, 21, [
    ' wTTFFFFffTTb ',
    '  wTIFRRfITb  ',
    '   wTTRrTIb   ',
    '   wTTRRTIb   ',
    '    wTTRrIb   ',
    '    wTTRRIb   ',
    '     wTTRrb   ',
    '     wTTRRb   ',
    '     wTTRrb   ',
    '      wTRRb   ',
    '      wTRrb   ',
  ]);
  stamp(g, 12, 1, [
    '    BB    b      ',
    '  bBBb  bBbb  b  ',
    ' bBBbBbbBBbbbbbb ',
    'bBBbBBbbBbbbbbbbb',
    'bBbbbbbbbbbbbbbbb',
    'bbbFbbbFFFbbFbbbb',
    'bFFFFbFFFFbbbFfb ',
    'bFbbbbFFFFFFFbfb ',
    'FFFfffFFFFfffFff ',
    'fFFKWWFFFFKWWFff ',
    'fFFrrfFFfFrrffff ',
    ' FMMFFFRRfFFMMf  ',
    ' FFFFFRRRrfFFff  ',
    ' FFFFFFffFFFKff  ',
    ' FFfFKTTTKTTKff  ',
    '  FFFFKrrrrKff   ',
    '  FfFFfKKKKfFf   ',
    '   FFfFFfFfff    ',
    '    FFFFFfff     ',
    '     ffffff      ',
  ]);
  // shirt collar standing up beside the neck, jacket collar behind it
  stamp(g, 15, 20, ['wT      Ib']);
  // forearm: up from the elbow to the wrist
  const fore = capsule(2.6, 27.5, 4.4, 14.8, 2.5);
  draw(g, fore, (x, y, has) => (!has(x - 1, y) ? 'w' : !has(x + 1, y) || !has(x, y + 1) ? 'b' : 'B'));
  // tumbler in his fist, sloshing over the rim
  stamp(g, 0, 1, [
    '       G   ',
    '         Y ',
    '      YG   ',
    '  CCCYGGG  ',
    '  CWYGGOAG ',
    '  CYGGGOA  ',
    ' FCGGGGOA g',
    ' FCoooooA  ',
    ' FFFFFFFf  ',
    ' FFFFFKK   ',
    ' FFFFFFFf  ',
    ' fFFFfKK   ',
    '  fffCAA   ',
    '  TTTI     ',
  ]);
  // sleeve wrinkles at the elbow, a wet stain on the lapel, a crease on the chest
  stamp(g, 6, 24, [' b', 'b ']);
  stamp(g, 9, 26, ['  wb', ' wb ', 'wb  ']);
  stamp(g, 12, 29, [' b', 'b ']);
  stamp(g, 25, 25, [' g', 'gg']);
  stamp(g, 27, 24, ['  b', ' b ', 'b  ']);
  return rows(g);
}
