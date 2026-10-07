// Throwaway prototype harness for playtest/MIDAS_SPECIAL.md (no src/ edits: it monkeypatches Fight).
// OPT=live|touch|golden|foe  COST=20  HEAL=20  H=house M=mirror D=dealer (BOSS_MUL.midas overrides)
// npx tsx tools/balance/midas_special.ts [N]
// It replaces MIDAS's meter with a custom kind ('gold') so none of the working tree's x4 experiments
// (pair-only, +1 stack, free spins) run; each option is rebuilt here from scratch.
import { defaultConfig } from '../../../src/core/config';
import { CABINETS } from '../../../src/core/cabinets';
import { charmValue } from '../../../src/core/charms';
import { Fight } from '../../../src/core/fight';
import { BOSS_MUL } from '../../../src/core/run';
import { SIM_BIAS, simulateRuns } from '../../../src/sim/simulateRun';

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = Fight.prototype as any;
const OPT = process.env.OPT ?? 'live';
const COST = Number(process.env.COST ?? 20);
const HEAL = Number(process.env.HEAL ?? 20);
const TOUCH_SYMS = new Set((process.env.TOUCH ?? 'sword,shield').split(','));
const FEED = Number(process.env.FEED ?? 0); // foe: their gold statues on their payline fill your meter this much each
const PAYS = new Set(['sword', 'shield', 'bolt', 'seven', 'thorn']);
const m = BOSS_MUL.midas;
BOSS_MUL.midas = { house: Number(process.env.H ?? 2.8), mirror: Number(process.env.M ?? 5), dealer: Number(process.env.D ?? 1.4), act3: Number(process.env.A3 ?? m.act3) };
(CABINETS.midas as any).meter = { kind: 'gold', symbol: 'goldbar', cost: COST, heal: HEAL };

const STATS: any = { fires: 0, turns: 0, fights: 0, bossFights: 0, bossBig: 0, bossOneShot: 0, bossMaxShare: 0, touched: 0, maxHit: 0, bigHits: [] as number[] };
function fireStat(f: any, off: number) {
  if (f.sides.enemy.maxHp >= 50000) return;
  STATS.fires++;
  const e = (f.sides.player.energy + off) / COST;
  STATS.fullSum = (STATS.fullSum ?? 0) + e;
  if (e >= 2) STATS.over2 = (STATS.over2 ?? 0) + 1;
}
const isGold = (me: any, f: any) => me.side === 'player' && f.meter?.kind === 'gold';

// ---- fillMeter: overflow carries, nothing is ever wasted ------------------------------------
const origFill = P.fillMeter;
P.fillMeter = function (me: any, amount: number, reels: number[], events: any[], earthed = 0) {
  if (!isGold(me, this)) return origFill.call(this, me, amount, reels, events, earthed);
  amount *= this.cfg.player.meterMul ?? 1;
  if (OPT === 'live') {
    if (me.armed) { events.push({ type: 'meter', side: me.side, reels, amount: 0, total: me.energy, armed: true, wasted: amount }); return; }
    me.energy = Math.min(COST, me.energy + amount);
    if (me.energy >= COST) me.armed = true;
    events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}) });
    return;
  }
  me.energy += amount;
  events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy });
  if (OPT === 'golden' || OPT === 'touch' || OPT === 'rush') {
    if (me.energy >= COST) me.armed = true;
    return;
  }
  // touch / foe: every full meter fires at once (a big bar pair can fire twice).
  while (me.energy >= COST && !this.over) {
    me.energy -= COST;
    fireStat(this, 0);
    if (OPT === 'touch') touch(this, me);
    else gild(this);
    this.payoffHeal(me, events);
  }
};

function touch(f: any, me: any) {
  f._touched ??= new Set();
  const pool: any[] = [];
  for (const reel of me.reels) for (const c of reel.cells) if (TOUCH_SYMS.has(c.symbol) && !c.enh && !f._touched.has(c)) pool.push(c);
  if (!pool.length) return;
  f._touched.add(f.rng.pick(pool));
  STATS.touched++;
}
function gild(f: any) {
  const foe = f.sides.enemy;
  const pool: any[] = [];
  for (const reel of foe.reels) for (const c of reel.cells) if (!c.statue && (PAYS.has(c.symbol) || foe.casts.has(c.symbol))) pool.push(c);
  if (!pool.length) return;
  // Their attacks first (swords, sevens, bolts), then anything that does something.
  const hits = pool.filter((c) => c.symbol === 'sword' || c.symbol === 'seven' || c.symbol === 'bolt');
  const c = f.rng.pick(hits.length ? hits : pool);
  c.symbol = 'goldbar';
  c.enh = undefined;
  c.statue = true;
  STATS.touched++;
}

// ---- score: the live x4 and the SOLID GOLD spin ------------------------------------------------
const recompute = (g: any) => (g.amount = Math.max(0, Math.round(g.base * g.mult) - (g.cut ?? 0)));
const origScore = P.score;
P.score = function (me: any, line: string[]) {
  if (OPT === 'touch' && isGold(me, this)) {
    this._touched ??= new Map();
    const TCAP = Number(process.env.TCAP ?? 3);
    const cellAt = (r: number) => me.reels[r].cells[me.reels[r].stop];
    const touchable = (r: number) => { const c = cellAt(r); return (line[r] === 'sword' || line[r] === 'shield') && c && c.symbol === line[r] && !c.slimed && !c.stolen; };
    const lvl = (r: number) => this._touched.get(cellAt(r)) ?? 0;
    let fired = false;
    // A full meter touches the next payline with a sword or shield: each one gains a gold touch (max TCAP) that stays.
    const bump = (c: any) => { if ((c.symbol === 'sword' || c.symbol === 'shield') && !c.slimed && !c.stolen && (this._touched.get(c) ?? 0) < TCAP) { this._touched.set(c, (this._touched.get(c) ?? 0) + 1); STATS.touched++; } };
    const touchLine = () => {
      for (let r = 0; r < line.length; r++) {
        if (!touchable(r)) continue;
        bump(cellAt(r));
        // ROYAL DECREE (touch): the touch spreads to the cells above and below.
        if (me.relics.has('decree')) { const reel = me.reels[r]; const n = reel.cells.length; bump(reel.cells[(reel.stop + 1) % n]); bump(reel.cells[(reel.stop + n - 1) % n]); }
      }
    };
    // KING'S VAULT (touch): a charmed gold bar on the payline touches it for free.
    const vaultBar = process.env.VAULTMODE !== 'keep' && me.relics.has('vault') && line.some((x, r) => x === 'goldbar' && cellAt(r)?.symbol === 'goldbar' && this.paylineEnh(me, r) === 'gold');
    if (vaultBar && line.some((_x, r) => touchable(r))) { touchLine(); STATS.vaultTouch = (STATS.vaultTouch ?? 0) + 1; }
    if (me.armed && line.some((_x, r) => touchable(r))) {
      touchLine();
      fired = true;
      // Every extra full meter touches one more sword or shield anywhere on your reels (the meter empties).
      const k = process.env.SPREAD === '0' ? 1 : Math.floor(me.energy / COST);
      this._spend = k * COST;
      for (let i = 1; i < k; i++) {
        const pool: any[] = [];
        for (const reel of me.reels) for (const c of reel.cells) if ((c.symbol === 'sword' || c.symbol === 'shield') && !c.slimed && !c.stolen && (this._touched.get(c) ?? 0) < TCAP) pool.push(c);
        if (!pool.length) break;
        const c = this.rng.pick(pool);
        this._touched.set(c, (this._touched.get(c) ?? 0) + 1);
        STATS.touched++;
      }
    }
    const s = origScore.call(this, me, line);
    const gv = charmValue('gold', this.charmLvl(me, 'gold'));
    for (const g of s.groups) {
      if (!(g.base > 0 && (g.symbol === 'sword' || g.symbol === 'shield'))) continue;
      const copies = g.jackpot && g.reels.length === 1 ? 3 : 1;
      const n = g.reels.reduce((a: number, r: number) => a + (touchable(r) ? lvl(r) : 0), 0) * copies;
      if (!n) continue;
      const own = g.reels.reduce((a: number, r: number) => a + (this.paylineEnh(me, r) === 'gold' ? gv * copies : 0), 0);
      g.mult = (g.mult / (own || 1)) * (own + n * gv);
      recompute(g);
    }
    if (process.env.NOPERSIST) this._touched.clear();
    if (fired) { s.raised = true; this.vault = 0; fireStat(this, 0); }
    s.totals = {};
    for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
    return s;
  }
  const s = origScore.call(this, me, line);
  if (OPT === 'rush' && isGold(me, this) && this._rushSpin && me.relics.has('decree')) {
    for (const g of s.groups) if (g.base > 0 && PAYS.has(g.symbol)) { g.mult *= Number(process.env.DX ?? 2); recompute(g); }
    s.totals = {};
    for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
    return s;
  }
  if (!isGold(me, this) || !me.armed) return s;
  const pays = (g: any) => g.base > 0 && PAYS.has(g.symbol);
  const has = (r: string) => me.relics.has(r);
  if (OPT === 'live') {
    const g = s.groups.find(pays);
    if (!g) return s;
    const x = 4 + (this.vault ?? 0);
    g.mult *= x; recompute(g); s.raised = true; this.vault = 0; fireStat(this, 0);
    if (has('decree')) for (const o of s.groups) if (o !== g && (pays(o) || (o.symbol === 'goldbar' && o.base > 0))) { o.mult *= 4; recompute(o); }
  } else if (OPT === 'golden') {
    // Every sword or shield on the payline counts one more gold charm (they add: pair x4, jackpot x6).
    const paying = s.groups.filter(pays);
    if (!paying.length) return s; // waits for a spin with a sword or shield (bars keep filling meanwhile)
    const gv = charmValue('gold', this.charmLvl(me, 'gold'));
    const extra = Number(process.env.GX ?? 0); // KING'S VAULT-style: saved gold adds to every cell
    const k = Math.min(Number(process.env.GK ?? 3), Math.floor(me.energy / COST));
    this._spend = k * COST;
    for (const g of s.groups) {
      const decreeBars = has('decree') && g.symbol === 'goldbar' && g.base > 0;
      if (!pays(g) && !decreeBars) continue;
      const copies = g.jackpot && g.reels.length === 1 ? 3 : 1;
      const own = g.reels.reduce((a: number, r: number) => a + (this.paylineEnh(me, r) === 'gold' ? charmValue('gold', this.charmLvl(me, 'gold')) * copies : 0), 0);
      const add = g.reels.length * copies * (k * gv + extra + (this.vault ?? 0));
      g.mult = (g.mult / (own || 1)) * (own + add);
      recompute(g);
    }
    this.vault = 0;
    s.raised = true;
    fireStat(this, 0);
  }
  s.totals = {};
  for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
};

// ---- payoff: the meter keeps its overflow -------------------------------------------------------
const origPayoff = P.payoff;
P.payoff = function (me: any, score: any, events: any[]) {
  if (!isGold(me, this) || OPT === 'live') return origPayoff.call(this, me, score, events);
  me.armed = false;
  me.energy = Math.max(0, me.energy - (this._spend ?? COST));
  this._spend = 0;
  if (me.energy >= COST) me.armed = true;
  events.push({ type: 'payoff', side: me.side, kind: 'raise' });
};

// ---- step: burst stats vs bosses, and FEED (their statues fill your meter) ----------------------
const origStep = P.step;
P.step = function () {
  const pl = this.sides.player;
  const r = origStep.call(this);
  // GOLD RUSH: a full meter spins again inside the same turn (one extra spin a turn; the enemy waits).
  if (OPT === 'rush' && r.side === 'player' && isGold(pl, this) && pl.armed && !this.over) {
    pl.armed = false;
    pl.energy -= COST;
    fireStat(this, COST);
    this.payoffHeal(pl, r.events);
    if (!this.over) {
      const held = pl.shield;
      pl.shield = 0;
      this.next = 'player';
      this.turn--; // the extra spin is part of this turn
      this._rushSpin = true;
      const r2 = origStep.call(this);
      pl.shield += held;
      r.events.push(...r2.events);
      // KING'S VAULT (rush): a charmed gold bar on the extra spin gives one more (max 2 extra a turn).
      const line2 = pl.reels.map((reel: any) => reel.cells[reel.stop]);
      if (!this.over && pl.relics.has('vault') && line2.some((c: any, r: number) => c?.symbol === 'goldbar' && this.paylineEnh(pl, r) === 'gold')) {
        STATS.vaultTouch = (STATS.vaultTouch ?? 0) + 1;
        const held2 = pl.shield; pl.shield = 0; this.next = 'player'; this.turn--;
        const r3 = origStep.call(this);
        pl.shield += held2;
        r.events.push(...r3.events);
      }
      this._rushSpin = false;
    }
    if (pl.energy >= COST) pl.armed = true;
  }
  const e = this.sides.enemy;
  if (e.maxHp > 50000 || !isGold(this.sides.player, this)) return r;
  if (r.side === 'player') {
    const d = r.events.reduce((a: number, ev: any) => a + ((ev.type === 'attack' || ev.type === 'specialFire') && ev.from === 'player' ? ev.hpDamage ?? 0 : 0), 0);
    STATS.turns++;
    if (!(this.isBoss || this.isMirror || this.isDealer)) { STATS.rd = (STATS.rd ?? 0) + d; STATS.rt = (STATS.rt ?? 0) + 1; STATS.rh = (STATS.rh ?? 0) + r.events.reduce((a: number, ev: any) => a + (ev.type === 'heal' && ev.side === 'player' ? ev.amount ?? 0 : 0), 0); }
    STATS.maxHit = Math.max(STATS.maxHit, d);
    if (this.isBoss || this.isMirror || this.isDealer) this._bossMax = Math.max(this._bossMax ?? 0, d / e.maxHp);
  } else if (FEED && OPT === 'foe' && !this.over) {
    const n = e.reels.filter((reel: any) => reel.cells[reel.stop]?.statue).length;
    if (n) P.fillMeter.call(this, this.sides.player, n * FEED, [], r.events);
  }
  if (this.over) {
    STATS.fights++;
    if (this.isBoss || this.isMirror || this.isDealer) {
      STATS.bossFights++;
      const share = this._bossMax ?? 0;
      STATS.bossMaxShare += share;
      if (share >= 0.5) STATS.bossBig++;
      if (share >= 0.99) STATS.bossOneShot++;
    }
  }
  return r;
};

const N = Number(process.argv[2] ?? 600);
if (process.env.VAULTMODE === 'keep') {
  // KING'S VAULT (touch, alt): after each win, one sword keeps its gold for good (a real gold charm).
  const { normalizeCharms } = await import('../../../src/core/run');
  const seen = new WeakMap<any, number>();
  SIM_BIAS.onFight = (run: any) => {
    const wins = run.records.filter((r: any) => r.won).length;
    const had = seen.get(run) ?? 0;
    seen.set(run, wins);
    if (!run.player.relics.includes('vault') || wins <= had) return;
    const reels = [0, 1, 2].filter((r) => (run.player.strips[r].sword ?? 0) > run.player.gilded.filter((g: any) => g.reel === r && g.symbol === 'sword').reduce((a: number, g: any) => a + g.n, 0));
    if (!reels.length) return;
    run.player.gilded.push({ reel: reels[wins % reels.length], symbol: 'sword', enh: 'gold', n: 1 });
    normalizeCharms(run.player);
    STATS.vaultTouch = (STATS.vaultTouch ?? 0) + 1;
  };
}
if (process.env.RELICS) {
  SIM_BIAS.noStart = true;
  const out: string[] = [];
  for (const rel of ['none', ...process.env.RELICS.split(',')]) {
    SIM_BIAS.startRelic = rel === 'none' ? undefined : (rel as any);
    STATS.vaultTouch = 0;
    const g = simulateRuns(defaultConfig(), N, 'greedy', 777, 'midas', 2, true);
    out.push(`${rel} ${g.winPct.toFixed(1)}${rel === 'vault' ? ` (vault procs ${STATS.vaultTouch})` : ''}`);
  }
  console.log(`${OPT} GREEN relic probe N ${N}: ${out.join(' | ')}`);
  process.exit(0);
}
const w = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'midas', 0);
const g = simulateRuns(defaultConfig(), N, 'greedy', 4242, 'midas', 2, true);
const f = (x: number) => x.toFixed(1).padStart(5);
if (process.env.DEATHS) console.log('deaths', w.deathsAtDepth.slice(0, 12).map((x) => x.toFixed(1)).join(' '), '| kill', JSON.stringify(w.killRate));
const tag = `${OPT}${OPT === "touch" ? " cap" + (process.env.TCAP ?? 3) : ""} cost ${COST}${FEED ? ` feed ${FEED}` : ''} H${BOSS_MUL.midas.house} M${BOSS_MUL.midas.mirror} D${BOSS_MUL.midas.dealer} A${BOSS_MUL.midas.act3}`;
console.log(
  `${tag.padEnd(40)} | WHITE ${f(w.winPct)} act1 ${f(w.act1Pct)} House ${f(w.bossWinPct)} Mirror ${f(w.mirrorWinPct)} t ${w.turnsByAct[0].toFixed(1)},${w.turnsByAct[1].toFixed(1)} | GREEN ${f(g.winPct)} reachD ${f(g.reachedDealerPct)} Dealer ${f(g.dealerWinPct)} a3die ${f(g.act3Regular.diePct)}` +
    ` | fires/turn ${(STATS.fires / Math.max(1, STATS.turns)).toFixed(2)} boss: best turn ${(100 * STATS.bossMaxShare / Math.max(1, STATS.bossFights)).toFixed(0)}% of HP, >=50% ${(100 * STATS.bossBig / Math.max(1, STATS.bossFights)).toFixed(1)}%, one-shot ${(100 * STATS.bossOneShot / Math.max(1, STATS.bossFights)).toFixed(1)}%, max hit ${STATS.maxHit} | meter at fire ${(STATS.fullSum / STATS.fires).toFixed(1)}x full, >=2x ${(100 * (STATS.over2 ?? 0) / STATS.fires).toFixed(0)}% | regular dmg/turn ${(STATS.rd / STATS.rt).toFixed(1)} heal/turn ${(STATS.rh / STATS.rt).toFixed(1)}`,
);
if (process.env.DBG) {
  const R = await import('../../../src/core/run');
  const run = R.createRun(defaultConfig(), 99, 'midas', 0, false);
  const cfg = R.fightConfig(run, defaultConfig());
  const fight = new Fight(cfg, Number(process.env.FS ?? 5));
  for (let t = 0; t < 40 && !fight.over; t++) {
    const { side, events } = fight.step();
    const spin: any = events.find((e: any) => e.type === 'spin' && !e.bonus);
    const out = events.filter((e: any) => ['attack', 'meter', 'heal', 'shieldGain', 'payoff'].includes(e.type)).map((e: any) => `${e.type}:${e.amount ?? ''}${e.hpDamage !== undefined ? '/' + e.hpDamage : ''}`);
    const p = fight.sides.player, e = fight.sides.enemy;
    console.log(side, spin?.score.line.join(','), spin?.score.groups.map((g: any) => `${g.symbol}${g.reels.length}=${g.amount}(${g.notes ?? ''})`).join(' '), '|', out.join(' '), `| P ${p.hp}/${p.maxHp} E ${e.hp}/${e.maxHp} en ${p.energy} touched ${(fight as any)._touched?.size ?? 0}`);
  }
}
if (process.env.DBG2) {
  const R = await import('../../../src/core/run');
  for (let d = 0; d < 5; d++) {
    let wins = 0, turns = 0, dmg = 0, pt = 0;
    for (let i = 0; i < 300; i++) {
      const run = R.createRun(defaultConfig(), 1000 + i, 'midas', 0, false);
      run.depth = d;
      const fight = new Fight(R.fightConfig(run, defaultConfig()), 77 + i);
      while (!fight.over && fight.turn < 400) {
        const { side, events } = fight.step();
        if (side === 'player') { pt++; dmg += events.reduce((a: number, e: any) => a + (e.type === 'attack' && e.from === 'player' ? e.hpDamage : 0), 0); }
      }
      if (fight.winner === 'player') wins++;
      turns += fight.turn;
    }
    console.log(`depth ${d}: win ${(wins / 3).toFixed(1)} turns ${(turns / 300).toFixed(1)} dmg/turn ${(dmg / pt).toFixed(1)}`);
  }
}
