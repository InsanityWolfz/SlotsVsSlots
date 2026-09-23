// Policy comparison + feel stats. npx tsx playtest/scratch/it1_policies.ts [runs]
import { POLICIES, playRun, Rng, type FightFeel } from './it1_lib';

const N = Number(process.argv[2] ?? 3000);
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');

for (const [name, picker] of Object.entries(POLICIES)) {
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  let wins = 0;
  const deaths = Array(6).fill(0);
  const fights: FightFeel[] = [];
  let rocks = 0, bossReach = 0, hpBoss = 0;
  for (let i = 0; i < N; i++) {
    const r = playRun(seeds.int(0xffffffff), picker, pr, fr);
    if (r.won) wins++; else deaths[r.deathDepth]++;
    fights.push(...r.fights);
    rocks += r.rocksEnd;
    if (r.hpIntoBoss >= 0) { bossReach++; hpBoss += r.hpIntoBoss; }
  }
  const bossF = fights.filter((f) => f.arch === 'house');
  console.log(`${name.padEnd(12)} win ${pct(wins, N)}%  deaths ${deaths.map((d) => pct(d, N)).join('/')}  bossWin ${pct(bossF.filter((f) => f.won).length, bossF.length)}%  hpIntoBoss ${(100 * hpBoss / Math.max(1, bossReach)).toFixed(0)}%  rocksEnd ${(rocks / N).toFixed(1)}`);
  if (name === 'greedy') {
    // detailed feel stats per archetype
    const archs = [...new Set(fights.map((f) => f.arch))];
    console.log('  arch      n    kill%  turns  hpLoss%  dead%  longestDead(avg/p90)  frozenT lockedT 2+disabled steals rocks burst%ofDeaths killer(spin/ability/pot)');
    for (const a of archs) {
      const fs = fights.filter((f) => f.arch === a);
      const dead = fs.filter((f) => !f.won);
      const avg = (g: (f: FightFeel) => number, xs = fs) => (xs.reduce((s, f) => s + g(f), 0) / Math.max(1, xs.length));
      const ld = fs.map((f) => f.longestDead).sort((x, y) => x - y);
      const k = (t: string) => dead.filter((f) => f.killer === t).length;
      console.log(`  ${a.padEnd(8)} ${String(fs.length).padStart(5)} ${pct(dead.length, fs.length).padStart(6)} ${avg((f) => f.turns).toFixed(1).padStart(6)} ${(100 * avg((f) => (f.hpBefore - f.hpAfter) / f.maxHp, fs.filter((f) => f.won))).toFixed(0).padStart(6)} ${(100 * avg((f) => f.deadTurns / f.playerTurns)).toFixed(0).padStart(6)} ${avg((f) => f.longestDead).toFixed(1).padStart(8)}/${ld[Math.floor(ld.length * 0.9)]}  ${avg((f) => f.frozenTurns).toFixed(1).padStart(10)} ${avg((f) => f.lockedTurns).toFixed(1).padStart(7)} ${avg((f) => f.allFrozenOrLocked).toFixed(2).padStart(8)} ${avg((f) => f.steals).toFixed(1).padStart(6)} ${avg((f) => f.rocks).toFixed(1).padStart(5)} ${pct(dead.filter((f) => f.burstDeath).length, dead.length).padStart(8)}  ${k('spin')}/${k('ability')}/${k('pot')}`);
    }
    const cash = bossF.flatMap((f) => f.potCashouts), steals = bossF.flatMap((f) => f.potSteals);
    const avgA = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(1);
    const sorted = [...cash].sort((a, b) => a - b);
    console.log(`  BOSS: fights ${bossF.length}, cashouts/fight ${(cash.length / bossF.length).toFixed(2)} avg ${avgA(cash)} p90 ${sorted[Math.floor(sorted.length * 0.9)]} zero-pot cashouts ${pct(cash.filter((c) => c === 0).length, cash.length)}%, player pot steals/fight ${(steals.length / bossF.length).toFixed(2)} avg ${avgA(steals)} (fights with a steal ${pct(bossF.filter((f) => f.potSteals.length > 0).length, bossF.length)}%), maxPot avg ${avgA(bossF.map((f) => f.maxPot))}`);
    const bossDead = bossF.filter((f) => !f.won);
    console.log(`  BOSS deaths by killer: spin ${bossDead.filter((f) => f.killer === 'spin').length} pot ${bossDead.filter((f) => f.killer === 'pot').length}; boss avg turns ${avgA(bossF.map((f) => f.turns))}`);
  }
}
