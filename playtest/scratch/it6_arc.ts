// Act 2 arc: per-cabinet win rates under several policies, per-fight lethality, and "feel" of act 2 fights.
//   npx tsx playtest/scratch/it6_arc.ts [N]
import { avg, batch, CABINET_ORDER, LABEL, pct, summary, type FightRec, type Policy, type RunRec } from './it6_lib';

const N = Number(process.argv[2] ?? 1000);
const POLS: Record<string, Policy> = {
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  random: { draft: 'random', fork: 'random', shop: 'random', legend: 'random' },
};

function feel(fs: FightRec[]) {
  const lost = fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp);
  return `n ${String(fs.length).padStart(5)} die ${pct(fs.filter((f) => !f.won).length, fs.length).padStart(5)}%  hpLost ${(100 * avg(lost)).toFixed(0).padStart(3)}%maxHP  stomp(<10% lost) ${pct(lost.filter((x) => x < 0.1).length, fs.length).padStart(5)}%  scary(>50% lost or died) ${pct(lost.filter((x) => x > 0.5).length, fs.length).padStart(5)}%  hpIn ${(100 * avg(fs.map((f) => f.hpBefore / f.maxHp))).toFixed(0)}%  turns ${avg(fs.map((f) => f.turns)).toFixed(1)}`;
}

const all: Record<string, RunRec[]> = {};
for (const [pn, pol] of Object.entries(POLS)) {
  console.log(`\n===== policy ${pn} =====`);
  for (const cab of CABINET_ORDER) {
    const rs = batch(cab, pol, N);
    all[`${pn}:${cab}`] = rs;
    console.log(`${cab.padEnd(7)} ${summary(rs)}`);
  }
}

for (const pn of ['greedy', 'commit']) {
  const rs = CABINET_ORDER.flatMap((c) => all[`${pn}:${c}`]);
  const fs = rs.flatMap((r) => r.fights);
  console.log(`\n===== FEEL (${pn}, all cabinets) =====`);
  for (let i = 0; i < 12; i++) console.log(`${LABEL(i).padEnd(6)} ${feel(fs.filter((f) => (f.act - 1) * 6 + f.depth === i))}`);
  console.log('-- act 2 regular fights by archetype');
  const a2 = fs.filter((f) => f.act === 2 && !f.boss);
  for (const a of [...new Set(a2.map((f) => f.arch))]) {
    console.log(`${a.padEnd(8)} ${feel(a2.filter((f) => f.arch === a))}  elite ${pct(a2.filter((f) => f.arch === a && f.elite).length, a2.filter((f) => f.arch === a).length)}%`);
  }
  console.log(`act 1 regular all   ${feel(fs.filter((f) => f.act === 1 && !f.boss))}`);
  console.log(`act 2 regular all   ${feel(a2)}`);
  console.log(`act 2 elites        ${feel(a2.filter((f) => f.elite))}`);
  console.log(`act 2 non-elite     ${feel(a2.filter((f) => !f.elite))}`);
  // Is an act 2 regular fight ever a real threat? P(>50% lost) per act 2 fight & per run
  const act2runs = rs.filter((r) => r.fights.some((f) => f.act === 2));
  const scaryRuns = act2runs.filter((r) => r.fights.some((f) => f.act === 2 && !f.boss && (!f.won || (f.hpBefore - f.hpAfter) / f.maxHp > 0.5)));
  console.log(`act 2 runs with >=1 scary regular fight: ${pct(scaryRuns.length, act2runs.length)}%`);
  const mir = fs.filter((f) => f.boss && f.act === 2);
  const ended = mir.map((f) => f.hpAfter / f.maxHp);
  console.log(`MIRROR wins with >75% HP left: ${pct(mir.filter((f) => f.won && f.hpAfter / f.maxHp > 0.75).length, mir.filter((f) => f.won).length)}%  with <25%: ${pct(mir.filter((f) => f.won && f.hpAfter / f.maxHp < 0.25).length, mir.filter((f) => f.won).length)}%  avg end ${(100 * avg(ended)).toFixed(0)}%`);
  const hs = fs.filter((f) => f.boss && f.act === 1);
  console.log(`HOUSE wins with >75% HP left: ${pct(hs.filter((f) => f.won && f.hpAfter / f.maxHp > 0.75).length, hs.filter((f) => f.won).length)}%`);
}
