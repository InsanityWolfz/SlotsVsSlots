import { canvas, px, span, paint, line, out } from './cooler_tools.mjs';
const seg = (g, y, ...a) => { for (let i = 0; i < a.length; i += 2) [...a[i + 1]].forEach((c, d) => px(g, a[i] + d, y, c)); };
export function cooler24() {
  const g = canvas(24);
  // --- coat: hunched shoulders, arms hanging into the pockets
  span(g, 17, 3, 20, 'S'); span(g, 18, 1, 22, 'S');
  for (let y = 19; y < 24; y++) span(g, y, 0, 23, 'S');
  span(g, 17, 3, 4, 'L'); span(g, 18, 1, 3, 'L'); for (let y = 19; y < 24; y++) px(g, 0, y, 'L'); px(g, 1, 19, 'L');
  for (let y = 18; y < 24; y++) { px(g, 23, y, 'D'); if (y > 18) px(g, 22, y, 'D'); }
  line(g, 4, 20, 5, 23, 'D'); line(g, 19, 20, 18, 23, 'D');
  // scarf in the coat's V, lapel shadows, buttons
  span(g, 19, 9, 14, 'k'); px(g, 9, 19, 'l');
  span(g, 20, 9, 14, 'k'); span(g, 21, 10, 13, 'k'); span(g, 22, 11, 12, 'k'); px(g, 9, 20, 'l');
  seg(g, 20, 11, 'lK'); seg(g, 21, 11, 'lK');
  line(g, 9, 21, 10, 22, 'D'); line(g, 14, 21, 13, 22, 'D'); px(g, 12, 23, 'D');
  px(g, 10, 23, 'k'); px(g, 14, 23, 'k');
  // --- collar flaps standing up behind the jaw
  seg(g, 12, 4, 'L', 19, 'S');
  seg(g, 13, 4, 'LD', 18, 'DS');
  seg(g, 14, 3, 'LSDD', 17, 'DDSD');
  seg(g, 15, 3, 'LSDD', 17, 'DDSD');
  seg(g, 16, 3, 'LSDDD', 16, 'DDDSD');
  seg(g, 17, 4, 'LSDDD', 15, 'DDDSD');
  seg(g, 18, 5, 'LSDDD', 14, 'DDDSD');
  // --- face: long, hollow-cheeked, chin sunk in the scarf
  paint(g, 7, 9, [
    'uuuhuuhuuu',
    'THHTTTTHHu',
    'TkkkTLkkku',
    'TWKWTLWKWu',
    'TLuuTLuuLu',
    'TTTLMuTLuu',
    ' TLTTuLuu ',
    ' TThhhhLu ',
    '  hLLLLu  ',
    '   LTuu   ',
  ]);
  px(g, 6, 11, 'T'); px(g, 6, 12, 'L'); px(g, 17, 11, 'L'); px(g, 17, 12, 'u');
  // --- fedora: pinched crown, black band, snap brim with frost and icicles
  seg(g, 1, 8, 'SSD', 13, 'DDk');
  seg(g, 2, 7, 'SSSDkSDDDk');
  seg(g, 3, 7, 'SDDDkSDDDk');
  seg(g, 4, 7, 'SDDDDDDDDk');
  seg(g, 5, 7, 'KKKKKKKKKK');
  seg(g, 6, 4, 'CCSDDDDDDDDDDDkk');
  seg(g, 7, 2, 'CWCSDDDDDDDDDDDDDDkk');
  seg(g, 8, 3, 'C', 6, 'kkkkkkkkkkkk', 20, 'C');
  // --- frozen breath: thin at the mouth, billowing off to the left
  seg(g, 12, 1, 'CC');
  seg(g, 13, 0, 'CWCC');
  seg(g, 14, 1, 'AA CC');
  seg(g, 15, 5, 'ACC');
  seg(g, 16, 7, 'AC');
  return out(g);
}
