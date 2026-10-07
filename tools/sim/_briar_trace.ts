// Throwaway (BRIAR redesign): act-1 fight anatomy. npx tsx tools/sim/_briar_trace.ts [N] "knob=val;..."
import { defaultConfig } from '../../src/core/config';
import * as fight from '../../src/core/fight';
import { simulateRuns } from '../../src/sim/simulateRun';
const [nArg, edits = ''] = process.argv.slice(2);
for (const e of edits.split(';').filter(Boolean)) { const [p, v] = e.split('='); const k = p.split('.'); let o: any = fight; for (const x of k.slice(0, -1)) o = o[x]; o[k[k.length - 1]] = Number(v); }
const cfg = defaultConfig();
const P: any = fight.Fight.prototype; const orig = P.step;
let order = 0; const seen = new WeakSet();
const S = { fights: 0, pSpins: 0, bank: 0, volleys: 0, volleyDmg: 0, spinsNoDmg: 0, maxDry: 0, dmg: 0, blocked: 0, through: 0 };
const dry = new WeakMap<object, number>(); const rd = new WeakMap<object, number>();
P.step = function (...a: any[]) {
  if (!seen.has(this)) { seen.add(this); order++; if (order <= 4) S.fights++; dry.set(this, 0); (this as any)._o = order; }
  const r = orig.apply(this, a);
  if ((this as any)._o > 4) return r;
  let d = 0;
  for (const e of r.events) {
    if (e.type === 'meter' && e.side === 'player' && e.amount > 0) S.bank += e.amount;
    if (e.type === 'attack' && e.from === 'player') { d += e.hpDamage; S.dmg += e.hpDamage; if (e.note === 'thorns') { S.volleys++; S.volleyDmg += e.hpDamage; } }
    if (e.type === 'attack' && e.from === 'enemy') { if (e.hpDamage > 0) S.through++; else if (e.blocked > 0) S.blocked++; }
  }
  if (r.side === 'player') { S.pSpins++; rd.set(this, d); return r; }
  d += rd.get(this) ?? 0; rd.set(this, 0);
  // "dry" = player rounds (her spin + enemy reply) with 0 damage dealt
  if (r.side === 'enemy') { const n = d > 0 ? 0 : (dry.get(this)! + 1); dry.set(this, n); if (n > S.maxDry) S.maxDry = n; if (d === 0) S.spinsNoDmg++; }
  return r;
};
const N = Number(nArg ?? 100);
for (let i = 0; i < N; i++) { order = 0; simulateRuns(cfg, 1, 'greedy', 1000 + i, 'thorn', 0, false); }
const f = S.fights;
console.log(`[${edits}] act1(first 4 fights) n=${f}: herSpins/fight ${(S.pSpins / f).toFixed(1)} bank/spin ${(S.bank / S.pSpins).toFixed(1)} volleys/fight ${(S.volleys / f).toFixed(2)} avgVolley ${(S.volleyDmg / Math.max(1, S.volleys)).toFixed(0)} dmg/spin ${(S.dmg / S.pSpins).toFixed(1)} rounds w/o dmg ${(100 * S.spinsNoDmg / S.pSpins).toFixed(0)}% longest dry ${S.maxDry} | enemy hits blocked ${S.blocked} through ${S.through}`);
