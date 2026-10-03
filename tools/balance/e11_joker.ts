// EXPERT_PLAYTEST_11 (throwaway): JOKER with the Bell's payoff loop closed, plus retune knobs.
// BELLX=2 PERWILD=25 HP=24 HEAL=4 npx tsx tools/balance/e11_joker.ts N [relicrows]
//   The fix: the Bell doesn't refill the meter on a payoff spin (a payoff is scored as a jackpot, so it chained: 94%).
//   BELLX: the Bell's multiplier on JOKER (now 1.25). PERWILD / HP / HEAL in x10 units (now 20 / 22 / 3).
import { defaultConfig, UNIT } from '../../src/core/config';
import { CABINETS } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const LOOP = process.env.LOOP === '1'; // keep the loop (control)
const BELLX = Number(process.env.BELLX ?? 1.25);
const j = CABINETS.joker as { hp: number; meter: { perWild?: number; heal: number } };
if (process.env.PERWILD) j.meter.perWild = Number(process.env.PERWILD) * UNIT / 10;
if (process.env.HP) j.hp = Number(process.env.HP) * UNIT;
if (process.env.HEAL) j.meter.heal = Number(process.env.HEAL) * UNIT;
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const oScore = P.score, oPay = P.payoff, oFill = P.fillMeter;
type G = { amount: number; notes?: string[]; symbol: string };
P.score = function (this: Record<string, unknown>, me: { side: string }, line: unknown) {
  if (me.side === 'player') this._paid = false;
  const s = oScore.call(this, me, line) as { groups: G[]; totals: Record<string, number> };
  if (BELLX !== 1.25 && me.side === 'player' && (this as { meter?: { kind: string } }).meter?.kind === 'jackpots') {
    let changed = false;
    for (const g of s.groups) if (g.notes?.includes('X1.25')) { g.amount = Math.round((g.amount * BELLX) / 1.25); changed = true; }
    if (changed) { s.totals = {}; for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount; }
  }
  return s;
};
P.payoff = function (this: Record<string, unknown>, me: unknown, score: { jackpots?: boolean }, ev: unknown) {
  if (score.jackpots) this._paid = true;
  return oPay.call(this, me, score, ev);
};
P.fillMeter = function (this: Record<string, unknown>, me: unknown, amount: unknown, reels: unknown, events: { type: string; relic?: string }[], e: unknown) {
  const last = events[events.length - 1];
  if (!LOOP && this._paid && last?.type === 'relic' && last.relic === 'bell') return;
  return oFill.call(this, me, amount, reels, events, e);
};
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'joker', 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'joker', 2, true);
let rows = '';
if (process.argv[3] === 'relicrows') {
  SIM_BIAS.noStart = true;
  const b = simulateRuns(defaultConfig(), N, 'greedy', 777, 'joker', 2, true).winPct;
  SIM_BIAS.startRelic = 'bell';
  const bb = simulateRuns(defaultConfig(), N, 'greedy', 777, 'joker', 2, true).winPct;
  rows = ` | builds-style JOKER baseline ${b.toFixed(1)} +bell ${bb.toFixed(1)}`;
}
console.log(`${LOOP ? 'LOOP' : 'FIXED'} bellx ${BELLX} perWild ${j.meter.perWild} hp ${j.hp} heal ${j.meter.heal}: JOKER WHITE ${w.winPct.toFixed(1)} GREEN ${g.winPct.toFixed(1)} (Dealer ${g.dealerWinPct.toFixed(0)})${rows}`);
