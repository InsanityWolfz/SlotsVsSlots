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

### Iteration 44 (2026-09-30): EXPERT_PLAYTEST_5 E6, E7, E12
- **E6 (commit 2384d81):** ALL IN pierces shields and comes at most once per 4 enemy turns; the Dealer's quiet cap is 25%.
- **E7, endless loop bosses:**
  - House HP ×4 → ×2.5, but its pot skims ×1.5 (a fast, dangerous race);
  - Mirror HP ×5 → ×4;
  - MIDAS gets its own endless growth: HP 1.3, damage 1.25.
- **E7, edge rewards re-tiered by measured cost:**
  | tier | edges |
  |---|---|
  | chips | frail, fast, nocomps |
  | relic | heal |
  | legend | marked, rollers |
- **E7, the bust score:** half the pot plus your chips ×10 (the card says "YOUR CHIPS ARE SAFE").
- **E12:** the sim cashes out when (HP%·0.8^(L-1)) < L/(L+4), instead of never.
- **expert4_endless 250 (none):**
  - loops cleared p50 4, mean 2.8;
  - House L1 lost 0%, Mirror L2 23.6%, Dealer L3 18% (LAST CALL 23%).
- **endless.ts 300, loops cleared p50:**
  | machine | loops cleared p50 |
  |---|---|
  | KNIGHT | 1 |
  | TESLA | 2 |
  | BRIAR | 2 |
  | JAX | 3 |
  | MIDAS | 1 |
- Regular runs are untouched (every change is endless-only). Tests: 179.

### Iteration 45 (2026-09-30): EXPERT_PLAYTEST_5 E10, FINAL HAND
- The first time the Dealer drops to 1/3 HP (after its first deal), it shows **FINAL HAND!**: its next deals are face up, RAISE → RAISE → ALL IN.
  - The HUD reads "FINAL HAND, THEN: …".
  - After the row, deals go back to random (the ALL IN spacing still applies).
- A test was added in dealer2.test.ts.
- **gate 1000:**
  - WHITE 43.1 / 43.9 / 45.8 / 41.8 / 38.6 (avg 42.6); GREEN avg 14.8;
  - the Dealer wins 52.4 / 62.0 / 46.7 / 55.5 / 53.7 (avg 54.1, before ~52–54);
  - a telegraphed climax with no balance shift.
- Tests: 180.

### Iteration 46 (2026-09-30): EXPERT_PLAYTEST_5 E11, SIDE BETS
- **The table:** before each regular fight, the Cashier's table offers 2 side bets on the next-fight screen.
  - Stakes are 3 / 6 / 12 chips; click again to take the bet back.
  - At a fork, pick the enemy first; then the table opens.
  - No bets at bosses or in the tutorial's first fight.
- **The four bets:**
  | bet | condition |
  |---|---|
  | QUICK HANDS | win by your spin N |
  | CLEAN HANDS | win losing ≤ N HP, or "without a scratch" |
  | HIGH ROLLER | land N jackpots |
  | BIG HIT | N+ damage in one turn |
- **Sizing (src/core/bets.ts + run.ts offerBets):** the fight is rehearsed 12 times on other seeds (deterministic per fight).
  - Each line is picked nearest 55% odds among the winning rehearsals.
  - A line under 42% odds pays ×3, otherwise ×2.
  - No bets if you lose most rehearsals. No odds are shown (no decision hints).
- **Watch-only UI:**
  - a tracker under the VS ("0 OF 1", "5 SPINS LEFT", "30 HP TO SPARE"), then BET WON +N / BUSTED;
  - the result line on the next screen ("SIDE BET WON: +12 CHIPS").
  - `Fight.betTrack` is the engine's tracker; the Director feeds the same `trackEvent` during playback.
- **Measured with the new tools/balance/bets.ts:**
  - odds tuning: at aim 0.45, bets realized only 41% (a 88% return, a hidden tax), so the aim moved to 0.55;
  - an always-bettor at 6 chips has a live bet on 52–77% of regular fights (sits at the ≥60% gate: chips are tight in the main run, since the shop soaks them);
  - bets win 49–57% and return 102–118% of stakes;
  - run win rates (1000 runs, KNIGHT WHITE): 1-chip bets 43.1 → 40.5; 6-chip always-bettor 43.1 → 39.4. That's mostly run divergence (every chip changes the greedy shop), not a tax;
  - a cautious bettor (keeps 10 in reserve) is within ±1.5, except MIDAS −3 (chips on the table don't fill the vault, which is intended).
- Tests: 184 (bets.test.ts). The official sim doesn't bet (unchanged baseline).

### Iteration 47 (2026-09-30): EXPERT_PLAYTEST_6 batch 1 (E1, E2, E12)
- EXPERT_PLAYTEST_6 read:
  - gate 600: WHITE 43.2, GREEN 14.7, Dealer 53.0;
  - bets add tension (73–83% still live in the last 2 spins), but the choice is flat (every policy returns 109–113%);
  - FINAL HAND rarely reaches its ALL IN;
  - the loop-1 House is still free;
  - RIDE vs CASH OUT is solved;
  - recommends moving the Dealer target to ~47 and making the Mirror easier.
- **E1 bet text:**
  - net payouts ("BET WON +6", "BUSTED -6", "SIDE BET WON: +6 CHIPS");
  - QUICK HANDS reads "WIN BY ROUND N" / "N ROUNDS LEFT" (the HUD's word);
  - BIG HIT lines never exceed the enemy's max HP;
  - K formatting for endless lines;
  - the picked stake is a red button with a gold rim and "YOUR BET: N" on the card;
  - a SIDE BETS tutorial tip.
- **E2:** a ×3 pay only for lines under 0.31 rehearsed odds (hard lines realize ~7 points above their rehearsal).
  - `expert6_bets.ts 150`: ×3 returns 106.5% and ×2 returns 106.5% (were 128 / 107).
- **E12:**
  - the ride subline moves below a machine-unlock line (no overlap);
  - edge rewards show a relic voucher / legendary badge (no longer the LUCKY CLOVER).
- Tests: 184.

### Iteration 48 (2026-09-30): EXPERT_PLAYTEST_6 E3, FINAL HAND that arrives
- **FINAL HAND** triggers at 40% of the Dealer's HP (was 1/3).
  - While it plays, the Dealer deals EVERY turn (ability every 1), face up: RAISE, then ALL IN.
  - An ALL IN already armed counts as the row's ALL IN (then it just RAISES).
  - After the row, its old pace returns and the next deal isn't another ALL IN.
- The banner sits mid-machine (off the HP panel), and its subline says what's coming.
- The HUD countdown now syncs its pace from every abilityCharge event (HOUSE RULES / FINAL HAND).
- **`expert6_final.ts 250`:**
  | | before | after |
  |---|---|---|
  | row reached ALL IN | 4–51% | 59–91% (knight 59, tesla 75, thorn 91, joker 88, midas 66) |
  | FINAL HAND fires | | 59–84% |

  FINAL HAND's ALL IN is now the top killing blow for KNIGHT / BRIAR. The rest is overshoot: a big hit takes the Dealer from 45% to dead.
- **gate 1000:**
  - WHITE unchanged (43.1 / 43.9 / 45.8 / 41.8 / 38.6);
  - GREEN 13.6 / 15.9 / 13.2 / 14.8 / 11.1 (avg 13.7);
  - the Dealer wins 50.2 / 58.0 / 43.7 / 49.5 / 48.9 (avg 50.1, was 54.1). That moves toward the playtester's ~47 target (E10).
- Tests: 184.

### Iteration 49 (2026-09-30): EXPERT_PLAYTEST_6 E4, E5, E7, the bet economy
- **E4 stakes 2 / 5 / ALL IN.** ALL IN is every chip you hold, capped at 20 (50 in endless). The button reads "ALL 14" once placed. (Median chips at the table is 8, so 12 was a dead button.)
- **E5:** the table shows "CHIPS N - INTEREST +N", live as you stake. Interest is on the chips you hold after the win, so a stake costs 1 interest per 5 chips: now a visible trade, not a hidden tax.
- **E7 HOT HAND:** each bet won in a row (cap 2) makes the next lines bolder at a fixed pay ×3 / ×4, sized so the return stays ~110%: aim = 1.1 / pay. A bust resets it. The table shows "HOT HAND: N WON IN A ROW".
  - This deviates from the playtester's version: +1 pay at the same odds would return ~165% after one win.
- **`bets.ts 300` (WHITE), always-bet 5:**
  - return 101–113% overall; ×2 102–113%, ×3 100–119%, ×4 97–122%;
  - bet on 65–80% of regular fights.
  - With the HOT_HAND bias at 0.05, the hot lines realized under plan (×4 76–105%), so the bias is 0.
- **Run win rates:**
  | bettor | WHITE shift |
  |---|---|
  | always bets 5 | −4.7 to −12.4 |
  | always ALL IN | −12 to −22 (MIDAS −22) |
  | keeps 10 chips | within ±1.5 (MIDAS −2.6) |

  Chips are worth more to the shop than a fair bet pays back, plus the interest cost. That's the intended risk tradeoff: bets are fair, but gambling the shop budget away loses runs.
- Tests: 185 (ALL IN cap and HOT HAND pay in bets.test.ts).

### Iteration 50 (2026-09-30): EXPERT_PLAYTEST_6 E9, endless House and pot (E6 skipped)
- **E6 (move the table to the Cashier) is skipped.** The Cashier doesn't open before every fight, and bets are already sized on the build you walk in with (the preview comes after the shop). Small gain for a rework.
- **Why the loop House was free:**
  - its pot was flat (seed 8U, cut 2U/turn) against late builds;
  - JAX-style builds steal the pot with a jackpot nearly every spin;
  - the House died in ~11 turns.
- **The loop House now:**
  - pot seed = 30% of your max HP, cut = 15% of max HP per House turn (ENDLESS.potSeed / potCut);
  - cashes every 2 turns (houseEvery);
  - a jackpot takes only a third of the pot (potSteal 0.34);
  - HP share 2.5 → 3.
  - housePot 2.5 was tried: no change, because the House's hits already reach the 60% one-turn boss cap. Reverted to 1.5.
- **The pot:** grows ×1.5 per cleared loop, plus 1500 (`nextPot`: 1500 → 3750 → 7125 → 12187). A bust banks a third (`bustPot`, was half).
  - The RIDE card names both numbers: "THE POT GROWS TO N" / "BUST AND YOU BANK A THIRD OF THE POT: N".
- **The sim's cash-out policy** is EV-based: ride if p·nextPot + (1−p)·bustPot > pot, with p = HP% × 0.8^(L−1).
- **expert4_endless 150:**
  | boss | lost | HP lost p90 |
  |---|---|---|
  | L1 House | 1.0% | 47% (was 0%) |
  | L2 Mirror | 25% | |
  | L3 Dealer | 18% | |
  | L4 House | 3.8% | 21% |

  The House is a real race now, but it rarely kills (the gate's 10–20% deaths isn't reachable without breaking the one-turn cap).
- endless.ts 300: loops cleared p50 knight 1 / tesla 2 / thorn 2 / joker 2 / midas 1, max 4 (the sim now cashes out; it used to ride to 50).
- Tests: 185.

### Iteration 51 (2026-09-30): EXPERT_PLAYTEST_6 E10, benchmark move (the Dealer is the peak)
- The playtester moved the targets:
  - the finale should be the hardest fight;
  - the GREEN Mirror killed 22.2% of runs vs the Dealer 12.6%;
  - the Dealer target is 52 → ~47;
  - WHITE and GREEN stay.
- **Tried:** lowering BOSS_MUL.mirror ~20% on every machine. The WHITE Mirror rose 6–8 points (WHITE +3), but the GREEN Mirror only dropped 22.2 → 20.0. Reverted.
  - The GREEN Mirror's extra wall is the relic it copies.
- **Kept:** TUNE.greenMirror 0.5, so at GREEN+ the Mirror has half HP. WHITE is untouched.
  | greenMirror | Mirror deaths | Dealer deaths |
  |---|---|---|
  | 0.75 | 19.0% | 14.9% |
  | 0.6 | 16.3% | 15.7% |
  | 0.5 | 14.3% | 15.4% |
- The Dealer is levelled per machine: BOSS_MUL.dealer thorn 2.4 → 1.8, midas 2.6 → 2.3, tesla 2.0 → 2.25. More weak BRIAR / MIDAS runs reach it now.
- **gate 1000:**
  | machine | WHITE | GREEN | reachD | Dealer |
  |---|---|---|---|---|
  | knight | 43.1 | 17.5 | 37.5 | 46.7 |
  | tesla | 43.9 | 16.7 | 31.5 | 53.0 |
  | thorn | 45.8 | 18.4 | 40.1 | 45.9 |
  | joker | 41.8 | 16.0 | 31.8 | 50.3 |
  | midas | 38.6 | 12.1 | 25.4 | 47.6 |
  | AVG | 42.6 | 16.1 | | 48.7 |

  The Dealer was 50.1 before. Deaths: Mirror 14.3% < Dealer 15.4%. All the E10 gates pass (GREEN 14–17, Dealer 45–50, Mirror < Dealer).
- Tests: 185.

### Iteration 52 (2026-09-30): EXPERT_PLAYTEST_6 E8, the Dealer's own table
- **The Dealer is the one boss with side bets**, and he has his own two:
  - FOLD HIM EARLY: win before his FINAL HAND (a long shot, ~×4–5);
  - TAKE THE HIT: survive an ALL IN.
- **Sizing:**
  - rehearsed 24× (twice a regular fight); a win is part of every bet;
  - pay ≈ 1.05 / p in half steps from ×1.5 to ×5, with the payout floored to whole chips (`betPayout`);
  - not offered below p 0.12 or above 0.8.
  - At a ×2 floor, a likely Dealer win paid 142% (Dealer fights are bimodal per build: p(win) is ~5% or ~80%).
- **Fix found by the measurement:** a side bet's stake still counts toward the boss chip shield (it's on the table in front of you). Taking it out made the real fight weaker than its rehearsal: KNIGHT TAKE THE HIT returned 62%. It still doesn't fill the MIDAS vault.
- The in-fight tracker has a compact two-line form in the Dealer's gutter, above the deal box.
- **`tools/balance/dealer_bets.ts 300` (GREEN):**
  - TAKE THE HIT: offered 33–86% of Dealer fights, won 30–55%, return 85–119%;
  - FOLD HIM EARLY: offered 0–63% (machines that overshoot 40% rarely see it), return 39–105% (small n);
  - GREEN is identical with and without the bet (the gate: Dealer win ±2).
- Tests: 185 (bets.test.ts covers the new kinds).

### Iteration 53 (2026-09-30): EXPERT_PLAYTEST_6 E11, bet relics
- **Three relics** that change which bet you want (the art agent drew the sprites: relicLoaded, relicMarker, relicHighLimit):
  - **LOADED DICE** (common): every side bet pays ×0.5 more, shown on the card. The playtester's +1× would make every bet ~165%.
  - **MARKER** (common): the first side bet you bust each act (each loop in endless) is refunded. "SIDE BET BUSTED: YOUR MARKER COVERS IT".
  - **HIGH LIMIT** (uncommon): stakes double, 4 / 10 / ALL IN up to 40 (100 in endless).
- BOOKIE (a 3rd bet) was dropped: the table has two card slots.
- The official sim doesn't bet, so it values these at 0.5 (dead picks for it).
- **`bets.ts 300` with LOADED DICE as the start relic** (the start pick is replaced, so baselines are ~30):
  | bettor | returns | run win change |
  |---|---|---|
  | cautious (5, keep 10) | 123–144% | +0.3 to +1.4 (bets rarely) |
  | always 5 | 126–138% | −3 to +6 |
  | always ALL IN | 126–135% | −2 to +8, MIDAS −8 |

  A real build-around for players who bet.
- Tests: 186 (bet relics in bets.test.ts).
- **Follow-up (same iteration):** the gate showed WHITE −3 to −5 on four machines (KNIGHT 43.1 → 39.0, MIDAS 38.6 → 33.8). The bet relics were dead picks crowding relic drafts, the Cashier and Relic Rush for anyone who doesn't bet.
  - Fix: `relicFits` offers the bet relics only once you've placed a side bet this run (`run.betsPlaced`).
  - tuesday.ts 1000 is back to exactly the post-E10 table: WHITE 42.6, GREEN 16.1, Dealer 48.7.
  - The gate.sh BRIAR row read 19.8 / 19.8 in that run: a harness glitch. tuesday.ts alone gave 45.8.

### Iteration 54 (2026-09-30): EXPERT_PLAYTEST_7 batch 1 (E1, E2, E12)
- EXPERT_PLAYTEST_7 read:
  - tuesday 600: WHITE 43.2, GREEN 16.4, Dealer 48.9;
  - the exploit: MARKER + ALL IN was a free roll (147–155% return, +5–10 GREEN on a common);
  - HOT HAND is forced and invisible; the Dealer's table is empty in up to 67% of fights;
  - FINAL HAND is followed by 10–12 quiet turns;
  - MIDAS lags; CLEAN CUT is a trap.
- **E1:** MARKER refunds at most your top fixed stake (5, or 10 with HIGH LIMIT). The card text is updated, and the next screen says "YOUR MARKER COVERS N".
  - `expert7_relics.ts 300 allin` at GREEN, MARKER: return 107–126% (was ~150%).
  - GREEN vs no betting: knight +5.0, tesla +1.3, thorn +3.0, joker +3.0, midas −6.0 (N=300, ±3 noise). The ALL IN policy alone gives −3 to +0.3.
- **E2:** `bets.ts` counts a bet still on the table when a lost fight ends the run (returns were 3–9 points high). `expert7_relics.ts` counted MARKER refunds as the full stake; now it's capped like the game.
- **E12:** the HIGH LIMIT card says it doubles your stakes and so your winnings.
- Tests: 186.

### Iteration 55 (2026-09-30): EXPERT_PLAYTEST_7 E3, E4, E5, the finale
- **Wording correction for iterations 45–53:** the tuesday.ts "Dealer" column is YOUR win rate against the Dealer (GREEN win = reachD × Dealer). Where the log says "the Dealer wins N", read "you beat the Dealer N% of the time". The numbers and the tuning direction were right.
- **E3 FINAL HAND is a phase to the end of the fight:**
  - once it fires, the Dealer deals every turn, and RAISE and ALL IN take turns;
  - each ALL IN after the phase's first hits ×0.8 as hard (FINAL_HAND_FADE; the telegraphed cap shrinks too).
  - The phase made the Dealer much deadlier (you beat him 26–41%), so BOSS_MUL.dealer is ×0.75 on every machine, then knight 0.82 and thorn 1.2.
- **`expert6_final.ts 250`:**
  - turns after FINAL HAND, p50: 4–9 (was 10–12);
  - telegraphed killing blows: knight 48%, tesla 60%, thorn 63%, joker 51%, midas 64%. The gate of 55% is short on KNIGHT / JAX, up from 33–60% quiet.
- **E4:** the Dealer's table is always set. His two bets when fair, topped up with regular kinds; odds are on the rehearsals you won (on all of them if you rarely win). A table of 2 in 100% of Dealer fights (was empty in 14–67%).
- **E5:**
  - the RAISE and ALL IN banners sit mid-machine (off the HP panels);
  - RAISE reads "ITS NEXT HIT X2, YOUR NEXT WIN X2" everywhere;
  - "RAISED!" clears after its raised spin;
  - the deal box counts from the presented pace, like the Dealer's panel;
  - the bet tracker header is larger.
- **tuesday.ts 1000:**
  | machine | WHITE | GREEN | vs the Dealer |
  |---|---|---|---|
  | knight | 43.1 | 17.9 | 47.7 |
  | tesla | 43.9 | 16.1 | 51.1 |
  | thorn | 45.8 | 20.1 | 50.1 |
  | joker | 41.8 | 16.4 | 51.6 |
  | midas | 38.6 | 13.2 | 52.0 |
  | AVG | 42.6 | 16.7 | 50.5 |
- Tests: 186.

### Iteration 56 (2026-09-30): EXPERT_PLAYTEST_7 E6, E7, the table's decision
- **E7:** every regular table is one SAFE BET (×1.5, likely) and one LONG SHOT (×3), on different kinds; a coin flip at ×2 fills in if a kind can't make its line. It replaces two coin flips plus a rare ×3.
  - The choice is now risk appetite: LOADED DICE favours safe, MARKER favours long, and chips vs interest tilts it.
  - The card reads "SAFE BET: PAYS X1.5" / "LONG SHOT: PAYS X3".
- **Aims (`LINES`):**
  - the rehearsals overstate the chosen line (at aims 0.70 / 0.30 they realized 62.7% / 30.9%, returns 94% / 93%);
  - aims moved to safe 0.78 and long 0.34;
  - `expert6_bets.ts 150`: safe 70.1% won, 105.1% return; long 34.1% won, 102.4%.
- **E6 HOT HAND** bolds only the long shot: ×4 after one won bet, ×5 after two, sized at the same return; the safe bet stays ×1.5.
  - Fallbacks: hot long → plain long → coin flip, with a wider band for hot lines so it rarely vanishes.
  - The card says "HOT HAND! PAYS X4" in orange, pulsing; "HOT HAND: N WON IN A ROW" sits under the chips line.
  - `bets.ts 300 5 0 PICK=1` (always the long shot): ×3 95–107%, ×4 94–117%, ×5 90–116% return.
  - Always-long bettors lose −8 to −16 WHITE to variance; always-safe −5 to −10 (bets.ts ignores the shop value of chips).
- `bets.ts` gains PICK (0 = the first bet, the safe one; 1 = the long shot).
- Tests: 186 (the HOT HAND test checks several fights: only the long shot goes hot).

### Iteration 57 (2026-09-30): EXPERT_PLAYTEST_7 E8, E9, E10
- **E8:** a won run's score adds +5 per chip left (CHIP_SCORE; endless already banks chips ×10 in its pot). The hiscores rule line says so.
  - The run-over line adds "N CHIPS (+N SCORE)" and "SIDE BETS W OF N".
  - Sim: chips are 2–9% of a won run's score (gate < 25%).
- **E9:** MIDAS cashes a side bet the moment it's won mid-fight (HIGH ROLLER, BIG HIT, TAKE THE HIT), as gold-bar chips that lift the vault's resting level at once. `Fight.betPaid` stops finishFight paying it twice.
  - The config carries `player.sideBet`.
  - `bets.ts` CAB=midas, always 5: 41.3 → 30.0 (was → 33.0: within noise). The always-bettor penalty is shop starvation, the same on every machine.
- **E10:** the RIDE card names the next loop's boss and your HP: "LOOP 2: THE MIRROR. YOU 212/640 HP. CLEAR IT AND THE POT GROWS TO 3750."
- Tests: 187 (the MIDAS mid-fight bet; the score test includes chips).

### Iteration 58 (2026-09-30): EXPERT_PLAYTEST_7 E11, big choices
- **`builds.ts 300 choices`** forces each pick when its set comes up (GREEN, paired): baseline 9.7 avg.
  - CLEAN CUT 9.4: fine. Its "31% when taken" was a selection effect (the greedy sim takes it in weaker spots). Unchanged.
  - SWEEP UP 10.7: fine. The sim rarely takes it because its value only counts rocks and missing HP. A real player's call.
  - SECOND WIND 6.9 was the real trap: the safe pick in DEVIL'S BARGAIN, against GLASS CANNON (= the baseline's pick).
- **SECOND WIND** is now heal to full, +20% max HP (at least 40) and +1 level to shields.
  - Tried +20% max HP alone: 7.3.
  - With the shield level: 8.3 (knight 8.7, tesla 4.3, thorn 9.0, joker 10.7, midas 9.0). TESLA lives on GLASS CANNON, so its safe pick lags.
- Tests: 187.

### Iteration 59 (2026-09-30): THE DAILY RUN (EXPERT_PLAYTEST_7 section 6, #2)
- **A new main-menu row, "DAILY: <MACHINE>":** one seed and one slot machine per calendar day, the same for everyone (`src/core/daily.ts`: dailyKey, FNV-1a dailySeed, dailyCabinet).
  - It can be a machine you haven't unlocked (a taste of it). Base stake.
- **Its fights are fixed by the day:** `fightConfig` seeds each fight from the run seed, act, depth and loop (normal runs stay random). The bet rehearsals use other seeds, so they don't leak the real fight.
- **One try a day:** `profile.lastDaily` is spent when the run starts (quitting doesn't give it back). The row then shows "DAILY: <score>" or "DAILY: SPENT".
  - The run's hiscore entry carries `daily` (tagged "DAILY MM-DD" in HISCORES).
  - A daily doesn't unlock machines or stakes.
  - The save keeps both fields; junk is dropped by the sanitizer. The save keys are unchanged.
- **The menu** is five rows (NEW RUN, DAILY, TUTORIAL, COLLECTION, HISCORES), each with its own icon; the daily uses the chip sprite.
- The run history already exists: HISCORES → RECENT.
- Tests: 190 (tests/daily.test.ts).

### Iteration 60 (2026-09-30): EXPERT_PLAYTEST_8 batch 1 (E1, E2, E3, E7), the daily finished
- EXPERT_PLAYTEST_8 read:
  - FINAL HAND works: the Dealer is the peak per attempt (takes 49% of runs that reach him; Mirror 27%, House 16%);
  - SAFE vs LONG is a real choice, but LOADED DICE solves it (SAFE 133–143%);
  - ALL IN at the Dealer is dominant;
  - the daily is deterministic but WHITE (it never reaches the Dealer), has no social surface, and the clock can be wound back for retries;
  - it retires the "turns after FINAL HAND ≤ 5" gate.
- **E1:** THE DAILY RUN goes on to the Dealer (runActs = 3 for a daily) at base-stake numbers.
  - Its Mirror is the eased GREEN one (without the copied relic).
  - Its act 3 (the Dealer included) has TUNE.dailyAct3 0.55 HP.
  - `expert8_daily.ts 120 8` (fixed fights, 8 choice variants per day), mean win per day:
    | variant | mean win | days with no winner |
    |---|---|---|
    | act 3 as GREEN | 10.7% | 59 |
    | + eased Mirror | 11.6% | |
    | + dailyAct3 0.7 | 17.7% | |
    | + dailyAct3 0.55 | 22.9% | 36 of 120 (30%, gate 25%: fixed-fight variance) |

    By machine: thorn 28, tesla 12, knight 33, joker 19, midas 20.
- **E2:**
  - the start screen reads "THE DAILY RUN - 09-30" and the fight header "DAILY - ACT 1 FIGHT 1/5";
  - the run-over screen shows a share line, e.g. "SLOTS VS. SLOTS DAILY 09-30 | BRIAR | 2450 | WWWWWB WWWWL", with a COPY RESULT button (clipboard).
- **E3:** the daily key is UTC (friends share a day). A key at or before the newest one played is SPENT (`dailySpent`), so winding the clock back gives no retries.
- **E7:** "FREEZES 1 REEL" (singular); the daily row names the hero ("DAILY: BRIAR").
- Tests: 192 (daily guard, share line, act 3).

### Iteration 61 (2026-09-30): EXPERT_PLAYTEST_8 E4, E8, daily depth
- **E4:** THE DAILY RUN has a HOUSE EDGE of the day (`dailyEdge`, from FAST HANDS / HOUSE CUT / HIGH ROLLERS / GLASS JAW).
  - The menu row reads "DAILY: BRIAR + HOUSE CUT", the start screen "DAILY 09-30: HOUSE CUT", and the share line includes it.
  - `applyDaily(run, key)` in run.ts sets up a daily (the game and the harness share it).
  - fightConfig applies HOUSE EDGEs from endless and the daily alike.
  - MARKED DECK is left out: three marks from fight 1 gave a fresh build 1% daily wins. NO COMPS only works between loops.
- **E8:** a won daily scores +1 per HP left (`hpLeft` on the entry), so winners aren't ranked only by hoarded chips.
- **`expert8_daily.ts 120 8`**, with the edges and dailyAct3 0.55 → 0.45:
  - mean day win 18.0% (edges cost ~5 points);
  - by edge: fast 17, frail 23, rollers 21, heal 12;
  - days with no winner 45/120. The harness's 8 choice variants are mostly random picks, so this is pessimistic for a thinking player; a hard daily is part of its character.
- Tests: 192.

### Iteration 62 (2026-09-30): EXPERT_PLAYTEST_8 E5, E6, E9, E10, the table and the finale
- **E5:** LOADED DICE multiplies side-bet pay ×1.2 (LOADED_MUL; was +0.5, which made the ×1.5 SAFE bet pay 133–143%).
  - `bets.ts 200 5 0 RELIC=loaded`: PICK 0 (safe) 117–131%, PICK 1 (long) 112–125%.
  - SAFE leads by 5–11 points, near the gate of 8.
- **E6:**
  - the deal box's ALL IN card shows FINAL HAND's fade ("ALL IN X0.8", then X0.64; `Fight.allInFade`);
  - the deal box hides once either side's presented HP is 0;
  - the "ALL IN! UP TO N" warning sits below the Dealer's felt (off the panel's countdown line).
- **E9:** at the Dealer, a side bet's stake comes off your chip shield again. ALL IN was strictly dominant there: chips are worthless if you lose, and the stake cost no shield.
- **E10 + the finale guarantee:**
  - a hit that drops the Dealer to 15% (FINAL_HAND_DEEP) opens FINAL HAND on its ALL IN;
  - before his FINAL HAND, no hit takes the Dealer below 15%, like the existing 50% hold before his first deal. A burst one-shot used to skip the climax.
  - `expert6_final.ts 250`: FINAL HAND fires 77–86% on every machine (MIDAS 53 → 77%, KNIGHT 72 → 80%). The rest are fights you lose before it.
  - The burst machines lost more, so BOSS_MUL.dealer is knight 0.82 → 0.74, midas 1.72 → 1.55.
- **tuesday.ts 1000:**
  - WHITE 42.6;
  - GREEN 18.2 / 16.1 / 19.3 / 16.4 / 13.0 (avg 16.6);
  - vs the Dealer 48.5 / 51.1 / 48.1 / 51.6 / 51.2 (avg 50.1).
- Tests: 192.

### Iteration 63 (2026-09-30): EXPERT_PLAYTEST_8 E11, THE GATEKEEPER
- **THE REPO MAN** holds fight 4 of every act (no fork; not in endless).
  - Every 3 turns he repossesses your best cell (a charmed one first: confiscate; otherwise steal), at most 2 a fight.
  - What he holds when he falls leaves your machine as liens (`run.liens`). They come back when the act's boss falls, or pay one off at the Cashier for 3 chips ("PAY OFF A LIEN", a service slot like the heal).
  - He pays a 3-chip bounty. Plain strip (no gavels); HP ×1.3; uses the PIT BOSS portrait for now.
  - Fight 4 (not 3), because BLUE stake's counter fork is act 2 fight 3, and the Cashier then opens before the boss.
- **Tuning (tuesday 1000):**
  | version | WHITE | GREEN |
  |---|---|---|
  | 3 takes, no reward | 37.6 | 14.5 |
  | 2 takes, lien 3 | 38.5 | 15.2 |
  | + elite rewards | 51.5 | 26.2 (reverted) |
  | + 4-chip bounty | 43.1 | 18.3 |
  | + 3-chip bounty (gate.sh) | knight 42.6, tesla 43.1, joker 42.0, midas 34.8 | avg ~16.6 |

  The gate.sh BRIAR row glitched again (19.6/19.6).
- **Was open:** MIDAS WHITE 34.8 (was 38.6); the fight-4 death rate is 2.7% (gate 4–7%); the gatekeeper needs its own portrait (art agent).
- **Tuning finished (2026-10-01):**
  - His strip is sword 6 → 7, so he's a real spike before the boss.
  - New knob: `BOSS_MUL.gate`, the REPO MAN's HP per machine: KNIGHT 1.15, BRIAR 1.4, JOKER 0.85, MIDAS 0.5.
  - MIDAS loses its starting gold swords to him (charmed cells go first), so he's lighter there. BRIAR barely died to him (thorns punish his swords).
  - Harness: `tools/balance/repo_tune.ts [N] key=val` (hp, sword, shield, every, takes, bounty, price, gate.<machine>) prints WHITE/GREEN and the A4/B4 deaths.
  - Tried (repo_tune 600, WHITE avg / A4 deaths avg):
    | variant | WHITE | A4 deaths |
    |---|---|---|
    | first version | 42.7 | 2.8 |
    | liens off (takes 0) | 46.3 | |
    | sword 7 | 42.8 | 4.2 (MIDAS 34.5) |
    | sword 8, shield 4, 1 take | 39.4 | 8.7 |

    MIDAS gate 0.7 → 34.8, 0.5 → 38.3. BRIAR gate 1.8 → A4 10.5% (too much), 1.4 → 5.3%.
  - **Official:**
    - gate.sh 800: death histogram fight 4 = **5.5%** (gate 4–7, was 2.8); fights 10/16 2.6/0.8.
    - tuesday.ts 1000:
      | machine | WHITE | GREEN | vs the Dealer |
      |---|---|---|---|
      | KNIGHT | 43.0 | 17.2 | 46.7 |
      | TESLA | 42.4 | 16.3 | 47.4 |
      | BRIAR | 45.6 | 19.5 | 49.2 |
      | JOKER | 40.0 | 18.5 | 52.0 |
      | MIDAS | 37.6 | 12.9 | 47.6 |
      | **AVG** | **41.7** | **16.9** | **48.6** |

      Pre-gatekeeper: WHITE 42.6, GREEN 16.6. WHITE −0.9 is the gatekeeper's bite, accepted.
  - **Still open:** MIDAS GREEN 12.9 (it was ~13 before him: not his doing).
  - His own portrait `enemyRepoMan` (2026-10-02): navy trucker cap, stubble, hi-vis orange vest, a tow hook on a chain raised in one fist.
- Tests: 193 (tests/gatekeeper.test.ts; map tests updated).

### Iteration 64 (2026-10-02): META LAYERS (user ask: "a public leaderboard, challenges, the daily... so it feels like a real game")
- **Name on first launch** (after the loading click): 3-12 of A-Z, 0-9 and dashes (the pixel font has no `_` or `#`).
  - A DOM input sits over the canvas, so phones get their keyboard.
  - `src/net/identity.ts` hides where the name comes from: the profile today, `globalThis.steam` (persona name / id) in the Steam build, which skips the screen.
- **Leaderboards (Supabase):**
  - `src/net/leaderboard.ts` uses fetch (no SDK) and fails soft (6 s timeout).
  - Boards: `all`, `daily:<day>`, `weekly:<week>`.
  - `supabase/schema.sql`:
    - a name is claimed once per pid (`claim_name` RPC);
    - scores only post under the name your pid owns;
    - one daily score per player;
    - column grants never return a pid;
    - no update or delete.
  - Config: `src/net/config.ts` (paste URL + anon key) or VITE_SUPABASE_* env. Empty = offline: the boards say "NOT OPEN YET" and nothing posts.
  - HISCORES tabs: MY RUNS / TODAY / THIS WEEK / ALL TIME. The run-over line shows "RANK N TODAY/THIS WEEK/ALL TIME".
  - Tested in a browser against a mocked Supabase: name taken/claimed, posts to both boards, rank, board render.
- **CHALLENGES** (`src/core/meta.ts`): 7 fixed twists, each opened by clearing the one before. Each clear earns a title. No unlocks from them (like the daily).
  - `challenges.ts 400` greedy win:
    | challenge | setup | win | plain |
    |---|---|---|---|
    | FAST COMPANY | KNIGHT, FAST HANDS | 32.5 | 41.8 |
    | GLASS JAW | JOKER, GLASS JAW + FAST | 33.5 | |
    | HEAVY HITTERS | TESLA, HIGH ROLLERS | 32.0 | |
    | SHORT STACK | MIDAS, 0 chips | 25.8 | |
    | BAD BLOOD | BRIAR, HOUSE CUT | 14.5 | 50.0 (BRIAR lives on heals) |
    | THE LONG NIGHT | KNIGHT GREEN, HOUSE CUT | 10.8 | |
    | ALL OF IT | MIDAS GREEN, FAST HANDS | 10.0 (600 runs) | |

    Tried for ALL OF IT: rollers+fast 4.3, rollers + 0 chips 2.8.
- **THE WEEKLY CHALLENGE:** an ISO week (UTC) seed, machine and 2 HOUSE EDGES; fights fixed by the week; through the Dealer at daily numbers; unlimited tries, best score counts.
  - Edges are drawn from FAST/ROLLERS/GLASS. Any pair with HOUSE CUT made 3–6% weeks: random-draft mean 9.8% → 14.1% over 12 weeks.
- **ACHIEVEMENTS (34)**, 250 XP each: clears, per-machine and per-stake clears, daily/weekly, challenges, endless, score tiers, liens, collection, a secret one.
- **LEVELS:** XP = run score (+ achievements); level L at 400·L·(L−1). Titles by level (ROOKIE … THE HOUSE) plus one per challenge; you pick which to wear on TROPHIES.
  - Old saves backfill XP and counters from their stored runs.
  - Cosmetic only: no balance impact outside the challenge runs.
- **Main menu:** NEW RUN / DAILY / CHALLENGES / TUTORIAL, then COLLECTION | TROPHIES | HISCORES. A name/level/XP badge sits up top.
- Tests: 206 (tests/meta.test.ts).

### Iteration 65 (2026-10-02): two bug rounds on the REPO MAN + meta layers
- **Round 1:** a code read plus `tools/balance/fuzz.ts 40`: 2400 headless runs over 30 modes (5 machines × WHITE/GREEN/GOLD/daily, 7 challenges, 3 weeklies, endless on).
  - It checks invariants after every fight and run (strip counts, charms ≤ cells, hp ≤ max, chips, liens returned at the act boss) and a save round trip (score, XP, achievements).
  - Fixed:
    - THE REPO MAN drew random adjectives ("MANGY REPO MAN"), so REPOSSESSED could never unlock. He's now THE REPO MAN; the adjective is still drawn, so seeded fights don't change.
    - A cell he strips and then steals is held as both liens (cell first, then charm).
    - RESET SAVE keeps your name and player id (the server still holds the name).
    - A name picked offline that's taken by the time the boards open asks for a new name instead of silently never posting.
    - LET IT RIDE no longer re-posts the daily (the board allows one score per player).
    - Old saves backfill the achievements their stored runs show, once.
  - After the fixes: no invariant breaks, no crashes; REPO MAN beaten in 1970 runs, liens paid in 1147.
- **Round 2:** a Playwright bot played 9 runs through the real UI (mouse clicks on hit boxes, AUTO at 8x; some fights forced to end).
  - Runs: KNIGHT/TESLA/BRIAR WHITE, MIDAS/JOKER GREEN, KNIGHT GOLD, weekly, GLASS JAW, daily (through the Dealer into LET IT RIDE).
  - Every screen was reached (draft, next/bets, shop, bonus, choice, over); no page or console errors.
  - Round 1's two "stuck" runs were bot artifacts: RELIC RUSH runs on the UI clock (8x doesn't speed it up), and the fork + side bet + FIGHT flow was checked separately and works.
  - Phone (844×390, touch): the name box focuses, input is upper-cased, OK lands on the menu.
- Tests: 207.

### Iteration 66 (2026-10-02): EXPERT_PLAYTEST_9 (likes/dislikes → agreed plan → built)
- `playtest/EXPERT_PLAYTEST_9.md`: 11 likes, 12 dislikes. The plan was agreed with the playtester (its AGREED PLAN section).
- **D2, the RESULTS card on the run-over:**
  - XP fills (a click skips), with a LEVEL N! banner and sting;
  - achievement cards (4 + "N MORE");
  - titles, unlocks, new bests;
  - the daily share line with COPY RESULT.
  - Fixed the unlock line hidden under the reels panel, COPY RESULT on the relics, and the off-screen meta line.
  - Tight run-over rows shrink, so the act dividers clear the text.
- **D3, THE REPO MAN:**
  - REPOSSESSED popups ("GONE UNTIL THE BOSS FALLS");
  - liens in YOUR REELS ("HELD BY THE REPO MAN: ..."), on the map ("GIVES BACK N HELD") and on the run-over ("N HELD");
  - acts 1–2 only (act 3 fight 4 is a fork again);
  - first take on his first turn.
  - **Persistence gate** (repo_tune 600): takes kept but liens returned after his fight → WHITE 44.6 vs 41.8 held. Persistence alone costs 2.8 points (gate ≥2), so no dead cells: visibility was the gap.
  - Turn 2 vs turn 1 (e9_repo, no-take %): turn 2 gave KNIGHT 11.8 / TESLA 11.2 / BRIAR 5.0 / JOKER 16.5 / MIDAS 39.3. Turn 1 gives 7.3 / 7.5 / 5.4 / 9.8 / 20.2 (MIDAS at gate 0.8; its other misses are opening bursts).
  - Gate HP: MIDAS 0.5 → 0.8, TESLA 1 → 0.85 (TESLA GREEN 14.3 → 17.6).
- **D6, MIDAS:**
  - 360 HP (was 300); BOSS_MUL mirror 2.8 → 2.2, dealer 1.55 → 1.35, act3 0.25 → 0.2.
  - Its GREEN deaths were spread over the whole run (House 16, Mirror 16, act 3 ~16), so boss knobs alone stalled at ~14. `tools/balance/midas_tune.ts` (MUL=k:v, hp:units).
- **D4, challenges:**
  - ordered by measured difficulty;
  - BAD BLOOD is BRIAR + HIGH ROLLERS + GLASS JAW + FAST HANDS (HOUSE CUT gave 13.7; rollers alone 33; +frail 30);
  - names shown; the first two are open; a clear opens the next two; a cleared one stays open.
- **D5, TROPHIES:**
  - text inline, progress counters;
  - every title shown, with how to earn the locked ones;
  - machine-clear and Dealer achievements on full-numbers runs only (not the daily or weekly);
  - REGULAR achievement → HOUSE REGULAR.
- **D7:** the weekly gets its own main-menu row once you've played a run (TUTORIAL moves to the small row). Weekly pairs: FAST+ROLLERS, FAST+GLASS.
- **D8:**
  - no side bets on act 1 fight 1;
  - CLEAN HANDS is never offered with a limit ≥ your max HP.
- **D1 (boards):**
  - schema caps (daily/weekly ≤ 8,000, all ≤ 60,000), 1 post per player per board per 20 s, a name blocklist (claim_name + the client);
  - ALL TIME = standard runs only; no re-posts from an endless ride.
- **D9 / D12:**
  - the relic grid clears the hero panel;
  - every boss preview's rules at 1.5×;
  - hiscore tags on the hero line;
  - the name box drawn in the pixel font;
  - boss button label size; +1 ROCK; dbg.vs('repo').
- **Official:**
  - tuesday 1000:

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 41.6 | 16.2 |
    | TESLA | 40.9 | 17.6 |
    | BRIAR | 45.7 | 18.7 |
    | JOKER | 41.2 | 18.2 |
    | MIDAS | 41.3 | 16.2 |
    | **AVG** | **42.1** | **17.4** |

    vs the Dealer 51.8 (gates: WHITE 41–45, GREEN 16–19).
  - gate.sh 800: fight-4 deaths 5.0% (gate 4–7).
  - challenges.ts 400: 34.3 / 30.8 / 29.3 / 27.3 / 25.3 / 13.5 / 10.8 (no step >12).
  - Weekly random-draft mean 13.6%. W32 KNIGHT FAST+ROLLERS is 4% at n=80; noisy, watch it.
  - fuzz 30: 1800 runs, no invariant breaks.
- **Not now** (agreed): the stake restructure, pacing (D10), SWEEP UP / RELIC RUSH tiers (D11), run-replay anti-cheat. Cosmetic level unlocks are proposed to the user.
- Tests: 211.

### Iteration 67 (2026-10-03): trims, EXPERT_PLAYTEST_10 (likes/dislikes + charm/relic audit) → agreed plan → built
- **Cosmetic TRIMS** (the user's ask): 9 slot machine frames unlocked by level.
  - The trims: CLASSIC, BRONZE 3, SILVER 5, NEON 8, VELVET 12, EMERALD 16, DIAMOND 20, OBSIDIAN 25, THE HOUSE 30 (shimmers).
  - Each sets the bezel colours and puts a crest on top of your machine in fights; you wear one from TROPHIES; a level-up shows "NEW TRIM" on RESULTS.
  - The art agent drew the 9 crests: one medallion family, a `crest()` helper in build-art.mjs.
- **EXPERT_PLAYTEST_10:** 9 likes, 12 dislikes, and a charm/relic audit (the user's extra scope). AGREED PLAN at the bottom of the report.
  - The playtester's D5 (side bets) was its own error: forks re-show the table after you pick a path.
- **D2 layout:**
  - run-over lines clear both panels; the liens line fits;
  - multi-edge challenge setups list edge names; the MIDAS card rule fits;
  - the REPO MAN preview gives the true timing in 2 lines; tight-row dividers; hiscore rows clear SOUND.
  - `tools/shots/screens.cjs` captures 10 layout screens; run it before a layout change ships.
- **D3:** name screen copy while offline. **D4:** the boss preview names what it gives back.
- **D7:** the catch-up heal replaces a smaller heal card. **D8:** the twist on the fight HUD all run; NEW BEST only after a first try.
- **D6:** 6 weekly setups (incl. broke starts and HOUSE CUT alone), never a challenge's exact setup. **D9:** the daily row uses the machine name.
- **Charms** (builds.ts 300 charms, "only X" vs baseline, GREEN):
  - The sim values BULWARK at 6.5 (it was 0, so no table included it; KNIGHT WHITE fell 41.6 → 36.4 once it was taken).
  - Changes:
    - VAMP heals once per group (stacking was the exploit); values stay 20/30/40.
    - 15/20/30 once-per-group took the whole game's sustain: WHITE 39.2, GREEN 12.9. 25/35/45: +9 again.
    - KEEN +N per sword in its group; BULWARK 100/125/150%; CHARGED +10/15/20.
  - Results:

    | | before | after |
    |---|---|---|
    | only vamp | 21.3 vs 10.9 | 18.9 vs 9.9 (still +9: JOKER 36.7, MIDAS 19.3) |
    | only keen | 7.6 (trap) | 9.4 (≈ baseline) |

    gold 13.5, lucky 13.0, charged/blaze 12.1.
- **Sustain** (so VAMP stops being a heal tax): post-fight heal 25% (was 20%), plus a third of it in act 3 (it had none). Swept with charm_tune.ts.
- **Relics** (e10_relics.ts 120, start holding):
  - JACKPOT BELL on JOKER: ×1.25, keeping the meter fill. Without the fill, JOKER fell to 5.5 GREEN (its balance leans on BELL). Still 65 vs 9: **open**.
  - VAMPIRE FANG on TESLA 10: TESLA 24.2 (was 36.7).
  - LIGHTNING ROD +10 lightning: +30 per charged bolt made TESLA 66% WHITE; +30 capped, 51.5.
  - SHIELD BASH full share: 11.7 avg.
- **New relics:**
  - HOT STREAK (common: after a jackpot, the next spin pays ×2): 14.0;
  - WHETSTONE BELT (KNIGHT: blocked hits sharpen the next sword group, +10 per sword per stack, max 4): KNIGHT 17.5 vs 9.2;
  - TOLL BOOTH (uncommon: +1 chip per lien after each win): 10.5.
  - Art by the art agent.
- **MIDAS:** mirror 1.9, dealer 1.05, act3 0.12, act2 0.55. **BRIAR:** dealer 1.3, act3 1.3, act2 0.6.
- **Official:**
  - tuesday 1000:

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 42.9 | 17.0 |
    | TESLA | 46.9 | 17.0 |
    | BRIAR | 48.8 | 18.8 |
    | JOKER | 42.5 | 17.2 |
    | MIDAS | 39.2 | 14.9 |
    | **AVG** | **44.1** | **17.0** |

    vs the Dealer 49.4.
  - gate.sh: fight-4 deaths **3.3%** (gate 4–7: the bigger heal; open).
  - challenges 400: 36.3 / 32.3 / 33.5 / 31.5 / 28.0 / 10.3 / 6.5.
  - Weekly random-draft mean 20.2% (HOUSE CUT-alone weeks 30%).
  - fuzz 30: 1800 runs, no breaks.
- **Open for round 11:** VAMP +9 (JOKER/MIDAS), BELL on JOKER, MIDAS GREEN 14.9, fight-4 deaths 3.3%, THE LONG NIGHT 6.5, TOLL BOOTH weak. The signature-symbol charms step (agreed next round).
- Tests: 216 (tests/expert10.test.ts).

## Iteration 67b (2026-10-03): relic tooltips, charm levels on show, slimmer charm text (user requests)
- **Relic tooltips everywhere:** hover any relic icon (fight HUD, the Mirror's copy, previews, fork, draft, shop, run over,
  HISCORES runs) for its name + rule (machine-specific text where it exists). The shop now shows the relics you hold.
- **Charm levels in YOUR REELS:** the badge line under every reel table shows each charm type you own (LV1 too) and
  symbols above LV1; **MAX** (orange) at the cap. Level cards say `LV3 MAX` on the title and badge for the last level.
- **No dead level picks:** POLISH / WHETSTONE / MASTERWORK only target types below the cap; with nothing left to level
  POLISH and WHETSTONE become SECOND WIND (draft/shop level cards already skipped maxed types). Test in expert10.
- **Shop/draft charm text slimmed:** `REEL 2 SWORDS: +20 PER SWORD, PIERCES`, `ALL GOLD: X4 PAY, GOLD STACKS`,
  `EVERY SWORD IS WORTH 18` (charmShortText; the collection keeps the long rules).
- tuesday 1000 after: WHITE **44.1** / GREEN **16.9** (was 44.1 / 17.0): no balance change. Tests: 217.

## Iteration 68 (2026-10-03): EXPERT_PLAYTEST_11 built
- **JACKPOT BELL:** it no longer refills JOKER's meter on a payoff spin (natural jackpots still fill it; ×1.25 stays).
- **VAMP:** a one-cell jackpot group heals ×1 (JOKER's payoff cells healed ×3).
- **JOKER boss HP:** dealer 1.39→0.75, act3 0.55→0.35, mirror 3.7→2.8.
- **MIDAS:** dealer 1.05→0.9; new `act3Floor` 0.75 (its act-3 regulars may go under their curve; the act3 knob was floored).
- **REPO MAN `gate` HP:** KNIGHT 1.15→1.3, TESLA 0.85→1.0, BRIAR 1.4→1.55. The fight-4 death gate is restated as **3–6%**.
- **TOLL BOOTH:** +2 chips per held lien per win (`TOLL_PER_LIEN`).
- **Weekly:** never a challenge's machine plus any of its edges; it falls through to the next setup, then the next machine.
  W40 is now JOKER + HOUSE CUT.
- Text: WHETSTONE BELT shortened; the REPO MAN subtitle no longer repeats "UNTIL THE BOSS FALLS".
- **Held:** signature-symbol charms (every blanket rule broke a machine: GOLD on thorns BRIAR 63/36, GOLD on gold bars
  MIDAS 29/8); a content round with one meter-feeding charm per machine instead. SWEEP UP (0.6% of picks) goes with it.
- **Measured (real code):** tuesday 1000:

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 42.9 → 41.3 | 17.0 → 17.6 |
    | TESLA | 46.9 → 47.3 | 17.0 → 16.6 |
    | BRIAR | 48.8 → 47.5 | 18.8 → 20.2 |
    | JOKER | 42.5 → 42.2 | 17.2 → 17.3 |
    | MIDAS | 39.2 → 39.1 | 14.9 → **17.1** |
    | **AVG** | **44.1 → 43.5** | **17.0 → 17.8** |

  - Dealer kill 48.7. Fight-4 deaths **3.8%**.
  - Rows (e11_rows 300, GREEN avg): baseline 10.2, no charms 10.9, only VAMP **16.1** (was 18.9), GOLD 12.9, LUCKY 12.4,
    KEEN 8.7, +BELL 22.9 (JOKER 31.7, was 63.3), +TOLL 14.8 (was 11.5).
  - Challenges 400: 35.5 / 31.8 / 32.5 / 31.5 / 30.8 / 15.3 / **8.8**.
  - Weekly random-draft mean **15.2%** (was 20.2: new setups plus the JOKER/VAMP changes; JOKER + HOUSE CUT is 8%).
  - Fuzz 30: 1800 runs, no breaks.
- **Watch next round:**
  - BRIAR GREEN 20.2 (about 1 SE over; trim its dealer 1.3 if it holds);
  - the weekly mean of 15%;
  - JOKER's Dealer kill 44.7;
  - KNIGHT GREEN still needs VAMP (no-charms 6.3);
  - BRIAR no-charms 22.7 (charms trap).
- Tests: 217.

## Iteration 69 (2026-10-03): EXPERT_PLAYTEST_12 built
- **THORNY** (BRIAR's own charm, act 1, BRIAR only):
  - Goes on a thorn; when it lands on the payline it banks **+50 / 60 / 70** (80 with the Ticket) into your thorns.
  - Pink bramble overlay (enhThorny); a green one vanished on the thorn.
  - The round's prototype read LV4 from the start (an Object.prototype hack also answered the charm level). The real
    +20/30/40 measured 42.1 / 14.6 for BRIAR.
  - BRIAR mirror HP stays at **10.5** (plan #2, mirror 12, cost 4–5 WHITE once the charm was weaker).
- **THE FORGE** isn't offered when every symbol is at the cap (MASTERWORK and ARMS RACE were dead cards).
- **Weekly:** an even pick among the setups allowed for the week's machine. BRIAR's only allowed setup is HOUSE CUT
  (BAD BLOOD uses the other edges), so BRIAR + HOUSE CUT stays about 23% of weeks.
- **SWEEP UP:** its text leads with the heal. **Badges:** text 1.25. **Fight HUD relic tip:** sits under the player panel
  (it covered the HP bar).
- **Measured:** tuesday 1000:

    | machine | WHITE | GREEN | Dealer |
    |---|---|---|---|
    | KNIGHT | 41.7 | 17.5 | 49.7 |
    | TESLA | 47.3 | 16.6 | 48.5 |
    | BRIAR | 47.5 → 48.4 | 20.2 → **17.7** | 41.6 |
    | JOKER | 42.2 | 17.4 | 45.0 |
    | MIDAS | 39.1 | 17.3 | 48.5 |
    | **AVG** | **43.5 → 43.7** | **17.8 → 17.3** | |

  - The GREEN spread is now 16.6–17.7.
  - Fight-4 deaths 3.5%.
  - Rows GREEN: BRIAR baseline 8.3, no charms 20.7 (the GREEN gap holds, as expected), only THORNY 13.7.
  - Challenges 400: 35.5 / 31.8 / 32.3 / 31.5 / 27.8 / 15.3 / 9.5. Weekly mean 15.5%.
  - Fuzz 30: no breaks.
- **Next:** #6, the bot's value for SWEEP UP (a sim change; re-baseline). Watch BRIAR's Dealer kill at 41.6 (the lowest).
- Tests: 221 (tests/expert12.test.ts).

## Iteration 69b (2026-10-03): the bot values SWEEP UP (EXPERT_PLAYTEST_12 #6), then BRIAR's Dealer
- Sim only: `choiceValue.sweepUp` 3 → **6.5** + (1 − HP) × 4 + rocks. Forced, it won 28.6% in THE SURGERY. Its share of
  big choices rose from 0.6% to about 15% (1619 of about 10,600).
- **New baseline** (same game, a better bot): tuesday 1000 WHITE **44.9** / GREEN **18.9**.

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 43.1 | 18.6 |
    | TESLA | 47.9 | 16.4 |
    | BRIAR | 50.3 | 20.2 |
    | JOKER | 43.2 | 19.7 |
    | MIDAS | 39.9 | 19.6 |

- **BRIAR dealer 1.3 → 1.4:** BRIAR GREEN 20.2 → **19.2** (Dealer kill 45.7 → 43.4; 1.5 gave 16.5).
  Baseline after: WHITE 44.9 / GREEN ≈ 18.7.
- **Watch:** BRIAR WHITE 50.3 (the highest); both gates are near their tops with the better bot (WHITE 41–45, GREEN 16–19).

## Iteration 70 (2026-10-04): CONTENT_13 built (new charms and relics), and click-to-skip removed
- **Charms:**
  - **LUCRE** (swords, shields, bolts; every machine but MIDAS): +3 chips when its group pays, max 6/9/12 a fight, on a win.
  - **TRICK** (JOKER): +25/35/50 to the jackpot meter when it lands.
  - **INGOT** (MIDAS, draft cards only): +2/3/4 gold meter pips when it lands.
  - **KEEN** 20/30/40 → **40/50/60** per sword.
- **Relics:**
  - **CHARM BRACELET** (uncommon, once you own a charm): +5% per charm type.
  - **METRONOME** (common): every 3rd spin ×1.5.
  - **SNAKE EYES** (common): an enemy jackpot heals 15.
  - **PIT BOSS** (legendary): the enemy's first jackpot each fight pays as a pair.
  - **TESLA COIL** (TESLA): a bolt above or below the payline charges 5, once a spin.
  - Art by the art agent: 3 overlays and 6 icons.
- **Cut at build:** TAX MAN (retired; it took KING'S VAULT's identity slot: MIDAS 28.0 with it vs 36.3 without).
  LUCRE is off MIDAS (38.7 → 33.7 with it).
- **Knobs:** BRIAR mirror 10.5 → 13.5 and dealer 1.4 → 1.45; MIDAS dealer 0.9 → 0.85.
- **Click (and space) no longer skips fight playback:** spam-clicking skipped every turn. The speed buttons stay.
- Collection: the charm row fits all 11; relics are 16 across (3 rows, clear of the panel).
- **Measured:** tuesday 1000, before the BRIAR knob:

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 43.9 | 17.6 |
    | TESLA | 46.8 | 17.5 |
    | BRIAR | 51.7 → **48.7** (knob) | 20.4 → **17.8** |
    | JOKER | 42.0 | 18.2 |
    | MIDAS | 38.7 | 17.8 |
    | **AVG** | **≈ 44.0** | **≈ 17.8** |

  - Fight-4 deaths 5.0% (gate 3–6).
  - Challenges: 34.0 / 35.5 / 32.8 / 29.5 / 28.8 / 13.0 / 11.3. Weekly 15.5%.
  - Fuzz 30: no breaks.
  - Rows (GREEN): +BRACELET 17.7, +METRONOME 15.5, +SNAKE EYES 17.3, +PIT BOSS 18.5, +COIL 12.9 (baseline 12.7).
- **Open:** the playtester's sim note (the greedy bot spends MIDAS's chip hoard; a 16-chip reserve takes MIDAS to 47.8):
  a sim-only round. Damage charms are taxed by boss sizing and heals aren't.
- Tests: 230 (tests/content13.test.ts).

## Iteration 71 (2026-10-04): the user's notes on CONTENT_13
- **LUCRE is now the CHIP charm** (display name; the id stays `lucre`) and **MIDAS can draft it**. **INGOT removed.**
- **TRICK** 25/35/50 → **30/40/55**. **SNAKE EYES** 15 → **30**.
- **PIT BOSS:** the enemy's first jackpot each fight **doesn't count** (it pays nothing).
- **No "counter" wording:** BLUE stake reads "ACT 2 ABILITIES CHARGE FASTER"; the YOUR COUNTER badge is gone.
- **Measured** (tuesday 1000): WHITE **45.9** / GREEN **19.8**, **over both gate tops** (45 / 19).

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 46.0 | 21.6 |
    | TESLA | 47.9 | 18.7 |
    | BRIAR | 49.5 | 18.5 |
    | JOKER | 46.6 | 19.6 |
    | MIDAS | 39.4 | **20.4** |

  - Rows: +PIT BOSS **23.9** (the strongest relic; BELL was 22), +SNAKE EYES **20.5** (a common), baseline 13.3;
    CHIP 11.9, TRICK 10.4.
  - With the CHIP charm, MIDAS's GREEN went up (17.8 → 20.4).
  - Fight-4 deaths 4.3%. Challenges: 40.0 / 34.5 / 36.3 / 30.0 / 27.5 / 14.5 / 14.0. Fuzz: no breaks.
- **Pending (user):** the GAMBLIN MAN rework (MIDAS), the weekly's seeding, and whether machine-only charms and relics stay.
  Retune the gates after those land.

## Iteration 71b (2026-10-04): the user's answers
- **Machine-only charms and relics stay** (the user withdrew that rule). INGOT stays out: back-to-back INGOTs did nothing.
- Big choices show **no SAFE tag** and no green "safe" glow (one accent for every card).
- **SNAKE EYES 25.** PIT BOSS stays as is (strong and enticing, and it doesn't scale).
- **HIGH ROLLER relic (crown) retired:** a relic that mostly matters against one boss isn't enticing. Its name goes to
  GAMBLIN MAN's bar.
- **The weekly's spins are fresh every try.** Its map, enemies and offers are still the week's, the same for everyone.
  The daily stays fully locked (one try).
- **Measured** (tuesday 1000): WHITE **46.0** / GREEN **19.5**, over both gate tops.

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 46.2 | 20.3 |
    | TESLA | 49.0 | 18.5 |
    | BRIAR | 50.9 | 20.7 |
    | JOKER | 46.0 | 19.4 |
    | MIDAS | 37.9 | 18.4 |

  Fight-4 deaths 4.4%. Challenges: 39.5 / 34.3 / 33.0 / 29.0 / 27.8 / 12.8 / 12.3. Weekly 17.2%. Fuzz: no breaks.
  A global retune is agreed for after the GAMBLIN MAN rework.

## Iteration 72 (2026-10-04): CASH CASSIDY / THE BANKROLL (MIDAS reworked with the user)
- **Names and art:**
  - Hero **CASH CASSIDY**, machine **THE BANKROLL**, blurb "MAKE IT RAIN."
  - The gold bar is now a **CHIP** symbol (the id stays `goldbar`); the VAULT is now the **HIGH ROLLER** bar.
  - The bar shows "N CHIPS XM": the live payoff, 1 + chips/20, max ×3.
  - KING'S VAULT is now **BANK VAULT**. New art by the art agent: chip symbol, hero, machine, vault and 5 relics.
  - The cabinet id stays `midas` (saves, boards).
- **Chips:** 1 per chip symbol (a pair 2, a jackpot 3), no bonus and **no cap**.
- **MAKE IT RAIN!:** a chip jackpot with **5+ chips** hits for chips held **×3** (counted before it costs). The jackpot,
  charms, relics and a full HIGH ROLLER bar multiply it, uncapped. Then it **costs 5 chips**.
  - The user's draft (×2 / 10 chips) measured 20.8 WHITE: the rain cost more than it hit. The user OK'd a lower cost.
- **5 rain relics** (CASSIDY only, as **add-ons**: they don't take the "your relic" slot, which as identity relics
  cost 10 WHITE, like TAX MAN):
  - LOADED CHIPS: gold and vamp fit chips.
  - RAINMAKER: rain costs 2.
  - SLUSH FUND: rain +50 bar.
  - TIP JAR: rain heals 20.
  - LOOSE CHANGE: a chip pair rains for half.
- **Global retune** (this round's buffs had put WHITE at 46):

    | machine | mirror | dealer |
    |---|---|---|
    | KNIGHT | 0.9 → 1.0 | 0.74 → 0.8 |
    | TESLA | 2.4 → 3.0 | — |
    | BRIAR | 13.5 → 20 | 1.45 → 1.55 |
    | JOKER | 3.7 → 3.1 | 0.75 → 0.8 |
    | CASSIDY | — | 0.85 → 1.3 (act3Floor 0.75 → 1) |

- **Measured** (tuesday 1000): WHITE **43.0** / GREEN **18.5**, inside both gates.

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 43.6 | 19.3 |
    | TESLA | 45.8 | 17.6 |
    | BRIAR | 43.2 | 17.6 |
    | JOKER | 43.7 | 17.7 |
    | CASSIDY | 38.9 | 20.4 |

  - Fight-4 deaths 4.3%.
  - Challenges: 37.5 / 31.3 / 32.8 / 31.5 / 24.3 / 17.0 / 11.3. Weekly 19.7%.
  - Fuzz 30: no breaks. Tests: 234 (tests/cassidy.test.ts).
- **Watch:** CASSIDY is the lowest WHITE and the highest GREEN (rain scales with a big late chip pile). The sim bot's
  shop habit (it spends the pile) still undersells him.

## Iteration 72b (2026-10-04): CASH CASSIDY polish (user)
- The machine description has no formulas: "MORE CHIPS, BIGGER PAYS. A CHIP JACKPOT MAKES IT RAIN! 360 HP."
  BANK VAULT reads "AFTER EACH WIN, ONE OF YOUR SWORDS GETS A GOLD CHARM".
- The HIGH ROLLER bar keeps its N/100; "N CHIPS XM" sits on a line under it. The top-left chip counter follows every
  chip mid-fight (chips paid, MAKE IT RAIN, the House's skim, a bet won mid-fight, CHIP charm chips, the Mimic).
- **No 4-gold-sword start; 24 chips (was 16).** CASSIDY 38.9 / 20.4 → 42.1 / 23.8; dealer 1.3 → **1.7**: **42.1 / 18.9**.
- Tests: 234 (three tests that leaned on the gold start now set it themselves). Fuzz 20: no breaks.

## Iteration 73 (2026-10-05): THE MIRROR has its own reels; the act 2 signatures are gone (user)
- **THE MIRROR** no longer copies your machine.
  - Its special symbols did nothing on its side, so sword builds were crushed and the rest breezed through.
  - Its own reels: sword 5, shield 3, **SHARD 3** per reel (new symbol and art).
  - Each shard on its payline throws **a third of your last spin's damage** back; a shard jackpot throws all of it.
    Damage only (user: shield builds deal damage with shields anyway). At least REFLECT_MIN (30).
  - Cracked at half HP, each shard throws **a half**.
  - The timed REFLECTION ability is gone (the shards do it). The 60%-of-your-max-HP turn cap and the GREEN relic
    copy stay.
- **Act 2 signatures axed** (and their lines on the machine cards and the legend screen). Measured on → off:

    | machine | signature | WHITE | GREEN |
    |---|---|---|---|
    | JOKER | wilds | 44.5 → 43.4 | 17.5 → 17.8 |
    | BRIAR | +40 max HP | 43.0 → 44.0 | 17.1 → 15.6 |
    | KNIGHT | +60 max HP | 43.8 → 39.3 | 19.3 → 15.3 |

  TESLA's and MIDAS's were text only. KNIGHT and BRIAR are compensated in the boss knobs.
- **Retune** (Mirror, then Dealer):

    | machine | mirror | dealer |
    |---|---|---|
    | KNIGHT | 1.0 → 1.6 | 0.8 (unchanged) |
    | TESLA | 3.0 → 2.7 | — |
    | BRIAR | 20 → 75 | 1.55 → 2.2 |
    | CASSIDY | 1.9 → 2.5 | 1.7 → 2.1 |

- **Measured** (tuesday 1000): WHITE **43.6** / GREEN **18.2**, the tightest spread yet: WHITE 42.6–44.3, GREEN 17.0–19.5.

    | machine | WHITE | GREEN |
    |---|---|---|
    | KNIGHT | 42.6 | 18.4 |
    | TESLA | 44.3 | 17.0 |
    | BRIAR | 43.4 | 18.0 |
    | JOKER | 44.0 | 18.2 |
    | CASSIDY | 43.7 | 19.5 |

  - Mirror win 55–68%.
  - Fight-4 deaths 4.4%. Challenges: 36.8 / 30.3 / 34.8 / 34.8 / 29.0 / 14.3 / 9.0. Weekly 20.5%.
  - Fuzz 20: no breaks. Tests: 234 (a shard test; the signature test is gone).

## Iteration 73b (2026-10-05): glass-pane shard, explicit shards, on-symbol number audit (user)
- **SHARD** is now a framed pane of glass (art agent).
- **Explicit shards:**
  - The Mirror's HUD says "EACH SHARD: A THIRD OF 117 = 40" after every spin you make (`mirrorCharge` event; before
    your first hit: "EACH SHARD THROWS BACK YOUR LAST HIT").
  - Shard cells show their 40.
  - A shard pair or jackpot's banner reads "2 X 1/3 OF YOUR 117 HIT = 80"; a single shard pops the same line
    (`shardReflect` event).
  - Cracked: "EACH SHARD NOW THROWS BACK HALF YOUR HIT".
- **On-symbol number audit:**
  - CASSIDY's chips show their **MAKE IT RAIN share** (chips held, which ×3 makes the group's base; nothing under
    5 chips), not 10.
  - Shards show their throw-back.
  - Enemy effect symbols show no number (already true).
  - Act 3 attrition and the endless growth were a **hidden** multiplier on enemy hits. They now show on the banner as
    "X1.06 LATE" on scored swords and sevens, so the banner equals the damage (test). Unscored hits (fangs, abilities)
    still scale in hit(). LAST CALL is announced at the enemy's turn start.
- tuesday 1000: WHITE 43.6 (unchanged) / GREEN 17.5 (18.2: whole-HP rounding of LATE). Tests: 236.
