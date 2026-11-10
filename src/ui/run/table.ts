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
/** Words printed on the felt (a muted gold, as if stamped into it; chalk on act 1's crate). Set by `felt` for the
 * table it draws, before the game's labels are drawn on it (a live binding, so cardGames.ts reads the table's ink). */
export let FELT_INK = '#b8a45a';
/** The table you play on, by where you are (the user, 2026-11-10: every screen shows where you are): act 1's
 * TWENTY-ONE on an upturned crate in the alley, its HIGHER OR LOWER on the dive bar's back table (a worn felt mat),
 * act 2's casino felt, act 3's high-limit table (velvet rail, brass edge), ENDLESS's felt after hours. */
export type TableStyle = 'crate' | 'bar' | 'casino' | 'vip' | 'night';
/** The rail's layers from the outside in, the surface, the ink, the pin lines' colour and the corner's radius. */
const TABLES: Record<TableStyle, { layers: [number, string][]; surface: string; ink: string; pin: string; r: number }> = {
  crate: { layers: [[-3, '#140c1c'], [0, '#3a2414'], [3, '#6a4626'], [9, '#4a2e18']], surface: '#5e3e22', ink: '#e0d4b4', pin: 'rgba(240,232,214,0.2)', r: 0 },
  bar: { layers: [[-3, '#140c1c'], [0, '#1e0e08'], [3, '#4a2614'], [9, '#2a160c']], surface: '#2e4a26', ink: '#c8b878', pin: 'rgba(200,184,120,0.18)', r: 12 },
  casino: { layers: [[-3, '#140c1c'], [0, '#4a2a14'], [3, '#7a4a26'], [9, '#3a2010']], surface: '#125232', ink: '#b8a45a', pin: 'rgba(255,210,63,0.22)', r: 18 },
  vip: { layers: [[-3, '#140c1c'], [0, '#d9a640'], [2, '#4a0e1e'], [4, '#7a1a30'], [7, '#5a1224'], [10, '#d9a640'], [11, '#2a0c14']], surface: '#0f4a2e', ink: '#d9c070', pin: 'rgba(255,210,63,0.3)', r: 18 },
  night: { layers: [[-3, '#140c1c'], [0, '#3a2210'], [3, '#5a3a1e'], [9, '#2a180c']], surface: '#0d3e26', ink: '#988a4c', pin: 'rgba(255,210,63,0.14)', r: 18 },
};

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
  /** Which table the bet was set at (a new table starts from a fresh bet). */
  private betTable = '';
  /**
   * The bet on a new hand. A new table starts at 5; a bet that's more than you hold drops to a fresh one, never more
   * than half your chips (the stepper used to carry 12 from an earlier table and clamp it to the 8 you held, so DEAL bet
   * them all without a touch: QA PLAY-U3). A bet you set at this table and can still cover stays.
   */
  protected settleBet(max: number): void {
    const run = this.run!;
    const table = `${run.seed}:${run.act}:${run.depth}`;
    const fresh = Math.max(1, Math.min(5, Math.floor(max / 2)));
    if (table !== this.betTable || this.rlBet > max) this.rlBet = fresh;
    this.betTable = table;
    this.rlBet = Math.max(1, Math.min(this.rlBet, Math.max(1, max)));
  }

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
    this.rulesHit = b;
    return b;
  }

  /** The "?" itself (a tap on it toggles the rules; any other tap while they're up closes them). */
  private rulesHit: Btn | null = null;

  /** B / Escape closes HOUSE RULES first (it opened PAUSE under them: QA 2026-11-06). */
  closeRules(): boolean {
    // The next fight's card turned to its rules (the "?"): B / Escape turns it back first; it opened PAUSE over the
    // card, which was still up after RESUME (QA DEMO-13).
    if (this.mode === 'next' && this.pinned > 0 && this.flipBtn) {
      this.flipBtn.onClick();
      this.sounds.click();
      return true;
    }
    if (this.mode !== 'encounter' || !this.rulesOpen) return false;
    this.rulesOpen = false;
    this.sounds.click();
    return true;
  }

  /** HOUSE RULES is a panel over the table: a tap anywhere but its "?" closes it, and plays nothing under it (DEAL and
   * HIT still played through it, under the panel). */
  pointerDown(x: number, y: number): boolean {
    if (this.mode === 'encounter' && this.rulesOpen && !(this.rulesHit && this.inside(this.rulesHit, x, y))) {
      this.rulesOpen = false;
      this.sounds.click();
      return true;
    }
    return super.pointerDown(x, y);
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

  /** The table this encounter is dealt on (by where you are: see TABLES). */
  protected tableStyle(): TableStyle {
    const run = this.run;
    if (!run) return 'casino';
    if (run.endless) return 'night';
    if (run.act === 1) return this.encId === 'bj' ? 'crate' : 'bar';
    return run.act >= 3 ? 'vip' : 'casino';
  }

  /** The card table: a rail round its surface (stepped corners, no anti-aliased curves), the surface's grain, a printed
   * pin line and the house's line on it. Act 1 is a crate's planks or a bar table's worn mat; the casino, its felt. */
  protected felt(ctx: CanvasRenderingContext2D, printed = ''): void {
    const { x, y, w, h } = TABLE;
    const style = this.tableStyle();
    const st = TABLES[style];
    FELT_INK = st.ink;
    const r = st.r;
    const steps = (inset: number, color: string) => {
      ctx.fillStyle = color;
      if (r === 0) return ctx.fillRect(x + inset, y + inset, w - 2 * inset, h - 2 * inset);
      ctx.fillRect(x + inset + r, y + inset, w - 2 * inset - 2 * r, h - 2 * inset);
      ctx.fillRect(x + inset, y + inset + r, w - 2 * inset, h - 2 * inset - 2 * r);
      for (let k = 0; k < r; k += 3) {
        const d = Math.round(r - Math.sqrt(r * r - (r - k) * (r - k)));
        ctx.fillRect(x + inset + d, y + inset + k, w - 2 * inset - 2 * d, 3);
        ctx.fillRect(x + inset + d, y + h - inset - k - 3, w - 2 * inset - 2 * d, 3);
      }
    };
    for (const [inset, color] of st.layers) steps(inset, color);
    steps(12, st.surface);
    const ix = x + 12;
    const iy = y + 12;
    const iw = w - 24;
    const ih = h - 24;
    if (style === 'crate') {
      // The crate's frame: its corner posts and nails; the top's slats (2px seams), the grain, a knot a slat.
      ctx.fillStyle = '#2a180c';
      for (const [cx, cy] of [[x, y], [x + w - 12, y], [x, y + h - 12], [x + w - 12, y + h - 12]]) ctx.fillRect(cx, cy, 12, 12);
      ctx.fillStyle = '#c8b898';
      for (const [cx, cy] of [[x + 4, y + 4], [x + w - 8, y + 4], [x + 4, y + h - 8], [x + w - 8, y + h - 8]]) ctx.fillRect(cx, cy, 4, 4);
      for (let sy = iy, k = 0; sy < iy + ih; sy += 48, k++) {
        ctx.fillStyle = k % 2 ? '#5a3a20' : '#644426';
        ctx.fillRect(ix, sy, iw, Math.min(46, iy + ih - sy));
        ctx.fillStyle = '#2a180c';
        if (sy + 46 < iy + ih) ctx.fillRect(ix, sy + 46, iw, 2);
        ctx.fillStyle = '#7a5432';
        ctx.fillRect(ix, sy, iw, 2);
        ctx.fillStyle = '#4a2e18';
        for (let gx = ix + ((k * 53) % 40); gx < ix + iw - 40; gx += 70) ctx.fillRect(gx, sy + 14 + ((gx * 7) % 18), 28, 2);
        ctx.fillRect(ix + ((k * 211) % (iw - 40)) + 10, sy + 20, 6, 6);
      }
      // The bulb's light on the crate's top: stepped rings, warm, under the cards.
      this.stepPool(ctx, x + w / 2, y + 40, 300, 150, '#ffd8a0', 0.12);
    } else {
      // Felt's weave (the bar's mat worn thin in the middle, with glass rings; the casino's even).
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      for (let yy = y + 16; yy < y + h - 16; yy += 4) for (let xx = x + 16 + ((yy / 4) % 2) * 2; xx < x + w - 16; xx += 4) ctx.fillRect(xx, yy, 1, 1);
      if (style === 'bar') {
        this.stepPool(ctx, x + w / 2, y + h / 2, 220, 140, '#7a8a50', 0.16);
        ctx.fillStyle = 'rgba(20,12,8,0.35)';
        for (const [rx, ry] of [[x + 70, y + 70], [x + w - 92, y + h - 110]]) {
          for (let a = 0; a < 24; a++) {
            const t = (a / 24) * Math.PI * 2;
            ctx.fillRect(Math.round(rx + Math.cos(t) * 18), Math.round(ry + Math.sin(t) * 18), 2, 2);
          }
        }
        this.stepPool(ctx, x + w / 2, y + 40, 280, 120, '#ffe0a0', 0.1);
      }
    }
    // The printed pin line and the house's line (a gold border on the casino's felt, chalk on the crate).
    ctx.fillStyle = st.pin;
    ctx.fillRect(x + 34, y + 34, w - 68, 2);
    ctx.fillRect(x + 34, y + h - 36, w - 68, 2);
    ctx.fillRect(x + 34, y + 34, 2, h - 68);
    ctx.fillRect(x + w - 36, y + 34, 2, h - 68);
    if (style === 'vip') {
      // The high-limit table's second pinstripe.
      ctx.fillRect(x + 40, y + 40, w - 80, 2);
      ctx.fillRect(x + 40, y + h - 42, w - 80, 2);
      ctx.fillRect(x + 40, y + 40, 2, h - 80);
      ctx.fillRect(x + w - 42, y + 40, 2, h - 80);
    }
    if (printed) drawText(ctx, printed, x + w / 2, y + h - 56, T.small, FELT_INK, { outline: null });
  }

  /** A pool of light in crisp steps (2px rows, three rings): never a gradient. Kept to the table's surface. */
  protected stepPool(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, a: number): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    for (const k of [1, 0.7, 0.45]) {
      const ex = rx * k;
      const ey = ry * k;
      for (let yy = -ey; yy <= ey; yy += 2) {
        const hw = Math.floor((ex * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ey * ey)))) / 2) * 2;
        const ty = Math.round((cy + yy) / 2) * 2;
        if (ty < TABLE.y + 12 || ty >= TABLE.y + TABLE.h - 12) continue;
        const x0 = Math.max(TABLE.x + 12, Math.round(cx - hw));
        const x1 = Math.min(TABLE.x + TABLE.w - 12, Math.round(cx + hw));
        if (x1 > x0) ctx.fillRect(x0, ty, x1 - x0, 2);
      }
    }
    ctx.restore();
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
    // (Each rule wraps to the panel: about 42 letters a row. A long one ran off the right edge.)
    const rows = full.flatMap((l) => wrap(l, 42));
    const h = 60 + rows.length * 30;
    const x = Math.round(TCX - w / 2);
    const y = Math.round(TABLE.y + TABLE.h / 2 - h / 2);
    drawPanel(ctx, x, y, w, h, { title: 'HOUSE RULES' });
    rows.forEach((l, i) => drawText(ctx, l, x + 28, y + 40 + i * 30, T.body, KIT.text, { align: 'left' }));
  }
}
