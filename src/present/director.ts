import { OWNER_RULES } from '../core/enemies';
import { symLabel, UNIT, type Enh, type SideId, type SymbolId } from '../core/config';
import type { CombatEvent } from '../core/events';
import { DEALER_HANDS, DEALER_RULES, effectText, other, WHEEL_SYMBOLS, wheelCharm, WRITERS, type TurnResult } from '../core/fight';
import type { LineScore, ScoreGroup, Tier } from '../core/scoring';
import type { CellRef } from '../core/strip';
import { backOut, cubicIn, cubicOut, quadOut, sineIn, sineInOut, sineOut } from './ease';
import { Banner, Bubble, FloatText, Lightning, Projectile, SymbolWheel, TurnCard } from './fx';
import { cellCenter, COLORS, GUTTER_PANEL_Y, H, MACHINE_CX, MACHINE_H, MACHINE_TOP, CELL, reelWindow, RELIC_FEED, W } from './layout';
import type { Stage } from './stage';
import { abilityName } from './hud';
import { stripMapColumn } from './stripMap';
import { artId, type SpriteId } from '../render/sprites';
import { fmtNum, textWidth } from '../render/text';
import { BOMB, RELICS } from '../core/relics';
import { charmLevel, charmName, charmTag, charmValue, CHARM_COLOR, playerSymValue } from '../core/charms';
import { defaultConfig } from '../core/config';
import { DEAD } from '../core/strip';
import { ENH_SPRITE } from './reel';

/** Base symbol values (the payline numbers). */
const BASE = defaultConfig().base;

type Ev<T extends CombatEvent['type']> = Extract<CombatEvent, { type: T }>;



/** Events that ride inside a lightning storm (strikes, their echoes, Fang / payoff heals). */
const STORM_PART = (e: CombatEvent) =>
  e.type === 'specialFire' || (e.type === 'relic' && (e.relic === 'overcharge' || e.relic === 'fang')) || (e.type === 'heal' && (e.source === 'fang' || e.source === 'payoff'));

const BATCHABLE = new Set<CombatEvent['type']>(['attack', 'shieldGain', 'energyGain', 'fizzle', 'slime', 'freeze', 'lock', 'steal', 'pot', 'heal', 'bomb', 'hex']);

/** Where a relic's name pops (the RELICS header row). */

/** Banners sit in the top gutter between the HUD panels, never over the reels. */
const BANNER_Y = 172;
/** PAIR! / JACKPOT!: mid-machine, like BUST! and ALL IN (at BANNER_Y they covered both HP bars as the hit landed). */
const PAY_BANNER_Y = MACHINE_TOP + MACHINE_H / 2;
/** THE PAYOUT LADDER: a pay this share of the HP bar it lands on is a BIG WIN, this much a MEGA WIN. */
export const LADDER = { big: 0.3, mega: 0.65 };
/** An enemy turn whose hits come to at most this share of your max HP plays at double speed. */
const QUIET_ENEMY_HIT = 0.08;
const TIER_MUL = { pair: defaultConfig().pairMult, triple: defaultConfig().tripleMult };
/** One step of THE CLIMB: what it says and the running pay after it. */
interface ClimbStep {
  label: string;
  value: number;
}
/** An engine note as a multiplier step: "X1.5 DRY", "HOT X2", "HIGH ROLLER X2", "VOL +32%". Flat notes (+N, ECHO,
 * RAKE, HALF) aren't steps: their effect is already in the base or shows as the red cut. */
export function noteStep(n: string): { f: number; text: string } | null {
  let m = /^X(\d+(?:\.\d+)?)\s*(.*)$/.exec(n);
  if (m) return { f: Number(m[1]), text: `×${m[1]}${m[2] ? ` ${m[2]}` : ''}` };
  m = /^(.+?)\s+X(\d+(?:\.\d+)?)$/.exec(n);
  if (m) return { f: Number(m[2]), text: `×${m[2]} ${m[1]}` };
  m = /^(.+?)\s*\+(\d+)%$/.exec(n);
  if (m) return { f: 1 + Number(m[2]) / 100, text: n };
  return null;
}
/**
 * THE CLIMB for a paying group: the base, then the line (PAIR / JACKPOT), then each multiplier the engine noted, ending
 * on the engine's exact total. Where the notes don't multiply out to the total exactly (TESLA's pooled lightning, a
 * rounding), the gap is spread evenly over the steps, so the count only ever lands on the true number.
 */
export function climbSteps(g: ScoreGroup, tier: Tier): ClimbStep[] {
  const gross = Math.round(g.base * g.mult);
  const raw: { f: number; text: string }[] = [];
  const count = g.reels.length;
  if (g.matched && count >= 2 && tier !== 'none') raw.push(count >= 3 ? { f: TIER_MUL.triple, text: `×${TIER_MUL.triple} JACKPOT` } : { f: TIER_MUL.pair, text: `×${TIER_MUL.pair} PAIR` });
  for (const n of g.notes ?? []) {
    const st = noteStep(n);
    if (st && st.f !== 1) raw.push(st);
  }
  if (!raw.length && gross !== g.base && g.base > 0) raw.push({ f: gross / g.base, text: '' });
  const prod = raw.reduce((a, st) => a * st.f, Math.max(1, g.base));
  const k = raw.length && prod > 0 ? (gross / prod) ** (1 / raw.length) : 1;
  const out: ClimbStep[] = [{ label: '', value: g.base }];
  let v = g.base;
  raw.forEach((st, i) => {
    v *= st.f * k;
    out.push({ label: st.text, value: i === raw.length - 1 ? gross : v });
  });
  if (out.length === 1) out.push({ label: '', value: gross });
  return out;
}
/** Where your chip count sits (top left: runScreens CHIP_SPOT): swept bets fly there. */
const CHIP_COUNTER = { x: 44, y: 46 };

/**
 * Turns a TurnResult's event list into choreographed, skippable presentation. Owns the
 * mapping from rules → juice; knows nothing about how the rules work.
 */
export class Director {
  private lastScore: LineScore | null = null;
  /** The last spin's final stops per side (the payline numbers read the landed cells, not mid-spin ones). */
  private lastStops: Partial<Record<SideId, number[]>> = {};
  /** THE DROP's lit cells: the next player attack flies a note from each. */
  private dropCells: { reel: number; row: number }[] | null = null;
  private lastSpin: Partial<Record<SideId, { frozen: boolean[]; locked: boolean[]; hexed: boolean[] }>> = {};

  constructor(private s: Stage) {}

  async playTurn(result: TurnResult): Promise<void> {
    const evs = result.events;
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
          await this.storm(group);
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

  private play(e: CombatEvent): Promise<void> {
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
        return this.attack(e);
      case 'shieldGain':
        return this.shieldGain(e);
      case 'energyGain':
        return this.energyGain(e);
      case 'meter':
        return this.meter(e);
      case 'touch':
        return this.touch(e);
      case 'payoff':
        return this.payoff(e);
      case 'drop':
        // Played with its spin (before the banner).
        return Promise.resolve();
      case 'specialFire':
        return this.specialFire(e);
      case 'slime':
        return this.slime(e);
      case 'cleanse':
        return this.cleanse(e);
      case 'recover':
        return this.recover(e);
      case 'fizzle':
        return this.fizzle(e);
      case 'glassBreak':
        return this.glassBreak(e);
      case 'ownerPhase':
        return this.banner(['', 'HE LOOSENS HIS TIE', 'HE STANDS UP', 'HE GOES ALL IN'][e.phase] ?? '', '#ff6a5a', 1.3, 0.35, `THE OWNER AT ${[100, 75, 50, 25][e.phase]}%: HIS HITS ARE ${Math.round(OWNER_RULES.phaseDmg * e.phase * 100)}% HARDER`, BANNER_Y, 3);
      case 'secondLine':
        return this.secondLine(e);
      case 'death':
        return this.death(e);
      case 'fightEnd':
        return this.fightEnd(e);
      case 'heal':
        if (e.source in RELICS) this.relicPop(e.side, e.source);
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
      case 'relic':
        this.relicPop(e.side, e.relic);
        return this.c.wait(0.12);
      case 'phase':
        return this.phase(e);
      case 'hex':
        return this.hex(e);
      case 'bomb':
        return this.bomb(e);
      case 'fuse':
        return this.fuse(e);
      case 'defuse':
        return this.defuse(e);
      case 'blast':
        return this.blast(e);
      case 'gulp':
        return this.gulp(e);
      case 'phoenix':
        this.relicPop(e.side, 'phoenix');
        return this.phoenix(e);
      case 'betPlaced':
        return this.betPlaced(e);
      case 'betSwept':
        return this.betSwept(e);
      case 'noMoreBets':
        return this.noMoreBets(e);
      case 'wheelFast':
        return this.wheelFast(e);
      case 'fake':
        return this.fake(e);
      case 'fakeTick':
        return this.fakeTick(e);
      case 'mark':
        return this.markCells(e);
      case 'markedHit':
        return this.markedHit(e);
      case 'confiscate':
        return this.confiscate(e);
      case 'rake':
        return this.rake(e);
      case 'lineCard':
        return this.lineCard(e);
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
        return this.popText(`THE HOUSE CLOSES IN ${e.left}`, c.x, MACHINE_TOP - 22, 2, '#ff6a5a', 12, 0.6);
      }
      case 'closingTime':
        this.s.sounds.stingerMedium();
        return this.banner('CLOSING TIME!', '#ff6a5a', 1.2, 0.4, 'A STALLED TABLE GOES TO THE HOUSE', BANNER_Y, 3);
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
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(6);
        this.s.sounds.coin(10);
        return this.popText(e.amount > 0 ? `+${e.amount} CHIP${e.amount > 1 ? 'S' : ''}` : `THE HOUSE SKIMS ${-e.amount} CHIPS`, c.x - 80, MACHINE_TOP - 22, 2, e.amount > 0 ? '#ffd23f' : '#ff8a7a', 14, 0.35);
      }
      case 'lucreChips': {
        if (e.side === 'player') this.s.huds.player.lucre = e.total;
        // LUCRE: banked on a win (the RESULTS line counts them).
        const c = this.machineCenter(e.side);
        this.s.sounds.coin(8);
        return this.popText(`CHIP CHARM +${e.amount}`, c.x + 80, MACHINE_TOP - 22, 2, '#ffd23f', 14, 0.35);
      }
      case 'overtime':
        this.s.sounds.stingerMedium();
        return this.banner('OVERTIME!', '#ff9a3a', 1.2, 0.3, 'BOTH MACHINES HIT HARDER EVERY ROUND', BANNER_Y, 3);
      case 'lastCall':
        this.s.sounds.stingerMedium();
        return this.banner('LAST CALL!', '#ff6a5a', 1.2, 0.3, e.house ? 'THE HOUSE SKIMS EVERY TURN NOW' : 'THE HOUSE HITS HARDER EVERY TURN NOW', BANNER_Y, 3);
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
        return this.popText(`COVER CHARGE -${e.amount}`, c.x, MACHINE_TOP - 22, 2, '#ff8a7a', 12, 0.5);
      }
      case 'allInHit':
        return this.allInHit(e);
      case 'dealNext':
        this.s.gutter.nextDeal = e.card;
        return Promise.resolve();
      case 'dealerHand':
        return this.dealerHand(e);
    }
  }

  // ---- helpers -----------------------------------------------------------------------

  /** The Dealer flips a card face-up onto one of your payline cells. */
  private async lineCard(e: Ev<'lineCard'>): Promise<void> {
    const m = this.s.machines[e.side];
    const p = cellCenter(e.side, e.reel, 1);
    this.s.sounds.click();
    this.s.sounds.coin(3);
    m.lineCard = { reel: e.reel, card: e.card, flip: 0 };
    const lc = m.lineCard;
    await this.c.tween({ from: 0, to: 1, dur: 0.35, ease: backOut(2), onUpdate: (v) => (lc.flip = v) });
    await this.banner('BUST!', '#ff8a7a', 1.1, 0.3, `REEL ${e.reel + 1} PAYS NOTHING NEXT SPIN`, MACHINE_TOP + MACHINE_H / 2, 4);
    void p;
  }

  /** ALL IN: the Dealer throws its whole hand. */
  private async allInHit(e: Ev<'allInHit'>): Promise<void> {
    this.s.gutter.allInArmed = false;
    const c = this.machineCenter(e.to);
    this.s.sounds.fanfareJackpot();
    this.hitstop(6);
    this.shake(10, 0.5);
    this.flashMachine(e.to, 1, 0.3);
    this.knockback(e.to, 14);
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    await this.popText(e.hpDamage > 0 ? `ALL IN! -${fmtNum(e.hpDamage)}` : 'ALL IN! BLOCKED', c.x, MACHINE_TOP + 60, 4, '#ff6a5a', 30, 0.5);
  }

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

  private popText(text: string, x: number, y: number, scale: number, color: string, rise = 50, hold = 0.35, plate = false): Promise<void> {
    const t = this.s.fx.add(new FloatText(text, x, y, scale, color));
    t.plate = plate;
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

  private async banner(text: string, color: string, overshoot: number, hold: number, sub: string | { text: string; color: string }[] = '', y = BANNER_Y, textScale = 4): Promise<void> {
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
    this.decay(h, 'hpShake', Math.min(10, 3 + amount / UNIT), 0.35);
    this.decay(h, 'portraitFlash', 1, 0.2);
    this.decay(h, 'portraitShake', 4, 0.3);
    this.bg(this.c.wait(0.4).then(() => this.c.to(h, 'ghost', hp, 0.5, sineInOut)));
  }

  // ---- events ------------------------------------------------------------------------

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
          this.setTag(e.side, r, e.locked[r]);
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
    if (e.luckyWilds?.length) await this.luckyWilds(e.side, e.luckyWilds.map((reel) => ({ reel, row: 1 })));
    // 3 WILDS: a little bonus reel picks one of your symbols, and that jackpot pays.
    if (e.score.wildPick) await this.bonusReel(e.side, e.score.wildPick, e.score.wildPickEnh);
    // JAX's all-jackpots spin: each WILD on the line spins the wheel for its symbol and charm.
    for (const p of e.score.picks ?? []) await this.bonusReel(e.side, p.symbol, p.enh);
    if (near && e.score.tier !== 'triple') this.missedTriple(e.side, e.score.line[0]);
    // JAX's all-jackpots spin is announced by its payoff; each cell then pays on its own.
    // THE DROP shows before the PAIR!/JACKPOT! math (the note group carries it).
    if (e.drop) await this.drop({ side: e.side, ...e.drop });
    if (!e.score.jackpots) await this.winPresentation(e.side, e.score);
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

  /** Per-fight bonuses on each cell of a symbol this spin (DECK DRUM), added to the shown number. */
  private symBonus: Partial<Record<SideId, Partial<Record<SymbolId, number>>>> = {};

  /** The numbers on a landed payline symbol: its value (bottom-left) and its charm's tag (top-right). */
  private setTag(side: SideId, r: number, jammed = false): void {
    const m = this.s.machines[side];
    const cell = m.reels[r].cellAtRow(1);
    if (jammed || (cell.stolen ?? 0) > 0 || cell.slimed || cell.carded) return;
    const lv = this.s.levels[side];
    const player = side === 'player';
    if ((player && DEAD.has(cell.symbol)) || cell.symbol === 'wild' || cell.symbol === 'empty') return;
    // Enemy effect symbols (slime, ice, claws...) don't pay a number: the banner says what they do.
    if (!player && WRITERS.has(cell.symbol)) return;
    const base = BASE[cell.symbol] ?? 0;
    const bonus = this.symBonus[side]?.[cell.symbol] ?? 0;
    const charm = cell.enh && !(cell.faked && cell.faked > 0) && m.hexed[r] <= 0 ? cell.enh : undefined;
    const lvl = charm ? (player ? charmLevel(lv, charm, this.s.ticket) : 1) : 1;
    // What the cell really hits (or blocks) for: its share of its group's FINAL pay, after every multiplier, so the
    // numbers on the line add up to the banner's total (user: the cells said 13 while the hit was 7,000).
    // Each reel's LANDED payline cell: the reels to its right may still be spinning when this one's number pops (an
    // enemy shield jackpot read 9 / 11 / 15 under a 15 x 3 banner).
    const stops = this.lastStops[side];
    const cellBase = (rr: number): number => {
      const reel = m.reels[rr];
      const c = stops ? reel.cells[((stops[rr] % reel.cells.length) + reel.cells.length) % reel.cells.length] : reel.cellAtRow(1);
      const b = (lv ? playerSymValue(lv, c.symbol, BASE[c.symbol] ?? 0) : !player && c.symbol === 'shield' ? Math.round((BASE[c.symbol] ?? 0) * this.s.enemyShield) : BASE[c.symbol] ?? 0) + (this.symBonus[side]?.[c.symbol] ?? 0);
      const k = c.enh === 'keen' && !(c.faked && c.faked > 0) && m.hexed[rr] <= 0 ? charmValue('keen', player ? charmLevel(lv, 'keen', this.s.ticket) : 1) : 0;
      return b + k;
    };
    let value: number;
    const g = this.lastScore?.groups.find((x) => x.reels.includes(r) && x.base > 0);
    if (g && g.amount > 0) {
      const mine = cellBase(r);
      // THE DROP's group counts its notes off the payline too (in its BASE); other groups split by their cells.
      const denom = g.drop ? g.base : g.reels.reduce((a, rr) => a + cellBase(rr), 0);
      value = g.reels.length === 1 && !g.drop ? g.amount : denom > 0 ? Math.round((g.amount * mine) / denom) : Math.round(g.amount / g.reels.length);
    } else value = (lv ? playerSymValue(lv, cell.symbol, base) : !player && cell.symbol === 'shield' ? Math.round(base * this.s.enemyShield) : base) + bonus;
    if (!value && !charm) return;
    const tag = { value: value ? String(value) : '', ...(charm ? { charm: charmTag(charm, lvl), color: CHARM_COLOR[charm] } : {}), pop: 0, alpha: 1 };
    m.tags[r] = tag;
    this.bg(this.c.tween({ from: 0, to: 1, dur: 0.18, ease: backOut(3), onUpdate: (v) => (tag.pop = v) }));
  }

  /** WILDS: a small wheel of every symbol + charm you own spins and lands on the one whose jackpot pays. */
  private async bonusReel(side: SideId, pick: SymbolId, pickEnh?: Enh): Promise<void> {
    this.s.sounds.lucky();
    // One segment per live symbol + charm on YOUR machine (what the engine's pick can land on).
    const key = (sym: SymbolId, enh?: Enh) => `${sym}:${enh ?? ''}`;
    const seen = new Map<string, { symbol: SymbolId; enh?: Enh }>();
    for (const reel of this.s.machines[side].reels)
      for (const c of reel.cells) {
        if (c.slimed || (c.stolen ?? 0) > 0 || c.carded || (c.bomb ?? 0) > 0 || !WHEEL_SYMBOLS.has(c.symbol)) continue;
        const enh = wheelCharm(c);
        seen.set(key(c.symbol, enh), { symbol: c.symbol, ...(enh ? { enh } : {}) });
      }
    if (!seen.has(key(pick, pickEnh))) seen.set(key(pick, pickEnh), { symbol: pick, ...(pickEnh ? { enh: pickEnh } : {}) });
    const order = ['sword', 'ace', 'shield', 'bolt', 'goldbar'];
    const pool = [...seen.values()].sort((a, b) => order.indexOf(a.symbol) - order.indexOf(b.symbol) || (a.enh ?? '').localeCompare(b.enh ?? ''));
    const at = pool.findIndex((p) => key(p.symbol, p.enh) === key(pick, pickEnh));
    const cx = W / 2;
    const cy = MACHINE_TOP + MACHINE_H / 2 + 60;
    // The Dealer's table panel sits where the wheel spins: it steps aside meanwhile (playtest).
    this.s.gutter.wheelUp = true;
    const wheel = this.s.fx.add(new SymbolWheel(pool.map((p) => ({ sprite: p.symbol as SpriteId, ...(p.enh ? { charm: ENH_SPRITE[p.enh] } : {}) })), cx, cy, pool.length > 4 ? 90 : 70));
    await this.c.tween({ from: 0, to: 1, dur: 0.18, ease: backOut(2), onUpdate: (v) => (wheel.scale = v) });
    const end = wheel.stopAngle(at, 3);
    const seg = (Math.PI * 2) / pool.length;
    let last = 0;
    await this.c.tween({
      from: 0,
      to: end,
      dur: 1.3,
      ease: cubicOut,
      onUpdate: (v) => {
        wheel.angle = v;
        const tick = Math.floor(Math.abs(v) / seg);
        if (tick !== last) {
          last = tick;
          this.s.sounds.reelStop(tick % 3, 1.2);
        }
      },
    });
    wheel.landed = at;
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (wheel.flash = v) }));
    this.bg(this.popText(`WILD ${pickEnh ? `${pickEnh.toUpperCase()} ` : ''}${symLabel(pick)} JACKPOT!`, cx, cy - 120, 2.5, '#ff6ad5', 16, 0.4));
    await this.c.wait(0.4);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.2, onUpdate: (v) => (wheel.alpha = v) }).then(() => {
      this.s.fx.remove(wheel);
      this.s.gutter.wheelUp = false;
    }));
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

    if (tier === 'triple') this.s.cheer?.(side === 'player');
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
    const g = matched!;
    const gross = Math.round(g.base * g.mult);
    // One decimal unless it makes the sum read wrong (39 x 11.3 = 439): then two.
    const fmt = (x: number) => (Number.isInteger(x) ? String(x) : Math.round(g.base * Number(x.toFixed(1))) === gross ? x.toFixed(1) : String(Number(x.toFixed(2))));
    const effect = side === 'enemy' && WRITERS.has(sym) ? effectText(sym, g.amount) : '';
    // THE PAYOUT LADDER (feel playtest, 2026-10-15: "JACKPOT!" every two spins meant nothing). A pay is sized by the HP
    // bar it lands on: a hit by the enemy's (a block by your own), so a small jackpot stays small and BIG WIN / MEGA WIN
    // are earned. PAIR and JACKPOT still name the line; the size names the moment.
    // (Blocks stay off the ladder: BIG WIN and MEGA WIN mean damage. Feel playtest #2: shield jackpots took 3 of 5.)
    const attack = sym !== 'shield';
    const bar = this.s.huds[other(side)].maxHp;
    const share = slimeCleanse || effect || !attack ? 0 : gross / Math.max(1, bar);
    const size: 'small' | 'big' | 'mega' = share >= LADDER.mega ? 'mega' : share >= LADDER.big ? 'big' : 'small';
    const mine = side === 'player';
    const title = size === 'mega' ? (mine ? 'MEGA WIN!' : 'HUGE HIT!') : size === 'big' ? (mine ? 'BIG WIN!' : 'BIG HIT!') : tier === 'triple' ? 'JACKPOT!' : 'PAIR!';
    const color = size === 'mega' ? (mine ? COLORS.mega : '#ff4a4a') : size === 'big' ? (mine ? COLORS.bigWin : '#ff7a5a') : tier === 'triple' ? COLORS.triple : COLORS.pair;
    const fixed = slimeCleanse
      ? [{ text: 'CLEANSE!', color: COLORS.slime }]
      : effect
        ? [{ text: effect, color: '#ff8a7a' }]
        : null;
    // THE CLIMB: your pay builds on screen, one multiplier at a time (the line, then each Charm and relic as it fires),
    // counting up to the total. The enemy's pays show the short sum (its turns are the waiting half of a fight).
    const climb = !fixed && mine ? climbSteps(g, tier) : null;
    const parts = fixed ?? [
      { text: `${g.base}`, color: '#ffffff' },
      { text: ' × ', color: COLORS.goldLight },
      { text: fmt(g.mult), color: COLORS.goldLight },
      { text: ' = ', color: '#ffffff' },
      { text: `${gross}!`, color: tier === 'triple' ? '#ff8a5a' : COLORS.goldLight },
      ...(g.cut ? [{ text: ` -${g.cut}`, color: '#ff5a5a' }] : []),
    ];
    const hold = size === 'mega' ? 1.3 : size === 'big' ? 0.9 : tier === 'triple' ? 0.45 : 0.3;
    if (size === 'small') {
      // A small pay: quick and light (a small jackpot still glows orange, without the confetti storm).
      if (tier === 'pair') this.s.sounds.stingerMedium();
      else {
        this.s.sounds.stingerMedium();
        this.s.sounds.coin(3);
      }
      this.shake(tier === 'triple' ? 5 : 3, 0.18);
      this.s.camera.chromaPulse(tier === 'triple' ? 0.3 : 0.15);
      if (tier === 'triple') {
        const c = this.machineCenter(side);
        this.s.particles.burst({ x: c.x, y: c.y - 60, count: 40, colors: ['#ff8a5a', '#ffd23f', '#ffffff'], speed: [180, 420], angle: -Math.PI / 2, spread: Math.PI * 0.9, gravity: 700, drag: 1.2, life: [0.6, 1.1], size: [4, 7], kind: 'confetti' });
      }
      const show = this.payBanner(title, color, tier === 'triple' ? 1.25 : 1.15, hold, parts, climb, tier === 'triple' ? 4.5 : 4, 'small');
      if (climb) await show;
      else {
        this.bg(show);
        await this.c.wait(0.3);
      }
    } else {
      this.s.sounds.fanfareJackpot();
      this.hitstop(size === 'mega' ? 8 : 4);
      this.shake(size === 'mega' ? 12 : 9, size === 'mega' ? 0.7 : 0.5);
      this.s.camera.punchZoom(size === 'mega' ? 0.08 : 0.05, size === 'mega' ? 0.6 : 0.45);
      this.s.camera.chromaPulse(0.85);
      this.s.camera.dimTarget = 0.35;
      const c = this.machineCenter(side);
      this.s.particles.burst({
        x: c.x,
        y: c.y - 60,
        count: size === 'mega' ? 320 : 200,
        colors: ['#ff3a2e', '#ffd23f', '#3b8ef0', '#5ed15a', '#ffffff', '#ff6ad5'],
        speed: [250, size === 'mega' ? 900 : 750],
        angle: -Math.PI / 2,
        spread: Math.PI * 1.2,
        gravity: 700,
        drag: 1.2,
        life: [1.2, 2.2],
        size: [5, 9],
        kind: 'confetti',
      });
      await this.payBanner(title, color, size === 'mega' ? 1.7 : 1.5, hold, parts, climb, size === 'mega' ? 6 : 5, size);
      this.s.camera.dimTarget = 0;
    }
  }

  /**
   * The pay banner. With a climb, the sub line counts up through each step (LABEL VALUE), a rising ding a step, then
   * slams on the total; without one it builds the short sum part by part.
   */
  private async payBanner(title: string, color: string, overshoot: number, hold: number, parts: { text: string; color: string }[], climb: ClimbStep[] | null, textScale: number, size: 'small' | 'big' | 'mega'): Promise<void> {
    if (!climb) return this.banner(title, color, overshoot, hold, parts, PAY_BANNER_Y, textScale);
    if (!this.s.juice.banners) return;
    const b = this.s.fx.add(new Banner(title, color, W / 2, PAY_BANNER_Y, textScale));
    // Wide enough for the longest step, so the panel doesn't twitch as the labels change.
    b.minW = Math.max(...climb.map((st) => textWidth(`${st.label}  ${fmtNum(st.value)}`, 4))) + 60;
    const show = (label: string, value: number, end = false) =>
      (b.subParts = [
        ...(label ? [{ text: `${label}  `, color: COLORS.goldLight }] : []),
        { text: `${fmtNum(Math.round(value))}${end ? '!' : ''}`, color: end ? color : '#ffffff' },
      ]);
    show(climb[0].label, climb[0].value);
    await this.c.tween({ from: 0, to: overshoot, dur: 0.22, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    await this.c.tween({ from: overshoot, to: 1, dur: 0.12, ease: sineIn, onUpdate: (v) => (b.scale = v) });
    // Each step: count from the last value to this one; bigger moments climb slower.
    const per = size === 'mega' ? 0.24 : size === 'big' ? 0.18 : 0.11;
    for (let i = 1; i < climb.length; i++) {
      const from = climb[i - 1].value;
      const st = climb[i];
      this.s.sounds.ding(i + 1);
      await this.c.tween({ from, to: st.value, dur: per, ease: cubicOut, onUpdate: (v) => show(st.label, v) });
      this.bg(this.c.tween({ from: 1.08, to: 1, dur: 0.12, onUpdate: (v) => (b.scale = v) }));
    }
    // The slam: the total, in the banner's colour.
    const total = climb[climb.length - 1].value;
    show('', total, true);
    this.s.sounds.coin(5);
    this.bg(this.c.tween({ from: 1.2, to: 1, dur: 0.18, ease: backOut(3), onUpdate: (v) => (b.scale = v) }));
    await this.c.wait(hold);
    await this.c.tween({ from: 1, to: 0, dur: 0.15, ease: cubicIn, onUpdate: (v) => ((b.scale = 0.6 + 0.4 * v), (b.alpha = v)) });
    this.s.fx.remove(b);
  }

  private async attack(e: Ev<'attack'>): Promise<void> {
    const color = this.tierColor();
    await this.activate(e.from, e.reels, '#ffffff');
    const target = this.machineCenter(e.to);
    const dir = e.to === 'enemy' ? 1 : -1;
    const big = this.lastScore?.tier === 'triple';

    // THE DROP: a note flies from every lit cell (the rest of the attacks throw swords).
    const drop = e.from === 'player' ? this.dropCells : null;
    this.dropCells = null;
    const srcReels = drop?.length ? drop : e.reels.length ? e.reels : [-1];
    const flights = srcReels.map(async (_r, i) => {
      await this.c.wait(i * (drop ? 0.04 : 0.08));
      const from = drop ? cellCenter(e.from, drop[i].reel, drop[i].row) : this.srcPoint(e.from, e.reels, i);
      const scale = drop ? 3 : (big && i === e.reels.length - 1) || !e.reels.length ? 6 : 4;
      const p = this.s.fx.add(new Projectile(drop ? artId('note') : 'swordProjectile', from.x, from.y - 14, scale, dir < 0, '#dfe6f0'));
      p.rot = dir > 0 ? -0.5 : 0.5;
      this.s.sounds.whoosh();
      const tx = target.x - dir * 40 + (Math.random() * 2 - 1) * 30;
      const ty = target.y + (i - (srcReels.length - 1) / 2) * (drop ? 20 : 50);
      this.bg(this.c.tween({ from: p.rot, to: 0, dur: 0.3, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, tx, ty, 0.3, 70, cubicIn);
      this.s.fx.remove(p);
      // Per-projectile impact.
      this.flashMachine(e.to, 0.8, 0.12);
      this.knockback(e.to, 4 + Math.min(10, e.amount / UNIT));
      this.s.particles.burst({ x: tx, y: ty, count: 16, colors: ['#ffffff', '#ffe08a', '#dfe6f0'], speed: [150, 500], kind: 'spark', gravity: 300, life: [0.15, 0.35], size: [2, 4] });
      this.s.sounds.hit(e.amount / UNIT / Math.max(1, srcReels.length));
      this.shake(Math.min(2 + e.amount / UNIT, 9), 0.25);
    });
    await Promise.all(flights);
    if (e.amount >= 4 * UNIT) this.hitstop(e.amount >= 9 * UNIT ? 3 : 1);

    const h = this.s.huds[e.to];
    if (e.blocked > 0) {
      this.s.sounds.block();
      const sb = h.shieldBar();
      this.decay(h, 'shieldFlash', 1, 0.25);
      this.decay(h, 'shieldShake', 5, 0.3);
      this.s.particles.burst({ x: sb.x + 30, y: sb.y + 8, count: 20, colors: [COLORS.shield, '#ffffff', '#9fd0ff'], speed: [100, 350], kind: 'spark', gravity: 200, life: [0.2, 0.4] });
      this.bg(this.popText(`BLOCK ${e.blocked}`, sb.x + sb.w / 2, sb.y + sb.h / 2, 2.5, '#9fd0ff', 16, 0.3));
    }
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    if (e.note === 'pierce') this.bg(this.popText('PIERCE!', target.x + 90, MACHINE_TOP - 22, 2, '#bff4ff', 14, 0.35));
    if (e.note === 'drain') this.bg(this.popText('DRAIN!', target.x - 90, MACHINE_TOP - 22, 2, '#ff5a7a', 14, 0.35));
    if (e.note === 'mimic') this.bg(this.popText('COPYCAT!', target.x - 90, MACHINE_TOP - 22, 2, '#ffb0ff', 14, 0.35));
    if (e.note === 'echo') this.bg(this.popText('ECHO!', target.x + 90, MACHINE_TOP - 22, 2, '#fff27a', 14, 0.35));
    if (e.hpDamage > 0) this.bg(this.popText(`-${fmtNum(e.hpDamage)}`, target.x, MACHINE_TOP + 40, this.tierScale(), color, 60));
    // (Higher than the damage numbers: a blocked hit then a landed one in the same spin read BLC-10D!.)
    else this.bg(this.popText('BLOCKED!', target.x, MACHINE_TOP + 2, 3, '#9fd0ff', 40));
    this.settle(e.from, e.reels);
    await this.c.wait(0.25);
  }

  private async shieldGain(e: Ev<'shieldGain'>): Promise<void> {
    if (e.side === 'player' && !e.reels.length) {
      // Saved chips paying out as shield vs the House.
      const h = this.s.huds.player;
      const sb = h.shieldBar();
      const chip = this.s.fx.add(new Projectile('chipShield', sb.x + 20, sb.y - 30, 0));
      this.s.sounds.coin(5);
      this.s.sounds.shieldGain(e.amount / UNIT);
      await this.c.tween({ from: 0, to: 3, dur: 0.2, ease: backOut(3), onUpdate: (v) => (chip.scale = v) });
      this.bg(this.popText(`CHIPS +${e.amount} SHIELD`, sb.x + sb.w / 2 + 20, sb.y - 30, 2, '#9fd0ff', 12, 0.4));
      this.decay(h, 'shieldFlash', 1, 0.3);
      await this.c.to(h, 'shield', e.total, 0.25, sineOut);
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (chip.alpha = v) }).then(() => this.s.fx.remove(chip)));
      return;
    }
    await this.activate(e.side, e.reels, COLORS.shield);
    const h = this.s.huds[e.side];
    const sb = h.shieldBar();
    const hops = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.06);
      const from = cellCenter(e.side, r, 1);
      const p = this.s.fx.add(new Projectile('shield', from.x, from.y - 14, 2.5, false, COLORS.shield));
      // Into the shield icon left of the bar, never over its number (playtest: the icons hid it).
      await this.arc(p, sb.x - 12, sb.y + sb.h / 2, 0.28, 40, sineInOut);
      this.s.fx.remove(p);
      this.s.particles.burst({ x: p.x, y: p.y, count: 8, colors: [COLORS.shield, '#ffffff'], speed: [60, 200], gravity: 0, life: [0.2, 0.4], size: [2, 4] });
    });
    await Promise.all(hops);
    this.s.sounds.shieldGain(e.amount / UNIT);
    this.decay(h, 'shieldFlash', 1, 0.3);
    this.bg(this.c.to(h, 'shield', e.total, 0.25, sineOut));
    // Right-aligned inside the HUD (at 3x a big number spilled past its border).
    const gain = `+${e.amount}`;
    this.bg(this.popText(gain, sb.x + sb.w - 6 - gain.length * 7.5, sb.y + sb.h / 2, 2.5, '#9fd0ff', 16, 0.3));
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
    const before = Math.floor((e.total - e.amount) / UNIT);
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
    const lit = Math.min(h.energyMax, Math.floor(e.total / UNIT));
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
    const soft = this.s.juice.softLightning;
    cam.dimTarget = soft ? 0.25 : 0.5;
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
    this.hitstop(soft ? 2 : 4);
    // No full-screen flash here (photosensitivity): the struck machine flashes instead.
    if (!soft) {
      cam.chromaPulse(0.5);
      cam.punchZoom(0.05, 0.45);
    }
    this.shake(soft ? 3 : 9, soft ? 0.25 : 0.5);
    this.flashMachine(e.to, soft ? 0.35 : 1, 0.3);
    this.knockback(e.to, soft ? 6 : 16);
    this.s.particles.burst({ x: target.x, y: target.y, count: soft ? 18 : 60, colors: [COLORS.energy, '#ffffff', '#fff6c8'], speed: [200, 700], kind: 'spark', gravity: 400, life: [0.2, 0.6], size: [3, 5] });
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    h.energyFlash = 0;
    this.bg(this.popText(`-${fmtNum(e.hpDamage)}`, target.x, MACHINE_TOP + 40, 8, COLORS.energy, 70, 0.5));
    // Full: the bolt crackles (re-strikes 3 times). Soft: it just fades out.
    if (!soft)
      for (let i = 0; i < 3; i++) {
        await this.c.tween({ from: 1, to: 0.2, dur: 0.08, onUpdate: (v) => (bolt.alpha = v) });
        bolt.reroll();
        bolt.alpha = 1;
      }
    await this.c.tween({ from: 1, to: 0, dur: soft ? 0.35 : 0.15, onUpdate: (v) => (bolt.alpha = v) });
    this.s.fx.remove(bolt);
    cam.dimTarget = 0;

    // Drain, then refill any overflow visibly.
    await this.c.to(h, 'energy', 0, 0.2, sineIn);
    const refill = Math.min(h.energyMax, Math.floor(e.energyLeft / UNIT));
    for (let i = 0; i < refill; i++) {
      h.energy = i + 1;
      this.s.sounds.energyPip(i);
      this.bg(this.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
      await this.c.wait(0.08);
    }
    await this.c.wait(0.2);
  }

  /**
   * A LIGHTNING STORM: several strikes in one turn play as ONE sustained arc with a racing damage counter.
   * Its length grows with the log of the strike count (1.2 s for 2, 2.5 s for 10, at most 4 s). The arc
   * re-forks at most ~2 times a second and never flashes the screen (photosensitivity); SOFT holds it still.
   */
  private async storm(group: CombatEvent[]): Promise<void> {
    const strikes = group.filter((x): x is Ev<'specialFire'> => x.type === 'specialFire');
    const n = strikes.length;
    const first = strikes[0];
    const last = strikes[n - 1];
    const dur = Math.min(4, 1.2 + (1.3 * Math.log(n / 2)) / Math.log(5));
    const total = strikes.reduce((a, x) => a + x.hpDamage, 0);
    const h = this.s.huds[first.from];
    const to = this.s.huds[first.to];
    const cam = this.s.camera;
    const soft = this.s.juice.softLightning;
    this.s.sounds.specialCharge();
    cam.dimTarget = soft ? 0.25 : 0.45;
    this.bg(this.c.tween({ from: 0, to: 1, dur: 0.35, onUpdate: (v) => (h.energyFlash = v * 0.8) }));
    await this.c.wait(0.35);
    const target = this.machineCenter(first.to);
    const bolt = this.s.fx.add(new Lightning(target.x, -20, target.x, target.y));
    bolt.alpha = soft ? 0.6 : 0.95;
    const counter = this.s.fx.add(new FloatText('-0', target.x, MACHINE_TOP + 40, 7, COLORS.energy));
    counter.z = 31;
    this.s.sounds.thunder();
    this.shake(soft ? 2 : 5, 0.3);
    this.flashMachine(first.to, soft ? 0.25 : 0.5, 0.3);
    const hp0 = to.hp;
    const sh0 = to.shield;
    const e0 = h.energy;
    let forks = 0;
    let crackles = 0;
    this.bg(this.banner(`LIGHTNING STORM X${n}`, COLORS.energy, 1.2, Math.max(0.2, dur - 0.6), '', BANNER_Y, 4));
    await this.c.tween({
      dur,
      onUpdate: (v) => {
        counter.text = `-${Math.round(total * v)}`;
        to.hp = hp0 + (last.targetHp - hp0) * v;
        to.shield = sh0 + (last.targetShield - sh0) * v;
        h.energy = e0 * (1 - v);
        this.s.machines[first.to].kx = Math.sin(v * dur * 40) * (soft ? 1 : 3);
        // Re-fork about twice a second (a still arc on SOFT).
        if (!soft && v * dur - forks * 0.5 >= 0.5) {
          forks++;
          bolt.reroll();
        }
        if (v * dur - crackles * 0.25 >= 0.25) {
          crackles++;
          this.s.sounds.energyPip(crackles % 8);
        }
      },
    });
    this.s.machines[first.to].kx = 0;
    this.s.fx.remove(bolt);
    counter.text = `-${total}`;
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.6, onUpdate: (v) => ((counter.alpha = v), (counter.y -= 0.5)) }).then(() => this.s.fx.remove(counter)));
    this.damageHud(first.to, last.targetHp, last.targetShield, total);
    this.knockback(first.to, soft ? 6 : 14);
    cam.dimTarget = 0;
    h.energyFlash = 0;
    h.energy = Math.min(h.energyMax, Math.floor(last.energyLeft / UNIT));
    // Heals and relic pops that rode inside the storm.
    for (const x of group) if (x.type !== 'specialFire') await this.play(x);
  }

  /** A signature meter moved: MIDAS gold bars / JAX wilds light pips. */
  private async meter(e: Ev<'meter'>): Promise<void> {
    const h = this.s.huds[e.side];
    const m = h.meter;
    if (!m) return;
    // THE JUKEBOX: a spin with no note skips the record (the volume falls).
    if (m.kind === 'volume' && e.amount < 0) {
      const p0 = h.pipPos(Math.max(0, Math.floor(h.energy) - 1));
      this.s.sounds.fizzle();
      // Under the meter (above it sits the shield bar and its number).
      this.bg(this.popText('SKIP!', p0.x, p0.y + 22, 2, COLORS.textDim, 6, 0.3));
      await this.c.to(h, 'energy', e.total / UNIT, 0.2, sineIn);
      return;
    }
    if (e.wasted) {
      const p0 = h.pipPos(h.energyMax - 1);
      await this.popText('FULL!', p0.x, p0.y - 24, 2, COLORS.textDim, 16, 0.2);
      return;
    }
    if (e.reels.length) await this.activate(e.side, e.reels, m.color);
    const before = Math.min(h.energyMax, Math.floor(h.energy));
    // MIDAS keeps counting past full (GOLD 60/20); the others stop at full.
    const over = m.kind === 'touch' ? e.total / UNIT : Math.min(h.energyMax, e.total / UNIT);
    const lit = Math.min(h.energyMax, over);
    const zaps = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.05);
      const from = cellCenter(e.side, r, 1);
      const pip = h.pipPos(Math.min(h.energyMax - 1, before + i));
      const p = this.s.fx.add(new Projectile(m.icon, from.x, from.y - 14, 2, false, m.color));
      await this.arc(p, pip.x, pip.y, 0.22, 30, cubicIn);
      this.s.fx.remove(p);
    });
    await Promise.all(zaps);
    for (let i = before; i < Math.ceil(lit); i++) {
      h.energy = Math.min(lit, i + 1);
      this.s.sounds.energyPip(i);
      if (h.pipPunch[i] !== undefined) this.bg(this.c.tween({ from: 1.6, to: 1, dur: 0.18, ease: backOut(), onUpdate: (v) => (h.pipPunch[i] = v) }));
      await this.c.wait(0.06);
    }
    h.energy = over;
    if (e.armed && !h.armed) {
      h.armed = true;
      this.s.sounds.lucky();
      // Over the machine's top, on a plate: it used to land on the HP and meter bars.
      // HYPE MAN can max the volume right before the spin it drops on: no "next spin" then.
      if (!e.dropsNow) this.bg(this.popText(m.kind === 'touch' ? 'NEXT SPIN TURNS GOLD!' : m.kind === 'vault' ? 'HIGH ROLLER! NEXT PAY MULTIPLIES!' : m.kind === 'volume' ? 'MAX VOLUME! DROP NEXT SPIN!' : 'NEXT SPIN: ALL JACKPOTS!', MACHINE_CX[e.side], MACHINE_TOP + MACHINE_H + 14, 2, m.color, 12, 0.6, true));
    }
    if (e.reels.length) this.settle(e.side, e.reels);
  }

  /** MIDAS TOUCH or JAX's all-jackpots spin: the meter pays off (MIDAS keeps any gold past what it spent). */
  private async payoff(e: Ev<'payoff'>): Promise<void> {
    const h = this.s.huds[e.side];
    const left = (e.left ?? 0) / UNIT;
    h.armed = left >= h.energyMax;
    this.bg(this.c.to(h, 'energy', left, 0.3, sineIn));
    this.s.sounds.fanfareJackpot();
    this.shake(4, 0.25);
    const color = h.meter?.color ?? COLORS.goldLight;
    // A callout over the machine, not a second banner (the PAIR!/JACKPOT! banner carries the math).
    const c = this.machineCenter(e.side);
    if (e.kind === 'volume') return;
    await this.popText(e.kind === 'touch' ? 'MIDAS TOUCH!' : e.kind === 'vault' ? `HIGH ROLLER X${e.mul ?? 1}!` : 'ALL JACKPOTS!', c.x, MACHINE_TOP + 30, 4, color, 30, 0.45);
  }

  /** THE JUKEBOX: THE DROP. A bass hit, every note in the window lights up, then they all hit (the attack follows). */
  private async drop(e: Omit<Ev<'drop'>, 'type'>): Promise<void> {
    const m = this.s.machines[e.side];
    const c = this.machineCenter(e.side);
    // Nothing to play: a small callout, no boom.
    if (!e.cells.length) {
      await this.popText('THE DROP... NO NOTES', c.x, MACHINE_TOP - 24, 2, COLORS.textDim, 12, 0.4);
      return;
    }
    this.s.sounds.drop();
    this.shake(7, 0.35);
    // Over the machine (not on the top row it lights), first; then the notes light up; the note group hits after.
    // Between the HUD and the machine (at scale 4 it ran over the HUD's border: R13 B3).
    await this.popText('THE DROP!', c.x, MACHINE_TOP - 18, 3, '#5ad8e8', 10, 0.25, true);
    const wilds = e.cells.filter((x) => x.wild);
    if (wilds.length) await this.luckyWilds(e.side, wilds);
    this.dropCells = e.amount > 0 ? e.cells : null;
    const g = this.lastScore?.groups.find((x) => x.drop);
    const lights = e.cells.map(async (ref, i) => {
      await this.c.wait(i * 0.04);
      const fx = m.reels[ref.reel]?.rows[ref.row];
      if (fx) {
        fx.flash = 0.9;
        this.bg(this.c.tween({ from: 0.9, to: 0, dur: 0.4, onUpdate: (v) => (fx.flash = v) }));
      }
      const p = cellCenter(e.side, ref.reel, ref.row);
      this.s.particles.burst({ x: p.x, y: p.y, count: 10, colors: ['#5ad8e8', '#ff9ec8', '#ffe45c'], speed: [60, 180], gravity: 0, life: [0.25, 0.45], size: [2, 4], kind: 'spark' });
      // A note off the payline shows what it hits for: its share of the drop's final pay (the payline's tags do the same).
      if (ref.row !== 1 && ref.v && g && g.base > 0) this.bg(this.popText(String(Math.round((g.amount * ref.v) / g.base)), p.x - 22, p.y + 22, 2, '#5ad8e8', 0, 0.9));
    });
    await Promise.all(lights);
    await this.c.wait(0.15);
  }

  /** MIDAS TOUCH: swords and shields turn gold (a gold rim with 1-3 pips) for the rest of the fight. */
  private async touch(e: Ev<'touch'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.lucky();
    const flips = e.cells.map(async (ref, i) => {
      const cell = m.reels[ref.reel]?.cells[ref.index];
      if (!cell) return;
      await this.c.wait(i * 0.06);
      cell.touch = ref.n;
      cell.flash = 0.8;
      this.bg(this.c.tween({ from: 0.8, to: 0, dur: 0.35, onUpdate: (v) => (cell.flash = v) }));
      const row = this.rowOf(e.side, ref);
      if (row >= 0) {
        const p = cellCenter(e.side, ref.reel, row);
        this.s.particles.burst({ x: p.x, y: p.y, count: 14, colors: ['#ffd23f', '#fff6c8'], speed: [60, 200], gravity: 0, life: [0.25, 0.5], size: [2, 4], kind: 'spark' });
      }
    });
    await Promise.all(flips);
    await this.c.wait(0.15);
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

  /** A jackpot of stolen cells: every stolen symbol comes home. */
  private async recover(e: Ev<'recover'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.cleanse();
    for (const [i, ref] of e.cells.entries()) {
      const cell = m.reels[ref.reel].cells[ref.index];
      const row = this.rowOf(e.side, ref);
      this.bg(this.c.to(cell, 'stolen', 0, 0.3, sineIn));
      if (row < 0) continue;
      const pos = cellCenter(e.side, ref.reel, row);
      this.s.sounds.pop(i);
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.4, onUpdate: (v) => (cell.flash = v) }));
      this.s.particles.burst({ x: pos.x, y: pos.y, count: 12, colors: ['#ffffff', '#c9a0ff'], speed: [60, 220], gravity: -300, life: [0.4, 0.8], size: [2, 4] });
      await this.c.wait(0.05);
    }
    await this.banner(e.cells.length ? `RECOVERED x${e.cells.length}!` : 'NOTHING STOLEN', COLORS.goldLight, 1.3, 0.4, '', BANNER_Y, 3);
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
    b.sub = `${e.turns} SPIN${e.turns === 1 ? '' : 'S'}`;
    await this.c.tween({ from: 0, to: 1.4, dur: 0.3, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    await this.c.tween({ from: 1.4, to: 1, dur: 0.2, ease: sineIn, onUpdate: (v) => (b.scale = v) });
    await this.c.wait(1.6);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (b.alpha = v) }).then(() => this.s.fx.remove(b)));
  }

  // ---- writers, abilities, boss --------------------------------------------------------

  private async heal(e: Ev<'heal'>): Promise<void> {
    const h = this.s.huds[e.side];
    this.s.sounds.heal();
    const b = h.hpBar();
    this.s.particles.burst({ x: b.x + b.w * (e.hp / h.maxHp), y: b.y + b.h / 2, count: 16, colors: ['#7dff7a', '#ffffff'], speed: [40, 160], gravity: -200, life: [0.4, 0.7], size: [2, 4] });
    this.bg(this.popText(`+${e.amount}`, b.x + b.w - 30, b.y - 4, 3, '#7dff7a', 20, 0.3));
    // A heal made of several: what each part was, small, under the number.
    if (e.parts) this.bg(this.popText(e.parts.map((p) => `+${p.amount} ${p.label}`).join('  '), b.x + b.w / 2, b.y + b.h + 16, 1.5, '#c8f0c8', 12, 0.6));
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
    if (e.status === 'raked') {
      const c = this.machineCenter(e.side);
      this.bg(this.popText('RAKE LIFTED', c.x, MACHINE_TOP - 30, 2, '#7dff7a', 16, 0.3));
      await this.c.wait(0.05);
      return;
    }
    if (e.status === 'hexed') {
      for (const r of e.reels) {
        m.hexed[r] = 0;
        this.bg(this.c.tween({ from: m.hexedFx[r], to: 0, dur: 0.4, onUpdate: (v) => (m.hexedFx[r] = v) }));
        const p = cellCenter(e.side, r, 1);
        this.s.particles.burst({ x: p.x, y: p.y, count: 12, colors: ['#e0a0ff', '#ffffff'], speed: [40, 160], gravity: -200, life: [0.3, 0.6], size: [2, 4] });
      }
      await this.c.wait(0.1);
      return;
    }
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
    if (e.repo) this.repossessed(e.to, e.symbols.map((s) => symLabel(s)).join(' + '));
    else this.bg(this.popText(`STOLEN x${e.cells.length}`, c.x, MACHINE_TOP - 4, 3, '#c9a0ff', 16, 0.3));
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

  private potPos() {
    return { x: W / 2, y: GUTTER_PANEL_Y + 54 };
  }

  private async pot(e: Ev<'pot'>): Promise<void> {
    const g = this.s.gutter;
    const dst = this.potPos();
    const n = Math.max(1, Math.min(9, Math.round(e.amount / UNIT)));
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
    g.pot = e.amount + e.potLeft;
    this.s.cheer?.(playerWins);
    const big = Math.min(1, e.amount / (15 * UNIT));
    if (e.amount >= 8 * UNIT || playerWins) this.s.sounds.fanfareJackpot();
    else this.s.sounds.stingerMedium();
    this.bg(this.banner(playerWins ? 'POT STOLEN!' : 'CASH OUT!', playerWins ? COLORS.goldLight : '#ff6a5a', 1.2 + 0.3 * big, 0.4, `${e.amount} DAMAGE`, BANNER_Y, 4));
    const n = Math.min(24, 6 + Math.round(e.amount / UNIT));
    const coins = Array.from({ length: n }, async (_, i) => {
      await this.c.wait(i * 0.03);
      const p = this.s.fx.add(new Projectile('coin', src.x, src.y, 3, false, COLORS.energy));
      await this.arc(p, target.x + (Math.random() * 2 - 1) * 100, target.y + (Math.random() * 2 - 1) * 80, 0.4, 120, sineIn);
      this.s.fx.remove(p);
      if (i % 3 === 0) this.s.sounds.coin(i % 12);
    });
    this.bg(this.c.to(g, 'pot', e.potLeft, 0.6));
    await Promise.all(coins);
    this.hitstop(Math.round(1 + 3 * big));
    this.shake(3 + 6 * big, 0.25 + 0.3 * big);
    this.s.camera.chromaPulse(0.2 + 0.6 * big);
    this.flashMachine(e.to, 0.5 + 0.5 * big, 0.25);
    this.knockback(e.to, 6 + 10 * big);
    this.s.sounds.hit(e.amount / UNIT);
    if (playerWins && e.amount >= 8 * UNIT)
      this.s.particles.burst({ x: target.x, y: target.y - 40, count: 80, colors: ['#ffd23f', '#ffe08a', '#fff6c8'], speed: [200, 600], angle: -Math.PI / 2, spread: Math.PI, gravity: 900, life: [0.8, 1.4], size: [4, 7], kind: 'confetti' });
    this.damageHud(e.to, e.targetHp, e.targetShield, e.hpDamage);
    this.bg(this.popText(`-${fmtNum(e.hpDamage)}`, target.x, MACHINE_TOP + 40, 8, COLORS.energy, 70, 0.5));
    await this.c.wait(0.5);
  }

  /** Boss phase 2: the House DOUBLES DOWN (the pot doubles). (ALL IN is the Dealer's word only.) */
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
    this.bg(this.banner('DOUBLE DOWN!', '#ff3a2e', 1.2, 0.5, 'THE POT DOUBLES', BANNER_Y, 4));
    const from = g.pot;
    await this.c.tween({ from, to: e.pot, dur: 0.8, ease: sineOut, onUpdate: (v) => (g.pot = v) });
    this.bg(this.c.tween({ from: 1.8, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (g.potPunch = v) }));
    await this.c.wait(0.3);
  }

  // ---- act 2 -----------------------------------------------------------------------------

  /** LUCKY gilds that turned WILD on this spin. */
  private async luckyWilds(side: SideId, cells: { reel: number; row: number }[]): Promise<void> {
    const m = this.s.machines[side];
    this.s.sounds.lucky();
    for (const { reel: r, row } of cells) {
      const p = cellCenter(side, r, row);
      const fx = m.reels[r].rows[row];
      fx.glowColor = '#7dff7a';
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.8, onUpdate: (v) => (fx.glow = v) }));
      const w = this.s.fx.add(new Projectile('wild', p.x, p.y, 0));
      this.bg(
        this.c
          .tween({ from: 0, to: 6, dur: 0.2, ease: backOut(3), onUpdate: (v) => (w.scale = v) })
          .then(() => this.c.wait(0.35))
          .then(() => this.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (w.alpha = v) }))
          .then(() => this.s.fx.remove(w)),
      );
      this.s.particles.burst({ x: p.x, y: p.y, count: 20, colors: ['#7dff7a', '#ffffff', '#ffd23f'], speed: [80, 260], gravity: -100, life: [0.3, 0.6], size: [2, 4] });
      this.bg(this.popText('LUCKY WILD!', p.x, p.y - 60, 2, '#7dff7a', 16, 0.4));
    }
    await this.c.wait(0.45);
  }

  private async hex(e: Ev<'hex'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#b04ae8');
    const flights = e.targets.map(async (r, i) => {
      await this.c.wait(i * 0.1);
      const src = this.srcPoint(e.from, e.reels, i);
      const dst = cellCenter(e.to, r, 1);
      const p = this.s.fx.add(new Projectile(artId('hex'), src.x, src.y, 3, false, '#b04ae8'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 2, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.4, 110, sineInOut);
      this.s.fx.remove(p);
      to.hexed[r] = Math.max(to.hexed[r], e.turns);
      this.bg(this.c.tween({ from: to.hexedFx[r], to: 1, dur: 0.3, ease: cubicOut, onUpdate: (v) => (to.hexedFx[r] = v) }));
      this.s.sounds.chains();
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 24, colors: ['#b04ae8', '#e0a0ff', '#2a1040'], speed: [60, 260], gravity: -60, life: [0.3, 0.7], size: [2, 5] });
    });
    await Promise.all(flights);
    const c = this.machineCenter(e.to);
    this.bg(this.popText(`JINXED ${e.turns} TURN${e.turns > 1 ? 'S' : ''}: HALF PAY`, c.x, MACHINE_TOP - 4, 2, '#e0a0ff', 16, 0.5));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.2);
  }

  private async bomb(e: Ev<'bomb'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#ff8a3a');
    const tosses = e.cells.map(async (ref, i) => {
      await this.c.wait(i * 0.1);
      const src = this.srcPoint(e.from, e.reels, i);
      const row = this.rowOf(e.to, ref);
      const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
      const p = this.s.fx.add(new Projectile(artId('bomb'), src.x, src.y, 3.5, false, '#ff8a3a'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 3, dur: 0.4, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.4, 130, sineIn);
      this.s.fx.remove(p);
      const cell = to.reels[ref.reel].cells[ref.index];
      cell.bomb = BOMB.fuse;
      this.bg(this.c.tween({ from: 0, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (cell.bombPop = v) }));
      this.s.sounds.rockThud();
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 10, colors: ['#ff8a3a', '#ffd23f', '#3a2a20'], speed: [60, 200], gravity: 500, life: [0.2, 0.4], size: [2, 4] });
    });
    await Promise.all(tosses);
    const c = this.machineCenter(e.to);
    this.bg(this.popText(`+${e.cells.length} IOU${e.cells.length > 1 ? 'S' : ''}: DUE IN ${BOMB.fuse}`, c.x, MACHINE_TOP - 30, 2, '#ffb070', 16, 0.5));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.15);
  }

  private async fuse(e: Ev<'fuse'>): Promise<void> {
    const m = this.s.machines[e.side];
    e.cells.forEach((ref, i) => {
      const cell = m.reels[ref.reel].cells[ref.index];
      cell.bomb = e.fuses[i];
    });
    if (e.fuses.some((f) => f <= 1)) this.s.sounds.abilityTick();
    await this.c.wait(0.1);
  }

  private async defuse(e: Ev<'defuse'>): Promise<void> {
    const m = this.s.machines[e.side];
    this.s.sounds.unchain();
    for (const ref of e.cells) {
      const cell = m.reels[ref.reel].cells[ref.index];
      this.bg(this.c.tween({ from: 1, to: 0, dur: 0.25, onUpdate: (v) => (cell.bombPop = v) }).then(() => (cell.bomb = 0)));
      const p = cellCenter(e.side, ref.reel, 1);
      this.s.particles.burst({ x: p.x, y: p.y, count: 12, colors: ['#7dff7a', '#ffffff'], speed: [60, 200], gravity: -150, life: [0.3, 0.5], size: [2, 4] });
    }
    const c = this.machineCenter(e.side);
    await this.popText(`PAID OFF${e.cells.length > 1 ? ` x${e.cells.length}` : ''}!`, c.x, MACHINE_TOP - 4, 3, '#7dff7a', 16, 0.3);
  }

  private async blast(e: Ev<'blast'>): Promise<void> {
    const m = this.s.machines[e.side];
    const cell = m.reels[e.cell.reel].cells[e.cell.index];
    cell.bomb = 0;
    const row = this.rowOf(e.side, e.cell);
    const p = row >= 0 ? cellCenter(e.side, e.cell.reel, row) : stripMapColumn(e.cell.reel);
    this.s.sounds.hit(6);
    this.s.sounds.rockThud();
    this.hitstop(2);
    this.shake(6, 0.3);
    this.s.camera.flashScreen(0.3, '#ffb070');
    this.flashMachine(e.side, 0.8, 0.2);
    this.knockback(e.side, 10);
    this.s.particles.burst({ x: p.x, y: p.y, count: 40, colors: ['#ff5a2a', '#ffd23f', '#ffffff', '#3a2a20'], speed: [150, 550], kind: 'spark', gravity: 400, life: [0.25, 0.6], size: [3, 6] });
    this.damageHud(e.side, e.targetHp, e.targetShield, e.hpDamage);
    const c = this.machineCenter(e.side);
    if (e.blocked > 0) this.bg(this.popText(`BLOCK ${e.blocked}`, c.x + 40, MACHINE_TOP + 70, 2, '#9fd0ff', 16, 0.3));
    this.bg(this.popText(e.hpDamage > 0 ? `PAY UP -${e.hpDamage}` : 'PAY UP!', c.x, MACHINE_TOP + 40, 4, '#ff8a3a', 50));
    await this.c.wait(0.35);
  }

  private async gulp(e: Ev<'gulp'>): Promise<void> {
    const c = this.machineCenter(e.from);
    this.s.sounds.coin(1);
    const chips = Array.from({ length: e.chips }, async (_, i) => {
      await this.c.wait(i * 0.1);
      const p = this.s.fx.add(new Projectile('chip', 40, 30, 3));
      await this.arc(p, c.x, c.y, 0.45, 120, sineIn);
      this.s.fx.remove(p);
      this.s.sounds.coin(6 + i);
    });
    await Promise.all(chips);
    this.s.gutter.chipsEaten = (this.s.gutter.chipsEaten ?? 0) + e.chips;
    await this.popText(`ATE ${e.chips} CHIP${e.chips > 1 ? 'S' : ''}!`, c.x, MACHINE_TOP - 4, 3, '#ffd23f', 16, 0.3);
  }

  private async phoenix(e: Ev<'phoenix'>): Promise<void> {
    const h = this.s.huds[e.side];
    const c = this.machineCenter(e.side);
    this.s.sounds.fanfareJackpot();
    this.hitstop(6);
    this.s.camera.flashScreen(0.7, '#ffb040');
    const icon = this.s.fx.add(new Projectile(RELICS.phoenix.sprite as SpriteId, c.x, c.y, 0));
    this.bg(this.c.tween({ from: 0, to: 6, dur: 0.3, ease: backOut(3), onUpdate: (v) => (icon.scale = v) }));
    this.s.particles.burst({ x: c.x, y: c.y, count: 80, colors: ['#ff6a2a', '#ffd23f', '#ffffff'], speed: [150, 500], angle: -Math.PI / 2, spread: Math.PI, gravity: -250, life: [0.5, 1.1], size: [3, 6] });
    this.bg(this.c.to(h, 'hp', e.hp, 0.3));
    this.bg(this.c.to(h, 'ghost', e.hp, 0.3));
    await this.banner('PHOENIX!', '#ff8a3a', 1.4, 0.5, 'BACK AT 1 HP', BANNER_Y, 4);
    this.bg(this.c.tween({ from: 1, to: 0, dur: 0.3, onUpdate: (v) => (icon.alpha = v) }).then(() => this.s.fx.remove(icon)));
  }

  /** The Counterfeiter slaps fake coins over your gilds. */
  private async fake(e: Ev<'fake'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#9a9a9a');
    // The whole gild is counterfeited: coins fly to the cells you can see, the rest go grey at once.
    const seen = e.cells.filter((ref) => this.rowOf(e.to, ref) >= 0);
    for (const ref of e.cells) if (!seen.includes(ref)) to.reels[ref.reel].cells[ref.index].faked = e.turns;
    const hits = seen.map(async (ref, i) => {
      await this.c.wait(i * 0.08);
      const src = this.srcPoint(e.from, e.reels, i);
      const row = this.rowOf(e.to, ref);
      const dst = cellCenter(e.to, ref.reel, row);
      const p = this.s.fx.add(new Projectile(artId('fake'), src.x, src.y, 3, false, '#9a9a9a'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 4, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.35, 90, sineIn);
      this.s.fx.remove(p);
      to.reels[ref.reel].cells[ref.index].faked = e.turns;
      this.s.sounds.coin(2);
      this.s.particles.burst({ x: dst.x, y: dst.y, count: 12, colors: ['#9a9a9a', '#5a5a5a', '#d0d0d0'], speed: [60, 200], gravity: 400, life: [0.2, 0.4], size: [2, 4] });
    });
    await Promise.all(hits);
    const c = this.machineCenter(e.to);
    this.bg(this.popText(`FAKED: ALL YOUR ${e.enhs.map((x) => x.toUpperCase()).join(' + ')} PAYS PLAIN ${e.turns} TURNS`, c.x, MACHINE_TOP - 30, 2, '#c0c0c0', 16, 0.6));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.15);
  }

  private async fakeTick(e: Ev<'fakeTick'>): Promise<void> {
    const m = this.s.machines[e.side];
    e.cells.forEach((ref, i) => (m.reels[ref.reel].cells[ref.index].faked = e.left[i]));
    await this.c.wait(0.02);
  }

  // ---- act 3 -----------------------------------------------------------------------------

  /** The Card Sharp flicks marked cards onto your cells. */
  private async markCells(e: Ev<'mark'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#ff5a7a');
    const flicks = e.cells.map(async (ref, i) => {
      await this.c.wait(i * 0.08);
      const src = this.srcPoint(e.from, e.reels, i);
      const row = this.rowOf(e.to, ref);
      const dst = cellCenter(e.to, ref.reel, Math.max(0, row));
      const p = this.s.fx.add(new Projectile(artId('card'), src.x, src.y, 3, false, '#ffffff'));
      this.bg(this.c.tween({ from: 0, to: Math.PI * 6, dur: 0.35, onUpdate: (v) => (p.rot = v) }));
      await this.arc(p, dst.x, dst.y, 0.35, 100, sineIn);
      this.s.fx.remove(p);
      to.reels[ref.reel].cells[ref.index].carded = true;
      this.s.sounds.click();
    });
    await Promise.all(flicks);
    const c = this.machineCenter(e.to);
    this.bg(this.popText(`MARKED x${e.cells.length}: THEY BITE ON YOUR PAYLINE`, c.x, MACHINE_TOP + 24, 2, '#ff8aa0', 16, 0.5));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.1);
  }

  private async markedHit(e: Ev<'markedHit'>): Promise<void> {
    const c = this.machineCenter(e.side);
    this.s.sounds.hit(e.amount / UNIT);
    this.shake(4, 0.2);
    this.flashMachine(e.side, 0.6, 0.15);
    for (const ref of e.cells) {
      const p = cellCenter(e.side, ref.reel, 1);
      this.s.particles.burst({ x: p.x, y: p.y, count: 14, colors: ['#ff5a7a', '#ffffff'], speed: [80, 260], kind: 'spark', gravity: 300, life: [0.2, 0.4], size: [2, 4] });
    }
    this.damageHud(e.side, e.targetHp, e.targetShield, e.hpDamage);
    // Credit the Dealer (its marks are most of its damage).
    const who = this.s.gutter.nextDeal ? "THE DEALER'S MARK" : 'MARKED!';
    await this.popText(e.hpDamage > 0 ? `${who} -${e.hpDamage}` : `${who} BLOCKED`, c.x, MACHINE_TOP + 40, 3, '#ff8aa0', 30, 0.3);
  }

  /** The Pit Boss bangs the gavel: gilds are taken for the fight. */
  private async confiscate(e: Ev<'confiscate'>): Promise<void> {
    const to = this.s.machines[e.to];
    if (e.reels.length) await this.activate(e.from, e.reels, '#c9a27a');
    this.s.sounds.rockThud();
    this.shake(5, 0.2);
    for (const ref of e.cells) {
      const cell = to.reels[ref.reel].cells[ref.index];
      cell.confiscated = cell.enh;
      delete cell.enh;
    }
    const c = this.machineCenter(e.to);
    if (e.repo) this.repossessed(e.to, `${e.enhs.map((x) => charmName(x)).join(' + ')} CHARM`);
    else this.bg(this.popText(`CONFISCATED: ${e.enhs.map((x) => x.toUpperCase()).join(' + ')}`, c.x, MACHINE_TOP - 30, 2, '#e0c090', 16, 0.6));
    if (e.reels.length) this.settle(e.from, e.reels);
    await this.c.wait(0.3);
  }

  /** THE REPO MAN's take: its own banner (the write that outlasts the fight). */
  private repossessed(to: SideId, what: string): void {
    const c = this.machineCenter(to);
    this.s.sounds.stingerMedium();
    this.bg(this.popText(`REPOSSESSED: ${what}`, c.x, MACHINE_TOP - 34, 2.5, '#ff9a3a', 18, 0.9));
    this.bg(this.popText('BACK AFTER THE FIGHT', c.x, MACHINE_TOP - 8, 1.5, '#ffd0a0', 10, 0.9));
  }

  private async rake(e: Ev<'rake'>): Promise<void> {
    if (e.reels.length) await this.activate(e.from, e.reels, '#c87a3a');
    this.s.sounds.coin(1);
    const c = this.machineCenter(e.to);
    await this.popText(`RAKED: GROUPS PAY -${e.cut} FOR ${e.turns} TURN${e.turns > 1 ? 'S' : ''}`, c.x, MACHINE_TOP - 30, 2, '#e0a070', 16, 0.5);
    if (e.reels.length) this.settle(e.from, e.reels);
  }

  /** THE DEALER beat: its next hand starts with a new HP bar (2 RAISE: its hits x1.5; 3 ALL IN every 2 turns). */
  private async dealerHand(e: Ev<'dealerHand'>): Promise<void> {
    const hud = this.s.huds[e.side];
    hud.maxHp = e.hp;
    hud.hp = hud.ghost = e.hp;
    hud.shield = 0;
    this.s.gutter.dealerHand = e.hand;
    // The table's card turns with the banner, not after it (playtest: HAND 3/3 over a BUST card).
    this.s.gutter.nextDeal = e.hand >= 3 ? 'allin' : 'card';
    if (hud.ability) {
      hud.ability = { ...hud.ability, every: e.every };
      hud.charge = 0;
      // Hand 3 goes ALL IN, not BUST (playtest: the HUD still said THE DEAL).
      hud.abilityLabel = e.hand >= 3 ? 'ALL IN' : undefined;
    }
    this.s.sounds.abilityFire();
    this.s.camera.chromaPulse(0.6);
    const rule = e.hand >= 3 ? `EVERY ${e.every} TURNS IT GOES ALL IN. IT PIERCES SHIELDS` : `ITS HITS ARE X${DEALER_RULES.raiseMul} FROM NOW ON`;
    await this.banner(`HAND ${e.hand}: ${DEALER_HANDS[e.hand - 1]}`, '#ff6a5a', 1.3, 0.6, rule, MACHINE_TOP + MACHINE_H / 2, 4);
  }

  // ---- THE WHEEL: PLACE YOUR BETS ------------------------------------------------------

  /** Where a reel's chip stack sits: on the bottom edge of your reel (screen coordinates). */
  private stackPos(reel: number) {
    const w = reelWindow('player');
    return { x: w.x + CELL * (reel + 0.5), y: w.y + MACHINE_H - 6 };
  }

  private syncTable(bets: number[], left?: number, per?: number): void {
    const g = this.s.gutter;
    g.bets = [...bets];
    if (left !== undefined && left > 0) g.betsLeft = left;
    if (per !== undefined) g.betPer = per;
    this.bg(this.c.tween({ from: 1.5, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (g.betPunch = v) }));
  }

  /** PLACE YOUR BETS: chips flip off the wheel and stack on your reels. */
  private async betPlaced(e: Ev<'betPlaced'>): Promise<void> {
    const m = this.s.machines.player;
    const from = { x: MACHINE_CX.enemy, y: MACHINE_TOP - 22 };
    if (e.ball) {
      const c = this.machineCenter('enemy');
      this.bg(this.popText(`THE BALL: +${e.reels.length} BET${e.reels.length > 1 ? 'S' : ''}`, c.x, MACHINE_TOP - 22, 2, '#ff8a7a', 16, 0.4));
    }
    const flights = e.reels.map(async (r, i) => {
      await this.c.wait(i * 0.1);
      const p = this.s.fx.add(new Projectile(artId('betChip'), from.x, from.y, 3, false, '#ff6a5a'));
      const to = this.stackPos(r);
      this.s.sounds.click();
      await this.arc(p, to.x, to.y - 10, 0.4, 120, sineInOut);
      this.s.fx.remove(p);
      m.bets[r] = Math.min(9, m.bets[r] + 1);
      this.s.sounds.coin(3 + i * 2);
      const k = m.betPop;
      this.bg(this.c.tween({ from: 1.7, to: 1, dur: 0.25, ease: backOut(3), onUpdate: (v) => (k[r] = v) }));
    });
    await Promise.all(flights);
    m.bets = [...e.bets];
    this.syncTable(e.bets, e.left, e.per);
    await this.c.wait(0.1);
  }

  /** Your pair took the bets off its reels (a jackpot: TABLE CLEARED!): the chips fly to your chip count. */
  private async betSwept(e: Ev<'betSwept'>): Promise<void> {
    const m = this.s.machines.player;
    const pc = this.machineCenter('player');
    if (e.table) {
      this.s.sounds.fanfareJackpot();
      this.bg(this.banner('TABLE CLEARED!', COLORS.goldLight, 1.3, 0.4, `+${e.chips} CHIP${e.chips > 1 ? 'S' : ''}`, BANNER_Y, 4));
    } else this.bg(this.popText('BETS CLEARED!', pc.x, MACHINE_TOP - 22, 3, COLORS.goldLight, 20, 0.45));
    const flights = e.reels.flatMap((r) =>
      Array.from({ length: Math.min(3, m.bets[r] || 1) }, async (_, i) => {
        await this.c.wait(i * 0.07 + r * 0.05);
        const at = this.stackPos(r);
        const p = this.s.fx.add(new Projectile(artId('betChip'), at.x, at.y - 10 - i * 8, 3, false, COLORS.goldLight));
        if (i === 0) m.bets[r] = 0;
        await this.arc(p, CHIP_COUNTER.x, CHIP_COUNTER.y, 0.5, 90, sineIn);
        this.s.fx.remove(p);
        this.s.sounds.coin(6 + i * 2);
      }),
    );
    for (const r of e.reels) this.s.particles.burst({ x: this.stackPos(r).x, y: this.stackPos(r).y - 14, count: 18, colors: ['#ffe08a', '#ffffff', '#d9a640'], speed: [80, 260], kind: 'spark', gravity: 300, life: [0.2, 0.45], size: [2, 4] });
    await Promise.all(flights);
    m.bets = [...e.bets];
    this.syncTable(e.bets);
  }

  /** NO MORE BETS: the ball drops; every chip left on your reels hits at once. */
  private async noMoreBets(e: Ev<'noMoreBets'>): Promise<void> {
    const m = this.s.machines.player;
    const g = this.s.gutter;
    g.wheelSpeed = Math.max(g.wheelSpeed ?? 0, 16);
    // The ball rattles round, slows, drops.
    for (let i = 0; i < 6; i++) {
      this.s.sounds.click();
      await this.c.wait(0.06 + i * 0.03);
    }
    if (e.chips <= 0) {
      const c = this.machineCenter('player');
      await this.popText('NO MORE BETS: THE TABLE IS CLEAN!', c.x, MACHINE_TOP - 22, 2, COLORS.goldLight, 16, 0.5);
      this.syncTable([0, 0, 0]);
      return;
    }
    // Every stack lights red, then bursts.
    for (let r = 0; r < 3; r++) if (m.bets[r] > 0) this.bg(this.c.tween({ from: 0, to: 1, dur: 0.25, onUpdate: (v) => (m.betGlow[r] = v) }));
    await this.c.wait(0.3);
    for (let r = 0; r < 3; r++) {
      if (m.bets[r] <= 0) continue;
      const at = this.stackPos(r);
      this.s.particles.burst({ x: at.x, y: at.y - 14, count: 14 + m.bets[r] * 8, colors: ['#ff3a2e', '#1a1018', '#ffffff', '#b0202e'], speed: [120, 420], kind: 'spark', gravity: 500, life: [0.25, 0.6], size: [2, 5] });
    }
    this.s.sounds.hit(e.amount / UNIT);
    this.hitstop(3);
    this.shake(4 + Math.min(8, e.chips), 0.35);
    this.flashMachine('player', 0.6, 0.2);
    this.knockback('player', 6 + Math.min(10, e.chips * 2));
    this.s.camera.chromaPulse(0.3);
    const h = this.s.huds.player;
    if (e.blocked > 0) {
      this.s.sounds.block();
      const sb = h.shieldBar();
      this.decay(h, 'shieldFlash', 1, 0.25);
      this.bg(this.popText(`BLOCK ${e.blocked}`, sb.x + sb.w / 2, sb.y + sb.h / 2, 2.5, '#9fd0ff', 16, 0.3));
    }
    this.damageHud('player', e.targetHp, e.targetShield, e.hpDamage);
    m.bets = [0, 0, 0];
    m.betGlow = [0, 0, 0];
    this.syncTable([0, 0, 0]);
    const c = this.machineCenter('player');
    await this.popText(e.hpDamage > 0 ? `NO MORE BETS! -${fmtNum(e.hpDamage)}` : 'NO MORE BETS! BLOCKED', c.x, MACHINE_TOP + 60, 3, '#ff6a5a', 30, 0.5);
  }

  /** THE WHEEL SPINS FASTER at half HP: 3 chips a turn from now on. */
  private async wheelFast(e: Ev<'wheelFast'>): Promise<void> {
    const g = this.s.gutter;
    g.wheelFast = true;
    g.wheelSpeed = 18;
    this.s.sounds.abilityFire();
    this.hitstop(4);
    this.shake(6, 0.4);
    this.s.camera.chromaPulse(0.6);
    this.flashMachine(e.side, 0.5, 0.4);
    const c = this.machineCenter(e.side);
    this.s.particles.burst({ x: c.x, y: MACHINE_TOP - 22, count: 50, colors: ['#ff3a2e', '#1a1018', '#ffe08a'], speed: [150, 500], kind: 'spark', gravity: 400, life: [0.4, 0.8], size: [2, 5] });
    await this.banner('THE WHEEL SPINS FASTER!', '#ff6a5a', 1.25, 0.5, `${e.per} CHIPS A TURN NOW`, BANNER_Y, 4);
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
