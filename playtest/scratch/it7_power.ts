// A "typical spin" machine power: like run.machinePower, but each line's damage is capped (so rare
// multiplicative jackpots don't inflate the Mirror's HP). Copy of stripStats' enumeration. Reviewer scratch.
import { defaultConfig, type SymbolId } from '../../src/core/config';
import { CABINETS } from '../../src/core/cabinets';
import { HONE_BONUS, KEEN_BONUS, KEY_MULT, BELL_MULT, LUCKY_CHANCE, BLAZE_BONUS } from '../../src/core/relics';
import { fullSets, type RunState } from '../../src/core/run';
import { scoreLine } from '../../src/core/scoring';

export function cappedPower(run: RunState, cap = 20, energyCap = 99): { dmg: number; energy: number; power: number } {
  const { strips, relics, gilded } = run.player;
  const base = defaultConfig();
  const gildOf = (reel: number, sym: SymbolId) => gilded.find((g) => g.reel === reel && g.symbol === sym);
  const enhOf = (reel: number, sym: SymbolId) => gildOf(reel, sym)?.enh;
  const sets = fullSets(gilded, relics);
  const setStep = relics.includes('ticket') ? 2 : 1;
  const lvlOf = (reel: number, sym: SymbolId) => { const g = gildOf(reel, sym); return g ? 1 + (g.tier ? 1 : 0) + (sets.has(g.enh) ? setStep : 0) : 0; };
  const probs = strips.map((s, reel) => {
    const total = Object.values(s).reduce((a, n) => a + (n ?? 0), 0) || 1;
    return (Object.entries(s) as [SymbolId, number][]).filter(([, n]) => n > 0).flatMap(([sym, n]) => {
      const p = n / total;
      if (enhOf(reel, sym) !== 'lucky') return [[sym, p, sym] as const];
      const c = Math.min(0.8, LUCKY_CHANCE.each + LUCKY_CHANCE.step * (lvlOf(reel, sym) - 1));
      return [[sym, p * (1 - c), sym] as const, ['wild' as SymbolId, p * c, sym] as const];
    });
  });
  const cfg = { ...base, pairRule: relics.includes('mirror') ? ('anyTwo' as const) : base.pairRule };
  let dmg = 0, energy = 0, specialBonus = 0;
  strips.forEach((s, reel) => {
    const sym = (Object.keys(s) as SymbolId[]).find((k) => enhOf(reel, k) === 'blaze' && (s[k] ?? 0) > 0);
    if (sym) specialBonus += BLAZE_BONUS.each + lvlOf(reel, sym) - 1;
  });
  for (const [a, pa, oa] of probs[0]) for (const [b, pb, ob] of probs[1]) for (const [c, pc, oc] of probs[2]) {
    const p = pa * pb * pc;
    const line = [a, b, c], own = [oa, ob, oc];
    const sc = scoreLine(line, cfg);
    let sw = 0, en = 0;
    for (const g of sc.groups) {
      for (const r of g.reels) {
        const enh = enhOf(r, own[r]); const lvl = lvlOf(r, own[r]);
        if (enh === 'keen' && g.symbol === 'sword') g.amount += KEEN_BONUS * lvl + (relics.includes('hone') ? HONE_BONUS : 0);
        if (enh === 'charged' && g.symbol === 'bolt') g.amount += lvl;
      }
      for (const r of g.reels) if (enhOf(r, own[r]) === 'gold') g.amount *= lvlOf(r, own[r]) + 1;
      if (relics.includes('prism') && g.matched && g.reels.some((r) => line[r] === 'wild')) g.amount *= 2;
      if (relics.includes('key') && g.matched && g.reels.length === 2) g.amount = Math.ceil(g.amount * KEY_MULT);
      if (relics.includes('bell') && g.matched && g.reels.length === 3) g.amount *= BELL_MULT;
      if (g.symbol === 'sword' || (g.symbol === 'rock' && relics.includes('pickaxe'))) sw += g.amount;
      if (g.symbol === 'bolt') en += g.amount;
    }
    dmg += p * Math.min(cap, sw);
    energy += p * Math.min(energyCap, en);
  }
  const cab = CABINETS[run.cabinet];
  const rod = relics.includes('rod') && gilded.some((g) => g.enh === 'charged');
  const cost = rod ? 4 : cab.specialCost ?? base.specialCost;
  const sdmg = (rod ? 12 : cab.specialDamage ?? base.specialDamage) + specialBonus;
  return { dmg, energy, power: dmg + (energy / cost) * Math.min(cap, sdmg) };
}
