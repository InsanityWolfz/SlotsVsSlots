/**
 * The META LAYERS around runs: ACHIEVEMENTS, and the player LEVEL (XP from every run's score) with its TITLES. Pure
 * data + helpers; the game owns persistence. Cosmetic only: nothing here changes balance. (CHALLENGES and THE WEEKLY
 * CHALLENGE are gone: user, 2026-10-15.)
 */
import { CABINETS, CABINET_ORDER, type CabinetId } from './cabinets';
import { MAX_STAKE, STAKES } from './stakes';

/** Best result per challenge / weekly (both gone, user 2026-10-15; the profile field stays so saves keep their shape). */
export interface ChallengeRecord {
  best: number;
  won: boolean;
  tries: number;
}
/** An ISO week key, e.g. "2026-W40" (old WEEKLY hiscore entries keep their tag). */
export const WEEK_KEY = /^\d{4}-W\d{2}$/;

// ---- LEVELS AND TITLES --------------------------------------------------------------------------

/** Total XP to reach a level (level 1 at 0). */
export const xpForLevel = (lvl: number) => 400 * lvl * (lvl - 1);
export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return { level, into: xp - xpForLevel(level), need: xpForLevel(level + 1) - xpForLevel(level) };
}
/** XP an achievement is worth. */
export const ACHIEVEMENT_XP = 250;

/**
 * TRIMS: cosmetic frames for your slot machine, unlocked by level (cosmetic only). Colours for the bezel the fight draws
 * (rim, its dark inner band, the top-left light, the glow, the reel dividers) and a 16x16 crest on top of it.
 */
export interface Trim {
  id: string;
  name: string;
  level: number;
  rim: string;
  dark: string;
  light: string;
  glow: string;
  crest: string;
  /** THE HOUSE: the rim cycles through the colours. */
  shimmer?: boolean;
}
export const TRIMS: Trim[] = [
  { id: 'classic', name: 'CLASSIC', level: 1, rim: '#d9a640', dark: '#8a5a1c', light: '#ffe08a', glow: '#ffcf5a', crest: 'trimClassic' },
  { id: 'bronze', name: 'BRONZE', level: 3, rim: '#c8763a', dark: '#6e3a1a', light: '#f0a868', glow: '#ff9a4a', crest: 'trimBronze' },
  { id: 'silver', name: 'SILVER', level: 5, rim: '#b8c4d8', dark: '#4f5b74', light: '#ffffff', glow: '#d3dde8', crest: 'trimSilver' },
  { id: 'neon', name: 'NEON', level: 8, rim: '#ff4fd8', dark: '#6a1a8a', light: '#7cf4ff', glow: '#ff4fd8', crest: 'trimNeon' },
  { id: 'velvet', name: 'VELVET', level: 12, rim: '#c8304a', dark: '#561530', light: '#ff8aa0', glow: '#ff4a6a', crest: 'trimVelvet' },
  { id: 'emerald', name: 'EMERALD', level: 16, rim: '#2ec46a', dark: '#0f4128', light: '#b8f25a', glow: '#4cff8a', crest: 'trimEmerald' },
  { id: 'diamond', name: 'DIAMOND', level: 20, rim: '#9de8ff', dark: '#2e6aa8', light: '#ffffff', glow: '#b4f4ff', crest: 'trimDiamond' },
  { id: 'obsidian', name: 'OBSIDIAN', level: 25, rim: '#4c2372', dark: '#140c1c', light: '#c795f0', glow: '#8a4fc4', crest: 'trimObsidian' },
  { id: 'house', name: 'THE HOUSE', level: 30, rim: '#ffd23f', dark: '#8e1f3a', light: '#fff6c8', glow: '#ff6a5a', crest: 'trimHouse', shimmer: true },
];
export const trimById = (id?: string) => TRIMS.find((t) => t.id === id) ?? TRIMS[0];
export const trimsOwned = (level: number) => TRIMS.filter((t) => level >= t.level);

/** Titles earned by level. */
export const LEVEL_TITLES: { level: number; title: string }[] = [
  { level: 1, title: 'ROOKIE' },
  { level: 3, title: 'REGULAR' },
  { level: 5, title: 'GRINDER' },
  { level: 8, title: 'CARD COUNTER' },
  { level: 12, title: 'CARD SHARP' },
  { level: 16, title: 'WHALE' },
  { level: 20, title: 'HIGH LIMIT' },
  { level: 25, title: 'LEGEND' },
  { level: 30, title: 'THE HOUSE' },
];

// ---- ACHIEVEMENTS -------------------------------------------------------------------------------

/** What an achievement check sees: the finished run's summary, and the lifetime counters (this run included). */
export interface AchievementCtx {
  won: boolean;
  /** The run went through the Dealer (3 acts). */
  acts: number;
  act: number;
  cabinet: CabinetId;
  stake: number;
  score: number;
  chips: number;
  relics: number;
  loops: number;
  killer?: string;
  daily: boolean;
  tutorial: boolean;
  stats: MetaStats;
  /** Achievements already earned (for "all of them" checks). */
  have: Record<string, number>;
  /** Collection found / total. */
  found: number;
  collection: number;
}

export interface MetaStats {
  runs: number;
  wins: number;
  dailies: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  text: string;
  /** Hidden until earned (the text reads ???). */
  secret?: boolean;
  check: (c: AchievementCtx) => boolean;
  /** A counter for the TROPHIES screen ([have, need]). */
  progress?: (c: ProgressCtx) => [number, number];
}

/** What the TROPHIES counters read from the profile. */
export interface ProgressCtx {
  stats: MetaStats;
  have: Record<string, number>;
  found: number;
  collection: number;
}

const clearOf = (cab: CabinetId): AchievementDef => ({
  id: `clear_${cab}`,
  name: `${CABINETS[cab].hero} CASHES IN`,
  text: `CLEAR A RUN WITH ${CABINETS[cab].name}.`,
  // Full numbers only: THE DAILY eases act 3 and lends you machines you haven't unlocked (EXPERT_PLAYTEST_9 D5).
  check: (c) => c.won && c.cabinet === cab && !c.daily,
});
const stakeOf = (lvl: number): AchievementDef => ({
  id: `stake_${lvl}`,
  name: `${STAKES[lvl].name} STAKE`,
  text: `CLEAR A RUN ON STAKE ${lvl} (${STAKES[lvl].name}) OR HIGHER.`,
  check: (c) => c.won && c.stake >= lvl && !c.daily,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', name: 'FIRST BLOOD', text: 'WIN A FIGHT.', check: (c) => c.act > 1 || c.won || c.score > 0 },
  { id: 'house', name: 'HOUSE CALL', text: 'BEAT THE HOUSE.', check: (c) => c.act >= 2 || c.won },
  { id: 'clear', name: 'NO MORE BETS', text: 'CLEAR A RUN: STOP THE WHEEL.', check: (c) => c.won },
  { id: 'dealer', name: 'THE HOUSE ALWAYS LOSES', text: 'BEAT THE DEALER (NOT IN THE DAILY).', check: (c) => c.won && c.acts >= 3 && !c.daily },
  ...CABINET_ORDER.map(clearOf),
  {
    id: 'all_machines',
    name: 'FULL HOUSE',
    text: 'CLEAR A RUN WITH EVERY SLOT MACHINE.',
    check: (c) => CABINET_ORDER.every((m) => c.have[`clear_${m}`] || (c.won && c.cabinet === m && !c.daily)),
    progress: (c) => [CABINET_ORDER.filter((m) => c.have[`clear_${m}`]).length, CABINET_ORDER.length],
  },
  ...Array.from({ length: MAX_STAKE }, (_, i) => stakeOf(i + 1)),
  // (THE DAILY RUN's three went to after launch with it, 2026-10-29; earned ones stay in the save.)
  { id: 'endless_1', name: 'LET IT RIDE', text: 'CLEAR AN ENDLESS LOOP.', check: (c) => c.loops >= 1 },
  { id: 'endless_3', name: 'ON A HEATER', text: 'CLEAR 3 ENDLESS LOOPS IN ONE RUN.', check: (c) => c.loops >= 3 },
  { id: 'turbo', name: 'BROKE THE BANK', text: 'BEAT THE TURBO BOSS.', check: (c) => c.loops >= 5 },
  { id: 'chips_50', name: 'MONEYBAGS', text: 'WIN A RUN HOLDING 50 CHIPS OR MORE.', check: (c) => c.won && c.chips >= 50 },
  { id: 'relics_12', name: 'MAGPIE', text: 'FINISH A RUN WITH 12 RELICS OR MORE.', check: (c) => c.relics >= 12 },
  { id: 'score_5k', name: 'BIG WINNER', text: 'SCORE 5,000 IN ONE RUN.', check: (c) => c.score >= 5000 },
  { id: 'score_10k', name: 'JACKPOT', text: 'SCORE 10,000 IN ONE RUN.', check: (c) => c.score >= 10000 },
  { id: 'score_20k', name: 'WHALE WATCHING', text: 'SCORE 20,000 IN ONE RUN.', check: (c) => c.score >= 20000 },
  { id: 'repo_loss', name: 'REPOSSESSED', text: 'LOSE A RUN TO THE REPO MAN.', secret: true, check: (c) => !c.won && !!c.killer?.endsWith('REPO MAN') },
  // (Not "REGULAR": that's the level 3 title.)
  { id: 'runs_25', name: 'HOUSE REGULAR', text: 'PLAY 25 RUNS.', check: (c) => c.stats.runs >= 25, progress: (c) => [c.stats.runs, 25] },
  { id: 'runs_100', name: 'LIFER', text: 'PLAY 100 RUNS.', check: (c) => c.stats.runs >= 100, progress: (c) => [c.stats.runs, 100] },
  { id: 'collect_half', name: 'COLLECTOR', text: 'DISCOVER HALF THE COLLECTION.', check: (c) => c.found * 2 >= c.collection, progress: (c) => [c.found, Math.ceil(c.collection / 2)] },
  { id: 'collect_all', name: 'COMPLETIONIST', text: 'DISCOVER THE WHOLE COLLECTION.', check: (c) => c.found >= c.collection, progress: (c) => [c.found, c.collection] },
];

/** The achievements this run newly earns (ids, in list order). */
export function newAchievements(c: AchievementCtx): AchievementDef[] {
  if (c.tutorial) return [];
  const out: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (c.have[a.id]) continue;
    if (a.check({ ...c, have: { ...c.have, ...Object.fromEntries(out.map((x) => [x.id, 1])) } })) out.push(a);
  }
  return out;
}

/** Every title and how it's earned (for the TROPHIES screen's locked ones). */
export function allTitles(): { title: string; how: string; level?: number }[] {
  return LEVEL_TITLES.map((t) => ({ title: t.title, how: `REACH LEVEL ${t.level}`, level: t.level }));
}

/** Every title the player holds (by level). */
export function titlesOwned(level: number): string[] {
  return LEVEL_TITLES.filter((t) => level >= t.level).map((t) => t.title);
}
