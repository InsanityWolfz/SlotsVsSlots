# ARCHETYPES_PLAN review (approval gate), 2026-10-07

Reviewer: expert playtester (code reading plus two light sims). Reviewed: `loop/ARCHETYPES_PLAN.md`.
I did not edit `src/` or the plan. Scratch harnesses stayed in the session scratchpad and were not committed.

**Verdict: approve the direction, with conditions.** Sword removal and the archetype rule are both sound. The plan
underestimates four things:
1. How much a two-symbol strip changes the math. Signature pay and jackpot rates go up 1.8x to 3.4x.
2. The boss sizing model. It only measures damage, so the denial archetypes get a free ride, and %-HP damage breaks it.
3. The sim bot already distorts the endless numbers: it cashes out at loop 5.
4. The JAX playing card collides with the Dealer's dead CARD marks.

Details below. Labels: **[BUG]** for a defect, **[BAL]** for balance, **[DES]** for design opinion.

---

## 1. Swords only on KNIGHT

### 1.1 The core math: what removing swords does to a strip
Today every non-KNIGHT machine has three symbols (4/4/4). The plan leaves them with two (shield + attack), and two-symbol
strips play very differently. Exact numbers (from `scoreLine`, inOrder pairs, one symbol worth 10):

| strip (per reel) | attack-symbol pay per spin | its pair rate | its jackpot rate |
|---|---|---|---|
| sword 4 / shield 4 / sig 4 (today) | 13.7 (sig) + 13.7 (sword) | 7.4% | 3.7% |
| shield 6 / sig 6 | **25.0** | 12.5% | **12.5%** |
| shield 5 / sig 7 | 32.2 | 14.2% | 19.8% |
| shield 4 / sig 8 | 40.7 | 14.8% | 29.6% |

- If the signature both deals damage and fills the meter (the plan's wording), a 6/6 strip has **about 1.8x the
  meter fill and about 1.8x today's sword damage in the same symbol**. **[BAL]**
- Anything gated on a jackpot of the signature fires **3.4x as often**: MAKE IT RAIN (a chip jackpot), JAX's natural
  triples, and the HOT STREAK, JACKPOT BELL and HIGH ROLLER bet lines. **[BAL]**
- **Any player jackpot steals the boss pot** (`fight.ts` ~684: `steals = score.tier === 'triple'`). The
  whole-line jackpot rate goes from 11.1% (three symbols) to 25% (two symbols). The House, and every pot fight, gets
  much easier for TESLA, BRIAR and CASSIDY. KNIGHT is already at 25%. **[BAL]**
- **[DES] Sameness risk.** With 6/6 strips, TESLA, BRIAR and CASSIDY all become "shield + X" machines with KNIGHT's
  hit rhythm. Only JAX (it keeps its wilds) stays a three-symbol machine. Pick the strip shape on purpose:
  - (a) Asymmetric two-symbol strips (e.g. shield 5 / attack 7), with meter costs raised. This is my default.
  - (b) Keep a third, small, per-machine symbol later in the content wave.
  - Either way, add "line jackpot rate" to the official table so the change can be seen.

### 1.2 Per machine: how the signature must change

**TESLA (bolt).** Today bolts deal **no damage**: `resolveGroup` case `bolt` only calls `gainEnergy`, and the
lightning (`specialDamage` 60 at cost 40) is all of TESLA's damage besides swords.
- Make a bolt group a small, blockable zap and keep the lightning as the piercing burst.
- Raise `specialCost` about 1.8x (40 to roughly 70) or fill the meter at half rate. Otherwise lightning storms come
  twice as often, and DIRECTION_NOTES already lists "endless strikes" as a must-fix.
- KEEN and CHARGED both become "+N to bolt base", and KEEN (+40, pierces) dominates CHARGED (+10). Pick one. Fold KEEN
  into CHARGED on TESLA, or drop KEEN from TESLA's pool. Pierce means nothing for lightning anyway.
- The Grounder (`plantGround`) already targets the meter symbol. Decide that **grounding stops the meter fill only and
  the damage still lands**. Otherwise one act 2 enemy hard-counters four of the five machines.

**BRIAR (thorn).** Thorns are already BRIAR's damage, delayed: they bank and then fire through shields when BRIAR is hit
(`thorns()`, ~1375). If thorns also pay on landing, BRIAR's damage counts twice.
- Split it: a thorn group hits now for part of its pay and banks the rest. RETALIATION charms and relics shift the split
  toward the bank.
- **[DES]** DIRECTION_NOTES made thorns passive on purpose ("spiked shields... feel bad when the enemy doesn't attack").
  An active split fixes that complaint. A pure "pays now and banks the same amount" doubles BRIAR.
- **[BAL]** The Mirror reflects `last.player.damage`, which **excludes thorn volleys** (`fight.ts` ~699,
  `note === 'thorns'`). That is why BRIAR's Mirror knob is **75** (`BOSS_MUL.thorn.mirror`) while the others sit at
  1.6 to 3.1. Once thorns hit directly, the Mirror reflects them, so this knob and `POWER_REF.thorn` must be re-derived
  from scratch, not nudged.
- THORNY (+50 to the bank) and a retargeted KEEN (+40 per thorn) overlap. Keep THORNY as BRIAR's attack charm.

**CASSIDY (chip, id `goldbar`).** Chips are currency (shop, bets, boss chip shield, endless cash-out at x10) and the
MAKE IT RAIN fuel. They now also become damage.
- `goldbar` isn't in `PAYING`, so it needs a damage branch in `resolveGroup`.
- **[BAL] Economy inflation.** Each chip symbol pays 1 chip with no cap. Going from 4 to 6 or 7 chip cells per reel
  raises chip income about 1.5x to 1.8x, before jackpots. Pick one fix and measure chips per fight before and after
  (target within 10% of today):
  - chips pay currency only on a pair or better (1/2), or
  - currency comes only from MAKE IT RAIN refunds and the CHIP charm.
- The HIGH ROLLER bar's "best group" sort prefers swords (`fight.ts` ~853) and needs retargeting to chips.
- MAKE IT RAIN fires about 3.4x as often. With gold on chips (LOADED CHIPS, now built in) it multiplies chips x3, so
  this is the explosive combination. The rain cost (5) probably has to rise.

**JAX (new playing card).**
- Mechanically this is the cheapest change: swap sword for card and keep 3 symbols (shield 5 / card 5 / wild 2). The
  hit rates don't change.
- **[BUG-risk] The name and art collide.**
  - `card` is already a symbol id: the Dealer's and Card Sharp's mark, a **DEAD** symbol (`strip.ts` `DEAD`,
    `effectiveSymbol` returns `'card'` for `carded` cells).
  - The Dealer's line cards are named `'ace' | 'joker' | 'deuce'`.
  - On JAX's own reels in act 3, a live JAX card next to a dead marked card is a readability trap.
- Use a new id (e.g. `jcard`), and either make the Dealer's marks clearly face-down (card backs) or give JAX a
  different gag symbol (a pie, juggling pins). I prefer the second. It fits TRICKSTER's "gag symbols".
- `wildAlone()` returns `'sword'` for non-TESLA players (`fight.ts` ~772). The 3-WILD fallback, the jackpots payoff and
  `stripStats` (`run.ts` ~1107, "counted as a sword jackpot") all need the new id.
  `symbols: ['sword','shield']` in `cabinets.ts` must become `['jcard','shield']`.

### 1.3 Everything that names or assumes swords (from the code)
Mechanically every item below is "replace `'sword'` with `attackSymbol(cabinet)`". Make that a single helper
(`attackSym(c)`, KNIGHT `sword`, JAX `jcard`, others `meter.symbol`) and grep for literal `'sword'`.

| where | what | action |
|---|---|---|
| `charms.ts` `CHARM_SYMBOLS` | keen, vamp: `['sword']`; gold, lucky, lucre: sword/shield/bolt; trick: sword/shield | attack + shield (keen/vamp: attack only) |
| `fight.ts` score() | KEEN (~882), BELT (~894), DRUM (~900), EXECUTIONER (~924), vault best-group sort (~853), MIDAS TOUCH (~737, ~829, ~891) | retarget. The MIDAS TOUCH path is **dead code** (no machine has `kind: 'touch'`): delete it, along with director/hud bits |
| `fight.ts` resolveGroup | `sword` hits; `bolt`/`goldbar`/`thorn` only fill meters | an attack branch for each signature |
| `fight.ts` `wildAlone`, `PAYING`, `WHEEL_SYMBOLS`/`JACKPOTABLE` | sword or bolt | add the attack symbol, add `goldbar` to PAYING |
| `charms.ts` `LEVELLED`, `strip.ts` `symbolValue`, `log.ts` names | sword values | add the new card id |
| `run.ts` `sigSymbol` | "+2 / rock-swap: swords for KNIGHT and JAX" | JAX: card |
| `run.ts` `stripStats` | damage counts only `g.symbol === 'sword'` | the attack symbol |
| `run.ts` BANK VAULT (~1017) | gold onto a plain sword | onto a chip |
| big choices (`run.ts` ~1656) | CLEAN CUT "+1 LEVEL TO SWORDS" (dead on 4 machines after removal), SOLID GOLD (sword/bolt/shield), BLOOD PACT KNIGHT text, MASTERWORK/WHETSTONE via `symbols` | retarget; CLEAN CUT is a silent dead card if missed **[BUG-risk]** |
| `sim/simulateRun.ts` | `swap` worth (sword 2), `symLevel` (sword 8), `add` (sword 3), BUILD map | rewrite (section 4) |
| `run.ts` `POWER_REF`, `BOSS_MUL` | measured on today's machines | re-measure with `power_ref.ts`, then refit |
| enemies | none **write** swords on you. Symbol-aware writers: Grounder (meter symbol), Thief/Card Sharp/DEUCE (`cellValue`: sig 3 > sword 2 > shield 1), Mimic (your best group), Mirror shards (your last damage), Repo Man/Pit Boss (charmed cells) | all now hit your damage symbol directly, so expect counters to bite harder; re-measure act 2 |
| enemy strips | enemies keep swords (`TUNE.act1Swords/act2Swords`) | fine, and good for readability: a sword now means "KNIGHT or the enemy" |

### 1.4 Relics: built in, retarget, or KNIGHT-only
- **Retire (now built in):** GRAFT (gold and vamp fit thorns), LOADED CHIPS (gold and vamp fit chips).
- **Retarget text and code:**
  - BANK VAULT: gold onto chips.
  - EXECUTIONER (`hone`): "keen attack symbols".
  - STACKED DECK: still useful, since wilds aren't the attack symbol; fix "KEEN" if KEEN changes.
  - VAMPIRE'S KISS: now mostly "vamp on shields and wilds". Keep it, reword it.
- **Must become KNIGHT-only (or retire): SHIELD BASH (`bash`)**, a *general* relic: "leftover shield hits back for
  its full amount each turn". It breaks the new "shield damage is KNIGHT-only" rule. The plan misses it. **[DES]**
- **Unchanged, KNIGHT:** WAR DRUM, WHETSTONE BELT, CHAINMAIL.
- **Name collision:** the EXECUTIONER relic and the EXECUTIONER archetype. Make the relic the archetype's anchor.
- Keep `retired: true` (the relic loader and collection already honor it). Changing machine strips also makes daily,
  weekly and hiscore entries incomparable across the change. Tag entries with a build/season field inside
  `slotvslot.profile.v1`; do not rename the key.

---

## 2. Archetypes: the rule check and content

The test is "different resource or different win condition". Results:

| machine | archetype | passes? | note |
|---|---|---|---|
| shared | WILD / LUCKY | yes (odds) | `LUCKY_MACHINES` excludes KNIGHT and CASSIDY because "a wild barely changes a two-symbol line". After the rework TESLA and BRIAR are two-symbol too, so the shared archetype's enabler weakens exactly where it's shared. Its payoffs (PRISM, HORSESHOE, CLOVER, BELL) carry it. Measure LUCKY per machine. |
| KNIGHT | BLADE | **no** (baseline) | Fine as the default; don't count it toward the content wave |
| KNIGHT | BULWARK | yes (shield is the resource) | CHAINMAIL, SHIELD BASH, BULWARK charm, WHETSTONE BELT exist |
| KNIGHT | EXECUTIONER | yes (win condition) | see the risk below |
| CASSIDY | HOARDER | yes (unspent chips) | PIGGY BANK and HIGH ROLLER (1 + chips/20) already are interest |
| CASSIDY | RAINMAKER | yes, borderline | the opposite use of the same resource; RAINMAKER, LOOSE CHANGE, TIP JAR, SLUSH FUND exist |
| CASSIDY | LOAN SHARK | yes (debt) | the most complex one; overlaps REPO MAN liens and TOLL BOOTH. Build it on the lien system or defer it |
| BRIAR | RETALIATION | yes (enemy hits) | the bank, CACTUS, ROSE HIP |
| BRIAR | BLEED | yes, weakly (a new clock) | ECHO (IDEAS doc) fits |
| BRIAR | OVERGROWTH | **no, as written** | "thorns spread to neighbouring cells" is more thorns. Make it plant brambles on the **enemy's** reels (they hurt when they land there): a real new win condition |
| TESLA | LIGHTNING | baseline | ROD, OVERCHARGE, BLAZE, COIL |
| TESLA | FARADAY | yes (shield) | FARADAY CAGE, STATIC |
| TESLA | OVERLOAD | yes (HP) | UNDERDOG, PHOENIX, BLOOD CHALICE, BLOOD PACT already fit |
| TESLA | EMP | yes (win condition) | see the risk below |
| JAX | CARD SHARK | baseline | |
| JAX | CHAOS | **overlaps** WILD/LUCKY | On JAX, wilds are the meter, so CHAOS and the shared archetype collapse into one. Either CHAOS *is* JAX's version of WILD, or redefine it as randomness (the WILD wheel: random symbol and charm jackpots) |
| JAX | TRICKSTER | yes (win condition) | |

**Rule-level risk [BAL, important]: the boss sizing model only sees damage.** `machinePower` counts only `attack` and
`specialFire` events from the player, against a dummy with 999,990 HP and a 999,990-HP you.
- **EMP, TRICKSTER, FARADAY, BULWARK-as-block, HOARDER** add power the sizer can't see, so their bosses come out
  *smaller*. That's a double dip: the existing note "damage charms are taxed by boss sizing and heals aren't", at
  archetype scale. Give each denial archetype a damage-side payoff ("a jammed enemy takes +X% from lightning"), or
  count denied enemy damage in `machinePower`.
- **EXECUTIONER as % of enemy max HP** against the dummy measures absurd power, and in endless (HP up to the
  `ENDLESS.clamp` of 1e12) it ignores HP growth entirely. It becomes *the* endless build. Use **your own max HP** as the
  scale (KNIGHT the tank; it fits TROPHY BELT and SECOND WIND), plus a capped execute under a threshold.
- **OVERLOAD's HP cost** is free against a 999,990-HP dummy, so power is overstated and its bosses get too big. Charge
  the cost per *storm*, not per strike (the 73c/73d spam bug class), and never let it kill (floor at 1 HP). Act 3 has no
  heal between fights, so test OVERLOAD there and with GLASS CANNON.

**Enablers and payoffs** (short name: effect; "exists" means it's already in the code):

- **WILD / LUCKY (shared)**
  - Enabler: LUCKY (exists).
  - Enabler: LOADED REEL: a reel's wild counts for both groups.
  - Payoff: WILD CARD: each wild on the line +1 meter or +5 chips.
  - Exists, fits: PRISM, HORSESHOE, CLOVER.
- **BULWARK (KNIGHT)**
  - Enabler: BULWARK charm (exists).
  - Enabler: TOWER SHIELD: leftover shield carries over by half.
  - Payoff: SHIELD BASH (make it KNIGHT-only).
  - Payoff: RIPOSTE: a blocked hit returns 50% of what was blocked.
- **EXECUTIONER (KNIGHT)**
  - Enabler: HEADSMAN: swords +1% of your max HP each.
  - Payoff: EXECUTIONER relic (exists; retarget).
  - Payoff: COUP DE GRACE: an enemy under 15% takes x2 (bosses x1.5).
- **HOARDER (CASSIDY)**
  - Payoff: PIGGY BANK (exists).
  - Enabler: SAFE DEPOSIT: chips over 20 can't be bet or spent; +2 HIGH ROLLER per 10.
  - Payoff: COMPOUND: HIGH ROLLER cap x3 becomes x4.
- **RAINMAKER (CASSIDY)**
  - Enablers: RAINMAKER and LOOSE CHANGE (exist).
  - Payoff: DOWNPOUR: each rain this fight +10% to the next.
- **LOAN SHARK (CASSIDY)**
  - Enabler: MARKER LOAN: +15 chips now, a lien that grows 2 a fight.
  - Payoff: TOLL BOOTH (exists).
  - Payoff: DEFAULT: a paid-off lien gives max HP.
- **RETALIATION (BRIAR)**
  - Enabler: the bank split.
  - Payoffs: CACTUS and ROSE HIP (exist).
  - Payoff: BRAMBLE WALL: the bank caps at 2x and pierces.
- **BLEED (BRIAR)**
  - Enabler: BARB: thorn hits leave 1 bleed (10 a turn).
  - Payoff: OPEN WOUND: bleed ignores shields.
  - Payoff: ECHO (IDEAS doc).
- **OVERGROWTH (BRIAR, as redefined above)**
  - Enabler: SEED POD: a thorn jackpot plants 1 bramble on their reels.
  - Payoff: ROOTBOUND: their bramble cells also feed your bank.
- **FARADAY (TESLA)**
  - Exists: FARADAY CAGE, STATIC.
  - Payoff: CAPACITOR: leftover shield at turn start charges 1/4 of it.
- **OVERLOAD (TESLA)**
  - Enabler: LIVE WIRE: lightning +30%, costs 5% HP a storm.
  - Payoff: UNDERDOG (exists).
  - Payoff: MELTDOWN: lightning +1% per 1% HP missing (cap +50%).
- **EMP (TESLA)**
  - Enabler: PULSE: a lightning strike delays their ability 1 turn (bosses: once a fight).
  - Payoff: SHORT CIRCUIT: a jammed reel's cells take +20 from bolts.
  - Exists, partial: HOURGLASS.
- **CHAOS (JAX)**
  - Exists: STACKED DECK, CAP AND BELLS.
  - Payoff: WILD WHEEL+: the 3-WILD wheel picks twice.
- **TRICKSTER (JAX)**
  - Enabler: SLEIGHT: a card jackpot swaps 1 of their payline cells to a gag (dead) symbol.
  - Payoff: COPYCAT: their first jackpot each fight also pays you.
  - Exists: PIT BOSS.
  - **The engine can already do most of this.** `write()` and `applyStatus` are side-generic, so TESLA's jam and
    JAX's swap can reuse the enemy writer code with the player as the caster.

**Guards for EMP and TRICKSTER:** fights must stay *watchable*.
- "The enemy does nothing" turns are dead air in a watch-only game, and they push toward the 80-turn cap and LAST CALL.
- Bosses get a resistance: at most one delay per ability cycle, and no locking out FINAL HAND, the House's cash-out or
  ALL IN. Their telegraphs are the drama.

**Content size [DES].** About 14 non-baseline archetypes x 2-3 items is 28-42 items, well over the +50% target (49 live
relics and 10 charms today).
- Wave 1: **one enabler and one payoff for two archetypes per machine** (~20 items, many retargets of existing relics).
- Measure each one with an "only X" row, then expand.
- "Offers lean toward your archetype": use the existing `favors` and `BUILD_ENABLER` gates. Don't add a new weighting
  system.

---

## 3. UI panel, text budget, side bets

**Build panel.** Approve. "Screenshot loops 4-6 first" is right. Cap its contents:
- HP, the meter with numbers, chips, the charm level table, and the relic grid with pages.
- The fight HUD already holds a lot. Don't move the meter out of the machine frame during fights.

**Text budget (measured).** 26 of 49 live relics exceed 8 words.
- Worst: HIGH LIMIT 17, MARKER 16, STACKED DECK 13, PIGGY BANK, WHETSTONE BELT and TOLL BOOTH 12.
- Charm short texts already fit (2-7 words).
- An 8-word budget is achievable if card text drops the parentheticals and the collection keeps the long form, the same
  split `charmShortText` / `charmRuleText` already uses. Add a `short` field to `RelicDef` the same way.

**Side bets.** Approve with three fixes.
1. **[BAL] SAFE is the only +EV line.**
   - SAFE aims at 78% for x1.5 (EV 1.17). LONG aims at 34% for x3 (EV 1.02). HOT HAND keeps EV 1.02 as the pay rises
     (`lineFor` scales the aim).
   - Cutting SAFE turns betting from a small chip source into roughly break-even. With LOADED DICE (x1.2) LONG is EV
     1.22: then it's a relic tax.
   - The official sim never bets, so measure human economy separately: chips from bets per run, before and after.
   - That's acceptable if intended (bets as spice, not income). Say so in the plan.
2. **Name and fallback.** HOT HAND is a streak bonus *on* the long shot, not a line. Call the line LONG SHOT.
   - When LONG can't make a line, `betsFrom` falls back to an EVEN line (x2 at 55%). Keep that or show no bet; the
     plan should say which.
   - The Dealer's table (FOLD HIM EARLY / TAKE THE HIT) isn't mentioned. Keep one of his named bets as the single line
     at the Dealer.
3. **Stepper.** -5/-1/+1/+5, clamped to min(chips, cap). Remember the last stake.
   - Cap 20 / 40 endless; HIGH LIMIT x2 is 40 / 80. That cuts today's endless 50 to 40, fine.
   - Rewrite HIGH LIMIT's and MARKER's text (both reference "4, 10 OR ALL IN" and the 2/5 buttons).
   - CASSIDY loses MAKE IT RAIN and HIGH ROLLER power from every chip staked, so the panel must show chips left.
   - Side bets are small and independent: ship them early, but **ask before pushing** (players are on the live build).

---

## 4. Endless scaling and the sim rewrite

**Today's numbers** (my light runs: GREEN, act 3 on, forced LET IT RIDE after the Dealer, greedy bot, N=200 then 120):

| machine | riders / 200 | reached loop 3 | loop 4 | loop 5 | loop 6 |
|---|---|---|---|---|---|
| KNIGHT | 30 | 13 | 3 | 2 | 0 |
| TESLA | 20 | 9 | 4 | 4 | 0 |
| BRIAR | 29 | 23 | 13 | 11 | 0 |
| JAX | 26 | 13 | 1 | 0 | 0 |
| CASSIDY | 43 | 29 | 23 | 17 | 0 |

- **[BUG in the harness] The "wall" at loop 5 is the bot cashing out, not the curve.**
  - In the N=120 rerun every run that reached loop 5 had **cashed out** there (BRIAR 7 of 7, CASSIDY 9 of 9; cash-outs
    at loops 3-5 overall).
  - The `cashOut` choice value decays `pClear` by 0.8^(L-1), and `SIM_BIAS.ride` only forces the *first* ride.
  - So `tools/balance/endless.ts` (p50/p90) is **right-censored**. Its stated target ("p90 <= 6") was never really
    measured.
  - The new endless report must force riding to death, and report cash-out behavior separately.
- **The spread** is already wide: CASSIDY and BRIAR reach loop 5 at 8-9% of all GREEN runs (40% of riders); JAX at 0%.
  That spread comes from `ENDLESS.hpBy` (1.05 to 1.5) and `dmgBy`.
- **The user beats the bot.** They see loops 4-6 in their own play. A greedy bot can't tell you what "a truly broken
  build" reaches. The endless report needs a **best-of** bot (an archetype-committed policy, or the top 5% of greedy
  runs by power) as well as the average.
- **[DES] Power sizing works against the goal.**
  - Act 3 and endless enemies are sized from *your measured power* with `powerElastic` 0.5. A build twice as strong
    faces sqrt(2) times the HP.
  - That compresses build differences on purpose. "Only broken builds reach loop 5" needs builds to matter, and
    escalating growth (x1.45, x1.6, x1.8) hits strong and weak builds alike.
  - Proposal: in endless, size from a **fixed curve** (or lower elasticity, e.g. 0.25), then add mild escalation. A
    strong build then really outlasts a good one. One knob, measurable.
- **Define the denominator.** "Under ~5% of endless runs reach loop 5" means 5% of *riders*? Today that's 0-40% by
  machine. I'd target loop 5 reached by under 10% of riders on the average bot, and 30-50% for the best-of bot.

**Sim rewrite.** Approve, but split it.
- **2a now:** one harness module (an official table, an endless report with forced ride, and fuzz).
  - The bot's values key on `attackSym(cabinet)`, not `'sword'`.
  - **It must reproduce today's tuesday table within about 1 point per machine** before it replaces anything.
  - Keep the old greedy bot runnable until step 3 is logged.
  - Move the one-offs to `legacy/`. 83 files; `legacy/README.md` already exists.
- **2b with the content wave (step 6):** the archetype-committed policies.
  - You can't write a FARADAY or LOAN SHARK policy before those cards exist.
  - Writing them early means rewriting them, and it bakes guesses into the baseline.
- Add **line jackpot rate, chips earned per fight, and machinePower (POWER_REF)** to the official table. They're the
  three numbers the sword removal moves most.

**Order.** Mostly right. My order:
1. Review (this).
2. Side bets (small, independent; ask before pushing).
3. Sim 2a, calibrated on today's game.
4. Sword removal, **one machine at a time**:
   - JAX first (a rename, still 3 symbols), then TESLA, then CASSIDY (economy), then BRIAR last (the Mirror knob of 75
     and the bank split).
   - Re-measure `POWER_REF` and refit `BOSS_MUL` after each, and log each in STATE.
   - Delete the dead MIDAS TOUCH code first.
5. UI panel and text budget (in parallel with 4, after the screenshots).
6. Content wave 1 and sim 2b.
7. The endless pass, last (agreed).

---

## 5. Biggest risks, vetoes and changes

**Risks, ranked:**
1. **Two-symbol strips** (1.1): about 1.8x signature output, 3.4x signature jackpots and 2.25x line jackpots (boss pot
   steals). Every machine gets retuned at once. Mitigation: one machine per step, asymmetric strips, and jackpot rate in
   the table.
2. **The boss sizer is blind to denial and %-HP** (section 2). EMP, TRICKSTER and FARADAY get free bosses; EXECUTIONER
   breaks sizing and endless.
3. **CASSIDY's economy**: chip income about 1.5x to 1.8x, while the shop, bets, boss chip shield and endless score all
   price in chips.
4. **BRIAR**: thorns paying twice, plus the Mirror finally reflecting them (knob 75 to an unknown value).
5. **Readability**: JAX's card next to the Dealer's dead CARD marks; the Dealer's "JOKER" line card on the JOKER
   machine.
6. **The endless target can't be measured** with today's harness (censored at the cash-out) or today's bot (too weak
   to find the broken builds).

**Vetoes:**
- **EXECUTIONER as a % of enemy max HP.** Use your own max HP plus a capped execute.
- **OVERGROWTH as "thorns spread on your own reels".** That fails the plan's own rule. Plant brambles on their reels
  instead.
- **Signature "pays damage AND fills the meter at the full rate"** with unchanged meter costs. Pick a split per
  machine (above).
- **The `card` id for JAX's symbol.** Use a new id at minimum. I'd pick a non-card gag symbol.

**Changes I'd ask for (top 5):**
1. **Make the strip shape an explicit decision.** Add jackpot rate, chips per fight and POWER_REF to the official table,
   and remove swords one machine at a time (JAX, TESLA, CASSIDY, BRIAR), logging each.
2. **Fix the sizing gap before any denial archetype ships.** Either `machinePower` counts denied damage, or every denial
   archetype gets a damage-side payoff. EXECUTIONER scales off your own max HP, with caps on bosses and in endless.
3. **Per machine, one attack charm.** KNIGHT KEEN, TESLA CHARGED (KEEN folded in), BRIAR THORNY, JAX KEEN on cards,
   CASSIDY gold on chips. Don't blindly retarget KEEN everywhere. Make SHIELD BASH KNIGHT-only, retire GRAFT and
   LOADED CHIPS, and fix CLEAN CUT and SOLID GOLD.
4. **Split the sim rewrite.** 2a: one harness and a bot keyed on the attack symbol, calibrated to today's table within
   about 1 point, with an endless report that forces riding (today's is censored by cash-outs). 2b: archetype policies
   with the content. Endless also needs a best-of bot.
5. **Endless: size from a fixed curve or lower `powerElastic`** before escalating growth, and define the target on
   riders (loop 5 under 10% average bot, 30-50% best-of). Cut wave 1 to about 20 items (two archetypes per machine).
   Fold CHAOS into WILD on JAX, and LOAN SHARK into liens or defer it.
