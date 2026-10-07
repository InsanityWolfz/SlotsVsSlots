// Expert playtest 3 (throwaway probe): what if act 3 does NOT start with a full heal?
// Emulated via SIM_BIAS.onFight: at act 3 fight 1, HP = HP after the Mirror + FRAC x missing.
// npx tsx tools/balance/expert3_act3heal.ts [N] [FRAC ...]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import type { RunState } from '../../../src/core/run';
const N = Number(process.argv[2] ?? 400);
const fracs = process.argv.slice(3).map(Number);
if (!fracs.length) fracs.push(1, 0.5, 0.35);
const f = (x: number) => x.toFixed(1).padStart(5);
for (const frac of fracs) {
  SIM_BIAS.onFight = (run: RunState) => {
    if (run.act !== 3 || run.depth !== 0 || frac >= 1) return;
    const mirror = run.records[run.records.length - 1];
    if (!mirror || mirror.act !== 2) return;
    const p = run.player;
    p.hp = Math.min(p.maxHp, Math.round(mirror.hpAfter + frac * (p.maxHp - mirror.hpAfter)));
  };
  console.log(`\nFRAC ${frac} (1 = today's full heal). machine | GREEN win reachD hpInD Dealer | act3 die lost turns`);
  const t = { g: 0, hp: 0, d: 0, die: 0 };
  for (const cab of CABINET_ORDER) {
    const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
    t.g += g.winPct; t.hp += g.hpIntoDealerPct; t.d += g.dealerWinPct; t.die += g.act3Regular.diePct;
    console.log(`${cab.padEnd(7)} | ${f(g.winPct)} ${f(g.reachedDealerPct)} ${f(g.hpIntoDealerPct)} ${f(g.dealerWinPct)} | ${f(g.act3Regular.diePct)} ${f(g.act3Regular.lostPct)} ${f(g.act3Regular.turns)}`);
  }
  const n = CABINET_ORDER.length;
  console.log(`AVG     | ${f(t.g / n)}       ${f(t.hp / n)} ${f(t.d / n)} | ${f(t.die / n)}`);
}
