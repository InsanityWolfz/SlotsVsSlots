import { canvas, px, span, paint, out } from './mechanic_r4.mjs';
// THE BENT MECHANIC, 32x32 bust. outline() adds the outer K.
export function mechanic32() {
  const g = canvas(32);
  // --- coveralls (teal: i lit, j mid, n shadow): shoulders slope from the neck down to both frame edges
  const body = [[6, 25], [4, 27], [2, 29], [1, 30]];
  for (let y = 24; y < 32; y++) body.push([0, 31]);
  body.forEach(([a, b], i) => {
    const y = 20 + i;
    span(g, y, a, b, 'j');
    const above = i ? body[i - 1][0] : b + 1;
    span(g, y, a, Math.min(9, above - 1), 'i'); // lit top edge of the left shoulder slope
    px(g, a, y, 'i');
    if (y >= 23) px(g, b, y, 'n');
  });
  // armhole seam: the left sleeve hangs from its own shoulder
  for (let y = 22; y < 32; y++) px(g, 4, y, 'n');
  // neck, and the collar opening around it; the collar tips meet at the zipper
  paint(g, 10, 19, ['fffff', 'FFff']);
  paint(g, 0, 20, [
    '      iiii    iiij',
    '      niiiifffiiijn',
    '       nniiifijjnn',
    '         nnnLnn',
  ]);
  // zipper with its pull tab
  for (let y = 23; y < 32; y++) px(g, 12, y, 'S');
  px(g, 12, 24, 'L');
  // name patch on the chest
  paint(g, 6, 25, ['TTTTT', 'TOoOt', 'TTTTt']);
  // --- head (round 3's face; the jaw now tapers to a chin above the neck)
  paint(g, 5, 6, [
    'bFFFFFFFFFFFb',
    'bFFFFFFFkkkkb',
    'FkkkkFFFFFFFf',
    'FFFFFFFFFFFFf',
    'FkkkFFFFkkkff',
    'FWKWFFFFWKWff',
    'FFFFFFFFFFFff',
    'FhkFFFFfFFFff',
    'FFhFFFfffFfkf',
    'FFFFFFFFFkfFf',
    ' FFkkkkkkfFf',
    '  FFFFFFfff',
    '    FFFfff',
  ]);
  paint(g, 4, 10, ['F', 'F', 'f']);
  paint(g, 4, 6, ['b', 'b']); paint(g, 18, 6, ['b', 'b', 'b']);
  paint(g, 4, 1, [
    '    aaaOOOOO',
    '  aaOOOOOOOOOo',
    ' aOOOOOOOOOOOoo',
    ' aOOOOOOOOOOOoo',
    ' oooooooooooooo',
  ]);
  paint(g, 1, 3, ['a', 'aO', ' aOo', '  oo', ' aO', ' ao', ' o']);
  paint(g, 9, 2, ['  o', 'oo']); paint(g, 15, 3, ['o']);
  // --- raised arm: the upper arm hangs from the right shoulder; the bare forearm rises straight up in
  // front of it from an elbow just below the frame (sleeve rolled to mid-forearm) to the fist
  for (let y = 16; y < 32; y++) {
    const core = y === 26 ? 'iiiiii' : y > 26 ? 'jjjjjj' : 'FFFFFf';
    paint(g, 23, y, [core]);
    if (y >= 20) px(g, 22, y, 'n');
    if (y >= 22) px(g, 29, y, 'n');
  }
  px(g, 30, 23, 'j'); // right shoulder cap above the upper arm
  // --- wrench held upright: open jaw at the top, the handle runs down into the fist
  paint(g, 22, 1, [
    ' WS   SD',
    'LLS   SDD',
    'LSSS SSDD',
    'LSSSSSSDD',
    ' LSSSSDD',
    '   LSD',
    '   LSD',
    '   LSD',
    '   LSD',
  ]);
  // fist straight on top of the wrist: thumb over the handle, curled fingers with knuckle notches
  paint(g, 23, 10, [
    'FFFfDFf',
    'fffffFf',
    'FFFFFf',
    'fffffFf',
    'FFFFFf',
    'ffffff',
  ]);
  return out(g);
}
