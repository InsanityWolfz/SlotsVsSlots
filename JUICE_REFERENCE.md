# Juice Reference — porting from Godot to TypeScript

This is a distilled spec of every tuned "feel" decision from the Godot build, so the
TypeScript/Canvas port can reproduce the reel mechanics, win-tier escalation, camera juice,
button feel, and procedural audio without re-deriving them from scratch or re-discovering the
bugs that shaped them. Source of truth: `DESIGN_DOC.md` (the original spec) plus everything
below, which reflects what was actually built, tuned, and bug-fixed on top of it.

Godot-specific APIs (Tween, `TRANS_BACK`, etc.) are named so the *shape* of the curve carries
over even though the implementation won't — e.g. `TRANS_BACK`/`EASE_OUT` is an overshoot-then-
settle easing, equivalent to GSAP's `back.out(n)` or a hand-rolled cubic-bezier with a small
negative overshoot.

## 1. Reel spin — 6 phases (per reel, independent)

Pitch (cell height) = **200px**. Symbol art size = **165px** (leaves a visible gap to the
200px cell so symbols don't touch the column dividers). 5 reels × 3 visible rows.

1. **Wind-up** (0.08s, skipped on the very first spin of a session): scale.y squashes to
   0.96 over half the duration (`TRANS_SINE`/`EASE_OUT`), then back to 1.0 over the other
   half (`TRANS_SINE`/`EASE_IN`). A tiny coiled-spring anticipation beat.
2. **Acceleration** (0.15–0.2s, tuned to 0.18s): scroll position eases from 0 to
   `max_scroll_speed` (2400px/s) using `TRANS_CUBIC`/`EASE_IN` (not linear).
3. **Constant blur spin** (variable — see pacing below): scrolls at max speed,
   `TRANS_LINEAR`/`EASE_IN_OUT`. Motion blur = vertically stretch filler symbols to
   `scale.y = 1.35` and drop their alpha to 0.7 for the duration of this phase only.
4. **Deceleration** (0.25–0.35s, tuned to 0.3s): eases out to the resting position via
   `TRANS_CUBIC`/`EASE_OUT`. Near-miss variant: 0.6–0.8s (tuned 0.7s) — same distance,
   much slower, which is what sells "struggling to land" rather than just "slower."
5. **Overshoot + settle bounce** (fires *after* the stop logic below, purely cosmetic):
   continue 12px past resting position over 0.03s (`TRANS_LINEAR`), then spring back over
   0.12–0.18s (tuned 0.15s) via `TRANS_BACK`/`EASE_OUT`. This one bounce reads as
   disproportionately "premium" — don't skip it.
6. **Landed punch**: a *per-symbol* scale-punch (1.0 → 1.04 → 1.0 over ~0.05s + ~0.06s,
   `TRANS_SINE`), applied to each of the 3 newly-landed symbols individually, scaled around
   each symbol's own center — **not** a scale on the whole reel/strip container.

**Bug already hit and fixed — don't reintroduce it:** an earlier version scaled the whole
scrolling strip container for the landed punch. By landing time that container's own
transform origin sits deep off-screen (from all the accumulated scroll offset), so even a
4% scale bump visibly wrenched every symbol sideways/downward — a real, visible "jump" on
every landing. Scale only the individual symbol sprites, around their own centers.

**Timing/stop-logic ordering — also a real bug, fixed:** the "reel has stopped" moment
(thunk sound, per-symbol punch, and whatever event advances your state machine / triggers
evaluation) must fire the **instant deceleration reaches the resting position** — i.e.
*before* phase 5's overshoot+settle plays. An earlier version fired all of that only after
the full overshoot+settle bounce finished, putting the stop sound and game-logic ~0.18–0.2s
*behind* the moment the reel visually stopped. Treat phase 5 as a trailing cosmetic tail that
nothing else waits on.

**Stagger & pacing:**
- Reels stop left-to-right, each starting its deceleration **150–220ms** (tuned 180ms)
  after the previous reel started its own.
- Total spin duration target (tap to last reel settled): **2.1s** for a normal spin
  (longer automatically during a near-miss, from phase 4's extended decel on the last
  reels). Minimum constant-spin time per reel: 0.35s, so a fast stagger never makes an
  early reel look like it barely spun.
- The exact filler-symbol count per reel is derived from accel distance + desired constant
  distance ÷ pitch, so the final reveal always lands exactly on a pitch boundary — don't
  hardcode a filler count, derive it the same way.

## 2. Near-miss anticipation

Trigger: **2+** Scatter/Jackpot ("bonus") symbols already landed anywhere across **reels
0–2** (of 5). When triggered:
- The **last 2 reels** use the extended near-miss deceleration (0.7s vs 0.3s).
- Each already-landed reel among the first 3 dims to **0.55×** brightness (`modulate`)
  the moment near-miss is detected *and that specific reel has already stopped* — not
  before it lands, since dimming a reel mid-blur doesn't read as "already decided."
  Dimming/undimming both tween over ~0.25s (`TRANS_SINE`).
- Play a distinct tension stinger the instant near-miss is detected (before any reel
  finishes) — see audio section.
- Once all reels have stopped, un-dim everything before evaluating.

This is genuinely the highest-impact "casino feel" trick and it's pure timing/logic, no
extra art needed — the RNG/outcome is already decided before any animation plays (see §7),
so you always know up front whether to arm this.

## 3. Win presentation — the layered sequence

Fires only when a spin pays out. Order matters; layers are staggered, not simultaneous.

1. **Non-winning symbols dim** to 60% brightness immediately (focuses attention on the win).
2. **Payline beam draw-on**: an animated line across the winning symbols, ~0.2s draw
   animation (interpolate point-by-point along the path, not just fade in a static line).
3. **Per-symbol glow + punch**, staggered **60ms** apart along the line: each symbol scales
   1.0 → 1.15 → 1.0 (~0.12s out / ~0.16s in, `TRANS_BACK`/`EASE_OUT` then `TRANS_SINE`/
   `EASE_IN`) with a glow-ring alpha pop (0 → 0.75 → 0 over ~0.1s/0.5s), paired with an
   ascending-pitch "ding" per symbol (pitch = `1.0 + index * 0.12`).
4. **Multi-line handling**: if `sequential_line_cycle` is on for this tier (big/jackpot,
   and only when there's more than 1 winning line), *clear* the payline overlay and repeat
   steps 2–3 for **each** winning line, **`line_cycle_count`** times total (2 for big, 3 for
   jackpot), with a 0.35s pause between lines within a cycle. **Must clear between cycles**
   — an earlier version re-drew without clearing, so "cycling" just piled up duplicate
   overlapping beams and never actually looked like cycling. Below big tier, or with only
   one winning line, just show it once, no cycling.
5. **Counter tick-up** (never snap-set the number): duration interpolated between
   `counter_duration_min`/`max` based on `payout / 2000` (clamped 0–1) — bigger wins get a
   longer count. If `counter_tick_accelerate` (medium/big/jackpot), apply `progress^1.6` so
   it starts slow and rushes at the end; tick sound interval also accelerates from 0.12s to
   0.03s as it progresses (0.08s flat if not accelerating), pitch rising with progress
   (`1.0 + progress*0.8`).
6. **Win banner** (medium/big/jackpot only — small tier shows no banner, just the line +
   counter): scales in 0 → `banner_overshoot_scale` (`TRANS_BACK`/`EASE_OUT`, 0.25s) → 1.0
   (`TRANS_SINE`/`EASE_IN`, 0.15s). Give it real contrast — a solid dark panel **plus a
   visible border frame that scales in sync with it**, and a black text outline on both the
   banner and the counter label. (An early version had a near-black panel with no text
   outline and it was nearly illegible against the equally-dark background — don't reuse
   a "just floating text" banner.)
7. **Settle**: brief final pause (~0.3s), then snap everything to end state (finish the
   payline draw if skipped mid-animation, clear dim on symbols, hide the banner).

**Tap-to-skip**: any tap/click during a presentation should fast-forward every remaining
`wait()` to zero instantly and jump straight to the settled end state — build this in from
the start as an interruptible-wait primitive (a wait function that polls a `skip_requested`
flag every frame instead of a single un-cancellable timeout), not bolted on later.

**Re-entrancy**: if a new presentation can possibly start while one is still playing,
make the second call *await* the first one's actual completion (not just "cancel" it and
race ahead) — an earlier version raced two presentations over the same shared line/text
nodes and threw real errors when a still-running animation tried to touch a node the second
call had already torn down.

## 4. Win-tier config table (exact tuned values)

| field | small | medium | big | jackpot |
|---|---|---|---|---|
| payout/bet ratio | <5x | 5–20x | 20–100x | 100x+ |
| stinger | short chord (C5 E5 G5) | chord+top note (+C6) | 6-note run + sustained chord | 3-note call + brass chord (real musical phrase) |
| shake amplitude | 0 | 3px | 6px | 9px |
| shake duration | 0 | 0.15s | 0.35s | 0.5s |
| punch-zoom | 0 | 0 | 0.03 | 0.05 |
| chroma flash | 0 | 0.15 | 0.5 | 0.85 |
| hitstop (frames @60fps) | 0 | 0 | 3 | 4 |
| particles | none | none | coin burst ×120 | confetti burst ×200 |
| banner | **none** | "NICE WIN" gold `(1,0.85,0.3)` | "BIG WIN" gold `(1,0.75,0.15)` | "JACKPOT!" **red** `(1,0.2,0.15)` |
| banner overshoot scale | — | 1.15 | 1.35 | 1.5 |
| counter duration | 0.5–0.8s | 0.8–1.2s | 1.5–2.5s | 2.0–3.0s |
| counter accelerates | no | yes | yes | yes |
| line cycling | no | no | yes ×2 | yes ×3 |
| music duck (amount/dur) | 0.15 / 0.5s | 0.35 / 1.0s | 0.6 / 1.8s | 0.8 / 3.0s |
| background dim | no | no | **yes** (0.35 alpha) | **yes** (0.35 alpha) |

The color-coded banner (gold for medium/big, **red** for jackpot) is deliberate — DESIGN_DOC.md
calls this out explicitly: the player should recognize tier from color alone before reading
the number. Don't collapse jackpot to the same gold as big.

## 5. Camera/screen juice — one shared system

All screen-level effects route through a single reusable system (trauma-based shake +
punch-zoom + hitstop), never copy-pasted per effect:

- **Trauma shake**: maintain a `trauma` value (0–1, decays over time at `trauma_decay`
  units/sec, default 2.0/s ⇒ ~0.5s full decay). Actual offset = `random(-1,1) * max_offset
  (24px) * trauma²` per axis per frame, plus a small rotational jitter (`random(-1,1) *
  max_roll (0.05 rad) * trauma²`). Squaring trauma makes small shakes gentle and big ones
  punchy rather than linear. `shake(amplitude_px, duration)` converts to
  `add_trauma(amplitude_px / max_offset)` and sets decay so it fades over roughly
  `duration`.
- **Punch-zoom**: camera zoom 1.0 → `1.0 + amount` (`TRANS_SINE`/`EASE_OUT`, 40% of
  duration) → back to 1.0 (`TRANS_SINE`/`EASE_IN`, 60% of duration). Layer on top of shake
  for big/jackpot only.
- **Hitstop**: freeze all *gameplay* animation for N/60 seconds (e.g. by zeroing a global
  time-scale) while audio keeps playing through the freeze — audio must not be gated by the
  same time-scale as animation, or a hitstop silences the exact stinger it's meant to
  punctuate.
- **Chroma flash**: a full-screen post-process pass (chromatic aberration / color-grade
  pulse) driven by `chroma_flash_amount`, plus a separate full-screen dim (to 0.35 alpha,
  fading in ~0.2s and back out ~0.4s after the presentation) used only for big/jackpot.

## 6. Button & UI juice (every interactive element, not just Spin)

- **Press** (pointer down): scale to 0.95× immediately + tint to `(0.72,0.72,0.72)`.
- **Release** (pointer up, inside bounds): tween scale past 1.0 to `punch_scale` (1.08×)
  over 0.08s (`TRANS_SINE`/`EASE_OUT`), then back to 1.0 over 0.1s (`TRANS_BACK`/`EASE_OUT`).
- **Disabled**: desaturate + reduce opacity via a shared shader/filter (tweened over
  0.15s), never just inert-but-clickable-looking.
- Every press plays a distinct click sound, no exceptions, no silent buttons.
- **Every button gets real procedural styling** — dark glossy panel (`bg_color ≈
  (0.10,0.08,0.15)` normal / lighter on hover / darker on press), a **gold border**
  (`(0.85,0.65,0.25)`, ~3px), light gold text. This mattered more than it sounds: leaving
  buttons on a default/unstyled look was the single biggest "looks amateur" complaint
  during review — style every button before anything else.
- **Spin button** specifically: idle-pulses (not spinning, not pressed) between 1.0 and
  1.04× scale on a 1.6s sine loop, to invite the next tap. Circular (corner-radius = half
  its size). Autoplay indicator: a **dashed ring inset well inside the button's own border**
  (not right up against it — a ring too close to the button's border reads as a cluttered
  double-ring), rotating continuously at 2 rad/s, alpha 0.9 when idle. Critically, **dim the
  ring to ~0.35 alpha in sync with the button's own disabled state during a spin** — a
  separate always-vivid ring spinning on top of a visibly greyed-out "busy" button read as
  two disconnected visual states rather than one coherent "machine is busy."

## 7. Architecture notes worth preserving (not just visual)

- **Outcome-before-animation**: the full landed grid is decided by RNG *before* any reel
  starts visually spinning. The reel only *reveals* a predetermined result via scroll
  animation. This is what makes near-miss detection, stagger, and "reveal lands exactly on
  a pitch boundary" all tractable — decide the whole grid up front, then animate toward it.
- **Bet must be locked in at spin-start and evaluated against that exact value**, never
  re-read live at evaluation time. A real, reproduced bug: letting the bet change mid-spin
  and evaluating against the bet's *current* value at payout time let a player inflate a win
  ~50x by bumping the bet right after tapping Spin. Snapshot the stake the instant a spin is
  accepted; also disable bet controls for the duration of a spin as a second line of
  defense, but the snapshot is the real fix.
- **Clear per-spin transient visuals (payline beams, etc.) at the start of every new spin**,
  not just at the start of the next *winning* presentation. A losing spin never reaches the
  "start a new win presentation" code path, so if that's the only place you clear old beams,
  a winning line's beam stays on screen through every subsequent losing spin until another
  win happens to clear it.
- **Symbols are floated directly on a themed background — no boxed/tiled look.** The single
  biggest visual complaint mid-project was symbols each sitting in an opaque box/tile; real
  slots (see reference screenshots) show symbols with just a soft drop shadow directly on a
  rich gradient background (a subtle vertical gradient, purple-ish, with a soft vignette —
  `top≈(0.16,0.07,0.24)` → `bottom≈(0.05,0.02,0.10)`, vignette strength 0.4), with **thin
  gold divider lines between reel columns** and only badge-style symbols (BAR, WILD) having
  their own distinct background shape. Every symbol shape benefits from a **thick dark
  outline** and a small shared glossy highlight ellipse layered on top for a uniform
  glass/chrome read across the whole set.
- **Autoloads/globals that do `randomize()`-style self-init in a "ready" hook can silently
  clobber an externally-set seed if anything else runs between the seed call and the first
  draw** — irrelevant to gameplay (nobody seeds RNG during normal play) but real if you ever
  write deterministic tests: seed *after* one frame/tick has passed, not before.

## 8. Audio design — procedural synthesis, no sample files

Every sound was synthesized from oscillators (sine/saw/square/triangle/noise) with ADSR
envelopes — no audio files at all. In a browser port, the Web Audio API's
`OscillatorNode`/`GainNode`/`AudioBufferSourceNode` (or a tiny synth wrapper) covers the same
ground natively and arguably more easily than hand-rolling WAV buffers.

**Levels** (tune these — they were turned down once already after initial playtest feedback
that the loop/ambient were too loud relative to one-shot SFX): reel spin loop **-9dB**,
ambient/music bed **-14dB**, one-shot SFX at unity. Route through separate music/SFX buses
(or gain nodes) so ducking the music during a stinger doesn't touch SFX volume.

**Sound list** (name → character):
- `button_click` — short punchy square-wave body + a touch of filtered noise, ~0.07s.
- `reel_spin_loop` — looping: filtered noise (~90Hz-ish low-passed hum) + a quiet low sine
  hum at a frequency that completes a whole number of cycles over the loop length (avoids a
  click at the loop seam); crossfade the tail into the head for a seamless loop.
- `reel_stop_0`..`reel_stop_4` — a pitched-down sweep "thump" (`base_freq * 1.6 → base_freq
  * 0.6`) plus a short noise click; **each reel's base frequency is slightly different**
  (`120 + index*14` Hz) so 5 stops don't sound identical.
- `symbol_ding` — three stacked sine harmonics (fundamental + 2× + 3×, decreasing amplitude)
  around 880Hz, bell-like decay.
- `win_stinger_small` / `_medium` / `_big` — short arpeggios of increasing length/richness
  (3 notes → 4 notes → a 6-note run plus a sustained chord), triangle/saw tones.
- `win_fanfare_jackpot` — an actual short musical phrase: a 3-note call-and-hold motif
  (saw+square layered "brass"), then a real sustained 4-note chord — not just a longer
  stinger, a distinct fanfare.
- `counter_tick` — very short, high (2200Hz), square wave, subtle.
- `near_miss_sting` — two close-together low sine sweeps (tension/dissonance) plus a whisper
  of filtered noise, ~0.9s, held sustain.
- `ambient_loop` (music) — a soft sustained pad (integer-cycle-count tones so the loop wraps
  cleanly) with a slow amplitude shimmer LFO and a whisper of filtered noise for "room air."

**Ducking**: on any win stinger, ramp the music bus down by `music_duck_amount` (see tier
table) over ~20% of `music_duck_duration`, hold, then ramp back — fire-and-forget, no
matching "undo" call needed.

## 9. Idle-state ambient juice (screen must never look "dead")

- Background: a slow ambient shimmer/light-drift shader/gradient animation, always running.
- A marquee/title band with a chase-light pattern (sequential bulb brightness sweep) along
  a border strip.
- The reel bezel's rim has a slow pulsing glow (not static).
- Faint background particle drift, continuous, low density.
- The Spin button's idle pulse (see §6) continues between autoplay spins too — don't let
  autoplay's rapid-fire spins read as a loop of dead frames between bursts of juice.
