// How often does ALL IN trigger off a pot steal (pot 0 -> 5 "doubles")? npx tsx playtest/scratch/it2_allin.ts
import { makeEnemy, BOSS } from '../../src/core/enemies';
import { cloneConfig } from '../../src/core/config';
import { BASE, Fight, Rng } from './it2_lib';
const e = makeEnemy(BOSS, 5, new Rng(1), true);
const cfg = cloneConfig(BASE); cfg.player = { ...cfg.player, hp: 36, startHp: 36 }; cfg.enemy = { hp: e.hp, strips: e.strips, ability: e.ability, boss: e.boss }; cfg.relics = ['mirror'];
const rng = new Rng(8); let phases = 0, onSteal = 0, potAfter: number[] = [], lethalPotSeen = 0, fights = 4000;
for (let i = 0; i < fights; i++) {
  const f = new Fight(cfg, rng.int(0xffffffff)); let seenLethal = false;
  while (!f.over) { const r = f.step(); const ph = r.events.findIndex((x) => x.type === 'phase'); if (f.pot >= f.sides.player.hp + f.sides.player.shield) seenLethal = true;
    if (ph >= 0) { phases++; potAfter.push((r.events[ph] as any).pot); if (r.events.slice(0, ph).some((x) => x.type === 'potWin' && (x as any).from === 'player')) onSteal++; } }
  if (seenLethal) lethalPotSeen++;
}
console.log(`ALL IN in ${(100 * phases / fights).toFixed(0)}% of fights; triggered by the player's own pot steal ${(100 * onSteal / phases).toFixed(0)}% (pot 'doubles' 0 -> 5); pot after ALL IN: ${[0.1, 0.5, 0.9].map((p) => potAfter.sort((a, b) => a - b)[Math.floor(potAfter.length * p)]).join('/')} (p10/p50/p90). Fights where the pot is >= your HP+shield at some point: ${(100 * lethalPotSeen / fights).toFixed(0)}%`);
