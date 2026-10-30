import { canvas, px, paint, fill, out } from './cassidy_rd.mjs';
// CASH CASSIDY, design A: the lean riverboat gambler. Hero of the BANKROLL Slot Machine.
// 32x32 bust, three-quarter view turned to the viewer's right (as JESTER JAX and DJ DECIBEL): ear and hair on the
// left, both lenses right of centre, nose breaking the right profile, cigar out of the far corner of the grin.
// Wide flat-brim black hat (gold band, ace tucked in it), dark-rimmed shades, pencil moustache, gold-tooth grin,
// charcoal jacket over a money-green vest, red bow tie. outline() adds the outer K.
export function cassidy32a() {
  const g = canvas(32);
  // --- charcoal jacket, symmetric shoulders sloping off the neck
  const body = [[11, 20], [7, 24], [5, 26], [3, 28], [2, 29], [1, 30], [0, 31], [0, 31], [0, 31]];
  const jacket = (x, y, has) => (!has(x - 1, y) || (!has(x, y - 1) && x < 16) ? 'H' : !has(x + 1, y) || (!has(x, y - 1) && x >= 16) ? 'k' : 'h');
  fill(g, 23, body, jacket);
  // open front: money-green vest in a V narrowing to the waist, notch lapels folded back either side
  for (let y = 26; y < 32; y++) {
    const half = Math.max(2, 4 - Math.floor((y - 26) / 3));
    const a = 16 - half, b = 15 + half;
    for (let x = a; x <= b; x++) px(g, x, y, x === a ? 'e' : x === b ? 'q' : 'Q');
    // lapels: lit fold on the near one, shadowed on the far one, a dark crease outside each
    px(g, a - 1, y, 'H'); px(g, a - 2, y, 'k');
    px(g, b + 1, y, 'h'); px(g, b + 2, y, 'k');
  }
  paint(g, 14, 26, ['eTTq', ' Tt']);
  [29, 31].forEach((y) => px(g, 16, y, 'G'));
  // white shirt front, collar wings and a red bow tie under the chin
  paint(g, 12, 22, ['TT    tt']);
  paint(g, 12, 23, ['RR TT RR', 'RRRrrRRR', 'rr TT rr']);
  paint(g, 12, 23, ['T      t']);
  // neck under the jaw
  paint(g, 14, 21, ['ffff', 'fFFf']);
  // --- face, turned right: long and lean, hollow cheeks, narrow jaw
  fill(g, 10, [[11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [11, 22], [12, 22], [13, 21], [14, 21], [15, 20]],
    (x, y, has) => (y === 10 ? 'f' : !has(x + 1, y) || !has(x, y + 1) ? 'f' : 'F'));
  paint(g, 22, 14, ['F', 'Ff', 'f']); // nose, breaking the profile
  // dark brown hair, a little long at the back; ear
  paint(g, 8, 10, [' bb', 'bBb', 'bBb', 'bbFf', 'bbFf', 'bbFf', 'bBfb', 'bBbb', ' bb']);
  // dark-rimmed shades: temple arm back to the ear, wide near lens, narrow far lens tucked against the nose
  paint(g, 14, 12, ['  PPPPPPPPP', '  PWlkPFPkk', '   PPP']);
  paint(g, 11, 12, ['kkkkk']); // temple arm, unbroken from the near lens back to the ear
  // a strip of dark brown hair between the brim and the forehead, thinning toward the front
  paint(g, 10, 10, ['bbbbBbbbb']);
  // hollow cheek under the cheekbone
  px(g, 13, 17, 'f'); px(g, 14, 18, 'f');
  // pencil moustache, sly grin with a gold tooth
  paint(g, 17, 17, ['bbbbb']);
  paint(g, 16, 18, ['KTTGK']);
  paint(g, 17, 19, ['KKK']);
  // cigar clenched in the far corner, ember at the tip
  paint(g, 21, 18, ['BBBBO']); paint(g, 22, 19, ['bbbo']);
  // --- black riverboat hat: low flat crown, gold band, the ace tucked into the band on the front side, wide flat brim
  paint(g, 1, 3, [
    '          llllllllkkk          ',
    '         lkkkkkkkkTTkkP        ',
    '        lkkkkkkkkkTRkkP        ',
    '        lkkkkkkkkkTTkkP        ',
    '        GYYGGGGGGGGGGGg        ',
    ' lllllllllllllllllllllllllllkk',
    '  PPPPPPPPPPPPPPPPPPPPPPPPPPP ',
  ]);
  return out(g);
}
