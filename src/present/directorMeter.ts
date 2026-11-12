/** The meters and their payoffs: energy pips, lightning strikes and storms, MIDAS TOUCH, THE DROP, HIGH ROLLER (split from director.ts, 2026-11-05). */
import { UNIT } from '../core/config';
import type { CombatEvent } from '../core/events';
import { backOut, cubicIn, sineIn } from './ease';
import { FloatText, Lightning, Projectile } from './fx';
import { CALLOUT_Y, cellCenter, COLORS, HIT_Y, MACHINE_CX, MACHINE_TOP, TOP_ROW_Y } from './layout';
import { fmtNum } from '../render/text';
import type { Director, Ev } from './director';
import { BANNER_Y, luckyWilds } from './directorPay';

export async function energyGain(d: Director, e: Ev<'energyGain'>): Promise<void> {
  await d.activate(e.side, e.reels, COLORS.energy);
  const h = d.s.huds[e.side];
  const before = Math.floor((e.total - e.amount) / UNIT);
  const zaps = e.reels.map(async (r, i) => {
    await d.c.wait(i * 0.05);
    const from = cellCenter(e.side, r, 1);
    const pip = h.pipPos(Math.min(h.energyMax - 1, before + i));
    const p = d.s.fx.add(new Projectile('bolt', from.x, from.y - 14, 2.5, false, COLORS.energy));
    await d.arc(p, pip.x, pip.y, 0.22, 30, cubicIn);
    d.s.fx.remove(p);
  });
  await Promise.all(zaps);
  // Light pips one by one (capped at the bar; overflow shows after the special fires).
  const lit = Math.min(h.energyMax, Math.floor(e.total / UNIT));
  for (let i = Math.floor(h.energy); i < lit; i++) {
    h.energy = i + 1;
    d.s.sounds.energyPip(i);
    d.bg(d.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
    const p = h.pipPos(i);
    d.s.particles.burst({ x: p.x, y: p.y, count: 6, colors: [COLORS.energy, '#ffffff'], speed: [60, 180], gravity: 0, life: [0.15, 0.3], size: [2, 3] });
    await d.c.wait(0.07);
  }
  const p0 = h.pipPos(0);
  // (In the meter bar's middle, between its label and its count: over the bar it sat on the shield bar.)
  d.bg(d.popText(`+${e.amount}`, h.meterBar().x + h.meterBar().w / 2 + 14, p0.y, 2, COLORS.energy, 0, 0.3));
  d.settle(e.side, e.reels);
  await d.c.wait(0.15);
}

export async function specialFire(d: Director, e: Ev<'specialFire'>): Promise<void> {
  const h = d.s.huds[e.from];
  const cam = d.s.camera;
  // Charge.
  d.s.sounds.specialCharge();
  const soft = d.s.juice.softLightning;
  cam.dimTarget = soft ? 0.25 : 0.5;
  d.bg(d.c.tween({ from: 0, to: 1, dur: 0.45, onUpdate: (v) => (h.energyFlash = v * 0.8) }));
  for (let i = 0; i < h.energyMax; i++) {
    const p = h.pipPos(i);
    d.s.particles.burst({ x: p.x, y: p.y, count: 5, colors: [COLORS.energy, '#ffffff'], speed: [80, 220], angle: -Math.PI / 2, spread: 1.2, gravity: -200, life: [0.3, 0.5], size: [2, 4] });
  }
  await d.c.wait(0.45);

  // Strike.
  const target = d.machineCenter(e.to);
  const bolt = d.s.fx.add(new Lightning(target.x + (Math.random() * 2 - 1) * 40, -20, target.x, target.y));
  d.s.sounds.thunder();
  d.hitstop(soft ? 2 : 4);
  // No full-screen flash here (photosensitivity): the struck machine flashes instead.
  if (!soft) {
    cam.chromaPulse(0.5);
    cam.punchZoom(0.05, 0.45);
  }
  d.shake(soft ? 3 : 9, soft ? 0.25 : 0.5);
  d.flashMachine(e.to, soft ? 0.35 : 1, 0.3);
  d.knockback(e.to, soft ? 6 : 16);
  d.s.particles.burst({ x: target.x, y: target.y, count: soft ? 18 : 60, colors: [COLORS.energy, '#ffffff', '#fff6c8'], speed: [200, 700], kind: 'spark', gravity: 400, life: [0.2, 0.6], size: [3, 5] });
  d.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
  h.energyFlash = 0;
  // (No "-0" when the hit lands on a machine already down or all of it is blocked: playtest 2026-11-01.)
  if (e.hpDamage > 0) d.bg(d.popText(`-${fmtNum(e.hpDamage)}`, target.x, HIT_Y, 8, COLORS.energy, 70, 0.5));
  // Full: the bolt crackles (re-strikes 3 times). Soft: it just fades out.
  if (!soft)
    for (let i = 0; i < 3; i++) {
      await d.c.tween({ from: 1, to: 0.2, dur: 0.08, onUpdate: (v) => (bolt.alpha = v) });
      bolt.reroll();
      bolt.alpha = 1;
    }
  await d.c.tween({ from: 1, to: 0, dur: soft ? 0.35 : 0.15, onUpdate: (v) => (bolt.alpha = v) });
  d.s.fx.remove(bolt);
  cam.dimTarget = 0;

  // Drain, then refill any overflow visibly.
  await d.c.to(h, 'energy', 0, 0.2, sineIn);
  const refill = Math.min(h.energyMax, Math.floor(e.energyLeft / UNIT));
  for (let i = 0; i < refill; i++) {
    h.energy = i + 1;
    d.s.sounds.energyPip(i);
    d.bg(d.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
    await d.c.wait(0.08);
  }
  await d.c.wait(0.2);
}

/**
 * A LIGHTNING STORM: several strikes in one turn play as ONE sustained arc with a racing damage counter.
 * Its length grows with the log of the strike count (1.2 s for 2, 2.5 s for 10, at most 4 s). The arc
 * re-forks at most ~2 times a second and never flashes the screen (photosensitivity); SOFT holds it still.
 */
export async function storm(d: Director, group: CombatEvent[]): Promise<void> {
  const strikes = group.filter((x): x is Ev<'specialFire'> => x.type === 'specialFire');
  const n = strikes.reduce((a, x) => a + (x.strikes ?? 1), 0);
  const first = strikes[0];
  const last = strikes[strikes.length - 1];
  const dur = Math.min(4, 1.2 + (1.3 * Math.log(n / 2)) / Math.log(5));
  const total = strikes.reduce((a, x) => a + x.hpDamage, 0);
  const h = d.s.huds[first.from];
  const to = d.s.huds[first.to];
  const cam = d.s.camera;
  const soft = d.s.juice.softLightning;
  d.s.sounds.specialCharge();
  cam.dimTarget = soft ? 0.25 : 0.45;
  d.bg(d.c.tween({ from: 0, to: 1, dur: 0.35, onUpdate: (v) => (h.energyFlash = v * 0.8) }));
  await d.c.wait(0.35);
  const target = d.machineCenter(first.to);
  const bolt = d.s.fx.add(new Lightning(target.x, -20, target.x, target.y));
  bolt.alpha = soft ? 0.6 : 0.95;
  const counter = d.s.fx.add(new FloatText('-0', target.x, HIT_Y, 7, COLORS.energy));
  counter.z = 31;
  d.s.sounds.thunder();
  d.shake(soft ? 2 : 5, 0.3);
  d.flashMachine(first.to, soft ? 0.25 : 0.5, 0.3);
  const hp0 = to.hp;
  const sh0 = to.shield;
  const e0 = h.energy;
  let forks = 0;
  let crackles = 0;
  d.bg(d.banner(`LIGHTNING STORM X${n}`, COLORS.energy, 1.2, Math.max(0.2, dur - 0.6), '', BANNER_Y, 4));
  await d.c.tween({
    dur,
    onUpdate: (v) => {
      counter.text = `-${Math.round(total * v)}`;
      to.hp = hp0 + (last.targetHp - hp0) * v;
      to.shield = sh0 + (last.targetShield - sh0) * v;
      h.energy = e0 * (1 - v);
      d.s.machines[first.to].kx = Math.sin(v * dur * 40) * (soft ? 1 : 3);
      // Re-fork about twice a second (a still arc on SOFT).
      if (!soft && v * dur - forks * 0.5 >= 0.5) {
        forks++;
        bolt.reroll();
      }
      if (v * dur - crackles * 0.25 >= 0.25) {
        crackles++;
        d.s.sounds.energyPip(crackles % 8);
      }
    },
  });
  d.s.machines[first.to].kx = 0;
  d.s.fx.remove(bolt);
  counter.text = `-${total}`;
  d.bg(d.c.tween({ from: 1, to: 0, dur: 0.6, onUpdate: (v) => ((counter.alpha = v), (counter.y -= 0.5)) }).then(() => d.s.fx.remove(counter)));
  d.damageHud(first.to, last.targetHp, last.targetShield, total);
  d.knockback(first.to, soft ? 6 : 14);
  cam.dimTarget = 0;
  h.energyFlash = 0;
  h.energy = Math.min(h.energyMax, Math.floor(last.energyLeft / UNIT));
  // Heals and relic pops that rode inside the storm.
  for (const x of group) if (x.type !== 'specialFire') await d.play(x);
}

/** A signature meter moved: MIDAS gold bars / JAX wilds light pips. */
export async function meter(d: Director, e: Ev<'meter'>): Promise<void> {
  const h = d.s.huds[e.side];
  const m = h.meter;
  if (!m) return;
  // THE JUKEBOX: a spin with no note skips the record (the volume falls).
  if (m.kind === 'volume' && e.amount < 0) {
    const p0 = h.pipPos(Math.max(0, Math.floor(h.energy) - 1));
    d.s.sounds.fizzle();
    // Under the meter (above it sits the shield bar and its number).
    d.bg(d.popText('SKIP!', h.meterBar().x + h.meterBar().w / 2 + 14, p0.y, 1.6, '#ffffff', 0, 0.4));
    await d.c.to(h, 'energy', e.total / UNIT, 0.2, sineIn);
    return;
  }
  if (e.wasted) {
    const p0 = h.pipPos(h.energyMax - 1);
    await d.popText('FULL!', h.meterBar().x + h.meterBar().w / 2 + 14, p0.y, 1.6, '#ffffff', 0, 0.3);
    return;
  }
  if (e.reels.length) await d.activate(e.side, e.reels, m.color);
  const before = Math.min(h.energyMax, Math.floor(h.energy));
  // MIDAS keeps counting past full (GOLD 60/20); the others stop at full.
  const over = m.kind === 'touch' ? e.total / UNIT : Math.min(h.energyMax, e.total / UNIT);
  const lit = Math.min(h.energyMax, over);
  const zaps = e.reels.map(async (r, i) => {
    await d.c.wait(i * 0.05);
    const from = cellCenter(e.side, r, 1);
    const pip = h.pipPos(Math.min(h.energyMax - 1, before + i));
    const p = d.s.fx.add(new Projectile(m.icon, from.x, from.y - 14, 2, false, m.color));
    await d.arc(p, pip.x, pip.y, 0.22, 30, cubicIn);
    d.s.fx.remove(p);
  });
  await Promise.all(zaps);
  for (let i = before; i < Math.ceil(lit); i++) {
    h.energy = Math.min(lit, i + 1);
    d.s.sounds.energyPip(i);
    if (h.pipPunch[i] !== undefined) d.bg(d.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
    await d.c.wait(0.06);
  }
  h.energy = over;
  if (e.armed && !h.armed) {
    h.armed = true;
    d.s.sounds.lucky();
    // On the machine's callout row (its top edge): under the machine it landed on the HOLD chip, before that on the
    // HP and meter bars.
    // HYPE MAN can max the volume right before the spin it drops on: no "next spin" then.
    if (!e.dropsNow) d.bg(d.popText(m.kind === 'touch' ? 'NEXT SPIN TURNS GOLD!' : m.kind === 'vault' ? 'YOUR NEXT HIT IS MULTIPLIED!' : m.kind === 'volume' ? 'FULL VOLUME! THE DROP IS NEXT!' : 'YOUR NEXT SPIN IS ALL JACKPOTS!', MACHINE_CX[e.side], CALLOUT_Y, 2, m.color, 12, 0.6, true));
  }
  if (e.reels.length) d.settle(e.side, e.reels);
}

/** MIDAS TOUCH or JAX's all-jackpots spin: the meter pays off (MIDAS keeps any gold past what it spent). */
export async function payoff(d: Director, e: Ev<'payoff'>): Promise<void> {
  const h = d.s.huds[e.side];
  const left = (e.left ?? 0) / UNIT;
  h.armed = left >= h.energyMax;
  d.bg(d.c.to(h, 'energy', left, 0.3, sineIn));
  d.s.sounds.fanfareJackpot();
  d.shake(4, 0.25);
  const color = h.meter?.color ?? COLORS.goldLight;
  // A callout over the machine, not a second banner (the PAIR!/JACKPOT! banner carries the math).
  const c = d.machineCenter(e.side);
  if (e.kind === 'volume') return;
  await d.popText(e.kind === 'touch' ? 'MIDAS TOUCH!' : e.kind === 'vault' ? `HIGH ROLLER X${e.mul ?? 1}!` : 'ALL JACKPOTS!', c.x, TOP_ROW_Y, 4, color, 30, 0.45);
}

/** THE JUKEBOX: THE DROP. A bass hit, every note in the window lights up, then they all hit (the attack follows). */
export async function drop(d: Director, e: Omit<Ev<'drop'>, 'type'>): Promise<void> {
  const m = d.s.machines[e.side];
  const c = d.machineCenter(e.side);
  // Nothing to play: a small callout, no boom.
  if (!e.cells.length) {
    await d.popText('THE DROP... NO NOTES', c.x, MACHINE_TOP - 24, 2, COLORS.textDim, 12, 0.4);
    return;
  }
  d.s.sounds.drop();
  d.shake(7, 0.35);
  // Over the machine (not on the top row it lights), first; then the notes light up; the note group hits after.
  // Between the HUD and the machine (at scale 4 it ran over the HUD's border: R13 B3).
  await d.popText('THE DROP!', c.x, MACHINE_TOP - 18, 3, '#5ad8e8', 10, 0.25, true);
  const wilds = e.cells.filter((x) => x.wild);
  if (wilds.length) await luckyWilds(d, e.side, wilds);
  d.dropCells = e.amount > 0 ? e.cells : null;
  const g = d.lastScore?.groups.find((x) => x.drop);
  const lights = e.cells.map(async (ref, i) => {
    await d.c.wait(i * 0.04);
    const fx = m.reels[ref.reel]?.rows[ref.row];
    if (fx) {
      fx.flash = 0.9;
      d.bg(d.c.tween({ from: 0.9, to: 0, dur: 0.4, onUpdate: (v) => (fx.flash = v) }));
    }
    const p = cellCenter(e.side, ref.reel, ref.row);
    d.s.particles.burst({ x: p.x, y: p.y, count: 10, colors: ['#5ad8e8', '#ff9ec8', '#ffe45c'], speed: [60, 180], gravity: 0, life: [0.25, 0.45], size: [2, 4], kind: 'spark' });
    // A note off the payline shows what it hits for: its share of the drop's final pay (the payline's tags do the same).
    if (ref.row !== 1 && ref.v && g && g.base > 0) d.bg(d.popText(fmtNum(Math.round((g.amount * ref.v) / g.base)), p.x - 22, p.y + 22, 2, '#5ad8e8', 0, 0.9));
  });
  await Promise.all(lights);
  await d.c.wait(0.15);
}

/** MIDAS TOUCH: swords and shields turn gold (a gold rim with 1-3 pips) for the rest of the fight. */
export async function touch(d: Director, e: Ev<'touch'>): Promise<void> {
  const m = d.s.machines[e.side];
  d.s.sounds.lucky();
  const flips = e.cells.map(async (ref, i) => {
    const cell = m.reels[ref.reel]?.cells[ref.index];
    if (!cell) return;
    await d.c.wait(i * 0.06);
    cell.touch = ref.n;
    cell.flash = 0.8;
    d.bg(d.c.tween({ from: 0.8, to: 0, dur: 0.35, onUpdate: (v) => (cell.flash = v) }));
    const row = d.rowOf(e.side, ref);
    if (row >= 0) {
      const p = cellCenter(e.side, ref.reel, row);
      d.s.particles.burst({ x: p.x, y: p.y, count: 14, colors: ['#ffd23f', '#fff6c8'], speed: [60, 200], gravity: 0, life: [0.25, 0.5], size: [2, 4], kind: 'spark' });
    }
  });
  await Promise.all(flips);
  await d.c.wait(0.15);
}
