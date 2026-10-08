/**
 * MUSIC: a small chiptune engine on Web Audio (user, 2026-10-08: "code generated chiptunes"). Four NES-style voices
 * play HAND-COMPOSED scores (2026-10-08 rewrite: the old seeded melody generator wandered and every song sounded
 * alike):
 *   - LEAD: pulse 1 (duty per song/section, delayed vibrato on long notes, optional bend-in and echo/canon copy);
 *   - HARM: pulse 2, the countermelody, comping stabs or fast NES arpeggio chords (`C4+E4+G4`);
 *   - BASS: the triangle;
 *   - DRUMS: noise + triangle kit (kick, snare, ghost, hats, crash, toms, rim).
 *
 * The score format is a tiny tracker language, one string per voice per section:
 *   `C5:4`  note C5 for 4 sixteenth steps (lengths are sticky: `D5 E5` reuse the last length)
 *   `r:2`   rest            `~:4`  tie: lengthen the previous note
 *   `C4+E4+G4:16`  an arpeggiated chord (one oscillator cycling the notes, the NES trick)
 *   flags after the length: `!` accent, `'` staccato, `^` bend in from a semitone below
 *   `|` bar line (checked: must fall on a bar boundary)    `{...}*4` repeat
 * Drums are one 16-char string per bar (cycled over the section): K kick, S snare, s ghost snare, h closed hat,
 * o open hat, C crash (+kick), T high tom, t low tom, x rim, - rest.
 * Each song has an optional intro (played once) and a loop of sections; every section's length is checked.
 *
 * Works on any BaseAudioContext, so tools can render a song offline (tools/music/render.cjs) to listen to it.
 */

export type SongId = 'menu' | 'lounge' | 'act1' | 'act2' | 'act3' | 'house' | 'mirror' | 'dealer';

interface Echo {
  /** Delay in 16th steps, level relative to the lead, transpose (semitones) and pulse width of the copy. */
  steps: number;
  gain: number;
  transpose?: number;
  duty?: number;
}

interface Section {
  bars: number;
  lead?: string;
  harm?: string;
  bass?: string;
  drums?: string;
  /** Overrides for this section only. */
  leadDuty?: number;
  harmDuty?: number;
  harmGain?: number;
  /** undefined: the song's echo; null: none here. */
  echo?: Echo | null;
  /** Semitones (a key change). */
  transpose?: number;
}

interface Song {
  bpm: number;
  /** Swing: how far (in 16th steps) the off-beat 8ths are pushed late. */
  swing?: number;
  /** Overall level of this song (the quiet ones sit under the SFX). */
  level?: number;
  lead: { duty: number; gain: number; vib: number };
  harm: { duty: number; gain: number };
  bassGain?: number;
  drumGain?: number;
  /** Seconds per arpeggio note. */
  arp?: number;
  echo?: Echo;
  intro?: Section[];
  loop: Section[];
}

// ---- the score language ---------------------------------------------------------------

interface Ev {
  notes: number[];
  len: number;
  acc: boolean;
  bend: boolean;
  stac: boolean;
}

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiOf(tok: string, where: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(tok);
  if (!m) throw new Error(`music ${where}: bad note "${tok}"`);
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

function expand(src: string): string {
  let s = src;
  for (let prev = ''; prev !== s; ) {
    prev = s;
    s = s.replace(/\{([^{}]*)\}\*(\d+)/g, (_, body: string, n: string) => Array(Number(n)).fill(body).join(' '));
  }
  return s;
}

function parseVoice(src: string, bars: number, transpose: number, where: string): (Ev | undefined)[] {
  const out: (Ev | undefined)[] = new Array(bars * 16);
  let pos = 0;
  let len = 4;
  let last: Ev | undefined;
  for (const tok of expand(src).split(/\s+/).filter(Boolean)) {
    if (tok === '|') {
      if (pos % 16) throw new Error(`music ${where}: bar line at step ${pos}`);
      continue;
    }
    const m = /^([^:'^!]+)(?::(\d+))?([!'^]*)$/.exec(tok);
    if (!m) throw new Error(`music ${where}: bad token "${tok}"`);
    if (m[2]) len = Number(m[2]);
    if (m[1] === '~') {
      if (!last) throw new Error(`music ${where}: tie with nothing to tie`);
      last.len += len;
    } else if (m[1] === 'r') last = undefined;
    else {
      last = { notes: m[1].split('+').map((n) => midiOf(n, where) + transpose), len, acc: m[3].includes('!'), bend: m[3].includes('^'), stac: m[3].includes("'") };
      if (pos < out.length) out[pos] = last;
    }
    pos += len;
  }
  if (pos !== bars * 16) throw new Error(`music ${where}: ${pos} steps, want ${bars * 16}`);
  return out;
}

interface Step {
  lead?: Ev;
  harm?: Ev;
  bass?: Ev;
  drum?: string;
  sec: Section;
}

/** A song compiled to one entry per 16th step: the intro, then the loop. */
export interface Score {
  id: SongId;
  song: Song;
  bpm: number;
  stepDur: number;
  /** Steps in the intro (played once) and in the loop. */
  intro: number;
  loop: number;
  steps: Step[];
}

export function compose(id: SongId): Score {
  const song = SONGS[id];
  const steps: Step[] = [];
  const add = (secs: Section[], part: string) =>
    secs.forEach((sec, si) => {
      const where = `${id} ${part}${si}`;
      const tr = sec.transpose ?? 0;
      const voice = (src: string | undefined, v: string) => (src ? parseVoice(src, sec.bars, tr, `${where}.${v}`) : []);
      const lead = voice(sec.lead, 'lead');
      const harm = voice(sec.harm, 'harm');
      const bass = voice(sec.bass, 'bass');
      const drums = (sec.drums ?? '').split(/[\s|]+/).filter(Boolean);
      for (const d of drums) if (d.length !== 16) throw new Error(`music ${where}.drums: bar "${d}" is not 16 steps`);
      for (let s = 0; s < sec.bars * 16; s++) {
        const d = drums.length ? drums[Math.floor(s / 16) % drums.length][s % 16] : '-';
        steps.push({ lead: lead[s], harm: harm[s], bass: bass[s], drum: d === '-' ? undefined : d, sec });
      }
    });
  add(song.intro ?? [], 'intro');
  const intro = steps.length;
  add(song.loop, 'loop');
  return { id, song, bpm: song.bpm, stepDur: 60 / song.bpm / 4, intro, loop: steps.length - intro, steps };
}

// ---- writing helpers (they only spell out patterns; every note is chosen by hand) -----------

/** Repeat a bar (or bars) n times. */
const x = (n: number, s: string) => Array(n).fill(s).join(' ');
/** Off-beat chord stabs, the oom-pah "pah". */
const stab = (c: string) => `r:2 ${c}:2' r:2 ${c}:2' r:2 ${c}:2' r:2 ${c}:2' |`;
/** Octave bounce bass, the chiptune staple. */
const oct = (lo: string, hi: string) => `{${lo}:2 ${hi}:2}*4 |`;

// ---- THE SOUNDTRACK -------------------------------------------------------------------

/** MENU, "Marquee Lights": F major showtune bounce, oom-pah comping, a rhythm-changes bridge. */
const MENU: Song = (() => {
  const F = 'F4+A4+C5', Dm = 'F4+A4+D5', Gm7 = 'F4+Bb4+D5', C7 = 'E4+G4+Bb4', G7 = 'F4+B4+D5', Bb = 'F4+Bb4+D5', Bbm = 'F4+Bb4+Db5';
  const A7 = 'C#4+E4+G4+A4', D7 = 'D4+F#4+A4+C5', G7b = 'D4+F4+G4+B4', C7b = 'E4+G4+Bb4+C5';
  // The hook: up the F triad, a cheeky turn (E-F), up to A; answered down; then sequenced up a step on Gm.
  const h1 = 'A4:2 C5:2 F5:3 E5:1 F5:2 A5:4 r:2 |';
  const h2 = 'G5:2 F5:2 D5:4 r:2 F5:2 E5:2 D5:2 |';
  const h3 = 'Bb4:2 D5:2 G5:3 F#5:1 G5:2 Bb5:4 r:2 |';
  const aLead = `${h1} ${h2} ${h3} A5:2 G5:2 E5:2 G5:2 C5:4 r:4 | ${h1} ${h2} B4:2 D5:2 F5:2 A5:2 G5:4 F5:2 D5:2 | E5:2 G5:2 Bb5:2 G5:2 E5:2 C5:2 G4:2 Bb4:2 |`;
  // Second time: climbs to the high C, then the sly minor iv (Bbm) before the cadence.
  const a2Body = `${h1} ${h2} ${h3} A5:2 G5:2 E5:2 G5:2 C6:6 r:2 | Bb5:2 A5:2 F5:2 D5:2 F5:4 G5:2 A5:2 | Bb5:2 Ab5:2 F5:2 Db5:2 F5:6 r:2 | A5:6 F5:2 G5:4 E5:4 |`;
  const aHarm = [F, Dm, Gm7, C7, F, Dm, G7, C7].map(stab).join(' ');
  const a2Harm = [F, Dm, Gm7, C7, Bb, Bbm].map(stab).join(' ') + ` r:2 ${F}:2' r:2 ${F}:2' r:2 ${C7}:2' r:2 ${C7}:2' | ${stab(F)}`;
  const aBass = 'F2:4 C3:4 F2:4 C3:4 | D2:4 A2:4 D2:4 A2:4 | G2:4 D3:4 G2:4 D3:4 | C2:4 G2:4 C3:4 E2:4 | F2:4 C3:4 F2:4 C3:4 | D2:4 A2:4 D2:4 A2:4 | G2:4 D3:4 B2:4 G2:4 | C3:4 Bb2:4 G2:4 E2:4 |';
  const a2Bass = 'F2:4 C3:4 F2:4 C3:4 | D2:4 A2:4 D2:4 A2:4 | G2:4 D3:4 G2:4 D3:4 | C2:4 G2:4 C3:4 E2:4 | Bb1:4 F2:4 Bb2:4 F2:4 | Bb1:4 F2:4 Bb2:4 Db3:4 | C3:4 A2:4 C2:4 E2:4 |';
  const main = 'K-h-S-h-K-hKS-h-';
  const aDrums = `C-h-S-h-K-hKS-h- ${main} ${main} K-h-S-h-K-hKS-SS ${main} ${main} ${main} K-h-S-h-S-SsT-t-`;
  return {
    bpm: 126,
    level: 0.78,
    lead: { duty: 0.25, gain: 0.1, vib: 15 },
    harm: { duty: 0.5, gain: 0.045 },
    intro: [
      {
        bars: 2,
        // "Ding, ding, ding-ding-DING!" up the C7 and back down to the pickup.
        lead: "C5:2' C5:2' C5:2 E5:2 G5:2 C6:4 r:2 | Bb5:4 G5:2 E5:2 C5:2 r:2 G4:2 Bb4:2 |",
        harm: 'C4+E4+G4+Bb4:16 | C4+E4+G4+Bb4:8 r:8 |',
        bass: 'C2:4 r:4 C2:4 r:4 | C3:4 r:4 C2:2 E2:2 G2:2 Bb2:2 |',
        drums: 'K-------K---h-h- K---S---S-SsS-SS',
      },
    ],
    loop: [
      { bars: 8, lead: aLead, harm: aHarm, bass: aBass, drums: aDrums },
      { bars: 8, lead: `${a2Body} F5:8 r:4 E5:2 D5:2 |`, harm: a2Harm, bass: `${a2Bass} F2:4 C3:4 F2:4 G#2:4 |`, drums: aDrums },
      {
        // Bridge: dominant cycle A7-D7-G7-C7, lead calls, pulse 2 answers.
        bars: 8,
        lead: 'C#5:4 E5:4 A5:6 G5:2 | E5:8 r:8 | F#5:4 A5:4 C6:6 A5:2 | F#5:8 r:8 | B4:4 D5:4 G5:6 F5:2 | D5:8 r:8 | E5:2 G5:2 Bb5:2 C6:2 Bb5:2 G5:2 E5:2 G5:2 | Bb5:2 G5:2 E5:2 C5:2 r:4 G4:2 Bb4:2 |',
        harm: `${A7}:16 | ${A7}:8 A4:2! G4:2! E4:2! C#4:2! | ${D7}:16 | ${D7}:8 D5:2! C5:2! A4:2! F#4:2! | ${G7b}:16 | ${G7b}:8 G4:2! F4:2! D4:2! B3:2! | ${C7b}:16 | ${C7b}:8 r:8 |`,
        harmDuty: 0.25,
        bass: 'A2:4 E2:4 A2:4 C#3:4 | E3:4 C#3:4 B2:4 A2:4 | D2:4 A2:4 D3:4 F#2:4 | A2:4 F#2:4 D2:4 F#2:4 | G2:4 D3:4 G2:4 B2:4 | D3:4 B2:4 G2:4 Db3:4 | C3:4 G2:4 E2:4 G2:4 | C2:4 E2:4 G2:4 Bb2:4 |',
        drums: 'C---h-h-K---h-h- K---h-h-K---h-h- K---h-h-K---h-h- K---h-h-K---h-h- K---h-h-K---h-h- K---h-h-K---h-h- K---h-h-K-h-S-h- K-S-S-S-SsSsT-t-',
      },
      { bars: 8, lead: `${a2Body} F5:6 r:2 C5:2 A4:2 G4:2 Bb4:2 |`, harm: a2Harm, bass: `${a2Bass} F2:4 C3:4 A2:4 E2:4 |`, drums: aDrums },
    ],
  };
})();

/** LOUNGE, "Comp Room": swung D dorian jazz, a muted lead with a dotted-8th echo, lots of space. */
const LOUNGE: Song = (() => {
  const Dm7 = 'D3+F3+A3+C4', G7 = 'F3+B3+E4', Em7b5 = 'G3+Bb3+D4', A7 = 'G3+C#4+F4', D7 = 'F#3+C4+E4';
  const Gm7 = 'F3+Bb3+D4', C7 = 'E3+Bb3+D4', Fmaj7 = 'E3+A3+C4', Bbmaj7 = 'A3+D4+F4';
  // Charleston comping, alternating with a lazier push.
  const comp = (cs: string[]) => cs.map((c, i) => (i % 2 ? `r:4 ${c}:2 r:4 ${c}:2 r:4 |` : `${c}:3 r:3 ${c}:2 r:8 |`)).join(' ');
  const aBody = 'r:4 F4:2 A4:2 C5:6^ A4:2 | D5:2 C5:2 B4:4 G4:4 r:4 |';
  const turn = 'r:2 E4:2 G4:2 Bb4:2 D5:6 C5:2 | C#5:4^ E5:2 G5:2 F5:2 E5:2 C#5:4 |';
  const ride = 'K---x-h-h---x-h- h---x-h-K---x-h-';
  return {
    bpm: 96,
    swing: 0.55,
    level: 0.58,
    lead: { duty: 0.5, gain: 0.085, vib: 22 },
    harm: { duty: 0.5, gain: 0.04 },
    arp: 0.055,
    echo: { steps: 3, gain: 0.28 },
    loop: [
      {
        bars: 8,
        lead: `${aBody} r:4 F4:2 A4:2 C5:4 E5:4^ | D5:8 B4:2 A4:2 G4:4 | ${turn} D5:12 r:4 | r:16 |`,
        harm: comp([Dm7, G7, Dm7, G7, Em7b5, A7, Dm7, D7]),
        bass: 'D2:4 F2:4 A2:4 Ab2:4 | G2:4 B2:4 D3:4 C#3:4 | D3:4 A2:4 F2:4 Ab2:4 | G2:4 B2:4 D3:4 F3:4 | E3:4 D3:4 Bb2:4 G2:4 | A2:4 E2:4 G2:4 Eb3:4 | D3:4 C3:4 A2:4 F2:4 | D2:4 F#2:4 A2:4 C3:4 |',
        drums: ride,
      },
      {
        bars: 8,
        lead: 'r:2 Bb4:2 D5:2 F5:6^ D5:2 Bb4:2 | E5:4 D5:2 C5:2 Bb4:6 r:2 | r:2 A4:2 C5:2 E5:6^ C5:2 A4:2 | D5:4 C5:2 Bb4:2 A4:6 r:2 | r:2 G4:2 Bb4:2 D5:6 C5:2 Bb4:2 | A4:2 C#5:2 E5:2 G5:2 F5:4 E5:4 | F5:4 D5:4 A4:8 | r:8 E4:2 G4:2 Bb4:2 C#5:2 |',
        harm: comp([Gm7, C7, Fmaj7, Bbmaj7, Em7b5, A7, Dm7, A7]),
        bass: 'G2:4 Bb2:4 D3:4 G2:4 | C3:4 Bb2:4 G2:4 E2:4 | F2:4 A2:4 C3:4 A2:4 | Bb2:4 A2:4 G2:4 F2:4 | E2:4 G2:4 Bb2:4 G#2:4 | A2:4 C#3:4 G2:4 E2:4 | D3:4 A2:4 F2:4 D2:4 | A2:4 E2:4 A2:4 C#3:4 |',
        drums: ride,
      },
      {
        bars: 8,
        lead: `D5:4 F4:2 A4:2 C5:6^ A4:2 | D5:2 C5:2 B4:4 G4:4 r:4 | r:4 F4:2 A4:2 C5:2 D5:2 E5:4^ | F5:6 E5:2 D5:4 B4:4 | ${turn} D5:4 F5:4 E5:2 D5:2 C5:2 A4:2 | D5:8 r:8 |`,
        harm: comp([Dm7, G7, Dm7, G7, Em7b5, A7, Dm7, Dm7]),
        bass: 'D3:4 C3:4 A2:4 Ab2:4 | G2:4 B2:4 D3:4 C#3:4 | D3:4 A2:4 F2:4 Ab2:4 | G2:4 B2:4 D3:4 F3:4 | E3:4 D3:4 Bb2:4 G2:4 | A2:4 E2:4 G2:4 Eb3:4 | D3:4 C3:4 A2:4 F2:4 | D3:4 C3:4 A2:4 E2:4 |',
        drums: ride,
      },
      {
        // The breather: the band vamps in two, the lead only drops in little fills.
        bars: 8,
        lead: 'r:16 | r:8 D5:2 C5:2 B4:2 G4:2 | r:16 | r:8 F5:2 D5:2 B4:2 G4:2 | r:4 A4:4^ F4:8 | r:8 E5:2 C#5:2 A4:2 G4:2 | r:16 | r:8 E4:2 G4:2 Bb4:2 C#5:2 |',
        harm: comp([Dm7, G7, Dm7, G7, Bbmaj7, A7, Dm7, A7]),
        bass: 'D2:8 A2:8 | G2:8 D2:8 | D2:8 A2:8 | G2:8 B2:8 | Bb2:8 F2:8 | A2:8 E2:8 | D2:8 A2:8 | A2:8 E2:8 |',
        drums: 'h---h-h-h---h-h-',
      },
    ],
  };
})();

/** ACT 1, "First Spin": G major, bright and bouncy, octave bass, a hook with a skip in it. */
const ACT1: Song = (() => {
  const G = 'D4+G4+B4', Bm = 'D4+F#4+B4', C = 'E4+G4+C5', D = 'D4+F#4+A4', Em = 'E4+G4+B4', Am = 'E4+A4+C5', B7 = 'D#4+F#4+A4+B4', D7 = 'D4+F#4+A4+C5';
  const h = 'D5:2 G5:2 r:1 G5:1 F#5:2 G5:2 A5:2 B5:4 | A5:2 G5:2 F#5:2 D5:4 B4:2 D5:2 r:2 |';
  const hook = `${h} E5:2 G5:2 r:1 G5:1 F#5:2 G5:2 A5:2 G5:2 E5:2 | F#5:4 D5:2 A4:2 D5:2 E5:2 F#5:2 A5:2 | ${h}`;
  const aLead = `${hook} E5:2 G5:2 C6:4 A5:2 F#5:2 D5:2 F#5:2 | G5:4 D5:2 B4:2 G4:4 r:4 |`;
  const a2Lead = `${hook} E5:2 G5:2 C6:4 B5:2 A5:2 F#5:2 A5:2 | G5:8 r:4 B4:2 D5:2 |`;
  const aHarm = `${G}:16 | ${Bm}:16 | ${C}:16 | ${D}:16 | ${G}:16 | ${Bm}:16 | ${C}:8 ${D}:8 | ${G}:16 |`;
  // Second time round, pulse 2 sings a slow counterline (guide tones) under the hook.
  const counter = 'G4:8 B4:8 | A4:8 F#4:8 | E4:8 G4:8 | F#4:8 A4:8 | B4:8 D5:8 | D5:8 B4:8 | C5:8 A4:8 | B4:16 |';
  const aBassHead = `${oct('G2', 'G3')} ${oct('B1', 'B2')} ${oct('C2', 'C3')} ${oct('D2', 'D3')} ${oct('G2', 'G3')} ${oct('B1', 'B2')} {C2:2 C3:2}*2 {D2:2 D3:2}*2 |`;
  const main = 'K-h-S-hhK-h-S-h-';
  const aDrums = `C-h-S-hhK-h-S-h- ${main} ${main} K-h-S-hhK-h-S-SS ${main} ${main} ${main} K-h-S-hhS-SST-t-`;
  const aSec = (lead: string, harm: string, end: string): Section => ({ bars: 8, lead, harm, bass: `${aBassHead} {G2:2 G3:2}*2 ${end} |`, drums: aDrums });
  return {
    bpm: 144,
    level: 0.85,
    lead: { duty: 0.25, gain: 0.095, vib: 12 },
    harm: { duty: 0.25, gain: 0.04 },
    intro: [
      {
        bars: 2,
        lead: 'r:16 | r:8 G4:2 A4:2 B4:2 C5:2 |',
        harm: `${G}:16 | ${G}:16 |`,
        bass: '{G2:2 G3:2}*4 | {G2:2 G3:2}*2 {D2:2 D3:2}*2 |',
        drums: 'K-h-K-h-K-h-K-h- K-h-S-h-S-SsT-t-',
      },
    ],
    loop: [
      aSec(aLead, aHarm, 'G2:2 F#2:2 E2:2 D2:2'),
      { ...aSec(a2Lead, counter, 'G2:2 A2:2 B2:2 D#2:2'), harmDuty: 0.5, harmGain: 1.5 },
      {
        // The minor turn: Em-C-Am-B7, long notes reaching up to the high C.
        bars: 8,
        lead: 'E5:6 F#5:2 G5:4 B5:4 | C6:6 B5:2 A5:4 G5:4 | A5:6 G5:2 E5:4 C5:4 | D#5:6 E5:2 F#5:4 A5:4 | G5:6 F#5:2 E5:4 B4:4 | C5:4 E5:4 G5:4 C6:4 | B5:4 A5:4 F#5:2 G5:2 A5:2 C6:2 | B5:2 A5:2 G5:2 F#5:2 E5:2 D5:2 C5:2 A4:2 |',
        harm: `${Em}:16 | ${C}:16 | ${Am}:16 | ${B7}:16 | ${Em}:16 | ${C}:16 | ${Am}:8 ${D7}:8 | ${D7}:16 |`,
        bass: `${oct('E2', 'E3')} ${oct('C2', 'C3')} ${oct('A1', 'A2')} ${oct('B1', 'B2')} ${oct('E2', 'E3')} ${oct('C2', 'C3')} {A1:2 A2:2}*2 {D2:2 D3:2}*2 | D2:2 D3:2 D2:2 D3:2 C3:2 B2:2 A2:2 F#2:2 |`,
        drums: `C-hKS-h-K-hKS-h- ${x(6, 'K-hKS-h-K-hKS-h-')} K-hKS-h-SSSST-t-`,
      },
      { ...aSec(aLead, counter, 'G2:2 F#2:2 E2:2 D2:2'), harmDuty: 0.5, harmGain: 1.5 },
    ],
  };
})();

/** ACT 2, "High Roller": D minor, a 16th-note bass riff that never lets up, a syncopated hook. */
const ACT2: Song = (() => {
  const Dm = 'D4+F4+A4', Bb = 'D4+F4+Bb4', C = 'E4+G4+C5', A = 'C#4+E4+A4', F = 'C4+F4+A4', Cc = 'C4+E4+G4', Gm = 'D4+G4+Bb4', A7 = 'C#4+E4+G4+A4';
  // The riff: root, octave, a double-tap, the flat 7th flick, then down through the fifth.
  const rD = 'D2:2 D3:2 D2:1 D2:1 C3:2 D2:2 D3:2 A2:2 C3:2 |';
  const rBb = 'Bb1:2 Bb2:2 Bb1:1 Bb1:1 A2:2 Bb1:2 Bb2:2 F2:2 A2:2 |';
  const rC = 'C2:2 C3:2 C2:1 C2:1 Bb2:2 C2:2 C3:2 G2:2 Bb2:2 |';
  const rA = 'A1:2 A2:2 A1:1 A1:1 G2:2 A1:2 A2:2 E2:2 G2:2 |';
  const drive = (lo: string, hi: string) => `${lo}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${lo}:2 ${lo}:2 ${hi}:2 ${lo}:2 |`;
  const hook = 'A4:2 D5:2 F5:2 A5:3 G5:1 F5:2 E5:2 D5:2 | E5:3 F5:3 E5:2 C5:4 A4:4 | Bb4:2 D5:2 F5:2 Bb5:3 A5:1 G5:2 F5:2 D5:2 | E5:3 G5:3 E5:2 C5:6 r:2 | A4:2 D5:2 F5:2 A5:3 G5:1 F5:2 E5:2 D5:2 | E5:3 F5:3 G5:2 A5:4 C6:4 |';
  const main = 'K-hKS-h-K-hKS-h-';
  const aDrums = `C-hKS-h-K-hKS-h- ${main} ${main} K-hKS-h-KKh-S-hS ${main} ${main} ${main} K-hKS-h-S-SST-tt`;
  const head = `${rD} ${rD} ${rBb} ${rC} ${rD} ${rD}`;
  const hHead = `${Dm}:16 | ${Dm}:16 | ${Bb}:16 | ${C}:16 | ${Dm}:16 | ${Dm}:16 |`;
  return {
    bpm: 152,
    level: 0.9,
    lead: { duty: 0.25, gain: 0.095, vib: 14 },
    harm: { duty: 0.25, gain: 0.04 },
    intro: [{ bars: 2, lead: 'r:16 | r:12 E4:2 G4:2 |', bass: `${rD} ${rD}`, drums: 'K-h-h-h-K-h-h-h- K-h-h-h-K-h-SsSS' }],
    loop: [
      { bars: 8, lead: `${hook} D6:6 C6:2 Bb5:2 A5:2 G5:2 F5:2 | E5:6 C#5:2 A4:4 r:4 |`, harm: `${hHead} ${Bb}:16 | ${A}:16 |`, bass: `${head} ${rBb} ${rA}`, drums: aDrums },
      {
        // Again, with a slapback double, landing on the high D.
        bars: 8,
        lead: `${hook} D6:4 C6:4 Bb5:4 C6:4 | D6:8 r:8 |`,
        harm: `${hHead} ${Bb}:8 ${C}:8 | ${Dm}:16 |`,
        bass: `${head} Bb1:2 Bb2:2 Bb1:1 Bb1:1 A2:2 C2:2 C3:2 G2:2 Bb2:2 | ${rD}`,
        drums: aDrums,
        echo: { steps: 2, gain: 0.3, duty: 0.5 },
      },
      {
        // The relative major, broad and heroic, on a rounder pulse.
        bars: 8,
        lead: 'C5:4 F5:4 A5:8 | G5:4 E5:4 C5:8 | D5:4 G5:4 Bb5:6 A5:2 | A5:8 F5:4 D5:4 | D5:4 F5:4 Bb5:8 | A5:4 F5:4 C5:8 | D5:2 G5:2 Bb5:2 D6:2 C6:2 Bb5:2 A5:2 G5:2 | A5:4 E5:2 C#5:2 A4:2 C#5:2 E5:2 G5:2 |',
        leadDuty: 0.5,
        harm: `${F}:16 | ${Cc}:16 | ${Gm}:16 | ${Dm}:16 | ${Bb}:16 | ${F}:16 | ${Gm}:16 | ${A7}:16 |`,
        bass: `${drive('F2', 'F3')} ${drive('C2', 'C3')} ${drive('G1', 'G2')} ${drive('D2', 'D3')} ${drive('Bb1', 'Bb2')} ${drive('F2', 'F3')} ${drive('G1', 'G2')} A1:2 A1:2 A2:2 A1:2 C#2:2 E2:2 G2:2 C#3:2 |`,
        drums: `C-o-S-o-K-o-S-oK ${x(6, 'K-o-S-o-K-o-S-oK')} K-o-S-o-S-SsSsSS`,
      },
      {
        // Break: the riff alone, pulse 2 quotes the hook low, the drums build back in.
        bars: 4,
        lead: 'r:16 | r:16 | r:16 | r:12 E4:2 G4:2 |',
        harm: `A3:2 D4:2 F4:2 A4:3 G4:1 F4:2 E4:2 D4:2 | r:16 | Bb3:2 D4:2 F4:2 Bb4:3 A4:1 G4:2 F4:2 D4:2 | ${A}:16 |`,
        harmDuty: 0.5,
        harmGain: 1.8,
        bass: `${rD} ${rD} ${rBb} ${rA}`,
        drums: 'K-h-K-h-K-h-K-h- K-h-K-h-K-h-K-h- K-h-K-h-KhKhKhKh S-S-S-S-SsSsSSSS',
      },
    ],
  };
})();

/** ACT 3, "Last Call": E minor, galloping bass, a creeping half-step hook, a music-box ostinato. */
const ACT3: Song = (() => {
  const g = (r: string) => `{${r}:2 ${r}:1 ${r}:1}*4 |`;
  const ost = (a: string, b: string, c: string) => `{${a}:2 ${c}:2 ${b}:2 ${c}:2}*2 |`;
  const oEm = ost('E4', 'G4', 'B4'), oC = ost('E4', 'G4', 'C5'), oB = ost('D#4', 'F#4', 'B4'), oF = ost('F4', 'A4', 'C5'), oB7 = ost('D#4', 'A4', 'B4'), oAm = ost('E4', 'A4', 'C5');
  const aLead = 'E5:4 F5:2 E5:2 D#5:4 E5:4 | G5:4 F#5:2 E5:2 B4:8 | C5:4 D5:2 E5:2 G5:4 F#5:2 E5:2 | D#5:8 B4:4 F#5:4 | E5:4 F5:2 E5:2 D#5:4 E5:4 | B5:4 A5:2 G5:2 E5:8 | F5:4 A5:4 C6:6 B5:2 | B5:4 A5:2 F#5:2 D#5:4 B4:4 |';
  const aBass = `${g('E2')} ${g('E2')} ${g('C2')} ${g('B1')} ${g('E2')} ${g('E2')} ${g('F2')} ${g('B1')}`;
  const main = 'K-h-S-h-K-h-S-hh';
  const aDrums = `C-h-S-h-K-h-S-hh ${main} ${main} K-h-S-h-KKh-S-SS ${main} ${main} ${main} K-h-S-h-S-SST-tt`;
  return {
    bpm: 156,
    level: 0.88,
    lead: { duty: 0.25, gain: 0.09, vib: 18 },
    harm: { duty: 0.25, gain: 0.035 },
    intro: [
      {
        bars: 4,
        lead: 'r:16 | r:16 | r:16 | r:12 B4:2 D#5:2 |',
        harm: `r:16 | r:16 | ${oEm} ${oB}`,
        bass: `${g('E2')} ${g('E2')} ${g('E2')} ${g('B1')}`,
        drums: 'K---h---K---h--- K---h---K---h-h- K-h-S-h-K-h-S-h- K-h-S-h-S-SST-tt',
      },
    ],
    loop: [
      { bars: 8, lead: aLead, harm: `${oEm} ${oEm} ${oC} ${oB} ${oEm} ${oEm} ${oF} ${oB7}`, bass: aBass, drums: aDrums },
      {
        bars: 8,
        lead: 'A4:6 C5:2 E5:8 | D5:4 C5:4 B4:4 A4:4 | G4:6 B4:2 E5:8 | F#5:4 G5:4 F#5:4 D#5:4 | A5:6 G5:2 E5:4 C5:4 | E5:6 G5:2 C6:8 | B5:8 A5:4 F#5:4 | D#5:8 r:4 B4:2 D#5:2 |',
        harm: `${oAm} ${oAm} ${oEm} ${oEm} ${oAm} ${oC} ${oB} ${oB}`,
        bass: `${oct('A1', 'A2')} ${oct('A1', 'A2')} ${oct('E2', 'E3')} ${oct('E2', 'E3')} ${oct('A1', 'A2')} ${oct('C2', 'C3')} ${oct('B1', 'B2')} B1:2 B2:2 B1:2 B2:2 B1:2 A2:2 F#2:2 D#2:2 |`,
        drums: `C-hhS-hhK-hhS-hh ${x(6, 'K-hhS-hhK-hhS-hh')} K-hhS-hhS-SSTTtt`,
      },
      {
        // The hook again over a held, darker counterline.
        bars: 8,
        lead: aLead,
        harm: 'G4:16 | G4:8 F#4:8 | E4:16 | D#4:16 | G4:16 | G4:8 B4:8 | A4:16 | F#4:8 A4:8 |',
        harmDuty: 0.5,
        harmGain: 1.6,
        bass: aBass,
        drums: aDrums,
      },
      {
        // Half-time: slow, sinister line, the ostinato keeps ticking.
        bars: 8,
        lead: 'B4:12 C5:4 | E5:8 G5:4 E5:4 | C5:12 B4:4 | D#5:16 | G5:12 F#5:4 | E5:12 G5:4 | A5:8 C6:8 | B5:4 A5:4 F#5:4 D#5:4 |',
        harm: `${oEm} ${oC} ${oAm} ${oB} ${oEm} ${oC} ${oF} ${oB7}`,
        bass: `E2:16 | C2:16 | A1:16 | B1:16 | E2:16 | C2:16 | F2:8 F2:8 | ${oct('B1', 'B2')}`,
        drums: `C-------S------- ${x(5, 'K---h---S---h---')} K-h-K-h-S-h-K-h- S-S-SsSsSSSST-t-`,
      },
    ],
  };
})();

/** THE HOUSE (Act 1 boss): C minor swagger, a bluesy riff doubled two octaves down, brass stabs. */
const HOUSE: Song = (() => {
  const Cm = 'C4+Eb4+G4', Ab = 'C4+Eb4+Ab4', G = 'B3+D4+G4', Db = 'Db4+F4+Ab4', G7 = 'B3+D4+F4', Bb7 = 'D4+F4+Ab4', Gm = 'D4+G4+Bb4';
  const r1 = 'C5:2 r:1 C5:1 Eb5:2 C5:2 G5:2 F#5:1 F5:1 Eb5:2 F5:2 |';
  const b1 = 'C3:2 r:1 C3:1 Eb3:2 C3:2 G3:2 F#3:1 F3:1 Eb3:2 F3:2 |';
  const b2 = 'C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 G2:2 Bb2:2 |';
  const b3 = 'Ab2:2 r:1 Ab2:1 C3:2 Ab2:2 Eb3:2 D3:1 Db3:1 C3:2 Eb3:2 |';
  const b4 = '{G2:2 G3:2}*3 F3:2 D3:2 |';
  const tail = (c: string) => `${c}:12 ${c}:2'! ${c}:2'! |`;
  const main = 'K-hKS-h-K-hKS-hh';
  const a: Section = {
    bars: 8,
    lead: `${r1} G5:6 Eb5:2 C5:4 r:4 | Ab4:2 r:1 Ab4:1 C5:2 Ab4:2 Eb5:2 D5:1 Db5:1 C5:2 Eb5:2 | D5:6 B4:2 G4:6 r:2 | ${r1} G5:6 Bb5:2 C6:4 r:4 | Ab5:4 F5:2 Db5:2 F5:4 Ab5:4 | G5:4 F5:2 D5:2 B4:4 G4:2 B4:2 |`,
    harm: `${Cm}:16 | ${tail(Cm)} ${Ab}:16 | ${tail(G)} ${Cm}:16 | ${tail(Cm)} ${Db}:16 | ${G7}:16 |`,
    bass: `${b1} ${b2} ${b3} ${b4} ${b1} ${b2} {Db2:2 Db3:2}*4 | {G2:2 G3:2}*2 G2:2 F2:2 D2:2 B1:2 |`,
    drums: `C-hKS-h-K-hKS-hh ${main} ${main} K-hKS-h-K-hKS-SS ${main} ${main} ${main} K-hKS-h-S-SsT-tt`,
  };
  return {
    bpm: 148,
    level: 0.92,
    lead: { duty: 0.25, gain: 0.095, vib: 12 },
    harm: { duty: 0.5, gain: 0.04 },
    intro: [
      {
        bars: 2,
        lead: 'C5:2 r:6 C5:2 r:2 C5:2 r:2 | G4:2 r:6 B4:2 r:2 D5:2 F5:2 |',
        harm: `${Cm}:2 r:6 ${Cm}:2 r:2 ${Cm}:2 r:2 | ${G7}:2 r:6 ${G7}:2 r:2 ${G7}:4 |`,
        bass: 'C2:2 r:6 C2:2 r:2 C2:2 r:2 | G1:2 r:6 G1:2 r:2 G2:2 B1:2 |',
        drums: 'C-------C---C--- C-------K---SSSS',
      },
    ],
    loop: [
      a,
      {
        // "The house always wins": a broad tune on a rounder pulse, Ab-Bb7-Gm-Cm.
        bars: 8,
        lead: 'C5:6 Eb5:2 Ab5:8 | Bb5:6 Ab5:2 F5:8 | G5:6 F5:2 D5:8 | Eb5:4 D5:4 C5:8 | C5:4 Eb5:4 Ab5:6 G5:2 | F5:4 Bb5:4 Ab5:6 F5:2 | G5:6 D5:2 B4:4 D5:4 | F5:4 Eb5:4 D5:2 B4:2 G4:2 B4:2 |',
        leadDuty: 0.5,
        harm: `${Ab}:16 | ${Bb7}:16 | ${Gm}:16 | ${Cm}:16 | ${Ab}:16 | ${Bb7}:16 | ${G}:16 | ${G7}:16 |`,
        harmDuty: 0.25,
        bass: `${oct('Ab1', 'Ab2')} ${oct('Bb1', 'Bb2')} ${oct('G1', 'G2')} ${oct('C2', 'C3')} ${oct('Ab1', 'Ab2')} ${oct('Bb1', 'Bb2')} ${oct('G1', 'G2')} G1:2 G2:2 G1:2 G2:2 F2:2 Eb2:2 D2:2 B1:2 |`,
        drums: `C-o-S-o-K-o-S-o- ${x(6, 'K-o-S-o-K-o-S-o-')} K-o-S-o-S-SsSsSS`,
      },
      { ...a, echo: { steps: 3, gain: 0.3, duty: 0.5 } },
      {
        // Tom break: pulse 2 takes the riff low, the lead waits for the pickup.
        bars: 4,
        lead: 'r:16 | r:16 | r:16 | r:8 G4:2 B4:2 D5:2 F5:2 |',
        harm: `C4:2 r:1 C4:1 Eb4:2 C4:2 G4:2 F#4:1 F4:1 Eb4:2 F4:2 | r:16 | Ab3:2 r:1 Ab3:1 C4:2 Ab3:2 Eb4:2 D4:1 Db4:1 C4:2 Eb4:2 | ${G}:16 |`,
        harmGain: 1.8,
        bass: `${b1} ${b2} ${b3} ${b4}`,
        drums: 'K-T-K-T-K-t-K-t- K-T-K-T-K-t-K-t- K-T-K-T-KtKtKtKt S-S-S-S-SsSsSSSS',
      },
    ],
  };
})();

/**
 * THE MIRROR (Act 2 boss): B minor, and pulse 2 is a CANON: it copies the lead half a bar later, an octave down.
 * The lead bars are palindromes, written so each half-bar still fits the chord its copy lands on.
 */
const MIRROR: Song = (() => {
  const Bm = 'D4+F#4+B4', G = 'D4+G4+B4', Em = 'E4+G4+B4', Fs = 'C#4+F#4+A#4', Fs7 = 'C#4+E4+F#4+A#4', D = 'D4+F#4+A4', A = 'C#4+E4+A4';
  const pat = (lo: string, hi: string) => `${lo}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${lo}:2 ${hi}:2 ${lo}:2 ${hi}:2 |`;
  const aLead =
    'B4:2 D5:2 F#5:2 B5:4 F#5:2 D5:2 B4:2 | C#5:2 D5:2 F#5:2 A5:4 G5:2 D5:2 B4:2 | G4:2 B4:2 D5:2 G5:4 D5:2 B4:2 G4:2 | A4:2 B4:2 D5:2 F#5:4 E5:2 B4:2 G4:2 | ' +
    'E4:2 G4:2 B4:2 E5:4 B4:2 G4:2 E4:2 | F#4:2 G4:2 B4:2 D5:4 C#5:2 A#4:2 F#4:2 | F#4:2 A#4:2 C#5:2 F#5:4 C#5:2 A#4:2 F#4:2 | E5:2 C#5:2 A#4:2 F#4:4 B4:2 D5:2 F#5:2 |';
  const aBass = `${pat('B1', 'B2')} ${pat('B1', 'B2')} ${pat('G1', 'G2')} ${pat('G1', 'G2')} ${pat('E2', 'E3')} ${pat('E2', 'E3')} ${pat('F#1', 'F#2')} ${pat('F#1', 'F#2')}`;
  const main = 'K-hoS-h-K-hoS-hh';
  const aDrums = `C-hoS-h-K-hoS-hh ${x(6, main)} K-hoS-h-S-SsT-tt`;
  return {
    bpm: 160,
    level: 0.9,
    lead: { duty: 0.25, gain: 0.09, vib: 14 },
    harm: { duty: 0.25, gain: 0.035 },
    echo: { steps: 8, gain: 0.55, transpose: -12, duty: 0.5 },
    intro: [
      {
        bars: 2,
        lead: 'B4:2 D5:2 F#5:2 B5:4 F#5:2 D5:2 B4:2 | r:16 |',
        bass: 'B1:16 | B1:8 F#2:8 |',
        drums: 'h-h-h-h-h-h-h-h- h-h-h-h-S-SsS-SS',
      },
    ],
    loop: [
      { bars: 8, lead: aLead, bass: aBass, drums: aDrums },
      {
        // The mirror cracks: no canon, a lyrical line in D major on a rounder pulse.
        bars: 8,
        lead: 'F#5:6 E5:2 D5:4 A4:4 | C#5:6 D5:2 E5:8 | D5:6 C#5:2 B4:4 F#4:4 | A#4:6 B4:2 C#5:8 | D5:6 E5:2 G5:4 B5:4 | A5:6 G5:2 F#5:8 | G5:4 F#5:4 E5:4 D5:4 | C#5:6 A#4:2 F#4:4 r:4 |',
        leadDuty: 0.5,
        echo: null,
        harm: `${D}:16 | ${A}:16 | ${Bm}:16 | ${Fs}:16 | ${G}:16 | ${D}:16 | ${Em}:16 | ${Fs7}:16 |`,
        bass: `${pat('D2', 'D3')} ${pat('A1', 'A2')} ${pat('B1', 'B2')} ${pat('F#1', 'F#2')} ${pat('G1', 'G2')} ${pat('D2', 'D3')} ${pat('E2', 'E3')} F#1:2 F#2:2 F#1:2 F#2:2 F#1:2 A#1:2 C#2:2 E2:2 |`,
        drums: `C-h-S-h-K-h-S-h- ${x(6, 'K-h-S-h-K-h-S-h-')} K-h-S-h-S-SsSsSS`,
      },
      {
        // The reflection: the same canon with the two pulse widths swapped, arpeggios shimmering on top.
        bars: 8,
        lead: aLead,
        leadDuty: 0.5,
        echo: { steps: 8, gain: 0.55, transpose: -12, duty: 0.25 },
        harm: `${Bm}:16 | ${Bm}:16 | ${G}:16 | ${G}:16 | ${Em}:16 | ${Em}:16 | ${Fs}:16 | ${Fs7}:16 |`,
        bass: aBass,
        drums: aDrums,
      },
    ],
  };
})();

/**
 * THE DEALER (final boss), "Final Hand": A harmonic minor tango. Habanera bass, chopped off-beat chords, a hook that
 * riffles up like a shuffled deck; the last pass jumps up a half step before the turn home.
 */
const DEALER: Song = (() => {
  const hab = (lo: string, five: string, hi: string) => `{${lo}:3 ${lo}:1 ${five}:2 ${hi}:2}*2 |`;
  const hAm = hab('A1', 'E2', 'A2'), hDm = hab('D2', 'A2', 'D3'), hF = hab('F2', 'C3', 'F3'), hE = hab('E2', 'B2', 'E3');
  const Am = 'A3+C4+E4', Dm = 'A3+D4+F4', F = 'A3+C4+F4', E7 = 'G#3+B3+D4+E4';
  const C = 'C4+E4+G4', G = 'B3+D4+G4', Am2 = 'C4+E4+A4', E = 'B3+E4+G#4', F2 = 'C4+F4+A4', Dm2 = 'D4+F4+A4', E7b = 'D4+E4+G#4+B4';
  const a: Section = {
    bars: 8,
    lead: 'A4:1 B4:1 C5:1 D5:1 E5:4! r:2 E5:2 F5:2 E5:2 | C5:3 B4:1 A4:2 G#4:2 A4:6 r:2 | D5:1 E5:1 F5:1 G5:1 A5:4! r:2 A5:2 Bb5:2 A5:2 | F5:3 E5:1 D5:2 C#5:2 D5:6 r:2 | C5:2 F5:2 A5:4 G5:2 F5:2 E5:2 F5:2 | G#5:6 F5:2 E5:2 D5:2 B4:2 G#4:2 | A4:2 C5:2 E5:2 A5:6 G#5:2 A5:2 | B5:4 G#5:2 E5:2 D5:2 B4:2 G#4:2 E4:2 |',
    harm: [Am, Am, Dm, Dm, F, E7, Am, E7].map(stab).join(' '),
    bass: `${hAm} ${hAm} ${hDm} ${hDm} ${hF} ${hE} ${hAm} ${hE}`,
    drums: `C--KS-h-K--KS-hS ${x(6, 'K--KS-h-K--KS-hS')} K--KS-h-S-SST-T-`,
  };
  return {
    bpm: 164,
    level: 0.93,
    lead: { duty: 0.25, gain: 0.09, vib: 16 },
    harm: { duty: 0.5, gain: 0.04 },
    intro: [
      {
        // The shuffle: rim clicks riffling, then the habanera deals itself in.
        bars: 4,
        lead: 'r:16 | r:16 | r:16 | r:12 E4:2 G#4:2 |',
        harm: `r:16 | r:16 | ${stab(Am)} ${stab(E7)}`,
        bass: `r:16 | ${hAm} ${hAm} ${hE}`,
        drums: 'x-x-xxx-x-x-xxx- x-x-xxx-x-x-xxx- K-x-xKx-K-x-xKx- K-x-xKx-S-SsSsSS',
      },
    ],
    loop: [
      a,
      {
        // The royal flush: C major, wide and grand, on a rounder pulse.
        bars: 8,
        lead: 'E5:6 G5:2 C6:8 | B5:6 A5:2 G5:4 D5:4 | C5:6 E5:2 A5:8 | G#5:6 A5:2 B5:8 | C6:6 A5:2 F5:4 A5:4 | G5:6 E5:2 C5:4 E5:4 | F5:4 E5:2 D5:2 A5:4 F5:4 | E5:4 G#5:4 B5:2 D6:2 B5:2 G#5:2 |',
        leadDuty: 0.5,
        harm: `${C}:16 | ${G}:16 | ${Am2}:16 | ${E}:16 | ${F2}:16 | ${C}:16 | ${Dm2}:16 | ${E7b}:16 |`,
        harmDuty: 0.25,
        bass: `${oct('C2', 'C3')} ${oct('G1', 'G2')} ${oct('A1', 'A2')} ${oct('E2', 'E3')} ${oct('F2', 'F3')} ${oct('C2', 'C3')} ${oct('D2', 'D3')} E2:2 E3:2 E2:2 E3:2 E2:2 D3:2 B2:2 G#2:2 |`,
        drums: `C-o-S-o-K-o-S-o- ${x(6, 'K-o-S-o-K-o-S-oK')} K-o-S-o-S-SsSsSS`,
      },
      { ...a, echo: { steps: 3, gain: 0.3, duty: 0.5 } },
      // FINAL HAND: the whole verse up a half step (Bb minor), drums at full tilt.
      { ...a, transpose: 1, echo: { steps: 3, gain: 0.3, duty: 0.5 }, drums: `C-hKS-hKK-hKS-hS ${x(6, 'K-hKS-hKK-hKS-hS')} K-hKS-hKS-SsSsSS` },
      {
        // The turn home: F7 slips to E7 (the dealer's sleight of hand), back to A minor.
        bars: 2,
        lead: 'F5:8 E5:8 | G#4:2 B4:2 D5:2 E5:2 D5:2 B4:2 G#4:2 B4:2 |',
        harm: 'F4+A4+C5+Eb5:8 E4+G#4+B4+D5:8 | E4+G#4+B4+D5:16 |',
        bass: 'F2:8 E2:8 | E2:2 E3:2 E2:2 E3:2 E2:2 D3:2 B2:2 G#2:2 |',
        drums: 'K---S---K---S--- S-S-SsSsSSSST-t-',
      },
    ],
  };
})();

/** The soundtrack. */
export const SONGS: Record<SongId, Song> = { menu: MENU, lounge: LOUNGE, act1: ACT1, act2: ACT2, act3: ACT3, house: HOUSE, mirror: MIRROR, dealer: DEALER };

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface ToneOpts {
  duty?: number;
  /** Vibrato depth in cents (long notes only, after a short delay). */
  vib?: number;
  /** Slide up into the note from a semitone below. */
  bend?: boolean;
  /** Seconds per arpeggio note (chords). */
  arp?: number;
}

/** The four voices, built once per context. */
export class ChipVoices {
  private waves = new Map<number, PeriodicWave>();
  private noise: AudioBuffer;
  /** Everything goes through a gentle low-pass (the NES's own output filter takes the fizz off the pulses). */
  private dest: AudioNode;

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
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 7000;
    lp.Q.value = 0.5;
    lp.connect(out);
    this.dest = lp;
  }

  private pulse(duty: number): PeriodicWave {
    let w = this.waves.get(duty);
    if (!w) {
      const n = 48;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      w = this.ctx.createPeriodicWave(real, imag);
      this.waves.set(duty, w);
    }
    return w;
  }

  tone(kind: 'pulse' | 'triangle', notes: number[], t: number, dur: number, gain: number, o: ToneOpts = {}): void {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    if (kind === 'pulse') osc.setPeriodicWave(this.pulse(o.duty ?? 0.5));
    else osc.type = 'triangle';
    osc.frequency.setValueAtTime(midiHz(notes[0]), t);
    if (notes.length > 1) {
      // Arpeggio: one oscillator hopping through the chord.
      const step = o.arp ?? 0.04;
      for (let k = 1, at = t + step; at < t + dur; k++, at += step) osc.frequency.setValueAtTime(midiHz(notes[k % notes.length]), at);
    } else if ((o.vib && dur > 0.28) || o.bend) {
      const n = Math.max(2, Math.ceil(dur * 120));
      const c = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const s = (k / (n - 1)) * dur;
        let v = o.bend ? -100 * Math.max(0, 1 - s / 0.07) : 0;
        if (o.vib && dur > 0.28 && s > 0.16) v += o.vib * Math.min(1, (s - 0.16) / 0.15) * Math.sin(2 * Math.PI * 5.5 * (s - 0.16));
        c[k] = v;
      }
      osc.detune.setValueCurveAtTime(c, t, dur);
    }
    const g = ctx.createGain();
    const rel = t + Math.max(0.025, dur * (kind === 'pulse' ? 0.92 : 0.95));
    g.gain.setValueAtTime(0, t);
    if (kind === 'pulse') {
      // A chip envelope: instant attack, a quick decay to a sustain, a slow sag on long notes, a quick release.
      g.gain.linearRampToValueAtTime(gain, t + 0.004);
      g.gain.setTargetAtTime(gain * 0.7, t + 0.01, 0.05);
      if (rel > t + 0.3) g.gain.setTargetAtTime(gain * 0.5, t + 0.25, 0.6);
    } else g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.setTargetAtTime(0, rel, 0.012);
    osc.connect(g).connect(this.dest);
    osc.start(t);
    osc.stop(rel + 0.1);
  }

  private sweep(t: number, from: number, to: number, len: number, gain: number): void {
    const o = this.ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len * 0.75);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    o.connect(g).connect(this.dest);
    o.start(t);
    o.stop(t + len + 0.03);
  }

  private hiss(t: number, type: BiquadFilterType, freq: number, q: number, len: number, gain: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(this.dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + len + 0.02);
  }

  drum(kind: string, t: number, gain: number): void {
    switch (kind) {
      case 'C': // crash (with a kick under it)
        this.hiss(t, 'bandpass', 5500, 0.6, 0.7, gain * 0.55);
        this.sweep(t, 180, 45, 0.16, gain * 1.6);
        return;
      case 'K': // kick: a triangle diving in pitch (the NES trick)
        this.sweep(t, 180, 45, 0.16, gain * 1.6);
        return;
      case 'T': // high tom
        this.sweep(t, 260, 120, 0.14, gain * 1.3);
        return;
      case 't': // low tom
        this.sweep(t, 170, 75, 0.17, gain * 1.4);
        return;
      case 'S':
        this.hiss(t, 'bandpass', 1800, 0.8, 0.12, gain * 1.1);
        return;
      case 's': // ghost snare
        this.hiss(t, 'bandpass', 1800, 0.8, 0.06, gain * 0.4);
        return;
      case 'o': // open hat
        this.hiss(t, 'highpass', 6500, 0.7, 0.16, gain * 0.35);
        return;
      case 'x': // rim click
        this.hiss(t, 'bandpass', 2800, 3, 0.03, gain * 0.9);
        return;
      default: // closed hat
        this.hiss(t, 'highpass', 7000, 0.7, 0.035, gain * 0.45);
    }
  }
}

/** The songs' level into the music bus (the bus itself sits at -14 dB, set for the old ambient pad). */
export const MUSIC_GAIN = 2;

/** Schedules the i-th 16th step since the song started (the intro once, then the loop forever) at time t. */
export function playStep(v: ChipVoices, score: Score, i: number, t: number): void {
  const pos = i < score.intro ? i : score.intro + ((i - score.intro) % score.loop);
  const st = score.steps[pos];
  const song = score.song;
  const sec = st.sec;
  const sd = score.stepDur;
  const lvl = song.level ?? 1;
  // Swing pushes the off-beat 8ths late; a note's end follows the grid it ends on.
  const sw = (p: number) => (p % 4 === 2 ? (song.swing ?? 0) * sd : 0);
  const span = (e: Ev): [number, number] => {
    const a = t + sw(pos);
    const b = t + e.len * sd + sw(pos + e.len);
    return [a, e.stac ? (b - a) * 0.5 : b - a];
  };
  if (st.lead) {
    const e = st.lead;
    const [a, d] = span(e);
    const duty = sec.leadDuty ?? song.lead.duty;
    const g = song.lead.gain * lvl * (e.acc ? 1.25 : 1);
    const o = { duty, vib: song.lead.vib, bend: e.bend };
    v.tone('pulse', e.notes, a, d, g, o);
    const echo = sec.echo === undefined ? song.echo : sec.echo;
    if (echo) v.tone('pulse', e.notes.map((n) => n + (echo.transpose ?? 0)), a + echo.steps * sd, d, g * echo.gain, { ...o, duty: echo.duty ?? duty });
  }
  if (st.harm) {
    const e = st.harm;
    const [a, d] = span(e);
    const g = song.harm.gain * lvl * (sec.harmGain ?? 1) * (e.acc ? 1.4 : 1);
    v.tone('pulse', e.notes, a, d, g, { duty: sec.harmDuty ?? song.harm.duty, vib: 10, bend: e.bend, arp: song.arp });
  }
  if (st.bass) {
    const [a, d] = span(st.bass);
    v.tone('triangle', st.bass.notes, a, d, (song.bassGain ?? 0.2) * lvl);
  }
  if (st.drum) v.drum(st.drum, t + sw(pos), (song.drumGain ?? 0.11) * lvl);
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
    while (this.nextT < ahead) {
      playStep(this.voices, this.score, this.step, this.nextT);
      this.step++;
      this.nextT += this.score.stepDur;
    }
  }
}
