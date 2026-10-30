import type { MetaGain } from '../../core/profile';
import { levelOf } from '../../core/meta';
import { RELICS } from '../../core/relics';
import { takenLabel, endlessScore, runScoreOf, scoreParts, SCORE, totalFights, type FightRecord, type RunState } from '../../core/run';
import { CABINETS, type CabinetId } from '../../core/cabinets';
import { stakeOf } from '../../core/stakes';
import { backOut, sineOut } from '../../present/ease';
import { COLORS, H, W } from '../../present/layout';
import { artId, drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText, fmtNum, textWidth } from '../../render/text';
import { runSummary } from '../../core/runLog';
import { VERSION } from '../../build';
import { CountUp, drawCard, drawChip, drawMarquee, drawPanel, drawTitle, drawWell, KIT, T } from '../kit';
import { heroSprite } from '../menus';
import { wrap, stakeDisc, spotlight, bigPortrait, type Btn } from './shared';
import { ShopScreen } from './shop';

/** RUN OVER's reveal, in seconds: the title lands, the portrait slides in, the words, the score counts up, the wells,
 * then the buttons (a tap skips to the end). */
const BEAT = { portrait: 0.25, words: 0.5, score: 0.75, wells: 1.6, buttons: 2.3 };

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
  // ---- RUN OVER (user: one of the three make-or-break screens: "let's do a really good job with it") ----------------

  /** When the reveal started (seconds; -1: shown in full), the score's count-up, the RUN LOG panel, the main buttons. */
  protected overT0 = 0;
  protected overScore = new CountUp(0, 1.2);
  /** When the score's count-up landed (seconds; -1: not yet). */
  protected scoreLanded = -1;
  protected logOpen = false;
  protected overMain: Btn[] = [];
  protected logButtons: Btn[] = [];

  showOver(run: RunState): void {
    this.rideOffer = false;
    this.run = run;
    this.open('over');
    this.logOpen = false;
    const ride = run.won && run.act >= 3 && !run.endless;
    // NEW RUN is the one primary (KEEP PLAYING after beating the Dealer: the win is banked, ENDLESS goes on).
    const main = ride ? this.btn('KEEP PLAYING', W / 2, 650, 320, 60, () => this.cb.onLetItRide()) : this.btn('NEW RUN', W / 2, 650, 300, 60, () => this.cb.onNewRun());
    this.rideOffer = ride;
    const menu = this.minorBtn('MENU', W / 2 - 300, 650, 200, 52, () => this.cb.onMenu());
    const log = this.minorBtn('RUN LOG', W / 2 + 300, 650, 220, 52, () => this.openLog(true));
    this.overMain = [menu, main, log];
    // COPY RUN (inside the log): the whole run as text, to paste into a chat for balance checks (runLog.ts).
    const copyRun = this.minorBtn('COPY RUN', W / 2 - 150, 652, 240, 50, () => {
      void navigator.clipboard?.writeText(runSummary(run, VERSION)).then(
        () => (copyRun.label = 'COPIED!'),
        () => (copyRun.label = 'COPY FAILED'),
      );
    });
    this.logButtons = [copyRun, this.minorBtn('CLOSE', W / 2 + 150, 652, 240, 50, () => this.openLog(false))];
    this.buttons = [];
    // The reveal: skippable with a tap (or Enter) anywhere.
    this.overT0 = performance.now() / 1000;
    this.overScore = new CountUp(0, 1.2);
    this.scoreLanded = -1;
    this.overSkipHit = this.hit(W / 2, H / 2, W, H, () => this.endReveal());
    this.sounds.stingerMedium();
    void this.ui.wait(BEAT.score).then(() => this.mode === 'over' && this.overScore.set(this.scoreOf(run)));
    void this.ui.wait(BEAT.buttons).then(() => this.mode === 'over' && this.overSkipHit && this.endReveal());
  }

  /** The reveal's end: everything shown, the buttons pop in, then THE RESULTS card (XP, unlocks) if the run earned any. */
  protected endReveal(): void {
    if (!this.overSkipHit) return;
    this.overSkipHit = null;
    this.overT0 = -1;
    this.overScore.set(this.scoreOf(this.run!), true);
    this.buttons = this.overMain;
    for (const b of this.buttons) {
      b.scale = 0;
      void this.ui.tween({ from: 0, to: 1, dur: 0.22, ease: backOut(2), onUpdate: (v) => (b.scale = v) });
    }
    this.openResults();
  }

  protected openLog(open: boolean): void {
    this.logOpen = open;
    this.buttons = open ? this.logButtons : this.overMain;
    for (const b of this.buttons) b.scale = 1;
  }

  /** Enter / A while the reveal plays skips it; on THE RESULTS card it continues (R13 B4). */
  pressResults(): boolean {
    if (this.mode === 'over' && this.overSkipHit) {
      this.endReveal();
      return true;
    }
    if (this.mode !== 'over' || !this.results || !this.resultsHit) return false;
    this.resultsHit.onClick();
    return true;
  }

  protected scoreOf(run: RunState): number {
    return run.endless ? endlessScore(run) : runScoreOf(run);
  }

  /** Seconds into the reveal (a big number once it's over or skipped). */
  protected overT(): number {
    return this.overT0 < 0 ? 99 : performance.now() / 1000 - this.overT0;
  }

  protected drawOver(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const t = this.overT();
    const B = BEAT;
    const ease = (from: number, dur = 0.3) => Math.max(0, Math.min(1, (t - from) / dur));
    const out = (k: number) => 1 - (1 - k) * (1 - k) * (1 - k);
    const lastRec = run.records[run.records.length - 1];
    const loss = lastRec && !lastRec.won ? lastRec : undefined;
    const busted = !!run.endless;
    const won = run.won && !busted;
    const trueEnding = run.won && run.act >= 3;
    const turbo = busted && run.endless!.turbo;
    // A darker room: this is the moment.
    ctx.fillStyle = 'rgba(6,3,12,0.62)';
    ctx.fillRect(0, 0, W, H);
    // 1. The title lands, in the bulb marquee (the kit's big moment).
    const title = turbo ? 'YOU BROKE THE BANK!' : busted ? `BUSTED ON LOOP ${run.endless!.loop}` : trueEnding ? 'THE DEALER FOLDS!' : won ? 'THE WHEEL STOPS!' : 'RUN OVER';
    const good = won || turbo;
    const tw = textWidth(title, T.title) + 96;
    const k1 = out(ease(0, 0.28));
    const punch = this.reduceMotion ? 1 : 1 + 0.3 * (1 - k1);
    ctx.save();
    ctx.globalAlpha *= k1;
    ctx.translate(W / 2, 62);
    ctx.scale(punch, punch);
    drawMarquee(ctx, -tw / 2, -36, tw, 72, this.reduceMotion ? 0 : time, { frame: good ? '#c8901a' : '#a8202a', fill: good ? '#2a1a0a' : '#2a0a14' });
    drawTitle(ctx, title, 0, 1, good ? '#ffd23f' : '#ff6a5a');
    ctx.restore();
    // 2. Who got you (or who won): the portrait big, sliding in.
    const k2 = out(ease(B.portrait, 0.3));
    const slide = this.reduceMotion ? 0 : Math.round((1 - k2) * -80);
    const px = 236;
    const py = 140;
    const ps = 288;
    const portrait = (won || turbo ? heroSprite(run.cabinet) : (loss?.portrait ?? lastRec?.portrait ?? 'enemyPortrait')) as SpriteId;
    ctx.save();
    ctx.globalAlpha *= k2;
    drawWell(ctx, px + slide, py, ps, ps, '#160f26');
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + slide + 2, py + 2, ps - 4, ps - 4);
    ctx.clip();
    spotlight(ctx, px + slide + ps / 2, py + ps - 26, ps - 30, good ? '#ffd23f' : '#ff3a3a', 0.2);
    bigPortrait(ctx, portrait, px + slide + ps / 2, py + ps / 2 + 12, 8);
    ctx.restore();
    ctx.restore();
    // 3. The words: the name, big; what happened.
    const k3 = out(ease(B.words, 0.3));
    const tx = px + ps + 44;
    const name = won || turbo ? CABINETS[run.cabinet].hero : (loss?.enemy ?? lastRec?.enemy ?? 'THE HOUSE');
    const line2 = won || turbo ? (trueEnding ? 'BEAT THE DEALER. TRUE ENDING' : 'BEAT THE HOUSE') : busted ? 'GOT YOU IN ENDLESS' : 'GOT YOU';
    const where = busted
      ? `BEAT THE DEALER, THEN ${run.records.filter((r) => r.loop !== undefined).length} ENDLESS FIGHTS`
      : won
        ? `ALL ${totalFights(run)} FIGHTS WON ON ${CABINETS[run.cabinet].name}`
        : `FIGHT ${run.records.length} OF ${totalFights(run)}, ACT ${run.act}, ON ${CABINETS[run.cabinet].name}`;
    ctx.save();
    ctx.globalAlpha *= k3;
    drawTitle(ctx, name, tx + (this.reduceMotion ? 0 : Math.round((1 - k3) * 24)), py + 26, good ? KIT.title : '#ff8a7a', { align: 'left' });
    drawText(ctx, line2, tx, py + 70, T.head, good ? '#7dff7a' : KIT.text, { align: 'left' });
    drawText(ctx, `${where}${run.stake ? `  -  ${stakeOf(run.stake).name}` : ''}`, tx, py + 100, T.small, KIT.dim, { align: 'left' });
    // The death recap, as chips: what hurt you most.
    if (loss?.hurt?.length) {
      let cx = tx;
      const parts = [...loss.hurt.map(([k, n]) => `${k} ${fmtNum(n)}`), ...(loss.stuck ? [`FROZEN ${loss.stuck[0]} OF ${loss.stuck[1]} SPINS`] : [])];
      for (const p of parts) {
        const w = textWidth(p, T.small) + 18;
        if (cx + w > W - 30) break;
        drawChip(ctx, p, cx + w / 2, py + 132, { scale: T.small, color: '#ff8a7a', fill: '#2a0a14' });
        cx += w + 12;
      }
    } else if (this.rideOffer) drawText(ctx, 'YOUR WIN IS BANKED. ENDLESS GOES ON UNTIL YOU BUST.', tx, py + 132, T.small, KIT.title, { align: 'left' });
    ctx.restore();
    // 4. The score, counting up, big, in its own well.
    const k4 = out(ease(B.score - 0.1, 0.25));
    this.overScore.update(this.frameDtOver());
    ctx.save();
    ctx.globalAlpha *= k4;
    // (Up a row when there's no recap line between.)
    const sy = py + (loss?.hurt?.length || this.rideOffer ? 166 : 140);
    drawText(ctx, 'SCORE', tx, sy + 10, T.small, KIT.dim, { align: 'left' });
    drawWell(ctx, tx, sy + 22, 360, 74, '#120c1c');
    drawSprite(ctx, 'chip', tx + 34, sy + 59, 3);
    // The count-up lands with a punch.
    if (t > B.score + 0.05 && this.overScore.done && this.scoreLanded < 0) this.scoreLanded = performance.now() / 1000;
    const since = this.scoreLanded < 0 ? 9 : performance.now() / 1000 - this.scoreLanded;
    const sp = since < 0.25 && !this.reduceMotion ? 1 + 0.25 * (1 - since / 0.25) : 1;
    drawTitle(ctx, fmtNum(this.overScore.shown), tx + 64, sy + 59, KIT.title, { align: 'left', punch: sp });
    if (run.stake) drawChip(ctx, `X${1 + SCORE.stakeStep * run.stake} ${stakeOf(run.stake).name}`, tx + 360 - 66, sy + 59, { scale: T.small, icon: (ix, iy) => stakeDisc(ctx, ix, iy, stakeOf(run.stake).color, 7), iconW: 18 });
    ctx.restore();
    // 5. The run's highlights as stat wells: your best hit, the fights won, the relics, the chips.
    const best = Math.max(0, ...run.records.map((r) => r.best ?? 0));
    const fights = run.records.filter((r) => r.won).length;
    const chips = run.records.reduce((a, r) => a + (r.chips ?? 0), 0);
    const wells: [string, string, string][] = [
      ['BEST HIT', best ? fmtNum(best) : '-', '#ff9a3a'],
      ['FIGHTS WON', busted ? `${fights}` : `${fights}/${totalFights(run)}`, KIT.text],
      ['RELICS', `${run.player.relics.length}`, '#d8b8ff'],
      ['CHIPS WON', `${chips}`, COLORS.energy],
    ];
    const ww = 176;
    const wg = 18;
    const wx0 = Math.round(W / 2 - (4 * ww + 3 * wg) / 2);
    wells.forEach(([label, value, color], i) => {
      const k = out(ease(B.wells + i * 0.1, 0.22));
      if (k <= 0) return;
      const x = wx0 + i * (ww + wg);
      const y = 466 + (this.reduceMotion ? 0 : Math.round((1 - k) * 12));
      ctx.save();
      ctx.globalAlpha *= k;
      drawWell(ctx, x, y, ww, 82, '#1c1530');
      drawText(ctx, label, x + ww / 2, y + 20, T.small, KIT.dim);
      drawText(ctx, value, x + ww / 2, y + 52, T.head, color);
      ctx.restore();
    });
    // What the run unlocked: a new Slot Machine, a stake.
    const notes = [...(this.unlockedNow.length ? [`NEW SLOT MACHINE: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}`] : []), ...(this.stakeUnlockedNow ? [this.stakeUnlockedNow] : [])];
    if (notes.length && t >= B.wells + 0.4) {
      let nx = W / 2 - notes.slice(0, 2).reduce((a, n) => a + textWidth(n, T.small) + 30, -12) / 2;
      notes.slice(0, 2).forEach((n, i) => {
        const w = textWidth(n, T.small) + 18;
        drawChip(ctx, n, nx + w / 2, 586, { scale: T.small, color: i === 0 && this.unlockedNow.length ? '#7dff7a' : stakeOf(Math.min(5, run.stake + 1)).color });
        nx += w + 12;
      });
    }
    if (this.overT0 >= 0 && t > 0.4) drawText(ctx, 'TAP TO SKIP', W / 2, 650, T.small, KIT.dim, { alpha: 0.6 + 0.3 * Math.sin(time * 4) });
    if (this.logOpen) this.drawRunLog(ctx);
    for (const b of this.buttons) this.drawButton(ctx, b, time);
  }

  /** The over screen's own frame step (its count-up runs on real time). */
  protected overLast = 0;
  protected frameDtOver(): number {
    const now = performance.now() / 1000;
    const dt = this.overLast ? Math.min(0.1, now - this.overLast) : 0;
    this.overLast = now;
    return dt;
  }

  /** RUN LOG: the fight-by-fight table, the score's parts, COPY RUN (in a kit panel over the screen). */
  protected drawRunLog(ctx: CanvasRenderingContext2D): void {
    const run = this.run!;
    ctx.fillStyle = 'rgba(6,3,12,0.7)';
    ctx.fillRect(0, 0, W, H);
    const x = 100;
    const y = 64;
    const w = W - 200;
    const h = 548;
    drawPanel(ctx, x, y, w, h, { title: 'RUN LOG' });
    const parts = scoreParts(run).sort((a, b) => b[1] - a[1]);
    const scoreLine = `SCORE ${fmtNum(runScoreOf(run))} = ${parts.slice(0, 4).map(([k, n]) => `${k} ${fmtNum(n)}`).join(' + ')}${parts.length > 4 ? ' + MORE' : ''}${run.stake ? `, X${1 + SCORE.stakeStep * run.stake}` : ''}`;
    drawText(ctx, scoreLine, x + w / 2, y + 36, T.small, KIT.title);
    const cols = { fight: x + 28, spins: x + 420, hp: x + 530, pick: x + 640 };
    const hy = y + 66;
    drawText(ctx, 'FIGHT', cols.fight, hy, T.small, KIT.dim, { align: 'left' });
    drawText(ctx, 'SPINS', cols.spins, hy, T.small, KIT.dim);
    drawText(ctx, 'HP', cols.hp, hy, T.small, KIT.dim);
    drawText(ctx, 'THEN', cols.pick, hy, T.small, KIT.dim, { align: 'left' });
    const rows = this.overRows(run);
    const rowH = Math.max(22, Math.min(40, Math.floor((h - 100) / Math.max(1, rows.length))));
    const big = rowH >= 34;
    const pickCols = Math.floor((x + w - 24 - cols.pick) / (6 * T.small));
    rows.forEach((r, i) => {
      const ry = hy + 26 + i * rowH;
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 12, ry - rowH / 2 + 1, w - 24, rowH - 2);
      }
      // An act's first row: a rule across, in the act's colour.
      if (i > 0 && (r.act ?? 1) !== (rows[i - 1].act ?? 1)) {
        ctx.fillStyle = (r.act ?? 1) >= 3 ? '#7dff7a' : '#c8f0ff';
        ctx.fillRect(x + 12, ry - rowH / 2, w - 24, 2);
      }
      drawSprite(ctx, (r.portrait ?? 'enemyPortrait') as SpriteId, cols.fight + 12, ry, big ? 1 : 0.5);
      const ts = big ? T.body : T.small;
      drawText(ctx, r.enemy, cols.fight + 34, ry, ts, r.won ? KIT.text : COLORS.danger, { align: 'left' });
      drawText(ctx, `${r.turns}`, cols.spins, ry, ts, KIT.text);
      drawText(ctx, `${r.hpBefore}-${r.hpAfter}`, cols.hp, ry, ts, r.hpAfter > 0 ? KIT.text : COLORS.danger);
      const what = [r.pick ? takenLabel(r.pick) : '', ...(r.bonuses ?? []), r.eliteRelic ? (RELICS[r.eliteRelic]?.name ?? r.eliteRelic) : '', r.eliteChips ? `ELITE +${r.eliteChips} CHIPS` : '', ...(r.bought ?? []).map((b) => `BUY ${takenLabel(b)}`), r.chips ? `+${r.chips} CHIPS` : '']
        .filter(Boolean)
        .join(', ');
      const shown = what || (r.won ? '' : 'DEFEATED');
      drawText(ctx, shown.length > pickCols ? `${shown.slice(0, pickCols - 3)}...` : shown, cols.pick, ry, T.small, r.won ? '#d8b8ff' : COLORS.danger, { align: 'left' });
    });
  }

  /** META: what the finished run earned (XP, level, achievements, titles). */
  protected meta: MetaGain | null = null;
  setMeta(g: MetaGain): void {
    this.meta = g;
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

  /** THE RESULTS card: what the run earned outside the run (XP, a level, unlocks, titles, achievements). */
  protected drawResults(ctx: CanvasRenderingContext2D): void {
    const g = this.meta!;
    const r = this.results!;
    ctx.fillStyle = 'rgba(6,2,12,0.75)';
    ctx.fillRect(0, 0, W, H);
    const x0 = 200;
    const w = W - 400;
    // The card fits what it holds (an XP bar alone was a big empty box).
    const nNotes = Math.min(3, (this.unlockedNow.length ? 1 : 0) + g.titles.length + g.trims.length);
    const ph = 200 + nNotes * 36 + (g.achievements.length ? 196 : 0);
    const top = Math.round(Math.max(40, H / 2 - ph / 2));
    const dy = top - 96;
    ctx.save();
    ctx.translate(0, dy);
    drawPanel(ctx, x0, 96, w, ph, { title: 'RESULTS' });
    // XP bar.
    const lv = levelOf(r.xp);
    drawText(ctx, `+${Math.round(r.xp - g.xpBefore)} XP`, x0 + 40, 160, T.head, KIT.text, { align: 'left' });
    drawText(ctx, `LEVEL ${lv.level}`, x0 + w - 40, 160, T.head, KIT.title, { align: 'right', punch: 1 + 0.5 * r.pop });
    const bx = x0 + 40;
    const bw = w - 80;
    drawWell(ctx, bx - 3, 184, bw + 6, 24, '#120c1c');
    ctx.fillStyle = COLORS.energy;
    ctx.fillRect(bx, 187, Math.round((bw * lv.into) / Math.max(1, lv.need)), 18);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx, 187, Math.round((bw * lv.into) / Math.max(1, lv.need)), 3);
    drawText(ctx, `${Math.round(lv.into)}/${lv.need} XP TO LEVEL ${lv.level + 1}`, W / 2, 226, T.small, KIT.dim);
    if (r.pop > 0.01) drawText(ctx, `LEVEL ${r.level}!`, W / 2, 140, T.title, '#ffd23f', { alpha: Math.min(1, r.pop * 2), punch: 1 + 0.4 * r.pop });
    let y = 268;
    // Unlocks, new titles, trims.
    const notes: [string, string][] = [];
    if (this.unlockedNow.length) notes.push([`NEW SLOT MACHINE: ${this.unlockedNow.map((c) => CABINETS[c].name).join(', ')}`, '#7dff7a']);
    for (const t of g.titles) notes.push([`NEW TITLE: ${t}`, '#ffd23f']);
    for (const t of g.trims) notes.push([`NEW TRIM: ${t} (WEAR IT FROM TROPHIES)`, '#ff9ec8']);
    for (const [text, color] of notes.slice(0, 3)) {
      drawText(ctx, text, W / 2, y, textWidth(text, T.head) <= w - 60 ? T.head : T.body, color);
      y += 36;
    }
    // Achievements: up to 4 plaques, then "+N MORE".
    if (g.achievements.length) {
      drawText(ctx, g.achievements.length > 1 ? `${g.achievements.length} ACHIEVEMENTS` : 'ACHIEVEMENT', W / 2, y + 4, T.body, KIT.text);
      const shown = g.achievements.slice(0, 4);
      const cw = 196;
      const gap = 12;
      const left = W / 2 - (shown.length * cw + (shown.length - 1) * gap) / 2;
      shown.forEach((a, i) => {
        const cx = left + i * (cw + gap);
        const cy = y + 24;
        drawCard(ctx, cx, cy, cw, 124, { rarity: 'common' });
        if (hasSprite('trophySmall')) drawSprite(ctx, artId('trophySmall'), cx + cw / 2, cy + 24, 2);
        wrap(a.name, Math.floor((cw - 20) / (6 * T.small))).slice(0, 2).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 50 + k * 16, T.small, KIT.title));
        wrap(a.text, Math.floor((cw - 20) / (6 * T.small))).slice(0, 3).forEach((l, k) => drawText(ctx, l, cx + cw / 2, cy + 84 + k * 14, T.small, KIT.dim));
      });
      if (g.achievements.length > 4) drawText(ctx, `+${g.achievements.length - 4} MORE ON THE TROPHIES SCREEN`, W / 2, y + 164, T.small, KIT.dim);
    }
    drawText(ctx, r.done ? 'PRESS TO CONTINUE' : 'PRESS TO SKIP', W / 2, 96 + ph - 28, T.body, r.done ? KIT.text : KIT.dim, { alpha: 0.8 + 0.2 * Math.sin(performance.now() / 200) });
    ctx.restore();
  }
}
