import type { AbilityKind, RelicId, SideId, SymbolId } from './config';
import type { LineScore } from './scoring';
import type { CellRef } from './strip';

/**
 * Everything that happens in a fight, in order. The presentation layer plays these back;
 * the combat log and recap stats are derived from them. Values are post-event state.
 */
export type CombatEvent =
  | { type: 'turnStart'; turn: number; side: SideId }
  | { type: 'shieldReset'; side: SideId; lost: number }
  | {
      type: 'spin';
      side: SideId;
      stops: number[];
      score: LineScore;
      nearMiss: boolean;
      /** Reels that did not spin this turn (frozen). */
      frozen: boolean[];
      /** Reels whose payline scored nothing this turn (jammed). */
      locked: boolean[];
      /** A relic turned a near-miss into a jackpot. */
      lucky: RelicId | null;
    }
  | {
      type: 'attack';
      from: SideId;
      to: SideId;
      reels: number[];
      amount: number;
      blocked: number;
      hpDamage: number;
      targetHp: number;
      targetShield: number;
    }
  | { type: 'shieldGain'; side: SideId; reels: number[]; amount: number; total: number }
  | { type: 'energyGain'; side: SideId; reels: number[]; amount: number; total: number }
  | {
      type: 'specialFire';
      from: SideId;
      to: SideId;
      amount: number;
      blocked: number;
      hpDamage: number;
      targetHp: number;
      targetShield: number;
      energyLeft: number;
    }
  | { type: 'heal'; side: SideId; amount: number; hp: number; source: RelicId | 'special' }
  | { type: 'slime'; from: SideId; to: SideId; reels: number[]; amount: number; cells: CellRef[]; wasted: number }
  | { type: 'cleanse'; side: SideId; reels: number[]; cells: CellRef[] }
  | { type: 'freeze'; from: SideId; to: SideId; reels: number[]; targets: number[]; turns: number }
  | { type: 'lock'; from: SideId; to: SideId; reels: number[]; targets: number[]; turns: number }
  /** A status ran out on these reels. */
  | { type: 'thaw'; side: SideId; reels: number[]; status: 'frozen' | 'locked' }
  | { type: 'steal'; from: SideId; to: SideId; reels: number[]; cells: CellRef[]; symbols: SymbolId[]; wasted: number }
  /** Rocks inserted into the target's strips (indices are post-insert, applied in order). */
  | { type: 'junk'; from: SideId; to: SideId; reels: number[]; inserts: CellRef[] }
  | { type: 'fizzle'; side: SideId; reels: number[]; symbol: SymbolId }
  /** Enemy special meter after this turn: `charge` of `every`. */
  | { type: 'abilityCharge'; side: SideId; charge: number; every: number; kind: AbilityKind }
  /** Header for an ability firing; its effects follow as regular events. */
  | { type: 'ability'; side: SideId; kind: AbilityKind; power: number }
  | { type: 'pot'; side: SideId; reels: number[]; amount: number; total: number }
  /** Someone takes the progressive pot as damage. */
  | { type: 'potWin'; from: SideId; to: SideId; amount: number; blocked: number; hpDamage: number; targetHp: number; targetShield: number }
  | { type: 'death'; side: SideId }
  | { type: 'fightEnd'; winner: SideId; turns: number };

export type CombatEventType = CombatEvent['type'];
