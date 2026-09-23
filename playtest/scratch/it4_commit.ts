// Commit vs spread, controlled. npx tsx playtest/scratch/it4_commit.ts [runs]
import { CHIPS, DRAFTS, FORKS, playRun4, Rng, SHOPS, TUNE4, type Run4 } from './it4_lib';
const N = Number(process.argv[2] ?? 3000);
const base = JSON.parse(JSON.stringify(CHIPS));
for (const [vn, fn] of [['current', () => {}], ['E stackPer 8, start 4', () => { CHIPS.stackPer = 8; TUNE4.startChips = 4; }]] as [string, () => void][]) {
  Object.assign(CHIPS, JSON.parse(JSON.stringify(base))); TUNE4.startChips = 0; fn();
  for (const [d, s] of [['greedy', 'smart'], ['commit', 'commitSmart'], ['spread', 'spreadSmart'], ['commit', 'smart'], ['spread', 'smart'], ['gildFirst', 'smart'], ['neverGild', 'smart']]) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    const rs: Run4[] = [];
    for (let i = 0; i < N; i++) rs.push(playRun4(seeds.int(0xffffffff), DRAFTS[d], FORKS.sim, SHOPS[s], pr, fr));
    const reach = rs.filter((r) => r.hpIntoBoss >= 0);
    const maxSame = (r: Run4) => { const c: Record<string, number> = {}; r.gildsEnd.forEach((e) => (c[e] = (c[e] ?? 0) + 1)); return Math.max(0, ...Object.values(c)); };
    const br: Record<string, number> = {}; for (const r of rs) for (const x of r.relics) if (['midas', 'rod', 'cactus', 'prism', 'hone'].includes(x)) br[x] = (br[x] ?? 0) + 1;
    console.log(`${vn.padEnd(22)} ${(d + '/' + s).padEnd(22)} win ${(100 * rs.filter((r) => r.won).length / N).toFixed(1)}%  boss ${(100 * reach.filter((r) => r.won).length / reach.length).toFixed(0)}%  gilds ${(rs.reduce((a, r) => a + r.gildsEnd.length, 0) / N).toFixed(2)}  maxSameEnh@boss ${(reach.reduce((a, r) => a + maxSame(r), 0) / reach.length).toFixed(2)}  3-of-a-kind ${(100 * reach.filter((r) => maxSame(r) >= 3).length / reach.length).toFixed(0)}%  buildRelics/run ${(Object.values(br).reduce((a, b) => a + b, 0) / N).toFixed(2)}`);
  }
}
