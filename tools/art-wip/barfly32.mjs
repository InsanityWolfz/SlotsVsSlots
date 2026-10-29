import { grid, put, stamp, rows } from './helpers.mjs';
import { cellsFromSpans, draw } from './bf/h2.mjs';
export function barfly32() {
  const g = grid(32, 32);
  // torso: rumpled brown jacket
  const torso = cellsFromSpans(21, [[13, 25], [11, 27], [9, 28], [7, 29], [6, 30], [6, 30], [6, 31], [6, 31], [6, 31], [6, 31], [6, 31]]);
  draw(g, torso, (x, y, has) => (!has(x, y - 1) ? (x < 20 ? 'w' : 'B') : !has(x + 1, y) && y < 31 ? 'b' : x > 27 ? 'b' : 'B'));
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
  // left chest: shoulder top, chest, the lapel's shadow line, its lit roll, its face up to the shirt
  const edge = { 22: 16, 23: 17, 24: 17, 25: 18, 26: 18, 27: 19, 28: 19, 29: 19, 30: 20, 31: 20 };
  const out = { 22: 13, 23: 12, 24: 11, 25: 11, 26: 12, 27: 13, 28: 14, 29: 15, 30: 16, 31: 17 };
  for (let y = 22; y <= 31; y++) for (let x = 9; x < edge[y]; x++) {
    if (g[y][x] === '.') continue;
    const top = g[y - 1][x] === '.';
    put(g, x, y, x === out[y] ? 'b' : x === out[y] + 1 ? 'w' : x > out[y] ? 'B' : top ? 'w' : 'B');
  }
  // right lapel, on the shadow side: its edge line, its face, then the chest beyond
  const out2 = { 22: 25, 23: 26, 24: 27, 25: 27, 26: 26, 27: 25, 28: 25, 29: 24, 30: 24, 31: 24 };
  for (let y = 22; y <= 31; y++) for (let x = 24; x <= 31; x++) {
    if (g[y][x] === '.') continue;
    put(g, x, y, x === out2[y] ? 'b' : x < out2[y] ? 'B' : x > 28 || g[y][x + 1] === '.' ? 'b' : 'B');
  }
  // the raised sleeve: a full jacket sleeve rising out of the shoulder (elbow below the frame), dark seam against the chest
  stamp(g, 0, 15, [
    ' wbbbbbb  ',
    ' wBBBBBb  ',
    ' wBBBBBb  ',
    ' wBBBBBb  ',
    ' wBBBBBb  ',
    ' wBBBBBb  ',
    ' wBBBBwb  ',
    ' wBBBwbb  ',
    ' wBBwbBbK ',
    ' wBwbBBbK ',
    ' wwbBBBbK ',
    'wwbBBBBbK ',
    'wBBBBBBbK ',
    'wBBBBBBbK ',
    'wBBBBBwbK ',
    'wBBBwbBbK ',
    'wBBwbBBbK ',
  ]);
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
  stamp(g, 10, 27, [' g', 'gg', ' g']);
  return rows(g);
}
