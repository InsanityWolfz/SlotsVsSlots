// Throwaway prototype harness for playtest/RELIC_PROPOSALS.md (no src/ edits: it monkeypatches Fight).
// npx tsx tools/balance/relic_proposals.ts [N] [id,id,...]
// Each proposal is "start the run holding it" (like builds.ts), GREEN stake, greedy, paired seeds (777),
// on its own pool: machine relics on their machine, charm relics on all 5 machines both with the greedy
// drafter and with the only-this-charm drafter, general relics on all 5.
import { defaultConfig, UNIT, type Enh, type SymbolId } from '../../src/core/config';
import { CABINET_ORDER, type CabinetId } from '../../src/core/cabinets';
import { CHARM_SYMBOLS, charmValue } from '../../src/core/charms';
import { Fight } from '../../src/core/fight';
import { SIM_BIAS, simulateRuns } from '../../src/sim/simulateRun';

/* eslint-disable @typescript-eslint/no-explicit-any */
const P = Fight.prototype as any;
const has = (c: any, id: string) => c?.relics?.has(id);
const PAYING = new Set<SymbolId>(['sword', 'shield', 'bolt', 'goldbar', 'thorn', 'wild']);
export const HIT: Record<string, number> = {};
const tick = (id: string) => (HIT[id] = (HIT[id] ?? 0) + 1);
const recompute = (g: any) => {
  g.amount = Math.max(0, Math.round(g.base * g.mult) - (g.cut ?? 0));
};
const KNOB: Record<string, number> = {
  bashShare: Number(process.env.BASH ?? 0.5),
  rallyStep: Number(process.env.RALLY ?? 10),
  rallyCap: Number(process.env.RALLYCAP ?? 5),
  overgrow: Number(process.env.OVERGROW ?? 60),
  chainStep: Number(process.env.CHAIN ?? 30),
  faraday: Number(process.env.FARADAY ?? 0.5),
  encore: Number(process.env.ENCORE ?? 40),
  bleed: Number(process.env.BLEED ?? 10),
  leech: Number(process.env.LEECH ?? 1),
  under: Number(process.env.UNDER ?? 2),
  consol: Number(process.env.CONSOL ?? 30),
  first: Number(process.env.FIRST ?? 3),
  trophy: Number(process.env.TROPHY ?? 10),
};

// ---- score() wrapper: pay-changing proposals --------------------------------------------------
const origScore = P.score;
P.score = function (me: any, line: SymbolId[]) {
  const player = me.side === 'player';
  // HORSESHOE (lucky): a WILD on your line lets any two matching reels pay (JAX's rule, for everyone).
  let temp = false;
  if (player && has(me, 'horseshoe') && line.includes('wild') && !me.relics.has('mirror')) {
    me.relics.add('mirror');
    temp = true;
    tick('horseshoe');
  }
  const s = origScore.call(this, me, line);
  if (temp) me.relics.delete('mirror');
  if (!player) return s;
  const paying = (g: any) => g.amount > 0 && PAYING.has(g.symbol);
  // RALLY (KNIGHT): sword groups +step per stack.
  if (has(me, 'rally') && this._rally) for (const g of s.groups) if (g.symbol === 'sword' && g.amount > 0) { g.base += KNOB.rallyStep * this._rally; recompute(g); tick('rally'); }
  // GRAFT (BRIAR): keen on thorns adds to the thorn group's base.
  if (has(me, 'graft'))
    for (const g of s.groups)
      if (g.symbol === 'thorn') {
        const k = g.reels.filter((r: number) => this.paylineEnh(me, r) === 'keen').length;
        if (k) { g.base += k * charmValue('keen', this.charmLvl(me, 'keen')); recompute(g); tick('graft'); }
      }
  // VAULT (MIDAS): gold on bars goes to the vault (not into the bar's fill), and the vault adds to the next x4.
  if (has(me, 'vault')) {
    for (const g of s.groups)
      if (g.symbol === 'goldbar') {
        const gold = g.reels.reduce((a: number, r: number) => a + (this.paylineEnh(me, r) === 'gold' ? charmValue('gold', this.charmLvl(me, 'gold')) : 0), 0);
        if (gold) { g.mult /= gold; recompute(g); this._vault = (this._vault ?? 0) + gold; tick('vault'); }
      }
  }
  const raised = s.groups.find((g: any) => g.notes?.some((n: string) => n.includes('MIDAS')));
  if (raised && has(me, 'vault') && this._vault) { g2(raised, (4 + this._vault) / 4); this._vault = 0; }
  if (raised && has(me, 'compound') && this._comp) { tick('compound'); g2(raised, (4 + this._comp) / 4); this._comp = 0; }
  // ROYAL DECREE (MIDAS): the x4 hits every paying group on that spin.
  if (raised && has(me, 'decree')) for (const g of s.groups) if (g !== raised && paying(g) && (process.env.DECREE_BARS !== '0' || g.symbol !== 'goldbar')) { g2(g, 4); tick('decree'); }
  // GOLD LEAF (gold): gold on a payline cell that pays nothing joins your best paying group.
  if (has(me, 'goldleaf')) {
    const best = s.groups.filter(paying).sort((a: any, b: any) => b.amount - a.amount)[0];
    if (best) {
      const gv = charmValue('gold', this.charmLvl(me, 'gold'));
      const stray = s.groups.filter((g: any) => g !== best && !paying(g)).reduce((a: number, g: any) => a + g.reels.filter((r: number) => this.paylineEnh(me, r) === 'gold').length, 0) * gv;
      if (stray) {
        const own = best.reels.filter((r: number) => this.paylineEnh(me, r) === 'gold').length * gv;
        best.mult = (best.mult / (own || 1)) * (own + stray);
        tick('goldleaf');
        recompute(best);
      }
    }
  }
  // EXECUTIONER (keen alt): keen sword groups pay x2 against an enemy under half HP.
  if (has(me, 'execute')) {
    const foe = this.sides.enemy;
    if (foe.hp < foe.maxHp / 2)
      for (const g of s.groups)
        if (g.symbol === 'sword' && g.amount > 0 && g.reels.some((r: number) => this.paylineEnh(me, r) === 'keen')) { g2(g, Number(process.env.EXEC ?? 2)); tick('execute'); }
  }
  // WHETTED (keen alt): each keen charm adds its + again for every sword level above 1.
  if (has(me, 'honelvl')) {
    const lvl = me.levels?.sym?.sword ?? 1;
    if (lvl > 1)
      for (const g of s.groups)
        if (g.symbol === 'sword' && g.amount > 0) {
          const k = g.reels.filter((r: number) => this.paylineEnh(me, r) === 'keen').length * (g.jackpot && g.reels.length === 1 ? 3 : 1);
          if (k) { g.base += k * charmValue('keen', this.charmLvl(me, 'keen')) * (lvl - 1); recompute(g); tick('honelvl'); }
        }
  }
  // HORSESHOE v2 (lucky): a group with a WILD in it pays x3 (on non-JAX machines every wild is a lucky one).
  if (has(me, 'horseshoe2')) for (const g of s.groups) if (g.amount > 0 && g.reels.some((r: number) => line[r] === 'wild')) { g2(g, 3); tick('horseshoe2'); }
  // HORSESHOE v3 (lucky): a group with a LUCKY-born wild pays xM (natural wilds don't count).
  if (has(me, 'horseshoe3'))
    for (const g of s.groups)
      if (g.amount > 0 && g.reels.some((r: number) => line[r] === 'wild' && this.paylineEnh(me, r) === 'lucky')) { g2(g, Number(process.env.SHOE ?? 2)); tick('horseshoe3'); }
  // UNDERDOG (general): under half HP, every paying group pays x2.
  if (has(me, 'underdog') && me.hp < me.maxHp / 2) for (const g of s.groups) if (paying(g)) { g2(g, KNOB.under); tick('underdog'); }
  // FIRST STRIKE (general): your first paying spin each fight pays x3.
  if (has(me, 'firststrike') && !this._fs && s.groups.some(paying)) {
    this._fs = true;
    tick('firststrike');
    for (const g of s.groups) if (paying(g)) g2(g, KNOB.first);
  }
  s.totals = {};
  for (const g of s.groups) s.totals[g.symbol] = (s.totals[g.symbol] ?? 0) + g.amount;
  return s;
};
function g2(g: any, m: number) {
  g.mult *= m;
  recompute(g);
}

// ---- resolveGroup() wrapper ------------------------------------------------------------------
const origResolve = P.resolveGroup;
P.resolveGroup = function (me: any, g: any, score: any, events: any[]) {
  origResolve.call(this, me, g, score, events);
  if (me.side !== 'player' || this.over) return;
  // FARADAY CAGE (TESLA): shields you gain also charge your lightning.
  if (g.symbol === 'shield' && g.amount > 0 && has(me, 'faraday') && this.special && tick('faraday')) this.gainEnergy(me, Math.round((g.amount * KNOB.faraday) / UNIT) * UNIT, g.reels, events);
  // GRAFT (BRIAR): vamp thorns heal when they bank.
  if (g.symbol === 'thorn' && g.amount > 0 && has(me, 'graft')) {
    const v = g.reels.filter((r: number) => this.paylineEnh(me, r) === 'vamp').length * charmValue('vamp', this.charmLvl(me, 'vamp'));
    if (v) { this.heal(me, v, 'vamp', events); tick('graftvamp'); }
  }
  // VAMPIRE'S KISS (vamp alt): vamp fits every symbol; a vamp cell in any paying group heals.
  if (g.symbol !== 'sword' && g.amount > 0 && has(me, 'vampall') && !(g.symbol === 'thorn' && has(me, 'graft'))) {
    const v = g.reels.filter((r: number) => this.paylineEnh(me, r) === 'vamp').length * charmValue('vamp', this.charmLvl(me, 'vamp'));
    if (v) { this.heal(me, v, 'vamp', events); tick('vampall'); }
  }
  // BLEED (keen; the Hone rework): each keen sword that hits adds 10 bleed (stacks, all fight).
  if (g.symbol === 'sword' && g.amount > 0 && has(me, 'bleed')) {
    const k = g.reels.filter((r: number) => this.paylineEnh(me, r) === 'keen').length * (g.jackpot && g.reels.length === 1 ? 3 : 1);
    this._bleed = (this._bleed ?? 0) + k * KNOB.bleed;
    if (k) tick('bleed');
  }
};

// ---- meter wrappers ---------------------------------------------------------------------------
const origFill = P.fillMeter;
P.fillMeter = function (me: any, amount: number, reels: number[], events: any[], earthed = 0) {
  // COMPOUND (MIDAS): bars that land while the meter is full add +1 to the x4 each.
  // STACKED DECK v2 (JAX): a charmed wild fills the meter double.
  if (me.side === 'player' && this.meter?.kind === 'jackpots' && has(me, 'stacked2') && reels.length) {
    const extra = reels.filter((r) => this.paylineEnh(me, r)).length;
    if (extra) { amount += extra * (this.meter.perWild ?? 0); tick('stacked2fill'); }
  }
  if (me.side === 'player' && this.meter?.kind === 'raise' && me.armed && has(me, 'compound') && reels.length) this._comp = (this._comp ?? 0) + reels.length;
  return origFill.call(this, me, amount, reels, events, earthed);
};
const origPayoff = P.payoff;
P.payoff = function (me: any, score: any, events: any[]) {
  origPayoff.call(this, me, score, events);
  // ENCORE (JAX): after the jackpot spin the meter starts at 40.
  if (me.side === 'player' && score.jackpots && has(me, 'encore2')) { if (!this._enc2) { this._enc2 = true; this._encPending = true; tick('encore2'); } else this._enc2 = false; }
  if (me.side === 'player' && score.jackpots && has(me, 'encore')) { me.energy = KNOB.encore; tick('encore'); }
};
// CHAIN LIGHTNING (TESLA): each extra strike in one turn deals +step more than the last.
const origGain = P.gainEnergy;
P.gainEnergy = function (me: any, amount: number, reels: number[], events: any[], earthed = 0) {
  if (me.side !== 'player' || !has(me, 'chain')) return origGain.call(this, me, amount, reels, events, earthed);
  const sd = this.cfg.specialDamage;
  this._chaining = true;
  try {
    return origGain.call(this, me, amount, reels, events, earthed);
  } finally {
    this._chaining = false;
    this.cfg.specialDamage = sd;
  }
};
const origPayoffHeal = P.payoffHeal;
P.payoffHeal = function (me: any, events: any[]) {
  origPayoffHeal.call(this, me, events);
  if (this._chaining) { this.cfg.specialDamage += KNOB.chainStep; tick('chainstrike'); }
};

// ---- heal / shield / write ---------------------------------------------------------------------
const origHeal = P.heal;
P.heal = function (me: any, amount: number, source: string, events: any[]) {
  origHeal.call(this, me, amount, source, events);
  // LEECH JAR (vamp): what your vamp charms heal also hits the enemy (through shields).
  if (me.side === 'player' && source === 'vamp' && has(me, 'leech') && !this.over && amount > 0) {
    const foe = this.sides.enemy;
    const dmg = Math.round(amount * KNOB.leech);
    const h = this.damage(foe, dmg, true);
    tick('leech');
    events.push({ type: 'attack', from: 'player', to: 'enemy', reels: [], amount: dmg, ...h, note: 'echo' });
    this.checkDeath(foe, events);
  }
};
const origThorns = P.thorns;
P.thorns = function (victim: any, attacker: any, events: any[]) {
  const bank = victim.side === 'player' ? victim.energy : 0;
  const before = this.thornsTurn;
  origThorns.call(this, victim, attacker, events);
  // ROSE HIP (BRIAR): a thorn volley heals you for a share of what it fired.
  if (bank > 0 && this.thornsTurn !== before && has(victim, 'rosehip') && !this.over) {
    const h = Math.round((bank * Number(process.env.ROSE ?? 0.25)) / 5) * 5;
    if (h > 0) { this.heal(victim, h, 'payoff', events); tick('rosehip'); }
  }
};
const origHit = P.hit;
P.hit = function (me: any, foe: any, amount: number, reels: number[], events: any[], pierce = false, note?: string) {
  const r = origHit.call(this, me, foe, amount, reels, events, pierce, note);
  // STATIC (TESLA): being attacked charges your lightning (once per enemy turn).
  if (foe.side === 'player' && amount > 0 && has(foe, 'static') && this.special && !this.over && this._staticTurn !== this.turn) {
    this._staticTurn = this.turn;
    tick('static');
    this.gainEnergy(foe, Number(process.env.STATIC ?? 20), [], events);
  }
  return r;
};
// TRANSFUSION (vamp alt): vamp healing past full HP is saved, and heals you after the fight (max 100).
export const BANKED = { hp: 0 };
const origHeal2 = P.heal;
P.heal = function (me: any, amount: number, source: string, events: any[]) {
  const room = me.maxHp - me.hp;
  origHeal2.call(this, me, amount, source, events);
  if (me.side === 'player' && source === 'vamp' && has(me, 'transfusion') && me.maxHp < 10000 && amount > room) { BANKED.hp = Math.min(100, BANKED.hp + amount - Math.max(0, room)); tick('transfusion'); }
};
const origReset = P.resetShield;
P.resetShield = function (c: any, events: any[]) {
  // SHIELD BASH (KNIGHT): shield left when your turn starts hits the enemy before it resets.
  if (c.side === 'player' && c.shield > 0 && has(c, 'bash') && !this.over) {
    const amt = Math.round((c.shield * KNOB.bashShare) / UNIT) * UNIT;
    if (amt > 0 && tick('bash')) this.hit(c, this.sides.enemy, amt, [], events);
  }
  // CHAINMAIL (KNIGHT alt): shield left when your turn starts heals you for half of it.
  if (c.side === 'player' && c.shield > 0 && has(c, 'mail') && !this.over) {
    const h = Math.round((c.shield * Number(process.env.MAIL ?? 0.5)) / 5) * 5;
    if (h > 0) { this.heal(c, h, 'payoff', events); tick('mail'); }
  }
  if (!this.over) origReset.call(this, c, events);
};
const WRITER_ABILITIES = new Set(['flood', 'blizzard', 'jam', 'pilfer', 'quake', 'carpet', 'curse', 'gulp', 'launder', 'mark', 'houseTake']);
const origWrite = P.write;
P.write = function (me: any, foe: any, sym: SymbolId, amount: number, reels: number[], events: any[]) {
  // HOLY WATER (general): the first thing an enemy writes on your reels each fight washes off.
  if (foe.side === 'player' && has(foe, 'holywater') && !this._hw && sym !== 'coin') {
    this._hw = true;
    tick('holywater');
    events.push({ type: 'fizzle', side: me.side, reels, symbol: sym });
    return;
  }
  const r = origWrite.call(this, me, foe, sym, amount, reels, events);
  if (foe.side === 'player' && has(foe, 'thornmail') && !this.over && foe.energy > 0) { this.thorns(foe, me, events); tick('thornmail'); }
  return r;
};
const origFire = P.fireAbility;
P.fireAbility = function (me: any, ab: any, events: any[]) {
  if (me.side === 'enemy' && has(this.sides.player, 'holywater') && !this._hw && WRITER_ABILITIES.has(ab.kind)) {
    this._hw = true;
    tick('holywaterAb');
    return;
  }
  const r = origFire.call(this, me, ab, events);
  if (me.side === 'enemy' && has(this.sides.player, 'thornmail') && !this.over && this.sides.player.energy > 0) { this.thorns(this.sides.player, me, events); tick('thornmailAb'); }
  return r;
};

// ---- step() wrapper: per-turn proposals -------------------------------------------------------
const origStep = P.step;
P.step = function () {
  const res = origStep.call(this);
  if (this.over) return res;
  const p = this.sides.player;
  const e = this.sides.enemy;
  if (res.side === 'player') {
    const spin = [...res.events].reverse().find((x: any) => x.type === 'spin' && x.side === 'player' && !x.bonus);
    const paid = spin?.score.groups.some((g: any) => g.amount > 0 && PAYING.has(g.symbol));
    if (this._encPending) { this._encPending = false; p.armed = true; p.energy = this.meterCost; }
    // JESTER'S BELLS (JAX): every WILD on your payline heals.
    if (has(p, 'jestheal') && spin) {
      const w = (spin.score.line as string[]).filter((x) => x === 'wild').length;
      if (w) { this.heal(p, w * Number(process.env.JEST ?? 20), 'payoff', res.events); tick('jestheal'); }
    }
    // RALLY (KNIGHT): every spin that pays stacks +step on your swords this fight.
    if (has(p, 'rally') && paid) this._rally = Math.min(KNOB.rallyCap, (this._rally ?? 0) + 1);
    // CONSOLATION PRIZE (general): a spin that pays nothing shields you.
    if (has(p, 'consolation') && spin && !paid) {
      p.shield += KNOB.consol;
      tick('consolation');
      res.events.push({ type: 'shieldGain', side: 'player', reels: [], amount: KNOB.consol, total: p.shield });
    }
    // OVERGROWN (BRIAR): a bank of `overgrow`+ fires on its own at the end of your turn.
    if (has(p, 'overgrown') && this.meter?.kind === 'thorns' && p.energy >= KNOB.overgrow) { this.thorns(p, e, res.events); tick('overgrown'); }
  } else if (has(p, 'bleed') && this._bleed > 0) {
    // BLEED ticks at the end of the enemy's turn, through shields.
    const h = this.damage(e, this._bleed, true);
    res.events.push({ type: 'attack', from: 'player', to: 'enemy', reels: [], amount: this._bleed, ...h, note: 'echo' });
    this.checkDeath(e, res.events);
  }
  return res;
};

// ---- run-level proposals (between fights) -----------------------------------------------------
SIM_BIAS.onFight = (run) => {
  const r = run.player.relics as string[];
  if (r.includes('stacked') && run.player.gilded.some((g) => g.symbol === 'wild')) tick('stackedOwned');
  if (r.includes('vault') && run.player.gilded.some((g) => g.symbol === 'goldbar')) tick('vaultOwned');
  if (r.includes('graft') && run.player.gilded.some((g) => g.symbol === 'thorn')) tick('graftOwned');
  if (r.includes('transfusion') && BANKED.hp > 0) { run.player.hp = Math.min(run.player.maxHp, run.player.hp + BANKED.hp); }
  BANKED.hp = 0;
  // SAFETY NET: start a fight below half HP: heal to half.
  if (r.includes('net') && run.player.hp < run.player.maxHp / 2) run.player.hp = Math.ceil(run.player.maxHp / 20) * 10;
  // TROPHY BELT: +10 max HP for every fight won (and healed by as much).
  if (r.includes('trophy') && run.depth + (run.act - 1) * 6 > 0) {
    run.player.maxHp += KNOB.trophy;
    run.player.hp += KNOB.trophy;
  }
  // PIGGY BANK: +1 chip per 5 you hold after each fight (max +4).
  if (r.includes('piggy')) run.player.chips += Math.min(4, Math.floor(run.player.chips / 5));
};

// ---- the table ------------------------------------------------------------------------------
type Pool = CabinetId[] | 'all';
const PROPOSALS: { id: string; pool: Pool; charm?: Enh; symbols?: [Enh, SymbolId][] }[] = [
  { id: 'bash', pool: 'all' },
  { id: 'rally', pool: ['knight'] },
  { id: 'vault', pool: ['midas'], symbols: [['gold', 'goldbar']] },
  { id: 'compound', pool: ['midas'] },
  { id: 'decree', pool: ['midas'] },
  { id: 'graft', pool: ['thorn'], symbols: [['gold', 'thorn'], ['keen', 'thorn'], ['vamp', 'thorn']] },
  { id: 'overgrown', pool: ['thorn'] },
  { id: 'rosehip', pool: ['thorn'] },
  { id: 'mail', pool: ['knight'] },
  { id: 'chain', pool: ['tesla'] },
  { id: 'faraday', pool: ['tesla'] },
  { id: 'stacked', pool: ['joker'], symbols: [['gold', 'wild'], ['keen', 'wild'], ['vamp', 'wild']] },
  { id: 'encore', pool: ['joker'] },
  { id: 'stacked2', pool: ['joker'], symbols: [['gold', 'wild'], ['keen', 'wild'], ['vamp', 'wild']] },
  { id: 'thornmail', pool: ['thorn'] },
  { id: 'encore2', pool: ['joker'] },
  { id: 'jestheal', pool: ['joker'] },
  { id: 'static', pool: ['tesla'] },
  { id: 'goldleaf', pool: 'all', charm: 'gold' },
  { id: 'bleed', pool: 'all', charm: 'keen' },
  { id: 'execute', pool: 'all', charm: 'keen' },
  { id: 'honelvl', pool: 'all', charm: 'keen' },
  { id: 'leech', pool: 'all', charm: 'vamp' },
  { id: 'transfusion', pool: 'all', charm: 'vamp' },
  { id: 'vampall', pool: 'all', charm: 'vamp', symbols: [['vamp', 'shield'], ['vamp', 'bolt'], ['vamp', 'goldbar'], ['vamp', 'thorn']] },
  { id: 'horseshoe3', pool: 'all', charm: 'lucky' },
  { id: 'horseshoe', pool: 'all', charm: 'lucky' },
  { id: 'horseshoe2', pool: 'all', charm: 'lucky' },
  { id: 'underdog', pool: 'all' },
  { id: 'consolation', pool: 'all' },
  { id: 'holywater', pool: 'all' },
  { id: 'piggy', pool: 'all' },
  { id: 'trophy', pool: 'all' },
  { id: 'net', pool: 'all' },
  { id: 'firststrike', pool: 'all' },
];

if (!process.env.NO_TABLE) table();
function table() {
const N = Number(process.argv[2] ?? 300);
const only = process.argv[3]?.split(',');
const f = (x: number) => x.toFixed(1).padStart(5);
const cabs = (p: Pool) => (p === 'all' ? CABINET_ORDER : p);
const run = (cab: CabinetId) => simulateRuns(defaultConfig(), N, 'greedy', 777, cab, 2, true);
const base: Record<string, number> = {};
const baseOnly: Record<string, number> = {};
const line = (label: string, cs: CabinetId[], get: (c: CabinetId) => number, ref: Record<string, number>) => {
  const w = cs.map(get);
  const avg = w.reduce((a, b) => a + b, 0) / w.length;
  const d = cs.map((c, i) => w[i] - (ref[c] ?? 0));
  console.log(`${label.padEnd(18)} ${f(avg)} (${d.reduce((a, b) => a + b, 0) / d.length >= 0 ? '+' : ''}${(d.reduce((a, b) => a + b, 0) / d.length).toFixed(1)}) | ${cs.map((c, i) => `${c} ${f(w[i])}`).join(' ')}`);
};
console.log(`N ${N} per machine, GREEN, greedy, seed 777. win% (delta vs baseline)`);
for (const c of CABINET_ORDER) base[c] = run(c).winPct;
line('BASELINE', CABINET_ORDER, (c) => base[c], {});
for (const p of PROPOSALS) {
  if (only && !only.includes(p.id)) continue;
  const added: [Enh, SymbolId][] = [];
  for (const [e, s] of p.symbols ?? []) if (!CHARM_SYMBOLS[e].includes(s)) { CHARM_SYMBOLS[e].push(s); added.push([e, s]); }
  SIM_BIAS.startRelic = p.id as any;
  line(`+${p.id}`, cabs(p.pool), (c) => run(c).winPct, base);
  if (p.charm) {
    SIM_BIAS.startRelic = undefined;
    SIM_BIAS.enh = p.charm;
    for (const c of CABINET_ORDER) baseOnly[c] = run(c).winPct;
    line(`  only ${p.charm}`, CABINET_ORDER, (c) => baseOnly[c], base);
    SIM_BIAS.startRelic = p.id as any;
    line(`  only ${p.charm} +${p.id}`, CABINET_ORDER, (c) => run(c).winPct, baseOnly);
    SIM_BIAS.enh = undefined;
  }
  console.log('   fired:', JSON.stringify(HIT));
  for (const k of Object.keys(HIT)) delete HIT[k];
  SIM_BIAS.startRelic = undefined;
  for (const [e, s] of added) CHARM_SYMBOLS[e].splice(CHARM_SYMBOLS[e].indexOf(s), 1);
}
}
