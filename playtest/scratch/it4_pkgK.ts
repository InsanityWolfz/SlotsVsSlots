// Package K candidate check. npx tsx playtest/scratch/it4_pkgK.ts [runs]
import { CHIPS, DRAFTS, FORKS, playRun4, Rng, SHOPS, TUNE4, type Run4 } from './it4_lib';
import { TUNE } from '../../src/core/enemies';
const N = Number(process.argv[2] ?? 3000);
const base = JSON.parse(JSON.stringify(CHIPS)); const bossHp = TUNE.bossHp;
const pct = (a: number, b: number) => (100 * a / Math.max(1, b)).toFixed(1);
for (const [vn, fn] of [['current', () => {}], ['K: stackPer 8, start 4, boss 70', () => { CHIPS.stackPer = 8; TUNE4.startChips = 4; TUNE.bossHp = 70; }]] as [string, () => void][]) {
  Object.assign(CHIPS, JSON.parse(JSON.stringify(base))); TUNE4.startChips = 0; TUNE.bossHp = bossHp; fn();
  for (const g of ['greedy/sim/smart', 'greedy/sim/never', 'greedy/sim/healOnly', 'greedy/sim/spendAll', 'greedy/sim/simGreedy', 'greedy/safe/smart', 'greedy/elite/smart', 'greedy/eliteIfHealthy/smart', 'commit/sim/commitSmart', 'spread/sim/spreadSmart', 'hpFirst/sim/smart', 'random/random/random']) {
    const [d, f, s] = g.split('/');
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    const rs: Run4[] = []; for (let i = 0; i < N; i++) rs.push(playRun4(seeds.int(0xffffffff), DRAFTS[d], FORKS[f], SHOPS[s], pr, fr));
    const deaths = Array(6).fill(0); rs.forEach((r) => r.deathDepth >= 0 && deaths[r.deathDepth]++);
    const reach = rs.filter((r) => r.hpIntoBoss >= 0);
    console.log(`${vn.padEnd(32)} ${g.padEnd(28)} win ${pct(rs.filter((r) => r.won).length, N).padStart(5)}  deaths ${deaths.map((x) => pct(x, N)).join('/')}  boss ${pct(reach.filter((r) => r.won).length, reach.length)}  chipsIn ${(reach.reduce((a, r) => a + r.chipsIntoBoss, 0) / Math.max(1, reach.length)).toFixed(1)} buys ${(rs.reduce((a, r) => a + r.bought.length, 0) / N).toFixed(2)}`);
  }
}
