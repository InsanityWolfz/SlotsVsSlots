# MIDAS: a new special (expert playtester, 2026-09-28)

Three options for MIDAS's signature meter, with sim numbers. My pick is **MIDAS TOUCH**.

- Harness: `tools/balance/midas_special.ts` (throwaway; it monkeypatches `Fight` and does not touch `src/`).
  - It gives MIDAS a custom meter kind, so none of the working tree's x4 experiments run (pair-only, +1 stack, free spins).
  - It rebuilds the live x4 as a control. The control reproduces the logged numbers: WHITE 23.8 / GREEN 9.3 / Dealer 57.4
    at N 2000, against 22.7 / 8.1 / 56.6 in STATE.md.
- Method: the greedy sim, seed 4242, N 2000 unless noted. WHITE is stake 0; GREEN is stake 2 with act 3.
- "Current BOSS_MUL" means the committed live values: `midas: { house: 2.8, mirror: 5, dealer: 1.4, act3: 0.1 }`.
  The working tree's 12 / 30 / 7.5 belongs to the free-spin experiment.
- Relic probes: GREEN, no starting pick, seed 777, N 1000. The noise is about ±1.5.

---

## Three findings that shaped all three options

1. **The "wasted bars" feeling is built into the numbers, not bad luck.**
   - Gold bar levels and gold charms make each bar fill far more than 10 later in a run.
   - When a payoff fires, the meter would hold **9 to 25 full meters' worth** of gold (8.7x to 25.6x, measured). 70 to 80% of
     payoffs fire with at least 2x full.
   - Under the live cap, almost every bar after mid act 1 lands on a full meter and does nothing.
   - **All three options therefore keep gold past full.** The number keeps counting (GOLD 60/20), and each payoff spends 20.
     No bar is ever lost.
   - Spending every full meter at once was measured and is worse. MIDAS TOUCH fell from WHITE 27.3 to 16.8, because the heal
     comes once per payoff and there are fewer payoffs.
2. **The heal on each payoff is MIDAS's biggest lever. The House and the Mirror barely respond to HP.**
   - Heal 20 → 0 takes MIDAS TOUCH from WHITE 30.0 to 9.5 (act 1 58 → 19).
   - For MIDAS TOUCH, House HP x2.8 → x8 moves the House only from 90% to 87%.
   - Mirror x3 → x20 moves the Mirror from 82% to 58%.
   - The Dealer does respond to HP.
   - So cost and heal are the real knobs. `house` and `mirror` are weak ones.
3. **Why the free-spin trial made bosses trivial.**
   - The measured-power sizer (`machinePower` in run.ts) counts every player `step()` as one turn.
   - The working tree's free spin returns as a separate player step, so a two-spin round is measured as two ordinary turns.
     Bosses get sized for half the real output.
   - Heal per spin on top of that makes MIDAS nearly impossible to kill.
   - With heal 20, GOLD RUSH (below) still won the House 94% at House HP x12. In my harness, the extra spin counts inside the same turn.

---

## Option 1: MIDAS TOUCH (recommended)

**Rule**
- Gold bars fill the meter: 10 per bar at level 1, the same as now.
- **Cost 20** (two bars). Gold past full is kept.
- When the meter is full, your **next spin that shows a sword or shield** fires the touch:
  - Every sword and shield on the payline gains a **gold touch**: x2, at your gold charm level.
  - A touch ADDS with gold charms, the same way charms already add. A plain touched sword pays x2. A gold-charmed touched
    sword pays x4.
  - The touch pays on that spin and **stays on that cell for the rest of the fight**.
  - A cell holds up to **3 touches** (+x6). Touched cells come back around as the reels spin.
- Each touch spends 20 and **heals 20**.
- A spin with no sword or shield waits, and bars keep counting meanwhile.
- Gold bars are never touched. They stay the fuel.
- Touches last for this fight only; nothing carries into the run.

**Card text:** `GOLD BARS FILL THE METER. FULL: THE SWORDS AND SHIELDS ON YOUR NEXT SPIN TURN GOLD FOR THE FIGHT. +1 CHIP A WIN. 190 HP.`

**On screen**
- Meter: a gold bar with a number, reading `GOLD 14/20`. Past full, the bar glows and the number keeps climbing (`GOLD 60`).
- On the touch, a small sparkle runs along the payline, local to MIDAS's machine with no full-screen flash, and each
  sword or shield flips to gold.
- A touched cell gets a gold border with 1 to 3 pips. The player watches their machine turn gold over the fight, which is
  "EVERYTHING IT TOUCHES..." made literal.
- The math uses the existing gold note (`X4 GOLD`), so there is **no separate x4 banner** to overlap the pay-math banner.
  That also fixes playtest note 1.

**Numbers** (N 2000)

| BOSS_MUL.midas | WHITE | act 1 | House | Mirror | GREEN | Dealer |
|---|---|---|---|---|---|---|
| live x4 (control), 2.8 / 5 / 1.4 | 23.8 | 51.8 | 85.8 | 70.9 | 9.3 | 57.4 |
| TOUCH at current 2.8 / 5 / 1.4 | 30.0 | 58.3 | 90.5 | 75.1 | 12.9 | 58.9 |
| **TOUCH tuned: house 3.5, mirror 12, dealer 1.4** (act3 0.1) | **26.1** | 57.7 | 89.5 | 66.8 | **10.4** | **56.2** |
| TOUCH with a max of 2 touches per cell, current MUL | 27.4 | 56.9 | 90.5 | 73.6 | 10.3 | 54.8 |

- The tuned row lands on target. Because the House and the Mirror knobs are weak (finding 2), a more robust way to shave
  WHITE is the max of 2 touches per cell (row 4).
- Cost 30 is too slow for act 1: WHITE 15.3, act 1 34.

**Variance**
- Best single turn against a boss: 33 to 37% of its HP on average (live x4: 35%).
- Turns of 50% or more: 15 to 20% of boss fights (live: 21%).
- One-shots: 0.0 to 0.1% (live: 0.2%).
- The power arrives as a ramp through the fight rather than as spikes, so boss fights get their climb. It does not one-shot.

**Relics**
- **KING'S VAULT**, my pick: `AFTER EACH WIN, ONE OF YOUR SWORDS KEEPS ITS GOLD FOR GOOD.`
  - Mechanically, +1 gold charm on a sword per win.
  - Measured +1.7 (live vault +2.6).
  - The alternative "gold charms fit gold bars; a charmed bar touches the payline for free" measured +0.3: dead.
- **ROYAL DECREE**: `YOUR TOUCH SPREADS TO THE CELLS ABOVE AND BELOW.` Measured +2.0.
  - Live decree was the strongest MIDAS relic at +7.2 in this probe, so this is healthier.
- **Meter relics** (MACHINE_TEXT midas: "YOUR X4" becomes "YOUR TOUCH"):
  - Battery: the meter starts 60% full.
  - Fang: the touch heals 30 more.
  - Overcharge: the touch spin echoes 1/3.
  - Bell: a jackpot fills the meter, which means one touch.

**Why it's #1**
- It fits the theme best.
- There is no wasted moment: bars always count, and a touch always lands on something you can see.
- It reads well: gold cells on the reels, plus one number.
- It isn't JAX, whose payoff is one special spin. This is a lasting change to your machine.
- It uses the charm system players already know ("gold charms ADD").

**Risk**
- The late-fight ceiling in long boss fights. The 3-touch cap holds it, and the 2-touch cap is the fallback.

---

## Option 2: SOLID GOLD SPIN (the x4, fixed)

**Rule**
- Cost 20. Gold past full is kept.
- When full, your **next spin that shows a sword or shield is SOLID GOLD**: every sword and shield on the payline counts
  one extra gold charm, x2, adding.
  - A single sword pays x2, a pair x4, a jackpot x6, and a gold-charmed pair x6.
- Heals 20. At most one Solid Gold spin per spin, 20 each.
- Singles no longer use it up for x4 on 10 damage, and bars are never wasted.

**Card text:** `GOLD BARS FILL THE METER. FULL: YOUR NEXT SPIN IS SOLID GOLD. EVERY SWORD AND SHIELD ON IT COUNTS AS GOLD.`

**On screen**
- The payline frame on MIDAS's machine turns gold before the reels stop, with a `SOLID GOLD` plate on the machine.
- The pay banner shows the gold in its usual place (`X4 GOLD`).
- The meter is the same bar with a number.

**Numbers** (N 2000)

| BOSS_MUL.midas | WHITE | act 1 | House | Mirror | GREEN | Dealer |
|---|---|---|---|---|---|---|
| current 2.8 / 5 / 1.4 | 27.6 | 54.7 | 91.5 | 76.0 | 10.6 | 55.4 |
| **tuned: house 2.8, mirror 8, dealer 1.3** | **24.7** | 54.7 | 91.5 | 68.1 | **10.3** | **57.3** |

**Variance:** the best boss turn averages 33 to 35% of its HP; 50% or more in 14 to 15% of boss fights; one-shots 0.2%.
The additive gold tames the live x4 on gold swords: a gold pair was x16 and is now x6.

**Relics**
- **KING'S VAULT**: `GOLD CHARMS FIT GOLD BARS. THEIR GOLD ADDS UP INTO YOUR NEXT SOLID GOLD SPIN.` Measured +2.5.
- **ROYAL DECREE**: `YOUR SOLID GOLD SPIN COUNTS GOLD BARS TOO` (bars on it fill x2). Measured +4.0.

**Why it's #2**
- It's the cheapest change and the closest to what players already know. The numbers are on target with one knob.
- But its shape, "the next spin is special", is JAX's payoff shape.
- It also has no arc inside a fight.

---

## Option 3: GOLD RUSH (the user's free-spin idea, made safe)

**Rule**
- **Cost 30.** Gold past full is kept.
- When full, right after your spin you **spin again at once**, and the enemy waits.
- The extra spin spends 30 and **heals 10, not 20**.
- **One extra spin per turn.** Shields from both spins stack.
- The sizer must count the extra spin inside the same turn (finding 3). That's an engine change to `machinePower`, or
  folding the extra spin into one `step()` as my harness does.

**Card text:** `GOLD BARS FILL THE METER. FULL: SPIN AGAIN RIGHT AWAY (THE ENEMY WAITS).`

**On screen**
- A `GOLD RUSH!` plate and a coin shower on MIDAS's machine only, then the reels spin again.
- The meter drops by 30.

**Numbers** (N 2000)

| BOSS_MUL.midas | WHITE | act 1 | House | Mirror | GREEN | Dealer |
|---|---|---|---|---|---|---|
| current 2.8 / 5 / 1.4 | 30.4 | 49.1 | 92.0 | 74.9 | 13.1 | 53.9 |
| **tuned: house 6, mirror 20, dealer 1.5, act3 0.5** | **24.2** | 47.0 | 88.1 | 57.6 | **11.8** | **59.8** |

- About `dealer: 1.6` would land the Dealer near 57.
- With heal 20, the bosses stop responding: the House stays at 94% even at house x12 and mirror x40.

**Variance:** the lowest of the three. The best boss turn averages 13 to 23% of its HP; 50% or more in 1 to 2.5% of boss
fights; no one-shots.

**Relics**
- **ROYAL DECREE**: `YOUR EXTRA SPIN PAYS X1.5.` Measured +4.0. At x2 it measured +8.4, which is too strong.
- **KING'S VAULT**: `GOLD CHARMS FIT GOLD BARS. A CHARMED GOLD BAR ON YOUR EXTRA SPIN GIVES ONE MORE (MAX 2 A TURN).`
  Measured +1.4. This is the user's "keep getting free spins", with a cap.

**Why it's #3 (push-back on the user's idea)**
- Act 1 is its weak spot (47 to 49, against 55 to 58), and the bosses are nearly flat at 88 to 92% House.
- Late in a run the meter holds about 45 full meters' worth of gold, so the rush fires every turn. It stops being an event
  and becomes "MIDAS takes two turns".
- It also halves how often the enemy's writes land relative to your spins, which blunts the enemy slot machines' identities.
- It feels great in act 1 and turns into autopilot later.

---

## Rejected, with numbers
- **GILD THE FOE** (a full meter turns an enemy sword into a dead gold statue):
  - At cost 20: WHITE 66.7. At cost 40: WHITE 17.0, with act 1 fights of **36 turns** (normal is 18 to 22).
  - It shrinks the enemy instead of growing you, so watch-only fights drag.
- **Touch a random cell anywhere** (no payline, no stacking): WHITE 16.9, act 1 28.9. It's too slow for act 1, because x2 on
  one cell in 36 barely shows.
- **Spend all full meters at once**: worse for every option (finding 1).

## On the user's notes
1. **Banner overlap:** MIDAS TOUCH and SOLID GOLD put their gold into the existing `X_ GOLD` note, so there is no second banner.
2. **"Having the 4x ready and hitting bars felt bad":** fixed in all three, because gold past full is kept and counts up.
3. **"The 3-dot meter felt short":** the numbers say keep it short. Cost 20 is right for TOUCH, and cost 30 crashes act 1
   (WHITE 15.3). A bar whose number keeps climbing past full won't read as short.
4. **"Free spins until a pair or jackpot":** see GOLD RUSH. An uncapped version is the 90%+ the main session saw. A capped,
   heal-10 version balances but flattens the bosses.

## If MIDAS TOUCH is picked: implementation notes for the main session
- Meter kind `touch`; a per-fight `Map<cell, touches>`.
- In `score()`, add touches to the group's gold sum, reusing the `X_ GOLD` note.
- `fillMeter`: no cap. `armed` while energy ≥ cost. `payoff` does `energy -= cost`, not `= 0`.
- Revert the working tree's pair-only / `raiseStack` / `freeSpins` code, and set BOSS_MUL.midas to about 3.5 / 12 / 1.4 / 0.1.
- Re-measure `POWER_REF.midas` with `power_ref.ts`, then confirm with `tuesday.ts 2000` and log it in STATE.md.
- Relic text: MACHINE_TEXT midas ("YOUR TOUCH ..."); KING'S VAULT and ROYAL DECREE as above.
- Keep "bank" out of all of it.
