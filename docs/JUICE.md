# Juice: the rules that made the demo feel good

Distilled from the original Godot build's notes. The exact numbers live in `src/present` (reel.ts, director.ts,
fx.ts, camera.ts) and `src/audio`; this file keeps the WHY, so new features feel like the rest of the game.

## Reels
- **Decide the outcome first, then animate toward it.** The grid is rolled before a reel moves, which is what makes
  near-misses, staggered stops and landing exactly on a cell possible. (The engine is already built this way:
  `Fight.step()` emits events, the Director plays them.)
- A spin has phases: wind-up squash → accelerate → blurred constant spin → decelerate → a small overshoot bounce →
  a landing punch **on each symbol** (never scale the whole strip; that wrenched every symbol sideways).
- **The stop thunk and the game logic fire the instant a reel reaches its resting place,** not after the cosmetic
  bounce. Otherwise sound and state lag the picture.
- Reels stop left to right, staggered. A near-miss slows the last reels right down: "struggling to land" sells it.

## Wins escalate in tiers
- Small → medium → big → jackpot. Each tier adds a layer: banner, shake, punch-zoom, hitstop, particles, a longer
  count-up, a bigger stinger, a deeper music duck. **A tier is recognizable by color before the number is read**
  (the jackpot banner isn't the same gold as a big win).
- Order matters: dim the losers → draw the payline → punch each winning symbol in turn with rising-pitch dings →
  count up (never snap a number) → banner → settle.
- Banners and numbers need a solid panel, a border and a dark text outline. Floating text was illegible.

## One shared screen-juice system
- Trauma-based shake (offset scales with trauma², so small shakes stay gentle), plus punch-zoom and hitstop, all
  through one system. Nothing is copy-pasted per effect.
- **Hitstop freezes the animation, never the audio.**
- **Photosensitivity:** no full-screen white flashes. `FLASH_CAP` is 0.2, and LIGHTNING has a FULL/SOFT option.

## Everything you touch reacts
- Press squashes, release overshoots, and every press clicks: no silent buttons. A disabled control must look disabled.
- The screen never looks dead: idle shimmer, chase lights, pulsing rims, slow particles.

## Callouts never collide
- A callout that can fire in bursts gets a fixed home, not a floating text: relics that fire show in the RELIC FEED,
  rows left of your machine drawn over everything, newest on top; the same relic again counts up (X2) instead of
  adding a row. Floating texts pick a spot once and drift, so several at once pile up or hide behind panels.

## Skip and safety
- **Every presentation can be skipped** (a wait that polls a skip flag), jumping straight to its end state.
- A new presentation waits for the running one to finish. Two racing over the same visuals crashed the old build.
- Clear per-spin visuals at the START of every spin. A losing spin otherwise leaves the last win's line on screen.
- Snapshot anything a spin depends on when it starts. (A live-read bet once let a player inflate a win 50×.)

## Audio
- Every sound is synthesized: no sample files. Music and SFX are on separate buses, and stingers duck only the music.
- Repeated sounds vary: each reel's stop has its own pitch, and dings climb in pitch along the line.
