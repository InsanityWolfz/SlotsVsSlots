/**
 * ENCOUNTERS (2026-10-12): the map's non-fight stops, where you gamble between fights (they replace SIDE BETS).
 * Fights stay watch-only; an encounter is a choice: stake chips, HP, relics or upgrades, or walk away.
 *
 * THE PRIZE SLOT is the first real one (the template for the rest: buy-ins, then plays). DOUBLE OR NOTHING and THE
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
/** One pull of THE PRIZE SLOT: the five cells on its line, and what that line paid. */
export interface SlotPull {
  cells: SlotSym[];
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
  /** THE PRIZE SLOT: every pull you bought, in order (already paid: a quit can't re-roll them). */
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
const walked = (): EncounterResult => ({ title: 'YOU WALK AWAY', text: 'THE HOUSE NODS. MAYBE NEXT TIME.', good: null });

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

// ---- THE PRIZE SLOT (2026-10-12) ---------------------------------------------------------------------------------

/**
 * THE PRIZE SLOT: a 5-reel machine that pays prizes, not damage. Buy pulls: a bigger buy-in buys more of them (each a
 * little better value). Every CHIP on the line pays a chip (most of what it pays is chips); 3 or more of a kind
 * anywhere on the line pays that prize. All numbers are a first pass, to be tuned with the new sim.
 */
export type SlotSym = 'chip' | 'heart' | 'star' | 'relic' | 'skull';
export const SLOT = {
  /** Each cell's odds (weights). */
  weights: { chip: 32, heart: 20, star: 14, relic: 7, skull: 27 } as Record<SlotSym, number>,
  /** The buy-ins: LOW chips, MEDIUM a share of your max HP, HIGH a relic the house picks. */
  low: { chips: 7, pulls: 3 },
  mid: { hpShare: 0.2, pulls: 6 },
  high: { pulls: 10 },
  /** Pays: chips per CHIP, the 4- and 5-CHIP bonuses, the HEART heals, the max HP on 5 HEARTS. */
  chipEach: 1,
  chips4: 5,
  chips5: 15,
  heal3: 4 * UNIT,
  heal4: 8 * UNIT,
  maxHp5: 4 * UNIT,
};
const SLOT_ORDER: SlotSym[] = ['chip', 'heart', 'star', 'relic', 'skull'];
const rollCell = (rng: Rng): SlotSym => {
  const total = SLOT_ORDER.reduce((a, k) => a + SLOT.weights[k], 0);
  let r = rng.next() * total;
  for (const k of SLOT_ORDER) if ((r -= SLOT.weights[k]) < 0) return k;
  return 'skull';
};
const slotHp = (run: RunState) => Math.max(UNIT, Math.round((run.player.maxHp * SLOT.mid.hpShare) / UNIT) * UNIT);
/** The relic the house wants for the HIGH buy-in (fixed for this stop, so the card never changes under you). */
const slotRelic = (run: RunState, rng: Rng): RelicId | null => (run.player.relics.length ? rng.fork().pick(run.player.relics) : null);

/** One pull: roll the line, pay it, say what it paid. */
function pullSlot(run: RunState, rng: Rng, ctx: EncounterCtx, tally: Map<string, number>): SlotPull {
  const cells = [0, 1, 2, 3, 4].map(() => rollCell(rng));
  const n = (k: SlotSym) => cells.filter((c) => c === k).length;
  const wins: string[] = [];
  const add = (key: string, k = 1) => tally.set(key, (tally.get(key) ?? 0) + k);
  const p = run.player;
  const before = { chips: p.chips, hp: p.hp, maxHp: p.maxHp };
  const chips = n('chip') * SLOT.chipEach + (n('chip') === 5 ? SLOT.chips5 : n('chip') === 4 ? SLOT.chips4 : 0);
  if (chips) {
    p.chips += chips;
    add('CHIPS', chips);
    wins.push(`+${chips} CHIPS`);
  }
  if (n('heart') >= 5) {
    p.maxHp += SLOT.maxHp5;
    p.hp += SLOT.maxHp5;
    add('MAX HP', SLOT.maxHp5);
    wins.push(`+${SLOT.maxHp5} MAX HP`);
  } else if (n('heart') >= 3) {
    const heal = Math.min(p.maxHp - p.hp, n('heart') === 4 ? SLOT.heal4 : SLOT.heal3);
    p.hp += heal;
    add('HP', heal);
    wins.push(`+${heal} HP`);
  }
  for (let k = 0; k < (n('star') >= 4 ? 2 : n('star') >= 3 ? 1 : 0); k++) {
    const up = ctx.upgrade();
    if (up) {
      add(up);
      wins.push(up);
    } else {
      p.chips += 8;
      add('CHIPS', 8);
      wins.push('+8 CHIPS');
    }
  }
  if (n('relic') >= 3) {
    const pool = ctx.relics.filter((r) => !p.relics.includes(r));
    const relic = pool.length ? rng.pick(pool) : null;
    if (relic) {
      p.relics.push(relic);
      add(RELICS[relic].name);
      wins.push(RELICS[relic].name);
    } else {
      p.chips += 15;
      add('CHIPS', 15);
      wins.push('+15 CHIPS');
    }
  }
  return { cells, wins, gain: { chips: p.chips - before.chips, hp: p.hp - before.hp, maxHp: p.maxHp - before.maxHp } };
}

const PRIZE_SLOT: EncounterDef = {
  id: 'slot',
  name: 'THE PRIZE SLOT',
  blurb: 'FIVE REELS. NO ENEMY. JUST PRIZES.',
  kind: 'game',
  choices: (run, rng) => {
    const hp = slotHp(run);
    const relic = slotRelic(run, rng);
    return [
      { label: 'LOW', text: '', stake: `${SLOT.low.chips} CHIPS`, prize: `${SLOT.low.pulls} PULLS`, disabled: run.player.chips < SLOT.low.chips },
      { label: 'MEDIUM', text: '', stake: `${hp} HP`, prize: `${SLOT.mid.pulls} PULLS`, disabled: run.player.hp <= hp },
      { label: 'HIGH', text: '', stake: relic ? RELICS[relic].name : 'A RELIC', prize: `${SLOT.high.pulls} PULLS`, relic: relic ?? undefined, disabled: !relic },
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
    return { title: gains.length ? 'PAID OUT' : 'NOTHING', text: gains.join('  ') || 'THE HOUSE WINS THIS ONE', good: gains.length > 0, pulls: out, gains };
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

export const ENCOUNTERS: Record<string, EncounterDef> = { slot: PRIZE_SLOT, double: DOUBLE, blood: BLOOD };
/** What the map deals onto ENCOUNTER stops. */
export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);

/** The encounter at this stop, or a stand-in if a save names one that's gone. */
export const encounterOf = (id: string | undefined): EncounterDef => (id && ENCOUNTERS[id]) || DOUBLE;

/** Deterministic per run, act and stop: a quit can't re-roll it. */
export const encounterRng = (run: RunState) => new Rng((run.seed ^ Math.imul(run.act * 64 + run.stop + 5, 0x2f6b9a35) ^ ((run.endless?.loop ?? 0) * 0x61c88647)) >>> 0);
