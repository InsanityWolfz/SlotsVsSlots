import { canvas, px, span, paint, fill, out } from './lb_tools.mjs';
// THE LEG BREAKER, 32x32 bust. outline() adds the outer K.
export function legbreaker32() {
  const g = canvas(32);
  // --- torso: chin row 18, short thick neck shows on row 19, traps start on row 20 and slope out 1-2px a row
  const edge = [[12, 27], [10, 28], [8, 29], [6, 30], [4, 31], [2, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]]; // rows 20..31
  fill(g, 20, edge, (x, y, has) => (!has(x - 1, y) || !has(x, y - 1) ? 'I' : !has(x + 1, y) ? 'h' : 'H'));
  // charcoal vest: straps over the traps up to the neck, shirt showing at the outer shoulders, V opening to the first button
  for (let y = 20; y < 32; y++) {
    const [e0, e1] = edge[y - 20];
    const x0 = y === 20 ? e0 : Math.max(e0 + 2, 6), x1 = y === 20 ? e1 : Math.min(e1 - 2, 27);
    const h = y < 22 ? -1 : Math.max(-1, 2 - Math.floor((y - 22) / 2));
    for (let x = x0; x <= x1; x++) if (h < 0 || x < 20 - h || x > 20 + h) px(g, x, y, x === x0 || x === 20 - h - 1 || y === 20 ? 'l' : 'k');
    if (y > 20) px(g, x1 + 1, y, 'h');
  }
  [28, 31].forEach((y) => px(g, 20, y, 'h'));
  // --- thick neck (x15..24): shadow under the chin, undershirt collar below it
  fill(g, 15, [[16, 23], [16, 23], [16, 23], [16, 23], [16, 23], [16, 23]], (x, y) => (y === 19 ? (x === 16 ? 'F' : 'f') : x >= 22 ? 'f' : 'F'));
  span(g, 21, 16, 23, 'T');
  // --- face (x13..26, ears at 12 and 27): eyes in the brim's shadow, broken nose kinks right, square jaw
  paint(g, 13, 7, [
    'ffffffffffffff',
    'fkkkffffffkkkf',
    'fWWKkkffkkKWWf',
    'FFfffFFfFfffFf',
    'FFFFFFFfFFFFFf',
    'FFFFFFFFfFFFFf',
    'FFFFFfFFFfFFff',
    'FFFFFFfffFFFff',
    'FFFFFFFFFFFFff',
    'FFFFFhhhhhFFff',
    'ffFFhFfffFFfff',
    ' fffffFFfffff ',
  ]);
  paint(g, 12, 9, ['F', 'F', 'f']);
  paint(g, 27, 9, ['f', 'F', 'f']);
  // --- flat cap (tweed): wide low crown, brim snapped down over the brow, 1px past the ears
  paint(g, 11, 1, [
    '   HHHHHHhhhhhk    ',
    ' HHHhhhhhhhhhhhhk  ',
    'HHhhhhhhhhhhhhhhhk ',
    'Hhhhhhhhhhhhhhhhkk',
    'kkkhhhhhhkhhhhhkkk',
    '  kkkkkkkkkkkkkkkk',
  ]);
  px(g, 20, 11, 'T'); px(g, 21, 11, 'I'); // plaster across the broken bridge

  // --- the bat: long, rounded barrel up by the shoulder, tapering to a thin handle in the fist
  // (1px step every 3 rows; widths: rounded end 3, barrel 5, taper 4/3, handle 2, grip tape over the last rows)
  for (let y = 1; y <= 19; y++) {
    const s = 1 + Math.floor((y - 1) / 3);
    const [x0, x1] = y === 1 ? [s + 1, s + 3] : y <= 9 ? [s, s + 4] : y === 10 ? [s, s + 3] : y <= 13 ? [s + 1, s + 3] : [s + 2, s + 3];
    for (let x = x0; x <= x1; x++) {
      const i = x - x0, w = x1 - x0 + 1;
      px(g, x, y, y >= 17 ? (i === 0 ? 'B' : 'b') : i === 0 ? 'w' : i === w - 1 ? 'b' : i === w - 2 && w > 3 ? 'B' : i === 1 && w === 5 && y > 2 && y < 9 ? 'a' : 'w');
    }
  }
  // --- arm: shirt sleeve from the shoulder down the left edge to a rolled cuff, elbow in the corner,
  // bare forearm rising from the elbow straight into the fist; knob below the little finger
  paint(g, 0, 20, [
    '        FFFf   ',
    '       FFFFFf  ',
    '       FfffFf  ',
    '       FFFFFf  ',
    '     IhFfffFf  ',
    '   IIHhFFFFFf  ',
    '  IHHHhFFFFfBb ',
    'IHHHhFFFFFfbBBb',
    'IIIIFFFFFf     ',
    'hHhFFFFFf      ',
    'fFFFFFFf       ',
    'ffFFFFf        ',
  ]);
  return out(g);
}
