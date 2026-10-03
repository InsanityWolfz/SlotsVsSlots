// EXPERT_PLAYTEST_11 (throwaway): JACKPOT BELL on JOKER. A JOKER payoff spin is scored as tier 'triple', so the Bell
// refills the meter on every payoff: does it chain? npx tsx tools/balance/e11_bell.ts N [fix]
//   fix=0: current rules, counts payoffs and back-to-back payoffs.
//   fix=1: the Bell doesn't refill the meter on a payoff spin (natural jackpots still fill it).
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
const FIX = process.argv[3] === '1';
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const st = { spins: 0, payoffs: 0, chained: 0 };
const origScore = P.score, origPayoff = P.payoff, origFill = P.fillMeter;
P.score = function (this: Record<string, unknown>, me: { side: string }, line: unknown) {
  if (me.side === 'player') {
    st.spins++;
    this._prevPaid = this._paid;
    this._paid = false;
  }
  return origScore.call(this, me, line);
};
P.payoff = function (this: Record<string, unknown>, me: unknown, score: { jackpots?: boolean }, ev: unknown) {
  if (score.jackpots) {
    st.payoffs++;
    if (this._prevPaid) st.chained++;
    this._paid = true;
  }
  return origPayoff.call(this, me, score, ev);
};
P.fillMeter = function (this: Record<string, unknown>, me: unknown, amount: unknown, reels: unknown, events: { type: string; relic?: string }[], earthed: unknown) {
  const last = events[events.length - 1];
  if (FIX && this._paid && last?.type === 'relic' && last.relic === 'bell') return;
  return origFill.call(this, me, amount, reels, events, earthed);
};

SIM_BIAS.noStart = true;
for (const r of [undefined, 'bell'] as const) {
  SIM_BIAS.startRelic = r;
  st.spins = st.payoffs = st.chained = 0;
  const w = CABINET_ORDER.map((cab) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct);
  console.log(`${FIX ? 'FIX ' : 'NOW '}${(r ?? 'BASELINE').padEnd(9)} ${(w.reduce((a, b) => a + b, 0) / 5).toFixed(1)} | ${w.map((x) => x.toFixed(1)).join(' ')} | all machines: payoff spins ${((100 * st.payoffs) / st.spins).toFixed(1)}% of player spins, back-to-back ${((100 * st.chained) / Math.max(1, st.payoffs)).toFixed(0)}% of payoffs`);
}
// Official-style JOKER row (greedy drafts, no forced relic).
SIM_BIAS.noStart = false;
SIM_BIAS.startRelic = undefined;
const wj = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, 'joker', 0);
const gj = simulateRuns(defaultConfig(), N * 2, 'greedy', 4242, 'joker', 2, true);
console.log(`${FIX ? 'FIX' : 'NOW'} JOKER official-style: WHITE ${wj.winPct.toFixed(1)} GREEN ${gj.winPct.toFixed(1)}`);
