// EXPERT_PLAYTEST_10 (throwaway): builds.ts relic rows, sharded. npx tsx tools/balance/e10_relics.ts N shard shards
import { defaultConfig, type RelicId } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { RELIC_TIER } from '../../../src/core/relics';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 100), k = Number(process.argv[3] ?? 0), K = Number(process.argv[4] ?? 1);
SIM_BIAS.noStart = true;
const all = [...RELIC_TIER.common, ...RELIC_TIER.uncommon, ...RELIC_TIER.legendary] as RelicId[];
const rows: (RelicId | undefined)[] = [undefined, ...all.filter((_, i) => i % K === k)];
for (const r of rows) {
  SIM_BIAS.startRelic = r;
  const w = CABINET_ORDER.map((cab) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true).winPct);
  console.log(`${(r ? '+' + r : 'BASELINE').padEnd(12)} ${(w.reduce((a, b) => a + b, 0) / 5).toFixed(1).padStart(5)} | ${w.map((x) => x.toFixed(1).padStart(5)).join(' ')}`);
}
