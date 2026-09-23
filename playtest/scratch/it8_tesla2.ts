// TESLA levers round 2 (act 2 from identical B1 snapshots, commit): Rod for TESLA, charged level cap,
// TESLA act 2 max HP. Reports act 2 clear, reach-Mirror and Mirror win per cabinet.
//   npx tsx playtest/scratch/it8_tesla2.ts [N]
import { Fight } from '../../src/core/fight';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const origLevel = (Fight.prototype as any).level;
const opt = { chargedCap: 99, teslaRod: 0 };
(Fight.prototype as any).level = function (this: any, c: any, r: number) {
  const l = origLevel.call(this, c, r);
  const cell = c.reels[r].cells[c.reels[r].stop];
  return cell?.enh === 'charged' ? Math.min(opt.chargedCap, l) : l;
};
const V: Record<string, { set?: () => void; mut?: (r: RunState) => void; hook?: (r: RunState, f: Fight) => void }> = {
  base: {},
  'charged lvl cap 2': { set: () => (opt.chargedCap = 2) },
  'TESLA rod dmg 10': { hook: (r, f) => { if (r.cabinet === 'tesla' && (f as any).cfg.specialDamage === 12) (f as any).cfg.specialDamage = 10; } },
  'TESLA -3 maxHP': { mut: (r) => { if (r.cabinet === 'tesla') { r.player.maxHp -= 3; r.player.hp = Math.min(r.player.hp, r.player.maxHp); } } },
  'rod10 + cap2': { set: () => (opt.chargedCap = 2), hook: (r, f) => { if (r.cabinet === 'tesla' && (f as any).cfg.specialDamage === 12) (f as any).cfg.specialDamage = 10; } },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [vn, v] of Object.entries(V)) {
  opt.chargedCap = 99; v.set?.();
  const cells = CABINET_ORDER.map((cab) => {
    let w = 0, reach = 0, mw = 0;
    snaps[cab].forEach((s, i) => { const r0 = cloneRun(s); v.mut?.(r0); const r = playRun(0, r0.cabinet, { ...pol, hooks: v.hook ? { preFight: v.hook } : undefined }, new Rng(9000 + i), r0); if (r.won) w++; if (r.hpIntoMirror >= 0) { reach++; if (r.won) mw++; } });
    return { clr: (100 * w) / snaps[cab].length, reach: (100 * reach) / snaps[cab].length, mw: (100 * mw) / Math.max(1, reach) };
  });
  console.log(`${vn.padEnd(18)} ${CABINET_ORDER.map((c, i) => `${c} ${cells[i].clr.toFixed(1)} (reach ${cells[i].reach.toFixed(0)} win ${cells[i].mw.toFixed(0)})`).join('  ')}  tesla-knight ${(cells[3].clr - cells[0].clr).toFixed(1)} avg ${avg(cells.map((x) => x.clr)).toFixed(1)}`);
}
