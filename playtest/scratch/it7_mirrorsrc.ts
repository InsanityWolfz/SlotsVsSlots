// Mirror damage by source per cabinet + tier IIs owned at the Mirror.   npx tsx playtest/scratch/it7_mirrorsrc.ts [N]
import { avg, batch, CABINET_ORDER, pct, machinePower, type Policy } from './it7_lib';
const N = Number(process.argv[2] ?? 800);
for (const pn of ['commit', 'random']) {
  console.log(`== ${pn}`);
  for (const cab of CABINET_ORDER) {
    const tiers: number[] = []; const pow: number[] = []; const own: number[] = [];
    const pol: Policy = pn === 'commit' ? { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' } : { draft: 'random', fork: 'random', shop: 'random', legend: 'random' };
    const rs = batch(cab, { ...pol, hooks: { preFight: (run, f) => { if (f.isMirror) { tiers.push(run.player.gilded.filter((g) => g.tier).length); pow.push(machinePower(run)); } } } }, N, 777);
    const ms = rs.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2));
    const tw: Record<number, [number, number]> = {};
    ms.forEach((f, i) => { const t = Math.min(3, tiers[i]); (tw[t] ??= [0, 0])[0]++; if (f.won) tw[t][1]++; });
    console.log(`${cab.padEnd(7)} win ${pct(ms.filter((f) => f.won).length, ms.length)} power ${avg(pow).toFixed(1)} mirrorHP ${avg(ms.map((f) => f.enemyHp)).toFixed(0)}  sword/fight ${avg(ms.map((f) => f.dmgBy.sword ?? 0)).toFixed(1)} reflect/fight ${avg(ms.map((f) => f.dmgBy.reflect ?? 0)).toFixed(1)}  playerDmg/spin ${avg(ms.map((f) => f.playerDmg / Math.max(1, f.spins))).toFixed(1)}  tierIIs ${avg(tiers).toFixed(2)}  win by tiers ${Object.entries(tw).map(([k, [n, w]]) => `${k}:${pct(w, n)}(n${n})`).join(' ')}`);
  }
}
