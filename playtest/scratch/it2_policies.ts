// Policy grid (draft x fork) + per-enemy feel + boss/pot stats. npx tsx playtest/scratch/it2_policies.ts [runs]
import { FORKS, POLICIES, playRun, Rng, type FightFeel } from './it2_lib';

const N = Number(process.argv[2] ?? 3000);
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const avgA = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length));
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; };

const grid: [string, string][] = [
  ['greedy', 'simGreedy'], ['greedy', 'random'], ['greedy', 'hardest'], ['random', 'simGreedy'], ['random', 'random'],
  ['relicRandom', 'simGreedy'], ['hpFirst', 'simGreedy'], ['swapFirst', 'simGreedy'], ['neverRelic', 'simGreedy'], ['crownFirst', 'simGreedy'], ['first', 'first'],
];
for (const [dp, fp] of grid) {
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  let wins = 0;
  const deaths = Array(6).fill(0);
  const fights: FightFeel[] = [];
  let reach = 0, hpB = 0;
  for (let i = 0; i < N; i++) {
    const r = playRun(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr);
    if (r.won) wins++; else deaths[r.deathDepth]++;
    fights.push(...r.fights);
    if (r.hpIntoBoss >= 0) { reach++; hpB += r.hpIntoBoss; }
  }
  const bossF = fights.filter((f) => f.arch === 'house');
  console.log(`${(dp + '/' + fp).padEnd(24)} win ${pct(wins, N).padStart(5)}%  deaths F1-5/boss ${deaths.map((d) => pct(d, N)).join('/')}  bossWin ${pct(bossF.filter((f) => f.won).length, bossF.length)}%  hpIntoBoss ${(100 * hpB / Math.max(1, reach)).toFixed(0)}%`);
  if (dp === 'greedy' && fp === 'simGreedy') {
    const archs = [...new Set(fights.map((f) => f.arch))];
    console.log('  arch        n  kill%  turns hpLoss%(wins) dead%  longestDead avg/p90  frozenT lockedT 2+dis frzJP frzPair steals rocks burst%deaths killer spin/abil/pot');
    for (const a of archs) {
      const fs = fights.filter((f) => f.arch === a), dead = fs.filter((f) => !f.won);
      const av = (g: (f: FightFeel) => number, xs = fs) => avgA(xs.map(g));
      const k = (t: string) => dead.filter((f) => f.killer === t).length;
      console.log(`  ${a.padEnd(8)} ${String(fs.length).padStart(5)} ${pct(dead.length, fs.length).padStart(6)} ${av((f) => f.turns).toFixed(1).padStart(6)} ${(100 * av((f) => (f.hpBefore - f.hpAfter) / f.maxHp, fs.filter((f) => f.won))).toFixed(0).padStart(6)} ${(100 * av((f) => f.deadTurns / f.playerTurns)).toFixed(0).padStart(8)} ${av((f) => f.longestDead).toFixed(1).padStart(8)}/${q(fs.map((f) => f.longestDead), 0.9)} ${av((f) => f.frozenTurns).toFixed(1).padStart(8)} ${av((f) => f.lockedTurns).toFixed(1).padStart(7)} ${av((f) => f.twoDisabled).toFixed(2).padStart(5)} ${av((f) => f.frozenJackpots).toFixed(3).padStart(6)} ${av((f) => f.frozenPairs).toFixed(3).padStart(6)} ${av((f) => f.steals).toFixed(1).padStart(6)} ${av((f) => f.rocks).toFixed(1).padStart(5)} ${pct(dead.filter((f) => f.burstDeath).length, dead.length).padStart(8)}   ${k('spin')}/${k('ability')}/${k('pot')}`);
    }
    // by depth
    const byAD: Record<string, [number, number]> = {};
    for (const f of fights) { const e = (byAD[`${f.arch}@F${f.depth + 1}`] ??= [0, 0]); e[0]++; if (!f.won) e[1]++; }
    console.log('  kill% by arch@depth: ' + Object.entries(byAD).sort().map(([k, [n, d]]) => `${k} ${pct(d, n)} (${n})`).join(' | '));
    const cash = bossF.flatMap((f) => f.potCashouts), st = bossF.flatMap((f) => f.potSteals);
    console.log(`  BOSS n=${bossF.length} turns ${avgA(bossF.map((f) => f.turns)).toFixed(1)} (p10 ${q(bossF.map((f) => f.turns), 0.1)} p90 ${q(bossF.map((f) => f.turns), 0.9)})  maxPot avg ${avgA(bossF.map((f) => f.maxPot)).toFixed(1)} p90 ${q(bossF.map((f) => f.maxPot), 0.9)}`);
    console.log(`  House cash-outs/fight ${(cash.length / bossF.length).toFixed(2)} avg ${avgA(cash).toFixed(1)} p50 ${q(cash, 0.5)} p90 ${q(cash, 0.9)} max ${Math.max(...cash)} | player steals/fight ${(st.length / bossF.length).toFixed(2)} avg ${avgA(st).toFixed(1)} p90 ${q(st, 0.9)}; fights with a player steal ${pct(bossF.filter((f) => f.potSteals.length).length, bossF.length)}%, steal>=10 ${pct(bossF.filter((f) => f.potSteals.some((x) => x >= 10)).length, bossF.length)}%`);
    const ai = bossF.filter((f) => f.allIn);
    console.log(`  ALL IN reached ${pct(ai.length, bossF.length)}% (turn ${avgA(ai.map((f) => f.allInTurn)).toFixed(1)}), pot after doubling avg ${avgA(ai.map((f) => f.allInPot)).toFixed(1)} p90 ${q(ai.map((f) => f.allInPot), 0.9)}; win% given ALL IN ${pct(ai.filter((f) => f.won).length, ai.length)}; post-ALL-IN cashouts avg ${avgA(ai.flatMap((f) => f.cashAfterAllIn)).toFixed(1)} (${(ai.flatMap((f) => f.cashAfterAllIn).length / Math.max(1, ai.length)).toFixed(2)}/fight), player steals avg ${avgA(ai.flatMap((f) => f.stealsAfterAllIn)).toFixed(1)} (${(ai.flatMap((f) => f.stealsAfterAllIn).length / Math.max(1, ai.length)).toFixed(2)}/fight); pot unclaimed at end avg ${avgA(bossF.map((f) => f.potAtEnd)).toFixed(1)}`);
    const bd = bossF.filter((f) => !f.won);
    console.log(`  BOSS deaths: killer spin ${bd.filter((f) => f.killer === 'spin').length} pot ${bd.filter((f) => f.killer === 'pot').length}; boss HP left when you die: avg ${(100 * avgA(bd.map((f) => f.enemyHpAtDeath))).toFixed(0)}%, <=15% ${pct(bd.filter((f) => f.enemyHpAtDeath <= 0.15).length, bd.length)}% of deaths ; burst ${pct(bd.filter((f) => f.burstDeath).length, bd.length)}%`);
    const hpIn = bossF.map((f) => f.hpBefore / f.maxHp);
    for (const [lo, hi] of [[0, 0.5], [0.5, 0.75], [0.75, 1.01]]) {
      const s = bossF.filter((f) => f.hpBefore / f.maxHp >= lo && f.hpBefore / f.maxHp < hi);
      console.log(`    boss win with HP in [${lo},${hi}) : ${pct(s.filter((f) => f.won).length, s.length)}% (n=${s.length})`);
    }
    void hpIn;
  }
}
