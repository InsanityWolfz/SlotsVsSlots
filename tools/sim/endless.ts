/**
 * ENDLESS by machine, stake and loop (2026-11-13): every winner rides; per loop the riders who reached and cleared it,
 * THE OWNER's meetings and the top rung of his ladder each reached. One JSON line per call (same seeds as balance.ts).
 *
 *   npx tsx tools/sim/endless.ts knight 2 live 4000          machine, stake, variant, runs
 *   npx tsx tools/sim/endless.ts knight 2 off 4000           LOOP_GROWTH off (VETERAN, OVERLOAD, WARM-UP); `half` halves it
 *   npx tsx tools/sim/endless.ts knight 2 veteran=0.3 4000   one knob
 */
import { defaultConfig } from '../../src/core/config';
import { LOOP_GROWTH, OWNER_LADDER } from '../../src/core/enemies';
import { Rng } from '../../src/core/rng';
import { playRun } from '../../src/sim/play';
import type { CabinetId } from '../../src/core/cabinets';
const [machine, stakeS, variant, runsS] = process.argv.slice(2);
const stake = Number(stakeS), runs = Number(runsS);
for (const kv of variant.includes('=') ? variant.split(',') : []) { const [k, v] = kv.split('='); (LOOP_GROWTH as Record<string, number>)[k] = Number(v); }
if (variant === 'off') { LOOP_GROWTH.veteran = 0; LOOP_GROWTH.overload = 0; LOOP_GROWTH.warmUp = 0; }
if (variant === 'half') { LOOP_GROWTH.veteran = 0.5; LOOP_GROWTH.overload = 0.5; LOOP_GROWTH.warmUp = 1.5; }
const rng = new Rng((1 * 7919 + stake) >>> 0);
const seeds = Array.from({ length: runs }, () => rng.int(0xffffffff));
const base = defaultConfig();
const o = { machine, stake, variant, runs, won: 0, reach: [0, 0, 0, 0, 0, 0], clear: [0, 0, 0, 0, 0, 0], ownerMet: 0, rungs: [0, 0, 0, 0, 0], diedBoss: [0, 0, 0, 0, 0, 0] };
for (const s of seeds) {
  let met = false, loop = 0, taken = 0, turbo = false, lastBoss = false;
  const log = playRun(base, s, machine as CabinetId, stake, {
    ride: true,
    onEvents: (_e, _run, fight) => { if (fight.cfg.enemy.owner) met = true; lastBoss = !!fight.isBoss || !!fight.isWheel || !!fight.isDealer || !!fight.cfg.enemy.owner; },
    onEnd: (run) => { loop = run.endless?.loop ?? 0; taken = run.endless?.ownerTaken ?? 0; turbo = !!run.endless?.turbo; },
  });
  if (!log.won) continue;
  o.won++;
  for (let k = 1; k <= 5; k++) { if (loop >= k) o.reach[k]++; if (loop > k || (k === 5 && turbo)) o.clear[k]++; }
  if (!turbo && lastBoss && loop >= 1 && loop <= 5) o.diedBoss[loop]++;
  if (met) { o.ownerMet++; o.rungs[turbo ? 4 : Math.min(4, Math.floor(taken * OWNER_LADDER.rungs + 1e-9))]++; }
}
console.log(JSON.stringify(o));
