// Expert playtest 2 (throwaway): offer diversity in drafts, the Cashier and rerolls. npx tsx tools/balance/expert2_offers.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { actLength } from '../../src/core/enemies';
import { Fight } from '../../src/core/fight';
import { Rng } from '../../src/core/rng';
import {
  applyOption, buy, chooseEnemy, CHIPS, createRun, draftOffers, finishFight, fightConfig, takeLegend, takeChoice,
  isShopNow, leaveShop, needsChoice, shopOffers, takeSpoils, takeStart, type DraftOption, type RunState,
} from '../../src/core/run';
import { greedyValue, choiceValue } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const base = defaultConfig();
const cat = (o: DraftOption) => (o.kind === 'gild' ? `charm:${o.enh}` : o.kind === 'charmLevel' ? `lvl:${o.enh}` : o.kind === 'symLevel' ? `lvl:${o.symbol}` : o.kind === 'relic' ? `relic:${o.relic}` : o.kind === 'swap' ? `swap:${o.from}>${o.to}` : o.kind);
const kindOf = (o: DraftOption) => (o.kind === 'gild' || o.kind === 'charmLevel' ? 'charm' : o.kind === 'symLevel' ? 'symLevel' : o.kind === 'relic' ? 'relic' : o.kind === 'heal' || o.kind === 'maxHp' ? 'hp' : 'strip');

for (const cab of CABINET_ORDER as CabinetId[]) {
  const st = {
    draftsAfterFirstCharm: 0, draftCharmCards: 0, draftCharmOwned: 0, draftCharmOther: 0,
    shopsAfterFirstCharm: 0, shopCharmCards: 0, shopCharmOwned: 0, shopCharmOther: 0, shopWithOtherCharm: 0, draftsWithOtherCharm: 0,
    rerolls: 0, rerollSameExact: 0, rerollSameCat: 0, rerollSameKindSeq: 0, rerollRelicSame: 0, rerollItems: 0,
    lateRerolls: 0, lateSameCat: 0, lateItems: 0,
    firstCharm: {} as Record<string, number>, draftKinds: {} as Record<string, number>, shopKinds: {} as Record<string, number>,
    uniqueCharmTypesOwnedEnd: 0, runs: 0, ownedTypes: {} as Record<number, number>,
  };
  const seeds = new Rng(4242);
  for (let i = 0; i < N; i++) {
    const seed = seeds.int(0xffffffff);
    const run: RunState = createRun(base, seed, cab, 2, true);
    if (run.pendingStart?.length) { takeStart(run, run.pendingStart[0]); run.pendingStart = null; }
    const fs = new Rng((seed ^ 0x5f3759df) >>> 0);
    const ownedEnh = () => new Set(run.player.gilded.map((g) => g.enh));
    const doShop = () => {
      const items = shopOffers(run);
      const owned = ownedEnh();
      for (const it of items) st.shopKinds[kindOf(it.option)] = (st.shopKinds[kindOf(it.option)] ?? 0) + 1;
      if (owned.size) {
        st.shopsAfterFirstCharm++;
        let other = false;
        for (const it of items) if (it.option.kind === 'gild' || it.option.kind === 'charmLevel') {
          st.shopCharmCards++;
          if (owned.has(it.option.enh)) st.shopCharmOwned++; else { st.shopCharmOther++; other = true; }
        }
        if (other) st.shopWithOtherCharm++;
      }
      // Reroll probe: what changes (no chips spent)?
      for (let k = 0; k < 3; k++) {
        const before = shopOffers(run).filter((x) => x.option.kind !== 'heal');
        run.shopRerolls++;
        const after = shopOffers(run).filter((x) => x.option.kind !== 'heal');
        const b = new Set(before.map((x) => JSON.stringify(x.option)));
        const bc = before.map((x) => cat(x.option));
        st.rerolls++;
        st.rerollItems += after.length;
        for (const x of after) {
          if (b.has(JSON.stringify(x.option))) st.rerollSameExact++;
          if (bc.includes(cat(x.option))) st.rerollSameCat++;
        }
        if (before.map((x) => kindOf(x.option)).join() === after.map((x) => kindOf(x.option)).join()) st.rerollSameKindSeq++;
        const rb = before.find((x) => x.option.kind === 'relic'), ra = after.find((x) => x.option.kind === 'relic');
        if (rb && ra && JSON.stringify(rb.option) === JSON.stringify(ra.option)) st.rerollRelicSame++;
        if (run.act >= 2) { st.lateRerolls++; st.lateItems += after.length; for (const x of after) if (bc.includes(cat(x.option))) st.lateSameCat++; }
      }
      run.shopRerolls = 0;
      const reserve = run.depth >= actLength(run.act) ? CHIPS.stackPer * 2 : 0;
      const sorted = [...items].sort((a, b) => greedyValue(run, b.option) / b.price - greedyValue(run, a.option) / a.price);
      for (const it of sorted) if (greedyValue(run, it.option) >= 5 && run.player.chips - it.price >= reserve) buy(run, it);
      leaveShop(run);
    };
    while (!run.over) {
      if (needsChoice(run)) chooseEnemy(run, 0);
      const fight = new Fight(fightConfig(run, base), fs.int(0xffffffff));
      while (!fight.over && fight.turn < 2000) fight.step();
      finishFight(run, fight);
      if (!run.over && run.pendingChoice?.length) { const cs = run.pendingChoice; takeChoice(run, cs.reduce((a, b) => (choiceValue(run, b) > choiceValue(run, a) ? b : a))); }
      if (!run.over && run.pendingLegend) { const lg = run.pendingLegend; if (lg.length) takeLegend(run, lg[0]); run.pendingLegend = null; if (isShopNow(run)) doShop(); continue; }
      if (!run.over && run.pendingSpoils) takeSpoils(run, run.pendingSpoils[0]);
      if (!run.over) {
        const offers = draftOffers(run);
        const owned = ownedEnh();
        for (const o of offers) st.draftKinds[kindOf(o)] = (st.draftKinds[kindOf(o)] ?? 0) + 1;
        if (owned.size) {
          st.draftsAfterFirstCharm++;
          let other = false;
          for (const o of offers) if (o.kind === 'gild' || o.kind === 'charmLevel') {
            st.draftCharmCards++;
            if (owned.has(o.enh)) st.draftCharmOwned++; else { st.draftCharmOther++; other = true; }
          }
          if (other) st.draftsWithOtherCharm++;
        }
        const pick = offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a));
        const had = owned.size;
        applyOption(run, pick);
        if (!had && pick.kind === 'gild') st.firstCharm[pick.enh] = (st.firstCharm[pick.enh] ?? 0) + 1;
        if (isShopNow(run)) doShop();
      }
    }
    st.runs++;
    const n = ownedEnh().size;
    st.ownedTypes[n] = (st.ownedTypes[n] ?? 0) + 1;
  }
  const p = (a: number, b: number) => `${b ? ((100 * a) / b).toFixed(0) : '-'}%`;
  console.log(`\n### ${cab} (N ${N}, GREEN, greedy)`);
  console.log(`first charm taken: ${JSON.stringify(st.firstCharm)}`);
  console.log(`charm types owned at run end: ${JSON.stringify(st.ownedTypes)}`);
  console.log(`DRAFTS after owning a charm: ${st.draftsAfterFirstCharm}; charm/charm-level cards ${st.draftCharmCards}: same type as owned ${p(st.draftCharmOwned, st.draftCharmCards)}; drafts showing ANY new charm type ${p(st.draftsWithOtherCharm, st.draftsAfterFirstCharm)}`);
  console.log(`SHOPS after owning a charm: ${st.shopsAfterFirstCharm}; charm cards ${st.shopCharmCards}: same type ${p(st.shopCharmOwned, st.shopCharmCards)}; shelves with ANY new charm type ${p(st.shopWithOtherCharm, st.shopsAfterFirstCharm)}`);
  console.log(`draft card kinds: ${JSON.stringify(st.draftKinds)} | shop kinds: ${JSON.stringify(st.shopKinds)}`);
  console.log(`REROLL: items identical to pre-reroll ${p(st.rerollSameExact, st.rerollItems)}, same category (e.g. charm:gold, relic:x) ${p(st.rerollSameCat, st.rerollItems)}, slot-kind layout unchanged ${p(st.rerollSameKindSeq, st.rerolls)}, relic slot unchanged ${p(st.rerollRelicSame, st.rerolls)} | acts 2-3 same category ${p(st.lateSameCat, st.lateItems)}`);
}
