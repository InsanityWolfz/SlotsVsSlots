// EXPERT_PLAYTEST_11 (throwaway): proposal patches, applied at runtime by env (src/ untouched). Import first.
//   BELLFIX=1   the Bell doesn't refill JOKER's meter on a payoff spin (the payoff is scored as a jackpot: it chained).
//   BELLX=2     the Bell's multiplier on JOKER (now 1.25).
//   VAMPV=1|2|3 VAMP: 1 a one-cell jackpot heals once (no x3) | 2 once per spin | 3 both.
//   VAMPSIG="goldbar:0.5" VAMP heals x0.5 from a group of that symbol.
//   SIG="gold:thorn,wild,goldbar;vamp:goldbar"  symbols a charm fits by default.
//   CHARM="vamp:0,20,30,40,50"  charm values.  JOKER="perWild:25,hp:25,heal:3" (x10 units except perWild raw).
//   GATE="midas:1.0,knight:1.1" BOSS_MUL gate overrides (REPO MAN HP).  BMUL="joker.mirror:4.2,midas.dealer:1"  RUNK="postFightHeal:0.25"
import { UNIT, type Enh, type SymbolId } from '../../src/core/config';
import { CABINETS } from '../../src/core/cabinets';
import { CHARM_SYMBOLS, CHARM_VALUE } from '../../src/core/charms';
import { Fight } from '../../src/core/fight';
import { BOSS_MUL, RUN } from '../../src/core/run';

const E = process.env;
const P = Fight.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
const BELLX = Number(E.BELLX ?? 1.25);
const VAMPV = Number(E.VAMPV ?? 0);
type G = { amount: number; notes?: string[]; symbol: string; jackpot?: boolean };
const oScore = P.score, oPay = P.payoff, oFill = P.fillMeter, oVamp = P.vampHeal;
P.score = function (this: Record<string, unknown>, me: { side: string }, line: unknown) {
  if (me.side === 'player') this._paid = false;
  this['_vamp_' + me.side] = false;
  const s = oScore.call(this, me, line) as { groups: G[]; totals: Record<string, number> };
  if (BELLX !== 1.25 && me.side === 'player' && (this as { meter?: { kind: string } }).meter?.kind === 'jackpots') {
    let ch = false;
    for (const g of s.groups) if (g.notes?.includes('X1.25')) { g.amount = Math.round((g.amount * BELLX) / 1.25); ch = true; }
    if (ch) { s.totals = {}; for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount; }
  }
  return s;
};
P.payoff = function (this: Record<string, unknown>, me: unknown, score: { jackpots?: boolean }, ev: unknown) {
  if (score.jackpots) this._paid = true;
  return oPay.call(this, me, score, ev);
};
P.fillMeter = function (this: Record<string, unknown>, me: unknown, amount: unknown, reels: unknown, events: { type: string; relic?: string }[], e: unknown) {
  const last = events[events.length - 1];
  if (E.BELLFIX === '1' && this._paid && last?.type === 'relic' && last.relic === 'bell') return;
  return oFill.call(this, me, amount, reels, events, e);
};
const VAMPSIG = Object.fromEntries((E.VAMPSIG ?? '').split(',').filter(Boolean).map((kv) => [kv.split(':')[0], Number(kv.split(':')[1])]));
const oHeal = P.heal;
P.heal = function (this: Record<string, unknown>, me: unknown, amount: number, source: string, ev: unknown) {
  const k = this._vampScale as number | undefined;
  if (source === 'vamp' && k != null) amount = Math.round((amount * k) / 5) * 5;
  return oHeal.call(this, me, amount, source, ev);
};
P.vampHeal = function (this: Record<string, unknown>, me: { side: string; hp: number }, g: G, ev: unknown) {
  if (VAMPV >= 2 && this['_vamp_' + me.side]) return;
  this._vampScale = VAMPSIG[g.symbol];
  const before = me.hp, j = g.jackpot;
  if (VAMPV === 1 || VAMPV === 3) g.jackpot = false;
  const r = oVamp.call(this, me, g, ev);
  g.jackpot = j;
  this._vampScale = undefined;
  if (me.hp !== before) this['_vamp_' + me.side] = true;
  return r;
};
for (const kv of (E.SIG ?? '').split(';').filter(Boolean)) {
  const [k, v] = kv.split(':');
  for (const s of v.split(',')) if (!CHARM_SYMBOLS[k as Enh].includes(s as SymbolId)) CHARM_SYMBOLS[k as Enh].push(s as SymbolId);
}
for (const kv of (E.CHARM ?? '').split(';').filter(Boolean)) {
  const [k, v] = kv.split(':');
  CHARM_VALUE[k as Enh] = v.split(',').map(Number);
}
const j = CABINETS.joker as unknown as { hp: number; meter: { perWild?: number; heal: number } };
for (const kv of (E.JOKER ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  if (k === 'perWild') j.meter.perWild = Number(v);
  if (k === 'hp') j.hp = Number(v) * UNIT;
  if (k === 'heal') j.meter.heal = Number(v) * UNIT;
}
for (const kv of (E.GATE ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  (BOSS_MUL as unknown as Record<string, Record<string, number>>)[k].gate = Number(v);
}
for (const kv of (E.BMUL ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  const [cab, key] = k.split('.');
  (BOSS_MUL as unknown as Record<string, Record<string, number>>)[cab][key] = Number(v);
}
for (const kv of (E.RUNK ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  (RUN as unknown as Record<string, number>)[k] = Number(v);
}
export const PATCH_LABEL = ['BELLFIX', 'BELLX', 'VAMPV', 'VAMPSIG', 'SIG', 'CHARM', 'JOKER', 'GATE', 'BMUL', 'RUNK'].filter((k) => E[k]).map((k) => `${k}=${E[k]}`).join(' ') || 'current';
