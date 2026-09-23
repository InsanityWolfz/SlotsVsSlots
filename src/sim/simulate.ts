import type { GameConfig } from '../core/config';
import { Fight } from '../core/fight';
import { Rng } from '../core/rng';
import { StatsTracker } from '../core/stats';

export interface SimSummary {
  fights: number;
  playerWinPct: number;
  avgRounds: number;
  p10Rounds: number;
  p90Rounds: number;
  avgSpecials: number;
  avgSlimed: number;
  avgCleanses: number;
  avgPlayerDamage: number;
  avgEnemyDamage: number;
  stalemates: number;
}

const MAX_TURNS = 1000;

/** Runs the real rules engine headless. Shared by `npm run sim` and the in-game tuning panel. */
export function simulate(cfg: GameConfig, fights: number, seed = Rng.randomSeed()): SimSummary {
  const seeds = new Rng(seed);
  const rounds: number[] = [];
  let wins = 0;
  let specials = 0;
  let slimed = 0;
  let cleanses = 0;
  let pDmg = 0;
  let eDmg = 0;
  let stalemates = 0;

  for (let i = 0; i < fights; i++) {
    const fight = new Fight(cfg, seeds.int(0xffffffff));
    const tracker = new StatsTracker(fight);
    while (!fight.over && fight.turn < MAX_TURNS) tracker.record(fight.step().events);
    if (!fight.over) stalemates++;
    const s = tracker.stats;
    if (s.winner === 'player') wins++;
    rounds.push(Math.ceil(s.turns / 2));
    specials += s.sides.player.specials;
    slimed += s.sides.enemy.slimeApplied;
    cleanses += s.sides.player.cleanses;
    pDmg += s.sides.player.damageDealt;
    eDmg += s.sides.enemy.damageDealt;
  }

  rounds.sort((a, b) => a - b);
  const avg = (x: number) => x / fights;
  return {
    fights,
    playerWinPct: (100 * wins) / fights,
    avgRounds: avg(rounds.reduce((a, b) => a + b, 0)),
    p10Rounds: rounds[Math.floor(fights * 0.1)],
    p90Rounds: rounds[Math.floor(fights * 0.9)],
    avgSpecials: avg(specials),
    avgSlimed: avg(slimed),
    avgCleanses: avg(cleanses),
    avgPlayerDamage: avg(pDmg),
    avgEnemyDamage: avg(eDmg),
    stalemates,
  };
}

export function formatSummary(s: SimSummary): string {
  return (
    `win ${s.playerWinPct.toFixed(0)}%  rounds ${s.avgRounds.toFixed(1)} (p10 ${s.p10Rounds}, p90 ${s.p90Rounds})  ` +
    `specials ${s.avgSpecials.toFixed(1)}  slimed ${s.avgSlimed.toFixed(1)}  cleanses ${s.avgCleanses.toFixed(2)}` +
    (s.stalemates ? `  STALEMATES ${s.stalemates}` : '')
  );
}
