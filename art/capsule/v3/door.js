// The casino's door, as a capsule scene (directions A and C share it): the game's own entrance room (roomEntrance.ts)
// drawn 1:1 and windowed, REEL BRAWL in place of the canopy's CASINO, and the marquee's and the doors' light put on the
// stone, the steps and the wet pavement. The directions add the fight.
import * as K from './kit.js';
import { DOORMAN, DOORMAN_EYES, DOORMAN_INK, drawEntrance, entranceCheer, entranceReset, entranceUpdate } from '/src/render/roomEntrance.ts';

const { C, px, mk } = K;

/** The room's own measures (roomEntrance.ts), in its art pixels. */
export const ROOM = { cx: 320, ground: 145, step: 126, doorTop: 58, wallTop: 19, wallBase: 133 };

/** The entrance room at its own art size (640x360), lights up, THE DOORMAN away (the capsule places him). `open` 0..1:
 * the doors (shut, or open on the casino floor); `cheer`: the room's own jackpot confetti off the canopy. */
function entranceArt(open, cheer) {
  const [room, rg] = mk(640, 360);
  entranceReset();
  rg.scale(0.5, 0.5);
  const o = { pot: 400, foeHp: open > 0 ? 0.5 - open * 0.5 : 1, turn: 'player', time: 3.34, away: true };
  // the room eases toward its state (the pot's light, the doors): run it there, and let the hit's sparks die
  for (let i = 0; i < 150; i++) drawEntrance(rg, o);
  for (let i = 0; i < 40; i++) entranceUpdate(0.25);
  if (cheer) {
    entranceCheer(true);
    for (let i = 0; i < 26; i++) entranceUpdate(0.05);
  }
  rg.clearRect(0, 0, 1280, 720);
  drawEntrance(rg, o);
  return room;
}

/** THE DOORMAN's figure (the room's own rows and inks). `eyes`: 0 at you, 1 to his right (our left), 2 to his left. */
export function doormanSprite(eyes = 0) {
  return K.outlined(DOORMAN[0].length, DOORMAN.length, (c) =>
    DOORMAN.forEach((row, y) => [...(y === 8 ? DOORMAN_EYES[eyes] : row)].forEach((ch, x) => ch !== '.' && px(c, x, y, 1, 1, DOORMAN_INK[ch]))),
  );
}

/**
 * The marquee's and the doors' light on the stone, block by block (the room's ashlar: 22x11 blocks, staggered): a
 * block is lit whole, in steps by its distance from the sign, so the light has the wall's own shape (no soft pool).
 */
function lightWall(g, X0, Y0, sign, reach = 1) {
  const near = (x, y) => {
    const dx = Math.max(sign.x - x, 0, x - (sign.x + sign.w));
    const dy = Math.max(sign.y - y, 0, y - (sign.y + sign.h));
    return Math.hypot(dx, dy * 1.25) / reach;
  };
  const add = (x, y, w, h, n, col = '#1a0b0e') => {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = col;
    for (let i = 0; i < n; i++) g.fillRect(x - X0, y - Y0, w, h);
    g.restore();
  };
  const level = (d) => (d < 14 ? 4 : d < 34 ? 3 : d < 62 ? 2 : d < 96 ? 1 : 0);
  for (let y = ROOM.wallTop, row = 0; y < ROOM.wallBase; y += 11, row++)
    for (let x = row % 2 ? -11 : 0; x < 640; x += 22) {
      // (not the entrance's own surround or the doors: they have their own light)
      if (x + 22 > 274 && x < 366 && y + 11 > 52) continue;
      const n = level(near(x + 11, y + 5));
      if (n) add(x + 1, y + 1, 21, Math.min(10, ROOM.wallBase - y - 1), n);
    }
  // the base course, in its own 44px stones
  for (let x = 0; x < 640; x += 44) {
    if (x + 44 > 272 && x < 368) continue;
    const n = level(near(x + 22, ROOM.wallBase + 6) * 0.8);
    if (n) add(x + 1, ROOM.wallBase + 1, 43, 11, n);
  }
}

/**
 * Draw the doorway into a W x H art canvas: the room from (X0, Y0), the sign's top at `logoY`.
 * `open` 0..1 the doors; `cheer` the room's confetti; `flood` 0..1 how much light pours out of the open doors.
 */
export function doorScene(o) {
  const { W, H, X0, Y0 } = o;
  const GROUND = ROOM.ground - Y0;
  const STEP = ROOM.step - Y0;
  const CX = ROOM.cx - X0;
  const [art, g] = mk(W, H);
  const room = entranceArt(o.open ?? 0, !!o.cheer);
  g.drawImage(room, -X0, -Y0);
  // (the pilasters' gold capitals would poke out over the sign: their shafts carried up instead)
  for (const x of [250, 374]) for (let y = 19; y < 24; y++) g.drawImage(room, x, 100, 18, 1, x - X0, y - Y0, 18, 1);
  // (and the room's crown crest sits where the sign goes: plain stone from six blocks along instead)
  g.drawImage(room, 136, 16, 106, 12, 268 - X0, 16 - Y0, 106, 12);

  const LX = CX - 80;
  const LY = o.logoY;
  lightWall(g, X0, Y0, { x: LX + X0, y: LY + Y0, w: 160, h: 44 }, o.reach ?? 1);
  const flood = o.flood ?? 0;
  if (flood > 0) {
    // the open doors: the casino's light, warmest in the doorway, on the surround and down the steps
    const dy = ROOM.doorTop - Y0;
    K.addRows(g, dy, Array.from({ length: 68 }, () => [CX - 34, CX + 34]), '#2a1206');
    K.addRows(g, dy + 20, Array.from({ length: 48 }, () => [CX - 26, CX + 26]), '#2a1608');
    K.addRows(g, dy + 40, Array.from({ length: 28 }, () => [CX - 16, CX + 16]), '#2a1a0a');
    for (const [i, y] of [STEP, STEP + 6, STEP + 12].entries()) K.addRows(g, y, [[CX - 30 - i * 6, CX + 30 + i * 6], [CX - 30 - i * 6, CX + 30 + i * 6]], '#40280e');
  }
  // the doors' and the sign's light across the wet pavement: a fan toward us, in three steps
  const fan = (k, col) => K.addRows(g, GROUND + 1, Array.from({ length: H - GROUND }, (_, i) => [CX - 46 * k - i * 3 * k, CX + 46 * k + i * 3 * k]), col);
  fan(2.1, '#0c0610');
  fan(1.3, flood > 0 ? '#1c0c0c' : '#120810');
  fan(0.7, flood > 0 ? '#2e1808' : '#1a0c0a');
  // the sign's bulbs mirrored in the wet slabs: short gold and red dashes under it
  const rnd = K.seeded(7);
  for (let y = GROUND + 3; y < H; y += 2)
    for (let n = 0; n < 9; n++) {
      const x = LX + 4 + Math.floor(rnd() * 150);
      const w = 2 + Math.floor(rnd() * 5);
      g.globalAlpha = 0.1 + 0.14 * rnd();
      px(g, x, y, w, 1, rnd() < 0.7 ? C.Yl : C.R);
    }
  g.globalAlpha = 1;

  // the marquee, and its shadow on the wall and the doors' head
  // (`sign: false`: the caller hangs its own, e.g. the narrower one a coarse grid needs)
  if (o.sign !== false) {
    g.globalAlpha = 0.6;
    px(g, LX + 2, LY + 44, 156, 3, C.K);
    g.globalAlpha = 1;
    K.marquee(g, LX, LY, 1);
  }
  return { art, g, W, H, CX, GROUND, STEP, LX, LY };
}

/** Rain over the scene, but not under the sign (the room's own: 1x4 streaks). */
export function rain(s, n = 26, seed = 21) {
  const { g, W, H, LX, LY, GROUND } = s;
  const rr = K.seeded(seed);
  g.fillStyle = '#7f8fc0';
  g.globalAlpha = 0.3;
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rr() * W);
    const y = Math.floor(rr() * H);
    if (x > LX - 4 && x < LX + 164 && y > LY - 5 && y < GROUND - 10) continue;
    g.fillRect(x, y, 1, 4);
  }
  g.globalAlpha = 1;
}
