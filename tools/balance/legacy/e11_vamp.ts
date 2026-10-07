// EXPERT_PLAYTEST_11 (throwaway): VAMP variants. npx tsx tools/balance/e11_vamp.ts N variant
//   0 current | 1 a one-cell jackpot heals once (no x3 copies) | 2 once per spin (not per group) | 3 = 1+2
//   4 = 3 plus VAMP values from env VAMP="0,20,30,40,50"
// Prints the builds.ts-style rows (GREEN, seed 777, no start relic): BASELINE and "only vamp", then official-style WHITE/GREEN.
import { defaultConfig, type Enh } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { CHARM_VALUE } from '../../../src/core/charms';
import { Fight } from '../../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
const V = Number(process.argv[3] ?? 0);
if (process.env.VAMP) CHARM_VALUE.vamp = process.env.VAMP.split(',').map(Number);
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const origScore = P.score, origVamp = P.vampHeal;
P.score = function (this: Record<string, unknown>, me: { side: string }, line: unknown) {
  this['_vamp_' + me.side] = false;
  return origScore.call(this, me, line);
};
P.vampHeal = function (this: Record<string, unknown>, me: { side: string }, g: { jackpot?: boolean; amount: number }, ev: unknown) {
  if ((V === 2 || V >= 3) && this['_vamp_' + me.side]) return;
  const hpBefore = (me as unknown as { hp: number }).hp;
  const j = g.jackpot;
  if (V === 1 || V >= 3) g.jackpot = false;
  const r = origVamp.call(this, me, g, ev);
  g.jackpot = j;
  if ((me as unknown as { hp: number }).hp !== hpBefore) this['_vamp_' + me.side] = true;
  return r;
};
const f = (x: number) => x.toFixed(1).padStart(5);
SIM_BIAS.noStart = true;
const rows: string[] = [];
for (const e of [undefined, 'vamp'] as (Enh | undefined)[]) {
  SIM_BIAS.enh = e;
  const w = CABINET_ORDER.map((cab) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct);
  rows.push(`${(e ? 'only ' + e : 'BASELINE').padEnd(10)} ${f(w.reduce((a, b) => a + b, 0) / 5)} | ${w.map(f).join(' ')}`);
}
SIM_BIAS.enh = undefined;
SIM_BIAS.noStart = false;
let tw = 0, tg = 0;
const off: string[] = [];
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
  const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
  tw += w; tg += g;
  off.push(`${cab} ${w.toFixed(1)}/${g.toFixed(1)}`);
}
console.log(`VARIANT ${V} vamp ${CHARM_VALUE.vamp.join(',')}\n${rows.join('\n')}\nofficial-style (N ${N * 2}) WHITE ${(tw / 5).toFixed(1)} GREEN ${(tg / 5).toFixed(1)} | ${off.join(' ')}`);
