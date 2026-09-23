// I9 targets on identical B1 snapshots (Package P in the real code), independent seeds + paired SEs.
//   npx tsx playtest/scratch/it9_skill.ts [N] [snapSeed] [playSeed]
import { avg, CABINET_ORDER, cloneRun, pairedDiff, pct, playRun, Rng, snapshots, type Policy, type RunRec } from './it9_lib';

const N = Number(process.argv[2] ?? 2000);
const SNAP = Number(process.argv[3] ?? 777);
const PLAY = Number(process.argv[4] ?? 20000);
const P = (draft: string, fork = 'greedy', shop = 'commit'): Policy => ({ draft, fork, shop, legend: 'value' });
const POLS: Record<string, Policy> = {
  commit: P('commit'),
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  notier: P('notier', 'greedy', 'notier'),
  tierfirst: P('tierfirst', 'greedy', 'tierfirst'),
  hpfirst: P('hpfirst'),
  randomDraft: P('random'),
  randomAll: { draft: 'random', fork: 'random', shop: 'random', legend: 'value' },
  noShop: P('commit', 'greedy', 'never'),
  elite2: P('commit', 'elite2'),
  safe2: P('commit', 'safe2'),
  dodge: P('commit', 'dodge'),
  face: P('commit', 'face'),
};
const res: Record<string, Record<string, RunRec[]>> = {};
console.log(`N ${N} snapSeed ${SNAP} playSeed ${PLAY}. act 2 clear % from identical B1 snapshots; Mirror win in ()`);
console.log(`cabinet  n    ${Object.keys(POLS).map((k) => k.padEnd(13)).join('')}`);
for (const cab of CABINET_ORDER) {
  const snaps = snapshots(cab, N, SNAP);
  res[cab] = {};
  const cells = Object.entries(POLS).map(([k, pol]) => {
    const rs = snaps.map((s, i) => playRun(0, s.cabinet, pol, new Rng(PLAY + i), cloneRun(s)));
    res[cab][k] = rs;
    const m = rs.filter((r) => r.hpIntoMirror >= 0);
    return `${pct(rs.filter((r) => r.won).length, rs.length)} (${pct(m.filter((r) => r.won).length, m.length)})`.padEnd(13);
  });
  console.log(`${cab.padEnd(8)} ${String(snaps.length).padEnd(4)} ${cells.join('')}`);
}
const clear = (c: string, k: string) => (100 * res[c][k].filter((r) => r.won).length) / res[c][k].length;
console.log('\naverage over cabinets:');
for (const k of Object.keys(POLS)) {
  const m = CABINET_ORDER.map((c) => { const x = res[c][k].filter((r) => r.hpIntoMirror >= 0); return (100 * x.filter((r) => r.won).length) / Math.max(1, x.length); });
  const reach = CABINET_ORDER.map((c) => (100 * res[c][k].filter((r) => r.hpIntoMirror >= 0).length) / res[c][k].length);
  console.log(`${k.padEnd(12)} act2 clear ${avg(CABINET_ORDER.map((c) => clear(c, k))).toFixed(1)}  reach Mirror ${avg(reach).toFixed(1)}  Mirror win ${avg(m).toFixed(1)}`);
}
console.log('\npaired differences (act 2 clear pts ± SE) by cabinet:');
const W = (c: string, k: string) => res[c][k].map((r) => r.won);
for (const [a, b] of [['commit', 'notier'], ['commit', 'hpfirst'], ['commit', 'randomDraft'], ['commit', 'randomAll'], ['elite2', 'safe2'], ['dodge', 'commit'], ['dodge', 'face'], ['commit', 'noShop']]) {
  const cells = CABINET_ORDER.map((c) => { const [m, se] = pairedDiff(W(c, a), W(c, b)); return `${c} ${m >= 0 ? '+' : ''}${m.toFixed(1)}±${se.toFixed(1)}`; });
  const all = pairedDiff(CABINET_ORDER.flatMap((c) => W(c, a)), CABINET_ORDER.flatMap((c) => W(c, b)));
  const avgc = avg(CABINET_ORDER.map((c) => clear(c, a) - clear(c, b)));
  console.log(`${(a + ' - ' + b).padEnd(22)} avg ${avgc >= 0 ? '+' : ''}${avgc.toFixed(1)} (pooled ${all[0].toFixed(1)}±${all[1].toFixed(1)})  ${cells.join('  ')}`);
}
const cc = CABINET_ORDER.map((c) => clear(c, 'commit'));
console.log(`\ncommit spread ${(Math.max(...cc) - Math.min(...cc)).toFixed(1)}  (${cc.map((x) => x.toFixed(1)).join('/')})`);
console.log('\nMirror (commit) by cabinet:');
for (const c of [...CABINET_ORDER, 'ALL']) {
  const ms = (c === 'ALL' ? CABINET_ORDER : [c]).flatMap((x) => res[x].commit.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2)));
  const wins = ms.filter((f) => f.won);
  const fast = wins.filter((f) => f.spins <= 2);
  console.log(`${c.padEnd(7)} n ${ms.length} win ${pct(wins.length, ms.length)}  refl>=1 ${pct(ms.filter((f) => f.reflects.length).length, ms.length)}  wins w/o refl ${pct(wins.filter((f) => !f.reflects.length).length, wins.length)}  wins in <=2 spins ${pct(fast.length, wins.length)}  crack ${pct(ms.filter((f) => f.shatter).length, ms.length)}  HP ${avg(ms.map((f) => f.enemyHp)).toFixed(0)}  turns ${avg(ms.map((f) => f.turns)).toFixed(1)}  maxSpin ${avg(ms.map((f) => f.maxSpinDmg)).toFixed(0)}  killers ${Object.entries(ms.filter((f) => !f.won).reduce((a: any, f) => ((a[f.killer] = (a[f.killer] ?? 0) + 1), a), {})).map(([k, v]) => `${k}:${v}`).join(',')}`);
}
console.log('\nact 2 lethality per attempt B1..B5 / MIRROR (commit):');
for (const c of [...CABINET_ORDER, 'ALL']) {
  const fs = (c === 'ALL' ? CABINET_ORDER : [c]).flatMap((x) => res[x].commit.flatMap((r) => r.fights.filter((f) => f.act === 2)));
  console.log(`${c.padEnd(7)} ${[0, 1, 2, 3, 4, 5].map((d) => { const x = fs.filter((f) => f.depth === d); return pct(x.filter((f) => !f.won).length, x.length); }).join(' / ')}`);
}
for (const k of ['elite2', 'safe2']) {
  const ef = CABINET_ORDER.flatMap((c) => res[c][k].flatMap((r) => r.fights.filter((f) => f.act === 2 && !f.boss && f.depth > 0 && f.depth < 4)));
  const mr = CABINET_ORDER.flatMap((c) => res[c][k].filter((r) => r.hpIntoMirror >= 0));
  console.log(`${k}: fork fights ${ef.length}, death ${pct(ef.filter((f) => !f.won).length, ef.length)}%, hpLost ${(100 * avg(ef.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}%, relics at Mirror ${avg(mr.map((r) => r.relics.length)).toFixed(1)}, chips at last shop ${avg(mr.map((r) => r.chipsAt.at(-1) ?? 0)).toFixed(1)}`);
}
