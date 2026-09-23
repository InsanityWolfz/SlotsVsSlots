import type { Sounds } from '../audio/sounds';
import type { GameConfig, StripCounts, SymbolId } from '../core/config';
import { RUN_FIGHTS, type EnemyDef } from '../core/enemies';
import { RELICS } from '../core/relics';
import { describeOption, isRelicDraft, needsChoice, optionDeltas, type DraftOption, type FightRecord, type RunState } from '../core/run';
import { COUNTER_RELICS } from '../core/relics';
import { DANGER } from '../core/enemies';
import type { Clock } from '../present/clock';
import { backOut, sineOut } from '../present/ease';
import { ABILITY_UI } from '../present/hud';
import { ENH_SPRITE } from '../present/reel';
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

type Btn = Hit & { label: string };

const SYMBOLS: SymbolId[] = ['sword', 'shield', 'bolt', 'rock'];

/** What each enemy writes on your machine, as a map badge. */
export const BADGE: Record<string, SpriteId> = {
  slime: 'mapBadgeSlime',
  frost: 'mapBadgeIce',
  thief: 'mapBadgeClaw',
  golem: 'mapBadgeRock',
  gremlin: 'mapBadgeLock',
  brute: 'mapBadgeFist',
  house: 'mapBadgeCoin',
};

function abilityText(e: EnemyDef, every: number): string {
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
  return `${ui.label} EVERY ${every} TURNS: ${what[e.ability.kind]}`;
}

/**
 * Canvas overlays between fights: the draft (pick 1 of 3), the next-fight preview (or a fork:
 * pick 1 of 2 enemies) and the end-of-run summary. The only place the player makes choices.
 */
export class RunScreens {
  mode: ScreenMode = 'none';
  private run: RunState | null = null;
  private offers: DraftOption[] = [];
  private deltas: { gain: string; loss: string }[] = [];
  private cards: Hit[] = [];
  private buttons: Btn[] = [];
  private fade = 0;
  private picked = -1;
  private lastRecord: FightRecord | null = null;

  constructor(
    private ui: Clock,
    private sounds: Sounds,
    private base: () => GameConfig,
    private cb: { onPick: (o: DraftOption) => void; onFight: (option: number) => void; onNewRun: () => void },
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

  private btn(label: string, x: number, y: number, w: number, h: number, onClick: () => void): Btn {
    return { ...this.hit(x, y, w, h, onClick), label, scale: 1 };
  }

  showDraft(run: RunState, offers: DraftOption[], last: FightRecord | null): void {
    this.run = run;
    this.offers = offers;
    this.deltas = offers.map((o) => optionDeltas(run, o, this.base()));
    this.lastRecord = last;
    this.open('draft');
    this.cards = offers.map((o, i) =>
      this.hit(W / 2 + (i - 1) * 300, 372, 270, 222, () => {
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
    this.cards.forEach(
      (c, i) =>
        void this.ui.wait(0.12 + i * 0.09).then(() => {
          this.sounds.click();
          return this.ui.tween({ from: 0, to: 1, dur: 0.3, ease: backOut(2), onUpdate: (v) => (c.scale = v) });
        }),
    );
  }

  showNext(run: RunState): void {
    this.run = run;
    this.open('next');
    if (needsChoice(run)) {
      this.buttons = run.paths[run.depth].map((_, i) => this.btn('FIGHT THIS ONE', W / 2 + (i === 0 ? -310 : 310), 580, 260, 56, () => this.cb.onFight(i)));
    } else {
      this.buttons = [this.btn(run.depth >= RUN_FIGHTS ? 'FACE THE HOUSE' : 'FIGHT!', W / 2, 640, 260, 64, () => this.cb.onFight(0))];
    }
  }

  showOver(run: RunState): void {
    this.run = run;
    this.open('over');
    this.buttons = [this.btn('NEW RUN', W / 2, 650, 240, 60, () => this.cb.onNewRun())];
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
    ctx.fillStyle = `rgba(6,2,12,${0.95 * this.fade})`;
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

  /** The run as a path of nodes (forks stacked) with portraits and writer badges. */
  private drawMap(ctx: CanvasRenderingContext2D, y: number, time: number): void {
    const run = this.run!;
    const n = run.paths.length;
    const gap = 150;
    const x0 = W / 2 - ((n - 1) * gap) / 2;
    ctx.fillStyle = '#3a2e52';
    ctx.fillRect(x0, y - 2, (n - 1) * gap, 4);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x0, y - 2, Math.min(run.depth, n - 1) * gap, 4);
    run.paths.forEach((opts, i) => {
      const x = x0 + i * gap;
      const done = i < run.depth;
      const here = i === run.depth;
      const fork = opts.length > 1;
      if (fork) drawSprite(ctx, 'mapFork', x - 44, y, 2);
      opts.forEach((e, k) => {
        const ny = fork ? y + (k === 0 ? -30 : 30) : y;
        const chosen = run.chosen[i] && run.enemies[i] === e;
        const faded = fork && run.chosen[i] && !chosen;
        const s = fork ? 22 : 28;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(x - s, ny - s, s * 2, s * 2);
        ctx.fillStyle = e.isBoss ? '#5a1a10' : here && !faded ? '#3a2a14' : COLORS.panelLight;
        ctx.fillRect(x - s + 3, ny - s + 3, s * 2 - 6, s * 2 - 6);
        drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x, ny, fork ? 1.5 : 2, { dim: done || faded ? 0.65 : 0 });
        const badge = BADGE[e.archetype];
        if (badge) drawSprite(ctx, badge, x + s - 2, ny + s - 4, 2, { alpha: faded ? 0.4 : 1 });
        if (e.elite) drawSprite(ctx, 'mapBadgeElite', x - s + 4, ny - s + 4, 2, { alpha: faded ? 0.4 : 1 });
        if (done && chosen) drawSprite(ctx, 'nodeDone', x - s + 6, ny + s - 6, 2);
      });
      if (here) drawSprite(ctx, 'nodeHere', x, y - (fork ? 70 : 44) + Math.sin(time * 6) * 4, 2);
      if (opts[0].isBoss) drawSprite(ctx, 'nodeBoss', x, y - 38, 2);
      drawText(ctx, opts[0].isBoss ? 'BOSS' : `${i + 1}`, x, y + (fork ? 64 : 42), 2, here ? COLORS.goldLight : done ? '#6a6078' : COLORS.textDim);
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
    relics.forEach((r, i) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x + 16 + (i % 8) * 38, y + 30 + Math.floor(i / 8) * 36, 2));
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
    drawText(ctx, last ? `${last.enemy} DEFEATED!` : 'CHOOSE A REWARD', W / 2, 30, 4, COLORS.goldLight);
    if (last) {
      const rocks = last.rocksCrumbled ? `  -  ${last.rocksCrumbled} ROCKS CRUMBLED` : '';
      drawText(ctx, `${Math.ceil(last.turns / 2)} ROUNDS  -  HP ${last.hpBefore} TO ${last.hpAfter}  -  PATCHED UP TO ${this.run!.player.hp}${rocks}`, W / 2, 60, 2, COLORS.textDim);
    }
    if (last?.eliteRelic) {
      const r = RELICS[last.eliteRelic];
      drawSprite(ctx, r.sprite as SpriteId, W / 2 - 150, 84, 2);
      drawText(ctx, `ELITE BONUS: ${r.name}!`, W / 2 - 128, 84, 2, '#ff9a3a', { align: 'left' });
    }
    this.drawMap(ctx, 158, time);
    const relicDraft = isRelicDraft(this.run!);
    drawText(ctx, relicDraft ? 'RELIC DRAFT - CHOOSE ONE' : 'CHOOSE ONE', W / 2, 244, 3, relicDraft ? '#c9a0ff' : COLORS.text);
    this.cards.forEach((c, i) => this.drawCard(ctx, c, this.offers[i], this.deltas[i], i, time));
    this.panel(ctx, 110, 500, 1060, 134);
    this.drawStrips(ctx, 130, 516, this.run!.player.strips);
    this.drawRelics(ctx, 560, 516);
    drawText(ctx, 'HP', 900, 516, 2, COLORS.textDim, { align: 'left' });
    this.drawHp(ctx, 900, 556, 220);
  }

  private drawCard(ctx: CanvasRenderingContext2D, c: Hit, o: DraftOption, delta: { gain: string; loss: string }, i: number, time: number): void {
    if (c.scale <= 0.01) return;
    const dimmed = this.picked >= 0 && this.picked !== i;
    const { title, text } = describeOption(o);
    const prep = o.kind === 'relic' && COUNTER_RELICS.has(o.relic);
    const accent = prep ? '#ff9a3a' : o.kind === 'gild' ? '#ffd23f' : o.kind === 'relic' ? '#c9a0ff' : o.kind === 'clear' ? '#c9bba8' : o.kind === 'swap' || o.kind === 'add' ? '#7dff7a' : '#ff9ab0';
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
    const iy = -h / 2 + 42;
    const reelMarker = (reel: number) => {
      for (let r = 0; r < 3; r++) {
        ctx.fillStyle = r === reel ? accent : '#3a2e52';
        ctx.fillRect(-w / 2 + 16, iy - 22 + r * 16, 18, 12);
      }
      drawText(ctx, `REEL ${reel + 1}`, -w / 2 + 25, iy + 34, 1, COLORS.textDim);
    };
    if (o.kind === 'relic') {
      drawSprite(ctx, RELICS[o.relic].sprite as SpriteId, 0, iy, 4);
      if (prep) drawSprite(ctx, 'cardPrep', w / 2 - 28, iy - 18, 2);
    }
    else if (o.kind === 'swap') {
      drawSprite(ctx, o.from as SpriteId, -44, iy, 3);
      drawSprite(ctx, 'arrowRight', 0, iy, 3);
      drawSprite(ctx, o.to as SpriteId, 44, iy, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'clear') {
      drawSprite(ctx, 'cardClear', -18, iy, 3.5);
      drawSprite(ctx, 'rock', 30, iy + 10, 2);
      reelMarker(o.reel);
    } else if (o.kind === 'add') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, 'plusBadge', 32, iy + 24, 3);
      reelMarker(o.reel);
    } else if (o.kind === 'gild') {
      drawSprite(ctx, o.symbol as SpriteId, 0, iy, 4);
      drawSprite(ctx, ENH_SPRITE[o.enh], 0, iy, 4);
      drawSprite(ctx, 'cardGild', 40, iy + 20, 2);
      reelMarker(o.reel);
    } else if (o.kind === 'heal') drawSprite(ctx, 'heart', 0, iy, 5);
    else {
      drawSprite(ctx, 'heart', 0, iy, 5);
      drawSprite(ctx, 'plusBadge', 30, iy + 22, 3);
    }
    drawText(ctx, title, 0, 2, title.length > 13 ? 2 : 3, accent);
    wrap(text, 20).forEach((line, k) => drawText(ctx, line, 0, 32 + k * 20, 2, COLORS.text));
    // Gain in green, cost in red, per spin.
    const lines = [delta.gain && [delta.gain, '#b6ff9a'], delta.loss && [delta.loss, '#ff8a7a']].filter(Boolean) as [string, string][];
    lines.forEach(([t, col], k) => {
      const ly = h / 2 - 16 - (lines.length - 1 - k) * 22;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(-w / 2 + 8, ly - 11, w - 16, 21);
      drawText(ctx, t, 0, ly, 2, col);
    });
    if (lines.length) drawText(ctx, 'PER SPIN', w / 2 - 12, h / 2 - 16 - lines.length * 22 + 2, 1, COLORS.textDim, { align: 'right' });
    ctx.restore();
  }

  /** One enemy's scouting report. */
  private drawEnemyPanel(ctx: CanvasRenderingContext2D, e: EnemyDef, x: number, y: number, w: number, time: number): void {
    const run = this.run!;
    const hourglass = run.player.relics.includes('hourglass') ? 1 : 0;
    this.panel(ctx, x, y, w, 300, e.isBoss || e.elite ? '#ff6a5a' : COLORS.gold);
    // Danger rating: 1-3 skulls from the archetype's single-fight danger (x1.25 for elites).
    const danger = (DANGER[e.archetype] ?? 8) * (e.elite ? 1.25 : 1);
    const pips = e.isBoss ? 3 : danger >= 20 ? 3 : danger >= 9 ? 2 : 1;
    for (let k = 0; k < pips; k++) drawSprite(ctx, 'dangerPip', x + w - 20 - k * 20, y + 18, 2);
    ctx.fillStyle = COLORS.panelLight;
    ctx.fillRect(x + 16, y + 16, 104, 104);
    drawSprite(ctx, (e.portrait ?? 'enemyPortrait') as SpriteId, x + 68, y + 68 + Math.sin(time * 2) * 2, 4);
    const badge = BADGE[e.archetype];
    if (badge) drawSprite(ctx, badge, x + 112, y + 112, 3);
    const tx = x + 136;
    drawText(ctx, e.name ?? 'ENEMY', tx, y + 30, e.name && e.name.length > 18 ? 2 : 3, e.isBoss ? '#ff6a5a' : COLORS.slime, { align: 'left' });
    wrap(e.blurb, Math.floor((w - 150) / 12)).forEach((l, k) => drawText(ctx, l, tx, y + 60 + k * 18, 2, COLORS.text, { align: 'left' }));
    drawText(ctx, `HP ${e.hp}`, tx, y + 104, 2, COLORS.hp, { align: 'left' });
    if (e.elite) drawText(ctx, 'ELITE: +25% HP, DROPS A RELIC', tx + 90, y + 104, 2, '#ff9a3a', { align: 'left' });
    if (e.ability) {
      const every = e.ability.every + hourglass;
      drawSprite(ctx, ABILITY_UI[e.ability.kind].icon, x + 24, y + 146, 2);
      wrap(abilityText(e, every), Math.floor((w - 60) / 12)).forEach((l, k) => drawText(ctx, l, x + 40, y + 146 + k * 18, 2, '#ff9a3a', { align: 'left' }));
    }
    drawText(ctx, 'THEIR REELS', x + 16, y + 200, 2, COLORS.textDim, { align: 'left' });
    let cx = x + 36;
    for (const [sym, n] of Object.entries(e.strips[0]) as [SymbolId, number][]) {
      drawSprite(ctx, sym as SpriteId, cx, y + 232, 2);
      drawText(ctx, `${n}`, cx + 24, y + 232, 2, COLORS.text, { align: 'left' });
      cx += 72;
    }
    if (e.isBoss)
      wrap('COINS AND A CUT EACH TURN FILL THE POT. IT CASHES OUT AT YOU... BUT ANY JACKPOT YOU HIT STEALS IT! AT HALF HP IT GOES ALL IN.', Math.floor((w - 32) / 6)).forEach((l, k) =>
        drawText(ctx, l, x + 16, y + 262 + k * 12, 1, COLORS.goldLight, { align: 'left' }),
      );
  }

  private drawNext(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const opts = run.paths[run.depth];
    const fork = needsChoice(run);
    const e = run.enemies[run.depth];
    drawText(ctx, e.isBoss ? 'FINAL FIGHT' : fork ? `FIGHT ${run.depth + 1} OF ${RUN_FIGHTS} - CHOOSE YOUR PATH` : `FIGHT ${run.depth + 1} OF ${RUN_FIGHTS}`, W / 2, 26, 3, fork ? COLORS.goldLight : COLORS.textDim);
    this.drawMap(ctx, 128, time);
    if (fork) {
      opts.forEach((o, i) => this.drawEnemyPanel(ctx, o, i === 0 ? 40 : W / 2 + 20, 222, W / 2 - 60, time));
      drawText(ctx, 'OR', W / 2, 372, 4, COLORS.goldLight);
      this.drawHp(ctx, W / 2 - 130, 640, 220);
      this.drawRelicsRow(ctx, W / 2 + 140, 640);
    } else {
      this.drawEnemyPanel(ctx, e, W / 2 - 330, 206, 660, time);
      drawText(ctx, 'YOUR HP', W / 2 - 330, 540, 2, COLORS.textDim, { align: 'left' });
      this.drawHp(ctx, W / 2 - 330, 568, 220);
      this.drawRelics(ctx, W / 2 + 40, 540);
    }
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  private drawRelicsRow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.run!.player.relics.forEach((r, i) => drawSprite(ctx, RELICS[r].sprite as SpriteId, x + i * 36, y, 2));
  }

  private drawButton(ctx: CanvasRenderingContext2D, b: Btn, time: number): void {
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
    drawText(ctx, b.label, 0, 1, b.label.length > 10 ? 2 : 3, '#fff6c8');
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
