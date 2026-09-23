import { cloneConfig, type GameConfig, type SideConfig, type SideId, type SymbolId } from './config';
import type { CombatEvent } from './events';
import { Rng } from './rng';
import { isNearMiss, scoreLine, type ScoreGroup } from './scoring';
import { buildReel, effectiveSymbol, paylineSymbols, visibleCells, type CellRef, type Reel } from './strip';

export interface Combatant {
  side: SideId;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  reels: Reel[];
  /** Strips natively contain slime, so slime on this machine's payline attacks the opponent. */
  slimeCaster: boolean;
}

export interface TurnResult {
  turn: number;
  side: SideId;
  events: CombatEvent[];
}

export const other = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

function makeCombatant(side: SideId, sc: SideConfig, rng: Rng): Combatant {
  return {
    side,
    hp: sc.hp,
    maxHp: sc.hp,
    shield: 0,
    energy: 0,
    reels: sc.strips.map((counts) => buildReel(counts, rng)),
    slimeCaster: sc.strips.some((c) => (c.slime ?? 0) > 0),
  };
}

/**
 * The whole fight as a pure state machine. Each step() is one combatant's turn: the full
 * outcome (stops, scoring, effects) is decided here, before any animation plays.
 */
export class Fight {
  readonly cfg: GameConfig;
  readonly rng: Rng;
  readonly sides: Record<SideId, Combatant>;
  turn = 0;
  next: SideId = 'player';
  winner: SideId | null = null;
  private forced: Partial<Record<SideId, SymbolId[]>> = {};

  constructor(cfg: GameConfig, seed: number = cfg.seed ?? Rng.randomSeed()) {
    this.cfg = cloneConfig(cfg);
    this.rng = new Rng(seed);
    this.sides = {
      player: makeCombatant('player', this.cfg.player, this.rng),
      enemy: makeCombatant('enemy', this.cfg.enemy, this.rng),
    };
  }

  get seed(): number {
    return this.rng.seed;
  }

  get over(): boolean {
    return this.winner !== null;
  }

  /** Debug: make the next spin of `side` land these payline symbols where the strip allows. */
  forceNext(side: SideId, line: SymbolId[]): void {
    this.forced[side] = line;
  }

  step(): TurnResult {
    if (this.over) throw new Error('Fight is over');
    const side = this.next;
    const me = this.sides[side];
    const events: CombatEvent[] = [];
    this.turn++;
    events.push({ type: 'turnStart', turn: this.turn, side });

    if (this.cfg.shieldReset === 'ownTurnStart') this.resetShield(me, events);

    const stops = this.rollStops(me, this.forced[side]);
    delete this.forced[side];
    me.reels.forEach((reel, i) => (reel.stop = stops[i]));
    const line = paylineSymbols(me.reels);
    const score = scoreLine(line, this.cfg);
    events.push({ type: 'spin', side, stops, score, nearMiss: isNearMiss(line) });

    for (const group of score.groups) {
      this.resolveGroup(me, group, events);
      if (this.over) break;
    }

    if (!this.over && this.cfg.shieldReset === 'roundEnd' && side === 'enemy') {
      this.resetShield(this.sides.player, events);
      this.resetShield(this.sides.enemy, events);
    }

    this.next = other(side);
    return { turn: this.turn, side, events };
  }

  private resetShield(c: Combatant, events: CombatEvent[]): void {
    if (c.shield <= 0) return;
    events.push({ type: 'shieldReset', side: c.side, lost: c.shield });
    c.shield = 0;
  }

  private rollStops(c: Combatant, forced?: SymbolId[]): number[] {
    return c.reels.map((reel, r) => {
      const want = forced?.[r];
      if (want) {
        const hits = reel.cells.flatMap((cell, i) => (effectiveSymbol(cell) === want ? [i] : []));
        if (hits.length) return this.rng.pick(hits);
      }
      return this.rng.int(reel.cells.length);
    });
  }

  private resolveGroup(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    switch (g.symbol) {
      case 'sword': {
        const hit = this.damage(foe, g.amount, false);
        events.push({ type: 'attack', from: me.side, to: foe.side, reels: g.reels, amount: g.amount, ...hit });
        this.checkDeath(foe, events);
        break;
      }
      case 'shield':
        me.shield += g.amount;
        events.push({ type: 'shieldGain', side: me.side, reels: g.reels, amount: g.amount, total: me.shield });
        break;
      case 'bolt':
        me.energy += g.amount;
        events.push({ type: 'energyGain', side: me.side, reels: g.reels, amount: g.amount, total: me.energy });
        while (me.energy >= this.cfg.specialCost && !this.over) {
          me.energy -= this.cfg.specialCost;
          const hit = this.damage(foe, this.cfg.specialDamage, this.cfg.specialIgnoresShield);
          events.push({
            type: 'specialFire',
            from: me.side,
            to: foe.side,
            amount: this.cfg.specialDamage,
            ...hit,
            energyLeft: me.energy,
          });
          this.checkDeath(foe, events);
        }
        break;
      case 'slime':
        if (me.slimeCaster) this.applySlime(me, foe, g, events);
        else if (g.matched && g.reels.length >= 3 && this.cfg.cleanseOnSlimeTriple) this.cleanse(me, g, events);
        else events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: 'slime' });
        break;
    }
  }

  private damage(target: Combatant, amount: number, ignoreShield: boolean) {
    const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
    target.shield -= blocked;
    const hpDamage = Math.min(target.hp, amount - blocked);
    target.hp -= hpDamage;
    return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
  }

  private checkDeath(c: Combatant, events: CombatEvent[]): void {
    if (c.hp > 0 || this.over) return;
    this.winner = other(c.side);
    events.push({ type: 'death', side: c.side });
    events.push({ type: 'fightEnd', winner: this.winner, turns: this.turn });
  }

  private applySlime(me: Combatant, foe: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    const clean = visibleCells(foe.reels).filter((ref) => !foe.reels[ref.reel].cells[ref.index].slimed);
    const cells: CellRef[] = this.rng.shuffle(clean).slice(0, g.amount);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].slimed = true;
    events.push({
      type: 'slime',
      from: me.side,
      to: foe.side,
      reels: g.reels,
      amount: g.amount,
      cells,
      wasted: g.amount - cells.length,
    });
  }

  private cleanse(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    me.reels.forEach((reel, r) =>
      reel.cells.forEach((cell, i) => {
        if (!cell.slimed) return;
        cell.slimed = false;
        cells.push({ reel: r, index: i });
      }),
    );
    events.push({ type: 'cleanse', side: me.side, reels: g.reels, cells });
  }
}
