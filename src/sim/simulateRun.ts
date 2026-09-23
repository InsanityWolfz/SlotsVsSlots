import type { GameConfig, RelicId } from '../core/config';
import { RUN_FIGHTS } from '../core/enemies';
import { Fight } from '../core/fight';
import { Rng } from '../core/rng';
import { applyOption, createRun, draftOffers, finishFight, fightConfig, type DraftOption, type RunState } from '../core/run';

export type DraftPolicy = 'greedy' | 'random';

const RELIC_VALUE: Record<RelicId, number> = {
  whetstone: 8,
  mirror: 8,
  clover: 7,
  fang: 6,
  battery: 6,
  bandage: 6,
  hourglass: 5,
  soap: 4,
  magnet: 3,
};

/** A reasonable human-ish drafter: patch HP when low, dig out rocks, stack swords on reels 1-2. */
export function greedyValue(run: RunState, o: DraftOption): number {
  const p = run.player;
  switch (o.kind) {
    case 'relic': {
      const rocks = p.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
      return o.relic === 'magnet' && rocks > 0 ? 6 : RELIC_VALUE[o.relic];
    }
    case 'heal':
      return (1 - p.hp / p.maxHp) * 16;
    case 'maxHp':
      return 4;
    case 'add':
      return o.symbol === 'sword' ? (o.reel < 2 ? 6 : 4) : o.symbol === 'bolt' ? 5 : 2;
    case 'remove':
      return o.symbol === 'rock' ? 9 : o.symbol === 'shield' ? 5 : o.symbol === 'bolt' ? 1 : 0;
  }
}

export interface RunSummary {
  runs: number;
  winPct: number;
  /** % of runs that died at each depth (index 5 = boss). */
  deathsAtDepth: number[];
  /** Deaths per archetype / fights against that archetype. */
  killRate: Record<string, string>;
  avgTurnsPerFight: number;
  avgHpIntoBoss: number;
  reachedBossPct: number;
  bossWinPct: number;
  relicWin: Record<string, string>;
  avgRocksAtEnd: number;
}

export function simulateRuns(base: GameConfig, runs: number, policy: DraftPolicy, seed = Rng.randomSeed()): RunSummary {
  const seeds = new Rng(seed);
  const pick = new Rng(seed ^ 0x5eed);
  let wins = 0;
  const deaths = Array(RUN_FIGHTS + 1).fill(0);
  const faced: Record<string, number> = {};
  const killed: Record<string, number> = {};
  let fights = 0;
  let turns = 0;
  let bossHp = 0;
  let reachedBoss = 0;
  let bossWins = 0;
  let rocks = 0;
  const relicRuns: Record<string, [number, number]> = {};

  for (let i = 0; i < runs; i++) {
    const run = createRun(base, seeds.int(0xffffffff));
    while (!run.over) {
      if (run.depth === RUN_FIGHTS) {
        reachedBoss++;
        bossHp += run.player.hp;
      }
      const arch = run.enemies[run.depth].archetype;
      faced[arch] = (faced[arch] ?? 0) + 1;
      const fight = new Fight(fightConfig(run, base), seeds.int(0xffffffff));
      while (!fight.over && fight.turn < 2000) fight.step();
      fights++;
      turns += fight.turn;
      const depth = run.depth;
      finishFight(run, fight);
      if (run.over && !run.won) {
        deaths[depth]++;
        killed[arch] = (killed[arch] ?? 0) + 1;
      }
      if (run.won) bossWins++;
      if (!run.over) {
        const offers = draftOffers(run);
        const o = policy === 'random' ? pick.pick(offers) : offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a));
        applyOption(run, o);
      }
    }
    if (run.won) wins++;
    rocks += run.player.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
    for (const r of run.player.relics) {
      const e = (relicRuns[r] ??= [0, 0]);
      e[0]++;
      if (run.won) e[1]++;
    }
  }

  const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(0)}%` : '-');
  return {
    runs,
    winPct: (100 * wins) / runs,
    deathsAtDepth: deaths.map((d) => (100 * d) / runs),
    killRate: Object.fromEntries(Object.keys(faced).map((k) => [k, `${pct(killed[k] ?? 0, faced[k])} of ${faced[k]}`])),
    avgTurnsPerFight: turns / fights,
    avgHpIntoBoss: reachedBoss ? bossHp / reachedBoss : 0,
    reachedBossPct: (100 * reachedBoss) / runs,
    bossWinPct: reachedBoss ? (100 * bossWins) / reachedBoss : 0,
    relicWin: Object.fromEntries(Object.entries(relicRuns).map(([k, [n, w]]) => [k, `${pct(w, n)} win (${n} runs)`])),
    avgRocksAtEnd: rocks / runs,
  };
}

export function formatRunSummary(s: RunSummary): string {
  return [
    `run win ${s.winPct.toFixed(1)}%  reached boss ${s.reachedBossPct.toFixed(0)}%  boss win ${s.bossWinPct.toFixed(0)}%  hp into boss ${s.avgHpIntoBoss.toFixed(1)}`,
    `turns/fight ${s.avgTurnsPerFight.toFixed(1)}  rocks at end ${s.avgRocksAtEnd.toFixed(1)}`,
    `deaths by depth: ${s.deathsAtDepth.map((d, i) => `${i === 5 ? 'boss' : `F${i + 1}`} ${d.toFixed(0)}%`).join('  ')}`,
    `kill rate by enemy: ${Object.entries(s.killRate).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
    `relics: ${Object.entries(s.relicWin).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
  ].join('\n');
}
