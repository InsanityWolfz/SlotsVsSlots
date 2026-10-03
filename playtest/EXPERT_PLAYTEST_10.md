# EXPERT PLAYTEST 10: likes and dislikes (2026-10-03)

Build: branch `claude/gifted-galileo-9g5b4w` at `b48cfbe` (iteration 66: the EXPERT_PLAYTEST_9 plan, built and measured).
I didn't edit `src/`. I added three throwaway harnesses: `tools/balance/e10_audit.ts`, `tools/balance/e10_relics.ts` and (from round 9) `e9_repo.ts`.
Screenshots are in `/tmp/e10/`.
I ignored the in-progress art and TRIMS work (the TROPHIES trim row, "NEW TRIM: VELVET" on RESULTS).

## What I ran

**Headless:**
- `npm test`: 211/211 green. `tsc` is clean.
- `fuzz.ts 20`: 1200 runs over 30 modes, 0 crashes, NO INVARIANT BREAKS. THE REPO MAN was beaten 995×, and a lien was paid off 584×.
- `tuesday.ts 400`, `challenges.ts 300 8`, `e9_repo.ts 300 0`, `npm run sim -- --runs 800`.
- **Charm and relic audit (the user's extra scope):**
  - `builds.ts 300 charms`;
  - `e10_relics.ts 120` (builds.ts's relic rows, sharded 3 ways; same seeds and method);
  - `e10_audit.ts 300 spiked` (BULWARK, which builds.ts skips);
  - `e10_audit.ts 300 held random` (random drafter, GREEN: who holds what at the end, and their win rate).

**Visual (Playwright, 1280×720, an HMR-off vite on :5181 so the art agent's edits couldn't reload the page):**
- A fresh profile: loading, name, the first menu.
- A KNIGHT WHITE run, played by a random-click bot: it died in act 2, after a Phoenix revive.
- A MIDAS WHITE run, played by the bot: it died in act 2 to an ELITE HEXER.
- A TESLA GREEN run with forced wins, through the Dealer to the true-ending RESULTS card.
- THE DAILY (BRIAR + HIGH ROLLERS) with forced wins: RESULTS, the share line, COPY RESULT.
- The BAD BLOOD challenge, played by the bot.
- THE WEEKLY start from its new menu row.
- A veteran profile (LV 10, 30 runs, 2 challenges cleared): the main menu, TROPHIES (with hover), CHALLENGES, HISCORES and the machine select.
- `dbg.vs('repo')` frame by frame: the REPOSSESSED popup.

**Numbers I quote:**

| source | WHITE | GREEN |
|---|---|---|
| tuesday 400 | knight 41.0, tesla 44.3, thorn 48.3, joker 44.5, midas 42.8 (**avg 44.1**) | 18.0 / 20.0 / 18.5 / 18.3 / **18.3** (**avg 18.6**) |

- **vs the Dealer:** avg 52.6 (tuesday 400).
- **sim 800 greedy:**
  - KNIGHT WHITE 40.9;
  - deaths: MIRROR 29% (42% kill rate per encounter), HOUSE 9%, REPO 3%, each regular fight 0–4%.
- **Ladder:** WHITE 40.9 → RED 35.6 → **GREEN 16.1** → BLACK 12.4 → BLUE 8.1 → GOLD 8.6. GOLD is above BLUE (noise, or the GOLD rule is too soft).
- **challenges 300:** GLASS JAW 38.0 → HEAVY HITTERS 31.3 → FAST COMPANY 28.7 → SHORT STACK 28.0 → BAD BLOOD 23.0 → ALL OF IT 13.3 → THE LONG NIGHT 10.7.
- **Weekly, random drafting:** mean 15.2%, with weeks from **3%** (W32 KNIGHT FAST+ROLLERS) to **30%** (W33 MIDAS FAST+FRAIL).
- **e9_repo 300 (WHITE):**

  | machine | no take (round 9 → now) | boss win carrying 0 / 1 / 2+ liens |
  |---|---|---|
  | KNIGHT | 17.9 → **6.5** | 77.6 / 75.8 / **83.6** |
  | TESLA | 17.7 → 7.3 | 83.0 / 82.3 / 77.9 |
  | BRIAR | 6.9 → 4.7 | 80.0 / 74.6 / 74.0 |
  | JOKER | 31.3 → 9.0 | 78.2 / 84.2 / **88.1** |
  | MIDAS | 50.3 → **20.3** | 72.3 / 75.6 / never 2 |

---

## 1. LIKES (protect these)

- **L1. The RESULTS card is the round-9 fix that landed best.**
  - It shows "+1200 XP", a filling bar, "LEVEL 2", "400/1600 XP TO LEVEL 3", "NEW SLOT MACHINE: TESLA, THORN" and the achievement cards (trophy, name, text).
  - On the true ending it showed 4 cards plus "+3 MORE ON THE TROPHIES SCREEN" and "NEW TITLE: CARD SHARP".
  - The daily puts the share line ("SLOTS VS. SLOTS DAILY 10-03 BRIAR HIGH ROLLERS 4214 WWWWWB WWWWWB WWWWWB") and COPY RESULT on the card, clear of the reels panel.
  - The ding is now the event, not a footnote. Click-to-continue is there and works.
- **L2. THE REPO MAN is now visible, and he takes.**
  - In the fight: "REPOSSESSED: BOLT" in orange over your machine, with "GONE UNTIL THE BOSS FALLS" under it.
  - On the next screen, YOUR REELS reads "HELD BY THE REPO MAN: KEEN SWORD R2", and the boss node says "GIVES BACK 2 HELD".
  - No-take rates fell on every machine (table above); MIDAS went from 50% to 20%.
  - The fight-4 death rate is 3% (sim 800, A4); per STATE, gate.sh measured 5.0%.
- **L3. Machine balance is the tightest it has been.**
  - GREEN spans **18.0–20.0** across all five machines. MIDAS went from 13.8 to 18.3 GREEN and from 40.0 to 42.8 WHITE.
  - WHITE spans 41.0–48.3 (BRIAR is still on top).
  - Both averages sit inside their gates: WHITE 41–45 and GREEN 16–19.
- **L4. The challenge ladder is fixed.**
  - It falls monotonically: 38.0 → 31.3 → 28.7 → 28.0 → 23.0 → 13.3 → 10.7.
  - BAD BLOOD (23.0) hits its 20–25 target and no longer attacks BRIAR's heals.
  - Names are shown. Locked rows say exactly what opens them ("CLEAR SHORT STACK OR BAD BLOOD TO OPEN"). Two are open at a time.
- **L5. TROPHIES now shows progress.**
  - Text is inline; counters read "3/7", "2/7", "25/25", "30/100" and "4/44".
  - Every title is listed. A locked title says how to earn it on hover ("CARD SHARP: REACH LEVEL 12").
  - Achievement credit for the Dealer and machine clears is restricted to full-numbers runs ("BEAT THE DEALER (NOT IN THE DAILY OR WEEKLY)").
- **L6. The weekly has its own menu row, gated well.**
  - A fresh player sees TUTORIAL in that slot. After one run it becomes "WEEKLY: JOKER", and TUTORIAL moves to the small row.
  - A weekly start says "WEEKLY: FAST HANDS + GLASS JAW" across the top of the first draft.
- **L7. The round-9 HUD layout fixes held.**
  - TESLA at the Dealer with 11 relics: the relic grid (4×3) clears the hero panel, and the YOUR REELS column isn't clipped.
  - The Dealer's deal box ("DEALS NEXT TURN! A CARD ON YOUR PAYLINE: ACE, JOKER, DEUCE") and "MARKS ON YOU: 2" are clean.
  - The name box is drawn in the pixel font.
- **L8. Stability.** 211 tests, a clean tsc, and 1200 fuzz runs with no invariant breaks. The bots saw no page errors across 6 full runs.
- **L9. Keep these from round 9:** "they write on your machine" previews and pips; the run-over table and KILLED BY line; BIG CHOICES (ARMS RACE / MASTERWORK / WHETSTONE (SAFE)); and the Cashier's honest copy ("KEEP CHIPS FOR THE HOUSE: RIGHT NOW +10 SHIELD EACH HOUSE TURN (10 PER 8)").

---

## 2. DISLIKES (ranked by how much they hurt the player)

### D1. Charms aren't a real choice: VAMP is the auto-pick, KEEN and BULWARK are traps, and on BRIAR and JOKER a "no charms" drafter wins twice as often. **HIGH** (balance/design)

See section 4 for the full audit.

**`builds.ts 300 charms`** (GREEN, paired seeds; each "only X" row takes only that charm's cards and level cards):

| row | avg | knight | tesla | thorn | joker | midas |
|---|---|---|---|---|---|---|
| greedy baseline | 10.4 | 7.7 | 9.0 | 12.0 | 9.7 | 13.7 |
| **no charms at all**¹ | – | 5.3 | 8.7 | **20.7** | **22.3** | 5.0 |
| only VAMP | **21.0** | 7.3 | 13.0 | 19.7 | **41.0** | **24.0** |
| only GOLD | 13.2 | 11.7 | 10.3 | 16.3 | 22.0 | 5.7 |
| only LUCKY | 12.6 | (none) | 11.7 | 23.3 | 17.7 | (none) |
| only KEEN | **7.4** | 3.7 | 4.7 | 11.3 | 14.3 | **3.0** |
| only BULWARK (KNIGHT-only charm) | – | **1.0** | (none) | (none) | (none) | (none) |
| only CHARGED / BLAZE (TESLA) | – | – | 10.0 / 13.0 | – | – | – |

¹ A machine that can't take the forced charm never takes any charm. Those rows are a clean no-charms control ("only charged" for KNIGHT/BRIAR/JOKER/MIDAS, "only spiked" for TESLA). BULWARK is KNIGHT-only (`run.ts:74`).

**What it says:**
- **KEEN is worse than no charm on every machine:** 3.7 vs 5.3 on KNIGHT, 11.3 vs 20.7 on BRIAR, 3.0 vs 5.0 on MIDAS.
  - The card ("+20 TO ITS GROUP, WHICH PIERCES SHIELDS") is the most common sword charm.
  - In the random-drafter audit, MIDAS runs holding keen won 7% vs 15% without it.
- **BULWARK, KNIGHT's *own* charm (the only machine that's offered it), is a 1.0% run on KNIGHT.** It's the most on-theme charm for the beginner machine, and the deadliest pick in the game.
  - The official sims never notice, because the greedy drafter values `spiked: 0` (`simulateRun.ts:113`), so every published balance number assumes nobody takes it.
- **VAMP doubles a run:** JOKER 41.0 vs 9.7 baseline, MIDAS 24.0 vs 13.7. It is the one charm that beats "no charms" on JOKER.
- **BRIAR and JOKER win more when they skip charms entirely** (20.7 / 22.3 vs 12.0 / 9.7). The charm cards cost them the swaps to thorns and wilds that actually drive those machines.
  - The structural reason: no charm can sit on a thorn, a wild or a gold bar without a relic (`CHARM_SYMBOLS`: GRAFT, STACKED DECK, VAMPIRE'S KISS).
  - So charms on 3 of 5 machines decorate their *secondary* symbols.
- **MIDAS can only be offered GOLD, VAMP and KEEN** (random audit: gold held in 100% of runs, 11 cells). Its charm "choice" is gold every time.

**Relics have the same shape** (section 4):
- JACKPOT BELL on JOKER is 77.5 vs 5.8;
- VAMPIRE FANG, a *common*, gives TESLA 36.7 vs 9.2;
- LIGHTNING ROD, EXECUTIONER, BLOOD CHALICE and SHIELD BASH are at or below a do-nothing relic.

**Why it hurts:** the user's suspicion is right. A draft where one charm doubles your odds, two halve them, and the honest card text can't tell you which, is a knowledge check, not a choice. "No decision hints" makes this worse: the cards can't warn you, so the numbers themselves must be close.

### D2. Text collisions are back on four screens, two of them from round-9 fixes. **HIGH** (bug/UX)

- **Run-over, a loss that unlocks a machine** (the first unlock most players see):
  - "KILLED BY HUNGRY FROST IMP: SPIN HITS 60 (FROZEN 5 OF 9 SPINS)" and "NEW SLOT MACHINE UNLOCKED: TESLA, THORN" are stacked at y=459/473 at 1.5×.
  - The table panel's border cuts the top of line 1, and the reels panel's border cuts the bottom of line 2 (zoomed: `/tmp/e10/zoom_over_lines.png`).
  - Round 9's D2 "fixed" this by stacking the two lines into a 22 px gap that doesn't fit them (`runScreens.ts:1572-1573`).
- **YOUR REELS between fights:**
  - "HELD BY THE REPO MAN: KEEN SWORD R2, ··· R2" runs right, under the "RELICS" label, which is drawn on top of the second lien (`zoom_liens.png`).
  - With 2+ liens, the round-9 visibility fix is unreadable exactly when it matters most.
- **CHALLENGES:**
  - BAD BLOOD's setup line ("THORN. HIGH ROLLERS: … FAST HANDS: ENEMY ABILITIES C…") prints through "TITLE: THORN IN THE SIDE" (`zoom_badblood.png`).
  - Three edges don't fit one line.
- **Machine select, MIDAS card:** the rule stops at "THE VAULT STARTS FULLER THE MORE".
  - The rest of the round-9 MIDAS text is cut: "CHIPS YOU HOLD. FULL: YOUR NEXT PAY X1 + CHIPS/20 (MAX X3). CASHIER 20% OFF. 360 HP."
  - Players never see the payoff or the HP.
- **Also:**
  - THE REPO MAN's preview rule wraps to 3 lines, and "FALLS" sits on the "THEIR REELS" label.
  - The global SOUND button sits on HISCORES row 7 and on the TROPHIES list's last row.
  - The 18-row run-over's act dividers still touch the row text ("THE HOUSE" / "ELDER BOMBER", `zoom_div.png`).

**Why it hurts:** the round-9 plan's D9 was a layout pass, and these screens are the first thing a playtester sees after a loss, a REPO MAN fight and the machine select.

### D3. The leaderboards are still offline, and the name screen still promises them. **HIGH** (meta/infra, carried from round 9 D1)

- `src/net/config.ts` still has an empty URL and key.
- The schema got caps, a rate limit and a blocklist (good). But the first thing a new player sees is still a mandatory "PICK YOUR NAME: IT GOES ON THE LEADERBOARDS: THE DAILY, THE WEEKLY AND ALL TIME", with no LATER button.
- The round-9 D1 details asked for "different copy until the boards are open"; that part wasn't built.
- This is infra the user has to do (create the Supabase project). Until then, the copy is a broken promise on screen 2.

### D4. THE REPO MAN takes reliably now, but his fight is still bimodal and liens still don't decide the boss. **MED** (design/balance)

- **Same act, same gate, 0 vs 234 HP lost:**
  - MIDAS sample: "THE REPO MAN DEFEATED! 2 ROUNDS - HP 360 TO 360". He took one GOLD SWORD and died before his second turn.
  - KNIGHT sample: "8 ROUNDS - HP 300 TO 66".
- **e9_repo:** MIDAS still has **20.3%** no take and never carries 2 liens; its average HP lost is 21% vs BRIAR's 35.5%.
- **Liens vs the boss:** KNIGHT carrying 2+ liens beats the House 83.6% vs 77.6% with none; JOKER 88.1 vs 78.2. Strong builds still kill him fast *and* beat the boss, so the take never bites them.
  - STATE's persistence gate (2.8 points) is real on average, but the player never *feels* "he took my gold sword and that's why the House beat me."
- **"REPO EVERY 3 TURNS"** on the preview is now wrong: his first take is on his first turn. The HUD shows "REPO NEXT!" at round 1.
- The take reuses the rat thief's claw sprite, so a sighted player reads "a rat steal" until the orange banner.

### D5. Side bets now start at THE REPO MAN, the act's gate fight. **MED** (UX/design; a round-9 fix that overshot)

- **The new rule plus existing rules leave 2 bet nodes per act:**
  - the new rule removes fight 1;
  - `betsOpen` already excludes path forks (fights 2–3 are always forks in act 1) and the House.
  - The only bet nodes are fights 4 and 5.
- **So a new player's first SIDE BET is on THE REPO MAN:** "QUICK HANDS: WIN BY ROUND 8" and "CLEAN HANDS: WIN, LOSING 100 HP OR LESS (LONG SHOT X3)", against the act's spike fight.
- A WHITE run now offers 4 tables in total (the KNIGHT run's run-over: "SIDE BETS 0 OF 1").
- The other half of round 9's D8 ("only after the first run") wasn't built.

### D6. The weekly has almost no variety, and this week's weekly *is* challenge #1. **MED** (design)

- `WEEKLY_PAIRS` holds 2 pairs, both with FAST HANDS, so FAST is in every weekly.
- Machine × pair = **10 possible weeklies**, so repeats come about every 2–3 months.
- **2026-W40 is "JOKER, FAST HANDS + GLASS JAW". Challenge #1, GLASS JAW, is "JOKER. GLASS JAW … FAST HANDS".** Same machine, same edges; the only differences are the fixed seed and the Dealer.
- **The spread is still wide:** W32 KNIGHT+FAST+ROLLERS is **3%** (it was 4% last round: "watch it") and W33 MIDAS+FAST+FRAIL is 30%. A 10× spread on a "same for everyone" board.

### D7. A dominated card in the relic draft: HEAL 80 next to HEAL 170. **MED** (bug)

- **What I saw:** after THE REPO MAN (KNIGHT at 66/300), the relic draft offered SHIELD BASH, MARKER, "HEAL 80 RESTORE 80 HP NOW" and "HEAL 170 RESTORE 170 HP NOW".
- **The cause** (`run.ts:1313-1321`):
  - the relic draft's third card is `hpCard()` (a heal of 80) half the time;
  - the catch-up 4th card is a full heal;
  - nothing dedupes them.
- A strictly dominated card in a 4-card draft is a dead slot, and it reads like a bug.

### D8. Challenge and weekly runs forget what they are after the first screen. **MED** (UX)

- "CHALLENGE: BAD BLOOD" and "WEEKLY: FAST HANDS + GLASS JAW" appear only on the first draft's title (`runScreens.ts:1053`).
- **From fight 1 on:**
  - the map says "ACT 1 - FIGHT 1 OF 5";
  - the fight HUD shows nothing about the active edges;
  - the run-over says "THORN - FELL AT FIGHT 2 OF 12 (ACT 1)", with no challenge name.
- **A cheap ding:** RESULTS then celebrates "NEW CHALLENGE BEST!" for a fight-2 death on the first try.
- **Why it hurts:** a challenge is a promise of a twist. If you can't see the twist (+30% enemy HP, abilities 2 turns faster), every death feels unfair rather than earned.

### D9. Naming isn't consistent: THORN vs BRIAR, machine vs hero. **LOW** (UX)

| screen | name shown |
|---|---|
| main menu daily | "DAILY: BRIAR + HIGH ROLLERS" (hero) |
| main menu weekly | "WEEKLY: JOKER" (machine) |
| share line | "BRIAR" |
| run-over header | "THORN - BEAT ALL 18 FIGHTS" |
| RESULTS | "NEW SLOT MACHINE: TESLA, THORN" |
| achievements | "BRIAR CASHES IN: CLEAR A RUN WITH THORN" |

### D10. Still-dead options and the Mirror wall. **LOW** (balance, known)

- **SWEEP UP** was taken 18 times in about 3900 big choices (tuesday 400). It has been dead for 2 rounds.
- **The Mirror** is still 29% of all greedy WHITE deaths (42% kill rate per encounter); every other node is ≤10%.
- **The ladder:** GOLD 8.6 ≥ BLUE 8.1. The top rung isn't a step.

### D11. TROPHIES: half of round 9's D5 landed. **LOW** (UX)

- Locked titles' requirements are hover-only, in one line at the very bottom ("CARD SHARP: REACH LEVEL 12"). The ask was "list locked titles with their requirements"; a touch player never sees them.
- "HOUSE REGULAR 25/25" showed without a trophy until the next run ended. Counters can read complete while the trophy is unearned (it's checked only at run end).

### D12. Pacing (carried; "not now" stands). **LOW**

- Act 1 t/fight is 11.6–17.1 (tuesday).
- The MIDAS bot's act 2 ELITE HEXER took 27 rounds; BRIAR's act 1 House 24.
- No change since round 9. Log it for the pacing pass.

---

## 3. PROPOSED FIXES

| # | Fix | Where | Effort | How to measure |
|---|---|---|---|---|
| D1 | **Charm pass**: see section 4 (vamp nerf, keen and BULWARK reworks, signature-symbol charms). Also fix the sim's charm values, so the official tables include humans who take BULWARK | `charms.ts`, `fight.ts`, `run.ts` offer pools, `simulateRun.ts` values | M | `builds.ts 300 charms` + `e10_audit spiked`: every "only X" row within ±4 of baseline on every machine that can take it; "no charms" no longer beats baseline on BRIAR/JOKER. tuesday WHITE 41–45, GREEN 16–19 |
| D2 | **Layout pass, measured** | `runScreens.ts` (see below), `menus.ts:470-480`, `cabinets.ts` rule text, the SOUND button | S | A Playwright script that screenshots the 7 screens below; add a unit test that every `CABINETS[*].rule` fits the card's wrap at its size |
| D3 | **LATER on the name screen, and honest copy** until `online()` | `menus.ts showName` | S | Screen only |
| D4 | **REPO MAN tuning** (see below) | `enemies.ts` GATEKEEPER, `run.ts BOSS_MUL.gate`, the preview text | S–M | `e9_repo.ts 400`: MIDAS no take ≤10%, MIDAS average HP lost ≥15%; the HP-lost spread between machines ≤12 points |
| D5 | **Bets on the forks too** | `run.ts betsOpen` (drop `!needsChoice`), `runScreens.showNext` | S | Screens; the sim doesn't bet |
| D6 | **More weekly edges and pairs, no overlap with challenges, and a difficulty band** | `meta.ts WEEKLY_PAIRS`, `weekly()` | S | `challenges.ts 300 26`: every week 8–25% random-draft; no week equal to a challenge's machine+edges |
| D7 | **Dedupe heals** in the relic draft: if the catch-up full heal is added, swap the third card's heal for maxHp or a swap | `run.ts:1313-1321` | S | A unit test: no draft holds two `heal` cards |
| D8 | **Show the edges for the whole run**, and name the challenge on the run-over | `runScreens` map header, the HUD's stake line, `drawOver` header; RESULTS "NEW CHALLENGE BEST" only past fight 6 or after a 2nd try | S | Screens |
| D9 | **One naming rule**: machine name in menus and run-over ("THORN"), hero name in flavour only; or rename the THORN machine BRIAR. **The user decides.** | `menus.ts`, `daily.ts`, `meta.ts` | S | grep |
| D10 | SWEEP UP rework; BLUE/GOLD step. **Not now**, batch with the charm pass | `run.ts` big choices, `stakes.ts` | S | tuesday big-choice table, ladder |
| D11 | Locked titles: requirement under each chip, like the trims' "LV 12"; re-check counters live on TROPHIES | `menus.ts:506-560` | S | Screen |
| D12 | **Not now** (agreed in round 9) | – | – | – |

**D2 details:**
- **Run-over:** give the recap + unlock lines their own 34 px band by shrinking the table panel when there are 2 lines (`330 - top - 14`), or put the unlock on the RESULTS card only. It's already there ("NEW SLOT MACHINE: TESLA, THORN"), so drop it from the run-over entirely.
- **Liens:**
  - put "HELD BY THE REPO MAN" on its own row *under* the reel columns (like the LV row);
  - list at most 2 ("KEEN SWORD R2 +1 MORE");
  - or put a red lock icon on the reel count itself.
- **CHALLENGES:** wrap the setup line to 2 lines, capped at the title column's x, or drop the edge rules to their titles ("HIGH ROLLERS + GLASS JAW + FAST HANDS") with the full rules on hover.
- **MIDAS rule:** cut it to 4 lines: "GOLD BARS PAY CHIPS AND FILL THE VAULT. FULL VAULT: NEXT PAY X1 + CHIPS/20 (MAX X3). CASHIER 20% OFF. 360 HP."
- **The REPO preview:** "REPO ON HIS 1ST TURN, THEN EVERY 3: YOUR BEST CELL (CHARMED FIRST), HELD UNTIL THE BOSS FALLS." The subtitle already says the rest.
- **SOUND:** move it into the top bar on list screens.

**D4 details:**
- **MIDAS:**
  - the REPO MAN's first turn comes before MIDAS's opening burst can kill him (he acts first, like the Dealer's first deal); or
  - MIDAS `gate` 0.8 → 1.0. MIDAS WHITE is now 42.8, so it has the room.
- **Make the lien felt at the boss:** the boss intro line names it ("THE HOUSE HOLDS YOUR GOLD SWORD (R1)") and returns it with a pop when he falls.
  - That's presentation only; it doesn't change the numbers, and it turns 2.8 abstract points into a story.
- **His own take animation** (a tow hook, orange) instead of the rat's claw: art agent, S.

**D5 details:**
- On a fork node, show the table after the fork pick (or under the two cards), sized for the chosen enemy.
- That gives act 1 bets at fights 2–5, and the first one comes against a regular.
- Keep fight 1 bet-free.

**D6 details:**
- **Pairs:**
  - add ROLLERS+FRAIL back, plus a pair with HALF HEALS or HOUSE CUT;
  - pick the pair per week so (machine, edges) never equals a challenge's;
  - re-roll the week's seed if the random-draft rate is <8% or >25% (the seed is data, so measure it offline and ship a table).
- **Not now:** a 4th edge type (that's content).

---

## 4. CHARM AND RELIC DESIRABILITY AUDIT (extra scope from the user)

### Method
- **`builds.ts 300 charms`:** paired seeds, GREEN, all 5 machines, a greedy drafter forced to take only one charm type (cards and its level cards).
  - It's an upper bound: the drafter takes that charm over everything else.
  - The rows for charms a machine can't take double as a **no-charms control**.
- **BULWARK:** builds.ts skips it, so I measured it with `e10_audit.ts 300 spiked`, same method.
- **Relics:** `e10_relics.ts 120` = builds.ts's relic rows (start the run holding the relic), sharded.
  - At N=120 per machine the per-cell SE is about 2.7 points; the average's is about 1.2.
- **Held vs won:** `e10_audit.ts 300 held random`: a random drafter, GREEN.
  - For each charm or relic: % of runs holding it at the end, and the win% with vs without.
  - It's observational: anything offered only in act 2+ (legendaries) looks great because holding it means you survived act 1. Read it for *offer frequency* and the machine-identity relics, not as a value.
- **Greedy pick rates are meaningless for this question.** The greedy drafter uses hand-set values (`simulateRun.ts:38-113`: `spiked: 0`, `keen: 6.5`, `gold: 9`), so its "pick rate" is our own opinion played back. That's also a D1 finding: the official balance tables encode the assumption that nobody takes BULWARK.

### Charms

| charm | rule (L1) | can go on | verdict | evidence |
|---|---|---|---|---|
| **VAMP** | heals 20 when its sword group hits | swords | **ALWAYS-PICK** | 21.0 avg vs 10.4; JOKER 41.0, MIDAS 24.0. The only charm that beats no-charms on JOKER |
| **GOLD** | ×2 share of the group mult, adds | sword/shield/bolt | Good, swingy | 13.2 avg; JOKER 22.0, but MIDAS 5.7 (MIDAS gets gold anyway; forcing only gold costs its vamp) |
| **LUCKY** | 40% to land as a WILD | sword/shield/bolt (not KNIGHT/MIDAS) | OK | 12.6; BRIAR 23.3. Random audit: JOKER runs holding lucky won 45% vs 1% (lucky + HORSESHOE is JOKER's real engine) |
| **CHARGED** | +5 to the bolt group | bolts (TESLA) | Weak | TESLA 10.0 vs 9.0 baseline. Random audit: TESLA holds it in 95% of runs (it's TESLA's "favors"), so it's a tax |
| **BLAZE** | special +10 per blaze cell | bolts (TESLA) | OK | TESLA 13.0 |
| **KEEN** | +20 to the sword group, pierces shields | swords | **TRAP, everywhere** | 7.4 avg, below no-charms on every machine (KNIGHT 3.7 vs 5.3; MIDAS 3.0 vs 5.0) |
| **BULWARK** (`spiked`) | shield cell hits for 50% of its share | shields, **KNIGHT only** | **TRAP** | KNIGHT **1.0** vs 7.7 baseline and 5.3 with no charms at all |

**Why KEEN loses:**
- +20 BASE on one sword (L1 sword = 10 per symbol, so a 3-sword group is 30 → 50) is a flat +67% *only when that cell is on the payline in a sword group*. A charmed cell is 1 of 12+ on its strip.
- GOLD's ×2 on the same cell doubles the whole group, and VAMP's heal keeps you alive between hits.
- "Pierces shields" matters only against shield-heavy enemies. KEEN is also the one charm the Mirror doesn't copy (`run.ts:573`), and it still loses, so the problem is the number.

**Why VAMP dominates:**
- HP carries between fights, and heals are scarce (BANDAGE, the heal cards, ROSE HIP).
- A heal on *every* sword-group hit is sustain that scales with how often you hit, which is exactly what the act 3 regulars and the Dealer test.
- On JOKER, wilds complete sword groups more often, so VAMP triggers more.

**Why BULWARK kills KNIGHT:**
- KNIGHT is "half swords, half shields". BULWARK on a shield adds 50% of the shield's share as *damage*.
- But taking only BULWARK means KNIGHT never takes the level/gold cards that make its swords lethal, and its shields already cap at "block".
- The base rate is low (50%), and the charm turns defence into a trickle of damage.

**Proposed charm changes (keep: cells, BASE × MULT, gold adds, levels on the type, cap 3):**

1. **VAMP nerf:**
   - heals 20/30/40 → **15/20/30** (L4: 40);
   - and **at most one VAMP heal per spin per group**: today every vamp cell in a hitting group heals, so 3 vamp cells = 60.
   - **Measure:** "only vamp" ≤ baseline + 5 on every machine (JOKER from 41 toward ~20).
2. **KEEN rework**, "the finisher", so it stops competing with GOLD for the same slot:
   - **+20 BASE, and the group pays ×2 against a shielded enemy** (instead of plain "pierces"); or
   - simpler: **KEEN's +N applies to every sword in its group, not just once** (3 swords in a keen group: +20 each).
   - Either makes a 3-keen reel a real build. EXECUTIONER (keen ×3 under half HP) then becomes the payoff relic it was meant to be.
   - **Target:** "only keen" ≥ baseline on KNIGHT and MIDAS.
3. **BULWARK rework**, "the shield that counts":
   - a BULWARK shield **counts as a sword for pairs and jackpots** (it completes sword groups) while still blocking; or
   - raise the damage to **100/125/150%** of its share and drop the "only its share" clause.
   - KNIGHT should *want* it: it's the shield machine's own charm. Also give `spiked` a real value in `simulateRun.ts` (about 6.5) so the official tables include it.
   - **Target:** "only spiked" KNIGHT ≥ 7.
4. **CHARGED:**
   - +5/10/15 → **+10/15/20**; or
   - fold it into BLAZE so TESLA has one sharp charm instead of a tax plus a good one.
   - TESLA holds it in 95% of random runs, so it should be worth holding.
5. **Signature-symbol charms**: the structural fix for BRIAR, JOKER and MIDAS.
   - Today a charm can't sit on a thorn, a wild or a gold bar without a specific relic. So on those 3 machines, charm cards compete with the swaps that build the machine and lose (no-charms beats greedy on BRIAR by 8.7 and on JOKER by 12.6).
   - **Let GOLD and one machine charm go on the signature symbol by default:**
     - BRIAR: GOLD on thorns, ×2 a volley's share;
     - JOKER: LUCKY on wilds = "a lucky wild pays as a jackpot of its group";
     - MIDAS: VAMP on gold bars = "heals when a gold bar pays chips".
   - GRAFT and STACKED DECK then become "more of it" relics instead of gatekeepers.
   - **Measure:** "no charms" ≤ baseline on every machine.

### Relics

**`e10_relics.ts 120`** (GREEN, start holding the relic; columns: avg | knight tesla thorn joker midas):
- The baseline is 9.0 | 7.5 9.2 10.0 5.8 12.5.
- **The "does nothing" row is 8.5 | 5.8 7.5 10.0 7.5 11.7.** That's what MARKER, LOADED, HIGH LIMIT and the retired DECREE all score: the sim doesn't bet, and every relic you hold adds boss HP.
- **So the real zero for a relic is about 8.5.** The SE of the average is about 1.2.
- Machine relics in the "own machine" column are the only meaningful cell; the other columns are hypothetical.

| relic | avg | own machine / notable cells | verdict |
|---|---|---|---|
| **JACKPOT BELL** (leg.) | **30.0** | **JOKER 77.5** (vs 5.8), BRIAR 30.8 | **Broken on JOKER.** It doubles JOKER's whole meter loop (jackpots ×2 *and* fill the meter). Nerf on JOKER: "JACKPOTS PAY X2" only, or ×1.5 for JOKER |
| **VAMPIRE FANG** (common!) | **21.2** | **TESLA 36.7** (vs 9.2), BRIAR 30.8 | **Auto-pick on TESLA/BRIAR, as a common.** It already has a BRIAR clause (10 instead of 30) and is still +20. TESLA's lightning fires often, so +30 per payoff is huge. Make it 15 for TESLA, or move it to uncommon with per-machine numbers |
| UNDERDOG | 18.3 | TESLA 22.5, BRIAR 20.8 | Strong but conditional; fine |
| GOLDEN TICKET (leg.) | 18.0 | even, 15–19 | A good legendary; fine |
| PHOENIX (leg.) | 17.2 | JOKER 21.7, MIDAS 20.0 | Fine |
| KING'S VAULT (MIDAS) | 16.3 | MIDAS 15.0 (zero is 11.7) | Modest +3 |
| SKELETON KEY (leg.) | 16.0 | even | Fine |
| BANDAGE | 15.8 | KNIGHT 20.0 | **The best common.** Sustain again: confirms that heals are the scarce resource |
| WAR DRUM / CHAINMAIL (KNIGHT) | 12.7 / 13.3 | KNIGHT 15.8 / 13.3 (zero is 5.8) | Good on their machine |
| GRAFT / CACTUS / ROSE HIP (BRIAR) | 11.8 / 10.8 / 10.5 | BRIAR **26.7 / 21.7 / 20.0** (zero is 10.0) | Strong on BRIAR. GRAFT is +17 (it lets gold and vamp onto thorns, which is the D1 signature-symbol fix by relic) |
| VAMPIRE'S KISS | 14.2 | **MIDAS 27.5** | VAMP again: vamp on any symbol = vamp on gold bars |
| FARADAY / STATIC / LIGHTNING ROD (TESLA) | 9.8 / 9.3 / **8.7** | TESLA 14.2 / 11.7 / **8.3** (zero is 7.5) | **LIGHTNING ROD is dead** ("YOUR CHARGED BOLTS MAKE YOUR LIGHTNING DEAL 90"), and STATIC is weak. TESLA's identity relics lose to a common (FANG) by 20+ points |
| CAP AND BELLS / STACKED DECK (JOKER) | 11.5 / 10.2 | JOKER 11.7 / 13.3 (zero is 7.5) | Weak next to BELL (77.5). STACKED DECK should be JOKER's build-around, and it's +6 |
| EXECUTIONER (hone) | 10.5 | about zero everywhere (JOKER 13.3) | **Dead**: it multiplies KEEN, which is a trap (D1) |
| BLOOD CHALICE | 10.5 | about zero | **Dead**: overheal is rare without VAMP stacks |
| SHIELD BASH | 9.7 | BRIAR **7.5** (below zero) | **Dead/negative** |
| HORSESHOE | 11.2 | JOKER 14.2 | Weak alone; with LUCKY it's JOKER's engine (random audit: held 13%, win 59% vs 11%) |
| MARKER / LOADED / HIGH LIMIT | 8.5 | – | Bet relics; the sim can't value them. They're 3 of 12 commons, so a quarter of common relic slots are invisible to every balance table |
| others (clover 13.0, battery 12.5, crown 13.0, piggy 15.2, trophy 14.5, holywater 13.3, mirror 15.3, prism 14.7, sandglass 14.8, firstblood 12.7, overcharge 12.2) | 12–15 | – | A healthy middle band |

**Relic fixes:**
- **BELL:** JOKER ×1.5, or drop "and fill your meter" for JOKER. **Target:** JOKER ≤ 30.
- **FANG:** heal 30 → 15 on TESLA, or make it uncommon. **Target:** TESLA ≤ 20.
- **Raise the dead ones to the 12–15 band:**
  - LIGHTNING ROD: "LIGHTNING DEALS +30 PER CHARGED BOLT YOU OWN", so it scales instead of being a fixed 90.
  - EXECUTIONER: rides on the KEEN rework.
  - BLOOD CHALICE: "HEALING PAST FULL BECOMES SHIELD, AND YOU START EACH FIGHT WITH 10% OF IT".
  - SHIELD BASH: "full" instead of "half".
- **TESLA's and JOKER's identity relics:** the identity slot is offered in every relic draft ("one relic card per draft is yours"), so a weak identity relic is a wasted card most drafts.
- **Measure:** `e10_relics.ts 120` before and after; no relic avg > 20, none below the zero + 2 on its own machine; tuesday gates hold.

### NEW relics (3–6), each built to create a decision

| name | effect (card text) | builds around | the decision it creates |
|---|---|---|---|
| **SPLIT POT** (uncommon) | "YOUR GOLD CHARMS ALSO COUNT FOR THE REEL NEXT TO THEM" | GOLD, every machine | Gold is a stack-it-on-one-reel charm today. This rewards *spreading* gold, so "3 GOLD CHARMS, REEL 2" vs "REEL 1" stops being a coin flip, and it competes with MIDAS's natural gold stacking |
| **WHETSTONE BELT** (common, KNIGHT) | "EACH BLOCKED HIT GIVES YOUR NEXT SWORD GROUP +10 (MAX +40)" | KNIGHT shields → swords | KNIGHT has two identity relics, both near baseline (WAR DRUM, CHAINMAIL: held in 73–75% of random KNIGHT runs, win 5–6% vs 1–3%). This one ties shields to damage without a charm, and the choice is "turtle and counter" vs "WAR DRUM race" |
| **THIN BLOOD** (uncommon, cost relic) | "VAMP CHARMS HEAL DOUBLE. YOU CAN'T HEAL ANY OTHER WAY" (no BANDAGE, no catch-up heal, no Rose Hip) | VAMP | Turns the auto-pick into a commitment with a price: it shuts off the heal cards, which also fixes D7's dead heal card for that player |
| **TOLL BOOTH** (uncommon) | "THE REPO MAN TAKES FROM HIS OWN REELS FIRST: EACH LIEN HE HOLDS IS +1 CHIP AFTER EACH WIN" | THE REPO MAN / liens | Makes carrying liens a *strategy* (keep them, farm chips for the Cashier) vs PAY OFF A LIEN, so the round-9 lien system finally creates a decision |
| **LOADED REEL** (legendary) | "ONE REEL OF YOUR CHOICE NEVER GETS FROZEN, SLIMED OR STOLEN FROM" (chosen when taken, between fights) | anti-cheat; every machine | A defensive legendary against the game's identity ("they write on your machine"). It's the pick-your-reel decision, made between fights, so fights stay watch-only |
| **HOT STREAK** (common) | "AFTER A JACKPOT, YOUR NEXT SPIN PAYS X2. AFTER A MISS, IT'S GONE" | JOKER / LUCKY / anything jackpot-heavy | A volatility relic for the slot fantasy. It competes with SKELETON KEY (pairs ×2): consistent vs streaky |

All six are text a player can read and evaluate. None carries an EV or a "FITS" hint, and none adds in-fight input.

### Summary for the user
- **Dominant:**
  - VAMP (every machine, hugely on JOKER/MIDAS) and its relic VAMPIRE'S KISS on MIDAS (27.5);
  - **JACKPOT BELL on JOKER (77.5 vs 5.8)**;
  - VAMPIRE FANG, a *common*, on TESLA/BRIAR (36.7 vs 9.2, 30.8 vs 10.0).
- **Dead/traps:**
  - KEEN (everywhere) and its relic EXECUTIONER;
  - BULWARK on KNIGHT;
  - CHARGED (a tax TESLA always holds) and LIGHTNING ROD;
  - BLOOD CHALICE and SHIELD BASH;
  - and, on BRIAR/JOKER, *charms in general*.
- **The pattern:** sustain wins this game. The top picks (VAMP, FANG, KISS, BANDAGE) are all heals. Every damage-only add-on (KEEN, ROD, BASH, EXECUTIONER, BULWARK) is at zero or below.
  - The fix is to make damage charms *multiply* (scale with group size or charm count) rather than add a flat +20, and to price the heals.
- **Machine identity relics** are offered in every relic draft ("one relic card per draft is yours") and held in 57–83% of random runs, but their held win rate is close to their machine's baseline. They crowd out more interesting picks; see the relic table.

---

## 5. RECOMMENDED ORDER (top 5)
1. **D2 layout pass** (S): four collisions on screens every playtester hits (the run-over unlock, liens, BAD BLOOD, the MIDAS card). Add a Playwright screenshot script, so the next layout fix is checked by eye before it ships.
2. **D1 charm and relic pass** (M):
   - VAMP nerf; KEEN and BULWARK reworks; BELL (JOKER) and FANG (TESLA) nerfs.
   - Give `spiked` a real sim value first, so the "before" numbers are honest.
   - Gate it with `builds.ts 300 charms` + `e10_relics.ts 120` + tuesday 1000.
   - Signature-symbol charms come second, as their own measured step.
3. **D7 + D5 + D8** (S each): dedupe the heal card; bets on fork nodes (first table at fight 2); keep challenge and weekly edges visible all run.
4. **D6 weekly variety** (S): more pairs, no challenge duplicates, seeds banded to 8–25%.
5. **D4 REPO MAN** (S): fix the preview text; MIDAS gate HP or his first-turn timing; name the held cell at the boss intro. D3 (LATER on the name screen) rides along with any of these: it's a 10-line change.

**Not now:** D10 (SWEEP UP, the BLUE/GOLD step; batch them with the charm pass), D12 (pacing), the new relics (after the charm pass settles the numbers they'd be tuned against).

---

## AGREED PLAN (dev + playtester, 2026-10-03)
1. **D2 layout:**
   - fix the four collisions, plus the REPO MAN preview line and the 18-row dividers;
   - add a committed screenshot script, `tools/shots/screens.cjs`.
2. **D1 charms**, measured with builds.ts 300 charms + e10_audit spiked + tuesday 1000:
   - **a.** Give `spiked` a greedy value of 6.5 first.
   - **b.** VAMP 15/20/30, one heal per group per spin.
   - **c.** KEEN's +N applies to every sword in its group. Watch JOKER.
   - **d.** BULWARK damage 100/125/150% of its share. Target: KNIGHT ≈ 7.7.
   - **e.** CHARGED +10/15/20.
3. **Relics:**
   - BELL on JOKER ×1.5 and FANG 15 on TESLA, measured first;
   - then LIGHTNING ROD scaling, SHIELD BASH full, BLOOD CHALICE overheal → shield.
4. **New relics:** HOT STREAK, WHETSTONE BELT, TOLL BOOTH, with art from the art agent.
5. ~~D5~~ was the playtester's error: forks re-show the table after a pick.
6. **D3:** offline copy on the name screen; no LATER (the user asked for a name at login).
7. **D7 / D8:**
   - D7: dedupe the heal cards.
   - D8: the twist on the fight HUD all run; NEW BEST only when a previous best exists.
8. **D6:** more weekly pairs, never a challenge's exact setup. Seed banding later.
9. **D4:** correct preview timing; the boss intro names what it gives back.
10. **D9:** use the machine name on the daily menu row (it matches the weekly row).

**Not now:** signature-symbol charms (next round), D10, D11, D12.
