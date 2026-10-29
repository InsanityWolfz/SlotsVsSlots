import { canvas, px, span, paint, fill, out } from './lb_tools.mjs';
// THE PICKPOCKET, 32x32 bust. outline() adds the outer K.
export function pickpocket32() {
  const g = canvas(32);
  // --- narrow shoulders (a kid in a hand-me-down jacket)
  fill(g, 20, [[7, 18], [5, 21], [3, 22], [2, 23], [2, 24], [2, 24], [1, 25], [1, 25], [1, 26], [1, 26], [1, 26], [1, 26]],
    (x, y, has) => (!has(x - 1, y) || !has(x, y - 1) ? 'Z' : !has(x + 1, y) ? 'q' : 'z'));
  // grubby shirt in the V, turned-up collar
  for (let y = 20; y < 27; y++) { const h = Math.max(0, 2 - Math.floor((y - 20) / 2)); span(g, y, 12 - h, 12 + h, y === 20 ? 'H' : 'I'); }
  paint(g, 7, 19, ['XXX', ' zXX', '  zX', '   z']); paint(g, 15, 19, ['XXz', 'Xzz', 'zz', 'z']);
  // lapel edges and buttons
  for (let y = 22; y < 32; y++) { px(g, 9 - Math.min(2, Math.floor((y - 22) / 3)), y, 'z'); }
  px(g, 12, 27, 'z'); px(g, 12, 30, 'z');
  // patch on the shoulder
  paint(g, 3, 23, ['hhh', 'hHh', 'hhh']);
  // thin neck
  fill(g, 17, [[10, 14], [10, 14], [10, 14]], (x, y) => (y === 17 || x >= 13 ? 'f' : 'F'));
  // --- face (x7..18): round cheeks, big eyes glancing aside, gap-toothed smirk
  paint(g, 7, 8, [
    'kfffffffffkk',
    'FFFFFFFFkkkf',
    'FkkkFFFFFFFf',
    'FfffFFFkkkFf',
    'FKWWFFFKWWff',
    'FfFfFfFFfFff',
    'FFFFFFFFFFKf',
    'FFFKWkWWWKff',
    'FFFFKWWWKff ',
    '    FKKKff  ',
    '   fffff    ',
  ]);
  paint(g, 5, 11, ['FF', 'Ff', ' f']); paint(g, 19, 11, ['Ff', 'ff', 'f']);
  // --- newsboy cap, a size too big: puffy crown slumped to the right, button on top, short brim
  paint(g, 2, 1, [
    '     IIIIhHHHH      ',
    '   IIIIhHHHhHHHHh   ',
    '  IIHHhHHHHHhHHHHHh ',
    ' IHHHhHHHHHHHhHHHHhh',
    ' IHHhHHHHHHHHHhHHHhh',
    '  hhhhhhhhhhhhhhhhh ',
    '     hHHHHHHHhh     ',
  ]);
  px(g, 11, 1, 'h');
  paint(g, 5, 7, ['kk', ' kk', ' k']); paint(g, 18, 7, ['kk', ' k']);
  // --- arm: shoulder -> upper arm down to an elbow in frame -> forearm back up to the hand
  const upper = [[20, 23], [20, 24], [21, 25], [21, 26], [22, 27], [23, 28], [24, 29], [25, 30], [26, 30], [27, 30]];
  fill(g, 21, upper, (x, y, has) => (!has(x, y - 1) ? 'Z' : !has(x + 1, y) || !has(x, y + 1) ? 'q' : 'z'));
  const fore = []; for (let y = 13; y <= 27; y++) { const x0 = 23 + Math.floor((y - 13) / 5); fore.push([x0, x0 + 5]); }
  fill(g, 13, fore, (x, y, has) => (!has(x - 1, y) ? 'X' : !has(x + 1, y) ? 'z' : 'Z'));
  fill(g, 29, [[26, 29]], () => 'z');
  [[19, 21], [19, 22], [20, 23], [20, 24], [21, 25], [21, 26], [22, 27]].forEach(([x, y]) => px(g, x, y, 'q')); // armpit seam: upper arm against the chest
  span(g, 13, 23, 28, 'z'); px(g, 24, 14, 'z'); px(g, 27, 14, 'z');
  // hand: a loose fist, thumb and index pinching the chip from below
  paint(g, 22, 8, [
    '  FFFf  ',
    ' FFFFFFf',
    ' FfFfFff',
    ' FfFfFff',
    '  fffff ',
  ]);
  // red casino chip: white rim inserts and inlay ring
  paint(g, 23, 1, [
    '  RTR  ',
    ' RRRRr ',
    'RRTTTrr',
    'TRTRTrT',
    'RrTTTrr',
    ' rrrrr ',
    '  rTr  ',
  ]);
  return out(g);
}
