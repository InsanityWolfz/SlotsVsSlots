/**
 * ENCOUNTERS (2026-10-12): the map's non-fight stops, where you gamble between fights (they replace SIDE BETS).
 * Fights stay watch-only; an encounter is a choice: stake chips, HP, relics or upgrades, or walk away.
 *
 * Games (v1.0, user 2026-10-29): TWENTY-ONE, the CLAW and HIGHER OR LOWER. (LUCKY SEVENS is gone: "nobody ever wins
 * it". The offers, THE BLOOD BANK, THE PAWN SHOP and THE LOAN SHARK, went on 2026-10-14: nobody liked them.) Each is
 * deterministic per run seed, act and stop, so a quit can't re-roll it.
 */
import type { RelicId } from './config';
import { Rng } from './rng';
import { NEW_RELIC, RELICS } from './relics';
import type { RunState } from './run';

export interface EncounterChoice {
  label: string;
  /** What it costs or risks, in plain words (no odds, no expected value: the user's no-hints rule). */
  text: string;
  /** What you put up and what you get for it (a game's buy-in card: STAKE, then PLAYS or PRIZE). */
  stake?: string;
  prize?: string;
  /** The relic the house picked as the stake (its tooltip stays readable). */
  relic?: RelicId;
  /** Can't afford it right now. */
  disabled?: boolean;
}
export interface EncounterResult {
  title: string;
  text: string;
  /** Went your way (gold), against you (red), or you walked (null). */
  good: boolean | null;
  /** A pull's three symbols, for the screen to spin. */
  reels?: string[];
  /** RED OR BLACK: the pocket the ball found (0 is the green zero). */
  pocket?: number;
  /** UNDER OR OVER: the two dice. */
  dice?: [number, number];
  /** TWENTY-ONE: the hand that just finished (both sides' cards, how it ended), and which hand of how many it was. */
  hand?: { p: number[]; d: number[]; outcome: 'win' | 'natural' | 'lose' | 'bust' | 'push'; no: number; of: number };
  /** HIGHER OR LOWER: the card that was showing, the one just turned, and the pot now. */
  card?: number;
  next?: number;
  pot?: number;
  /** The game goes on at this stop (more plays left): the stop isn't passed yet. */
  more?: boolean;
  /** CLAW MACHINE: the prize the claw went for, and whether it held on. */
  claw?: { prize: number; held: boolean; misses: number[] };
}
/** What the run lends an encounter: relics you could win, and an upgrade it can hand out. */
export interface EncounterCtx {
  relics: RelicId[];
  /** Apply one upgrade (a level for a symbol or Charm you own); returns its name, or null if there's none to give. */
  upgrade: () => string | null;
  /** Put 2 Charms on plain cells (a CHARM card the drafts could deal); returns its name, or null if none fits. */
  charm: () => string | null;
}
export interface EncounterDef {
  id: string;
  name: string;
  blurb: string;
  /** A game of chance (buy-ins, then plays) or an offer (take it or walk). */
  kind: 'game' | 'offer';
  /** An offer's character (a 24x24 portrait sprite id). */
  art?: string;
  choices: (run: RunState, rng: Rng) => EncounterChoice[];
  /* (A game that plays out over several calls keeps its state on the run: run.encounterState, saved with it.) */
  /** Play choice `i` (the last choice is always WALK AWAY). `bet`: a chip bet, for games that take one. */
  play: (run: RunState, i: number, rng: Rng, ctx: EncounterCtx, bet?: number) => EncounterResult;
  /** A game you play more than once at the stop (RED OR BLACK's spins): how many plays it allows. */
  plays?: number;
}

const WALK: EncounterChoice = { label: 'WALK AWAY', text: 'KEEP WHAT YOU HAVE' };
const walked = (): EncounterResult => ({ title: 'WALKED AWAY', text: '', good: null });

// ---- Table helpers ------------------------------------------------------------------------------------------

/** REGULAR (relic): one more play at every encounter game (a hand, a go at the claw, a game of HIGHER OR LOWER). */
export const extraPlays = (run: RunState) => (run.player.relics.includes('regular') ? NEW_RELIC.regularPlays : 0);
/** ENDLESS raises every table's limit by half again each loop (chips buy more late, so bets must too). */
/** ENDLESS: encounter stakes grow with the loop (user, 2026-10-14: fixed prices stopped mattering against 100-300 chips). x2 at loop 1, x5 at loop 4. */
export const stakesMul = (run: RunState) => 1 + (run.endless?.loop ?? 0);
/** A table's bet limit at this loop. */
export const tableLimit = (run: RunState, base: number) => Math.round(base * stakesMul(run));
/** A fixed price or chip prize at this loop. */
export const atStakes = (run: RunState, n: number) => Math.round(n * stakesMul(run));

// ---- TWENTY-ONE (2026-10-12; chips, 2026-10-13) -----------------------------------------------------------------

/** A card, 2 to 14 (the ace high), drawn fresh each time. */
const drawCard = (rng: Rng) => 2 + rng.int(13);

/**
 * TWENTY-ONE: blackjack, kept simple (the user's rules): hit or stand, nothing else (no double or split). A tie is a
 * push (user, 2026-10-14): the bet comes back and the hand doesn't count, so it's dealt again. The dealer stands on 17. A chip table like the others (user, 2026-10-13: winning upgrades at
 * cards felt wrong): set a bet, up to 3 hands a visit; a win pays the bet 1 to 1, a two-card 21 pays 2 to 1. Cards are
 * drawn fresh each time (2-14, aces 11 or 1).
 */
export const BJ = { maxBet: 20, hands: 3, naturalPays: 2, standOn: 17 };
/** The most you can bet right now: the table's limit, or every chip you hold. */
export const bjMax = (run: RunState) => Math.min(tableLimit(run, BJ.maxBet), run.player.chips);
/** A hand's best total (aces count 11 unless that busts). */
export function bjTotal(cards: number[]): number {
  let t = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === 14) {
      aces++;
      t += 11;
    } else t += Math.min(10, c);
  }
  while (t > 21 && aces-- > 0) t -= 10;
  return t;
}
/** A hand in play: its bet, your cards, the dealer's, and the hands this visit has dealt (this one included). */
export type BjState = { bet: number; p: number[]; d: number[]; dealt: number };
/** TWENTY-ONE's hand in play (null between hands). */
export const bjState = (run: RunState): BjState | null => (run.encounterState && 'p' in run.encounterState ? (run.encounterState as unknown as BjState) : null);
/** Hands dealt this visit (the count survives between hands). */
const bjDealt = (run: RunState) => Number((run.encounterState as { dealt?: number } | undefined)?.dealt ?? 0);

/** Settle the hand in play (the dealer draws to 17 first unless you busted or hit a natural) and pay it. */
function bjSettle(run: RunState, st: BjState, rng: Rng): EncounterResult {
  const me = bjTotal(st.p);
  // Any two-card 21 is a natural: it pays 2 to 1, and the dealer doesn't draw.
  const natural = st.p.length === 2 && me === 21;
  const d = [...st.d];
  if (me <= 21 && !natural) while (bjTotal(d) < BJ.standOn) d.push(drawCard(rng));
  const dealer = bjTotal(d);
  const outcome: 'win' | 'natural' | 'lose' | 'bust' | 'push' =
    me > 21 ? 'bust' : natural ? 'natural' : dealer > 21 || me > dealer ? 'win' : dealer === me ? 'push' : 'lose';
  // The bet was taken at the deal: a win gives it back with the winnings, a push gives it back.
  const won = outcome === 'natural' ? st.bet * BJ.naturalPays : outcome === 'win' ? st.bet : 0;
  if (won) run.player.chips += st.bet + won;
  if (outcome === 'push') run.player.chips += st.bet;
  // A push doesn't use up a hand: the same hand is dealt again.
  const dealt = outcome === 'push' ? st.dealt - 1 : st.dealt;
  run.encounterState = { dealt };
  const more = dealt < BJ.hands + extraPlays(run) && bjMax(run) >= 1;
  const hand = { p: [...st.p], d, outcome, no: st.dealt, of: BJ.hands + extraPlays(run) };
  const title = outcome === 'natural' ? 'TWENTY-ONE!' : outcome === 'win' ? (dealer > 21 ? 'DEALER BUSTS!' : 'YOU WIN!') : outcome === 'bust' ? 'BUST' : outcome === 'push' ? 'PUSH: DEAL AGAIN' : 'THE DEALER WINS';
  const text = won ? `+${won} CHIPS` : outcome === 'push' ? 'BET BACK' : `-${st.bet} CHIPS`;
  return { title, text, good: won > 0 ? true : outcome === 'push' ? null : false, hand, more };
}

const TWENTY_ONE: EncounterDef = {
  id: 'bj',
  name: 'TWENTY-ONE',
  blurb: '',
  kind: 'game',
  choices: (run) => {
    const st = bjState(run);
    // (On 21 there's nothing to hit for: STAND settles it.)
    if (st) return [{ label: 'HIT', text: '', disabled: bjTotal(st.p) >= 21 }, { label: 'STAND', text: '' }];
    return [{ label: 'DEAL', text: '', disabled: bjMax(run) < 1 }, WALK];
  },
  play: (run, i, rng, _ctx, bet = 1) => {
    const st = bjState(run);
    if (!st) {
      if (i !== 0 || bjMax(run) < 1) return walked();
      const stake = Math.max(1, Math.min(bjMax(run), Math.floor(bet)));
      run.player.chips -= stake;
      const first: BjState = { bet: stake, p: [drawCard(rng), drawCard(rng)], d: [drawCard(rng)], dealt: bjDealt(run) + 1 };
      run.encounterState = first as unknown as Record<string, number | number[]>;
      // A natural 21 off the deal pays at once.
      if (bjTotal(first.p) === 21) return bjSettle(run, first, rng);
      return { title: '', text: '', good: null, more: true };
    }
    if (i === 0) {
      // HIT: one more card; 21 stands for you, over 21 is a bust.
      const next: BjState = { ...st, p: [...st.p, drawCard(rng)] };
      run.encounterState = next as unknown as Record<string, number | number[]>;
      if (bjTotal(next.p) >= 21) return bjSettle(run, next, rng);
      return { title: '', text: '', good: null, more: true };
    }
    return bjSettle(run, st, rng);
  },
};

// ---- HIGHER OR LOWER (back, user 2026-10-29: "it had some actual tension") ------------------------------------------

/**
 * HIGHER OR LOWER: a chip table like TWENTY-ONE's. Bet, and a card is turned; call the next one HIGHER or LOWER. A
 * right call grows the pot x1.35 (x1.4 gave an expert +12%), a wrong one loses it; the same rank again is a push (the
 * pot stays, call again). CASH OUT any time after a right call; the 6th right call pays the pot out. One game a visit
 * (REGULAR adds games). Cards are drawn fresh each time (2-14, the ace high), like TWENTY-ONE's.
 */
export const HILO = { maxBet: 20, grow: 1.35, calls: 6, games: 1 };
/** The most you can bet right now: the table's limit, or every chip you hold. */
export const hiloMax = (run: RunState) => Math.min(tableLimit(run, HILO.maxBet), run.player.chips);
/** The pot after `right` right calls, rounded down (rounded up, the first call paid x1.4), but always a chip a call
 * more (a 1-chip bet x1.35 is still 1). */
export const hiloPot = (bet: number, right: number) => Math.max(bet + right, Math.floor(bet * HILO.grow ** right));
/** A game in play: its bet, the pot, the card showing, the right calls so far, and which game of the visit it is. */
export type HiloState = { bet: number; pot: number; card: number; right: number; game: number };
/** HIGHER OR LOWER's game in play (null between games, or a save from the old game: it starts over). */
export const hiloState = (run: RunState): HiloState | null => {
  const s = run.encounterState;
  return s && 'card' in s && 'right' in s && 'game' in s ? (s as unknown as HiloState) : null;
};
/** Games played this visit (the count survives between games). */
const hiloGames = (run: RunState) => Number((run.encounterState as { games?: number } | undefined)?.games ?? 0);

/** A game is over (lost, cashed out or topped out): another one if the visit has one left and you can bet. */
function hiloEnd(run: RunState, st: HiloState, res: EncounterResult): EncounterResult {
  run.encounterState = { games: st.game };
  return { ...res, more: st.game < HILO.games + extraPlays(run) && hiloMax(run) >= 1 };
}

const HIGHER_OR_LOWER: EncounterDef = {
  id: 'hilo',
  name: 'HIGHER OR LOWER',
  blurb: '',
  kind: 'game',
  choices: (run) => {
    const st = hiloState(run);
    // (Nothing beats an ace or goes under a 2: that call is off.)
    if (st) return [{ label: 'HIGHER', text: '', disabled: st.card >= 14 }, { label: 'LOWER', text: '', disabled: st.card <= 2 }, { label: 'CASH OUT', text: '', disabled: st.right < 1 }];
    return [{ label: 'DEAL', text: '', disabled: hiloMax(run) < 1 }, WALK];
  },
  play: (run, i, rng, _ctx, bet = 1) => {
    const st = hiloState(run);
    if (!st) {
      if (i !== 0 || hiloMax(run) < 1) return walked();
      const stake = Math.max(1, Math.min(hiloMax(run), Math.floor(bet)));
      run.player.chips -= stake;
      const first: HiloState = { bet: stake, pot: stake, card: drawCard(rng), right: 0, game: hiloGames(run) + 1 };
      run.encounterState = first as unknown as Record<string, number>;
      return { title: '', text: '', good: null, card: first.card, pot: stake, more: true };
    }
    if (i === 2) {
      // CASH OUT: the pot comes back (not before a right call: the bet is still riding).
      if (st.right < 1) return { title: '', text: '', good: null, card: st.card, pot: st.pot, more: true };
      run.player.chips += st.pot;
      return hiloEnd(run, st, { title: 'CASHED OUT', text: `+${st.pot} CHIPS`, good: true, card: st.card, pot: st.pot });
    }
    const next = drawCard(rng);
    if (next === st.card) return { title: 'SAME CARD: PUSH', text: 'CALL AGAIN', good: null, card: st.card, next, pot: st.pot, more: true };
    if (i === 0 ? next < st.card : next > st.card) return hiloEnd(run, st, { title: 'WRONG', text: `-${st.bet} CHIPS`, good: false, card: st.card, next, pot: 0 });
    const now: HiloState = { ...st, card: next, right: st.right + 1, pot: hiloPot(st.bet, st.right + 1) };
    if (now.right >= HILO.calls) {
      run.player.chips += now.pot;
      return hiloEnd(run, now, { title: `${HILO.calls} RIGHT!`, text: `+${now.pot} CHIPS`, good: true, card: st.card, next, pot: now.pot });
    }
    run.encounterState = now as unknown as Record<string, number>;
    return { title: 'RIGHT!', text: `POT ${now.pot}`, good: true, card: st.card, next, pot: now.pot, more: true };
  },
};

// ---- RAT RACE and SCRATCH-OFF went to after launch (v1.0 scope, user 2026-10-29: SCRATCH-OFF's panels were a blind
// pick). Their code is on the parked-rebuild branch; a saved stop becomes HIGHER OR LOWER (migrateRun).

// ---- CLAW MACHINE (user's pick, 2026-10-14) ------------------------------------------------------------------------

/**
 * CLAW MACHINE: three prizes in the pit (shown before you pay): chips, a pair of Charms and a relic. Pay chips for a
 * go and pick one to aim at. PUSH YOUR LUCK (user, 2026-11-01): each miss drags that prize toward the drop for the rest
 * of the visit, so its next grab holds more often (the pit shows it sinking; no odds on screen). A miss says SO CLOSE
 * only when it nearly held. A prize you win leaves the pit. Three goes a visit.
 */
export const CLAW = { price: 5, tries: 3, chips: 10, close: 0.12 };
export const CLAW_PRIZES = [
  { id: 'chips', name: 'CHIPS', hold: 0.5, step: 0.25, grip: 'EASY GRAB' },
  { id: 'charm', name: '2 CHARMS', hold: 0.3, step: 0.2, grip: 'TRICKY GRAB' },
  { id: 'relic', name: 'A RELIC', hold: 0.1, step: 0.12, grip: 'HARD GRAB' },
] as const;
/** A prize's name at this loop (the chips one says how many). */
export const clawPrizeName = (run: RunState, k: number) => (CLAW_PRIZES[k].id === 'chips' ? `${atStakes(run, CLAW.chips)} CHIPS` : CLAW_PRIZES[k].name);
type ClawState = { won?: number[]; misses?: number[] };
const clawState = (run: RunState): ClawState => (run.encounterState ?? {}) as unknown as ClawState;
/** Prizes already won at this stop (they're gone from the pit). */
export const clawWon = (run: RunState): number[] => clawState(run).won ?? [];
/** How far each prize has been dragged toward the drop this visit (its misses). */
export const clawMisses = (run: RunState): number[] => clawState(run).misses ?? [0, 0, 0];
/** The grip a prize shows: its own at first, then how close it's been dragged. */
export const clawGrip = (run: RunState, k: number, misses = clawMisses(run)): string => {
  const m = misses[k] ?? 0;
  return m <= 0 ? CLAW_PRIZES[k].grip : m === 1 ? 'CLOSER' : 'TEETERING';
};
const CLAW_MACHINE: EncounterDef = {
  id: 'claw',
  name: 'CLAW MACHINE',
  blurb: '',
  kind: 'game',
  plays: CLAW.tries,
  choices: (run) => [...CLAW_PRIZES.map((_p, k) => ({ label: clawPrizeName(run, k), text: clawGrip(run, k), disabled: run.player.chips < atStakes(run, CLAW.price) || clawWon(run).includes(k) })), WALK],
  play: (run, i, rng, ctx) => {
    const won = clawWon(run);
    if (i >= CLAW_PRIZES.length || run.player.chips < atStakes(run, CLAW.price) || won.includes(i)) return walked();
    run.player.chips -= atStakes(run, CLAW.price);
    const prize = CLAW_PRIZES[i];
    const misses = [...clawMisses(run)];
    const hold = Math.min(1, prize.hold + prize.step * misses[i]);
    const roll = rng.next();
    const held = roll < hold;
    // The last go's miss has nothing to come closer for.
    const last = (run.encounterPlays ?? 0) + 1 >= CLAW.tries + extraPlays(run);
    let text = last ? 'IT SLIPPED' : 'IT MOVED CLOSER';
    if (held) {
      const chips = (c: number) => ((run.player.chips += c), `+${c} CHIPS`);
      if (prize.id === 'chips') text = chips(atStakes(run, CLAW.chips));
      else if (prize.id === 'charm') text = ctx.charm() ?? chips(atStakes(run, CLAW.chips));
      else {
        const pool = ctx.relics.filter((r) => !run.player.relics.includes(r));
        if (pool.length) {
          const got = rng.pick(pool);
          run.player.relics.push(got);
          text = RELICS[got].name;
        } else text = chips(atStakes(run, CLAW.chips * 2));
      }
    } else misses[i]++;
    run.encounterState = { won: held ? [...won, i] : won, misses } as unknown as Record<string, number | number[]>;
    // SO CLOSE only when it nearly held (every miss said it: a fake near miss).
    return { title: held ? 'GOT IT!' : roll < hold + CLAW.close ? 'SO CLOSE' : 'MISSED', text, good: held, claw: { prize: i, held, misses } };
  },
};

export const ENCOUNTERS: Record<string, EncounterDef> = { hilo: HIGHER_OR_LOWER, bj: TWENTY_ONE, claw: CLAW_MACHINE };
/** What the map deals onto ENCOUNTER stops. */
export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);

/** The encounter at this stop, or a stand-in if a save names one that's gone. */
export const encounterOf = (id: string | undefined): EncounterDef => (id && ENCOUNTERS[id]) || HIGHER_OR_LOWER;

/** Deterministic per run, act, stop and play (a game's 2nd spin draws its own stream): a quit can't re-roll it. */
export const encounterRng = (run: RunState) =>
  new Rng((run.seed ^ Math.imul(run.act * 64 + run.stop + 5, 0x2f6b9a35) ^ ((run.endless?.loop ?? 0) * 0x61c88647) ^ Math.imul(run.encounterPlays ?? 0, 0x7feb352d)) >>> 0);
