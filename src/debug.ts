import type { RelicId, SideId, SymbolId } from './core/config';
import { ARCHETYPES, BOSS, DEALER, makeEnemy, MIRROR } from './core/enemies';
import { Rng } from './core/rng';
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
    /**
     * Run the whole game loop (UI clock, game clock, camera, particles) for `sec` seconds without
     * requestAnimationFrame — works even when the browser pane isn't painting.
     */
    async tick(sec: number, until?: () => boolean) {
      for (let i = 0; i < sec * 60 && !until?.(); i++) {
        game.update(1 / 60);
        await new Promise((r) => setTimeout(r, 0));
      }
    },
    /** Render the current frame offscreen and POST it to playtest/scratch/snap-server.mjs (:5199). */
    async snap(name = 'snap', scale = 0.75): Promise<string> {
      const c = document.createElement('canvas');
      c.width = Math.round(1280 * scale);
      c.height = Math.round(720 * scale);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.imageSmoothingEnabled = false;
      game.draw(ctx);
      const res = await fetch(`http://localhost:5199/?name=${encodeURIComponent(name)}`, { method: 'POST', body: c.toDataURL('image/png') });
      return res.text();
    },
    /** Start a new run (optionally seeded). */
    run: (seed?: number, cabinet?: import('./core/cabinets').CabinetId, stake = 0, act3 = false) => {
      if (act3) game.prefs.act3 = true;
      game.startRun(seed, cabinet, stake);
    },
    /** Make the current fight end in a win on the player's next spin (for walking run screens). */
    forceWin() {
      game.fight.sides.enemy.hp = 1;
      game.fight.sides.enemy.shield = 0;
      game.fight.forceNext('player', ['sword', 'sword', 'sword']);
    },
    /** Start a paused sandbox fight against an archetype ('slime', 'frost', 'thief', 'golem', 'gremlin', 'brute', 'house'). */
    vs(id: string, player?: SymbolId[], enemy?: SymbolId[], relics: RelicId[] = []) {
      const a = id === 'house' ? BOSS : id === 'mirror' ? MIRROR : id === 'dealer' ? DEALER : ARCHETYPES.find((x) => x.id === id);
      if (!a) throw new Error(`no archetype ${id}`);
      const boss = id === 'house' || id === 'mirror' || id === 'dealer';
      const e = makeEnemy(a, 2, new Rng(1), boss, a.acts?.includes(3) ? 3 : a.acts?.includes(2) ? 2 : 1);
      const cfg = structuredClone(game.cfg);
      cfg.enemy = { hp: e.hp, strips: e.strips, name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
      if (id === 'mirror') {
        cfg.enemy.strips = cfg.player.strips.map((x) => ({ ...x }));
        cfg.enemy.gilded = (cfg.player.gilded ?? []).filter((g) => g.enh !== 'spiked' && g.enh !== 'keen').map((g) => ({ ...g }));
        if (cfg.enemy.ability) cfg.enemy.ability = { ...cfg.enemy.ability, power: Math.round(cfg.player.hp * 0.6) };
      }
      cfg.relics = relics;
      game.newFight(true, null, cfg);
      pause();
      if (player) game.fight.forceNext('player', player);
      if (enemy) game.fight.forceNext('enemy', enemy);
    },
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
