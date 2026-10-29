import { grid, stamp, rows } from './helpers.mjs';
import { cellsFromSpans, capsule, draw } from './bf/h2.mjs';
export function barfly24() {
  const g = grid(24, 24);
  // torso: rumpled brown jacket
  const torso = cellsFromSpans(16, [[12, 20], [10, 22], [9, 23], [8, 23], [7, 23], [6, 23], [6, 23], [5, 23]]);
  draw(g, torso, (x, y, has) => (!has(x, y - 1) ? (x < 17 ? 'w' : 'B') : x > 22 ? 'b' : 'B'));
  // upper arm: out from the shoulder, down to the elbow
  const upper = capsule(11.5, 18, 2.6, 20.6, 2);
  draw(g, upper, (x, y, has) => (!has(x, y - 1) ? 'w' : !has(x, y + 1) ? 'b' : 'B'));
  // a fold on the sleeve, a wet stain on the jacket
  stamp(g, 7, 20, [' wb', 'wb ']);
  stamp(g, 20, 19, [' g', 'gg']);
  // chest: open collar, loosened tie, lapels
  stamp(g, 12, 16, [
    'wTffffTb',
    ' wTRRIb ',
    ' wTRrIb ',
    '  wTRRb ',
    '  wTRrb ',
    '  wTRRb ',
    '   wRrb ',
    '   wRRb ',
  ]);
  stamp(g, 10, 1, [
    '   BB   b    ',
    ' bBBb bBbb b ',
    'bBBbBbbBbbbbb',
    'bbbbbbbbbbbbb',
    'bbFbbFFFbbFbb',
    'bFFFFFFFbbbfb',
    'bFbbbFFFFFFfb',
    'FFfffFFFfffff',
    'fFKWWFFFKWWff',
    'fFrrfFFfrrff ',
    ' FMFFFRfFFMf ',
    ' FFFFRRrFKff ',
    ' FFKTTKTTKff ',
    '  FFKrrrKff  ',
    '   FfFfFff   ',
    '    ffff     ',
  ]);
  // forearm: up from the elbow to the wrist
  const fore = capsule(2.4, 20.6, 3.3, 11.5, 2);
  draw(g, fore, (x, y, has) => (!has(x - 1, y) ? 'w' : !has(x + 1, y) || !has(x, y + 1) ? 'b' : 'B'));
  // tumbler in his fist, sloshing over the rim
  stamp(g, 0, 0, [
    '         ',
    '   Y    G',
    '     YG  ',
    '  CCYGGGG',
    '  CWGGOAG',
    ' FCGGGOA ',
    ' FCooooA ',
    ' FFFFFFf ',
    ' fFFFKK  ',
    '  fFFf   ',
    '  TTI    ',
  ]);
  return rows(g);
}
