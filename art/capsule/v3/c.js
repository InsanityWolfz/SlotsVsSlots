// Direction C, "THE HOUSE FALLS": the knockout. The same door as A (door.js: the game's entrance room), a beat later:
// THE DOORMAN's gold Slot Machine goes over backwards, off its feet, its coins and its crown in the air; your KNIGHT
// hops on the red carpet; the gilded doors swing open on the casino floor and its light pours out over the wet
// pavement; the room's own jackpot confetti comes off the marquee. Why it sells: it shows the payoff (you beat the
// house and the casino opens), and a Slot Machine knocked off its feet says "these machines fight" without a word.
import * as K from './kit.js';
import { doormanSprite, doorScene, rain } from './door.js';

const { C, px } = K;

function knockout(s, o) {
  const { g, H, CX, STEP } = s;
  const FOOT = o.foot;
  // ---- THE DOORMAN at his open doors, on the top step, his eyes on his machine --------------------------------------------
  if (o.doorman !== false) {
    const dm = K.lit(doormanSprite(o.eyes ?? 2), { side: 1, rimK: 0.5, shade: 0.25 });
    K.shadow(g, CX + o.doormanX + 12, STEP + 1, 12, 2, 0.6);
    g.drawImage(dm, CX + o.doormanX, STEP - dm.height + 2);
  }

  // ---- the gold Slot Machine, going over backwards: a lean and a tilt in whole pixels (even steps along every edge), -------
  // then its outline redrawn clean
  const [ln, tl] = o.over ?? [24, -12];
  const down = K.lit(K.reoutlined(K.trim(K.tilt(K.lean(K.unoutlined(K.houseCabinet()), ln), tl))), { side: -1, rimK: 0.6 });
  const DX = o.downX;
  const DY = FOOT - down.height + 1 - (o.air ?? 3);
  K.shadow(g, DX + down.width / 2 + 4, FOOT, 30, 3, 0.9);
  K.reflect(g, down, DX, FOOT + 2, { depth: Math.min(10, H - FOOT - 2), alpha: 0.3, squash: 2 });
  g.drawImage(down, DX, DY);
  // the blow that did it: the last sword glancing off, straight up (a quarter turn), and where it struck
  if (o.blow) {
    const [bx, by, r, sword] = o.blow;
    if (sword !== false) {
      g.drawImage(K.quarter(K.swordSprite(), false), DX + bx - 16, DY + by - 34);
      for (const [dx, h] of [[-13, 7], [-11, 4], [-15, 4]]) px(g, DX + bx + dx, DY + by - 6, 1, h, C.Yl);
    }
    K.burst(g, DX + bx, DY + by, r);
  }
  // the scrape where its corner dragged, and dust
  for (const [dx, dy, w] of o.dust ?? []) {
    px(g, DX + dx, FOOT + dy, w, 2, '#6d6482');
    px(g, DX + dx + 1, FOOT + dy - 1, w - 2, 1, '#9a8fb0');
  }
  // seeing stars: three round its head
  const [sx, sy] = o.stars ?? [down.width - 6, -6];
  const HXc = DX + sx;
  const HYc = DY + sy;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    px(g, Math.round(HXc + Math.cos(a) * 14), Math.round(HYc + Math.sin(a) * 5), 1, 1, i % 3 ? C.G : C.Yl);
  }
  for (const a of [0.4, 2.5, 4.6]) {
    const x = Math.round(HXc + Math.cos(a) * 14);
    const y = Math.round(HYc + Math.sin(a) * 5);
    px(g, x - 3, y - 1, 7, 3, C.K);
    px(g, x - 1, y - 3, 3, 7, C.K);
    K.glint(g, x, y, 2, C.Y);
    px(g, x, y, 1, 1, C.W);
  }
  // its crown, off its head
  if (o.crown) {
    const cr = K.lit(K.crown(), { side: -1 });
    g.drawImage(cr, DX + o.crown[0], DY + o.crown[1]);
    for (const dx of [3, 10, 17]) px(g, DX + o.crown[0] + dx, DY + o.crown[1] + 10, 1, 3, C.Yl);
  }

  // ---- its coins, out of its tray: in the air, and across the carpet toward the winner ----------------------------------
  for (const [dx, dy, e] of o.pile) K.miniCoin(g, DX + dx, FOOT + dy, !!e);
  for (const [id, dx, dy] of o.big ?? []) g.drawImage(K.sprite(id), DX + dx, FOOT + dy);

  // ---- KNIGHT, the winner: a hop on the carpet, its three swords still on the payline -----------------------------------
  const knight = K.lit(K.flip(K.knightAttacking()), { side: 1, rimK: 0.7 });
  const KX = o.knightX;
  const HOP = o.hop ?? 5;
  K.reflect(g, knight, KX, FOOT + 1 + HOP, { depth: Math.min(11, H - FOOT - 1 - HOP), alpha: 0.4, skip: 1 });
  K.shadow(g, KX + 24, FOOT, 19, 2, 0.9);
  g.drawImage(knight, KX, FOOT - knight.height + 1 - HOP);
  for (const dx of [8, 24, 39]) px(g, KX + dx, FOOT - HOP + 2, 1, HOP - 2, C.Yl);
  for (const [dx, dy, r] of o.glints ?? []) K.glint(g, KX + dx, FOOT + dy, r, C.Yl);

  // ---- confetti, a little more than the room's own -----------------------------------------------------------------------
  const rr = K.seeded(o.seed ?? 5);
  const cols = [C.Y, C.R, C.T, C.G, C.A];
  for (let i = 0; i < (o.confetti ?? 0); i++) {
    const x = Math.floor(rr() * s.W);
    const y = Math.floor(s.LY + 46 + rr() * (FOOT - s.LY - 60));
    px(g, x, y, rr() < 0.5 ? 2 : 1, 1, cols[i % cols.length]);
  }
}

export async function main() {
  K.reseed(31);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2, open: 1, cheer: true, flood: 1 });
  knockout(s, { foot: 128, knightX: 22, doormanX: -35, downX: 170, air: 3, blow: [8, 30, 14], crown: [56, -15, 0], confetti: 46, stars: [50, 3],
    dust: [[60, -1, 5], [66, -5, 3], [48, 1, 4]],
    pile: [[-4, -30, 0], [-12, -42, 1], [-20, -24, 0], [2, -52, 0], [-9, -12, 1], [-26, -8, 0], [-32, 1, 0], [-46, -2, 1], [-58, 4, 0], [-22, 6, 1], [-42, 8, 0], [-76, 6, 1], [-96, 3, 0]],
    big: [['coinSpin0', -24, -62], ['coinSpin1', -30, -40], ['chip', -16, -22]],
    glints: [[-5, -60, 2], [52, -70, 1], [56, -40, 1], [-8, -30, 1]] });
  rain(s, 14);
  return { canvas: s.art, px: 5, detail: [150, 62] };
}

// The small capsule: the sign low over the open doors, the winner, the loser going over; nothing else.
export async function small() {
  K.reseed(32);
  const s = doorScene({ W: 231, H: 87, X0: 204, Y0: 66, logoY: 1, open: 1, flood: 1, reach: 0.8 });
  knockout(s, { foot: 82, knightX: 3, doorman: false, downX: 160, hop: 3, air: 2, blow: [8, 32, 11, false], stars: [52, 8],
    pile: [[-6, -22, 0], [-16, -30, 1], [-24, -12, 0], [-10, -5, 0], [-34, -3, 1], [-48, 1, 0], [-64, 2, 1]],
    big: [['coinSpin0', -40, -28]], glints: [[52, -66, 1]] });
  return { canvas: s.art, px: 2 };
}
