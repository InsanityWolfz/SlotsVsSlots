// CONTENT_13 (throwaway): the content-round charms and relics, patched in at runtime (src/ untouched). Import first.
// No Object.prototype hacks: every table is patched explicitly (CHARM_VALUE, CHARM_SYMBOLS, ACT1_GILDS, RELICS,
// RELIC_TIER, LEGENDARY, and the bot's GILD_VALUE / RELIC_VALUE in c13_sim.ts).
//   C13=lucre,sage,echo,weighted,trick,ingot,mend,bracelet,metronome,counterweight,rust,snakeeyes,pitboss,coil,taxman,grudge,overtime
//        what is in the game (pools) for this process; setContent() switches it per row.
//   V_<ID>=a,b,c,d   override numbers (charms: LV1..LV4; relics: see DEF below).   BOT_<ID>=x  the bot's value.
//   KEEN=30,40,50,60 the KEEN rework (values).
import type { Enh, RelicId, SymbolId } from '../../../src/core/config';
import { UNIT } from '../../../src/core/config';
import { CABINETS, type CabinetId } from '../../../src/core/cabinets';
import { CHARM_SYMBOLS, CHARM_VALUE, charmLevel, charmValue } from '../../../src/core/charms';
import { Fight } from '../../../src/core/fight';
import { LEGENDARY, RELICS, RELIC_TIER } from '../../../src/core/relics';
import { ACT1_GILDS, ACT2_GILDS } from '../../../src/core/run';
import { multFor } from '../../../src/core/scoring';
import { BONUS_SYMBOLS, visibleCells } from '../../../src/core/strip';
import { C13_HOOK, GILD_VALUE, RELIC_VALUE } from './c13_sim';

const E = process.env;
const nums = (k: string, d: number[]) => (E[k] ? E[k]!.split(',').map(Number) : d);

// ---- charms --------------------------------------------------------------------------------------------------------
type CharmDef = { syms: SymbolId[]; vals: number[]; bot: number; only?: CabinetId; act2?: boolean };
export const CHARMS: Record<string, CharmDef> = {
  /** +1 chip when its group pays; vals = the per-fight cap. */
  lucre: { syms: (E.L_SYMS ?? 'sword,shield,bolt').split(',') as SymbolId[], vals: nums('V_LUCRE', [3, 4, 5, 6]), bot: Number(E.BOT_LUCRE ?? 6.5) },
  /** washes this many cheats (bomb, hex, slime, rock) when it lands in a group. */
  sage: { syms: ['shield'], vals: nums('V_SAGE', [1, 1, 2, 2]), bot: Number(E.BOT_SAGE ?? 6.5) },
  /** % of its sword group's hit that lands again at the start of your next turn. */
  echo: { syms: ['sword'], vals: nums('V_ECHO', [30, 40, 50, 60]), bot: Number(E.BOT_ECHO ?? 7) },
  /** the cell lands twice as often (weight 2); vals = flat + to its group's base (LV1 0). */
  weighted: { syms: (E.W_SYMS ?? 'sword,shield,bolt,goldbar,thorn').split(',') as SymbolId[], vals: nums('V_WEIGHTED', [0, 10, 20, 30]), bot: Number(E.BOT_WEIGHTED ?? 7) },
  /** JOKER: +N jackpot meter when it lands on the payline. */
  trick: { syms: ['sword', 'shield'], vals: nums('V_TRICK', [10, 15, 20, 25]), bot: Number(E.BOT_TRICK ?? 8), only: 'joker' },
  /** MIDAS (own idea): +N vault pips when it lands on the payline. */
  ingot: { syms: ['goldbar'], vals: nums('V_INGOT', [1, 1, 2, 2]), bot: Number(E.BOT_INGOT ?? 8), only: 'midas' },
  /** (own idea) shield charm: heals N when its shield group lands (once per group). */
  mend: { syms: ['shield'], vals: nums('V_MEND', [15, 20, 30, 40]), bot: Number(E.BOT_MEND ?? 7) },
};
if (E.KEEN) CHARM_VALUE.keen = [0, ...nums('KEEN', [])];

// ---- relics --------------------------------------------------------------------------------------------------------
type RelicDefC = { tier: 'common' | 'uncommon' | 'legendary'; v: number[]; bot: number; machine?: CabinetId; name: string };
export const RELICS13: Record<string, RelicDefC> = {
  /** +v0% pay per different charm type you own. */
  bracelet: { tier: 'uncommon', v: nums('V_BRACELET', [10]), bot: Number(E.BOT_BRACELET ?? 7), name: 'CHARM BRACELET' },
  /** every v0-th spin pays xv1. */
  metronome: { tier: 'common', v: nums('V_METRONOME', [3, 2]), bot: Number(E.BOT_METRONOME ?? 7), name: 'METRONOME' },
  /** a spin with no match makes the next spin pay xv0. */
  counterweight: { tier: 'common', v: nums('V_COUNTERWEIGHT', [1.5]), bot: Number(E.BOT_COUNTERWEIGHT ?? 7), name: 'COUNTERWEIGHT' },
  /** at the start of your turn the enemy's shield loses v0%. */
  rust: { tier: 'uncommon', v: nums('V_RUST', [25]), bot: Number(E.BOT_RUST ?? 6.5), name: 'RUST' },
  /** each enemy jackpot heals you v0. */
  snakeeyes: { tier: 'common', v: nums('V_SNAKEEYES', [20]), bot: Number(E.BOT_SNAKEEYES ?? 6.5), name: 'SNAKE EYES' },
  /** once per fight, the enemy's first jackpot pays as a pair. */
  pitboss: { tier: 'legendary', v: nums('V_PITBOSS', [1]), bot: Number(E.BOT_PITBOSS ?? 8), name: 'PIT BOSS' },
  /** TESLA: every bolt in view off the payline charges v0 (max v1 a spin). */
  coil: { tier: 'uncommon', v: nums('V_COIL', [5, 99]), bot: Number(E.BOT_COIL ?? 8), machine: 'tesla', name: 'TESLA COIL' },
  /** MIDAS: each gold bar group that pays: +1 chip (max v0 a fight). */
  taxman: { tier: 'uncommon', v: nums('V_TAXMAN', [3]), bot: Number(E.BOT_TAXMAN ?? 7), machine: 'midas', name: 'TAX MAN' },
  /** (own idea) every cheat written on your reels hits the enemy for v0. */
  grudge: { tier: 'common', v: nums('V_GRUDGE', [10]), bot: Number(E.BOT_GRUDGE ?? 6.5), name: 'GRUDGE' },
  /** (own idea) from your v0-th spin each fight, everything pays xv1. */
  overtime: { tier: 'uncommon', v: nums('V_OVERTIME', [6, 1.5]), bot: Number(E.BOT_OVERTIME ?? 7), name: 'OVERTIME' },
};

// ---- content switch --------------------------------------------------------------------------------------------------
let ON = new Set<string>();
let CAB: CabinetId | null = null;
function apply(): void {
  for (const id of Object.keys(CHARMS)) {
    for (const arr of [ACT1_GILDS, ACT2_GILDS]) {
      const i = arr.indexOf(id as Enh);
      if (i >= 0) arr.splice(i, 1);
    }
    const d = CHARMS[id];
    CHARM_SYMBOLS[id as Enh] = d.syms;
    CHARM_VALUE[id as Enh] = [0, ...d.vals];
    GILD_VALUE[id] = d.bot;
    if (ON.has(id) && (!d.only || d.only === CAB)) (d.act2 ? ACT2_GILDS : ACT1_GILDS).push(id as Enh);
  }
  for (const id of Object.keys(RELICS13)) {
    const d = RELICS13[id];
    for (const t of ['common', 'uncommon', 'legendary'] as const) {
      const i = RELIC_TIER[t].indexOf(id as RelicId);
      if (i >= 0) RELIC_TIER[t].splice(i, 1);
    }
    (LEGENDARY as Set<RelicId>).delete(id as RelicId);
    delete (RELICS as Record<string, unknown>)[id];
    RELIC_VALUE[id as RelicId] = d.bot;
    // A forced start relic must exist in RELICS even when it's not in the pools (relicFits reads it).
    if (ON.has(id) || FORCE.has(id)) {
      (RELICS as Record<string, unknown>)[id] = { id, name: d.name, text: d.name, sprite: 'relicClover', ...(d.machine ? { machine: d.machine } : {}), ...(ON.has(id) ? {} : { retired: true }) };
      if (ON.has(id)) {
        RELIC_TIER[d.tier].push(id as RelicId);
        if (d.tier === 'legendary') (LEGENDARY as Set<RelicId>).add(id as RelicId);
      }
    }
  }
}
const FORCE = new Set<string>();
export function setContent(ids: string[] | string | undefined, force: string[] = []): void {
  ON = new Set((Array.isArray(ids) ? ids : (ids ?? '').split(',')).filter(Boolean));
  FORCE.clear();
  for (const f of force) FORCE.add(f);
  apply();
}
export function useCab(cab: CabinetId): void {
  CAB = cab;
  apply();
}
setContent(E.C13);
export const C13_LABEL = () => `C13=${[...ON].join(',') || '-'}${E.KEEN ? ` KEEN=${E.KEEN}` : ''} ${Object.keys(E).filter((k) => k.startsWith('V_') || k.startsWith('BOT_')).map((k) => `${k}=${E[k]}`).join(' ')}`;

/** Unit check (the round-12 bug): a fresh level table reads LV1 for every new charm. */
export function levelCheck(): string {
  const lv = { sym: {}, charm: {} };
  const bad = Object.keys(CHARMS).filter((id) => charmLevel(lv, id as Enh) !== 1 || charmValue(id as Enh, charmLevel(lv, id as Enh)) !== CHARMS[id].vals[0]);
  return bad.length ? `LEVEL CHECK FAILED: ${bad.join(',')}` : 'level check ok (every new charm starts at LV1)';
}

// ---- the fight ------------------------------------------------------------------------------------------------------
type Cell = { symbol: SymbolId; enh?: Enh; slimed?: boolean; stolen?: boolean; bomb?: number; faked?: number };
type Side = { side: 'player' | 'enemy'; hp: number; maxHp: number; shield: number; energy: number; armed: boolean; reels: { cells: Cell[]; stop: number }[]; hexed: number[]; locked: number[]; relics: Set<string>; levels?: { sym: Record<string, number>; charm: Record<string, number> } };
type Grp = { symbol: SymbolId; reels: number[]; amount: number; base: number; mult: number; matched: boolean; notes?: string[] };
type F = Record<string, any> & { sides: { player: Side; enemy: Side }; over: boolean; turn: number; next: string; meter: { kind: string } | null };
type St = { spins: number; echo: number; lucre: number; tax: number; cw: boolean; pit: boolean; washed: number; echoDealt: number; grudge: number };
const ST = new WeakMap<object, St>();
const st = (f: object): St => {
  let s = ST.get(f);
  if (!s) ST.set(f, (s = { spins: 0, echo: 0, lucre: 0, tax: 0, cw: false, pit: false, washed: 0, echoDealt: 0, grudge: 0 }));
  return s;
};
export const STATS = { lucreChips: 0, washed: 0, echo: 0, taxChips: 0, coil: 0, snake: 0, pit: 0, grudge: 0, fights: 0 };
const PAYING = new Set<SymbolId>(['sword', 'shield', 'bolt', 'seven', 'thorn']);
const REEL_WRITES = new Set<SymbolId>(['slime', 'ice', 'claw', 'rock', 'lock', 'bomb', 'hex', 'card', 'gavel', 'rake', 'ground', 'fake']);
const P = Fight.prototype as unknown as Record<string, (...a: any[]) => any>;
const has = (c: Side, r: string) => c.relics.has(r);
const lvlOf = (f: F, c: Side, enh: string) => f.charmLvl(c, enh) as number;
const val = (f: F, c: Side, enh: string) => charmValue(enh as Enh, lvlOf(f, c, enh));
const enhs = (f: F, c: Side, r: number): string[] => f.enhsAt(c, r);
const live = (f: F, c: Side, g: Grp, enh: string) => g.reels.filter((r) => enhs(f, c, r).includes(enh)).length;
const charmTypes = (c: Side) => new Set(c.reels.flatMap((r) => r.cells.map((x) => x.enh).filter(Boolean))).size;

// WEIGHTED: a weighted cell is twice as likely to stop on the payline (W_WEIGHT overrides the 2).
const WW = Number(E.W_WEIGHT ?? 2);
const oRoll = P.rollStops;
P.rollStops = function (this: F, c: Side, frozen: boolean[], forced?: SymbolId[]) {
  const res = oRoll.call(this, c, frozen, forced);
  if (c.side !== 'player' || forced) return res;
  c.reels.forEach((reel, r) => {
    if (frozen[r]) return;
    let w = 0;
    const idx: number[] = [];
    reel.cells.forEach((cell, i) => {
      if (BONUS_SYMBOLS.has(cell.symbol)) return;
      idx.push(i);
      w += cell.enh === 'weighted' ? WW : 1;
    });
    if (w === idx.length) return;
    let x = this.rng.next() * w;
    for (const i of idx) {
      x -= reel.cells[i].enh === 'weighted' ? WW : 1;
      if (x < 0) {
        res.stops[r] = i;
        break;
      }
    }
  });
  return res;
};

// Score: WEIGHTED's flat +N, the pay relics (BRACELET, METRONOME, COUNTERWEIGHT, OVERTIME), PIT BOSS on the enemy.
const oScore = P.score;
P.score = function (this: F, me: Side, line: SymbolId[]) {
  const s = oScore.call(this, me, line) as { tier: string; groups: Grp[]; totals: Record<string, number> };
  const S = st(this);
  if (me.side === 'player') {
    let mul = 1;
    if (has(me, 'bracelet')) mul *= 1 + (RELICS13.bracelet.v[0] / 100) * charmTypes(me);
    if (has(me, 'metronome') && S.spins % RELICS13.metronome.v[0] === 0) mul *= RELICS13.metronome.v[1];
    if (has(me, 'counterweight') && S.cw) mul *= RELICS13.counterweight.v[0];
    if (has(me, 'overtime') && S.spins >= RELICS13.overtime.v[0]) mul *= RELICS13.overtime.v[1];
    for (const g of s.groups) {
      if (!(g.base > 0) || !PAYING.has(g.symbol) && g.symbol !== 'goldbar') continue;
      const w = live(this, me, g, 'weighted');
      if (w) {
        const add = val(this, me, 'weighted') * w;
        if (add) {
          g.base += add;
          g.amount += Math.round(add * g.mult);
        }
      }
      if (mul !== 1 && PAYING.has(g.symbol)) {
        g.mult *= mul;
        g.amount = Math.round(g.amount * mul);
      }
    }
  } else if (s.tier === 'triple' && has(this.sides.player, 'pitboss') && !S.pit) {
    S.pit = true;
    STATS.pit++;
    const g = s.groups.find((x) => x.matched && x.reels.length >= 3);
    if (g) {
      const k = (2 * multFor(2, this.cfg)) / (3 * multFor(3, this.cfg));
      g.base = Math.round(g.base * (2 / 3));
      g.mult = g.mult / multFor(3, this.cfg) * multFor(2, this.cfg);
      g.amount = Math.round(g.amount * k);
      s.tier = 'pair';
    }
  }
  s.totals = {};
  for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
};

// Groups: LUCRE, SAGE, ECHO, TRICK, INGOT, MEND, TAX MAN.
function wash(this: F, me: Side, n: number, reels: number[], events: unknown[]): void {
  const cells: { reel: number; index: number }[] = [];
  for (let k = 0; k < n; k++) {
    // A bomb (lowest fuse), then a hex, then slime in view, then slime anywhere, then a rock off the payline.
    let done = false;
    let best: { r: number; i: number; f: number } | null = null;
    me.reels.forEach((reel, r) => reel.cells.forEach((c, i) => { if (c.bomb && (!best || c.bomb < best.f)) best = { r, i, f: c.bomb }; }));
    if (best) {
      const b = best as { r: number; i: number };
      delete me.reels[b.r].cells[b.i].bomb;
      cells.push({ reel: b.r, index: b.i });
      done = true;
    }
    if (!done) {
      const r = me.hexed.findIndex((t) => t > 0);
      if (r >= 0) { me.hexed[r] = 0; done = true; }
    }
    if (!done) {
      const vis = visibleCells(me.reels as never).find((ref) => me.reels[ref.reel].cells[ref.index].slimed);
      const any = vis ?? me.reels.flatMap((reel, r) => reel.cells.map((c, i) => ({ reel: r, index: i, c }))).find((x) => x.c.slimed);
      if (any) { me.reels[any.reel].cells[any.index].slimed = false; cells.push({ reel: any.reel, index: any.index }); done = true; }
    }
    if (!done) {
      for (let r = 0; r < me.reels.length && !done; r++) {
        const reel = me.reels[r];
        const i = reel.cells.findIndex((c, j) => c.symbol === 'rock' && j !== reel.stop && !c.slimed);
        if (i >= 0 && reel.cells.length > 4) {
          reel.cells.splice(i, 1);
          if (reel.stop > i) reel.stop--;
          done = true;
        }
      }
    }
    if (!done) break;
    st(this).washed++;
    STATS.washed++;
  }
  if (cells.length) events.push({ type: 'cleanse', side: me.side, reels, cells });
}
const oRes = P.resolveGroup;
P.resolveGroup = function (this: F, me: Side, g: Grp, score: unknown, events: unknown[]) {
  const r = oRes.call(this, me, g, score, events);
  if (me.side !== 'player' || this.over) return r;
  const S = st(this);
  const pays = g.amount > 0 && (PAYING.has(g.symbol) || g.symbol === 'goldbar');
  if (pays && live(this, me, g, 'lucre')) {
    const cap = val(this, me, 'lucre');
    S.lucre = Math.min(cap, S.lucre + Number(E.LUCRE_PER ?? 1));
  }
  const sage = live(this, me, g, 'sage');
  if (sage) wash.call(this, me, val(this, me, 'sage'), g.reels, events);
  if (pays && g.symbol === 'sword' && live(this, me, g, 'echo')) S.echo += Math.round((g.amount * val(this, me, 'echo')) / 100 / 5) * 5;
  if (pays && g.symbol === 'shield' && live(this, me, g, 'mend')) this.heal(me, val(this, me, 'mend'), 'vamp', events);
  const trick = live(this, me, g, 'trick');
  if (trick && this.meter?.kind === 'jackpots') this.fillMeter(me, trick * val(this, me, 'trick'), g.reels, events);
  const ingot = live(this, me, g, 'ingot');
  if (ingot && this.meter?.kind === 'vault') this.fillMeter(me, 0, Array.from({ length: ingot * val(this, me, 'ingot') }, () => g.reels[0]), events);
  if (pays && g.symbol === 'goldbar' && has(me, 'taxman') && S.tax < RELICS13.taxman.v[0] && this.meter?.kind === 'vault') {
    S.tax++;
    STATS.taxChips++;
    this.midasChips += 1;
    events.push({ type: 'midasChips', side: 'player', amount: 1, total: this.midasChips });
  }
  return r;
};

// GRUDGE: every cheat written on your reels hits back.
const oWrite = P.write;
P.write = function (this: F, me: Side, foe: Side, sym: SymbolId, amount: number, reels: number[], events: unknown[]) {
  const r = oWrite.call(this, me, foe, sym, amount, reels, events);
  if (foe.side === 'player' && has(foe, 'grudge') && REEL_WRITES.has(sym) && !this.over && me.hp > 0) {
    STATS.grudge++;
    events.push({ type: 'relic', side: 'player', relic: 'grudge' });
    this.hit(foe, me, RELICS13.grudge.v[0], [], events);
  }
  return r;
};

// The turn: ECHO and RUST before your spin; TESLA COIL, SNAKE EYES and COUNTERWEIGHT after.
const oTurn = P.turnBody;
P.turnBody = function (this: F) {
  const side = this.next as 'player' | 'enemy';
  const S = st(this);
  const pre: unknown[] = [];
  const p = this.sides.player;
  const e = this.sides.enemy;
  if (side === 'player') {
    if (S.spins === 0) STATS.fights++;
    S.spins++;
    if (has(p, 'rust') && e.shield > 0) {
      const cut = Math.floor((e.shield * RELICS13.rust.v[0]) / 100 / 5) * 5;
      if (cut > 0) {
        e.shield -= cut;
        pre.push({ type: 'relic', side: 'player', relic: 'rust' });
      }
    }
    if (S.echo > 0 && e.hp > 0) {
      const amt = S.echo;
      S.echo = 0;
      STATS.echo += amt;
      this.hit(p, e, amt, [], pre, E.ECHO_PIERCE === '1', 'echo');
    }
  }
  const res = oTurn.call(this) as { events: { type: string; side?: string; score?: { tier: string } }[] };
  if (pre.length) res.events.splice(1, 0, ...(pre as never[]));
  const spin = res.events.filter((x) => x.type === 'spin' && x.side === side).at(-1);
  if (side === 'player') {
    S.cw = spin?.score?.tier === 'none';
    if (has(p, 'coil') && !this.over && this.special) {
      let n = 0;
      for (const reel of p.reels)
        for (const d of [-1, 1]) {
          const c = reel.cells[(reel.stop + d + reel.cells.length) % reel.cells.length];
          if (c.symbol === 'bolt' && !c.slimed && !c.stolen) n++;
        }
      n = Math.min(n, RELICS13.coil.v[1]);
      if (n) {
        STATS.coil += n * RELICS13.coil.v[0];
        this.gainEnergy(p, n * RELICS13.coil.v[0], [], res.events);
      }
    }
  } else if (spin?.score?.tier === 'triple' && has(p, 'snakeeyes') && !this.over && p.hp > 0) {
    STATS.snake++;
    this.heal(p, RELICS13.snakeeyes.v[0], 'vamp', res.events);
  }
  return res;
};

// LUCRE's chips are paid after a won fight.
C13_HOOK.onFinish = (run, fight) => {
  const S = ST.get(fight);
  if (!S || fight.winner !== 'player') return;
  if (S.lucre) {
    run.player.chips += S.lucre;
    STATS.lucreChips += S.lucre;
  }
};
void UNIT;
void CABINETS;
// BMUL="thorn.mirror:11,midas.dealer:0.85": BOSS_MUL overrides (a follow-up knob, not content).
import { BOSS_MUL } from '../../../src/core/run';
for (const kv of (E.BMUL ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split(':');
  const [cab, key] = k.split('.');
  (BOSS_MUL as unknown as Record<string, Record<string, number>>)[cab][key] = Number(v);
}
