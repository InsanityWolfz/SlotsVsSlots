import { canvas, px, span, paint, fill, out } from './lb_tools.mjs';
// THE LEG BREAKER, 32x32 bust. outline() adds the outer K.
export function legbreaker32() {
  const g = canvas(32);
  // --- torso: big traps under the shirt, shirt sleeves at the edges
  fill(g, 19, [[11, 29], [7, 30], [3, 31], [1, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (!has(x - 1, y) || !has(x, y - 1) ? 'I' : !has(x + 1, y) ? 'h' : 'H'));
  // charcoal vest over the chest, V opening narrowing to the first button
  for (let y = 22; y < 32; y++) {
    const x0 = Math.max(5, 10 - (y - 22)), x1 = y < 24 ? 27 : 26, h = Math.max(-1, 2 - Math.floor((y - 22) / 2));
    for (let x = x0; x <= x1; x++) if (h < 0 || x < 21 - h || x > 21 + h) px(g, x, y, x === x0 || x === 21 - h - 1 ? 'l' : 'k');
    px(g, x1 + 1, y, 'h');
  }
  [28, 31].forEach((y) => px(g, 21, y, 'h'));
  // --- thick neck: as wide as the jaw, shadow under the chin, undershirt collar
  fill(g, 15, [[15, 26], [15, 26], [15, 26], [15, 26], [15, 26], [15, 26], [15, 26]], (x, y, has) => (y === 19 ? (x === 15 ? 'F' : 'f') : !has(x + 1, y) || !has(x + 2, y) ? 'f' : 'F'));
  span(g, 22, 18, 24, 'T');
  // --- face (x13..28): eyes in the brim's shadow, broken nose kinks right, square jaw
  paint(g, 13, 7, [
    ' ffffffffffffff ',
    ' fkkkffffffkkkf ',
    'ffWWKkkffkkKWWff',
    'FFFfffFFfFfffFff',
    'FFFFFFFFfFFFFFff',
    'FFFFFFFFFfFFFFff',
    'FFFFFFfFFFfFFfff',
    'FFFFFFFfffFFFfff',
    'fFFFFFFFFFFFFfff',
    'fFFFFFhhhhhFFfff',
    ' ffFFhFfffFFfff ',
    '  fffffFFfffff  ',
  ]);
  paint(g, 12, 9, ['F', 'F', 'f']);
 paint(g, 29, 9, ['f', 'F', 'f']);
  // --- flat cap (tweed): wide low crown, brim snapped down over the brow
  paint(g, 12, 1, [
    '   HHHHHHhhhhhhk    ',
    ' HHHhhhhhhhhhhhhhk  ',
    'HHhhhhhhhhhhhhhhhhk ',
    'Hhhhhhhhhhhhhhhhhkk',
    'kkkhhhhhhhkhhhhhkkk',
    '  kkkkkkkkkkkkkkkkk',
  ]);
  // --- the bat: fat tapered barrel leans back over the shoulder, taped handle into the fist
  paint(g, 1, 1, [
    ' wwB',
    'wwwwB',
    'wwwwB',
    'wwwwB',
    ' wwwB',
    ' wwwB',
    ' wwwB',
    '  wwB',
    '  wwB',
    '  wwB',
    '   wB',
    '   bb',
    '   Bb',
    '   bb',
    '   Bb',
  ]);
  // --- upper arm (sleeve) out of the shoulder, forearm rising in front, rolled cuff at the elbow
  fill(g, 20, [[0, 5], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6], [0, 6]], (x, y, has) => (!has(x, y - 1) ? 'I' : x === 0 ? 'I' : 'H'));
  fill(g, 23, [[3, 10], [2, 11], [2, 11], [1, 11]], (x, y, has) => (!has(x - 1, y) ? 'F' : !has(x + 1, y) ? 'f' : (x === 8 && y > 23) || (x === 9 && y === 23) ? 'f' : 'F'));
  paint(g, 1, 27, ['IIIIIIIIIIH', 'HHhHHHhHHHh', 'IIIIIIIIIIh', 'HHHHHHHHHHh', 'HHHHHHHHHHh']);
  // fist round the handle: flat-topped, fingers stacked, knob poking out under the little finger
  paint(g, 2, 16, [
    ' FFFFFFFf ',
    'FFFFFFFFFf',
    'FFfffffFff',
    'FFFFFFFFFf',
    'FFffffffFf',
    'FFFFFFFFFf',
    ' fffffffff',
    '   bBBb   ',
  ]);
  // plaster across the broken bridge
  px(g, 21, 11, 'T'); px(g, 22, 11, 'I');
  return out(g);
}
