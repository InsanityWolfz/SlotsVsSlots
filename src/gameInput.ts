/** Keyboard, gamepad and pointer input: taps, keys, the focus, HOLD taps (split from game.ts, 2026-11-05). */
import { HUD_W } from './present/hud';
import { HUD_TOP, CELL, reelWindow } from './present/layout';
import type { NavDir } from './ui/focus';
import { touchNear } from './ui/run/base';
import { SPEEDS } from './saves';
import { newRunPressed, skipTutorial } from './gameFlow';
import type { Game } from './game';

const NAV_KEYS: Record<string, NavDir> = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right' };
/** HOLD from the keyboard (Q / W / E) or, in a fight while a HOLD can be made, a pad's d-pad (left / up / right). */
const HOLD_KEYS: Record<string, number> = { q: 0, w: 1, e: 2, arrowleft: 0, arrowup: 1, arrowright: 2 };

export function pointerDown(g: Game, x: number, y: number): void {
  g.startAudio();
  if (g.coach.active) return g.coach.hitsSkip(x, y) ? skipTutorial(g) : g.coach.advance();
  // PAUSE first: opened over the boss card, its first tap went to the card (playtest C).
  if (g.pause.open && !g.menus.isOpen) return g.pause.pointerDown(x, y);
  // The boss card is open: any tap closes it (the fight was paused under it).
  if (g.bossCard) {
    g.bossCard = false;
    g.sounds.click();
    return;
  }
  if (g.menus.isOpen) {
    // The SOUND toggle stays live on the main menu.
    if (g.muteBtn.visible && g.muteBtn.contains(x, y)) {
      g.active = g.muteBtn;
      g.muteBtn.down();
      return;
    }
    const was = g.menus.mode;
    g.menus.pointerDown(x, y);
    if (was !== g.menus.mode) g.syncButtons();
    return;
  }
  // Run screens get first pick: the tool buttons (TUNE/LOG/SOUND) sit under them (ITERATION_8 G3).
  if (g.screens.active && g.screens.pointerDown(x, y)) return;
  // HOLD (user, 2026-10-29): tap one of your reels before your spin, or while the enemy spins (the engine is on your
  // turn by then), to keep it for your next spin; tap again to let go. Nothing ever waits for it, AUTO included.
  if (g.canHold()) {
    const win = reelWindow('player');
    if (x >= win.x && x < win.x + win.w && y >= win.y && y < win.y + win.h) {
      tapHold(g, Math.floor((x - win.x) / CELL));
      return;
    }
  }
  // The BUILD drawer's handle: pull it out, push it back in.
  if (g.drawerLive() && g.onHandle(x, y)) {
    g.buildOpen = !g.buildOpen;
    g.drawerUsed = true;
    g.sounds.click();
    g.syncButtons();
    return;
  }
  // (On touch, a small button answers a little outside its edges when nothing is under the finger: LOG, SOUND, PAUSE.)
  const b = g.buttons.find((b) => b.visible && b.contains(x, y)) ?? (g.screens.touch ? g.buttons.filter((b) => b.visible && b.enabled && touchNear(b, x, y)).sort((a, c) => Math.hypot(a.x - x, a.y - y) - Math.hypot(c.x - x, c.y - y))[0] : undefined);
  if (b) {
    g.active = b;
    b.down();
    return;
  }
  if (g.screens.active && g.screens.pointerDown(x, y)) return;
  // Tap a boss's HUD: its rules card (BOSS CLARITY, user 2026-10-12). Reading, not playing: the fight pauses under it.
  if (onBossHud(g, x, y)) {
    g.bossCard = true;
    g.sounds.click();
    return;
  }
  // A click no longer skips the fight's playback: spam-clicking skipped every turn and ended rounds in seconds.
  // The speed buttons (1X-8X) are the way to watch faster.
}

export function pointerUp(g: Game, x: number, y: number): void {
  const b = g.active;
  g.active = null;
  b?.up(b.contains(x, y) || (g.screens.touch && touchNear(b, x, y)));
  if (g.pause.open && !g.menus.isOpen) return g.pause.pointerUp(x, y);
  if (g.menus.isOpen) {
    const was = g.menus.mode;
    g.menus.pointerUp(x, y);
    if (was !== g.menus.mode) g.syncButtons();
    return;
  }
  if (g.screens.active) g.screens.pointerUp(x, y);
}

export function pointerMove(g: Game, x: number, y: number): boolean {
  g.mouse = { x, y };
  if (g.pause.open && !g.menus.isOpen) return g.pause.pointerMove(x, y);
  let any = false;
  for (const b of g.buttons) {
    b.hover = b.visible && b.contains(x, y);
    any ||= b.hover && b.enabled;
  }
  if (g.menus.isOpen) any = g.menus.pointerMove(x, y) || any;
  else if (g.screens.active) any = g.screens.pointerMove(x, y) || any;
  return any;
}

/** Which screen the focus is on (a new one puts it on that screen's main button). */
export function focusKey(g: Game): string {
  return [g.phase, g.screens.active ? g.screens.mode : '', g.menus.isOpen ? g.menus.mode : '', g.pause.open ? (g.pause.glossary ? 'glossary' : 'pause') : '', g.bossCard ? 'boss' : ''].join('|');
}

/** A key, or a pad button. `repeat`: a held arrow or d-pad direction repeating (it moves the focus, never a HOLD). */
export function key(g: Game, k: string, repeat = false): boolean {
  g.focus.sync(focusKey(g));
  g.startAudio();
  if (g.coach.active) {
    // Any key moves the tutorial on (a pad's A included); S or a pad's START skips it.
    if (k === 's' || k === 'start') skipTutorial(g);
    else g.coach.advance();
    return true;
  }
  // A pad's START is Escape everywhere else (pause, back).
  if (k === 'start') k = 'escape';
  // The bumpers: PROFILE's tabs in the menus, the speed everywhere else (from the speed you're on).
  if (k === 'lb' || k === 'rb') {
    if (g.menus.isOpen) return g.menus.key(k === 'lb' ? '[' : ']');
    const at = Math.max(0, SPEEDS.indexOf(g.prefs.speed));
    g.setSpeed(SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, at + (k === 'rb' ? 1 : -1)))]);
    return true;
  }
  // VIEW (or B): the BUILD drawer, in or out (it was a mouse-only handle).
  if ((k === 'view' || k === 'b') && g.drawerLive() && !g.pause.open && !g.bossCard) {
    g.buildOpen = !g.buildOpen;
    g.drawerUsed = true;
    g.sounds.click();
    g.syncButtons();
    return true;
  }
  // A trigger (or I): the boss's rules card (it opened only by tapping the boss's panel).
  if ((k === 'trigger' || k === 'i') && !g.pause.open && g.bossInfo()) {
    g.bossCard = !g.bossCard;
    g.sounds.click();
    return true;
  }
  // HOLD: Q / W / E, or the arrows / d-pad while a HOLD can be made (the fight's buttons all have their own keys).
  if (HOLD_KEYS[k] !== undefined && g.canHold() && !g.menus.isOpen) {
    // (One press, one HOLD: a held d-pad flipped the reel on and off every repeat.)
    if (!repeat) tapHold(g, HOLD_KEYS[k]);
    return true;
  }
  // Keyboard / gamepad focus (STEAM_READINESS S3): arrows move it, Enter presses it.
  const dir = NAV_KEYS[k];
  // (The title's PRESS ANY KEY: the d-pad counts too. It has nothing to focus, so arrows went nowhere.)
  if (dir && !(g.menus.isOpen && g.menus.mode === 'loading')) {
    const t = g.focus.move(dir, g.navTargets());
    if (t) pointerMove(g, t.x, t.y);
    return !!t;
  }
  // The RESULTS card takes Enter / A / Space itself (PRESS TO CONTINUE).
  if ((k === 'enter' || k === ' ') && g.screens.active && !g.menus.isOpen && g.screens.pressResults()) return true;
  // Enter / A with no focus yet: show it (on the screen's first target) instead of doing nothing.
  if (k === 'enter' && !g.focus.visible && !(g.menus.isOpen && g.menus.mode === 'loading')) {
    const t = g.focus.move('down', g.navTargets());
    if (t) {
      pointerMove(g, t.x, t.y);
      return true;
    }
  }
  // The boss card: Escape, Space or Enter closes it (keyboard and pad had no way out but a click).
  if (g.bossCard && !g.pause.open && (k === 'escape' || k === ' ' || k === 'enter')) {
    g.bossCard = false;
    g.sounds.click();
    return true;
  }
  // Space presses the focused button too (outside a fight, where Space spins).
  if (k === ' ' && g.focus.visible && g.phase !== 'fighting') k = 'enter';
  if (k === 'enter' && g.focus.visible) {
    const t = g.focus.current(g.navTargets());
    if (t) {
      pointerDown(g, t.x, t.y);
      pointerUp(g, t.x, t.y);
      // The screen may have changed under the press: a new screen puts the focus on its main button; a button
      // that's gone (a DEAL, a bought item) hides it, so the next A can't land on a neighbour (LOWER, +40 MAX HP).
      g.focus.sync(focusKey(g));
      const after = g.navTargets();
      if (g.focus.at && !after.some((b) => Math.abs(b.x - t.x) < 2 && Math.abs(b.y - t.y) < 2)) g.focus.lost();
      const n = g.focus.current(after);
      if (n) pointerMove(g, n.x, n.y);
      return true;
    }
  }
  if (g.menus.isOpen && k !== 'm') {
    const was = g.menus.mode;
    const used = g.menus.key(k);
    if (was !== g.menus.mode) g.syncButtons();
    return used;
  }
  // CHOOSE YOUR MACHINE: Escape goes back to the menu (a saved run stays saved).
  if (k === 'escape' && g.screens.active && g.screens.mode === 'cabinet') {
    g.sounds.click();
    g.showMenu();
    return true;
  }
  // RUN OVER: Escape is the way back to the menu (from the RUN LOG, back to the run-over screen first).
  if (k === 'escape' && g.phase === 'over' && !g.menus.isOpen && g.screens.closeLog()) {
    g.sounds.click();
    return true;
  }
  if (k === 'escape' && g.phase === 'over' && !g.menus.isOpen) {
    g.sounds.click();
    g.showMenu();
    return true;
  }
  // The GLOSSARY: Escape, Enter or Space goes back to the pause menu (a pad had no way back but closing the pause).
  if (g.pause.open && g.pause.glossary && (k === 'escape' || k === 'enter' || k === ' ')) {
    g.pause.glossary = false;
    g.sounds.click();
    return true;
  }
  // PAUSE: Escape anywhere in a run (STEAM_READINESS S2).
  if (k === 'escape' && g.pausable()) {
    g.setPaused(!g.pause.open);
    return true;
  }
  if (g.pause.open) return k !== 'm' ? true : (g.setMuted(!g.prefs.muted), true);
  switch (k) {
    case ' ':
      // Spins only (no skipping the playback, like a click).
      if (g.awaitingSpin) g.requestSpin();
      return true;
    case '1':
    case '2':
    case '3':
    case '4':
      g.setSpeed(SPEEDS[Number(k) - 1]);
      return true;
    case 'a':
      g.setAuto(!g.prefs.auto);
      return true;
    case 'r':
      // Not on a between-fight screen mid-run: there's no NEW RUN button there to show the warning (QA_2 B19).
      if (g.screens.active && g.run && !g.run.over) return true;
      newRunPressed(g);
      return true;
    case 'm':
      g.setMuted(!g.prefs.muted);
      return true;
  }
  return false;
}

/** HOLD (experiment): a HELD tag on each held reel, your HOLDs left under your machine, and the HOLD CHANCE call. */
/** HOLD: hold reel r, or let it go (a tap, Q / W / E, or the d-pad). */
export function tapHold(g: Game, r: number): void {
  const was = g.fight.held[r];
  const now = g.fight.hold(r);
  if (now !== was) g.sounds.reelStop(r, now ? 1.4 : 0.8);
  else {
    g.sounds.fizzle();
    g.toolNote = { text: g.fight.sides.player.frozen[r] > 0 ? "A FROZEN REEL CAN'T BE HELD" : 'NO HOLDS LEFT THIS FIGHT', at: performance.now() };
  }
}

export function onBossHud(g: Game, x: number, y: number): boolean {
  if (!g.fight.cfg.enemy.boss || g.screens.active || g.fight.over) return false;
  const hx = g.stage.huds.enemy.x;
  return x >= hx && x <= hx + HUD_W && y >= HUD_TOP - 8 && y <= HUD_TOP + 140;
}
