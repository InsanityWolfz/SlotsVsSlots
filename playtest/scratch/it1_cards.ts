// Card value per enemy: single fight at depth 3 (index 3), full 32 HP, base strips 4/4/4.
// Reports enemy-kill% (fight loss%) and avg HP lost for each one-card change. Also rock-bloat and relic tables.
import type { RelicId, StripCounts, SymbolId } from '../../src/core/config';
import { ARCHETYPES, BOSS, makeEnemy } from '../../src/core/enemies';
import { BASE, Fight, Rng } from './it1_lib';
import { cloneConfig } from '../../src/core/config';

const N = Number(process.argv[2] ?? 4000);
const rng = new Rng(77);
type Mod = { name: string; strips?: (s: StripCounts[]) => void; relics?: RelicId[] };
const mods: Mod[] = [{ name: 'base' }];
for (const sym of ['sword', 'bolt', 'shield'] as SymbolId[])
  for (const r of [0, 1, 2]) mods.push({ name: `+${sym} r${r + 1}`, strips: (s) => (s[r][sym] = (s[r][sym] ?? 0) + 1) });
for (const sym of ['sword', 'bolt', 'shield'] as SymbolId[])
  for (const r of [0, 2]) mods.push({ name: `-${sym} r${r + 1}`, strips: (s) => (s[r][sym]! -= 1) });
mods.push({ name: '+rock x3 (1/reel)', strips: (s) => s.forEach((x) => (x.rock = 1)) });
mods.push({ name: '+rock x9 (3/reel)', strips: (s) => s.forEach((x) => (x.rock = 3)) });
mods.push({ name: '+rock x15 (5/reel)', strips: (s) => s.forEach((x) => (x.rock = 5)) });
for (const rel of ['clover', 'whetstone', 'soap', 'battery', 'mirror', 'fang', 'bandage', 'hourglass', 'magnet'] as RelicId[]) mods.push({ name: `relic ${rel}`, relics: [rel] });
mods.push({ name: 'magnet + 9 rocks', relics: ['magnet'], strips: (s) => s.forEach((x) => (x.rock = 3)) });

const foes = [...ARCHETYPES.map((a) => makeEnemy(a, 3, new Rng(1))), makeEnemy(BOSS, 5, new Rng(1), true)];
// strip jitter off: use archetype strips
foes.forEach((f, i) => (f.strips = [0, 1, 2].map(() => ({ ...(i < ARCHETYPES.length ? ARCHETYPES[i].strip : BOSS.strip) }))));

const header = 'mod'.padEnd(20) + foes.map((f) => f.archetype.padStart(13)).join('') + '   avgLoss%';
console.log(`single fight at depth 4 HP (x archetype mul), player 32 HP; cells = loss% / avg HP lost   (N=${N})`);
console.log(header);
const baseRow: number[] = [];
for (const m of mods) {
  let row = m.name.padEnd(20);
  let lossSum = 0;
  foes.forEach((foe, fi) => {
    const cfg = cloneConfig(BASE);
    cfg.player = { ...cfg.player, hp: 32, startHp: 32, strips: cfg.player.strips.map((s) => ({ ...s })) };
    m.strips?.(cfg.player.strips);
    cfg.enemy = { hp: foe.hp, strips: foe.strips, ability: foe.ability, boss: foe.boss };
    cfg.relics = m.relics ?? [];
    let loss = 0, hpl = 0;
    for (let i = 0; i < N; i++) {
      const f = new Fight(cfg, rng.int(0xffffffff));
      while (!f.over) f.step();
      if (f.winner !== 'player') loss++;
      hpl += 32 - f.sides.player.hp;
    }
    const l = (100 * loss) / N;
    if (m.name === 'base') baseRow[fi] = l;
    lossSum += l;
    row += `${l.toFixed(1).padStart(6)}/${(hpl / N).toFixed(1).padStart(5)} `;
  });
  console.log(row + `  ${(lossSum / foes.length).toFixed(1)}`);
}
