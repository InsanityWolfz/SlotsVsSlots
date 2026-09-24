// BONUS WHEEL / RELIC RUSH rates and RUSH tier distribution.  npx tsx playtest/scratch/bonus_rates.ts
import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { RUSH } from '../../src/core/relics';
import { Rng } from '../../src/core/rng';
import { applyOption, chooseEnemy, createRun, draftOffers, fightConfig, finishFight, needsChoice, playRush, rushTier, takeLegend, takeSpoils } from '../../src/core/run';
import { greedyValue } from '../../src/sim/simulateRun';
const base = defaultConfig();
for (const stick of [0.065, 0.07, 0.075]) {
  RUSH.stick = stick;
  const rng = new Rng(9);
  const t = { common: 0, uncommon: 0, legendary: 0 };
  let grand = 0;
  for (let i = 0; i < 20000; i++) { const r = playRush(rng); t[rushTier(r.count)]++; if (r.count >= 15) grand++; }
  console.log(`stick ${stick}: common ${(t.common / 200).toFixed(1)}% uncommon ${(t.uncommon / 200).toFixed(1)}% legendary ${(t.legendary / 200).toFixed(1)}% grand ${(grand / 200).toFixed(2)}%`);
}
const rng = new Rng(3);
let runs = 0, wheels = 0, rushes = 0, spins = 0;
for (let i = 0; i < 600; i++) {
  const run = createRun(base, rng.int(0xffffffff), 'knight');
  runs++;
  while (!run.over) {
    if (needsChoice(run)) chooseEnemy(run, 0);
    const f = new Fight(fightConfig(run, base), rng.int(0xffffffff));
    while (!f.over && f.turn < 2000) f.step();
    spins += Math.ceil(f.turn / 2);
    wheels += f.vouchers.filter((v) => v.kind === 'wheel').length;
    rushes += f.vouchers.filter((v) => v.kind === 'rush').length;
    finishFight(run, f);
    if (run.over) break;
    if (run.pendingLegend) { takeLegend(run, run.pendingLegend[0]); run.pendingLegend = null; continue; }
    if (run.pendingSpoils) takeSpoils(run, run.pendingSpoils[0]);
    const offers = draftOffers(run);
    applyOption(run, offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a)));
  }
}
console.log(`per run: wheels ${(wheels / runs).toFixed(2)} rushes ${(rushes / runs).toFixed(2)} player spins ${(spins / runs).toFixed(0)}`);
