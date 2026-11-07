import { CABINETS, CABINET_ORDER } from '../../core/cabinets';
import { DEALER, OWNER, WHEEL } from '../../core/enemies';
import { totalFights, type RunState } from '../../core/run';
import { STAKES } from '../../core/stakes';
import { W } from '../../present/layout';
import { artId, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum } from '../../render/text';
import { demo, IN_FULL_GAME } from '../../demo';
import { drawPanel, drawTitle, drawWell, KIT, T } from '../kit';
import { heroSprite } from '../menus';
import { bigPortrait, spotlight, stakeDisc, wrap } from './shared';

/**
 * DEMO CLEARED (the demo's win screen) as the full game's page: the result, compact (who, the score), then IN THE FULL
 * GAME: the Slot Machines and bosses the demo doesn't have, each with its art and one plain line from its real rules,
 * and the stakes and ENDLESS as one line. No hype: every line here must stay true to the code (cabinets.ts, enemies.ts,
 * stakes.ts; HP_GAME.md).
 */

/** One line each, from the machine's rule (core/cabinets.ts). */
const MACHINE_HOOK: Record<string, string> = {
  jukebox: 'NOTES BUILD UP TO THE DROP',
  joker: 'WILDS LET ANY 2 REELS PAIR',
  midas: 'CHIPS HIT AND WIN CHIPS',
};

/** The bosses the demo never meets (act 1 ends at THE HOUSE), each with where you meet it and one line of its rules. */
const BOSSES: { name: string; portrait: string; where: string; hook: string }[] = [
  { name: WHEEL.name, portrait: WHEEL.portrait, where: 'ACT 2 BOSS', hook: 'BETS ON YOUR REELS. PAIRS CLEAR THEM' },
  { name: DEALER.name, portrait: DEALER.portrait, where: 'ACT 3 BOSS', hook: 'THREE HANDS, EACH WITH ITS OWN HP BAR' },
  { name: OWNER.name, portrait: OWNER.portrait, where: 'ENDLESS: LOOP 5 BOSS', hook: 'HE CHEATS EVERY 2 TURNS' },
];

/** The stakes and ENDLESS, as one line. */
export const STAKES_LINE = `${STAKES.length} STAKES, ${STAKES[0].name} TO ${STAKES[STAKES.length - 1].name}. ENDLESS: PLAY ON UNTIL YOU BUST`;

/** The Slot Machines the demo leaves out, in the machine select's order. */
export function fullGameMachines() {
  const mine = demo().machines ?? [];
  return CABINET_ORDER.filter((id) => !mine.includes(id));
}

/** The page's layout: the result row, the strip panel, its two rows of cells, the stakes line. */
const L = { resultY: 112, strip: { x: 70, y: 244, w: W - 140, h: 318 }, rowY: [268, 382], well: 96, stakesY: 524 };
/** A cell's column: its art well, then its words; a hook wraps to two lines this wide (tests hold every hook to it). */
const COL_W = L.strip.w / 3;
const TEXT_X = 20 + L.well + 16;
export const HOOK_COLS = Math.floor((COL_W - 12 - TEXT_X) / (6 * T.body));

/** The hooks, for the tests: every one fits two lines. */
export const demoClearedHooks = (): string[] => [...fullGameMachines().map((id) => MACHINE_HOOK[id] ?? ''), ...BOSSES.map((b) => b.hook)];

export interface ClearedView {
  run: RunState;
  /** Seconds into the reveal (99 once shown in full). */
  t: number;
  time: number;
  reduceMotion: boolean;
  /** The score's count-up as shown, and its landing punch (1: none). */
  score: number;
  punch: number;
}

export function drawDemoCleared(ctx: CanvasRenderingContext2D, v: ClearedView): void {
  const { run, t } = v;
  const fade = (from: number, dur = 0.3) => {
    const k = Math.max(0, Math.min(1, (t - from) / dur));
    return 1 - (1 - k) * (1 - k) * (1 - k);
  };
  // 1. The result, in one row: your hero, BEAT THE HOUSE, the fights; the score in its well.
  const k1 = fade(0.25);
  const cab = CABINETS[run.cabinet];
  const ps = 92;
  const scoreW = 300;
  const rowW = ps + 20 + 270 + 40 + scoreW;
  const x0 = Math.round(W / 2 - rowW / 2);
  const y0 = L.resultY;
  ctx.save();
  ctx.globalAlpha *= k1;
  drawWell(ctx, x0, y0, ps, ps, '#160f26');
  spotlight(ctx, x0 + ps / 2, y0 + ps - 12, ps - 10, '#ffd23f', 0.2, [x0 + 2, y0 + 2, ps - 4, ps - 4]);
  bigPortrait(ctx, heroSprite(run.cabinet) as SpriteId, x0 + ps / 2, y0 + ps / 2 + 4, 2.5);
  const tx = x0 + ps + 20;
  drawText(ctx, cab.hero, tx, y0 + 18, T.head, KIT.title, { align: 'left' });
  drawText(ctx, 'BEAT THE HOUSE', tx, y0 + 50, T.body, '#7dff7a', { align: 'left' });
  drawText(ctx, `ALL ${totalFights(run)} FIGHTS WON ON ${cab.name}`, tx, y0 + 76, T.small, KIT.dim, { align: 'left' });
  const sx = x0 + rowW - scoreW;
  drawText(ctx, 'SCORE', sx, y0 + 10, T.small, KIT.dim, { align: 'left' });
  drawWell(ctx, sx, y0 + 22, scoreW, 70, '#120c1c');
  drawSprite(ctx, artId('trophySmall'), sx + 34, y0 + 57, 3);
  drawTitle(ctx, fmtNum(v.score), sx + 64, y0 + 57, KIT.title, { align: 'left', punch: v.punch });
  ctx.restore();

  // 2. IN THE FULL GAME: one panel, the machines on top, the bosses under them, the stakes and ENDLESS at its foot.
  const k2 = fade(1.2, 0.25);
  if (k2 <= 0) return;
  const S = L.strip;
  ctx.save();
  ctx.globalAlpha *= k2;
  drawPanel(ctx, S.x, S.y, S.w, S.h, { title: IN_FULL_GAME });
  ctx.restore();
  const colW = COL_W;
  const cell = (i: number, row: number, from: number, art: (cx: number, cy: number) => void, name: string, sub: string, hook: string) => {
    const k = fade(from, 0.22);
    if (k <= 0) return;
    const cx = Math.round(S.x + i * colW + 20);
    const cy = L.rowY[row] + (v.reduceMotion ? 0 : Math.round((1 - k) * 10));
    ctx.save();
    ctx.globalAlpha *= k;
    drawWell(ctx, cx, cy, L.well, L.well, '#2a2040');
    spotlight(ctx, cx + L.well / 2, cy + L.well - 14, L.well - 12, row ? '#ff6a5a' : '#ffe08a', 0.14, [cx + 2, cy + 2, L.well - 4, L.well - 4]);
    art(cx + L.well / 2, cy + L.well / 2);
    const lx = cx + L.well + 16;
    const cols = HOOK_COLS;
    drawText(ctx, name, lx, cy + 14, T.head, KIT.title, { align: 'left' });
    drawText(ctx, sub, lx, cy + 38, T.small, KIT.dim, { align: 'left' });
    wrap(hook, cols).slice(0, 2).forEach((l, j) => drawText(ctx, l, lx, cy + 62 + j * 20, T.body, KIT.text, { align: 'left' }));
    ctx.restore();
  };
  fullGameMachines().slice(0, 3).forEach((id, i) => {
    const c = CABINETS[id];
    cell(i, 0, 1.35 + i * 0.08, (x, y) => drawSprite(ctx, c.sprite as SpriteId, x, y, 1.375), c.name, `PLAY AS ${c.hero}`, MACHINE_HOOK[id] ?? '');
  });
  BOSSES.forEach((b, i) => cell(i, 1, 1.6 + i * 0.08, (x, y) => bigPortrait(ctx, b.portrait as SpriteId, x, y + 2, 2.75), b.name, b.where, b.hook));
  // The stakes, as their chips, and ENDLESS.
  const k3 = fade(1.9, 0.25);
  if (k3 <= 0) return;
  ctx.save();
  ctx.globalAlpha *= k3;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(S.x + 20, L.stakesY - 26, S.w - 40, 2);
  const discs = STAKES.length * 22;
  const lineW = discs + 14 + STAKES_LINE.length * 6 * T.body;
  let dx = Math.round(W / 2 - lineW / 2) + 11;
  for (const s of STAKES) {
    stakeDisc(ctx, dx, L.stakesY, s.color, 8);
    dx += 22;
  }
  drawText(ctx, STAKES_LINE, dx + 3, L.stakesY + 1, T.body, KIT.text, { align: 'left' });
  ctx.restore();
}
