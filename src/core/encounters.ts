/**
 * ENCOUNTERS (2026-10-12): the map's non-fight stops, where you gamble between fights (they replace SIDE BETS).
 * Fights stay watch-only; an encounter is a choice: stake chips, HP, relics or upgrades, or walk away.
 *
 * Games: LUCKY SEVENS, RED OR BLACK, HIGHER OR LOWER, TWENTY-ONE, UNDER OR OVER. (The offers, THE BLOOD BANK, THE PAWN
 * SHOP and THE LOAN SHARK, are gone: user, 2026-10-14, nobody liked them.) Each is deterministic per run seed, act and stop,
 * so a quit can't re-roll it.
 */
import { UNIT, type RelicId } from './config';
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
/** One pull of LUCKY SEVENS: where the five reels stopped, the line, and what it paid. */
export interface SlotPull {
  /** Each reel's stop on its strip (the middle row is the payline). */
  stops: number[];
  line: SlotSym[];
  /** How many in a row paid (0: nothing), and of what. */
  count: number;
  sym: SlotSym;
  wins: string[];
  /** What this pull added (the screen counts these up as the pull lands; the run has them already). */
  gain: { chips: number; hp: number; maxHp: number };
}
export interface EncounterResult {
  title: string;
  text: string;
  /** Went your way (gold), against you (red), or you walked (null). */
  good: boolean | null;
  /** A pull's three symbols, for the screen to spin. */
  reels?: string[];
  /** LUCKY SEVENS: every pull you bought, in order (already paid: a quit can't re-roll them). */
  pulls?: SlotPull[];
  /** What it all came to, one line each (+12 CHIPS, A LEVEL: GOLD 2, ...). */
  gains?: string[];
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
  /** RAT RACE: which rat won, and the one you backed. */
  race?: { winner: number; pick: number };
  /** SCRATCH-OFF: the panel just scratched and what it showed; when the ticket's done, the whole grid. */
  scratch?: { panel: number; sym: number; grid?: number[] };
  /** CLAW MACHINE: the prize the claw went for, and whether it held on. */
  claw?: { prize: number; held: boolean };
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

// ---- LUCKY SEVENS (2026-10-12) -----------------------------------------------------------------------------------

/**
 * LUCKY SEVENS: a 5-reel, 3-row prize machine (one payline, the middle row). It pays like a real slot: 3, 4 or 5 of a
 * kind in a row from the left reel; WILDs stand in for anything. Pay chips for a number of pulls (more pulls for a
 * bigger buy-in, each a little better value). Mostly chips; HP, upgrades and relics on rarer lines.
 * Every number is a first pass, to be tuned with the new sim.
 */
export type SlotSym = 'chip' | 'seven' | 'heart' | 'star' | 'relic' | 'wild';
/** How many of each symbol a reel's strip holds (all five reels the same). */
export const SLOT_STRIP: Record<SlotSym, number> = { chip: 8, seven: 2, heart: 3, star: 2, relic: 1, wild: 4 };
export const SLOT = {
  /** The buy-ins: chips, a share of your max HP, or a relic the house picks. */
  low: { chips: 7, pulls: 3 },
  mid: { hpShare: 0.2, pulls: 6 },
  high: { pulls: 10 },
  /** What 3 / 4 / 5 in a row pays. */
  chips: { chip: [2, 5, 12], seven: [6, 15, 40] } as Partial<Record<SlotSym, number[]>>,
  heal: [5 * UNIT, 10 * UNIT],
  maxHp5: 5 * UNIT,
  /** STAR: upgrades for 3 / 4 / 5. RELIC: a relic, plus these chips for 4 / 5. */
  stars: [1, 2, 3],
  relicChips: [0, 10, 25],
};
const SLOT_ORDER: SlotSym[] = ['chip', 'seven', 'heart', 'star', 'relic', 'wild'];
/** The reel strips: the counts above, dealt in a fixed order (every machine is the same machine). */
export const SLOT_STRIPS: SlotSym[][] = [0, 1, 2, 3, 4].map((r) => {
  const cells = SLOT_ORDER.flatMap((k) => Array<SlotSym>(SLOT_STRIP[k]).fill(k));
  return new Rng(0x5eed + r * 977).shuffle(cells);
});
/** The payline (middle row) for these reel stops. */
export const slotLine = (stops: number[]): SlotSym[] => stops.map((st, r) => SLOT_STRIPS[r][st % SLOT_STRIPS[r].length]);
/** What the line pays: the symbol and how many in a row from the left (WILDs stand in). 0 = nothing. */
export function slotRun(line: SlotSym[]): { sym: SlotSym; count: number } {
  const sym = line.find((c) => c !== 'wild') ?? 'seven';
  let count = 0;
  while (count < line.length && (line[count] === sym || line[count] === 'wild')) count++;
  return count >= 3 ? { sym, count } : { sym, count: 0 };
}
const slotHp = (run: RunState) => Math.max(UNIT, Math.round((run.player.maxHp * SLOT.mid.hpShare) / UNIT) * UNIT);
/** The relic the house wants for the biggest buy-in (fixed for this stop, so the card never changes under you). */
const slotRelic = (run: RunState, rng: Rng): RelicId | null => (run.player.relics.length ? rng.fork().pick(run.player.relics) : null);

/** One pull: spin the five reels, pay the line, say what it paid. */
function pullSlot(run: RunState, rng: Rng, ctx: EncounterCtx, tally: Map<string, number>): SlotPull {
  const stops = SLOT_STRIPS.map((strip) => rng.int(strip.length));
  const line = slotLine(stops);
  const { sym, count } = slotRun(line);
  const p = run.player;
  const before = { chips: p.chips, hp: p.hp, maxHp: p.maxHp };
  const wins: string[] = [];
  const add = (key: string, k = 1) => tally.set(key, (tally.get(key) ?? 0) + k);
  const chips = (n: number) => {
    if (n <= 0) return;
    p.chips += n;
    add('CHIPS', n);
    wins.push(`+${n} CHIPS`);
  };
  const tier = count - 3;
  if (count) {
    const pay = SLOT.chips[sym]?.map((n) => atStakes(run, n));
    if (pay) chips(pay[tier]);
    else if (sym === 'heart') {
      if (count === 5) {
        p.maxHp += SLOT.maxHp5;
        p.hp = p.maxHp;
        add('MAX HP', SLOT.maxHp5);
        wins.push(`+${SLOT.maxHp5} MAX HP`);
      } else {
        const heal = Math.min(p.maxHp - p.hp, SLOT.heal[tier]);
        p.hp += heal;
        add('HP', heal);
        wins.push(`+${heal} HP`);
      }
    } else if (sym === 'star') {
      for (let k = 0; k < SLOT.stars[tier]; k++) {
        const up = ctx.upgrade();
        if (up) {
          add(up);
          wins.push(up);
        } else chips(8);
      }
    } else if (sym === 'relic') {
      const pool = ctx.relics.filter((r) => !p.relics.includes(r));
      const relic = pool.length ? rng.pick(pool) : null;
      if (relic) {
        p.relics.push(relic);
        add(RELICS[relic].name);
        wins.push(RELICS[relic].name);
      } else chips(15);
      chips(SLOT.relicChips[tier]);
    }
  }
  return { stops, line, count, sym, wins, gain: { chips: p.chips - before.chips, hp: p.hp - before.hp, maxHp: p.maxHp - before.maxHp } };
}

const LUCKY_SEVENS: EncounterDef = {
  id: 'slot',
  name: 'LUCKY SEVENS',
  blurb: '',
  kind: 'game',
  choices: (run, rng) => {
    const hp = slotHp(run);
    const relic = slotRelic(run, rng);
    return [
      { label: 'A', text: '', stake: `${atStakes(run, SLOT.low.chips)} CHIPS`, prize: `${SLOT.low.pulls + extraPlays(run)} PULLS`, disabled: run.player.chips < atStakes(run, SLOT.low.chips) },
      { label: 'B', text: '', stake: `${hp} HP`, prize: `${SLOT.mid.pulls + extraPlays(run)} PULLS`, disabled: run.player.hp <= hp },
      { label: 'C', text: '', stake: relic ? RELICS[relic].name : 'A RELIC', prize: `${SLOT.high.pulls + extraPlays(run)} PULLS`, relic: relic ?? undefined, disabled: !relic },
      WALK,
    ];
  },
  play: (run, i, rng, ctx) => {
    const p = run.player;
    let pulls = 0;
    if (i === 0 && p.chips >= atStakes(run, SLOT.low.chips)) {
      p.chips -= atStakes(run, SLOT.low.chips);
      pulls = SLOT.low.pulls;
    } else if (i === 1 && p.hp > slotHp(run)) {
      p.hp -= slotHp(run);
      pulls = SLOT.mid.pulls;
    } else if (i === 2) {
      const relic = slotRelic(run, rng);
      if (!relic) return walked();
      p.relics = p.relics.filter((r) => r !== relic);
      pulls = SLOT.high.pulls;
    }
    if (!pulls) return walked();
    pulls += extraPlays(run);
    // The stake's pick drew from a fork of the stop's stream; the pulls draw from the stream itself.
    const tally = new Map<string, number>();
    const out = Array.from({ length: pulls }, () => pullSlot(run, rng, ctx, tally));
    const gains = [...tally].map(([k, v]) => (k === 'CHIPS' ? `+${v} CHIPS` : k === 'HP' ? `+${v} HP` : k === 'MAX HP' ? `+${v} MAX HP` : v > 1 ? `${k} X${v}` : k));
    return { title: gains.length ? 'PAID OUT' : 'NO LUCK', text: gains.join('  '), good: gains.length > 0, pulls: out, gains };
  },
};

// ---- Table helpers ------------------------------------------------------------------------------------------

/** REGULAR (relic): one more play at every encounter game (a pull, a spin, a roll, a hand). */
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

// ---- UNDER OR OVER (2026-10-12) -----------------------------------------------------------------------------------

// ---- RAT RACE (user's pick, 2026-10-14) ---------------------------------------------------------------------------

/**
 * RAT RACE (the alley's own): four rats, each with its odds on its card. Bet chips on one and watch them run; your rat
 * first pays the bet times its odds. The house's edge is in the odds (about 10%). Two races a visit.
 */
export const RATS = [
  { name: 'WHISKERS', pays: 2, p: 0.46 },
  { name: 'CHEDDAR', pays: 3, p: 0.3 },
  { name: 'SEWER KING', pays: 5, p: 0.16 },
  { name: 'LONGSHOT LOU', pays: 10, p: 0.08 },
];
export const RACE = { maxBet: 15, races: 2 };
export const raceMax = (run: RunState) => Math.min(tableLimit(run, RACE.maxBet), run.player.chips);
const RAT_RACE: EncounterDef = {
  id: 'rats',
  name: 'RAT RACE',
  blurb: '',
  kind: 'game',
  plays: RACE.races,
  choices: (run) => [...RATS.map((r) => ({ label: r.name, text: `PAYS X${r.pays}`, disabled: raceMax(run) < 1 })), WALK],
  play: (run, i, rng, _ctx, bet = 1) => {
    if (i >= RATS.length || raceMax(run) < 1) return walked();
    const stake = Math.max(1, Math.min(raceMax(run), Math.floor(bet)));
    let roll = rng.next();
    let winner = RATS.length - 1;
    for (let k = 0; k < RATS.length; k++) {
      if (roll < RATS[k].p) {
        winner = k;
        break;
      }
      roll -= RATS[k].p;
    }
    const won = winner === i;
    const net = won ? stake * (RATS[i].pays - 1) : -stake;
    run.player.chips += net;
    return { title: `${RATS[winner].name} WINS!`, text: net > 0 ? `+${net} CHIPS` : `${net} CHIPS`, good: won, race: { winner, pick: i } };
  },
};

// ---- SCRATCH-OFF (user's pick, 2026-10-14) -------------------------------------------------------------------------

/**
 * SCRATCH-OFF: buy a ticket, scratch 3 of its 9 panels. Three of a kind wins that prize (chips, a heal, an upgrade, a
 * relic). The ticket is printed when you buy it (a quit can't re-roll it); which panels you scratch is up to you.
 * Two tickets a visit. Chips back about what they cost, plus the rare prizes.
 */
export const SCRATCH = { price: 6, tickets: 2, scratches: 3, smallChips: 12, bigChips: 25, healShare: 0.25 };
/** The prizes a panel can show, and how often a ticket wins each (the rest lose). */
export const SCRATCH_PRIZES = [
  { id: 'chips', p: 0.28 },
  { id: 'bigchips', p: 0.08 },
  { id: 'heal', p: 0.08 },
  { id: 'star', p: 0.06 },
  { id: 'relic', p: 0.02 },
] as const;
type ScratchState = { win: number; shown: number[]; picked: number[] };
export const scratchState = (run: RunState): ScratchState | null =>
  run.encounterState && 'picked' in run.encounterState ? (run.encounterState as unknown as ScratchState) : null;
/** Tickets bought at this stop. */
const scratchBought = (run: RunState) => Number((run.encounterState as { bought?: number } | undefined)?.bought ?? 0);
const SCRATCH_OFF: EncounterDef = {
  id: 'scratch',
  name: 'SCRATCH-OFF',
  blurb: '',
  kind: 'game',
  choices: (run) => {
    const st = scratchState(run);
    if (st) return [...Array.from({ length: 9 }, (_, k) => ({ label: `${k + 1}`, text: '', disabled: st.picked.includes(k) })), WALK];
    return [{ label: 'BUY A TICKET', text: `${atStakes(run, SCRATCH.price)} CHIPS`, disabled: run.player.chips < atStakes(run, SCRATCH.price) }, WALK];
  },
  play: (run, i, rng, ctx) => {
    const st = scratchState(run);
    const bought = scratchBought(run);
    if (!st) {
      if (i !== 0 || run.player.chips < atStakes(run, SCRATCH.price)) return walked();
      run.player.chips -= atStakes(run, SCRATCH.price);
      // Print the ticket: which prize it pays (or -1, none).
      let roll = rng.next();
      let win = -1;
      for (let k = 0; k < SCRATCH_PRIZES.length; k++) {
        if (roll < SCRATCH_PRIZES[k].p) {
          win = k;
          break;
        }
        roll -= SCRATCH_PRIZES[k].p;
      }
      run.encounterState = { win, shown: [], picked: [], bought: bought + 1 } as unknown as Record<string, number | number[]>;
      return { title: '', text: '', good: null, more: true };
    }
    // Scratching a panel (WALK AWAY mid-ticket scratches the next one for you).
    const panel = i < 9 && !st.picked.includes(i) ? i : [0, 1, 2, 3, 4, 5, 6, 7, 8].find((k) => !st.picked.includes(k))!;
    const n = SCRATCH_PRIZES.length;
    let sym: number;
    if (st.win >= 0) sym = st.win;
    else if (st.shown.length < 2) sym = rng.int(n);
    // A losing ticket's third panel never makes three of a kind.
    else sym = st.shown[0] === st.shown[1] ? (st.shown[0] + 1 + rng.int(n - 1)) % n : rng.int(n);
    const shown = [...st.shown, sym];
    const picked = [...st.picked, panel];
    run.encounterState = { win: st.win, shown, picked, bought } as unknown as Record<string, number | number[]>;
    if (picked.length < SCRATCH.scratches) return { title: '', text: '', good: null, more: true, scratch: { panel, sym } };
    // Done: the rest of the grid prints, and the prize pays.
    const grid = Array.from({ length: 9 }, () => -1);
    picked.forEach((pk, k) => (grid[pk] = shown[k]));
    for (let k = 0; k < 9; k++) if (grid[k] < 0) grid[k] = rng.int(n);
    let title = 'NO LUCK';
    let text = '';
    if (st.win >= 0) {
      const prize = SCRATCH_PRIZES[st.win].id;
      title = 'WINNER!';
      const chips = (c: number) => ((run.player.chips += c), `+${c} CHIPS`);
      if (prize === 'chips') text = chips(atStakes(run, SCRATCH.smallChips));
      else if (prize === 'bigchips') text = chips(atStakes(run, SCRATCH.bigChips));
      else if (prize === 'heal') {
        const p = run.player;
        const hp = Math.min(p.maxHp - p.hp, Math.round((p.maxHp * SCRATCH.healShare) / UNIT) * UNIT);
        // (At full HP a heal is nothing: it pays chips.)
        if (hp > 0) {
          p.hp += hp;
          text = `+${hp} HP`;
        } else text = chips(atStakes(run, SCRATCH.smallChips));
      } else if (prize === 'star') text = ctx.upgrade() ?? chips(atStakes(run, SCRATCH.smallChips));
      else {
        const pool = ctx.relics.filter((r) => !run.player.relics.includes(r));
        if (pool.length) {
          const got = rng.pick(pool);
          run.player.relics.push(got);
          text = RELICS[got].name;
        } else text = chips(atStakes(run, SCRATCH.bigChips));
      }
    }
    const more = bought < SCRATCH.tickets + extraPlays(run) && run.player.chips >= atStakes(run, SCRATCH.price);
    run.encounterState = { bought } as unknown as Record<string, number | number[]>;
    return { title, text, good: st.win >= 0, more, scratch: { panel, sym, grid } };
  },
};

// ---- CLAW MACHINE (user's pick, 2026-10-14) ------------------------------------------------------------------------

/**
 * CLAW MACHINE: three prizes in the pit (shown before you pay): chips, a pair of Charms and a relic. Pay chips for a
 * go and pick one to aim at: the easy grab holds most of the time, the relic rarely. A prize you win leaves the pit.
 * Three goes a visit.
 */
export const CLAW = { price: 5, tries: 3, chips: 10 };
export const CLAW_PRIZES = [
  { id: 'chips', name: 'CHIPS', hold: 0.65, grip: 'EASY GRAB' },
  { id: 'charm', name: '2 CHARMS', hold: 0.4, grip: 'TRICKY GRAB' },
  { id: 'relic', name: 'A RELIC', hold: 0.2, grip: 'HARD GRAB' },
] as const;
/** A prize's name at this loop (the chips one says how many). */
export const clawPrizeName = (run: RunState, k: number) => (CLAW_PRIZES[k].id === 'chips' ? `${atStakes(run, CLAW.chips)} CHIPS` : CLAW_PRIZES[k].name);
/** Prizes already won at this stop (they're gone from the pit). */
export const clawWon = (run: RunState): number[] => ((run.encounterState as { won?: number[] } | undefined)?.won ?? []) as number[];
const CLAW_MACHINE: EncounterDef = {
  id: 'claw',
  name: 'CLAW MACHINE',
  blurb: '',
  kind: 'game',
  plays: CLAW.tries,
  choices: (run) => [...CLAW_PRIZES.map((p, k) => ({ label: clawPrizeName(run, k), text: p.grip, disabled: run.player.chips < atStakes(run, CLAW.price) || clawWon(run).includes(k) })), WALK],
  play: (run, i, rng, ctx) => {
    const won = clawWon(run);
    if (i >= CLAW_PRIZES.length || run.player.chips < atStakes(run, CLAW.price) || won.includes(i)) return walked();
    run.player.chips -= atStakes(run, CLAW.price);
    const prize = CLAW_PRIZES[i];
    const held = rng.next() < prize.hold;
    let text = 'IT SLIPPED';
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
      run.encounterState = { won: [...won, i] } as unknown as Record<string, number | number[]>;
    }
    return { title: held ? 'GOT IT!' : 'SO CLOSE', text, good: held, claw: { prize: i, held } };
  },
};

export const ENCOUNTERS: Record<string, EncounterDef> = { slot: LUCKY_SEVENS, bj: TWENTY_ONE, rats: RAT_RACE, scratch: SCRATCH_OFF, claw: CLAW_MACHINE };
/** What the map deals onto ENCOUNTER stops. */
export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);

/** The encounter at this stop, or a stand-in if a save names one that's gone. */
export const encounterOf = (id: string | undefined): EncounterDef => (id && ENCOUNTERS[id]) || LUCKY_SEVENS;

/** Deterministic per run, act, stop and play (a game's 2nd spin draws its own stream): a quit can't re-roll it. */
export const encounterRng = (run: RunState) =>
  new Rng((run.seed ^ Math.imul(run.act * 64 + run.stop + 5, 0x2f6b9a35) ^ ((run.endless?.loop ?? 0) * 0x61c88647) ^ Math.imul(run.encounterPlays ?? 0, 0x7feb352d)) >>> 0);
