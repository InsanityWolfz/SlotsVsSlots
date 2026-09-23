import type { SideId } from './config';
import type { CombatEvent } from './events';
import type { Fight } from './fight';
import { slimeFraction } from './strip';

export interface SideStats {
  spins: number;
  damageDealt: number;
  damageBlocked: number;
  shieldGained: number;
  pairs: number;
  triples: number;
  nearMisses: number;
  nearMissHits: number;
  specials: number;
  specialDamage: number;
  energyGained: number;
  slimeApplied: number;
  slimeWasted: number;
  cleanses: number;
  cellsCleansed: number;
  peakSlimePct: number;
  biggestHit: number;
  longestDrySpell: number;
  reelsFrozen: number;
  reelsJammed: number;
  symbolsStolen: number;
  rocksAdded: number;
  abilities: number;
  potWon: number;
  healed: number;
  lucky: number;
}

export interface FightStats {
  seed: number;
  turns: number;
  winner: SideId | null;
  sides: Record<SideId, SideStats>;
}

const emptySide = (): SideStats => ({
  spins: 0,
  damageDealt: 0,
  damageBlocked: 0,
  shieldGained: 0,
  pairs: 0,
  triples: 0,
  nearMisses: 0,
  nearMissHits: 0,
  specials: 0,
  specialDamage: 0,
  energyGained: 0,
  slimeApplied: 0,
  slimeWasted: 0,
  cleanses: 0,
  cellsCleansed: 0,
  peakSlimePct: 0,
  biggestHit: 0,
  longestDrySpell: 0,
  reelsFrozen: 0,
  reelsJammed: 0,
  symbolsStolen: 0,
  rocksAdded: 0,
  abilities: 0,
  potWon: 0,
  healed: 0,
  lucky: 0,
});

export class StatsTracker {
  readonly stats: FightStats;
  private dry: Record<SideId, number> = { player: 0, enemy: 0 };

  constructor(private fight: Fight) {
    this.stats = { seed: fight.seed, turns: 0, winner: null, sides: { player: emptySide(), enemy: emptySide() } };
  }

  record(events: CombatEvent[]): void {
    for (const e of events) this.one(e);
    const p = this.stats.sides.player;
    p.peakSlimePct = Math.max(p.peakSlimePct, slimeFraction(this.fight.sides.player.reels));
  }

  private one(e: CombatEvent): void {
    const S = this.stats.sides;
    switch (e.type) {
      case 'turnStart':
        this.stats.turns = e.turn;
        break;
      case 'spin': {
        const s = S[e.side];
        s.spins++;
        if (e.score.tier === 'pair') s.pairs++;
        if (e.score.tier === 'triple') s.triples++;
        if (e.nearMiss) {
          s.nearMisses++;
          if (e.score.tier === 'triple') s.nearMissHits++;
        }
        if (e.lucky) s.lucky++;
        this.dry[e.side] = e.score.tier === 'none' ? this.dry[e.side] + 1 : 0;
        s.longestDrySpell = Math.max(s.longestDrySpell, this.dry[e.side]);
        break;
      }
      case 'attack':
        S[e.from].damageDealt += e.hpDamage;
        S[e.to].damageBlocked += e.blocked;
        S[e.from].biggestHit = Math.max(S[e.from].biggestHit, e.amount);
        break;
      case 'specialFire':
        S[e.from].specials++;
        S[e.from].specialDamage += e.hpDamage;
        S[e.from].damageDealt += e.hpDamage;
        S[e.to].damageBlocked += e.blocked;
        S[e.from].biggestHit = Math.max(S[e.from].biggestHit, e.amount);
        break;
      case 'shieldGain':
        S[e.side].shieldGained += e.amount;
        break;
      case 'energyGain':
        S[e.side].energyGained += e.amount;
        break;
      case 'slime':
        S[e.from].slimeApplied += e.cells.length;
        S[e.from].slimeWasted += e.wasted;
        break;
      case 'cleanse':
        S[e.side].cleanses++;
        S[e.side].cellsCleansed += e.cells.length;
        break;
      case 'freeze':
        S[e.from].reelsFrozen += e.targets.length;
        break;
      case 'lock':
        S[e.from].reelsJammed += e.targets.length;
        break;
      case 'steal':
        S[e.from].symbolsStolen += e.cells.length;
        break;
      case 'junk':
        S[e.from].rocksAdded += e.inserts.length;
        break;
      case 'ability':
        S[e.side].abilities++;
        break;
      case 'potWin':
        S[e.from].potWon += e.amount;
        S[e.from].damageDealt += e.hpDamage;
        S[e.to].damageBlocked += e.blocked;
        break;
      case 'heal':
        S[e.side].healed += e.amount;
        break;
      case 'fightEnd':
        this.stats.winner = e.winner;
        break;
    }
  }
}
