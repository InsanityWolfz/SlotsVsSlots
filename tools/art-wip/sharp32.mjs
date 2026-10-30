import { canvas, px, span, paint, layer, out } from './sharp_r4.mjs';
// THE CARD SHARP, 32x32 bust (round 4). Outline added by outline().
export function sharp32() {
  const g = canvas(32);
  // --- velvet jacket: neck, shoulders sloping to both edges (rows 22/23), centred under the head (x 13)
  const sil = { 19: [8, 18], 20: [5, 21], 21: [3, 24], 22: [1, 28], 23: [0, 31] };
  for (let y = 19; y < 32; y++) { const [a, b] = sil[y] ?? [0, 31]; span(g, y, a, b, 'v'); for (let x = a; x <= b; x++) if (g[y - 1][x] === '.' || x === 0) px(g, x, y, 'V'); }
  // the left shoulder rounds toward the light: a second lit row along its slope
  for (const [x, y] of [[6, 21], [7, 21], [4, 22], [5, 22], [2, 23], [1, 23], [1, 24]]) px(g, x, y, 'V');
  // sleeve seams: both upper arms hang from their own shoulders
  for (let y = 22; y < 32; y++) { px(g, 3, y, 'P'); px(g, 28, y, 'P'); }
  // open collar: neck, skin V, gold chain, black shirt, satin lapels
  paint(g, 8, 18, [
    '   fFFFf   ',
    '  llFFfkk  ',
    ' JllFFfkkV ',
    'JJklGFGkkVV',
    'JJJkkYkkVVv',
    ' JJPkkkPVv ',
    ' VJJPkPVVv ',
    '  VJPkPVv  ',
    '   VJkVv   ',
    '    VPv    ',
  ]);
  // jacket button below the lapels' V
  px(g, 13, 29, 'l'); px(g, 13, 30, 'P');
  // --- head: slicked back with a widow's peak, cocked brow, side-eye toward the card, lopsided grin
  paint(g, 5, 1, [
    '     kkkkkkkk    ',
    '   kklWllkkkkkk  ',
    '  klkkkkllkkkkkP ',
    ' klkkllkkkkkkkkP ',
    ' kkkkkkkkkkkkkkP ',
    ' kkkkkkkkkkkkkkP ',
    ' kkFFFFFkFFFFfkP ',
    ' kFkkkFFFFFFFFfk ',
    ' kFFFFkFFFkkkkfk ',
    'fFFWWKFFFFWWKFff ',
    'fFFFFFFFfFFFFFff ',
    ' FFFFFFfffFFFff  ',
    ' FFFFFFFFFFFfff  ',
    ' fFFFKKKKKKWKff  ',
    '  fFFFKWWWWKff   ',
    '  fFFFFKKKKFf    ',
    '   ffFFFFFff     ',
    '     fffff       ',
  ]);
  // --- forearm rising from the bottom edge (elbow off-frame, bottom right) in front of the chest; cuff;
  // hand kept low, just under the chin; the card stands beside his jaw
  const A = layer('P');
  for (let y = 25; y < 32; y++) { const o = y > 28 ? 1 : 0; A.add(26 + o, y, ['JVVv']); }
  A.add(26, 23, ['kllG', 'kkkk']);
  A.add(25, 19, [
    'FfFff',
    'FFFff',
    'fFfff',
    ' fff ',
  ]);
  A.done(g);
  // the marked card, pinched: thumb in front on its lower edge, fingers curled behind (knuckles at its right side)
  paint(g, 24, 9, [
    'WTTTTR',
    'WTTTRr',
    'WTTKTt',
    'WTKKKt',
    'WTKKKt',
    'WTTkTt',
    'WTTTTt',
    'WTTTTt',
    'WTTTTt',
    ' tttt',
  ]);
  paint(g, 25, 17, ['FF', 'Ff']);
  paint(g, 29, 16, ['F', 'f', 'F']);
  return out(g);
}
