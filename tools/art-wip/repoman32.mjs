import { blank, paint, span, px, done } from './cc_tools.mjs';
// THE REPO MAN, 32x32 bust. Navy trucker cap, bored half-lidded stare, stubble, flat mouth; hi-vis orange vest with a
// reflective stripe over navy tow-company coveralls; right fist raised, a tow hook swinging from it on a chain.
export function repoman32() {
  const g = blank();
  // coveralls under everything
  for (let y = 21; y < 32; y++) { const x0 = y === 21 ? 2 : y === 22 ? 0 : 0; span(g, y, x0, 24, 'N'); }
  // vest panels (Y lit, O mid, o shadow), open down the middle over the coveralls
  for (let y = 22; y < 32; y++) { span(g, y, 0, 8, 'O'); span(g, y, 14, 23, 'O'); }
  for (let y = 22; y < 32; y++) { px(g, 0, y, 'Y'); px(g, 8, y, 'o'); px(g, 23, y, 'o'); px(g, 14, y, 'Y'); }
  span(g, 22, 1, 7, 'Y');
  span(g, 27, 0, 8, 'L'); span(g, 28, 0, 8, 'S'); span(g, 27, 14, 23, 'L'); span(g, 28, 14, 23, 'S');
  // head: cap
  paint(g, 3, 1, [
    '   UUUUUUUNN    ',
    '  UNNNNNNNNNk   ',
    ' UNNNNTTTNNNNk  ',
    ' UNNNNTOTNNNNk  ',
    ' UNNNNNNNNNNNk  ',
    'UNNNNNNNNNNNNNk ',
    'AUUUUUUUUUUUUUNk',
    'kkkkkkkkkkkkkkkk',
  ]);
  paint(g, 4, 9, [
    'ffffffffffffff',
    'FkkkkFFFFkkkkf',
    'FWKWFFFFFWKWff',
    'FffFFFfFFFfFff',
    'FFFFFFfFFFFFff',
    'FFFFFffFFFFFff',
    'FFFFFFFFFFFFff',
    'FFFkkkkkkkFFff',
    'FsFFFFFFFFFsff',
    'FFsFsFsFsFsFf ',
    ' fFsFsFsFsFf  ',
    '  ffsFsFsff   ',
  ]);
  // neck + work-shirt collar
  paint(g, 7, 21, [
    'UUFFFFfNN',
    'UNNFFfNNk',
    ' UNNfNNk ',
    '  UNNNk  ',
  ]);
  // fist (four curled fingers, thumb across), cuff, forearm in front of the shoulder
  const FISTS = {
    a: [' FFFFf ', 'FFFFFFf', 'FFFFFff', 'FfFfFff', 'fFFFfff', ' fffff '],
    b: [' FfFfF ', 'FFFFFFf', 'FFFFFff', 'ffffFff', 'FFFFfff', ' fffff '],
    c: [' FFFFf ', 'FFFFFFf', 'FfFfFff', 'FFFFFff', 'ffffFff', ' fffff '],
  };
  paint(g, 19, 3, FISTS['b']);
  paint(g, 19, 9, ['UUUUUk', 'NNNNkk']);   // rolled cuff
  for (let y = 11; y < 28; y++) paint(g, 19, y, [y < 17 ? 'UNNNk' : y < 23 ? 'UNNNNk' : 'UNNNNNk']);
  // upper arm: from the shoulder down-right behind the forearm to the elbow; the vest shows again below the arm
  paint(g, 25, 21, ['U', 'NU', 'NNU', 'NNNU', 'NNNNk', 'NNNNk', 'NNNNk', 'NNNk', 'kkk']);
  paint(g, 19, 28, ['kNNNNNk', ' kkkkk']);
  // chain from the fist, then the J hook (eye, shank, curve, point)
  paint(g, 25, 4, ['L', 'DL', ' LS', ' DL', '  LS']);
  paint(g, 25, 9, [
    '  LLS',
    '  L D',
    '  LSD',
    '   LSD',
    'L  LSD',
    'L  LSD',
    'LS LSD',
    ' LSSD',
  ]);
  paint(g, 3, 24, ['TTT', 'ttt']);   // name patch
  return done(g).map((r) => r.replace(/s/g, 'h'));
}
