// Expert playtest 3 (throwaway): where act 3 HP comes back from. In-fight heals by source, and damage taken, per machine.
// npx tsx tools/balance/expert3_heals.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../src/core/run';
const N = Number(process.argv[2] ?? 200);
let cab = '';
const acc: Record<string, { fights: number; taken: number; heal: Record<string, number>; overheal: number; maxHp: number }> = {};
SIM_BIAS.onFight = (run: RunState) => {
  if (run.act !== 3 || run.depth >= 5) return; // act 3 regulars only
  const f = new Fight(fightConfig(run, defaultConfig()), (run.seed ^ 0x777) >>> 0);
  const a = (acc[cab] ??= { fights: 0, taken: 0, heal: {}, overheal: 0, maxHp: 0 });
  a.fights++; a.maxHp += run.player.maxHp;
  while (!f.over && f.turn < 2000) {
    const { events } = f.step();
    for (const e of events as unknown as Record<string, unknown>[]) {
      if (e.type === 'heal' && e.side === 'player') a.heal[String(e.source)] = (a.heal[String(e.source)] ?? 0) + Number(e.amount);
      if ((e.type === 'attack' || e.type === 'specialFire') && e.to === 'player') a.taken += Number(e.hpDamage);
      if ((e.type === 'markedHit' && e.side === 'player') || (e.type === 'blast' && e.side === 'player')) a.taken += Number(e.hpDamage);
      if ((e.type === 'potWin' || e.type === 'allInHit') && e.to === 'player') a.taken += Number(e.hpDamage);
    }
  }
};
for (const c of CABINET_ORDER as CabinetId[]) { cab = c; simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true); }
for (const [k, a] of Object.entries(acc)) {
  const m = a.maxHp / a.fights;
  const heals = Object.entries(a.heal).sort((x, y) => y[1] - x[1]).map(([s, v]) => `${s} ${((100 * v) / a.fights / m).toFixed(1)}%`).join(', ');
  console.log(`${k.padEnd(7)} act3 regular fights ${a.fights}: taken/fight ${((100 * a.taken) / a.fights / m).toFixed(1)}% maxHP | heals/fight (%maxHP): ${heals}`);
}
