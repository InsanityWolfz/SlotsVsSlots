// Act 2 mechanics in real runs: bombs, hexes, drain, mimic (hits + chip gulp), phoenix, lucky wilds.
//   npx tsx playtest/scratch/it6_mech.ts [N]
import { avg, batch, CABINET_ORDER, pct, type FightRec, type Policy } from './it6_lib';

const N = Number(process.argv[2] ?? 800);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'random' };
const rs = CABINET_ORDER.flatMap((c) => batch(c, pol, N, 31337));
const fs = rs.flatMap((r) => r.fights.map((f) => ({ f, r })));
const of = (a: string) => fs.filter(({ f }) => f.arch === a).map(({ f }) => f);
const share = (f: FightRec[], k: string) => {
  const tot = f.reduce((a, x) => a + Object.values(x.dmgBy).reduce((p, q) => p + q, 0), 0);
  return pct(f.reduce((a, x) => a + (x.dmgBy[k] ?? 0), 0), tot);
};

const b = of('bomber');
console.log(`BOMBER (${b.length} fights): bombs planted ${avg(b.map((f) => f.bombs)).toFixed(1)}/fight, defused ${pct(b.reduce((a, f) => a + f.defused, 0), b.reduce((a, f) => a + f.bombs, 0))}%, blew up ${pct(b.reduce((a, f) => a + f.blasts, 0), b.reduce((a, f) => a + f.bombs, 0))}%, ` +
  `(rest: fight ended first) blast HP ${avg(b.map((f) => f.blastHp)).toFixed(1)}/fight, blocked ${avg(b.map((f) => f.blastBlocked)).toFixed(1)}/fight; bomb share of HP dmg ${share(b, 'bomb')}%; killing blow bomb ${pct(b.filter((f) => !f.won && f.killer === 'bomb').length, b.filter((f) => !f.won).length)}% of bomber deaths; fights with >=1 defuse ${pct(b.filter((f) => f.defused > 0).length, b.length)}%`);

const h = of('hexer');
console.log(`HEXER (${h.length}): hexes ${avg(h.map((f) => f.hexes)).toFixed(1)}/fight, hexed player spins ${pct(h.reduce((a, f) => a + f.hexedSpins, 0), h.reduce((a, f) => a + f.spins, 0))}%, halved amount lost ${avg(h.map((f) => f.hexLoss)).toFixed(1)}/fight, turns ${avg(h.map((f) => f.turns)).toFixed(1)} (act 2 regular avg ${avg(fs.filter(({ f }) => f.act === 2 && !f.boss).map(({ f }) => f.turns)).toFixed(1)})`);
for (const cab of CABINET_ORDER) {
  const hh = h.filter((_, i) => true) && fs.filter(({ f, r }) => f.arch === 'hexer' && r.cabinet === cab).map(({ f }) => f);
  const other = fs.filter(({ f, r }) => f.act === 2 && !f.boss && f.arch !== 'hexer' && r.cabinet === cab).map(({ f }) => f);
  console.log(`   ${cab.padEnd(7)} hexer death ${pct(hh.filter((f) => !f.won).length, hh.length)}% hpLost ${(100 * avg(hh.map((f) => (f.hpBefore - f.hpAfter) / f.maxHp))).toFixed(0)}%   other act2 death ${pct(other.filter((f) => !f.won).length, other.length)}% hpLost ${(100 * avg(other.map((f) => (f.hpBefore - f.hpAfter) / f.maxHp))).toFixed(0)}%`);
}

const v = of('vampire');
console.log(`VAMPIRE (${v.length}): drain HP ${avg(v.map((f) => f.drainHp)).toFixed(1)}/fight, vampire healed ${avg(v.map((f) => f.enemyHeal)).toFixed(1)}/fight (= ${pct(v.reduce((a, f) => a + f.enemyHeal, 0), v.reduce((a, f) => a + f.enemyHp, 0))}% of its HP), drain share ${share(v, 'drain')}%`);

const m = of('mimic');
const earned = m.map((f) => f.chipsEarned), eaten = m.map((f) => f.chipsEaten);
console.log(`MIMIC (${m.length}): gulped ${avg(m.map((f) => f.gulped)).toFixed(1)} chips/fight (actually taken ${avg(eaten).toFixed(1)}), earned ${avg(earned).toFixed(1)} -> net ${avg(m.map((f, i) => earned[i] - eaten[i])).toFixed(1)}; net<=0 in ${pct(m.filter((f, i) => f.won && earned[i] - eaten[i] <= 0).length, m.filter((f) => f.won).length)}% of wins; ` +
  `mimic hits ${avg(m.map((f) => f.mimicHits)).toFixed(1)}/fight for ${avg(m.map((f) => f.mimicHp)).toFixed(1)} HP; mimic share of HP dmg ${share(m, 'mimic')}%`);
const other2 = fs.filter(({ f }) => f.act === 2 && !f.boss && f.arch !== 'mimic' && f.won).map(({ f }) => f);
console.log(`   other act 2 wins earn ${avg(other2.map((f) => f.chipsEarned)).toFixed(1)} chips`);
const turnsM = m.map((f) => f.turns);
console.log(`   gulps per fight distribution: 0:${pct(m.filter((f) => f.gulped === 0).length, m.length)}% 2:${pct(m.filter((f) => f.gulped === 2).length, m.length)}% 4:${pct(m.filter((f) => f.gulped === 4).length, m.length)}% 6+:${pct(m.filter((f) => f.gulped >= 6).length, m.length)}%  turns ${avg(turnsM).toFixed(1)}`);

// Phoenix
const ph = fs.filter(({ r, f }) => r.relics.includes('phoenix') && f.act === 2);
console.log(`PHOENIX: act 2 fights holding it ${ph.length}; fired in ${pct(ph.filter(({ f }) => f.phoenix > 0).length, ph.length)}%; won after firing ${pct(ph.filter(({ f }) => f.phoenix > 0 && f.won).length, ph.filter(({ f }) => f.phoenix > 0).length)}%`);
const phM = ph.filter(({ f }) => f.boss);
console.log(`   in the Mirror: fired ${pct(phM.filter(({ f }) => f.phoenix > 0).length, phM.length)}%, saved-and-won ${pct(phM.filter(({ f }) => f.phoenix > 0 && f.won).length, phM.filter(({ f }) => f.phoenix > 0).length)}%`);
// Lucky
const lk = fs.filter(({ r, f }) => r.gilds.includes('lucky') && f.act === 2);
console.log(`LUCKY: act 2 fights with a lucky gild ${lk.length}; lucky WILDs per player spin ${(lk.reduce((a, { f }) => a + f.luckyWilds, 0) / lk.reduce((a, { f }) => a + f.spins, 0)).toFixed(3)}`);
// Act 2 regular fights: how many of each archetype a run sees, elite takes
const a2 = fs.filter(({ f }) => f.act === 2 && !f.boss);
const cnt: Record<string, number> = {};
for (const { f } of a2) cnt[f.arch] = (cnt[f.arch] ?? 0) + 1;
console.log(`act 2 regular fight mix: ${Object.entries(cnt).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${pct(n, a2.length)}%`).join(' | ')}`);
