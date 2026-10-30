import { canvas, px, span, paint, out } from './wheel_r4.mjs';
// THE WHEEL (act 2 boss), 32x32 bust. outline() adds the outer K.
export function wheel32(opts = {}) {
  const g = canvas(32);
  // --- green dealer's jacket, shoulders symmetric about the head's centre (x15.5)
  const sil = { 19: [11, 20], 20: [8, 23], 21: [5, 26], 22: [2, 29], 23: [0, 31] };
  for (let y = 19; y < 32; y++) {
    const [a, b] = sil[y] ?? [0, 31];
    span(g, y, a, b, 'Q');
    for (let x = a; x <= b; x++) if (g[y - 1][x] === '.' && x < 16) px(g, x, y, 'e');
    px(g, b, y, 'q');
  }
  // sleeve seam: the left arm hangs from its own shoulder
  for (let y = 24; y < 32; y++) { px(g, 4, y, 'q'); px(g, 27, y, 'q'); }
  // white blouse V between satin lapels (lit left, shadowed right), gold pin on the left lapel
  for (let y = 19; y < 28; y++) {
    const h = Math.max(-1, 3 - Math.floor((y - 19) * 0.5));
    if (h >= 0) span(g, y, 15 - h, 15 + h, 'T');
    const l = 15 - h - 1, r = 15 + h + 1;
    span(g, y, l - 1, l, 'e'); px(g, l - 2, y, 'q');
    span(g, y, r, r + 1, 'q'); px(g, r + 2, y, 'q');
  }
  // the jacket closes below the V: front edge and two gold buttons
  for (let y = 28; y < 32; y++) { px(g, 15, y, 'q'); px(g, 16, y, 'e'); }
  px(g, 15, 29, 'G'); px(g, 15, 31, 'G');
  // neck
  paint(g, 13, 18, ['fffff', 'fFFFf', ' fFf ']);
  // --- head (face x9..21, centre x15)
  paint(g, 5, 1, [
    '      OOOoooo        ',
    '    OOOooooooooo     ',
    '   OOoooooooooooob   ',
    '  OOoooooooooooooob  ',
    '  OoeeeeeeeeeeeeeQbb ',
    ' EEEEEEEEEEEEEEEEEEe ',
    ' QeeeeeeeeeeeeeeeeeQ ',
    '  OoQQeeeeeeeeeeQQob ',
    '  OoFffffffffbffob  ',
    '  OoFFbbbFFFbbFFfob  ',
    '  OoFFKKKFFFKKKFfob  ',
    '  OoFFWKWFFFWKWFfob  ',
    '  OoFFFFFFfFFFFFfob  ',
    ' OooFFFFFFffFFFffoob ',
    ' OooFFFFFFFFFFFFfoob ',
    ' OooFFFFFrrrrrfFfoob ',
    '  oobFFFFFRRRFFFfoob ',
    '  oobFFFFFFFFFffboob ',
    '   b  fFFFFFff  bb   ',
  ]);
  // brooch: opts.pin picks the plain gold pin or a tiny roulette wheel
  if (opts.pin) paint(g, 8, 22, opts.pin);
  else paint(g, 9, 22, ['GY', 'gG']);
  return out(g);
}
