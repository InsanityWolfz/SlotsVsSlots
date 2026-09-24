// GREEN (the Mirror copies your legendary): does heeding the warning pay? Paired full runs, GREEN, no act 3.
//   npx tsx playtest/scratch/it12p_green.ts [N]
import { CABINET_ORDER, fullRuns, pairedDiff, pct, type Policy, type RunRec } from './it12p_lib';

const N = Number(process.argv[2] ?? 1500);
const pol = (legend: string): Policy => ({ draft: 'commit', fork: 'greedy', shop: 'commit', legend });
const W = (rs: RunRec[]) => rs.map((r) => r.won);
const mirrorWin = (rs: RunRec[]) => { const f = rs.flatMap((r) => r.fights.filter((x) => x.boss && x.act === 2)); return pct(f.filter((x) => x.won).length, f.length); };
const sd = (d: [number, number]) => `${d[0] >= 0 ? '+' : ''}${d[0].toFixed(1)}±${d[1].toFixed(1)}`;
console.log(`GREEN legendary choice, commit, N ${N} paired. value = LEG_VALUE pick (ignores the warning); greenAware = avoid legendaries the Mirror can use when possible; copyOnly = prefer them.`);
for (const cab of CABINET_ORDER) {
  const v = fullRuns(cab, pol('value'), N, 2), g = fullRuns(cab, pol('greenAware'), N, 2), c = fullRuns(cab, pol('copyOnly'), N, 2);
  const v0 = fullRuns(cab, pol('value'), N, 0), g0 = fullRuns(cab, pol('greenAware'), N, 0);
  const off = v.filter((r) => r.legendOffer.length);
  const hasSafe = off.filter((r) => r.legendOffer.some((x) => !['phoenix', 'key', 'bell'].includes(x)));
  const valueCopyable = off.filter((r) => r.legend && ['phoenix', 'key', 'bell'].includes(r.legend));
  const legs = (rs: RunRec[]) => Object.entries(rs.reduce((a: any, r) => (r.legend && (a[r.legend] = (a[r.legend] ?? 0) + 1), a), {})).sort((a: any, b: any) => b[1] - a[1]).map(([k, n]) => `${k} ${pct(n as number, rs.filter((r) => r.legend).length)}`).join(' ');
  console.log(`${cab.padEnd(7)} GREEN win value ${pct(v.filter((r) => r.won).length, N)} / aware ${pct(g.filter((r) => r.won).length, N)} (${sd(pairedDiff(W(g), W(v)))}) / copyOnly ${pct(c.filter((r) => r.won).length, N)} (${sd(pairedDiff(W(c), W(v)))})  Mirror v ${mirrorWin(v)} a ${mirrorWin(g)} c ${mirrorWin(c)}  | WHITE aware-value ${sd(pairedDiff(W(g0), W(v0)))}  | offers with a safe pick ${pct(hasSafe.length, off.length)}%, value picks a copyable one ${pct(valueCopyable.length, off.length)}%`);
  console.log(`        value picks: ${legs(v)}\n        aware picks: ${legs(g)}`);
}
