// EXPERT_PLAYTEST_12 (throwaway): the meter-charm gate per machine, under e12_patch.ts env patches.
// SIGC="thorn:thorn:10,15,20,25" npx tsx tools/balance/e12_rows.ts N [cabs] [rows]
// Per machine: rows (GREEN, seed 777, no start relic: baseline | none | sig | <charm>), then official-style W/G
// (seed 4242, N*2), the no-charms drafter W/G, act-2 turns/fight, and how often the greedy run ends holding a 'sig' charm.
import { PATCH12, useSig } from './e12_patch';
import { defaultConfig, type Enh } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const cabs = (process.argv[3] ?? 'thorn,joker,midas').split(',') as CabinetId[];
const ROWS = (process.argv[4] ?? 'baseline,none,sig').split(',').filter(Boolean);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(PATCH12);
for (const cab of cabs) {
  useSig(cab);
  const out: string[] = [];
  SIM_BIAS.noStart = true;
  for (const r of ROWS) {
    SIM_BIAS.enh = r === 'baseline' ? undefined : r === 'none' ? ((cab === 'tesla' ? 'spiked' : 'charged') as Enh) : (r as Enh);
    out.push(`${r} ${simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct.toFixed(1)}`);
  }
  SIM_BIAS.noStart = false;
  SIM_BIAS.enh = undefined;
  let held = 0, runs = 0;
  SIM_BIAS.onEnd = (run) => { runs++; if (run.player.gilded.some((g) => g.enh === ('sig' as Enh))) held++; };
  const w = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true);
  SIM_BIAS.onEnd = undefined;
  SIM_BIAS.enh = (cab === 'tesla' ? 'spiked' : 'charged') as Enh;
  const wn = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 0).winPct;
  const gn = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, cab, 2, true).winPct;
  SIM_BIAS.enh = undefined;
  console.log(
    `${cab.padEnd(6)} | ${out.join('  ')} | official W ${f(w.winPct)} G ${f(g.winPct)} (Dealer ${f(g.dealerWinPct)}, t/fight a2 ${w.turnsByAct[1].toFixed(1)}) | no-charms W ${f(wn)} G ${f(gn)} | ends holding sig ${((100 * held) / Math.max(1, runs)).toFixed(0)}%`,
  );
}
