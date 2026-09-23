import type { Sounds } from '../audio/sounds';
import type { Synth } from '../audio/synth';
import type { SideId } from '../core/config';
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
}

export const defaultJuice = (): JuiceToggles => ({
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
  gutter: { turn: number; side: SideId | null; pulse: number };
}
