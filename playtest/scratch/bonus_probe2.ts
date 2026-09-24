import { defaultConfig } from '../../src/core/config';
import { BONUS } from '../../src/core/relics';
import { Fight } from '../../src/core/fight';
import { createRun, fightConfig } from '../../src/core/run';
BONUS.wheel = 0; BONUS.rush = 0;
const base = defaultConfig();
for (const on of [false, true]) {
  let wins = 0, turns = 0, dmg = 0, spins = 0;
  for (let s = 0; s < 2000; s++) {
    const run = createRun(base, s + 1, 'knight');
    const cfg = fightConfig(run, base);
    cfg.player.bonusSymbols = on;
    const f = new Fight(cfg, s + 7);
    if (s === 0) console.log('reel sizes', f.sides.player.reels.map((r) => r.cells.length).join(','), 'enemy', run.enemies[0].archetype);
    while (!f.over && f.turn < 500) { const r = f.step(); if (r.side === 'player') { spins++; for (const e of r.events) if (e.type === 'attack' && e.from === 'player') dmg += e.amount; } }
    if (f.winner === 'player') wins++;
    turns += f.turn;
  }
  console.log(`bonusSymbols ${on}: win ${(wins / 20).toFixed(1)}% turns ${(turns / 2000).toFixed(1)} dmg/spin ${(dmg / spins).toFixed(2)}`);
}
