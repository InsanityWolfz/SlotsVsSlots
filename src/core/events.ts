import type { SideId, SymbolId } from './config';
import type { LineScore } from './scoring';
import type { CellRef } from './strip';

/**
 * Everything that happens in a fight, in order. The presentation layer plays these back;
 * the combat log and recap stats are derived from them. Values are post-event state.
 */
export type CombatEvent =
  | { type: 'turnStart'; turn: number; side: SideId }
  | { type: 'shieldReset'; side: SideId; lost: number }
  | { type: 'spin'; side: SideId; stops: number[]; score: LineScore; nearMiss: boolean }
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
  | { type: 'slime'; from: SideId; to: SideId; reels: number[]; amount: number; cells: CellRef[]; wasted: number }
  | { type: 'cleanse'; side: SideId; reels: number[]; cells: CellRef[] }
  | { type: 'fizzle'; side: SideId; reels: number[]; symbol: SymbolId }
  | { type: 'death'; side: SideId }
  | { type: 'fightEnd'; winner: SideId; turns: number };

export type CombatEventType = CombatEvent['type'];
