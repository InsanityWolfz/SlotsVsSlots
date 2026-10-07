// Expert playtest 5 (throwaway): what kills you at the Dealer? npx tsx tools/balance/expert5_dealer.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../../src/core/run';
const OWN: Record<string, number> = {};
const N = Number(process.argv[2] ?? 200);
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };
for (const id of CABINET_ORDER as CabinetId[]) {
  const kill: Record<string, number> = {}; let n = 0, lost = 0; const allIns: number[] = [], enemyTurns: number[] = [], armedAtDeath: number[] = [];
  const dmgBy: Record<string, number> = {};
  SIM_BIAS.onFight = (run: RunState) => {
    if (run.act !== 3 || run.endless) return;
    const cfg = fightConfig(run, defaultConfig());
    if (cfg.enemy.boss !== 'dealer') return;
    const f = new Fight(cfg, (run.seed ^ 0x4242 ^ run.depth) >>> 0) as Fight & Record<string, unknown>;
    let ai = 0, et = 0, lastTag = '';
    while (!f.over && f.turn < 2000) {
      const wasAllIn = !!f['dealerAllIn'];
      const wasRaise = !!f['raiseEnemy'];
      const before = f.sides.player.hp;
      const { side, events } = f.step();
      const hit = before - f.sides.player.hp;
      if (side === 'enemy') {
        et++;
        const tag = events.some((e) => e.type === 'allInHit') ? 'ALLIN' : wasRaise ? 'RAISE' : 'quiet';
        if (tag === 'ALLIN') ai++;
        if (hit > 0) dmgBy[tag] = (dmgBy[tag] ?? 0) + hit / run.player.maxHp;
        lastTag = tag;
      } else { if (hit > 0) { dmgBy['own turn'] = (dmgBy['own turn'] ?? 0) + hit / run.player.maxHp; for (const e of events) OWN[e.type] = (OWN[e.type] ?? 0) + 1; } lastTag = 'own turn'; }
      void wasAllIn;
    }
    n++; allIns.push(ai); enemyTurns.push(et);
    if (f.winner === 'enemy') { lost++; kill[lastTag] = (kill[lastTag] ?? 0) + 1; armedAtDeath.push(f['dealerAllIn'] ? 1 : 0); }
  };
  simulateRuns(defaultConfig(), N, 'greedy', 4242, id, 2, true);
  const tot = Object.values(dmgBy).reduce((a, b) => a + b, 0);
  console.log(`${id.padEnd(6)} n ${n} lost ${((100 * lost) / n).toFixed(0)}% | enemy turns p50 ${q(enemyTurns, 0.5)} | ALL INs/fight p50 ${q(allIns, 0.5)} p90 ${q(allIns, 0.9)} | killing turn: ${Object.entries(kill).map(([k, v]) => `${k} ${((100 * v) / lost).toFixed(0)}%`).join(' ')} | ALL IN armed (unfired) at death ${((100 * armedAtDeath.reduce((a, b) => a + b, 0)) / Math.max(1, lost)).toFixed(0)}% | damage share: ${Object.entries(dmgBy).map(([k, v]) => `${k} ${((100 * v) / tot).toFixed(0)}%`).join(' ')}`);
}
console.log('own-turn damage events', JSON.stringify(OWN));
