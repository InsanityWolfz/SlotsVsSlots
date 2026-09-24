// Act 3 package candidates in full runs (GREEN, commit, act 3). npx tsx playtest/scratch/it12p_act3fix.ts [N]
import { avg, CABINET_ORDER, fullRuns3, pct, type Policy } from './it12p_lib';
import { DEALER, TUNE } from '../../src/core/enemies';
import { RUN } from '../../src/core/run';

const N = Number(process.argv[2] ?? 1500);
const ORIG_STRIP = { ...DEALER.strip };
const V: [string, () => void, boolean][] = [
  ['current', () => { TUNE.dealerPower = 5; TUNE.dealerFlat = 170; DEALER.strip = { ...ORIG_STRIP }; }, false],
  ['Dealer 7x+60, strip 7s6/sw3/sh2/card4', () => { TUNE.dealerPower = 7; TUNE.dealerFlat = 60; DEALER.strip = { seven: 6, sword: 3, shield: 2, card: 4 }; }, false],
  ['  + no post-fight heal in act 3', () => { TUNE.dealerPower = 7; TUNE.dealerFlat = 60; DEALER.strip = { seven: 6, sword: 3, shield: 2, card: 4 }; }, true],
  ['  + no heal, Dealer 6x+60', () => { TUNE.dealerPower = 6; TUNE.dealerFlat = 60; DEALER.strip = { seven: 6, sword: 3, shield: 2, card: 4 }; }, true],
];
for (const [name, set, noHeal] of V) {
  set();
  const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value', hooks: { preFight: (run) => { RUN.postFightHeal = noHeal && run.act === 3 ? 0 : 0.2; } } };
  const rows: string[] = [];
  const dws: number[] = [];
  let reg = 0, regD = 0;
  for (const cab of CABINET_ORDER) {
    const rs = fullRuns3(cab, pol, N, 2, true);
    const f3 = rs.flatMap((r) => r.fights.filter((f) => f.act === 3));
    const dl = f3.filter((f) => f.boss);
    const rg = f3.filter((f) => !f.boss);
    reg += rg.length; regD += rg.filter((f) => !f.won).length;
    const dw = (100 * dl.filter((f) => f.won).length) / Math.max(1, dl.length);
    dws.push(dw);
    rows.push(`${cab} D${dw.toFixed(0)} (hpIn ${(100 * avg(dl.map((f) => f.hpBefore / f.maxHp))).toFixed(0)}%, C-deaths ${pct(rg.filter((f) => !f.won).length, rg.length)}%)`);
  }
  RUN.postFightHeal = 0.2;
  console.log(`${name.padEnd(40)} Dealer avg ${avg(dws).toFixed(1)} spread ${(Math.max(...dws) - Math.min(...dws)).toFixed(1)} | C-fight deaths/attempt ${pct(regD, reg)}% | ${rows.join('  ')}`);
}
