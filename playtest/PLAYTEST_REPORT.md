# Slot vs Slot: Playtest Report

Method: I watched 3 full auto fights (2 at 1×, 1 at 4×) with timed screenshots and instrumented `Director.play`/`playTurn` with `performance.now()`. I also frame-stepped special, slime and cleanse with `dbg`, and ran about 1.5M headless fights. Scripts: `playtest/deep.ts` (feel metrics), `sweep.ts`/`sweep2.ts` (config search), `final.ts` (recommendation check).

## 1. Verdict

**Yes, there's something here, but the fun comes from slime, not from the slots fighting.** The hook is that **the enemy writes onto your machine**. Slime sticks, you can see it, and it corrupts your odds. The same slime is also your way out, because a slime triple cleanses. That loop pulls back hard: with slime switched off the player wins 94%, and with cleanse switched off the player wins 39%. A mechanic that swings things that much, while still reading as "a slot machine", is good ground for a roguelike. Strips work as decks, and debuffs work as cards added to your deck.

**Core risk: the player has almost no agency, and most spins are noise.** 58% of player turns deal 0 HP damage. Single swords get eaten by single shields ("1 atk (1 blocked)" is the most common log line). The special does **76%** of player damage, so the sword reel barely matters. The enemy does only 0.86 dmg/turn, which makes it a slime dispenser, not a fighter. With no decisions, all of the enjoyment rests on presentation. Right now presentation spends the most time on the least interesting outcomes.

## 2. Pacing (measured, 1× unless noted)

| | Current | Notes |
|---|---|---|
| Seconds per turn, 1× | **4.87 s** (turn start to turn start) | 4.66 s presentation + auto delay |
| Seconds per fight, 1× | **~162 s avg** (33.2 turns), **p90 ~3.8 min** (47 turns) | observed fight: 29 turns, 164 s |
| Seconds per turn, 4× | **1.26 s** | 41-turn fight = 55 s |
| No-match turn | 3.9–4.2 s, of which **~2.0 s is resolving 3 singletons one at a time** | 62% of turns |
| Pair turn | 4.9–5.7 s (spin + DOUBLE banner = 3.4 s) | |
| Triple turn | 5.7–7.0 s | |

Where the time goes:
- **Singleton resolves are the #1 drag.** Attack 0.73 s, shield 0.65 s, energy 0.60 s, played in sequence. A no-match spin spends *more* time resolving (~2.0 s) than a pair does (~1.2 s). That's backwards from slot design, where losses should be quick and wins should linger.
- **Turn card:** 0.31 s × 33 turns = **10 s per fight**, and it sweeps across both paylines (see §3). The bezel glow and gutter arrow already show whose turn it is.
- **DOUBLE banner:** about 1 s blocking, ~7 per fight, and it fires for enemy "4 shield" pairs that don't matter.
- Worth the time: special lightning (1.3 s), slime flood (1.8 s), cleanse (1.3 s), enemy sword jackpot. Keep them.

## 3. Readability (seen in screenshots)

1. **The turn card sits exactly on both machines' middle rows,** so for ~0.3 s it covers the only row that scores.
2. **The JACKPOT and CLEANSED banners are centered over the target machine.** The slime flood and the cleanse reveal play *under* the banner.
3. **Lookalike pairs:** reels 2+3 match but don't pay on **21% of spins** (e.g. enemy SWD-SLM-SLM). First-time viewers read these as a double.
4. **The "near-miss" is always a win.** `isNearMiss` = reels 1+2 match, which is already a pair, so the slow reel 3 plus the `nearMissAww` sound plays on every DOUBLE (~22% of spins). You get a sad sound on a win and never a real near-miss on a loss.
5. **Blocked singles:** a sword flies across the screen and does nothing (55% of player sword attacks are fully blocked). It's a lot of motion for zero outcome.
6. **Slime you can't see:** about 27% of the strip ends up slimed, but you only see 9 cells, so the "persistent" part doesn't come across. The slime blob projectiles are tiny specks.
7. The shield bar and number are small and dark (the enemy's "1" is easy to miss). The recap's 15 rows are too dense to read in a glance.

## 4. Balance

**Recommended default:** enemy HP **30** (was 40) and enemy strip **5 sword / 2 shield / 5 slime** per reel (was 4/4/4). Everything else stays: player 20 HP, special 10 dmg at 5 energy, ignores shield, 1/1/1 player strip, pairMult 2, tripleMult 3, in-order pairs.

| 20k fights each | Current (20/40, 4/4/4) | **Recommended (20/30, 5/2/5)** |
|---|---|---|
| Player win % | 71% | **65%** |
| Turns avg (p10/p50/p90) | 33.2 (19/33/47) | **23.6 (13/23/35)** |
| Time at 1×, current presentation | ~2.7 min | **~1.9 min** (~1.3 min with §5 cuts) |
| Fights over 40 turns | 25% | **3%** |
| Specials per fight / share of player damage | 3.0 / 76% | 2.1 / 68% |
| Cleanse happens (% of fights) | 56% | 47% |
| Enemy slime triples per fight | 0.61 | 0.83 |
| Player sword attacks fully blocked | 55% | **31%** |
| Fights with a streak of 4+ player turns doing 0 dmg | 59% | **28%** |
| Enemy dmg per turn | 0.86 | **1.25** |
| Close finish (winner ≤25% HP) / comeback wins | 37% / 30% | 38% / 32% |
| "Burst" losses (≥60% HP two turns before death) | 3% | 6% |

Why: cutting enemy shield removes the single-sword vs single-shield cancel that makes most turns feel dead. The extra enemy sword gives the Slime King a real threat (a 9-dmg sword jackpot is a good way to lose). The extra slime keeps the cleanse cycle in about half of fights even though fights are ~30% shorter. If you'd rather have more cleanses, use **22/32** with the same strip: 68% win, 25.4 turns, cleanse in 52% of fights.

Other sweep findings:
- **Special damage is the master knob.** 10→8 moves win rate 71→57%; 10→6 moves it to 37%.
- tripleMult 4 raises burst losses to 12%, so avoid it.
- `anyTwo` pairs shorten fights by 18% at nearly the same win rate. Save it as a relic.

**Enemy has no special. That's fine,** because slime *is* its special, and it's the more interesting one. What's missing is a **telegraph**: the player never sees a big enemy moment coming.

## 5. Top 5 for the next iteration

1. **Resolve no-match lines in one simultaneous beat** (all 3 singletons fly at once, ~0.5 s), and keep the per-symbol choreography for pairs and triples. This saves ~1.4 s × 20 turns ≈ **28 s per fight**, and it's the "losses fast, wins linger" rule.
2. **Fix near-miss to be a real near-miss.** Don't play "aww" on pairs; the slow reel 3 as a triple tease is fine. Add a real loss tease: glow the matching symbol when it sits one row off on reel 3, then play "aww". Dim the non-paying reels 2+3 lookalike right away. Near-miss is the slot's best tension beat, and right now it's wired to the wrong outcome.
3. **Ship the recommended config** (enemy 30 HP, 5/2/5). It's cheap, it halves dead-turn streaks, and it brings fights under 2 min.
4. **Move the banners and turn card off the reels.** Put banners above or below the gutter. Replace the turn card with the existing bezel/arrow, or a 0.1 s non-blocking flash. That's 10 s per fight saved and the occlusion is gone.
5. **Make slime state legible and give the Slime King an intent.** Add a strip mini-map or an "OOZE 12/36" counter on the player HUD, and use bigger blobs. Add an enemy intent pip ("next turn: slime-heavy") or a slime meter that builds toward a flood. This turns watching the slime pile up into anticipation, and it sets up §6.2.

## 6. Roguelike decision layers (best fit first)

1. **Strips as decks (between fights).** Add, remove or upgrade symbols on specific reels. The prototype already treats strip cells as persistent state (slime), so deckbuilding is the natural extension. Sim evidence: small strip changes swing win rate by 20+ points (4/4/4 → 5/2/5 enemy), so each pick really counts.
2. **Special as a choice, not an auto-fire.** It's 68–76% of your damage, so put agency where the power is. Bank energy vs fire now, or choose between several specials (10 dmg / cleanse / shield burst). This also gives you counterplay against an enemy intent.
3. **Limited Hold/Nudge charges during the spin.** This is the classic fruit-machine decision. It fits the 9-visible-cell layout and the in-order rule: you can see a triple one stop off. Keep charges scarce (1–2 per fight) so pacing survives.
4. **Relics that rewrite scoring rules:** `anyTwo` pairs, reel 2+3 pairs count, an extra payline, cleanse on slime pairs. The config already has these as flags, so they're nearly free to build.
5. **Enemies defined by what they write onto your strip** (slime = dead cells; others could freeze a reel, turn symbols into curses, or steal bolts). The slime loop is the proven hook, so build more enemies around it.
