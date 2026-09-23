// Gild values in act 2: snapshot every run at the start of act 2 (after legend + intro Cashier), then
// continue with a free gift and compare act 2 clear against no gift (common random numbers).
//   npx tsx playtest/scratch/it6_gild.ts [N]
import type { Enh } from '../../src/core/config';
import type { RunState } from '../../src/core/run';
import { applyOption, GILD_SYMBOLS } from '../../src/core/run';
import { cloneRun, CABINET_ORDER, playRun, Rng, avg, type Policy } from './it6_lib';

const N = Number(process.argv[2] ?? 600);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'random' };
class Snap { constructor(public run: RunState) {} }
const ENHS: Enh[] = ['gold', 'keen', 'charged', 'spiked', 'vamp', 'lucky', 'blaze'];

function snapshots(cab: any): RunState[] {
  const seeds = new Rng(555 + cab.length), rng = new Rng(556);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    try {
      playRun(seeds.int(0xffffffff), cab, { ...pol, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng);
    } catch (e) {
      if (e instanceof Snap) out.push(e.run); else throw e;
    }
  }
  return out;
}
/** Gift: one gild of `enh` on an eligible reel/symbol not already gilded (prefer extending a reel set). mode 'set' gilds all 3 reels. */
function gift(run: RunState, enh: Enh, mode: 'one' | 'set', rng: Rng): boolean {
  const p = run.player;
  const reels = mode === 'set' ? [0, 1, 2] : [rng.int(3)];
  let any = false;
  for (const reel of reels) {
    if (p.gilded.some((g) => g.enh === enh && g.reel === reel) && mode === 'set') { any = true; continue; }
    const sym = GILD_SYMBOLS[enh].find((s) => (p.strips[reel][s] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === s));
    if (!sym) continue;
    applyOption(run, { kind: 'gild', enh, symbol: sym, reel }, false);
    any = true;
  }
  return any;
}
function cont(runs: RunState[], mut: ((r: RunState, rng: Rng) => void) | null): number {
  let w = 0;
  runs.forEach((s, i) => {
    const r = cloneRun(s);
    const rng = new Rng(1000 + i);
    mut?.(r, new Rng(77 + i));
    if (playRun(0, r.cabinet, pol, rng, r).won) w++;
  });
  return (100 * w) / runs.length;
}

console.log(`act 2 clear % (runs that reached act 2), commit policy; gift applied at the start of act 2`);
console.log(`cabinet  n     none   ${ENHS.map((e) => `${e}1`.padEnd(8)).join('')} | ${ENHS.map((e) => `${e}SET`.padEnd(9)).join('')} +8maxHP  +20chips`);
const agg: Record<string, number[]> = {};
for (const cab of CABINET_ORDER) {
  const snaps = snapshots(cab);
  const none = cont(snaps, null);
  const ones = ENHS.map((e) => cont(snaps, (r, g) => void gift(r, e, 'one', g)) - none);
  const sets = ENHS.map((e) => cont(snaps, (r, g) => void gift(r, e, 'set', g)) - none);
  const hp = cont(snaps, (r) => { r.player.maxHp += 8; r.player.hp += 8; }) - none;
  const chips = cont(snaps, (r) => { r.player.chips += 20; }) - none;
  ENHS.forEach((e, i) => { (agg[`${e}1`] ??= []).push(ones[i]); (agg[`${e}SET`] ??= []).push(sets[i]); });
  const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(1);
  console.log(`${cab.padEnd(8)} ${String(snaps.length).padEnd(5)} ${none.toFixed(1).padEnd(6)} ${ones.map((x) => f(x).padEnd(8)).join('')} | ${sets.map((x) => f(x).padEnd(9)).join('')} ${f(hp).padEnd(8)} ${f(chips)}`);
}
console.log(`\naverage over cabinets: ${Object.entries(agg).map(([k, v]) => `${k} ${avg(v).toFixed(1)}`).join(' | ')}`);
