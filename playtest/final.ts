import { defaultConfig, type GameConfig } from '../src/core/config';
import { Fight } from '../src/core/fight';
import { Rng } from '../src/core/rng';
import { deep, row } from './deep';

const rec = (): GameConfig => {
  const c = defaultConfig();
  c.enemy.hp = 30;
  c.enemy.strips = [0, 1, 2].map(() => ({ sword: 5, shield: 2, slime: 5 }));
  return c;
};
const alt = (): GameConfig => {
  const c = rec();
  c.player.hp = 22;
  c.enemy.hp = 32;
  return c;
};
for (const [n, c] of [['current default', defaultConfig()], ['RECOMMENDED 20/30 enemy 5/2/5', rec()], ['alt 22/32 enemy 5/2/5', alt()]] as const) {
  console.log(row(n, deep(c, 20000, 2024)));
}

// Extra: fight-length tails and single-sword-blocked frequency
for (const [n, c] of [['current', defaultConfig()], ['recommended', rec()]] as const) {
  const seeds = new Rng(31);
  let short = 0, long = 0, singleBlocked = 0, pSwordAttacks = 0, fourDmgTurns = 0, pTurns = 0, e23 = 0, eSpins = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) {
    const f = new Fight(c, seeds.int(0xffffffff));
    while (!f.over) {
      const r = f.step();
      for (const e of r.events) {
        if (e.type === 'attack' && e.from === 'player') {
          pSwordAttacks++;
          if (e.hpDamage === 0) singleBlocked++;
        }
        if (e.type === 'spin') {
          const l = e.score.line;
          if (l[1] === l[2] && l[0] !== l[1]) e23++;
          eSpins++;
        }
      }
      if (r.side === 'player') {
        pTurns++;
        const d = r.events.reduce((a, e) => a + ((e.type === 'attack' || e.type === 'specialFire') && e.from === 'player' ? e.hpDamage : 0), 0);
        if (d >= 4) fourDmgTurns++;
      }
    }
    if (f.turn < 12) short++;
    if (f.turn > 40) long++;
  }
  console.log(
    `${n}: fights <12 turns ${((100 * short) / N).toFixed(1)}%, >40 turns ${((100 * long) / N).toFixed(1)}% | player sword attacks fully blocked ${((100 * singleBlocked) / pSwordAttacks).toFixed(0)}% | player turns dealing >=4 HP ${((100 * fourDmgTurns) / pTurns).toFixed(0)}% | spins with non-paying reel2=3 lookalike ${((100 * e23) / eSpins).toFixed(0)}%`,
  );
}
