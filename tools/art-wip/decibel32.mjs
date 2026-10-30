import { canvas, px, span, paint, fill, out } from './decibel_r4.mjs';
// DJ DECIBEL, hero of the JUKEBOX, 32x32 bust facing right. outline() adds the outer K.
export function decibel32() {
  const g = canvas(32);
  // --- teal satin bomber, symmetric shoulders
  const body = [[10, 21], [6, 25], [3, 28], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]];
  fill(g, 20, body, (x, y, has) => (!has(x, y - 1) && x < 16 || !has(x - 1, y) ? 'i' : x >= 27 || (!has(x, y - 1) && x >= 16) ? 'n' : 'j'));
  // satin sheen on the near shoulder, raglan seam from the collar to the armpit
  [[7, 21], [6, 22], [5, 23], [8, 21]].forEach(([x, y]) => px(g, x, y, 'i'));
  [[10, 22], [9, 23], [8, 24], [7, 25], [7, 26], [7, 27], [7, 28], [7, 29], [7, 30], [7, 31]].forEach(([x, y]) => px(g, x, y, 'n'));
  // white tee in the open front, zip edges
  for (let y = 20; y < 32; y++) { span(g, y, 14, 16, 'T'); px(g, 17, y, 't'); }
  for (let y = 20; y < 32; y++) { px(g, 13, y, 'n'); px(g, 18, y, 'n'); }
  // orange ribbed collar around the neck
  paint(g, 11, 19, ['aO      Oo', 'aOO    OOo']);
  // neck
  fill(g, 17, [[13, 18], [13, 18], [13, 18]], (x, y) => (y <= 18 || x >= 17 ? 'b' : 'B'));
  // --- face (three-quarter, turned right)
  fill(g, 8, [[12, 21], [11, 21], [11, 21], [11, 21], [11, 21], [11, 22], [11, 21], [11, 21], [12, 21], [14, 20]],
    (x, y, has) => (!has(x + 1, y) || !has(x, y + 1) ? 'b' : (x <= 12 || (y === 8 && x <= 14)) ? 'w' : 'B'));
  // shades: frame over two tinted lenses, the eyes behind them looking right
  paint(g, 12, 10, [
    'kkkkk kkk',
    ' cWWKkcWK',
    ' Cccc ccc',
  ]);
  px(g, 11, 10, 'k');
  // nose (tip past the profile) + easy grin, right corner up
  paint(g, 21, 12, ['B', 'Bb', 'b']);
  span(g, 17, 14, 18, 'B'); px(g, 12, 16, 'w'); px(g, 13, 16, 'B');
  paint(g, 15, 14, ['     K', 'KTWWK', '  b']);
  // --- flat-top: black mass, sheen on the flat crown and the near side, faded sides into the sideburn
  fill(g, 1, [[9, 20], [8, 21], [8, 21], [8, 21], [8, 21], [8, 21], [8, 21], [9, 11], [10, 11]],
    (x, y, has) => (!has(x, y - 1) ? (x < 16 ? 'l' : 'k') : !has(x - 1, y) ? 'k' : 'P'));
  [[9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [9, 3], [9, 4], [15, 4], [16, 4], [17, 4], [18, 5], [19, 5]].forEach(([x, y]) => px(g, x, y, 'k'));
  px(g, 21, 7, 'P'); px(g, 12, 8, 'P');
  // headphones: chrome band pressed into the crown, down the near side into the cup
  paint(g, 7, 2, [' SLLLLLLLLLSSD', ' LS', 'LS', 'LS', 'LS', 'LS', 'LS', 'SD']);
  paint(g, 5, 9, [
    '  iiij ',
    ' iijjjn',
    'iiaOOjn',
    'iaOnnOn',
    'iOnnnon',
    'jOnnnon',
    'jjooojn',
    ' jjjnn ',
  ]);
  // --- the record: black vinyl held low, groove rings catching the light, orange label, spindle hole
  paint(g, 12, 21, [
    '   PPPPP   ',
    ' PPkkPPPPP ',
    ' PkPPPPPPP ',
    'PkPPaOOPPPP',
    'PPPaOOOOPPP',
    'PPPOOKOOPPP',
    'PPPOOOOoPPP',
    'PPPPOooPPkP',
    ' PPPPPPPkP ',
    ' PPPPPkkPP ',
    '   PPPPP   ',
  ]);
  // --- far arm: teal sleeve rising straight from the bottom edge, orange cuff, hand gripping the record's rim
  fill(g, 28, [[22, 25], [22, 25], [22, 25], [22, 25]], (x) => (x === 22 ? 'i' : x === 25 ? 'n' : 'j'));
  span(g, 27, 22, 25, 'O'); px(g, 22, 27, 'a'); px(g, 25, 27, 'o');
  for (let y = 27; y <= 31; y++) { px(g, 21, y, 'K'); px(g, 26, y, 'K'); }
  paint(g, 22, 22, [
    ' wBb',
    'wBBBb',
    'bbBBb',
    'wBBBb',
    'bbbb',
  ]);
  // cheek lifted by the grin
  px(g, 14, 13, 'w');
  // a little eighth note drifting off the cup
  paint(g, 2, 2, [' Oo', ' O o', ' O', 'aO', 'Oo']);
  return out(g);
}
