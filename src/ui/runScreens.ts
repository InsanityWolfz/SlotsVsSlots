import type { Sounds } from '../audio/sounds';
import type { StripCounts, SymbolId } from '../core/config';
import { RUN_FIGHTS, type EnemyDef } from '../core/enemies';
import { RELICS } from '../core/relics';
import { describeOption, type DraftOption, type FightRecord, type RunState } from '../core/run';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { ABILITY_UI } from '../present/hud';
import { COLORS, H, W } from '../present/layout';
import { drawSprite, type SpriteId } from '../render/sprites';
import { drawText } from '../render/text';

export type ScreenMode = 'none' | 'draft' | 'next' | 'over';

/** Greedy word wrap for the pixel font. */
export function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}

interface Hit {
  x: number;
  y: number;
  w: number;
  h: number;
  hover: boolean;
  pressed: boolean;
  scale: number;
  lift: number;
  onClick: () => void;
  enabled: boolean;
}

const SYMBOLS: SymbolId[] = ['sword', 'shield', 'bolt', 'rock'];

function abilityText(e: EnemyDef): string {
  if (!e.ability) return '';
  const ui = ABILITY_UI[e.ability.kind];
  const what: Record<string, string> = {
    flood: `SLIMES ${e.ability.power} OF YOUR SYMBOLS`,
    smash: `HITS FOR ${e.ability.power}`,
    fortify: `GAINS ${e.ability.power} SHIELD`,
    blizzard: `FREEZES ${e.ability.power} REELS FOR 2 TURNS`,
    pilfer: `STEALS ${e.ability.power} SYMBOL${e.ability.power > 1 ? 'S' : ''}`,
    quake: `ADDS ${e.ability.power} ROCKS TO YOUR STRIPS`,
    jam: `JAMS A REEL FOR ${e.ability.power} TURNS`,
    jackpot: 'CASHES OUT THE POT AT YOU',
  };
  return `${ui.label} EVERY ${e.ability.every} TURNS: ${what[e.ability.kind]}`;
}

/**
 * Canvas overlays between fights: the draft (pick 1 of 3), the next-enemy preview and the
 * end-of-run summary. The only place the player makes choices.
 */
export class RunScreens {
  mode: ScreenMode = 'none';
  private run: RunState | null = null;
  private offers: DraftOption[] = [];
  private cards: Hit[] = [];
  private buttons: (Hit & { label: string })[] = [];
  private fade = 0;
  private picked = -1;
  private lastRecord: FightRecord | null = null;

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    private cb: { onPick: (o: DraftOption) => void; onFight: () => void; onNewRun: () => void },
  ) {}

  get active(): boolean {
    return this.mode !== 'none';
  }

  private open(mode: ScreenMode): void {
    this.mode = mode;
    this.cards = [];
    this.buttons = [];
    this.picked = -1;
    void this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: sineOut, onUpdate: (v) => (this.fade = v) });
  }

  private hit(x: number, y: number, w: number, h: number, onClick: () => void): Hit {
    return { x, y, w, h, hover: false, pressed: false, scale: 0, lift: 0, onClick, enabled: true };
  }

  showDraft(run: RunState, offers: DraftOption[], last: FightRecord | null): void {
    this.run = run;
    this.offers = offers;
    this.lastRecord = last;
    this.open('draft');
    this.cards = offers.map((o, i) =>
      this.hit(W / 2 + (i - 1) * 300, 352, 270, 222, () => {
        if (this.picked >= 0) return;
        this.picked = i;
        this.sounds.stingerMedium();
        const card = this.cards[i];
        void this.ui
          .tween({ from: 1.08, to: 1.18, dur: 0.15, ease: backOut(2), onUpdate: (v) => (card.scale = v) })
          .then(() => this.ui.wait(0.35))
          .then(() => this.cb.onPick(o));
      }),
    );
    // Deal the cards in.
    this.cards.forEach((c, i) => void this.ui.wait(0.12 + i * 0.09).then(() => {
      this.sounds.click();
      return this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
    }));
  }

  showNext(run: RunState): void {
    this.run = run;
    this.open('next');
    const b = { ...this.hit(W / 2, 640, 240, 64, () => this.cb.onFight()), label: run.depth >= RUN_FIGHTS ? 'FACE THE HOUSE' : 'FIGHT!' };
    b.scale = 1;
    this.buttons = [b];
  }

  showOver(run: RunState): void {
    this.run = run;
    this.open('over');
    const b = { ...this.hit(W / 2, 650, 240, 60, () => this.cb.onNewRun()), label: 'NEW RUN' };
    b.scale = 1;
    this.buttons = [b];
  }

  hide(): void {
    this.mode = 'none';
  }

  // ---- input -------------------------------------------------------------------------

  private all(): Hit[] {
    return [...this.cards, ...this.buttons];
  }

  private inside(h: Hit, x: number, y: number): boolean {
    return h.enabled && x >= h.x - h.w / 2 && x <= h.x + h.w / 2 && y >= h.y - h.h / 2 && y <= h.y + h.h / 2;
  }

  pointerMove(x: number, y: number): boolean {
    let any = false;
    for (const h of this.all()) {
      const was = h.hover;
      h.hover = this.inside(h, x, y);
      if (h.hover && !was && this.cards.includes(h) && this.picked < 0) void this.ui.to(h, 'lift', -10, 0.12, backOut());
      if (!h.hover && was) void this.ui.to(h, 'lift', 0, 0.12);
      any ||= h.hover;
    }
    return any;
  }

  pointerDown(x: number, y: number): boolean {
    const h = this.all().find((h) => this.inside(h, x, y));
    if (!h) return this.active;
    h.pressed = true;
    h.scale = Math.min(h.scale, 0.95);
    return true;
  }

  pointerUp(x: number, y: number): void {
    for (const h of this.all()) {
      if (!h.pressed) continue;
      h.pressed = false;
      if (!this.inside(h, x, y)) {
        void this.ui.to(h, 'scale', 1, 0.1);
        continue;
      }
      this.sounds.click();
      void this.ui.to(h, 'scale', 1.08, 0.08, sineOut).then(() => (this.picked < 0 || !this.cards.includes(h) ? this.ui.to(h, 'scale', 1, 0.1, backOut()) : undefined));
      h.onClick();
    }
  }

  // ---- drawing -----------------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.active || !this.run) return;
    ctx.fillStyle = `rgba(6,2,12,${0.93 * this.fade})`;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = this.fade;
    if (this.mode === 'draft') this.drawDraft(ctx, time);
    else if (this.mode === 'next') this.drawNext(ctx, time);
    else this.drawOver(ctx);
    ctx.restore();
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border = COLORS.gold): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
    ctx.fillStyle = border;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(x, y, w, h);
  }

  /** The run as a path of 6 nodes with enemy portraits (plan ahead!). */
  private drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const n = run.enemies.length;
    const gap = 150;
    const x0 = W / 2 - ((n - 1) * gap) / 2;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(run.depth, n - 1) * gap, 4);
    run.enemies.forEach((e, i) => {
      const x = x0 + i * gap;
      const done = i < run.depth;
      const here = i === run.depth;
      ctx.fillStyle = COLORS.outline;
      ctx.fillRect(x - 28, y - 28, 56, 56);
      ctx.fillStyle = e.isBoss ? '#5a1a10' : here ? '#3a2a14' : COLORS.panelLight;
      ctx.fillRect(x - 25, y - 25, 50, 50);
      drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, y, 2, { dim: done ? 0.6 : 0 });
      if (done) drawSprite(ctx, 'nodeDone', x + 18, y + 18, 2);
      if (here) drawSprite(ctx, 'nodeHere', x, y - 44 + Math.sin(time * 6) * 4, 2);
      if (e.isBoss) drawSprite(ctx, 'nodeBoss', x, y - 36, 2);
      const label = e.isBoss ? 'BOSS' : `${i + 1}`;
      drawText(ctx, label, x, y + 40, 2, here ? COLORS.goldLight : done ? '#6a6078' : COLORS.textDim);
    });
  }

  private drawStrips(ctx: CanvasRenderingContext2D, x: number, y: number, strips: StripCounts[]): void {
    drawText(ctx, 'YOUR REELS', x, y, 2, COLORS.textDim, { align: 'left' });
    strips.forEach((s, r) => {
      const ry = y + 26 + r * 30;
      drawText(ctx, `${r + 1}`, x, ry, 2, COLORS.textDim, { align: 'left' });
      let cx = x + 28;
      for (const sym of SYMBOLS) {
        const n = s[sym] ?? 0;
        if (!n && sym === 'rock') continue;
        drawSprite(ctx, sym as SpriteId, cx, ry, 1.5, { alpha: n ? 1 : 0.3 });
        drawText(ctx, `${n}`, cx + 20, ry, 2, n ? COLORS.text : '#4a4058', { align: 'left' });
        cx += 56;
      }
    });
  }

  private drawRelics(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const relics = this.run!.player.relics;
    drawText(ctx, 'RELICS', x, y, 2, COLORS.textDim, { align: 'left' });
    if (!relics.length) drawText(ctx, 'NONE YET', x, y + 26, 2, '#4a4058', { align: 'left' });
    relics.forEach((r, i) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x + 16 + i * 38, y + 30, 2));
  }

  private drawHp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const p = this.run!.player;
    drawSprite(ctx, 'heart', x + 8, y, 2);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x + 22, y - 11, w + 4, 22);
    ctx.fillStyle = '#0b0712';
    ctx.fillRect(x + 24, y - 9, w, 18);
    ctx.fillStyle = COLORS.hp;
    ctx.fillRect(x + 24, y - 9, (w * p.hp) / p.maxHp, 18);
    drawText(ctx, `${p.hp}/${p.maxHp}`, x + 24 + w / 2, y + 1, 2, COLORS.text);
  }

  private drawDraft(ctx: CanvasRenderingContext2D, time: number): void {
    const last = this.lastRecord;
    drawText(ctx, last ? `${last.enemy} DEFEATED!` : 'CHOOSE A REWARD', W / 2, 38, 4, COLORS.goldLight);
    if (last)
      drawText(ctx, `${Math.ceil(last.turns / 2)} ROUNDS  -  HP ${last.hpBefore} TO ${last.hpAfter}  -  PATCHED UP TO ${this.run!.player.hp}`, W / 2, 70, 2, COLORS.textDim);
    this.drawMap(ctx, 140, time);
    drawText(ctx, 'CHOOSE ONE', W / 2, 204, 3, COLORS.text);
    this.cards.forEach((c, i) => this.drawCard(ctx, c, this.offers[i], i, time));
    this.panel(ctx, 110, 492, 1060, 140);
    this.drawStrips(ctx, 130, 510, this.run!.player.strips);
    this.drawRelics(ctx, 560, 510);
    drawText(ctx, 'HP', 900, 510, 2, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, 900, 550, 220);
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, i: number, time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = describeOption(o);
    const accent = o.kind === 'relic' ? '#c9a0ff' : o.kind === 'remove' ? '#ff8a7a' : o.kind === 'add' ? '#7dff7a' : '#ff9ab0';
    ctx.save();
    ctx.globalAlpha *= dimmed ? 0.3 : 1;
    ctx.translate(c.x, c.y + c.lift);
    ctx.scale(c.scale, c.scale);
    const w = c.w;
    const h = c.h;
    if (c.hover && this.picked < 0) {
      ctx.save();
      ctx.shadowColor = accent;
      ctx.shadowBlur = 24;
      ctx.fillStyle = accent;
      ctx.globalAlpha *= 0.5 + 0.2 * Math.sin(time * 6);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    this.panel(ctx, -w / 2, -h / 2, w, h, c.hover || this.picked === i ? accent : COLORS.gold);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(-w / 2, -h / 2, w, 70);
    // Icon.
    const iy = -h / 2 + 50;
    if (o.kind === 'relic') drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
    else if (o.kind === 'add' || o.kind === 'remove') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, o.kind === 'add' ? 'plusBadge' : 'minusBadge', 32, iy + 24, 3);
      // Reel indicator: three slots, the target highlighted.
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = r === o.reel ? accent : '#3a2e52';
        ctx.fillRect(-w / 2 + 16, iy - 22 + r * 16, 18, 12);
      }
    } else if (o.kind === 'heal') drawSprite(ctx, 'heart', 0, iy, 5);
    else {
      drawSprite(ctx, 'heart', 0, iy, 5);
      drawSprite(ctx, 'plusBadge', 30, iy + 22, 3);
    }
    drawText(ctx, title, 0, 6, title.length > 13 ? 2 : 3, accent);
    wrap(text, 20).forEach((line, k) => drawText(ctx, line, 0, 42 + k * 20, 2, COLORS.text));
    ctx.restore();
  }

  private drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const e = run.enemies[run.depth];
    drawText(ctx, e.isBoss ? 'FINAL FIGHT' : `FIGHT ${run.depth + 1} OF ${RUN_FIGHTS}`, W / 2, 38, 3, COLORS.textDim);
    this.drawMap(ctx, 120, time);
    this.panel(ctx, W / 2 - 330, 200, 660, 330, e.isBoss ? '#ff6a5a' : COLORS.gold);
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(W / 2 - 310, 220, 120, 120);
    drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, W / 2 - 250, 280 + Math.sin(time * 2) * 2, 4);
    drawText(ctx, e.name ?? 'ENEMY', W / 2 - 170, 236, 3, e.isBoss ? '#ff6a5a' : COLORS.slime, { align: 'left' });
    drawText(ctx, e.blurb, W / 2 - 170, 268, 2, COLORS.text, { align: 'left' });
    drawText(ctx, `HP ${e.hp}`, W / 2 - 170, 298, 2, COLORS.hp, { align: 'left' });
    if (e.ability) {
      drawSprite(ctx, ABILITY_UI[e.ability.kind].icon, W / 2 - 162, 330, 2);
      wrap(abilityText(e), 40).forEach((l, k) => drawText(ctx, l, W / 2 - 146, 330 + k * 18, 2, '#ff9a3a', { align: 'left' }));
    }
    // Their reels.
    drawText(ctx, 'THEIR REELS', W / 2 - 310, 380, 2, COLORS.textDim, { align: 'left' });
    const counts = e.strips[0];
    let cx = W / 2 - 290;
    for (const [sym, n] of Object.entries(counts) as [SymbolId, number][]) {
      drawSprite(ctx, sym as SpriteId, cx, 414, 2);
      drawText(ctx, `${n}`, cx + 24, 414, 2, COLORS.text, { align: 'left' });
      cx += 76;
    }
    if (e.isBoss) {
      wrap('COINS FILL THE POT. THE HOUSE CASHES IT OUT AT YOU... BUT ANY JACKPOT YOU HIT STEALS THE POT!', 50).forEach((l, k) =>
        drawText(ctx, l, W / 2, 456 + k * 20, 2, COLORS.goldLight),
      );
    } else this.drawRelics(ctx, W / 2 - 310, 460);
    drawText(ctx, 'YOUR HP', W / 2 + 60, 474, 2, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, W / 2 + 40, 506, 220);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  private drawButton(ctx: CanvasRenderingContext2D, b: Hit & { label: string }, time: number): void {
    const pulse = 1 + 0.02 + 0.02 * Math.sin((time * Math.PI * 2) / 1.6);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.scale * pulse, b.scale * pulse);
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(-b.w / 2 - 3, -b.h / 2 - 3, b.w + 6, b.h + 6);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.fillStyle = b.pressed ? '#2a0806' : b.hover ? '#e04a2f' : '#c8321f';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, b.h - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, (b.h - 8) / 2);
    drawText(ctx, b.label, 0, 1, 3, '#fff6c8');
    ctx.restore();
  }

  private drawOver(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    drawText(ctx, run.won ? 'THE HOUSE FALLS!' : 'RUN OVER', W / 2, 44, 6, run.won ? COLORS.goldLight : COLORS.danger);
    const reached = run.won ? 'BEAT ALL 6 FIGHTS' : `FELL AT FIGHT ${run.records.length} OF ${RUN_FIGHTS + 1}`;
    drawText(ctx, reached, W / 2, 88, 2, COLORS.textDim);
    this.panel(ctx, 110, 120, 1060, 330);
    drawText(ctx, 'FIGHT', 150, 142, 2, COLORS.textDim, { align: 'left' });
    drawText(ctx, 'ROUNDS', 560, 142, 2, COLORS.textDim);
    drawText(ctx, 'HP', 680, 142, 2, COLORS.textDim);
    drawText(ctx, 'THEN PICKED', 790, 142, 2, COLORS.textDim, { align: 'left' });
    run.records.forEach((r, i) => {
      const y = 176 + i * 42;
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(122, y - 18, 1036, 38);
      }
      const e = run.enemies[r.depth];
      drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, 150, y, 1.4);
      drawText(ctx, r.enemy, 176, y, 2, r.won ? COLORS.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${Math.ceil(r.turns / 2)}`, 560, y, 2, COLORS.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, 680, y, 2, r.hpAfter > 0 ? COLORS.text : COLORS.danger);
      if (r.pick) drawText(ctx, describeOption(r.pick).title, 790, y, 2, '#c9a0ff', { align: 'left' });
      else if (!r.won) drawText(ctx, 'DEFEATED', 790, y, 2, COLORS.danger, { align: 'left' });
      if (r.rocksAdded) drawText(ctx, `+${r.rocksAdded} ROCKS`, 1150, y, 2, '#c9bba8', { align: 'right' });
    });
    this.panel(ctx, 110, 480, 1060, 120);
    this.drawStrips(ctx, 130, 496, run.player.strips);
    this.drawRelics(ctx, 620, 496);
    for (const b of this.buttons) this.drawButton(ctx, b, 0);
  }
}
