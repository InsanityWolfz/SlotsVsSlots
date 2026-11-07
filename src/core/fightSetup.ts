/** A run fight's setup: its GameConfig, the enemy's real HP and the relics that scale your pay (split from run.ts, 2026-11-05). */
import { cloneConfig, UNIT, unitsRound, type AbilityDef, type GameConfig } from './config';
import { ELITE_DMG_MUL, ENDLESS, endlessMul, LOOP_GROWTH, TUNE, TURBO, type EnemyDef } from './enemies';
import { effectiveAbility, STAKE, stakeDmg } from './stakes';
import { CONTENT_1107, LEGEND_RELIC } from './relics';
import { CABINETS } from './cabinets';
import { cloneLevels, currentEnemy, fightSeed, type RunState } from './run';
import { NIGHT, nightId } from './endless';

/** The GameConfig for the run's next fight. */
/** FAST HANDS: abilities come 2 turns sooner per level (never under every 2). */
export const fastHands = (ab: AbilityDef, level = 1): AbilityDef => ({ ...ab, every: Math.max(2, ab.every - 2 * level) });

/** HOLD (user, 2026-10-29): before your spin, or during the enemy's turn, tap one of your reels to keep it for your next
 * spin. Nothing waits for it (AUTO never stops). */
export const HOLD = { perFight: 2 };

export function fightConfig(run: RunState, base: GameConfig): GameConfig {
  const cfg = cloneConfig(base);
  const e = currentEnemy(run);
  cfg.player = {
    ...cfg.player,
    hp: run.player.maxHp,
    startHp: run.player.hp,
    strips: run.player.strips.map((s) => ({ ...s })),
    gilded: run.player.gilded.map((g) => ({ ...g })),
    levels: cloneLevels(run.player.levels),
    ...(legendPayMul(run) !== 1 ? { payMul: legendPayMul(run) } : {}),
    ...(run.player.relics.includes('crusade') && (run.crusadeWins ?? 0) > 0 ? { swordBonus: LEGEND_RELIC.crusadeStep * (run.crusadeWins ?? 0) } : {}),
    chipsHeld: run.player.chips,
    // Chips no longer shield you on bosses (2026-10-07, user: too noisy).
  };
  const hp = enemyHp(run, e);
  cfg.enemy = { hp, strips: e.strips.map((s) => ({ ...s })), name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
  // Elites hit harder too (2026-10-12: they were a free relic for little risk).
  // Enemy hits: x TUNE.enemyDmg (honest, the same for every machine), elites x ELITE_DMG_MUL on top.
  cfg.enemy.dmgMul = TUNE.enemyDmg * (e.elite ? ELITE_DMG_MUL : 1);
  // (A chip shield, if one ever comes back, stays capped against the bosses.)
  if (e.boss === 'wheel') cfg.player.stackShield = Math.min(BOSS_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
  cfg.relics = [...run.player.relics];
  cfg.cabinet = run.cabinet;
  cfg.stake = run.stake;
  cfg.enemy.act = run.act;
  // BLACK stake: the House plants bombs (even on your payline).
  if (e.boss === 'house' && run.stake >= STAKE.houseDirty) cfg.enemy.strips = cfg.enemy.strips.map((s) => ({ ...s, bomb: (s.bomb ?? 0) + STAKE.houseBombsPerReel }));
  if (e.boss === 'dealer') {
    cfg.player.stackShield = Math.min(BOSS_CHIP_SHIELD_CAP, cfg.player.stackShield ?? 0);
  }
  // BLACK and up: enemies hit harder (stakes.ts stakeDmg).
  if (stakeDmg(run.stake) !== 1) cfg.enemy.stakeDmg = stakeDmg(run.stake);
  // SECOND PAYLINE (legendary relic): its price, on the enemy's hits (its own note on the banner).
  if (run.player.relics.includes('secondline')) cfg.enemy.lineDmg = LEGEND_RELIC.lineDmg;
  // (HIGH LIMIT is in enemyHp, so the cards show the HP the fight has.)
  // ENDLESS: damage grows per loop.
  if (run.endless) {
    // The loop House is a race: it cashes its pot every 2 turns.
    if (e.boss === 'house' && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: ENDLESS.houseEvery };
    cfg.enemy.endless = true;
    cfg.enemy.loop = run.endless.loop;
    cfg.enemy.dmgMul = (cfg.enemy.dmgMul ?? 1) * endlessMul(ENDLESS.dmg, run.endless.loop);
    cfg.enemy.ability = scaledAbility(run, cfg.enemy.ability);
    // THE OWNER (the TURBO boss): hits harder on top of the loop's growth; no turn takes more than turnCap of his HP.
    if (e.turbo) {
      cfg.enemy.dmgMul *= TURBO.dmg;
      cfg.enemy.owner = true;
    }
    // VETERAN (KNIGHT) and WARM-UP (JUKEBOX): machine growth for the machines with no late multiplier (honest HP: enemies don't change).
    const cleared = run.endless.loop - 1;
    if (run.cabinet === 'knight' && cleared > 0) cfg.player.veteranMul = 1 + LOOP_GROWTH.veteran * cleared;
    // OVERLOAD (TESLA, 2026-11-01): its one-axis lightning grows in a straight line, so it gets KNIGHT's loop growth
    // (bolts and shields pay more each loop cleared: more charge, longer storms). Without it 6% of TESLA's ENDLESS runs
    // reached THE OWNER (47% before the rework).
    if (run.cabinet === 'tesla' && cleared > 0) cfg.player.veteranMul = 1 + LOOP_GROWTH.overload * cleared;
    if (run.cabinet === 'jukebox') cfg.player.volumeStart = LOOP_GROWTH.warmUp * run.endless.loop;
  }
  // TONIGHT'S RULE (ENDLESS: the path's), for both machines.
  const night = nightId(run);
  cfg.night = night;
  if (night === 'lucky') for (const side of [cfg.player, cfg.enemy]) side.strips = side.strips.map((s) => ({ ...s, wild: (s.wild ?? 0) + NIGHT.luckyWilds }));
  if (night === 'fast') {
    if (cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 1) };
    cfg.player.meterMul = (cfg.player.meterMul ?? 1) * NIGHT.fastMeter;
  }
  // Every run fight is seeded from the run. A run resumed after a quit replays the same fight, so quitting can't
  // re-roll a loss (STEAM_READINESS S1). The sim seeds its own fights.
  cfg.seed = fightSeed(run.spinSeed ?? run.seed, run.act, run.depth, run.endless?.loop ?? 0);
  // QUICKENING (legendary relic): enemy abilities charge one spin faster.
  if (quickening(run) && cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, every: Math.max(2, cfg.enemy.ability.every - 1) };
  // OVERTIME (user, 2026-10-29): every fight has the clock but THE OWNER's (he escalates every turn already). HOLD:
  // two a fight (STEADY HANDS: one more).
  if (!cfg.enemy.owner) cfg.overtime = true;
  cfg.player.holds = HOLD.perFight + (run.player.relics.includes('steadyhands') ? CONTENT_1107.steadyHolds : 0);
  return cfg;
}

/** THE DEALER's BUST clock (turns) in this run, as fightConfig and the fight set it: QUICKENING, the stakes. */
export function dealerEvery(run: RunState): number {
  let ab: AbilityDef = { kind: 'deal', every: 3, power: 0 };
  if (quickening(run)) ab = { ...ab, every: Math.max(2, ab.every - 1) };
  return effectiveAbility(ab, { stake: run.stake, act: 3, sandglass: run.player.relics.includes('sandglass') }).every;
}

/**
 * ENDLESS: an enemy ability's flat heal or shield grows with the loop's HP (playtest: a loop 4 "HEALS 80" on a 50K-HP
 * elite did nothing). Its hits already grow in the fight (the loop's damage); `shown` also scales those, for the card.
 */
export function scaledAbility(run: RunState, ab: AbilityDef | null | undefined, shown = false): AbilityDef | null {
  if (!ab) return null;
  if (!run.endless) return ab;
  const loop = run.endless.loop;
  const k = ab.kind === 'bloodmoon' || ab.kind === 'fortify' ? endlessMul(ENDLESS.hp, loop) : shown && (ab.kind === 'smash' || ab.kind === 'penalty') ? endlessMul(ENDLESS.dmg, loop) : 1;
  return k === 1 ? ab : { ...ab, power: unitsRound(ab.power * k) };
}
/** THE LONG GAME: what it multiplies your pay by now (-20%, +3% a win since you got it). */
export const longGameMul = (run: RunState) => (run.player.relics.includes('longgame') ? LEGEND_RELIC.longStart + LEGEND_RELIC.longStep * (run.longGame ?? 0) : 1);
/** The legendary relics that scale all your pay: GLASS CANNON, DEVIL'S DUE, THE LONG GAME. */
export const legendPayMul = (run: RunState) =>
  (run.player.relics.includes('glasscannon') ? LEGEND_RELIC.glassPay : 1) * (run.player.relics.includes('devilsdue') ? LEGEND_RELIC.devilPay : 1) * longGameMul(run);
/** QUICKENING: a machine with a meter (not KNIGHT) holding it. */
export const quickening = (run: RunState) => run.player.relics.includes('quickening') && !!CABINETS[run.cabinet].meter;
/** GLASS CANNON: no healing between fights. */
export const noHealing = (run: RunState) => run.player.relics.includes('glasscannon');

/**
 * An enemy's real HP for this run. Honest HP (2026-10-12): the same enemy has the same HP at the same stop on every
 * slot machine and every build. Machines are balanced by tuning the machines, not the enemies.
 */
/** The tutorial's first opponent has this much of its HP (you're reading callouts, not building). */
export const TUTORIAL_OPENER_MUL = 0.75;

export function enemyHp(run: RunState, e: EnemyDef): number {
  // THE OWNER: 11 HP, a hit each (no growth, no edges).
  if (run.endless && e.turbo) return TURBO.hp;
  const gold = e.isBoss && run.stake >= STAKE.fasterAll ? STAKE.goldBossHp : 1;
  const tutorial = run.tutorial && run.act === 1 && e.depth === 0 ? TUTORIAL_OPENER_MUL : 1;
  const loop = run.endless ? endlessMul(ENDLESS.hp, run.endless.loop) : 1;
  // TONIGHT'S RULE HIGH LIMIT (playtest: the cards showed the HP without it).
  const limit = nightId(run) === 'limit' ? NIGHT.limitHp : 1;
  return Math.min(ENDLESS.clamp, unitsRound(baseEnemyHp(run, e) * gold * tutorial * loop * limit));
}

function baseEnemyHp(run: RunState, e: EnemyDef): number {
  // Regulars and elites: their act's curve (enemies.ts makeEnemy).
  if (!e.isBoss) return e.hp;
  // ENDLESS: the loop bosses are a multiple of an act 3 regular's HP (then x the loop's growth).
  if (run.endless) return unitsRound(TUNE.endlessBossBase * (e.boss === 'house' ? ENDLESS.houseHp : e.boss === 'dealer' ? ENDLESS.dealerHp : ENDLESS.wheelHp));
  // GREEN+: THE WHEEL STARTS FAST (3 chips a turn), so it gets less HP.
  if (e.boss === 'wheel') return unitsRound(TUNE.wheelHp * (run.stake >= STAKE.wheelFast ? TUNE.greenWheel : 1));
  if (e.boss === 'dealer') return TUNE.dealerHp;
  return e.hp;
}
/** Saved chips shield at most this much per boss turn (hoarding guard). */
export const BOSS_CHIP_SHIELD_CAP = 4 * UNIT;
