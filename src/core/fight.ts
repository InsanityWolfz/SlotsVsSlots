import { cloneConfig, type AbilityDef, type GameConfig, type RelicId, type SideConfig, type SideId, type SymbolId } from './config';
import type { CombatEvent } from './events';
import { BATTERY_ENERGY, CLOVER_CHANCE, FANG_HEAL, WHETSTONE_BONUS } from './relics';
import { Rng } from './rng';
import { isNearMiss, scoreLine, type LineScore, type ScoreGroup } from './scoring';
import {
  buildReel,
  DEAD,
  effectiveSymbol,
  insertOffscreen,
  paylineSymbols,
  symbolValue,
  visibleCells,
  type CellRef,
  type Reel,
} from './strip';

/** Symbols that act on the opponent when they're native to the caster's strips. */
const WRITERS: ReadonlySet<SymbolId> = new Set(['slime', 'ice', 'claw', 'rock', 'lock', 'coin']);

export interface Combatant {
  side: SideId;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  reels: Reel[];
  /** Writer symbols native to this side's strips. */
  casts: Set<SymbolId>;
  /** Remaining own-turns each reel stays frozen (doesn't spin). */
  frozen: number[];
  /** Remaining own-turns each reel is jammed (scores nothing). */
  locked: number[];
  ability: AbilityDef | null;
  charge: number;
  relics: Set<RelicId>;
}

export interface TurnResult {
  turn: number;
  side: SideId;
  events: CombatEvent[];
}

export const other = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

/** 1 → 1 reel for 1 turn, a double (4) → 2 reels × 2 turns, a jackpot (9) → 3 × 3. */
export const statusSize = (amount: number) => Math.max(1, Math.min(3, Math.round(Math.sqrt(amount))));

function makeCombatant(side: SideId, sc: SideConfig, rng: Rng, relics: RelicId[]): Combatant {
  const reels = sc.strips.map((counts) => buildReel(counts, rng));
  const casts = new Set<SymbolId>();
  for (const c of sc.strips) for (const [s, n] of Object.entries(c)) if ((n ?? 0) > 0 && WRITERS.has(s as SymbolId)) casts.add(s as SymbolId);
  // The player's own slime/rock are debuffs, never casts.
  if (side === 'player') casts.clear();
  return {
    side,
    hp: Math.min(sc.hp, sc.startHp ?? sc.hp),
    maxHp: sc.hp,
    shield: 0,
    energy: sc.startEnergy ?? 0,
    reels,
    casts,
    frozen: reels.map(() => 0),
    locked: reels.map(() => 0),
    ability: sc.ability ?? null,
    charge: 0,
    relics: new Set(side === 'player' ? relics : []),
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
  /** The House's progressive pot (boss fight). */
  pot = 0;
  private forced: Partial<Record<SideId, SymbolId[]>> = {};

  constructor(cfg: GameConfig, seed: number = cfg.seed ?? Rng.randomSeed()) {
    this.cfg = cloneConfig(cfg);
    this.rng = new Rng(seed);
    this.sides = {
      player: makeCombatant('player', this.cfg.player, this.rng, this.cfg.relics),
      enemy: makeCombatant('enemy', this.cfg.enemy, this.rng, []),
    };
    const p = this.sides.player;
    if (p.relics.has('battery')) p.energy = Math.min(this.cfg.specialCost - 1, p.energy + BATTERY_ENERGY);
    const e = this.sides.enemy;
    if (e.ability && p.relics.has('hourglass')) e.ability = { ...e.ability, every: e.ability.every + 1 };
  }

  get seed(): number {
    return this.rng.seed;
  }

  get over(): boolean {
    return this.winner !== null;
  }

  get isBoss(): boolean {
    return this.cfg.enemy.boss === 'house';
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

    const frozen = me.frozen.map((t) => t > 0);
    const locked = me.locked.map((t) => t > 0);
    const { stops, lucky } = this.rollStops(me, frozen, this.forced[side]);
    delete this.forced[side];
    me.reels.forEach((reel, i) => (reel.stop = stops[i]));
    const line = paylineSymbols(me.reels).map((s, i) => (locked[i] ? 'lock' : s));
    const score = this.score(me, line);
    // Dead symbols lining up isn't a tease — except slime, which can cleanse.
    const nearMiss = isNearMiss(line) && (me.casts.has(line[0]) || line[0] === 'slime' || !DEAD.has(line[0]));
    events.push({ type: 'spin', side, stops, score, nearMiss, frozen, locked, lucky });

    for (const group of score.groups) {
      this.resolveGroup(me, group, score, events);
      if (this.over) break;
    }
    if (!this.over && side === 'player' && this.isBoss && score.tier === 'triple') this.winPot(me, events);

    if (!this.over) this.tickStatuses(me, events);
    if (!this.over && me.ability) this.chargeAbility(me, events);

    if (!this.over && this.cfg.shieldReset === 'roundEnd' && side === 'enemy') {
      this.resetShield(this.sides.player, events);
      this.resetShield(this.sides.enemy, events);
    }

    this.next = other(side);
    return { turn: this.turn, side, events };
  }

  private score(me: Combatant, line: SymbolId[]): LineScore {
    const pairRule = me.relics.has('mirror') ? 'anyTwo' : this.cfg.pairRule;
    const s = scoreLine(line, { ...this.cfg, pairRule });
    if (me.relics.has('whetstone')) {
      for (const g of s.groups) if (g.matched && g.symbol === 'sword') g.amount += WHETSTONE_BONUS;
      s.totals = {};
      for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
    }
    return s;
  }

  private resetShield(c: Combatant, events: CombatEvent[]): void {
    if (c.shield <= 0) return;
    events.push({ type: 'shieldReset', side: c.side, lost: c.shield });
    c.shield = 0;
  }

  private rollStops(c: Combatant, frozen: boolean[], forced?: SymbolId[]): { stops: number[]; lucky: RelicId | null } {
    const stops = c.reels.map((reel, r) => {
      if (frozen[r]) return reel.stop;
      const want = forced?.[r];
      if (want) {
        const hits = reel.cells.flatMap((cell, i) => (effectiveSymbol(cell) === want ? [i] : []));
        if (hits.length) return this.rng.pick(hits);
      }
      return this.rng.int(reel.cells.length);
    });
    // Lucky Clover: a near-miss sometimes lands the third symbol after all.
    let lucky: RelicId | null = null;
    if (c.relics.has('clover') && stops.length >= 3 && !frozen[2] && !c.locked.some((t) => t > 0)) {
      const sym = stops.map((s, r) => effectiveSymbol(c.reels[r].cells[s]));
      if (sym[0] === sym[1] && sym[2] !== sym[0] && !DEAD.has(sym[0])) {
        const roll = this.rng.next();
        const hits = c.reels[2].cells.flatMap((cell, i) => (effectiveSymbol(cell) === sym[0] ? [i] : []));
        if (roll < CLOVER_CHANCE && hits.length) {
          stops[2] = this.rng.pick(hits);
          lucky = 'clover';
        }
      }
    }
    return { stops, lucky };
  }

  private resolveGroup(me: Combatant, g: ScoreGroup, score: LineScore, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    switch (g.symbol) {
      case 'sword':
        this.hit(me, foe, g.amount, g.reels, events);
        return;
      case 'seven':
        // Sevens are the House's heavy hitters.
        this.hit(me, foe, g.amount, g.reels, events);
        return;
      case 'shield':
        me.shield += g.amount;
        events.push({ type: 'shieldGain', side: me.side, reels: g.reels, amount: g.amount, total: me.shield });
        return;
      case 'bolt':
        this.gainEnergy(me, g.amount, g.reels, events);
        return;
    }
    if (me.casts.has(g.symbol)) {
      this.write(me, foe, g.symbol, g.amount, g.reels, events);
      return;
    }
    if (g.symbol === 'slime' && g.matched && this.cfg.cleanseOnSlimeTriple && (g.reels.length >= 3 || me.relics.has('soap'))) {
      this.cleanse(me, g.reels, events);
      return;
    }
    if (g.symbol === 'rock' && me.relics.has('magnet')) {
      this.gainEnergy(me, g.amount, g.reels, events);
      return;
    }
    void score;
    events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: g.symbol });
  }

  private hit(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const h = this.damage(foe, amount, false);
    events.push({ type: 'attack', from: me.side, to: foe.side, reels, amount, ...h });
    this.checkDeath(foe, events);
  }

  private gainEnergy(me: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    me.energy += amount;
    events.push({ type: 'energyGain', side: me.side, reels, amount, total: me.energy });
    while (me.energy >= this.cfg.specialCost && !this.over) {
      me.energy -= this.cfg.specialCost;
      const h = this.damage(foe, this.cfg.specialDamage, this.cfg.specialIgnoresShield);
      events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: this.cfg.specialDamage, ...h, energyLeft: me.energy });
      this.checkDeath(foe, events);
      if (!this.over && me.relics.has('fang')) this.heal(me, FANG_HEAL, 'fang', events);
    }
  }

  private heal(me: Combatant, amount: number, source: RelicId | 'special', events: CombatEvent[]): void {
    const n = Math.min(amount, me.maxHp - me.hp);
    if (n <= 0) return;
    me.hp += n;
    events.push({ type: 'heal', side: me.side, amount: n, hp: me.hp, source });
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

  // ---- writers: what an enemy does to your machine ------------------------------------

  private write(me: Combatant, foe: Combatant, sym: SymbolId, amount: number, reels: number[], events: CombatEvent[]): void {
    switch (sym) {
      case 'slime':
        return this.applySlime(me, foe, amount, reels, events);
      case 'ice':
        return this.applyStatus(me, foe, 'frozen', statusSize(amount), statusSize(amount), reels, events);
      case 'lock':
        // Jams bite hard (the reel scores nothing), so they only ever last one turn.
        return this.applyStatus(me, foe, 'locked', amount >= 9 ? 2 : 1, 1, reels, events);
      case 'claw':
        return this.steal(me, foe, statusSize(amount), reels, events);
      case 'rock':
        // Rocks are permanent for the run, so they come in small doses (1 / 2 / 3).
        return this.junk(me, foe, statusSize(amount), reels, events);
      case 'coin':
        this.pot += amount;
        events.push({ type: 'pot', side: me.side, reels, amount, total: this.pot });
        return;
    }
  }

  private applySlime(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const clean = visibleCells(foe.reels).filter((ref) => {
      const c = foe.reels[ref.reel].cells[ref.index];
      return !c.slimed && !c.stolen;
    });
    const cells: CellRef[] = this.rng.shuffle(clean).slice(0, amount);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].slimed = true;
    events.push({ type: 'slime', from: me.side, to: foe.side, reels, amount, cells, wasted: amount - cells.length });
  }

  /**
   * Freeze/jam `count` of the foe's reels for `turns` of their turns. Freeze targets the
   * reels showing the least useful payline symbol (locks junk in place); jam targets the best.
   */
  private applyStatus(me: Combatant, foe: Combatant, status: 'frozen' | 'locked', count: number, turns: number, reels: number[], events: CombatEvent[]): void {
    const arr = foe[status];
    const value = (r: number) => symbolValue(effectiveSymbol(foe.reels[r].cells[foe.reels[r].stop]));
    const order = this.rng.shuffle(foe.reels.map((_, r) => r));
    order.sort((a, b) => (status === 'frozen' ? value(a) - value(b) : value(b) - value(a)));
    const targets = order.slice(0, count).sort((a, b) => a - b);
    for (const r of targets) arr[r] = Math.max(arr[r], turns);
    events.push({ type: status === 'frozen' ? 'freeze' : 'lock', from: me.side, to: foe.side, reels, targets, turns });
  }

  private tickStatuses(me: Combatant, events: CombatEvent[]): void {
    for (const status of ['frozen', 'locked'] as const) {
      const ended: number[] = [];
      me[status].forEach((t, r) => {
        if (t <= 0) return;
        me[status][r] = t - 1;
        if (t - 1 === 0) ended.push(r);
      });
      if (ended.length) events.push({ type: 'thaw', side: me.side, reels: ended, status });
    }
  }

  private steal(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const pool = this.rng.shuffle(
      visibleCells(foe.reels).filter((ref) => {
        const c = foe.reels[ref.reel].cells[ref.index];
        return !c.stolen && !c.slimed && symbolValue(c.symbol) > 0;
      }),
    );
    pool.sort((a, b) => symbolValue(foe.reels[b.reel].cells[b.index].symbol) - symbolValue(foe.reels[a.reel].cells[a.index].symbol));
    const cells = pool.slice(0, amount);
    const symbols = cells.map((ref) => foe.reels[ref.reel].cells[ref.index].symbol);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].stolen = true;
    events.push({ type: 'steal', from: me.side, to: foe.side, reels, cells, symbols, wasted: amount - cells.length });
  }

  private junk(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const inserts: CellRef[] = [];
    // A jackpot of rocks shouldn't bury a strip outright: cap per fight via strip length.
    const n = Math.min(amount, 6);
    for (let i = 0; i < n; i++) {
      const candidates = foe.reels.map((r, idx) => ({ r, idx })).filter(({ r }) => r.cells.length < 24);
      if (!candidates.length) break;
      const { r, idx } = this.rng.pick(candidates);
      const index = insertOffscreen(r, { symbol: 'rock', slimed: false }, this.rng);
      inserts.push({ reel: idx, index });
    }
    events.push({ type: 'junk', from: me.side, to: foe.side, reels, inserts });
  }

  private cleanse(me: Combatant, reels: number[], events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    me.reels.forEach((reel, r) =>
      reel.cells.forEach((cell, i) => {
        if (!cell.slimed) return;
        cell.slimed = false;
        cells.push({ reel: r, index: i });
      }),
    );
    events.push({ type: 'cleanse', side: me.side, reels, cells });
  }

  // ---- enemy ability (passive telegraph) ---------------------------------------------

  private chargeAbility(me: Combatant, events: CombatEvent[]): void {
    const ab = me.ability!;
    me.charge++;
    if (me.charge >= ab.every) {
      me.charge = 0;
      events.push({ type: 'abilityCharge', side: me.side, charge: ab.every, every: ab.every, kind: ab.kind });
      events.push({ type: 'ability', side: me.side, kind: ab.kind, power: ab.power });
      this.fireAbility(me, ab, events);
      if (this.over) return;
    }
    events.push({ type: 'abilityCharge', side: me.side, charge: me.charge, every: ab.every, kind: ab.kind });
  }

  private fireAbility(me: Combatant, ab: AbilityDef, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    switch (ab.kind) {
      case 'flood':
        return this.applySlime(me, foe, ab.power, [], events);
      case 'smash':
        return this.hit(me, foe, ab.power, [], events);
      case 'fortify':
        me.shield += ab.power;
        events.push({ type: 'shieldGain', side: me.side, reels: [], amount: ab.power, total: me.shield });
        return;
      case 'blizzard':
        return this.applyStatus(me, foe, 'frozen', ab.power, 2, [], events);
      case 'jam':
        return this.applyStatus(me, foe, 'locked', 1, ab.power, [], events);
      case 'pilfer':
        return this.steal(me, foe, ab.power, [], events);
      case 'quake':
        return this.junk(me, foe, ab.power, [], events);
      case 'jackpot':
        return this.cashPot(me, foe, events);
    }
  }

  // ---- boss: the progressive pot ------------------------------------------------------

  /** The House cashes out the pot as damage (shield blocks). */
  private cashPot(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const amount = this.pot;
    this.pot = 0;
    const h = this.damage(foe, amount, false);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h });
    this.checkDeath(foe, events);
  }

  /** Any player jackpot against the House steals the pot, ignoring shield. */
  private winPot(me: Combatant, events: CombatEvent[]): void {
    if (this.pot <= 0) return;
    const foe = this.sides[other(me.side)];
    const amount = this.pot;
    this.pot = 0;
    const h = this.damage(foe, amount, true);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h });
    this.checkDeath(foe, events);
  }
}
