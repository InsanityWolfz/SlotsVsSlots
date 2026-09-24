import { Game } from './game';
import { H, W } from './present/layout';
import { CombatLog } from './ui/combatLog';
import { TuningPanel } from './ui/tuningPanel';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const ctx = canvas.getContext('2d')!;
const buffer = document.createElement('canvas');
const bctx = buffer.getContext('2d')!;
let scale = 1;

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
  canvas.width = buffer.width = Math.floor(cssW * dpr);
  canvas.height = buffer.height = Math.floor(cssH * dpr);
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
  if (e.pointerType !== 'mouse') game.pointerMove(...toLogical(e));
  game.pointerDown(...toLogical(e));
});
canvas.addEventListener('pointerup', (e) => game.pointerUp(...toLogical(e)));
canvas.addEventListener('pointermove', (e) => {
  canvas.style.cursor = game.pointerMove(...toLogical(e)) ? 'pointer' : 'default';
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === '`' || k === 't') tuning?.toggle();
  else if (k === 'l') log.toggle();
  else if (k === 'escape') {
    tuning?.toggle(false);
    log.toggle(false);
  } else if (game.key(k)) e.preventDefault();
});

document.addEventListener('visibilitychange', () => game.setHidden(document.hidden));
// No long-press menus or double-tap zoom over the game.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

let last = performance.now();
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);

  bctx.setTransform(scale, 0, 0, scale, 0, 0);
  bctx.imageSmoothingEnabled = false;
  game.draw(bctx);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0);
  // Chroma pulse: offset additive double-exposure of the frame (cheap aberration).
  const ch = game.camera.chroma;
  if (ch > 0.01) {
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
