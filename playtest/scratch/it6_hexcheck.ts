import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
const cfg = defaultConfig();
cfg.player.hp = 40;
cfg.player.gilded = [0, 1, 2].map((reel) => ({ reel, symbol: 'sword' as const, enh: 'gold' as const }));
cfg.enemy = { hp: 99, strips: [{ sword: 5 }, { sword: 5 }, { sword: 5 }], name: 'x', ability: null };
for (const hexed of [[0, 0, 0], [2, 2, 0], [2, 2, 2]]) {
  const f = new Fight(cfg, 1);
  f.sides.player.hexed = [...hexed];
  f.forceNext('player', ['sword', 'sword', 'sword']);
  const r = f.step();
  const sp: any = r.events.find((e) => e.type === 'spin');
  console.log(hexed.join(','), 'groups', JSON.stringify(sp.score.groups.map((g: any) => [g.base, g.amount, g.notes])), 'enemy hp', f.sides.enemy.hp);
}
