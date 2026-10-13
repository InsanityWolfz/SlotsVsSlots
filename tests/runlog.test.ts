import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config';
import { runSummary } from '../src/core/runLog';
import { playRun } from '../src/sim/play';

describe('COPY RUN', () => {
  it('lists the machine, stake, seed, every fight and the build', () => {
    let text = '';
    const log = playRun(defaultConfig(), 42, 'knight', 2, { onEnd: (run) => (text = runSummary(run, 'v')) });
    expect(text).toContain('KNIGHT | GREEN | SEED 42');
    expect(text.split('\n').filter((l) => /^\s*\d+\. /.test(l))).toHaveLength(log.fights.length);
    expect(text).toContain('RELICS:');
    expect(text).toContain('CHARMS:');
  });
});

describe('COPY RUN reads as the game does', () => {
  it('says CHIP, not goldbar, and names encounters', () => {
    let text = '';
    playRun(defaultConfig(), 7, 'midas', 2, { onEnd: (run) => (text = runSummary(run, 'v')) });
    expect(text).not.toMatch(/goldbar|GOLDBAR/);
    expect(text).not.toMatch(/#\d/);
    expect(text).toContain('START RELIC:');
  });
});
