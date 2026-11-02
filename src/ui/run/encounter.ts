import { atStakes, BJ, bjState, CLAW, clawMisses, clawWon, encounterOf, extraPlays, HILO, hiloState } from '../../core/encounters';
import { drawTitle, KIT, T } from '../kit';
import { TCX } from './table';
import { RELICS } from '../../core/relics';
import { encounterChoices, currentStop, type RunState } from '../../core/run';
import { Clock } from '../../present/clock';
import { COLORS } from '../../present/layout';
import { drawSprite, hasSprite, type SpriteId } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { ENC, OFFER, CX, CW } from './shared';
import { ClawScreen } from './claw';

export abstract class EncounterScreen extends ClawScreen {
  /** An ENCOUNTER stop: a game's buy-in cards (LOW / MEDIUM / HIGH, each its stake and what it buys) or an offer's
   * choices, then the plays, then how it went. */
  showEncounter(run: RunState): void {
    this.run = run;
    this.open('encounter');
    this.encResult = null;
    this.encT = 1;
    this.encFired.clear();
    this.encId = currentStop(run)?.encounter;
    this.encChoices = encounterChoices(run);
    {
      // The game's own clock follows the screens' (so it runs at their pace, and SKIP touches nothing else).
      this.encClock = new Clock();
      this.ui.add({ update: (dt) => (this.encClock.tick(dt), this.mode !== 'encounter'), finish: () => {} });
    }
    // The table's rules: one line under it, the full rules behind "?".
    this.rulesOpen = false;
    const rules = this.tableRules();
    this.rulesB = rules ? this.rulesBtn(rules.line) : null;
    if (this.encId === 'claw') {
      this.cwX = CW.home;
      this.cwY = 0;
      this.cwMsg = null;
      this.cwWon = [...clawWon(run)];
      this.cwMisses = [...clawMisses(run)];
      return this.clawButtons();
    }
    if (this.encId === 'bj') {
      this.bjShow = null;
      this.bjLast = null;
      this.bjMsg = null;
      return bjState(run) ? this.bjButtons() : this.bjDealButtons();
    }
    if (this.encId === 'hilo') {
      // (A game in play resumes at the table: its card, its pot.)
      const st = hiloState(run);
      this.hlMsg = null;
      this.hlLive = !!st;
      this.hl = { card: st?.card ?? 0, next: 0, flip: 0, slide: 0, turned: 0, right: st?.right ?? 0, bet: st?.bet ?? 0, pot: st?.pot ?? 0, potPop: 1, game: st?.game ?? Number((run.encounterState as { games?: number } | undefined)?.games ?? 0) + 1 };
      return st ? this.hiloButtons() : this.hiloDealButtons();
    }
    const choices = this.encChoices;
    const cards = choices.filter((c) => c.stake);
    this.buttons = choices.map((c, i) => {
      // Buy-in cards in a row over the table's foot; WALK AWAY (and offers' choices) as buttons below.
      if (c.stake) {
        const x = CX + (i - (cards.length - 1) / 2) * ENC.cardGap;
        const b = this.btn(c.label, x, ENC.cardY, ENC.cardW, ENC.cardH, () => this.playEncounter(i));
        b.enabled = !c.disabled;
        return b;
      }
      const rest = choices.length - cards.length;
      const k = i - cards.length;
      const x = CX + (k - (rest - 1) / 2) * (cards.length ? 360 : OFFER.gap);
      const y = cards.length ? 652 : OFFER.y;
      const last = i === choices.length - 1;
      const b = last ? this.minorBtn(c.label, x, y, cards.length ? 260 : OFFER.w, cards.length ? 44 : 56, () => this.playEncounter(i)) : this.btn(c.label, x, y, OFFER.w, 56, () => this.playEncounter(i));
      b.enabled = !c.disabled;
      return b;
    });
  }


  /** Each table's rules: the one line under it, and the full rules behind its "?". */
  protected tableRules(): { line: string; full: string[] } | null {
    const run = this.run!;
    if (this.encId === 'bj')
      return {
        line: "BEAT THE DEALER'S HAND WITHOUT GOING OVER 21",
        full: ['HIT TO TAKE A CARD, STAND TO STOP.', 'A WIN PAYS 1 TO 1.', '21 OFF THE DEAL PAYS 2 TO 1.', `THE DEALER STANDS ON ${BJ.standOn}.`, 'A TIE IS A PUSH: DEAL AGAIN.', `${BJ.hands + extraPlays(run)} HANDS AT THIS TABLE.`],
      };
    if (this.encId === 'hilo')
      return {
        line: 'CALL THE NEXT CARD: HIGHER OR LOWER',
        full: [`RIGHT: THE POT GROWS X${HILO.grow}.`, "WRONG: IT'S GONE.", 'THE SAME CARD IS A PUSH: CALL AGAIN.', 'CASH OUT ANY TIME AFTER A RIGHT CALL.', `${HILO.calls} RIGHT CALLS PAY THE POT OUT.`],
      };
    if (this.encId === 'claw')
      return {
        line: 'PICK A PRIZE. A MISS DRAGS IT CLOSER TO THE DROP',
        full: [`${atStakes(run, CLAW.price)} CHIPS A GO, ${CLAW.tries + extraPlays(run)} GOES.`, 'PICK A PRIZE: THE CLAW DROPS ON IT.', 'EASY GRABS HOLD MORE OFTEN THAN HARD ONES.', 'EVERY MISS DRAGS THAT PRIZE CLOSER: ITS NEXT GRAB HOLDS MORE OFTEN.', 'WHAT THE CLAW HOLDS, YOU KEEP.'],
      };
    return null;
  }

  protected playEncounter(i: number): void {
    if (this.encId === 'bj') return this.playBj(i);
    if (this.encId === 'claw') return this.playClaw(i);
    if (this.encId === 'hilo') return this.playHilo(i);
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.encResult = res;
    this.encT = 0;
    if (this.leaveOnWalk(res)) return;
    this.buttons = [this.btn('CONTINUE', CX, 588, 300, 52, () => this.cb.onEncounterDone())];
    const land = res.reels ? 3 : 0;
    void this.ui.tween({ from: 0, to: 1, dur: land ? 1.1 : 0.25, onUpdate: (v) => (this.encT = v) });
    for (let k = 0; k < land; k++) void this.ui.wait(0.35 + k * 0.3).then(() => this.sounds.reelStop(k));
    void this.ui.wait(land ? 1.1 : 0.15).then(() => this.encOutcomeSound(res));
  }

  /** An ENCOUNTER: its name and line, its table (TWENTY-ONE's and HIGHER OR LOWER's felt, the CLAW's cabinet), then the
   * buy-in cards, the plays and how it went. */
  protected drawEncounter(ctx: CanvasRenderingContext2D, time: number): void {
    const def = encounterOf(this.encId);
    const rules = this.tableRules();
    drawTitle(ctx, def.name, rules ? TCX : CX, 36);
    if (def.blurb) drawText(ctx, def.blurb, CX, 80, T.body, KIT.dim);
    const res = this.encResult;
    if (def.id === 'hilo') this.drawHilo(ctx, time);
    else if (def.id === 'bj') this.drawBj(ctx, time);
    else if (def.id === 'claw') this.drawClaw(ctx, time);
    if (rules) {
      for (const b of this.buttons) this.drawButton(ctx, b, time);
      this.drawRules(ctx, rules.line, rules.full);
      return;
    }
    {
      this.panel(ctx, CX - 330, 120, 660, 300, '#7a3aa8');
      if (!res) {
        // Each offer's terms under its own button (WALK AWAY needs none).
        // One size for every caption, the biggest that fits a button's width (they used to differ, and nearly touch).
        const caps = this.encChoices.filter((c, i, all) => !c.stake && i !== all.length - 1);
        const capScale = [2, 1.5, 1].find((k) => caps.every((c) => textWidth(c.text, k) <= OFFER.w)) ?? 1;
        this.encChoices.forEach((c, i, all) => {
          if (c.stake || i === all.length - 1) return;
          const x = CX + (i - (all.length - 1) / 2) * OFFER.gap;
          drawText(ctx, c.text, x, OFFER.y + 46, capScale, c.disabled ? '#6a6078' : COLORS.goldLight);
        });
        // The offer's character (a gentle bob), or a gold-edged "?" ticket until its art exists.
        const k = 1 + 0.03 * Math.sin(time * 2);
        if (def.art && hasSprite(def.art)) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(CX - 60, 316, 120, 10);
          drawSprite(ctx, def.art as SpriteId, CX, 240 + Math.sin(time * 2) * 3, 6);
        } else {
          ctx.fillStyle = COLORS.outline;
          ctx.fillRect(CX - 70 * k, 250 - 90 * k, 140 * k, 180 * k);
          ctx.fillStyle = COLORS.gold;
          ctx.fillRect(CX - 64 * k, 250 - 84 * k, 128 * k, 168 * k);
          ctx.fillStyle = '#3a1a4a';
          ctx.fillRect(CX - 56 * k, 250 - 76 * k, 112 * k, 152 * k);
          drawText(ctx, '?', CX, 250, 10 * k, '#e8b0ff');
        }
        // The relic an offer wants (THE PAWN SHOP): its icon, readable by tooltip.
        const wanted = this.encChoices.find((c) => c.relic)?.relic;
        if (wanted) {
          drawSprite(ctx, RELICS[wanted].sprite as SpriteId, CX + 110, 200, 2.5);
          this.tips.add(wanted, CX + 110, 200, 20);
        }
      } else if (this.encT >= 1) {
        const col = res.good === true ? COLORS.goldLight : res.good === false ? '#ff8a7a' : COLORS.text;
        drawText(ctx, res.title, CX, 240, 4, col, { punch: 1 + 0.03 * Math.sin(time * 6) });
        drawText(ctx, res.text, CX, 300, 2.5, col);
      }
    }
    if (!res) this.drawBuyIns(ctx, time);
    for (const b of this.buttons) if (!this.encChoices.some((c, i) => c.stake && b === this.buttons[i] && b.label === c.label) || res) this.drawButton(ctx, b, time);
  }

  /** The buy-in cards: the tier, what you put up, what it buys. A staked relic shows its icon (its tooltip works). */
  protected drawBuyIns(ctx: CanvasRenderingContext2D, time: number): void {
    this.encChoices.forEach((c, i) => {
      if (!c.stake) return;
      const b = this.buttons[i];
      // (Only a buy-in button: after TWENTY-ONE's WALK AWAY the only button is CONTINUE, and it was drawn as card A.)
      if (!b || b.label !== c.label) return;
      const x = b.x - b.w / 2;
      const y = b.y - b.h / 2 - (b.hover && b.enabled ? 4 : 0);
      let y0 = y;
      // Every card looks alike: which one is the big bet is the player's call (no LOW / HIGH labels).
      ctx.save();
      if (!b.enabled) ctx.globalAlpha *= 0.4;
      this.panel(ctx, x, y, b.w, b.h, b.hover && b.enabled ? COLORS.goldLight : COLORS.gold);
      drawText(ctx, 'PAY', b.x, y + 20, 2, COLORS.textDim, { punch: b.hover && b.enabled ? 1 + 0.04 * Math.sin(time * 8) : 1 });
      y0 = y + 6;
      // The biggest size that fits the card (with the relic's icon beside it): PAY OVERCHARGE ran edge to edge.
      const icon = c.relic ? 30 : 0;
      const fit = (t: string, room: number) => [2.5, 2, 1.5, 1].find((k) => textWidth(t, k) <= room) ?? 1;
      const ss = fit(c.stake, b.w - 20 - icon);
      const sw = textWidth(c.stake, ss);
      if (c.relic) {
        drawSprite(ctx, RELICS[c.relic].sprite as SpriteId, b.x - (sw + icon) / 2 + 12, y0 + 40, 1.5);
        this.tips.add(c.relic, b.x - (sw + icon) / 2 + 12, y0 + 40, 14);
      }
      drawText(ctx, c.stake, b.x + icon / 2, y0 + 40, ss, COLORS.text);
      drawText(ctx, 'FOR', b.x, y0 + 64, 1.5, COLORS.textDim);
      drawText(ctx, c.prize ?? '', b.x, y0 + 86, fit(c.prize ?? '', b.w - 20), COLORS.goldLight);
      ctx.restore();
    });
  }
}
