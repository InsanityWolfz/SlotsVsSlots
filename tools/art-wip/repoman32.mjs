import { stamp, rows } from './helpers.mjs';
// THE REPO MAN, 32x32 bust (round 4). Literal pixels; outline() adds the outer K.
// Navy tow-company cap, bored stare, full brown beard; hi-vis orange vest over navy coveralls, the vest's reflective
// straps running over both shoulders. Right arm: shoulder -> upper arm down -> elbow (bottom) -> forearm up in front ->
// fist holding up a clipboard with a repo notice (red X).
export function repoman32() {
  const g = Array.from({ length: 32 }, () => Array(32).fill('.'));
  // body silhouette: coveralls first
  const sil = { 20: [6, 18], 21: [4, 27], 22: [1, 30] };
  for (let y = 20; y < 32; y++) { const [a, b] = sil[y] ?? [0, 31]; for (let x = a; x <= b; x++) g[y][x] = 'N'; }
  // vest panels (over the shoulders, armholes at the sides)
  const vl = { 20: [6, 9], 21: [4, 9], 22: [1, 10], 23: [0, 10], 24: [1, 10], 25: [2, 10] };
  const vr = { 20: [15, 18], 21: [15, 27], 22: [14, 30], 23: [14, 31], 24: [14, 30], 25: [14, 29] };
  for (let y = 20; y < 32; y++) {
    const [a, b] = vl[y] ?? [3, 10]; for (let x = a; x <= b; x++) g[y][x] = 'O';
    const [c, d] = vr[y] ?? [14, 28]; for (let x = c; x <= d; x++) g[y][x] = 'O';
  }
  // vest shading: lit top/left, shadow right edges
  for (let y = 20; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] === 'O') {
    const up = g[y - 1][x], lf = g[y][x - 1];
    const vest = (c) => 'OYo'.includes(c);
    if (y === 20 || !vest(up)) g[y][x] = 'Y';
    else if (x === 10) g[y][x] = 'o';
    else if (x < 10 && !vest(lf)) g[y][x] = 'Y';
  }
  // reflective straps over the shoulders
  for (let y = 20; y < 32; y++) { g[y][6] = 'L'; g[y][7] = 'S'; g[y][17] = 'L'; g[y][18] = 'S'; }
  for (let x = 0; x < 32; x++) { if ('OYoLS'.includes(g[28][x])) { g[28][x] = 'L'; g[29][x] = 'S'; } }
  // neck and the coverall collar points inside the vest's V
  stamp(g, 10, 20, [
    'fffff',
    'UfffN',
    'NUfNN',
  ]);

  for (let y = 24; y < 32; y++) if (g[y][0] === 'N') g[y][0] = 'U';
  // head
  stamp(g, 4, 1, [
    '   UUUUUUUUUUN   ',
    '  UNNNNNNNNNNNk  ',
    ' UNNNNNYYONNNNNk ',
    ' UNNNNNOOoNNNNNk ',
    ' UNNNNNNNNNNNNNk ',
    'AUUUUUUUUUUUUUUUN',
    ' kkkkkkkkkkkkkkk ',
    '  Bfffffffffffb  ',
    '  BFbbbFFFbbbfb  ',
    ' FBFfffFFFffffbf ',
    ' fBFWKWFFfWKWfbf ',
    '  BFFFFFffFFFfb  ',
    '  BFFFFFFFFFffb  ',
    '  BBBBBBBBBBBBb  ',
    '  BBBBkkkkkBBbb  ',
    '  BBBBBBBBBBBbb  ',
    '   BBBBBBBBBbb   ',
    '    BBBBBBBbb    ',
    '     bbbbbbb     ',
  ]);
  // arm: upper arm out of the right shoulder, elbow at the bottom, forearm up in front of the chest
  for (let y = 24; y < 32; y++) { g[y][27] = 'U'; for (let x = 28; x <= 31; x++) g[y][x] = 'N'; }
  for (let y = 19; y < 32; y++) {
    const o = y < 25 ? 0 : y < 29 ? 1 : 2;   // forearm leans toward the elbow below the frame
    g[y][20 + o] = 'k'; g[y][21 + o] = 'U'; for (let x = 22 + o; x <= 25 + o; x++) g[y][x] = 'N';
    if (y < 29) g[y][26 + o] = 'k';
  }
  // clipboard: board, steel clip, paper, red X
  stamp(g, 22, 3, [
    '   LLS   ',
    'wwwLLSwwB',
    'wTTDDDTTb',
    'wTtttttTb',
    'wTTTTTTTb',
    'wTRTTTRTb',
    'wTTRTRTTb',
    'wTTTRTTTb',
    'wTTRTRTTb',
    'wTRTTTRTb',
    'wTTTTTTTb',
    'wTttttTTb',
    'wTTTTTTTb',
    'Bbbbbbbbb',
  ]);
  // fist gripping the board's bottom-left corner (thumb on the front, knuckles along the edge), cuff
  stamp(g, 20, 14, [
    '  Ff  ',
    ' FFFFf',
    ' FfFfF',
    ' fffff',
    ' UUUUN',
  ]);
  return rows(g);
}
