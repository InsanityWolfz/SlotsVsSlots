// Per-relic / per-charm / per-big-choice balance. npx tsx tools/balance/builds.ts [N] [relics|charms|choices]
// Paired seeds against a plain greedy baseline, GREEN stake (full run incl. act 3 + Dealer), all 5 machines.
//   relics:  start the run holding that relic (an upper bound on its worth; shows the ranking).
//   charms:  the drafter takes only that charm's cards (and its level cards), never another charm.
//   choices: whenever the big-choice set contains it, that pick is forced.
import { defaultConfig, type Enh, type RelicId } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { RELIC_TIER } from '../../../src/core/relics';
import { BIG_SETS, type BigChoiceId } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
// Probe rows start holding one relic, so the baseline skips the starting pick too (comparable rows).
SIM_BIAS.noStart = true;
const only = process.argv[3];
const row = (label: string) => {
  const w = CABINET_ORDER.map((cab) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct);
  const avg = w.reduce((a, b) => a + b, 0) / w.length;
  console.log(`${label.padEnd(12)} ${avg.toFixed(1).padStart(5)} | ${w.map((x) => x.toFixed(1).padStart(5)).join(' ')}`);
  return avg;
};
console.log(`N ${N} per machine, GREEN stake, greedy. Columns: avg | ${CABINET_ORDER.join(' ')}`);
row('BASELINE');
if (!only || only === 'relics')
  for (const r of [...RELIC_TIER.common, ...RELIC_TIER.uncommon, ...RELIC_TIER.legendary] as RelicId[]) {
    SIM_BIAS.startRelic = r;
    row(`+${r}`);
  }
SIM_BIAS.startRelic = undefined;
if (!only || only === 'charms')
  for (const e of ['gold', 'keen', 'vamp', 'lucky', 'charged', 'blaze'] as Enh[]) {
    SIM_BIAS.enh = e;
    row(`only ${e}`);
  }
SIM_BIAS.enh = undefined;
if (!only || only === 'choices')
  for (const c of BIG_SETS.flat() as BigChoiceId[]) {
    SIM_BIAS.choice = c;
    row(c);
  }
