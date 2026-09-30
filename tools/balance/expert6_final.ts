// EXPERT_PLAYTEST_6 throwaway: does FINAL HAND land? npx tsx tools/balance/expert6_final.ts [N]
// Per Dealer fight (GREEN, greedy): did FINAL HAND fire, the Dealer's HP% when it fired (overshoot past 1/3),
// how far the row got (RAISE / RAISE / ALL IN) before the fight ended, who won, and the killing blow by type.
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../src/core/run';
const N = Number(process.argv[2] ?? 200);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(0) : '-');
for (const id of CABINET_ORDER as CabinetId[]) {
  let n = 0, fired = 0, lost = 0, reachedAllIn = 0, finalAllInHit = 0, diedInFinal = 0, wonBeforeAllIn = 0, lostBeforeFinal = 0;
  const firedAt: number[] = [], turnsAfter: number[] = [], dealerHpAtDeath: number[] = [];
  const kill: Record<string, number> = {};
  SIM_BIAS.onFight = (run: RunState) => {
    if (run.act !== 3 || run.endless) return;
    const cfg = fightConfig(run, defaultConfig());
    if (cfg.enemy.boss !== 'dealer') return;
    const f = new Fight(cfg, (run.seed ^ 0x6161 ^ run.depth) >>> 0) as Fight & Record<string, unknown>;
    let firedTurn = -1, allInArmedInFinal = false, allInHitInFinal = false, lastTag = '';
    while (!f.over && f.turn < 2000) {
      const wasRaise = !!f['raiseEnemy'];
      const before = f.sides.player.hp;
      const { side, events } = f.step();
      for (const e of events) {
        if (e.type === 'finalHand') { firedTurn = f.turn; firedAt.push(f.sides.enemy.hp / f.sides.enemy.maxHp); }
        if (firedTurn >= 0 && e.type === 'allInArmed' && !allInArmedInFinal) allInArmedInFinal = true;
        if (firedTurn >= 0 && allInArmedInFinal && e.type === 'allInHit') allInHitInFinal = true;
      }
      if (before - f.sides.player.hp > 0 || side === 'enemy') {
        const tag = events.some((e) => e.type === 'allInHit') ? 'ALLIN' : side === 'enemy' ? (wasRaise ? 'RAISE' : 'quiet') : 'own turn';
        lastTag = (firedTurn >= 0 ? 'FH-' : '') + tag;
      }
    }
    n++;
    if (firedTurn >= 0) { fired++; turnsAfter.push(f.turn - firedTurn); if (allInArmedInFinal) reachedAllIn++; if (allInHitInFinal) finalAllInHit++; }
    if (f.winner === 'enemy') {
      lost++; kill[lastTag] = (kill[lastTag] ?? 0) + 1; dealerHpAtDeath.push(f.sides.enemy.hp / f.sides.enemy.maxHp);
      if (firedTurn >= 0) diedInFinal++; else lostBeforeFinal++;
    } else if (firedTurn >= 0 && !allInHitInFinal) wonBeforeAllIn++;
  };
  simulateRuns(defaultConfig(), N, 'greedy', 4242, id, 2, true);
  console.log(`${id.padEnd(6)} dealer n ${n} lost ${pct(lost, n)}% | FINAL HAND fired ${pct(fired, n)}% at dealer HP p10/p50/p90 ${[0.1, 0.5, 0.9].map((p) => (100 * q(firedAt, p)).toFixed(0)).join('/')}% | turns after p50 ${q(turnsAfter, 0.5)} | row reached ALL IN ${pct(reachedAllIn, fired)}%, final ALL IN landed ${pct(finalAllInHit, fired)}% | wins that ended before the final ALL IN ${pct(wonBeforeAllIn, fired - diedInFinal)}% | losses: before FH ${pct(lostBeforeFinal, lost)}%, during/after FH ${pct(diedInFinal, lost)}%, dealer HP at your death p50 ${(100 * q(dealerHpAtDeath, 0.5)).toFixed(0)}% | killing blow: ${Object.entries(kill).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, lost)}%`).join(' ')}`);
}
