// Stake rule candidates, each alone vs base (commit, paired, no act 3). npx tsx playtest/scratch/it12p_rules.ts [N]
import { CABINET_ORDER, fullRuns, onlyRules, pairedDiff, type Policy, type RunRec } from './it12p_lib';
import { STAKE } from '../../src/core/stakes';

const N = Number(process.argv[2] ?? 1500);
const POL: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const W = (rs: RunRec[]) => rs.map((r) => r.won);
const sd = (d: [number, number]) => `${d[0] >= 0 ? '+' : ''}${d[0].toFixed(1)}±${d[1].toFixed(1)}`;
const C: [string, string[], () => void][] = [
  ['SCARS every 3 (current)', ['scars'], () => { STAKE.scarEvery = 3; }],
  ['SCARS every 4', ['scars'], () => { STAKE.scarEvery = 4; }],
  ['SCARS every 5', ['scars'], () => { STAKE.scarEvery = 5; }],
  ['BLACK 3 bombs/reel (current)', ['houseDirty'], () => { STAKE.scarEvery = 3; STAKE.houseBombsPerReel = 3; }],
  ['BLACK 5 bombs/reel', ['houseDirty'], () => { STAKE.houseBombsPerReel = 5; }],
];
for (const [name, rules, set] of C) {
  const cells = CABINET_ORDER.map((cab) => {
    onlyRules([]); const base = fullRuns(cab, POL, N, 1);
    set(); onlyRules(rules); const rs = fullRuns(cab, POL, N, 1);
    return `${cab} ${sd(pairedDiff(W(rs), W(base)))}`;
  });
  console.log(`${name.padEnd(30)} ${cells.join('  ')}`);
}
onlyRules(null); STAKE.houseBombsPerReel = 3; STAKE.scarEvery = 3;
