import { bjMax, bjState, bjTotal, BJ, extraPlays, HILO, hiloMax, hiloState, type EncounterResult } from '../../core/encounters';
import { encounterChoices } from '../../core/run';
import { backOut } from '../../present/ease';
import { COLORS } from '../../present/layout';
import { drawSprite } from '../../render/sprites';
import { drawText } from '../../render/text';
import { CX, drawPlayingCard, RL } from './shared';
import { TableScreens } from './table';

export abstract class CardGames extends TableScreens {
  /** TWENTY-ONE mid-hand: HIT and STAND. */
  protected bjButtons(): void {
    this.encChoices = encounterChoices(this.run!);
    const hit = this.btn('HIT', RL.betX, 300, 260, 56, () => this.playBj(0));
    hit.enabled = !this.encChoices[0]?.disabled;
    const stand = this.btn('STAND', RL.betX, 368, 260, 56, () => this.playBj(1));
    stand.tint = '#2a2234';
    this.buttons = [hit, stand];
  }

  /** TWENTY-ONE between hands: the bet, DEAL, WALK AWAY (the chip table the other games use). */
  protected bjDealButtons(): void {
    const run = this.run!;
    const max = bjMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => bjMax(this.run!));
    const deal = this.btn('DEAL', RL.betX, 342, 280, 56, () => this.playBj(0));
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playBj(1));
    for (const b of [...steps, deal]) b.enabled = max >= 1;
    this.buttons = [...steps, deal, walk];
  }

  /** A TWENTY-ONE move: the deal, a hit, or a stand. A finished hand stays up while the dealer's cards turn one by one,
   * then its word and its chips; then the next hand's bet, or CONTINUE. */
  protected playBj(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    const done = () => {
      if (this.mode !== 'encounter') return;
      if (res.more) {
        this.bjShow = null;
        if (bjState(this.run!)) {
          this.bjMsg = null;
          this.bjButtons();
        } else this.bjDealButtons();
      } else if (!this.leaveOnWalk(res)) this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
    };
    if (!res.hand) {
      if (res.more) {
        // Dealt: the bet goes down now.
        this.bjMsg = null;
        this.sounds.turnCard(true);
        this.bjButtons();
      } else {
        // Walked away.
        this.bjMsg = res;
        this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      }
      return;
    }
    // The hand's chips land with its word, after the dealer's cards turn.
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    const hand = res.hand;
    this.bjShow = hand;
    this.bjMsg = null;
    this.bjDealerUp = 1;
    this.buttons = [];
    let chain: Promise<void> = this.encClock.wait(0.3);
    for (let k = 1; k < hand.d.length && hand.outcome !== 'bust' && hand.outcome !== 'natural'; k++)
      chain = chain.then(() => {
        this.bjDealerUp = k + 1;
        this.sounds.turnCard(false);
        return this.encClock.wait(0.4);
      });
    void chain
      .then(() => {
        this.bjDealerUp = hand.d.length;
        this.bjMsg = res;
        this.landChips();
        if (res.good) {
          this.sounds.lucky();
          this.sounds.coin(8);
        } else if (res.good === false) this.sounds.fizzle();
        else this.sounds.coin(2);
        return this.encClock.wait(res.more ? 1.2 : 0);
      })
      .then(done);
  }

  // ---- HIGHER OR LOWER (back, user 2026-10-29) --------------------------------------------------------------------

  /** HIGHER OR LOWER between games: the bet, DEAL, WALK AWAY (TWENTY-ONE's chip table). */
  protected hiloDealButtons(): void {
    const run = this.run!;
    const max = hiloMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => hiloMax(this.run!));
    const deal = this.btn('DEAL', RL.betX, 342, 280, 56, () => this.playHilo(0));
    const walk = this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playHilo(1));
    for (const b of [...steps, deal]) b.enabled = max >= 1;
    this.buttons = [...steps, deal, walk];
  }

  /** HIGHER OR LOWER mid-game: HIGHER, LOWER and CASH OUT (off until a right call; nothing beats an ace). */
  protected hiloButtons(): void {
    this.encChoices = encounterChoices(this.run!);
    const [hi, lo, cash] = this.encChoices;
    const up = this.btn('HIGHER', RL.betX, 300, 260, 56, () => this.playHilo(0));
    up.enabled = !hi?.disabled;
    const down = this.btn('LOWER', RL.betX, 368, 260, 56, () => this.playHilo(1));
    down.enabled = !lo?.disabled;
    const out = this.btn('CASH OUT', RL.betX, 448, 260, 56, () => this.playHilo(2));
    out.tint = '#2a2234';
    out.enabled = !cash?.disabled;
    this.buttons = [up, down, out];
  }

  /** A HIGHER OR LOWER move: the deal, a call or CASH OUT. A call turns the next card, then its word; a right call or a
   * push slides it over to be the card to beat, and the calls come back; a lost or paid game shows its word, then the
   * next game's bet, or CONTINUE. */
  protected playHilo(i: number): void {
    const run = this.run!;
    const before = run.player.chips;
    const live = !!hiloState(run);
    const res = this.cb.onEncounter(i, this.rlBet);
    if (!res) return;
    if (!live) {
      if (this.leaveOnWalk(res)) return;
      // Dealt: the bet goes down and the first card turns.
      const st = hiloState(run);
      if (!st) return;
      this.hl = { card: st.card, next: 0, flip: 0, slide: 0, turned: 0, right: 0, bet: st.bet, pot: st.pot, potPop: 1, game: st.game };
      this.hlLive = true;
      this.hlMsg = null;
      this.sounds.turnCard(true);
      this.hiloButtons();
      return;
    }
    // (A refused CASH OUT, before a right call: nothing happened.)
    if (!res.title) return this.hiloButtons();
    // A paid game's chips land with its word.
    this.chipsLanding = run.player.chips - before;
    this.buttons = [];
    this.hlMsg = null;
    const h = this.hl;
    const word = () => {
      if (this.mode !== 'encounter') return;
      this.hlMsg = res;
      this.landChips();
      if (res.good === false) {
        h.pot = 0;
        this.sounds.fizzle();
      } else if (res.good) {
        if (res.next !== undefined) h.right++;
        h.pot = res.pot ?? h.pot;
        void this.encClock.tween({ from: 1.5, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (h.potPop = v) });
        this.sounds.lucky();
        this.sounds.coin(res.more && hiloState(run) ? 6 : 10);
        if (h.right >= HILO.calls) this.sounds.fanfareJackpot();
      } else this.sounds.click();
    };
    const after = () => {
      if (this.mode !== 'encounter') return;
      if (hiloState(run)) {
        // Still in play (a right call or a push): the turned card slides over to be the one to beat.
        return this.encClock.wait(0.6).then(() =>
          this.encClock.tween({ from: 0, to: 1, dur: 0.22, onUpdate: (v) => (h.slide = v) }).then(() => {
            Object.assign(h, { card: h.next, next: 0, flip: 0, slide: 0, turned: h.turned + 1 });
            if (this.mode === 'encounter') this.hiloButtons();
          }),
        );
      }
      if (res.more)
        return this.encClock.wait(1.4).then(() => {
          if (this.mode !== 'encounter') return;
          this.hlLive = false;
          h.game++;
          this.hiloDealButtons();
        });
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
    };
    if (res.next === undefined) {
      // CASHED OUT: no card to turn.
      word();
      void after();
      return;
    }
    h.next = res.next;
    h.flip = 0;
    this.sounds.turnCard(false);
    void this.encClock
      .tween({ from: 0, to: 1, dur: 0.4, onUpdate: (v) => (h.flip = v) })
      .then(word)
      .then(after);
  }

  /** HIGHER OR LOWER: the card to beat and the deck (the next card turns over on a call), the right calls as chips
   * under them, the word; the pot, the bet and the calls on the right. Before the deal: the house rules and your bet. */
  protected drawHilo(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const h = this.hl;
    const m = this.hlMsg;
    const col = (r: EncounterResult) => (r.good ? COLORS.goldLight : r.good === false ? '#ff8a7a' : COLORS.text);
    const games = HILO.games + extraPlays(run);
    if (games > 1) drawText(ctx, `GAME ${Math.min(h.game, games)} OF ${games}`, CX, 78, 2, COLORS.textDim);
    this.felt(ctx);
    const ax = RL.wheelX - 80;
    const bx = RL.wheelX + 80;
    const cy = 250;
    drawText(ctx, 'THE CARD', ax, 148, 2, COLORS.textDim);
    drawText(ctx, 'NEXT', bx, 148, 2, COLORS.textDim);
    if (!this.hlLive) {
      // Between games: two face-down cards and the house rules on the left, your bet on the right.
      drawPlayingCard(ctx, ax, cy, 0, 1);
      drawPlayingCard(ctx, bx, cy, 0, 1);
      drawText(ctx, 'CALL THE NEXT CARD: HIGHER OR LOWER.', RL.wheelX, 380, 1.5, COLORS.goldLight);
      drawText(ctx, `RIGHT: THE POT GROWS X${HILO.grow}. WRONG: IT'S GONE.`, RL.wheelX, 404, 1.5, COLORS.goldLight);
      drawText(ctx, 'THE SAME CARD IS A PUSH: CALL AGAIN.', RL.wheelX, 428, 1.5, COLORS.textDim);
      drawText(ctx, 'CASH OUT ANY TIME AFTER A RIGHT CALL.', RL.wheelX, 452, 1.5, COLORS.textDim);
      drawText(ctx, `${HILO.calls} RIGHT CALLS PAY THE POT OUT.`, RL.wheelX, 476, 1.5, COLORS.textDim);
      if (m) {
        drawText(ctx, m.title, RL.betX, 470, 3, col(m));
        if (m.text) drawText(ctx, m.text, RL.betX, 506, 2, col(m));
      }
      drawText(ctx, `YOUR BET (MAX ${hiloMax(run)})`, RL.betX, 150, 2, COLORS.textDim);
      drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
      drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
      return;
    }
    // The card to beat; the deck, its top card turning (a back that narrows, then the face that widens) and sliding over.
    drawPlayingCard(ctx, ax, cy, h.card, 1, 1, h.turned);
    if (!h.next || h.slide > 0) drawPlayingCard(ctx, bx, cy, 0, 1);
    if (h.next) {
      const x = bx + (ax - bx) * h.slide;
      if (h.flip < 0.5) drawPlayingCard(ctx, x, cy, 0, 1 - h.flip * 2);
      else drawPlayingCard(ctx, x, cy, h.next, h.flip * 2 - 1, 1, h.turned + 1);
    }
    // The right calls so far, as chips (lit) against the cap.
    for (let k = 0; k < HILO.calls; k++) {
      ctx.save();
      if (k >= h.right) ctx.globalAlpha *= 0.25;
      drawSprite(ctx, 'chip', RL.wheelX + (k - (HILO.calls - 1) / 2) * 36, 372, 2);
      ctx.restore();
    }
    const left = HILO.calls - h.right;
    drawText(ctx, `${left} CALL${left === 1 ? '' : 'S'} LEFT`, RL.wheelX, 404, 2, COLORS.textDim);
    if (m) {
      drawText(ctx, m.title, RL.wheelX, 456, 3, col(m), { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, RL.wheelX, 494, 2, col(m));
    }
    // Right column: the pot riding on the next call, and the bet it grew from.
    drawText(ctx, 'THE POT', RL.betX, 150, 2, COLORS.textDim);
    drawSprite(ctx, 'chip', RL.betX - 44, 196, 4);
    drawText(ctx, `${h.pot}`, RL.betX - 14, 196, 5, m?.good === false ? '#ff8a7a' : COLORS.energy, { align: 'left', punch: h.potPop });
    drawText(ctx, `YOUR BET ${h.bet}`, RL.betX, 240, 1.5, COLORS.textDim);
  }

  /** TWENTY-ONE: the dealer's row and yours with their totals, which hand this is, what you've won. Before the buy-in:
   * the house rules and the pay cards. */
  protected drawBj(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const st = bjState(run);
    const show = this.bjShow;
    const inPlay = !!st || !!show;
    // (After the last hand or a walk-away the stop's state is cleared: keep showing the hand you got to, not HAND 1.)
    const dealt = show ? show.no : st ? st.dealt : this.bjMsg ? this.bjNo : Number((run.encounterState as { dealt?: number } | undefined)?.dealt ?? 0) + 1;
    this.bjNo = dealt;
    drawText(ctx, `HAND ${Math.min(dealt, BJ.hands + extraPlays(run))} OF ${BJ.hands + extraPlays(run)}`, CX, 78, 2, COLORS.textDim);
    this.felt(ctx);
    const m = this.bjMsg;
    if (!inPlay) {
      // Between hands: two face-down cards and the house rules on the left, your bet on the right.
      drawPlayingCard(ctx, RL.wheelX - 40, 260, 0, 1, 0.8);
      drawPlayingCard(ctx, RL.wheelX + 40, 260, 0, 1, 0.8);
      drawText(ctx, 'A WIN PAYS 1 TO 1. 21 OFF THE DEAL PAYS 2 TO 1.', RL.wheelX, 380, 1.5, COLORS.goldLight);
      drawText(ctx, `THE DEALER STANDS ON ${BJ.standOn}. A TIE IS A PUSH: DEAL AGAIN.`, RL.wheelX, 404, 1.5, COLORS.textDim);
      if (m) {
        drawText(ctx, m.title, RL.betX, 470, 3, m.good ? COLORS.goldLight : m.good === false ? '#ff8a7a' : COLORS.text);
        if (m.text) drawText(ctx, m.text, RL.betX, 506, 2, m.good ? COLORS.goldLight : m.good === false ? '#ff8a7a' : COLORS.text);
      }
      // Walked away: no more bets (a push keeps the table open).
      if (m && !m.hand) return;
      drawText(ctx, `YOUR BET (MAX ${bjMax(run)})`, RL.betX, 150, 2, COLORS.textDim);
      drawSprite(ctx, 'chip', RL.betX - 44, 200, 4);
      drawText(ctx, `${this.rlBet}`, RL.betX - 14, 200, 5, COLORS.energy, { align: 'left' });
      return;
    }
    const p = show ? show.p : st!.p;
    const d = show ? show.d.slice(0, this.bjDealerUp) : st!.d;
    const x0 = CX - 340;
    const row = (cards: number[], y: number, label: string, hidden: boolean) => {
      cards.forEach((c, k) => drawPlayingCard(ctx, x0 + 50 + k * 70, y, c, 1, 0.75, k));
      if (hidden) drawPlayingCard(ctx, x0 + 50 + cards.length * 70, y, 0, 1, 0.75);
      const t = bjTotal(cards);
      drawText(ctx, `${label} ${t}`, x0 + 10, y - 76, 2, t > 21 ? '#ff8a7a' : COLORS.text, { align: 'left' });
    };
    row(d, 220, 'DEALER', !show);
    row(p, 420, 'YOU', false);
    // Right column: the bet riding on this hand, then how it went.
    drawSprite(ctx, 'chip', RL.betX - 70, 190, 3);
    drawText(ctx, `${st?.bet ?? this.rlBet} ON THIS HAND`, RL.betX - 46, 190, 2, COLORS.energy, { align: 'left' });
    if (m && m.title) {
      drawText(ctx, m.title, RL.betX, 300, 2.5, m.good ? COLORS.goldLight : '#ff8a7a', { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, RL.betX, 336, 2, m.good ? COLORS.goldLight : '#ff8a7a');
    }
  }
}
