// EXPERT_PLAYTEST_6 E8: the Dealer's own bets. npx tsx tools/balance/dealer_bets.ts [N]
// GREEN greedy runs; at the Dealer, place bet [0] or [1] for 5 chips. Reports each bet's win rate and return.
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { offerBets, placeBet, type RunState } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const base = defaultConfig();
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
for (const cab of CABINET_ORDER) {
  const row: string[] = [];
  for (const k of ['early', 'survive']) {
    let n = 0, won = 0, staked = 0, paid = 0, offered = 0, dealers = 0;
    const pays: number[] = [];
    SIM_BIAS.onFight = (run: RunState) => {
      if (run.enemies[run.depth].boss !== 'dealer' || run.endless) return;
      dealers++;
      const offer = offerBets(run, base);
      const i = offer.findIndex((b) => b.kind === k);
      if (i < 0) return;
      offered++;
      pays.push(offer[i].pay);
      if (run.player.chips < 5) run.player.chips = 5;
      placeBet(run, i, 5);
    };
    SIM_BIAS.onEnd = (run: RunState) => {
      for (const r of run.records) if (r.bet && (r.bet.kind === k)) { n++; staked += r.bet.stake; if (r.bet.won) { won++; paid += Math.floor(r.bet.stake * r.bet.pay); } }
    };
    const s = simulateRuns(base, N, 'greedy', 4242, cab, 2, true);
    // Bets lost with the run (a Dealer loss) never reach a record: count them as losses.
    const lostWithRun = offered - n;
    row.push(`${k} offered ${pct(offered, dealers)}% pay avg ${(pays.reduce((a, b) => a + b, 0) / Math.max(1, pays.length)).toFixed(1)} won ${pct(won, offered)}% return ${pct(paid, staked + lostWithRun * 5)}% (GREEN ${s.winPct.toFixed(1)})`);
  }
  console.log(`${cab.padEnd(7)} ${row.join('  |  ')}`);
}
