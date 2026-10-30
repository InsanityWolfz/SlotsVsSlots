import type { MetaGain } from '../../core/profile';
import { levelOf } from '../../core/meta';
import { RELICS } from '../../core/relics';
import { takenLabel, endlessScore, runScoreOf, scoreParts, SCORE, totalFights, type FightRecord, type RunState } from '../../core/run';
import { CABINETS, type CabinetId } from '../../core/cabinets';
import { stakeOf } from '../../core/stakes';
import { sineOut } from '../../present/ease';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawPortrait, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { runSummary } from '../../core/runLog';
import { VERSION } from '../../build';
import { CHIP_SCORE } from '../../core/profile';
import { wrap, CX } from './shared';
import { ShopScreen } from './shop';

export abstract class OverScreen extends ShopScreen {
  /** "STAKE 2 UNLOCKED FOR KNIGHT" (shown on the run-over screen). */
  setStakeUnlockedNow(text: string): void {
    this.stakeUnlockedNow = text;
  }

  /** Cabinets unlocked by the run that just ended (shown on the run-over screen). */
  setUnlockedNow(ids: CabinetId[]): void {
    this.unlockedNow = ids;
  }

  /** The run-over screen is offering LET IT RIDE (shows the "win is banked" line). */
  protected rideOffer = false;
  showOver(run: RunState): void {
    this.rideOffer = false;
    this.run = run;
    this.open('over');
    this.buttons = [this.minorBtn('MENU', CX - 140, 528, 240, 52, () => this.cb.onMenu()), this.btn('NEW RUN', CX + 140, 528, 240, 52, () => this.cb.onNewRun())];
    // Beat the Dealer: the win is banked, and ENDLESS goes on until you bust (user, 2026-10-14: no cash out).
    if (run.won && run.act >= 3 && !run.endless) {
      this.buttons = [
        this.minorBtn('MENU', CX - 200, 528, 200, 52, () => this.cb.onMenu()),
        this.btn('KEEP PLAYING', CX + 120, 528, 320, 52, () => this.cb.onLetItRide()),
      ];
      this.rideOffer = true;
    }
    // COPY RUN: the whole run as text, to paste into a chat for balance checks (runLog.ts).
    const copyRun = this.minorBtn('COPY RUN', W - 130, H - 34, 210, 40, () => {
      void navigator.clipboard?.writeText(runSummary(run, VERSION)).then(
        () => (copyRun.label = 'COPIED!'),
        () => (copyRun.label = 'COPY FAILED'),
      );
    });
    this.buttons.push(copyRun);
    this.openResults();
  }
  /** META: what the finished run earned (XP, level, achievements, titles). */
  protected meta: MetaGain | null = null;
  setMeta(g: MetaGain): void {
    this.meta = g;
  }
  /** Enter / A on the RESULTS card: it says PRESS TO CONTINUE, so the first press continues (R13 B4). */
  pressResults(): boolean {
    if (this.mode !== 'over' || !this.results || !this.resultsHit) return false;
    this.resultsHit.onClick();
    return true;
  }
  protected openResults(): void {
    const g = this.meta;
    const worth = g && (g.xp > 0 || g.achievements.length || g.titles.length || g.trims.length || this.unlockedNow.length);
    if (!g || !worth) {
      this.results = null;
      return;
    }
    const r = { xp: g.xpBefore, fill: null as Promise<void> | null, done: false, level: g.levelBefore, pop: 0 };
    this.results = r;
    this.resultsHit = this.hit(W / 2, H / 2, W, H, () => {
      if (!r.done) return this.finishResults(r);
      this.results = null;
      this.resultsHit = null;
    });
    // The bar fills over ~1.6 s (a click skips it); each level crossed pops a banner.
    r.fill = this.ui
      .tween({
        from: g.xpBefore,
        to: g.xpAfter,
        dur: Math.min(2.2, 0.6 + g.xp / 4000),
        ease: sineOut,
        onUpdate: (v) => {
          if (r.done) return;
          r.xp = v;
          const lvl = levelOf(v).level;
          if (lvl > r.level) {
            r.level = lvl;
            this.levelPop(r);
          }
        },
      })
      .then(() => this.finishResults(r));
  }
  protected finishResults(r: NonNullable<typeof this.results>): void {
    if (r.done || !this.meta) return;
    r.done = true;
    r.xp = this.meta.xpAfter;
    if (this.meta.levelAfter > r.level) {
      r.level = this.meta.levelAfter;
      this.levelPop(r);
    }
  }
  protected levelPop(r: NonNullable<typeof this.results>): void {
    this.sounds.fanfareJackpot();
    void this.ui.tween({ from: 1, to: 0, dur: 0.9, onUpdate: (v) => (r.pop = v) });
  }

  protected actPlaque(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string): void {
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(x - 40, y - 8, 44, 16);
    ctx.fillStyle = '#1a1428';
    ctx.fillRect(x - 38, y - 6, 40, 12);
    drawText(ctx, label, x - 18, y, 1, color);
  }

  /**
   * Rows for the run-over table. A normal run lists every fight. An endless run (dozens of fights) shows one
   * summary row per act, one per loop (its boss), then the last 3 fights in full (EXPERT_PLAYTEST_4 B1).
   */
  protected overRows(run: RunState): FightRecord[] {
    if (!run.endless || run.records.length <= 18) return run.records;
    const plural = (n: number) => `${n} FIGHT${n === 1 ? '' : 'S'}`;
    const sum = (list: FightRecord[], label: string, act: number): FightRecord => ({
      ...list[list.length - 1],
      enemy: label,
      act,
      turns: list.reduce((a, r) => a + r.turns, 0),
      hpBefore: list[0].hpBefore,
      won: list.every((r) => r.won),
      pick: undefined,
      bought: undefined,
      bonuses: undefined,
      eliteRelic: undefined,
      chips: undefined,
      rocksAdded: 0,
    });
    // The acts, one row each; then each loop by the loop it was in (playtest: loops were guessed in fours and split),
    // the last loop fight by fight.
    const out: FightRecord[] = [];
    const looped = run.records.filter((r) => r.loop !== undefined);
    const acts = run.records.filter((r) => r.loop === undefined);
    for (const act of [1, 2, 3]) {
      const list = acts.filter((r) => (r.act ?? 1) === act);
      if (list.length) out.push(sum(list, `ACT ${act}: ${plural(list.length)}`, act));
    }
    const older = acts.filter((r) => (r.act ?? 1) > 3);
    if (older.length) out.push(sum(older, `ENDLESS: ${plural(older.length)}`, 4));
    const loops = [...new Set(looped.map((r) => r.loop!))];
    const lastLoop = loops[loops.length - 1];
    for (const n of loops) {
      const list = looped.filter((r) => r.loop === n);
      if (n === lastLoop) out.push(...list);
      else out.push(sum(list, `LOOP ${n}: ${plural(list.length)}`, 4));
    }
    return out;
  }

  protected drawOver(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    const trueEnding = run.won && run.act >= 3;
    const busted = !!run.endless;
    drawText(ctx, busted ? (run.endless!.turbo ? `YOU BROKE THE BANK! ${fmtNum(endlessScore(run))}` : `BUSTED ON LOOP ${run.endless!.loop}: SCORE ${fmtNum(endlessScore(run))}`) : trueEnding ? 'THE DEALER FOLDS!' : run.won ? 'THE WHEEL STOPS!' : 'RUN OVER', CX, 44, busted ? 5 : 6, run.won && !busted ? COLORS.goldLight : busted ? '#ffd23f' : COLORS.danger);
    const reached = `${CABINETS[run.cabinet].name}  -  ${busted ? `BEAT THE DEALER, THEN ${run.records.filter((r) => r.loop !== undefined).length} ENDLESS FIGHTS` : run.won ? `BEAT ALL ${totalFights(run)} FIGHTS${trueEnding ? ' - TRUE ENDING' : ''}` : `FELL AT FIGHT ${run.records.length} OF ${totalFights(run)} (ACT ${run.act})`}`;
    // DEATH RECAP: its own full-width line under the table (the most important line on a loss).
    const lastRec = run.records[run.records.length - 1];
    const loss = lastRec && !lastRec.won ? lastRec : undefined;
    const recap = loss?.hurt?.length ? `KILLED BY ${loss.enemy}: ${loss.hurt.map(([k, n]) => `${k} ${n}`).join(' - ')}${loss.stuck ? `  (FROZEN ${loss.stuck[0]} OF ${loss.stuck[1]} SPINS)` : ''}` : '';
    // The lines between the table and the reels panel: stacked so they never overlap it or each other.
    const lines: [string, string][] = [];
    if (recap) lines.push([recap, COLORS.danger]);
    // THE RUN SCORE and its biggest parts (x the stake), right under the recap.
    const parts = scoreParts(run).sort((x, y) => y[1] - x[1]);
    lines.push([`SCORE ${fmtNum(runScoreOf(run))} = ${parts.slice(0, 4).map(([k, n]) => `${k} ${fmtNum(n)}`).join(' + ')}${parts.length > 4 ? ' + MORE' : ''}${run.stake ? `, X${1 + SCORE.stakeStep * run.stake}` : ''}`, COLORS.goldLight]);
    if (this.unlockedNow.length) lines.push([`NEW SLOT MACHINE UNLOCKED: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}!`, COLORS.goldLight]);
    if (this.rideOffer) lines.push(['YOUR WIN IS BANKED. ENDLESS GOES ON UNTIL YOU BUST.', COLORS.goldLight]);

    const shown = lines.slice(0, 2);
    shown.forEach(([text, color], k) => {
      const ly = shown.length > 1 ? 462 + k * 18 : 472;
      if (text === recap) {
        // The death recap is the lesson on a loss: it gets a red-framed strip.
        const sh = shown.length > 1 ? 16 : 30;
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(316, ly - sh / 2 - 3, 940, sh + 6);
        ctx.fillStyle = '#1a0a10';
        ctx.fillRect(319, ly - sh / 2, 934, sh);
      }
      drawText(ctx, text, CX, ly, shown.length > 1 || text.length > 90 ? 1.5 : 2, color);
    });
    // Chips left (a won run scores them).
    const chipLine = `  -  ${run.player.chips} CHIPS${run.won && !run.endless ? ` (+${run.player.chips * CHIP_SCORE * (1 + 0.5 * run.stake)} SCORE)` : ''}`;
    drawText(ctx, (run.stake > 0 ? `${reached}  -  STAKE ${run.stake} ${stakeOf(run.stake).name}` : reached) + chipLine, CX, 88, run.stake > 0 ? 1.5 : 2, COLORS.textDim);
    const unlockRow = !!this.stakeUnlockedNow;
    if (unlockRow) {
      this.stakeChip(ctx, 340, 116, run.stake + 1, performance.now() / 1000, 14);
      wrap(this.stakeUnlockedNow, 96).slice(0, 3).forEach((l, k) => drawText(ctx, l, 364, 104 + k * 13, 1.25, stakeOf(run.stake + 1).color, { align: 'left' }));
    }
    // The table moves down under an unlock message (QA_1 B5), and ends higher when two lines sit under it.
    const top = unlockRow ? 22 : 0;
    const twoLines = [recap, this.unlockedNow.length, this.rideOffer].filter(Boolean).length > 1;
    const cut = twoLines ? 18 : 0;
    this.panel(ctx, 316, 120 + top, 940, 320 - top - cut);
    drawText(ctx, 'FIGHT', 350, 142 + top, 2, COLORS.textDim, { align: 'left' });
    drawText(ctx, 'SPINS', 715, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'HP', 821, 142 + top, 2, COLORS.textDim);
    drawText(ctx, 'THEN PICKED', 919, 142 + top, 2, COLORS.textDim, { align: 'left' });
    // Up to 16 fights: rows shrink (and drop the detail line) once they stop fitting.
    const rows = this.overRows(run);
    const rowH = Math.min(42, Math.floor((280 - top - cut) / Math.max(1, rows.length)));
    const compact = rowH < 40;
    rows.forEach((r, i) => {
      const y = 170 + top + i * rowH + (compact ? 0 : 6);
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(328, y - rowH / 2, 916, rowH - 2);
      }
      if (compact && r.act && r.act > 1 && rows[i - 1]?.act === 1) {
        ctx.fillStyle = '#c8f0ff';
        ctx.fillRect(328, y - rowH / 2 - 1, 916, 2);
        this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 2', '#c8f0ff');
      }
      if (compact && r.act && r.act > 2 && rows[i - 1]?.act === 2) {
        ctx.fillStyle = '#7dff7a';
        ctx.fillRect(328, y - rowH / 2 - 1, 916, 2);
        this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 3', '#7dff7a');
      }
      if (compact && i === 0) this.actPlaque(ctx, 1236, y - rowH / 2, 'ACT 1', COLORS.goldLight);
      // Tight rows (a GREEN run has 18) get smaller text, so the act dividers run between rows, not through them.
      const ts = rowH < 18 ? 1.25 : rowH < 22 ? 1.5 : 2;
      drawPortrait(ctx, (r.portrait ?? 'enemyPortrait') as SpriteId, 350, y, compact ? (rowH < 22 ? 0.65 : 0.9) : 1.4);
      drawText(ctx, r.enemy, 376, y, ts, r.won ? COLORS.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${r.turns}`, 715, y, ts, COLORS.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, 821, y, ts, r.hpAfter > 0 ? COLORS.text : COLORS.danger);
      if (compact) {
        const parts = [...(r.bonuses ?? []), r.eliteRelic ? (RELICS[r.eliteRelic]?.name ?? r.eliteRelic) : '', r.eliteChips ? `ELITE +${r.eliteChips} CHIPS` : '', r.pick ? takenLabel(r.pick) : '', ...(r.bought ?? []).map((b) => takenLabel(b))].filter(Boolean);
        const what = parts.length ? parts.join(', ') : r.won ? '' : 'DEFEATED';
        drawText(ctx, what.length > 30 ? `${what.slice(0, 29)}...` : what, 919, y, rowH < 22 ? 1.25 : 1.5, r.won ? '#c9a0ff' : COLORS.danger, { align: 'left' });
        return;
      }
      if (r.pick) drawText(ctx, takenLabel(r.pick), 919, y - 6, 2, '#c9a0ff', { align: 'left' });
      const extra = [
        ...(r.bonuses ?? []),
        r.eliteRelic ? `SPOILS: ${RELICS[r.eliteRelic]?.name ?? r.eliteRelic}` : '',
        ...(r.bought ?? []).map((b) => `BUY: ${takenLabel(b)}`),
        r.chips ? `+${r.chips} CHIPS` : '',
      ].filter(Boolean).join('  ');
      if (extra) drawText(ctx, extra, 919, y + 13, 1.25, COLORS.textDim, { align: 'left' });
      else if (!r.won) drawText(ctx, 'DEFEATED', 919, y, 2, COLORS.danger, { align: 'left' });
      if (r.rocksAdded) drawText(ctx, `+${r.rocksAdded} ROCK${r.rocksAdded > 1 ? 'S' : ''}`, 786, y + 13, 1.25, '#c9bba8');
    });
    for (const b of this.buttons) this.drawButton(ctx, b, 0);
  }

  /** THE RESULTS card: what the run earned outside the run. */
  protected drawResults(ctx: CanvasRenderingContext2D): void {
    const g = this.meta!;
    const r = this.results!;
    ctx.fillStyle = 'rgba(6,2,12,0.75)';
    ctx.fillRect(0, 0, W, H);
    const x0 = 200;
    const w = W - 400;
    this.panel(ctx, x0, 96, w, 540, COLORS.gold);
    drawText(ctx, 'RESULTS', W / 2, 132, 4, COLORS.goldLight);
    // XP bar.
    const lv = levelOf(r.xp);
    drawText(ctx, `+${Math.round(r.xp - g.xpBefore)} XP`, x0 + 40, 190, 2.5, COLORS.text, { align: 'left' });
    drawText(ctx, `LEVEL ${lv.level}`, x0 + w - 40, 190, 2.5, COLORS.goldLight, { align: 'right', punch: 1 + 0.5 * r.pop });
    const bx = x0 + 40;
    const bw = w - 80;
    ctx.fillStyle = COLORS.outline;
    ctx.fillRect(bx - 3, 210, bw + 6, 22);
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(bx, 213, bw, 16);
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx, 213, Math.round((bw * lv.into) / Math.max(1, lv.need)), 16);
    drawText(ctx, `${Math.round(lv.into)}/${lv.need} XP TO LEVEL ${lv.level + 1}`, W / 2, 246, 1.25, COLORS.textDim);
    if (r.pop > 0.01) drawText(ctx, `LEVEL ${r.level}!`, W / 2, 170, 4 + 2 * r.pop, '#ffd23f', { alpha: Math.min(1, r.pop * 2) });
    let y = 280;
    // Unlocks, new titles, a new best.
    const notes: [string, string][] = [];
    if (this.unlockedNow.length) notes.push([`NEW SLOT MACHINE: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}`, '#7dff7a']);
    for (const t of g.titles) notes.push([`NEW TITLE: ${t}`, '#ffd23f']);
    for (const t of g.trims) notes.push([`NEW TRIM: ${t} (WEAR IT FROM TROPHIES)`, '#ff9ec8']);
    for (const [text, color] of notes.slice(0, 3)) {
      drawText(ctx, text, W / 2, y, 2.5, color);
      y += 34;
    }
    // Achievements: up to 4 cards, then "+N MORE".
    if (g.achievements.length) {
      drawText(ctx, g.achievements.length > 1 ? `${g.achievements.length} ACHIEVEMENTS` : 'ACHIEVEMENT', W / 2, y + 4, 2, COLORS.text);
      const shown = g.achievements.slice(0, 4);
      const cw = 196;
      const gap = 12;
      const left = W / 2 - (shown.length * cw + (shown.length - 1) * gap) / 2;
      shown.forEach((a, i) => {
        const cx = left + i * (cw + gap);
        const cy = y + 24;
        ctx.fillStyle = COLORS.outline;
        ctx.fillRect(cx, cy, cw, 116);
        ctx.fillStyle = '#8a6a1c';
        ctx.fillRect(cx + 3, cy + 3, cw - 6, 110);
        ctx.fillStyle = COLORS.panel;
        ctx.fillRect(cx + 6, cy + 6, cw - 12, 104);
        if (hasSprite('trophySmall')) drawSprite(ctx, artId('trophySmall'), cx + cw / 2, cy + 26, 2);
        wrap(a.name, Math.floor((cw - 16) / (textWidth('MM', 1.5) - textWidth('M', 1.5)))).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 52 + k * 15, 1.5, COLORS.goldLight));
        // Line spacing to fit the font (11 px lines touched: R13 B2).
        wrap(a.text, Math.floor((cw - 16) / (textWidth('MM', 1) - textWidth('M', 1)))).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 84 + k * 14, 1, COLORS.textDim));
      });
      if (g.achievements.length > 4) drawText(ctx, `+${g.achievements.length - 4} MORE ON THE TROPHIES SCREEN`, W / 2, y + 156, 1.5, COLORS.textDim);
      y += 172;
    }
    drawText(ctx, r.done ? 'PRESS TO CONTINUE' : 'PRESS TO SKIP', W / 2, 620, 2, r.done ? COLORS.text : COLORS.textDim, { alpha: 0.8 + 0.2 * Math.sin(performance.now() / 200) });
  }
}
