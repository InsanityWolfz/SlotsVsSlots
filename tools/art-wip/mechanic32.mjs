import { canvas, px, span, paint, out } from './sp_tools.mjs';
// THE BENT MECHANIC, 32x32 bust. outline() adds the outer K.
export function mechanic32() {
  const g = canvas(32);
  // --- coveralls (teal: i lit, j mid, n shadow), shoulders off the bottom
  [[5, 22], [2, 26], [1, 29], [0, 30], [0, 31]].forEach(([a, b], i) => span(g, 19 + i, a, b, 'j'));
  for (let y = 24; y < 32; y++) span(g, y, 0, 31, 'j');
  span(g, 19, 5, 7, 'i'); span(g, 20, 2, 3, 'i'); span(g, 21, 1, 1, 'i');
  for (let y = 21; y < 32; y++) { px(g, 31, y, 'n'); }
  // collar points and zipper
  paint(g, 7, 18, ['iijj', ' ijjn', '  jjn', '   jn']);
  paint(g, 14, 18, ['jjjn', 'jjn', 'jn', 'n']);
  for (let y = 21; y < 32; y++) px(g, 12, y, 'S');
  // chest pocket with the name patch above it, a grease smear, fold shadows
  paint(g, 3, 23, ['TTTTT', 'TOoOT', 'TTTTt', '', 'nnnnnnn', 'jjjjjjn', 'jjjjjjn']);
  for (let y = 23; y < 32; y++) px(g, 21 - Math.floor((y - 23) / 4), y, 'n');
  // --- head
  paint(g, 5, 6, [
    'bFFFFFFFFFFFfb',
    'bFFFFFFFkkkkfb',
    'FkkkkFFFFFFFff',
    'FFFFFFFFFFFFff',
    'FkkkFFFFkkkfff',
    'FWKWFFFFWKWfff',
    'FFFFFFFFFFFfff',
    'FhkFFFFfFFFfff',
    'FFhFFFfffFfkff',
    'FFFFFFFFFkfFff',
    ' FFkkkkkkfFfff',
    ' FFFFFFFfffff',
    '  FFFFFfff',
  ]);
  paint(g, 4, 10, ['F', 'F', 'f']); // near ear (the far one hides behind the fist)
  // hair tufts out from under the bandana
  paint(g, 4, 6, ['b', 'b']); paint(g, 19, 6, ['b', 'b', 'b']);
  // --- bandana (orange: a lit, O mid, o shadow), knot tails off the side
  paint(g, 4, 1, [
    '    aaaOOOOO',
    '  aaOOOOOOOOOo',
    ' aOOOOOOOOOOOoo',
    ' aOOOOOOOOOOOoo',
    ' oooooooooooooo',
  ]);
  paint(g, 1, 3, ['a', 'aO', ' aOo', '  oo', ' aO', ' ao', ' o']);
  paint(g, 9, 2, ['  o', 'oo']); paint(g, 15, 3, ['o']);
  // --- raised arm (viewer right): bare forearm out of a rolled sleeve, elbow below the frame
  for (let y = 17; y < 28; y++) paint(g, 22 + Math.floor((y - 16) / 3), y, ['FFFFf']);
  paint(g, 24, 27, ['iiiiiij', 'jjjjjjjn', 'nnnnnnnn', ' jjjjjjn', ' jjjjjjn']);
  // --- wrench held upright: open jaw at the top, shaft into the fist
  paint(g, 20, 1, [
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
  // fist wrapped round the shaft: thumb over the top, three finger bands below
  paint(g, 20, 10, [
    ' FFFFFff',
    'FFFfffFf',
    'FFFFFFff',
    'fffffFff',
    'FFFFFFff',
    'ffffFfff',
    ' FFFFff',
  ]);
  // ring of keys hanging off the little finger
  paint(g, 27, 15, [' YGg', 'Y   g', 'G   g', ' ggg', 'YG LS', 'g  SD', 'gg SS']);
  return out(g);
}
