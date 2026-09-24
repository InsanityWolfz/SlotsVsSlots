import { describe, expect, it } from 'vitest';
import { CABINET_ORDER, CABINETS } from '../src/core/cabinets';
import { defaultConfig } from '../src/core/config';
import { currentEnemy, createRun, enemyHp, runActs, TUTORIAL_OPENER_MUL } from '../src/core/run';
import { discover, emptyProfile, runEntry, runScore, sanitizeProfile } from '../src/core/profile';
import { MAX_STAKE, stakeUnlock } from '../src/core/stakes';
import { FLASH_CAP } from '../src/present/camera';

const base = defaultConfig();

describe('public playtest shell', () => {
  it('stakes unlock one tier at a time, per slot machine, only by winning at your best', () => {
    expect(stakeUnlock(0, { won: true, stake: 0 })).toBe(1);
    expect(stakeUnlock(2, { won: true, stake: 1 })).toBeNull(); // below your best: nothing
    expect(stakeUnlock(2, { won: false, stake: 2 })).toBeNull(); // must win
    expect(stakeUnlock(2, { won: true, stake: 2 })).toBe(3); // exactly one step
    expect(stakeUnlock(MAX_STAKE, { won: true, stake: MAX_STAKE })).toBeNull();
  });

  it('with act 3 on, a GREEN+ run is only won by beating the Dealer', () => {
    expect(runActs(createRun(base, 1, 'knight', 2, true))).toBe(3);
    expect(runActs(createRun(base, 1, 'knight', 1, true))).toBe(2);
    expect(runActs(createRun(base, 1, 'knight', 2, false))).toBe(2);
  });

  it('every slot machine has a named hero', () => {
    for (const id of CABINET_ORDER) {
      expect(CABINETS[id].hero.length).toBeGreaterThan(2);
      expect(CABINETS[id].heroSprite).toMatch(/^hero/);
    }
  });

  it('the tutorial opener is softer; normal runs are unchanged', () => {
    const run = createRun(base, 5, 'knight');
    const hp = enemyHp(run, currentEnemy(run));
    run.tutorial = true;
    expect(enemyHp(run, currentEnemy(run))).toBe(Math.round(hp * TUTORIAL_OPENER_MUL));
  });

  it('hiscores record the run, the killer and the build; collection discovers relics and charms', () => {
    const run = createRun(base, 9, 'midas', 1);
    run.player.relics.push('clover');
    run.records.push({ depth: 0, enemy: 'SLIME', archetype: 'slime', won: false, turns: 3, hpBefore: 20, hpAfter: 0, rocksAdded: 0, rocksCrumbled: 0, portrait: 'enemyPortrait' });
    run.over = true;
    const e = runEntry(run, 1000);
    expect(e.killer).toBe('SLIME');
    expect(e.killerFight).toBe(1);
    expect(e.relics).toEqual(['clover']);
    expect(e.charms.map((c) => c.enh)).toContain('gold');
    expect(runScore(e)).toBe(0);
    expect(runScore({ ...e, won: true, fights: 12, acts: 2, stake: 0 })).toBe(2200);
    const p = emptyProfile();
    expect(discover(p, run)).toBe(true);
    expect(p.found.relics).toEqual(['clover']);
    expect(p.found.charms).toEqual(['gold']);
    expect(discover(p, run)).toBe(false);
  });

  it('a hand-edited profile save is cleaned up, not trusted', () => {
    const p = sanitizeProfile({ found: { relics: ['clover', 'nope', 'clover'], charms: ['gold', 'x'] }, runs: [{ cabinet: 'hacker' }, { cabinet: 'knight', stake: 99, fights: 'lots', relics: ['bell', 3] }, null] });
    expect(p.found.relics).toEqual(['clover']);
    expect(p.found.charms).toEqual(['gold']);
    expect(p.runs.length).toBe(1);
    expect(p.runs[0].stake).toBe(MAX_STAKE);
    expect(p.runs[0].fights).toBe(0);
    expect(p.runs[0].relics).toEqual(['bell']);
    expect(sanitizeProfile('garbage')).toEqual(emptyProfile());
  });

  it('full-screen flashes are capped (photosensitivity)', () => {
    expect(FLASH_CAP).toBeLessThanOrEqual(0.25);
  });
});

describe('relic activations are visible', () => {
  it('opening relics fire on turn 1, and pay-changing relics ride on the score', async () => {
    const { Fight } = await import('../src/core/fight');
    const run = createRun(base, 11, 'knight');
    run.player.relics.push('battery', 'key', 'bell', 'prism');
    const { fightConfig } = await import('../src/core/run');
    const f = new Fight(fightConfig(run, base), 3);
    const first = f.step().events;
    expect(first.some((e) => e.type === 'relic' && e.relic === 'battery')).toBe(true);
    let paid = false;
    for (let i = 0; i < 80 && !f.over; i++) {
      for (const e of f.step().events) if (e.type === 'spin' && e.side === 'player' && e.score.relics?.length) paid = true;
    }
    expect(paid).toBe(true);
  });
});
