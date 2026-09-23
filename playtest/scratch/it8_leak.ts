// G1: what the tier II preview leak does to the BROWSER game's act 2 (the UI calls optionDeltas on every
// draft card and shop item, which upgrades your real gilds). Emulated by calling optionDeltas on every
// offer before the policy picks. Also: Mirror anticlimax stats.   npx tsx playtest/scratch/it8_leak.ts [N]
import { optionDeltas, shopOffers, type RunState } from '../../src/core/run';
import { avg, BASE, CABINET_ORDER, cloneRun, DRAFTS, playRun, Rng, SHOPS, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
DRAFTS.leakCommit = (run, offers, rng) => { offers.forEach((o) => optionDeltas(run, o, BASE)); return DRAFTS.commit(run, offers, rng); };
SHOPS.leakCommit = (run, rng) => { shopOffers(run).forEach((i) => optionDeltas(run, i.option, BASE)); SHOPS.commit(run, rng); };
const POLS: Record<string, Policy> = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  'commit+leak': { draft: 'leakCommit', fork: 'greedy', shop: 'leakCommit', legend: 'value' },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [pn, pol] of Object.entries(POLS)) {
  const rows = CABINET_ORDER.map((cab) => {
    const rs = snaps[cab].map((s, i) => playRun(0, s.cabinet, pol, new Rng(9000 + i), cloneRun(s)));
    const ms = rs.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2));
    const wins = ms.filter((f) => f.won);
    const tiers = rs.map((r) => r.gilds.length);
    return { cab, clr: (100 * rs.filter((r) => r.won).length) / rs.length, mw: (100 * wins.length) / Math.max(1, ms.length),
      quick: (100 * wins.filter((f) => f.spins <= 2).length) / Math.max(1, wins.length), noRefl: (100 * wins.filter((f) => f.reflects.length === 0).length) / Math.max(1, wins.length),
      b: [1, 2, 3, 4, 5].map((d) => { const x = rs.flatMap((r) => r.fights.filter((f) => f.act === 2 && f.depth === d - 1)); return (100 * x.filter((f) => !f.won).length) / Math.max(1, x.length); }), tiers };
  });
  console.log(`== ${pn}: act 2 clear avg ${avg(rows.map((r) => r.clr)).toFixed(1)}`);
  for (const r of rows) console.log(`  ${r.cab.padEnd(7)} clear ${r.clr.toFixed(1)} mirror ${r.mw.toFixed(0)}  wins in <=2 spins ${r.quick.toFixed(0)}%  wins with 0 reflections ${r.noRefl.toFixed(0)}%  B1-5 death ${r.b.map((x) => x.toFixed(1)).join('/')}`);
}
