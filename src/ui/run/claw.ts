import { atStakes, CLAW, CLAW_PRIZES, clawPrizeName, extraPlays } from '../../core/encounters';
import { encounterChoices } from '../../core/run';
import { COLORS } from '../../present/layout';
import { artId, drawSprite, type SpriteId } from '../../render/sprites';
import { drawText } from '../../render/text';
import { CX, RL, CW } from './shared';
import { CardGames } from './cardGames';

export abstract class ClawScreen extends CardGames {
  // ---- CLAW MACHINE (user's pick, 2026-10-14) ----------------------------------------------------------------------

  /** CLAW MACHINE: a button per prize still in the pit (its grip under it), WALK AWAY. */
  protected clawButtons(): void {
    const run = this.run!;
    this.encChoices = encounterChoices(run);
    const aims = CLAW_PRIZES.map((_p, k) => {
      const b = this.btn(`GO FOR ${clawPrizeName(run, k)}`, RL.betX, 300 + k * 74, 320, 50, () => this.playClaw(k));
      b.enabled = !this.encChoices[k]?.disabled;
      return b;
    });
    this.buttons = [...aims, this.minorBtn('WALK AWAY', CX, 636, 260, 44, () => this.playClaw(CLAW_PRIZES.length))];
  }

  /** One go: the claw slides over, drops, shuts and lifts; the prize rides up, and holds or slips. */
  protected playClaw(i: number): void {
    const before = this.run?.player.chips ?? 0;
    const res = this.cb.onEncounter(i);
    if (!res) return;
    this.chipsLanding = (this.run?.player.chips ?? 0) - before;
    if (!res.claw) {
      this.cwMsg = res;
      if (this.leaveOnWalk(res)) return;
      this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      return;
    }
    const claw = res.claw;
    this.cwMsg = null;
    this.cwTarget = claw.prize;
    this.buttons = [
      this.minorBtn('SKIP', CX, 636, 200, 44, () => {
        this.encClock.skip();
      }),
    ];
    const targetX = CW.x0 + claw.prize * CW.gap;
    void this.encClock
      .tween({
        from: 0,
        to: 1,
        dur: 3,
        onUpdate: (t) => {
          // 0-0.3 slide, 0.3-0.5 drop, 0.5-0.6 shut, 0.6-0.85 lift (it slips at 0.75 if it doesn't hold), 0.85-1 home.
          const home = CW.home;
          if (t < 0.3) {
            this.cwX = home + (targetX - home) * (t / 0.3);
            this.cwY = 0;
          } else if (t < 0.5) {
            this.cwX = targetX;
            this.cwY = (t - 0.3) / 0.2;
          } else if (t < 0.6) this.cwY = 1;
          else if (t < 0.85) this.cwY = 1 - (t - 0.6) / 0.25;
          else {
            this.cwY = 0;
            this.cwX = targetX + (home - targetX) * ((t - 0.85) / 0.15);
          }
          this.cwShut = t >= 0.5 && t < 0.97;
          this.cwCarry = t >= 0.55 && (claw.held ? t < 0.97 : t < 0.75);
        },
      })
      .then(() => {
        this.encClock.skipping = false;
        this.cwX = CW.home;
        this.cwY = 0;
        this.cwShut = false;
        this.cwCarry = false;
        if (claw.held) this.cwWon.push(claw.prize);
        this.landChips();
        if (this.mode !== 'encounter') return;
        this.cwMsg = res;
        this.encOutcomeSound(res);
        if (res.more) this.clawButtons();
        else this.buttons = [this.btn('CONTINUE', CX, 636, 300, 52, () => this.cb.onEncounterDone())];
      });
  }

  /** CLAW MACHINE: the glass cabinet, the prizes in the pit (won ones gone), the claw, the result. */
  protected drawClaw(ctx: CanvasRenderingContext2D, time: number): void {
    const run = this.run!;
    this.felt(ctx);
    // Goes left, live (it read GO 1 OF 3 after that go was spent: feel playtest #2).
    const goes = Math.max(0, CLAW.tries + extraPlays(run) - (run.encounterPlays ?? 0));
    drawText(ctx, `${goes} GO${goes === 1 ? '' : 'ES'} LEFT  -  ${atStakes(run, CLAW.price)} CHIPS A GO`, CX, 78, 2, COLORS.textDim);
    // The cabinet.
    const cx0 = CW.x0 - 100;
    const cw = CW.gap * 2 + 200;
    ctx.fillStyle = '#c81a2a';
    ctx.fillRect(cx0 - 10, 120, cw + 20, 420);
    ctx.fillStyle = '#1a1030';
    ctx.fillRect(cx0, 150, cw, 380);
    ctx.fillStyle = 'rgba(160,220,255,0.06)';
    ctx.fillRect(cx0, 150, cw, 380);
    drawText(ctx, 'GRAB-A-PRIZE', cx0 + cw / 2, 136, 2, COLORS.goldLight);
    // The rail and the claw.
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(cx0, 166, cw, 6);
    const clawY = 200 + this.cwY * 230;
    ctx.fillStyle = '#5a5a6a';
    ctx.fillRect(this.cwX - 2, 170, 4, clawY - 186);
    const won = this.cwWon;
    const art: SpriteId[] = ['chip', artId('enhGold'), artId('relicSym')];
    CLAW_PRIZES.forEach((p, k) => {
      const x = CW.x0 + k * CW.gap;
      const carried = this.cwCarry && this.cwTarget === k;
      if (won.includes(k) && !carried) return;
      const y = carried ? clawY + 46 : CW.pitY;
      drawSprite(ctx, artId('prizeBall'), x, y, 5);
      drawSprite(ctx, art[k], x, y - 4, 2);
      if (!carried) {
        drawText(ctx, clawPrizeName(run, k), x, CW.pitY + 52, 1.5, COLORS.text);
        drawText(ctx, p.grip, x, CW.pitY + 72, 1.25, k === 0 ? '#7dff7a' : k === 1 ? '#ffd23f' : '#ff8a7a');
      }
    });
    drawSprite(ctx, artId(this.cwShut ? 'clawGrabberShut' : 'clawGrabber'), this.cwX, clawY, 4);
    const m = this.cwMsg;
    if (m) {
      drawText(ctx, m.title, RL.betX, 200, 3, m.good ? COLORS.goldLight : '#ff8a7a', { punch: 1 + 0.03 * Math.sin(time * 6) });
      if (m.text) drawText(ctx, m.text, RL.betX, 240, 2, m.good ? COLORS.goldLight : COLORS.textDim);
    } else if (this.cwY === 0 && this.cwX === CW.home) drawText(ctx, 'PICK A PRIZE TO GO FOR', RL.betX, 220, 2, COLORS.textDim);
  }
}
