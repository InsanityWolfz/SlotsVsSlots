/**
 * ENCOUNTERS (2026-10-12): the map's non-fight stops, where you gamble between fights (they replace SIDE BETS).
 * Fights stay watch-only; an encounter is a choice: stake chips, HP, relics or upgrades, or walk away.
 *
 * PLACEHOLDERS: the user is designing the real set. These three exist so the map, the screen and the sim have
 * something to deal. Each is deterministic per run seed, act and stop, so a quit can't re-roll it.
 */
import { UNIT, type RelicId } from './config';
import { Rng } from './rng';
import { RELICS } from './relics';
import type { RunState } from './run';

export interface EncounterChoice {
  label: string;
  /** What it costs or risks, in plain words (no odds, no expected value: the user's no-hints rule). */
  text: string;
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
}
export interface EncounterDef {
  id: string;
  name: string;
  blurb: string;
  choices: (run: RunState) => EncounterChoice[];
  /** Play choice `i` (the last choice is always WALK AWAY). `relics`: relics you could win right now. */
  play: (run: RunState, i: number, rng: Rng, relics: RelicId[]) => EncounterResult;
}

const WALK: EncounterChoice = { label: 'WALK AWAY', text: 'KEEP WHAT YOU HAVE' };
const walked = (): EncounterResult => ({ title: 'YOU WALK AWAY', text: 'THE HOUSE NODS. MAYBE NEXT TIME.', good: null });

/** DOUBLE OR NOTHING: half your chips on one spin of the wheel. */
const DOUBLE: EncounterDef = {
  id: 'double',
  name: 'DOUBLE OR NOTHING',
  blurb: 'ONE SPIN. RED OR BLACK.',
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

/** THE ONE-ARMED BANDIT: pay to pull. Three of a kind is a relic; a pair is chips back with interest. */
const BANDIT_COST = 6;
const BANDIT_SYMBOLS = ['seven', 'coin', 'ace', 'note', 'bolt'];
const BANDIT: EncounterDef = {
  id: 'bandit',
  name: 'THE ONE-ARMED BANDIT',
  blurb: 'A DUSTY MACHINE IN THE CORNER. IT STILL TAKES CHIPS.',
  choices: (run) => [{ label: `PULL - ${BANDIT_COST}`, text: 'THREE OF A KIND PAYS A RELIC', disabled: run.player.chips < BANDIT_COST }, WALK],
  play: (run, i, rng, relics) => {
    if (i !== 0 || run.player.chips < BANDIT_COST) return walked();
    run.player.chips -= BANDIT_COST;
    const r = rng.next();
    const sym = rng.pick(BANDIT_SYMBOLS);
    const other = () => rng.pick(BANDIT_SYMBOLS.filter((x) => x !== sym));
    if (r < 0.3) {
      const relic = relics.length ? rng.pick(relics) : null;
      if (relic) {
        run.player.relics.push(relic);
        return { title: 'JACKPOT!', text: `YOU WIN ${RELICS[relic].name}`, good: true, reels: [sym, sym, sym] };
      }
    }
    if (r < 0.7) {
      const prize = BANDIT_COST * 2;
      run.player.chips += prize;
      return { title: 'A PAIR', text: `+${prize} CHIPS`, good: true, reels: [sym, sym, other()] };
    }
    const a = other();
    return { title: 'NOTHING', text: `-${BANDIT_COST} CHIPS`, good: false, reels: [sym, a, rng.pick(BANDIT_SYMBOLS.filter((x) => x !== sym && x !== a))] };
  },
};

/** THE BLOOD BANK: sell some HP for chips. */
const BLOOD_HP = 0.15;
const BLOOD_CHIPS = 12;
const BLOOD: EncounterDef = {
  id: 'blood',
  name: 'THE BLOOD BANK',
  blurb: 'A PALE MAN WITH A CLIPBOARD. HE PAYS CASH.',
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

export const ENCOUNTERS: Record<string, EncounterDef> = { double: DOUBLE, bandit: BANDIT, blood: BLOOD };
/** What the map deals onto ENCOUNTER stops. */
export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS);

/** The encounter at this stop, or a stand-in if a save names one that's gone. */
export const encounterOf = (id: string | undefined): EncounterDef => (id && ENCOUNTERS[id]) || DOUBLE;

/** Deterministic per run, act and stop: a quit can't re-roll it. */
export const encounterRng = (run: RunState) => new Rng((run.seed ^ Math.imul(run.act * 64 + run.stop + 5, 0x2f6b9a35) ^ ((run.endless?.loop ?? 0) * 0x61c88647)) >>> 0);
