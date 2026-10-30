import { canvas, paint, px, out } from './jax_r4.mjs';
// JESTER JAX, hero of the JOKER slot machine. 32x32 bust, three-quarter view facing right.
// Two-tone jester cap with gold bells; jester greasepaint (white face, pink and violet diamonds over the eyes,
// red nose tip, red lips in a sly lopsided grin);
// cream pointed ruff, motley tunic counterchanged against the cap. No arm or prop.
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
    '.GYGg..VVFFFFFFFFFFFFf....YWYG..',
    '..gg...VVFFFFFFFFFFFFf....GYGg..',
    '.......VvFFKWWKFFFWKFF......gg..',
    '.......VvFFFFFFFFFFFFF..........',
    '.......VvFFFFFFFFFFFFFF.........',
    '.......VvFFFFFFFFFFFff..........',
    '.......vvFFFFFFFFFFFKF..........',
    '........vFFFKKKWWWWKFf..........',
    '........vfFFFFFKKKKFf...........',
    '..........ffFFFFFFf.............',
    '.............fffff..............',
  ]);
  // the hood's back flap hangs down behind the jaw to the ruff
  paint(g, 8, 17, ['vv', 'vvv']);
  // harlequin diamond painted over the near eye
  paint(g, 11, 8, ['  M  ', ' MMm ', 'M   m', ' Mmm ', '  m  ']);
  // --- jester greasepaint: white face (neck stays skin), violet diamond on the far eye, red nose tip, red lips
  for (let y = 8; y <= 17; y++) for (let x = 9; x <= 22; x++) {
    if (g[y][x] === 'F') g[y][x] = 'T';
    else if (g[y][x] === 'f') g[y][x] = 'u';
  }
  paint(g, 13, 18, ['fFFFf']); // neck, skin under the paint
  paint(g, 17, 9, ['KKV']); // sly: far brow cocked down over a narrowed eye
  paint(g, 17, 10, ['V']); paint(g, 20, 10, ['v']);
  paint(g, 18, 11, ['Vv']); paint(g, 18, 12, ['v']);
  paint(g, 21, 12, ['RR']); paint(g, 21, 13, ['r']); paint(g, 20, 13, ['u']);
  // painted lips: red upper lip rising to the far corner, closed on the near side, white teeth, red lower lip
  paint(g, 15, 14, ['RRRRRR']);
  paint(g, 12, 15, ['RRK']); paint(g, 19, 15, ['KR']);
  paint(g, 14, 16, ['rKKKK']);
  paint(g, 15, 17, ['RRr']);
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
  // lower the figure: 2px more room above the cap, tunic still runs off the bottom
  g.splice(30, 2);
  g.unshift(Array(32).fill('.'), Array(32).fill('.'));
  return out(g);
}
