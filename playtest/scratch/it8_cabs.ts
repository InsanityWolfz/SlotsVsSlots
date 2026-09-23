// Cabinet act 2 levers from identical B1 snapshots (commit + a random-draft check for the combo).
//   npx tsx playtest/scratch/it8_cabs.ts [N]
import type { Fight } from '../../src/core/fight';
import { CABINETS } from '../../src/core/cabinets';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const commit: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const rnd: Policy = { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' };
type L = { mut?: (r: RunState) => void; hook?: (r: RunState, f: Fight) => void; set?: () => () => void };
const rod10: L = { hook: (r, f) => { if (r.cabinet === 'tesla' && (f as any).cfg.specialDamage === 12) (f as any).cfg.specialDamage = 10; } };
const midasNoChip: L = { set: () => { const c = CABINETS.midas as any; const o = c.chipsPerWin; c.chipsPerWin = 0; return () => (c.chipsPerWin = o); } };
const knightHp: L = { mut: (r) => { if (r.cabinet === 'knight') { r.player.maxHp += 6; r.player.hp += 6; } } };
const jokerWild: L = { mut: (r) => { if (r.cabinet === 'joker') { const s = r.player.strips[2]; const n = Math.min(2, s.shield ?? 0); s.shield = (s.shield ?? 0) - n; s.wild = (s.wild ?? 0) + n; } } };
const combo = (...ls: L[]): L => ({
  mut: (r) => ls.forEach((l) => l.mut?.(r)),
  hook: (r, f) => ls.forEach((l) => l.hook?.(r, f)),
  set: () => { const u = ls.map((l) => l.set?.() ?? (() => {})); return () => u.forEach((x) => x()); },
});
const V: Record<string, L> = { base: {}, 'TESLA rod 10': rod10, 'MIDAS no act2 chip': midasNoChip, 'KNIGHT +6 maxHP': knightHp, 'JOKER +2 wilds r3': jokerWild, combo: combo(rod10, midasNoChip, knightHp, jokerWild) };
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [vn, v] of Object.entries(V)) {
  for (const [pn, pol] of vn === 'combo' || vn === 'base' ? [['commit', commit], ['random', rnd]] as const : [['commit', commit]] as const) {
    const undo = v.set?.() ?? (() => {});
    const vals = CABINET_ORDER.map((cab) => {
      let w = 0;
      snaps[cab].forEach((s, i) => { const r0 = cloneRun(s); v.mut?.(r0); if (playRun(0, r0.cabinet, { ...pol, hooks: v.hook ? { preFight: v.hook } : undefined }, new Rng(9000 + i), r0).won) w++; });
      return (100 * w) / snaps[cab].length;
    });
    undo();
    console.log(`${(vn + ' ' + pn).padEnd(26)} ${CABINET_ORDER.map((c, i) => `${c} ${vals[i].toFixed(1)}`).join('  ')}  avg ${avg(vals).toFixed(1)}  vs K ${vals.slice(1).map((x) => (x - vals[0]).toFixed(1)).join('/')}`);
  }
}
