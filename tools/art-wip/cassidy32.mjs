import { canvas, px, paint, fill, out } from './cassidy_r4.mjs';
// CASH CASSIDY (hero of the BANKROLL Slot Machine), 32x32 bust facing right. outline() adds the outer K.
export function cassidy32() {
  const g = canvas(32);
  // --- charcoal jacket, symmetric shoulders off the bottom
  fill(g, 18, [[14, 17], [9, 22], [6, 25], [4, 27], [3, 28], [2, 29], [1, 30], [1, 30], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31], [0, 31]],
    (x, y, has) => (y === 18 ? 'f' : !has(x - 1, y) || (!has(x, y - 1) && x < 16) ? 'l' : !has(x + 1, y) ? 'P' : 'k'));
  // open front: lapels, a money-green vest with gold buttons, white shirt and a red bow tie
  for (let y = 19; y < 32; y++) {
    const xl = y >= 27 ? 15 : 12 + Math.floor(((y - 19) * 3) / 8);
    const xr = y >= 27 ? 19 : 21 - Math.floor(((y - 19) * 2) / 8);
    for (let x = xl; x <= xr; x++) px(g, x, y, x === xl ? 'e' : x === xr ? 'q' : 'Q');
    if (y >= 20) { px(g, xl - 1, y, 'l'); px(g, xl - 3, y, y < 27 ? 'P' : 'k'); px(g, xr + 1, y, 'l'); px(g, xr + 3, y, y < 27 ? 'P' : 'k'); }
  }
  paint(g, 13, 19, ['TTFFFTT', ' TRrRT', '  TTT', '   T']);
  [22, 25, 28, 31].forEach((y) => px(g, 17, y, 'G'));
  // --- long wavy red hair falling behind, over her right shoulder
  paint(g, 3, 8, [
    '   oOO',
    '  oOOo',
    '  oOob',
    ' oOOob',
    ' oOOob',
    'oOOoob',
    'oOOobb',
    'oOoob',
    ' oOob',
    ' oOOob',
    ' oOOob',
    '  oOob',
    '  oOOob',
    '   oOob',
    '   oobb',
  ]);
  // --- face, three-quarter turned right: eyes peering over gold-rimmed shades pushed down her nose
  paint(g, 9, 8, [
    'OOOOOOooffffff',
    'oOOOooFFFooFFf',
    'FooooFFFoFFFFf',
    'FKKKKFFFKKKFFf',
    'FFWWKFFFWKFFFFf',
    'FgGGGgGgGGgFFFF',
    'FFqqqFFFqqFFfff',
    ' fFFFFFFFFFFf',
    ' fFFFFFFFFFf',
    '  fFFFFFFFff',
    '    ffffff',
  ]);
  paint(g, 20, 14, ['ff']);
  // gold drop earring below her ear
  paint(g, 9, 14, ['G', 'Y']);
  // red lips: a sly, lopsided grin with a gold tooth
  paint(g, 15, 15, ['     r', 'rTTTYr', ' RRRr']);
  // --- black gambler hat: pinched crown, gold band, an ace tucked in the band, wide flat brim curled at the tips
  paint(g, 2, 1, [
    '          llllllkk        ',
    '        lkkkkkkTTTkP      ',
    '        lkkkkkkTRTkP      ',
    '        lkkkkkkTTtkP      ',
    ' l      GYYGGGGGGGGg     k',
    ' lllllllllllllllllllllllkk',
    '  PkkkkkkkkkkkkkkkkkkkkkP ',
  ]);
  // sleeve seams: both upper arms hang from their own shoulders, elbows below the frame
  paint(g, 4, 22, ['P', 'P', 'P', ' P', ' P', ' P', ' P', ' P', ' P', ' P']);
  paint(g, 27, 22, [' P', ' P', ' P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']);
  // --- her left forearm rises from the bottom edge (elbow off-frame); her hand grips a short stack of chips
  paint(g, 23, 15, [
    ' eEEEe ',
    ' QTQQTq',
    'GYGGYg ',
    ' QTQQTq',
    ' GFFFfg',
    ' FFFFf ',
    ' fFFff ',
    ' TTTI  ',
    'PllkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
    'PlkkkP ',
  ]);
  return out(g);
}
