import type { SideId, SymbolId } from './core/config';
import type { CombatEvent } from './core/events';
import type { Game } from './game';

/**
 * Dev-only console helpers (window.dbg) for frame-stepping the presentation and forcing
 * outcomes — used for visual QA and screenshots. Not loaded in production builds.
 */
export function installDebug(game: Game): void {
  const pause = () => (game.stage.clock.speed = 0);
  const step = async (sec: number, stop?: () => boolean) => {
    const c = game.stage.clock;
    for (let i = 0; i < sec * 60 && !stop?.(); i++) {
      c.speed = 1;
      c.tick(1 / 60);
      game.particles.update(1 / 60);
      c.speed = 0;
      await new Promise((r) => setTimeout(r, 0));
    }
  };
  const dbg = {
    game,
    pause,
    resume: () => (game.stage.clock.speed = game.prefs.speed),
    /** Advance game time by `sec` (paused otherwise). */
    adv: (sec: number) => step(sec),
    /** Advance until the director starts playing an event of this type. */
    async until(type: CombatEvent['type'], maxSec = 30): Promise<boolean> {
      let hit = false;
      const d = game.director as unknown as { play: (e: CombatEvent) => Promise<void> };
      const orig = Object.getPrototypeOf(d).play as (e: CombatEvent) => Promise<void>;
      d.play = function (this: unknown, e: CombatEvent) {
        if (e.type === type) hit = true;
        return orig.call(this, e);
      };
      await step(maxSec, () => hit);
      return hit;
    },
    force: (side: SideId, line: SymbolId[]) => game.fight.forceNext(side, line),
    /** Start a paused fight with forced opening lines. */
    fight(player?: SymbolId[], enemy?: SymbolId[]) {
      game.newFight(true);
      pause();
      if (player) game.fight.forceNext('player', player);
      if (enemy) game.fight.forceNext('enemy', enemy);
    },
  };
  (window as unknown as { dbg: typeof dbg }).dbg = dbg;
}
