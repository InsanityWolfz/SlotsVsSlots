// Variant: GOLD multiplies once per scoring group (x2, set x3) instead of once per gold cell.
import { Fight } from '../../src/core/fight';
import { batch, CABINET_ORDER, pct } from './it6_lib';
const P: any = Fight.prototype;
const orig = P.score;
function run(label: string) {
  const row: string[] = []; let a2n = 0, a2w = 0;
  for (const c of CABINET_ORDER) {
    const rs = batch(c, { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' }, 700, 8080);
    const a2 = rs.filter((r) => r.fights.some((f) => f.act === 2));
    a2n += a2.length; a2w += a2.filter((r) => r.won).length;
    row.push(`${c} ${pct(rs.filter((r) => r.won).length, rs.length)} (act1 ${pct(a2.length, rs.length)}, act2 ${pct(a2.filter((r) => r.won).length, a2.length)})`);
  }
  console.log(`${label.padEnd(22)} ${row.join(' | ')}  act2 clear all ${pct(a2w, a2n)}`);
}
run('current');
P.score = function (me: any, line: any) {
  const s = orig.call(this, me, line);
  for (const g of s.groups) {
    const golds = (g.notes ?? []).filter((n: string) => n === 'X2' || n === 'X3');
    // prism also writes X2; only strip extra gold multipliers when >1 gold note from gold cells
    const goldCells = g.reels.filter((r: number) => { const c = me.reels[r].cells[me.reels[r].stop]; return c?.enh === 'gold' && !c.stolen && !c.slimed && !(me.locked[r] > 0) && !(me.hexed[r] > 0); }).length;
    if (goldCells > 1) { const m = golds.includes('X3') ? 3 : 2; g.amount = Math.max(1, Math.round(g.amount / Math.pow(m, goldCells - 1))); }
  }
  s.totals = {};
  for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
};
run('gold once per group');
