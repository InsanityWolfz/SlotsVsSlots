/**
 * MUSIC: a small chiptune engine on Web Audio (user, 2026-10-08: "code generated chiptunes"). Four NES-style voices
 * (two pulse waves, a triangle bass, a noise drum kit) play songs that are composed by code: each song is a key, a
 * mode, a tempo, two chord progressions and a seed, and the melody, arpeggio, bass line and drums are written from
 * those by fixed rules (a motif per section, chord tones on the strong beats, the motif repeated over each chord).
 * Same seed, same song, every time: the songs are as fixed as hand-written ones, just written by rules.
 *
 * Works on any BaseAudioContext, so tools can render a song offline (tools/music/render.ts) to listen to it.
 */
import { Rng } from '../core/rng';

export type SongId = 'menu' | 'lounge' | 'act1' | 'act2' | 'act3' | 'boss';

type Mode = 'major' | 'minor' | 'dorian' | 'harmonic' | 'phrygian' | 'mixolydian';
const MODES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

interface SongSpec {
  bpm: number;
  /** MIDI note of the key's root (lead octave). */
  root: number;
  mode: Mode;
  /** Scale degrees (0 = I) of each bar's chord: section A, then section B. */
  progA: number[];
  progB: number[];
  seed: number;
  /** 0..1: how busy the melody is. */
  density: number;
  /** Lead pulse width (0.125, 0.25 or 0.5). */
  duty: number;
  /** Drum pattern over 16 steps: K kick, S snare, h hat, - rest. */
  drums: string;
  /** Bass style: roots on the beat, or the chiptune octave bounce. */
  bass: 'root' | 'octave' | 'walk';
  /** Arpeggio speed in steps (0 = no arpeggio voice). */
  arp: number;
  /** Swing on the off 16ths (0..0.3). */
  swing?: number;
  /** Overall level of this song (the quiet ones sit under the SFX). */
  level?: number;
}

/** The soundtrack. Keys and tempos climb with the stakes: calm lounge between fights, faster and darker by act. */
export const SONGS: Record<SongId, SongSpec> = {
  // Title and menus: bright, bouncy, a casino marquee.
  menu: { bpm: 112, root: 72, mode: 'major', progA: [0, 5, 3, 4], progB: [3, 4, 2, 5], seed: 11, density: 0.55, duty: 0.25, drums: 'K-h-S-h-K-hKS-h-', bass: 'octave', arp: 2, level: 0.9 },
  // Between fights (map, draft, shop): a lazy lounge groove, no lead drums pounding while you read cards.
  lounge: { bpm: 92, root: 69, mode: 'dorian', progA: [0, 3, 0, 4], progB: [5, 3, 1, 4], seed: 23, density: 0.38, duty: 0.125, drums: 'K---h---K-K-h---', bass: 'walk', arp: 0, swing: 0.22, level: 0.75 },
  act1: { bpm: 132, root: 69, mode: 'minor', progA: [0, 5, 2, 6], progB: [3, 4, 0, 4], seed: 37, density: 0.6, duty: 0.25, drums: 'K-h-S-h-K-h-S-hh', bass: 'octave', arp: 2 },
  act2: { bpm: 140, root: 67, mode: 'dorian', progA: [0, 6, 3, 4], progB: [5, 6, 0, 4], seed: 53, density: 0.65, duty: 0.5, drums: 'K-hKS-h-K-hKS-hS', bass: 'octave', arp: 2 },
  act3: { bpm: 148, root: 64, mode: 'harmonic', progA: [0, 5, 3, 4], progB: [0, 6, 5, 4], seed: 71, density: 0.7, duty: 0.25, drums: 'K-hKS-hKK-hKS-SS', bass: 'octave', arp: 1 },
  // Bosses: phrygian, driving eighth-note bass, the busiest drums.
  boss: { bpm: 156, root: 64, mode: 'phrygian', progA: [0, 1, 0, 6], progB: [5, 1, 3, 1], seed: 97, density: 0.75, duty: 0.125, drums: 'KhhKShhKKhhKShSS', bass: 'root', arp: 1, level: 1 },
};

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface Note {
  /** Step within the bar (0..15) and length in steps. */
  step: number;
  len: number;
  /** Scale degree offset from the chord root (can be negative or past 7). */
  deg: number;
}

/** A song written out: per bar, the chord degree and the melody notes. 16 bars: A A' B A''. */
interface Score {
  spec: SongSpec;
  bars: { chord: number; lead: Note[] }[];
}

function motif(rng: Rng, density: number, cadence: boolean): Note[] {
  const notes: Note[] = [];
  let step = 0;
  let deg = rng.pick([0, 2, 4]);
  while (step < 16) {
    const strong = step % 4 === 0;
    const play = strong ? rng.next() < 0.75 + density * 0.25 : rng.next() < density * 0.7;
    // Lengths: mostly 8ths, some 16ths in busy songs, a long note now and then.
    const len = Math.min(16 - step, rng.next() < density * 0.35 ? 1 : rng.next() < 0.2 ? 4 : 2);
    if (play) {
      // Strong beats land on chord tones (0, 2, 4); weak ones step by a scale degree.
      if (strong) deg = rng.pick([0, 2, 4, deg]);
      else deg += rng.pick([-1, 1, 1, -2, 2]);
      deg = Math.max(-3, Math.min(9, deg));
      notes.push({ step, len, deg });
    }
    step += len;
  }
  if (cadence) {
    // The phrase ends home: a long chord tone on beat 3.
    while (notes.length && notes[notes.length - 1].step >= 8) notes.pop();
    notes.push({ step: 8, len: 8, deg: rng.pick([0, 0, 4]) });
  }
  return notes;
}

export function compose(id: SongId): Score {
  const spec = SONGS[id];
  const rng = new Rng(spec.seed);
  const mA = motif(rng, spec.density, false);
  const mA2 = motif(rng, spec.density, false);
  const mB = motif(rng, spec.density, false);
  const end = motif(rng, spec.density, true);
  const bars: Score['bars'] = [];
  const section = (prog: number[], a: Note[], b: Note[], last: Note[]) =>
    prog.forEach((chord, i) => bars.push({ chord, lead: i === prog.length - 1 ? last : i % 2 ? b : a }));
  section(spec.progA, mA, mA2, mA2);
  section(spec.progA, mA, mA2, end);
  section(spec.progB, mB, mA2, mB);
  section(spec.progA, mA, mA2, end);
  return { spec, bars };
}

/** Scale degree (any octave) -> MIDI note, in the song's key. */
function pitch(spec: SongSpec, degree: number, octave = 0): number {
  const scale = MODES[spec.mode];
  const o = Math.floor(degree / 7);
  const d = ((degree % 7) + 7) % 7;
  return spec.root + scale[d] + 12 * (o + octave);
}

/** The four voices, built once per context. */
export class ChipVoices {
  private waves = new Map<number, PeriodicWave>();
  private noise: AudioBuffer;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly out: AudioNode,
  ) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    // 1-bit noise, like the NES noise channel (rough, not hissy).
    let lfsr = 1;
    for (let i = 0; i < len; i++) {
      const bit = (lfsr ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = lfsr & 1 ? 0.8 : -0.8;
    }
  }

  private pulse(duty: number): PeriodicWave {
    let w = this.waves.get(duty);
    if (!w) {
      const n = 48;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = ((2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty));
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(duty, w);
    }
    return w;
  }

  tone(kind: 'pulse' | 'triangle', midi: number, t: number, dur: number, gain: number, duty = 0.5, out: AudioNode = this.out): void {
    const o = this.ctx.createOscillator();
    if (kind === 'pulse') o.setPeriodicWave(this.pulse(duty));
    else o.type = 'triangle';
    o.frequency.value = midiHz(midi);
    const g = this.ctx.createGain();
    // A chip envelope: instant attack, a short decay to a sustain, a quick release.
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.004);
    g.gain.setTargetAtTime(gain * 0.65, t + 0.01, 0.06);
    g.gain.setTargetAtTime(0, t + dur * 0.92, 0.015);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  drum(kind: string, t: number, gain: number): void {
    if (kind === 'K') {
      // Kick: a triangle diving in pitch (the NES trick) plus a click of noise.
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain * 1.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + 0.2);
      return;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = kind === 'S' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 'S' ? 1800 : 7000;
    const g = this.ctx.createGain();
    const dur = kind === 'S' ? 0.12 : 0.035;
    g.gain.setValueAtTime(gain * (kind === 'S' ? 1.1 : 0.45), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

/** The songs' level into the music bus (the bus itself sits at -14 dB, set for the old ambient pad). */
export const MUSIC_GAIN = 2;

/** Steps per song (16 bars of 16). */
export const SONG_STEPS = 16 * 16;

/** Schedules one 16th step of a song at time t. */
export function playStep(v: ChipVoices, score: Score, i: number, t: number): void {
  const spec = score.spec;
  const stepDur = 60 / spec.bpm / 4;
  const bar = score.bars[Math.floor(i / 16) % score.bars.length];
  const s = i % 16;
  const lvl = spec.level ?? 1;
  const chord = bar.chord;
  // Lead (pulse 1).
  for (const n of bar.lead) if (n.step === s) v.tone('pulse', pitch(spec, chord + n.deg), t, n.len * stepDur, 0.11 * lvl, spec.duty);
  // Harmony / arpeggio (pulse 2): the chord's three notes cycled fast, an octave down, quieter.
  if (spec.arp > 0 && s % spec.arp === 0) {
    const tones = [0, 2, 4, 7];
    const k = (s / spec.arp) % tones.length;
    v.tone('pulse', pitch(spec, chord + tones[k], -1), t, spec.arp * stepDur, 0.045 * lvl, 0.5);
  } else if (spec.arp === 0 && s % 8 === 0) {
    // Lounge: soft held chord stabs instead of an arpeggio.
    for (const d of [2, 4]) v.tone('pulse', pitch(spec, chord + d, -1), t + (spec.swing ?? 0) * stepDur, 3 * stepDur, 0.03 * lvl, 0.5);
  }
  // Bass (triangle), two octaves down.
  const root = pitch(spec, chord, -2);
  if (spec.bass === 'octave' && s % 2 === 0) v.tone('triangle', root + (s % 4 === 2 ? 12 : 0), t, 2 * stepDur, 0.22 * lvl);
  else if (spec.bass === 'root' && s % 2 === 0) v.tone('triangle', root + (s % 8 === 6 ? 7 : 0), t, 2 * stepDur, 0.24 * lvl);
  else if (spec.bass === 'walk' && s % 4 === 0) v.tone('triangle', pitch(spec, chord + [0, 2, 4, 5][s / 4], -2), t, 4 * stepDur, 0.22 * lvl);
  // Drums.
  const d = spec.drums[s];
  if (d && d !== '-') v.drum(d === 'h' ? 'h' : d, t + (s % 2 ? (spec.swing ?? 0) * stepDur : 0), 0.12 * lvl);
}

/**
 * The live player: a look-ahead scheduler (notes are queued ~0.15 s ahead on the audio clock), one song at a time,
 * with a short crossfade between songs.
 */
export class MusicPlayer {
  private voices: ChipVoices | null = null;
  private bus: GainNode | null = null;
  private score: Score | null = null;
  private song: SongId | null = null;
  private step = 0;
  private nextT = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private scores = new Map<SongId, Score>();

  constructor(
    private ctx: AudioContext,
    private out: AudioNode,
  ) {}

  get current(): SongId | null {
    return this.song;
  }

  play(id: SongId): void {
    if (id === this.song) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Fade the old song out (its notes already queued die with its bus).
    if (this.bus) {
      const old = this.bus;
      old.gain.cancelScheduledValues(now);
      old.gain.setValueAtTime(old.gain.value, now);
      old.gain.linearRampToValueAtTime(0, now + 0.6);
      setTimeout(() => old.disconnect(), 900);
    }
    this.bus = ctx.createGain();
    this.bus.gain.setValueAtTime(0, now);
    this.bus.gain.linearRampToValueAtTime(MUSIC_GAIN, now + 0.5);
    this.bus.connect(this.out);
    this.voices = new ChipVoices(ctx, this.bus);
    let score = this.scores.get(id);
    if (!score) this.scores.set(id, (score = compose(id)));
    this.score = score;
    this.song = id;
    this.step = 0;
    this.nextT = now + 0.08;
    if (!this.timer) this.timer = setInterval(() => this.pump(), 25);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
    if (this.bus) {
      const old = this.bus;
      old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      setTimeout(() => old.disconnect(), 600);
    }
    this.bus = null;
  }

  private pump(): void {
    if (!this.score || !this.voices || this.ctx.state !== 'running') return;
    const ahead = this.ctx.currentTime + 0.15;
    // After a long suspend (a hidden tab), skip ahead instead of firing a backlog of notes at once.
    if (this.nextT < this.ctx.currentTime - 0.25) this.nextT = this.ctx.currentTime + 0.05;
    const stepDur = 60 / this.score.spec.bpm / 4;
    while (this.nextT < ahead) {
      playStep(this.voices, this.score, this.step, this.nextT);
      this.step = (this.step + 1) % SONG_STEPS;
      this.nextT += stepDur;
    }
  }
}
