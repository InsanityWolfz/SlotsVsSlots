// THE WHEEL, close up: per slot machine (WHITE, greedy), where its damage comes from and how often you sweep.
// npx tsx tools/sim/wheel.ts [N] [machine] ["path=value;..." knob edits like probe.ts]
import { defaultConfig } from '../../src/core/config';
import * as cab from '../../src/core/cabinets';
import * as run from '../../src/core/run';
import * as enemies from '../../src/core/enemies';
import * as fight from '../../src/core/fight';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { Fight } from '../../src/core/fight';
import { simulateRuns } from '../../src/sim/simulateRun';

const N = Number(process.argv[2] ?? 300);
const only = process.argv[3] as CabinetId | undefined;
const roots: Record<string, unknown> = { ...cab, ...run, ...enemies, ...fight };
for (const e of (process.argv[4] ?? '').split(';').filter(Boolean)) {
  const [path, val] = e.split('=');
  const keys = path.trim().split('.');
  let o = roots as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[keys[keys.length - 1]] = Number(val);
}
type S = { fights: number; won: number; turns: number; drops: number; dropChips: number; dropHp: number; swordHp: number; maxHp: number; spins: number; sweeps: number; swept: number; placed: number; hpIn: number };
const z = (): S => ({ fights: 0, won: 0, turns: 0, drops: 0, dropChips: 0, dropHp: 0, swordHp: 0, maxHp: 0, spins: 0, sweeps: 0, swept: 0, placed: 0, hpIn: 0 });
let cur: S = z();
const step = Fight.prototype.step;
Fight.prototype.step = function (this: Fight) {
  const res = step.call(this);
  if (!this.isWheel) return res;
  if (this.turn <= 2 && res.side === 'player' && this.turn === 1) {
    cur.fights++;
    cur.maxHp += this.sides.player.maxHp;
    cur.hpIn += this.cfg.player.startHp ?? this.sides.player.maxHp;
  }
  for (const e of res.events) {
    if (e.type === 'noMoreBets') { cur.drops++; cur.dropChips += e.chips; cur.dropHp += e.hpDamage; }
    if (e.type === 'attack' && e.to === 'player') cur.swordHp += e.hpDamage;
    if (e.type === 'betSwept') { cur.sweeps++; cur.swept += e.chips; }
    if (e.type === 'betPlaced') cur.placed += e.reels.length;
    if (e.type === 'spin' && e.side === 'player' && !e.bonus) cur.spins++;
    if (e.type === 'fightEnd') { cur.turns += e.turns; if (e.winner === 'player') cur.won++; }
  }
  return res;
};
const f = (x: number) => x.toFixed(1).padStart(5);
console.log('machine | fights win% turns | hpIn% | per fight: drops chips/drop dropHp% swordHp% | sweeps/spin swept/placed');
for (const c of only ? [only] : CABINET_ORDER) {
  cur = z();
  simulateRuns(defaultConfig(), N, 'greedy', 4242, c, 0);
  const s = cur;
  const m = s.maxHp / s.fights;
  console.log(`${c.padEnd(7)} | ${String(s.fights).padStart(4)} ${f((100 * s.won) / s.fights)} ${f(s.turns / s.fights)} | ${f((100 * s.hpIn) / s.maxHp)} | ${f(s.drops / s.fights)} ${f(s.dropChips / Math.max(1, s.drops))} ${f((100 * s.dropHp) / s.fights / m)} ${f((100 * s.swordHp) / s.fights / m)} | ${f(s.sweeps / s.spins)} ${f(s.swept / Math.max(1, s.placed))}`);
}
