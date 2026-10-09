// Boss pacing: per slot machine, win % among runs that reach each boss and its average turns (both sides' spins),
// plus the act 2 regulars' deaths per 100 WHITE runs. npx tsx tools/sim/bosses.ts [N] [machine]
// Targets (playtest/BOSS_REDESIGN.md section 4): House 12-16 turns / 86-90%, act 2 boss 16-20 / 70-75%,
// act 2 regulars about 12 deaths per 100 WHITE runs, Dealer 20-26 / 45-50%.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 500);
const only = process.argv[3] as CabinetId | undefined;
const f = (x: number, w = 5) => x.toFixed(1).padStart(w);
console.log(`N ${N} per row, greedy bot (House / act 2 boss / act 2 regulars from WHITE, Dealer from GREEN)`);
console.log('machine | House win turns | WHEEL win turns | a2reg deaths/100 (per fight B1..B5) | GREEN: WHEEL win turns | Dealer win turns');
for (const cab of only ? [only] : CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  const b = w.deathsAtDepth.slice(6, 11).map((d) => d.toFixed(1)).join(' ');
  console.log(`${cab.padEnd(7)} | ${f(w.bossWinPct)} ${f(w.bossTurns.house)} | ${f(w.wheelWinPct)} ${f(w.bossTurns.act2)} | ${f(w.act2RegularDeaths)} (${b}) | ${f(g.wheelWinPct)} ${f(g.bossTurns.act2)} | ${f(g.dealerWinPct)} ${f(g.bossTurns.dealer)}`);
}
