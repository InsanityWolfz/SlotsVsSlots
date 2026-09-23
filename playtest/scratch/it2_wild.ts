// Next-feature estimate: a WILD cell on reel 2 vs other strip cards (single fights). npx tsx playtest/scratch/it2_wild.ts
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, Rng } from './it2_lib';
const proto = Fight.prototype as any;
const origScore = proto.score;
proto.score = function (me: any, line: string[]) {
  if (!line.includes('wild')) return origScore.call(this, me, line);
  const cands = ['sword', 'shield', 'bolt'];
  let best: any = null, bestV = -1;
  for (const c of cands) {
    const l = line.map((s) => (s === 'wild' ? c : s));
    const sc = origScore.call(this, me, l);
    const v = (sc.totals.sword ?? 0) + 2 * (sc.totals.bolt ?? 0) + 0.7 * (sc.totals.shield ?? 0) + (sc.tier === 'triple' ? 5 : 0);
    if (v > bestV) { bestV = v; best = sc; }
  }
  return best;
};
const kits: [string, any[]][] = [
  ['base 4/4/4', [0, 1, 2].map(() => ({ sword: 4, shield: 4, bolt: 4 }))],
  ['+1 bolt r2', [{ sword: 4, shield: 4, bolt: 4 }, { sword: 4, shield: 4, bolt: 5 }, { sword: 4, shield: 4, bolt: 4 }]],
  ['swap 2 shields->bolts r1', [{ sword: 4, shield: 2, bolt: 6 }, { sword: 4, shield: 4, bolt: 4 }, { sword: 4, shield: 4, bolt: 4 }]],
  ['1 shield->WILD r2', [{ sword: 4, shield: 4, bolt: 4 }, { sword: 4, shield: 3, bolt: 4, wild: 1 }, { sword: 4, shield: 4, bolt: 4 }]],
  ['1 shield->WILD r3', [{ sword: 4, shield: 4, bolt: 4 }, { sword: 4, shield: 4, bolt: 4 }, { sword: 4, shield: 3, bolt: 4, wild: 1 }]],
];
const foes: [string, any][] = [['brute@F4', makeEnemy(ARCHETYPES.find((a) => a.id === 'brute')!, 3, new Rng(1))], ['thief@F4', makeEnemy(ARCHETYPES.find((a) => a.id === 'thief')!, 3, new Rng(1))], ['house', makeEnemy(BOSS, 5, new Rng(1), true)]];
for (const [k, strips] of kits) {
  const row = foes.map(([n, e]) => {
    const cfg = cloneConfig(BASE); cfg.player = { ...cfg.player, hp: 36, startHp: 36, strips }; cfg.enemy = { hp: e.hp, strips: e.strips, ability: e.ability, boss: e.boss };
    const rng = new Rng(3); let l = 0; const N = 8000;
    for (let i = 0; i < N; i++) { const f = new Fight(cfg, rng.int(0xffffffff)); while (!f.over) f.step(); if (f.winner !== 'player') l++; }
    return `${n} ${(100 * l / N).toFixed(1)}%`;
  });
  console.log(k.padEnd(26), row.join('  '));
}
