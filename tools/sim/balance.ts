/**
 * THE SIM (2026-10-12): plays runs for every slot machine at every stake in parallel and reports them against the
 * targets (TARGETS below, docs/GAME.md). One worker per core; deterministic per --seed.
 *
 *   npx tsx tools/sim/balance.ts                       500 runs per machine per stake, all stakes
 *   npx tsx tools/sim/balance.ts --runs 2000 --stakes 0,2 --machines knight,tesla
 *   npx tsx tools/sim/balance.ts --detail              + relics, Charms, big choices, encounters, enemies
 *   npx tsx tools/sim/balance.ts --ride                the bot lets it ride after the Dealer (endless loops)
 *   npx tsx tools/sim/balance.ts --set "CABINETS.tesla.hp=300;TUNE.wheelHp=2200"   knob edits (object paths from an
 *                                                       export of cabinets, run, relics, enemies, fight, charms, bot)
 *
 * Writes the raw logs' summary to tools/out/balance.json.
 */
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultConfig, type GameConfig } from '../../src/core/config';
import * as cabinets from '../../src/core/cabinets';
import * as runMod from '../../src/core/run';
import * as relics from '../../src/core/relics';
import * as enemies from '../../src/core/enemies';
import * as fight from '../../src/core/fight';
import * as charms from '../../src/core/charms';
import * as bot from '../../src/sim/bot';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { STAKES } from '../../src/core/stakes';
import { Rng } from '../../src/core/rng';
import { playRun, type RunLog } from '../../src/sim/play';

/** Target run win rates per stake for the sim bot (a decent player, not a perfect one). Every machine should land
 * within TOLERANCE of its stake's target, and each boss's win rate within BOSS_SPREAD across machines. */
export const TARGETS = [60, 50, 36, 28, 20, 14];
export const TOLERANCE = 5;
export const BOSS_SPREAD = 10;

interface Job {
  cabinet: CabinetId;
  stake: number;
  seeds: number[];
  ride: boolean;
  set: string;
}

/** Knob edits: "CABINETS.tesla.hp=300;BASE.base.sword=12" (BASE is the fight config). */
function applyEdits(edits: string, base: GameConfig): void {
  const roots: Record<string, unknown> = { ...cabinets, ...runMod, ...relics, ...enemies, ...fight, ...charms, ...bot, BASE: base };
  for (const e of edits.split(';').filter(Boolean)) {
    const [path, val] = e.split('=');
    const keys = path.trim().split('.');
    let o = roots as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
    if (!(keys[keys.length - 1] in o)) throw new Error(`no knob ${path}`);
    o[keys[keys.length - 1]] = Number(val);
  }
}

if (process.send) {
  // A worker: play the jobs it's sent, one at a time.
  const base = defaultConfig();
  let applied = false;
  process.on('message', (job: Job | null) => {
    if (!job) process.exit(0);
    if (!applied) applyEdits(job.set, base);
    applied = true;
    process.send!(job.seeds.map((s) => playRun(base, s, job.cabinet, job.stake, { ride: job.ride })));
  });
}

async function main(): Promise<void> {
  const arg = (name: string, fallback: string) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? process.argv[i + 1] : fallback;
  };
  const flag = (name: string) => process.argv.includes(`--${name}`);
  const runs = Number(arg('runs', '500'));
  const stakes = arg('stakes', STAKES.map((_, i) => i).join(',')).split(',').map(Number);
  const machines = (arg('machines', 'all') === 'all' ? CABINET_ORDER : arg('machines', '').split(',')) as CabinetId[];
  const seed = Number(arg('seed', '1'));
  const ride = flag('ride');
  const detail = flag('detail');
  const set = arg('set', '');
  applyEdits(set, defaultConfig());

  // Every machine plays the same seeds at a stake (paired), split into chunks across the workers.
  const jobs: Job[] = [];
  const chunk = Math.max(25, Math.ceil(runs / 8));
  for (const stake of stakes) {
    const rng = new Rng((seed * 7919 + stake) >>> 0);
    const seeds = Array.from({ length: runs }, () => rng.int(0xffffffff));
    for (const cabinet of machines) for (let i = 0; i < runs; i += chunk) jobs.push({ cabinet, stake, seeds: seeds.slice(i, i + chunk), ride, set });
  }
  const self = fileURLToPath(import.meta.url);
  const started = Date.now();
  const logs: RunLog[] = [];
  let next = 0;
  const work = () =>
    new Promise<void>((done) => {
      const w = fork(self, [], { execArgv: ['--import', 'tsx'] });
      const go = () => {
        if (next >= jobs.length) {
          w.send(null);
          return done();
        }
        w.send(jobs[next++]);
      };
      w.on('message', (m: RunLog[]) => {
        logs.push(...m);
        go();
      });
      w.on('exit', (code) => code && (console.error(`worker exited ${code}`), process.exit(1)));
      go();
    });
  await Promise.all(Array.from({ length: Math.max(1, cpus().length) }, work));
  if (set) console.log(`knobs: ${set}`);
  console.log(report(logs, machines, stakes, detail));
  console.log(`\n${logs.length} runs in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  mkdirSync('tools/out', { recursive: true });
  writeFileSync('tools/out/balance.json', JSON.stringify(summary(logs, machines, stakes), null, 1));
}

const pct = (a: number, b: number) => (b ? (100 * a) / b : 0);
const f0 = (x: number) => x.toFixed(0).padStart(3);
const pad = (s: string, n: number) => s.padEnd(n);

function bossWin(ls: RunLog[], act: number) {
  const fs = ls.flatMap((l) => l.fights.filter((f) => f.kind === 'boss' && f.act === act && !(l.loops !== undefined && f.act > 3)));
  return { n: fs.length, win: pct(fs.filter((f) => f.won).length, fs.length) };
}

function summary(logs: RunLog[], machines: CabinetId[], stakes: number[]) {
  const out: Record<string, unknown> = {};
  for (const stake of stakes)
    for (const m of machines) {
      const ls = logs.filter((l) => l.stake === stake && l.cabinet === m);
      out[`${m}:${stake}`] = { runs: ls.length, win: pct(ls.filter((l) => l.won).length, ls.length), house: bossWin(ls, 1), wheel: bossWin(ls, 2), dealer: bossWin(ls, 3) };
    }
  return out;
}

function report(logs: RunLog[], machines: CabinetId[], stakes: number[], detail: boolean): string {
  const out: string[] = [];
  // 1. Run win rate per machine per stake, against the target.
  out.push(`RUN WIN % (target ±${TOLERANCE})`);
  out.push(`${pad('', 9)}${stakes.map((s) => pad(`${STAKES[s].name} ${TARGETS[s]}`, 12)).join('')}`);
  for (const m of machines) {
    const cells = stakes.map((s) => {
      const ls = logs.filter((l) => l.stake === s && l.cabinet === m);
      const w = pct(ls.filter((l) => l.won).length, ls.length);
      const off = w - TARGETS[s];
      return pad(`${f0(w)} ${Math.abs(off) <= TOLERANCE ? ' ok' : off > 0 ? `+${off.toFixed(0)}` : off.toFixed(0)}`, 12);
    });
    out.push(`${pad(m, 9)}${cells.join('')}`);
  }
  // 2. Each boss's win rate (of the runs that reached it), per machine; the spread across machines.
  for (const s of stakes) {
    out.push(`\n${STAKES[s].name}: boss win % when reached (spread target ${BOSS_SPREAD}); act clears; deaths by stop`);
    const acts = s >= 2 ? [1, 2, 3] : [1, 2];
    const spread = acts.map((a) => {
      const ws = machines.map((m) => bossWin(logs.filter((l) => l.stake === s && l.cabinet === m), a).win);
      return Math.max(...ws) - Math.min(...ws);
    });
    out.push(`${pad('', 9)}${acts.map((a, i) => pad(`${['HOUSE', 'WHEEL', 'DEALER'][a - 1]} (${spread[i].toFixed(0)})`, 14)).join('')}  deaths: fight / elite / boss per act`);
    for (const m of machines) {
      const ls = logs.filter((l) => l.stake === s && l.cabinet === m);
      const deaths = acts.map((a) => {
        const lost = ls.flatMap((l) => l.fights.filter((f) => f.act === a && !f.won));
        const k = (kind: string) => f0(pct(lost.filter((f) => f.kind === kind).length, ls.length));
        return `${k('fight')}/${k('elite')}/${k('boss')}`;
      });
      out.push(`${pad(m, 9)}${acts.map((a) => pad(`${f0(bossWin(ls, a).win)} (${bossWin(ls, a).n})`, 14)).join('')}  ${deaths.join('  ')}`);
    }
  }
  if (!detail) return out.join('\n');

  // 3. Routes: how often the bot takes the path with the most elites, and how elites go.
  const routes = logs.flatMap((l) => l.routes);
  const most = routes.filter((r) => r.elites === Math.max(...r.options)).length;
  const elites = logs.flatMap((l) => l.fights.filter((f) => f.kind === 'elite'));
  out.push(`\nROUTES: took the most-elite path ${f0(pct(most, routes.length))}% of picks; elites lost ${pct(elites.filter((f) => !f.won).length, elites.length).toFixed(1)}%; HP lost per elite ${f0(100 * avg(elites.map((f) => f.hpIn - f.hpOut)))}% vs fight ${f0(100 * avg(logs.flatMap((l) => l.fights.filter((f) => f.kind === 'fight').map((f) => f.hpIn - f.hpOut))))}%`);

  // 4. Encounters: plays, the choice taken, net chips and HP.
  out.push('\nENCOUNTERS: n, walked away %, net chips, net HP (per visit)');
  const ids = [...new Set(logs.flatMap((l) => l.encounters.map((e) => e.id)))].sort();
  for (const id of ids) {
    const es = logs.flatMap((l) => l.encounters.filter((e) => e.id === id));
    out.push(`  ${pad(id, 8)} ${String(es.length).padStart(6)}  ${f0(pct(es.filter((e) => e.chips === 0 && e.hp === 0).length, es.length))}%  chips ${avg(es.map((e) => e.chips)).toFixed(1).padStart(6)}  hp ${avg(es.map((e) => e.hp)).toFixed(1).padStart(6)}`);
  }

  // 5. Relics, Charms and big choices: win rate when held at the end vs that machine and stake's baseline.
  const lift = (has: (l: RunLog) => boolean) => {
    let n = 0;
    let d = 0;
    for (const s of stakes)
      for (const m of machines) {
        const ls = logs.filter((l) => l.stake === s && l.cabinet === m);
        const w = ls.filter(has);
        if (!w.length) continue;
        const base = pct(ls.filter((l) => l.won).length, ls.length);
        d += (pct(w.filter((l) => l.won).length, w.length) - base) * w.length;
        n += w.length;
      }
    return { n, lift: n ? d / n : 0 };
  };
  const table = (title: string, keys: string[], has: (k: string) => (l: RunLog) => boolean) => {
    const rows = keys.map((k) => ({ k, ...lift(has(k)) })).filter((r) => r.n >= 30).sort((a, b) => b.lift - a.lift);
    out.push(`\n${title} (win-rate lift when held at the end vs baseline, n runs; survivorship inflates everyone)`);
    for (let i = 0; i < rows.length; i += 4) out.push(rows.slice(i, i + 4).map((r) => pad(`  ${r.k} ${r.lift >= 0 ? '+' : ''}${r.lift.toFixed(1)} (${r.n})`, 30)).join(''));
  };
  table('RELICS', [...new Set(logs.flatMap((l) => l.relics))], (k) => (l) => l.relics.includes(k as RunLog['relics'][number]));
  table('CHARMS', [...new Set(logs.flatMap((l) => Object.keys(l.charms)))], (k) => (l) => (l.charms[k] ?? 0) > 0);
  table('BIG CHOICES', [...new Set(logs.flatMap((l) => l.choices))], (k) => (l) => l.choices.includes(k));

  // 6. Enemies: median HP and turns by act and kind; kill rate by archetype.
  out.push('\nENEMIES: median HP / turns by act and kind');
  for (const a of [1, 2, 3])
    out.push(
      `  act ${a}: ${(['fight', 'elite', 'boss'] as const)
        .map((k) => {
          const fs = logs.flatMap((l) => l.fights.filter((f) => f.act === a && f.kind === k));
          return fs.length ? `${k} ${median(fs.map((f) => f.hp))} HP ${median(fs.map((f) => f.turns))} turns` : '';
        })
        .join('   ')}`,
    );
  const arch = [...new Set(logs.flatMap((l) => l.fights.filter((f) => f.kind !== 'boss').map((f) => f.archetype)))].sort();
  out.push(
    `  kill rate: ${arch
      .map((a) => {
        const fs = logs.flatMap((l) => l.fights.filter((f) => f.archetype === a && f.kind !== 'boss'));
        return `${a} ${pct(fs.filter((f) => !f.won).length, fs.length).toFixed(1)}`;
      })
      .join(' | ')}`,
  );
  const loops = logs.filter((l) => l.loops !== undefined).map((l) => l.loops!);
  if (loops.length) out.push(`\nENDLESS: ${loops.length} riders, loops cleared median ${median(loops)}, 90th ${loops.sort((a, b) => a - b)[Math.floor(loops.length * 0.9)]}, 5+ ${pct(loops.filter((x) => x >= 5).length, loops.length).toFixed(1)}%`);
  return out.join('\n');
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a: number[]) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : 0);

if (!process.send) void main();
