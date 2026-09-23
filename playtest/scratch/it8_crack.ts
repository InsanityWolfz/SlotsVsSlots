// "Crack gate": the spin that cracks the Mirror stops at half HP, and cracking primes REFLECTION for its next
// turn (it throws the cracking blow back). From identical B1 snapshots.   npx tsx playtest/scratch/it8_crack.ts [N]
import { Fight } from '../../src/core/fight';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const opt = { gate: false };
(Fight.prototype as any).damage = function (this: any, target: any, amount: number, ignoreShield: boolean) {
  const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
  target.shield -= blocked;
  let hpDamage = Math.min(target.hp, amount - blocked);
  if (opt.gate && target.side === 'enemy' && this.isMirror && (!this.shattered || this.__ct === this.turn)) {
    // The whole turn that cracks the Mirror stops at half HP.
    const half = Math.floor(target.maxHp / 2);
    if (target.hp > half && target.hp - hpDamage <= half) this.__ct = this.turn;
    if (this.__ct === this.turn) hpDamage = Math.max(0, Math.min(hpDamage, target.hp - half));
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
for (const [gate, prime, flat] of (process.argv[3] === "b" ? [[true, false, -15], [true, false, -25]] : [[false, false, 0], [true, false, 0], [true, true, 0], [true, true, -15], [true, true, -30]]) as [boolean, boolean, number][]) {
  opt.gate = gate;
  const res: Record<string, number[]> = {}; const mwin: Record<string, number[]> = {};
  let noRefl = 0, wins = 0; const perCab: number[] = []; const turns: number[] = [];
  for (const [pn, pol] of Object.entries(POLS)) {
    res[pn] = []; mwin[pn] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, mw = 0, cw = 0, cn = 0;
      snaps[cab].forEach((s, i) => {
        const hooks = { preFight: (_r: RunState, f: Fight) => {
          if (!f.isMirror) return;
          if (flat) f.sides.enemy.hp = f.sides.enemy.maxHp = f.sides.enemy.maxHp + flat;
          if (prime) { const step = f.step.bind(f); let was = false; (f as any).step = () => { const r = step(); if (!was && f.shattered && !f.over) { was = true; const e = f.sides.enemy; if (e.ability) e.charge = e.ability.every - 1; } return r; }; }
        } };
        const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) mw++; }
        if (pn === 'commit') for (const f of r.fights) if (f.boss && f.act === 2) { turns.push(f.turns); if (f.won) { cw++; if (!f.reflects.length) cn++; } }
      });
      res[pn].push((100 * w) / snaps[cab].length); mwin[pn].push((100 * mw) / Math.max(1, mr));
      if (pn === 'commit') { perCab.push((100 * cn) / Math.max(1, cw)); noRefl += cn; wins += cw; }
    }
  }
  const c = res.commit, f = (x: number) => x.toFixed(1);
  console.log(`gate ${gate} prime ${prime} flat ${flat}: commit ${f(avg(c))} mirror ${f(avg(mwin.commit))} turns ${avg(turns).toFixed(1)} | c-notier ${f(avg(c) - avg(res.notier))} c-hp ${f(avg(c) - avg(res.hpfirst))} c-rand ${f(avg(c) - avg(res.randomDraft))} e-s ${f(avg(res.elite2) - avg(res.safe2))} | cabs ${c.map(f).join('/')} | mirror by cab ${mwin.commit.map((x) => x.toFixed(0)).join('/')} | wins w/o reflection ${(100 * noRefl / wins).toFixed(0)}% (${perCab.map((x) => x.toFixed(0)).join('/')})`);
}
