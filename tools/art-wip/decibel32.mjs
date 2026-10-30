import { canvas, px, span, paint, fill, out } from './decibel_r4.mjs';
// DJ DECIBEL, hero of the JUKEBOX, 32x32 bust facing right. outline() adds the outer K.
export function decibel32() {
  const g = canvas(32);
  // --- teal satin bomber, symmetric shoulders
  const body = [[10, 21], [7, 24], [5, 26], [3, 28], [2, 29], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]];
  fill(g, 20, body, (x, y, has) => (!has(x, y - 1) && x < 16 || !has(x - 1, y) ? 'i' : x >= 26 || (!has(x, y - 1) && x >= 16) ? 'n' : 'j'));
  // satin sheen on the near shoulder
  [[7, 21], [6, 22], [5, 23], [8, 21]].forEach(([x, y]) => px(g, x, y, 'i'));
  for (let y = 23; y < 32; y++) px(g, 5, y, 'n'); // sleeve seam, mirroring the shadow edge on the far side
  // decoration: orange racing stripe down each sleeve, an orange record badge on the chest
  for (let y = 25; y < 32; y++) { px(g, 2, y, 'O'); px(g, 29, y, 'o'); }
  px(g, 3, 23, 'a'); px(g, 2, 24, 'a'); px(g, 28, 23, 'o'); px(g, 29, 24, 'o');
  paint(g, 19, 23, [' aOO ', 'aOOOo', 'OOKOo', 'OOOoo', ' ooo ']);
  // white tee in the open front, zip edges
  // white tee in a V above the half-zipped front, zip seam down the middle
  [[13, 18], [14, 17], [15, 16]].forEach(([a, b], i) => { span(g, 20 + i, a, b, 'T'); px(g, b, 20 + i, 't'); px(g, a - 1, 20 + i, 'n'); px(g, b + 1, 20 + i, 'n'); });
  for (let y = 23; y < 32; y++) px(g, 15, y, 'n');
  px(g, 16, 23, 'L');
  // orange ribbed collar around the neck
  paint(g, 11, 19, ['aO       Oo', 'aOO     OOo']);
  // neck
  fill(g, 17, [[13, 19], [13, 19], [13, 19]], (x, y) => (y <= 18 || x >= 17 ? 'b' : 'B'));
  // --- face (three-quarter, turned right)
  fill(g, 8, [[12, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 23], [11, 22], [11, 22], [12, 22], [14, 21]],
    (x, y, has) => (!has(x + 1, y) || !has(x, y + 1) ? 'b' : (x === 11 || (x === 12 && y < 10) || (y === 8 && x <= 14)) ? 'w' : 'B'));
  // shades: frame over two tinted lenses, the eyes behind them looking right
  paint(g, 13, 10, [
    'kkkkk kkk',
    ' WCcckCcc',
    ' cCcc cCc',
  ]);
  px(g, 11, 10, 'k'); px(g, 12, 10, 'k');
  // nose (tip past the profile) + easy grin, right corner up
  paint(g, 22, 12, ['B', 'Bb', 'b']);
  span(g, 17, 14, 19, 'B'); px(g, 12, 16, 'w'); px(g, 13, 16, 'B');
  paint(g, 16, 14, ['     K', 'KTWWK', '  b']);
  // --- flat-top: black mass, sheen on the flat crown and the near side, faded sides into the sideburn
  fill(g, 1, [[9, 21], [8, 22], [8, 22], [8, 22], [8, 22], [8, 22], [8, 22], [9, 11], [10, 11]],
    (x, y, has) => (!has(x, y - 1) ? (x < 16 ? 'l' : 'k') : !has(x - 1, y) ? 'k' : 'P'));
  [[9, 2], [10, 2], [11, 2], [12, 2], [13, 2], [9, 3], [9, 4], [15, 4], [16, 4], [17, 4], [18, 5], [19, 5]].forEach(([x, y]) => px(g, x, y, 'k'));
  px(g, 22, 7, 'P'); px(g, 12, 8, 'P');
  // headphones: chrome band pressed into the crown, down the near side into the cup
  paint(g, 7, 2, [' SLLLLLLLLLLSSD', ' LS', 'LS', 'LS', 'LS', 'LS', 'LS', 'SD']);
  paint(g, 5, 10, [
    ' iiij ',
    'iaOOjn',
    'iOnnOn',
    'jOnnon',
    'jjoojn',
    ' jjnn ',
  ]);
  // cheek lifted by the grin
  px(g, 15, 13, 'w');
  // a little eighth note drifting off the cup
  paint(g, 2, 2, [' Oo', ' O o', ' O', 'aO', 'Oo']);
  // lower the whole figure in the frame
  const DY = 2;
  const shifted = [...Array.from({ length: DY }, () => Array(32).fill('.')), ...g.slice(0, 32 - DY)];
  return out(shifted);
}
