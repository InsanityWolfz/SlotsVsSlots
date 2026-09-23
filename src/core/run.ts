import { cloneConfig, type Enh, type GameConfig, type Gild, type RelicId, type StripCounts, type SymbolId } from './config';
import { generateRunPaths, RUN_FIGHTS, type EnemyDef } from './enemies';
import type { Fight } from './fight';
import { BANDAGE_HEAL, BOSS_HP_PER_RELIC, BUILD_ENABLER, CACTUS_DAMAGE, COUNTER_RELICS, COUNTERS, ELITE_ONLY, HONE_BONUS, KEEN_BONUS, RELICS, SPIKED_DAMAGE } from './relics';
import { CABINETS, type CabinetId } from './cabinets';
import { Rng } from './rng';
import { scoreLine } from './scoring';
import { stripCounts } from './strip';

/** Run-level tunables. */
export const RUN = {
  startHp: 32,
  /** Fraction of max HP restored after every won fight (low, so HP cards matter). */
  postFightHeal: 0.2,
  healCard: 8,
  maxHpCard: 4,
  /** A strip can't be thinned below this many cells. */
  minStrip: 6,
  draftSize: 3,
  /** Rocks added during one fight that stay for the rest of the run; the rest crumble. */
  permanentRocksPerFight: 2,
  /** Drafts right after these fights (1-based) offer relics (2 relics + 1 other). */
  relicDraftsAfter: [2, 4],
  swapCount: 3,
  addCount: 2,
  wildCount: 2,
  /** The Cashier opens after these fights (1-based), after the draft. */
  shopAfter: [1, 3, 5],
};

/** Chip economy (earning is passive, spending happens only at the Cashier). */
export const CHIPS = {
  win: 2,
  eliteBonus: 2,
  perJackpot: 1,
  /** +1 chip per this much overkill on the killing blow. */
  overkillPer: 5,
  /** +1 interest per this many banked chips, capped. */
  interestPer: 5,
  interestCap: 3,
  /** Boss fight: every this many unspent chips = +1 shield at the start of each House turn. */
  stackPer: 8,
  /** Every run starts with a little float so shop 1 is a real visit. */
  start: 4,
  prices: { gild: 10, relic: 12, wild: 6, remove: 4, heal: 5 },
  /** First reroll per visit costs 1, then +1 each time. */
  rerollBase: 1,
};

export type DraftOption =
  | { kind: 'add'; symbol: SymbolId; reel: number; count?: number }
  | { kind: 'swap'; from: SymbolId; to: SymbolId; count: number; reel: number }
  | { kind: 'clear'; symbol: 'rock'; reel: number }
  | { kind: 'relic'; relic: RelicId }
  | { kind: 'heal'; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'gild'; enh: Enh; symbol: SymbolId; reel: number }
  | { kind: 'remove'; symbol: SymbolId; reel: number };

export interface ShopItem {
  option: DraftOption;
  price: number;
  sold: boolean;
}

export interface RunPlayer {
  hp: number;
  maxHp: number;
  strips: StripCounts[];
  relics: RelicId[];
  /** Gilded symbols per reel (every cell of that symbol on that reel): persist for the run. */
  gilded: Gild[];
  /** Casino chips: earned by winning, spent at the Cashier, and a shield stack vs the House. */
  chips: number;
}

export interface FightRecord {
  depth: number;
  enemy: string;
  archetype: string;
  won: boolean;
  turns: number;
  hpBefore: number;
  hpAfter: number;
  rocksAdded: number;
  rocksCrumbled: number;
  /** Relic taken from an elite's spoils. */
  eliteRelic?: RelicId;
  /** Chips earned from this fight (including interest). */
  chips?: number;
  pick?: DraftOption;
  /** What was bought at the Cashier after this fight. */
  bought?: DraftOption[];
}

export interface RunState {
  seed: number;
  /** Index of the next fight (0..5; 5 = boss). */
  depth: number;
  /** Enemy options per depth (2 at a fork). */
  paths: EnemyDef[][];
  /** The enemy chosen (or only option) per depth. */
  enemies: EnemyDef[];
  /** Whether the player has picked at a fork. */
  chosen: boolean[];
  player: RunPlayer;
  records: FightRecord[];
  over: boolean;
  won: boolean;
  /** An elite was beaten: choose 1 of these relics before the draft. */
  pendingSpoils: RelicId[] | null;
  /** Rerolls used at the current Cashier visit. */
  shopRerolls: number;
  /** The starting machine. */
  cabinet: CabinetId;
}

export function createRun(_base: GameConfig, seed = Rng.randomSeed(), cabinet: CabinetId = 'knight'): RunState {
  const rng = new Rng(seed);
  const paths = generateRunPaths(rng);
  const cab = CABINETS[cabinet];
  return {
    seed,
    depth: 0,
    paths,
    enemies: paths.map((opts) => opts[0]),
    chosen: paths.map((opts) => opts.length === 1),
    player: {
      hp: cab.hp,
      maxHp: cab.hp,
      strips: cab.strips.map((s) => ({ ...s })),
      relics: [],
      gilded: cab.gilded.map((g) => ({ ...g })),
      chips: CHIPS.start,
    },
    records: [],
    over: false,
    won: false,
    pendingSpoils: null,
    shopRerolls: 0,
    cabinet,
  };
}

export const currentEnemy = (run: RunState): EnemyDef => run.enemies[Math.min(run.depth, run.enemies.length - 1)];
export const isBossNext = (run: RunState) => run.depth >= RUN_FIGHTS;
/** The next fight is a fork the player hasn't chosen yet. */
export const needsChoice = (run: RunState) => !run.over && !run.chosen[run.depth];

export function chooseEnemy(run: RunState, option: number): void {
  const opts = run.paths[run.depth];
  run.enemies[run.depth] = opts[Math.max(0, Math.min(opts.length - 1, option))];
  run.chosen[run.depth] = true;
}

/** The GameConfig for the run's next fight. */
export function fightConfig(run: RunState, base: GameConfig): GameConfig {
  const cfg = cloneConfig(base);
  const e = currentEnemy(run);
  cfg.player = {
    ...cfg.player,
    hp: run.player.maxHp,
    startHp: run.player.hp,
    strips: run.player.strips.map((s) => ({ ...s })),
    gilded: run.player.gilded.map((g) => ({ ...g })),
    stackShield: e.isBoss ? Math.floor(run.player.chips / CHIPS.stackPer) : 0,
  };
  // The House grows with the relics you bring in.
  const hp = e.isBoss ? e.hp + BOSS_HP_PER_RELIC * run.player.relics.length : e.hp;
  cfg.enemy = { hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  cfg.relics = [...run.player.relics];
  cfg.cabinet = run.cabinet;
  cfg.seed = null;
  return cfg;
}

const rocksIn = (s: StripCounts[]) => s.reduce((a, x) => a + (x.rock ?? 0), 0);

/** Fold a finished fight back into the run: HP carry-over, capped permanent rocks, healing. */
export function finishFight(run: RunState, fight: Fight): FightRecord {
  const p = fight.sides.player;
  const won = fight.winner === 'player';
  const before = run.player.hp;
  const old = run.player.strips;
  const next = p.reels.map((r) => stripCounts(r));
  // Rocks are real cells, but only a couple per fight stay for good; the rest crumble.
  let extra = rocksIn(next) - rocksIn(old) - RUN.permanentRocksPerFight;
  let crumbled = 0;
  while (extra > 0) {
    const r = next.map((s, i) => ({ i, gained: (s.rock ?? 0) - (old[i]?.rock ?? 0) })).sort((a, b) => b.gained - a.gained)[0];
    if (r.gained <= 0) break;
    next[r.i].rock = (next[r.i].rock ?? 0) - 1;
    extra--;
    crumbled++;
  }
  run.player.strips = next;
  const record: FightRecord = {
    depth: run.depth,
    enemy: currentEnemy(run).name ?? '?',
    archetype: currentEnemy(run).archetype,
    won,
    turns: fight.turn,
    hpBefore: before,
    hpAfter: p.hp,
    rocksAdded: Math.max(0, rocksIn(next) - rocksIn(old)),
    rocksCrumbled: crumbled,
  };
  run.records.push(record);
  if (!won) {
    run.player.hp = 0;
    run.over = true;
    return record;
  }
  // Chips: interest on what you banked, then the win, elite bonus, jackpots and overkill.
  const beaten = currentEnemy(run);
  const interest = Math.min(CHIPS.interestCap, Math.floor(run.player.chips / CHIPS.interestPer));
  const earned =
    interest +
    CHIPS.win +
    (CABINETS[run.cabinet].chipsPerWin ?? 0) +
    (beaten.elite ? CHIPS.eliteBonus : 0) +
    fight.playerJackpots * CHIPS.perJackpot +
    Math.floor(fight.overkill / CHIPS.overkillPer);
  run.player.chips += earned;
  record.chips = earned;
  // Elites offer their spoils: choose 1 of 2 relics.
  if (beaten.elite) {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && !COUNTER_RELICS.has(r) && relicFits(run, r));
    const rng = new Rng((run.seed ^ Math.imul(run.depth + 7, 0x85ebca6b)) >>> 0);
    const spoils = rng.shuffle(pool).slice(0, 2);
    if (spoils.length) run.pendingSpoils = spoils;
  }
  let hp = p.hp + Math.round(run.player.maxHp * RUN.postFightHeal);
  if (run.player.relics.includes('bandage')) hp += BANDAGE_HEAL;
  run.player.hp = Math.min(run.player.maxHp, hp);
  run.depth++;
  if (run.depth > RUN_FIGHTS) {
    run.over = true;
    run.won = true;
  }
  return record;
}

// ---- strip math (shown on cards so reel targeting is legible) --------------------------

export interface StripStats {
  /** Expected per spin, before shields. */
  damage: number;
  energy: number;
  shield: number;
  pairPct: number;
  jackpotPct: number;
  /** Spins per special on average. */
  spinsPerSpecial: number;
}

export function stripStats(strips: StripCounts[], base: GameConfig, relics: RelicId[] = [], gilded: Gild[] = []): StripStats {
  const enhOf = (reel: number, sym: SymbolId) => gilded.find((g) => g.reel === reel && g.symbol === sym)?.enh;
  const probs = strips.map((s) => {
    const total = Object.values(s).reduce((a, n) => a + (n ?? 0), 0) || 1;
    return (Object.entries(s) as [SymbolId, number][]).filter(([, n]) => n > 0).map(([sym, n]) => [sym, n / total] as const);
  });
  const cfg = { ...base, pairRule: relics.includes('mirror') ? ('anyTwo' as const) : base.pairRule };
  const out = { damage: 0, energy: 0, shield: 0, pairPct: 0, jackpotPct: 0, spinsPerSpecial: 0 };
  for (const [a, pa] of probs[0])
    for (const [b, pb] of probs[1])
      for (const [c, pc] of probs[2]) {
        const p = pa * pb * pc;
        const line = [a, b, c];
        const sc = scoreLine(line, cfg);
        for (const g of sc.groups) {
          for (const r of g.reels) {
            const enh = enhOf(r, line[r]);
            if (enh === 'keen' && g.symbol === 'sword') g.amount += KEEN_BONUS + (relics.includes('hone') ? HONE_BONUS : 0);
            if (enh === 'charged' && g.symbol === 'bolt') g.amount += 1;
          }
          for (const r of g.reels) if (enhOf(r, line[r]) === 'gold') g.amount *= 2;
          if (relics.includes('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) g.amount *= 2;
        }
        sc.totals = {};
        for (const g of sc.groups) sc.totals[g.symbol] = (sc.totals[g.symbol] ?? 0) + g.amount;
        out.damage += p * ((sc.totals.sword ?? 0) + (relics.includes('pickaxe') ? sc.totals.rock ?? 0 : 0));
        out.energy += p * (sc.totals.bolt ?? 0);
        out.shield += p * (sc.totals.shield ?? 0);
        if (sc.tier === 'pair') out.pairPct += p * 100;
        if (sc.tier === 'triple') out.jackpotPct += p * 100;
      }
  out.spinsPerSpecial = out.energy > 0 ? base.specialCost / out.energy : Infinity;
  return out;
}

// ---- drafting --------------------------------------------------------------------------

function keyOf(o: DraftOption): string {
  return JSON.stringify(o);
}

export const isRelicDraft = (run: RunState) => RUN.relicDraftsAfter.includes(run.depth);

/**
 * Three reward cards after a won fight. Relic drafts (after fights 2 and 4) show 2 relics + 1
 * other, so relic-vs-relic is the choice; the rest are strip/HP decisions. Deterministic.
 */
export function draftOffers(run: RunState): DraftOption[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 1, 0x9e3779b1)) >>> 0);
  const p = run.player;
  const out: DraftOption[] = [];
  const push = (o: DraftOption | null) => {
    if (o && out.length < RUN.draftSize && !out.some((x) => keyOf(x) === keyOf(o))) out.push(o);
  };

  const swapCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const from of ['rock', 'shield'] as SymbolId[]) {
        const n = s[from] ?? 0;
        if (n <= 0 || (from === 'shield' && n < 2)) continue;
        options.push({ kind: 'swap', from, to: 'bolt', count: Math.min(RUN.swapCount, n), reel });
      }
    });
    // Rocks-to-something first when you're carrying junk.
    const rocky = options.filter((o) => o.kind === 'swap' && o.from === 'rock');
    return rocky.length && rng.next() < 0.6 ? rng.pick(rocky) : options.length ? rng.pick(options) : null;
  };
  const clearCard = (): DraftOption | null => {
    const rocky = p.strips.map((s, reel) => ({ reel, n: s.rock ?? 0 })).filter((x) => x.n > 0);
    if (!rocky.length) return null;
    rocky.sort((a, b) => b.n - a.n);
    return { kind: 'clear', symbol: 'rock', reel: rocky[0].reel };
  };
  const addCard = (): DraftOption => ({ kind: 'add', symbol: 'bolt', reel: rng.int(3), count: RUN.addCount });
  /** GILD: enhance one cell (GOLD any symbol, KEEN sword, CHARGED bolt, SPIKED shield). */
  const gildCard = (): DraftOption | null => {
    // EXTEND: half the time, offer the same gild you already own on another reel (builds!).
    if (p.gilded.length && rng.next() < 0.5) {
      const own = rng.pick(p.gilded);
      const reels = [0, 1, 2].filter((r) => r !== own.reel && (p.strips[r][own.symbol] ?? 0) > 0 && !p.gilded.some((g) => g.reel === r && g.symbol === own.symbol));
      const pickable = reels.filter((r) => !out.some((o) => o.kind === 'gild' && o.reel === r && o.symbol === own.symbol));
      if (pickable.length) return { kind: 'gild', enh: own.enh, symbol: own.symbol, reel: rng.pick(pickable) };
    }
    const favored = CABINETS[run.cabinet].favors;
    const enh = favored && rng.next() < 0.5 ? favored : rng.pick(['gold', 'keen', 'charged', 'spiked'] as Enh[]);
    const symbols: SymbolId[] = enh === 'keen' ? ['sword'] : enh === 'charged' ? ['bolt'] : enh === 'spiked' ? ['shield'] : ['sword', 'bolt', 'shield'];
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      for (const symbol of symbols) {
        const taken = p.gilded.some((g) => g.reel === reel && g.symbol === symbol);
        if ((s[symbol] ?? 0) > 0 && !taken) options.push({ kind: 'gild', enh, symbol, reel });
      }
    });
    return options.length ? rng.pick(options) : null;
  };
  /** WILD: turn a shield (or rock) on a reel into a WILD. */
  const wildCard = (): DraftOption | null => {
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      const gildedShield = p.gilded.some((g) => g.reel === reel && g.symbol === 'shield');
      if ((s.rock ?? 0) > 0) options.push({ kind: 'swap', from: 'rock', to: 'wild', count: Math.min(RUN.wildCount, s.rock ?? 0), reel });
      else if ((s.shield ?? 0) > RUN.wildCount && !gildedShield) options.push({ kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  const hpCard = (): DraftOption => (p.hp < p.maxHp * 0.75 ? { kind: 'heal', amount: RUN.healCard } : { kind: 'maxHp', amount: RUN.maxHpCard });
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter(
      (r) => !p.relics.includes(r) && !COUNTER_RELICS.has(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && !out.some((o) => o.kind === 'relic' && o.relic === r),
    );
    return pool.length ? { kind: 'relic', relic: rng.pick(pool) } : null;
  };
  /** PREP: a counter relic for an enemy on the very next fight/fork. */
  const prepCard = (): DraftOption | null => {
    const next = run.paths[run.depth] ?? [];
    const counters = next.map((e) => COUNTERS[e.archetype]).filter((r): r is RelicId => !!r && !p.relics.includes(r));
    return counters.length ? { kind: 'relic', relic: rng.pick(counters) } : null;
  };

  if (isRelicDraft(run)) {
    push(relicCard());
    push(relicCard());
    push(rng.next() < 0.5 ? hpCard() : swapCard() ?? hpCard());
  } else {
    push(gildCard() ?? swapCard());
    const r = rng.next();
    push((r < 0.35 ? wildCard() : r < 0.65 ? swapCard() : null) ?? clearCard() ?? gildCard() ?? addCard());
    push((rng.next() < 0.6 ? prepCard() : null) ?? hpCard());
  }
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 30) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : { kind: 'maxHp', amount: RUN.maxHpCard });
  return out;
}

export function applyOption(run: RunState, o: DraftOption, asPick = true): void {
  const p = run.player;
  switch (o.kind) {
    case 'add':
      p.strips[o.reel][o.symbol] = (p.strips[o.reel][o.symbol] ?? 0) + (o.count ?? 1);
      break;
    case 'swap': {
      const s = p.strips[o.reel];
      const n = Math.min(o.count, s[o.from] ?? 0);
      s[o.from] = (s[o.from] ?? 0) - n;
      s[o.to] = (s[o.to] ?? 0) + n;
      break;
    }
    case 'clear':
      p.strips[o.reel].rock = 0;
      break;
    case 'relic':
      if (!p.relics.includes(o.relic)) p.relics.push(o.relic);
      break;
    case 'gild':
      p.gilded.push({ reel: o.reel, symbol: o.symbol, enh: o.enh });
      break;
    case 'remove': {
      const n = p.strips[o.reel][o.symbol] ?? 0;
      if (n > 0) p.strips[o.reel][o.symbol] = n - 1;
      break;
    }
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + o.amount);
      break;
    case 'maxHp':
      p.maxHp += o.amount;
      p.hp += o.amount;
      break;
  }
  // A gild lasts while its symbol is on the reel.
  p.gilded = p.gilded.filter((g) => (p.strips[g.reel][g.symbol] ?? 0) > 0);
  const last = run.records.at(-1);
  if (last && asPick) last.pick = o;
}

// ---- elite spoils & the Cashier --------------------------------------------------------

export function takeSpoils(run: RunState, relic: RelicId): void {
  if (!run.pendingSpoils?.includes(relic)) return;
  if (!run.player.relics.includes(relic)) run.player.relics.push(relic);
  const last = run.records.at(-1);
  if (last) last.eliteRelic = relic;
  run.pendingSpoils = null;
}

export const isShopNow = (run: RunState) => !run.over && RUN.shopAfter.includes(run.depth);
export const rerollCost = (run: RunState) => CHIPS.rerollBase + run.shopRerolls;
/** Shield per House turn your current chips would give in the final fight. */
export const chipShield = (chips: number) => Math.floor(chips / CHIPS.stackPer);

/**
 * The Cashier's four slots: two targeted gilds, a relic, and a utility (WILDs, remove a symbol,
 * or a heal). Deterministic per run seed + depth + rerolls.
 */
export function shopOffers(run: RunState): ShopItem[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 31, 0x27d4eb2f) ^ Math.imul(run.shopRerolls + 1, 0x165667b1)) >>> 0);
  const p = run.player;
  const items: ShopItem[] = [];
  const P = CHIPS.prices;
  const add = (option: DraftOption | null, price: number) => {
    if (option && !items.some((i) => JSON.stringify(i.option) === JSON.stringify(option))) items.push({ option, price, sold: false });
  };
  const gildOptions: DraftOption[] = [];
  p.strips.forEach((s, reel) => {
    for (const [enh, syms] of [['gold', ['sword', 'bolt', 'shield']], ['keen', ['sword']], ['charged', ['bolt']], ['spiked', ['shield']]] as [Enh, SymbolId[]][])
      for (const symbol of syms)
        if ((s[symbol] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === symbol)) gildOptions.push({ kind: 'gild', enh, symbol, reel });
  });
  // Prefer extending what you already own, so builds can be finished on purpose.
  const favored = CABINETS[run.cabinet].favors;
  const extend = gildOptions.filter((o) => o.kind === 'gild' && (p.gilded.some((g) => g.enh === o.enh && g.symbol === o.symbol) || o.enh === favored));
  add(extend.length ? rng.pick(extend) : gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  add(gildOptions.length ? rng.pick(gildOptions) : null, P.gild);
  const lastShop = run.depth >= RUN.shopAfter[RUN.shopAfter.length - 1];
  const relics = (Object.keys(RELICS) as RelicId[]).filter(
    (r) => !p.relics.includes(r) && !COUNTER_RELICS.has(r) && !ELITE_ONLY.has(r) && relicFits(run, r) && !(lastShop && r === 'bandage'),
  );
  add(relics.length ? { kind: 'relic', relic: rng.pick(relics) } : null, P.relic);
  const u = rng.next();
  if (u < 0.35) {
    const reels = p.strips
      .map((s, reel) => ({ s, reel }))
      .filter(({ s, reel }) => (s.shield ?? 0) > RUN.wildCount && !p.gilded.some((g) => g.reel === reel && g.symbol === 'shield'));
    add(reels.length ? { kind: 'swap', from: 'shield', to: 'wild', count: RUN.wildCount, reel: rng.pick(reels).reel } : null, P.wild);
  } else if (u < 0.7) {
    const junk = p.strips.flatMap((s, reel) => (['rock', 'shield'] as SymbolId[]).filter((sym) => (s[sym] ?? 0) > 0).map((symbol) => ({ kind: 'remove' as const, symbol, reel })));
    add(junk.length ? (junk.find((j) => j.symbol === 'rock') ?? rng.pick(junk)) : null, P.remove);
  }
  const shelf = items.slice(0, 4);
  // HEAL is a permanent service slot (hidden at full HP): HP vs power vs hoarding is the choice.
  if (p.hp < p.maxHp) shelf.push({ option: { kind: 'heal', amount: RUN.healCard }, price: P.heal, sold: false });
  return shelf;
}

/** Build relics are only offered once you own what they amplify. */
export function relicFits(run: RunState, r: RelicId): boolean {
  const need = BUILD_ENABLER[r];
  if (!need) return true;
  if (need === 'wild') return run.player.strips.some((s) => (s.wild ?? 0) > 0);
  return run.player.gilded.some((g) => g.enh === need);
}

/** Card/shop items that extend what you're already building (for the FITS tag). */
export function fitsBuild(run: RunState, o: DraftOption): boolean {
  const p = run.player;
  const favored = CABINETS[run.cabinet].favors;
  if (o.kind === 'gild') return p.gilded.some((g) => g.enh === o.enh) || o.enh === favored;
  if (o.kind === 'relic') return !!BUILD_ENABLER[o.relic] && relicFits(run, o.relic);
  if (o.kind === 'swap' && o.to === 'wild') return p.relics.includes('prism') || (p.strips.some((s) => (s.wild ?? 0) > 0) && run.cabinet === 'joker');
  return false;
}

export function buy(run: RunState, item: ShopItem): boolean {
  if (item.sold || run.player.chips < item.price) return false;
  run.player.chips -= item.price;
  applyOption(run, item.option, false);
  item.sold = true;
  const last = run.records.at(-1);
  if (last) (last.bought ??= []).push(item.option);
  return true;
}

/** Spend chips to reroll the Cashier's shelf. Returns the new offers, or null if too poor. */
export function reroll(run: RunState): ShopItem[] | null {
  const cost = rerollCost(run);
  if (run.player.chips < cost) return null;
  run.player.chips -= cost;
  run.shopRerolls++;
  return shopOffers(run);
}

export function leaveShop(run: RunState): void {
  run.shopRerolls = 0;
}

/** Gilds after taking a card. */
export function gildsAfter(run: RunState, o: DraftOption): Gild[] {
  return o.kind === 'gild' ? [...run.player.gilded, { reel: o.reel, symbol: o.symbol, enh: o.enh }] : run.player.gilded;
}

/** Strips after taking a card (for the before/after stat line). */
export function stripsAfter(run: RunState, o: DraftOption): StripCounts[] {
  const copy: RunState = {
    ...run,
    player: { ...run.player, strips: run.player.strips.map((s) => ({ ...s })), relics: [...run.player.relics], gilded: [...run.player.gilded], chips: run.player.chips },
    records: [],
  };
  applyOption(copy, o);
  return copy.player.strips;
}

const NAME: Partial<Record<SymbolId, string>> = { sword: 'SWORD', shield: 'SHIELD', bolt: 'BOLT', rock: 'ROCK', wild: 'WILD' };
const ENH_TEXT: Record<Enh, (s: string, reel: number) => string> = {
  gold: (s, r) => `${s}S ON REEL ${r} PAY X2`,
  keen: (s, r) => `${s}S ON REEL ${r} DEAL +1 AND PIERCE SHIELDS`,
  charged: (s, r) => `${s}S ON REEL ${r} GIVE +1 ENERGY`,
  spiked: (s, r) => `${s}S ON REEL ${r} HIT BACK FOR 2 WHEN YOU ARE HIT`,
};
const plural = (s: SymbolId, n: number) => `${NAME[s] ?? s.toUpperCase()}${n > 1 ? 'S' : ''}`;

export function describeOption(o: DraftOption, run?: RunState): { title: string; text: string } {
  switch (o.kind) {
    case 'add': {
      const n = o.count ?? 1;
      return { title: `+${n} ${plural(o.symbol, n)}`, text: `ADD ${n} ${plural(o.symbol, n)} TO REEL ${o.reel + 1}` };
    }
    case 'swap':
      return { title: `${o.count} ${plural(o.from, o.count)} TO ${plural(o.to, o.count)}`, text: `ON REEL ${o.reel + 1}` };
    case 'clear':
      return { title: 'CLEAR ROCKS', text: `SMASH EVERY ROCK ON REEL ${o.reel + 1}` };
    case 'relic':
      return { title: COUNTER_RELICS.has(o.relic) ? `PREP: ${RELICS[o.relic].name}` : RELICS[o.relic].name, text: RELICS[o.relic].text };
    case 'heal':
      return { title: `HEAL ${o.amount}`, text: `RESTORE ${o.amount} HP NOW` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: `GAIN ${o.amount} MAX HP (AND HEAL IT)` };
    case 'gild': {
      let text = ENH_TEXT[o.enh](NAME[o.symbol] ?? '', o.reel + 1);
      if (o.enh === 'spiked' && run?.player.relics.includes('cactus')) text = text.replace(`FOR ${SPIKED_DAMAGE}`, `FOR ${CACTUS_DAMAGE}`);
      return { title: `${o.enh.toUpperCase()} ${NAME[o.symbol]}S`, text };
    }
    case 'remove':
      return { title: `-1 ${NAME[o.symbol]}`, text: `REMOVE A ${NAME[o.symbol]} FROM REEL ${o.reel + 1}` };
  }
}

/** Up to two "before TO after" lines for strip cards: the biggest gain, then the biggest cost. */
export function optionDeltas(run: RunState, o: DraftOption, base: GameConfig): { gain: string; loss: string } {
  if (o.kind !== 'add' && o.kind !== 'swap' && o.kind !== 'clear' && o.kind !== 'gild' && o.kind !== 'remove') return { gain: '', loss: '' };
  const a = stripStats(run.player.strips, base, run.player.relics, run.player.gilded);
  const b = stripStats(stripsAfter(run, o), base, run.player.relics, gildsAfter(run, o));
  const rows: [string, number, number][] = [
    ['ENERGY', a.energy, b.energy],
    ['DAMAGE', a.damage, b.damage],
    ['SHIELD', a.shield, b.shield],
  ];
  const fmt = ([label, from, to]: [string, number, number]) => `${label} ${from.toFixed(2)} TO ${to.toFixed(2)}`;
  const gains = rows.filter((r) => r[2] - r[1] > 0.005).sort((x, y) => y[2] - y[1] - (x[2] - x[1]));
  const losses = rows.filter((r) => r[1] - r[2] > 0.005).sort((x, y) => y[1] - y[2] - (x[1] - x[2]));
  return { gain: gains[0] ? fmt(gains[0]) : '', loss: losses[0] ? fmt(losses[0]) : '' };
}

/** One "before TO after" line for strip cards, picking the stat that moves the most. */
export function optionDelta(run: RunState, o: DraftOption, base: GameConfig): string {
  if (o.kind !== 'add' && o.kind !== 'swap' && o.kind !== 'clear') return '';
  const a = stripStats(run.player.strips, base, run.player.relics, run.player.gilded);
  const b = stripStats(stripsAfter(run, o), base, run.player.relics, gildsAfter(run, o));
  const rows: [string, number, number][] = [
    ['ENERGY', a.energy, b.energy],
    ['DAMAGE', a.damage, b.damage],
    ['SHIELD', a.shield, b.shield],
  ];
  rows.sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]));
  const [label, from, to] = rows[0];
  return `${label} ${from.toFixed(2)} TO ${to.toFixed(2)}`;
}
