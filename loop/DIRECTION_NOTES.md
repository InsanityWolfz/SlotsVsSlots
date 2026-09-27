# Direction notes — user's spiel (2026-09-26), for the Tuesday expert review

Status: discussion only. No code until after the usage reset (Tue 2026-09-29). Then: expert roguelike/slot playtester reviews this, and we decide what to build.

## Quick fixes (decided)
- **Rat thief:** only a jackpot of the "nothing" (stolen) cells clears the stolen squares, all of them, the same as slime. Leave slime as it is.
- **Preps (counter relics):** weak, and it's unclear whether they're upgrades, relics or a third thing. Either a mega-buff plus a clear menu place, or remove entirely for readability.
- **Vampire Fang heals on the Overcharge echo:** yes.
- **Overheal relic idea:** e.g. excess healing becomes shield. Could be one per slot machine type, or general.
- **Act 3:** make it as long as the other acts (5 fights + the Dealer). Scale the in-between monsters up; right now they're one-shot, so nobody learns their abilities.

## Held / struck
- **Rename SLOTS VS. BOTS:** on hold (maybe too robot-themed).
- **16-bit art:** only if it doesn't mean remaking everything.
- **Gambler character:** struck for now. Focus on the 5 core slot machines (maybe up to 10 someday). The chip charm is saved for a future Gambler.

## Lightning (TESLA)
- Lightning is too strong (every build goes lightning). It moves to TESLA only, and stays as it is while the other characters are built.
- **Must fix: endless strikes.** 300+ energy plus the Overcharge echo means a very long wait, even at 4x. Options:
  - fold strikes into fewer, bigger ones;
  - pre-count the strikes and speed the presentation up to match.

## Symbols
- All symbol conversions available at low quantities: shield to sword, sword to shield, etc., not just shield to bolt.
- **KNIGHT:** keep it simple. Half swords, half shields at the start. Maybe later a sword/shield combo symbol that does both.
- KNIGHT may have **no special at all**: it's the base machine, keeping early complexity down. Ask the expert.

## Charms: decouple from symbols (big rework)
- **Problems today:**
  - A charm covers every cell of a symbol on a reel, so new symbols inherit it and you're locked in.
  - Two charms can't share a symbol type on one reel.
  - MIDAS runs lock into gold swords early.
- **Proposal:**
  - A charm card applies N charms to N cells of a reel. The user suggested random cells; open question whether the player picks the symbol.
  - New symbols arrive uncharmed.
  - One charm per cell (visual clarity).
- **Remove FULL SETS entirely** (too confusing). Their power moves to levels:
  - **Charm levels:** e.g. "Gold Charm Lvl 2" in the shop once every reel has a gold charm.
  - **Symbol levels:** "Swords Lvl 2" raises base damage 1 to 2.
- **Math:** symbol level (base) × charm effect (gold x2 / keen + / vamp heal / lucky...) × relic multipliers. A lvl 2 sword with gold = 4 before line bonuses.
- Relics per charm type, to balance the scaling.
- **Goal:** every symbol type viable, and more build variety.
- **Post-boss "big choices"** (bail-outs or pivots):
  - turn all X charms into Y charms;
  - remove all shields from a reel;
  - other build-defining moves.

## Character specials: one signature symbol per slot machine, each feeding a meter
- **TESLA:** the lightning bolt (as now; the playtest favourite). Lightning-only upgrades appear only on TESLA runs.
- **MIDAS:** keeps its gold swords. A gold bar symbol fills a meter (~5), then the next attack is x4 (tunable). A chase: "I hope my next roll is a big attack." Maybe block benefits too. Open to better ideas.
- **BRIAR:** replace spiked shields (too strong, and they feel bad when the enemy doesn't attack next turn).
  - A THORN symbol banks thorns damage, based on its pay.
  - When you're hit, the bank fires at the enemy, then clears.
  - Relic hooks: shield = 10% of thorns; sacrifice HP to double thorns; etc.
- **JESTER JAX (jackpot guy):**
  - A signature symbol (TBD) fills a 10-point meter.
  - When it fires, the next spin's 3 payline cells each pay as a jackpot, e.g. sword, shield, shield = 9 damage and 18 shield.
  - A signature symbol during the payoff refills the meter (like a jackpot of it).
  - **Wild jackpots:** a triple wild pops a small bonus reel that picks one of your jackpot-able symbols (no rock, bomb or slimed/disabled cells) and pays that jackpot. During the payoff, a wild cell rolls a random symbol jackpot. This also answers "what do 3 wilds do".
- **KNIGHT:** maybe no special (see above).

## More reels / paylines
- Players want them, but balancing gets insane.
- Idea: keep acts 1-3 at 3x3 with one payline. After act 3, an ENDLESS mode scales content exponentially: more reels/paylines, random enemies, new bosses. Just avoid infinite damage/HP bugs.
