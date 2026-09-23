import { defaultConfig } from '../../src/core/config';
import { CABINETS, CABINET_ORDER } from '../../src/core/cabinets';
import { DEPTH_HP, TUNE } from '../../src/core/enemies';
import { simulateRuns } from '../../src/sim/simulateRun';

const baseHp = [...DEPTH_HP];
const N = 1200;
function report(label: string) {
  const row = CABINET_ORDER.map((c) => `${c} ${simulateRuns(defaultConfig(), N, 'greedy', 77, c).winPct.toFixed(0)}`).join('  ');
  const rnd = simulateRuns(defaultConfig(), N, 'random', 77, 'knight').winPct.toFixed(0);
  console.log(`${label.padEnd(34)} ${row}   knight-random ${rnd}`);
}
// Cabinet nerfs under test.
CABINETS.tesla.hp = 26;
CABINETS.tesla.specialDamage = 7;
CABINETS.joker.hp = 26;
DEPTH_HP.splice(0, 5, ...baseHp.map((h) => Math.round(h * 1.1)));
TUNE.bossHp = 74;
CABINETS.thorn.strips = [0,1,2].map(() => ({ sword: 4, shield: 4, bolt: 4 })); CABINETS.thorn.gilded = [{ reel: 0, symbol: 'shield', enh: 'spiked' }]; CABINETS.thorn.hp = 28; CABINETS.thorn.enemyAbilityMinus = 0;
const variants: [string, () => void][] = [
  ['midas swords hp22 chip0', () => { CABINETS.midas.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold' }]; CABINETS.midas.hp = 22; CABINETS.midas.chipsPerWin = 0; }],
  ['midas swords hp22 chip1', () => { CABINETS.midas.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold' }]; CABINETS.midas.hp = 22; CABINETS.midas.chipsPerWin = 1; }],
  ['midas swords hp24 chip0 no favor', () => { CABINETS.midas.gilded = [{ reel: 0, symbol: 'sword', enh: 'gold' }]; CABINETS.midas.hp = 24; CABINETS.midas.chipsPerWin = 0; CABINETS.midas.favors = null; }],
];
for (const [name, fn] of variants) { fn(); const r = simulateRuns(defaultConfig(), 1500, 'greedy', 77, 'midas'); console.log(name.padEnd(36), r.winPct.toFixed(1)); }
