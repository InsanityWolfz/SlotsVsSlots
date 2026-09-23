// HIGH STAKES per cabinet (reviewer). Full runs from identical run seeds at each stake (paired by index).
//   npx tsx playtest/scratch/it10_ladder.ts [N] [policy=commit|greedy]
import { MIRROR_COPYABLE, STAKES } from '../../src/core/stakes';
import { avg, CABINET_ORDER, fullRuns, onlyRules, pairedDiff, pct, type Policy, type RunRec } from './it10_lib';

const N = Number(process.argv[2] ?? 1500);
const PN = process.argv[3] ?? 'commit';
const POL: Policy = PN === 'greedy' ? { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' } : { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const W = (rs: RunRec[]) => rs.map((r) => r.won);
const act2 = (rs: RunRec[]) => rs.filter((r) => r.fights.some((f) => f.act === 2));
const bossWin = (rs: RunRec[], act: number) => { const f = rs.flatMap((r) => r.fights.filter((x) => x.boss && x.act === act)); return pct(f.filter((x) => x.won).length, f.length); };
const line = (rs: RunRec[]) => { const a = act2(rs); return `win ${pct(rs.filter((r) => r.won).length, rs.length).padStart(5)} act1 ${pct(a.length, rs.length).padStart(5)} House ${bossWin(rs, 1).padStart(5)} act2clr ${pct(a.filter((r) => r.won).length, a.length).padStart(5)} Mirror ${bossWin(rs, 2).padStart(5)}`; };
const sd = (d: [number, number]) => `${d[0] >= 0 ? '+' : ''}${d[0].toFixed(1)}±${d[1].toFixed(1)}`;

console.log(`HIGH STAKES ladder, policy ${PN}, N ${N} per cell (paired run seeds). step = paired win diff vs previous stake`);
const ladder: Record<string, RunRec[][]> = {};
for (const cab of CABINET_ORDER) {
  ladder[cab] = [];
  for (let s = 0; s < STAKES.length; s++) {
    const rs = fullRuns(cab, POL, N, s);
    ladder[cab].push(rs);
    console.log(`${cab.padEnd(7)} ${s} ${STAKES[s].name.padEnd(6)} ${line(rs)}  ${s ? 'step ' + sd(pairedDiff(W(rs), W(ladder[cab][s - 1]))) : ''}`);
  }
}
console.log('\nwin % summary (rows cabinet, cols stake 0..5), and GOLD/WHITE ratio');
for (const cab of CABINET_ORDER) { const w = ladder[cab].map((rs) => (100 * rs.filter((r) => r.won).length) / rs.length); console.log(`${cab.padEnd(7)} ${w.map((x) => x.toFixed(1).padStart(5)).join(' ')}   ratio ${(w[5] / w[0]).toFixed(2)}`); }

console.log('\neach rule ALONE vs base (paired win diff ± SE)');
const rules = ['scars', 'mirrorRelic', 'houseDirty', 'counterForks', 'fasterAct2', 'fasterAll'];
for (const cab of CABINET_ORDER) {
  onlyRules([]); const base = fullRuns(cab, POL, N, 1);
  const cells = rules.map((k) => { onlyRules([k]); const rs = fullRuns(cab, POL, N, 1); return `${k} ${sd(pairedDiff(W(rs), W(base)))}`; });
  console.log(`${cab.padEnd(7)} base ${pct(base.filter((r) => r.won).length, N)}  ${cells.join('  ')}`);
}
onlyRules(null);

console.log('\nGREEN: which relic the Mirror copies (runs reaching the Mirror at stake 2; final relic list), by cabinet');
for (const cab of CABINET_ORDER) {
  const m = ladder[cab][2].filter((r) => r.hpIntoMirror >= 0);
  const c: Record<string, number> = {};
  for (const r of m) { const k = MIRROR_COPYABLE.find((x) => r.relics.includes(x)) ?? 'NONE'; c[k] = (c[k] ?? 0) + 1; }
  console.log(`${cab.padEnd(7)} n ${m.length}  ${Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, m.length)}`).join('  ')}`);
}
console.log('\nBLACK: House fight at stake 2 vs 3');
for (const cab of CABINET_ORDER) for (const s of [2, 3]) {
  const h = ladder[cab][s].flatMap((r) => r.fights.filter((f) => f.boss && f.act === 1));
  console.log(`${cab.padEnd(7)} s${s} n ${h.length} win ${pct(h.filter((f) => f.won).length, h.length)} bombs ${avg(h.map((f) => f.bombs)).toFixed(1)} defused ${avg(h.map((f) => f.defused)).toFixed(1)} blasts ${avg(h.map((f) => f.blasts)).toFixed(1)} blastHp ${avg(h.map((f) => f.blastHp)).toFixed(1)} turns ${avg(h.map((f) => f.turns)).toFixed(1)} hpLost ${(100 * avg(h.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}% killer ${Object.entries(h.filter((f) => !f.won).reduce((a: any, f) => ((a[f.killer] = (a[f.killer] ?? 0) + 1), a), {})).map(([k, v]) => `${k}:${v}`).join(',')}`);
}
console.log('\nper-attempt lethality A1..A5 HOUSE B1..B5 MIRROR (all cabinets)');
for (const s of [0, 1, 2, 3, 4, 5]) {
  const att = Array(12).fill(0), d = Array(12).fill(0);
  CABINET_ORDER.forEach((c) => ladder[c][s].forEach((r) => r.fights.forEach((f) => { const i = (f.act - 1) * 6 + f.depth; att[i]++; if (!f.won) d[i]++; })));
  console.log(`s${s}: ${att.map((a, i) => pct(d[i], a)).join(' / ')}`);
}
