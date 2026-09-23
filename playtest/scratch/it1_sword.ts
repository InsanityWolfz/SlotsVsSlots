// Is sword vs bolt fixable by special tuning? Avg fight loss% across the 6 regular archetypes + boss at depth 4.
import type { StripCounts } from '../../src/core/config';
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, Rng } from './it1_lib';

const N = 2500;
const rng = new Rng(9);
const foes = [...ARCHETYPES.map((a) => makeEnemy(a, 3, new Rng(1))), makeEnemy(BOSS, 5, new Rng(1), true)];
foes.forEach((f, i) => (f.strips = [0, 1, 2].map(() => ({ ...(i < ARCHETYPES.length ? ARCHETYPES[i].strip : BOSS.strip) }))));
const mods: [string, (s: StripCounts[]) => void][] = [
  ['base', () => {}],
  ['+sword r1', (s) => (s[0].sword! += 1)],
  ['+bolt r1', (s) => (s[0].bolt! += 1)],
  ['+2 bolt r1', (s) => (s[0].bolt! += 2)],
  ['shield->bolt r1 x2', (s) => { s[0].shield! -= 2; s[0].bolt! += 2; }],
  ['shield->sword r1 x2', (s) => { s[0].shield! -= 2; s[0].sword! += 2; }],
];
for (const [label, tweak] of [
  ['special 10/5 (now)', () => {}],
  ['special 8/5', (c: any) => (c.specialDamage = 8)],
  ['special 10/6', (c: any) => (c.specialCost = 6)],
  ['special 8/5 + sword base 2 on pairs? (pairMult 3)', (c: any) => { c.specialDamage = 8; c.pairMult = 3; }],
] as [string, (c: any) => void][]) {
  const row: string[] = [];
  for (const [name, m] of mods) {
    let loss = 0, tot = 0;
    for (const foe of foes) {
      const cfg = cloneConfig(BASE);
      tweak(cfg);
      cfg.player = { ...cfg.player, hp: 32, startHp: 32, strips: cfg.player.strips.map((s) => ({ ...s })) };
      m(cfg.player.strips);
      cfg.enemy = { hp: foe.hp, strips: foe.strips, ability: foe.ability, boss: foe.boss };
      for (let i = 0; i < N; i++) {
        const f = new Fight(cfg, rng.int(0xffffffff));
        while (!f.over) f.step();
        if (f.winner !== 'player') loss++;
        tot++;
      }
    }
    row.push(`${name} ${(100 * loss / tot).toFixed(1)}`);
  }
  console.log(`${label.padEnd(46)} ${row.join(' | ')}`);
}
