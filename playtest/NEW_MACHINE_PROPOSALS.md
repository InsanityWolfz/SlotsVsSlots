# New Slot Machine proposals: replacing BRIAR (2026-10-08, expert playtester)

Brief: replace BRIAR with something that feels different from KNIGHT (plain steel), DOC VOLTZ (charge, then a
lightning strike through shields), JESTER JAX (wilds, then a jackpot payoff) and CASH CASSIDY (chips as ammo and
economy). Fights stay watch-only. Enemies write on your reels; we never write on theirs.

## Ground rules from the code (they shaped every pitch)
- **Fights are short:** ~12-15 turns, so 6-8 of YOUR spins. A ramp that pays off on spin 9 never pays off.
- **The payline is 3 cells, scored in order.** LV1 symbol = 10, a pair pays x2 (40), a jackpot x3 (90).
  With a 6/6 strip, ~1.5 attack symbols land on the payline per spin.
- **The sizer (`machinePower`, run.ts:852)** plays 40 of your spins against a 99,999 HP dummy that only swings
  swords. It sees **damage dealt on your own spin, averaged over 40 spins.** Three blind spots follow:
  1. defence and sustain don't count (BRIAR's bug);
  2. anything that ramps within a fight gets over-read (the dummy fight is 40 spins long, real ones are ~7);
  3. the dummy never SABOTAGEs, so anything that reacts to sabotage doesn't count.
  Each concept below is graded against these three.
- **Cheap reuse:** any new attack symbol can join `BLADES` (config.ts), as ACE did. It then hits like a sword and takes
  KEEN / VAMP / GOLD / LUCKY with no new charm code. All six concepts do this.
- **The SHED hook** (fight.ts:730, the end of your spin before `this.last`) is a ready place for "something fires on my
  own spin" logic once BRIAR's block goes.

---

## 1. RINGMASTER RUFUS: THE BIG TOP
**Pitch:** "He doesn't fight. His act does." A striped circus-tent cabinet; a sawdust ring at its base where little
8-bit lions line up. The hero has a top hat, a moustache and a whip. The silhouette reads at once: a tent with a pennant.

**Symbols:** LION (attack, hits like a sword: 10) and SHIELD, 6/6 a reel.
**Mechanic:** every lion you land fills the ACT meter by 1. At 3, a lion steps into **THE RING** (max 3 in the ring).
At the end of each of your spins, every lion in the ring **pounces for 10** (it uses the LION level, like a sword hit),
**even on a spin that misses**. When an enemy SABOTAGE lands on your reels, one lion is **spooked** and leaves the ring.
Numbers: about one new lion every 2 spins, so the ring is full by spin ~6. A full ring adds 30 a spin (54 at LV3). HP 300.

**Card rule (19 words):** `EVERY 3 LIONS YOU LAND, ONE JOINS THE RING (MAX 3). THE RING HITS EVERY SPIN. SABOTAGE SPOOKS ONE. 300 HP.`

**Fun to watch:** the only machine with a board outside its reels. You watch the act grow (lion 1... 2... 3), and each
spin ends with a row of pounces even when the reels whiff. SABOTAGE becomes a story beat: the bomb lands and a lion
bolts off-screen. It turns the game's unique hook (enemies write on you) into your machine's drama, and the fight has an
arc: build the act, then the act carries you.
**Drafting:**
- **MENAGERIE (wide):** lion levels, a bigger ring, GOLD on lions (gold lions also make GOLD pounces). WAR DRUM-style
  per-spin relics love it.
- **SAFETY NET (tall):** protect the ring. HOLY WATER becomes a premium relic, shields keep you alive while the act
  builds, and you win slowly but surely.

**Signature relics:**
- **FIRE HOOP:** lions in the ring pierce shields.
- **TAMER'S CHAIR:** the first SABOTAGE each fight spooks no lion.
- **WHIP CRACK:** a LION jackpot makes the whole ring pounce twice.

**Charm:** **TREAT** (on LION): +1 to the ACT meter when it lands (a treat lion counts double).

**Feasibility: M.**
- Add `ring` (count) on the Combatant and a meter kind `'ring'`.
- Pounces go in the SHED block (fight.ts:730) through `hit()`, so shields block them like swords.
- Spooking hooks `write()` / `fireAbility()` when the target is the player.
- New render: a ring strip under the cabinet and one lion sprite with 2-3 frames.

**Sizer:** honest on blind spot 1 (pounces are damage on your spin). It gets two wrong:
- **Ramp:** the ring is full for 34 of the dummy's 40 spins but for ~half of a real fight, so it over-reads by ~20%.
- **Spooks:** the dummy never sabotages, so it over-reads more against saboteurs.
- **Fix:** one sizer tweak. Start the dummy with a 1-lion ring, or measure only the first 10 spins for `'ring'`.
  Over-reading is the safe direction: bosses come out a bit fat, not free.

**Risks:**
- Act 2 writers could feel punishing. Tune spooks to 1 per enemy ability, never per written cell.
- The Mirror reflects your last spin, pounces included.

**Rating:** fun **9**, buildability **8**.

---

## 2. DJ DECIBEL: THE JUKEBOX
**Pitch:** "Turn it up." An arched 50s jukebox with bubble tubes and an EQ bar display on top that climbs as the fight
heats up. The hero is a DJ with huge headphones.

**Symbols:** NOTE (attack, a sound blast: 10) and SHIELD, 6/6.
**Mechanic:** each NOTE on the payline raises the **VOLUME** by 1 (shown on the EQ bars, max 6). Every hit you make
gets **+10% per volume**. A spin with no note drops the volume by 2 ("the record skips").
At 6: **THE DROP.** Your next spin, **every NOTE you can see in the 3x3 window hits**, not just the payline. Then the
volume falls back to 2. Numbers: the first drop lands around spin 4. A drop is ~4.5 visible notes x 10 x 1.6 = ~70,
plus the payline. HP 280.

**Card rule (20 words):** `NOTES TURN UP THE VOLUME: +10% DAMAGE EACH. AT 6 THE BEAT DROPS: EVERY NOTE YOU CAN SEE HITS. 280 HP.`

**Fun to watch:**
- **Audio-reactive:** the fight music literally gets louder and faster with the volume. THE DROP is a bass hit with a
  shake and a colour pulse (under FLASH_CAP, no white).
- **Readable tension:** a skipped record on a dead spin.
- **Why the 3x3 matters:** the rows above and below the payline finally matter, so players watch the whole window.

**Drafting:** this is the big new lever. **Charms on cells off the payline count at THE DROP**, so for the first time
the draft cares about note density across the whole strip, not just the odds of landing on the line.
- **CRESCENDO:** volume gain and GOLD notes; ride the multiplier; a boss killer.
- **WALL OF SOUND:** dense notes (shop-remove shields), charms spread wide; the drop is the win condition.

**Signature relics:**
- **TURNTABLE:** after THE DROP the volume falls to 4, not 2.
- **MIXTAPE:** a spin with no note doesn't lower the volume.
- **SUBWOOFER:** THE DROP hits through shields.

**Charm:** **ECHO** (on NOTE): at THE DROP, an echo note hits twice.

**Feasibility: M.**
- A meter with decay (`fillMeter` plus a drain on a noteless spin) and a damage multiplier in `hit()` for the player.
- The drop's 3x3 scan already exists: the Dealer's ALL IN walks `reel.cells[(stop+d)]` (fight.ts:~600).
- Music ramp: the Director gets a volume value, and the audio needs one tempo/gain parameter.

**Sizer:** good. The meter is **cyclic** (it resets after each drop), so the 40-spin average matches a real fight.
Everything is damage on your own spin.
**Risks:**
- THE DROP is a big single spin, and the Mirror reflects it (a 1/3 share): tune `REFLECT_CAP`.
- Off-payline charms are a new idea: put one line in the tutorial coach.

**Rating:** fun **9**, buildability **8**.

---

## 3. TICK-TOCK TILLY: CLOCKWORK
**Pitch:** "One more spin. Always one more spin." A brass cabinet with a clock face on top and a wind-up key on its
side that visibly turns. The hero is a goggled tinkerer.

**Symbols:** COG (attack, a thrown saw-gear: 10) and SHIELD, 6/6.
**Mechanic:** each COG on the payline winds the **SPRING** by 10. At 40: **OVERTIME.** You spin again right away,
before the enemy moves. The spring empties, and there's max 1 overtime a turn. Numbers: overtime about every 2.7
spins, so ~35% more spins. HP 260.

**Card rule (14 words):** `COGS WIND THE SPRING. AT 40 YOU SPIN AGAIN, RIGHT AWAY. 260 HP.`

**Fun to watch:** the "free spin" thrill is the most slot-machine thing there is. The clock hand sweeps, OVERTIME!
rings out, and two spins play back to back, so a jackpot followed by overtime is a double-tap. The tempo itself is the
resource: you see the enemy's ability countdown fall behind.
**Drafting:**
- **CHAIN-SPINNER:** cogs plus GOLD / KEEN, maximise overtime. Every "per spin" relic is worth ~1.35x here
  (WAR DRUM, METRONOME, HOT STREAK, FIRST BLOOD).
- **FORTRESS:** shields from both spins of a turn stack (same turn, no reset). SHIELD BASH and TOWER SHIELD turn it
  into a tank that swings twice.

**Signature relics:**
- **MAINSPRING:** overtime can chain once more (max 2 a turn).
- **CUCKOO:** the first COG group in an overtime spin pays x2.
- **ESCAPEMENT:** ice and locks on your reels also thaw on overtime spins.

**Charm:** **WOUND** (on COG): +20 to the spring when it lands.

**Feasibility: M.**
- `turnBody` ends with `this.next = side` on overtime, flagged so it skips shield reset, the boss turn-start code and
  the turn counter for the enemy's countdown.
- The Director needs a `turnStart {overtime:true}` banner.
- Statuses: decide whether they tick on the extra spin (default: no; ESCAPEMENT makes them).

**Sizer:** **under-reads by ~35% unless fixed.** `machinePower` pushes each player step as its own turn, so overtime
looks like more turns at the same power. Fix: fold consecutive player steps into one entry (a one-line change).
Fortress shields are invisible to it (blind spot 1), the BRIAR trap in a mild form.

**Risks:**
- Multiplies with every per-spin relic. Cap the chain at 1, and watch HOT STREAK and METRONOME.
- Endless counts enemy turns, so it's unaffected.

**Rating:** fun **8**, buildability **8**.

---

## 4. MYSTIC MAUDE: THE ORACLE
**Pitch:** "She knows what you'll spin." A carnival fortune-teller booth with a glowing crystal-ball dome on top and a
draped hand over the ball. The hero has a headscarf and hoop earrings.

**Symbols:** STAR (attack: 10) and SHIELD, 6/6 (plus anything you draft).
**Mechanic:** before each spin the ball **CALLS** one symbol, picked by its weight on your reels and shown on the dome.
Each called cell on the payline pays **x2** and adds 1 **OMEN**. At 4 omens: **PROPHECY.** Your next spin is fated:
the payline lands as a **jackpot of the called symbol**, then the omens reset.
Numbers: with 6/6 strips, ~0.75 called cells a spin, so a prophecy every ~5 spins (6 omens would be ~8: too slow
for a ~7-spin fight). A fated STAR jackpot at LV1 is 90, or 180 called. HP 240.

**Card rule (19 words):** `EACH SPIN THE BALL CALLS A SYMBOL: IT PAYS X2. LAND IT 4 TIMES AND YOUR NEXT SPIN IS FATED. 240 HP.`

**Fun to watch:** built-in anticipation every single spin. The call shows, the reels stop, and either "CALLED IT!" or
nothing. The prophecy spin is telegraphed from your side, like the Dealer's ALL IN: the reels slow and lock into the
fated line, and you know it's coming. Because the call can be SHIELD, a fated spin is sometimes a fortress instead of a
nuke, which keeps it surprising.
**Drafting:** the call is weighted by your strips, so **shop removals and swaps are the main lever**. It's the
machine that makes deck-thinning feel like spellcraft.
- **ONE TRUE PATH:** thin to all stars, so the call is (almost) always STAR and every prophecy is a star jackpot.
- **TAROT SPREAD:** keep many kinds (stars, shields, LUCKY wilds). Anything can be called, so spread charms and
  enjoy shield and star prophecies alike.

**Signature relics:**
- **THIRD EYE:** the ball calls 2 symbols.
- **TEA LEAVES:** a called symbol just above or below the payline adds an omen (a TESLA COIL cousin).
- **SELF-FULFILLING:** a prophecy refunds 2 omens.

**Charm:** **TAROT** (any symbol): +1 omen when it lands as the called symbol.

**Feasibility: T-M.**
- The call is one rng pick at spin start plus a `called` multiplier in `score()`.
- Omens use `fillMeter`. The prophecy reuses `this.forced[side]`, which already forces a payline (fight.ts:550).
- UI: one icon on the dome.

**Sizer:** mostly honest (a fated STAR jackpot is damage). A fated SHIELD jackpot is invisible defence (blind spot 1),
but it's a minority and self-limiting.

**Risks:**
- Overlap with JAX ("fill a meter, get a jackpot"). Separate them in presentation: JAX is chaos (3 random jackpots),
  ORACLE is fate (one you see coming).
- ONE TRUE PATH could be too consistent. Gate it with "never below 2 of a symbol on a reel" (already a shop rule).

**Rating:** fun **8**, buildability **9**.

---

## 5. MADAME MIX: THE CAULDRON
**Pitch:** "Your junk is my ingredients." A squat iron cauldron cabinet with green bubbles rising out of the top and
reels seen through the steam. The hero is a witch with a ladle.

**Symbols:** FLASK (attack, a thrown potion: 10), SHIELD and TOAD (a dud that pays nothing). Strips 5/5/2.
**Mechanic:** each FLASK fills the **BREW** by 10. At 40: **TRANSMUTE.** Your 2 worst cells turn into FLASKS for the
rest of the fight. "Worst" means enemy-written cells first (slime, bombs, ice, fakes), then toads, then shields.
Numbers: a transmute every ~3 spins, so ~4-6 cells change in a fight and your reels converge, with jackpots getting
visibly likelier. HP 280.

**Card rule (20 words):** `FLASKS BREW A POTION. AT 40 IT TRANSMUTES: YOUR 2 WORST CELLS BECOME FLASKS, SABOTAGE FIRST. 280 HP.`

**Fun to watch:** you watch your own reels change. Bubbling sprite swaps turn sabotage into ammo, so against act 2
writers it's a tug-of-war on your machine. That's the game's core hook played from the other side, without ever
touching the enemy's reels.
**Drafting:**
- **PURIST:** shop-remove toads and shields so every transmute adds to jackpot odds; GOLD flasks; glass-cannon.
- **WITCH DOCTOR:** keep shields and lean into sabotage. Cleansing makes act 2 and the House's cheating its best
  matchups.

**Signature relics:**
- **PHILOSOPHER'S STONE:** transmuted cells become GOLD flasks.
- **DOUBLE BOIL:** transmute 3 cells.
- **FUME HOOD:** each SABOTAGE written on your reels adds 10 to the brew.

**Charm:** **CATALYST** (on FLASK): +20 brew when it lands.

**Feasibility: M.**
- The cell overlay machinery exists (`write()`, `plantGround`, `fakeGilds`, `cleanse()`), and reels rebuild from strips
  each fight.
- Needs a "worst cell" ranking and a per-fight overlay of player-owned rewrites.

**Sizer:** **two blind spots at once.**
- **Ramp:** by dummy spin ~20 the reels are near all-flask, a state real fights never reach, so it over-reads hard.
- **Cleansing:** it's defence, so it's invisible.
- **Fixes:** cap transmutes at 6 cells a fight and size on the first 10 spins. Even so, expect BRIAR-style hand
  fitting of BOSS_MUL.

**Rating:** fun **8**, buildability **6**.

---

## 6. DEADEYE DOT: THE SIX-SHOOTER
**Pitch:** "Load six. Fire six." A saloon cabinet with swinging doors on the front and a big revolver cylinder dial on
top with 6 chambers that light up. The hero is a cowgirl with a hat brim over her eyes.

**Symbols:** BULLET (attack: 10) and SHIELD, 6/6.
**Mechanic:** each BULLET on the payline hits and **loads a chamber that carries its cell's charm** (a gold bullet, a
keen bullet, a vamp bullet). Six loaded: **HIGH NOON.** All six fire one by one, 15 each plus their charm, and the
cylinder empties. Numbers: high noon every ~4 spins, ~90 plus charms. HP 280.

**Card rule (17 words):** `BULLETS HIT AND LOAD THE CYLINDER. SIX LOADED: HIGH NOON FIRES THEM ONE BY ONE. 280 HP.`

**Fun to watch:** the cylinder dial is a perfect 8-bit read, and HIGH NOON is a rhythmic 6-shot drumroll with each
shot coloured by its charm.
**Drafting:** the cylinder is a mini-deck built from your cell charms.
- **GOLDEN GUN:** stack gold bullets.
- **LEAD AND BLOOD:** keen and vamp bullets (sustain shots).

**Signature relics:**
- **SPEED LOADER:** start each fight with 3 loaded.
- **RICOCHET:** a fully blocked shot bounces once more.
- **SILVER BULLET:** the 6th shot hits x3.

**Charm:** **HOLLOW POINT** (on BULLET): its HIGH NOON shot pierces shields.

**Feasibility: M.** A queue of charm tags on the Combatant; HIGH NOON loops `hit()`. Six hits is long Director
pacing: compress it.

**Sizer:** honest (cyclic damage on your own spin).
**Risks:**
- **It's TESLA's shape** ("fill, then burst") with a charm twist. Players will feel the overlap.
- Gold-per-shot math can explode (gold in a group ADDs, but here each shot multiplies separately).

**Rating:** fun **7**, buildability **7**.

---

## Ranking
| # | Machine | New resource | Fun | Build | Feasibility | Sizer risk |
|---|---|---|---|---|---|---|
| 1 | **THE BIG TOP** (Rufus) | board presence (a ring of lions) | 9 | 8 | M | low-mid (ramp, spooks: over-reads, the safe side) |
| 2 | **THE JUKEBOX** (DJ Decibel) | volume (a cyclic multiplier) + the 3x3 | 9 | 8 | M | low (cyclic) |
| 3 | **CLOCKWORK** (Tilly) | tempo (extra spins) | 8 | 8 | M | mid (needs a one-line sizer fold) |
| 4 | **THE ORACLE** (Maude) | fate (a called symbol) | 8 | 9 | T-M | low (JAX overlap is the risk) |
| 5 | **THE CAULDRON** (Madame Mix) | your own reels (transmute) | 8 | 6 | M | **high** (ramp + invisible cleanse) |
| 6 | **THE SIX-SHOOTER** (Dot) | ammo with charms | 7 | 7 | M | low (TESLA overlap is the risk) |

## Recommendation: prototype THE BIG TOP first, THE JUKEBOX second
- **BIG TOP:** the most different from the four that stay. It's the only one whose power lives outside the reels,
  and it fires on its own spin every spin. That is exactly what BRIAR never did, and why the sizer could never see
  her. SABOTAGE spooking lions ties the machine to the game's signature hook, and it's great to watch (a growing
  act, a lion bolting). The sizer's only error is over-reading, which makes bosses fatter, not free.
- **JUKEBOX:** a cyclic meter keeps the sizer honest, and off-payline charms at THE DROP give drafting a lever no
  other machine has. It also comes with free juice: music that turns up as you win.
- **Fallback if time is short: THE ORACLE.** It's the cheapest build (it reuses `forced`), but sell it as fate, not
  as a second JAX.
- **Skip THE CAULDRON** for now. It's a lovely fantasy, but it stacks every sizer blind spot BRIAR had.

**Prototype plan:**
1. Probe each with the stock `BLADES` reuse and one meter kind.
2. Run `tools/sim/table.ts 1000 <id>` untuned and log it. Expect a BOSS_MUL fit like any new machine.
3. Gates: WHITE 41-45, GREEN 16-19, fight-4 deaths 3-6%. Also target fight length ~12-15 turns and <15% rounds with
   0 damage (BRIAR's old failure).
4. Keep BRIAR's save id `thorn` in `ALL_CABINETS` so unlocks never drop. The new machine takes over her unlock slot
   (BEAT THE HOUSE).
