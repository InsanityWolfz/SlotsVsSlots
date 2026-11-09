/**
 * THE PATRONS (rooms v2, act 3's review 2026-11-09: the first high-roller people were flat scaled boxes, square to the
 * camera, on stick legs: "they seem like the old background art style"). Hand-drawn figures at the rooms' 2px grid, in
 * the portraits' style: the 1px #140c1c outline (`outlined`), 3-4 shades a colour, faces and hands, poses that are
 * doing something at their table rather than facing us. Shared so act 2's floor can use them too.
 *
 * Two sizes, never scaled: M (about 32 rows) for mid-distance, S (about 19) for far. A scene places each at the depth
 * where its size is right; nothing is drawn big in the foreground (a huge figure would need far more detail than the
 * style allows). Seated figures from behind sit on a high-backed chair (seat, back and legs); figures across a table
 * are drawn before its felt, which hides them from the table down.
 *
 * Ink: H/h hair, F/f skin, S/s/L suit (mid, shadow, light), T/t shirt, R/r red, G/g gold, C/c a card's face and pip,
 * W/w chair wood, V/v the chair's velvet, X/x a glass, D a drink, k dark (eyes, shoes). Each palette swaps the suit, skin
 * and hair.
 */
import { mk, outlined } from './roomEntrance';

export type PatronPose = 'back' | 'lean' | 'cards' | 'chips' | 'drink' | 'sback' | 'scards' | 'sdrink';

const POSES: Record<PatronPose, string[]> = {
  // Seated at a table, seen from behind on a high-backed chair: the back of the head, a collar, one elbow out on the felt.
  back: [
    '........hHHHHh........',
    '.......hHHHHHHh.......',
    '......hHHHHHHHHh......',
    '......HHHHHHHHHH......',
    '......HHHHHHHHHH......',
    '.....fHHHHHHHHHHf.....',
    '.....fHHHHHHHHHHf.....',
    '......HHHHHHHHHH......',
    '......hHHHHHHHHh......',
    '.......hFFFFFFh.......',
    '........fFFFFf........',
    '......TTTTTTTTTT......',
    '....LLSSTTTTTTSSLL....',
    '...LSSSSSSSSSSSSSSs...',
    '..LSSSSSSSSSSSSSSSSs..',
    '..SSSSSSSSsSSSSSSSSss.',
    '..SSSSSSSSsSSSSSSSSsss',
    '.LSSSSSSSSsSSSSSSSSs.F',
    '.SSSSSSSSSsSSSSSSSs...',
    '.sSSSSSSSSsSSSSSSSs...',
    '.WWWWWWWWWWWWWWWWWWWW.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wVvVVVVVVVvVVVVVVvVw.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wvvvvvvvvvvvvvvvvvvw.',
    '.wWWWWWWWWWWWWWWWWWWw.',
    '.w..................w.',
    '.w.w..............w.w.',
    '.w.w..............w.w.',
    '.w.w..............w.w.',
    '.ww................ww.',
  ],
  // Leaning in over the felt from behind: head forward and down, a hand reaching out.
  lean: [
    '......................',
    '.........hHHHHh.......',
    '........hHHHHHHh......',
    '.......hHHHHHHHHh.....',
    '.......HHHHHHHHHH.....',
    '......fHHHHHHHHHHf....',
    '......fHHHHHHHHHHf....',
    '.......HHHHHHHHHH.....',
    '.......hHHHHHHHHh.....',
    '....LLSShFFFFFFhSL....',
    '...LSSSSSfFFFFfSSSs...',
    '..LSSSSSSTTTTTTSSSSs..',
    '..SSSSSSSSSSSSSSSSSs..',
    '.LSSSSSSSSSsSSSSSSSss.',
    'FSSSSSSSSSSsSSSSSSSsss',
    'fSSSSSSSSSSsSSSSSSSs.s',
    '.sSSSSSSSSSsSSSSSSs...',
    '.sSSSSSSSSSsSSSSSSs...',
    '..sSSSSSSSSsSSSSSs....',
    '..sSSSSSSSSsSSSSSs....',
    '.WWWWWWWWWWWWWWWWWWWW.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wVvVVVVVVVvVVVVVVvVw.',
    '.wVVVVVVVVVVVVVVVVVVw.',
    '.wvvvvvvvvvvvvvvvvvvw.',
    '.wWWWWWWWWWWWWWWWWWWw.',
    '.w..................w.',
    '.w.w..............w.w.',
    '.w.w..............w.w.',
    '.w.w..............w.w.',
    '.ww................ww.',
  ],
  // Across the table, looking down at the cards in their hands (the felt hides them from the table down).
  cards: [
    '........hHHHHh........',
    '......hHHHHHHHHh......',
    '.....hHHHHHHHHHHh.....',
    '.....HHHFFFFFFHHH.....',
    '.....HFFFFFFFFFFH.....',
    '.....fFFFFFFFFFFf.....',
    '.....fFkkFFFFkkFf.....',
    '.....fFFFFFFFFFFf.....',
    '......FFFFffFFFF......',
    '......fFFrrrrFFf......',
    '.......fFFFFFFf.......',
    '........ffffff........',
    '......LSTTRRTTSL......',
    '....LSSSSTRRTSSSSL....',
    '...LSSSSSSTRTSSSSSs...',
    '..LSSSSFFCCCCCFFSSSs..',
    '..SSSSSFCcCCcCCFSSSs..',
    '..SSSSSSCCCCCCCSSSSs..',
    '..SSSSSSSSSSSSSSSSSs..',
    '..sSSSSSSSSSSSSSSSSs..',
  ],
  // Across the table, stacking chips, glancing aside.
  chips: [
    '........hHHHHh........',
    '......hHHHHHHHHh......',
    '.....hHHHHHHHHHHh.....',
    '.....HHHFFFFFFHHH.....',
    '.....HFFFFFFFFFFH.....',
    '.....fFFFFFFFFFFf.....',
    '.....fFFkFFFFFkFf.....',
    '.....fFFFFFFFFFFf.....',
    '......FFFFffFFFF......',
    '......fFFFrrrFFf......',
    '.......fFFFFFFf.......',
    '........ffffff........',
    '......LSTTkkTTSL......',
    '....LSSSSTkkTSSSSL....',
    '...LSSSSSSTkTSSSSSs...',
    '..LSSSSSSSSSSSSFFSSs..',
    '..SSSSSSSSSSSFFGGSSs..',
    '..SSSSSSSSSSSSSRRSSs..',
    '..SSSSSSSSSSSSSGGSSs..',
    '..sSSSSSSSSSSSSSSSSs..',
  ],
  // Standing by a table, a cocktail in hand, turned to watch the play (faces right; flipped to face left).
  drink: [
    '.....hHHHHh.....',
    '....hHHHHHHh....',
    '...hHHHHHHHHh...',
    '...HHHHFFFFFH...',
    '...HHHFFFFFFF...',
    '...HHFFFFkFFF...',
    '...fHFFFFFFFFF..',
    '...fHFFFFFFFf...',
    '....fFFFFrrF....',
    '.....fFFFFf.....',
    '......ffff......',
    '....TTTTRTTT....',
    '..LSSSTTRTTSSL..',
    '.LSSSSSTRTSSSSs.',
    '.SSSSSSTRTSSSFFX',
    '.SSSSSSSTSSSSFDX',
    '.SSSSSSSSSSSSSXx',
    '.SSSSSSSSSSSSS.x',
    '.sSSSSSSSSSSSs..',
    '.sSSSSSSSSSSSs..',
    '..SSSSSSSSSSSs..',
    '..ssssssssssss..',
    '..SSSSS.SSSSSs..',
    '..SSSSS.SSSSSs..',
    '..SSSSS.SSSSs...',
    '..SSSSS.SSSSs...',
    '..sSSSs.SSSSs...',
    '..sSSSs.sSSSs...',
    '..sSSSs.sSSSs...',
    '..sSSSs.sSSSs...',
    '..kkkkk.kkkkk...',
    '.kkkkkk.kkkkkk..',
  ],
  // The far sizes: a seated back on its chair, a player across the felt with cards, a standing onlooker with a drink.
  sback: [
    '....hHHh....',
    '...hHHHHh...',
    '...HHHHHH...',
    '..fHHHHHHf..',
    '...HHHHHH...',
    '....fFFf....',
    '..LSTTTTSL..',
    '.LSSSSSSSSs.',
    '.SSSSSSSSSss',
    '.SSSSSsSSSs.',
    '.sSSSSsSSSs.',
    '.WWWWWWWWWW.',
    '.wVVVVVVVVw.',
    '.wVVVVVVVVw.',
    '.wvvvvvvvvw.',
    '.wWWWWWWWWw.',
    '.w........w.',
    '.w.w....w.w.',
    '.ww......ww.',
  ],
  scards: [
    '....hHHh....',
    '...hHHHHh...',
    '...HFFFFH...',
    '...fFkkFf...',
    '...fFFFFf...',
    '....fFFf....',
    '..LSTRRTSL..',
    '.LSSSTRTSSs.',
    '.SSSFCCFSSs.',
    '.SSSSCcSSSs.',
    '.sSSSSSSSSs.',
  ],
  sdrink: [
    '...hHh...',
    '..hHHHh..',
    '..HFFFF..',
    '..fFkFF..',
    '...fFf...',
    '..TTRT...',
    '.LSTRTSs.',
    '.SSSTSSFX',
    '.SSSSSSSx',
    '.sSSSSSs.',
    '.ssssssss',
    '.SSS.SSs.',
    '.SSS.SSs.',
    '.SSS.SSs.',
    '.sSs.sSs.',
    '.sSs.sSs.',
    '.kkk.kkk.',
  ],
};

/** The palettes: [suit mid, shadow, light], [skin, skin shadow], [hair, hair light]. */
const SUITS: [string, string, string][] = [
  ['#3b3347', '#2a2238', '#4f4660'],
  ['#1f2a44', '#151d33', '#2c3b5e'],
  ['#4a1830', '#36101f', '#5e2440'],
  ['#22302a', '#18221d', '#2e4238'],
  ['#33261a', '#241a10', '#463420'],
  ['#2a2238', '#1a1426', '#3b3347'],
];
const SKINS: [string, string][] = [
  ['#f4c09a', '#c07a5c'],
  ['#c98f58', '#8f5a3a'],
  ['#8a5a3a', '#5a3a24'],
];
const HAIRS: [string, string][] = [
  ['#140c1c', '#3b3347'],
  ['#5a311c', '#8f5a3a'],
  ['#c8bddb', '#f4eee0'],
  ['#2a1a10', '#5a3a24'],
  ['#8f5a1f', '#d9a640'],
];
export const PATRON_PALETTES = SUITS.length * SKINS.length * HAIRS.length;

const FIXED: Record<string, string> = {
  T: '#f4eee0',
  t: '#c8bddb',
  R: '#e8374b',
  r: '#8e1f3a',
  G: '#d9a640',
  g: '#8f5a1f',
  C: '#f4eee0',
  c: '#e8374b',
  W: '#5a3a22',
  w: '#3a2014',
  V: '#8e1f3a',
  v: '#561530',
  X: '#b4f4ff',
  x: '#2ea8cc',
  D: '#f07c1c',
  k: '#140c1c',
};

const cache = new Map<string, HTMLCanvasElement>();
/** A patron's sprite (outlined), palette `pal` (any integer), mirrored if `flip`. */
export function patron(pose: PatronPose, pal: number, flip = false): HTMLCanvasElement {
  const key = `${pose}:${pal}:${flip ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = Math.abs(Math.floor(pal));
  const [S, s, L] = SUITS[p % SUITS.length];
  const [F, f] = SKINS[Math.floor(p / SUITS.length) % SKINS.length];
  const [H, h] = HAIRS[Math.floor(p / (SUITS.length * SKINS.length)) % HAIRS.length];
  const ink: Record<string, string> = { ...FIXED, S, s, L, F, f, H, h };
  const rows = POSES[pose];
  const w = Math.max(...rows.map((r) => r.length));
  const c = outlined(w, rows.length, (g) =>
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === '.' || !ink[ch]) return;
        g.fillStyle = ink[ch];
        g.fillRect(flip ? w - 1 - x : x, y, 1, 1);
      }),
    ),
  );
  cache.set(key, c);
  return c;
}

/** Draw a patron with its feet (or its cut) at `yBottom`, centred on `x`. */
export function drawPatron(g: CanvasRenderingContext2D, pose: PatronPose, x: number, yBottom: number, pal: number, flip = false): void {
  const c = patron(pose, pal, flip);
  g.drawImage(c, Math.round(x - c.width / 2), Math.round(yBottom - c.height));
}

/** A dark high-backed chair seen from behind, for a foreground corner (a silhouette: rim light, tufting, no person). */
export function chairSilhouette(w: number, h: number): HTMLCanvasElement {
  const [c, g] = mk(w, h);
  const r = Math.round(w * 0.18);
  for (let y = 0; y < h; y++) {
    const inset = y < r ? Math.round(r - Math.sqrt(Math.max(0, r * r - (r - y) * (r - y)))) : 0;
    g.fillStyle = '#140a12';
    g.fillRect(inset, y, w - inset * 2, 1);
    g.fillStyle = y < 2 ? '#3a1e2a' : '#1c0e18';
    g.fillRect(inset, y, 1, 1);
    g.fillRect(w - inset - 1, y, 1, 1);
  }
  g.fillStyle = '#3a1e2a';
  g.fillRect(r, 0, w - r * 2, 1);
  g.fillStyle = '#22121c';
  for (let y = 10; y < h - 10; y += 12) for (let x = 8 + ((y / 12) % 2) * 6; x < w - 8; x += 12) g.fillRect(x, y, 2, 2);
  return c;
}
