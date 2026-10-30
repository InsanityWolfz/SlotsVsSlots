import { type EncounterResult } from '../../core/encounters';
import { backOut } from '../../present/ease';
import { COLORS } from '../../present/layout';
import { drawSprite } from '../../render/sprites';
import { drawText, textWidth } from '../../render/text';
import { drawBanner, drawPanel, drawWell, KIT, T } from '../kit';
import { wrap, Btn, CX } from './shared';
import { DraftScreen } from './draft';

/**
 * THE CARD TABLES (TWENTY-ONE, HIGHER OR LOWER, the CLAW): one layout. The game on the left (felt for the cards, a
 * cabinet for the claw: scenery, not a panel), the controls in a kit panel on the right (the bet as chips you tap,
 * the one primary), the rules as one line under the table with a "?" for the full rules, WALK AWAY at the foot.
 */
export const TABLE = { x: 330, y: 92, w: 672, h: 472 };
export const SIDE = { x: 1026, y: 92, w: 238, h: 472 };
/** The side panel's centre line, and its rows (the bet well, the chips, the primary, the next button down). */
export const SX = SIDE.x + SIDE.w / 2;
export const ROW = { label: 124, well: 170, chips: 258, main: 334, second: 404, third: 470 };
/** The foot: the rules line, WALK AWAY / CONTINUE. */
export const FOOT = { rules: 596, button: 660 };
export const TCX = TABLE.x + TABLE.w / 2;
/** Words printed on the felt (a muted gold, as if stamped into it). */
export const FELT_INK = '#b8a45a';

export abstract class TableScreens extends DraftScreen {
  /** The full rules over the table ("?"), and its button (it stays on the table whatever else changes). */
  protected rulesOpen = false;
  protected rulesB: Btn | null = null;

  /** The table's buttons now (the rules "?" always among them). */
  protected setTable(list: Btn[]): void {
    this.buttons = this.rulesB ? [...list, this.rulesB] : list;
  }

  /** WALK AWAY leaves at once (feel playtest: walking away, then pressing CONTINUE too, was a click for nothing). */
  protected leaveOnWalk(res: EncounterResult): boolean {
    if (res.title !== 'WALKED AWAY') return false;
    this.cb.onEncounterDone();
    return true;
  }

  /** The bet: four chips you tap (-5 -1 +1 +5), shared by the games that take a chip bet. */
  protected betStepper(max: () => number): Btn[] {
    const step = (d: number) => {
      const next = Math.max(1, Math.min(max(), this.rlBet + d));
      if (next === this.rlBet) this.sounds.fizzle();
      else d > 0 ? this.sounds.coin(4) : this.sounds.click();
      this.rlBet = next;
    };
    return [-5, -1, 1, 5].map((d, k) => {
      const b = this.minorBtn(d > 0 ? `+${d}` : `${d}`, SX + (k - 1.5) * 56, ROW.chips, 52, 52, () => step(d));
      b.chip = Math.abs(d) === 5 ? '#c8321f' : '#3b6ef0';
      return b;
    });
  }

  /** The "?" beside the rules line: the full rules over the table. */
  protected rulesBtn(line: string): Btn {
    const x = CX + textWidth(line, T.body) / 2 + 30;
    const b = this.minorBtn('?', x, FOOT.rules, 36, 32, () => (this.rulesOpen = !this.rulesOpen));
    return b;
  }

  /** The foot's button (WALK AWAY, CONTINUE, SKIP). */
  protected footBtn(label: string, onClick: () => void, primary = false): Btn {
    return primary ? this.btn(label, CX, FOOT.button, 300, 52, onClick) : this.minorBtn(label, CX, FOOT.button, 260, 46, onClick);
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

  /** The card table: a padded wooden rail round green felt, a printed pin line and the house's line on the felt. */
  protected felt(ctx: CanvasRenderingContext2D, printed = ''): void {
    const { x, y, w, h } = TABLE;
    const r = 18;
    // The rail: dark wood with a lit top edge, its corners stepped (no anti-aliased curves).
    const steps = (inset: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + inset + r, y + inset, w - 2 * inset - 2 * r, h - 2 * inset);
      ctx.fillRect(x + inset, y + inset + r, w - 2 * inset, h - 2 * inset - 2 * r);
      for (let k = 0; k < r; k += 3) {
        const d = Math.round(r - Math.sqrt(r * r - (r - k) * (r - k)));
        ctx.fillRect(x + inset + d, y + inset + k, w - 2 * inset - 2 * d, 3);
        ctx.fillRect(x + inset + d, y + h - inset - k - 3, w - 2 * inset - 2 * d, 3);
      }
    };
    steps(-3, COLORS.outline);
    steps(0, '#4a2a14');
    steps(3, '#7a4a26');
    steps(9, '#3a2010');
    steps(12, '#125232');
    // The felt's weave: a sparse pixel dither.
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    for (let yy = y + 16; yy < y + h - 16; yy += 4) for (let xx = x + 16 + ((yy / 4) % 2) * 2; xx < x + w - 16; xx += 4) ctx.fillRect(xx, yy, 1, 1);
    // The printed pin line and the house's line, faded into the felt.
    ctx.fillStyle = 'rgba(255,210,63,0.22)';
    ctx.fillRect(x + 34, y + 34, w - 68, 2);
    ctx.fillRect(x + 34, y + h - 36, w - 68, 2);
    ctx.fillRect(x + 34, y + 34, 2, h - 68);
    ctx.fillRect(x + w - 36, y + 34, 2, h - 68);
    if (printed) drawText(ctx, printed, x + w / 2, y + h - 56, T.small, FELT_INK, { outline: null });
  }

  /** The side panel: the game's controls on the kit panel (`title` on its tab). */
  protected side(ctx: CanvasRenderingContext2D, title: string): void {
    drawPanel(ctx, SIDE.x, SIDE.y, SIDE.w, SIDE.h, { title });
  }

  /** A big number in a well (YOUR BET, THE POT, GOES LEFT): its label over it, a chip beside it. */
  protected numberWell(ctx: CanvasRenderingContext2D, label: string, value: string, o: { color?: string; punch?: number; sub?: string; chip?: boolean } = {}): void {
    if (label) drawText(ctx, label, SX, ROW.label, T.small, KIT.dim);
    drawWell(ctx, SIDE.x + 20, ROW.well - 30, SIDE.w - 40, 60, '#120c1c');
    const w = textWidth(value, T.title) + (o.chip === false ? 0 : 44);
    if (o.chip !== false) drawSprite(ctx, 'chip', SX - w / 2 + 16, ROW.well, 3);
    drawText(ctx, value, SX + w / 2, ROW.well + 1, T.title, o.color ?? COLORS.energy, { align: 'right', punch: o.punch });
    if (o.sub) drawText(ctx, o.sub, SX, ROW.well + 44, T.small, KIT.dim);
  }

  /** How a play went: a ribbon over the table with its line under it (one look for every game's result). */
  protected tableResult(ctx: CanvasRenderingContext2D, r: EncounterResult, y = TABLE.y + TABLE.h - 120): void {
    const color = r.good ? KIT.title : r.good === false ? '#ff8a7a' : KIT.text;
    drawBanner(ctx, r.title, TCX, y, { scale: T.head, color, frame: r.good ? KIT.frame : r.good === false ? '#a8202a' : KIT.frameDim });
    if (r.text) {
      const lines = wrap(r.text, Math.floor((TABLE.w - 120) / (6 * T.body))).slice(0, 2);
      const w = Math.max(...lines.map((l) => textWidth(l, T.body))) + 32;
      drawPanel(ctx, Math.round(TCX - w / 2), y + 30, Math.round(w), 16 + lines.length * 24, { frame: KIT.frameDim });
      lines.forEach((l, i) => drawText(ctx, l, TCX, y + 50 + i * 24, T.body, color));
    }
  }

  /** The rules line under the table (body size), and the full rules over the table while "?" is open. */
  protected drawRules(ctx: CanvasRenderingContext2D, line: string, full: string[]): void {
    drawText(ctx, line, CX, FOOT.rules, T.body, KIT.text);
    if (!this.rulesOpen) return;
    const w = 560;
    const h = 60 + full.length * 30;
    const x = Math.round(TCX - w / 2);
    const y = Math.round(TABLE.y + TABLE.h / 2 - h / 2);
    drawPanel(ctx, x, y, w, h, { title: 'HOUSE RULES' });
    full.forEach((l, i) => drawText(ctx, l, x + 28, y + 40 + i * 30, T.body, KIT.text, { align: 'left' }));
  }
}
