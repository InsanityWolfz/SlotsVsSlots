import { canvas, px, span, paint, out } from './mechanic_r4.mjs';
// THE BENT MECHANIC, 32x32 bust. outline() adds the outer K.
// The head's centre line is x14.5: the left shoulder runs off at x0, the right one ends at x29.
export function mechanic32() {
  const g = canvas(32);
  const S = 3; // head, neck, collar and zipper sit 3px right of round 4
  // --- coveralls (teal: i lit, j mid, n shadow): shoulders slope from the neck, mirrored about the head
  const body = [[8, 21], [6, 23], [4, 25], [2, 27], [1, 28]];
  for (let y = 25; y < 32; y++) body.push([0, 29]);
  body.forEach(([a, b], i) => {
    const y = 20 + i;
    span(g, y, a, b, 'j');
    const above = i ? body[i - 1][0] : b + 1;
    span(g, y, a, Math.min(12, above - 1), 'i'); // lit top edge of the left shoulder slope
    px(g, a, y, 'i');
    if (y >= 22) px(g, b, y, 'n');
  });
  // armhole seam: the left sleeve hangs from its own shoulder
  for (let y = 23; y < 32; y++) px(g, 6, y, 'n');
  // neck, and the collar opening around it; the collar tips meet at the zipper
  paint(g, 10 + S, 19, ['fffff', 'FFff']);
  paint(g, S, 20, [
    '      iiii    iiij',
    '      niiiifffiiijn',
    '       nniiifijjnn',
    '         nnnLnn',
  ]);
  // zipper with its pull tab
  for (let y = 23; y < 32; y++) px(g, 12 + S, y, 'S');
  px(g, 12 + S, 24, 'L');
  // name patch on the chest
  paint(g, 8, 25, ['TTTTT', 'TOoOt', 'TTTTt']);
  // --- head (round 3's face; tapered jaw; lips; one clean grease streak on the cheekbone)
  paint(g, 5 + S, 6, [
    'bFFFFFFFFFFFb',
    'bFFFFFFFkkkkb',
    'FkkkkFFFFFFFf',
    'FFFFFFFFFFFFf',
    'FkkkFFFFkkkff',
    'FWKWFFFFWKWff',
    'FFFFFFFFFFFff',
    'FhhFFFFfFFFff',
    'FFFFFFfffFfff',
    'FFFFFFFFFkfFf',
    ' FFrrrrrkfFf',
    '  FFFFFFfff',
    '    FFFfff',
  ]);
  paint(g, 4 + S, 10, ['F', 'F', 'f']);
  paint(g, 4 + S, 6, ['b', 'b']); paint(g, 18 + S, 6, ['b', 'b', 'b']);
  // chin-length hair falling from under the bandana behind the ears
  paint(g, 3 + S, 7, [' b', 'bb', 'bb', 'bb', 'bb', 'bb', 'bb', ' b']); paint(g, 18 + S, 9, ['b', 'b', 'b', 'b', 'b']);
  paint(g, 4 + S, 1, [
    '    aaaOOOOO',
    '  aaOOOOOOOOOo',
    ' aOOOOOOOOOOOoo',
    ' aOOOOOOOOOOOoo',
    ' oooooooooooooo',
  ]);
  paint(g, 1 + S, 3, ['a', 'aO', ' aOo', '  oo', ' aO', ' ao', ' o']);
  paint(g, 9 + S, 2, ['  o', 'oo']); paint(g, 15 + S, 3, ['o']);
  // --- raised arm: a slim bare forearm rises straight up in front of the right shoulder from an elbow
  // just below the frame (sleeve rolled to mid-forearm) to the fist
  for (let y = 19; y < 32; y++) {
    const core = y === 27 ? 'iiin' : y > 27 ? 'jjjn' : 'FFFf';
    paint(g, 24, y, [core]);
    if (y >= 21) px(g, 23, y, 'n');
  }
  // --- wrench held upright: open jaw at brow height, the handle runs down into the fist
  paint(g, 23, 5, [
    'WS   SD',
    'LSS SSD',
    'LSSSSSD',
    ' LSSSD',
    '  LSD',
    '  LSD',
    '  LSD',
    '  LSD',
    '  LSD',
  ]);
  // fist at cheek-to-chin height, straight on top of the wrist: thumb over the handle, curled fingers with knuckle notches
  paint(g, 24, 14, [
    'FFfDf',
    'ffffF',
    'FFFFf',
    'ffffF',
    'FFFFf',
    'ffff',
  ]);
  return out(g);
}
