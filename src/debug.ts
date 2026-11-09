import type { RelicId, SideId, SymbolId } from './core/config';
import { ARCHETYPES, BOSS, DEALER, makeEnemy, OWNER, REPO_MAN, TURBO, WHEEL } from './core/enemies';
import { Rng } from './core/rng';
import { skipToBoss } from './core/run';
import { fightConfig } from './core/fightSetup';
import type { CombatEvent } from './core/events';
import { BUILD_UP } from './core/fightRules';
import type { Game } from './game';
import { setInputMode, type InputMode } from './ui/input';
import { ROOM_V2, streetPlace } from './render/rooms';
import { devSwapSprite } from './render/sprites';

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
    /** BUILD-UP on or off (A/B): dbg.buildUp(false) plays without it. Takes effect next spin. */
    buildUp: (on: boolean) => ((BUILD_UP.on = on ? 1 : 0), on),
    /** The prompts for a device: dbg.input('pad') shows the button badges. */
    input: (m: InputMode) => (setInputMode(m), m),
    pause,
    resume: () => (game.stage.clock.speed = game.prefs.speed / 2),
    /** Advance game time by `sec` (paused otherwise). */
    adv: (sec: number) => step(sec),
    /** Rooms v2 (the style key): dbg.roomV2(false) shows the old rooms. */
    roomV2: (on: boolean) => ((ROOM_V2.on = on), on),
    /** Act 1's street (rooms v2's journey): show station 0-3 whatever the depth; dbg.station(null) goes by depth. */
    station: (n: number | null) => ((ROOM_V2.station = n), n),
    /** Where the backdrop is now: a street station (0-3), 'door', or null (not act 1's street). */
    place: () => streetPlace(game.background.scene),
    /** Swap a sprite's rows (outlined), e.g. a portrait candidate: dbg.sprite('enemyBoss', rows). */
    sprite: (id: string, rows: string[]) => devSwapSprite(id as import('./render/sprites').SpriteId, rows),
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
    /** Set the enemy's HP as a share of its max (and on its HUD), e.g. to see THE HOUSE's doors open (rooms v2). */
    foeHp: (share: number) => {
      const e = game.fight.sides.enemy;
      e.hp = Math.round(e.maxHp * share);
      game.stage.huds.enemy.hp = e.hp;
      return e.hp;
    },
    /** Set THE HOUSE's pot (the gutter panel's number), e.g. to see the entrance light up with it (rooms v2). */
    pot: (n: number) => (game.stage.gutter.pot = n),
    /** Set your HP in the current fight (and on the HUD), e.g. to see the low-HP warning. */
    hp: (n: number) => {
      game.fight.sides.player.hp = n;
      game.stage.huds.player.hp = n;
    },
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
    /** Render the current frame offscreen and POST it to tools/snap-server.mjs (:5199). */
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
    /** Jump the run to this act's boss (the first route if none is picked). */
    toBoss() {
      if (!game.run) return;
      skipToBoss(game.run);
      game.newFight(false, null, fightConfig(game.run, game.cfg), true);
      game.screens.showNext(game.run);
    },
    /** The run's act map, as text: one line per route (F fight, E elite, S Cashier, ? encounter). */
    map: () => game.run?.map.routes.map((r, i) => `PATH ${i + 1}: ${r.map((st) => (st.kind === 'fight' ? 'F' : st.kind === 'elite' ? 'E' : st.kind === 'shop' ? 'S' : '?') + (st.enemy ? `:${st.enemy.archetype}` : st.encounter ? `:${st.encounter}` : '')).join(' ')}`).join('\n'),
    /** Make the current fight end in a win on the player's next spin (for walking run screens). */
    /** Open the Cashier now (as the act's intro visit). */
    shop() {
      if (!game.run) return;
      game.run.actIntro = true;
      (game as unknown as { advance(): void }).advance();
    },
    forceWin() {
      // (THE DEALER: skip to its last hand, or 1 HP only ends the hand it's on.)
      game.fight.dealerHand = 3;
      game.fight.sides.enemy.hp = 1;
      game.fight.sides.enemy.shield = 0;
      game.fight.dealt = true;
      game.fight.forceNext('player', ['sword', 'sword', 'sword']);
    },
    /** Start a paused sandbox fight against an archetype ('slime', 'frost', ..., or a boss: 'house', 'wheel', 'dealer', 'owner'). */
    vs(id: string, player?: SymbolId[], enemy?: SymbolId[], relics: RelicId[] = []) {
      const a = id === 'owner' ? OWNER : id === 'house' ? BOSS : id === 'wheel' ? WHEEL : id === 'dealer' ? DEALER : id === 'repo' ? REPO_MAN : ARCHETYPES.find((x) => x.id === id);
      if (!a) throw new Error(`no archetype ${id}`);
      const boss = id === 'house' || id === 'wheel' || id === 'dealer' || id === 'owner';
      const e = makeEnemy(a, 2, new Rng(1), boss, a.acts?.includes(3) ? 3 : a.acts?.includes(2) ? 2 : 1);
      const cfg = structuredClone(game.cfg);
      cfg.enemy = { hp: e.hp, strips: e.strips, name: e.name, portrait: e.portrait, ability: e.ability, boss: e.boss };
      // THE OWNER: his 11 HP, a hit each.
      if (id === 'owner') Object.assign(cfg.enemy, { hp: TURBO.hp, owner: true, boss: 'owner' });
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
