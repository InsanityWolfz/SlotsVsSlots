// RED stake diagnostics: does the counter actually get fought, and what does it cost? Identical B1
// snapshots taken at stake 0 vs stake 1 (RED is applied at the act transition).   npx tsx it10_red.ts [N]
import { counterFor } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, pct, playRun, Rng, snapshotsAt, type Policy } from './it10_lib';
const N = Number(process.argv[2] ?? 1500);
const P = (fork: string): Policy => ({ draft: 'commit', fork, shop: 'commit', legend: 'value' });
console.log('RED: counter class at the act transition; forks offering it; fights vs it; act 2 clear by fork policy');
for (const cab of CABINET_ORDER) {
  const s0 = snapshotsAt(cab, N, 777, undefined, 0), s1 = snapshotsAt(cab, N, 777, undefined, 1);
  const cls: Record<string, number> = {};
  s1.forEach((r) => { const k = counterFor(r) ?? 'none'; cls[k] = (cls[k] ?? 0) + 1; });
  const offers = (ss: any[]) => avg(ss.map((r) => { const c = counterFor(r); return r.paths.filter((o: any[]) => o.length > 1 && o.some((e) => e.archetype === c)).length; }));
  const res: Record<string, any[]> = {};
  const snaps: Record<string, any[]> = { w: s0, r: s1 };
  for (const k of ['w', 'r']) for (const f of ['greedy', 'dodge', 'face']) res[k + f] = snaps[k].map((s, i) => playRun(0, s.cabinet, P(f), new Rng(20000 + i), cloneRun(s)));
  const clr = (k: string) => pct(res[k].filter((r) => r.won).length, res[k].length);
  const vs = (k: string) => avg(res[k].map((r, i) => { const c = counterFor(snaps[k[0]][i]); return r.fights.filter((f: any) => f.act === 2 && f.arch === c).length; }));
  const fork = (k: string) => { const fs = res[k].flatMap((r) => r.fights.filter((f: any) => f.act === 2 && !f.boss && f.depth > 0 && f.depth < 4)); return `${(100 * avg(fs.map((f: any) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}%/${pct(fs.filter((f: any) => !f.won).length, fs.length)}`; };
  const elites = (k: string) => avg(res[k].map((r) => r.fights.filter((f: any) => f.act === 2 && f.elite).length));
  console.log(`${cab.padEnd(7)} n ${s1.length} class ${Object.entries(cls).map(([k, v]) => `${k} ${pct(v, s1.length)}`).join(' ')} | forks w/ counter W ${offers(s0).toFixed(2)} R ${offers(s1).toFixed(2)} | fights vs counter greedy W ${vs('wgreedy').toFixed(2)} R ${vs('rgreedy').toFixed(2)} | elites/run R greedy ${elites('rgreedy').toFixed(2)} dodge ${elites('rdodge').toFixed(2)}`);
  console.log(`        act2 clear W greedy ${clr('wgreedy')} dodge ${clr('wdodge')} face ${clr('wface')} | R greedy ${clr('rgreedy')} dodge ${clr('rdodge')} face ${clr('rface')} | fork fights hpLost/death W ${fork('wgreedy')} R ${fork('rgreedy')} R-face ${fork('rface')}`);
}
