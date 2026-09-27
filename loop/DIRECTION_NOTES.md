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

## Follow-up decisions (same day)
- **Lightning storm:** 1 special = 1 normal strike. More than one = a LIGHTNING STORM whose length grows with the log of the strike count (~1.2 s for 2, ~2.5 s for 10, ~4 s for 300). Damage is unchanged.
- **Charms go on specific CELLS** (not the reel, not the symbol type). The engine already stores a charm per cell.
  - The card rolls its target cells when it's offered and shows them on the card, e.g. "3 GOLD CHARMS · REEL 1" with the target cells' symbols drawn (sword, sword, bolt). No extra menu, and speedrun-friendly.
  - Charms show on those exact cells on the reels and in the left strip map. New symbols arrive plain.
- **×10 numbers:** base symbol 10 (jackpot 30), level steps +1 (10 → 11), all HP ×10. More room for balancing.
- **Full sets removed**, replaced by symbol levels and charm levels.
- **Post-boss big choices:** pick 1 of 3. Strong options come with a real cost (e.g. "+1 level to ALL symbols, −10 HP"; "add GOLD to every uncharmed cell, −X"). Mild options have no downside, so there's always a safe pick. Have the expert draft the list.
- **Characters locked:** MIDAS ×4 applies to whatever lands on the payline. BRIAR thorns fire once per enemy turn, then clear (a "keep 10%" relic needs a cap). JAX's meter payoff stands, and the 3-wild rule (a bonus reel picks one of your symbols to pay a jackpot) applies to everyone. KNIGHT has no special; ask the expert for "simple but exciting".
- **Staging:** the user is confident shipping the changes together is fine. Keep the current live build as a reference anyway.
- **Art:** stays 8-bit.
- **Charm cards NAME the symbol:** "2 GOLD CHARMS · REEL 1 · SWORDS". They only target plain (uncharmed) cells and are only offered if enough exist. Charm fit rules stay (keen is swords only, etc.).
- **Random-charm card** ("3 random charms on reel 2", cheaper): later, once players know the charms.
- **Levels live on the TYPE, not the cell:** Gold Lvl 2 upgrades every gold charm, including ones added later. Swords Lvl 2 upgrades every sword, including ones added later.
- **Left panel:** replace the strip-order list with shop-style columns 1 2 3, one row per symbol+charm pair with a count (e.g. ⚔2, gold ⚔2, ⚡4).
- **Numbers on symbols** (readability):
  - base value in the bottom-left (white), charm tag in the top-right (coloured by charm: gold x2, keen +5 blue, vamp +3 red, charged +1 yellow...);
  - keep the art cues (gold tint, vamp blood);
  - numbers show only on the payline, popping in as each symbol lands.
- **Pay math:** BASE × MULT = TOTAL, shown as the payline pays (e.g. 30 × 18 = 540), no words.
  - BASE = sum of the group's symbol values.
  - MULT = jackpot/pair multiplier × gold multiplier. These two MULTIPLY together.
  - Gold charms in one group ADD together: x2 + x2 + x2 = x6. The label stays "x2" per cell.
  - Example: triple gold bolt (base 10 each) = 30 × (3 jackpot × 6 gold = 18) = 540.
- **Reel tables:** the left panel and the shop both use the vertical shop-style table.

## Tuesday plan: expert playtester tasks
1. Review this whole direction doc and push back where needed.
2. Draft the post-boss big choices list (strong with a cost, plus a safe pick).
3. KNIGHT: "simple but exciting with no special mechanic" ideas.
4. **Competitor comparison:**
   - Slot or Not, CloverPit, Slotbound, Slot or Die, Slots & Daggers (and others found).
   - For each: core loop, what players praise, what reviews complain about.
   - Where Slots vs. Slots is unique: machine vs. machine, enemies write on your reels, slot-mechanic bosses, hands-off fights, character meters.
   - Gaps to exploit, and risks (e.g. hands-off fights splitting players).
   - A suggested store pitch line (draft: "Your slot machine vs. theirs. They cheat.").
Then decide build order together.
