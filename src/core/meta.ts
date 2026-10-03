/**
 * The META LAYERS around runs: CHALLENGES (fixed twists, unlocked in order), THE WEEKLY CHALLENGE (one seed, machine
 * and two HOUSE EDGES a week, as many tries as you like), ACHIEVEMENTS, and the player LEVEL (XP from every run's
 * score) with its TITLES. Pure data + helpers; the game owns persistence. Cosmetic only: nothing here changes balance
 * outside the challenge runs themselves.
 */
import { CABINETS, CABINET_ORDER, type CabinetId } from './cabinets';
import { dailySeed } from './daily';
import { EDGE_TEXT, startEdges, type EdgeId, type RunState } from './run';
import { MAX_STAKE, STAKES } from './stakes';

// ---- CHALLENGES ---------------------------------------------------------------------------------

export interface ChallengeDef {
  id: string;
  name: string;
  cabinet: CabinetId;
  /** 0 = WHITE (acts 1-2); 2 = GREEN (through the Dealer). */
  stake: number;
  edges: EdgeId[];
  /** Start with this many chips instead of the machine's own. */
  chips?: number;
  /** The title a clear earns. */
  title: string;
  /** Flavour line (the edges are listed separately). */
  text: string;
}

export const CHALLENGES: ChallengeDef[] = [
  // Ordered by measured difficulty (challenges.ts 400 greedy, EXPERT_PLAYTEST_9 D4): 34 / 30 / 29 / 27 / 25 / 13.5 / 11.
  { id: 'glass', name: 'GLASS JAW', cabinet: 'joker', stake: 0, edges: ['frail', 'fast'], title: 'WILD CARD', text: 'ONE GOOD HIT AND IT IS OVER.' },
  { id: 'rollers', name: 'HEAVY HITTERS', cabinet: 'tesla', stake: 0, edges: ['rollers'], title: 'LIVE WIRE', text: 'EVERYONE AT THIS TABLE CAME TO STAY.' },
  { id: 'fast', name: 'FAST COMPANY', cabinet: 'knight', stake: 0, edges: ['fast'], title: 'QUICK DRAW', text: 'THE TABLE PLAYS FAST TONIGHT.' },
  { id: 'broke', name: 'SHORT STACK', cabinet: 'midas', stake: 0, edges: [], chips: 0, title: 'SELF-MADE', text: 'KING AURUM WALKS IN WITH EMPTY POCKETS.' },
  // (Was HOUSE CUT: it attacked BRIAR's identity, 50.7 -> 13.7, and walled the ladder: EXPERT_PLAYTEST_9 D4.)
  { id: 'cut', name: 'BAD BLOOD', cabinet: 'thorn', stake: 0, edges: ['rollers', 'frail', 'fast'], title: 'THORN IN THE SIDE', text: 'EVERY TABLE CAME TO STAY. LET THEM BLEED ON YOUR THORNS.' },
  { id: 'all', name: 'ALL OF IT', cabinet: 'midas', stake: 2, edges: ['fast'], title: 'HIGH ROLLER', text: 'THE WHOLE HOUSE PLAYS FAST. ALL THE WAY TO THE DEALER.' },
  { id: 'night', name: 'THE LONG NIGHT', cabinet: 'knight', stake: 2, edges: ['heal'], title: 'NIGHT OWL', text: 'ALL THE WAY TO THE DEALER, ON HALF HEALS.' },
];
export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);
export const edgeLine = (edges: EdgeId[]) => (edges.length ? edges.map((e) => `${EDGE_TEXT[e].title}: ${EDGE_TEXT[e].text}`).join('. ') : '');

/** Best result per challenge (and per weekly key). */
export interface ChallengeRecord {
  best: number;
  won: boolean;
  tries: number;
}
/** The first two are open; each clear opens the next two, so one hard step never walls off the rest (EXPERT_PLAYTEST_9 D4). */
export const challengeOpen = (records: Record<string, ChallengeRecord>, i: number) =>
  i <= 1 || !!records[CHALLENGES[i].id]?.won || !!records[CHALLENGES[i - 1].id]?.won || !!records[CHALLENGES[i - 2].id]?.won;

/** Set up a fresh run (made with the challenge's machine and stake) as this challenge. */
export function applyChallenge(run: RunState, c: ChallengeDef): void {
  run.challenge = c.id;
  run.mods = [...c.edges];
  if (c.chips != null) run.player.chips = c.chips;
  startEdges(run, c.edges);
}

// ---- THE WEEKLY CHALLENGE -----------------------------------------------------------------------

/** The ISO week key (UTC), e.g. "2026-W40": everyone shares the week. */
export function weekKey(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
export const WEEK_KEY = /^\d{4}-W\d{2}$/;

/** The weekly's HOUSE EDGE pairs: no HOUSE CUT (any pair with it made 3-6% weeks), and no HIGH ROLLERS + GLASS JAW
 * (the 5% weeks: EXPERT_PLAYTEST_9 D7). Variety comes from the machine and the seed. */
export const WEEKLY_PAIRS: [EdgeId, EdgeId][] = [
  ['fast', 'rollers'],
  ['fast', 'frail'],
];
/** The week's machine and its pair of HOUSE EDGES. */
export function weekly(key: string): { cabinet: CabinetId; edges: EdgeId[]; seed: number } {
  const seed = dailySeed(`weekly:${key}`);
  const cabinet = CABINET_ORDER[dailySeed(`weekly:${key}:machine`) % CABINET_ORDER.length];
  const pair = WEEKLY_PAIRS[dailySeed(`weekly:${key}:edge`) % WEEKLY_PAIRS.length];
  return { cabinet, edges: [...pair], seed };
}

/** Make a fresh run (seeded with weekly(key).seed) THE WEEKLY CHALLENGE: fights fixed by the week, through the Dealer. */
export function applyWeekly(run: RunState, key: string): void {
  const w = weekly(key);
  run.weekly = key;
  run.challenge = 'weekly';
  run.mods = [...w.edges];
  startEdges(run, w.edges);
}

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
  weekly: boolean;
  challenge?: string;
  liensPaid: number;
  tutorial: boolean;
  stats: MetaStats;
  /** Achievements already earned (for "all of them" checks). */
  have: Record<string, number>;
  /** Collection found / total. */
  found: number;
  collection: number;
  challengesWon: number;
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
  challengesWon: number;
}

const clearOf = (cab: CabinetId): AchievementDef => ({
  id: `clear_${cab}`,
  name: `${CABINETS[cab].hero} CASHES IN`,
  text: `CLEAR A RUN WITH ${CABINETS[cab].name}.`,
  // Full numbers only: THE DAILY and THE WEEKLY ease act 3 and lend you machines you haven't unlocked (EXPERT_PLAYTEST_9 D5).
  check: (c) => c.won && c.cabinet === cab && !c.daily && !c.weekly,
});
const stakeOf = (lvl: number): AchievementDef => ({
  id: `stake_${lvl}`,
  name: `${STAKES[lvl].name} STAKE`,
  text: `CLEAR A RUN ON STAKE ${lvl} (${STAKES[lvl].name}) OR HIGHER.`,
  check: (c) => c.won && c.stake >= lvl && !c.challenge,
});

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', name: 'FIRST BLOOD', text: 'WIN A FIGHT.', check: (c) => c.act > 1 || c.won || c.score > 0 },
  { id: 'house', name: 'HOUSE CALL', text: 'BEAT THE HOUSE.', check: (c) => c.act >= 2 || c.won },
  { id: 'clear', name: 'MIRROR, MIRROR', text: 'CLEAR A RUN: BEAT THE MIRROR.', check: (c) => c.won },
  { id: 'dealer', name: 'THE HOUSE ALWAYS LOSES', text: 'BEAT THE DEALER (NOT IN THE DAILY OR WEEKLY).', check: (c) => c.won && c.acts >= 3 && !c.daily && !c.weekly },
  ...CABINET_ORDER.map(clearOf),
  {
    id: 'all_machines',
    name: 'FULL HOUSE',
    text: 'CLEAR A RUN WITH EVERY SLOT MACHINE.',
    check: (c) => CABINET_ORDER.every((m) => c.have[`clear_${m}`] || (c.won && c.cabinet === m && !c.daily && !c.weekly)),
    progress: (c) => [CABINET_ORDER.filter((m) => c.have[`clear_${m}`]).length, CABINET_ORDER.length],
  },
  ...Array.from({ length: MAX_STAKE }, (_, i) => stakeOf(i + 1)),
  { id: 'daily_play', name: 'DAILY BREAD', text: 'PLAY THE DAILY RUN.', check: (c) => c.daily },
  { id: 'daily_win', name: 'DAILY DOUBLE', text: 'WIN THE DAILY RUN.', check: (c) => c.daily && c.won },
  { id: 'daily_7', name: 'CREATURE OF HABIT', text: 'PLAY 7 DAILY RUNS.', check: (c) => c.stats.dailies >= 7, progress: (c) => [c.stats.dailies, 7] },
  { id: 'weekly_win', name: 'WEEK IN, WEEK OUT', text: 'CLEAR THE WEEKLY CHALLENGE.', check: (c) => c.weekly && c.won },
  { id: 'challenge_1', name: 'CHALLENGER', text: 'CLEAR A CHALLENGE.', check: (c) => c.challengesWon >= 1 },
  { id: 'challenge_all', name: 'NO CHALLENGE', text: 'CLEAR EVERY CHALLENGE.', check: (c) => c.challengesWon >= CHALLENGES.length, progress: (c) => [c.challengesWon, CHALLENGES.length] },
  { id: 'endless_1', name: 'LET IT RIDE', text: 'CLEAR AN ENDLESS LOOP.', check: (c) => c.loops >= 1 },
  { id: 'endless_3', name: 'ON A HEATER', text: 'CLEAR 3 ENDLESS LOOPS IN ONE RUN.', check: (c) => c.loops >= 3 },
  { id: 'chips_50', name: 'MONEYBAGS', text: 'WIN A RUN HOLDING 50 CHIPS OR MORE.', check: (c) => c.won && c.chips >= 50 },
  { id: 'relics_12', name: 'MAGPIE', text: 'FINISH A RUN WITH 12 RELICS OR MORE.', check: (c) => c.relics >= 12 },
  { id: 'score_5k', name: 'BIG WINNER', text: 'SCORE 5,000 IN ONE RUN.', check: (c) => c.score >= 5000 },
  { id: 'score_10k', name: 'JACKPOT', text: 'SCORE 10,000 IN ONE RUN.', check: (c) => c.score >= 10000 },
  { id: 'score_20k', name: 'WHALE WATCHING', text: 'SCORE 20,000 IN ONE RUN.', check: (c) => c.score >= 20000 },
  { id: 'lien_paid', name: 'PAID IN FULL', text: 'PAY OFF A LIEN AT THE CASHIER.', check: (c) => c.liensPaid >= 1 },
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
  return [...LEVEL_TITLES.map((t) => ({ title: t.title, how: `REACH LEVEL ${t.level}`, level: t.level })), ...CHALLENGES.map((c) => ({ title: c.title, how: `CLEAR THE ${c.name} CHALLENGE` }))];
}

/** Every title the player holds: by level, and one per cleared challenge. */
export function titlesOwned(level: number, records: Record<string, ChallengeRecord>): string[] {
  return [...LEVEL_TITLES.filter((t) => level >= t.level).map((t) => t.title), ...CHALLENGES.filter((c) => records[c.id]?.won).map((c) => c.title)];
}
