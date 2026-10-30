import { canvas, px, span, paint, out } from './cashier_r4.mjs';
// THE CASHIER, 32x32 bust. Outline added by outline().
// Ginger side part, knowing salesman's smirk; green waistcoat, white shirt, dark bow tie.
// He stands behind a teller's window: brass grille panels either side of him, a wooden counter across the bottom,
// a short stack of chips slid forward on the counter (the game's own bet-stack chip).
export function cashier32() {
  const g = canvas(32);
  // --- torso: green waistcoat over a white shirt, sleeves at the outer shoulders (the set's shoulder line)
  const S = [[19, 8, 23], [20, 5, 26], [21, 3, 28], [22, 2, 29], [23, 1, 30]];
  for (const [y, a, b] of S) span(g, y, a, b, 'Q');
  for (let y = 24; y < 32; y++) span(g, y, 0, 31, 'Q');
  const arm = { 19: 9, 20: 7, 21: 6, 22: 6, 23: 5, 24: 5, 25: 5, 26: 5, 27: 5, 28: 5, 29: 5, 30: 5, 31: 5 };
  for (let y = 19; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (g[y][x] === '.') continue;
    const e = arm[y], top = g[y - 1]?.[x] === '.';
    if (x < e) px(g, x, y, top ? 'W' : x === e - 1 ? 'I' : 'T');
    else if (x > 31 - e) px(g, x, y, top ? 'T' : x === 31 ? 't' : 'I');
    else if (x === e || x === 31 - e) px(g, x, y, 'q');
    else if (x >= 31 - e - 2) px(g, x, y, 'q');
  }
  // shirt V, brass waistcoat buttons, neck, dark bow tie
  const V = { 19: [11, 20], 20: [12, 19], 21: [13, 18], 22: [13, 18], 23: [14, 17], 24: [14, 17], 25: [15, 16] };
  for (const [y, [a, b]] of Object.entries(V)) { span(g, +y, a, b, 'T'); px(g, a - 1, +y, 'q'); px(g, b + 1, +y, 'q'); }
  for (let y = 26; y < 32; y++) px(g, 15, y, 'q');
  px(g, 16, 26, 'G');
  paint(g, 13, 18, ['ffffff']);
  paint(g, 13, 19, ['kl  lk', 'kklkkk', 'kk  kk']);
  // --- head: auburn hair with a neat side part, raised brow, one-sided grin
  paint(g, 8, 1, [
    '   ooooooooob   ',
    '  oooFOOOOOooob ',
    ' oooofoooooOoobb',
    ' ooobfFoooooobbb',
    ' obFFFFFFFoooobb',
    ' bFFFFFFFFFFFobb',
    ' bFoooFFFFFFFFbb',
    ' FFFFFFFFFoooFf ',
    'fFFWKWFFFFWKWFff',
    'fFFFFFFFFfFFFFff',
    ' FFFFFFFFfFFFFf ',
    ' FFFFFFFffFFFFf ',
    ' FFfFFFFFFFFKFf ',
    ' FFFKWWWWWWKfFf ',
    '  FFFFfffffFFf  ',
    '   FFFFFFFFFf   ',
    '    ffFFFFff    ',
  ]);
  // ears, 
  paint(g, 7, 9, ['F', 'f']); paint(g, 24, 9, ['f', 'f']);

  // --- teller's window: two brass grille panels (three bars and a top rail each) standing on the counter
  const counter = 28, top = 13;
  for (const x of [1, 3, 5, 26, 28, 30]) for (let y = top; y < counter; y++) px(g, x, y, 'G');
  span(g, top, 1, 5, 'G'); span(g, top, 26, 30, 'G');
  // wooden counter: lit top edge, front, shadow
  span(g, counter, 0, 31, 'w');
  for (let y = counter + 1; y < 32; y++) span(g, y, 0, 31, 'B');
  span(g, 31, 0, 31, 'b');
  // a short stack of chips slid forward onto the counter (pink face, red rims, white inserts, velvet seams)
  paint(g, 18, counter - 6, [
    ' MMMMMM ',
    'MWMRRMWr',
    'MWRRWRWr',
    'dddddddd',
    'MWRRWRWr',
    'dddddddd',
  ]);
  return out(g);
}
