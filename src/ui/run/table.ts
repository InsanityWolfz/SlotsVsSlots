import { type EncounterResult } from '../../core/encounters';
import { backOut } from '../../present/ease';
import { COLORS } from '../../present/layout';
import { Btn, CX, RL } from './shared';
import { DraftScreen } from './draft';

export abstract class TableScreens extends DraftScreen {
  /** WALK AWAY leaves at once (feel playtest: walking away, then pressing CONTINUE too, was a click for nothing). */
  protected leaveOnWalk(res: EncounterResult): boolean {
    if (res.title !== 'WALKED AWAY') return false;
    this.cb.onEncounterDone();
    return true;
  }

  /** The chip bet stepper (-5 -1 +1 +5) under YOUR BET, shared by the games that take a chip bet. */
  protected betStepper(max: () => number): Btn[] {
    const step = (d: number) => {
      const next = Math.max(1, Math.min(max(), this.rlBet + d));
      if (next === this.rlBet) this.sounds.fizzle();
      else d > 0 ? this.sounds.coin(4) : this.sounds.click();
      this.rlBet = next;
    };
    return [-5, -1, 1, 5].map((d, k) => this.minorBtn(d > 0 ? `+${d}` : `${d}`, RL.betX + (k - 1.5) * 66, 262, 58, 42, () => step(d)));
  }

  protected encOutcomeSound(res: EncounterResult): void {
    if (res.good === true) {
      this.sounds.coin(6);
      this.sounds.coin(11);
      if (res.reels && new Set(res.reels).size === 1) this.sounds.fanfareJackpot();
    } else if (res.good === false) this.sounds.fizzle();
    else this.sounds.click();
  }

  /** A bet's chips land: the counter changes now, with a bounce. */
  protected landChips(): void {
    if (this.chipsLanding) void this.ui.tween({ from: 1.6, to: 1, dur: 0.3, ease: backOut(3), onUpdate: (v) => (this.chipPulse = v) });
    this.chipsLanding = 0;
  }

  /** The casino felt both card and wheel games sit on. */
  protected felt(ctx: CanvasRenderingContext2D, h = 440): void {
    this.panel(ctx, CX - 430, 104, 860, h, COLORS.gold);
    ctx.fillStyle = '#0e3a20';
    ctx.fillRect(CX - 430, 104, 860, h);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 104; y < 104 + h; y += 8) ctx.fillRect(CX - 430, y, 860, 2);
  }
}
