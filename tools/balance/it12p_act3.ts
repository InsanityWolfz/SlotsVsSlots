// ACT 3 audit (reviewer): full act3 runs per cabinet at a stake. npx tsx playtest/scratch/it12p_act3.ts [N] [stake] [policy]
import { A3S, avg, CABINET_ORDER, fullRuns3, pct, type Policy, type RunRec } from './it12p_lib';
import { Fight } from '../../src/core/fight';

const N = Number(process.argv[2] ?? 1000);
const STK = Number(process.argv[3] ?? 2);
const PN = process.argv[4] ?? 'commit';
const POL: Policy = PN === 'greedy' ? { draft: 'greedy', fork: 'greedy', shop: 'greedy', legend: 'value' } : { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };

// capture act 3 per-fight stats by wrapping Fight construction order: A3S is keyed by Fight; collect via step wrapper
const LOG: { act: number; boss: boolean; arch: string; a3: any }[] = [];
const ARCH = new WeakMap<object, string>();
(POL as any).hooks = { preFight: (run: any, f: any) => ARCH.set(f, run.enemies[run.depth].archetype) };
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: any) {
  const r = origStep.call(this);
  if (this.over && !this._logged && this.cfg.enemy.act === 3) { this._logged = true; LOG.push({ act: 3, boss: this.isDealer, arch: ARCH.get(this) ?? '', a3: A3S.get(this) }); }
  return r;
};

console.log(`ACT 3 audit: stake ${STK}, policy ${PN}, N ${N} full runs per cabinet (act3 unlocked)`);
const all: RunRec[] = [];
const allLog: typeof LOG = [];
for (const cab of CABINET_ORDER) {
  LOG.length = 0;
  const rs = fullRuns3(cab, POL, N, STK, true);
  all.push(...rs);
  allLog.push(...LOG);
  const f3 = rs.flatMap((r) => r.fights.filter((f) => f.act === 3));
  const reg = f3.filter((f) => !f.boss), dl = f3.filter((f) => f.boss);
  const mir = rs.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2));
  const byDepth = [0, 1, 2].map((d) => reg.filter((f) => f.depth === d));
  const lost = (fs: typeof f3) => (100 * avg(fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0);
  const dlog = LOG.filter((x) => x.boss).map((x) => x.a3);
  console.log(
    `${cab.padEnd(7)} win ${pct(rs.filter((r) => r.won).length, N).padStart(5)}  Mirror ${pct(mir.filter((f) => f.won).length, mir.length)} reach3 ${pct(rs.filter((r) => r.fights.some((f) => f.act === 3)).length, N)}  ` +
      byDepth.map((fs, i) => `C${i + 1} n${fs.length} die ${pct(fs.filter((f) => !f.won).length, fs.length)} lost ${lost(fs)}% t${avg(fs.map((f) => f.turns)).toFixed(0)}`).join(' | ') +
      `  || DEALER n ${dl.length} WIN ${pct(dl.filter((f) => f.won).length, dl.length)} hpIn ${(100 * avg(dl.map((f) => f.hpBefore / f.maxHp))).toFixed(0)}% lost ${lost(dl)}% HP ${avg(dl.map((f) => f.enemyHp)).toFixed(0)} turns ${avg(dl.map((f) => f.turns)).toFixed(1)} maxHp ${avg(dl.map((f) => f.maxHp)).toFixed(0)}` +
      ` deals ${avg(dlog.map((a) => Object.values(a.deals as Record<string, number>).reduce((x, y) => x + y, 0))).toFixed(1)} HRules ${pct(dlog.filter((a) => a.houseRulesTurn >= 0).length, dlog.length)}% gateHeld ${pct(dlog.filter((a) => a.gateHeld > 0).length, dlog.length)}% 1stDealHp ${(100 * avg(dlog.filter((a) => a.hpFracAtFirstDeal >= 0).map((a) => a.hpFracAtFirstDeal))).toFixed(0)}%`,
  );
}
const f3 = all.flatMap((r) => r.fights.filter((f) => f.act === 3));
const dl = f3.filter((f) => f.boss);
console.log(`\nALL: Dealer win ${pct(dl.filter((f) => f.won).length, dl.length)} (n ${dl.length}); full-run win ${pct(all.filter((r) => r.won).length, all.length)}`);
console.log('Dealer killers:', Object.entries(dl.filter((f) => !f.won).reduce((a: any, f) => ((a[f.killer || '?'] = (a[f.killer || '?'] ?? 0) + 1), a), {})).map(([k, v]) => `${k}:${v}`).join(' '));
const dmg: Record<string, number> = {};
dl.forEach((f) => Object.entries(f.dmgBy).forEach(([k, v]) => (dmg[k] = (dmg[k] ?? 0) + v)));
const dlog = allLog.filter((x) => x.boss).map((x) => x.a3);
const tot = Object.values(dmg).reduce((a, b) => a + b, 0) + dlog.reduce((a, x) => a + x.markedHp, 0);
console.log('Dealer HP damage to you by source (%):', Object.entries(dmg).map(([k, v]) => `${k} ${pct(v, tot)}`).join(' '), `marked ${pct(dlog.reduce((a, x) => a + x.markedHp, 0), tot)}`, `(of which RAISE-doubled hits ${pct(dlog.reduce((a, x) => a + x.raiseHitHp, 0), tot)})`);
const deals: Record<string, number> = {};
dlog.forEach((a) => Object.entries(a.deals as Record<string, number>).forEach(([k, v]) => (deals[k] = (deals[k] ?? 0) + v)));
console.log('deals per fight:', Object.entries(deals).map(([k, v]) => `${k} ${(v / dlog.length).toFixed(2)}`).join(' '), ` raise jackpots paid ${(dlog.reduce((a, x) => a + x.raiseJackpots, 0) / Math.max(1, deals.raise ?? 1) * 100).toFixed(0)}% of raises`);
console.log('Dealer HP lost by win/loss: wins turns', avg(dl.filter((f) => f.won).map((f) => f.turns)).toFixed(1), 'losses turns', avg(dl.filter((f) => !f.won).map((f) => f.turns)).toFixed(1));
console.log('\nact 3 regulars by archetype (all cabinets):');
const archs = [...new Set(f3.filter((f) => !f.boss).map((f) => f.arch))];
for (const a of archs) {
  const fs = f3.filter((f) => !f.boss && f.arch === a);
  const lg = allLog.filter((x) => !x.boss && x.arch === a).map((x) => x.a3);
  console.log(`  ${a.padEnd(13)} n ${String(fs.length).padStart(5)} die ${pct(fs.filter((f) => !f.won).length, fs.length).padStart(4)} lost ${(100 * avg(fs.map((f) => (f.hpBefore - Math.max(0, f.hpAfter)) / f.maxHp))).toFixed(0)}% turns ${avg(fs.map((f) => f.turns)).toFixed(1)} elite ${pct(fs.filter((f) => f.elite).length, fs.length)}  marks ${avg(lg.map((x) => x.marks)).toFixed(1)} markedHp ${avg(lg.map((x) => x.markedHp)).toFixed(1)} confiscated ${avg(lg.map((x) => x.confEnhs)).toFixed(1)} rakes ${avg(lg.map((x) => x.rakes)).toFixed(1)}`);
}
const hpInDealer = all.map((r) => r.fights.find((f) => f.boss && f.act === 3)).filter(Boolean).map((f) => f!.hpBefore / f!.maxHp);
const hpIntoAct3 = all.map((r) => r.fights.find((f) => f.act === 3 && f.depth === 0)).filter(Boolean);
console.log(`\nHP into Dealer ${(100 * avg(hpInDealer)).toFixed(0)}% of max; act 3 regulars cost ${(100 * (1 - avg(hpInDealer))).toFixed(0)} pts of max HP net of heals`);
console.log(`Share of act 3 deaths at the Dealer: ${pct(dl.filter((f) => !f.won).length, f3.filter((f) => !f.won).length)}%  (act3 attempts ${hpIntoAct3.length})`);
