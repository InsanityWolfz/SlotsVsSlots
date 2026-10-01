// THE REPO MAN tuning: WHITE win and fight-4 death rate per machine under a variant. npx tsx tools/balance/repo_tune.ts [N] [key=val ...]
// Keys: hp (REPO_MAN.hpMul), sword, shield, every, takes (GATEKEEPER.maxTakes), bounty, price.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { GATEKEEPER, REPO_MAN } from '../../src/core/enemies';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 600);
for (const kv of process.argv.slice(3)) {
  const [k, v] = kv.split('='); const x = Number(v);
  if (k === 'hp') REPO_MAN.hpMul = x;
  else if (k === 'sword') REPO_MAN.strip.sword = x;
  else if (k === 'shield') REPO_MAN.strip.shield = x;
  else if (k === 'every') REPO_MAN.ability!.every = x;
  else if (k === 'takes') GATEKEEPER.maxTakes = x;
  else if (k === 'bounty') GATEKEEPER.bounty = x;
  else if (k === 'price') GATEKEEPER.lienPrice = x;
}
const f = (x: number) => x.toFixed(1).padStart(5);
let tw = 0, tg = 0, d4 = 0;
for (const cab of CABINET_ORDER) {
  const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 0);
  const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, cab, 2, true);
  tw += w.winPct; tg += g.winPct;
  const dg = (w.deathsAtDepth[3] + w.deathsAtDepth[9]) / 2; d4 += dg;
  console.log(`${cab.padEnd(7)} WHITE ${f(w.winPct)} GREEN ${f(g.winPct)} | gate deaths A4 ${f(w.deathsAtDepth[3])} B4 ${f(w.deathsAtDepth[9])} (fight 3 ${f(w.deathsAtDepth[2])}, 5 ${f(w.deathsAtDepth[4])})`);
}
const n = CABINET_ORDER.length;
console.log(`AVG     WHITE ${f(tw / n)} GREEN ${f(tg / n)} | gate deaths avg ${f(d4 / n)}  (${process.argv.slice(3).join(' ') || 'current'})`);
