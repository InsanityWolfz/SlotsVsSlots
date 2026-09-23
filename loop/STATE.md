# Autonomous Dev Loop — State

Started 2026-09-22 (overnight, user asleep). The user will ask for a **full report** when they're
back. Don't ask them questions; make reasonable calls and write them down here.

## North-star goal (from the user)
A run of **5 procedural enemies in a row**, with **meaningful decisions between fights**, building
up to a **boss fight with a special slot-machine mechanic** (I pick the mechanic).

## Design constraints (from the user, binding)
- **No in-fight input.** Nothing to click during a fight, and nothing that pauses spins or lets
  the player respond to enemy intent. Fights stay watch-only. (A *passive* intent telegraph is
  fine: it's information, not a prompt.)
- **Agency = choices between fights** (for now).
- **No holds or nudges.** The furthest allowed is a passive power-up/relic along the lines of
  "X% chance a close miss (near-miss) becomes a jackpot".
- **Enemy variety:** enemies that remove symbols, add symbols, freeze reels for a couple of
  turns, disable a reel, and so on. What an enemy writes onto your machine is the hook.
- Juice everything per JUICE_REFERENCE.md. Pixel art comes from the art agent (consistency;
  tools/build-art.mjs is the source of art truth).

## The cycle (repeat)
1. **Playtest agent** plays the latest build (browser + headless sim) and writes
   `playtest/ITERATION_<n>.md` with findings/suggestions. Focus: player incentive structures,
   fairness, overall feel, gameplay.
2. **Art agent** makes any new art the suggestions or features need (edit tools/build-art.mjs,
   regenerate).
3. **Me:** implement suggestions + next roadmap features. Keep tests green, add tests for new
   rules, and verify in the browser.
4. Commit with a clear message and update this file (iteration log below).
5. Next iteration.

## Roadmap (ordered; revise as playtests teach us)
- [x] **I1: run structure.** Map of 5 fights + boss; HP carry-over rules; between-fight draft
  (pick 1 of 3: add symbol to a reel / remove symbol / upgrade symbol / relic). Passive enemy
  intent telegraph. Strip mini-map (whole-strip view of slime etc).
- [x] **I2: enemy roster.** (engine + visuals landed in I1; balance continues) Procedural enemies from archetypes that write on your machine:
  slime (dead cells), freeze (reel locked N turns), thief (removes symbol), junk-adder (adds
  dead/rock symbols), disabler (a reel scores nothing for N turns). Scaling by run depth.
- [~] **I3: relics.** (9 relics in; more + rarity later) Passive rule changes: near-miss → jackpot % chance, any-two pairs,
  cleanse-on-pair, extra payline, etc.
- [~] **I4: boss.** (THE HOUSE + progressive pot in; phase 2 / special machine TBD) A special slot mechanic (e.g. a 5-reel boss machine, a boss that spins its
  reels INTO yours, a phase change at 50% HP).
- [ ] **I5+:** balance passes from sim + playtests; recap-of-run screen; polish.

## Iteration log
(newest last: what was done, commit hash, playtest verdict, open issues)

### Iteration 1 — 2026-09-22 (commit d60711e)
- Built the run: 5 procedural fights (6 archetypes, no back-to-back repeats, gentle opener) + boss THE HOUSE.
- Enemy writers: slime, freeze (ice), steal (claw), rocks (permanent, 1/2/3 per hit), jam (lock, 1 turn).
- Passive telegraph: every enemy has a charging ability shown on its HUD (e.g. SMASH NEXT!).
- 9 passive relics incl. Lucky Clover (30% near-miss→jackpot, the user-approved nudge substitute).
- Between fights: draft 1 of 3 (add/remove symbol on a specific reel, relic, heal, +max HP), preview of next enemy with the whole run map (plan ahead), run-over summary.
- Boss: coins fill a progressive POT; House cashes it out every 5 turns; any player jackpot steals the pot.
- Balance via run sim (3000 runs): greedy drafting 32% run wins, random 24%; deaths ~4-5% F1-F3, ~11-15% F4-F5, boss ~50%.
- Playtest build isolated at :4173 so dev edits don't disturb playtests.
- Open questions for playtest: is drafting meaningful (greedy vs random gap only 8pts)? rocks bloat? thief/gremlin fairness? boss pacing?

### Iteration 2 — 2026-09-23 (playtest/ITERATION_1.md → Package G)
Playtest verdict on I1: run skeleton good, but drafts were 'solved' (always-relic 55% vs greedy 31%), +sword/+shield/-bolt were traps, HP carry-over irrelevant (92% HP into boss), golem rocks halved run win rate, freeze *helped* the player (frozen jackpots repeat), pot too small.
Implemented:
- Rocks: single rocks fizzle; doubles add 1, jackpots 2; max 2 rocks per fight stay permanently (rest crumble, shown on draft); CLEAR ROCKS card smashes a whole reel.
- Drafts: relics only after fights 2 and 4, as 2 relics + 1 other (relic vs relic). ±1 trap cards replaced by SWAP cards (2 shields/rocks → bolts/swords on a reel) and +1 BOLT; every strip card shows a before→after stat line (ENERGY 1.37 TO 1.62 per spin).
- Branching map: fights 2–4 are forks (choose 1 of 2 enemies, full scouting reports); map shows writer badges.
- 6 new relics: Mittens (anti-freeze), Lockpick (anti-jam), Mousetrap (anti-thief, SNAP 3 dmg), Pickaxe (rocks hit like swords), Loaded Dice (jackpots x4), High Roller (doubles steal the pot).
- Freeze fixed: target reels clunk one stop to their worst visible cell, max 2 reels, never hold a reels-1+2 match.
- Jams: single locks fizzle. Enemy targeting values bolts > swords > shields.
- Boss: pot seeded 5, +1 house cut every House turn, cash out every 6, boss HP 44, phase 2 'ALL IN' at half HP doubles the pot; bigger tiered pot widget; cash-out juice scales with the amount.
- Opener is always Slime or Frost (0.85x HP); brute from fight 2; frost 1.1x HP; post-fight heal 0.2.
- Fixes: sandbox fights hide run overlay; hourglass shown in preview; layout collisions.
- Tooling: dbg.tick/dbg.snap + playtest/scratch/snap-server.mjs so frames can be captured even when the app window isn't painting.
- Art: 22 new sprites (6 relics, swap/clear cards, pot tiers, map fork + 7 writer badges), gremlin recolored orange (art agent hit a usage limit mid-pass; I finished registering the sprites + recolor).
Sim (3000 runs): greedy 36%, always-relic 31% (no longer dominant), random 25%. Deaths: F1 0 / F2 5 / F3 5 / F4 7 / F5 10 / boss 36% (greedy). Boss ~50% lethal is now the main wall.

### Iteration 3 — 2026-09-23 (playtest/ITERATION_2.md → Package H + WILDs & gilding)
Playtest verdict on I2: always-relic fixed, but 'always take HP' became dominant (44%) because the boss was a one-shot lottery (77% of boss deaths = one ~20 dmg cash-out). Forks one-sided; counter relics dead picks; freeze still gave free frozen shield jackpots; ALL IN label spoiled pot steals.
Implemented:
- Boss: the House SKIMS half the pot per cash-out (rest keeps growing), cashes every 4, ALL IN adds at least +8, 48 HP. LETHAL! pot state (widget pulses red with potTier4, enemy countdown shakes) when the next skim would kill you. ALL IN label/banner now use presented state; banner no longer covers HP bars; speed text moved.
- HP cards weaker (+4 max HP, heal 8); swaps move 3; +2 BOLTS instead of +1.
- Enemy spread: brute 5 sword/7 shield, thief 3 claws/4 shields, frost 6 sword/4 ice, gremlin & golem x1.25 HP.
- Elite forks: the harder option is ELITE (x1.25 HP, skull-crown badge, danger pips) and drops a free relic.
- Counter relics removed from relic drafts; offered as PREP cards when their enemy is on the next fork. Mousetrap 35%/2 dmg, shown before the steal. High Roller doubles steal half the pot.
- Freeze: never more than 2 reels frozen; no two frozen reels ever show the same payline symbol.
- Two-line card deltas (gain in green, cost in red).
- NEW FEATURE — WILDs & gilding: WILD symbol (completes runs, lone wild pays as a bolt); GILD cards enhance every cell of a symbol on a reel: GOLD (x2), KEEN swords (pierce), CHARGED bolts (+1 energy), SPIKED shields (hit back 2). Thief/slime target gilded cells first, freeze clunks away from them. Overlays on reels + strip-map ticks; PIERCE!/SPIKED! callouts.
- Art: 10 sprites (potTier4, elite badge, danger pip, prep card, wild, 4 enhancement overlays, gild card) + art build now fails if a sprite is missing from the SpriteId union.
Sim (3000 runs): greedy 45%, always-relic 38%, random 30% — 15pt skill gap, deaths spread 0/8/7/9/9/22%. Gild-first beats plain greedy (whole-reel gilds are build-defining).

### Iteration 4 — 2026-09-23 (playtest/ITERATION_3.md → Package J + build relics + THE CASHIER)
Playtest verdict on I3: HP-first fixed, boss no longer a one-shot lottery (burst deaths 53%→11%), but 'always fight the elite' dominated (49.9% vs 37.4% safe) because DANGER was stale and elite relics snowballed; LETHAL warned before only 52% of pot deaths; gilds strong but no builds; WILD/KEEN cards were traps; 10 bugs.
Implemented:
- Package J: DANGER recalibrated (brute 20, thief 13, gremlin 12, frost 8, slime 5, golem 4); boss +3 HP per relic held; the House cashes out at the START of its turn (LETHAL now always precedes pot deaths); potWin carries potLeft (pot widget no longer drops to 0); NEXT SKIM readout on the pot.
- Elites: choose 1 of 2 relics (ELITE SPOILS screen) instead of a random drop. Mirror is elite-only.
- Cards: no more shields→swords swaps; WILD card = 2 shields → 2 WILDs; KEEN = +1 damage AND pierce; +2 BOLTS fallback replaced by a second gild; half of gild offers EXTEND a gild you own onto another reel.
- Build relics replace dead ones (soap, magnet, dice, hourglass, whetstone removed): MIDAS (gold cells +1 energy), LIGHTNING ROD (charged build → special costs 4), CACTUS (spikes hit back 4), PRISM (WILD matches x2), HONE (keen +2).
- Gild readability: X2 stamps on scoring gold cells, +N callouts for keen/charged, banner maths ('9 X2 = 18 ENERGY'); YOUR REELS panel shows WILDs + gild overlays; distinct strip-map tick sprites; PIERCE only when a shield was pierced; label placement fixes; boss preview explains the skim + chip shield.
- NEW FEATURE — THE CASHIER: chips (+2 per win, +2 elite, +1 per jackpot, +1 per 5 overkill, interest +1 per 5 banked up to +3); shop after fights 1/3/5 (after the draft): 2 targeted gilds (10), a relic (12), a utility (2 WILDs 6 / remove a symbol 4 / heal 4), reroll (2, +1 each); unspent chips become +1 shield per 5 at the start of each House turn in the final fight. Chip counter on run screens + in fights.
- Balance after the shop (first pass had greedy 73%): depth HP [19,24,28,31,34], boss 66 base HP, 2 chips/win, gild 10 / relic 12.
- Art: 16 sprites (5 build relics, X2 stamp, 4 ticks, chip, cashier portrait, shop cushion, skim hand) + keen/charged overlays redrawn; art build supports non-square sprites.
Sim (3000 runs, before final shop tuning pass sweeps at 1500): greedy ~45%, random ~23%; deaths ~1/9/10/11/11/13%.

### Iteration 5 — 2026-09-23 (playtest/ITERATION_4.md → Package K + CABINETS + FULL SET)
Playtest verdict on I4: forks balanced (elite-safe = 0.0 pts), LETHAL precedes 100% of pot deaths, but the Cashier was a piggy bank (hoarding for the boss chip-shield beat spending; shop 1 unaffordable 100%), commitment didn't beat spreading, 12 UI/text bugs.
Implemented:
- Package K: chip shield 1 per 8 (was 5), runs start with 4 chips, boss 74 HP (HP ramp [21,26,31,34,37] after cabinet tuning).
- Build-aware offers: build relics only offered once you own their enabler (drafts, shop, spoils); 'FITS' tag on matching cards/items; no Bandage at the last shop; WILD offers never eat gilded shields.
- HEAL is a permanent 5-chip Cashier service slot (hidden at full HP); first reroll per visit costs 1; stat lines on shop items; shop shows HP + live '+N SHIELD EACH HOUSE TURN'; unaffordable items shake.
- Rod buffed (cost 4 AND 12 dmg). Frost HP x1.0 from fight 3; elite thief only x1.15.
- Chip legibility: chip counter top-left (+ cabinet name, + SH/TURN in the boss fight); 'CHIPS +N SHIELD' callout each House turn; LETHAL counts the chip shield; boss preview shows real HP (+3/relic) and your chip shield; skim wording.
- Text fixes: elite fork 'PICK 1 OF 2 RELICS, +2 CHIPS'; Cactus-aware SPIKED text; recap lists spoils/buys/chips without overprint; no 'GILDED'/'WILD' enemy adjectives; draft header overlap.
- NEW FEATURE — CABINETS: pick your starting machine (KNIGHT 32HP; MIDAS gold swords r1, +1 chip/win, 22HP; THORN spiked shields r1, 28HP; TESLA charged bolts r1, special cost 4 dmg 7, 26HP; JOKER 2 wilds r2 + any-two pairs with a wild on the line, 26HP). Each biases gild offers to its enhancement. Unlocks persist (meta progression): reach the House / beat an elite / win a run / win with wilds. Tuning panel has 'Unlock all cabinets (dev)'.
- NEW — FULL SET: the same gild on all 3 reels boosts it (GOLD x3, KEEN +2, CHARGED +2, SPIKED +2) with a FULL SET! banner.
- Art: 5 cabinet portraits + locked cabinet, chip shield, FITS tag, shop heal tin, set star.
Sim (2000 runs, greedy/random): knight 46.6/31.9, midas 47.9/27.3, thorn 45.0/37.0, tesla 47.5/29.9, joker 42.6/28.9 — all cabinets within ±4 of knight; boss win 75%.
