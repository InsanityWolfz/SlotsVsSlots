# Boss redesign (2026-10-09, design only)

This doc answers PLAYTEST_ROUND_13 dislikes 2, 3 and 6. Nothing in `src/` is changed yet. Every number here is a
first pass: measure it with `table.ts` and `_r13_turns.ts` before and after, and log the results in STATE.md.

"Turns" counts both sides' spins, the same way the round 13 table does. A round is one of your spins plus one of
theirs.

---

## 1. The Act 2 boss: three replacements for THE MIRROR

**Why the Mirror swings:** its damage is a share of *your* last hit, so the stronger you hit, the harder it hits back.
- A burst spin (a DROP, a JOKER payoff, a big rain) gets thrown back at you.
- A steady build barely gets touched.
- Its HP is sized to your power too, so it's 7-15 turns of being either a coin flip or nothing.

All three concepts below deal damage in **% of your max HP**, never in proportion to your damage. Your build changes
the *odds* of getting hit, not the size of the hit.

### A. MADAME ZERO (roulette) ★ the pick

- **The fantasy:** the queen of the high-limit room. "Place your bets... no more bets."
- **Portrait:** a woman in green velvet with a croupier's visor, holding the ivory ball between two fingers, with a
  small roulette wheel as a hat brooch.
- **Slot machine:** a red and black cabinet with a spinning roulette wheel as its topper and a green felt apron
  painted with a big **0**. The ball rattles round the topper on her big turn.
- **Her strip, per reel:** 5 SWORD, 3 SHIELD, 2 SEVEN, 2 ZERO.
  - ZERO is her writer, like the House's COIN. A ZERO pair on her payline places +1 extra chip on you; a ZERO
    jackpot places +2.

**Her one ability is PLACE YOUR BETS.** She writes **chip stacks on top of your reels**:
- **Every one of her turns,** she places 2 chips on 2 different reels of yours (picked at random). A reel holds at
  most 3.
- **Every 3rd turn of hers, NO MORE BETS:**
  - she places no chips that turn; the ball drops;
  - **each chip still on your reels hits you for 5% of your max HP**, as one hit (shields block it);
  - then her table clears.
- **You sweep chips on your spin:**
  - a PAIR sweeps the reels it runs through;
  - a JACKPOT sweeps all three reels;
  - every swept chip gives you +1 chip.
- **DOUBLE ZERO (at half HP):** she places 3 chips a turn (one on each reel). It's a phase-change banner. Reuse the
  Mirror's crack gate, so the hit that reaches half HP stops there for that turn and both halves of the fight always
  play.

**Telegraph:**
- The stacks sit on your reels with a count, e.g. "●●2".
- Her centre panel copies the House's layout, which round 13 called the best boss UI:
  - `THE TABLE: 4 ON YOU`
  - `NO MORE BETS IN 2`
  - `HIT THROUGH A REEL TO TAKE ITS CHIPS`
- On the turn before the drop, the panel pulses red: `NO MORE BETS NEXT TURN! -20`. The exact number is known by then.

**Counterplay between fights:** her bite depends on your hit rate, which is what you build.

| Build choice | Effect on her bets |
|---|---|
| A denser attack symbol, WILDs, LUCKY | more pairs, so more sweeps |
| Shields on your strip | block the drop |
| Thinning junk (rocks, scars) | dead cells never sweep |
| Chips held | the chip shield works against her (cap 4u, as with the Mirror) |

**How each slot machine meets her:**

| Machine | How it plays |
|---|---|
| KNIGHT | Sword and shield pairs both sweep, and shields block the drop. It's an even fight. |
| TESLA | Its bolt and shield pairs sweep. A lightning strike doesn't sweep (it isn't a payline group), so TESLA leans on its hit rate. |
| JUKEBOX | Note pairs sweep. THE DROP is a group, so a drop jackpot clears the whole table. That gives "next spin is big" a second payoff. |
| JOKER | WILDs make pairs everywhere, and its payoff scores as a jackpot, so it clears the table. Watch for it being too easy. |
| CASSIDY | Swept chips feed HIGH ROLLER: a soft synergy. Measure it; cap it at +1 chip per reel per spin if it runs hot. |

**Why it reads at a glance:**
- Roulette is the most recognisable casino game there is.
- Chips piling up on your reels and a countdown to the drop need no explanation.
- It's also a "next spin matters" moment every round, which is the Jukebox lesson from round 13.

**Variance:**
- A drop is a sum of several small chips, not one roll.
- A weak hit rate (40%) loses about 11% of your HP per drop; a strong one (70%) about 6%.
- So your build matters, and nothing blows out.

**Targets:** 16-20 turns (the crack gate makes 12 the minimum), with a 72% win rate.

### B. THE LOAN SHARK (casino credit)

- **The fantasy:** the man at the bar who'll front you a marker, with interest.
- **Portrait:** a grey shark in a pinstripe suit with a gold tooth, holding an IOU.
- **Slot machine:** a wall safe with a ledger for a pay table.
- **His strip:** 5 SWORD, 3 SHIELD, 3 MARKER. A MARKER pair on his payline adds +1 loan.

**His one ability is LOAN.** Every 3 turns he clips 2 MARKERS onto your best visible cells (your attack symbol
first):
- **A marker cell pays ×2.** It's borrowed money.
- **Each marker shows its DEBT,** which starts at 5% of your max HP and rises 3% for each of your spins it stays on.
- **A marker that lands on your payline is PAID OFF:** it pays ×2 and goes.
- **One left on for 3 of your spins COMES DUE** and hits you for 11%.

**Telegraph:** the debt number on each marker, plus a `COMES DUE IN 1` tag.

**Counterplay:** thinner strips land markers sooner; the ×2 rewards builds that hit hard.

**Why it reads:** loans and interest are universal.

**Variance:**
- His bites are bounded. Expect about 2 markers coming due per fight.
- The ×2 upside means a hot streak can make him trivial.
- Its code is BOMBER's ticking bombs with a buff stuck on.

**Targets:** 16-20 turns, 72% win rate.

**Why it's not the pick:**
- It's two rules (pay ×2, then interest), so it's harder to read than chips on reels.
- It's mechanically close to the BOMBER, and the name sits near CARD SHARP.

### C. THE ONE-ARMED BANDIT (it plays your machine)

- **The fantasy:** the slang name for a slot machine. A rusted 1950s bandit wearing a robber's mask, its lever a
  crowbar.
- **Slot machine:** chipped chrome and a cracked glass marquee.
- **Its strip:** 5 SWORD, 4 SHIELD, 3 LEVER (no writer).

**Its one ability is HIJACK.** Every 3 turns it **pulls your lever**:
- your reels spin once for the Bandit;
- what your payline pays **at base value** (no charms, levels, meters or relics) hits *you*;
- the hit is at least 5% of your max HP and at most 15%;
- your meter doesn't fill from that spin.

**Telegraph:** your lever arm glows red with `PULLS YOUR LEVER IN 1`.

**Counterplay:** shields on your strip (a shield group on its pull shields *you*), and not much else.

**Why it reads:** it's the most on-theme of the three for SLOTS VS. SLOTS.

**Variance:** it's capped, and it ignores charms.

**Targets:** 14-18 turns, 72% win rate.

**Why it's not the pick:**
- It's the Mirror's problem in a new coat: "your machine hurts you".
- An attack-dense strip, which is exactly what players build, gets punished hardest. That teaches the wrong lesson.
- It also has the weakest counterplay of the three.

### The pick: MADAME ZERO

- She is the only one of the three that is:
  - instantly casino;
  - one rule;
  - tense on every spin;
  - neutral across the five machines;
  - free of the bite-scaled-to-your-damage swing.
- Her one per-machine knob is the chip's value (5% by default). Set it per machine from the sim if one machine's
  sweep rate is an outlier, the way BOSS_MUL is set now.
- **The new GREEN stake rule** (it replaces "THE MIRROR COPIES YOUR LEGENDARY"):
  `MADAME ZERO OPENS ON DOUBLE ZERO`. She places 3 chips a turn from the start.
  - Size her HP ×0.85 at GREEN, the way `greenMirror` worked.

---

## 2. THE HOUSE (Act 1): shorter, same identity

Keep the pot, the skim, and "YOUR JACKPOT TAKES IT". The House is the best-read boss in the game; it's only too long
for JOKER and CASSIDY.

**Target:** 12-16 turns on every machine, with an 88% win rate (it's 88-95% now).

**Changes:**
1. **HP:** cut the base HP 25% (`TUNE.bossHp` from 95u to 75u), then refit `BOSS_MUL.house` per machine.
   Fight length roughly tracks HP.

   | Machine | BOSS_MUL.house | Turns: now → expected |
   |---|---|---|
   | JOKER | 1.9 → 1.2 | 28 → about 14 |
   | CASSIDY | 3.5 → 2.2 | 32 → about 16 |
   | KNIGHT | 1.1 → 1.2 | 16.7 → about 14 |
   | JUKEBOX | 1.1 → 1.25 | 14.1 → about 13 |
   | TESLA | 0.85 → 1.05 | 10.8 → about 11 |

2. **A fatter pot so a shorter fight still bites:** the seed goes from 8u to 12u, and the cut per turn from 2u to 3u.
   The skim stays every 3 turns (`POT.cashEvery`).
   - **Found while checking:** BLACK's rule "SKIMS EVERY 3" (`STAKE.houseSkimEvery = 3`) is the same as the base
     (`POT.cashEvery = 3`), so that part of BLACK does nothing today (`stakes.ts:58`).
   - Make BLACK "SKIMS EVERY 2" and update its rule text.
3. **Cut the House's hidden chip skim on CASSIDY** (`MIDAS.houseSkim` from 2 to 0). It quietly drains her rain, and
   it's a large part of why her House runs 32 turns.
4. **Add a LAST CALL backstop:** from turn 20 the House skims every turn. That reuses the `ENDLESS.lastCall` banner.
   Nobody should see a 30-turn House again.
5. **Rename the half-HP phase** from "ALL IN!" to **"DOUBLE DOWN!"** (subtitle `THE POT DOUBLES`), and the panel label
   from "ALL IN POT" to **"DOUBLED POT"**.

---

## 3. THE DEALER (Act 3): a real finale, half the rules

**What's wrong now:**
- **Too many rules:**
  - 3 deal cards, one of which ("A CARD") has 3 hidden outcomes (ACE, JOKER, DEUCE);
  - the cadence changes twice (HOUSE RULES at 50%, FINAL HAND at 40%);
  - ALL IN fades ×0.8 each time;
  - two invisible gates (the first-deal gate at 50%, and 15%);
  - marks from its strip;
  - RAISE affects both sides.
- **It's too short:** one burst spin takes half its HP.
- **Dead code:** SHUFFLE and CUT aren't in `DEALS` any more, but their UI text still ships.

### Pacing: two hands, and a table limit

**FIRST HAND (100% to 50% HP):**
- It deals every 3 turns; its first deal comes on its 2nd turn.
- Each deal is **RAISE** or **DEUCE**, at even odds, never 3 of the same in a row.

**FINAL HAND (50% HP):**
- A banner announces it. The crack gate holds the Dealer at 50% for the rest of that turn.
- From then on it deals **every 2 turns**, in a fixed, visible order: **ALL IN, RAISE, ALL IN, RAISE...**
- The first card of the phase is ALL IN, so the phase opens on its threat.

**TABLE LIMIT** is the minimum-length rule, and it's new:
- No single turn of yours takes more than **12% of the Dealer's max HP**.
- The rest isn't lost: it's **OWED** and lands first on your next turns, again at up to 12% a turn.
- Big hits still show their full BASE × MULT = TOTAL banner, and every point lands.
- So the snowball still reads, but nothing ends the fight in 6 rounds.
- The minimum is 9 of your turns, which is about 18 turns in all.

**Cut:**
- HOUSE RULES;
- the ALL IN fade;
- the first-deal gate and the 15% gate (FINAL_HAND_DEEP);
- ACE and JOKER;
- SHUFFLE and CUT;
- the CARD symbol on its strip.

  Marks belong to the CARD SHARP. Carried marks (THE DECK REMEMBERS) still bite, and they show on your cells only.

**Strip:** 6 SEVEN, 4 SWORD, 2 SHIELD.

### The card set: 3 cards, each with one rule

| Card | Hand | Rule |
|---|---|---|
| RAISE | both | Its next hit ×2 and your next paying group ×2. A fair coin. **ALL IN is never raised.** |
| DEUCE | first | A face-up 2 over your *best* reel's payline for your next spin: that cell pays 0. |
| ALL IN | final | Its next attack is its whole visible hand (every SWORD and SEVEN in its 3×3): at least 25% and at most 40% of your max HP. Shields don't block it. |

### On-screen text

**The deal box (220×112):**
- Fix B1: the card art sits in a 48 px column on the left, and the text starts to its right.
- Every line is drawn at 2× or larger (round 13 dislike 7), with at most 10 characters per rule line.

```
FIRST HAND                    (2×, green · FINAL HAND in red)
NEXT CARD IN 2                (2× · "NEXT TURN!" pulsing red)
[art]  RAISE                  (3×)
       BOTH HITS              (2×)
       X2 NEXT                (2×)
```

| Card | Name | Rule line 1 | Rule line 2 |
|---|---|---|---|
| RAISE | `RAISE` | `BOTH HITS` | `X2 NEXT` |
| DEUCE | `DEUCE` | `REEL 2` | `PAYS 0` |
| ALL IN | `ALL IN` (red) | `90 TO 160` | `NO SHIELDS` |

- In FINAL HAND, a second small card sits under the box: `THEN: RAISE` or `THEN: ALL IN`.
- Under the Dealer's HP bar, only while something is owed: `OWED 5.2K` (2×, gold).
- When a hit is capped: a stamp over the Dealer reads `TABLE LIMIT` for 0.6 s.
- Gone from the box: `MARKS ON YOU`, `HOUSE RULES`, `RAISED!`, the `X0.8` fade label, and the "FINAL HAND, THEN: ..."
  list.
- While RAISE is live, put a gold `X2` tag on both machines' HUDs. Its effect is on the sides, so it doesn't belong
  in the box.

**Banners:**

| Moment | Banner | Subtitle |
|---|---|---|
| Deals RAISE | `RAISE!` | `ITS NEXT HIT AND YOUR NEXT HIT X2` |
| Deals DEUCE | `DEUCE!` | `REEL 2 PAYS NOTHING NEXT SPIN` |
| ALL IN armed | `ALL IN NEXT TURN!` | `90 TO 160. SHIELDS WON'T STOP IT` |
| ALL IN hits | `ALL IN! -132` | (none) |
| Phase 2 | `FINAL HAND!` | `IT DEALS EVERY 2 TURNS: ALL IN, RAISE, ALL IN...` |
| Fight start | `THE DEALER` | `TABLE LIMIT: 12% OF ITS HP A TURN` |

**The gutter warning over its machine:** `ALL IN: 90 TO 160`.

**Card copy:**
- The pre-fight card (`runScreens.ts:2103`):
  `EVERY 3 TURNS IT DEALS RAISE (BOTH NEXT HITS X2) OR DEUCE (YOUR BEST REEL PAYS 0). AT HALF HP: FINAL HAND, ALL IN AND RAISE EVERY 2 TURNS. TABLE LIMIT: IT TAKES AT MOST 12% OF ITS HP A TURN; THE REST CARRIES OVER.`
- The map and enemy-card ability line (`runScreens.ts:207`): `EVERY 3 TURNS: RAISE OR DEUCE. FINAL HAND AT HALF HP`.
- The blurb (`enemies.ts`): `DEALS RAISE AND DEUCE. AT HALF HP IT PLAYS ITS FINAL HAND: ALL IN.`

**The side bet FOLD HIM EARLY ("WIN BEFORE HIS FINAL HAND") becomes impossible** under the new gate. Replace it with
`FOLD HIM: WIN BEFORE HIS 2ND ALL IN`.

### Dealer sizing

- **Target:** 20-26 turns, with a 45-50% win rate among runs that reach it (37-49% now).
- **Steady machines need more HP**, because the limit rarely binds for them:
  - KNIGHT: `BOSS_MUL.dealer` 0.6 → 0.75 (16.6 turns now);
  - TESLA: 2.2 → 2.7 (17.9 turns).
- **Burst machines get their length from the limit, so cut their HP:**
  - CASSIDY: 7.5 → about 4. That also deflates the 15.9K HP readouts.
  - JUKEBOX and JOKER: refit from the sim.
- Removing the marks lowers its damage. Make it up with the ALL IN floor (25%) before touching HP.

---

## 4. Targets for all three bosses: a climb, not a wall

**Turns (both sides' spins):**

| Fight | Now | Target | Built-in minimum |
|---|---|---|---|
| Regular fight | 11-15 | 11-15 | (none) |
| THE HOUSE | 11-32 | **12-16** | LAST CALL from turn 20 |
| MADAME ZERO | 7-15 (Mirror) | **16-20** | half-HP gate, about 12 |
| THE DEALER | 14-24 | **20-26** | TABLE LIMIT, about 18 |

**Win rate among runs that reach the boss:**

| Boss | Now | Target |
|---|---|---|
| THE HOUSE | 88-95% | **86-90%** |
| Act 2 boss | 50-61% | **70-75%** |
| THE DEALER | 37-49% | **45-50%** |

**The death budget at WHITE** (per 100 runs; the WHITE gate of 41-45 is unchanged):

| Where runs die | Now | Target |
|---|---|---|
| Act 1 regulars | about 18 | 18 |
| THE HOUSE | about 8 | 10 |
| Act 2 regulars | **about 1** | **12** |
| Act 2 boss | **about 30** | **16** |
| Runs won | about 43 | about 44 |

**The catch: Act 2's regulars have to start killing.**
- Today they're about 98% survivable: the Mirror does all of Act 2's killing.
- If the Act 2 boss gets easier without them getting harder, WHITE jumps to about 55%.
- **The knobs:** `TUNE.act2Hp` and `TUNE.act2Swords`, plus BLUE's faster Act 2 abilities as the stake version. Aim
  for 2-4% deaths per Act 2 regular fight, rising with depth, with fight 4 (the REPO MAN) at about 4%.
- The ramp then reads Act 1 < House < Act 2 < Act 2 boss < Act 3 < Dealer, so each boss is the hardest fight of its
  act and the finale is the hardest of all.

---

## 5. ALL IN: every use, and the renames

| # | Where | What it is | Verdict |
|---|---|---|---|
| 1 | `fight.ts` `deal()`, `DealCard 'allin'`, `game.ts:1813-1823`, `director.ts:215, 316-326`, `game.ts:1868` | The Dealer's card, its banner, its hit and its gutter warning | **KEEP: this is ALL IN** |
| 2 | `game.ts:855` | The death recap source (from `allInHit`) | Keep: it's the Dealer's |
| 3 | `bets.ts:131, 149` | The side bet "SURVIVE AN ALL IN" / "NO ALL IN YET" | Keep: it's the Dealer's |
| 4 | `enemies.ts:275`, `runScreens.ts:207, 2103`, `director.ts:287` | Dealer blurbs, card copy and the FINAL HAND banner | Keep, with the new text from section 3 |
| 5 | `run.ts:1870` (`BIG` card `allIn`), `runScreens.ts:1009` | The BONUS ROUND card: every shield becomes your attack symbol | **Rename to BET THE FARM** (the id stays `allIn`) |
| 6 | `director.ts:1654` banner "ALL IN!", `director.ts:1642` | The House's half-HP phase (the pot doubles) | **Rename to DOUBLE DOWN!** |
| 7 | `game.ts:1778` "ALL IN POT" | The House's pot label after the phase | **Rename to DOUBLED POT** |
| 8 | `runScreens.ts:2106` "AT HALF HP IT GOES ALL IN." | House card copy | **`AT HALF HP IT DOUBLES DOWN: THE POT DOUBLES.`** |
| 9 | `fight.ts` `allIn` field, `stage.ts:62` `allIn`, `events.ts:182` | The House's phase flags in code | Rename the identifier to `doubled` (optional, but it stops the next reader mixing them up) |

Two near-collisions, while you're in there:
- **HIGH ROLLER** is both CASSIDY's bar and a side bet (`bets.ts`). Rename the bet to `JACKPOT HUNTER`.
- **ENCORE** is both a relic and a JUKEBOX card. Round 13 suggested `REPRISE` for the card.

---

## 6. Implementation notes

### What MADAME ZERO reuses

| New piece | Built from |
|---|---|
| Boss id `zero` as `BOSSES[2]` | The MIRROR slot |
| Her centre panel | The House's `drawPot` |
| The drop hit | `cashPot` (one shielded hit plus a `potWin`-style event) |
| ZERO writer symbol | The COIN to pot path in `write()` |
| Half-HP gate | The Mirror's `crackTurn` gate |
| HP sizing | `sizingPower(run, 'mirror')` and `POWER_REF.mirror`, with a new `TUNE.zeroPower` and `BOSS_MUL.zero` per machine |
| Chip shield cap | `MIRROR_CHIP_SHIELD_CAP` |
| Swept chips | The existing run-chip gain |

### What's new for MADAME ZERO

- **Code:**
  - `bets: number[3]` state, placed on her turns;
  - the sweep after your scoring (`g.matched`, reels in `g.reels`; a jackpot sweeps all);
  - events `betPlaced`, `betSwept` and `noMoreBets`;
  - a chip-stack overlay on the player's reels in `machine.ts`.
- **Art** (`tools/build-art.mjs`):
  - the portrait `enemyZero`;
  - her slot machine skin (red and black, wheel topper, ball);
  - the ZERO symbol;
  - a chip stack of 1-3 for the overlay;
  - the map badge `mapBadgeZero`.
- **Music:** retheme the `mirror` song as `zero`, a 3/4 waltz (the roulette wheel). Keep the half-HP switch the canon
  has now.

### What to delete or retext when the Mirror goes

- **Mechanics:**
  - the shard symbol, `mirrorCharge`, `shardReflect`, the reflect caps, `shatter` and the cracked glass;
  - `mirrorCopy` and both draft tags ("THE MIRROR WILL COPY THIS").
- **Text:**
  - the GREEN stake rule;
  - the coach line "BEAT THE HOUSE AND THE MIRROR";
  - `menus.ts` "BEAT THE MIRROR!";
  - the ending "THE MIRROR SHATTERS!", which becomes `THE WHEEL STOPS!`;
  - the achievement `clear` "MIRROR, MIRROR". Keep its id and retitle it `NO MORE BETS`;
  - `BOSS_NAME` and `BOSS_HEADLINE`.
- **Endless:** the cycle becomes HOUSE, ZERO, DEALER, and `ENDLESS.mirrorHp` becomes `zeroHp`.
- **Danger:** set `DANGER.zero` to 35.
- **Sims:** the table column, `bot.ts` and `simulateRun.ts`.
- **Keep:** the MIRROR *relic* is unrelated and stays.

### The Dealer

- Strip `deal()` down to 3 cards.
- Delete `shuffleReels`, `cutReels`, HOUSE RULES, the fade, `FINAL_HAND_DEEP` and the first-deal gate.
- Add `TABLE_LIMIT = 0.12` and an `owed` pool in `damage()`. Owed damage lands at the start of your turn, before your
  spin, as an `owedHit` event.
- **New art:** card sprites for DEUCE and ALL IN. ALL IN currently borrows the SHUFFLE sprite (`game.ts:1809`), which
  is a mismatch.

### The House

Only numbers, LAST CALL, the renames, and `MIDAS.houseSkim` set to 0.

### Risks

1. **Sweep rate per machine:** JOKER's WILDs could make her trivial, and KNIGHT's scars could make her brutal.
   - Probe P(a reel sits in a group) per machine first.
   - Per-machine chip value is the fix. Keep it within 4-6% so she's still one rule.
2. **The WHITE gate moves:** easing the Act 2 boss without hardening Act 2's regulars pushes WHITE to about 55%.
   - Ship both in one change and measure them together.
3. **TABLE LIMIT against the snowball:**
   - It could read as "my big hit was nerfed", the opposite of round 13 dislike 1.
   - The OWED readout and the full TOTAL banner are what stop that; don't ship the limit without them.
   - Fall back to 15% if it feels bad.
4. **Saved runs and saves:**
   - A CONTINUE save mid-Act 2 holds `boss: 'mirror'`, so map it to `zero` in the save sanitizer.
   - Don't rename the localStorage keys.
   - Profile run summaries store display names only.
5. **The Dealer loses damage without the marks:**
   - Watch its win rate.
   - The ALL IN floor is the first knob, then HP.
6. **Tests:** the Mirror and Dealer tests (shards, crack, HOUSE RULES, the fade, FINAL_HAND_DEEP) need to be
   rewritten, not deleted.
