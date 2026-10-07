// Expert playtest 4 (throwaway): endless-mode detail. npx tsx tools/balance/expert4_endless.ts [N] [edge|none|natural]
// Per loop fight: turns, LAST CALL fired, 80-turn cap deaths, where riders die, biggest numbers; and the cost of each HOUSE EDGE.
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { Fight } from '../../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../../src/core/run';
const N = Number(process.argv[2] ?? 300);
const mode = process.argv[3] ?? 'natural';
const q = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : 0; };
type Row = { turns: number[]; lost: number; lastCall: number; capped: number; n: number; maxEnemyHp: number; maxHit: number; hpLost: number[] };
const rows: Record<string, Row> = {};
const deathsAt: Record<string, number> = {};
const edgesTaken: Record<string, number> = {};
let riders = 0;
const loopsCleared: number[] = [];
SIM_BIAS.ride = true;
SIM_BIAS.onEnd = (run) => {
  if (!run.endless) return;
  riders++;
  loopsCleared.push(run.endless.loop - 1);
  for (const e of run.endless.edges) edgesTaken[e] = (edgesTaken[e] ?? 0) + 1;
};
SIM_BIAS.onFight = (run: RunState) => {
  if (!run.endless) return;
  if (mode !== 'natural') run.endless.edges = mode === 'none' ? [] : ([mode] as typeof run.endless.edges);
  const cfg = fightConfig(run, defaultConfig());
  const e = run.enemies[run.depth];
  const key = `L${Math.min(run.endless.loop, 5)} ${e.boss ? 'boss:' + e.boss : 'regular'}`;
  const r = (rows[key] ??= { turns: [], lost: 0, lastCall: 0, capped: 0, n: 0, maxEnemyHp: 0, maxHit: 0, hpLost: [] });
  const f = new Fight(cfg, (run.seed ^ 0x999 ^ run.depth) >>> 0);
  let lc = false;
  const hp0 = f.sides.player.hp;
  while (!f.over && f.turn < 2000) {
    const res = f.step();
    for (const ev of res.events) {
      if (ev.type === 'lastCall') lc = true;
      if (ev.type === 'attack' && (ev as { from: string }).from === 'player') r.maxHit = Math.max(r.maxHit, (ev as { amount: number }).amount);
    }
  }
  r.n++;
  r.turns.push(f.turn);
  r.maxEnemyHp = Math.max(r.maxEnemyHp, cfg.enemy.hp);
  r.hpLost.push(Math.max(0, hp0 - f.sides.player.hp) / run.player.maxHp);
  if (lc) r.lastCall++;
  if (f.winner === 'enemy') {
    r.lost++;
    if (f.turn >= 80) r.capped++;
    deathsAt[key] = (deathsAt[key] ?? 0) + 1;
  }
};
for (const c of CABINET_ORDER as CabinetId[]) simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 2, true);
console.log(`mode ${mode}  riders ${riders}  loops cleared p50 ${q(loopsCleared, 0.5)} mean ${(loopsCleared.reduce((a, b) => a + b, 0) / Math.max(1, loopsCleared.length)).toFixed(2)} p90 ${q(loopsCleared, 0.9)}`);
for (const [k, r] of Object.entries(rows).sort())
  console.log(`${k.padEnd(18)} n ${String(r.n).padStart(4)}  lost ${((100 * r.lost) / r.n).toFixed(1).padStart(5)}%  turns p50 ${q(r.turns, 0.5)} p90 ${q(r.turns, 0.9)}  lastCall ${((100 * r.lastCall) / r.n).toFixed(1)}%  capped ${r.capped}  HP lost p50 ${(100 * q(r.hpLost, 0.5)).toFixed(0)}% p90 ${(100 * q(r.hpLost, 0.9)).toFixed(0)}%  maxEnemyHp ${r.maxEnemyHp.toExponential(2)}  maxHit ${r.maxHit.toExponential(2)}`);
console.log('edges taken', JSON.stringify(edgesTaken));
