// Chips at the Mirror: how many, what the chip shield is worth (vs I7's no-shield), win by chip band.
//   npx tsx playtest/scratch/it8_chips.ts [N]
import type { RunState } from '../../src/core/run';
import type { Fight } from '../../src/core/fight';
import { CHIPS } from '../../src/core/run';
import { avg, CABINET_ORDER, cloneRun, playRun, Rng, snapshots, type Policy } from './it8_lib';
const N = Number(process.argv[2] ?? 800);
const pol: Policy = { draft: 'commit', fork: 'greedy', shop: 'commit', legend: 'value' };
const snaps: Record<string, RunState[]> = {};
for (const cab of CABINET_ORDER) snaps[cab] = snapshots(cab, N);
for (const mode of ['real', 'noMirrorShield']) {
  const rows: string[] = []; const all: { chips: number; won: boolean }[] = [];
  for (const cab of CABINET_ORDER) {
    const recs: { chips: number; won: boolean }[] = [];
    snaps[cab].forEach((s, i) => {
      let chips = -1;
      const hooks = { preFight: (run: RunState, f: Fight) => { if (f.isMirror) { chips = run.player.chips; if (mode !== 'real') (f as any).cfg.player.stackShield = 0; } } };
      const r = playRun(0, s.cabinet, { ...pol, hooks }, new Rng(9000 + i), cloneRun(s));
      if (chips >= 0) recs.push({ chips, won: r.won });
    });
    all.push(...recs);
    rows.push(`${cab} chips@Mirror ${avg(recs.map((x) => x.chips)).toFixed(1)} (sh/turn ${avg(recs.map((x) => Math.floor(x.chips / CHIPS.stackPer))).toFixed(1)}) win ${(100 * recs.filter((x) => x.won).length / recs.length).toFixed(1)}`);
  }
  console.log(`== ${mode}\n${rows.join('\n')}`);
  const band = (lo: number, hi: number) => { const x = all.filter((r) => r.chips >= lo && r.chips < hi); return `${lo}-${hi}: n${x.length} win ${(100 * x.filter((r) => r.won).length / Math.max(1, x.length)).toFixed(0)}%`; };
  console.log(`  bands ${[band(0, 8), band(8, 16), band(16, 24), band(24, 32), band(32, 48), band(48, 999)].join(' | ')}`);
}
