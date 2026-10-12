/**
 * ENCOUNTERS (2026-10-12): the map's non-fight stops, where you gamble between fights (they replace SIDE BETS).
 * Fights stay watch-only; an encounter is a choice: stake chips, HP, relics or upgrades, or walk away.
 *
 * LUCKY SEVENS is the first real one (the template for the rest: buy-ins, then plays). DOUBLE OR NOTHING and THE
 * BLOOD BANK are placeholders until ROULETTE and the real offers. Each is deterministic per run seed, act and stop,
 * so a quit can't re-roll it.
 */
import { UNIT, type RelicId } from './config';
import { Rng } from './rng';
import { RELICS } from './relics';
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
}
/** What the run lends an encounter: relics you could win, and an upgrade it can hand out. */
export interface EncounterCtx {
  relics: RelicId[];
  /** Apply one upgrade (a level for a symbol or Charm you own); returns its name, or null if there's none to give. */
  upgrade: () => string | null;
}
export interface EncounterDef {
  id: string;
  name: string;
  blurb: string;
  /** A game of chance (buy-ins, then plays) or an offer (take it or walk). */
  kind: 'game' | 'offer';
  choices: (run: RunState, rng: Rng) => EncounterChoice[];
  /** Play choice `i` (the last choice is always WALK AWAY). */
  play: (run: RunState, i: number, rng: Rng, ctx: EncounterCtx) => EncounterResult;
}

const WALK: EncounterChoice = { label: 'WALK AWAY', text: 'KEEP WHAT YOU HAVE' };
const walked = (): EncounterResult => ({ title: 'WALKED AWAY', text: '', good: null });

/** DOUBLE OR NOTHING: half your chips on one spin of the wheel. (Placeholder until ROULETTE.) */
const DOUBLE: EncounterDef = {
  id: 'double',
  name: 'DOUBLE OR NOTHING',
  blurb: 'ONE SPIN. RED OR BLACK.',
  kind: 'game',
  choices: (run) => {
    const stake = Math.floor(run.player.chips / 2);
    return [{ label: `BET ${stake}`, text: `DOUBLE IT, OR LOSE IT`, disabled: stake < 1 }, WALK];
  },
  play: (run, i, rng) => {
    if (i !== 0) return walked();
    const stake = Math.floor(run.player.chips / 2);
    if (stake < 1) return walked();
    if (rng.next() < 0.5) {
      run.player.chips += stake;
      return { title: 'RED!', text: `+${stake} CHIPS`, good: true };
    }
    run.player.chips -= stake;
    return { title: 'BLACK...', text: `-${stake} CHIPS`, good: false };
  },
};

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
    const pay = SLOT.chips[sym];
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
      { label: 'A', text: '', stake: `${SLOT.low.chips} CHIPS`, prize: `${SLOT.low.pulls} PULLS`, disabled: run.player.chips < SLOT.low.chips },
      { label: 'B', text: '', stake: `${hp} HP`, prize: `${SLOT.mid.pulls} PULLS`, disabled: run.player.hp <= hp },
      { label: 'C', text: '', stake: relic ? RELICS[relic].name : 'A RELIC', prize: `${SLOT.high.pulls} PULLS`, relic: relic ?? undefined, disabled: !relic },
      WALK,
    ];
  },
  play: (run, i, rng, ctx) => {
    const p = run.player;
    let pulls = 0;
    if (i === 0 && p.chips >= SLOT.low.chips) {
      p.chips -= SLOT.low.chips;
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
    // The stake's pick drew from a fork of the stop's stream; the pulls draw from the stream itself.
    const tally = new Map<string, number>();
    const out = Array.from({ length: pulls }, () => pullSlot(run, rng, ctx, tally));
    const gains = [...tally].map(([k, v]) => (k === 'CHIPS' ? `+${v} CHIPS` : k === 'HP' ? `+${v} HP` : k === 'MAX HP' ? `+${v} MAX HP` : v > 1 ? `${k} X${v}` : k));
    return { title: gains.length ? 'PAID OUT' : 'NO LUCK', text: gains.join('  '), good: gains.length > 0, pulls: out, gains };
  },
};

/** THE BLOOD BANK: sell some HP for chips. */
const BLOOD_HP = 0.15;
const BLOOD_CHIPS = 12;
const BLOOD: EncounterDef = {
  id: 'blood',
  name: 'THE BLOOD BANK',
  blurb: 'A PALE MAN WITH A CLIPBOARD. HE PAYS CASH.',
  kind: 'offer',
  choices: (run) => {
    const hp = bloodHp(run);
    return [{ label: `SELL ${hp} HP`, text: `+${BLOOD_CHIPS} CHIPS`, disabled: run.player.hp <= hp }, WALK];
  },
  play: (run, i) => {
    const hp = bloodHp(run);
    if (i !== 0 || run.player.hp <= hp) return walked();
    run.player.hp -= hp;
    run.player.chips += BLOOD_CHIPS;
    return { title: 'SOLD', text: `-${hp} HP, +${BLOOD_CHIPS} CHIPS`, good: true };
  },
};
const bloodHp = (run: RunState) => Math.max(UNIT, Math.round((run.player.maxHp * BLOOD_HP) / UNIT) * UNIT);

export const ENCOUNTERS: Record<string, EncounterDef> = { slot: LUCKY_SEVENS, double: DOUBLE, blood: BLOOD };
/** What the map deals onto ENCOUNTER stops. */
export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);

/** The encounter at this stop, or a stand-in if a save names one that's gone. */
export const encounterOf = (id: string | undefined): EncounterDef => (id && ENCOUNTERS[id]) || DOUBLE;

/** Deterministic per run, act and stop: a quit can't re-roll it. */
export const encounterRng = (run: RunState) => new Rng((run.seed ^ Math.imul(run.act * 64 + run.stop + 5, 0x2f6b9a35) ^ ((run.endless?.loop ?? 0) * 0x61c88647)) >>> 0);
