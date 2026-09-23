import type { SideId, SymbolId } from '../core/config';
import type { CombatEvent } from '../core/events';
import { other, type TurnResult } from '../core/fight';
import type { LineScore } from '../core/scoring';
import type { CellRef } from '../core/strip';
import { backOut, cubicIn, cubicOut, quadOut, sineIn, sineInOut, sineOut } from './ease';
import { Banner, Bubble, FloatText, Lightning, Projectile, TurnCard } from './fx';
import { cellCenter, COLORS, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, W } from './layout';
import type { Stage } from './stage';
import { ABILITY_UI } from './hud';
import { stripMapColumn } from './stripMap';
import type { SpriteId } from '../render/sprites';
import { RELICS } from '../core/relics';

type Ev<T extends CombatEvent['type']> = Extract<CombatEvent, { type: T }>;

const EFFECT_WORD: Record<SymbolId, string> = {
  sword: 'DAMAGE',
  shield: 'SHIELD',
  bolt: 'ENERGY',
  slime: 'SLIME',
  ice: 'FREEZE',
  claw: 'STEAL',
  rock: 'ROCKS',
  lock: 'JAM',
  coin: 'TO THE POT',
  seven: 'DAMAGE',
  empty: 'NOTHING',
  wild: 'WILD',
};

const BATCHABLE = new Set<CombatEvent['type']>(['attack', 'shieldGain', 'energyGain', 'fizzle', 'slime', 'freeze', 'lock', 'steal', 'pot', 'heal']);

/** Banners sit in the top gutter between the HUD panels, never over the reels. */
const BANNER_Y = 172;

/**
 * Turns a TurnResult's event list into choreographed, skippable presentation. Owns the
 * mapping from rules → juice; knows nothing about how the rules work.
 */
export class Director {
  private lastScore: LineScore | null = null;
  private lastSpin: Partial<Record<SideId, { frozen: boolean[]; locked: boolean[] }>> = {};

  constructor(private s: Stage) {}

  async playTurn(result: TurnResult): Promise<void> {
    const evs = result.events;
    for (let i = 0; i < evs.length; i++) {
      // Losses fast, wins linger: on a no-match line, consecutive single-symbol resolves
      // play as one simultaneous beat instead of one after another.
      if (this.lastScore?.tier === 'none' && BATCHABLE.has(evs[i].type)) {
        const batch: CombatEvent[] = [];
        while (i < evs.length && BATCHABLE.has(evs[i].type)) batch.push(evs[i++]);
        i--;
        await Promise.all(batch.map((e) => this.play(e)));
      } else await this.play(evs[i]);
    }
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
      case 'heal':
        return this.heal(e);
      case 'freeze':
        return this.status(e, 'frozen');
      case 'lock':
        return this.status(e, 'locked');
      case 'thaw':
        return this.thaw(e);
      case 'steal':
        return this.steal(e);
      case 'junk':
        return this.junk(e);
      case 'abilityCharge':
        return this.abilityCharge(e);
      case 'ability':
        return this.ability(e);
      case 'pot':
        return this.pot(e);
      case 'potWin':
        return this.potWin(e);
      case 'resist':
        return this.resist(e);
      case 'phase':
        return this.phase(e);
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

  private async banner(text: string, color: string, overshoot: number, hold: number, sub = '', y = BANNER_Y, textScale = 4): Promise<void> {
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

  /** Launch point for an effect: its reel on the payline, or the machine itself for abilities. */
  private srcPoint(side: SideId, reels: number[], i: number) {
    if (reels.length) return cellCenter(side, reels[i % reels.length], 1);
    const c = this.machineCenter(side);
    return { x: c.x + (Math.random() * 2 - 1) * 60, y: c.y + (Math.random() * 2 - 1) * 60 };
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
    const card = this.s.fx.add(new TurnCard(player ? 'PLAYER TURN' : 'ENEMY TURN', player ? COLORS.goldLight : COLORS.slime, BANNER_Y));
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
    this.lastSpin[e.side] = { frozen: e.frozen, locked: e.locked };
    await m.spin(
      e.stops,
      near,
      this.c,
      {
        onNearMiss: () => {
          this.s.sounds.nearMissSting();
          this.s.camera.punchZoom(0.015, 0.9);
        },
      },
      e.frozen,
    );
    if (e.lucky) await this.luckyPop(e.side);
    if (near && e.score.tier !== 'triple') this.missedTriple(e.side, e.score.line[0]);
    await this.winPresentation(e.side, e.score);
  }

  /**
   * Reels 1+2 matched, the slow reel 3 missed: if the triple symbol is sitting one stop off,
   * point at it and groan. Otherwise the tease just ends as a normal double.
   */
  private missedTriple(side: SideId, want: SymbolId): void {
    const reel = this.s.machines[side].reels[2];
    for (const row of [0, 2]) {
      const cell = reel.cellAtRow(row);
      if ((cell.slimed ? 'slime' : cell.symbol) !== want) continue;
      const fx = reel.rows[row];
      fx.glowColor = '#ff5a4a';
      this.bg(this.c.tween({ from: 0.9, to: 0, dur: 0.7, onUpdate: (v) => (fx.glow = v) }));
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (fx.wobble = v) }));
      const p = cellCenter(side, 2, row);
      this.bg(this.popText('SO CLOSE!', p.x - 20, row === 0 ? p.y - 30 : p.y + 30, 2, '#ff8a7a', 10, 0.4));
      this.s.sounds.nearMissAww();
      return;
    }
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
      // Reels 2+3 matching looks like a double but isn't (in-order rule) — say so.
      const [a, b, c] = score.line;
      if (b === c && a !== b) {
        const p = cellCenter(side, 1.5, 0);
        this.bg(this.popText('NO PAIR', p.x, p.y - 20, 2, COLORS.textDim, 12, 0.3));
      }
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
      // Non-blocking: the effects start while the banner is still up.
      this.bg(this.banner('DOUBLE!', COLORS.pair, 1.15, 0.2, sub));
      await this.c.wait(0.3);
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
      await this.banner('JACKPOT!', COLORS.triple, 1.5, 0.6, sub, BANNER_Y, 5);
      this.s.camera.dimTarget = 0;
    }
  }

  private async attack(e: Ev<'attack'>): Promise<void> {
    const color = this.tierColor();
    await this.activate(e.from, e.reels, '#ffffff');
    const target = this.machineCenter(e.to);
    const dir = e.to === 'enemy' ? 1 : -1;
    const big = this.lastScore?.tier === 'triple';

    const srcReels = e.reels.length ? e.reels : [-1];
    const flights = srcReels.map(async (_r, i) => {
      await this.c.wait(i * 0.08);
      const from = this.srcPoint(e.from, e.reels, i);
      const scale = (big && i === e.reels.length - 1) || !e.reels.length ? 6 : 4;
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
    if (e.note === 'pierce') this.bg(this.popText('PIERCE!', target.x, MACHINE_TOP + 8, 3, '#bff4ff', 24, 0.3));
    if (e.note === 'spiked') {
      this.s.sounds.block();
      this.bg(this.popText('SPIKED!', target.x, MACHINE_TOP + 8, 3, '#c9d0dc', 24, 0.3));
    }
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
      const src = this.srcPoint(e.from, e.reels, i);
      const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
      const p = this.s.fx.add(new Projectile('slimeBlob', src.x, src.y, 6, false, COLORS.slime));
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
    await this.banner(`CLEANSED x${e.cells.length}!`, COLORS.goldLight, 1.3, 0.4, '', BANNER_Y, 3);
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

  // ---- writers, abilities, boss --------------------------------------------------------

  private async luckyPop(side: SideId): Promise<void> {
    const m = this.s.machines[side];
    const p = cellCenter(side, 2, 1);
    this.s.sounds.lucky();
    const fx = m.reels[2].rows[1];
    fx.glowColor = '#7dff7a';
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.8, onUpdate: (v) => (fx.glow = v) }));
    this.s.particles.burst({ x: p.x, y: p.y, count: 30, colors: ['#7dff7a', '#ffffff', '#3fbf3a'], speed: [80, 300], gravity: -120, life: [0.4, 0.8], size: [3, 5] });
    const clover = this.s.fx.add(new Projectile('relicClover', p.x, p.y - 50, 4));
    await this.c.tween({ from: 0, to: 1, dur: 0.2, ease: backOut(3), onUpdate: (v) => (clover.scale = 4 * v) });
    this.bg(this.popText('LUCKY!', p.x, p.y - 90, 3, '#7dff7a', 20, 0.3));
    await this.c.wait(0.25);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (clover.alpha = v) }).then(() => this.s.fx.remove(clover)));
  }

  private async heal(e: Ev<'heal'>): Promise<void> {
    const h = this.s.huds[e.side];
    this.s.sounds.heal();
    const b = h.hpBar();
    this.s.particles.burst({ x: b.x + b.w * (e.hp / h.maxHp), y: b.y + b.h / 2, count: 16, colors: ['#7dff7a', '#ffffff'], speed: [40, 160], gravity: -200, life: [0.4, 0.7], size: [2, 4] });
    this.bg(this.popText(`+${e.amount}`, b.x + b.w - 30, b.y - 4, 3, '#7dff7a', 20, 0.3));
    this.bg(this.c.to(h, 'ghost', e.hp, 0.3));
    await this.c.to(h, 'hp', e.hp, 0.3, sineOut);
  }

  /** Freeze (ice shards) or jam (padlocks) the target reels. */
  private async status(e: Ev<'freeze'> | Ev<'lock'>, kind: 'frozen' | 'locked'): Promise<void> {
    const to = this.s.machines[e.to];
    const ice = kind === 'frozen';
    if (e.reels.length) await this.activate(e.from, e.reels, ice ? '#9fe8ff' : '#ffb070');
    const flights = e.targets.map(async (r, i) => {
      await this.c.wait(i * 0.08);
      const src = this.srcPoint(e.from, e.reels, i);
      const dst = cellCenter(e.to, r, 1);
      const p = this.s.fx.add(new Projectile(ice ? 'ice' : 'lock', src.x, src.y, 3, false, ice ? '#9fe8ff' : '#ffb070'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 3, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.35, 90, sineIn);
      this.s.fx.remove(p);
      if (ice) {
        const stop = (e as Ev<'freeze'>).stops[i];
        const reel = to.reels[r];
        if (stop !== undefined && stop !== reel.stop) {
          // Clunk one stop to the least useful visible cell, then freeze solid.
          const len = reel.cells.length;
          const down = (stop - reel.stop + len) % len === len - 1;
          reel.stop = stop;
          this.s.sounds.reelStop(r, 1.3);
          this.bg(this.c.tween({ from: down ? -96 : 96, to: 0, dur: 0.16, ease: backOut(2), onUpdate: (v) => (reel.bounce = v) }));
        }
        to.frozen[r] = Math.max(to.frozen[r], e.turns);
        this.s.sounds.freeze();
      } else {
        to.locked[r] = Math.max(to.locked[r], e.turns);
        this.s.sounds.chains();
      }
      const fxArr = ice ? to.frozenFx : to.lockedFx;
      this.bg(this.c.tween({ from: fxArr[r], to: 1, dur: 0.25, ease: cubicOut, onUpdate: (v) => (fxArr[r] = v) }));
      this.s.particles.burst({
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
      this.shake(3, 0.15);
    });
    await Promise.all(flights);
    const c = this.machineCenter(e.to);
    const label = ice ? `FROZEN ${e.turns} TURN${e.turns > 1 ? 'S' : ''}` : 'JAMMED!';
    this.bg(this.popText(label, c.x, MACHINE_TOP - 4, 3, ice ? '#9fe8ff' : '#ffb070', 16, 0.4));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.2);
  }

  private async thaw(e: Ev<'thaw'>): Promise<void> {
    const m = this.s.machines[e.side];
    const ice = e.status === 'frozen';
    if (ice) this.s.sounds.shatter();
    else this.s.sounds.unchain();
    for (const r of e.reels) {
      if (ice) m.frozen[r] = 0;
      else m.locked[r] = 0;
      const arr = ice ? m.frozenFx : m.lockedFx;
      this.bg(this.c.tween({ from: arr[r], to: 0, dur: 0.3, onUpdate: (v) => (arr[r] = v) }));
      for (let row = 0; row < 3; row++) {
        const p = cellCenter(e.side, r, row);
        if (ice || row === 1)
          this.s.particles.burst({ x: p.x, y: p.y, count: ice ? 10 : 8, colors: ice ? ['#9fe8ff', '#ffffff'] : ['#8a8a96', '#5a4a3a'], speed: [60, 220], gravity: 600, life: [0.3, 0.6], size: [2, 5] });
      }
    }
    await this.c.wait(0.15);
  }

  private async steal(e: Ev<'steal'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#c9a0ff');
    if (!e.cells.length) {
      const c = this.machineCenter(e.to);
      await this.popText('NOTHING TO STEAL', c.x, MACHINE_TOP - 4, 2, COLORS.textDim, 16, 0.2);
      return;
    }
    const grabs = e.cells.map(async (ref, i) => {
      await this.c.wait(i * 0.12);
      const src = this.srcPoint(e.from, e.reels, i);
      const row = Math.max(0, this.rowOf(e.to, ref));
      const dst = cellCenter(e.to, ref.reel, row);
      const claw = this.s.fx.add(new Projectile('claw', src.x, src.y, 4, e.from === 'enemy', '#c9a0ff'));
      this.s.sounds.steal();
      await this.arc(claw, dst.x, dst.y, 0.3, 60, cubicIn);
      const cell = to.reels[ref.reel].cells[ref.index];
      // Snatch: the symbol rides the claw back to the thief.
      const loot = this.s.fx.add(new Projectile(e.symbols[i] as SpriteId, dst.x, dst.y, 4));
      this.bg(this.c.tween({ from: 0, to: 1, dur: 0.2, onUpdate: (v) => (cell.stolen = v) }));
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#c9a0ff', '#ffffff'], speed: [60, 200], gravity: 300, life: [0.2, 0.4], size: [2, 4] });
      await Promise.all([
        this.arc(claw, src.x, src.y, 0.35, 40, sineInOut),
        this.arc(loot, src.x, src.y, 0.35, 40, sineInOut),
        this.c.tween({ from: 4, to: 2, dur: 0.35, onUpdate: (v) => (loot.scale = v) }),
      ]);
      this.s.fx.remove(claw);
      this.s.fx.remove(loot);
    });
    await Promise.all(grabs);
    const c = this.machineCenter(e.to);
    this.bg(this.popText(`STOLEN x${e.cells.length}`, c.x, MACHINE_TOP - 4, 3, '#c9a0ff', 16, 0.3));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.15);
  }

  private async junk(e: Ev<'junk'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#a89a8a');
    // Rocks land in the strip beyond the window: aim them at the strip map.
    for (const [i, ins] of e.inserts.entries()) {
      const src = this.srcPoint(e.from, e.reels, i);
      const dst = stripMapColumn(ins.reel);
      const p = this.s.fx.add(new Projectile('rock', src.x, src.y, 3, false, '#8a8070'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 2, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, i === 0 ? 0.45 : 0.18, 200, sineIn);
      this.s.fx.remove(p);
      const cell = { symbol: 'rock' as const, slimed: false, goo: 0, flash: 1, pop: 0 };
      to.insertCell(ins.reel, ins.index, cell);
      this.bg(this.c.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (cell.pop = v) }));
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
      this.s.sounds.rockThud();
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#8a8070', '#5a5048', '#c9bba8'], speed: [60, 200], gravity: 800, life: [0.3, 0.5], size: [2, 5] });
      this.shake(2, 0.1);
    }
    if (e.inserts.length) {
      const col = stripMapColumn(1);
      this.bg(this.popText(`+${e.inserts.length} ROCK${e.inserts.length > 1 ? 'S' : ''}`, col.x, col.y - 170, 2, '#c9bba8', 14, 0.5));
    }
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.15);
  }

  private async abilityCharge(e: Ev<'abilityCharge'>): Promise<void> {
    const h = this.s.huds[e.side];
    if (e.charge === h.charge) return;
    const rising = e.charge > h.charge;
    h.charge = e.charge;
    if (rising) {
      this.s.sounds.abilityTick();
      this.bg(this.c.tween({ from: 1.6, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (h.chargePunch = v) }));
      await this.c.wait(0.12);
    }
  }

  /** Telegraph pays off: loud, readable, then its effect events play normally. */
  private async ability(e: Ev<'ability'>): Promise<void> {
    const h = this.s.huds[e.side];
    const m = this.s.machines[e.side];
    this.s.sounds.abilityFire();
    this.decay(h, 'abilityFlash', 1, 0.6);
    this.shake(4, 0.25);
    m.payline.alpha = 0;
    this.bg(this.c.tween({ from: 0.8, to: 0, dur: 0.5, onUpdate: (v) => (m.flash = v * 0.5) }));
    await this.banner(`${ABILITY_UI[e.kind].label}!`, '#ff6a5a', 1.35, 0.25);
  }

  private potPos() {
    return { x: W / 2, y: MACHINE_TOP + MACHINE_H / 2 + 110 };
  }

  private async pot(e: Ev<'pot'>): Promise<void> {
    const g = this.s.gutter;
    const dst = this.potPos();
    const n = Math.min(9, e.amount);
    const coins = Array.from({ length: n }, async (_, i) => {
      await this.c.wait(i * 0.05);
      const src = this.srcPoint(e.side, e.reels, i);
      const p = this.s.fx.add(new Projectile('coin', src.x, src.y, 2.5, false, COLORS.energy));
      await this.arc(p, dst.x + (Math.random() * 2 - 1) * 20, dst.y, 0.35, 80, sineIn);
      this.s.fx.remove(p);
      this.s.sounds.coin(i);
      g.pot = Math.min(e.total, g.pot + e.amount / n);
      this.bg(this.c.tween({ from: 1.5, to: 1, dur: 0.2, ease: backOut(3), onUpdate: (v) => (g.potPunch = v) }));
    });
    await Promise.all(coins);
    g.pot = e.total;
    if (e.reels.length) this.settle(e.side, e.reels);
  }

  private async potWin(e: Ev<'potWin'>): Promise<void> {
    const g = this.s.gutter;
    const src = this.potPos();
    const target = this.machineCenter(e.to);
    const playerWins = e.from === 'player';
    if (e.amount <= 0) {
      await this.popText('POT EMPTY', src.x, src.y - 30, 2, COLORS.textDim, 16, 0.2);
      return;
    }
    g.pot = e.amount;
    const big = Math.min(1, e.amount / 15);
    if (e.amount >= 8 || playerWins) this.s.sounds.fanfareJackpot();
    else this.s.sounds.stingerMedium();
    this.bg(this.banner(playerWins ? 'POT STOLEN!' : 'CASH OUT!', playerWins ? COLORS.goldLight : '#ff6a5a', 1.2 + 0.3 * big, 0.4, `${e.amount} DAMAGE`, BANNER_Y, 4));
    const n = Math.min(24, 6 + e.amount);
    const coins = Array.from({ length: n }, async (_, i) => {
      await this.c.wait(i * 0.03);
      const p = this.s.fx.add(new Projectile('coin', src.x, src.y, 3, false, COLORS.energy));
      await this.arc(p, target.x + (Math.random() * 2 - 1) * 100, target.y + (Math.random() * 2 - 1) * 80, 0.4, 120, sineIn);
      this.s.fx.remove(p);
      if (i % 3 === 0) this.s.sounds.coin(i % 12);
    });
    this.bg(this.c.to(g, 'pot', 0, 0.6));
    await Promise.all(coins);
    this.hitstop(Math.round(1 + 3 * big));
    this.shake(3 + 6 * big, 0.25 + 0.3 * big);
    this.s.camera.chromaPulse(0.2 + 0.6 * big);
    this.flashMachine(e.to, 0.5 + 0.5 * big, 0.25);
    this.knockback(e.to, 6 + 10 * big);
    this.s.sounds.hit(e.amount);
    if (playerWins && e.amount >= 8)
      this.s.particles.burst({ x: target.x, y: target.y - 40, count: 80, colors: ['#ffd23f', '#ffe08a', '#fff6c8'], speed: [200, 600], angle: -Math.PI / 2, spread: Math.PI, gravity: 900, life: [0.8, 1.4], size: [4, 7], kind: 'confetti' });
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    this.bg(this.popText(`-${e.hpDamage}`, target.x, MACHINE_TOP + 40, 8, COLORS.energy, 70, 0.5));
    await this.c.wait(0.5);
  }

  /** A relic shrugged an effect off: show which one, loudly. */
  private async resist(e: Ev<'resist'>): Promise<void> {
    const words = { freeze: 'MITTENS!', jam: 'LOCKPICKED!', steal: 'SNAP!' } as const;
    const c = this.machineCenter(e.side);
    this.s.sounds.block();
    this.s.sounds.lucky();
    const icon = this.s.fx.add(new Projectile(RELICS[e.relic].sprite as SpriteId, c.x, c.y - 30, 0));
    await this.c.tween({ from: 0, to: 4, dur: 0.2, ease: backOut(3), onUpdate: (v) => (icon.scale = v) });
    this.bg(this.popText(words[e.what], c.x, c.y - 90, 3, '#7dff7a', 20, 0.3));
    this.s.particles.burst({ x: c.x, y: c.y - 30, count: 20, colors: ['#7dff7a', '#ffffff'], speed: [80, 260], gravity: -100, life: [0.3, 0.6], size: [2, 4] });
    await this.c.wait(0.3);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.2, onUpdate: (v) => (icon.alpha = v) }).then(() => this.s.fx.remove(icon)));
  }

  /** Boss phase 2: the House goes ALL IN and doubles the pot. */
  private async phase(e: Ev<'phase'>): Promise<void> {
    const g = this.s.gutter;
    const m = this.s.machines[e.side];
    this.s.sounds.abilityFire();
    this.s.sounds.fanfareJackpot();
    this.hitstop(4);
    this.shake(8, 0.5);
    this.s.camera.chromaPulse(0.8);
    this.s.camera.flashScreen(0.4, '#ff6a5a');
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.6, onUpdate: (v) => (m.flash = v * 0.6) }));
    g.allIn = true;
    this.bg(this.banner('ALL IN!', '#ff3a2e', 1.2, 0.5, 'THE POT DOUBLES', BANNER_Y, 4));
    const from = g.pot;
    await this.c.tween({ from, to: e.pot, dur: 0.8, ease: sineOut, onUpdate: (v) => (g.pot = v) });
    this.bg(this.c.tween({ from: 1.8, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (g.potPunch = v) }));
    await this.c.wait(0.3);
  }

  private async endTurn(side: SideId): Promise<void> {
    const m = this.s.machines[side];
    // Statuses tick down after the affected side's own spin.
    const ls = this.lastSpin[side];
    if (ls) {
      ls.frozen.forEach((f, r) => f && m.frozen[r] > 0 && m.frozen[r]--);
      ls.locked.forEach((f, r) => f && m.locked[r] > 0 && m.locked[r]--);
      delete this.lastSpin[side];
    }
    this.bg(this.c.to(m.payline, 'alpha', 0, 0.2));
    this.bg(m.focusPayline(this.c, false));
    await this.c.wait(0.05);
  }
}
