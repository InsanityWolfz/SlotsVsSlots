// Direction A, "AT THE DOOR": the night street ends at the casino's entrance (the game's own room, drawn 1:1: door.js);
// REEL BRAWL is the marquee over the gilded doors; on the wet pavement your KNIGHT lands a hit on THE DOORMAN's gold
// Slot Machine under the marquee's light, THE DOORMAN himself on the steps in front of his doors.
import * as K from './kit.js';
import { doormanSprite, doorScene, rain } from './door.js';

const { C, px } = K;

function fight(s, o) {
  const { g, H, CX, STEP } = s;
  // ---- THE DOORMAN on the top step, in front of his doors, his eyes on his machine ------------------------------------
  if (o.doorman !== false) {
    const dm = K.lit(doormanSprite(2), { side: -1, rimK: 0.4, shade: 0.28 });
    K.shadow(g, CX, STEP + 1, 13, 2, 0.7);
    g.drawImage(dm, CX - 12, STEP - dm.height + 2);
  }

  // ---- the two Slot Machines on the pavement ---------------------------------------------------------------------------
  const FOOT = o.foot;
  const knight = K.lean(K.lit(K.flip(K.knightAttacking()), { side: 1 }), 3);
  const house = K.lean(K.lit(o.crownOff ? K.houseCabinet() : K.houseCrowned(), { side: -1 }), 4);
  const KX = o.knightX - 3;
  const HX = o.houseX - 4;
  const HLIFT = 2;
  for (const [sp, x, lift] of [[knight, KX, 0], [house, HX, HLIFT]]) {
    K.reflect(g, sp, x, FOOT + 1 + lift, { depth: Math.min(16, H - FOOT - 1), alpha: 0.5, skip: 1 });
    K.shadow(g, x + sp.width / 2, FOOT, 25, 2, 0.9);
  }
  g.drawImage(knight, KX, FOOT - knight.height + 1);
  g.drawImage(house, HX, FOOT - house.height + 1 - HLIFT);
  if (o.crownOff) {
    // the crown, knocked off its head
    const crown = K.lit(K.crown(), { side: -1 });
    const CRX = HX + 26;
    const CRY = FOOT - house.height - 14;
    g.drawImage(crown, CRX, CRY);
    for (const dx of [3, 10, 17]) px(g, CRX + dx, CRY + 11, 1, 3, C.Yl);
  }

  // ---- the hit: swords across the doors' foot, the last one landing -----------------------------------------------------
  const sw = K.swordSprite();
  const SY = FOOT - 37;
  const hitX = o.houseX + 2;
  for (const [x, dy] of o.swords) {
    K.streak(g, x - 1, SY + dy + 4, 30, 1, C.Yl);
    K.streak(g, x - 1, SY + dy + 2, 18, 1, C.W);
    K.streak(g, x - 1, SY + dy + 6, 18, 1, C.G);
    g.drawImage(sw, x, SY + dy);
  }
  g.drawImage(sw, 0, 0, 15, 9, hitX - 26, SY, 15, 9);
  K.burst(g, hitX - 4, SY + 4, o.burst ?? 22);
  // coins knocked loose, up and away from the hit
  for (const [dx, dy, e] of o.coins) K.miniCoin(g, hitX + dx, SY + dy, !!e);
  for (const [dx, dy] of o.glints ?? []) K.glint(g, hitX + dx, SY + dy, 1, C.Yl);
}

export async function main() {
  K.reseed(11);
  const s = doorScene({ W: 247, H: 142, X0: 197, Y0: 20, logoY: 2 });
  fight(s, { foot: 128, knightX: 6, houseX: 192, swords: [[62, -2], [140, 1]], crownOff: true,
    coins: [[16, -40, 0], [34, -50, 1], [-12, -28, 0], [2, -30, 1], [-22, -10, 1], [46, -58, 0], [-18, -44, 0], [40, -22, 1]], glints: [[-30, 22], [-10, -18], [22, 26]] });
  rain(s);
  return { canvas: s.art, px: 5, detail: [160, 62] };
}

// The small capsule: the same doorway, the sign hung low over it, the two Slot Machines and the hit; nothing else.
export async function small() {
  K.reseed(12);
  const s = doorScene({ W: 231, H: 87, X0: 204, Y0: 66, logoY: 1, reach: 0.8 });
  // the steps under the sign, lit: the hit reads against them
  for (const [i, y] of [s.STEP, s.STEP + 6, s.STEP + 12].entries()) K.addRows(s.g, y, Array(6).fill([s.CX - 38 - i * 6, s.CX + 38 + i * 6]), '#2a180c');
  fight(s, { foot: 82, knightX: 1, houseX: 183, swords: [[58, 0], [104, 2]], doorman: false, burst: 16, coins: [[12, -22, 0], [-14, -12, 1], [-22, 14, 0], [-6, 20, 1]] });
  return { canvas: s.art, px: 2 };
}
