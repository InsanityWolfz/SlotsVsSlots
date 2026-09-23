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
  const fit = Math.min(window.innerWidth / W, window.innerHeight / H);
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
resize();

const game = new Game();
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === '1') void import('./debug').then((m) => m.installDebug(game));

const tuning = new TuningPanel(game);
const log = new CombatLog(game);
game.toolButtons!.tune.onClick = () => tuning.toggle();
game.toolButtons!.log.onClick = () => log.toggle();

function toLogical(e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
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
  if (k === '`' || k === 't') tuning.toggle();
  else if (k === 'l') log.toggle();
  else if (k === 'escape') {
    tuning.toggle(false);
    log.toggle(false);
  } else if (game.key(k)) e.preventDefault();
});

document.addEventListener('visibilitychange', () => game.setHidden(document.hidden));

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
