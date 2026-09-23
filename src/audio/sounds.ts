import { Synth } from './synth';

/** Every named sound in the game. Pitch param `p` lets the enemy machine sit ~15% lower. */
export class Sounds {
  readonly s: Synth;
  constructor(s: Synth) {
    this.s = s;
  }

  // ---- UI / machine (juice §8) -------------------------------------------------------
  click(): void {
    this.s.tone({ type: 'square', freq: 520, freqEnd: 300, dur: 0.07, gain: 0.12 });
    this.s.noise({ dur: 0.03, filter: 'highpass', freq: 3000, gain: 0.08 });
  }

  spinLoop(p = 1): () => void {
    return this.s.loop(900 * p, 55 * p, 0.35);
  }

  reelStop(i: number, p = 1): void {
    const base = (120 + i * 14) * p;
    this.s.tone({ type: 'sine', freq: base * 1.6, freqEnd: base * 0.6, dur: 0.14, gain: 0.55 });
    this.s.tone({ type: 'square', freq: base * 0.8, freqEnd: base * 0.4, dur: 0.06, gain: 0.08 });
    this.s.noise({ dur: 0.04, filter: 'bandpass', freq: 2500, q: 2, gain: 0.25 });
  }

  ding(i: number): void {
    const f = 880 * (1 + i * 0.12);
    this.s.tone({ freq: f, dur: 0.5, gain: 0.16 });
    this.s.tone({ freq: f * 2, dur: 0.3, gain: 0.07 });
    this.s.tone({ freq: f * 3, dur: 0.18, gain: 0.03 });
  }

  nearMissSting(): void {
    this.s.tone({ type: 'sine', freq: 180, freqEnd: 240, dur: 0.9, attack: 0.05, gain: 0.18 });
    this.s.tone({ type: 'sine', freq: 190, freqEnd: 254, dur: 0.9, attack: 0.05, gain: 0.18 });
    this.s.tone({ type: 'triangle', freq: 720, freqEnd: 960, dur: 0.9, attack: 0.3, gain: 0.04 });
    this.s.noise({ dur: 0.9, filter: 'bandpass', freq: 1200, freqEnd: 3000, q: 3, attack: 0.3, gain: 0.05 });
  }

  nearMissAww(): void {
    this.s.tone({ type: 'triangle', freq: 440, freqEnd: 220, dur: 0.35, gain: 0.14 });
    this.s.tone({ type: 'triangle', freq: 415, freqEnd: 207, dur: 0.35, gain: 0.1, at: 0.05 });
  }

  private arp(notes: number[], step: number, type: OscillatorType, gain: number, len = 0.25): void {
    notes.forEach((f, i) => this.s.tone({ type, freq: f, dur: len, gain, at: i * step }));
  }

  stingerSmall(): void {
    this.arp([523.25, 659.25, 783.99], 0.05, 'triangle', 0.12);
  }

  stingerMedium(): void {
    this.arp([523.25, 659.25, 783.99, 1046.5], 0.06, 'triangle', 0.14, 0.35);
    this.s.duck(0.35, 1.0);
  }

  fanfareJackpot(): void {
    // Call-and-hold brass motif, then a sustained chord.
    const brass = (f: number, at: number, dur: number) => {
      this.s.tone({ type: 'sawtooth', freq: f, dur, gain: 0.08, at, attack: 0.02 });
      this.s.tone({ type: 'square', freq: f, dur, gain: 0.05, at, attack: 0.02, detune: 7 });
    };
    brass(392, 0, 0.12);
    brass(392, 0.14, 0.12);
    brass(523.25, 0.28, 0.4);
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => brass(f, 0.72, 1.1));
    this.s.noise({ dur: 0.6, filter: 'highpass', freq: 6000, gain: 0.05, at: 0.72 });
    this.s.duck(0.8, 3.0);
  }

  tick(progress: number): void {
    this.s.tone({ type: 'square', freq: 2200 * (1 + progress * 0.8), dur: 0.025, gain: 0.04 });
  }

  // ---- Combat ------------------------------------------------------------------------
  whoosh(): void {
    this.s.noise({ dur: 0.22, filter: 'bandpass', freq: 600, freqEnd: 3000, q: 1.5, gain: 0.22, attack: 0.08 });
  }

  hit(dmg: number): void {
    const k = Math.min(1, dmg / 9);
    this.s.tone({ type: 'square', freq: 180 - k * 90, freqEnd: 50, dur: 0.18 + k * 0.15, gain: 0.3 + k * 0.1 });
    this.s.noise({ dur: 0.12 + k * 0.2, filter: 'lowpass', freq: 3000, freqEnd: 300, gain: 0.5 });
    if (k > 0.4) this.s.tone({ type: 'sine', freq: 70, freqEnd: 35, dur: 0.4, gain: 0.5 });
  }

  block(): void {
    this.s.tone({ type: 'square', freq: 1400, freqEnd: 1300, dur: 0.18, gain: 0.08 });
    this.s.tone({ type: 'triangle', freq: 2100, dur: 0.3, gain: 0.08 });
    this.s.noise({ dur: 0.06, filter: 'highpass', freq: 4000, gain: 0.2 });
  }

  shieldGain(n: number): void {
    this.s.tone({ type: 'triangle', freq: 660, dur: 0.12, gain: 0.12 });
    this.s.tone({ type: 'sine', freq: 990 + n * 60, dur: 0.35, gain: 0.1, at: 0.05 });
    this.s.noise({ dur: 0.05, filter: 'bandpass', freq: 3500, q: 3, gain: 0.12 });
  }

  shieldFizz(): void {
    this.s.noise({ dur: 0.35, filter: 'bandpass', freq: 4000, freqEnd: 800, q: 2, gain: 0.1 });
    this.s.tone({ type: 'sine', freq: 900, freqEnd: 300, dur: 0.3, gain: 0.05 });
  }

  energyPip(i: number): void {
    const f = 700 * 2 ** (i / 6);
    this.s.tone({ type: 'square', freq: f, freqEnd: f * 1.5, dur: 0.08, gain: 0.07 });
    this.s.noise({ dur: 0.05, filter: 'highpass', freq: 5000, gain: 0.08 });
  }

  specialCharge(): void {
    this.s.tone({ type: 'sawtooth', freq: 150, freqEnd: 1200, dur: 0.45, gain: 0.1, attack: 0.3 });
    this.s.tone({ type: 'square', freq: 155, freqEnd: 1250, dur: 0.45, gain: 0.05, attack: 0.3 });
    this.s.noise({ dur: 0.45, filter: 'bandpass', freq: 800, freqEnd: 6000, q: 2, gain: 0.08, attack: 0.3 });
  }

  thunder(): void {
    this.s.noise({ dur: 0.08, filter: 'highpass', freq: 2000, gain: 0.6 });
    this.s.noise({ dur: 1.4, filter: 'lowpass', freq: 1800, freqEnd: 120, gain: 0.7, attack: 0.01 });
    this.s.tone({ type: 'sine', freq: 90, freqEnd: 28, dur: 1.0, gain: 0.6 });
    this.s.tone({ type: 'sawtooth', freq: 60, freqEnd: 30, dur: 0.5, gain: 0.12 });
    this.s.duck(0.6, 1.8);
  }

  slimeLaunch(): void {
    this.s.tone({ type: 'sine', freq: 200, freqEnd: 600, dur: 0.15, gain: 0.15 });
    this.s.noise({ dur: 0.12, filter: 'lowpass', freq: 800, gain: 0.12 });
  }

  slimeSplat(): void {
    const p = 0.8 + Math.random() * 0.5;
    this.s.tone({ type: 'sine', freq: 400 * p, freqEnd: 90 * p, dur: 0.16, gain: 0.25 });
    this.s.noise({ dur: 0.14, filter: 'lowpass', freq: 1400 * p, freqEnd: 200, gain: 0.25 });
  }

  slimeFlood(): void {
    this.s.noise({ dur: 1.0, filter: 'lowpass', freq: 300, freqEnd: 1200, q: 4, gain: 0.35, attack: 0.2 });
    this.s.tone({ type: 'sine', freq: 90, freqEnd: 60, dur: 1.0, gain: 0.3, attack: 0.2 });
  }

  fizzle(): void {
    this.s.tone({ type: 'sine', freq: 300, freqEnd: 150, dur: 0.18, gain: 0.08 });
  }

  cleanse(): void {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
      this.s.tone({ type: 'triangle', freq: f, dur: 0.4, gain: 0.08, at: i * 0.05 }),
    );
    this.s.noise({ dur: 0.8, filter: 'highpass', freq: 5000, gain: 0.08, attack: 0.1 });
  }

  pop(i: number): void {
    this.s.tone({ type: 'sine', freq: 600 + i * 40, freqEnd: 1400 + i * 40, dur: 0.07, gain: 0.08 });
  }

  turnCard(player: boolean): void {
    this.s.noise({ dur: 0.3, filter: 'bandpass', freq: 800, freqEnd: 3000, q: 1, gain: 0.08, attack: 0.1 });
    this.s.tone({ type: 'triangle', freq: player ? 523.25 : 392, dur: 0.18, gain: 0.08, at: 0.12 });
  }

  victory(): void {
    this.fanfareJackpot();
  }

  defeat(): void {
    [392, 369.99, 349.23, 261.63].forEach((f, i) =>
      this.s.tone({ type: 'triangle', freq: f, dur: i === 3 ? 1.2 : 0.3, gain: 0.14, at: i * 0.32 }),
    );
    this.s.duck(0.8, 3);
  }

  // ---- writers / abilities / boss ----------------------------------------------------
  iceClink(): void {
    this.s.tone({ type: 'triangle', freq: 2400, freqEnd: 2200, dur: 0.12, gain: 0.08 });
    this.s.tone({ type: 'sine', freq: 3600, dur: 0.2, gain: 0.05, at: 0.02 });
  }

  freeze(): void {
    [1800, 2400, 3100, 2700].forEach((f, i) => this.s.tone({ type: 'triangle', freq: f, freqEnd: f * 1.2, dur: 0.12, gain: 0.07, at: i * 0.04 }));
    this.s.noise({ dur: 0.5, filter: 'highpass', freq: 5000, freqEnd: 9000, gain: 0.12, attack: 0.02 });
  }

  shatter(): void {
    this.s.noise({ dur: 0.35, filter: 'highpass', freq: 3000, gain: 0.25 });
    [3200, 2600, 3800, 2900].forEach((f, i) => this.s.tone({ type: 'square', freq: f, dur: 0.05, gain: 0.03, at: i * 0.03 }));
  }

  chains(): void {
    for (let i = 0; i < 5; i++) this.s.noise({ dur: 0.05, filter: 'bandpass', freq: 2200 + i * 300, q: 6, gain: 0.2, at: i * 0.045 });
    this.s.tone({ type: 'square', freq: 110, freqEnd: 70, dur: 0.25, gain: 0.12, at: 0.2 });
  }

  unchain(): void {
    for (let i = 0; i < 3; i++) this.s.noise({ dur: 0.05, filter: 'bandpass', freq: 3000 - i * 400, q: 6, gain: 0.15, at: i * 0.05 });
  }

  steal(): void {
    this.s.noise({ dur: 0.18, filter: 'bandpass', freq: 1500, freqEnd: 4000, q: 2, gain: 0.2 });
    this.s.tone({ type: 'square', freq: 900, freqEnd: 1600, dur: 0.1, gain: 0.06, at: 0.12 });
    this.s.tone({ type: 'square', freq: 1600, freqEnd: 1200, dur: 0.08, gain: 0.05, at: 0.22 });
  }

  rockThud(): void {
    this.s.tone({ type: 'sine', freq: 110, freqEnd: 45, dur: 0.25, gain: 0.45 });
    this.s.noise({ dur: 0.15, filter: 'lowpass', freq: 900, freqEnd: 150, gain: 0.35 });
  }

  coin(i = 0): void {
    const f = 1568 * 2 ** (i / 12);
    this.s.tone({ type: 'square', freq: f, dur: 0.06, gain: 0.05 });
    this.s.tone({ type: 'square', freq: f * 1.335, dur: 0.18, gain: 0.05, at: 0.06 });
  }

  abilityTick(): void {
    this.s.tone({ type: 'triangle', freq: 330, freqEnd: 440, dur: 0.1, gain: 0.08 });
  }

  abilityFire(): void {
    this.s.tone({ type: 'sawtooth', freq: 220, freqEnd: 110, dur: 0.5, gain: 0.12 });
    this.s.tone({ type: 'sawtooth', freq: 233, freqEnd: 116, dur: 0.5, gain: 0.08 });
    this.s.noise({ dur: 0.4, filter: 'bandpass', freq: 600, freqEnd: 200, q: 1, gain: 0.15 });
    this.s.duck(0.5, 1.2);
  }

  heal(): void {
    [659.25, 783.99, 987.77].forEach((f, i) => this.s.tone({ type: 'sine', freq: f, dur: 0.3, gain: 0.08, at: i * 0.06 }));
  }

  lucky(): void {
    [1318.5, 1568, 2093, 2637].forEach((f, i) => this.s.tone({ type: 'triangle', freq: f, dur: 0.25, gain: 0.07, at: i * 0.05 }));
    this.s.noise({ dur: 0.5, filter: 'highpass', freq: 6000, gain: 0.06 });
  }

  death(): void {
    this.s.tone({ type: 'sawtooth', freq: 300, freqEnd: 30, dur: 1.2, gain: 0.2 });
    this.s.noise({ dur: 1.0, filter: 'lowpass', freq: 2000, freqEnd: 100, gain: 0.4 });
  }
}
