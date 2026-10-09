import { describe, expect, it } from 'vitest';
import { Sounds } from '../src/audio/sounds';

/** A Synth stand-in that fails on any pitch the browser would reject (playtest crash: shieldGain(1.3) played NaN Hz). */
function fakeSynth() {
  const bad: string[] = [];
  const s = {
    tune: 2 ** (5 / 12),
    tone: (o: { freq: number; freqEnd?: number }) => {
      if (!Number.isFinite(o.freq) || (o.freqEnd != null && !Number.isFinite(o.freqEnd))) bad.push(String(o.freq));
    },
    noise: () => {},
    duck: () => {},
    loop: () => () => {},
  };
  return { s, bad };
}

describe('sound effects', () => {
  it('every tuned effect plays a finite pitch for any amount, whole or not', () => {
    const { s, bad } = fakeSynth();
    const snd = new Sounds(s as never) as unknown as Record<string, (...a: number[]) => void>;
    const proto = Object.getOwnPropertyNames(Sounds.prototype).filter((k) => k !== 'constructor' && k !== 'arp' && k !== 'k');
    for (const k of proto) for (const v of [0, 1.3, 2.5, 7, 13, -1, 40]) snd[k](v);
    expect(bad).toEqual([]);
  });
});
