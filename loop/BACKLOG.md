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
- [ ] Turn down the lightning (TESLA special): less intense overall. The full-screen flash was already removed.
- [ ] Speeds 1x, 2x, 4x, 8x, where the new 1x = half of today's 1x
- [ ] "PAY" is ambiguous when enemies reduce your pay (Croupier RAKE, Counterfeiter, Hex): clearer wording or visuals
- [ ] SPIKED CHARM text cut off in the shop. Re-check after the long-text fix; titles may still clip.
- [ ] General pass over shop text layout
- [ ] Rat thief PILFER: a jackpot doesn't clear / return the stolen symbols (bug?). Idea: a double of stolen cells returns those 2; a jackpot returns the stolen cells in your visible 3x3.
- [ ] Slime: a jackpot cleanses only your visible 3x3, not every slime on the strip
- [ ] Preps (counter relics like MITTENS, LOCKPICK) need a buff or a rework. Idea: a ~10% chance an enemy mechanic is blocked outright.

## Bigger features [?]
- [ ] Rename to SLOTS VS. BOTS (tabled until after the playtest; checklist in memory)
- [?] Make it 16-bit (art upgrade pass)
- [?] Each character gets its own special. TESLA keeps the lightning bolt special (the most popular in playtests). The user will brainstorm the other 4.
  - Then lightning-only charms and power-ups appear only on TESLA runs.
  - Gambler character idea: rolling a coin throws it at the enemy, then that reel re-spins, repeating until the reel shows no coin. After the turn you get the coins back.
  - BRIAR idea: specials that let shields carry over 1 extra turn
- [?] Meta progression: more reels or more paylines. Maybe an endless mode after act 3 that keeps scaling with random enemies and new bosses.
- [?] Charm lock-in: if reel 1 bolts are GOLD and you then swap shields to bolts on that reel, the NEW bolts shouldn't get the charm, which would keep options open. Today a charm covers every cell of that symbol on that reel.
- [?] A charm that gives chips
- [?] Multiple charms on one symbol, instead of locking a reel's symbol to one charm

## Questions to answer / measure
- [x] 3 wilds in a row: pays as a BOLT jackpot (9 energy). Prism doubles it (a match using a wild); Jackpot Bell doubles it and refills your special.
- [ ] How reroll works: each reroll deals a genuinely new shelf (new seed per reroll; costs 1, then +1 each time). But the shelf always has the same kinds of slots (a charm, a relic, a reel card, heal...), so it can look like "the same stuff". Consider more variety per reroll.
- [ ] Does VAMPIRE FANG work on the OVERCHARGE echo? Currently no: Fang heals once per special fired, and the echo isn't a separate special. Decide if it should.
- [ ] Per-relic / per-charm / per-upgrade win rates for finer balance (the sim already prints relic win rates; add charms and upgrades)
- [ ] How hard is the Dealer: about 64% of players who reach it win (commit-policy harness). By slot machine: MIDAS ~80% (easiest), THORN/TESLA ~57-65%.
