// "Mirror glass": no single turn of yours can take more than X% of the Mirror's max HP (so the climax always
// gets a REFLECTION). From identical B1 snapshots.   npx tsx playtest/scratch/it8_glass.ts [N]
import { Fight } from '../../src/core/fight';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const opt = { frac: 0 };
(Fight.prototype as any).damage = function (this: any, target: any, amount: number, ignoreShield: boolean) {
  const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
  target.shield -= blocked;
  let hpDamage = Math.min(target.hp, amount - blocked);
  if (opt.frac && target.side === 'enemy' && this.isMirror) {
    if (this.__t !== this.turn) { this.__t = this.turn; this.__d = 0; }
    hpDamage = Math.max(0, Math.min(hpDamage, Math.ceil(target.maxHp * opt.frac) - this.__d));
    this.__d += hpDamage;
  }
  target.hp -= hpDamage;
  if (target.hp <= 0 && target.side === 'enemy') this.overkill = amount - blocked - hpDamage;
  return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
};
const POLS: Record<string, Policy> = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
  safe2: { draft: 'commit', fork: 'safe2', shop: 'commit', legend: 'value' },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const [frac, flat] of [[0, 0], [0.25, 0], [0.25, -20], [0.34, 0], [0.34, -10]]) {
  opt.frac = frac;
  const res: Record<string, number[]> = {}; const mwin: Record<string, number[]> = {};
  let noRefl = 0, wins = 0; const perCabNoRefl: number[] = [];
  for (const [pn, pol] of Object.entries(POLS)) {
    res[pn] = []; mwin[pn] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mw = 0, cw = 0, cn = 0;
      snaps[cab].forEach((s, i) => {
        const hooks = { preFight: (_r: RunState, f: Fight) => { if (f.isMirror && flat) f.sides.enemy.hp = f.sides.enemy.maxHp = f.sides.enemy.maxHp + flat; } };
        const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) mw++; }
        if (pn === 'commit') for (const f of r.fights) if (f.boss && f.act === 2 && f.won) { cw++; if (!f.reflects.length) cn++; }
      });
      res[pn].push((100 * w) / snaps[cab].length); mwin[pn].push((100 * mw) / Math.max(1, mr));
      if (pn === 'commit') { perCabNoRefl.push((100 * cn) / Math.max(1, cw)); noRefl += cn; wins += cw; }
    }
  }
  const c = res.commit, f = (x: number) => x.toFixed(1);
  console.log(`glass ${frac || 'off'} flat ${flat}: commit ${f(avg(c))} mirror ${f(avg(mwin.commit))} | c-notier ${f(avg(c) - avg(res.notier))} c-hp ${f(avg(c) - avg(res.hpfirst))} c-rand ${f(avg(c) - avg(res.randomDraft))} e-s ${f(avg(res.elite2) - avg(res.safe2))} | cabs ${c.map(f).join('/')} | mirror by cab ${mwin.commit.map((x) => x.toFixed(0)).join('/')} | wins w/o reflection ${(100 * noRefl / wins).toFixed(0)}% (${perCabNoRefl.map((x) => x.toFixed(0)).join('/')})`);
}
