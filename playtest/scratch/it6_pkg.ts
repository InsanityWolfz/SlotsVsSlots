// Package N candidates: act 2 HP curve + Mirror redesign (power-sized HP, no specials, best-since-last reflection,
// every 3 / cracked 2) + act 2 fork policy check.   npx tsx playtest/scratch/it6_pkg.ts [N]
import { DEPTH_HP_2 } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { stripStats, type RunState } from '../../src/core/run';
import { avg, BASE, batch, CABINET_ORDER, FORKS, LABEL, pct, summary, type Policy, type RunRec } from './it6_lib';

const N = Number(process.argv[2] ?? 800);
const power = (run: RunState) => { const s = stripStats(run.player.strips, BASE, run.player.relics, run.player.gilded); return s.damage + (s.energy / 5) * 10; };
export function mirrorFix(k: number) {
  return (run: RunState, f: Fight) => {
    if (!f.isMirror) return;
    const e = f.sides.enemy; const F = f as any;
    e.hp = e.maxHp = Math.round(k * power(run)) + 20;
    e.ability = { ...e.ability!, every: 3 };
    const ge = F.gainEnergy.bind(f);
    F.gainEnergy = (me: any, a: number, r: number[], ev: any[]) => { if (me.side === 'enemy') { me.energy = 0; return; } ge(me, a, r, ev); };
    const cd = F.checkDeath.bind(f);
    F.checkDeath = (c: any, ev: any[]) => { const was = f.shattered; cd(c, ev); if (!was && f.shattered) { e.ability = { ...e.ability!, every: 2 }; e.charge = Math.min(e.charge, 1); } };
    let best = 0;
    const st = f.step.bind(f);
    (f as any).step = () => { const side = f.next; if (side === 'enemy') f.last.player.damage = best; const r = st(); if (side === 'player') best = Math.max(best, f.last.player.damage); if (r.events.some((x: any) => x.type === 'attack' && x.note === 'reflect')) best = 0; return r; };
  };
}
const feel = (rs: RunRec[]) => {
  const fs = rs.flatMap((r) => r.fights).filter((f) => f.act === 2 && !f.boss);
  const lost = fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp);
  const byD = [0, 1, 2, 3, 4].map((d) => { const x = fs.filter((f) => f.depth === d); return `${LABEL(6 + d)} ${pct(x.filter((f) => !f.won).length, x.length)}/${(100 * avg(x.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}/${avg(x.map((f) => f.turns)).toFixed(0)}t`; });
  return `A2 regular: stomp ${pct(lost.filter((x) => x < 0.1).length, lost.length)}% [die%/hpLost%/turns: ${byD.join(' ')}]`;
};

const CURVES: Record<string, number[]> = { current: [57, 62, 68, 73, 78], steep: [52, 62, 73, 85, 97], steeper: [50, 64, 78, 94, 110] };
const orig = [...DEPTH_HP_2];
for (const [cn, curve] of Object.entries(CURVES)) {
  for (const mirror of ['current', 'fix6', 'fix7']) {
    curve.forEach((h, i) => (DEPTH_HP_2[i] = h));
    const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value', hooks: mirror === 'current' ? undefined : { preFight: mirrorFix(mirror === 'fix6' ? 6 : 7) } };
    const rows: string[] = [];
    let all: RunRec[] = [];
    for (const c of CABINET_ORDER) { const rs = batch(c, pol, N, 2468); all = all.concat(rs); rows.push(`${c} ${pct(rs.filter((r) => r.won).length, rs.length)}`); }
    const a2 = all.filter((r) => r.fights.some((f) => f.act === 2));
    const mir = all.filter((r) => r.hpIntoMirror >= 0);
    console.log(`curve ${cn.padEnd(8)} mirror ${mirror.padEnd(7)} run win ${pct(all.filter((r) => r.won).length, all.length)}% [${rows.join(' ')}] act2 clear ${pct(a2.filter((r) => r.won).length, a2.length)}% mirror win ${pct(mir.filter((r) => r.won).length, mir.length)}%  ${feel(all)}`);
  }
}
orig.forEach((h, i) => (DEPTH_HP_2[i] = h));

// Act 2 forks: take the elite vs the safe option in act 2 only (act 1 greedy).
const hybrid = (a2: string) => (run: RunState, rng: any) => (run.act === 2 ? FORKS[a2](run, rng) : FORKS.greedy(run, rng));
FORKS.a2elite = hybrid('elite'); FORKS.a2safe = hybrid('safe');
for (const f of ['a2elite', 'a2safe', 'greedy']) {
  let all: RunRec[] = [];
  for (const c of CABINET_ORDER) all = all.concat(batch(c, { draft: 'commit', fork: f, shop: 'commit', legend: 'value' }, N, 1357));
  const a2 = all.filter((r) => r.fights.some((x) => x.act === 2));
  const el = a2.flatMap((r) => r.fights).filter((x) => x.act === 2 && x.elite);
  console.log(`act 2 forks ${f.padEnd(8)}: act 2 clear ${pct(a2.filter((r) => r.won).length, a2.length)}%  elite fights ${el.length} die ${pct(el.filter((x) => !x.won).length, el.length)}%  hpLost ${(100 * avg(el.map((x) => (x.hpBefore - Math.max(0, x.hpAfter)) / x.maxHp))).toFixed(0)}%`);
}
void summary;
