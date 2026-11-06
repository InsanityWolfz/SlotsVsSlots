/** Old saved runs brought up to date on load (split from run.ts, 2026-11-05). */
import type { RelicId } from './config';
import { WHEEL, type EnemyDef } from './enemies';
import { ENCOUNTERS } from './encounters';
import { LEGEND_RELIC, RELICS } from './relics';
import { currentStop, startRelics, type RunState } from './run';

/**
 * Saved runs from before THE WHEEL replaced THE MIRROR (2026-10-09): a CONTINUE save mid-Act 2 holds `boss: 'mirror'`.
 * Its act 2 boss becomes THE WHEEL (its real HP is sized when the fight starts, so nothing else carries over).
 */
export function migrateRun(run: RunState): RunState {
  // OVERTIME (TEST) runs (2026-10-29) are normal runs now: the clock is in every fight. (A saved SCORE RACE run is
  // dropped by the loader: game.ts loadRunSave.)
  const gone = run as { overtime?: boolean; raceTools?: unknown; racePhoenix?: boolean };
  delete gone.overtime;
  delete gone.raceTools;
  delete gone.racePhoenix;
  const fix = (e: EnemyDef | undefined): EnemyDef | undefined => {
    if (!e || ((e.boss as string) !== 'mirror' && e.archetype !== 'mirror')) return e;
    return { ...e, archetype: WHEEL.id, boss: 'wheel', name: WHEEL.name, portrait: WHEEL.portrait, blurb: WHEEL.blurb, strips: [0, 1, 2].map(() => ({ ...WHEEL.strip })), ability: WHEEL.ability ? { ...WHEEL.ability } : null };
  };
  if (run.map?.boss) run.map.boss = fix(run.map.boss)!;
  if (Array.isArray(run.enemies)) run.enemies = run.enemies.map((e) => fix(e)!);
  // Encounters that are gone become HIGHER OR LOWER: LUCKY SEVENS (2026-10-29), RAT RACE and SCRATCH-OFF (after launch),
  // the offers (THE BLOOD BANK, PAWN SHOP, LOAN SHARK; 2026-10-14, a debt is forgiven) and the coin flips (RED OR BLACK,
  // UNDER OR OVER; 2026-10-15). A game in play starts over.
  for (const route of run.map?.routes ?? [])
    for (const st of route)
      if (st.encounter && !ENCOUNTERS[st.encounter]) {
        if (st === currentStop(run)) {
          run.encounterState = undefined;
          run.encounterPlays = 0;
        }
        st.encounter = 'hilo';
      }
  delete (run as { debt?: number }).debt;
  // HOUSE EDGES, THE WEEKLY and CHALLENGES are gone (user, 2026-10-15): a saved one plays on as a normal run.
  const old = run as { weekly?: string; challenge?: string; mods?: string[]; dailyEdge?: string; endless?: { edges?: string[] } };
  delete old.weekly;
  delete old.challenge;
  delete old.mods;
  delete old.dailyEdge;
  if (old.endless) delete old.endless.edges;
  migrateBigChoices(run);
  // 24 relics were cut (user, 2026-10-15): a save holding one drops it, from its relics and from any pick waiting.
  const real = (r: RelicId) => r in RELICS;
  if (Array.isArray(run.player?.relics)) run.player.relics = run.player.relics.filter(real);
  const pick = (list: RelicId[] | null | undefined) => (Array.isArray(list) ? list.filter(real) : list);
  run.pendingSpoils = pick(run.pendingSpoils) ?? null;
  if (run.pendingSpoils && !run.pendingSpoils.length) run.pendingSpoils = null;
  if (Array.isArray(run.legendQueue)) run.legendQueue = run.legendQueue.map((q) => q.filter(real)).filter((q) => q.length);
  run.pendingLegend = pick(run.pendingLegend) ?? null;
  if (run.pendingLegend && !run.pendingLegend.length) run.pendingLegend = run.legendQueue?.shift() ?? null;
  if (Array.isArray(run.pendingStart)) {
    run.pendingStart = run.pendingStart.filter(real);
    if (!run.pendingStart.length) run.pendingStart = startRelics(run);
  }
  if (run.startRelic && !real(run.startRelic)) delete run.startRelic;
  // Turned-down offers: a bad list is dropped (it only steers the deal).
  if (run.passed && !(typeof run.passed.act === 'number' && Array.isArray(run.passed.keys) && run.passed.keys.every((k) => typeof k === 'string'))) delete run.passed;
  return run;
}

/** The pre-2026-10-15 big-choice fields of a saved run (read once on load, then dropped). */
interface OldBigRun {
  pendingChoice?: unknown;
  choiceQueue?: unknown;
  choiceSets?: unknown;
  choicesSeen?: unknown;
  choicesTaken?: unknown;
  choicesRecent?: unknown;
  big?: { secondLine?: boolean; startFull?: boolean; lightningMul?: number; strikeTwice?: boolean; jackpotMul?: number; hype?: boolean; swordBonus?: number };
  glass?: boolean;
  devil?: boolean;
  bloodPact?: boolean;
  levelLock?: unknown;
  bossHpMul?: unknown;
  abilityFaster?: boolean;
  noCharms?: unknown;
  crusade?: boolean;
  noWinChips?: boolean;
  trustFund?: unknown;
}

/**
 * BIG CHOICES are gone (user, 2026-10-15). A saved run's waiting offer is dropped; the ten that became legendary relics
 * turn into those relics (THE LONG GAME and CRUSADE keep their win counts); the rest of the old fields go.
 */
function migrateBigChoices(run: RunState): void {
  const old = run as RunState & OldBigRun;
  const big = old.big && typeof old.big === 'object' ? old.big : {};
  const gain = (r: RelicId, had: unknown) => {
    if (had && !run.player.relics.includes(r)) run.player.relics.push(r);
  };
  gain('glasscannon', old.glass);
  gain('devilsdue', old.devil);
  gain('secondline', big.secondLine);
  gain('longgame', typeof run.longGame === 'number');
  gain('crusade', old.crusade);
  if (old.crusade && run.crusadeWins === undefined) run.crusadeWins = Math.max(0, Math.round((big.swordBonus ?? 0) / LEGEND_RELIC.crusadeStep));
  gain('quickening', old.abilityFaster && big.startFull);
  // CHAIN LIGHTNING was strikeTwice; MAD SCIENCE (lightningMul) was its HP-costing cousin: both become CHAIN LIGHTNING.
  gain('chainlightning', big.strikeTwice || (big.lightningMul ?? 1) > 1);
  gain('highcard', big.jackpotMul);
  gain('hypeman', big.hype);
  gain('openbar', old.noWinChips);
  if (typeof run.longGame === 'number' && !run.player.relics.includes('longgame')) delete run.longGame;
  for (const k of ['pendingChoice', 'choiceQueue', 'choiceSets', 'choicesSeen', 'choicesTaken', 'choicesRecent', 'big', 'glass', 'devil', 'bloodPact', 'levelLock', 'bossHpMul', 'abilityFaster', 'noCharms', 'crusade', 'noWinChips', 'trustFund'] as const)
    delete old[k];
}
