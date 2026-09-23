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

## User feedback & direction (2026-09-23, after playing I5)
- "This is amazing. Keep going." Balancing felt good — keep balancing with the same rigor.
- Wants: MORE ENEMIES, MORE POWERFUL UPGRADES, MORE POWERFUL RELICS, and a SECOND ACT with another cool boss at the end.
- Keep the loop running (resume after usage limits). Don't edit src while the user is actively playing on :5173 (HMR reloads their page).

## Roadmap (ordered; revise as playtests teach us)
- [x] **I6: ACT 2.** After the House: a second act of 5 fights + a new boss with its own special slot mechanic. New act-2 enemy archetypes that write on your machine in new ways (e.g. bombs planted on your cells, hexes that strip gilds, drains). Act transition reward (legendary pick + heal).
- [~] **I7: power curve.** (first pass in I6: VAMP/LUCKY/BLAZE gilds + 6 legendaries; next: gild tiers, per-act tuning from playtest) Stronger upgrades (new gild types / gild tiers) and legendary relics for act 2; keep sim balance per act and per cabinet.
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

### Iteration 6 — 2026-09-23 (playtest/ITERATION_5.md → Package M + ACT 2)
Playtest verdict on I5: cabinets give identity, commit beats spread, but the House is a victory lap for elite-path runs (98%), THORN strong under build-aware play, SPIKED FULL SET never fires, stat lines ignore sets, set completion silent, 12 bugs.
Implemented (user direction: more enemies, stronger upgrades/relics, a second act with a new boss):
- ACT 2: beating the House now starts act 2 (full heal, pick 1 of 3 LEGENDARY relics, then the Cashier). 5 new fights + THE MIRROR. Run = 12 fights. Act 2 HP curve [57,62,68,73,78], act 2 enemies get +2 swords/reel. Veterans (brute/frost/thief/golem/gremlin) join act 2; every act 2 fork shows at least one new face.
- New enemies: BOMBER (sticks bombs on your visible cells; fuse 3 of your turns, 3 dmg, shield blocks; landing a bomb on your payline DEFUSES it; CARPET BOMB ability), HEXER (hexed reels pay half and their gilds go dark; CURSE), VAMPIRE (drain: hurts you and heals itself; BLOOD MOON heal 8), MIMIC (hits you with your own last spin's best group; GULP eats chips from your purse).
- THE MIRROR (act 2 boss, special mechanic): plays a copy of YOUR machine (strips + gilds, no relics), HP = 1.9x your max HP + 3/relic, REFLECTION every 4 turns throws your last spin's damage back (min 3, max 20), cracks at half HP (every 3). Gutter panel shows the next reflection's damage + countdown.
- New gilds (act 2 offers): VAMP swords heal 1 on hit, LUCKY cells 25% land as WILD, BLAZE reels +3 special damage. Full-set versions (heal 2 / 40% / +4).
- Legendaries: GOLDEN TICKET (2-reel full sets), JACKPOT BELL (jackpots x2), PHOENIX FEATHER (survive lethal at 1 HP once/fight), OVERCHARGE (special echoes at half), SKELETON KEY (doubles x1.5), GOLDEN HOURGLASS (enemy abilities +2 turns). Act transition pick, act 2 relic drafts (40%), act 2 elite spoils, act 2 Cashier top shelf (20 chips).
- ITERATION_5 fixes: D1 SPIKED set flags its banner; FULL SET banner names what the set does; D2 stat lines count full sets; D3 stamps show real +N; D5 '1 per 8' everywhere; D6 reels panel moved below cards; D7 heal slot sized to missing HP, hidden under 3 missing; D8 COMPLETES SET gold ribbon + set pips on gild cards + sting on purchase; D11 shelf always >= 4 items. TESLA 25 HP, JOKER 27 HP (THORN kept at 28: 27 dropped it to 38% act-1 under greedy).
- Over screen handles 12 fights (compact rows, act divider, portraits stored per record). dbg.vs supports act 2 archetypes and 'mirror'. Missing sprites fall back to a placeholder instead of crashing.
- Art: 31 sprites (5 portraits, 4 writer symbols, bomb/hex overlays, 3 gild overlays, 6 legendary relics, 5 ability icons, 5 map badges, act badge). Art agent hit a usage limit after registering everything; self-check OK.
- Tests: 98 (20 new in iteration6.test.ts).
Sim (2000 runs, full 12-fight run): greedy 20.4% / relic 15.2% / random 10.7%. Act 1 clear 44.7% (unchanged), House 73%, Mirror 60%; deaths spread A2-A5 6-12%, HOUSE 16%, act 2 fights 1-4% each, MIRROR 13%. Cabinets greedy: knight 20.4, midas 30.4 (strong in act 2: chips + gold), thorn 16.4, tesla 22.4, joker 22.5.
Open: MIDAS too strong in act 2; act 2 regular fights may be too soft for greedy (1-4% deaths) — needs playtest feel check; HIGH STAKES (boss markers) idea from ITERATION_5 still pending.

### Iteration 7 — 2026-09-23 (playtest/ITERATION_6.md → Package N: the Mirror rebuilt, gild tiers, act 2 arc)
Playtest verdict on I6: act 2 has no climax — the Mirror's damage was 66% its own copied specials, REFLECTION fired in only 23% of fights, and its panel spoiled the spin; act 2 fights got easier B1→B5; cabinet spread 20–64% act 2 clear (MIDAS/GOLD dominant, THORN starved); OVERCHARGE the default legendary, TICKET weakest; always-elite +8.7 in act 2; 15 bugs (E1–E15).
Implemented:
- THE MIRROR rebuilt around REFLECTION: no specials of its own (its bolts do nothing), never casts your rocks, doesn't copy your spikes; REFLECTION = your best hit since its last one (3–20), every 3 turns, every 2 once CRACKED (persistent crack overlay). HP = 3 × your machine's expected damage per spin (machinePower: swords + energy→specials incl. BLAZE) + 55 (swept k=6/4/3/2/0: k6 punished strong builds, random > greedy). Panel reads PRESENTED damage only, says 'AT LEAST N'.
- Gild levels: level = 1 + TIER II + FULL SET (+2 with the Golden Ticket). GOLD xlevel+1, KEEN/CHARGED +level, VAMP heals level, LUCKY 35%+15%/level, BLAZE 3+level-1, SPIKED 2+2/level and a SPIKED FULL SET hits back for the shield you had up (THORN's act 2 scaling). A hex breaks a FULL SET while it lasts. Act 2 drafts (40%) and the Cashier (50%, 12 chips) offer TIER II upgrades of gilds you own; 'II' badge on upgraded cells.
- Legendaries: SKELETON KEY x2, OVERCHARGE echo 1/3, GOLDEN TICKET = 2-reel sets that pay one step more. LUCKY 35%.
- Act 2 arc: HP curve [52,62,73,85,97]; Vampire/Mimic can open act 2; act 2 elite spoils never legendary; act 2 Cashier back to 4 slots (relic slot = a legendary at 20).
- Hexer: single hexes fizzle, CURSE = 1 reel for 3 turns, HP x0.95. Bomber: never plants on the payline; bomb fuse badge moved off the bomb art, red pulse at fuse 1, live bombs + fuse on the strip map; blurb reworded.
- Bugs: E1 reflection spoiler; E2 stamps skip hexed reels, gold stamps show the real X3/X4; E4 chip counter drops on GULP (and gulps come out before interest); E5 (Mirror has no specials); E6 stat lines for VAMP (HEAL) / BLAZE (SPECIAL) / LUCKY (wild split) / KEY / BELL / tiers; E7 shelf ≤ 5 incl. heal; E8 relic grid 4 wide in fights, 10 per row on screens; E9 act 2 machines set up before the legendary pick; E10 overflow (REFLECTS NEXT!, PHOENIX sub, unlock line, LEGENDARY ribbon inside cards); E11 wording + 1.5x Mirror footnote; E12 TUNE.mirrorHp removed; E13 Mirror casts no rocks; E14 ACT 1/ACT 2 plaques, '1 ROUND'.
- Tests: 106 (8 new in iteration7.test.ts).
Sim (2000 runs): greedy 19.5% / relic 17.3% / random 12.8%. Act 1 clear 46.5%; House 76%; Mirror 63% (greedy). Cabinets greedy: knight 19.5, midas 21.3, thorn 14.9, tesla 20.6, joker 17.9 (was 12–30).
Open: THORN still lowest (sim greedy ignores builds; check under commit play); act 2 regular fights 2–4% deaths each; greedy vs random gap in act 2 is small (sim policy doesn't value act 2 choices); HIGH STAKES still pending.

### Iteration 8 — 2026-09-23 (playtest/ITERATION_7.md → Package O: build for the Mirror, not against it)
Playtest verdict on I7: the Mirror is a real climax now (REFLECTION 60% of its damage, 48% of kills, honest AT LEAST telegraph), but act 2 had no skill gap (random ≈ commit), the Mirror taxed building (MIDAS faced 330 HP; +8 max HP beat a tier II), tier II was a trap (notier +6.7), act 2 elites +11, F1 stale HUD cadence after CRACKED + 13 other bugs.
Implemented:
- REFLECTION capped at 60% of your max HP (min 3) instead of 20: two from full kill you, HP stops being the only answer.
- Mirror HP = 4 × your machine's TYPICAL spin (per-spin damage capped at 20; Rod, Battery, Overcharge, Blaze counted) + 52.
- GOLD no longer compounds per cell: one multiplier per group = 1 + the levels of its gold cells (a gold-set jackpot was x27; now x7). Holds MIDAS without the Mirror tax.
- Act 2 elites x1.5 HP (act 1 unchanged). Hexer HP x1.05.
- TIER II upgrades EVERY reel carrying that gild, 10 chips; card text is generated from the level you'll really have (set/Ticket/Cactus/Hone aware).
- THORN: its spiked gilds go TIER II at the act transition. VAMP heal capped at 3 per group. Saved chips shield you on Mirror turns too (1 per 8) — the act 2 Cashier says so.
- Bugs: F1 HUD cadence follows CRACKED; F2 Mirror/ability text from live numbers (Hourglass-aware, cap shown); F3 Hexer text; F5 banner widens/shrinks for long maths; F6 bomb callout ('+N BOMBS: BOOM IN 3'); F7 compact recap lists spoils, pick and buys; F9 elite relic renamed TWIN REELS; F10 panel hidden after the fight; F11 footer; F12 Cashier mentions tier II. Optional 'tier2Frame' art hook (hasSprite).
- Tests: 106.
Sim (official, 2000): greedy 17.9% / relic 16.6% / random 11.4%; act 1 clear 45.4%; House 74%; Mirror 59%. Cabinets greedy 16.6–19.9 (knight 17.9, midas 19.1, thorn 16.9, tesla 19.9, joker 16.6). Playtester's it7_skill harness (B1 snapshots, before the +52 bump): commit 50.2 ≥ notier 49.7, tierfirst 50.0, randomDraft 44.6, randomAll 37.0; elite2 − safe2 = −0.7; commit Mirror win 72% (→ flat raised 45→52).
Open: TESLA strongest act 2 cabinet under commit (63.5 vs knight 41.4 on snapshots); KEEN has no act 2 form; HIGH STAKES; legendary picks could be build-aware.

### Iteration 9 — 2026-09-23 (playtest/ITERATION_8.md → Package P: every build meets its match)
Playtest verdict on I8: act 2 finally rewards skill (commit − random +6) and the Mirror is a climax for slow builds, BUT a critical bug gave every TIER II away for free on preview (G1), TESLA +21 / MIDAS +12 over KNIGHT in act 2 (regular fights, not the Mirror), burst builds skipped REFLECTION, the Mirror copying KEEN made KEEN a trap, 13 bugs.
Implemented:
- G1 fixed (previews deep-copy gilds; test that previews never change the run). G2: new cells of a tier II gild come in at tier II.
- NEW CONTENT — act 2 COUNTER-ENEMIES (minDepth 1, on forks): THE GROUNDER drives rods into your bolt cells (with a rod on your payline your special hits shields; EARTH drains 3 energy). THE COUNTERFEITER slaps fake coins on your gilded cells (they pay plain — no tier, no set — for 2 turns; LAUNDER takes 2 chips and heals 6).
- Cabinet act 2 signatures (applied when the House falls, shown on the cabinet card): KNIGHT +6 max HP; THORN spikes tier II +4 max HP; JOKER 2 shields → WILDs on reel 3. TESLA's Rod special 10 (was 12). MIDAS 23 HP. Fragile cabinets (<26 HP) face an 0.85x opener.
- The Mirror: crack gate (the turn it cracks stops at half HP), doesn't copy KEEN (or spikes), HP = 3 × typical-spin power + 45 + 4 per relic you carry. Saved-chip shield at the Mirror capped at +4/turn.
- TIER II = +2 gild levels (GOLD II x4 alone, KEEN II +3, SPIKED II 6, LUCKY II 65%...). Act 2 elites pay +6 chips instead of a relic (elite relics made the Mirror a walkover). JACKPOT BELL also refills your special.
- Readability: G3 run screens take clicks before the TUNE/LOG buttons (LEAVE works); G4 legible COMPLETES SET ribbon (setRibbon art hook); G6 REFLECTION panel hides on presented HP; G7 near-duplicate draft cards deduped; G9 footer; G10 Overcharge/Bell/Key FITS; G11 recap font; G12 chip counter/relic grid off the edge, speed label; G13 dbg.vs('mirror') parity. Act-aware elite text.
- Tests: 115 (9 new in iteration9.test.ts).
Harness (it8_skill, B1 snapshots, commit): act 2 clear 54.0; commit ≥ notier (53.7) ✓; commit − hpfirst +7.5 ✓; commit − random draft +9.3 ✓; elite2 − safe2 −1.5 ✓; cabinet spread 50.0–60.8 (10.8) ✓; Mirror win 65.2%.
Official sim (2000): greedy 18.9% / relic 14.8% / random 13.3%; act 1 clear 45.0 (MIDAS 53.2); House 73%; Mirror 48% greedy (greedy doesn't commit).
Open: art for the counter-enemies in flight; greedy-sim act 2 regular fights are soft (1-2%); legendary offer could be build-aware; HIGH STAKES.

### Iteration 10 — 2026-09-23 (playtest/ITERATION_9.md → Package Q: counters that counter)
Built in a git worktree (branch iter10) so the user's live session on :5173 wasn't reset mid-run.
Playtest verdict on I9: G1 fixed, KEEN set +9.7 (was a trap), crack gate works live, commit − random +8.7 — but GROUNDER/COUNTERFEITER were the two SOFTEST act 2 fights (and softest vs the builds they target), act 2 elites became a trap (−5.8), spread 17, MIDAS/JOKER beat the Mirror without seeing a reflection 20–26%, MIDAS act 1 55.5; bugs H1–H10.
Implemented:
- GROUNDER earths your charge: a grounded bolt on the payline gives no energy (its share of the group is EARTHED, with a callout); plants one more rod; sword 5.
- COUNTERFEITER counterfeits a whole gild: every cell of the hit gild type pays plain for 2 turns (coins fly to visible cells, the rest go grey; callout names the gild); sword 6, HP x1.1.
- The Mirror copies your gilds at PLAIN tier; the crack SNAPS BACK (REFLECTION on its very next turn) → every win has a reflection beat. Act 2 elites x1.3 HP (still +6 chips). MIDAS 22 HP.
- Bugs: H1 long enemy blurbs shrink instead of overprinting HP; H2 Mirror chip shield shows the +4 cap (Cashier, HUD, card); H3 the cabinet's act 2 signature is announced on the legendary screen; H4 Bell text; H5 Mirror footnote; H6 Overcharge echo carries 'grounded'; H8 250 ms input guard on new screens (no accidental buys); H9 recap shows act 2 elite chips; H10 MIDAS/TESLA get act 2 card lines. THORN: +MAX HP cards FIT in act 2.
- Tried and reverted: weighting specials 1.6x in the Mirror's HP (made every cabinet worse, JOKER collapsed). Knob kept at 1 (TUNE.mirrorSpecialWeight).
- Tests: 115.
Harness (it9_skill, N 150, B1 snapshots, commit): act 2 clear 49.2; Mirror 68.9%, reflection ≥1 in 92–100% per cabinet, wins without a reflection 0%; commit − notier −0.4 (tie); commit − hpfirst +6.2 (THORN −15); commit − random +8.0; elite2 − safe2 +0.4; spread 20.9 (TESLA 63.2 high, KNIGHT/JOKER ~43 — per-cabinet SE ~5-6).
Official sim (2000): greedy 18.4% / random 12.9%; act 1 clear 46.1 (MIDAS 46.5 ✓); House 74%; Mirror 47% greedy.
Open: TESLA still strongest in act 2 (Mirror 84% commit); THORN's act 2 is HP; next BIG step recommended by playtest = HIGH STAKES ladder (then a short act 3).
