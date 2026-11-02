import { bjMax, bjState, bjTotal, BJ, extraPlays, HILO, hiloMax, hiloState } from '../../core/encounters';
import { encounterChoices } from '../../core/run';
import { backOut } from '../../present/ease';
import { drawSprite } from '../../render/sprites';
import { drawText } from '../../render/text';
import { KIT, T } from '../kit';
import { drawPlayingCard } from './shared';
import { TableScreens, SX, ROW, TABLE, TCX, FELT_INK } from './table';

export abstract class CardGames extends TableScreens {
  /** TWENTY-ONE mid-hand: HIT and STAND. */
  protected bjButtons(): void {
    this.encChoices = encounterChoices(this.run!);
    const hit = this.btn('HIT', SX, ROW.main, 196, 56, () => this.playBj(0));
    hit.enabled = !this.encChoices[0]?.disabled;
    const stand = this.minorBtn('STAND', SX, ROW.second, 196, 52, () => this.playBj(1));
    this.setTable([hit, stand]);
  }

  /** TWENTY-ONE between hands: the bet, DEAL, WALK AWAY (the chip table the other games use). */
  protected bjDealButtons(): void {
    const run = this.run!;
    const max = bjMax(run);
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
    this.encChoices = encounterChoices(run);
    const steps = this.betStepper(() => bjMax(this.run!));
    const deal = this.btn('DEAL', SX, ROW.main, 196, 56, () => this.playBj(0));
    const walk = this.footBtn('WALK AWAY', () => this.playBj(1));
    for (const b of [...steps, deal]) b.enabled = max >= 1;
    this.setTable([...steps, deal, walk]);
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
      } else if (!this.leaveOnWalk(res)) this.setTable([this.footBtn('CONTINUE', () => this.cb.onEncounterDone(), true)]);
    };
    if (!res.hand) {
      if (res.more) {
        // Dealt: the bet goes down now.
        this.bjMsg = null;
        this.bjLast = null;
        this.sounds.turnCard(true);
        this.bjButtons();
      } else {
        // Walked away.
        this.bjMsg = res;
        this.setTable([this.footBtn('CONTINUE', () => this.cb.onEncounterDone(), true)]);
      }
      return;
    }
    // The hand's chips land with its word, after the dealer's cards turn.
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    const hand = res.hand;
    this.bjShow = hand;
    this.bjLast = hand;
    this.bjMsg = null;
    this.bjDealerUp = 1;
    this.setTable([]);
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
    const deal = this.btn('DEAL', SX, ROW.main, 196, 56, () => this.playHilo(0));
    const walk = this.footBtn('WALK AWAY', () => this.playHilo(1));
    for (const b of [...steps, deal]) b.enabled = max >= 1;
    this.setTable([...steps, deal, walk]);
  }

  /** HIGHER OR LOWER mid-game: HIGHER, LOWER and CASH OUT (off until a right call; nothing beats an ace). */
  protected hiloButtons(): void {
    this.encChoices = encounterChoices(this.run!);
    const [hi, lo, cash] = this.encChoices;
    // HIGHER and LOWER are the same weight (neither is the safe one); CASH OUT is the way out.
    const up = this.minorBtn('HIGHER', SX, ROW.chips + 4, 196, 56, () => this.playHilo(0));
    up.enabled = !hi?.disabled;
    const down = this.minorBtn('LOWER', SX, ROW.main + 4, 196, 56, () => this.playHilo(1));
    down.enabled = !lo?.disabled;
    // (A secondary, not the grey quiet style: an enabled CASH OUT read as switched off.)
    const out = this.minorBtn('CASH OUT', SX, ROW.second + 18, 196, 48, () => this.playHilo(2));
    out.enabled = !cash?.disabled;
    this.setTable([up, down, out]);
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
    this.setTable([]);
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
      this.setTable([this.footBtn('CONTINUE', () => this.cb.onEncounterDone(), true)]);
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

  /** An empty card spot printed on the felt (where your cards will land). */
  protected cardSpot(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
    const w = Math.round(112 * k);
    const h = Math.round(156 * k);
    ctx.fillStyle = 'rgba(255,210,63,0.3)';
    for (let d = 0; d < w; d += 10) {
      ctx.fillRect(Math.round(x - w / 2 + d), Math.round(y - h / 2), 5, 2);
      ctx.fillRect(Math.round(x - w / 2 + d), Math.round(y + h / 2 - 2), 5, 2);
    }
    for (let d = 0; d < h; d += 10) {
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2 + d), 2, 5);
      ctx.fillRect(Math.round(x + w / 2 - 2), Math.round(y - h / 2 + d), 2, 5);
    }
  }

  /** HIGHER OR LOWER: the card to beat and the deck (the next card turns over on a call), the right calls as chips
   * under them, the word; the pot and the calls on the side. Before the deal: two cards face down and your bet. */
  protected drawHilo(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    const h = this.hl;
    const m = this.hlMsg;
    const games = HILO.games + extraPlays(run);
    drawText(ctx, games > 1 ? `GAME ${Math.min(h.game, games)} OF ${games}` : 'ONE GAME AT THIS TABLE', TCX, 72, T.small, KIT.dim);
    this.felt(ctx, this.hlLive ? '' : `${HILO.calls} RIGHT CALLS PAY THE POT OUT`);
    const ax = TCX - 104;
    const bx = TCX + 104;
    const cy = TABLE.y + 166;
    drawText(ctx, 'THE CARD', ax, TABLE.y + 64, T.small, FELT_INK);
    drawText(ctx, 'NEXT', bx, TABLE.y + 64, T.small, FELT_INK);
    if (!this.hlLive) {
      drawPlayingCard(ctx, ax, cy, 0, 1);
      drawPlayingCard(ctx, bx, cy, 0, 1);
      this.side(ctx, 'YOUR BET');
      this.numberWell(ctx, '', `${this.rlBet}`, { sub: `MAX ${hiloMax(run)}` });
      if (m) this.tableResult(ctx, m);
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
    // The right calls so far, as chips on the felt (lit) against the cap.
    for (let k = 0; k < HILO.calls; k++) {
      ctx.save();
      if (k >= h.right) ctx.globalAlpha *= 0.3;
      drawSprite(ctx, 'chip', TCX + (k - (HILO.calls - 1) / 2) * 40, TABLE.y + 278, 2.5);
      ctx.restore();
    }
    const left = HILO.calls - h.right;
    drawText(ctx, `${left} RIGHT CALL${left === 1 ? '' : 'S'} TO PAY OUT`, TCX, TABLE.y + 306, T.small, FELT_INK);
    this.side(ctx, 'THE POT');
    this.numberWell(ctx, hiloState(run) || !m ? 'ON THE NEXT CALL' : m.good === false ? 'LOST' : 'PAID OUT', `${h.pot}`, { color: m?.good === false ? '#ff8a7a' : undefined, punch: h.potPop, sub: `YOUR BET ${h.bet}` });
    if (m) this.tableResult(ctx, m, TABLE.y + 352);
    void time;
  }

  /** TWENTY-ONE: the dealer's row and yours with their totals; the bet on the side. Between hands: the dealer's two cards
   * face down, your spots empty, your bet. */
  protected drawBj(ctx: CanvasRenderingContext2D, _time: number): void {
    const run = this.run!;
    const st = bjState(run);
    const show = this.bjShow;
    const inPlay = !!st || !!show;
    // (After the last hand or a walk-away the stop's state is cleared: keep showing the hand you got to, not HAND 1.)
    const dealt = show ? show.no : st ? st.dealt : this.bjMsg ? this.bjNo : Number((run.encounterState as { dealt?: number } | undefined)?.dealt ?? 0) + 1;
    this.bjNo = dealt;
    drawText(ctx, `HAND ${Math.min(dealt, BJ.hands + extraPlays(run))} OF ${BJ.hands + extraPlays(run)}`, TCX, 72, T.small, KIT.dim);
    this.felt(ctx, `THE DEALER STANDS ON ${BJ.standOn}  -  21 OFF THE DEAL PAYS 2 TO 1`);
    const m = this.bjMsg;
    const x0 = TCX - 110;
    const dy = TABLE.y + 122;
    const py = TABLE.y + 286;
    const k = 0.75;
    const label = (text: string, y: number, color: string) => drawText(ctx, text, x0 - 62, y, T.body, color, { align: 'right' });
    if (!inPlay) {
      // A finished hand stays face up beside its word (playtest 2026-11-01: "DEALER BUSTS!" over two face-down cards).
      const last = m && m.hand ? this.bjLast : null;
      label(last ? `DEALER ${bjTotal(last.d)}` : 'DEALER', dy, last && bjTotal(last.d) > 21 ? '#ff8a7a' : FELT_INK);
      if (last) last.d.forEach((c, i) => drawPlayingCard(ctx, x0 + i * 64, dy, c, 1, k, i));
      else {
        drawPlayingCard(ctx, x0, dy, 0, 1, k);
        drawPlayingCard(ctx, x0 + 64, dy, 0, 1, k);
      }
      // Your spots wait empty; after a hand, its word sits there instead.
      if (!m) {
        label('YOU', py, FELT_INK);
        this.cardSpot(ctx, x0, py, k);
        this.cardSpot(ctx, x0 + 96, py, k);
      }
      this.side(ctx, 'YOUR BET');
      // Walked away: no more bets (a push keeps the table open).
      if (!(m && !m.hand)) this.numberWell(ctx, '', `${this.rlBet}`, { sub: `MAX ${bjMax(run)}` });
      if (m) this.tableResult(ctx, m, py - 30);
      return;
    }
    const p = show ? show.p : st!.p;
    const d = show ? show.d.slice(0, this.bjDealerUp) : st!.d;
    const row = (cards: number[], y: number, who: string, hidden: boolean) => {
      cards.forEach((c, i) => drawPlayingCard(ctx, x0 + i * 64, y, c, 1, k, i));
      if (hidden) drawPlayingCard(ctx, x0 + cards.length * 64, y, 0, 1, k);
      const t = bjTotal(cards);
      label(`${who} ${t}`, y, t > 21 ? '#ff8a7a' : KIT.text);
    };
    row(d, dy, 'DEALER', !show);
    row(p, py, 'YOU', false);
    this.side(ctx, 'THE BET');
    this.numberWell(ctx, '', `${st?.bet ?? this.rlBet}`);
    if (m && m.title) this.tableResult(ctx, m, TABLE.y + TABLE.h - 70);
  }
}
