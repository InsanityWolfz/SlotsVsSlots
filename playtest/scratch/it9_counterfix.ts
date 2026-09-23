// Counter-enemy candidate fixes (monkeypatched), same controlled B3 fight as it9_counter.
//   npx tsx playtest/scratch/it9_counterfix.ts [N]
import { Fight } from '../../src/core/fight';
import { fightConfig } from '../../src/core/run';
import { ARCHETYPES, actsOf, makeEnemy } from '../../src/core/enemies';
import { BASE, CABINET_ORDER, counterOf, pct, avg, Rng, snapshots } from './it9_lib';

const N = Number(process.argv[2] ?? 500);
const FP: any = Fight.prototype;
const og = { ground: FP.plantGround, fake: FP.fakeGilds, gain: FP.gainEnergy };
const grounder = ARCHETYPES.find((a) => a.id === 'grounder')!, cf = ARCHETYPES.find((a) => a.id === 'counterfeiter')!;
const orig = { g: JSON.parse(JSON.stringify(grounder)), c: JSON.parse(JSON.stringify(cf)) };
const VARIANTS: Record<string, () => void> = {
  current: () => {},
  x3count: () => {
    FP.plantGround = function (me: any, foe: any, n: number, r: any, ev: any) { return og.ground.call(this, me, foe, n * 3, r, ev); };
    FP.fakeGilds = function (me: any, foe: any, n: number, t: number, r: any, ev: any) { return og.fake.call(this, me, foe, n * 3, 3, r, ev); };
  },
  x3_hp115: () => { VARIANTS.x3count(); grounder.hpMul = 1.15; cf.hpMul = 1.1; },
  x3_hp115_sw: () => { VARIANTS.x3_hp115(); grounder.strip = { sword: 5, shield: 5, ground: 3 }; cf.strip = { sword: 6, shield: 3, fake: 4 }; },
  // grounded bolts on the payline give no energy (the rod earths the charge)
  earthBolts: () => {
    VARIANTS.x3_hp115_sw();
    FP.gainEnergy = function (me: any, amount: number, reels: number[], ev: any) {
      const g = reels.filter((r) => me.reels[r].cells[me.reels[r].stop]?.grounded).length;
      if (g && reels.length) amount = Math.max(0, amount - Math.ceil((amount * g) / reels.length));
      return og.gain.call(this, me, amount, reels, ev);
    };
  },
  earthLite: () => {
    FP.gainEnergy = function (me: any, amount: number, reels: number[], ev: any) {
      const g = reels.filter((r) => me.reels[r].cells[me.reels[r].stop]?.grounded).length;
      if (g && reels.length) amount = Math.max(0, amount - Math.ceil((amount * g) / reels.length));
      return og.gain.call(this, me, amount, reels, ev);
    };
  },
  earthLite_sw: () => { VARIANTS.earthLite(); grounder.strip = { sword: 5, shield: 5, ground: 3 }; },
  earthX2_sw: () => { VARIANTS.earthLite_sw(); FP.plantGround = function (me: any, foe: any, n: number, r: any, ev: any) { return og.ground.call(this, me, foe, n * 2, r, ev); }; },
  earthP1_sw: () => { VARIANTS.earthLite_sw(); FP.plantGround = function (me: any, foe: any, n: number, r: any, ev: any) { return og.ground.call(this, me, foe, n + 1, r, ev); }; },
  earthBolts_x1: () => { VARIANTS.earthBolts(); FP.plantGround = function (me: any, foe: any, n: number, r: any, ev: any) { return og.ground.call(this, me, foe, n * 2, r, ev); }; },
  // counterfeiter fakes every cell of the gild it hits (the whole gild type), 2 turns.
  typewide_hp115_sw: () => {
    VARIANTS.x3_hp115_sw();
    FP.fakeGilds = function (me: any, foe: any, n: number, t: number, r: any, ev: any) {
      const res = og.fake.call(this, me, foe, n, 2, r, ev);
      const last = ev.at(-1);
      if (last?.type === 'fake') {
        const kinds = new Set(last.cells.map((c: any) => foe.reels[c.reel].cells[c.index].enh));
        foe.reels.forEach((reel: any, ri: number) => reel.cells.forEach((c: any, i: number) => { if (c.enh && kinds.has(c.enh) && !c.faked) { c.faked = 2; last.cells.push({ reel: ri, index: i }); } }));
      }
      return res;
    };
  },
};
const reset = () => { FP.plantGround = og.ground; FP.fakeGilds = og.fake; FP.gainEnergy = og.gain; Object.assign(grounder, JSON.parse(JSON.stringify(orig.g))); Object.assign(cf, JSON.parse(JSON.stringify(orig.c))); };
const snaps: Record<string, any[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N, 777);
const others = ARCHETYPES.filter((a) => actsOf(a).includes(2) && a.id !== 'grounder' && a.id !== 'counterfeiter');
function fightAll(a: any) {
  const out: { cab: string; build: string; won: boolean; lost: number }[] = [];
  for (const cab of CABINET_ORDER) snaps[cab].forEach((s, i) => {
    const run = JSON.parse(JSON.stringify(s));
    const e = makeEnemy(a, 2, new Rng(9000 + i), false, 2);
    run.depth = 2; run.enemies[2] = e; run.chosen[2] = true;
    const f = new Fight(fightConfig(run, BASE), 5000 + i);
    while (!f.over && f.turn < 2000) f.step();
    out.push({ cab, build: counterOf(run) ?? 'none', won: f.winner === 'player', lost: (run.player.hp - Math.max(0, f.sides.player.hp)) / run.player.maxHp });
  });
  return out;
}
const line = (xs: any[]) => `${(100 * avg(xs.map((r) => r.lost))).toFixed(1)}%/${pct(xs.filter((r) => !r.won).length, xs.length)}`;
const ref = others.flatMap((a) => fightAll(a));
console.log(`reference (other act 2 regulars, B3): all ${line(ref)}  ` + CABINET_ORDER.map((c) => `${c} ${line(ref.filter((r) => r.cab === c))}`).join('  '));
for (const [k, apply] of Object.entries(VARIANTS).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) {
  reset(); apply();
  for (const a of [grounder, cf]) {
    const x = fightAll(a);
    console.log(`${k.padEnd(18)} ${a.id.padEnd(14)} all ${line(x)}  vsGroundBuild ${line(x.filter((r) => r.build === 'grounder'))}  vsGildBuild ${line(x.filter((r) => r.build === 'counterfeiter'))}  ` + CABINET_ORDER.map((c) => `${c} ${line(x.filter((r) => r.cab === c))}`).join('  '));
  }
}
