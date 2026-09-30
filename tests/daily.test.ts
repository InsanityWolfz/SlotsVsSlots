import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { CABINET_ORDER } from '../src/core/cabinets';
import { dailyCabinet, dailyKey, dailySeed } from '../src/core/daily';
import { sanitizeProfile } from '../src/core/profile';
import { createRun, fightConfig } from '../src/core/run';

describe('THE DAILY RUN', () => {
  it('one seed and one slot machine per day, the same for everyone', () => {
    const key = dailyKey(new Date(2026, 8, 30));
    expect(key).toBe('2026-09-30');
    expect(dailySeed(key)).toBe(dailySeed('2026-09-30'));
    expect(dailySeed(key)).not.toBe(dailySeed('2026-10-01'));
    expect(CABINET_ORDER).toContain(dailyCabinet(key));
  });

  it("its fights are fixed by the day (a normal run's are random)", () => {
    const base = defaultConfig();
    const run = createRun(base, dailySeed('2026-09-30'), 'knight');
    expect(fightConfig(run, base).seed).toBeNull();
    run.daily = '2026-09-30';
    const a = fightConfig(run, base).seed;
    expect(a).not.toBeNull();
    expect(fightConfig(run, base).seed).toBe(a);
    run.depth++;
    expect(fightConfig(run, base).seed).not.toBe(a);
  });

  it('the save keeps the day a run belongs to and the spent try (and drops junk)', () => {
    const p = sanitizeProfile({ lastDaily: '2026-09-30', runs: [{ cabinet: 'knight', daily: '2026-09-30' }, { cabinet: 'knight', daily: 'nope' }] });
    expect(p.lastDaily).toBe('2026-09-30');
    expect(p.runs[0].daily).toBe('2026-09-30');
    expect(p.runs[1].daily).toBeUndefined();
    expect(sanitizeProfile({ lastDaily: 7 }).lastDaily).toBeUndefined();
  });
});
