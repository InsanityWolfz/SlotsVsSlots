import { cloneConfig, type Enh, type GameConfig, type Gild, type RelicId, type StripCounts, type SymbolId } from './config';
import { generateRunPaths, RUN_FIGHTS, type EnemyDef } from './enemies';
import type { Fight } from './fight';
import { BANDAGE_HEAL, COUNTER_RELICS, COUNTERS, RELICS } from './relics';
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
};

export type DraftOption =
  | { kind: 'add'; symbol: SymbolId; reel: number; count?: number }
  | { kind: 'swap'; from: SymbolId; to: SymbolId; count: number; reel: number }
  | { kind: 'clear'; symbol: 'rock'; reel: number }
  | { kind: 'relic'; relic: RelicId }
  | { kind: 'heal'; amount: number }
  | { kind: 'maxHp'; amount: number }
  | { kind: 'gild'; enh: Enh; symbol: SymbolId; reel: number };

export interface RunPlayer {
  hp: number;
  maxHp: number;
  strips: StripCounts[];
  relics: RelicId[];
  /** Gilded symbols per reel (every cell of that symbol on that reel): persist for the run. */
  gilded: Gild[];
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
  /** Relic dropped by an elite. */
  eliteRelic?: RelicId;
  pick?: DraftOption;
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
}

export function createRun(base: GameConfig, seed = Rng.randomSeed()): RunState {
  const rng = new Rng(seed);
  const paths = generateRunPaths(rng);
  return {
    seed,
    depth: 0,
    paths,
    enemies: paths.map((opts) => opts[0]),
    chosen: paths.map((opts) => opts.length === 1),
    player: { hp: RUN.startHp, maxHp: RUN.startHp, strips: base.player.strips.map((s) => ({ ...s })), relics: [], gilded: [] },
    records: [],
    over: false,
    won: false,
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
  };
  cfg.enemy = { hp: e.hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  cfg.relics = [...run.player.relics];
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
  // Elites drop a free relic.
  const beaten = currentEnemy(run);
  if (beaten.elite) {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r) && !COUNTER_RELICS.has(r));
    if (pool.length) {
      const relic = new Rng((run.seed ^ Math.imul(run.depth + 7, 0x85ebca6b)) >>> 0).pick(pool);
      run.player.relics.push(relic);
      record.eliteRelic = relic;
    }
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
        for (const g of sc.groups)
          for (const r of g.reels) {
            const enh = enhOf(r, line[r]);
            if (enh === 'gold') g.amount *= 2;
            if (enh === 'charged' && g.symbol === 'bolt') g.amount += 1;
          }
        sc.totals = {};
        for (const g of sc.groups) sc.totals[g.symbol] = (sc.totals[g.symbol] ?? 0) + g.amount;
        out.damage += p * ((sc.totals.sword ?? 0) + (relics.includes('pickaxe') ? sc.totals.rock ?? 0 : 0));
        out.energy += p * ((sc.totals.bolt ?? 0) + (relics.includes('magnet') ? sc.totals.rock ?? 0 : 0));
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
        for (const to of ['bolt', 'sword'] as SymbolId[]) options.push({ kind: 'swap', from, to, count: Math.min(RUN.swapCount, n), reel });
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
    const enh = rng.pick(['gold', 'keen', 'charged', 'spiked'] as Enh[]);
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
      if ((s.rock ?? 0) > 0) options.push({ kind: 'swap', from: 'rock', to: 'wild', count: 1, reel });
      else if ((s.shield ?? 0) > 1) options.push({ kind: 'swap', from: 'shield', to: 'wild', count: 1, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  const hpCard = (): DraftOption => (p.hp < p.maxHp * 0.75 ? { kind: 'heal', amount: RUN.healCard } : { kind: 'maxHp', amount: RUN.maxHpCard });
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !p.relics.includes(r) && !COUNTER_RELICS.has(r) && !out.some((o) => o.kind === 'relic' && o.relic === r));
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
    push((r < 0.35 ? wildCard() : r < 0.7 ? swapCard() : null) ?? clearCard() ?? addCard());
    push((rng.next() < 0.6 ? prepCard() : null) ?? hpCard());
  }
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 30) push(guard % 3 === 0 ? addCard() : guard % 3 === 1 ? swapCard() : { kind: 'maxHp', amount: RUN.maxHpCard });
  return out;
}

export function applyOption(run: RunState, o: DraftOption): void {
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
  if (last) last.pick = o;
}

/** Gilds after taking a card. */
export function gildsAfter(run: RunState, o: DraftOption): Gild[] {
  return o.kind === 'gild' ? [...run.player.gilded, { reel: o.reel, symbol: o.symbol, enh: o.enh }] : run.player.gilded;
}

/** Strips after taking a card (for the before/after stat line). */
export function stripsAfter(run: RunState, o: DraftOption): StripCounts[] {
  const copy: RunState = {
    ...run,
    player: { ...run.player, strips: run.player.strips.map((s) => ({ ...s })), relics: [...run.player.relics], gilded: [...run.player.gilded] },
    records: [],
  };
  applyOption(copy, o);
  return copy.player.strips;
}

const NAME: Partial<Record<SymbolId, string>> = { sword: 'SWORD', shield: 'SHIELD', bolt: 'BOLT', rock: 'ROCK', wild: 'WILD' };
const ENH_TEXT: Record<Enh, (s: string, reel: number) => string> = {
  gold: (s, r) => `${s}S ON REEL ${r} PAY X2`,
  keen: (s, r) => `${s}S ON REEL ${r} PIERCE SHIELDS`,
  charged: (s, r) => `${s}S ON REEL ${r} GIVE +1 ENERGY`,
  spiked: (s, r) => `${s}S ON REEL ${r} HIT BACK FOR 2 WHEN YOU ARE HIT`,
};
const plural = (s: SymbolId, n: number) => `${NAME[s] ?? s.toUpperCase()}${n > 1 ? 'S' : ''}`;

export function describeOption(o: DraftOption): { title: string; text: string } {
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
    case 'gild':
      return { title: `${o.enh.toUpperCase()} ${NAME[o.symbol]}S`, text: ENH_TEXT[o.enh](NAME[o.symbol] ?? '', o.reel + 1) };
  }
}

/** Up to two "before TO after" lines for strip cards: the biggest gain, then the biggest cost. */
export function optionDeltas(run: RunState, o: DraftOption, base: GameConfig): { gain: string; loss: string } {
  if (o.kind !== 'add' && o.kind !== 'swap' && o.kind !== 'clear' && o.kind !== 'gild') return { gain: '', loss: '' };
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
