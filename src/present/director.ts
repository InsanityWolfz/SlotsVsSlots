import { OWNER_RULES, ownerRung } from '../core/enemies';
import { UNIT, type SideId, type SymbolId } from '../core/config';
import type { CombatEvent } from '../core/events';
import { other, type TurnResult } from '../core/fight';
import type { LineScore } from '../core/scoring';
import type { CellRef } from '../core/strip';
import { backOut, cubicIn, cubicOut, quadOut, sineIn, sineInOut, sineOut } from './ease';
import { Banner, FloatText, TurnCard } from './fx';
import { cellCenter, COLORS, MACHINE_CX, MACHINE_H, MACHINE_TOP, RELIC_FEED, W } from './layout';
import type { Stage } from './stage';
import { abilityName } from './hud';
import { fmtNum } from '../render/text';
import { RELICS } from '../core/relics';
import { T } from '../ui/kit';
import { BANNER_Y, bonusReel, luckyWilds, missedTriple, setTag, winPresentation } from './directorPay';
import { drop, energyGain, meter, payoff, specialFire, storm, touch } from './directorMeter';
import { blast, bomb, cleanse, confiscate, defuse, fake, fakeTick, fizzle, fuse, gulp, hex, junk, markCells, markedHit, rake, recover, slime, status, steal, thaw } from './directorTricks';
import { allInHit, betPlaced, betSwept, dealerHand, lineCard, noMoreBets, phase, pot, potWin, wheelFast } from './directorBoss';
import { attack, death, fightEnd, heal, phoenix, shieldGain } from './directorHits';

export { climbSteps, LADDER, noteStep } from './directorPay';

export type Ev<T extends CombatEvent['type']> = Extract<CombatEvent, { type: T }>;



/** Events that ride inside a lightning storm (strikes, their echoes, Fang / payoff heals). */
const STORM_PART = (e: CombatEvent) =>
  e.type === 'specialFire' || (e.type === 'relic' && (e.relic === 'overcharge' || e.relic === 'fang')) || (e.type === 'heal' && (e.source === 'fang' || e.source === 'payoff'));

const BATCHABLE = new Set<CombatEvent['type']>(['attack', 'shieldGain', 'energyGain', 'fizzle', 'slime', 'freeze', 'lock', 'steal', 'pot', 'heal', 'bomb', 'hex']);

/** Where a relic's name pops (the RELICS header row). */

/** An enemy turn whose hits come to at most this share of your max HP plays at double speed. */
const QUIET_ENEMY_HIT = 0.08;

/**
 * Turns a TurnResult's event list into choreographed, skippable presentation. Owns the
 * mapping from rules → juice; knows nothing about how the rules work.
 */
export class Director {
  lastScore: LineScore | null = null;
  /** The last spin's final stops per side (the payline numbers read the landed cells, not mid-spin ones). */
  lastStops: Partial<Record<SideId, number[]>> = {};
  /** THE DROP's lit cells: the next player attack flies a note from each. */
  dropCells: { reel: number; row: number }[] | null = null;
  private lastSpin: Partial<Record<SideId, { frozen: boolean[]; locked: boolean[]; hexed: boolean[] }>> = {};

  constructor(public s: Stage) {}

  /** This turn's events: a pay can say what its writing really did (a freeze the caps cut short: playtest 2026-11-08). */
  turnEvents: CombatEvent[] = [];

  async playTurn(result: TurnResult): Promise<void> {
    const evs = result.events;
    this.turnEvents = evs;
    // A quiet turn (no jackpot, ability, special, bonus or death, and little damage) plays 1.5x faster.
    const loud = new Set<CombatEvent['type']>(['ability', 'specialFire', 'death', 'fightEnd', 'noMoreBets', 'wheelFast', 'phoenix', 'potWin', 'payoff' as CombatEvent['type']]);
    const dealt = evs.reduce((a, e) => a + (e.type === 'attack' ? e.amount : 0), 0);
    const calm = !evs.some((e) => loud.has(e.type) || (e.type === 'spin' && e.score.tier === 'triple'));
    // The enemy's routine turns are the waiting half of a fight (feel playtest: dead air): one that does little plays
    // at double speed; a quiet turn of yours at 1.5x. Anything that matters (an ability, a jackpot, a real hit) plays
    // at full length.
    const enemyTurn = evs.find((e) => e.type === 'turnStart')?.side === 'enemy';
    const small = enemyTurn ? dealt <= this.s.huds.player.maxHp * QUIET_ENEMY_HIT : dealt <= 2 * UNIT;
    this.c.boost = calm && small ? (enemyTurn ? 2 : 1.5) : 1;
    for (let i = 0; i < evs.length; i++) {
      // More than one lightning strike in a turn plays as ONE storm (length grows with the log of the count).
      if (evs[i].type === 'specialFire') {
        let j = i;
        while (j < evs.length && STORM_PART(evs[j])) j++;
        const group = evs.slice(i, j);
        if (group.filter((x) => x.type === 'specialFire').length >= 2) {
          await storm(this, group);
          i = j - 1;
          continue;
        }
      }
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
    this.c.boost = 1;
  }

  play(e: CombatEvent): Promise<void> {
    return this.playEvent(e);
  }

  private playEvent(e: CombatEvent): Promise<void> {
    switch (e.type) {
      case 'turnStart':
        return this.turnStart(e);
      case 'shieldReset':
        return this.shieldReset(e);
      case 'spin':
        return this.spin(e);
      case 'attack':
        return attack(this, e);
      case 'shieldGain':
        return shieldGain(this, e);
      case 'energyGain':
        return energyGain(this, e);
      case 'meter':
        return meter(this, e);
      case 'touch':
        return touch(this, e);
      case 'payoff':
        return payoff(this, e);
      case 'drop':
        // Played with its spin (before the banner).
        return Promise.resolve();
      case 'specialFire':
        return specialFire(this, e);
      case 'slime':
        return slime(this, e);
      case 'cleanse':
        return cleanse(this, e);
      case 'recover':
        return recover(this, e);
      case 'fizzle':
        return fizzle(this, e);
      case 'glassBreak':
        return this.glassBreak(e);
      case 'ownerPhase':
        return this.banner(['', 'HE LOOSENS HIS TIE', 'HE STANDS UP', 'HE GOES ALL IN'][e.phase] ?? '', '#ff6a5a', 1.3, 0.35, `YOU TOOK ${fmtNum(ownerRung(e.phase))} OF HIS FORTUNE: HIS HITS ARE ${Math.round(OWNER_RULES.phaseDmg * e.phase * 100)}% HARDER`, BANNER_Y, 3);
      case 'secondLine':
        return this.secondLine(e);
      case 'death':
        return death(this, e);
      case 'fightEnd':
        return fightEnd(this, e);
      case 'heal':
        if (e.source in RELICS) this.relicPop(e.side, e.source);
        return heal(this, e);
      case 'freeze':
        return status(this, e, 'frozen');
      case 'lock':
        return status(this, e, 'locked');
      case 'thaw':
        return thaw(this, e);
      case 'steal':
        return steal(this, e);
      case 'junk':
        return junk(this, e);
      case 'abilityCharge':
        return this.abilityCharge(e);
      case 'ability':
        return this.ability(e);
      case 'pot':
        return pot(this, e);
      case 'potWin':
        return potWin(this, e);
      case 'relic':
        this.relicPop(e.side, e.relic);
        for (const ins of e.inserts ?? []) {
          const cell = { symbol: 'wild' as const, slimed: false, goo: 0, flash: 1, pop: 0 };
          this.s.machines[e.side].insertCell(ins.reel, ins.index, cell);
          this.bg(this.c.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (cell.pop = v) }));
          this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
        }
        return this.c.wait(0.12);
      case 'phase':
        return phase(this, e);
      case 'hex':
        return hex(this, e);
      case 'bomb':
        return bomb(this, e);
      case 'fuse':
        return fuse(this, e);
      case 'defuse':
        return defuse(this, e);
      case 'blast':
        return blast(this, e);
      case 'gulp':
        return gulp(this, e);
      case 'phoenix':
        this.relicPop(e.side, 'phoenix');
        return phoenix(this, e);
      case 'betPlaced':
        return betPlaced(this, e);
      case 'betSwept':
        return betSwept(this, e);
      case 'noMoreBets':
        return noMoreBets(this, e);
      case 'wheelFast':
        return wheelFast(this, e);
      case 'fake':
        return fake(this, e);
      case 'fakeTick':
        return fakeTick(this, e);
      case 'mark':
        return markCells(this, e);
      case 'markedHit':
        return markedHit(this, e);
      case 'confiscate':
        return confiscate(this, e);
      case 'rake':
        return rake(this, e);
      case 'lineCard':
        return lineCard(this, e);
      case 'lineCardUsed':
        this.s.machines[e.side].lineCard = null;
        return Promise.resolve();
      case 'allInArmed':
        this.s.gutter.allInArmed = true;
        this.s.sounds.stingerMedium();
        this.s.gutter.allInCap = e.cap;
        this.s.gutter.allInFloor = e.floor;
        return this.banner('ALL IN NEXT TURN!', '#ff6a5a', 1.2, 0.3, `${e.floor === e.cap ? fmtNum(e.cap) : `${fmtNum(e.floor)} TO ${fmtNum(e.cap)}`}. IT PIERCES SHIELDS`, MACHINE_TOP + MACHINE_H / 2, 3);
      case 'closing': {
        const c = this.machineCenter('enemy');
        this.s.sounds.click();
        return this.popText(`CLOSING TIME IN ${e.left}`, c.x, MACHINE_TOP - 22, 2, '#ff6a5a', 12, 0.6);
      }
      case 'closingTime':
        this.s.sounds.stingerMedium();
        return this.banner('CLOSING TIME!', '#ff6a5a', 1.2, 0.4, 'THE FIGHT RAN TOO LONG. YOU LOSE', BANNER_Y, 3);
      case 'makeItRain': {
        // MAKE IT RAIN!: a callout, a shower of coins (sound), and the HUD's chip count follows.
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(4);
        this.s.sounds.coin(8);
        this.s.sounds.coin(12);
        return this.popText('MAKE IT RAIN!', c.x, MACHINE_TOP + 30, 4, '#7dff7a', 30, 0.5);
      }
      case 'midasChips': {
        if (e.side === 'player') this.s.huds.player.chips = this.s.huds.player.chipsHeld + e.total;
        // (A cost you pay, MAKE IT RAIN's or GOLDEN PARACHUTE's: it read "THE HOUSE SKIMS 10 CHIPS", and "0 CHIPS"
        // with OPEN BAR. Nothing pops when nothing moved.)
        if (e.amount === 0) return Promise.resolve();
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(6);
        this.s.sounds.coin(10);
        const n = Math.abs(e.amount);
        return this.popText(`${e.amount > 0 ? '+' : '-'}${n} CHIP${n > 1 ? 'S' : ''}`, c.x - 80, MACHINE_TOP - 22, 2, e.amount > 0 ? '#ffd23f' : '#ff8a7a', 14, 0.35);
      }
      case 'stickyChips': {
        // STICKY FINGERS: banked on a win (the RESULTS line counts them); its relic already popped.
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(9);
        return this.popText(`+${e.amount} CHIP${e.amount > 1 ? 'S' : ''}`, c.x - 80, MACHINE_TOP - 22, 2, '#ffd23f', 14, 0.35);
      }
      case 'lucreChips': {
        if (e.side === 'player') this.s.huds.player.lucre = e.total;
        // LUCRE: banked on a win (the RESULTS line counts them).
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(8);
        return this.popText(`CHIP CHARM +${e.amount}`, c.x + 80, MACHINE_TOP - 22, 2, '#ffd23f', 14, 0.35);
      }
      case 'buildUp':
        return this.buildUp(e);
      case 'overtime':
        this.s.sounds.stingerMedium();
        return this.banner('OVERTIME!', '#ff9a3a', 1.2, 0.3, 'BOTH MACHINES HIT HARDER WITH EACH OF YOUR SPINS', BANNER_Y, 3);
      case 'lastCall':
        this.s.sounds.stingerMedium();
        return this.banner('LAST CALL!', '#ff6a5a', 1.2, 0.3, e.house ? 'THE HOUSE SKIMS EVERY TURN NOW' : 'ITS HITS GROW EVERY TURN NOW', BANNER_Y, 3);
      case 'hpCost': {
        // LIVE WIRE: the storm's price comes off your own HP bar.
        const h = this.s.huds[e.side];
        const b = h.hpBar();
        this.s.sounds.coin(1);
        this.bg(this.popText(`-${e.amount}`, b.x + b.w - 30, b.y - 4, 2.5, '#ff8a7a', 16, 0.3));
        this.bg(this.c.to(h, 'ghost', e.hp, 0.5));
        return this.c.to(h, 'hp', e.hp, 0.2, sineOut);
      }
      case 'coverCharge': {
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(1);
        return this.popText(`COVER CHARGE: -${e.amount} THROUGH YOUR SHIELD`, c.x, MACHINE_TOP - 22, 2, '#ff8a7a', 12, 0.5);
      }
      case 'allInHit':
        return allInHit(this, e);
      case 'dealNext':
        this.s.gutter.nextDeal = e.card;
        return Promise.resolve();
      case 'dealerHand':
        return dealerHand(this, e);
    }
  }

  // ---- helpers -----------------------------------------------------------------------

  /** One of your relics just did something: its icon pops, hops and flashes, and says its name. */
  private relicPop(side: SideId, relic: string): void {
    if (side !== 'player') return;
    const i = this.s.relics.indexOf(relic);
    if (i < 0) return;
    this.s.relicPops[relic] = 1;
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.8, ease: sineIn, onUpdate: (v) => (this.s.relicPops[relic] = v) }));
    this.s.sounds.coin(6 + (i % 6));
    // The relic feed (game.ts drawRelicFeed): a new row on top, or the same relic counting up.
    const feed = this.s.relicFeed;
    const now = this.c.time;
    const row = feed.find((r) => r.relic === relic);
    if (row) {
      row.count++;
      row.born = now;
    } else {
      feed.unshift({ relic, born: now, count: 1, y: RELIC_FEED.y - RELIC_FEED.row });
      if (feed.length > RELIC_FEED.max) feed.length = RELIC_FEED.max;
    }
  }

  get c() {
    return this.s.clock;
  }

  shake(amp: number, dur: number): void {
    this.s.camera.shake(amp, dur);
  }

  hitstop(frames: number): void {
    if (this.s.juice.hitstop) this.c.hitstop(frames);
  }

  /** Fire-and-forget. */
  bg(p: Promise<unknown>): void {
    void p;
  }

  /** Move an item along a quadratic arc. */
  arc(item: { x: number; y: number; mark?: () => void }, x1: number, y1: number, dur: number, peak: number, ease = sineInOut): Promise<void> {
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

  /** BLOCK n: small, in the shield bar's right end, no rise (it was HEAD size and rose over the HP number: playtest). */
  blockPop(sb: { x: number; y: number; w: number; h: number }, blocked: number): void {
    this.bg(this.popText(`BLOCK ${blocked}`, sb.x + sb.w - 46, sb.y + sb.h / 2, 1.5, '#9fd0ff', 0, 0.45));
  }

  popText(text: string, x: number, y: number, scale: number, color: string, rise = 50, hold = 0.35, plate = false): Promise<void> {
    // The kit's text sizes (nothing under SMALL); a giant number stays a display number.
    const size = scale <= 1.8 ? T.small : scale < 2.5 ? T.body : scale <= 3.5 ? T.head : scale <= 5 ? T.title : scale;
    const t = this.s.fx.add(new FloatText(text, x, y, size, color));
    // A callout along a machine's top edge lands where the turn banner (YOUR SPIN / THEIR SPIN) hangs: on a plate it
    // reads over the banner instead of tangling with its letters.
    t.plate = plate || (size <= T.head && y > MACHINE_TOP - 60 && y < MACHINE_TOP + 10);
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

  async banner(text: string, color: string, overshoot: number, hold: number, sub: string | { text: string; color: string }[] = '', y = BANNER_Y, textScale = 4): Promise<void> {
    if (!this.s.juice.banners) return;
    const b = this.s.fx.add(new Banner(text, color, W / 2, y, textScale));
    if (typeof sub === 'string') b.sub = sub;
    else {
      // The equation builds up part by part.
      b.subParts = sub;
      b.reveal = 0;
      void (async () => {
        for (let i = 1; i <= sub.length; i++) {
          await this.c.wait(i === 1 ? 0.12 : 0.07);
          b.reveal = i;
          if (i === sub.length || i === 5) this.s.sounds.coin(i);
        }
      })();
    }
    await this.c.tween({ from: 0, to: overshoot, dur: 0.25, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    await this.c.tween({ from: overshoot, to: 1, dur: 0.15, ease: sineIn, onUpdate: (v) => (b.scale = v) });
    await this.c.wait(hold);
    await this.c.tween({ from: 1, to: 0, dur: 0.15, ease: cubicIn, onUpdate: (v) => ((b.scale = 0.6 + 0.4 * v), (b.alpha = v)) });
    this.s.fx.remove(b);
  }

  flashMachine(side: SideId, amount = 1, dur = 0.14): void {
    const m = this.s.machines[side];
    this.bg(this.c.tween({ from: amount, to: 0, dur, onUpdate: (v) => (m.flash = v) }));
  }

  knockback(side: SideId, px: number): void {
    const m = this.s.machines[side];
    const dir = side === 'enemy' ? 1 : -1;
    this.bg(
      this.c
        .tween({ from: 0, to: dir * px, dur: 0.05, ease: quadOut, onUpdate: (v) => (m.kx = v) })
        .then(() => this.c.tween({ from: dir * px, to: 0, dur: 0.3, ease: backOut(3), onUpdate: (v) => (m.kx = v) })),
    );
  }

  decay(obj: object, key: string, from: number, dur: number): void {
    const o = obj as Record<string, number>;
    this.bg(this.c.tween({ from, to: 0, dur, ease: sineOut, onUpdate: (v) => (o[key] = v) }));
  }

  machineCenter(side: SideId) {
    return { x: MACHINE_CX[side], y: MACHINE_TOP + MACHINE_H / 2 };
  }

  /** Launch point for an effect: its reel on the payline, or the machine itself for abilities. */
  srcPoint(side: SideId, reels: number[], i: number) {
    if (reels.length) return cellCenter(side, reels[i % reels.length], 1);
    const c = this.machineCenter(side);
    return { x: c.x + (Math.random() * 2 - 1) * 60, y: c.y + (Math.random() * 2 - 1) * 60 };
  }

  rowOf(side: SideId, ref: CellRef): number {
    const reel = this.s.machines[side].reels[ref.reel];
    for (let row = 0; row < 3; row++) if (reel.indexAtRow(row) === ref.index) return row;
    return -1;
  }

  tierColor(): string {
    const t = this.lastScore?.tier;
    return t === 'triple' ? COLORS.triple : t === 'pair' ? COLORS.pair : COLORS.text;
  }

  tierScale(): number {
    const t = this.lastScore?.tier;
    return t === 'triple' ? 7 : t === 'pair' ? 5 : 4;
  }

  /** Lift the payline symbols on these reels as they "activate". */
  async activate(side: SideId, reels: number[], color: string): Promise<void> {
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

  settle(side: SideId, reels: number[]): void {
    const m = this.s.machines[side];
    for (const r of reels) {
      const fx = m.reels[r].rows[1];
      this.bg(this.c.to(fx, 'lift', 0, 0.2, backOut(2)));
      this.bg(this.c.to(fx, 'glow', 0, 0.3));
      this.bg(this.c.to(fx, 'punch', 1, 0.2, sineInOut));
    }
  }

  damageHud(side: SideId, hp: number, shield: number, amount: number): void {
    const h = this.s.huds[side];
    this.bg(this.c.to(h, 'hp', hp, 0.08));
    this.bg(this.c.to(h, 'shield', shield, 0.12));
    this.decay(h, 'hpFlash', 1, 0.25);
    this.decay(h, 'hpShake', Math.min(10, 3 + amount / UNIT), 0.35);
    this.decay(h, 'portraitFlash', 1, 0.2);
    this.decay(h, 'portraitShake', 4, 0.3);
    this.bg(this.c.wait(0.4).then(() => this.c.to(h, 'ghost', hp, 0.5, sineInOut)));
  }

  // ---- events ------------------------------------------------------------------------

  /** BUILD-UP: the gutter chip grows a step (a rising coin), or the pair that cashed it empties it. */
  private async buildUp(e: Ev<'buildUp'>): Promise<void> {
    const g = this.s.gutter;
    g.buildUp = e.mul;
    if (e.cashed) {
      // The plate pours into the hit: its multiplier jumps up off the gutter as it empties.
      this.s.sounds.coin(6);
      this.s.sounds.coin(10);
      this.bg(this.popText(`X${Math.round((e.spent ?? 1) * 100) / 100}!`, W / 2, MACHINE_TOP + MACHINE_H + 6, 4, '#ffd23a', 70, 0.3));
      return;
    }
    this.s.sounds.coin(2 + e.stacks * 2);
    g.buildUpPop = 1;
    this.bg(this.c.to(g, 'buildUpPop', 0, 0.35));
  }

  private async turnStart(e: Ev<'turnStart'>): Promise<void> {
    const { machines, gutter } = this.s;
    gutter.turn = e.turn;
    gutter.side = e.side;
    // Low HP: a heartbeat as the enemy's turn opens (the screen's edges breathe red too: game.ts drawDanger).
    const you = this.s.huds.player;
    if (e.side === 'enemy' && you.hp > 0 && you.hp < you.maxHp * 0.3) this.s.sounds.heartbeat();
    // RAISED! lasts until its raised spin has been played (the Dealer's next turn).
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
    // Only what was lost drains: TOWER SHIELD / SHIELD WALL keep the rest (the bar used to drop to 0 regardless).
    await this.c.to(h, 'shield', Math.max(0, h.shield - e.lost), 0.3, sineIn);
  }

  private async spin(e: Ev<'spin'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.lastScore = e.score;
    this.lastStops[e.side] = e.stops;
    m.clearRowFx();
    const near = e.nearMiss && this.s.juice.nearMiss;
    this.lastSpin[e.side] = { frozen: e.frozen, locked: e.locked, hexed: e.hexed ?? [] };
    this.symBonus[e.side] = e.symBonus ?? {};
    await m.spin(
      e.stops,
      near,
      this.c,
      {
        onNearMiss: () => {
          this.s.sounds.nearMissSting();
          this.s.camera.punchZoom(0.015, 0.9);
        },
        // The payline numbers pop in as each symbol lands.
        onReelStop: (r) => {
          setTag(this, e.side, r, e.locked[r]);
        },
      },
      // A HELD reel (HOLD, experiment) stays still like a frozen one.
      e.frozen.map((z, r) => z || !!e.held?.[r]),
    );
    for (const r of e.score.relics ?? []) this.relicPop(e.side, r);
    // GOLDEN SPIN: its own moment, a gold banner over a soft flash of the machine (never the screen).
    if (e.score.relics?.includes('goldenspin')) {
      this.flashMachine(e.side, 0.5, 0.4);
      await this.banner('GOLDEN SPIN!', '#ffd23f', 1.2, 0.25, 'EVERYTHING PAYS X3', MACHINE_TOP + MACHINE_H / 2, 3);
    }
    if (e.luckyWilds?.length) await luckyWilds(this, e.side, e.luckyWilds.map((reel) => ({ reel, row: 1 })));
    // 3 WILDS: a little bonus reel picks one of your symbols, and that jackpot pays.
    if (e.score.wildPick) await bonusReel(this, e.side, e.score.wildPick, e.score.wildPickEnh);
    // JAX's all-jackpots spin: each WILD on the line spins the wheel for its symbol and charm.
    for (const p of e.score.picks ?? []) await bonusReel(this, e.side, p.symbol, p.enh);
    if (near && e.score.tier !== 'triple') missedTriple(this, e.side, e.score.line[0]);
    // JAX's all-jackpots spin is announced by its payoff; each cell then pays on its own.
    // THE DROP shows before the PAIR!/JACKPOT! math (the note group carries it).
    if (e.drop) await drop(this, { side: e.side, ...e.drop });
    if (!e.score.jackpots) await winPresentation(this, e.side, e.score);
  }

  /** Per-fight bonuses on each cell of a symbol this spin (DECK DRUM), added to the shown number. */
  symBonus: Partial<Record<SideId, Partial<Record<SymbolId, number>>>> = {};

  /** SECOND PAYLINE: the row above lights up and says what it pays (its hits follow as usual). */
  private async secondLine(e: Ev<'secondLine'>): Promise<void> {
    const m = this.s.machines[e.side];
    for (const g of e.groups)
      for (const r of g.reels) {
        const fx = m.reels[r].rows[0];
        fx.glowColor = COLORS.goldLight;
        this.bg(this.c.tween({ from: 1, to: 0, dur: 0.9, onUpdate: (v) => (fx.glow = v) }));
        this.bg(this.c.tween({ from: 1.25, to: 1, dur: 0.3, onUpdate: (v) => (fx.punch = v) }));
      }
    this.s.sounds.coin(4);
    const c = cellCenter(e.side, 1, 0);
    await this.popText(`2ND LINE +${e.groups.reduce((a, g) => a + g.amount, 0)}`, c.x, c.y - 40, 2.5, COLORS.goldLight, 30, 0.3, true);
  }

  /** GLASS shattered: the charm leaves the cell for good, with a crack and shards. */
  private async glassBreak(e: Ev<'glassBreak'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.fizzle();
    for (const ref of e.cells) {
      const cell = m.reels[ref.reel].cells[ref.index];
      cell.enh = undefined;
      const fx = m.reels[ref.reel].rows[1];
      this.bg(this.c.tween({ from: 0.8, to: 0, dur: 0.35, onUpdate: (v) => (fx.wobble = v) }));
      const c = cellCenter(e.side, ref.reel, 1);
      // Over the machine's top edge, above its reel (inside the cell it clipped).
      this.bg(this.popText('SHATTERED!', c.x, MACHINE_TOP - 22, 2, '#d8f6ff', 30, 0.4, true));
    }
    await this.c.wait(0.35);
  }

  // ---- writers, abilities, boss --------------------------------------------------------

  private async abilityCharge(e: Ev<'abilityCharge'>): Promise<void> {
    const h = this.s.huds[e.side];
    // THE OWNER: his HUD names his next trick (THE HAMMER IN 2).
    if (h.ability && h.ability.kind !== e.kind) h.ability = { ...h.ability, kind: e.kind };
    // The pace can change mid-fight (the Dealer's hands): keep the HUD's countdown honest.
    if (h.ability && h.ability.every !== e.every) h.ability = { ...h.ability, every: e.every };
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
    const dealt = e.kind === 'deal' ? this.s.gutter.nextDeal : undefined;
    // THE WHEEL: the ball drops, the wheel on its topper races.
    if (e.kind === 'bets') this.s.gutter.wheelSpeed = 16;
    await this.banner(dealt ? `THE DEAL: ${dealt === 'allin' ? 'ALL IN' : 'BUST'}!` : `${abilityName(e.kind)}!`, '#ff6a5a', 1.35, 0.25);
  }

  private async endTurn(side: SideId): Promise<void> {
    const m = this.s.machines[side];
    // Statuses tick down after the affected side's own spin.
    const ls = this.lastSpin[side];
    if (ls) {
      ls.frozen.forEach((f, r) => f && m.frozen[r] > 0 && m.frozen[r]--);
      ls.locked.forEach((f, r) => f && m.locked[r] > 0 && m.locked[r]--);
      ls.hexed.forEach((f, r) => f && m.hexed[r] > 0 && m.hexed[r]--);
      delete this.lastSpin[side];
    }
    this.bg(this.c.to(m.payline, 'alpha', 0, 0.2));
    this.bg(m.focusPayline(this.c, false));
    // The payline numbers fade once the turn is paid.
    for (const t of m.tags) if (t) this.bg(this.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (t.alpha = v) }));
    await this.c.wait(0.05);
  }
}
