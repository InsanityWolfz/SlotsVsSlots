// Structural proposals, full-run sim. Custom draft (script-side) so we can test new card types.
// npx tsx playtest/scratch/it1_sweep.ts [runs]
import type { RelicId, SymbolId } from '../../src/core/config';
import { ARCHETYPES } from '../../src/core/enemies';
import * as EN from '../../src/core/enemies';
import { RELICS } from '../../src/core/relics';
import { RUN, applyOption, createRun, draftOffers, finishFight, fightConfig, type DraftOption, type RunState } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';
import { BASE, Fight, Rng } from './it1_lib';

const N = Number(process.argv[2] ?? 3000);
type Card = DraftOption | { kind: 'swap'; from: SymbolId; to: SymbolId; reel: number; n: number } | { kind: 'clearRocks'; reel: number };

interface Variant {
  name: string;
  heal?: number;
  rockKeep?: number; // max rocks kept per fight
  relicDepths?: number[]; // drafts (run.depth after the win) that offer relics; others don't
  twoRelics?: boolean; // relic drafts show 2 relics
  swapCards?: boolean; // replace +/- cards with swap cards (shield->bolt etc.) & rock clears whole reel
  noBruteF1?: boolean;
  bossHp?: number;
  depthHp?: number[];
}

const RELIC_TIER: Record<RelicId, number> = { mirror: 10, battery: 9, fang: 9, whetstone: 7, clover: 7, magnet: 3, hourglass: 6, bandage: 5, soap: 4 };
function smartValue(run: RunState, o: Card): number {
  const p = run.player;
  const rocks = p.strips.reduce((a, s) => a + (s.rock ?? 0), 0);
  const ahead = process.env.BLIND ? [] : run.enemies.slice(run.depth).map((e) => e.archetype);
  switch (o.kind) {
    case 'relic':
      if (o.relic === 'magnet') return rocks > 2 || ahead.includes('golem') ? 9 : 3;
      if (o.relic === 'hourglass' && ahead.includes('brute')) return 7;
      if (o.relic === 'soap' && ahead.includes('slime')) return 5;
      return RELIC_TIER[o.relic];
    case 'heal': return (1 - p.hp / p.maxHp) * 20;
    case 'maxHp': return 5;
    case 'add': return o.symbol === 'bolt' ? 4.5 : o.symbol === 'sword' ? 2 : 1;
    case 'remove': return o.symbol === 'rock' ? 3 + rocks * 0.3 : o.symbol === 'shield' ? 3.5 : o.symbol === 'sword' ? 2.5 : 0;
    case 'swap': return o.to === 'bolt' ? 6 : o.to === 'sword' ? 4 : 1;
    case 'clearRocks': return 1 + 1.5 * (p.strips[o.reel].rock ?? 0);
  }
}
function apply(run: RunState, o: Card) {
  if (o.kind === 'swap') {
    const s = run.player.strips[o.reel];
    const k = Math.min(o.n, s[o.from] ?? 0);
    s[o.from] = (s[o.from] ?? 0) - k;
    s[o.to] = (s[o.to] ?? 0) + k;
    const last = run.records.at(-1); if (last) last.pick = { kind: 'maxHp', amount: 0 };
    return;
  }
  if (o.kind === 'clearRocks') { run.player.strips[o.reel].rock = 0; return; }
  applyOption(run, o);
}
function offers(run: RunState, v: Variant, rng: Rng): Card[] {
  let out: Card[] = draftOffers(run);
  const relicOk = !v.relicDepths || v.relicDepths.includes(run.depth);
  if (v.swapCards) {
    out = out.map((o): Card => {
      if (o.kind === 'add' || (o.kind === 'remove' && o.symbol !== 'rock')) {
        const syms: SymbolId[] = ['sword', 'shield', 'bolt'];
        const from = rng.pick(syms); const to = rng.pick(syms.filter((s) => s !== from));
        return { kind: 'swap', from, to, reel: rng.int(3), n: 2 };
      }
      if (o.kind === 'remove' && o.symbol === 'rock') return { kind: 'clearRocks', reel: o.reel };
      return o;
    });
  }
  if (!relicOk) out = out.map((o): Card => (o.kind === 'relic' ? (v.swapCards ? { kind: 'swap', from: 'shield', to: rng.pick(['bolt', 'sword'] as SymbolId[]), reel: rng.int(3), n: 2 } : { kind: 'maxHp', amount: RUN.maxHpCard }) : o));
  if (relicOk && v.twoRelics) {
    const have = new Set([...run.player.relics, ...out.flatMap((o) => (o.kind === 'relic' ? [o.relic] : []))]);
    const pool = (Object.keys(RELICS) as RelicId[]).filter((r) => !have.has(r));
    if (pool.length) out[0] = { kind: 'relic', relic: rng.pick(pool) };
  }
  return out;
}

type Pol = 'random' | 'greedy' | 'relicFirst' | 'smart';
function choose(run: RunState, os: Card[], pol: Pol, rng: Rng): Card {
  const best = (f: (o: Card) => number) => os.reduce((a, b) => (f(b) > f(a) ? b : a));
  const gv = (o: Card) => (o.kind === 'swap' || o.kind === 'clearRocks' ? smartValue(run, o) : greedyValue(run, o));
  if (pol === 'random') return rng.pick(os);
  if (pol === 'greedy') return best(gv);
  if (pol === 'relicFirst') return best((o) => (o.kind === 'relic' ? 100 : 0) + gv(o));
  return best((o) => smartValue(run, o));
}

function runOnce(v: Variant, pol: Pol, seed: number, rng: Rng): { won: boolean; death: number } {
  const run = createRun(BASE, seed);
  if (v.noBruteF1 && run.enemies[0].archetype === 'brute') run.enemies[0] = EN.makeEnemy(ARCHETYPES[0], 0, rng);
  if (v.bossHp) run.enemies[5].hp = v.bossHp;
  while (!run.over) {
    const f = new Fight(fightConfig(run, BASE), rng.int(0xffffffff));
    while (!f.over) f.step();
    const before = run.player.strips.map((s) => s.rock ?? 0);
    const depth = run.depth;
    finishFight(run, f);
    if (v.rockKeep !== undefined) {
      let extra = run.player.strips.reduce((a, s, i) => a + (s.rock ?? 0) - before[i], 0) - v.rockKeep;
      for (let i = 0; extra > 0 && i < 30; i++) { const s = run.player.strips[i % 3]; if ((s.rock ?? 0) > before[i % 3]) { s.rock! -= 1; extra--; } }
    }
    if (run.over) return { won: run.won, death: run.won ? -1 : depth };
    apply(run, choose(run, offers(run, v, rng), pol, rng));
  }
  return { won: run.won, death: -1 };
}

const variants: Variant[] = [
  { name: 'A baseline' },
  { name: 'B heal 20%', heal: 0.2 },
  { name: 'C rocks keep<=2/fight', rockKeep: 2 },
  { name: 'D relics only after F2,F4 (2 relics shown)', relicDepths: [2, 4], twoRelics: true },
  { name: 'E swap cards (2 cells) + clear-reel rocks', swapCards: true },
  { name: 'F = B+C+D+E + no brute F1', heal: 0.2, rockKeep: 2, relicDepths: [2, 4], twoRelics: true, swapCards: true, noBruteF1: true },
  { name: 'G = F + boss 44', heal: 0.2, rockKeep: 2, relicDepths: [2, 4], twoRelics: true, swapCards: true, noBruteF1: true, bossHp: 44 },
  { name: 'H = F + relics after F1,F3 (2 shown) + boss 44', heal: 0.2, rockKeep: 2, relicDepths: [1, 3], twoRelics: true, swapCards: true, noBruteF1: true, bossHp: 44 },
  { name: 'I = F, heal 30%, boss 44', heal: 0.3, rockKeep: 2, relicDepths: [2, 4], twoRelics: true, swapCards: true, noBruteF1: true, bossHp: 44 },
];
const baseHeal = RUN.postFightHeal, baseBoss = EN.BOSS_HP;
for (const v of variants.filter((x) => !process.env.ONLY || process.env.ONLY.split(',').includes(x.name[0]))) {
  RUN.postFightHeal = v.heal ?? baseHeal;
  (EN as any).BOSS_HP; // BOSS_HP is a const export; patch via makeEnemy wrapper below
  const res: string[] = [];
  let deathsSmart = '';
  for (const pol of ['random', 'greedy', 'relicFirst', 'smart'] as Pol[]) {
    const seeds = new Rng(4242), rng = new Rng(11);
    let w = 0; const d = Array(6).fill(0);
    for (let i = 0; i < N; i++) {
      const r = runOnce(v, pol, seeds.int(0xffffffff), rng);
      if (r.won) w++; else d[r.death]++;
    }
    res.push(`${pol} ${(100 * w / N).toFixed(1)}`);
    if (pol === 'smart') deathsSmart = d.map((x) => (100 * x / N).toFixed(0)).join('/');
  }
  console.log(`${v.name.padEnd(48)} ${res.join('  ')}   smart deaths F1..boss ${deathsSmart}`);
}
RUN.postFightHeal = baseHeal;
void baseBoss;

