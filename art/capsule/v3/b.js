// Direction B, "ON THE FLOOR": inside the casino (act 2's floor, roomCasinoFloor.ts). The game's own floor: its eye level
// and projection, its banks of machines facing you, its stools, its patrons (patrons.ts), its carpet and ceiling; the
// camera stands where the centre aisle meets a cross aisle, so the two Slot Machines have room to duel in front of the
// banks. REEL BRAWL hangs over the aisle where the floor's progressive board hangs. The room's code isn't exported
// piece by piece, so its pieces are redrawn here from the same world measures (MACH, INNER, EYE, CEIL...).
import * as K from './kit.js';
import { drawPatron, LOOKS } from '/src/render/patrons.ts';
import { BODIES, TOPS } from '/src/render/roomCasinoFloor.ts';

const { C, px, mk } = K;

// The floor's world measures (roomCasinoFloor.ts).
const EYE = 250;
const CEIL = 560;
const INNER = 150;
const MACH = 74;
const PER_BANK = 9;
const STOOL = 0.2;
/** Where a 198-high machine stands 64 pixels tall: the cabinets' own size, so the two fighters are drawn 1:1. */
const Z_HERO = 198 / 64;

const hash = (a, b) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
const shadeOf = (c, k) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * k))).toString(16).padStart(2, '0')).join('');

function floorScene(o) {
  const { W, H, FOOT } = o;
  const CX = Math.floor(W / 2);
  const HOR = FOOT - Math.round(EYE / Z_HERO);
  const xAt = (lat, z) => CX + lat / z;
  const yAt = (h, z) => HOR + (EYE - h) / z;
  const [art, g] = mk(W, H);
  const face = (z, l0, l1, h0, h1, c, grow = 0) => {
    const x0 = Math.round(xAt(l0, z)) - grow;
    const x1 = Math.round(xAt(l1, z)) + grow;
    const y0 = Math.round(yAt(h1, z)) - grow;
    const y1 = Math.round(yAt(h0, z)) + grow;
    px(g, x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0), c);
  };
  const banks = o.banks;
  const zWall = o.zWall;

  // ---- the back wall: panelled, a gold frieze, velvet drapes ---------------------------------------------------------
  px(g, 0, 0, W, H, '#0e0916');
  face(zWall, -9000, 9000, 0, CEIL, '#2a1634');
  for (let lat = -8960; lat < 9000; lat += 240) face(zWall, lat, lat + 14, 0, CEIL, '#20102a');
  for (let lat = -8700; lat < 9000; lat += 1160) face(zWall, lat, lat + 200, 0, 470, '#5a1830');
  face(zWall, -9000, 9000, 470, 492, C.g);
  face(zWall, -9000, 9000, 484, 492, C.G);

  // ---- the ceiling: coffers and rows of downlights ---------------------------------------------------------------------
  const yCeil = Math.floor(yAt(CEIL, zWall));
  for (let y = 0; y <= yCeil; y++) {
    const z = (CEIL - EYE) / (HOR - y - 0.5);
    const zn = (CEIL - EYE) / (HOR - y + 0.5);
    px(g, 0, y, W, 1, '#170d24');
    if (Math.floor(z / 1.5) !== Math.floor(zn / 1.5)) px(g, 0, y, W, 1, '#22143a');
    for (const lat of [-INNER, INNER]) px(g, xAt(lat, z), y, Math.max(1, 10 / z), 1, C.g);
    if (Math.floor(z / 1.5 + 0.5) !== Math.floor(zn / 1.5 + 0.5))
      for (let lat = -1700; lat <= 1700; lat += 340) {
        if (lat === 0) continue;
        const w = Math.max(2, Math.round(40 / z));
        px(g, xAt(lat, z) - w / 2, y, w, 1, '#ffe08a');
        px(g, xAt(lat, z) - w / 2 - 1, y + 1, w + 2, 1, '#8f5a1f');
      }
  }

  // ---- the carpet: the casino's lattice, the aisle's runner between two gold lines --------------------------------------
  for (let y = Math.ceil(yAt(0, zWall)); y < H; y++) {
    const z = EYE / (y + 0.5 - HOR);
    const zn = EYE / (y + 1.5 - HOR);
    px(g, 0, y, W, 1, '#3a1430');
    const band = Math.floor(z / 0.6);
    if (band !== Math.floor(zn / 0.6)) px(g, 0, y, W, 1, '#4e1c40');
    const u = (z / 0.6) % 1;
    const latL = (0 - CX) * z;
    const latR = (W - CX) * z;
    for (let lat = Math.floor(latL / 120) * 120 + 60; lat < latR; lat += 120) {
      const off = (band % 2 ? 60 : 0) + (u - 0.5) * 60;
      px(g, xAt(lat + off, z), y, Math.max(1, 6 / z), 1, '#4e1c40');
      if (Math.abs(u - 0.5) < 0.1) px(g, xAt(lat + (band % 2 ? 60 : 0), z), y, Math.max(1, 8 / z), 1, '#8f5a1f');
    }
    // the runner stops where the cross aisle opens (the fighters' floor)
    if (z > Z_HERO * 1.18) {
      px(g, xAt(-110, z), y, 220 / z, 1, Math.floor(z * 3) % 2 ? '#461638' : '#401434');
      for (const lat of [-110, 110]) px(g, xAt(lat, z), y, Math.max(1, 6 / z), 1, '#8f5a1f');
    }
  }
  // the pit at the aisle's end: the roulette table under its lamp, a brass strip where the carpet stops
  px(g, 0, Math.round(yAt(0, zWall - 2.4)), W, 1, C.g);
  face(zWall - 1.2, -110, 110, 0, 116, '#3a1e10');
  face(zWall - 1.2, -110, 110, 100, 116, '#1d5a3a');
  face(zWall - 1.2, -40, 40, 330, 362, C.g);
  face(zWall - 1.2, -30, 30, 322, 332, C.Yl);
  face(zWall - 1.2, -2, 2, 362, CEIL, '#3b3347');

  // ---- the banks, far to near: machines facing us, stools, players --------------------------------------------------------
  const machine = (lat0, z, m, side) => {
    const wPx = MACH / z;
    const body = shadeOf(BODIES[(m + (side < 0 ? 0 : 2)) % BODIES.length], 1.25);
    const top = shadeOf(TOPS[(m * 3 + (side < 0 ? 1 : 0)) % TOPS.length], 1.2);
    const F2 = (a, b, h0, h1, c, grow = 0) => face(z, lat0 + a, lat0 + b, h0, h1, c, grow);
    F2(0, MACH, 0, 158, C.K, 1);
    F2(0, MACH, 0, 150, body);
    F2(MACH * 0.82, MACH, 10, 150, shadeOf(body, 0.75));
    F2(0, MACH * 0.08, 10, 150, shadeOf(body, 1.3));
    F2(0, MACH, 0, 10, '#0e0a14');
    F2(0, MACH, 148, 156, C.g);
    F2(0, MACH, 153, 156, C.G);
    F2(10, MACH - 10, 156, 198, C.K, 1);
    F2(10, MACH - 10, 158, 196, top);
    F2(10, MACH - 10, 184, 196, shadeOf(top, 1.35));
    if (wPx < 7) {
      F2(8, MACH - 8, 94, 140, '#3a3450');
      return;
    }
    F2(8, MACH - 8, 92, 142, C.K);
    F2(10, MACH - 10, 94, 140, '#3a3450');
    for (let w = 0; w < 3; w++) {
      const a = 10 + (w * (MACH - 20)) / 3;
      const b = 10 + ((w + 1) * (MACH - 20)) / 3;
      const sym = ['#e8374b', '#d9a640', '#e8374b', '#4cc234'][(m * 5 + w * 3 + (side < 0 ? 0 : 1)) % 4];
      F2(a + (b - a) * 0.25, b - (b - a) * 0.25, 104, 130, sym);
      if (w) F2(a - 1, a + 1, 94, 140, C.K);
    }
    F2(8, MACH - 8, 24, 68, '#1a1426');
    F2(8, MACH - 8, 60, 68, shadeOf(top, 0.8));
    F2(4, MACH - 4, 74, 88, '#3a2d52');
    F2(4, MACH - 4, 86, 88, '#5a4d72');
    // the topper's bulbs
    for (let q = 0; q < 3; q++) {
      const x = Math.round(xAt(lat0 + 18 + q * ((MACH - 36) / 2), z));
      px(g, x, Math.round(yAt(198, z)) - 1, wPx >= 14 ? 2 : 1, wPx >= 14 ? 2 : 1, hash(m, q) > 0.35 ? C.Y : C.g);
    }
  };
  const stool = (lat, z) => {
    const S = (a, b, h0, h1, c, grow = 0) => face(z, lat + a, lat + b, h0, h1, c, grow);
    S(-16, 16, 0, 6, C.K, 1);
    S(-7, 7, 4, 66, C.K, 1);
    S(-22, 22, 64, 78, C.K, 1);
    S(-16, 16, 0, 6, '#2a2436');
    S(-7, 7, 4, 66, '#5a5268');
    S(-7, -3, 4, 66, '#8a82a0');
    S(-22, 22, 64, 78, C.d);
    S(-22, 22, 73, 78, C.r);
  };
  const drawBank = (b) => {
    const z = banks[b];
    for (const side of [-1, 1]) {
      // the bank's aisle end: the end machine's side, back along its depth
      const xa = xAt(side * INNER, z);
      const xb = xAt(side * INNER, z + 0.3);
      for (let x = Math.round(Math.min(xa, xb)); x < Math.round(Math.max(xa, xb)); x++) {
        const zc = INNER / Math.abs(x + 0.5 - CX);
        px(g, x, yAt(158, zc), 1, yAt(0, zc) - yAt(158, zc), '#1c1228');
        px(g, x, yAt(196, zc), 1, yAt(158, zc) - yAt(196, zc), '#281a34');
      }
      for (let j = 0; j < PER_BANK; j++) {
        const lat0 = side < 0 ? -INNER - (j + 1) * MACH : INNER + j * MACH;
        if (xAt(lat0 + MACH, z) < -4 || xAt(lat0, z) > W + 4) continue;
        machine(lat0, z, j + b * PER_BANK, side);
      }
      const zs = z - STOOL;
      for (let j = 0; j < PER_BANK; j++) {
        const c = side < 0 ? -INNER - (j + 0.5) * MACH : INNER + (j + 0.5) * MACH;
        if (xAt(c, zs) < -20 || xAt(c, zs) > W + 20) continue;
        stool(c, zs);
        const h = 150 / zs;
        const n = j + b * 11 + (side < 0 ? 0 : 5);
        const seat = o.seats?.[`${b}:${side}:${j}`];
        if (seat === null || h < 14) continue;
        if (!seat && hash(n, 3) >= (o.seated?.[b] ?? 0.6)) continue;
        const look = LOOKS[seat?.look ?? Math.floor(hash(n, 7) * LOOKS.length)];
        const pose = seat?.pose ?? ['button', 'lean', 'cup'][Math.floor(hash(n, 5) * 3)];
        drawPatron(g, Math.round(xAt(c, zs)), Math.round(yAt(76, zs)), h, look, pose, seat?.mirror ?? hash(n, 9) < 0.5, o.dim ?? 1);
      }
    }
  };
  // far to near: each bank, and the people standing in the cross aisles behind it, turned to watch (the staff's
  // standing poses face us; the bank in front hides their legs)
  const things = [...banks.map((z, b) => ({ z, b })), ...(o.standing ?? []).map((p) => ({ z: p[1], p }))].sort((a, b2) => b2.z - a.z);
  for (const t of things) {
    if (t.p) {
      const [lat, z, look, pose, mirror] = t.p;
      drawPatron(g, Math.round(xAt(lat, z)), Math.round(yAt(0, z)), 270 / z, look, pose, !!mirror, o.dim ?? 1);
    } else drawBank(t.b);
  }
  // the room steps back a shade (the game dims what stands behind the reels); the fight's light comes after
  g.fillStyle = `rgba(14,8,22,${o.veil ?? 0.25})`;
  g.fillRect(0, 0, W, H);
  return { art, g, CX, HOR, xAt, yAt };
}

const WAITER = { skin: '#c07a5c', hair: '#1a1014', coat: '#2a2436', legs: '#1e1a26', hairStyle: 'bun', tie: 'bow' };
const PITBOSS = { skin: '#f4c09a', hair: '#3a2416', coat: '#5a1a2a', legs: '#24202e', hairStyle: 'short', tie: 'long' };

/** The duel: the two Slot Machines on the carpet, a clash between them (KNIGHT's swords, the gold one's coins). */
function duel(s, o) {
  const { g, CX } = s;
  const FOOT = o.FOOT;
  // the clash lights the carpet between them; their shadows fall away from it
  K.glow(g, CX, FOOT - 2, 78, 13, '#180a06', [1, 0.6]);
  const knight = K.lean(K.lit(K.flip(K.knightAttacking()), { side: 1, rimK: 0.7 }), 3);
  const house = K.lean(K.lit(K.houseCrowned(), { side: -1, rimK: 0.7 }), -3);
  const KX = o.knightX - 3;
  const HX = o.houseX - 3;
  K.shadow(g, KX + 20, FOOT + 1, 30, 4, 0.8);
  K.shadow(g, HX + 34, FOOT + 1, 30, 4, 0.8);
  g.drawImage(knight, KX, FOOT - knight.height + 1);
  g.drawImage(house, HX, FOOT - house.height + 1);

  const SY = FOOT - 37;
  const sw = K.swordSprite();
  for (const [x, dy] of o.swords) {
    K.streak(g, x - 1, SY + dy + 4, 26, 1, C.Yl);
    K.streak(g, x - 1, SY + dy + 2, 16, 1, C.W);
    K.streak(g, x - 1, SY + dy + 6, 16, 1, C.G);
    g.drawImage(sw, x, SY + dy);
  }
  for (const [x, dy, f] of o.coins) {
    K.streak(g, x + 17, SY + dy + 3, 22, -1, C.Yl);
    K.streak(g, x + 17, SY + dy + 6, 14, -1, C.G);
    g.drawImage(K.sprite('coinSpin' + f), x, SY + dy - 4);
  }
  K.burst(g, CX, SY + 4, o.burst ?? 22);
  for (const [dx, dy, e] of o.bits ?? []) K.miniCoin(g, CX + dx, SY + dy, !!e);
  for (const [dx, dy] of o.glints ?? []) K.glint(g, CX + dx, SY + dy, 1, C.Yl);
}

const BANKS = [1.6, 2.2, 3.0, 4.1].map((k) => Z_HERO * k);
const L = (i, o = {}) => ({ ...LOOKS[i], ...o });

export async function main() {
  const o = { W: 247, H: 142, FOOT: 128, banks: BANKS, zWall: Z_HERO * 5.4, dim: 0.86, seated: [0, 0.55, 0.5, 0],
    // the crowd: over the first banks' toppers, in the cross aisle behind them, turned to the fight
    standing: [
      [-395, Z_HERO * 1.86, L(0), 'standR'], [-560, Z_HERO * 1.9, L(3), 'stand'], [-760, Z_HERO * 1.84, WAITER, 'tray'], [-250, Z_HERO * 1.92, L(4), 'standR'],
      [270, Z_HERO * 1.9, PITBOSS, 'standL'], [430, Z_HERO * 1.86, L(1), 'standL'], [600, Z_HERO * 1.92, L(2), 'stand'], [770, Z_HERO * 1.85, L(6), 'standL'],
    ],
    seats: {}, veil: 0.1 };
  const s = floorScene(o);
  const { g, CX } = s;
  // the sign over the aisle, on its two rods from the ceiling
  const LX = CX - 80;
  const LY = 2;
  for (const x of [LX + 30, LX + 128]) px(g, x, 0, 2, LY + 2, '#3b3347');
  K.marquee(g, LX, LY, 1);
  duel(s, { FOOT: o.FOOT, knightX: 6, houseX: 192, swords: [[57, -5], [90, 2]], coins: [[146, 3, 1], [171, -4, 0]], burst: 23,
    bits: [[-12, -24, 0], [10, -30, 1], [22, -18, 0], [-26, -12, 1], [4, 24, 0], [-18, 20, 1], [30, 14, 0]], glints: [[-34, -20], [36, -26], [-8, 30]] });
  return { canvas: s.art, px: 5, detail: [93, 66] };
}

export async function small() {
  const o = { W: 231, H: 87, FOOT: 84, banks: BANKS, zWall: Z_HERO * 5.4, standing: [], seats: {}, seated: [0, 0, 0, 0], veil: 0.3 };
  const s = floorScene(o);
  const { g, CX } = s;
  K.marquee(g, CX - 80, 1, 1);
  duel(s, { FOOT: o.FOOT, knightX: 1, houseX: 183, swords: [[58, 0]], coins: [[150, 0, 1]], burst: 16, bits: [[-12, -10, 0], [14, 14, 1], [-20, 12, 0]] });
  return { canvas: s.art, px: 2 };
}
