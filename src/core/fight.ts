import { cloneConfig, type AbilityDef, type GameConfig, type RelicId, type SideConfig, type SideId, type SymbolId } from './config';
import type { CombatEvent } from './events';
import {
  BATTERY_ENERGY,
  CACTUS_DAMAGE,
  CLOVER_CHANCE,
  FANG_HEAL,
  HONE_BONUS,
  KEEN_BONUS,
  LOCKPICK_CHANCE,
  MOUSETRAP_CHANCE,
  MOUSETRAP_DAMAGE,
  POT,
  ROD_SPECIAL_COST,
  SPIKED_DAMAGE,
} from './relics';
import { Rng } from './rng';
import { isNearMiss, scoreLine, type LineScore, type ScoreGroup } from './scoring';
import {
  buildReel,
  cellValue,
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
  const reels = sc.strips.map((counts, r) => buildReel(counts, rng, (sc.gilded ?? []).filter((g) => g.reel === r)));
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
  /** Boss went ALL IN (phase 2). */
  allIn = false;
  /** The House's cash-out fires at the start of its next turn (so LETHAL is always accurate). */
  cashPending = false;
  /** Run economy inputs: player jackpots landed and the overkill of the killing blow. */
  playerJackpots = 0;
  overkill = 0;
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
    // Lightning Rod: a charged-bolt build makes the special cheaper.
    if (p.relics.has('rod') && p.reels.some((r) => r.cells.some((c) => c.enh === 'charged'))) this.cfg.specialCost = ROD_SPECIAL_COST;
    if (this.isBoss) this.pot = POT.seed;
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
    if (side === 'enemy' && this.isBoss) {
      const p = this.sides.player;
      const stack = this.cfg.player.stackShield ?? 0;
      if (stack > 0) {
        p.shield += stack;
        events.push({ type: 'shieldGain', side: 'player', reels: [], amount: stack, total: p.shield });
      }
      if (this.cashPending && me.ability) {
        this.cashPending = false;
        me.charge = 0;
        events.push({ type: 'ability', side: me.side, kind: me.ability.kind, power: me.ability.power });
        this.cashPot(me, p, events);
        if (this.over) {
          this.next = other(side);
          return { turn: this.turn, side, events };
        }
        events.push({ type: 'abilityCharge', side: me.side, charge: 0, every: me.ability.every, kind: me.ability.kind });
      }
    }

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

    if (side === 'player' && score.tier === 'triple') this.playerJackpots++;
    for (const group of score.groups) {
      this.resolveGroup(me, group, score, events);
      if (this.over) break;
    }
    // Midas: gold cells on the payline also give energy.
    if (!this.over && me.relics.has('midas')) {
      const gold = me.reels.map((_, r) => r).filter((r) => this.paylineEnh(me, r) === 'gold');
      if (gold.length) this.gainEnergy(me, gold.length, gold, events);
    }
    const steals = score.tier === 'triple' || (score.tier === 'pair' && me.relics.has('crown'));
    if (!this.over && side === 'player' && this.isBoss && steals) this.winPot(me, events, score.tier === 'triple' ? 1 : 0.5);
    // The house always takes its cut.
    if (!this.over && side === 'enemy' && this.isBoss) {
      this.pot += POT.houseCut;
      events.push({ type: 'pot', side, reels: [], amount: POT.houseCut, total: this.pot });
    }

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
    for (const g of s.groups) {
      g.base = g.amount;
      const notes: string[] = [];
      for (const r of g.reels) {
        const enh = this.paylineEnh(me, r);
        if (enh === 'keen' && g.symbol === 'sword') {
          const bonus = KEEN_BONUS + (me.relics.has('hone') ? HONE_BONUS : 0);
          g.amount += bonus;
          notes.push(`+${bonus}`);
        }
        if (enh === 'charged' && g.symbol === 'bolt') {
          g.amount += 1;
          notes.push('+1');
        }
      }
      for (const r of g.reels) {
        if (this.paylineEnh(me, r) !== 'gold') continue;
        g.amount *= 2;
        notes.push('X2');
      }
      // Prism: a match that used a WILD pays double.
      if (me.relics.has('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) {
        g.amount *= 2;
        notes.push('X2');
      }
      if (notes.length) g.notes = notes;
    }
    s.totals = {};
    for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
    return s;
  }

  /** The enhancement on a reel's payline cell, if it's live (not stolen, slimed or jammed). */
  private paylineEnh(c: Combatant, r: number) {
    const cell = c.reels[r].cells[c.reels[r].stop];
    if (!cell?.enh || cell.stolen || cell.slimed || c.locked[r] > 0) return undefined;
    return cell.enh;
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
      const head = sym[0] === 'wild' ? (sym[1] === 'wild' ? 'bolt' : sym[1]) : sym[0];
      const firstTwo = (sym[0] === head || sym[0] === 'wild') && (sym[1] === head || sym[1] === 'wild');
      if (firstTwo && sym[2] !== head && sym[2] !== 'wild' && !DEAD.has(head)) {
        const roll = this.rng.next();
        const hits = c.reels[2].cells.flatMap((cell, i) => (effectiveSymbol(cell) === head || effectiveSymbol(cell) === 'wild' ? [i] : []));
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
        // KEEN: a keen sword in the group pierces shields.
        this.hit(me, foe, g.amount, g.reels, events, g.reels.some((r) => this.paylineEnh(me, r) === 'keen'));
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
    if (g.symbol === 'slime' && g.matched && this.cfg.cleanseOnSlimeTriple && g.reels.length >= 3) {
      this.cleanse(me, g.reels, events);
      return;
    }
    if (g.symbol === 'rock' && me.relics.has('pickaxe')) {
      this.hit(me, foe, g.amount, g.reels, events);
      return;
    }
    void score;
    events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: g.symbol });
  }

  private hit(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[], pierce = false, note?: 'snap'): void {
    const pierced = pierce && foe.shield > 0;
    const h = this.damage(foe, amount, pierce);
    events.push({ type: 'attack', from: me.side, to: foe.side, reels, amount, ...h, ...(pierced ? { note: 'pierce' as const } : note ? { note } : {}) });
    this.checkDeath(foe, events);
    // SPIKED: a spiked shield on the victim's payline hits back (once per hit).
    if (!this.over && amount > 0 && foe.reels.some((_, r) => this.paylineEnh(foe, r) === 'spiked')) {
      const dmg = foe.relics.has('cactus') ? CACTUS_DAMAGE : SPIKED_DAMAGE;
      const back = this.damage(me, dmg, false);
      events.push({ type: 'attack', from: foe.side, to: me.side, reels: [], amount: dmg, ...back, note: 'spiked' });
      this.checkDeath(me, events);
    }
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
    if (target.hp <= 0 && target.side === 'enemy') this.overkill = amount - blocked - hpDamage;
    return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
  }

  private checkDeath(c: Combatant, events: CombatEvent[]): void {
    if (this.over) return;
    if (c.hp > 0) {
      // Boss phase 2: at half HP the House goes ALL IN and doubles the pot.
      if (c.side === 'enemy' && this.isBoss && !this.allIn && c.hp <= c.maxHp / 2) {
        this.allIn = true;
        this.pot = Math.max(this.pot * 2, this.pot + POT.allInMin);
        events.push({ type: 'phase', side: c.side, pot: this.pot });
      }
      return;
    }
    this.winner = other(c.side);
    events.push({ type: 'death', side: c.side });
    events.push({ type: 'fightEnd', winner: this.winner, turns: this.turn });
  }

  private fizzle(me: Combatant, symbol: SymbolId, reels: number[], events: CombatEvent[]): void {
    events.push({ type: 'fizzle', side: me.side, reels, symbol });
  }

  // ---- writers: what an enemy does to your machine ------------------------------------

  private write(me: Combatant, foe: Combatant, sym: SymbolId, amount: number, reels: number[], events: CombatEvent[]): void {
    switch (sym) {
      case 'slime':
        return this.applySlime(me, foe, amount, reels, events);
      case 'ice':
        // 1 reel × 1 turn, a double 2 × 2, a jackpot 2 × 3 (never all three reels).
        return this.applyStatus(me, foe, 'frozen', amount >= 4 ? 2 : 1, amount >= 9 ? 3 : amount >= 4 ? 2 : 1, reels, events);
      case 'lock':
        // Jams bite hard (the reel scores nothing): single locks fizzle, doubles jam 1 reel,
        // jackpots 2, always for one turn.
        if (amount < 4) return this.fizzle(me, 'lock', reels, events);
        return this.applyStatus(me, foe, 'locked', amount >= 9 ? 2 : 1, 1, reels, events);
      case 'claw':
        return this.steal(me, foe, statusSize(amount), reels, events);
      case 'rock':
        // Rocks are permanent for the run: single rocks fizzle, doubles add 1, jackpots 2.
        if (amount < 4) return this.fizzle(me, 'rock', reels, events);
        return this.junk(me, foe, amount >= 9 ? 2 : 1, reels, events);
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
    // Slime goes for gilded cells first.
    const gilded = this.rng.shuffle(clean.filter((ref) => foe.reels[ref.reel].cells[ref.index].enh));
    const plain = this.rng.shuffle(clean.filter((ref) => !foe.reels[ref.reel].cells[ref.index].enh));
    const cells: CellRef[] = [...gilded, ...plain].slice(0, amount);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].slimed = true;
    events.push({ type: 'slime', from: me.side, to: foe.side, reels, amount, cells, wasted: amount - cells.length });
  }

  /**
   * Freeze/jam `count` of the foe's reels for `turns` of their turns.
   * Freeze: targets the reels showing the least useful payline symbol, first clunks each one
   * stop to its least useful visible cell, and never holds a reels 1+2 match (a frozen pair
   * would be a free double every turn). Jam: targets the most useful reels.
   */
  private applyStatus(me: Combatant, foe: Combatant, status: 'frozen' | 'locked', count: number, turns: number, reels: number[], events: CombatEvent[]): void {
    const ice = status === 'frozen';
    if (ice && foe.relics.has('mittens')) turns -= 1;
    if (turns <= 0) {
      events.push({ type: 'resist', side: foe.side, relic: 'mittens', what: 'freeze' });
      return;
    }
    const arr = foe[status];
    const valueAt = (r: number, stop: number) => {
      const c = foe.reels[r].cells[stop];
      return symbolValue(effectiveSymbol(c)) + (c.enh && !c.slimed && !c.stolen ? 3 : 0);
    };
    const order = this.rng.shuffle(foe.reels.map((_, r) => r));
    order.sort((a, b) => (ice ? valueAt(a, foe.reels[a].stop) - valueAt(b, foe.reels[b].stop) : valueAt(b, foe.reels[b].stop) - valueAt(a, foe.reels[a].stop)));
    let targets = order.slice(0, count).sort((a, b) => a - b);

    if (!ice) {
      if (foe.relics.has('lockpick')) {
        const kept = targets.filter(() => this.rng.next() >= LOCKPICK_CHANCE);
        if (kept.length < targets.length) events.push({ type: 'resist', side: foe.side, relic: 'lockpick', what: 'jam' });
        targets = kept;
      }
      if (!targets.length) return;
      for (const r of targets) arr[r] = Math.max(arr[r], turns);
      events.push({ type: 'lock', from: me.side, to: foe.side, reels, targets, turns });
      return;
    }

    const len = (r: number) => foe.reels[r].cells.length;
    const sym = (r: number) => effectiveSymbol(foe.reels[r].cells[foe.reels[r].stop]);
    const clunk = (r: number, avoid: ReadonlySet<SymbolId> = new Set()) => {
      const reel = foe.reels[r];
      const options = [reel.stop, (reel.stop + len(r) - 1) % len(r), (reel.stop + 1) % len(r)];
      const ok = options.filter((st) => !avoid.has(effectiveSymbol(reel.cells[st])));
      const pool = ok.length ? ok : options;
      let best = pool[0];
      for (const st of pool) if (valueAt(r, st) < valueAt(r, best)) best = st;
      reel.stop = best;
    };
    // Never more than 2 reels frozen at once (freezes stack across turns).
    const alreadyFrozen = arr.filter((t, r) => t > 0 && !targets.includes(r)).length;
    targets = targets.slice(0, Math.max(0, 2 - alreadyFrozen));
    if (!targets.length) return;
    for (const r of targets) clunk(r);
    // No two frozen reels may show the same payline symbol — a frozen pair or triple would be a
    // free win every turn. Re-clunk a clashing target away from the others, or drop it.
    const frozenNow = () => foe.reels.map((_, r) => r).filter((r) => targets.includes(r) || arr[r] > 0);
    for (const r of [...targets]) {
      const others = frozenNow().filter((o) => o !== r);
      if (!others.some((o) => sym(o) === sym(r))) continue;
      clunk(r, new Set(others.map(sym)));
      if (others.some((o) => sym(o) === sym(r))) targets = targets.filter((t) => t !== r);
    }
    if (!targets.length) return;
    for (const r of targets) arr[r] = Math.max(arr[r], turns);
    events.push({ type: 'freeze', from: me.side, to: foe.side, reels, targets, turns, stops: targets.map((r) => foe.reels[r].stop) });
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
    pool.sort((a, b) => cellValue(foe.reels[b.reel].cells[b.index]) - cellValue(foe.reels[a.reel].cells[a.index]));
    let cells = pool.slice(0, amount);
    // Mousetrap: each grab can get snapped — and the thief pays for it.
    let snapped = false;
    if (foe.relics.has('mousetrap')) {
      const kept = cells.filter(() => this.rng.next() >= MOUSETRAP_CHANCE);
      snapped = kept.length < cells.length;
      cells = kept;
    }
    const symbols = cells.map((ref) => foe.reels[ref.reel].cells[ref.index].symbol);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].stolen = true;
    if (snapped) {
      events.push({ type: 'resist', side: foe.side, relic: 'mousetrap', what: 'steal' });
      this.hit(foe, me, MOUSETRAP_DAMAGE, [], events, false, 'snap');
      if (this.over) return;
    }
    if (cells.length || !snapped) events.push({ type: 'steal', from: me.side, to: foe.side, reels, cells, symbols, wasted: snapped ? 0 : amount - cells.length });
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
    if (ab.kind === 'jackpot' && me.charge >= ab.every) {
      me.charge = ab.every;
      this.cashPending = true;
      events.push({ type: 'abilityCharge', side: me.side, charge: ab.every, every: ab.every, kind: ab.kind });
      return;
    }
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

  /** The House skims half the pot (rounded up) as damage (shield blocks); the rest keeps growing. */
  private cashPot(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const amount = Math.ceil(this.pot * POT.skim);
    this.pot -= amount;
    const h = this.damage(foe, amount, false);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: this.pot });
    this.checkDeath(foe, events);
  }

  /** Any player jackpot steals the pot (a High Roller double steals half), ignoring shield. */
  private winPot(me: Combatant, events: CombatEvent[], share = 1): void {
    if (this.pot <= 0) return;
    const foe = this.sides[other(me.side)];
    const amount = Math.ceil(this.pot * share);
    this.pot -= amount;
    const h = this.damage(foe, amount, true);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: this.pot });
    this.checkDeath(foe, events);
  }
}
