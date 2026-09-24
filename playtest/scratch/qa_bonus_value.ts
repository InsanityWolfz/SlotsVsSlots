// QA_1: what the bonuses are worth (paired seeds, commit policy).  npx tsx playtest/scratch/qa_bonus_value.ts [N] [stake] [act3]
import { CABINET_ORDER, fullRuns3, type Policy } from './it12p_lib';
import { BONUS } from '../../src/core/relics';
const N = Number(process.argv[2] ?? 300), STK = Number(process.argv[3] ?? 0), A3 = process.argv[4] === '1';
const POL: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const pct = (a: number, b: number) => ((100 * a) / Math.max(1, b)).toFixed(1);
for (const cab of CABINET_ORDER) {
  const row: string[] = [];
  for (const [w, r] of [[0.02, 0.01], [0, 0], [0.028, 0.012]] as const) {
    BONUS.wheel = w; BONUS.rush = r;
    const rs = fullRuns3(cab as any, POL, N, STK, A3, 4242);
    const act1 = rs.filter((x) => x.fights.some((f: any) => f.act === 2)).length;
    const dealer = rs.flatMap((x) => x.fights.filter((f: any) => f.boss && f.act === 3));
    row.push(`[${w}/${r}] win ${pct(rs.filter((x) => x.won).length, N)} act1 ${pct(act1, N)}${A3 ? ` Dealer ${pct(dealer.filter((f: any) => f.won).length, dealer.length)}` : ''}`);
  }
  console.log(cab.padEnd(7), row.join(' | '));
}
