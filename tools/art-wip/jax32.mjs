import { canvas, paint, px, layer, out } from './jax_r4.mjs';
// JESTER JAX, hero of the JOKER slot machine. 32x32 bust, three-quarter view facing right.
// Two-tone jester cap with gold bells, harlequin diamond painted over his near eye, sly lopsided grin,
// cream pointed ruff, motley tunic counterchanged against the cap; a Joker card held low in his left hand.
export function jax32() {
  const g = canvas(32);
  // --- tunic: motley counterchanged against the cap (pink on his back side, violet on his front side)
  const T = { 20: [9, 23], 21: [6, 26], 22: [4, 28], 23: [2, 30], 24: [1, 30] };
  const seam = (x, y) => (x === 7 && y >= 23) || (x === 6 && y === 22) || (x === 24 && y >= 23) || (x === 25 && y === 22);
  for (let y = 20; y < 32; y++) {
    const [a, b] = T[y] ?? [1, 30];
    for (let x = a; x <= b; x++) {
      const pink = x <= 15;
      const top = g[y - 1][x] === '.';
      let c = pink ? (top ? 'M' : x >= 14 || seam(x, y) ? 'm' : 'M') : (top ? 'J' : x >= b - 1 || seam(x, y) ? 'v' : 'V');
      if (!top && pink && x === a && y > 24) c = 'M';
      px(g, x, y, c);
    }
  }
  // --- head
  paint(g, 0, 0, [
    '................................',
    '.....JJVVv..........MMMMm.......',
    '...JJVVVVVVv......MMMMMMMmm.....',
    '..JVVvvVVVVVv....MMMMMmmmMMm....',
    '..JVv.vJVVVVVv..MMMMMMMm..mMm...',
    '..Vv...JVVVVVVVMMMMMMMMm...mMm..',
    '..YY...VVVVVVVVMMMMMMMMm....mm..',
    '.YWYG..GYYYYGGGGYYYYGGGg...YY...',
    '.GYGg..VVFFFFFFFFFFFFFf...YWYG..',
    '..gg...VVFFFFFFFFFFFKKf...GYGg..',
    '.......VvFKWWKFFFFFFWKF.....gg..',
    '.......VvFFFFFFFFFFFFFF.........',
    '.......VvFFFFFFFFFFFFFFF........',
    '.......VvFFFFFFFFFFFFff.........',
    '.......vvFFFFFFFFFFFFKF.........',
    '........vFFFFKKKWWWWKFf.........',
    '........vfFFFFFFKKKKFf..........',
    '..........ffFFFFFFFf............',
    '.............fffff..............',
  ]);
  // the hood's back flap hangs down behind the jaw to the ruff
  paint(g, 8, 17, ['vv', 'vvv']);
  // sly: far brow cocked down over a narrowed eye; a smile crease at the near corner of the grin
  paint(g, 19, 9, ['KKF']);
  paint(g, 12, 14, ['f']);
  // harlequin diamond painted over the near eye
  paint(g, 10, 8, ['  M  ', ' MMm ', 'M   m', ' Mmm ', '  m  ']);
  // ruff: cream, pleated, pointed
  paint(g, 6, 19, [
    '    TTTTTTTTTt     ',
    '  TTTTTTTtTTTTTtTt ',
    ' TTtTTTtTTTtTTTtTTt',
    '  Tt  Tt  Tt  Tt t ',
    '  t   t   t   t    ',
  ]);
  // the ruff casts a shadow on the tunic
  for (let y = 31; y > 20; y--) for (let x = 0; x < 32; x++) {
    if ('Tt'.includes(g[y - 1][x]) && 'MJV'.includes(g[y][x])) g[y][x] = x <= 15 ? 'm' : 'v';
  }
  // --- his left hand, low in front of the violet side: pink sleeve from the bottom edge, gold cuff,
  // fingers pinching the foot of a Joker card (jester-cap mark, distinct from an ace)
  const A = layer();
  const MARK = ['.VVM.', 'VV.MM', 'V...M', 'Y...Y'].map((r) => 'T' + r.replace(/\./g, 'T') + 't');
  A.add(23, 18, ['TTTTTTt', ...MARK, 'TTTTTTt', 'TTTTTTt', 'tttttt']);
  // hand: thumb up the card's edge, curled fingers across its foot; narrow wrist, gold cuff, pink sleeve off the bottom
  A.add(23, 23, [
    ' F     ',
    ' FFFf  ',
    ' FfFfF ',
    ' FFFFf ',
    '  fff  ',
    ' GGGg  ',
    ' MMMm  ',
    ' MMMm  ',
    ' MMMm  ',
  ]);
  A.done(g);
  return out(g);
}
