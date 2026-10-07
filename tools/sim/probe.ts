// Quick knob probe: WHITE + GREEN for one machine with live edits. npx tsx tools/sim/probe.ts <machine> [N] "path=value;..."
// Paths start at a module export: CABINETS.tesla.meter.cost=60; BOSS_MUL.tesla.house=0.5 (numbers in game units).
import { defaultConfig } from '../../src/core/config';
import * as cab from '../../src/core/cabinets';
import * as run from '../../src/core/run';
import * as relics from '../../src/core/relics';
import * as enemies from '../../src/core/enemies';
import * as fight from '../../src/core/fight';
import type { CabinetId } from '../../src/core/cabinets';
import { simulateRuns } from '../../src/sim/simulateRun';

const [machine, nArg, edits = ''] = process.argv.slice(2);
const N = Number(nArg ?? 200);
const cfg = defaultConfig();
const roots: Record<string, unknown> = { ...cab, ...run, ...relics, ...enemies, ...fight, BASE: cfg.base };
for (const e of edits.split(';').filter(Boolean)) {
  const [path, val] = e.split('=');
  const keys = path.trim().split('.');
  let o = roots as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys[keys.length - 1]] = Number(val);
}
// "Only X" rows: RELICS=riposte,tower starts every run holding those relics.
const give = (process.env.RELICS ?? '').split(',').filter(Boolean);
const setup = give.length ? (r: run.RunState) => { for (const id of give) if (!r.player.relics.includes(id as never)) r.player.relics.push(id as never); } : undefined;
const w = simulateRuns(cfg, N, 'greedy', 4242, machine as CabinetId, 0, false, setup);
const g = simulateRuns(cfg, N, 'greedy', 4242, machine as CabinetId, 2, true, setup);
if (give.length) console.log(`only ${give.join('+')}`);
const f = (x: number) => x.toFixed(1).padStart(5);
console.log(`${machine} N${N} [${edits}] WHITE ${f(w.winPct)} House ${f(w.bossWinPct)} Mirror ${f(w.mirrorWinPct)} f4die ${f(w.deathsAtDepth[3])} | GREEN ${f(g.winPct)} Dealer ${f(g.dealerWinPct)} | jack ${f(w.jackpotPct)} hpH ${f(w.hpIntoHousePct)} t1 ${w.turnsByAct[0].toFixed(1)} chips/f ${w.chipsPerFight.toFixed(1)}`);
