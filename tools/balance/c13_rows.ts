// CONTENT_13 (throwaway): builds-style rows + official-style WHITE/GREEN under c13_patch.ts.
// C13=<content in the pools> npx tsx tools/balance/c13_rows.ts N rows [off] [cabs]
// rows (GREEN, seed 777, no start relic, per machine): comma list of
//   base0 (the current game: no new content) | baseline (C13 content in the pools) | none (no charms) |
//   <charm> (only that charm) | +<relic> (start holding it; C13 content stays in the pools).
// off=1 adds the official-style table (seeds 4242, N*2 per machine, WHITE and GREEN) with the C13 content in.
import { C13_LABEL, levelCheck, setContent, useCab, STATS } from './c13_patch';
import { defaultConfig, type Enh } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from './c13_sim';

const N = Number(process.argv[2] ?? 200);
const ROWS = (process.argv[3] ?? 'baseline,none').split(',');
const OFF = process.argv[4] === '1';
const CABS = (process.argv[5] ? process.argv[5].split(',') : CABINET_ORDER) as CabinetId[];
const content = process.env.C13 ?? '';
const f = (x: number) => x.toFixed(1).padStart(5);
const out: string[] = [C13_LABEL(), levelCheck(), `rows GREEN seed 777 N ${N}: avg | ${CABS.join(' ')}`];
for (const r of ROWS) {
  const relic = r.startsWith('+') ? r.slice(1) : undefined;
  setContent(r === 'base0' ? '' : content, relic ? [relic] : []);
  SIM_BIAS.noStart = true;
  const w = CABS.map((cab) => {
    useCab(cab);
    SIM_BIAS.startRelic = relic as never;
    SIM_BIAS.enh = r === 'base0' || r === 'baseline' || relic ? undefined : r === 'none' ? ((cab === 'tesla' ? 'spiked' : 'charged') as Enh) : (r as Enh);
    return simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct;
  });
  out.push(`${r.padEnd(14)} ${f(w.reduce((a, b) => a + b, 0) / w.length)} | ${w.map(f).join(' ')}`);
  console.error(out.at(-1));
}
SIM_BIAS.enh = undefined;
SIM_BIAS.startRelic = undefined;
SIM_BIAS.noStart = false;
if (OFF) {
  setContent(content);
  let tw = 0, tg = 0;
  const off: string[] = [];
  for (const cab of CABS) {
    useCab(cab);
    const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
    const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
    tw += w; tg += g;
    off.push(`${cab} ${w.toFixed(1)}/${g.toFixed(1)}`);
  }
  out.push(`official-style (N ${N * 2}) WHITE ${(tw / CABS.length).toFixed(1)} GREEN ${(tg / CABS.length).toFixed(1)} | ${off.join(' ')}`);
}
out.push(`stats ${JSON.stringify(STATS)}`);
console.log(out.join('\n'));
