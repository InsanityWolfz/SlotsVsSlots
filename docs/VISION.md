# Vision: the new game

**Status: SIGNED OFF by the user, 2026-10-16** (step 1 of the rebuild, `docs/ROADMAP.md`). The sections marked
**DECIDED** are the design; build from them. Anything not covered is open: decide it with the user, one system at a
time, and mark it DECIDED with the date.

## Why we're rebuilding (user, 2026-10-16)
The old game had four levers: player damage, player HP, enemy attacks and enemy HP. You can't scale all four
exponentially at once, and when one is linear you get one-hit fights or forever fights (shielding and healing).
The new game has **two levers: the player's score and the enemy's score.** Both must be able to grow exponentially:
the player's through upgrades, Charms and relics; the enemy's somehow (today enemies don't grow: they hit, or they
sabotage linearly, and that's it). An enemy rolling five great spins in a row is luck: it's a slot machine.

This is a new game, not a fix to the old one. It reuses the chassis (reels, strips, symbols, art, juice, the run
map, the Cashier, saves, the sim harness) and rebuilds the rules from a small core, one system at a time.

## Old vision -> new vision
| | Old | New |
|---|---|---|
| The pitch | Slot vs. slot roguelike where your reels battle theirs | Slot vs. slot roguelike where you battle another Slot Machine for the top score |
| A fight | Automatic: you just watch | One spin at a time, with options to improve your luck |
| Length | As many spins as it takes to reach 0 HP | A fixed number of spins, so the top-score race works |

## What we lose
- One-shotting an annoying enemy or boss.
- Getting two-shot by an enemy when you know you're weak.
- (A problem we lose, good riddance: bad pacing, long early fights and a trivial late game.)
- Some of the fight theme and story.

## What we gain
- Players have agency over their Slot Machines.
- Big scores still feel good.
- Easier balance and horizontal content (more symbols, enemies and bosses with their own scoring tricks).

## The race and your options (DECIDED 2026-10-16)
- **The race:** both Slot Machines get the same fixed number of spins (about 5 to start; tuned in play). Turns
  alternate and **the rival spins first each round**, so the race always ends on your spin with a known target
  (NEED 140). The higher score wins; a tie is yours.
- **Your options: HOLD and NUDGE**, each a fixed count a race (no refills inside a race; the run can grow them).
  HOLD (before a spin): keep reels, spin the rest. NUDGE (after a spin lands): move one reel one cell.
- **HOLD rules (user, 2026-10-16):** each held reel costs one HOLD; at most 2 reels held a spin (never all 3, or a
  held jackpot just repeats). HOLD works on your first spin too (the start position is as random as any landing).
  Held reels keep the symbols they last landed on (they stay as landed through the rival's turn), so a held pair
  pays again plus a chance at the third: the choice is WHEN to spend the HOLDs.
- **NUDGE rules:** down only, one cell (the symbol you can see above the payline drops onto it); one NUDGE a spin,
  so they can't all be saved for the last spin.
- **No RESPIN:** HOLD two and spin already re-rolls one reel; a third button adds reading, not a new choice.
- **Step 2's starting counts (tuned in play, not balanced):** 5 spins, 2 HOLDs, 2 NUDGEs, rival BET x2 (at x1 the
  tools roughly doubled your score and a simple bot won 90%; at x2 it wins about 60%). Note that
  holding a pair spends both HOLDs; if that feels stingy, raise HOLDs before anything else.
- **Always show the gap:** YOU LEAD BY / BEHIND BY on every spin, and NEED on your last.
- Why: every spin has a choice before (HOLD) and after (NUDGE), and the reveal in between; the counts make
  now-or-later choices across a race; a fixed spin count means the tools never fade the way HOLD did in the old
  game; HOLD and NUDGE are real slot-machine buttons (old pub fruit machines had them), so they read with no rules
  screen.
- Known risk: with the rival first, some last spins are already decided (need nothing, or need the impossible).
  The expert playtest guesses about half of races, mostly because you already lead. Step 2 logs "decided before the
  last spin"; the likely fix is later: the prize grows with the winning margin, so a won last spin is a greed spin.

## What symbols are for (DECIDED 2026-10-16)
- **Every symbol is score.** Nothing attacks, defends or guards: a symbol pays, or changes how score is made.
  Shields leave KNIGHT (GUARDS felt retrofitted, and two symbols on three reels make every spin a pair, so HOLD and
  NUDGE would have nothing to chase).
- **A paytable ladder:** each Slot Machine has 3-4 paying symbols from common and cheap to rare and rich (rarity =
  cells on the strip). A pair pays something; three of a kind pays a lot more, with a big gap.
- **Step 2's strip (user, 2026-10-16):** all four classic payers, no blanks: CHERRY 8, BAR 6, COIN 4, SEVEN 2 of 20
  cells on each reel. Nothing pays 30% of spins, a pair 60%, a triple 10%; a fresh SEVEN triple is 1 in 1000, a held
  SEVEN pair finds the third 1 in 10. (Three symbols with no blanks paid 82% of spins: HOLD and NUDGE had nothing
  to chase. Blanks would leave 65% paying nothing.) Step 2's pays (pair / three): CHERRY 10/50, BAR 20/100, COIN
  40/200, SEVEN 80/777. Any two of the three payline symbols matching is a pair. The rival's strip is steadier
  and its SEVEN about 1 cell, so a rival jackpot times its BET almost never happens.
- **Classic payers, themed specials (user, 2026-10-16):** the paying ladder is classic slot symbols (CHERRY, BAR,
  COIN, SEVEN), shared across Slot Machines, so anyone reads it (a 7 beats a cherry) and two machines compare at a
  glance. A machine's theme lives in its art, its hero and its special symbols, which DO something (KNIGHT's sword
  that sharpens), never in a themed picture that just pays. Themed objects imply verbs (swords attack) the game
  doesn't have.
- **Special symbols come later, one at a time (step 3):** symbols that change how score is made (X2, a scatter, WILD,
  a builder like the Whetstone). They're the content, not the core.
- Why: the ladder is what gives HOLD and NUDGE their choices (hold a rare pair and chase the third, or take the sure
  common pair?); a rare three of a kind is the comeback in a race; symbols are the base the run multiplies; a paytable
  is the oldest slot convention there is.
- Known risk: more symbols, more spins that pay nothing. Fix with strip counts and NUDGE first; if that's not enough,
  pairs pay more.

## KNIGHT's special symbol: the SWORD pays its EDGE (DECIDED 2026-10-16)
- **Each SWORD on your payline pays its EDGE now** (on top of a pair the other two reels make). **A sword that spun or
  was NUDGEd onto the line then doubles the EDGE for the rest of the race** (10, 20, 40, 80, 160); **a HELD sword
  strikes but doesn't sharpen.** Two swords strike left to right (10 then 20). Three SWORDs are KNIGHT's jackpot:
  777 (as rare as three SEVENs), and the EDGE doubles. A sword never matches, so it still breaks three of a kind.
  Every sword in sight wears its EDGE number (off the line too, so a NUDGE onto it reads). 2 swords a reel (22
  cells); EDGE starts at 10 each race; KNIGHT only.
- Replaced the SWORD that sharpens (+1 SHARP, +20 to every later paying spin; user: "plays like crap"). Research:
  that sword was a blank (a sword spin paid nothing 3 times in 4), paid late in thin slices (a spin-1 sword about
  +48 over the race, a last-spin one 0), never had its own moment, and flattened the ladder (at SHARP 2 a CHERRY
  pair 50, a SEVEN pair 120). Hit slots make a special symbol pay or show its number the moment it lands (Big Bass
  Bonanza, Sweet Bonanza, Money Train). Now a sword is never a blank, its pay is readable before it lands, and the
  race's last-spin sword is the biggest, not worthless.
- **Why a held sword doesn't sharpen** (expert playtest, simulated): if it did, holding the sword was the default
  line (the best bot held it 82% of the time; "always hold" was within 2 points of perfect; swords made half your
  score). With the rule, the best bot holds it 31%, always-hold is 6 points of win rate worse than playing well,
  swords make about 61 points a race, and the bot wins about 64% at BET x2 (step 2: 61%). +10 a strike instead of
  doubling was the old trap again (the sword cells cost as many pairs as they paid).
- Known risk: EDGE's base (10) doesn't grow with the rival's BET; the run's MULT has to carry it.

## How the rival's score grows (DECIDED 2026-10-16)
- **A real Slot Machine, scaled by one number:** the rival spins the classic ladder for real (no faked outcomes), and
  everything it scores is multiplied by its **BET**, shown on its machine (BET x2, x6, x20). The BET grows
  geometrically by stop, with a jump for bosses: Balatro's blind curve on a machine that actually spins.
- **The rival plays steady, you play swingy:** its strip leans toward common pairs (rarely nothing, rarely a
  jackpot). Your machine has the variance, and HOLD and NUDGE to manage it. A rival jackpot can happen, rarely.
- **Rivals differ by their cheats (step 3), not their numbers:** a cheat messes with your machine; it doesn't scale.
- Why: exponential rival growth is what the two-lever rebuild needs; a fixed pressure curve keeps the late game from
  going trivial. Luck against luck read as random in the race slice; a steady rival makes its pace predictable
  (and you see it first each round), so a race is won or lost on your swings. The BET reads with no explaining.
- Known risks: steady rival spins can be dull (spin them fast; cheats add character). The player's growth must
  multiply, not add, or the BET curve outruns every build (the Charms and relics step must deliver that). The
  curve's numbers wait for balancing.

## How a run ends (DECIDED 2026-10-16)
- **CREDITS: you start with 3; out of credits is GAME OVER.** A lost race costs a credit and that race's prize, and
  you move on. A lost boss race costs a credit and you play it again (INSERT COIN to continue): bosses can't be
  skipped. Beating the final boss wins the run (how many acts is the run's structure, later).
- 3 credits means the third lost race ends the run; the game shows LAST CREDIT. A replayed boss race is a fresh
  roll.
- Getting a credit back is rare and never cheap (whether and how: the Cashier and relics steps).
- Why: a run is lost to a build that fell behind, not one bad spin (one loss ending the run read as random in the
  race slice, and slot luck swings harder than a Balatro hand). A loss still bites twice: the credit, and the lost
  prize leaves you weaker against a geometric BET curve. Last credit + boss + NEED 140 on the final spin is the
  game's peak tension. Credits and INSERT COIN need no explaining.
- Known risks: with 3 credits early races may feel low-stakes (if players shrug off losses, 2 credits). Boss
  replays could feel like grinding for luck; credits cap that.

## Parked ideas (from the race slice discussion, 2026-10-15/16; NOT decided, don't build)
- **Whetstone:** KNIGHT's second symbol sharpens swords for the rest of the race (build, then strike). The
  playtester's notes: build should ADD to base, not multiply (no snowball); the signature symbol pays and the new
  symbol feeds the meter the machine already has.
- **Fold:** if the rival can't catch up, it folds and the race ends early (brings back the one-shot feeling).
- **Telegraphed cheats:** the rival's next cheat is shown a spin early, so the player's tools can answer it.
- **Rival score as a blind:** the rival's score target scales by stop like a Balatro blind, with bounded swings.
- What the race slice taught: the scoring felt good; shields as GUARDS felt retrofitted (a flat count that doesn't
  scale); one-loss runs at ~95% per race read as random.
