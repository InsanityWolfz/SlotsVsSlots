// I8 arc check vs the ITERATION_7 targets: per-cabinet act 2 clear under several policies, Mirror win +
// REFLECTION firing, per-attempt act 2 lethality B1..B5, and per-node feel.   npx tsx playtest/scratch/it8_arc.ts [N]
import { avg, batch, CABINET_ORDER, LABEL, pct, type FightRec, type Policy, type RunRec } from './it8_lib';

const N = Number(process.argv[2] ?? 1000);
const POLS: Record<string, Policy> = {
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  random: { draft: 'random', fork: 'random', shop: 'random', legend: 'random' },
};

function feel(fs: FightRec[]) {
  const lost = fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp);
  return `n ${String(fs.length).padStart(5)} die ${pct(fs.filter((f) => !f.won).length, fs.length).padStart(5)}%  hpLost ${(100 * avg(lost)).toFixed(0).padStart(3)}%  stomp ${pct(lost.filter((x) => x < 0.1).length, fs.length).padStart(5)}%  scary ${pct(lost.filter((x) => x > 0.5).length, fs.length).padStart(5)}%  turns ${avg(fs.map((f) => f.turns)).toFixed(1)}  enemyHp ${avg(fs.map((f) => f.enemyHp)).toFixed(0)}`;
}
function line(rs: RunRec[]) {
  const a2 = rs.filter((r) => r.fights.some((f) => f.act === 2));
  const mf = rs.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2));
  const att = Array(12).fill(0), d = Array(12).fill(0);
  rs.forEach((r) => r.fights.forEach((f) => { const i = (f.act - 1) * 6 + f.depth; att[i]++; if (!f.won) d[i]++; }));
  const leth = [6, 7, 8, 9, 10].map((i) => pct(d[i], att[i])).join('/');
  return `win ${pct(rs.filter((r) => r.won).length, rs.length).padStart(5)}  act1 ${pct(a2.length, rs.length).padStart(5)}  act2clr ${pct(a2.filter((r) => r.won).length, a2.length).padStart(5)}  mirror ${pct(mf.filter((f) => f.won).length, mf.length).padStart(5)} (n${mf.length}, refl>=1 ${pct(mf.filter((f) => f.reflects.length >= 1).length, mf.length)} >=2 ${pct(mf.filter((f) => f.reflects.length >= 2).length, mf.length)}, hp ${avg(mf.map((f) => f.enemyHp)).toFixed(0)}, turns ${avg(mf.map((f) => f.turns)).toFixed(1)})  B1-5 leth ${leth}  House ${pct(d[5] === undefined ? 0 : att[5] - d[5], att[5])}`;
}

const all: Record<string, RunRec[]> = {};
for (const [pn, pol] of Object.entries(POLS)) {
  console.log(`\n===== policy ${pn} =====`);
  for (const cab of CABINET_ORDER) {
    const rs = batch(cab, pol, N);
    all[`${pn}:${cab}`] = rs;
    console.log(`${cab.padEnd(7)} ${line(rs)}`);
  }
  console.log(`ALL     ${line(CABINET_ORDER.flatMap((c) => all[`${pn}:${c}`]))}`);
}

for (const pn of ['greedy', 'commit']) {
  const rs = CABINET_ORDER.flatMap((c) => all[`${pn}:${c}`]);
  const fs = rs.flatMap((r) => r.fights);
  console.log(`\n===== FEEL (${pn}, all cabinets) =====`);
  for (let i = 0; i < 12; i++) console.log(`${LABEL(i).padEnd(6)} ${feel(fs.filter((f) => (f.act - 1) * 6 + f.depth === i))}`);
  const a2 = fs.filter((f) => f.act === 2 && !f.boss);
  console.log('-- act 2 regular fights by archetype');
  for (const a of [...new Set(a2.map((f) => f.arch))].sort()) {
    const x = a2.filter((f) => f.arch === a);
    console.log(`${a.padEnd(8)} share ${pct(x.length, a2.length).padStart(5)}%  ${feel(x)}  elite ${pct(x.filter((f) => f.elite).length, x.length)}%`);
  }
  console.log(`act 1 regular  ${feel(fs.filter((f) => f.act === 1 && !f.boss))}`);
  console.log(`act 2 regular  ${feel(a2)}`);
  console.log(`act 2 elites   ${feel(a2.filter((f) => f.elite))}`);
  console.log(`act 2 non-elit ${feel(a2.filter((f) => !f.elite))}`);
  const act2runs = rs.filter((r) => r.fights.some((f) => f.act === 2));
  console.log(`act 2 runs with >=1 scary regular fight: ${pct(act2runs.filter((r) => r.fights.some((f) => f.act === 2 && !f.boss && (!f.won || (f.hpBefore - f.hpAfter) / f.maxHp > 0.5))).length, act2runs.length)}%`);
}
