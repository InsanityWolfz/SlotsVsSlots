/** The bosses on screen: THE HOUSE's pot, THE WHEEL's bets, THE DEALER's cards and hands (split from director.ts, 2026-11-05). */
import { UNIT } from '../core/config';
import { DEALER_HANDS, DEALER_RULES } from '../core/fight';
import { backOut, sineIn, sineInOut, sineOut } from './ease';
import { Projectile } from './fx';
import { cellCenter, COLORS, GUTTER_PANEL_Y, MACHINE_CX, MACHINE_H, MACHINE_TOP, CELL, reelWindow, W } from './layout';
import { artId } from '../render/sprites';
import { fmtNum } from '../render/text';
import type { Director, Ev } from './director';
import { BANNER_Y } from './directorPay';

/** Where your chip count sits (top left: runScreens CHIP_SPOT): swept bets fly there. */
const CHIP_COUNTER = { x: 44, y: 46 };

/** The Dealer flips a card face-up onto one of your payline cells. */
export async function lineCard(d: Director, e: Ev<'lineCard'>): Promise<void> {
  const m = d.s.machines[e.side];
  const p = cellCenter(e.side, e.reel, 1);
  d.s.sounds.click();
  d.s.sounds.coin(3);
  m.lineCard = { reel: e.reel, card: e.card, flip: 0 };
  const lc = m.lineCard;
  await d.c.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(2), onUpdate: (v) => (lc.flip = v) });
  await d.banner('BUST!', '#ff8a7a', 1.1, 0.3, `REEL ${e.reel + 1} PAYS NOTHING NEXT SPIN`, MACHINE_TOP + MACHINE_H / 2, 4);
  void p;
}

/** ALL IN: the Dealer throws its whole hand. */
export async function allInHit(d: Director, e: Ev<'allInHit'>): Promise<void> {
  d.s.gutter.allInArmed = false;
  const c = d.machineCenter(e.to);
  d.s.sounds.fanfareJackpot();
  d.hitstop(6);
  d.shake(10, 0.5);
  d.flashMachine(e.to, 1, 0.3);
  d.knockback(e.to, 14);
  d.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
  await d.popText(e.hpDamage > 0 ? `ALL IN! -${fmtNum(e.hpDamage)}` : 'ALL IN! BLOCKED', c.x, MACHINE_TOP + 60, 4, '#ff6a5a', 30, 0.5);
}

export function potPos() {
  return { x: W / 2, y: GUTTER_PANEL_Y + 54 };
}

export async function pot(d: Director, e: Ev<'pot'>): Promise<void> {
  const g = d.s.gutter;
  const dst = potPos();
  const n = Math.max(1, Math.min(9, Math.round(e.amount / UNIT)));
  const coins = Array.from({ length: n }, async (_, i) => {
    await d.c.wait(i * 0.05);
    const src = d.srcPoint(e.side, e.reels, i);
    const p = d.s.fx.add(new Projectile('coin', src.x, src.y, 2.5, false, COLORS.energy));
    await d.arc(p, dst.x + (Math.random() * 2 - 1) * 20, dst.y, 0.35, 80, sineIn);
    d.s.fx.remove(p);
    d.s.sounds.coin(i);
    g.pot = Math.min(e.total, g.pot + e.amount / n);
    d.bg(d.c.tween({ from: 1.5, to: 1, dur: 0.2, ease: backOut(3), onUpdate: (v) => (g.potPunch = v) }));
  });
  await Promise.all(coins);
  g.pot = e.total;
  if (e.reels.length) d.settle(e.side, e.reels);
}

export async function potWin(d: Director, e: Ev<'potWin'>): Promise<void> {
  const g = d.s.gutter;
  const src = potPos();
  const target = d.machineCenter(e.to);
  const playerWins = e.from === 'player';
  if (e.amount <= 0) {
    await d.popText('POT EMPTY', src.x, src.y - 30, 2, COLORS.textDim, 16, 0.2);
    return;
  }
  g.pot = e.amount + e.potLeft;
  d.s.cheer?.(playerWins);
  const big = Math.min(1, e.amount / (15 * UNIT));
  if (e.amount >= 8 * UNIT || playerWins) d.s.sounds.fanfareJackpot();
  else d.s.sounds.stingerMedium();
  d.bg(d.banner(playerWins ? 'POT STOLEN!' : 'SKIM!', playerWins ? COLORS.goldLight : '#ff6a5a', 1.2 + 0.3 * big, 0.4, `${e.amount} DAMAGE`, BANNER_Y, 4));
  const n = Math.min(24, 6 + Math.round(e.amount / UNIT));
  const coins = Array.from({ length: n }, async (_, i) => {
    await d.c.wait(i * 0.03);
    const p = d.s.fx.add(new Projectile('coin', src.x, src.y, 3, false, COLORS.energy));
    await d.arc(p, target.x + (Math.random() * 2 - 1) * 100, target.y + (Math.random() * 2 - 1) * 80, 0.4, 120, sineIn);
    d.s.fx.remove(p);
    if (i % 3 === 0) d.s.sounds.coin(i % 12);
  });
  d.bg(d.c.to(g, 'pot', e.potLeft, 0.6));
  await Promise.all(coins);
  d.hitstop(Math.round(1 + 3 * big));
  d.shake(3 + 6 * big, 0.25 + 0.3 * big);
  d.s.camera.chromaPulse(0.2 + 0.6 * big);
  d.flashMachine(e.to, 0.5 + 0.5 * big, 0.25);
  d.knockback(e.to, 6 + 10 * big);
  d.s.sounds.hit(e.amount / UNIT);
  if (playerWins && e.amount >= 8 * UNIT)
    d.s.particles.burst({ x: target.x, y: target.y - 40, count: 80, colors: ['#ffd23f', '#ffe08a', '#fff6c8'], speed: [200, 600], angle: -Math.PI / 2, spread: Math.PI, gravity: 900, life: [0.8, 1.4], size: [4, 7], kind: 'confetti' });
  d.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
  // (No "-0" when the hit lands on a machine already down or all of it is blocked: playtest 2026-11-01.)
  if (e.hpDamage > 0) d.bg(d.popText(`-${fmtNum(e.hpDamage)}`, target.x, MACHINE_TOP + 40, 8, COLORS.energy, 70, 0.5));
  await d.c.wait(0.5);
}

/** Boss phase 2: the House DOUBLES DOWN (the pot doubles). (ALL IN is the Dealer's word only.) */
export async function phase(d: Director, e: Ev<'phase'>): Promise<void> {
  const g = d.s.gutter;
  const m = d.s.machines[e.side];
  d.s.sounds.abilityFire();
  d.s.sounds.fanfareJackpot();
  d.hitstop(4);
  d.shake(8, 0.5);
  d.s.camera.chromaPulse(0.8);
  d.s.camera.flashScreen(0.4, '#ff6a5a');
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.6, onUpdate: (v) => (m.flash = v * 0.6) }));
  g.allIn = true;
  d.bg(d.banner('DOUBLE DOWN!', '#ff3a2e', 1.2, 0.5, 'THE POT DOUBLES', BANNER_Y, 4));
  const from = g.pot;
  await d.c.tween({ from, to: e.pot, dur: 0.8, ease: sineOut, onUpdate: (v) => (g.pot = v) });
  d.bg(d.c.tween({ from: 1.8, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (g.potPunch = v) }));
  await d.c.wait(0.3);
}

/** THE DEALER beat: its next hand starts with a new HP bar (2 RAISE: its hits x1.5; 3 ALL IN every 2 turns). */
export async function dealerHand(d: Director, e: Ev<'dealerHand'>): Promise<void> {
  const hud = d.s.huds[e.side];
  hud.maxHp = e.hp;
  hud.hp = hud.ghost = e.hp;
  hud.shield = 0;
  d.s.gutter.dealerHand = e.hand;
  // The table's card turns with the banner, not after it (playtest: HAND 3/3 over a BUST card).
  d.s.gutter.nextDeal = e.hand >= 3 ? 'allin' : 'card';
  if (hud.ability) {
    hud.ability = { ...hud.ability, every: e.every };
    hud.charge = 0;
    // Hand 3 goes ALL IN, not BUST (playtest: the HUD still said THE DEAL).
    hud.abilityLabel = e.hand >= 3 ? 'ALL IN' : undefined;
  }
  d.s.sounds.abilityFire();
  d.s.camera.chromaPulse(0.6);
  const rule = e.hand >= 3 ? `EVERY ${e.every} TURNS IT GOES ALL IN. IT PIERCES SHIELDS` : `ITS HITS ARE X${DEALER_RULES.raiseMul} FROM NOW ON`;
  await d.banner(`HAND ${e.hand}: ${DEALER_HANDS[e.hand - 1]}`, '#ff6a5a', 1.3, 0.6, rule, MACHINE_TOP + MACHINE_H / 2, 4);
}

// ---- THE WHEEL: PLACE YOUR BETS ------------------------------------------------------

/** Where a reel's chip stack sits: on the bottom edge of your reel (screen coordinates). */
export function stackPos(reel: number) {
  const w = reelWindow('player');
  return { x: w.x + CELL * (reel + 0.5), y: w.y + MACHINE_H - 6 };
}

export function syncTable(d: Director, bets: number[], left?: number, per?: number): void {
  const g = d.s.gutter;
  g.bets = [...bets];
  if (left !== undefined && left > 0) g.betsLeft = left;
  if (per !== undefined) g.betPer = per;
  d.bg(d.c.tween({ from: 1.5, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (g.betPunch = v) }));
}

/** PLACE YOUR BETS: chips flip off the wheel and stack on your reels. */
export async function betPlaced(d: Director, e: Ev<'betPlaced'>): Promise<void> {
  const m = d.s.machines.player;
  const from = { x: MACHINE_CX.enemy, y: MACHINE_TOP - 22 };
  if (e.ball) {
    const c = d.machineCenter('enemy');
    d.bg(d.popText(`THE BALL: +${e.reels.length} BET${e.reels.length > 1 ? 'S' : ''}`, c.x, MACHINE_TOP - 22, 2, '#ff8a7a', 16, 0.4));
  }
  const flights = e.reels.map(async (r, i) => {
    await d.c.wait(i * 0.1);
    const p = d.s.fx.add(new Projectile(artId('betChip'), from.x, from.y, 3, false, '#ff6a5a'));
    const to = stackPos(r);
    d.s.sounds.click();
    await d.arc(p, to.x, to.y - 10, 0.4, 120, sineInOut);
    d.s.fx.remove(p);
    m.bets[r] = Math.min(9, m.bets[r] + 1);
    d.s.sounds.coin(3 + i * 2);
    const k = m.betPop;
    d.bg(d.c.tween({ from: 1.7, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (k[r] = v) }));
  });
  await Promise.all(flights);
  m.bets = [...e.bets];
  syncTable(d, e.bets, e.left, e.per);
  await d.c.wait(0.1);
}

/** Your pair took the bets off its reels (a jackpot: TABLE CLEARED!): the chips fly to your chip count. */
export async function betSwept(d: Director, e: Ev<'betSwept'>): Promise<void> {
  const m = d.s.machines.player;
  const pc = d.machineCenter('player');
  if (e.table) {
    d.s.sounds.fanfareJackpot();
    d.bg(d.banner('TABLE CLEARED!', COLORS.goldLight, 1.3, 0.4, `+${e.chips} CHIP${e.chips > 1 ? 'S' : ''}`, BANNER_Y, 4));
  } else d.bg(d.popText('BETS CLEARED!', pc.x, MACHINE_TOP - 22, 3, COLORS.goldLight, 20, 0.45));
  const flights = e.reels.flatMap((r) =>
    Array.from({ length: Math.min(3, m.bets[r] || 1) }, async (_, i) => {
      await d.c.wait(i * 0.07 + r * 0.05);
      const at = stackPos(r);
      const p = d.s.fx.add(new Projectile(artId('betChip'), at.x, at.y - 10 - i * 8, 3, false, COLORS.goldLight));
      if (i === 0) m.bets[r] = 0;
      await d.arc(p, CHIP_COUNTER.x, CHIP_COUNTER.y, 0.5, 90, sineIn);
      d.s.fx.remove(p);
      d.s.sounds.coin(6 + i * 2);
    }),
  );
  for (const r of e.reels) d.s.particles.burst({ x: stackPos(r).x, y: stackPos(r).y - 14, count: 18, colors: ['#ffe08a', '#ffffff', '#d9a640'], speed: [80, 260], kind: 'spark', gravity: 300, life: [0.2, 0.45], size: [2, 4] });
  await Promise.all(flights);
  m.bets = [...e.bets];
  syncTable(d, e.bets);
}

/** NO MORE BETS: the ball drops; every chip left on your reels hits at once. */
export async function noMoreBets(d: Director, e: Ev<'noMoreBets'>): Promise<void> {
  const m = d.s.machines.player;
  const g = d.s.gutter;
  g.wheelSpeed = Math.max(g.wheelSpeed ?? 0, 16);
  // The ball rattles round, slows, drops.
  for (let i = 0; i < 6; i++) {
    d.s.sounds.click();
    await d.c.wait(0.06 + i * 0.03);
  }
  if (e.chips <= 0) {
    const c = d.machineCenter('player');
    await d.popText('NO MORE BETS: THE TABLE IS CLEAN!', c.x, MACHINE_TOP - 22, 2, COLORS.goldLight, 16, 0.5);
    syncTable(d, [0, 0, 0]);
    return;
  }
  // Every stack lights red, then bursts.
  for (let r = 0; r < 3; r++) if (m.bets[r] > 0) d.bg(d.c.tween({ from: 0, to: 1, dur: 0.25, onUpdate: (v) => (m.betGlow[r] = v) }));
  await d.c.wait(0.3);
  for (let r = 0; r < 3; r++) {
    if (m.bets[r] <= 0) continue;
    const at = stackPos(r);
    d.s.particles.burst({ x: at.x, y: at.y - 14, count: 14 + m.bets[r] * 8, colors: ['#ff3a2e', '#1a1018', '#ffffff', '#b0202e'], speed: [120, 420], kind: 'spark', gravity: 500, life: [0.25, 0.6], size: [2, 5] });
  }
  d.s.sounds.hit(e.amount / UNIT);
  d.hitstop(3);
  d.shake(4 + Math.min(8, e.chips), 0.35);
  d.flashMachine('player', 0.6, 0.2);
  d.knockback('player', 6 + Math.min(10, e.chips * 2));
  d.s.camera.chromaPulse(0.3);
  const h = d.s.huds.player;
  if (e.blocked > 0) {
    d.s.sounds.block();
    const sb = h.shieldBar();
    d.decay(h, 'shieldFlash', 1, 0.25);
    d.blockPop(sb, e.blocked);
  }
  d.damageHud('player', e.targetHp, e.targetShield, e.hpDamage);
  m.bets = [0, 0, 0];
  m.betGlow = [0, 0, 0];
  syncTable(d, [0, 0, 0]);
  const c = d.machineCenter('player');
  await d.popText(e.hpDamage > 0 ? `NO MORE BETS! -${fmtNum(e.hpDamage)}` : 'NO MORE BETS! BLOCKED', c.x, MACHINE_TOP + 60, 3, '#ff6a5a', 30, 0.5);
}

/** THE WHEEL SPINS FASTER at half HP: 3 chips a turn from now on. */
export async function wheelFast(d: Director, e: Ev<'wheelFast'>): Promise<void> {
  const g = d.s.gutter;
  g.wheelFast = true;
  g.wheelSpeed = 18;
  d.s.sounds.abilityFire();
  d.hitstop(4);
  d.shake(6, 0.4);
  d.s.camera.chromaPulse(0.6);
  d.flashMachine(e.side, 0.5, 0.4);
  const c = d.machineCenter(e.side);
  d.s.particles.burst({ x: c.x, y: MACHINE_TOP - 22, count: 50, colors: ['#ff3a2e', '#1a1018', '#ffe08a'], speed: [150, 500], kind: 'spark', gravity: 400, life: [0.4, 0.8], size: [2, 5] });
  await d.banner('THE WHEEL SPINS FASTER!', '#ff6a5a', 1.25, 0.5, `${e.per} CHIPS A TURN NOW`, BANNER_Y, 4);
}
