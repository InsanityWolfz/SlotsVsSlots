# Slot vs Slot — Demo Implementation Plan

Goal of this demo: find out whether watching two slot machines fight each other, turn by turn,
is fun enough to build a roguelike around. Gameplay feel beats art. The juice spec in
`JUICE_REFERENCE.md` is the source of truth for anything reel/presentation related; this plan
says where it's adapted.

**The demo succeeds if:** a full fight (about 2 minutes at 1×) is fun to watch, each spin's
outcome is readable at a glance, the slime → cleanse cycle shows up in a typical fight, and
the combat log and headless sim give us numbers to balance with.

---

## 1. Game rules (locked for the demo; every number is live-tunable)

### Combatants
| | Player | Enemy |
|---|---|---|
| HP | **20** | **40** (see §1.5) |
| Bars | HP, Shield, Special (5 pips) | HP, Shield |
| Reel symbols | Sword / Shield / Bolt | Sword / Shield / Slime |
| Strip ratio | **1 / 1 / 1** (4/4/4 on a 12-symbol strip) | 1 / 1 / 1 (4/4/4) |

- 3 reels × 3 visible rows = 9 visible symbols. **Only the middle row scores.**
- Each reel is a 12-symbol strip, shuffled once when the fight starts (not every spin). Where
  the reel stops is picked at random. Everything is data-driven so strip length and
  composition can change later.

### Scoring the middle row (in order, like a real slot)
- **Triple** (reels 1 = 2 = 3): (1+1+1) × 3 = **9** of that symbol.
- **Pair** (reels 1 = 2 only, reel 3 different): (1+1) × 2 = **4** of that symbol, **plus 1**
  of reel 3's symbol.
- **Anything else** (including reel 2 = reel 3): **1** of each symbol on the line.
- Everything on the line resolves. For example, Sword-Sword-Shield gives 4 damage and 1 shield.

### Symbol effects
- **Sword**: that much damage to the opponent. Shield absorbs it first.
- **Shield**: adds that much shield to yourself.
- **Bolt** (player only): adds that much special energy. At 5 energy the special fires for
  **10 damage** (default: ignores shield; this is a toggle in the tuning panel), and the
  bar drops by 5. Overflow carries over and **can fire several times** in one resolve (a
  triple gives 9 energy, the special fires, 4 carries over).
- **Slime** (enemy only): turns N of the player's **9 visible** symbols into slime, where N is
  the slime amount (1 / 4 for a pair / 9 for a triple). Slime sticks to the **strip symbol**,
  so it scrolls with the reel and lasts the whole fight. Already-slimed symbols can't be
  chosen again. If fewer than N clean symbols are visible, slime all of them.
- **Slime on the player's machine**: a dead symbol that scores nothing and breaks combos. A
  player **slime triple on the middle row cleanses every slimed symbol on all 3 strips**, and
  the original symbols come back.

### Shield reset
Each combatant's shield resets to 0 **at the start of their own turn**. So the player's shield
lasts through the enemy's attack and is wiped after the enemy's turn, which is what you asked
for. The enemy works the same way in mirror. If *both* shields reset after the enemy's turn,
the enemy's shield would never block anything, because it would be wiped before the player
ever attacks.

### Turn order
Start Fight → Player spin → resolve → Enemy spin → resolve → repeat until one side reaches 0 HP
→ Victory/Defeat banner → Recap screen.

### 1.5 Balance numbers (Monte Carlo, 20k fights per row)
Per-spin expected value with the in-order pair rule at 1/1/1 is **1.37 of each symbol**. (The
1.67 I quoted before was for "any two match". The in-order rule makes pairs rarer.)

| Config | Player win % | Avg rounds | Slimed / fight | Cleanses / fight |
|---|---|---|---|---|
| 100 / 100 HP | 100% | 46 | 58 | 2.5 |
| 20 / 20 HP | **97%** | 9 | 11 | 0.18 |
| 20 / 20, enemy strip 2/1/1 sword-heavy | 80% | 8 | 6 | 0.05 |
| **20 player / 40 enemy** ← default | **71%** | **17** | **21** | **0.62** |
| 20 / 30, enemy 2/1/1 | 51% | 10 | 9 | 0.10 |

At 20/20 the enemy almost never wins, because the player's special (10 damage every ~3.6
turns) outweighs everything the enemy has. **20 / 40** gives a winnable fight about 2 minutes
long where slime piles up and a cleanse happens in about half of fights, so the demo's most
interesting mechanic actually appears. The shield reset already fixes the "never-ending
fight" problem, so the ratio is back at 1/1/1.

---

## 2. Tech stack
- **Vite + TypeScript (strict)**. No game framework.
- **Canvas 2D** at a 1280×720 logical resolution, scaled to fit the window
  (`imageSmoothingEnabled = false`). Pixel art is 16×16 sprites drawn at 5× (80px) on a 96px
  reel pitch. Scale punches stay smooth because the canvas is full-res and only the art is
  chunky.
- **Web Audio API** for all sounds, synthesized procedurally as in juice doc §8. No audio files.
- **DOM overlays** for the tuning panel and combat log (sliders and scrolling come free), in
  styled side drawers.
- **Vitest** for rule tests. `npm run sim` runs the same rules engine headless for balance.

## 3. Architecture

The core rule: **the rules engine is pure and knows nothing about rendering.**

```
src/
  core/                 ← pure TS, no DOM, deterministic with a seed
    rng.ts              seeded PRNG (mulberry32), forkable
    symbols.ts          SymbolId, per-side symbol defs (data-driven)
    strip.ts            build/shuffle strips, slime flags per strip cell
    scoring.ts          middle-row → {sword, shield, bolt, slime} + tier
    combat.ts           applyResolve(): damage/shield/energy/special/slime/cleanse
    fight.ts            turn state machine; emits CombatEvent[] per turn
    config.ts           every tunable number, defaults, (de)serialize
    stats.ts            recap stats accumulator
  sim/
    runSim.ts           headless N-fight balance runner (npm run sim)
  present/              ← consumes events, animates them
    timeline.ts         skippable async waits, speed multiplier, hitstop time-scale
    tween.ts            tweens + easings (sine, cubic, back.out overshoot)
    camera.ts           trauma shake, punch-zoom, hitstop, chroma flash, dim
    reel.ts             the 6-phase reel spin (juice §1) for one reel
    machine.ts          3 reels + bezel + payline beam + win presentation
    hud.ts              HP / Shield / Special bars (ghost-drain HP)
    fx/                 particles, projectiles, damage numbers, lightning, slime blobs
    director.ts         maps CombatEvents → choreographed presentation
  render/
    pixelArt.ts         sprite definitions as string grids + palette → cached canvases
    font.ts             pixel bitmap font for numbers/banners
    background.ts       gradient + vignette + drift particles + marquee
  audio/
    synth.ts            osc/noise/ADSR helpers, music & sfx buses, ducking
    sounds.ts           every named sound
  ui/
    buttons.ts          juiced canvas buttons (juice §6)
    tuningPanel.ts      DOM drawer (` key)
    combatLog.ts        DOM drawer (L key) + export
    recap.ts            end-of-fight screen
  main.ts               loop, input, scene switching
```

**Flow of one turn:** `fight.step()` rolls the stop positions, scores the line, and applies
the result. It returns an ordered `CombatEvent[]` (`SpinResult`, `Damage`, `ShieldGain`,
`ShieldBlock`, `EnergyGain`, `SpecialFire`, `SlimeApplied`, `Cleanse`, `Death`). The
director then plays those events in order and awaits each presentation. This follows juice
doc §7 (outcome before animation): near-miss and landing positions are known up front, the
log and stats come straight from the events, and the headless sim runs the same code with
the presentation layer left out.

**Game state vs display state:** the HP bar shows the *displayed* value, which the director
tweens toward the real value. Game state is never read mid-animation for display.

**Timeline:** every wait in the presentation goes through `timeline.wait(sec)`. That wait
honors the speed multiplier (1×/2×/4×), tap-to-skip (juice §3), and the hitstop time-scale.
Audio isn't paused by hitstop, but it is sped up by the speed toggle, so there are no stray
stingers at 4×.

---

## 4. Screen layout (1280×720 logical)

```
┌──────────────────────────────────────────────────────────────────────┐
│ marquee / chase lights  "SLOT  vs  SLOT"                  [⚙] [LOG]  │
│   PLAYER                                   ENEMY                     │
│   HP  ▓▓▓▓▓▓▓▓░░ 16/20                     HP  ▓▓▓▓▓▓▓▓▓░ 37/40      │
│   SH  ▓▓░░ 2                               SH  ▓░░░ 1                │
│   SP  ◆◆◆◇◇                                                          │
│  ┌──────────────────┐        TURN 7       ┌──────────────────┐       │
│  │ [⚔] [🛡] [⚡]     │     ▶ PLAYER        │ [⚔] [●] [🛡]     │       │
│  │ [⚡] [⚔] [⚔] ───payline───             │ [🛡] [🛡] [⚔] ──  │       │
│  │ [🛡] [●] [⚡]     │                     │ [●] [⚔] [●]      │       │
│  └──────────────────┘                     └──────────────────┘       │
│        [ SPIN ]   [AUTO]  [1× 2× 4×]            [START FIGHT]        │
└──────────────────────────────────────────────────────────────────────┘
```
- Machines sit about 300px wide each with a gutter between them for projectiles, turn
  indicator, and banners.
- The active machine gets a brighter pulsing bezel. The idle one dims slightly (about 0.85×).
- The shield bar has no max. It shows a number plus a bar that fills up to a soft cap of 20.

---

## 5. Pixel art (all in code, `pixelArt.ts`)
16×16 sprites with a limited palette, a 1px dark outline, and a 2px glossy highlight (juice
§7: symbols float on the background, no boxes).
- **Sword**: diagonal, bottom-left hilt to top-right tip. Steel blade with a light edge, gold
  crossguard, brown grip, pommel.
- **Shield**: heater shape, blue face, silver rim, gold boss/cross.
- **Bolt**: yellow zig-zag with an orange shade and a white core highlight.
- **Slime (enemy symbol)**: green blob with two eyes and a highlight.
- **Slimed-over overlay** (on the player's reels): a drippy green goo cap covering the symbol,
  with the original symbol faintly visible underneath (20% alpha) so cleansing reads as a reveal.
- Also: heart (HP icon), small shield icon, energy pip, a pixel font (0–9, A–Z, !), and an
  enemy face on the enemy's marquee.

---

## 6. Reel & machine juice (adapted from JUICE_REFERENCE.md)

| Juice doc | This demo |
|---|---|
| Pitch 200px, art 165px, 5 reels | Pitch **96px**, art **80px**, **3 reels** |
| Max scroll 2400px/s | **1150px/s** (same speed in cells per second) |
| Wind-up 0.08s squash to 0.96 | Same |
| Accel 0.18s cubic-in, decel 0.3s cubic-out | Same |
| Overshoot 12px / settle 0.15s back-out | **6px** / 0.15s (scaled to the pitch) |
| Per-symbol landing punch 1.04 | Same. Scale only the symbol sprite, never the strip (doc's bug) |
| Stop event fires at rest, *before* overshoot | Same (doc's bug). Thunk + punch + "reel stopped" all fire there |
| Stagger 180ms, min spin 0.35s | Same. Normal spin totals about **1.5s** |
| Blur: filler scaleY 1.35, alpha 0.7 | Same |
| Filler count derived from distance | Same, never hardcoded |
| Stop sound `120 + i*14` Hz | Same, and the enemy machine is pitched 15% lower so you can tell the machines apart by ear |

**Near-miss (3-reel version):** if reels 1 and 2 land matching and non-slime, reel 3 gets the
**0.7s slow decel**. Reels 1–2 pulse a glow instead of dimming (with only 2 landed reels,
dimming reads wrong). The `near_miss_sting` plays the instant reel 2 lands. On a triple,
reel 3 lands with an extra punch. On a miss, a small "aww" down-sweep plays. This fires
about 1 in 3 spins at 1/1/1, so it's the main tension beat.

**Win-tier mapping:**

| Juice tier | Trigger | Shake | Zoom | Chroma | Hitstop | Banner |
|---|---|---|---|---|---|---|
| small | no match | 0 | 0 | 0 | 0 | none. Middle-row beam + per-symbol punch only |
| medium | **pair** | 3px / 0.15s | 0 | 0.15 | 0 | "DOUBLE!" gold, overshoot 1.15 |
| jackpot | **triple** | 9px / 0.5s | 0.05 | 0.85 | 4f | "JACKPOT!" **red**, overshoot 1.5, background dim, confetti ×200 |

Presentation order (juice §3): dim the non-scoring rows to 60%, draw the payline beam on in
0.2s, then glow + punch each scoring symbol 60ms apart with rising dings. Next the tier
banner/stinger, then the **combat effects** (§7). Clear the beam when the next spin starts
(doc's bug).

Skip anything that doesn't apply: there are no multi-line cycles and no bet or coin counter.
The damage number replaces the counter tick-up.

---

## 7. Combat juice (new layer, choreographed by `director.ts`)

Symbols resolve **left to right in reel order**, so the player sees each symbol "do its thing."

**Sword attack**
1. The scoring sword sprites lift off the reels and fly as pixel sword projectiles across the
   gap on a slight arc, spinning, with a motion trail. One projectile per scoring sword, so a
   triple sends 3, the last one bigger.
2. Impact on the enemy machine: the machine flashes white for 2 frames, the bezel knocks back
   4–10px and springs back (back.out), 1f of hitstop for each hit ≥4, and shake scaled to
   damage (`min(2 + dmg, 9)` px).
3. If shield is up, the shield absorbs first: a blue "BLOCK" spark, a shield-bar crack, and a
   metallic clank. The rest goes to HP.
4. A damage number pops in the pixel font: scales in with overshoot, drifts up, and fades.
   Pair hits are gold and triples are red and bigger.
5. The HP bar drops instantly to the new value in red. A white "ghost" bar trails and drains
   after 0.4s. The bar shakes.

**Shield gain**
Shield sprites lift and pop into the shield bar (short hop, not across the screen). The bar
fills with a shimmer sweep. A translucent pixel bubble outline pulses once around the owner's
machine. A clang plus rising chime. When the shield resets at turn start, the bar drains with
a soft "fizz" so the reset is visible.

**Bolt → Special**
1. Bolt sprites zap into the special bar, filling one pip each with a crackle tick that rises
   in pitch per pip.
2. At 5 pips the bar flashes, a charge-up whine plays (0.4s), the screen dims to 0.35 and
   everything freezes with 4f of hitstop.
3. A procedurally generated jagged lightning bolt (midpoint displacement, 3 flickers over
   0.25s) strikes from the top of the screen onto the enemy machine. White screen flash,
   chroma 0.85, 9px shake, 0.05 punch-zoom, big "10" number, thunder crack (noise burst +
   low sine drop).
4. Overflow: the leftover pips refill visibly afterward. Multiple fires queue one after another.

**Slime (enemy)**
1. Enemy slime symbols wobble (squash-stretch) and then launch one goo blob for each slimed
   cell across the gap to the player's machine.
2. Each blob splats onto its target cell (squash on impact, small droplet particles, wet
   "splort" sound randomized in pitch). The goo overlay drips in over 0.2s.
3. Four or more slimed at once shakes the player's machine. A slime triple floods the machine:
   a green wave washes over all 9 cells top to bottom, with a "SLIMED!" banner.

**Cleanse (player slime triple)**
The payline beam turns white-gold, then a sparkle wipe runs across every reel. Goo evaporates
off each slimed cell with a staggered pop and upward sparkles as the original symbols fade
back in, with a rising glissando and a "CLEANSED!" banner. Slimed cells on the off-screen part
of the strips are counted in the banner ("CLEANSED ×14!").

**Death**
Final-hit hitstop of 8f, the loser's machine flickers and desaturates, its reels drop 20px and
tilt. "VICTORY" (gold) or "DEFEAT" (red) banner with a stinger. After 1.5s the Recap screen
slides in.

**Turn transitions**
A "PLAYER TURN" / "ENEMY TURN" card sweeps in (0.35s). The active bezel brightens. The shield
reset fizz plays here.

---

## 8. Audio additions (on top of juice doc §8)
`sword_whoosh`, `hit_impact` (noise thump + low square, pitch goes down as damage goes up),
`block_clank`, `shield_gain`, `shield_fizz`, `energy_pip`, `special_charge`, `thunder`,
`slime_launch`, `slime_splat`, `cleanse_sparkle`, `turn_card`, `victory`, `defeat`,
`near_miss_aww`. Buses and levels as in the doc (spin loop −9dB, ambient −14dB). The ambient
bed ducks on jackpots and specials.

---

## 9. Controls & modes
- **START FIGHT**: resets the fight (new seed unless one is locked) and begins.
- **SPIN**: manual mode. Enabled only on the player's turn. The enemy always auto-spins after
  a short beat.
- **AUTO**: toggles auto play (the player spins by itself after a 0.5s beat).
- **Speed 1× / 2× / 4×**: scales every timeline wait and tween. Hotkeys 1/2/3.
- **Click / Space during a presentation**: skip to the settled end state (juice §3).
- `` ` `` opens the tuning panel, `L` opens the combat log, `R` restarts.

## 10. Tuning panel (`` ` ``)
Every value in `config.ts`, grouped. Values save to localStorage, and there's a "Reset
defaults" button.
- **Fight:** player HP, enemy HP, special cost (5), special damage (10), special ignores
  shield (toggle), sword damage, shield value.
- **Scoring:** pair multiplier (2), triple multiplier (3), pair rule (in-order / any two).
- **Strips:** length and composition per reel per side (e.g. `4/4/4`), reshuffle per fight.
- **Slime:** slime per symbol, cleanse rule (triple / off).
- **Shield reset:** own-turn start (default) / never / end of round.
- **Pacing:** speed, auto delay, near-miss on/off, and a toggle for each juice layer (shake,
  hitstop, chroma, particles, banners, audio) so we can A/B test what the juice is worth.
- **RNG:** seed field + lock seed, **force next line** (pick 3 symbols for the next player or
  enemy spin), and a "grant 5 energy" / "slime 9" debug button.
- **Sim:** "Run 1000 fights with current config" → win %, avg rounds, p10/p90, avg
  slimed/cleanses shown inline. This is the same engine as `npm run sim`.

## 11. Combat log (`L`)
- One entry per event, with the turn number, actor, line (`⚔ ⚔ 🛡`), tier, and the
  resulting deltas and state after, e.g.
  `T7 PLAYER  ⚔⚔🛡  PAIR  → 4 dmg (2 blocked, 2 HP) | +1 SH | enemy HP 33/40`.
- Colored by event type, auto-scrolls, and has filters (player/enemy/specials/slime).
- **Export**: "Copy JSON" and "Download CSV" of every fight this session (seed, config hash,
  per-turn rows) for balancing in a spreadsheet.

## 12. Recap screen
Winner banner. Then two columns (player / enemy) with ticking counters (juice §3 counter
tick-up, never snap-set):
- total spins, damage dealt, damage blocked, shield gained
- pairs / triples (jackpots) hit, near-misses that landed vs. missed
- specials fired + special damage, energy overflowed (player)
- symbols slimed (enemy) / cleanses + symbols cleansed (player), peak slime coverage %
- biggest single hit, longest streak without a match, fight duration
- **Rematch** (same seed), **New fight**, **Copy log**.

---

## 13. Milestones (each ends with something you can see and play)

**M0: Scaffold** (small)
Vite + TS strict + Vitest, canvas scale-to-fit, main loop with delta time, empty scene, `npm
run dev / test / sim / build`.

**M1: Rules engine + sim** (core, no visuals)
rng, strips, scoring, combat, fight state machine, events, config, stats. Unit tests for every
scoring case (triple, 1+2 pair, 2+3 not-a-pair, slime breaks combos, multi-fire overflow,
shield absorb, per-owner reset, slime can't double-hit, cleanse restores). `npm run sim` must
reproduce the §1.5 table.
*Done when:* the sim table matches, all tests are green.

**M2: One juiced reel machine**
Pixel sprites, background, one 3×3 machine running the full 6-phase spin, stop events,
near-miss, payline beam + per-symbol punch, win tiers (shake/zoom/chroma/hitstop through
`camera.ts`), procedural audio for spin/stop/ding/stingers, juiced buttons, tap-to-skip.
*Done when:* spinning one machine on its own already feels good.

**M3: Two machines + turn loop + HUD**
Both machines, the fight state machine driving the director, turn cards, HP/Shield/Special
bars with ghost drain, Start Fight / Spin / Auto / speed, and plain (unjuiced) numeric
effects so the fight is playable end to end.
*Done when:* a full fight plays out to a winner at 1×/2×/4×.

**M4: Combat juice**
Sword projectiles + impact, block, shield gain/fizz, special charge + lightning, slime lob +
splat + goo overlay, cleanse wipe, death sequence. All new sounds.
*Done when:* every event type has its full choreography and a fight is fun to watch.

**M5: Tooling**
Tuning panel (all sections incl. force-line and in-browser sim), combat log + export, recap
screen.
*Done when:* you can change a number, rematch the same seed, and export the log.

**M6: Idle juice & polish**
Marquee chase lights, bezel glow pulse, drift particles, Spin idle pulse + auto ring (juice
§6/§9), consistency pass on timing at all three speeds, button styling pass.

**M7: Playtest pass**
Watch 10 fights at 1× and 10 at 4×. Note where attention drops, which effects are noise, and
what's unreadable. Tune defaults. Then write down the verdict on the core loop.

## 14. Risks to watch during the demo
- **Presentation length.** A full juiced turn is about 3–4s, so a round is about 7s and a
  fight about 2 min. If that drags, first turn the no-match (small tier) presentations down to
  almost nothing. Only pairs and triples should get the full show.
- **Readability of two machines at once.** Only one machine animates at a time, and the idle
  one dims. Don't let both run effects at the same time.
- **Hitstop + speed toggle interaction.** Hitstop is counted in frames at 1× and scaled with
  speed, and audio stays in sync.
- **Juice fatigue.** At 4× the jackpot-tier effects repeat often. The per-layer toggles exist
  to test this.
