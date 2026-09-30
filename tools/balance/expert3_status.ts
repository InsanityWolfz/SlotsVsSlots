// Expert playtest 3 (throwaway): how often the player's spins are frozen/locked, per enemy archetype and act. npx tsx tools/balance/expert3_status.ts [N]
import { defaultConfig } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../src/core/run';
const N = Number(process.argv[2] ?? 150);
type A = { fights: number; spins: number; stuck: number; shares: number[]; lostPct: number[] };
const acc: Record<string, A> = {};
SIM_BIAS.onFight = (run: RunState) => {
  const cfg = fightConfig(run, defaultConfig());
  const f = new Fight(cfg, (run.seed ^ 0x777) >>> 0);
  const key = `act${run.act} ${cfg.enemy.name.split(' ').slice(-2).join(' ')}`.replace(/ELITE |GRUMPY |GREEDY |SPITEFUL |FERAL /g, '');
  const a = (acc[key] ??= { fights: 0, spins: 0, stuck: 0, shares: [], lostPct: [] });
  let sp = 0, st = 0;
  const hp0 = run.player.hp;
  while (!f.over && f.turn < 2000) {
    const { side, events } = f.step();
    if (side !== 'player') continue;
    for (const e of events) {
      if (e.type !== 'spin' || (e as { side: string }).side !== 'player') continue;
      sp++;
      const ev = e as unknown as { frozen?: boolean[]; locked?: boolean[] };
      if ((ev.frozen ?? []).some(Boolean) || (ev.locked ?? []).some(Boolean)) st++;
    }
  }
  a.fights++; a.spins += sp; a.stuck += st; a.shares.push(sp ? st / sp : 0);
  a.lostPct.push((hp0 - f.sides.player.hp) / run.player.maxHp);
};
for (const c of CABINET_ORDER as CabinetId[]) simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
const q = (xs: number[], p: number) => { const s = [...xs].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))] ?? 0; };
for (const [k, a] of Object.entries(acc).sort()) {
  if (a.fights < 20) continue;
  const heavy = a.shares.filter((s) => s >= 0.5).length / a.fights;
  console.log(`${k.padEnd(24)} fights ${String(a.fights).padStart(5)}  stuck spins ${((100 * a.stuck) / a.spins).toFixed(0).padStart(3)}%  fights >=50% stuck ${(100 * heavy).toFixed(0).padStart(3)}%  p90 share ${(100 * q(a.shares, 0.9)).toFixed(0)}%  HP lost p50/p90 ${(100 * q(a.lostPct, 0.5)).toFixed(0)}/${(100 * q(a.lostPct, 0.9)).toFixed(0)}%`);
}
