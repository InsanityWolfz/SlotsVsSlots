// Rock aftermath: run win% by whether/when the golem appears, and rocks carried into the boss.
import { POLICIES, playRun, Rng } from './it1_lib';

const N = Number(process.argv[2] ?? 6000);
for (const pol of ['greedy', 'relicFirst'] as const) {
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  const g: Record<string, [number, number]> = {};
  const rockBuckets: Record<string, [number, number]> = {};
  for (let i = 0; i < N; i++) {
    const r = playRun(seeds.int(0xffffffff), POLICIES[pol], pr, fr);
    const gi = r.fights.findIndex((f) => f.arch === 'golem');
    const key = gi < 0 ? 'no golem met' : `golem at F${gi + 1}`;
    const e = (g[key] ??= [0, 0]); e[0]++; if (r.won) e[1]++;
    // rocks going into boss: approximate from rocks added minus rock removals picked
    const boss = r.fights.find((f) => f.arch === 'house');
    if (boss) {
      const added = r.fights.filter((f) => f.arch !== 'house').reduce((a, f) => a + f.rocks, 0);
      const removed = r.picks.filter((p) => p.kind === 'remove' && p.symbol === 'rock').length;
      const rocks = added - removed;
      const b = rocks <= 0 ? '0' : rocks <= 5 ? '1-5' : rocks <= 10 ? '6-10' : rocks <= 15 ? '11-15' : '16+';
      const e2 = (rockBuckets[b] ??= [0, 0]); e2[0]++; if (boss.won) e2[1]++;
    }
  }
  console.log(`${pol}: run win by golem timing: ${Object.entries(g).sort().map(([k, [n, w]]) => `${k} ${(100 * w / n).toFixed(0)}% (n${n})`).join(' | ')}`);
  console.log(`   boss win by rocks carried in: ${['0', '1-5', '6-10', '11-15', '16+'].map((k) => rockBuckets[k] ? `${k}: ${(100 * rockBuckets[k][1] / rockBuckets[k][0]).toFixed(0)}% (n${rockBuckets[k][0]})` : '').join(' | ')}`);
}
