import { canvas, px, span, paint, prop, layer, out } from './jx_tools.mjs';
// THE LEECH, 32x32 bust. Outline added by outline().
export function leech32() {
  const g = canvas(32);
  const X = -2; // head/shirt x-shift
  // --- borrowed tuxedo, a size too big: drooping shoulders off the bottom
  paint(g, 0, 20, [
    '  llllkkk......kkkkkkklll       ',
    'lllkkkkkk......kkkkkkkkkkll     ',
    'lkkkkkkkk......kkkkkkkkkkkkkP   ',
    'kkkkkkkkk......kkkkkkkkkkkkkkkP ',
  ]);
  for (let y = 24; y < 32; y++) { span(g, y, 0, 31, 'k'); px(g, 31, y, 'P'); }
  // shirt front, satin lapels, red bow tie
  paint(g, 7 + X, 19, [
    '   TTTTTTT',
    '  KTTTTTTTK',
    ' KlRrTTTrRK',
    'KllRRrKrRRPK',
    'KlPRrTTTrRPPK',
    'KllPTTTTTPPPK',
    ' KllPTTTPPPK',
    ' KlllPTPPPPK',
    '  KllPTPPPK',
    '  KlllPTPPPK',
    '   KllPPPPK',
    '   KlllPPPPK',
    '    KllPPPK',
  ]);
  // --- head: slicked-back thin hair, pale clammy face, too-wide smile
  paint(g, 6 + X, 1, [
    '    kkkkkk',
    '  kkllllllkk',
    ' klkkkkkkkllk',
    ' kllllllkkkkkk',
    ' kkkkkkkkllkkk',
    ' kTTTkkTTTkkkk',
    ' kTTTTTTTTTTFk',
    ' TTTkkTTkkTTTF',
    ' TkkTTTTTTkkTF',
    'TTKKKTTTTKKKFF',
    'FFWKWFTFFWKWfF',
    'FTfffTTFTfffFF',
    ' TTTTTTfFTTFF',
    ' TTFkkFFkkFTF',
    ' KFTTTTTTTFFK',
    ' TKWTWTWTWTKF',
    ' TTKKKKKKKKFF',
    '  TTFTTTTFFF',
    '   TFTTTFF',
    '    FFFF',
  ]);
  // a bead of sweat at the temple: clammy
  paint(g, 16 + X, 7, ['A', 'W']);
  // --- his left arm: forearm rises in front of the drooping shoulder (elbow below the frame), hand palm-up
  const L = layer();
  const arm = [[22, 21], [23, 21], [24, 21], [25, 22], [26, 22], [27, 22], [28, 23], [29, 23], [30, 23], [31, 24]];
  for (const [y, x] of arm) L.add(x, y, ['lkkkP']);
  L.add(20, 19, ['KTTTK', 'TTTTI', 'IIII']);
  L.add(20, 14, [
    '        T T',
    '  T    TTFT',
    ' TTTTTTTTFT',
    'TTTFFFFFFF',
    ' FFf',
  ]);
  L.done(g);
  return out(g);
}
