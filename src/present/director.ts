import type { SideId, SymbolId } from '../core/config';
import type { CombatEvent } from '../core/events';
import { other, type TurnResult } from '../core/fight';
import type { LineScore } from '../core/scoring';
import type { CellRef } from '../core/strip';
import { backOut, cubicIn, cubicOut, quadOut, sineIn, sineInOut, sineOut } from './ease';
import { Banner, Bubble, FloatText, Lightning, Projectile, TurnCard } from './fx';
import { cellCenter, COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, W } from './layout';
import type { Stage } from './stage';

type Ev<T extends CombatEvent['type']> = Extract<CombatEvent, { type: T }>;

const EFFECT_WORD: Record<SymbolId, string> = { sword: 'DAMAGE', shield: 'SHIELD', bolt: 'ENERGY', slime: 'SLIME' };

/**
 * Turns a TurnResult's event list into choreographed, skippable presentation. Owns the
 * mapping from rules → juice; knows nothing about how the rules work.
 */
export class Director {
  private lastScore: LineScore | null = null;

  constructor(private s: Stage) {}

  async playTurn(result: TurnResult): Promise<void> {
    for (const e of result.events) await this.play(e);
    await this.endTurn(result.side);
  }

  private play(e: CombatEvent): Promise<void> {
    switch (e.type) {
      case 'turnStart':
        return this.turnStart(e);
      case 'shieldReset':
        return this.shieldReset(e);
      case 'spin':
        return this.spin(e);
      case 'attack':
        return this.attack(e);
      case 'shieldGain':
        return this.shieldGain(e);
      case 'energyGain':
        return this.energyGain(e);
      case 'specialFire':
        return this.specialFire(e);
      case 'slime':
        return this.slime(e);
      case 'cleanse':
        return this.cleanse(e);
      case 'fizzle':
        return this.fizzle(e);
      case 'death':
        return this.death(e);
      case 'fightEnd':
        return this.fightEnd(e);
    }
  }

  // ---- helpers -----------------------------------------------------------------------

  private get c() {
    return this.s.clock;
  }

  private shake(amp: number, dur: number): void {
    this.s.camera.shake(amp, dur);
  }

  private hitstop(frames: number): void {
    if (this.s.juice.hitstop) this.c.hitstop(frames);
  }

  /** Fire-and-forget. */
  private bg(p: Promise<unknown>): void {
    void p;
  }

  /** Move an item along a quadratic arc. */
  private arc(item: { x: number; y: number; mark?: () => void }, x1: number, y1: number, dur: number, peak: number, ease = sineInOut): Promise<void> {
    const x0 = item.x;
    const y0 = item.y;
    const cx = (x0 + x1) / 2;
    const cy = Math.min(y0, y1) - peak;
    return this.c.tween({
      dur,
      ease,
      onUpdate: (t) => {
        const u = 1 - t;
        item.x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        item.y = u * u * y0 + 2 * u * t * cy + t * t * y1;
        item.mark?.();
      },
    });
  }

  private popText(text: string, x: number, y: number, scale: number, color: string, rise = 50, hold = 0.35): Promise<void> {
    const t = this.s.fx.add(new FloatText(text, x, y, scale, color));
    t.punch = 0;
    return this.c
      .tween({ from: 0, to: 1, dur: 0.18, ease: backOut(3), onUpdate: (v) => (t.punch = v) })
      .then(() => this.c.wait(hold))
      .then(() =>
        this.c.tween({
          dur: 0.45,
          ease: sineIn,
          onUpdate: (v) => {
            t.y = y - rise * v;
            t.alpha = 1 - v;
          },
        }),
      )
      .then(() => this.s.fx.remove(t));
  }

  private async banner(text: string, color: string, overshoot: number, hold: number, sub = '', y = H / 2 - 40, textScale = 7): Promise<void> {
    if (!this.s.juice.banners) return;
    const b = this.s.fx.add(new Banner(text, color, W / 2, y, textScale));
    b.sub = sub;
    await this.c.tween({ from: 0, to: overshoot, dur: 0.25, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    await this.c.tween({ from: overshoot, to: 1, dur: 0.15, ease: sineIn, onUpdate: (v) => (b.scale = v) });
    await this.c.wait(hold);
    await this.c.tween({ from: 1, to: 0, dur: 0.15, ease: cubicIn, onUpdate: (v) => ((b.scale = 0.6 + 0.4 * v), (b.alpha = v)) });
    this.s.fx.remove(b);
  }

  private flashMachine(side: SideId, amount = 1, dur = 0.14): void {
    const m = this.s.machines[side];
    this.bg(this.c.tween({ from: amount, to: 0, dur, onUpdate: (v) => (m.flash = v) }));
  }

  private knockback(side: SideId, px: number): void {
    const m = this.s.machines[side];
    const dir = side === 'enemy' ? 1 : -1;
    this.bg(
      this.c
        .tween({ from: 0, to: dir * px, dur: 0.05, ease: quadOut, onUpdate: (v) => (m.kx = v) })
        .then(() => this.c.tween({ from: dir * px, to: 0, dur: 0.3, ease: backOut(3), onUpdate: (v) => (m.kx = v) })),
    );
  }

  private decay(obj: object, key: string, from: number, dur: number): void {
    const o = obj as Record<string, number>;
    this.bg(this.c.tween({ from, to: 0, dur, ease: sineOut, onUpdate: (v) => (o[key] = v) }));
  }

  private machineCenter(side: SideId) {
    return { x: MACHINE_CX[side], y: MACHINE_TOP + MACHINE_H / 2 };
  }

  private rowOf(side: SideId, ref: CellRef): number {
    const reel = this.s.machines[side].reels[ref.reel];
    for (let row = 0; row < 3; row++) if (reel.indexAtRow(row) === ref.index) return row;
    return -1;
  }

  private tierColor(): string {
    const t = this.lastScore?.tier;
    return t === 'triple' ? COLORS.triple : t === 'pair' ? COLORS.pair : COLORS.text;
  }

  private tierScale(): number {
    const t = this.lastScore?.tier;
    return t === 'triple' ? 7 : t === 'pair' ? 5 : 4;
  }

  /** Lift the payline symbols on these reels as they "activate". */
  private async activate(side: SideId, reels: number[], color: string): Promise<void> {
    const m = this.s.machines[side];
    reels.forEach((r, i) => {
      const fx = m.reels[r].rows[1];
      fx.glowColor = color;
      this.bg(
        this.c.wait(i * 0.05).then(() =>
          Promise.all([
            this.c.tween({ from: 0, to: -14, dur: 0.12, ease: sineOut, onUpdate: (v) => (fx.lift = v) }),
            this.c.tween({ from: 0, to: 0.8, dur: 0.12, onUpdate: (v) => (fx.glow = v) }),
            this.c.tween({ from: 1, to: 1.12, dur: 0.12, ease: backOut(), onUpdate: (v) => (fx.punch = v) }),
          ]),
        ),
      );
    });
    await this.c.wait(0.14 + (reels.length - 1) * 0.05);
  }

  private settle(side: SideId, reels: number[]): void {
    const m = this.s.machines[side];
    for (const r of reels) {
      const fx = m.reels[r].rows[1];
      this.bg(this.c.to(fx, 'lift', 0, 0.2, backOut(2)));
      this.bg(this.c.to(fx, 'glow', 0, 0.3));
      this.bg(this.c.to(fx, 'punch', 1, 0.2, sineInOut));
    }
  }

  private damageHud(side: SideId, hp: number, shield: number, amount: number): void {
    const h = this.s.huds[side];
    this.bg(this.c.to(h, 'hp', hp, 0.08));
    this.bg(this.c.to(h, 'shield', shield, 0.12));
    this.decay(h, 'hpFlash', 1, 0.25);
    this.decay(h, 'hpShake', Math.min(10, 3 + amount), 0.35);
    this.decay(h, 'portraitFlash', 1, 0.2);
    this.decay(h, 'portraitShake', 4, 0.3);
    this.bg(this.c.wait(0.4).then(() => this.c.to(h, 'ghost', hp, 0.5, sineInOut)));
  }

  // ---- events ------------------------------------------------------------------------

  private async turnStart(e: Ev<'turnStart'>): Promise<void> {
    const { machines, gutter } = this.s;
    gutter.turn = e.turn;
    gutter.side = e.side;
    this.decay(gutter, 'pulse', 1, 0.4);
    this.bg(this.c.to(machines[e.side], 'active', 1, 0.25));
    this.bg(this.c.to(machines[e.side], 'dim', 0, 0.25));
    this.bg(this.c.to(machines[other(e.side)], 'active', 0, 0.25));
    this.bg(this.c.to(machines[other(e.side)], 'dim', 0.25, 0.25));
    if (!this.s.juice.turnCards) return;
    const player = e.side === 'player';
    this.s.sounds.turnCard(player);
    const card = this.s.fx.add(new TurnCard(player ? 'PLAYER TURN' : 'ENEMY TURN', player ? COLORS.goldLight : COLORS.slime, MACHINE_TOP - 4 + MACHINE_H / 2));
    card.x = player ? -W : W;
    await this.c.tween({ from: card.x, to: 0, dur: 0.18, ease: cubicOut, onUpdate: (v) => (card.x = v) });
    this.bg(
      this.c
        .wait(0.22)
        .then(() => this.c.tween({ from: 0, to: player ? W : -W, dur: 0.18, ease: cubicIn, onUpdate: (v) => (card.x = v) }))
        .then(() => this.s.fx.remove(card)),
    );
    await this.c.wait(0.12);
  }

  private async shieldReset(e: Ev<'shieldReset'>): Promise<void> {
    const h = this.s.huds[e.side];
    this.s.sounds.shieldFizz();
    this.decay(h, 'shieldShake', 4, 0.3);
    const b = h.shieldBar();
    this.s.particles.burst({ x: b.x + 40, y: b.y + b.h / 2, count: 14, colors: [COLORS.shield, '#9fd0ff'], speed: [40, 160], gravity: -80, life: [0.3, 0.6], size: [2, 4] });
    await this.c.to(h, 'shield', 0, 0.3, sineIn);
  }

  private async spin(e: Ev<'spin'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.lastScore = e.score;
    m.clearRowFx();
    const near = e.nearMiss && this.s.juice.nearMiss;
    await m.spin(e.stops, near, this.c, {
      onNearMiss: () => {
        this.s.sounds.nearMissSting();
        this.s.camera.punchZoom(0.015, 0.9);
      },
    });
    if (near && e.score.tier !== 'triple') this.s.sounds.nearMissAww();
    await this.winPresentation(e.side, e.score);
  }

  /** Juice §3, mapped to tiers: none → small, pair → medium, triple → jackpot. */
  private async winPresentation(side: SideId, score: LineScore): Promise<void> {
    const m = this.s.machines[side];
    const { tier } = score;
    const matched = score.groups.find((g) => g.matched);
    this.bg(m.focusPayline(this.c, true));
    m.payline.color = tier === 'triple' ? COLORS.triple : tier === 'pair' ? COLORS.goldLight : '#c9b8ff';
    m.payline.alpha = tier === 'none' ? 0.6 : 1;
    await this.c.tween({ dur: tier === 'none' ? 0.12 : 0.2, onUpdate: (v) => (m.payline.progress = v) });

    if (tier === 'none') {
      this.s.sounds.stingerSmall();
      await this.c.wait(0.08);
      return;
    }

    // Per-symbol glow + punch along the matched run, 60ms apart, with ascending dings.
    for (const [i, r] of matched!.reels.entries()) {
      const fx = m.reels[r].rows[1];
      fx.glowColor = tier === 'triple' ? '#ff8a5a' : COLORS.goldLight;
      this.s.sounds.ding(i);
      this.bg(
        this.c
          .tween({ from: 1, to: 1.15, dur: 0.12, ease: backOut(), onUpdate: (v) => (fx.punch = v) })
          .then(() => this.c.tween({ from: 1.15, to: 1, dur: 0.16, ease: sineIn, onUpdate: (v) => (fx.punch = v) })),
      );
      this.bg(this.c.tween({ from: 0, to: 0.75, dur: 0.1, onUpdate: (v) => (fx.glow = v) }).then(() => this.c.to(fx, 'glow', 0.25, 0.5)));
      await this.c.wait(0.06);
    }

    const sym = matched!.symbol;
    const slimeCleanse = sym === 'slime' && side === 'player';
    const sub = slimeCleanse ? 'CLEANSE!' : `${matched!.amount} ${EFFECT_WORD[sym]}`;
    if (tier === 'pair') {
      this.s.sounds.stingerMedium();
      this.shake(3, 0.15);
      this.s.camera.chromaPulse(0.15);
      await this.banner('DOUBLE!', COLORS.pair, 1.15, 0.25, sub, H / 2 - 40, 6);
    } else {
      this.s.sounds.fanfareJackpot();
      this.hitstop(4);
      this.shake(9, 0.5);
      this.s.camera.punchZoom(0.05, 0.45);
      this.s.camera.chromaPulse(0.85);
      this.s.camera.dimTarget = 0.35;
      const c = this.machineCenter(side);
      this.s.particles.burst({
        x: c.x,
        y: c.y - 60,
        count: 200,
        colors: ['#ff3a2e', '#ffd23f', '#3b8ef0', '#5ed15a', '#ffffff', '#ff6ad5'],
        speed: [250, 750],
        angle: -Math.PI / 2,
        spread: Math.PI * 1.2,
        gravity: 700,
        drag: 1.2,
        life: [1.2, 2.2],
        size: [5, 9],
        kind: 'confetti',
      });
      await this.banner('JACKPOT!', COLORS.triple, 1.5, 0.6, sub);
      this.s.camera.dimTarget = 0;
    }
  }

  private async attack(e: Ev<'attack'>): Promise<void> {
    const color = this.tierColor();
    await this.activate(e.from, e.reels, '#ffffff');
    const target = this.machineCenter(e.to);
    const dir = e.to === 'enemy' ? 1 : -1;
    const big = this.lastScore?.tier === 'triple';

    const flights = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.08);
      const from = cellCenter(e.from, r, 1);
      const scale = big && i === e.reels.length - 1 ? 6 : 4;
      const p = this.s.fx.add(new Projectile('swordProjectile', from.x, from.y - 14, scale, dir < 0, '#dfe6f0'));
      p.rot = dir > 0 ? -0.5 : 0.5;
      this.s.sounds.whoosh();
      const tx = target.x - dir * 40 + (Math.random() * 2 - 1) * 30;
      const ty = target.y + (i - (e.reels.length - 1) / 2) * 50;
      this.bg(this.c.tween({ from: p.rot, to: 0, dur: 0.3, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, tx, ty, 0.3, 70, cubicIn);
      this.s.fx.remove(p);
      // Per-projectile impact.
      this.flashMachine(e.to, 0.8, 0.12);
      this.knockback(e.to, 4 + Math.min(10, e.amount));
      this.s.particles.burst({ x: tx, y: ty, count: 16, colors: ['#ffffff', '#ffe08a', '#dfe6f0'], speed: [150, 500], kind: 'spark', gravity: 300, life: [0.15, 0.35], size: [2, 4] });
      this.s.sounds.hit(e.amount / e.reels.length);
      this.shake(Math.min(2 + e.amount, 9), 0.25);
    });
    await Promise.all(flights);
    if (e.amount >= 4) this.hitstop(e.amount >= 9 ? 3 : 1);

    const h = this.s.huds[e.to];
    if (e.blocked > 0) {
      this.s.sounds.block();
      const sb = h.shieldBar();
      this.decay(h, 'shieldFlash', 1, 0.25);
      this.decay(h, 'shieldShake', 5, 0.3);
      this.s.particles.burst({ x: sb.x + 30, y: sb.y + 8, count: 20, colors: [COLORS.shield, '#ffffff', '#9fd0ff'], speed: [100, 350], kind: 'spark', gravity: 200, life: [0.2, 0.4] });
      this.bg(this.popText(`BLOCK ${e.blocked}`, sb.x + sb.w - 60, sb.y + sb.h / 2, 3, '#9fd0ff', 16, 0.3));
    }
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    if (e.hpDamage > 0) this.bg(this.popText(`-${e.hpDamage}`, target.x, MACHINE_TOP + 40, this.tierScale(), color, 60));
    else this.bg(this.popText('BLOCKED!', target.x, MACHINE_TOP + 40, 4, '#9fd0ff', 40));
    this.settle(e.from, e.reels);
    await this.c.wait(0.25);
  }

  private async shieldGain(e: Ev<'shieldGain'>): Promise<void> {
    await this.activate(e.side, e.reels, COLORS.shield);
    const h = this.s.huds[e.side];
    const sb = h.shieldBar();
    const hops = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.06);
      const from = cellCenter(e.side, r, 1);
      const p = this.s.fx.add(new Projectile('shield', from.x, from.y - 14, 2.5, false, COLORS.shield));
      await this.arc(p, sb.x + 20 + i * 20, sb.y + sb.h / 2, 0.28, 40, sineInOut);
      this.s.fx.remove(p);
      this.s.particles.burst({ x: p.x, y: p.y, count: 8, colors: [COLORS.shield, '#ffffff'], speed: [60, 200], gravity: 0, life: [0.2, 0.4], size: [2, 4] });
    });
    await Promise.all(hops);
    this.s.sounds.shieldGain(e.amount);
    this.decay(h, 'shieldFlash', 1, 0.3);
    this.bg(this.c.to(h, 'shield', e.total, 0.25, sineOut));
    this.bg(this.popText(`+${e.amount}`, sb.x + sb.w - 24, sb.y + sb.h / 2, 3, '#9fd0ff', 16, 0.3));
    const c = this.machineCenter(e.side);
    const bubble = this.s.fx.add(new Bubble(c.x, c.y, '#7fc0ff'));
    this.bg(
      this.c
        .tween({
          dur: 0.55,
          ease: sineOut,
          onUpdate: (v) => {
            bubble.r = 170 + 30 * v;
            bubble.alpha = 0.9 * (1 - v);
          },
        })
        .then(() => this.s.fx.remove(bubble)),
    );
    this.settle(e.side, e.reels);
    await this.c.wait(0.2);
  }

  private async energyGain(e: Ev<'energyGain'>): Promise<void> {
    await this.activate(e.side, e.reels, COLORS.energy);
    const h = this.s.huds[e.side];
    const before = e.total - e.amount;
    const zaps = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.05);
      const from = cellCenter(e.side, r, 1);
      const pip = h.pipPos(Math.min(h.energyMax - 1, before + i));
      const p = this.s.fx.add(new Projectile('bolt', from.x, from.y - 14, 2.5, false, COLORS.energy));
      await this.arc(p, pip.x, pip.y, 0.22, 30, cubicIn);
      this.s.fx.remove(p);
    });
    await Promise.all(zaps);
    // Light pips one by one (capped at the bar; overflow shows after the special fires).
    const lit = Math.min(h.energyMax, e.total);
    for (let i = Math.floor(h.energy); i < lit; i++) {
      h.energy = i + 1;
      this.s.sounds.energyPip(i);
      this.bg(this.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
      const p = h.pipPos(i);
      this.s.particles.burst({ x: p.x, y: p.y, count: 6, colors: [COLORS.energy, '#ffffff'], speed: [60, 180], gravity: 0, life: [0.15, 0.3], size: [2, 3] });
      await this.c.wait(0.07);
    }
    const p0 = h.pipPos(0);
    this.bg(this.popText(`+${e.amount}`, p0.x - 44, p0.y - 22, 3, COLORS.energy, 24, 0.2));
    this.settle(e.side, e.reels);
    await this.c.wait(0.15);
  }

  private async specialFire(e: Ev<'specialFire'>): Promise<void> {
    const h = this.s.huds[e.from];
    const cam = this.s.camera;
    // Charge.
    this.s.sounds.specialCharge();
    cam.dimTarget = 0.5;
    this.bg(this.c.tween({ from: 0, to: 1, dur: 0.45, onUpdate: (v) => (h.energyFlash = v * 0.8) }));
    for (let i = 0; i < h.energyMax; i++) {
      const p = h.pipPos(i);
      this.s.particles.burst({ x: p.x, y: p.y, count: 5, colors: [COLORS.energy, '#ffffff'], speed: [80, 220], angle: -Math.PI / 2, spread: 1.2, gravity: -200, life: [0.3, 0.5], size: [2, 4] });
    }
    await this.c.wait(0.45);

    // Strike.
    const target = this.machineCenter(e.to);
    const bolt = this.s.fx.add(new Lightning(target.x + (Math.random() * 2 - 1) * 40, -20, target.x, target.y));
    this.s.sounds.thunder();
    this.hitstop(4);
    cam.flashScreen(0.85, '#fff6c8');
    cam.chromaPulse(0.85);
    this.shake(9, 0.5);
    cam.punchZoom(0.05, 0.45);
    this.flashMachine(e.to, 1, 0.3);
    this.knockback(e.to, 16);
    this.s.particles.burst({ x: target.x, y: target.y, count: 60, colors: [COLORS.energy, '#ffffff', '#fff6c8'], speed: [200, 700], kind: 'spark', gravity: 400, life: [0.2, 0.6], size: [3, 5] });
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    h.energyFlash = 0;
    this.bg(this.popText(`-${e.hpDamage}`, target.x, MACHINE_TOP + 40, 8, COLORS.energy, 70, 0.5));
    for (let i = 0; i < 3; i++) {
      await this.c.tween({ from: 1, to: 0.2, dur: 0.08, onUpdate: (v) => (bolt.alpha = v) });
      bolt.reroll();
      bolt.alpha = 1;
    }
    await this.c.tween({ from: 1, to: 0, dur: 0.15, onUpdate: (v) => (bolt.alpha = v) });
    this.s.fx.remove(bolt);
    cam.dimTarget = 0;

    // Drain, then refill any overflow visibly.
    await this.c.to(h, 'energy', 0, 0.2, sineIn);
    const refill = Math.min(h.energyMax, e.energyLeft);
    for (let i = 0; i < refill; i++) {
      h.energy = i + 1;
      this.s.sounds.energyPip(i);
      this.bg(this.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
      await this.c.wait(0.08);
    }
    await this.c.wait(0.2);
  }

  private async slime(e: Ev<'slime'>): Promise<void> {
    const from = this.s.machines[e.from];
    const to = this.s.machines[e.to];
    // Wind-up wobble on the enemy's slime symbols.
    for (const r of e.reels) {
      const fx = from.reels[r].rows[1];
      fx.glowColor = COLORS.slime;
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.35, onUpdate: (v) => (fx.wobble = v) }));
      this.bg(this.c.tween({ from: 0.8, to: 0.2, dur: 0.35, onUpdate: (v) => (fx.glow = v) }));
    }
    await this.c.wait(0.2);
    this.s.sounds.slimeLaunch();

    if (e.cells.length === 0) {
      const c = this.machineCenter(e.to);
      await this.popText('NO TARGET', c.x, MACHINE_TOP + 40, 3, COLORS.textDim, 30, 0.2);
      return;
    }
    const flood = e.cells.length >= 9;
    const blobs = e.cells.map(async (ref, i) => {
      await this.c.wait(i * (flood ? 0.04 : 0.07));
      const row = this.rowOf(e.to, ref);
      const src = cellCenter(e.from, e.reels[i % e.reels.length], 1);
      const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
      const p = this.s.fx.add(new Projectile('slimeBlob', src.x, src.y, 4, false, COLORS.slime));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 4, dur: 0.45, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.45, 150, sineInOut);
      this.s.fx.remove(p);
      // Splat.
      const cell = to.reels[ref.reel].cells[ref.index];
      cell.slimed = true;
      this.bg(this.c.to(cell, 'goo', 1, 0.2, cubicOut));
      if (row >= 0) {
        const fx = to.reels[ref.reel].rows[row];
        this.bg(this.c.tween({ from: 0.8, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (fx.punch = v) }));
      }
      this.s.sounds.slimeSplat();
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 14, colors: [COLORS.slime, '#2f8f3a', '#b6ff9a'], speed: [80, 300], gravity: 900, life: [0.3, 0.6], size: [3, 6] });
    });
    await Promise.all(blobs);
    if (e.cells.length >= 4) this.shake(flood ? 7 : 3, 0.3);
    if (flood) {
      this.s.sounds.slimeFlood();
      to.wash.color = COLORS.slime;
      await this.c.tween({ dur: 0.6, onUpdate: (v) => (to.wash.t = v) });
      to.wash.t = -1;
    }
    if (e.wasted > 0) {
      const c = this.machineCenter(e.to);
      this.bg(this.popText(`${e.wasted} WASTED`, c.x, MACHINE_TOP + 40, 2, COLORS.textDim, 20, 0.2));
    }
    this.settle(e.from, e.reels);
    await this.c.wait(0.2);
  }

  private async cleanse(e: Ev<'cleanse'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.cleanse();
    m.payline.color = '#fff6c8';
    m.wash.color = '#fff6c8';
    this.bg(this.c.tween({ dur: 0.5, onUpdate: (v) => (m.wash.t = v) }).then(() => (m.wash.t = -1)));
    const visible = e.cells.filter((ref) => this.rowOf(e.side, ref) >= 0);
    const hidden = e.cells.filter((ref) => this.rowOf(e.side, ref) < 0);
    for (const ref of hidden) Object.assign(m.reels[ref.reel].cells[ref.index], { slimed: false, goo: 0 });
    for (const [i, ref] of visible.entries()) {
      const cell = m.reels[ref.reel].cells[ref.index];
      const pos = cellCenter(e.side, ref.reel, this.rowOf(e.side, ref));
      this.s.sounds.pop(i);
      this.bg(this.c.to(cell, 'goo', 0, 0.25, sineIn).then(() => (cell.slimed = false)));
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
      this.s.particles.burst({ x: pos.x, y: pos.y, count: 12, colors: ['#ffffff', '#fff6c8', COLORS.slime], speed: [60, 220], gravity: -300, life: [0.4, 0.8], size: [2, 4] });
      await this.c.wait(0.05);
    }
    await this.banner(`CLEANSED x${e.cells.length}!`, COLORS.goldLight, 1.3, 0.4, '', H / 2 - 40, 5);
  }

  private async fizzle(e: Ev<'fizzle'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.fizzle();
    for (const r of e.reels) {
      const fx = m.reels[r].rows[1];
      this.bg(this.c.tween({ from: 0.6, to: 0, dur: 0.3, onUpdate: (v) => (fx.wobble = v) }));
      const c = cellCenter(e.side, r, 1);
      this.bg(this.popText('...', c.x, c.y - 30, 3, COLORS.textDim, 16, 0.1));
    }
    await this.c.wait(0.2);
  }

  private async death(e: Ev<'death'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.hitstop(8);
    this.s.sounds.death();
    this.shake(9, 0.8);
    this.s.camera.flashScreen(0.6);
    this.s.camera.chromaPulse(0.6);
    this.s.huds[e.side].portraitFlash = 1;
    await this.c.wait(0.2);
    await Promise.all([
      this.c.to(m, 'desat', 1, 0.8, sineOut),
      this.c.to(m, 'tilt', e.side === 'enemy' ? 0.08 : -0.08, 0.8, backOut(2)),
      this.c.to(m, 'drop', 20, 0.8, backOut(2)),
      this.c.to(m, 'active', 0, 0.3),
    ]);
  }

  private async fightEnd(e: Ev<'fightEnd'>): Promise<void> {
    const win = e.winner === 'player';
    if (win) this.s.sounds.victory();
    else this.s.sounds.defeat();
    if (win)
      this.s.particles.burst({
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
    const b = this.s.fx.add(new Banner(win ? 'VICTORY!' : 'DEFEAT', win ? COLORS.goldLight : COLORS.danger, W / 2, H / 2 - 40, 9));
    b.sub = `${Math.ceil(e.turns / 2)} ROUNDS`;
    await this.c.tween({ from: 0, to: 1.4, dur: 0.3, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    await this.c.tween({ from: 1.4, to: 1, dur: 0.2, ease: sineIn, onUpdate: (v) => (b.scale = v) });
    await this.c.wait(1.6);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (b.alpha = v) }).then(() => this.s.fx.remove(b)));
  }

  private async endTurn(side: SideId): Promise<void> {
    const m = this.s.machines[side];
    this.bg(this.c.to(m.payline, 'alpha', 0, 0.2));
    this.bg(m.focusPayline(this.c, false));
    await this.c.wait(0.05);
  }
}
