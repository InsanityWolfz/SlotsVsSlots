/**
 * Tiny procedural synth on Web Audio (juice §8): oscillators + noise + envelopes, routed
 * through separate music / sfx / loop buses so ducking music never touches SFX.
 */
export const db = (d: number) => 10 ** (d / 20);

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Exponential glide target. */
  freqEnd?: number;
  dur: number;
  attack?: number;
  release?: number;
  gain?: number;
  /** Seconds from now. */
  at?: number;
  detune?: number;
  bus?: AudioNode;
}

export interface NoiseOpts {
  dur: number;
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  attack?: number;
  release?: number;
  gain?: number;
  at?: number;
  bus?: AudioNode;
}

export class Synth {
  readonly ctx: AudioContext;
  readonly master: GainNode;
  readonly sfx: GainNode;
  readonly music: GainNode;
  readonly loops: GainNode;
  private noiseBuf: AudioBuffer;
  /** When false, one-shots are dropped (used while tap-to-skip fast-forwards). */
  enabled = true;
  muted = false;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.7;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfx = this.bus(1);
    this.music = this.bus(db(-14));
    this.loops = this.bus(db(-9));
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  private bus(gain: number): GainNode {
    const g = this.ctx.createGain();
    g.gain.value = gain;
    g.connect(this.master);
    return g;
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  resume(): void {
    if (this.ctx.state !== 'running') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.now, 0.02);
  }

  private env(g: GainNode, t0: number, peak: number, attack: number, dur: number, release: number): void {
    const p = g.gain;
    p.setValueAtTime(0.0001, t0);
    p.linearRampToValueAtTime(peak, t0 + attack);
    p.setValueAtTime(peak, t0 + Math.max(attack, dur - release));
    p.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }

  tone(o: ToneOpts): void {
    if (!this.enabled) return;
    const t0 = this.now + (o.at ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = this.ctx.createGain();
    this.env(g, t0, o.gain ?? 0.3, o.attack ?? 0.005, o.dur, o.release ?? o.dur * 0.8);
    osc.connect(g).connect(o.bus ?? this.sfx);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  noise(o: NoiseOpts): void {
    if (!this.enabled) return;
    const t0 = this.now + (o.at ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.filter ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t0);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + o.dur);
    f.Q.value = o.q ?? 0.7;
    const g = this.ctx.createGain();
    this.env(g, t0, o.gain ?? 0.3, o.attack ?? 0.003, o.dur, o.release ?? o.dur * 0.8);
    src.connect(f).connect(g).connect(o.bus ?? this.sfx);
    src.start(t0, Math.random());
    src.stop(t0 + o.dur + 0.05);
  }

  /** A long-running noise+hum loop; returns a stop function. */
  loop(filterFreq: number, humFreq: number, gain: number): () => void {
    const t0 = this.now;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = filterFreq;
    f.Q.value = 1.2;
    const hum = this.ctx.createOscillator();
    hum.type = 'triangle';
    hum.frequency.value = humFreq;
    const humG = this.ctx.createGain();
    humG.gain.value = 0.25;
    // Rhythmic flutter so the loop reads as "reel ticking", not static hiss.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 18;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = gain * 0.35;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.08);
    lfo.connect(lfoG).connect(g.gain);
    src.connect(f).connect(g);
    hum.connect(humG).connect(g);
    g.connect(this.loops);
    src.start();
    hum.start();
    lfo.start();
    return () => {
      const t = this.now;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0.0001, t + 0.08);
      for (const n of [src, hum, lfo]) n.stop(t + 0.1);
    };
  }

  /** Fire-and-forget music duck (juice §8). */
  duck(amount: number, dur: number): void {
    const p = this.music.gain;
    const t = this.now;
    const base = db(-14);
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(base * (1 - amount), t + dur * 0.2);
    p.setValueAtTime(base * (1 - amount), t + dur * 0.7);
    p.linearRampToValueAtTime(base, t + dur);
  }

  /** Soft ambient pad: integer-ish detuned sines with a slow shimmer LFO. */
  startAmbient(): void {
    const notes = [110, 164.81, 220, 277.18, 329.63];
    notes.forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      o.detune.value = (i - 2) * 4;
      const g = this.ctx.createGain();
      g.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lg = this.ctx.createGain();
      lg.gain.value = 0.04;
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(this.music);
      o.start();
      lfo.start();
    });
    const air = this.ctx.createBufferSource();
    air.buffer = this.noiseBuf;
    air.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0.03;
    air.connect(f).connect(g).connect(this.music);
    air.start();
  }
}
