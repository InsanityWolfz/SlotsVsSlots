import { canvas, px, span, paint, layer, out } from './dealer_r4.mjs';
// THE DEALER (act 3 boss), 32x32 bust. Outline added by outline().
export function dealer32() {
  const g = canvas(32);
  // --- black dinner jacket: neck, broad shoulders sloping to both edges, centred under the head (x 13)
  const sil = { 19: [7, 19], 20: [4, 22], 21: [2, 24], 22: [0, 27], 23: [0, 31] };
  for (let y = 19; y < 32; y++) { const [a, b] = sil[y] ?? [0, 31]; span(g, y, a, b, 'k'); for (let x = a; x <= b; x++) if (g[y - 1][x] === '.') px(g, x, y, 'l'); }
  // neck, white shirt V, gold bow tie, satin lapels
  paint(g, 10, 18, ['ffffff']);
  paint(g, 9, 19, [
    'lWGTTTgtP',
    'lWGGYggtP',
    ' lGTTTgP ',
    ' llWTTtPP',
    '  llWTtP ',
    '  llWTPP ',
    '   llTP  ',
    '   llPP  ',
    '    lP   ',
  ]);
  // the left shoulder rounds toward the light; sleeve seams: both upper arms hang from their own shoulders
  for (const [x, y] of [[8, 20], [9, 20], [5, 21], [6, 21], [3, 22], [4, 22], [1, 23], [2, 23]]) px(g, x, y, 'l');
  for (let y = 24; y < 32; y++) { px(g, 3, y, 'P'); px(g, 29, y, 'P'); }
  // jacket button below the lapels' V; a gold watch chain hangs from it to the welt pocket
  px(g, 13, 28, 'G'); px(g, 13, 29, 'g');
  span(g, 27, 4, 7, 'l');
  for (const [x, y, c] of [[12, 29, 'g'], [11, 29, 'G'], [10, 30, 'g'], [9, 30, 'G'], [8, 30, 'g'], [7, 29, 'G'], [6, 29, 'g'], [5, 28, 'G']]) px(g, x, y, c);
  // --- head: slicked dark hair, green dealer's visor, broad square face, grin with a gold tooth
  paint(g, 3, 1, [
    '      kkkkkPPP     ',
    '    kllWWllkkPPP   ',
    '   klkkkkkllkkPPP  ',
    '  kkPkkPkkkkllPPPP ',
    '  kkeeeeeeeeeeeePP ',
    ' EEEEEEEEEEEEEEEeeQ',
    '  kkQQeeeeeeeeQQPP ',
    '  kkFfffffffffffPP ',
    '  kFkkkFFFFFkkkFfk ',
    '  HFWKWFFFFFWKWffh ',
    '  HFFFFFFfFFFFFffh ',
    '  FFFFFFFfFFFFFfff ',
    '  FFFfFFfffFFfFfff ',
    '  fFFKWWWYWWWKFfff ',
    '   fFFKrrrrrKFFff  ',
    '    fFFFFFFFFfff   ',
    '      fFFFFFff     ',
  ]);
  // --- forearm rising from the bottom edge in front of the chest, white cuff, hand low (below the chin)
  const A = layer('P');
  for (let y = 30; y < 32; y++) A.add(22, y, ['lkkkP']);
  A.add(22, 28, ['TTTTt', 'ttGtt']);
  A.done(g);
  // --- fan of three cards from one pivot in the fist: back card leans most, middle less, front card upright.
  // Each card: lit top/left edge, cream face, dim right edge; a dark seam on the card behind where the next one lies.
  const cards = [];
  const card = (rowsByY) => {
    const cells = new Set(); for (const [y, a, b] of rowsByY) for (let x = a; x <= b; x++) cells.add(`${x},${y}`);
    const has = (x, y) => cells.has(`${x},${y}`);
    for (const k of cells) {
      const [x, y] = k.split(',').map(Number);
      px(g, x, y, !has(x - 1, y) || !has(x, y - 1) ? 'W' : !has(x + 1, y) ? 't' : 'T');
    }
    for (const prev of cards) for (const k of prev) {
      const [x, y] = k.split(',').map(Number);
      if (!has(x, y) && (has(x + 1, y) || has(x, y + 1) || has(x + 1, y + 1))) px(g, x, y, 'P');
    }
    cards.push(cells);
  };
  const lean = (y0, y1, x0, w, step) => { const r = []; for (let y = y0; y <= y1; y++) { const x = x0 + Math.floor((y - y0) / step); r.push([y, x, x + w - 1]); } return r; };
  card(lean(19, 26, 17, 7, 2));   // back card
  card(lean(16, 26, 21, 7, 6));   // middle card
  card(lean(18, 25, 24, 7, 99));  // front card
  // a dark edge where the back card lies over the shirt and lapel
  for (const k of cards[0]) { const [x, y] = k.split(',').map(Number); if (!cards[0].has(`${x - 1},${y}`) && 'TtWgGlk'.includes(g[y][x - 1])) px(g, x - 1, y, 'P'); }
  px(g, 18, 20, 'R'); px(g, 19, 21, 'r');   // corner pip on the back card
  px(g, 22, 18, 'K'); px(g, 22, 19, 'k');   // corner pip on the middle card
  paint(g, 25, 20, ['RR RR', 'RRRRr', ' RRr ', '  r  ']); // one big heart on the front card
  // --- fist gripping the base of the fan: fingers curl round the left edge, thumb pressed flat on the front card
  paint(g, 21, 23, [
    '      Ff',
    'F    FFf',
    'fFFFFFf ',
    'FFFFFFFf',
    ' fFfFff ',
  ]);
  return out(g);
}
