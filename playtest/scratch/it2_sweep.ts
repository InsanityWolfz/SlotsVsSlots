// Proposal sweep by monkeypatching exported tunables (no src edits). npx tsx playtest/scratch/it2_sweep.ts [runs]
import { ARCHETYPES, BOSS } from '../../src/core/enemies';
import { POT } from '../../src/core/relics';
import { RUN } from '../../src/core/run';
import { FORKS, POLICIES, playRun, Rng, type FightFeel, createRun, BASE } from './it2_lib';

const N = Number(process.argv[2] ?? 3000);
const A = (id: string) => ARCHETYPES.find((a) => a.id === id)!;
const snapshot = JSON.stringify({ RUN, POT, ARCH: ARCHETYPES, BOSS });
function reset() {
  const s = JSON.parse(snapshot);
  Object.assign(RUN, s.RUN); Object.assign(POT, s.POT);
  ARCHETYPES.forEach((a, i) => Object.assign(a, s.ARCH[i]));
  Object.assign(BOSS, s.BOSS);
}
let bossHp: number | null = null;

const variants: [string, () => void][] = [
  ['V0 current', () => {}],
  ['V1 cash every 4', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; }],
  ['V2 boss coins 3->2 (+1 shield)', () => { BOSS.strip = { sword: 4, shield: 4, coin: 2, seven: 2 }; }],
  ['V3 V1 + V2', () => { BOSS.ability = { ...BOSS.ability, every: 4 }; BOSS.strip = { sword: 4, shield: 4, coin: 2, seven: 2 }; }],
  ['V4 maxHp card 4, heal 8', () => { RUN.maxHpCard = 4; RUN.healCard = 8; }],
  ['V5 enemies: brute smash 3, thief pilfer every 4, gremlin/golem/frost HP x1.25', () => {
    A('brute').ability = { ...A('brute').ability, power: 3 }; A('thief').ability = { ...A('thief').ability, every: 4 };
    for (const id of ['gremlin', 'golem', 'frost']) A(id).hpMul *= 1.25;
  }],
  ['V6 V3+V4+V5', () => {
    BOSS.ability = { ...BOSS.ability, every: 4 }; BOSS.strip = { sword: 4, shield: 4, coin: 2, seven: 2 }; RUN.maxHpCard = 4; RUN.healCard = 8;
    A('brute').ability = { ...A('brute').ability, power: 3 }; A('thief').ability = { ...A('thief').ability, every: 4 };
    for (const id of ['gremlin', 'golem', 'frost']) A(id).hpMul *= 1.25;
  }],
  ['V7 V6 + swapCount 3', () => {
    BOSS.ability = { ...BOSS.ability, every: 4 }; BOSS.strip = { sword: 4, shield: 4, coin: 2, seven: 2 }; RUN.maxHpCard = 4; RUN.healCard = 8; RUN.swapCount = 3;
    A('brute').ability = { ...A('brute').ability, power: 3 }; A('thief').ability = { ...A('thief').ability, every: 4 };
    for (const id of ['gremlin', 'golem', 'frost']) A(id).hpMul *= 1.25;
  }],
];
void bossHp; void createRun; void BASE;

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * p)] ?? 0; };
for (const [name, apply] of variants) {
  reset(); apply();
  const row: string[] = [];
  let bossLine = '';
  for (const [dp, fp] of [['greedy', 'simGreedy'], ['hpFirst', 'simGreedy'], ['random', 'random'], ['neverRelic', 'simGreedy']] as const) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let wins = 0; const deaths = Array(6).fill(0); const boss: FightFeel[] = []; const all: FightFeel[] = [];
    for (let i = 0; i < N; i++) {
      const r = playRun(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr);
      if (r.won) wins++; else deaths[r.deathDepth]++;
      boss.push(...r.fights.filter((f) => f.arch === 'house')); all.push(...r.fights);
    }
    row.push(`${dp} ${pct(wins, N)}`);
    if (dp === 'greedy') {
      const bd = boss.filter((f) => !f.won); const cash = boss.flatMap((f) => f.potCashouts);
      const kr = (id: string) => { const fs = all.filter((f) => f.arch === id); return `${id} ${pct(fs.filter((f) => !f.won).length, fs.length)}`; };
      bossLine = `   deaths ${deaths.map((d) => pct(d, N)).join('/')} | boss lethal ${pct(bd.length, boss.length)} (pot kills ${pct(bd.filter((f) => f.killer === 'pot').length, bd.length)}% of those), cashout avg ${(cash.reduce((a, b) => a + b, 0) / Math.max(1, cash.length)).toFixed(1)} p90 ${q(cash, 0.9)}, ${(cash.length / boss.length).toFixed(2)}/fight, turns ${(boss.reduce((a, f) => a + f.turns, 0) / boss.length).toFixed(1)} | ${['brute', 'thief', 'frost', 'gremlin', 'golem', 'slime'].map(kr).join(' ')}`;
    }
  }
  console.log(`${name}\n   ${row.join('  |  ')}\n${bossLine}`);
}
