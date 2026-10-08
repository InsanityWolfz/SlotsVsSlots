import { Game, toggleFullscreen } from './game';
import { installCrashHandlers, reportCrash } from './ui/crash';
import { H, W } from './present/layout';
import { CombatLog } from './ui/combatLog';
import { TuningPanel } from './ui/tuningPanel';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const ctx = canvas.getContext('2d')!;
const buffer = document.createElement('canvas');
const bctx = buffer.getContext('2d')!;
let scale = 1;
/**
 * Render resolution cap: at most 2x the 1280x720 logical size (2560x1440). A 4K screen then
 * upscales that crisply (pixelated) instead of the game filling ~8 million pixels every frame.
 */
const MAX_SCALE = 2;

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  // The visual viewport is the real visible area on phones (URL bars come and go).
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const fit = Math.min(vw / W, vh / H);
  const cssW = Math.floor(W * fit);
  const cssH = Math.floor(H * fit);
  stage.style.width = `${cssW}px`;
  stage.style.height = `${cssH}px`;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const k = Math.min(fit * dpr, MAX_SCALE);
  canvas.width = buffer.width = Math.floor(W * k);
  canvas.height = buffer.height = Math.floor(H * k);
  scale = canvas.width / W;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
window.visualViewport?.addEventListener('resize', resize);
resize();

/** Phones and tablets: the first tap goes fullscreen and asks for landscape, where supported. */
const touchDevice = window.matchMedia?.('(pointer: coarse)').matches ?? false;
let wentFull = false;
function goFullscreen(): void {
  if (!touchDevice || wentFull) return;
  wentFull = true;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    const p = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    void Promise.resolve(p)
      .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
      .catch(() => {})
      .finally(() => setTimeout(resize, 200));
  } catch {
    /* no fullscreen here (iPhone Safari): the page still fits the screen */
  }
}

/** Dev and playtest builds get the debug helpers and the TUNE panel; the public build doesn't (no cheats). */
const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1';

const game = new Game(!DEV_TOOLS);
if (DEV_TOOLS) void import('./debug').then((m) => m.installDebug(game));

const tuning = DEV_TOOLS ? new TuningPanel(game) : null;
const log = new CombatLog(game);
game.toolButtons!.tune.onClick = () => tuning?.toggle();
game.toolButtons!.log.onClick = () => log.toggle();

function toLogical(e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
canvas.addEventListener('pointerdown', (e) => {
  goFullscreen();
  canvas.setPointerCapture(e.pointerId);
  // Touch has no hover: a tap first "hovers" where it lands (tooltips, collection tiles).
  game.setTouch(e.pointerType !== 'mouse');
  game.focus.hide();
  if (e.pointerType !== 'mouse') game.pointerMove(...toLogical(e));
  game.pointerDown(...toLogical(e));
});
canvas.addEventListener('pointerup', (e) => game.pointerUp(...toLogical(e)));
let lastMouse = { x: -1, y: -1 };
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') game.setTouch(false);
  // A real mouse move hands control back from the keyboard / gamepad focus.
  if (Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y) > 6) {
    if (lastMouse.x >= 0) game.focus.hide();
    lastMouse = { x: e.clientX, y: e.clientY };
  }
  canvas.style.cursor = game.pointerMove(...toLogical(e)) ? 'pointer' : 'default';
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  // Fullscreen: F11 or Alt+Enter (desktop habit).
  if (k === 'f11' || (k === 'enter' && e.altKey)) {
    e.preventDefault();
    toggleFullscreen();
    return;
  }
  if (k === '`' || k === 't') tuning?.toggle();
  else if (k === 'l') log.toggle();
  else if (k === 'escape') {
    tuning?.toggle(false);
    log.toggle(false);
    // The menus: one screen back.
    if (game.key(k)) e.preventDefault();
  } else if (game.key(k)) e.preventDefault();
});

document.addEventListener('visibilitychange', () => game.setHidden(document.hidden));
// Back in focus: wake the audio (some platforms leave it 'interrupted' after a sleep: S31).
window.addEventListener('focus', () => !document.hidden && game.setHidden(false));
// Losing focus mid-fight (alt-tab, the Steam overlay) pauses it (STEAM_READINESS S14).
window.addEventListener('blur', () => {
  if (game.phase === 'fighting' && game.pausable()) game.setPaused(true);
});
// No long-press menus or double-tap zoom over the game.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

const crashContext = () => ({ phase: game.phase, machine: game.run?.cabinet, act: game.run?.act, seed: game.run?.seed, stake: game.run?.stake });
installCrashHandlers(crashContext);

// Gamepads (STEAM_READINESS S3): the d-pad / left stick move the focus, A presses, B / Start back out or pause,
// X spins, Y toggles AUTO, the bumpers change speed. Edges only, with a repeat while a direction is held.
const PAD: Record<number, string> = { 12: 'arrowup', 13: 'arrowdown', 14: 'arrowleft', 15: 'arrowright', 0: 'enter', 1: 'escape', 9: 'escape', 2: ' ', 3: 'a' };
const padHeld = new Map<string, number>();
let speedIdx = -1;
function pollPads(now: number): void {
  const pads = navigator.getGamepads?.() ?? [];
  const down = new Set<string>();
  for (const pad of pads) {
    if (!pad) continue;
    pad.buttons.forEach((b, i) => b.pressed && PAD[i] && down.add(PAD[i]));
    const [ax, ay] = pad.axes;
    if (ax < -0.5) down.add('arrowleft');
    if (ax > 0.5) down.add('arrowright');
    if (ay < -0.5) down.add('arrowup');
    if (ay > 0.5) down.add('arrowdown');
    if (pad.buttons[4]?.pressed) down.add('lb');
    if (pad.buttons[5]?.pressed) down.add('rb');
  }
  for (const k of down) {
    const t = padHeld.get(k);
    const repeat = k.startsWith('arrow') && t !== undefined && now - t > 380;
    if (t === undefined || repeat) {
      padHeld.set(k, repeat ? now - 260 : now);
      if (k === 'lb' || k === 'rb') {
        speedIdx = Math.max(0, Math.min(3, (speedIdx < 0 ? 1 : speedIdx) + (k === 'rb' ? 1 : -1)));
        game.key(String(speedIdx + 1));
      } else game.key(k);
    }
  }
  for (const k of [...padHeld.keys()]) if (!down.has(k)) padHeld.delete(k);
}
window.addEventListener('gamepadconnected', () => game.focus.hide());

let last = performance.now();
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  try {
    pollPads(now);
  } catch {
    /* no gamepad API */
  }
  // One bad frame never stops the loop (STEAM_READINESS S13).
  try {
    game.update(dt);
  } catch (err) {
    reportCrash(err, crashContext);
  }

  // Draw straight to the screen; the spare buffer is only needed for a chroma pulse.
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = false;
  try {
    game.draw(ctx);
  } catch (err) {
    reportCrash(err, crashContext);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Chroma pulse: offset additive double-exposure of the frame (cheap aberration).
  const ch = game.camera.chroma;
  if (ch > 0.01) {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.globalCompositeOperation = 'copy';
    bctx.drawImage(canvas, 0, 0);
    bctx.globalCompositeOperation = 'source-over';
    const d = ch * 8 * scale;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = ch * 0.3;
    ctx.drawImage(buffer, d, 0);
    ctx.drawImage(buffer, -d, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
