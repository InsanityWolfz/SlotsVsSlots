import type { Sounds } from '../audio/sounds';
import type { Synth } from '../audio/synth';
import type { Levels, SideId } from '../core/config';
import type { Camera } from './camera';
import type { Clock } from './clock';
import type { FxLayer } from './fx';
import type { HudView } from './hud';
import type { MachineView } from './machine';
import type { Particles } from './particles';

/** Per-layer juice switches so we can A/B what each layer is worth (tuning panel). */
export interface JuiceToggles {
  shake: boolean;
  zoom: boolean;
  chroma: boolean;
  flash: boolean;
  hitstop: boolean;
  particles: boolean;
  banners: boolean;
  nearMiss: boolean;
  turnCards: boolean;
  audio: boolean;
  /** SOFT LIGHTNING (menu option): a calmer special — no strobing bolt, light shake, no colour split. */
  softLightning: boolean;
}

export const defaultJuice = (): JuiceToggles => ({
  softLightning: false,
  shake: true,
  zoom: true,
  chroma: true,
  flash: true,
  hitstop: true,
  particles: true,
  banners: true,
  nearMiss: true,
  turnCards: false,
  audio: true,
});

/** Everything the director animates. */
export interface Stage {
  clock: Clock;
  camera: Camera;
  particles: Particles;
  fx: FxLayer;
  synth: Synth;
  sounds: Sounds;
  machines: Record<SideId, MachineView>;
  huds: Record<SideId, HudView>;
  juice: JuiceToggles;
  /** Shown in the center gutter. */
  gutter: {
    turn: number;
    side: SideId | null;
    pulse: number;
    pot: number;
    potPunch: number;
    fightLabel: string;
    /** A challenge / weekly / daily run's HOUSE EDGES, shown all run (EXPERT_PLAYTEST_10 D8). */
    twist?: string;
    allIn: boolean;
    /** The Mirror: your best presented spin since its last Reflection, and this turn's running total. */
    reflect?: number;
    turnDamage?: number;
    /** The Mirror cracked (persistent overlay). */
    cracked?: boolean;
    /** Chips the Mimic has eaten so far this fight (presented). */
    chipsEaten?: number;
    /** Bombs presented on the player's strips. */
    bombs?: number;
    /** Bonus vouchers banked this fight (tiles bottom-left; they pay out if you win). */
    vouchers?: ('wheel' | 'rush')[];
    /** The Dealer's face-up next card, and RAISE in play. */
    nextDeal?: import('../core/events').DealCard;
    raised?: boolean;
    raisedTurn?: number;
    houseRules?: boolean;
    /** FINAL HAND: the Dealer's face-up cards after the next one. */
    then?: import('../core/events').DealCard[];
    finalHand?: boolean;
    /** SIDE BET on this fight, its live tracker, and how it ended. */
    bet?: import('../core/bets').PlacedBet | null;
    betTrack?: import('../core/bets').BetTrack;
    betDone?: 'won' | 'lost';
    /** The Dealer's ALL IN is armed (big red warning over its machine). */
    allInArmed?: boolean;
    allInCap?: number;
  };
  /** Symbol / charm levels per side (the payline numbers), and the Golden Ticket (charms one level up). */
  levels: Partial<Record<SideId, Levels>>;
  ticket: boolean;
  /** Enemy shields are worth this much of their base (payline numbers). */
  enemyShield: number;
  /** The player's relics (for the HUD column) and how hard each is popping (1 = just fired). */
  relics: string[];
  relicPops: Record<string, number>;
}
