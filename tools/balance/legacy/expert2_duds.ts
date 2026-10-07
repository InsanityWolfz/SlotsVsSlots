// Expert playtest 2 (throwaway): share of player spins that pay nothing (no damage, no shield, no meter/special). npx tsx tools/balance/expert2_duds.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../../src/core/run';
const N = Number(process.argv[2] ?? 150);
const acc: Record<number, { spins: number; dud: number; low: number }> = {};
SIM_BIAS.onFight = (run: RunState) => {
  const f = new Fight(fightConfig(run, defaultConfig()), (run.seed ^ 0x777) >>> 0);
  const a = (acc[run.act] ??= { spins: 0, dud: 0, low: 0 });
  while (!f.over && f.turn < 2000) {
    const { side, events } = f.step();
    if (side !== 'player') continue;
    a.spins++;
    const busy = events.some((e) => ['attack', 'specialFire', 'shieldGain', 'heal', 'meter', 'ability', 'voucher', 'potWin'].includes(e.type));
    const dmg = events.reduce((s, e) => s + ((e.type === 'attack' || e.type === 'specialFire') && (e as { from?: string }).from === 'player' ? (e as { hpDamage: number }).hpDamage : 0), 0);
    if (!busy) a.dud++;
    if (dmg <= 10) a.low++;
  }
};
for (const c of CABINET_ORDER as CabinetId[]) simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
for (const [k, a] of Object.entries(acc)) console.log(`act ${k}: player spins ${a.spins}, nothing happens ${((100 * a.dud) / a.spins).toFixed(0)}%, deals <=10 HP ${((100 * a.low) / a.spins).toFixed(0)}%`);
