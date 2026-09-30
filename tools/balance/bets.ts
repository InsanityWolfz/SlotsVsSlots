// SIDE BETS gate (EXPERT_PLAYTEST_5 C1). npx tsx tools/balance/bets.ts [N] [stake]
// The official sim, plus a bettor who places the table's first bet at [stake] chips whenever it can afford it.
// Gate: >= 60% of regular fights carry a live bet; bets win 40-60%; win rates move <= ~2 points vs no betting.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { betsOpen, offerBets, placeBet, type RunState } from '../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const STAKE = Number(process.argv[3] ?? 10);
const KEEP = Number(process.argv[4] ?? 0);
const base = defaultConfig();
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
for (const stake of process.env.STAKE_ONLY ? [Number(process.env.STAKE_ONLY)] : [0, 2]) {
  for (const cab of CABINET_ORDER.filter((c) => !process.env.CAB || c === process.env.CAB)) {
    SIM_BIAS.onFight = undefined;
    SIM_BIAS.onEnd = undefined;
    const plain = simulateRuns(base, N, 'greedy', 4242, cab, stake, stake >= 2).winPct;
    let regular = 0, offered = 0, placed = 0, won = 0, staked = 0, paid = 0;
    const byKind: Record<string, [number, number]> = {};
    SIM_BIAS.onFight = (run: RunState) => {
      if (run.enemies[run.depth].isBoss) return;
      regular++;
      if (!betsOpen(run)) return;
      const offer = offerBets(run, base);
      if (offer.length) offered++;
      if (offer.length && run.player.chips - STAKE >= KEEP && placeBet(run, 0, STAKE)) placed++;
    };
    SIM_BIAS.onEnd = (run: RunState) => {
      for (const r of run.records) {
        if (!r.bet) continue;
        staked += r.bet.stake;
        const k = (byKind[r.bet.kind] ??= [0, 0]);
        k[1]++;
        if (r.bet.won) { won++; paid += r.bet.stake * r.bet.pay; k[0]++; }
      }
    };
    const betting = simulateRuns(base, N, 'greedy', 4242, cab, stake, stake >= 2).winPct;
    const settled = Object.values(byKind).reduce((a, k) => a + k[1], 0);
    console.log(`${stake ? 'GREEN' : 'WHITE'} ${cab.padEnd(7)} win ${plain.toFixed(1).padStart(5)} -> ${betting.toFixed(1).padStart(5)}  offered ${pct(offered, regular)}%  bet on ${pct(placed, regular)}%  bets won ${pct(won, settled)}%  return ${pct(paid, staked)}%  ` + Object.entries(byKind).map(([k, [w, n]]) => `${k} ${pct(w, n)}% (${n})`).join('  '));
  }
}
