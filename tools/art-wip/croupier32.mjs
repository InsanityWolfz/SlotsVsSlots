import { canvas, px, span, paint, layer, out } from './croupier_r4.mjs';
// THE CROUPIER, 32x32 bust (round 4). Outline added by outline().
export function croupier32(opts = {}) {
  const g = canvas(32);
  // --- torso silhouette (matches the set): red waistcoat over a white shirt
  const S = [[19, 8, 23], [20, 5, 26], [21, 3, 28], [22, 2, 29], [23, 1, 30]];
  for (const [y, a, b] of S) span(g, y, a, b, 'R');
  for (let y = 24; y < 32; y++) span(g, y, 0, 31, 'R');
  // shirt sleeves at the outer shoulders (waistcoat armholes)
  const arm = { 19: 9, 20: 7, 21: 6, 22: 6, 23: 5, 24: 5, 25: 5, 26: 5, 27: 5, 28: 5, 29: 5, 30: 5, 31: 5 };
  for (let y = 19; y < 32; y++) for (let x = 0; x < 32; x++) {
    if (g[y][x] === '.') continue;
    const e = arm[y], top = g[y - 1]?.[x] === '.';
    if (x < e) px(g, x, y, top ? 'W' : x === e - 1 ? 'I' : 'T');
    else if (x > 31 - e) px(g, x, y, top ? 'T' : x === 31 ? 't' : 'I');
    else if (x === e || x === 31 - e) px(g, x, y, 'r');
    else if (top) px(g, x, y, 'R');
    else if (x >= 31 - e - 2) px(g, x, y, 'r');
  }
  // V of the shirt front down to the first button, closing line with gold buttons
  const V = { 19: [11, 19], 20: [12, 18], 21: [13, 17], 22: [13, 17], 23: [14, 16], 24: [14, 16], 25: [15, 15] };
  for (const [y, [a, b]] of Object.entries(V)) { span(g, +y, a, b, 'T'); px(g, a - 1, +y, y == 19 ? 'R' : 'r'); px(g, b + 1, +y, y == 19 ? 'R' : 'r'); }
  px(g, 9, 19, 'R'); px(g, 21, 19, 'R');
  for (let y = 26; y < 32; y++) px(g, 15, y, 'r');
  [27, 30].forEach((y) => px(g, 15, y, 'G'));
  // welt pockets
  span(g, 28, 7, 10, 'r'); span(g, 28, 21, 24, 'r');
  // neck
  paint(g, 13, 18, ['fffff', 'FFFff']);
  // bow tie
  paint(g, 12, 20, ['lk   kk', 'lkkKkkk', 'lk   kk']);
  // --- head: gaunt, centre-parted slick hair, heavy-lidded eyes, pencil moustache, one-sided smirk
  paint(g, 7, 1, [
    '.....kkllkkk.....',
    '...kllkkFkkllk...',
    '..kllkkkFkkkllk..',
    '..klkkkFFFkkkkk..',
    '..kkFFFFFFFFFkk..',
    '..kkFFFFFFFFbbk..',
    '..kFbbbFFFbFFFk..',
    '..FFkkkFFFkkkFf..',
    '.FFFWKWFFfWKWFff.',
    '.fFFFFFFFfFFFFff.',
    '..FFFFFFFfFFFff..',
    '..FFFFFfffFFFff..',
    '..FFFFkkkkkFFff..',
    '...FFFFFFFFFFf...',
    '...FFFFKKKKKf....',
    '....FFFFFFff.....',
    '.....FFFfff......',
  ]);
  // --- the rake: long stick held upright, flat crossbar blade at the top, brass ferrule; leans out away from the face
  const { fy = 19, by = 6, sb = 26, st = 26, bl = 24, bw = 7, drift = 3.5 } = opts;
  const R = layer();
  R.add(bl, by, ['w'.repeat(bw - 1) + 'B', ' ' + 'B'.repeat(bw - 3) + 'b']);
  R.add(st, by + 2, ['Gg']);
  const n = fy - (by + 3);
  for (let i = 0; i < n; i++) { const y = by + 3 + i; const x = st - Math.floor((i * (st - sb + 1)) / n); R.add(x, y, ['wB']); }
  // forearm: white sleeve rising straight from the bottom edge (elbow below the frame), cuff, fist around the stick
  for (let y = fy + 5; y < 32; y++) R.add(sb - 1 + (drift ? Math.floor((y - fy - 5) / drift) : 0), y, ['WTTI']);
  R.add(sb - 1, fy + 5, ['TTTI']);
  R.add(sb - 2, fy, [' FFFf', 'FFFFf', 'fffFf', 'FFFFf', 'fffff']);
  R.add(sb - 1, fy + 6, ['IIII']);
  R.done(g);
  return out(g);
}
