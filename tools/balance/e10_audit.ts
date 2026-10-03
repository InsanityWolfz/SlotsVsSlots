// EXPERT_PLAYTEST_10 audit (throwaway). npx tsx tools/balance/e10_audit.ts [N] [mode]
//   held:    random drafter, GREEN, per machine: for each charm / relic, share of runs holding it at the end and the
//            win% with vs without (observational: confounded by run length, read as a desirability signal only).
//   spiked:  builds.ts-style paired row for BULWARK (spiked), which builds.ts skips (greedy values it at 0).
import { defaultConfig, type Enh, type RelicId } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import type { RunState } from '../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const mode = process.argv[3] ?? 'held';
if (mode === 'spiked') {
  SIM_BIAS.noStart = true;
  for (const e of [undefined, 'spiked'] as (Enh | undefined)[]) {
    SIM_BIAS.enh = e;
    const w = CABINET_ORDER.map((cab) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct);
    console.log(`${(e ? 'only ' + e : 'BASELINE').padEnd(12)} ${(w.reduce((a, b) => a + b, 0) / 5).toFixed(1)} | ${w.map((x) => x.toFixed(1)).join(' ')}`);
  }
} else {
  const policy = (process.argv[4] ?? 'random') as 'random' | 'greedy';
  for (const cab of CABINET_ORDER) {
    const charm: Record<string, { n: number; w: number; cells: number }> = {};
    const relic: Record<string, { n: number; w: number }> = {};
    let runs = 0, wins = 0;
    SIM_BIAS.onEnd = (run: RunState) => {
      runs++;
      if (run.won) wins++;
      const seen = new Set<string>();
      for (const g of run.player.gilded) {
        const c = (charm[g.enh] ??= { n: 0, w: 0, cells: 0 });
        c.cells += g.n;
        if (!seen.has(g.enh)) { seen.add(g.enh); c.n++; if (run.won) c.w++; }
      }
      for (const r of new Set(run.player.relics)) { const x = (relic[r] ??= { n: 0, w: 0 }); x.n++; if (run.won) x.w++; }
    };
    simulateRuns(defaultConfig(), N, policy, 4242, cab, 2, true);
    const base = (100 * wins) / runs;
    const row = (k: string, n: number, w: number) => {
      const without = (100 * (wins - w)) / Math.max(1, runs - n);
      return `${k} ${((100 * n) / runs).toFixed(0)}% held, win ${((100 * w) / Math.max(1, n)).toFixed(0)} vs ${without.toFixed(0)}`;
    };
    console.log(`\n== ${cab} (${policy}, GREEN) runs ${runs} win ${base.toFixed(1)}`);
    console.log('CHARMS: ' + Object.entries(charm).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${row(k, v.n, v.w)} (${(v.cells / Math.max(1, v.n)).toFixed(1)} cells)`).join(' | '));
    console.log('RELICS: ' + Object.entries(relic).sort((a, b) => (b[1].w / b[1].n) - (a[1].w / a[1].n)).map(([k, v]) => row(k, v.n, v.w)).join(' | '));
  }
}
