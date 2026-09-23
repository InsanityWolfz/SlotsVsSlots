// Dealer sweep at GREEN stake (act 3 regulars: +3 sevens).  npx tsx playtest/scratch/it12_act3.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import { DEALER, DEPTH_HP_3, TUNE } from '../../src/core/enemies';
import { simulateRuns } from '../../src/sim/simulateRun';
const N = Number(process.argv[2] ?? 500);
TUNE.act3Sevens = 3; DEPTH_HP_3.splice(0, 3, 120, 140, 160);
const V: [string, () => void][] = [
  ['D 7x9 sw2 p5+170', () => { TUNE.dealerPower = 5; TUNE.dealerFlat = 170; DEALER.strip = { seven: 9, sword: 2, shield: 2, card: 2 }; }],
  ['D 7x9 sw2 p6+190', () => { TUNE.dealerPower = 6; TUNE.dealerFlat = 190; DEALER.strip = { seven: 9, sword: 2, shield: 2, card: 2 }; }],
];
for (const [name, set] of V) {
  set();
  let agg = 0;
  const row = CABINET_ORDER.map((c) => {
    const s = simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
    agg += s.dealerWinPct;
    return `${c} ${s.winPct.toFixed(1)} D${s.dealerWinPct.toFixed(0)}`;
  });
  console.log(`${name}: ${row.join(' | ')}  avgD ${(agg / 5).toFixed(0)}%`);
}
