import { canvas, px, span, rect, paint, out } from './house_r4.mjs';
// THE HOUSE (act 1 boss), 32x32: the casino's own gold slot machine, wearing a crown. Outline added by outline().
export function house32() {
  const g = canvas(32);
  // cabinet: front face x1..24, side face x25..26 in shadow; runs off the bottom
  rect(g, 1, 9, 24, 22, 'G');
  span(g, 8, 2, 23, 'Y');
  rect(g, 1, 9, 1, 22, 'Y');
  rect(g, 24, 9, 24, 22, 'g');
  rect(g, 25, 9, 26, 22, 'g');
  rect(g, 26, 10, 26, 22, 'b');
  px(g, 24, 8, 'G'); px(g, 25, 8, 'G');
  // marquee: chase lights on a red strip
  span(g, 10, 2, 23, 'r');
  for (let x = 3; x <= 22; x += 2) px(g, x, 10, (x - 3) % 4 === 0 ? 'Y' : 'W');
  // reel window: chrome rails above and below, black bezel x2..23, three cream reels of 6
  span(g, 11, 2, 23, 'L'); span(g, 22, 2, 23, 'D');
  rect(g, 2, 12, 23, 21, 'K');
  for (const x0 of [3, 10, 17]) {
    rect(g, x0, 13, x0 + 5, 20, 'T');
    span(g, 13, x0, x0 + 5, 't'); span(g, 20, x0, x0 + 5, 't');
    // a red 7: 2px top bar, 2px stem stepping down-left, cream on both sides of the stem
    paint(g, x0, 14, [' RRRRR', ' RRRRR', '    RR', '   RR ', '  RR  ', '  RR  ']);
  }
  // base: a wider belly under the head cabinet, running off the bottom and both sides (like shoulders)
  rect(g, 0, 24, 24, 31, 'G'); span(g, 23, 1, 24, 'Y'); rect(g, 0, 24, 0, 31, 'Y');
  rect(g, 25, 24, 31, 31, 'g'); span(g, 23, 25, 30, 'G');
  // coin tray: dark recess, stacks of coins (the pot) growing in it, gold lip in front
  rect(g, 4, 25, 21, 29, 'P');
  span(g, 25, 4, 21, 'K');
  const stack = (x, top) => { px(g, x, top, 'Y'); px(g, x + 1, top, 'W'); px(g, x + 2, top, 'G');
    for (let y = top + 1; y <= 29; y++) paint(g, x, y, [(y - top) % 2 ? 'YGg' : 'gbb']); };
  stack(5, 27); stack(9, 26); stack(13, 25); stack(17, 27);
  span(g, 30, 3, 22, 'Y'); span(g, 31, 3, 22, 'g');
  // crown: five points with pearls on the tips, a big ruby in the middle of the band, two small ones
  paint(g, 3, 1, [
    '         W         ',
    'W    W  YGg  W    W',
    'Y   YGg YGg YGg   g',
    'YG  YGg YGg YGg  Gg',
    'YGGYGGGgYGgYGGGgGGg',
    'YYYYYYYYWRrYYYYYYYg',
    'YGGGRrGGRrrGGRrGGGg',
  ]);
  span(g, 8, 3, 21, 'g');
  // lever: gold bracket on the side face, steel hub, rod, red ball
  rect(g, 25, 16, 26, 21, 'G'); px(g, 25, 16, 'Y'); span(g, 21, 25, 26, 'b');
  paint(g, 27, 17, ['LLS', 'LSD', 'SSD', 'SDD']);
  for (let y = 6; y <= 16; y++) { px(g, 28, y, 'L'); px(g, 29, y, 'D'); }
  paint(g, 27, 2, ['RRRr', 'RWRr', 'RRrr', ' rr ']);
  return out(g);
}
