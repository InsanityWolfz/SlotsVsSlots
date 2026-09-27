# Expert review: direction notes, big choices, KNIGHT and competitors (2026-09-27, for Tuesday 2026-09-29)

Reviewer: expert playtester (general-purpose agent, `loop/PLAYTESTER_BRIEF.md` Tuesday tasks).
Inputs: `loop/DIRECTION_NOTES.md`, `loop/TUESDAY_PLAN.md`, `loop/BACKLOG.md`, `loop/STATE.md` I13–I23, the code
(`src/core/*`, read only), and the baselines in `tools/out/baseline.txt` (sim, 1500 runs) and `tools/out/baseline_act3.txt`
(it12p_act3 400, GREEN, commit). `npm test`: 142/142 green. No browser pass in this review, so no new visual bugs are claimed.

Tags: **[AGREE]**, **[PUSHBACK]**, **[CHANGE]** (agree, but change a detail). Sections are split into **bugs**, **balance** and **design**.

---

## 0. Headline

- The direction is right. The charm rework, character meters and readable numbers are the three things this game most
  needs. Of these, readable numbers matter most, because the genre's most common complaint is "I can't see why that paid".
- My main pushbacks:
  1. **Symbol level +1 on base 10 is too small to feel.** Use +3 to +5.
  2. **Removing lightning from 4 slot machines has hidden scope.** The bolts on their strips, 6 relics, the Grounder and the 3-wild payout all depend on it.
  3. **MIDAS ×4 "whatever lands" repeats the RAISE mistake.** Apply it to the next *paying* group.
  4. **Act 3 at 5 fights plus "no comp" will crush the HP you bring into the Dealer** unless the regular fights are tuned together.
  5. **Charm levels gated on "every reel has a gold charm" is a full set under another name.**
- **Preps: remove them.** The full verdict is in §1.9.

---

## 1. Review of DIRECTION_NOTES.md

### 1.1 Charm rework (charms on cells, named-symbol cards, levels, no sets): **[AGREE]**, with 4 changes
- **Why it's right:**
  - Today a charm covers every cell of a symbol on a reel, so a swap card inherits it. That lock-in is real: the charm follows the symbol type.
  - Named cards ("2 GOLD CHARMS · REEL 1 · SWORDS") give full information and cost nothing to read. They also keep the speedrun pace.
  - One charm per cell keeps the reels readable.
  - Full sets needed their own ribbon, pips, banner, Ticket text, set-first enemy targeting and hiscore marks. Removing them deletes a whole layer of rules text.
- **[CHANGE] Charm-level gating.**
  - The note says "Gold Lvl 2 in the shop once every reel has a gold charm". That is the old build-wide set rule again.
  - Gate on **"you own 3+ cells of that charm, on any reels"**, or don't gate at all and let the card be weak when you own few.
- **[CHANGE] Cap levels in acts 1–3 (suggested cap: Lvl 3); uncap them in endless.**
  - Gold is additive per cell, then multiplied by the pair/jackpot multiplier.
  - A gold-Lvl-3 triple (label x4) is 30 × (3 × 12) = 1,080, i.e. ×12 a plain jackpot.
  - For comparison, today's gold full set is x10 and 3 plain gold cells are x4 (`fight.ts:428`: mult = 1 + Σ levels).
  - The new rule makes 3 plain gold cells ×6: stronger than today without a set, weaker than today with one. That's fine, but it needs a cap.
- **[FLAG] Gold stays the only multiplicative charm.**
  - Keen (+5 to base), vamp (heal) and charged (+1) scale linearly. On a keen triple: (30 + 15) × 3 = 135, against 540 for a gold triple.
  - That is exactly the "every build goes gold / MIDAS locks in" gravity the rework wants to kill.
  - Give each other charm **one multiplicative or rule-bending hook through its level or its relic**, e.g.:
    - Keen Lvl 3 pierces shields fully;
    - Vamp Lvl 3 overheal becomes shield (this is the user's overheal idea, now with a home);
    - Lucky Lvl 2 near-miss chance ×2.
  - Then measure the per-charm win rate. The BACKLOG already asks for charm win rates in the sim; add them before B lands, not after.
- **[FLAG] Hidden scope in Step B: enemies and relics that read charms or sets.**
  - Counterfeiter (whole charm type, full set first), Pit Boss (full set first), Hexer ("charms go dark"), the Dealer's CUT (charmed cells first) and the Mirror (copies charms at plain tier) all need re-targeting to per-cell charms.
  - The Golden Ticket needs a new rule. Suggestion: "YOUR CHARM LEVEL CARDS COUNT TWICE".
  - The hiscore charm marks (`II/set`) need a sanitizer path; the save keys are unchanged. Budget for all of this inside B.
- **[OPEN] SPIKED.** If BRIAR's thorn replaces spiked shields, retire the SPIKED charm from pools (thorns cover the fantasy).
  Keep its COLLECTION entry so saved profiles stay valid.

### 1.2 ×10 numbers and the pay display: **[AGREE]** on ×10 and the display; **[PUSHBACK]** on the +1 level step
- ×10 is free balancing room and makes `BASE × MULT = TOTAL` read like a slot machine. Agree.
- **[PUSHBACK] "Swords Lvl 2: 10 → 11" is +10%.**
  - The user's original note was "base 1 → 2" (+100%). At +10%, the card is invisible in play.
  - The no-stat-delta rule is right, but it also means the payoff has to be felt, not read.
  - Recommend **+5 per level (10/15/20)**, or +3 if the sim says +5 is too strong. It's a single knob, so sweep 3/4/5 in the sim.
- **Do the ×10 rescale as its own commit with no rule change.** The sim should reproduce the baseline (×10) almost exactly, which is a clean regression check.
  Watch the rounding where today's code divides: Counterfeiter half pay, the Overcharge 1/3 echo, the Mirror's HP formula.
- **Pay display:** agree.
  - Numbers only on the payline, popping in as each symbol lands, fit the watch-only fantasy. The watcher learns the math by seeing it.
  - Keep `BASE × MULT = TOTAL` to one line. With stacked gold it can reach 4+ digits, so check the pixel-font width at 2x on 844×390.
- **[DESIGN] Gold's per-cell label reads "x2" but gold cells add** (x2 + x2 + x2 = x6).
  - Players will read three x2 tags as ×8. The MULT readout fixes this after the fact.
  - Alternatively, label each gold cell `+x2`. That costs one glyph and tells the truth before the result appears.

### 1.3 Character meters
**Framework (one signature symbol, one meter, one payoff): [AGREE].** It is Balatro's deck identity for machines, and it's
what separates the slot machines. One structural gap first:

- **[PUSHBACK] "Lightning moves to TESLA only" needs a stated rule for the other slot machines' bolts.**
  - All 5 slot machines start 4 sword / 4 shield / 4 bolt per reel (`cabinets.ts`), and bolts feed the universal special (cost 5, 10 damage, ignores shields).
  - If only TESLA has the special, each other machine's bolts must become its signature symbol. Proposed rule: **"the bolt slot becomes your signature slot"**:
    - KNIGHT 6/6;
    - MIDAS 4 sword / 4 shield / 4 gold bar;
    - BRIAR 4 / 4 / 4 thorn;
    - JAX: see below.
  - Re-point relics from "special" to "**your meter**":
    - Battery: meter starts 30% full;
    - Fang: your payoff heals;
    - Overcharge: your payoff echoes 1/3;
    - Jackpot Bell: jackpots refill your meter;
    - Lightning Rod: stays TESLA-only.
    - This keeps the relic pool shared instead of splitting it 5 ways.
  - The Grounder ("grounded bolt gives no energy") becomes "grounds your signature symbol".
  - Data note: in the greedy sim TESLA is the *weakest* slot machine (20.0% vs 24–29%). "Every build goes lightning" is about the universal special, not the TESLA machine.
    Measure the special's share of player damage before and after, so the claim is backed by numbers.
- **MIDAS ×4: [CHANGE]**
  - "The next attack ×4 whatever lands" will often land on a no-match line (3 singles × 4 = 120 split across damage, shield and bolts) or a shield double.
  - This is the RAISE mistake from I13. RAISE doubled "your next jackpot" and paid 25% of the time. After the fix to "next *paying group*" it paid 98% (`STATE.md` Iteration 13).
  - Make it **"your next paying group pays ×4"**. The chase stays ("I hope it's the gold jackpot"), and the payoff never fizzles.
- **BRIAR thorns: [AGREE], with one definition.**
  - The bank should fire **when the enemy attacks you, blocked or not**. If it only fires on HP damage, shields and thorns anti-synergise, and you recreate the "spiked feels bad" problem.
  - Show the bank as a number on BRIAR's HUD.
  - Cap the "keep 10%" relic as planned.
  - Ability-only enemy turns (freeze, jam) shouldn't consume the bank.
- **JAX all-jackpots: [AGREE]** with the payoff.
  - **[PUSHBACK] Don't add a new signature symbol.** JAX already owns wilds (2 on reel 2, act 2 +2 on reel 3).
  - Make **wilds on the payline his meter fuel**: +1 per wild, and a wild double or jackpot +3. This avoids diluting the strip and needs no new art. The 10-point meter then fires about every 4–6 spins; tune in the sim.
  - The payoff (each payline cell pays as its own jackpot) is ~3× a jackpot. Correct as a big, readable moment.
- **KNIGHT no special: [AGREE].** It's the teaching machine. See §3.

### 1.4 3-wild bonus reel (everyone): **[AGREE]**
- Today 3 wilds pay a BOLT jackpot, which is meaningless for non-TESLA machines after the lightning change. The rework has to replace it anyway.
- Keep the pop-up under ~1.5 s at 1x and skippable, like the rest of the clock.
- Exclusions as specified (rock, bomb, slimed/disabled cells, chase cells).

### 1.5 Lightning storm: **[AGREE]** on the log-length storm; **[BUG-RISK] photosensitivity**
- The 4 s cap is right. 300+ strikes today is a known stall.
- **WCAG 2.3.1 says no more than 3 flashes per second.** A storm made of per-strike flashes, even at FLASH_CAP 0.2, can break that at 10+ strikes/s.
- Render the storm as **one sustained arc/glow with a racing damage counter**, not N discrete flashes. On LIGHTNING: SOFT, show no flicker at all.

### 1.6 Act 3 at 5 fights + the Dealer: **[AGREE]**, **[CHANGE]** how it's tuned
- Baseline (`baseline_act3.txt`, commit, GREEN): act 3 regulars take ~5–10 turns and lose 2–20% HP (MIDAS 2–6%, 5 turns: effectively one-shot), with deaths of 0–4.5%.
  HP into the Dealer is 91%; the Dealer win rate is 64.1% (MIDAS 82, knight 55, thorn 57).
- There's no post-fight heal in act 3 ("THE HOUSE DOESN'T COMP"). Five fights that each cost the planned "meaningful" ~8–12% would bring HP into the Dealer to ~50–60%. The Dealer win rate then collapses and every act 3 death moves to the Dealer (already 94.7% of act 3 deaths).
- Pick one:
  - **(a)** a Cashier after fight 3 with a paid heal (preferred, since it's another decision point); or
  - **(b)** a small comp (10% max HP) after each act 3 fight.
- Targets:
  - HP into the Dealer ~70–75%;
  - Dealer win ~55–60% with a spread ≤12;
  - a few % deaths per regular fight;
  - regular fights of ≥7 turns, so abilities fire at least twice.
- Scale regulars by `machinePower` as the plan says. This also fixes MIDAS one-shotting them.
- **Run length:** GREEN+ goes from 16 to 18 fights, at ~16 turns per fight, and the new 1x is half today's speed. Default new players to 2x, which is today's 1x.

### 1.7 Post-boss big choices: **[AGREE]**; the draft is in §2
- **Placement:** one screen right after each boss (the House and the Mirror; the Dealer only if endless exists), then the legendary pick and the Cashier as now.
- Each boss offers **one set of 3**, drawn from the 4 sets, never the same set twice in a run.
- **The Mirror interaction must be specified.** It "plays your own machine": does it inherit your symbol levels?
  - Recommend yes for symbol levels. It's thematic, and it makes "+1 level to ALL symbols" carry a hidden-but-fair cost at the Mirror.
  - Recommend no for charm levels (it copies charms at plain tier today).
  - Put it in the Mirror footnote.

### 1.8 Endless mode: **[AGREE]**, as the last step; **[CHANGE]** the scaling
- More reels and paylines mean a multi-payline scorer. That's an engine change (L+), and endless is its only customer.
- Don't make everything exponential. Use **geometric HP (×1.35 per loop)** plus **stacking house rules** (the stake rules, reused) and number formatting (`12.4K`).
- Give extra reels/paylines as rare endless-only big choices, not as a baseline.
- Guard rails: level caps lift but multipliers are clamped to safe integers, heals cap at max HP, and the lightning storm is already capped at 4 s.
- Ship it after a public playtest of B–E. It's a second game mode, and the core loop should be proven first.

### 1.9 Preps (counter relics): **VERDICT: remove**
- **Numbers** (`baseline.txt`, share of runs holding the relic that went on to win):
  - greedy: MOUSETRAP 31%, PICKAXE 30%, LOCKPICK 37%, MITTENS 45%, against 51–58% for the build relics and legendaries. Greedy rarely even takes them (n 10–77).
  - relic-drafting: all four sit at 32–34%, the bottom of the table.
  - Their effects answer a single enemy the player may never meet again.
- **Readability:** they're a third category (not upgrades, not build relics) on the 3rd draft slot. That slot shows a prep 60% of the time when the next fight has a matching enemy, so it is often a dead slot.
- **The rework already covers them:** the rat-thief fix (a jackpot returns all stolen cells), symbol swaps in every direction and the Hourglass cover the counterplay.
- **Action:** delete them from drafts, collection, sims and tests. Refill the slot with symbol-swap or symbol-level cards.
  Keep their sprites for a possible later "elite drop" relic; there's no need to design that now.
- A mega-buff rework ("~10% chance an enemy mechanic is blocked outright") is invisible when it works. Watch-only fights can't show a non-event well.

### 1.10 Quick fixes (Step A): **[AGREE]** with all of them
- Rat thief: a jackpot of the stolen cells returns everything.
- Fang heals on the echo.
- Swaps in every direction.
- PAY wording for RAKE, Counterfeiter and Hex. Suggest a red **"−N"** chip on the group's number instead of words, since the new display has room for it.

### 1.11 Balance flags from the baseline (not in the notes)
- **Golden Hourglass: 76% win (greedy, n 196), 71% (relic policy).** It's the top relic by 12+ points. Part of that is legendary selection bias (only act 2 survivors hold it), but PHOENIX sits at 64% and KEY at 58% under the same bias.
  Recheck after Step D: it gets stronger as act 3 abilities matter more.
- **HIGH STAKES GREEN** drops the win rate 21.8 → 13.8 because act 3 starts there. Five act 3 fights will steepen this, so re-run the ladder in D.
- **MIDAS's Dealer is the easiest** (82% commit, 79% greedy), because gold burst beats HP pools. The ×4 meter adds more burst, so tune it together with the Dealer's HP.

### 1.12 Bugs
- No new bugs found in this review (tests 142/142; headless only).
- Open from the BACKLOG: the rat-thief jackpot bug (fix decided, Step A) and possible shop title clipping (SPIKED CHARM; moot if SPIKED retires).

---

## 2. Post-boss big choices (4 sets of 3; one SAFE pick per set)

Numbers are in the ×10 scale. Card text states the rule and its cost as plain rule text, like the existing "+6 MAX HP"; there are no
expected-value or delta hints. Each boss offers one set.

### Set 1: FORGE (symbol power)
| Card | Rule | Cost |
|---|---|---|
| **ARMS RACE** | +1 level to ALL your symbols | −60 max HP (the Mirror copies your levels) |
| **MASTERWORK** | +2 levels to SWORDS (rolled: your most common symbol) | Your other symbols can't gain levels this act |
| SAFE: **WHETSTONE** | +1 level to SHIELDS (rolled) | none |

### Set 2: THE MELT (charm pivots)
| Card | Rule | Cost |
|---|---|---|
| **MELT IT DOWN** | Every charm on your reels becomes GOLD, at your best charm level | You lose all other charm levels |
| **GILD THE LOT** | Every plain cell gets a GOLD charm | −1 level to ALL symbols (min Lvl 1) |
| SAFE: **POLISH** | +1 level to your most-owned charm | none |

### Set 3: SURGERY (reel shape)
| Card | Rule | Cost |
|---|---|---|
| **CLEAN CUT** | Remove ALL shields from REEL 2 (rolled reel); +1 level to swords | Lose that reel's shields (their charms go too) |
| **TWIN REEL** | REEL 3 becomes an exact copy of REEL 1, charms included | Reel 3's old cells are gone |
| SAFE: **SWEEP UP** | Remove all rocks, scars and marked cards from your reels | none |

### Set 4: DEVIL'S BARGAIN (body, economy, tempo)
| Card | Rule | Cost |
|---|---|---|
| **GLASS CANNON** | Every paying group pays ×1.5 | No healing between fights for the rest of the run (Bandage, comps, Cashier heals) |
| **BLOOD PACT** | Your meter fills twice as fast | −25% max HP |
| SAFE: **SECOND WIND** | Heal to full; +40 max HP | none |

**Top 3 (the ones worth prototyping first):**
1. **MELT IT DOWN.** The user's exact "turn all X into Y" bail-out. It's dramatic to watch as every charm tints gold, and it answers "my early charms don't fit".
2. **ARMS RACE.** The simplest strong option: one line, felt on every spin, and the cost is shown up front.
3. **TWIN REEL.** It rewrites the machine's shape, jackpot odds jump visibly, and it's unique to a slot game.

Notes:
- Keep costs **permanent and visible** (HP bar shrinks, reel table changes) so the player sees the price they paid.
- Sim policy: greedy takes the strong pick if its measured value beats the safe pick by more than X; log how often the safe pick wins. It should be the right call about 30–40% of the time, or the sets are mis-costed.
- Balance risk: GLASS CANNON plus act 3's "no comp" makes its cost smaller in act 3. Offer Set 4 only after the House, or make GLASS CANNON also cost −20% max HP.

---

## 3. KNIGHT: "simple but exciting with no special mechanic"

Key fact: with half swords and half shields and the in-order pair rule, KNIGHT's payline
**pays a double or better 50% of spins and a jackpot 25% of spins.** Today's 3-type strip gives a jackpot 1 spin in 9 (11%).
Half/half is already exciting in itself: a jackpot every 4th spin, with no new rule. Every idea below builds on that.

Ranked:
1. **FORGED STEEL: swords and shields start at Lvl 2** (with +5 steps: 15 instead of 10).
   - Why #1:
     - Nothing to learn: numbers are just bigger.
     - It shows off the new level system on the very first spin, so KNIGHT becomes the tutorial for the core rework.
     - Every jackpot hits hardest on KNIGHT.
   - Balance: pay for it with HP or with slower level cards.
2. **SQUIRE: every draft shows 4 cards** (not the Cashier).
   - Pure between-fight agency (the user's rule: agency lives between fights). The fights stay as simple as possible.
   - The sim says drafting matters: greedy vs random is 26.6 vs 17.4%, so an extra card is worth real win rate.
   - Weakness: it isn't visible in a fight, so it's less "exciting" to watch.
3. **VETERAN: +1 level to swords and shields after each boss.**
   - A visible "the hero grows" curve with no meter.
   - Weakness: it's back-loaded, so act 1 still feels plain.
4. **CHAMPION'S JACKPOT: KNIGHT's jackpots pay ×4 (not ×3).**
   - One number, but at a 25% jackpot rate it's felt constantly.
   - Weakness: jackpots are JAX's theme, so it blurs identities.
5. **ARMORY: pick your starting relic from 3.**
   - Exciting run start, zero complexity.
   - Weakness: it's about the relic, not KNIGHT.

Recommendation: **#1 FORGED STEEL** as KNIGHT's identity ("THE DEPENDABLE ONE" → "BIG, HONEST NUMBERS"). #2 SQUIRE is the fallback if FORGED sims too strong.
Skip the sword+shield combo symbol: it's a mechanic in disguise, and it would dilute the 25% jackpot rate that makes half/half work.

---

## 4. Competitor comparison

Direct fetches of Steam and review sites were blocked by this environment's network proxy. Everything below comes from search-result
summaries of the linked pages. Numbers are as reported there; where I found nothing reliable, I say so.

| Game | Core loop | Praise | Complaints |
|---|---|---|---|
| **CloverPit** (2025) | Horror-room slot machine. Pay escalating debt deadlines by spinning; buy charms that change symbol values and odds. "Balatro-like with a slot machine". No combat. | ~90% of 12.7K Steam reviews positive. Diegetic single-room presentation, sound design, big-win feel; turns from chance into strategy as synergies unlock. | "Too much RNG / no agency", charm bloat (dozens of charms crowd the shop; ~25% called worthless; a player-requested charm-ban feature), runs decided by luck past the 2nd deadline; some critics saw everything in under 10 h (one 5/10). |
| **Slots & Daggers** (Oct 2025) | Retro dungeon crawler on a pub slot-machine cabinet. Pick 3 items to fill the reels, spin to attack or defend vs monsters; magic bypasses shields. **Timed skill-check minigames** on strong attacks; crits on triples. | 93% of ~4.5K reviews positive, 300K+ sold at ~$5.59. Style, "clever spin", addictive short sessions. | Monotony after ~15 min sessions; the player outscales enemies so late floors are a slog; short (4–8 h, shop exhausted in ~7–8 h); "over-reliance on slot randomness strips tactical agency". |
| **Slot or Not** (Mako Team) | Turn-based battles: a hare with a slot machine buddy fights fruit monsters. Items in your bag become the reel's outcomes; trinkets for synergies; Slay the Spire map structure. | ~89% of 131 reviews positive; colourful, deckbuilder feel. | **No reliable complaint data found.** The review count is too small for patterns. |
| **Slot or Die** (Hunt Games / cr0cq, Jun 25) | First-person cursed-castle crawler. A slot relic picks items from your inventory, cycling the whole vault before refreshing. **You stop the reels** to chain attacks and bonuses. | **No reviews found** (Metacritic empty). | **No reliable info.** |
| **Slotbound** (demo; full release Nov 2026) | 3×3 slot spins summon units into an **autobattler** defense. Units have random stats; weak units are absorbed into strong ones; items and cores bend the odds; judgement and boss waves. | 100K+ wishlists. The absorption system is praised. | Demo at ~73% of 42 reviews: difficulty spikes on judgement waves; the slot feels "unreliable" for getting useful units. |
| **Luck be a Landlord** (2021, genre root) | Spin to pay rising rent; add and remove symbols like a deck; symbols interact by adjacency. | ~94% positive. Genre-defining, addictive, good music. | Randomness makes it "more mindless than it could be"; shallow after a few wins; **mechanics poorly explained**. |

### Where Slots vs. Slots is unique (from what I found, no listed game has these)
- **Machine vs. machine.** Both combatants are slot machines. Others fight monsters with a machine, or fight a debt number.
- **Enemies write on your reels** (slime, bombs, thieves, marked cards, confiscated charms, the Dealer's SHUFFLE/CUT). Competitors' enemies hit your HP; ours corrupt your build.
- **Slot-mechanic bosses** (House pot, Mirror reflection, Dealer's face-up deals). Each boss is a gambling rule.
- **Hands-off fights** with all agency between fights. This is closer to autobattlers (Slotbound, Backpack Battles-style) than to Slots & Daggers or Slot or Die, which add timing input.
- **Character meters** (after Step C): five slot machines that play differently, where competitors have one machine.

### Gaps to exploit
- **Agency complaints are the genre's #1 criticism** (CloverPit, S&D, LBaL). Our answer:
  - named-target charm cards (no random targets);
  - visible reel tables with counts, so the odds can be read;
  - big choices with explicit costs.
  Keep the random-charm card held, as planned.
- **"Can't tell why it paid"** (LBaL). Numbers on the payline and `BASE × MULT = TOTAL` directly answer it. This is the strongest reason to ship Step B.
- **Charm bloat** (CloverPit). Keep the charm pool small (6–7) and make each viable through levels. Don't grow it to 40.
- **Late-game slog, where the player outscales enemies** (S&D). Act 3 scales with `machinePower`, then HIGH STAKES, then endless: already on plan.
- **Short content** (S&D, CloverPit). Five slot machines × 6 stakes × act 3 is already more structure than S&D at launch.

### Risks
- **Watch-only fights will split players.** The S&D and Slot or Die buyers chose timing input.
  - Mitigations:
    - fights must stay short: today it's 16 turns per fight; target under ~40 s at 2x;
    - 8x plus skip;
    - enemy writes must be the show (callouts, the strip map).
  - Market it as an autobattler ("build it, watch it fight"), not as a slot game you play.
- **A crowded, same-sounding shelf:** Slot or Not, Slot or Die, Slots & Daggers, Slotbound, Slots vs. Slots.
  - The name will blur in search. Not urgent, but the held rename (SLOTS VS. BOTS) has the same problem. If a rename happens, pick something that doesn't start with "Slot".
- **Gambling optics.** Every competitor stresses "no real gambling". Say it on the store page (no real money, no loot boxes).
- **Pure-RNG perception.** A watch-only slot game is the most exposed to the "no agency" review. Lead with the build screens in trailers and screenshots, not the spin.

### Store pitch lines
1. **"Your slot machine vs. theirs. They cheat."** (the user's draft; keep it as the headline)
2. "Build a slot machine. Watch it fight. Pray the Dealer doesn't cut the deck."
3. "A roguelike where the monsters rig your reels."

Sources:
- [CloverPit on Steam](https://store.steampowered.com/app/3314790/CloverPit/)
- [CloverPit negative reviews](https://steamcommunity.com/app/3314790/negativereviews/)
- [CloverPit "Too much RNG" thread](https://steamcommunity.com/app/3314790/discussions/0/594027788789444908/?ctp=4)
- [CloverPit charm ban thread](https://steamcommunity.com/app/3314790/discussions/0/595161733884195743/)
- [PC Gamer CloverPit review](https://www.pcgamer.com/games/roguelike/cloverpit-review/)
- [DJMMT CloverPit 5/10](https://djmmtgamechangerdoc.wordpress.com/2025/10/14/cloverpit-review-5-10/)
- [Slots & Daggers on Steam](https://store.steampowered.com/app/3631290/Slots__Daggers/)
- [Slots & Daggers (Wikipedia)](https://en.wikipedia.org/wiki/Slots_%26_Daggers)
- [TheSixthAxis S&D review](https://www.thesixthaxis.com/2025/10/24/slots-daggers-review/)
- [TheXboxHub S&D review](https://www.thexboxhub.com/slots-daggers-review/)
- [Games Asylum S&D review](https://www.gamesasylum.com/2026/05/22/slots-daggers-review/)
- [Slot or Not on Steam](https://store.steampowered.com/app/3496890/Slot_or_Not/)
- [Slot or Not demo (itch.io)](https://makoteam.itch.io/slotornot)
- [Slot or Die on Steam](https://store.steampowered.com/app/4339080/Slot_or_Die/)
- [RPG Site: Slot or Die launch](https://www.rpgsite.net/news/19662-indie-dungeon-crawler-slot-die-launches-for-pc-via-steam-on-june-25)
- [Slot or Die (Metacritic)](https://www.metacritic.com/game/slot-or-die/)
- [Slotbound on Steam](https://store.steampowered.com/app/4459590/Slotbound/)
- [IndieBunny: Slotbound demo](https://indiebunny.com/news/can-you-cheat-fate-slotbound-s-3x3-slots-turn-rng-into-tactical-warfare)
- [Luck be a Landlord on Steam](https://store.steampowered.com/app/1404850/Luck_be_a_Landlord/)
- [Rogueliker: LBaL review](https://rogueliker.com/luck-be-a-landlord-review/)

---

## 5. Recommended build order (mapped to TUESDAY_PLAN Steps A–F)

| # | Step | Item | Effort | Notes |
|---|---|---|---|---|
| 1 | A | Rat thief jackpot fix, Fang on echo, swaps in every direction, "−N" pay chips, shop text pass | S | Sim before and after; the tiny deltas are expected |
| 2 | A | **Remove preps** (pools, collection, sims, tests) | S | Refill the 3rd draft slot with swap cards |
| 3 | A | Speeds 1/2/4/8 + prefs migration; lightning storm (single sustained arc, ≤4 s) | S | Presentation only; photosensitivity check |
| 4 | B | **×10 rescale alone** | M | The sim must match the baseline ×10; this is the regression gate |
| 5 | B | Charms on cells + named cards + levels (step +3..+5, cap 3) + remove sets + Ticket rework + re-target Counterfeiter / Pit Boss / Hexer / CUT / Mirror | L | The core. Add charm/upgrade win rates to the sim first |
| 6 | B | Numbers on payline symbols, `BASE × MULT = TOTAL`, one reel table everywhere | M | Can go in parallel with #5 in the presenter |
| 7 | B | Sim policy rewrite + full rebalance to baseline targets | M | Log in STATE.md |
| 8 | C | Meter framework + lightning to TESLA only + bolt slot → signature slot + relics re-pointed to "meter" + Grounder retarget + KNIGHT (FORGED STEEL, 6/6) | M | Must land together, or 4 slot machines are broken in between |
| 9 | C | MIDAS gold bar (next *paying group* ×4), BRIAR thorn bank (fires on attack, blocked or not), JAX wild-fed meter, 3-wild bonus reel | M each | One slot machine per commit, each with a Dealer row check |
| 10 | D | Act 3: 5 fights + Dealer, `machinePower` scaling, mid-act Cashier or small comp | M | Targets: HP into Dealer 70–75%, Dealer 55–60% (spread ≤12); re-run the stake ladder |
| 11 | E | Post-boss big choices (§2) | M | Log how often the safe pick wins; Mirror-levels footnote |
| — | — | **Playtest checkpoint** (push only on the user's word) | — | Keep the current live build as the reference |
| 12 | F | Endless: multi-payline scorer, geometric HP + stacking house rules, number formatting | L | After the playtest of B–E |

Critical path: A → B(#4 → #5 → #7) → C(#8) → the rest. #6 and the art for new symbols (gold bar, thorn) can run in parallel with #5.
