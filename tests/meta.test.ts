import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { ACHIEVEMENTS, applyChallenge, applyWeekly, challengeById, challengeOpen, CHALLENGES, levelOf, weekKey, weekly, xpForLevel } from '../src/core/meta';
import { cleanName, nameBlocked, shownTrim, emptyProfile, recordMeta, runEntry, runScore, sanitizeProfile, shownTitle, type RunEntry } from '../src/core/profile';
import { createRun, fightConfig, fixedRun, runActs } from '../src/core/run';

const entry = (over: Partial<RunEntry> = {}): RunEntry => ({
  at: 1,
  cabinet: 'knight',
  stake: 0,
  won: false,
  act: 1,
  acts: 2,
  fights: 3,
  total: 12,
  relics: [],
  charms: [],
  maxHp: 300,
  chips: 5,
  ...over,
});

describe('meta: weekly challenge', () => {
  it('keys ISO weeks in UTC', () => {
    expect(weekKey(new Date(Date.UTC(2026, 9, 1)))).toBe('2026-W40');
    expect(weekKey(new Date(Date.UTC(2027, 0, 1)))).toBe('2026-W53');
    expect(weekKey(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-W02');
  });
  it('picks two different edges and is the same for everyone', () => {
    for (let w = 1; w <= 52; w++) {
      const k = `2026-W${String(w).padStart(2, '0')}`;
      const a = weekly(k);
      expect(a.edges[0]).not.toBe(a.edges[1]);
      expect(weekly(k)).toEqual(a);
    }
  });
  it('plays through the Dealer on a fixed map, under both edges, with fresh spins', () => {
    const k = '2026-W40';
    const w = weekly(k);
    const run = createRun(defaultConfig(), w.seed, w.cabinet, 0);
    applyWeekly(run, k);
    expect(fixedRun(run)).toBe(true);
    expect(runActs(run)).toBe(3);
    // Fixed map and offers, fresh spins every try (user playtest: a retry replayed the same spins).
    const again = createRun(defaultConfig(), w.seed, w.cabinet, 0);
    applyWeekly(again, k);
    expect(fightConfig(again, defaultConfig()).seed).not.toBe(fightConfig(run, defaultConfig()).seed);
    expect(runEntry(run, 1).weekly).toBe(k);
  });
});

describe('meta: challenges', () => {
  it('open in order', () => {
    expect(challengeOpen({}, 0)).toBe(true);
    expect(challengeOpen({}, 1)).toBe(true);
    expect(challengeOpen({}, 2)).toBe(false);
    // A clear opens the next two.
    const one = { [CHALLENGES[0].id]: { best: 1, won: true, tries: 1 } };
    expect(challengeOpen(one, 2)).toBe(true);
    expect(challengeOpen(one, 3)).toBe(false);
  });
  it('SHORT STACK starts broke; GLASS JAW takes 10% max HP; edges reach the fight', () => {
    const broke = createRun(defaultConfig(), 7, 'midas', 0);
    applyChallenge(broke, challengeById('broke')!);
    expect(broke.player.chips).toBe(0);
    const glass = createRun(defaultConfig(), 7, 'joker', 0);
    const hp = glass.player.maxHp;
    applyChallenge(glass, challengeById('glass')!);
    expect(glass.player.maxHp).toBeLessThan(hp);
    const plain = createRun(defaultConfig(), 7, 'knight', 0);
    const fast = createRun(defaultConfig(), 7, 'knight', 0);
    applyChallenge(fast, challengeById('fast')!);
    const a = fightConfig(plain, defaultConfig()).enemy.ability;
    const b = fightConfig(fast, defaultConfig()).enemy.ability;
    if (a && b) expect(b.every).toBeLessThanOrEqual(a.every);
  });
});

describe('meta: levels, achievements, titles', () => {
  it('levels from XP', () => {
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(xpForLevel(5)).level).toBe(5);
    expect(levelOf(xpForLevel(5) - 1).level).toBe(4);
  });
  it('a first clear earns its achievements once, plus XP', () => {
    const p = emptyProfile();
    const e = entry({ won: true, act: 2, fights: 12 });
    const g = recordMeta(p, e, 40);
    const ids = g.achievements.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining(['first_win', 'house', 'clear', 'clear_knight']));
    expect(ids).not.toContain('dealer');
    expect(g.xp).toBe(runScore(e) + 250 * ids.length);
    expect(p.stats).toEqual({ runs: 1, wins: 1, dailies: 0 });
    expect(recordMeta(p, e, 40).achievements.map((a) => a.id)).not.toContain('clear');
  });
  it('tutorial runs earn nothing', () => {
    const p = emptyProfile();
    const g = recordMeta(p, entry({ won: true, tutorial: true }), 40);
    expect(g.xp).toBe(0);
    expect(g.achievements).toEqual([]);
  });
  it('challenge clears keep the best score and grant the title', () => {
    const p = emptyProfile();
    recordMeta(p, entry({ challenge: 'fast', fights: 2 }), 40);
    const g = recordMeta(p, entry({ challenge: 'fast', won: true, fights: 12 }), 40);
    expect(p.challenges.fast.won).toBe(true);
    expect(p.challenges.fast.tries).toBe(2);
    expect(g.newBest).toBe(true);
    expect(g.titles).toContain('QUICK DRAW');
    expect(g.achievements.map((a) => a.id)).toContain('challenge_1');
  });
  it('achievement ids are unique', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe('meta: profile save', () => {
  it('old saves get XP, counters and the achievements their runs already show', () => {
    const p = sanitizeProfile({ found: {}, runs: [entry({ won: true, fights: 12 }), entry({ tutorial: true })] });
    expect(p.stats.runs).toBe(1);
    expect(Object.keys(p.achievements)).toEqual(expect.arrayContaining(['first_win', 'house', 'clear', 'clear_knight']));
    expect(p.achievements.dealer).toBeUndefined();
    expect(p.xp).toBe(runScore(entry({ won: true, fights: 12 })) + 250 * Object.keys(p.achievements).length);
    // Only once: a save that already has achievements isn't backfilled again.
    expect(sanitizeProfile(JSON.parse(JSON.stringify(p))).xp).toBe(p.xp);
  });
  it('keeps clean names, titles you hold, and drops junk', () => {
    const p = sanitizeProfile({ runs: [], name: 'ace high!', title: 'THE HOUSE', achievements: { clear: 5, 'bad key!': 1 }, challenges: { fast: { best: 900, won: true, tries: 2 }, nope: { best: 1 } }, xp: 10, stats: { runs: 2 } });
    expect(p.name).toBe('ACEHIGH');
    expect(Object.keys(p.achievements)).toEqual(['clear']);
    expect(Object.keys(p.challenges)).toEqual(['fast']);
    // THE HOUSE needs level 30: not held, so the best level title shows.
    expect(shownTitle(p)).toBe('ROOKIE');
    p.title = 'QUICK DRAW';
    expect(shownTitle(p)).toBe('QUICK DRAW');
  });
  it('names are 3-12 safe characters', () => {
    expect(cleanName('ab')).toBe('');
    expect(cleanName('Lucky_7-Seven-XL')).toBe('LUCKY7-SEVEN');
  });
});

describe('meta: EXPERT_PLAYTEST_9 rules', () => {
  it('weekly setups: HOUSE CUT only alone, never HIGH ROLLERS + GLASS JAW, never a challenge copy, and they vary', () => {
    const seen = new Set<string>();
    for (let w = 1; w <= 53; w++) {
      const wk = weekly(`2026-W${String(w).padStart(2, '0')}`);
      if (wk.edges.includes('heal')) expect(wk.edges).toEqual(['heal']);
      expect(wk.edges.includes('rollers') && wk.edges.includes('frail')).toBe(false);
      for (const c of CHALLENGES)
        expect(c.cabinet === wk.cabinet && c.stake === 0 && (c.chips ?? null) === (wk.chips ?? null) && c.edges.length === wk.edges.length && c.edges.every((e) => wk.edges.includes(e))).toBe(false);
      seen.add(`${wk.edges.join('+')}:${wk.chips ?? ''}`);
    }
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
  it('the daily and weekly never earn a machine clear or the Dealer', () => {
    const p = emptyProfile();
    const ids = recordMeta(p, entry({ won: true, acts: 3, act: 3, fights: 18, total: 18, daily: '2026-10-02', cabinet: 'tesla' }), 40).achievements.map((a) => a.id);
    expect(ids).toContain('daily_win');
    expect(ids).not.toContain('dealer');
    expect(ids).not.toContain('clear_tesla');
  });
  it('the name blocklist (letters only, dashes ignored), and no false hits on everyday words', () => {
    expect(nameBlocked('NAZI-1')).toBe(true);
    expect(nameBlocked('N-A-Z-I')).toBe(true);
    expect(nameBlocked('GRAPE')).toBe(false);
    expect(nameBlocked('PEACOCK')).toBe(false);
  });
});

describe('meta: TRIMS (cosmetic)', () => {
  it('unlock by level; a run that levels up reports them; you only wear what you hold', () => {
    const p = emptyProfile();
    p.trim = 'diamond';
    expect(shownTrim(p).id).toBe('classic');
    p.xp = xpForLevel(5) - 100;
    const g = recordMeta(p, entry({ won: true, fights: 12 }), 40);
    expect(g.levelAfter).toBeGreaterThanOrEqual(5);
    expect(g.trims).toContain('SILVER');
    p.trim = 'silver';
    expect(shownTrim(p).id).toBe('silver');
    expect(sanitizeProfile(JSON.parse(JSON.stringify({ ...p, trim: 'nope' }))).trim).toBeUndefined();
  });
});
