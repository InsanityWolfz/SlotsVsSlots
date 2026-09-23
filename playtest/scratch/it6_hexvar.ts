import { Fight } from '../../src/core/fight';
import { avg, batch, CABINET_ORDER, pct } from './it6_lib';
const P: any = Fight.prototype;
const origWrite = P.write;
function run(label: string) {
  const fs = CABINET_ORDER.flatMap((c) => batch(c, { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' }, 500, 222)).flatMap((r) => r.fights).filter((f) => f.arch === 'hexer');
  console.log(`${label.padEnd(34)} hexer fights ${fs.length} death ${pct(fs.filter((f) => !f.won).length, fs.length)}% hpLost ${(100 * avg(fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}% hexed spins ${pct(fs.reduce((a, f) => a + f.hexedSpins, 0), fs.reduce((a, f) => a + f.spins, 0))}% turns ${avg(fs.map((f) => f.turns)).toFixed(1)}`);
}
run('current');
P.write = function (me: any, foe: any, sym: string, amount: number, reels: number[], events: any[]) {
  if (sym === 'hex' && amount < 4) { events.push({ type: 'fizzle', side: me.side, reels, symbol: 'hex' }); return; }
  return origWrite.call(this, me, foe, sym, amount, reels, events);
};
run('single hexes fizzle');
