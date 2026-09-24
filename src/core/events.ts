import type { AbilityKind, RelicId, SideId, SymbolId, Enh } from './config';
import type { LineScore } from './scoring';
import type { CellRef } from './strip';

/**
 * Everything that happens in a fight, in order. The presentation layer plays these back;
 * the combat log and recap stats are derived from them. Values are post-event state.
 */
/** Bonus vouchers: BONUS WHEEL (a free upgrade) or RELIC RUSH (a free relic). */
export type VoucherKind = 'wheel' | 'rush';

/** The Dealer's face-up cards. */
export type DealCard = 'shuffle' | 'cut' | 'raise';

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
      /** A FULL SET bonus paid on this spin. */
      fullSet?: boolean;
      /** Reels whose LUCKY cell turned into a WILD this spin. */
      luckyWilds?: number[];
      /** Reels that were hexed this spin (pay half). */
      hexed?: boolean[];
      /** This spin landed a bonus (three chase symbols): it pays nothing and the reels spin again. */
      bonus?: VoucherKind;
    }
  | {
      type: 'attack';
      from: SideId;
      to: SideId;
      reels: number[];
      amount: number;
      /** KEEN: ignored shields. SPIKED: this is a reflected hit. Act 2: drain / mimic / reflect. */
      note?: 'pierce' | 'spiked' | 'snap' | 'drain' | 'mimic' | 'reflect';
      blocked: number;
      hpDamage: number;
      targetHp: number;
      targetShield: number;
    }
  | { type: 'shieldGain'; side: SideId; reels: number[]; amount: number; total: number }
  | { type: 'energyGain'; side: SideId; reels: number[]; amount: number; total: number; /** Energy the Grounder's rods earthed away. */ earthed?: number }
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
      /** A grounded cell on the payline: this special hit shields. */
      grounded?: boolean;
    }
  | { type: 'heal'; side: SideId; amount: number; hp: number; source: RelicId | 'special' | 'vamp' | 'drain' | 'ability' }
  | { type: 'slime'; from: SideId; to: SideId; reels: number[]; amount: number; cells: CellRef[]; wasted: number }
  | { type: 'cleanse'; side: SideId; reels: number[]; cells: CellRef[] }
  /** stops[i] = where targets[i] clunked to before freezing (its least useful visible cell). */
  | { type: 'freeze'; from: SideId; to: SideId; reels: number[]; targets: number[]; turns: number; stops: number[] }
  | { type: 'lock'; from: SideId; to: SideId; reels: number[]; targets: number[]; turns: number }
  /** A status ran out on these reels. */
  | { type: 'thaw'; side: SideId; reels: number[]; status: 'frozen' | 'locked' | 'hexed' | 'raked' }
  /** The Card Sharp marked cells (dead CARDs for the fight). */
  | { type: 'mark'; from: SideId; to: SideId; reels: number[]; cells: CellRef[] }
  /** A marked card landed on the payline and bit. */
  | { type: 'markedHit'; side: SideId; cells: CellRef[]; amount: number; blocked: number; hpDamage: number; targetHp: number; targetShield: number }
  /** The Pit Boss confiscated gilds (cells lose their gild for the fight). */
  | { type: 'confiscate'; from: SideId; to: SideId; reels: number[]; cells: CellRef[]; enhs: Enh[] }
  /** The Croupier rakes your winnings: your groups pay less for `turns` of your turns. */
  | { type: 'rake'; from: SideId; to: SideId; reels: number[]; turns: number; cut: number }
  /** A bonus voucher was banked: it pays out if you win this fight. */
  | { type: 'voucher'; side: SideId; kind: VoucherKind }
  /** The Dealer shows the card it will deal next (telegraph). */
  | { type: 'dealNext'; side: SideId; card: DealCard }
  /** SHUFFLE: cells swapped between two of the target's reels (index pairs: [in reel a, in reel b]). */
  | { type: 'shuffle'; from: SideId; to: SideId; reels: [number, number]; swaps: [number, number][] }
  /** CUT: cells removed from the target's reels (one per reel, indexes before removal). */
  | { type: 'cut'; from: SideId; to: SideId; cells: CellRef[] }
  /** RAISE: the Dealer's next hit and your next jackpot are doubled. */
  | { type: 'raise'; from: SideId }
  /** The Dealer at half HP: HOUSE RULES (deals faster). */
  | { type: 'houseRules'; side: SideId; every: number }
  /** Hexed reels pay half for `turns` of their owner's turns. */
  | { type: 'hex'; from: SideId; to: SideId; reels: number[]; targets: number[]; turns: number }
  /** Bombs stuck onto the target's cells. */
  | { type: 'bomb'; from: SideId; to: SideId; reels: number[]; cells: CellRef[] }
  /** A bomb's fuse ran out. */
  | { type: 'blast'; side: SideId; cell: CellRef; amount: number; blocked: number; hpDamage: number; targetHp: number; targetShield: number }
  /** Bombs that landed on the payline were defused. */
  | { type: 'defuse'; side: SideId; cells: CellRef[] }
  /** Every live bomb on this side's strips burned one turn of fuse. */
  | { type: 'fuse'; side: SideId; cells: CellRef[]; fuses: number[] }
  /** The Grounder drove rods into bolt cells. */
  | { type: 'ground'; from: SideId; to: SideId; reels: number[]; cells: CellRef[] }
  /** The Counterfeiter faked gilded cells (plain for `turns`). */
  | { type: 'fake'; from: SideId; to: SideId; reels: number[]; cells: CellRef[]; turns: number; /** The gild types counterfeited. */ enhs: Enh[] }
  /** Faked cells burned a turn; `left` 0 = the fake wore off. */
  | { type: 'fakeTick'; side: SideId; cells: CellRef[]; left: number[] }
  /** EARTH: energy drained from the target. */
  | { type: 'earth'; from: SideId; to: SideId; amount: number; total: number }
  /** The Mimic ate some of your chips. */
  | { type: 'gulp'; from: SideId; chips: number }
  /** Phoenix Feather saved you from a lethal hit. */
  | { type: 'phoenix'; side: SideId; hp: number }
  /** The Mirror cracked at half HP: it reflects faster. */
  | { type: 'shatter'; side: SideId; every: number }
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
  | { type: 'potWin'; from: SideId; to: SideId; amount: number; blocked: number; hpDamage: number; targetHp: number; targetShield: number; potLeft: number }
  /** A relic shrugged off an enemy effect. */
  | { type: 'resist'; side: SideId; relic: RelicId; what: 'freeze' | 'jam' | 'steal' }
  /** Boss phase 2 at half HP: the House goes ALL IN and doubles the pot. */
  | { type: 'phase'; side: SideId; pot: number }
  | { type: 'death'; side: SideId }
  | { type: 'fightEnd'; winner: SideId; turns: number };

export type CombatEventType = CombatEvent['type'];
