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

describe('COPY RUN encounters', () => {
  it('keeps a played result when the visit ends with WALK AWAY', () => {
    let text = '';
    playRun(defaultConfig(), 42, 'knight', 0, {
      onEnd: (run) => {
        run.encounters = [
          { act: 2, id: 'bj', choice: 0, good: null, what: '', more: true },
          { act: 2, id: 'bj', choice: 0, good: false, what: 'DEALER WINS', more: true },
          { act: 2, id: 'bj', choice: 1, good: null, what: 'WALKED AWAY' },
          { act: 2, id: 'claw', choice: 3, good: null, what: 'WALKED AWAY' },
        ];
        text = runSummary(run, 'v');
      },
    });
    expect(text).toContain('A2 TWENTY-ONE: DEALER WINS, A2 CLAW MACHINE: WALKED AWAY');
  });
});
