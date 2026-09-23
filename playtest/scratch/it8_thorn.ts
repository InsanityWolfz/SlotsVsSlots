// THORN act 2 HP boon from identical B1 snapshots (commit).   npx tsx playtest/scratch/it8_thorn.ts [N]
import { cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const snaps = snapshots('thorn', N);
for (const add of [0, 4, 6]) {
  let w = 0;
  snaps.forEach((s, i) => { const r0 = cloneRun(s); r0.player.maxHp += add; r0.player.hp += add; if (playRun(0, 'thorn', pol, new Rng(9000 + i), r0).won) w++; });
  console.log(`THORN +${add} maxHP: act 2 clear ${(100 * w / snaps.length).toFixed(1)} (n ${snaps.length})`);
}
