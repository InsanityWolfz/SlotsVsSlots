// QA_1 edge cases for BONUS WHEEL / RELIC RUSH.  npx tsx playtest/scratch/qa_edges.ts
import { CABINET_ORDER, fullRuns3, type Policy } from './it12p_lib';
import { Fight } from '../../src/core/fight';
import { BONUS, RELIC_TIER, RELICS } from '../../src/core/relics';
import { defaultConfig, type RelicId } from '../../src/core/config';
import { createRun, fightConfig, payVoucher } from '../../src/core/run';
import { ARCHETYPES, makeEnemy } from '../../src/core/enemies';
import { Rng } from '../../src/core/rng';

const base = defaultConfig();
// 1) stress: high bonus rates through full act 3 runs; check invariants on every step
BONUS.wheel = 0.15; BONUS.rush = 0.08;
const bad: Record<string, number> = {};
const note = (k: string) => (bad[k] = (bad[k] ?? 0) + 1);
let steps = 0, bonusSpins = 0, dealerBonus = 0, bonusAfterShuffle = 0, bonusAfterCut = 0, bonusFrozen = 0, bonusLocked = 0, raiseOnBonus = 0;
const origStep = Fight.prototype.step;
(Fight.prototype as any).step = function (this: any) {
  const lastDeal = this._lastDeal;
  const r = origStep.call(this);
  steps++;
  const p = this.sides.player;
  if (this.cfg.player.bonusSymbols) {
    for (const reel of p.reels) {
      const b = reel.cells.filter((c: any) => c.symbol === 'bonusSym').length, q = reel.cells.filter((c: any) => c.symbol === 'relicSym').length;
      if (b !== 1 || q !== 1) note(`chase count ${b}/${q}`);
      for (const c of reel.cells as any[]) if (c.symbol === 'bonusSym' || c.symbol === 'relicSym') for (const k of ['slimed','bomb','carded','stolen','enh','grounded','faked','confiscated']) if (c[k]) note('chase cell has ' + k);
    }
  }
  let dealt: string | null = null;
  for (const e of r.events as any[]) {
    if (e.type === 'shuffle') dealt = 'shuffle';
    if (e.type === 'cut') dealt = 'cut';
    if (e.type === 'raise') dealt = 'raise';
    if (e.type === 'spin' && e.side === 'player') {
      const chase = e.score.line.filter((s: string) => s === 'bonusSym' || s === 'relicSym').length;
      if (e.bonus) {
        bonusSpins++;
        if (chase !== 3) note('bonus spin line ' + e.score.line.join(',') + (this.isDealer ? ' dealer' : ''));
        if (e.frozen.some(Boolean)) bonusFrozen++;
        if (e.locked.some(Boolean)) bonusLocked++;
        if (this.isDealer) { dealerBonus++; if (lastDeal === 'shuffle') bonusAfterShuffle++; if (lastDeal === 'cut') bonusAfterCut++; }
      } else if (chase > 0) note('normal spin landed a chase symbol on the payline');
    }
    if (e.type === 'attack' && e.from === 'player' && e.amount > 0 && r.events.some((x: any) => x.type === 'spin' && x.bonus) && (e.notes ?? []).includes?.('RAISE X2')) raiseOnBonus++;
  }
  if (dealt) this._lastDeal = dealt; else if (r.side === 'player') this._lastDeal = null;
  return r;
};
const POL: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
let runs = 0;
for (const cab of CABINET_ORDER) { fullRuns3(cab as any, POL, 60, 5, true, 99); runs += 60; }
console.log(`stress: ${runs} GOLD act3 runs, ${steps} steps, ${bonusSpins} bonus spins (frozen ${bonusFrozen}, locked ${bonusLocked}); Dealer bonuses ${dealerBonus} (right after SHUFFLE ${bonusAfterShuffle}, after CUT ${bonusAfterCut})`);
console.log('invariant violations:', JSON.stringify(bad));
(Fight.prototype as any).step = origStep;
BONUS.wheel = 0.02; BONUS.rush = 0.01;

// 2) forced bonus (dbg.bonus) while a reel is frozen: does the frozen reel get dragged onto the chase cell?
{
  let tried = 0, chaseAfter = 0, movedFrozen = 0;
  for (let s = 1; s < 400 && tried < 60; s++) {
    const run = createRun(base, s, 'knight');
    const frost = ARCHETYPES.find((a) => a.id === 'frost')!;
    run.enemies[0] = makeEnemy(frost, 1, new Rng(s), false, 1);
    const f = new Fight(fightConfig(run, base), s);
    for (let k = 0; k < 60 && !f.over; k++) {
      if (f.next === 'player' && f.sides.player.frozen.some((t) => t > 0)) {
        const fr = f.sides.player.frozen.map((t) => t > 0);
        const before = f.sides.player.reels.map((r) => r.stop);
        f.forceBonus = 'wheel';
        const res = f.step();
        tried++;
        const spins = res.events.filter((e: any) => e.type === 'spin' && e.side === 'player') as any[];
        const last = spins.at(-1);
        if (last.score.line.some((x: string) => x === 'bonusSym')) chaseAfter++;
        if (spins[0].bonus && fr.some((z, r) => z && spins[0].stops[r] !== before[r])) movedFrozen++;
        break;
      }
      f.step();
    }
  }
  console.log(`forced bonus with a frozen reel: ${tried} cases; frozen reel dragged to the chase cell ${movedFrozen}; real respin line still shows BONUS on a frozen reel ${chaseAfter}`);
}

// 3) RELIC RUSH when you own every relic / every relic of a tier
{
  const run = createRun(base, 7, 'knight');
  run.player.gilded.push({ reel: 0, symbol: 'sword', enh: 'gold' }, { reel: 0, symbol: 'bolt', enh: 'charged' }, { reel: 0, symbol: 'shield', enh: 'spiked' }, { reel: 1, symbol: 'sword', enh: 'keen' });
  run.player.strips[0].wild = 1;
  run.player.relics = Object.keys(RELICS) as RelicId[];
  const chips0 = run.player.chips;
  const p = payVoucher(run, { kind: 'rush', seed: 123 });
  console.log(`rush owning ALL relics: relic ${p.kind === 'rush' ? p.relic : '-'} chips +${run.player.chips - chips0} label "${p.label}"`);
  const run2 = createRun(base, 8, 'knight');
  run2.player.relics = [...RELIC_TIER.common];
  const tiers: Record<string, number> = {};
  for (let s = 0; s < 300; s++) { const r = JSON.parse(JSON.stringify(run2)); const q = payVoucher(r, { kind: 'rush', seed: s }) as any; const got = q.relic; const t = got ? (RELIC_TIER.common.includes(got) ? 'common' : RELIC_TIER.uncommon.includes(got) ? 'uncommon' : 'legendary') : 'none'; tiers[`${q.tier}->${t}`] = (tiers[`${q.tier}->${t}`] ?? 0) + 1; }
  console.log('rush owning every COMMON (rolled tier -> relic tier):', JSON.stringify(tiers));
  // what a fresh knight actually gets from a common rush
  const fresh = createRun(base, 9, 'knight');
  const got: Record<string, number> = {};
  for (let s = 0; s < 2000; s++) { const r = JSON.parse(JSON.stringify(fresh)); const q = payVoucher(r, { kind: 'rush', seed: s }) as any; got[q.relic ?? 'none'] = (got[q.relic ?? 'none'] ?? 0) + 1; }
  console.log('fresh knight rush prizes (/2000):', JSON.stringify(got));
}
