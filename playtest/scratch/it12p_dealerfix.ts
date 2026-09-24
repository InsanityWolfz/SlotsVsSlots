// Dealer tuning candidates on Dealer-entry snapshots (GREEN, commit). npx tsx playtest/scratch/it12p_dealerfix.ts [attempts] [K]
import { CABINET_ORDER, fightFrom, P, snapsAt, Rng, avg, machinePower } from './it12p_lib';
import { TUNE } from '../../src/core/enemies';
import type { RunState } from '../../src/core/run';

const N = Number(process.argv[2] ?? 2500);
const K = Number(process.argv[3] ?? 4);
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapsAt(cab, N, P.commit, 2, 3, 3);
console.log('snapshots:', CABINET_ORDER.map((c) => `${c} ${snaps[c].length} (power ${avg(snaps[c].map(machinePower)).toFixed(0)})`).join(', '));
type V = { name: string; power: number; flat: number; every: number; strip?: Record<string, number> };
const VS: V[] = process.argv[4] === 'strip' ? [
  { name: 'current', power: 5, flat: 170, every: 3 },
  { name: '7x+60 s7/3/3/2', power: 7, flat: 60, every: 3, strip: { seven: 7, sword: 3, shield: 3, card: 2 } },
  { name: '7x+60 s6/3/2/4', power: 7, flat: 60, every: 3, strip: { seven: 6, sword: 3, shield: 2, card: 4 } },
  { name: '6x+40 s6/3/2/4', power: 6, flat: 40, every: 3, strip: { seven: 6, sword: 3, shield: 2, card: 4 } },
  { name: '8x+20 s7/3/3/2 e2', power: 8, flat: 20, every: 2, strip: { seven: 7, sword: 3, shield: 3, card: 2 } },
] : [
  { name: 'current 5x+170 every3', power: 5, flat: 170, every: 3 },
  { name: '6x+110 every3', power: 6, flat: 110, every: 3 },
  { name: '7x+60 every3', power: 7, flat: 60, every: 3 },
  { name: '5x+170 every2', power: 5, flat: 170, every: 2 },
  { name: '6x+90 every2', power: 6, flat: 90, every: 2 },
  { name: '5x+130 every2', power: 5, flat: 130, every: 2 },
];
for (const v of VS) {
  TUNE.dealerPower = v.power; TUNE.dealerFlat = v.flat;
  const res = CABINET_ORDER.map((cab) => {
    let w = 0, n = 0, t = 0;
    for (const run0 of snaps[cab]) {
      const run: RunState = JSON.parse(JSON.stringify(run0));
      const d = run.paths[run.depth][0];
      if (d.ability) d.ability = { ...d.ability, every: v.every };
      if (v.strip) d.strips = [0, 1, 2].map(() => ({ ...v.strip }) as any);
      run.enemies[run.depth] = d;
      const seeds = new Rng(run.seed ^ 0xabc);
      for (let k = 0; k < K; k++) { const f = fightFrom(run, seeds.int(0xffffffff)); n++; t += f.turn; if (f.winner === 'player') w++; }
    }
    return { cab, win: (100 * w) / n, turns: t / n };
  });
  const ws = res.map((r) => r.win);
  console.log(`${v.name.padEnd(24)} ${res.map((r) => `${r.cab} ${r.win.toFixed(1)}`).join('  ')}  avg ${avg(ws).toFixed(1)} spread ${(Math.max(...ws) - Math.min(...ws)).toFixed(1)} turns ${avg(res.map((r) => r.turns)).toFixed(1)}`);
}
