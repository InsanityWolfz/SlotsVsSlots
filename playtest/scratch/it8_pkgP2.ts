// Package P candidate, combined: crack gate (the cracking turn stops at half HP) + Mirror flat -15, TESLA's Rod
// special 10 (not 12), act 2 boons KNIGHT +6 max HP / THORN +4 max HP / JOKER +2 WILDs on reel 3.
// From identical B1 snapshots, all policies.   npx tsx playtest/scratch/it8_pkgP2.ts [N]
import { Fight } from '../../src/core/fight';
import type { RunState } from '../../src/core/run';
import { avg, CABINET_ORDER, capOf, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const opt = { on: false };
(Fight.prototype as any).damage = function (this: any, target: any, amount: number, ignoreShield: boolean) {
  const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
  target.shield -= blocked;
  let hpDamage = Math.min(target.hp, amount - blocked);
  if (opt.on && target.side === 'enemy' && this.isMirror && (!this.shattered || this.__ct === this.turn)) {
    const half = Math.floor(target.maxHp / 2);
    if (target.hp > half && target.hp - hpDamage <= half) this.__ct = this.turn;
    if (this.__ct === this.turn) hpDamage = Math.max(0, Math.min(hpDamage, target.hp - half));
  }
  target.hp -= hpDamage;
  if (target.hp <= 0 && target.side === 'enemy') this.overkill = amount - blocked - hpDamage;
  return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
};
const boon = (r: RunState) => {
  const p = r.player;
  if (r.cabinet === 'knight') { p.maxHp += 6; p.hp += 6; }
  if (r.cabinet === 'thorn') { p.maxHp += 4; p.hp += 4; }
  if (r.cabinet === 'joker') { const s = p.strips[2]; const n = Math.min(2, s.shield ?? 0); s.shield = (s.shield ?? 0) - n; s.wild = (s.wild ?? 0) + n; }
};
const hook = (r: RunState, f: Fight) => {
  if (r.cabinet === 'tesla' && (f as any).cfg.specialDamage === 12) (f as any).cfg.specialDamage = 10;
  if (f.isMirror) f.sides.enemy.hp = f.sides.enemy.maxHp = f.sides.enemy.maxHp - 15;
};
const POLS: Record<string, Policy> = {
  commit: { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' },
  greedy: { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' },
  notier: { draft: 'notier', fork: 'greedy', shop: 'notier', legend: 'value' },
  tierfirst: { draft: 'tierfirst', fork: 'greedy', shop: 'tierfirst', legend: 'value' },
  hpfirst: { draft: 'hpfirst', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomDraft: { draft: 'random', fork: 'greedy', shop: 'commit', legend: 'value' },
  randomAll: { draft: 'random', fork: 'random', shop: 'random', legend: 'value' },
  elite2: { draft: 'commit', fork: 'elite2', shop: 'commit', legend: 'value' },
  safe2: { draft: 'commit', fork: 'safe2', shop: 'commit', legend: 'value' },
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const on of [false, true]) {
  opt.on = on;
  const res: Record<string, number[]> = {}, mw: Record<string, number[]> = {};
  let noRefl = 0, wins = 0, fired = 0, mf = 0, atCap = 0, nr = 0; const b = [0, 0, 0, 0, 0], ba = [0, 0, 0, 0, 0];
  for (const [pn, pol] of Object.entries(POLS)) {
    res[pn] = []; mw[pn] = [];
    for (const cab of CABINET_ORDER) {
      let w = 0, mr = 0, m = 0;
      snaps[cab].forEach((s, i) => {
        const r0 = cloneRun(s); if (on) boon(r0);
        const r = playRun(0, r0.cabinet, { ...pol, hooks: on ? { preFight: hook } : undefined }, new Rng(9000 + i), r0);
        if (r.won) w++; if (r.hpIntoMirror >= 0) { mr++; if (r.won) m++; }
        if (pn === 'commit') for (const f of r.fights) {
          if (f.act !== 2) continue;
          if (f.boss) { mf++; if (f.reflects.length) fired++; for (const x of f.reflects) { nr++; if (x >= capOf(f)) atCap++; } if (f.won) { wins++; if (!f.reflects.length) noRefl++; } }
          else { ba[f.depth]++; if (!f.won) b[f.depth]++; }
        }
      });
      res[pn].push((100 * w) / snaps[cab].length); mw[pn].push((100 * m) / Math.max(1, mr));
    }
  }
  const f = (x: number) => x.toFixed(1), c = res.commit;
  console.log(`\n=== ${on ? 'PACKAGE P candidate' : 'baseline (I8 as shipped)'}`);
  for (const pn of Object.keys(POLS)) console.log(`  ${pn.padEnd(12)} act2 clear ${f(avg(res[pn]))}  mirror ${f(avg(mw[pn]))}   by cab ${res[pn].map(f).join('/')}`);
  console.log(`  commit-notier ${f(avg(c) - avg(res.notier))}  commit-hpfirst ${f(avg(c) - avg(res.hpfirst))}  commit-randomDraft ${f(avg(c) - avg(res.randomDraft))}  elite2-safe2 ${f(avg(res.elite2) - avg(res.safe2))}  cab vs KNIGHT ${c.slice(1).map((x) => f(x - c[0])).join('/')}  spread ${f(Math.max(...c) - Math.min(...c))}`);
  console.log(`  REFLECTION >=1 ${f(100 * fired / mf)}%  at cap ${f(100 * atCap / nr)}%  Mirror wins without a reflection ${f(100 * noRefl / wins)}%  B1-5 death ${b.map((x, i) => f(100 * x / ba[i])).join('/')}`);
}
