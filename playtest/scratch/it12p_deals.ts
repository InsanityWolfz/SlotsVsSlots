// Dealer deals, controlled (reviewer): Dealer-entry snapshots (GREEN, commit), replayed with each card forced.
//   npx tsx playtest/scratch/it12p_deals.ts [attempts per cabinet] [seeds per snap]
import { CABINET_ORDER, fightFrom, forceDeal, isSetBuild, P, snapsAt, Rng, pct, avg, machinePower } from './it12p_lib';
import { A3S } from './it12p_lib';

const N = Number(process.argv[2] ?? 2500);
const K = Number(process.argv[3] ?? 4);
const V = ['normal', 'none', 'shuffle', 'cut', 'raise'];
type Acc = { n: number; w: number; lost: number; turns: number };
const acc: Record<string, Record<string, Acc>> = {};
const add = (grp: string, v: string, won: boolean, lost: number, turns: number) => {
  const a = ((acc[grp] ??= {})[v] ??= { n: 0, w: 0, lost: 0, turns: 0 });
  a.n++; a.w += won ? 1 : 0; a.lost += lost; a.turns += turns;
};
let tot = 0, sets = 0;
for (const cab of CABINET_ORDER) {
  const snaps = snapsAt(cab, N, P.commit, 2, 3, 3);
  tot += snaps.length;
  let cabSet = 0;
  for (const run of snaps) {
    const set = isSetBuild(run);
    if (set) { sets++; cabSet++; }
    const seeds = new Rng(run.seed ^ 0xabc);
    for (let k = 0; k < K; k++) {
      const fs = seeds.int(0xffffffff);
      for (const v of V) {
        forceDeal(v === 'normal' ? null : v);
        const f = fightFrom(run, fs);
        const won = f.winner === 'player';
        const lost = (run.player.hp - Math.max(0, f.sides.player.hp)) / run.player.maxHp;
        for (const g of [set ? 'SET' : 'NOSET', cab, 'ALL']) add(g, v, won, lost, f.turn);
        void A3S;
      }
    }
  }
  forceDeal(null);
  console.log(`${cab}: ${snaps.length} Dealer snapshots, set builds ${pct(cabSet, snaps.length)}%, power ${avg(snaps.map(machinePower)).toFixed(1)}`);
}
console.log(`\nDealer fights replayed with each card forced (every deal = that card; 'none' = deals do nothing but the gate opens). ${tot} snapshots x ${K} seeds; ${pct(sets, tot)}% set builds`);
for (const g of ['ALL', 'SET', 'NOSET', ...CABINET_ORDER]) {
  const r = acc[g];
  if (!r) continue;
  console.log(`${g.padEnd(7)} ` + V.map((v) => `${v} win ${pct(r[v].w, r[v].n)} lost ${(100 * r[v].lost / r[v].n).toFixed(0)}%`).join(' | '));
}
console.log('\nWin cost of each card vs none (pts):');
for (const g of ['ALL', 'SET', 'NOSET', ...CABINET_ORDER]) {
  const r = acc[g];
  if (!r) continue;
  const w = (v: string) => (100 * r[v].w) / r[v].n;
  console.log(`${g.padEnd(7)} ` + ['normal', 'shuffle', 'cut', 'raise'].map((v) => `${v} ${(w(v) - w('none')).toFixed(1)}`).join('  '));
}
