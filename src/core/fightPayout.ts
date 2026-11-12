/** What a spin pays out: each scored group, SECOND PAYLINE, CASSIDY's chips, VAMP and LUCRE, the meters and their payoffs, the lightning storm (split from fight.ts, 2026-11-05). */
import { UNIT, unitsRound, unitsUp, type Enh, type SymbolId } from './config';
import { charmValue, LUCRE_CHIPS, playerSymValue } from './charms';
import type { CombatEvent } from './events';
import { MIDAS_TOUCH_CAP, OVERCHARGE_ECHO, OVERCHARGE, FANG_HEAL, FANG_TESLA_HEAL, NEW_RELIC, LEGEND_RELIC } from './relics';
import { overtimeMul } from './enemies';
import { scoreLine, type LineScore, type ScoreGroup } from './scoring';
import { effectiveSymbol, insertOffscreen, wrap, type CellRef } from './strip';
import type { Fight } from './fight';
import { PAY, VOLUME, RAIN, PAYOFF_WORD, PAYING, type Combatant, other } from './fightRules';
import { write, recover, cleanse } from './fightTricks';

/** SECOND PAYLINE: score the row above your payline (its own matches; singles don't pay there) and resolve its pairs
 * and jackpots at half. Meters, Charms and relics stay the main payline's. */
export function secondLine(f: Fight, me: Combatant, events: CombatEvent[]): void {
  const line = me.reels.map((reel) => effectiveSymbol(reel.cells[wrap(reel.stop - 1, reel.cells.length)]));
  const lv = me.levels;
  const value = (s: SymbolId) => playerSymValue(lv, s, f.cfg.base[s]);
  const s = scoreLine(line, f.cfg, { value, wildAlone: f.wildAlone(me) });
  const groups = s.groups.filter((g) => g.matched && g.reels.length >= 2 && PAYING.has(g.symbol) && g.amount > 0);
  if (!groups.length) return;
  for (const g of groups) {
    g.amount = Math.max(UNIT, unitsRound(g.amount / 2));
    g.notes = [...(g.notes ?? []), 'X0.5 SECOND PAYLINE'];
  }
  events.push({ type: 'secondLine', side: me.side, line, groups: groups.map((g) => ({ symbol: g.symbol, reels: g.reels, amount: g.amount })) });
  // The second line hits, blocks and fills your meter; it pays no chips and heals nothing.
  f.lineTwo = true;
  try {
    for (const g of groups) {
      resolveGroup(f, me, g, s, events);
      if (f.over) return;
    }
  } finally {
    f.lineTwo = false;
  }
}

export function resolveGroup(f: Fight, me: Combatant, g: ScoreGroup, score: LineScore, events: CombatEvent[]): void {
  const foe = f.sides[other(me.side)];
  const player = me.side === 'player';
  switch (g.symbol) {
    case 'sword':
    case 'note':
    case 'ace': {
      // (COUP DE GRACE is in the score now.) KEEN: a keen sword in the group pierces shields. (An enemy's LATE
      // multiplier is already in its amount.)
      f.hit(me, foe, g.amount, g.reels, events, !!g.pierce, undefined, true);
      vampHeal(f, me, g, events);
      return;
    }
    case 'seven':
      // Sevens are the House's heavy hitters.
      f.hit(me, foe, g.amount, g.reels, events, false, undefined, true);
      return;
    case 'shield':
      me.shield += g.amount;
      events.push({ type: 'shieldGain', side: me.side, reels: g.reels, amount: g.amount, total: me.shield });
      vampHeal(f, me, g, events);
      // BULWARK: each bulwark shield also deals a share of its shield as damage.
      if (player && g.amount > 0 && !f.over) {
        const share = g.amount / Math.max(1, g.reels.length);
        const pct = g.reels.reduce((a, r) => a + f.enhsAt(me, r).filter((e) => e === 'spiked').length, 0) * charmValue('spiked', f.charmLvl(me, 'spiked'));
        const dmg = Math.round((share * pct) / 100 / UNIT) * UNIT;
        if (dmg > 0) f.hit(me, foe, dmg, g.reels, events);
      }
      return;
    case 'bolt':
      // Only TESLA (or the bare engine) has a special.
      if (player && !f.special) break;
      gainEnergy(f, me, g.amount, g.reels, events);
      vampHeal(f, me, g, events);
      return;
    case 'goldbar':
      if (!player || f.meter?.symbol !== g.symbol) break;
      // CASH CASSIDY: every chip symbol pays a chip (1, 2 or 3; no cap: MAKE IT RAIN spends them).
      if (g.symbol === 'goldbar' && f.meter.kind === 'vault') {
        // (SECOND PAYLINE's chips hit, but pay no chips.)
        const got = f.lineTwo ? 0 : Math.max(1, g.reels.length - RAIN.chipLess);
        if (got) {
          f.midasChips += got;
          events.push({ type: 'midasChips', side: me.side, amount: got, total: f.midasChips });
        }
        // Chips are CASSIDY's weapon: a chip group hits for its pay (MAKE IT RAIN is the big version).
        if (g.rain) makeItRain(f, me, g, events);
        else if (g.amount > 0) f.hit(me, f.sides[other(me.side)], g.amount + depositOnce(f, me, events), g.reels, events);
        if (f.over) return;
      }
      fillMeter(f, me, g.amount, g.reels, events);
      vampHeal(f, me, g, events);
      return;
  }
  if (me.casts.has(g.symbol)) {
    write(f, me, foe, g.symbol, g.amount, g.reels, events);
    return;
  }
  // A slime jackpot cleanses every slimed cell; a slime pair cleanses the slime on its own reels (user, 2026-10-13).
  if (g.symbol === 'slime' && g.matched && f.cfg.cleanseOnSlimeTriple && g.reels.length >= 2) {
    cleanse(f, me, g.reels, events, g.reels.length < 3);
    return;
  }
  // A jackpot of stolen (empty) cells gets EVERYTHING back, the way slime's cleanse does.
  if (g.symbol === 'empty' && g.matched && g.reels.length >= 3) {
    recover(f, me, events);
    return;
  }
  void score;
  events.push({ type: 'fizzle', side: me.side, reels: g.reels, symbol: g.symbol });
}

/** MIDAS TOUCH fires: each sword and shield on the payline gains a gold touch, and every extra full meter touches one more sword or shield anywhere on your reels. */
export function midasTouch(f: Fight, me: Combatant, line: SymbolId[], touchable: (r: number) => boolean): { reel: number; index: number; n: number }[] {
  const out = new Map<object, { reel: number; index: number; n: number }>();
  const bump = (reel: number, index: number) => {
    const c = me.reels[reel].cells[index];
    if (!c || (c.symbol !== 'sword' && c.symbol !== 'shield') || c.slimed || c.stolen) return false;
    const n = f.touches.get(c) ?? 0;
    if (n >= MIDAS_TOUCH_CAP) return false;
    f.touches.set(c, n + 1);
    out.set(c, { reel, index, n: n + 1 });
    return true;
  };
  line.forEach((_x, r) => {
    if (!touchable(r)) return;
    bump(r, me.reels[r].stop);
  });
  const k = Math.max(1, Math.floor(me.energy / f.meterCost));
  for (let i = 1; i < k; i++) {
    const pool = me.reels.flatMap((reel, r) => reel.cells.flatMap((c, index) => ((c.symbol === 'sword' || c.symbol === 'shield') && !c.slimed && !c.stolen && (f.touches.get(c) ?? 0) < MIDAS_TOUCH_CAP ? [{ r, index }] : [])));
    if (!pool.length) break;
    const p = f.rng.pick(pool);
    bump(p.r, p.index);
  }
  f.touchSpend = k * f.meterCost;
  return [...out.values()];
}

/**
 * THE DROP: the notes off the payline (rows above and below). What enemies wrote counts: a slimed, stolen or dead-card
 * cell isn't a note, a jammed reel sits out, a jinxed reel pays half (unless the payline's jinx
 * already halves the group), and a counterfeit Charm does nothing. A LUCKY cell rolls: a WILD plays as a note (user, 2026-10-08).
 */
export function dropNotes(f: Fight, me: Combatant, groupHexed = false): { cells: { reel: number; row: number; v?: number; wild?: true }[]; base: number; echoes: number; keen: boolean; vamp: number } {
  const out = { cells: [] as { reel: number; row: number; v?: number; wild?: true }[], base: 0, echoes: 0, keen: false, vamp: 0 };
  const noteV = playerSymValue(me.levels, 'note', f.cfg.base.note);
  me.reels.forEach((reel, r) => {
    if (me.locked[r] > 0) return;
    const hexed = me.hexed[r] > 0;
    for (const d of [-1, 1]) {
      const c = reel.cells[(reel.stop + d + reel.cells.length) % reel.cells.length];
      if (!c) continue;
      const sym = effectiveSymbol(c);
      const enh = c.enh && !((c.faked ?? 0) > 0) ? c.enh : undefined;
      const wild = sym !== 'note' && sym !== 'wild' && PAYING.has(sym) && enh === 'lucky' && f.rng.next() < charmValue('lucky', f.charmLvl(me, 'lucky')) / 100;
      if (sym !== 'note' && sym !== 'wild' && !wild) continue;
      let v = noteV;
      if (enh === 'keen') {
        v += charmValue('keen', f.charmLvl(me, 'keen'));
        out.keen = true;
      }
      // GOLD off the payline multiplies its own note (it doesn't add to the payline's gold: x6 on 9 cells was too much).
      if (enh === 'gold') v *= charmValue('gold', f.charmLvl(me, 'gold'));
      if (enh === 'echo') out.echoes++;
      if (enh === 'vamp') out.vamp = Math.max(out.vamp, charmValue('vamp', f.charmLvl(me, 'vamp')));
      out.base += hexed && !groupHexed ? Math.floor(v / 2) : v;
      out.cells.push({ reel: r, row: d + 1, v: hexed && !groupHexed ? Math.floor(v / 2) : v, ...(wild ? { wild: true as const } : {}) });
    }
  });
  return out;
}

/** THE JUKEBOX: turn the volume up n (BLOOD PACT doubles it); a full volume arms THE DROP. */
export function turnUp(f: Fight, me: Combatant, n: number, reels: number[], events: CombatEvent[], dropsNow = false): void {
  if (me.armed || n <= 0) return;
  const add = n * UNIT * (f.cfg.player.meterMul ?? 1);
  me.energy = Math.min(f.meterCost, me.energy + add);
  me.armed = me.energy >= f.meterCost;
  events.push({ type: 'meter', side: me.side, reels, amount: add, total: me.energy, ...(me.armed ? { armed: true } : {}), ...(me.armed && dropsNow ? { dropsNow: true } : {}) });
}

/** THE JUKEBOX, after a spin: THE DROP plays out, or the volume goes up (notes) or skips down (no note). */
export function volumeAfterSpin(f: Fight, me: Combatant, line: SymbolId[], score: LineScore, events: CombatEvent[]): void {
  if (f.dropNow) {
    // THE DROP hit with the note group (score); the off-payline vamp heals now.
    const vamp = f.dropOff?.vamp ?? 0;
    if (vamp) f.heal(me, vamp, 'vamp', events);
    if (f.over) return;
    me.armed = false;
    me.energy = (me.relics.has('turntable') ? VOLUME.turntable : VOLUME.after) * UNIT;
    if (me.relics.has('turntable')) events.push({ type: 'relic', side: me.side, relic: 'turntable' });
    events.push({ type: 'payoff', side: me.side, kind: 'volume', left: me.energy });
    // SUBWOOFER (the shield build's DROP, 2026-11-01 trial, Body Slam's shape): THE DROP also hits for all the shield
    // you hold (a shield lasts one enemy turn, so a shield DROP did little; this cashes the shield build in).
    // (Not on an enemy already down this spin: deaths resolve at the turn's end, and the icon popped for a hit that
    // never landed: QA COMBOS-11.)
    if (me.relics.has('subwoofer') && me.shield > 0 && !f.over && f.sides[other(me.side)].hp > 0) {
      events.push({ type: 'relic', side: me.side, relic: 'subwoofer' });
      f.hit(me, f.sides[other(me.side)], me.shield, [], events);
      if (f.over) return;
    }
    payoffHeal(f, me, events);
    return;
  }
  // Notes on the payline turn it up; a WILD counts only when it pairs as a note (user, 2026-10-08).
  const noteGroups = score.groups.filter((g) => g.symbol === 'note');
  const reels = line.flatMap((s, r) => (s === 'note' || (s === 'wild' && noteGroups.some((g) => g.reels.includes(r))) ? [r] : []));
  if (reels.length) turnUp(f, me, reels.length, reels, events);
  else if (me.energy > 0 && !me.armed && !me.relics.has('mixtape')) {
    // The record skips.
    const drop = Math.min(me.energy, VOLUME.skip * UNIT);
    me.energy -= drop;
    events.push({ type: 'meter', side: me.side, reels: [], amount: -drop, total: me.energy });
  } else if (me.relics.has('mixtape') && me.energy > 0 && !me.armed) events.push({ type: 'relic', side: me.side, relic: 'mixtape' });
}

/** SAFE DEPOSIT: your first chip hit each spin also deals this spin's shield (x safeDepositMul). */
export function depositOnce(f: Fight, me: Combatant, events: CombatEvent[]): number {
  if (me.side !== 'player' || !me.relics.has('safedeposit') || f.depositSpin === f.turn || f.lastScoreShield <= 0) return 0;
  f.depositSpin = f.turn;
  events.push({ type: 'relic', side: me.side, relic: 'safedeposit' });
  return unitsRound(f.lastScoreShield * NEW_RELIC.safeDepositMul);
}

export function makeItRain(f: Fight, me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
  const foe = f.sides[other(me.side)];
  // A rain that hits no harder than the chip jackpot it replaced is on the house (QA call 6).
  const free = !!g.rainFree;
  const cost = free ? 0 : f.rainCost(me);
  events.push({ type: 'makeItRain', side: me.side, reels: g.reels, chips: f.chipsNow(), cost, total: f.midasChips - cost, free });
  // (No pop under OPEN BAR, or on a free rain: RAINMAKER saved nothing. QA COMBOS-06.)
  if (me.relics.has('rainmaker') && !me.relics.has('openbar') && !free) events.push({ type: 'relic', side: me.side, relic: 'rainmaker' });
  f.hit(me, foe, g.amount + depositOnce(f, me, events), g.reels, events);
  f.midasChips -= cost;
  events.push({ type: 'midasChips', side: me.side, amount: -cost, total: f.midasChips });
}

/**
 * Charms that act when their group lands: the meter charm (TRICK fills JOKER's meter) and LUCRE's chips.
 */
export function cellCharms(f: Fight, me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
  const n = (e: Enh) => g.reels.filter((r) => f.enhsAt(me, r).includes(e)).length;
  const v = (e: Enh) => charmValue(e, f.charmLvl(me, e));
  const kind = f.meter?.kind;
  const copies = charmCopies(g);
  if (kind === 'jackpots' && n('trick')) fillMeter(f, me, n('trick') * v('trick') * copies, g.reels, events);
  const pays = g.amount > 0 && (PAYING.has(g.symbol) || g.symbol === 'goldbar');
  if (pays && n('lucre') && f.lucreChips < v('lucre')) {
    const got = Math.min(LUCRE_CHIPS * copies, v('lucre') - f.lucreChips);
    f.lucreChips += got;
    events.push({ type: 'lucreChips', side: me.side, reels: g.reels, amount: got, total: f.lucreChips });
  }
}

/**
 * A jackpot of one cell (JOKER's meter payoff) counts that cell's Charm three times, as if it had landed on all three
 * reels (user, 2026-11-10: "that's a jackpot for the vamp charm... that's how all the charms should be").
 */
export const charmCopies = (g: ScoreGroup): number => (g.jackpot && g.reels.length === 1 ? 3 : 1);

/** VAMP: every vamp cell in a group that pays heals you (a one-cell jackpot counts its cell three times). */
export function vampHeal(f: Fight, me: Combatant, g: ScoreGroup, events: CombatEvent[]): void {
  if (f.over || g.amount <= 0 || f.lineTwo) return;
  // Once per VAMP cell (user, 2026-11-10: "make three vamps in a normal jackpot heal three times too"; it was once per
  // group since EXPERT_PLAYTEST_10 D1, when stacked vamp was the auto-pick).
  const cells = g.reels.filter((r) => f.enhsAt(me, r).includes('vamp')).length * charmCopies(g);
  const vamp = charmValue('vamp', f.charmLvl(me, 'vamp'));
  for (let i = 0; i < cells && !f.over; i++) f.heal(me, vamp, 'vamp', events);
}

/** MIDAS / JAX: the full meter pays off this spin — it empties, and you heal. */
export function payoff(f: Fight, me: Combatant, score: LineScore, events: CombatEvent[]): void {
  if (score.jackpots) {
    me.armed = false;
    // ENCORE: the meter keeps a share after it pays.
    me.energy = me.side === 'player' && me.relics.has('encore') ? unitsUp(f.meterCost * NEW_RELIC.encoreKeep) : 0;
    if (me.energy > 0) events.push({ type: 'relic', side: me.side, relic: 'encore' });
    events.push({ type: 'payoff', side: me.side, kind: 'jackpots' });
    // HOUSE OF CARDS: each payoff adds a WILD to reel 2 for the rest of the fight.
    if (me.side === 'player' && me.relics.has('houseofcards')) {
      // The view mirrors the inserts (it used to miss them, so a later cell index ran past its strip: a crash).
      const inserts: CellRef[] = f.rng
        .shuffle(me.reels.map((reel, idx) => ({ reel, idx })))
        .slice(0, 2)
        .map(({ reel, idx }) => ({ reel: idx, index: insertOffscreen(reel, { symbol: 'wild', slimed: false }, f.rng) }));
      events.push({ type: 'relic', side: me.side, relic: 'houseofcards', inserts });
    }
    return;
  }
  if (f.meter?.kind === 'vault') {
    // It rests at 3/4 of its pre-fill after a payoff (full made the House a regen engine: EXPERT_PLAYTEST_5).
    me.energy = Math.floor((f.vaultBase() * 3) / 4 / UNIT) * UNIT;
    me.armed = false;
    events.push({ type: 'payoff', side: me.side, kind: 'vault', left: me.energy, mul: f.vaultPaid });
    f.vaultPaid = 0;
    return;
  }
  // MIDAS TOUCH spends what it used; gold past that stays.
  me.energy = Math.max(0, me.energy - f.touchSpend);
  f.touchSpend = 0;
  me.armed = me.energy >= f.meterCost;
  events.push({ type: 'payoff', side: me.side, kind: 'touch', left: me.energy });
}

/** After a payoff's groups resolved: its heal (+ Vampire Fang) and the Overcharge echo. */
export function payoffAfter(f: Fight, me: Combatant, _score: LineScore, events: CombatEvent[], from: number): void {
  const foe = f.sides[other(me.side)];
  const dealt = events.slice(from).reduce((a, e) => a + (e.type === 'attack' && e.from === me.side ? e.amount : 0), 0);
  payoffHeal(f, me, events);
  if (!f.over && me.relics.has('overcharge') && dealt > 0 && foe.hp > 0) {
    events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
    f.hit(me, foe, Math.max(1, Math.round(dealt * OVERCHARGE_ECHO)), [], events, false, 'echo');
  }
}

/** Every meter payoff heals (the machine's own heal, plus Vampire Fang). */
export function payoffHeal(f: Fight, me: Combatant, events: CombatEvent[], times = 1, fangTimes = times): void {
  if (me.side !== 'player' || f.over) return;
  // One heal, its parts named (user, 2026-10-13: "what's healing me 15?"): the meter's own and VAMPIRE FANG.
  const parts = [
    { label: PAYOFF_WORD[f.meter?.kind ?? ''] ?? 'METER', amount: (f.meter?.heal ?? 0) * times },
    { label: 'ROOM SERVICE', amount: me.relics.has('fang') ? (f.special ? FANG_TESLA_HEAL : FANG_HEAL) * fangTimes : 0 },
  ].filter((x) => x.amount > 0);
  if (!parts.length) return;
  if (me.relics.has('fang')) events.push({ type: 'relic', side: me.side, relic: 'fang' });
  f.heal(me, parts.reduce((a, x) => a + x.amount, 0), 'payoff', events, parts.length > 1 ? parts : undefined);
}

/** JACKPOT BELL on BANKROLL: the HIGH ROLLER bar fills all the way (audit 2026-11-01: it added one pip). */
export function fillVault(f: Fight, me: Combatant, events: CombatEvent[]): void {
  if (me.armed) return;
  const add = f.meterCost - me.energy;
  me.energy = f.meterCost;
  me.armed = true;
  events.push({ type: 'meter', side: me.side, reels: [], amount: add, total: me.energy, armed: true });
}

/** MIDAS / JAX: fill the signature meter (a full MIDAS / JAX meter locks until it pays off). */
export function fillMeter(f: Fight, me: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
  if (me.side !== 'player' || !f.meter) return;
  amount *= f.cfg.player.meterMul ?? 1;
  // MIDAS VAULT: +1 pip per gold bar landed; locks when full.
  if (f.meter.kind === 'vault') {
    if (me.armed) return;
    const add = Math.max(1, reels.length) * UNIT * (f.cfg.player.meterMul ?? 1);
    me.energy = Math.min(f.meterCost, me.energy + add);
    if (me.energy >= f.meterCost) me.armed = true;
    events.push({ type: 'meter', side: me.side, reels, amount: add, total: me.energy, ...(me.armed ? { armed: true } : {}) });
    return;
  }
  // MIDAS: gold is never wasted: it keeps counting past full (each touch spends one full meter).
  if (f.meter.kind === 'touch') {
    me.energy += amount;
    if (me.energy >= f.meterCost) me.armed = true;
    events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}) });
    return;
  }
  if (me.armed) {
    events.push({ type: 'meter', side: me.side, reels, amount: 0, total: me.energy, armed: true, wasted: amount });
    return;
  }
  me.energy = Math.min(f.meterCost, me.energy + amount);
  if (me.energy >= f.meterCost) me.armed = true;
  events.push({ type: 'meter', side: me.side, reels, amount, total: me.energy, ...(me.armed ? { armed: true } : {}) });
}

/** Every lightning boost as a share of a full strike: BLAZE's flat damage, OVERCHARGE, LIVE WIRE, MELTDOWN, CHAIN. */
export function lightningBoost(f: Fight, me: Combatant): number {
  const over = me.relics.has('overcharge') ? OVERCHARGE.lightning : 0;
  const live = me.relics.has('livewire') ? NEW_RELIC.livewireMul : 0;
  const melt = me.relics.has('meltdown') ? Math.min(NEW_RELIC.meltdownCap, Math.max(0, me.maxHp - me.hp) * NEW_RELIC.meltdownRate) : 0;
  const chain = me.relics.has('chainlightning') ? LEGEND_RELIC.chainAdd : 0;
  return over + live + melt + chain + f.blaze / Math.max(1, f.strikeBase);
}

export function gainEnergy(f: Fight, me: Combatant, amount: number, reels: number[], events: CombatEvent[]): void {
  if (me.side === 'player') amount *= f.cfg.player.meterMul ?? 1;
  // TESLA, one axis: the boosts make more bolts (a storm grows longer, never each bolt bigger).
  if (me.side === 'player' && f.oneAxis) amount = Math.round(amount * (1 + lightningBoost(f, me)));
  me.energy += amount;
  events.push({ type: 'energyGain', side: me.side, reels, amount, total: me.energy });
  if (f.stormHold === me.side) f.stormPending = true;
  else storm(f, me, events);
}

/** A LIGHTNING STORM: strikes while the charge covers one. */
export function storm(f: Fight, me: Combatant, events: CombatEvent[]): void {
  const STORM_ROLL = 64;
  const foe = f.sides[other(me.side)];
  const pierce = f.cfg.specialIgnoresShield;
  // OVERCHARGE (TESLA): every strike hits 30% harder. It used to fire an echo strike after each one, which spammed
  // through a LIGHTNING STORM (user playtest); it pops once per storm now.
  const over = me.relics.has('overcharge');
  const live = me.side === 'player' && me.relics.has('livewire');
  let overPopped = false;
  let strikes = 0;
  while (me.energy >= f.cfg.specialCost && !f.over && foe.hp > 0) {
    me.energy -= f.cfg.specialCost;
    const raw = f.cfg.specialDamage + (me.side === 'player' && !f.oneAxis ? f.blaze : 0);
    // MELTDOWN: +1% per 1% of HP you're missing (capped).
    const melt = me.side === 'player' && me.relics.has('meltdown') ? Math.min(NEW_RELIC.meltdownCap, Math.max(0, me.maxHp - me.hp) * NEW_RELIC.meltdownRate) : 0;
    // CHAIN LIGHTNING (legendary relic): +100%.
    const chain = me.side === 'player' && me.relics.has('chainlightning') ? LEGEND_RELIC.chainAdd : 0;
    // PAY.lightningAdd: the lightning's boosts add up instead of multiplying.
    let dmg = me.side === 'player' && f.oneAxis
      ? raw
      : PAY.lightningAdd
      ? unitsUp(raw * (1 + (over ? OVERCHARGE.lightning : 0) + (live ? NEW_RELIC.livewireMul : 0) + melt + chain))
      : unitsUp(raw * (1 + (over ? OVERCHARGE.lightning : 0)) * (live ? 1 + NEW_RELIC.livewireMul : 1) * (1 + melt) * (1 + chain));
    // OVERTIME grows each strike (a hit), not the charge behind it.
    if (f.cfg.overtime && overtimeMul(f.turn) > 1) dmg = unitsUp(dmg * overtimeMul(f.turn));
    if (over && !overPopped) {
      overPopped = true;
      events.push({ type: 'relic', side: me.side, relic: 'overcharge' });
    }
    if (melt > 0 && strikes === 0) events.push({ type: 'relic', side: me.side, relic: 'meltdown' });
    if (chain && strikes === 0) events.push({ type: 'relic', side: me.side, relic: 'chainlightning' });
    // Past STORM_ROLL strikes, the rest of the charge lands as one hit of the same total (stress test 2026-11-02: a
    // late ENDLESS TESLA fired 8,500-45,000 strikes in one turn, seconds of work for the same result).
    let n = 1;
    if (strikes >= STORM_ROLL) {
      n += Math.floor(me.energy / f.cfg.specialCost);
      me.energy -= (n - 1) * f.cfg.specialCost;
    }
    const h = f.damage(foe, dmg * n, pierce);
    events.push({ type: 'specialFire', from: me.side, to: foe.side, amount: dmg * n, ...h, energyLeft: me.energy, ...(n > 1 ? { strikes: n } : {}) });
    f.checkDeath(foe, events);
    strikes += n;
  }
  // Every strike heals a little (TESLA's payoff heal), plus Vampire Fang: once per storm, for all its strikes (one heal
  // after each strike spammed through a LIGHTNING STORM: user playtest).
  // LIVE WIRE: each storm costs HP, once a storm (never per strike), never lethal, outside damage() and its turn cap.
  if (live && strikes > 0 && !f.over) {
    const cost = Math.min(me.hp - 1, NEW_RELIC.livewireCost);
    if (cost > 0) {
      me.hp -= cost;
      events.push({ type: 'relic', side: 'player', relic: 'livewire' });
      events.push({ type: 'hpCost', side: 'player', amount: cost, hp: me.hp });
    }
  }
  // TESLA, one axis: the storm heals once (it healed per bolt: 72-bolt storms walked through THE DEALER).
  // (OVERLOAD, TESLA in ENDLESS: the storm's heal grows with the loop too.)
  // OVERLOAD (ENDLESS) grows the storm's own heal; ROOM SERVICE's "15 MORE" stays 15 a storm (it grew x the loop:
  // QA COMBOS-13).
  if (me.side === 'player' && strikes > 0) payoffHeal(f, me, events, f.oneAxis ? Math.round(PAY.stormHeal * (f.cfg.player.veteranMul ?? 1)) : strikes, f.oneAxis ? PAY.stormHeal : strikes);
}
