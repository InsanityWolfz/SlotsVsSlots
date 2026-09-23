// Enemy/boss/LETHAL telemetry for one policy. npx tsx playtest/scratch/it4_telemetry.ts [runs] [draft/fork/shop]
import { DRAFTS, FORKS, playRun4, Rng, SHOPS, type Run4 } from './it4_lib';
import { POT } from '../../src/core/relics';
import { CHIPS, createRun, fightConfig } from '../../src/core/run';
import { Fight } from '../../src/core/fight';
import { BASE } from './it3_lib';
const N = Number(process.argv[2] ?? 3000);
const [d, f, s] = (process.argv[3] ?? 'greedy/sim/simGreedy').split('/');
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const q = (xs: number[], p: number) => { const t = [...xs].sort((a, b) => a - b); return t[Math.floor(t.length * p)] ?? 0; };
const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
const rs: Run4[] = [];
for (let i = 0; i < N; i++) rs.push(playRun4(seeds.int(0xffffffff), DRAFTS[d], FORKS[f], SHOPS[s], pr, fr));
const fights = rs.flatMap((r) => r.fights);
console.log(`${d}/${f}/${s} N=${N} win ${pct(rs.filter((r) => r.won).length, N)}%  turns/fight ${avg(fights.map((x) => x.turns)).toFixed(1)}  turns/run ${avg(rs.map((r) => r.fights.reduce((a, x) => a + x.turns, 0))).toFixed(0)}`);
const byAD: Record<string, [number, number, number]> = {};
for (const x of fights) { const e = (byAD[`${x.arch}${x.elite ? '*' : ''}@F${x.depth + 1}`] ??= [0, 0, 0]); e[0]++; if (!x.won) e[1]++; else e[2] += (x.hpBefore - x.hpAfter) / x.maxHp; }
console.log('arch@depth (*=elite): kill% (n) hpLoss%');
console.log(Object.entries(byAD).sort().map(([k, [n, dd, l]]) => `${k} ${pct(dd, n)}(${n}) -${(100 * l / Math.max(1, n - dd)).toFixed(0)}%`).join(' | '));
const arch: Record<string, [number, number]> = {};
for (const x of fights) { const e = (arch[x.arch] ??= [0, 0]); e[0]++; if (!x.won) e[1]++; }
console.log('kill% per arch: ' + Object.entries(arch).map(([k, [n, dd]]) => `${k} ${pct(dd, n)}`).join(' '));
const boss = fights.filter((x) => x.arch === 'house');
const cash = boss.flatMap((x) => x.potCashouts), st = boss.flatMap((x) => x.potSteals);
console.log(`BOSS n=${boss.length} win ${pct(boss.filter((x) => x.won).length, boss.length)}% turns ${avg(boss.map((x) => x.turns)).toFixed(1)} (p10 ${q(boss.map((x) => x.turns), .1)} p90 ${q(boss.map((x) => x.turns), .9)}) skims/fight ${(cash.length / boss.length).toFixed(2)} avg ${avg(cash).toFixed(1)} p90 ${q(cash, .9)}; steals/fight ${(st.length / boss.length).toFixed(2)} avg ${avg(st).toFixed(1)}; ALL IN ${pct(boss.filter((x) => x.allIn).length, boss.length)}%`);
const bd = boss.filter((x) => !x.won);
console.log(`BOSS deaths n=${bd.length}: pot ${pct(bd.filter((x) => x.killer === 'pot').length, bd.length)}% spin ${pct(bd.filter((x) => x.killer === 'spin').length, bd.length)}%; burst ${pct(bd.filter((x) => x.burstDeath).length, bd.length)}%; boss HP left avg ${(100 * avg(bd.map((x) => x.enemyHpAtDeath))).toFixed(0)}%`);
const reach = rs.filter((r) => r.hpIntoBoss >= 0);
for (const [lo, hi] of [[0, 1], [1, 2], [2, 4], [4, 99]]) { const x = reach.filter((r) => r.stackIntoBoss >= lo && r.stackIntoBoss < hi); console.log(`  boss win with stack [${lo},${hi}): ${pct(x.filter((r) => r.won).length, x.length)}% (n=${x.length})`); }
for (const [lo, hi] of [[0, 2], [2, 3], [3, 9]]) { const x = reach.filter((r) => r.relics.length >= lo && r.relics.length < hi); console.log(`  boss win with relics [${lo},${hi}): ${pct(x.filter((r) => r.won).length, x.length)}% (n=${x.length})`); }
console.log(`chips earned/run ${avg(rs.map((r) => r.chipsEarned)).toFixed(1)}; chips on arrival shop1/2/3: ${[0, 1, 2].map((i) => avg(rs.filter((r) => r.shopChips.length > i).map((r) => r.shopChips[i])).toFixed(1)).join('/')}`);
const bought: Record<string, number> = {};
for (const r of rs) for (const o of r.bought) { const k = o.kind === 'gild' ? `gild ${o.enh}` : o.kind === 'relic' ? `relic ${o.relic}` : o.kind; bought[k] = (bought[k] ?? 0) + 1; }
console.log('buys/run: ' + Object.entries(bought).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / N).toFixed(2)}`).join(', '));
// Builds at end of run: committed (>=2 gilds same enh) vs spread (>=2 gilds all different)
const cls = (r: Run4) => { const c: Record<string, number> = {}; r.gildsEnd.forEach((e) => (c[e] = (c[e] ?? 0) + 1)); const m = Math.max(0, ...Object.values(c)); return r.gildsEnd.length < 2 ? '0-1 gild' : m >= 2 ? 'committed' : 'spread'; };
for (const k of ['0-1 gild', 'committed', 'spread']) { const x = reach.filter((r) => cls(r) === k); console.log(`  reached boss with ${k}: ${pct(x.length, reach.length)}%, boss win ${pct(x.filter((r) => r.won).length, x.length)}%`); }

// LETHAL accuracy (game formula ignores the chip stack): replay boss fights directly.
let shown = 0, falsePos = 0, potDeaths = 0, warned = 0, trueShown = 0;
const sr = new Rng(55);
for (const r of reach.slice(0, 1500)) {
  const run = createRun(BASE, 1); // placeholder, we rebuild from scratch below
  void run;
}
// Direct: boss fights with stacks 0..6, starting kit, HP 24/32
for (const stack of [0, 2, 4, 6]) {
  let sh = 0, fp = 0, pd = 0, w = 0;
  for (let i = 0; i < 2000; i++) {
    const run = createRun(BASE, sr.int(0xffffffff)); run.depth = 5; run.player.hp = 24; run.player.chips = stack * CHIPS.stackPer;
    const fight = new Fight(fightConfig(run, BASE), sr.int(0xffffffff));
    const p = fight.sides.player;
    while (!fight.over) {
      // Right before the House's turn with a cash-out pending: what does the HUD say?
      if (fight.next === 'enemy' && fight.cashPending) {
        const skim = Math.ceil(fight.pot * POT.skim);
        const hud = skim >= p.hp + p.shield;
        const real = skim >= p.hp + p.shield + stack;
        if (hud) { sh++; if (!real) fp++; }
        const res = fight.step();
        const potKill = res.events.some((e: any) => e.type === 'potWin' && e.from === 'enemy' && e.targetHp <= 0);
        if (potKill) { pd++; if (hud) w++; }
        continue;
      }
      fight.step();
    }
  }
  console.log(`  LETHAL (at cash turn) stack ${stack}: shown ${sh}, false alarms ${pct(fp, sh)}%; pot deaths ${pd}, warned ${pct(w, pd)}%`);
  shown += sh; falsePos += fp; potDeaths += pd; warned += w; trueShown += sh - fp;
}
