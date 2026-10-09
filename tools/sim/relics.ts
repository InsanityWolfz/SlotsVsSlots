// Relic audit: every relic on every machine it can show up for, the same fights with and without it. Lists the ones
// that never pop (no icon when they work) or change nothing in a fight. npx tsx tools/sim/relics.ts [N] (ALL=1: every row)
import { defaultConfig, type Enh, type RelicId } from '../../src/core/config';
import { CABINET_ORDER, CABINETS, type CabinetId } from '../../src/core/cabinets';
import { RELICS } from '../../src/core/relics';
import { createRun, fightConfig, needsChoice, chooseEnemy, type RunState } from '../../src/core/run';
import { CHARM_SYMBOLS } from '../../src/core/charms';
import { Fight } from '../../src/core/fight';
import type { CombatEvent } from '../../src/core/events';

const base = defaultConfig();
const N = Number(process.argv[2] ?? 40);
const ENHS: Enh[] = ['gold', 'keen', 'vamp', 'charged', 'lucky', 'blaze', 'lucre', 'trick', 'echo'];

function runAt(cab: CabinetId, seed: number, act: number, depth: number): RunState {
  const r = createRun(base, seed, cab);
  r.pendingStart = null;
  r.act = act;
  r.depth = depth;
  if (needsChoice(r)) chooseEnemy(r, 0);
  // A mid-run build: 2 of every Charm this machine can hold, on its own symbols.
  const syms = [CABINETS[cab].attack, ...CABINETS[cab].symbols];
  for (const e of ENHS) {
    const on = syms.find((s) => CHARM_SYMBOLS[e].includes(s));
    if (!on) continue;
    r.player.gilded.push({ reel: ENHS.indexOf(e) % 3, symbol: on, enh: e, n: 2 });
  }
  return r;
}

type Stat = { fired: number; dealt: number; taken: number; healed: number; won: number; turns: number; chips: number; kinds: Set<string> };
function play(cab: CabinetId, seed: number, relic: RelicId | null): Stat {
  const s: Stat = { fired: 0, dealt: 0, taken: 0, healed: 0, won: 0, turns: 0, chips: 0, kinds: new Set() };
  for (const [act, depth] of [[1, 3], [2, 2], [2, 5]] as const) {
    const r = runAt(cab, seed, act, depth);
    if (relic) r.player.relics.push(relic);
    const cfg = fightConfig(r, base);
    const f = new Fight(cfg, seed * 7 + act * 13 + depth);
    for (let i = 0; i < 400 && !f.over; i++) {
      const evs: CombatEvent[] = f.step().events;
      for (const e of evs) {
        s.kinds.add(e.type);
        if (e.type === 'relic' && e.relic === relic) s.fired++;
        if (e.type === 'spin' && relic && e.score.relics?.includes(relic)) s.fired++;
        if (e.type === 'specialFire' && e.from === 'player') s.dealt += e.amount;
        if (e.type === 'attack' && e.from === 'player') s.dealt += e.amount;
        if (e.type === 'attack' && e.from === 'enemy') s.taken += e.amount;
        if (e.type === 'heal' && e.side === 'player') s.healed += e.amount;
      }
      s.turns++;
    }
    if (f.sides.enemy.hp <= 0) s.won++;
  }
  return s;
}

const out: string[] = [];
for (const id of Object.keys(RELICS) as RelicId[]) {
  const def = RELICS[id];
  if (def.retired) continue;
  const cabs = def.machine ? [def.machine] : CABINET_ORDER;
  for (const cab of cabs) {
    const a = { fired: 0, dealt: 0, taken: 0, healed: 0, won: 0, turns: 0 };
    const b = { ...a };
    for (let k = 0; k < N; k++) {
      const x = play(cab, 1000 + k, null), y = play(cab, 1000 + k, id);
      for (const key of Object.keys(a) as (keyof typeof a)[]) { a[key] += x[key] as number; b[key] += y[key] as number; }
    }
    const pct = (p: number, q: number) => (p === 0 ? (q === 0 ? '0' : 'new') : `${(((q - p) / p) * 100).toFixed(0)}%`);
    const same = a.dealt === b.dealt && a.taken === b.taken && a.healed === b.healed && a.turns === b.turns;
    if (process.env.ALL !== '1' && b.fired > 0 && !same) continue;
    out.push(`${(def.name + (def.machine ? '' : ` @${cab}`)).padEnd(26)} fired ${String(b.fired).padStart(4)} | dealt ${pct(a.dealt, b.dealt).padStart(5)} taken ${pct(a.taken, b.taken).padStart(5)} healed ${pct(a.healed, b.healed).padStart(5)} won ${a.won}->${b.won}${same ? '   <<< NO EFFECT IN FIGHTS' : ''}`);
  }
}
console.log(out.join('\n'));
