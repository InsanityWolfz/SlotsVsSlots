// Combined proposal ("Package H") vs current. npx tsx playtest/scratch/it2_package.ts [runs]
import { ARCHETYPES, BOSS } from '../../src/core/enemies';
import { RELICS } from '../../src/core/relics';
import { RUN } from '../../src/core/run';
import type { RelicId } from '../../src/core/config';
import { FORKS, HOOK, POLICIES, playRun, Rng, Fight, type FightFeel } from './it2_lib';

const N = Number(process.argv[2] ?? 3000);
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-');
const proto = Fight.prototype as any;
const A = (id: string) => ARCHETYPES.find((a) => a.id === id)!;
const DANGER: Record<string, number> = { slime: 3, frost: 6, golem: 5, thief: 11, gremlin: 8, brute: 15 };
const snap = JSON.stringify({ RUN, ARCH: ARCHETYPES, BOSS });
const origCash = proto.cashPot;
function reset() {
  const s = JSON.parse(snap); Object.assign(RUN, s.RUN); ARCHETYPES.forEach((a, i) => Object.assign(a, s.ARCH[i])); Object.assign(BOSS, s.BOSS);
  proto.cashPot = origCash; HOOK.onCreate = null; HOOK.afterWin = null;
}
function skim(this: any, me: any, foe: any, events: any[]) {
  const amount = Math.ceil(this.pot / 2); this.pot -= amount;
  const h = this.damage(foe, amount, false);
  events.push({ type: 'potWin', from: me.side, to: foe.side, amount, ...h }); this.checkDeath(foe, events);
}
const hardIdx = (opts: { archetype: string }[]) => (DANGER[opts[1].archetype] ?? 0) > (DANGER[opts[0].archetype] ?? 0) ? 1 : 0;

function packageH(eliteHpMul: number, elite = true) {
  BOSS.ability = { ...BOSS.ability, every: 4 }; proto.cashPot = skim;
  RUN.maxHpCard = 4; RUN.healCard = 8; RUN.swapCount = 3;
  A('brute').ability = { ...A('brute').ability, power: 3 };
  A('thief').ability = { ...A('thief').ability, every: 4 };
  for (const id of ['gremlin', 'golem', 'frost']) A(id).hpMul *= 1.25;
  if (!elite) return;
  HOOK.onCreate = (run) => {
    for (const d of [1, 2, 3]) { const o = run.paths[d]; if (o.length === 2 && o[0].archetype !== o[1].archetype) { const h = o[hardIdx(o)]; h.hp = Math.round(h.hp * eliteHpMul); (h as any).elite = true; } }
  };
  HOOK.afterWin = (run, _arch, depth) => {
    if (!(run.enemies[depth] as any).elite) return;
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !run.player.relics.includes(r));
    if (pool.length) run.player.relics.push(new Rng((run.seed + depth * 77) >>> 0).pick(pool));
  };
}

const variants: [string, () => void][] = [
  ['current', () => {}],
  ['H: skim/4 + HP cards 4/8 + swap 3 + enemy retune, no elite', () => packageH(1, false)],
  ['H + elite (free relic, elite HP x1.0)', () => packageH(1.0)],
  ['H + elite (free relic, elite HP x1.25)', () => packageH(1.25)],
  ['H + elite (free relic, elite HP x1.4)', () => packageH(1.4)],
];
for (const [name, apply] of variants) {
  reset(); apply();
  const row: string[] = []; let detail = '';
  for (const [dp, fp] of [['greedy', 'simGreedy'], ['greedy', 'hardest'], ['greedy', 'random'], ['hpFirst', 'simGreedy'], ['neverRelic', 'simGreedy'], ['swapFirst', 'simGreedy'], ['random', 'random']] as const) {
    const seeds = new Rng(4242), pr = new Rng(99), fr = new Rng(7);
    let wins = 0; const deaths = Array(6).fill(0); const all: FightFeel[] = [];
    for (let i = 0; i < N; i++) { const r = playRun(seeds.int(0xffffffff), POLICIES[dp], FORKS[fp], pr, fr); if (r.won) wins++; else deaths[r.deathDepth]++; all.push(...r.fights); }
    row.push(`${dp}/${fp} ${pct(wins, N)}`);
    if (dp === 'greedy' && fp === 'simGreedy') {
      const kr = (id: string) => { const fs = all.filter((f) => f.arch === id); return `${id} ${pct(fs.filter((f) => !f.won).length, fs.length)}`; };
      detail = `   deaths F1-5/boss ${deaths.map((d) => pct(d, N)).join('/')} | ${['brute', 'thief', 'frost', 'gremlin', 'golem', 'slime', 'house'].map(kr).join(' ')}`;
    }
  }
  console.log(`${name}\n   ${row.join(' | ')}\n${detail}`);
}
