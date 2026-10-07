// machinePower vs measured damage per player turn against a punching bag (sword/shield enemy, no ability),
// from real mid-run states (greedy drafting) at the start of act 2 and act 3.
import { defaultConfig, UNIT } from '../../../src/core/config';
import { CABINET_ORDER } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { fightConfig, machinePower, type RunState } from '../../../src/core/run';
import { Rng } from '../../../src/core/rng';
import * as SR from '../../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 60);
// Capture run snapshots at act starts by hooking finishFight via the sim (clone when act changes).
const snaps: Record<string, RunState[]> = {};
const orig = SR.simulateRuns;
void orig;
import * as RUN from '../../../src/core/run';
const origFinish = RUN.finishFight;
for (const cab of CABINET_ORDER) {
  snaps[cab] = [];
  const rng = new Rng(99);
  let taken = 0;
  // Replay greedy runs, snapshot at act 3 depth 0.
  for (let i = 0; i < N * 4 && taken < N; i++) {
    const run = RUN.createRun(defaultConfig(), rng.int(0xffffffff), cab, 2, true);
    const fs = new Rng(i + 7);
    while (!run.over) {
      if (RUN.needsChoice(run)) RUN.chooseEnemy(run, 0);
      if (run.act === 3 && run.depth === 0) {
        snaps[cab].push(JSON.parse(JSON.stringify(run)));
        taken++;
        break;
      }
      const f = new Fight(RUN.fightConfig(run, defaultConfig()), fs.int(0xffffffff));
      while (!f.over && f.turn < 2000) f.step();
      origFinish(run, f);
      if (run.over) break;
      if (run.pendingChoice?.length) RUN.takeChoice(run, run.pendingChoice.reduce((a, b) => (SR.choiceValue(run, b) > SR.choiceValue(run, a) ? b : a)));
      if (run.pendingLegend) { RUN.takeLegend(run, run.pendingLegend[0]); continue; }
      if (run.pendingSpoils) RUN.takeSpoils(run, run.pendingSpoils[0]);
      const offers = RUN.draftOffers(run);
      RUN.applyOption(run, offers.reduce((a, b) => (SR.greedyValue(run, b) > SR.greedyValue(run, a) ? b : a)));
      if (RUN.isShopNow(run)) { for (const it of RUN.shopOffers(run)) if (SR.greedyValue(run, it.option) >= 5) RUN.buy(run, it); RUN.leaveShop(run); }
    }
  }
}
for (const cab of CABINET_ORDER) {
  let pow = 0, dmg = 0, n = 0;
  const per: number[] = [];
  const builds: string[] = [];
  for (const run of snaps[cab]) {
    const cfg = fightConfig(run, defaultConfig());
    cfg.enemy = { hp: 99999 * UNIT, strips: [{ sword: 6, shield: 6 }, { sword: 6, shield: 6 }, { sword: 6, shield: 6 }], ability: null };
    cfg.player.hp = 99999 * UNIT;
    cfg.player.startHp = 99999 * UNIT;
    const f = new Fight(cfg, 1234 + n);
    let d = 0;
    for (let t = 0; t < 60; t++) for (const e of f.step().events as any[]) if ((e.type === 'attack' || e.type === 'specialFire') && e.from === 'player') d += e.amount;
    pow += machinePower(run);
    dmg += d / 30;
    per.push(d / 30);
    builds.push(`${Math.round(d / 30)}: lv ${JSON.stringify(run.player.levels)} charms ${run.player.gilded.map((g) => `${g.n}${g.enh[0]}${g.symbol[0]}${g.reel}`).join(',')} relics ${run.player.relics.join(',')} took ${run.records.map((r) => r.choice).filter(Boolean).join(',')}`);
    n++;
  }
  per.sort((a, b) => a - b);
  console.log(`  median ${per[Math.floor(n / 2)]?.toFixed(0)} p10 ${per[Math.floor(n * 0.1)]?.toFixed(0)} p90 ${per[Math.floor(n * 0.9)]?.toFixed(0)}`);
  builds.sort((a, b) => parseInt(b) - parseInt(a));
  console.log('  top: ' + builds.slice(0, 3).join('\n       '));
  console.log(`${cab.padEnd(7)} n ${n}  machinePower ${(pow / n).toFixed(1)}  measured dmg/turn ${(dmg / n).toFixed(1)}  ratio ${(dmg / pow).toFixed(2)}`);
}
