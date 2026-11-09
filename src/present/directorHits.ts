/** Hits, blocks and heals, RABBIT'S FOOT, a machine going down and the fight's end banner (split from director.ts, 2026-11-05). */
import { UNIT } from '../core/config';
import { backOut, cubicIn, sineIn, sineInOut, sineOut } from './ease';
import { Banner, Bubble, Projectile } from './fx';
import { cellCenter, COLORS, H, MACHINE_TOP, W } from './layout';
import { artId, type SpriteId } from '../render/sprites';
import { fmtNum } from '../render/text';
import { RELICS } from '../core/relics';
import type { Director, Ev } from './director';
import { BANNER_Y } from './directorPay';

export async function attack(d: Director, e: Ev<'attack'>): Promise<void> {
  const color = d.tierColor();
  await d.activate(e.from, e.reels, '#ffffff');
  const target = d.machineCenter(e.to);
  const dir = e.to === 'enemy' ? 1 : -1;
  const big = d.lastScore?.tier === 'triple';

  // THE DROP: a note flies from every lit cell (the rest of the attacks throw swords).
  const drop = e.from === 'player' ? d.dropCells : null;
  d.dropCells = null;
  const srcReels = drop?.length ? drop : e.reels.length ? e.reels : [-1];
  const flights = srcReels.map(async (_r, i) => {
    await d.c.wait(i * (drop ? 0.04 : 0.08));
    const from = drop ? cellCenter(e.from, drop[i].reel, drop[i].row) : d.srcPoint(e.from, e.reels, i);
    const scale = drop ? 3 : (big && i === e.reels.length - 1) || !e.reels.length ? 6 : 4;
    const p = d.s.fx.add(new Projectile(drop ? artId('note') : 'swordProjectile', from.x, from.y - 14, scale, dir < 0, '#dfe6f0'));
    p.rot = dir > 0 ? -0.5 : 0.5;
    d.s.sounds.whoosh();
    const tx = target.x - dir * 40 + (Math.random() * 2 - 1) * 30;
    const ty = target.y + (i - (srcReels.length - 1) / 2) * (drop ? 20 : 50);
    d.bg(d.c.tween({ from: p.rot, to: 0, dur: 0.3, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, tx, ty, 0.3, 70, cubicIn);
    d.s.fx.remove(p);
    // Per-projectile impact. One white flash a hit, on the first sword (each sword flashing strobed: QA UI-04).
    if (i === 0) d.flashMachine(e.to, 0.8, 0.12);
    d.knockback(e.to, 4 + Math.min(10, e.amount / UNIT));
    d.s.particles.burst({ x: tx, y: ty, count: 16, colors: ['#ffffff', '#ffe08a', '#dfe6f0'], speed: [150, 500], kind: 'spark', gravity: 300, life: [0.15, 0.35], size: [2, 4] });
    d.s.sounds.hit(e.amount / UNIT / Math.max(1, srcReels.length));
    d.shake(Math.min(2 + e.amount / UNIT, 9), 0.25);
  });
  await Promise.all(flights);
  if (e.amount >= 4 * UNIT) d.hitstop(e.amount >= 9 * UNIT ? 3 : 1);

  const h = d.s.huds[e.to];
  if (e.blocked > 0) {
    d.s.sounds.block();
    const sb = h.shieldBar();
    d.decay(h, 'shieldFlash', 1, 0.25);
    d.decay(h, 'shieldShake', 5, 0.3);
    d.s.particles.burst({ x: sb.x + 30, y: sb.y + 8, count: 20, colors: [COLORS.shield, '#ffffff', '#9fd0ff'], speed: [100, 350], kind: 'spark', gravity: 200, life: [0.2, 0.4] });
    d.blockPop(sb, e.blocked);
  }
  d.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
  if (e.note === 'pierce') d.bg(d.popText('PIERCE!', target.x + 90, MACHINE_TOP - 22, 2, '#bff4ff', 14, 0.35));
  if (e.note === 'drain') d.bg(d.popText('DRAIN!', target.x - 90, MACHINE_TOP - 22, 2, '#ff5a7a', 14, 0.35));
  if (e.note === 'mimic') d.bg(d.popText('COPYCAT!', target.x - 90, MACHINE_TOP - 22, 2, '#ffb0ff', 14, 0.35));
  if (e.note === 'echo') d.bg(d.popText('ECHO!', target.x + 90, MACHINE_TOP - 22, 2, '#fff27a', 14, 0.35));
  if (e.hpDamage > 0) d.bg(d.popText(`-${fmtNum(e.hpDamage)}`, target.x, MACHINE_TOP + 40, d.tierScale(), color, 60));
  // (Higher than the damage numbers: a blocked hit then a landed one in the same spin read BLC-10D!.)
  else d.bg(d.popText('BLOCKED!', target.x, MACHINE_TOP + 2, 3, '#9fd0ff', 40));
  d.settle(e.from, e.reels);
  await d.c.wait(0.25);
}

export async function shieldGain(d: Director, e: Ev<'shieldGain'>): Promise<void> {
  if (e.side === 'player' && !e.reels.length) {
    // Saved chips paying out as shield vs the House.
    const h = d.s.huds.player;
    const sb = h.shieldBar();
    const chip = d.s.fx.add(new Projectile('chipShield', sb.x + 20, sb.y - 30, 0));
    d.s.sounds.coin(5);
    d.s.sounds.shieldGain(e.amount / UNIT);
    await d.c.tween({ from: 0, to: 3, dur: 0.2, ease: backOut(3), onUpdate: (v) => (chip.scale = v) });
    d.bg(d.popText(`CHIPS +${e.amount} SHIELD`, sb.x + sb.w / 2 + 20, sb.y - 30, 2, '#9fd0ff', 12, 0.4));
    d.decay(h, 'shieldFlash', 1, 0.3);
    await d.c.to(h, 'shield', e.total, 0.25, sineOut);
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (chip.alpha = v) }).then(() => d.s.fx.remove(chip)));
    return;
  }
  await d.activate(e.side, e.reels, COLORS.shield);
  const h = d.s.huds[e.side];
  const sb = h.shieldBar();
  const hops = e.reels.map(async (r, i) => {
    await d.c.wait(i * 0.06);
    const from = cellCenter(e.side, r, 1);
    const p = d.s.fx.add(new Projectile('shield', from.x, from.y - 14, 2.5, false, COLORS.shield));
    // Into the shield icon left of the bar, never over its number (playtest: the icons hid it).
    await d.arc(p, sb.x - 12, sb.y + sb.h / 2, 0.28, 40, sineInOut);
    d.s.fx.remove(p);
    d.s.particles.burst({ x: p.x, y: p.y, count: 8, colors: [COLORS.shield, '#ffffff'], speed: [60, 200], gravity: 0, life: [0.2, 0.4], size: [2, 4] });
  });
  await Promise.all(hops);
  d.s.sounds.shieldGain(e.amount / UNIT);
  d.decay(h, 'shieldFlash', 1, 0.3);
  d.bg(d.c.to(h, 'shield', e.total, 0.25, sineOut));
  // Right-aligned inside the HUD (at 3x a big number spilled past its border).
  const gain = `+${e.amount}`;
  d.bg(d.popText(gain, sb.x + sb.w - 6 - gain.length * 7.5, sb.y + sb.h / 2, 2.5, '#9fd0ff', 16, 0.3));
  const c = d.machineCenter(e.side);
  const bubble = d.s.fx.add(new Bubble(c.x, c.y, '#7fc0ff'));
  d.bg(
    d.c
      .tween({
        dur: 0.55,
        ease: sineOut,
        onUpdate: (v) => {
          bubble.r = 170 + 30 * v;
          bubble.alpha = 0.9 * (1 - v);
        },
      })
      .then(() => d.s.fx.remove(bubble)),
  );
  d.settle(e.side, e.reels);
  await d.c.wait(0.2);
}

export async function death(d: Director, e: Ev<'death'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.hitstop(8);
  d.s.sounds.death();
  d.shake(9, 0.8);
  d.s.camera.flashScreen(0.6);
  d.s.camera.chromaPulse(0.6);
  d.s.huds[e.side].portraitFlash = 1;
  await d.c.wait(0.2);
  await Promise.all([
    d.c.to(m, 'desat', 1, 0.8, sineOut),
    d.c.to(m, 'tilt', e.side === 'enemy' ? 0.08 : -0.08, 0.8, backOut(2)),
    d.c.to(m, 'drop', 20, 0.8, backOut(2)),
    d.c.to(m, 'active', 0, 0.3),
  ]);
}

export async function fightEnd(d: Director, e: Ev<'fightEnd'>): Promise<void> {
  const win = e.winner === 'player';
  if (win) d.s.sounds.victory();
  else d.s.sounds.defeat();
  if (win)
    d.s.particles.burst({
      x: W / 2,
      y: H / 2,
      count: 200,
      colors: ['#ffd23f', '#ffffff', '#ff6ad5', '#3b8ef0', '#5ed15a'],
      speed: [300, 800],
      angle: -Math.PI / 2,
      spread: Math.PI * 1.4,
      gravity: 600,
      life: [1.5, 2.5],
      size: [5, 9],
      kind: 'confetti',
    });
  // THE BIG BEATS (the retail list): a boss falling and a run lost each get their own moment, in the kit's banner.
  const label = d.s.gutter.fightLabel;
  const boss = win && label.includes('BOSS');
  const runLost = !win && label !== 'SANDBOX';
  if (boss) {
    // BOSS DOWN: the boss's machine bursts in gold and coins, the camera kicks, the room cheers.
    const c = d.machineCenter('enemy');
    d.shake(12, 0.7);
    d.s.camera.punchZoom(0.06, 0.5);
    d.s.camera.chromaPulse(0.6);
    d.s.camera.flashScreen(0.15, '#ffd23f');
    d.s.cheer?.(true);
    d.s.sounds.fanfareJackpot();
    d.s.particles.burst({ x: c.x, y: c.y, count: 160, colors: ['#ffd23f', '#ffe08a', '#ffffff', '#d9a640'], speed: [200, 700], angle: -Math.PI / 2, spread: Math.PI * 2, gravity: 500, drag: 1, life: [1, 2], size: [4, 8], kind: 'confetti' });
    d.s.particles.burst({ x: c.x, y: c.y, count: 40, colors: ['#ffd23f', '#ff9a3a'], speed: [120, 420], angle: -Math.PI / 2, spread: Math.PI * 2, gravity: 300, drag: 1.5, life: [0.5, 1.1], size: [2, 4], kind: 'spark' });
  } else if (runLost) {
    // RUN OVER: the room goes dark around your machine, embers fall from it, one heavy shake.
    const c = d.machineCenter('player');
    d.shake(10, 0.6);
    d.s.camera.dimTarget = 0.45;
    d.s.camera.flashScreen(0.12, '#ff3a2e');
    d.s.particles.burst({ x: c.x, y: c.y - 120, count: 90, colors: ['#5a4a6a', '#3a3040', '#ff6a5a', '#8a2a2a'], speed: [20, 140], angle: Math.PI / 2, spread: Math.PI * 0.8, gravity: 120, drag: 0.6, life: [1.4, 2.4], size: [2, 5], kind: 'square' });
  }
  const b = d.s.fx.add(new Banner(boss ? 'BOSS DOWN!' : win ? 'VICTORY!' : runLost ? 'RUN OVER' : 'DEFEAT', win ? COLORS.goldLight : COLORS.danger, W / 2, H / 2 - 40, 9));
  b.sub = `${e.turns} SPIN${e.turns === 1 ? '' : 'S'}`;
  await d.c.tween({ from: 0, to: 1.4, dur: 0.3, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
  await d.c.tween({ from: 1.4, to: 1, dur: 0.2, ease: sineIn, onUpdate: (v) => (b.scale = v) });
  await d.c.wait(1.6);
  if (runLost) d.s.camera.dimTarget = 0;
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (b.alpha = v) }).then(() => d.s.fx.remove(b)));
}

export async function heal(d: Director, e: Ev<'heal'>): Promise<void> {
  const h = d.s.huds[e.side];
  d.s.sounds.heal();
  const b = h.hpBar();
  d.s.particles.burst({ x: b.x + b.w * (e.hp / h.maxHp), y: b.y + b.h / 2, count: 16, colors: ['#7dff7a', '#ffffff'], speed: [40, 160], gravity: -200, life: [0.4, 0.7], size: [2, 4] });
  d.bg(d.popText(`+${e.amount}`, b.x + b.w - 30, b.y - 4, 3, '#7dff7a', 20, 0.3));
  // A heal made of several: what each part was, small, under the number.
  if (e.parts) d.bg(d.popText(e.parts.map((p) => `+${p.amount} ${p.label}`).join('  '), b.x + b.w / 2, b.y + b.h + 16, 1.5, '#c8f0c8', 12, 0.6));
  d.bg(d.c.to(h, 'ghost', e.hp, 0.3));
  await d.c.to(h, 'hp', e.hp, 0.3, sineOut);
}

export async function phoenix(d: Director, e: Ev<'phoenix'>): Promise<void> {
  const h = d.s.huds[e.side];
  const c = d.machineCenter(e.side);
  d.s.sounds.fanfareJackpot();
  d.hitstop(6);
  d.s.camera.flashScreen(0.7, '#ffb040');
  const icon = d.s.fx.add(new Projectile(RELICS.phoenix.sprite as SpriteId, c.x, c.y, 0));
  d.bg(d.c.tween({ from: 0, to: 6, dur: 0.3, ease: backOut(3), onUpdate: (v) => (icon.scale = v) }));
  d.s.particles.burst({ x: c.x, y: c.y, count: 80, colors: ['#ff6a2a', '#ffd23f', '#ffffff'], speed: [150, 500], angle: -Math.PI / 2, spread: Math.PI, gravity: -250, life: [0.5, 1.1], size: [3, 6] });
  d.bg(d.c.to(h, 'hp', e.hp, 0.3));
  d.bg(d.c.to(h, 'ghost', e.hp, 0.3));
  await d.banner("RABBIT'S FOOT!", '#ff8a3a', 1.4, 0.5, 'BACK AT 1 HP', BANNER_Y, 4);
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (icon.alpha = v) }).then(() => d.s.fx.remove(icon)));
}
