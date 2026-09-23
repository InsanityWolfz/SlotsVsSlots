// Why is a KEEN SET gift negative? Gift at B1 (commit after), with/without the Mirror copying keen, taxed/untaxed,
// and act 2 clear excluding the Mirror (reach-Mirror).   npx tsx playtest/scratch/it8_keen.ts [N]
import type { Enh } from '../../src/core/config';
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { TUNE } from '../../src/core/enemies';
import { applyOption, GILD_SYMBOLS } from '../../src/core/run';
import { avg, cloneRun, CABINET_ORDER, machinePower, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 500);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
function gild(run: RunState, enh: Enh) {
  const p = run.player;
  for (const reel of [0, 1, 2]) {
    if (p.gilded.some((g) => g.enh === enh && g.reel === reel)) continue;
    const sym = GILD_SYMBOLS[enh].find((s) => (p.strips[reel][s] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === s));
    if (sym) applyOption(run, { kind: 'gild', enh, symbol: sym, reel }, false);
  }
}
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N, 555);
for (const enh of ['none', 'keen', 'vamp', 'gold'] as const) {
  for (const mode of ['real', 'noCopy', 'noCopyUntaxed']) {
    const clr: number[] = [], reach: number[] = [], mw: number[] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, r = 0, m = 0;
      snaps[cab].forEach((s, i) => {
        const r0 = cloneRun(s);
        if (enh !== 'none') gild(r0, enh);
        const giftPow = machinePower(r0) - machinePower(s);
        const hooks = { preFight: (run: RunState, f: Fight) => {
          if (!f.isMirror) return;
          if (mode !== 'real' && enh !== 'none') for (const reel of f.sides.enemy.reels) for (const c of reel.cells) if (c.enh === enh) delete (c as any).enh;
          if (mode === 'noCopyUntaxed') f.sides.enemy.hp = f.sides.enemy.maxHp = Math.round(TUNE.mirrorPower * (machinePower(run) - giftPow)) + TUNE.mirrorFlat;
        } };
        const rr = playRun(0, r0.cabinet, { ...pol, hooks }, new Rng(1000 + i), r0);
        if (rr.won) w++; if (rr.hpIntoMirror >= 0) { r++; if (rr.won) m++; }
      });
      clr.push((100 * w) / snaps[cab].length); reach.push((100 * r) / snaps[cab].length); mw.push((100 * m) / Math.max(1, r));
    }
    console.log(`${enh.padEnd(5)} ${mode.padEnd(14)} clear ${avg(clr).toFixed(1)}  reachMirror ${avg(reach).toFixed(1)}  mirrorWin ${avg(mw).toFixed(1)}   clear by cab ${clr.map((x) => x.toFixed(0)).join('/')}`);
    if (enh === 'none') break;
  }
}
