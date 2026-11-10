/** The frame: update, the screen transition, drawing a frame, and the scene behind it (split from game.ts, 2026-11-05). */
import type { SymbolId } from './core/config';
import { DEALER_HANDS } from './core/fight';
import { rungsClimbed } from './core/enemies';
import { TYPICAL_ACT_FIGHTS } from './core/run';
import { roomFor, type Scene } from './render/rooms';
import { H, W } from './present/layout';
import { BUILD } from './ui/runScreens';
import { focusKey } from './gameInput';
import type { Game } from './game';
import { drawEntrance } from './ui/entranceView';

const IN_PLAY = { none: new Set<SymbolId>(), drop: new Set<SymbolId>(['note', 'wild']), allIn: new Set<SymbolId>(['sword', 'seven']) };

// ---- frame -------------------------------------------------------------------------

export function update(g: Game, realDt: number): void {
  const dt = Math.min(realDt, 1 / 20);
  g.time += dt;
  g.ui.tick(dt);
  if (g.buildOpen) {
    // A stiff spring, a touch under-damped: the drawer slides out and settles with a small overshoot.
    g.drawerV += (300 * (1 - g.drawerT) - 26 * g.drawerV) * dt;
    g.drawerT += g.drawerV * dt;
  } else {
    g.drawerV = 0;
    g.drawerT += (0 - g.drawerT) * Math.min(1, dt * 18);
    if (g.drawerT < 0.002) g.drawerT = 0;
  }
  g.handleHover += ((g.onHandle(g.mouse.x, g.mouse.y) ? 1 : 0) - g.handleHover) * Math.min(1, dt * 16);
  g.menus.update(dt);
  // A tutorial callout freezes the fight where it is.
  g.pause.update(dt);
  // The soundtrack follows the screen (MUSIC): menus, the lounge between fights, each act, the bosses.
  if (g.music) g.playMusic();
  const frozen = g.coach.active || g.pause.open || g.bossCard;
  g.synth.holdLoops(frozen);
  const gdt = frozen ? 0 : g.stage.clock.tick(dt);
  g.camera.update(dt);
  g.particles.update(gdt);
  // THE WHEEL's topper turns (it races when the ball drops, then settles back to its idle turn).
  const gw = g.stage.gutter;
  if (g.fight.isWheel && gw.wheelSpeed !== undefined) {
    const idle = gw.wheelFast ? 1.2 : 0.6;
    gw.wheelSpeed += (idle - gw.wheelSpeed) * Math.min(1, gdt * 1.2);
    gw.wheelAngle = ((gw.wheelAngle ?? 0) + gw.wheelSpeed * gdt) % (Math.PI * 2);
  }
  g.background.update(dt);
  syncInPlay(g);
  for (const b of g.buttons) b.update(dt);
  const by = g.recap.buttonY - 30;
  for (const b of g.recapBtns) b.y = by;
}

/** What counts off the payline right now stays lit (the payline look dims the rest): THE JUKEBOX's armed DROP hits
 * with every visible note; THE DEALER's ALL IN (hand 3) counts every sword and seven in its 3x3. */
export function syncInPlay(g: Game): void {
  const { player, enemy } = g.stage.machines;
  const drop = g.fight.meter?.kind === 'volume' && g.stage.huds.player.armed;
  player.offLine = drop ? IN_PLAY.drop : IN_PLAY.none;
  enemy.offLine = g.fight.isDealer && g.fight.dealerHand >= DEALER_HANDS.length ? IN_PLAY.allIn : IN_PLAY.none;
}

/** The screen on show (a menu page, a run screen, a fight): a change of it plays the screen transition. */
export function screenKey(g: Game): string {
  const fight = (g.phase === 'fighting' || g.phase === 'quick') && !g.screens.active;
  return `${g.menus.isOpen ? g.menus.mode : '-'}|${g.screens.mode}|${fight ? 'fight' : g.phase}`;
}

export function draw(g: Game, ctx: CanvasRenderingContext2D): void {
  // SCREEN TRANSITIONS: one place for every switch (transition.ts).
  g.transition.check(ctx, screenKey(g), g.reducedMotion());
  drawFrame(g, ctx);
  const now = performance.now();
  g.transition.draw(ctx, g.lastDraw ? (now - g.lastDraw) / 1000 : 0);
  g.lastDraw = now;
}

export function drawFrame(g: Game, ctx: CanvasRenderingContext2D): void {
  const t = g.time;
  const s = g.stage;
  syncOoze(g);
  ctx.save();
  g.camera.apply(ctx);
  g.background.scene = sceneNow(g);
  g.background.draw(ctx, t);
  g.screens.roomBackdrop ??= (c, time) => g.background.draw(c, time);
  if (g.camera.dim > 0.001) {
    ctx.fillStyle = `rgba(0,0,0,${g.camera.dim})`;
    ctx.fillRect(-40, -40, W + 80, H + 80);
  }
  if (g.menus.isOpen) {
    ctx.restore();
    g.menus.draw(ctx, t);
    if (g.muteBtn.visible) g.muteBtn.draw(ctx, t);
    // The kit's focus: gold corner brackets around what the pad or keyboard is on.
    g.focus.sync(focusKey(g));
    if (g.focus.visible) g.focus.draw(ctx, g.navTargets(), t);
    return;
  }
  // A boss's entrance (directorEntrance.ts): the HUDs and chips wait above the screen and drop in at its end.
  const en = s.entrance;
  ctx.save();
  if (en) ctx.translate(0, Math.round(en.hudY));
  g.view.drawChips(ctx);
  s.huds.player.draw(ctx, t);
  s.huds.enemy.draw(ctx, t);
  ctx.restore();
  // (What a banner covers this frame, before the machines draw: THE WHEEL's bet stacks step aside with the rest.)
  g.view.syncCovers();
  s.machines.player.draw(ctx, s.clock.time);
  if (g.fight.isDealer) g.view.drawDealerTable(ctx, t);
  // THE WHEEL's cabinet and topper drop in with its machine.
  const drop = s.machines.enemy.drop;
  ctx.save();
  if (g.fight.isWheel && drop) ctx.translate(0, Math.round(drop));
  if (g.fight.isWheel) g.view.drawWheelCabinet(ctx);
  ctx.restore();
  s.machines.enemy.draw(ctx, s.clock.time);
  ctx.save();
  if (g.fight.isWheel && drop) ctx.translate(0, Math.round(drop));
  if (g.fight.isWheel) g.view.drawWheelTopper(ctx);
  ctx.restore();
  s.fx.draw(ctx, s.clock.time, -Infinity, 20);
  g.view.drawGutter(ctx, t);
  // (HOLD's gold frames and chips go under the banners and callouts: over them, a HELD frame crossed a BIG HIT.)
  g.view.drawHoldBar(ctx, t);
  g.particles.draw(ctx);
  s.fx.draw(ctx, s.clock.time, 20, Infinity);
  if (en) drawEntrance(ctx, en, t);
  if (g.drawerT < 0.5) g.view.drawRelicFeed(ctx);
  if (g.fight.cfg.enemy.boss && !g.screens.active && !en) g.view.drawBossHint(ctx);
  // The BUILD drawer: your whole build slides out over the left side (relics fire inside it), chips stay put on top.
  if (g.drawerLive()) {
    if (g.drawerT > 0.005) {
      // The fight dims behind the open drawer, so the drawer reads as a layer on top.
      const edge = BUILD.x + BUILD.w + 8;
      ctx.fillStyle = `rgba(6,2,12,${(0.45 * Math.min(1, g.drawerT)).toFixed(3)})`;
      ctx.fillRect(edge, 0, W - edge, H);
      ctx.save();
      ctx.translate(-(1 - g.drawerT) * (BUILD.x + BUILD.w + 8), 0);
      const hud = s.huds.player;
      g.screens.drawBuildFor(ctx, g.run!, { hp: Math.max(0, Math.round(hud.hp)), maxHp: hud.maxHp });
      if (g.drawerT >= 0.5) g.view.drawRelics(ctx);
      ctx.restore();
      g.view.drawChips(ctx);
    }
    g.view.drawHandle(ctx);
  }
  ctx.restore();
  if ((g.phase === 'fighting' || g.phase === 'quick') && !g.screens.active) g.view.drawDanger(ctx, t);

  if (g.camera.flash > 0) {
    ctx.globalAlpha = Math.min(1, g.camera.flash);
    ctx.fillStyle = g.camera.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  // The fight's line in the bottom bar (the spin count, OVERTIME, a boss or loop label), with the buttons it sits beside.
  if (!g.screens.active && !g.menus.isOpen) g.view.drawStatus(ctx, t);
  for (const b of g.buttons) if (!g.recapBtns.includes(b)) b.draw(ctx, t);
  // The boss card covers the whole screen, the bottom bar too (it pauses the fight).
  if (g.bossCard) g.view.drawBossCard(ctx);
  g.view.drawRelicTooltip(ctx);
  g.screens.draw(ctx, t);
  g.recap.draw(ctx);
  for (const b of g.recapBtns) b.draw(ctx, t);
  g.coach.draw(ctx, t);
  g.pause.draw(ctx, t);
  g.focus.sync(focusKey(g));
  if (g.focus.visible) g.focus.draw(ctx, g.navTargets(), t);
}

/** Mirror the slime on the player's displayed strips into the HUD counter. */
export function syncOoze(g: Game): void {
  const hud = g.stage.huds.player;
  let n = 0;
  let total = 0;
  for (const reel of g.stage.machines.player.reels) {
    // The chase cells aren't really on your strip (QA_1 B13).
    for (const c of reel.cells) {
      if (c.symbol === 'bonusSym' || c.symbol === 'relicSym') continue;
      total++;
      if (c.slimed) n++;
    }
  }
  // (A small pop: at 1.5 the SPILL chip swelled over the chip beside it and the meter over it.)
  if (n !== hud.ooze) hud.oozePunch = 1.08;
  hud.oozePunch += (1 - hud.oozePunch) * 0.15;
  hud.ooze = n;
  hud.oozeTotal = total;
}

/** THE ROOMS: where the fight is (the act's room, the boss's set piece, the loop, your HP). Menus: the casino floor. */
export function sceneNow(g: Game): Scene {
  const run = g.run;
  const inRun = !!run && !g.menus.isOpen && g.phase !== 'title';
  // (A sandbox fight has no run: it's still a fight, on the casino floor.)
  const fight = !g.menus.isOpen && (g.phase === 'fighting' || g.phase === 'recap');
  const boss = g.fight.cfg.enemy.boss;
  const p = g.fight.sides.player;
  const e = g.fight.sides.enemy;
  return {
    room: inRun ? roomFor(run!.act, run!.endless?.loop ?? 0) : 'floor',
    boss: fight && (boss === 'house' || boss === 'wheel' || boss === 'dealer' || boss === 'owner') ? boss : null,
    loop: inRun ? (run!.endless?.loop ?? 0) : 0,
    hp: fight && p.maxHp > 0 ? Math.max(0, p.hp) / p.maxHp : 1,
    foeHp: fight && e.maxHp > 0 ? Math.max(0, e.hp) / e.maxHp : 1,
    turn: fight ? g.stage.gutter.side : null,
    fight,
    draft: !fight && g.screens.active && g.screens.mode === 'draft',
    turbo: fight && !!g.fight.cfg.enemy.owner,
    pot: fight && boss === 'house' ? (g.stage?.gutter?.pot ?? 0) : 0,
    wheel: fight && boss === 'wheel' ? wheelNow(g) : undefined,
    dealer: fight && boss === 'dealer' ? { hand: g.stage.gutter.dealerHand ?? 1, allIn: !!g.stage.gutter.allInArmed, charge: g.stage.huds.enemy.charge ?? 0 } : undefined,
    // ENDLESS (rooms v2): the loop's boss (its strip leads to them), THE OWNER's ladder, the player's flash settings.
    loopBoss: inRun && run!.endless ? (run!.map.boss.boss ?? null) : null,
    owner: fight && boss === 'owner' ? { rungs: rungsClimbed(e.maxHp - Math.max(0, e.hp)) } : undefined,
    soft: g.prefs.juice.softLightning,
    flash: g.prefs.juice.flash,
    ...journey(g),
    ...menuPlace(g),
  };
}

/** Outside a run (rooms v2): the menus on the street, CHOOSE YOUR MACHINE at the pawn shop. */
function menuPlace(g: Game): Pick<Scene, 'menu'> {
  if (g.screens.active && g.screens.mode === 'cabinet') return { menu: 'pawn' };
  // (SETTINGS from a run's pause menu is mid-run: it keeps the run's room.)
  if (!g.run && (g.menus.isOpen || g.phase === 'title')) return { menu: 'street' };
  return {};
}

/** THE WHEEL's table as presented (the gutter's chips, turns to NO MORE BETS, SPINS FASTER, the wheel's turn). */
function wheelNow(g: Game): Scene['wheel'] {
  const gw = g.stage?.gutter;
  const bets = (gw?.bets ?? [0, 0, 0]).reduce((a, b) => a + b, 0);
  return { bets, left: gw?.betsLeft ?? 3, fast: !!gw?.wheelFast, angle: gw?.wheelAngle ?? 0 };
}

/** Where the run stands in its act (rooms v2's journey): this fight among the act's regulars, and the boss next. Before
 * a route is picked the act's length is a guess (TYPICAL_ACT_FIGHTS); between fights `depth` is already the next one,
 * so the backdrop walks forward as you win. */
function journey(g: Game): Pick<Scene, 'fightIndex' | 'regulars' | 'atBoss' | 'enemy'> {
  const run = g.run;
  if (!run) return {};
  const routed = !(run.route === null && run.map.routes.length > 1);
  const regulars = routed ? Math.max(1, run.enemies.length - 1) : TYPICAL_ACT_FIGHTS - 1;
  const fighting = g.phase === 'fighting' || g.phase === 'recap';
  return {
    fightIndex: Math.min(run.depth, regulars - 1),
    regulars,
    atBoss: routed && run.depth >= run.enemies.length - 1,
    enemy: fighting ? (run.enemies[run.depth]?.archetype ?? null) : null,
  };
}
