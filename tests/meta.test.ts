import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, levelOf, xpForLevel } from '../src/core/meta';
import { cleanName, nameBlocked, shownTrim, emptyProfile, recordMeta, runScore, sanitizeProfile, shownTitle, type RunEntry } from '../src/core/profile';

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
    expect(Object.keys(p.challenges)).toEqual([]);
    // THE HOUSE needs level 30: not held, so the best level title shows. A challenge title is gone with the challenges.
    expect(shownTitle(p)).toBe('ROOKIE');
    p.title = 'QUICK DRAW';
    expect(shownTitle(p)).toBe('ROOKIE');
  });
  it('names are 3-12 safe characters', () => {
    expect(cleanName('ab')).toBe('');
    expect(cleanName('Lucky_7-Seven-XL')).toBe('LUCKY7-SEVEN');
  });
});

describe('meta: EXPERT_PLAYTEST_9 rules', () => {
  it('a daily run (from before it went to after launch) never earns a machine clear or the Dealer', () => {
    const p = emptyProfile();
    const ids = recordMeta(p, entry({ won: true, acts: 3, act: 3, fights: 18, total: 18, daily: '2026-10-02', cabinet: 'tesla' }), 40).achievements.map((a) => a.id);
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

describe('meta: WEEKLY and CHALLENGES are gone (user, 2026-10-15)', () => {
  it('old challenge records are dropped on load; old WEEKLY / CHALLENGE hiscore entries keep their tag', () => {
    const p = sanitizeProfile({ ...emptyProfile(), challenges: { fast: { best: 900, won: true, tries: 3 }, 'weekly:2026-W40': { best: 1, won: false, tries: 1 } }, runs: [entry({ weekly: '2026-W40', challenge: 'weekly' })] });
    expect(p.challenges).toEqual({});
    expect(p.runs[0].weekly).toBe('2026-W40');
  });
});
