// Expert playtest 3 (throwaway): single enemy turns that take a big bite of your max HP, per archetype (regular fights).
// npx tsx tools/balance/expert3_spikes.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../src/core/run';
const N = Number(process.argv[2] ?? 150);
const acc: Record<string, { fights: number; lost: number; spike40: number; spike60: number; deathsBySpike: number }> = {};
SIM_BIAS.onFight = (run: RunState) => {
  const cfg = fightConfig(run, defaultConfig());
  if (cfg.enemy.boss) return;
  const arch = run.enemies[run.depth].archetype;
  const key = `act${run.act} ${arch}`;
  const a = (acc[key] ??= { fights: 0, lost: 0, spike40: 0, spike60: 0, deathsBySpike: 0 });
  const f = new Fight(cfg, (run.seed ^ 0x777) >>> 0);
  const max = run.player.maxHp;
  let big = 0;
  while (!f.over && f.turn < 2000) {
    const hp0 = f.sides.player.hp;
    const { side } = f.step();
    if (side !== 'enemy') continue;
    big = Math.max(big, (hp0 - f.sides.player.hp) / max);
  }
  a.fights++;
  if (big >= 0.4) a.spike40++;
  if (big >= 0.6) a.spike60++;
  if (f.winner === 'enemy') { a.lost++; if (big >= 0.4) a.deathsBySpike++; }
};
for (const c of CABINET_ORDER as CabinetId[]) simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
const rows = Object.entries(acc).filter(([, a]) => a.fights >= 40).sort();
for (const [k, a] of rows)
  console.log(`${k.padEnd(18)} fights ${String(a.fights).padStart(5)}  lost ${((100 * a.lost) / a.fights).toFixed(1).padStart(5)}%  a turn >=40% maxHP ${((100 * a.spike40) / a.fights).toFixed(1).padStart(5)}%  >=60% ${((100 * a.spike60) / a.fights).toFixed(1).padStart(5)}%  losses with a >=40% turn ${a.lost ? ((100 * a.deathsBySpike) / a.lost).toFixed(0) : '-'}%`);
