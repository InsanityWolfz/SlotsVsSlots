// Expert playtest 2 (throwaway): do regular enemies get to use their ability? npx tsx tools/balance/expert2_ability.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { actLength } from '../../../src/core/enemies';
import { Fight } from '../../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../../src/core/run';
const N = Number(process.argv[2] ?? 200);
const base = defaultConfig();
const acc: Record<string, { n: number; never: number; dmg0: number }> = {};
let cab = '';
SIM_BIAS.onFight = (run: RunState) => {
  if (run.depth >= actLength(run.act)) return;
  const f = new Fight(fightConfig(run, base), (run.seed ^ 0x1234567) >>> 0);
  let fired = 0; let dmg = 0;
  while (!f.over && f.turn < 2000) {
    const { side, events } = f.step();
    for (const e of events) {
      if (e.type === 'ability' && side === 'enemy') fired++;
      const ev = e as { hpDamage?: number; from?: string; side?: string; type: string };
      if (ev.hpDamage && (ev.from === 'enemy' || ((ev.type === 'markedHit' || ev.type === 'blast') && ev.side === 'player'))) dmg += ev.hpDamage;
    }
  }
  for (const k of [`${cab} act${run.act}`, `ALL act${run.act}`]) {
    const a = (acc[k] ??= { n: 0, never: 0, dmg0: 0 });
    a.n++; if (!fired) a.never++; if (!dmg) a.dmg0++;
  }
};
for (const c of CABINET_ORDER as CabinetId[]) { cab = c; simulateRuns(base, N, 'greedy', 4242, c, 2, true); }
for (const [k, a] of Object.entries(acc).sort()) console.log(`${k.padEnd(12)} fights ${a.n}  ability never fired ${((100 * a.never) / a.n).toFixed(0)}%  took 0 damage ${((100 * a.dmg0) / a.n).toFixed(0)}%`);
