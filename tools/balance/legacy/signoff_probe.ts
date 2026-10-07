// Throwaway (SIGNOFF_RELICS): edge-case probes for the new relics.
import { defaultConfig, reels3, type GameConfig, type RelicId } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { createRun, fightConfig } from '../../../src/core/run';

const base = defaultConfig();
function on(cabinet: CabinetId, relics: RelicId[], mut?: (c: GameConfig) => void, seed = 7): Fight {
  const c = fightConfig(createRun(base, 1, cabinet), base);
  c.enemy = { hp: 9999, strips: reels3({ sword: 6, shield: 6 }) };
  c.player.bonusSymbols = false;
  c.relics = relics;
  mut?.(c);
  return new Fight(c, seed);
}

// A. SHIELD BASH kills the enemy at the start of the player's turn.
{
  const f = on('knight', ['bash']);
  f.step(); f.step();
  f.sides.enemy.hp = 20; f.sides.enemy.shield = 0;
  f.sides.player.shield = 100;
  const ev = f.step().events;
  const deathAt = ev.findIndex((e) => e.type === 'death' || (e as any).type === 'win');
  console.log('A bash-kill: over', f.over, 'winner', f.winner, 'events:', ev.map((e) => e.type + ((e as any).from ? ':' + (e as any).from : '')).join(' '));
  console.log('  enemy hp', f.sides.enemy.hp, 'deathIdx', deathAt);
}
// A2. Same with JAX armed (payoff after death?)
{
  const f = on('joker', ['bash']);
  f.step(); f.step();
  f.sides.enemy.hp = 20; f.sides.enemy.shield = 0;
  f.sides.player.shield = 100;
  f.sides.player.armed = true; f.sides.player.energy = 100;
  const ev = f.step().events;
  console.log('A2 jax armed bash-kill:', ev.map((e) => e.type).join(' '));
}
// B. CHAINMAIL + CHALICE at full HP: overheal to shield then reset.
{
  const f = on('knight', ['chainmail', 'chalice']);
  f.step(); f.step();
  f.sides.player.shield = 200;
  const ev = f.step().events.slice(0, 8);
  console.log('B chainmail+chalice:', JSON.stringify(ev.filter((e) => ['heal', 'shieldGain', 'shieldReset', 'relic'].includes(e.type))));
}
// C. STATIC and FIRST BLOOD counts over a fight.
{
  const f = on('tesla', ['static', 'firstblood']);
  let st = 0, fb = 0;
  for (let i = 0; i < 40 && !f.over; i++) {
    const r = f.step();
    for (const e of r.events) {
      if (e.type === 'relic' && e.relic === 'static') st++;
      if (e.type === 'spin') for (const g of e.score.groups) if (g.notes?.some((n) => n.includes('FIRST'))) fb++;
    }
  }
  console.log('C static fires', st, 'firstblood groups', fb);
}
