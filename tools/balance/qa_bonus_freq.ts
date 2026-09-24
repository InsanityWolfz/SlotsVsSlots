// QA_1: bonus frequency per run (banked vs paid), by act / stake / slot machine.  npx tsx playtest/scratch/qa_bonus_freq.ts [N] [stake] [act3]
import { CABINET_ORDER, fullRuns3, type Policy } from './it12p_lib';
import { Fight } from '../../src/core/fight';

const N = Number(process.argv[2] ?? 300);
const STK = Number(process.argv[3] ?? 0);
const A3 = (process.argv[4] ?? '0') === '1';
const POL: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const RUNOF = new WeakMap<object, object>();
(POL as any).hooks = { preFight: (run: any, f: any) => RUNOF.set(f, run) };
type Rec = { banked: number; paid: number; wheelsPaid: number; rushPaid: number; wheelsBanked: number; rushBanked: number; spins: number; fights: number; multi: number; bossV: number };
const REC = new Map<object, Rec>();
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: any) {
  const r = origStep.call(this);
  if (this.over && !this._qa) {
    this._qa = true;
    const run = RUNOF.get(this);
    if (run) {
      let x = REC.get(run);
      if (!x) REC.set(run, (x = { banked: 0, paid: 0, wheelsPaid: 0, rushPaid: 0, wheelsBanked: 0, rushBanked: 0, spins: 0, fights: 0, multi: 0, bossV: 0 }));
      const v = this.vouchers as { kind: string }[];
      x.banked += v.length;
      x.wheelsBanked += v.filter((q) => q.kind === 'wheel').length;
      x.rushBanked += v.filter((q) => q.kind === 'rush').length;
      x.spins += Math.ceil(this.turn / 2);
      x.fights++;
      if (v.length > 1) x.multi++;
      if (this.winner === 'player') {
        x.paid += v.length;
        x.wheelsPaid += v.filter((q) => q.kind === 'wheel').length;
        x.rushPaid += v.filter((q) => q.kind === 'rush').length;
        if (this.cfg.enemy.boss) x.bossV += v.length;
      }
    }
  }
  return r;
};
console.log(`bonus freq: N ${N}/machine, stake ${STK}, act3 ${A3}`);
const f = (a: number) => a.toFixed(2);
for (const cab of CABINET_ORDER) {
  REC.clear();
  const rs = fullRuns3(cab as any, POL, N, STK, A3);
  const recs = [...REC.values()];
  const wonIdx = rs.map((r) => r.won);
  // REC insertion order == run order
  const all = recs, won = recs.filter((_, i) => wonIdx[i]);
  const avgOf = (xs: Rec[], k: keyof Rec) => xs.reduce((a, x) => a + x[k], 0) / Math.max(1, xs.length);
  console.log(`${cab.padEnd(7)} all runs: wheelsPaid ${f(avgOf(all, 'wheelsPaid'))} rushPaid ${f(avgOf(all, 'rushPaid'))} banked ${f(avgOf(all, 'banked'))} spins ${avgOf(all, 'spins').toFixed(0)} | WON runs (${won.length}): wheels ${f(avgOf(won, 'wheelsPaid'))} rush ${f(avgOf(won, 'rushPaid'))} spins ${avgOf(won, 'spins').toFixed(0)} fights ${avgOf(won, 'fights').toFixed(1)} multi-voucher fights/run ${f(avgOf(all, 'multi'))} boss-fight vouchers/run ${f(avgOf(all, 'bossV'))} | per-spin ${(100 * avgOf(all, 'banked') / avgOf(all, 'spins')).toFixed(2)}%`);
}
