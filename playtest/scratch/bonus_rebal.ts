// Re-balance around the bonuses (greedy, all slot machines).  npx tsx playtest/scratch/bonus_rebal.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { DEPTH_HP, TUNE } from '../../src/core/enemies';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 800);
const D0 = [...DEPTH_HP];
const V: [string, number, number, number][] = [['as is', 1, 1, 74], ['hp x1.06 / act2 x1.06 / house 80', 1.06, 1.06, 80], ['hp x1.1 / act2 x1.1 / house 84', 1.1, 1.1, 84]];
for (const [name, a1, a2, house] of V) {
  D0.forEach((h, i) => (DEPTH_HP[i] = Math.round(h * a1)));
  TUNE.act2Mul = a2;
  TUNE.bossHp = house;
  const rows = CABINET_ORDER.map((c) => {
    const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, c);
    return `${c} ${s.act1Pct.toFixed(0)}/${s.winPct.toFixed(0)}`;
  });
  const r = simulateRuns(defaultConfig(), N, 'random', 4242, 'knight');
  console.log(`${name.padEnd(34)} act1/win: ${rows.join('  ')}  | knight random ${r.act1Pct.toFixed(0)}/${r.winPct.toFixed(0)}`);
}
