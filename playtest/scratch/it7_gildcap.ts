// Act 2 gift values from identical B1 snapshots (commit policy afterwards), incl. TIER II gifts, measured
// with the real Mirror (taxed) and with the Mirror's HP frozen at its B1 size (untaxed).
//   npx tsx playtest/scratch/it7_gild.ts [N]
import type { Enh } from '../../src/core/config';
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { applyOption, GILD_SYMBOLS } from '../../src/core/run';
import { cappedPower } from './it7_power';
import { avg, buildOf, cloneRun, CABINET_ORDER, machinePower, playRun, Rng, type Policy } from './it7_lib';

const N = Number(process.argv[2] ?? 600);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(555 + cab.length), rng = new Rng(556);
  const out: RunState[] = [];
  for (let i = 0; i < N; i++) {
    try { playRun(seeds.int(0xffffffff), cab, { ...pol, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) { const c = cloneRun(run); (c as any).p0 = machinePower(run); throw new Snap(c); } } } }, rng); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}
const ENHS: Enh[] = ['gold', 'keen', 'charged', 'spiked', 'vamp', 'lucky', 'blaze'];
function gild(run: RunState, enh: Enh, reels: number[]) {
  const p = run.player;
  for (const reel of reels) {
    if (p.gilded.some((g) => g.enh === enh && g.reel === reel)) continue;
    const sym = GILD_SYMBOLS[enh].find((s) => (p.strips[reel][s] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === s));
    if (sym) applyOption(run, { kind: 'gild', enh, symbol: sym, reel }, false);
  }
}
const GIFTS: Record<string, (r: RunState, g: Rng) => void> = {
  none: () => {},
  '+8maxHP': (r) => { r.player.maxHp += 8; r.player.hp += 8; },
  'tierII 1 build gild': (r, g) => { const b = buildOf(r); const own = r.player.gilded.filter((x) => !x.tier && x.enh === b); const t = own.length ? g.pick(own) : g.pick(r.player.gilded.filter((x) => !x.tier)); if (t) t.tier = 2; },
  'tierII all gilds': (r) => r.player.gilded.forEach((x) => (x.tier = 2)),
  ...Object.fromEntries(ENHS.map((e) => [`${e} SET`, (r: RunState) => gild(r, e, [0, 1, 2])])),

};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab);
const noneV: Record<string, number[]> = { taxed: [], cap: [] } as Record<string, number[]>;
for (const [gn, gift] of Object.entries(GIFTS)) {
  const out: Record<string, number[]> = { taxed: [], cap: [] } as Record<string, number[]>;
  const byCab: string[] = [];
  for (const mode of ['taxed', 'cap']) {
    for (const cab of CABINET_ORDER) {
      let w = 0;
      snaps[cab].forEach((s, i) => {
        const r0 = cloneRun(s);
        gift(r0, new Rng(77 + i));
        const hooks = mode === 'cap' ? { preFight: (run: RunState, fight: Fight) => { if (fight.isMirror) fight.sides.enemy.hp = fight.sides.enemy.maxHp = Math.round(4 * cappedPower(run, 20).power + 55); } } : undefined;
        if (playRun(0, r0.cabinet, { ...pol, hooks }, new Rng(1000 + i), r0).won) w++;
      });
      const v = (100 * w) / snaps[cab].length;
      out[mode].push(v);
      if (mode === 'taxed') byCab.push(`${cab} ${v.toFixed(1)}`);
    }
  }
  if (gn === 'none') { noneV.taxed = out.taxed; noneV.cap = out.cap; }
  const d = (m: string) => avg(out[m].map((v, i) => v - noneV[m][i]));
  console.log(`${gn.padEnd(20)} taxed ${avg(out.taxed).toFixed(1)} (${d('taxed') >= 0 ? '+' : ''}${d('taxed').toFixed(1)})  cap20-Mirror ${avg(out.cap).toFixed(1)} (${d('cap') >= 0 ? '+' : ''}${d('cap').toFixed(1)})   ${byCab.join(' ')}`);
}
