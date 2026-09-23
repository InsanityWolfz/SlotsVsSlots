// Boss pot variants + ELITE fork reward, via monkeypatching (no src edits). npx tsx playtest/scratch/it2_boss.ts [runs]
import { BOSS } from '../../src/core/enemies';
import { RELICS } from '../../src/core/relics';
import type { RelicId } from '../../src/core/config';
import { FORKS, HOOK, POLICIES, playRun, Rng, Fight, type FightFeel } from './it2_lib';

const N = Number(process.argv[2] ?? 3000);
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; };
const proto = Fight.prototype as any;
const origCash = proto.cashPot;
const origBoss = JSON.parse(JSON.stringify(BOSS));
function reset() { Object.assign(BOSS, JSON.parse(JSON.stringify(origBoss))); proto.cashPot = origCash; HOOK.onCreate = null; HOOK.afterWin = null; }
const bossHp = (hp: number) => (HOOK.onCreate = (r) => { r.paths[5][0].hp = hp; r.enemies[5] = r.paths[5][0]; });

function measure(label: string) {
  const out: string[] = [];
  let detail = '';
  for (const [dp, fp] of [['greedy', 'simGreedy'], ['hpFirst', 'simGreedy'], ['random', 'random']] as const) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let wins = 0; const boss: FightFeel[] = [];
    for (let i = 0; i < N; i++) { const r = playRun(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr); if (r.won) wins++; boss.push(...r.fights.filter((f) => f.arch === 'house')); }
    out.push(`${dp} ${pct(wins, N)}`);
    if (dp === 'greedy') {
      const bd = boss.filter((f) => !f.won), cash = boss.flatMap((f) => f.potCashouts), st = boss.flatMap((f) => f.potSteals);
      const hi = boss.filter((f) => f.hpBefore / f.maxHp >= 0.75);
      detail = `   boss lethal ${pct(bd.length, boss.length)} | from >=75% HP ${pct(hi.filter((f) => !f.won).length, hi.length)} | pot kills ${pct(bd.filter((f) => f.killer === 'pot').length, bd.length)}% burst ${pct(bd.filter((f) => f.burstDeath).length, bd.length)}% | house cashouts ${(cash.length / boss.length).toFixed(2)}/fight avg ${(cash.reduce((a, b) => a + b, 0) / Math.max(1, cash.length)).toFixed(1)} p90 ${q(cash, 0.9)} | player steals ${(st.length / boss.length).toFixed(2)}/fight avg ${(st.reduce((a, b) => a + b, 0) / Math.max(1, st.length)).toFixed(1)} | turns ${(boss.reduce((a, f) => a + f.turns, 0) / boss.length).toFixed(1)} | boss HP left at death ${(100 * bd.reduce((a, f) => a + f.enemyHpAtDeath, 0) / Math.max(1, bd.length)).toFixed(0)}%`;
    }
  }
  console.log(`${label}\n   ${out.join('  |  ')}\n${detail}`);
}

const skim = function (this: any, me: any, foe: any, events: any[]) {
  const amount = Math.ceil(this.pot / 2);
  this.pot -= amount;
  const h = this.damage(foe, amount, false);
  events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h });
  this.checkDeath(foe, events);
};

const variants: [string, () => void][] = [
  ['B6 skim every 4, HP 52', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; proto.cashPot = skim; bossHp(52); }],
  ['B7 skim every 3, HP 52', () => { BOSS.ability = { ...BOSS.ability, every: 3 }; proto.cashPot = skim; bossHp(52); }],
  ['B0 current (HP 44, cash every 6, coins 3)', () => {}],
  ['B1 cash every 4, HP 40', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; bossHp(40); }],
  ['B2 cash every 4, coins 2 (+1 shield), HP 40', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; BOSS.strip = { sword: 4, shield: 4, coin: 2, seven: 2 }; bossHp(40); }],
  ['B3 skim: House cashes HALF the pot every 4, HP 40', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; proto.cashPot = skim; bossHp(40); }],
  ['B4 skim every 3, HP 40', () => { BOSS.ability = { ...BOSS.ability, every: 3 }; proto.cashPot = skim; bossHp(40); }],
  ['B5 skim every 4, HP 44', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; proto.cashPot = skim; }],
];
for (const [name, apply] of variants) { reset(); apply(); measure(name); }

// ---- ELITE forks: the more dangerous option (brute/thief/gremlin > others) pays a free random relic on a win.
reset();
const DANGER: Record<string, number> = { slime: 3, frost: 6, golem: 5, thief: 11, gremlin: 8, brute: 15 };
console.log('\nELITE fork reward (harder option at a fork grants a free random relic when beaten)');
for (const elite of [false, true]) {
  const eliteMarks = new WeakMap<object, number>();
  HOOK.afterWin = elite ? (run, arch, depth) => {
    const opts = run.paths[depth];
    if (opts.length < 2) return;
    const hard = opts.reduce((a, b) => ((DANGER[b.archetype] ?? 0) > (DANGER[a.archetype] ?? 0) ? b : a));
    if (hard.archetype !== arch || opts[0].archetype === opts[1].archetype) return;
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r));
    const rng = new Rng((run.seed + depth * 77) >>> 0);
    if (pool.length) run.player.relics.push(rng.pick(pool));
    eliteMarks.set(run, (eliteMarks.get(run) ?? 0) + 1);
  } : null;
  const row: string[] = [];
  for (const fp of ['simGreedy', 'hardest', 'random'] as const) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let wins = 0;
    for (let i = 0; i < N; i++) if (playRun(seeds.int(0xffffffff), POLICIES.greedy, FORKS[fp], pr, fr).won) wins++;
    row.push(`${fp} ${pct(wins, N)}`);
  }
  console.log(`  elite=${elite}: greedy drafts with forks ${row.join('  ')}`);
}
