// I8 act 2 skill expression on identical B1 snapshots (Package O in the real code).
//   npx tsx playtest/scratch/it8_skill.ts [N]
import { avg, CABINET_ORDER, cloneRun, mirrorLine, pct, playRun, Rng, snapshots, type Policy, type RunRec } from './it8_lib';

const N = Number(process.argv[2] ?? 800);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const POLS: Record<string, Policy> = {
  commit: base,
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  tierfirst: { draft: 'tierfirst', fork: 'greedy', shop: 'tierfirst', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomAll: { draft: 'random', fork: 'random', shop: 'random', legend: 'value' },
  noShop: { draft: 'commit', fork: 'greedy', shop: 'never', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
  safe2: { draft: 'commit', fork: 'safe2', shop: 'commit', legend: 'value' },
};
const res: Record<string, Record<string, RunRec[]>> = {};
console.log(`act 2 clear % from identical B1 snapshots (commit through act 1); mirror win in ()`);
console.log(`cabinet  n    ${Object.keys(POLS).map((k) => k.padEnd(14)).join('')}`);
for (const cab of CABINET_ORDER) {
  const snaps = snapshots(cab, N);
  res[cab] = {};
  const cells = Object.entries(POLS).map(([k, pol]) => {
    const rs = snaps.map((s, i) => playRun(0, s.cabinet, pol, new Rng(9000 + i), cloneRun(s)));
    res[cab][k] = rs;
    const m = rs.filter((r) => r.hpIntoMirror >= 0);
    return `${pct(rs.filter((r) => r.won).length, rs.length)} (${pct(m.filter((r) => r.won).length, m.length)})`.padEnd(14);
  });
  console.log(`${cab.padEnd(8)} ${String(snaps.length).padEnd(4)} ${cells.join('')}`);
}
console.log('\naverage over cabinets:');
for (const k of Object.keys(POLS)) {
  const v = CABINET_ORDER.map((c) => (100 * res[c][k].filter((r) => r.won).length) / res[c][k].length);
  const m = CABINET_ORDER.map((c) => { const x = res[c][k].filter((r) => r.hpIntoMirror >= 0); return (100 * x.filter((r) => r.won).length) / Math.max(1, x.length); });
  const reach = CABINET_ORDER.map((c) => (100 * res[c][k].filter((r) => r.hpIntoMirror >= 0).length) / res[c][k].length);
  console.log(`${k.padEnd(12)} act2 clear ${avg(v).toFixed(1)}  reach Mirror ${avg(reach).toFixed(1)}  Mirror win ${avg(m).toFixed(1)}`);
}
console.log('\nMirror (commit) by cabinet:');
for (const c of CABINET_ORDER) console.log(`${c.padEnd(7)} ${mirrorLine(res[c].commit.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2)))}`);
console.log(`ALL     ${mirrorLine(CABINET_ORDER.flatMap((c) => res[c].commit.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2))))}`);
console.log('\nact 2 lethality per attempt B1..B5 (commit):');
for (const c of [...CABINET_ORDER, 'ALL']) {
  const rs = c === 'ALL' ? CABINET_ORDER.flatMap((x) => res[x].commit) : res[c].commit;
  const fs = rs.flatMap((r) => r.fights.filter((f) => f.act === 2));
  console.log(`${c.padEnd(7)} ${[0, 1, 2, 3, 4, 5].map((d) => { const x = fs.filter((f) => f.depth === d); return pct(x.filter((f) => !f.won).length, x.length); }).join(' / ')}`);
}
for (const k of ['elite2', 'safe2']) {
  const ef = CABINET_ORDER.flatMap((c) => res[c][k].flatMap((r) => r.fights.filter((f) => f.act === 2 && !f.boss && f.depth > 0 && f.depth < 4)));
  console.log(`${k}: fork fights ${ef.length}, elite ${pct(ef.filter((f) => f.elite).length, ef.length)}%, death ${pct(ef.filter((f) => !f.won).length, ef.length)}%, hpLost ${(100 * avg(ef.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}%, relics at Mirror ${avg(res.knight[k].filter((r) => r.hpIntoMirror >= 0).map((r) => r.relics.length)).toFixed(1)}`);
}
