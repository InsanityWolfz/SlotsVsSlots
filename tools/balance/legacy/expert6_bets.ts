// EXPERT_PLAYTEST_6 throwaway: is the SIDE BET choice solved, and does the bet stay live (tension)?
// npx tsx tools/balance/expert6_bets.ts [N] [stake 0|2]
// For every regular fight with a table, BOTH offered bets are checked against 2 fresh sample fights of the same
// config (the real fight uses a random seed too), so nothing in the run changes.
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { Rng } from '../../../src/core/rng';
import { betState, newTrack, trackEvent, type SideBet } from '../../../src/core/bets';
import { betsOpen, fightConfig, offerBets, type RunState } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 200);
const STAKE = Number(process.argv[3] ?? 2);
const base = defaultConfig();
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) * p)] : NaN; };

type Agg = { n: number; won: number; ret: number; settleFrac: number[]; lastLive: number; early: number };
const agg = () => ({ n: 0, won: 0, ret: 0, settleFrac: [] as number[], lastLive: 0, early: 0 });
const all: Record<string, Agg> = {};
const add = (k: string, b: SideBet, r: { won: boolean; frac: number; lastLive: boolean }) => {
  const a = (all[k] ??= agg());
  a.n++;
  if (r.won) { a.won++; a.ret += b.pay; }
  a.settleFrac.push(r.frac);
  if (r.lastLive) a.lastLive++;
  if (r.frac <= 0.34) a.early++;
};

let tables = 0, regular = 0, zeroDmg = 0, zeroDmgWithTable = 0, zeroDmgLive = 0, twoSame = 0;
const chipsAt: Record<number, number[]> = { 1: [], 2: [], 3: [] };
const pol: Record<string, [number, number]> = {};
const polAdd = (k: string, b: SideBet, won: boolean) => { const p = (pol[k] ??= [0, 0]); p[0]++; if (won) p[1] += b.pay; };
const rng = new Rng(777);

function play(run: RunState, bets: SideBet[]) {
  const f = new Fight(fightConfig(run, base), rng.int(0xffffffff));
  const t = newTrack();
  const settled: number[] = bets.map(() => -1);
  const liveBeforeEnd: boolean[] = bets.map(() => false);
  while (!f.over && f.turn < 400) {
    for (const e of f.step().events) trackEvent(t, e);
    bets.forEach((b, i) => { if (settled[i] < 0 && betState(b, t, false) !== 'live') settled[i] = t.spins; });
  }
  const win = f.winner === 'player';
  const res = bets.map((b, i) => {
    const st = win ? betState(b, t, true) : 'lost';
    const at = settled[i] >= 0 ? settled[i] : t.spins;
    // "live into the last 2 spins": not settled before the fight's final 2 player spins
    liveBeforeEnd[i] = at >= t.spins - 1;
    return { won: st === 'won', frac: t.spins ? at / t.spins : 1, lastLive: liveBeforeEnd[i] };
  });
  return { res, lost: t.lost, win };
}

for (const cab of CABINET_ORDER.filter((c) => !process.env.CAB || c === process.env.CAB)) {
  SIM_BIAS.onFight = (run: RunState) => {
    if (run.enemies[run.depth].isBoss || run.endless) return;
    regular++;
    const offer = betsOpen(run) ? offerBets(run, base) : [];
    if (offer.length) { tables++; chipsAt[run.act]?.push(run.player.chips); }
    if (offer.length === 2 && offer[0].kind === offer[1].kind) twoSame++;
    for (let rep = 0; rep < 2; rep++) {
      const { res, lost } = play(run, offer);
      if (lost === 0 && run.act > 1) { zeroDmg++; if (offer.length) { zeroDmgWithTable++; } }
      offer.forEach((b, i) => {
        add(`kind ${b.kind}`, b, res[i]);
        add(`pay x${b.pay}`, b, res[i]);
        add(`act ${run.act}`, b, res[i]);
        add(`${cab}`, b, res[i]);
        if (lost === 0 && run.act > 1 && res[i].lastLive) zeroDmgLive += 1 / offer.length;
      });
      if (offer.length === 2) {
        polAdd('first', offer[0], res[0].won);
        const x3 = offer.findIndex((b) => b.pay === 3);
        const j = x3 >= 0 ? x3 : 0;
        polAdd('x3 if offered', offer[j], res[j].won);
        for (const k of ['quick', 'clean', 'jackpot', 'big']) {
          const i = offer.findIndex((b) => b.kind === k);
          const jj = i >= 0 ? i : 0;
          polAdd(`prefer ${k}`, offer[jj], res[jj].won);
        }
        const best = res[0].won ? offer[0].pay : 0, best2 = res[1].won ? offer[1].pay : 0;
        const p = (pol['oracle (either)'] ??= [0, 0]); p[0]++; p[1] += Math.max(best, best2);
      }
    }
  };
  simulateRuns(base, N, 'greedy', 4242, cab, STAKE, STAKE >= 2);
}
SIM_BIAS.onFight = undefined;
console.log(`stake ${STAKE}, N ${N}/machine. regular fights ${regular}, with a table ${pct(tables, regular)}%, both bets same kind ${twoSame}`);
console.log(`chips at the table p25/p50/p75: ` + [1, 2, 3].map((a) => `act${a} ${q(chipsAt[a], 0.25)}/${q(chipsAt[a], 0.5)}/${q(chipsAt[a], 0.75)}`).join('  '));
console.log(`act2-3 zero-damage sample fights: ${zeroDmg}, with a table ${pct(zeroDmgWithTable, zeroDmg)}%, bet live into the last 2 spins ${pct(zeroDmgLive, zeroDmgWithTable)}%`);
console.log('group            n    won%   return%  settle@ p25/p50/p75 of fight   live-to-last-2%  settled-in-first-third%');
for (const [k, a] of Object.entries(all)) console.log(`${k.padEnd(14)} ${String(a.n).padStart(6)} ${pct(a.won, a.n).padStart(6)} ${pct(a.ret, a.n).padStart(8)}   ${[0.25, 0.5, 0.75].map((p) => q(a.settleFrac, p).toFixed(2)).join('/')}   ${pct(a.lastLive, a.n).padStart(10)}   ${pct(a.early, a.n).padStart(10)}`);
console.log('choice policy (return per chip staked, 2-bet tables only):');
for (const [k, [n, r]] of Object.entries(pol)) console.log(`  ${k.padEnd(16)} ${pct(r, n)}%  (n ${n})`);
