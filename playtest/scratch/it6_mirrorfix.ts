// Mirror redesign sweep: snapshot runs at the Mirror, then replay the Mirror fight under variants.
//   npx tsx playtest/scratch/it6_mirrorfix.ts [N per cabinet]
import { Fight } from '../../src/core/fight';
import { fightConfig, stripStats, type RunState } from '../../src/core/run';
import { REFLECT_MIN } from '../../src/core/relics';
import { avg, BASE, CABINET_ORDER, cloneRun, pct, playRun, Rng, type Policy } from './it6_lib';

const N = Number(process.argv[2] ?? 400);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
class Snap { constructor(public run: RunState) {} }
function snaps(cab: any): RunState[] {
  const seeds = new Rng(4040 + cab.length * 7), rng = new Rng(4041);
  const out: RunState[] = [];
  for (let i = 0; out.length < N && i < N * 6; i++) {
    try { playRun(seeds.int(0xffffffff), cab, { ...pol, hooks: { preFight: (run) => { if (run.act === 2 && run.depth === 5) throw new Snap(cloneRun(run)); } } }, rng); }
    catch (e) { if (e instanceof Snap) out.push(e.run); else throw e; }
  }
  return out;
}

interface V { name: string; hp?: (run: RunState, f: Fight) => number; every?: number; crackEvery?: number; noSpecial?: boolean; bestSince?: boolean; cap?: number; startCharge?: number; }
/** Expected player damage per spin incl. specials (a rough "power" number). */
function power(run: RunState): number {
  const s = stripStats(run.player.strips, BASE, run.player.relics, run.player.gilded);
  return s.damage + (s.energy / 5) * 10;
}
const VARIANTS: V[] = [
  { name: 'current' },
  { name: 'no Mirror specials' },
  { name: 'HP x2.6 maxHP', hp: (r) => Math.round(r.player.maxHp * 2.6) + 3 * r.player.relics.length },
  { name: 'reflect every 3, crack 2', every: 3, crackEvery: 2 },
  { name: 'reflect best-since-last (cap 20)', bestSince: true },
  { name: 'best-since + every 3/2 + starts at 1', bestSince: true, every: 3, crackEvery: 2, startCharge: 1 },
  { name: 'best-since + every3/2 + no specials', bestSince: true, every: 3, crackEvery: 2, noSpecial: true },
  { name: 'HP = 12x power, best-since, every3/2, no specials', hp: (r) => Math.round(12 * power(r)) + 20, bestSince: true, every: 3, crackEvery: 2, noSpecial: true },
  { name: 'HP = 10x power+30, best-since cap 25, every3/2, no spec', hp: (r) => Math.round(10 * power(r)) + 30, bestSince: true, every: 3, crackEvery: 2, noSpecial: true, cap: 25 },
];
VARIANTS[1].noSpecial = true;

function play(run: RunState, v: V, seed: number) {
  const f = new Fight(fightConfig(run, BASE), seed);
  const e = f.sides.enemy;
  if (v.hp) { e.hp = e.maxHp = v.hp(run, f); }
  if (v.every && e.ability) e.ability = { ...e.ability, every: v.every };
  if (v.cap && e.ability) e.ability = { ...e.ability, power: v.cap };
  if (v.startCharge) e.charge = v.startCharge;
  const F = f as any;
  if (v.noSpecial) {
    const orig = F.gainEnergy.bind(f);
    F.gainEnergy = (me: any, amount: number, reels: number[], events: any[]) => { if (me.side === 'enemy') { me.energy = 0; events.push({ type: 'energyGain', side: me.side, reels, amount, total: 0 }); return; } orig(me, amount, reels, events); };
  }
  if (v.crackEvery) {
    const orig = F.checkDeath.bind(f);
    F.checkDeath = (c: any, events: any[]) => { const was = f.shattered; orig(c, events); if (!was && f.shattered && e.ability) { e.ability = { ...e.ability, every: v.crackEvery! }; e.charge = Math.min(e.charge, v.crackEvery! - 1); } };
  }
  let best = 0, shown: number | null = null;
  const tele = { n: 0, exact: 0, diff: 0 };
  const reflects: number[] = [];
  let reflHp = 0, totHp = 0;
  while (!f.over && f.turn < 400) {
    const side = f.next;
    if (side === 'enemy' && v.bestSince) f.last.player.damage = best;
    const r = f.step();
    if (side === 'player') best = Math.max(best, f.last.player.damage);
    for (const ev of r.events) {
      if ((ev.type === 'attack' || ev.type === 'specialFire') && ev.to === 'player') { totHp += ev.hpDamage; if (ev.type === 'attack' && ev.note === 'reflect') { reflects.push(ev.amount); reflHp += ev.hpDamage; if (shown !== null) { tele.n++; if (shown === ev.amount) tele.exact++; tele.diff += Math.abs(shown - ev.amount); } shown = null; best = 0; } }
    }
    if (side === 'enemy' && !f.over && e.ability && e.ability.every - e.charge <= 1) shown = Math.max(REFLECT_MIN, Math.min(e.ability.power, v.bestSince ? best : f.last.player.damage));
  }
  return { won: f.winner === 'player', turns: f.turn, reflects, reflHp, totHp, tele, hpLeft: f.sides.player.hp / f.sides.player.maxHp };
}

const S: Record<string, RunState[]> = {};
for (const c of CABINET_ORDER) S[c] = snaps(c);
console.log(`Mirror replays, ${CABINET_ORDER.map((c) => `${c} n${S[c].length}`).join(' ')}`);
for (const v of VARIANTS) {
  const per: string[] = [];
  const all: ReturnType<typeof play>[] = [];
  for (const c of CABINET_ORDER) {
    const rs = S[c].map((r, i) => play(r, v, 9000 + i));
    all.push(...rs);
    per.push(`${c} ${pct(rs.filter((x) => x.won).length, rs.length)}`);
  }
  const t = all.reduce((a, x) => ({ n: a.n + x.tele.n, e: a.e + x.tele.exact, d: a.d + x.tele.diff }), { n: 0, e: 0, d: 0 });
  const wins = all.filter((x) => x.won);
  console.log(`${v.name.padEnd(56)} win ${pct(wins.length, all.length)}% [${per.join(' ')}] turns ${avg(all.map((x) => x.turns)).toFixed(1)} reflect 0x ${pct(all.filter((x) => !x.reflects.length).length, all.length)}% 2+ ${pct(all.filter((x) => x.reflects.length >= 2).length, all.length)}% reflShare ${pct(all.reduce((a, x) => a + x.reflHp, 0), all.reduce((a, x) => a + x.totHp, 0))}% tele exact ${pct(t.e, t.n)}% |d| ${(t.d / Math.max(1, t.n)).toFixed(1)} stomp(>75%left) ${pct(wins.filter((x) => x.hpLeft > 0.75).length, wins.length)}% close(<25%) ${pct(wins.filter((x) => x.hpLeft < 0.25).length, wins.length)}%`);
}
