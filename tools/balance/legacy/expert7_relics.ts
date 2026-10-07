// EXPERT_PLAYTEST_7 throwaway: do the bet relics make a betting build, and is there an exploit?
// npx tsx tools/balance/expert7_relics.ts [N] [policy] ; env CAB, RELICS=marker,loaded,highlimit, STAKE (0 WHITE / 2 GREEN)
// policies: none | five | allin | marker (ALL IN while this act's MARKER is unused, else 2-stake) | keep10 (5 if chips-5 >= 10)
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { allInStake, betStakes, betsOpen, offerBets, placeBet, type RunState } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import type { RelicId } from '../../../src/core/relics';

const N = Number(process.argv[2] ?? 200);
const POLICY = process.argv[3] ?? 'allin';
const STAKE = Number(process.env.STAKE ?? 2);
const RELICS = (process.env.RELICS ?? '').split(',').filter(Boolean) as RelicId[];
const base = defaultConfig();
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');

for (const cab of CABINET_ORDER.filter((c) => !process.env.CAB || c === process.env.CAB)) {
  const setup = (run: RunState) => { for (const r of RELICS) if (!run.player.relics.includes(r)) run.player.relics.push(r); run.betsPlaced ??= 0; };
  // Baseline: same relics, no bets (relics injected at the first fight so the start pick is untouched).
  SIM_BIAS.onEnd = undefined;
  SIM_BIAS.onFight = (run) => setup(run);
  const plain = simulateRuns(base, N, 'greedy', 777, cab, STAKE, STAKE >= 2);
  let staked = 0, paid = 0, n = 0, won = 0, refunded = 0, dealerN = 0, dealerNet = 0, endChips = 0, runs = 0;
  const netPerRun: number[] = [];
  SIM_BIAS.onFight = (run: RunState) => {
    setup(run);
    if (POLICY === 'none' || !betsOpen(run)) return;
    const offer = offerBets(run, base);
    if (!offer.length) return;
    const [lo, hi] = betStakes(run);
    const act = `${run.act}:${run.endless?.loop ?? 0}`;
    let st = 0;
    if (POLICY === 'five') st = hi;
    else if (POLICY === 'allin') st = allInStake(run);
    else if (POLICY === 'keep10') st = run.player.chips - hi >= 10 ? hi : 0;
    else if (POLICY === 'marker') st = run.player.relics.includes('marker') && run.markerUsed !== act ? allInStake(run) : lo;
    // pick the lower-pay bet (higher odds) when both offered
    const i = offer.length > 1 && offer[1].pay < offer[0].pay ? 1 : 0;
    if (st > 0 && st <= run.player.chips) placeBet(run, i, st);
  };
  SIM_BIAS.onEnd = (run: RunState) => {
    runs++;
    let net = 0;
    for (const r of run.records) {
      if (!r.bet) continue;
      n++; staked += r.bet.stake;
      const back = r.bet.won ? Math.floor(r.bet.stake * r.bet.pay) : r.bet.refunded ? Math.min(r.bet.stake, run.player.relics.includes('highlimit') ? 10 : 5) : 0;
      paid += back; net += back - r.bet.stake;
      if (r.bet.won) won++;
      if (r.bet.refunded) refunded++;
      if (r.bet.kind === 'early' || r.bet.kind === 'survive') { dealerN++; dealerNet += back - r.bet.stake; }
    }
    // A lost fight ends the run before its bet settles: count that stake as lost.
    if (run.bet) { n++; staked += run.bet.stake; net -= run.bet.stake; if (run.bet.kind === 'early' || run.bet.kind === 'survive') { dealerN++; dealerNet -= run.bet.stake; } }
    netPerRun.push(net);
    endChips += run.player.chips;
  };
  const bet = simulateRuns(base, N, 'greedy', 777, cab, STAKE, STAKE >= 2);
  const s = [...netPerRun].sort((a, b) => a - b);
  console.log(`${cab.padEnd(6)} ${POLICY.padEnd(6)} [${RELICS.join('+') || '-'}] win ${plain.winPct.toFixed(1)} -> ${bet.winPct.toFixed(1)} | bets ${(n / runs).toFixed(1)}/run won ${pct(won, n)}% refunded ${pct(refunded, n)}% return ${pct(paid, staked)}% | net chips/run p10/p50/p90 ${s[Math.floor(0.1 * (s.length - 1))]}/${s[Math.floor(0.5 * (s.length - 1))]}/${s[Math.floor(0.9 * (s.length - 1))]} | dealer bets ${dealerN} net ${dealerNet}`);
}
