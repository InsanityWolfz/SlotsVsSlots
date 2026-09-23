// MIDAS act 1 after additive GOLD: clear rate at 22 / 24 / 25 HP (commit, greedy, random), 1000 runs each.
import { CABINETS } from '../../src/core/cabinets';
import { batch, pct, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 1000);
const P: Record<string, Policy> = { commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' }, greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' }, random: { draft: 'random', fork: 'random', shop: 'random', legend: 'random' } };
for (const hp of [22, 24, 25]) {
  (CABINETS.midas as any).hp = hp;
  console.log(`MIDAS ${hp} HP: ` + Object.entries(P).map(([k, p]) => { const rs = batch('midas', p, N); return `${k} act1 ${pct(rs.filter((r) => r.fights.some((f) => f.act === 2)).length, N)} run ${pct(rs.filter((r) => r.won).length, N)}`; }).join(' | '));
}
