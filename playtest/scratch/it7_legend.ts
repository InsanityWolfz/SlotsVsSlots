// Legendary pick: force each legendary (or none) at the act transition, same seeds, and measure act 2 clear.
//   npx tsx playtest/scratch/it7_legend.ts [N] [policy]
import type { RelicId } from '../../src/core/config';
import { avg, batch, CABINET_ORDER, LEGENDARY, pct, type Policy } from './it7_lib';

const N = Number(process.argv[2] ?? 1500);
const P = process.argv[3] ?? 'commit';
const base: Policy = P === 'commit' ? { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' } : { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' };
const LEGS = [...LEGENDARY, 'none'] as RelicId[];

const table: Record<string, Record<string, number>> = {};
const offersSeen: RelicId[][] = [];
console.log(`policy ${P}, ${N} runs per cell; act 2 clear % among runs that beat the House (mirror win % | B-fight deaths %)`);
console.log(`cabinet  ${LEGS.map((l) => l.padEnd(18)).join('')}`);
for (const cab of CABINET_ORDER) {
  const cells: string[] = [];
  table[cab] = {};
  for (const L of LEGS) {
    const rs = batch(cab, { ...base, forceLegend: L }, N, 9001);
    const a2 = rs.filter((r) => r.fights.some((f) => f.act === 2));
    const mir = a2.filter((r) => r.hpIntoMirror >= 0);
    const clear = (100 * a2.filter((r) => r.won).length) / Math.max(1, a2.length);
    table[cab][L] = clear;
    const bDeaths = a2.filter((r) => !r.won && r.deathFight >= 6 && r.deathFight < 11).length;
    cells.push(`${clear.toFixed(1)} (${pct(mir.filter((r) => r.won).length, mir.length)}|${pct(bDeaths, a2.length)})`.padEnd(18));
  }
  console.log(`${cab.padEnd(8)} ${cells.join('')}`);
}
// Natural offers: how often is the choice meaningful?
for (const cab of CABINET_ORDER) {
  const rs = batch(cab, base, N, 9001);
  for (const r of rs) if (r.legendOffer.length) offersSeen.push(r.legendOffer.map((x) => `${cab}:${x}` as RelicId));
}
let spread = 0, big = 0;
const bestCount: Record<string, number> = {};
for (const o of offersSeen) {
  const vals = o.map((k) => { const [c, l] = (k as string).split(':'); return { l, v: table[c][l] }; });
  const s = Math.max(...vals.map((x) => x.v)) - Math.min(...vals.map((x) => x.v));
  spread += s;
  if (s >= 5) big++;
  const b = vals.reduce((a, x) => (x.v > a.v ? x : a));
  bestCount[b.l] = (bestCount[b.l] ?? 0) + 1;
}
console.log(`\nnatural 3-offers seen: ${offersSeen.length}; mean best-worst spread ${(spread / offersSeen.length).toFixed(1)} pts; spread >=5 pts in ${pct(big, offersSeen.length)}%`);
console.log(`best choice share: ${Object.entries(bestCount).map(([k, v]) => `${k} ${pct(v, offersSeen.length)}%`).join(' | ')}`);
console.log(`offer size avg ${avg(offersSeen.map((o) => o.length)).toFixed(2)}`);
for (const L of LEGS) console.log(`${L.padEnd(10)} avg over cabinets ${avg(CABINET_ORDER.map((c) => table[c][L])).toFixed(1)}  (vs none ${(avg(CABINET_ORDER.map((c) => table[c][L])) - avg(CABINET_ORDER.map((c) => table[c].none))).toFixed(1)})`);
