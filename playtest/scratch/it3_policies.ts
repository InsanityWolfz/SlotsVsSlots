// Policy grid + enemy/boss/gild telemetry. npx tsx playtest/scratch/it3_policies.ts [runs] [only]
import { FORKS, POLICIES, playRun, Rng, type FightFeel } from './it3_lib';

const N = Number(process.argv[2] ?? 3000);
const only = process.argv[3];
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; };

const grid: [string, string][] = only ? [only.split('/') as [string, string]] : [
  ['greedy', 'sim'], ['greedy', 'safe'], ['greedy', 'elite'], ['greedy', 'random'], ['greedy', 'eliteIfHealthy'],
  ['random', 'random'], ['random', 'sim'], ['hpFirst', 'sim'], ['relicFirst', 'sim'], ['gildFirst', 'sim'], ['neverGild', 'sim'],
  ['wildFirst', 'sim'], ['neverWild', 'sim'], ['swapFirst', 'sim'], ['prepFirst', 'sim'], ['neverPrep', 'sim'], ['gildWildFirst', 'sim'], ['gildWildFirst', 'elite'],
];
for (const [dp, fp] of grid) {
  const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
  let wins = 0, reach = 0, hpB = 0;
  const deaths = Array(6).fill(0);
  const fights: FightFeel[] = [];
  let eliteTaken = 0, forks = 0, gildsEnd = 0;
  for (let i = 0; i < N; i++) {
    const r = playRun(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr);
    if (r.won) wins++; else deaths[r.deathDepth]++;
    fights.push(...r.fights);
    forks += r.forks.length; eliteTaken += r.forks.filter((f) => f.elite).length;
    gildsEnd += r.picks.filter((p) => p.kind === 'gild').length;
    if (r.hpIntoBoss >= 0) { reach++; hpB += r.hpIntoBoss; }
  }
  const bossF = fights.filter((f) => f.arch === 'house');
  console.log(`${(dp + '/' + fp).padEnd(26)} win ${pct(wins, N).padStart(5)}%  deaths ${deaths.map((d) => pct(d, N)).join('/')}  boss ${pct(bossF.filter((f) => f.won).length, bossF.length)}%  hpIn ${(100 * hpB / Math.max(1, reach)).toFixed(0)}%  elite ${pct(eliteTaken, forks)}%  gilds/run ${(gildsEnd / N).toFixed(2)}  turns/fight ${avg(fights.map((f) => f.turns)).toFixed(1)}`);
  if (dp === 'greedy' && fp === 'sim' || only) {
    console.log('  arch        n   kill%  eliteKill% turns hpLoss%  gStolen pStolen gSlimed pSlimed pierce bypass spikedDmg killer spin/abil/pot');
    for (const a of [...new Set(fights.map((f) => f.arch))]) {
      const fs = fights.filter((f) => f.arch === a), dead = fs.filter((f) => !f.won), el = fs.filter((f) => f.elite);
      const av = (g: (f: FightFeel) => number, xs = fs) => avg(xs.map(g));
      const k = (t: string) => dead.filter((f) => f.killer === t).length;
      console.log(`  ${a.padEnd(8)} ${String(fs.length).padStart(5)} ${pct(dead.length, fs.length).padStart(6)} ${(pct(el.filter((f) => !f.won).length, el.length) + ` (${el.length})`).padStart(12)} ${av((f) => f.turns).toFixed(1).padStart(5)} ${(100 * av((f) => (f.hpBefore - f.hpAfter) / f.maxHp, fs.filter((f) => f.won))).toFixed(0).padStart(6)} ${av((f) => f.gildStolen).toFixed(2).padStart(8)} ${av((f) => f.plainStolen).toFixed(2).padStart(7)} ${av((f) => f.gildSlimed).toFixed(2).padStart(7)} ${av((f) => f.plainSlimed).toFixed(2).padStart(7)} ${av((f) => f.pierces).toFixed(2).padStart(6)} ${av((f) => f.pierceBypass).toFixed(2).padStart(6)} ${av((f) => f.spikedDmg).toFixed(2).padStart(8)}   ${k('spin')}/${k('ability')}/${k('pot')}`);
    }
    const byAD: Record<string, [number, number]> = {};
    for (const f of fights) { const e = (byAD[`${f.arch}${f.elite ? '*' : ''}@F${f.depth + 1}`] ??= [0, 0]); e[0]++; if (!f.won) e[1]++; }
    console.log('  kill% arch@depth (*=elite): ' + Object.entries(byAD).sort().map(([k, [n, d]]) => `${k} ${pct(d, n)}(${n})`).join(' | '));
    const cash = bossF.flatMap((f) => f.potCashouts), st = bossF.flatMap((f) => f.potSteals);
    console.log(`  BOSS n=${bossF.length} turns ${avg(bossF.map((f) => f.turns)).toFixed(1)} (p10 ${q(bossF.map((f) => f.turns), 0.1)} p90 ${q(bossF.map((f) => f.turns), 0.9)}) maxPot avg ${avg(bossF.map((f) => f.maxPot)).toFixed(1)} p90 ${q(bossF.map((f) => f.maxPot), 0.9)}`);
    console.log(`  skims/fight ${(cash.length / bossF.length).toFixed(2)} avg ${avg(cash).toFixed(1)} p90 ${q(cash, 0.9)} max ${Math.max(...cash)} | steals/fight ${(st.length / bossF.length).toFixed(2)} avg ${avg(st).toFixed(1)}; fights w/ steal ${pct(bossF.filter((f) => f.potSteals.length).length, bossF.length)}%`);
    const ai = bossF.filter((f) => f.allIn);
    console.log(`  ALL IN ${pct(ai.length, bossF.length)}% (turn ${avg(ai.map((f) => f.allInTurn)).toFixed(1)}), win|ALLIN ${pct(ai.filter((f) => f.won).length, ai.length)}%`);
    const lf = bossF.filter((f) => f.lethalTurns > 0);
    console.log(`  LETHAL shown in ${pct(lf.length, bossF.length)}% of boss fights (avg ${avg(lf.map((f) => f.lethalTurns)).toFixed(1)} turns); win|LETHAL ${pct(lf.filter((f) => f.won).length, lf.length)}%; skims fired while LETHAL ${bossF.reduce((a, f) => a + f.lethalCashouts, 0)}`);
    const bd = bossF.filter((f) => !f.won);
    console.log(`  BOSS deaths n=${bd.length}: spin ${pct(bd.filter((f) => f.killer === 'spin').length, bd.length)}% pot ${pct(bd.filter((f) => f.killer === 'pot').length, bd.length)}%; burst ${pct(bd.filter((f) => f.burstDeath).length, bd.length)}%; boss HP left avg ${(100 * avg(bd.map((f) => f.enemyHpAtDeath))).toFixed(0)}%, <=15% ${pct(bd.filter((f) => f.enemyHpAtDeath <= 0.15).length, bd.length)}%`);
    for (const [lo, hi] of [[0, 0.5], [0.5, 0.75], [0.75, 1.01]]) {
      const s = bossF.filter((f) => f.hpBefore / f.maxHp >= lo && f.hpBefore / f.maxHp < hi);
      console.log(`    boss win HP in [${lo},${hi}): ${pct(s.filter((f) => f.won).length, s.length)}% (n=${s.length})`);
    }
    const g = bossF.map((f) => f.gilds);
    for (const [lo, hi] of [[0, 1], [1, 5], [5, 9], [9, 99]]) {
      const s = bossF.filter((f) => f.gilds >= lo && f.gilds < hi);
      console.log(`    boss win with gilded cells in [${lo},${hi}): ${pct(s.filter((f) => f.won).length, s.length)}% (n=${s.length})`);
    }
    void g;
    console.log(`  player spins w/ live gild on payline: ${(100 * avg(fights.map((f) => f.gildLinesLive / Math.max(1, f.turns / 2)))).toFixed(0)}%; wild in matched group ${(avg(fights.map((f) => f.wildLines))).toFixed(2)}/fight, wild jackpots ${(avg(fights.map((f) => f.wildJackpots))).toFixed(3)}/fight`);
  }
}
