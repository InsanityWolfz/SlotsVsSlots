// Economy variants x shop policies. npx tsx playtest/scratch/it4_variants.ts [runs]
import { CHIPS, DRAFTS, FORKS, playRun4, Rng, SHOPS, TUNE4 } from './it4_lib';
import { DEPTH_HP, TUNE } from '../../src/core/enemies';
const N = Number(process.argv[2] ?? 2000);
const base = JSON.parse(JSON.stringify(CHIPS)); const baseHp = [...DEPTH_HP]; const bossHp = TUNE.bossHp;
const reset = () => { Object.assign(CHIPS, JSON.parse(JSON.stringify(base))); TUNE4.startChips = 0; DEPTH_HP.splice(0, 5, ...baseHp); TUNE.bossHp = bossHp; };
const V: [string, () => void][] = [
  ['A current', () => {}],
  ['B stackPer 10', () => { CHIPS.stackPer = 10; }],
  ['C stackPer 10, start 4', () => { CHIPS.stackPer = 10; TUNE4.startChips = 4; }],
  ['D stackPer 10, start 4, win 3', () => { CHIPS.stackPer = 10; TUNE4.startChips = 4; CHIPS.win = 3; }],
  ['E stackPer 8, start 4', () => { CHIPS.stackPer = 8; TUNE4.startChips = 4; }],
  ['F stack10 start4 boss60', () => { CHIPS.stackPer = 10; TUNE4.startChips = 4; TUNE.bossHp = 60; }],
];
const shops = ['never', 'simGreedy', 'spendAll', 'smart', 'healOnly', 'commit', 'random'];
console.log('variant'.padEnd(34) + shops.map((s) => s.padStart(10)).join('') + '   spread(best-never)');
for (const [name, fn] of V) {
  reset(); fn();
  const res = shops.map((s) => {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let w = 0;
    for (let i = 0; i < N; i++) if (playRun4(seeds.int(0xffffffff), s === 'commit' ? DRAFTS.commit : DRAFTS.greedy, FORKS.sim, SHOPS[s], pr, fr).won) w++;
    return (100 * w) / N;
  });
  console.log(name.padEnd(34) + res.map((r) => r.toFixed(1).padStart(10)).join('') + `   ${(Math.max(...res) - res[0]).toFixed(1)}`);
}
reset();
