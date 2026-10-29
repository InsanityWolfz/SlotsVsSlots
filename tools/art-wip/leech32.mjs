import { canvas, paint, layer, out } from './leech_r4.mjs';
// THE LEECH, 32x32 bust (round 4). Outline added by outline().
// Skin keys: 1 lit, 2 mid, 3 cool clammy shadow, 4 deep shadow, 5 dark circles.
export const SKIN = { 1: 'T', 2: 'F', 3: 'u', 4: 'f', 5: 'f' };
export function leech32(skin = SKIN) {
  const g = canvas(32);
  const sk = (rs) => rs.map((r) => r.replace(/[1-5]/g, (d) => skin[d]));
  // --- borrowed tuxedo: neck, then drooping shoulders, symmetric, off the bottom
  paint(g, 0, 18, [
    '             fffff              ',
    '        llkTTTTTTTTTkkkk        ',
    '     lllkkkTTTTTTTTTkkkkkkk     ',
    '   llkkkkkkPTTTTTTTPkkkkkkkkk   ',
    '  llkkkkkkkPPTTTTTPPkkkkkkkkkk  ',
    ' lkkkkkkkkkPlPTTTPlPkkkkkkkkkkk ',
    'lkkkkkkkkkkPllPTPllPkkkkkkkkkkkk',
    'lkkkkkkkkkkPlllTlllPkkkkkkkkkkkk',
    'lkkkkkkkkkkkPllKllPkkkkkkkkkkkkk',
    'lkkkkkkkkkkkPllTllPkkkkkkkkkkkkk',
    'lkkkkkkkkkkkkPlKlPkkkkkkkkkkkkkk',
    'lkkkkkkkkkkkkPlTlPkkkkkkkkkkkkkk',
    'lkkkkkkkkkkkkkPPPkkkkkkkkkkkkkkk',
    'lkkkkkkkkkkkkkkPkkkkkkkkkkkkkkkk',
  ]);
  // bow tie
  paint(g, 12, 19, ['RRTTTRr', 'RRrRrrr', 'RrTTTrr']);
  // --- head
  paint(g, 7, 1, sk([
    '.....kkkkkkk.....',
    '...kklllllkkkk...',
    '..kkkkkkkllllkk..',
    '..klllllkkkkkkk..',
    '..k11222k22222k..',
    '..k112k222k223k..',
    '..k2kk22222kk3k..',
    '.222WKW222WKW234.',
    '.222555213555234.',
    '..2222221322223..',
    '..2222234422223..',
    '..2K222222222K3..',
    '..22KKKKKKKKK23..',
    '...2KTTTTTTTK3...',
    '...22K44444K33...',
    '....222222233....',
    '.....2222233.....',
  ]));
  // a bead of sweat at his temple: clammy
  paint(g, 20, 5, ['A', 'W']);
  // --- his left arm: upper arm hangs from his own shoulder (seam), elbow below the frame,
  // forearm rises up-left in front of the chest, white cuff, open hand palm-up asking for chips
  paint(g, 23, 21, ['P', 'P', 'P', ' P', ' P', ' P', ' P', ' P', ' P', ' P', ' P']);
  paint(g, 7, 21, [' P', ' P', ' P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']); // his right sleeve seam, mirrored
  const A = layer();
  for (let i = 0; i < 5; i++) A.add(24 + i, 27 + i, ['llkkP']);
  A.add(23, 25, [' TTI', 'TTTTI']);
  A.add(16, 22, sk([
    '     12  ',
    '12  122  ',
    '211111122',
    '24242222 ',
    ' 444444  ',
  ]));
  A.done(g);
  return out(g);
}
