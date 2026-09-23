// Act 2 skill expression on common snapshots: every run is played with commit through act 1 (+ legendary
// + intro Cashier), snapshotted at B1, then act 2 is replayed under different policies with the same seeds.
//   npx tsx playtest/scratch/it7_skill.ts [N]
import type { RunState } from '../../src/core/run';
import { avg, cloneRun, CABINET_ORDER, pct, playRun, Rng, type Policy, type RunRec } from './it7_lib';

const N = Number(process.argv[2] ?? 800);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}
const POLS: Record<string, Policy> = {
  commit: base,
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  tierfirst: { draft: 'tierfirst', fork: 'greedy', shop: 'tierfirst', legend: 'value' },
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
  const snaps = snapshots(cab);
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
// elite fights taken in act 2 under elite2
const ef = CABINET_ORDER.flatMap((c) => res[c].elite2.flatMap((r) => r.fights.filter((f) => f.act === 2 && f.elite)));
console.log(`\nelite2: act 2 elite fights ${ef.length}, death ${pct(ef.filter((f) => !f.won).length, ef.length)}%, hpLost ${(100 * avg(ef.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}%`);
