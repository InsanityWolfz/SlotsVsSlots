// Expert playtest 5 (throwaway): MIDAS hoard vs spend. npx tsx tools/balance/expert5_midas.ts [N] [cabinet]
// Same run loop as simulateRuns (greedy drafts, big choices, legends, spoils), but the Cashier policy varies:
//   greedy = the official sim (value per chip, reserve before a boss)
//   spend  = buy everything worth anything, best first, no reserve (and reroll once if >= 20 chips left)
//   hoard  = never buy at the Cashier
//   bank30 = keep 30 chips, spend only the excess (the "interest" line a Balatro player would take)
import { defaultConfig } from '../../../src/core/config';
import type { CabinetId } from '../../../src/core/cabinets';
import { actLength } from '../../../src/core/enemies';
import { Fight, MIDAS } from '../../../src/core/fight';
import { Rng } from '../../../src/core/rng';
import {
  applyOption, buy, chooseEnemy, createRun, draftOffers, finishFight, fightConfig, isShopNow, leaveShop, needsChoice,
  shopOffers, takeChoice, takeLegend, takeSpoils, takeStart, reroll, BOSS_MUL, type RunState,
} from '../../../src/core/run';
import { choiceValue, greedyValue } from '../../../src/sim/simulateRun';

// Variant knobs: MIDAS_PIP=4 MIDAS_MUL=40 MIDAS_MAX=3 HOUSE_MUL=3 POLS=hoard,spend
if (process.env.MIDAS_PIP) MIDAS.chipsPerPip = Number(process.env.MIDAS_PIP);
if (process.env.MIDAS_MUL) MIDAS.chipsPerMul = Number(process.env.MIDAS_MUL);
if (process.env.MIDAS_MAX) MIDAS.maxMul = Number(process.env.MIDAS_MAX);
if (process.env.HOUSE_MUL) BOSS_MUL.midas.house = Number(process.env.HOUSE_MUL);
const N = Number(process.argv[2] ?? 400);
const CAB = (process.argv[3] ?? 'midas') as CabinetId;
type Pol = 'greedy' | 'spend' | 'hoard' | 'bank30';
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };

function shop(run: RunState, pol: Pol) {
  if (pol === 'hoard') return leaveShop(run);
  const keep = pol === 'bank30' ? 30 : pol === 'greedy' ? (run.depth >= actLength(run.act) ? 16 : 0) : 0;
  const pass = (items: ReturnType<typeof shopOffers>) => {
    const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
    const min = pol === 'spend' ? 2 : 5;
    for (const it of sorted) if (greedyValue(run, it.option) >= min && run.player.chips - it.price >= keep) buy(run, it);
  };
  pass(shopOffers(run));
  if (pol === 'spend' && run.player.chips >= 20) { const r = reroll(run); if (r) pass(r); }
  leaveShop(run);
}

function sim(pol: Pol, stake: number, act3: boolean) {
  const seeds = new Rng(4242);
  const pick = new Rng(4242 ^ 0x5eed);
  let wins = 0, house = 0, houseN = 0, mirror = 0, mirrorN = 0, dealer = 0, dealerN = 0, act1 = 0;
  const chipsAtHouse: number[] = [], chipsAtMirror: number[] = [], chipsAtDealer: number[] = [];
  const vaultMulHouse: number[] = [], vaultFiresHouse: number[] = [], houseTurns: number[] = [];
  for (let i = 0; i < N; i++) {
    const runSeed = seeds.int(0xffffffff);
    const run = createRun(defaultConfig(), runSeed, CAB, stake, act3);
    if (run.pendingStart?.length) { takeStart(run, run.pendingStart[0]); run.pendingStart = null; }
    const fs = new Rng((runSeed ^ 0x5f3759df) >>> 0);
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, 0);
      const e = run.enemies[run.depth];
      const act = run.act;
      if (e.boss === 'house') { houseN++; chipsAtHouse.push(run.player.chips); }
      if (e.boss === 'mirror') { mirrorN++; chipsAtMirror.push(run.player.chips); }
      if (e.boss === 'dealer') { dealerN++; chipsAtDealer.push(run.player.chips); }
      const f = new Fight(fightConfig(run, defaultConfig()), fs.int(0xffffffff));
      let fires = 0, mul = 0;
      while (!f.over && f.turn < 2000) {
        const r = f.step();
        for (const ev of r.events) if (ev.type === 'payoff' && ev.kind === 'vault') { fires++; mul = Math.max(mul, ev.mul ?? 0); }
      }
      if (e.boss === 'house') { vaultFiresHouse.push(fires); vaultMulHouse.push(mul); houseTurns.push(f.turn); }
      const won = f.winner === 'player';
      if (won && e.boss === 'house') { house++; act1++; }
      if (won && e.boss === 'mirror') mirror++;
      if (won && e.boss === 'dealer') dealer++;
      finishFight(run, f);
      while (!run.over && run.pendingChoice?.length) { const cs = run.pendingChoice; takeChoice(run, cs.reduce((a, b) => (choiceValue(run, b) > choiceValue(run, a) ? b : a))); }
      if (!run.over && run.pendingLegend) { const lg = run.pendingLegend; if (lg.length) takeLegend(run, lg[0]); run.pendingLegend = null; if (isShopNow(run)) shop(run, pol); continue; }
      if (!run.over && run.pendingSpoils) { const sp = run.pendingSpoils; takeSpoils(run, sp.reduce((a, b) => (greedyValue(run, { kind: 'relic', relic: b }) > greedyValue(run, { kind: 'relic', relic: a }) ? b : a))); }
      if (!run.over) {
        const offers = draftOffers(run);
        applyOption(run, offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a)));
        if (isShopNow(run)) shop(run, pol);
      }
      void act;
    }
    if (run.won) wins++;
  }
  const pc = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) : '-').padStart(5);
  console.log(`${CAB} ${pol.padEnd(6)} stake ${stake} | win ${pc(wins, N)} | House ${pc(house, houseN)} (n ${houseN}) Mirror ${pc(mirror, mirrorN)} Dealer ${pc(dealer, dealerN)} | chips@House p50 ${q(chipsAtHouse, 0.5)} @Mirror ${q(chipsAtMirror, 0.5)} @Dealer ${q(chipsAtDealer, 0.5)} | House: vault fires p50 ${q(vaultFiresHouse, 0.5)} maxMul p50 ${q(vaultMulHouse, 0.5)} turns p50 ${q(houseTurns, 0.5)}`);
}
for (const pol of (process.env.POLS ?? 'greedy,spend,hoard,bank30').split(',') as Pol[]) { sim(pol, 0, false); sim(pol, 2, true); }
