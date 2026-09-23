// Act 3 fight probe: turns, HP lost, player power.  npx tsx playtest/scratch/it12_probe.ts
import { defaultConfig } from '../../src/core/config';
import { Fight } from '../../src/core/fight';
import { applyOption, chooseEnemy, createRun, draftOffers, fightConfig, finishFight, isShopNow, machinePower, needsChoice, takeLegend, takeSpoils } from '../../src/core/run';
import { Rng } from '../../src/core/rng';
import { greedyValue } from '../../src/sim/simulateRun';
const base = defaultConfig();
const rng = new Rng(5);
const st: Record<string, { n: number; turns: number; lost: number; power: number; ehp: number; hp: number }> = {};
for (let i = 0; i < 400; i++) {
  const run = createRun(base, rng.int(0xffffffff), 'knight', 2);
  while (!run.over) {
    if (needsChoice(run)) chooseEnemy(run, 0);
    const cfg = fightConfig(run, base);
    const key = `${run.act}:${run.enemies[run.depth].archetype}`;
    const before = run.player.hp;
    const pw = machinePower(run);
    const f = new Fight(cfg, rng.int(0xffffffff));
    while (!f.over && f.turn < 2000) f.step();
    if (run.act >= 2) {
      const s = (st[key] ??= { n: 0, turns: 0, lost: 0, power: 0, ehp: 0, hp: 0 });
      s.n++; s.turns += f.turn; s.lost += before - f.sides.player.hp; s.power += pw; s.ehp += cfg.enemy.hp; s.hp += before;
    }
    finishFight(run, f);
    if (run.over) break;
    if (run.pendingLegend) { takeLegend(run, run.pendingLegend[0]); run.pendingLegend = null; continue; }
    if (run.pendingSpoils) takeSpoils(run, run.pendingSpoils[0]);
    const offers = draftOffers(run);
    applyOption(run, offers.reduce((a, b) => (greedyValue(run, b) > greedyValue(run, a) ? b : a)));
    void isShopNow;
  }
}
for (const [k, s] of Object.entries(st).sort()) console.log(`${k.padEnd(18)} n ${String(s.n).padStart(4)} turns ${(s.turns / s.n).toFixed(1)} hpIn ${(s.hp / s.n).toFixed(0)} lost ${(s.lost / s.n).toFixed(1)} power ${(s.power / s.n).toFixed(1)} enemyHp ${(s.ehp / s.n).toFixed(0)}`);
