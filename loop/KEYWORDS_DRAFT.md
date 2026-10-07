# Description keywords: starter draft (2026-10-07, for review with the user)

Goal: every relic, Charm, big choice, enemy and card text uses the same words for the same things, so a player can
spot synergies at a glance. Nothing is changed in the game yet.

## Draft glossary
Keywords render in one colour each (and maybe a tiny icon), always in the same form.

| Keyword | Meaning | Replaces today's |
|---|---|---|
| **HIT** | damage you deal (or take) | DAMAGE, HITS BACK, "PAYS" when it means damage |
| **BLOCK** | what a shield stops | "BLOCKED", SHIELD (when it means the block) |
| **SHIELD** | shield you gain | GAIN SHIELD, "SHIELD YOU" |
| **LEFTOVER SHIELD** | shield still up at your turn start | (already consistent: keep) |
| **HEAL** | HP back | (consistent) |
| **PAIR / JACKPOT** | 2 / 3 matching on the payline | "TWO MATCHING REELS", "A MATCH" |
| **MATCH** | a pair or a jackpot | GROUP (when it means a match) |
| **ATTACK SYMBOL** | your machine's weapon: SWORD / CARD / BOLT / THORN / CHIP | "GOLD BAR", "CHIP SYMBOLS", "SWORDS" in shared texts |
| **WILD** | the wild symbol | (consistent) |
| **METER** | your machine's bar, generic | ENERGY, BAR |
| **STORM** | TESLA's lightning firing (one or more strikes) | LIGHTNING (as an event), CHARGE |
| **VOLLEY** | BRIAR's thorns firing | "FIRE YOUR THORNS", "HITS BACK" |
| **RAIN** | CASSIDY's MAKE IT RAIN | MAKE IT RAIN (keep as the long form) |
| **HIGH ROLLER** | CASSIDY's chip multiplier bar | (consistent) |
| **JACKPOT METER** | JAX's meter | "YOUR METER" in JAX texts |
| **CHEAT** | anything an enemy writes on your reels (slime, rock, bomb, freeze, jam, hex, mark) | used only by HOLY WATER today |
| **THIS FIGHT / EACH FIGHT / THE RUN** | how long it lasts | "A FIGHT", "PER FIGHT", "EVERY FIGHT" |
| **FOE** | the enemy | ENEMY, THEIR, THEY |
| Charm names | GOLD, KEEN, VAMP, CHARGED, LUCKY, THORNY, LUCRE, TRICK | (consistent) |

## Inconsistencies found
- **CASSIDY's symbol has three names:** "GOLD BAR GROUP" (TAX MAN), "CHIP SYMBOLS" (LOADED CHIPS), "CHIP PAIRS" (LOOSE
  CHANGE), CHIP (on screen).
- **Shared relic texts still say SWORDS** where the effect follows the attack symbol. WAR DRUM is the first fixed by
  `relicText`'s ATTACK_WORD; KEEN and VAMP codex lines still say "SWORDS".
- **Charm codex is out of date:** GOLD says "SWORDS, SHIELDS OR BOLTS" (it fits every attack symbol now), and BULWARK
  (spiked) is still listed though it was removed.
- **Damage words vary:** HIT, DAMAGE, PAYS, FIRE, LASH, HITS BACK, ECHOES.
- **Timing words vary:** EACH TURN, EACH SPIN, EVERY 3RD SPIN, ONCE A FIGHT, THIS FIGHT, EACH WIN, AFTER EACH FIGHT.
  Proposal: SPIN (your turn), TURN (either side), WIN (a fight won).
- **Retired leftovers:** TOLL BOOTH's "PER LIEN HELD" text and LOADED CHIPS / GRAFT texts are still in the file (retired, so
  hidden, but they should be cleaned up).
- **Enemy blurbs mix voice and length:** "HITS HARD" vs two-sentence rule blurbs. Proposal: blurb = flavour; the rule
  lives on the card back (already split by the new enemy cards).
- **"YOUR METER"** means four different bars depending on the machine.

## Open questions for you
1. Keywords as colour only, or colour + a small icon (like Slay the Spire's keyword tooltips)?
2. Do hovering keywords get a mini tooltip ("VOLLEY: your thorns hit back, through shields")?
3. Keep MAKE IT RAIN as the name, with RAIN as the keyword?
4. FOE vs ENEMY?
