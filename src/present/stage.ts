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

/** A boss's entrance (directorEntrance.ts), as drawn over the fight (ui/entranceView.ts). */
export interface EntranceView {
  boss: 'house' | 'wheel' | 'dealer' | 'owner';
  name: string;
  /** One line under the name, and the small line above it (ACT 1 BOSS, ENDLESS: LOOP 2). */
  line: string;
  eyebrow: string;
  portrait: string;
  /** The name plate: 0 hidden, 1 in place (it scales and fades in), then `out` 0..1 as it leaves. */
  plate: number;
  out: number;
  /** The fight HUDs and chips slide down from here (px above their place) once the boss is in. */
  hudY: number;
  /** THE DEALER deals a card onto the plate: where it is, its turn and how far it has flipped face-up. */
  card?: { x: number; y: number; rot: number; flip: number };
  /** THE WHEEL's wheel on the plate: its turn (radians). */
  wheel?: number;
  /** THE DOORMAN's raised hand on the plate (ID, PLEASE): 0 down, 1 up. */
  hand?: number;
  /** THE DOORMAN's (act 1) pot glows behind the plate. */
  glow: number;
}

/** Everything the director animates. */
export interface Stage {
  /** A boss's entrance is playing (the fight starts when it ends; any input skips it). */
  entrance?: EntranceView;
  clock: Clock;
  camera: Camera;
  particles: Particles;
  fx: FxLayer;
  synth: Synth;
  sounds: Sounds;
  machines: Record<SideId, MachineView>;
  huds: Record<SideId, HudView>;
  juice: JuiceToggles;
  /** THE ROOMS react to a jackpot: yours cheers the crowd (gold), theirs makes the room wince (red). */
  cheer?: (ours: boolean) => void;
  /** Shown in the center gutter. */
  gutter: {
    turn: number;
    side: SideId | null;
    pulse: number;
    pot: number;
    potPunch: number;
    fightLabel: string;
    allIn: boolean;
    /** BUILD-UP (presented): your next pair or jackpot's multiplier (1 = none), and its pop when it grows. */
    buildUp?: number;
    buildUpPop?: number;
    /** THE WHEEL (presented): chips on your reels, turns to NO MORE BETS, what one chip hits for, SPINS FASTER, and the
     * topper's spin (angle, and how fast it turns now). */
    bets?: number[];
    betsLeft?: number;
    betPer?: number;
    betPunch?: number;
    wheelFast?: boolean;
    wheelAngle?: number;
    wheelSpeed?: number;
    /** Chips the Mimic has eaten so far this fight (presented). */
    chipsEaten?: number;
    /** Bombs presented on the player's strips. */
    bombs?: number;
    /** The Dealer's face-up next card, and the hand it's playing (1-3). */
    nextDeal?: import('../core/events').DealCard;
    dealerHand?: number;
    /** A WILDS bonus wheel is spinning in the gutter (the Dealer's table panel hides under it). */
    wheelUp?: boolean;
    /** The Dealer's ALL IN is armed (big red warning over its machine). */
    allInArmed?: boolean;
    allInCap?: number;
    allInFloor?: number;
  };
  /** Symbol / charm levels per side (the payline numbers), and the Golden Ticket (charms one level up). */
  levels: Partial<Record<SideId, Levels>>;
  ticket: boolean;
  /** Enemy shields are worth this much of their base (payline numbers). */
  enemyShield: number;
  /** The player's relics (for the HUD column) and how hard each is popping (1 = just fired). */
  relics: string[];
  relicPops: Record<string, number>;
  /** The relic feed (left of your machine): relics that just fired, newest on top. `born` is clock time; a relic that
   * fires again while shown counts up instead of adding a row. */
  relicFeed: RelicFeedRow[];
}

export interface RelicFeedRow {
  relic: string;
  born: number;
  count: number;
  /** Drawn y (eases toward its slot). */
  y: number;
}
