/** Enemy tricks on your reels: spill, freeze, jam, steal, rocks, jinxes, IOUs, fakes, marks, confiscations, the rake (split from director.ts, 2026-11-05). */
import { symLabel, UNIT, type SideId } from '../core/config';
import { backOut, cubicIn, cubicOut, sineIn, sineInOut } from './ease';
import { Projectile } from './fx';
import { HIT_Y, cellCenter, COLORS, MACHINE_H, MACHINE_TOP, TOP_ROW_Y } from './layout';
import { stripMapColumn } from './stripMap';
import { artId, type SpriteId } from '../render/sprites';
import { BOMB } from '../core/relics';
import { charmName } from '../core/charms';
import type { Director, Ev } from './director';
import { BANNER_Y } from './directorPay';

export async function slime(d: Director, e: Ev<'slime'>): Promise<void> {
  const from = d.s.machines[e.from];
  const to = d.s.machines[e.to];
  // Wind-up wobble on the enemy's slime symbols.
  for (const r of e.reels) {
    const fx = from.reels[r].rows[1];
    fx.glowColor = COLORS.slime;
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.35, onUpdate: (v) => (fx.wobble = v) }));
    d.bg(d.c.tween({ from: 0.8, to: 0.2, dur: 0.35, onUpdate: (v) => (fx.glow = v) }));
  }
  await d.c.wait(0.2);
  d.s.sounds.slimeLaunch();

  if (e.cells.length === 0) {
    const c = d.machineCenter(e.to);
    await d.popText('NOTHING TO SPILL ON', c.x, HIT_Y, 3, COLORS.textDim, 30, 0.2);
    return;
  }
  const flood = e.cells.length >= 9;
  const blobs = e.cells.map(async (ref, i) => {
    await d.c.wait(i * (flood ? 0.04 : 0.07));
    const row = d.rowOf(e.to, ref);
    const src = d.srcPoint(e.from, e.reels, i);
    const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
    const p = d.s.fx.add(new Projectile('slimeBlob', src.x, src.y, 6, false, COLORS.slime));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 4, dur: 0.45, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.45, 150, sineInOut);
    d.s.fx.remove(p);
    // Splat.
    const cell = to.reels[ref.reel].cells[ref.index];
    cell.slimed = true;
    d.bg(d.c.to(cell, 'goo', 1, 0.2, cubicOut));
    if (row >= 0) {
      const fx = to.reels[ref.reel].rows[row];
      d.bg(d.c.tween({ from: 0.8, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (fx.punch = v) }));
    }
    d.s.sounds.slimeSplat();
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 14, colors: [COLORS.slime, '#2f8f3a', '#b6ff9a'], speed: [80, 300], gravity: 900, life: [0.3, 0.6], size: [3, 6] });
  });
  await Promise.all(blobs);
  if (e.cells.length >= 4) d.shake(flood ? 7 : 3, 0.3);
  if (flood) {
    d.s.sounds.slimeFlood();
    to.wash.color = COLORS.slime;
    await d.c.tween({ dur: 0.6, onUpdate: (v) => (to.wash.t = v) });
    to.wash.t = -1;
  }
  if (e.wasted > 0) {
    const c = d.machineCenter(e.to);
    d.bg(d.popText(`NO ROOM FOR ${e.wasted} MORE`, c.x, HIT_Y, 2, COLORS.textDim, 20, 0.2));
  }
  d.settle(e.from, e.reels);
  await d.c.wait(0.2);
}

export async function cleanse(d: Director, e: Ev<'cleanse'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.s.sounds.cleanse();
  m.payline.color = '#fff6c8';
  m.wash.color = '#fff6c8';
  d.bg(d.c.tween({ dur: 0.5, onUpdate: (v) => (m.wash.t = v) }).then(() => (m.wash.t = -1)));
  const visible = e.cells.filter((ref) => d.rowOf(e.side, ref) >= 0);
  const hidden = e.cells.filter((ref) => d.rowOf(e.side, ref) < 0);
  for (const ref of hidden) Object.assign(m.reels[ref.reel].cells[ref.index], { slimed: false, goo: 0 });
  for (const [i, ref] of visible.entries()) {
    const cell = m.reels[ref.reel].cells[ref.index];
    const pos = cellCenter(e.side, ref.reel, d.rowOf(e.side, ref));
    d.s.sounds.pop(i);
    d.bg(d.c.to(cell, 'goo', 0, 0.25, sineIn).then(() => (cell.slimed = false)));
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
    d.s.particles.burst({ x: pos.x, y: pos.y, count: 12, colors: ['#ffffff', '#fff6c8', COLORS.slime], speed: [60, 220], gravity: -300, life: [0.4, 0.8], size: [2, 4] });
    await d.c.wait(0.05);
  }
  await d.banner(`${count(e.cells.length, 'SYMBOL')} MOPPED UP!`, COLORS.goldLight, 1.3, 0.4, '', BANNER_Y, 3);
}

/** A jackpot of stolen cells: every stolen symbol comes home. */
export async function recover(d: Director, e: Ev<'recover'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.s.sounds.cleanse();
  for (const [i, ref] of e.cells.entries()) {
    const cell = m.reels[ref.reel].cells[ref.index];
    const row = d.rowOf(e.side, ref);
    d.bg(d.c.to(cell, 'stolen', 0, 0.3, sineIn));
    if (row < 0) continue;
    const pos = cellCenter(e.side, ref.reel, row);
    d.s.sounds.pop(i);
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
    d.s.particles.burst({ x: pos.x, y: pos.y, count: 12, colors: ['#ffffff', '#c9a0ff'], speed: [60, 220], gravity: -300, life: [0.4, 0.8], size: [2, 4] });
    await d.c.wait(0.05);
  }
  await d.banner(e.cells.length ? `${count(e.cells.length, 'SYMBOL')} BACK!` : 'NOTHING STOLEN', COLORS.goldLight, 1.3, 0.4, '', BANNER_Y, 3);
}

export async function fizzle(d: Director, e: Ev<'fizzle'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.s.sounds.fizzle();
  for (const r of e.reels) {
    const fx = m.reels[r].rows[1];
    d.bg(d.c.tween({ from: 0.6, to: 0, dur: 0.3, onUpdate: (v) => (fx.wobble = v) }));
    const c = cellCenter(e.side, r, 1);
    d.bg(d.popText('...', c.x, c.y - 30, 3, COLORS.textDim, 16, 0.1));
  }
  await d.c.wait(0.2);
}

/** Freeze (ice shards) or jam (padlocks) the target reels. */
export async function status(d: Director, e: Ev<'freeze'> | Ev<'lock'>, kind: 'frozen' | 'locked'): Promise<void> {
  const to = d.s.machines[e.to];
  const ice = kind === 'frozen';
  if (e.reels.length) await d.activate(e.from, e.reels, ice ? '#9fe8ff' : '#ffb070');
  const flights = e.targets.map(async (r, i) => {
    await d.c.wait(i * 0.08);
    const src = d.srcPoint(e.from, e.reels, i);
    const dst = cellCenter(e.to, r, 1);
    const p = d.s.fx.add(new Projectile(ice ? 'ice' : 'lock', src.x, src.y, 3, false, ice ? '#9fe8ff' : '#ffb070'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 3, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.35, 90, sineIn);
    d.s.fx.remove(p);
    if (ice) {
      const stop = (e as Ev<'freeze'>).stops[i];
      const reel = to.reels[r];
      if (stop !== undefined && stop !== reel.stop) {
        // Clunk one stop to the least useful visible cell, then freeze solid.
        const len = reel.cells.length;
        const down = (stop - reel.stop + len) % len === len - 1;
        reel.stop = stop;
        d.s.sounds.reelStop(r, 1.3);
        d.bg(d.c.tween({ from: down ? -96 : 96, to: 0, dur: 0.16, ease: backOut(2), onUpdate: (v) => (reel.bounce = v) }));
      }
      to.frozen[r] = Math.max(to.frozen[r], e.turns);
      d.s.sounds.freeze();
    } else {
      to.locked[r] = Math.max(to.locked[r], e.turns);
      d.s.sounds.chains();
    }
    const fxArr = ice ? to.frozenFx : to.lockedFx;
    d.bg(d.c.tween({ from: fxArr[r], to: 1, dur: 0.25, ease: cubicOut, onUpdate: (v) => (fxArr[r] = v) }));
    d.s.particles.burst({
      x: dst.x,
      y: dst.y,
      count: 22,
      colors: ice ? ['#9fe8ff', '#ffffff', '#5ab8e8'] : ['#8a8a96', '#ffb070', '#4a3a2a'],
      speed: [80, 320],
      kind: ice ? 'spark' : 'square',
      gravity: ice ? 100 : 700,
      life: [0.25, 0.55],
      size: [2, 5],
    });
    d.shake(3, 0.15);
  });
  await Promise.all(flights);
  const c = d.machineCenter(e.to);
  const label = ice ? `FROZEN FOR ${count(e.turns, 'SPIN')}` : 'JAMMED!';
  // (Over the reels: on the machine's top edge it sat under the YOUR SPIN banner: playtest 2026-11-08.)
  d.bg(d.popText(label, c.x, MACHINE_TOP + MACHINE_H / 2, 3, ice ? '#9fe8ff' : '#ffb070', 16, 0.4));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.2);
}

export async function thaw(d: Director, e: Ev<'thaw'>): Promise<void> {
  const m = d.s.machines[e.side];
  if (e.status === 'raked') {
    const c = d.machineCenter(e.side);
    d.bg(d.popText('RAKE LIFTED', c.x, MACHINE_TOP + MACHINE_H / 2, 2, '#7dff7a', 16, 0.3));
    await d.c.wait(0.05);
    return;
  }
  if (e.status === 'hexed') {
    for (const r of e.reels) {
      m.hexed[r] = 0;
      d.bg(d.c.tween({ from: m.hexedFx[r], to: 0, dur: 0.4, onUpdate: (v) => (m.hexedFx[r] = v) }));
      const p = cellCenter(e.side, r, 1);
      d.s.particles.burst({ x: p.x, y: p.y, count: 12, colors: ['#e0a0ff', '#ffffff'], speed: [40, 160], gravity: -200, life: [0.3, 0.6], size: [2, 4] });
    }
    await d.c.wait(0.1);
    return;
  }
  const ice = e.status === 'frozen';
  if (ice) d.s.sounds.shatter();
  else d.s.sounds.unchain();
  for (const r of e.reels) {
    if (ice) m.frozen[r] = 0;
    else m.locked[r] = 0;
    const arr = ice ? m.frozenFx : m.lockedFx;
    d.bg(d.c.tween({ from: arr[r], to: 0, dur: 0.3, onUpdate: (v) => (arr[r] = v) }));
    for (let row = 0; row < 3; row++) {
      const p = cellCenter(e.side, r, row);
      if (ice || row === 1)
        d.s.particles.burst({ x: p.x, y: p.y, count: ice ? 10 : 8, colors: ice ? ['#9fe8ff', '#ffffff'] : ['#8a8a96', '#5a4a3a'], speed: [60, 220], gravity: 600, life: [0.3, 0.6], size: [2, 5] });
    }
  }
  await d.c.wait(0.15);
}

export async function steal(d: Director, e: Ev<'steal'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#c9a0ff');
  if (!e.cells.length) {
    const c = d.machineCenter(e.to);
    await d.popText('NOTHING TO STEAL', c.x, MACHINE_TOP - 4, 2, COLORS.textDim, 16, 0.2);
    return;
  }
  const grabs = e.cells.map(async (ref, i) => {
    await d.c.wait(i * 0.12);
    const src = d.srcPoint(e.from, e.reels, i);
    const row = Math.max(0, d.rowOf(e.to, ref));
    const dst = cellCenter(e.to, ref.reel, row);
    const claw = d.s.fx.add(new Projectile('claw', src.x, src.y, 4, e.from === 'enemy', '#c9a0ff'));
    d.s.sounds.steal();
    await d.arc(claw, dst.x, dst.y, 0.3, 60, cubicIn);
    const cell = to.reels[ref.reel].cells[ref.index];
    // Snatch: the symbol rides the claw back to the thief.
    const loot = d.s.fx.add(new Projectile(e.symbols[i] as SpriteId, dst.x, dst.y, 4));
    d.bg(d.c.tween({ from: 0, to: 1, dur: 0.2, onUpdate: (v) => (cell.stolen = v) }));
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#c9a0ff', '#ffffff'], speed: [60, 200], gravity: 300, life: [0.2, 0.4], size: [2, 4] });
    await Promise.all([
      d.arc(claw, src.x, src.y, 0.35, 40, sineInOut),
      d.arc(loot, src.x, src.y, 0.35, 40, sineInOut),
      d.c.tween({ from: 4, to: 2, dur: 0.35, onUpdate: (v) => (loot.scale = v) }),
    ]);
    d.s.fx.remove(claw);
    d.s.fx.remove(loot);
  });
  await Promise.all(grabs);
  const c = d.machineCenter(e.to);
  if (e.repo) repossessed(d, e.to, e.symbols.map((s) => symLabel(s)).join(' + '));
  else d.bg(d.popText(`${count(e.cells.length, 'SYMBOL')} STOLEN`, c.x, MACHINE_TOP - 4, 3, '#c9a0ff', 16, 0.3));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.15);
}

export async function junk(d: Director, e: Ev<'junk'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#a89a8a');
  // Rocks land in the strip beyond the window: aim them at the strip map.
  for (const [i, ins] of e.inserts.entries()) {
    const src = d.srcPoint(e.from, e.reels, i);
    const dst = stripMapColumn(ins.reel);
    const p = d.s.fx.add(new Projectile('rock', src.x, src.y, 3, false, '#8a8070'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 2, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, i === 0 ? 0.45 : 0.18, 200, sineIn);
    d.s.fx.remove(p);
    const cell = { symbol: 'rock' as const, slimed: false, goo: 0, flash: 1, pop: 0 };
    to.insertCell(ins.reel, ins.index, cell);
    d.bg(d.c.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (cell.pop = v) }));
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
    d.s.sounds.rockThud();
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#8a8070', '#5a5048', '#c9bba8'], speed: [60, 200], gravity: 800, life: [0.3, 0.5], size: [2, 5] });
    d.shake(2, 0.1);
  }
  if (e.inserts.length) {
    const col = stripMapColumn(1);
    d.bg(d.popText(`+${e.inserts.length} ROCK${e.inserts.length > 1 ? 'S' : ''}`, col.x, col.y - 170, 2, '#c9bba8', 14, 0.5));
  }
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.15);
}

// ---- act 2 -----------------------------------------------------------------------------

export async function hex(d: Director, e: Ev<'hex'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#b04ae8');
  const flights = e.targets.map(async (r, i) => {
    await d.c.wait(i * 0.1);
    const src = d.srcPoint(e.from, e.reels, i);
    const dst = cellCenter(e.to, r, 1);
    const p = d.s.fx.add(new Projectile(artId('hex'), src.x, src.y, 3, false, '#b04ae8'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 2, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.4, 110, sineInOut);
    d.s.fx.remove(p);
    to.hexed[r] = Math.max(to.hexed[r], e.turns);
    d.bg(d.c.tween({ from: to.hexedFx[r], to: 1, dur: 0.3, ease: cubicOut, onUpdate: (v) => (to.hexedFx[r] = v) }));
    d.s.sounds.chains();
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 24, colors: ['#b04ae8', '#e0a0ff', '#2a1040'], speed: [60, 260], gravity: -60, life: [0.3, 0.7], size: [2, 5] });
  });
  await Promise.all(flights);
  const c = d.machineCenter(e.to);
  d.bg(d.popText(`JINX! PAYS HALF FOR ${count(e.turns, 'SPIN')}`, c.x, MACHINE_TOP + MACHINE_H / 2, 2, '#e0a0ff', 16, 0.5));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.2);
}

export async function bomb(d: Director, e: Ev<'bomb'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#ff8a3a');
  const tosses = e.cells.map(async (ref, i) => {
    await d.c.wait(i * 0.1);
    const src = d.srcPoint(e.from, e.reels, i);
    const row = d.rowOf(e.to, ref);
    const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
    const p = d.s.fx.add(new Projectile(artId('bomb'), src.x, src.y, 3.5, false, '#ff8a3a'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 3, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.4, 130, sineIn);
    d.s.fx.remove(p);
    const cell = to.reels[ref.reel].cells[ref.index];
    cell.bomb = BOMB.fuse;
    d.bg(d.c.tween({ from: 0, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (cell.bombPop = v) }));
    d.s.sounds.rockThud();
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#ff8a3a', '#ffd23f', '#3a2a20'], speed: [60, 200], gravity: 500, life: [0.2, 0.4], size: [2, 4] });
  });
  await Promise.all(tosses);
  const c = d.machineCenter(e.to);
  d.bg(d.popText(`${count(e.cells.length, 'IOU')} DUE IN ${count(BOMB.fuse, 'SPIN')}`, c.x, MACHINE_TOP - 30, 2, '#ffb070', 16, 0.5));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.15);
}

export async function fuse(d: Director, e: Ev<'fuse'>): Promise<void> {
  const m = d.s.machines[e.side];
  e.cells.forEach((ref, i) => {
    const cell = m.reels[ref.reel].cells[ref.index];
    cell.bomb = e.fuses[i];
  });
  if (e.fuses.some((f) => f <= 1)) d.s.sounds.abilityTick();
  await d.c.wait(0.1);
}

export async function defuse(d: Director, e: Ev<'defuse'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.s.sounds.unchain();
  for (const ref of e.cells) {
    const cell = m.reels[ref.reel].cells[ref.index];
    d.bg(d.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (cell.bombPop = v) }).then(() => (cell.bomb = 0)));
    const p = cellCenter(e.side, ref.reel, 1);
    d.s.particles.burst({ x: p.x, y: p.y, count: 12, colors: ['#7dff7a', '#ffffff'], speed: [60, 200], gravity: -150, life: [0.3, 0.5], size: [2, 4] });
  }
  const c = d.machineCenter(e.side);
  await d.popText(e.cells.length > 1 ? `${e.cells.length} IOUS PAID OFF!` : 'PAID OFF!', c.x, MACHINE_TOP - 4, 3, '#7dff7a', 16, 0.3);
}

export async function blast(d: Director, e: Ev<'blast'>): Promise<void> {
  const m = d.s.machines[e.side];
  const cell = m.reels[e.cell.reel].cells[e.cell.index];
  cell.bomb = 0;
  const row = d.rowOf(e.side, e.cell);
  const p = row >= 0 ? cellCenter(e.side, e.cell.reel, row) : stripMapColumn(e.cell.reel);
  d.s.sounds.hit(6);
  d.s.sounds.rockThud();
  d.hitstop(2);
  d.shake(6, 0.3);
  d.s.camera.flashScreen(0.3, '#ffb070');
  d.flashMachine(e.side, 0.8, 0.2);
  d.knockback(e.side, 10);
  d.s.particles.burst({ x: p.x, y: p.y, count: 40, colors: ['#ff5a2a', '#ffd23f', '#ffffff', '#3a2a20'], speed: [150, 550], kind: 'spark', gravity: 400, life: [0.25, 0.6], size: [3, 6] });
  d.damageHud(e.side, e.targetHp, e.targetShield, e.hpDamage);
  const c = d.machineCenter(e.side);
  if (e.blocked > 0) d.bg(d.popText(`BLOCK ${e.blocked}`, c.x + 40, MACHINE_TOP + 70, 2, '#9fd0ff', 16, 0.3));
  d.bg(d.popText(e.hpDamage > 0 ? `PAY UP -${e.hpDamage}` : 'PAY UP!', c.x, HIT_Y, 4, '#ff8a3a', 50));
  await d.c.wait(0.35);
}

export async function gulp(d: Director, e: Ev<'gulp'>): Promise<void> {
  const c = d.machineCenter(e.from);
  d.s.sounds.coin(1);
  const chips = Array.from({ length: e.chips }, async (_, i) => {
    await d.c.wait(i * 0.1);
    const p = d.s.fx.add(new Projectile('chip', 40, 30, 3));
    await d.arc(p, c.x, c.y, 0.45, 120, sineIn);
    d.s.fx.remove(p);
    d.s.sounds.coin(6 + i);
  });
  await Promise.all(chips);
  d.s.gutter.chipsEaten = (d.s.gutter.chipsEaten ?? 0) + e.chips;
  await d.popText(`TOOK ${count(e.chips, 'CHIP')}!`, c.x, MACHINE_TOP - 4, 3, '#ffd23f', 16, 0.3);
}

/** The Counterfeiter slaps fake coins over your gilds. */
export async function fake(d: Director, e: Ev<'fake'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#9a9a9a');
  // The whole gild is counterfeited: coins fly to the cells you can see, the rest go grey at once.
  const seen = e.cells.filter((ref) => d.rowOf(e.to, ref) >= 0);
  for (const ref of e.cells) if (!seen.includes(ref)) to.reels[ref.reel].cells[ref.index].faked = e.turns;
  const hits = seen.map(async (ref, i) => {
    await d.c.wait(i * 0.08);
    const src = d.srcPoint(e.from, e.reels, i);
    const row = d.rowOf(e.to, ref);
    const dst = cellCenter(e.to, ref.reel, row);
    const p = d.s.fx.add(new Projectile(artId('fake'), src.x, src.y, 3, false, '#9a9a9a'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 4, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.35, 90, sineIn);
    d.s.fx.remove(p);
    to.reels[ref.reel].cells[ref.index].faked = e.turns;
    d.s.sounds.coin(2);
    d.s.particles.burst({ x: dst.x, y: dst.y, count: 12, colors: ['#9a9a9a', '#5a5a5a', '#d0d0d0'], speed: [60, 200], gravity: 400, life: [0.2, 0.4], size: [2, 4] });
  });
  await Promise.all(hits);
  const c = d.machineCenter(e.to);
  d.bg(d.popText(`${charmList(e.enhs)} OFF FOR ${count(e.turns, 'SPIN')}`, c.x, MACHINE_TOP + MACHINE_H / 2, 2, '#c0c0c0', 16, 0.6));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.15);
}

export async function fakeTick(d: Director, e: Ev<'fakeTick'>): Promise<void> {
  const m = d.s.machines[e.side];
  e.cells.forEach((ref, i) => (m.reels[ref.reel].cells[ref.index].faked = e.left[i]));
  await d.c.wait(0.02);
}

// ---- act 3 -----------------------------------------------------------------------------

/** The Card Sharp flicks marked cards onto your cells. */
export async function markCells(d: Director, e: Ev<'mark'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#ff5a7a');
  const flicks = e.cells.map(async (ref, i) => {
    await d.c.wait(i * 0.08);
    const src = d.srcPoint(e.from, e.reels, i);
    const row = d.rowOf(e.to, ref);
    const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
    const p = d.s.fx.add(new Projectile(artId('card'), src.x, src.y, 3, false, '#ffffff'));
    d.bg(d.c.tween({ from: 0, to: Math.PI * 6, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
    await d.arc(p, dst.x, dst.y, 0.35, 100, sineIn);
    d.s.fx.remove(p);
    to.reels[ref.reel].cells[ref.index].carded = true;
    d.s.sounds.click();
  });
  await Promise.all(flicks);
  const c = d.machineCenter(e.to);
  d.bg(d.popText('MARKED! ON YOUR PAYLINE THEY HIT YOU', c.x, TOP_ROW_Y, 2, '#ff8aa0', 16, 0.5));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.1);
}

export async function markedHit(d: Director, e: Ev<'markedHit'>): Promise<void> {
  const c = d.machineCenter(e.side);
  d.s.sounds.hit(e.amount / UNIT);
  d.shake(4, 0.2);
  d.flashMachine(e.side, 0.6, 0.15);
  for (const ref of e.cells) {
    const p = cellCenter(e.side, ref.reel, 1);
    d.s.particles.burst({ x: p.x, y: p.y, count: 14, colors: ['#ff5a7a', '#ffffff'], speed: [80, 260], kind: 'spark', gravity: 300, life: [0.2, 0.4], size: [2, 4] });
  }
  d.damageHud(e.side, e.targetHp, e.targetShield, e.hpDamage);
  // Credit the Dealer (its marks are most of its damage).
  const who = d.s.gutter.nextDeal ? "THE DEALER'S MARK" : 'MARKED!';
  await d.popText(e.hpDamage > 0 ? `${who} -${e.hpDamage}` : `${who} BLOCKED`, c.x, HIT_Y, 3, '#ff8aa0', 30, 0.3);
}

/** The Pit Boss bangs the gavel: gilds are taken for the fight. */
export async function confiscate(d: Director, e: Ev<'confiscate'>): Promise<void> {
  const to = d.s.machines[e.to];
  if (e.reels.length) await d.activate(e.from, e.reels, '#c9a27a');
  d.s.sounds.rockThud();
  d.shake(5, 0.2);
  for (const ref of e.cells) {
    const cell = to.reels[ref.reel].cells[ref.index];
    cell.confiscated = cell.enh;
    delete cell.enh;
  }
  const c = d.machineCenter(e.to);
  if (e.repo) repossessed(d, e.to, `${e.enhs.map((x) => charmName(x)).join(' + ')} CHARM`);
  else d.bg(d.popText(`${charmList(e.enhs)} TAKEN`, c.x, MACHINE_TOP - 30, 2, '#e0c090', 16, 0.6));
  if (e.reels.length) d.settle(e.from, e.reels);
  await d.c.wait(0.3);
}

/** THE REPO MAN's take: its own banner (the write that outlasts the fight). */
export function repossessed(d: Director, to: SideId, what: string): void {
  const c = d.machineCenter(to);
  d.s.sounds.stingerMedium();
  // (Both clear the machine's frame: the small line sat on its top edge.)
  d.bg(d.popText(`${what} REPOSSESSED`, c.x, MACHINE_TOP - 50, 2.5, '#ff9a3a', 18, 0.9));
  d.bg(d.popText('IT COMES BACK AFTER THE FIGHT', c.x, MACHINE_TOP - 27, 1.5, '#ffd0a0', 10, 0.9));
}

export async function rake(d: Director, e: Ev<'rake'>): Promise<void> {
  if (e.reels.length) await d.activate(e.from, e.reels, '#c87a3a');
  d.s.sounds.coin(1);
  const c = d.machineCenter(e.to);
  await d.popText(`RAKED! ${e.cut} LESS FOR ${count(e.turns, 'SPIN')}`, c.x, MACHINE_TOP + MACHINE_H / 2, 2, '#e0a070', 16, 0.5);
  if (e.reels.length) d.settle(e.from, e.reels);
}

/** A count and its noun: 1 SYMBOL, 3 SYMBOLS. */
const count = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 'S'}`;

/** The Charms an ability hit, for its popup: named up to two ("GOLD + KEEN CHARMS"), counted past that ("4 CHARMS"),
 * so a wide fake never runs off the screen (QA 2026-11-04). */
function charmList(enhs: Parameters<typeof charmName>[0][]): string {
  return enhs.length > 2 ? `${enhs.length} CHARMS` : `${enhs.map((x) => charmName(x)).join(' + ')} CHARM${enhs.length > 1 ? 'S' : ''}`;
}
