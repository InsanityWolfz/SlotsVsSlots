// Controlled single-fight loss per archetype x depth (start kit, full 32 HP), normal vs elite x1.25.
import { ARCHETYPES, ELITE_HP_MUL, makeEnemy } from '../../src/core/enemies';
import { BASE, Fight, Rng } from './it3_lib';
const N = Number(process.argv[2] ?? 3000);
console.log('arch      ' + [1, 2, 3, 4].map((d) => `F${d + 1} norm/elite`.padStart(18)).join(''));
for (const a of ARCHETYPES) {
  let line = a.id.padEnd(10);
  for (const d of [1, 2, 3, 4]) {
    const res: string[] = [];
    for (const elite of [false, true]) {
      if (d < a.minDepth) { res.push('  -  '); continue; }
      const rng = new Rng(77 + d);
      let lost = 0, turns = 0, hpLoss = 0;
      for (let i = 0; i < N; i++) {
        const e = makeEnemy(a, d, new Rng(i * 13 + 5));
        const cfg = JSON.parse(JSON.stringify(BASE));
        cfg.enemy = { hp: elite ? Math.round(e.hp * ELITE_HP_MUL) : e.hp, strips: e.strips, name: e.name, ability: e.ability, boss: null };
        cfg.player = { ...cfg.player, hp: 32, startHp: 32, gilded: [] };
        const f = new Fight(cfg, rng.int(0xffffffff));
        while (!f.over && f.turn < 2000) f.step();
        if (f.winner !== 'player') lost++; else hpLoss += 32 - f.sides.player.hp;
        turns += f.turn;
      }
      res.push(`${(100 * lost / N).toFixed(1)}/${(hpLoss / Math.max(1, N - lost)).toFixed(0)}hp`);
    }
    line += res.join(' | ').padStart(18);
  }
  console.log(line);
}
console.log('(cells: loss% / avg HP lost when you win)');
