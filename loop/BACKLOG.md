# Playtest backlog (user's notes from the full playtest, 2026-09-25)

Held for when coding resumes (after the weekly usage reset, Tue 2026-09-29).
Status: [x] done, [ ] to do, [?] needs design talk first.

## Already done (pushed 2026-09-25)
- [x] YOUR REELS shown as columns 1 2 3 (like the machine)
- [x] Reel indicator on upgrade cards = three side-by-side bars
- [x] Shop text cut off (e.g. LUCKY CLOVER's "30% ... near-miss ... jackpot")
- [x] GREEN stake includes the Dealer on the first try
- [x] RELIC RUSH slowed down with more juice (pops, shake, tier banners). Slow-mo and particles could still go further.
- [x] BONUS WHEEL: PASS / COLLECT
- [x] FULL SET only when the same charm is on all 3 payline cells

## Quick fixes / polish
- [x] Turn down the lightning: a LIGHTNING: FULL / SOFT option on the main menu (full stays the default)
- [x] Speeds 1x, 2x, 4x, 8x, where the new 1x = half of today's 1x
- [x] "PAY" is ambiguous when enemies reduce your pay (Croupier RAKE, Counterfeiter, Hex): clearer wording or visuals
- [x] SPIKED CHARM text cut off in the shop. Re-check after the long-text fix; titles may still clip.
- [x] General pass over shop text layout
- [x] Rat thief PILFER: a jackpot doesn't clear / return the stolen symbols (bug?). Idea: a double of stolen cells returns those 2; a jackpot returns the stolen cells in your visible 3x3.
- [ ] Slime: a jackpot cleanses only your visible 3x3, not every slime on the strip
- [x] (removed) Preps (counter relics like MITTENS, LOCKPICK) need a buff or a rework. Idea: a ~10% chance an enemy mechanic is blocked outright.

## Bigger features [?]
- [ ] Rename to SLOTS VS. BOTS (tabled until after the playtest; checklist in memory)
- [?] Make it 16-bit (art upgrade pass)
- [?] Each character gets its own special. TESLA keeps the lightning bolt special (the most popular in playtests). The user will brainstorm the other 4.
  - Then lightning-only charms and power-ups appear only on TESLA runs.
  - Gambler character idea: rolling a coin throws it at the enemy, then that reel re-spins, repeating until the reel shows no coin. After the turn you get the coins back.
  - BRIAR idea: specials that let shields carry over 1 extra turn
- [?] Meta progression: more reels or more paylines. Maybe an endless mode after act 3 that keeps scaling with random enemies and new bosses.
- [x] Charm lock-in (charms live on cells now): if reel 1 bolts are GOLD and you then swap shields to bolts on that reel, the NEW bolts shouldn't get the charm, which would keep options open. Today a charm covers every cell of that symbol on that reel.
- [?] A charm that gives chips
- [x] Multiple charms on one symbol, instead of locking a reel's symbol to one charm

## Questions to answer / measure
- [x] 3 wilds in a row: pays as a BOLT jackpot (9 energy). Prism doubles it (a match using a wild); Jackpot Bell doubles it and refills your special.
- [ ] How reroll works: each reroll deals a genuinely new shelf (new seed per reroll; costs 1, then +1 each time). But the shelf always has the same kinds of slots (a charm, a relic, a reel card, heal...), so it can look like "the same stuff". Consider more variety per reroll.
- [x] Does VAMPIRE FANG work on the OVERCHARGE echo? (yes, since 2026-09-27) Currently no: Fang heals once per special fired, and the echo isn't a separate special. Decide if it should.
- [ ] Per-relic / per-charm / per-upgrade win rates for finer balance (the sim already prints relic win rates; add charms and upgrades)
- [ ] How hard is the Dealer: about 64% of players who reach it win (commit-policy harness). By slot machine: MIDAS ~80% (easiest), THORN/TESLA ~57-65%.

## User notes 2026-09-28 (after the cloud rework): for the next session
- **Pacing:** early rounds feel slow and drawn out, then the game swings to way too fast. Smooth the curve (early fights shorter/snappier, late fights less instant).
- **Offers are too "fitted":** take one gold charm on KNIGHT and you rarely see any other charm. Late-game rerolls barely change the pool. Re-look at the shop/draft/relic offer weighting: a looser spread, more variety per reroll.
- **Bimodal runs:** either you're weak, stay weak and die early, or you snowball and one-shot everything. Brainstorm smoothing (catch-up for weak runs, softer snowball, enemy scaling that keeps pressure).
- **Visual clarity:** boss mechanics are hard to follow. The Dealer feels underwhelming (needs more presence and a clearer threat).
- **Relic audit:** every relic needs an in-depth test that it works as written AND shows it.
  - Example: WAR DRUM stacks sword base damage, but the sword symbols don't display the buff. It may or may not be working. Buffs must show on the payline numbers.
- **Tuesday:** spin up an expert playtester (roguelikes, slot machines, player incentives, fun) to play through the whole game and propose what to improve or change. The user feels "something is just missing".
- The user's overall read: good progress, a long way to go.

## User decisions (2026-10-08, after the Steam readiness pass)
- **HIGH PRIORITY: online leaderboards for browser playtesters** (Supabase is wired but has no URL/key; src/net/config.ts,
  supabase/schema.sql). Steam leaderboards replace them at the Steam launch.
- English only. Achievements stay as they are; the user audits them before Steam.
- Music: generated is fine in principle; pick an approach (procedural chiptune on the existing synth, or licensed).
- Balance waits until all content is in. BRIAR may be replaced (hard to balance, not fun).
- Big choices: review doc "Big Choices Review" (Claude Doc eeb79633-d315-448f-9136-e81419951a1f).
- ENCORE stays "after it pays" (the jackpot meter's payoff), not "after each jackpot" (it never triggered that way).
