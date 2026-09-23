// Headless balance runner.
//   npm run sim                → single-fight variants
//   npm run sim -- --runs 2000 → full-run sim (5 fights + boss) with draft policies
import { defaultConfig, type GameConfig } from '../core/config';
import { formatSummary, simulate } from './simulate';
import { formatRunSummary, simulateRuns } from './simulateRun';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const runs = arg('runs', 0);
if (runs > 0) {
  for (const policy of ['greedy', 'relic', 'random'] as const) {
    console.log(`\n=== ${runs} runs, ${policy} drafting ===`);
    console.log(formatRunSummary(simulateRuns(defaultConfig(), runs, policy, 4242)));
  }
} else {
  const n = arg('n', 20000);
  const base = defaultConfig();
  base.player.hp = arg('php', base.player.hp);
  base.enemy.hp = arg('ehp', base.enemy.hp);

  const variants: [string, (c: GameConfig) => void][] = [
    ['current config', () => {}],
    ['20 / 20 HP', (c) => (c.enemy.hp = 20)],
    ['special hits shield', (c) => (c.specialIgnoresShield = false)],
    ['shields never reset', (c) => (c.shieldReset = 'never')],
    ['any-two pair rule', (c) => (c.pairRule = 'anyTwo')],
  ];

  console.log(`${n} fights per row, player ${base.player.hp} HP / enemy ${base.enemy.hp} HP\n`);
  for (const [name, mutate] of variants) {
    const cfg: GameConfig = JSON.parse(JSON.stringify(base));
    mutate(cfg);
    console.log(`${name.padEnd(24)} ${formatSummary(simulate(cfg, n, 12345))}`);
  }
}
