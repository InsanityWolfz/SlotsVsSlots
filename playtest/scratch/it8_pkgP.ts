// Package P candidates for the Mirror, from identical B1 snapshots (Package O is the baseline in real code).
//   copy: real | noKeen (the Mirror doesn't copy KEEN)      bolt: Mirror bolt doubles/jackpots charge REFLECTION +1
//   cap: REFLECTION cap as share of max HP                   flat: extra Mirror HP
//   npx tsx playtest/scratch/it8_pkgP.ts N part   (part = 0/1 to split the grid across processes)
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { REFLECT_MIN } from '../../src/core/relics';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800), PART = Number(process.argv[3] ?? -1);
const POLS: Record<string, Policy> = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
  safe2: { draft: 'commit', fork: 'safe2', shop: 'commit', legend: 'value' },
};
interface V { noKeen: boolean; bolt: boolean; cap: number; flat: number }
const grid: V[] = [];
for (const noKeen of [false, true]) for (const bolt of [false, true]) for (const cap of [0.6, 0.8]) for (const flat of [0, 15, 30]) grid.push({ noKeen, bolt, cap, flat });
const mine = PART < 0 ? grid : grid.filter((_, i) => i % 2 === PART);
function hook(v: V) {
  return (run: RunState, f: Fight) => {
    if (!f.isMirror) return;
    const e = f.sides.enemy as any;
    if (v.noKeen) for (const reel of e.reels) for (const c of reel.cells) if (c.enh === 'keen') { delete c.enh; delete c.tier; }
    e.ability = { ...e.ability, power: Math.max(REFLECT_MIN, Math.round(run.player.maxHp * v.cap)) };
    e.hp = e.maxHp = e.maxHp + v.flat;
    if (v.bolt) {
      const step = f.step.bind(f);
      (f as any).step = () => {
        const r = step();
        if (r.side === 'enemy' && !f.over) {
          const sp = r.events.find((x: any) => x.type === 'spin' && x.side === 'enemy') as any;
          const n = sp ? sp.score.groups.filter((g: any) => g.symbol === 'bolt' && g.matched).length : 0;
          if (n && e.ability) e.charge = Math.min(e.ability.every - 1, e.charge + n);
        }
        return r;
      };
    }
  };
}
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const v of mine) {
  const out: Record<string, { clr: number[]; mw: number[] }> = {};
  let atCap = 0, nRefl = 0, fired = 0, mf = 0;
  for (const [pn, pol] of Object.entries(POLS)) {
    out[pn] = { clr: [], mw: [] };
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mwin = 0;
      snaps[cab].forEach((s, i) => {
        const r = playRun(0, s.cabinet, { ...pol, hooks: { preFight: hook(v) } }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) mwin++; }
        if (pn === 'commit') for (const f of r.fights) if (f.boss && f.act === 2) { mf++; if (f.reflects.length) fired++; const cap = Math.max(REFLECT_MIN, Math.round(f.maxHp * v.cap)); for (const x of f.reflects) { nRefl++; if (x >= cap) atCap++; } }
      });
      out[pn].clr.push((100 * w) / snaps[cab].length); out[pn].mw.push((100 * mwin) / Math.max(1, mr));
    }
  }
  const c = out.commit.clr, k = c[0];
  const f = (x: number) => x.toFixed(1);
  console.log(`${v.noKeen ? 'noKeen' : 'copyAll'} ${v.bolt ? 'bolt+' : 'bolt0'} cap${v.cap} +${String(v.flat).padEnd(2)} | commit ${f(avg(c))} mirror ${f(avg(out.commit.mw))} | c-notier ${f(avg(c) - avg(out.notier.clr))} c-hp ${f(avg(c) - avg(out.hpfirst.clr))} c-rand ${f(avg(c) - avg(out.randomDraft.clr))} e-s ${f(avg(out.elite2.clr) - avg(out.safe2.clr))} | cab-K ${CABINET_ORDER.slice(1).map((_, i) => f(c[i + 1] - k)).join('/')} (K ${f(k)}) | refl>=1 ${(100 * fired / mf).toFixed(0)} atCap ${(100 * atCap / nRefl).toFixed(0)}`);
}
