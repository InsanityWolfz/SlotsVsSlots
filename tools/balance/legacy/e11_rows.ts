// EXPERT_PLAYTEST_11 (throwaway): builds.ts-style rows + official-style WHITE/GREEN under the e11_patch.ts env patches.
// SIG="gold:thorn,wild,goldbar" BELLFIX=1 npx tsx tools/balance/e11_rows.ts N [rows] [off]
// rows (GREEN, seed 777, no start relic): comma list of baseline | none (no charms) | <charm> (only that charm) | +<relic>.
// off=0 skips the official-style table (seed 4242, N*2 per machine).
import { PATCH_LABEL } from './e11_patch';
import { defaultConfig, type Enh } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
const ROWS = (process.argv[3] ?? 'baseline,none,gold').split(',');
const f = (x: number) => x.toFixed(1).padStart(5);
SIM_BIAS.noStart = true;
const out: string[] = [PATCH_LABEL];
for (const r of ROWS) {
  // 'none': a charm no machine but TESLA can take (TESLA's 'none' uses BULWARK, KNIGHT-only), i.e. no charms at all.
  const w = CABINET_ORDER.map((cab) => {
    SIM_BIAS.startRelic = r.startsWith('+') ? (r.slice(1) as never) : undefined;
    SIM_BIAS.enh = r === 'baseline' || r.startsWith('+') ? undefined : r === 'none' ? ((cab === 'tesla' ? 'spiked' : 'charged') as Enh) : (r as Enh);
    return simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct;
  });
  out.push(`${r.padEnd(9)} ${f(w.reduce((a, b) => a + b, 0) / 5)} | ${w.map(f).join(' ')}`);
}
SIM_BIAS.enh = undefined;
SIM_BIAS.startRelic = undefined;
SIM_BIAS.noStart = false;
if (process.argv[4] === '0') { console.log(out.join('\n')); process.exit(0); }
let tw = 0, tg = 0;
const off: string[] = [];
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
  const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
  tw += w; tg += g;
  off.push(`${cab} ${w.toFixed(1)}/${g.toFixed(1)}`);
}
out.push(`official-style (N ${N * 2}) WHITE ${(tw / 5).toFixed(1)} GREEN ${(tg / 5).toFixed(1)} | ${off.join(' ')}`);
console.log(out.join('\n'));
