// Expert playtest 2 (throwaway): where boss damage to the player comes from, and the biggest single enemy turn. npx tsx tools/balance/expert2_bosses.ts [N]
import { defaultConfig } from '../../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../../src/core/cabinets';
import { actLength } from '../../../src/core/enemies';
import { Fight } from '../../../src/core/fight';
import { Rng } from '../../../src/core/rng';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';
import { fightConfig, type RunState } from '../../../src/core/run';

const N = Number(process.argv[2] ?? 300);
const base = defaultConfig();
type Acc = { fights: number; lost: number; src: Record<string, number>; bigTurn: number[]; deathBig: number; deaths: number; turns: number[]; dmgTaken: number[]; mirrorDoubleTurns: number };
const acc: Record<string, Acc> = {};
const get = (k: string) => (acc[k] ??= { fights: 0, lost: 0, src: {}, bigTurn: [], deathBig: 0, deaths: 0, turns: [], dmgTaken: [], mirrorDoubleTurns: 0 });
SIM_BIAS.onFight = (run: RunState) => {
  if (run.depth < actLength(run.act)) return;
  const key = run.act === 1 ? 'House' : run.act === 2 ? 'Mirror' : 'Dealer';
  const a = get(key);
  // Replay a copy of the boss fight to inspect it (a different seed from the sim's own; same distribution).
  const f = new Fight(fightConfig(run, base), (run.seed ^ 0xabcdef) >>> 0);
  const max = run.player.maxHp;
  let big = 0; let taken = 0;
  while (!f.over && f.turn < 2000) {
    const { side, events } = f.step();
    let turnDmg = 0; let kinds = 0;
    for (const e of events) {
      const ev = e as { type: string; hpDamage?: number; to?: string; from?: string; side?: string; note?: string };
      if (ev.hpDamage === undefined || ev.hpDamage <= 0) continue;
      const toPlayer = ev.type === 'markedHit' || ev.type === 'blast' ? ev.side === 'player' : ev.from === 'enemy' || ev.to === 'player';
      if (!toPlayer) continue;
      const k = ev.type === 'attack' ? `attack${ev.note ? ':' + ev.note : ''}` : ev.type;
      a.src[k] = (a.src[k] ?? 0) + ev.hpDamage;
      turnDmg += ev.hpDamage; taken += ev.hpDamage; kinds++;
    }
    if (side === 'enemy' && key === 'Mirror' && kinds >= 2) a.mirrorDoubleTurns++;
    big = Math.max(big, turnDmg / max);
  }
  a.fights++; a.bigTurn.push(big); a.turns.push(f.turn); a.dmgTaken.push(taken / max);
  if (f.winner !== 'player') { a.deaths++; if (big >= 0.6) a.deathBig++; }
};
for (const cab of CABINET_ORDER as CabinetId[]) simulateRuns(base, N, 'greedy', 4242, cab, 2, true);
const q = (xs: number[], p: number) => { const s = [...xs].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
for (const [k, a] of Object.entries(acc)) {
  const tot = Object.values(a.src).reduce((x, y) => x + y, 0);
  console.log(`\n${k}: fights ${a.fights}, player lost ${((100 * a.deaths) / a.fights).toFixed(0)}%, turns p50 ${q(a.turns, 0.5)} p90 ${q(a.turns, 0.9)}; HP taken (xMaxHP) p50 ${q(a.dmgTaken, 0.5).toFixed(2)}`);
  console.log('  damage to you by source: ' + Object.entries(a.src).sort((x, y) => y[1] - x[1]).map(([s, v]) => `${s} ${((100 * v) / tot).toFixed(0)}%`).join(', '));
  console.log(`  biggest single turn (% max HP) p50 ${(100 * q(a.bigTurn, 0.5)).toFixed(0)} p90 ${(100 * q(a.bigTurn, 0.9)).toFixed(0)}; losses where one turn took >=60% max HP: ${a.deaths ? ((100 * a.deathBig) / a.deaths).toFixed(0) : '-'}%${k === 'Mirror' ? `; Mirror turns with 2+ damage sources: ${a.mirrorDoubleTurns}` : ''}`);
}
