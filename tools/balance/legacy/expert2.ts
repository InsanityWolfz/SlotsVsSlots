// Expert playtest 2 harness (throwaway): pacing, bimodality, per-fight shape. npx tsx tools/balance/expert2.ts [N] [stake]
// Mirrors simulateRuns (greedy) but records every fight.
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { actLength, DANGER } from '../../../src/core/enemies';
import { Fight } from '../../../src/core/fight';
import { Rng } from '../../../src/core/rng';
import {
  applyOption, buy, chooseEnemy, CHIPS, createRun, draftOffers, finishFight, fightConfig, takeLegend, takeChoice,
  isShopNow, leaveShop, needsChoice, shopOffers, takeSpoils, takeStart, machinePower, type RunState,
} from '../../../src/core/run';
import { greedyValue, choiceValue } from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 400);
const STAKE = Number(process.argv[3] ?? 2);
const base = defaultConfig();

interface FightRow { cab: string; act: number; depth: number; boss: boolean; turns: number; won: boolean; enemyHp: number; hpBeforePct: number; hpLostPct: number; maxHit: number; firstHitPct: number; dmgPerSpinPct: number; power: number; runWon?: boolean; runId: number }
const rows: FightRow[] = [];
const runEnds: { cab: string; won: boolean; diedAt: number; hpHouse?: number; hpMirror?: number; hpDealer?: number; houseTurns?: number; mirrorTurns?: number; powerA1?: number; powerA2?: number; powerA3?: number }[] = [];

function pickEnemy(run: RunState): number {
  const opts = run.paths[run.depth];
  const score = (i: number) => {
    const a = opts[i].archetype;
    const eliteBonus = opts[i].elite ? (run.player.hp / run.player.maxHp > 0.7 ? -4 : 3) : 0;
    return (DANGER[a] ?? 8) * (opts[i].elite ? 1.25 : 1) + eliteBonus;
  };
  return opts.map((_, i) => i).reduce((best, i) => (score(i) < score(best) ? i : best), 0);
}
function shop(run: RunState): void {
  const items = shopOffers(run);
  const reserve = run.depth >= actLength(run.act) ? CHIPS.stackPer * 2 : 0;
  const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
  for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
  leaveShop(run);
}

let runId = 0;
for (const cab of CABINET_ORDER as CabinetId[]) {
  const seeds = new Rng(777);
  for (let i = 0; i < N; i++) {
    runId++;
    const runSeed = seeds.int(0xffffffff);
    const run = createRun(base, runSeed, cab, STAKE, STAKE >= 2);
    if (run.pendingStart?.length) { const st = run.pendingStart; takeStart(run, st[0]); run.pendingStart = null; }
    const fs = new Rng((runSeed ^ 0x5f3759df) >>> 0);
    const end: (typeof runEnds)[number] = { cab, won: false, diedAt: -1 };
    let fightIx = 0;
    const myRows: FightRow[] = [];
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, pickEnemy(run));
      const act = run.act;
      const boss = run.depth >= actLength(act);
      const hpB = run.player.hp;
      const maxB = run.player.maxHp;
      if (boss) {
        const pct = (100 * hpB) / maxB;
        if (act === 1) end.hpHouse = pct; else if (act === 2) end.hpMirror = pct; else end.hpDealer = pct;
        const pw = machinePower(run);
        if (act === 1) end.powerA1 = pw; else if (act === 2) end.powerA2 = pw; else end.powerA3 = pw;
      }
      const cfg = fightConfig(run, base);
      const pw = boss ? 0 : machinePower(run);
      const fight = new Fight(cfg, fs.int(0xffffffff));
      const eHp0 = fight.sides.enemy.maxHp;
      let maxHit = 0; let first = -1; let dmg = 0; let spins = 0;
      while (!fight.over && fight.turn < 2000) {
        const { side, events } = fight.step();
        if (side === 'player') spins++;
        let d = 0;
        for (const e of events) if ((e.type === 'attack' || e.type === 'specialFire' || e.type === 'potWin' || e.type === 'blast' || e.type === 'markedHit') && (e as { from?: string }).from === 'player') d += (e as { hpDamage: number }).hpDamage;
        if (side === 'player') { maxHit = Math.max(maxHit, d); if (first < 0) first = d; }
        dmg += d;
      }
      const lost = (100 * (hpB - Math.max(0, fight.sides.player.hp))) / maxB;
      const row: FightRow = { cab, act, depth: run.depth, boss, turns: fight.turn, won: fight.winner === 'player', enemyHp: eHp0, hpBeforePct: (100 * hpB) / maxB, hpLostPct: lost, maxHit: (100 * maxHit) / eHp0, firstHitPct: (100 * Math.max(0, first)) / eHp0, dmgPerSpinPct: (100 * dmg) / Math.max(1, spins) / eHp0, power: pw, runId };
      if (boss && act === 1) end.houseTurns = fight.turn;
      if (boss && act === 2) end.mirrorTurns = fight.turn;
      myRows.push(row);
      fightIx++;
      finishFight(run, fight);
      if (run.over && !run.won) end.diedAt = fightIx;
      if (!run.over && run.pendingChoice?.length) { const cs = run.pendingChoice; takeChoice(run, cs.reduce((a, b) => (choiceValue(run, b) > choiceValue(run, a) ? b : a))); }
      if (!run.over && run.pendingLegend) { const lg = run.pendingLegend; if (lg.length) takeLegend(run, lg[0]); run.pendingLegend = null; if (isShopNow(run)) shop(run); continue; }
      if (!run.over && run.pendingSpoils) { takeSpoils(run, run.pendingSpoils[0]); }
      if (!run.over) {
        const offers = draftOffers(run);
        applyOption(run, offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a)));
        if (isShopNow(run)) shop(run);
      }
    }
    end.won = run.won;
    for (const r of myRows) r.runWon = run.won;
    rows.push(...myRows);
    runEnds.push(end);
  }
}

const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f1 = (x: number) => (Number.isFinite(x) ? x.toFixed(1) : '-').padStart(6);

console.log(`N ${N}/machine, stake ${STAKE}. turns = both sides' spins (player spins ~ turns/2)`);
console.log('\n== PACING: per act/depth (all machines, won+lost) ==');
console.log('act dep  n     turns p10  p50  p90 | 1st hit %eHP  dmg/spin %eHP  maxHit %eHP | oneShot% (<=2 turns) | slog% (>=20 turns)');
for (const act of [1, 2, 3]) for (let d = 0; d <= 5; d++) {
  const rs = rows.filter((r) => r.act === act && r.depth === d);
  if (!rs.length) continue;
  const t = rs.map((r) => r.turns);
  console.log(`${act}   ${d}${d === 5 ? 'B' : ' '} ${String(rs.length).padStart(5)} ${f1(avg(t))} ${f1(q(t, 0.1))} ${f1(q(t, 0.5))} ${f1(q(t, 0.9))} | ${f1(avg(rs.map((r) => r.firstHitPct)))} ${f1(avg(rs.map((r) => r.dmgPerSpinPct)))} ${f1(avg(rs.map((r) => r.maxHit)))} | ${f1((100 * rs.filter((r) => r.turns <= 2).length) / rs.length)} | ${f1((100 * rs.filter((r) => r.turns >= 20).length) / rs.length)}`);
}
console.log('\n== PACING per machine: median turns by act/depth ==');
for (const cab of CABINET_ORDER) {
  const line: string[] = [];
  for (const act of [1, 2, 3]) for (let d = 0; d <= 5; d++) { const rs = rows.filter((r) => r.cab === cab && r.act === act && r.depth === d); if (rs.length) line.push(`${act}.${d}${d === 5 ? 'B' : ''}:${q(rs.map((r) => r.turns), 0.5)}`); }
  console.log(cab.padEnd(7), line.join(' '));
}

console.log('\n== BIMODALITY ==');
const wonR = runEnds.filter((r) => r.won);
console.log(`runs ${runEnds.length}, won ${wonR.length} (${((100 * wonR.length) / runEnds.length).toFixed(1)}%)`);
const died = runEnds.filter((r) => !r.won).map((r) => r.diedAt);
const hist: Record<number, number> = {};
for (const d of died) hist[d] = (hist[d] ?? 0) + 1;
console.log('death fight# histogram:', Object.entries(hist).map(([k, v]) => `${k}:${((100 * v) / runEnds.length).toFixed(1)}%`).join(' '));
// Early strength quartiles: act 1 regular fights' average dmg/spin (%eHP) -> outcome
const byRun = new Map<number, FightRow[]>();
for (const r of rows) { const a = byRun.get(r.runId) ?? []; a.push(r); byRun.set(r.runId, a); }
const early = [...byRun.values()].filter((fs) => fs.filter((f) => f.act === 1 && !f.boss).length >= 4).map((fs) => {
  const a1 = fs.filter((f) => f.act === 1 && !f.boss && f.depth >= 2 && f.depth <= 4);
  return { s: avg(a1.map((f) => f.dmgPerSpinPct)), won: !!fs[0].runWon, reachA3: fs.some((f) => f.act === 3), lastAct: fs[fs.length - 1].act, cab: fs[0].cab, a2turns: avg(fs.filter((f) => f.act === 2 && !f.boss).map((f) => f.turns)), a3turns: avg(fs.filter((f) => f.act === 3 && !f.boss).map((f) => f.turns)), a1loss: avg(fs.filter((f) => f.act === 1 && !f.boss).map((f) => f.hpLostPct)) };
});
const ss = early.map((e) => e.s).sort((a, b) => a - b);
const cuts = [q(ss, 0.25), q(ss, 0.5), q(ss, 0.75)];
console.log('Early strength = avg damage per spin as % of enemy HP, act 1 fights 3-5 (runs that got there). Quartile -> outcome:');
for (let k = 0; k < 4; k++) {
  const g = early.filter((e) => (k === 0 ? e.s < cuts[0] : k === 3 ? e.s >= cuts[2] : e.s >= cuts[k - 1] && e.s < cuts[k]));
  console.log(`Q${k + 1} (s ${k === 0 ? '<' : '>='}${(k === 0 ? cuts[0] : cuts[k - 1]).toFixed(1)}) n ${g.length}: win ${((100 * g.filter((e) => e.won).length) / g.length).toFixed(1)}%  reach act3 ${((100 * g.filter((e) => e.reachA3).length) / g.length).toFixed(1)}%  died in act1 ${((100 * g.filter((e) => !e.won && e.lastAct === 1).length) / g.length).toFixed(1)}%  a1 HP lost/fight ${avg(g.map((e) => e.a1loss)).toFixed(1)}  a2 turns ${avg(g.map((e) => e.a2turns).filter(Number.isFinite)).toFixed(1)}  a3 turns ${avg(g.map((e) => e.a3turns).filter(Number.isFinite)).toFixed(1)}`);
}
console.log('\nHP% into bosses (p10/p50/p90) and boss turns:');
for (const cab of CABINET_ORDER) {
  const rs = runEnds.filter((r) => r.cab === cab);
  const hh = rs.map((r) => r.hpHouse).filter((x): x is number => x !== undefined);
  const hm = rs.map((r) => r.hpMirror).filter((x): x is number => x !== undefined);
  const hd = rs.map((r) => r.hpDealer).filter((x): x is number => x !== undefined);
  const p1 = rs.map((r) => r.powerA1).filter((x): x is number => !!x), p2 = rs.map((r) => r.powerA2).filter((x): x is number => !!x), p3 = rs.map((r) => r.powerA3).filter((x): x is number => !!x);
  console.log(`${cab.padEnd(7)} House ${f1(q(hh, 0.1))}${f1(q(hh, 0.5))}${f1(q(hh, 0.9))} | Mirror ${f1(q(hm, 0.1))}${f1(q(hm, 0.5))}${f1(q(hm, 0.9))} | Dealer ${f1(q(hd, 0.1))}${f1(q(hd, 0.5))}${f1(q(hd, 0.9))} | power@House p10/50/90 ${q(p1, 0.1).toFixed(0)}/${q(p1, 0.5).toFixed(0)}/${q(p1, 0.9).toFixed(0)} @Mirror ${q(p2, 0.1).toFixed(0)}/${q(p2, 0.5).toFixed(0)}/${q(p2, 0.9).toFixed(0)} @Dealer ${q(p3, 0.1).toFixed(0)}/${q(p3, 0.5).toFixed(0)}/${q(p3, 0.9).toFixed(0)}`);
}
console.log('\nact 2 regular fights: HP lost per fight p50/p90, deaths%; act 3 same');
for (const act of [1, 2, 3]) {
  const rs = rows.filter((r) => r.act === act && !r.boss);
  console.log(`act ${act}: lost p50 ${q(rs.map((r) => r.hpLostPct), 0.5).toFixed(1)} p90 ${q(rs.map((r) => r.hpLostPct), 0.9).toFixed(1)} deaths ${((100 * rs.filter((r) => !r.won).length) / rs.length).toFixed(1)}%  zero-damage-taken fights ${((100 * rs.filter((r) => r.hpLostPct <= 0).length) / rs.length).toFixed(1)}%`);
}

console.log('\n== Does being strong pay off at the bosses? boss win% by power quartile (per machine, pooled) ==');
for (const [label, key, act] of [['Mirror', 'powerA2', 2], ['Dealer', 'powerA3', 3]] as const) {
  const out: string[] = [];
  const rel: { r: number; won: boolean; turns: number }[] = [];
  for (const cab of CABINET_ORDER) {
    const rs = runEnds.filter((r) => r.cab === cab && r[key]);
    const med = q(rs.map((r) => r[key] as number), 0.5);
    for (const r of rs) {
      const bossRow = rows.find((x) => x.runId === runEnds.indexOf(r) + 1 && x.boss && x.act === act);
      rel.push({ r: (r[key] as number) / med, won: bossRow?.won ?? false, turns: bossRow?.turns ?? 0 });
    }
  }
  const rr = rel.map((x) => x.r).sort((a, b) => a - b);
  const c = [q(rr, 0.25), q(rr, 0.5), q(rr, 0.75)];
  for (let k = 0; k < 4; k++) {
    const g = rel.filter((x) => (k === 0 ? x.r < c[0] : k === 3 ? x.r >= c[2] : x.r >= c[k - 1] && x.r < c[k]));
    out.push(`Q${k + 1} (x${(k === 0 ? rr[0] : c[k - 1]).toFixed(2)} of median) win ${((100 * g.filter((x) => x.won).length) / g.length).toFixed(0)}% turns ${q(g.map((x) => x.turns), 0.5)}`);
  }
  console.log(label, '|', out.join(' | '));
}
