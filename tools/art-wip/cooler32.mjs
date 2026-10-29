import { canvas, px, span, paint, line, out } from './cooler_tools.mjs';
const seg2 = (g, y, x, str) => [...str].forEach((c, d) => px(g, x + d, y, c));
export function cooler32() {
  const g = canvas(32);
  // --- coat: hunched shoulders running off the bottom
  [[4, 27], [2, 29], [1, 30]].forEach(([a, b], i) => span(g, 22 + i, a, b, 'S'));
  for (let y = 25; y < 32; y++) span(g, y, 0, 31, 'S');
  span(g, 22, 4, 6, 'L'); span(g, 23, 2, 4, 'L'); span(g, 24, 1, 2, 'L'); px(g, 0, 25, 'L'); px(g, 0, 26, 'L');
  for (let y = 23; y < 32; y++) { px(g, 31, y, 'D'); px(g, 30, y, y > 24 ? 'D' : 'S'); }
  for (let y = 26; y < 32; y++) { px(g, 29, y, 'D'); }
  paint(g, 21, 23, ['  DD', ' DD', 'DD']); paint(g, 8, 23, ['DD', ' DD']);
  // sleeves: arms hang straight down into the pockets
  for (let y = 25; y < 32; y++) { px(g, 0, y, 'L'); if (y < 29) px(g, 1, y, 'L'); }
  line(g, 5, 26, 6, 31, 'D'); line(g, 26, 26, 25, 31, 'D');
  [[11, 20], [12, 19], [13, 18], [14, 17], [15, 16]].forEach(([a, b], i) => span(g, 24 + i, a, b, 'k'));
  line(g, 11, 25, 14, 28, 'D'); line(g, 20, 25, 17, 28, 'D');
  line(g, 16, 29, 16, 31, 'D');
  px(g, 13, 30, 'k'); px(g, 19, 30, 'k');
  // --- collar flaps
  paint(g, 5, 14, [
    ' L',
    ' LD',
    'LSDD',
    'LSDD',
    'LSDDD',
    'LSDDD',
    'LSDDDD',
    ' LSDDDD',
    '  LSDDDD',
    '   LSDDDD',
  ]);
  seg2(g, 14, 25, 'S');
  seg2(g, 15, 24, 'DS');
  seg2(g, 16, 23, 'DDSD');
  seg2(g, 17, 23, 'DDSD');
  seg2(g, 18, 22, 'DDDSD');
  seg2(g, 19, 22, 'DDDSD');
  seg2(g, 20, 21, 'DDDDSD');
  seg2(g, 21, 20, 'DDDDSD');
  seg2(g, 22, 19, 'DDDDSD');
  seg2(g, 23, 18, 'DDDDSD');
  // charcoal scarf: a thick wrap at the throat, one end tucked into the coat
  span(g, 23, 12, 19, 'k'); px(g, 12, 23, 'l'); span(g, 24, 11, 12, 'l');
  paint(g, 13, 24, ['  lK', '  lK', '  lK', '  l']);
  // --- face: long, hollow-cheeked, narrow chin
  paint(g, 10, 10, [
    'uuuuuuuuuuuu',
    'TTTHhLLhHTLu',
    'THHTTTTTTHLu',
    'TLkkkTLkkkLu',
    'TkWKWTLWKWku',
    'TTLhuTLuhLLu',
    'TTTTTTLTTLLu',
    ' TLTTMuTLuu ',
    ' TTLLuuLLuL ',
    ' TTLTTLTLLu ',
    '  TThhhhLu  ',
    '  ThLLLLhu  ',
    '   LTTLuu   ',
  ]);
  paint(g, 9, 13, ['T', 'L', 'L']); paint(g, 22, 13, ['L', 'u', 'L']);
  // --- fedora (dark steel felt): pinched crown, black band, snap brim with frost and icicles
  const seg = (y, ...a) => { for (let i = 0; i < a.length; i += 2) [...a[i + 1]].forEach((c, d) => px(g, a[i] + d, y, c)); };
  seg(1, 11, 'SSSD', 17, 'DDDk');
  seg(2, 9, 'SSSDDDkSDDDDDk');
  seg(3, 9, 'SDDDDDkSDDDDDk');
  seg(4, 9, 'SDDDDDDDDDDDDk');
  seg(5, 9, 'SDDDDDDDDDDDDk');
  seg(6, 9, 'KKKKKKKKKKKKKK');
  seg(7, 5, 'CCCSDDDDDDDDDDDDDDDDkk');
  seg(8, 3, 'CWCSSDDDDDDDDDDDDDDDDDDDkk');
  seg(9, 4, 'C', 8, 'kkkkkkkkkkkkkkkk', 27, 'C');
  seg(10, 4, 'A', 27, 'A');
  // --- frozen breath: thin at the mouth, billowing as it drifts off to the left
  paint(g, 0, 15, [
    '  CC        ',
    ' CWCC       ',
    'CCCCAC      ',
    ' AACAACC    ',
    '   A  ACCC  ',
    '        AACC',
  ]);
  return out(g);
}
