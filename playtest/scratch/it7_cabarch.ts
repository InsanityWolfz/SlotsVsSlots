// Act 2 per-cabinet x archetype lethality + turns + player dmg/spin (commit).  npx tsx playtest/scratch/it7_cabarch.ts [N]
import { avg, batch, CABINET_ORDER, pct } from './it7_lib';
const N = Number(process.argv[2] ?? 1000);
const archs = ['bomber', 'hexer', 'vampire', 'mimic', 'frost', 'thief', 'golem', 'gremlin'];
console.log(`cab      ${archs.map((a) => a.padEnd(18)).join('')} dmg/spin(act2)  maxHP@B1  healPerFight`);
for (const cab of CABINET_ORDER) {
  const rs = batch(cab, { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' }, N);
  const fs = rs.flatMap((r) => r.fights.filter((f) => f.act === 2 && !f.boss));
  const cells = archs.map((a) => { const x = fs.filter((f) => f.arch === a); return `${pct(x.filter((f) => !f.won).length, x.length)}% ${avg(x.map((f) => f.turns)).toFixed(0)}t`.padEnd(18); });
  console.log(`${cab.padEnd(8)} ${cells.join('')} ${avg(fs.map((f) => f.playerDmg / Math.max(1, f.spins))).toFixed(1).padEnd(15)} ${avg(fs.filter((f) => f.depth === 0).map((f) => f.maxHp)).toFixed(0).padEnd(9)} vamp ${avg(fs.map((f) => f.vampHeal)).toFixed(1)}`);
}
