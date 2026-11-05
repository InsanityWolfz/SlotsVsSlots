/** Hits, damage and heals, shield resets, and deaths with their saves (PHOENIX, PARACHUTE, the Dealer's hands) (split from fight.ts, 2026-11-05). */
import { UNIT, unitsRound } from './config';
import type { CombatEvent, HealSource } from './events';
import { NEW_RELIC, POT } from './relics';
import { ENDLESS, OWNER_RULES, rungsClimbed, TUNE, WHEEL_RULES } from './enemies';
import type { Fight } from './fight';
import { DEALER_RULES, DEALER_HANDS, type Combatant, other } from './fightRules';
import { gainEnergy } from './fightPayout';

export function resetShield(f: Fight, c: Combatant, events: CombatEvent[]): void {
  // INSURANCE (audit 2026-11-01): its shield lands on the enemy's turn, so it skips one reset and blocks their next spin.
  const keep = c.side === 'player' ? Math.min(f.insuranceKeep, c.shield) : 0;
  if (c.side === 'player') f.insuranceKeep = 0;
  c.shield -= keep;
  resetShieldBody(f, c, events);
  if (keep > 0 && !f.over) {
    c.shield += keep;
    events.push({ type: 'shieldGain', side: 'player', reels: [], amount: keep, total: c.shield, source: 'insurance' });
  }
}

export function resetShieldBody(f: Fight, c: Combatant, events: CombatEvent[]): void {
  if (c.shield <= 0) return;
  if (c.side === 'player' && !f.over) {
    const held = c.shield;
    // SHIELD BASH: leftover shield hits back for half before it resets.
    if (c.relics.has('bash')) {
      const amt = Math.round((held * NEW_RELIC.bashShare) / UNIT) * UNIT;
      if (amt > 0) {
        events.push({ type: 'relic', side: 'player', relic: 'bash' });
        hit(f, c, f.sides.enemy, amt, [], events);
      }
    }
    // CAPACITOR (TESLA): leftover shield charges lightning before it resets.
    if (!f.over && f.special && c.relics.has('capacitor')) {
      const q = Math.round(held * NEW_RELIC.capacitorShare);
      if (q > 0) {
        events.push({ type: 'relic', side: 'player', relic: 'capacitor' });
        gainEnergy(f, c, q, [], events);
      }
    }
    if (f.over) return;
    // TOWER SHIELD (KNIGHT): half the leftover shield stays (capped, since SHIELD BASH reads it again next turn).
    if (c.relics.has('tower')) {
      const keep = Math.min(Math.round(held * NEW_RELIC.towerShare), Math.round(c.maxHp * NEW_RELIC.towerCap));
      if (keep > 0) {
        events.push({ type: 'relic', side: 'player', relic: 'tower' });
        events.push({ type: 'shieldReset', side: c.side, lost: c.shield - keep });
        c.shield = keep;
        return;
      }
    }
  }
  events.push({ type: 'shieldReset', side: c.side, lost: c.shield });
  c.shield = 0;
}

/** Enemy damage: the fight's knob x ENDLESS (LAST CALL after enemy turn 40) x ATTRITION (act 3). */
export function enemyDmgMul(f: Fight, events?: CombatEvent[]): number {
  // The fight's damage knob (TUNE.enemyDmg, elites hit harder, endless loops); it used to apply only in endless.
  let mul = (f.cfg.enemy.dmgMul ?? 1) * (f.cfg.enemy.stakeDmg ?? 1) * (f.cfg.enemy.lineDmg ?? 1) * (1 + OWNER_RULES.phaseDmg * f.ownerPhase);
  // THE OWNER escalates every turn (OWNER_RULES.rise).
  if (f.cfg.enemy.owner) mul *= 1 + OWNER_RULES.rise * Math.floor(f.turn / 2);
  if (f.cfg.enemy.endless) {
    const late = Math.floor(f.turn / 2) - ENDLESS.lastCall;
    if (late > 0 && !f.lastCall && events) {
      f.lastCall = true;
      events.push({ type: 'lastCall', side: 'enemy' });
    }
    mul *= late > 0 ? 1 + ENDLESS.lastCallStep * late : 1;
  }
  // THE DEALER's second and third hands: its hits are raised.
  if (f.isDealer && f.dealerHand >= 2) mul *= DEALER_RULES.raiseMul;
  // (OVERTIME replaces act 3's ramp: it grows both machines' pays instead.)
  if ((f.cfg.enemy.act ?? 1) >= 3 && !f.cfg.overtime) mul *= Math.min(TUNE.rampMax, 1 + TUNE.rampPerTurn * Math.max(0, Math.floor(f.turn / 2) - 2));
  return mul;
}

export function hit(
  f: Fight,
  me: Combatant,
  foe: Combatant,
  amount: number,
  reels: number[],
  events: CombatEvent[],
  pierce = false,
  note?: 'drain' | 'mimic' | 'echo',
  scaled = false,
): number {
  // Nothing hits a machine that already fell this turn (its death resolves at the end of the turn).
  if (foe.hp <= 0) return 0;
  // ENDLESS (per loop, LAST CALL after enemy turn 40) and ATTRITION (act 3: +6% per enemy turn after the 2nd, max x2).
  // Scored swords and sevens carry it already (it shows on their banner).
  if (me.side === 'enemy' && amount > 0 && !scaled) {
    const mul = enemyDmgMul(f, events);
    if (mul !== 1) amount = Math.min(ENDLESS.clamp, Math.round((amount * mul) / UNIT) * UNIT || amount);
  }
  const pierced = pierce && foe.shield > 0;
  // ACT 3 COVER CHARGE: the first enemy attack each fight puts at least 10% of your max HP through your shield.
  if (me.side === 'enemy' && f.act3Regular && !f.coverTaken && amount > 0) {
    f.coverTaken = true;
    const cut = Math.min(amount, Math.max(UNIT, Math.round((foe.maxHp * TUNE.coverCharge) / UNIT) * UNIT));
    const c = damage(f, foe, cut, true);
    if (c.hpDamage > 0) events.push({ type: 'coverCharge', side: foe.side, amount: c.hpDamage });
    amount -= cut;
    if (amount <= 0) {
      checkDeath(f, foe, events);
      return c.hpDamage;
    }
  }
  const h = damage(f, foe, amount, pierce);
  events.push({ type: 'attack', from: me.side, to: foe.side, reels, amount, ...h, ...(pierced ? { note: 'pierce' as const } : note ? { note } : {}) });
  checkDeath(f, foe, events);
  return h.hpDamage;
}

export function heal(f: Fight, me: Combatant, amount: number, source: HealSource, events: CombatEvent[], parts?: { label: string; amount: number }[]): void {
  const full = amount;
  // A side at 0 HP is dead when the turn settles: no heal brings it back (a storm's heals on the enemy's turn used to
  // revive TESLA from 0 HP: ENDLESS playtest, 2026-10-14).
  if (me.hp <= 0) return;
  // THE OWNER never heals: his HP is a count of hits.
  if (me.side === 'enemy' && f.cfg.enemy.owner) return;
  if (me.side === 'player' && f.cfg.player.healMul) amount = Math.max(1, Math.round(amount * f.cfg.player.healMul));
  const n = Math.min(amount, me.maxHp - me.hp);
  if (n > 0) {
    me.hp += n;
    // (The parts only when they add up to what landed: capped at max HP or halved, they'd read wrong.)
    events.push({ type: 'heal', side: me.side, amount: n, hp: me.hp, source, ...(parts && n === full ? { parts } : {}) });
  }
}

export function damage(f: Fight, target: Combatant, amount: number, ignoreShield: boolean) {
  const blocked = ignoreShield ? 0 : Math.min(target.shield, amount);
  target.shield -= blocked;
  amount = Math.min(ENDLESS.clamp, amount);
  let hpDamage = Math.min(target.hp, amount - blocked);
  // ONE-TURN CAP on you: no turn takes more than 40% of your max HP (60% for bosses): no turn-2 one-shots (EXPERT_PLAYTEST_3 E2).
  if (target.side === 'player') {
    // (THE OWNER has his own, higher cap: OWNER_RULES.capOnYou.)
    const capShare = f.cfg.enemy.owner ? OWNER_RULES.capOnYou + OWNER_RULES.rise * Math.floor(f.turn / 2) : f.isDealer && !f.bigTurn ? TUNE.dealerQuietCap : f.isBoss || f.isWheel || f.isDealer ? TUNE.bossTurnCap : TUNE.turnCap;
    const cap = Math.round(target.maxHp * capShare);
    hpDamage = Math.max(0, Math.min(hpDamage, cap - f.playerTurnHp));
    f.playerTurnHp += hpDamage;
  }
  // THE WHEEL's half-HP gate (the Mirror's old crack gate): it holds at half HP for the rest of the turn it SPINS
  // FASTER on, so both halves of the fight always play. (GREEN starts fast: no phase, no gate.)
  if (target.side === 'enemy' && f.isWheel && !f.fastFromStart) {
    if (f.gateTurn === f.turn) hpDamage = 0;
    else if (!f.fast) hpDamage = Math.min(hpDamage, Math.max(0, target.hp - Math.floor(target.maxHp / 2)));
  }
  target.hp -= hpDamage;
  if (target.hp <= 0 && target.side === 'enemy') f.overkill = amount - blocked - hpDamage;
  // INSURANCE POLICY: the first drop under 25% HP each fight pays out (the shield lands when the hit is settled).
  if (target.side === 'player' && target.hp > 0 && target.relics.has('insurance') && !f.insuranceUsed && target.hp < target.maxHp * NEW_RELIC.insuranceShare) {
    f.insuranceUsed = true;
    f.insurancePending = true;
  }
  return { blocked, hpDamage, targetHp: target.hp, targetShield: target.shield };
}

export function checkDeath(f: Fight, c: Combatant, events: CombatEvent[]): void {
  // THE OWNER's phases: each of the ladder's first three rungs you climb, he gets harder (once each).
  if (c.side === 'enemy' && f.cfg.enemy.owner && c.hp > 0) {
    const phase = Math.min(OWNER_RULES.phases.length, rungsClimbed(c.maxHp - c.hp));
    if (phase > f.ownerPhase) {
      f.ownerPhase = phase;
      events.push({ type: 'ownerPhase', side: 'enemy', phase });
    }
  }
  if (f.insurancePending && c.side === 'player' && c.hp > 0) {
    f.insurancePending = false;
    c.shield += NEW_RELIC.insuranceShield;
    f.insuranceKeep = NEW_RELIC.insuranceShield;
    events.push({ type: 'relic', side: 'player', relic: 'insurance' });
    events.push({ type: 'shieldGain', side: 'player', reels: [], amount: NEW_RELIC.insuranceShield, total: c.shield, source: 'insurance' });
  }
  if (f.over) return;
  if (c.hp > 0 || !f.resolving) {
    if (c.hp <= 0) return;
    // Boss phase 2: at half HP the House goes ALL IN and doubles the pot.
    if (c.side === 'enemy' && f.isBoss && !f.allIn && c.hp <= c.maxHp / 2) {
      f.allIn = true;
      f.pot = Math.max(f.pot * 2, f.pot + POT.allInMin);
      events.push({ type: 'phase', side: c.side, pot: f.pot });
    }
    // THE WHEEL SPINS FASTER at half HP: it places 3 chips a turn from now on.
    if (c.side === 'enemy' && f.isWheel && !f.fast && c.hp <= c.maxHp / 2) {
      f.fast = true;
      f.gateTurn = f.turn;
      events.push({ type: 'wheelFast', side: c.side, per: WHEEL_RULES.fast });
    }
    return;
  }
  // THE DEALER: beating a hand starts the next one (a new bar), until its third falls.
  if (c.side === 'enemy' && f.isDealer && f.dealerHand < DEALER_HANDS.length) {
    f.dealerHand++;
    c.maxHp = c.hp = unitsRound(f.dealerTotal * DEALER_RULES.hands[f.dealerHand - 1]);
    c.shield = 0;
    const allIn = f.dealerHand >= 3;
    f.nextDeal = allIn ? 'allin' : 'card';
    if (c.ability) {
      const base = allIn ? DEALER_RULES.allInEvery : DEALER_RULES.bustEvery;
      c.ability = { ...c.ability, every: Math.max(Math.min(2, base), base - f.dealerCut) };
      c.charge = 0;
    }
    events.push({ type: 'dealerHand', side: c.side, hand: f.dealerHand, hp: c.hp, every: c.ability?.every ?? 0 });
    events.push({ type: 'dealNext', side: c.side, card: f.nextDeal });
    return;
  }
  // Phoenix Feather: once per fight, a lethal hit leaves you at 1 HP.
  if (c.relics.has('phoenix') && !f.phoenixUsed) {
    f.phoenixUsed = true;
    c.hp = 1;
    events.push({ type: 'phoenix', side: c.side, hp: 1 });
    return;
  }
  // GOLDEN PARACHUTE (BANKROLL): pay chips to survive at 1 HP, once a fight (with PHOENIX FEATHER: two saves).
  if (c.side === 'player' && c.relics.has('parachute') && !f.parachuteUsed && f.chipsNow() >= NEW_RELIC.parachuteCost) {
    f.parachuteUsed = true;
    // The chips leave your hand now (audit 2026-11-01: they still counted for HIGH ROLLER and MAKE IT RAIN).
    f.parachuteChips = NEW_RELIC.parachuteCost;
    f.midasChips -= NEW_RELIC.parachuteCost;
    events.push({ type: 'midasChips', side: c.side, amount: -NEW_RELIC.parachuteCost, total: f.midasChips });
    c.hp = Math.max(1, Math.round(c.maxHp * NEW_RELIC.parachuteHp));
    events.push({ type: 'relic', side: c.side, relic: 'parachute' });
    events.push({ type: 'phoenix', side: c.side, hp: c.hp });
    return;
  }
  f.winner = other(c.side);
  events.push({ type: 'death', side: c.side });
  events.push({ type: 'fightEnd', winner: f.winner, turns: f.turn });
}
