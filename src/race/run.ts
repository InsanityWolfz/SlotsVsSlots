import { Rng } from '../core/rng';
import { PAYERS, Race, type Sym } from './race';

/**
 * THE NEW GAME's run (step 3, VISION "the run"): 9 races in 3 stops of race, race, boss. The rival's BET climbs by
 * race; a won race pays a PRIZE (pick 1 of 3 "[SYMBOL] X2" cards: that symbol's pays double, and picks stack); a lost
 * race costs a CREDIT and its prize; a lost boss race is replayed; out of credits is GAME OVER; beating the last boss
 * wins the run. Pure rules, no drawing.
 */
export const RUN = {
  credits: 3,
  /** The rival's BET for each race, stop by stop (the last race of a stop is its boss). */
  bets: [
    [1.5, 2, 3],
    [2.5, 3, 4.5],
    [4, 5, 8],
  ],
  /** Cards on offer after a win. */
  offer: 3,
};

/** What a pick can double: the four payers and KNIGHT's SWORD. */
export const PICKS: Sym[] = [...PAYERS, 'sword'];

export interface RaceRecord {
  race: number;
  bet: number;
  boss: boolean;
  you: number;
  rival: number;
  won: boolean;
}

export class Run {
  readonly rng: Rng;
  credits = RUN.credits;
  /** The race you're on (0-based, 0..8). */
  index = 0;
  mults: Partial<Record<Sym, number>> = {};
  /** The PRIZE: cards to pick one from (null: nothing to pick). */
  offer: Sym[] | null = null;
  /** This race is a boss you lost and are playing again. */
  replay = false;
  over = false;
  won = false;
  history: RaceRecord[] = [];

  constructor(seed = Rng.randomSeed()) {
    this.rng = new Rng(seed);
  }

  static get races(): number {
    return RUN.bets.flat().length;
  }

  get stop(): number {
    return Math.floor(this.index / RUN.bets[0].length);
  }

  get isBoss(): boolean {
    return this.index % RUN.bets[0].length === RUN.bets[0].length - 1;
  }

  get bet(): number {
    return RUN.bets.flat()[this.index];
  }

  /** This stop's boss BET (shown a race ahead, like Balatro's boss blind). */
  get bossBet(): number {
    return RUN.bets[this.stop][RUN.bets[0].length - 1];
  }

  mult(s: Sym): number {
    return this.mults[s] ?? 1;
  }

  /** The next race, with your MULTs and this race's BET. */
  newRace(): Race {
    return new Race({ seed: this.rng.int(0xffffffff), bet: this.bet, mults: { ...this.mults } });
  }

  /** A race is over: record it, then the PRIZE (a win), or the credit and maybe the replay (a loss). */
  finish(race: Race): void {
    const won = race.won;
    this.history.push({ race: this.index, bet: this.bet, boss: this.isBoss, you: race.score.you, rival: race.score.rival, won });
    this.replay = false;
    if (won) {
      this.index++;
      if (this.index >= Run.races) {
        this.won = this.over = true;
        return;
      }
      this.offer = this.rng.shuffle(PICKS.slice()).slice(0, RUN.offer);
      return;
    }
    this.credits--;
    if (this.credits <= 0) {
      this.over = true;
      return;
    }
    if (this.isBoss) this.replay = true;
    else this.index++;
  }

  /** Take one of the offered cards: that symbol's pays double for the rest of the run. */
  pick(s: Sym): void {
    if (!this.offer?.includes(s)) return;
    this.mults[s] = this.mult(s) * 2;
    this.offer = null;
  }
}
