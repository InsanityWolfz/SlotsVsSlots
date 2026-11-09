/** The run flow (tutorial, machine pick, saved runs, the screens between fights, the map) and the fight flow (split from game.ts, 2026-11-05). */
import { OWNER_TRICKS, TUNE } from './core/enemies';
import type { CombatEvent } from './core/events';
import { UNIT, type GameConfig, type RelicId, type SideId } from './core/config';
import { STAKES, stakeUnlock } from './core/stakes';
import { Fight, highRollerMul, PAYING } from './core/fight';
import { turnRow } from './core/log';
import {
  chooseRoute,
  createRun,
  fightLabel,
  finishFight,
  takeLegend,
  currentEnemy,
  isEncounterNow,
  takeStart,
  type DraftOption,
  type FightRecord,
  type RunState,
} from './core/run';
import { draftOffers, takeDraft } from './core/draft';
import { buy, isShopNow, leaveShop, reroll, shopOffers, takeSpoils } from './core/shop';
import { fightConfig } from './core/fightSetup';
import { CABINETS, CABINET_ORDER, type CabinetId } from './core/cabinets';
import { StatsTracker } from './core/stats';
import { Clock } from './present/clock';
import { Director } from './present/director';
import { FxLayer } from './present/fx';
import { HudView, type HudMeter } from './present/hud';
import { COLORS } from './present/layout';
import { MachineView } from './present/machine';
import type { Stage } from './present/stage';
import { type SpriteId, artId } from './render/sprites';
import { runSummary } from './core/runLog';
import { steamUnlock, VERSION } from './build';
import { demo } from './demo';
import { METER_TIPS, TUTORIAL } from './ui/coach';
import { collectionTotal, heroSprite } from './ui/menus';
import { shownTrim, emptyProfile, MAX_ENTRIES, recordMeta, runEntry, runScore, type MetaGain, type RunEntry } from './core/profile';
import { clearRunSave, LASTRUN_KEY, loadRunSave, PAYLINE_HINTS, RUN_KEY, sanitizePrefs, save } from './saves';
import type { Game } from './game';

const AUTO_DELAY = 0.35;
export const clockSpeed = (s: number) => s / 2;

/** The player's signature meter on the HUD (TESLA's special, MIDAS's gold, JAX's jackpots). */
function hudMeter(f: Fight): HudMeter | null {
  if (f.special) return { kind: 'special', pips: Math.round(f.cfg.specialCost / UNIT), label: 'LIGHTNING', color: COLORS.energy, icon: 'boltIcon' };
  const m = f.meter;
  if (!m) return null;
  if (m.kind === 'touch') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'GOLD', color: '#ffd23f', icon: 'goldbar' as SpriteId };
  if (m.kind === 'vault') return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'HIGH ROLLER', color: '#7dff7a', icon: 'goldbar' as SpriteId, note: (chips) => `${chips} CHIPS X${highRollerMul(chips)}` };
  if (m.kind === 'volume') return { kind: m.kind, pips: Math.round(f.meterCost / UNIT), label: 'VOLUME', color: '#5ad8e8', icon: artId('volumeIcon') as SpriteId };
  return { kind: m.kind, pips: Math.round(m.cost / UNIT), label: 'JACKPOTS', color: '#ff6ad5', icon: 'wild' };
}

/** HISCORES: log the finished run (keeps the newest entries, but never drops a top-10 score). */
export function recordRun(g: Game, run: RunState): void {
  // COPY LAST RUN (main menu): the finished run's text survives a refresh.
  try {
    localStorage.setItem(LASTRUN_KEY, runSummary(run, VERSION));
  } catch {
    /* private mode / full storage: the run-over screen's COPY RUN still works */
  }
  // The entry lives on the run (rideAt), not in memory: a refresh mid-ENDLESS used to record the run twice (playtest C).
  const ride = run.endless && run.rideAt !== undefined ? g.profile.runs.find((e) => e.at === run.rideAt) : undefined;
  if (ride) {
    const prev = runScore(ride);
    Object.assign(ride, runEntry(run, ride.at, !!run.tutorial), { won: true });
    afterRecord(g, ride, recordMeta(g.profile, ride, collectionTotal(), prev));
    return;
  }
  const entry = runEntry(run, Date.now(), !!run.tutorial);
  if (run.won && !run.endless) run.rideAt = entry.at;
  g.profile.runs.push(entry);
  while (g.profile.runs.length > MAX_ENTRIES) {
    const top = new Set([...g.profile.runs].sort((a, b) => runScore(b) - runScore(a)).slice(0, 10));
    const i = g.profile.runs.findIndex((e) => !top.has(e));
    g.profile.runs.splice(i < 0 ? 0 : i, 1);
  }
  afterRecord(g, entry, recordMeta(g.profile, entry, collectionTotal()));
}

/** META: save and show what the run earned. (Online boards went to after launch, 2026-10-29: Steam's come first.) */
export function afterRecord(g: Game, _entry: RunEntry, gain: MetaGain): void {
  for (const a of gain.achievements) steamUnlock(a.id);
  g.saveProfile();
  g.screens.setMeta(gain);
}

/** RESET SAVE (main menu): unlocks, stakes, collection and hiscores. Settings stay. */
export function resetSave(g: Game): void {
  const { speed, auto, juice, muted, vol } = g.prefs;
  g.prefs = { ...sanitizePrefs({}, g.publicBuild), speed, auto, juice, muted, vol };
  // Your name and player id are who you are, not progress: they survive a reset (the server still holds the name).
  const { name, pid } = g.profile;
  g.profile = { ...emptyProfile(), ...(name ? { name } : {}), ...(pid ? { pid } : {}) };
  g.savePrefs();
  g.saveProfile();
}

// ---- tutorial ----------------------------------------------------------------------

/** A guided first fight on the KNIGHT: callouts explain each part, then the run carries on. */
export function startTutorial(g: Game): void {
  g.prefs.tutorialDone = true;
  g.savePrefs();
  startRun(g, undefined, 'knight', 0);
  if (!g.run) return;
  g.run.tutorial = true;
  // The guided fight isn't saved; the run is, once the callouts are done.
  clearRunSave();
  // The guided first fight skips the starting relic pick (callouts first, choices later).
  g.run.pendingStart = null;
  g.screens.showNext(g.run);
  g.tut = {};
  g.coach.show(TUTORIAL.preview);
}

export function tip(g: Game, key: 'fight' | 'spin' | 'hold' | 'buildUp' | 'ability' | 'draft' | 'shop', tips: keyof typeof TUTORIAL, done?: () => void): void {
  if (!g.tut || g.tut[key]) return;
  g.tut[key] = true;
  g.coach.show(TUTORIAL[tips], done);
}

export function skipTutorial(g: Game): void {
  g.coach.skipAll();
  g.tut = null;
}

// ---- run flow ----------------------------------------------------------------------

/** NEW RUN mid-run throws the run away: it needs a second press within 2 s (QA_1 B1). */
export function newRunPressed(g: Game): void {
  // In a run it's PAUSE (playtest C: a phone had no Escape, so no GLOSSARY; ABANDON RUN lives in the pause menu).
  if (g.run && !g.run.over && g.phase !== 'title') {
    if (g.pausable()) g.setPaused(true);
    return;
  }
  chooseCabinet(g);
}

/** START RUN: pick a starting machine first. */
export function chooseCabinet(g: Game): void {
  g.menus.hide();
  skipTutorial(g);
  g.token++;
  g.synth.stopLoops();
  g.recap.hide();
  g.phase = 'between';
  g.screens.showCabinets(g.unlockedCabinets(), g.stakesNow(), g.prefs.stakeSel, g.prefs.act3 || g.prefs.unlockAll, g.prefs.dealerBeaten);
  g.syncButtons();
}

/** Meta progression: check the finished run against each cabinet's unlock condition. */
export function checkUnlocks(g: Game, run: RunState): CabinetId[] {
  // The demo unlocks nothing: its machines and stake are open from the start, the rest are IN THE FULL GAME.
  if (demo().on) {
    g.screens.setStakeUnlockedNow('');
    return [];
  }
  const got: CabinetId[] = [];
  const reachedBoss = run.records.some((r) => r.archetype === 'house') || run.act > 1 || run.won;
  const beatHouse = run.act > 1 || run.won;
  // MIDAS is shelved (no unlock) while he's reworked; TESLA is the second machine.
  const cond: Record<CabinetId, boolean> = {
    knight: true,
    midas: run.won,
    tesla: reachedBoss,
    jukebox: beatHouse,
    joker: beatHouse && run.player.strips.some((s) => (s.wild ?? 0) > 0),
  };
  for (const id of CABINET_ORDER) {
    if (cond[id] && !g.prefs.unlocked.includes(id)) {
      g.prefs.unlocked.push(id);
      got.push(id);
    }
  }
  // TRUE ENDING: this slot machine beat the Dealer.
  if (run.won && run.act >= 3 && !g.prefs.dealerBeaten.includes(run.cabinet)) {
    g.prefs.dealerBeaten.push(run.cabinet);
    g.savePrefs();
  }
  // HIGH STAKES: winning at your best stake unlocks the next one for this cabinet.
  let stakeText = '';
  const best = g.prefs.stakes[run.cabinet] ?? 0;
  const unlock = stakeUnlock(best, run);
  if (unlock !== null) {
    g.prefs.stakes[run.cabinet] = unlock;
    const next = STAKES[run.stake + 1];
    // (Its rule shows on CHOOSE YOUR MACHINE: on RUN OVER the whole rule made a chip the width of the screen.)
    stakeText = `${next.name} STAKE UNLOCKED FOR ${CABINETS[run.cabinet].name}`;
  }
  g.screens.setStakeUnlockedNow(stakeText);
  if (got.length || stakeText) g.savePrefs();
  return got;
}

export function startRun(g: Game, seed?: number, cabinet: CabinetId = 'knight', stake = 0): void {
  g.menus.hide();
  g.run = createRun(g.cfg, seed, cabinet, stake, g.prefs.act3 || g.prefs.unlockAll);
  g.token++;
  g.synth.stopLoops();
  g.recap.hide();
  // Show the first opponent on the machines behind the preview.
  newFight(g, false, null, fightConfig(g.run, g.cfg), true);
  g.phase = 'between';
  showRunStart(g);
  checkpoint(g, 'next');
  g.syncButtons();
}

export function showRunStart(g: Game): void {
  if (!g.run) return;
  if (g.run.pendingStart?.length) g.screens.showDraft(g.run, g.run.pendingStart.map((relic) => ({ kind: 'relic', relic }) as DraftOption), null, 'start');
  else advance(g);
}

// ---- saved runs (STEAM_READINESS S1) ------------------------------------------------
// The run is plain data and every draft, shop and fight is seeded from it, so a snapshot taken at a between-fight
// screen plays on exactly as it would have. Taken at the next-fight preview ('next') and after a fight's payouts
// ('after': spoils, legend or draft). Quitting anywhere else resumes at the last snapshot.

export function checkpoint(g: Game, at: 'next' | 'after' | 'fight'): void {
  const run = g.run;
  if (!run || run.over || g.tut) return;
  save(RUN_KEY, { v: 1, at, version: VERSION, run });
}

export function savedRunLabel(): string | null {
  const s = loadRunSave();
  if (!s) return null;
  // Beat the Dealer: the RIDE / CASH OUT choice is what's waiting (playtest C: it read ACT 3, like a run mid-act).
  if (s.at === 'ride') return 'ENDLESS';
  return `${s.run.endless ? `LOOP ${s.run.endless.loop}` : `ACT ${s.run.act}`} ${CABINETS[s.run.cabinet].hero}`;
}

/** CONTINUE: the saved run, at the screen it was saved on. */
export function continueRun(g: Game): void {
  try {
    resumeRun(g);
  } catch (err) {
    // A save this build can't play: drop it rather than crash on every CONTINUE.
    console.error(err);
    clearRunSave();
    g.showMenu();
  }
}

export function resumeRun(g: Game): void {
  const s = loadRunSave();
  if (!s) return g.menus.showMain();
  g.menus.hide();
  skipTutorial(g);
  g.run = s.run;
  g.token++;
  g.synth.stopLoops();
  g.recap.hide();
  // Back at the Dealer's LET IT RIDE / CASH OUT (the run was already recorded when it was won).
  if (s.at === 'ride') {
    g.phase = 'over';
    g.screens.showOver(g.run);
    g.syncButtons();
    return;
  }
  newFight(g, false, null, fightConfig(g.run, g.cfg), true);
  g.phase = 'between';
  const last = g.run.records[g.run.records.length - 1];
  if (s.at === 'fight') startRunFight(g);
  else if (s.at === 'after' && last) {
    g.lastRecord = last;
    afterBonus(g, last);
  } else showRunStart(g);
  g.syncButtons();
}

export function beginRunFight(g: Game): void {
  if (!g.run) return;
  // Snapshot with the opponent locked in: a quit mid-fight resumes into this same fight (STEAM_QA_1 Q3).
  checkpoint(g, 'fight');
  startRunFight(g);
}

export function startRunFight(g: Game): void {
  if (!g.run) return;
  g.screens.hide();
  // The focus belongs to the screens: in the fight, Enter on a stale ring would change the speed.
  g.focus.hide();
  newFight(g, true, null, fightConfig(g.run, g.cfg), true);
  if (g.run.depth === 0 && g.run.act === 1) tip(g, 'fight', 'fight');
  meterTip(g);
}

/** A Slot Machine's meter, explained the first fight a player ever starts on it (never over the tutorial's callouts). */
export function meterTip(g: Game): void {
  const id = g.run?.cabinet;
  const t = id && METER_TIPS[id];
  if (!t || g.tut || g.coach.active || g.prefs.metersExplained.includes(id)) return;
  g.prefs.metersExplained.push(id);
  g.savePrefs();
  g.coach.show([t], undefined, 'SKIP');
}

export function noteHurt(g: Game, events: CombatEvent[]): void {
  const add = (k: string, n: number) => n > 0 && g.hurt.set(k, (g.hurt.get(k) ?? 0) + n);
  for (const e of events) {
    if (e.type === 'spin' && e.side === 'player') {
      g.spins[1]++;
      if (e.frozen.some(Boolean) || e.locked.some(Boolean)) g.spins[0]++;
    }
    if (e.type === 'potWin' && e.to === 'player') add('THE POT', e.hpDamage);
    if (e.type === 'allInHit' && e.to === 'player') add('ALL IN', e.hpDamage);
    if (e.type === 'noMoreBets' && e.to === 'player') add('NO MORE BETS', e.hpDamage);
    if (e.type === 'closingTime') add('CLOSING TIME', e.hp);
    if (e.type === 'attack' && e.to === 'player')
      add(e.note === 'drain' ? 'DRAIN' : e.note === 'mimic' ? 'COPYCAT' : e.reels.length ? 'SPIN HITS' : g.fight.isBoss ? 'THE POT' : 'ABILITY', e.hpDamage);
    else if (e.type === 'specialFire' && e.to === 'player') add('SPECIAL', e.hpDamage);
    else if (e.type === 'markedHit' && e.side === 'player') add('MARKS', e.hpDamage);
    else if (e.type === 'blast' && e.side === 'player') add('IOUS', e.hpDamage);
  }
}

export function afterRunFight(g: Game): void {
  const run = g.run!;
  const record = finishFight(run, g.fight);
  record.best = Math.round(g.tracker.stats.sides.player.biggestHit);
  if (!record.won) {
    // The HP damage each source did (never past 0: no overkill). It isn't scaled to the HP you started with: heals in
    // between made that read low (THE OWNER's one-spin kill from full HP showed as 199: playtest).
    record.hurt = [...g.hurt].map(([s, n]) => [s, Math.round(n)] as [string, number]).filter(([, n]) => n >= UNIT).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (g.spins[0] >= 2) record.stuck = [g.spins[0], g.spins[1]];
  }
  g.hurt.clear();
  g.spins = [0, 0];
  g.lastRecord = record;
  g.phase = run.over ? 'over' : 'between';
  if (run.over) {
    clearRunSave();
    // Beat the Dealer: the LET IT RIDE / CASH OUT choice is saved, so a refresh there comes back to it (playtest).
    g.noteDiscoveries();
    recordRun(g, run);
    if (run.won && run.act >= 3 && !run.endless) save(RUN_KEY, { v: 1, at: 'ride', version: VERSION, run });
    skipTutorial(g);
    if (run.endless) g.screens.setStakeUnlockedNow('');
    g.screens.setUnlockedNow(run.endless ? [] : checkUnlocks(g, run));
    g.screens.showOver(run);
  }
  else afterBonus(g, record);
  if (g.screens.mode === 'draft') tip(g, 'draft', 'draft');
  g.syncButtons();
}

/** After the bonus payouts: the legendary pick, elite spoils or the draft, as usual. */
export function afterBonus(g: Game, record: FightRecord): void {
  const run = g.run;
  if (!run) return;
  checkpoint(g, 'after');
  if (run.pendingLegend) {
    // A boss is gone: set up the idle machines for the next act so its HUD doesn't linger behind.
    newFight(g, false, null, fightConfig(run, g.cfg), true);
    g.phase = 'between';
  }
  if (run.pendingLegend) g.screens.showLegend(run, run.pendingLegend, record);
  else if (run.pendingSpoils) g.screens.showSpoils(run, run.pendingSpoils, record);
  else g.screens.showDraft(run, draftOffers(run), record);
  if (g.screens.mode === 'draft') tip(g, 'draft', 'draft');
  g.syncButtons();
}

/** An act's boss fell: take the legendary, then the new act's Cashier opens. */
export function pickLegend(g: Game, relic: RelicId): void {
  if (!g.run) return;
  takeLegend(g.run, relic);
  advance(g);
}

export function pickSpoils(g: Game, relic: RelicId): void {
  if (!g.run) return;
  if (g.run.pendingStart) {
    takeStart(g.run, relic);
    advance(g);
    return;
  }
  takeSpoils(g.run, relic);
  g.screens.showDraft(g.run, draftOffers(g.run), g.lastRecord);
}

export function buyItem(g: Game, i: number): void {
  const item = g.shelf[i];
  if (!g.run || !item) return;
  const levelUp = item.option.kind === 'symLevel' || item.option.kind === 'charmLevel';
  if (buy(g.run, item)) {
    if (levelUp) g.sounds.lucky();
    g.sounds.coin(4);
    g.sounds.coin(9);
    g.screens.bought(i, item);
  } else {
    g.sounds.fizzle();
    g.screens.deny(i);
  }
}

export function rerollShop(g: Game): void {
  if (!g.run) return;
  const next = reroll(g.run);
  if (!next) return g.sounds.fizzle();
  g.sounds.coin(2);
  g.shelf = next;
  g.screens.showShop(g.run, g.shelf, true);
}

export function leaveCashier(g: Game): void {
  if (!g.run) return;
  leaveShop(g.run);
  advance(g);
}

export function showNextFight(g: Game): void {
  if (!g.run) return;
  // Rebuild the (idle) machines for the next opponent so the preview is accurate.
  newFight(g, false, null, fightConfig(g.run, g.cfg), true);
  g.phase = 'between';
  g.screens.showNext(g.run);
  // The tutorial's last word, then the run is all yours (and saved from here: it was skipped while the tutorial was
  // on, so a reload at this route pick lost the run, save QA 2026-11-02).
  if (g.tut && g.run.depth >= 1) {
    g.coach.show(TUTORIAL.next);
    g.tut = null;
  }
  checkpoint(g, 'next');
  g.syncButtons();
}

export function pickReward(g: Game, o: DraftOption): void {
  if (!g.run) return;
  takeDraft(g.run, o);
  advance(g);
}

/** Walk the map to the next screen: a Cashier, an encounter, the route pick or the next fight. */
export function advance(g: Game): void {
  const run = g.run;
  if (!run) return;
  if (isShopNow(run)) {
    g.shelf = shopOffers(run);
    g.screens.showShop(run, g.shelf);
    tip(g, 'shop', 'shop');
    checkpoint(g, 'next');
    g.syncButtons();
    return;
  }
  if (isEncounterNow(run)) {
    g.screens.showEncounter(run);
    checkpoint(g, 'next');
    g.syncButtons();
    return;
  }
  // The route pick and the next fight share the preview screen (it draws the act's map).
  showNextFight(g);
}

/** The opener is done: take one of the act's routes. */
export function pickRoute(g: Game, i: number): void {
  if (!g.run) return;
  chooseRoute(g.run, i);
  advance(g);
}

// ---- fight flow --------------------------------------------------------------------

export function newFight(g: Game, start: boolean, seed: number | null = null, cfg: GameConfig = g.cfg, inRun = false): void {
  g.token++;
  g.recap.hide();
  g.presenting = false;
  g.awaitingSpin = false;
  g.spinResolve = null;
  // The previous fight's clock is abandoned here, so any reel mid-spin never lands to
  // stop its own loop — cut them explicitly.
  g.synth.stopLoops();
  g.synth.enabled = true;
  g.camera.dimTarget = 0;
  g.lastPair = false;
  g.fight = new Fight(cfg, seed ?? cfg.seed ?? undefined);
  g.hurt.clear();
  g.spins = [0, 0];
  g.lastSeed = g.fight.seed;
  g.tracker = new StatsTracker(g.fight);
  const clock = new Clock();
  clock.speed = clockSpeed(g.prefs.speed);
  const sides: SideId[] = ['player', 'enemy'];
  const machines = Object.fromEntries(sides.map((s) => [s, new MachineView(s, g.fight.sides[s], g.sounds)])) as Stage['machines'];
  // SECOND PAYLINE: the row above pays too, so it isn't dimmed.
  if (g.fight.sides.player.relics.has('secondline')) machines.player.payRows = [0, 1];
  // The player's TRIM (cosmetic; CLASSIC draws the stock gold).
  const trim = shownTrim(g.profile);
  machines.player.trim = trim.id === 'classic' ? null : trim;
  const huds = Object.fromEntries(
    sides.map((s) => {
      const c = g.fight.sides[s];
      const sc = s === 'player' ? cfg.player : cfg.enemy;
      const hero = s === 'player' && g.run && inRun ? g.run.cabinet : null;
      const meter = s === 'player' ? hudMeter(g.fight) : null;
      const hud = new HudView(s, c.maxHp, meter, {
        name: s === 'player' ? (hero ? CABINETS[hero].hero : 'HERO') : sc.name,
        portrait: hero ? heroSprite(hero) : sc.portrait,
        // THE OWNER's HUD names his next trick from the start (EVERY TRICK said nothing).
        ability: c.ability?.kind === 'owner' ? { ...c.ability, kind: OWNER_TRICKS[0].kind } : c.ability,
        energy: c.energy / UNIT,
      });
      // The enemy's name in its card's colour: a boss red, an elite orange (it was always green).
      if (s === 'enemy') hud.nameColor = cfg.enemy.boss ? '#ff8a7a' : g.run && inRun && currentEnemy(g.run)?.elite ? '#ffb060' : COLORS.slime;
      // THE OWNER: his HP bar is his fortune's ladder.
      if (s === 'enemy' && cfg.enemy.owner) hud.ladder = true;
      hud.hp = hud.ghost = c.hp;
      if (s === 'player') hud.chips = hud.chipsHeld = cfg.player.chipsHeld ?? 0;
      if (c.ability) hud.charge = c.charge;
      return [s, hud];
    }),
  ) as Stage['huds'];
  g.stage = {
    clock,
    camera: g.camera,
    particles: g.particles,
    fx: new FxLayer(),
    synth: g.synth,
    sounds: g.sounds,
    machines,
    huds,
    juice: g.prefs.juice,
    cheer: (ours) => g.background.rooms.cheer(ours),
    relics: [...cfg.relics],
    relicPops: {},
    relicFeed: [],
    levels: { player: cfg.player.levels },
    ticket: cfg.relics.includes('ticket'),
    enemyShield: TUNE.enemyShield,
    gutter: {
      turn: 0,
      side: null,
      pulse: 0,
      pot: g.fight.pot,
      potPunch: 1,
      fightLabel: g.run && inRun ? fightLabel(g.run) : 'SANDBOX',
      allIn: false,
      buildUp: 1,
      buildUpPop: 0,
      ...(g.fight.isWheel ? { bets: [...g.fight.bets], betsLeft: (g.fight.sides.enemy.ability?.every ?? 3) - g.fight.sides.enemy.charge, betPer: g.fight.betPer(), betPunch: 1, wheelFast: g.fight.fast, wheelAngle: 0, wheelSpeed: 0.6 } : {}),
      chipsEaten: 0,
    },
  };
  g.director = new Director(g.stage);
  if (start) {
    g.phase = inRun ? 'fighting' : 'quick';
    if (!inRun) {
      g.run = null;
      g.screens.hide();
    }
  }
  g.syncButtons();
  g.onFightChange.forEach((f) => f());
  if (start) {
    g.fightNo++;
    void runFight(g, g.token);
  }
}

export async function runFight(g: Game, token: number): Promise<void> {
  const clock = g.stage.clock;
  await clock.wait(0.3);
  while (!g.fight.over) {
    if (token !== g.token) return;
    // Without AUTO every spin of yours waits on SPIN. HOLD never waits: its taps are taken while the enemy's turn plays
    // or while you wait to spin.
    if (g.fight.next === 'player' && !g.prefs.auto) {
      g.awaitingSpin = true;
      g.syncButtons();
      await new Promise<void>((r) => (g.spinResolve = r));
      g.awaitingSpin = false;
      g.syncButtons();
    } else {
      await clock.wait(AUTO_DELAY);
    }
    if (token !== g.token) return;
    const result = g.fight.step();
    // A lost fight is final at once: the save went on offering CONTINUE into it until the run-over screen (about 1.5 s
    // after the killing blow), so a quick reload undid the loss (save QA 2026-11-02).
    if (g.fight.over && g.fight.winner === 'enemy' && g.run && !g.tut) clearRunSave();
    // PAIRS START ON REEL 1: reels 2 and 3 matched and paid as singles (a shield, sword, sword line looked like a pair:
    // expert playtest 2026-11-06). Said on the HOLD chip under your reels, the first few times ever.
    let offPair = false;
    for (const e of result.events) {
      if (e.type === 'spin' && e.side === 'player' && e.score.tier === 'none') {
        const l = e.score.line;
        offPair = l[1] === l[2] && PAYING.has(l[1]) && l[0] !== l[1];
      }
      // (a SPILL pair pays nothing: no prompt to hold it, playtest 2026-11-01; a pair on a frozen reel can't be held, so
      // no prompt either: the tutorial said PRESS Q AND W and the game answered A FROZEN REEL CAN'T BE HELD, playtest 2026-11-06)
      if (e.type === 'spin' && e.side === 'player') g.lastPair = e.score.tier === 'pair' && e.score.groups.some((p) => p.matched && p.reels.length === 2 && p.base > 0 && PAYING.has(p.symbol) && p.reels.every((r) => !(g.fight.sides.player.frozen[r] > 0) && !(g.fight.sides.player.locked[r] > 0)));
      // A freeze moves and locks your reels: the pair it broke can't be held (the HOLD call went stale: playtest).
      else if (e.type === 'freeze' && e.to === 'player') g.lastPair = false;
    }
    noteHurt(g, result.events);
    g.tracker.record(result.events);
    g.rows.push(turnRow(g.fight, result, g.fightNo));
    g.onRows.forEach((f) => f());
    g.presenting = true;
    await g.director.playTurn(result);
    if (token !== g.token) return;
    if (offPair && g.prefs.paylineHints < PAYLINE_HINTS) {
      g.prefs.paylineHints++;
      g.savePrefs();
      g.toolNote = { text: 'PAIRS START ON REEL 1', at: performance.now(), ms: 2500 };
    }
    if (g.tut && g.run?.depth === 0) {
      if (result.events.some((e) => e.type === 'ability' && e.side === 'enemy')) tip(g, 'ability', 'ability');
      else if (result.events.some((e) => e.type === 'spin' && e.side === 'player')) tip(g, 'spin', 'firstSpin');
    }
    // HOLD: the tutorial's first PAIR (after the first-spin callout) says what a HOLD can do with it.
    if (g.tut?.spin && g.lastPair && result.side === 'player' && g.fight.holdsLeft > 0 && !g.coach.active) tip(g, 'hold', 'hold');
    // BUILD-UP: the first dry spin after the first-spin callout says what it was good for (it was a callout before the first SPIN).
    else if (g.tut?.spin && result.side === 'player' && g.fight.buildUpMul() > 1 && !g.coach.active) tip(g, 'buildUp', 'buildUp');
    g.presenting = false;
    if (clock.skipping) {
      clock.endSkip();
      g.synth.enabled = true;
    }
  }
  g.synth.stopLoops();
  if (g.phase === 'fighting' && g.run) {
    afterRunFight(g);
    return;
  }
  g.phase = 'recap';
  g.syncButtons();
  await g.recap.show(g.tracker.stats);
}
