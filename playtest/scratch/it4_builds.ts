// Single-fight value of committed vs spread kits incl. build relics. npx tsx playtest/scratch/it4_builds.ts [n]
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import type { Gild, StripCounts, RelicId } from '../../src/core/config';
import { BOSS_HP_PER_RELIC } from '../../src/core/relics';
import { BASE, Fight, Rng } from './it3_lib';
const N = Number(process.argv[2] ?? 3000);
const start: StripCounts[] = [0, 1, 2].map(() => ({ sword: 4, shield: 4, bolt: 4 }));
type Kit = { name: string; strips?: StripCounts[]; gilds?: Gild[]; relics?: RelicId[]; stack?: number };
const g = (enh: Gild['enh'], symbol: Gild['symbol'], reel: number): Gild => ({ enh, symbol, reel });
const wilds = (reels: number[]) => start.map((s, i) => (reels.includes(i) ? { ...s, shield: 2, wild: 2 } : { ...s }));
const two = (enh: Gild['enh'], sym: Gild['symbol']) => [g(enh, sym, 0), g(enh, sym, 1)];
const three = (enh: Gild['enh'], sym: Gild['symbol']) => [0, 1, 2].map((r) => g(enh, sym, r));
const kits: Kit[] = [
  { name: 'baseline' },
  { name: 'relic fang only', relics: ['fang'] },
  { name: 'relic battery only', relics: ['battery'] },
  { name: 'relic clover only', relics: ['clover'] },
  { name: 'relic crown only', relics: ['crown'] },
  { name: 'relic midas only', relics: ['midas'] },
  { name: 'stack 2 (10 chips) boss only', stack: 2 },
  { name: 'stack 4 (20 chips) boss only', stack: 4 },
  { name: '2x gold sword', gilds: two('gold', 'sword') },
  { name: '2x gold sword + MIDAS', gilds: two('gold', 'sword'), relics: ['midas'] },
  { name: '2x gold sword + fang', gilds: two('gold', 'sword'), relics: ['fang'] },
  { name: '2x gold bolt', gilds: two('gold', 'bolt') },
  { name: '2x gold bolt + MIDAS', gilds: two('gold', 'bolt'), relics: ['midas'] },
  { name: '2x gold bolt + fang', gilds: two('gold', 'bolt'), relics: ['fang'] },
  { name: '2x charged', gilds: two('charged', 'bolt') },
  { name: '2x charged + ROD', gilds: two('charged', 'bolt'), relics: ['rod'] },
  { name: '2x charged + fang', gilds: two('charged', 'bolt'), relics: ['fang'] },
  { name: '2x spiked', gilds: two('spiked', 'shield') },
  { name: '2x spiked + CACTUS', gilds: two('spiked', 'shield'), relics: ['cactus'] },
  { name: '2x spiked + fang', gilds: two('spiked', 'shield'), relics: ['fang'] },
  { name: '2x keen', gilds: two('keen', 'sword') },
  { name: '2x keen + HONE', gilds: two('keen', 'sword'), relics: ['hone'] },
  { name: '2x keen + fang', gilds: two('keen', 'sword'), relics: ['fang'] },
  { name: 'WILDs r1+r2', strips: wilds([0, 1]) },
  { name: 'WILDs r1+r2 + PRISM', strips: wilds([0, 1]), relics: ['prism'] },
  { name: 'WILDs r1+r2 + fang', strips: wilds([0, 1]), relics: ['fang'] },
  { name: '1x charged + ROD', gilds: [g('charged', 'bolt', 0)], relics: ['rod'] },
  { name: '1x gold bolt + MIDAS', gilds: [g('gold', 'bolt', 0)], relics: ['midas'] },
  { name: 'SPREAD gold sw r1 + chg bolt r2', gilds: [g('gold', 'sword', 0), g('charged', 'bolt', 1)] },
  { name: 'SPREAD gold sw r1 + chg r2 + fang', gilds: [g('gold', 'sword', 0), g('charged', 'bolt', 1)], relics: ['fang'] },
  { name: 'SPREAD gold sw r1 + gold bolt r2 + fang', gilds: [g('gold', 'sword', 0), g('gold', 'bolt', 1)], relics: ['fang'] },
  { name: 'SPREAD gold bolt r1 + chg r2 + ROD', gilds: [g('gold', 'bolt', 0), g('charged', 'bolt', 1)], relics: ['rod'] },
  { name: 'SPREAD gold bolt r1 + spk r2 + fang', gilds: [g('gold', 'bolt', 0), g('spiked', 'shield', 1)], relics: ['fang'] },
  { name: '3x gold bolt + MIDAS', gilds: three('gold', 'bolt'), relics: ['midas'] },
  { name: '3x charged + ROD', gilds: three('charged', 'bolt'), relics: ['rod'] },
  { name: '3x spiked + CACTUS', gilds: three('spiked', 'shield'), relics: ['cactus'] },
  { name: '3x keen + HONE', gilds: three('keen', 'sword'), relics: ['hone'] },
  { name: '3x gold sword + MIDAS', gilds: three('gold', 'sword'), relics: ['midas'] },
  { name: 'SPREAD 3 (gsw,chg,spk) + fang', gilds: [g('gold', 'sword', 0), g('charged', 'bolt', 1), g('spiked', 'shield', 2)], relics: ['fang'] },
];
const panel = [
  { name: 'brute F4', a: ARCHETYPES.find((a) => a.id === 'brute')!, d: 3 },
  { name: 'thief F4', a: ARCHETYPES.find((a) => a.id === 'thief')!, d: 3 },
  { name: 'gremlin F4', a: ARCHETYPES.find((a) => a.id === 'gremlin')!, d: 3 },
  { name: 'frost F4', a: ARCHETYPES.find((a) => a.id === 'frost')!, d: 3 },
  { name: 'HOUSE', a: BOSS, d: 5 },
];
console.log(`N=${N}/cell; player 24/32 HP; boss HP 66 + 3/relic; loss% (delta vs baseline)`);
console.log('kit'.padEnd(40) + panel.map((p) => p.name.padStart(12)).join('') + '    avg');
const baseLoss: number[] = [];
kits.forEach((k, ki) => {
  const losses: number[] = [];
  for (const p of panel) {
    if (k.stack && p.a.id !== 'house') { losses.push(baseLoss[losses.length]); continue; }
    const rng = new Rng(9000 + panel.indexOf(p));
    let lost = 0;
    for (let i = 0; i < N; i++) {
      const cfg = JSON.parse(JSON.stringify(BASE));
      const e = makeEnemy(p.a, p.d, new Rng(i * 31 + 7), p.a.id === 'house');
      const hp = p.a.id === 'house' ? e.hp + BOSS_HP_PER_RELIC * (k.relics?.length ?? 0) : e.hp;
      cfg.enemy = { hp, strips: e.strips, name: e.name, ability: e.ability, boss: e.boss };
      cfg.player = { ...cfg.player, hp: 32, startHp: 24, strips: (k.strips ?? start).map((s) => ({ ...s })), gilded: k.gilds ?? [], stackShield: k.stack ?? 0 };
      cfg.relics = k.relics ?? [];
      const f = new Fight(cfg, rng.int(0xffffffff));
      while (!f.over && f.turn < 2000) f.step();
      if (f.winner !== 'player') lost++;
    }
    losses.push(lost / N);
  }
  if (ki === 0) baseLoss.push(...losses);
  const avg = losses.reduce((a, b) => a + b, 0) / losses.length;
  console.log(k.name.padEnd(40) + losses.map((l, i) => `${(100 * l).toFixed(1)}${ki ? `(${(100 * (l - baseLoss[i])).toFixed(0)})` : ''}`.padStart(12)).join('') + `  ${(100 * avg).toFixed(1).padStart(6)}`);
});
