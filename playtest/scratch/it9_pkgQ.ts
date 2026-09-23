// Package Q candidates on identical B1 snapshots (monkeypatched):
//   mirrorPlain  - the Mirror copies your gilds at plain tier (no TIER II on the copy)
//   elite13      - act 2 elites x1.3 HP instead of x1.5 (fork-time rescale)
//   elite13c     - elite13 + elites pay +6 more chips (12)
//   counters     - GROUNDER: a grounded bolt on the payline earths its energy, +1 rod, sword 5;
//                  COUNTERFEITER: fakes the whole gild type it hits (2 turns), sword 6, HP x1.1
//   Q            - all of the above
//   npx tsx playtest/scratch/it9_pkgQ.ts [N] [variants,...]
import { Fight } from '../../src/core/fight';
import { ARCHETYPES, TUNE } from '../../src/core/enemies';
import { avg, CABINET_ORDER, cloneRun, FORKS, pairedDiff, pct, playRun, Rng, snapshots, type Policy, type RunRec } from './it9_lib';

const N = Number(process.argv[2] ?? 1000);
const ONLY = process.argv[3]?.split(',');
const FP: any = Fight.prototype;
const og = { ground: FP.plantGround, fake: FP.fakeGilds, gain: FP.gainEnergy, death: FP.checkDeath };
const G = ARCHETYPES.find((a) => a.id === 'grounder')!, C = ARCHETYPES.find((a) => a.id === 'counterfeiter')!;
const orig = { g: structuredClone(G), c: structuredClone(C) };
const flags = { mirrorPlain: false, eliteMul: 1.5, eliteChips: 0, crackReflect: false };
FP.checkDeath = function (c: any, ev: any) {
  const was = this.shattered;
  const r = og.death.call(this, c, ev);
  if (flags.crackReflect && !was && this.shattered) this.sides.enemy.charge = this.sides.enemy.ability.every - 1;
  return r;
};
const FLAT0 = TUNE.mirrorFlat;
function setCounters(on: boolean) {
  FP.plantGround = og.ground; FP.fakeGilds = og.fake; FP.gainEnergy = og.gain;
  Object.assign(G, structuredClone(orig.g)); Object.assign(C, structuredClone(orig.c));
  if (!on) return;
  G.strip = { sword: 5, shield: 5, ground: 3 };
  C.strip = { sword: 6, shield: 3, fake: 4 }; C.hpMul = 1.1;
  FP.plantGround = function (me: any, foe: any, n: number, r: any, ev: any) { return og.ground.call(this, me, foe, n + 1, r, ev); };
  FP.gainEnergy = function (me: any, amount: number, reels: number[], ev: any) {
    const g = reels.filter((r) => me.reels[r].cells[me.reels[r].stop]?.grounded).length;
    if (g && reels.length) amount = Math.max(0, amount - Math.ceil((amount * g) / reels.length));
    return og.gain.call(this, me, amount, reels, ev);
  };
  FP.fakeGilds = function (me: any, foe: any, n: number, t: number, r: any, ev: any) {
    const res = og.fake.call(this, me, foe, n, 2, r, ev);
    const last = ev.at(-1);
    if (last?.type === 'fake') {
      const kinds = new Set(last.cells.map((c: any) => foe.reels[c.reel].cells[c.index].enh));
      foe.reels.forEach((reel: any, ri: number) => reel.cells.forEach((c: any, i: number) => { if (c.enh && kinds.has(c.enh) && !c.faked) { c.faked = 2; last.cells.push({ reel: ri, index: i }); } }));
    }
    return res;
  };
}
const hooks = {
  preFight: (run: any, fight: Fight) => {
    if (flags.mirrorPlain && run.act === 2 && run.enemies[run.depth]?.boss === 'mirror')
      for (const reel of (fight as any).sides.enemy.reels) for (const c of reel.cells) delete c.tier;
  },
};
// wrap forks: rescale act 2 elites once per fork, pre-pay extra elite chips when the elite is taken
for (const k of Object.keys(FORKS)) {
  const base = FORKS[k];
  FORKS[k] = (run: any, rng: any) => {
    const opts = run.paths[run.depth];
    if (run.act === 2) for (const e of opts) if (e.elite && !e._rescaled) { e.hp = Math.round((e.hp / 1.5) * flags.eliteMul); e._rescaled = true; }
    const i = base(run, rng);
    if (run.act === 2 && opts[i]?.elite && flags.eliteChips) run.player.chips += flags.eliteChips;
    return i;
  };
}
const VARIANTS: Record<string, () => void> = {
  base: () => {},
  mirrorPlain: () => { flags.mirrorPlain = true; },
  elite13: () => { flags.eliteMul = 1.3; },
  elite13c: () => { flags.eliteMul = 1.3; flags.eliteChips = 6; },
  counters: () => setCounters(true),
  Q2_45: () => { flags.mirrorPlain = true; flags.eliteMul = 1.3; flags.crackReflect = true; setCounters(true); },
  Q2_35: () => { VARIANTS.Q2_45(); TUNE.mirrorFlat = 35; },
  Q2_55: () => { VARIANTS.Q2_45(); TUNE.mirrorFlat = 55; },
  Q3_55: () => { flags.mirrorPlain = true; flags.eliteMul = 1.3; setCounters(true); TUNE.mirrorFlat = 55; },
  Q3_65: () => { flags.mirrorPlain = true; flags.eliteMul = 1.3; setCounters(true); TUNE.mirrorFlat = 65; },
  Q: () => { flags.mirrorPlain = true; flags.eliteMul = 1.3; flags.eliteChips = 6; setCounters(true); },
};
const P = (draft: string, fork = 'greedy', shop = 'commit'): Policy => ({ draft, fork, shop, legend: 'value', hooks });
const POLS: Record<string, Policy> = { commit: P('commit'), notier: P('notier', 'greedy', 'notier'), hpfirst: P('hpfirst'), randomDraft: P('random'), elite2: P('commit', 'elite2'), safe2: P('commit', 'safe2'), dodge: P('commit', 'dodge'), face: P('commit', 'face') };
const snaps: Record<string, any[]> = {};
for (const c of CABINET_ORDER) snaps[c] = snapshots(c, N, 777);
console.log(`N ${N}; snapshots ${CABINET_ORDER.map((c) => snaps[c].length).join('/')}`);
for (const [vk, apply] of Object.entries(VARIANTS).filter(([k]) => !ONLY || ONLY.includes(k))) {
  flags.mirrorPlain = false; flags.eliteMul = 1.5; flags.eliteChips = 0; flags.crackReflect = false; TUNE.mirrorFlat = FLAT0; setCounters(false); apply();
  const res: Record<string, Record<string, RunRec[]>> = {};
  for (const c of CABINET_ORDER) { res[c] = {}; for (const [k, pol] of Object.entries(POLS)) res[c][k] = snaps[c].map((s, i) => playRun(0, s.cabinet, pol, new Rng(20000 + i), cloneRun(s))); }
  const clear = (c: string, k: string) => (100 * res[c][k].filter((r) => r.won).length) / res[c][k].length;
  const W = (c: string, k: string) => res[c][k].map((r) => r.won);
  const d = (a: string, b: string) => { const all = pairedDiff(CABINET_ORDER.flatMap((c) => W(c, a)), CABINET_ORDER.flatMap((c) => W(c, b))); return `${all[0] >= 0 ? '+' : ''}${all[0].toFixed(1)}±${all[1].toFixed(1)} [${CABINET_ORDER.map((c) => pairedDiff(W(c, a), W(c, b))[0].toFixed(1)).join(' ')}]`; };
  const cc = CABINET_ORDER.map((c) => clear(c, 'commit'));
  const ms = CABINET_ORDER.map((c) => res[c].commit.flatMap((r) => r.fights.filter((f) => f.boss && f.act === 2)));
  const mline = ms.map((m, i) => `${CABINET_ORDER[i]} ${pct(m.filter((f) => f.won).length, m.length)}/${pct(m.filter((f) => f.reflects.length).length, m.length)}/${pct(m.filter((f) => f.won && !f.reflects.length).length, m.filter((f) => f.won).length)}`).join(' ');
  const all = ms.flat();
  console.log(`\n== ${vk}: commit ${avg(cc).toFixed(1)} (${cc.map((x) => x.toFixed(1)).join('/')}) spread ${(Math.max(...cc) - Math.min(...cc)).toFixed(1)}`);
  console.log(`  commit-notier ${d('commit', 'notier')}  commit-hpfirst ${d('commit', 'hpfirst')}  commit-random ${d('commit', 'randomDraft')}`);
  console.log(`  elite2-safe2 ${d('elite2', 'safe2')}  dodge-face ${d('dodge', 'face')}`);
  console.log(`  Mirror win/refl>=1/wins w/o refl: ALL ${pct(all.filter((f) => f.won).length, all.length)}/${pct(all.filter((f) => f.reflects.length).length, all.length)}/${pct(all.filter((f) => f.won && !f.reflects.length).length, all.filter((f) => f.won).length)}  ${mline}`);
}
