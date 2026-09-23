// I8 act 2 gift values from identical B1 snapshots (commit afterwards). "taxed" = real Mirror; "untaxed" =
// the Mirror doesn't count the gift's own power (only what you add after).   npx tsx playtest/scratch/it8_gild.ts [N]
import type { Enh } from '../../src/core/config';
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { TUNE } from '../../src/core/enemies';
import { applyOption, GILD_SYMBOLS } from '../../src/core/run';
import { avg, buildOf, cloneRun, CABINET_ORDER, machinePower, playRun, Rng, snapshots, type Policy } from './it8_lib';

const N = Number(process.argv[2] ?? 600);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const ENHS: Enh[] = ['gold', 'keen', 'charged', 'spiked', 'vamp', 'lucky', 'blaze'];
function gild(run: RunState, enh: Enh, reels: number[]) {
  const p = run.player;
  for (const reel of reels) {
    if (p.gilded.some((g) => g.enh === enh && g.reel === reel)) continue;
    const sym = GILD_SYMBOLS[enh].find((s) => (p.strips[reel][s] ?? 0) > 0 && !p.gilded.some((g) => g.reel === reel && g.symbol === s));
    if (sym) applyOption(run, { kind: 'gild', enh, symbol: sym, reel }, false);
  }
}
const GIFTS: Record<string, (r: RunState) => void> = {
  none: () => {},
  '+8maxHP': (r) => { r.player.maxHp += 8; r.player.hp += 8; },
  'tierII build gild': (r) => { const b = buildOf(r); r.player.gilded.filter((x) => x.enh === b).forEach((x) => (x.tier = 2)); },
  'tierII all gilds': (r) => r.player.gilded.forEach((x) => (x.tier = 2)),
  ...Object.fromEntries(ENHS.map((e) => [`${e} SET`, (r: RunState) => gild(r, e, [0, 1, 2])])),
  ...Object.fromEntries(ENHS.map((e) => [`${e} SET+II`, (r: RunState) => { gild(r, e, [0, 1, 2]); r.player.gilded.filter((x) => x.enh === e).forEach((x) => (x.tier = 2)); }])),
};
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N, 555);
const noneV: Record<string, number[]> = {};
console.log(`gift              taxed (Δ)          untaxed (Δ)         taxed Δ by cabinet ${CABINET_ORDER.join('/')}`);
for (const [gn, gift] of Object.entries(GIFTS)) {
  const out: Record<string, number[]> = { taxed: [], frozen: [] };
  for (const mode of ['taxed', 'frozen']) {
    for (const cab of CABINET_ORDER) {
      let w = 0;
      snaps[cab].forEach((s, i) => {
        const r0 = cloneRun(s);
        gift(r0);
        const giftPow = machinePower(r0) - machinePower(s);
        const hooks = mode === 'frozen' ? { preFight: (run: RunState, fight: Fight) => { if (fight.isMirror) fight.sides.enemy.hp = fight.sides.enemy.maxHp = Math.round(TUNE.mirrorPower * (machinePower(run) - giftPow)) + TUNE.mirrorFlat; } } : undefined;
        if (playRun(0, r0.cabinet, { ...pol, hooks }, new Rng(1000 + i), r0).won) w++;
      });
      out[mode].push((100 * w) / snaps[cab].length);
    }
  }
  if (gn === 'none') { noneV.taxed = out.taxed; noneV.frozen = out.frozen; }
  const d = (m: string) => avg(out[m].map((v, i) => v - noneV[m][i]));
  const s = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`;
  console.log(`${gn.padEnd(18)} ${avg(out.taxed).toFixed(1)} (${s(d('taxed'))})`.padEnd(38) + `${avg(out.frozen).toFixed(1)} (${s(d('frozen'))})`.padEnd(20) + out.taxed.map((v, i) => s(v - noneV.taxed[i])).join(' / '));
}
