import type { GameConfig, RelicId } from '../core/config';
import { RUN_FIGHTS } from '../core/enemies';
import { Fight } from '../core/fight';
import { Rng } from '../core/rng';
import { applyOption, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, needsChoice, type DraftOption, type RunState } from '../core/run';

export type DraftPolicy = 'greedy' | 'random' | 'relic';

const RELIC_VALUE: Record<RelicId, number> = {
  mirror: 10,
  battery: 9.5,
  fang: 9,
  whetstone: 8,
  clover: 7.5,
  dice: 7,
  hourglass: 6.5,
  bandage: 6,
  soap: 5,
  mittens: 5,
  lockpick: 5,
  mousetrap: 5,
  magnet: 3,
  pickaxe: 3,
  crown: 9,
};

/** Rough per-archetype danger for picking at forks (playtest ITERATION_1 kill rates). */
const DANGER: Record<string, number> = { slime: 3, frost: 6, golem: 5, thief: 11, gremlin: 15, brute: 15 };
const COUNTER: Record<string, RelicId> = { frost: 'mittens', gremlin: 'lockpick', thief: 'mousetrap', golem: 'pickaxe' };

/** A reasonable human-ish drafter, tuned against rollout values from playtest ITERATION_1. */
export function greedyValue(run: RunState, o: DraftOption): number {
  const p = run.player;
  const rocks = p.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
  switch (o.kind) {
    case 'relic': {
      if ((o.relic === 'magnet' || o.relic === 'pickaxe') && rocks > 0) return 7 + rocks * 0.3;
      const countered = Object.entries(COUNTER).find(([, r]) => r === o.relic)?.[0];
      if (countered) return (run.paths[run.depth] ?? []).some((e) => e.archetype === countered) ? 7 : 2;
      return RELIC_VALUE[o.relic];
    }
    case 'heal':
      return (1 - p.hp / p.maxHp) * 14;
    case 'maxHp':
      return 3.5;
    case 'swap':
      if (o.to === 'wild') return 6;
      return (o.to === 'bolt' ? 8 : 6) + (o.from === 'rock' ? 2 : 0);
    case 'gild':
      return o.enh === 'gold' ? 9 : o.enh === 'charged' ? 8.5 : o.enh === 'spiked' ? 7.5 : 6;
    case 'clear':
      return 3 + (p.strips[o.reel].rock ?? 0) * 2;
    case 'add':
      return o.symbol === 'bolt' ? 6 : 2;
  }
}

function pickEnemy(run: RunState, policy: DraftPolicy, rng: Rng): number {
  const opts = run.paths[run.depth];
  if (policy === 'random') return rng.int(opts.length);
  const score = (i: number) => {
    const a = opts[i].archetype;
    const countered = COUNTER[a] && run.player.relics.includes(COUNTER[a]);
    // Elites are tougher but pay a relic: take them when healthy.
    const eliteBonus = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
    return (DANGER[a] ?? 8) * (countered ? 0.4 : 1) * (opts[i].elite ? 1.25 : 1) + eliteBonus;
  };
  return opts.map((_, i) => i).reduce((best, i) => (score(i) < score(best) ? i : best), 0);
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
      if (needsChoice(run)) chooseEnemy(run, pickEnemy(run, policy, pick));
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
        const relic = offers.find((x) => x.kind === 'relic');
        const o =
          policy === 'random'
            ? pick.pick(offers)
            : policy === 'relic' && relic
              ? relic
              : offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a));
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
