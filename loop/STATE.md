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

## User direction (2026-09-23 night, after I12)
- NAMING: user-facing text says **Slot Machines** (never cabinets) and **Charms** (never gilds). A FULL SET = the same Charm on all 3 reels. Code identifiers may stay.
- NEXT: finish act 3 balance (Package S from ITERATION_12), THEN build the user's chase features:
  - **BONUS WHEEL**: a gold BONUS symbol (1 per reel, untouchable by charms/relics/strip cards; player machine only). Three on the payline → a full-screen wheel of ~15 upgrades from the draft pool lands on one, free.
  - **RELIC RUSH**: a RELIC symbol (1 per reel). Three → a 5x3 hold-and-spin grid (relic : junk ~1:5 before tuning); relic symbols stick; 3 respins that reset on a new stick; count → relic tier (common / uncommon / legendary; full grid = extra jackpot). Needs relic rarity tiers.
  - Frequency: ~2 BONUS WHEELs and ~1 RELIC RUSH per run on average, via a separate per-spin trigger roll (~1.5% / ~0.8%) that forces the triple onto the payline (natural triples count too). Keep symbols rare on strips so they don't clutter the payline.
  - Rewards are VOUCHERS: a Wheel-of-Fortune-style tile appears bottom-left and pays out on the victory screen — only if you win that fight. The trigger spin gets a free respin so it never costs the player's attack.
  - Watch-only (no input); tune the odds as numbers.

## User direction (2026-09-24 ~00:00, going to bed) — BINDING FOR THIS LOOP
- Build BONUS WHEEL + RELIC RUSH exactly as designed above (vouchers, ~2 wheels + ~1 rush per run, free respin), then BALANCE EVERYTHING (acts 1-3, Dealer, stakes, slot machines, the new bonuses) and FIX BUGS.
- NO OTHER NEW FEATURES. Playtest agents are used ONLY to find bugs and verify balance/feel of what exists — they must NOT propose new features/content (tell them so explicitly).
- Goal: a stable, balanced build the user can HOST for a PUBLIC PLAYTEST. Prep: a public build (dev cheats / TUNE unlock-all hidden), meta progression already persists in localStorage (slot machine unlocks, stakes, act 3, TRUE ENDING, settings) — verify it survives reloads; no mid-run save wanted.
- User is asleep; don't ask questions; full report in the morning.

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
- NEW FEATURE (I10b) — HIGH STAKES: a per-cabinet stake ladder (Balatro-style). Win a run at your best stake to unlock the next one for that cabinet; stakes stack and each adds a RULE: RED act 2 forks always offer the counter to your build; GREEN the Mirror copies one of your relics (Key/Bell/Prism/Hone/Twin Reels/Clover); BLACK the House plays dirty (plants bombs, skims every 3 turns); BLUE act 2 abilities charge 1 turn faster; GOLD every ability does. Cabinet screen has a LOWER/HIGHER stake picker (appears once a stake is unlocked), per-card best-stake chip and 'NEEDS STAKE n'; run HUD shows the stake; the over screen announces unlocks. Prefs persist stakes/stakeSel; 'unlock all (dev)' opens every stake; RESET UNLOCKS clears them. Sweep (it10_stakes, each rule alone, knight greedy): pot+8 HELPED (+0.8, dropped), halved healing -7.4 (too harsh, dropped), mirror relic -1.2, house bombs -1.1, act 2 faster -2.2, all faster -5.4. Ladder (knight greedy, 1500): 17.7 / 18.0 / 16.8 / 15.3 / 12.5 / 10.4. Tests: 119 (iteration10.test.ts).

### Iteration 11 — 2026-09-23 (playtest/ITERATION_10.md → Package R: stakes you can read)
Playtest verdict on I10: Package Q met its targets at N≈800 (spread 13.2, commit−notier +4.1, commit−random +9.4, elite−safe +0.1, 0% Mirror wins without a reflection, MIDAS act 1 45.8); HIGH STAKES fair across cabinets but RED (counter forks) did nothing (and made act 2 repetitive), GREEN was secretly 'the Mirror gets a Skeleton Key', BLACK only hurt slow machines, and the UI hid the rules (K1 stale cadences, K2 invisible copied relic, K3 picker showed one rule).
Implemented (built on branch iter11 in the worktree):
- effectiveAbility(): one helper for Hourglass + stake cadence, used by the Fight AND every card (K1). House card at BLACK says 'skims every 3' and lists its bombs.
- RED = SCARS: every 3rd fight you win leaves a permanent rock, landing reel 3, then 2, then 1 (every 2nd win on your best reel was -8 to -12: reel 1 carries every pair). Counter fork moved to BLUE: ONE act 2 fork (fight 3) is your counter, tagged YOUR COUNTER.
- GREEN = the Mirror copies your LEGENDARY if it can use it (Phoenix/Key/Bell), else your best usable relic; the Mirror card, the fight gutter ('COPIED ...') and the legendary picks ('THE MIRROR WILL COPY THIS' / 'CAN'T USE THIS') all say so (K2).
- BLACK: the House's bombs go 3 per reel and can land on your payline; skim every 3.
- Counterfeiter as a real counter: a faked group pays HALF for 3 turns, and it targets your FULL SET gild first.
- Picker lists every active rule (K3); readable chips with a light rim; locked ladder shown to new players (K12); unlock gets its own row with a chip on the over screen (K6); HUD stake label 2x (K8); act-aware elite text with real % (K4); stake comments (K10); simulateRuns uses a per-run fight-seed stream so stake ladders are paired (K11).
- Tests: 120.
Commit ladder (it10_ladder, N 500, paired): win % by stake 0..5 — knight 22.2/16.4/14.4/13.6/10.8/8.2; midas 20.8/18.6/16.6/16.6/10.6/10.0; thorn 23.4/26.4/23.4/17.6/11.6/9.4; tesla 24.0/17.6/16.8/15.6/11.8/13.4; joker 19.6/14.0/12.8/13.8/8.2/9.2. GOLD/WHITE 0.37-0.56. BLUE is the steepest step (-3.5 to -6); some cells are within noise (SE ~1.5-2).
Open: GOLD spread 5.2 (target ≤4); TESLA still top; THORN HP-first; act 3 (THE DEALER) is the next BIG step (sketched in ITERATION_10 §7).

### Iteration 12 — 2026-09-23 (NEW BIG STEP: ACT 3, THE DEALER — a short true ending; ITERATION_10 §7)
- Unlock: win any run at GREEN or higher → from then on, GREEN+ runs continue after the Mirror into ACT 3 (base game and WHITE/RED stay 12 fights). Over screen announces it.
- Structure: full heal + the Cashier (no legendary: the Mirror-copy decision stays GREEN's), then 3 fights (single, fork, single) + THE DEALER. HP [120,140,160]; act 3 enemies get +2 swords and +3 SEVENS per reel. Act 2's own enemies (bomber, vampire, hexer, mimic) return as act 3 veterans.
- New enemies (each writes on your machine in a new way): CARD SHARP marks your cells as dead CARDs that hit you for 2 when they land on your payline (STACKED DECK marks 3); PIT BOSS's gavel confiscates a gild (your full set first) for the fight — sets can break (PENALTY hits 7); CROUPIER rakes your winnings: your groups pay 1 less for a few turns (HOUSE'S TAKE).
- THE DEALER (special slot mechanic): every 3 turns it deals a face-up card, telegraphed a turn ahead in the centre panel: SHUFFLE swaps 3 cells between two of your reels (a live FULL SET is immune — commit builds shrug it off), CUT removes a cell of your commonest symbol from each reel, RAISE doubles its next hit AND your next jackpot. It can't be taken below half HP before its first deal; at half HP, HOUSE RULES (deals every 2). Its strip is sevens-heavy (the House's partner); its marked cards carry over. HP = 5 × typical-spin power + 170 (+4/relic). Chip shield works (cap 4).
- Engine: actLength() (5/5/3), runActs(), totalFights(), fightNumber() generalised; sim reports act 3 (reached Dealer, Dealer win, C1-C3 deaths). dbg.vs('dealer'|'sharp'|'pitboss'|'croupier'), dbg.run(seed, cab, stake, act3).
- Sweeps (it12_act3, GREEN stake, greedy): sword-only Dealers were a victory lap (lost 1.3 HP over 26 turns — shields soak 1-damage swords); sevens fixed it. Final: Dealer win 53-70% by cabinet (avg 64%); act 3 regular fights cost ~10 HP each but rarely kill (~0.5-1%) — they grind you down for the Dealer.
- Art (in flight): Dealer/Sharp/Pit Boss/Croupier portraits, card/gavel/rake symbols, deal cards, icons, badges, confiscated overlay, ACT 3 plaque.
- Tests: 128 (8 new in iteration12.test.ts).
Open: act 3 regular fights barely threaten (consider scaling their HP/damage with your power like the bosses); TESLA's Dealer is hardest (53%) because machinePower counts its specials.

### Iteration 13 — 2026-09-24 (playtest/ITERATION_12.md → Package S: the Dealer earns its seat)
Playtest verdict on I12 (report cut by a usage limit but complete): act 3 looks great but the Dealer was a sevens slugfest (deals worth 3.6 pts, 96% of its damage was its own swords/sevens), Dealer 49% commit with a 24-pt spread, act 3 regulars toothless (94% HP into the Dealer); stakes truthful but RED overshot (-5 to -8.5), BLACK did nothing to burst builds, GOLD barely moved; 16 bugs (L1-L16).
Implemented:
- Dealer: strip 6 sevens / 3 swords / 2 shields / 4 cards; HP 7 x typical-spin power + 60 (+4/relic). Deals: SHUFFLE swaps 5 cells (full set still immune); CUT takes a CHARMED cell per reel first (so full sets feel it); RAISE = its next hit AND your next PAYING group x2 (was your next jackpot: paid 25%, now 98%). Deals ignore the Hourglass (L6).
- Act 3 teeth: THE HOUSE DOESN'T COMP (no post-fight heal in act 3); THE DECK REMEMBERS (the Card Sharp's marks, up to 6, are waiting on your reels at the Dealer); Pit Boss AUDIT confiscates a charm every 4 turns then hits 4 (L7); act 3 forks always show a new face.
- Stakes: RED scars every 4th win; BLACK also ignores your chip shield vs the House; GOLD adds bosses +8% HP (+15% was too steep).
- Truth/ceremony: act 3 Cashier text ('THE HOUSE DOESN'T COMP', chips for the DEALER) (L1); SH/TURN in the Dealer HUD (L2); GREEN warning on the act 2 Cashier's legendary shelf (L3); ACT 3 arrival heading + plaque, recap ACT 3 divider (L4); picker '+ ACT 3: THE DEALER (16 FIGHTS)' and a pre-unlock tease (L5); Dealer footnote fits (L8); deal panel two-line captions, RAISED/HOUSE RULES above the panel (L9); Overcharge text (L10); Sharp callout position (L13); dbg.forceWin opens the gate (L14); act3Swords dead code removed (L15); npm run sim prints an ACT 3 Dealer row per slot machine (L16); per-slot-machine TRUE ENDING frame on the pick screen (L12, prefs.dealerBeaten).
- Naming (user): 'Slot Machines' not cabinets; 'Charms' not gilds (UI only).
- Tests: 128.
Act 3 harness (it12p_act3, GREEN, commit, N 600): Dealer win 54.5% (knight 53, midas 68, thorn 49, tesla 49, joker 57; spread 19), HP into the Dealer 88%, C-fight deaths ~5%, ~3.4 deals per fight, RAISE pays your side 98%. Ladder (it10_ladder, commit, N 500, 12-fight runs): knight 22.2/21.2/18.6/16.8/11.2/8.4; midas 20.8/18.8/15.8/15.0/12.0/10.2; thorn 23.4/25.0/22.2/16.4/11.6/8.2; tesla 24.0/21.8/21.2/19.6/16.8/11.8; joker 19.6/14.8/13.6/14.6/12.4/7.0 (GOLD/WHITE 0.35-0.49).
Open: Dealer spread 19 (MIDAS gold burst); GOLD/WHITE a bit low; NEXT = the user's BONUS WHEEL + RELIC RUSH vouchers (see User direction).

### Iteration 14 — 2026-09-24 overnight (user's BONUS WHEEL + RELIC RUSH, then balance & bugs only)
- BONUS WHEEL & RELIC RUSH built as agreed: 1 BONUS + 1 RELIC chase cell per reel in run fights (never your strips; untouchable by charms/relics/strip cards; kept out of SHUFFLE/CUT/freeze clunks). A hidden per-spin roll (2.0% wheel, 1.0% rush ≈ 2 + 1 per full run) lands the three symbols on the payline, banks a VOUCHER tile bottom-left ('WIN TO CASH'), and the reels spin again for free. Vouchers pay out after a WON fight (lost fight = run over, vouchers gone). Wheel: up to 15 distinct upgrades from the draft pool, spins and lands (charm slices show the symbol wearing the charm). Rush: 5x3 hold-and-spin, 3 start stuck, 3 respins reset by any new stick, stick 7% per empty cell → common 60% / uncommon 30% / legendary 10% (15/15 = GRAND +15 chips); relic tiers common/uncommon/legendary. dbg.bonus('wheel'|'rush').
- IMPORTANT balance finding: normal spins never stop on the chase cells (they scroll by as teases) — letting them land cut damage/spin by a third (1.08 → 0.72) because a 12-cell strip becomes 14.
- Re-balance around the bonuses (they were worth +7 act-1 / +10 full-run pts): act 1 HP [22,28,33,36,39] (+6%), act 2 x1.06, House 80, MIDAS 23 HP; BLACK bombs back to 2 per reel. Dealer kept at 7x power + 60 (commit harness: 60.2% Dealer win; greedy sim reads higher).
- Public build: npm run build → dist/ with no TUNE panel, no debug, no dev unlock/overrides, relative paths (base './'); HOSTING.md explains itch.io/Netlify/GitHub Pages. Meta progression (unlocks, stakes, act 3, TRUE ENDING, settings) already persists in localStorage.
- Tests: 133 (bonus.test.ts).
Numbers (official sim 1500, greedy): knight act1 47.5 / win 25.1, midas 51.7/27.8, thorn 45.2/22.1, tesla 43.8/23.2, joker 44.6/22.5; random knight 33.3/15.4; House 72-84%; Mirror 59-70% (tesla high). Commit harnesses: Dealer 60.2% (52-68 by machine); ladder (commit) knight 28.3/23.5/21.0/18.5/16.8/12.8, GOLD/WHITE 0.35-0.45.

### Iteration 15 — 2026-09-24 overnight (playtest/QA_1.md: bug hunt, no features)
QA verdict: no crashes/soft-locks (133 tests, 300 top-stake act 3 runs with bonuses forced, every screen clicked through), but 3 real bugs before public: B1 double-clicking FIGHT! lands on NEW RUN and abandons the run (also the R key); B2 wheel HEAL/MAX HP were overwritten by the post-fight HP; B3 slime/bombs landed on chase cells. Plus text overlaps, unvalidated saves, bonus frequency ~25% low, dead counter relics in RELIC RUSH.
Fixed:
- B1: NEW RUN / R mid-run needs a second press within 2 s ('SURE? AGAIN').
- B2: vouchers pay after the fight's HP settles. B3: slime and bombs never target chase cells. B11: no bonus roll in the run's final boss fight.
- B4/B5: stake picker '+ ACT 3' on its own row; over-screen unlock text wraps 3 lines and the table moves down. B6: prefs sanitised on load (valid slot machine ids, KNIGHT always unlocked, speed 1/2/4, stakes clamped 0-5, booleans coerced). B7: TESLA/JOKER unlock text 'BEAT THE HOUSE…'. B8: title '12 FIGHTS, 2 BOSSES'. B9: elite line. B10: SH/TURN placed after the chip count. B12: recap lists bonus prizes. B13: OOZE total ignores chase cells. B14: GRAND shows its chips.
- Tuning: BONUS 2.8% wheel / 1.2% rush (won runs: 1.5-2.0 wheels, 0.85-1.2 rushes); RELIC RUSH common pool drops the 4 counter relics, no High Roller after act 1; act 1 HP [23,29,34,37,40]; JOKER 28 HP, TESLA 26 HP.
Numbers: official sim greedy act1 knight 47.2 / midas 52.1 / thorn 45.5 / tesla 42.3 (before +1 HP) / joker 51.8; full win 23-28%; ladder knight 26.1/23.1/21.3/16.9/12.6/10.0. Commit harness Dealer 62.7% (knight 54, midas 71, thorn 64, tesla 62, joker 62).
Open: MIDAS's Dealer is the easiest (71%).

### Iteration 16 — 2026-09-24 (playtest/QA_2.md fixes)
- B17: a confirming NEW RUN press within 0.4 s of arming is ignored (a spammed FIGHT! can't abandon). B21: label 'SURE?'.
- B16: RELIC RUSH never pays High Roller once the House is down. B18: 'NO RELIC LEFT FOR YOU: +N CHIPS'. B19: R does nothing on between-fight screens mid-run.
- B20: over-screen recap cut at 34 chars. B22: HUD stake label 1.5x at y 74. B4: shorter BLACK rule. B9: Dealer footnote shortened, VOUCHER n OF m moved top-right, charm titles >10 chars at 2x.

### Iteration 17 — 2026-09-24 (user request: the public playtest shell — no loop, just build + test)
User direction (binding): name 'Slots vs. Slots' (tentative). Loading screen + start menu with art; NEW RUN, optional TUTORIAL (guided first fight), COLLECTION log (discovered charms/relics, grey mystery tiles otherwise), personal HISCORES (build, killer or victory, stake). Stakes unlock one tier at a time per slot machine by winning the full run (incl. act 3 when on). No full-screen white flash (seizure safety). Dev tools hidden. Clean up the repo. GitHub Pages workflow (the user pushes). Each slot machine gets a named hero avatar.
- src/ui/menus.ts: LOADING (warms every sprite, CLICK TO PLAY unlocks audio), MAIN MENU (logo, heroes, button icons, collection/runs/best line, RESET SAVE with confirm), COLLECTION (7 charms + 21 relics by tier, hover detail), HISCORES (BEST/RECENT, pages, hero, stake, result + killer portrait, relics, charms with II/set marks, score, date). MENU buttons on the machine picker and run-over screen.
- src/ui/coach.ts + game.ts: TUTORIAL = a KNIGHT run whose first opponent has 75% HP; callouts light up the machine, payline, HUDs, spin controls, first turn, first enemy ability, draft, Cashier and forks, then the run carries on. The fight clock freezes while a callout is open; S skips.
- src/core/profile.ts: profile save 'slotvslot.profile.v1' (found relics/charms, last 60 runs, never dropping a top-10 score), sanitised on load. Score = 100/fight won, +1000 clear, +1000 Dealer, x(1 + 0.5 x stake).
- Heroes: SIR REGINALD (KNIGHT), KING AURUM (MIDAS), BRIAR (THORN), DOC VOLTZ (TESLA), JESTER JAX (JOKER) in the player HUD and on the machine cards.
- Stakes: stakeUnlock() in stakes.ts (tested); the rule was already per-machine + win-at-your-best; with act 3 on, GREEN+ runs are won only by beating the Dealer.
- Photosensitivity: lightning strike has no screen flash; every full-screen flash capped at 0.2 opacity (FLASH_CAP).
- Public build verified: no window.dbg, no TuningPanel, no unlock-all in dist; T does nothing.
- Cleanup: balance harnesses moved to tools/balance (it6-it12p libs, ladder, act 3, bonus rates, QA headless); snap server to tools/; ~140 old scratch scripts, outputs and 115 MB of snapshots deleted; playtest/ keeps the reports. README/HOSTING rewritten; .github/workflows/deploy.yml builds, tests and deploys to Pages.
- Art (agent): logo, menuBackdrop, 4 menu icons, mysterySlot, hsSkull, trophySmall, coinSpin0-3, tutorialPointer, heroKnight/Midas/Thorn/Tesla/Joker.
- Tests: 140.

### Iteration 18 — 2026-09-24 (user: relics POP when they activate)
- Engine: new 'relic' event (Battery + Lightning Rod on turn 1, Jackpot Bell refill, Midas energy, High Roller pair steal, Pickaxe, Cactus, Overcharge echo, Hourglass when an enemy ability fires); pay-changing relics (Skeleton Key, Jackpot Bell, Prism, Hone, Twin Reels, Golden Ticket) are listed on the spin's score (score.relics); Clover/Mittens/Lockpick/Mousetrap/Phoenix/Fang ride on their existing events.
- HUD: the relic's icon grows, hops, wiggles and flashes gold with a coin blip, and its name pops in the RELICS header row (stacked if several fire). Relic column geometry moved to layout.ts (relicSlot).
- Tests: 141.

### Iteration 19 — 2026-09-24 (user: make it look decent on mobile)
- Portrait phones get a TURN YOUR PHONE SIDEWAYS screen (CSS, coarse pointer + portrait). Landscape fits the visual viewport (URL bars) and re-fits on rotation.
- First tap on a touch device requests fullscreen + landscape lock where supported (Android Chrome; iPhone Safari just fits).
- No pinch/double-tap zoom, pull-to-refresh, text selection, tap flashes or long-press menus over the game.
- Touch has no hover: a tap now hovers first, so relic tooltips and COLLECTION tiles read on tap. Tutorial has a real SKIP TUTORIAL button; TAP TO PLAY on touch.
- Checked at 375x812 (rotate prompt) and 844x390 (menu, fight, draft all fit and read).

### Iteration 20 — 2026-09-24 (user: no FITS tags or stat deltas on upgrades)
- User direction (binding): players should use their own intuition. Removed the green FITS ribbon and the per-spin stat lines (e.g. 'ENERGY 1.67 TO 2.30') from draft cards and Cashier items. Kept: card rule text, COMPLETES SET ribbon, set pips, LEGENDARY and Mirror-copy notes.

### Iteration 21 — 2026-09-24 (user: FULL SET only on the payline)
User direction (binding): a FULL SET is ONLY the same charm on all 3 PAYLINE cells (2 with the Golden Ticket). Singles/doubles of charmed symbols pay the symbol + their charm; all three = the full set bonus on top of the three charms.
- Engine: lineSet() reads the live payline (slimed/stolen/jammed/hexed/counterfeit cells don't count); a set adds FULL_SET_STEP = 2 levels to each of its cells (+1 more with the Ticket); BLAZE's set bonus applies when the special fires off a blaze line. Build-wide 'charm on all 3 reels' is now only an enemy-targeting hint (Pit Boss / Counterfeiter). SHUFFLE no longer spares set charms. The FULL SET! banner plays every time.
- Texts: Golden Ticket, tutorial, collection, Dealer footnote, banner lines ('EVERY GOLD CHARM COUNTS 3X' ...), shop ribbon 'SET READY' (charm on all 3 reels = sets possible), hiscore legend '3: ON ALL 3 REELS'. Card text no longer adds a build set level.
- Rebalance (official sim 1500 greedy, before → after): knight 26.3→26.6 (act1 46.6→47.9), midas 28.0→29.1 (50.1→50.1), thorn 23.6→24.2 (44.7→46.1), tesla 22.3→20.0 (43.0→42.4), joker 24.1→25.2 (50.6→54.1). Ladder 26.6/21.8/20.1/15.9/12.6/10.1. Dealer (commit harness) 63.6→64.1 (MIDAS 82 easiest). Knobs: act 1 DEPTH_HP [22,28,33,36,39] (-1), TESLA 27 HP (+1), dealerPower 8 (was 7), dealerFlat 70 (was 60), mirrorFlat 48 (was 45).
- Tests: 141.

### Iteration 22 — 2026-09-25 (user priority fixes; NOT pushed yet)
- YOUR REELS panels (draft, run-over) laid out like the machine: columns 1 2 3, symbols down each column.
- Upgrade cards' reel marker: three side-by-side bars (reels), the target lit.
- Cashier items: long rule text (e.g. LUCKY CLOVER) drops to a smaller font instead of being cut off.
- GREEN and up always include ACT 3 (the Dealer) from the first try; the 'win at GREEN to unlock act 3' step is gone (prefs.act3 is ignored).
- Rename to SLOTS VS. BOTS still tabled.

### Iteration 23 — 2026-09-25 (user: RELIC RUSH juice; BONUS WHEEL collect or pass)
- RELIC RUSH is slower and juicier (~12 s for a big rush, was ~5): each respin ticks fast then slows, relics land one at a time with a scale pop, gold burst, panel shake and rising coin pitch; the RESPINS counter punches gold on a reset / red on a whiff; banners for LAST SPIN!, UNCOMMON!, LEGENDARY!, GRAND!.
- BONUS WHEEL: the prize is held (finishFight(run, fight, holdWheel=true) in the game); the reveal offers PASS or COLLECT. Sims/tests still collect (default). Test added.

### Iteration 24 — 2026-09-27 (Tuesday runbook Step A: quick fixes; user decisions in DIRECTION_NOTES "STOP 1 decisions")
- Preps (MITTENS, LOCKPICK, MOUSETRAP, PICKAXE) removed from relics, drafts, collection, sims and tests (expert review §1.9: bottom 4 relics, 30-45% win). The draft's third slot now offers an any-direction SWAP card (2 cells, e.g. SHIELDS TO SWORDS) 60% of the time, else HP.
- Rat thief: a jackpot of stolen (empty) cells returns EVERY stolen cell (new 'recover' event, RECOVERED xN banner). Slime unchanged.
- Vampire Fang also heals on the Overcharge echo.
- Golden Hourglass: enemy abilities 1 turn slower (was 2; it was the top relic at 76% run win).
- Speeds 1X/2X/4X/8X (keys 1-4); the new 1X is half the old 1X. Prefs migrate old 1/2/4 to 2/4/8 (speedV 2); default 2X (= old 1X).
- New official harness tools/balance/tuesday.ts (greedy sim, per slot machine: WHITE acts 1-2, GREEN act 3 + Dealer, HP into the Dealer, act 3 regular deaths/HP lost/turns). simulateRuns gained hpIntoDealerPct, act3Regular, turnsByAct.
Numbers (tuesday.ts N 1000, before → after): WHITE win avg 24.9 → 26.5 (knight 26.6→28.3, midas 28.9→29.3, thorn 24.3→25.2, tesla 20.8→25.1, joker 23.7→24.6); GREEN win 13.1 → 14.6; Dealer 69.8 → 72.2; HP into Dealer 90.8 → 90.4%. Rebalanced later with the rework.

### Iteration 25 — 2026-09-27 (Step B1: x10 numbers, no rule change — regression gate)
- config.UNIT = 10: symbol base 10 (seven 20), HP, damage, shields, heals, energy, special cost/damage, pot, ability powers (smash, bloodmoon, earth, penalty, launder, reflect), relic constants, chip shield (8 chips = 10 shield), overkill chips per 50. Writer tiers are PAIR_PAY 40 / JACKPOT_PAY 90; slime writes 1 cell per 10 pay. Halves, thirds and HP formulas round to whole tens (unitsUp/Down/Round) so every number matches the old grid.
- Bug caught by the gate: slime's pay was also its cell count (x10 slimed 10 cells); Midas relic energy x10.
Gate (tuesday.ts N 1000): WHITE identical to Step A on every machine (knight 28.3, midas 29.3, thorn 25.0, tesla 25.1, joker 24.6; avg 26.5); GREEN 14.6 (same), Dealer 72.2 → 72.0 (HP halving rounding). Unit tests are rewritten with the charm rework (B2/C) rather than twice.

### Iteration 26 — 2026-09-27 (Tuesday Steps B2 + C + D + E: the rework; user decisions in DIRECTION_NOTES "STOP 1 decisions")
Rules (engine):
- CHARMS ON CELLS: a charm card puts N charms (2 in drafts/wheel, 3 at the Cashier) on PLAIN cells of one named symbol on one reel ("2 GOLD CHARMS · REEL 1 · SWORDS"); only offered if enough plain cells exist. New symbols arrive plain; swaps/removals take plain cells first. Run state stores (reel, symbol, charm, n).
- LEVELS on the TYPE (cap 3): symbols 10 → 13 → 18 (user: small step first, bigger later); charms: gold x2/x3/x4 per cell, keen +5/+10/+15, vamp heal 10/15/20, charged +5/+10/+15, lucky 35/50/65%, blaze +10/+15/+20 per blaze cell. Level cards in drafts (35% of first slots) and at the Cashier (12 chips). Charm level cards need a charm you own (no set gate).
- PAY MATH: group BASE (sum of symbol values + keen/charged) x MULT (double/jackpot x gold, gold ADDS: x2+x2+x2 = x6; relic x2s multiply). 3 gold bolts = 30 x 18 = 540. FULL SETS and TIER II removed; Golden Ticket = every charm one level higher. SPIKED retired (kept for old saves).
- METERS: TESLA keeps the lightning special (cost 40, 60 dmg, pierce). MIDAS: GOLD BAR symbol fills a meter (20); full = next PAYING group x4 (locks; bars while full are wasted). BRIAR: THORN symbol (value 15) banks its pay; being attacked (blocked or not, once per enemy turn, incl. the House's cash-out) fires the bank through shields, then clears. JAX: 2 wilds per reel; each WILD on the payline +20 of 100; full = next spin every payline cell pays as a jackpot of itself. KNIGHT: no meter, FORGED STEEL (6 swords / 6 shields, both at level 2). Every payoff heals (TESLA 20 per strike, MIDAS 20, BRIAR 5 per volley, JAX 30); Fang adds 30.
- Relics re-pointed to "your meter": Battery (starts part-full), Fang (payoff heals more), Overcharge (payoff echoes 1/3), Jackpot Bell (jackpots x2 + fill the meter), Midas relic (gold cells fill the meter). Rod/charged/blaze TESLA-only; Cactus = BRIAR (banking thorns shields you 10%). New BLOOD CHALICE (vamp relic): overheal becomes shield. Meter relics never offered to KNIGHT.
- 3 WILDS: a bonus reel picks one of your jackpot-able symbols (live cells) and the line pays its jackpot.
- Enemies re-targeted per cell: Pit Boss confiscates charmed cells (gold first), Counterfeiter fakes cells (charm dead for 3 turns), Grounder grounds your signature symbol, Dealer CUT still takes charmed cells first, the Mirror copies your charms (not keen) and symbol levels and its hits are capped at 40% of your max HP (it copies gold builds and one-shot you otherwise). Enemy shields pay half (swords can't pierce like the old special did).
- ACT 3: 5 fights (forks like acts 1-2) + the Dealer. Act 3 regulars, the Mirror and the Dealer are sized from MEASURED power: machinePower() now plays 40 turns of your real machine (relics, meter, charms) vs a dummy (90th-percentile capped) instead of a strip-math estimate; per-slot-machine multipliers (BOSS_MUL) equalise how each machine races.
- BIG CHOICES after the House and the Mirror (before the legendary pick): 1 of 3 from a set not seen this run (FORGE: ARMS RACE / MASTERWORK / safe WHETSTONE; MELT: MELT IT DOWN / GILD THE LOT (3 gold per reel) / safe POLISH; SURGERY: CLEAN CUT / TWIN REEL / safe SWEEP UP; DEVIL'S BARGAIN: GLASS CANNON / BLOOD PACT / safe SECOND WIND). GILD THE LOT capped at 3 cells/reel (every-cell gold measured at 1,000-5,000 dmg/turn late).
UI: numbers on payline symbols (value bottom-left, charm tag top-right, pop in as each lands); BASE × MULT = TOTAL built part by part in the DOUBLE!/JACKPOT! banner (red -N for rake/hex cuts; '=' glyph added); per-machine HUD meters (pips / thorn bank number / READY pulse); LIGHTNING STORM for 2+ strikes (one arc, re-forks ~2/s, racing counter, 1.2 s for 2 → max 4 s); 3-wild bonus reel in the gutter; ONE reel table (columns 1 2 3, row per symbol+charm with counts, levels) in the fight panel, draft, Cashier, run over and big-choice screen; charm/level card art; BIG CHOICE screen; shop titles no longer clip; coach/collection/hiscore texts; new sprites goldbar, thorn, relicChalice (+ mini reels on the machine art).
Tests: 150 (tests/tuesday.test.ts covers meters, bonus reel, charm/level cards, big choices, act 3 scaling, Mirror cap). Legacy it6-it12p harnesses moved to tools/balance/legacy (they drove the old set policy).
Balance (tools/balance/tuesday.ts, greedy, N 1500; baseline = Iteration 23 code, N 1000):
- WHITE win: knight 26.6 → 23.3, midas 28.9 → 24.6, thorn 24.3 → 27.0, tesla 20.8 → 25.5, joker 23.7 → 23.5; avg 24.9 → 24.8 (spread 8.1 → 3.7). Act 1 cleared 40.7-54.7 (was 42.7-53.2); House 70-90; Mirror 54-85 (was 55-67). Turns/fight act 1 15.4-19.5 (was 15.2-19.4), act 2 6.4-20.2.
- GREEN win 13.1 → 10.0 (act 3 is now 5 fights: 18-fight runs). Dealer 69.8 → 59.3 (knight 64.8, midas 47.2, thorn 70.2, tesla 57.5, joker 56.9; target 55-60). Act 3 regulars: deaths 0.4-1.1% → 2.7-5.7% per fight, HP lost 6-8% → 6-17%, turns 4.5-8.4 → 7.7-18.9. HP into the Dealer 91% → 70-95% (the Cashier before the Dealer sells a heal; target 70-75 met only by KNIGHT).
- Big choices taken by the greedy drafter (win% of runs that took it): GLASS CANNON 40, CLEAN CUT 33, GILD THE LOT 41, MASTERWORK 40, ARMS RACE 40, MELT IT DOWN 47, SWEEP UP 45; safe picks are rarely taken by greedy (values are heuristics) but win about as often.
Open: MIDAS Dealer 47% and THORN 70% (spread 23, target ≤12); HP into the Dealer high for BRIAR/TESLA/JAX; endless mode (Step F) not started (runbook: later).
- HIGH STAKES ladder (tools/balance/ladder.ts, greedy, N 1000; baseline knight 26.6/21.8/13.8/11.3/8.3/6.2): see tools/out/final_ladder.txt. BLACK's House was 28% for KNIGHT (House HP x1.7 made its cheats stack); fix: 1 cheat bomb per reel (was 2) and at BLACK+ the House uses sqrt of the machine's House multiplier. BLACK House now 46-65% (baseline 54). GREEN+ runs sit lower than before because act 3 is 5 fights with real deaths (expected, expert review §1.11).
- New harness tools/balance/ladder.ts (stake ladder per machine).

### Probe: per-relic / per-charm / per-big-choice (tools/balance/builds.ts 400, GREEN, paired seeds, no gameplay change)
Baseline 9.3% (knight 8.8, midas 9.0, thorn 12.3, tesla 9.0, joker 7.8). Noise is about ±1.5 on the average.
- Start-with-relic (avg win): fang 19.6 (thorn 35.5!), key 16.4, mirror 14.8, ticket 14.4, battery 14.3, phoenix 13.9, bell 13.8,
  bandage 13.6, overcharge 13.2, prism 12.9, clover 12.6, sandglass 12.3, midas 11.9, rod 11.2, chalice 10.8, cactus 10.4,
  crown 9.7, hone 9.7. Outlier: Fang's flat +30 heal fires on every BRIAR thorn volley. Dead weight: crown, hone.
- Only-this-charm: lucky 10.8 (tesla 20.0, midas 2.3), gold 10.0, vamp 9.7, keen 6.6 (below baseline). No charms at all
  (the only-charged/blaze rows on non-TESLA): knight 2.0, midas 4.3, thorn 7.0, joker 15.0 (charms hurt greedy JAX).
- Forced big choice: all within noise (8.9–9.9) except twinReel 11.1 and bloodPact 10.6. Power picks (armsRace, gildLot,
  masterwork) do ~nothing: act 3 and Dealer HP scale with measured machinePower, so damage upgrades get eaten there;
  only healing and survival (fang, bandage, key's burst, secondWind) move the needle.

### Iteration 27 (2026-09-27): partial power scaling, charm/relic buffs and nerfs, big-choice wording
User-approved after the probe above. Changes:
- Late HP sizing: the Mirror, act 3 regulars and the Dealer use `sizingPower` = REF x (power/REF)^0.5 (`TUNE.powerElastic`),
  with REF = the median measured power at that point per machine (`POWER_REF`, from tools/balance/power_ref.ts).
  A build 4x stronger than usual now faces 2x HP, not 4x.
- Charms: keen +5/10/15/20 -> +20/30/40/50; vamp 10/15/20/25 -> 20/30/40/50; lucky 35/50/65/80 -> 40/55/70/85.
- Relics: Fang heals 10 (not 30) on BRIAR's thorn volleys; Hone +20 -> +40; Cactus 10% -> 30%;
  High Roller (crown) now also heals 5 on every double. BRIAR's payoff heal 5 -> 10.
- BOSS_MUL: knight house 1.7->3.3, mirror 0.45->0.7, dealer 0.55->0.75; midas dealer 0.13->0.10; thorn house 1.2->2.4, mirror 3.5->5.
- Wording: GILD THE LOT -> SOLID GOLD; Glass Cannon cost no longer says COMPS.

tuesday.ts 1000 (before -> after):
| machine | WHITE | GREEN | Dealer |
| knight | 23.3 -> 27.5 | -> 11.0 | 64.8 -> 61.5 |
| midas | 24.6 -> 27.1 | -> 10.3 | 47.2 -> 55.7 |
| thorn | 27.0 -> 30.3 | -> 11.5 | 70.2 -> 54.5 |
| tesla | 25.5 -> 27.9 | -> 11.3 | 57.5 -> 55.9 |
| joker | 23.5 -> 25.8 | -> 8.9 | 56.9 -> 61.0 |
| AVG | 24.8 -> 27.7 | 10.0 -> 10.6 | 59.3 -> 57.7 (spread 23 -> 7 pts) |

builds.ts 400 (baseline 10.6): relics fang 18.7 (thorn 19.3, was 35.5), mirror 20.1, bell 19.7, ticket 18.9, key 17.4,
phoenix 15.8, prism 15.4, crown 14.7, bandage 14.7, battery 14.6, sandglass 14.6, overcharge 14.8, clover 14.3, chalice 14.1,
midas 13.6, rod 12.6, cactus 12.2 (thorn 20.0), hone 10.7 (needs keen; greedy rarely has it).
Charms: gold 13.1, vamp 9.4, lucky 8.4, keen 7.5. On raw engine damage keen now matches gold at level 1 (knight 2/reel:
gold 29, keen 33); gold wins in drafts because it fits swords, shields and bolts (3x the card offers) and on levels.
Big choices: still all within noise (8.8-11.4). One late pick doesn't move a run; they need bigger numbers to matter.
Open: WHITE rose ~3 pts (act 1 regulars are easier for knight/thorn after the buffs).

### Iteration 28 (2026-09-27): 20 new/reworked relics, relic pools, starting pick, lucky gating, bug fixes
User-approved (playtest/RELIC_PROPOSALS.md; GRAFT kept for flavour). Changes:
- **18 new relics + 2 reworks.** Machine pools:
  - KNIGHT: drum, chainmail.
  - MIDAS: vault, decree.
  - BRIAR: rosehip, graft, plus cactus.
  - TESLA: faraday, static, plus rod.
  - JAX: capbells, stacked.
  - Charm relics: gold = GOLD LEAF (id `midas`, replaces the Midas relic), keen = EXECUTIONER (id `hone`), vamp = kiss, lucky = horseshoe. Offered once you own the charm or your machine favours it.
  - General: underdog, firstblood, piggy, trophy, holywater, bash.
  - Numbers are in `NEW_RELIC` (relics.ts), at the playtester's tuned values.
- **Pools and slots:**
  - Machine relics are only offered on their machine.
  - One relic card per relic draft (and per set of elite spoils) comes from your identity pool (machine + charm relics) while any are left.
- **Starting pick:** every new run (not the tutorial) offers 1 of 3: up to 2 machine relics plus a general common.
- **Lucky:** only offered to BRIAR, TESLA and JAX.
- **Bug fixes:**
  - Lightning Rod text now reads "YOUR LIGHTNING DEALS 90".
  - The sim's deaths array was too short for GREEN's 18 fights.
  - Hone is off the Mirror's copy list (EXECUTIONER is player-only).
- **Retune:** `regularHp` 0.8 -> 0.95, `act2Hp` 1.45 -> 1.6. BOSS_MUL:
  | machine | house | mirror | dealer | act3 |
  |---|---|---|---|---|
  | knight | 6 | 1.2 | 1.05 | 0.7 |
  | midas | 2.8 | 5 | 1.4 | 0.1 |
  | thorn | 2.8 | 10 | 1.35 | 1.4 |
  | tesla | 1.2 | 2.4 | 0.75 | 0.95 |
  | joker | 2.4 | 1.9 | 1.75 | 1.3 |

**tuesday.ts 2000 (before relics -> after retune):**
| machine | WHITE | GREEN | Dealer |
|---|---|---|---|
| knight | 27.5 -> 26.3 | 11.0 -> 8.8 | 61.5 -> 54.2 |
| midas | 27.1 -> 22.7 | 10.3 -> 8.1 | 55.7 -> 56.6 |
| thorn | 30.3 -> 27.8 | 11.5 -> 10.3 | 54.5 -> 54.0 |
| tesla | 27.9 -> 24.4 | 11.3 -> 9.9 | 55.9 -> 60.9 |
| joker | 25.8 -> 26.0 | 8.9 -> 8.9 | 61.0 -> 60.8 |
| AVG | 27.7 -> 25.4 | 10.6 -> 9.2 | 57.7 -> 57.3 |

- Before the retune, the relics alone gave WHITE 35.1, GREEN 17.0, Dealer 73.9.
- Early act 1 deaths (npm run sim, fights 2 and 3) are now 1–4% on most machines and 8–11% on one row, down from 13–17%.

**builds.ts 400 relics** (probes skip the starting pick; baseline 5.3%): own-machine deltas, noise about ±2.5:
- KNIGHT: drum +2.3, chainmail +1.5.
- MIDAS: vault +1.0, decree +3.3.
- BRIAR: rosehip +4.5, graft +4.5, cactus +7.8.
- TESLA: static +5.5, faraday +2.5, rod +3.0.
- JAX: capbells +1.0, stacked +1.2.
- General: underdog +4.6, firstblood +3.6, holywater +1.8, piggy +2.1.
- Fang is still the strongest common: MIDAS +10, TESLA +13, BRIAR +9.8.

### Iteration 29 (2026-09-28): playtest notes; MIDAS shelved; lineup KNIGHT, TESLA, BRIAR, JAX
User playtest notes and decisions:
- **MIDAS is shelved** until his identity is reworked. The user's reason: a gold-locked special fights the 7-charm draft.
  - Tried first:
    - x4 waits for a pair plus bar stacking: about 1% WHITE.
    - One free spin: 28%, but bosses became trivial.
    - MIDAS TOUCH (the playtester's pick, `playtest/MIDAS_SPECIAL.md`). It is built (meter kind `touch`) and tuned to WHITE 26.8 / Dealer ~50 with heal 30 and BOSS_MUL midas 3.5 / 16 / 0.6. It is kept in code.
  - `ALL_CABINETS` still accepts `midas` in saves and profiles; `CABINET_ORDER` is the playable lineup.
  - Rework idea for later: gold = money (an economy machine).
- **Lineup and unlocks:** KNIGHT; TESLA (REACH THE HOUSE); BRIAR (BEAT THE HOUSE); JAX (BEAT THE HOUSE WITH WILDS).
- **UI:**
  - Meters are a bar with a number ("LIGHTNING 10/40"). BRIAR still shows a number.
  - PAIR replaces DOUBLE everywhere.
  - No second payoff banner over the pay math.
  - JAX's wild picks spin a symbol wheel.
  - No "bank" wording (BRIAR's meter is just THORNS).
  - Relic cards say "match" or "everything", not "group".
- **Relic context:**
  - Charm relics need the charm (no favourite exception).
  - Gold Leaf is retired (`retired: true`, id kept).
  - Graft is gold and vamp only.
  - Overcharge is excluded on BRIAR.
  - Battery, Fang, Overcharge and Bell use each machine's own wording (`relicText`).
  - The Lightning Rod text is clearer.

**tuesday.ts 2000** (4 machines; BOSS_MUL unchanged except thorn dealer 1.8 and tesla dealer 0.8):
| machine | WHITE | GREEN | Dealer |
|---|---|---|---|
| knight | 28.1 | 10.5 | 55.4 |
| tesla | 25.1 | 9.8 | 61.9 |
| thorn | 29.9 | 11.2 | 53.2 |
| joker | 27.9 | 9.4 | 57.3 |
| AVG | 27.8 | 10.2 | 57.0 |

### Iteration 30 (2026-09-29): playtest bugs: Mirror lightning, JAX wheel charms, end-of-turn deaths
- **Mirror lightning:** a copied Jackpot Bell made the Mirror charge a special and strike you. The Mirror now never gains energy.
- **JAX / 3-WILD wheel:** the pick is a symbol AND its charm (gold, keen, vamp or charged), weighted by the cells you own, and the jackpot pays with that charm. The wheel shows one segment per symbol + charm.
- **End-of-turn deaths (user rule):** a machine at 0 HP falls at the END of the turn, so heals, vamp, echoes and after-hit effects resolve first. Phoenix is checked then too.
- **Retune:**
  - `regularHp` 0.95 -> 1.05.
  - BOSS_MUL thorn: house 4.2, mirror 22, dealer 2.2, act3 1.6.
  - BOSS_MUL joker: house 5, mirror 4, dealer 2.6, act3 1.8.

**tuesday.ts 2000:**
| machine | WHITE | GREEN | Dealer |
|---|---|---|---|
| knight | 28.9 | 10.4 | 51.6 |
| tesla | 27.9 | 11.7 | 59.4 |
| thorn | 29.4 | 13.8 | 57.9 |
| joker | 28.7 | 13.1 | 57.6 |
| AVG | 28.8 | 12.3 | 56.7 |

Before the retune (with the new death rule): BRIAR 40.9 and JAX 36.6 WHITE.
- 2026-09-29 follow-up (user): deaths still resolve at the end of the turn, but NO new spin starts once a machine is at 0 HP (e.g. a SHIELD BASH kill at turn start), and nothing hits a machine that already fell this turn (attacks, lightning, thorns). tuesday.ts 1500: WHITE 28.4 / GREEN 12.7 / Dealer 58.2 (unchanged).

### Iteration 31 (2026-09-29): relic audit
- New harnesses:
  - `tools/balance/relic_audit.ts [N]` runs every relic with vs without it (seeded, on a machine and charm it fits), and counts how often the game SHOWS it firing.
  - `relic_audit_run.ts` checks the charm-fit relics (GRAFT, KISS, STACKED) and the after-fight relics (BANDAGE, PIGGY, TROPHY).
- Result: all 33 relics work.
  - **STACKED DECK** never showed: a relic pop is now added when a charmed wild fills double.
  - **WAR DRUM** worked but its buff was invisible on the sword numbers. It now adds +2 to EACH sword per paying spin (max +10 each; was +5 to the whole sword match, max +25). The spin event carries `symBonus.sword` and the payline sword numbers include it.
- tuesday.ts 1500: knight WHITE 27.7 / GREEN 11.1 / Dealer 57.8 (was ~28-29 / ~11 / ~52-58: noise). AVG WHITE 28.2, GREEN 12.8, Dealer 59.4.
- Pacing data for the expert: turns per fight in act 1 are 17.9-24.2; act 2 ranges from 6.8 (JAX) to 24.8 (BRIAR).
- Tests: 170.

## User direction (2026-09-29): BINDING FOR THIS LOOP
1. Implement ALL of playtest/EXPERT_PLAYTEST_2.md section G, small and medium: Mirror fixes, act 1 pacing, offer rules, chips, death recap, catch-up, act 2 scaling to power, late attrition, Dealer rework, KNIGHT's 4th charm.
2. Then run the autonomous loop until the user returns and asks for a full report:
   - the playtester (an expert in roguelikes, slot machines, incentives and fun) plays and says what feels off, and suggests changes;
   - the changes get implemented and measured;
   - repeat.
3. May fold in: the slime 3x3 cleanse, per-charm/per-upgrade win rates, new act 2/3 enemies that write on the machine, Relic Rush slow-mo/particles, hiscore and collection polish.
4. HOLD for the user (write proposals only): endless mode, the MIDAS rework, a chip charm, new machines, the rename, 16-bit.
5. Don't push to GitHub. Commit every iteration and log it here with before/after numbers from `tuesday.ts`.
- **Amendment (user, same day):**
  - Slime stays as it is (no 3x3 cleanse); it's already too slow.
  - Endless mode, the MIDAS rework and new slot machines MAY be built during the loop, once the playtester judges the game is in a good enough spot for them.
  - 16-bit art: never. The rename: later.

### Iteration 32 (2026-09-29): EXPERT_PLAYTEST_2 batch 1 (G1-G5, G10, F1-F6)
- **Mirror:**
  - A whole Mirror turn is capped at REFLECT_CAP (60%) of your max HP (reflection plus attack; it was up to 100%).
  - The countdown updates on the crack.
  - The label is "UP TO"; the preview text is shorter.
- **Act 1:** regulars get TUNE.act1Hp 0.7 and use their ability every 3 turns at most. Quiet turns play at 1.5x (`Clock.boost`).
- **Offers:**
  - Drafts: a pivot card (a charm type you don't own) 50% of the time when you own charms; extend 50% -> 30%.
  - Cashier: slot 2 is a different charm type (60% an unowned one).
  - A reroll never repeats the previous shelf, and shuffles the layout.
- **Catch-up:** after an act 1 win that cost 35%+ of max HP, the draft adds a 4th card that heals 35%.
- **Chips:** start 8 (was 4); overkill chips capped at +3 per fight.
- **Death recap:** the lost fight's row on the run-over screen reads "KILLED BY: SPIN HITS 180 - BOMBS 60 ...".
- **Small fixes:** SWEEP UP at full HP gives max HP instead of a heal; the draft title fades in after the logo is covered.
- tuesday.ts 1500 (before -> after):
  | | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | AVG | 28.2 -> 36.8 | 12.8 -> 9.5 | 59.4 -> 37.6 |

  Act 1 turns p50 are 11-20 (was 15-27). The House now has 28% of deaths and ~80 turns. The Dealer collapsed because the overkill cap removed the late chip stacks that shielded you: re-size the bosses in batch 2.
- The pacing gate is `tools/balance/expert2.ts [N]` (turns per act/depth, bimodality, HP into bosses).

### Iteration 33 (2026-09-29): EXPERT_PLAYTEST_2 batch 2 (G6, G7, G8)
- **Every regular enemy uses its ability at least every 3 turns** (TUNE.act1Every), so the "writes on your machine" hook gets seen.
- **Act 2 regulars are sized to your measured power**, like act 3: TUNE.act2Power 1.6 × BOSS_MUL.act3 × sizingPower('mirror') × depth/archetype/elite, never below their curve.
- **The House: threat instead of HP.** POT seed 8U (was 5), houseCut 2U (was 1), cashEvery 3 (was 4). BOSS_MUL.house: knight 6→2, thorn 4.2→1, tesla 1.2→0.5, joker 5→2.2.
- **Act 3 attrition:** enemy hits grow +6% per enemy turn after the 2nd, up to x2 (TUNE.rampPerTurn / rampMax). Tried on acts 2-3 first: act 2 deaths hit 17-30% per fight, so it's act 3 only.
- **Boss re-size** after the chip cap:
  - mirror: knight 0.9, thorn 16, joker 3;
  - dealer: knight 0.5, thorn 1.1, joker 1.3;
  - act3: knight 0.5, thorn 1.1, joker 0.7.
- `tools/balance/gate.sh [N] [tag]` runs tuesday.ts + expert2.ts together.
- **Gate at 1500:**
  | machine | WHITE | act1 | House | Mirror | GREEN | Dealer |
  |---|---|---|---|---|---|---|
  | knight | 40.1 | 79.7 | 83.9 | 60.0 | 14.7 | 56.8 |
  | tesla | 35.3 | 72.4 | 80.0 | 71.5 | 10.3 | 47.3 |
  | thorn | 33.9 | 72.3 | 75.4 | 59.0 | 11.9 | 50.3 |
  | joker | 37.0 | 72.9 | 95.6 | 61.9 | 9.9 | 41.9 |
  | AVG | 36.6 | | | | 11.7 | 49.1 |

  Deaths by fight: act 1 regulars 12.5%, House 20.2%, act 2 regulars 17%, Mirror 20.7%, act 3 regulars 6.5%, Dealer 9.9%.

  Per regular fight: act 1 deaths 2.6%, act 2 5.7%, act 3 4.7%.

  HP into the Dealer is still ~94% (target 60-75%). The Dealer rework (G9) is next.

### Iteration 34 (2026-09-29): EXPERT_PLAYTEST_2 G9, the Dealer rework, plus act 3 healing
- **The Dealer's deals are now CARD / ALL IN / RAISE** (SHUFFLE and CUT stay in code, unused).
  - **CARD:** a face-up card on one of YOUR payline cells for your next spin. ACE (35%) doubles the group through it, JOKER (25%) makes it wild, DEUCE (40%) makes it empty (pays nothing). At HOUSE RULES: 20/15/65.
    - Events `lineCard` / `lineCardUsed`; the card flips onto your machine with a caption.
  - **ALL IN:** telegraphed (a banner, plus "ALL IN!" over its machine). Its next spin's swords and sevens are replaced by one hit of every sword and seven in its visible 3x3, capped at 45% of your max HP (RAISE still doubles). Events `allInArmed` / `allInHit`.
  - Its marked cards are credited: "THE DEALER'S MARK -20". Its panel shows "MARKS ON YOU: N".
  - A green felt table sits behind its machine. The card texts are updated.
- **Act 3 healing is halved** (TUNE.act3Heal 0.5): "the House doesn't comp".
  - Tried first: bigger act 3 enemies plus +10% attrition (act 3 deaths 11%/fight, HP into the Dealer unchanged), and act 3 enemies spinning first (deaths 7.8%, HP barely moved). Both reverted.
- BOSS_MUL: tesla dealer 0.65; joker dealer 1.15, act3 0.55.
- **tuesday.ts 1500:**
  | machine | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | knight | 40.1 | 13.8 | 55.2 |
  | tesla | 35.3 | 9.0 | 49.8 |
  | thorn | 33.9 | 11.1 | 49.9 |
  | joker | 37.2 | 11.3 | 48.4 |
  | AVG | 36.6 | 11.3 | 50.8 |

  HP into the Dealer: 88% (was 94%; target 60-75% not met, flagged for the playtester). Act 3 deaths 5.9% per fight.
- Tests: 173 (tests/dealer2.test.ts).

### Iteration 35 (2026-09-29): EXPERT_PLAYTEST_2 G11, KNIGHT's 4th charm BULWARK
- The retired 'spiked' charm id is reused as **BULWARK** (KNIGHT only; shields). A bulwark shield also deals 50/75/100/125% of its share of the shield group as damage (by level).
  - Reusing the id keeps saves, the collection and the art valid.
  - `charmName()` shows 'BULWARK' everywhere.
  - It shows in the reel table and the payline tags (tag "50%").
- tuesday.ts 1500: knight WHITE 38.7 / GREEN 11.3 / Dealer 51.8 (was 40.1 / 13.8 / 55.2: noise-ish). AVG 36.3 / 10.7 / 50.0.
- **All of EXPERT_PLAYTEST_2 section G is done:** G1-G12, plus G13's meta drip, which is deferred as a larger design (endless, MIDAS and new machines are gated on the playtester's call).

### Iteration 36 (2026-09-29): EXPERT_PLAYTEST_3 batch E1-E7
- **E1 death recap:** now counts THE POT (House skims), ALL IN, and THE DEALER'S / THE SHARP'S MARK. It's clamped to the HP actually lost and adds "(FROZEN n OF m SPINS)". It's on its own full-width line under the run-over table.
- **E2 one-turn caps:** you never lose more than 40% of max HP in one turn to a regular enemy, 60% to a boss (TUNE.turnCap / bossTurnCap; applied in `damage()` to the player).
- **E3 thaw immunity:** a reel of yours that thawed can't be frozen or jammed on the next enemy turn.
- **E4:** at most 2 marked cells per reel (TUNE.marksPerReel).
- **E5 UI:**
  - the reel table fits a height budget (rows shrink) on the draft/run-over panels and the in-fight strip map;
  - BLOCK labels are centred;
  - relic rows are 8 wide;
  - the elite text is shorter.
- **E6:** catch-up on relic drafts too; the heal is max(35%, missing HP).
- **E7 shop:**
  - slot 2 differs from a LEVEL card's charm too;
  - late shelves are topped up with levels, a 2nd relic, then max HP (never thin).
- **Re-balance** (the caps made the Dealer 71%): BOSS_MUL dealer knight 0.8, tesla 1.45, thorn 2.4, joker 1.5; thorn house 0.85, mirror 13; joker mirror 3.7.
- **tuesday.ts 1500:**
  | machine | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | knight | 39.7 | 13.7 | 51.8 |
  | tesla | 38.5 | 14.0 | 52.8 |
  | thorn | 37.9 | 13.5 | 47.8 |
  | joker | 39.5 | 16.7 | 54.6 |
  | AVG | 38.9 | 14.5 | 51.7 |

  The tightest machine spread yet. Act 3 regular deaths 2-4%.
- Tests: 176 (tests/fairness.test.ts).

### Iteration 37 (2026-09-29): EXPERT_PLAYTEST_3 E8-E11
- **E9 graded act 3:**
  - act 3 regulars start with their ability charged, so it fires on their first turn;
  - their first attack each fight puts a COVER CHARGE of 10% of your max HP through your shield (TUNE.coverCharge; `coverCharge` event).
  - Result: zero-damage act 3 fights 56% → 51%; act 3 deaths 2.9 → 5.3% per fight (the one-turn cap keeps them from being one-shots). Still bimodal: strong builds kill act 3 regulars before they act.
- **E8 Dealer finale:**
  - line cards are ACE 25 / JOKER 20 / DEUCE 55 (HOUSE RULES 15/10/75); a DEUCE aims at your best reel (the most strip value);
  - ALL IN shows "UP TO N" in its banner and over its machine;
  - the laid card is full-cell, face-up and gold-rimmed with "X2 / WILD / ZERO" (marks stay red card backs);
  - MARKS ON YOU is at 2x.
- **E10:**
  - the Dealer deal sublines are at 1.5x in normal text colour;
  - the House pot box says "YOUR JACKPOT TAKES IT";
  - the HUD ability countdown is synced to the engine's starting charge.
- **E11 act 2 pacing per machine:** BOSS_MUL.act2 (thorn 0.55, joker 1.8) scales act 2 regular HP. Act 2 turns p50: knight 14 / tesla 18 / thorn 17 / joker 14 (were 14 / 18 / 30 / 9). Thorn mirror 16 → 10.5 (Mirror 66 → ~40 turns).
- BOSS_MUL dealer knight 0.7, thorn 2.0.
- **tuesday.ts 1500:**
  | machine | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | knight | 39.7 | 12.0 | 49.5 |
  | tesla | 38.5 | 13.5 | 53.8 |
  | thorn | 42.2 | 13.5 | 46.5 |
  | joker | 38.1 | 15.7 | 58.8 |
  | AVG | 39.6 | 13.7 | 52.1 |

### Iteration 38 (2026-09-29): ENDLESS mode (EXPERT_PLAYTEST_3 D/E12), built
- **After a Dealer win:** CASH OUT or LET IT RIDE (`letItRide`; the win is already recorded, and the hiscore entry is updated with loops).
- **A loop** (act 4) is 3 regulars from acts 2-3, plus a boss cycling House → Mirror → Dealer. Full heal per loop; a Cashier after fight 2.
- **Scaling:** enemy HP × ENDLESS.hpBy[machine]^loop (knight 1.35, tesla 1.75, thorn 1.45, joker 1.45); damage × 1.13^loop.
- **Rules:** LAST CALL after enemy turn 40 (+10%/turn, banner); a fight that stalls past 80 turns goes to the House.
- **HOUSE EDGE pick at each loop start** (2 options, one pays +8 chips, one a legendary pick): FAST HANDS, LOADED REELS, HOUSE CUT, IRON BOSSES, EARLY BIRD, GLASS JAW.
- **Numbers:** `fmtNum()` gives 12.4K / 3.1M for the HP bar and damage pops; damage and HP are clamped at 1e12.
- **Hiscores:** "BEAT THE DEALER + N ENDLESS LOOPS"; score +1500 per loop.
- **Gate** (`tools/balance/endless.ts 500`, riders only): loops cleared p50 2 for all four machines, p90 4-5.
- tuesday.ts is unchanged (endless only follows a Dealer win).
- Tests: 179 (tests/endless.test.ts).
- **Last edit before the usage limit** (built, not yet browser-checked): edge cards centred for 2 choices; "HOUSE EDGE: LOOP N" heading; chip / legend icons.
- **NEXT:** browser-check the edge screen, then spawn EXPERT_PLAYTEST_4 (verify endless + the E-batches, what's off now), then continue the loop.

### Iteration 39 (2026-09-30): EXPERT_PLAYTEST_4 E1-E8
- **E1:** the endless cap counts ENEMY turns (80). LAST CALL at enemy turn 25. "THE HOUSE CLOSES IN N" for the last 5 turns. CLOSING TIME banner, credited in the death recap.
- **E2 endless text:**
  - "LOOP N - FIGHT x OF 3" / "LOOP N - BOSS FIGHT";
  - the boss button names its real boss;
  - the loop legend pick has no ACT 2 heading or signature;
  - a "YOUR WIN IS BANKED..." line under LET IT RIDE.
- **E3:** the endless bust screen summarizes: one row per act, one per loop (its boss), then the last 3 fights. The stale stake-unlock line is cleared.
- **E4:** thaw immunity covers the WHOLE machine for the next enemy turn; Frost Imp blizzard and Gremlin jam hit 1 reel.
- **E5:**
  - carried marks respect 2 per reel;
  - deckMarks resets after the Dealer;
  - no duplicate HOUSE EDGEs (no pick once all are taken);
  - the House rules text uses POT.cashEvery;
  - recap entries under 1 UNIT are dropped.
- **E6 loop bosses** are sized from your power: act 3 regular formula × houseHp 4 / mirrorHp 5 / dealerHp 6.
  - The House pot skim × dmgMul.
  - Growth per loop: HP hpBy knight 1.05, tesla 1.5, thorn 1.45, joker 1.28; damage 1.35 (knight 1.18).
  - Loop House 3 → 15 turns. Early loop bosses end by attrition (p90 ≤ ~50 turns up to loop 4).
  - endless.ts: loops cleared p50 knight 1, tesla 2, thorn 2, joker 3; p90 4-7.
- **E7:** the Dealer's un-announced turns are capped at 35% of max HP (TUNE.dealerQuietCap); only ALL IN / RAISE turns reach 60%. BOSS_MUL dealer: knight 0.85, tesla 2.0, thorn 2.4, joker 1.85.
- **E8:** marks draw the new red `cardBack` sprite (art agent).
- **tuesday.ts 1500 (before the tesla nudge):**
  | machine | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | knight | 42.9 | 14.1 | 51.2 |
  | tesla | 42.8 | 16.5 | 61.3 |
  | thorn | 45.8 | 16.4 | 52.5 |
  | joker | 41.7 | 17.7 | 59.1 |
  | AVG | 43.3 | 16.2 | 56.0 |

  The easier Frost/Gremlin raised WHITE ~39.6 → 43.3.

### Iteration 40 (2026-09-30): EXPERT_PLAYTEST_4 E9-E10, endless decisions
- **HOUSE EDGEs** are real costs: FAST HANDS (abilities -2 turns), MARKED DECK (3 marks carried into every fight), HOUSE CUT (heals halved), HIGH ROLLERS (enemies +30% HP), NO COMPS (a new loop heals only half), GLASS JAW (-10% max HP).
  - 3 are offered, pick 1. The reward is sized to the cost (EDGE_TIER): chips / a relic pick / a legendary pick.
- **RIDE AGAIN:** each cleared loop adds POT_PER_LOOP × loop (1500 × n) to a pot. After every loop boss: CASH OUT (bank the pot + chips × 10; the run ends) or RIDE (bust = half the pot). Then a big-choice set, then the edge (`run.choiceQueue`). Hiscore score adds the banked pot.
- **Chip sink:** endless levels go to 4 (`levelCap`; SYM_VALUE 25 at level 4).
- The sim takes all queued choices (`while`); the policy always rides.
- endless.ts 400: loops cleared p50 knight 1, tesla 2, thorn 2, joker 3; p90 3-6.
- Tests: 180.

### Iteration 41 (2026-09-30): E11 BRIAR bosses, E12 finale gate, ALL IN floor
- **E11:** tried thorn mirror 10.5 → 6.5 (+house 1.05). The Mirror only went 48 → 40 turns, but the win rate went 59 → 71 and WHITE to 52: BRIAR's damage is reactive (thorns need hits), so HP cuts make it easier, not faster. Reverted. Long BRIAR boss fights are accepted as its identity.
- **E12:** "HP into the Dealer" is retired as a target (survivor bias + healing). gate.sh now prints the finale line from `expert4_dealer.ts` (killing blow = ALL IN %, ALL IN HP damage).
- **Fix:** the Dealer's quiet cap resets on your own turn (marks biting after an ALL IN turn could reach 60%).
- **ALL IN:** floor 30% of your max HP, cap 55%.
- **Finale gate (N 250):** killing blow = ALL IN only 10-18% (target 50%); ALL IN HP damage p50 15-24% (shields soak it). **Open**: consider ALL IN piercing shields, or giving the telegraph more weight.
- **tuesday.ts 1000:**
  | machine | WHITE | GREEN | Dealer |
  |---|---|---|---|
  | knight | 43.1 | 14.3 | 52.8 |
  | tesla | 43.9 | 15.0 | 54.7 |
  | thorn | 45.8 | 14.9 | 49.3 |
  | joker | 41.8 | 16.8 | 56.2 |
  | AVG | 43.7 | 15.3 | 53.3 |

### Iteration 42 (2026-09-30): MIDAS returns as the ECONOMY machine (EXPERT_PLAYTEST_4 D)
- **MIDAS is back in the lineup** (CABINET_ORDER: knight, tesla, thorn, joker, midas). Unlock: CLEAR A RUN. 300 HP. Starts with gold swords on reel 1; gold bars on every reel.
- **Meter THE VAULT** (kind 'vault', 10 pips):
  - it starts each fight pre-filled at 1 pip per 2 chips held (never full);
  - +1 pip per gold bar landed;
  - when full, your first paying group is multiplied by 1 + chips/20 (max ×3; "VAULT X2.5"), then it resets to its resting level. The payoff heals.
- **Gold bars pay chips mid-fight:** +1 per bar, +3 on a jackpot, capped at 8 per fight (`midasChips` event; paid on a win).
- **Cashier 20% off for MIDAS.** Core tension: hoard for the vault or spend at the Cashier.
- `machinePower` now sees chips held (it sizes bosses right for the vault).
- **All bosses:** the chip shield is capped at MIRROR_CHIP_SHIELD_CAP (it was uncapped at the House).
- KING'S VAULT stays (a gold-sword relic); ROYAL DECREE is retired (it was a MIDAS TOUCH relic). MIDAS TOUCH code is kept (meter kind 'touch'), unused.
- BOSS_MUL midas: house 3, mirror 8, dealer 3.6, act3 0.35.
- **tuesday.ts 1000:**
  | machine | WHITE | act1 | House | Mirror | GREEN | Dealer |
  |---|---|---|---|---|---|---|
  | midas | 43.6 | 73.8 | 99.3 | 73.5 | 19.2 | 57.0 |
  | AVG (5 machines) | 43.6 | | | | 16.0 | 54.0 |

  **Open:** the MIDAS House at 99% (the vault ×3 plus pot steals trivialise it; raising its HP barely moves it).
- Tests: 179 (MIDAS VAULT test replaces the MIDAS TOUCH / KING'S VAULT-DECREE tests).

### Iteration 43 (2026-09-30): EXPERT_PLAYTEST_5 E1-E5 + E8
- **E1-E3:**
  - the endless bust keeps KILLED BY (the last lost record);
  - MARKED DECK is credited correctly;
  - the LET IT RIDE subline is visible and uses the same font;
  - "1 FIGHT";
  - the pot glow thresholds are ×UNIT (the pot escalates again);
  - "YOUR JACKPOT TAKES IT" sits above the pot box;
  - ALL IN / VAULT float text stays inside frames;
  - edge cards promise only rewards that exist;
  - the vault hits your best paying group (swords first).
- **E4/E5 MIDAS shape:**
  - starts with 16 chips (`startChips`);
  - payoff heal 30 → 20;
  - after a payoff the vault rests at 3/4 of its pre-fill (a full reset made the House a regen engine; a half reset gutted MIDAS: WHITE 9);
  - the House skims 2 chips from MIDAS per cash-out.
- **E8:** boss sizing reads at most 20 chips held.
- New BOSS_MUL knob act1 (per machine, act 1 regular HP). MIDAS: house 3, mirror 2.8, dealer 2.6, act3 0.25, act1 0.55, act2 0.6.
- **tuesday.ts 1500:**
  | machine | WHITE | act1 | House | Mirror | GREEN | Dealer |
  |---|---|---|---|---|---|---|
  | midas | 36.8 | 74.5 | 82.4 | 61.9 | 11.3 | 50.0 |
  | AVG | 42.0 | | | | 14.4 | 52.0 |
- **expert5_midas (WHITE):** greedy 49.7, pure spend 26.3, pure hoard 13.3, keep-30 54.0. Both extremes lose to a middle policy, so there's a real tradeoff. E9 (the vault costs chips) is deferred.
- Tests: 179.
