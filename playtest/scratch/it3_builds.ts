// Single-fight value of gild / wild / strip configurations vs a panel of enemies. npx tsx playtest/scratch/it3_builds.ts [n]
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import type { Gild, StripCounts, RelicId } from '../../src/core/config';
import { BASE, Fight, Rng } from './it3_lib';
import { playFight } from './it3_lib';

const N = Number(process.argv[2] ?? 4000);
const start: StripCounts[] = [0, 1, 2].map(() => ({ sword: 4, shield: 4, bolt: 4 }));
type Kit = { name: string; strips?: StripCounts[]; gilds?: Gild[]; hp?: number; relics?: RelicId[] };
const g = (enh: Gild['enh'], symbol: Gild['symbol'], reel: number): Gild => ({ enh, symbol, reel });
const withSwap = (reel: number, from: 'shield', to: 'wild' | 'bolt' | 'sword', n: number) => start.map((s, i) => (i === reel ? { ...s, [from]: (s[from] ?? 0) - n, [to]: ((s as any)[to] ?? 0) + n } : { ...s }));

const kits: Kit[] = [
  { name: 'baseline' },
  { name: '+4 max HP', hp: 4 },
  { name: 'heal 8 (from 24/32)', hp: -99 },
  ...(['sword', 'bolt', 'shield'] as const).flatMap((s) => [0, 1, 2].map((r) => ({ name: `gold ${s} r${r + 1}`, gilds: [g('gold', s, r)] }))),
  ...[0, 1, 2].map((r) => ({ name: `keen sword r${r + 1}`, gilds: [g('keen', 'sword', r)] })),
  ...[0, 1, 2].map((r) => ({ name: `charged bolt r${r + 1}`, gilds: [g('charged', 'bolt', r)] })),
  ...[0, 1, 2].map((r) => ({ name: `spiked shield r${r + 1}`, gilds: [g('spiked', 'shield', r)] })),
  ...[0, 1, 2].map((r) => ({ name: `1 shield->WILD r${r + 1}`, strips: withSwap(r, 'shield', 'wild', 1) })),
  ...[0, 1, 2].map((r) => ({ name: `3 shield->bolt r${r + 1}`, strips: withSwap(r, 'shield', 'bolt', 3) })),
  ...[0, 1, 2].map((r) => ({ name: `3 shield->sword r${r + 1}`, strips: withSwap(r, 'shield', 'sword', 3) })),
  ...[0, 1, 2].map((r) => ({ name: `+2 bolt r${r + 1}`, strips: start.map((s, i) => (i === r ? { ...s, bolt: 6 } : { ...s })) })),
  // builds: 2 gilds
  { name: 'BUILD gold sword r1+r2', gilds: [g('gold', 'sword', 0), g('gold', 'sword', 1)] },
  { name: 'BUILD gold sword r1+r2+r3', gilds: [g('gold', 'sword', 0), g('gold', 'sword', 1), g('gold', 'sword', 2)] },
  { name: 'BUILD gold bolt r1+r2', gilds: [g('gold', 'bolt', 0), g('gold', 'bolt', 1)] },
  { name: 'BUILD charged bolt r1+r2', gilds: [g('charged', 'bolt', 0), g('charged', 'bolt', 1)] },
  { name: 'BUILD charged bolt x3', gilds: [0, 1, 2].map((r) => g('charged', 'bolt', r)) },
  { name: 'BUILD keen sword x3', gilds: [0, 1, 2].map((r) => g('keen', 'sword', r)) },
  { name: 'BUILD spiked shield x3', gilds: [0, 1, 2].map((r) => g('spiked', 'shield', r)) },
  { name: 'SPREAD gold sword r1 + charged bolt r2', gilds: [g('gold', 'sword', 0), g('charged', 'bolt', 1)] },
  { name: 'SPREAD gold sword r1 + gold bolt r2', gilds: [g('gold', 'sword', 0), g('gold', 'bolt', 1)] },
  { name: 'SPREAD gold sword r1 + spiked sh r2', gilds: [g('gold', 'sword', 0), g('spiked', 'shield', 1)] },
  { name: 'SPREAD gold sw r1, chg bolt r2, spk sh r3', gilds: [g('gold', 'sword', 0), g('charged', 'bolt', 1), g('spiked', 'shield', 2)] },
  { name: 'BUILD gold bolt r1+r2 + chg bolt r3', gilds: [g('gold', 'bolt', 0), g('gold', 'bolt', 1), g('charged', 'bolt', 2)] },
];

const panel = [
  { name: 'brute F4', a: ARCHETYPES.find((a) => a.id === 'brute')!, d: 3 },
  { name: 'thief F4', a: ARCHETYPES.find((a) => a.id === 'thief')!, d: 3 },
  { name: 'frost F4', a: ARCHETYPES.find((a) => a.id === 'frost')!, d: 3 },
  { name: 'slime F4', a: ARCHETYPES.find((a) => a.id === 'slime')!, d: 3 },
  { name: 'HOUSE', a: BOSS, d: 5 },
];
console.log(`N=${N} fights per cell, player 32 max HP starting at 24 (boss: 26/34-ish typical)`);
console.log('kit'.padEnd(42) + panel.map((p) => p.name.padStart(10)).join('') + '     avg   bossTurns  maxHit');
const baseLoss: number[] = [];
kits.forEach((k, ki) => {
  const losses: number[] = [];
  let bossTurns = 0, maxHit = 0;
  for (const p of panel) {
    const rng = new Rng(9000 + ki * 0 + panel.indexOf(p)); // same seeds across kits
    let lost = 0;
    for (let i = 0; i < N; i++) {
      const cfg = JSON.parse(JSON.stringify(BASE));
      const e = makeEnemy(p.a, p.d, new Rng(i * 31 + 7), p.a.id === 'house');
      cfg.enemy = { hp: e.hp, strips: e.strips, name: e.name, ability: e.ability, boss: e.boss };
      const maxHp = 32 + (k.hp && k.hp > 0 ? k.hp : 0);
      cfg.player = { ...cfg.player, hp: maxHp, startHp: k.hp === -99 ? 32 : 24 + (k.hp && k.hp > 0 ? k.hp : 0), strips: (k.strips ?? start).map((s) => ({ ...s })), gilded: k.gilds ?? [] };
      cfg.relics = k.relics ?? [];
      const f = new Fight(cfg, rng.int(0xffffffff));
      let mh = 0;
      while (!f.over && f.turn < 2000) { const r = f.step(); for (const ev of r.events) if (ev.type === 'attack' && ev.from === 'player') mh = Math.max(mh, ev.amount); }
      maxHit = Math.max(maxHit, mh);
      if (f.winner !== 'player') lost++;
      if (p.a.id === 'house') bossTurns += f.turn;
    }
    losses.push(lost / N);
  }
  if (ki === 0) baseLoss.push(...losses);
  const avg = losses.reduce((a, b) => a + b, 0) / losses.length;
  console.log(k.name.padEnd(42) + losses.map((l, i) => `${(100 * l).toFixed(1)}${ki ? `(${(100 * (l - baseLoss[i])).toFixed(0)})` : ''}`.padStart(10)).join('') + `  ${(100 * avg).toFixed(1).padStart(6)}   ${(bossTurns / N).toFixed(1).padStart(6)}  ${maxHit}`);
});
void playFight;
