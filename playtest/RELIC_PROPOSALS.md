# Relic proposals: 20 new or reworked relics (2026-09-27)

These are proposals only. Nothing in `src/` changed.

**How the numbers were measured**
- Harness: `tools/balance/relic_proposals.ts`. It is a throwaway that monkeypatches `Fight` at runtime, so the real engine, drafts, shop and boss sizing all run. Diagnostics by act are in `tools/balance/relic_diag.ts`.
- Setup: GREEN stake, greedy drafter, paired seeds (777), N 400 per machine. Every row means "start the run holding it", which is an upper bound (the same method as `builds.ts`).
- Baseline: **10.6%** overall. By machine: KNIGHT 10.8, MIDAS 10.8, BRIAR 10.5, TESLA 11.3, JAX 9.5.
- Noise: about ±1.5 on a single machine and ±0.7 on the five-machine average.
- Reproduce with `npx tsx tools/balance/relic_proposals.ts 400 <ids>`. The tuned rows used env knobs: `RALLY=5 FARADAY=0.25 STATIC=5 ROSE=0.1 MAIL=0.1 JEST=10 UNDER=1.5 EXEC=3 SHOE=3`.
- Charm relics are measured the way they would be offered, with the only-this-charm drafter. "Only keen 7.5 → 13.2" means keen-only runs without the relic and then with it.

**Reference points: what a good existing relic is worth on its own machine** (`builds.ts 250`)
- Rod on TESLA: +13
- Cactus on BRIAR: +9.5
- Midas on MIDAS: +8.8
- Bell and Mirror: about +10 on average

I tuned the new machine relics to land between **+5 and +11**.

---

## Findings that shaped the list (read these first)

1. **Survival beats damage in the current economy.**
   - The Mirror, act 3 and the Dealer are sized from `machinePower`, the measured damage of your build: `sqrt(power/REF) × BOSS_MUL`. So every damage relic is partly taxed back as enemy HP.
   - BRIAR is taxed hardest (Mirror ×5, act 3 ×1.4).
   - Healing and HP don't show up in `machinePower`, so they are never taxed. With the same effort, every heal relic I built measured 2 to 3 times stronger than the damage relics.
   - This is why each machine below gets one **identity/damage** relic and one **heal that feeds off its own mechanic**. That matches your note in DIRECTION_NOTES ("healing relics per machine that synergise with its special").
2. **Relics that stack all fight inflate their own boss HP.** `machinePower` plays 40 turns against a dummy, so an uncapped stacking relic looks enormous in the probe while real fights last 6 to 18 turns.
   - BLEED (keen hits stack 10 per turn) measured **+0.3** for this reason.
   - Every stacking relic below has a cap.
3. **The "weak relics" list is mostly an averaging artifact.** `builds.ts` averages all five machines, including the ones that can't use a relic.

   | Relic | Its machine | That machine's baseline | Other machines |
   |---|---|---|---|
   | Rod | TESLA 23.2 | 10.0 | at baseline |
   | Cactus | BRIAR 20.0 | 10.4 | at baseline |
   | Midas | MIDAS 19.6 | 11.6 | BRIAR 16.4 |

   Only **Hone** is truly dead (10.6 average, no machine above noise).
4. **The JAX claim in the brief is stale.** With the current code (after Iteration 27), JAX with no charms wins **1.7%**, against 9.3 with greedy and 12.3 with only gold (Dealer 9.6% with no charms).
   - Charms do help JAX now. What's wrong is that **lucky, JAX's own favoured charm, is below greedy** (6.7), and JAX's wall is the Mirror (22% of runs die there; Mirror win 50%, or 35% with lucky).
   - Relic-side fix: STACKED DECK (#10) ties charms to JAX's meter, and HORSESHOE (#14) makes lucky wilds pay. Lucky-only JAX goes from 6.3 to 18.5.
5. **Lucky is broken on KNIGHT (1.5) and MIDAS (4.3) at the charm level, and no relic I tried fixes it.** The best was HORSESHOE (×3): KNIGHT 7.8, MIDAS 3.8. See the pushback section.

---

## The 20

Tier is the RELIC RUSH tier. Machine relics are offered only on their machine. Charm relics are offered only when you own that charm (one exception is noted in the pushback section).

### KNIGHT (pool: KNIGHT)

KNIGHT today gets nothing from Battery, Fang or Overcharge (those are meter relics), so it has the thinnest relic pool. Both of these reward its 6-sword/6-shield identity without adding a meter.

**1. WAR DRUM** · uncommon
- **Card:** `EACH SPIN THAT PAYS: SWORDS +5 THIS FIGHT (MAX +25)`
- **Rule:** after each of your spins where any group pays, gain a stack (max 5, reset each fight). Each sword group adds +5 × stacks to its BASE before MULT, so gold, Key and Bell multiply it.
- **Interactions:** rake and hex cut after it. The cap keeps `machinePower` honest. Not on the Mirror's copy list.
- **Why it matters:** KNIGHT's "simple but exciting" answer. Fights build to a crescendo and the number on the sword visibly climbs.
- **Measured:** KNIGHT 10.8 → **17.8 (+7.0)**. At +10 per stack it measured +14.3, which is too much.
- **Art:** a small war drum with crossed sticks, red rim.

**2. CHAINMAIL** · uncommon
- **Card:** `LEFTOVER SHIELD HEALS YOU 10% OF IT EACH TURN`
- **Rule:** at the start of your turn, before your shield resets, heal 10% of the shield you still hold, in whole 5s.
- **Interactions:** Chalice turns the overheal back into shield (a tank loop, but capped by the reset). It stacks with SHIELD BASH (#20): bash resolves first, then the heal, then the reset.
- **Why it matters:** gives KNIGHT's shields a second job, so shield charms and shield levels become a real path instead of the "safe" pick.
- **Measured:** KNIGHT **+6.5**. At 20% it was +11.0; at 50% it was +17.8.
- **Art:** a grey mail shirt with one red heart link.

### MIDAS (pool: MIDAS)

**3. KING'S VAULT** · uncommon *(rule-bend: charms on the signature symbol)*
- **Card:** `GOLD CHARMS FIT GOLD BARS. THEIR GOLD ADDS TO YOUR NEXT X4`
- **Rule:** while you hold it, gold charm cards can target plain gold bars.
  - A gold-charmed bar on the payline doesn't multiply its own fill. Instead, its ×N goes into the VAULT (show it on the meter).
  - The next raise pays ×(4 + vault) instead of ×4, then the vault empties.
  - Example: two ×2 gold bars bank +4, so the next raise pays ×8.
- **Interactions:**
  - Golden Ticket levels apply.
  - The Pit Boss confiscates gold first, so it will hunt vault bars (good tension). Counterfeit bars add nothing that turn.
  - The Mirror copies bar charms, but its bars fizzle (it has no meter), so there's no mirror blow-up.
- **Why it matters:** MIDAS's "bank the gold, cash the ×4" identity, and the first charm-on-signature-symbol path.
- **Measured:** MIDAS 10.8 → **18.8 (+8.0)**. Vault bars were owned in about 2,000 of the fights across 400 runs, so the drafter does take them.
- **Art:** a gold bar inside a tiny open vault door.

**4. ROYAL DECREE** · uncommon *(changes how the meter pays)*
- **Card:** `YOUR X4 HITS EVERY GROUP ON THAT SPIN, GOLD BARS TOO`
- **Rule:** when the raise fires, every other group on that spin also pays ×4: shields, and gold bars (whose fill is ×4).
- **Interactions:** because the payoff empties the meter before the bars resolve, a raise spin with bars on it re-arms the meter at once. That makes a "Midas streak" chase, bounded by needing bars on the line. Without the bars clause it measured only +3.0.
- **Why it matters:** matches the user's own line "MIDAS ×4 applies to whatever lands on the payline", and gives a streaky, loud MIDAS.
- **Measured:** MIDAS **+8.5**.
- **Art:** a scroll with a gold crown seal.

### BRIAR (pool: BRIAR; Cactus also moves here)

**5. ROSE HIP** · uncommon
- **Card:** `YOUR THORN VOLLEYS HEAL YOU 10% OF WHAT THEY FIRE`
- **Rule:** when the bank fires, heal 10% of the banked amount in whole 5s. This is on top of BRIAR's payoff heal and Fang's +10.
- **Interactions:** not the Overcharge echo (that stays Fang's job). With Chalice, the overheal becomes shield.
- **Why it matters:** a scaling version of what made Fang a 35% relic on BRIAR, but proportional and small. It rewards building the bank, not just having one.
- **Measured:** BRIAR 10.5 → **21.0 (+10.5)**. At 25% it measured +22.8, which is far too strong.
- **Art:** a red rose hip on a thorny stem.

**6. GRAFT** · common *(rule-bend: charms on the signature symbol)*
- **Card:** `GOLD, KEEN AND VAMP CHARMS FIT THORNS`
- **Rule:** charm cards can target plain thorns.
  - Gold multiplies what the group banks.
  - Keen adds its + to the bank (the bank already pierces).
  - Vamp heals its value when the thorn banks.
- **Why it matters:** BRIAR's favoured charm is vamp, but vamp only fits swords today. This lets BRIAR's charms live on BRIAR's symbol.
- **Measured:** **+2.5, within noise.** Thorn damage is taxed hardest by `BOSS_MUL`, which is finding 1 again. The vamp part fired about 2.5 times as often as the keen part.
- **My take:** ship it for identity, and retune BRIAR's `BOSS_MUL` afterwards. If you want one BRIAR relic that measures well, ROSE HIP is it.
- **Art:** a sword-shaped graft tied onto a thorn vine with twine.

### TESLA (pool: TESLA; Rod stays here, with its text fixed)

**7. FARADAY CAGE** · uncommon
- **Card:** `SHIELD YOU GAIN ALSO CHARGES LIGHTNING (1/4 AS MUCH)`
- **Rule:** each shield group that pays also gives 25% of its amount as energy, in whole 10s. That can fire strikes, with their heal and Fang.
- **Interactions:** grounded cells don't block it (it isn't a bolt). Gold shields now feed the special.
- **Why it matters:** opens a **shield TESLA** build, a tanky one that still strikes. Shield charms matter on TESLA for the first time.
- **Measured:** TESLA **+5.5** (at 50%: +13.0; most of the gain is in act 1).
- **Art:** a small copper cage with a spark inside.

**8. STATIC** · uncommon
- **Card:** `WHEN YOU'RE ATTACKED, YOUR LIGHTNING CHARGES 5`
- **Rule:** once per enemy turn, an enemy attack gives +5 energy. It doesn't matter whether the attack is blocked.
- **Interactions:** stacks with Battery.
- **Why it matters:** the more they hit you, the sooner you strike, and each strike heals 20 (+30 with Fang). It is TESLA's sustain relic.
- **Measured:** TESLA **+9.3** (at 10: +16.3; at 20: +29, which is far too strong).
- **Art:** a yellow zigzag bouncing off a tiny shield.

### JAX (pool: JAX)

**9. CAP AND BELLS** · uncommon
- **Card:** `EVERY WILD ON YOUR PAYLINE HEALS 10`
- **Rule:** after your spin, heal 10 per WILD on the payline. Lucky wilds and the jackpot spin's wilds count.
- **Why it matters:** JAX's sustain answer, tied to the symbol that fills his meter. It targets his Mirror deaths.
- **Measured:** JAX 9.5 → **18.0 (+8.5)** (at 20 per wild: +20.8).
- **Art:** a jester cap, three bells, purple and green.

**10. STACKED DECK** · uncommon *(rule-bend: charms on the signature symbol, and a meter change)*
- **Card:** `WILDS TAKE GOLD, KEEN AND VAMP CHARMS. CHARMED WILDS FILL YOUR METER X2`
- **Rule:** charm cards can target plain wilds (not lucky).
  - A charmed wild lends its charm to whatever group it joins. The engine already handles this, because gold, keen and vamp are read per payline cell.
  - A charmed wild on the payline fills 40 instead of 20.
  - On the jackpot spin, a charmed wild counts its charm 3 times, like any single-cell jackpot.
- **Interactions:** the Mirror copies charms onto its wilds (keen excluded, as today). The Pit Boss and Counterfeiter can target charmed wilds.
- **Why it matters:** the relic-side fix for "charms don't feed JAX". The charms now sit on JAX's engine instead of competing with it.
- **Measured:** JAX **+10.8**. Charms on wilds alone, without the ×2 fill, measured +2.5.
- **Art:** three cards fanned out, the top one a joker with a gold corner.

### Charm relics (offered once you own at least 1 of that charm)

**11. GOLD LEAF** · uncommon (**replaces the Midas relic**)
- **Card:** `GOLD ON A CELL THAT PAYS NOTHING JOINS YOUR BIGGEST GROUP`
- **Rule:** a gold charm on the payline whose cell isn't in a paying group adds its ×N to the gold of the biggest paying group. Gold adds as usual, so ×2 stray on a group already at ×2 makes ×4.
- **Why it matters:** removes the feel-bad of "my gold landed on a single". Gold is already the best charm, so this is deliberately modest.
- **Measured:** only-gold 13.1 → **16.4 (+3.3)**. JAX goes 12.5 → 21.5.
- **Art:** a flake of gold leaf curling off a cell.

**12. EXECUTIONER** · uncommon (**rework of HONE**; keep the id `hone` so collection saves still match)
- **Card:** `KEEN SWORDS PAY X3 WHEN THE ENEMY IS UNDER HALF HP`
- **Rule:** a sword group with a live keen cell multiplies by ×3 while the enemy is under 50% HP.
- **Interactions:** it lines up with every boss's phase 2 (the House's ALL IN, the Mirror's crack, the Dealer's HOUSE RULES). Keen's pierce skips shields, so the ×3 lands in full.
- **Why it matters:** keen becomes the finisher charm (gold is the engine, keen is the axe). Keen trails gold because its flat + doesn't grow with sword levels. This relic gives it a reason to exist late.
- **Measured:** only-keen 7.5 → **13.2 (+5.7)**. That moves keen from the worst charm to above baseline.
- **Rejected alternatives:**
  - BLEED (a stacking DoT): +0.3, see finding 2.
  - WHETTED (keen's + scales with sword level): +3.5.
  - Old Hone (+40): 7.5 → about 7.5.
- **Art:** a black-hooded axe with a cyan edge.

**13. VAMPIRE'S KISS** · uncommon *(rule-bend)*
- **Card:** `VAMP CHARMS FIT ANY SYMBOL AND HEAL WHEN IT PAYS`
- **Rule:** vamp charm cards can target shields, bolts, gold bars and thorns. A vamp cell heals its value when its group pays (on thorns: when it banks). Blood Chalice stays the vamp overheal relic.
- **Why it matters:** vamp is only sustain, and sustain is what wins now, but vamp only fits swords (a third of the offers gold gets). This triples its reach.
- **Measured:** only-vamp 9.4 → **13.9 (+4.5)**; MIDAS 4.5 → 23.0, BRIAR 16.8 → 18.8. It doesn't help KNIGHT or JAX much; they have CHAINMAIL and CAP AND BELLS.
- **Rejected alternatives:**
  - LEECH (vamp heals also hit the enemy): −0.1.
  - TRANSFUSION (vamp overheal carries into the next fight): +1.0.
- **Art:** red lips over a small fang.

**14. HORSESHOE** · uncommon
- **Card:** `A GROUP WITH A LUCKY WILD PAYS X3`
- **Rule:** a group containing a wild that came from a lucky charm this spin pays ×3. Natural wilds, JAX's strip wilds and wild cards bought at the Cashier don't count. It multiplies with Prism's ×2.
- **Why it matters:** a lucky wild today only upgrades a match. This makes each one a big moment.
- **Measured:** only-lucky 8.4 → **14.4 (+6.0)**; JAX 6.3 → 18.5, TESLA 16.8 → 22.3, BRIAR 13.3 → 19.8.
- **Still broken:** KNIGHT only reaches 7.8 and MIDAS 3.8, which is a charm-level problem (see pushback).
- **Rejected alternatives:**
  - ×2: +3.0.
  - "Lucky wilds let any two reels pay": +0.8.
  - "Any wild ×3": JAX 45%, broken.
- **Art:** a green horseshoe with a sparkle.

### General (all machines)

**15. UNDERDOG** · uncommon
- **Card:** `UNDER HALF HP, EVERY GROUP PAYS X1.5`
- **Rule:** while your HP is under 50% of max, every paying group (swords, shields, bolts, thorns) pays ×1.5, rounded.
- **Why it matters:** a comeback path that works on every machine and turns low-HP spins into the exciting ones.
- **Measured:** **+9.0** (KNIGHT 22.0, TESLA 24.3; the weakest is MIDAS at +5.7). At ×2 it measured +15.8, which is legendary-level.
- **Art:** a small dog with a bandage and a big grin.

**16. FIRST BLOOD** · common
- **Card:** `YOUR FIRST PAYING SPIN EACH FIGHT PAYS X3`
- **Rule:** the first of your spins in a fight where any group pays: every paying group on it pays ×3. Once per fight.
- **Why it matters:** every fight opens with a bang. It shortens act 1 fights, and that's where most runs die: fights 2 and 3 each take out 13 to 17% of runs before any relic draft.
- **Measured:** **+7.8** (KNIGHT 23.0, JAX 21.3, MIDAS +2.0).
- **Art:** a red droplet on a sword tip.

**17. PIGGY BANK** · common
- **Card:** `AFTER EACH WIN: +1 CHIP PER 5 CHIPS YOU HOLD (MAX +4)`
- **Rule:** interest, paid after each won fight, before the Cashier.
- **Why it matters:** an economy path. Saving chips (which also feed the boss chip-shield) becomes a strategy, not a mistake.
- **Measured:** **+4.3.** The sim pays it before each fight, which is close enough.
- **Art:** a pink pig with a coin slot.

**18. TROPHY BELT** · common
- **Card:** `+10 MAX HP FOR EVERY FIGHT YOU WIN`
- **Rule:** after each won fight, +10 max HP and +10 HP. Over a full GREEN run that's +170 by the Dealer.
- **Why it matters:** slow, safe growth that `machinePower` doesn't tax. It's a "keep going" relic and fits endless mode well.
- **Measured:** **+4.0.**
- **Art:** a brown belt with a row of tiny gold notches.

**19. HOLY WATER** · uncommon
- **Card:** `THE FIRST CHEAT ON YOUR REELS EACH FIGHT WASHES OFF`
- **Rule:** the first time each fight an enemy writes on your machine, it fizzles. That covers symbol writes (slime, ice, lock, claw, rock, bomb, hex) and writer abilities (flood, blizzard, jam, pilfer, quake, carpet, curse, gulp, launder, mark, houseTake). It does not cover coins or the pot, damage abilities, or the Dealer's deal (the boss keeps its identity).
- **Why it matters:** the "anti-cheat" path the removed Preps were reaching for, in one clear rule. It fired in roughly half of all fights (about 15,000 fizzles over about 30,000 fights).
- **Measured:** **+3.4** (KNIGHT 16.5).
- **Art:** a small blue flask with a white cross.

**20. SHIELD BASH** · common
- **Card:** `YOUR LEFTOVER SHIELD HITS BACK FOR HALF EACH TURN`
- **Rule:** at the start of your turn, before your shield resets, deal 50% of the shield you still hold (in whole 10s) as an attack. Enemy shields block it, and it counts as your attack for Mirror and Reflection.
- **Why it matters:** turns over-shielding into damage on any machine.
- **Measured:** **+3.1** average (KNIGHT and MIDAS +6.7, BRIAR and TESLA about 0).
- **Art:** a round shield with a spike and motion lines.

---

## Cut or rework: the existing 18

| Relic | Verdict |
|---|---|
| **Hone** | **Rework into EXECUTIONER (#12).** It's the only truly dead relic (10.6; no machine above noise). |
| **Midas** | **Replace with GOLD LEAF (#11).** Its meter-fill job moves to KING'S VAULT on MIDAS. It measured fine on MIDAS (19.6) and BRIAR (16.4), so if you'd rather keep it, keep it as a general gold-and-meter relic but **rename it**: "MIDAS" clashes with the MIDAS MACHINE and King Aurum. |
| **Lightning Rod** | **Keep, move to TESLA's pool, fix the card text (a bug).** The card says `YOUR SPECIAL COSTS 40`, but TESLA's special already costs 40 (`ROD_SPECIAL_COST` = `specialCost` = 40), so the card describes nothing. The real effect is 60 → 90 damage (`rodDamage`). New text: `IF YOU HAVE CHARGED BOLTS, YOUR LIGHTNING DEALS 90`. It's one of TESLA's best relics (23.2 vs 10.0). |
| **Cactus** | **Keep as is, in BRIAR's pool.** 20.0 vs 10.4 on BRIAR; the 12.2 average is an artifact. |
| Bell | Keep. Watch MIDAS: 9.2 vs a baseline of 11.6 (N 250, borderline noise). Bell's "fill your meter" is wasted when MIDAS's meter is already armed. |
| Sandglass | Keep. Same MIDAS watch: 8.8. |
| Clover | Keep. Nothing on JAX (9.6); fine, since JAX has its own two. |
| Crown, Battery, Fang, Bandage, Prism, Chalice, Mirror, Ticket, Phoenix, Overcharge, Key | Keep. All +3 to +10 where they apply. |

**Tested and dropped** (so nobody re-proposes them):

| Idea | Result | Why it failed |
|---|---|---|
| CHAIN LIGHTNING (each extra strike in a turn +30) | −0.8 | multi-strikes are rare before act 3, then get taxed |
| COMPOUND (bars while full add +1 to the ×4) | +2.0 | |
| OVERGROWN (a bank of 60 fires on its own) | +1.0 | |
| THORNMAIL (cheats also set off the bank) | +2.8 | |
| ENCORE (meter restarts at 40) | +1.8 | |
| Double jackpot spin | +2.8 | |
| BLEED | +0.3 | |
| LEECH | −0.1 | |
| TRANSFUSION | +1.0 | |
| CONSOLATION PRIZE (a blank spin gives a shield) | +0.7 | blanks are rare because singles pay |
| SAFETY NET (start below half HP: heal to half) | +0.9 | |

---

## Pushback

1. **A pool of 36 relics means most runs never see their machine's two.**
   - Relic drafts show 2 relics, twice in act 1, plus elites, the legendary pick and RELIC RUSH. With about 22 relics eligible per run, the chance of seeing a given one per draft is about 9%.
   - **Proposal:** in each relic draft, one card is drawn from your machine pool plus your owned-charm pools (while any are left); the other is general. Without this, "build identity" is a lottery.
2. **Charm-relic gating:** I agree with "only when you own that charm", with one exception.
   - Also offer it when the charm is your machine's favoured charm (MIDAS gold, BRIAR vamp, TESLA charged, JAX lucky).
   - Otherwise HORSESHOE almost never meets the JAX run it fixes, since greedy JAX often has no lucky yet.
   - Keen has no favouring machine, so EXECUTIONER stays strictly gated.
3. **Lucky on KNIGHT and MIDAS needs a charm fix, not a relic.**
   - A lucky cell can only turn into a wild, and on a two-symbol strip a wild rarely changes the outcome. On MIDAS it also takes the cell a gold sword would use.
   - Suggest: lucky fits the signature symbol (a lucky gold bar that turns wild fills the meter as a pair), or stop offering lucky to KNIGHT and MIDAS entirely.
4. **Damage relics will keep reading weak while bosses scale with `machinePower`.**
   - That's by design (finding 1), but it means BRIAR's GRAFT, and any future damage relic on BRIAR, can't show up in the sim until BRIAR's `BOSS_MUL` (Mirror ×5) is retuned.
   - After shipping, rerun `tuesday.ts` and retune `BOSS_MUL`, especially BRIAR's and TESLA's Dealer numbers, since STATIC and ROSE HIP are heal-heavy.
5. **Relics can't smooth the biggest leak.** Fights 2 and 3 of act 1 each kill 13 to 17% of runs, before the first relic draft (after fight 2).
   - If smoothing is the goal, move the first relic draft to after fight 1, or start each run with a pick of 1 from 2 machine relics. That would also solve pushback 1 for the machine pool.
6. **The heal relics are the strongest things on this list. Keep their numbers where I tuned them.** Every heal relic doubled or tripled its value at the next step up:
   - ROSE HIP 25%: +22.8
   - STATIC 20: +29
   - CAP AND BELLS 20: +20.8
   - CHAINMAIL 50%: +17.8

## Bugs spotted (not relic design)

- **Lightning Rod card text:** it promises a cost that is already the default. See the table above.
- **`src/sim/simulateRun.ts:193`:** `deaths = Array(16)`, but GREEN runs have 18 fights, so deaths at fights 17 and 18 go to NaN. This shows as `NaN` in `deathsAtDepth`; the act 3 death counts in reports are incomplete.
