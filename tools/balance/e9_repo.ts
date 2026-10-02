// EXPERT_PLAYTEST_9: what THE REPO MAN actually does per machine. npx tsx tools/balance/e9_repo.ts [N] [stake]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { type RunState } from '../../src/core/run';
import { actLength } from '../../src/core/enemies';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const stake = Number(process.argv[3] ?? 0);
for (const cab of CABINET_ORDER) {
  const st = { fights: 0, turns: 0, takes: 0, zero: 0, hpLost: 0, died: 0, carried: [0, 0, 0], carriedWon: [0, 0, 0], paid: 0, couldPay: 0 };
  let snap: { act: number; liens: number; recs: number } | null = null;
  let boss: { liens: number; recs: number } | null = null;
  const tally = (run: RunState) => {
    if (snap && run.records.length > snap.recs) {
      const r = run.records[snap.recs];
      st.fights++; st.turns += r.turns; st.hpLost += Math.max(0, r.hpBefore - r.hpAfter) / Math.max(1, r.hpBefore);
      if (!r.won) st.died++;
      const now = (run.liens?.length ?? 0) + (run.liensPaid ?? 0);
      const t = Math.max(0, now - snap.liens);
      st.takes += t; if (t === 0) st.zero++;
      snap = null;
    }
    if (boss && run.records.length > boss.recs) {
      const k = Math.min(2, boss.liens);
      st.carried[k]++; if (run.records[boss.recs].won) st.carriedWon[k]++;
      boss = null;
    }
  };
  SIM_BIAS.onFight = (run) => {
    tally(run);
    if (run.enemies[run.depth].archetype === 'repo') snap = { act: run.act, liens: (run.liens?.length ?? 0) + (run.liensPaid ?? 0), recs: run.records.length };
    if (run.depth === actLength(run.act) && run.act <= 2) boss = { liens: run.liens?.length ?? 0, recs: run.records.length };
  };
  SIM_BIAS.onEnd = tally;
  const s = simulateRuns(defaultConfig(), N, 'greedy', 777, cab, stake, stake >= 2);
  const f = (x: number) => x.toFixed(1);
  console.log(`${cab.padEnd(7)} win ${f(s.winPct)} | REPO fights ${st.fights}: turns ${f(st.turns / st.fights)}, takes/fight ${(st.takes / st.fights).toFixed(2)}, NO take ${f((100 * st.zero) / st.fights)}%, hp lost ${f((100 * st.hpLost) / st.fights)}%, died ${f((100 * st.died) / st.fights)}% | boss win carrying 0/1/2+ liens: ${st.carried.map((n, i) => `${n ? f((100 * st.carriedWon[i]) / n) : '-'} (${n})`).join(' / ')}`);
}
