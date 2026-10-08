# Music notes (soundtrack rewrite, 2026-10-08)

Every song is now a hand-written score in `src/audio/music.ts` (a small tracker format: lead, pulse 2, triangle
bass, drums, per section). Nothing is random any more. Each song plays its intro once, then loops; the last bar of
each loop is written to lead back into the first.

Bosses have their own themes now: `musicMood()` returns `house`, `mirror` or `dealer` from the fight's enemy
(endless mode cycles the same three).

| Song | Plays | Key | Tempo | Form (bars) | Loop |
|---|---|---|---|---|---|
| menu, "Marquee Lights" | title, menus | F major | 126 | intro 2, then A 8, A2 8, B (bridge) 8, A3 8 | 61 s |
| lounge, "Comp Room" | map, drafts, shop, bonus | D dorian (swung) | 96 | A 8, B 8, A2 8, C (break) 8 | 80 s |
| act1, "First Spin" | Act 1 fights | G major | 144 | intro 2, then A 8, A2 8, B 8, A3 8 | 53 s |
| act2, "High Roller" | Act 2 fights | D minor | 152 | intro 2, then A 8, A2 8, B 8, break 4 | 44 s |
| act3, "Last Call" | Act 3 and endless fights | E minor | 156 | intro 4, then A 8, B 8, A2 8, C (half-time) 8 | 49 s |
| house | THE HOUSE | C minor | 148 | intro 2, then A 8, B 8, A2 8, tom break 4 | 45 s |
| mirror | THE MIRROR | B minor | 160 | intro 2, then A 8, B 8, A2 8 | 36 s |
| dealer, "Final Hand" | THE DEALER | A harmonic minor | 164 | intro 4, then A 8, B 8, A2 8, A up a half step 8, turn 2 | 50 s |

## Hooks and moods

- **menu:** a showtune bounce. The hook runs up the F chord with a little E-F turn and leaps to A, then repeats a
  step higher on Gm. Oom-pah stabs over a 2-beat bass. The bridge is a call and response over A7-D7-G7-C7, and the
  second A sneaks in a minor iv (Bbm) before it lands. Inviting, a bit cheeky.
- **lounge:** a muted lead (50% pulse, dotted-8th echo, slides into its long notes) over a swung walking bass and
  Charleston comping. The lead leaves whole bars empty, and section C is a vamp where it only drops in fills, so the
  loop breathes. Built to sit under card reading.
- **act1:** a bright, skipping hook (D-G, a 16th hiccup on G, up to B), octave-bounce bass, and arpeggios. The second
  pass adds a slow counterline. B turns to E minor and climbs to the high C. Playful.
- **act2:** a relentless 16th bass riff (root, octave, double tap, flat-7 flick), with a syncopated dotted hook on
  top. The second A adds a slapback double and lands on high D. B is a broad relative-major tune; the break leaves
  the riff alone while pulse 2 quotes the hook low and the drums build. More driving.
- **act3:** a galloping bass, a ticking music-box ostinato, and a creeping hook (E-F-E-D#-E) with the flat II (F)
  for dread. C drops to half-time with a slow, sinister line. Tense and dark.
- **house:** a bluesy C-minor riff (G-F#-F) played by the lead and the bass two octaves apart, with brass stabs
  answering. B is a swaggering "the house always wins" tune; then a tom break. Big and showy-menacing.
- **mirror:** pulse 2 is a canon: it copies the lead half a bar later, an octave down. The lead bars are
  palindromes written so the copy still fits the chords. B drops the canon (the mirror cracks) for a lyrical
  D-major line; A2 comes back with the two pulse widths swapped. Uncanny.
- **dealer:** a tango in A harmonic minor. A habanera bass and chopped off-beat chords sit under a hook that riffles
  up four 16ths like a shuffled deck into an accented stab. B is a grand C-major "royal flush". FINAL HAND jumps the
  whole verse up a half step, then an F7-to-E7 slip turns it back home. The climax.

## Synth changes

- Pulse leads: delayed vibrato on long notes, bend-in slides, a slow sag on held notes, and an echo/canon copy
  (delay, level, transpose, pulse width) per song or section.
- Pulse 2 arpeggiates chords NES-style (one oscillator hopping notes).
- Drums: kick, snare, ghost snare, closed and open hats, crash, two toms, rim click.
- A gentle 7 kHz low-pass on the music voices takes the fizz off the pulses.
- No 12.5% duty anywhere; leads use 25%, or 50% for the warmer sections. The highest lead note is D6, used briefly.

## Levels

Music still goes through the same bus (-14 dB, `MUSIC_GAIN` 2). Run
`npx vite --port 5173 &` then `NODE_PATH=<playwright> node tools/music/render.cjs <dir> 60 [song]` to render WAVs. It
prints the in-game peak/RMS and checks the loop seam.

Measured in-game levels (60 s+ renders; old soundtrack in brackets): peaks 0.07-0.12 (0.10-0.14), RMS 0.020-0.032
(0.019-0.032). The lounge is the quietest (peak 0.072, RMS 0.020). Every loop seam measures the same as an ordinary
section downbeat (no click).
