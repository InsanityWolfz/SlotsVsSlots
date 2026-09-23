import { cloneConfig, type GameConfig, type RelicId, type StripCounts, type SymbolId } from './config';
import { generateRunEnemies, RUN_FIGHTS, type EnemyDef } from './enemies';
import type { Fight } from './fight';
import { BANDAGE_HEAL, RELICS } from './relics';
import { Rng } from './rng';
import { stripCounts } from './strip';

/** Run-level tunables. */
export const RUN = {
  startHp: 32,
  /** Fraction of max HP restored after every won fight. */
  postFightHeal: 0.4,
  healCard: 12,
  maxHpCard: 6,
  /** A strip can't be thinned below this many cells. */
  minStrip: 6,
  draftSize: 3,
};

export type DraftOption =
  | { kind: 'add'; symbol: SymbolId; reel: number }
  | { kind: 'remove'; symbol: SymbolId; reel: number }
  | { kind: 'relic'; relic: RelicId }
  | { kind: 'heal'; amount: number }
  | { kind: 'maxHp'; amount: number };

export interface RunPlayer {
  hp: number;
  maxHp: number;
  strips: StripCounts[];
  relics: RelicId[];
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
  pick?: DraftOption;
}

export interface RunState {
  seed: number;
  /** Index of the next fight (0..5; 5 = boss). */
  depth: number;
  enemies: EnemyDef[];
  player: RunPlayer;
  records: FightRecord[];
  over: boolean;
  won: boolean;
}

export function createRun(base: GameConfig, seed = Rng.randomSeed()): RunState {
  const rng = new Rng(seed);
  return {
    seed,
    depth: 0,
    enemies: generateRunEnemies(rng),
    player: { hp: RUN.startHp, maxHp: RUN.startHp, strips: base.player.strips.map((s) => ({ ...s })), relics: [] },
    records: [],
    over: false,
    won: false,
  };
}

export const currentEnemy = (run: RunState): EnemyDef => run.enemies[Math.min(run.depth, run.enemies.length - 1)];
export const isBossNext = (run: RunState) => run.depth >= RUN_FIGHTS;

/** The GameConfig for the run's next fight. */
export function fightConfig(run: RunState, base: GameConfig): GameConfig {
  const cfg = cloneConfig(base);
  const e = currentEnemy(run);
  cfg.player = { ...cfg.player, hp: run.player.maxHp, startHp: run.player.hp, strips: run.player.strips.map((s) => ({ ...s })) };
  cfg.enemy = { hp: e.hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  cfg.relics = [...run.player.relics];
  cfg.seed = null;
  return cfg;
}

/** Fold a finished fight back into the run: HP carry-over, persistent rocks, healing. */
export function finishFight(run: RunState, fight: Fight): FightRecord {
  const p = fight.sides.player;
  const won = fight.winner === 'player';
  const before = run.player.hp;
  const oldRocks = run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
  // Rocks are real cells: whatever the golem buried you in, you keep.
  run.player.strips = p.reels.map((r) => stripCounts(r));
  const rocksAdded = run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0) - oldRocks;
  const record: FightRecord = {
    depth: run.depth,
    enemy: currentEnemy(run).name ?? '?',
    archetype: currentEnemy(run).archetype,
    won,
    turns: fight.turn,
    hpBefore: before,
    hpAfter: p.hp,
    rocksAdded,
  };
  run.records.push(record);
  if (!won) {
    run.player.hp = 0;
    run.over = true;
    return record;
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

const stripLen = (s: StripCounts) => Object.values(s).reduce((a, n) => a + (n ?? 0), 0);

function keyOf(o: DraftOption): string {
  return JSON.stringify(o);
}

/** Three reward cards after a won fight. Deterministic per run seed + depth. */
export function draftOffers(run: RunState): DraftOption[] {
  const rng = new Rng((run.seed ^ Math.imul(run.depth + 1, 0x9e3779b1)) >>> 0);
  const p = run.player;
  const out: DraftOption[] = [];
  const push = (o: DraftOption | null) => {
    if (o && !out.some((x) => keyOf(x) === keyOf(o))) out.push(o);
  };

  const addCard = (): DraftOption => {
    const r = rng.next();
    const symbol: SymbolId = r < 0.45 ? 'sword' : r < 0.8 ? 'bolt' : 'shield';
    return { kind: 'add', symbol, reel: rng.int(3) };
  };
  const removeCard = (): DraftOption | null => {
    // Rocks first — digging out the golem's junk is always on offer when it matters.
    const rocky = p.strips.map((s, reel) => ({ reel, n: s.rock ?? 0 })).filter((x) => x.n > 0);
    if (rocky.length && rng.next() < 0.7) {
      rocky.sort((a, b) => b.n - a.n);
      return { kind: 'remove', symbol: 'rock', reel: rocky[0].reel };
    }
    const options: DraftOption[] = [];
    p.strips.forEach((s, reel) => {
      if (stripLen(s) <= RUN.minStrip) return;
      for (const [sym, n] of Object.entries(s) as [SymbolId, number][]) if (n > 0) options.push({ kind: 'remove', symbol: sym, reel });
    });
    return options.length ? rng.pick(options) : null;
  };
  const relicCard = (): DraftOption | null => {
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !p.relics.includes(r));
    return pool.length ? { kind: 'relic', relic: rng.pick(pool) } : null;
  };

  push(addCard());
  push(relicCard() ?? { kind: 'maxHp', amount: RUN.maxHpCard });
  const third = rng.next();
  if (p.hp < p.maxHp * 0.6 && third < 0.5) push({ kind: 'heal', amount: RUN.healCard });
  else if (third < 0.8) push(removeCard());
  else push({ kind: 'maxHp', amount: RUN.maxHpCard });
  let guard = 0;
  while (out.length < RUN.draftSize && guard++ < 20) push(guard % 2 ? removeCard() : addCard());
  return out;
}

export function applyOption(run: RunState, o: DraftOption): void {
  const p = run.player;
  switch (o.kind) {
    case 'add':
      p.strips[o.reel][o.symbol] = (p.strips[o.reel][o.symbol] ?? 0) + 1;
      break;
    case 'remove': {
      const n = p.strips[o.reel][o.symbol] ?? 0;
      if (n > 0) p.strips[o.reel][o.symbol] = n - 1;
      break;
    }
    case 'relic':
      if (!p.relics.includes(o.relic)) p.relics.push(o.relic);
      break;
    case 'heal':
      p.hp = Math.min(p.maxHp, p.hp + o.amount);
      break;
    case 'maxHp':
      p.maxHp += o.amount;
      p.hp += o.amount;
      break;
  }
  const last = run.records.at(-1);
  if (last) last.pick = o;
}

export function describeOption(o: DraftOption): { title: string; text: string } {
  switch (o.kind) {
    case 'add':
      return { title: `+1 ${o.symbol.toUpperCase()}`, text: `ADD A ${o.symbol.toUpperCase()} TO REEL ${o.reel + 1}` };
    case 'remove':
      return { title: `-1 ${o.symbol.toUpperCase()}`, text: `REMOVE A ${o.symbol.toUpperCase()} FROM REEL ${o.reel + 1}` };
    case 'relic':
      return { title: RELICS[o.relic].name, text: RELICS[o.relic].text };
    case 'heal':
      return { title: `HEAL ${o.amount}`, text: `RESTORE ${o.amount} HP NOW` };
    case 'maxHp':
      return { title: `+${o.amount} MAX HP`, text: `GAIN ${o.amount} MAX HP (AND HEAL IT)` };
  }
}
