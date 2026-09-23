// Chasing each act 2 gild from B1 (draft + shop), identical snapshots.   npx tsx playtest/scratch/it7_chase.ts [N]
import type { Enh } from '../../src/core/config';
import type { RunState } from '../../src/core/run';
import { buy, shopOffers } from '../../src/core/run';
import { DRAFTS, avg, chaseDraft, cloneRun, CABINET_ORDER, pct, playRun, Rng, SHOPS, type Policy } from './it7_lib';
const N = Number(process.argv[2] ?? 600);
const base: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snapshots(cab: any): RunState[] {
  const seeds = new Rng(31337 + cab.length), rng = new Rng(4); const out: RunState[] = [];
  for (let i = 0; i < N; i++) { try { playRun(seeds.int(0xffffffff), cab, { ...base, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 0) throw new Snap(cloneRun(run)); } } }, rng); } catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; } }
  return out;
}
const chaseShop = (enh: Enh) => (run: RunState, rng: Rng) => {
  for (const it of shopOffers(run)) if (!it.sold && it.option.kind === 'gild' && it.option.enh === enh && run.player.chips >= it.price) buy(run, it);
  SHOPS.commit(run, rng);
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab);
for (const enh of (process.argv[3] ? process.argv[3].split(',') : ['none', 'vamp', 'blaze', 'lucky', 'gold', 'charged', 'spiked', 'keen', 'maxhp']) as any[]) {
  const vals: string[] = []; const all: number[] = []; const sets: number[] = [];
  for (const cab of CABINET_ORDER) {
    let w = 0, s = 0;
    snaps[cab].forEach((sn, i) => {
      let pol: Policy = base;
      if (enh === 'maxhp') pol = { ...base, draft: (run, offers, rng) => offers.find((o) => o.kind === 'maxHp') ?? offers.find((o) => o.kind === 'heal' && run.player.hp < run.player.maxHp * 0.8) ?? DRAFTS.commit(run, offers, rng) };
      else if (enh !== 'none') pol = { ...base, draft: chaseDraft(enh), shop: '__chase' as any };
      if (enh !== 'none' && enh !== 'maxhp') SHOPS.__chase = chaseShop(enh);
      const r = playRun(0, sn.cabinet, pol, new Rng(9000 + i), cloneRun(sn));
      if (r.won) w++;
      if (enh !== 'none' && enh !== 'maxhp' && r.setsAtMirror.includes(enh)) s++;
    });
    const v = (100 * w) / snaps[cab].length; all.push(v); sets.push((100 * s) / snaps[cab].length);
    vals.push(`${cab} ${v.toFixed(1)}`);
  }
  console.log(`chase ${enh.padEnd(8)} act2 clear ${avg(all).toFixed(1)}  set at Mirror ${avg(sets).toFixed(0)}%   ${vals.join(' ')}`);
}
