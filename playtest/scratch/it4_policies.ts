// Policy grid (draft x fork x shop). npx tsx playtest/scratch/it4_policies.ts [runs] [draft/fork/shop]
import { DRAFTS, FORKS, playRun4, Rng, SHOPS, type Run4 } from './it4_lib';
const N = Number(process.argv[2] ?? 3000);
const only = process.argv[3];
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const grid: string[] = only ? [only] : [
  'greedy/sim/simGreedy', 'greedy/sim/never', 'greedy/sim/spendAll', 'greedy/sim/cheapFirst', 'greedy/sim/relicsOnly', 'greedy/sim/gildsOnly',
  'greedy/sim/hoardLast', 'greedy/sim/interest', 'greedy/sim/commit', 'greedy/sim/commitNoReroll', 'greedy/sim/spread', 'greedy/sim/rerollGreedy', 'greedy/sim/random',
  'commit/sim/commit', 'spread/sim/spread', 'commit/sim/commitNoReroll', 'commit/sim/never',
  'greedy/safe/simGreedy', 'greedy/elite/simGreedy', 'greedy/eliteIfHealthy/simGreedy', 'greedy/random/simGreedy',
  'hpFirst/sim/simGreedy', 'gildFirst/sim/simGreedy', 'relicFirst/sim/simGreedy', 'neverGild/sim/simGreedy', 'random/random/random', 'random/random/never', 'random/sim/simGreedy',
];
for (const g of grid) {
  const [d, f, s] = g.split('/');
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  const rs: Run4[] = [];
  for (let i = 0; i < N; i++) rs.push(playRun4(seeds.int(0xffffffff), DRAFTS[d], FORKS[f], SHOPS[s], pr, fr));
  const deaths = Array(6).fill(0); rs.forEach((r) => r.deathDepth >= 0 && deaths[r.deathDepth]++);
  const reach = rs.filter((r) => r.hpIntoBoss >= 0);
  const boss = reach.filter((r) => r.won).length;
  const elite = rs.flatMap((r) => r.forks); 
  console.log(`${g.padEnd(32)} win ${pct(rs.filter((r) => r.won).length, N).padStart(5)}%  d ${deaths.map((x) => pct(x, N)).join('/')}  boss ${pct(boss, reach.length)}%  hpIn ${(100 * avg(reach.map((r) => r.hpIntoBoss))).toFixed(0)}%  chipsIn ${avg(reach.map((r) => r.chipsIntoBoss)).toFixed(1)} stack ${avg(reach.map((r) => r.stackIntoBoss)).toFixed(2)}  earned ${avg(rs.map((r) => r.chipsEarned)).toFixed(1)}  buys ${avg(rs.map((r) => r.bought.length)).toFixed(2)} rr ${avg(rs.map((r) => r.rerolls)).toFixed(2)}  elite ${pct(elite.filter((e) => e.elite).length, elite.length)}%  gilds ${avg(rs.map((r) => r.gildsEnd.length)).toFixed(2)} relics ${avg(rs.map((r) => r.relics.length)).toFixed(2)}`);
}
