// Brute/thief single-fight tuning at F4, base kit 32 HP. npx tsx playtest/scratch/it2_brute.ts
import { ARCHETYPES, makeEnemy } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, Rng } from './it2_lib';
const A = (id: string) => ARCHETYPES.find((a) => a.id === id)!;
function loss(id: string, mut: (a: any) => void, depth = 3) {
  const a = JSON.parse(JSON.stringify(A(id))); mut(a);
  const rng = new Rng(5); let l = 0, turns = 0, abilKills = 0; const n = 8000;
  for (let i = 0; i < n; i++) {
    const e = makeEnemy(a, depth, new Rng(i));
    const cfg = cloneConfig(BASE); cfg.player = { ...cfg.player, hp: 32, startHp: 32 };
    cfg.enemy = { hp: e.hp, strips: e.strips, ability: e.ability };
    const f = new Fight(cfg, rng.int(0xffffffff)); while (!f.over) f.step();
    if (f.winner !== 'player') l++; turns += f.turn;
  }
  return `${(100 * l / n).toFixed(1)}% (turns ${(turns / n).toFixed(1)})`;
}
console.log('brute as-is', loss('brute', () => {}));
console.log('brute smash 3', loss('brute', (a) => (a.ability.power = 3)));
console.log('brute hpMul 0.95', loss('brute', (a) => (a.hpMul = 0.95)));
console.log('brute sword5 shield7', loss('brute', (a) => (a.strip = { sword: 5, shield: 7 })));
console.log('brute sword5 shield7 hp0.95', loss('brute', (a) => { a.strip = { sword: 5, shield: 7 }; a.hpMul = 0.95; }));
console.log('thief as-is', loss('thief', () => {}));
console.log('thief pilfer every 4', loss('thief', (a) => (a.ability.every = 4)));
console.log('thief claw 4->3 sword 5->5 shield 3->4', loss('thief', (a) => (a.strip = { sword: 5, shield: 4, claw: 3 })));
console.log('slime', loss('slime', () => {}), 'frost', loss('frost', () => {}), 'gremlin', loss('gremlin', () => {}), 'golem', loss('golem', () => {}));
console.log('gremlin x1.25 hp', loss('gremlin', (a) => (a.hpMul *= 1.25)), 'gremlin singles jam (every 3)', loss('gremlin', (a) => (a.ability.every = 3)));
