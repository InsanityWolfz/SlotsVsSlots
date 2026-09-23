// Analyze it3_dec_*.json. npx tsx playtest/scratch/it3_analyze.ts file1 file2 ...
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
const rows: any[] = [], forks: any[] = [];
let R = 0;
for (const f of files) { const j = JSON.parse(readFileSync(f, 'utf8')); rows.push(...j.rows); forks.push(...j.forkRows); R = j.R; }
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const p = (x: number) => (100 * x).toFixed(1);
console.log(`draft points ${rows.length}, forks ${forks.length}, R=${R} (SE per value ~${(100 * Math.sqrt(0.25 / R)).toFixed(1)})`);
const spreads = rows.map((r) => Math.max(...r.vals) - Math.min(...r.vals));
console.log(`DRAFT spread avg ${p(avg(spreads))} median ${p(med(spreads))} <5pts ${(100 * spreads.filter((s) => s < 0.05).length / spreads.length).toFixed(0)}%`);
const byD: Record<number, number[]> = {};
rows.forEach((r, i) => (byD[r.depth] ??= []).push(spreads[i]));
console.log('by depth: ' + Object.entries(byD).map(([d, xs]) => `after F${d}: ${p(avg(xs))} (n${xs.length})`).join('  '));
// policy loss
const pol: Record<string, number[]> = {};
for (const r of rows) { const mx = Math.max(...r.vals); for (const [k, i] of Object.entries(r.pol)) (pol[k] ??= []).push(mx - r.vals[i as number]); }
console.log('policy loss/draft vs oracle: ' + Object.entries(pol).sort((a, b) => avg(a[1]) - avg(b[1])).map(([k, v]) => `${k} ${p(avg(v))}`).join('  '));
function table(key: 'offers' | 'offersR', filter?: (t: string) => boolean) {
  const s: Record<string, { n: number; best: number; d: number[] }> = {};
  for (const r of rows) {
    const mx = Math.max(...r.vals);
    r[key].forEach((t: string, i: number) => { if (filter && !filter(t)) return; const e = (s[t] ??= { n: 0, best: 0, d: [] }); e.n++; e.d.push(r.vals[i] - mx); if (r.vals[i] === mx) e.best++; });
  }
  for (const [t, e] of Object.entries(s).sort((a, b) => avg(b[1].d) - avg(a[1].d))) if (e.n >= 8) console.log(`  ${t.padEnd(28)} n${String(e.n).padStart(4)} best ${(100 * e.best / e.n).toFixed(0).padStart(3)}%  delta ${p(avg(e.d)).padStart(6)}`);
}
console.log('\nCARD TYPES (delta = pts lost vs best card on offer)'); table('offers');
console.log('\nGILDS / WILD / SWAPS by reel'); table('offersR', (t) => /gild|swap|\+2/.test(t));
// relic drafts
const rd = rows.filter((r) => r.offers.filter((o: string) => o.startsWith('relic:')).length === 2);
const gap = rd.map((r) => { const ix = r.offers.map((o: string, i: number) => (o.startsWith('relic:') ? i : -1)).filter((i: number) => i >= 0); return Math.abs(r.vals[ix[0]] - r.vals[ix[1]]); });
const third = rd.map((r) => { const ix = r.offers.map((o: string, i: number) => (o.startsWith('relic:') ? i : -1)).filter((i: number) => i >= 0); const o = r.offers.findIndex((x: string) => !x.startsWith('relic:')); return o < 0 ? 0 : r.vals[o] - Math.max(r.vals[ix[0]], r.vals[ix[1]]); });
console.log(`\nrelic drafts n${rd.length}: relic gap avg ${p(avg(gap))}, <5pts ${(100 * gap.filter((g) => g < 0.05).length / gap.length).toFixed(0)}%; 3rd card beats both ${(100 * third.filter((x) => x > 0).length / third.length).toFixed(0)}%`);
// gild-on-gild (build) vs first gild
const gildRows = rows.filter((r) => r.offers.some((o: string) => o.startsWith('gild')));
const bucket: Record<string, number[]> = {};
for (const r of gildRows) {
  const i = r.offers.findIndex((o: string) => o.startsWith('gild'));
  const mx = Math.max(...r.vals);
  const [, enh, sym] = r.offers[i].split(' ');
  const same = r.gildsHeld.some((g: string) => g.startsWith(`${enh}-${sym}`));
  const k = r.gildsHeld.length === 0 ? '0 held' : same ? 'matches a held gild (build)' : 'different from held';
  (bucket[k] ??= []).push(r.vals[i] - mx);
}
console.log('gild card delta by what you already hold: ' + Object.entries(bucket).map(([k, v]) => `${k}: ${p(avg(v))} (n${v.length}, best ${(100 * v.filter((x) => x === 0).length / v.length).toFixed(0)}%)`).join(' | '));
// forks
console.log(`\nFORKS n${forks.length}`);
const fs = forks.filter((f) => f.opts.length === 2);
const eliteVal = fs.map((f) => { const e = f.opts.findIndex((o: any) => o.elite); return f.vals[e] - f.vals[1 - e]; });
console.log(`elite minus safe: avg ${p(avg(eliteVal))}, elite better ${(100 * eliteVal.filter((x) => x > 0).length / eliteVal.length).toFixed(0)}%, |spread| avg ${p(avg(eliteVal.map(Math.abs)))}, <3pts ${(100 * eliteVal.filter((x) => Math.abs(x) < 0.03).length / eliteVal.length).toFixed(0)}%`);
for (const [lo, hi] of [[0, 0.5], [0.5, 0.7], [0.7, 0.9], [0.9, 1.01]]) {
  const s = fs.filter((f) => f.hpFrac >= lo && f.hpFrac < hi).map((f) => { const e = f.opts.findIndex((o: any) => o.elite); return f.vals[e] - f.vals[1 - e]; });
  console.log(`  HP in [${lo},${hi}): elite-safe ${p(avg(s))} elite better ${(100 * s.filter((x) => x > 0).length / Math.max(1, s.length)).toFixed(0)}% (n${s.length})`);
}
for (const d of [1, 2, 3]) {
  const s = fs.filter((f) => f.depth === d).map((f) => { const e = f.opts.findIndex((o: any) => o.elite); return f.vals[e] - f.vals[1 - e]; });
  console.log(`  fight ${d + 1}: elite-safe ${p(avg(s))} elite better ${(100 * s.filter((x) => x > 0).length / Math.max(1, s.length)).toFixed(0)}% (n${s.length})`);
}
const pairs: Record<string, number[]> = {};
for (const f of fs) { const e = f.opts.findIndex((o: any) => o.elite); (pairs[`${f.opts[e].a}* vs ${f.opts[1 - e].a}`] ??= []).push(f.vals[e] - f.vals[1 - e]); }
for (const [k, v] of Object.entries(pairs).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k.padEnd(22)} n${String(v.length).padStart(3)} elite-safe ${p(avg(v)).padStart(6)} elite better ${(100 * v.filter((x) => x > 0).length / v.length).toFixed(0)}%`);
const simLoss = fs.map((f) => Math.max(...f.vals) - f.vals[f.sim]);
const eliteLoss = fs.map((f) => Math.max(...f.vals) - f.vals[f.opts.findIndex((o: any) => o.elite)]);
const safeLoss = fs.map((f) => Math.max(...f.vals) - f.vals[f.opts.findIndex((o: any) => !o.elite)]);
console.log(`fork loss/fork: sim ${p(avg(simLoss))} alwaysElite ${p(avg(eliteLoss))} alwaysSafe ${p(avg(safeLoss))}`);
