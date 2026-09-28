import { cloneConfig, UNIT, unitsUp, type AbilityDef, type Enh, type GameConfig, type Levels, type RelicId, type SideConfig, type SideId, type SymbolId } from './config';
import { CABINETS, hasSpecial, type Cabinet, type Meter } from './cabinets';
import { charmLevel, charmValue, playerSymValue } from './charms';
import type { CombatEvent, DealCard, HealSource, VoucherKind } from './events';
import {
  BATTERY_SHARE,
  BATTERY_ENERGY,
  BONUS,
  BELL_MULT,
  BOMB,
  CACTUS_SHARE,
  KEY_MULT,
  MIDAS_TOUCH_CAP,
  MIRROR_HIT_CAP,
  OVERCHARGE_ECHO,
  CLOVER_CHANCE,
  FANG_HEAL,
  FANG_THORN_HEAL,
  CROWN_HEAL,
  NEW_RELIC,
  POT,
  ROD_SPECIAL_COST,
  REFLECT_MIN,
  ROD_SPECIAL_DAMAGE,
} from './relics';
import { Rng } from './rng';
import { effectiveAbility, STAKE } from './stakes';
import { TUNE } from './enemies';
import { isNearMiss, multFor, scoreLine, type LineScore, type ScoreGroup } from './scoring';
import {
  BONUS_SYMBOLS,
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

/** Act 3: marked-card bite, the Croupier's rake, and the Dealer's shuffle size. */
const MARK_DAMAGE = 2 * UNIT;
const RAKE_CUT = UNIT;
/** Writer tiers: what an enemy double / jackpot of one symbol pays. */
const PAIR_PAY = 4 * UNIT;
const JACKPOT_PAY = 9 * UNIT;
const SHUFFLE_SWAPS = 5;
const DEALS: DealCard[] = ['shuffle', 'cut', 'raise'];

/** Counterfeit coins last this many of your turns. */
const FAKE_TURNS = 3;

/** Symbols that act on the opponent when they're native to the caster's strips. */
const WRITERS: ReadonlySet<SymbolId> = new Set(['slime', 'ice', 'claw', 'rock', 'lock', 'coin', 'bomb', 'hex', 'fangs', 'mimicSym', 'ground', 'fake', 'card', 'gavel', 'rake']);
/** HOLY WATER washes off these writes (not coins, drains or the Mimic's hit) and these abilities. */
const REEL_WRITES: ReadonlySet<SymbolId> = new Set(['slime', 'ice', 'claw', 'rock', 'lock', 'bomb', 'hex', 'card', 'gavel', 'rake', 'ground', 'fake']);
const FIZZLE_SINGLES: ReadonlySet<SymbolId> = new Set(['lock', 'rock', 'hex', 'gavel']);
const WRITER_ABILITIES: ReadonlySet<string> = new Set(['flood', 'blizzard', 'jam', 'pilfer', 'quake', 'carpet', 'curse', 'gulp', 'launder', 'mark', 'houseTake']);
/** Groups that "pay" for RAISE and MIDAS's x4 (the ones that hit, shield or charge). */
const PAYING: ReadonlySet<SymbolId> = new Set(['sword', 'shield', 'bolt', 'seven', 'thorn']);
/** Symbols the 3-WILD bonus reel (and a WILD in JAX's payoff) can pick. */
const JACKPOTABLE: ReadonlySet<SymbolId> = new Set(['sword', 'shield', 'bolt', 'goldbar', 'thorn']);

export interface Combatant {
  side: SideId;
  hp: number;
  maxHp: number;
  shield: number;
  /** The signature meter: TESLA's energy, MIDAS's gold, BRIAR's thorn bank, JAX's wilds. */
  energy: number;
  /** MIDAS / JAX: the meter is full and waiting to pay off. */
  armed: boolean;
  reels: Reel[];
  /** Writer symbols native to this side's strips. */
  casts: Set<SymbolId>;
  /** Remaining own-turns each reel stays frozen (doesn't spin). */
  frozen: number[];
  /** Remaining own-turns each reel is jammed (scores nothing). */
  locked: number[];
  /** Remaining own-turns each reel is hexed (pays half, charms are dark). */
  hexed: number[];
  /** The Croupier's rake: remaining own-turns your groups pay less. */
  raked: number;
  ability: AbilityDef | null;
  charge: number;
  relics: Set<RelicId>;
  /** Symbol and charm levels (the player; the Mirror copies your symbol levels). */
  levels?: Levels;
}

export interface TurnResult {
  turn: number;
  side: SideId;
  events: CombatEvent[];
}

export const other = (s: SideId): SideId => (s === 'player' ? 'enemy' : 'player');

/** 1 → 1 reel for 1 turn, a double (40) → 2 reels × 2 turns, a jackpot (90) → 3 × 3. */
export const statusSize = (amount: number) => Math.max(1, Math.min(3, Math.round(Math.sqrt(amount / UNIT))));

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
    armed: false,
    reels,
    casts,
    frozen: reels.map(() => 0),
    locked: reels.map(() => 0),
    hexed: reels.map(() => 0),
    raked: 0,
    ability: sc.ability ?? null,
    charge: 0,
    relics: new Set(relics),
    levels: sc.levels,
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
  /** The run's starting machine rules. */
  readonly cabinet: Cabinet | null;
  /** The player's signature meter (null: KNIGHT, or an engine test with the bare special). */
  readonly meter: Meter | null;
  /** The player has TESLA's lightning special (or no machine at all: the bare engine). */
  readonly special: boolean;
  /** Chips the Mimic ate this fight (taken from the run's purse afterwards). */
  chipsEaten = 0;
  /** Phoenix Feather already burned this fight. */
  phoenixUsed = false;
  /** Relics that act as the fight opens (Battery, Lightning Rod): popped on turn 1. */
  private openers: RelicId[] = [];
  /** The Mirror cracked (phase 2). */
  shattered = false;
  /** The turn the Mirror cracked on: it takes no more HP damage that turn (the crack gate). */
  private crackTurn = -1;
  /** What each side did on its last spin: biggest group, and total damage sent (for Mimic / Reflection). */
  readonly last: Record<SideId, { best: number; damage: number }> = { player: { best: 0, damage: 0 }, enemy: { best: 0, damage: 0 } };
  /** BLAZE: extra special damage from the blaze cells you own. */
  readonly blaze: number;
  /** The Mirror's Reflection: your best spin since its last one. */
  reflectBank = 0;
  /** The Dealer: the card it will deal next, whether it has dealt yet, HOUSE RULES, and RAISE flags. */
  nextDeal: DealCard = 'shuffle';
  dealt = false;
  houseRules = false;
  raiseEnemy = false;
  raisePlayer = false;
  /** BRIAR: the thorn bank already hit back on this turn. */
  private thornsTurn = -1;
  /** WAR DRUM stacks, KING'S VAULT gold, FIRST BLOOD / HOLY WATER used, STATIC's last turn (this fight). */
  drum = 0;
  /** MIDAS TOUCH: gold touches per cell (this fight), and how much meter the current touch spends. */
  readonly touches = new Map<object, number>();
  private touchSpend = 0;
  private firstBlood = false;
  private holyWater = false;
  private staticTurn = -1;
  /** Card Sharp marks placed this fight (THE DECK REMEMBERS). */
  marksPlaced = 0;
  /** Bonus vouchers banked this fight (they pay out if you win). */
  readonly vouchers: { kind: VoucherKind; seed: number }[] = [];
  /** Debug/tests: the next player spin triggers this bonus. */
  forceBonus: VoucherKind | null = null;
  private forced: Partial<Record<SideId, SymbolId[]>> = {};

  constructor(cfg: GameConfig, seed: number = cfg.seed ?? Rng.randomSeed()) {
    this.cfg = cloneConfig(cfg);
    this.rng = new Rng(seed);
    this.sides = {
      player: makeCombatant('player', this.cfg.player, this.rng, this.cfg.relics),
      enemy: makeCombatant('enemy', this.cfg.enemy, this.rng, this.cfg.enemy.relics ?? []),
    };
    const p = this.sides.player;
    this.cabinet = this.cfg.cabinet ? CABINETS[this.cfg.cabinet] : null;
    this.meter = this.cabinet?.meter ?? null;
    this.special = hasSpecial(this.cabinet);
    if (this.cabinet?.specialCost) this.cfg.specialCost = this.cabinet.specialCost;
    if (this.cabinet?.specialDamage) this.cfg.specialDamage = this.cabinet.specialDamage;
    // Battery: your meter starts part-full (the special: 30 energy; a bank: 30; MIDAS / JAX: 60%).
    if (p.relics.has('battery') && (this.special || this.meter)) {
      const start = this.special ? BATTERY_ENERGY : this.meter!.kind === 'thorns' ? BATTERY_ENERGY : unitsUp(this.meter!.cost * BATTERY_SHARE);
      p.energy = this.special ? Math.min(this.cfg.specialCost - 1, p.energy + start) : Math.min(Math.max(0, this.meterCost - 1), p.energy + start);
      this.openers.push('battery');
    }
    // Lightning Rod: a charged-bolt build makes the special cheaper and harder-hitting.
    if (this.special && p.relics.has('rod') && p.reels.some((r) => r.cells.some((c) => c.enh === 'charged'))) {
      this.cfg.specialCost = ROD_SPECIAL_COST;
      this.cfg.specialDamage = Math.max(this.cfg.specialDamage, this.cabinet?.rodDamage ?? ROD_SPECIAL_DAMAGE);
      this.openers.push('rod');
    }
    const e = this.sides.enemy;
    // BLAZE: every blaze cell you own adds to your special.
    const blazeCells = p.reels.reduce((a, reel) => a + reel.cells.filter((c) => c.enh === 'blaze').length, 0);
    this.blaze = blazeCells * charmValue('blaze', this.charmLvl(p, 'blaze'));
    // The Mirror plays your machine but never your junk (and fires no specials).
    if (this.isMirror) e.casts.clear();
    if (this.isBoss) this.pot = POT.seed;
    if (this.isDealer) this.nextDeal = this.rng.pick(DEALS);
    // The chase symbols: one BONUS and one RELIC cell per reel, for this fight only.
    if (this.cfg.player.bonusSymbols)
      for (const reel of p.reels)
        for (const symbol of ['bonusSym', 'relicSym'] as SymbolId[]) insertOffscreen(reel, { symbol, slimed: false }, this.rng);
    // THE DECK REMEMBERS: marked cards you carried in from the Card Sharp.
    const carried = this.cfg.player.startMarks ?? 0;
    if (carried > 0) {
      const cells = this.rng.shuffle(p.reels.flatMap((reel, r) => reel.cells.map((c, i) => ({ c, r, i })).filter(({ c }) => symbolValue(c.symbol) > 0)));
      for (const { c } of cells.slice(0, carried)) c.carded = true;
    }
    // The Golden Hourglass and HIGH STAKES change enemy cadence (the same helper feeds the cards).
    if (e.ability) e.ability = effectiveAbility(e.ability, { stake: this.cfg.stake ?? 0, act: this.cfg.enemy.act ?? 1, sandglass: p.relics.has('sandglass') });
  }

  get seed(): number {
    return this.rng.seed;
  }

  get over(): boolean {
    return this.winner !== null;
  }

  /** The House (act 1 boss): the pot rules apply. */
  get isBoss(): boolean {
    return this.cfg.enemy.boss === 'house';
  }

  /** The Mirror (act 2 boss). */
  get isMirror(): boolean {
    return this.cfg.enemy.boss === 'mirror';
  }

  /** The Dealer (act 3 boss). */
  get isDealer(): boolean {
    return this.cfg.enemy.boss === 'dealer';
  }

  /** How full the player's meter has to be (the special's cost for TESLA). */
  get meterCost(): number {
    return this.special ? this.cfg.specialCost : this.meter?.cost ?? 0;
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
    if (this.turn === 1) for (const relic of this.openers) events.push({ type: 'relic', side: 'player', relic });
    if (this.turn === 1 && this.isDealer) events.push({ type: 'dealNext', side: 'enemy', card: this.nextDeal });

    if (this.cfg.shieldReset === 'ownTurnStart') this.resetShield(me, events);
    // SHIELD BASH can end the fight before the spin.
    if (this.over) {
      this.next = other(side);
      return { turn: this.turn, side, events };
    }
    // Saved chips shield you at the start of each boss turn (the House and the Mirror).
    if (side === 'enemy' && (this.isBoss || this.isMirror || this.isDealer)) {
      const p = this.sides.player;
      const stack = this.cfg.player.stackShield ?? 0;
      if (stack > 0) {
        p.shield += stack;
        events.push({ type: 'shieldGain', side: 'player', reels: [], amount: stack, total: p.shield, source: 'chips' });
      }
    }
    if (side === 'enemy' && this.isBoss) {
      const p = this.sides.player;
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
    const forcedLine = this.forced[side];
    let { stops, lucky } = this.rollStops(me, frozen, forcedLine);
    delete this.forced[side];
    me.reels.forEach((reel, i) => (reel.stop = stops[i]));
    // BONUS WHEEL / RELIC RUSH: a natural triple, or the hidden bonus roll, lands three chase symbols.
    // The voucher is banked and the reels spin again for free, so a bonus never costs your turn.
    const bonus = side === 'player' && this.cfg.player.bonusSymbols && !forcedLine ? this.bonusTrigger(me, frozen, locked) : null;
    if (bonus) {
      const sym: SymbolId = bonus === 'wheel' ? 'bonusSym' : 'relicSym';
      const bstops = me.reels.map((reel) => Math.max(0, reel.cells.findIndex((c) => c.symbol === sym)));
      me.reels.forEach((reel, i) => (reel.stop = bstops[i]));
      const bline = paylineSymbols(me.reels);
      events.push({ type: 'spin', side, stops: bstops, score: scoreLine(bline, this.cfg), nearMiss: false, frozen, locked, lucky: null, bonus });
      this.vouchers.push({ kind: bonus, seed: this.rng.int(0x7fffffff) });
      events.push({ type: 'voucher', side, kind: bonus });
      ({ stops, lucky } = this.rollStops(me, frozen));
      me.reels.forEach((reel, i) => (reel.stop = stops[i]));
    }
    const line = paylineSymbols(me.reels).map((s, i) => (locked[i] ? 'lock' : s));
    // LUCKY: a lucky cell on the payline sometimes turns WILD.
    const luckyWilds: number[] = [];
    me.reels.forEach((_, r) => {
      const chance = this.paylineEnh(me, r) === 'lucky' ? charmValue('lucky', this.charmLvl(me, 'lucky')) / 100 : 0;
      if (line[r] !== 'wild' && chance > 0 && this.rng.next() < chance) {
        line[r] = 'wild';
        luckyWilds.push(r);
      }
    });
    const hexed = me.hexed.map((t) => t > 0);
    const score = this.score(me, line);
    // Dead symbols lining up isn't a tease — except slime, which can cleanse.
    const nearMiss = isNearMiss(line) && (me.casts.has(line[0]) || line[0] === 'slime' || !DEAD.has(line[0]));
    events.push({
      type: 'spin',
      side,
      stops,
      score,
      nearMiss,
      frozen,
      locked,
      lucky,
      ...(luckyWilds.length ? { luckyWilds } : {}),
      ...(hexed.some(Boolean) ? { hexed } : {}),
    });
    if (score.touched?.length) events.push({ type: 'touch', side, cells: score.touched });
    const sentBefore = events.length;

    if (side === 'player' && score.tier === 'triple') this.playerJackpots++;
    // A meter that pays off this spin empties first (so what lands now can refill it).
    if (side === 'player' && (score.raised || score.jackpots)) this.payoff(me, score, events);
    for (const group of score.groups) {
      this.resolveGroup(me, group, score, events);
      if (this.over) break;
    }
    if (!this.over && side === 'player' && (score.raised || score.jackpots)) this.payoffAfter(me, score, events, sentBefore);
    // JAX: every WILD on the payline fills the meter (lucky wilds too).
    if (!this.over && side === 'player' && this.meter?.kind === 'jackpots') {
      const wilds = line.flatMap((s, r) => (s === 'wild' && !this.isGrounded(me, r) ? [r] : []));
      const earthed = line.filter((s, r) => s === 'wild' && this.isGrounded(me, r)).length * (this.meter.perWild ?? 0);
      // STACKED DECK: a charmed WILD fills double.
      const charmed = me.relics.has('stacked') ? wilds.filter((r) => me.reels[r].cells[me.reels[r].stop]?.symbol === 'wild' && this.paylineEnh(me, r)).length : 0;
      if (wilds.length || earthed) this.fillMeter(me, (wilds.length + charmed) * (this.meter.perWild ?? 0), wilds, events, earthed);
    }
    // Jackpot Bell: a jackpot fills your meter (TESLA: a full special; BRIAR: the jackpot again into the bank).
    if (!this.over && score.tier === 'triple' && me.relics.has('bell') && (side !== 'player' || this.special || this.meter)) {
      events.push({ type: 'relic', side, relic: 'bell' });
      if (this.special || side !== 'player') this.gainEnergy(me, this.cfg.specialCost, [], events);
      else if (this.meter!.kind === 'thorns') this.fillMeter(me, score.groups.find((g) => g.matched)?.amount ?? 0, [], events);
      else this.fillMeter(me, this.meterCost, [], events);
    }
    if (!this.over && side === 'player') {
      // WAR DRUM: a spin that pays adds a stack (max 5) for the rest of the fight.
      if (me.relics.has('drum') && score.groups.some((g) => g.amount > 0 && PAYING.has(g.symbol))) this.drum = Math.min(NEW_RELIC.drumCap, this.drum + 1);
      // CAP AND BELLS: every WILD on your payline heals.
      const wilds = line.filter((s) => s === 'wild').length;
      if (me.relics.has('capbells') && wilds) {
        events.push({ type: 'relic', side, relic: 'capbells' });
        this.heal(me, wilds * NEW_RELIC.capbellsHeal, 'capbells', events);
      }
    }
    if (!this.over && side === 'player' && score.tier === 'pair' && me.relics.has('crown')) {
      events.push({ type: 'relic', side, relic: 'crown' });
      this.heal(me, CROWN_HEAL, 'crown', events);
    }
    const steals = score.tier === 'triple' || (score.tier === 'pair' && me.relics.has('crown'));
    if (!this.over && side === 'player' && this.isBoss && steals) {
      this.winPot(me, events, score.tier === 'triple' ? 1 : 0.5);
    }
    // The house always takes its cut.
    if (!this.over && side === 'enemy' && this.isBoss) {
      this.pot += POT.houseCut;
      events.push({ type: 'pot', side, reels: [], amount: POT.houseCut, total: this.pot });
    }

    // What this spin did (the Mimic and the Mirror copy it).
    this.last[side] = {
      best: Math.max(0, ...score.groups.filter((g) => g.matched || !DEAD.has(g.symbol)).map((g) => g.amount)),
      damage: events.slice(sentBefore).reduce((a, e) => a + ((e.type === 'attack' || e.type === 'specialFire') && e.from === side && !(e.type === 'attack' && e.note === 'thorns') ? e.amount : 0), 0),
    };
    if (side === 'player') this.reflectBank = Math.max(this.reflectBank, this.last.player.damage);
    if (!this.over) this.defuse(me, events);
    if (!this.over && side === 'player') this.markedCards(me, events);
    if (!this.over) this.burnFuses(me, events);
    if (!this.over) this.tickFakes(me, events);
    if (!this.over) this.tickStatuses(me, events);
    if (!this.over && me.ability) this.chargeAbility(me, events);

    if (!this.over && this.cfg.shieldReset === 'roundEnd' && side === 'enemy') {
      this.resetShield(this.sides.player, events);
      this.resetShield(this.sides.enemy, events);
    }

    this.next = other(side);
    return { turn: this.turn, side, events };
  }

  /** MIDAS TOUCH fires: each sword and shield on the payline gains a gold touch (ROYAL DECREE: the cells above and
   * below too), and every extra full meter touches one more sword or shield anywhere on your reels. */
  private midasTouch(me: Combatant, line: SymbolId[], touchable: (r: number) => boolean, decree: boolean): { reel: number; index: number; n: number }[] {
    const out = new Map<object, { reel: number; index: number; n: number }>();
    const bump = (reel: number, index: number) => {
      const c = me.reels[reel].cells[index];
      if (!c || (c.symbol !== 'sword' && c.symbol !== 'shield') || c.slimed || c.stolen) return false;
      const n = this.touches.get(c) ?? 0;
      if (n >= MIDAS_TOUCH_CAP) return false;
      this.touches.set(c, n + 1);
      out.set(c, { reel, index, n: n + 1 });
      return true;
    };
    line.forEach((_x, r) => {
      if (!touchable(r)) return;
      const reel = me.reels[r];
      bump(r, reel.stop);
      if (decree) {
        const len = reel.cells.length;
        bump(r, (reel.stop + 1) % len);
        bump(r, (reel.stop + len - 1) % len);
      }
    });
    const k = Math.max(1, Math.floor(me.energy / this.meterCost));
    for (let i = 1; i < k; i++) {
      const pool = me.reels.flatMap((reel, r) => reel.cells.flatMap((c, index) => ((c.symbol === 'sword' || c.symbol === 'shield') && !c.slimed && !c.stolen && (this.touches.get(c) ?? 0) < MIDAS_TOUCH_CAP ? [{ r, index }] : [])));
      if (!pool.length) break;
      const p = this.rng.pick(pool);
      bump(p.r, p.index);
    }
    this.touchSpend = k * this.meterCost;
    return [...out.values()];
  }

  /** A charm's level for this side (the player's charm levels; the Golden Ticket adds one). */
  private charmLvl(c: Combatant, enh: Enh): number {
    return c.side === 'player' ? charmLevel(c.levels, enh, c.relics.has('ticket')) : 1;
  }

  /** What a lone (or all-) WILD line pays as for this side. */
  private wildAlone(c: Combatant): SymbolId {
    return c.side === 'player' && !this.special ? 'sword' : 'bolt';
  }

  /** The 3-WILD bonus reel: one of your jackpot-able symbols (by how many live cells you have of it). */
  private wildPick(c: Combatant): SymbolId {
    const pool = c.reels.flatMap((reel) => reel.cells.filter((cell) => !cell.slimed && !cell.stolen && !cell.carded && !cell.bomb && JACKPOTABLE.has(cell.symbol)).map((cell) => cell.symbol));
    if (c.side !== 'player' || !pool.length) return this.wildAlone(c);
    return this.rng.pick(pool);
  }

  private score(me: Combatant, line: SymbolId[]): LineScore {
    const player = me.side === 'player';
    const joker = player && this.cabinet?.jokerWilds && line.includes('wild');
    const pairRule = me.relics.has('mirror') || joker ? 'anyTwo' : this.cfg.pairRule;
    const cfg = { ...this.cfg, pairRule } as GameConfig;
    // Your symbols are worth their level (the Mirror copies your levels).
    const lv = player ? me.levels : this.isMirror ? me.levels : undefined;
    // Enemy shields are worth less than yours (your damage is mostly swords now; only TESLA pierces).
    const value = (s: SymbolId) => (lv ? playerSymValue(lv, s, this.cfg.base[s]) : s === 'shield' && !player ? Math.round(this.cfg.base[s] * TUNE.enemyShield) : this.cfg.base[s]);
    // 3 WILDS: the bonus reel picks one of your symbols and the line pays its jackpot.
    const allWild = line.every((s) => s === 'wild');
    const pick = allWild ? this.wildPick(me) : undefined;
    const jackpots = player && me.armed && this.meter?.kind === 'jackpots';
    let s = scoreLine(line, cfg, { value, wildAlone: pick ?? this.wildAlone(me) });
    if (pick) s.wildPick = pick;
    if (jackpots) {
      // JAX's payoff: each payline cell pays as a jackpot of itself (a WILD rolls a random one).
      const groups: ScoreGroup[] = line.map((raw, r) => {
        const symbol = raw === 'wild' ? this.wildPick(me) : raw;
        const base = 3 * value(symbol);
        return { symbol, reels: [r], amount: base * multFor(3, cfg), base, mult: multFor(3, cfg), matched: true, jackpot: true };
      });
      const totals: Partial<Record<SymbolId, number>> = {};
      s = { line, tier: 'triple', tierSymbol: null, groups, totals, jackpots: true };
    }
    const fired = new Set<RelicId>();
    const has = (r: RelicId) => player && me.relics.has(r);
    const pays = (g: ScoreGroup) => g.base > 0 && PAYING.has(g.symbol);
    const cellSym = (r: number) => me.reels[r].cells[me.reels[r].stop]?.symbol;
    const goldOf = new Map<ScoreGroup, number>();
    const notesOf = new Map<ScoreGroup, string[]>();
    // MIDAS TOUCH: a full meter turns the swords and shields on this spin gold for the fight.
    const touchMeter = player && this.meter?.kind === 'touch';
    const touchable = (r: number) => {
      const c = me.reels[r].cells[me.reels[r].stop];
      return touchMeter && (line[r] === 'sword' || line[r] === 'shield') && !!c && c.symbol === line[r] && !c.slimed && !c.stolen;
    };
    if (touchMeter && me.armed && line.some((_x, r) => touchable(r))) {
      s.touched = this.midasTouch(me, line, touchable, has('decree'));
      s.raised = true;
    }
    // FIRST BLOOD: your first paying spin each fight.
    const firstBlood = has('firstblood') && !this.firstBlood && s.groups.some(pays);
    if (firstBlood) this.firstBlood = true;
    const foe = this.sides[other(me.side)];
    for (const g of s.groups) {
      const notes: string[] = [];
      notesOf.set(g, notes);
      // A jackpot of one cell counts that cell's charm three times.
      const copies = g.jackpot && g.reels.length === 1 ? 3 : 1;
      let gold = 0;
      let keen = false;
      for (const r of g.reels) {
        const enh = this.paylineEnh(me, r);
        if (!enh) continue;
        const v = charmValue(enh, this.charmLvl(me, enh)) * copies;
        // KEEN adds to a sword group and pierces.
        if (enh === 'keen' && g.symbol === 'sword') {
          g.base += v;
          g.pierce = true;
          keen = true;
        }
        if (enh === 'charged' && g.symbol === 'bolt') g.base += v;
        if (enh === 'gold') gold += v;
      }
      // MIDAS TOUCH: each gold touch on a sword or shield counts as a gold charm.
      if (touchMeter && (g.symbol === 'sword' || g.symbol === 'shield'))
        for (const r of g.reels) if (touchable(r)) gold += (this.touches.get(me.reels[r].cells[me.reels[r].stop]) ?? 0) * charmValue('gold', this.charmLvl(me, 'gold')) * copies;
      // WAR DRUM: every paying spin this fight adds to your swords.
      if (has('drum') && g.symbol === 'sword' && this.drum > 0 && g.base > 0) {
        g.base += NEW_RELIC.drumStep * this.drum;
        fired.add('drum');
      }
      // GOLD charms in a group ADD (x2 + x2 + x2 = x6), then multiply with the double/jackpot.
      goldOf.set(g, gold);
      if (gold) {
        g.mult *= gold;
        notes.push(`X${gold} GOLD`);
      }
      const paying = pays(g);
      // Prism: a match that used a WILD pays double.
      if (me.relics.has('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) {
        fired.add('prism');
        g.mult *= 2;
        notes.push('X2');
      }
      // HORSESHOE: a group with a lucky-born wild.
      if (has('horseshoe') && paying && g.reels.some((r) => line[r] === 'wild' && cellSym(r) !== 'wild' && this.paylineEnh(me, r) === 'lucky')) {
        fired.add('horseshoe');
        g.mult *= NEW_RELIC.horseshoeMul;
        notes.push(`X${NEW_RELIC.horseshoeMul}`);
      }
      // EXECUTIONER: keen swords against an enemy under half HP.
      if (has('hone') && keen && g.symbol === 'sword' && foe.hp < foe.maxHp / 2) {
        fired.add('hone');
        g.mult *= NEW_RELIC.executionerMul;
        notes.push(`X${NEW_RELIC.executionerMul}`);
      }
      // Legendaries: Skeleton Key (doubles) and Jackpot Bell (jackpots).
      if (me.relics.has('key') && g.matched && g.reels.length === 2) {
        fired.add('key');
        g.mult *= KEY_MULT;
        notes.push(`X${KEY_MULT}`);
      }
      if (me.relics.has('bell') && g.matched && (g.reels.length === 3 || g.jackpot)) {
        fired.add('bell');
        g.mult *= BELL_MULT;
        notes.push(`X${BELL_MULT}`);
      }
      // RAISE is a fair coin: the Dealer's next hit and your next PAYING group pay double.
      if (player && this.raisePlayer && paying) {
        g.mult *= 2;
        notes.push('RAISE X2');
        this.raisePlayer = false;
      }
      // UNDERDOG: under half HP, every paying group.
      if (has('underdog') && paying && me.hp < me.maxHp / 2) {
        fired.add('underdog');
        g.mult *= NEW_RELIC.underdogMul;
        notes.push(`X${NEW_RELIC.underdogMul}`);
      }
      if (firstBlood && paying) {
        fired.add('firstblood');
        g.mult *= NEW_RELIC.firstbloodMul;
        notes.push(`X${NEW_RELIC.firstbloodMul} FIRST`);
      }
      // GLASS CANNON: every paying group pays x1.5.
      if (player && paying && this.cfg.player.payMul) {
        g.mult *= this.cfg.player.payMul;
        notes.push(`X${this.cfg.player.payMul}`);
      }
    }
    // GOLD LEAF: gold on a payline cell that pays nothing joins your biggest paying group.
    if (has('midas')) {
      const best = s.groups.filter(pays).sort((a, b) => b.base * b.mult - a.base * a.mult)[0];
      if (best) {
        const inPaying = new Set(s.groups.filter(pays).flatMap((g) => g.reels));
        const gv = charmValue('gold', this.charmLvl(me, 'gold'));
        const stray = line.reduce((a, _s, r) => a + (!inPaying.has(r) && cellSym(r) !== 'goldbar' && this.paylineEnh(me, r) === 'gold' ? gv : 0), 0);
        if (stray) {
          const own = goldOf.get(best) ?? 0;
          best.mult = (best.mult / (own || 1)) * (own + stray);
          notesOf.get(best)!.push(`+X${stray} LEAF`);
          fired.add('midas');
        }
      }
    }
    for (const g of s.groups) {
      const notes = notesOf.get(g)!;
      g.amount = Math.round(g.base * g.mult);
      // RAKE: the Croupier takes a cut of each group.
      if (me.raked > 0 && g.amount > 0) {
        const cut = Math.min(g.amount, RAKE_CUT);
        g.amount -= cut;
        g.cut = (g.cut ?? 0) + cut;
        notes.push(`-${cut} RAKE`);
      }
      // HEX: a group touching a hexed reel pays half.
      if (g.reels.some((r) => me.hexed[r] > 0) && g.amount > 0) {
        const cut = g.amount - Math.floor(g.amount / 2);
        g.amount -= cut;
        g.cut = (g.cut ?? 0) + cut;
        notes.push('HALF');
      }
      if (notes.length) g.notes = notes;
      // Twin Reels: a pair that only pays because any two reels count.
      if (me.relics.has('mirror') && g.matched && g.reels.length === 2 && !(g.reels[0] === 0 && g.reels[1] === 1)) fired.add('mirror');
      if (me.relics.has('ticket') && g.reels.some((r) => this.paylineEnh(me, r))) fired.add('ticket');
    }
    if (fired.size) s.relics = [...fired];
    s.totals = {};
    for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
    return s;
  }

  /** The charm on a reel's payline cell, if it's live (not stolen, slimed, jammed, hexed or counterfeit). */
  private paylineEnh(c: Combatant, r: number): Enh | undefined {
    const cell = c.reels[r].cells[c.reels[r].stop];
    if (!cell?.enh || cell.stolen || cell.slimed || (cell.faked ?? 0) > 0 || c.locked[r] > 0 || c.hexed[r] > 0) return undefined;
    return cell.enh;
  }

  private isGrounded(c: Combatant, r: number): boolean {
    return c.side === 'player' && !!c.reels[r].cells[c.reels[r].stop]?.grounded;
  }

  private resetShield(c: Combatant, events: CombatEvent[]): void {
    if (c.shield <= 0) return;
    if (c.side === 'player' && !this.over) {
      const held = c.shield;
      // SHIELD BASH: leftover shield hits back for half before it resets.
      if (c.relics.has('bash')) {
        const amt = Math.round((held * NEW_RELIC.bashShare) / UNIT) * UNIT;
        if (amt > 0) {
          events.push({ type: 'relic', side: 'player', relic: 'bash' });
          this.hit(c, this.sides.enemy, amt, [], events);
        }
      }
      // CHAINMAIL: leftover shield heals you for a share of it.
      if (!this.over && c.relics.has('chainmail')) {
        const h = Math.round((held * NEW_RELIC.chainmailShare) / 5) * 5;
        if (h > 0) {
          events.push({ type: 'relic', side: 'player', relic: 'chainmail' });
          this.heal(c, h, 'chainmail', events);
        }
      }
      if (this.over) return;
    }
    events.push({ type: 'shieldReset', side: c.side, lost: c.shield });
    c.shield = 0;
  }

  /** Did this spin trigger a bonus? A natural triple on the payline, or the hidden roll (reels must be free to move). */
  private bonusTrigger(me: Combatant, frozen: boolean[], locked: boolean[]): VoucherKind | null {
    const line = paylineSymbols(me.reels);
    if (line.every((s) => s === 'bonusSym')) return 'wheel';
    if (line.every((s) => s === 'relicSym')) return 'rush';
    if (this.forceBonus) {
      const k = this.forceBonus;
      this.forceBonus = null;
      return k;
    }
    if (frozen.some(Boolean) || locked.some(Boolean)) return null;
    const roll = this.rng.next();
    if (roll < BONUS.wheel) return 'wheel';
    if (roll < BONUS.wheel + BONUS.rush) return 'rush';
    return null;
  }

  private rollStops(c: Combatant, frozen: boolean[], forced?: SymbolId[]): { stops: number[]; lucky: RelicId | null } {
    const stops = c.reels.map((reel, r) => {
      if (frozen[r]) return reel.stop;
      const want = forced?.[r];
      if (want) {
        const hits = reel.cells.flatMap((cell, i) => (effectiveSymbol(cell) === want ? [i] : []));
        if (hits.length) return this.rng.pick(hits);
      }
      // The chase symbols only ever land when a bonus triggers: normal spins stop on the real cells,
      // so the odds are exactly what they would be without them (they still scroll by as teases).
      if (c.side === 'player' && this.cfg.player.bonusSymbols) {
        const real = reel.cells.flatMap((cell, i) => (BONUS_SYMBOLS.has(cell.symbol) ? [] : [i]));
        return this.rng.pick(real);
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
    const player = me.side === 'player';
    switch (g.symbol) {
      case 'sword':
        // KEEN: a keen sword in the group pierces shields.
        this.hit(me, foe, g.amount, g.reels, events, !!g.pierce);
        this.vampHeal(me, g, events);
        return;
      case 'seven':
        // Sevens are the House's heavy hitters.
        this.hit(me, foe, g.amount, g.reels, events);
        return;
      case 'shield':
        me.shield += g.amount;
        events.push({ type: 'shieldGain', side: me.side, reels: g.reels, amount: g.amount, total: me.shield });
        // FARADAY CAGE: shield you gain also charges your lightning.
        if (player && this.special && me.relics.has('faraday') && g.amount > 0 && !this.over) {
          const e = Math.round((g.amount * NEW_RELIC.faradayShare) / UNIT) * UNIT;
          if (e > 0) {
            events.push({ type: 'relic', side: me.side, relic: 'faraday' });
            this.gainEnergy(me, e, g.reels, events);
          }
        }
        this.vampHeal(me, g, events);
        return;
      case 'bolt':
        // The Mirror has no special of its own: it only reflects. Only TESLA (or the bare engine) has one.
        if ((me.side === 'enemy' && this.isMirror) || (player && !this.special)) break;
        {
          // The Grounder: a grounded bolt on your payline earths its share of the energy.
          const grounded = player ? g.reels.filter((r) => this.isGrounded(me, r)).length : 0;
          const earthed = grounded ? unitsUp((g.amount * grounded) / g.reels.length) : 0;
          this.gainEnergy(me, Math.max(0, g.amount - earthed), g.reels, events, earthed);
        }
        this.vampHeal(me, g, events);
        return;
      case 'goldbar':
      case 'thorn':
        if (!player || this.meter?.symbol !== g.symbol) break;
        {
          const grounded = g.reels.filter((r) => this.isGrounded(me, r)).length;
          const earthed = grounded ? Math.ceil((g.amount * grounded) / g.reels.length) : 0;
          this.fillMeter(me, Math.max(0, g.amount - earthed), g.reels, events, earthed);
          // Cactus: banking thorns also shields you for a share of what you banked.
          if (g.symbol === 'thorn' && me.relics.has('cactus') && g.amount > earthed) {
            const sh = Math.max(1, Math.round((g.amount - earthed) * CACTUS_SHARE));
            me.shield += sh;
            events.push({ type: 'relic', side: me.side, relic: 'cactus' });
            events.push({ type: 'shieldGain', side: me.side, reels: [], amount: sh, total: me.shield, source: 'cactus' });
          }
        }
        this.vampHeal(me, g, events);
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
    // A jackpot of stolen (empty) cells gets EVERYTHING back, the way slime's cleanse does.
    if (g.symbol === 'empty' && g.matched && g.reels.length >= 3) {
      this.recover(me, events);
      return;
    }
    void score;
    events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: g.symbol });
  }

  /** VAMP: vamp cells in a group that pays heal you (swords; any symbol with VAMPIRE'S KISS or GRAFT). */
  private vampHeal(me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
    if (this.over || g.amount <= 0) return;
    const copies = g.jackpot && g.reels.length === 1 ? 3 : 1;
    const vamp = g.reels.filter((r) => this.paylineEnh(me, r) === 'vamp').length * charmValue('vamp', this.charmLvl(me, 'vamp')) * copies;
    if (vamp) this.heal(me, vamp, 'vamp', events);
  }

  /** MIDAS / JAX: the full meter pays off this spin — it empties, and you heal. */
  private payoff(me: Combatant, score: LineScore, events: CombatEvent[]): void {
    if (score.jackpots) {
      me.armed = false;
      me.energy = 0;
      events.push({ type: 'payoff', side: me.side, kind: 'jackpots' });
      return;
    }
    // MIDAS TOUCH spends what it used; gold past that stays.
    me.energy = Math.max(0, me.energy - this.touchSpend);
    this.touchSpend = 0;
    me.armed = me.energy >= this.meterCost;
    events.push({ type: 'payoff', side: me.side, kind: 'touch', left: me.energy });
  }

  /** After a payoff's groups resolved: its heal (+ Vampire Fang) and the Overcharge echo. */
  private payoffAfter(me: Combatant, _score: LineScore, events: CombatEvent[], from: number): void {
    const foe = this.sides[other(me.side)];
    const dealt = events.slice(from).reduce((a, e) => a + (e.type === 'attack' && e.from === me.side && e.note !== 'thorns' ? e.amount : 0), 0);
    this.payoffHeal(me, events);
    if (!this.over && me.relics.has('overcharge') && dealt > 0) {
      events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
      this.hit(me, foe, Math.max(1, Math.round(dealt * OVERCHARGE_ECHO)), [], events, false, 'echo');
      if (!this.over && me.relics.has('fang')) this.heal(me, FANG_HEAL, 'fang', events);
    }
  }

  /** Every meter payoff heals (the machine's own heal, plus Vampire Fang). */
  private payoffHeal(me: Combatant, events: CombatEvent[]): void {
    if (me.side !== 'player' || this.over) return;
    const heal = this.meter?.heal ?? 0;
    if (heal > 0) this.heal(me, heal, 'payoff', events);
    if (!this.over && me.relics.has('fang')) this.heal(me, this.meter?.kind === 'thorns' ? FANG_THORN_HEAL : FANG_HEAL, 'fang', events);
  }

  /** MIDAS / JAX / BRIAR: fill the signature meter (a full MIDAS / JAX meter locks until it pays off). */
  private fillMeter(me: Combatant, amount: number, reels: number[], events: CombatEvent[], earthed = 0): void {
    if (me.side !== 'player' || !this.meter) return;
    amount *= this.cfg.player.meterMul ?? 1;
    if (this.meter.kind === 'thorns') {
      me.energy += amount;
      events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(earthed ? { earthed } : {}) });
      return;
    }
    // MIDAS: gold is never wasted: it keeps counting past full (each touch spends one full meter).
    if (this.meter.kind === 'touch') {
      me.energy += amount;
      if (me.energy >= this.meterCost) me.armed = true;
      events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}), ...(earthed ? { earthed } : {}) });
      return;
    }
    if (me.armed) {
      events.push({ type: 'meter', side: me.side, reels, amount: 0, total: me.energy, armed: true, wasted: amount });
      return;
    }
    me.energy = Math.min(this.meterCost, me.energy + amount);
    if (me.energy >= this.meterCost) me.armed = true;
    events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}), ...(earthed ? { earthed } : {}) });
  }

  /** BRIAR: when you're attacked, the thorn bank hits back through shields (once per enemy turn), then clears. */
  private thorns(victim: Combatant, attacker: Combatant, events: CombatEvent[]): void {
    if (this.over || victim.side !== 'player' || this.meter?.kind !== 'thorns' || victim.energy <= 0 || this.thornsTurn === this.turn) return;
    this.thornsTurn = this.turn;
    const bank = victim.energy;
    victim.energy = 0;
    const h = this.damage(attacker, bank, true);
    events.push({ type: 'attack', from: victim.side, to: attacker.side, reels: [], amount: bank, ...h, note: 'thorns' });
    events.push({ type: 'meter', side: victim.side, reels: [], amount: -bank, total: 0 });
    this.checkDeath(attacker, events);
    this.payoffHeal(victim, events);
    // ROSE HIP: a volley heals you for a share of what it fired.
    if (!this.over && victim.relics.has('rosehip')) {
      const h = Math.round((bank * NEW_RELIC.rosehipShare) / 5) * 5;
      if (h > 0) {
        events.push({ type: 'relic', side: victim.side, relic: 'rosehip' });
        this.heal(victim, h, 'rosehip', events);
      }
    }
    if (!this.over && victim.relics.has('overcharge')) {
      events.push({ type: 'relic', side: victim.side, relic: 'overcharge' });
      const echo = Math.max(1, Math.round(bank * OVERCHARGE_ECHO));
      const h2 = this.damage(attacker, echo, true);
      events.push({ type: 'attack', from: victim.side, to: attacker.side, reels: [], amount: echo, ...h2, note: 'echo' });
      this.checkDeath(attacker, events);
      if (!this.over && victim.relics.has('fang')) this.heal(victim, FANG_THORN_HEAL, 'fang', events);
    }
  }

  private hit(
    me: Combatant,
    foe: Combatant,
    amount: number,
    reels: number[],
    events: CombatEvent[],
    pierce = false,
    note?: 'drain' | 'mimic' | 'reflect' | 'echo',
  ): number {
    // RAISE: the Dealer's next hit pays double.
    if (me.side === 'enemy' && this.raiseEnemy && amount > 0 && note !== 'reflect') {
      amount *= 2;
      this.raiseEnemy = false;
    }
    // The Mirror copies your build: its hits are capped relative to you.
    if (me.side === 'enemy' && this.isMirror && note !== 'reflect') amount = Math.min(amount, Math.max(UNIT, Math.round(foe.maxHp * MIRROR_HIT_CAP)));
    const pierced = pierce && foe.shield > 0;
    const h = this.damage(foe, amount, pierce);
    events.push({ type: 'attack', from: me.side, to: foe.side, reels, amount, ...h, ...(pierced ? { note: 'pierce' as const } : note ? { note } : {}) });
    this.checkDeath(foe, events);
    // BRIAR: being attacked (blocked or not) sets the thorn bank off.
    if (!this.over && amount > 0) this.thorns(foe, me, events);
    // STATIC: being attacked charges your lightning (once per enemy turn).
    if (!this.over && amount > 0 && foe.side === 'player' && this.special && foe.relics.has('static') && this.staticTurn !== this.turn) {
      this.staticTurn = this.turn;
      events.push({ type: 'relic', side: 'player', relic: 'static' });
      this.gainEnergy(foe, NEW_RELIC.staticCharge, [], events);
    }
    return h.hpDamage;
  }

  private gainEnergy(me: Combatant, amount: number, reels: number[], events: CombatEvent[], earthed = 0): void {
    const foe = this.sides[other(me.side)];
    if (me.side === 'player') amount *= this.cfg.player.meterMul ?? 1;
    me.energy += amount;
    events.push({ type: 'energyGain', side: me.side, reels, amount, total: me.energy, ...(earthed ? { earthed } : {}) });
    // The Grounder: a grounded cell on your payline makes your special hit shields.
    const grounded = me.reels.some((reel) => reel.cells[reel.stop]?.grounded);
    const pierce = this.cfg.specialIgnoresShield && !grounded;
    while (me.energy >= this.cfg.specialCost && !this.over) {
      me.energy -= this.cfg.specialCost;
      const dmg = this.cfg.specialDamage + (me.side === 'player' ? this.blaze : 0);
      const h = this.damage(foe, dmg, pierce);
      events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: dmg, ...h, energyLeft: me.energy, ...(grounded ? { grounded } : {}) });
      this.checkDeath(foe, events);
      // Overcharge: the special echoes at a third of its damage.
      if (!this.over && me.relics.has('overcharge')) {
        events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
        const echo = unitsUp(dmg * OVERCHARGE_ECHO);
        const h2 = this.damage(foe, echo, pierce);
        events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: echo, ...h2, energyLeft: me.energy, ...(grounded ? { grounded } : {}) });
        this.checkDeath(foe, events);
        // Vampire Fang drinks from the echo too.
        if (!this.over && me.relics.has('fang')) this.heal(me, FANG_HEAL, 'fang', events);
      }
      // Every special heals a little (TESLA's payoff heal), plus Vampire Fang.
      if (me.side === 'player') this.payoffHeal(me, events);
    }
  }

  private heal(me: Combatant, amount: number, source: HealSource, events: CombatEvent[]): void {
    const n = Math.min(amount, me.maxHp - me.hp);
    if (n > 0) {
      me.hp += n;
      events.push({ type: 'heal', side: me.side, amount: n, hp: me.hp, source });
    }
    // Blood Chalice: healing past full HP becomes shield.
    const over = amount - Math.max(0, n);
    if (over > 0 && me.relics.has('chalice') && source !== 'drain' && source !== 'ability') {
      me.shield += over;
      events.push({ type: 'relic', side: me.side, relic: 'chalice' });
      events.push({ type: 'shieldGain', side: me.side, reels: [], amount: over, total: me.shield, source: 'chalice' });
    }
  }

  private damage(target: Combatant, amount: number, ignoreShield: boolean) {
    const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
    target.shield -= blocked;
    let hpDamage = Math.min(target.hp, amount - blocked);
    // The crack gate: the Mirror's glass holds at half HP for the rest of the turn it cracks on.
    if (target.side === 'enemy' && this.isDealer && !this.dealt) hpDamage = Math.min(hpDamage, Math.max(0, target.hp - Math.floor(target.maxHp / 2)));
    if (target.side === 'enemy' && this.isMirror) {
      if (this.crackTurn === this.turn) hpDamage = 0;
      else if (!this.shattered) hpDamage = Math.min(hpDamage, Math.max(0, target.hp - Math.floor(target.maxHp / 2)));
    }
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
      // The Dealer at half HP (after its first deal): HOUSE RULES — it deals faster.
      if (c.side === 'enemy' && this.isDealer && this.dealt && !this.houseRules && c.hp <= c.maxHp / 2 && c.ability) {
        this.houseRules = true;
        c.ability = { ...c.ability, every: Math.max(2, c.ability.every - 1) };
        c.charge = Math.min(c.charge, c.ability.every - 1);
        events.push({ type: 'houseRules', side: c.side, every: c.ability.every });
      }
      // The Mirror cracks at half HP: its Reflection charges faster.
      if (c.side === 'enemy' && this.isMirror && !this.shattered && c.hp <= c.maxHp / 2 && c.ability) {
        this.shattered = true;
        this.crackTurn = this.turn;
        c.ability = { ...c.ability, every: Math.max(2, c.ability.every - 1) };
        // The crack snaps back: it reflects on its very next turn.
        c.charge = c.ability.every - 1;
        events.push({ type: 'shatter', side: c.side, every: c.ability.every });
      }
      return;
    }
    // Phoenix Feather: once per fight, a lethal hit leaves you at 1 HP.
    if (c.relics.has('phoenix') && !this.phoenixUsed) {
      this.phoenixUsed = true;
      c.hp = 1;
      events.push({ type: 'phoenix', side: c.side, hp: 1 });
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
    // HOLY WATER: the first cheat on your reels each fight washes off (singles that fizzle anyway don't use it).
    if (foe.side === 'player' && foe.relics.has('holywater') && !this.holyWater && REEL_WRITES.has(sym) && !(FIZZLE_SINGLES.has(sym) && amount < PAIR_PAY)) {
      this.holyWater = true;
      events.push({ type: 'relic', side: 'player', relic: 'holywater' });
      return this.fizzle(me, sym, reels, events);
    }
    switch (sym) {
      case 'slime':
        // One slimed cell per UNIT of slime pay (a double slimes 4, a jackpot 9).
        return this.applySlime(me, foe, Math.round(amount / UNIT), reels, events);
      case 'ice':
        // 1 reel × 1 turn, a double 2 × 2, a jackpot 2 × 3 (never all three reels).
        return this.applyStatus(me, foe, 'frozen', amount >= PAIR_PAY ? 2 : 1, amount >= JACKPOT_PAY ? 3 : amount >= PAIR_PAY ? 2 : 1, reels, events);
      case 'lock':
        // Jams bite hard (the reel scores nothing): single locks fizzle, doubles jam 1 reel,
        // jackpots 2, always for one turn.
        if (amount < PAIR_PAY) return this.fizzle(me, 'lock', reels, events);
        return this.applyStatus(me, foe, 'locked', amount >= JACKPOT_PAY ? 2 : 1, 1, reels, events);
      case 'claw':
        return this.steal(me, foe, statusSize(amount), reels, events);
      case 'rock':
        // Rocks are permanent for the run: single rocks fizzle, doubles add 1, jackpots 2.
        if (amount < PAIR_PAY) return this.fizzle(me, 'rock', reels, events);
        return this.junk(me, foe, amount >= JACKPOT_PAY ? 2 : 1, reels, events);
      case 'coin':
        this.pot += amount;
        events.push({ type: 'pot', side: me.side, reels, amount, total: this.pot });
        return;
      case 'bomb':
        // 1 bomb, a double 2, a jackpot 3.
        return this.plantBombs(me, foe, statusSize(amount), reels, events);
      case 'hex':
        // Single hexes fizzle; a double hexes 1 reel × 2 turns, a jackpot 2 × 2.
        if (amount < PAIR_PAY) return this.fizzle(me, 'hex', reels, events);
        return this.hex(me, foe, amount >= JACKPOT_PAY ? 2 : 1, 2, reels, events);
      case 'fangs': {
        // Drain: hurts you and heals the vampire by what got through.
        const dmg = (amount >= JACKPOT_PAY ? 7 : amount >= PAIR_PAY ? 4 : 2) * UNIT;
        const got = this.hit(me, foe, dmg, reels, events, false, 'drain');
        if (!this.over && got > 0) this.heal(me, got, 'drain', events);
        return;
      }
      case 'card':
        // Mark 1 / 2 / 3 of your visible cells.
        return this.markCells(me, foe, statusSize(amount), reels, events);
      case 'gavel':
        // Singles fizzle; a double confiscates 1 gild, a jackpot 2 (for the fight).
        if (amount < PAIR_PAY) return this.fizzle(me, 'gavel', reels, events);
        return this.confiscate(me, foe, amount >= JACKPOT_PAY ? 4 : 2, reels, events);
      case 'rake':
        // 1 turn, a double 2, a jackpot 3.
        return this.applyRake(me, foe, statusSize(amount), reels, events);
      case 'ground':
        // 1 rod, a double 2, a jackpot 3 (onto your bolt cells).
        return this.plantGround(me, foe, statusSize(amount) + 1, reels, events);
      case 'fake':
        // 1 cell, a double 2, a jackpot 3 (gilded cells, visible first), plain for 2 turns.
        return this.fakeGilds(me, foe, 2 * statusSize(amount), FAKE_TURNS, reels, events);
      case 'mimicSym': {
        // The Mimic copies your last spin's biggest group (half on a single, double on a jackpot).
        const best = this.last[foe.side].best;
        const dmg = Math.min(12 * UNIT, Math.max(UNIT, amount >= JACKPOT_PAY ? best * 2 : amount >= PAIR_PAY ? best : unitsUp(best / 2)));
        this.hit(me, foe, dmg, reels, events, false, 'mimic');
        return;
      }
    }
  }

  // ---- act 2 writers --------------------------------------------------------------------

  /** Stick bombs on the foe's visible cells. Each burns a fuse on its owner's turns. */
  private plantBombs(me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
    const free = this.rng.shuffle(
      visibleCells(foe.reels).filter((ref) => {
        const c = foe.reels[ref.reel].cells[ref.index];
        // Never on the payline itself... unless the House cheats (BLACK stake).
        const cheat = this.isBoss && (this.cfg.stake ?? 0) >= STAKE.houseDirty;
        return !c.bomb && !c.stolen && !BONUS_SYMBOLS.has(c.symbol) && (cheat || ref.index !== foe.reels[ref.reel].stop);
      }),
    );
    // Never on the payline itself: it would look defused without being so.
    const cells = free.slice(0, count);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].bomb = BOMB.fuse;
    if (cells.length) events.push({ type: 'bomb', from: me.side, to: foe.side, reels, cells });
    else this.fizzle(me, 'bomb', reels, events);
  }

  // ---- act 3 writers --------------------------------------------------------------------

  /** Mark visible cells as dead CARDs for the fight. */
  private markCells(me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
    const pool = this.rng.shuffle(
      visibleCells(foe.reels).filter((ref) => {
        const c = foe.reels[ref.reel].cells[ref.index];
        return !c.carded && !c.stolen && symbolValue(c.symbol) > 0;
      }),
    );
    pool.sort((a, b) => cellValue(foe.reels[b.reel].cells[b.index]) - cellValue(foe.reels[a.reel].cells[a.index]));
    const cells = pool.slice(0, count);
    if (!cells.length) return this.fizzle(me, 'card', reels, events);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].carded = true;
    if (me.side === 'enemy') this.marksPlaced += cells.length;
    events.push({ type: 'mark', from: me.side, to: foe.side, reels, cells });
  }

  /** Marked cards on your payline bite for MARK_DAMAGE each (shield blocks). */
  private markedCards(me: Combatant, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    me.reels.forEach((reel, r) => reel.cells[reel.stop]?.carded && cells.push({ reel: r, index: reel.stop }));
    if (!cells.length) return;
    const amount = MARK_DAMAGE * cells.length;
    const h = this.damage(me, amount, false);
    events.push({ type: 'markedHit', side: me.side, cells, amount, ...h });
    this.checkDeath(me, events);
  }

  /** The Pit Boss confiscates `count` charmed cells (visible ones first) for the fight. */
  private confiscate(me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
    const cells = this.charmedTargets(foe, count);
    if (!cells.length) return this.fizzle(me, 'gavel', reels, events);
    const enhs = new Set<Enh>();
    for (const ref of cells) {
      const c = foe.reels[ref.reel].cells[ref.index];
      enhs.add(c.enh!);
      c.confiscated = c.enh;
      delete c.enh;
    }
    events.push({ type: 'confiscate', from: me.side, to: foe.side, reels, cells, enhs: [...enhs] });
  }

  /** Charmed cells to target: visible first (gold first), then the rest of the strips. */
  private charmedTargets(foe: Combatant, count: number, skip: (c: { faked?: number }) => boolean = () => false): CellRef[] {
    const vis = new Set(visibleCells(foe.reels).map((r) => `${r.reel}:${r.index}`));
    const all: CellRef[] = [];
    foe.reels.forEach((reel, r) => reel.cells.forEach((c, i) => c.enh && !c.stolen && !skip(c) && all.push({ reel: r, index: i })));
    const gold = (x: CellRef) => (foe.reels[x.reel].cells[x.index].enh === 'gold' ? 1 : 0);
    const order = (xs: CellRef[]) => this.rng.shuffle(xs).sort((a, b) => gold(b) - gold(a));
    return [...order(all.filter((x) => vis.has(`${x.reel}:${x.index}`))), ...order(all.filter((x) => !vis.has(`${x.reel}:${x.index}`)))].slice(0, count);
  }

  /** The Croupier's rake: your groups pay RAKE_CUT less for `turns` of your turns. */
  private applyRake(me: Combatant, foe: Combatant, turns: number, reels: number[], events: CombatEvent[]): void {
    foe.raked = Math.max(foe.raked, turns);
    events.push({ type: 'rake', from: me.side, to: foe.side, reels, turns: foe.raked, cut: RAKE_CUT });
  }

  // ---- the Dealer's cards ---------------------------------------------------------------

  private deal(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const card = this.nextDeal;
    this.dealt = true;
    if (card === 'shuffle') this.shuffleReels(me, foe, events);
    else if (card === 'cut') this.cutReels(me, foe, events);
    else {
      this.raiseEnemy = true;
      this.raisePlayer = true;
      events.push({ type: 'raise', from: me.side });
    }
    this.nextDeal = this.rng.pick(DEALS);
    events.push({ type: 'dealNext', side: me.side, card: this.nextDeal });
  }

  /** SHUFFLE: swap up to 5 cells between two of the foe's reels (never the chase cells). */
  private shuffleReels(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const [a, b] = this.rng.shuffle([0, 1, 2]).slice(0, 2).sort((x, y) => x - y) as [number, number];
    const movable = (r: number) =>
      this.rng.shuffle(foe.reels[r].cells.map((c, i) => ({ c, i })).filter(({ c }) => !BONUS_SYMBOLS.has(c.symbol))).map(({ i }) => i);
    const ia = movable(a);
    const ib = movable(b);
    const swaps: [number, number][] = [];
    for (let k = 0; k < Math.min(SHUFFLE_SWAPS, ia.length, ib.length); k++) {
      const x = ia[k];
      const y = ib[k];
      const tmp = foe.reels[a].cells[x];
      foe.reels[a].cells[x] = foe.reels[b].cells[y];
      foe.reels[b].cells[y] = tmp;
      swaps.push([x, y]);
    }
    events.push({ type: 'shuffle', from: me.side, to: foe.side, reels: [a, b], swaps });
  }

  /** CUT: remove one cell of your commonest symbol from each reel (never below 6 cells). */
  private cutReels(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    foe.reels.forEach((reel, r) => {
      if (reel.cells.length <= 6) return;
      const counts = new Map<SymbolId, number>();
      for (const c of reel.cells) if (!c.stolen) counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1);
      const top = [...counts].sort((x, y) => y[1] - x[1])[0]?.[0];
      // It cuts your CHARMED cells first (so full-set builds feel it too), else your commonest symbol —
      // never the payline cell, so the display doesn't jump.
      const charmed = reel.cells.findIndex((c, k) => !!c.enh && k !== reel.stop && !BONUS_SYMBOLS.has(c.symbol));
      const i = charmed >= 0 ? charmed : reel.cells.findIndex((c, k) => c.symbol === top && k !== reel.stop);
      if (i < 0) return;
      reel.cells.splice(i, 1);
      if (i < reel.stop) reel.stop -= 1;
      cells.push({ reel: r, index: i });
    });
    events.push({ type: 'cut', from: me.side, to: foe.side, cells });
  }

  /** Drive grounding rods into the foe's bolt cells (visible first). */
  private plantGround(me: Combatant, foe: Combatant, count: number, reels: number[], events: CombatEvent[]): void {
    const vis = new Set(visibleCells(foe.reels).map((r) => `${r.reel}:${r.index}`));
    const all: CellRef[] = [];
    // It grounds your signature symbol (TESLA's bolts, MIDAS's gold bars, BRIAR's thorns, JAX's wilds).
    const sig: SymbolId = foe.side === 'player' && this.meter ? this.meter.symbol : 'bolt';
    foe.reels.forEach((reel, r) => reel.cells.forEach((c, i) => c.symbol === sig && !c.grounded && !c.stolen && all.push({ reel: r, index: i })));
    const pool = [...this.rng.shuffle(all.filter((x) => vis.has(`${x.reel}:${x.index}`))), ...this.rng.shuffle(all.filter((x) => !vis.has(`${x.reel}:${x.index}`)))];
    const cells = pool.slice(0, count);
    if (!cells.length) return this.fizzle(me, 'ground', reels, events);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].grounded = true;
    events.push({ type: 'ground', from: me.side, to: foe.side, reels, cells });
  }

  /** Slap counterfeit coins over the foe's charmed cells (visible first): their charms go plain for `turns`. */
  private fakeGilds(me: Combatant, foe: Combatant, count: number, turns: number, reels: number[], events: CombatEvent[]): void {
    const cells = this.charmedTargets(foe, count, (c) => (c.faked ?? 0) > 0);
    if (!cells.length) return this.fizzle(me, 'fake', reels, events);
    for (const ref of cells) foe.reels[ref.reel].cells[ref.index].faked = turns;
    const enhs = [...new Set(cells.map((ref) => foe.reels[ref.reel].cells[ref.index].enh!))];
    events.push({ type: 'fake', from: me.side, to: foe.side, reels, cells, turns, enhs });
  }

  /** Counterfeit coins wear off after their owner's turns. */
  private tickFakes(me: Combatant, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    const left: number[] = [];
    me.reels.forEach((reel, r) =>
      reel.cells.forEach((c, i) => {
        if (!c.faked || c.faked <= 0) return;
        c.faked -= 1;
        cells.push({ reel: r, index: i });
        left.push(c.faked);
        if (c.faked <= 0) delete c.faked;
      }),
    );
    if (cells.length) events.push({ type: 'fakeTick', side: me.side, cells, left });
  }

  /** Bombs that land on your payline are defused. */
  private defuse(me: Combatant, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    me.reels.forEach((reel, r) => {
      const cell = reel.cells[reel.stop];
      if (cell.bomb) {
        delete cell.bomb;
        cells.push({ reel: r, index: reel.stop });
      }
    });
    if (cells.length) events.push({ type: 'defuse', side: me.side, cells });
  }

  /** At the end of your turn every bomb on your strips burns a turn; the ones at 0 go off (shield blocks). */
  private burnFuses(me: Combatant, events: CombatEvent[]): void {
    const live: CellRef[] = [];
    const fuses: number[] = [];
    const boom: CellRef[] = [];
    me.reels.forEach((reel, r) =>
      reel.cells.forEach((cell, i) => {
        if (!cell.bomb) return;
        cell.bomb -= 1;
        live.push({ reel: r, index: i });
        fuses.push(cell.bomb);
        if (cell.bomb <= 0) {
          delete cell.bomb;
          boom.push({ reel: r, index: i });
        }
      }),
    );
    if (!live.length) return;
    events.push({ type: 'fuse', side: me.side, cells: live, fuses });
    for (const cell of boom) {
      const h = this.damage(me, BOMB.damage, false);
      events.push({ type: 'blast', side: me.side, cell, amount: BOMB.damage, ...h });
      this.checkDeath(me, events);
      if (this.over) return;
    }
  }

  /** Hex the foe's most valuable reels (most gilded cells first): they pay half and gilds go dark. */
  private hex(me: Combatant, foe: Combatant, count: number, turns: number, reels: number[], events: CombatEvent[]): void {
    const worth = (r: number) => foe.reels[r].cells.filter((c) => c.enh).length * 10 + (foe.hexed[r] > 0 ? -100 : 0);
    const order = this.rng.shuffle(foe.reels.map((_, r) => r)).sort((a, b) => worth(b) - worth(a));
    const targets = order.slice(0, count).sort((a, b) => a - b);
    for (const r of targets) foe.hexed[r] = Math.max(foe.hexed[r], turns);
    events.push({ type: 'hex', from: me.side, to: foe.side, reels, targets, turns });
  }

  private applySlime(me: Combatant, foe: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
    const clean = visibleCells(foe.reels).filter((ref) => {
      const c = foe.reels[ref.reel].cells[ref.index];
      return !c.slimed && !c.stolen && !BONUS_SYMBOLS.has(c.symbol);
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
    const arr = foe[status];
    const valueAt = (r: number, stop: number) => {
      const c = foe.reels[r].cells[stop];
      return symbolValue(effectiveSymbol(c)) + (c.enh && !c.slimed && !c.stolen ? 3 : 0);
    };
    const order = this.rng.shuffle(foe.reels.map((_, r) => r));
    order.sort((a, b) => (ice ? valueAt(a, foe.reels[a].stop) - valueAt(b, foe.reels[b].stop) : valueAt(b, foe.reels[b].stop) - valueAt(a, foe.reels[a].stop)));
    let targets = order.slice(0, count).sort((a, b) => a - b);

    if (!ice) {
      if (!targets.length) return;
      for (const r of targets) arr[r] = Math.max(arr[r], turns);
      events.push({ type: 'lock', from: me.side, to: foe.side, reels, targets, turns });
      return;
    }

    const len = (r: number) => foe.reels[r].cells.length;
    const sym = (r: number) => effectiveSymbol(foe.reels[r].cells[foe.reels[r].stop]);
    const clunk = (r: number, avoid: ReadonlySet<SymbolId> = new Set()) => {
      const reel = foe.reels[r];
      const options = [reel.stop, (reel.stop + len(r) - 1) % len(r), (reel.stop + 1) % len(r)].filter((st) => !BONUS_SYMBOLS.has(reel.cells[st].symbol));
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
    for (const status of ['frozen', 'locked', 'hexed'] as const) {
      const ended: number[] = [];
      me[status].forEach((t, r) => {
        if (t <= 0) return;
        me[status][r] = t - 1;
        if (t - 1 === 0) ended.push(r);
      });
      if (ended.length) events.push({ type: 'thaw', side: me.side, reels: ended, status });
    }
    if (me.raked > 0) {
      me.raked -= 1;
      if (me.raked === 0) events.push({ type: 'thaw', side: me.side, reels: [], status: 'raked' });
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

  /** Every stolen cell on your strips comes back. */
  private recover(me: Combatant, events: CombatEvent[]): void {
    const cells: CellRef[] = [];
    me.reels.forEach((reel, r) =>
      reel.cells.forEach((cell, i) => {
        if (!cell.stolen) return;
        delete cell.stolen;
        cells.push({ reel: r, index: i });
      }),
    );
    events.push({ type: 'recover', side: me.side, cells });
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
      // The Hourglass slowed this one down.
      if (me.side === 'enemy' && this.sides.player.relics.has('sandglass') && ab.kind !== 'deal') events.push({ type: 'relic', side: 'player', relic: 'sandglass' });
      events.push({ type: 'ability', side: me.side, kind: ab.kind, power: ab.power });
      this.fireAbility(me, ab, events);
      if (this.over) return;
    }
    events.push({ type: 'abilityCharge', side: me.side, charge: me.charge, every: ab.every, kind: ab.kind });
  }

  private fireAbility(me: Combatant, ab: AbilityDef, events: CombatEvent[]): void {
    const foe = this.sides[other(me.side)];
    if (foe.side === 'player' && foe.relics.has('holywater') && !this.holyWater && WRITER_ABILITIES.has(ab.kind)) {
      this.holyWater = true;
      events.push({ type: 'relic', side: 'player', relic: 'holywater' });
      return;
    }
    switch (ab.kind) {
      case 'flood':
        return this.applySlime(me, foe, ab.power, [], events);
      case 'smash':
        this.hit(me, foe, ab.power, [], events);
        return;
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
      case 'carpet':
        return this.plantBombs(me, foe, ab.power, [], events);
      case 'curse':
        return this.hex(me, foe, ab.power, 3, [], events);
      case 'bloodmoon':
        return this.heal(me, ab.power, 'ability', events);
      case 'gulp':
        this.chipsEaten += ab.power;
        events.push({ type: 'gulp', from: me.side, chips: ab.power });
        return;
      case 'mark':
        return this.markCells(me, foe, ab.power, [], events);
      case 'penalty':
        // AUDIT: confiscates two of your charmed cells, then hits.
        this.confiscate(me, foe, 2, [], events);
        if (!this.over) this.hit(me, foe, ab.power, [], events);
        return;
      case 'houseTake':
        return this.applyRake(me, foe, ab.power, [], events);
      case 'deal':
        return this.deal(me, foe, events);
      case 'earth': {
        const amount = foe.armed ? 0 : Math.min(foe.energy, ab.power);
        foe.energy -= amount;
        events.push({ type: 'earth', from: me.side, to: foe.side, amount, total: foe.energy });
        return;
      }
      case 'launder':
        // Takes your chips and turns them into its HP (x3).
        this.chipsEaten += ab.power;
        events.push({ type: 'gulp', from: me.side, chips: ab.power });
        return this.heal(me, ab.power * 3 * UNIT, 'ability', events);
      case 'reflect': {
        // The Mirror throws your last spin back at you (at least a little).
        const dmg = Math.max(REFLECT_MIN, Math.min(ab.power, this.reflectBank));
        this.reflectBank = 0;
        this.hit(me, foe, dmg, [], events, false, 'reflect');
        return;
      }
    }
  }

  // ---- boss: the progressive pot ------------------------------------------------------

  /** The House skims half the pot (rounded up) as damage (shield blocks); the rest keeps growing. */
  private cashPot(me: Combatant, foe: Combatant, events: CombatEvent[]): void {
    const amount = unitsUp(this.pot * POT.skim);
    this.pot -= amount;
    const h = this.damage(foe, amount, false);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: this.pot });
    this.checkDeath(foe, events);
    // The House cashing out is an attack: BRIAR's thorns answer it.
    if (!this.over && amount > 0) this.thorns(foe, me, events);
  }

  /** Any player jackpot steals the pot (a High Roller double steals half), ignoring shield. */
  private winPot(me: Combatant, events: CombatEvent[], share = 1): void {
    if (this.pot <= 0) return;
    const foe = this.sides[other(me.side)];
    const amount = unitsUp(this.pot * share);
    this.pot -= amount;
    const h = this.damage(foe, amount, true);
    events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h, potLeft: this.pot });
    this.checkDeath(foe, events);
  }
}
