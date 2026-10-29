// Bug fuzz: many headless runs on every machine and mode, checking invariants after every fight and every run.
// npx tsx tools/sim/fuzz.ts [runsPerCell]
import { defaultConfig, type Enh, type SymbolId } from '../../src/core/config';
import { CABINET_ORDER } from '../../src/core/cabinets';
import type { RunState } from '../../src/core/run';
import { levelOf } from '../../src/core/meta';
import { emptyProfile, recordMeta, runEntry, runScore, sanitizeProfile } from '../../src/core/profile';
import { playRun } from '../../src/sim/play';

const N = Number(process.argv[2] ?? 60);
const bugs = new Map<string, { n: number; example: string }>();
const bug = (k: string, ex: string) => {
  const b = bugs.get(k) ?? { n: 0, example: ex };
  b.n++;
  bugs.set(k, b);
};

function check(run: RunState, where: string, tag: string): void {
  const p = run.player;
  p.strips.forEach((s, r) => {
    for (const [sym, n] of Object.entries(s)) if ((n ?? 0) < 0 || !Number.isInteger(n)) bug('strip count < 0 or fractional', `${tag} ${where} reel ${r} ${sym}=${n}`);
    const charmed = new Map<string, number>();
    for (const g of p.gilded.filter((g) => g.reel === r)) charmed.set(g.symbol, (charmed.get(g.symbol) ?? 0) + g.n);
    for (const [sym, n] of charmed) if (n > (s[sym as SymbolId] ?? 0)) bug('more charms than cells', `${tag} ${where} reel ${r} ${sym}: ${n} charms, ${s[sym as SymbolId] ?? 0} cells`);
    if (Object.values(s).reduce((a, b) => a + (b ?? 0), 0) < 1) bug('empty reel', `${tag} ${where} reel ${r}`);
  });
  for (const g of p.gilded) if (g.n <= 0) bug('charm entry n<=0', `${tag} ${where}`);
  if (p.hp > p.maxHp) bug('hp > maxHp', `${tag} ${where} ${p.hp}/${p.maxHp}`);
  if (p.chips < 0 || !Number.isFinite(p.chips)) bug('bad chips', `${tag} ${where} ${p.chips}`);
  if (!Number.isFinite(p.hp) || !Number.isFinite(p.maxHp)) bug('bad hp', `${tag} ${where}`);
}

type Mode = { tag: string; cab: (typeof CABINET_ORDER)[number]; stake: number; act3: boolean; setup?: (r: RunState) => void };
const modes: Mode[] = [];
for (const cab of CABINET_ORDER) {
  modes.push({ tag: `${cab} white`, cab, stake: 0, act3: false });
  modes.push({ tag: `${cab} green`, cab, stake: 2, act3: true });
  modes.push({ tag: `${cab} gold`, cab, stake: 5, act3: true });
  // THE SCORE RACE (sandbox).
  modes.push({ tag: `${cab} race`, cab, stake: 2, act3: true, setup: (r) => (r.race = true) });
}

const profile = emptyProfile();
let runs = 0;
let crashes = 0;
let ended = 0;
const lienRuns = { took: 0 };
for (const m of modes)
  for (const policy of ['greedy', 'random'] as const) {
    let fightNo = 0;
    const onFight = (run: RunState) => {
      fightNo++;
      check(run, `fight ${fightNo} (act ${run.act} depth ${run.depth}${run.endless ? ` loop ${run.endless.loop}` : ''})`, `${m.tag}/${policy}`);
    };
    const onEnd = (run: RunState) => {
      ended++;
      check(run, 'end', `${m.tag}/${policy}`);
      if (run.records.some((r) => r.enemy.endsWith('REPO MAN') && r.won)) lienRuns.took++;
      try {
        const e = runEntry(run, Date.now());
        const before = runScore(e);
        if (!Number.isFinite(before) || before < 0) bug('bad score', `${m.tag} ${before}`);
        profile.runs.push(e);
        if (profile.runs.length > 60) profile.runs.shift();
        recordMeta(profile, e, 44);
        // The save survives a round trip.
        const back = sanitizeProfile(JSON.parse(JSON.stringify(profile)));
        if (back.runs.length !== profile.runs.length) bug('save round trip drops runs', `${m.tag} ${profile.runs.length} -> ${back.runs.length}`);
        const last = back.runs[back.runs.length - 1];
        if (runScore(last) !== before) bug('save round trip changes the score', `${m.tag}: ${before} -> ${runScore(last)} ${JSON.stringify(e).slice(0, 300)}`);
        if (back.xp !== profile.xp || Object.keys(back.achievements).length !== Object.keys(profile.achievements).length) bug('save round trip changes meta', m.tag);
      } catch (err) {
        bug('meta threw', `${m.tag}: ${(err as Error).stack?.split('\n').slice(0, 3).join(' | ')}`);
      }
    };
    try {
      const base = defaultConfig();
      for (let i = 0; i < N; i++) playRun(base, 777 + runs + i * 7919, m.cab, m.stake, { policy, act3: m.act3, ride: true, setup: m.setup, onFight, onEnd });
    } catch (err) {
      crashes++;
      bug('sim crashed', `${m.tag}/${policy}: ${(err as Error).stack?.split('\n').slice(0, 4).join(' | ')}`);
    }
    runs += N;
  }
console.log(`runs ${runs} (ended ${ended}), crashes ${crashes}, modes ${modes.length}; REPO MAN beaten in ${lienRuns.took} runs`);
console.log(`profile after: level ${levelOf(profile.xp).level}, ${Object.keys(profile.achievements).length} achievements, stats ${JSON.stringify(profile.stats)}`);
if (!bugs.size) console.log('NO INVARIANT BREAKS');
for (const [k, v] of bugs) console.log(`BUG x${v.n}: ${k}\n   e.g. ${v.example}`);
// Unused-type guard for the import (Enh kept for future charm checks).
void (null as unknown as Enh);
